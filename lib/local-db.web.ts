// ─── Electron type shim ───────────────────────────────────────────────────────

declare global {
  interface Window {
    electronAPI?: {
      db: {
        all: (sql: string, params?: unknown[]) => Promise<unknown[]>;
        get: (sql: string, params?: unknown[]) => Promise<unknown | null>;
        run: (sql: string, params?: unknown[]) => Promise<{ lastInsertRowId: number; changes: number }>;
        exec: (sql: string) => Promise<null>;
      };
      fs: {
        saveImage: (url: string, subfolder: string, filename: string) => Promise<string>;
        getUserDataPath: () => Promise<string>;
      };
    };
  }
}

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

// ─── IPC helpers (Electron only) ──────────────────────────────────────────────

function eAll<T>(sql: string, params?: unknown[]): Promise<T[]> {
  return window.electronAPI!.db.all(sql, params) as Promise<T[]>;
}
function eGet<T>(sql: string, params?: unknown[]): Promise<T | null> {
  return window.electronAPI!.db.get(sql, params) as Promise<T | null>;
}
function eRun(sql: string, params?: unknown[]): Promise<{ lastInsertRowId: number; changes: number }> {
  return window.electronAPI!.db.run(sql, params);
}
function eExec(sql: string): Promise<null> {
  return window.electronAPI!.db.exec(sql);
}

// ─── Types ────────────────────────────────────────────────────────────────────

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
  name?: string;
  slot?: string;
  description?: string;
  className?: string | null;
};

/** An item the guild has purchased from the shop (not yet assigned to a character). */
export type GuildShopInventoryItem = {
  id: number;
  itemTypeId: number;
  name: string;
  slot: string;
  description: string;
  className: string | null;
  purchasedAt: string;
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
  name?: string;
  description?: string;
};

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
  knownBy: string[];
  used: boolean;
  createdAt: string;
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

export type GuildResource = { id: number; resource: string; value: number; };

// ─── Parse helpers ────────────────────────────────────────────────────────────

