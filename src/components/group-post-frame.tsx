import type { ReactNode } from 'react';
import { Screen } from './hub-ui';
import { FormDialog } from './form-dialog';

export function GroupPostFrame({ plan, groupName, busy, onClose, children }: { plan: boolean; groupName: string; busy: boolean; onClose: () => void; children: ReactNode }) {
  return plan ? <FormDialog busy={busy} onClose={onClose}>{children}</FormDialog> : <Screen back title="Compartir algo" subtitle={groupName || undefined}>{children}</Screen>;
}
