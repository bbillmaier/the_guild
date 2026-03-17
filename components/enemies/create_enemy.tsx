import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { generateRandomEnemyName, type EnemyGender } from '@/components/enemies/lists/name';
import { callKoboldApi } from '@/components/LLM/kobold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  initializeDatabase,
  listGuildMetaDescriptions,
  type GuildMetaDesc,
} from '@/lib/local-db';

type StatKey =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma';

type EnemyStats = Record<StatKey, number>;

export type GeneratedEnemy = {
  uid: string;
  characterName: string;
  gender: EnemyGender;
  class: string;
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
};

type CreateEnemyProps = {
  race?: string;
  className?: string;
  gender?: EnemyGender;
  onCreate?: (enemy: GeneratedEnemy) => void;
};

const pointBuyCostByScore: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

const enemyTypePriorityMap: Record<string, StatKey[]> = {
  warrior:    ['strength', 'constitution', 'dexterity', 'wisdom', 'charisma', 'intelligence'],
  berserker:  ['strength', 'constitution', 'dexterity', 'wisdom', 'intelligence', 'charisma'],
  brute:      ['strength', 'constitution', 'wisdom', 'dexterity', 'intelligence', 'charisma'],
  warlord:    ['strength', 'charisma', 'constitution', 'wisdom', 'dexterity', 'intelligence'],
  archer:     ['dexterity', 'wisdom', 'constitution', 'strength', 'intelligence', 'charisma'],
  assassin:   ['dexterity', 'intelligence', 'wisdom', 'constitution', 'charisma', 'strength'],
  scout:      ['dexterity', 'wisdom', 'constitution', 'intelligence', 'charisma', 'strength'],
  shaman:     ['wisdom', 'intelligence', 'charisma', 'constitution', 'dexterity', 'strength'],
  necromancer:['intelligence', 'wisdom', 'constitution', 'charisma', 'dexterity', 'strength'],
  cultist:    ['charisma', 'wisdom', 'intelligence', 'constitution', 'dexterity', 'strength'],
};

const allStatKeys: StatKey[] = [
  'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
];

const availableEnemyRaces = [
  'goblin',
  'hobgoblin',
  'bugbear',
  'orc',
  'troll',
  'gnoll',
  'kobold',
  'lizardfolk',
  'skeleton',
  'zombie',
  'ogre',
  'harpy',
  'medusa',
  'yuan-ti',
  'bandit',
  'werewolf',
  'vampire spawn',
  'imp',
  'quasit',
  'minotaur',
];

const availableEnemyTypes = Object.keys(enemyTypePriorityMap);
const maxStatValue = 20;

const raceBonusMap: Record<string, { plusTwo: StatKey; plusOne: StatKey }> = {
  goblin:          { plusTwo: 'dexterity',    plusOne: 'constitution' },
  hobgoblin:       { plusTwo: 'constitution', plusOne: 'intelligence' },
  bugbear:         { plusTwo: 'strength',     plusOne: 'dexterity' },
  orc:             { plusTwo: 'strength',     plusOne: 'constitution' },
  troll:           { plusTwo: 'strength',     plusOne: 'constitution' },
  gnoll:           { plusTwo: 'strength',     plusOne: 'dexterity' },
  kobold:          { plusTwo: 'dexterity',    plusOne: 'charisma' },
  lizardfolk:      { plusTwo: 'constitution', plusOne: 'wisdom' },
  skeleton:        { plusTwo: 'strength',     plusOne: 'constitution' },
  zombie:          { plusTwo: 'strength',     plusOne: 'constitution' },
  ogre:            { plusTwo: 'strength',     plusOne: 'constitution' },
  harpy:           { plusTwo: 'dexterity',    plusOne: 'charisma' },
  medusa:          { plusTwo: 'charisma',     plusOne: 'intelligence' },
  'yuan-ti':       { plusTwo: 'charisma',     plusOne: 'intelligence' },
  bandit:          { plusTwo: 'dexterity',    plusOne: 'charisma' },
  werewolf:        { plusTwo: 'strength',     plusOne: 'constitution' },
  'vampire spawn': { plusTwo: 'charisma',     plusOne: 'dexterity' },
  imp:             { plusTwo: 'dexterity',    plusOne: 'intelligence' },
  quasit:          { plusTwo: 'dexterity',    plusOne: 'charisma' },
  minotaur:        { plusTwo: 'strength',     plusOne: 'constitution' },
};

