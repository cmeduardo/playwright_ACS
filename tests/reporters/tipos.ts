export type EstadoPrueba = 'Exitoso' | 'Fallido' | 'Inestable' | 'Omitido';

/** Un renglón de la bitácora (tabla test_logs). */
export interface RegistroPrueba {
  id_ejecucion: string;
  id_caso: string;
  caso: string;
  navegador: string;
  estado: EstadoPrueba;
  inicio: string; // ISO 8601
  fin: string; // ISO 8601
  duracion_ms: number;
  error: string | null;
  evidencia: string | null;
  etiquetas: string;
  requerimiento: string | null;
  severidad: string | null;
  defecto: string | null;
  intentos: number;
  archivo: string;
  /** Pasos automáticos (solo en memoria, no se guardan en la BD). */
  pasos?: string[];
}

export interface Ejecucion {
  id_ejecucion: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_ms: number;
  modo_bugs: 'on' | 'off';
  alcance: 'completa' | 'parcial';
  total: number;
  exitosas: number;
  fallidas: number;
  inestables: number;
  omitidas: number;
  version_playwright: string;
  ambiente: string;
}

export interface Defecto {
  id_def: number;
  codigo: string;
  clave: string;
  titulo: string;
  severidad: string;
  estado: 'Abierto' | 'Cerrado';
  ejecucion_detectado: string;
  ejecucion_cierre: string | null;
  fecha_detectado: string;
  fecha_cierre: string | null;
  historial: string;
}
