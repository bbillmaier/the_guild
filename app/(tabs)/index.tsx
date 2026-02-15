import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  addGuildNote,
  deleteGuildNote,
  initializeDatabase,
  listGuildNotes,
  type GuildNote,
} from '@/lib/local-db';

export default function HomeScreen() {
  const [notes, setNotes] = useState<GuildNote[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function refreshNotes() {
    try {
      setError(null);
      await initializeDatabase();
      const nextNotes = await listGuildNotes();
      setNotes(nextNotes);
    } catch (refreshError) {
      setError('Could not load notes from the local database.');
      console.error(refreshError);
    }
  }

  useEffect(() => {
    void refreshNotes();
  }, []);

  async function handleAddNote() {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      return;
    }

    try {
      await addGuildNote(trimmedDraft);
      setDraft('');
      await refreshNotes();
    } catch (addError) {
      setError('Could not save your note.');
      console.error(addError);
    }
  }

  async function handleDeleteNote(id: number) {
    try {
      await deleteGuildNote(id);
      await refreshNotes();
    } catch (deleteError) {
      setError('Could not delete that note.');
      console.error(deleteError);
    }
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Local SQL Notes</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Add a note</ThemedText>
        <TextInput
          placeholder="Type and press Save"
          value={draft}
          onChangeText={setDraft}
          style={styles.input}
        />
        <Pressable style={styles.button} onPress={() => void handleAddNote()}>
          <ThemedText style={styles.buttonText}>Save</ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Saved locally</ThemedText>
        {notes.length === 0 ? (
          <ThemedText>No notes yet.</ThemedText>
        ) : (
          notes.map((note) => (
            <ThemedView key={note.id} style={styles.noteRow}>
              <ThemedView style={styles.noteText}>
                <ThemedText type="defaultSemiBold">{note.title}</ThemedText>
                <ThemedText>{new Date(note.createdAt).toLocaleString()}</ThemedText>
              </ThemedView>
              <Pressable style={styles.deleteButton} onPress={() => void handleDeleteNote(note.id)}>
                <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
              </Pressable>
            </ThemedView>
          ))
        )}
      </ThemedView>

      {error ? (
        <ThemedView style={styles.stepContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      ) : null}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    marginBottom: 6,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 16,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  input: {
    borderWidth: 1,
    borderColor: '#687076',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#11181C',
    backgroundColor: '#FFFFFF',
  },
  button: {
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noteRow: {
    borderWidth: 1,
    borderColor: '#687076',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  noteText: {
    flex: 1,
    gap: 2,
  },
  deleteButton: {
    backgroundColor: '#E45757',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorText: {
    color: '#B00020',
  },
});
