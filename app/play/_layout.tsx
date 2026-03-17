import { Stack } from 'expo-router';

import { PlayHeader } from '@/components/play-header';

export default function PlayLayout() {
  return (
    <Stack screenOptions={{ header: (props) => <PlayHeader {...props} /> }}>
      <Stack.Screen name="index"    options={{ title: 'The Tavern' }} />
      <Stack.Screen name="armory"   options={{ title: 'Armory' }} />
      <Stack.Screen name="barracks" options={{ title: 'Barracks' }} />
      <Stack.Screen name="shop"     options={{ title: 'The Market' }} />
      <Stack.Screen name="chat"      options={{ title: 'Chat' }} />
      <Stack.Screen name="quest-log" options={{ title: 'Quest Log' }} />
    </Stack>
  );
}
