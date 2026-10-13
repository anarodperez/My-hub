import { router } from 'expo-router';
import { View } from 'react-native';
import { CreditCardIcon, PencilSimpleIcon } from '@/components/hub-icons';
import { AddAction, Copy, Empty, IconAction, Privacy, Screen, Section, Surface, s } from '@/components/hub-ui';
import { displayDate, money } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';

export default function SubscriptionsScreen() {
  const { state } = useHub();
  const p = usePalette();
  const items = [...state.subscriptions].sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  const monthly = items.reduce((sum, item) => sum + (item.frequency === 'yearly' ? item.amountCents / 12 : item.amountCents), 0);
  return <Screen title="Tus suscripciones" subtitle="Más historias. Menos sorpresas en la cuenta.">
    <Privacy>Importes y servicios, solo para ti</Privacy>
    <View style={{ backgroundColor: p.sage, borderRadius: 16, padding: 24, gap: 10 }}><Copy style={{ color: p.sageText, fontWeight: '500', fontSize: 14 }}>Estimación mensual</Copy><View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}><Copy style={{ color: p.sageText, fontSize: 40, lineHeight: 48, letterSpacing: -1, fontWeight: '700' }}>{money(Math.round(monthly))}</Copy><Copy style={{ color: p.sageText, fontSize: 13 }}>/ mes</Copy></View><Copy style={{ color: p.sageText, fontSize: 12, lineHeight: 19 }}>{items.length ? 'Incluye el coste anual repartido entre 12 meses.' : 'Añade tus servicios y ten una visión de conjunto.'}</Copy></View>
    <Section title="Próximas renovaciones" trailing={<AddAction onPress={() => router.push({ pathname: '/compose', params: { kind: 'subscription' } })} />} />
    {items.length ? items.map((item) => <Surface key={item.id}><View style={s.inline}><View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><CreditCardIcon color={p.accent} size={24} weight="duotone" /></View><View style={s.fill}><Copy style={{ fontWeight: '600' }}>{item.name}</Copy><Copy muted style={s.small}>{displayDate(item.nextDate)} · {item.frequency === 'monthly' ? 'Mensual' : 'Anual'}</Copy></View><Copy style={{ fontWeight: '600', fontSize: 14 }}>{money(item.amountCents)}</Copy><IconAction label={`Editar ${item.name}`} onPress={() => router.push({ pathname: '/compose', params: { kind: 'subscription', id: item.id } })}><PencilSimpleIcon size={20} color={p.muted} /></IconAction></View></Surface>) : <Empty icon={<CreditCardIcon size={32} color={p.accent} weight="duotone" />} title="Cada servicio, en su sitio" description="Registra streaming, lectura o cine. Tú anotas el precio y la renovación; My Hub los reúne." />}
    <Copy muted style={{ fontSize: 12, lineHeight: 19 }}>Registro personal. No se conectan bancos, no se realizan pagos ni se envían recordatorios todavía.</Copy>
  </Screen>;
}
