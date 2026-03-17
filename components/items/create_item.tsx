import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { callKoboldApi } from '@/components/LLM/kobold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type GuildItem, type ItemStat } from '@/lib/local-db';

// ─── Data ─────────────────────────────────────────────────────────────────────

export type EquipmentType = { label: string; slot: string; type: string };

export const equipmentTypes: EquipmentType[] = [
  { label: 'Sword',      slot: 'weapon',  type: 'weapon'    },
  { label: 'Axe',        slot: 'weapon',  type: 'weapon'    },
  { label: 'Bow',        slot: 'weapon',  type: 'weapon'    },
  { label: 'Staff',      slot: 'weapon',  type: 'weapon'    },
  { label: 'Wand',       slot: 'weapon',  type: 'weapon'    },
  { label: 'Shield',     slot: 'offhand', type: 'armor'     },
  { label: 'Helmet',     slot: 'head',    type: 'armor'     },
  { label: 'Chestplate', slot: 'chest',   type: 'armor'     },
  { label: 'Gauntlets',  slot: 'hands',   type: 'armor'     },
  { label: 'Boots',      slot: 'feet',    type: 'armor'     },
  { label: 'Ring',       slot: 'ring',    type: 'accessory' },
  { label: 'Amulet',     slot: 'neck',    type: 'accessory' },
  { label: 'Belt',       slot: 'waist',   type: 'accessory' },
  { label: 'Cloak',      slot: 'back',    type: 'accessory' },
  { label: 'Bracers',    slot: 'wrist',   type: 'accessory' },
];

export const statOptions: { value: ItemStat; label: string }[] = [
  { value: 'hp',           label: 'HP'  },
  { value: 'ac',           label: 'AC'  },
  { value: 'strength',     label: 'STR' },
  { value: 'dexterity',    label: 'DEX' },
  { value: 'constitution', label: 'CON' },
  { value: 'intelligence', label: 'INT' },
  { value: 'wisdom',       label: 'WIS' },
  { value: 'charisma',     label: 'CHA' },
];

