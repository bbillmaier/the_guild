import { callKoboldApi } from '@/components/LLM/kobold';
import {
  adjustRelationship,
  listQuestHistoryForCharacter,
  type GuildCharacter,
  type GuildEventSeed,
  type QuestHistory,
  type RoomKey,
} from '@/lib/local-db';

export type GuildEventResult = {
  narrative: string;
  chars: GuildCharacter[];
};

/** Pick all characters from a random room that has 2 or more occupants. */
export function pickEventChars(
  chars: GuildCharacter[],
  assignments: Record<string, RoomKey>,
): GuildCharacter[] | null {
  const byRoom = new Map<string, GuildCharacter[]>();
  for (const c of chars) {
    const room = assignments[c.uid] ?? 'tavern';
    if (!byRoom.has(room)) byRoom.set(room, []);
    byRoom.get(room)!.push(c);
  }
  const eligible = Array.from(byRoom.values()).filter((g) => g.length >= 2);
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

/** Find the most recent quest that every character in the group shared. */
async function findSharedQuest(chars: GuildCharacter[]): Promise<QuestHistory | null> {
  if (chars.length < 2) return null;
  const histories = await Promise.all(chars.map((c) => listQuestHistoryForCharacter(c.uid, 20)));
  const firstUids = new Set(histories[0].map((h) => h.questUid));
  let commonUids = [...firstUids];
  for (let i = 1; i < histories.length; i++) {
    const thisUids = new Set(histories[i].map((h) => h.questUid));
    commonUids = commonUids.filter((uid) => thisUids.has(uid));
  }
  if (commonUids.length === 0) return null;
  const all = histories.flat().filter((h) => commonUids.includes(h.questUid));
  all.sort((a, b) => b.gameDay - a.gameDay);
  return all[0] ?? null;
}

export async function generateGuildEvent(
  chars: GuildCharacter[],
  seed: GuildEventSeed,
  onStatus?: (s: string) => void,
): Promise<GuildEventResult> {
  onStatus?.('Something is stirring at the guild...');

  // Resolve shared quest context if the seed calls for it
  let sharedQuest: QuestHistory | null = null;
  if (seed.useCommonQuest) {
    sharedQuest = await findSharedQuest(chars);
  }

  const charDescs = chars.map((c) => {
    const parts = [`${c.characterName} (Lv ${c.level} ${c.race} ${c.className})`];
    if (c.metaDesc.length > 0) parts.push(c.metaDesc.slice(0, 2).join(', '));
    if (c.baseDescription) parts.push(c.baseDescription);
    return `- ${parts.join(' — ')}`;
  }).join('\n');

  const questCtx = sharedQuest
    ? `\nShared quest context: They recently completed "${sharedQuest.questTitle}" (${sharedQuest.outcome}) in ${sharedQuest.biome}. ${sharedQuest.summary}`
    : '';

  const prompt = [
    `Write a short third-person narrative (2–4 paragraphs) about a moment between guild members at their base.`,
    `Characters:\n${charDescs}`,
    `Situation: ${seed.text}`,
    questCtx,
    `Past tense. Third person. Weave in brief natural dialogue. Grounded and character-driven — no grand heroics, just a believable moment between people who work together.`,
    `Output only the narrative, nothing else.`,
  ].filter(Boolean).join('\n\n');

  onStatus?.('Unfolding the event...');
  let narrative: string;
  try {
    narrative = (await callKoboldApi(prompt, 600, 'Guild event unfolding...')).trim();
  } catch {
    const names = chars.map((c) => c.characterName).join(' and ');
    narrative = `Something notable occurred between ${names} at the guild today.`;
  }

  // Apply relationship delta for every pair
  if (seed.relationshipDelta !== 0) {
    for (let i = 0; i < chars.length; i++) {
      for (let j = i + 1; j < chars.length; j++) {
        await adjustRelationship(chars[i].uid, chars[j].uid, seed.relationshipDelta);
      }
    }
  }

  return { narrative, chars };
}
