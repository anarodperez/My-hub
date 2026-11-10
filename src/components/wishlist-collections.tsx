import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { BookmarkSimpleIcon, PlusIcon, PencilSimpleIcon } from './hub-icons';
import { Copy, Field, IconAction, SaveAction, TextAction } from './hub-ui';
import { useHub, usePalette } from '@/features/hub/provider';
import { removeCollection, validOrganization, wishlistOrganization } from '@/features/hub/wishlist-collections';
import { selectWishlist } from '@/features/hub/wishlist';

export function WishlistCollections({ value, onChange, vertical }: { value: string; onChange: (id: string) => void; vertical: boolean }) {
  const { state, update } = useHub();
  const p = usePalette();
  const organization = wishlistOrganization(state);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = organization.collections.find(c => c.id === value);
  const options = [{ id: 'all', name: 'Todo' }, ...organization.collections, { id: 'unassigned', name: 'Sin colección' }];
  const start = (id: string, currentName = '') => { setEditing(id); setName(currentName); setError(''); };
  const save = async () => {
    if (busy) return;
    setBusy(true); setError('');
    const id = editing === 'new' ? randomUUID() : editing!;
    try {
      await update(previous => {
        const current = wishlistOrganization(previous);
        const next = { ...current, collections: editing === 'new' ? [...current.collections, { id, name: name.trim() }] : current.collections.map(c => c.id === id ? { ...c, name: name.trim() } : c) };
        if (!validOrganization(next)) throw new Error('Usa un nombre único de entre 1 y 60 caracteres.');
        return { ...previous, wishlistOrganization: next };
      });
      setEditing(null); onChange(id);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo guardar la colección.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (busy || !editing || editing === 'new') return;
    setBusy(true); setError('');
    try { await update(previous => removeCollection(previous, editing)); setEditing(null); onChange('unassigned'); }
    catch { setError('No se pudo retirar la colección. Inténtalo de nuevo.'); }
    finally { setBusy(false); }
  };
  return <View style={{ width: vertical ? 220 : '100%', gap: 12, alignSelf: 'flex-start', padding: vertical ? 16 : 0, backgroundColor: vertical ? p.surface : 'transparent', borderRadius: 16 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Copy accessibilityRole="header" style={{ fontSize: 18, fontWeight: '600' }}>Colecciones</Copy>
      <IconAction label="Crear colección" disabled={busy} onPress={() => start('new')}><PlusIcon size={21} color={p.accent} /></IconAction>
    </View>
    <ScrollView horizontal={!vertical} showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: vertical ? 'column' : 'row', gap: 6 }}>
      {options.map(option => {
        const count = selectWishlist(state, 'pending', 'all', option.id).counts;
        const active = option.id === value;
        return <Pressable key={option.id} disabled={busy} accessibilityRole="tab" accessibilityState={{ selected: active, disabled: busy }} onPress={() => onChange(option.id)} style={({ pressed }) => ({ minHeight: 48, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: active || pressed ? p.soft : 'transparent' })}>
          <BookmarkSimpleIcon size={18} weight={active ? 'fill' : 'regular'} color={active ? p.accent : p.muted} />
          <Copy numberOfLines={vertical ? undefined : 1} style={{ flex: vertical ? 1 : undefined, fontSize: 14, fontWeight: active ? '700' : '400', color: active ? p.accent : p.text }}>{option.name}</Copy>
          <Copy style={{ fontSize: 12, color: active ? p.accent : p.muted }}>{count.pending + count.finished}</Copy>
        </Pressable>;
      })}
    </ScrollView>
    {selected && !editing && <TextAction disabled={busy} icon={<PencilSimpleIcon size={17} color={p.muted} />} onPress={() => start(selected.id, selected.name)}>Editar colección</TextAction>}
    {editing && <View style={{ gap: 10, paddingTop: 12, borderTopWidth: 1, borderColor: p.line }}>
      <Field label={editing === 'new' ? 'Nueva colección' : 'Nombre de la colección'} value={name} onChangeText={setName} maxLength={60} editable={!busy} onSubmitEditing={() => { void save(); }} />
      <SaveAction busy={busy} disabled={!name.trim()} onPress={() => { void save(); }}>{editing === 'new' ? 'Crear' : 'Guardar'}</SaveAction>
      <TextAction disabled={busy} onPress={() => { setEditing(null); setError(''); }}>Cancelar</TextAction>
      {editing !== 'new' && <><Copy muted style={{ fontSize: 12 }}>Los deseos pasarán a Sin colección. No se borrará ninguno.</Copy><TextAction danger disabled={busy} onPress={() => { void remove(); }}>Retirar colección</TextAction></>}
    </View>}
    {!!error && <Copy accessibilityRole="alert" style={{ color: p.danger, fontSize: 13 }}>{error}</Copy>}
  </View>;
}
