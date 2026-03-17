// ─── D&D 5e XP thresholds (index = level) ────────────────────────────────────

const XP_THRESHOLDS: number[] = [
  0,       // unused (index 0)
  0,       // level 1
  300,     // level 2
  900,     // level 3
  2700,    // level 4
  6500,    // level 5
  14000,   // level 6
  23000,   // level 7
  34000,   // level 8
  48000,   // level 9
  64000,   // level 10
  85000,   // level 11
  100000,  // level 12
  120000,  // level 13
  140000,  // level 14
  165000,  // level 15
  195000,  // level 16
  225000,  // level 17
  265000,  // level 18
  305000,  // level 19
  355000,  // level 20
];

// XP per enemy killed at a given level (level → CR mapping)
const ENEMY_XP_BY_LEVEL: number[] = [
  0,      // unused (index 0)
  200,    // level 1
  450,    // level 2
  700,    // level 3
  1100,   // level 4
  1800,   // level 5
  2300,   // level 6
  2900,   // level 7
  3900,   // level 8
  5000,   // level 9
  5900,   // level 10
  7200,   // level 11
  8400,   // level 12
  10000,  // level 13
  11500,  // level 14
  13000,  // level 15
  15000,  // level 16
  18000,  // level 17
  20000,  // level 18
  22000,  // level 19
  25000,  // level 20
];

export const MAX_LEVEL = 20;

export function xpThresholdForLevel(level: number): number {
  const clamped = Math.min(Math.max(level, 1), MAX_LEVEL);
  return XP_THRESHOLDS[clamped];
}

export function levelFromXp(xp: number): number {
  for (let level = MAX_LEVEL; level >= 1; level--) {
    if (xp >= XP_THRESHOLDS[level]) {
      return level;
    }
  }
  return 1;
}

export function xpRewardForEnemyLevel(level: number): number {
  const clamped = Math.min(Math.max(level, 1), MAX_LEVEL);
  return ENEMY_XP_BY_LEVEL[clamped];
}

export function proficiencyBonusForLevel(level: number): number {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9)  return 4;
  if (level >= 5)  return 3;
  return 2;
}

// ─── HP calculation ───────────────────────────────────────────────────────────

const HIT_DICE_BY_CLASS: Record<string, number> = {
  barbarian: 12,
  fighter:   10,
  ranger:    10,
  paladin:   10,
  bard:       8,
  cleric:     8,
  druid:      8,
  monk:       8,
  rogue:      8,
  warlock:    8,
  wizard:     6,
  sorcerer:   6,
};

export function hitDieForClass(className: string): number {
  return HIT_DICE_BY_CLASS[className.toLowerCase()] ?? 8;
}

/**
 * D&D 5e max HP formula:
 *   Level 1: hitDie + conMod
 *   Each subsequent level: floor(hitDie / 2) + 1 + conMod  (average roll)
 */
export function calculateMaxHp(className: string, constitution: number, level: number): number {
  const hitDie = hitDieForClass(className);
  const conMod = Math.floor((constitution - 10) / 2);
  const levelOneHp = hitDie + conMod;
  const perLevel = Math.floor(hitDie / 2) + 1 + conMod;
  return Math.max(level, levelOneHp + perLevel * (level - 1));
}
