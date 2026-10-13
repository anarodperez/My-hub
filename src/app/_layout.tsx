import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HubProvider, usePalette } from '@/features/hub/provider';

function Navigation() {
  const p = usePalette();
  return <ThemeProvider value={p.dark ? DarkTheme : DefaultTheme}><StatusBar style={p.dark ? 'light' : 'dark'} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.background } }}><Stack.Screen name="(tabs)" /><Stack.Screen name="compose" /><Stack.Screen name="settings" /></Stack></ThemeProvider>;
}
export default function RootLayout() { return <HubProvider><Navigation /></HubProvider>; }
