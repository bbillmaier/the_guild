import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { rarityColor, rarityLabel } from '@/components/items/create_item';
import { CharacterAvatar } from '@/components/character-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  assignItemToCharacter,
  deleteGuildItem,
  getGameDay,
  getResource,
  initializeDatabase,
  listGuildCharacters,
  listGuildItems,
  setResource,
  unassignItem,
  type GuildCharacter,
  type GuildItem,
} from '@/lib/local-db';
import { filterByRoom, getRoomAssignments, type RoomKey } from '@/lib/room-assignments';

export default function ArmoryScreen() {
  const [items, setItems]             = useState<GuildItem[]>([]);
  const [characters, setCharacters]   = useState<GuildCharacter[]>([]);
  const [assignments, setAssignments] = useState<Record<string, RoomKey>>({});
  const [error, setError]             = useState<string | null>(null);
  const [equipTarget, setEquipTarget]   = useState<GuildItem | null>(null);
  const [sellTarget, setSellTarget]     = useState<GuildItem | null>(null);
  const [gold, setGold]                 = useState(0);
  const [working, setWorking]           = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      await initializeDatabase();
      const [all, allChars, day, currentGold] = await Promise.all([listGuildItems(), listGuildCharacters(), getGameDay(), getResource('gold')]);
      setItems(all);
      setGold(currentGold);
      const { assignments: roomMap } = await getRoomAssignments(day, allChars);
      setAssignments(roomMap);
      setCharacters(allChars);
    } catch (err) {
      setError('Could not load items.');
      console.error(err);
    }
  }

  async function handleEquip(characterUid: string) {
    if (!equipTarget || working) return;
    setWorking(true);
    setError(null);
    try {
      await assignItemToCharacter(equipTarget.uid, characterUid);
      setEquipTarget(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not equip item.');
    } finally {
      setWorking(false);
    }
  }

  async function handleUnequip(itemUid: string) {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      await unassignItem(itemUid);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not unequip item.');
    } finally {
      setWorking(false);
    }
  }

  async function handleSell(item: GuildItem) {
    if (working) return;
    setWorking(true);
    setError(null);
    setSellTarget(null);
    try {
      const salePrice = item.bonus * 10;
      const current = await getResource('gold');
      await setResource('gold', current + salePrice);
      await deleteGuildItem(item.uid);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not sell item.');
    } finally {
      setWorking(false);
    }
  }

  const unassigned = items.filter((i) => i.characterUid === null);
  const equipped   = items.filter((i) => i.characterUid !== null);
  const here       = filterByRoom(characters, assignments, 'armory');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText style={styles.flavor}>
        Racks of steel and leather fill the room. Trophies from forgotten campaigns gather dust in the corners.
      </ThemedText>

      <View style={styles.goldRow}>
        <ThemedText style={styles.goldLabel}>Treasury</ThemedText>
        <View style={styles.goldChip}>
          <ThemedText style={styles.goldText}>{gold} gp</ThemedText>
        </View>
      </View>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {here.length > 0 && (
        <View style={styles.section}>
          <SectionHeader label="Present" count={here.length} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {here.map((c) => (
              <Pressable
                key={c.uid}
                style={styles.chip}
                onPress={() => router.push({ pathname: '/play/chat', params: { characterUid: c.uid } })}
              >
                <CharacterAvatar name={c.characterName} avatarPath={c.avatarPath} size={52} />
                <ThemedText style={styles.chipName} numberOfLines={1}>{c.characterName}</ThemedText>
                <ThemedText style={styles.chipMeta}>Lv {c.level} {c.className}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <SectionHeader label="Available Loot" count={unassigned.length} />
        {unassigned.length === 0 ? (
          <ThemedText style={styles.emptyText}>
            No unclaimed items. Complete quests to earn rewards.
          </ThemedText>
        ) : (
          unassigned.map((item) => (
            <ItemCard
              key={item.uid}
              item={item}
              characters={characters}
              onEquipPress={() => setEquipTarget(item)}
              onSellPress={() => item.bonus >= 3 ? setSellTarget(item) : void handleSell(item)}
            />
          ))
        )}
      </View>

      {equipped.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader label="Equipped" count={equipped.length} />
          {equipped.map((item) => (
            <ItemCard
              key={item.uid}
              item={item}
              characters={characters}
              onUnequip={() => void handleUnequip(item.uid)}
              disabled={working}
            />
          ))}
        </View>
      ) : null}

      {/* ── Sell confirmation sheet ── */}
      <Modal
        visible={!!sellTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setSellTarget(null)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setSellTarget(null)}>
          <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="defaultSemiBold" style={styles.pickerTitle}>
              Sell "{sellTarget?.name}"?
            </ThemedText>
            <ThemedText style={styles.sellPrice}>
              +{(sellTarget?.bonus ?? 0) * 10} gold
            </ThemedText>
            <ThemedText style={styles.pickerSub}>
              This cannot be undone.
            </ThemedText>
            <View style={styles.sellActions}>
              <Pressable style={styles.sellConfirmBtn} onPress={() => sellTarget && void handleSell(sellTarget)} disabled={working}>
                <ThemedText style={styles.sellConfirmText}>Sell</ThemedText>
              </Pressable>
              <Pressable style={styles.sellCancelBtn} onPress={() => setSellTarget(null)}>
                <ThemedText style={styles.pickerCancelText}>Cancel</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Character picker sheet ── */}
      <Modal
        visible={!!equipTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setEquipTarget(null)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setEquipTarget(null)}>
          <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="defaultSemiBold" style={styles.pickerTitle}>
              Equip "{equipTarget?.name}" to…
            </ThemedText>
            <ThemedText style={styles.pickerSub}>
              Slot: {equipTarget?.slot} · Max 3 items per character
            </ThemedText>
            <ScrollView style={styles.pickerList}>
              {characters.map((c) => {
                const charItems = equipped.filter((i) => i.characterUid === c.uid);
                const slotTaken = !!equipTarget && charItems.some((i) => i.slot === equipTarget.slot);
                const full      = charItems.length >= 3;
                const blocked   = slotTaken || full;
                return (
                  <Pressable
                    key={c.uid}
                    style={[styles.pickerRow, blocked && styles.pickerRowDisabled]}
                    onPress={() => !blocked && void handleEquip(c.uid)}
                    disabled={blocked || working}
                  >
                    <CharacterAvatar name={c.characterName} avatarPath={c.avatarPath} size={40} />
                    <View style={styles.pickerRowInfo}>
                      <ThemedText style={[styles.pickerCharName, blocked && styles.pickerCharNameMuted]}>
                        {c.characterName}
                      </ThemedText>
                      <ThemedText style={styles.pickerCharMeta}>
                        Lv {c.level} {c.className} · {charItems.length}/3 items
                        {slotTaken ? '  ·  slot taken' : ''}
                        {!slotTaken && full ? '  ·  full' : ''}
                      </ThemedText>
                    </View>
                    {!blocked && (
                      <View style={styles.equipBtn}>
                        <ThemedText style={styles.equipBtnText}>Equip</ThemedText>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.pickerCancel} onPress={() => setEquipTarget(null)}>
              <ThemedText style={styles.pickerCancelText}>Cancel</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// ─── Item Card ─────────────────────────────────────────────────────────────────

type ItemCardProps = {
  item: GuildItem;
  characters: GuildCharacter[];
  onEquipPress?: () => void;
  onSellPress?: () => void;
  onUnequip?: () => void;
  disabled?: boolean;
};

function ItemCard({ item, characters, onEquipPress, onSellPress, onUnequip, disabled }: ItemCardProps) {
  const color   = rarityColor(item.bonus);
  const rarity  = rarityLabel(item.bonus);
  const owner   = item.characterUid ? characters.find((c) => c.uid === item.characterUid) : null;

  return (
    <ThemedView style={[styles.card, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={styles.cardHeader}>
        <ThemedText type="defaultSemiBold" style={[styles.itemName, { color }]}>{item.name}</ThemedText>
        <View style={[styles.rarityBadge, { backgroundColor: color }]}>
          <ThemedText style={styles.rarityText}>{rarity} +{item.bonus}</ThemedText>
        </View>
      </View>

      <View style={styles.metaRow}>
        <MetaPill label={item.slot} />
        <MetaPill label={item.type} />
        <MetaPill label={item.stat.toUpperCase()} accent />
      </View>

      {item.description ? (
        <ThemedText style={styles.description}>{item.description}</ThemedText>
      ) : null}

      <View style={styles.cardFooter}>
        {owner ? (
          <View style={styles.ownerRow}>
            <CharacterAvatar name={owner.characterName} avatarPath={owner.avatarPath} size={24} />
            <ThemedText style={styles.ownerName}>{owner.characterName}</ThemedText>
          </View>
        ) : null}

        {onEquipPress && (
          <Pressable style={styles.actionBtn} onPress={onEquipPress} disabled={disabled}>
            <ThemedText style={styles.actionBtnText}>Equip</ThemedText>
          </Pressable>
        )}
        {onSellPress && (
          <Pressable style={[styles.actionBtn, styles.sellBtn]} onPress={onSellPress} disabled={disabled}>
            <ThemedText style={styles.actionBtnText}>Sell</ThemedText>
          </Pressable>
        )}
        {onUnequip && (
          <Pressable style={[styles.actionBtn, styles.unequipBtn]} onPress={onUnequip} disabled={disabled}>
            <ThemedText style={styles.actionBtnText}>Unequip</ThemedText>
          </Pressable>
        )}
      </View>
    </ThemedView>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function MetaPill({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <View style={[styles.pill, accent && styles.pillAccent]}>
      <ThemedText style={[styles.pillText, accent && styles.pillTextAccent]}>{label}</ThemedText>
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

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { padding: 16, gap: 16 },
  flavor:           { fontSize: 13, color: '#9BA1A6', fontStyle: 'italic', lineHeight: 20 },
  errorText:        { color: '#B00020', fontSize: 13 },
  emptyText:        { fontSize: 13, color: '#9BA1A6', fontStyle: 'italic' },
  section:          { gap: 10 },
  chipRow:          { gap: 10, paddingVertical: 4 },
  chip:             { alignItems: 'center', gap: 5, width: 72 },
  chipName:         { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  chipMeta:         { fontSize: 10, color: '#9BA1A6', textAlign: 'center' },

  sectionHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent:    { width: 3, height: 18, borderRadius: 2, backgroundColor: '#4A3728' },
  sectionTitle:     { fontSize: 15, flex: 1 },
  countBadge:       { backgroundColor: '#4A3728', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countText:        { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  card:             { borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 10, padding: 12, gap: 8 },
  cardHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  itemName:         { fontSize: 15, fontWeight: '600', flex: 1 },
  rarityBadge:      { borderRadius: 12, paddingVertical: 2, paddingHorizontal: 8 },
  rarityText:       { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaRow:          { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill:             { borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  pillAccent:       { borderColor: '#4A3728', backgroundColor: 'rgba(74, 55, 40, 0.08)' },
  pillText:         { fontSize: 11, color: '#687076' },
  pillTextAccent:   { color: '#4A3728', fontWeight: '600' },
  description:      { fontSize: 12, color: '#687076', fontStyle: 'italic', lineHeight: 18 },

  cardFooter:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  ownerRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  ownerName:        { fontSize: 12, color: '#687076' },
  actionBtn:        { backgroundColor: '#4A3728', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  unequipBtn:       { backgroundColor: '#7A4A2A' },
  sellBtn:          { backgroundColor: '#6B5500' },
  actionBtnText:    { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  goldRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goldLabel:        { fontSize: 13, color: '#9BA1A6' },
  goldChip:         { backgroundColor: '#4A3700', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  goldText:         { color: '#F0C040', fontSize: 13, fontWeight: '700' },

  sellPrice:        { fontSize: 22, fontWeight: '700', color: '#C09820', textAlign: 'center', paddingVertical: 8 },
  sellActions:      { flexDirection: 'row', gap: 10, marginTop: 4 },
  sellConfirmBtn:   { flex: 1, backgroundColor: '#6B5500', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  sellConfirmText:  { color: '#F0C040', fontSize: 15, fontWeight: '700' },
  sellCancelBtn:    { flex: 1, borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },

  // Character picker sheet
  pickerBackdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  pickerSheet:      { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, width: '85%', maxHeight: '70%', gap: 12 },
  pickerTitle:      { fontSize: 16 },
  pickerSub:        { fontSize: 12, color: '#9BA1A6', marginTop: -6 },
  pickerList:       { maxHeight: 320 },
  pickerRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  pickerRowDisabled:{ opacity: 0.4 },
  pickerRowInfo:    { flex: 1 },
  pickerCharName:   { fontSize: 14, fontWeight: '600' },
  pickerCharNameMuted: { color: '#9BA1A6' },
  pickerCharMeta:   { fontSize: 11, color: '#9BA1A6', marginTop: 1 },
  equipBtn:         { backgroundColor: '#4A3728', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  equipBtnText:     { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  pickerCancel:     { alignItems: 'center', paddingTop: 4 },
  pickerCancelText: { color: '#9BA1A6', fontSize: 14 },
});