function parseQuestDifficulty(value: unknown): QuestDifficulty {
  if (value === 'easy' || value === 'medium' || value === 'hard' || value === 'deadly') return value;
  return 'easy';
}
function parseQuestStatus(value: unknown): QuestStatus {
  if (value === 'active' || value === 'completed' || value === 'failed') return value;
  return 'active';
}
function parseRoomType(value: unknown): RoomType {
  if (value === 'combat' || value === 'challenge' || value === 'boss') return value;
  return 'combat';
}
function parseRoomStatus(value: unknown): RoomStatus {
  if (value === 'pending' || value === 'completed' || value === 'failed') return value;
  return 'pending';
}
function parseItemStat(value: unknown): ItemStat {
  const valid: ItemStat[] = ['hp', 'ac', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  return valid.includes(value as ItemStat) ? (value as ItemStat) : 'strength';
}
function parseCharacterGender(value: unknown): CharacterGender {
  if (value === 'male' || value === 'female') return value;
  return 'unknown';
}
function parseMetaStat(value: unknown): GuildMetaDesc['stat'] {
  if (value === 'intelligence' || value === 'wisdom' || value === 'charisma') return value;
  return null;
}
function parseRoleplayCategory(value: unknown): RoleplayCategory {
  if (value === 'general' || value === 'boss' || value === 'failure') return value;
  return 'general';
}
function parseJsonArray(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try { const p = JSON.parse(value); return Array.isArray(p) ? p : []; } catch { return []; }
}
function getConModifier(constitution: number) { return Math.floor((constitution - 10) / 2); }

// ─── DB init ──────────────────────────────────────────────────────────────────

export async function initializeDatabase() {
  if (isElectron) return; // main process handles all migrations
  ensureMetaDescSeedRows();
  ensureRoleplayPromptSeedRows();
  ensureSettings();
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const storageKey               = 'guild_notes';
const questStorageKey          = 'guild_quests';
const questRoomStorageKey      = 'guild_quest_rooms';
const characterStorageKey      = 'guild_characters';
const enemyStorageKey          = 'guild_enemies';
const metaDescStorageKey       = 'guild_meta_desc';
const itemStorageKey           = 'guild_items';
const roleplayPromptStorageKey = 'guild_roleplay_prompts';
const settingsStorageKey       = 'guild_settings';
const questHistoryStorageKey   = 'guild_quest_history';
const chatHistoryStorageKey    = 'guild_chat_history';
const greetingStorageKey       = 'guild_character_greetings';
const opinionStorageKey        = 'guild_character_opinions';

function lsGet(key: string): string | null { try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; } }
function lsSet(key: string, value: string) { try { globalThis.localStorage?.setItem(key, value); } catch (e) { console.error(e); } }
function lsJson<T>(key: string, fallback: T): T {
  const s = lsGet(key);
  if (!s) return fallback;
  try { const p = JSON.parse(s) as T; return Array.isArray(fallback) ? (Array.isArray(p) ? p : fallback) : p; }
  catch { return fallback; }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function readSettings(): Record<string, string> { return lsJson<Record<string, string>>(settingsStorageKey, {}); }
function writeSettings(s: Record<string, string>) { lsSet(settingsStorageKey, JSON.stringify(s)); }
function ensureSettings() {
  const s = readSettings();
  if (!s['game_day']) s['game_day'] = '1';
  if (!s['keyword_method']) s['keyword_method'] = 'llm';
  writeSettings(s);
}

export async function getKeywordMethod(): Promise<KeywordMethod> {
  if (isElectron) {
    const row = await eGet<{ value: string }>(`SELECT value FROM settings WHERE key = 'keyword_method';`);
    return (row?.value === 'auto' ? 'auto' : 'llm') as KeywordMethod;
  }
  const s = readSettings();
  return (s['keyword_method'] === 'auto' ? 'auto' : 'llm') as KeywordMethod;
}
export async function setKeywordMethod(method: KeywordMethod): Promise<void> {
  if (isElectron) {
    await eRun(`INSERT INTO settings (key, value) VALUES ('keyword_method', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`, [method]);
    return;
  }
  const s = readSettings(); s['keyword_method'] = method; writeSettings(s);
}

// ─── Game Day ─────────────────────────────────────────────────────────────────

export async function getGameDay(): Promise<number> {
  if (isElectron) {
    const row = await eGet<{ value: string }>(`SELECT value FROM settings WHERE key = 'game_day';`);
    return row ? parseInt(row.value, 10) : 1;
  }
  const s = readSettings(); return s['game_day'] ? parseInt(s['game_day'], 10) : 1;
}
export async function setGameDay(day: number): Promise<void> {
  if (isElectron) {
    await eRun(`INSERT INTO settings (key, value) VALUES ('game_day', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`, [String(Math.max(1, day))]);
    return;
  }
  const s = readSettings(); s['game_day'] = String(Math.max(1, day)); writeSettings(s);
}
export async function advanceGameDay(days = 1): Promise<number> {
  const current = await getGameDay();
  const next = current + days;
  await setGameDay(next);
  return next;
}

// ─── Resources ────────────────────────────────────────────────────────────────

const _resources: Map<string, number> = new Map([['gold', 0]]);

export async function listResources(): Promise<GuildResource[]> {
  if (isElectron) {
    return eAll<GuildResource>(`SELECT id, resource, value FROM resources ORDER BY resource;`);
  }
  return Array.from(_resources.entries()).map(([resource, value], i) => ({ id: i + 1, resource, value }));
}
export async function getResource(resource: string): Promise<number> {
  if (isElectron) {
    const row = await eGet<{ value: number }>(`SELECT value FROM resources WHERE resource = ?;`, [resource]);
    return row?.value ?? 0;
  }
  return _resources.get(resource) ?? 0;
}
export async function setResource(resource: string, value: number): Promise<void> {
  if (isElectron) {
    await eRun(`INSERT INTO resources (resource, value) VALUES (?, ?) ON CONFLICT(resource) DO UPDATE SET value = excluded.value;`, [resource, value]);
    return;
  }
  _resources.set(resource, value);
}
export async function adjustResource(resource: string, amount: number): Promise<number> {
  if (isElectron) {
    await eRun(`INSERT INTO resources (resource, value) VALUES (?, ?) ON CONFLICT(resource) DO UPDATE SET value = value + excluded.value;`, [resource, amount]);
    const row = await eGet<{ value: number }>(`SELECT value FROM resources WHERE resource = ?;`, [resource]);
    return row?.value ?? 0;
  }
  const next = (_resources.get(resource) ?? 0) + amount;
  _resources.set(resource, next);
  return next;
}

// ─── Guild Notes ──────────────────────────────────────────────────────────────

function readNotes(): GuildNote[] {
  return lsJson<GuildNote[]>(storageKey, []).sort((a, b) => b.id - a.id);
}
function writeNotes(notes: GuildNote[]) { lsSet(storageKey, JSON.stringify(notes)); }

export async function listGuildNotes() {
  if (isElectron) {
    const rows = await eAll<{ id: number; title: string; created_at: string }>(
      `SELECT id, title, created_at FROM guild_notes ORDER BY id DESC;`
    );
    return rows.map((r) => ({ id: r.id, title: r.title, createdAt: r.created_at }));
  }
  return readNotes();
}
export async function addGuildNote(title: string) {
  if (isElectron) { await eRun(`INSERT INTO guild_notes (title) VALUES (?);`, [title]); return; }
  const notes = readNotes();
  const nextId = notes.length === 0 ? 1 : Math.max(...notes.map((n) => n.id)) + 1;
  notes.push({ id: nextId, title, createdAt: new Date().toISOString() });
  writeNotes(notes);
}
export async function deleteGuildNote(id: number) {
  if (isElectron) { await eRun(`DELETE FROM guild_notes WHERE id = ?;`, [id]); return; }
  writeNotes(readNotes().filter((n) => n.id !== id));
}

// ─── Characters ───────────────────────────────────────────────────────────────

type CharacterRow = {
  uid: string; character_name: string; gender: string; class: string;
  hp: number; strength: number; dexterity: number; constitution: number;
  intelligence: number; wisdom: number; charisma: number;
  physDesc: string; metaDesc: string; race: string; baseDescription: string;
  level: number; experience: number; avatar_path: string | null;
};
/** Convert legacy absolute Windows paths (stored before the app:// URL scheme was
 *  introduced) to an app://main/userdata/... URL the renderer can actually load. */
function normalizeAvatarPath(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith('app://') || raw.startsWith('http')) return raw;
  // Absolute Windows path: C:\Users\...\The Guild\images\...
  // Extract the relative portion starting from the first known folder name.
  const rel = raw.replace(/\\/g, '/');
  const idx = rel.search(/\/images\//);
  if (idx !== -1) return `app://main/userdata${rel.slice(idx)}`;
  return raw;
}

function mapCharRow(r: CharacterRow): GuildCharacter {
  return {
    uid: r.uid, characterName: r.character_name, gender: parseCharacterGender(r.gender),
    className: r.class, hp: r.hp, strength: r.strength, dexterity: r.dexterity,
    constitution: r.constitution, intelligence: r.intelligence, wisdom: r.wisdom,
    charisma: r.charisma, physDesc: parseJsonArray(r.physDesc), metaDesc: parseJsonArray(r.metaDesc),
    race: r.race, baseDescription: r.baseDescription, level: r.level,
    experience: r.experience, avatarPath: normalizeAvatarPath(r.avatar_path),
  };
}
function readCharacters(): GuildCharacter[] {
  const arr = lsJson<GuildCharacter[]>(characterStorageKey, []);
  return arr.map((c) => ({
    ...c, gender: parseCharacterGender(c.gender),
    hp: typeof c.hp === 'number' ? c.hp : 10 + getConModifier(c.constitution),
    level: typeof c.level === 'number' ? c.level : 1,
    experience: typeof c.experience === 'number' ? c.experience : 0,
  }));
}
function writeCharacters(cs: GuildCharacter[]) { lsSet(characterStorageKey, JSON.stringify(cs)); }

export async function listGuildCharacters() {
  if (isElectron) {
    const rows = await eAll<CharacterRow>(`SELECT uid, character_name, gender, class, hp, strength, dexterity, constitution, intelligence, wisdom, charisma, physDesc, metaDesc, race, baseDescription, level, experience, avatar_path FROM characters ORDER BY character_name ASC;`);
    return rows.map(mapCharRow);
  }
  return readCharacters();
}
export async function insertGuildCharacter(character: NewGuildCharacter) {
  if (isElectron) {
    await eRun(
      `INSERT INTO characters (uid, character_name, gender, class, hp, strength, dexterity, constitution, intelligence, wisdom, charisma, physDesc, metaDesc, race, baseDescription, level, experience) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [character.uid, character.characterName, character.gender, character.className,
       character.hp, character.strength, character.dexterity, character.constitution,
       character.intelligence, character.wisdom, character.charisma,
       JSON.stringify(character.physDesc), JSON.stringify(character.metaDesc),
       character.race, character.baseDescription, character.level, character.experience]
    );
    await initCharacterMundaneItems(character.uid, character.className);
    return;
  }
  const cs = readCharacters(); cs.push(character); writeCharacters(cs);
}
export async function clearGuildCharacters() {
  if (isElectron) { await eRun(`DELETE FROM characters;`); return; }
  writeCharacters([]);
}
export async function deleteGuildCharacter(uid: string): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM characters WHERE uid = ?;`, [uid]); return; }
  writeCharacters(readCharacters().filter((c) => c.uid !== uid));
}
export async function updateCharacterAvatarPath(uid: string, avatarPath: string | null): Promise<void> {
  if (isElectron) { await eRun(`UPDATE characters SET avatar_path = ? WHERE uid = ?;`, [avatarPath, uid]); return; }
  writeCharacters(readCharacters().map((c) => (c.uid === uid ? { ...c, avatarPath } : c)));
}
export async function updateGuildCharacterHp(uid: string, hp: number): Promise<void> {
  if (isElectron) { await eRun(`UPDATE characters SET hp = ? WHERE uid = ?;`, [hp, uid]); return; }
  writeCharacters(readCharacters().map((c) => (c.uid === uid ? { ...c, hp } : c)));
}
export async function updateGuildCharacterXp(uid: string, experience: number, level: number, hp: number): Promise<void> {
  if (isElectron) { await eRun(`UPDATE characters SET experience = ?, level = ?, hp = ? WHERE uid = ?;`, [experience, level, hp, uid]); return; }
  writeCharacters(readCharacters().map((c) => (c.uid === uid ? { ...c, experience, level, hp } : c)));
}

// ─── Enemies ──────────────────────────────────────────────────────────────────

type EnemyRow = Omit<CharacterRow, 'experience' | 'avatar_path'>;
function mapEnemyRow(r: EnemyRow): GuildEnemy {
  return {
    uid: r.uid, characterName: r.character_name, gender: parseCharacterGender(r.gender),
    className: r.class, hp: r.hp, strength: r.strength, dexterity: r.dexterity,
    constitution: r.constitution, intelligence: r.intelligence, wisdom: r.wisdom,
    charisma: r.charisma, physDesc: parseJsonArray(r.physDesc), metaDesc: parseJsonArray(r.metaDesc),
    race: r.race, baseDescription: r.baseDescription, level: r.level,
  };
}
function readEnemies(): GuildEnemy[] {
  return lsJson<GuildEnemy[]>(enemyStorageKey, []).map((e) => ({
    ...e, gender: parseCharacterGender(e.gender),
    hp: typeof e.hp === 'number' ? e.hp : 10,
    level: typeof e.level === 'number' ? e.level : 1,
  }));
}
function writeEnemies(es: GuildEnemy[]) { lsSet(enemyStorageKey, JSON.stringify(es)); }

export async function listGuildEnemies() {
  if (isElectron) {
    const rows = await eAll<EnemyRow>(`SELECT uid, character_name, gender, class, hp, strength, dexterity, constitution, intelligence, wisdom, charisma, physDesc, metaDesc, race, baseDescription, level FROM enemies ORDER BY character_name ASC;`);
    return rows.map(mapEnemyRow);
  }
  return readEnemies();
}
export async function insertGuildEnemy(enemy: NewGuildEnemy) {
  if (isElectron) {
    await eRun(
      `INSERT INTO enemies (uid, character_name, gender, class, hp, strength, dexterity, constitution, intelligence, wisdom, charisma, physDesc, metaDesc, race, baseDescription, level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [enemy.uid, enemy.characterName, enemy.gender, enemy.className, enemy.hp,
       enemy.strength, enemy.dexterity, enemy.constitution, enemy.intelligence, enemy.wisdom,
       enemy.charisma, JSON.stringify(enemy.physDesc), JSON.stringify(enemy.metaDesc),
       enemy.race, enemy.baseDescription, enemy.level]
    );
    return;
  }
  const es = readEnemies(); es.push(enemy); writeEnemies(es);
}
export async function clearGuildEnemies() {
  if (isElectron) { await eRun(`DELETE FROM enemies;`); return; }
  writeEnemies([]);
}

// ─── Items ────────────────────────────────────────────────────────────────────

type ItemRow = { uid: string; name: string; slot: string; description: string; type: string; stat: string; bonus: number; character_uid: string | null };
function mapItemRow(r: ItemRow): GuildItem {
  return { uid: r.uid, name: r.name, slot: r.slot, description: r.description, type: r.type, stat: parseItemStat(r.stat), bonus: r.bonus, characterUid: r.character_uid ?? null };
}
function readItems(): GuildItem[] {
  return lsJson<GuildItem[]>(itemStorageKey, []).map((i) => ({ ...i, stat: parseItemStat(i.stat), bonus: typeof i.bonus === 'number' ? i.bonus : 0, characterUid: typeof i.characterUid === 'string' ? i.characterUid : null }));
}
function writeItems(items: GuildItem[]) { lsSet(itemStorageKey, JSON.stringify(items)); }

export async function listGuildItems() {
  if (isElectron) { return (await eAll<ItemRow>(`SELECT uid, name, slot, description, type, stat, bonus, character_uid FROM items ORDER BY name ASC;`)).map(mapItemRow); }
  return readItems();
}
export async function insertGuildItem(item: NewGuildItem) {
  if (isElectron) { await eRun(`INSERT INTO items (uid, name, slot, description, type, stat, bonus, character_uid) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`, [item.uid, item.name, item.slot, item.description, item.type, item.stat, item.bonus, item.characterUid ?? null]); return; }
  const items = readItems(); items.push(item); writeItems(items);
}
export async function deleteGuildItem(uid: string) {
  if (isElectron) { await eRun(`DELETE FROM items WHERE uid = ?;`, [uid]); return; }
  writeItems(readItems().filter((i) => i.uid !== uid));
}
export async function clearGuildItems() {
  if (isElectron) { await eRun(`DELETE FROM items;`); return; }
  writeItems([]);
}
export async function listCharacterItems(characterUid: string) {
  if (isElectron) { return (await eAll<ItemRow>(`SELECT uid, name, slot, description, type, stat, bonus, character_uid FROM items WHERE character_uid = ? ORDER BY name ASC;`, [characterUid])).map(mapItemRow); }
  return readItems().filter((i) => i.characterUid === characterUid);
}
export async function assignItemToCharacter(itemUid: string, characterUid: string): Promise<void> {
  if (isElectron) {
    const item = await eGet<{ slot: string }>(`SELECT slot FROM items WHERE uid = ?;`, [itemUid]);
    if (!item) throw new Error('Item not found.');
    const conflict = await eGet<{ count: number }>(`SELECT COUNT(*) as count FROM items WHERE character_uid = ? AND slot = ? AND uid != ?;`, [characterUid, item.slot, itemUid]);
    if ((conflict?.count ?? 0) > 0) throw new Error(`Character already has an item equipped in the ${item.slot} slot.`);
    const equipped = await eGet<{ count: number }>(`SELECT COUNT(*) as count FROM items WHERE character_uid = ?;`, [characterUid]);
    if ((equipped?.count ?? 0) >= 3) throw new Error('Character already has 3 items equipped.');
    await eRun(`UPDATE items SET character_uid = ? WHERE uid = ?;`, [characterUid, itemUid]);
    return;
  }
  const items = readItems();
  const item = items.find((i) => i.uid === itemUid);
  if (!item) throw new Error('Item not found.');
  if (items.some((i) => i.characterUid === characterUid && i.slot === item.slot && i.uid !== itemUid)) throw new Error(`Character already has an item equipped in the ${item.slot} slot.`);
  if (items.filter((i) => i.characterUid === characterUid).length >= 3) throw new Error('Character already has 3 items equipped.');
  writeItems(items.map((i) => (i.uid === itemUid ? { ...i, characterUid } : i)));
}
export async function unassignItem(itemUid: string): Promise<void> {
  if (isElectron) { await eRun(`UPDATE items SET character_uid = NULL WHERE uid = ?;`, [itemUid]); return; }
  writeItems(readItems().map((i) => (i.uid === itemUid ? { ...i, characterUid: null } : i)));
}

// ─── Quests ───────────────────────────────────────────────────────────────────

type QuestRow = { uid: string; title: string; difficulty: string; biome: string; level: number; status: string; created_at: string; narrative: string; summary: string };
function mapQuestRow(r: QuestRow): GuildQuest {
  return { uid: r.uid, title: r.title, difficulty: parseQuestDifficulty(r.difficulty), biome: r.biome, level: r.level, status: parseQuestStatus(r.status), createdAt: r.created_at, narrative: r.narrative ?? '', summary: r.summary ?? '' };
}
function readQuests(): GuildQuest[] {
  return lsJson<GuildQuest[]>(questStorageKey, []).map((q) => ({ ...q, difficulty: parseQuestDifficulty(q.difficulty), status: parseQuestStatus(q.status), level: typeof q.level === 'number' ? q.level : 1, narrative: typeof q.narrative === 'string' ? q.narrative : '', summary: typeof q.summary === 'string' ? q.summary : '' }));
}
function writeQuests(qs: GuildQuest[]) { lsSet(questStorageKey, JSON.stringify(qs)); }
type QuestRoomRow = { uid: string; quest_uid: string; room_number: number; room_type: string; description: string; content: string; status: string };
function mapQuestRoomRow(r: QuestRoomRow): QuestRoom {
  return { uid: r.uid, questUid: r.quest_uid, roomNumber: r.room_number, roomType: parseRoomType(r.room_type), description: r.description, content: r.content, status: parseRoomStatus(r.status) };
}
function readQuestRooms(): QuestRoom[] {
  return lsJson<QuestRoom[]>(questRoomStorageKey, []).map((r) => ({ ...r, roomType: parseRoomType(r.roomType), status: parseRoomStatus(r.status), roomNumber: typeof r.roomNumber === 'number' ? r.roomNumber : 1 }));
}
function writeQuestRooms(rs: QuestRoom[]) { lsSet(questRoomStorageKey, JSON.stringify(rs)); }

export async function insertGuildQuest(quest: GuildQuest): Promise<void> {
  if (isElectron) { await eRun(`INSERT INTO quests (uid, title, difficulty, biome, level, status, created_at, narrative, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`, [quest.uid, quest.title, quest.difficulty, quest.biome, quest.level, quest.status, quest.createdAt, quest.narrative ?? '', quest.summary ?? '']); return; }
  const qs = readQuests(); qs.push(quest); writeQuests(qs);
}
export async function deleteGuildQuest(uid: string): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM quests WHERE uid = ?;`, [uid]); await eRun(`DELETE FROM quest_rooms WHERE quest_uid = ?;`, [uid]); return; }
  writeQuests(readQuests().filter((q) => q.uid !== uid));
  writeQuestRooms(readQuestRooms().filter((r) => r.questUid !== uid));
}
export async function clearGuildQuests(): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM quests;`); await eRun(`DELETE FROM quest_rooms;`); return; }
  writeQuests([]); writeQuestRooms([]);
}
export async function listGuildQuests(): Promise<GuildQuest[]> {
  if (isElectron) { return (await eAll<QuestRow>(`SELECT uid, title, difficulty, biome, level, status, created_at, narrative, summary FROM quests ORDER BY created_at DESC;`)).map(mapQuestRow); }
  return readQuests().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function insertQuestRoom(room: QuestRoom): Promise<void> {
  if (isElectron) { await eRun(`INSERT INTO quest_rooms (uid, quest_uid, room_number, room_type, description, content, status) VALUES (?, ?, ?, ?, ?, ?, ?);`, [room.uid, room.questUid, room.roomNumber, room.roomType, room.description, room.content, room.status]); return; }
  const rs = readQuestRooms(); rs.push(room); writeQuestRooms(rs);
}
export async function listQuestRooms(questUid: string): Promise<QuestRoom[]> {
  if (isElectron) { return (await eAll<QuestRoomRow>(`SELECT uid, quest_uid, room_number, room_type, description, content, status FROM quest_rooms WHERE quest_uid = ? ORDER BY room_number ASC;`, [questUid])).map(mapQuestRoomRow); }
  return readQuestRooms().filter((r) => r.questUid === questUid).sort((a, b) => a.roomNumber - b.roomNumber);
}
export async function updateQuestStatus(uid: string, status: QuestStatus): Promise<void> {
  if (isElectron) { await eRun(`UPDATE quests SET status = ? WHERE uid = ?;`, [status, uid]); return; }
  writeQuests(readQuests().map((q) => (q.uid === uid ? { ...q, status } : q)));
}
export async function updateQuestNarrative(uid: string, narrative: string): Promise<void> {
  if (isElectron) { await eRun(`UPDATE quests SET narrative = ? WHERE uid = ?;`, [narrative, uid]); return; }
  writeQuests(readQuests().map((q) => (q.uid === uid ? { ...q, narrative } : q)));
}
export async function updateQuestRoomStatus(uid: string, status: RoomStatus): Promise<void> {
  if (isElectron) { await eRun(`UPDATE quest_rooms SET status = ? WHERE uid = ?;`, [status, uid]); return; }
  writeQuestRooms(readQuestRooms().map((r) => (r.uid === uid ? { ...r, status } : r)));
}

// ─── Meta Descriptions ────────────────────────────────────────────────────────

type MetaDescRow = { uid: string; name: string; stat: string | null; mode: number | null; description: string };
function mapMetaRow(r: MetaDescRow): GuildMetaDesc {
  return { uid: r.uid, name: r.name, stat: parseMetaStat(r.stat), mode: r.mode, description: r.description };
}
function readMetaDescriptions(): GuildMetaDesc[] {
  return lsJson<GuildMetaDesc[]>(metaDescStorageKey, []).map((r) => ({ uid: String(r.uid), name: String(r.name), stat: parseMetaStat(r.stat), mode: typeof r.mode === 'number' ? r.mode : null, description: String(r.description ?? '') }));
}
function writeMetaDescriptions(rows: GuildMetaDesc[]) { lsSet(metaDescStorageKey, JSON.stringify(rows)); }
function ensureMetaDescSeedRows() {
  const existing = readMetaDescriptions();
  if (existing.length >= 100) return;
  const byUid = new Map(existing.map((r) => [r.uid, r]));
  for (const row of buildMetaDescSeedRows(100)) { if (!byUid.has(row.uid)) byUid.set(row.uid, row); }
  writeMetaDescriptions(Array.from(byUid.values()));
}
function buildMetaDescSeedRows(count: number): GuildMetaDesc[] {
  const adj = ['Analytical','Brooding','Calm','Careful','Compulsive','Curious','Cynical','Decisive','Distrustful','Dreamy','Empathetic','Focused','Idealistic','Impulsive','Intense','Introspective','Meticulous','Methodical','Paranoid','Patient'];
  const dom = ['Planner','Visionary','Observer','Negotiator','Scholar','Mystic','Tactician','Mediator','Rhetorician','Investigator'];
  const frg = ['questions assumptions before acting','keeps a rigid internal code','reads motives behind every word','seeks patterns in apparent chaos','weighs options before committing','overthinks simple social exchanges','defuses tension with measured calm','pushes conversations toward truth','guards private thoughts carefully','reframes setbacks as strategy'];
  const sc = ['intelligence','wisdom','charisma',null] as const;
  const mc = [1,-1,null,null] as const;
  const rows: GuildMetaDesc[] = [];
  for (let i = 0; i < count; i++) {
    rows.push({ uid: `meta_seed_${String(i + 1).padStart(3, '0')}`, name: `${adj[i % adj.length]} ${dom[Math.floor(i / adj.length) % dom.length]}`, stat: sc[i % sc.length], mode: mc[i % mc.length], description: `${adj[i % adj.length].toLowerCase()} ${dom[Math.floor(i / adj.length) % dom.length].toLowerCase()} who ${frg[i % frg.length]}.` });
  }
  return rows;
}

export async function listGuildMetaDescriptions() {
  if (isElectron) { return (await eAll<MetaDescRow>(`SELECT uid, name, stat, mode, description FROM metaDesc ORDER BY uid ASC;`)).map(mapMetaRow); }
  ensureMetaDescSeedRows(); return readMetaDescriptions();
}
export async function seedGuildMetaDescriptions() {
  if (isElectron) return;
  ensureMetaDescSeedRows();
}
export async function clearGuildMetaDescriptions() {
  if (isElectron) { await eRun(`DELETE FROM metaDesc;`); return; }
  writeMetaDescriptions([]);
}

// ─── Roleplay Prompts ─────────────────────────────────────────────────────────

type RoleplayRow = { uid: string; text: string; category: string; active: number; relationship_delta: number };
function mapRoleplayRow(r: RoleplayRow): RoleplayPrompt {
  return { uid: r.uid, text: r.text, category: parseRoleplayCategory(r.category), active: r.active === 1, relationshipDelta: r.relationship_delta ?? 0 };
}
function readRoleplayPrompts(): RoleplayPrompt[] {
  return lsJson<RoleplayPrompt[]>(roleplayPromptStorageKey, []).map((p) => ({
    uid: String(p.uid), text: String(p.text),
    category: parseRoleplayCategory(p.category),
    active: typeof p.active === 'boolean' ? p.active : true,
    relationshipDelta: typeof p.relationshipDelta === 'number' ? p.relationshipDelta : 0,
  }));
}
function writeRoleplayPrompts(ps: RoleplayPrompt[]) { lsSet(roleplayPromptStorageKey, JSON.stringify(ps)); }
function ensureRoleplayPromptSeedRows() {
  const existing = readRoleplayPrompts();
  const byUid = new Map(existing.map((p) => [p.uid, p]));
  // Always sync seed text and delta so updates propagate; preserve active state.
  for (const s of ROLEPLAY_SEEDS) {
    const cur = byUid.get(s.uid);
    byUid.set(s.uid, { uid: s.uid, text: s.text, category: s.category, relationshipDelta: s.relationshipDelta, active: cur?.active ?? true });
  }
  writeRoleplayPrompts(Array.from(byUid.values()));
}

export async function listRoleplayPrompts(): Promise<RoleplayPrompt[]> {
  if (isElectron) { return (await eAll<RoleplayRow>(`SELECT uid, text, category, active, relationship_delta FROM roleplay_prompts ORDER BY category ASC, uid ASC;`)).map(mapRoleplayRow); }
  ensureRoleplayPromptSeedRows(); return readRoleplayPrompts().sort((a, b) => a.category.localeCompare(b.category) || a.uid.localeCompare(b.uid));
}
export async function listActiveRoleplayPrompts(category: RoleplayCategory): Promise<RoleplayPrompt[]> {
  if (isElectron) { return (await eAll<RoleplayRow>(`SELECT uid, text, category, active, relationship_delta FROM roleplay_prompts WHERE category = ? AND active = 1 ORDER BY uid ASC;`, [category])).map(mapRoleplayRow); }
  ensureRoleplayPromptSeedRows(); return readRoleplayPrompts().filter((p) => p.category === category && p.active);
}
export async function insertRoleplayPrompt(prompt: RoleplayPrompt): Promise<void> {
  if (isElectron) { await eRun(`INSERT INTO roleplay_prompts (uid, text, category, active, relationship_delta) VALUES (?, ?, ?, ?, ?);`, [prompt.uid, prompt.text, prompt.category, prompt.active ? 1 : 0, prompt.relationshipDelta]); return; }
  const ps = readRoleplayPrompts(); ps.push(prompt); writeRoleplayPrompts(ps);
}
export async function updateRoleplayPromptActive(uid: string, active: boolean): Promise<void> {
  if (isElectron) { await eRun(`UPDATE roleplay_prompts SET active = ? WHERE uid = ?;`, [active ? 1 : 0, uid]); return; }
  writeRoleplayPrompts(readRoleplayPrompts().map((p) => (p.uid === uid ? { ...p, active } : p)));
}
export async function updateRoleplayPromptDelta(uid: string, delta: number): Promise<void> {
  if (isElectron) { await eRun(`UPDATE roleplay_prompts SET relationship_delta = ? WHERE uid = ?;`, [delta, uid]); return; }
  writeRoleplayPrompts(readRoleplayPrompts().map((p) => (p.uid === uid ? { ...p, relationshipDelta: delta } : p)));
}
export async function deleteRoleplayPrompt(uid: string): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM roleplay_prompts WHERE uid = ?;`, [uid]); return; }
  writeRoleplayPrompts(readRoleplayPrompts().filter((p) => p.uid !== uid));
}

