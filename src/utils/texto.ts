export function normalizarComuna(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // MINSAL devuelve la Ñ corrupta como U+FFFD (carácter de reemplazo Unicode) en su API.
    .replace(/�/g, 'N')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');
}
