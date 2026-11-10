import { useState } from 'react';
import { View } from 'react-native';
import { GavelIcon } from 'phosphor-react-native/src/icons/Gavel';
import { TagIcon } from 'phosphor-react-native/src/icons/Tag';
import { Action, Copy, Field, TextAction } from '@/components/hub-ui';
import { usePalette } from './provider';
import { giftCountdown } from './gift-draw';
import { offerPrice, parseOfferPrice } from './offer-pricing';
import type { Author, GroupPostRow } from './backend-types';

export function PricedGiftPanel({ post, members, accountId, now, busy, onBid, onReserve }: {
  post: GroupPostRow; members: Author[]; accountId: string; now: number; busy: boolean;
  onBid: (amount: number) => void; onReserve: () => void;
}) {
  const p = usePalette();
  const [amount, setAmount] = useState('');
  const [confirming, setConfirming] = useState<number | null>(null);
  const [error, setError] = useState('');
  const auction = post.offer_mode === 'auction';
  const bids = (post.group_post_bids || []).filter(bid => members.some(member => member.id === bid.owner_id));
  const leading = bids.reduce<(typeof bids)[number] | undefined>((best, bid) => !best || bid.amount_cents > best.amount_cents ? bid : best, undefined);
  const current = post.winning_bid_cents ?? leading?.amount_cents ?? post.price_cents!;
  const minimum = leading ? leading.amount_cents + 100 : post.price_cents!;
  const closed = post.status !== 'open' || !!post.gift_drawn_at || (auction && Date.parse(post.gift_draw_at!) <= now);
  const own = post.owner_id === accountId;
  const recipient = members.find(member => member.id === post.reserved_for)?.name || 'la destinataria';
  const prepare = () => {
    setError('');
    try {
      const cents = auction ? parseOfferPrice(amount) : post.price_cents!;
      if (auction && cents < minimum) throw new Error(`La puja mínima es ${offerPrice(minimum)}.`);
      setConfirming(cents);
    } catch (failure) { setError((failure as Error).message); }
  };
  return <View style={{ gap: 16 }}>
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderColor: p.line }}>
      {auction ? <GavelIcon size={28} color={p.accent} weight="duotone" /> : <TagIcon size={28} color={p.accent} weight="duotone" />}
      <View style={{ flex: 1, gap: 2 }}><Copy muted style={{ fontSize: 13 }}>{auction ? post.winning_bid_cents != null ? 'Importe de cierre' : !post.gift_drawn_at && leading ? 'Puja más alta' : 'Precio de salida' : 'Precio fijo'}</Copy><Copy style={{ fontSize: 30, lineHeight: 36, fontWeight: '600', color: p.accent }}>{offerPrice(current)}</Copy></View>
    </View>
    {auction && <Copy muted>{post.gift_drawn_at ? 'Subasta cerrada' : giftCountdown(post.gift_draw_at!, now)} · {bids.length} {bids.length === 1 ? 'participante' : 'participantes'}</Copy>}
    {auction && !closed && leading && <Copy style={{ color: leading.owner_id === accountId ? p.sageText : p.text }}>{leading.owner_id === accountId ? 'Tu puja va en cabeza' : `Va en cabeza ${members.find(member => member.id === leading.owner_id)?.name || 'una amiga'}`}</Copy>}
    {closed ? <Copy accessibilityLiveRegion="polite" style={{ fontWeight: '600', color: p.sageText }}>{post.status === 'delivered' ? 'Artículo entregado' : post.reserved_for ? post.reserved_for === accountId ? (auction ? '¡Has ganado la subasta!' : 'Reservado para ti') : `Reservado para ${recipient}` : post.status === 'reserved' ? 'La destinataria ya no tiene cuenta.' : post.gift_drawn_at ? 'La subasta terminó sin pujas.' : 'Subasta cerrada. Actualiza para ver el resultado.'}</Copy> : own ? <Copy muted>{auction ? 'Al cerrar el plazo se reservará para la puja más alta.' : 'La primera amiga que confirme la reserva se lo queda.'}</Copy> : confirming !== null ? <View style={{ gap: 8 }}>
      <Copy>¿{auction ? 'Confirmas tu puja' : 'Reservas este artículo'} por {offerPrice(confirming)}?</Copy>
      <Action disabled={busy} onPress={() => { if (auction) onBid(confirming); else onReserve(); setConfirming(null); }}>{auction ? 'Confirmar puja' : 'Confirmar reserva'}</Action>
      <TextAction disabled={busy} onPress={() => setConfirming(null)}>Cancelar</TextAction>
    </View> : <View style={{ gap: 10 }}>
      {auction && <Field variant="outlined" label={`Tu puja (€) · mínimo ${offerPrice(minimum)}`} placeholder={(minimum / 100).toFixed(2).replace('.', ',')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" maxLength={9} editable={!busy} />}
      <Action disabled={busy || (auction && minimum > 99999999)} onPress={prepare}>{auction ? 'Revisar mi puja' : `Me lo quedo por ${offerPrice(current)}`}</Action>
    </View>}
    {!!error && <Copy accessibilityRole="alert" style={{ color: p.danger }}>{error}</Copy>}
    <Copy muted style={{ fontSize: 13 }}>Pago y entrega a acordar entre vosotras. No se realiza ningún cobro en la app.</Copy>
  </View>;
}
