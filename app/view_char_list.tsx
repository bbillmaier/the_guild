import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { CreateCharacter, type GeneratedCharacter } from '@/components/characters/createCharacter';
import { type CharacterGender } from '@/components/characters/lists/name';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  clearGuildCharacters,
  initializeDatabase,
  insertGuildCharacter,
  listGuildCharacters,
  type GuildCharacter,
} from '@/lib/local-db';

export default function ViewCharListScreen() {
  const [characters, setCharacters] = useState<GuildCharacter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [race, setRace] = useState('');
  const [className, setClassName] = useState('');
  const [genderInput, setGenderInput] = useState('');

  async function loadCharacters() {
    try {
      setError(null);
      await initializeDatabase();
      const rows = await listGuildCharacters();
      setCharacters(rows);
    } catch (loadError) {
      setError('Could not load characters.');
      console.error(loadError);
    }
  }

  useEffect(() => {
    void loadCharacters();
  }, []);

  async function handleCreateCharacter(character: GeneratedCharacter) {
    try {
      await insertGuildCharacter({
        uid: character.uid,
        characterName: character.characterName,
        gender: character.gender,
        className: character.class,
        strength: character.strength,
        dexterity: character.dexterity,
        constitution: character.constitution,
        intelligence: character.intelligence,
        wisdom: character.wisdom,
        charisma: character.charisma,
        physDesc: [],
        metaDesc: [],
        race: character.race,
        baseDescription: '',
      });
      await loadCharacters();
    } catch (insertError) {
      setError('Could not save character.');
      console.error(insertError);
    }
  }

  async function handleClearCharacters() {
    try {
      await clearGuildCharacters();
      await loadCharacters();
    } catch (clearError) {
      setError('Could not clear characters.');
      console.error(clearError);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Character List</ThemedText>
      <ThemedText>/view_char_list</ThemedText>

      <ThemedView style={styles.formCard}>
        <ThemedText type="defaultSemiBold">Test Character Creator</ThemedText>
        <TextInput
          placeholder="Race (e.g. human)"
          value={race}
          onChangeText={setRace}
          style={styles.input}
        />
        <TextInput
          placeholder="Class (e.g. wizard)"
          value={className}
          onChangeText={setClassName}
          style={styles.input}
        />
        <TextInput
          placeholder="Gender male/female (optional)"
          value={genderInput}
          onChangeText={setGenderInput}
          style={styles.input}
        />
        <CreateCharacter
          race={race}
          className={className}
          gender={parseGenderInput(genderInput)}
          onCreate={(c) => void handleCreateCharacter(c)}
        />
      </ThemedView>

      <Pressable style={styles.clearButton} onPress={() => void handleClearCharacters()}>
        <ThemedText style={styles.clearButtonText}>Clear Characters Table</ThemedText>
      </Pressable>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {characters.length === 0 ? (
        <ThemedView style={styles.card}>
          <ThemedText>No characters found.</ThemedText>
        </ThemedView>
      ) : (
        characters.map((character) => (
          <ThemedView key={character.uid} style={styles.card}>
            <ThemedText type="defaultSemiBold">{character.characterName}</ThemedText>
            <ThemedText>
              UID: {character.uid} | Gender: {character.gender} | Class: {character.className} |
              Race: {character.race}
            </ThemedText>
            <ThemedText>
              STR {character.strength} DEX {character.dexterity} CON {character.constitution} INT{' '}
              {character.intelligence} WIS {character.wisdom} CHA {character.charisma}
            </ThemedText>
            <ThemedText>physDesc ids: {character.physDesc.join(', ') || '(none)'}</ThemedText>
            <ThemedText>metaDesc ids: {character.metaDesc.join(', ') || '(none)'}</ThemedText>
            <ThemedText>baseDescription: {character.baseDescription || '(empty)'}</ThemedText>
          </ThemedView>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  formCard: {
    borderWidth: 1,
    borderColor: '#687076',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#687076',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    color: '#11181C',
  },
  clearButton: {
    backgroundColor: '#B00020',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderColor: '#687076',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  errorText: {
    color: '#B00020',
  },
});

function parseGenderInput(value: string): CharacterGender | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'male' || normalized === 'female') {
    return normalized;
  }

  return undefined;
}
