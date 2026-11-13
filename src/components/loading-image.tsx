import { Image, type ImageProps } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ImageSquareIcon } from 'phosphor-react-native/src/icons/ImageSquare';
import { usePalette } from '@/features/hub/provider';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function LoadingImage(props: ImageProps) {
  // A new source gets its own loading state, including when a signed URL changes.
  return <ImageFrame key={JSON.stringify([props.source, props.recyclingKey])} {...props} />;
}

function ImageFrame({ style, onDisplay, onError, ...props }: ImageProps) {
  const p = usePalette();
  const reduced = useReducedMotion();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  return <View style={[{ overflow: 'hidden', backgroundColor: p.soft }, style]}>
    {status !== 'ready' && <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', gap: 8 }]}>
      <ImageSquareIcon size={24} color={p.muted} weight="duotone" />
      {status === 'loading' && !reduced && <ActivityIndicator size="small" color={p.accent} />}
    </View>}
    <Image cachePolicy="memory-disk" {...props} style={StyleSheet.absoluteFill} transition={reduced ? 0 : 180}
      onDisplay={() => { setStatus('ready'); onDisplay?.(); }}
      onError={event => { setStatus('error'); onError?.(event); }} />
  </View>;
}
