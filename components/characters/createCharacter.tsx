import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import {
  generateRandomCharacterName,
  type CharacterGender,
} from '@/components/characters/lists/name';
import { callKoboldApi } from '@/components/LLM/kobold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  initializeDatabase,
  listGuildMetaDescriptions,
  listPhysDescAll,
  type GuildMetaDesc,
  type PhysDescItem,
} from '@/lib/local-db';

// Races whose appearance is scale-based — no human hair or skin tone
const SCALE_RACES = new Set(['dragonborn', 'lizardfolk', 'kobold', 'tortle', 'yuan-ti']);
// Races whose appearance is fur-based
const FUR_RACES = new Set(['tabaxi', 'leonin', 'harengon']);
// Races whose appearance is feather-based
const FEATHER_RACES = new Set(['aarakocra']);
// Constructs / elementals — no biological color traits at all
const NO_COLOR_RACES = new Set(['warforged', 'genasi', 'minotaur']);
// Races that can have human hair but have distinctive non-human skin (skip skin_tone)
const SKIP_SKIN_RACES = new Set([
  'half-orc', 'goblin', 'hobgoblin', 'tiefling', 'goliath',
  'firbolg', 'shadar-kai', 'eladrin', 'centaur', 'satyr',
  'triton', 'changeling', 'fairy',
]);

function pickPhysDescTraits(pool: PhysDescItem[], race: string): string[] {
  const r = race.toLowerCase();
  const by = (cat: string) => pool.filter((p) => p.category === cat);
  const result: string[] = [];

  if (SCALE_RACES.has(r)) {
    // Scaled races: one scale color, no hair, no skin tone
    const c = pickRandom(by('scale_color'));
    if (c) result.push(c.value);
  } else if (FUR_RACES.has(r)) {
    // Fur-bearing races: one fur color, no hair, no skin tone
    const c = pickRandom(by('fur_color'));
    if (c) result.push(c.value);
  } else if (FEATHER_RACES.has(r)) {
    // Feathered races: one feather color, no hair, no skin tone
    const c = pickRandom(by('feather_color'));
    if (c) result.push(c.value);
  } else if (NO_COLOR_RACES.has(r)) {
    // Constructs / elementals: skip all color descriptors
  } else if (SKIP_SKIN_RACES.has(r)) {
    // Human-like hair but distinctive non-human skin — omit skin_tone
    const hairColor = pickRandom(by('hair_color'));
    if (hairColor) result.push(hairColor.value);
    const hairStyle = pickRandom(by('hair_style'));
    if (hairStyle) result.push(hairStyle.value);
  } else {
    // Standard humanoids: full set
    const hairColor = pickRandom(by('hair_color'));
    if (hairColor) result.push(hairColor.value);
    const hairStyle = pickRandom(by('hair_style'));
    if (hairStyle) result.push(hairStyle.value);
    const skinTone = pickRandom(by('skin_tone'));
    if (skinTone) result.push(skinTone.value);
  }

  // Body type applies to all races
  const bodyType = pickRandom(by('body_type'));
  if (bodyType) result.push(bodyType.value);

  // 0–2 misc traits without repeats (all races can have scars, marks, etc.)
  const miscPool = [...by('misc')];
  const miscCount = Math.floor(Math.random() * 3);
  for (let i = 0; i < miscCount && miscPool.length > 0; i++) {
    const idx = Math.floor(Math.random() * miscPool.length);
    result.push(miscPool[idx].value);
    miscPool.splice(idx, 1);
  }

  return result;
}

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

