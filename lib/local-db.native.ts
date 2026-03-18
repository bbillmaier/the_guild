import * as SQLite from 'expo-sqlite';
import { STARTER_MUNDANE_ITEMS } from '@/lib/mundane-items-seed';
import { ROLEPLAY_SEEDS } from '@/lib/roleplay-seeds';
import { GROUP_GREETING_SEEDS } from '@/lib/group-greeting-seeds';
import { GUILD_EVENT_SEEDS } from '@/lib/guild-event-seeds';
import { ZONE_SEEDS } from '@/lib/zone-seeds';

export type GuildNote = {
  id: number;
  title: string;
  createdAt: string;
};

export type CharacterGender = 'male' | 'female' | 'unknown';

export type GuildCharacter = {
  uid: string;
  characterName: string;
  gender: CharacterGender;
  className: string;
  hp: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  physDesc: string[];
  metaDesc: string[];
  race: string;
  baseDescription: string;
  level: number;
  experience: number;
  avatarPath: string | null;
};

export type NewGuildCharacter = GuildCharacter;

export type GuildEnemy = {
  uid: string;
  characterName: string;
  gender: CharacterGender;
  className: string;
  hp: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  physDesc: string[];
  metaDesc: string[];
  race: string;
  baseDescription: string;
  level: number;
};

export type NewGuildEnemy = GuildEnemy;

export type ItemStat = 'hp' | 'ac' | 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

export type GuildItem = {
  uid: string;
  name: string;
  slot: string;
  description: string;
  type: string;
  stat: ItemStat;
  bonus: number;
  characterUid: string | null;
};

export type NewGuildItem = GuildItem;

export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'deadly';
export type QuestStatus = 'active' | 'completed' | 'failed';
export type RoomType = 'combat' | 'challenge' | 'boss';
export type RoomStatus = 'pending' | 'completed' | 'failed';
export type QuestChainStatus = 'active' | 'completed' | 'failed';

export type GuildQuest = {
  uid: string;
  title: string;
  difficulty: QuestDifficulty;
  biome: string;
  level: number;
  status: QuestStatus;
  createdAt: string;
  narrative: string;
  summary: string;
  chainUid: string | null;
  chainDepth: number | null;
};

export type QuestChain = {
  uid: string;
  name: string;
  premise: string;
  storySoFar: string;
  depth: number;      // which quest we are on (1-indexed)
  maxDepth: number;   // total quests in chain (2 or 3)
  status: QuestChainStatus;
  createdAt: string;
};

export type QuestRoom = {
  uid: string;
  questUid: string;
  roomNumber: number;
  roomType: RoomType;
  description: string;
  content: string;
  status: RoomStatus;
};

export type GuildMetaDesc = {
  uid: string;
  name: string;
  stat: 'intelligence' | 'wisdom' | 'charisma' | null;
  mode: number | null;
  description: string;
};

export type RoleplayCategory = 'general' | 'boss' | 'failure';

export type RoleplayPrompt = {
  uid: string;
  text: string;
  category: RoleplayCategory;
  active: boolean;
  relationshipDelta: number;
};

export type GreetingRoom = 'tavern' | 'barracks' | 'armory' | 'any';

export type CharacterGreeting = {
  uid: string;
  room: GreetingRoom;
  message: string;
};

export type KeywordMethod = 'llm' | 'auto';

export type QuestHistory = {
  uid: string;
  characterUid: string;
  questUid: string;
  questTitle: string;
  biome: string;
  difficulty: QuestDifficulty;
  level: number;
  outcome: 'success' | 'failure';
  partyUids: string[];
  partyNames: string[];
  summary: string;
  transcript: string;
  keywords: string[];
  gameDay: number;
  createdAt: string;
};

export type XpChange = {
  uid: string;
  applyXp: boolean;
  totalXp: number;
  newLevel: number;
  newMaxHp: number;
  restoreHp: number;
};

export type PendingQuestCompletion = {
  uid: string;
  questUid: string;
  questTitle: string;
  revealDay: number;
  outcome: 'success' | 'failure';
  partyUids: string[];
  partyNames: string[];
  xpChanges: XpChange[];
  gold: number;
  itemData: GuildItem[];
  relationshipDelta: number;
  createdAt: string;
};

export type Rumour = {
  uid: string;
  text: string;
  keywords: string[];
  gameDay: number;
  knownBy: string[];  // character UIDs who have heard this rumour
  used: boolean;      // true once a quest has been generated from it
  createdAt: string;
};

export type MundaneItemType = {
  id: number;
  name: string;
  slot: string;
  description: string;
  className: string | null;
  isStarter: boolean;
};

export type MundaneInventoryItem = {
  id: number;
  characterUid: string;
  itemTypeId: number;
  // Joined fields (populated by list queries)
  name?: string;
  slot?: string;
  description?: string;
  className?: string | null;
};

export type OutfitSet = {
  id: number;
  characterUid: string;
  name: string;
  context: string;
  imagePath: string | null;
};

export type OutfitItem = {
  id: number;
  outfitSetId: number;
  inventoryItemId: number;
  slot: string;
  // Joined fields
  name?: string;
  description?: string;
};

export type ChatHistory = {
  uid: string;
  characterUid: string;
  summary: string;
  transcript: string;
  keywords: string[];
  gameDay: number;
  createdAt: string;
};

export type CharacterOpinion = {
  uid: string;
  characterUid: string;
  targetUid: string;
  targetName: string;
  opinion: string;
  keywords: string[];
  gameDay: number;
  createdAt: string;
};

const databasePromise = SQLite.openDatabaseAsync('guild.db');
const latestMigrationVersion = 40;

async function getDatabase() {
  return databasePromise;
}

export async function initializeDatabase() {
  const database = await getDatabase();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      version INTEGER NOT NULL
    );
    INSERT OR IGNORE INTO schema_migrations (id, version) VALUES (1, 0);
  `);

  const migrationRow = await database.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_migrations WHERE id = 1;'
  );
  let currentVersion = migrationRow?.version ?? 0;

  if (currentVersion < 1) {
    await runMigrationV1(database);
    currentVersion = 1;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 2) {
    await runMigrationV2(database);
    currentVersion = 2;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 3) {
    await runMigrationV3(database);
    currentVersion = 3;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 4) {
    await runMigrationV4(database);
    currentVersion = 4;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 5) {
    await runMigrationV5(database);
    currentVersion = 5;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 6) {
    await runMigrationV6(database);
    currentVersion = 6;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 7) {
    await runMigrationV7(database);
    currentVersion = 7;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 8) {
    await runMigrationV8(database);
    currentVersion = 8;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 9) {
    await runMigrationV9(database);
    currentVersion = 9;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 10) {
    await runMigrationV10(database);
    currentVersion = 10;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 11) {
    await runMigrationV11(database);
    currentVersion = 11;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 12) {
    await runMigrationV12(database);
    currentVersion = 12;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 13) {
    await runMigrationV13(database);
    currentVersion = 13;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 14) {
    await runMigrationV14(database);
    currentVersion = 14;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 15) {
    await runMigrationV15(database);
    currentVersion = 15;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 16) {
    await runMigrationV16(database);
    currentVersion = 16;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 17) {
    await runMigrationV17(database);
    currentVersion = 17;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 18) {
    await runMigrationV18(database);
    currentVersion = 18;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 19) {
    await runMigrationV19(database);
    currentVersion = 19;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 20) {
    await runMigrationV20(database);
    currentVersion = 20;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 21) {
    await runMigrationV21(database);
    currentVersion = 21;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 22) {
    await runMigrationV22(database);
    currentVersion = 22;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 23) {
    await runMigrationV23(database);
    currentVersion = 23;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 24) {
    await runMigrationV24(database);
    currentVersion = 24;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 25) {
    await runMigrationV25(database);
    currentVersion = 25;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 26) {
    // V26: data-only fix (rename phys_desc entry) — no schema change needed.
    currentVersion = 26;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 27) {
    await runMigrationV27(database);
    currentVersion = 27;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 28) {
    await runMigrationV28(database);
    currentVersion = 28;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 29) {
    await runMigrationV29(database);
    currentVersion = 29;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 30) {
    await runMigrationV30(database);
    currentVersion = 30;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 31) {
    await runMigrationV31(database);
    currentVersion = 31;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 32) {
    await runMigrationV32(database);
    currentVersion = 32;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 33) {
    await runMigrationV33(database);
    currentVersion = 33;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 34) {
    await runMigrationV34(database);
    currentVersion = 34;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 35) {
    await runMigrationV35(database);
    currentVersion = 35;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 36) {
    await runMigrationV36(database);
    currentVersion = 36;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 37) {
    await runMigrationV37(database);
    currentVersion = 37;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 38) {
    await runMigrationV38(database);
    currentVersion = 38;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 39) {
    await runMigrationV39(database);
    currentVersion = 39;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion < 40) {
    await runMigrationV40(database);
    currentVersion = 40;
    await database.runAsync('UPDATE schema_migrations SET version = ? WHERE id = 1;', currentVersion);
  }

  if (currentVersion !== latestMigrationVersion) {
    throw new Error(
      `Database migration mismatch. Current: ${currentVersion}, expected: ${latestMigrationVersion}.`
    );
  }

  await ensureMetaDescSeedRows(database);

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
  `);
}

async function runMigrationV1(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS guild_notes (
      id INTEGER PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS characters (
      uid TEXT PRIMARY KEY NOT NULL,
      character_name TEXT NOT NULL,
      class TEXT NOT NULL,
      strength INTEGER NOT NULL DEFAULT 10,
      dexterity INTEGER NOT NULL DEFAULT 10,
      constitution INTEGER NOT NULL DEFAULT 10,
      intelligence INTEGER NOT NULL DEFAULT 10,
      wisdom INTEGER NOT NULL DEFAULT 10,
      charisma INTEGER NOT NULL DEFAULT 10,
      physDesc TEXT NOT NULL DEFAULT '[]',
      metaDesc TEXT NOT NULL DEFAULT '[]',
      race TEXT NOT NULL,
      baseDescription TEXT NOT NULL DEFAULT ''
    );
  `);
}

async function runMigrationV2(database: SQLite.SQLiteDatabase) {
  const columns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(characters);`);
  const hasGender = columns.some((column) => column.name === 'gender');
  if (hasGender) {
    return;
  }

  await database.execAsync(`ALTER TABLE characters ADD COLUMN gender TEXT NOT NULL DEFAULT 'unknown';`);
}

