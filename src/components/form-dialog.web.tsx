import { Modal } from '@mantine/core';
import type { ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { usePalette } from '@/features/hub/provider';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function FormDialog({ busy, onClose, children }: { busy: boolean; onClose: () => void; children: ReactNode }) {
  const p = usePalette();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  return <Modal.Root opened onClose={() => { if (!busy) onClose(); }} centered size={720} padding={0} radius="lg"
    closeOnClickOutside={!busy} closeOnEscape={!busy} trapFocus returnFocus
    transitionProps={{ transition: width < 700 ? 'slide-up' : 'fade', duration: reduced ? 0 : 180 }}
    styles={{ content: { background: p.surface, maxHeight: '92dvh' }, body: { padding: 0 } }}>
    <Modal.Overlay backgroundOpacity={0.4} />
    <Modal.Content aria-label="Formulario"><Modal.Body>{children}</Modal.Body></Modal.Content>
  </Modal.Root>;
}
