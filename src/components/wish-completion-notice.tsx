import { useIsFocused } from '@react-navigation/native';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { CheckIcon } from './hub-icons';
import { Copy } from './hub-ui';
import { usePalette } from '@/features/hub/provider';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function WishCompletionNotice({ message }: { message: string }) {
  const p = usePalette();
  const reduced = useReducedMotion();
  const visible = useIsFocused();
  const [progress] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced || !visible || message !== 'Deseo cumplido') { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 650, useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [message, progress, reduced, visible]);
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ transform: [{ scale: progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.8, 1.15, 1] }) }] }}><CheckIcon size={22} color={p.sageText} weight="bold" /></Animated.View>
      {[[-12, -10], [12, -9], [10, 11]].map(([x, y], index) => <Animated.View key={index} style={{ position: 'absolute', opacity: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }), transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [x * 0.4, x] }) }, { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [y * 0.4, y] }) }, { scale: progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 1, 0.6] }) }] }}><SparkleIcon size={10} color={p.accent} weight="fill" /></Animated.View>)}
    </View>
    <Copy accessibilityLiveRegion="polite" style={{ flexShrink: 1, fontSize: 14, color: p.sageText }}>{message}</Copy>
  </View>;
}
