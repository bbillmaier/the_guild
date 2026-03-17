import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  deleteRoleplayPrompt,
  initializeDatabase,
  insertRoleplayPrompt,
  listRoleplayPrompts,
  updateRoleplayPromptActive,
  updateRoleplayPromptDelta,
  type RoleplayCategory,
  type RoleplayPrompt,
} from '@/lib/local-db';

const CATEGORY_LABELS: Record<RoleplayCategory, string> = {
  general: 'General',
  boss: 'Before Boss',
  failure: 'After Failure',
};

const CATEGORIES: RoleplayCategory[] = ['general', 'boss', 'failure'];

export default function ViewRoleplayPromptsScreen() {
  const [prompts, setPrompts] = useState<RoleplayPrompt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<RoleplayCategory>('general');
  const [newDelta, setNewDelta] = useState<number>(0);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setError(null);
      await initializeDatabase();
      setPrompts(await listRoleplayPrompts());
    } catch (err) {
      setError('Could not load prompts.');
      console.error(err);
    }
  }

  async function handleToggle(uid: string, active: boolean) {
    try {
      await updateRoleplayPromptActive(uid, active);
      setPrompts((prev) => prev.map((p) => (p.uid === uid ? { ...p, active } : p)));
    } catch (err) {
      setError('Could not update prompt.');
      console.error(err);
    }
  }

  async function handleDeltaChange(uid: string, delta: number) {
    try {
      await updateRoleplayPromptDelta(uid, delta);
      setPrompts((prev) => prev.map((p) => (p.uid === uid ? { ...p, relationshipDelta: delta } : p)));
    } catch (err) {
      setError('Could not update delta.');
      console.error(err);
    }
  }

  async function handleDelete(uid: string) {
    try {
      await deleteRoleplayPrompt(uid);
      setPrompts((prev) => prev.filter((p) => p.uid !== uid));
    } catch (err) {
      setError('Could not delete prompt.');
      console.error(err);
    }
  }

  async function handleAdd() {
    const text = newText.trim();
    if (!text) return;
    const uid = `roleplay_custom_${Date.now()}`;
    const prompt: RoleplayPrompt = { uid, text, category: newCategory, active: true, relationshipDelta: newDelta };
    try {
      await insertRoleplayPrompt(prompt);
      setPrompts((prev) => [...prev, prompt]);
      setNewText('');
      setNewDelta(0);
    } catch (err) {
      setError('Could not add prompt.');
      console.error(err);
    }
  }

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    items: prompts.filter((p) => p.category === cat),
  }));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Roleplay Prompts</ThemedText>
      <ThemedText style={styles.hint}>Manage the scenarios used during quests</ThemedText>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {/* ── Add new prompt ── */}
      <ThemedView style={styles.addCard}>
        <SectionHeader label="Add Prompt" />
        <TextInput
          placeholder="Enter scenario text..."
          value={newText}
          onChangeText={setNewText}
          style={styles.input}
          multiline
          numberOfLines={3}
          placeholderTextColor="#9BA1A6"
        />
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.catChip, newCategory === cat && styles.catChipSelected]}
              onPress={() => setNewCategory(cat)}
            >
              <ThemedText style={[styles.catChipText, newCategory === cat && styles.catChipTextSelected]}>
                {CATEGORY_LABELS[cat]}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <View style={styles.deltaRow}>
          <ThemedText style={styles.deltaLabel}>Relationship change:</ThemedText>
          {([-1, 0, 1] as const).map((d) => (
            <Pressable
              key={d}
              style={[styles.deltaChip, newDelta === d && deltaChipSelected(d)]}
              onPress={() => setNewDelta(d)}
            >
              <ThemedText style={[styles.deltaChipText, newDelta === d && styles.deltaChipTextSelected]}>
                {d === 1 ? '+1' : d === -1 ? '−1' : '0'}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[styles.addButton, !newText.trim() && styles.addButtonDisabled]}
          onPress={() => void handleAdd()}
          disabled={!newText.trim()}
        >
          <ThemedText style={styles.addButtonText}>Add Prompt</ThemedText>
        </Pressable>
      </ThemedView>

      {/* ── Grouped prompts ── */}
      {grouped.map(({ category, items }) => (
        <ThemedView key={category} style={styles.groupCard}>
          <SectionHeader label={CATEGORY_LABELS[category]} />
          {items.length === 0 ? (
            <ThemedText style={styles.emptyText}>No prompts in this category.</ThemedText>
          ) : (
            items.map((prompt) => (
              <View key={prompt.uid} style={[styles.promptRow, !prompt.active && styles.promptRowInactive]}>
                <ThemedText style={[styles.promptText, !prompt.active && styles.promptTextInactive]}>
                  {prompt.text}
                </ThemedText>
                <View style={styles.promptActions}>
                  <View style={styles.deltaRow}>
                    {([-1, 0, 1] as const).map((d) => (
                      <Pressable
                        key={d}
                        style={[styles.deltaChip, prompt.relationshipDelta === d && deltaChipSelected(d)]}
                        onPress={() => void handleDeltaChange(prompt.uid, d)}
                      >
                        <ThemedText style={[styles.deltaChipText, prompt.relationshipDelta === d && styles.deltaChipTextSelected]}>
                          {d === 1 ? '+1' : d === -1 ? '−1' : '0'}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    style={[styles.toggleButton, prompt.active ? styles.toggleOn : styles.toggleOff]}
                    onPress={() => void handleToggle(prompt.uid, !prompt.active)}
                  >
                    <ThemedText style={styles.toggleText}>{prompt.active ? 'Active' : 'Inactive'}</ThemedText>
                  </Pressable>
                  <Pressable style={styles.deleteButton} onPress={() => void handleDelete(prompt.uid)}>
                    <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ThemedView>
      ))}
    </ScrollView>
  );
}

const DELTA_CHIP_BG: Record<number, string> = { [-1]: '#B00020', 0: '#687076', 1: '#2E7D32' };

function deltaChipSelected(delta: number) {
  return { borderColor: DELTA_CHIP_BG[delta] ?? '#687076', backgroundColor: DELTA_CHIP_BG[delta] ?? '#687076' };
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{label}</ThemedText>
    </View>
  );
}

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
  emptyText: {
    color: '#9BA1A6',
    fontSize: 13,
    fontStyle: 'italic',
  },
  addCard: {
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  groupCard: {
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
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  catChip: {
    borderWidth: 1,
    borderColor: '#D0D5D9',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  catChipSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: '#0a7ea4',
  },
  catChipText: {
    fontSize: 13,
    color: '#687076',
  },
  catChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#2E5A1C',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#D0D5D9',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  promptRow: {
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  promptRowInactive: {
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  promptText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#11181C',
  },
  promptTextInactive: {
    color: '#9BA1A6',
  },
  promptActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  toggleButton: {
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  toggleOn: {
    backgroundColor: '#2E7D32',
  },
  toggleOff: {
    backgroundColor: '#9BA1A6',
  },
  toggleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#B00020',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deltaLabel: {
    fontSize: 12,
    color: '#687076',
    marginRight: 2,
  },
  deltaChip: {
    borderWidth: 1,
    borderColor: '#D0D5D9',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
    minWidth: 32,
    alignItems: 'center',
  },
  deltaChipText: {
    fontSize: 12,
    color: '#687076',
    fontWeight: '600',
  },
  deltaChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
