import { describe, it, expect } from 'vitest';
import { filtrarFarmaciasPorComuna } from './useFarmaciasComuna';
import type { Farmacia } from '../types/farmacias.types';

function farmacia(overrides: Partial<Farmacia>): Farmacia {
  return {
    fecha: '2026-07-21',
    local_id: '1',
    local_nombre: 'Farmacia Test',
    comuna_nombre: 'MAIPU',
    localidad_nombre: '',
    local_direccion: 'Calle Falsa 123',
    funcionamiento_hora_apertura: '09:00:00',
    funcionamiento_hora_cierre: '21:00:00',
    local_telefono: '',
    local_lat: '-33.5',
    local_lng: '-70.7',
    funcionamiento_dia: 'lunes',
    fk_region: '7',
    fk_comuna: '13119',
    ...overrides,
  };
}

describe('filtrarFarmaciasPorComuna', () => {
  it('filtra por coincidencia exacta normalizada', () => {
    const todas = [farmacia({ local_id: '1', comuna_nombre: 'MAIPU' }), farmacia({ local_id: '2', comuna_nombre: 'PUENTE ALTO' })];
    const resultado = filtrarFarmaciasPorComuna(todas, 'Maipú');
    expect(resultado.map(f => f.local_id)).toEqual(['1']);
  });

  it('matchea a pesar del bug de encoding de MINSAL en la Ñ', () => {
    const todas = [farmacia({ local_id: '1', comuna_nombre: 'VI�A DEL MAR' })];
    const resultado = filtrarFarmaciasPorComuna(todas, 'Viña del Mar');
    expect(resultado.map(f => f.local_id)).toEqual(['1']);
  });

  it('devuelve arreglo vacío si no hay coincidencias', () => {
    const todas = [farmacia({ comuna_nombre: 'MAIPU' })];
    expect(filtrarFarmaciasPorComuna(todas, 'Santiago')).toEqual([]);
  });
});
