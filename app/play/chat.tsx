import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { callKoboldApi } from '@/components/LLM/kobold';
import { buildHistoryContext, buildTemporalContext, saveChatHistoryEntry, type ChatMessageForHistory } from '@/lib/history';
import { GUILD_MASTER_UID } from '@/lib/generate-opinion';
import {
  fetchKoboldMaxContext,
  estimateTokens,
  questToMemory,
  chatToMemory,
  opinionToMemory,
  updateMemoryRecency,
  mergeMemories,
  buildActiveMemoryContext,
  findRelevantMemories,
  capQuestMemories,
  type ActiveMemoryEntry,
} from '@/lib/context-budget';
import { Image } from 'expo-image';
import { CharacterAvatar } from '@/components/character-avatar';
import { generateSceneImage } from '@/lib/comfy';
import { ThemedText } from '@/components/themed-text';
import {
  getGameDay,
  getOpinion,
  getRelationshipLabel,
  getRandomGreetingForRoom,
  initializeDatabase,
  listChatHistoryForCharacter,
  listGuildCharacters,
  listGuildQuests,
  listOpinionsForCharacter,
  listQuestHistoryForCharacter,
  listQuestRooms,
  listRelationshipsForCharacter,
  resolveEffectiveAvatarPath,
  type CharacterOpinion,
  type ChatHistory,
  type GuildCharacter,
  type GuildQuest,
  type QuestDifficulty,
  type QuestHistory,
  type QuestRoom,
} from '@/lib/local-db';
import { useQuestRunner } from '@/contexts/quest-runner';
import { getRoomAssignments, type RoomKey } from '@/lib/room-assignments';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatMessage = {
  role: 'player' | 'character' | 'image';
  text: string;
  timestamp: string;
  imagePath?: string;
};

// ─── Keyword detection ────────────────────────────────────────────────────────

const QUEST_KEYWORDS = [
  'quest', 'mission', 'contract', 'adventure', 'bounty',
  'expedition', 'dungeon', 'task', 'venture', 'errand', 'job',
  'hired', 'assignment', 'work',
];

function hasQuestKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return QUEST_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Difficulty helpers ───────────────────────────────────────────────────────

const DIFF_COLOR: Record<QuestDifficulty, string> = {
  easy: '#2E7D32', medium: '#F57C00', hard: '#B00020', deadly: '#4A0072',
};

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ─── Companion context builder ────────────────────────────────────────────────

function buildCompanionContext(companions: GuildCharacter[], relMap: Map<string, number> = new Map()): string {
  if (companions.length === 0) return '';
  const lines = ['Other guild members mentioned in this conversation:'];
  for (const c of companions) {
    const parts: string[] = [`${c.characterName} (Lv ${c.level} ${c.race} ${c.className})`];
    if (c.physDesc.length > 0) parts.push(c.physDesc.join(', '));
    if (c.metaDesc.length > 0) parts.push(c.metaDesc.join(', '));
    if (c.baseDescription) parts.push(c.baseDescription);
    if (relMap.has(c.uid)) {
      const score = relMap.get(c.uid)!;
      const { label } = getRelationshipLabel(score);
      parts.push(`relationship: ${label}`);
    }
    lines.push(`- ${parts.join('. ')}`);
  }
  return lines.join('\n');
}

