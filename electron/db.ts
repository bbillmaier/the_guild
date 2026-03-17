/**
 * Electron main-process database module.
 * Uses sql.js (pure WASM — no native compilation) with the same schema as
 * local-db.native.ts (V1-V21).
 *
 * sql.js loads the entire database into memory, so we persist to disk after
 * every write.  For a small game database this is fast and safe.
 */

import path from 'path';
import fs from 'fs';
import { app, ipcMain } from 'electron';
import type { Database as SqlDatabase, SqlJsStatic, BindParams } from 'sql.js';
import { STARTER_MUNDANE_ITEMS } from '../lib/mundane-items-seed';
import { PHYS_DESC_SEED } from '../lib/phys-desc-seed';
import { ROLEPLAY_SEEDS } from '../lib/roleplay-seeds';
import { GROUP_GREETING_SEEDS } from '../lib/group-greeting-seeds';
import { GUILD_EVENT_SEEDS } from '../lib/guild-event-seeds';

// ─── State ────────────────────────────────────────────────────────────────────

let _db: SqlDatabase | null = null;
let _dbPath = '';

function getDb(): SqlDatabase {
  if (!_db) throw new Error('Database not initialised');
  return _db;
}

/** Write current DB state to disk. Called after every write operation. */
function persist(): void {
  const data = getDb().export();
  fs.writeFileSync(_dbPath, Buffer.from(data));
}

// ─── Low-level helpers ────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function _all<T = Row>(sql: string, params?: unknown[]): T[] {
  const stmt = getDb().prepare(sql);
  if (params && params.length > 0) stmt.bind(params as BindParams);
  const rows: T[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as unknown as T);
  stmt.free();
  return rows;
}

function _get<T = Row>(sql: string, params?: unknown[]): T | null {
  const stmt = getDb().prepare(sql);
  if (params && params.length > 0) stmt.bind(params as BindParams);
  let row: T | null = null;
  if (stmt.step()) row = stmt.getAsObject() as unknown as T;
  stmt.free();
  return row;
}

function _run(sql: string, params?: unknown[]): { lastInsertRowId: number; changes: number } {
  const db = getDb();
  if (params && params.length > 0) {
    db.run(sql, params as BindParams);
  } else {
    db.run(sql);
  }
  const lastInsertRowId = (db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] as number) ?? 0;
  const changes = (db.exec('SELECT changes()')[0]?.values[0][0] as number) ?? 0;
  return { lastInsertRowId, changes };
}

/** Execute multi-statement SQL (CREATE TABLE blocks, etc.) without persisting. */
function _exec(sql: string): void {
  getDb().exec(sql);
}

// ─── Init & migrations ────────────────────────────────────────────────────────

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData');
  _dbPath = path.join(userDataPath, 'guild.db');
  console.log('[db] Opening database at', _dbPath);

  // Dynamically require sql.js so it runs in the CommonJS main-process context.
  // locateFile tells sql.js where to find sql-wasm.wasm.
  const initSqlJs = (await import('sql.js')).default as (config?: object) => Promise<SqlJsStatic>;
  const sqlJsDistDir = path.dirname(require.resolve('sql.js'));
  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      // In a packaged ASAR, WASM files are unpacked to app.asar.unpacked/
      const packed = path.join(sqlJsDistDir, file);
      const unpacked = packed.replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);
      return fs.existsSync(unpacked) ? unpacked : packed;
    },
  });

  let dbData: Buffer | undefined;
  try { dbData = fs.readFileSync(_dbPath); } catch { /* first run */ }

  _db = dbData ? new SQL.Database(dbData) : new SQL.Database();

  runMigrations();
  persist(); // save after all migrations
  console.log('[db] Database ready');
}

