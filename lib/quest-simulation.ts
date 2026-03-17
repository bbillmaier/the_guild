/**
 * Headless quest simulation — runs the same logic as the RunQuest component
 * but as a pure async function with no React state.
 */

import { callKoboldApi } from '@/components/LLM/kobold';
import { runFightSimulation } from '@/components/combat/fight';
import { type MinionStats, type RoomContent } from '@/components/quest/create/create_quest';
import { equipmentTypes, statOptions } from '@/components/items/create_item';
import {
  adjustRelationship,
  adjustResource,
  getRelationship,
  getRelationshipLabel,
  insertGuildItem,
  insertPendingQuestCompletion,
  deletePendingQuestCompletion,
  listActiveRoleplayPrompts,
  setRelationshipScore,
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
  type PendingQuestCompletion,
  type QuestRoom,
  type XpChange,
} from '@/lib/local-db';
import { saveQuestHistoryForParty } from '@/lib/history';
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

export type QuestReward = {
  gold?: number;
  items?: GuildItem[];
};

export type SimulationResult = {
  outcome: 'success' | 'failure';
  narrative: string;
  reward: QuestReward | null;
  xpChanges: XpChange[];
  relationshipDelta: number;
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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildHistoryBlock(narratives: string[]): string {
  if (narratives.length === 0) return '';
  return `Previous events:\n${narratives.join('\n\n')}\n\n`;
}

// ─── Relationship token helpers ───────────────────────────────────────────────

async function computeRelationshipTokens(party: ActiveMember[]): Promise<{ advPool: number; jinxPool: number }> {
  let total = 0;
  for (let i = 0; i < party.length; i++) {
    for (let j = i + 1; j < party.length; j++) {
      try { total += await getRelationship(party[i].uid, party[j].uid); } catch { /* non-fatal */ }
    }
  }
  const tokens = Math.floor(total / 50);
  return { advPool: Math.max(0, tokens), jinxPool: Math.max(0, -tokens) };
}

async function findBestAlly(member: ActiveMember, party: ActiveMember[]): Promise<ActiveMember | null> {
  let best: ActiveMember | null = null;
  let bestScore = 0;
  for (const ally of party) {
    if (ally.uid === member.uid || !ally.alive) continue;
    try {
      const score = await getRelationship(member.uid, ally.uid);
      if (score > bestScore) { bestScore = score; best = ally; }
    } catch { /* non-fatal */ }
  }
  return best;
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

// ─── Narrative generation ─────────────────────────────────────────────────────

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
    if (char1 && char2 && scenario.relationshipDelta !== 0) {
      await adjustRelationship(char1.uid, char2.uid, scenario.relationshipDelta).catch(() => {});
    }
    return result;
  } catch {
    return '';
  }
}

// ─── Rewards ──────────────────────────────────────────────────────────────────

function rollRewardBonus(difficulty: string): number {
  if (difficulty === 'medium') return 1;
  if (difficulty === 'hard') {
    const r = Math.random();
    return r < 0.4 ? 1 : r < 0.75 ? 2 : 3;
  }
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

    items.push(item);
  }

  return { gold, items };
}

// ─── Relationship adjustment ──────────────────────────────────────────────────

const QUEST_OUTCOME_CAP = 50;

// ─── Main headless simulation ─────────────────────────────────────────────────

