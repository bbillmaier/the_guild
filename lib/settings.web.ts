const settingsStorageKey = 'guild_settings';

function readSettings(): Record<string, string> {
  try {
    const stored = globalThis.localStorage?.getItem(settingsStorageKey);
    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored) as Record<string, string>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeSettings(settings: Record<string, string>) {
  try {
    globalThis.localStorage?.setItem(settingsStorageKey, JSON.stringify(settings));
  } catch (error) {
    console.error(error);
  }
}

export async function getSetting(key: string): Promise<string | null> {
  return readSettings()[key] ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const settings = readSettings();
  settings[key] = value;
  writeSettings(settings);
}

export async function clearSetting(key: string): Promise<void> {
  const settings = readSettings();
  delete settings[key];
  writeSettings(settings);
}

export const API_BASE_URL_KEY = 'api_base_url';
export const QUICK_MODE_KEY = 'quick_mode';
export const COMFY_BASE_URL_KEY = 'comfy_base_url';
export const COMFY_MODEL_KEY = 'comfy_model';
export const COMFY_WORKFLOW_KEY = 'comfy_workflow';
export const FLUX_IMAGE_EDIT_KEY = 'flux_image_edit';
