import pg from 'pg';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function necesitaSSL(url: string): boolean {
  return url.includes('sslmode=require')
    || url.includes('supabase')
    || url.includes('.railway.')
    || url.includes('neon.tech')
    || url.includes('render.com');
}

export function obtenerPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL no esta configurada');
    }
    pool = new Pool({
      connectionString,
      ssl: necesitaSSL(connectionString) ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      max: 10,
    });
    pool.on('error', (err) => {
      console.warn('Error inesperado en pool de Postgres:', err.message);
    });
  }
  return pool;
}

export async function conectarDB(): Promise<boolean> {
  try {
    const p = obtenerPool();
    await p.query('SELECT 1');
    return true;
  } catch (err) {
    console.warn('  Error conectando a Postgres:', (err as Error).message);
    pool = null;
    return false;
  }
}

export async function ejecutarMigraciones(): Promise<void> {
  const p = obtenerPool();

  await p.query(`
    CREATE TABLE IF NOT EXISTS migraciones (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL UNIQUE,
      aplicada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  let dir = resolve('src/servidor/db/migraciones');
  if (!existsSync(dir)) {
    dir = resolve('dist/src/servidor/db/migraciones');
  }
  if (!existsSync(dir)) return;

  const archivos = readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const { rows } = await p.query('SELECT nombre FROM migraciones');
  const aplicadas = new Set(rows.map((r: { nombre: string }) => r.nombre));

  for (const archivo of archivos) {
    if (!aplicadas.has(archivo)) {
      const sql = readFileSync(join(dir, archivo), 'utf-8');
      await p.query(sql);
      await p.query('INSERT INTO migraciones (nombre) VALUES ($1)', [archivo]);
      console.log(`  Migracion aplicada: ${archivo}`);
    }
  }
}

export async function cerrarDB(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
