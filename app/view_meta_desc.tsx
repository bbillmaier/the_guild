import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  clearGuildMetaDescriptions,
  initializeDatabase,
  listGuildMetaDescriptions,
  seedGuildMetaDescriptions,
  type GuildMetaDesc,
} from '@/lib/local-db';

export default function ViewMetaDescScreen() {
  const [rows, setRows] = useState<GuildMetaDesc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      await initializeDatabase();
      const data = await listGuildMetaDescriptions();
      setRows(data);
    } catch (loadError) {
      setError('Could not load meta descriptions.');
      console.error(loadError);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSeedNow() {
    try {
      setSeedStatus(null);
      setError(null);
      await seedGuildMetaDescriptions();
      await load();
      setSeedStatus('Seed complete.');
    } catch (seedError) {
      setSeedStatus('Seed failed.');
      setError('Could not seed meta descriptions.');
      console.error(seedError);
    }
  }

  async function handleClearTable() {
    try {
      setSeedStatus(null);
      setError(null);
      await clearGuildMetaDescriptions();
      await load();
      setSeedStatus('Table cleared.');
    } catch (clearError) {
      setSeedStatus('Clear failed.');
      setError('Could not clear meta descriptions.');
      console.error(clearError);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">MetaDesc Table</ThemedText>
      <ThemedText>/view_meta_desc</ThemedText>
      <ThemedText type="defaultSemiBold">Row count: {rows.length}</ThemedText>
      <Pressable style={styles.seedButton} onPress={() => void handleSeedNow()}>
        <ThemedText style={styles.seedButtonText}>Seed Now</ThemedText>
      </Pressable>
      <Pressable style={styles.clearButton} onPress={() => void handleClearTable()}>
        <ThemedText style={styles.clearButtonText}>Clear Table</ThemedText>
      </Pressable>
      {seedStatus ? <ThemedText>{seedStatus}</ThemedText> : null}

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      {rows.length === 0 ? (
        <ThemedView style={styles.card}>
          <ThemedText>No rows found.</ThemedText>
        </ThemedView>
      ) : (
        rows.map((row) => (
          <ThemedView key={row.uid} style={styles.card}>
            <ThemedText type="defaultSemiBold">
              {row.uid} | {row.name}
            </ThemedText>
            <ThemedText>
              stat: {row.stat ?? '(null)'} | mode: {row.mode ?? '(null)'}
            </ThemedText>
            <ThemedText>{row.description || '(empty)'}</ThemedText>
          </ThemedView>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#687076',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  errorText: {
    color: '#B00020',
  },
  seedButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  seedButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#B00020',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
