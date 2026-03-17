import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { rarityColor, rarityLabel, statOptions } from '@/components/items/create_item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  assignItemToCharacter,
  initializeDatabase,
  listGuildItems,
  unassignItem,
  updateGuildCharacterHp,
  type GuildCharacter,
  type GuildItem,
} from '@/lib/local-db';

// ─── HP helpers ───────────────────────────────────────────────────────────────

const hitDiceByClass: Record<string, number> = {
  barbarian: 12,
  fighter:   10,
  ranger:    10,
  paladin:   10,
  bard:       8,
  cleric:     8,
  druid:      8,
  monk:       8,
  rogue:      8,
  warlock:    8,
  wizard:     6,
  sorcerer:   6,
};

function resolveHitDie(className: string): number {
  return hitDiceByClass[className.toLowerCase()] ?? 8;
}

function calculateHp(hitDie: number, constitution: number, level: number): number {
  const conMod = Math.floor((constitution - 10) / 2);
  const levelOneHp = hitDie + conMod;
  const subsequentHp = (Math.floor(hitDie / 2) + conMod) * (level - 1);
  return Math.max(level, levelOneHp + subsequentHp);
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type EquipItemProps = {
  character: GuildCharacter;
  onUpdate?: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function EquipItem({ character, onUpdate }: EquipItemProps) {
  const [equipped, setEquipped] = useState<GuildItem[]>([]);
  const [available, setAvailable] = useState<GuildItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      await initializeDatabase();
      const all = await listGuildItems();
      setEquipped(all.filter((i) => i.characterUid === character.uid));
      setAvailable(all.filter((i) => i.characterUid === null));
    } catch (err) {
      setError('Could not load items.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [character.uid]);

  useEffect(() => {
    void load();
  }, [load]);

  async function recalculateHpIfNeeded(changedItemStat: string) {
    if (changedItemStat !== 'constitution') return;
    const all = await listGuildItems();
    const conBonus = all
      .filter((i) => i.characterUid === character.uid && i.stat === 'constitution')
      .reduce((sum, i) => sum + i.bonus, 0);
    const newHp = calculateHp(
      resolveHitDie(character.className),
      character.constitution + conBonus,
      character.level
    );
    await updateGuildCharacterHp(character.uid, newHp);
  }

  async function handleAssign(itemUid: string) {
    setError(null);
    try {
      await assignItemToCharacter(itemUid, character.uid);
      const item = available.find((i) => i.uid === itemUid);
      if (item) await recalculateHpIfNeeded(item.stat);
      await load();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not equip item.');
    }
  }

  async function handleUnassign(itemUid: string) {
    setError(null);
    try {
      const item = equipped.find((i) => i.uid === itemUid);
      await unassignItem(itemUid);
      if (item) await recalculateHpIfNeeded(item.stat);
      await load();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unequip item.');
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.loadingText}>Loading items...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.characterName}>
        {character.characterName}
      </ThemedText>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {/* ── Equipped ── */}
      <SectionHeader label={`Equipped  ${equipped.length} / 3`} />

      {equipped.length === 0 ? (
        <ThemedText style={styles.emptyText}>No items equipped.</ThemedText>
      ) : (
        equipped.map((item) => (
          <ItemRow
            key={item.uid}
            item={item}
            actionLabel="Unequip"
            actionStyle={styles.unequipButton}
            actionTextStyle={styles.unequipButtonText}
            onPress={() => void handleUnassign(item.uid)}
          />
        ))
      )}

      {/* ── Available ── */}
      <SectionHeader label="Available Items" />

      {available.length === 0 ? (
        <ThemedText style={styles.emptyText}>No unequipped items in inventory.</ThemedText>
      ) : (
        available.map((item) => (
          <ItemRow
            key={item.uid}
            item={item}
            actionLabel="Equip"
            actionStyle={styles.equipButton}
            actionTextStyle={styles.equipButtonText}
            onPress={() => void handleAssign(item.uid)}
          />
        ))
      )}
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

function ItemRow({
  item,
  actionLabel,
  actionStyle,
  actionTextStyle,
  onPress,
}: {
  item: GuildItem;
  actionLabel: string;
  actionStyle: object;
  actionTextStyle: object;
  onPress: () => void;
}) {
  const statLabel = statOptions.find((s) => s.value === item.stat)?.label ?? item.stat;
  return (
    <View style={[styles.itemRow, { borderLeftColor: rarityColor(item.bonus) }]}>
      <View style={styles.itemInfo}>
        <ThemedText type="defaultSemiBold" style={{ color: rarityColor(item.bonus) }}>
          {item.name}
        </ThemedText>
        <ThemedText style={styles.itemMeta}>
          {rarityLabel(item.bonus)} · {item.slot} · +{item.bonus} {statLabel}
        </ThemedText>
        {item.description ? (
          <ThemedText style={styles.itemDesc} numberOfLines={2}>
            {item.description}
          </ThemedText>
        ) : null}
      </View>
      <Pressable style={actionStyle} onPress={onPress}>
        <ThemedText style={actionTextStyle}>{actionLabel}</ThemedText>
      </Pressable>
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
  characterName: {
    fontSize: 16,
    color: '#0a7ea4',
  },
  loadingText: {
    color: '#687076',
    fontStyle: 'italic',
    fontSize: 13,
  },
  errorText: {
    color: '#B00020',
    fontSize: 13,
    borderRadius: 8,
    backgroundColor: 'rgba(176, 0, 32, 0.06)',
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
  emptyText: {
    color: '#9BA1A6',
    fontSize: 13,
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  equipButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  equipButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  unequipButton: {
    borderWidth: 1,
    borderColor: '#B00020',
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  unequipButtonText: {
    color: '#B00020',
    fontSize: 12,
    fontWeight: '600',
  },
});
