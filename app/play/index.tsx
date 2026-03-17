import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View, Pressable } from 'react-native';

import { CharacterAvatar } from '@/components/character-avatar';
import { ThemedText } from '@/components/themed-text';
import { faerunDateShort } from '@/lib/calendar';
import { generateQuest, rollQuestDifficulty, rollQuestLevel } from '@/lib/generate-quest';
import {
  advanceGameDay,
  getGameDay,
  initializeDatabase,
  listActiveGuildEventSeeds,
  listGuildCharacters,
  listGuildQuests,
  listPendingQuestCompletions,
  resolveEffectiveAvatarPath,
  type GuildCharacter,
  type GuildQuest,
  type PendingQuestCompletion,
  type QuestDifficulty,
} from '@/lib/local-db';
import { applyQuestCompletion } from '@/lib/quest-simulation';
import { filterByRoom, getGroupMembers, getRoomAssignments, refreshRoomAssignments, type RoomKey, type RoomState } from '@/lib/room-assignments';
import { generateGuildEvent, pickEventChars } from '@/lib/generate-guild-event';
import { saveGuildEventHistory } from '@/lib/history';
import { useQuestRunner } from '@/contexts/quest-runner';

const NOTICE_BOARD_SIZE = 3;

const difficultyColor: Record<QuestDifficulty, string> = {
  easy:   '#2E7D32',
  medium: '#F57C00',
  hard:   '#B00020',
  deadly: '#4A0072',
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function TavernScreen() {
  const { runningQuests } = useQuestRunner();
  const [gameDay, setGameDay]               = useState<number>(1);
  const [quests, setQuests]                 = useState<GuildQuest[]>([]);
  const [characters, setCharacters]         = useState<GuildCharacter[]>([]);
  const [roomState, setRoomState]           = useState<RoomState>({ assignments: {}, groupIds: {} });
  const [effectiveAvatars, setEffectiveAvatars] = useState<Record<string, string | null>>({});
  const [pendingCompletions, setPendingCompletions] = useState<PendingQuestCompletion[]>([]);
  const [resting, setResting]               = useState(false);
  const [restStep, setRestStep]             = useState('');
  const [guildEvent, setGuildEvent]         = useState<{ narrative: string; charNames: string[] } | null>(null);
  const [questReturns, setQuestReturns]     = useState<Array<{ title: string; outcome: 'success' | 'failure'; partyNames: string[] }>>([]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    await initializeDatabase();
    const [day, allQuests, allChars, pending] = await Promise.all([
      getGameDay(),
      listGuildQuests(),
      listGuildCharacters(),
      listPendingQuestCompletions(),
    ]);
    setGameDay(day);
    setQuests(allQuests.filter((q) => q.status === 'active'));
    setPendingCompletions(pending);
    const rs = await getRoomAssignments(day, allChars);
    setRoomState(rs);
    setCharacters(allChars);
    const avatarEntries = await Promise.all(
      allChars.map(async (c) => {
        const room = rs.assignments[c.uid] ?? 'tavern';
        return [c.uid, await resolveEffectiveAvatarPath(c, room, day)] as const;
      })
    );
    setEffectiveAvatars(Object.fromEntries(avatarEntries));
  }

  const handleEndDay = useCallback(async () => {
    if (resting) return;
    setResting(true);
    setRestStep('The sun sets over the guild...');

    try {
      const next = await advanceGameDay(1);
      setGameDay(next);

      // Apply any quest completions due on this day
      const allPending = await listPendingQuestCompletions();
      const due = allPending.filter((p) => p.revealDay <= next);
      const returns: Array<{ title: string; outcome: 'success' | 'failure'; partyNames: string[] }> = [];
      for (const pending of due) {
        await applyQuestCompletion(pending);
        returns.push({ title: pending.questTitle, outcome: pending.outcome, partyNames: pending.partyNames });
      }
      const remaining = allPending.filter((p) => p.revealDay > next);
      setPendingCompletions(remaining);
      if (returns.length > 0) setQuestReturns(returns);

      // Refresh active quest list
      const all = await listGuildQuests();
      let active = all.filter((q) => q.status === 'active');

      // Refresh character list and roll new room assignments for the new day
      const freshChars = await listGuildCharacters();
      const newRs = await refreshRoomAssignments(next, freshChars);
      setRoomState(newRs);
      setCharacters(freshChars);
      const avatarEntries = await Promise.all(
        freshChars.map(async (c) => {
          const room = newRs.assignments[c.uid] ?? 'tavern';
          return [c.uid, await resolveEffectiveAvatarPath(c, room, next)] as const;
        })
      );
      setEffectiveAvatars(Object.fromEntries(avatarEntries));

      // Post exactly 1 new quest per day, as long as the board isn't full.
      if (active.length < NOTICE_BOARD_SIZE) {
        const avgLevel = freshChars.length > 0
          ? Math.round(freshChars.reduce((sum, c) => sum + c.level, 0) / freshChars.length)
          : 1;
        setRestStep('Posting new contract...');
        const difficulty = rollQuestDifficulty();
        const level = rollQuestLevel(avgLevel);
        const quest = await generateQuest(level, difficulty, setRestStep);
        active = [...active, quest];
      } else if (Math.random() < 0.10 && freshChars.length >= 2) {
        // Board is full — 10% chance of a guild event
        const eventChars = pickEventChars(freshChars, newRs.assignments);
        if (eventChars) {
          const seeds = await listActiveGuildEventSeeds();
          if (seeds.length > 0) {
            const seed = seeds[Math.floor(Math.random() * seeds.length)];
            const result = await generateGuildEvent(eventChars, seed, setRestStep);
            await saveGuildEventHistory(result.chars, result.narrative);
            setGuildEvent({
              narrative: result.narrative,
              charNames: result.chars.map((c) => c.characterName),
            });
          }
        }
      }

      setQuests(active);
    } finally {
      setResting(false);
      setRestStep('');
    }
  }, [resting]);

  return (
    <View style={styles.root}>
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <ThemedText type="title" style={styles.title}>The Wanderer's Rest</ThemedText>
          <View style={styles.dateChip}>
            <ThemedText style={styles.dateText}>{faerunDateShort(gameDay)}</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.flavor}>
          The fire crackles low. Somewhere in the back, a bard tunes badly. The barkeep nods as you enter — you're known here.
        </ThemedText>
      </View>

      <View style={styles.roomGrid}>
        <Pressable style={[styles.roomCard, styles.roomBarracks]} onPress={() => router.push('/play/barracks')}>
          <ThemedText style={styles.roomIcon}>⚔️</ThemedText>
          <ThemedText style={styles.roomName}>Barracks</ThemedText>
          <ThemedText style={styles.roomDesc}>Rally your adventurers</ThemedText>
        </Pressable>

        <Pressable style={[styles.roomCard, styles.roomArmory]} onPress={() => router.push('/play/armory')}>
          <ThemedText style={styles.roomIcon}>🛡️</ThemedText>
          <ThemedText style={styles.roomName}>Armory</ThemedText>
          <ThemedText style={styles.roomDesc}>Inspect your gear</ThemedText>
        </Pressable>

        <Pressable style={[styles.roomCard, styles.roomShop]} onPress={() => router.push('/play/shop')}>
          <ThemedText style={styles.roomIcon}>🛒</ThemedText>
          <ThemedText style={styles.roomName}>Market</ThemedText>
          <ThemedText style={styles.roomDesc}>Buy supplies</ThemedText>
        </Pressable>
      </View>

      {/* ── Adventurers in Tavern ── */}
      {(() => {
        const onQuestUids = new Set(pendingCompletions.flatMap((p) => p.partyUids));
        const presentChars = characters.filter((c) => !onQuestUids.has(c.uid));
        const onQuestChars = characters.filter((c) => onQuestUids.has(c.uid));
        return (
      <View style={styles.adventurersSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Adventurers</ThemedText>
        </View>

        {/* On-quest characters */}
        {onQuestChars.length > 0 && (
          <View style={styles.onQuestRow}>
            {onQuestChars.map((c) => {
              const pending = pendingCompletions.find((p) => p.partyUids.includes(c.uid));
              return (
                <View key={c.uid} style={styles.onQuestChip}>
                  <CharacterAvatar name={c.characterName} avatarPath={effectiveAvatars[c.uid] ?? c.avatarPath} size={44} />
                  <ThemedText style={styles.onQuestName} numberOfLines={1}>{c.characterName}</ThemedText>
                  <ThemedText style={styles.onQuestLabel}>
                    {pending ? `Returns Day ${pending.revealDay}` : 'On Quest'}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        )}

        {filterByRoom(presentChars, roomState.assignments, 'tavern').length === 0 && onQuestChars.length === 0 ? (
          <ThemedText style={styles.emptyText}>No adventurers are here right now.</ThemedText>
        ) : filterByRoom(presentChars, roomState.assignments, 'tavern').length === 0 ? null : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adventurerRow}>
            {(() => {
              const tavernChars = filterByRoom(presentChars, roomState.assignments, 'tavern');
              // Build group map: groupId → characters
              const groupMap = new Map<string, GuildCharacter[]>();
              for (const c of tavernChars) {
                const gid = roomState.groupIds[c.uid] ?? c.uid;
                if (!groupMap.has(gid)) groupMap.set(gid, []);
                groupMap.get(gid)!.push(c);
              }
              // Render each group once (skip duplicates)
              const seen = new Set<string>();
              return tavernChars.map((c) => {
                const gid = roomState.groupIds[c.uid] ?? c.uid;
                if (seen.has(gid)) return null;
                seen.add(gid);
                const group = groupMap.get(gid)!;
                if (group.length > 1) {
                  return (
                    <Pressable
                      key={gid}
                      style={styles.groupBox}
                      onPress={() => router.push({ pathname: '/play/party-chat', params: { uids: group.map((g) => g.uid).join(',') } })}
                    >
                      <ThemedText style={styles.groupLabel}>Talking</ThemedText>
                      <View style={styles.groupChips}>
                        {group.map((g) => (
                          <View key={g.uid} style={styles.adventurerChip}>
                            <CharacterAvatar name={g.characterName} avatarPath={effectiveAvatars[g.uid] ?? g.avatarPath} size={44} />
                            <ThemedText style={styles.adventurerName} numberOfLines={1}>{g.characterName}</ThemedText>
                            <ThemedText style={styles.adventurerMeta}>Lv {g.level} {g.className}</ThemedText>
                          </View>
                        ))}
                      </View>
                    </Pressable>
                  );
                }
                return (
                  <Pressable
                    key={c.uid}
                    style={styles.adventurerChip}
                    onPress={() => router.push({ pathname: '/play/chat', params: { characterUid: c.uid } })}
                  >
                    <CharacterAvatar name={c.characterName} avatarPath={effectiveAvatars[c.uid] ?? c.avatarPath} size={52} />
                    <ThemedText style={styles.adventurerName} numberOfLines={1}>{c.characterName}</ThemedText>
                    <ThemedText style={styles.adventurerMeta}>Lv {c.level} {c.className}</ThemedText>
                  </Pressable>
                );
              });
            })()}
          </ScrollView>
        )}
      </View>
        );
      })()}

      {/* ── Notice Board ── */}
      <View style={styles.noticeBoard}>
        <View style={styles.noticeBoardHeader}>
          <View style={styles.noticeBoardAccent} />
          <ThemedText type="defaultSemiBold" style={styles.noticeBoardTitle}>Notice Board</ThemedText>
          {quests.length > 0 && (
            <View style={styles.questCountBadge}>
              <ThemedText style={styles.questCountText}>{quests.length}</ThemedText>
            </View>
          )}
        </View>

        {quests.length === 0 ? (
          <ThemedText style={styles.noticeBoardEmpty}>
            No quests posted yet. Rest until dawn to receive new contracts.
          </ThemedText>
        ) : (
          quests.map((q) => (
            <View key={q.uid} style={styles.questCard}>
              <View style={styles.questCardTop}>
                <ThemedText style={styles.questTitle}>{q.title}</ThemedText>
                <View style={[styles.diffBadge, { backgroundColor: difficultyColor[q.difficulty] }]}>
                  <ThemedText style={styles.diffText}>{capitalize(q.difficulty)}</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.questMeta}>
                {q.biome} · Lv {q.level}
              </ThemedText>
              {q.summary ? (
                <ThemedText style={styles.questSummary} numberOfLines={2}>{q.summary}</ThemedText>
              ) : null}
            </View>
          ))
        )}
      </View>

      {/* ── Quest Log ── */}
      <Pressable style={styles.questLogButton} onPress={() => router.push('/play/quest-log')}>
        <View style={styles.questLogLeft}>
          <ThemedText style={styles.questLogIcon}>📖</ThemedText>
          <View style={styles.questLogTextBlock}>
            <ThemedText style={styles.questLogLabel}>Quest Log</ThemedText>
            {runningQuests.length > 0 ? (
              <View style={styles.questLogInProgress}>
                <ActivityIndicator size="small" color="#7A4F1E" style={styles.questLogSpinner} />
                <ThemedText style={styles.questLogInProgressText}>
                  {runningQuests.length} quest{runningQuests.length > 1 ? 's' : ''} in progress
                </ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.questLogSub}>View completed quests</ThemedText>
            )}
          </View>
        </View>
        <ThemedText style={styles.questLogChevron}>›</ThemedText>
      </Pressable>

      {/* ── Rest Until Dawn ── */}
      <Pressable style={[styles.endDayButton, resting && styles.endDayButtonDisabled]} onPress={handleEndDay} disabled={resting}>
        {resting ? (
          <ActivityIndicator size="small" color="#3A2D5C" />
        ) : (
          <ThemedText style={styles.endDayIcon}>🌙</ThemedText>
        )}
        <View style={styles.endDayTextBlock}>
          <ThemedText style={styles.endDayLabel}>
            {resting ? restStep || 'Resting...' : 'Rest Until Dawn'}
          </ThemedText>
          {!resting && (
            <ThemedText style={styles.endDaySubLabel}>Advance to next day</ThemedText>
          )}
        </View>
      </Pressable>
    </ScrollView>
    {/* ── Guild Event Modal ── */}
    <Modal
      visible={!!guildEvent}
      transparent
      animationType="fade"
      onRequestClose={() => setGuildEvent(null)}
    >
      <View style={styles.eventBackdrop}>
        <View style={styles.eventSheet}>
          <View style={styles.eventHeader}>
            <ThemedText style={styles.eventHeaderIcon}>⚡</ThemedText>
            <ThemedText style={styles.eventHeaderTitle}>Something Happened</ThemedText>
          </View>
          {guildEvent && (
            <ThemedText style={styles.eventCharNames}>
              {guildEvent.charNames.join(' · ')}
            </ThemedText>
          )}
          <ScrollView style={styles.eventBody} showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.eventNarrative}>{guildEvent?.narrative}</ThemedText>
          </ScrollView>
          <Pressable style={styles.eventDismiss} onPress={() => setGuildEvent(null)}>
            <ThemedText style={styles.eventDismissText}>Dismiss</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>

    {/* ── Quest Return Modal ── */}
    <Modal
      visible={questReturns.length > 0}
      transparent
      animationType="fade"
      onRequestClose={() => setQuestReturns((prev) => prev.slice(1))}
    >
      <View style={styles.eventBackdrop}>
        <View style={styles.eventSheet}>
          {questReturns[0] && (
            <>
              <View style={styles.eventHeader}>
                <ThemedText style={styles.eventHeaderIcon}>
                  {questReturns[0].outcome === 'success' ? '🏆' : '💀'}
                </ThemedText>
                <ThemedText style={[styles.eventHeaderTitle, { color: questReturns[0].outcome === 'success' ? '#2E7D32' : '#B00020' }]}>
                  Party Returned — {questReturns[0].outcome === 'success' ? 'Success' : 'Failure'}
                </ThemedText>
              </View>
              <ThemedText style={styles.eventCharNames}>
                {questReturns[0].title}
              </ThemedText>
              <View style={styles.eventBody}>
                <ThemedText style={styles.eventNarrative}>
                  {questReturns[0].partyNames.join(', ')} {questReturns[0].outcome === 'success' ? 'have returned victorious. Their rewards and experience have been applied.' : 'have returned defeated. Their wounds have been tended.'}
                </ThemedText>
              </View>
            </>
          )}
          <Pressable style={styles.eventDismiss} onPress={() => setQuestReturns((prev) => prev.slice(1))}>
            <ThemedText style={styles.eventDismissText}>
              {questReturns.length > 1 ? `Next (${questReturns.length - 1} more)` : 'Dismiss'}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    padding: 16,
    gap: 20,
  },
  header: {
    gap: 8,
    paddingVertical: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    color: '#7A4F1E',
    flex: 1,
  },
  dateChip: {
    backgroundColor: 'rgba(122, 79, 30, 0.12)',
    borderWidth: 1,
    borderColor: '#D4B896',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#7A4F1E',
    fontWeight: '600',
  },
  flavor: {
    fontSize: 14,
    color: '#9BA1A6',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  roomGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  roomCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 14,
    gap: 6,
    alignItems: 'center',
  },
  roomBarracks: {
    backgroundColor: '#2E5A1C',
  },
  roomArmory: {
    backgroundColor: '#4A3728',
  },
  roomShop: {
    backgroundColor: '#5C4A1E',
  },
  roomIcon: {
    fontSize: 28,
  },
  roomName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  roomDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  adventurersSection: {
    gap: 10,
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
    backgroundColor: '#2E5A1C',
  },
  sectionTitle: {
    fontSize: 15,
  },
  emptyText: {
    fontSize: 13,
    color: '#9BA1A6',
    fontStyle: 'italic',
  },
  adventurerRow: {
    gap: 10,
    paddingVertical: 4,
  },
  adventurerChip: {
    alignItems: 'center',
    gap: 5,
    width: 72,
  },
  groupBox: {
    borderWidth: 1,
    borderColor: '#3A2D5C',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: 'rgba(58,45,92,0.05)',
  },
  groupLabel: {
    fontSize: 10,
    color: '#3A2D5C',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  groupChips: {
    flexDirection: 'row',
    gap: 8,
  },
  adventurerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2E5A1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adventurerAvatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  adventurerName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  adventurerMeta: {
    fontSize: 10,
    color: '#9BA1A6',
    textAlign: 'center',
  },
  noticeBoard: {
    borderWidth: 1,
    borderColor: '#D4B896',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    backgroundColor: 'rgba(212, 184, 150, 0.08)',
  },
  noticeBoardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeBoardAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#7A4F1E',
  },
  noticeBoardTitle: {
    fontSize: 15,
    color: '#7A4F1E',
    flex: 1,
  },
  questCountBadge: {
    backgroundColor: '#7A4F1E',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  questCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  noticeBoardEmpty: {
    fontSize: 13,
    color: '#9BA1A6',
    fontStyle: 'italic',
  },
  questCard: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 184, 150, 0.4)',
    paddingTop: 10,
    gap: 4,
  },
  questCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  diffBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  diffText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  questMeta: {
    fontSize: 12,
    color: '#9BA1A6',
  },
  questSummary: {
    fontSize: 12,
    color: '#687076',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  questLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D4B896',
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(212, 184, 150, 0.08)',
  },
  questLogLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  questLogIcon: {
    fontSize: 24,
  },
  questLogTextBlock: {
    flex: 1,
    gap: 3,
  },
  questLogLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7A4F1E',
  },
  questLogSub: {
    fontSize: 12,
    color: '#9BA1A6',
  },
  questLogInProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  questLogSpinner: {
    transform: [{ scale: 0.7 }],
  },
  questLogInProgressText: {
    fontSize: 12,
    color: '#7A4F1E',
    fontStyle: 'italic',
  },
  questLogChevron: {
    fontSize: 22,
    color: '#D4B896',
    fontWeight: '300',
  },
  endDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#3A2D5C',
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(58, 45, 92, 0.08)',
  },
  endDayButtonDisabled: {
    opacity: 0.6,
  },
  endDayIcon: {
    fontSize: 28,
  },
  endDayTextBlock: {
    flex: 1,
  },
  endDayLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3A2D5C',
  },
  endDaySubLabel: {
    fontSize: 12,
    color: '#9BA1A6',
    marginTop: 1,
  },

  // Guild event modal
  eventBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  eventSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  eventHeaderIcon: {
    fontSize: 22,
  },
  eventHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E5A1C',
  },
  eventCharNames: {
    fontSize: 12,
    color: '#9BA1A6',
    paddingHorizontal: 20,
    paddingBottom: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  eventBody: {
    paddingHorizontal: 20,
    maxHeight: 360,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 14,
  },
  eventNarrative: {
    fontSize: 14,
    lineHeight: 24,
    color: '#11181C',
    paddingBottom: 20,
  },
  eventDismiss: {
    borderTopWidth: 1,
    borderTopColor: '#E0E4E7',
    paddingVertical: 14,
    alignItems: 'center',
  },
  eventDismissText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E5A1C',
  },
  onQuestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 4,
  },
  onQuestChip: {
    alignItems: 'center',
    gap: 4,
    width: 72,
    opacity: 0.6,
  },
  onQuestName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  onQuestLabel: {
    fontSize: 9,
    color: '#7A4F1E',
    textAlign: 'center',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