async function runMigrationV3(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS metaDesc (
      uid TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      stat TEXT,
      mode INTEGER,
      description TEXT NOT NULL DEFAULT ''
    );
  `);
}

async function runMigrationV4(database: SQLite.SQLiteDatabase) {
  await ensureMetaDescSeedRows(database);
}

async function runMigrationV5(database: SQLite.SQLiteDatabase) {
  const columns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(characters);`);
  const hasHp = columns.some((column) => column.name === 'hp');
  if (!hasHp) {
    await database.execAsync(`ALTER TABLE characters ADD COLUMN hp INTEGER NOT NULL DEFAULT 10;`);
  }

  const rows = await database.getAllAsync<{ uid: string; constitution: number }>(
    'SELECT uid, constitution FROM characters;'
  );
  for (const row of rows) {
    const hp = 10 + getConModifier(row.constitution);
    await database.runAsync('UPDATE characters SET hp = ? WHERE uid = ?;', hp, row.uid);
  }
}

async function runMigrationV13(database: SQLite.SQLiteDatabase) {
  const cols = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(quests);`);
  if (!cols.some((c) => c.name === 'summary')) {
    await database.execAsync(`ALTER TABLE quests ADD COLUMN summary TEXT NOT NULL DEFAULT '';`);
  }
}

async function runMigrationV14(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    INSERT OR IGNORE INTO settings (key, value) VALUES ('game_day', '1');
  `);
}

async function runMigrationV15(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS quest_history (
      uid TEXT PRIMARY KEY NOT NULL,
      character_uid TEXT NOT NULL,
      quest_uid TEXT NOT NULL,
      quest_title TEXT NOT NULL,
      biome TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      outcome TEXT NOT NULL DEFAULT 'success',
      party_uids TEXT NOT NULL DEFAULT '[]',
      party_names TEXT NOT NULL DEFAULT '[]',
      summary TEXT NOT NULL DEFAULT '',
      keywords TEXT NOT NULL DEFAULT '[]',
      game_day INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      uid TEXT PRIMARY KEY NOT NULL,
      character_uid TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      keywords TEXT NOT NULL DEFAULT '[]',
      game_day INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('keyword_method', 'llm');
  `);
}

async function runMigrationV16(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    ALTER TABLE chat_history ADD COLUMN transcript TEXT NOT NULL DEFAULT '';
  `);
}

async function runMigrationV17(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS character_greetings (
      uid TEXT PRIMARY KEY NOT NULL,
      room TEXT NOT NULL DEFAULT 'any',
      message TEXT NOT NULL DEFAULT ''
    );
  `);

  const seeds: { uid: string; room: GreetingRoom; message: string }[] = [
    { uid: 'greeting_tavern_1', room: 'tavern',   message: '{{char}} looks up from a half-empty mug and raises it in greeting.' },
    { uid: 'greeting_tavern_2', room: 'tavern',   message: '{{char}} is sharpening a blade at the bar. "Ah, Guild Master. What brings you over?"' },
    { uid: 'greeting_tavern_3', room: 'tavern',   message: '{{char}} waves you over from a corner table. "I was wondering when you\'d show up."' },
    { uid: 'greeting_barracks_1', room: 'barracks', message: '{{char}} sits on the edge of a cot, polishing armour. "Guild Master. Something on your mind?"' },
    { uid: 'greeting_barracks_2', room: 'barracks', message: '{{char}} is running through stretches near the weapon racks. "Oh — didn\'t hear you come in."' },
    { uid: 'greeting_armory_1',   room: 'armory',   message: '{{char}} is inspecting a rack of weapons and turns as you enter. "Looking for something specific?"' },
    { uid: 'greeting_armory_2',   room: 'armory',   message: '{{char}} holds a sword up to the light, examining the edge. "Guild Master. Checking the stock?"' },
    { uid: 'greeting_any_1',      room: 'any',      message: '{{char}} nods as you approach. "Guild Master."' },
    { uid: 'greeting_any_2',      room: 'any',      message: '{{char}} turns to face you. "I had a feeling you\'d seek me out."' },
  ];

  for (const seed of seeds) {
    await database.runAsync(
      `INSERT OR IGNORE INTO character_greetings (uid, room, message) VALUES (?, ?, ?);`,
      seed.uid, seed.room, seed.message
    );
  }
}

async function runMigrationV18(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    ALTER TABLE characters ADD COLUMN avatar_path TEXT;
  `);
}

async function runMigrationV19(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS mundane_item_types (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      slot        TEXT NOT NULL,
      description TEXT NOT NULL,
      class_name  TEXT,
      is_starter  INTEGER NOT NULL DEFAULT 0,
      UNIQUE(name, slot, class_name)
    );

    CREATE TABLE IF NOT EXISTS mundane_inventory (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      character_uid TEXT NOT NULL,
      item_type_id  INTEGER NOT NULL REFERENCES mundane_item_types(id)
    );

    CREATE TABLE IF NOT EXISTS outfit_sets (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      character_uid TEXT NOT NULL,
      name          TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outfit_items (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      outfit_set_id     INTEGER NOT NULL REFERENCES outfit_sets(id) ON DELETE CASCADE,
      inventory_item_id INTEGER NOT NULL REFERENCES mundane_inventory(id),
      slot              TEXT NOT NULL,
      UNIQUE(outfit_set_id, slot)
    );
  `);

  // Seed starter items
  for (const item of STARTER_MUNDANE_ITEMS) {
    await database.runAsync(
      `INSERT OR IGNORE INTO mundane_item_types (name, slot, description, class_name, is_starter)
       VALUES (?, ?, ?, ?, 1);`,
      item.name, item.slot, item.description, item.class_name,
    );
  }
}

async function runMigrationV20(database: SQLite.SQLiteDatabase) {
  await seedMundaneItems(database);
}

async function seedMundaneItems(database: SQLite.SQLiteDatabase): Promise<number> {
  let inserted = 0;
  for (const item of STARTER_MUNDANE_ITEMS) {
    try {
      const result = await database.runAsync(
        `INSERT OR IGNORE INTO mundane_item_types (name, slot, description, class_name, is_starter)
         VALUES (?, ?, ?, ?, 1);`,
        [item.name, item.slot, item.description, item.class_name],
      );
      inserted += result.changes;
    } catch (e) {
      console.error('[seed] Failed to insert item:', item.name, item.slot, item.class_name, e);
    }
  }
  console.log(`[seed] Inserted ${inserted} of ${STARTER_MUNDANE_ITEMS.length} mundane items.`);
  return inserted;
}

export async function seedStarterMundaneItems(): Promise<number> {
  const database = await getDatabase();
  return seedMundaneItems(database);
}

async function runMigrationV21(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS resources (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      resource TEXT NOT NULL UNIQUE,
      value    REAL NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO resources (resource, value) VALUES ('gold', 0);
  `);
}

async function runMigrationV22(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS guild_mundane_inventory (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type_id INTEGER NOT NULL REFERENCES mundane_item_types(id),
      purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

async function runMigrationV23(database: SQLite.SQLiteDatabase) {
  const cols = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(outfit_sets)`);
  if (!cols.some((c) => c.name === 'context'))
    await database.execAsync(`ALTER TABLE outfit_sets ADD COLUMN context TEXT NOT NULL DEFAULT 'any';`);
}

async function runMigrationV24(database: SQLite.SQLiteDatabase) {
  const cols = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(outfit_sets)`);
  if (!cols.some((c) => c.name === 'image_path'))
    await database.execAsync(`ALTER TABLE outfit_sets ADD COLUMN image_path TEXT;`);
}

async function runMigrationV25(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS phys_desc_pool (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      value    TEXT NOT NULL,
      UNIQUE(category, value)
    );
  `);
}

async function runMigrationV27(database: SQLite.SQLiteDatabase) {
  const gmCols = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(guild_mundane_inventory)`);
  if (!gmCols.some((c) => c.name === 'description_override'))
    await database.execAsync(`ALTER TABLE guild_mundane_inventory ADD COLUMN description_override TEXT;`);
  const mCols = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(mundane_inventory)`);
  if (!mCols.some((c) => c.name === 'description_override'))
    await database.execAsync(`ALTER TABLE mundane_inventory ADD COLUMN description_override TEXT;`);
}

async function runMigrationV28(database: SQLite.SQLiteDatabase) {
  const cols = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(roleplay_prompts)`);
  if (!cols.some((c) => c.name === 'relationship_delta'))
    await database.execAsync(`ALTER TABLE roleplay_prompts ADD COLUMN relationship_delta INTEGER NOT NULL DEFAULT 0;`);
  for (const s of ROLEPLAY_SEEDS) {
    await database.runAsync(
      `UPDATE roleplay_prompts SET text = ?, relationship_delta = ? WHERE uid = ?;`,
      s.text, s.relationshipDelta, s.uid,
    );
  }
}

async function runMigrationV29(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS character_relationships (
      char_a TEXT NOT NULL,
      char_b TEXT NOT NULL,
      score  INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (char_a, char_b)
    );
  `);
}

async function runMigrationV30(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS group_greetings (
      uid    TEXT PRIMARY KEY NOT NULL,
      text   TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
  `);
  for (const s of GROUP_GREETING_SEEDS) {
    await database.runAsync(
      `INSERT OR IGNORE INTO group_greetings (uid, text, active) VALUES (?, ?, 1);`,
      s.uid, s.text,
    );
  }
}

