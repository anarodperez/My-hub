import { Tabs } from 'expo-router';
import { usePalette } from '@/features/hub/provider';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export default function TabLayout() {
  const p = usePalette();
  const reducedMotion = useReducedMotion();
  return <Tabs tabBar={() => null} screenOptions={{ headerShown: false, animation: reducedMotion ? 'none' : 'fade', sceneStyle: { backgroundColor: p.background } }}>
    <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
    <Tabs.Screen name="library" options={{ title: 'Wishlist' }} />
    <Tabs.Screen name="calendar" options={{ title: 'Calendario' }} />
    <Tabs.Screen name="friends" options={{ title: 'Amigas' }} />
  </Tabs>;
}
