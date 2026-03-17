import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CreateItem } from '@/components/items/create_item';
import { rarityColor, rarityLabel, statOptions } from '@/components/items/create_item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  clearGuildItems,
  deleteGuildItem,
  initializeDatabase,
  insertGuildItem,
  listGuildItems,
  type GuildItem,
} from '@/lib/local-db';

export default function ViewItemsScreen() {
  const [items, setItems] = useState<GuildItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadItems();
  }, []);

  async function loadItems() {
    try {
      await initializeDatabase();
      setItems(await listGuildItems());
    } catch (err) {
      setError('Could not load items.');
      console.error(err);
    }
  }

  async function handleCreate(item: GuildItem) {
    try {
      await insertGuildItem(item);
      await loadItems();
    } catch (err) {
      setError('Could not save item.');
      console.error(err);
    }
  }

  async function handleDelete(uid: string) {
    try {
      await deleteGuildItem(uid);
      await loadItems();
    } catch (err) {
      setError('Could not delete item.');
      console.error(err);
    }
  }

  async function handleClear() {
    try {
      await clearGuildItems();
      await loadItems();
    } catch (err) {
      setError('Could not clear items.');
      console.error(err);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Item Forge</ThemedText>
      <ThemedText style={styles.hint}>/view_items</ThemedText>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      <CreateItem onCreate={(item) => void handleCreate(item)} />

      {/* ── Item List ── */}
      {items.length > 0 ? (
        <ThemedView style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionAccent} />
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Items ({items.length})
            </ThemedText>
            <Pressable style={styles.clearButton} onPress={() => void handleClear()}>
              <ThemedText style={styles.clearButtonText}>Clear All</ThemedText>
            </Pressable>
          </View>

          {items.map((item) => (
            <ThemedView
              key={item.uid}
              style={[styles.itemRow, { borderLeftColor: rarityColor(item.bonus) }]}
            >
              <View style={styles.itemInfo}>
                <ThemedText type="defaultSemiBold" style={{ color: rarityColor(item.bonus) }}>
                  {item.name}
                </ThemedText>
                <ThemedText style={styles.itemMeta}>
                  {rarityLabel(item.bonus)} · {item.slot} · {item.type} ·{' '}
                  +{item.bonus} {statOptions.find((s) => s.value === item.stat)?.label ?? item.stat}
                  {item.characterUid ? ' · equipped' : ''}
                </ThemedText>
                {item.description ? (
                  <ThemedText style={styles.itemDesc}>{item.description}</ThemedText>
                ) : null}
              </View>
              <Pressable style={styles.deleteButton} onPress={() => void handleDelete(item.uid)}>
                <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
              </Pressable>
            </ThemedView>
          ))}
        </ThemedView>
      ) : (
        <ThemedView style={styles.emptyCard}>
          <ThemedText style={styles.emptyText}>No items created yet.</ThemedText>
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
    flex: 1,
  },
  clearButton: {
    backgroundColor: '#B00020',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderLeftWidth: 3,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemMeta: {
    fontSize: 12,
    color: '#687076',
  },
  itemDesc: {
    fontSize: 12,
    color: '#9BA1A6',
    fontStyle: 'italic',
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: '#B00020',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9BA1A6',
    fontSize: 14,
  },
});
