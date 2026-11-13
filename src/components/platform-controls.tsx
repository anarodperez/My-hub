import type { ComponentProps, ReactNode } from 'react';
import type { Action, IconAction, SaveAction } from './hub-ui';

export type ActionProps = ComponentProps<typeof Action>;
export type IconActionProps = ComponentProps<typeof IconAction>;
export type SaveActionProps = ComponentProps<typeof SaveAction>;
export type TabsProps = { options: { value: string; label: string; icon?: ReactNode }[]; value: string; onChange: (value: string) => void; disabled?: boolean; variant?: 'underline' | 'segmented' };
export type FieldFrameProps = { label: string; error?: string; children: ReactNode };

// Metro substitutes the web implementation; native bundles never import Mantine.
export function WebAction(_props: ActionProps) { return null; }
export function WebIconAction(_props: IconActionProps) { return null; }
export function WebSaveAction(_props: SaveActionProps) { return null; }
export function WebChoiceTabs(_props: TabsProps) { return null; }
export function WebFieldFrame({ children }: FieldFrameProps) { return children; }
