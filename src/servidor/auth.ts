import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'crypto';
import { obtenerPool } from './db/conexion.js';
import { estadoDB } from './db/estado.js';

const SALT_LEN = 16;
const KEY_LEN = 64;

export function hashContrasena(plain: string): string {
  const salt = randomBytes(SALT_LEN);
  const key = scryptSync(plain, salt, KEY_LEN);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

export function verificarContrasena(plain: string, stored: string): boolean {
  const [saltHex, keyHex] = stored.split(':');
  if (!saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const storedKey = Buffer.from(keyHex, 'hex');
  if (storedKey.length !== KEY_LEN) return false;
  const derived = scryptSync(plain, salt, KEY_LEN);
  return timingSafeEqual(storedKey, derived);
}

export function generarToken(): string {
  return randomBytes(32).toString('hex');
}

export type TipoAuth = 'superadmin' | 'profesor';

export interface InfoAuth {
  tipo: TipoAuth;
  profesorId: number | null;
  correo: string | null;
  nombre: string | null;
}

const DURACION_TOKEN_MS = 8 * 60 * 60 * 1000;

const tokensMemoria = new Map<string, InfoAuth & { expiraEn: number }>();

function obtenerClaveSuperadmin(): string | undefined {
  return process.env.CLAVE_SUPERADMIN || process.env.CLAVE_PROFESOR;
}

function firmarTokenSuperadmin(payload: { exp: number }): string {
  const clave = obtenerClaveSuperadmin();
  if (!clave) throw new Error('CLAVE_SUPERADMIN no configurada');
  const datos = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const firma = createHmac('sha256', clave).update(datos).digest('base64url');
  return `sa.${datos}.${firma}`;
}

function verificarTokenSuperadmin(token: string): InfoAuth | null {
  if (!token.startsWith('sa.')) return null;
  const clave = obtenerClaveSuperadmin();
  if (!clave) return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const [, datos, firma] = partes;
  const firmaEsperada = createHmac('sha256', clave).update(datos).digest('base64url');
  if (firma.length !== firmaEsperada.length) return null;
  if (!timingSafeEqual(Buffer.from(firma), Buffer.from(firmaEsperada))) return null;
  try {
    const payload = JSON.parse(Buffer.from(datos, 'base64url').toString());
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return { tipo: 'superadmin', profesorId: null, correo: null, nombre: 'Superadmin' };
  } catch {
    return null;
  }
}

export async function crearSesionAuth(
  info: InfoAuth,
): Promise<string> {
  if (info.tipo === 'superadmin') {
    return firmarTokenSuperadmin({ exp: Date.now() + DURACION_TOKEN_MS });
  }

  const token = generarToken();
  const expiraEn = new Date(Date.now() + DURACION_TOKEN_MS);

  if (estadoDB()) {
    try {
      const pool = obtenerPool();
      await pool.query(
        `INSERT INTO tokens_sesion (token, tipo, profesor_id, expira_en)
         VALUES ($1, $2, $3, $4)`,
        [token, info.tipo, info.profesorId, expiraEn],
      );
    } catch {
      // fall through to memory
    }
  }

  tokensMemoria.set(token, { ...info, expiraEn: expiraEn.getTime() });
  return token;
}

export async function verificarAuth(
  token: string,
): Promise<InfoAuth | null> {
  const saAuth = verificarTokenSuperadmin(token);
  if (saAuth) return saAuth;

  if (estadoDB()) {
    try {
      const pool = obtenerPool();
      const { rows } = await pool.query(
        `SELECT t.tipo, t.profesor_id, p.correo, p.nombre
         FROM tokens_sesion t
         LEFT JOIN profesores p ON p.id = t.profesor_id
         WHERE t.token = $1 AND t.expira_en > NOW()`,
        [token],
      );
      if (rows.length > 0) {
        return {
          tipo: rows[0].tipo as TipoAuth,
          profesorId: rows[0].profesor_id,
          correo: rows[0].correo,
          nombre: rows[0].nombre,
        };
      }
    } catch {
      // fall through to memory
    }
  }

  const mem = tokensMemoria.get(token);
  if (!mem) return null;
  if (Date.now() > mem.expiraEn) {
    tokensMemoria.delete(token);
    return null;
  }
  return { tipo: mem.tipo, profesorId: mem.profesorId, correo: mem.correo, nombre: mem.nombre };
}

export async function invalidarAuth(
  token: string,
): Promise<void> {
  tokensMemoria.delete(token);
  if (estadoDB()) {
    try {
      const pool = obtenerPool();
      await pool.query('DELETE FROM tokens_sesion WHERE token = $1', [token]);
    } catch {
      // silent
    }
  }
}

export const NOMBRE_COOKIE = 'etfbank_auth';

export function parsearCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      cookies[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
    }
  });
  return cookies;
}
