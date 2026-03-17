import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EquipItem } from '@/components/items/equip_item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { initializeDatabase, listGuildCharacters, type GuildCharacter } from '@/lib/local-db';

export default function ViewEquipItemsScreen() {
  const [characters, setCharacters] = useState<GuildCharacter[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      await initializeDatabase();
      setCharacters(await listGuildCharacters());
    } catch (err) {
      setError('Could not load characters.');
      console.error(err);
    }
  }

  const selectedCharacter = characters.find((c) => c.uid === selectedUid) ?? null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Equip Items</ThemedText>
      <ThemedText style={styles.hint}>/view_equip_items</ThemedText>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {/* ── Character Picker ── */}
      <ThemedView style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Select Character
          </ThemedText>
        </View>

        {characters.length === 0 ? (
          <ThemedText style={styles.emptyText}>No characters found.</ThemedText>
        ) : (
          characters.map((character) => {
            const selected = character.uid === selectedUid;
            return (
              <Pressable
                key={character.uid}
                style={[styles.characterRow, selected && styles.characterRowSelected]}
                onPress={() => setSelectedUid(selected ? null : character.uid)}
              >
                <View style={styles.characterInfo}>
                  <ThemedText type="defaultSemiBold">{character.characterName}</ThemedText>
                  <ThemedText style={styles.characterMeta}>
                    Level {character.level} {character.race} {character.className} · HP {character.hp}
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

      {/* ── Equipment Manager ── */}
      {selectedCharacter ? (
        <EquipItem
          character={selectedCharacter}
          onUpdate={() => void load()}
        />
      ) : (
        <ThemedView style={styles.promptCard}>
          <ThemedText style={styles.promptText}>
            Select a character above to manage their equipment.
          </ThemedText>
        </ThemedView>
      )}
    </ScrollView>
  );
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
  emptyText: {
    color: '#9BA1A6',
    fontSize: 14,
    fontStyle: 'italic',
  },
  characterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E4E7',
  },
  characterRowSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: 'rgba(10, 126, 164, 0.06)',
  },
  characterInfo: {
    flex: 1,
    gap: 2,
  },
  characterMeta: {
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
  promptCard: {
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  promptText: {
    color: '#9BA1A6',
    fontSize: 13,
    textAlign: 'center',
  },
});
