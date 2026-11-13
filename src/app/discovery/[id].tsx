import { RecommendationReactions } from '@/components/recommendation-reactions';
import { LoadingImage as Image } from '@/components/loading-image';
import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { RecommendationPlanAction } from '@/components/recommendation-plan-action';
import { ShareDiscovery } from '@/components/share-discovery';
import { RatingSummary } from '@/components/rating-summary';
import { DiscoveryComment } from '@/components/discovery-comment';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Action, CategoryIcon, Copy, Field, IconAction, Screen, TextAction } from '@/components/hub-ui';
import { ArrowRightIcon, ChatCircleIcon, LockSimpleIcon, PencilSimpleIcon, MapPinIcon } from '@/components/hub-icons';
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
  const { width, fontScale } = useWindowDimensions();
  const sideBySide = width >= 1200 && fontScale <= 1.3;
  const current = useRef(repository);
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
    const [row, page, summaries] = await Promise.all([repository.getDiscovery(id), repository.listComments(id, last ? { id: last.id, created_at: last.created_at } : undefined), repository.listReactionSummaries([id])]);
    if (!row) throw new Error('Esta publicación ya no está disponible para tu cuenta.');
    const identities = [...new Set([row.owner_id, ...page.map((entry) => entry.author_id)])];
    const [mapped, names] = await Promise.all([mapRecommendation(row, media), Promise.all(identities.map((user) => repository.author(user)))]);
    if (current.current !== repository) return;
    setPost({ ...mapped, reactions: summaries[0] }); setComments((previous) => next ? [...previous, ...page.filter((entry) => !previous.some((old) => old.id === entry.id))] : page);
    setAuthors((previous) => ({ ...previous, ...Object.fromEntries(names.filter((entry): entry is Author => !!entry).map((entry) => [entry.id, entry])) }));
    setMore(page.length === 30);
  };
  useEffect(() => {
    current.current = repository; setPost(undefined); setComments([]); setAuthors({}); setBody(''); setBusy(false); setError(''); draft.current = null;
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
  return <Screen wide back title="Descubrimiento" contentStyle={{ gap: 24 }}>
    {post && <View style={{ flexDirection: sideBySide ? 'row' : 'column', alignItems: 'flex-start', gap: 24 }}>
      <View style={{ flex: sideBySide ? 1 : undefined, width: sideBySide ? undefined : '100%', minWidth: 0, backgroundColor: p.surface, borderRadius: 16, padding: sideBySide ? 28 : 20, gap: 24 }}>
      <View style={{ flexDirection: sideBySide ? 'row' : 'column', alignItems: 'flex-start', gap: 24 }}>
      {!!post.coverUrl && post.coverUrl !== failedCover && <View style={[d.hero, { width: sideBySide ? 180 : post.category === 'book' ? 160 : '100%', backgroundColor: p.background }]}>
        <Image source={post.coverUrl} onError={() => setFailedCover(post.coverUrl)} style={{ width: '100%', height: post.category === 'book' ? 240 : 200 }} contentFit={post.category === 'book' || post.category === 'product' ? 'contain' : 'cover'} accessibilityLabel={`Portada de ${post.title}`} />
      </View>}
      <View style={{ flex: sideBySide ? 1 : undefined, minWidth: 0, gap: 14 }}>
        {(!post.coverUrl || post.coverUrl === failedCover) && <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><CategoryIcon category={post.category} size={30} /></View>}
        <Copy accessibilityRole="header" style={d.title}>{post.title}</Copy>
        <View style={d.metadata}>
          <View style={d.inline}><CategoryIcon category={post.category} size={16} /><Copy muted style={d.small}>{recommendationCategories.find((entry) => entry.value === post.category)?.singular}</Copy></View>
          <RatingSummary value={post.rating} />
          {post.visibility === 'private' && <View style={d.inline}><LockSimpleIcon size={14} color={p.muted} /><Copy muted style={d.small}>Solo tú</Copy></View>}
          {post.visibility === 'group' && <Copy muted style={d.small}>Grupo privado</Copy>}
          {post.sample && <Copy style={{ color: p.accent, fontSize: 12 }}>Contenido de ejemplo</Copy>}
        </View>
      </View>
      </View>
      <View style={[d.authorRow, { backgroundColor: p.background }]}>
        <View style={[d.avatar, { backgroundColor: p.soft }]}><Copy style={{ color: p.accent, fontSize: 18, fontWeight: '600' }}>{(authors[post.ownerId!]?.name || 'Usuario').charAt(0).toUpperCase()}</Copy></View>
        <View style={{ flex: 1, gap: 2 }}><Copy style={{ fontSize: 15, fontWeight: '600' }}>{authors[post.ownerId!]?.name || 'Usuario'}</Copy><Copy muted style={d.small}>{new Date(post.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</Copy></View>
        {post.ownerId === repository?.accountId && <IconAction label="Editar descubrimiento" onPress={() => router.push({ pathname: '/compose', params: { id, kind: 'recommendation' } })}><PencilSimpleIcon size={21} color={p.accent} /></IconAction>}
      </View>
      <View style={{ gap: 12, paddingVertical: 4 }}>
        <Copy accessibilityRole="header" style={d.sectionTitle}>Por qué merece la pena</Copy>
        <Copy style={{ fontSize: 16, lineHeight: 26 }}>{post.opinion}</Copy>
        {post.priceCents !== undefined && <Copy style={{ fontSize: 20, fontWeight: '600' }}>{money(post.priceCents)}</Copy>}
        {!!post.location && <View style={d.inline}><MapPinIcon size={18} color={p.muted} /><Copy muted style={{ flex: 1 }}>{post.location}</Copy></View>}
        {!!post.link && <ExternalLink href={post.link as `https://${string}` | `http://${string}`}><Copy style={{ color: p.accent, paddingVertical: 12, fontWeight: '600' }}>{post.category === 'product' ? 'Ver producto' : 'Visitar web'} ↗</Copy></ExternalLink>}
      </View>
      {!post.sample && <RecommendationReactions key={`${repository?.accountId}:${post.id}`} id={post.id} summary={post.reactions} />}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 }}>
        <RecommendationPlanAction showLabel title={post.title} description={post.opinion} />
        <ShareDiscovery showLabel key={post.id} post={post} onShared={() => load()} />
      </View>
      </View>
      <View style={[d.conversation, { width: sideBySide ? 360 : '100%', backgroundColor: p.surface }]}>
        <View style={[d.inline, { justifyContent: 'space-between' }]}><Copy accessibilityRole="header" style={d.sectionTitle}>La conversación</Copy><View style={d.inline}><ChatCircleIcon size={19} color={p.muted} /><Copy muted style={d.small}>{post.commentCount || comments.length}</Copy></View></View>
        {!comments.length && <View style={{ paddingVertical: 12, gap: 5 }}><Copy style={{ fontWeight: '600' }}>La primera opinión puede ser la tuya</Copy><Copy muted style={{ fontSize: 15, lineHeight: 22 }}>¿Lo conocías? Comparte lo que te hizo sentir.</Copy></View>}
        {comments.map(comment => <DiscoveryComment key={comment.id} comment={comment} authorName={authors[comment.author_id]?.name || 'Usuario'} own={comment.author_id === repository?.accountId} busy={busy} onRemove={() => remove(comment.id)} />)}
        {more && <TextAction disabled={busy} onPress={() => { void load(true).catch((failure) => setError(failure.message)); }}>Ver más comentarios</TextAction>}
        <View style={[d.composer, { borderColor: p.line }]}>
          <Field label="Únete a la conversación" value={body} onChangeText={setBody} maxLength={2000} multiline editable={!busy} placeholder="Tu opinión, una pregunta, una recomendación…" />
          <View style={{ alignItems: 'flex-end' }}><Action disabled={busy || !body.trim()} icon={busy ? <ActivityIndicator size="small" color={p.onAccent} /> : <ArrowRightIcon size={18} color={p.onAccent} />} onPress={() => { void send(); }}>{busy ? 'Enviando…' : 'Enviar comentario'}</Action></View>
        </View>
      </View>
    </View>}
    {!!error && <Copy accessibilityRole="alert">{error}</Copy>}
    {!!error && <TextAction disabled={busy} onPress={() => { setError(''); void load().catch((failure) => setError(failure.message)); }}>Volver a intentar</TextAction>}
    {!post && !error && <View style={{ alignItems: 'center', paddingVertical: 48, gap: 16 }}><ActivityIndicator color={p.accent} /><Copy muted>Cargando descubrimiento…</Copy></View>}
  </Screen>;
}

const d = StyleSheet.create({
  hero: { borderRadius: 12, overflow: 'hidden' },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  metadata: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  small: { fontSize: 12, lineHeight: 18 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  conversation: { padding: 20, borderRadius: 16, gap: 16 },
  composer: { paddingTop: 16, borderTopWidth: 1, gap: 12 },
});