export function CreateEnemy({ race, className, gender, onCreate }: CreateEnemyProps) {
  const [generated, setGenerated] = useState<GeneratedEnemy | null>(null);

  async function handleGenerate() {
    await initializeDatabase();
    const availableMetaDesc = await listGuildMetaDescriptions();
    const selectedMetaDescIds = pickRandomMetaDescIds(availableMetaDesc.map((row) => row.uid), 3);
    const selectedMetaDescRows = availableMetaDesc.filter((row) => selectedMetaDescIds.includes(row.uid));

    const selectedRace = race?.trim() || pickRandom(availableEnemyRaces);
    const selectedType = className?.trim() || pickRandom(availableEnemyTypes);
    const normalizedType = selectedType.toLowerCase();
    const priority = enemyTypePriorityMap[normalizedType] ?? shuffled(allStatKeys);
    const selectedGender = gender ?? pickRandomGender();
    const enemyName = generateRandomEnemyName(selectedGender);
    const pointBuyStats = generatePointBuyStats(priority);
    const racialStats = applyRacialBonuses(pointBuyStats, selectedRace, priority);
    const stats = applyMetaDescModifiers(racialStats, selectedMetaDescRows);
    const hp = 10 + getConModifier(stats.constitution);
    const prompt = buildEnemyDescriptionPrompt({
      enemyName,
      gender: selectedGender,
      race: selectedRace,
      enemyType: selectedType,
      metaDescRows: selectedMetaDescRows,
    });
    const baseDescription = await generateBaseDescription(prompt, {
      enemyName,
      gender: selectedGender,
      race: selectedRace,
      enemyType: selectedType,
      metaDescRows: selectedMetaDescRows,
    });

    const enemy: GeneratedEnemy = {
      uid: createUid(),
      characterName: enemyName,
      gender: selectedGender,
      class: selectedType,
      race: selectedRace,
      hp,
      ...stats,
      physDesc: [],
      metaDesc: selectedMetaDescIds,
      baseDescription,
    };

    setGenerated(enemy);
    onCreate?.(enemy);
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Create Enemy</ThemedText>
      <ThemedText>Name: random from list</ThemedText>
      <ThemedText>Gender: {gender ?? 'random (50/50)'}</ThemedText>
      <ThemedText>Race: {race?.trim() || 'random'}</ThemedText>
      <ThemedText>Type: {className?.trim() || 'random'}</ThemedText>

      <Pressable style={styles.button} onPress={() => void handleGenerate()}>
        <ThemedText style={styles.buttonText}>Generate Enemy (27 Point Buy)</ThemedText>
      </Pressable>

      {generated ? (
        <ThemedView style={styles.previewCard}>
          <ThemedText type="defaultSemiBold">{generated.characterName}</ThemedText>
          <ThemedText>Gender: {generated.gender}</ThemedText>
          <ThemedText>UID: {generated.uid}</ThemedText>
          <ThemedText>HP {generated.hp}</ThemedText>
          <ThemedText>STR {generated.strength}</ThemedText>
          <ThemedText>DEX {generated.dexterity}</ThemedText>
          <ThemedText>CON {generated.constitution}</ThemedText>
          <ThemedText>INT {generated.intelligence}</ThemedText>
          <ThemedText>WIS {generated.wisdom}</ThemedText>
          <ThemedText>CHA {generated.charisma}</ThemedText>
          <ThemedText>physDesc: []</ThemedText>
          <ThemedText>metaDesc: [{generated.metaDesc.join(', ')}]</ThemedText>
          <ThemedText>baseDescription: {generated.baseDescription || "''"}</ThemedText>
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

function generatePointBuyStats(priority: StatKey[]): EnemyStats {
  const stats: EnemyStats = {
    strength: 8,
    dexterity: 8,
    constitution: 8,
    intelligence: 8,
    wisdom: 8,
    charisma: 8,
  };

  let pointsRemaining = 27;
  const targetFloorByPriority = [15, 14, 13];

  for (let index = 0; index < targetFloorByPriority.length; index += 1) {
    const stat = priority[index];
    const target = targetFloorByPriority[index];
    if (!stat) {
      continue;
    }

    pointsRemaining = raiseStatToTarget(stats, stat, target, pointsRemaining);
  }

  while (pointsRemaining > 0) {
    const affordableStats = priority.filter((stat) => {
      const current = stats[stat];
      if (current >= 15) {
        return false;
      }

      const next = current + 1;
      return getIncrementCost(current, next) <= pointsRemaining;
    });

    if (affordableStats.length === 0) {
      break;
    }

    const picked = pickWeightedByPriority(affordableStats, priority);
    const current = stats[picked];
    const next = current + 1;
    const cost = getIncrementCost(current, next);
    if (cost <= pointsRemaining) {
      stats[picked] = next;
      pointsRemaining -= cost;
    } else {
      break;
    }
  }

  return stats;
}

function raiseStatToTarget(
  stats: EnemyStats,
  stat: StatKey,
  target: number,
  pointsRemaining: number
) {
  while (stats[stat] < target) {
    const current = stats[stat];
    const next = current + 1;
    const cost = getIncrementCost(current, next);
    if (cost > pointsRemaining) {
      break;
    }

    stats[stat] = next;
    pointsRemaining -= cost;
  }

  return pointsRemaining;
}

function getIncrementCost(current: number, next: number) {
  return pointBuyCostByScore[next] - pointBuyCostByScore[current];
}

function pickWeightedByPriority(candidates: StatKey[], priority: StatKey[]) {
  const entries = candidates.map((candidate) => ({
    candidate,
    weight: Math.max(1, priority.length - priority.indexOf(candidate)),
  }));

  const totalWeight = entries.reduce((total, entry) => total + entry.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.candidate;
    }
  }

  return entries[entries.length - 1].candidate;
}

function createUid() {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  return `enemy-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function pickRandomGender(): EnemyGender {
  return Math.random() < 0.5 ? 'male' : 'female';
}

function pickRandom<T>(values: T[]) {
  return values[Math.floor(Math.random() * values.length)];
}

function shuffled<T>(values: T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function applyRacialBonuses(stats: EnemyStats, race: string, priority: StatKey[]): EnemyStats {
  const normalizedRace = race.trim().toLowerCase();
  const explicitBonus = raceBonusMap[normalizedRace];
  const bonus = explicitBonus ?? { plusTwo: priority[0], plusOne: priority[1] };

  return {
    ...stats,
    [bonus.plusTwo]: Math.min(maxStatValue, stats[bonus.plusTwo] + 2),
    [bonus.plusOne]: Math.min(maxStatValue, stats[bonus.plusOne] + 1),
  };
}

function applyMetaDescModifiers(stats: EnemyStats, metaRows: GuildMetaDesc[]): EnemyStats {
  const updated = { ...stats };

  for (const row of metaRows) {
    if (!row.stat || typeof row.mode !== 'number') {
      continue;
    }

    updated[row.stat] = clampStatValue(updated[row.stat] + row.mode);
  }

  return updated;
}

function clampStatValue(value: number) {
  return Math.max(1, Math.min(maxStatValue, value));
}

function getConModifier(constitution: number) {
  return Math.floor((constitution - 10) / 2);
}

function pickRandomMetaDescIds(ids: string[], maxCount: number) {
  if (ids.length === 0 || maxCount <= 0) {
    return [] as string[];
  }

  const count = Math.min(Math.floor(Math.random() * (maxCount + 1)), ids.length);
  const shuffled = [...ids];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

type DescriptionPromptInput = {
  enemyName: string;
  gender: EnemyGender;
  race: string;
  enemyType: string;
  metaDescRows: GuildMetaDesc[];
};

function buildEnemyDescriptionPrompt(input: DescriptionPromptInput) {
  const traitText =
    input.metaDescRows.length === 0
      ? 'No additional traits.'
      : input.metaDescRows.map((row) => `${row.name}: ${row.description}`).join(' | ');

  return [
    `Describe ${input.enemyName}, a ${input.gender} ${input.race} ${input.enemyType}.`,
    `Traits: ${traitText}`,
    'Write one short paragraph in the style of a creature entry from a fantasy bestiary. Output only the description.',
  ].join(' ');
}

async function generateBaseDescription(prompt: string, input: DescriptionPromptInput) {
  try {
    const response = (await callKoboldApi(prompt)).trim();
    if (response) {
      return response;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Kobold API error.';
    console.error(error);
    return `[KOBOLD API ERROR] ${message}`;
  }

  const traitNames = input.metaDescRows.map((row) => row.name).join(', ');
  return traitNames
    ? `${input.enemyName} is a ${input.gender} ${input.race} ${input.enemyType} driven by ${traitNames}.`
    : `${input.enemyName} is a ${input.gender} ${input.race} ${input.enemyType}.`;
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#687076',
    borderRadius: 10,
    padding: 12,
  },
  button: {
    backgroundColor: '#8B0000',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  previewCard: {
    borderWidth: 1,
    borderColor: '#687076',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
});