function runMigrations(): void {
  _exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      version INTEGER NOT NULL
    );
    INSERT OR IGNORE INTO schema_migrations (id, version) VALUES (1, 0);
  `);

  let version = (_get<{ version: number }>('SELECT version FROM schema_migrations WHERE id = 1;'))?.version ?? 0;

  function bump(n: number, fn: () => void) {
    if (version < n) {
      fn();
      version = n;
      _run('UPDATE schema_migrations SET version = ? WHERE id = 1;', [n]);
    }
  }

  bump(1,  migrateV1);
  bump(2,  migrateV2);
  bump(3,  migrateV3);
  bump(4,  migrateV4);
  bump(5,  migrateV5);
  bump(6,  migrateV6);
  bump(7,  migrateV7);
  bump(8,  migrateV8);
  bump(9,  migrateV9);
  bump(10, migrateV10);
  bump(11, migrateV11);
  bump(12, migrateV12);
  bump(13, migrateV13);
  bump(14, migrateV14);
  bump(15, migrateV15);
  bump(16, migrateV16);
  bump(17, migrateV17);
  bump(18, migrateV18);
  bump(19, migrateV19);
  bump(20, migrateV20);
  bump(21, migrateV21);
  bump(22, migrateV22);
  bump(23, migrateV23);
  bump(24, migrateV24);
  bump(25, migrateV25);
  bump(26, migrateV26);
  bump(27, migrateV27);
  bump(28, migrateV28);
  bump(29, migrateV29);
  bump(30, migrateV30);
  bump(31, migrateV31);
  bump(32, migrateV32);
  bump(33, migrateV33);
  bump(34, migrateV34);

  ensureMetaDescSeeds();
  ensurePhysDescSeeds();
  console.log(`[db] Migrations complete (version ${version})`);
}

// ─── Migration functions ──────────────────────────────────────────────────────

function migrateV1() {
  _exec(`
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

function migrateV2() {
  const cols = _all<{ name: string }>(`PRAGMA table_info(characters)`);
  if (!cols.some((c) => c.name === 'gender'))
    _exec(`ALTER TABLE characters ADD COLUMN gender TEXT NOT NULL DEFAULT 'unknown';`);
}

function migrateV3() {
  _exec(`
    CREATE TABLE IF NOT EXISTS metaDesc (
      uid TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      stat TEXT,
      mode INTEGER,
      description TEXT NOT NULL DEFAULT ''
    );
  `);
}

function migrateV4() { ensureMetaDescSeeds(); }

function migrateV5() {
  const cols = _all<{ name: string }>(`PRAGMA table_info(characters)`);
  if (!cols.some((c) => c.name === 'hp'))
    _exec(`ALTER TABLE characters ADD COLUMN hp INTEGER NOT NULL DEFAULT 10;`);
  const rows = _all<{ uid: string; constitution: number }>('SELECT uid, constitution FROM characters;');
  for (const row of rows) {
    _run('UPDATE characters SET hp = ? WHERE uid = ?;', [10 + Math.floor((row.constitution - 10) / 2), row.uid]);
  }
}

