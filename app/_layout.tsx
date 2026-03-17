import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { LLMStatusBadge } from '@/components/llm-status-badge';
import { GlobalLightbox } from '@/components/global-lightbox';
import { GenerationStatusBadge } from '@/components/generation-status-badge';
import { QuestRunnerProvider } from '@/contexts/quest-runner';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <QuestRunnerProvider>
        <View style={{ flex: 1 }}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="play" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="view_char_list" options={{ title: 'Character List' }} />
            <Stack.Screen name="view_meta_desc" options={{ title: 'MetaDesc Table' }} />
          </Stack>
          <StatusBar style="auto" />
          <LLMStatusBadge />
          <GenerationStatusBadge />
          <GlobalLightbox />
        </View>
      </QuestRunnerProvider>
    </ThemeProvider>
  );
}