// ─── Character Greetings ──────────────────────────────────────────────────────

const GREETING_SEEDS: CharacterGreeting[] = [
  { uid: 'greeting_tavern_1',   room: 'tavern',   message: '{{char}} looks up from a half-empty mug and raises it in greeting.' },
  { uid: 'greeting_tavern_2',   room: 'tavern',   message: '{{char}} is sharpening a blade at the bar. "Ah, Guild Master. What brings you over?"' },
  { uid: 'greeting_tavern_3',   room: 'tavern',   message: "{{char}} waves you over from a corner table. \"I was wondering when you'd show up.\"" },
  { uid: 'greeting_barracks_1', room: 'barracks', message: '{{char}} sits on the edge of a cot, polishing armour. "Guild Master. Something on your mind?"' },
  { uid: 'greeting_barracks_2', room: 'barracks', message: "{{char}} is running through stretches near the weapon racks. \"Oh — didn't hear you come in.\"" },
  { uid: 'greeting_armory_1',   room: 'armory',   message: '{{char}} is inspecting a rack of weapons and turns as you enter. "Looking for something specific?"' },
  { uid: 'greeting_armory_2',   room: 'armory',   message: '{{char}} holds a sword up to the light, examining the edge. "Guild Master. Checking the stock?"' },
  { uid: 'greeting_any_1',      room: 'any',      message: '{{char}} nods as you approach. "Guild Master."' },
  { uid: 'greeting_any_2',      room: 'any',      message: "{{char}} turns to face you. \"I had a feeling you'd seek me out.\"" },
];
function readGreetings(): CharacterGreeting[] { return lsJson<CharacterGreeting[]>(greetingStorageKey, []); }
function writeGreetings(rows: CharacterGreeting[]) { lsSet(greetingStorageKey, JSON.stringify(rows)); }
function ensureGreetingSeeds() { const e = readGreetings(); if (e.length === 0) writeGreetings(GREETING_SEEDS); }

