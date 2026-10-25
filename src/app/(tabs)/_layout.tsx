import { UsersThreeIcon } from 'phosphor-react-native/src/icons/UsersThree';
import { router, Tabs } from 'expo-router';
import { PixelRatio, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookmarkSimpleIcon, CalendarBlankIcon, HouseIcon, UserCircleIcon, BookOpenIcon } from '@/components/hub-icons';
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
  </View> : <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', backgroundColor: p.surface, borderTopWidth: 1, borderTopColor: p.line, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8), paddingHorizontal: Math.max(insets.left, insets.right) }}>
    {props.state.routes.map((route, index) => {
      const focused = props.state.index === index;
      const options = props.descriptors[route.key].options;
      const title = options.title || route.name;
      const color = focused ? p.accent : p.muted;
      return <Pressable key={route.key} hitSlop={{ left: 16, right: 16 }} accessibilityRole="tab" accessibilityLabel={'Ir a ' + title} accessibilityState={{ selected: focused }} onPress={() => {
        const event = props.navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!focused && !event.defaultPrevented) props.navigation.navigate(route.name, route.params);
      }} onLongPress={() => props.navigation.emit({ type: 'tabLongPress', target: route.key })} style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', alignItems: 'center', gap: 3, opacity: pressed ? 0.65 : 1 })}>
        <View style={{ width: 0, height: 24, alignItems: 'center' }}>{options.tabBarIcon?.({ focused, color, size: 24 })}</View>
        <Copy numberOfLines={1} style={{ color, fontSize: 10, lineHeight: 14, fontWeight: '600', textAlign: 'center', transform: [{ translateX: (index === 0 || index === props.state.routes.length - 1 ? -1 : 0) / PixelRatio.get() }] }}>{title}</Copy>
      </Pressable>;
    })}
  </View>} screenOptions={{ headerShown: false, tabBarPosition: sidebar ? 'left' : 'bottom', sceneStyle: { backgroundColor: p.background } }}>
    <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color, focused }) => <HouseIcon color={color} size={24} weight={focused ? 'fill' : 'regular'} /> }} />
    <Tabs.Screen name="library" options={{ title: 'Wishlist', tabBarIcon: ({ color, focused }) => <BookmarkSimpleIcon color={color} size={24} weight={focused ? 'fill' : 'regular'} /> }} />
    <Tabs.Screen name="calendar" options={{ title: 'Calendario', tabBarIcon: ({ color, focused }) => <CalendarBlankIcon color={color} size={24} weight={focused ? 'fill' : 'regular'} /> }} />
    <Tabs.Screen name="friends" options={{ title: 'Amigas', tabBarAccessibilityLabel: 'Amigas', tabBarIcon: ({ color, focused }) => <UsersThreeIcon color={color} size={24} weight={focused ? 'fill' : 'regular'} /> }} />
  </Tabs>;
}
