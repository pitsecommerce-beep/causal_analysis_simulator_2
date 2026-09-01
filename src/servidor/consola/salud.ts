import { conectarDB, cerrarDB } from '../db/conexion.js';

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   VERIFICACIÓN DE SALUD — Simulador ETF Bank               ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  const requeridas: Record<string, string> = {
    DATABASE_URL: 'Conexión a PostgreSQL (Supabase)',
    ANTHROPIC_API_KEY: 'API de Anthropic (voz del director)',
    DEEPGRAM_API_KEY: 'API de Deepgram (texto a voz)',
    CLAVE_SUPERADMIN: 'Clave del superadmin',
  };

  const opcionales: Record<string, [string, string]> = {
    ANTHROPIC_MODEL_PENSAR: ['Modelo para analizar/pensar (Sonnet)', 'claude-sonnet-5'],
    ANTHROPIC_MODEL_REDACTAR: ['Modelo para redactar respuestas (Haiku)', 'claude-haiku-4-5'],
    PORT: ['Puerto del servidor', '3000'],
  };

  console.log('║');
  console.log('║  ── Variables de entorno ──');

  let faltantes = 0;
  for (const [nombre, desc] of Object.entries(requeridas)) {
    const valor = process.env[nombre];
    if (valor) {
      const oculto = nombre.includes('KEY') || nombre.includes('URL') || nombre.includes('CLAVE')
        ? valor.slice(0, 8) + '...'
        : valor;
      console.log(`║  ✓ ${nombre.padEnd(22)} ${oculto}`);
    } else {
      console.log(`║  ✗ ${nombre.padEnd(22)} FALTA — ${desc}`);
      faltantes++;
    }
  }

  for (const [nombre, [desc, defecto]] of Object.entries(opcionales)) {
    const valor = process.env[nombre];
    console.log(`║  ○ ${nombre.padEnd(22)} ${valor ?? `(defecto: ${defecto})`}`);
  }

  console.log('║');
  console.log('║  ── Base de datos ──');

  if (process.env.DATABASE_URL) {
    const conectada = await conectarDB();
    if (conectada) {
      console.log('║  ✓ PostgreSQL conectada');
      await cerrarDB();
    } else {
      console.log('║  ✗ PostgreSQL NO responde');
      faltantes++;
    }
  } else {
    console.log('║  ✗ Sin DATABASE_URL — no se puede verificar');
  }

  console.log('║');
  if (faltantes === 0) {
    console.log('║  Todo listo para producción.');
  } else {
    console.log(`║  ${faltantes} problema(s) encontrado(s). Revisa las variables faltantes.`);
  }
  console.log('╚══════════════════════════════════════════════════════════════╝');

  process.exit(faltantes > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