export async function listCharacterGreetings(): Promise<CharacterGreeting[]> {
  if (isElectron) { return eAll<CharacterGreeting>(`SELECT uid, room, message FROM character_greetings ORDER BY room ASC, uid ASC;`); }
  ensureGreetingSeeds(); return readGreetings().sort((a, b) => a.room.localeCompare(b.room) || a.uid.localeCompare(b.uid));
}
export async function insertCharacterGreeting(greeting: CharacterGreeting): Promise<void> {
  if (isElectron) { await eRun(`INSERT INTO character_greetings (uid, room, message) VALUES (?, ?, ?);`, [greeting.uid, greeting.room, greeting.message]); return; }
  writeGreetings([...readGreetings().filter((r) => r.uid !== greeting.uid), greeting]);
}
export async function deleteCharacterGreeting(uid: string): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM character_greetings WHERE uid = ?;`, [uid]); return; }
  writeGreetings(readGreetings().filter((r) => r.uid !== uid));
}
export async function getRandomGreetingForRoom(room: GreetingRoom): Promise<CharacterGreeting | null> {
  if (isElectron) {
    const row = await eGet<CharacterGreeting>(`SELECT uid, room, message FROM character_greetings WHERE room = ? OR room = 'any' ORDER BY RANDOM() LIMIT 1;`, [room]);
    return row ?? null;
  }
  ensureGreetingSeeds();
  const pool = readGreetings().filter((r) => r.room === room || r.room === 'any');
  return pool.length === 0 ? null : pool[Math.floor(Math.random() * pool.length)];
}

// ─── Quest History ────────────────────────────────────────────────────────────

type QuestHistoryRow = { uid: string; character_uid: string; quest_uid: string; quest_title: string; biome: string; difficulty: string; level: number; outcome: string; party_uids: string; party_names: string; summary: string; transcript: string; keywords: string; game_day: number; created_at: string };
function mapQHRow(r: QuestHistoryRow): QuestHistory {
  return { uid: r.uid, characterUid: r.character_uid, questUid: r.quest_uid, questTitle: r.quest_title, biome: r.biome, difficulty: parseQuestDifficulty(r.difficulty), level: r.level, outcome: r.outcome as 'success' | 'failure', partyUids: parseJsonArray(r.party_uids), partyNames: parseJsonArray(r.party_names), summary: r.summary, transcript: r.transcript ?? '', keywords: parseJsonArray(r.keywords), gameDay: r.game_day, createdAt: r.created_at };
}
function readQuestHistory(): QuestHistory[] { return lsJson<QuestHistory[]>(questHistoryStorageKey, []); }
function writeQuestHistory(rows: QuestHistory[]) { lsSet(questHistoryStorageKey, JSON.stringify(rows)); }

export async function insertQuestHistory(row: QuestHistory): Promise<void> {
  if (isElectron) {
    await eRun(
      `INSERT OR REPLACE INTO quest_history (uid, character_uid, quest_uid, quest_title, biome, difficulty, level, outcome, party_uids, party_names, summary, transcript, keywords, game_day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [row.uid, row.characterUid, row.questUid, row.questTitle, row.biome, row.difficulty, row.level, row.outcome, JSON.stringify(row.partyUids), JSON.stringify(row.partyNames), row.summary, row.transcript ?? '', JSON.stringify(row.keywords), row.gameDay, row.createdAt]
    );
    return;
  }
  const rows = readQuestHistory().filter((r) => r.uid !== row.uid); rows.unshift(row); writeQuestHistory(rows);
}
export async function listQuestHistoryForCharacter(characterUid: string, limit = 10): Promise<QuestHistory[]> {
  if (isElectron) { return (await eAll<QuestHistoryRow>(`SELECT * FROM quest_history WHERE character_uid = ? ORDER BY game_day DESC, created_at DESC LIMIT ?;`, [characterUid, limit])).map(mapQHRow); }
  return readQuestHistory().filter((r) => r.characterUid === characterUid).sort((a, b) => b.gameDay - a.gameDay || b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
export async function deleteQuestHistory(uid: string): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM quest_history WHERE uid = ?;`, [uid]); return; }
  writeQuestHistory(readQuestHistory().filter((r) => r.uid !== uid));
}
export async function listRecentQuestHistory(limit = 10): Promise<QuestHistory[]> {
  if (isElectron) {
    return (await eAll<QuestHistoryRow>(`SELECT * FROM quest_history qh WHERE qh.uid = (SELECT MIN(uid) FROM quest_history WHERE quest_uid = qh.quest_uid) ORDER BY game_day DESC, created_at DESC LIMIT ?;`, [limit])).map(mapQHRow);
  }
  const seen = new Set<string>();
  return readQuestHistory()
    .sort((a, b) => b.gameDay - a.gameDay || b.createdAt.localeCompare(a.createdAt))
    .filter((r) => { if (seen.has(r.questUid)) return false; seen.add(r.questUid); return true; })
    .slice(0, limit);
}

// ─── Pending Quest Completions ────────────────────────────────────────────────

type PendingRow = { uid: string; quest_uid: string; quest_title: string; reveal_day: number; outcome: string; party_uids: string; party_names: string; xp_changes: string; gold: number; item_data: string; relationship_delta: number; created_at: string };
function mapPendingRow(r: PendingRow): PendingQuestCompletion {
  return { uid: r.uid, questUid: r.quest_uid, questTitle: r.quest_title, revealDay: r.reveal_day, outcome: r.outcome as 'success' | 'failure', partyUids: parseJsonArray(r.party_uids), partyNames: parseJsonArray(r.party_names), xpChanges: JSON.parse(r.xp_changes) as XpChange[], gold: r.gold, itemData: JSON.parse(r.item_data) as GuildItem[], relationshipDelta: r.relationship_delta, createdAt: r.created_at };
}

const pendingStorageKey = 'pending_quest_completions';
function readPending(): PendingQuestCompletion[] { return lsJson<PendingQuestCompletion[]>(pendingStorageKey, []); }
function writePending(rows: PendingQuestCompletion[]) { lsSet(pendingStorageKey, JSON.stringify(rows)); }

export async function insertPendingQuestCompletion(row: PendingQuestCompletion): Promise<void> {
  if (isElectron) {
    await eRun(
      `INSERT OR REPLACE INTO pending_quest_completions (uid, quest_uid, quest_title, reveal_day, outcome, party_uids, party_names, xp_changes, gold, item_data, relationship_delta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [row.uid, row.questUid, row.questTitle, row.revealDay, row.outcome, JSON.stringify(row.partyUids), JSON.stringify(row.partyNames), JSON.stringify(row.xpChanges), row.gold, JSON.stringify(row.itemData), row.relationshipDelta, row.createdAt]
    );
    return;
  }
  const rows = readPending().filter((r) => r.uid !== row.uid); rows.unshift(row); writePending(rows);
}
export async function listPendingQuestCompletions(): Promise<PendingQuestCompletion[]> {
  if (isElectron) { return (await eAll<PendingRow>(`SELECT * FROM pending_quest_completions ORDER BY reveal_day ASC;`)).map(mapPendingRow); }
  return readPending().sort((a, b) => a.revealDay - b.revealDay);
}
export async function deletePendingQuestCompletion(uid: string): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM pending_quest_completions WHERE uid = ?;`, [uid]); return; }
  writePending(readPending().filter((r) => r.uid !== uid));
}

// ─── Chat History ─────────────────────────────────────────────────────────────

type ChatHistoryRow = { uid: string; character_uid: string; summary: string; transcript: string; keywords: string; game_day: number; created_at: string };
function mapCHRow(r: ChatHistoryRow): ChatHistory {
  return { uid: r.uid, characterUid: r.character_uid, summary: r.summary, transcript: r.transcript ?? '', keywords: parseJsonArray(r.keywords), gameDay: r.game_day, createdAt: r.created_at };
}
function readChatHistory(): ChatHistory[] { return lsJson<ChatHistory[]>(chatHistoryStorageKey, []); }
function writeChatHistory(rows: ChatHistory[]) { lsSet(chatHistoryStorageKey, JSON.stringify(rows)); }

export async function insertChatHistory(row: ChatHistory): Promise<void> {
  if (isElectron) {
    await eRun(
      `INSERT OR REPLACE INTO chat_history (uid, character_uid, summary, transcript, keywords, game_day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [row.uid, row.characterUid, row.summary, row.transcript, JSON.stringify(row.keywords), row.gameDay, row.createdAt]
    );
    return;
  }
  const rows = readChatHistory().filter((r) => r.uid !== row.uid); rows.unshift(row); writeChatHistory(rows);
}
export async function listChatHistoryForCharacter(characterUid: string, limit = 3): Promise<ChatHistory[]> {
  if (isElectron) { return (await eAll<ChatHistoryRow>(`SELECT * FROM chat_history WHERE character_uid = ? ORDER BY game_day DESC, created_at DESC LIMIT ?;`, [characterUid, limit])).map(mapCHRow); }
  return readChatHistory().filter((r) => r.characterUid === characterUid).sort((a, b) => b.gameDay - a.gameDay || b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
export async function deleteChatHistory(uid: string): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM chat_history WHERE uid = ?;`, [uid]); return; }
  writeChatHistory(readChatHistory().filter((r) => r.uid !== uid));
}

// ─── Character Opinions ────────────────────────────────────────────────────────

type OpinionRow = { uid: string; character_uid: string; target_uid: string; target_name: string; opinion: string; keywords: string; game_day: number; created_at: string };
function mapOpinionRow(r: OpinionRow): CharacterOpinion {
  return { uid: r.uid, characterUid: r.character_uid, targetUid: r.target_uid, targetName: r.target_name, opinion: r.opinion, keywords: parseJsonArray(r.keywords), gameDay: r.game_day, createdAt: r.created_at };
}
function readOpinions(): CharacterOpinion[] { return lsJson<CharacterOpinion[]>(opinionStorageKey, []); }
function writeOpinions(rows: CharacterOpinion[]) { lsSet(opinionStorageKey, JSON.stringify(rows)); }

export async function insertCharacterOpinion(row: CharacterOpinion): Promise<void> {
  if (isElectron) {
    await eRun(
      `INSERT OR REPLACE INTO character_opinions (uid, character_uid, target_uid, target_name, opinion, keywords, game_day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [row.uid, row.characterUid, row.targetUid, row.targetName, row.opinion, JSON.stringify(row.keywords), row.gameDay, row.createdAt]
    );
    return;
  }
  const rows = readOpinions().filter((r) => r.uid !== row.uid); rows.unshift(row); writeOpinions(rows);
}
export async function listOpinionsForCharacter(characterUid: string): Promise<CharacterOpinion[]> {
  if (isElectron) { return (await eAll<OpinionRow>(`SELECT * FROM character_opinions WHERE character_uid = ? ORDER BY created_at DESC;`, [characterUid])).map(mapOpinionRow); }
  return readOpinions().filter((r) => r.characterUid === characterUid).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function getOpinion(characterUid: string, targetUid: string): Promise<CharacterOpinion | null> {
  if (isElectron) {
    const row = await eGet<OpinionRow>(`SELECT * FROM character_opinions WHERE character_uid = ? AND target_uid = ? ORDER BY created_at DESC LIMIT 1;`, [characterUid, targetUid]);
    return row ? mapOpinionRow(row) : null;
  }
  return readOpinions().find((r) => r.characterUid === characterUid && r.targetUid === targetUid) ?? null;
}
export async function deleteOpinion(uid: string): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM character_opinions WHERE uid = ?;`, [uid]); return; }
  writeOpinions(readOpinions().filter((r) => r.uid !== uid));
}

export async function deleteAllOpinions(): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM character_opinions;`, []); return; }
  writeOpinions([]);
}