async function runMigrationV31(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS guild_event_seeds (
      uid                TEXT PRIMARY KEY NOT NULL,
      text               TEXT NOT NULL,
      active             INTEGER NOT NULL DEFAULT 1,
      relationship_delta INTEGER NOT NULL DEFAULT 0,
      use_common_quest   INTEGER NOT NULL DEFAULT 0
    );
  `);
  for (const s of GUILD_EVENT_SEEDS) {
    await database.runAsync(
      `INSERT OR IGNORE INTO guild_event_seeds (uid, text, active, relationship_delta, use_common_quest) VALUES (?, ?, 1, ?, ?);`,
      s.uid, s.text, s.relationshipDelta, s.useCommonQuest ? 1 : 0,
    );
  }
}

async function runMigrationV32(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS character_opinions (
      uid           TEXT PRIMARY KEY NOT NULL,
      character_uid TEXT NOT NULL,
      target_uid    TEXT NOT NULL,
      target_name   TEXT NOT NULL,
      opinion       TEXT NOT NULL DEFAULT '',
      keywords      TEXT NOT NULL DEFAULT '[]',
      game_day      INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function runMigrationV33(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    ALTER TABLE quest_history ADD COLUMN transcript TEXT NOT NULL DEFAULT '';
  `);
}

async function runMigrationV34(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS pending_quest_completions (
      uid                TEXT PRIMARY KEY NOT NULL,
      quest_uid          TEXT NOT NULL,
      quest_title        TEXT NOT NULL,
      reveal_day         INTEGER NOT NULL,
      outcome            TEXT NOT NULL,
      party_uids         TEXT NOT NULL DEFAULT '[]',
      party_names        TEXT NOT NULL DEFAULT '[]',
      xp_changes         TEXT NOT NULL DEFAULT '[]',
      gold               INTEGER NOT NULL DEFAULT 0,
      item_data          TEXT NOT NULL DEFAULT '[]',
      relationship_delta INTEGER NOT NULL DEFAULT 0,
      created_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function runMigrationV36(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS quest_chains (
      uid          TEXT PRIMARY KEY NOT NULL,
      name         TEXT NOT NULL,
      premise      TEXT NOT NULL,
      story_so_far TEXT NOT NULL DEFAULT '',
      depth        INTEGER NOT NULL DEFAULT 1,
      max_depth    INTEGER NOT NULL DEFAULT 3,
      status       TEXT NOT NULL DEFAULT 'active',
      created_at   TEXT NOT NULL
    );
  `);
  // SQLite allows adding nullable columns to existing tables
  try { await database.execAsync(`ALTER TABLE quests ADD COLUMN chain_uid TEXT;`); } catch { /* already exists */ }
  try { await database.execAsync(`ALTER TABLE quests ADD COLUMN chain_depth INTEGER;`); } catch { /* already exists */ }
}

async function runMigrationV35(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS rumours (
      uid        TEXT PRIMARY KEY NOT NULL,
      text       TEXT NOT NULL,
      keywords   TEXT NOT NULL DEFAULT '[]',
      game_day   INTEGER NOT NULL DEFAULT 1,
      known_by   TEXT NOT NULL DEFAULT '[]',
      used       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// ─── Resources ────────────────────────────────────────────────────────────────

export type GuildResource = {
  id: number;
  resource: string;
  value: number;
};

export async function listResources(): Promise<GuildResource[]> {
  const database = await getDatabase();
  return database.getAllAsync<GuildResource>(
    `SELECT id, resource, value FROM resources ORDER BY resource;`,
  );
}

export async function getResource(resource: string): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: number }>(
    `SELECT value FROM resources WHERE resource = ?;`, resource,
  );
  return row?.value ?? 0;
}

export async function setResource(resource: string, value: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO resources (resource, value) VALUES (?, ?)
     ON CONFLICT(resource) DO UPDATE SET value = excluded.value;`,
    [resource, value],
  );
}

export async function adjustResource(resource: string, amount: number): Promise<number> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO resources (resource, value) VALUES (?, ?)
     ON CONFLICT(resource) DO UPDATE SET value = value + excluded.value;`,
    [resource, amount],
  );
  const row = await database.getFirstAsync<{ value: number }>(
    `SELECT value FROM resources WHERE resource = ?;`, resource,
  );
  return row?.value ?? 0;
}

export async function getGameDay(): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'game_day';`
  );
  return row ? parseInt(row.value, 10) : 1;
}

export async function setGameDay(day: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO settings (key, value) VALUES ('game_day', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    String(Math.max(1, day))
  );
}

export async function advanceGameDay(days = 1): Promise<number> {
  const current = await getGameDay();
  const next = current + days;
  await setGameDay(next);
  return next;
}

async function runMigrationV12(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS roleplay_prompts (
      uid TEXT PRIMARY KEY NOT NULL,
      text TEXT NOT NULL,
      category TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
  `);

  const seeds = buildRoleplayPromptSeeds();
  for (const seed of seeds) {
    await database.runAsync(
      `INSERT OR IGNORE INTO roleplay_prompts (uid, text, category, active) VALUES (?, ?, ?, ?);`,
      seed.uid,
      seed.text,
      seed.category,
      1
    );
  }
}

async function runMigrationV11(database: SQLite.SQLiteDatabase) {
  const cols = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(quests);`);
  if (!cols.some((c) => c.name === 'narrative')) {
    await database.execAsync(`ALTER TABLE quests ADD COLUMN narrative TEXT NOT NULL DEFAULT '';`);
  }
}

async function runMigrationV10(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS quests (
      uid TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      biome TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quest_rooms (
      uid TEXT PRIMARY KEY NOT NULL,
      quest_uid TEXT NOT NULL,
      room_number INTEGER NOT NULL,
      room_type TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending'
    );
  `);
}

async function runMigrationV9(database: SQLite.SQLiteDatabase) {
  const columns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(items);`);
  if (!columns.some((c) => c.name === 'character_uid')) {
    await database.execAsync(`ALTER TABLE items ADD COLUMN character_uid TEXT;`);
  }
}

async function runMigrationV8(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS items (
      uid TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      slot TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL,
      stat TEXT NOT NULL,
      bonus INTEGER NOT NULL DEFAULT 0
    );
  `);
}

async function runMigrationV7(database: SQLite.SQLiteDatabase) {
  const charColumns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(characters);`);
  if (!charColumns.some((c) => c.name === 'level')) {
    await database.execAsync(`ALTER TABLE characters ADD COLUMN level INTEGER NOT NULL DEFAULT 1;`);
  }
  if (!charColumns.some((c) => c.name === 'experience')) {
    await database.execAsync(`ALTER TABLE characters ADD COLUMN experience INTEGER NOT NULL DEFAULT 0;`);
  }

  const enemyColumns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(enemies);`);
  if (!enemyColumns.some((c) => c.name === 'level')) {
    await database.execAsync(`ALTER TABLE enemies ADD COLUMN level INTEGER NOT NULL DEFAULT 1;`);
  }
}

async function runMigrationV6(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS enemies (
      uid TEXT PRIMARY KEY NOT NULL,
      character_name TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT 'unknown',
      class TEXT NOT NULL,
      hp INTEGER NOT NULL DEFAULT 10,
      strength INTEGER NOT NULL DEFAULT 10,
      dexterity INTEGER NOT NULL DEFAULT 10,
      constitution INTEGER NOT NULL DEFAULT 10,
      intelligence INTEGER NOT NULL DEFAULT 10,
      wisdom INTEGER NOT NULL DEFAULT 10,
      charisma INTEGER NOT NULL DEFAULT 10,
      physDesc TEXT NOT NULL DEFAULT '[]',
      metaDesc TEXT NOT NULL DEFAULT '[]',
      race TEXT NOT NULL,
      baseDescription TEXT NOT NULL DEFAULT ''
    );
  `);
}

async function ensureMetaDescSeedRows(database: SQLite.SQLiteDatabase) {
  const seedRows = buildMetaDescSeedRows(100);

  for (const row of seedRows) {
    await database.runAsync(
      `
        INSERT OR IGNORE INTO metaDesc (uid, name, stat, mode, description)
        VALUES (?, ?, ?, ?, ?);
      `,
      row.uid,
      row.name,
      row.stat,
      row.mode,
      row.description
    );
  }
}

