/**
 * Character history utilities — quest summaries and chat summaries for the
 * lore-book / RAG context system.
 */

import { callKoboldApi } from '@/components/LLM/kobold';
import {
  getGameDay,
  getKeywordMethod,
  insertChatHistory,
  insertQuestHistory,
  listChatHistoryForCharacter,
  listQuestHistoryForCharacter,
  listRumoursKnownBy,
  type ChatHistory,
  type GuildCharacter,
  type GuildQuest,
  type QuestHistory,
  type QuestRoom,
} from '@/lib/local-db';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip leading non-letter characters (punctuation, brackets, newlines) that LLMs sometimes emit before the actual response. */
function cleanSummary(text: string): string {
  return text.replace(/^[^a-zA-Z]+/, '').trim();
}

function generateUid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function extractBossName(rooms: QuestRoom[]): string | undefined {
  const bossRoom = rooms.find((r) => r.roomType === 'boss');
  if (!bossRoom) return undefined;
  try {
    const content = JSON.parse(bossRoom.content) as { boss?: { characterName?: string } };
    return content.boss?.characterName;
  } catch { return undefined; }
}

// ─── Method B: deterministic keyword extraction ───────────────────────────────

export function extractKeywordsAuto(data: {
  questTitle: string;
  biome: string;
  difficulty: string;
  outcome: string;
  partyNames: string[];
  bossName?: string;
}): string[] {
  const words: string[] = [];

  // Title words (3+ chars)
  words.push(...data.questTitle.split(/\s+/).filter((w) => w.length >= 3));
  // Biome words
  words.push(...data.biome.split(/\s+/).filter((w) => w.length >= 3));
  // Party first names
  for (const name of data.partyNames) words.push(name.split(' ')[0]);
  // Boss name words
  if (data.bossName) words.push(...data.bossName.split(/\s+/).filter((w) => w.length >= 3));
  // Difficulty + outcome
  words.push(data.difficulty, data.outcome);

  return [...new Set(words.map((w) => w.toLowerCase()))].filter(Boolean);
}

// ─── Quest history ────────────────────────────────────────────────────────────

export async function saveQuestHistoryForParty(
  quest: GuildQuest,
  party: GuildCharacter[],
  rooms: QuestRoom[],
  narrative: string,
  outcome: 'success' | 'failure',
  combatLog = '',
): Promise<void> {
  const gameDay = await getGameDay();
  const bossName = extractBossName(rooms);
  const partyNames = party.map((c) => c.characterName);
  const partyUids = party.map((c) => c.uid);

  const autoData = {
    questTitle: quest.title,
    biome: quest.biome,
    difficulty: quest.difficulty,
    outcome,
    partyNames,
    bossName,
  };

  // Save the full story narrative as the memory for each character.
  const summary = narrative;
  const keywords = extractKeywordsAuto(autoData);

  for (const character of party) {
    const row: QuestHistory = {
      uid: generateUid(),
      characterUid: character.uid,
      questUid: quest.uid,
      questTitle: quest.title,
      biome: quest.biome,
      difficulty: quest.difficulty,
      level: quest.level,
      outcome,
      partyUids,
      partyNames,
      summary,
      transcript: combatLog,
      keywords,
      gameDay,
      createdAt: new Date().toISOString(),
    };
    await insertQuestHistory(row);
  }
}

// ─── Chat history ─────────────────────────────────────────────────────────────

export type ChatMessageForHistory = { role: 'player' | 'character'; text: string };

export async function saveChatHistoryEntry(
  character: GuildCharacter,
  messages: ChatMessageForHistory[],
  force = false,
): Promise<void> {
  if (!force && messages.filter((m) => m.role === 'player').length < 2) return; // too short to save

  const method = await getKeywordMethod();
  const gameDay = await getGameDay();

  const transcript = messages
    .map((m) => `${m.role === 'player' ? 'Guild Master' : character.characterName}: ${m.text}`)
    .join('\n');

  let summary: string;
  let keywords: string[];

  if (method === 'llm' && !force) {
    try {
      const summaryRaw = await callKoboldApi(
        `Summarise the following conversation between ${character.characterName} and the Guild Master in third person. Cover the main topics, the tone, and anything notable said or decided. Be concise. Output only the summary, nothing else.\n\n${transcript}`,
        650,
        `${character.characterName}: saving chat memory...`
      );
      summary = cleanSummary(summaryRaw) || `${character.characterName} spoke with the Guild Master.`;
    } catch {
      summary = `${character.characterName} spoke with the Guild Master.`;
    }
    keywords = extractChatKeywordsAuto(messages);
  } else {
    // Auto method, or force=true (quest assigned) — skip LLM to avoid blocking the quest queue
    summary = `${character.characterName} spoke with the Guild Master.`;
    keywords = extractChatKeywordsAuto(messages);
  }

  const row: ChatHistory = {
    uid: generateUid(),
    characterUid: character.uid,
    summary,
    transcript,
    keywords,
    gameDay,
    createdAt: new Date().toISOString(),
  };

  await insertChatHistory(row);
}

