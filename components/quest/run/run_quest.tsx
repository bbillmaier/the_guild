import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { callKoboldApi } from '@/components/LLM/kobold';
import { runFightSimulation } from '@/components/combat/fight';
import {
  type MinionStats,
  type RoomContent,
} from '@/components/quest/create/create_quest';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  adjustRelationship,
  getRelationship,
  getRelationshipLabel,
  insertGuildItem,
  listActiveRoleplayPrompts,
  updateGuildCharacterHp,
  updateGuildCharacterXp,
  updateQuestNarrative,
  updateQuestRoomStatus,
  updateQuestStatus,
  type GuildCharacter,
  type GuildEnemy,
  type GuildItem,
  type GuildQuest,
  type ItemStat,
  type QuestDifficulty,
  type QuestRoom,
} from '@/lib/local-db';
import { equipmentTypes, statOptions } from '@/components/items/create_item';
import { getSetting, QUICK_MODE_KEY } from '@/lib/settings';
import { calculateMaxHp, levelFromXp, MAX_LEVEL } from '@/lib/xp';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveMember = {
  uid: string;
  characterName: string;
  className: string;
  gender: string;
  level: number;
  maxHp: number;
  currentHp: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  xpGained: number;
  alive: boolean;
};

type Phase = 'simulating' | 'generating_story' | 'complete' | 'failed';

export type QuestReward = {
  gold?: number;
  items?: GuildItem[];
};

