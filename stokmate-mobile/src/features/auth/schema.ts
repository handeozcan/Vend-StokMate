import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'E-posta zorunludur.').email('Geçerli bir e-posta girin.'),
  password: z.string().min(1, 'Şifre zorunludur.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
