import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { NATURAL_BIOMES } from '@/components/quest/biomes';
import {
  deleteZone,
  initializeDatabase,
  insertZone,
  listZones,
  updateZone,
  type Zone,
} from '@/lib/local-db';

function generateUid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const BIOME_NAMES = NATURAL_BIOMES.map((b) => b.name);

type EditState = { uid: string | null; name: string; biome: string; description: string };
const BLANK: EditState = { uid: null, name: '', biome: BIOME_NAMES[0], description: '' };

export default function ViewZonesScreen() {
  const [zones, setZones]       = useState<Zone[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const [editing, setEditing]   = useState<EditState | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Zone | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      await initializeDatabase();
      setZones(await listZones());
    } catch (err) {
      setError('Could not load zones.');
      console.error(err);
    }
  }

  async function handleSave() {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editing.uid) {
        await updateZone(editing.uid, editing.name.trim(), editing.biome, editing.description.trim());
      } else {
        await insertZone({
          uid: generateUid(),
          name: editing.name.trim(),
          biome: editing.biome,
          description: editing.description.trim(),
          createdAt: new Date().toISOString(),
        });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save zone.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteZone(deleteTarget.uid);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete zone.');
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <ThemedText style={styles.backText}>← Back</ThemedText>
        </Pressable>
        <ThemedText style={styles.title}>Zones</ThemedText>
        <Pressable style={styles.addBtn} onPress={() => setEditing(BLANK)}>
          <ThemedText style={styles.addBtnText}>+ Add</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        {zones.length === 0 ? (
          <ThemedText style={styles.emptyText}>
            No zones yet. Create one to start building your world.
          </ThemedText>
        ) : (
          zones.map((zone) => (
            <View key={zone.uid} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.biomePill}>
                  <ThemedText style={styles.biomePillText}>{zone.biome}</ThemedText>
                </View>
                <ThemedText style={styles.zoneName} numberOfLines={1}>{zone.name}</ThemedText>
              </View>
              {zone.description ? (
                <ThemedText style={styles.zoneDesc}>{zone.description}</ThemedText>
              ) : null}
              <View style={styles.cardActions}>
                <Pressable style={styles.editBtn} onPress={() => setEditing({ uid: zone.uid, name: zone.name, biome: zone.biome, description: zone.description })}>
                  <ThemedText style={styles.editBtnText}>Edit</ThemedText>
                </Pressable>
                <Pressable style={styles.deleteBtn} onPress={() => setDeleteTarget(zone)}>
                  <ThemedText style={styles.deleteBtnText}>Delete</ThemedText>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Add / Edit modal ── */}
      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <ThemedText style={styles.sheetTitle}>
              {editing?.uid ? 'Edit Zone' : 'New Zone'}
            </ThemedText>

            <ThemedText style={styles.label}>Name</ThemedText>
            <TextInput
              style={styles.input}
              value={editing?.name ?? ''}
              onChangeText={(v) => setEditing((e) => e ? { ...e, name: v } : e)}
              placeholder="e.g. The Thornwood"
              placeholderTextColor="#9BA1A6"
            />

            <ThemedText style={styles.label}>Biome</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.biomeRow}>
              {BIOME_NAMES.map((b) => (
                <Pressable
                  key={b}
                  style={[styles.biomeChip, editing?.biome === b && styles.biomeChipSelected]}
                  onPress={() => setEditing((e) => e ? { ...e, biome: b } : e)}
                >
                  <ThemedText style={[styles.biomeChipText, editing?.biome === b && styles.biomeChipTextSelected]}>
                    {b}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={editing?.description ?? ''}
              onChangeText={(v) => setEditing((e) => e ? { ...e, description: v } : e)}
              placeholder="Describe this region of the world..."
              placeholderTextColor="#9BA1A6"
              multiline
              textAlignVertical="top"
            />

            <View style={styles.sheetActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditing(null)}>
                <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, (!editing?.name.trim() || saving) && styles.saveBtnDisabled]}
                onPress={() => void handleSave()}
                disabled={!editing?.name.trim() || saving}
              >
                <ThemedText style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Delete confirmation ── */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <Pressable style={styles.backdrop} onPress={() => setDeleteTarget(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
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
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#F8F9FA' },
  header:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2E5A1C', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  back:             { paddingVertical: 4, paddingRight: 8 },
  backText:         { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  title:            { flex: 1, fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  addBtn:           { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText:       { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  container:        { padding: 16, gap: 12, paddingBottom: 40 },
  emptyText:        { fontSize: 14, color: '#9BA1A6', fontStyle: 'italic', textAlign: 'center', marginTop: 24 },
  errorText:        { color: '#B00020', fontSize: 13 },

  card:             { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0E4E7', padding: 14, gap: 8 },
  cardTop:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
  biomePill:        { backgroundColor: '#2E5A1C', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  biomePillText:    { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  zoneName:         { fontSize: 16, fontWeight: '700', color: '#11181C', flex: 1 },
  zoneDesc:         { fontSize: 13, color: '#687076', lineHeight: 20 },
  cardActions:      { flexDirection: 'row', gap: 8, marginTop: 2 },
  editBtn:          { backgroundColor: '#3A2D5C', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  editBtnText:      { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  deleteBtn:        { backgroundColor: '#E45757', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  deleteBtnText:    { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  backdrop:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet:            { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, width: '100%', gap: 12 },
  sheetTitle:       { fontSize: 17, fontWeight: '700', color: '#11181C' },
  label:            { fontSize: 13, fontWeight: '600', color: '#11181C', marginBottom: -6 },
  input:            { borderWidth: 1, borderColor: '#D0D5D9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#11181C', fontSize: 14 },
  inputMulti:       { minHeight: 80 },
  biomeRow:         { gap: 8, paddingVertical: 2 },
  biomeChip:        { borderWidth: 1, borderColor: '#D0D5D9', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12 },
  biomeChipSelected:{ backgroundColor: '#2E5A1C', borderColor: '#2E5A1C' },
  biomeChipText:    { fontSize: 13, color: '#11181C' },
  biomeChipTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  sheetActions:     { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:        { flex: 1, borderWidth: 1, borderColor: '#D0D5D9', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText:    { color: '#9BA1A6', fontSize: 14, fontWeight: '600' },
  saveBtn:          { flex: 1, backgroundColor: '#2E5A1C', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnDisabled:  { opacity: 0.4 },
  saveBtnText:      { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  deleteConfirmBtn: { flex: 1, backgroundColor: '#E45757', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmText:      { fontSize: 14, color: '#687076' },
});
