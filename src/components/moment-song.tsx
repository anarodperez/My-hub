import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Pressable, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { MusicNotesIcon } from 'phosphor-react-native/src/icons/MusicNotes';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { PlusIcon } from './hub-icons';
import { Copy } from './hub-ui';
import { ExternalLink } from './external-link';
import { useHub, usePalette } from '@/features/hub/provider';

export function MomentSong() {
  const { state } = useHub();
  const p = usePalette();
  const song = state.song;
  const [failedUri, setFailedUri] = useState('');
  return <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: p.surface, paddingHorizontal: 10, paddingVertical: 6, gap: 6 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={song ? `Cambiar canción: ${song.title}, ${song.artist}` : 'Elegir mi canción del momento'} onPress={() => router.push('/song')} style={({ pressed }) => ({ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.6 : 1 })}>
      {song ? <SongDisc uri={song.coverUrl !== failedUri ? song.coverUrl : ''} onError={() => setFailedUri(song.coverUrl)} /> : <View style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><MusicNotesIcon size={20} color={p.accent} weight="duotone" /></View>}
      <View style={{ flex: 1, gap: 1 }}>
        <Copy muted style={{ fontSize: 10, lineHeight: 14 }}>Mi canción del momento</Copy>
        <Copy numberOfLines={1} style={{ fontSize: 13, lineHeight: 18, fontWeight: '600' }}>{song ? song.title : 'Elegir canción'}</Copy>
        {song && <Copy muted numberOfLines={1} style={{ fontSize: 11, lineHeight: 15 }}>{song.artist}</Copy>}
      </View>
      {!song && <PlusIcon size={17} color={p.muted} />}
    </Pressable>
    {song?.link && <ExternalLink href={song.link as `https://${string}` | `http://${string}`} asChild><Pressable accessibilityRole="link" accessibilityLabel={`Escuchar ${song.title}`} style={({ pressed }) => ({ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}><PlayIcon size={20} color={p.accent} weight="fill" /></Pressable></ExternalLink>}
  </View>;
}

function SongDisc({ uri, onError }: { uri: string; onError: () => void }) {
  const p = usePalette();
  const focused = useIsFocused();
  const rotation = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    let mounted = true;
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    const app = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReducedMotion(value); }).catch(() => {});
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);
  useEffect(() => {
    if (reducedMotion || !focused || !active) return;
    rotation.setValue(0);
    const animation = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    animation.start();
    return () => animation.stop();
  }, [active, focused, reducedMotion, rotation]);
  return <Animated.View accessible={false} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: p.text, borderWidth: 1, borderColor: p.muted, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
    <View style={{ position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: p.muted, opacity: 0.4 }} />
    {uri ? <Image source={uri} onError={onError} contentFit="cover" style={{ width: 22, height: 22, borderRadius: 11 }} /> : <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: p.accent }} />}
    <View style={{ position: 'absolute', top: 5, left: 17, width: 2, height: 5, borderRadius: 1, backgroundColor: p.surface, opacity: 0.6 }} />
    <View style={{ position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: p.surface }} />
  </Animated.View>;
}
