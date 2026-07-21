import { z } from 'zod';

export const datosSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es requerido.').max(50, 'El nombre es demasiado largo.'),
  apellido: z.string().trim().min(1, 'El apellido es requerido.').max(50, 'El apellido es demasiado largo.'),
});

export const passwordSchema = z.object({
  passwordActual: z.string().trim().min(1, 'Ingresa tu contraseña actual.'),
  passwordNueva: z.string().trim().min(6, 'La nueva contraseña debe tener al menos 6 caracteres.'),
});

export type DatosFormData = z.infer<typeof datosSchema>;
export type PasswordFormData = z.infer<typeof passwordSchema>;

export function validateDatosForm(data: { nombre: string; apellido: string }) {
  const result = datosSchema.safeParse(data);
  if (result.success) return { success: true as const, data: result.data };
  return { success: false as const, error: result.error.issues[0].message };
}

export function validatePasswordForm(data: { passwordActual: string; passwordNueva: string }) {
  const result = passwordSchema.safeParse(data);
  if (result.success) return { success: true as const, data: result.data };
  return { success: false as const, error: result.error.issues[0].message };
}
