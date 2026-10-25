import { router, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { UsersThreeIcon } from 'phosphor-react-native/src/icons/UsersThree';
import { BookmarkSimpleIcon, CalendarBlankIcon, CheckIcon, DeviceMobileIcon, MoonIcon, PencilSimpleIcon, SunIcon, TrashIcon, CaretRightIcon, LockSimpleIcon, XIcon } from '@/components/hub-icons';
import { SignOutIcon } from 'phosphor-react-native/src/icons/SignOut';
import { MusicNotesIcon } from 'phosphor-react-native/src/icons/MusicNotes';
import { ProfileAvatar } from '@/components/profile-avatar';
import { discardCover, persistCover } from '@/features/hub/covers';
import { Copy, Field, IconAction, Screen, Section, showError, SaveAction, TextAction } from '@/components/hub-ui';
import { useAccount } from '@/features/account/provider';
import { supabase } from '@/features/account/client';
import { type ThemePreference } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';

export default function ProfileScreen() {
  const { loading } = useHub();
  if (loading) return <Screen back title="Mi cuenta"><Copy>Cargando…</Copy></Screen>;
  return <ProfileEditor />;
}

function ProfileEditor() {
  const { state, update } = useHub();
  const { session } = useAccount();
  const p = usePalette();
  const [name, setName] = useState(state.preferences.name);
  const [editing, setEditing] = useState(!state.preferences.name);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const signOut = async () => {
    if (!supabase || signingOut || busy || photoBusy) return;
    setSigningOut(true); setSessionError('');
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch { setSessionError('No se pudo cerrar la sesión. Comprueba la conexión y vuelve a intentarlo.'); }
    finally { setSigningOut(false); }
  };
  const changePhoto = async (remove = false) => {
    if (photoBusy) return;
    setPhotoBusy(true);
    setPhotoError('');
    let newUri = '';
    const previousUri = state.preferences.avatarUri;
    try {
      if (!remove) {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: Platform.OS === 'web' });
        if (result.canceled) return;
        const asset = result.assets[0];
        if (!asset?.uri) throw new Error('Foto no disponible');
        newUri = await persistCover(Platform.OS === 'web' && asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
      }
      await update((previous) => ({ ...previous, preferences: { ...previous.preferences, avatarUri: newUri || undefined } }));
      if (previousUri && previousUri !== newUri) discardCover(previousUri);
    } catch {
      if (newUri) discardCover(newUri);
      setPhotoError('No se ha podido guardar la foto. Tu perfil sigue igual. Puedes volver a intentarlo.');
    } finally { setPhotoBusy(false); }
  };
  const pending = (state.wishes || []).filter((wish) => !wish.completed).length + state.saved.filter((item) => item.status === 'pending').length;
  const themes: { value: ThemePreference; label: string; description: string; Icon: typeof SunIcon }[] = [
    { value: 'system', label: 'Automático', description: 'Sigue el tema de tu móvil.', Icon: DeviceMobileIcon },
    { value: 'light', label: 'Claro', description: 'Fondos crema con acentos ciruela, salvia y melocotón.', Icon: SunIcon },
    { value: 'dark', label: 'Oscuro', description: 'Fondos carbón con acentos suaves y texto cálido.', Icon: MoonIcon },
  ];
  const selectedTheme = themes.find((theme) => theme.value === state.preferences.theme)!;
  const saveName = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await update((previous) => ({ ...previous, preferences: { ...previous.preferences, name: name.trim() } }));
      setSaved(true); setEditing(false);
    } catch { showError(); } finally { setBusy(false); }
  };
  return <Screen back title="Mi cuenta">
    <View style={v.identity}>
      <View style={{ padding: 7, borderRadius: 70, borderWidth: 1, borderColor: p.line }}>
        <Pressable disabled={photoBusy} accessibilityRole="button" accessibilityLabel={state.preferences.avatarUri ? 'Cambiar foto de perfil' : 'Añadir foto de perfil'} accessibilityState={{ disabled: photoBusy, busy: photoBusy }} onPress={() => { void changePhoto(); }} style={({ pressed }) => ({ opacity: photoBusy ? 0.5 : pressed ? 0.7 : 1 })}>
          <ProfileAvatar size={108} />
          <View style={[v.photoEdit, { backgroundColor: p.accent, borderColor: p.background }]}>{photoBusy ? <ActivityIndicator size="small" color={p.onAccent} /> : <PencilSimpleIcon size={15} color={p.onAccent} />}</View>
        </Pressable>
        {state.preferences.avatarUri && <View style={{ position: 'absolute', left: -14, bottom: -6, backgroundColor: p.background, borderRadius: 24 }}><IconAction disabled={photoBusy} label="Quitar foto de perfil" onPress={() => { void changePhoto(true); }}><TrashIcon size={18} color={p.muted} /></IconAction></View>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, maxWidth: '100%' }}>
        <Copy accessibilityRole="header" style={[v.name, { flexShrink: 1 }]}>{state.preferences.name || 'Tu rincón en My Hub'}</Copy>
        <IconAction disabled={busy} label={editing ? 'Cerrar edición del nombre' : 'Editar nombre'} onPress={() => { setName(state.preferences.name); setEditing(!editing); setSaved(false); }}>{editing ? <XIcon size={20} color={p.accent} /> : <PencilSimpleIcon size={20} color={p.accent} />}</IconAction>
      </View>
      <Copy selectable muted style={v.intro}>{session?.user.email}</Copy>
      {!!photoError && <Copy accessibilityRole="alert" style={{ color: p.danger, fontSize: 13, textAlign: 'center' }}>{photoError}</Copy>}
      {saved && <View style={v.inline}><CheckIcon size={15} color={p.sageText} /><Copy accessibilityLiveRegion="polite" style={{ color: p.sageText, fontSize: 13 }}>Nombre guardado</Copy></View>}
    </View>
    {editing && <View style={[v.editor, { backgroundColor: p.surface, borderColor: p.line }]}>
      <Field label="Tu nombre" value={name} onChangeText={(value) => { setName(value); setSaved(false); }} placeholder="¿Cómo te llamas?" maxLength={40} editable={!busy} />
      <SaveAction busy={busy} disabled={name.trim() === state.preferences.name} onPress={() => { void saveName(); }} />
    </View>}
    <View style={[v.stats, { borderColor: p.line }]}>
      {[{ label: 'Publicaciones', count: state.recommendations.filter((item) => !item.sample && (!item.ownerId || item.ownerId === session?.user.id)).length, route: '/' as const }, { label: 'Deseos', count: pending, route: '/library' as const }, { label: 'Eventos', count: state.events.length, route: '/calendar' as const }].map((item, index) => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={`${item.count} ${item.label.toLowerCase()}. Ver lista`} onPress={() => router.push(item.route as Href)} style={({ pressed }) => ({ flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 4, borderLeftWidth: index ? 1 : 0, borderColor: p.line, opacity: pressed ? 0.6 : 1 })}><Copy style={{ fontSize: 24, lineHeight: 30, fontWeight: '600' }}>{item.count}</Copy><Copy muted style={{ fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{item.label}</Copy></Pressable>)}
    </View>
    <View style={v.section}>
      <Section title="Tu espacio" />
      <View style={{ backgroundColor: p.surface, borderRadius: 16, overflow: 'hidden' }}>
        {[{ title: 'Mis grupos', detail: 'Tus círculos de confianza', route: '/groups' as const, Icon: UsersThreeIcon }, { title: 'Canción del momento', detail: 'La que aparece en tu Inicio', route: '/song' as const, Icon: MusicNotesIcon }].map(({ title, detail, route, Icon }, index) => <Pressable key={route} accessibilityRole="button" accessibilityLabel={`${title}. ${detail}`} onPress={() => router.push(route)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14, minHeight: 78, backgroundColor: pressed ? p.soft : 'transparent', borderTopWidth: index ? 1 : 0, borderTopColor: p.line })}>
          <Icon size={24} color={p.accent} weight="duotone" />
          <View style={{ flex: 1, gap: 3 }}><Copy style={{ fontSize: 16, fontWeight: '600' }}>{title}</Copy><Copy muted style={{ fontSize: 13, lineHeight: 19 }}>{detail}</Copy></View>
          <CaretRightIcon size={18} color={p.muted} />
        </Pressable>)}
      </View>
    </View>
    <View style={v.section}>
      <Section title="Apariencia" />
      <View accessibilityRole="radiogroup" accessibilityLabel="Tema de la app" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{themes.map(({ value, label, Icon }) => {
        const selected = state.preferences.theme === value;
        return <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => update((previous) => ({ ...previous, preferences: { ...previous.preferences, theme: value } })).catch(showError)} style={({ pressed }) => ({ flex: 1, minWidth: 84, minHeight: 92, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 6, borderWidth: 1, borderColor: selected ? p.accent : p.line, backgroundColor: selected ? p.soft : p.surface, alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.65 : 1 })}>
          <Icon size={24} color={selected ? p.accent : p.muted} weight={selected ? 'fill' : 'regular'} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}><Copy style={{ fontSize: 13, lineHeight: 19, fontWeight: selected ? '600' : '400', color: selected ? p.accent : p.text }}>{label}</Copy>{selected && <CheckIcon size={12} color={p.accent} weight="bold" />}</View>
        </Pressable>;
      })}</View>
      <Copy muted accessibilityLiveRegion="polite" style={{ fontSize: 13, lineHeight: 20 }}>{selectedTheme.description}</Copy>
    </View>
    <View style={[v.privacy, { borderColor: p.line }]}>
      <LockSimpleIcon size={22} color={p.sageText} />
      <View style={{ flex: 1, gap: 6 }}><Copy style={{ fontSize: 15, fontWeight: '600' }}>Lo personal se queda contigo</Copy><Copy muted style={{ fontSize: 13, lineHeight: 20 }}>Tu wishlist y calendario personal son privados y se guardan en tu cuenta.</Copy>
        <View style={v.inline}><BookmarkSimpleIcon size={15} color={p.muted} /><CalendarBlankIcon size={15} color={p.muted} /><Copy muted style={{ fontSize: 12 }}>Solo tú tienes acceso</Copy></View>
      </View>
    </View>
    <View style={[v.section, { borderTopWidth: 1, borderColor: p.line, paddingTop: 20 }]}>
      <TextAction danger disabled={busy || photoBusy || signingOut} icon={<SignOutIcon size={22} color={p.danger} />} onPress={() => { void signOut(); }}>{signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</TextAction>
      {!!sessionError && <Copy accessibilityRole="alert" style={{ color: p.danger }}>{sessionError}</Copy>}
    </View>
  </Screen>;
}

const v = StyleSheet.create({
  identity: { alignItems: 'center', gap: 10, paddingTop: 10 },
  photoEdit: { position: 'absolute', right: -1, bottom: 1, width: 32, height: 32, borderRadius: 16, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 30, lineHeight: 38, fontWeight: '700', textAlign: 'center' },
  intro: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  editor: { padding: 18, gap: 16, borderWidth: 1, borderRadius: 16 },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 16 },
  section: { gap: 14, marginTop: 8 },
  privacy: { flexDirection: 'row', gap: 12, borderTopWidth: 1, paddingTop: 24, marginTop: 8 },
});
