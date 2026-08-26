import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Button, HelperText, Surface, Text, TextInput } from 'react-native-paper';
import { useAuthStore } from '@/store/auth';
import { loginSchema, type LoginFormValues } from '@/features/auth/schema';
import { useLogin } from '@/features/auth/use-login';

export default function Login() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const login = useLogin();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Already authed → straight to the products list.
  if (hydrated && accessToken) return <Redirect href="/" />;

  const onSubmit = handleSubmit((values) => {
    // Guard: no double-fire while pending (each login rotates a refresh token).
    if (!login.isPending) login.mutate(values);
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 4 }}>
          <Text variant="headlineMedium">StokMate</Text>
          <Text variant="bodyMedium">Saha personeli girişi</Text>
        </View>

        <Surface mode="elevated" elevation={1} style={{ borderRadius: 16, padding: 20, gap: 16 }}>
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <View>
                <TextInput
                  label="E-posta"
                  autoComplete="email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={Boolean(fieldState.error)}
                />
                {fieldState.error && (
                  <HelperText type="error" visible>
                    {fieldState.error.message}
                  </HelperText>
                )}
              </View>
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <View>
                <TextInput
                  label="Şifre"
                  autoComplete="password"
                  secureTextEntry
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={Boolean(fieldState.error)}
                />
                {fieldState.error && (
                  <HelperText type="error" visible>
                    {fieldState.error.message}
                  </HelperText>
                )}
              </View>
            )}
          />

          {login.isError && (
            <HelperText type="error" visible style={{ fontSize: 14 }}>
              {login.error.message}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={onSubmit}
            disabled={login.isPending}
            contentStyle={{ paddingVertical: 6 }}
          >
            {login.isPending ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </Button>
          <Text variant="labelSmall" style={{ textAlign: 'center', opacity: 0.7 }}>
            Test hesabı: test@ornek.com / Test1234!
          </Text>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
