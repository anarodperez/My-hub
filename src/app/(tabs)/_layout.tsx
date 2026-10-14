import { router, Tabs } from 'expo-router';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { isLoaded } from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookmarkSimpleIcon, CalendarBlankIcon, CreditCardIcon, HouseIcon, UserCircleIcon, BookOpenIcon } from '@/components/hub-icons';
import { usePalette } from '@/features/hub/provider';
import { Copy } from '@/components/hub-ui';
import { getHubLayout } from '@/features/hub/layout';
import { hubWidths } from '@/constants/hub-design';

export default function TabLayout() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const { sidebar } = getHubLayout(width, fontScale);
  return <Tabs tabBar={(props) => sidebar ? <View style={{ width: hubWidths.sidebar, backgroundColor: p.surface, borderRightWidth: 1, borderRightColor: p.line, paddingTop: insets.top }}>
    <View style={{ padding: 24, flexDirection: 'row', alignItems: 'center', gap: 8 }}><BookOpenIcon size={23} color={p.accent} weight="duotone" /><Copy style={{ fontSize: 23, fontWeight: '700' }}>my hub<Copy style={{ color: p.accent }}>.</Copy></Copy></View>
    <View style={{ flex: 1, padding: 12 }}>
      {props.state.routes.map((route, index) => {
        const focused = props.state.index === index;
        const options = props.descriptors[route.key].options;
        const title = options.title || route.name;
        return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={'Ir a ' + title} accessibilityState={{ selected: focused }} onPress={() => {
          const event = props.navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) props.navigation.navigate(route.name, route.params);
        }} onLongPress={() => props.navigation.emit({ type: 'tabLongPress', target: route.key })} style={({ pressed }) => ({ minHeight: 52, marginBottom: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: focused || pressed ? p.soft : 'transparent' })}>
          {options.tabBarIcon?.({ focused, color: focused ? p.accent : p.muted, size: 24 })}<Copy style={{ flexShrink: 1, fontSize: 15, fontWeight: focused ? '600' : '400', color: focused ? p.accent : p.muted }}>{title}</Copy>
        </Pressable>;
      })}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir mi perfil" onPress={() => router.push('/settings')} style={({ pressed }) => ({ minHeight: 56, margin: 16, marginBottom: 16 + insets.bottom, paddingHorizontal: 12, gap: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: pressed ? p.soft : 'transparent' })}><UserCircleIcon size={23} color={p.accent} /><Copy>Mi perfil</Copy></Pressable>
  </View> : <BottomTabBar {...props} />} screenOptions={{ headerShown: false, tabBarPosition: sidebar ? 'left' : 'bottom', tabBarActiveTintColor: p.accent, tabBarInactiveTintColor: p.muted, tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.line, height: 66 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8) }, tabBarItemStyle: { flex: 1, minWidth: 48 }, tabBarLabelPosition: 'below-icon', tabBarLabelStyle: { fontFamily: isLoaded('SourceSans3-SemiBold') ? 'SourceSans3-SemiBold' : undefined, fontSize: 12, marginTop: 3 }, sceneStyle: { backgroundColor: p.background } }}>
    <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color, focused }) => <HouseIcon color={color} size={24} weight={focused ? 'fill' : 'regular'} /> }} />
    <Tabs.Screen name="library" options={{ title: 'Wishlist', tabBarIcon: ({ color, focused }) => <BookmarkSimpleIcon color={color} size={24} weight={focused ? 'fill' : 'regular'} /> }} />
    <Tabs.Screen name="calendar" options={{ title: 'Calendario', tabBarIcon: ({ color, focused }) => <CalendarBlankIcon color={color} size={24} weight={focused ? 'fill' : 'regular'} /> }} />
    <Tabs.Screen name="subscriptions" options={{ title: 'Suscripciones', tabBarIcon: ({ color, focused }) => <CreditCardIcon color={color} size={24} weight={focused ? 'fill' : 'regular'} /> }} />
  </Tabs>;
}