export async function getKeywordMethod(): Promise<KeywordMethod> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'keyword_method';`
  );
  return (row?.value === 'auto' ? 'auto' : 'llm') as KeywordMethod;
}

export async function setKeywordMethod(method: KeywordMethod): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO settings (key, value) VALUES ('keyword_method', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    method
  );
}

export async function insertQuestHistory(row: QuestHistory): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO quest_history
      (uid, character_uid, quest_uid, quest_title, biome, difficulty, level, outcome, party_uids, party_names, summary, transcript, keywords, game_day, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    row.uid, row.characterUid, row.questUid, row.questTitle, row.biome,
    row.difficulty, row.level, row.outcome,
    JSON.stringify(row.partyUids), JSON.stringify(row.partyNames),
    row.summary, row.transcript ?? '', JSON.stringify(row.keywords), row.gameDay, row.createdAt
  );
}

export async function listQuestHistoryForCharacter(characterUid: string, limit = 10): Promise<QuestHistory[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    uid: string; character_uid: string; quest_uid: string; quest_title: string;
    biome: string; difficulty: string; level: number; outcome: string;
    party_uids: string; party_names: string; summary: string; transcript: string;
    keywords: string; game_day: number; created_at: string;
  }>(
    `SELECT * FROM quest_history WHERE character_uid = ? ORDER BY game_day DESC, created_at DESC LIMIT ?;`,
    characterUid, limit
  );
  return rows.map((r) => ({
    uid: r.uid, characterUid: r.character_uid, questUid: r.quest_uid,
    questTitle: r.quest_title, biome: r.biome,
    difficulty: r.difficulty as QuestDifficulty, level: r.level,
    outcome: r.outcome as 'success' | 'failure',
    partyUids: JSON.parse(r.party_uids) as string[],
    partyNames: JSON.parse(r.party_names) as string[],
    summary: r.summary, transcript: r.transcript ?? '',
    keywords: JSON.parse(r.keywords) as string[],
    gameDay: r.game_day, createdAt: r.created_at,
  }));
}

export async function insertChatHistory(row: ChatHistory): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO chat_history (uid, character_uid, summary, transcript, keywords, game_day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    row.uid, row.characterUid, row.summary, row.transcript, JSON.stringify(row.keywords), row.gameDay, row.createdAt
  );
}

export async function listChatHistoryForCharacter(characterUid: string, limit = 3): Promise<ChatHistory[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    uid: string; character_uid: string; summary: string; transcript: string;
    keywords: string; game_day: number; created_at: string;
  }>(
    `SELECT * FROM chat_history WHERE character_uid = ? ORDER BY game_day DESC, created_at DESC LIMIT ?;`,
    characterUid, limit
  );
  return rows.map((r) => ({
    uid: r.uid, characterUid: r.character_uid, summary: r.summary, transcript: r.transcript ?? '',
    keywords: JSON.parse(r.keywords) as string[],
    gameDay: r.game_day, createdAt: r.created_at,
  }));
}

export async function deleteQuestHistory(uid: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM quest_history WHERE uid = ?;', uid);
}

/** One entry per unique quest_uid, ordered newest first. */
export async function listRecentQuestHistory(limit = 10): Promise<QuestHistory[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    uid: string; character_uid: string; quest_uid: string; quest_title: string;
    biome: string; difficulty: string; level: number; outcome: string;
    party_uids: string; party_names: string; summary: string; transcript: string;
    keywords: string; game_day: number; created_at: string;
  }>(
    `SELECT * FROM quest_history qh
     WHERE qh.uid = (SELECT MIN(uid) FROM quest_history WHERE quest_uid = qh.quest_uid)
     ORDER BY game_day DESC, created_at DESC LIMIT ?;`,
    limit
  );
  return rows.map((r) => ({
    uid: r.uid, characterUid: r.character_uid, questUid: r.quest_uid,
    questTitle: r.quest_title, biome: r.biome,
    difficulty: r.difficulty as QuestDifficulty, level: r.level,
    outcome: r.outcome as 'success' | 'failure',
    partyUids: JSON.parse(r.party_uids) as string[],
    partyNames: JSON.parse(r.party_names) as string[],
    summary: r.summary, transcript: r.transcript ?? '',
    keywords: JSON.parse(r.keywords) as string[],
    gameDay: r.game_day, createdAt: r.created_at,
  }));
}

export async function getQuestHistoryByQuestUid(questUid: string): Promise<QuestHistory | null> {
  const database = await getDatabase();
  const r = await database.getFirstAsync<{
    uid: string; character_uid: string; quest_uid: string; quest_title: string;
    biome: string; difficulty: string; level: number; outcome: string;
    party_uids: string; party_names: string; summary: string; transcript: string;
    keywords: string; game_day: number; created_at: string;
  }>(`SELECT * FROM quest_history WHERE quest_uid = ? ORDER BY created_at ASC LIMIT 1;`, questUid);
  if (!r) return null;
  return {
    uid: r.uid, characterUid: r.character_uid, questUid: r.quest_uid,
    questTitle: r.quest_title, biome: r.biome,
    difficulty: r.difficulty as QuestDifficulty, level: r.level,
    outcome: r.outcome as 'success' | 'failure',
    partyUids: JSON.parse(r.party_uids) as string[],
    partyNames: JSON.parse(r.party_names) as string[],
    summary: r.summary, transcript: r.transcript ?? '',
    keywords: JSON.parse(r.keywords) as string[],
    gameDay: r.game_day, createdAt: r.created_at,
  };
}

// ─── Pending Quest Completions ────────────────────────────────────────────────

export async function insertPendingQuestCompletion(row: PendingQuestCompletion): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO pending_quest_completions
      (uid, quest_uid, quest_title, reveal_day, outcome, party_uids, party_names, xp_changes, gold, item_data, relationship_delta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    row.uid, row.questUid, row.questTitle, row.revealDay, row.outcome,
    JSON.stringify(row.partyUids), JSON.stringify(row.partyNames),
    JSON.stringify(row.xpChanges), row.gold,
    JSON.stringify(row.itemData), row.relationshipDelta, row.createdAt,
  );
}

export async function listPendingQuestCompletions(): Promise<PendingQuestCompletion[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    uid: string; quest_uid: string; quest_title: string; reveal_day: number;
    outcome: string; party_uids: string; party_names: string; xp_changes: string;
    gold: number; item_data: string; relationship_delta: number; created_at: string;
  }>(`SELECT * FROM pending_quest_completions ORDER BY reveal_day ASC;`);
  return rows.map((r) => ({
    uid: r.uid, questUid: r.quest_uid, questTitle: r.quest_title,
    revealDay: r.reveal_day, outcome: r.outcome as 'success' | 'failure',
    partyUids: JSON.parse(r.party_uids) as string[],
    partyNames: JSON.parse(r.party_names) as string[],
    xpChanges: JSON.parse(r.xp_changes) as XpChange[],
    gold: r.gold,
    itemData: JSON.parse(r.item_data) as GuildItem[],
    relationshipDelta: r.relationship_delta,
    createdAt: r.created_at,
  }));
}

export async function deletePendingQuestCompletion(uid: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM pending_quest_completions WHERE uid = ?;', uid);
}

// ─── Character Opinions ───────────────────────────────────────────────────────

export async function insertCharacterOpinion(row: CharacterOpinion): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO character_opinions
      (uid, character_uid, target_uid, target_name, opinion, keywords, game_day, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    row.uid, row.characterUid, row.targetUid, row.targetName,
    row.opinion, JSON.stringify(row.keywords), row.gameDay, row.createdAt,
  );
}

export async function listOpinionsForCharacter(characterUid: string): Promise<CharacterOpinion[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    uid: string; character_uid: string; target_uid: string; target_name: string;
    opinion: string; keywords: string; game_day: number; created_at: string;
  }>(
    `SELECT * FROM character_opinions WHERE character_uid = ? ORDER BY created_at DESC;`,
    characterUid,
  );
  return rows.map((r) => ({
    uid: r.uid, characterUid: r.character_uid, targetUid: r.target_uid,
    targetName: r.target_name, opinion: r.opinion,
    keywords: JSON.parse(r.keywords) as string[],
    gameDay: r.game_day, createdAt: r.created_at,
  }));
}

export async function getOpinion(characterUid: string, targetUid: string): Promise<CharacterOpinion | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    uid: string; character_uid: string; target_uid: string; target_name: string;
    opinion: string; keywords: string; game_day: number; created_at: string;
  }>(
    `SELECT * FROM character_opinions WHERE character_uid = ? AND target_uid = ? ORDER BY created_at DESC LIMIT 1;`,
    characterUid, targetUid,
  );
  if (!row) return null;
  return {
    uid: row.uid, characterUid: row.character_uid, targetUid: row.target_uid,
    targetName: row.target_name, opinion: row.opinion,
    keywords: JSON.parse(row.keywords) as string[],
    gameDay: row.game_day, createdAt: row.created_at,
  };
}

export async function deleteOpinion(uid: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM character_opinions WHERE uid = ?;', uid);
}

export async function deleteAllOpinions(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM character_opinions;');
}

export async function deleteChatHistory(uid: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM chat_history WHERE uid = ?;', uid);
}

export async function listGuildNotes() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: number;
    title: string;
    created_at: string;
  }>(`SELECT id, title, created_at FROM guild_notes ORDER BY id DESC;`);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
  }));
}

export async function addGuildNote(title: string) {
  const database = await getDatabase();
  await database.runAsync('INSERT INTO guild_notes (title) VALUES (?);', title);
}

export async function deleteGuildNote(id: number) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM guild_notes WHERE id = ?;', id);
}

export async function listGuildCharacters() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    uid: string;
    character_name: string;
    gender: string;
    class: string;
    hp: number;
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    physDesc: string;
    metaDesc: string;
    race: string;
    baseDescription: string;
    level: number;
    experience: number;
    avatar_path: string | null;
  }>(`
    SELECT
      uid,
      character_name,
      gender,
      class,
      hp,
      strength,
      dexterity,
      constitution,
      intelligence,
      wisdom,
      charisma,
      physDesc,
      metaDesc,
      race,
      baseDescription,
      level,
      experience,
      avatar_path
    FROM characters
    ORDER BY character_name ASC;
  `);

  return rows.map((row) => ({
    uid: row.uid,
    characterName: row.character_name,
    gender: parseGender(row.gender),
    className: row.class,
    hp: row.hp,
    strength: row.strength,
    dexterity: row.dexterity,
    constitution: row.constitution,
    intelligence: row.intelligence,
    wisdom: row.wisdom,
    charisma: row.charisma,
    physDesc: parseJsonArray(row.physDesc),
    metaDesc: parseJsonArray(row.metaDesc),
    race: row.race,
    baseDescription: row.baseDescription,
    level: row.level,
    experience: row.experience,
    avatarPath: row.avatar_path ?? null,
  }));
}

export async function insertGuildCharacter(character: NewGuildCharacter) {
  const database = await getDatabase();
  await database.runAsync(
    `
      INSERT INTO characters (
        uid,
        character_name,
        gender,
        class,
        hp,
        strength,
        dexterity,
        constitution,
        intelligence,
        wisdom,
        charisma,
        physDesc,
        metaDesc,
        race,
        baseDescription,
        level,
        experience
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    character.uid,
    character.characterName,
    character.gender,
    character.className,
    character.hp,
    character.strength,
    character.dexterity,
    character.constitution,
    character.intelligence,
    character.wisdom,
    character.charisma,
    JSON.stringify(character.physDesc),
    JSON.stringify(character.metaDesc),
    character.race,
    character.baseDescription,
    character.level,
    character.experience
  );

  await initCharacterMundaneItems(character.uid, character.className);
}

export async function clearGuildCharacters() {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM characters;');
}

export async function deleteGuildCharacter(uid: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM characters WHERE uid = ?;', uid);
}

