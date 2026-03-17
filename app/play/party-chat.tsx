import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { callKoboldApi } from '@/components/LLM/kobold';
import { CharacterAvatar } from '@/components/character-avatar';
import { ThemedText } from '@/components/themed-text';
import { buildHistoryContext, savePartyChatHistoryEntry, type PartyChatMessageForHistory } from '@/lib/history';
import {
  getGameDay,
  getRelationshipLabel,
  initializeDatabase,
  listActiveGroupGreetings,
  listGuildCharacters,
  listRelationshipsForCharacter,
  type GuildCharacter,
} from '@/lib/local-db';

// ─── Types ────────────────────────────────────────────────────────────────────

type PartyMessage = {
  role: 'player' | 'character';
  speakerUid?: string;
  speakerName?: string;
  text: string;
  timestamp: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const FOLLOWUP_CHANCE = 0.22;
const MENTION_BOOST   = 4;

// ─── Responder selection ─────────────────────────────────────────────────────

function selectResponder(
  characters: GuildCharacter[],
  excludeUid: string | null,
  message: string,
): GuildCharacter {
  const candidates = excludeUid
    ? characters.filter((c) => c.uid !== excludeUid)
    : characters;
  if (candidates.length === 0) return characters[0];

  const lower = message.toLowerCase();
  const weights = candidates.map((c) => {
    const firstName = c.characterName.split(' ')[0].toLowerCase();
    const fullName  = c.characterName.toLowerCase();
    const mentioned = lower.includes(fullName) || new RegExp(`\\b${firstName}\\b`).test(lower);
    return mentioned ? 1 + MENTION_BOOST : 1;
  });

  const total = weights.reduce((s, w) => s + w, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildWhoIsHere(character: GuildCharacter, others: GuildCharacter[], relMap: Map<string, number>): string {
  if (others.length === 0) return '';
  const lines = ['Others present in this conversation:'];
  for (const o of others) {
    const parts: string[] = [`${o.characterName} (Lv ${o.level} ${o.race} ${o.className})`];
    if (o.physDesc.length > 0) parts.push(o.physDesc.join(', '));
    if (o.metaDesc.length > 0) parts.push(o.metaDesc.join(', '));
    if (o.baseDescription) parts.push(o.baseDescription);
    const score = relMap.get(o.uid) ?? 0;
    const { label } = getRelationshipLabel(score);
    parts.push(`your relationship: ${label}`);
    lines.push(`- ${parts.join('. ')}`);
  }
  return lines.join('\n');
}

function buildPartyPrompt(
  character: GuildCharacter,
  others: GuildCharacter[],
  messages: PartyMessage[],
  historyCtx: string,
  relMap: Map<string, number>,
): string {
  const pronouns =
    character.gender === 'male' ? 'he/him' :
    character.gender === 'female' ? 'she/her' : 'they/them';

  const physLine = character.physDesc.length > 0
    ? `Physical appearance: ${character.physDesc.join(', ')}.` : '';
  const metaLine = character.metaDesc.length > 0
    ? `Personality traits: ${character.metaDesc.join(', ')}.` : '';

  const whoIsHere = buildWhoIsHere(character, others, relMap);
  const name = character.characterName;

  const systemLines = [
    `You are roleplaying as ${name}, a level ${character.level} ${character.race} ${character.className} (${pronouns}).`,
    `You are relaxing at the guild tavern with other adventurers.`,
    character.baseDescription ? `Background: ${character.baseDescription}` : '',
    physLine,
    metaLine,
    ``,
    `Stay fully in character. Speak in first person as ${name}. Keep replies short — 1 to 3 sentences.`,
    `Do not break character. Do not use asterisks for actions. Never write dialogue for anyone else.`,
    historyCtx ? `\nThe following are ${name}'s memories of past events. Use them naturally if relevant — do not recite them directly.\n${historyCtx}` : '',
    whoIsHere ? `\n${whoIsHere}` : '',
  ].filter(Boolean).join('\n');

  const lines: string[] = [systemLines, ''];

  for (const msg of messages) {
    if (msg.role === 'player') {
      lines.push(`Guild Master: ${msg.text}`);
    } else {
      lines.push(`${msg.speakerName ?? 'Unknown'}: ${msg.text}`);
    }
  }

  lines.push(`${character.characterName}:`);
  return lines.join('\n');
}

// ─── Opening generator ────────────────────────────────────────────────────────

async function generateOpening(
  characters: GuildCharacter[],
  relMaps: Map<string, Map<string, number>>,
  sceneContext: string,
): Promise<PartyMessage[]> {
  if (characters.length < 2) return [];

  const names = characters.map((c) => c.characterName).join(' and ');
  const relLines: string[] = [];
  for (let i = 0; i < characters.length; i++) {
    for (let j = i + 1; j < characters.length; j++) {
      const a = characters[i];
      const b = characters[j];
      const score = relMaps.get(a.uid)?.get(b.uid) ?? 0;
      const { label } = getRelationshipLabel(score);
      relLines.push(`${a.characterName} and ${b.characterName}: ${label}`);
    }
  }

  const charDescs = characters.map((c) => {
    const parts = [`${c.characterName} (${c.race} ${c.className})`];
    if (c.metaDesc.length > 0) parts.push(c.metaDesc.slice(0, 2).join(', '));
    return parts.join(' — ');
  }).join('; ');

  const prompt = [
    `Generate a short mid-conversation exchange (3-5 lines) between ${names} at a guild tavern.`,
    sceneContext ? `Scene: ${sceneContext}` : '',
    `Characters: ${charDescs}`,
    relLines.length > 0 ? `Relationships: ${relLines.join('; ')}` : '',
    `The Guild Master is about to walk over — write only the dialogue already in progress.`,
    `Format: "Name: dialogue" — one line per speaker. No actions, no narration, no stage directions.`,
    `Output only the dialogue lines, nothing else.`,
  ].filter(Boolean).join('\n');

  try {
    const raw = await callKoboldApi(prompt, 300, 'Starting conversation...');
    const lines = raw.trim().split('\n').filter(Boolean);
    const messages: PartyMessage[] = [];

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const speakerName = line.slice(0, colonIdx).trim();
      const text = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!text) continue;
      const char = characters.find((c) =>
        c.characterName.toLowerCase().startsWith(speakerName.toLowerCase()) ||
        speakerName.toLowerCase().startsWith(c.characterName.split(' ')[0].toLowerCase())
      );
      messages.push({
        role: 'character',
        speakerUid: char?.uid,
        speakerName: char?.characterName ?? speakerName,
        text,
        timestamp: new Date().toISOString(),
      });
    }
    return messages;
  } catch {
    return [];
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PartyChatScreen() {
  const { uids } = useLocalSearchParams<{ uids: string }>();
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);

  const [characters, setCharacters]   = useState<GuildCharacter[]>([]);
  const [messages, setMessages]       = useState<PartyMessage[]>([]);
  const [input, setInput]             = useState('');
  const [responding, setResponding]   = useState(false);
  const [lastSpeakerUid, setLastSpeakerUid] = useState<string | null>(null);
  const [singleLine, setSingleLine]   = useState(true);
  // Per-character history context and relationship maps, keyed by uid
  const [historyCtxMap, setHistoryCtxMap]   = useState<Map<string, string>>(new Map());
  const [relMaps, setRelMaps]               = useState<Map<string, Map<string, number>>>(new Map());

  // Refs so beforeRemove always sees latest values
  const charactersRef = useRef<GuildCharacter[]>([]);
  const messagesRef   = useRef<PartyMessage[]>([]);
  const historySavedRef = useRef(false);
  useEffect(() => { charactersRef.current = characters; }, [characters]);
  useEffect(() => { messagesRef.current   = messages;   }, [messages]);

  // Save group chat summary when leaving
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      const chars = charactersRef.current;
      const msgs  = messagesRef.current;
      if (chars.length > 0 && msgs.length > 0 && !historySavedRef.current) {
        historySavedRef.current = true;
        const forHistory: PartyChatMessageForHistory[] = msgs
          .filter((m) => m.role !== 'image' as string)
          .map((m) => ({ role: m.role, speakerName: m.speakerName, text: m.text }));
        void savePartyChatHistoryEntry(chars, forHistory).catch(console.error);
      }
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    void load();
  }, [uids]);

  async function load() {
    await initializeDatabase();
    const uidList = (uids ?? '').split(',').filter(Boolean);
    const all = await listGuildCharacters();
    const chars = uidList.map((uid) => all.find((c) => c.uid === uid)).filter(Boolean) as GuildCharacter[];
    if (chars.length === 0) { router.back(); return; }

    setCharacters(chars);
    navigation.setOptions({ title: chars.map((c) => c.characterName.split(' ')[0]).join(' & ') });

    const day = await getGameDay();

    // Load per-character history contexts and relationship maps in parallel
    const [histEntries, relEntries] = await Promise.all([
      Promise.all(chars.map(async (c) => [c.uid, await buildHistoryContext(c.uid, day)] as const)),
      Promise.all(chars.map(async (c) => {
        const rels = await listRelationshipsForCharacter(c.uid);
        const map = new Map<string, number>();
        for (const r of rels) {
          const other = r.charA === c.uid ? r.charB : r.charA;
          map.set(other, r.score);
        }
        return [c.uid, map] as const;
      })),
    ]);

    const hMap = new Map(histEntries);
    const rMap = new Map(relEntries);
    setHistoryCtxMap(hMap);
    setRelMaps(rMap);

    // Generate opening exchange
    if (chars.length >= 2) {
      setResponding(true);
      const activeScenes = await listActiveGroupGreetings();
      const sceneContext = activeScenes.length > 0
        ? activeScenes[Math.floor(Math.random() * activeScenes.length)].text
        : '';
      const opening = await generateOpening(chars, rMap, sceneContext);
      setMessages(opening);
      if (opening.length > 0) {
        const last = opening[opening.length - 1];
        setLastSpeakerUid(last.speakerUid ?? null);
      }
      setResponding(false);
    }
  }

  async function respond(
    char: GuildCharacter,
    currentMessages: PartyMessage[],
    depth = 0,
  ) {
    const others = characters.filter((c) => c.uid !== char.uid);
    const relMap = relMaps.get(char.uid) ?? new Map<string, number>();
    const histCtx = historyCtxMap.get(char.uid) ?? '';

    const prompt = buildPartyPrompt(char, others, currentMessages, histCtx, relMap);

    let reply = '';
    try {
      reply = await callKoboldApi(prompt, 200, `${char.characterName}: replying...`);
      if (singleLine) reply = reply.split('\n')[0].trim();
      else reply = reply.trim();
    } catch {
      return;
    }

    if (!reply) return;

    const newMsg: PartyMessage = {
      role: 'character',
      speakerUid: char.uid,
      speakerName: char.characterName,
      text: reply,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...currentMessages, newMsg];
    setMessages(nextMessages);
    setLastSpeakerUid(char.uid);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    // Small chance of a follow-up from another character (max 2 levels deep)
    if (depth < 2 && Math.random() < FOLLOWUP_CHANCE && characters.length > 1) {
      const followUp = selectResponder(characters, char.uid, reply);
      await respond(followUp, nextMessages, depth + 1);
    }
  }

  async function handleSend() {
    if (responding || characters.length === 0) return;
    setResponding(true);

    let currentMessages = messages;

    if (input.trim()) {
      // Normal player message
      const playerMsg: PartyMessage = {
        role: 'player',
        text: input.trim(),
        timestamp: new Date().toISOString(),
      };
      currentMessages = [...messages, playerMsg];
      setMessages(currentMessages);
      setInput('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

      const responder = selectResponder(characters, null, playerMsg.text);
      await respond(responder, currentMessages);
    } else {
      // Nudge — trigger a response without a player message
      const lastMsg = currentMessages.filter((m) => m.role === 'character').at(-1);
      const triggerText = lastMsg?.text ?? '';
      const responder = selectResponder(characters, lastSpeakerUid, triggerText);
      await respond(responder, currentMessages);
    }

    setResponding(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      {/* Character strip */}
      <View style={styles.charStrip}>
        <View style={styles.charStripAvatars}>
          {characters.map((c) => (
            <View key={c.uid} style={styles.avatarChip}>
              <CharacterAvatar name={c.characterName} avatarPath={c.avatarPath} size={38} />
              <ThemedText style={styles.avatarName} numberOfLines={1}>
                {c.characterName.split(' ')[0]}
              </ThemedText>
            </View>
          ))}
        </View>
        <Pressable
          style={[styles.singleLineToggle, singleLine && styles.singleLineToggleOn]}
          onPress={() => setSingleLine((v) => !v)}
        >
          <ThemedText style={styles.singleLineToggleText}>{singleLine ? '1 line' : 'multi'}</ThemedText>
        </Pressable>
      </View>

      {/* Message log */}
      <ScrollView
        ref={scrollRef}
        style={styles.log}
        contentContainerStyle={styles.logContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {responding && messages.length === 0 ? (
          <ThemedText style={styles.loadingText}>The conversation is already underway...</ThemedText>
        ) : null}

        {messages.map((msg, i) => {
          if (msg.role === 'player') {
            return (
              <View key={i} style={[styles.bubble, styles.bubblePlayer]}>
                <ThemedText style={[styles.bubbleText, styles.bubbleTextPlayer]}>{msg.text}</ThemedText>
              </View>
            );
          }
          return (
            <View key={i} style={[styles.bubble, styles.bubbleChar]}>
              <ThemedText style={styles.bubbleSender}>{msg.speakerName}</ThemedText>
              <ThemedText style={[styles.bubbleText, styles.bubbleTextChar]}>{msg.text}</ThemedText>
            </View>
          );
        })}

        {responding && messages.length > 0 ? (
          <View style={[styles.bubble, styles.bubbleChar, styles.bubbleTyping]}>
            <ActivityIndicator size="small" color="#7A4F1E" />
          </View>
        ) : null}
      </ScrollView>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Say something, or nudge the conversation..."
          placeholderTextColor="#9BA1A6"
          multiline
          maxLength={400}
          editable={!responding}
          blurOnSubmit={false}
          onKeyPress={(e: any) => {
            if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
              e.preventDefault?.();
              void handleSend();
            }
          }}
        />
        <Pressable
          style={[styles.sendButton, responding && styles.sendButtonDisabled]}
          onPress={() => void handleSend()}
          disabled={responding}
        >
          <ThemedText style={styles.sendButtonText}>
            {input.trim() ? 'Send' : '›'}
          </ThemedText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header strip — matches chat.tsx charHeader
  charStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E4E7',
    backgroundColor: 'rgba(122, 79, 30, 0.06)',
  },
  charStripAvatars: {
    flexDirection: 'row',
    gap: 14,
    flex: 1,
  },
  avatarChip: {
    alignItems: 'center',
    gap: 3,
  },
  avatarName: {
    fontSize: 11,
    color: '#7A4F1E',
    fontWeight: '600',
  },

  // Toggle — matches chat.tsx singleLineToggle exactly
  singleLineToggle: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9BA1A6',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  singleLineToggleOn: { borderColor: '#7A4F1E' },
  singleLineToggleText: { fontSize: 11, color: '#9BA1A6' },

  // Messages
  log: { flex: 1 },
  logContent: { padding: 16, gap: 10 },
  loadingText: {
    color: '#9BA1A6',
    fontStyle: 'italic',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
  },

  // Bubbles — matches chat.tsx bubble / bubbleChar / bubblePlayer
  bubble: { maxWidth: '82%', borderRadius: 14, padding: 10, gap: 3 },
  bubbleChar: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(122, 79, 30, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(122, 79, 30, 0.2)',
  },
  bubblePlayer: { alignSelf: 'flex-end', backgroundColor: '#3A2D5C' },
  bubbleTyping: { paddingVertical: 12 },
  bubbleSender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A4F1E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextChar: { color: '#11181C' },
  bubbleTextPlayer: { color: '#FFFFFF' },

  // Input bar — matches chat.tsx inputBar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E4E7',
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D0D5D9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#11181C',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#7A4F1E',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendButtonDisabled: { backgroundColor: '#D0D5D9' },
  sendButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
