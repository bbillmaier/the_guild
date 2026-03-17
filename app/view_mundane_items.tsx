import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  deleteMundaneItemType,
  initializeDatabase,
  insertMundaneItemType,
  listMundaneItemTypes,
  seedStarterMundaneItems,
  updateMundaneItemType,
  type MundaneItemType,
} from '@/lib/local-db';

const CLASSES = [
  'barbarian', 'bard', 'cleric', 'druid', 'fighter',
  'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard',
];

const SLOTS = [
  'weapon', 'offhand', 'head', 'chest', 'hands',
  'feet', 'ring', 'neck', 'waist', 'back', 'wrist',
];

type EditState = {
  id: number;
  name: string;
  slot: string;
  className: string | null;
  desc: string;
  saving: boolean;
};

export default function ViewMundaneItemsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MundaneItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterClass, setFilterClass] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [listOpen, setListOpen] = useState(false);

  // ── Add form state ──────────────────────────────────────────────────────────
  const [formName, setFormName] = useState('');
  const [formSlot, setFormSlot] = useState<string | null>(null);
  const [formClass, setFormClass] = useState<string | null>(null);
  const [formDesc, setFormDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { void load(true); }, []);

  async function load(autoSeedIfEmpty = false) {
    setLoading(true);
    try {
      await initializeDatabase();
      let result = await listMundaneItemTypes();
      if (result.length === 0 && autoSeedIfEmpty) {
        await seedStarterMundaneItems();
        result = await listMundaneItemTypes();
      }
      setItems(result);
    } catch (err) {
      setError('Could not load items.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: MundaneItemType) {
    setEditing({ id: item.id, name: item.name, slot: item.slot, className: item.className, desc: item.description, saving: false });
  }

  function cancelEdit() { setEditing(null); }

  async function handleSaveEdit() {
    if (!editing || !editing.name.trim()) return;
    setEditing((e) => e ? { ...e, saving: true } : e);
    try {
      await updateMundaneItemType(editing.id, editing.name.trim(), editing.slot, editing.desc.trim(), editing.className);
      setEditing(null);
      await load();
    } catch (err) {
      setError('Could not save changes.');
      console.error(err);
      setEditing((e) => e ? { ...e, saving: false } : e);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMundaneItemType(id);
      await load();
    } catch (err) {
      setError('Could not delete item.');
      console.error(err);
    }
  }

  async function handleAdd() {
    if (!formName.trim() || !formSlot) return;
    setSaving(true);
    try {
      await insertMundaneItemType(formName.trim(), formSlot, formDesc.trim(), formClass);
      setFormName('');
      setFormDesc('');
      setFormSlot(null);
      setFormClass(null);
      await load();
    } catch (err) {
      setError('Could not add item.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const displayed = filterClass
    ? items.filter((i) => i.className === filterClass || i.className === null)
    : items;

  const bySlot = SLOTS.reduce<Record<string, MundaneItemType[]>>((acc, slot) => {
    acc[slot] = displayed.filter((i) => i.slot === slot);
    return acc;
  }, {});

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Clothing &amp; Gear</ThemedText>
        <ThemedText style={styles.sub}>Mundane item types ({items.length})</ThemedText>
      </View>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Add item form ── */}
        <ThemedView style={styles.formSection}>
          <ThemedText style={styles.formTitle}>Add Item Type</ThemedText>

          <TextInput
            placeholder="Item name *"
            value={formName}
            onChangeText={setFormName}
            style={styles.input}
            placeholderTextColor="#9BA1A6"
          />

          <ThemedText style={styles.fieldLabel}>Slot *</ThemedText>
          <View style={styles.chipWrap}>
            {SLOTS.map((s) => (
              <Chip key={s} label={cap(s)} active={formSlot === s} onPress={() => setFormSlot(s)} small />
            ))}
          </View>

          <ThemedText style={styles.fieldLabel}>Class (leave blank for all)</ThemedText>
          <View style={styles.chipWrap}>
            <Chip label="Any" active={formClass === null} onPress={() => setFormClass(null)} small />
            {CLASSES.map((c) => (
              <Chip key={c} label={cap(c)} active={formClass === c} onPress={() => setFormClass(c)} small />
            ))}
          </View>

          <TextInput
            placeholder="Description"
            value={formDesc}
            onChangeText={setFormDesc}
            style={[styles.input, styles.inputMulti]}
            multiline
            numberOfLines={3}
            placeholderTextColor="#9BA1A6"
          />

          <Pressable
            style={[styles.addBtn, (!formName.trim() || !formSlot || saving) && styles.addBtnDisabled]}
            onPress={() => void handleAdd()}
            disabled={!formName.trim() || !formSlot || saving}
          >
            <ThemedText style={styles.addBtnText}>{saving ? 'Saving…' : 'Add Item'}</ThemedText>
          </Pressable>
        </ThemedView>

        {/* ── Collapsible item list ── */}
        <Pressable style={styles.listToggle} onPress={() => setListOpen((v) => !v)}>
          <View style={styles.listToggleAccent} />
          <ThemedText style={styles.listToggleText}>
            {listOpen ? 'Hide Item List' : `Show Item List (${items.length})`}
          </ThemedText>
          <ThemedText style={styles.listToggleChevron}>{listOpen ? '▲' : '▼'}</ThemedText>
        </Pressable>

        {listOpen && (
          <>
            {/* ── Class filter chips ── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <View style={styles.chipRow}>
                <Chip label="All" active={filterClass === null} onPress={() => setFilterClass(null)} />
                {CLASSES.map((c) => (
                  <Chip key={c} label={cap(c)} active={filterClass === c} onPress={() => setFilterClass(c)} />
                ))}
              </View>
            </ScrollView>

            {/* ── Loading / empty state ── */}
            {loading ? (
              <ActivityIndicator size="large" color="#7A4F1E" style={{ marginVertical: 24 }} />
            ) : displayed.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <ThemedText style={styles.emptyText}>
                  {items.length === 0 ? 'No items found.' : 'No items match this filter.'}
                </ThemedText>
              </ThemedView>
            ) : null}

            {/* ── Item list grouped by slot ── */}
            {!loading && SLOTS.map((slot) => {
              const slotItems = bySlot[slot];
              if (slotItems.length === 0) return null;
              return (
                <ThemedView key={slot} style={styles.slotSection}>
                  <View style={styles.slotHeader}>
                    <View style={styles.slotAccent} />
                    <ThemedText style={styles.slotTitle}>{cap(slot)}</ThemedText>
                    <ThemedText style={styles.slotCount}>{slotItems.length}</ThemedText>
                  </View>

                  {slotItems.map((item) => {
                    const isEditing = editing?.id === item.id;

                    if (isEditing && editing) {
                      return (
                        <View key={item.id} style={styles.editBlock}>
                          <TextInput
                            value={editing.name}
                            onChangeText={(v) => setEditing((e) => e ? { ...e, name: v } : e)}
                            style={styles.input}
                            placeholderTextColor="#9BA1A6"
                            placeholder="Item name *"
                          />

                          <ThemedText style={styles.fieldLabel}>Slot *</ThemedText>
                          <View style={styles.chipWrap}>
                            {SLOTS.map((s) => (
                              <Chip key={s} label={cap(s)} small
                                active={editing.slot === s}
                                onPress={() => setEditing((e) => e ? { ...e, slot: s } : e)}
                              />
                            ))}
                          </View>

                          <ThemedText style={styles.fieldLabel}>Class</ThemedText>
                          <View style={styles.chipWrap}>
                            <Chip label="Any" small
                              active={editing.className === null}
                              onPress={() => setEditing((e) => e ? { ...e, className: null } : e)}
                            />
                            {CLASSES.map((c) => (
                              <Chip key={c} label={cap(c)} small
                                active={editing.className === c}
                                onPress={() => setEditing((e) => e ? { ...e, className: c } : e)}
                              />
                            ))}
                          </View>

                          <TextInput
                            value={editing.desc}
                            onChangeText={(v) => setEditing((e) => e ? { ...e, desc: v } : e)}
                            style={[styles.input, styles.inputMulti]}
                            multiline
                            numberOfLines={3}
                            placeholder="Description"
                            placeholderTextColor="#9BA1A6"
                          />

                          <View style={styles.editActions}>
                            <Pressable style={styles.cancelBtn} onPress={cancelEdit}>
                              <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
                            </Pressable>
                            <Pressable
                              style={[styles.saveBtn, (!editing.name.trim() || editing.saving) && styles.saveBtnDisabled]}
                              onPress={() => void handleSaveEdit()}
                              disabled={!editing.name.trim() || editing.saving}
                            >
                              <ThemedText style={styles.saveBtnText}>{editing.saving ? 'Saving…' : 'Save'}</ThemedText>
                            </Pressable>
                          </View>
                        </View>
                      );
                    }

                    return (
                      <View key={item.id} style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <View style={styles.itemNameRow}>
                            <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                            {item.isStarter ? (
                              <View style={styles.starterBadge}>
                                <ThemedText style={styles.starterBadgeText}>starter</ThemedText>
                              </View>
                            ) : null}
                            {item.className ? (
                              <View style={styles.classBadge}>
                                <ThemedText style={styles.classBadgeText}>{item.className}</ThemedText>
                              </View>
                            ) : null}
                          </View>
                          {item.description ? (
                            <ThemedText style={styles.itemDesc}>{item.description}</ThemedText>
                          ) : null}
                        </View>
                        {!item.isStarter ? (
                          <View style={styles.rowActions}>
                            <Pressable style={styles.editBtn} onPress={() => startEdit(item)}>
                              <ThemedText style={styles.editBtnText}>Edit</ThemedText>
                            </Pressable>
                            <Pressable style={styles.deleteBtn} onPress={() => void handleDelete(item.id)}>
                              <ThemedText style={styles.deleteBtnText}>Delete</ThemedText>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </ThemedView>
              );
            })}
          </>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Chip component ────────────────────────────────────────────────────────────

function Chip({ label, active, onPress, small }: {
  label: string; active: boolean; onPress: () => void; small?: boolean;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive, small && styles.chipSmall]}
      onPress={onPress}
    >
      <ThemedText style={[styles.chipText, active && styles.chipTextActive, small && styles.chipTextSmall]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F5F0',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D8CC',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C1A0E',
  },
  sub: {
    fontSize: 13,
    color: '#9BA1A6',
    marginTop: 2,
  },
  errorText: {
    color: '#B00020',
    fontSize: 13,
    margin: 16,
  },
  container: {
    padding: 16,
    gap: 14,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8B9A5',
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: '#7A4F1E',
    borderColor: '#7A4F1E',
  },
  chipSmall: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  chipText: {
    fontSize: 13,
    color: '#5C4A32',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chipTextSmall: {
    fontSize: 12,
  },
  slotSection: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0D8CC',
    padding: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  slotAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#7A4F1E',
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C1A0E',
    flex: 1,
  },
  slotCount: {
    fontSize: 12,
    color: '#9BA1A6',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0EAE0',
    gap: 8,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C1A0E',
  },
  itemDesc: {
    fontSize: 12,
    color: '#7A6A58',
    lineHeight: 17,
  },
  starterBadge: {
    backgroundColor: '#E8F0E8',
    borderRadius: 4,
    paddingVertical: 1,
    paddingHorizontal: 6,
  },
  starterBadgeText: {
    fontSize: 10,
    color: '#2E5A1C',
    fontWeight: '600',
  },
  classBadge: {
    backgroundColor: '#EDE8F5',
    borderRadius: 4,
    paddingVertical: 1,
    paddingHorizontal: 6,
  },
  classBadgeText: {
    fontSize: 10,
    color: '#5C3D8F',
    fontWeight: '600',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'center',
  },
  editBtn: {
    backgroundColor: '#3A5C8F',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#B00020',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  editBlock: {
    borderTopWidth: 1,
    borderTopColor: '#F0EAE0',
    paddingTop: 10,
    gap: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#C8B9A5',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    color: '#5C4A32',
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#2E5A1C',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  listToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C8B9A5',
    backgroundColor: '#FFFFFF',
  },
  listToggleAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#7A4F1E',
  },
  listToggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2C1A0E',
  },
  listToggleChevron: {
    fontSize: 12,
    color: '#7A6A58',
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0D8CC',
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    fontSize: 14,
    color: '#9BA1A6',
  },
  formSection: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0D8CC',
    padding: 14,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C1A0E',
    marginBottom: 2,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#7A6A58',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#C8B9A5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2C1A0E',
    backgroundColor: '#FAF7F3',
  },
  inputMulti: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  addBtn: {
    backgroundColor: '#7A4F1E',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
