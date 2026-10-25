import Svg, { Circle } from 'react-native-svg';
import { usePalette } from '@/features/hub/provider';

export function HubMark({ size = 36 }: { size?: number }) {
  const p = usePalette();
  return <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}>
    <Circle cx="23" cy="24" r="16" fill={p.soft} stroke={p.accent} strokeWidth="3.5" />
    <Circle cx="41" cy="24" r="16" fill="none" stroke={p.accent} strokeWidth="3.5" />
    <Circle cx="32" cy="40" r="16" fill="none" stroke={p.accent} strokeWidth="3.5" />
    <Circle cx="32" cy="29" r="4" fill={p.accent} />
  </Svg>;
}