// ─── Mundane Item Types ────────────────────────────────────────────────────────

import { STARTER_MUNDANE_ITEMS } from '@/lib/mundane-items-seed';
import { ROLEPLAY_SEEDS } from '@/lib/roleplay-seeds';
import { GROUP_GREETING_SEEDS } from '@/lib/group-greeting-seeds';
import { GUILD_EVENT_SEEDS } from '@/lib/guild-event-seeds';

let _mundaneNextId = 1;
const _mundaneItems: Map<number, MundaneItemType> = new Map();

function ensureMundaneSeeded() {
  if (_mundaneItems.size === 0) {
    for (const item of STARTER_MUNDANE_ITEMS) {
      const id = _mundaneNextId++;
      _mundaneItems.set(id, { id, name: item.name, slot: item.slot, description: item.description, className: item.class_name, isStarter: true });
    }
  }
}

type MundaneTypeRow = { id: number; name: string; slot: string; description: string; class_name: string | null; is_starter: number };
function mapMundaneRow(r: MundaneTypeRow): MundaneItemType {
  return { id: r.id, name: r.name, slot: r.slot, description: r.description, className: r.class_name, isStarter: r.is_starter === 1 };
}

export async function listMundaneItemTypes(): Promise<MundaneItemType[]> {
  if (isElectron) { return (await eAll<MundaneTypeRow>(`SELECT * FROM mundane_item_types ORDER BY class_name, slot, name;`)).map(mapMundaneRow); }
  ensureMundaneSeeded(); return Array.from(_mundaneItems.values()).sort((a, b) => (a.className ?? '').localeCompare(b.className ?? '') || a.slot.localeCompare(b.slot) || a.name.localeCompare(b.name));
}
export async function listMundaneItemTypesByClass(className: string): Promise<MundaneItemType[]> {
  if (isElectron) { return (await eAll<MundaneTypeRow>(`SELECT * FROM mundane_item_types WHERE class_name = ? OR class_name IS NULL ORDER BY slot, name;`, [className])).map(mapMundaneRow); }
  ensureMundaneSeeded(); return Array.from(_mundaneItems.values()).filter((i) => i.className === className || i.className === null);
}
export async function insertMundaneItemType(name: string, slot: string, description: string, className: string | null): Promise<number> {
  if (isElectron) { const r = await eRun(`INSERT INTO mundane_item_types (name, slot, description, class_name, is_starter) VALUES (?, ?, ?, ?, 0);`, [name, slot, description, className]); return r.lastInsertRowId; }
  ensureMundaneSeeded(); const id = _mundaneNextId++; _mundaneItems.set(id, { id, name, slot, description, className, isStarter: false }); return id;
}
export async function updateMundaneItemType(id: number, name: string, slot: string, description: string, className: string | null): Promise<void> {
  if (isElectron) { await eRun(`UPDATE mundane_item_types SET name = ?, slot = ?, description = ?, class_name = ? WHERE id = ? AND is_starter = 0;`, [name, slot, description, className, id]); return; }
  const e = _mundaneItems.get(id); if (e && !e.isStarter) _mundaneItems.set(id, { ...e, name, slot, description, className });
}
export async function deleteMundaneItemType(id: number): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM mundane_item_types WHERE id = ? AND is_starter = 0;`, [id]); return; }
  const e = _mundaneItems.get(id); if (e && !e.isStarter) _mundaneItems.delete(id);
}
export async function seedStarterMundaneItems(): Promise<number> {
  if (isElectron) {
    let count = 0;
    for (const item of STARTER_MUNDANE_ITEMS) {
      const r = await eRun(`INSERT OR IGNORE INTO mundane_item_types (name, slot, description, class_name, is_starter) VALUES (?, ?, ?, ?, 1);`, [item.name, item.slot, item.description, item.class_name]);
      count += r.changes;
    }
    return count;
  }
  ensureMundaneSeeded(); return _mundaneItems.size;
}

// ─── Mundane Inventory ─────────────────────────────────────────────────────────

type MundaneInvRow = { id: number; character_uid: string; item_type_id: number; name: string; slot: string; description: string; class_name: string | null };
function mapMundaneInvRow(r: MundaneInvRow): MundaneInventoryItem {
  return { id: r.id, characterUid: r.character_uid, itemTypeId: r.item_type_id, name: r.name, slot: r.slot, description: r.description, className: r.class_name };
}

export async function listMundaneInventory(characterUid: string): Promise<MundaneInventoryItem[]> {
  if (isElectron) { return (await eAll<MundaneInvRow>(`SELECT mi.id, mi.character_uid, mi.item_type_id, mt.name, mt.slot, COALESCE(mi.description_override, mt.description) AS description, mt.class_name FROM mundane_inventory mi JOIN mundane_item_types mt ON mt.id = mi.item_type_id WHERE mi.character_uid = ? ORDER BY mt.slot, mt.name;`, [characterUid])).map(mapMundaneInvRow); }
  return [];
}
export async function addToMundaneInventory(characterUid: string, itemTypeId: number): Promise<number> {
  if (isElectron) { const r = await eRun(`INSERT INTO mundane_inventory (character_uid, item_type_id) VALUES (?, ?);`, [characterUid, itemTypeId]); return r.lastInsertRowId; }
  return 0;
}
export async function removeMundaneInventoryItem(id: number): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM mundane_inventory WHERE id = ?;`, [id]); }
}

