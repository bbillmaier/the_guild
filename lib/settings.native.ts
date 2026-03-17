import * as SQLite from 'expo-sqlite';

const databasePromise = SQLite.openDatabaseAsync('guild.db');

async function getDatabase() {
  return databasePromise;
}

async function ensureSettingsTable() {
  const db = await getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}

export async function getSetting(key: string): Promise<string | null> {
  await ensureSettingsTable();
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?;',
    key
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureSettingsTable();
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);',
    key,
    value
  );
}

export async function clearSetting(key: string): Promise<void> {
  await ensureSettingsTable();
  const db = await getDatabase();
  await db.runAsync('DELETE FROM app_settings WHERE key = ?;', key);
}

export const API_BASE_URL_KEY = 'api_base_url';
export const QUICK_MODE_KEY = 'quick_mode';
export const COMFY_BASE_URL_KEY = 'comfy_base_url';
export const COMFY_MODEL_KEY = 'comfy_model';
export const COMFY_WORKFLOW_KEY = 'comfy_workflow';
export const FLUX_IMAGE_EDIT_KEY = 'flux_image_edit';
