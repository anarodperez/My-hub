import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, type ViewProps } from 'react-native';
import Reanimated, { Easing as MotionEasing, FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const arrival = FadeIn.duration(180).easing(MotionEasing.out(MotionEasing.cubic)).reduceMotion(ReduceMotion.System);

// Only use on conditional panels, never on every card in a scrolling list.
export function MotionReveal(props: ViewProps) {
  return <Reanimated.View {...props} entering={arrival} exiting={FadeOut.duration(120).reduceMotion(ReduceMotion.System)} />;
}

// Keep children mounted so transitions preserve text input focus and local state.
export function MotionContent({ changeKey, children, style, distance = 0 }: { changeKey: string; children: ReactNode; style?: ViewProps['style']; distance?: number }) {
  const reduced = useReducedMotion();
  const previous = useRef(changeKey);
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    opacity.stopAnimation();
    if (reduced || previous.current === changeKey) {
      previous.current = changeKey;
      opacity.setValue(1);
      return;
    }
    previous.current = changeKey;
    opacity.setValue(0.75);
    const animation = Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web', isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [changeKey, reduced, opacity]);
  return <Animated.View style={[style, { opacity }, !reduced && distance > 0 && { transform: [{ translateY: opacity.interpolate({ inputRange: [0.75, 1], outputRange: [distance, 0], extrapolate: 'clamp' }) }] }]}>{children}</Animated.View>;
}