// ─── Physical Description Pool ────────────────────────────────────────────────

export type PhysDescItem = { id: number; category: string; value: string };

/** Returns all items in the pool for a given category. */
export async function listPhysDescByCategory(category: string): Promise<PhysDescItem[]> {
  if (isElectron) {
    return eAll<PhysDescItem>(
      `SELECT id, category, value FROM phys_desc_pool WHERE category = ? ORDER BY value;`,
      [category],
    );
  }
  return [];
}

/** Returns every item in the pool, all categories. */
export async function listPhysDescAll(): Promise<PhysDescItem[]> {
  if (isElectron) {
    return eAll<PhysDescItem>(`SELECT id, category, value FROM phys_desc_pool ORDER BY category, value;`);
  }
  return [];
}

export async function updateCharacterPhysDesc(uid: string, physDesc: string[]): Promise<void> {
  if (isElectron) {
    await eRun(`UPDATE characters SET physDesc = ? WHERE uid = ?;`, [JSON.stringify(physDesc), uid]);
  }
}

// ─── Outfit Sets ───────────────────────────────────────────────────────────────

type OutfitSetRow = { id: number; character_uid: string; name: string; context: string; image_path: string | null };
function mapOutfitSetRow(r: OutfitSetRow): OutfitSet { return { id: r.id, characterUid: r.character_uid, name: r.name, context: r.context ?? 'any', imagePath: r.image_path ?? null }; }

export async function listOutfitSets(characterUid: string): Promise<OutfitSet[]> {
  if (isElectron) { return (await eAll<OutfitSetRow>(`SELECT * FROM outfit_sets WHERE character_uid = ? ORDER BY name;`, [characterUid])).map(mapOutfitSetRow); }
  return [];
}
export async function insertOutfitSet(characterUid: string, name: string, context = 'any'): Promise<number> {
  if (isElectron) { const r = await eRun(`INSERT INTO outfit_sets (character_uid, name, context) VALUES (?, ?, ?);`, [characterUid, name, context]); return r.lastInsertRowId; }
  return 0;
}
export async function updateOutfitSetDetails(id: number, name: string, context: string): Promise<void> {
  if (isElectron) { await eRun(`UPDATE outfit_sets SET name = ?, context = ? WHERE id = ?;`, [name, context, id]); }
}
export async function updateOutfitImage(id: number, imagePath: string): Promise<void> {
  if (isElectron) { await eRun(`UPDATE outfit_sets SET image_path = ? WHERE id = ?;`, [imagePath, id]); }
}
export async function getActiveOutfitForRoom(characterUid: string, room: string, gameDay: number): Promise<OutfitSet | null> {
  if (!isElectron) return null;
  const outfits = await listOutfitSets(characterUid);
  const matching = outfits.filter((o) => o.context === room || o.context === 'any');
  if (matching.length === 0) return null;
  const uidSum = characterUid.split('').reduce((n, c) => n + c.charCodeAt(0), 0);
  return matching[(gameDay + uidSum) % matching.length];
}

/** Returns the outfit image for the character's current room if one exists, otherwise their base avatarPath. */
export async function resolveEffectiveAvatarPath(
  character: GuildCharacter,
  room: string,
  gameDay: number,
): Promise<string | null> {
  const activeOutfit = await getActiveOutfitForRoom(character.uid, room, gameDay);
  return activeOutfit?.imagePath ?? character.avatarPath ?? null;
}
export async function renameOutfitSet(id: number, name: string): Promise<void> {
  if (isElectron) { await eRun(`UPDATE outfit_sets SET name = ? WHERE id = ?;`, [name, id]); }
}
export async function deleteOutfitSet(id: number): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM outfit_sets WHERE id = ?;`, [id]); }
}
export async function getOutfitForDay(characterUid: string, gameDay: number): Promise<OutfitSet | null> {
  if (isElectron) {
    const outfits = await listOutfitSets(characterUid);
    if (outfits.length === 0) return null;
    const uidSum = characterUid.split('').reduce((n, c) => n + c.charCodeAt(0), 0);
    return outfits[(gameDay + uidSum) % outfits.length];
  }
  return null;
}

// ─── Outfit Items ──────────────────────────────────────────────────────────────

type OutfitItemRow = { id: number; outfit_set_id: number; inventory_item_id: number; slot: string; name: string; description: string };
function mapOutfitItemRow(r: OutfitItemRow): OutfitItem { return { id: r.id, outfitSetId: r.outfit_set_id, inventoryItemId: r.inventory_item_id, slot: r.slot, name: r.name, description: r.description }; }

export async function listOutfitItems(outfitSetId: number): Promise<OutfitItem[]> {
  if (isElectron) { return (await eAll<OutfitItemRow>(`SELECT oi.id, oi.outfit_set_id, oi.inventory_item_id, oi.slot, mt.name, COALESCE(mi.description_override, mt.description) AS description FROM outfit_items oi JOIN mundane_inventory mi ON mi.id = oi.inventory_item_id JOIN mundane_item_types mt ON mt.id = mi.item_type_id WHERE oi.outfit_set_id = ? ORDER BY oi.slot;`, [outfitSetId])).map(mapOutfitItemRow); }
  return [];
}
export async function setOutfitItem(outfitSetId: number, inventoryItemId: number, slot: string): Promise<void> {
  if (isElectron) { await eRun(`INSERT INTO outfit_items (outfit_set_id, inventory_item_id, slot) VALUES (?, ?, ?) ON CONFLICT(outfit_set_id, slot) DO UPDATE SET inventory_item_id = excluded.inventory_item_id;`, [outfitSetId, inventoryItemId, slot]); }
}
export async function removeOutfitItem(outfitSetId: number, slot: string): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM outfit_items WHERE outfit_set_id = ? AND slot = ?;`, [outfitSetId, slot]); }
}

