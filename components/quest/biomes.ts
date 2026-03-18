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
  /** Descriptor biomes only — true if this location type can appear inside or beneath an urban area. */
  urban?: boolean;
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

/**
 * Natural biomes — large landscape types that can be assigned to a Zone.
 */
export const NATURAL_BIOMES: BiomeData[] = [
  {
    name: 'Forest',
    races: ['Goblin', 'Wood Elf', 'Gnoll', 'Satyr', 'Dryad'],
    enemyTypes: ['humanoid', 'beast', 'fey'],
  },
  {
    name: 'Jungle',
    races: ['Yuan-ti', 'Jungle Troll', 'Werejaguar', 'Naga', 'Pterodactyl'],
    enemyTypes: ['humanoid', 'beast', 'monstrosity'],
  },
  {
    name: 'Tundra',
    races: ['Frost Giant', 'Yeti', 'Ice Troll', 'Barbarian Raider', 'Polar Bear'],
    enemyTypes: ['giant', 'beast', 'elemental'],
  },
  {
    name: 'Glacier',
    races: ['Frost Giant', 'Winter Wolf', 'Ice Troll', 'Remorhaz', 'Wendigo'],
    enemyTypes: ['giant', 'beast', 'elemental'],
  },
  {
    name: 'Desert',
    races: ['Gnoll', 'Yuan-ti', 'Mummy', 'Jackalwere', 'Dust Devil'],
    enemyTypes: ['humanoid', 'undead', 'elemental'],
  },
  {
    name: 'Badlands',
    races: ['Gnoll', 'Dust Mephit', 'Bandit', 'Basilisk', 'Scorpion Spawn'],
    enemyTypes: ['humanoid', 'beast', 'elemental'],
  },
  {
    name: 'Salt Flats',
    races: ['Jackalwere', 'Dust Devil', 'Bone Naga', 'Mirage Stalker', 'Scorpion Spawn'],
    enemyTypes: ['elemental', 'undead', 'beast'],
  },
  {
    name: 'Swamp',
    races: ['Lizardfolk', 'Troll', 'Hag', 'Bullywug', 'Crocodile'],
    enemyTypes: ['humanoid', 'beast', 'fey'],
  },
  {
    name: 'Mangrove',
    races: ['Sea Hag', 'Crocodile', 'Lizardfolk', 'Shambling Mound', 'Will-o\'-Wisp'],
    enemyTypes: ['fey', 'beast', 'humanoid'],
  },
  {
    name: 'Moorland',
    races: ['Bog Witch', 'Banshee', 'Will-o\'-Wisp', 'Darkmantle', 'Werewolf'],
    enemyTypes: ['fey', 'undead', 'humanoid'],
  },
  {
    name: 'Plains',
    races: ['Orc', 'Centaur', 'Gnoll', 'Bandit', 'Worg'],
    enemyTypes: ['humanoid', 'beast', 'giant'],
  },
  {
    name: 'Savanna',
    races: ['Gnoll', 'Hobgoblin', 'Wyvern', 'Lion Pack', 'Hyena Swarm'],
    enemyTypes: ['humanoid', 'beast', 'monstrosity'],
  },
  {
    name: 'Steppe',
    races: ['Hobgoblin', 'Worg Rider', 'Centaur', 'Nomad Warrior', 'Giant Eagle'],
    enemyTypes: ['humanoid', 'beast', 'giant'],
  },
  {
    name: 'Mountain',
    races: ['Stone Giant', 'Harpy', 'Griffon', 'Mountain Goat Rider', 'Rock Troll'],
    enemyTypes: ['giant', 'beast', 'monstrosity'],
  },
  {
    name: 'Canyon',
    races: ['Harpy', 'Stone Giant', 'Bandit', 'Manticore', 'Basilisk'],
    enemyTypes: ['humanoid', 'giant', 'monstrosity'],
  },
  {
    name: 'Volcano',
    races: ['Fire Giant', 'Salamander', 'Magmin', 'Azer', 'Hell Hound'],
    enemyTypes: ['elemental', 'fiend', 'construct'],
  },
  {
    name: 'Ash Wastes',
    races: ['Magmin', 'Ash Zombie', 'Fire Snake', 'Salamander', 'Hellhound'],
    enemyTypes: ['elemental', 'undead', 'fiend'],
  },
  {
    name: 'Coastal',
    races: ['Merfolk', 'Pirate', 'Sahuagin', 'Sea Hag', 'Shark'],
    enemyTypes: ['humanoid', 'beast', 'monstrosity'],
  },
  {
    name: 'Deep Ocean',
    races: ['Aboleth', 'Merrow', 'Kraken Spawn', 'Deep One', 'Giant Shark'],
    enemyTypes: ['aberration', 'beast', 'monstrosity'],
  },
  {
    name: 'Sky',
    races: ['Aarakocra Raider', 'Storm Giant', 'Hippogriff', 'Cloud Giant', 'Air Elemental'],
    enemyTypes: ['giant', 'elemental', 'monstrosity'],
  },
  {
    name: 'Underdark',
    races: ['Drow', 'Mind Flayer', 'Duergar', 'Drider', 'Cloaker'],
    enemyTypes: ['humanoid', 'aberration', 'undead'],
  },
  {
    name: 'Feywild',
    races: ['Unseelie Knight', 'Pixie Swarm', 'Redcap', 'Green Hag', 'Quickling'],
    enemyTypes: ['fey', 'humanoid', 'beast'],
  },
  {
    name: 'Shadowfell',
    races: ['Shadow Demon', 'Shadar-kai', 'Wraith', 'Nighthaunt', 'Sorrowsworn'],
    enemyTypes: ['undead', 'fiend', 'aberration'],
  },
  {
    name: 'Astral Sea',
    races: ['Githyanki', 'Star Spawn', 'Astral Dreadnought', 'Psychic Elemental', 'Mind Flayer'],
    enemyTypes: ['aberration', 'humanoid', 'elemental'],
  },
];

