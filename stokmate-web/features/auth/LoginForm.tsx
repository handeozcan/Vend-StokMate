'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Spinner } from '@/components/ui';
import { Field } from '@/components/form';
import { loginSchema, type LoginFormValues } from './schemas';
import { useLogin } from './hooks';

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const login = useLogin();

  // Guard: Enter in a text input submits even while the button is disabled —
  // don't fire a second login (each login rotates a single-use refresh token).
  const onSubmit = handleSubmit((values) => {
    if (!login.isPending) login.mutate(values);
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-sm"
    >
      <h1 className="mb-6 text-xl font-semibold">StokMate — Giriş</h1>
      <div className="flex flex-col gap-4">
        {login.isError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-600/20">
            {login.error.message}
          </p>
        )}
        <Field
          label="E-posta"
          id="email"
          type="email"
          autoComplete="email"
          placeholder="test@ornek.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Field
          label="Şifre"
          id="password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" disabled={login.isPending} className="h-10">
          {login.isPending && <Spinner />}
          {login.isPending ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </Button>
        <p className="text-center text-xs text-zinc-500">
          Test hesabı: test@ornek.com / Test1234!
        </p>
      </div>
    </form>
  );
}
