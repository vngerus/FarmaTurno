import React from 'react';
import { ExternalLink, Pill, Users, AlertCircle } from 'lucide-react';
import type { ResultadoBusquedaMedicamento } from '../../types/medicamentos-catalogo.types';

interface TarjetaFichaProps {
  resultado: ResultadoBusquedaMedicamento;
}

export default function TarjetaFicha({ resultado }: TarjetaFichaProps) {
  const { nombreProducto, empresa, principioActivo, ficha } = resultado;

  return (
    <div className="glass-card rounded-2xl p-5 md:p-6 flex flex-col gap-4">
      <div className="border-b-2 border-[#0f1f19]/10 pb-4">
        <h3 className="font-extrabold text-slate-800 text-lg md:text-xl leading-tight group-hover:text-mint-600 transition-colors">
          {nombreProducto}
        </h3>
        <p className="text-xs md:text-sm text-slate-500 font-semibold mt-1">
          Empresa: <span className="text-slate-800 font-mono">{empresa}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 bg-mint-50 border border-mint-100 text-mint-700 px-3 py-1.5 rounded-full text-xs font-bold">
          <Pill className="w-3.5 h-3.5" />
          {principioActivo}
        </span>
      </div>

      {ficha ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Para qué sirve
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{ficha.para_que_sirve}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ficha.dosis_adulto && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Dosis Adultos
                </p>
                <p className="text-sm text-slate-800 font-mono">{ficha.dosis_adulto}</p>
              </div>
            )}
            {ficha.dosis_nino && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-mint-600" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Dosis Niños
                  </p>
                </div>
                <p className="text-sm text-slate-800 font-mono">{ficha.dosis_nino}</p>
              </div>
            )}
          </div>

          {ficha.contraindicaciones && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">
                    Contraindicaciones
                  </p>
                  <p className="text-sm text-red-700 leading-relaxed">{ficha.contraindicaciones}</p>
                </div>
              </div>
            </div>
          )}

          {ficha.advertencias && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
                Advertencias
              </p>
              <p className="text-sm text-amber-800 leading-relaxed">{ficha.advertencias}</p>
            </div>
          )}

          {ficha.fuente_url && ficha.fuente_nombre && (
            <div className="pt-2 border-t-2 border-[#0f1f19]/10">
              <a
                href={ficha.fuente_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-mint-700 hover:text-mint-800 transition-colors group"
              >
                <span>Fuente: {ficha.fuente_nombre}</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-600 font-medium">Sin ficha disponible</p>
          <p className="text-xs text-slate-500 mt-1">
            No hay información detallada para este medicamento aún. Consulta con tu profesional de
            salud.
          </p>
        </div>
      )}
    </div>
  );
}
