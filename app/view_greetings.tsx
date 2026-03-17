import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  deleteCharacterGreeting,
  initializeDatabase,
  insertCharacterGreeting,
  listCharacterGreetings,
  type CharacterGreeting,
  type GreetingRoom,
} from '@/lib/local-db';

const ROOM_LABELS: Record<GreetingRoom, string> = {
  tavern:   'Tavern',
  barracks: 'Barracks',
  armory:   'Armory',
  any:      'Any Room',
};

const ROOM_COLORS: Record<GreetingRoom, string> = {
  tavern:   '#7A4F1E',
  barracks: '#2E5A1C',
  armory:   '#4A3728',
  any:      '#0a7ea4',
};

const ROOMS: GreetingRoom[] = ['tavern', 'barracks', 'armory', 'any'];

function generateUid(): string {
  return `greeting_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function ViewGreetingsScreen() {
  const [greetings, setGreetings] = useState<CharacterGreeting[]>([]);
  const [error, setError]         = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newRoom, setNewRoom]       = useState<GreetingRoom>('tavern');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setError(null);
      await initializeDatabase();
      setGreetings(await listCharacterGreetings());
    } catch (err) {
      setError('Could not load greetings.');
      console.error(err);
    }
  }

  async function handleAdd() {
    const message = newMessage.trim();
    if (!message) return;
    const greeting: CharacterGreeting = { uid: generateUid(), room: newRoom, message };
    try {
      await insertCharacterGreeting(greeting);
      setGreetings((prev) => [...prev, greeting]);
      setNewMessage('');
    } catch (err) {
      setError('Could not add greeting.');
      console.error(err);
    }
  }

  async function handleDelete(uid: string) {
    try {
      await deleteCharacterGreeting(uid);
      setGreetings((prev) => prev.filter((g) => g.uid !== uid));
    } catch (err) {
      setError('Could not delete greeting.');
      console.error(err);
    }
  }

  const grouped = ROOMS.map((room) => ({
    room,
    items: greetings.filter((g) => g.room === room),
  }));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Character Greetings</ThemedText>
      <ThemedText style={styles.hint}>
        Use {'{'}{'{'} char {'}'}{'}'}  as a placeholder for the character's name
      </ThemedText>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {/* ── Add new greeting ── */}
      <ThemedView style={styles.addCard}>
        <SectionHeader label="Add Greeting" color="#0a7ea4" />
        <TextInput
          placeholder="e.g. {{char}} looks up as you approach."
          value={newMessage}
          onChangeText={setNewMessage}
          style={styles.input}
          multiline
          numberOfLines={3}
          placeholderTextColor="#9BA1A6"
        />
        <View style={styles.roomRow}>
          {ROOMS.map((room) => (
            <Pressable
              key={room}
              style={[styles.roomChip, newRoom === room && { backgroundColor: ROOM_COLORS[room], borderColor: ROOM_COLORS[room] }]}
              onPress={() => setNewRoom(room)}
            >
              <ThemedText style={[styles.roomChipText, newRoom === room && styles.roomChipTextSelected]}>
                {ROOM_LABELS[room]}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[styles.addButton, !newMessage.trim() && styles.addButtonDisabled]}
          onPress={() => void handleAdd()}
          disabled={!newMessage.trim()}
        >
          <ThemedText style={styles.addButtonText}>Add Greeting</ThemedText>
        </Pressable>
      </ThemedView>

      {/* ── Grouped by room ── */}
      {grouped.map(({ room, items }) => (
        <ThemedView key={room} style={styles.groupCard}>
          <SectionHeader label={ROOM_LABELS[room]} color={ROOM_COLORS[room]} />
          {items.length === 0 ? (
            <ThemedText style={styles.emptyText}>No greetings for this room.</ThemedText>
          ) : (
            items.map((g) => (
              <View key={g.uid} style={styles.greetingRow}>
                <ThemedText style={styles.greetingText}>{g.message}</ThemedText>
                <Pressable style={styles.deleteButton} onPress={() => void handleDelete(g.uid)}>
                  <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
                </Pressable>
              </View>
            ))
          )}
        </ThemedView>
      ))}
    </ScrollView>
  );
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionAccent, { backgroundColor: color }]} />
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  hint: { color: '#9BA1A6', fontSize: 12, marginTop: -10 },
  errorText: { color: '#B00020', fontSize: 13 },
  emptyText: { color: '#9BA1A6', fontSize: 13, fontStyle: 'italic' },

  addCard: { borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 12, padding: 14, gap: 10 },
  groupCard: { borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 12, padding: 14, gap: 10 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent: { width: 3, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 15 },

  input: {
    borderWidth: 1, borderColor: '#D0D5D9', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    color: '#11181C', backgroundColor: '#FFFFFF',
    fontSize: 14, textAlignVertical: 'top',
  },

  roomRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  roomChip: {
    borderWidth: 1, borderColor: '#D0D5D9', borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 12,
  },
  roomChipText: { fontSize: 13, color: '#687076' },
  roomChipTextSelected: { color: '#FFFFFF', fontWeight: '600' },

  addButton: { backgroundColor: '#2E5A1C', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  addButtonDisabled: { backgroundColor: '#D0D5D9' },
  addButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  greetingRow: {
    borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 8, padding: 10, gap: 8,
  },
  greetingText: { fontSize: 13, lineHeight: 20, color: '#11181C' },
  deleteButton: {
    backgroundColor: '#B00020', borderRadius: 6,
    paddingVertical: 5, paddingHorizontal: 10, alignSelf: 'flex-start',
  },
  deleteButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
