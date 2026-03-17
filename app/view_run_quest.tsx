import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { rarityColor, rarityLabel } from '@/components/items/create_item';
import { saveQuestHistoryForParty } from '@/lib/history';

import { RunQuest, type QuestReward } from '@/components/quest/run/run_quest';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  adjustResource,
  advanceGameDay,
  getRelationship,
  initializeDatabase,
  listGuildCharacters,
  listGuildQuests,
  listQuestRooms,
  setRelationshipScore,
  type GuildCharacter,
  type GuildQuest,
  type QuestRoom,
} from '@/lib/local-db';

type PagePhase = 'setup' | 'running' | 'result_complete' | 'result_failed';

export default function ViewRunQuestScreen() {
  const { questUid, preselectedUids, autoStart } = useLocalSearchParams<{
    questUid: string;
    preselectedUids?: string;
    autoStart?: string;
  }>();
  const router = useRouter();

  const [quest, setQuest] = useState<GuildQuest | null>(null);
  const [rooms, setRooms] = useState<QuestRoom[]>([]);
  const [characters, setCharacters] = useState<GuildCharacter[]>([]);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [phase, setPhase] = useState<PagePhase>('setup');
  const [resultNarrative, setResultNarrative] = useState('');
  const [reward, setReward] = useState<QuestReward | null>(null);
  const [storyPrompt, setStoryPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [questUid]);

  async function load() {
    try {
      await initializeDatabase();
      const [allQuests, allChars, questRooms] = await Promise.all([
        listGuildQuests(),
        listGuildCharacters(),
        listQuestRooms(questUid ?? ''),
      ]);
      // listGuildQuests filters active only — load all statuses for this lookup
      const found = allQuests.find((q) => q.uid === questUid) ?? null;
      setQuest(found);
      setRooms(questRooms);
      setCharacters(allChars);

      // Pre-select party from chat assignment
      if (preselectedUids) {
        const uids = preselectedUids.split(',').filter(Boolean);
        setSelectedUids(uids);
        if (autoStart === '1' && uids.length > 0) {
          setPhase('running');
        }
      }
    } catch (err) {
      setError('Could not load quest.');
      console.error(err);
    }
  }

  async function handleComplete() {
    try {
      await initializeDatabase();
      const allQuests = await listGuildQuests();
      const updated = allQuests.find((q) => q.uid === questUid);
      const narrative = updated?.narrative ?? '';
      setResultNarrative(narrative);
      await advanceGameDay(1);
      if (quest && selectedCharacters.length > 0) {
        void saveQuestHistoryForParty(quest, selectedCharacters, rooms, narrative, 'success');
        void adjustPartyRelationships(selectedCharacters, 5);
      }
    } catch {
      setResultNarrative('');
    }
    setPhase('result_complete');
  }

  async function handleFail() {
    try {
      await initializeDatabase();
      const allQuests = await listGuildQuests();
      const updated = allQuests.find((q) => q.uid === questUid);
      const narrative = updated?.narrative ?? '';
      setResultNarrative(narrative);
      await advanceGameDay(1);
      if (quest && selectedCharacters.length > 0) {
        void saveQuestHistoryForParty(quest, selectedCharacters, rooms, narrative, 'failure');
        void adjustPartyRelationships(selectedCharacters, -5);
      }
    } catch {
      setResultNarrative('');
    }
    setPhase('result_failed');
  }

  function toggleCharacter(uid: string) {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  }

  const selectedCharacters = characters.filter((c) => selectedUids.includes(c.uid));

  if (!quest) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title">Run Quest</ThemedText>
        {error ? (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        ) : (
          <ThemedText style={styles.emptyText}>Loading quest...</ThemedText>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Run Quest</ThemedText>
      <ThemedText style={styles.hint}>{quest.title}</ThemedText>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {/* ── Setup: pick party ── */}
      {phase === 'setup' ? (
        <>
          <ThemedView style={styles.section}>
            <SectionHeader label="Quest Details" />
            <ThemedText style={styles.detailText}>
              {quest.biome} · Level {quest.level} · {capitalize(quest.difficulty)} · {rooms.length} rooms
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.section}>
            <SectionHeader label="Select Party" />
            {characters.length === 0 ? (
              <ThemedText style={styles.emptyText}>No characters available.</ThemedText>
            ) : (
              characters.map((c) => {
                const selected = selectedUids.includes(c.uid);
                return (
                  <Pressable
                    key={c.uid}
                    style={[styles.charRow, selected && styles.charRowSelected]}
                    onPress={() => toggleCharacter(c.uid)}
                  >
                    <View style={styles.charInfo}>
                      <ThemedText type="defaultSemiBold">{c.characterName}</ThemedText>
                      <ThemedText style={styles.charMeta}>
                        Level {c.level} {c.race} {c.className} · HP {c.hp}
                      </ThemedText>
                    </View>
                    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                      {selected ? <ThemedText style={styles.checkmark}>✓</ThemedText> : null}
                    </View>
                  </Pressable>
                );
              })
            )}
          </ThemedView>

          <Pressable
            style={[styles.beginButton, selectedUids.length === 0 && styles.beginButtonDisabled]}
            onPress={() => setPhase('running')}
            disabled={selectedUids.length === 0}
          >
            <ThemedText style={styles.beginButtonText}>
              Begin Quest ({selectedUids.length} adventurer{selectedUids.length !== 1 ? 's' : ''})
            </ThemedText>
          </Pressable>
        </>
      ) : null}

      {/* ── Running ── */}
      {phase === 'running' ? (
        <RunQuest
          quest={quest}
          rooms={rooms}
          characters={selectedCharacters}
          onComplete={() => void handleComplete()}
          onFail={() => void handleFail()}
          onStoryPrompt={(p) => setStoryPrompt(p)}
          onRewards={(r) => {
            setReward(r);
            if (r.gold) void adjustResource('gold', r.gold);
          }}
        />
      ) : null}

      {/* ── Result: success ── */}
      {phase === 'result_complete' ? (
        <ThemedView style={styles.resultCard}>
          <View style={styles.resultBadge}>
            <ThemedText style={styles.resultBadgeText}>Quest Complete</ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" style={styles.resultTitle}>
            {quest.title}
          </ThemedText>
          {resultNarrative ? (
            <>
              <View style={styles.divider} />
              <ThemedText style={styles.narrativeText}>{resultNarrative}</ThemedText>
            </>
          ) : null}
          {reward ? (
            <>
              <View style={styles.divider} />
              <ThemedText type="defaultSemiBold" style={styles.rewardTitle}>Rewards</ThemedText>
              {reward.gold != null ? (
                <ThemedText style={styles.rewardGold}>{reward.gold} gold pieces</ThemedText>
              ) : null}
              {reward.items?.map((item) => (
                <View key={item.uid} style={styles.rewardItem}>
                  <View style={styles.rewardItemRow}>
                    <ThemedText type="defaultSemiBold" style={[styles.rewardItemName, { color: rarityColor(item.bonus) }]}>
                      {item.name}
                    </ThemedText>
                    <ThemedText style={[styles.rewardRarity, { color: rarityColor(item.bonus) }]}>
                      {rarityLabel(item.bonus)} +{item.bonus}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.rewardItemMeta}>
                    {item.slot} · {item.stat.toUpperCase()}
                  </ThemedText>
                  {item.description ? (
                    <ThemedText style={styles.rewardItemDesc}>{item.description}</ThemedText>
                  ) : null}
                </View>
              ))}
            </>
          ) : null}
          <Pressable style={styles.returnButton} onPress={() => router.back()}>
            <ThemedText style={styles.returnButtonText}>Return to Guild</ThemedText>
          </Pressable>
          {storyPrompt ? (
            <>
              <Pressable style={styles.debugButton} onPress={() => setShowPrompt((v) => !v)}>
                <ThemedText style={styles.debugButtonText}>
                  {showPrompt ? 'Hide Prompt' : 'Show Final Prompt'}
                </ThemedText>
              </Pressable>
              {showPrompt ? (
                <ThemedText style={styles.debugText}>{storyPrompt}</ThemedText>
              ) : null}
            </>
          ) : null}
        </ThemedView>
      ) : null}

      {/* ── Result: failed ── */}
      {phase === 'result_failed' ? (
        <ThemedView style={styles.resultCardFailed}>
          <View style={styles.failedBadge}>
            <ThemedText style={styles.failedBadgeText}>Quest Failed</ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" style={styles.resultTitle}>
            {quest.title}
          </ThemedText>
          {resultNarrative ? (
            <>
              <View style={styles.divider} />
              <ThemedText style={styles.narrativeText}>{resultNarrative}</ThemedText>
            </>
          ) : null}
          <Pressable style={styles.returnButton} onPress={() => router.back()}>
            <ThemedText style={styles.returnButtonText}>Return to Guild</ThemedText>
          </Pressable>
          {storyPrompt ? (
            <>
              <Pressable style={styles.debugButton} onPress={() => setShowPrompt((v) => !v)}>
                <ThemedText style={styles.debugButtonText}>
                  {showPrompt ? 'Hide Prompt' : 'Show Final Prompt'}
                </ThemedText>
              </Pressable>
              {showPrompt ? (
                <ThemedText style={styles.debugText}>{storyPrompt}</ThemedText>
              ) : null}
            </>
          ) : null}
        </ThemedView>
      ) : null}
    </ScrollView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const QUEST_OUTCOME_CAP = 50;

/**
 * Nudge relationships between all pairs in the party by `delta`.
 * Quest outcomes are capped so scores never exceed ±50 from this path.
 */
async function adjustPartyRelationships(chars: GuildCharacter[], delta: number): Promise<void> {
  for (let i = 0; i < chars.length; i++) {
    for (let j = i + 1; j < chars.length; j++) {
      const current = await getRelationship(chars[i].uid, chars[j].uid);
      const next = delta > 0
        ? Math.min(QUEST_OUTCOME_CAP, current + delta)
        : Math.max(-QUEST_OUTCOME_CAP, current + delta);
      if (next !== current) {
        await setRelationshipScore(chars[i].uid, chars[j].uid, next);
      }
    }
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{label}</ThemedText>
    </View>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  emptyText: {
    color: '#9BA1A6',
    fontSize: 13,
    fontStyle: 'italic',
  },
  detailText: {
    fontSize: 13,
    color: '#687076',
  },
  section: {
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 12,
    padding: 14,
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
    backgroundColor: '#0a7ea4',
  },
  sectionTitle: {
    fontSize: 15,
  },
  charRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E4E7',
  },
  charRowSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: 'rgba(10, 126, 164, 0.06)',
  },
  charInfo: {
    flex: 1,
    gap: 2,
  },
  charMeta: {
    fontSize: 12,
    color: '#687076',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D0D5D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: '#0a7ea4',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  beginButton: {
    backgroundColor: '#2E5A1C',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  beginButtonDisabled: {
    backgroundColor: '#D0D5D9',
  },
  beginButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  resultCard: {
    borderWidth: 2,
    borderColor: '#2E5A1C',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  resultCardFailed: {
    borderWidth: 2,
    borderColor: '#B00020',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  resultBadge: {
    backgroundColor: '#2E5A1C',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  resultBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  failedBadge: {
    backgroundColor: '#B00020',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  failedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultTitle: {
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E4E7',
  },
  narrativeText: {
    fontSize: 14,
    color: '#687076',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  failedDetail: {
    fontSize: 13,
    color: '#687076',
    lineHeight: 20,
  },
  rewardTitle: {
    fontSize: 14,
    color: '#0a7ea4',
  },
  rewardGold: {
    fontSize: 15,
    fontWeight: '600',
    color: '#B8860B',
  },
  rewardItem: {
    gap: 2,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#E0E4E7',
  },
  rewardItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardItemName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  rewardRarity: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rewardItemMeta: {
    fontSize: 12,
    color: '#687076',
  },
  rewardItemDesc: {
    fontSize: 12,
    color: '#9BA1A6',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  debugButton: {
    borderWidth: 1,
    borderColor: '#D0D5D9',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  debugButtonText: {
    color: '#687076',
    fontSize: 12,
    fontWeight: '600',
  },
  debugText: {
    fontSize: 11,
    color: '#9BA1A6',
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  returnButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  returnButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
