import { ActionIcon, Button, Input, Tabs, Tooltip } from '@mantine/core';
import { StyleSheet } from 'react-native';
import { useId, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { usePalette } from '@/features/hub/provider';
import type { ActionProps, IconActionProps, SaveActionProps, TabsProps, FieldFrameProps } from './platform-controls';

export function WebAction({ children, onPress, secondary, disabled, icon, label, expanded, style }: ActionProps) {
  const p = usePalette();
  return <Button className="hub-button" variant={secondary ? 'light' : 'filled'} disabled={disabled} onClick={onPress} leftSection={icon}
    aria-label={label} aria-expanded={expanded} styles={{ root: { background: secondary ? p.soft : p.accent, color: secondary ? p.accent : p.onAccent }, label: { whiteSpace: 'normal', textAlign: 'center' } }}
    style={StyleSheet.flatten(style) as CSSProperties}>{children}</Button>;
}

export function WebSaveAction({ onPress, busy = false, disabled = false, children = 'Guardar cambios' }: SaveActionProps) {
  const p = usePalette();
  return <Button className="hub-button" fullWidth loading={busy} disabled={disabled || busy} aria-busy={busy} aria-live="polite" onClick={onPress}
    styles={{ root: { minHeight: 52, background: p.accent, color: p.onAccent }, label: { whiteSpace: 'normal' } }}>{busy ? 'Guardando…' : children}</Button>;
}

export function WebIconAction({ label, onPress, children, disabled, expanded }: IconActionProps) {
  const p = usePalette();
  return <Tooltip label={label} openDelay={500}><ActionIcon className="hub-icon-button" variant="subtle" size={48} color={p.accent} aria-label={label} aria-expanded={expanded} disabled={disabled} onClick={onPress}>{children}</ActionIcon></Tooltip>;
}

export function WebChoiceTabs({ options, value, onChange, disabled, variant = 'segmented' }: TabsProps) {
  const id = useId();
  return <Tabs className={`hub-tabs hub-tabs--${variant}`} value={value} onChange={next => { if (next && !disabled) onChange(next); }} variant={variant === 'underline' ? 'default' : 'pills'} keepMounted>
    <Tabs.List aria-label="Secciones">{options.map(option => <Tabs.Tab key={option.value} value={option.value} disabled={disabled} leftSection={option.icon}>
      {variant === 'segmented' && value === option.value && <motion.span layoutId={`hub-tabs-${id}`} className="hub-tab-selection" aria-hidden="true" />}
      <span className="hub-tab-label">{option.label}</span>
    </Tabs.Tab>)}</Tabs.List>
  </Tabs>;
}

export function WebFieldFrame({ children, label, error }: FieldFrameProps) {
  return <Input.Wrapper className="hub-field" label={label} error={error} errorProps={{ role: 'alert' }}>{children}</Input.Wrapper>;
}