export async function runQuestHeadless(
  quest: GuildQuest,
  rooms: QuestRoom[],
  characters: GuildCharacter[],
  onProgress?: (status: string) => void,
): Promise<SimulationResult> {
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

  const narratives: string[] = quest.summary ? [quest.summary] : [];
  // Raw mechanical event summaries (pre-LLM) — stored as the combat log
  const combatLog: string[] = [];

  const tokenResult = await computeRelationshipTokens(currentParty);
  let advPool = tokenResult.advPool;
  let jinxPool = tokenResult.jinxPool;

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    onProgress?.(`Room ${room.roomNumber} of ${rooms.length}...`);
    let roomRerollUsed = false;

    let content: RoomContent | null = null;
    try {
      content = JSON.parse(room.content) as RoomContent;
    } catch { /* skip */ }

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

      if (!roomRerollUsed && result.winner !== 'characters' && advPool > 0) {
        const lowestEntry = [...result.finalCharacterHps.entries()].sort((a, b) => a[1] - b[1])[0];
        const struggling = lowestEntry
          ? (currentParty.find((m) => m.uid === lowestEntry[0]) ?? currentParty[0])
          : currentParty[0];
        const ally = await findBestAlly(struggling, currentParty);
        result = runFightSimulation(aliveChars, guildEnemies, emptyItemsMap);
        advPool--;
        roomRerollUsed = true;
        const outcomeStr = result.winner === 'characters' ? 'turned the tide' : 'still could not turn the tide';
        combatNote = ally
          ? `[${ally.characterName} rallied to support ${struggling.characterName} at a critical moment — ${outcomeStr}]`
          : `[${struggling.characterName} found a second wind at the crucial moment — ${outcomeStr}]`;
      }

      if (!roomRerollUsed && result.winner === 'characters' && jinxPool > 0) {
        const aliveMembers = currentParty.filter((m) => m.alive);
        const unlucky = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
        result = runFightSimulation(aliveChars, guildEnemies, emptyItemsMap);
        jinxPool--;
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
        return { ...m, currentHp: finalHp, alive, xpGained: alive ? m.xpGained + xpPerSurvivor : m.xpGained };
      });

      await updateQuestRoomStatus(room.uid, result.winner === 'characters' ? 'completed' : 'failed');

      const enemyNames = enemies.map((e) => e.characterName).join(', ');
      const roomLabel = content.type === 'boss' ? `Boss fight against ${content.boss.characterName}` : 'Combat';
      const outcome = result.winner === 'characters' ? 'victory' : 'defeat';
      eventSummary = `${roomLabel}: party vs ${enemyNames}. Result: ${outcome}. ${result.highlights}`;
      if (combatNote) eventSummary += ` ${combatNote}`;

    } else if (content?.type === 'challenge') {
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

      if (!roomRerollUsed && advPool > 0) {
        const failures = rolls
          .map((r, idx) => ({ r, idx }))
          .filter(({ r }) => !r.passed && currentParty.find((m) => m.uid === r.uid)?.alive)
          .sort((a, b) => a.r.total - b.r.total);
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
          roomRerollUsed = true;
          const outcomeStr = newPassed ? 'succeeded on the reroll' : 'failed again despite the intervention';
          interventionNote = ally
            ? `[${ally.characterName} stepped in for ${worstMember.characterName} — ${outcomeStr}]`
            : `[${worstMember.characterName} steeled themselves and tried again — ${outcomeStr}]`;
        }
      }

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
          roomRerollUsed = true;
          const outcomeStr = newPassed ? 'still managed to pull through' : 'fumbled at the worst moment';
          interventionNote = `[Party discord rattled ${targetMember.characterName}, who ${outcomeStr}]`;
        }
      }

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

      await updateQuestRoomStatus(room.uid, 'completed');

      eventSummary = `Challenge (${content.stat.toUpperCase()} DC ${content.dc}): ${content.description}. ${rollDetails.join('; ')}.`;
      if (interventionNote) eventSummary += ` ${interventionNote}`;
    }

    if (eventSummary) {
      combatLog.push(eventSummary);
      if (quickMode) {
        narratives.push(eventSummary);
      } else {
        const narrative = await generateRoomNarrative(eventSummary, narratives, quest, currentParty);
        if (narrative) narratives.push(narrative);
      }
    }

    if (currentParty.every((m) => !m.alive)) {
      return finalizeFailure(quest, rooms, characters, currentParty, narratives, combatLog, failureScenarios, quickMode, onProgress);
    }

    if (i < rooms.length - 1) {
      const cleric = hasClericInParty(currentParty);
      currentParty = currentParty.map((m) => applyHealing(m, cleric));

      const nextRoom = rooms[i + 1];
      const nextIsBoss = nextRoom?.roomType === 'boss';
      const isEveryTwoRooms = (i + 1) % 2 === 0;

      if (!quickMode && (nextIsBoss || isEveryTwoRooms)) {
        const scenario = nextIsBoss ? pickRandom(bossScenarios) : pickRandom(generalScenarios);
        onProgress?.('The party takes a moment...');
        const scene = await generateRoleplayScene(scenario, narratives, currentParty, quest);
        if (scene) narratives.push(scene);
      }
    }
  }

  return finalizeSuccess(quest, rooms, characters, currentParty, narratives, combatLog, quickMode, onProgress);
}

// ─── Finalize success ─────────────────────────────────────────────────────────

