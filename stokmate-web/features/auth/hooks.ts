import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: setSession,
  });
}
