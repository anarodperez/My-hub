import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { ThumbsUpIcon } from 'phosphor-react-native/src/icons/ThumbsUp';
import { Copy } from './hub-ui';
import { useHub, usePalette } from '@/features/hub/provider';
import { reactionOptions, type ReactionKind, type ReactionSummary } from '@/features/hub/reactions';

const icons = [HeartIcon, ThumbsUpIcon, SparkleIcon];
export function RecommendationReactions({ id, summary }: { id: string; summary?: ReactionSummary }) {
  const { repository } = useHub();
  const p = usePalette();
  const [saved, setSaved] = useState<{ source: typeof summary; value: ReactionSummary }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = useRef(repository);
  const locked = useRef(false);
  useEffect(() => { current.current = repository; return () => { current.current = null; }; }, [repository]);
  const value = saved?.source === summary ? saved?.value : summary;
  const react = async (kind: ReactionKind) => {
    if (!repository || locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const result = await repository.setReaction(id, value?.mine === kind ? null : kind);
      if (current.current === repository) setSaved({ source: summary, value: result });
    } catch { if (current.current === repository) setError('No se pudo guardar tu reacción. Vuelve a intentarlo.'); }
    finally { locked.current = false; if (current.current === repository) setBusy(false); }
  };
  if (!repository) return null;
  return <View style={{ gap: 8 }}>
    <View accessibilityLabel="Reacciones" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {reactionOptions.map((option, index) => {
        const selected = value?.mine === option.value;
        const count = value?.[option.count] || 0;
        const Icon = icons[index];
        return <Pressable key={option.value} accessibilityRole="button" accessibilityLabel={`${option.label}${count ? `, ${count}` : ''}`} accessibilityState={{ selected, disabled: busy }} disabled={busy} onPress={() => { void react(option.value); }} style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: selected ? p.accent : p.line, backgroundColor: selected || pressed ? p.soft : p.surface, opacity: busy ? 0.6 : 1 })}>
          <Icon size={17} color={selected ? p.accent : p.muted} weight={selected ? 'fill' : 'regular'} />
          <Copy style={{ fontSize: 13, lineHeight: 18, color: selected ? p.accent : p.muted, fontWeight: selected ? '600' : '400' }}>{option.label}{count > 0 ? ` · ${count}` : ''}</Copy>
        </Pressable>;
      })}
    </View>
    {!!error && <Copy accessibilityRole="alert" style={{ color: p.danger, fontSize: 13 }}>{error}</Copy>}
  </View>;
}
