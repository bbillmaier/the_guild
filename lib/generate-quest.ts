/**
 * Standalone quest generator — shared between the admin CreateQuest UI and
 * the automatic daily notice-board refresh in the Tavern.
 */

import { callKoboldApi } from '@/components/LLM/kobold';
import {
  BIOMES,
  CHALLENGE_STATS,
  DIFFICULTY_DC,
  DIFFICULTY_ENEMY_COUNT,
  DIFFICULTY_ROOM_COUNT,
  ENEMY_TYPE_DATA,
  type BiomeData,
  type EnemyTypeName,
} from '@/components/quest/biomes';
import {
  initializeDatabase,
  insertGuildQuest,
  insertQuestRoom,
  markRumourUsed,
  type CharacterGender,
  type GuildQuest,
  type QuestChain,
  type QuestDifficulty,
  type QuestRoom,
  type Rumour,
  type RoomType,
} from '@/lib/local-db';

export type ChainContext = {
  chain: QuestChain;
  playerAnswer: string;
  outcome: 'success' | 'failure';
};

// ─── Internal types ───────────────────────────────────────────────────────────

type MinionStats = {
  uid: string;
  characterName: string;
  gender: CharacterGender;
  className: string;
  race: string;
  hp: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  physDesc: string[];
  metaDesc: string[];
  baseDescription: string;
  level: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateUid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function trimToLastSentence(text: string): string {
  const match = text.match(/^.*[.!?]/s);
  return match ? match[0].trim() : text.trim();
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function calcHp(hitDie: number, constitution: number, level: number): number {
  const conMod = Math.floor((constitution - 10) / 2);
  return Math.max(level, (hitDie + conMod) + (Math.floor(hitDie / 2) + conMod) * (level - 1));
}

/**
 * Point-buy budgets per difficulty. Budget is distributed between the
 * primary attack stat and constitution using the same cost table as
 * character creation (base 8, costs: 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9).
 * Easy enemies (budget 19) end up weaker than deadly ones (budget 27).
 */
const MINION_POINT_BUY_BUDGET: Record<QuestDifficulty, number> = {
  easy: 19, medium: 22, hard: 25, deadly: 27,
};

// Cumulative point-buy cost to reach a score from base 8.
const POINT_BUY_COST: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};

/** Highest score reachable without exceeding `budget` points. */
function scoreFromBudget(budget: number): number {
  for (let s = 15; s >= 8; s--) {
    if ((POINT_BUY_COST[s] ?? 99) <= budget) return s;
  }
  return 8;
}

function buildMinion(
  _biome: BiomeData,
  level: number,
  typeName: EnemyTypeName,
  race: string,
  budget = 27,
): MinionStats {
  const typeStats = ENEMY_TYPE_DATA[typeName];
  // Spend 55 % of budget on primary stat, remainder on constitution.
  const primaryBudget = Math.floor(budget * 0.55);
  const conBudget     = budget - primaryBudget;
  const primaryBase   = scoreFromBudget(primaryBudget);
  const conBase       = scoreFromBudget(conBudget);
  const primaryStat   = primaryBase + Math.floor(level / 2);
  const constitution  = conBase     + Math.floor(level / 3);
  const stats: Record<string, number> = {
    strength: 10, dexterity: 10, constitution,
    intelligence: 10, wisdom: 10, charisma: 10,
  };
  stats[typeStats.primaryStat] = primaryStat;

  return {
    uid: generateUid(),
    characterName: `${race} ${capitalize(typeName)}`,
    gender: 'unknown',
    className: `${race} ${typeName}`,
    race,
    hp: calcHp(typeStats.hitDie, constitution, level),
    strength: stats.strength,
    dexterity: stats.dexterity,
    constitution: stats.constitution,
    intelligence: stats.intelligence,
    wisdom: stats.wisdom,
    charisma: stats.charisma,
    physDesc: [],
    metaDesc: [],
    baseDescription: '',
    level,
  };
}

function buildBoss(
  _biome: BiomeData,
  level: number,
  name: string,
  description: string,
  race: string,
  typeName: EnemyTypeName,
  budget = 27,
): MinionStats {
  const typeStats = ENEMY_TYPE_DATA[typeName];
  const bossLevel = level + 2;
  // Boss gets a +2 budget bonus on top of the difficulty budget.
  const bossBudget    = Math.min(budget + 2, 27);
  const primaryBudget = Math.floor(bossBudget * 0.55);
  const conBudget     = bossBudget - primaryBudget;
  const primaryBase   = scoreFromBudget(primaryBudget) + 2; // bosses are always a bit stronger
  const conBase       = scoreFromBudget(conBudget)     + 2;
  const primaryStat   = primaryBase + Math.floor(bossLevel / 2);
  const constitution  = conBase     + Math.floor(bossLevel / 3);
  const stats: Record<string, number> = {
    strength: 10, dexterity: 10, constitution,
    intelligence: 10, wisdom: 10, charisma: 10,
  };
  stats[typeStats.primaryStat] = primaryStat;

  return {
    uid: generateUid(),
    characterName: name,
    gender: 'unknown',
    className: `${race} ${typeName}`,
    race,
    hp: calcHp(typeStats.hitDie, constitution, bossLevel),
    strength: stats.strength,
    dexterity: stats.dexterity,
    constitution: stats.constitution,
    intelligence: stats.intelligence,
    wisdom: stats.wisdom,
    charisma: stats.charisma,
    physDesc: [],
    metaDesc: [],
    baseDescription: description,
    level: bossLevel,
  };
}

const BOSS_MINION_COUNT: Record<QuestDifficulty, number> = {
  easy: 1, medium: 3, hard: 4, deadly: 6,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Roll a random difficulty using the standard distribution:
 * 10% easy, 50% medium, 30% hard, 10% deadly.
 */
export function rollQuestDifficulty(): QuestDifficulty {
  const r = Math.random();
  if (r < 0.10) return 'easy';
  if (r < 0.60) return 'medium';
  if (r < 0.90) return 'hard';
  return 'deadly';
}

/**
 * Roll a quest level relative to the party's average level.
 * Below average level 3 the spread is removed so early-game quests
 * always match the party exactly. Clamps to a minimum of 1.
 */
export function rollQuestLevel(avgPartyLevel: number): number {
  if (avgPartyLevel < 3) return Math.max(1, avgPartyLevel);
  const spread = 2;
  const min = Math.max(1, avgPartyLevel - spread);
  const max = avgPartyLevel + spread;
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Fully generate a quest (LLM calls + room building) and persist it to the DB.
 * @param level      Quest enemy level.
 * @param difficulty Quest difficulty tier.
 * @param onStep     Optional progress callback for UI feedback.
 */
export async function generateQuest(
  level: number,
  difficulty: QuestDifficulty,
  onStep?: (step: string) => void,
  seedRumour?: Rumour,
  chainContext?: ChainContext,
): Promise<GuildQuest> {
  const step = (msg: string) => onStep?.(msg);

  const biome = pickRandom(BIOMES);
  const totalRooms = DIFFICULTY_ROOM_COUNT[difficulty];
  const nonBossCount = totalRooms - 1;
  const extraCount = nonBossCount - 2;
  const extras: RoomType[] = Array.from({ length: extraCount }, () =>
    Math.random() < 0.5 ? 'combat' : 'challenge'
  );
  const roomTypes: RoomType[] = shuffle(['combat', 'challenge', ...extras] as RoomType[]);
  roomTypes.push('boss');

  const rumourCtx = seedRumour
    ? `\nA rumour has been circulating in the area: "${seedRumour.text}"\nThe quest should be related to or inspired by this rumour.`
    : '';

  const chainCtx = chainContext
    ? [
        `\nThis quest is part of an ongoing story called "${chainContext.chain.name}" (quest ${chainContext.chain.depth} of ${chainContext.chain.maxDepth}).`,
        `Overarching premise: ${chainContext.chain.premise}`,
        chainContext.chain.storySoFar ? `Story so far:\n${chainContext.chain.storySoFar}` : '',
        chainContext.outcome === 'failure'
          ? `The previous quest ended in failure. This quest continues despite that setback.`
          : '',
        `The guild's stated intention: ${chainContext.playerAnswer}`,
        `The quest should feel like a direct continuation of this story.`,
      ].filter(Boolean).join('\n')
    : '';

  step('Generating quest title...');
  const titleRaw = await callKoboldApi(
    `Write a 3 to 4 word fantasy quest title set in a ${biome.name.toLowerCase()}.${rumourCtx}${chainCtx} Examples: "Fangs of the Fen", "Ruins of Ashveil", "Depths of Cindermaw". Output only the title — no quotes, no punctuation at the end, no explanation.`,
    10,
    'Quest: writing title...'
  );
  const title = titleRaw.trim().split('\n')[0].replace(/^["']|["']$|[.!?]$/g, '').trim();

  step('Generating quest summary...');
  const summaryRaw = await callKoboldApi(
    `Write 2-3 sentences describing the goal and stakes of a quest called "${title}" set in a ${biome.name.toLowerCase()}.${rumourCtx}${chainCtx} Mention the threat, the location, and what is at stake. Past tense, evocative. No game mechanics, no numbers. Output only the description.`,
    150,
    'Quest: writing summary...'
  );
  const summary = trimToLastSentence(summaryRaw.trim());

  const questUid = generateUid();
  const rooms: QuestRoom[] = [];

  for (let i = 0; i < roomTypes.length; i++) {
    const roomType = roomTypes[i];
    const roomNumber = i + 1;

    if (roomType === 'combat') {
      const [minCount, maxCount] = DIFFICULTY_ENEMY_COUNT[difficulty];
      const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
      const budget = MINION_POINT_BUY_BUDGET[difficulty];
      const enemies = Array.from({ length: count }, () => {
        const typeName = pickRandom(biome.enemyTypes);
        const race = pickRandom(biome.races);
        return buildMinion(biome, level, typeName, race, budget);
      });
      rooms.push({
        uid: generateUid(),
        questUid,
        roomNumber,
        roomType: 'combat',
        description: '',
        content: JSON.stringify({ type: 'combat', enemies }),
        status: 'pending',
      });

    } else if (roomType === 'challenge') {
      const dc = DIFFICULTY_DC[difficulty];
      const stat = pickRandom(CHALLENGE_STATS);
      step(`Generating challenge (room ${roomNumber})...`);
      const descRaw = await callKoboldApi(
        `Describe a single obstacle or test that adventurers face in a ${biome.name.toLowerCase()}, requiring ${stat}. 1-2 sentences. No game mechanics, no numbers, no dice. Output only the description.`,
        80,
        `Quest: writing room ${roomNumber} challenge...`
      );
      const description = trimToLastSentence(descRaw.trim());
      rooms.push({
        uid: generateUid(),
        questUid,
        roomNumber,
        roomType: 'challenge',
        description,
        content: JSON.stringify({ type: 'challenge', dc, stat, description }),
        status: 'pending',
      });

    } else {
      const typeName = pickRandom(biome.enemyTypes);
      const race = pickRandom(biome.races);

      step('Generating boss name...');
      const nameRaw = await callKoboldApi(
        `Give a unique name to a powerful ${race.toLowerCase()} ${typeName} boss monster. Output only the name — no explanation, no quotes.`,
        15,
        'Quest: naming boss...'
      );
      const bossName = nameRaw.trim().replace(/^["']|["']$/g, '');

      step('Generating boss description...');
      const descRaw = await callKoboldApi(
        `Describe the fearsome appearance of ${bossName}, a ${race.toLowerCase()} ${typeName}. 2-3 sentences. Vivid and threatening. No numbers, no game mechanics. Output only the description.`,
        250,
        'Quest: describing boss...'
      );
      const bossDesc = trimToLastSentence(descRaw.trim());

      const budget = MINION_POINT_BUY_BUDGET[difficulty];
      const boss = buildBoss(biome, level, bossName, bossDesc, race, typeName, budget);
      const minionLevel = Math.max(1, Math.floor(level / 2));
      const minions = Array.from({ length: BOSS_MINION_COUNT[difficulty] }, () => {
        const m = buildMinion(biome, minionLevel, pickRandom(biome.enemyTypes), pickRandom(biome.races), budget);
        return minionLevel === 1 ? { ...m, hp: 1 } : m;
      });
      rooms.push({
        uid: generateUid(),
        questUid,
        roomNumber,
        roomType: 'boss',
        description: bossDesc,
        content: JSON.stringify({ type: 'boss', boss, minions }),
        status: 'pending',
      });
    }
  }

  step('Saving quest...');
  await initializeDatabase();
  const quest: GuildQuest = {
    uid: questUid,
    title,
    difficulty,
    biome: biome.name,
    level,
    status: 'active',
    createdAt: new Date().toISOString(),
    narrative: '',
    summary,
    chainUid: chainContext?.chain.uid ?? null,
    chainDepth: chainContext?.chain.depth ?? null,
  };
  await insertGuildQuest(quest);
  for (const room of rooms) {
    await insertQuestRoom(room);
  }

  if (seedRumour) {
    await markRumourUsed(seedRumour.uid).catch(console.error);
  }

  return quest;
}
