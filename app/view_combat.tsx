import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Fight, type FightResult } from '@/components/combat/fight';
import { AwardXp } from '@/components/experience/award_xp';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  initializeDatabase,
  listGuildCharacters,
  listGuildEnemies,
  type GuildCharacter,
  type GuildEnemy,
} from '@/lib/local-db';

export default function ViewCombatScreen() {
  const [characters, setCharacters] = useState<GuildCharacter[]>([]);
  const [enemies, setEnemies] = useState<GuildEnemy[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());
  const [selectedEnemyIds, setSelectedEnemyIds] = useState<Set<string>>(new Set());
  const [roomDescription, setRoomDescription] = useState('');
  const [enemyLevelInput, setEnemyLevelInput] = useState('1');
  const [fightResult, setFightResult] = useState<FightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      await initializeDatabase();
      const [chars, enms] = await Promise.all([listGuildCharacters(), listGuildEnemies()]);
      setCharacters(chars);
      setEnemies(enms);
    } catch (err) {
      setError('Could not load characters or enemies.');
      console.error(err);
    }
  }

  function toggleCharacter(uid: string) {
    setSelectedCharacterIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  }

  function toggleEnemy(uid: string) {
    setSelectedEnemyIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  }

  function handleResult(result: FightResult) {
    setFightResult(result);
  }

  const enemyLevel = Math.min(20, Math.max(1, parseInt(enemyLevelInput, 10) || 1));

  const readyToFight =
    selectedCharacterIds.size > 0 &&
    selectedEnemyIds.size > 0 &&
    roomDescription.trim().length > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Combat Setup</ThemedText>
      <ThemedText style={styles.hint}>/view_combat</ThemedText>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {/* ── Characters ── */}
      <ThemedView style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Characters
          </ThemedText>
          <ThemedText style={styles.selectedCount}>
            {selectedCharacterIds.size} selected
          </ThemedText>
        </View>

        {characters.length === 0 ? (
          <ThemedText style={styles.emptyText}>No characters found.</ThemedText>
        ) : (
          characters.map((character) => {
            const selected = selectedCharacterIds.has(character.uid);
            return (
              <Pressable
                key={character.uid}
                style={[styles.row, selected && styles.rowSelected]}
                onPress={() => toggleCharacter(character.uid)}
              >
                <View style={styles.rowInfo}>
                  <ThemedText type="defaultSemiBold">{character.characterName}</ThemedText>
                  <ThemedText style={styles.rowSub}>
                    {character.race} {character.className} · HP {character.hp} · STR{' '}
                    {character.strength} DEX {character.dexterity}
                  </ThemedText>
                </View>
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                  {selected && <ThemedText style={styles.checkmark}>✓</ThemedText>}
                </View>
              </Pressable>
            );
          })
        )}
      </ThemedView>

      {/* ── Enemies ── */}
      <ThemedView style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionAccent, styles.sectionAccentEnemy]} />
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Enemies
          </ThemedText>
          <ThemedText style={styles.selectedCount}>
            {selectedEnemyIds.size} selected
          </ThemedText>
        </View>

        {enemies.length === 0 ? (
          <ThemedText style={styles.emptyText}>No enemies found.</ThemedText>
        ) : (
          enemies.map((enemy) => {
            const selected = selectedEnemyIds.has(enemy.uid);
            return (
              <Pressable
                key={enemy.uid}
                style={[styles.row, selected && styles.rowSelectedEnemy]}
                onPress={() => toggleEnemy(enemy.uid)}
              >
                <View style={styles.rowInfo}>
                  <ThemedText type="defaultSemiBold">{enemy.characterName}</ThemedText>
                  <ThemedText style={styles.rowSub}>
                    {enemy.race} {enemy.className} · HP {enemy.hp} · STR{' '}
                    {enemy.strength} DEX {enemy.dexterity}
                  </ThemedText>
                </View>
                <View style={[styles.checkbox, selected && styles.checkboxSelectedEnemy]}>
                  {selected && <ThemedText style={styles.checkmark}>✓</ThemedText>}
                </View>
              </Pressable>
            );
          })
        )}
      </ThemedView>

      {/* ── Room Description ── */}
      <ThemedView style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Room Description
          </ThemedText>
        </View>
        <TextInput
          placeholder="Describe the setting where the battle takes place..."
          value={roomDescription}
          onChangeText={setRoomDescription}
          style={styles.input}
          multiline
          numberOfLines={3}
          placeholderTextColor="#9BA1A6"
        />
      </ThemedView>

      {/* ── Enemy Level ── */}
      <ThemedView style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionAccent, styles.sectionAccentEnemy]} />
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Enemy Level
          </ThemedText>
          <ThemedText style={styles.selectedCount}>1–20</ThemedText>
        </View>
        <TextInput
          placeholder="1"
          value={enemyLevelInput}
          onChangeText={setEnemyLevelInput}
          style={[styles.input, styles.levelInput]}
          keyboardType="number-pad"
          placeholderTextColor="#9BA1A6"
        />
      </ThemedView>

      {/* ── Fight ── */}
      {readyToFight ? (
        <Fight
          characterIds={Array.from(selectedCharacterIds)}
          enemyIds={Array.from(selectedEnemyIds)}
          roomDescription={roomDescription}
          enemyLevel={enemyLevel}
          onResult={handleResult}
        />
      ) : (
        <ThemedView style={styles.notReadyBanner}>
          <ThemedText style={styles.notReadyText}>
            Select at least one character, one enemy, and enter a room description to begin.
          </ThemedText>
        </ThemedView>
      )}

      {/* ── XP Award ── */}
      {fightResult?.winner === 'characters' ? (
        <AwardXp
          characterIds={Array.from(selectedCharacterIds)}
          xpPerCharacter={fightResult.xpPerCharacter}
        />
      ) : null}

      {/* ── Raw Combat Log ── */}
      {fightResult ? (
        <ThemedView style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionAccent} />
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Raw Combat Log
            </ThemedText>
          </View>
          <ScrollView style={styles.jsonScroll} nestedScrollEnabled>
            <ThemedText style={styles.jsonText}>
              {JSON.stringify({ winner: fightResult.winner, rounds: fightResult.rounds }, null, 2)}
            </ThemedText>
          </ScrollView>
        </ThemedView>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  hint: {
    color: '#9BA1A6',
    fontSize: 12,
    marginTop: -10,
  },
  errorText: {
    color: '#B00020',
  },

  // Sections
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
  sectionAccentEnemy: {
    backgroundColor: '#8B0000',
  },
  sectionTitle: {
    fontSize: 15,
    flex: 1,
  },
  selectedCount: {
    fontSize: 12,
    color: '#9BA1A6',
  },
  emptyText: {
    color: '#9BA1A6',
    fontSize: 14,
  },

  // Selectable rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E4E7',
  },
  rowSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: 'rgba(10, 126, 164, 0.06)',
  },
  rowSelectedEnemy: {
    borderColor: '#8B0000',
    backgroundColor: 'rgba(139, 0, 0, 0.06)',
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowSub: {
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
  checkboxSelectedEnemy: {
    borderColor: '#8B0000',
    backgroundColor: '#8B0000',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },

  // Input
  input: {
    borderWidth: 1,
    borderColor: '#D0D5D9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#11181C',
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    textAlignVertical: 'top',
  },

  levelInput: {
    maxWidth: 80,
  },

  // Not ready
  notReadyBanner: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E4E7',
    padding: 14,
  },
  notReadyText: {
    color: '#9BA1A6',
    fontSize: 13,
    textAlign: 'center',
  },

  // JSON output
  jsonScroll: {
    maxHeight: 300,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#687076',
  },
});
