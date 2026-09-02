import { readFileSync } from 'fs';
import { resolve } from 'path';

function cargarGuion(nombre: string): string {
  return readFileSync(resolve(__dirname, 'guiones', nombre), 'utf-8').trim();
}

export const DISCURSO_DIRECTOR = cargarGuion('director.txt');
export const DISCURSO_ADRIANA = cargarGuion('adriana.txt');
