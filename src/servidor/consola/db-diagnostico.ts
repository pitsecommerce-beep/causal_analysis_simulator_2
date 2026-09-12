import pg from 'pg';
import { readdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const { Pool } = pg;

function enmascarar(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '(URL no parseable)';
  }
}

function tipoCadena(url: string): string {
  if (/pooler\.supabase\.com/.test(url)) return 'pooler (recomendada)';
  if (/db\.[a-z0-9]+\.supabase\.co/.test(url)) return 'directa (puede fallar por IPv6)';
  if (/\.railway\./.test(url)) return 'Railway internal';
  if (/neon\.tech/.test(url)) return 'Neon';
  return 'otra';
}

async function main() {
  console.log('=== Diagnostico de base de datos ===\n');

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('✗ DATABASE_URL no esta configurada.');
    console.error('  Configura la variable con la cadena de conexion de tu proveedor.');
    process.exit(1);
  }

  console.log(`Host: ${enmascarar(url)}`);
  console.log(`Tipo: ${tipoCadena(url)}`);

  if (/db\.[a-z0-9]+\.supabase\.co/.test(url)) {
    console.warn('\n⚠ Estas usando la cadena directa de Supabase.');
    console.warn('  Los proyectos nuevos solo resuelven por IPv6 en esa direccion.');
    console.warn('  Usa la cadena del pooler: aws-0-<region>.pooler.supabase.com, puerto 5432.');
  }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('sslmode=require') || url.includes('.railway.') || url.includes('neon.tech')
      ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10_000,
  });

  try {
    const { rows } = await pool.query('SELECT 1 AS ok');
    console.log(`\n✓ SELECT 1: ${rows[0]?.ok === 1 ? 'exito' : 'respuesta inesperada'}`);
  } catch (err) {
    console.error(`\n✗ No se pudo conectar: ${(err as Error).message}`);
    console.error('  Verifica la cadena de conexion, las credenciales y la red.');
    await pool.end();
    process.exit(1);
  }

  const thisDir = __dirname;
  let migDir = resolve(thisDir, '../db/migraciones');
  if (!existsSync(migDir)) migDir = resolve('src/servidor/db/migraciones');

  try {
    const { rows: aplicadas } = await pool.query(
      `SELECT nombre, aplicada_en FROM migraciones ORDER BY id`
    );
    console.log(`\nMigraciones aplicadas: ${aplicadas.length}`);
    for (const m of aplicadas) {
      console.log(`  ✓ ${m.nombre} (${new Date(m.aplicada_en).toISOString()})`);
    }

    if (existsSync(migDir)) {
      const archivos = readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
      const nombres = new Set(aplicadas.map((r: { nombre: string }) => r.nombre));
      const pendientes = archivos.filter(a => !nombres.has(a));
      if (pendientes.length > 0) {
        console.log(`\nMigraciones pendientes: ${pendientes.length}`);
        for (const p of pendientes) console.log(`  ○ ${p}`);
      } else {
        console.log('  Todas las migraciones estan aplicadas.');
      }
    }
  } catch {
    console.log('\nTabla de migraciones no existe (primera ejecucion).');
  }

  for (const tabla of ['profesores', 'tokens_sesion', 'sesiones', 'equipos']) {
    try {
      const { rows } = await pool.query(
        `SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_name = $1`,
        [tabla]
      );
      const existe = parseInt(rows[0].n) > 0;
      console.log(`  ${existe ? '✓' : '✗'} Tabla ${tabla}: ${existe ? 'existe' : 'no existe'}`);
    } catch (err) {
      console.log(`  ? Tabla ${tabla}: no se pudo verificar`);
    }
  }

  await pool.end();
  console.log('\n=== Diagnostico completo ===');
}

main().catch(err => {
  console.error('Error en diagnostico:', err);
  process.exit(1);
});