export async function updateCharacterAvatarPath(uid: string, avatarPath: string | null): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE characters SET avatar_path = ? WHERE uid = ?;', avatarPath, uid);
}

export async function updateGuildCharacterHp(uid: string, hp: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE characters SET hp = ? WHERE uid = ?;', hp, uid);
}

export async function updateGuildCharacterXp(
  uid: string,
  experience: number,
  level: number,
  hp: number
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE characters SET experience = ?, level = ?, hp = ? WHERE uid = ?;',
    experience,
    level,
    hp,
    uid
  );
}

export async function listGuildEnemies() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    uid: string;
    character_name: string;
    gender: string;
    class: string;
    hp: number;
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    physDesc: string;
    metaDesc: string;
    race: string;
    baseDescription: string;
    level: number;
  }>(`
    SELECT
      uid,
      character_name,
      gender,
      class,
      hp,
      strength,
      dexterity,
      constitution,
      intelligence,
      wisdom,
      charisma,
      physDesc,
      metaDesc,
      race,
      baseDescription,
      level
    FROM enemies
    ORDER BY character_name ASC;
  `);

  return rows.map((row) => ({
    uid: row.uid,
    characterName: row.character_name,
    gender: parseGender(row.gender),
    className: row.class,
    hp: row.hp,
    strength: row.strength,
    dexterity: row.dexterity,
    constitution: row.constitution,
    intelligence: row.intelligence,
    wisdom: row.wisdom,
    charisma: row.charisma,
    physDesc: parseJsonArray(row.physDesc),
    metaDesc: parseJsonArray(row.metaDesc),
    race: row.race,
    baseDescription: row.baseDescription,
    level: row.level,
  }));
}

export async function insertGuildEnemy(enemy: NewGuildEnemy) {
  const database = await getDatabase();
  await database.runAsync(
    `
      INSERT INTO enemies (
        uid,
        character_name,
        gender,
        class,
        hp,
        strength,
        dexterity,
        constitution,
        intelligence,
        wisdom,
        charisma,
        physDesc,
        metaDesc,
        race,
        baseDescription,
        level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    enemy.uid,
    enemy.characterName,
    enemy.gender,
    enemy.className,
    enemy.hp,
    enemy.strength,
    enemy.dexterity,
    enemy.constitution,
    enemy.intelligence,
    enemy.wisdom,
    enemy.charisma,
    JSON.stringify(enemy.physDesc),
    JSON.stringify(enemy.metaDesc),
    enemy.race,
    enemy.baseDescription,
    enemy.level
  );
}

export async function clearGuildEnemies() {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM enemies;');
}

export async function listGuildItems() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    uid: string;
    name: string;
    slot: string;
    description: string;
    type: string;
    stat: string;
    bonus: number;
    character_uid: string | null;
  }>(`SELECT uid, name, slot, description, type, stat, bonus, character_uid FROM items ORDER BY name ASC;`);

  return rows.map((row) => ({
    uid: row.uid,
    name: row.name,
    slot: row.slot,
    description: row.description,
    type: row.type,
    stat: parseItemStat(row.stat),
    bonus: row.bonus,
    characterUid: row.character_uid ?? null,
  }));
}

export async function insertGuildItem(item: NewGuildItem) {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO items (uid, name, slot, description, type, stat, bonus, character_uid) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    item.uid,
    item.name,
    item.slot,
    item.description,
    item.type,
    item.stat,
    item.bonus,
    item.characterUid ?? null
  );
}

export async function deleteGuildItem(uid: string) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM items WHERE uid = ?;', uid);
}

export async function clearGuildItems() {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM items;');
}

export async function listCharacterItems(characterUid: string) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    uid: string;
    name: string;
    slot: string;
    description: string;
    type: string;
    stat: string;
    bonus: number;
    character_uid: string | null;
  }>(`SELECT uid, name, slot, description, type, stat, bonus, character_uid FROM items WHERE character_uid = ? ORDER BY name ASC;`, characterUid);

  return rows.map((row) => ({
    uid: row.uid,
    name: row.name,
    slot: row.slot,
    description: row.description,
    type: row.type,
    stat: parseItemStat(row.stat),
    bonus: row.bonus,
    characterUid: row.character_uid ?? null,
  }));
}

export async function assignItemToCharacter(itemUid: string, characterUid: string): Promise<void> {
  const database = await getDatabase();

  const item = await database.getFirstAsync<{ slot: string }>(
    `SELECT slot FROM items WHERE uid = ?;`,
    itemUid
  );
  if (!item) throw new Error('Item not found.');

  const conflict = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM items WHERE character_uid = ? AND slot = ? AND uid != ?;`,
    characterUid,
    item.slot,
    itemUid
  );
  if ((conflict?.count ?? 0) > 0) {
    throw new Error(`Character already has an item equipped in the ${item.slot} slot.`);
  }

  const equipped = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM items WHERE character_uid = ?;`,
    characterUid
  );
  if ((equipped?.count ?? 0) >= 3) {
    throw new Error('Character already has 3 items equipped.');
  }

  await database.runAsync(
    `UPDATE items SET character_uid = ? WHERE uid = ?;`,
    characterUid,
    itemUid
  );
}

export async function unassignItem(itemUid: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`UPDATE items SET character_uid = NULL WHERE uid = ?;`, itemUid);
}

export async function insertGuildQuest(quest: GuildQuest): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO quests (uid, title, difficulty, biome, level, status, created_at, narrative, summary, chain_uid, chain_depth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    quest.uid, quest.title, quest.difficulty, quest.biome, quest.level, quest.status,
    quest.createdAt, quest.narrative ?? '', quest.summary ?? '',
    quest.chainUid ?? null, quest.chainDepth ?? null,
  );
}

export async function deleteGuildQuest(uid: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM quests WHERE uid = ?;`, uid);
  await database.runAsync(`DELETE FROM quest_rooms WHERE quest_uid = ?;`, uid);
}

export async function clearGuildQuests(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM quests;`);
  await database.runAsync(`DELETE FROM quest_rooms;`);
}

type QuestRowFull = { uid: string; title: string; difficulty: string; biome: string; level: number; status: string; created_at: string; narrative: string; summary: string; chain_uid: string | null; chain_depth: number | null };
function mapQuestRowFull(row: QuestRowFull): GuildQuest {
  return {
    uid: row.uid, title: row.title,
    difficulty: parseQuestDifficulty(row.difficulty),
    biome: row.biome, level: row.level,
    status: parseQuestStatus(row.status),
    createdAt: row.created_at,
    narrative: row.narrative ?? '', summary: row.summary ?? '',
    chainUid: row.chain_uid ?? null, chainDepth: row.chain_depth ?? null,
  };
}

export async function listGuildQuests(): Promise<GuildQuest[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<QuestRowFull>(
    `SELECT uid, title, difficulty, biome, level, status, created_at, narrative, summary, chain_uid, chain_depth FROM quests ORDER BY created_at DESC;`
  );
  return rows.map(mapQuestRowFull);
}

export async function getGuildQuestByUid(uid: string): Promise<GuildQuest | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<QuestRowFull>(
    `SELECT uid, title, difficulty, biome, level, status, created_at, narrative, summary, chain_uid, chain_depth FROM quests WHERE uid = ?;`, uid
  );
  return row ? mapQuestRowFull(row) : null;
}

export async function insertQuestRoom(room: QuestRoom): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO quest_rooms (uid, quest_uid, room_number, room_type, description, content, status) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    room.uid,
    room.questUid,
    room.roomNumber,
    room.roomType,
    room.description,
    room.content,
    room.status
  );
}

export async function listQuestRooms(questUid: string): Promise<QuestRoom[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    uid: string;
    quest_uid: string;
    room_number: number;
    room_type: string;
    description: string;
    content: string;
    status: string;
  }>(
    `SELECT uid, quest_uid, room_number, room_type, description, content, status FROM quest_rooms WHERE quest_uid = ? ORDER BY room_number ASC;`,
    questUid
  );
  return rows.map((row) => ({
    uid: row.uid,
    questUid: row.quest_uid,
    roomNumber: row.room_number,
    roomType: parseRoomType(row.room_type),
    description: row.description,
    content: row.content,
    status: parseRoomStatus(row.status),
  }));
}

export async function listGuildMetaDescriptions() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    uid: string;
    name: string;
    stat: string | null;
    mode: number | null;
    description: string;
  }>(`
    SELECT uid, name, stat, mode, description
    FROM metaDesc
    ORDER BY uid ASC;
  `);

  return rows.map((row) => ({
    uid: row.uid,
    name: row.name,
    stat: parseMetaStat(row.stat),
    mode: row.mode,
    description: row.description,
  }));
}

export async function seedGuildMetaDescriptions() {
  const database = await getDatabase();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS metaDesc (
      uid TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      stat TEXT,
      mode INTEGER,
      description TEXT NOT NULL DEFAULT ''
    );
  `);
  await ensureMetaDescSeedRows(database);
}

export async function clearGuildMetaDescriptions() {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM metaDesc;');
}

export async function updateQuestStatus(uid: string, status: QuestStatus): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`UPDATE quests SET status = ? WHERE uid = ?;`, status, uid);
}

export async function updateQuestNarrative(uid: string, narrative: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`UPDATE quests SET narrative = ? WHERE uid = ?;`, narrative, uid);
}

export async function updateQuestRoomStatus(uid: string, status: RoomStatus): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`UPDATE quest_rooms SET status = ? WHERE uid = ?;`, status, uid);
}

export async function listRoleplayPrompts(): Promise<RoleplayPrompt[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    uid: string; text: string; category: string; active: number; relationship_delta: number;
  }>(`SELECT uid, text, category, active, relationship_delta FROM roleplay_prompts ORDER BY category ASC, uid ASC;`);
  return rows.map((row) => ({
    uid: row.uid, text: row.text, category: parseRoleplayCategory(row.category),
    active: row.active === 1, relationshipDelta: row.relationship_delta ?? 0,
  }));
}

