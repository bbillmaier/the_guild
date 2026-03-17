import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  deleteGroupGreeting,
  initializeDatabase,
  insertGroupGreeting,
  listGroupGreetings,
  updateGroupGreetingActive,
  type GroupGreeting,
} from '@/lib/local-db';

export default function ViewGroupGreetingsScreen() {
  const [greetings, setGreetings] = useState<GroupGreeting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newText, setNewText] = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      setError(null);
      await initializeDatabase();
      setGreetings(await listGroupGreetings());
    } catch (err) {
      setError('Could not load greetings.');
      console.error(err);
    }
  }

  async function handleToggle(uid: string, active: boolean) {
    try {
      await updateGroupGreetingActive(uid, active);
      setGreetings((prev) => prev.map((g) => (g.uid === uid ? { ...g, active } : g)));
    } catch (err) {
      setError('Could not update greeting.');
      console.error(err);
    }
  }

  async function handleDelete(uid: string) {
    try {
      await deleteGroupGreeting(uid);
      setGreetings((prev) => prev.filter((g) => g.uid !== uid));
    } catch (err) {
      setError('Could not delete greeting.');
      console.error(err);
    }
  }

  async function handleAdd() {
    const text = newText.trim();
    if (!text) return;
    const uid = `group_greeting_custom_${Date.now()}`;
    const greeting: GroupGreeting = { uid, text, active: true };
    try {
      await insertGroupGreeting(greeting);
      setGreetings((prev) => [...prev, greeting]);
      setNewText('');
    } catch (err) {
      setError('Could not add greeting.');
      console.error(err);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Group Greetings</ThemedText>
      <ThemedText style={styles.hint}>
        Scenes used as context when a group of characters opens a party conversation
      </ThemedText>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {/* ── Add new ── */}
      <ThemedView style={styles.addCard}>
        <SectionHeader label="Add Greeting" />
        <TextInput
          placeholder="e.g. The characters are playing a game of cards..."
          value={newText}
          onChangeText={setNewText}
          style={styles.input}
          multiline
          numberOfLines={3}
          placeholderTextColor="#9BA1A6"
        />
        <Pressable
          style={[styles.addButton, !newText.trim() && styles.addButtonDisabled]}
          onPress={() => void handleAdd()}
          disabled={!newText.trim()}
        >
          <ThemedText style={styles.addButtonText}>Add Greeting</ThemedText>
        </Pressable>
      </ThemedView>

      {/* ── List ── */}
      <ThemedView style={styles.listCard}>
        <SectionHeader label={`All Greetings (${greetings.length})`} />
        {greetings.length === 0 ? (
          <ThemedText style={styles.emptyText}>No greetings yet.</ThemedText>
        ) : (
          greetings.map((g) => (
            <View key={g.uid} style={[styles.row, !g.active && styles.rowInactive]}>
              <ThemedText style={[styles.rowText, !g.active && styles.rowTextInactive]}>
                {g.text}
              </ThemedText>
              <View style={styles.rowActions}>
                <Pressable
                  style={[styles.toggleButton, g.active ? styles.toggleOn : styles.toggleOff]}
                  onPress={() => void handleToggle(g.uid, !g.active)}
                >
                  <ThemedText style={styles.toggleText}>{g.active ? 'Active' : 'Inactive'}</ThemedText>
                </Pressable>
                <Pressable style={styles.deleteButton} onPress={() => void handleDelete(g.uid)}>
                  <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
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
  container:        { padding: 16, gap: 14 },
  hint:             { color: '#9BA1A6', fontSize: 12, marginTop: -10 },
  errorText:        { color: '#B00020', fontSize: 13 },
  emptyText:        { color: '#9BA1A6', fontSize: 13, fontStyle: 'italic' },
  addCard:          { borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 12, padding: 14, gap: 10 },
  listCard:         { borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 12, padding: 14, gap: 10 },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent:    { width: 3, height: 18, borderRadius: 2, backgroundColor: '#3A2D5C' },
  sectionTitle:     { fontSize: 15 },
  input: {
    borderWidth: 1, borderColor: '#D0D5D9', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    color: '#11181C', backgroundColor: '#FFFFFF',
    fontSize: 14, textAlignVertical: 'top',
  },
  addButton:        { backgroundColor: '#3A2D5C', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  addButtonDisabled:{ backgroundColor: '#D0D5D9' },
  addButtonText:    { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  row:              { borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 8, padding: 10, gap: 8 },
  rowInactive:      { backgroundColor: 'rgba(0,0,0,0.03)' },
  rowText:          { fontSize: 13, lineHeight: 20, color: '#11181C', flex: 1 },
  rowTextInactive:  { color: '#9BA1A6' },
  rowActions:       { flexDirection: 'row', gap: 8, alignItems: 'center' },
  toggleButton:     { borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10 },
  toggleOn:         { backgroundColor: '#3A2D5C' },
  toggleOff:        { backgroundColor: '#9BA1A6' },
  toggleText:       { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  deleteButton:     { backgroundColor: '#B00020', borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10 },
  deleteButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
