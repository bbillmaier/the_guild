import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { defaultKoboldApiBase } from '@/components/LLM/kobold';
import { defaultComfyBase, listComfyModels } from '@/lib/comfy';
import { BUNDLED_WORKFLOWS, loadWorkflows, type WorkflowEntry } from '@/lib/workflows';
import { ThemedText } from '@/components/themed-text';
import {
  addGuildNote,
  deleteAllOpinions,
  deleteGuildNote,
  initializeDatabase,
  listGuildNotes,
  type GuildNote,
} from '@/lib/local-db';
import { API_BASE_URL_KEY, clearSetting, COMFY_BASE_URL_KEY, COMFY_MODEL_KEY, COMFY_WORKFLOW_KEY, FLUX_IMAGE_EDIT_KEY, getSetting, QUICK_MODE_KEY, setSetting } from '@/lib/settings';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<GuildNote[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [comfyUrl, setComfyUrl] = useState('');
  const [comfyModels, setComfyModels] = useState<string[]>([]);
  const [comfyModel, setComfyModel] = useState<string | null>(null);
  const [comfyWorkflow, setComfyWorkflow] = useState<string>(BUNDLED_WORKFLOWS[0].name);
  const [workflows, setWorkflows] = useState<WorkflowEntry[]>(BUNDLED_WORKFLOWS);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [quickMode, setQuickMode] = useState(false);
  const [fluxImageEdit, setFluxImageEdit] = useState(false);
  const [clearingOpinions, setClearingOpinions] = useState(false);

  useEffect(() => {
    void getSetting(API_BASE_URL_KEY).then((saved) => { if (saved) setApiUrl(saved); });
    void getSetting(COMFY_BASE_URL_KEY).then((saved) => { if (saved) setComfyUrl(saved); });
    void getSetting(COMFY_MODEL_KEY).then((saved) => { if (saved) setComfyModel(saved); });
    void getSetting(COMFY_WORKFLOW_KEY).then((saved) => { if (saved) setComfyWorkflow(saved); });
    void getSetting(QUICK_MODE_KEY).then((saved) => { setQuickMode(saved === 'true'); });
    void getSetting(FLUX_IMAGE_EDIT_KEY).then((saved) => { setFluxImageEdit(saved === 'true'); });
    void loadWorkflows().then(setWorkflows);
  }, []);

  async function handleLoadModels() {
    setLoadingModels(true);
    setModelsError(null);
    setComfyModels([]);
    try {
      const models = await listComfyModels();
      setComfyModels(models);
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : 'Failed to load models.');
    } finally {
      setLoadingModels(false);
    }
  }

  async function handleSelectModel(model: string) {
    setComfyModel(model);
    await setSetting(COMFY_MODEL_KEY, model);
  }

  async function handleSelectWorkflow(name: string) {
    setComfyWorkflow(name);
    setComfyModels([]); // model list may differ between workflows
    setComfyModel(null);
    await setSetting(COMFY_WORKFLOW_KEY, name);
    await setSetting(COMFY_MODEL_KEY, '');
  }

  async function handleToggleQuickMode(value: boolean) {
    setQuickMode(value);
    await setSetting(QUICK_MODE_KEY, value ? 'true' : 'false');
  }

  async function handleToggleFluxImageEdit(value: boolean) {
    setFluxImageEdit(value);
    await setSetting(FLUX_IMAGE_EDIT_KEY, value ? 'true' : 'false');
  }

  async function handleSaveApiUrl() {
    const trimmed = apiUrl.trim();
    if (trimmed) {
      await setSetting(API_BASE_URL_KEY, trimmed);
    } else {
      await clearSetting(API_BASE_URL_KEY);
    }
  }

  async function handleSaveComfyUrl() {
    const trimmed = comfyUrl.trim();
    if (trimmed) {
      await setSetting(COMFY_BASE_URL_KEY, trimmed);
    } else {
      await clearSetting(COMFY_BASE_URL_KEY);
    }
  }

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
    if (!trimmedDraft) return;
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

  async function handleClearOpinions() {
    setClearingOpinions(true);
    try {
      await deleteAllOpinions();
    } finally {
      setClearingOpinions(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText style={styles.title}>The Guild</ThemedText>
          <ThemedText style={styles.subtitle}>Admin Panel</ThemedText>
        </View>
        <Pressable style={styles.playButton} onPress={() => router.push('/play' as never)}>
          <ThemedText style={styles.playButtonIcon}>⚔️</ThemedText>
          <ThemedText style={styles.playButtonText}>Play</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Nav grid ── */}
        <View style={styles.navRow}>
          <NavCard label="Characters" sub="Manage your party"        color="#0a7ea4" onPress={() => router.push('/view_char_list')} />
          <NavCard label="Enemies"    sub="Track your foes"          color="#0a7ea4" onPress={() => router.push('/view_enemy_list')} />
        </View>
        <View style={styles.navRow}>
          <NavCard label="Combat"     sub="Run a battle"             color="#8B0000" onPress={() => router.push('/view_combat')} />
          <NavCard label="Items"      sub="Forge equipment"          color="#5C3D8F" onPress={() => router.push('/view_items')} />
        </View>
        <View style={styles.navRow}>
          <NavCard label="Equip"      sub="Assign items"             color="#5C3D8F" onPress={() => router.push('/view_equip_items')} />
          <NavCard label="Quests"     sub="Generate adventures"      color="#2E5A1C" onPress={() => router.push('/view_quests')} />
        </View>
        <View style={styles.navRow}>
          <NavCard label="Roleplay"   sub="Quest scenarios"          color="#7A4F1E" onPress={() => router.push('/view_roleplay_prompts')} />
          <NavCard label="History"    sub="Character memories"       color="#1A5276" onPress={() => router.push('/view_history')} />
        </View>
        <View style={styles.navRow}>
          <NavCard label="Greetings"     sub="Chat opening lines"       color="#6C3483" onPress={() => router.push('/view_greetings')} />
          <NavCard label="Clothing"      sub="Manage mundane items"     color="#7A4F1E" onPress={() => router.push('/view_mundane_items')} />
        </View>
        <View style={styles.navRow}>
          <NavCard label="Relationships" sub="Character bond scores"    color="#1A5276" onPress={() => router.push('/view_relationships')} />
          <NavCard label="Group Scenes" sub="Party chat openers"       color="#3A2D5C" onPress={() => router.push('/view_group_greetings')} />
        </View>
        <View style={styles.navRow}>
          <NavCard label="Guild Events" sub="Random daily moments"     color="#2E5A1C" onPress={() => router.push('/view_guild_events')} />
          <View style={{ flex: 1 }} />
        </View>

        {/* ── LLM Endpoint ── */}
        <View style={styles.card}>
          <SectionHeader label="LLM Endpoint" />
          <TextInput
            placeholder={defaultKoboldApiBase}
            value={apiUrl}
            onChangeText={setApiUrl}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#9BA1A6"
          />
          <Pressable style={styles.saveButton} onPress={() => void handleSaveApiUrl()}>
            <ThemedText style={styles.saveButtonText}>Save Endpoint</ThemedText>
          </Pressable>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <ThemedText style={styles.toggleTitle}>Quick Mode</ThemedText>
              <ThemedText style={styles.toggleSub}>Skip per-room narration, final story only</ThemedText>
            </View>
            <Switch
              value={quickMode}
              onValueChange={(v) => void handleToggleQuickMode(v)}
              trackColor={{ false: '#D0D5D9', true: '#3A2D5C' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <ThemedText style={styles.toggleTitle}>Flux Image Edit</ThemedText>
              <ThemedText style={styles.toggleSub}>Use Flux image editing in chat</ThemedText>
            </View>
            <Switch
              value={fluxImageEdit}
              onValueChange={(v) => void handleToggleFluxImageEdit(v)}
              trackColor={{ false: '#D0D5D9', true: '#3A2D5C' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ── ComfyUI Endpoint ── */}
        <View style={styles.card}>
          <SectionHeader label="ComfyUI Endpoint" />
          <TextInput
            placeholder={defaultComfyBase}
            value={comfyUrl}
            onChangeText={setComfyUrl}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#9BA1A6"
          />
          <Pressable style={styles.saveButton} onPress={() => void handleSaveComfyUrl()}>
            <ThemedText style={styles.saveButtonText}>Save Endpoint</ThemedText>
          </Pressable>

          <ThemedText style={styles.pickerLabel}>Workflow</ThemedText>
          <View style={styles.modelList}>
            {workflows.map((w) => (
              <Pressable
                key={w.name}
                style={[styles.modelChip, comfyWorkflow === w.name && styles.modelChipSelected]}
                onPress={() => void handleSelectWorkflow(w.name)}
              >
                <ThemedText style={[styles.modelChipText, comfyWorkflow === w.name && styles.modelChipTextSelected]}>
                  {w.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputRow}>
            <ThemedText style={styles.pickerLabel}>Model</ThemedText>
            <Pressable
              style={[styles.loadButton, loadingModels && { opacity: 0.6 }]}
              onPress={() => void handleLoadModels()}
              disabled={loadingModels}
            >
              {loadingModels
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <ThemedText style={styles.loadButtonText}>Load Models</ThemedText>
              }
            </Pressable>
          </View>
          {modelsError ? <ThemedText style={styles.errorText}>{modelsError}</ThemedText> : null}
          {comfyModels.length > 0 && (
            <View style={styles.modelList}>
              {comfyModels.map((m) => (
                <Pressable
                  key={m}
                  style={[styles.modelChip, comfyModel === m && styles.modelChipSelected]}
                  onPress={() => void handleSelectModel(m)}
                >
                  <ThemedText
                    style={[styles.modelChipText, comfyModel === m && styles.modelChipTextSelected]}
                    numberOfLines={1}
                  >
                    {m}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}
          {comfyModel && comfyModels.length === 0 && (
            <ThemedText style={styles.modelCurrent}>Model: {comfyModel}</ThemedText>
          )}
        </View>

        {/* ── Data Management ── */}
        <View style={styles.card}>
          <SectionHeader label="Data Management" />
          <View style={styles.dataRow}>
            <View style={styles.dataLabel}>
              <ThemedText style={styles.dataTitle}>Character Opinions</ThemedText>
              <ThemedText style={styles.dataSub}>Delete all generated opinion entries</ThemedText>
            </View>
            <Pressable
              style={[styles.clearButton, clearingOpinions && styles.clearButtonDisabled]}
              onPress={() => void handleClearOpinions()}
              disabled={clearingOpinions}
            >
              {clearingOpinions
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <ThemedText style={styles.clearButtonText}>Clear All</ThemedText>
              }
            </Pressable>
          </View>
        </View>

        {/* ── Notes ── */}
        <View style={styles.card}>
          <SectionHeader label="Notes" />
          <View style={styles.inputRow}>
            <TextInput
              placeholder="Write a note..."
              value={draft}
              onChangeText={setDraft}
              style={[styles.input, styles.inputFlex]}
              placeholderTextColor="#9BA1A6"
            />
            <Pressable style={styles.addButton} onPress={() => void handleAddNote()}>
              <ThemedText style={styles.addButtonText}>Add</ThemedText>
            </Pressable>
          </View>
          {notes.length === 0 ? (
            <ThemedText style={styles.emptyText}>No notes yet.</ThemedText>
          ) : (
            notes.map((note) => (
              <View key={note.id} style={styles.noteRow}>
                <View style={styles.noteTextBlock}>
                  <ThemedText style={styles.noteTitle}>{note.title}</ThemedText>
                  <ThemedText style={styles.noteDate}>
                    {new Date(note.createdAt).toLocaleString()}
                  </ThemedText>
                </View>
                <Pressable style={styles.deleteButton} onPress={() => void handleDeleteNote(note.id)}>
                  <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
                </Pressable>
              </View>
            ))
          )}
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}

      </ScrollView>
    </View>
  );
}

function NavCard({ label, sub, color, onPress }: { label: string; sub: string; color: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.navCard, { backgroundColor: color }]} onPress={onPress}>
      <ThemedText style={styles.navCardTitle}>{label}</ThemedText>
      <ThemedText style={styles.navCardSub}>{sub}</ThemedText>
    </Pressable>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <ThemedText style={styles.sectionTitle}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#3A2D5C',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerText: {
    gap: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7A4F1E',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  playButtonIcon: {
    fontSize: 16,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Scroll content
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },

  // Nav grid
  navRow: {
    flexDirection: 'row',
    gap: 12,
  },
  navCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 3,
  },
  navCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  navCardSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },

  // Section cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E4E7',
    padding: 16,
    gap: 12,
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
    backgroundColor: '#3A2D5C',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#11181C',
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: '#D0D5D9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#11181C',
    backgroundColor: '#FFFFFF',
    fontSize: 14,
  },
  inputFlex: { flex: 1 },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },

  // Buttons
  saveButton: {
    backgroundColor: '#3A2D5C',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#3A2D5C',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Notes
  emptyText: {
    color: '#9BA1A6',
    fontSize: 14,
    fontStyle: 'italic',
  },
  noteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E4E7',
  },
  noteTextBlock: { flex: 1, gap: 2 },
  noteTitle: { fontSize: 14, fontWeight: '600', color: '#11181C' },
  noteDate: { color: '#9BA1A6', fontSize: 12 },
  deleteButton: {
    backgroundColor: '#E45757',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },

  // ComfyUI pickers
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#11181C',
  },
  loadButton: {
    backgroundColor: '#3A2D5C',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  modelList: {
    gap: 6,
  },
  modelChip: {
    borderWidth: 1,
    borderColor: '#D0D5D9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modelChipSelected: {
    backgroundColor: '#3A2D5C',
    borderColor: '#3A2D5C',
  },
  modelChipText: {
    fontSize: 13,
    color: '#11181C',
  },
  modelChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modelCurrent: {
    fontSize: 12,
    color: '#9BA1A6',
    fontStyle: 'italic',
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  toggleLabel: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: 14, fontWeight: '600', color: '#11181C' },
  toggleSub: { fontSize: 12, color: '#9BA1A6' },

  // Error
  errorBanner: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5C2C7',
    backgroundColor: '#FFF0F0',
    padding: 12,
  },
  errorText: { color: '#B00020', fontSize: 14 },

  // Data management
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dataLabel: { flex: 1, gap: 2 },
  dataTitle: { fontSize: 14, fontWeight: '600' },
  dataSub: { fontSize: 12, color: '#9BA1A6' },
  clearButton: { backgroundColor: '#B00020', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, minWidth: 72, alignItems: 'center' },
  clearButtonDisabled: { opacity: 0.5 },
  clearButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
