import { Platform } from 'react-native';

// React Native Web maps dataSet to DOM attributes; native keeps its existing feedback.
export function webMotion(name: 'card' | 'navigation' | 'tab' | 'control' | 'brand') {
  return Platform.OS === 'web' ? { dataSet: { motion: name } } : {};
}
