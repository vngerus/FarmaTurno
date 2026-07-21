import { describe, it, expect } from 'vitest';
import { normalizarComuna } from './texto';

describe('normalizarComuna', () => {
  it('quita tildes y pasa a mayúsculas', () => {
    expect(normalizarComuna('Concepción')).toBe('CONCEPCION');
  });

  it('deja nombres sin tilde igual, en mayúsculas', () => {
    expect(normalizarComuna('CONCEPCION')).toBe('CONCEPCION');
  });

  it('normaliza Ñ a N', () => {
    expect(normalizarComuna('Viña del Mar')).toBe('VINA DEL MAR');
  });

  it('normaliza el carácter de reemplazo Unicode (mojibake de MINSAL) a N', () => {
    expect(normalizarComuna('VI�A DEL MAR')).toBe('VINA DEL MAR');
    expect(normalizarComuna('CA�ETE')).toBe('CANETE');
  });

  it('colapsa espacios repetidos y recorta bordes', () => {
    expect(normalizarComuna('  Puente   Alto  ')).toBe('PUENTE ALTO');
  });
});
