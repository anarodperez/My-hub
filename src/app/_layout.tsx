import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { HubProvider, usePalette } from '@/features/hub/provider';
import { AccountProvider, useAccount } from '@/features/account/provider';
import { useFonts } from 'expo-font';
import { hubFonts } from '@/constants/hub-design';

function Navigation() {
  const p = usePalette();
  const { session, loading } = useAccount();
  const [fontsLoaded, fontError] = useFonts(hubFonts);
  if (loading || (!fontsLoaded && !fontError)) return <View style={{ flex: 1, backgroundColor: p.background, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={p.accent} accessibilityLabel="Preparando My Hub" /></View>;
  return <ThemeProvider value={p.dark ? DarkTheme : DefaultTheme}>
    <StatusBar style={p.dark ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.background } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="compose" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="wish" />
        <Stack.Screen name="review" />
        <Stack.Screen name="song" />
        <Stack.Screen name="discovery/[id]" />
        <Stack.Screen name="groups" />
        <Stack.Screen name="group/[id]" />
        <Stack.Screen name="group-space" />
        <Stack.Screen name="group-post" />
      </Stack.Protected>
      <Stack.Screen name="account" />
    </Stack>
  </ThemeProvider>;
}
export default function RootLayout() { return <AccountProvider><HubProvider><Navigation /></HubProvider></AccountProvider>; }
