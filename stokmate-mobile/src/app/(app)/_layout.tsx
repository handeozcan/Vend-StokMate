import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { Splash } from '@/components/splash';

/**
 * Guard for the whole authed area (spec §14). SecureStore rehydration is
 * async → splash until `hydrated`; tokenless → /login. The interceptor's
 * failed-refresh path calls clearSession() and this layout reacts by
 * redirecting on the next render — the API layer never touches the router.
 */
export default function AppLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!hydrated) return <Splash />;
  if (!accessToken) return <Redirect href="/login" />;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]/index" options={{ title: 'Ürün Detayı' }} />
      <Stack.Screen name="product/[id]/edit" options={{ title: 'Ürünü Düzenle' }} />
    </Stack>
  );
}
