import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

export default function AdminWorldScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <ThemedText style={styles.backText}>← Back</ThemedText>
        </Pressable>
        <View>
          <ThemedText style={styles.title}>World</ThemedText>
          <ThemedText style={styles.subtitle}>Zones, NPCs &amp; Factions</ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.navRow}>
          <NavCard label="Zones" sub="World regions"   color="#2E5A1C" onPress={() => router.push('/view_zones')} />
          <NavCard label="NPCs"  sub="World characters" color="#2E5A1C" onPress={() => router.push('/view_npcs')} />
        </View>
      </ScrollView>
    </View>
  );
}

function NavCard({ label, sub, color, onPress }: { label: string; sub: string; color: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.navCard, { backgroundColor: color }]} onPress={onPress}>
      <ThemedText style={styles.navCardTitle}>{label}</ThemedText>
      <ThemedText style={styles.navCardSub}>{sub}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#F8F9FA' },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#2E5A1C', paddingHorizontal: 16, paddingVertical: 14 },
  back:         { paddingVertical: 4, paddingRight: 4 },
  backText:     { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  title:        { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  subtitle:     { fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 },
  container:    { padding: 16, gap: 12, paddingBottom: 40 },
  navRow:       { flexDirection: 'row', gap: 12 },
  navCard:      { flex: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, gap: 3 },
  navCardTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  navCardSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
});
