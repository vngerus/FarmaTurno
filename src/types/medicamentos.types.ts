export interface Medicamento {
  id: string;
  nombre: string;
  dosis: string;
  stockActual: number;
  stockMaximo: number;
  horaToma: string;
  notas?: string;
  createdAt: string;
}
