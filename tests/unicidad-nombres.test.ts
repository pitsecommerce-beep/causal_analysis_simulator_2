import { describe, it, expect } from 'vitest';
import { cargarTodosDatos } from '../src/servidor/datos/cargador.js';
import { sortearComentarios, generarParlamentosDirectos } from '../src/servidor/voz/anthropic.js';

const datos = cargarTodosDatos();

describe('Unicidad de nombres en sorteo de clientes', () => {
  it('no repite nombre, apellido ni commentId en 50 semillas', () => {
    for (let semilla = 1; semilla <= 50; semilla++) {
      const parlamentos = generarParlamentosDirectos(
        datos.comentarios,
        datos.solicitudes,
        semilla,
      );

      const nombres = parlamentos.map(p => p.nombre.split(' ')[0]);
      const apellidos = parlamentos.map(p => p.apellido);
      const ids = parlamentos.map(p => p.commentId);

      expect(new Set(nombres).size, `semilla ${semilla}: nombres duplicados`).toBe(nombres.length);
      expect(new Set(apellidos).size, `semilla ${semilla}: apellidos duplicados`).toBe(apellidos.length);
      expect(new Set(ids).size, `semilla ${semilla}: commentId duplicados`).toBe(ids.length);
    }
  });

  it('sortearComentarios no repite commentId', () => {
    for (let semilla = 1; semilla <= 50; semilla++) {
      const seleccion = sortearComentarios(datos.comentarios, semilla);
      const ids = seleccion.map(c => c.id);
      expect(new Set(ids).size, `semilla ${semilla}: commentId duplicados`).toBe(ids.length);
    }
  });

  it('siempre selecciona exactamente 4 comentarios', () => {
    for (let semilla = 1; semilla <= 50; semilla++) {
      const seleccion = sortearComentarios(datos.comentarios, semilla);
      expect(seleccion.length, `semilla ${semilla}`).toBe(4);
    }
  });

  it('el nombre completo incluye nombre y apellido', () => {
    const parlamentos = generarParlamentosDirectos(
      datos.comentarios,
      datos.solicitudes,
      42,
    );
    for (const p of parlamentos) {
      expect(p.nombre).toContain(' ');
      expect(p.apellido.length).toBeGreaterThan(0);
      expect(p.nombre).toContain(p.apellido);
    }
  });
});