export async function listActiveRoleplayPrompts(category: RoleplayCategory): Promise<RoleplayPrompt[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    uid: string; text: string; category: string; active: number; relationship_delta: number;
  }>(
    `SELECT uid, text, category, active, relationship_delta FROM roleplay_prompts WHERE category = ? AND active = 1 ORDER BY uid ASC;`,
    category
  );
  return rows.map((row) => ({
    uid: row.uid, text: row.text, category: parseRoleplayCategory(row.category),
    active: row.active === 1, relationshipDelta: row.relationship_delta ?? 0,
  }));
}

export async function insertRoleplayPrompt(prompt: RoleplayPrompt): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO roleplay_prompts (uid, text, category, active, relationship_delta) VALUES (?, ?, ?, ?, ?);`,
    prompt.uid, prompt.text, prompt.category, prompt.active ? 1 : 0, prompt.relationshipDelta,
  );
}

export async function updateRoleplayPromptActive(uid: string, active: boolean): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`UPDATE roleplay_prompts SET active = ? WHERE uid = ?;`, active ? 1 : 0, uid);
}

export async function updateRoleplayPromptDelta(uid: string, delta: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`UPDATE roleplay_prompts SET relationship_delta = ? WHERE uid = ?;`, delta, uid);
}

export async function deleteRoleplayPrompt(uid: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM roleplay_prompts WHERE uid = ?;`, uid);
}

// ─── Character Greetings ──────────────────────────────────────────────────────

export async function listCharacterGreetings(): Promise<CharacterGreeting[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ uid: string; room: string; message: string }>(
    `SELECT uid, room, message FROM character_greetings ORDER BY room ASC, uid ASC;`
  );
  return rows.map((r) => ({ uid: r.uid, room: r.room as GreetingRoom, message: r.message }));
}

export async function insertCharacterGreeting(greeting: CharacterGreeting): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO character_greetings (uid, room, message) VALUES (?, ?, ?);`,
    greeting.uid, greeting.room, greeting.message
  );
}

export async function deleteCharacterGreeting(uid: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM character_greetings WHERE uid = ?;`, uid);
}

export async function getRandomGreetingForRoom(room: GreetingRoom): Promise<CharacterGreeting | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ uid: string; room: string; message: string }>(
    `SELECT uid, room, message FROM character_greetings WHERE room = ? OR room = 'any' ORDER BY RANDOM() LIMIT 1;`,
    room
  );
  return row ? { uid: row.uid, room: row.room as GreetingRoom, message: row.message } : null;
}

function parseQuestDifficulty(value: string): QuestDifficulty {
  if (value === 'easy' || value === 'medium' || value === 'hard' || value === 'deadly') return value;
  return 'easy';
}

function parseQuestStatus(value: string): QuestStatus {
  if (value === 'active' || value === 'completed' || value === 'failed') return value;
  return 'active';
}

function parseRoomType(value: string): RoomType {
  if (value === 'combat' || value === 'challenge' || value === 'boss') return value;
  return 'combat';
}

function parseRoomStatus(value: string): RoomStatus {
  if (value === 'pending' || value === 'completed' || value === 'failed') return value;
  return 'pending';
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseGender(value: string): CharacterGender {
  if (value === 'male' || value === 'female') {
    return value;
  }

  return 'unknown';
}

function parseItemStat(value: string): ItemStat {
  const valid: ItemStat[] = ['hp', 'ac', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  return valid.includes(value as ItemStat) ? (value as ItemStat) : 'strength';
}

function parseMetaStat(value: string | null): GuildMetaDesc['stat'] {
  if (value === 'intelligence' || value === 'wisdom' || value === 'charisma') {
    return value;
  }

  return null;
}

function getConModifier(constitution: number) {
  return Math.floor((constitution - 10) / 2);
}

function parseRoleplayCategory(value: string): RoleplayCategory {
  if (value === 'general' || value === 'boss' || value === 'failure') return value;
  return 'general';
}

type RoleplayPromptSeedRow = { uid: string; text: string; category: RoleplayCategory };

function buildRoleplayPromptSeeds(): RoleplayPromptSeedRow[] {
  const general: string[] = [
    "The party pauses to catch their breath. One character tends to another's wounds while they talk.",
    'A disagreement breaks out between party members about the best way to handle what lies ahead.',
    'One character cracks a dark joke to break the tension. The others react in their own ways.',
    'A quieter member of the party opens up, sharing something about why they took this quest.',
    'Two characters reflect on a past adventure that feels relevant to their current situation.',
    'The party notices something unsettling in their surroundings and reacts with uneasy curiosity.',
    'One character checks on another who seems shaken after the last encounter.',
    'The group shares a brief moment of levity — a laugh, a shared memory, a small kindness.',
    'A character voices doubt about whether they can succeed. The others respond honestly.',
    "The party quietly debates what they'll do with the reward when this is all over.",
  ];
  const boss: string[] = [
    'Standing at the threshold of the final chamber, the party shares words before the last battle.',
    'The party can sense something powerful nearby. They gather their courage and speak plainly.',
    'A moment of honesty before the final door — each character acknowledges the danger ahead.',
    "One character gives a brief rallying speech. It's imperfect, but it's enough.",
    'The party takes a breath and looks at one another, no words needed, just a shared nod.',
  ];
  const failure: string[] = [
    'Battered and breathless, the adventurers regroup and try to understand where it all went wrong.',
    'Nursing their wounds, the party speaks honestly about the moment the tide turned against them.',
    'In the bitter aftermath of defeat, the adventurers reflect on what they underestimated.',
    'The party retreats in silence until someone finally breaks it — asking the question they\'re all thinking.',
    'Humbled and bruised, the adventurers pick through what happened and what they would do differently.',
  ];

  const seeds: RoleplayPromptSeedRow[] = [];
  general.forEach((text, i) => seeds.push({ uid: `roleplay_general_${String(i + 1).padStart(2, '0')}`, text, category: 'general' }));
  boss.forEach((text, i) => seeds.push({ uid: `roleplay_boss_${String(i + 1).padStart(2, '0')}`, text, category: 'boss' }));
  failure.forEach((text, i) => seeds.push({ uid: `roleplay_failure_${String(i + 1).padStart(2, '0')}`, text, category: 'failure' }));
  return seeds;
}

type MetaDescSeedRow = {
  uid: string;
  name: string;
  stat: 'intelligence' | 'wisdom' | 'charisma' | null;
  mode: number | null;
  description: string;
};

function buildMetaDescSeedRows(count: number) {
  const adjectives = [
    'Analytical',
    'Brooding',
    'Calm',
    'Careful',
    'Compulsive',
    'Curious',
    'Cynical',
    'Decisive',
    'Distrustful',
    'Dreamy',
    'Empathetic',
    'Focused',
    'Idealistic',
    'Impulsive',
    'Intense',
    'Introspective',
    'Meticulous',
    'Methodical',
    'Paranoid',
    'Patient',
  ];
  const domains = [
    'Planner',
    'Visionary',
    'Observer',
    'Negotiator',
    'Scholar',
    'Mystic',
    'Tactician',
    'Mediator',
    'Rhetorician',
    'Investigator',
  ];
  const behaviorFragments = [
    'questions assumptions before acting',
    'keeps a rigid internal code',
    'reads motives behind every word',
    'seeks patterns in apparent chaos',
    'weighs options before committing',
    'overthinks simple social exchanges',
    'defuses tension with measured calm',
    'pushes conversations toward truth',
    'guards private thoughts carefully',
    'reframes setbacks as strategy',
  ];
  const statCycle: Array<'intelligence' | 'wisdom' | 'charisma' | null> = [
    'intelligence',
    'wisdom',
    'charisma',
    null,
  ];
  const modeCycle: Array<number | null> = [1, -1, null, null];

  const rows: MetaDescSeedRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const adjective = adjectives[i % adjectives.length];
    const domain = domains[Math.floor(i / adjectives.length) % domains.length];
    const fragment = behaviorFragments[i % behaviorFragments.length];

    rows.push({
      uid: `meta_seed_${String(i + 1).padStart(3, '0')}`,
      name: `${adjective} ${domain}`,
      stat: statCycle[i % statCycle.length],
      mode: modeCycle[i % modeCycle.length],
      description: `${adjective.toLowerCase()} ${domain.toLowerCase()} who ${fragment}.`,
    });
  }

  return rows;
}

// ─── Mundane Item Types ────────────────────────────────────────────────────────

export async function listMundaneItemTypes(): Promise<MundaneItemType[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: number; name: string; slot: string; description: string;
    class_name: string | null; is_starter: number;
  }>(`SELECT * FROM mundane_item_types ORDER BY class_name, slot, name;`);
  return rows.map((r) => ({
    id: r.id, name: r.name, slot: r.slot, description: r.description,
    className: r.class_name, isStarter: r.is_starter === 1,
  }));
}

export async function listMundaneItemTypesByClass(className: string): Promise<MundaneItemType[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: number; name: string; slot: string; description: string;
    class_name: string | null; is_starter: number;
  }>(
    `SELECT * FROM mundane_item_types WHERE class_name = ? OR class_name IS NULL ORDER BY slot, name;`,
    className,
  );
  return rows.map((r) => ({
    id: r.id, name: r.name, slot: r.slot, description: r.description,
    className: r.class_name, isStarter: r.is_starter === 1,
  }));
}

export async function insertMundaneItemType(
  name: string, slot: string, description: string, className: string | null,
): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO mundane_item_types (name, slot, description, class_name, is_starter) VALUES (?, ?, ?, ?, 0);`,
    name, slot, description, className,
  );
  return result.lastInsertRowId;
}

export async function updateMundaneItemType(
  id: number, name: string, slot: string, description: string, className: string | null,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE mundane_item_types SET name = ?, slot = ?, description = ?, class_name = ? WHERE id = ? AND is_starter = 0;`,
    name, slot, description, className, id,
  );
}

