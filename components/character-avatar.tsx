import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Props = {
  name: string;
  avatarPath: string | null;
  size?: number;
  /** Background colour for the letter fallback */
  color?: string;
};

/**
 * Circular avatar — shows the image at avatarPath if available,
 * otherwise falls back to the first letter of the name.
 */
export function CharacterAvatar({ name, avatarPath, size = 52, color = '#2E5A1C' }: Props) {
  const radius = size / 2;

  if (avatarPath) {
    return (
      <Image
        source={{ uri: avatarPath }}
        style={[styles.image, { width: size, height: size, borderRadius: radius }]}
        contentFit="cover"
        transition={200}
      />
    );
  }

  return (
    <View style={[styles.letter, { width: size, height: size, borderRadius: radius, backgroundColor: color }]}>
      <ThemedText style={[styles.letterText, { fontSize: size * 0.42 }]}>
        {name.charAt(0).toUpperCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    overflow: 'hidden',
  },
  letter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
