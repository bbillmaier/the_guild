import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { initializeDatabase, listGuildCharacters, type GuildCharacter } from '@/lib/local-db';

export default function ViewCharListScreen() {
  const [characters, setCharacters] = useState<GuildCharacter[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
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

    void load();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Character List</ThemedText>
      <ThemedText>/view_char_list</ThemedText>

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
              UID: {character.uid} | Class: {character.className} | Race: {character.race}
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
