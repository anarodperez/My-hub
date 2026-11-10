import { router } from 'expo-router';
import { View } from 'react-native';
import { CheckIcon, XIcon } from './hub-icons';
import { Copy, IconAction, TextAction } from './hub-ui';
import { usePalette, useHub } from '@/features/hub/provider';
import { useViewState } from '@/hooks/use-view-state';

export function GettingStarted({ hasGroup, hasPlan }: { hasGroup: boolean; hasPlan: boolean }) {
  const { state } = useHub();
  const p = usePalette();
  const [dismissed, setDismissed] = useViewState('onboarding.dismissed', false);
  const steps = [
    { label: 'Reúne a las tuyas', detail: 'Crea un grupo o únete con un código.', done: hasGroup, action: () => router.push('/groups') },
    { label: 'Guarda tu primer deseo', detail: 'Una lectura pendiente, un regalo o un sitio.', done: !!state.saved.length || !!state.wishes?.length, action: () => router.push('/library') },
    { label: 'Haz hueco para un plan', detail: 'Añade algo que te apetezca a tu calendario.', done: hasPlan || !!state.events.length, action: () => router.push({ pathname: '/compose', params: { kind: 'event' } }) },
  ];
  const completed = steps.filter(step => step.done).length;
  if (dismissed || completed === steps.length) return null;
  return <View style={{ backgroundColor: p.surface, borderRadius: 20, padding: 20, gap: 16 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1, gap: 4 }}><Copy accessibilityRole="header" style={{ fontSize: 22, fontWeight: '700' }}>Tu espacio empieza aquí</Copy><Copy muted>{completed} de 3 pasos completados</Copy></View><IconAction label="Ocultar guía por ahora" onPress={() => setDismissed(true)}><XIcon size={22} color={p.muted} /></IconAction></View>
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 3, now: completed }} style={{ height: 4, borderRadius: 2, backgroundColor: p.soft }}><View style={{ height: 4, width: `${completed / 3 * 100}%`, backgroundColor: p.accent, borderRadius: 2 }} /></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>{steps.map(step => <View key={step.label} style={{ flexGrow: 1, flexBasis: 220, gap: 4 }}>
      {step.done ? <View style={{ flexDirection: 'row', minHeight: 48, alignItems: 'center', gap: 8 }}><CheckIcon color={p.sageText} size={20} /><Copy style={{ color: p.sageText, fontWeight: '600', flexShrink: 1 }}>{step.label}</Copy></View> : <TextAction onPress={step.action}>{step.label}</TextAction>}
      <Copy muted>{step.detail}</Copy>
    </View>)}</View>
  </View>;
}
