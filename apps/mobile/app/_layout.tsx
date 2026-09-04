import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DataProvider } from '../src/data/context';
import { useAppFonts } from '../src/theme/fonts';
import { COLORS } from '../src/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: COLORS.cream }} />;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <DataProvider>
          <RootStack />
          <StatusBar style="dark" />
        </DataProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  // Route decisions live in app/index.tsx via <Redirect>. Here we just
  // declare the Stack shape and per-screen presentation options.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.cream },
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="onboarding/index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="recipe/[slug]"
        options={{ presentation: 'card', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="shopping-list" options={{ presentation: 'card' }} />
      <Stack.Screen name="settings" options={{ presentation: 'card' }} />
      <Stack.Screen name="history" options={{ presentation: 'card' }} />
      <Stack.Screen name="auth/sign-in" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth/sign-up" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth/forgot-password" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
