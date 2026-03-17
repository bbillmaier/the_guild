import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  initializeDatabase,
  listGuildCharacters,
  updateGuildCharacterXp,
} from '@/lib/local-db';
import { calculateMaxHp, levelFromXp, MAX_LEVEL, xpThresholdForLevel } from '@/lib/xp';

// ─── Types ────────────────────────────────────────────────────────────────────

type XpAwardEntry = {
  uid: string;
  characterName: string;
  xpGained: number;
  oldLevel: number;
  newLevel: number;
  newExperience: number;
  leveledUp: boolean;
};

export type AwardXpProps = {
  characterIds: string[];
  xpPerCharacter: number;
  onComplete?: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AwardXp({ characterIds, xpPerCharacter, onComplete }: AwardXpProps) {
  const [entries, setEntries] = useState<XpAwardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void award();
  }, []);

  async function award() {
    try {
      await initializeDatabase();
      const allCharacters = await listGuildCharacters();
      const characters = allCharacters.filter((c) => characterIds.includes(c.uid));

      const results: XpAwardEntry[] = [];

      for (const character of characters) {
        const oldLevel = character.level;
        const newExperience = character.experience + xpPerCharacter;
        const newLevel = Math.min(levelFromXp(newExperience), MAX_LEVEL);
        const leveledUp = newLevel > oldLevel;
        const newHp = leveledUp
          ? calculateMaxHp(character.className, character.constitution, newLevel)
          : character.hp;

        await updateGuildCharacterXp(character.uid, newExperience, newLevel, newHp);

        results.push({
          uid: character.uid,
          characterName: character.characterName,
          xpGained: xpPerCharacter,
          oldLevel,
          newLevel,
          newExperience,
          leveledUp,
        });
      }

      setEntries(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to award XP.');
    } finally {
      setLoading(false);
    }
  }

  if (dismissed) return null;

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.loading}>Awarding experience...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.error}>{error}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.header}>
        Experience Gained
      </ThemedText>

      {entries.map((entry) => (
        <ThemedView key={entry.uid} style={styles.row}>
          <ThemedView style={styles.rowLeft}>
            <ThemedText style={styles.name}>{entry.characterName}</ThemedText>
            <ThemedText style={styles.xpDetail}>
              {entry.newExperience} / {xpThresholdForLevel(Math.min(entry.newLevel + 1, MAX_LEVEL))} XP
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.rowRight}>
            <ThemedText style={styles.xpGained}>+{entry.xpGained} XP</ThemedText>
            {entry.leveledUp && (
              <ThemedText style={styles.levelUp}>
                Level Up! {entry.oldLevel} → {entry.newLevel}
              </ThemedText>
            )}
          </ThemedView>
        </ThemedView>
      ))}

      <Pressable
        style={styles.button}
        onPress={() => {
          setDismissed(true);
          onComplete?.();
        }}
      >
        <ThemedText style={styles.buttonText}>Continue</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  header: {
    fontSize: 15,
    color: '#0a7ea4',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E4E7',
  },
  rowLeft: {
    gap: 2,
    flex: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  name: {
    fontWeight: '600',
    fontSize: 14,
  },
  xpDetail: {
    fontSize: 11,
    color: '#9BA1A6',
  },
  xpGained: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  levelUp: {
    fontSize: 12,
    color: '#0a7ea4',
    fontWeight: '700',
  },
  loading: {
    color: '#687076',
    fontStyle: 'italic',
    fontSize: 13,
  },
  error: {
    color: '#B00020',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
