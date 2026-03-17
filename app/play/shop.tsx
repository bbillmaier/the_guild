import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  addToGuildShopInventory,
  adjustResource,
  getResource,
  initializeDatabase,
  listGuildShopInventory,
  listMundaneItemTypes,
  type GuildShopInventoryItem,
  type MundaneItemType,
} from '@/lib/local-db';

// ─── Slot pricing (50–100 gold) ───────────────────────────────────────────────

const SLOT_PRICE: Record<string, number> = {
  weapon:  85,
  offhand: 70,
  head:    60,
  chest:   80,
  hands:   55,
  feet:    55,
  waist:   50,
  neck:    90,
  ring:    85,
  wrist:   60,
  back:    65,
};

function priceFor(slot: string): number {
  return SLOT_PRICE[slot.toLowerCase()] ?? 65;
}

// ─── Shop stock generation ────────────────────────────────────────────────────

/**
 * Picks between 1 and 20 items from the full catalogue.
 * Non-starter items are twice as likely to appear as starter items.
 */
function rollShopStock(all: MundaneItemType[]): MundaneItemType[] {
  if (all.length === 0) return [];
  const count = Math.floor(Math.random() * 20) + 1;

  // Build weighted pool: non-starters weight 1.0, starters weight 0.5
  const pool = all.map((item) => ({ item, weight: item.isStarter ? 0.5 : 1.0 }));
  const picked: MundaneItemType[] = [];

  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const total = pool.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight;
      if (r <= 0) { idx = j; break; }
    }
    picked.push(pool[idx].item);
    pool.splice(idx, 1);
  }

  return picked.sort((a, b) => a.slot.localeCompare(b.slot) || a.name.localeCompare(b.name));
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const [stock, setStock]         = useState<MundaneItemType[]>([]);
  const [gold, setGold]           = useState(0);
  const [owned, setOwned]         = useState<GuildShopInventoryItem[]>([]);
  const [error, setError]         = useState<string | null>(null);
  const [working, setWorking]     = useState(false);
  const [bought, setBought]       = useState<Set<number>>(new Set());

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      await initializeDatabase();
      const [allItems, currentGold, inventory] = await Promise.all([
        listMundaneItemTypes(),
        getResource('gold'),
        listGuildShopInventory(),
      ]);
      setStock(rollShopStock(allItems));
      setGold(currentGold);
      setOwned(inventory);
    } catch (err) {
      setError('Could not load shop.');
      console.error(err);
    }
  }

  async function handleBuy(item: MundaneItemType) {
    if (working) return;
    const price = priceFor(item.slot);
    if (gold < price) { setError(`Not enough gold. Need ${price}🪙, have ${Math.floor(gold)}🪙.`); return; }
    setWorking(true);
    setError(null);
    try {
      const newGold = await adjustResource('gold', -price);
      await addToGuildShopInventory(item.id);
      setGold(newGold);
      setBought((prev) => new Set(prev).add(item.id));
      setOwned(await listGuildShopInventory());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Purchase failed.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText style={styles.flavor}>
        A weathered merchant spreads wares across a heavy oak table. Cloth, leather, and iron catch the firelight.
      </ThemedText>

      <View style={styles.goldBar}>
        <ThemedText style={styles.goldLabel}>🪙 Treasury</ThemedText>
        <ThemedText style={styles.goldValue}>{Math.floor(gold)} gold</ThemedText>
      </View>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {/* ── Today's stock ── */}
      <View style={styles.section}>
        <SectionHeader label="Today's Wares" count={stock.length} />
        {stock.length === 0 ? (
          <ThemedText style={styles.emptyText}>The merchant has nothing for sale today.</ThemedText>
        ) : (
          stock.map((item) => {
            const price      = priceFor(item.slot);
            const canAfford  = gold >= price;
            const alreadyBought = bought.has(item.id);
            return (
              <ShopItemCard
                key={item.id}
                item={item}
                price={price}
                canAfford={canAfford && !alreadyBought}
                alreadyBought={alreadyBought}
                disabled={working}
                onBuy={() => void handleBuy(item)}
              />
            );
          })
        )}
      </View>

      {/* ── Guild inventory ── */}
      {owned.length > 0 && (
        <View style={styles.section}>
          <SectionHeader label="Guild Inventory" count={owned.length} />
          {owned.map((item) => (
            <OwnedItemCard key={item.id} item={item} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type ShopItemCardProps = {
  item: MundaneItemType;
  price: number;
  canAfford: boolean;
  alreadyBought: boolean;
  disabled: boolean;
  onBuy: () => void;
};

function ShopItemCard({ item, price, canAfford, alreadyBought, disabled, onBuy }: ShopItemCardProps) {
  return (
    <ThemedView style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitles}>
          <ThemedText type="defaultSemiBold" style={styles.itemName}>{item.name}</ThemedText>
          {item.className ? (
            <ThemedText style={styles.itemClass}>{item.className}</ThemedText>
          ) : null}
        </View>
        <View style={styles.priceTag}>
          <ThemedText style={styles.priceText}>🪙 {price}</ThemedText>
        </View>
      </View>

      <SlotPill slot={item.slot} />

      {item.description ? (
        <ThemedText style={styles.description}>{item.description}</ThemedText>
      ) : null}

      <Pressable
        style={[
          styles.buyBtn,
          !canAfford && !alreadyBought && styles.buyBtnDisabled,
          alreadyBought && styles.buyBtnOwned,
        ]}
        onPress={onBuy}
        disabled={!canAfford || alreadyBought || disabled}
      >
        <ThemedText style={styles.buyBtnText}>
          {alreadyBought ? 'Purchased' : canAfford ? 'Buy' : 'Cannot afford'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function OwnedItemCard({ item }: { item: GuildShopInventoryItem }) {
  return (
    <ThemedView style={[styles.card, styles.ownedCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitles}>
          <ThemedText type="defaultSemiBold" style={styles.itemName}>{item.name}</ThemedText>
          {item.className ? (
            <ThemedText style={styles.itemClass}>{item.className}</ThemedText>
          ) : null}
        </View>
        <View style={styles.ownedBadge}>
          <ThemedText style={styles.ownedBadgeText}>Owned</ThemedText>
        </View>
      </View>
      <SlotPill slot={item.slot} />
      {item.description ? (
        <ThemedText style={styles.description}>{item.description}</ThemedText>
      ) : null}
    </ThemedView>
  );
}

function SlotPill({ slot }: { slot: string }) {
  return (
    <View style={styles.pill}>
      <ThemedText style={styles.pillText}>{slot}</ThemedText>
    </View>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{label}</ThemedText>
      <View style={styles.countBadge}>
        <ThemedText style={styles.countText}>{count}</ThemedText>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:      { padding: 16, gap: 16 },
  flavor:         { fontSize: 13, color: '#9BA1A6', fontStyle: 'italic', lineHeight: 20 },
  errorText:      { color: '#B00020', fontSize: 13 },
  emptyText:      { fontSize: 13, color: '#9BA1A6', fontStyle: 'italic' },
  section:        { gap: 10 },

  goldBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 169, 106, 0.12)',
    borderWidth: 1,
    borderColor: '#D4A96A',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  goldLabel:      { fontSize: 14, color: '#D4A96A', fontWeight: '600' },
  goldValue:      { fontSize: 16, color: '#D4A96A', fontWeight: '700' },

  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent:  { width: 3, height: 18, borderRadius: 2, backgroundColor: '#4A3728' },
  sectionTitle:   { fontSize: 15, flex: 1 },
  countBadge:     { backgroundColor: '#4A3728', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countText:      { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  card: {
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  ownedCard:      { opacity: 0.75 },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitles:     { flex: 1, gap: 2 },
  itemName:       { fontSize: 15, fontWeight: '600' },
  itemClass:      { fontSize: 11, color: '#9BA1A6', textTransform: 'capitalize' },

  priceTag: {
    backgroundColor: 'rgba(212, 169, 106, 0.15)',
    borderWidth: 1,
    borderColor: '#D4A96A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  priceText:      { fontSize: 13, color: '#B8860B', fontWeight: '700' },

  description:    { fontSize: 12, color: '#687076', fontStyle: 'italic', lineHeight: 18 },

  pill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  pillText:       { fontSize: 11, color: '#687076' },

  buyBtn: {
    backgroundColor: '#4A3728',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 2,
  },
  buyBtnDisabled: { backgroundColor: '#C0BDB8' },
  buyBtnOwned:    { backgroundColor: '#7A9A6A' },
  buyBtnText:     { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  ownedBadge: {
    backgroundColor: '#7A9A6A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  ownedBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
