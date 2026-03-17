import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  deleteGuildEventSeed,
  initializeDatabase,
  insertGuildEventSeed,
  listGuildEventSeeds,
  updateGuildEventSeedActive,
  updateGuildEventSeedDelta,
  updateGuildEventSeedUseCommonQuest,
  type GuildEventSeed,
} from '@/lib/local-db';

const DELTA_BG: Record<number, string> = { [-1]: '#B00020', 0: '#687076', 1: '#2E7D32' };

function deltaChipSelected(d: number) {
  return { borderColor: DELTA_BG[d] ?? '#687076', backgroundColor: DELTA_BG[d] ?? '#687076' };
}

export default function ViewGuildEventsScreen() {
  const [seeds, setSeeds] = useState<GuildEventSeed[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [newDelta, setNewDelta] = useState<number>(0);
  const [newUseQuest, setNewUseQuest] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      setError(null);
      await initializeDatabase();
      setSeeds(await listGuildEventSeeds());
    } catch (err) {
      setError('Could not load events.');
      console.error(err);
    }
  }

  async function handleToggleActive(uid: string, active: boolean) {
    try {
      await updateGuildEventSeedActive(uid, active);
      setSeeds((prev) => prev.map((s) => (s.uid === uid ? { ...s, active } : s)));
    } catch { setError('Could not update.'); }
  }

  async function handleDelta(uid: string, delta: number) {
    try {
      await updateGuildEventSeedDelta(uid, delta);
      setSeeds((prev) => prev.map((s) => (s.uid === uid ? { ...s, relationshipDelta: delta } : s)));
    } catch { setError('Could not update delta.'); }
  }

  async function handleToggleQuest(uid: string, useCommonQuest: boolean) {
    try {
      await updateGuildEventSeedUseCommonQuest(uid, useCommonQuest);
      setSeeds((prev) => prev.map((s) => (s.uid === uid ? { ...s, useCommonQuest } : s)));
    } catch { setError('Could not update.'); }
  }

  async function handleDelete(uid: string) {
    try {
      await deleteGuildEventSeed(uid);
      setSeeds((prev) => prev.filter((s) => s.uid !== uid));
    } catch { setError('Could not delete.'); }
  }

  async function handleAdd() {
    const text = newText.trim();
    if (!text) return;
    const seed: GuildEventSeed = {
      uid: `guild_event_custom_${Date.now()}`,
      text,
      active: true,
      relationshipDelta: newDelta,
      useCommonQuest: newUseQuest,
    };
    try {
      await insertGuildEventSeed(seed);
      setSeeds((prev) => [...prev, seed]);
      setNewText('');
      setNewDelta(0);
      setNewUseQuest(false);
    } catch { setError('Could not add event.'); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Guild Events</ThemedText>
      <ThemedText style={styles.hint}>
        Random events that occur between guild members at the start of a new day
      </ThemedText>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {/* ── Add new ── */}
      <ThemedView style={styles.card}>
        <SectionHeader label="Add Event" />
        <TextInput
          placeholder="Describe the situation..."
          value={newText}
          onChangeText={setNewText}
          style={styles.input}
          multiline
          numberOfLines={3}
          placeholderTextColor="#9BA1A6"
        />
        <View style={styles.optionRow}>
          <ThemedText style={styles.optionLabel}>Relationship change:</ThemedText>
          {([-1, 0, 1] as const).map((d) => (
            <Pressable
              key={d}
              style={[styles.deltaChip, newDelta === d && deltaChipSelected(d)]}
              onPress={() => setNewDelta(d)}
            >
              <ThemedText style={[styles.deltaChipText, newDelta === d && styles.deltaChipTextOn]}>
                {d === 1 ? '+1' : d === -1 ? '−1' : '0'}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[styles.questToggle, newUseQuest && styles.questToggleOn]}
          onPress={() => setNewUseQuest((v) => !v)}
        >
          <ThemedText style={[styles.questToggleText, newUseQuest && styles.questToggleTextOn]}>
            {newUseQuest ? '📜 Use Common Quest' : 'Use Common Quest'}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.addButton, !newText.trim() && styles.addButtonDisabled]}
          onPress={() => void handleAdd()}
          disabled={!newText.trim()}
        >
          <ThemedText style={styles.addButtonText}>Add Event</ThemedText>
        </Pressable>
      </ThemedView>

      {/* ── List ── */}
      <ThemedView style={styles.card}>
        <SectionHeader label={`All Events (${seeds.length})`} />
        {seeds.length === 0 ? (
          <ThemedText style={styles.emptyText}>No events yet.</ThemedText>
        ) : (
          seeds.map((s) => (
            <View key={s.uid} style={[styles.row, !s.active && styles.rowInactive]}>
              <ThemedText style={[styles.rowText, !s.active && styles.rowTextInactive]}>
                {s.text}
              </ThemedText>
              <View style={styles.rowActions}>
                {/* Delta */}
                <View style={styles.deltaRow}>
                  {([-1, 0, 1] as const).map((d) => (
                    <Pressable
                      key={d}
                      style={[styles.deltaChip, s.relationshipDelta === d && deltaChipSelected(d)]}
                      onPress={() => void handleDelta(s.uid, d)}
                    >
                      <ThemedText style={[styles.deltaChipText, s.relationshipDelta === d && styles.deltaChipTextOn]}>
                        {d === 1 ? '+1' : d === -1 ? '−1' : '0'}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
                {/* Use quest */}
                <Pressable
                  style={[styles.questToggle, s.useCommonQuest && styles.questToggleOn]}
                  onPress={() => void handleToggleQuest(s.uid, !s.useCommonQuest)}
                >
                  <ThemedText style={[styles.questToggleText, s.useCommonQuest && styles.questToggleTextOn]}>
                    {s.useCommonQuest ? '📜 Quest' : 'Quest'}
                  </ThemedText>
                </Pressable>
                {/* Active */}
                <Pressable
                  style={[styles.toggleButton, s.active ? styles.toggleOn : styles.toggleOff]}
                  onPress={() => void handleToggleActive(s.uid, !s.active)}
                >
                  <ThemedText style={styles.toggleText}>{s.active ? 'Active' : 'Off'}</ThemedText>
                </Pressable>
                {/* Delete */}
                <Pressable style={styles.deleteButton} onPress={() => void handleDelete(s.uid)}>
                  <ThemedText style={styles.deleteButtonText}>✕</ThemedText>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { padding: 16, gap: 14 },
  hint:               { color: '#9BA1A6', fontSize: 12, marginTop: -10 },
  errorText:          { color: '#B00020', fontSize: 13 },
  emptyText:          { color: '#9BA1A6', fontSize: 13, fontStyle: 'italic' },
  card:               { borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 12, padding: 14, gap: 10 },
  sectionHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent:      { width: 3, height: 18, borderRadius: 2, backgroundColor: '#2E5A1C' },
  sectionTitle:       { fontSize: 15 },
  input: {
    borderWidth: 1, borderColor: '#D0D5D9', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    color: '#11181C', backgroundColor: '#FFFFFF',
    fontSize: 14, textAlignVertical: 'top',
  },
  optionRow:          { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  optionLabel:        { fontSize: 12, color: '#687076', marginRight: 2 },
  deltaRow:           { flexDirection: 'row', gap: 4 },
  deltaChip: {
    borderWidth: 1, borderColor: '#D0D5D9', borderRadius: 20,
    paddingVertical: 3, paddingHorizontal: 9, minWidth: 30, alignItems: 'center',
  },
  deltaChipText:      { fontSize: 12, color: '#687076', fontWeight: '600' },
  deltaChipTextOn:    { color: '#FFFFFF', fontWeight: '600' },
  questToggle: {
    borderWidth: 1, borderColor: '#D0D5D9', borderRadius: 6,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  questToggleOn:      { borderColor: '#7A4F1E', backgroundColor: 'rgba(122,79,30,0.1)' },
  questToggleText:    { fontSize: 12, color: '#687076', fontWeight: '600' },
  questToggleTextOn:  { color: '#7A4F1E' },
  addButton:          { backgroundColor: '#2E5A1C', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  addButtonDisabled:  { backgroundColor: '#D0D5D9' },
  addButtonText:      { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  row:                { borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 8, padding: 10, gap: 8 },
  rowInactive:        { backgroundColor: 'rgba(0,0,0,0.03)' },
  rowText:            { fontSize: 13, lineHeight: 20, color: '#11181C' },
  rowTextInactive:    { color: '#9BA1A6' },
  rowActions:         { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  toggleButton:       { borderRadius: 6, paddingVertical: 4, paddingHorizontal: 9 },
  toggleOn:           { backgroundColor: '#2E7D32' },
  toggleOff:          { backgroundColor: '#9BA1A6' },
  toggleText:         { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  deleteButton:       { backgroundColor: '#B00020', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 9 },
  deleteButtonText:   { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
