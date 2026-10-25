import { Image } from 'expo-image';
import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { ShareDiscovery } from '@/components/share-discovery';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';
import { CategoryIcon, Copy, Field, IconAction, SaveAction, Screen, TextAction } from '@/components/hub-ui';
import { ChatCircleIcon, LockSimpleIcon, PencilSimpleIcon, StarIcon, MapPinIcon, TrashIcon } from '@/components/hub-icons';
import { ExternalLink } from '@/components/external-link';
import { useHub, usePalette } from '@/features/hub/provider';
import { mapRecommendation } from '@/features/hub/cloud-state';
import type { Recommendation } from '@/features/hub/model';
import type { Author, CommentRow } from '@/features/hub/backend-types';
import { money, recommendationCategories } from '@/features/hub/model';

export default function DiscoveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repository, media, refresh } = useHub();
  const p = usePalette();
  const current = useRef(repository); current.current = repository;
  const [post, setPost] = useState<Recommendation>();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [more, setMore] = useState(false);
  const [failedCover, setFailedCover] = useState('');
  const draft = useRef<{ id: string; body: string } | null>(null);
  const load = async (next = false) => {
    if (!repository || !media) return;
    const last = next ? comments.at(-1) : undefined;
    const [row, page] = await Promise.all([repository.getDiscovery(id), repository.listComments(id, last ? { id: last.id, created_at: last.created_at } : undefined)]);
    if (!row) throw new Error('Esta publicación ya no está disponible para tu cuenta.');
    const identities = [...new Set([row.owner_id, ...page.map((entry) => entry.author_id)])];
    const [mapped, names] = await Promise.all([mapRecommendation(row, media), Promise.all(identities.map((user) => repository.author(user)))]);
    if (current.current !== repository) return;
    setPost(mapped); setComments((previous) => next ? [...previous, ...page.filter((entry) => !previous.some((old) => old.id === entry.id))] : page);
    setAuthors((previous) => ({ ...previous, ...Object.fromEntries(names.filter((entry): entry is Author => !!entry).map((entry) => [entry.id, entry])) }));
    setMore(page.length === 30);
  };
  useEffect(() => {
    setPost(undefined); setComments([]); setAuthors({}); setBody(''); setBusy(false); setError(''); draft.current = null;
    void load().catch((failure) => { if (current.current === repository) setError(failure.message); });
    return () => { current.current = null; };
    // Route changes reset the conversation and pending draft identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, repository, media]);
  const send = async () => {
    if (!repository || busy || !body.trim()) return;
    setBusy(true); setError('');
    if (!draft.current || draft.current.body !== body.trim()) draft.current = { id: randomUUID(), body: body.trim() };
    const pending = draft.current;
    try {
      await repository.addComment(id, pending.id, pending.body);
      if (current.current !== repository) return;
      setBody(''); draft.current = null;
      await load(); void refresh().catch(() => {});
    } catch (failure) { if (current.current === repository) setError(failure instanceof Error ? failure.message : 'No se pudo enviar.'); }
    finally { if (current.current === repository) setBusy(false); }
  };
  const remove = (commentId: string) => {
    const perform = async () => {
      if (!repository || busy) return;
      setBusy(true); setError('');
      try { await repository.deleteComment(commentId); if (current.current === repository) { await load(); void refresh().catch(() => {}); } }
      catch (failure) { if (current.current === repository) setError(failure instanceof Error ? failure.message : 'No se pudo borrar.'); }
      finally { if (current.current === repository) setBusy(false); }
    };
    if (Platform.OS === 'web') { if (globalThis.confirm('¿Eliminar tu comentario?')) void perform(); }
    else Alert.alert('¿Eliminar tu comentario?', undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => { void perform(); } }]);
  };
  return <Screen back title="Descubrimiento">
    {post && <>
      <View style={[d.hero, { backgroundColor: p.soft }]}>
        {post.coverUrl && post.coverUrl !== failedCover ? <Image source={post.coverUrl} onError={() => setFailedCover(post.coverUrl)} style={{ width: '100%', height: 290 }} contentFit={post.category === 'book' || post.category === 'product' ? 'contain' : 'cover'} accessibilityLabel={`Portada de ${post.title}`} /> : <View style={d.coverFallback}><CategoryIcon category={post.category} size={64} /></View>}
      </View>
      <View style={{ gap: 14 }}>
        <Copy accessibilityRole="header" style={d.title}>{post.title}</Copy>
        <View style={d.metadata}>
          <View style={d.inline}><CategoryIcon category={post.category} size={16} /><Copy muted style={d.small}>{recommendationCategories.find((entry) => entry.value === post.category)?.singular}</Copy></View>
          <View accessibilityLabel={`Valoración: ${post.rating} de 5`} style={[d.inline, { backgroundColor: p.sage, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }]}><StarIcon size={15} weight="fill" color={p.sageText} /><Copy style={{ color: p.sageText, fontSize: 14, fontWeight: '600' }}>{String(post.rating).replace('.', ',')} / 5</Copy></View>
          {post.visibility === 'private' && <View style={d.inline}><LockSimpleIcon size={14} color={p.muted} /><Copy muted style={d.small}>Solo tú</Copy></View>}
          {post.visibility === 'group' && <Copy muted style={d.small}>Grupo privado</Copy>}
          {post.sample && <Copy style={{ color: p.accent, fontSize: 12 }}>Contenido de ejemplo</Copy>}
        </View>
      </View>
      <View style={[d.authorRow, { borderColor: p.line }]}>
        <View style={[d.avatar, { backgroundColor: p.soft }]}><Copy style={{ color: p.accent, fontSize: 18, fontWeight: '600' }}>{(authors[post.ownerId!]?.name || 'Usuario').charAt(0).toUpperCase()}</Copy></View>
        <View style={{ flex: 1, gap: 2 }}><Copy style={{ fontSize: 15, fontWeight: '600' }}>{authors[post.ownerId!]?.name || 'Usuario'}</Copy><Copy muted style={d.small}>{new Date(post.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</Copy></View>
        {post.ownerId === repository?.accountId && <IconAction label="Editar descubrimiento" onPress={() => router.push({ pathname: '/compose', params: { id, kind: 'recommendation' } })}><PencilSimpleIcon size={21} color={p.accent} /></IconAction>}
      </View>
      <View style={{ gap: 12, paddingVertical: 4 }}>
        <Copy accessibilityRole="header" style={d.sectionTitle}>Por qué merece la pena</Copy>
        <Copy style={{ fontSize: 18, lineHeight: 29 }}>{post.opinion}</Copy>
        {post.priceCents !== undefined && <Copy style={{ fontSize: 20, fontWeight: '600' }}>{money(post.priceCents)}</Copy>}
        {!!post.location && <View style={d.inline}><MapPinIcon size={18} color={p.muted} /><Copy muted style={{ flex: 1 }}>{post.location}</Copy></View>}
        {!!post.link && <ExternalLink href={post.link as `https://${string}` | `http://${string}`}><Copy style={{ color: p.accent, paddingVertical: 12, fontWeight: '600' }}>{post.category === 'product' ? 'Ver producto' : 'Visitar web'} ↗</Copy></ExternalLink>}
      </View>
      <ShareDiscovery key={post.id} post={post} onShared={() => load()} />
      <View style={[d.conversation, { borderColor: p.line }]}>
        <View style={[d.inline, { justifyContent: 'space-between' }]}><Copy accessibilityRole="header" style={d.sectionTitle}>La conversación</Copy><View style={d.inline}><ChatCircleIcon size={19} color={p.muted} /><Copy muted style={d.small}>{post.commentCount || comments.length}</Copy></View></View>
        {!comments.length && <View style={{ paddingVertical: 12, gap: 5 }}><Copy style={{ fontWeight: '600' }}>La primera opinión puede ser la tuya</Copy><Copy muted style={{ fontSize: 15, lineHeight: 22 }}>¿Lo conocías? Comparte lo que te hizo sentir.</Copy></View>}
        {comments.map((comment) => <View key={comment.id} style={[d.comment, { borderColor: p.line }]}>
          <View style={[d.avatar, { width: 32, height: 32, borderRadius: 16, backgroundColor: comment.author_id === repository?.accountId ? p.soft : p.sage }]}><Copy style={{ color: comment.author_id === repository?.accountId ? p.accent : p.sageText, fontSize: 13, fontWeight: '600' }}>{(authors[comment.author_id]?.name || 'Usuario').charAt(0).toUpperCase()}</Copy></View>
          <View style={{ flex: 1, gap: 7 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={[d.metadata, { flex: 1 }]}><Copy style={{ fontSize: 15, fontWeight: '600' }}>{authors[comment.author_id]?.name || 'Usuario'}</Copy><Copy muted style={d.small}>{new Date(comment.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</Copy></View>{comment.author_id === repository?.accountId && <IconAction label="Eliminar mi comentario" disabled={busy} onPress={() => remove(comment.id)}><TrashIcon size={19} color={p.danger} /></IconAction>}</View>
            {!!comment.body && <Copy style={{ lineHeight: 25 }}>{comment.body}</Copy>}
            {!comment.body && !!comment.gif_path && <Copy muted>Adjunto antiguo no disponible</Copy>}
          </View>
        </View>)}
        {more && <TextAction disabled={busy} onPress={() => { void load(true).catch((failure) => setError(failure.message)); }}>Ver más comentarios</TextAction>}
        <View style={[d.composer, { backgroundColor: p.surface, borderColor: p.line }]}>
          <Field label="Únete a la conversación" value={body} onChangeText={setBody} maxLength={2000} multiline editable={!busy} placeholder="Tu opinión, una pregunta, una recomendación…" />
          <View style={{ alignItems: 'flex-end' }}><SaveAction busy={busy} disabled={!body.trim()} onPress={() => { void send(); }}>Enviar comentario</SaveAction></View>
        </View>
      </View>
    </>}
    {!!error && <Copy accessibilityRole="alert">{error}</Copy>}
    {!!error && <TextAction disabled={busy} onPress={() => { setError(''); void load().catch((failure) => setError(failure.message)); }}>Volver a intentar</TextAction>}
    {!post && !error && <View style={{ alignItems: 'center', paddingVertical: 48, gap: 16 }}><ActivityIndicator color={p.accent} /><Copy muted>Cargando descubrimiento…</Copy></View>}
  </Screen>;
}

const d = StyleSheet.create({
  hero: { borderRadius: 20, overflow: 'hidden', paddingVertical: 16 },
  coverFallback: { height: 220, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, lineHeight: 38, fontWeight: '700' },
  metadata: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  small: { fontSize: 12, lineHeight: 18 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  conversation: { marginTop: 8, paddingTop: 26, borderTopWidth: 1, gap: 20 },
  comment: { flexDirection: 'row', gap: 12, paddingBottom: 18, borderBottomWidth: 1 },
  composer: { padding: 18, borderWidth: 1, borderRadius: 16, gap: 16 },
});
