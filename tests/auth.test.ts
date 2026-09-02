import { describe, it, expect } from 'vitest';
import {
  hashContrasena,
  verificarContrasena,
  generarToken,
  parsearCookies,
  crearSesionAuth,
  verificarAuth,
  invalidarAuth,
} from '../src/servidor/auth.js';

describe('hashContrasena + verificarContrasena', () => {
  it('verifica la contrasena correcta', () => {
    const hash = hashContrasena('miContrasena123');
    expect(verificarContrasena('miContrasena123', hash)).toBe(true);
  });

  it('rechaza contrasena incorrecta', () => {
    const hash = hashContrasena('miContrasena123');
    expect(verificarContrasena('otraContrasena', hash)).toBe(false);
  });

  it('genera hashes distintos para la misma contrasena (salt unico)', () => {
    const h1 = hashContrasena('misma');
    const h2 = hashContrasena('misma');
    expect(h1).not.toBe(h2);
    expect(verificarContrasena('misma', h1)).toBe(true);
    expect(verificarContrasena('misma', h2)).toBe(true);
  });

  it('rechaza hash malformado', () => {
    expect(verificarContrasena('algo', '')).toBe(false);
    expect(verificarContrasena('algo', 'sinDospuntos')).toBe(false);
    expect(verificarContrasena('algo', 'aa:bb')).toBe(false);
  });
});

describe('generarToken', () => {
  it('genera tokens de 64 caracteres hex', () => {
    const t = generarToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });

  it('genera tokens unicos', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generarToken()));
    expect(tokens.size).toBe(20);
  });
});

describe('parsearCookies', () => {
  it('parsea cookies correctamente', () => {
    const r = parsearCookies('etfbank_auth=abc123; otro=valor');
    expect(r).toEqual({ etfbank_auth: 'abc123', otro: 'valor' });
  });

  it('retorna objeto vacio sin header', () => {
    expect(parsearCookies(undefined)).toEqual({});
    expect(parsearCookies('')).toEqual({});
  });

  it('ignora entradas sin valor', () => {
    const r = parsearCookies('invalido; bueno=si');
    expect(r).toEqual({ bueno: 'si' });
  });
});

describe('sesion en memoria (sin DB)', () => {
  it('crea, verifica e invalida un token', async () => {
    const info = { tipo: 'profesor' as const, profesorId: 1, correo: 'a@b.com', nombre: 'Test' };
    const token = await crearSesionAuth(info, false);
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    const auth = await verificarAuth(token, false);
    expect(auth).not.toBeNull();
    expect(auth!.tipo).toBe('profesor');
    expect(auth!.correo).toBe('a@b.com');

    await invalidarAuth(token, false);
    const auth2 = await verificarAuth(token, false);
    expect(auth2).toBeNull();
  });

  it('token de superadmin funciona sin profesorId', async () => {
    const info = { tipo: 'superadmin' as const, profesorId: null, correo: null, nombre: null };
    const token = await crearSesionAuth(info, false);
    const auth = await verificarAuth(token, false);
    expect(auth).not.toBeNull();
    expect(auth!.tipo).toBe('superadmin');
    await invalidarAuth(token, false);
  });
});
