import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getQueueState, subscribeToQueue, type QueueState } from '@/lib/llm-queue';
import { ThemedText } from '@/components/themed-text';

export function LLMStatusBadge() {
  const [state, setState] = useState<QueueState>(getQueueState);
  const insets = useSafeAreaInsets();

  useEffect(() => subscribeToQueue(setState), []);

  const queuedSuffix = state.queued > 0 ? ` (+${state.queued})` : '';
  const label = state.currentLabel
    ? `${state.currentLabel}${queuedSuffix}`
    : `Working...${queuedSuffix}`;

  return (
    <Modal visible={state.busy} transparent animationType="none" statusBarTranslucent>
      <View style={[styles.overlay, { pointerEvents: 'box-none' } as object]}>
        <View style={[styles.badge, { top: insets.top + (Platform.OS === 'android' ? 8 : 6) }]}>
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
    backgroundColor: 'rgba(58, 45, 92, 0.92)',
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
