import type { Metadata } from 'next';
import { connection } from 'next/server';
import { LoginView } from '@/features/auth/LoginView';

export const metadata: Metadata = { title: 'Giriş' };

// connection(): the login view reads `?from=` via useSearchParams — this page
// must never be statically prerendered (Suspense would otherwise be required).
export default async function LoginPage() {
  await connection();
  return <LoginView />;
}
