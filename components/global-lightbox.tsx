import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

/**
 * Attaches a global shift+click listener to any <img> element in the app.
 * When triggered, opens the image in a centred lightbox capped at 80% of the
 * viewport so it never bleeds off screen.
 *
 * Usage: mount once in the root layout, no props required.
 */
export function GlobalLightbox() {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!e.shiftKey) return;
      const target = e.target as HTMLElement;
      const img = target.tagName === 'IMG' ? (target as HTMLImageElement) : null;
      if (!img?.src) return;
      e.preventDefault();
      e.stopPropagation();
      setUri(img.src);
    }

    window.addEventListener('click', handleClick, { capture: true });
    return () => window.removeEventListener('click', handleClick, { capture: true });
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setUri(null);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={() => setUri(null)}>
      <Pressable style={styles.backdrop} onPress={() => setUri(null)}>
        <View style={styles.imageContainer}>
          {uri ? (
            <Image source={{ uri }} style={styles.image} contentFit="contain" />
          ) : null}
        </View>
        <Pressable style={styles.closeBtn} onPress={() => setUri(null)}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: '80%',
    height: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
