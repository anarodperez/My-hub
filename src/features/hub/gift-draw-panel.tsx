import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { GiftIcon } from 'phosphor-react-native/src/icons/Gift';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { Action, Copy, TextAction } from '@/components/hub-ui';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { usePalette } from './provider';
import { giftCountdown } from './gift-draw';
import type { Author, GroupPostRow } from './backend-types';

export function GiftDrawPanel({ post, members, accountId, now, busy, onToggle }: {
  post: GroupPostRow; members: Author[]; accountId: string; now: number; busy: boolean; onToggle: () => void;
}) {
  const p = usePalette();
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const [celebration] = useState(() => new Animated.Value(1));
  const [interestMotion] = useState(() => new Animated.Value(1));
  const participants = members.filter(member => member.id !== post.owner_id && post.group_post_responses.some(response => response.owner_id === member.id));
  const interested = participants.some(member => member.id === accountId);
  const previousInterest = useRef(interested);
  const own = post.owner_id === accountId;
  const closed = Date.parse(post.gift_draw_at!) <= now;
  const winner = members.find(member => member.id === post.reserved_for);
  useEffect(() => {
    const joined = interested && !previousInterest.current;
    previousInterest.current = interested;
    if (!joined || reduced) { interestMotion.setValue(1); return; }
    interestMotion.setValue(0);
    const animation = Animated.timing(interestMotion, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [interested, reduced, interestMotion]);
  useEffect(() => {
    if (!revealed || reduced) { celebration.setValue(1); return; }
    celebration.setValue(0);
    const animation = Animated.timing(celebration, { toValue: 1, duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [revealed, reduced, celebration]);
  const deadline = new Date(post.gift_draw_at!).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return <View style={{ gap: 20 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: p.line }}>
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: post.gift_drawn_at ? p.sage : p.peach, alignItems: 'center', justifyContent: 'center' }}>
        {post.gift_drawn_at ? <CheckCircleIcon size={23} color={p.sageText} weight="duotone" /> : <ClockIcon size={23} color={p.peachText} weight="duotone" />}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Copy style={{ color: post.gift_drawn_at ? p.sageText : p.text, fontSize: 18, lineHeight: 24, fontWeight: '600' }}>{post.gift_drawn_at ? 'Sorteo cerrado' : giftCountdown(post.gift_draw_at!, now)}</Copy>
        <Copy muted style={{ fontSize: 13 }}>Cierre: {deadline}</Copy>
      </View>
    </View>
    <View style={{ gap: 10 }}>
      <Copy style={{ fontWeight: '600', fontSize: 14 }}>{participants.length === 1 ? '1 amiga apuntada' : `${participants.length} amigas apuntadas`}</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {participants.map(member => <View key={member.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%', paddingVertical: 5, paddingLeft: 5, paddingRight: 12, borderRadius: 24, backgroundColor: member.id === accountId ? p.sage : p.soft }}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: member.id === accountId ? p.accent : p.surface }}><Copy style={{ fontSize: 13, fontWeight: '600', color: member.id === accountId ? p.onAccent : p.accent }}>{member.name.trim().slice(0, 1).toUpperCase()}</Copy></View>
          <Copy style={{ fontSize: 14, flexShrink: 1, color: member.id === accountId ? p.sageText : p.text }}>{member.id === accountId ? `${member.name} (tú)` : member.name}</Copy>
        </View>)}
      </View>
      {!participants.length && !closed && <Copy muted style={{ fontSize: 14 }}>{own ? 'Tu regalo está esperando a su próxima dueña.' : 'Puedes ser la primera en darle otra vida.'}</Copy>}
    </View>
    {post.gift_drawn_at ? (post.reserved_for ? <View style={{ gap: 12 }}>
      {!revealed ? <View style={{ alignItems: 'center', gap: 14, paddingTop: 12 }}>
        <View accessible={false} style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: p.peach, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] }}><GiftIcon size={48} color={p.accent} weight="duotone" /></View>
        <View style={{ gap: 4 }}><Copy style={{ textAlign: 'center', fontSize: 22, lineHeight: 28, fontWeight: '600' }}>Hay una sorpresa esperando</Copy><Copy muted style={{ textAlign: 'center', fontSize: 14 }}>El sorteo ya tiene ganadora.</Copy></View>
        <Action style={{ alignSelf: 'stretch', justifyContent: 'center' }} label="Abrir el regalo y descubrir la ganadora" disabled={busy} icon={<SparkleIcon size={20} color={p.onAccent} weight="fill" />} onPress={() => setRevealed(true)}>Abrir el regalo</Action>
      </View> : <View style={{ paddingVertical: 24, paddingHorizontal: 8, gap: 12, alignItems: 'center', overflow: 'hidden' }}>
        {!reduced && Array.from({ length: 12 }, (_, index) => {
          const angle = index * Math.PI / 6;
          return <Animated.View key={index} pointerEvents="none" accessible={false} style={{ position: 'absolute', top: '45%', left: '50%', width: 5, height: 10, borderRadius: 2, backgroundColor: index % 2 ? p.accent : p.peachText, opacity: celebration.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateX: celebration.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * 125] }) }, { translateY: celebration.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * 65] }) }, { rotate: `${index * 35}deg` }] }} />;
        })}
        <Animated.View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: p.peach, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: celebration.interpolate({ inputRange: [0, 0.25, 0.5, 1], outputRange: ['-12deg', '12deg', '-6deg', '0deg'] }) }, { scale: celebration.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.8, 1.15, 1] }) }] }}><GiftIcon size={56} color={p.accent} weight="duotone" /></Animated.View>
        <Copy accessibilityLiveRegion="polite" style={{ textAlign: 'center', fontSize: 30, lineHeight: 36, fontWeight: '600', color: p.accent }}>{post.reserved_for === accountId ? '¡Te ha tocado!' : `¡Es para ${winner?.name || 'la ganadora'}!`}</Copy>
        <Copy muted style={{ textAlign: 'center', fontSize: 14, lineHeight: 21 }}>{post.status === 'delivered' ? 'Regalo entregado. ¡Que lo disfrutes!' : 'Una nueva vida para este regalo. Ya podéis acordar cómo hacer la entrega.'}</Copy>
      </View>}
    </View> : <Copy>{post.status === 'delivered' ? 'Regalo entregado. La ganadora ya no tiene cuenta.' : post.status === 'reserved' ? 'Este regalo ya se sorteó. La ganadora ya no tiene cuenta.' : 'Esta vez nadie se apuntó. Puedes publicar el regalo de nuevo.'}</Copy>) : closed ? <Copy accessibilityLiveRegion="polite">Inscripciones cerradas. El resultado aparecerá al actualizar, normalmente en menos de un minuto.</Copy> : own ? <Copy style={{ color: p.peachText, fontSize: 14 }}>Al cerrar el plazo, se elegirá al azar entre las amigas apuntadas. Si solo hay una, será para ella.</Copy> : <View style={{ gap: 4 }}>
      <Animated.View style={{ transform: [{ scale: interestMotion.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.97, 1.02, 1] }) }] }}>
        <Action style={{ alignSelf: 'stretch', justifyContent: 'center' }} secondary={interested} disabled={busy} icon={interested ? <CheckCircleIcon size={21} color={p.accent} weight="fill" /> : <SparkleIcon size={21} color={p.onAccent} />} onPress={onToggle}>{interested ? 'Estás dentro del sorteo' : '¡Lo quiero!'}</Action>
      </Animated.View>
      {interested ? <TextAction disabled={busy} onPress={onToggle}>Retirar mi participación</TextAction> : <Copy muted style={{ fontSize: 13, textAlign: 'center', marginTop: 6 }}>Todas tenéis la misma oportunidad.</Copy>}
    </View>}
  </View>;
}
