import { Redirect, useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { Button, Card, Divider, List, Text } from 'react-native-paper';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth';
import { formatDateTime } from '@/lib/format';

export default function Profile() {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const clearSession = useAuthStore((s) => s.clearSession);

  if (!hydrated) return null;
  if (!user) return <Redirect href="/login" />;

  const handleLogout = async () => {
    try {
      // Best-effort server-side revocation — clear locally regardless.
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // ignore: session is cleared below anyway
    }
    clearSession();
    router.replace('/login');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card mode="elevated">
        <Card.Title title={user.fullName} subtitle={user.email} />
        <Card.Content>
          <Divider />
          <List.Item
            title="Oturum bitişi"
            description={expiresAt ? formatDateTime(expiresAt) : '—'}
            left={(props) => <List.Icon {...props} icon="clock-outline" />}
          />
          <Divider />
          <List.Item
            title="Erişim anahtarı yenileme"
            description="Oturum düşerse otomatik yenilenir (15 dk)."
            left={(props) => <List.Icon {...props} icon="refresh" />}
          />
        </Card.Content>
      </Card>

      <Button mode="contained" onPress={handleLogout} contentStyle={{ paddingVertical: 6 }}>
        Çıkış yap
      </Button>
      <Text variant="labelSmall" style={{ textAlign: 'center', opacity: 0.6 }}>
        StokMate — saha personeli
      </Text>
    </ScrollView>
  );
}
