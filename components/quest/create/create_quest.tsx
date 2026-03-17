import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { generateQuest } from '@/lib/generate-quest';
import { type GuildQuest, type QuestDifficulty } from '@/lib/local-db';

// ─── Re-export content types consumed by run_quest ────────────────────────────

import { type CharacterGender } from '@/lib/local-db';

export type MinionStats = {
  uid: string;
  characterName: string;
  gender: CharacterGender;
  className: string;
  race: string;
  hp: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  physDesc: string[];
  metaDesc: string[];
  baseDescription: string;
  level: number;
};

export type CombatContent   = { type: 'combat';    enemies: MinionStats[] };
export type ChallengeContent = { type: 'challenge'; dc: number; stat: string; description: string };
export type BossContent      = { type: 'boss';      boss: MinionStats; minions: MinionStats[] };
export type RoomContent      = CombatContent | ChallengeContent | BossContent;

// ─── Props ────────────────────────────────────────────────────────────────────

export type CreateQuestProps = {
  onComplete?: (quest: GuildQuest) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTIES: QuestDifficulty[] = ['easy', 'medium', 'hard', 'deadly'];

const difficultyColor: Record<QuestDifficulty, string> = {
  easy:   '#2E7D32',
  medium: '#F57C00',
  hard:   '#B00020',
  deadly: '#4A0072',
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateQuest({ onComplete }: CreateQuestProps) {
  const [difficulty, setDifficulty] = useState<QuestDifficulty>('medium');
  const [levelText, setLevelText]   = useState('1');
  const [generating, setGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    const level = Math.max(1, parseInt(levelText, 10) || 1);
    setGenerating(true);
    setError(null);

    try {
      const quest = await generateQuest(level, difficulty, setGeneratingStep);
      onComplete?.(quest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quest generation failed.');
    } finally {
      setGenerating(false);
      setGeneratingStep('');
    }
  }

  return (
    <ThemedView style={styles.container}>
      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {/* ── Difficulty ── */}
      <SectionHeader label="Difficulty" />
      <View style={styles.chipRow}>
        {DIFFICULTIES.map((d) => {
          const selected = d === difficulty;
          const color = difficultyColor[d];
          return (
            <Pressable
              key={d}
              style={[styles.chip, selected && { borderColor: color, backgroundColor: `${color}18` }]}
              onPress={() => setDifficulty(d)}
            >
              <ThemedText style={[styles.chipText, selected && { color, fontWeight: '700' }]}>
                {capitalize(d)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* ── Enemy Level ── */}
      <SectionHeader label="Enemy Level" />
      <TextInput
        value={levelText}
        onChangeText={setLevelText}
        keyboardType="numeric"
        style={styles.input}
        placeholder="1"
        placeholderTextColor="#9BA1A6"
      />

      {/* ── Generate ── */}
      <Pressable
        style={[styles.generateButton, generating && styles.generateButtonDisabled]}
        onPress={() => void handleGenerate()}
        disabled={generating}
      >
        <ThemedText style={styles.generateButtonText}>
          {generating ? generatingStep : 'Generate Quest'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        {label}
      </ThemedText>
    </View>
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
  errorText: {
    color: '#B00020',
    fontSize: 13,
    backgroundColor: 'rgba(176, 0, 32, 0.06)',
    borderRadius: 8,
    padding: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  sectionAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#0a7ea4',
  },
  sectionTitle: {
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#D0D5D9',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  chipText: {
    fontSize: 13,
    color: '#687076',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D0D5D9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#11181C',
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    width: 100,
  },
  generateButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  generateButtonDisabled: {
    backgroundColor: '#D0D5D9',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
