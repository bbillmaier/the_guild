import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

export default function AdminAdventuresScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <ThemedText style={styles.backText}>← Back</ThemedText>
        </Pressable>
        <View>
          <ThemedText style={styles.title}>Adventures</ThemedText>
          <ThemedText style={styles.subtitle}>Quests &amp; Combat</ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.navRow}>
          <NavCard label="Quests"       sub="Generate adventures"      color="#7A4F1E" onPress={() => router.push('/view_quests')} />
          <NavCard label="Enemies"      sub="Track your foes"          color="#7A4F1E" onPress={() => router.push('/view_enemy_list')} />
        </View>
        <View style={styles.navRow}>
          <NavCard label="Roleplay"     sub="Quest scenarios"          color="#7A4F1E" onPress={() => router.push('/view_roleplay_prompts')} />
          <NavCard label="Guild Events" sub="Random daily moments"     color="#7A4F1E" onPress={() => router.push('/view_guild_events')} />
        </View>
        <View style={styles.navRow}>
          <NavCard label="Combat"       sub="Testing tool"             color="#7A4F1E" onPress={() => router.push('/view_combat')} />
          <View style={{ flex: 1 }} />
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
  header:       { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#7A4F1E', paddingHorizontal: 16, paddingVertical: 14 },
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
