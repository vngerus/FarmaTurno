import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import TarjetaFicha from './TarjetaFicha';
import { buscarMedicamentos } from '../../services/medicamentosCatalogo.service';
import type { ResultadoBusquedaMedicamento } from '../../types/medicamentos-catalogo.types';

const DEBOUNCE_MS = 300;
const MAX_SUGERENCIAS = 6;

export default function BuscadorMedicamentos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<ResultadoBusquedaMedicamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [suggestions, setSuggestions] = useState<ResultadoBusquedaMedicamento[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchAbortRef = useRef<AbortController | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(async (term: string) => {
    setError(null);
    setShowSuggestions(false);

    if (term.trim().length < 2) {
      searchAbortRef.current?.abort();
      setResults([]);
      setHasSearched(false);
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setLoading(true);
    setHasSearched(true);

    try {
      const data = await buscarMedicamentos(term, controller.signal);
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Error buscando medicamentos:', err);
      setError('No se pudo completar la búsqueda. Por favor, intenta de nuevo.');
      setResults([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Autocompletado: sugerencias mientras se escribe, con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const term = searchTerm.trim();
    if (term.length < 2) {
      suggestAbortRef.current?.abort();
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      suggestAbortRef.current?.abort();
      const controller = new AbortController();
      suggestAbortRef.current = controller;

      try {
        const data = await buscarMedicamentos(term, controller.signal);
        setSuggestions(Array.isArray(data) ? data.slice(0, MAX_SUGERENCIAS) : []);
        setShowSuggestions(true);
      } catch {
        if (controller.signal.aborted) return;
        // Fallo silencioso: el autocompletado es una ayuda, no crítico
        setSuggestions([]);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSearch(searchTerm);
  };

  const handleSelectSuggestion = (nombreProducto: string) => {
    setSearchTerm(nombreProducto);
    setShowSuggestions(false);
    handleSearch(nombreProducto);
  };

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setSuggestions([]);
    setShowSuggestions(false);
    setHasSearched(false);
    setError(null);
  };

  return (
    <div className="w-full bg-white border-2 border-[#0f1f19] rounded-3xl p-6 md:p-8 space-y-6">
      <div className="border-b-2 border-[#0f1f19] pb-6">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0f1f19] font-heading mb-2">
          Buscador de Medicamentos
        </h2>
        <p className="text-brand-body text-sm md:text-base font-medium">
          Busca medicamentos en nuestro catálogo y consulta sus fichas técnicas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Ej: Paracetamol, Ibuprofen, Amoxicilina..."
            className="glass-input w-full px-4 py-3 md:py-4 text-sm md:text-base rounded-xl pl-12"
            aria-label="Buscar medicamentos"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            autoComplete="off"
            disabled={loading}
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />

          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-20 top-full mt-2 w-full bg-white border-2 border-[#0f1f19] rounded-xl shadow-lg overflow-hidden">
              {suggestions.map((s, idx) => (
                <li key={`${s.registroIsp}-${idx}`}>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleSelectSuggestion(s.nombreProducto)}
                    className="w-full text-left px-4 py-2.5 hover:bg-mint-50 transition-colors flex flex-col gap-0.5 border-b border-slate-100 last:border-b-0"
                  >
                    <span className="text-sm font-semibold text-slate-800">{s.nombreProducto}</span>
                    <span className="text-xs text-slate-500 font-mono">{s.principioActivo}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            type="submit"
            disabled={loading || searchTerm.trim().length < 2}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0f1f19]"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Buscar
              </>
            )}
          </button>

          {hasSearched && (
            <button type="button" onClick={handleClear} className="btn-secondary">
              Limpiar
            </button>
          )}
        </div>
      </form>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs md:text-sm text-blue-700 font-medium leading-relaxed">
          <strong>Información referencial.</strong> Esta información no reemplaza el consejo
          profesional de un médico, farmacéutico o profesional de salud. Siempre consulta con un
          especialista antes de tomar cualquier medicamento.
        </p>
      </div>

      {error && !loading && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700 font-medium">Error en la búsqueda</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <RefreshCw className="w-10 h-10 text-mint-600 animate-spin" />
          <p className="text-slate-500 text-sm font-semibold animate-pulse">
            Buscando medicamentos...
          </p>
        </div>
      )}

      {!loading && hasSearched && (
        <div className="space-y-4">
          {results.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Resultados encontrados
                </p>
                <span className="bg-mint-50 border border-mint-100 text-mint-600 px-2.5 py-0.5 rounded-full font-mono font-extrabold text-xs">
                  {results.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.map((resultado, idx) => (
                  <TarjetaFicha key={`${resultado.registroIsp}-${idx}`} resultado={resultado} />
                ))}
              </div>
            </>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
              <p className="text-slate-600 text-base font-medium mb-1">
                No se encontraron resultados
              </p>
              <p className="text-slate-500 text-sm">
                Intenta con otro término de búsqueda o verifica la ortografía.
              </p>
            </div>
          )}
        </div>
      )}

      {!hasSearched && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 text-base font-medium">
            Ingresa un término para buscar medicamentos
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Mínimo 2 caracteres. Búsqueda en tiempo real entre medicamentos disponibles.
          </p>
        </div>
      )}
    </div>
  );
}
