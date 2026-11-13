import { View } from 'react-native';
import { Copy, IconAction } from './hub-ui';
import { TrashIcon } from './hub-icons';
import { usePalette } from '@/features/hub/provider';
import type { CommentRow } from '@/features/hub/backend-types';

export function DiscoveryComment({ comment, authorName, own, busy, onRemove }: {
  comment: CommentRow; authorName: string; own: boolean; busy: boolean; onRemove: () => void;
}) {
  const p = usePalette();
  return <View style={{ flexDirection: own ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 8 }}>
    <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: own ? p.soft : p.sage }}><Copy style={{ color: own ? p.accent : p.sageText, fontSize: 12, fontWeight: '600' }}>{authorName.trim().charAt(0).toLocaleUpperCase('es-ES') || '?'}</Copy></View>
    <View style={{ flex: 1, minWidth: 0, padding: 14, gap: 8, borderRadius: 16, borderTopLeftRadius: own ? 16 : 4, borderTopRightRadius: own ? 4 : 16, backgroundColor: own ? p.soft : p.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Copy style={{ fontSize: 13, lineHeight: 18, fontWeight: '600' }}>{own ? 'Tú' : authorName}</Copy><Copy muted style={{ fontSize: 11, lineHeight: 16 }}>{new Date(comment.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</Copy></View>
        {own && <IconAction label="Eliminar mi comentario" disabled={busy} onPress={onRemove}><TrashIcon size={17} color={p.danger} /></IconAction>}
      </View>
      {!!comment.body && <Copy style={{ fontSize: 15, lineHeight: 23 }}>{comment.body}</Copy>}
      {!comment.body && !!comment.gif_path && <Copy muted>Adjunto antiguo no disponible</Copy>}
    </View>
  </View>;
}
