export interface FichaMedicamento {
  principio_activo: string;
  para_que_sirve: string;
  dosis_adulto: string | null;
  dosis_nino: string | null;
  contraindicaciones: string | null;
  advertencias: string | null;
  fuente_nombre: string | null;
  fuente_url: string | null;
}

export interface ResultadoBusquedaMedicamento {
  registroIsp: string;
  nombreProducto: string;
  empresa: string;
  principioActivo: string;
  ficha: FichaMedicamento | null;
}