const STOPWORDS = new Set([
  'the','and','but','for','not','you','are','was','were','has','had','have',
  'that','this','with','from','they','she','him','her','his','our','your',
  'their','what','when','where','who','why','how','did','does','will','can',
  'its','it\'s','isn','wasn','didn','don','won','wouldn','couldn','shouldn',
  'also','just','then','than','too','very','more','most','some','any','all',
  'been','being','here','there','now','then','yes','hey','wow','oh','said',
  'well','even','like','know','think','rather','still','because','about',
  'into','onto','over','under','after','before','again','though','through',
]);

/** Method B for chat: extract capitalised words (likely proper nouns) from messages. */
function extractChatKeywordsAuto(messages: ChatMessageForHistory[]): string[] {
  const words: string[] = [];
  for (const m of messages) {
    const caps = m.text.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
    words.push(...caps);
  }
  return [...new Set(words.map((w) => w.toLowerCase()))]
    .filter((w) => !STOPWORDS.has(w))
    .slice(0, 10);
}

// ─── Party chat history ───────────────────────────────────────────────────────

export type PartyChatMessageForHistory = {
  role: 'player' | 'character';
  speakerName?: string;
  text: string;
};

export async function savePartyChatHistoryEntry(
  characters: GuildCharacter[],
  messages: PartyChatMessageForHistory[],
): Promise<void> {
  const meaningful = messages.filter((m) => m.text.trim());
  // Require at least a few lines of actual conversation
  if (meaningful.length < 3) return;

  const method = await getKeywordMethod();
  const gameDay = await getGameDay();

  const names = characters.map((c) => c.characterName).join(', ');
  const transcript = meaningful
    .map((m) => `${m.role === 'player' ? 'Guild Master' : (m.speakerName ?? 'Unknown')}: ${m.text}`)
    .join('\n');

  let summary: string;

  if (method === 'llm') {
    try {
      const raw = await callKoboldApi(
        `Summarise the following group conversation between ${names} and the Guild Master at the guild tavern in third person. Cover the main topics, the tone, any decisions made, and anything notable said. Output only the summary, nothing else.\n\n${transcript}`,
        900,
        'Saving group chat memory...',
      );
      summary = cleanSummary(raw) || `${names} spoke together with the Guild Master.`;
    } catch {
      summary = `${names} spoke together with the Guild Master.`;
    }
  } else {
    summary = `${names} spoke together with the Guild Master.`;
  }

  const keywords = extractChatKeywordsAuto(
    meaningful.map((m) => ({ role: m.role === 'player' ? 'player' as const : 'character' as const, text: m.text })),
  );

  for (const character of characters) {
    const row: ChatHistory = {
      uid: generateUid(),
      characterUid: character.uid,
      summary,
      transcript,
      keywords,
      gameDay,
      createdAt: new Date().toISOString(),
    };
    await insertChatHistory(row);
  }
}

// ─── Guild event history ──────────────────────────────────────────────────────

export async function saveGuildEventHistory(
  chars: GuildCharacter[],
  narrative: string,
): Promise<void> {
  const gameDay = await getGameDay();
  const keywords = [...new Set(chars.map((c) => c.characterName.split(' ')[0].toLowerCase()))];

  for (const character of chars) {
    const row: ChatHistory = {
      uid: generateUid(),
      characterUid: character.uid,
      summary: narrative,
      transcript: narrative,
      keywords,
      gameDay,
      createdAt: new Date().toISOString(),
    };
    await insertChatHistory(row);
  }
}

// ─── Context builder ──────────────────────────────────────────────────────────

/** Human-readable relative date label, e.g. "earlier today", "yesterday", "3 days ago". */
function relativeDay(entryDay: number, currentDay: number): string {
  const diff = currentDay - entryDay;
  if (diff === 0) return 'earlier today';
  if (diff === 1) return 'yesterday';
  return `${diff} days ago`;
}

/**
 * Build a history context string to inject into the chat system prompt.
 * Pass `currentDay` to include relative date labels on every entry.
 */
/**
 * Builds the base context string injected at startup — chat summaries only.
 * Quest memories are intentionally excluded here; they are fetched on demand
 * via keyword matching in buildTemporalContext / findRelevantMemories.
 */
