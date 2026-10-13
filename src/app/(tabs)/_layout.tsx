import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookmarkSimpleIcon, CalendarBlankIcon, CreditCardIcon, HouseIcon } from '@/components/hub-icons';
import { usePalette } from '@/features/hub/provider';

export default function TabLayout() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: p.accent, tabBarInactiveTintColor: p.muted, tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.line, height: 66 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8) }, tabBarItemStyle: { flex: 0, minWidth: 48, marginHorizontal: 'auto' }, tabBarLabelPosition: 'below-icon', tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 3 }, sceneStyle: { backgroundColor: p.background } }}>
    <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color, focused }) => <HouseIcon color={color} size={24} weight={focused ? 'fill' : 'regular'} /> }} />
    <Tabs.Screen name="library" options={{ title: 'Wishlist', tabBarIcon: ({ color, focused }) => <BookmarkSimpleIcon color={color} size={24} weight={focused ? 'fill' : 'regular'} /> }} />
    <Tabs.Screen name="calendar" options={{ title: 'Calendario', tabBarIcon: ({ color, focused }) => <CalendarBlankIcon color={color} size={24} weight={focused ? 'fill' : 'regular'} /> }} />
    <Tabs.Screen name="subscriptions" options={{ title: 'Suscripciones', tabBarIcon: ({ color, focused }) => <CreditCardIcon color={color} size={24} weight={focused ? 'fill' : 'regular'} /> }} />
  </Tabs>;
}
