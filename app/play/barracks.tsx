import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { CharacterAvatar } from '@/components/character-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  assignGuildItemToCharacter,
  deleteOutfitSet,
  getActiveOutfitForRoom,
  getGameDay,
  initializeDatabase,
  insertOutfitSet,
  listCharacterItems,
  listGuildCharacters,
  listGuildShopInventory,
  listMundaneInventory,
  listOutfitItems,
  listOutfitSets,
  removeOutfitItem,
  returnItemToGuildPool,
  setOutfitItem,
  updateOutfitSetDetails,
  type GuildCharacter,
  type GuildItem,
  type GuildShopInventoryItem,
  type MundaneInventoryItem,
  type OutfitItem,
  type OutfitSet,
} from '@/lib/local-db';
import { filterByRoom, getRoomAssignments, type RoomKey } from '@/lib/room-assignments';
import { generateCharacterAvatar, generateOutfitImage } from '@/lib/comfy';
import { enqueueImageGeneration } from '@/lib/generation-queue';
import { generateOpinionsForCharacter } from '@/lib/generate-opinion';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_SLOTS = ['weapon','offhand','head','chest','hands','feet','waist','neck','ring','wrist','back'] as const;
type Slot = typeof ALL_SLOTS[number];

const SLOT_ICONS: Record<string, string> = {
  weapon: '⚔️', offhand: '🛡️', head: '🪖', chest: '🧥',
  hands: '🧤', feet: '👢', waist: '🎗️', neck: '📿',
  ring: '💍', wrist: '🔗', back: '🧣',
};

