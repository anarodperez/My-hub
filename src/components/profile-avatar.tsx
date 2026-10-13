import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { UserCircleIcon } from './hub-icons';
import { useHub, usePalette } from '@/features/hub/provider';

export function ProfileAvatar({ size = 42 }: { size?: number }) {
  const { state } = useHub();
  const p = usePalette();
  const [failedUri, setFailedUri] = useState('');
  const { name, avatarUri } = state.preferences;
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('es-ES');
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: p.soft, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
    {avatarUri && avatarUri !== failedUri ? <Image source={avatarUri} onError={() => setFailedUri(avatarUri)} contentFit="cover" accessibilityLabel="Tu foto de perfil" style={{ width: size, height: size }} /> : initials ? <Text style={{ color: p.accent, fontSize: size * 0.37, fontWeight: '600' }}>{initials}</Text> : <UserCircleIcon size={size * 0.6} color={p.accent} weight="duotone" />}
  </View>;
}
