/**
 * Opinion generation — produces one character's opinion of every other character
 * based on shared quest history, chat transcripts, and relationship score.
 */

import { callKoboldApi } from '@/components/LLM/kobold';
import {
  getGameDay,
  getRelationship,
  getRelationshipLabel,
  getOpinion,
  insertCharacterOpinion,
  listChatHistoryForCharacter,
  listOpinionsForCharacter,
  type CharacterOpinion,
  type GuildCharacter,
} from '@/lib/local-db';

export const GUILD_MASTER_UID = 'guild_master';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateUid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function cleanOpinion(text: string): string {
  return text.replace(/^[^a-zA-Z]+/, '').trim();
}

/** Extract keywords from an opinion: first+last name of target plus notable proper nouns. */
function extractOpinionKeywords(targetName: string): string[] {
  const parts = targetName.trim().split(/\s+/);
  return [...new Set(parts.map((p) => p.toLowerCase()).filter((p) => p.length >= 3))];
}

// ─── Core generation ──────────────────────────────────────────────────────────

/**
 * Generate `character`'s opinion of `target` and store it in the DB.
 * Returns the new opinion text.
 */
export async function generateOpinionOfTarget(
  character: GuildCharacter,
  target: GuildCharacter,
): Promise<string> {
  const gameDay = await getGameDay();

  // Relationship score
  const relScore = await getRelationship(character.uid, target.uid);
  const { label: relLabel } = getRelationshipLabel(relScore);
  const relDesc =
    relScore >= 60  ? 'close friends' :
    relScore >= 30  ? 'on friendly terms' :
    relScore >= 10  ? 'on cordial terms' :
    relScore >= -9  ? 'neutral towards each other' :
    relScore >= -29 ? 'somewhat cold towards each other' :
    relScore >= -59 ? 'at odds with each other' :
                      'bitter enemies';

  const prompt =
    `${character.characterName} is a ${character.race} ${character.className}. ${character.baseDescription}\n` +
    `${target.characterName} is a ${target.race} ${target.className}. ${target.baseDescription}\n` +
    `They are currently ${relDesc}.\n\n` +
    `In one or two sentences, describe how ${character.characterName} personally feels about ${target.characterName} and why, written in third person. ` +
    `Be direct and specific to their personalities. Output only those sentences, nothing else.`;

  const prefix = `${character.characterName}'s relationship with ${target.characterName} is best described as ${relLabel.toLowerCase()}.`;

  let opinion: string;
  try {
    const raw = await callKoboldApi(
      prompt,
      160,
      `${character.characterName}: forming opinion of ${target.characterName}...`,
    );
    const body = cleanOpinion(raw) || `${character.characterName} has not yet formed a strong opinion of ${target.characterName}.`;
    opinion = `${prefix} ${body}`;
  } catch {
    opinion = `${prefix} ${character.characterName} has not yet formed a strong opinion of ${target.characterName}.`;
  }

  const existing = await getOpinion(character.uid, target.uid);
  const row: CharacterOpinion = {
    uid: existing?.uid ?? generateUid(),
    characterUid: character.uid,
    targetUid: target.uid,
    targetName: target.characterName,
    opinion,
    keywords: extractOpinionKeywords(target.characterName),
    gameDay,
    createdAt: new Date().toISOString(),
  };

  await insertCharacterOpinion(row);
  return opinion;
}

/**
 * Generate `character`'s opinion of the Guild Master (the player) and store it.
 * Uses recent chat history for context since the GM has no character record.
 */
export async function generateOpinionOfGuildMaster(character: GuildCharacter): Promise<string> {
  const gameDay = await getGameDay();

  const recentChats = await listChatHistoryForCharacter(character.uid, 5);
  const chatContext = recentChats.length > 0
    ? `Recent conversations with the Guild Master:\n${recentChats.map((c) => `- ${c.summary}`).join('\n')}`
    : '';

  const prompt =
    `${character.characterName} is a ${character.race} ${character.className}. ${character.baseDescription}\n` +
    `The Guild Master runs the adventurer's guild that ${character.characterName} belongs to.\n` +
    (chatContext ? `${chatContext}\n\n` : '\n') +
    `In one or two sentences, describe how ${character.characterName} personally feels about the Guild Master and why, written in third person. ` +
    `Be direct and specific to their personality. Output only those sentences, nothing else.`;

  const prefix = `${character.characterName}'s impression of the Guild Master:`;

  let opinion: string;
  try {
    const raw = await callKoboldApi(
      prompt,
      160,
      `${character.characterName}: forming opinion of the Guild Master...`,
    );
    const body = cleanOpinion(raw) || `${character.characterName} has not yet formed a clear opinion of the Guild Master.`;
    opinion = `${prefix} ${body}`;
  } catch {
    opinion = `${prefix} ${character.characterName} has not yet formed a clear opinion of the Guild Master.`;
  }

  const existingGm = await getOpinion(character.uid, GUILD_MASTER_UID);
  const row: CharacterOpinion = {
    uid: existingGm?.uid ?? generateUid(),
    characterUid: character.uid,
    targetUid: GUILD_MASTER_UID,
    targetName: 'Guild Master',
    opinion,
    keywords: ['guild', 'master'],
    gameDay,
    createdAt: new Date().toISOString(),
  };

  await insertCharacterOpinion(row);
  return opinion;
}

/**
 * Generate opinions for `character` about all `others` plus the Guild Master.
 * If `onlyNew` is true (default), skips any target that already has an opinion.
 * Calls `onProgress` after each opinion is generated.
 */
export async function generateOpinionsForCharacter(
  character: GuildCharacter,
  others: GuildCharacter[],
  onlyNew = true,
  onProgress?: (targetName: string, done: number, total: number) => void,
): Promise<void> {
  const targets = onlyNew
    ? await filterNewTargets(character.uid, others)
    : others;

  const includeGm = !onlyNew || !(await hasOpinionOf(character.uid, GUILD_MASTER_UID));

  const total = targets.length + (includeGm ? 1 : 0);
  let done = 0;

  for (const target of targets) {
    await generateOpinionOfTarget(character, target);
    onProgress?.(target.characterName, ++done, total);
  }

  if (includeGm) {
    await generateOpinionOfGuildMaster(character);
    onProgress?.('Guild Master', ++done, total);
  }
}

/** Return only targets that don't already have an opinion from `characterUid`. */
async function filterNewTargets(
  characterUid: string,
  targets: GuildCharacter[],
): Promise<GuildCharacter[]> {
  const existing = await listOpinionsForCharacter(characterUid);
  const covered = new Set(existing.map((o) => o.targetUid));
  return targets.filter((t) => !covered.has(t.uid));
}

async function hasOpinionOf(characterUid: string, targetUid: string): Promise<boolean> {
  const opinion = await getOpinion(characterUid, targetUid);
  return opinion !== null;
}
