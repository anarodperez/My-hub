import { router, usePathname } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UsersThreeIcon } from 'phosphor-react-native/src/icons/UsersThree';
import { BookmarkSimpleIcon, CalendarBlankIcon, HouseIcon } from './hub-icons';
import { Copy } from './hub-ui';
import { HubMark } from './hub-mark';
import { ProfileAvatar } from './profile-avatar';
import { useHub, usePalette } from '@/features/hub/provider';
import { getHubLayout } from '@/features/hub/layout';
import { hubWidths } from '@/constants/hub-design';
import { MotionContent } from './hub-motion';
import { webMotion } from './web-motion';

const destinations = [
  { href: '/' as const, label: 'Inicio', description: 'Lo que compartimos', Icon: HouseIcon },
  { href: '/library' as const, label: 'Wishlist', description: 'Tus próximos favoritos', Icon: BookmarkSimpleIcon },
  { href: '/calendar' as const, label: 'Calendario', description: 'Planes por venir', Icon: CalendarBlankIcon },
  { href: '/friends' as const, label: 'Amigas', description: 'Tu círculo, más cerca', Icon: UsersThreeIcon },
];

export function AppShell({ children, authenticated }: { children: ReactNode; authenticated: boolean }) {
  const p = usePalette();
  const { state } = useHub();
  const pathname = usePathname();
  const { width, fontScale } = useWindowDimensions();
  const { sidebar } = getHubLayout(width, fontScale);
  const NavigationRegion = sidebar ? ScrollView : View;
  const insets = useSafeAreaInsets();
  const [focused, setFocused] = useState('');
  const [hovered, setHovered] = useState('');
  const editor = ['/compose', '/group-post', '/wish', '/review', '/song'].includes(pathname);
  const visible = authenticated && pathname !== '/account' && (sidebar || !editor);
  const active = pathname.startsWith('/group') ? '/friends'
    : pathname.startsWith('/discovery/') ? '/'
    : pathname === '/wish' || pathname === '/review' ? '/library' : pathname;
  const navigation = visible && <View style={sidebar
    ? { width: hubWidths.sidebar, backgroundColor: p.surface, paddingTop: insets.top + 28, paddingHorizontal: 12, borderRightWidth: 1, borderColor: p.line }
    : { flexDirection: 'row', backgroundColor: p.surface, borderTopWidth: 1, borderColor: p.line, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8), paddingHorizontal: Math.max(insets.left, insets.right, 8) }}>
    {sidebar && <View style={{ paddingHorizontal: 12, paddingBottom: 28, gap: 10 }}>
      <Pressable {...webMotion('brand')} accessibilityRole="button" accessibilityLabel="Volver a Inicio" onPress={() => router.navigate('/')} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8 }}><HubMark size={36} /><Copy style={{ fontSize: 24, fontWeight: '700', letterSpacing: -0.8 }}>my hub<Copy style={{ color: p.accent }}>.</Copy></Copy></Pressable>
      <Copy muted style={{ fontSize: 13 }}>Lo bueno, compartido.</Copy>
    </View>}
    <NavigationRegion {...(sidebar ? { showsVerticalScrollIndicator: false, contentContainerStyle: { gap: 8, paddingBottom: 16 } } : {})}
      style={sidebar ? { flex: 1, minHeight: 0 } : { flex: 1, flexDirection: 'row', minWidth: 0 }}>
    {destinations.map(({ href, label, description, Icon }) => {
      const selected = active === href;
      const color = selected ? p.accent : p.muted;
      return <Pressable key={href} {...webMotion('navigation')} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }}
        onPress={() => router.navigate(href === '/library' ? { pathname: '/library', params: { view: 'wishlist' } } : href)} onFocus={() => setFocused(href)} onBlur={() => setFocused('')}
        onHoverIn={() => setHovered(href)} onHoverOut={() => setHovered('')}
        style={({ pressed }) => ({ flex: sidebar ? undefined : 1, minWidth: 0, minHeight: sidebar ? 78 : 60, borderRadius: 12, borderWidth: 1, borderColor: focused === href ? p.accent : selected && sidebar ? p.line : 'transparent', flexDirection: sidebar ? 'row' : 'column', alignItems: 'center', justifyContent: sidebar ? 'flex-start' : 'center', gap: sidebar ? 10 : 4, paddingHorizontal: sidebar ? 10 : 2, paddingVertical: 10, backgroundColor: selected || pressed || hovered === href ? p.soft : 'transparent', opacity: pressed ? 0.75 : 1 })}>
        <View style={sidebar ? { width: 36, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? p.accent : p.background } : { alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} color={sidebar && selected ? p.onAccent : color} weight={selected ? 'fill' : 'regular'} />
        </View>
        <View style={sidebar ? { flex: 1, minWidth: 0, gap: 3 } : { alignSelf: 'stretch' }}>
          <Copy numberOfLines={fontScale > 1.3 ? 2 : 1} style={{ flexShrink: 1, fontSize: sidebar ? 15 : 12, lineHeight: sidebar ? 22 : 16, textAlign: sidebar ? 'left' : 'center', fontWeight: selected ? '700' : '600', color }}>{label}</Copy>
          {sidebar && <Copy muted style={{ fontSize: 12, lineHeight: 16 }}>{description}</Copy>}
        </View>
      </Pressable>;
    })}
    </NavigationRegion>
    {sidebar && <>
      <View style={{ height: 1, backgroundColor: p.line, marginHorizontal: 10, marginBottom: 12 }} />
      <Pressable {...webMotion('navigation')} accessibilityRole="button" accessibilityLabel="Mi perfil" accessibilityState={{ selected: pathname === '/settings' }} onPress={() => router.navigate('/settings')}
        onFocus={() => setFocused('/settings')} onBlur={() => setFocused('')} onHoverIn={() => setHovered('/settings')} onHoverOut={() => setHovered('')}
        style={({ pressed }) => ({ minHeight: 76, marginBottom: insets.bottom + 12, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: focused === '/settings' ? p.accent : 'transparent', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pressed || hovered === '/settings' || pathname === '/settings' ? p.soft : 'transparent' })}>
        <ProfileAvatar size={36} /><View style={{ flex: 1, minWidth: 0, gap: 2 }}><Copy numberOfLines={2} style={{ fontSize: 14, fontWeight: '600' }}>{state.preferences.name || 'Tu cuenta'}</Copy><Copy muted style={{ fontSize: 12 }}>Perfil y ajustes</Copy></View>
      </Pressable>
    </>}
  </View>;
  return <View {...(Platform.OS === 'web' ? { dataSet: { theme: p.dark ? 'dark' : 'light' } } : {})} style={{ flex: 1, flexDirection: sidebar ? 'row' : 'column', backgroundColor: p.background }}>
    {sidebar && navigation}
    <MotionContent changeKey={Platform.OS === 'web' ? pathname : ''} distance={Platform.OS === 'web' ? 8 : 0} style={{ flex: 1, minWidth: 0 }}>{children}</MotionContent>
    {!sidebar && navigation}
  </View>;
}
