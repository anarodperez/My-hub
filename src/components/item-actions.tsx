import { useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DotsThreeIcon, XIcon } from './hub-icons';
import { Copy } from './hub-ui';
import { usePalette } from '@/features/hub/provider';

type ItemAction = { label: string; onPress: () => void; destructive?: boolean; disabled?: boolean };
export function ItemActions({ label, actions }: { label: string; actions: ItemAction[] }) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const trigger = useRef<View>(null);
  const close = () => {
    setOpen(false);
  };
  const restoreFocus = () => {
    if (Platform.OS === 'web') (trigger.current as unknown as { focus?: () => void })?.focus?.();
  };
  return <>
    <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={({ pressed }) => ({ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: pressed ? p.soft : 'transparent' })}><DotsThreeIcon size={24} color={p.muted} weight="bold" /></Pressable>
    <Modal visible={open} transparent animationType="none" onRequestClose={close} onDismiss={restoreFocus}>
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar opciones" onPress={close} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)' }} />
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 360, maxHeight: '80%', borderRadius: 16, backgroundColor: p.surface, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Copy accessibilityRole="header" style={{ flex: 1, fontWeight: '600', fontSize: 18 }}>{label}</Copy><Pressable accessibilityRole="button" accessibilityLabel="Cerrar opciones" onPress={close} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><XIcon size={20} color={p.muted} /></Pressable></View>
          <ScrollView>{actions.map((action) => <Pressable key={action.label} accessibilityRole="button" accessibilityState={{ disabled: !!action.disabled }} disabled={action.disabled} onPress={() => { close(); action.onPress(); }} style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center', borderRadius: 12, backgroundColor: pressed ? p.soft : 'transparent', opacity: action.disabled ? 0.45 : 1 })}><Copy style={{ color: action.destructive ? p.danger : p.text }}>{action.label}</Copy></Pressable>)}</ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  </>;
}