async function finalizeSuccess(
  quest: GuildQuest,
  rooms: QuestRoom[],
  characters: GuildCharacter[],
  finalParty: ActiveMember[],
  narratives: string[],
  combatLog: string[],
  quickMode: boolean,
  onProgress?: (status: string) => void,
): Promise<SimulationResult> {
  onProgress?.('Writing quest story...');
  const fallen = finalParty.filter((m) => !m.alive).map((m) => m.characterName);
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

  let story = narratives.join('\n\n');
  try {
    const raw = await callKoboldApi(promptLines.join('\n'), 2000);
    if (raw.trim()) story = raw.trim();
  } catch { /* fall back to joined narratives */ }

  try {
    await updateQuestNarrative(quest.uid, story);
    await updateQuestStatus(quest.uid, 'completed');
  } catch (err) {
    console.error('[quest-simulation] Failed to save success results:', err);
  }

  await saveQuestHistoryForParty(quest, characters, rooms, story, 'success', combatLog.join('\n\n')).catch(console.error);

  // Pre-calculate XP changes (applied on reveal day)
  const xpChanges: XpChange[] = finalParty.map((m) => {
    const original = characters.find((c) => c.uid === m.uid)!;
    if (m.alive) {
      const totalXp = original.experience + m.xpGained;
      const newLevel = Math.min(levelFromXp(totalXp), MAX_LEVEL);
      const newMaxHp = newLevel > m.level
        ? calculateMaxHp(original.className, original.constitution, newLevel)
        : m.maxHp;
      return { uid: m.uid, applyXp: true, totalXp, newLevel, newMaxHp, restoreHp: m.maxHp };
    }
    return { uid: m.uid, applyXp: false, totalXp: 0, newLevel: m.level, newMaxHp: m.maxHp, restoreHp: m.maxHp };
  });

  onProgress?.('Generating rewards...');
  let reward: QuestReward | null = null;
  try {
    reward = await generateQuestRewards(quest);
  } catch (err) {
    console.error('[quest-simulation] Failed to generate rewards:', err);
  }

  return { outcome: 'success', narrative: story, reward, xpChanges, relationshipDelta: 5 };
}

// ─── Finalize failure ─────────────────────────────────────────────────────────

async function finalizeFailure(
  quest: GuildQuest,
  rooms: QuestRoom[],
  characters: GuildCharacter[],
  finalParty: ActiveMember[],
  narratives: string[],
  combatLog: string[],
  failureScenarios: ScenarioEntry[],
  quickMode: boolean,
  onProgress?: (status: string) => void,
): Promise<SimulationResult> {
  onProgress?.('The party regroups...');

  let allNarratives = narratives;
  if (!quickMode) {
    const scenario = pickRandom(failureScenarios);
    const failureScene = await generateRoleplayScene(scenario, narratives, finalParty, quest);
    if (failureScene) allNarratives = [...narratives, failureScene];
  }

  onProgress?.('Writing quest story...');
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

  let story = allNarratives.join('\n\n');
  try {
    const raw = await callKoboldApi(promptLines.join('\n'), 2000);
    if (raw.trim()) story = raw.trim();
  } catch { /* fall back */ }

  try {
    await updateQuestNarrative(quest.uid, story);
    await updateQuestStatus(quest.uid, 'failed');
  } catch (err) {
    console.error('[quest-simulation] Failed to save failure results:', err);
  }

  await saveQuestHistoryForParty(quest, characters, rooms, story, 'failure', combatLog.join('\n\n')).catch(console.error);

  // On failure: all characters restore HP to max on reveal day
  const xpChanges: XpChange[] = finalParty.map((m) => ({
    uid: m.uid, applyXp: false, totalXp: 0, newLevel: m.level, newMaxHp: m.maxHp, restoreHp: m.maxHp,
  }));

  return { outcome: 'failure', narrative: story, reward: null, xpChanges, relationshipDelta: -5 };
}

// ─── Apply pending quest completion ──────────────────────────────────────────

async function adjustRelationshipsByUids(uids: string[], delta: number): Promise<void> {
  for (let i = 0; i < uids.length; i++) {
    for (let j = i + 1; j < uids.length; j++) {
      try {
        const current = await getRelationship(uids[i], uids[j]);
        const next = delta > 0
          ? Math.min(QUEST_OUTCOME_CAP, current + delta)
          : Math.max(-QUEST_OUTCOME_CAP, current + delta);
        if (next !== current) await setRelationshipScore(uids[i], uids[j], next);
      } catch { /* non-fatal */ }
    }
  }
}

export async function applyQuestCompletion(pending: PendingQuestCompletion): Promise<void> {
  // Apply XP / HP changes
  for (const xc of pending.xpChanges) {
    try {
      if (xc.applyXp) {
        await updateGuildCharacterXp(xc.uid, xc.totalXp, xc.newLevel, xc.newMaxHp);
      } else {
        await updateGuildCharacterHp(xc.uid, xc.restoreHp);
      }
    } catch (err) {
      console.error('[applyQuestCompletion] XP/HP update failed:', err);
    }
  }

  // Apply gold
  if (pending.gold > 0) {
    await adjustResource('gold', pending.gold).catch(console.error);
  }

  // Insert items to armory
  for (const item of pending.itemData) {
    await insertGuildItem(item).catch(console.error);
  }

  // Adjust relationships
  if (pending.relationshipDelta !== 0) {
    await adjustRelationshipsByUids(pending.partyUids, pending.relationshipDelta).catch(console.error);
  }

  // Remove the pending record
  await deletePendingQuestCompletion(pending.uid).catch(console.error);
}
