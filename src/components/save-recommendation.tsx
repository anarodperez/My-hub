import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Platform, Pressable, View } from 'react-native';
import { BookmarkSimpleIcon, CheckIcon, XIcon } from './hub-icons';
import { Copy, IconAction, showError } from './hub-ui';
import { FormDialog } from './form-dialog';
import { WishCollectionPicker } from './wish-collection-picker';
import { assignCollection, wishlistOrganization } from '@/features/hub/wishlist-collections';
import { toggleSaved } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function SaveRecommendation({ id }: { id: string }) {
  const { state, update } = useHub();
  const p = usePalette();
  const saved = state.saved.some((item) => item.recommendationId === id);
  const [scale] = useState(() => new Animated.Value(1));
  const [organizing, setOrganizing] = useState(false);
  const locked = useRef(false);
  const organization = wishlistOrganization(state);
  const collectionId = organization.assignments[`saved:${id}`] || 'unassigned';
  const collectionName = organization.collections.find(collection => collection.id === collectionId)?.name || 'Guardado';
  const chooseCollection = async (collection: string) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try { await update(previous => assignCollection(previous, `saved:${id}`, collection)); if (mounted.current) setOrganizing(false); }
    catch { if (mounted.current) showError(); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  };
  const [busy, setBusy] = useState(false);
  const reduceMotion = useReducedMotion();
  const motionPreference = useRef(reduceMotion);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    motionPreference.current = reduceMotion;
    if (reduceMotion) { scale.stopAnimation(); scale.setValue(1); }
    return () => scale.stopAnimation();
  }, [scale, reduceMotion]);
  const save = async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      await update((previous) => toggleSaved(previous, id));
      if (!mounted.current) return;
      AccessibilityInfo.announceForAccessibility(saved ? 'Retirado de tu wishlist' : 'Guardado en tu wishlist');
      if (!motionPreference.current) Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 80, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(scale, { toValue: 1, duration: 160, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    } catch { if (mounted.current) showError(); } finally { locked.current = false; if (mounted.current) setBusy(false); }
  };
  return <><Animated.View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 3, borderRadius: 10, paddingHorizontal: saved ? 6 : 0, backgroundColor: saved ? p.sage : 'transparent' }}>
    <IconAction disabled={busy} label={busy ? 'Guardando deseo' : saved ? 'Quitar de mi wishlist' : 'Guardar en mi wishlist'} onPress={() => { void save(); }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Animated.View style={{ transform: [{ scale }] }}>{busy ? <ActivityIndicator size="small" color={p.accent} /> : <BookmarkSimpleIcon size={22} color={saved ? p.sageText : p.muted} weight={saved ? 'fill' : 'regular'} />}</Animated.View>{!saved && <Copy style={{ color: p.accent, fontSize: 13, fontWeight: '600' }}>{busy ? 'Guardando' : 'Guardar'}</Copy>}</View></IconAction>
    {saved && <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={`Cambiar colección: ${collectionName}`} onPress={() => setOrganizing(true)} style={{ minHeight: 48, maxWidth: 110, flexDirection: 'row', alignItems: 'center', gap: 4 }}><CheckIcon size={14} color={p.sageText} /><Copy numberOfLines={2} accessibilityLiveRegion="polite" style={{ flexShrink: 1, color: p.sageText, fontSize: 12 }}>{collectionName}</Copy></Pressable>}
  </Animated.View>
    {organizing && <FormDialog busy={busy} onClose={() => setOrganizing(false)}><View style={{ padding: 24, gap: 20 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Copy accessibilityRole="header" style={{ flex: 1, fontSize: 24, fontWeight: '700' }}>Organiza tu deseo</Copy><IconAction label="Cerrar colecciones" disabled={busy} onPress={() => setOrganizing(false)}><XIcon size={24} color={p.muted} /></IconAction></View><WishCollectionPicker value={collectionId} disabled={busy} onChange={collection => { void chooseCollection(collection); }} />{busy && <ActivityIndicator accessibilityLabel="Guardando colección" color={p.accent} />}</View></FormDialog>}
  </>;
}