export async function buildHistoryContext(characterUid: string, currentDay?: number): Promise<string> {
  const [chatHistory, rumours] = await Promise.all([
    listChatHistoryForCharacter(characterUid, 3),
    listRumoursKnownBy(characterUid),
  ]);

  const sections: string[] = [];

  if (chatHistory.length > 0) {
    const lines: string[] = ['Past conversations with the Guild Master (these are memories, not the current conversation):'];
    for (const ch of chatHistory) {
      if (!ch.summary) continue;
      const timeLabel = currentDay !== undefined ? relativeDay(ch.gameDay, currentDay) : `Day ${ch.gameDay}`;
      lines.push(`- [${timeLabel}] ${ch.summary}`);
    }
    sections.push(lines.join('\n'));
  }

  const activeRumours = rumours.filter((r) => !r.used).slice(0, 3);
  if (activeRumours.length > 0) {
    const lines: string[] = [
      'Rumours this character has heard. IMPORTANT: this is the complete extent of their knowledge — do not add names, details, or information beyond exactly what is written here:',
    ];
    for (const r of activeRumours) {
      const timeLabel = currentDay !== undefined ? relativeDay(r.gameDay, currentDay) : `Day ${r.gameDay}`;
      lines.push(`- [${timeLabel}] "${r.text}"`);
    }
    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n');
}

// ─── Temporal context expansion ───────────────────────────────────────────────

type TemporalFocus = {
  exactDays: number[];   // specific days to look up  (e.g. yesterday = currentDay-1)
  recentWindow: number;  // look back N days  (e.g. "last week" = 7)
  lastQuest: boolean;    // wants the single most recent quest
};

function detectTemporal(message: string, currentDay: number): TemporalFocus | null {
  const lower = message.toLowerCase();
  const exactDays: number[] = [];
  let recentWindow = 0;
  let lastQuest = false;

  if (/\btoday\b/.test(lower))     exactDays.push(currentDay);
  if (/\byesterday\b/.test(lower)) exactDays.push(currentDay - 1);

  // "3 days ago", "two days ago" etc.
  const numMatch = lower.match(/(\d+)\s+days?\s+ago/);
  if (numMatch) exactDays.push(currentDay - parseInt(numMatch[1], 10));

  if (/\blast\s+week\b/.test(lower))              recentWindow = Math.max(recentWindow, 7);
  if (/\bpast\s+(few|couple)\s+days?\b/.test(lower)) recentWindow = Math.max(recentWindow, 3);
  if (/\b(recently|lately)\b/.test(lower))        recentWindow = Math.max(recentWindow, 3);

  if (/\blast\s+(quest|mission|job|contract|adventure)\b/.test(lower)) lastQuest = true;

  if (exactDays.length === 0 && recentWindow === 0 && !lastQuest) return null;
  return { exactDays, recentWindow, lastQuest };
}

/**
 * Called per-message when the player's input contains temporal keywords.
 * Fetches a wider history window and returns a focused context block,
 * or an empty string if no temporal keywords were detected.
 */
export type TemporalContextResult = {
  context: string;
  quests: QuestHistory[];
  chats: ChatHistory[];
};

export async function buildTemporalContext(
  characterUid: string,
  currentDay: number,
  playerMessage: string,
): Promise<TemporalContextResult> {
  const focus = detectTemporal(playerMessage, currentDay);
  if (!focus) return { context: '', quests: [], chats: [] };

  const [quests, chats] = await Promise.all([
    listQuestHistoryForCharacter(characterUid, 30),
    listChatHistoryForCharacter(characterUid, 15),
  ]);

  const lines: string[] = [];
  const matchedQuests = new Set<QuestHistory>();
  const matchedChats  = new Set<ChatHistory>();

  if (focus.lastQuest && quests.length > 0) {
    const q = quests[0];
    lines.push(`[${relativeDay(q.gameDay, currentDay)}] Quest — ${q.questTitle} (${q.outcome}): ${q.summary}`);
    matchedQuests.add(q);
  }

  for (const day of focus.exactDays) {
    const label = relativeDay(day, currentDay);
    for (const q of quests.filter((x) => x.gameDay === day)) {
      lines.push(`[${label}] Quest — ${q.questTitle} (${q.outcome}): ${q.summary}`);
      matchedQuests.add(q);
    }
    for (const c of chats.filter((x) => x.gameDay === day && x.summary)) {
      lines.push(`[${label}] Conversation: ${c.summary}`);
      matchedChats.add(c);
    }
  }

  if (focus.recentWindow > 0) {
    const minDay = currentDay - focus.recentWindow;
    for (const q of quests.filter((x) => x.gameDay >= minDay)) {
      lines.push(`[${relativeDay(q.gameDay, currentDay)}] Quest — ${q.questTitle} (${q.outcome}): ${q.summary}`);
      matchedQuests.add(q);
    }
    for (const c of chats.filter((x) => x.gameDay >= minDay && x.summary)) {
      lines.push(`[${relativeDay(c.gameDay, currentDay)}] Conversation: ${c.summary}`);
      matchedChats.add(c);
    }
  }

  if (lines.length === 0) return { context: '', quests: [], chats: [] };
  // Deduplicate (exact days and recentWindow can overlap)
  const unique = [...new Set(lines)];
  return {
    context: `Memories relevant to this moment:\n${unique.map((l) => `- ${l}`).join('\n')}`,
    quests: [...matchedQuests],
    chats: [...matchedChats],
  };
}
