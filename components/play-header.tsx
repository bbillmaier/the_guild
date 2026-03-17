import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackHeaderProps } from '@react-navigation/stack';

import { ThemedText } from '@/components/themed-text';
import { getResource } from '@/lib/local-db';

const RESOURCES = [
  { key: 'gold',   icon: '🪙', label: 'Gold'   },
  { key: 'lumber', icon: '🪵', label: 'Lumber' },
  { key: 'stone',  icon: '🪨', label: 'Stone'  },
  { key: 'mana',   icon: '✨', label: 'Mana'   },
] as const;

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.floor(n));
}

export function PlayHeader({ navigation, options, back }: StackHeaderProps) {
  const insets = useSafeAreaInsets();
  const [gold, setGold] = useState(0);

  useEffect(() => {
    void getResource('gold').then(setGold);
  }, []);

  const values: Record<string, number> = { gold, lumber: 0, stone: 0, mana: 0 };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Title row ── */}
      <View style={styles.titleRow}>
        {back ? (
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ThemedText style={styles.backText}>‹ Back</ThemedText>
          </Pressable>
        ) : <View style={styles.backBtn} />}

        <ThemedText style={styles.title} numberOfLines={1}>
          {options.title ?? ''}
        </ThemedText>

        <View style={styles.backBtn} />
      </View>

      {/* ── Resource strip ── */}
      <View style={styles.resourceRow}>
        {RESOURCES.map((r) => (
          <View key={r.key} style={styles.resourceChip}>
            <ThemedText style={styles.resourceIcon}>{r.icon}</ThemedText>
            <View style={styles.resourceText}>
              <ThemedText style={styles.resourceLabel}>{r.label}</ThemedText>
              <ThemedText style={styles.resourceValue}>{fmt(values[r.key])}</ThemedText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#2C1A0E',
    borderBottomWidth: 1,
    borderBottomColor: '#4A3020',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 70,
  },
  backText: {
    color: '#D4A96A',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#F5ECD7',
    fontSize: 17,
    fontWeight: '700',
  },
  resourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#3D2410',
  },
  resourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resourceIcon: {
    fontSize: 16,
  },
  resourceText: {
    alignItems: 'center',
  },
  resourceLabel: {
    fontSize: 9,
    color: '#A07850',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resourceValue: {
    fontSize: 13,
    color: '#F5ECD7',
    fontWeight: '700',
  },
});