export async function deleteMundaneItemType(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM mundane_item_types WHERE id = ? AND is_starter = 0;`, id);
}

// ─── Mundane Inventory ─────────────────────────────────────────────────────────

export async function listMundaneInventory(characterUid: string): Promise<MundaneInventoryItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: number; character_uid: string; item_type_id: number;
    name: string; slot: string; description: string; class_name: string | null;
  }>(
    `SELECT mi.id, mi.character_uid, mi.item_type_id,
            mt.name, mt.slot, mt.description, mt.class_name
     FROM mundane_inventory mi
     JOIN mundane_item_types mt ON mt.id = mi.item_type_id
     WHERE mi.character_uid = ?
     ORDER BY mt.slot, mt.name;`,
    characterUid,
  );
  return rows.map((r) => ({
    id: r.id, characterUid: r.character_uid, itemTypeId: r.item_type_id,
    name: r.name, slot: r.slot, description: r.description, className: r.class_name,
  }));
}

export async function addToMundaneInventory(characterUid: string, itemTypeId: number): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO mundane_inventory (character_uid, item_type_id) VALUES (?, ?);`,
    characterUid, itemTypeId,
  );
  return result.lastInsertRowId;
}

export async function removeMundaneInventoryItem(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM mundane_inventory WHERE id = ?;`, id);
}

// ─── Outfit Sets ───────────────────────────────────────────────────────────────

export async function listOutfitSets(characterUid: string): Promise<OutfitSet[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ id: number; character_uid: string; name: string; context: string; image_path: string | null }>(
    `SELECT * FROM outfit_sets WHERE character_uid = ? ORDER BY name;`,
    characterUid,
  );
  return rows.map((r) => ({ id: r.id, characterUid: r.character_uid, name: r.name, context: r.context ?? 'any', imagePath: r.image_path ?? null }));
}

export async function insertOutfitSet(characterUid: string, name: string, context = 'any'): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO outfit_sets (character_uid, name, context) VALUES (?, ?, ?);`,
    characterUid, name, context,
  );
  return result.lastInsertRowId;
}

export async function renameOutfitSet(id: number, name: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`UPDATE outfit_sets SET name = ? WHERE id = ?;`, name, id);
}

export async function deleteOutfitSet(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM outfit_sets WHERE id = ?;`, id);
}

/**
 * Deterministically pick an outfit for a character on a given game day.
 * Returns null if the character has no outfits.
 */
export async function getOutfitForDay(characterUid: string, gameDay: number): Promise<OutfitSet | null> {
  const outfits = await listOutfitSets(characterUid);
  if (outfits.length === 0) return null;
  // Simple deterministic hash: (gameDay + uid char sum) % count
  const uidSum = characterUid.split('').reduce((n, c) => n + c.charCodeAt(0), 0);
  return outfits[(gameDay + uidSum) % outfits.length];
}

// ─── Outfit Items ──────────────────────────────────────────────────────────────

export async function listOutfitItems(outfitSetId: number): Promise<OutfitItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: number; outfit_set_id: number; inventory_item_id: number;
    slot: string; name: string; description: string;
  }>(
    `SELECT oi.id, oi.outfit_set_id, oi.inventory_item_id, oi.slot,
            mt.name, mt.description
     FROM outfit_items oi
     JOIN mundane_inventory mi ON mi.id = oi.inventory_item_id
     JOIN mundane_item_types mt ON mt.id = mi.item_type_id
     WHERE oi.outfit_set_id = ?
     ORDER BY oi.slot;`,
    outfitSetId,
  );
  return rows.map((r) => ({
    id: r.id, outfitSetId: r.outfit_set_id, inventoryItemId: r.inventory_item_id,
    slot: r.slot, name: r.name, description: r.description,
  }));
}

/** Equip an inventory item into a slot on an outfit (replaces any existing item in that slot). */
export async function setOutfitItem(
  outfitSetId: number, inventoryItemId: number, slot: string,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO outfit_items (outfit_set_id, inventory_item_id, slot) VALUES (?, ?, ?)
     ON CONFLICT(outfit_set_id, slot) DO UPDATE SET inventory_item_id = excluded.inventory_item_id;`,
    outfitSetId, inventoryItemId, slot,
  );
}

export async function removeOutfitItem(outfitSetId: number, slot: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `DELETE FROM outfit_items WHERE outfit_set_id = ? AND slot = ?;`,
    outfitSetId, slot,
  );
}

/**
 * Initialise a character's mundane wardrobe on creation:
 * - Grants one starter item per slot for their class
 * - Creates a "Default" outfit with all of them equipped
 */
export async function initCharacterMundaneItems(characterUid: string, className: string): Promise<void> {
  const database = await getDatabase();

  // Fetch starter types for this class
  const types = await database.getAllAsync<{ id: number; slot: string }>(
    `SELECT id, slot FROM mundane_item_types WHERE class_name = ? AND is_starter = 1;`,
    className,
  );
  if (types.length === 0) return;

  // Insert inventory items and collect ids per slot
  const slotToInventoryId: Record<string, number> = {};
  for (const t of types) {
    const result = await database.runAsync(
      `INSERT INTO mundane_inventory (character_uid, item_type_id) VALUES (?, ?);`,
      characterUid, t.id,
    );
    slotToInventoryId[t.slot] = result.lastInsertRowId;
  }

  // Create default outfit
  const outfitResult = await database.runAsync(
    `INSERT INTO outfit_sets (character_uid, name) VALUES (?, 'Default');`,
    characterUid,
  );
  const outfitId = outfitResult.lastInsertRowId;

  // Equip all items into the default outfit
  for (const [slot, inventoryId] of Object.entries(slotToInventoryId)) {
    await database.runAsync(
      `INSERT INTO outfit_items (outfit_set_id, inventory_item_id, slot) VALUES (?, ?, ?);`,
      outfitId, inventoryId, slot,
    );
  }
}

// ─── Stubs for Electron-only features (not used on native) ───────────────────

export type GuildShopInventoryItem = {
  id: number;
  itemTypeId: number;
  name: string;
  slot: string;
  description: string;
  className: string | null;
  purchasedAt: string;
};

export async function listGuildShopInventory(): Promise<GuildShopInventoryItem[]> { return []; }
export async function addToGuildShopInventory(_itemTypeId: number): Promise<void> {}
export async function removeFromGuildShopInventory(_id: number): Promise<void> {}

export async function updateOutfitSetDetails(_id: number, _name: string, _context: string): Promise<void> {}
export async function updateOutfitImage(_id: number, _imagePath: string): Promise<void> {}
export async function getActiveOutfitForRoom(_characterUid: string, _room: string, _gameDay: number): Promise<OutfitSet | null> { return null; }
export async function resolveEffectiveAvatarPath(character: GuildCharacter, _room: string, _gameDay: number): Promise<string | null> { return character.avatarPath ?? null; }
export async function assignGuildItemToCharacter(_guildInvId: number, _characterUid: string): Promise<void> {}
export async function returnItemToGuildPool(_mundaneInvId: number): Promise<void> {}

export type PhysDescItem = { id: number; category: string; value: string };
export async function listPhysDescByCategory(_category: string): Promise<PhysDescItem[]> { return []; }
export async function listPhysDescAll(): Promise<PhysDescItem[]> { return []; }
export async function updateCharacterPhysDesc(_uid: string, _physDesc: string[]): Promise<void> {}

// ─── Character Relationships ──────────────────────────────────────────────────

export type CharacterRelationship = {
  charA: string;
  charB: string;
  score: number;
};

export const RELATIONSHIP_LABELS: { min: number; max: number; label: string; color: string }[] = [
  { min: -Infinity, max: -60, label: 'Bitter enemies',   color: '#8B0000' },
  { min: -59,       max: -30, label: 'Strong dislike',   color: '#C0392B' },
  { min: -29,       max: -10, label: 'Cold and distant', color: '#E67E22' },
  { min:  -9,       max:   9, label: 'Neutral',          color: '#9BA1A6' },
  { min:  10,       max:  29, label: 'Cordial',          color: '#27AE60' },
  { min:  30,       max:  59, label: 'Friendly',         color: '#1E8449' },
  { min:  60, max: Infinity,  label: 'Close bonds',      color: '#0a7ea4' },
];

export function getRelationshipLabel(score: number): { label: string; color: string } {
  for (const tier of RELATIONSHIP_LABELS) {
    if (score >= tier.min && score <= tier.max) return { label: tier.label, color: tier.color };
  }
  return { label: 'Neutral', color: '#9BA1A6' };
}

function relKey(uidA: string, uidB: string): [string, string] {
  return uidA < uidB ? [uidA, uidB] : [uidB, uidA];
}

export async function getRelationship(uidA: string, uidB: string): Promise<number> {
  const [a, b] = relKey(uidA, uidB);
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ score: number }>(
    `SELECT score FROM character_relationships WHERE char_a = ? AND char_b = ?;`, a, b
  );
  return row?.score ?? 0;
}

export async function adjustRelationship(uidA: string, uidB: string, delta: number): Promise<void> {
  if (delta === 0) return;
  const [a, b] = relKey(uidA, uidB);
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO character_relationships (char_a, char_b, score) VALUES (?, ?, ?)
     ON CONFLICT(char_a, char_b) DO UPDATE SET score = score + excluded.score;`,
    a, b, delta,
  );
}

export async function setRelationshipScore(uidA: string, uidB: string, score: number): Promise<void> {
  const [a, b] = relKey(uidA, uidB);
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO character_relationships (char_a, char_b, score) VALUES (?, ?, ?)
     ON CONFLICT(char_a, char_b) DO UPDATE SET score = excluded.score;`,
    a, b, score,
  );
}

export async function listRelationshipsForCharacter(uid: string): Promise<CharacterRelationship[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ char_a: string; char_b: string; score: number }>(
    `SELECT char_a, char_b, score FROM character_relationships WHERE char_a = ? OR char_b = ? ORDER BY score DESC;`,
    uid, uid,
  );
  return rows.map((r) => ({ charA: r.char_a, charB: r.char_b, score: r.score }));
}

// ─── Group Greetings ──────────────────────────────────────────────────────────