type CreateCharacterProps = {
  name?: string;
  race?: string;
  className?: string;
  gender?: CharacterGender;
  starterDescription?: string;
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

export function CreateCharacter({ name, race, className, gender, starterDescription, onCreate }: CreateCharacterProps) {
  const [generated, setGenerated] = useState<GeneratedCharacter | null>(null);
  const [descHint, setDescHint] = useState(starterDescription ?? '');
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await initializeDatabase();
      const [availableMetaDesc, allPhysDesc] = await Promise.all([
        listGuildMetaDescriptions(),
        listPhysDescAll(),
      ]);
      const selectedMetaDescIds = pickRandomMetaDescIds(availableMetaDesc.map((row) => row.uid), 3);
      const selectedMetaDescRows = availableMetaDesc.filter((row) => selectedMetaDescIds.includes(row.uid));

      const selectedRace = race?.trim() || pickRandom(availableRaces);
      const selectedPhysDesc = pickPhysDescTraits(allPhysDesc, selectedRace);
      const selectedClass = className?.trim() || pickRandom(availableClasses);
      const normalizedClass = selectedClass.toLowerCase();
      const priority = classPriorityMap[normalizedClass] ?? defaultPriority;
      const selectedGender = gender ?? pickRandomGender();
      const characterName = name?.trim() || generateRandomCharacterName(selectedGender);
      const pointBuyStats = generatePointBuyStats(priority);
      const racialStats = applyRacialBonuses(pointBuyStats, selectedRace, priority);
      const stats = applyMetaDescModifiers(racialStats, selectedMetaDescRows);
      const hp = 10 + getConModifier(stats.constitution);
      const prompt = buildCharacterDescriptionPrompt({
        characterName,
        gender: selectedGender,
        race: selectedRace,
        className: selectedClass,
        physDescTraits: selectedPhysDesc,
        metaDescRows: selectedMetaDescRows,
        starterDescription: descHint.trim() || undefined,
      });
      const baseDescription = await generateBaseDescription(prompt, {
        characterName,
        gender: selectedGender,
        race: selectedRace,
        className: selectedClass,
        physDescTraits: selectedPhysDesc,
        metaDescRows: selectedMetaDescRows,
      });

      const character: GeneratedCharacter = {
        uid: createUid(),
        characterName,
        gender: selectedGender,
        class: normalizedClass,
        race: selectedRace,
        hp,
        ...stats,
        physDesc: selectedPhysDesc,
        metaDesc: selectedMetaDescIds,
        baseDescription,
      };

      setGenerated(character);
      onCreate?.(character);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Create Character</ThemedText>
      <ThemedText>Name: random from list</ThemedText>
      <ThemedText>Gender: {gender ?? 'random (50/50)'}</ThemedText>
      <ThemedText>Race: {race?.trim() || 'random'}</ThemedText>
      <ThemedText>Class: {className?.trim() || 'random'}</ThemedText>

      <TextInput
        style={styles.textInput}
        placeholder="Starter description (optional)"
        placeholderTextColor="#9BA1A6"
        value={descHint}
        onChangeText={setDescHint}
        multiline
      />

      <Pressable
        style={[styles.button, generating && styles.buttonDisabled]}
        onPress={() => void handleGenerate()}
        disabled={generating}
      >
        <ThemedText style={styles.buttonText}>
          {generating ? 'Generating...' : 'Generate (27 Point Buy)'}
        </ThemedText>
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
          <ThemedText>physDesc: [{generated.physDesc.join(', ')}]</ThemedText>
          <ThemedText>metaDesc: [{generated.metaDesc.join(', ')}]</ThemedText>
          <ThemedText>baseDescription: {generated.baseDescription || '(empty)'}</ThemedText>
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

function applyMetaDescModifiers(stats: CharacterStats, metaRows: GuildMetaDesc[]): CharacterStats {
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
  characterName: string;
  gender: CharacterGender;
  race: string;
  className: string;
  physDescTraits: string[];
  metaDescRows: GuildMetaDesc[];
  starterDescription?: string;
};

function buildCharacterDescriptionPrompt(input: DescriptionPromptInput) {
  const traitText =
    input.metaDescRows.length === 0
      ? 'No additional meta traits.'
      : input.metaDescRows.map((row) => `${row.name}: ${row.description}`).join(' | ');

  const physLine = input.physDescTraits.length > 0
    ? `Physical appearance: ${input.physDescTraits.join(', ')}.`
    : '';

  return [
    `Write a character description for ${input.characterName}, a ${input.gender} ${input.race} ${input.className}.`,
    physLine,
    `Personality: ${traitText}`,
    input.starterDescription ? `Additional direction: ${input.starterDescription}` : '',
    'Cover their physical appearance and personality. Do not mention clothing or equipment. Output only the description, nothing else.',
  ].filter(Boolean).join(' ');
}

async function generateBaseDescription(prompt: string, input: DescriptionPromptInput) {
  try {
    const response = (await callKoboldApi(prompt, 400)).trim();
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
    ? `${input.characterName} is a ${input.gender} ${input.race} ${input.className} shaped by ${traitNames}.`
    : `${input.characterName} is a ${input.gender} ${input.race} ${input.className}.`;
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
  buttonDisabled: {
    backgroundColor: '#9BA1A6',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#11181C',
    minHeight: 48,
  },
  previewCard: {
    borderWidth: 1,
    borderColor: '#687076',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
});
