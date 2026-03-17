import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { callKoboldApi } from '@/components/LLM/kobold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  initializeDatabase,
  listCharacterItems,
  listGuildCharacters,
  listGuildEnemies,
  type GuildCharacter,
  type GuildEnemy,
  type GuildItem,
} from '@/lib/local-db';
import { proficiencyBonusForLevel, xpRewardForEnemyLevel } from '@/lib/xp';

// ─── Types ────────────────────────────────────────────────────────────────────

type AttackType = 'physical' | 'magical';

export type RoundEntry = {
  attackerName: string;
  defenderName: string;
  attackType: AttackType;
  damage: number;
  killed: boolean;
  isCritical: boolean;
};

export type FightRound = {
  roundNumber: number;
  entries: RoundEntry[];
};

export type FightResult = {
  rounds: FightRound[];
  winner: 'characters' | 'enemies';
  narration: string;
  xpPerCharacter: number;
};

export type FightSimulationResult = {
  rounds: FightRound[];
  winner: 'characters' | 'enemies';
  highlights: string;
  /** uid → final HP (0 if dead) for each character */
  finalCharacterHps: Map<string, number>;
  /** total XP from all killed enemies */
  totalXp: number;
};

export type FightProps = {
  characterIds: string[];
  enemyIds: string[];
  roomDescription: string;
  enemyLevel?: number;
  onResult?: (result: FightResult) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ROUNDS = 100;
const NARRATION_TOKENS = 800;

const hitDiceByClass: Record<string, number> = {
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

// ─── Internal combatant shape ─────────────────────────────────────────────────

type Combatant = {
  uid: string;
  name: string;
  race: string;
  className: string;
  currentHp: number;
  ac: number;
  damageDie: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  level: number;
  side: 'character' | 'enemy';
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Fight({ characterIds, enemyIds, roomDescription, enemyLevel = 1, onResult }: FightProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStartFight() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      await initializeDatabase();
      const [allCharacters, allEnemies] = await Promise.all([
        listGuildCharacters(),
        listGuildEnemies(),
      ]);

      const characters = allCharacters.filter((c) => characterIds.includes(c.uid));
      const enemies = allEnemies.filter((e) => enemyIds.includes(e.uid));

      if (characters.length === 0 || enemies.length === 0) {
        setError('Need at least one character and one enemy to fight.');
        setLoading(false);
        return;
      }

      const itemEntries = await Promise.all(
        characters.map(async (c) => [c.uid, await listCharacterItems(c.uid)] as const)
      );
      const characterItemsMap = new Map(itemEntries);

      const rounds = simulateFight(characters, enemies, enemyLevel, characterItemsMap);
      const winner = determineWinner(rounds, characters);
      const margin = determineMargin(rounds, winner, characters, enemies);
      const narration = await narrateFight({
        rounds,
        winner,
        margin,
        roomDescription,
        characters,
        enemies,
        characterItemsMap,
      });

      const xpPerCharacter = enemies.length * xpRewardForEnemyLevel(enemyLevel);
      const fightResult: FightResult = { rounds, winner, narration, xpPerCharacter };
      setResult(fightResult);
      onResult?.(fightResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during fight.';
      setError(message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Combat</ThemedText>
      <ThemedText style={styles.roomDesc}>{roomDescription}</ThemedText>

      {!result && !loading && (
        <Pressable style={styles.fightButton} onPress={() => void handleStartFight()}>
          <ThemedText style={styles.fightButtonText}>Begin Fight</ThemedText>
        </Pressable>
      )}

      {loading && (
        <ThemedText style={styles.loading}>Simulating combat...</ThemedText>
      )}

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      {result && (
        <ThemedView style={styles.resultContainer}>
          <ThemedText type="defaultSemiBold" style={styles.winnerText}>
            {result.winner === 'characters' ? 'Characters win!' : 'Enemies win!'}
          </ThemedText>

          <ThemedText style={styles.narration}>{result.narration}</ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.logHeader}>
            Combat Log
          </ThemedText>

          <ScrollView style={styles.logScroll} nestedScrollEnabled>
            {result.rounds.map((round) => (
              <ThemedView key={round.roundNumber} style={styles.roundBlock}>
                <ThemedText style={styles.roundHeader}>
                  Round {round.roundNumber}
                </ThemedText>
                {round.entries.length === 0 ? (
                  <ThemedText style={styles.logBadge}>No hits this round.</ThemedText>
                ) : (
                  round.entries.map((entry, index) => (
                    <ThemedView key={index} style={styles.logEntry}>
                      <ThemedText style={styles.logName}>{entry.attackerName}</ThemedText>
                      <ThemedText style={styles.logArrow}> → </ThemedText>
                      <ThemedText style={styles.logName}>{entry.defenderName}</ThemedText>
                      <ThemedText style={styles.logBadge}>
                        {entry.attackType === 'physical' ? ' ⚔' : ' ✦'}
                        {` ${entry.damage} dmg`}
                        {entry.killed ? ' · downed' : ''}
                      </ThemedText>
                    </ThemedView>
                  ))
                )}
              </ThemedView>
            ))}
          </ScrollView>

          <Pressable style={styles.fightButton} onPress={() => void handleStartFight()}>
            <ThemedText style={styles.fightButtonText}>Fight Again</ThemedText>
          </Pressable>
        </ThemedView>
      )}
    </ThemedView>
  );
}

// ─── Simulation ───────────────────────────────────────────────────────────────

function runCombatRounds(combatants: Combatant[]): FightRound[] {
  const initiativeOrder = combatants
    .map((c) => ({ combatant: c, roll: rollD20() + statMod(c.dexterity) }))
    .sort((a, b) => b.roll - a.roll)
    .map((entry) => entry.combatant);

  const rounds: FightRound[] = [];

  for (let roundNumber = 1; roundNumber <= MAX_ROUNDS; roundNumber += 1) {
    const charactersAlive = initiativeOrder.filter(
      (c) => c.side === 'character' && c.currentHp > 0
    );
    const enemiesAlive = initiativeOrder.filter(
      (c) => c.side === 'enemy' && c.currentHp > 0
    );

    if (charactersAlive.length === 0 || enemiesAlive.length === 0) {
      break;
    }

    const roundEntries: RoundEntry[] = [];

    for (const attacker of initiativeOrder) {
      if (attacker.currentHp <= 0) {
        continue;
      }

      const opposingSide = attacker.side === 'character' ? 'enemy' : 'character';
      const targets = initiativeOrder.filter(
        (c) => c.side === opposingSide && c.currentHp > 0
      );

      if (targets.length === 0) {
        break;
      }

      const target = pickRandom(targets);
      const { statValue, attackType } = pickAttackStat(attacker);
      const attackBonus = statMod(statValue) + proficiencyBonusForLevel(attacker.level);
      const targetAc = target.ac;
      const naturalRoll = rollD20();
      const isCritical = naturalRoll === 20;
      const roll = naturalRoll + attackBonus;

      if (isCritical || roll >= targetAc) {
        const mod = statMod(statValue);
        const diceRoll = rollDie(attacker.damageDie);
        const damage = isCritical
          ? Math.max(1, diceRoll + rollDie(attacker.damageDie) + mod)
          : Math.max(1, diceRoll + mod);
        target.currentHp -= damage;

        roundEntries.push({
          attackerName: attacker.name,
          defenderName: target.name,
          attackType,
          damage,
          killed: target.currentHp <= 0,
          isCritical,
        });
      }
    }

    rounds.push({ roundNumber, entries: roundEntries });
  }

  return rounds;
}

function simulateFight(
  characters: GuildCharacter[],
  enemies: GuildEnemy[],
  enemyLevel: number,
  characterItemsMap: Map<string, GuildItem[]>
): FightRound[] {
  const combatants: Combatant[] = [
    ...characters.map((c) => {
      const { hp, acBonus, entity } = applyItemBonuses(c, characterItemsMap.get(c.uid) ?? []);
      return toCombatant(entity, 'character', hp, c.level, acBonus);
    }),
    ...enemies.map((e) => {
      const hitDie = resolveHitDie(e.className, e);
      return toCombatant(e, 'enemy', calculateHp(hitDie, e.constitution, enemyLevel), enemyLevel);
    }),
  ];

  return runCombatRounds(combatants);
}

/**
 * Simulates a fight using stored enemy HP and level values (no recalculation).
 * Returns final character HPs and total XP from killed enemies.
 */
export function runFightSimulation(
  characters: GuildCharacter[],
  enemies: GuildEnemy[],
  characterItemsMap: Map<string, GuildItem[]>,
): FightSimulationResult {
  const characterCombatants = characters.map((c) => {
    const { hp, acBonus, entity } = applyItemBonuses(c, characterItemsMap.get(c.uid) ?? []);
    return toCombatant(entity, 'character', hp, c.level, acBonus);
  });
  const enemyCombatants = enemies.map((e) => toCombatant(e, 'enemy', e.hp, e.level));

  const rounds = runCombatRounds([...characterCombatants, ...enemyCombatants]);
  const winner = determineWinner(rounds, characters);
  const highlights = buildCombatHighlights(rounds);

  const finalCharacterHps = new Map<string, number>();
  for (const c of characterCombatants) {
    finalCharacterHps.set(c.uid, Math.max(0, c.currentHp));
  }

  const totalXp = enemyCombatants
    .filter((ec) => ec.currentHp <= 0)
    .reduce((sum, ec) => sum + xpRewardForEnemyLevel(ec.level), 0);

  return { rounds, winner, highlights, finalCharacterHps, totalXp };
}

function toCombatant(
  entity: GuildCharacter | GuildEnemy,
  side: 'character' | 'enemy',
  hp: number,
  level: number,
  acBonus = 0
): Combatant {
  return {
    uid: entity.uid,
    name: entity.characterName,
    race: entity.race,
    className: entity.className,
    currentHp: hp,
    ac: 10 + statMod(entity.dexterity) + acBonus,
    damageDie: resolveHitDie(entity.className, entity),
    strength: entity.strength,
    dexterity: entity.dexterity,
    constitution: entity.constitution,
    intelligence: entity.intelligence,
    wisdom: entity.wisdom,
    charisma: entity.charisma,
    level,
    side,
  };
}

function applyItemBonuses(
  character: GuildCharacter,
  items: GuildItem[]
): { hp: number; acBonus: number; entity: GuildCharacter } {
  let hpBonus = 0;
  let acBonus = 0;
  const stats = {
    strength:     character.strength,
    dexterity:    character.dexterity,
    constitution: character.constitution,
    intelligence: character.intelligence,
    wisdom:       character.wisdom,
    charisma:     character.charisma,
  };

  for (const item of items) {
    if (item.stat === 'hp') { hpBonus += item.bonus; continue; }
    if (item.stat === 'ac') { acBonus += item.bonus; continue; }
    stats[item.stat] += item.bonus;
  }

  return { hp: character.hp + hpBonus, acBonus, entity: { ...character, ...stats } };
}

function resolveHitDie(className: string, entity: GuildCharacter | GuildEnemy): number {
  const known = hitDiceByClass[className.toLowerCase()];
  if (known) {
    return known;
  }

  const strDex = Math.max(entity.strength, entity.dexterity);
  const intWisCha = Math.max(entity.intelligence, entity.wisdom, entity.charisma);

  if (entity.strength >= entity.dexterity && entity.strength >= intWisCha) {
    return Math.random() < 0.5 ? 12 : 10;
  }

  if (strDex >= intWisCha) {
    return Math.random() < 0.5 ? 8 : 10;
  }

  return Math.random() < 0.5 ? 6 : 8;
}

function calculateHp(hitDie: number, constitution: number, level: number): number {
  const conMod = statMod(constitution);
  const levelOneHp = hitDie + conMod;
  const subsequentHp = (Math.floor(hitDie / 2) + conMod) * (level - 1);
  return Math.max(level, levelOneHp + subsequentHp);
}

function pickAttackStat(combatant: Combatant): {
  statValue: number;
  attackType: AttackType;
} {
  const candidates: { statValue: number; attackType: AttackType }[] = [
    { statValue: combatant.strength,     attackType: 'physical' },
    { statValue: combatant.dexterity,    attackType: 'physical' },
    { statValue: combatant.intelligence, attackType: 'magical'  },
    { statValue: combatant.wisdom,       attackType: 'magical'  },
    { statValue: combatant.charisma,     attackType: 'magical'  },
  ];

  return candidates.reduce((best, current) =>
    current.statValue > best.statValue ? current : best
  );
}

function determineWinner(
  rounds: FightRound[],
  characters: GuildCharacter[]
): 'characters' | 'enemies' {
  const killedNames = killedNameSet(rounds);
  const allCharactersDead = characters.every((c) => killedNames.has(c.characterName));
  return allCharactersDead ? 'enemies' : 'characters';
}

// "decisive" = winning side lost fewer than half their members
// "close"    = winning side lost half or more of their members
function determineMargin(
  rounds: FightRound[],
  winner: 'characters' | 'enemies',
  characters: GuildCharacter[],
  enemies: GuildEnemy[]
): 'decisive' | 'close' {
  const killed = killedNameSet(rounds);
  const winningSide = winner === 'characters' ? characters : enemies;
  const winningSideKilled = winningSide.filter((c) => killed.has(c.characterName)).length;
  return winningSideKilled / winningSide.length >= 0.5 ? 'close' : 'decisive';
}

function killedNameSet(rounds: FightRound[]): Set<string> {
  return new Set(
    rounds.flatMap((r) => r.entries).filter((e) => e.killed).map((e) => e.defenderName)
  );
}

export function buildCombatHighlights(rounds: FightRound[]): string {
  const allEntries = rounds.flatMap((r, i) =>
    r.entries.map((e) => ({ ...e, roundNumber: i + 1 }))
  );

  const lines: string[] = [];

  // First blood
  const firstHit = allEntries[0];
  if (firstHit) {
    lines.push(`First blood: ${firstHit.attackerName} drew first blood against ${firstHit.defenderName} in round ${firstHit.roundNumber}.`);
  }

  // Critical hits
  const crits = allEntries.filter((e) => e.isCritical);
  for (const crit of crits) {
    lines.push(`Critical hit: ${crit.attackerName} landed a critical hit on ${crit.defenderName} in round ${crit.roundNumber} for ${crit.damage} damage.`);
  }

  // Incapacitating blows
  const kills = allEntries.filter((e) => e.killed);
  for (const kill of kills) {
    const critNote = kill.isCritical ? ' (critical hit)' : '';
    lines.push(`Decisive blow: ${kill.attackerName} overwhelmed ${kill.defenderName} in round ${kill.roundNumber}${critNote}, leaving them too wounded to continue.`);
  }

  // Most incapacitations per attacker
  const killCounts = new Map<string, number>();
  for (const kill of kills) {
    killCounts.set(kill.attackerName, (killCounts.get(kill.attackerName) ?? 0) + 1);
  }
  if (killCounts.size > 0) {
    const [mvp, count] = [...killCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (count > 1) {
      lines.push(`Most incapacitations: ${mvp} overwhelmed ${count} opponents.`);
    }
  }

  return lines.join('\n');
}

// ─── Narration ────────────────────────────────────────────────────────────────

type NarrateInput = {
  rounds: FightRound[];
  winner: 'characters' | 'enemies';
  margin: 'decisive' | 'close';
  roomDescription: string;
  characters: GuildCharacter[];
  enemies: GuildEnemy[];
  characterItemsMap: Map<string, GuildItem[]>;
};

async function narrateFight(input: NarrateInput): Promise<string> {
  const combatSummary = input.rounds
    .map((round) => {
      if (round.entries.length === 0) return null;
      const hits = round.entries
        .map((e) => {
          const kill = e.killed ? ` ${e.defenderName} is overwhelmed!` : '';
          return `  ${e.attackerName} hits ${e.defenderName} (${e.attackType}, ${e.damage} dmg).${kill}`;
        })
        .join('\n');
      return `Round ${round.roundNumber}:\n${hits}`;
    })
    .filter(Boolean)
    .join('\n');

  const characterEntries = input.characters.map((c) => {
    const desc = c.baseDescription?.trim();
    const items = input.characterItemsMap.get(c.uid) ?? [];
    const gear = items
      .map((i) => (i.description ? `${i.name} (${i.description})` : i.name))
      .join(', ');
    const base = desc
      ? `- ${c.characterName} (${c.race} ${c.className}): ${desc}`
      : `- ${c.characterName} (${c.race} ${c.className})`;
    return gear ? `${base}. Equipped: ${gear}` : base;
  }).join('\n');

  const enemyEntries = input.enemies.map((e) => {
    const desc = e.baseDescription?.trim();
    return desc
      ? `- ${e.characterName} (${e.race} ${e.className}): ${desc}`
      : `- ${e.characterName} (${e.race} ${e.className})`;
  }).join('\n');

  const highlights = buildCombatHighlights(input.rounds);

  const prompt = buildNarrationPrompt({
    winner: input.winner,
    margin: input.margin,
    roomDescription: input.roomDescription,
    characterEntries,
    enemyEntries,
    combatSummary,
    highlights,
  });

  try {
    const response = (await callKoboldApi(prompt, NARRATION_TOKENS)).trim();
    if (response) {
      return response;
    }
  } catch (err) {
    console.error(err);
  }

  // Fallback
  const winnerLabel = input.winner === 'characters' ? 'The characters' : 'The enemies';
  return `${winnerLabel} emerged victorious after ${input.rounds.length} rounds of ${input.margin === 'close' ? 'brutal, close' : 'decisive'} combat.`;
}

function buildNarrationPrompt(input: {
  winner: 'characters' | 'enemies';
  margin: 'decisive' | 'close';
  roomDescription: string;
  characterEntries: string;
  enemyEntries: string;
  combatSummary: string;
  highlights: string;
}): string {
  const header = [
    'You are narrating a combat scene in a fantasy story. Be vivid and immersive.',
    'No combatant is ever killed — when reduced to 0 HP they are severely wounded and forced to retreat or collapse, but they survive.',
    'Never use game terms: no rounds, no damage numbers, no HP, no dice rolls, no statistics.',
    `Setting: ${input.roomDescription}`,
    'Characters:',
    input.characterEntries,
    'Enemies:',
    input.enemyEntries,
    '',
    'Combat summary:',
    input.combatSummary,
    '',
    'Notable moments:',
    input.highlights,
    'Use the setting, the combatants, the summary, and the notable moments to ground your narrative. Include environmental details and brief dialogue where it feels natural.',
    '',
  ].join('\n');

  if (input.winner === 'characters' && input.margin === 'decisive') {
    return header + [
      'The characters won decisively. Write a triumphant 4-5 paragraph narrative.',
      '1. Opening: Set the scene and describe the moment combat erupts. Name each combatant as they enter.',
      '2. Domination: Show the characters pressing their advantage early. Reference specific attacks and combatants by name.',
      '3. Key moments: Describe critical strikes and decisive blows in vivid detail — who landed them, who was badly wounded.',
      '4. Collapse: The enemies break — wounded, staggering, retreating. Name each as they are driven back.',
      '5. Aftermath: One closing sentence on the characters standing victorious.',
      'Name every combatant at least once. Output only the narrative.',
    ].join('\n');
  }

  if (input.winner === 'characters' && input.margin === 'close') {
    return header + [
      'The characters won, but barely. Write a tense 4-5 paragraph narrative.',
      '1. Opening: Set the scene and the chaotic start of combat. Name each combatant as they enter.',
      '2. Early struggle: Both sides trade blows. Reference specific combatants and attacks by name.',
      '3. Key moments: The hardest hits on both sides — who struck, who was badly wounded.',
      '4. The brink: The moment the characters nearly lost, named combatants pushed to their limit.',
      '5. Survival: One closing sentence on barely holding on to claim victory.',
      'Name every combatant at least once. Output only the narrative.',
    ].join('\n');
  }

  if (input.winner === 'enemies' && input.margin === 'decisive') {
    return header + [
      'The enemies won decisively. Write a grim 4-5 paragraph narrative.',
      '1. Opening: Set the scene and the dread of the enemy forces. Name each combatant as they enter.',
      '2. Overwhelmed: The enemies dominate from the start. Reference specific attacks and combatants by name.',
      '3. Key moments: The worst blows in vivid detail — who struck, who was left too wounded to continue.',
      '4. The end: Each character, named, is beaten down and forced to retreat or collapse.',
      '5. Aftermath: One closing sentence on the enemies holding the field.',
      'Name every combatant at least once. Output only the narrative.',
    ].join('\n');
  }

  // enemies win, close
  return header + [
    'The enemies won, but it was close. Write a tragic 4-5 paragraph narrative.',
    '1. Opening: Set the scene as both sides clash. Name each combatant as they enter.',
    '2. Valiant struggle: The characters fight hard. Reference specific attacks and combatants by name.',
    '3. Key moments: The hardest hits on both sides — who struck, who was badly wounded.',
    '4. The turning point: The moment the tide shifted — named characters, too wounded, forced to fall back.',
    '5. Aftermath: One closing sentence acknowledging the courage of the characters despite their defeat.',
    'Name every combatant at least once. Output only the narrative.',
  ].join('\n');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function pickRandom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#687076',
    borderRadius: 12,
  },
  roomDesc: {
    color: '#687076',
    fontStyle: 'italic',
    fontSize: 13,
  },
  fightButton: {
    backgroundColor: '#8B0000',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  fightButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  loading: {
    color: '#687076',
    fontStyle: 'italic',
  },
  error: {
    color: '#B00020',
  },
  resultContainer: {
    gap: 12,
  },
  winnerText: {
    fontSize: 18,
    color: '#0a7ea4',
  },
  narration: {
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  logHeader: {
    fontSize: 14,
    marginTop: 4,
  },
  logScroll: {
    maxHeight: 400,
  },
  roundBlock: {
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E4E7',
  },
  roundHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0a7ea4',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  logEntry: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  logName: {
    fontWeight: '600',
    fontSize: 12,
    color: '#11181C',
  },
  logArrow: {
    fontSize: 12,
    color: '#9BA1A6',
  },
  logBadge: {
    fontSize: 12,
    color: '#687076',
  },
});