export type GroupGreeting = {
  uid: string;
  text: string;
  active: boolean;
};

export async function listGroupGreetings(): Promise<GroupGreeting[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ uid: string; text: string; active: number }>(
    `SELECT uid, text, active FROM group_greetings ORDER BY uid ASC;`,
  );
  return rows.map((r) => ({ uid: r.uid, text: r.text, active: r.active === 1 }));
}

export async function listActiveGroupGreetings(): Promise<GroupGreeting[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ uid: string; text: string; active: number }>(
    `SELECT uid, text, active FROM group_greetings WHERE active = 1 ORDER BY uid ASC;`,
  );
  return rows.map((r) => ({ uid: r.uid, text: r.text, active: r.active === 1 }));
}

export async function insertGroupGreeting(greeting: GroupGreeting): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO group_greetings (uid, text, active) VALUES (?, ?, ?);`,
    greeting.uid, greeting.text, greeting.active ? 1 : 0,
  );
}

export async function updateGroupGreetingActive(uid: string, active: boolean): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`UPDATE group_greetings SET active = ? WHERE uid = ?;`, active ? 1 : 0, uid);
}

export async function deleteGroupGreeting(uid: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM group_greetings WHERE uid = ?;`, uid);
}

// ─── Guild Event Seeds ────────────────────────────────────────────────────────

export type GuildEventSeed = {
  uid: string;
  text: string;
  active: boolean;
  relationshipDelta: number;
  useCommonQuest: boolean;
};

type GuildEventRow = { uid: string; text: string; active: number; relationship_delta: number; use_common_quest: number };
function mapGuildEventRow(r: GuildEventRow): GuildEventSeed {
  return { uid: r.uid, text: r.text, active: r.active === 1, relationshipDelta: r.relationship_delta, useCommonQuest: r.use_common_quest === 1 };
}

export async function listGuildEventSeeds(): Promise<GuildEventSeed[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<GuildEventRow>(
    `SELECT uid, text, active, relationship_delta, use_common_quest FROM guild_event_seeds ORDER BY uid ASC;`,
  );
  return rows.map(mapGuildEventRow);
}

export async function listActiveGuildEventSeeds(): Promise<GuildEventSeed[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<GuildEventRow>(
    `SELECT uid, text, active, relationship_delta, use_common_quest FROM guild_event_seeds WHERE active = 1 ORDER BY uid ASC;`,
  );
  return rows.map(mapGuildEventRow);
}

export async function insertGuildEventSeed(seed: GuildEventSeed): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO guild_event_seeds (uid, text, active, relationship_delta, use_common_quest) VALUES (?, ?, ?, ?, ?);`,
    seed.uid, seed.text, seed.active ? 1 : 0, seed.relationshipDelta, seed.useCommonQuest ? 1 : 0,
  );
}

export async function updateGuildEventSeedActive(uid: string, active: boolean): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`UPDATE guild_event_seeds SET active = ? WHERE uid = ?;`, active ? 1 : 0, uid);
}

export async function updateGuildEventSeedDelta(uid: string, delta: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`UPDATE guild_event_seeds SET relationship_delta = ? WHERE uid = ?;`, delta, uid);
}

export async function updateGuildEventSeedUseCommonQuest(uid: string, useCommonQuest: boolean): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`UPDATE guild_event_seeds SET use_common_quest = ? WHERE uid = ?;`, useCommonQuest ? 1 : 0, uid);
}

export async function deleteGuildEventSeed(uid: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM guild_event_seeds WHERE uid = ?;`, uid);
}

// ─── Quest Chains ─────────────────────────────────────────────────────────────

type ChainRow = { uid: string; name: string; premise: string; story_so_far: string; depth: number; max_depth: number; status: string; created_at: string };
function mapChainRow(r: ChainRow): QuestChain {
  return { uid: r.uid, name: r.name, premise: r.premise, storySoFar: r.story_so_far, depth: r.depth, maxDepth: r.max_depth, status: r.status as QuestChainStatus, createdAt: r.created_at };
}

export async function insertQuestChain(chain: QuestChain): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO quest_chains (uid, name, premise, story_so_far, depth, max_depth, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    chain.uid, chain.name, chain.premise, chain.storySoFar, chain.depth, chain.maxDepth, chain.status, chain.createdAt,
  );
}

export async function getQuestChain(uid: string): Promise<QuestChain | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<ChainRow>(`SELECT * FROM quest_chains WHERE uid = ?;`, uid);
  return row ? mapChainRow(row) : null;
}

export async function updateQuestChainStory(uid: string, storySoFar: string, depth: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`UPDATE quest_chains SET story_so_far = ?, depth = ? WHERE uid = ?;`, storySoFar, depth, uid);
}

export async function updateQuestChainStatus(uid: string, status: QuestChainStatus): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`UPDATE quest_chains SET status = ? WHERE uid = ?;`, status, uid);
}

// ─── Rumours ──────────────────────────────────────────────────────────────────

type RumourRow = { uid: string; text: string; keywords: string; game_day: number; known_by: string; used: number; created_at: string };
function mapRumourRow(r: RumourRow): Rumour {
  return { uid: r.uid, text: r.text, keywords: JSON.parse(r.keywords) as string[], gameDay: r.game_day, knownBy: JSON.parse(r.known_by) as string[], used: r.used === 1, createdAt: r.created_at };
}

export async function insertRumour(row: Rumour): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO rumours (uid, text, keywords, game_day, known_by, used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    row.uid, row.text, JSON.stringify(row.keywords), row.gameDay, JSON.stringify(row.knownBy), row.used ? 1 : 0, row.createdAt,
  );
}

export async function listActiveRumours(): Promise<Rumour[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<RumourRow>(`SELECT * FROM rumours WHERE used = 0 ORDER BY game_day DESC;`);
  return rows.map(mapRumourRow);
}

export async function listRumoursKnownBy(characterUid: string): Promise<Rumour[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<RumourRow>(`SELECT * FROM rumours ORDER BY game_day DESC;`);
  return rows.map(mapRumourRow).filter((r) => r.knownBy.includes(characterUid));
}

export async function markRumourUsed(uid: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`UPDATE rumours SET used = 1 WHERE uid = ?;`, uid);
}

// ─── Zones ────────────────────────────────────────────────────────────────────

export type Zone = {
  uid: string;
  name: string;
  biome: string;
  description: string;
  createdAt: string;
};

async function runMigrationV37(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS zones (
      uid         TEXT PRIMARY KEY NOT NULL,
      name        TEXT NOT NULL,
      biome       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL
    );
  `);
}

async function runMigrationV38(database: SQLite.SQLiteDatabase) {
  const now = new Date().toISOString();
  for (const z of ZONE_SEEDS) {
    await database.runAsync(
      `INSERT OR IGNORE INTO zones (uid, name, biome, description, created_at) VALUES (?, ?, ?, ?, ?);`,
      z.uid, z.name, z.biome, z.description, now,
    );
  }
}

async function runMigrationV39(database: SQLite.SQLiteDatabase) {
  // Re-upsert seeds with updated descriptions — replaces any existing seed rows.
  const now = new Date().toISOString();
  for (const z of ZONE_SEEDS) {
    await database.runAsync(
      `INSERT INTO zones (uid, name, biome, description, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(uid) DO UPDATE SET name = excluded.name, biome = excluded.biome, description = excluded.description;`,
      z.uid, z.name, z.biome, z.description, now,
    );
  }
}

export async function insertZone(zone: Zone): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO zones (uid, name, biome, description, created_at) VALUES (?, ?, ?, ?, ?);`,
    zone.uid, zone.name, zone.biome, zone.description, zone.createdAt,
  );
}

export async function listZones(): Promise<Zone[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ uid: string; name: string; biome: string; description: string; created_at: string }>(
    `SELECT uid, name, biome, description, created_at FROM zones ORDER BY name ASC;`
  );
  return rows.map((r) => ({ uid: r.uid, name: r.name, biome: r.biome, description: r.description, createdAt: r.created_at }));
}

export async function updateZone(uid: string, name: string, biome: string, description: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE zones SET name = ?, biome = ?, description = ? WHERE uid = ?;`,
    name, biome, description, uid,
  );
}

export async function deleteZone(uid: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM zones WHERE uid = ?;`, uid);
}

// ─── NPCs ─────────────────────────────────────────────────────────────────────

export type Npc = {
  uid: string;
  name: string;
  role: string;
  title: string | null;
  physicalDescription: string;
  personalityDescription: string;
  createdAt: string;
};

async function runMigrationV40(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS npcs (
      uid                     TEXT PRIMARY KEY NOT NULL,
      name                    TEXT NOT NULL,
      role                    TEXT NOT NULL,
      title                   TEXT,
      physical_description    TEXT NOT NULL DEFAULT '',
      personality_description TEXT NOT NULL DEFAULT '',
      created_at              TEXT NOT NULL
    );
  `);
}

export async function insertNpc(npc: Npc): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO npcs (uid, name, role, title, physical_description, personality_description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    npc.uid, npc.name, npc.role, npc.title ?? null,
    npc.physicalDescription, npc.personalityDescription, npc.createdAt,
  );
}

export async function listNpcs(): Promise<Npc[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    uid: string; name: string; role: string; title: string | null;
    physical_description: string; personality_description: string; created_at: string;
  }>(`SELECT uid, name, role, title, physical_description, personality_description, created_at FROM npcs ORDER BY name ASC;`);
  return rows.map((r) => ({
    uid: r.uid, name: r.name, role: r.role, title: r.title ?? null,
    physicalDescription: r.physical_description,
    personalityDescription: r.personality_description,
    createdAt: r.created_at,
  }));
}

export async function updateNpc(npc: Npc): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE npcs SET name = ?, role = ?, title = ?, physical_description = ?, personality_description = ? WHERE uid = ?;`,
    npc.name, npc.role, npc.title ?? null,
    npc.physicalDescription, npc.personalityDescription, npc.uid,
  );
}

export async function deleteNpc(uid: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM npcs WHERE uid = ?;`, uid);
}
