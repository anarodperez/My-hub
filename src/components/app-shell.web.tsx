import { AppShell as MantineShell, Avatar, NavLink, ScrollArea, UnstyledButton } from '@mantine/core';
import { router, usePathname } from 'expo-router';
import { motion } from 'motion/react';
import type { MouseEvent, ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { UsersThreeIcon } from 'phosphor-react-native/src/icons/UsersThree';
import { BookmarkSimpleIcon, CalendarBlankIcon, HouseIcon } from './hub-icons';
import { HubMark } from './hub-mark';
import { ProfileAvatar } from './profile-avatar';
import { useHub, usePalette } from '@/features/hub/provider';
import { getHubLayout } from '@/features/hub/layout';
import { MotionContent } from './hub-motion';

const destinations = [
  { href: '/', label: 'Inicio', description: 'Lo que compartimos', Icon: HouseIcon },
  { href: '/library', label: 'Wishlist', description: 'Tus próximos favoritos', Icon: BookmarkSimpleIcon },
  { href: '/calendar', label: 'Calendario', description: 'Planes por venir', Icon: CalendarBlankIcon },
  { href: '/friends', label: 'Amigas', description: 'Tu círculo, más cerca', Icon: UsersThreeIcon },
] as const;

export function AppShell({ children, authenticated }: { children: ReactNode; authenticated: boolean }) {
  const p = usePalette();
  const { state } = useHub();
  const pathname = usePathname();
  const { width, fontScale } = useWindowDimensions();
  const { sidebar } = getHubLayout(width, fontScale);
  const editor = ['/compose', '/group-post', '/wish', '/review', '/song'].includes(pathname);
  const visible = authenticated && pathname !== '/account' && (sidebar || !editor);
  const active = pathname.startsWith('/group') ? '/friends' : pathname.startsWith('/discovery/') ? '/'
    : pathname === '/wish' || pathname === '/review' ? '/library' : pathname;
  const go = (event: MouseEvent, href: typeof destinations[number]['href'] | '/settings') => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    router.navigate(href === '/library' ? { pathname: '/library', params: { view: 'wishlist' } } : href);
  };
  const links = destinations.map(({ href, label, description, Icon }) => {
    const selected = active === href;
    return <NavLink key={href} href={href === '/library' ? '/library?view=wishlist' : href} onClick={event => go(event, href)} active={selected}
      aria-current={selected ? 'page' : undefined} label={label} description={sidebar ? description : undefined} className="hub-nav-link"
      leftSection={<span className="hub-nav-icon"><Icon size={22} weight={selected ? 'fill' : 'regular'} color={selected ? p.accent : p.muted} /></span>}
      rightSection={selected && <motion.span layoutId="hub-navigation-marker" className="hub-nav-marker" aria-hidden="true" />}
    />;
  });
  return <MantineShell className="hub-shell" data-theme={p.dark ? 'dark' : 'light'} padding={0}
    navbar={{ width: 224, breakpoint: 0, collapsed: { desktop: !visible || !sidebar, mobile: !visible || !sidebar } }}
    footer={{ height: 84, collapsed: !visible || sidebar }}
    styles={{ root: { height: '100dvh', overflow: 'hidden', background: p.background }, navbar: { background: p.surface, borderColor: p.line }, footer: { background: p.surface, borderColor: p.line }, main: { height: '100dvh', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}>
    {visible && sidebar && <MantineShell.Navbar p="sm">
      <UnstyledButton className="hub-brand" component="a" href="/" onClick={event => go(event, '/')} aria-label="Volver a Inicio">
        <HubMark size={36} /><span>my hub<span style={{ color: p.accent }}>.</span></span>
      </UnstyledButton>
      <p className="hub-brand-caption">Lo bueno, compartido.</p>
      <ScrollArea className="hub-nav-scroll" type="hover"><nav aria-label="Navegación principal" className="hub-nav-list">{links}</nav></ScrollArea>
      <NavLink className="hub-profile-link" component="a" href="/settings" onClick={event => go(event, '/settings')} active={pathname === '/settings'}
        aria-current={pathname === '/settings' ? 'page' : undefined} aria-label="Mi perfil" label={state.preferences.name || 'Tu cuenta'} description="Perfil y ajustes"
        leftSection={<Avatar radius="xl" size={40}><ProfileAvatar size={40} /></Avatar>} />
    </MantineShell.Navbar>}
    <MantineShell.Main id="hub-main-content"><MotionContent changeKey={pathname} distance={8} style={{ flex: 1, minWidth: 0 }}>{children}</MotionContent></MantineShell.Main>
    {visible && !sidebar && <MantineShell.Footer className="hub-mobile-footer"><nav aria-label="Navegación principal">{links}</nav></MantineShell.Footer>}
  </MantineShell>;
}
