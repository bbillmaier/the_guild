import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  getRelationshipLabel,
  initializeDatabase,
  listGuildCharacters,
  listOpinionsForCharacter,
  listRelationshipsForCharacter,
  setRelationshipScore,
  type CharacterOpinion,
  type CharacterRelationship,
  type GuildCharacter,
} from '@/lib/local-db';

export default function ViewRelationshipsScreen() {
  const [characters, setCharacters] = useState<GuildCharacter[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([]);
  const [opinions, setOpinions] = useState<CharacterOpinion[]>([]);
  const [expandedOpinionUid, setExpandedOpinionUid] = useState<string | null>(null);
  const [editingRelUid, setEditingRelUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setError(null);
      await initializeDatabase();
      const chars = await listGuildCharacters();
      setCharacters(chars);
      if (chars.length > 0 && !selectedUid) {
        await loadRelationships(chars[0].uid, chars);
        setSelectedUid(chars[0].uid);
      }
    } catch (err) {
      setError('Could not load characters.');
      console.error(err);
    }
  }

  async function loadRelationships(uid: string, chars: GuildCharacter[]) {
    try {
      const [rels, ops] = await Promise.all([
        listRelationshipsForCharacter(uid),
        listOpinionsForCharacter(uid),
      ]);
      setOpinions(ops);
      // Attach a score of 0 for every character that has no row yet.
      const existing = new Map(rels.map((r) => {
        const other = r.charA === uid ? r.charB : r.charA;
        return [other, r.score];
      }));
      const others = chars.filter((c) => c.uid !== uid);
      const full = others.map((c) => ({
        charA: uid,
        charB: c.uid,
        score: existing.get(c.uid) ?? 0,
      }));
      // Sort: highest score first, then alphabetically
      full.sort((a, b) => b.score - a.score || 0);
      setRelationships(full);
    } catch (err) {
      setError('Could not load relationships.');
      console.error(err);
    }
  }

  async function handleSelectCharacter(uid: string) {
    setSelectedUid(uid);
    setEditingRelUid(null);
    await loadRelationships(uid, characters);
  }

  async function handleSetScore(otherUid: string, score: number) {
    if (!selectedUid) return;
    await setRelationshipScore(selectedUid, otherUid, score);
    setRelationships((prev) =>
      prev.map((r) => (r.charB === otherUid ? { ...r, score } : r))
    );
  }

  const selected = characters.find((c) => c.uid === selectedUid);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Relationships</ThemedText>
      <ThemedText style={styles.hint}>Character relationship scores and standing</ThemedText>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {/* ── Character selector ── */}
      <View style={styles.card}>
        <SectionHeader label="Select Character" />
        {characters.length === 0 ? (
          <ThemedText style={styles.emptyText}>No characters found.</ThemedText>
        ) : (
          <View style={styles.chipRow}>
            {characters.map((c) => (
              <Pressable
                key={c.uid}
                style={[styles.charChip, selectedUid === c.uid && styles.charChipSelected]}
                onPress={() => void handleSelectCharacter(c.uid)}
              >
                <ThemedText style={[styles.charChipText, selectedUid === c.uid && styles.charChipTextSelected]}>
                  {c.characterName}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* ── Relationship list ── */}
      {selected ? (
        <View style={styles.card}>
          <SectionHeader label={`${selected.characterName}'s Relationships`} />
          {relationships.length === 0 ? (
            <ThemedText style={styles.emptyText}>
              No other characters to compare. Add more party members first.
            </ThemedText>
          ) : (
            relationships.map((rel) => {
              const otherUid = rel.charB;
              const other = characters.find((c) => c.uid === otherUid);
              if (!other) return null;
              const { label, color } = getRelationshipLabel(rel.score);
              const editing = editingRelUid === otherUid;
              return (
                <View key={otherUid} style={styles.relRow}>
                  <View style={styles.relInfo}>
                    <ThemedText style={styles.relName}>{other.characterName}</ThemedText>
                    <View style={[styles.labelBadge, { backgroundColor: color }]}>
                      <ThemedText style={styles.labelText}>{label}</ThemedText>
                    </View>
                  </View>
                  <Pressable onPress={() => setEditingRelUid(editing ? null : otherUid)}>
                    <ScoreBar score={rel.score} />
                  </Pressable>
                  {editing && (
                    <View style={styles.scorePicker}>
                      {SCORE_RANGE.map((s) => {
                        const { color: c } = getRelationshipLabel(s);
                        const active = rel.score === s;
                        return (
                          <Pressable
                            key={s}
                            style={[styles.scoreBtn, active && { backgroundColor: c }]}
                            onPress={() => void handleSetScore(otherUid, s)}
                          >
                            <ThemedText style={[styles.scoreBtnText, active && styles.scoreBtnTextActive]}>
                              {s > 0 ? `+${s}` : `${s}`}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      ) : null}

      {/* ── Opinions ── */}
      {selected && opinions.length > 0 ? (
        <View style={styles.card}>
          <SectionHeader label={`${selected.characterName}'s Opinions`} />
          {opinions.map((op) => (
            <Pressable
              key={op.uid}
              style={styles.opinionRow}
              onPress={() => setExpandedOpinionUid(expandedOpinionUid === op.uid ? null : op.uid)}
            >
              <View style={styles.opinionHeader}>
                <ThemedText style={styles.opinionTarget}>{op.targetName}</ThemedText>
                <ThemedText style={styles.opinionChevron}>{expandedOpinionUid === op.uid ? '▲' : '▼'}</ThemedText>
              </View>
              {expandedOpinionUid === op.uid ? (
                <ThemedText style={styles.opinionText}>{op.opinion}</ThemedText>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : selected ? (
        <View style={styles.card}>
          <SectionHeader label={`${selected.characterName}'s Opinions`} />
          <ThemedText style={styles.emptyText}>
            No opinions generated yet. Use the Barracks screen to generate opinions.
          </ThemedText>
        </View>
      ) : null}

      {/* ── Legend ── */}
      <View style={styles.card}>
        <SectionHeader label="Score Legend" />
        {LEGEND_ROWS.map(({ range, label, color }) => (
          <View key={label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <ThemedText style={styles.legendRange}>{range}</ThemedText>
            <ThemedText style={styles.legendLabel}>{label}</ThemedText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const SCORE_RANGE = [-100, -60, -30, -10, 0, 10, 30, 60, 100];

const LEGEND_ROWS = [
  { range: '−60 or less', label: 'Bitter enemies',   color: '#8B0000' },
  { range: '−59 to −30',  label: 'Strong dislike',   color: '#C0392B' },
  { range: '−29 to −10',  label: 'Cold and distant', color: '#E67E22' },
  { range: '−9 to +9',    label: 'Neutral',          color: '#9BA1A6' },
  { range: '+10 to +29',  label: 'Cordial',          color: '#27AE60' },
  { range: '+30 to +59',  label: 'Friendly',         color: '#1E8449' },
  { range: '+60 or more', label: 'Close bonds',      color: '#0a7ea4' },
];

/** Visual bar showing the score as a filled segment centred on 0. */
function ScoreBar({ score }: { score: number }) {
  const { color } = getRelationshipLabel(score);
  const clamp = Math.max(-100, Math.min(100, score));
  const half = 80; // px for each half
  const barWidth = Math.abs(clamp) * (half / 100);
  const isPos = clamp >= 0;
  return (
    <View style={styles.barOuter}>
      {/* Negative half (left) */}
      <View style={[styles.barHalf, styles.barLeft]}>
        {!isPos && (
          <View style={[styles.barFill, { width: barWidth, backgroundColor: color, alignSelf: 'flex-end' }]} />
        )}
      </View>
      {/* Centre line */}
      <View style={styles.barCenter} />
      {/* Positive half (right) */}
      <View style={[styles.barHalf, styles.barRight]}>
        {isPos && (
          <View style={[styles.barFill, { width: barWidth, backgroundColor: color, alignSelf: 'flex-start' }]} />
        )}
      </View>
      <ThemedText style={[styles.scoreLabel, { color }]}>
        {score > 0 ? `+${score}` : `${score}`}
      </ThemedText>
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
  emptyText: {
    color: '#9BA1A6',
    fontSize: 13,
    fontStyle: 'italic',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E0E4E7',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    backgroundColor: '#FFFFFF',
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
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  charChip: {
    borderWidth: 1,
    borderColor: '#D0D5D9',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  charChipSelected: {
    borderColor: '#3A2D5C',
    backgroundColor: '#3A2D5C',
  },
  charChipText: {
    fontSize: 13,
    color: '#687076',
  },
  charChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  relRow: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
    gap: 6,
  },
  relInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  relName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
    flex: 1,
  },
  labelBadge: {
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // Score bar
  barOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  barHalf: {
    width: 80,
    height: 8,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  barLeft: {
    borderRadius: 4,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  barRight: {
    borderRadius: 4,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  barCenter: {
    width: 2,
    height: 16,
    backgroundColor: '#D0D5D9',
    borderRadius: 1,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'right',
  },
  // Score picker
  scorePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 8,
  },
  scoreBtn: {
    minWidth: 46,
    height: 32,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0D5D9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F8',
  },
  scoreBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#687076',
  },
  scoreBtnTextActive: {
    color: '#FFFFFF',
  },
  // Opinions
  opinionRow: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
    gap: 6,
  },
  opinionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  opinionTarget: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
  },
  opinionChevron: {
    fontSize: 11,
    color: '#9BA1A6',
  },
  opinionText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
    marginTop: 4,
  },
  // Legend
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 3,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendRange: {
    fontSize: 12,
    color: '#687076',
    width: 80,
  },
  legendLabel: {
    fontSize: 13,
    color: '#11181C',
    fontWeight: '500',
  },
});
