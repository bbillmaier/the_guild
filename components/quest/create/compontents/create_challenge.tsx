import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { initializeDatabase, listGuildCharacters, type GuildCharacter } from '@/lib/local-db';
import { xpRewardForEnemyLevel } from '@/lib/xp';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

export type ChallengeResult = {
  stat: StatKey;
  characterName: string;
  roll: number;
  modifier: number;
  total: number;
  dc: number;
  success: boolean;
  description: string;
  xp: number;
};

export type ChallengeProps = {
  characterIds: string[];
  dc: number;
  description: string;
  level?: number;
  onResult?: (result: ChallengeResult) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const allStats: StatKey[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
];

const statLabels: Record<StatKey, string> = {
  strength:     'STR',
  dexterity:    'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom:       'WIS',
  charisma:     'CHA',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Challenge({ characterIds, dc, description, level = 1, onResult }: ChallengeProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAttempt() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      await initializeDatabase();
      const allCharacters = await listGuildCharacters();
      const characters = allCharacters.filter((c) => characterIds.includes(c.uid));

      if (characters.length === 0) {
        setError('No characters found for this challenge.');
        setLoading(false);
        return;
      }

      const outcome = resolveChallenge(characters, dc, description, level);
      setResult(outcome);
      onResult?.(outcome);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during challenge.';
      setError(message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.descriptionText}>
        {description}
      </ThemedText>
      <ThemedText style={styles.dcText}>DC {dc}</ThemedText>

      {!result && !loading && (
        <Pressable style={styles.button} onPress={() => void handleAttempt()}>
          <ThemedText style={styles.buttonText}>Attempt Challenge</ThemedText>
        </Pressable>
      )}

      {loading && (
        <ThemedText style={styles.loading}>Resolving challenge...</ThemedText>
      )}

      {error && (
        <ThemedText style={styles.error}>{error}</ThemedText>
      )}

      {result && (
        <ThemedView style={[styles.resultCard, result.success ? styles.resultSuccess : styles.resultFailure]}>
          <ThemedText type="defaultSemiBold" style={styles.resultOutcome}>
            {result.success ? 'Success' : 'Failure'}
          </ThemedText>
          <ThemedText style={styles.resultDetail}>
            {result.characterName} attempted a {statLabels[result.stat]} check
          </ThemedText>
          <ThemedText style={styles.resultDetail}>
            Roll: {result.roll} + {result.modifier} ({statLabels[result.stat]} mod) = {result.total} vs DC {result.dc}
          </ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

// ─── Logic ────────────────────────────────────────────────────────────────────

export function resolveChallenge(
  characters: GuildCharacter[],
  dc: number,
  description: string,
  level = 1
): ChallengeResult {
  const stat = pickRandom(allStats);
  const champion = pickChampion(characters, stat);
  const statValue = champion[stat];
  const modifier = statMod(statValue);
  const roll = rollD20();
  const total = roll + modifier;

  return {
    stat,
    characterName: champion.characterName,
    roll,
    modifier,
    total,
    dc,
    success: total >= dc,
    description,
    xp: xpRewardForEnemyLevel(level),
  };
}

function pickChampion(characters: GuildCharacter[], stat: StatKey): GuildCharacter {
  return characters.reduce((best, current) =>
    current[stat] > best[stat] ? current : best
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

function pickRandom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 12,
  },
  descriptionText: {
    fontSize: 14,
  },
  dcText: {
    fontSize: 12,
    color: '#687076',
  },
  button: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
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
  resultCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  resultSuccess: {
    borderColor: '#2E7D32',
    backgroundColor: 'rgba(46, 125, 50, 0.06)',
  },
  resultFailure: {
    borderColor: '#B00020',
    backgroundColor: 'rgba(176, 0, 32, 0.06)',
  },
  resultOutcome: {
    fontSize: 15,
  },
  resultDetail: {
    fontSize: 13,
    color: '#687076',
  },
});