// ─── Guild-item ↔ character transfers ─────────────────────────────────────────

/** Move one instance from the guild pool into a character's personal inventory. */
export async function assignGuildItemToCharacter(guildInvId: number, characterUid: string): Promise<void> {
  if (!isElectron) return;
  const row = await eGet<{ item_type_id: number; description_override: string | null }>(`SELECT item_type_id, description_override FROM guild_mundane_inventory WHERE id = ?;`, [guildInvId]);
  if (!row) throw new Error('Item not found in guild inventory.');
  await eRun(`INSERT INTO mundane_inventory (character_uid, item_type_id, description_override) VALUES (?, ?, ?);`, [characterUid, row.item_type_id, row.description_override ?? null]);
  await eRun(`DELETE FROM guild_mundane_inventory WHERE id = ?;`, [guildInvId]);
}

/** Remove a mundane inventory item from a character and return it to the guild pool. */
export async function returnItemToGuildPool(mundaneInvId: number): Promise<void> {
  if (!isElectron) return;
  const row = await eGet<{ item_type_id: number; description_override: string | null }>(`SELECT item_type_id, description_override FROM mundane_inventory WHERE id = ?;`, [mundaneInvId]);
  if (!row) throw new Error('Item not found in character inventory.');
  // Remove from any outfit slots first to avoid FK constraint errors
  await eRun(`DELETE FROM outfit_items WHERE inventory_item_id = ?;`, [mundaneInvId]);
  await eRun(`DELETE FROM mundane_inventory WHERE id = ?;`, [mundaneInvId]);
  await eRun(`INSERT INTO guild_mundane_inventory (item_type_id, description_override) VALUES (?, ?);`, [row.item_type_id, row.description_override ?? null]);
}

// ─── Item colour variety ──────────────────────────────────────────────────────

const _ITEM_COLORS = [
  'deep crimson','forest green','midnight blue','warm amber','ivory white',
  'charcoal grey','burgundy red','teal','slate blue','russet brown',
  'pale lavender','dark purple','dusty rose','olive green','burnt orange',
  'deep navy','dark maroon','sage green','ash grey','ochre yellow',
  'cobalt blue','copper-brown','off-white','jade green','blood red',
];

const _ITEM_TRIMS = [
  'gold trim','silver trim','copper rivets','brass buckles',
  'black leather edging','white fur lining','red stitching',
  'blue embroidery','iron studs','bone clasps','dark thread piping',
];

const _GEM_ACCENTS = [
  'set with a ruby','set with a sapphire','set with an emerald',
  'set with an amber stone','set with obsidian','inlaid with jade',
  'set with a garnet','with a pearl inlay','set with amethyst',
  'set with a moonstone',
];

function _pickColorSuffix(slot: string): string {
  if (slot === 'weapon' || slot === 'offhand') return '';
  const isAccessory = slot === 'neck' || slot === 'ring' || slot === 'wrist';
  if (isAccessory) {
    return ` ${_GEM_ACCENTS[Math.floor(Math.random() * _GEM_ACCENTS.length)]}`;
  }
  const primary = _ITEM_COLORS[Math.floor(Math.random() * _ITEM_COLORS.length)];
  if (Math.random() < 0.5) {
    const trim = _ITEM_TRIMS[Math.floor(Math.random() * _ITEM_TRIMS.length)];
    return `, coloured in ${primary} with ${trim}`;
  }
  return `, coloured in ${primary}`;
}

// ─── Guild Shop Inventory ──────────────────────────────────────────────────────

type GuildShopInvRow = { id: number; item_type_id: number; name: string; slot: string; description: string; class_name: string | null; purchased_at: string };
function mapGuildShopRow(r: GuildShopInvRow): GuildShopInventoryItem {
  return { id: r.id, itemTypeId: r.item_type_id, name: r.name, slot: r.slot, description: r.description, className: r.class_name, purchasedAt: r.purchased_at };
}

export async function listGuildShopInventory(): Promise<GuildShopInventoryItem[]> {
  if (isElectron) {
    return (await eAll<GuildShopInvRow>(`
      SELECT g.id, g.item_type_id, mt.name, mt.slot,
             COALESCE(g.description_override, mt.description) AS description,
             mt.class_name, g.purchased_at
      FROM guild_mundane_inventory g
      JOIN mundane_item_types mt ON mt.id = g.item_type_id
      ORDER BY g.purchased_at DESC, mt.slot, mt.name;
    `)).map(mapGuildShopRow);
  }
  return [];
}

export async function addToGuildShopInventory(itemTypeId: number): Promise<number> {
  if (isElectron) {
    const itemType = await eGet<{ slot: string; description: string }>(`SELECT slot, description FROM mundane_item_types WHERE id = ?;`, [itemTypeId]);
    const descOverride = itemType ? itemType.description + _pickColorSuffix(itemType.slot) : null;
    const r = await eRun(`INSERT INTO guild_mundane_inventory (item_type_id, description_override) VALUES (?, ?);`, [itemTypeId, descOverride]);
    return r.lastInsertRowId;
  }
  return 0;
}

export async function removeFromGuildShopInventory(id: number): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM guild_mundane_inventory WHERE id = ?;`, [id]); }
}

// ─── Character Relationships ──────────────────────────────────────────────────

export type CharacterRelationship = {
  charA: string;
  charB: string;
  score: number;
};

/**
 * Maps a relationship score to a human-readable label for LLM context.
 * Scores range from -100 to +100.
 */
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

/** Canonical key pair: always store with the lexicographically smaller uid as charA. */
function relKey(uidA: string, uidB: string): [string, string] {
  return uidA < uidB ? [uidA, uidB] : [uidB, uidA];
}

// Web (localStorage) storage helpers
const REL_STORAGE_KEY = 'character_relationships';
type RelMap = Record<string, number>; // "charA|charB" -> score

function readRelMap(): RelMap {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(REL_STORAGE_KEY) : null;
    return raw ? (JSON.parse(raw) as RelMap) : {};
  } catch { return {}; }
}

function writeRelMap(map: RelMap): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(REL_STORAGE_KEY, JSON.stringify(map));
}

export async function getRelationship(uidA: string, uidB: string): Promise<number> {
  const [a, b] = relKey(uidA, uidB);
  if (isElectron) {
    const row = await eGet<{ score: number }>(`SELECT score FROM character_relationships WHERE char_a = ? AND char_b = ?;`, [a, b]);
    return row?.score ?? 0;
  }
  return readRelMap()[`${a}|${b}`] ?? 0;
}

export async function adjustRelationship(uidA: string, uidB: string, delta: number): Promise<void> {
  const [a, b] = relKey(uidA, uidB);
  if (isElectron) {
    await eRun(
      `INSERT INTO character_relationships (char_a, char_b, score) VALUES (?, ?, ?)
       ON CONFLICT(char_a, char_b) DO UPDATE SET score = score + excluded.score;`,
      [a, b, delta],
    );
    return;
  }
  const map = readRelMap();
  map[`${a}|${b}`] = (map[`${a}|${b}`] ?? 0) + delta;
  writeRelMap(map);
}

export async function setRelationshipScore(uidA: string, uidB: string, score: number): Promise<void> {
  const [a, b] = relKey(uidA, uidB);
  if (isElectron) {
    await eRun(
      `INSERT INTO character_relationships (char_a, char_b, score) VALUES (?, ?, ?)
       ON CONFLICT(char_a, char_b) DO UPDATE SET score = excluded.score;`,
      [a, b, score],
    );
    return;
  }
  const map = readRelMap();
  map[`${a}|${b}`] = score;
  writeRelMap(map);
}

export async function listRelationshipsForCharacter(uid: string): Promise<CharacterRelationship[]> {
  if (isElectron) {
    const rows = await eAll<{ char_a: string; char_b: string; score: number }>(
      `SELECT char_a, char_b, score FROM character_relationships WHERE char_a = ? OR char_b = ? ORDER BY score DESC;`,
      [uid, uid],
    );
    return rows.map((r) => ({ charA: r.char_a, charB: r.char_b, score: r.score }));
  }
  const map = readRelMap();
  return Object.entries(map)
    .filter(([key]) => { const [a, b] = key.split('|'); return a === uid || b === uid; })
    .map(([key, score]) => { const [a, b] = key.split('|'); return { charA: a, charB: b, score }; })
    .sort((x, y) => y.score - x.score);
}

// ─── Group Greetings ──────────────────────────────────────────────────────────

export type GroupGreeting = {
  uid: string;
  text: string;
  active: boolean;
};

const groupGreetingStorageKey = 'group_greetings';

function readGroupGreetings(): GroupGreeting[] {
  return lsJson<GroupGreeting[]>(groupGreetingStorageKey, []);
}
function writeGroupGreetings(gs: GroupGreeting[]) { lsSet(groupGreetingStorageKey, JSON.stringify(gs)); }
function ensureGroupGreetingSeedRows() {
  const existing = readGroupGreetings();
  const byUid = new Map(existing.map((g) => [g.uid, g]));
  for (const s of GROUP_GREETING_SEEDS) {
    if (!byUid.has(s.uid)) byUid.set(s.uid, { uid: s.uid, text: s.text, active: true });
  }
  writeGroupGreetings(Array.from(byUid.values()));
}

export async function listGroupGreetings(): Promise<GroupGreeting[]> {
  if (isElectron) { return await eAll<GroupGreeting>(`SELECT uid, text, active FROM group_greetings ORDER BY uid ASC;`); }
  ensureGroupGreetingSeedRows(); return readGroupGreetings().sort((a, b) => a.uid.localeCompare(b.uid));
}
export async function listActiveGroupGreetings(): Promise<GroupGreeting[]> {
  if (isElectron) { return await eAll<GroupGreeting>(`SELECT uid, text, active FROM group_greetings WHERE active = 1 ORDER BY uid ASC;`); }
  ensureGroupGreetingSeedRows(); return readGroupGreetings().filter((g) => g.active);
}
export async function insertGroupGreeting(greeting: GroupGreeting): Promise<void> {
  if (isElectron) { await eRun(`INSERT INTO group_greetings (uid, text, active) VALUES (?, ?, ?);`, [greeting.uid, greeting.text, greeting.active ? 1 : 0]); return; }
  const gs = readGroupGreetings(); gs.push(greeting); writeGroupGreetings(gs);
}
export async function updateGroupGreetingActive(uid: string, active: boolean): Promise<void> {
  if (isElectron) { await eRun(`UPDATE group_greetings SET active = ? WHERE uid = ?;`, [active ? 1 : 0, uid]); return; }
  writeGroupGreetings(readGroupGreetings().map((g) => (g.uid === uid ? { ...g, active } : g)));
}
export async function deleteGroupGreeting(uid: string): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM group_greetings WHERE uid = ?;`, [uid]); return; }
  writeGroupGreetings(readGroupGreetings().filter((g) => g.uid !== uid));
}

