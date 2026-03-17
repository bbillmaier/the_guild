import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { faerunDateShort } from '@/lib/calendar';
import { initializeDatabase, listPendingQuestCompletions, listRecentQuestHistory, type PendingQuestCompletion, type QuestDifficulty, type QuestHistory } from '@/lib/local-db';
import { useQuestRunner } from '@/contexts/quest-runner';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
type PageSize = typeof PAGE_SIZE_OPTIONS[number];

const difficultyColor: Record<QuestDifficulty, string> = {
  easy:   '#2E7D32',
  medium: '#F57C00',
  hard:   '#B00020',
  deadly: '#4A0072',
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function QuestLogScreen() {
  const { runningQuests } = useQuestRunner();
  const [entries, setEntries] = useState<QuestHistory[]>([]);
  const [pendingEntries, setPendingEntries] = useState<PendingQuestCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Per-entry view mode: 'narrative' | 'log'
  const [viewMode, setViewMode] = useState<Map<string, 'narrative' | 'log'>>(new Map());

  const load = useCallback(async (limit: PageSize) => {
    setLoading(true);
    try {
      await initializeDatabase();
      const [rows, pending] = await Promise.all([
        listRecentQuestHistory(limit),
        listPendingQuestCompletions(),
      ]);
      setEntries(rows);
      setPendingEntries(pending);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(pageSize);
  }, [load, pageSize]);

  // Refresh when a running quest finishes
  useEffect(() => {
    if (runningQuests.length === 0) {
      void load(pageSize);
    }
  }, [runningQuests.length, load, pageSize]);

  function toggleExpanded(uid: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) { next.delete(uid); } else { next.add(uid); }
      return next;
    });
  }

  function setEntryViewMode(uid: string, mode: 'narrative' | 'log') {
    setViewMode((prev) => new Map(prev).set(uid, mode));
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backText}>← Back</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.title}>Quest Log</ThemedText>
        </View>

        {/* In-progress indicator */}
        {runningQuests.length > 0 && (
          <View style={styles.inProgressCard}>
            <ActivityIndicator size="small" color="#7A4F1E" />
            <View style={styles.inProgressText}>
              <ThemedText style={styles.inProgressTitle}>Quests in progress ({runningQuests.length})</ThemedText>
              {runningQuests.map((q) => (
                <ThemedText key={q.questUid} style={styles.inProgressEntry}>
                  {q.questTitle} — {q.partyNames.join(', ')}
                </ThemedText>
              ))}
            </View>
          </View>
        )}

        {/* Page size selector */}
        <View style={styles.pageSizeRow}>
          <ThemedText style={styles.pageSizeLabel}>Show:</ThemedText>
          {PAGE_SIZE_OPTIONS.map((n) => (
            <Pressable
              key={n}
              style={[styles.pageSizeBtn, pageSize === n && styles.pageSizeBtnActive]}
              onPress={() => setPageSize(n)}
            >
              <ThemedText style={[styles.pageSizeBtnText, pageSize === n && styles.pageSizeBtnTextActive]}>
                {n}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Pending (awaiting reveal) */}
        {!loading && pendingEntries.length > 0 && (
          pendingEntries.map((p) => (
            <View key={p.uid} style={styles.pendingCard}>
              <View style={styles.pendingHeader}>
                <ThemedText style={styles.pendingTitle} numberOfLines={1}>{p.questTitle}</ThemedText>
                <View style={styles.pendingBadge}>
                  <ThemedText style={styles.pendingBadgeText}>Awaited</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.pendingMeta}>
                {p.partyNames.join(', ')}
              </ThemedText>
              <ThemedText style={styles.pendingReturn}>
                Returns on Day {p.revealDay}
              </ThemedText>
            </View>
          ))
        )}

        {/* Completed entries */}
        {loading ? (
          <ActivityIndicator size="large" color="#7A4F1E" style={styles.spinner} />
        ) : entries.length === 0 ? (
          <ThemedText style={styles.emptyText}>No quests completed yet.</ThemedText>
        ) : (
          entries.map((entry) => {
            const isOpen = expanded.has(entry.uid);
            const outcomeColor = entry.outcome === 'success' ? '#2E7D32' : '#B00020';
            const mode = viewMode.get(entry.uid) ?? 'narrative';
            return (
              <View key={entry.uid} style={styles.entryCard}>
                {/* Header row — tapping this expands/collapses */}
                <Pressable style={styles.entryHeader} onPress={() => toggleExpanded(entry.uid)}>
                  <View style={styles.entryHeaderLeft}>
                    <ThemedText style={styles.entryTitle} numberOfLines={isOpen ? undefined : 1}>
                      {entry.questTitle}
                    </ThemedText>
                    <View style={styles.entryMeta}>
                      <View style={[styles.outcomeBadge, { backgroundColor: outcomeColor }]}>
                        <ThemedText style={styles.outcomeBadgeText}>
                          {entry.outcome === 'success' ? 'Success' : 'Failure'}
                        </ThemedText>
                      </View>
                      {entry.difficulty ? (
                        <View style={[styles.diffBadge, { backgroundColor: difficultyColor[entry.difficulty] }]}>
                          <ThemedText style={styles.diffBadgeText}>{capitalize(entry.difficulty)}</ThemedText>
                        </View>
                      ) : null}
                      <ThemedText style={styles.entryDay}>{faerunDateShort(entry.gameDay)}</ThemedText>
                    </View>
                    <ThemedText style={styles.entryParty} numberOfLines={1}>
                      {entry.partyNames.join(', ')}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.chevron}>{isOpen ? '▲' : '▼'}</ThemedText>
                </Pressable>

                {/* Body — outside the header Pressable so toggle buttons don't conflict */}
                {isOpen ? (
                  <View style={styles.entryBody}>
                    <View style={styles.viewToggle}>
                      <Pressable
                        style={[styles.viewToggleBtn, mode === 'narrative' && styles.viewToggleBtnActive]}
                        onPress={() => setEntryViewMode(entry.uid, 'narrative')}
                      >
                        <ThemedText style={mode === 'narrative' ? styles.viewToggleBtnTextActive : styles.viewToggleBtnText}>
                          Narrative
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        style={[styles.viewToggleBtn, mode === 'log' && styles.viewToggleBtnActive]}
                        onPress={() => setEntryViewMode(entry.uid, 'log')}
                      >
                        <ThemedText style={mode === 'log' ? styles.viewToggleBtnTextActive : styles.viewToggleBtnText}>
                          Combat Log
                        </ThemedText>
                      </Pressable>
                    </View>

                    {mode === 'narrative' ? (
                      <ThemedText style={styles.entryNarrative}>
                        {entry.summary || 'No narrative recorded.'}
                      </ThemedText>
                    ) : (
                      <ThemedText style={styles.entryLog}>
                        {entry.transcript || 'No combat log recorded.'}
                      </ThemedText>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    color: '#7A4F1E',
    fontWeight: '600',
  },
  title: {
    color: '#7A4F1E',
  },
  inProgressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#D4B896',
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(212, 184, 150, 0.12)',
  },
  inProgressText: {
    flex: 1,
    gap: 4,
  },
  inProgressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A4F1E',
  },
  inProgressEntry: {
    fontSize: 12,
    color: '#9BA1A6',
    fontStyle: 'italic',
  },
  pageSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageSizeLabel: {
    fontSize: 13,
    color: '#687076',
    marginRight: 4,
  },
  pageSizeBtn: {
    borderWidth: 1,
    borderColor: '#D4B896',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pageSizeBtnActive: {
    backgroundColor: '#7A4F1E',
    borderColor: '#7A4F1E',
  },
  pageSizeBtnText: {
    fontSize: 13,
    color: '#7A4F1E',
    fontWeight: '600',
  },
  pageSizeBtnTextActive: {
    color: '#FFFFFF',
  },
  spinner: {
    marginTop: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9BA1A6',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 40,
  },
  entryCard: {
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 12,
    padding: 14,
    gap: 0,
    backgroundColor: 'rgba(212, 184, 150, 0.04)',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  entryHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  outcomeBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  outcomeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  diffBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  diffBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  entryDay: {
    fontSize: 11,
    color: '#9BA1A6',
  },
  entryParty: {
    fontSize: 12,
    color: '#687076',
  },
  chevron: {
    fontSize: 12,
    color: '#9BA1A6',
    paddingTop: 2,
  },
  entryBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E4E7',
    gap: 12,
  },
  viewToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D4B896',
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  viewToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  viewToggleBtnActive: {
    backgroundColor: '#7A4F1E',
  },
  viewToggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7A4F1E',
  },
  viewToggleBtnTextActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  entryNarrative: {
    fontSize: 13,
    lineHeight: 22,
    color: '#11181C',
    fontStyle: 'italic',
  },
  entryLog: {
    fontSize: 12,
    lineHeight: 20,
    color: '#687076',
    fontFamily: 'monospace',
  },
  pendingCard: {
    borderWidth: 1,
    borderColor: '#D4B896',
    borderRadius: 12,
    padding: 14,
    gap: 4,
    backgroundColor: 'rgba(122, 79, 30, 0.06)',
    borderStyle: 'dashed',
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  pendingBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#7A4F1E',
  },
  pendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pendingMeta: {
    fontSize: 12,
    color: '#687076',
  },
  pendingReturn: {
    fontSize: 11,
    color: '#7A4F1E',
    fontWeight: '600',
    fontStyle: 'italic',
  },
});
