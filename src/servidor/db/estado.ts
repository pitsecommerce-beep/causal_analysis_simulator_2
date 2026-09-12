import { conectarDB, ejecutarMigraciones, obtenerPool } from './conexion.js';
import { recuperarSesionesDB } from '../sockets/sala.js';
import type { Server as SocketServer } from 'socket.io';

interface InfoEstadoDB {
  conectada: boolean;
  ultimoError: string | null;
  intentos: number;
  ultimoExito: Date | null;
  ultimoIntento: Date | null;
  reconectando: boolean;
}

const estado: InfoEstadoDB = {
  conectada: false,
  ultimoError: null,
  intentos: 0,
  ultimoExito: null,
  ultimoIntento: null,
  reconectando: false,
};

let timerReconexion: ReturnType<typeof setTimeout> | null = null;
let ioRef: SocketServer | null = null;
let configRef: any = null;

const DELAYS_INICIALES = [2000, 4000, 8000, 16000, 30000];

export function estadoDB(): boolean {
  return estado.conectada;
}

export function infoEstadoDB(): InfoEstadoDB {
  return { ...estado };
}

export function registrarIO(io: SocketServer, config: any): void {
  ioRef = io;
  configRef = config;
}

function delayParaIntento(intento: number): number {
  if (intento < DELAYS_INICIALES.length) return DELAYS_INICIALES[intento];
  return 30000;
}

export function detectarSupabaseDirecta(url: string): string | null {
  const match = url.match(/db\.([a-z0-9]+)\.supabase\.co/);
  if (match) {
    return `La cadena de conexion apunta a db.${match[1]}.supabase.co (conexion directa). `
      + 'Los proyectos nuevos de Supabase solo resuelven por IPv6 en esa direccion, '
      + 'y Railway no siempre la alcanza. Usa la cadena del pooler en modo sesion: '
      + `aws-0-<region>.pooler.supabase.com, puerto 5432.`;
  }
  return null;
}

async function intentarConexion(): Promise<boolean> {
  estado.ultimoIntento = new Date();
  estado.intentos++;

  const url = process.env.DATABASE_URL;
  if (!url) {
    estado.ultimoError = 'DATABASE_URL no configurada';
    estado.conectada = false;
    return false;
  }

  const avisoSupabase = detectarSupabaseDirecta(url);
  if (avisoSupabase) {
    console.warn(`  ⚠ Supabase: ${avisoSupabase}`);
  }

  const ok = await conectarDB();
  if (ok) {
    const esPrimera = !estado.conectada;
    estado.conectada = true;
    estado.ultimoError = null;
    estado.ultimoExito = new Date();
    estado.reconectando = false;
    console.log(`  ✓ Postgres conectada (intento ${estado.intentos}, ${new Date().toISOString()})`);

    if (esPrimera || estado.intentos > 1) {
      try {
        await ejecutarMigraciones();
        console.log('  Migraciones ejecutadas tras reconexion');
      } catch (err) {
        console.warn('  ⚠ Error en migraciones:', (err as Error).message);
      }
      if (ioRef && configRef) {
        try {
          const n = await recuperarSesionesDB(ioRef, configRef);
          if (n > 0) console.log(`  ${n} sesion(es) recuperada(s) tras reconexion`);
        } catch {}
      }
    }
    return true;
  }

  try {
    const p = obtenerPool();
    await p.query('SELECT 1');
  } catch (err) {
    estado.ultimoError = (err as Error).message;
  }
  estado.conectada = false;
  return false;
}

function programarReintento(): void {
  if (timerReconexion) return;
  estado.reconectando = true;
  const delay = delayParaIntento(estado.intentos);
  console.log(`  Reintentando conexion a Postgres en ${delay / 1000}s (intento ${estado.intentos + 1})`);
  timerReconexion = setTimeout(async () => {
    timerReconexion = null;
    const ok = await intentarConexion();
    if (!ok) programarReintento();
  }, delay);
}

export async function iniciarConexionDB(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    estado.ultimoError = 'DATABASE_URL no configurada';
    console.warn('⚠ DATABASE_URL no configurada. Estado solo en memoria.');
    return false;
  }

  console.log('Conectando a base de datos...');
  const ok = await intentarConexion();
  if (ok) {
    console.log('  Base de datos lista ✓');
    return true;
  }
  console.warn('  ⚠ No se pudo conectar a Postgres. Reintentando en segundo plano...');
  programarReintento();
  return false;
}

export function forzarReintento(): void {
  if (timerReconexion) {
    clearTimeout(timerReconexion);
    timerReconexion = null;
  }
  estado.intentos = 0;
  intentarConexion().then(ok => {
    if (!ok) programarReintento();
  });
}

export function detenerReconexion(): void {
  if (timerReconexion) {
    clearTimeout(timerReconexion);
    timerReconexion = null;
  }
  estado.reconectando = false;
}