export const rarities = [
  { bonus: 1, label: 'Common',   color: '#687076' },
  { bonus: 2, label: 'Uncommon', color: '#2E7D32' },
  { bonus: 3, label: 'Rare',     color: '#9B30D9' },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function rarityColor(bonus: number): string {
  return rarities.find((r) => r.bonus === bonus)?.color ?? '#687076';
}

export function rarityLabel(bonus: number): string {
  return rarities.find((r) => r.bonus === bonus)?.label ?? 'Common';
}

function trimToLastSentence(text: string): string {
  const match = text.match(/^.*[.!?]/s);
  return match ? match[0].trim() : text;
}

function generateUid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type CreateItemProps = {
  onCreate: (item: GuildItem) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateItem({ onCreate }: CreateItemProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType | null>(null);
  const [selectedStat, setSelectedStat] = useState<ItemStat | null>(null);
  const [selectedBonus, setSelectedBonus] = useState<number | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState('');
  const [generatedItem, setGeneratedItem] = useState<GuildItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canGenerate =
    selectedEquipment !== null && selectedStat !== null && selectedBonus !== null;

  async function handleGenerate() {
    if (!selectedEquipment || !selectedStat || !selectedBonus) return;
    setGenerating(true);
    setGeneratedItem(null);
    setError(null);

    const statLabel = statOptions.find((s) => s.value === selectedStat)?.label ?? selectedStat;
    const rarity = rarities.find((r) => r.bonus === selectedBonus)!;

    try {
      setGeneratingStep('Generating name...');
      const namePrompt = [
        `Name a ${rarity.label.toLowerCase()} fantasy ${selectedEquipment.label.toLowerCase()} that enhances ${statLabel}.`,
        'Output only the name — no punctuation at the end, no quotes, no explanation.',
      ].join(' ');
      const name = (await callKoboldApi(namePrompt, 12))
        .split('\n')[0]
        .trim()
        .replace(/^["']|["']$/g, '');

      setGeneratingStep('Writing description...');
      const descPrompt = [
        `Write 1-2 sentences of flavour text for "${name}", a ${rarity.label.toLowerCase()} ${selectedEquipment.label.toLowerCase()}.`,
        'Describe its appearance or legend. No game mechanics, numbers, or stat bonuses. Output only the flavour text.',
      ].join(' ');
      const description = trimToLastSentence((await callKoboldApi(descPrompt, 80)).trim());

      setGeneratedItem({
        uid: generateUid(),
        name,
        slot: selectedEquipment.slot,
        description,
        type: selectedEquipment.type,
        stat: selectedStat,
        bonus: selectedBonus,
        characterUid: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setGenerating(false);
      setGeneratingStep('');
    }
  }

  function handleSave() {
    if (!generatedItem) return;
    onCreate(generatedItem);
    setGeneratedItem(null);
    setSelectedEquipment(null);
    setSelectedStat(null);
    setSelectedBonus(null);
  }

  return (
    <ThemedView style={styles.container}>
      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {/* ── Equipment Type ── */}
      <SectionHeader label="Equipment Type" />
      <View style={styles.chipGrid}>
        {equipmentTypes.map((eq) => {
          const selected = selectedEquipment?.label === eq.label;
          return (
            <Pressable
              key={eq.label}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setSelectedEquipment(selected ? null : eq)}
            >
              <ThemedText style={[styles.chipText, selected && styles.chipTextSelected]}>
                {eq.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* ── Stat ── */}
      <SectionHeader label="Stat" />
      <View style={styles.chipGrid}>
        {statOptions.map((stat) => {
          const selected = selectedStat === stat.value;
          return (
            <Pressable
              key={stat.value}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setSelectedStat(selected ? null : stat.value)}
            >
              <ThemedText style={[styles.chipText, selected && styles.chipTextSelected]}>
                {stat.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* ── Rarity ── */}
      <SectionHeader label="Rarity" />
      <View style={styles.chipGrid}>
        {rarities.map((r) => {
          const selected = selectedBonus === r.bonus;
          return (
            <Pressable
              key={r.bonus}
              style={[styles.chip, selected && { borderColor: r.color, backgroundColor: `${r.color}18` }]}
              onPress={() => setSelectedBonus(selected ? null : r.bonus)}
            >
              <ThemedText
                style={[styles.chipText, selected && { color: r.color, fontWeight: '700' }]}
              >
                {r.label}  +{r.bonus}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* ── Generate ── */}
      <Pressable
        style={[styles.generateButton, !canGenerate && styles.generateButtonDisabled]}
        onPress={() => void handleGenerate()}
        disabled={!canGenerate || generating}
      >
        <ThemedText style={styles.generateButtonText}>
          {generating ? generatingStep : 'Generate Item'}
        </ThemedText>
      </Pressable>

      {/* ── Preview ── */}
      {generatedItem ? (
        <ThemedView
          style={[styles.previewCard, { borderColor: rarityColor(generatedItem.bonus) }]}
        >
          <View style={styles.previewHeader}>
            <ThemedText
              type="defaultSemiBold"
              style={[styles.previewName, { color: rarityColor(generatedItem.bonus) }]}
            >
              {generatedItem.name}
            </ThemedText>
            <ThemedText style={[styles.rarityBadge, { color: rarityColor(generatedItem.bonus) }]}>
              {rarityLabel(generatedItem.bonus)}
            </ThemedText>
          </View>

          <ThemedText style={styles.previewDescription}>{generatedItem.description}</ThemedText>

          <View style={styles.previewMeta}>
            <MetaPill label={generatedItem.type} />
            <MetaPill label={generatedItem.slot} />
            <MetaPill
              label={`+${generatedItem.bonus} ${statOptions.find((s) => s.value === generatedItem.stat)?.label ?? generatedItem.stat}`}
            />
          </View>

          <View style={styles.previewActions}>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <ThemedText style={styles.saveButtonText}>Save Item</ThemedText>
            </Pressable>
            <Pressable
              style={styles.regenButton}
              onPress={() => void handleGenerate()}
              disabled={generating}
            >
              <ThemedText style={styles.regenButtonText}>Regenerate</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      ) : null}
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

function MetaPill({ label }: { label: string }) {
  return (
    <View style={styles.metaPill}>
      <ThemedText style={styles.metaPillText}>{label}</ThemedText>
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
  errorText: {
    color: '#B00020',
    fontSize: 13,
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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#D0D5D9',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: 'rgba(10, 126, 164, 0.08)',
  },
  chipText: {
    fontSize: 13,
    color: '#687076',
  },
  chipTextSelected: {
    color: '#0a7ea4',
    fontWeight: '700',
  },
  generateButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  generateButtonDisabled: {
    backgroundColor: '#D0D5D9',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  previewCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewName: {
    fontSize: 18,
    flex: 1,
  },
  rarityBadge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewDescription: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#687076',
    lineHeight: 20,
  },
  previewMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  regenButton: {
    borderWidth: 1,
    borderColor: '#D0D5D9',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  regenButtonText: {
    color: '#687076',
    fontSize: 14,
  },
  metaPill: {
    backgroundColor: '#F0F2F4',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  metaPillText: {
    fontSize: 12,
    color: '#687076',
  },
});
