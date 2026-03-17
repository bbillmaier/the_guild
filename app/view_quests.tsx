import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { type RoomContent } from '@/components/quest/create/create_quest';
import { CreateQuest } from '@/components/quest/create/create_quest';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  clearGuildQuests,
  deleteGuildQuest,
  initializeDatabase,
  listGuildQuests,
  listQuestRooms,
  type GuildQuest,
  type QuestDifficulty,
  type QuestRoom,
} from '@/lib/local-db';

// ─── Difficulty colours ───────────────────────────────────────────────────────

const difficultyColor: Record<QuestDifficulty, string> = {
  easy:   '#2E7D32',
  medium: '#F57C00',
  hard:   '#B00020',
  deadly: '#4A0072',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ViewQuestsScreen() {
  const [quests, setQuests] = useState<GuildQuest[]>([]);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [roomsCache, setRoomsCache] = useState<Record<string, QuestRoom[]>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      await initializeDatabase();
      const all = await listGuildQuests();
      setQuests(all.filter((q) => q.status === 'active'));
    } catch (err) {
      setError('Could not load quests.');
      console.error(err);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(uid: string) {
    await deleteGuildQuest(uid);
    setQuests((prev) => prev.filter((q) => q.uid !== uid));
    if (expandedUid === uid) setExpandedUid(null);
  }

  async function handleClearAll() {
    await clearGuildQuests();
    setQuests([]);
    setExpandedUid(null);
    setRoomsCache({});
  }

  async function handleExpand(quest: GuildQuest) {
    if (expandedUid === quest.uid) {
      setExpandedUid(null);
      return;
    }
    setExpandedUid(quest.uid);
    if (!roomsCache[quest.uid]) {
      const rooms = await listQuestRooms(quest.uid);
      setRoomsCache((prev) => ({ ...prev, [quest.uid]: rooms }));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Quests</ThemedText>
      <ThemedText style={styles.hint}>/view_quests</ThemedText>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {/* ── Generate section ── */}
      <Pressable
        style={[styles.toggleButton, showCreate && styles.toggleButtonActive]}
        onPress={() => setShowCreate((v) => !v)}
      >
        <ThemedText style={styles.toggleButtonText}>
          {showCreate ? 'Cancel' : '+ Generate New Quest'}
        </ThemedText>
      </Pressable>

      {showCreate ? (
        <CreateQuest
          onComplete={() => {
            setShowCreate(false);
            void load();
          }}
        />
      ) : null}

      {/* ── Quest list ── */}
      <View style={styles.sectionRow}>
        <SectionHeader label={`Quests  (${quests.length})`} />
        {quests.length > 0 && (
          <Pressable style={styles.dropAllButton} onPress={() => void handleClearAll()}>
            <ThemedText style={styles.dropAllText}>Drop All</ThemedText>
          </Pressable>
        )}
      </View>

      {quests.length === 0 ? (
        <ThemedText style={styles.emptyText}>No quests yet. Generate one above.</ThemedText>
      ) : (
        quests.map((quest) => (
          <QuestCard
            key={quest.uid}
            quest={quest}
            expanded={expandedUid === quest.uid}
            rooms={roomsCache[quest.uid] ?? null}
            onPress={() => void handleExpand(quest)}
            onDelete={() => void handleDelete(quest.uid)}
          />
        ))
      )}
    </ScrollView>
  );
}

// ─── Quest card ───────────────────────────────────────────────────────────────

function QuestCard({
  quest,
  expanded,
  rooms,
  onPress,
  onDelete,
}: {
  quest: GuildQuest;
  expanded: boolean;
  rooms: QuestRoom[] | null;
  onPress: () => void;
  onDelete: () => void;
}) {
  const color = difficultyColor[quest.difficulty];
  return (
    <ThemedView style={[styles.questCard, { borderLeftColor: color }]}>
      <Pressable onPress={onPress} style={styles.questHeader}>
        <View style={styles.questHeaderLeft}>
          <ThemedText type="defaultSemiBold" style={styles.questTitle}>
            {quest.title}
          </ThemedText>
          <ThemedText style={styles.questMeta}>
            {quest.biome} · Level {quest.level} · {quest.difficulty.charAt(0).toUpperCase() + quest.difficulty.slice(1)}
          </ThemedText>
        </View>
        <View style={styles.questHeaderRight}>
          <Pressable
            style={styles.runButton}
            onPress={() => router.push({ pathname: '/view_run_quest', params: { questUid: quest.uid } })}
          >
            <ThemedText style={styles.runButtonText}>Run ▶</ThemedText>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={onDelete}>
            <ThemedText style={styles.deleteButtonText}>✕</ThemedText>
          </Pressable>
          <ThemedText style={[styles.expandArrow, { color }]}>
            {expanded ? '▲' : '▼'}
          </ThemedText>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.roomList}>
          {rooms === null ? (
            <ThemedText style={styles.loadingText}>Loading rooms...</ThemedText>
          ) : (
            rooms.map((room) => <RoomRow key={room.uid} room={room} />)
          )}
        </View>
      ) : null}
    </ThemedView>
  );
}