export type RunQuestProps = {
  quest: GuildQuest;
  rooms: QuestRoom[];
  characters: GuildCharacter[];
  onComplete: () => void;
  onFail: () => void;
  onStoryPrompt?: (prompt: string) => void;
  onRewards?: (reward: QuestReward) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function hasClericInParty(party: ActiveMember[]): boolean {
  return party.some((m) => m.alive && m.className.toLowerCase().includes('cleric'));
}

function applyHealing(member: ActiveMember, cleric: boolean): ActiveMember {
  if (!member.alive) return member;
  const frac = cleric ? 3 / 4 : 1 / 2;
  const heal = Math.ceil(member.currentHp * frac);
  return { ...member, currentHp: Math.min(member.maxHp, member.currentHp + heal) };
}

function toGuildCharacterWithHp(original: GuildCharacter, currentHp: number): GuildCharacter {
  return { ...original, hp: currentHp };
}

function genderPronoun(gender: string): string {
  if (gender === 'male') return 'he/him';
  if (gender === 'female') return 'she/her';
  return 'they/them';
}

function buildPartyRoster(party: ActiveMember[]): string {
  return party
    .filter((m) => m.alive)
    .map((m) => `${m.characterName} (${m.className}, ${genderPronoun(m.gender)})`)
    .join('; ');
}

// ─── Roleplay scenarios ───────────────────────────────────────────────────────

type ScenarioEntry = { text: string; relationshipDelta: number };

const ROLEPLAY_SCENARIOS: ScenarioEntry[] = [
  { text: 'The party pauses to catch their breath. One character tends to another\'s wounds while they talk.', relationshipDelta: 0 },
  { text: 'A disagreement breaks out between party members about the best way to handle what lies ahead.', relationshipDelta: -1 },
  { text: 'One character cracks a dark joke to break the tension. The others react in their own ways.', relationshipDelta: 0 },
  { text: 'A quieter member of the party opens up, sharing something about why they took this quest.', relationshipDelta: 1 },
  { text: 'Two characters reflect on a past adventure that feels relevant to their current situation.', relationshipDelta: 1 },
  { text: 'The party notices something unsettling in their surroundings and reacts with uneasy curiosity.', relationshipDelta: 0 },
  { text: 'One character checks on another who seems shaken after the last encounter.', relationshipDelta: 1 },
  { text: 'The group shares a brief moment of levity — a laugh, a shared memory, a small kindness.', relationshipDelta: 0 },
  { text: 'A character voices doubt about whether they can succeed. The others respond honestly.', relationshipDelta: 0 },
  { text: 'The party quietly debates what they\'ll do with the reward when this is all over.', relationshipDelta: 0 },
];

const BOSS_ROLEPLAY_SCENARIOS: ScenarioEntry[] = [
  { text: 'Standing at the threshold of the final chamber, the party shares words before the last battle.', relationshipDelta: 0 },
  { text: 'The party can sense something powerful nearby. They gather their courage and speak plainly.', relationshipDelta: 0 },
  { text: 'A moment of honesty before the final door — each character acknowledges the danger ahead.', relationshipDelta: 1 },
  { text: 'One character gives a brief rallying speech. It\'s imperfect, but it\'s enough.', relationshipDelta: 1 },
  { text: 'The party takes a breath and looks at one another, no words needed, just a shared nod.', relationshipDelta: 0 },
];

const FAILURE_ROLEPLAY_SCENARIOS: ScenarioEntry[] = [
  { text: 'Battered and breathless, the adventurers regroup and try to understand where it all went wrong.', relationshipDelta: 0 },
  { text: 'Nursing their wounds, the party speaks honestly about the moment the tide turned against them.', relationshipDelta: -1 },
  { text: 'In the bitter aftermath of defeat, the adventurers reflect on what they underestimated.', relationshipDelta: 0 },
  { text: 'The party retreats in silence until someone finally breaks it — asking the question they\'re all thinking.', relationshipDelta: -1 },
  { text: 'Humbled and bruised, the adventurers pick through what happened and what they would do differently.', relationshipDelta: 1 },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Relationship token helpers ───────────────────────────────────────────────

/**
 * Sum all pairwise relationship scores in the party, divide by 50.
 * Positive result → advantage pool. Negative result → jinx pool.
 */
async function computeRelationshipTokens(
  party: ActiveMember[],
): Promise<{ advPool: number; jinxPool: number }> {
  let total = 0;
  for (let i = 0; i < party.length; i++) {
    for (let j = i + 1; j < party.length; j++) {
      try { total += await getRelationship(party[i].uid, party[j].uid); } catch { /* non-fatal */ }
    }
  }
  const tokens = Math.floor(total / 50);
  return { advPool: Math.max(0, tokens), jinxPool: Math.max(0, -tokens) };
}

/**
 * Find the ally with the highest positive relationship score to `member`.
 * Returns null if no ally has a positive score.
 */
async function findBestAlly(member: ActiveMember, party: ActiveMember[]): Promise<ActiveMember | null> {
  let best: ActiveMember | null = null;
  let bestScore = 0; // only return if score > 0
  for (const ally of party) {
    if (ally.uid === member.uid || !ally.alive) continue;
    try {
      const score = await getRelationship(member.uid, ally.uid);
      if (score > bestScore) { bestScore = score; best = ally; }
    } catch { /* non-fatal */ }
  }
  return best;
}

function buildHistoryBlock(narratives: string[]): string {
  if (narratives.length === 0) return '';
  return `Previous events:\n${narratives.join('\n\n')}\n\n`;
}

async function generateRoomNarrative(
  eventSummary: string,
  previousNarratives: string[],
  quest: GuildQuest,
  party: ActiveMember[],
): Promise<string> {
  const prompt = [
    `You are narrating a fantasy quest called "${quest.title}" set in ${quest.biome}.`,
    `Party: ${buildPartyRoster(party)}. Use these pronouns consistently.`,
    buildHistoryBlock(previousNarratives),
    `Narrate the following event in past tense, immersive prose. Describe what happened dramatically — no damage numbers, hit points, dice rolls, or any game mechanics:\n${eventSummary}`,
  ].filter(Boolean).join('\n');

  try {
    return await callKoboldApi(prompt, 400);
  } catch {
    return '';
  }
}

async function generateRoleplayScene(
  scenario: ScenarioEntry,
  previousNarratives: string[],
  party: ActiveMember[],
  quest: GuildQuest,
): Promise<string> {
  const alive = party.filter((m) => m.alive);
  if (alive.length === 0) return '';

  // Resolve {{char1}} / {{char2}} placeholders and look up their relationship.
  let scenarioText = scenario.text;
  let char1: ActiveMember | null = null;
  let char2: ActiveMember | null = null;
  let relationshipLine = '';

  if (scenarioText.includes('{{char1}}') && alive.length >= 2) {
    const shuffled = [...alive].sort(() => Math.random() - 0.5);
    char1 = shuffled[0];
    char2 = shuffled[1];
    scenarioText = scenarioText
      .replace(/\{\{char1\}\}/g, char1.characterName)
      .replace(/\{\{char2\}\}/g, char2.characterName);
    try {
      const score = await getRelationship(char1.uid, char2.uid);
      const { label } = getRelationshipLabel(score);
      relationshipLine = `Current relationship between ${char1.characterName} and ${char2.characterName}: ${label} (score ${score > 0 ? '+' : ''}${score}). Let this colour their tone and reactions.`;
    } catch { /* non-fatal */ }
  }

  const prompt = [
    `You are narrating a fantasy quest called "${quest.title}" set in ${quest.biome}.`,
    `Party: ${buildPartyRoster(party)}. Use these pronouns consistently.`,
    relationshipLine,
    buildHistoryBlock(previousNarratives),
    `The adventurers take a moment. Scenario: ${scenarioText}`,
    `Write 2-3 brief exchanges of dialogue with minimal action beats. Past tense. Output only the scene — no title, no summary, no commentary.`,
  ].filter(Boolean).join('\n');

  try {
    const result = await callKoboldApi(prompt, 200);
    // Apply relationship delta after the scene is generated.
    if (char1 && char2 && scenario.relationshipDelta !== 0) {
      await adjustRelationship(char1.uid, char2.uid, scenario.relationshipDelta).catch(() => {});
    }
    return result;
  } catch {
    return '';
  }
}

// ─── Rewards ──────────────────────────────────────────────────────────────────

function rollRewardBonus(difficulty: QuestDifficulty): number {
  if (difficulty === 'medium') return 1;
  if (difficulty === 'hard') {
    const r = Math.random();
    return r < 0.4 ? 1 : r < 0.75 ? 2 : 3;
  }
  // deadly: guaranteed at least +2
  return Math.random() < 0.5 ? 2 : 3;
}

function generateItemUid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const GOLD_RANGE: Record<string, [number, number]> = {
  easy:   [50,  100],
  medium: [100, 175],
  hard:   [200, 300],
  deadly: [350, 500],
};

function rollGold(quest: GuildQuest): number {
  const [min, max] = GOLD_RANGE[quest.difficulty] ?? [50, 100];
  return quest.level * (min + Math.floor(Math.random() * (max - min + 1)));
}

async function generateQuestRewards(quest: GuildQuest): Promise<QuestReward> {
  const gold = rollGold(quest);

  if (quest.difficulty === 'easy') {
    return { gold };
  }

  const itemCount = Math.max(1, Math.floor(quest.level / 2));
  const items: GuildItem[] = [];

  for (let i = 0; i < itemCount; i++) {
    const equip = equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)];
    const stat = statOptions[Math.floor(Math.random() * statOptions.length)].value as ItemStat;
    const bonus = rollRewardBonus(quest.difficulty);

    const nameRaw = await callKoboldApi(
      `Name a fantasy ${equip.label.toLowerCase()} found in ${quest.biome} after completing "${quest.title}". Output only the name — no quotes, no explanation.`,
      14
    );
    const name = nameRaw.split('\n')[0].trim().replace(/^["']|["']$/g, '') || `${equip.label} of the ${quest.biome}`;

    const descRaw = await callKoboldApi(
      `Write 1-2 sentences of flavour text for "${name}", a ${equip.label.toLowerCase()} discovered in ${quest.biome}. Evocative, no game mechanics or numbers. Output only the flavour text.`,
      80
    );
    const description = descRaw.trim() || '';

    const item: GuildItem = {
      uid: generateItemUid(),
      name,
      slot: equip.slot,
      type: equip.type,
      description,
      stat,
      bonus,
      characterUid: null,
    };

    await insertGuildItem(item);
    items.push(item);
  }

  return { gold, items };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RunQuest({ quest, rooms, characters, onComplete, onFail, onStoryPrompt, onRewards }: RunQuestProps) {
  const [party, setParty] = useState<ActiveMember[]>(
    characters.map((c) => ({
      uid: c.uid,
      characterName: c.characterName,
      className: c.className,
      gender: c.gender,
      level: c.level,
      maxHp: c.hp,
      currentHp: c.hp,
      strength: c.strength,
      dexterity: c.dexterity,
      constitution: c.constitution,
      intelligence: c.intelligence,
      wisdom: c.wisdom,
      charisma: c.charisma,
      xpGained: 0,
      alive: true,
    }))
  );
  const [phase, setPhase] = useState<Phase>('simulating');
  const [statusText, setStatusText] = useState('Preparing quest...');
  const [lastNarrative, setLastNarrative] = useState('');
  const [advTokens, setAdvTokens] = useState(0);
  const [jinxTokens, setJinxTokens] = useState(0);

  useEffect(() => {
    void simulateAllRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function simulateAllRooms() {
    const quickMode = (await getSetting(QUICK_MODE_KEY)) === 'true';

    const [generalPrompts, bossPrompts, failurePrompts] = await Promise.all([
      listActiveRoleplayPrompts('general').catch(() => []),
      listActiveRoleplayPrompts('boss').catch(() => []),
      listActiveRoleplayPrompts('failure').catch(() => []),
    ]);
    const generalScenarios: ScenarioEntry[] = generalPrompts.length > 0
      ? generalPrompts.map((p) => ({ text: p.text, relationshipDelta: p.relationshipDelta }))
      : ROLEPLAY_SCENARIOS;
    const bossScenarios: ScenarioEntry[] = bossPrompts.length > 0
      ? bossPrompts.map((p) => ({ text: p.text, relationshipDelta: p.relationshipDelta }))
      : BOSS_ROLEPLAY_SCENARIOS;
    const failureScenarios: ScenarioEntry[] = failurePrompts.length > 0
      ? failurePrompts.map((p) => ({ text: p.text, relationshipDelta: p.relationshipDelta }))
      : FAILURE_ROLEPLAY_SCENARIOS;

    let currentParty: ActiveMember[] = characters.map((c) => ({
      uid: c.uid,
      characterName: c.characterName,
      className: c.className,
      gender: c.gender,
      level: c.level,
      maxHp: c.hp,
      currentHp: c.hp,
      strength: c.strength,
      dexterity: c.dexterity,
      constitution: c.constitution,
      intelligence: c.intelligence,
      wisdom: c.wisdom,
      charisma: c.charisma,
      xpGained: 0,
      alive: true,
    }));

    // narratives accumulates every per-event LLM output in order;
    // it is passed as rolling history to each subsequent call and
    // consumed by the final combining call.
    // Room 0: quest summary seeds the history so all LLM calls know the overarching goal.
    const narratives: string[] = quest.summary ? [quest.summary] : [];

    // Compute relationship tokens from party pairings
    const tokenResult = await computeRelationshipTokens(currentParty);
    let advPool = tokenResult.advPool;
    let jinxPool = tokenResult.jinxPool;
    setAdvTokens(advPool);
    setJinxTokens(jinxPool);

    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      setStatusText(`Room ${room.roomNumber} of ${rooms.length}...`);
      let roomRerollUsed = false;

      let content: RoomContent | null = null;
      try {
        content = JSON.parse(room.content) as RoomContent;
      } catch {
        /* skip unparseable room */
      }

      let eventSummary = '';

      if (content?.type === 'combat' || content?.type === 'boss') {
        const enemies: MinionStats[] =
          content.type === 'boss'
            ? [content.boss, ...content.minions]
            : content.enemies;

        const aliveChars = currentParty
          .filter((m) => m.alive)
          .map((m) => toGuildCharacterWithHp(characters.find((c) => c.uid === m.uid)!, m.currentHp));

        const guildEnemies = enemies as unknown as GuildEnemy[];
        const emptyItemsMap = new Map<string, GuildItem[]>();

        let result = runFightSimulation(aliveChars, guildEnemies, emptyItemsMap);
        let combatNote = '';

        // Advantage reroll: combat ended in defeat
        if (!roomRerollUsed && result.winner !== 'characters' && advPool > 0) {
          const lowestEntry = [...result.finalCharacterHps.entries()].sort((a, b) => a[1] - b[1])[0];
          const struggling = lowestEntry
            ? (currentParty.find((m) => m.uid === lowestEntry[0]) ?? currentParty[0])
            : currentParty[0];
          const ally = await findBestAlly(struggling, currentParty);
          result = runFightSimulation(aliveChars, guildEnemies, emptyItemsMap);
          advPool--;
          setAdvTokens(advPool);
          roomRerollUsed = true;
          const outcomeStr = result.winner === 'characters' ? 'turned the tide' : 'still could not turn the tide';
          combatNote = ally
            ? `[${ally.characterName} rallied to support ${struggling.characterName} at a critical moment — ${outcomeStr}]`
            : `[${struggling.characterName} found a second wind at the crucial moment — ${outcomeStr}]`;
        }

        // Jinx reroll: combat ended in victory
        if (!roomRerollUsed && result.winner === 'characters' && jinxPool > 0) {
          const aliveMembers = currentParty.filter((m) => m.alive);
          const unlucky = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
          result = runFightSimulation(aliveChars, guildEnemies, emptyItemsMap);
          jinxPool--;
          setJinxTokens(jinxPool);
          roomRerollUsed = true;
          const outcomeStr = result.winner === 'characters' ? 'still scraped through despite the friction' : 'proved fatal';
          combatNote = `[Party tension involving ${unlucky.characterName} nearly cost them dearly — ${outcomeStr}]`;
        }

        const survivorCount = Math.max(
          1,
          [...result.finalCharacterHps.values()].filter((hp) => hp > 0).length,
        );
        const xpPerSurvivor = Math.floor(result.totalXp / survivorCount);

        currentParty = currentParty.map((m) => {
          if (!m.alive) return m;
          const finalHp = result.finalCharacterHps.get(m.uid) ?? 0;
          const alive = finalHp > 0;
          return {
            ...m,
            currentHp: finalHp,
            alive,
            xpGained: alive ? m.xpGained + xpPerSurvivor : m.xpGained,
          };
        });
        setParty([...currentParty]);

        await updateQuestRoomStatus(room.uid, result.winner === 'characters' ? 'completed' : 'failed');

        const enemyNames = enemies.map((e) => e.characterName).join(', ');
        const roomLabel =
          content.type === 'boss' ? `Boss fight against ${content.boss.characterName}` : 'Combat';
        const outcome = result.winner === 'characters' ? 'victory' : 'defeat';
        eventSummary = `${roomLabel}: party vs ${enemyNames}. Result: ${outcome}. ${result.highlights}`;
        if (combatNote) eventSummary += ` ${combatNote}`;

      } else if (content?.type === 'challenge') {
        // ── Phase 1: roll for everyone (sync) ─────────────────────────────────
        type RollRecord = { uid: string; mod: number; roll: number; total: number; passed: boolean; damage: number };
        const rolls: RollRecord[] = currentParty.map((m) => {
          if (!m.alive) return { uid: m.uid, mod: 0, roll: 0, total: 0, passed: true, damage: 0 };
          const statValue = (m as unknown as Record<string, number>)[content.stat] ?? 10;
          const mod = statMod(statValue);
          const roll = rollDie(20);
          const total = roll + mod;
          const passed = total >= content.dc;
          const damage = passed ? 0 : Math.min(Math.floor(Math.random() * (6 * quest.level)) + 1, Math.floor(m.maxHp / 2));
          return { uid: m.uid, mod, roll, total, passed, damage };
        });

        let interventionNote = '';

        // ── Phase 2a: advantage reroll — worst failure gets a second chance ───
        if (!roomRerollUsed && advPool > 0) {
          const failures = rolls
            .map((r, idx) => ({ r, idx }))
            .filter(({ r }) => !r.passed && currentParty.find((m) => m.uid === r.uid)?.alive)
            .sort((a, b) => a.r.total - b.r.total); // worst first
          if (failures.length > 0) {
            const { r: worst, idx } = failures[0];
            const worstMember = currentParty.find((m) => m.uid === worst.uid)!;
            const ally = await findBestAlly(worstMember, currentParty);
            const newRoll = rollDie(20);
            const newTotal = newRoll + worst.mod;
            const newPassed = newTotal >= content.dc;
            const newDamage = newPassed ? 0 : Math.min(Math.floor(Math.random() * (6 * quest.level)) + 1, Math.floor(worstMember.maxHp / 2));
            rolls[idx] = { ...worst, roll: newRoll, total: newTotal, passed: newPassed, damage: newDamage };
            advPool--;
            setAdvTokens(advPool);
            roomRerollUsed = true;
            const outcomeStr = newPassed ? 'succeeded on the reroll' : 'failed again despite the intervention';
            interventionNote = ally
              ? `[${ally.characterName} stepped in for ${worstMember.characterName} — ${outcomeStr}]`
              : `[${worstMember.characterName} steeled themselves and tried again — ${outcomeStr}]`;
          }
        }

        // ── Phase 2b: jinx reroll — a success is put at risk ─────────────────
        if (!roomRerollUsed && jinxPool > 0) {
          const successes = rolls
            .map((r, idx) => ({ r, idx }))
            .filter(({ r }) => r.passed && currentParty.find((m) => m.uid === r.uid)?.alive);
          if (successes.length > 0) {
            const { r: target, idx } = successes[Math.floor(Math.random() * successes.length)];
            const targetMember = currentParty.find((m) => m.uid === target.uid)!;
            const newRoll = rollDie(20);
            const newTotal = newRoll + target.mod;
            const newPassed = newTotal >= content.dc;
            const newDamage = newPassed ? 0 : Math.min(Math.floor(Math.random() * (6 * quest.level)) + 1, Math.floor(targetMember.maxHp / 2));
            rolls[idx] = { ...target, roll: newRoll, total: newTotal, passed: newPassed, damage: newDamage };
            jinxPool--;
            setJinxTokens(jinxPool);
            roomRerollUsed = true;
            const outcomeStr = newPassed ? 'still managed to pull through' : 'fumbled at the worst moment';
            interventionNote = `[Party discord rattled ${targetMember.characterName}, who ${outcomeStr}]`;
          }
        }

        // ── Phase 3: apply results ─────────────────────────────────────────────
        const rollDetails: string[] = [];
        currentParty = currentParty.map((m) => {
          const r = rolls.find((x) => x.uid === m.uid);
          if (!r || !m.alive) return m;
          const modStr = r.mod >= 0 ? `+${r.mod}` : `${r.mod}`;
          if (r.passed) {
            rollDetails.push(`${m.characterName} rolled ${r.roll}${modStr}=${r.total} vs DC ${content.dc} — passed`);
            return m;
          }
          const newHp = Math.max(0, m.currentHp - r.damage);
          rollDetails.push(`${m.characterName} rolled ${r.roll}${modStr}=${r.total} vs DC ${content.dc} — failed, took ${r.damage} damage`);
          return { ...m, currentHp: newHp, alive: newHp > 0 };
        });
        setParty([...currentParty]);

        await updateQuestRoomStatus(room.uid, 'completed');

        eventSummary = `Challenge (${content.stat.toUpperCase()} DC ${content.dc}): ${content.description}. ${rollDetails.join('; ')}.`;
        if (interventionNote) eventSummary += ` ${interventionNote}`;
      }

      // Per-room narrative — skipped in quick mode (raw summary used instead)
      if (eventSummary) {
        if (quickMode) {
          narratives.push(eventSummary);
        } else {
          const narrative = await generateRoomNarrative(eventSummary, narratives, quest, currentParty);
          if (narrative) {
            narratives.push(narrative);
            setLastNarrative(narrative);
          }
        }
      }

      // Now check for total party wipe — story for completed rooms is already in narratives
      if (currentParty.every((m) => !m.alive)) {
        await handleQuestFail(currentParty, narratives, failureScenarios, quickMode);
        return;
      }

      // Heal between rooms (not after the final room)
      if (i < rooms.length - 1) {
        const cleric = hasClericInParty(currentParty);
        currentParty = currentParty.map((m) => applyHealing(m, cleric));
        setParty([...currentParty]);

        // Roleplay: before the boss room, or after every 2nd room
        const nextRoom = rooms[i + 1];
        const nextIsBoss = nextRoom?.roomType === 'boss';
        const isEveryTwoRooms = (i + 1) % 2 === 0;

        if (!quickMode && (nextIsBoss || isEveryTwoRooms)) {
          const scenario = nextIsBoss
            ? pickRandom(bossScenarios)
            : pickRandom(generalScenarios);
          setStatusText('The party takes a moment...');
          const scene = await generateRoleplayScene(scenario, narratives, currentParty, quest);
          if (scene) {
            narratives.push(scene);
            setLastNarrative(scene);
          }
        }
      }
    }

    // All rooms complete — combine all narratives into one story
    setPhase('generating_story');
    setStatusText('Writing quest story...');
    await generateStory(currentParty, narratives);
  }

  async function generateStory(finalParty: ActiveMember[], narratives: string[]) {
    const fallen = finalParty.filter((m) => !m.alive).map((m) => m.characterName); // incapacitated, not dead
    const survivors = finalParty.filter((m) => m.alive).map((m) => m.characterName).join(', ');

    const promptLines = [
      `You are a storyteller. The following are all the events of the quest "${quest.title}" set in ${quest.biome}, in order. The first entry describes the quest's goal — use it to frame the story:`,
      '',
      narratives.join('\n\n'),
      '',
      fallen.length > 0 ? `Too wounded to continue: ${fallen.join(', ')}.` : '',
      `Survivors: ${survivors || 'none'}.`,
      '',
      'Weave all of these events into one cohesive fantasy story. Flowing prose, past tense, immersive. Include every event in order — combat, challenges, and all dialogue scenes. Do not skip or condense any of them.',
      `The story must have a definitive ending: the party completes the quest objective, defeats the final enemy, and leaves the ${quest.biome}. Close with a final sentence showing the party departing or reflecting on what was accomplished — not a teaser for future adventures. Output only the story.`,
    ].filter(Boolean);

    const finalPrompt = promptLines.join('\n');
    onStoryPrompt?.(finalPrompt);

    let story = narratives.join('\n\n');
    try {
      const raw = await callKoboldApi(finalPrompt, 2000);
      if (raw.trim()) story = raw.trim();
    } catch {
      // fall back to joined narratives
    }

    try {
      await updateQuestNarrative(quest.uid, story);
      await updateQuestStatus(quest.uid, 'completed');

      for (const m of finalParty) {
        if (m.alive) {
          const original = characters.find((c) => c.uid === m.uid)!;
          const totalXp = original.experience + m.xpGained;
          const newLevel = Math.min(levelFromXp(totalXp), MAX_LEVEL);
          const newMaxHp = newLevel > m.level
            ? calculateMaxHp(original.className, original.constitution, newLevel)
            : m.maxHp;
          await updateGuildCharacterXp(m.uid, totalXp, newLevel, newMaxHp);
        } else {
          await updateGuildCharacterHp(m.uid, m.maxHp);
        }
      }
    } catch (err) {
      console.error('Failed to save quest results:', err);
    }

    setStatusText('Generating rewards...');
    try {
      const reward = await generateQuestRewards(quest);
      onRewards?.(reward);
    } catch (err) {
      console.error('Failed to generate rewards:', err);
    }

    setPhase('complete');
    onComplete();
  }

  async function handleQuestFail(finalParty: ActiveMember[], narratives: string[], failureScenarios: ScenarioEntry[], quickMode = false) {
    setPhase('generating_story');
    setStatusText('The party regroups...');

    // Failure roleplay — skipped in quick mode
    let allNarratives = narratives;
    if (!quickMode) {
      const scenario = pickRandom(failureScenarios);
      const failureScene = await generateRoleplayScene(scenario, narratives, finalParty, quest);
      if (failureScene) setLastNarrative(failureScene);
      allNarratives = failureScene ? [...narratives, failureScene] : narratives;
    }

    setStatusText('Writing quest story...');
    const partyNames = finalParty.map((m) => m.characterName).join(', ');
    const promptLines = [
      `You are a storyteller. The following are all the events of the failed quest "${quest.title}" set in ${quest.biome}, in order. The first entry describes the quest's goal — use it to frame the story:`,
      '',
      allNarratives.join('\n\n'),
      '',
      `The party (${partyNames}) was ultimately defeated and forced to retreat.`,
      '',
      'Weave all of these events into one cohesive fantasy story ending in defeat, 4-6 paragraphs. Flowing prose, past tense, immersive. Include every event in order — combat, challenges, all dialogue scenes, and the party\'s final moments. Do not skip or condense any of them.',
      `The story must have a definitive ending: the party is overwhelmed, forced to retreat, and leaves the ${quest.biome} having failed their objective. Close with a final sentence showing them withdrawing or reflecting on the defeat — not a teaser for future adventures. Output only the story.`,
    ].filter(Boolean);

    const finalPrompt = promptLines.join('\n');
    onStoryPrompt?.(finalPrompt);

    let story = allNarratives.join('\n\n');
    try {
      const raw = await callKoboldApi(finalPrompt, 2000);
      if (raw.trim()) story = raw.trim();
    } catch {
      // fall back to joined narratives
    }

    try {
      await updateQuestNarrative(quest.uid, story);
      await updateQuestStatus(quest.uid, 'failed');
      for (const m of finalParty) {
        await updateGuildCharacterHp(m.uid, m.maxHp);
      }
    } catch (err) {
      console.error('Failed to save quest failure:', err);
    }

    setPhase('failed');
    onFail();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ThemedView style={styles.container}>
      {/* Party HP bar */}
      <View style={styles.partyBar}>
        {party.map((m) => (
          <View key={m.uid} style={styles.memberChip}>
            <ThemedText style={[styles.memberName, !m.alive && styles.memberDead]}>
              {m.characterName.split(' ')[0]}
            </ThemedText>
            <ThemedText style={[styles.memberHp, !m.alive && styles.memberDead]}>
              {m.alive ? `${m.currentHp}/${m.maxHp}` : '✕'}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* Relationship tokens */}
      {(advTokens > 0 || jinxTokens > 0) ? (
        <View style={styles.tokensRow}>
          {advTokens > 0 ? (
            <View style={[styles.tokenBadge, styles.tokenAdvantage]}>
              <ThemedText style={styles.tokenText}>🎲 Advantage ×{advTokens}</ThemedText>
            </View>
          ) : null}
          {jinxTokens > 0 ? (
            <View style={[styles.tokenBadge, styles.tokenJinx]}>
              <ThemedText style={styles.tokenText}>⚡ Jinx ×{jinxTokens}</ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Status */}
      {phase === 'simulating' || phase === 'generating_story' ? (
        <ThemedText style={styles.statusText}>{statusText}</ThemedText>
      ) : null}

      {/* Last room narrative */}
      {lastNarrative ? (
        <ThemedText style={styles.narrativeText}>{lastNarrative}</ThemedText>
      ) : null}
    </ThemedView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  partyBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
    minWidth: 60,
  },
  memberName: {
    fontSize: 12,
    fontWeight: '600',
  },
  memberHp: {
    fontSize: 11,
    color: '#2E7D32',
  },
  memberDead: {
    color: '#B00020',
    textDecorationLine: 'line-through',
  },
  narrativeText: {
    fontSize: 14,
    color: '#687076',
    lineHeight: 22,
    fontStyle: 'italic',
    borderTopWidth: 1,
    borderTopColor: '#E0E4E7',
    paddingTop: 10,
  },
  statusText: {
    color: '#687076',
    fontStyle: 'italic',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
  tokensRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tokenBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  tokenAdvantage: {
    backgroundColor: 'rgba(46, 90, 28, 0.12)',
    borderColor: '#2E5A1C',
  },
  tokenJinx: {
    backgroundColor: 'rgba(176, 0, 32, 0.1)',
    borderColor: '#B00020',
  },
  tokenText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
