import * as SQLite from 'expo-sqlite';

export type GuildNote = {
  id: number;
  title: string;
  createdAt: string;
};

const databasePromise = SQLite.openDatabaseAsync('guild.db');

async function getDatabase() {
  return databasePromise;
}

export async function initializeDatabase() {
  const database = await getDatabase();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS guild_notes (
      id INTEGER PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