// ─── Guild Event Seeds ────────────────────────────────────────────────────────

export type GuildEventSeed = {
  uid: string;
  text: string;
  active: boolean;
  relationshipDelta: number;
  useCommonQuest: boolean;
};

const guildEventStorageKey = 'guild_event_seeds';
type GuildEventRow = { uid: string; text: string; active: number | boolean; relationship_delta?: number; use_common_quest?: number | boolean; relationshipDelta?: number; useCommonQuest?: boolean };
function mapGuildEventRow(r: GuildEventRow): GuildEventSeed {
  return {
    uid: r.uid, text: r.text,
    active: typeof r.active === 'boolean' ? r.active : r.active === 1,
    relationshipDelta: (r.relationship_delta ?? r.relationshipDelta) as number ?? 0,
    useCommonQuest: typeof r.use_common_quest === 'boolean' ? r.use_common_quest : (r.use_common_quest === 1 || r.useCommonQuest === true),
  };
}
function readGuildEventSeeds(): GuildEventSeed[] { return lsJson<GuildEventSeed[]>(guildEventStorageKey, []).map(mapGuildEventRow); }
function writeGuildEventSeeds(seeds: GuildEventSeed[]) { lsSet(guildEventStorageKey, JSON.stringify(seeds)); }
function ensureGuildEventSeedRows() {
  const existing = readGuildEventSeeds();
  const byUid = new Map(existing.map((s) => [s.uid, s]));
  for (const s of GUILD_EVENT_SEEDS) {
    if (!byUid.has(s.uid)) byUid.set(s.uid, { uid: s.uid, text: s.text, active: true, relationshipDelta: s.relationshipDelta, useCommonQuest: s.useCommonQuest });
  }
  writeGuildEventSeeds(Array.from(byUid.values()));
}

export async function listGuildEventSeeds(): Promise<GuildEventSeed[]> {
  if (isElectron) { return (await eAll<GuildEventRow>(`SELECT uid, text, active, relationship_delta, use_common_quest FROM guild_event_seeds ORDER BY uid ASC;`)).map(mapGuildEventRow); }
  ensureGuildEventSeedRows(); return readGuildEventSeeds();
}
export async function listActiveGuildEventSeeds(): Promise<GuildEventSeed[]> {
  if (isElectron) { return (await eAll<GuildEventRow>(`SELECT uid, text, active, relationship_delta, use_common_quest FROM guild_event_seeds WHERE active = 1 ORDER BY uid ASC;`)).map(mapGuildEventRow); }
  ensureGuildEventSeedRows(); return readGuildEventSeeds().filter((s) => s.active);
}
export async function insertGuildEventSeed(seed: GuildEventSeed): Promise<void> {
  if (isElectron) { await eRun(`INSERT INTO guild_event_seeds (uid, text, active, relationship_delta, use_common_quest) VALUES (?, ?, ?, ?, ?);`, [seed.uid, seed.text, seed.active ? 1 : 0, seed.relationshipDelta, seed.useCommonQuest ? 1 : 0]); return; }
  const seeds = readGuildEventSeeds(); seeds.push(seed); writeGuildEventSeeds(seeds);
}
export async function updateGuildEventSeedActive(uid: string, active: boolean): Promise<void> {
  if (isElectron) { await eRun(`UPDATE guild_event_seeds SET active = ? WHERE uid = ?;`, [active ? 1 : 0, uid]); return; }
  writeGuildEventSeeds(readGuildEventSeeds().map((s) => (s.uid === uid ? { ...s, active } : s)));
}
export async function updateGuildEventSeedDelta(uid: string, delta: number): Promise<void> {
  if (isElectron) { await eRun(`UPDATE guild_event_seeds SET relationship_delta = ? WHERE uid = ?;`, [delta, uid]); return; }
  writeGuildEventSeeds(readGuildEventSeeds().map((s) => (s.uid === uid ? { ...s, relationshipDelta: delta } : s)));
}
export async function updateGuildEventSeedUseCommonQuest(uid: string, useCommonQuest: boolean): Promise<void> {
  if (isElectron) { await eRun(`UPDATE guild_event_seeds SET use_common_quest = ? WHERE uid = ?;`, [useCommonQuest ? 1 : 0, uid]); return; }
  writeGuildEventSeeds(readGuildEventSeeds().map((s) => (s.uid === uid ? { ...s, useCommonQuest } : s)));
}
export async function deleteGuildEventSeed(uid: string): Promise<void> {
  if (isElectron) { await eRun(`DELETE FROM guild_event_seeds WHERE uid = ?;`, [uid]); return; }
  writeGuildEventSeeds(readGuildEventSeeds().filter((s) => s.uid !== uid));
}

// ─── Rumours ──────────────────────────────────────────────────────────────────

type RumourRow = { uid: string; text: string; keywords: string; game_day: number; known_by: string; used: number; created_at: string };
function mapRumourRow(r: RumourRow): Rumour {
  return { uid: r.uid, text: r.text, keywords: parseJsonArray(r.keywords), gameDay: r.game_day, knownBy: parseJsonArray(r.known_by), used: r.used === 1, createdAt: r.created_at };
}

const rumourStorageKey = 'rumours';
function readRumours(): Rumour[] { return lsJson<Rumour[]>(rumourStorageKey, []); }
function writeRumours(rows: Rumour[]) { lsSet(rumourStorageKey, JSON.stringify(rows)); }

export async function insertRumour(row: Rumour): Promise<void> {
  if (isElectron) {
    await eRun(
      `INSERT OR REPLACE INTO rumours (uid, text, keywords, game_day, known_by, used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [row.uid, row.text, JSON.stringify(row.keywords), row.gameDay, JSON.stringify(row.knownBy), row.used ? 1 : 0, row.createdAt]
    );
    return;
  }
  const rows = readRumours().filter((r) => r.uid !== row.uid); rows.unshift(row); writeRumours(rows);
}

export async function listActiveRumours(): Promise<Rumour[]> {
  if (isElectron) { return (await eAll<RumourRow>(`SELECT * FROM rumours WHERE used = 0 ORDER BY game_day DESC;`)).map(mapRumourRow); }
  return readRumours().filter((r) => !r.used).sort((a, b) => b.gameDay - a.gameDay);
}

export async function listRumoursKnownBy(characterUid: string): Promise<Rumour[]> {
  if (isElectron) { return (await eAll<RumourRow>(`SELECT * FROM rumours ORDER BY game_day DESC;`)).map(mapRumourRow).filter((r) => r.knownBy.includes(characterUid)); }
  return readRumours().filter((r) => r.knownBy.includes(characterUid)).sort((a, b) => b.gameDay - a.gameDay);
}

export async function markRumourUsed(uid: string): Promise<void> {
  if (isElectron) { await eRun(`UPDATE rumours SET used = 1 WHERE uid = ?;`, [uid]); return; }
  writeRumours(readRumours().map((r) => r.uid === uid ? { ...r, used: true } : r));
}

export async function initCharacterMundaneItems(characterUid: string, className: string): Promise<void> {
  if (!isElectron) return;
  const types = await eAll<{ id: number; slot: string; description: string }>(`SELECT id, slot, description FROM mundane_item_types WHERE class_name = ? COLLATE NOCASE AND is_starter = 1;`, [className]);
  if (types.length === 0) { console.error('[initCharacterMundaneItems] No starter items found for class:', className); return; }
  const slotToInventoryId: Record<string, number> = {};
  for (const t of types) {
    const colorSuffix = _pickColorSuffix(t.slot);
    const descOverride = colorSuffix ? t.description + colorSuffix : null;
    const r = await eRun(`INSERT INTO mundane_inventory (character_uid, item_type_id, description_override) VALUES (?, ?, ?);`, [characterUid, t.id, descOverride]);
    slotToInventoryId[t.slot] = r.lastInsertRowId;
  }
  const outfitResult = await eRun(`INSERT INTO outfit_sets (character_uid, name) VALUES (?, 'Default');`, [characterUid]);
  const outfitId = outfitResult.lastInsertRowId;
  for (const [slot, inventoryId] of Object.entries(slotToInventoryId)) {
    await eRun(`INSERT INTO outfit_items (outfit_set_id, inventory_item_id, slot) VALUES (?, ?, ?);`, [outfitId, inventoryId, slot]);
  }
}
