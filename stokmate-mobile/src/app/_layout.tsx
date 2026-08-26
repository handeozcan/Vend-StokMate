import { Stack } from 'expo-router/stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState } from 'react-native';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { ApiError } from '@/api/errors';
import { theme } from '@/theme';

// "Focus" on native = the app is in the foreground (spec §11: mobile uses
// standard mount/focus refetching; the web-only 60s interval bonus is not ported).
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (state) => {
    setFocused(state === 'active');
  });
  return () => subscription.remove();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry only network-level failures (ApiError without status), max once.
      retry: (failureCount, error) =>
        error instanceof ApiError && error.status === undefined && failureCount < 1,
    },
    mutations: { retry: false },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(app)" />
            <Stack.Screen name="(auth)" />
          </Stack>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
