import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  deleteNpc,
  initializeDatabase,
  insertNpc,
  listNpcs,
  updateNpc,
  type Npc,
} from '@/lib/local-db';

function generateUid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type EditState = {
  uid: string | null;
  name: string;
  role: string;
  title: string;
  physicalDescription: string;
  personalityDescription: string;
};

const BLANK: EditState = {
  uid: null, name: '', role: '', title: '',
  physicalDescription: '', personalityDescription: '',
};

function npcToEdit(npc: Npc): EditState {
  return {
    uid: npc.uid,
    name: npc.name,
    role: npc.role,
    title: npc.title ?? '',
    physicalDescription: npc.physicalDescription,
    personalityDescription: npc.personalityDescription,
  };
}

export default function ViewNpcsScreen() {
  const [npcs, setNpcs]               = useState<Npc[]>([]);
  const [error, setError]             = useState<string | null>(null);
  const [editing, setEditing]         = useState<EditState | null>(null);
  const [saving, setSaving]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Npc | null>(null);
  const [expanded, setExpanded]       = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      await initializeDatabase();
      setNpcs(await listNpcs());
    } catch (err) {
      setError('Could not load NPCs.');
      console.error(err);
    }
  }

  async function handleSave() {
    if (!editing || !editing.name.trim() || !editing.role.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const npc: Npc = {
        uid: editing.uid ?? generateUid(),
        name: editing.name.trim(),
        role: editing.role.trim(),
        title: editing.title.trim() || null,
        physicalDescription: editing.physicalDescription.trim(),
        personalityDescription: editing.personalityDescription.trim(),
        createdAt: new Date().toISOString(),
      };
      if (editing.uid) {
        await updateNpc(npc);
      } else {
        await insertNpc(npc);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save NPC.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteNpc(deleteTarget.uid);
      setDeleteTarget(null);
      if (expanded === deleteTarget.uid) setExpanded(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete NPC.');
    }
  }

  const canSave = !!(editing?.name.trim() && editing?.role.trim());

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <ThemedText style={styles.backText}>← Back</ThemedText>
        </Pressable>
        <ThemedText style={styles.title}>NPCs</ThemedText>
        <Pressable style={styles.addBtn} onPress={() => setEditing(BLANK)}>
          <ThemedText style={styles.addBtnText}>+ Add</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        {npcs.length === 0 ? (
          <ThemedText style={styles.emptyText}>No NPCs yet. Add one to start populating your world.</ThemedText>
        ) : (
          npcs.map((npc) => {
            const isExpanded = expanded === npc.uid;
            return (
              <View key={npc.uid} style={styles.card}>
                <Pressable style={styles.cardTop} onPress={() => setExpanded(isExpanded ? null : npc.uid)}>
                  <View style={styles.cardTitles}>
                    <ThemedText style={styles.npcName}>
                      {npc.title ? `${npc.title} ` : ''}{npc.name}
                    </ThemedText>
                    <ThemedText style={styles.npcRole}>{npc.role}</ThemedText>
                  </View>
                  <ThemedText style={styles.expandChevron}>{isExpanded ? '▲' : '▼'}</ThemedText>
                </Pressable>

                {isExpanded && (
                  <View style={styles.cardBody}>
                    {npc.physicalDescription ? (
                      <View style={styles.descBlock}>
                        <ThemedText style={styles.descLabel}>Appearance</ThemedText>
                        <ThemedText style={styles.descText}>{npc.physicalDescription}</ThemedText>
                      </View>
                    ) : null}
                    {npc.personalityDescription ? (
                      <View style={styles.descBlock}>
                        <ThemedText style={styles.descLabel}>Personality</ThemedText>
                        <ThemedText style={styles.descText}>{npc.personalityDescription}</ThemedText>
                      </View>
                    ) : null}
                    <View style={styles.cardActions}>
                      <Pressable style={styles.editBtn} onPress={() => setEditing(npcToEdit(npc))}>
                        <ThemedText style={styles.editBtnText}>Edit</ThemedText>
                      </Pressable>
                      <Pressable style={styles.deleteBtn} onPress={() => setDeleteTarget(npc)}>
                        <ThemedText style={styles.deleteBtnText}>Delete</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Add / Edit modal ── */}
      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <ThemedText style={styles.sheetTitle}>
              {editing?.uid ? 'Edit NPC' : 'New NPC'}
            </ThemedText>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>

              <View style={styles.row}>
                <View style={styles.fieldFlex}>
                  <ThemedText style={styles.label}>Name *</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={editing?.name ?? ''}
                    onChangeText={(v) => setEditing((e) => e ? { ...e, name: v } : e)}
                    placeholder="e.g. Mira Ashvale"
                    placeholderTextColor="#9BA1A6"
                  />
                </View>
                <View style={styles.fieldTitle}>
                  <ThemedText style={styles.label}>Title</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={editing?.title ?? ''}
                    onChangeText={(v) => setEditing((e) => e ? { ...e, title: v } : e)}
                    placeholder="e.g. Lord"
                    placeholderTextColor="#9BA1A6"
                  />
                </View>
              </View>

              <ThemedText style={styles.label}>Role *</ThemedText>
              <TextInput
                style={styles.input}
                value={editing?.role ?? ''}
                onChangeText={(v) => setEditing((e) => e ? { ...e, role: v } : e)}
                placeholder="e.g. Innkeeper, Guard Captain, Fence..."
                placeholderTextColor="#9BA1A6"
              />

              <ThemedText style={styles.label}>Appearance</ThemedText>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={editing?.physicalDescription ?? ''}
                onChangeText={(v) => setEditing((e) => e ? { ...e, physicalDescription: v } : e)}
                placeholder="Describe their physical appearance..."
                placeholderTextColor="#9BA1A6"
                multiline
                textAlignVertical="top"
              />

              <ThemedText style={styles.label}>Personality</ThemedText>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={editing?.personalityDescription ?? ''}
                onChangeText={(v) => setEditing((e) => e ? { ...e, personalityDescription: v } : e)}
                placeholder="Describe their personality and mannerisms..."
                placeholderTextColor="#9BA1A6"
                multiline
                textAlignVertical="top"
              />

            </ScrollView>

            <View style={styles.sheetActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditing(null)}>
                <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
                onPress={() => void handleSave()}
                disabled={!canSave || saving}
              >
                <ThemedText style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Delete confirmation ── */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, styles.sheetNarrow]}>
            <ThemedText style={styles.sheetTitle}>Delete "{deleteTarget?.name}"?</ThemedText>
            <ThemedText style={styles.confirmText}>This cannot be undone.</ThemedText>
            <View style={styles.sheetActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setDeleteTarget(null)}>
                <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
              </Pressable>
              <Pressable style={styles.deleteConfirmBtn} onPress={() => void handleDelete()}>
                <ThemedText style={styles.saveBtnText}>Delete</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#F8F9FA' },
  header:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A5276', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  back:             { paddingVertical: 4, paddingRight: 8 },
  backText:         { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  title:            { flex: 1, fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  addBtn:           { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText:       { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  container:        { padding: 16, gap: 10, paddingBottom: 40 },
  emptyText:        { fontSize: 14, color: '#9BA1A6', fontStyle: 'italic', textAlign: 'center', marginTop: 24 },
  errorText:        { color: '#B00020', fontSize: 13 },

  card:             { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0E4E7', overflow: 'hidden' },
  cardTop:          { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  cardTitles:       { flex: 1, gap: 2 },
  npcName:          { fontSize: 16, fontWeight: '700', color: '#11181C' },
  npcRole:          { fontSize: 12, color: '#687076', fontWeight: '500' },
  expandChevron:    { fontSize: 11, color: '#9BA1A6' },
  cardBody:         { paddingHorizontal: 14, paddingBottom: 14, gap: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  descBlock:        { gap: 4 },
  descLabel:        { fontSize: 11, fontWeight: '700', color: '#1A5276', textTransform: 'uppercase', letterSpacing: 0.5 },
  descText:         { fontSize: 13, color: '#374151', lineHeight: 20 },
  cardActions:      { flexDirection: 'row', gap: 8, marginTop: 4 },
  editBtn:          { backgroundColor: '#1A5276', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  editBtnText:      { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  deleteBtn:        { backgroundColor: '#E45757', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  deleteBtnText:    { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  backdrop:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet:            { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, width: '100%', maxHeight: '90%', gap: 12 },
  sheetNarrow:      { maxHeight: undefined },
  sheetScroll:      { gap: 10 },
  sheetTitle:       { fontSize: 17, fontWeight: '700', color: '#11181C' },
  row:              { flexDirection: 'row', gap: 10 },
  fieldFlex:        { flex: 1, gap: 4 },
  fieldTitle:       { width: 100, gap: 4 },
  label:            { fontSize: 13, fontWeight: '600', color: '#11181C' },
  input:            { borderWidth: 1, borderColor: '#D0D5D9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#11181C', fontSize: 14 },
  inputMulti:       { minHeight: 90 },
  sheetActions:     { flexDirection: 'row', gap: 10 },
  cancelBtn:        { flex: 1, borderWidth: 1, borderColor: '#D0D5D9', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText:    { color: '#9BA1A6', fontSize: 14, fontWeight: '600' },
  saveBtn:          { flex: 1, backgroundColor: '#1A5276', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnDisabled:  { opacity: 0.4 },
  saveBtnText:      { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  deleteConfirmBtn: { flex: 1, backgroundColor: '#E45757', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmText:      { fontSize: 14, color: '#687076', marginBottom: 4 },
});