function migrateV6() {
  _exec(`
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

function migrateV7() {
  const cc = _all<{ name: string }>(`PRAGMA table_info(characters)`);
  if (!cc.some((c) => c.name === 'level'))   _exec(`ALTER TABLE characters ADD COLUMN level INTEGER NOT NULL DEFAULT 1;`);
  if (!cc.some((c) => c.name === 'experience')) _exec(`ALTER TABLE characters ADD COLUMN experience INTEGER NOT NULL DEFAULT 0;`);
  const ec = _all<{ name: string }>(`PRAGMA table_info(enemies)`);
  if (!ec.some((c) => c.name === 'level'))   _exec(`ALTER TABLE enemies ADD COLUMN level INTEGER NOT NULL DEFAULT 1;`);
}

function migrateV8() {
  _exec(`
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

function migrateV9() {
  const cols = _all<{ name: string }>(`PRAGMA table_info(items)`);
  if (!cols.some((c) => c.name === 'character_uid'))
    _exec(`ALTER TABLE items ADD COLUMN character_uid TEXT;`);
}

function migrateV10() {
  _exec(`
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

function migrateV11() {
  const cols = _all<{ name: string }>(`PRAGMA table_info(quests)`);
  if (!cols.some((c) => c.name === 'narrative'))
    _exec(`ALTER TABLE quests ADD COLUMN narrative TEXT NOT NULL DEFAULT '';`);
}

function migrateV12() {
  _exec(`
    CREATE TABLE IF NOT EXISTS roleplay_prompts (
      uid TEXT PRIMARY KEY NOT NULL,
      text TEXT NOT NULL,
      category TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
  `);
  const general = ["The party pauses to catch their breath. One character tends to another's wounds while they talk.",'A disagreement breaks out between party members about the best way to handle what lies ahead.','One character cracks a dark joke to break the tension. The others react in their own ways.','A quieter member of the party opens up, sharing something about why they took this quest.','Two characters reflect on a past adventure that feels relevant to their current situation.','The party notices something unsettling in their surroundings and reacts with uneasy curiosity.','One character checks on another who seems shaken after the last encounter.','The group shares a brief moment of levity — a laugh, a shared memory, a small kindness.','A character voices doubt about whether they can succeed. The others respond honestly.',"The party quietly debates what they'll do with the reward when this is all over."];
  const boss = ['Standing at the threshold of the final chamber, the party shares words before the last battle.','The party can sense something powerful nearby. They gather their courage and speak plainly.','A moment of honesty before the final door — each character acknowledges the danger ahead.',"One character gives a brief rallying speech. It's imperfect, but it's enough.",'The party takes a breath and looks at one another, no words needed, just a shared nod.'];
  const failure = ['Battered and breathless, the adventurers regroup and try to understand where it all went wrong.','Nursing their wounds, the party speaks honestly about the moment the tide turned against them.','In the bitter aftermath of defeat, the adventurers reflect on what they underestimated.',"The party retreats in silence until someone finally breaks it — asking the question they're all thinking.",'Humbled and bruised, the adventurers pick through what happened and what they would do differently.'];
  const seeds: { uid: string; text: string; cat: string }[] = [];
  general.forEach((t, i) => seeds.push({ uid: `roleplay_general_${String(i+1).padStart(2,'0')}`, text: t, cat: 'general' }));
  boss.forEach((t, i) => seeds.push({ uid: `roleplay_boss_${String(i+1).padStart(2,'0')}`, text: t, cat: 'boss' }));
  failure.forEach((t, i) => seeds.push({ uid: `roleplay_failure_${String(i+1).padStart(2,'0')}`, text: t, cat: 'failure' }));
  for (const s of seeds) _run(`INSERT OR IGNORE INTO roleplay_prompts (uid, text, category, active) VALUES (?, ?, ?, 1);`, [s.uid, s.text, s.cat]);
}

function migrateV13() {
  const cols = _all<{ name: string }>(`PRAGMA table_info(quests)`);
  if (!cols.some((c) => c.name === 'summary'))
    _exec(`ALTER TABLE quests ADD COLUMN summary TEXT NOT NULL DEFAULT '';`);
}

function migrateV14() {
  _exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    INSERT OR IGNORE INTO settings (key, value) VALUES ('game_day', '1');
  `);
}

function migrateV15() {
  _exec(`
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

function migrateV16() {
  const cols = _all<{ name: string }>(`PRAGMA table_info(chat_history)`);
  if (!cols.some((c) => c.name === 'transcript'))
    _exec(`ALTER TABLE chat_history ADD COLUMN transcript TEXT NOT NULL DEFAULT '';`);
}

function migrateV17() {
  _exec(`
    CREATE TABLE IF NOT EXISTS character_greetings (
      uid TEXT PRIMARY KEY NOT NULL,
      room TEXT NOT NULL DEFAULT 'any',
      message TEXT NOT NULL DEFAULT ''
    );
  `);
  const seeds = [
    { uid: 'greeting_tavern_1',   room: 'tavern',   msg: '{{char}} looks up from a half-empty mug and raises it in greeting.' },
    { uid: 'greeting_tavern_2',   room: 'tavern',   msg: '{{char}} is sharpening a blade at the bar. "Ah, Guild Master. What brings you over?"' },
    { uid: 'greeting_tavern_3',   room: 'tavern',   msg: "{{char}} waves you over from a corner table. \"I was wondering when you'd show up.\"" },
    { uid: 'greeting_barracks_1', room: 'barracks', msg: '{{char}} sits on the edge of a cot, polishing armour. "Guild Master. Something on your mind?"' },
    { uid: 'greeting_barracks_2', room: 'barracks', msg: "{{char}} is running through stretches near the weapon racks. \"Oh — didn't hear you come in.\"" },
    { uid: 'greeting_armory_1',   room: 'armory',   msg: '{{char}} is inspecting a rack of weapons and turns as you enter. "Looking for something specific?"' },
    { uid: 'greeting_armory_2',   room: 'armory',   msg: '{{char}} holds a sword up to the light, examining the edge. "Guild Master. Checking the stock?"' },
    { uid: 'greeting_any_1',      room: 'any',      msg: '{{char}} nods as you approach. "Guild Master."' },
    { uid: 'greeting_any_2',      room: 'any',      msg: "{{char}} turns to face you. \"I had a feeling you'd seek me out.\"" },
  ];
  for (const s of seeds) _run(`INSERT OR IGNORE INTO character_greetings (uid, room, message) VALUES (?, ?, ?);`, [s.uid, s.room, s.msg]);
}

function migrateV18() {
  const cols = _all<{ name: string }>(`PRAGMA table_info(characters)`);
  if (!cols.some((c) => c.name === 'avatar_path'))
    _exec(`ALTER TABLE characters ADD COLUMN avatar_path TEXT;`);
}

function migrateV19() {
  _exec(`
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
  seedMundaneItems();
}

function migrateV20() { seedMundaneItems(); }

function migrateV21() {
  _exec(`
    CREATE TABLE IF NOT EXISTS resources (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      resource TEXT NOT NULL UNIQUE,
      value    REAL NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO resources (resource, value) VALUES ('gold', 0);
  `);
}

function migrateV22() {
  _exec(`
    CREATE TABLE IF NOT EXISTS guild_mundane_inventory (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type_id INTEGER NOT NULL REFERENCES mundane_item_types(id),
      purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function migrateV23() {
  const cols = _all<{ name: string }>(`PRAGMA table_info(outfit_sets)`);
  if (!cols.some((c) => c.name === 'context'))
    _exec(`ALTER TABLE outfit_sets ADD COLUMN context TEXT NOT NULL DEFAULT 'any';`);
}

function migrateV24() {
  const cols = _all<{ name: string }>(`PRAGMA table_info(outfit_sets)`);
  if (!cols.some((c) => c.name === 'image_path'))
    _exec(`ALTER TABLE outfit_sets ADD COLUMN image_path TEXT;`);
}

function migrateV25() {
  _exec(`CREATE TABLE IF NOT EXISTS phys_desc_pool (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    value    TEXT NOT NULL,
    UNIQUE(category, value)
  );`);
}

function migrateV26() {
  // Rename "platinum blonde hair" — caused metallic skin in diffusion models.
  _run(`UPDATE phys_desc_pool SET value = 'very light blonde hair'
        WHERE category = 'hair_color' AND value = 'platinum blonde hair';`);
}

function migrateV27() {
  // Per-instance color overrides so each copy of an item can look visually distinct.
  _exec(`ALTER TABLE guild_mundane_inventory ADD COLUMN description_override TEXT;`);
  _exec(`ALTER TABLE mundane_inventory ADD COLUMN description_override TEXT;`);
}

function migrateV28() {
  _exec(`ALTER TABLE roleplay_prompts ADD COLUMN relationship_delta INTEGER NOT NULL DEFAULT 0;`);
  // Update all seed rows to their new texts and deltas.
  for (const s of ROLEPLAY_SEEDS) {
    _run(`UPDATE roleplay_prompts SET text = ?, relationship_delta = ? WHERE uid = ?;`,
      [s.text, s.relationshipDelta, s.uid]);
  }
}

function migrateV29() {
  _exec(`CREATE TABLE IF NOT EXISTS character_relationships (
    char_a TEXT NOT NULL,
    char_b TEXT NOT NULL,
    score  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (char_a, char_b)
  );`);
}

function migrateV30() {
  _exec(`CREATE TABLE IF NOT EXISTS group_greetings (
    uid    TEXT PRIMARY KEY NOT NULL,
    text   TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  );`);
  for (const s of GROUP_GREETING_SEEDS) {
    _run(`INSERT OR IGNORE INTO group_greetings (uid, text, active) VALUES (?, ?, 1);`, [s.uid, s.text]);
  }
}

function migrateV31() {
  _exec(`CREATE TABLE IF NOT EXISTS guild_event_seeds (
    uid                TEXT PRIMARY KEY NOT NULL,
    text               TEXT NOT NULL,
    active             INTEGER NOT NULL DEFAULT 1,
    relationship_delta INTEGER NOT NULL DEFAULT 0,
    use_common_quest   INTEGER NOT NULL DEFAULT 0
  );`);
  for (const s of GUILD_EVENT_SEEDS) {
    _run(`INSERT OR IGNORE INTO guild_event_seeds (uid, text, active, relationship_delta, use_common_quest) VALUES (?, ?, 1, ?, ?);`,
      [s.uid, s.text, s.relationshipDelta, s.useCommonQuest ? 1 : 0]);
  }
}

function migrateV32() {
  _exec(`CREATE TABLE IF NOT EXISTS character_opinions (
    uid           TEXT PRIMARY KEY NOT NULL,
    character_uid TEXT NOT NULL,
    target_uid    TEXT NOT NULL,
    target_name   TEXT NOT NULL,
    opinion       TEXT NOT NULL DEFAULT '',
    keywords      TEXT NOT NULL DEFAULT '[]',
    game_day      INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`);
}

function migrateV33() {
  const cols = _all<{ name: string }>(`PRAGMA table_info(quest_history)`);
  if (!cols.some((c) => c.name === 'transcript'))
    _exec(`ALTER TABLE quest_history ADD COLUMN transcript TEXT NOT NULL DEFAULT '';`);
}

function migrateV34() {
  _exec(`
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

/** Runs every startup — inserts any new seed entries that don't exist yet. */
function ensurePhysDescSeeds() {
  let inserted = 0;
  for (const [category, value] of PHYS_DESC_SEED) {
    try {
      const r = _run(`INSERT OR IGNORE INTO phys_desc_pool (category, value) VALUES (?, ?);`, [category, value]);
      inserted += r.changes;
    } catch (e) { console.error('[seed] phys_desc_pool:', e); }
  }
  if (inserted > 0) console.log(`[seed] phys_desc_pool: inserted ${inserted} new entries`);
}

function seedMundaneItems(): void {
  let inserted = 0;
  for (const item of STARTER_MUNDANE_ITEMS) {
    try {
      const r = _run(`INSERT OR IGNORE INTO mundane_item_types (name, slot, description, class_name, is_starter) VALUES (?, ?, ?, ?, 1);`, [item.name, item.slot, item.description, item.class_name]);
      inserted += r.changes;
    } catch (e) { console.error('[seed] Failed to insert:', item.name, e); }
  }
  console.log(`[seed] Inserted ${inserted} / ${STARTER_MUNDANE_ITEMS.length} mundane items`);
}

function ensureMetaDescSeeds(): void {
  const adj = ['Analytical','Brooding','Calm','Careful','Compulsive','Curious','Cynical','Decisive','Distrustful','Dreamy','Empathetic','Focused','Idealistic','Impulsive','Intense','Introspective','Meticulous','Methodical','Paranoid','Patient'];
  const dom = ['Planner','Visionary','Observer','Negotiator','Scholar','Mystic','Tactician','Mediator','Rhetorician','Investigator'];
  const frg = ['questions assumptions before acting','keeps a rigid internal code','reads motives behind every word','seeks patterns in apparent chaos','weighs options before committing','overthinks simple social exchanges','defuses tension with measured calm','pushes conversations toward truth','guards private thoughts carefully','reframes setbacks as strategy'];
  const sc = ['intelligence','wisdom','charisma',null] as const;
  const mc = [1,-1,null,null] as const;
  for (let i = 0; i < 100; i++) {
    const a = adj[i % adj.length], d = dom[Math.floor(i / adj.length) % dom.length], f = frg[i % frg.length];
    _run(`INSERT OR IGNORE INTO metaDesc (uid, name, stat, mode, description) VALUES (?, ?, ?, ?, ?);`, [
      `meta_seed_${String(i+1).padStart(3,'0')}`, `${a} ${d}`,
      sc[i % sc.length] ?? null, mc[i % mc.length] ?? null,
      `${a.toLowerCase()} ${d.toLowerCase()} who ${f}.`,
    ]);
  }

  // ── Interpersonal / social personality traits ────────────────────────────────
  // No mechanical stat or mode — purely flavour for chat tone.
  const social: [string, string, string][] = [
    // [uid-suffix, name, description]
    ['s001', 'Rude',               'speaks without filter and shows little regard for others\' feelings, often causing offence without meaning to'],
    ['s002', 'Kind-hearted',       'goes out of their way to help others and speaks gently even in difficult situations'],
    ['s003', 'Soft-spoken',        'speaks quietly and carefully, choosing words with deliberate restraint and rarely raising their voice'],
    ['s004', 'Boisterous',         'fills every room with laughter and noise, rarely noticing when they\'ve overwhelmed everyone around them'],
    ['s005', 'Sarcastic',          'relies on dry wit and biting remarks as their default mode of communication'],
    ['s006', 'Flirtatious',        'can\'t help turning every interaction into a chance to charm or impress someone'],
    ['s007', 'Shy',                'struggles with new social situations and is far more comfortable in one-on-one conversations than in crowds'],
    ['s008', 'Arrogant',           'believes their accomplishments speak for themselves and rarely misses a chance to remind others of them'],
    ['s009', 'Humble',             'deflects praise and downplays their own achievements, sometimes to a fault'],
    ['s010', 'Gossipy',            'always knows the latest rumours and can\'t resist sharing them whether or not anyone asked'],
    ['s011', 'Cheerful',           'finds the bright side in nearly every situation and meets setbacks with stubborn optimism'],
    ['s012', 'Moody',              'whose disposition can shift without warning, making them difficult to read from one day to the next'],
    ['s013', 'Stoic',              'rarely reveals emotion and responds to most situations with the same flat, unreadable composure'],
    ['s014', 'Cold',               'keeps emotional distance from nearly everyone and lets their guard down only under extreme circumstances'],
    ['s015', 'Gruff',              'communicates in short blunt sentences and mistakes brevity for strength'],
    ['s016', 'Polite',             'maintains courteous manners even with people they dislike, never letting irritation show in their words'],
    ['s017', 'Nervous',            'fidgets during conversation, second-guesses everything they say, and apologises more than necessary'],
    ['s018', 'Dramatic',           'elevates every event into an epic tale and speaks in sweeping declarations even about mundane things'],
    ['s019', 'Forthright',         'says exactly what they mean and expects others to do the same, with little patience for evasion'],
    ['s020', 'Deceptive',          'crafts their words carefully and rarely reveals their true intentions until they have what they want'],
    ['s021', 'Naive',              'takes most things at face value and is slow to suspect ulterior motives even when the signs are obvious'],
    ['s022', 'Worldly',            'has seen enough of life to expect disappointment and carries a bone-deep cynicism they rarely bother to hide'],
    ['s023', 'Melancholy',         'carries a quiet sadness and tends to view the world through a somber, wistful lens'],
    ['s024', 'Jovial',             'meets most situations with a laugh and warm good humour that puts people at ease'],
    ['s025', 'Grudge-holding',     'remembers every slight and rarely forgives without some form of acknowledgement or apology'],
    ['s026', 'Forgiving',          'lets go of grievances easily and rarely holds a grudge past the end of the day'],
    ['s027', 'Nosy',               'asks too many personal questions and has genuine difficulty minding their own business'],
    ['s028', 'Vain',               'steers conversations back to their appearance or reputation whenever they get the chance'],
    ['s029', 'Self-sacrificing',   'puts others\' needs ahead of their own almost compulsively, even when it costs them dearly'],
    ['s030', 'Competitive',        'turns even casual exchanges into a contest they fully intend to win'],
    ['s031', 'Protective',         'becomes sharply guarded when anyone they care about is threatened, and doesn\'t let insults to friends slide'],
    ['s032', 'Hot-headed',         'flares up quickly at perceived insults and takes time to cool down once their temper is lit'],
    ['s033', 'Guarded',            'shares personal information sparingly and only with people who have earned their trust over a long time'],
    ['s034', 'Openly emotional',   'wears their feelings openly and can\'t hide excitement, distress, or disappointment even when they try'],
    ['s035', 'Deadpan',            'delivers jokes with a perfectly straight face and rarely clarifies when they\'re being serious versus sarcastic'],
    ['s036', 'Levity-seeking',     'deflects serious or heavy conversation with humour, sometimes at entirely the wrong moment'],
    ['s037', 'Cryptic',            'communicates in half-statements and rarely gives a straight answer when an oblique one will do'],
    ['s038', 'Overly formal',      'addresses everyone with titles and speaks as though every conversation is an official proceeding'],
    ['s039', 'Irreverent',         'ignores social conventions and treats authority with casual, cheerful disregard'],
    ['s040', 'Blunt',              'says the true thing before the tactful one, usually without noticing the difference'],
    ['s041', 'Easily embarrassed', 'flushes at personal questions and struggles to hide discomfort when put on the spot'],
    ['s042', 'Patronising',        'tends to over-explain and rarely gives others full credit for their intelligence'],
    ['s043', 'Genuinely curious',  'asks thoughtful questions about people and listens closely to the answers rather than waiting for their turn to speak'],
    ['s044', 'Contrarian',         'pushes back on statements almost reflexively before eventually, reluctantly, coming around'],
    ['s045', 'Fiercely loyal',     'stands by their allies through difficult circumstances and takes any betrayal deeply personally'],
    ['s046', 'Self-deprecating',   'makes jokes at their own expense before others can, using humour as a shield against vulnerability'],
    ['s047', 'Nostalgic',          'frequently references the past and measures everything against how things used to be'],
    ['s048', 'Passive-aggressive', 'rarely says what they mean directly, preferring pointed silences and loaded remarks to open confrontation'],
    ['s049', 'Earnest',            'takes everything at face value and engages with complete sincerity, finding irony genuinely difficult to parse'],
    ['s050', 'Suspicious',         'trusts slowly and watches carefully even in familiar company, assuming there is usually more going on than appears'],
  ];
  for (const [suffix, name, desc] of social) {
    _run(`INSERT OR IGNORE INTO metaDesc (uid, name, stat, mode, description) VALUES (?, ?, ?, ?, ?);`, [
      `meta_${suffix}`, name, null, null, desc,
    ]);
  }
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

export function registerDbHandlers(): void {
  ipcMain.handle('db:all', (_event, sql: string, params: unknown[]) => {
    try { return _all(sql, params); }
    catch (err) { console.error('[db:all]', sql, err); throw err; }
  });

  ipcMain.handle('db:get', (_event, sql: string, params: unknown[]) => {
    try { return _get(sql, params) ?? null; }
    catch (err) { console.error('[db:get]', sql, err); throw err; }
  });

  ipcMain.handle('db:run', (_event, sql: string, params: unknown[]) => {
    try { const r = _run(sql, params); persist(); return r; }
    catch (err) { console.error('[db:run]', sql, err); throw err; }
  });

  ipcMain.handle('db:exec', (_event, sql: string) => {
    try { _exec(sql); persist(); return null; }
    catch (err) { console.error('[db:exec]', err); throw err; }
  });
}

// ─── FS IPC handlers ──────────────────────────────────────────────────────────

export function registerFsHandlers(): void {
  ipcMain.handle('fs:getUserDataPath', () => app.getPath('userData'));

  ipcMain.handle('fs:saveImage', async (_event, imageUrl: string, subfolder: string, filename: string) => {
    const https = await import('https');
    const http  = await import('http');

    const dir = path.join(app.getPath('userData'), subfolder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const localPath = path.join(dir, filename);
    const file = fs.createWriteStream(localPath);

    await new Promise<void>((resolve, reject) => {
      const protocol = imageUrl.startsWith('https') ? https : http;
      (protocol as typeof https).get(imageUrl, (response) => {
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error', reject);
        response.on('error', reject);
      }).on('error', reject);
    });

    // Return an app:// URL so the renderer can display it without file:// CSP blocks.
    // The protocol handler maps app://main/userdata/<rel> → {userData}/<rel>.
    const relPath = path.relative(app.getPath('userData'), localPath).replace(/\\/g, '/');
    return `app://main/userdata/${relPath}`;
  });
}