/** Extend this array when new rooms are unlocked — context is stored as TEXT in the DB. */
export const OUTFIT_CONTEXTS: { value: string; label: string }[] = [
  { value: 'any',      label: 'Any' },
  { value: 'tavern',   label: 'Tavern' },
  { value: 'barracks', label: 'Barracks' },
  { value: 'armory',   label: 'Armory' },
  { value: 'quest',    label: 'On Quest' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BarracksScreen() {
  const [characters, setCharacters]             = useState<GuildCharacter[]>([]);
  const [assignments, setAssignments]           = useState<Record<string, RoomKey>>({});
  const [effectiveAvatars, setEffectiveAvatars] = useState<Record<string, string | null>>({});
  const [gameDay, setGameDay]                   = useState(1);
  const [error, setError]                       = useState<string | null>(null);
  const [generatingAll, setGeneratingAll]       = useState(false);
  const [genAllProgress, setGenAllProgress]     = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      await initializeDatabase();
      const [allChars, day] = await Promise.all([listGuildCharacters(), getGameDay()]);
      const { assignments: roomMap } = await getRoomAssignments(day, allChars);
      setAssignments(roomMap);
      setCharacters(allChars);
      setGameDay(day);
      // Compute which outfit image to show for each character based on their current room
      const avatarEntries = await Promise.all(
        allChars.map(async (c) => {
          const room = roomMap[c.uid] ?? 'tavern';
          const activeOutfit = await getActiveOutfitForRoom(c.uid, room, day);
          return [c.uid, activeOutfit?.imagePath ?? null] as const;
        })
      );
      setEffectiveAvatars(Object.fromEntries(avatarEntries));
    } catch (err) {
      setError('Could not load characters.');
      console.error(err);
    }
  }

  async function refreshEffectiveAvatars(chars: GuildCharacter[], roomMap: Record<string, RoomKey>, day: number) {
    const avatarEntries = await Promise.all(
      chars.map(async (c) => {
        const room = roomMap[c.uid] ?? 'tavern';
        const activeOutfit = await getActiveOutfitForRoom(c.uid, room, day);
        return [c.uid, activeOutfit?.imagePath ?? null] as const;
      })
    );
    setEffectiveAvatars(Object.fromEntries(avatarEntries));
  }

  async function handleGenerateAll() {
    setGeneratingAll(true);
    setGenAllProgress(null);
    for (const c of characters) {
      setGenAllProgress(`${c.characterName}...`);
      try {
        const path = await generateCharacterAvatar(c);
        setCharacters((prev) => prev.map((ch) => ch.uid === c.uid ? { ...ch, avatarPath: path } : ch));
      } catch (err) {
        console.error(`Failed to generate avatar for ${c.characterName}:`, err);
      }
    }
    setGeneratingAll(false);
    setGenAllProgress(null);
  }

  const here = filterByRoom(characters, assignments, 'barracks');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText style={styles.flavor}>
        Cots line the walls. The smell of worn leather and campfire smoke hangs in the air.
      </ThemedText>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {here.length > 0 && (
        <View style={styles.section}>
          <SectionHeader label="Present" />
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
        <View style={styles.sectionHeaderRow}>
          <SectionHeader label="All Adventurers" />
          {characters.length > 0 && (
            <Pressable
              style={[styles.genAllButton, generatingAll && styles.dimmed]}
              onPress={() => void handleGenerateAll()}
              disabled={generatingAll}
            >
              {generatingAll ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <ThemedText style={styles.genAllButtonText}>
                {generatingAll ? genAllProgress ?? 'Generating...' : 'Generate All'}
              </ThemedText>
            </Pressable>
          )}
        </View>
        {characters.length === 0 ? (
          <ThemedText style={styles.emptyText}>
            No adventurers have registered yet. Visit the admin panel to recruit your party.
          </ThemedText>
        ) : (
          characters.map((c) => (
            <CharacterCard
              key={c.uid}
              character={c}
              allCharacters={characters}
              effectiveAvatarPath={effectiveAvatars[c.uid] ?? null}
              onAvatarGenerated={(uid, path) =>
                setCharacters((prev) => prev.map((ch) => ch.uid === uid ? { ...ch, avatarPath: path } : ch))
              }
              onOutfitImageGenerated={() => void refreshEffectiveAvatars(characters, assignments, gameDay)}
            />
          ))
        )}
      </View>

    </ScrollView>
  );
}

// ─── Character Card ───────────────────────────────────────────────────────────

function CharacterCard({
  character,
  allCharacters,
  effectiveAvatarPath,
  onAvatarGenerated,
  onOutfitImageGenerated,
}: {
  character: GuildCharacter;
  allCharacters: GuildCharacter[];
  effectiveAvatarPath: string | null;
  onAvatarGenerated: (uid: string, path: string) => void;
  onOutfitImageGenerated: () => void;
}) {
  const [generating, setGenerating]             = useState(false);
  const [genError, setGenError]                 = useState<string | null>(null);
  const [outfitOpen, setOutfitOpen]             = useState(false);
  const [genOpinions, setGenOpinions]           = useState(false);
  const [opinionProgress, setOpinionProgress]   = useState<string | null>(null);
  const [onlyNewOpinions, setOnlyNewOpinions]   = useState(true);
  const displayAvatarPath = effectiveAvatarPath ?? character.avatarPath;
  const others = allCharacters.filter((c) => c.uid !== character.uid);

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const path = await generateCharacterAvatar(character);
      onAvatarGenerated(character.uid, path);
    } catch (err) {
      setGenError('Image generation failed.');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateOpinions() {
    if (others.length === 0) return;
    setGenOpinions(true);
    setOpinionProgress(null);
    try {
      await generateOpinionsForCharacter(character, others, onlyNewOpinions, (targetName) => {
        setOpinionProgress(`→ ${targetName}`);
      });
    } catch (err) {
      console.error(`Failed to generate opinions for ${character.characterName}:`, err);
    } finally {
      setGenOpinions(false);
      setOpinionProgress(null);
    }
  }

  return (
    <ThemedView style={styles.card}>
      <View style={styles.cardHeader}>
        <CharacterAvatar name={character.characterName} avatarPath={displayAvatarPath} size={64} />
        <View style={styles.cardMid}>
          <ThemedText type="defaultSemiBold" style={styles.charName}>{character.characterName}</ThemedText>
          <ThemedText style={styles.charMeta}>Level {character.level} {character.race} {character.className}</ThemedText>
          <ThemedText style={styles.xpText}>{character.experience} XP</ThemedText>
        </View>
        <View style={styles.cardRight}>
          <ThemedText style={styles.hpLabel}>HP</ThemedText>
          <ThemedText style={styles.hpValue}>{character.hp}</ThemedText>
        </View>
      </View>

      <View style={styles.statRow}>
        <StatPill label="STR" value={character.strength} />
        <StatPill label="DEX" value={character.dexterity} />
        <StatPill label="CON" value={character.constitution} />
        <StatPill label="INT" value={character.intelligence} />
        <StatPill label="WIS" value={character.wisdom} />
        <StatPill label="CHA" value={character.charisma} />
      </View>

      {character.baseDescription ? (
        <ThemedText style={styles.description} numberOfLines={2}>{character.baseDescription}</ThemedText>
      ) : null}

      {genError ? <ThemedText style={styles.genError}>{genError}</ThemedText> : null}

      <View style={styles.cardActions}>
        <Pressable
          style={[styles.actionBtn, styles.portraitBtn, generating && styles.dimmed]}
          onPress={() => void handleGenerate()}
          disabled={generating}
        >
          {generating ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
          <ThemedText style={styles.actionBtnText}>
            {generating ? 'Generating...' : character.avatarPath ? 'Regenerate Portrait' : 'Generate Portrait'}
          </ThemedText>
        </Pressable>

        <Pressable style={[styles.actionBtn, styles.outfitBtn]} onPress={() => setOutfitOpen(true)}>
          <ThemedText style={styles.actionBtnText}>Outfits</ThemedText>
        </Pressable>
      </View>

      {others.length > 0 && (
        <View style={styles.opinionCardRow}>
          <View style={styles.opinionToggle}>
            <Switch
              value={onlyNewOpinions}
              onValueChange={setOnlyNewOpinions}
              trackColor={{ false: '#D0D5D9', true: '#4A3728' }}
              thumbColor="#FFFFFF"
            />
            <ThemedText style={styles.opinionToggleLabel}>Only new</ThemedText>
          </View>
          <Pressable
            style={[styles.opinionBtn, genOpinions && styles.dimmed]}
            onPress={() => void handleGenerateOpinions()}
            disabled={genOpinions}
          >
            {genOpinions ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
            <ThemedText style={styles.opinionBtnText}>
              {genOpinions ? opinionProgress ?? 'Generating...' : 'Generate Opinions'}
            </ThemedText>
          </Pressable>
        </View>
      )}

      {outfitOpen && (
        <CharacterOutfitModal
          character={character}
          onClose={() => setOutfitOpen(false)}
          onOutfitImageGenerated={onOutfitImageGenerated}
        />
      )}
    </ThemedView>
  );
}

// ─── Outfit Modal ─────────────────────────────────────────────────────────────

type ModalView = 'main' | 'outfit-editor';
type MainTab   = 'items' | 'outfits';

function CharacterOutfitModal({
  character,
  onClose,
  onOutfitImageGenerated,
}: {
  character: GuildCharacter;
  onClose: () => void;
  onOutfitImageGenerated: () => void;
}) {
  const [view, setView]             = useState<ModalView>('main');
  const [tab, setTab]               = useState<MainTab>('items');
  const [loading, setLoading]       = useState(true);
  const [working, setWorking]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Data
  const [guildPool, setGuildPool]   = useState<GuildShopInventoryItem[]>([]);
  const [charGear, setCharGear]     = useState<MundaneInventoryItem[]>([]);
  const [outfits, setOutfits]       = useState<OutfitSet[]>([]);
  const [magicItems, setMagicItems] = useState<GuildItem[]>([]);

  // Outfit editor
  const [editingOutfit, setEditingOutfit]   = useState<OutfitSet | null>(null);
  const [outfitName, setOutfitName]         = useState('');
  const [outfitContext, setOutfitContext]   = useState('any');
  const [slotMap, setSlotMap]               = useState<Record<string, number | null>>({});
  const [expandedSlot, setExpandedSlot]     = useState<string | null>(null);

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [pool, gear, sets, magic] = await Promise.all([
        listGuildShopInventory(),
        listMundaneInventory(character.uid),
        listOutfitSets(character.uid),
        listCharacterItems(character.uid),
      ]);
      setGuildPool(pool);
      setCharGear(gear);
      setOutfits(sets);
      setMagicItems(magic);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(item: GuildShopInventoryItem) {
    setWorking(true);
    setError(null);
    try {
      await assignGuildItemToCharacter(item.id, character.uid);
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed.'); }
    finally { setWorking(false); }
  }

  async function handleReturn(item: MundaneInventoryItem) {
    setWorking(true);
    setError(null);
    try {
      await returnItemToGuildPool(item.id);
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed.'); }
    finally { setWorking(false); }
  }

  function openNewOutfit() {
    setEditingOutfit(null);
    setOutfitName('');
    setOutfitContext('any');
    setSlotMap({});
    setExpandedSlot(null);
    setError(null);
    setView('outfit-editor');
  }

  async function openEditOutfit(outfit: OutfitSet) {
    setEditingOutfit(outfit);
    setOutfitName(outfit.name);
    setOutfitContext(outfit.context);
    const items = await listOutfitItems(outfit.id);
    const map: Record<string, number | null> = {};
    for (const item of items) map[item.slot] = item.inventoryItemId;
    setSlotMap(map);
    setExpandedSlot(null);
    setError(null);
    setView('outfit-editor');
  }

  async function handleDeleteOutfit(id: number) {
    setWorking(true);
    setError(null);
    try {
      await deleteOutfitSet(id);
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed.'); }
    finally { setWorking(false); }
  }

  async function handleGenerateOutfitImage(outfit: OutfitSet) {
    const items = await listOutfitItems(outfit.id);
    enqueueImageGeneration(`Generating ${outfit.name}...`, async () => {
      await generateOutfitImage(character, outfit, items);
      onOutfitImageGenerated();
    });
  }

  async function handleSaveOutfit() {
    if (!outfitName.trim()) { setError('Outfit name is required.'); return; }
    setWorking(true);
    setError(null);
    try {
      let id: number;
      if (editingOutfit) {
        id = editingOutfit.id;
        await updateOutfitSetDetails(id, outfitName.trim(), outfitContext);
      } else {
        id = await insertOutfitSet(character.uid, outfitName.trim(), outfitContext);
      }
      for (const slot of ALL_SLOTS) {
        const invId = slotMap[slot] ?? null;
        if (invId !== null) await setOutfitItem(id, invId, slot);
        else await removeOutfitItem(id, slot);
      }
      await loadData();
      setView('main');
      setTab('outfits');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed.'); }
    finally { setWorking(false); }
  }

  // Slots blocked by equipped magic items
  const blockedSlots = new Set(magicItems.map((i) => i.slot));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ms.backdrop} onPress={onClose}>
        <Pressable style={ms.sheet} onPress={(e) => e.stopPropagation()}>

          {/* Header */}
          <View style={ms.header}>
            {view === 'outfit-editor' ? (
              <Pressable onPress={() => { setView('main'); setError(null); }} style={ms.backBtn}>
                <ThemedText style={ms.backBtnText}>‹ Back</ThemedText>
              </Pressable>
            ) : <View style={ms.backBtn} />}

            <View style={ms.headerTitle}>
              <CharacterAvatar name={character.characterName} avatarPath={character.avatarPath} size={28} />
              <ThemedText type="defaultSemiBold" style={ms.headerName}>{character.characterName}</ThemedText>
            </View>

            <Pressable onPress={onClose} style={ms.closeBtn}>
              <ThemedText style={ms.closeBtnText}>✕</ThemedText>
            </Pressable>
          </View>

          {error ? <ThemedText style={ms.errorText}>{error}</ThemedText> : null}

          {loading ? (
            <View style={ms.loadingRow}>
              <ActivityIndicator />
            </View>
          ) : view === 'main' ? (
            <>
              {/* Tab bar */}
              <View style={ms.tabBar}>
                <Pressable
                  style={[ms.tab, tab === 'items' && ms.tabActive]}
                  onPress={() => setTab('items')}
                >
                  <ThemedText style={[ms.tabText, tab === 'items' && ms.tabTextActive]}>
                    Items ({charGear.length})
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[ms.tab, tab === 'outfits' && ms.tabActive]}
                  onPress={() => setTab('outfits')}
                >
                  <ThemedText style={[ms.tabText, tab === 'outfits' && ms.tabTextActive]}>
                    Outfits ({outfits.length})
                  </ThemedText>
                </Pressable>
              </View>

              <ScrollView style={ms.body} contentContainerStyle={ms.bodyContent}>
                {tab === 'items' ? (
                  <ItemsTab
                    guildPool={guildPool}
                    charGear={charGear}
                    working={working}
                    onAssign={handleAssign}
                    onReturn={handleReturn}
                  />
                ) : (
                  <OutfitsTab
                    outfits={outfits}
                    charGear={charGear}
                    working={working}
                    hasAvatar={!!character.avatarPath}
                    onNew={openNewOutfit}
                    onEdit={openEditOutfit}
                    onDelete={handleDeleteOutfit}
                    onGenerate={handleGenerateOutfitImage}
                  />
                )}
              </ScrollView>
            </>
          ) : (
            /* Outfit editor */
            <ScrollView style={ms.body} contentContainerStyle={ms.bodyContent}>
              <OutfitEditor
                outfitName={outfitName}
                outfitContext={outfitContext}
                slotMap={slotMap}
                charGear={charGear}
                blockedSlots={blockedSlots}
                expandedSlot={expandedSlot}
                working={working}
                onNameChange={setOutfitName}
                onContextChange={setOutfitContext}
                onSlotToggle={(slot) => setExpandedSlot((s) => s === slot ? null : slot)}
                onSlotSelect={(slot, invId) => {
                  setSlotMap((prev) => ({ ...prev, [slot]: invId }));
                  setExpandedSlot(null);
                }}
                onSave={() => void handleSaveOutfit()}
              />
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Items Tab ────────────────────────────────────────────────────────────────

function ItemsTab({
  guildPool, charGear, working, onAssign, onReturn,
}: {
  guildPool: GuildShopInventoryItem[];
  charGear: MundaneInventoryItem[];
  working: boolean;
  onAssign: (item: GuildShopInventoryItem) => void;
  onReturn: (item: MundaneInventoryItem) => void;
}) {
  return (
    <View style={{ gap: 16 }}>
      {/* Guild pool */}
      <View style={ms.subSection}>
        <ThemedText type="defaultSemiBold" style={ms.subHeading}>Guild Pool</ThemedText>
        {guildPool.length === 0 ? (
          <ThemedText style={ms.emptyText}>No unassigned items. Buy from the shop.</ThemedText>
        ) : (
          guildPool.map((item) => (
            <View key={item.id} style={ms.itemRow}>
              <View style={ms.itemInfo}>
                <ThemedText style={ms.itemName}>{item.name}</ThemedText>
                <ThemedText style={ms.itemMeta}>{item.slot}{item.className ? ` · ${item.className}` : ''}</ThemedText>
              </View>
              <Pressable style={ms.assignBtn} onPress={() => onAssign(item)} disabled={working}>
                <ThemedText style={ms.assignBtnText}>Assign</ThemedText>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* Character gear */}
      <View style={ms.subSection}>
        <ThemedText type="defaultSemiBold" style={ms.subHeading}>
          {charGear.length > 0 ? `${charGear.length} item${charGear.length !== 1 ? 's' : ''} owned` : 'No items owned'}
        </ThemedText>
        {charGear.map((item) => (
          <View key={item.id} style={ms.itemRow}>
            <View style={ms.itemInfo}>
              <ThemedText style={ms.itemName}>{item.name ?? 'Unknown'}</ThemedText>
              <ThemedText style={ms.itemMeta}>{item.slot ?? ''}{ item.className ? ` · ${item.className}` : ''}</ThemedText>
            </View>
            <Pressable style={[ms.assignBtn, ms.returnBtn]} onPress={() => onReturn(item)} disabled={working}>
              <ThemedText style={ms.assignBtnText}>Return</ThemedText>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Outfits Tab ──────────────────────────────────────────────────────────────

function OutfitsTab({
  outfits, charGear, working, hasAvatar, onNew, onEdit, onDelete, onGenerate,
}: {
  outfits: OutfitSet[];
  charGear: MundaneInventoryItem[];
  working: boolean;
  hasAvatar: boolean;
  onNew: () => void;
  onEdit: (o: OutfitSet) => void;
  onDelete: (id: number) => void;
  onGenerate: (o: OutfitSet) => void;
}) {
  const contextLabel = (ctx: string) => OUTFIT_CONTEXTS.find((c) => c.value === ctx)?.label ?? ctx;

  return (
    <View style={{ gap: 12 }}>
      <Pressable style={ms.newOutfitBtn} onPress={onNew} disabled={working}>
        <ThemedText style={ms.newOutfitBtnText}>+ New Outfit</ThemedText>
      </Pressable>

      {outfits.length === 0 ? (
        <ThemedText style={ms.emptyText}>No outfits yet. Create one above.</ThemedText>
      ) : (
        outfits.map((outfit) => (
          <View key={outfit.id} style={ms.outfitCard}>
            <View style={ms.outfitCardHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText style={ms.outfitName}>{outfit.name}</ThemedText>
                <View style={ms.contextPill}>
                  <ThemedText style={ms.contextPillText}>{contextLabel(outfit.context)}</ThemedText>
                </View>
                {outfit.imagePath ? (
                  <ThemedText style={ms.outfitImageHint}>Image generated ✓</ThemedText>
                ) : null}
              </View>
              <View style={ms.outfitCardActions}>
                {hasAvatar ? (
                  <Pressable style={ms.generateBtn} onPress={() => onGenerate(outfit)} disabled={working}>
                    {working ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ThemedText style={ms.generateBtnText}>Generate</ThemedText>
                    )}
                  </Pressable>
                ) : (
                  <ThemedText style={ms.noAvatarHint}>Generate portrait first</ThemedText>
                )}
                <Pressable style={ms.editBtn} onPress={() => onEdit(outfit)} disabled={working}>
                  <ThemedText style={ms.editBtnText}>Edit</ThemedText>
                </Pressable>
                <Pressable style={ms.deleteBtn} onPress={() => onDelete(outfit.id)} disabled={working}>
                  <ThemedText style={ms.deleteBtnText}>✕</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

// ─── Outfit Editor ────────────────────────────────────────────────────────────

function OutfitEditor({
  outfitName, outfitContext, slotMap, charGear, blockedSlots,
  expandedSlot, working,
  onNameChange, onContextChange, onSlotToggle, onSlotSelect, onSave,
}: {
  outfitName: string;
  outfitContext: string;
  slotMap: Record<string, number | null>;
  charGear: MundaneInventoryItem[];
  blockedSlots: Set<string>;
  expandedSlot: string | null;
  working: boolean;
  onNameChange: (n: string) => void;
  onContextChange: (c: string) => void;
  onSlotToggle: (slot: string) => void;
  onSlotSelect: (slot: string, invId: number | null) => void;
  onSave: () => void;
}) {
  return (
    <View style={{ gap: 14 }}>
      {/* Name */}
      <View style={ms.fieldGroup}>
        <ThemedText style={ms.fieldLabel}>Outfit Name</ThemedText>
        <TextInput
          style={ms.textInput}
          value={outfitName}
          onChangeText={onNameChange}
          placeholder="e.g. Battle Gear"
          placeholderTextColor="#9BA1A6"
        />
      </View>

      {/* Context */}
      <View style={ms.fieldGroup}>
        <ThemedText style={ms.fieldLabel}>Worn In</ThemedText>
        <View style={ms.contextChips}>
          {OUTFIT_CONTEXTS.map((ctx) => (
            <Pressable
              key={ctx.value}
              style={[ms.contextChip, outfitContext === ctx.value && ms.contextChipActive]}
              onPress={() => onContextChange(ctx.value)}
            >
              <ThemedText style={[ms.contextChipText, outfitContext === ctx.value && ms.contextChipTextActive]}>
                {ctx.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Slot grid */}
      <View style={ms.fieldGroup}>
        <ThemedText style={ms.fieldLabel}>Item Slots</ThemedText>
        <View style={ms.slotGrid}>
          {ALL_SLOTS.map((slot) => {
            const blocked = blockedSlots.has(slot);
            const selId   = slotMap[slot] ?? null;
            const selItem = selId !== null ? charGear.find((g) => g.id === selId) : null;
            const active  = expandedSlot === slot && !blocked;
            return (
              <Pressable
                key={slot}
                style={[ms.slotTile, active && ms.slotTileActive, blocked && ms.slotTileBlocked]}
                onPress={() => !blocked && onSlotToggle(slot)}
                disabled={blocked}
              >
                <ThemedText style={ms.slotTileIcon}>{SLOT_ICONS[slot] ?? '•'}</ThemedText>
                <ThemedText style={ms.slotTileName}>{slot}</ThemedText>
                <ThemedText style={[ms.slotTileValue, !selItem && !blocked && ms.slotTileEmpty]} numberOfLines={2}>
                  {blocked ? '🔒 Magic' : selItem ? (selItem.name ?? 'Unknown') : 'Empty'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Item picker — appears below the grid for the active slot */}
        {expandedSlot && !blockedSlots.has(expandedSlot) && (() => {
          const slot  = expandedSlot;
          const items = charGear.filter((g) => g.slot === slot);
          const selId = slotMap[slot] ?? null;
          return (
            <View style={ms.slotPicker}>
              <ThemedText style={ms.slotPickerTitle}>{SLOT_ICONS[slot]} {slot}</ThemedText>
              <Pressable
                style={[ms.slotPickerOption, selId === null && ms.slotPickerOptionSelected]}
                onPress={() => onSlotSelect(slot, null)}
              >
                <ThemedText style={[ms.slotPickerOptionText, selId === null && ms.slotPickerOptionTextSelected]}>
                  None
                </ThemedText>
              </Pressable>
              {items.length === 0 ? (
                <ThemedText style={ms.slotNoItems}>No items owned for this slot.</ThemedText>
              ) : (
                items.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[ms.slotPickerOption, selId === item.id && ms.slotPickerOptionSelected]}
                    onPress={() => onSlotSelect(slot, item.id)}
                  >
                    <ThemedText style={[ms.slotPickerOptionText, selId === item.id && ms.slotPickerOptionTextSelected]}>
                      {item.name ?? 'Unknown'}
                    </ThemedText>
                  </Pressable>
                ))
              )}
            </View>
          );
        })()}
      </View>

      <Pressable style={[ms.saveBtn, working && ms.dimmed]} onPress={onSave} disabled={working}>
        <ThemedText style={ms.saveBtnText}>{working ? 'Saving…' : 'Save Outfit'}</ThemedText>
      </Pressable>
    </View>
  );
}

// ─── Shared small components ──────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statPill}>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
    </View>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{label}</ThemedText>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { padding: 16, gap: 16 },
  flavor:           { fontSize: 13, color: '#9BA1A6', fontStyle: 'italic', lineHeight: 20 },
  errorText:        { color: '#B00020', fontSize: 13 },
  emptyText:        { fontSize: 13, color: '#9BA1A6', fontStyle: 'italic' },
  section:          { gap: 10 },
  sectionHeaderRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  sectionHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent:    { width: 3, height: 18, borderRadius: 2, backgroundColor: '#2E5A1C' },
  sectionTitle:     { fontSize: 15 },
  chipRow:          { gap: 10, paddingVertical: 4 },
  chip:             { alignItems: 'center', gap: 5, width: 72 },
  chipName:         { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  chipMeta:         { fontSize: 10, color: '#9BA1A6', textAlign: 'center' },
  genAllButton:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#5C3D8F', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  genAllButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  opinionCardRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  opinionToggle:    { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  opinionToggleLabel: { fontSize: 12, color: '#687076' },
  opinionBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#4A3728', borderRadius: 7, paddingVertical: 6, paddingHorizontal: 12 },
  opinionBtnText:   { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  card:        { borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 12, padding: 14, gap: 10 },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardMid:     { flex: 1, gap: 2 },
  cardRight:   { alignItems: 'center', backgroundColor: '#2E5A1C', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, minWidth: 48 },
  charName:    { fontSize: 16 },
  charMeta:    { fontSize: 12, color: '#687076' },
  xpText:      { fontSize: 11, color: '#9BA1A6' },
  hpLabel:     { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  hpValue:     { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  statRow:   { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statPill:  { borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, alignItems: 'center', minWidth: 40 },
  statLabel: { fontSize: 9, color: '#9BA1A6', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 13, fontWeight: '600' },

  description: { fontSize: 12, color: '#687076', fontStyle: 'italic', lineHeight: 18 },
  genError:    { fontSize: 12, color: '#B00020' },

  cardActions:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  portraitBtn:  { backgroundColor: '#5C3D8F' },
  outfitBtn:    { backgroundColor: '#2E5A6A' },
  actionBtnText:{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  dimmed:       { opacity: 0.6 },
});

// Modal styles (ms prefix to avoid collision)
const ms = StyleSheet.create({
  backdrop:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  sheet:         { backgroundColor: '#FFFFFF', borderRadius: 14, width: '90%', maxHeight: '85%', overflow: 'hidden' },

  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backBtn:       { width: 56 },
  backBtnText:   { color: '#4A3728', fontSize: 15, fontWeight: '500' },
  headerTitle:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerName:    { fontSize: 15 },
  closeBtn:      { width: 56, alignItems: 'flex-end' },
  closeBtnText:  { fontSize: 18, color: '#9BA1A6' },

  errorText:     { color: '#B00020', fontSize: 12, paddingHorizontal: 16, paddingTop: 8 },
  loadingRow:    { padding: 32, alignItems: 'center' },

  tabBar:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tab:           { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: '#4A3728' },
  tabText:       { fontSize: 13, color: '#9BA1A6' },
  tabTextActive: { color: '#4A3728', fontWeight: '700' },

  body:          { flexGrow: 0 },
  bodyContent:   { padding: 16, gap: 12 },

  // Items tab
  subSection:    { gap: 8 },
  subHeading:    { fontSize: 13, color: '#4A3728', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  itemInfo:      { flex: 1 },
  itemName:      { fontSize: 14, fontWeight: '600' },
  itemMeta:      { fontSize: 11, color: '#9BA1A6', textTransform: 'capitalize' },
  assignBtn:     { backgroundColor: '#4A3728', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 5 },
  returnBtn:     { backgroundColor: '#7A4A2A' },
  assignBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  emptyText:     { fontSize: 13, color: '#9BA1A6', fontStyle: 'italic' },

  // Outfits tab
  newOutfitBtn:     { backgroundColor: '#2E5A6A', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  newOutfitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outfitCard:       { borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 10, padding: 12 },
  outfitCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  outfitName:       { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  outfitCardActions:{ flexDirection: 'row', gap: 6, alignItems: 'center' },
  contextPill:      { alignSelf: 'flex-start', backgroundColor: 'rgba(74,55,40,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  contextPillText:  { fontSize: 11, color: '#4A3728', fontWeight: '600' },
  outfitImageHint:  { fontSize: 10, color: '#2E7D32', marginTop: 4 },
  noAvatarHint:     { fontSize: 10, color: '#9BA1A6', fontStyle: 'italic' },
  workingStepText:  { fontSize: 12, color: '#9BA1A6', fontStyle: 'italic', textAlign: 'center' },
  generateBtn:      { backgroundColor: '#5C3D8F', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4, minWidth: 32, alignItems: 'center', justifyContent: 'center' },
  generateBtnText:  { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  editBtn:          { backgroundColor: '#4A3728', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4 },
  editBtnText:      { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  deleteBtn:        { backgroundColor: '#B00020', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  deleteBtnText:    { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Outfit editor
  fieldGroup:    { gap: 6 },
  fieldLabel:    { fontSize: 12, color: '#9BA1A6', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput:     { borderWidth: 1, borderColor: '#D0D5D9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: '#1A1A1A' },

  contextChips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  contextChip:        { borderWidth: 1, borderColor: '#D0D5D9', borderRadius: 18, paddingVertical: 5, paddingHorizontal: 14 },
  contextChipActive:  { borderColor: '#4A3728', backgroundColor: 'rgba(74,55,40,0.08)' },
  contextChipText:    { fontSize: 13, color: '#687076' },
  contextChipTextActive: { color: '#4A3728', fontWeight: '700' },

  slotGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotTile:           { width: '47%', borderWidth: 1, borderColor: '#E0E4E7', borderRadius: 10, padding: 10, gap: 2, backgroundColor: '#FAFAFA', alignItems: 'center' },
  slotTileActive:     { borderColor: '#4A3728', backgroundColor: 'rgba(74,55,40,0.06)' },
  slotTileBlocked:    { opacity: 0.45 },
  slotTileIcon:       { fontSize: 20 },
  slotTileName:       { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: '#687076' },
  slotTileValue:      { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  slotTileEmpty:      { color: '#9BA1A6', fontStyle: 'italic' },

  slotPicker:              { marginTop: 4, borderWidth: 1, borderColor: '#4A3728', borderRadius: 10, overflow: 'hidden' },
  slotPickerTitle:         { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: '#4A3728', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(74,55,40,0.06)', textAlign: 'center' },
  slotPickerOption:        { paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  slotPickerOptionSelected:{ backgroundColor: 'rgba(74,55,40,0.08)' },
  slotPickerOptionText:    { fontSize: 14 },
  slotPickerOptionTextSelected: { color: '#4A3728', fontWeight: '700' },
  slotNoItems:             { fontSize: 12, color: '#9BA1A6', fontStyle: 'italic', paddingHorizontal: 14, paddingVertical: 8 },

  saveBtn:     { backgroundColor: '#2E5A1C', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  dimmed:      { opacity: 0.6 },
});