// ─── Room row ─────────────────────────────────────────────────────────────────

function RoomRow({ room }: { room: QuestRoom }) {
  let content: RoomContent | null = null;
  try {
    content = JSON.parse(room.content) as RoomContent;
  } catch {
    // leave null
  }

  const roomLabel = room.roomType === 'boss'
    ? 'Boss'
    : room.roomType === 'combat'
    ? 'Combat'
    : 'Challenge';

  const roomColor = room.roomType === 'boss'
    ? '#4A0072'
    : room.roomType === 'combat'
    ? '#8B0000'
    : '#0a7ea4';

  return (
    <View style={[styles.roomRow, { borderLeftColor: roomColor }]}>
      <View style={styles.roomHeader}>
        <ThemedText type="defaultSemiBold" style={[styles.roomLabel, { color: roomColor }]}>
          Room {room.roomNumber} — {roomLabel}
        </ThemedText>
      </View>

      {content?.type === 'combat' ? (
        <View style={styles.roomDetail}>
          {content.enemies.map((e, idx) => (
            <ThemedText key={idx} style={styles.roomDetailText}>
              • {e.characterName} ({e.race}) · HP {e.hp} · Lv {e.level}
            </ThemedText>
          ))}
        </View>
      ) : null}

      {content?.type === 'challenge' ? (
        <View style={styles.roomDetail}>
          <ThemedText style={styles.challengeStat}>
            {content.stat.toUpperCase()} check · DC {content.dc}
          </ThemedText>
          <ThemedText style={styles.roomDetailText}>{content.description}</ThemedText>
        </View>
      ) : null}

      {content?.type === 'boss' ? (
        <View style={styles.roomDetail}>
          <ThemedText type="defaultSemiBold" style={styles.bossName}>
            {content.boss.characterName}
          </ThemedText>
          <ThemedText style={styles.roomDetailText}>
            {content.boss.race} · HP {content.boss.hp} · Lv {content.boss.level}
          </ThemedText>
          {content.boss.baseDescription ? (
            <ThemedText style={styles.bossDesc}>{content.boss.baseDescription}</ThemedText>
          ) : null}
          {content.minions.length > 0 ? (
            <View style={styles.minionList}>
              <ThemedText style={styles.minionHeader}>Minions ({content.minions.length})</ThemedText>
              {content.minions.map((m, idx) => (
                <ThemedText key={idx} style={styles.roomDetailText}>
                  • {m.characterName} · HP {m.hp} · Lv {m.level}
                </ThemedText>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        {label}
      </ThemedText>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
  },
  hint: {
    color: '#9BA1A6',
    fontSize: 12,
    marginTop: -10,
  },
  errorText: {
    color: '#B00020',
    fontSize: 13,
  },
  toggleButton: {
    borderWidth: 1,
    borderColor: '#0a7ea4',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(10, 126, 164, 0.08)',
  },
  toggleButtonText: {
    color: '#0a7ea4',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#0a7ea4',
  },
  sectionTitle: {
    fontSize: 15,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropAllButton: {
    borderWidth: 1,
    borderColor: '#B00020',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  dropAllText: {
    color: '#B00020',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(176, 0, 32, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#B00020',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: '#9BA1A6',
    fontSize: 14,
    fontStyle: 'italic',
  },
  loadingText: {
    color: '#9BA1A6',
    fontSize: 13,
    fontStyle: 'italic',
    padding: 8,
  },
  questCard: {
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderLeftWidth: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  questHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  questTitle: {
    fontSize: 15,
  },
  questMeta: {
    fontSize: 12,
    color: '#687076',
  },
  questHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  runButton: {
    backgroundColor: '#2E5A1C',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  runButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  expandArrow: {
    fontSize: 12,
  },
  roomList: {
    borderTopWidth: 1,
    borderTopColor: '#E0E4E7',
    padding: 10,
    gap: 8,
  },
  roomRow: {
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E0E4E7',
    gap: 4,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomLabel: {
    fontSize: 13,
  },
  roomDetail: {
    gap: 3,
    marginTop: 2,
  },
  roomDetailText: {
    fontSize: 12,
    color: '#687076',
  },
  challengeStat: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  bossName: {
    fontSize: 14,
    color: '#4A0072',
  },
  bossDesc: {
    fontSize: 12,
    color: '#687076',
    fontStyle: 'italic',
    marginTop: 2,
  },
  minionList: {
    marginTop: 6,
    gap: 2,
  },
  minionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#687076',
  },
});