async function loadRelMap(characterUid: string, companions: GuildCharacter[]): Promise<Map<string, number>> {
  if (companions.length === 0) return new Map();
  try {
    const rels = await listRelationshipsForCharacter(characterUid);
    const map = new Map<string, number>();
    for (const r of rels) {
      const other = r.charA === characterUid ? r.charB : r.charA;
      map.set(other, r.score);
    }
    return map;
  } catch {
    return new Map();
  }
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(character: GuildCharacter, historyContext = '', companions: GuildCharacter[] = [], relMap: Map<string, number> = new Map(), gmOpinion = ''): string {
  const pronouns =
    character.gender === 'male' ? 'he/him' :
    character.gender === 'female' ? 'she/her' : 'they/them';

  const physLine = character.physDesc.length > 0
    ? `Physical appearance: ${character.physDesc.join(', ')}.` : '';
  const metaLine = character.metaDesc.length > 0
    ? `Personality traits: ${character.metaDesc.join(', ')}.` : '';

  const companionCtx = buildCompanionContext(companions, relMap);
  const name = character.characterName;

  return [
    `You are roleplaying as ${name}, a level ${character.level} ${character.race} ${character.className} (${pronouns}).`,
    `You are a member of the adventurer's guild, currently relaxing at the guild tavern.`,
    character.baseDescription ? `Background: ${character.baseDescription}` : '',
    physLine,
    metaLine,
    ``,
    `You are speaking with the Guild Master. Stay fully in character. Speak in first person as ${name}.`,
    `Keep replies short — 1 to 3 sentences. Never mention game mechanics, numbers, or stats.`,
    `Do not break character. Do not use asterisks for actions. Never write the Guild Master's dialogue or actions.`,
    historyContext ? `\nThe following are ${name}'s memories of past events. Use them naturally in conversation if relevant — do not recite them directly.\n${historyContext}` : '',
    gmOpinion ? `\n${gmOpinion}` : '',
    companionCtx ? `\n${companionCtx}` : '',
  ].filter(Boolean).join('\n');
}

function buildPrompt(character: GuildCharacter, history: ChatMessage[], playerInput: string, historyCtx = '', companions: GuildCharacter[] = [], relMap: Map<string, number> = new Map(), gmOpinion = ''): string {
  const system = buildSystemPrompt(character, historyCtx, companions, relMap, gmOpinion);
  const name = character.characterName;
  const lines: string[] = [system, ''];

  for (const msg of history) {
    lines.push(msg.role === 'player' ? `Guild Master: ${msg.text}` : `${name}: ${msg.text}`);
  }

  lines.push(`Guild Master: ${playerInput}`);
  lines.push(`${name}:`);
  return lines.join('\n');
}

/** Strip everything after the first newline to prevent LLMs from roleplaying both sides. */
function firstLine(text: string): string {
  return text.split('\n')[0].trim();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { characterUid } = useLocalSearchParams<{ characterUid: string }>();
  const navigation = useNavigation();
  const questRunner = useQuestRunner();

  const [character, setCharacter]           = useState<GuildCharacter | null>(null);
  const [effectiveAvatarPath, setEffectiveAvatarPath] = useState<string | null>(null);
  const [allCharacters, setAllCharacters] = useState<GuildCharacter[]>([]);
  const [mentionedChars, setMentionedChars] = useState<GuildCharacter[]>([]);
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [historyContext, setHistoryContext] = useState('');
  const [gmOpinion, setGmOpinion] = useState('');
  const [gameDay, setGameDay] = useState(1);
  const [singleLine, setSingleLine] = useState(true);
  const [maxContextTokens, setMaxContextTokens] = useState(4096);

  // Active memories — records fetched via keyword matching, managed by recency
  const [activeMemories, setActiveMemories] = useState<ActiveMemoryEntry[]>([]);
  const messageTurnRef = useRef(0);
  // Pool of all available memories loaded at startup — never injected directly, searched per message
  const memoryPoolRef = useRef<ActiveMemoryEntry[]>([]);

  // Memory inspector
  const [showMemory, setShowMemory]             = useState(false);
  const [memLoading, setMemLoading]             = useState(false);
  const [expandedIds, setExpandedIds]           = useState<Set<string>>(new Set());
  const [questSectionOpen, setQuestSectionOpen]     = useState(true);
  const [chatSectionOpen, setChatSectionOpen]       = useState(true);
  const [opinionSectionOpen, setOpinionSectionOpen] = useState(true);
  // UIDs of memories included in the most recent LLM call
  const [lastIncludedUids, setLastIncludedUids] = useState<Set<string>>(new Set());

  // Base context records (loaded at startup, matches buildHistoryContext)
  const [baseMemQuests, setBaseMemQuests]       = useState<QuestHistory[]>([]);
  const [baseMemChats, setBaseMemChats]         = useState<ChatHistory[]>([]);

  // Quest banner & modal
  const [questBanner, setQuestBanner]           = useState(false);
  const [showModal, setShowModal]               = useState(false);
  const [modalQuests, setModalQuests]           = useState<GuildQuest[]>([]);
  const [modalChars, setModalChars]             = useState<GuildCharacter[]>([]);
  const [selectedQuestUid, setSelectedQuestUid] = useState<string | null>(null);
  const [selectedPartyUids, setSelectedPartyUids] = useState<string[]>([]);
  const [inspectedUid, setInspectedUid]         = useState<string | null>(null);
  // Flat map of `smallerUid|largerUid` → score, loaded when modal opens
  const [modalRelScores, setModalRelScores]     = useState<Map<string, number>>(new Map());

  // Tracks assigned quest so we can start it fire-and-forget on leave
  const assignedRef = useRef<{ quest: GuildQuest; partyUids: string[]; rooms: QuestRoom[] } | null>(null);

  // Refs so beforeRemove always sees the latest values (avoids stale closure)
  const characterRef = useRef<GuildCharacter | null>(null);
  const allCharactersRef = useRef<GuildCharacter[]>([]);
  const messagesRef  = useRef<ChatMessage[]>([]);
  const historySavedRef = useRef(false);

  const scrollRef = useRef<ScrollView>(null);

  // Keep refs in sync
  useEffect(() => { characterRef.current = character; }, [character]);
  useEffect(() => { allCharactersRef.current = allCharacters; }, [allCharacters]);
  useEffect(() => { messagesRef.current  = messages;  }, [messages]);

  // ── beforeRemove: save history; if quest assigned, start fire-and-forget ───
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (_e: any) => {
      const char = characterRef.current;
      const msgs = messagesRef.current;
      if (char && msgs.length > 0 && !historySavedRef.current) {
        historySavedRef.current = true;
        const textMsgs = msgs.filter((m) => m.role !== 'image') as ChatMessageForHistory[];
        void saveChatHistoryEntry(char, textMsgs, !!assignedRef.current).catch(console.error);
      }

      if (!assignedRef.current) return;
      const { quest, partyUids, rooms } = assignedRef.current;
      assignedRef.current = null;
      const allChars = char ? [char, ...allCharactersRef.current.filter((c: GuildCharacter) => c.uid !== char.uid)] : allCharactersRef.current;
      const partyChars = allChars.filter((c: GuildCharacter) => partyUids.includes(c.uid));
      questRunner.startQuest(quest, rooms, partyChars);
    });
    return unsubscribe;
  }, [navigation, questRunner]);

  // ── Load character ──────────────────────────────────────────────────────────
  useEffect(() => {
    void loadCharacter();
  }, [characterUid]);

  async function loadCharacter() {
    try {
      await initializeDatabase();
      const [all, day] = await Promise.all([listGuildCharacters(), getGameDay()]);
      setAllCharacters(all);
      const found = all.find((c) => c.uid === characterUid) ?? null;
      setCharacter(found);
      if (found) {
        navigation.setOptions({ title: found.characterName });
        const { assignments: roomMap } = await getRoomAssignments(day, all);
        const charRoom: RoomKey = roomMap[found.uid] ?? 'tavern';
        const [ctx, greeting, effectivePath, maxCtx, poolQuests, poolChats, poolOpinions, gmOp] = await Promise.all([
          buildHistoryContext(found.uid, day),
          getRandomGreetingForRoom(charRoom),
          resolveEffectiveAvatarPath(found, charRoom, day),
          fetchKoboldMaxContext(),
          listQuestHistoryForCharacter(found.uid, 30),
          listChatHistoryForCharacter(found.uid, 15),
          listOpinionsForCharacter(found.uid),
          getOpinion(found.uid, GUILD_MASTER_UID),
        ]);
        setGameDay(day);
        setEffectiveAvatarPath(effectivePath);
        setHistoryContext(ctx);
        setMaxContextTokens(maxCtx);
        setGmOpinion(gmOp?.opinion ?? '');
        // Build the pool — all available memories, never injected until triggered by keywords
        memoryPoolRef.current = [
          ...poolQuests.map((q) => questToMemory(q, 0)),
          ...poolChats.map((c) => chatToMemory(c, 0)),
          ...poolOpinions.map((o) => opinionToMemory(o, 0)),
        ];
        void sendOpening(found, greeting?.message ?? undefined);
      }
    } catch (err) {
      setError('Could not load character.');
      console.error(err);
    }
  }

  /** Scan text for other character names; add any newly found chars to mentionedChars. */
  function checkForMentions(text: string, currentChar: GuildCharacter, roster: GuildCharacter[], alreadyMentioned: GuildCharacter[]): GuildCharacter[] {
    const lower = text.toLowerCase();
    const alreadyUids = new Set(alreadyMentioned.map((c) => c.uid));
    const newlyFound: GuildCharacter[] = [];
    for (const c of roster) {
      if (c.uid === currentChar.uid) continue;
      if (alreadyUids.has(c.uid)) continue;
      // Match on first name or full name (case-insensitive, whole-word)
      const firstName = c.characterName.split(' ')[0].toLowerCase();
      const fullName = c.characterName.toLowerCase();
      if (lower.includes(fullName) || new RegExp(`\\b${firstName}\\b`).test(lower)) {
        newlyFound.push(c);
      }
    }
    return newlyFound;
  }

  // ── Opening greeting ────────────────────────────────────────────────────────
  function sendOpening(char: GuildCharacter, greetingTemplate?: string) {
    const text = greetingTemplate
      ? greetingTemplate.replace(/\{\{char\}\}/g, char.characterName)
      : `${char.characterName} glances up as you approach.`;
    const msg: ChatMessage = { role: 'character', text, timestamp: new Date().toISOString() };
    setMessages([msg]);
    if (hasQuestKeyword(text)) setQuestBanner(true);
  }

  // ── Generate scene image ────────────────────────────────────────────────────
  async function handleGenerateSceneImage() {
    if (!character || generatingImage) return;
    setGeneratingImage(true);
    try {
      const path = await generateSceneImage(character, messages);
      const imgMsg: ChatMessage = { role: 'image', text: '', imagePath: path, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, imgMsg]);
    } catch (err) {
      console.error('Scene image generation failed:', err);
    } finally {
      setGeneratingImage(false);
    }
  }

  // ── Send player message ─────────────────────────────────────────────────────
  async function handleSend() {
    if (!character || !input.trim() || loading) return;
    const playerText = input.trim();
    setInput('');

    const playerMsg: ChatMessage = { role: 'player', text: playerText, timestamp: new Date().toISOString() };
    const history = [...messages, playerMsg];
    setMessages(history);
    setLoading(true);
    setError(null);

    // Check player message for mentions before sending
    const mentionsFromPlayer = checkForMentions(playerText, character, allCharacters, mentionedChars);
    const updatedMentioned = mentionsFromPlayer.length > 0
      ? [...mentionedChars, ...mentionsFromPlayer]
      : mentionedChars;
    if (mentionsFromPlayer.length > 0) setMentionedChars(updatedMentioned);

    try {
      const turn = ++messageTurnRef.current;
      const relMap = await loadRelMap(character.uid, updatedMentioned);

      // Find memories relevant to this message — keyword match against the pool first,
      // then supplement with any temporally-triggered records (yesterday, last quest, etc.)
      const keywordMatches = findRelevantMemories(playerText, memoryPoolRef.current, turn);
      const temporal = await buildTemporalContext(character.uid, gameDay, playerText);
      const temporalEntries: ActiveMemoryEntry[] = [
        ...temporal.quests.map((q) => questToMemory(q, turn)),
        ...temporal.chats.map((c) => chatToMemory(c, turn)),
      ];
      const incomingEntries = mergeMemories(keywordMatches, temporalEntries);

      // Merge new entries in, update recency for player's message, then cap to 1 quest
      let currentMemories = mergeMemories(activeMemories, incomingEntries);
      currentMemories = updateMemoryRecency(currentMemories, playerText, turn);
      currentMemories = capQuestMemories(currentMemories, 1);

      // Estimate token budget remaining for active memories
      const outputBudget = 200;
      const baseSystemTokens = estimateTokens(buildSystemPrompt(character, '', updatedMentioned, relMap, gmOpinion));
      const baseHistTokens   = estimateTokens(historyContext);
      const convText = history
        .filter((m) => m.role !== 'image')
        .map((m) => m.role === 'player' ? `Guild Master: ${m.text}` : `${character.characterName}: ${m.text}`)
        .join('\n');
      const convTokens   = estimateTokens(convText);
      const memoryBudget = maxContextTokens - outputBudget - baseSystemTokens - baseHistTokens - convTokens;

      const { context: activeCtx, includedUids } = buildActiveMemoryContext(currentMemories, memoryBudget);
      setLastIncludedUids(includedUids);
      const fullCtx = activeCtx ? `${historyContext}\n\n${activeCtx}` : historyContext;

      const reply = await callKoboldApi(buildPrompt(character, messages, playerText, fullCtx, updatedMentioned, relMap, gmOpinion), outputBudget, `${character.characterName}: replying...`);
      const charMsg: ChatMessage = { role: 'character', text: singleLine ? firstLine(reply) : reply, timestamp: new Date().toISOString() };

      // Update recency for character reply — chat memories only, quests and opinions are player-triggered
      const charReplyUpdated = updateMemoryRecency(
        currentMemories.filter((m) => m.type === 'chat'),
        charMsg.text,
        turn,
      );
      currentMemories = [
        ...currentMemories.filter((m) => m.type === 'quest' || m.type === 'opinion'),
        ...charReplyUpdated,
      ];
      setActiveMemories(currentMemories);

      setMessages((prev) => [...prev, charMsg]);
      if (hasQuestKeyword(reply)) setQuestBanner(true);
      // Check character reply for new mentions
      const mentionsFromReply = checkForMentions(charMsg.text, character, allCharacters, updatedMentioned);
      if (mentionsFromReply.length > 0) setMentionedChars((prev) => [...prev, ...mentionsFromReply]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'LLM request failed.');
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  // ── Memory inspector ────────────────────────────────────────────────────────
  async function openMemoryModal() {
    if (!character) return;
    setShowMemory(true);
    setMemLoading(true);
    try {
      // Match exactly what buildHistoryContext injects: 5 quests + 3 chats
      const [quests, chats] = await Promise.all([
        listQuestHistoryForCharacter(character.uid, 5),
        listChatHistoryForCharacter(character.uid, 3),
      ]);
      setBaseMemQuests(quests);
      setBaseMemChats(chats);
    } finally {
      setMemLoading(false);
    }
  }

  function toggleExpanded(uid: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  }

  // ── Open quest assignment modal ─────────────────────────────────────────────
  async function openAssignModal() {
    if (!character) return;
    const allQuests = await listGuildQuests();
    setModalQuests(allQuests.filter((q) => q.status === 'active'));
    setModalChars(allCharacters);
    setSelectedQuestUid(null);
    setSelectedPartyUids([character.uid]);
    setInspectedUid(null);
    setShowModal(true);
    void loadModalRelScores(allCharacters);
  }

  async function loadModalRelScores(chars: GuildCharacter[]) {
    const map = new Map<string, number>();
    for (const c of chars) {
      try {
        const rels = await listRelationshipsForCharacter(c.uid);
        for (const rel of rels) {
          const key = rel.charA < rel.charB ? `${rel.charA}|${rel.charB}` : `${rel.charB}|${rel.charA}`;
          if (!map.has(key)) map.set(key, rel.score);
        }
      } catch { /* non-fatal */ }
    }
    setModalRelScores(map);
  }

  function getModalRelScore(uidA: string, uidB: string): number {
    const key = uidA < uidB ? `${uidA}|${uidB}` : `${uidB}|${uidA}`;
    return modalRelScores.get(key) ?? 0;
  }

  function togglePartyMember(uid: string) {
    if (!character || uid === character.uid) return; // current char is locked
    setSelectedPartyUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  }

  // ── Submit quest assignment ─────────────────────────────────────────────────
  async function handleAssign() {
    if (!character || !selectedQuestUid) return;
    const quest = modalQuests.find((q) => q.uid === selectedQuestUid);
    if (!quest) return;

    setShowModal(false);
    const rooms = await listQuestRooms(quest.uid).catch(() => [] as QuestRoom[]);
    assignedRef.current = { quest, partyUids: selectedPartyUids, rooms };

    const partyChars = modalChars.filter((c) => selectedPartyUids.includes(c.uid));
    const companions = partyChars
      .filter((c) => c.uid !== character.uid)
      .map((c) => c.characterName);

    const companionText = companions.length > 0
      ? ` You'll be joined by ${companions.join(', ')}.`
      : '';

    const assignMsg =
      `I have a contract for you, ${character.characterName}. ` +
      `You've been assigned to ${quest.title} — ` +
      `${quest.summary || `a ${quest.difficulty} mission in ${quest.biome}`}.` +
      `${companionText} Pack your gear and be ready at dawn.`;

    const playerMsg: ChatMessage = { role: 'player', text: assignMsg, timestamp: new Date().toISOString() };
    const history = [...messages, playerMsg];
    setMessages(history);
    setLoading(true);
    setError(null);

    try {
      const relMap = await loadRelMap(character.uid, mentionedChars);
      const reply = await callKoboldApi(buildPrompt(character, messages, assignMsg, historyContext, mentionedChars, relMap, gmOpinion), 200, `${character.characterName}: reacting to quest...`);
      const charMsg: ChatMessage = { role: 'character', text: singleLine ? firstLine(reply) : reply, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, charMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'LLM request failed.');
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!character) {
    return (
      <View style={styles.centered}>
        {error
          ? <ThemedText style={styles.errorText}>{error}</ThemedText>
          : <ActivityIndicator size="large" color="#7A4F1E" />
        }
      </View>
    );
  }

  const hasAssignment = assignedRef.current !== null;

  // Merge base + active memory records for the inspector modal
  const activeQuestUids = new Set(baseMemQuests.map((q) => q.uid));
  const mergedQuests: QuestHistory[] = [
    ...baseMemQuests,
    ...activeMemories
      .filter((m) => m.type === 'quest' && !activeQuestUids.has(m.uid))
      .map((m) => m.record as QuestHistory),
  ];
  const activeChatUids = new Set(baseMemChats.map((c) => c.uid));
  const mergedChats: ChatHistory[] = [
    ...baseMemChats,
    ...activeMemories
      .filter((m) => m.type === 'chat' && !activeChatUids.has(m.uid))
      .map((m) => m.record as ChatHistory),
  ];
  const mergedOpinions: CharacterOpinion[] = activeMemories
    .filter((m) => m.type === 'opinion')
    .map((m) => m.record as CharacterOpinion);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      {/* Character header */}
      <View style={styles.charHeader}>
        <CharacterAvatar name={character.characterName} avatarPath={effectiveAvatarPath ?? character.avatarPath} size={44} color="#7A4F1E" />
        <View style={styles.charHeaderText}>
          <ThemedText style={styles.charName}>{character.characterName}</ThemedText>
          <ThemedText style={styles.charMeta}>
            Lv {character.level} {character.race} {character.className}
          </ThemedText>
        </View>
        <Pressable style={styles.memoryButton} onPress={() => void openMemoryModal()}>
          <ThemedText style={styles.memoryButtonText}>💭</ThemedText>
        </Pressable>
        <Pressable style={[styles.singleLineToggle, singleLine && styles.singleLineToggleOn]} onPress={() => setSingleLine((v) => !v)}>
          <ThemedText style={styles.singleLineToggleText}>{singleLine ? '1 line' : 'multi'}</ThemedText>
        </Pressable>
        {hasAssignment && (
          <View style={styles.assignedBadge}>
            <ThemedText style={styles.assignedBadgeText}>On Quest</ThemedText>
          </View>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.map((msg, idx) => {
          if (msg.role === 'image') {
            return msg.imagePath ? (
              <Pressable key={idx} style={styles.sceneThumbWrapper} onPress={() => setLightboxUri(msg.imagePath!)}>
                <Image source={{ uri: msg.imagePath }} style={styles.sceneThumb} contentFit="cover" />
                <View style={styles.sceneThumbOverlay}>
                  <ThemedText style={styles.sceneThumbHint}>Tap to expand</ThemedText>
                </View>
              </Pressable>
            ) : null;
          }
          return (
            <View key={idx} style={[styles.bubble, msg.role === 'player' ? styles.bubblePlayer : styles.bubbleChar]}>
              {msg.role === 'character' && (
                <ThemedText style={styles.bubbleSender}>{character.characterName}</ThemedText>
              )}
              <ThemedText style={[styles.bubbleText, msg.role === 'player' ? styles.bubbleTextPlayer : styles.bubbleTextChar]}>
                {msg.text}
              </ThemedText>
            </View>
          );
        })}

        {loading && (
          <View style={[styles.bubble, styles.bubbleChar, styles.bubbleTyping]}>
            <ThemedText style={styles.bubbleSender}>{character.characterName}</ThemedText>
            <ActivityIndicator size="small" color="#7A4F1E" />
          </View>
        )}

        {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
      </ScrollView>

      {/* Quest banner */}
      {questBanner && !hasAssignment && (
        <Pressable style={styles.questBanner} onPress={() => void openAssignModal()}>
          <ThemedText style={styles.questBannerIcon}>📜</ThemedText>
          <View style={styles.questBannerText}>
            <ThemedText style={styles.questBannerTitle}>Quest Available</ThemedText>
            <ThemedText style={styles.questBannerSub}>Tap to assign {character.characterName} to a contract</ThemedText>
          </View>
          <ThemedText style={styles.questBannerArrow}>›</ThemedText>
        </Pressable>
      )}

      {hasAssignment && (
        <View style={styles.assignedBanner}>
          <ThemedText style={styles.assignedBannerText}>
            ⚔️  {assignedRef.current?.quest.title} — leave chat to begin
          </ThemedText>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Say something..."
          placeholderTextColor="#9BA1A6"
          multiline
          maxLength={400}
          blurOnSubmit={false}
          onKeyPress={(e: any) => {
            if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
              e.preventDefault?.();
              void handleSend();
            }
          }}
        />
        <Pressable
          style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
          onPress={() => void handleSend()}
          disabled={!input.trim() || loading}
        >
          <ThemedText style={styles.sendButtonText}>Send</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.imageButton, generatingImage && styles.sendButtonDisabled]}
          onPress={() => void handleGenerateSceneImage()}
          disabled={generatingImage}
        >
          {generatingImage
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <ThemedText style={styles.sendButtonText}>🖼</ThemedText>}
        </Pressable>
      </View>

      {/* ── Image Lightbox ── */}
      <Modal visible={!!lightboxUri} transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
        <Pressable style={styles.lightboxBackdrop} onPress={() => setLightboxUri(null)}>
          {lightboxUri ? (
            <Image source={{ uri: lightboxUri }} style={styles.lightboxImage} contentFit="contain" />
          ) : null}
          <Pressable style={styles.lightboxClose} onPress={() => setLightboxUri(null)}>
            <ThemedText style={styles.lightboxCloseText}>Close</ThemedText>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Quest Assignment Modal ── */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Assign Quest</ThemedText>
            <Pressable onPress={() => setShowModal(false)} style={styles.modalClose}>
              <ThemedText style={styles.modalCloseText}>✕</ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>

            {/* Quest selector */}
            <ThemedText style={styles.modalSectionLabel}>Choose a Contract</ThemedText>
            {modalQuests.length === 0 ? (
              <ThemedText style={styles.modalEmpty}>No active quests on the notice board.</ThemedText>
            ) : (
              modalQuests.map((q) => {
                const selected = q.uid === selectedQuestUid;
                return (
                  <Pressable
                    key={q.uid}
                    style={[styles.questOption, selected && styles.questOptionSelected]}
                    onPress={() => setSelectedQuestUid(q.uid)}
                  >
                    <View style={styles.questOptionTop}>
                      <ThemedText style={[styles.questOptionTitle, selected && styles.questOptionTitleSelected]}>
                        {q.title}
                      </ThemedText>
                      <View style={[styles.diffBadge, { backgroundColor: DIFF_COLOR[q.difficulty] }]}>
                        <ThemedText style={styles.diffBadgeText}>{capitalize(q.difficulty)}</ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.questOptionMeta}>{q.biome} · Lv {q.level}</ThemedText>
                    {q.summary ? (
                      <ThemedText style={styles.questOptionSummary} numberOfLines={2}>{q.summary}</ThemedText>
                    ) : null}
                  </Pressable>
                );
              })
            )}

            {/* Party selector */}
            <ThemedText style={[styles.modalSectionLabel, { marginTop: 20 }]}>Select Party</ThemedText>
            <ThemedText style={styles.modalSectionHint}>{character.characterName} is required and cannot be removed. Hold a name to inspect bonds.</ThemedText>
            <View style={styles.partyGrid}>
              {modalChars.map((c) => {
                const locked     = c.uid === character.uid;
                const sel        = selectedPartyUids.includes(c.uid);
                const inspecting = inspectedUid === c.uid;
                return (
                  <Pressable
                    key={c.uid}
                    style={[
                      styles.partyChip,
                      sel        && styles.partyChipSelected,
                      locked     && styles.partyChipLocked,
                      inspecting && styles.partyChipInspecting,
                    ]}
                    onPress={() => togglePartyMember(c.uid)}
                    onLongPress={() => setInspectedUid(inspecting ? null : c.uid)}
                  >
                    <ThemedText style={[styles.partyChipName, sel && styles.partyChipNameSelected, inspecting && styles.partyChipNameInspecting]}>
                      {c.characterName}
                    </ThemedText>
                    <ThemedText style={[styles.partyChipMeta, sel && styles.partyChipMetaSelected]}>
                      Lv {c.level} {c.className}
                    </ThemedText>
                    {locked && <ThemedText style={styles.partyChipLockIcon}>🔒</ThemedText>}
                  </Pressable>
                );
              })}
            </View>

            {/* Relationship inspection panel */}
            {inspectedUid ? (() => {
              const src = modalChars.find((c) => c.uid === inspectedUid);
              if (!src) return null;
              return (
                <View style={styles.relPanel}>
                  <View style={styles.relPanelHeader}>
                    <ThemedText style={styles.relPanelTitle}>{src.characterName}'s Bonds</ThemedText>
                    <Pressable onPress={() => setInspectedUid(null)}>
                      <ThemedText style={styles.relPanelClose}>✕</ThemedText>
                    </Pressable>
                  </View>
                  {modalChars.filter((c) => c.uid !== inspectedUid).map((c) => {
                    const score = getModalRelScore(inspectedUid, c.uid);
                    const { label, color } = getRelationshipLabel(score);
                    const inParty = selectedPartyUids.includes(c.uid);
                    return (
                      <View key={c.uid} style={[styles.relPanelRow, inParty && styles.relPanelRowInParty]}>
                        <ThemedText style={styles.relPanelName} numberOfLines={1}>{c.characterName}</ThemedText>
                        <View style={[styles.relPanelBadge, { backgroundColor: color }]}>
                          <ThemedText style={styles.relPanelBadgeText}>{label}</ThemedText>
                        </View>
                        <ThemedText style={[styles.relPanelScore, { color }]}>
                          {score > 0 ? `+${score}` : `${score}`}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              );
            })() : null}

            {/* Party chemistry summary */}
            {selectedPartyUids.length >= 2 ? (() => {
              let total = 0;
              for (let i = 0; i < selectedPartyUids.length; i++) {
                for (let j = i + 1; j < selectedPartyUids.length; j++) {
                  total += getModalRelScore(selectedPartyUids[i], selectedPartyUids[j]);
                }
              }
              const tokens = Math.abs(Math.floor(total / 50));
              if (total === 0) return (
                <View style={styles.chemRow}>
                  <ThemedText style={styles.chemNeutral}>Party chemistry is neutral</ThemedText>
                </View>
              );
              return total > 0 ? (
                <View style={[styles.chemRow, styles.chemRowAdvantage]}>
                  <ThemedText style={styles.chemAdvantage}>
                    🎲 {tokens} advantage {tokens === 1 ? 'token' : 'tokens'} — bonds score {total}
                  </ThemedText>
                </View>
              ) : (
                <View style={[styles.chemRow, styles.chemRowJinx]}>
                  <ThemedText style={styles.chemJinx}>
                    ⚡ {tokens} jinx {tokens === 1 ? 'token' : 'tokens'} — tension score {total}
                  </ThemedText>
                </View>
              );
            })() : null}
          </ScrollView>

          {/* Submit */}
          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.assignButton, !selectedQuestUid && styles.assignButtonDisabled]}
              onPress={() => void handleAssign()}
              disabled={!selectedQuestUid}
            >
              <ThemedText style={styles.assignButtonText}>Send on Quest</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
      {/* ── Memory Inspector Modal ── */}
      <Modal visible={showMemory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowMemory(false)}>
        <View style={styles.memRoot}>
          <View style={styles.memHeader}>
            <ThemedText style={styles.memTitle}>💭 Character Memory</ThemedText>
            <Pressable onPress={() => setShowMemory(false)} style={styles.memClose}>
              <ThemedText style={styles.memCloseText}>✕</ThemedText>
            </Pressable>
          </View>

          {memLoading ? (
            <View style={styles.memLoadingWrap}>
              <ActivityIndicator size="large" color="#7A4F1E" />
              <ThemedText style={styles.memLoadingText}>Loading memories...</ThemedText>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.memBody}>

              {/* ── Quest Memories ── */}
              <Pressable style={styles.memSectionHeader} onPress={() => setQuestSectionOpen((v) => !v)}>
                <View style={styles.memSectionAccent} />
                <ThemedText style={styles.memSectionTitle}>Quest Memories</ThemedText>
                <View style={styles.memSectionBadge}>
                  <ThemedText style={styles.memSectionBadgeText}>{mergedQuests.length}</ThemedText>
                </View>
                <ThemedText style={styles.memChevron}>{questSectionOpen ? '▾' : '▸'}</ThemedText>
              </Pressable>

              {questSectionOpen && (
                mergedQuests.length === 0
                  ? <ThemedText style={styles.memEmpty}>No quest memories yet.</ThemedText>
                  : mergedQuests.map((q: QuestHistory) => {
                      const open = expandedIds.has(q.uid);
                      const diff = gameDay - q.gameDay;
                      const dateLabel = diff === 0 ? 'today' : diff === 1 ? 'yesterday' : `${diff} days ago`;
                      return (
                        <Pressable key={q.uid} style={[styles.memItem, lastIncludedUids.has(q.uid) && styles.memItemActive]} onPress={() => toggleExpanded(q.uid)}>
                          <View style={styles.memItemHeader}>
                            <View style={styles.memItemMeta}>
                              <View style={[styles.memOutcomeDot, { backgroundColor: q.outcome === 'success' ? '#2E7D32' : '#B00020' }]} />
                              <ThemedText style={styles.memItemDate}>Day {q.gameDay} · {dateLabel}</ThemedText>
                            </View>
                            <ThemedText style={styles.memChevron}>{open ? '▾' : '▸'}</ThemedText>
                          </View>
                          <ThemedText style={styles.memItemTitle}>{q.questTitle}</ThemedText>
                          <ThemedText style={styles.memItemSub}>{q.biome} · Lv {q.level} · {q.outcome}</ThemedText>
                          {open && (
                            <View style={styles.memItemBody}>
                              {q.partyNames.length > 1 && (
                                <ThemedText style={styles.memItemParty}>Party: {q.partyNames.join(', ')}</ThemedText>
                              )}
                              <ThemedText style={styles.memItemSummary}>{q.summary}</ThemedText>
                            </View>
                          )}
                        </Pressable>
                      );
                    })
              )}

              <View style={styles.memDivider} />

              {/* ── Chat Memories ── */}
              <Pressable style={styles.memSectionHeader} onPress={() => setChatSectionOpen((v) => !v)}>
                <View style={[styles.memSectionAccent, { backgroundColor: '#3A2D5C' }]} />
                <ThemedText style={styles.memSectionTitle}>Conversations</ThemedText>
                <View style={[styles.memSectionBadge, { backgroundColor: '#3A2D5C' }]}>
                  <ThemedText style={styles.memSectionBadgeText}>{mergedChats.length}</ThemedText>
                </View>
                <ThemedText style={styles.memChevron}>{chatSectionOpen ? '▾' : '▸'}</ThemedText>
              </Pressable>

              {chatSectionOpen && (
                mergedChats.length === 0
                  ? <ThemedText style={styles.memEmpty}>No conversation memories yet.</ThemedText>
                  : mergedChats.map((c: ChatHistory) => {
                      const open = expandedIds.has(c.uid);
                      const diff = gameDay - c.gameDay;
                      const dateLabel = diff === 0 ? 'today' : diff === 1 ? 'yesterday' : `${diff} days ago`;
                      return (
                        <Pressable key={c.uid} style={[styles.memItem, lastIncludedUids.has(c.uid) && styles.memItemActive]} onPress={() => toggleExpanded(c.uid)}>
                          <View style={styles.memItemHeader}>
                            <ThemedText style={styles.memItemDate}>Day {c.gameDay} · {dateLabel}</ThemedText>
                            <ThemedText style={styles.memChevron}>{open ? '▾' : '▸'}</ThemedText>
                          </View>
                          <ThemedText style={styles.memItemTitle} numberOfLines={open ? undefined : 2}>
                            {c.summary}
                          </ThemedText>
                          {open && c.keywords.length > 0 && (
                            <View style={styles.memKeywordRow}>
                              {c.keywords.map((kw: string) => (
                                <View key={kw} style={styles.memKeyword}>
                                  <ThemedText style={styles.memKeywordText}>{kw}</ThemedText>
                                </View>
                              ))}
                            </View>
                          )}
                        </Pressable>
                      );
                    })
              )}

              {/* ── Opinions section ── */}
              <Pressable style={styles.memSectionHeader} onPress={() => setOpinionSectionOpen((v) => !v)}>
                <View style={[styles.memSectionAccent, { backgroundColor: '#7A4F1E' }]} />
                <ThemedText style={styles.memSectionTitle}>Opinions in Context</ThemedText>
                <View style={[styles.memSectionBadge, { backgroundColor: '#7A4F1E' }]}>
                  <ThemedText style={styles.memSectionBadgeText}>{mergedOpinions.length}</ThemedText>
                </View>
                <ThemedText style={styles.memChevron}>{opinionSectionOpen ? '▾' : '▸'}</ThemedText>
              </Pressable>

              {opinionSectionOpen && (
                mergedOpinions.length === 0
                  ? <ThemedText style={styles.memEmpty}>No opinions currently in context.</ThemedText>
                  : mergedOpinions.map((o: CharacterOpinion) => {
                      const open = expandedIds.has(o.uid);
                      return (
                        <Pressable key={o.uid} style={[styles.memItem, lastIncludedUids.has(o.uid) && styles.memItemActive]} onPress={() => toggleExpanded(o.uid)}>
                          <View style={styles.memItemHeader}>
                            <ThemedText style={styles.memItemDate}>Opinion of {o.targetName}</ThemedText>
                            <ThemedText style={styles.memChevron}>{open ? '▾' : '▸'}</ThemedText>
                          </View>
                          <ThemedText style={styles.memItemTitle} numberOfLines={open ? undefined : 2}>
                            {o.opinion}
                          </ThemedText>
                        </Pressable>
                      );
                    })
              )}

            </ScrollView>
          )}
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#B00020', fontSize: 13, textAlign: 'center', padding: 12 },

  // Header
  charHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E0E4E7',
    backgroundColor: 'rgba(122, 79, 30, 0.06)',
  },
  charAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#7A4F1E', alignItems: 'center', justifyContent: 'center',
  },
  charAvatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  charHeaderText: { flex: 1 },
  charName: { fontSize: 16, fontWeight: '700', color: '#7A4F1E' },
  charMeta: { fontSize: 12, color: '#9BA1A6' },
  singleLineToggle: {
    borderRadius: 8, borderWidth: 1, borderColor: '#9BA1A6',
    paddingHorizontal: 8, paddingVertical: 3,
  },
  singleLineToggleOn: { borderColor: '#7A4F1E' },
  singleLineToggleText: { fontSize: 11, color: '#9BA1A6' },
  assignedBadge: {
    backgroundColor: '#B00020', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  assignedBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  // Messages
  messageList: { flex: 1 },
  messageListContent: { padding: 16, gap: 10 },
  bubble: { maxWidth: '82%', borderRadius: 14, padding: 10, gap: 3 },
  bubbleChar: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(122, 79, 30, 0.08)',
    borderWidth: 1, borderColor: 'rgba(122, 79, 30, 0.2)',
  },
  bubblePlayer: { alignSelf: 'flex-end', backgroundColor: '#3A2D5C' },
  bubbleTyping: { paddingVertical: 12 },
  bubbleSender: {
    fontSize: 11, fontWeight: '700', color: '#7A4F1E',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextChar: { color: '#11181C' },
  bubbleTextPlayer: { color: '#FFFFFF' },

  // Quest banner
  questBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 8, borderRadius: 12,
    backgroundColor: 'rgba(122, 79, 30, 0.1)',
    borderWidth: 1, borderColor: 'rgba(122, 79, 30, 0.3)',
    padding: 12,
  },
  questBannerIcon: { fontSize: 22 },
  questBannerText: { flex: 1 },
  questBannerTitle: { fontSize: 14, fontWeight: '700', color: '#7A4F1E' },
  questBannerSub: { fontSize: 12, color: '#9BA1A6' },
  questBannerArrow: { fontSize: 20, color: '#7A4F1E', fontWeight: '700' },

  assignedBanner: {
    backgroundColor: 'rgba(176, 0, 32, 0.08)',
    borderTopWidth: 1, borderTopColor: 'rgba(176, 0, 32, 0.2)',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  assignedBannerText: { fontSize: 13, color: '#B00020', fontWeight: '600', textAlign: 'center' },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, borderTopWidth: 1, borderTopColor: '#E0E4E7',
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1, borderWidth: 1, borderColor: '#D0D5D9', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#11181C', maxHeight: 100,
  },
  sceneThumbWrapper: {
    alignSelf: 'center', width: 180, height: 180, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E0E4E7',
  },
  sceneThumb: { width: '100%', height: '100%' },
  sceneThumbOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)', paddingVertical: 4, alignItems: 'center',
  },
  sceneThumbHint: { color: '#FFFFFF', fontSize: 11 },
  lightboxBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center',
  },
  lightboxImage: { width: '95%', aspectRatio: 1, borderRadius: 8 },
  lightboxClose: {
    position: 'absolute', top: 48, right: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  lightboxCloseText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  imageButton: {
    backgroundColor: '#5C3D8F', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
  },
  sendButton: {
    backgroundColor: '#7A4F1E', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10,
  },
  sendButtonDisabled: { backgroundColor: '#D0D5D9' },
  sendButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // Modal
  modalRoot: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#E0E4E7',
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalClose: { padding: 4 },
  modalCloseText: { fontSize: 18, color: '#687076' },
  modalBody: { padding: 20, gap: 10 },
  modalSectionLabel: { fontSize: 13, fontWeight: '700', color: '#687076', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  modalSectionHint: { fontSize: 12, color: '#9BA1A6', marginBottom: 8, marginTop: -4 },
  modalEmpty: { fontSize: 13, color: '#9BA1A6', fontStyle: 'italic' },

  // Quest options
  questOption: {
    borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 10,
    padding: 12, gap: 4,
  },
  questOptionSelected: {
    borderColor: '#7A4F1E', backgroundColor: 'rgba(122, 79, 30, 0.06)',
  },
  questOptionTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  questOptionTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  questOptionTitleSelected: { color: '#7A4F1E' },
  questOptionMeta: { fontSize: 12, color: '#9BA1A6' },
  questOptionSummary: { fontSize: 12, color: '#687076', fontStyle: 'italic', lineHeight: 17 },

  diffBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  diffBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  // Party grid
  partyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  partyChip: {
    borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, gap: 2, minWidth: 100,
  },
  partyChipSelected: { borderColor: '#2E5A1C', backgroundColor: 'rgba(46, 90, 28, 0.08)' },
  partyChipLocked: { borderColor: '#7A4F1E', backgroundColor: 'rgba(122, 79, 30, 0.06)' },
  partyChipInspecting: { borderColor: '#3A2D5C', backgroundColor: 'rgba(58, 45, 92, 0.08)' },
  partyChipName: { fontSize: 13, fontWeight: '600' },
  partyChipNameSelected: { color: '#2E5A1C' },
  partyChipNameInspecting: { color: '#3A2D5C' },
  partyChipMeta: { fontSize: 11, color: '#9BA1A6' },
  partyChipMetaSelected: { color: '#2E5A1C' },
  partyChipLockIcon: { fontSize: 10, marginTop: 2 },

  // Relationship inspection panel
  relPanel: {
    borderWidth: 1, borderColor: '#3A2D5C', borderRadius: 10,
    padding: 12, gap: 8, backgroundColor: 'rgba(58, 45, 92, 0.04)',
  },
  relPanelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 2,
  },
  relPanelTitle: { fontSize: 13, fontWeight: '700', color: '#3A2D5C' },
  relPanelClose: { fontSize: 14, color: '#9BA1A6', padding: 2 },
  relPanelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  relPanelRowInParty: { backgroundColor: 'rgba(46, 90, 28, 0.05)', borderRadius: 6, paddingHorizontal: 4 },
  relPanelName: { flex: 1, fontSize: 13, color: '#11181C', fontWeight: '500' },
  relPanelBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  relPanelBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  relPanelScore: { fontSize: 12, fontWeight: '700', minWidth: 32, textAlign: 'right' },

  // Party chemistry summary
  chemRow: {
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#E0E4E7',
  },
  chemRowAdvantage: { borderColor: '#2E5A1C', backgroundColor: 'rgba(46, 90, 28, 0.06)' },
  chemRowJinx: { borderColor: '#B00020', backgroundColor: 'rgba(176, 0, 32, 0.05)' },
  chemNeutral: { fontSize: 12, color: '#9BA1A6', fontStyle: 'italic' },
  chemAdvantage: { fontSize: 12, fontWeight: '600', color: '#2E5A1C' },
  chemJinx: { fontSize: 12, fontWeight: '600', color: '#B00020' },

  // Footer
  modalFooter: {
    padding: 16, borderTopWidth: 1, borderTopColor: '#E0E4E7',
  },
  assignButton: {
    backgroundColor: '#7A4F1E', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  assignButtonDisabled: { backgroundColor: '#D0D5D9' },
  assignButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  // Memory inspector
  memoryButton: {
    borderWidth: 1, borderColor: '#D0D5D9', borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  memoryButtonText: { fontSize: 16 },
  memRoot: { flex: 1, backgroundColor: '#FFFFFF' },
  memHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#E0E4E7',
  },
  memTitle: { fontSize: 18, fontWeight: '700', color: '#11181C' },
  memClose: { padding: 4 },
  memCloseText: { fontSize: 18, color: '#687076' },
  memLoadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  memLoadingText: { fontSize: 14, color: '#9BA1A6' },
  memBody: { padding: 16, gap: 4 },
  memSectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#E0E4E7',
    marginBottom: 4,
  },
  memSectionAccent: {
    width: 3, height: 18, borderRadius: 2, marginRight: 10,
  },
  memSectionTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#11181C' },
  memSectionBadge: {
    backgroundColor: '#F0EDE8', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2, marginRight: 8,
  },
  memSectionBadgeText: { fontSize: 11, fontWeight: '700', color: '#7A4F1E' },
  memChevron: { fontSize: 14, color: '#687076' },
  memEmpty: { fontSize: 13, color: '#9BA1A6', fontStyle: 'italic', paddingVertical: 8, paddingHorizontal: 4 },
  memItem: {
    borderWidth: 1, borderColor: '#E8E4DF', borderRadius: 10,
    marginBottom: 8, overflow: 'hidden',
  },
  memItemActive: {
    borderColor: '#7A4F1E', borderWidth: 2,
    backgroundColor: 'rgba(122,79,30,0.04)',
  },
  memItemHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: 'rgba(122,79,30,0.04)',
  },
  memItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  memOutcomeDot: { width: 8, height: 8, borderRadius: 4 },
  memItemDate: { fontSize: 11, color: '#9BA1A6' },
  memItemTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: '#11181C' },
  memItemSub: { fontSize: 11, color: '#9BA1A6' },
  memItemBody: { padding: 12, gap: 6 },
  memItemParty: { fontSize: 12, color: '#687076' },
  memItemSummary: { fontSize: 13, color: '#11181C', lineHeight: 18 },
  memDivider: { height: 1, backgroundColor: '#F0EDE8', marginVertical: 6 },
  memKeywordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  memKeyword: {
    backgroundColor: 'rgba(58,45,92,0.08)', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  memKeywordText: { fontSize: 11, color: '#3A2D5C' },
});
