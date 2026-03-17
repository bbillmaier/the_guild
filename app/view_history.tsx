import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  deleteChatHistory,
  deleteQuestHistory,
  initializeDatabase,
  listGuildCharacters,
  listChatHistoryForCharacter,
  listQuestHistoryForCharacter,
  type ChatHistory,
  type GuildCharacter,
  type QuestDifficulty,
  type QuestHistory,
} from '@/lib/local-db';

const DIFF_COLOR: Record<QuestDifficulty, string> = {
  easy: '#2E7D32', medium: '#F57C00', hard: '#B00020', deadly: '#4A0072',
};

const OUTCOME_COLOR = { success: '#2E7D32', failure: '#B00020' };

export default function ViewHistoryScreen() {
  const [characters, setCharacters] = useState<GuildCharacter[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [questHistory, setQuestHistory] = useState<QuestHistory[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'quests' | 'chats'>('quests');
  const [expandedChatUid, setExpandedChatUid] = useState<string | null>(null);

  useEffect(() => {
    void loadCharacters();
  }, []);

  async function loadCharacters() {
    setLoading(true);
    try {
      await initializeDatabase();
      const chars = await listGuildCharacters();
      setCharacters(chars);
      if (chars.length > 0) {
        const first = chars[0].uid;
        setSelectedUid(first);
        await loadHistory(first);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(uid: string) {
    const [quests, chats] = await Promise.all([
      listQuestHistoryForCharacter(uid, 50),
      listChatHistoryForCharacter(uid, 50),
    ]);
    setQuestHistory(quests);
    setChatHistory(chats);
  }

  async function handleDeleteQuest(uid: string) {
    await deleteQuestHistory(uid);
    setQuestHistory((prev) => prev.filter((q) => q.uid !== uid));
  }

  async function handleDeleteChat(uid: string) {
    await deleteChatHistory(uid);
    if (expandedChatUid === uid) setExpandedChatUid(null);
    setChatHistory((prev) => prev.filter((c) => c.uid !== uid));
  }

  async function selectCharacter(uid: string) {
    setSelectedUid(uid);
    setExpandedChatUid(null);
    setLoading(true);
    await loadHistory(uid);
    setLoading(false);
  }

  if (loading && characters.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (characters.length === 0) {
    return (
      <View style={styles.centered}>
        <ThemedText style={styles.emptyText}>No characters found.</ThemedText>
      </View>
    );
  }

  const selectedChar = characters.find((c) => c.uid === selectedUid);

  return (
    <View style={styles.root}>
      {/* Character picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.charPicker}
        contentContainerStyle={styles.charPickerContent}
      >
        {characters.map((c) => {
          const sel = c.uid === selectedUid;
          return (
            <Pressable
              key={c.uid}
              style={[styles.charChip, sel && styles.charChipSelected]}
              onPress={() => void selectCharacter(c.uid)}
            >
              <ThemedText style={[styles.charChipName, sel && styles.charChipNameSelected]}>
                {c.characterName}
              </ThemedText>
              <ThemedText style={[styles.charChipMeta, sel && styles.charChipMetaSelected]}>
                Lv {c.level} {c.className}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, tab === 'quests' && styles.tabActive]}
          onPress={() => setTab('quests')}
        >
          <ThemedText style={[styles.tabText, tab === 'quests' && styles.tabTextActive]}>
            Quests ({questHistory.length})
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'chats' && styles.tabActive]}
          onPress={() => setTab('chats')}
        >
          <ThemedText style={[styles.tabText, tab === 'chats' && styles.tabTextActive]}>
            Conversations ({chatHistory.length})
          </ThemedText>
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#0a7ea4" />
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {tab === 'quests' ? (
            questHistory.length === 0 ? (
              <ThemedText style={styles.emptyText}>
                {selectedChar?.characterName} has no quest history yet.
              </ThemedText>
            ) : (
              questHistory.map((qh) => (
                <View key={qh.uid} style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <ThemedText style={styles.cardTitle} numberOfLines={1}>{qh.questTitle}</ThemedText>
                    <View style={[styles.badge, { backgroundColor: DIFF_COLOR[qh.difficulty] }]}>
                      <ThemedText style={styles.badgeText}>{qh.difficulty}</ThemedText>
                    </View>
                    <View style={[styles.badge, { backgroundColor: OUTCOME_COLOR[qh.outcome] }]}>
                      <ThemedText style={styles.badgeText}>{qh.outcome}</ThemedText>
                    </View>
                    <Pressable style={styles.deleteBtn} onPress={() => void handleDeleteQuest(qh.uid)}>
                      <ThemedText style={styles.deleteBtnText}>✕</ThemedText>
                    </Pressable>
                  </View>
                  <ThemedText style={styles.cardMeta}>
                    Day {qh.gameDay} · {qh.biome} · Lv {qh.level}
                  </ThemedText>
                  {qh.partyNames.length > 1 && (
                    <ThemedText style={styles.cardParty}>
                      Party: {qh.partyNames.join(', ')}
                    </ThemedText>
                  )}
                  {qh.summary ? (
                    <ThemedText style={styles.cardSummary}>{qh.summary}</ThemedText>
                  ) : null}
                  {qh.keywords.length > 0 && (
                    <View style={styles.keywordRow}>
                      {qh.keywords.map((kw) => (
                        <View key={kw} style={styles.keyword}>
                          <ThemedText style={styles.keywordText}>{kw}</ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )
          ) : (
            chatHistory.length === 0 ? (
              <ThemedText style={styles.emptyText}>
                {selectedChar?.characterName} has no conversation history yet.
              </ThemedText>
            ) : (
              chatHistory.map((ch) => {
                const expanded = expandedChatUid === ch.uid;
                return (
                  <View key={ch.uid} style={styles.card}>
                    <View style={styles.cardTopRow}>
                      <ThemedText style={[styles.cardMeta, { flex: 1 }]}>Day {ch.gameDay}</ThemedText>
                      <Pressable style={styles.deleteBtn} onPress={() => void handleDeleteChat(ch.uid)}>
                        <ThemedText style={styles.deleteBtnText}>✕</ThemedText>
                      </Pressable>
                    </View>
                    {ch.summary ? (
                      <ThemedText style={styles.cardSummary}>{ch.summary}</ThemedText>
                    ) : null}
                    {ch.keywords.length > 0 && (
                      <View style={styles.keywordRow}>
                        {ch.keywords.map((kw) => (
                          <View key={kw} style={styles.keyword}>
                            <ThemedText style={styles.keywordText}>{kw}</ThemedText>
                          </View>
                        ))}
                      </View>
                    )}
                    {ch.transcript ? (
                      <>
                        <Pressable
                          style={styles.transcriptToggle}
                          onPress={() => setExpandedChatUid(expanded ? null : ch.uid)}
                        >
                          <ThemedText style={styles.transcriptToggleText}>
                            {expanded ? 'Hide transcript ▲' : 'Show full transcript ▼'}
                          </ThemedText>
                        </Pressable>
                        {expanded && (
                          <View style={styles.transcript}>
                            <ThemedText style={styles.transcriptText}>{ch.transcript}</ThemedText>
                          </View>
                        )}
                      </>
                    ) : null}
                  </View>
                );
              })
            )
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9BA1A6', fontSize: 14, fontStyle: 'italic', padding: 16 },

  // Character picker
  charPicker: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E4E7',
    backgroundColor: '#FFFFFF',
    maxHeight: 80,
  },
  charPickerContent: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  charChip: {
    borderWidth: 1,
    borderColor: '#D0D5D9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  charChipSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: 'rgba(10, 126, 164, 0.08)',
  },
  charChipName: { fontSize: 13, fontWeight: '600' },
  charChipNameSelected: { color: '#0a7ea4' },
  charChipMeta: { fontSize: 11, color: '#9BA1A6' },
  charChipMetaSelected: { color: '#0a7ea4' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E4E7',
    backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#0a7ea4' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#687076' },
  tabTextActive: { color: '#0a7ea4' },

  // List
  list: { flex: 1 },
  listContent: { padding: 12, gap: 10 },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E4E7',
    padding: 14,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  cardMeta: { fontSize: 12, color: '#9BA1A6' },
  cardParty: { fontSize: 12, color: '#687076', fontStyle: 'italic' },
  cardSummary: { fontSize: 13, color: '#11181C', lineHeight: 19 },

  badge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  keywordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  keyword: {
    backgroundColor: 'rgba(10, 126, 164, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(10, 126, 164, 0.2)',
  },
  keywordText: { fontSize: 11, color: '#0a7ea4' },

  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E45757',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },

  transcriptToggle: {
    paddingVertical: 4,
    marginTop: 2,
  },
  transcriptToggleText: {
    fontSize: 12,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  transcript: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E0E4E7',
    marginTop: 4,
  },
  transcriptText: {
    fontSize: 13,
    color: '#11181C',
    lineHeight: 20,
  },
});