/**
 * Descriptor biomes — specific location types that layer on top of a natural biome.
 */
export const DESCRIPTOR_BIOMES: BiomeData[] = [
  {
    name: 'Dungeon',
    races: ['Skeleton', 'Zombie', 'Goblin', 'Orc', 'Kobold'],
    enemyTypes: ['undead', 'humanoid', 'construct'],
    urban: true,
  },
  {
    name: 'Ruins',
    races: ['Cultist', 'Stone Golem', 'Ghost', 'Wraith', 'Gargoyle'],
    enemyTypes: ['humanoid', 'construct', 'undead'],
    urban: true,
  },
  {
    name: 'Crypt',
    races: ['Skeleton', 'Shadow', 'Ghoul', 'Vampire Spawn', 'Lich Apprentice'],
    enemyTypes: ['undead', 'construct', 'aberration'],
    urban: true,
  },
  {
    name: 'Graveyard',
    races: ['Zombie', 'Ghost', 'Ghoul', 'Specter', 'Bone Golem'],
    enemyTypes: ['undead', 'construct', 'fey'],
    urban: true,
  },
  {
    name: 'Ossuary',
    races: ['Skeleton Swarm', 'Banshee', 'Shadow', 'Bone Golem', 'Wight'],
    enemyTypes: ['undead', 'construct', 'aberration'],
    urban: true,
  },
  {
    name: 'Battlefield',
    races: ['Zombie Soldier', 'Ghost Warrior', 'Bone Knight', 'Revenant', 'Carrion Crow Swarm'],
    enemyTypes: ['undead', 'humanoid', 'fey'],
    urban: false,
  },
  {
    name: 'Cavern',
    races: ['Cave Troll', 'Darkmantle', 'Umber Hulk', 'Roper', 'Hook Horror'],
    enemyTypes: ['beast', 'aberration', 'monstrosity'],
    urban: false,
  },
  {
    name: 'Mine',
    races: ['Kobold', 'Cave Fisher', 'Galeb Duhr', 'Grimlock', 'Deep Gnome Renegade'],
    enemyTypes: ['humanoid', 'construct', 'beast'],
    urban: false,
  },
  {
    name: 'Sewers',
    races: ['Wererat', 'Otyugh', 'Goblin Gang', 'Carrion Crawler', 'Shadow'],
    enemyTypes: ['humanoid', 'aberration', 'beast'],
    urban: true,
  },
  {
    name: 'Warcamp',
    races: ['Hobgoblin', 'Orc Berserker', 'Ogre', 'Troll', 'Warchief'],
    enemyTypes: ['humanoid', 'giant', 'beast'],
    urban: false,
  },
  {
    name: 'Citadel',
    races: ['Guard Captain', 'Animated Armor', 'Gargoyle', 'Battle Mage', 'Ogre'],
    enemyTypes: ['humanoid', 'construct', 'giant'],
    urban: true,
  },
  {
    name: 'Tower',
    races: ['Arcane Golem', 'Imp', 'Gargoyle', 'Mage Guardian', 'Homunculus'],
    enemyTypes: ['construct', 'fiend', 'humanoid'],
    urban: true,
  },
  {
    name: 'Temple',
    races: ['Cultist', 'Animated Statue', 'Priest Wraith', 'Yuan-ti', 'Gargoyle'],
    enemyTypes: ['humanoid', 'undead', 'construct'],
    urban: true,
  },
  {
    name: 'Labyrinth',
    races: ['Minotaur', 'Gnoll', 'Gargoyle', 'Illusory Fiend', 'Stone Golem'],
    enemyTypes: ['humanoid', 'construct', 'fiend'],
    urban: true,
  },
  {
    name: 'Vault',
    races: ['Iron Golem', 'Shield Guardian', 'Mimic', 'Arcane Sentinel', 'Homunculus'],
    enemyTypes: ['construct', 'monstrosity', 'humanoid'],
    urban: true,
  },
  {
    name: 'Shipwreck',
    races: ['Drowned Sailor', 'Sea Zombie', 'Sahuagin', 'Water Weird', 'Kraken Spawn'],
    enemyTypes: ['undead', 'aberration', 'monstrosity'],
    urban: false,
  },
  {
    name: 'Lair',
    races: ['Kobold', 'Bandit Scout', 'Cultist', 'Ogre Guard', 'Goblin'],
    enemyTypes: ['humanoid', 'beast', 'monstrosity'],
    urban: false,
  },
  {
    name: 'Sanctum',
    races: ['Cult Fanatic', 'Shadow Demon', 'Invisible Stalker', 'Imp', 'Bound Mage'],
    enemyTypes: ['humanoid', 'fiend', 'aberration'],
    urban: true,
  },
  {
    name: 'Observatory',
    races: ['Githyanki', 'Star Spawn', 'Astral Stalker', 'Mage', 'Psychic Elemental'],
    enemyTypes: ['aberration', 'humanoid', 'elemental'],
    urban: true,
  },
  {
    name: 'Prison',
    races: ['Chain Devil', 'Revenant', 'Warden Undead', 'Bandit', 'Merciless Guard'],
    enemyTypes: ['fiend', 'undead', 'humanoid'],
    urban: true,
  },
  {
    name: 'Garden',
    races: ['Vine Blight', 'Green Hag', 'Dryad Gone Mad', 'Shambling Mound', 'Pixie Swarm'],
    enemyTypes: ['fey', 'beast', 'monstrosity'],
    urban: true,
  },
  {
    name: 'Arena',
    races: ['Gladiator', 'Beast Tamer', 'Ogre Fighter', 'Veteran Champion', 'Manticore'],
    enemyTypes: ['humanoid', 'beast', 'monstrosity'],
    urban: true,
  },
  {
    name: 'Library',
    races: ['Animated Book', 'Specter Scholar', 'Ink Golem', 'Cultist', 'Banshee Librarian'],
    enemyTypes: ['construct', 'undead', 'humanoid'],
    urban: true,
  },
  {
    name: 'Catacomb',
    races: ['Mummy', 'Skeletal Priest', 'Shadow', 'Ghast', 'Crypt Thing'],
    enemyTypes: ['undead', 'humanoid', 'aberration'],
    urban: true,
  },
  {
    name: 'Thieves\' Den',
    races: ['Assassin', 'Rogue Guild Master', 'Spy', 'Wererat', 'Bandit Captain'],
    enemyTypes: ['humanoid', 'beast', 'construct'],
    urban: true,
  },
];

/** Full biome pool — used for random quest generation. */
export const BIOMES: BiomeData[] = [...NATURAL_BIOMES, ...DESCRIPTOR_BIOMES];

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
