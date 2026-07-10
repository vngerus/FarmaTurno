import { z } from 'zod';

export const medicamentoSchema = z
  .object({
    nombre: z.string().trim().min(1, 'El nombre del medicamento es requerido.'),
    dosis: z.string().trim().min(1, 'La dosis es requerida (ej: 1 tableta).'),
    stockActual: z
      .string()
      .min(1, 'El stock actual debe ser un número entero mayor o igual a 0.')
      .regex(/^\d+$/, 'El stock actual debe ser un número entero mayor o igual a 0.')
      .transform(val => parseInt(val, 10)),
    stockMaximo: z
      .string()
      .min(1, 'El stock máximo debe ser un número entero mayor que 0.')
      .regex(/^\d+$/, 'El stock máximo debe ser un número entero mayor que 0.')
      .transform(val => parseInt(val, 10))
      .refine(val => val > 0, 'El stock máximo debe ser un número entero mayor que 0.'),
    horaToma: z.string().trim().min(1, 'La hora de toma diaria es requerida.'),
    notas: z.string().trim().optional().default('')
  })
  .refine(data => data.stockActual <= data.stockMaximo, {
    message: 'El stock actual no puede ser mayor que el stock máximo.',
    path: ['stockActual']
  });

export type MedicamentoFormData = z.infer<typeof medicamentoSchema>;

export function validateMedicamentoForm(data: {
  nombre: string;
  dosis: string;
  stockActual: string;
  stockMaximo: string;
  horaToma: string;
  notas: string;
}) {
  const result = medicamentoSchema.safeParse(data);

  if (result.success) {
    return { success: true as const, data: result.data };
  }

  const firstIssue = result.error.issues[0];
  return { success: false as const, error: firstIssue.message };
}
