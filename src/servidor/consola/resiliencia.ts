import { conectarDB, ejecutarMigraciones, cerrarDB } from '../db/conexion.js';
import * as db from '../db/consultas.js';
import { crearReloj, iniciarReloj, pausarReloj, recalcularSegundos, reconstruirRelojDesdeDB } from '../sockets/reloj.js';
import { cargarConfig } from '../motor/dag.js';

async function main() {
  console.log('=== Test de resiliencia ===\n');
  let pasos = 0;
  let exitos = 0;

  function paso(nombre: string) {
    pasos++;
    process.stdout.write(`  [${pasos}] ${nombre}... `);
  }

  function ok(detalle?: string) {
    exitos++;
    console.log(`OK${detalle ? ` (${detalle})` : ''}`);
  }

  function fallo(msg: string) {
    console.log(`FALLO: ${msg}`);
  }

  // 1. Conexion a Postgres
  paso('Conectar a Postgres');
  if (!process.env.DATABASE_URL) {
    fallo('DATABASE_URL no configurada');
    resumen(pasos, exitos);
    return;
  }
  const conectado = await conectarDB();
  if (!conectado) {
    fallo('No se pudo conectar');
    resumen(pasos, exitos);
    return;
  }
  ok();

  // 2. Ejecutar migraciones
  paso('Ejecutar migraciones');
  try {
    await ejecutarMigraciones();
    ok();
  } catch (e) {
    fallo((e as Error).message);
  }

  // 3. Crear sesion de prueba
  paso('Crear sesion de prueba');
  const codigo = `TEST${Math.floor(Math.random() * 9000 + 1000)}`;
  let sesionId: number;
  try {
    const sesion = await db.crearSesion(codigo, 12345);
    sesionId = sesion.id;
    ok(`codigo=${codigo}, id=${sesionId}`);
  } catch (e) {
    fallo((e as Error).message);
    await cerrarDB();
    resumen(pasos, exitos);
    return;
  }

  // 4. Persistir reloj con timestamps
  paso('Persistir reloj con timestamps');
  const config = cargarConfig();
  const reloj = crearReloj();
  const noop = () => {};
  // Simulate starting the clock
  reloj.iniciado = true;
  reloj.pausado = false;
  reloj.iniciadoEn = new Date(Date.now() - 120_000); // started 2 minutes ago
  reloj.tiempoPausadoTotalMs = 10_000; // paused for 10 seconds total
  reloj.segundoActual = recalcularSegundos(reloj);
  reloj.faseActual = 'sala_juntas';

  try {
    await db.actualizarRelojSesion(sesionId!, {
      fase_actual: reloj.faseActual,
      reloj_iniciado: true,
      reloj_pausado: false,
      segundo_actual: reloj.segundoActual,
      extensiones: {},
      reloj_iniciado_en: reloj.iniciadoEn.toISOString(),
      reloj_pausado_en: null,
      tiempo_pausado_total_ms: reloj.tiempoPausadoTotalMs,
    });
    ok(`segundo=${reloj.segundoActual}`);
  } catch (e) {
    fallo((e as Error).message);
  }

  // 5. Leer de vuelta y reconstruir
  paso('Reconstruir reloj desde Postgres');
  try {
    const sesionDB = await db.obtenerSesion(codigo);
    if (!sesionDB) throw new Error('Sesion no encontrada');

    const reconstruido = reconstruirRelojDesdeDB({
      reloj_iniciado: sesionDB.reloj_iniciado,
      reloj_pausado: sesionDB.reloj_pausado,
      segundo_actual: sesionDB.segundo_actual,
      fase_actual: sesionDB.fase_actual,
      extensiones: sesionDB.extensiones ?? {},
      reloj_iniciado_en: sesionDB.reloj_iniciado_en,
      reloj_pausado_en: sesionDB.reloj_pausado_en,
      tiempo_pausado_total_ms: sesionDB.tiempo_pausado_total_ms ?? 0,
    });

    const diff = Math.abs(reconstruido.segundoActual - reloj.segundoActual);
    if (diff <= 2) {
      ok(`segundo_reconstruido=${reconstruido.segundoActual}, diff=${diff}s`);
    } else {
      fallo(`Diferencia de ${diff}s, esperaba <= 2s`);
    }
  } catch (e) {
    fallo((e as Error).message);
  }

  // 6. Verificar sesiones activas query
  paso('Listar sesiones activas');
  try {
    const activas = await db.obtenerSesionesActivas();
    const encontrada = activas.some(s => s.codigo_sala === codigo);
    if (encontrada) {
      ok(`${activas.length} activa(s), test encontrada`);
    } else {
      fallo('Sesion test no aparece en activas');
    }
  } catch (e) {
    fallo((e as Error).message);
  }

  // 7. Crear equipo y miembro con email
  paso('Crear equipo y miembro con email');
  try {
    const config = cargarConfig();
    const estadoMotor = { trimestre: 0, kpis: {}, kpisBase: {}, presupuesto: 100, creditosIndagacion: 12, intervenciones: [], eventosActivos: [], historialKPIs: [], penalizaciones: [] } as any;
    const equipo = await db.crearEquipo(sesionId!, 'Equipo Test', estadoMotor);
    await db.guardarMiembroConEmail(equipo.id, 'test@ejemplo.com', 'Ana Test', 'analista');
    await db.guardarCodigoPersonal(equipo.id, 'Ana Test', 'ABC123');
    await db.actualizarConexionMiembro(equipo.id, 'Ana Test', 'socket-test-123');

    const miembros = await db.obtenerMiembros(equipo.id);
    if (miembros.length === 1 && miembros[0].nombre === 'Ana Test') {
      ok(`equipo_id=${equipo.id}`);
    } else {
      fallo('Miembro no encontrado');
    }
  } catch (e) {
    fallo((e as Error).message);
  }

  // 8. Buscar por codigo personal
  paso('Buscar por codigo personal');
  try {
    const encontrado = await db.buscarPorCodigoPersonal(sesionId!, 'ABC123');
    if (encontrado && encontrado.nombre === 'Ana Test') {
      ok();
    } else {
      fallo('No encontrado');
    }
  } catch (e) {
    fallo((e as Error).message);
  }

  // Limpiar sesion de prueba
  try {
    const { obtenerPool } = await import('../db/conexion.js');
    const pool = obtenerPool();
    await pool.query('DELETE FROM sesiones WHERE codigo_sala = $1', [codigo]);
  } catch (_) {}

  await cerrarDB();
  resumen(pasos, exitos);
}

function resumen(pasos: number, exitos: number) {
  console.log(`\n  Resultado: ${exitos}/${pasos} pasos exitosos`);
  if (exitos === pasos) {
    console.log('  La infraestructura de persistencia esta lista.\n');
  } else {
    console.log('  Hay problemas por resolver.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
