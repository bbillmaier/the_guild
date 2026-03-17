import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { CreateEnemy, type GeneratedEnemy } from '@/components/enemies/create_enemy';
import { type EnemyGender } from '@/components/enemies/lists/name';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  clearGuildEnemies,
  initializeDatabase,
  insertGuildEnemy,
  listGuildEnemies,
  type GuildEnemy,
} from '@/lib/local-db';

export default function ViewEnemyListScreen() {
  const [enemies, setEnemies] = useState<GuildEnemy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [race, setRace] = useState('');
  const [enemyType, setEnemyType] = useState('');
  const [genderInput, setGenderInput] = useState('');

  async function loadEnemies() {
    try {
      setError(null);
      await initializeDatabase();
      const rows = await listGuildEnemies();
      setEnemies(rows);
    } catch (loadError) {
      setError('Could not load enemies.');
      console.error(loadError);
    }
  }

  useEffect(() => {
    void loadEnemies();
  }, []);

  async function handleCreateEnemy(enemy: GeneratedEnemy) {
    try {
      await insertGuildEnemy({
        uid: enemy.uid,
        characterName: enemy.characterName,
        gender: enemy.gender,
        className: enemy.class,
        hp: enemy.hp,
        strength: enemy.strength,
        dexterity: enemy.dexterity,
        constitution: enemy.constitution,
        intelligence: enemy.intelligence,
        wisdom: enemy.wisdom,
        charisma: enemy.charisma,
        physDesc: enemy.physDesc,
        metaDesc: enemy.metaDesc,
        race: enemy.race,
        baseDescription: enemy.baseDescription,
        level: 1,
      });
      await loadEnemies();
    } catch (insertError) {
      setError('Could not save enemy.');
      console.error(insertError);
    }
  }

  async function handleClearEnemies() {
    try {
      await clearGuildEnemies();
      await loadEnemies();
    } catch (clearError) {
      setError('Could not clear enemies.');
      console.error(clearError);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Enemy List</ThemedText>
      <ThemedText>/view_enemy_list</ThemedText>

      <ThemedView style={styles.formCard}>
        <ThemedText type="defaultSemiBold">Enemy Creator</ThemedText>
        <TextInput
          placeholder="Race (e.g. goblin)"
          value={race}
          onChangeText={setRace}
          style={styles.input}
        />
        <TextInput
          placeholder="Type (e.g. berserker)"
          value={enemyType}
          onChangeText={setEnemyType}
          style={styles.input}
        />
        <TextInput
          placeholder="Gender male/female (optional)"
          value={genderInput}
          onChangeText={setGenderInput}
          style={styles.input}
        />
        <CreateEnemy
          race={race}
          className={enemyType}
          gender={parseGenderInput(genderInput)}
          onCreate={(e) => void handleCreateEnemy(e)}
        />
      </ThemedView>

      <Pressable style={styles.clearButton} onPress={() => void handleClearEnemies()}>
        <ThemedText style={styles.clearButtonText}>Clear Enemies Table</ThemedText>
      </Pressable>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {enemies.length === 0 ? (
        <ThemedView style={styles.card}>
          <ThemedText>No enemies found.</ThemedText>
        </ThemedView>
      ) : (
        enemies.map((enemy) => (
          <ThemedView key={enemy.uid} style={styles.card}>
            <ThemedText type="defaultSemiBold">{enemy.characterName}</ThemedText>
            <ThemedText>
              UID: {enemy.uid} | Gender: {enemy.gender} | Type: {enemy.className} |
              Race: {enemy.race}
            </ThemedText>
            <ThemedText>HP {enemy.hp}</ThemedText>
            <ThemedText>
              STR {enemy.strength} DEX {enemy.dexterity} CON {enemy.constitution} INT{' '}
              {enemy.intelligence} WIS {enemy.wisdom} CHA {enemy.charisma}
            </ThemedText>
            <ThemedText>physDesc ids: {enemy.physDesc.join(', ') || '(none)'}</ThemedText>
            <ThemedText>metaDesc ids: {enemy.metaDesc.join(', ') || '(none)'}</ThemedText>
            <ThemedText>baseDescription: {enemy.baseDescription || '(empty)'}</ThemedText>
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

function parseGenderInput(value: string): EnemyGender | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'male' || normalized === 'female') {
    return normalized;
  }

  return undefined;
}
