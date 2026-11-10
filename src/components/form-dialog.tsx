import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePalette } from '@/features/hub/provider';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function FormDialog({ busy, onClose, children }: { busy: boolean; onClose: () => void; children: ReactNode }) {
  const p = usePalette();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const compact = width < 700;
  const close = () => { if (!busy) onClose(); };
  return <Modal visible transparent animationType={reduced ? 'none' : compact ? 'slide' : 'fade'} onRequestClose={close}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: compact ? 'flex-end' : 'center', padding: compact ? 0 : 24 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar formulario" disabled={busy} onPress={close} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 720, maxHeight: '92%', backgroundColor: p.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: compact ? 0 : 24, borderBottomRightRadius: compact ? 0 : 24, overflow: 'hidden' }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>{children}</ScrollView>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}
