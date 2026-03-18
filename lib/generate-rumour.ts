import { callKoboldApi } from '@/components/LLM/kobold';
import {
  insertRumour,
  type GuildCharacter,
  type QuestHistory,
  type Rumour,
} from '@/lib/local-db';

function generateUid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function extractRumourKeywords(text: string): string[] {
  const caps = text.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
  return [...new Set(caps.map((w) => w.toLowerCase()))].slice(0, 10);
}

/**
 * Generate a single rumour from current game state and store it in the DB.
 * Assigns the rumour to 1–3 random guild members who "heard" it.
 * Returns null if generation fails or there are no characters.
 */
export async function generateRumour(
  chars: GuildCharacter[],
  recentQuests: QuestHistory[],
  gameDay: number,
  onStatus?: (s: string) => void,
): Promise<Rumour | null> {
  if (chars.length === 0) return null;

  onStatus?.('Whispers are spreading through the tavern...');

  const charDescs = chars.slice(0, 6)
    .map((c) => `${c.characterName} (${c.race} ${c.className})`)
    .join(', ');

  const questCtx = recentQuests.slice(0, 3)
    .map((q) => `- "${q.questTitle}" in ${q.biome} (${q.outcome})`)
    .join('\n');

  const prompt = [
    `You are writing overheard gossip for a fantasy tavern. Based on the following guild members and recent events, write a single rumour in 1-2 sentences.`,
    `Guild members: ${charDescs}`,
    questCtx ? `Recent events:\n${questCtx}` : '',
    `The rumour should hint at something — a threat, a secret, an opportunity — without fully explaining it. It should sound like overheard gossip, not a quest briefing. It may reference the characters or locations above, or introduce something new entirely.`,
    `Output only the rumour text, nothing else.`,
  ].filter(Boolean).join('\n\n');

  let text: string;
  try {
    const raw = await callKoboldApi(prompt, 120, 'A rumour stirs in the tavern...');
    text = raw.replace(/^[^a-zA-Z"'"]+/, '').trim();
    if (!text) return null;
  } catch {
    return null;
  }

  // Assign to 1–3 random characters
  const shuffled = [...chars].sort(() => Math.random() - 0.5);
  const count = Math.min(chars.length, 1 + Math.floor(Math.random() * 3));
  const knownBy = shuffled.slice(0, count).map((c) => c.uid);

  const rumour: Rumour = {
    uid: generateUid(),
    text,
    keywords: extractRumourKeywords(text),
    gameDay,
    knownBy,
    used: false,
    createdAt: new Date().toISOString(),
  };

  await insertRumour(rumour);
  return rumour;
}
