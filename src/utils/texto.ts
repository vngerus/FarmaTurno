export function normalizarComuna(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/�/g, 'N')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');
}
