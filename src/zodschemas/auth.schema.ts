import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Por favor, ingresa un correo electrónico válido.')
    .email('Por favor, ingresa un correo electrónico válido.'),
  password: z.string().trim().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

export const registerSchema = loginSchema.extend({
  username: z.string().trim().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

export function validateAuthForm(
  isRegister: boolean,
  data: { username: string; email: string; password: string }
) {
  const schema = isRegister ? registerSchema : loginSchema;
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true as const, data: result.data };
  }

  const firstIssue = result.error.issues[0];
  return { success: false as const, error: firstIssue.message, field: firstIssue.path[0] as string };
}
