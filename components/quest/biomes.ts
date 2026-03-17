export type EnemyTypeName =
  | 'humanoid'
  | 'beast'
  | 'undead'
  | 'elemental'
  | 'fey'
  | 'construct'
  | 'giant'
  | 'fiend'
  | 'aberration'
  | 'monstrosity';

export type BiomeData = {
  name: string;
  races: string[];
  enemyTypes: EnemyTypeName[];
};

export type EnemyTypeStats = {
  hitDie: number;
  primaryStat: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
};

export const ENEMY_TYPE_DATA: Record<EnemyTypeName, EnemyTypeStats> = {
  humanoid:    { hitDie: 8,  primaryStat: 'strength'     },
  beast:       { hitDie: 8,  primaryStat: 'strength'     },
  undead:      { hitDie: 8,  primaryStat: 'constitution' },
  elemental:   { hitDie: 10, primaryStat: 'constitution' },
  fey:         { hitDie: 6,  primaryStat: 'dexterity'    },
  construct:   { hitDie: 10, primaryStat: 'constitution' },
  giant:       { hitDie: 12, primaryStat: 'strength'     },
  fiend:       { hitDie: 10, primaryStat: 'strength'     },
  aberration:  { hitDie: 8,  primaryStat: 'intelligence' },
  monstrosity: { hitDie: 10, primaryStat: 'strength'     },
};

// ─── Biomes ───────────────────────────────────────────────────────────────────

export const BIOMES: BiomeData[] = [
  {
    name: 'Forest',
    races: ['Goblin', 'Wood Elf', 'Gnoll', 'Satyr', 'Dryad'],
    enemyTypes: ['humanoid', 'beast', 'fey'],
  },
  {
    name: 'Dungeon',
    races: ['Skeleton', 'Zombie', 'Goblin', 'Orc', 'Kobold'],
    enemyTypes: ['undead', 'humanoid', 'construct'],
  },
  {
    name: 'Tundra',
    races: ['Frost Giant', 'Yeti', 'Ice Troll', 'Barbarian Raider', 'Polar Bear'],
    enemyTypes: ['giant', 'beast', 'elemental'],
  },
  {
    name: 'Desert',
    races: ['Gnoll', 'Yuan-ti', 'Mummy', 'Jackalwere', 'Dust Devil'],
    enemyTypes: ['humanoid', 'undead', 'elemental'],
  },
  {
    name: 'Swamp',
    races: ['Lizardfolk', 'Troll', 'Hag', 'Bullywug', 'Crocodile'],
    enemyTypes: ['humanoid', 'beast', 'fey'],
  },
  {
    name: 'Volcano',
    races: ['Fire Giant', 'Salamander', 'Magmin', 'Azer', 'Hell Hound'],
    enemyTypes: ['elemental', 'fiend', 'construct'],
  },
  {
    name: 'Coastal',
    races: ['Merfolk', 'Pirate', 'Sahuagin', 'Sea Hag', 'Shark'],
    enemyTypes: ['humanoid', 'beast', 'monstrosity'],
  },
  {
    name: 'Underdark',
    races: ['Drow', 'Mind Flayer', 'Duergar', 'Drider', 'Cloaker'],
    enemyTypes: ['humanoid', 'aberration', 'undead'],
  },
  {
    name: 'Plains',
    races: ['Orc', 'Centaur', 'Gnoll', 'Bandit', 'Worg'],
    enemyTypes: ['humanoid', 'beast', 'giant'],
  },
  {
    name: 'Ruins',
    races: ['Cultist', 'Stone Golem', 'Ghost', 'Wraith', 'Gargoyle'],
    enemyTypes: ['humanoid', 'construct', 'undead'],
  },
];

// ─── Difficulty constants ─────────────────────────────────────────────────────

export const DIFFICULTY_ROOM_COUNT: Record<string, number> = {
  easy:   3,
  medium: 4,
  hard:   5,
  deadly: 6,
};

export const DIFFICULTY_DC: Record<string, number> = {
  easy:   10,
  medium: 13,
  hard:   16,
  deadly: 19,
};

export const DIFFICULTY_ENEMY_COUNT: Record<string, [number, number]> = {
  easy:   [1, 2],
  medium: [2, 3],
  hard:   [2, 4],
  deadly: [3, 5],
};

export const CHALLENGE_STATS: Array<
  'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'
> = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
