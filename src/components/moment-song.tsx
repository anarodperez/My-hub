import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { MusicNotesIcon } from 'phosphor-react-native/src/icons/MusicNotes';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { PlusIcon } from './hub-icons';
import { Copy } from './hub-ui';
import { ExternalLink } from './external-link';
import { useHub, usePalette } from '@/features/hub/provider';

export function MomentSong({ compact = false }: { compact?: boolean }) {
  const { state } = useHub();
  const p = usePalette();
  const song = state.song;
  const [failedUri, setFailedUri] = useState('');
  if (compact) return song ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Cambiar canción: ${song.title}, ${song.artist}`} onPress={() => router.push('/song')} style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.6 : 1 })}>
      <MusicNotesIcon size={18} color={p.muted} />
      <Copy muted numberOfLines={1} style={{ flex: 1, fontSize: 13 }}>{song.title} · {song.artist}</Copy>
    </Pressable>
    {song.link && <ExternalLink href={song.link as `https://${string}` | `http://${string}`} asChild><Pressable accessibilityRole="link" accessibilityLabel={`Escuchar ${song.title}`} style={({ pressed }) => ({ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}><PlayIcon size={18} color={p.accent} weight="fill" /></Pressable></ExternalLink>}
  </View> : null;
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
  return <View accessible={false} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: p.text, borderWidth: 1, borderColor: p.muted, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: p.muted, opacity: 0.4 }} />
    {uri ? <Image source={uri} onError={onError} contentFit="cover" style={{ width: 22, height: 22, borderRadius: 11 }} /> : <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: p.accent }} />}
    <View style={{ position: 'absolute', top: 5, left: 17, width: 2, height: 5, borderRadius: 1, backgroundColor: p.surface, opacity: 0.6 }} />
    <View style={{ position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: p.surface }} />
  </View>;
}
