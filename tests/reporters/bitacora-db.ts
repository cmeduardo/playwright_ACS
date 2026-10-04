import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Defecto, Ejecucion, RegistroPrueba } from './tipos';

export const REPORTES_DIR = path.resolve(__dirname, '..', '..', 'reports');
export const BITACORA_DB = path.join(REPORTES_DIR, 'bitacora.db');

/** Bitácora de ejecuciones: base SQLite controlada (reports/bitacora.db). */
export function abrirBitacora(archivo = BITACORA_DB, soloLectura = false): Database.Database {
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  const db = new Database(archivo, soloLectura ? { readonly: true, fileMustExist: true } : undefined);
  if (!soloLectura) {
    db.pragma('journal_mode = DELETE');
    db.exec(`
      CREATE TABLE IF NOT EXISTS ejecuciones (
        id_ejecucion       TEXT PRIMARY KEY,
        fecha_inicio       TEXT NOT NULL,
        fecha_fin          TEXT NOT NULL,
        duracion_ms        INTEGER NOT NULL,
        modo_bugs          TEXT NOT NULL CHECK (modo_bugs IN ('on', 'off')),
        alcance            TEXT NOT NULL,
        total              INTEGER NOT NULL,
        exitosas           INTEGER NOT NULL,
        fallidas           INTEGER NOT NULL,
        inestables         INTEGER NOT NULL,
        omitidas           INTEGER NOT NULL,
        version_playwright TEXT,
        ambiente           TEXT
      );
      CREATE TABLE IF NOT EXISTS test_logs (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        id_ejecucion  TEXT NOT NULL REFERENCES ejecuciones(id_ejecucion) ON DELETE CASCADE,
        id_caso       TEXT NOT NULL,
        caso          TEXT NOT NULL,
        navegador     TEXT NOT NULL,
        estado        TEXT NOT NULL,
        inicio        TEXT NOT NULL,
        fin           TEXT NOT NULL,
        duracion_ms   INTEGER NOT NULL,
        error         TEXT,
        evidencia     TEXT,
        etiquetas     TEXT,
        requerimiento TEXT,
        severidad     TEXT,
        defecto       TEXT,
        intentos      INTEGER NOT NULL DEFAULT 1,
        archivo       TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_logs_ejecucion ON test_logs(id_ejecucion);
      CREATE INDEX IF NOT EXISTS idx_logs_caso ON test_logs(id_caso);
      CREATE TABLE IF NOT EXISTS defectos (
        id_def              INTEGER PRIMARY KEY AUTOINCREMENT,
        clave               TEXT NOT NULL UNIQUE,
        titulo              TEXT NOT NULL,
        severidad           TEXT NOT NULL,
        estado              TEXT NOT NULL,
        ejecucion_detectado TEXT NOT NULL,
        ejecucion_cierre    TEXT,
        fecha_detectado     TEXT NOT NULL,
        fecha_cierre        TEXT,
        historial           TEXT NOT NULL DEFAULT ''
      );
    `);
  }
  return db;
}

export function guardarEjecucion(db: Database.Database, ej: Ejecucion, registros: RegistroPrueba[]): void {
  const insEj =
    db.prepare(`INSERT INTO ejecuciones VALUES (@id_ejecucion, @fecha_inicio, @fecha_fin, @duracion_ms,
    @modo_bugs, @alcance, @total, @exitosas, @fallidas, @inestables, @omitidas, @version_playwright, @ambiente)`);
  const insLog =
    db.prepare(`INSERT INTO test_logs (id_ejecucion, id_caso, caso, navegador, estado, inicio, fin,
    duracion_ms, error, evidencia, etiquetas, requerimiento, severidad, defecto, intentos, archivo)
    VALUES (@id_ejecucion, @id_caso, @caso, @navegador, @estado, @inicio, @fin, @duracion_ms, @error, @evidencia,
    @etiquetas, @requerimiento, @severidad, @defecto, @intentos, @archivo)`);
  db.transaction(() => {
    insEj.run(ej);
    for (const r of registros) {
      const { pasos: _pasos, ...fila } = r;
      insLog.run(fila);
    }
  })();
}

export const codigoDefecto = (id: number): string => `DEF-${String(id).padStart(3, '0')}`;

export function leerDefectos(db: Database.Database): Defecto[] {
  const filas = db.prepare('SELECT * FROM defectos ORDER BY id_def').all() as Omit<Defecto, 'codigo'>[];
  return filas.map((f) => ({ ...f, codigo: codigoDefecto(f.id_def) }));
}

export function leerEjecuciones(db: Database.Database): Ejecucion[] {
  return db.prepare('SELECT * FROM ejecuciones ORDER BY fecha_inicio').all() as Ejecucion[];
}
