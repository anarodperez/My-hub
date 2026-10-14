import { router, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { BookmarkSimpleIcon, CalendarBlankIcon, CheckIcon, DeviceMobileIcon, MoonIcon, PencilSimpleIcon, SunIcon } from '@/components/hub-icons';
import { ProfileAvatar } from '@/components/profile-avatar';
import { discardCover, persistCover } from '@/features/hub/covers';
import { Action, Copy, Field, Privacy, Screen, Section, Surface, TextAction, s, showError } from '@/components/hub-ui';
import { type ThemePreference } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';

export default function ProfileScreen() {
  const { loading } = useHub();
  if (loading) return <Screen back title="Mi perfil"><Copy>Cargando…</Copy></Screen>;
  return <ProfileEditor />;
}

function ProfileEditor() {
  const { state, update } = useHub();
  const p = usePalette();
  const [name, setName] = useState(state.preferences.name);
  const [editing, setEditing] = useState(!state.preferences.name);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
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
  const themes: { value: ThemePreference; label: string; description: string; Icon: typeof SunIcon; background: string; surface: string; accent: string }[] = [
    { value: 'system', label: 'Automático', description: 'Sigue el tema de tu móvil.', Icon: DeviceMobileIcon, background: p.background, surface: p.surface, accent: p.accent },
    { value: 'light', label: 'Claro', description: 'Crema cálida y ciruela suave.', Icon: SunIcon, background: '#FAF7F2', surface: '#FFFDFA', accent: '#705080' },
    { value: 'dark', label: 'Oscuro', description: 'Ciruela profunda y lavanda.', Icon: MoonIcon, background: '#19161D', surface: '#25212B', accent: '#C4A7DC' },
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
  return <Screen back title="Mi perfil">
    <TextAction onPress={() => router.push('/account')}>Mi cuenta</TextAction>
    <View style={{ alignItems: 'center', gap: 8, paddingTop: 4, paddingBottom: 4 }}>
      <Pressable disabled={photoBusy} accessibilityRole="button" accessibilityLabel={state.preferences.avatarUri ? 'Cambiar foto de perfil' : 'Añadir foto de perfil'} onPress={() => { void changePhoto(); }} style={{ marginBottom: 4, opacity: photoBusy ? 0.5 : 1 }}><ProfileAvatar size={76} /><View style={{ position: 'absolute', right: -2, bottom: 0, width: 25, height: 25, borderRadius: 13, backgroundColor: p.accent, borderWidth: 2, borderColor: p.background, alignItems: 'center', justifyContent: 'center' }}><PencilSimpleIcon size={12} color={p.onAccent} /></View></Pressable>
      <View><TextAction disabled={photoBusy} onPress={() => { void changePhoto(); }}>{photoBusy ? 'Guardando foto…' : state.preferences.avatarUri ? 'Cambiar foto' : 'Añadir foto'}</TextAction></View>
      {state.preferences.avatarUri && <View><TextAction disabled={photoBusy} danger onPress={() => { void changePhoto(true); }}>Quitar foto</TextAction></View>}
      {!!photoError && <Copy accessibilityRole="alert" style={{ color: p.danger, fontSize: 12, textAlign: 'center' }}>{photoError}</Copy>}
      <Copy accessibilityRole="header" style={{ fontSize: 26, lineHeight: 33, fontWeight: '700', textAlign: 'center' }}>{state.preferences.name || 'Tu rincón en My Hub'}</Copy>
      <Copy muted style={{ fontSize: 13, lineHeight: 20, textAlign: 'center' }}>Historias, descubrimientos y cosas que te gustan.</Copy>
      <View><TextAction icon={<PencilSimpleIcon size={15} color={p.accent} />} onPress={() => { setEditing(!editing); setSaved(false); }}> {editing ? 'Cerrar edición' : 'Editar nombre'}</TextAction></View>
      {saved && <Copy accessibilityLiveRegion="polite" style={{ color: p.sageText, fontSize: 12 }}>Nombre guardado</Copy>}
    </View>
    {editing && <Surface><Field label="Tu nombre" value={name} onChangeText={(value) => { setName(value); setSaved(false); }} placeholder="¿Cómo te llamas?" maxLength={40} /><Action disabled={busy || name.trim() === state.preferences.name} onPress={() => { void saveName(); }}>{busy ? 'Guardando…' : 'Guardar cambios'}</Action></Surface>}
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: p.line, paddingVertical: 12 }}>
      {[{ label: 'Publicaciones', count: state.recommendations.filter((item) => !item.sample).length, route: '/' as const }, { label: 'Deseos', count: pending, route: '/library' as const }, { label: 'Eventos', count: state.events.length, route: '/calendar' as const }].map((item, index) => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={`${item.count} ${item.label.toLowerCase()}. Ver lista`} onPress={() => router.push(item.route as Href)} style={({ pressed }) => ({ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2, borderLeftWidth: index ? 1 : 0, borderColor: p.line, opacity: pressed ? 0.6 : 1 })}><Copy style={{ fontSize: 22, lineHeight: 28, fontWeight: '600' }}>{item.count}</Copy><Copy muted style={{ fontSize: 11, lineHeight: 17, textAlign: 'center' }}>{item.label}</Copy></Pressable>)}
    </View>
    <View style={{ gap: 12 }}>
      <Section title="A tu luz" />
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 10 }}>{themes.map(({ value, label, Icon, background, surface, accent }) => {
        const selected = state.preferences.theme === value;
        return <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => update((previous) => ({ ...previous, preferences: { ...previous.preferences, theme: value } })).catch(showError)} style={({ pressed }) => ({ flex: 1, borderRadius: 12, padding: 7, borderWidth: 1, borderColor: selected ? p.accent : p.line, backgroundColor: selected ? p.soft : p.surface, gap: 8, opacity: pressed ? 0.6 : 1 })}>
          <View accessible={false} style={{ height: 76, backgroundColor: background, borderRadius: 7, padding: 8, gap: 6 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: accent }} /><View style={{ width: 23, height: 3, borderRadius: 2, backgroundColor: accent, opacity: 0.5 }} /></View><View style={{ flex: 1, backgroundColor: surface, borderRadius: 4, padding: 6, gap: 4 }}><View style={{ width: '70%', height: 4, borderRadius: 2, backgroundColor: accent, opacity: 0.6 }} /><View style={{ width: '90%', height: 3, borderRadius: 2, backgroundColor: accent, opacity: 0.2 }} /></View></View>
          <View style={{ alignItems: 'center', gap: 4, paddingBottom: 5 }}><Icon size={17} color={selected ? p.accent : p.muted} weight="duotone" /><Copy style={{ fontSize: 12, lineHeight: 18, fontWeight: selected ? '600' : '400', textAlign: 'center', color: selected ? p.accent : p.text }}>{label}</Copy>{selected && <CheckIcon size={12} color={p.accent} weight="bold" />}</View>
        </Pressable>;
      })}</View>
      <Copy muted accessibilityLiveRegion="polite" style={{ fontSize: 12, lineHeight: 18 }}>{selectedTheme.description}</Copy>
    </View>
    <View style={{ gap: 12 }}><Section title="Solo para ti" /><Surface><Privacy>Guardado en este dispositivo</Privacy><View style={s.inline}><CalendarBlankIcon size={19} color={p.muted} /><Copy style={{ fontSize: 13, flex: 1 }}>Calendario y suscripciones privados</Copy></View><View style={s.inline}><BookmarkSimpleIcon size={19} color={p.muted} /><Copy style={{ fontSize: 13, flex: 1 }}>Tú eliges la visibilidad de tu wishlist</Copy></View><Copy muted style={{ fontSize: 12, lineHeight: 19 }}>Las cuentas y los grupos de amigos aún no están conectados. Por ahora, tu contenido permanece en tu móvil.</Copy></Surface></View>
  </Screen>;
}
