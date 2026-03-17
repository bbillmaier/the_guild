import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGenerationState, subscribeToGeneration, type GenerationState } from '@/lib/generation-queue';
import { ThemedText } from '@/components/themed-text';

export function GenerationStatusBadge() {
  const [state, setState] = useState<GenerationState>(getGenerationState);
  const insets = useSafeAreaInsets();

  useEffect(() => subscribeToGeneration(setState), []);

  const queuedSuffix = state.queued > 0 ? ` (+${state.queued})` : '';
  const label = state.currentLabel
    ? `${state.currentLabel}${queuedSuffix}`
    : `Generating...${queuedSuffix}`;

  return (
    <Modal visible={state.busy} transparent animationType="none" statusBarTranslucent>
      <View style={[styles.overlay, { pointerEvents: 'box-none' } as object]}>
        <View style={[styles.badge, { top: insets.top + (Platform.OS === 'android' ? 8 : 6) + 36 }]}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <ThemedText style={styles.text} numberOfLines={1}>{label}</ThemedText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(92, 61, 143, 0.92)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    maxWidth: 260,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
