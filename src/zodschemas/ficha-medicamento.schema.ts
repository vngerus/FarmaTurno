import { z } from 'zod';

export const fichaMedicamentoSchema = z.object({
  principioActivo: z.string().trim().min(1),
  paraQueSirve: z.string().trim().min(1),
  dosisAdulto: z.string().trim().min(1),
  dosisNino: z.string().trim().nullable(),
  contraindicaciones: z.string().trim().min(1),
  advertencias: z.string().trim().nullable(),
  fuenteNombre: z.string().trim().min(1),
  fuenteUrl: z.string().trim().url()
});

export type FichaMedicamentoSeed = z.infer<typeof fichaMedicamentoSchema>;
