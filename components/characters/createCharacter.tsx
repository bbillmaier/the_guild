import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import {
  generateRandomCharacterName,
  type CharacterGender,
} from '@/components/characters/lists/name';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type StatKey =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma';

type CharacterStats = Record<StatKey, number>;

export type GeneratedCharacter = {
  uid: string;
  characterName: string;
  gender: CharacterGender;
  class: string;
  race: string;
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

type CreateCharacterProps = {
  race?: string;
  className?: string;
  gender?: CharacterGender;
  onCreate?: (character: GeneratedCharacter) => void;
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

const classPriorityMap: Record<string, StatKey[]> = {
  barbarian: ['strength', 'constitution', 'dexterity', 'wisdom', 'charisma', 'intelligence'],
  bard: ['charisma', 'dexterity', 'constitution', 'wisdom', 'intelligence', 'strength'],
  cleric: ['wisdom', 'constitution', 'strength', 'charisma', 'dexterity', 'intelligence'],
  druid: ['wisdom', 'constitution', 'dexterity', 'intelligence', 'charisma', 'strength'],
  fighter: ['strength', 'constitution', 'dexterity', 'wisdom', 'charisma', 'intelligence'],
  monk: ['dexterity', 'wisdom', 'constitution', 'strength', 'intelligence', 'charisma'],
  paladin: ['strength', 'charisma', 'constitution', 'wisdom', 'dexterity', 'intelligence'],
  ranger: ['dexterity', 'wisdom', 'constitution', 'strength', 'charisma', 'intelligence'],
  rogue: ['dexterity', 'constitution', 'wisdom', 'charisma', 'intelligence', 'strength'],
  sorcerer: ['charisma', 'constitution', 'dexterity', 'wisdom', 'intelligence', 'strength'],
  warlock: ['charisma', 'constitution', 'dexterity', 'wisdom', 'intelligence', 'strength'],
  wizard: ['intelligence', 'constitution', 'dexterity', 'wisdom', 'charisma', 'strength'],
};

const defaultPriority: StatKey[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
];

const availableRaces = [
  'human',
  'elf',
  'dwarf',
  'halfling',
  'gnome',
  'half-orc',
  'tiefling',
  'dragonborn',
  'half-elf',
  'aarakocra',
  'aasimar',
  'firbolg',
  'genasi',
  'goblin',
  'goliath',
  'hobgoblin',
  'kobold',
  'lizardfolk',
  'orc',
  'tabaxi',
  'triton',
  'yuan-ti',
  'shadar-kai',
  'eladrin',
  'satyr',
  'centaur',
  'changeling',
  'warforged',
  'leonin',
  'harengon',
  'fairy',
  'minotaur',
  'tortle',
];

const availableClasses = Object.keys(classPriorityMap);
const maxStatValue = 20;

const raceBonusMap: Partial<Record<string, { plusTwo: StatKey; plusOne: StatKey }>> = {
  elf: { plusTwo: 'dexterity', plusOne: 'intelligence' },
  dwarf: { plusTwo: 'constitution', plusOne: 'wisdom' },
  halfling: { plusTwo: 'dexterity', plusOne: 'charisma' },
  gnome: { plusTwo: 'intelligence', plusOne: 'constitution' },
  'half-orc': { plusTwo: 'strength', plusOne: 'constitution' },
  tiefling: { plusTwo: 'charisma', plusOne: 'intelligence' },
  dragonborn: { plusTwo: 'strength', plusOne: 'charisma' },
  'half-elf': { plusTwo: 'charisma', plusOne: 'dexterity' },
  aarakocra: { plusTwo: 'dexterity', plusOne: 'wisdom' },
  aasimar: { plusTwo: 'charisma', plusOne: 'wisdom' },
  firbolg: { plusTwo: 'wisdom', plusOne: 'strength' },
  genasi: { plusTwo: 'constitution', plusOne: 'intelligence' },
  goblin: { plusTwo: 'dexterity', plusOne: 'constitution' },
  goliath: { plusTwo: 'strength', plusOne: 'constitution' },
  hobgoblin: { plusTwo: 'constitution', plusOne: 'intelligence' },
  kobold: { plusTwo: 'dexterity', plusOne: 'charisma' },
  lizardfolk: { plusTwo: 'constitution', plusOne: 'wisdom' },
  orc: { plusTwo: 'strength', plusOne: 'constitution' },
  tabaxi: { plusTwo: 'dexterity', plusOne: 'charisma' },
  triton: { plusTwo: 'strength', plusOne: 'charisma' },
  'yuan-ti': { plusTwo: 'charisma', plusOne: 'intelligence' },
  'shadar-kai': { plusTwo: 'dexterity', plusOne: 'constitution' },
  eladrin: { plusTwo: 'dexterity', plusOne: 'charisma' },
  satyr: { plusTwo: 'charisma', plusOne: 'dexterity' },
  centaur: { plusTwo: 'strength', plusOne: 'wisdom' },
  changeling: { plusTwo: 'charisma', plusOne: 'dexterity' },
  warforged: { plusTwo: 'constitution', plusOne: 'strength' },
  leonin: { plusTwo: 'strength', plusOne: 'constitution' },
  harengon: { plusTwo: 'dexterity', plusOne: 'wisdom' },
  fairy: { plusTwo: 'dexterity', plusOne: 'charisma' },
  minotaur: { plusTwo: 'strength', plusOne: 'constitution' },
  tortle: { plusTwo: 'strength', plusOne: 'wisdom' },
};

export function CreateCharacter({ race, className, gender, onCreate }: CreateCharacterProps) {
  const [generated, setGenerated] = useState<GeneratedCharacter | null>(null);

  function handleGenerate() {
    const selectedRace = race?.trim() || pickRandom(availableRaces);
    const selectedClass = className?.trim() || pickRandom(availableClasses);
    const normalizedClass = selectedClass.toLowerCase();
    const priority = classPriorityMap[normalizedClass] ?? defaultPriority;
    const selectedGender = gender ?? pickRandomGender();
    const pointBuyStats = generatePointBuyStats(priority);
    const stats = applyRacialBonuses(pointBuyStats, selectedRace, priority);
    const character: GeneratedCharacter = {
      uid: createUid(),
      characterName: generateRandomCharacterName(selectedGender),
      gender: selectedGender,
      class: selectedClass,
      race: selectedRace,
      ...stats,
      physDesc: [],
      metaDesc: [],
      baseDescription: '',
    };

    setGenerated(character);
    onCreate?.(character);
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Create Character</ThemedText>
      <ThemedText>Name: random from list</ThemedText>
      <ThemedText>Gender: {gender ?? 'random (50/50)'}</ThemedText>
      <ThemedText>Race: {race?.trim() || 'random'}</ThemedText>
      <ThemedText>Class: {className?.trim() || 'random'}</ThemedText>

      <Pressable style={styles.button} onPress={handleGenerate}>
        <ThemedText style={styles.buttonText}>Generate (27 Point Buy)</ThemedText>
      </Pressable>

      {generated ? (
        <ThemedView style={styles.previewCard}>
          <ThemedText type="defaultSemiBold">{generated.characterName}</ThemedText>
          <ThemedText>Gender: {generated.gender}</ThemedText>
          <ThemedText>UID: {generated.uid}</ThemedText>
          <ThemedText>STR {generated.strength}</ThemedText>
          <ThemedText>DEX {generated.dexterity}</ThemedText>
          <ThemedText>CON {generated.constitution}</ThemedText>
          <ThemedText>INT {generated.intelligence}</ThemedText>
          <ThemedText>WIS {generated.wisdom}</ThemedText>
          <ThemedText>CHA {generated.charisma}</ThemedText>
          <ThemedText>physDesc: []</ThemedText>
          <ThemedText>metaDesc: []</ThemedText>
          <ThemedText>baseDescription: &apos;&apos;</ThemedText>
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

function generatePointBuyStats(priority: StatKey[]): CharacterStats {
  const stats: CharacterStats = {
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
  stats: CharacterStats,
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

  return `char-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function pickRandomGender(): CharacterGender {
  return Math.random() < 0.5 ? 'male' : 'female';
}

function pickRandom<T>(values: T[]) {
  return values[Math.floor(Math.random() * values.length)];
}

function applyRacialBonuses(stats: CharacterStats, race: string, priority: StatKey[]): CharacterStats {
  const normalizedRace = race.trim().toLowerCase();
  const explicitBonus = raceBonusMap[normalizedRace];
  const bonus = explicitBonus ?? { plusTwo: priority[0], plusOne: priority[1] };

  return {
    ...stats,
    [bonus.plusTwo]: Math.min(maxStatValue, stats[bonus.plusTwo] + 2),
    [bonus.plusOne]: Math.min(maxStatValue, stats[bonus.plusOne] + 1),
  };
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
    backgroundColor: '#0a7ea4',
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
