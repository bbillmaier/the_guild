import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

export default function AdminCharactersScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <ThemedText style={styles.backText}>← Back</ThemedText>
        </Pressable>
        <View>
          <ThemedText style={styles.title}>Characters</ThemedText>
          <ThemedText style={styles.subtitle}>Party Management</ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.navRow}>
          <NavCard label="Characters"    sub="Manage your party"        color="#0a7ea4" onPress={() => router.push('/view_char_list')} />
          <NavCard label="Relationships" sub="Character bond scores"    color="#0a7ea4" onPress={() => router.push('/view_relationships')} />
        </View>
        <View style={styles.navRow}>
          <NavCard label="History"       sub="Character memories"       color="#0a7ea4" onPress={() => router.push('/view_history')} />
          <NavCard label="Clothing"      sub="Manage mundane items"     color="#0a7ea4" onPress={() => router.push('/view_mundane_items')} />
        </View>
        <View style={styles.navRow}>
          <NavCard label="Items"         sub="Forge equipment"          color="#0a7ea4" onPress={() => router.push('/view_items')} />
          <NavCard label="Equip"         sub="Assign items"             color="#0a7ea4" onPress={() => router.push('/view_equip_items')} />
        </View>
        <View style={styles.navRow}>
          <NavCard label="Greetings"     sub="Chat opening lines"       color="#0a7ea4" onPress={() => router.push('/view_greetings')} />
          <NavCard label="Group Scenes"  sub="Party chat openers"       color="#0a7ea4" onPress={() => router.push('/view_group_greetings')} />
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
  header:       { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#0a7ea4', paddingHorizontal: 16, paddingVertical: 14 },
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
