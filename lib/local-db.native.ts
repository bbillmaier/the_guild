import * as SQLite from 'expo-sqlite';

export type GuildNote = {
  id: number;
  title: string;
  createdAt: string;
};

export type GuildCharacter = {
  uid: string;
  characterName: string;
  className: string;
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
};

const databasePromise = SQLite.openDatabaseAsync('guild.db');
const latestMigrationVersion = 1;

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

  if (currentVersion !== latestMigrationVersion) {
    throw new Error(
      `Database migration mismatch. Current: ${currentVersion}, expected: ${latestMigrationVersion}.`
    );
  }

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
    class: string;
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
  }>(`
    SELECT
      uid,
      character_name,
      class,
      strength,
      dexterity,
      constitution,
      intelligence,
      wisdom,
      charisma,
      physDesc,
      metaDesc,
      race,
      baseDescription
    FROM characters
    ORDER BY character_name ASC;
  `);

  return rows.map((row) => ({
    uid: row.uid,
    characterName: row.character_name,
    className: row.class,
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
  }));
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
