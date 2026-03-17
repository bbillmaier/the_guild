/**
 * Context budget management — tracks active memories with keyword recency
 * and assembles them into a context string that fits within the LLM's token limit.
 */

import { getSetting, API_BASE_URL_KEY } from '@/lib/settings';
import { defaultKoboldApiBase } from '@/components/LLM/kobold';
import type { QuestHistory, ChatHistory, CharacterOpinion } from '@/lib/local-db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActiveMemoryEntry = {
  uid: string;
  type: 'quest' | 'chat' | 'opinion';
  record: QuestHistory | ChatHistory | CharacterOpinion;
  keywords: string[];
  /** Turn index when a keyword from this memory was last mentioned by anyone. */
  lastMentionedAt: number;
};

// ─── Max context fetch ────────────────────────────────────────────────────────

const FALLBACK_MAX_CONTEXT = 4096;

export async function fetchKoboldMaxContext(): Promise<number> {
  const savedBase = await getSetting(API_BASE_URL_KEY);
  const base = (savedBase?.trim()) || defaultKoboldApiBase;

  for (const path of [
    '/api/v1/config/max_context_length',
    '/api/extra/true_max_context_length',
  ]) {
    try {
      const res = await fetch(`${base}${path}`);
      if (res.ok) {
        const data = await res.json() as { value?: number };
        if (typeof data.value === 'number' && data.value > 0) return data.value;
      }
    } catch { /* try next */ }
  }

  return FALLBACK_MAX_CONTEXT;
}

// ─── Token estimation ─────────────────────────────────────────────────────────

/** Rough estimate: ~4 characters per token. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ─── Memory helpers ───────────────────────────────────────────────────────────

/** Build an ActiveMemoryEntry from a QuestHistory record. */
export function questToMemory(q: QuestHistory, turn: number): ActiveMemoryEntry {
  return {
    uid: q.uid,
    type: 'quest',
    record: q,
    keywords: q.keywords,
    lastMentionedAt: turn,
  };
}

/** Build an ActiveMemoryEntry from a ChatHistory record. */
export function chatToMemory(c: ChatHistory, turn: number): ActiveMemoryEntry {
  return {
    uid: c.uid,
    type: 'chat',
    record: c,
    keywords: c.keywords,
    lastMentionedAt: turn,
  };
}

/** Build an ActiveMemoryEntry from a CharacterOpinion record. */
export function opinionToMemory(o: CharacterOpinion, turn: number): ActiveMemoryEntry {
  return {
    uid: o.uid,
    type: 'opinion',
    record: o,
    keywords: o.keywords,
    lastMentionedAt: turn,
  };
}

/**
 * Score how relevant a memory's keywords are to a given message.
 * Returns the count of keywords that appear in the message (min length 3).
 */
export function scoreMemoryRelevance(message: string, keywords: string[]): number {
  const lower = message.toLowerCase();
  return keywords.filter((kw) => kw.length >= 3 && lower.includes(kw.toLowerCase())).length;
}

/**
 * Search a pool of inactive memories for any that are relevant to `message`
 * (score >= minScore). Returns them stamped with the current `turn`.
 */
export function findRelevantMemories(
  message: string,
  pool: ActiveMemoryEntry[],
  turn: number,
  minScore = 1,
): ActiveMemoryEntry[] {
  return pool
    .filter((m) => scoreMemoryRelevance(message, m.keywords) >= minScore)
    .map((m) => ({ ...m, lastMentionedAt: turn }));
}

/**
 * Scan `message` for any keyword belonging to an active memory and update
 * its `lastMentionedAt` to `turn`. Returns a new array (immutable update).
 */
export function updateMemoryRecency(
  memories: ActiveMemoryEntry[],
  message: string,
  turn: number,
): ActiveMemoryEntry[] {
  const lower = message.toLowerCase();
  return memories.map((m) => {
    const hit = m.keywords.some((kw) => kw.length >= 3 && lower.includes(kw.toLowerCase()));
    return hit ? { ...m, lastMentionedAt: turn } : m;
  });
}

/**
 * Merge new memory entries into an existing list, deduplicating by uid.
 * New entries are added; existing entries keep their current recency.
 */
export function mergeMemories(
  existing: ActiveMemoryEntry[],
  incoming: ActiveMemoryEntry[],
): ActiveMemoryEntry[] {
  const existingUids = new Set(existing.map((m) => m.uid));
  return [...existing, ...incoming.filter((m) => !existingUids.has(m.uid))];
}

/**
 * Enforce a cap on how many quest memories can be active at once.
 * Keeps the `max` most recently mentioned quests, drops the rest.
 * Chat memories are unaffected.
 */
export function capQuestMemories(memories: ActiveMemoryEntry[], max = 1): ActiveMemoryEntry[] {
  const chats  = memories.filter((m) => m.type === 'chat');
  const quests = memories
    .filter((m) => m.type === 'quest')
    .sort((a, b) => b.lastMentionedAt - a.lastMentionedAt)
    .slice(0, max);
  return [...chats, ...quests];
}

export type ActiveMemoryContextResult = {
  context: string;
  includedUids: Set<string>;
};

/**
 * Sort active memories by recency (most recently mentioned first) and build
 * a context string that fits within `tokenBudget`. Memories that don't fit
 * are omitted for this turn but remain in the active list.
 * Returns both the context string and the set of UIDs that were included.
 */
export function buildActiveMemoryContext(
  memories: ActiveMemoryEntry[],
  tokenBudget: number,
): ActiveMemoryContextResult {
  if (memories.length === 0 || tokenBudget <= 0) return { context: '', includedUids: new Set() };

  const sorted = [...memories].sort((a, b) => b.lastMentionedAt - a.lastMentionedAt);

  const lines: string[] = [];
  const includedUids = new Set<string>();
  let used = 0;

  for (const m of sorted) {
    let line: string;
    if (m.type === 'quest') {
      const q = m.record as QuestHistory;
      line = `[Quest] ${q.questTitle} (${q.outcome}): ${q.summary}`;
    } else if (m.type === 'opinion') {
      const o = m.record as CharacterOpinion;
      line = `[Opinion of ${o.targetName}] ${o.opinion}`;
    } else {
      const c = m.record as ChatHistory;
      line = `[Conversation] ${c.summary}`;
    }
    const tokens = estimateTokens(line);
    if (used + tokens > tokenBudget) break;
    lines.push(line);
    includedUids.add(m.uid);
    used += tokens;
  }

  if (lines.length === 0) return { context: '', includedUids: new Set() };
  return {
    context: `Additional memories recalled during this conversation:\n${lines.map((l) => `- ${l}`).join('\n')}`,
    includedUids,
  };
}
