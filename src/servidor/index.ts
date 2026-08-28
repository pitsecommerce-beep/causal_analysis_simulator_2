import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { resolve } from 'path';
import { existsSync } from 'fs';
import * as XLSX from 'xlsx';
import { cargarConfig } from './motor/dag.js';
import { cargarTodosDatos } from './datos/cargador.js';
import { conectarDB, ejecutarMigraciones, cerrarDB } from './db/conexion.js';
import { configurarSockets } from './sockets/sala.js';
import { DISCURSO_DIRECTOR, DISCURSO_ADRIANA, TESTIMONIOS_RESPALDO, validarTestimoniosContraDatos } from './voz/guiones.js';
import { sortearComentarios, validarTerminosProhibidos } from './voz/anthropic.js';

async function main(): Promise<void> {
  console.log('Cargando configuracion y datos...');
  const config = cargarConfig();
  const datos = cargarTodosDatos();
  console.log(`  ${datos.solicitudes.length} solicitudes, ${datos.comentarios.length} comentarios cargados`);

  const erroresTestimonios = validarTestimoniosContraDatos(
    TESTIMONIOS_RESPALDO,
    datos.comentarios,
    datos.solicitudes,
    datos.verdadOculta.semilla,
    sortearComentarios,
  );
  if (erroresTestimonios.length > 0) {
    console.warn('⚠ Testimonios de respaldo NO coinciden con datos reales:');
    for (const e of erroresTestimonios) {
      console.warn(`  [${e.indice}] ${e.campo}: esperado="${e.esperado}" encontrado="${e.encontrado}"`);
    }
    console.warn('  Ejecuta "npm run voz:respaldo" para regenerarlos.');
  } else {
    console.log('  Testimonios de respaldo validados contra datos reales ✓');
  }

  const terminosProhibidos = config.voz?.terminos_prohibidos ?? [];
  const directorLimpio = validarTerminosProhibidos(DISCURSO_DIRECTOR, terminosProhibidos);
  if (!directorLimpio) {
    console.error('✗ El guion fijo del director contiene términos prohibidos. Revisar src/servidor/voz/guiones/director.txt');
    process.exit(1);
  }
  console.log('  Guion fijo del director validado contra términos prohibidos ✓');

  const app = express();
  app.use(express.json());

  const httpServer = createServer(app);
  const io = new SocketServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  let dbConectada = false;

  app.get('/api/salud', async (_req, res) => {
    const variablesFaltantes = verificarVariables();
    res.json({
      servidor: 'activo',
      baseDatos: dbConectada ? 'conectada' : 'desconectada',
      variablesFaltantes,
      solicitudesCargadas: datos.solicitudes.length,
      comentariosCargados: datos.comentarios.length,
    });
  });

  app.get('/api/descargar/solicitudes', (_req, res) => {
    const filas = datos.solicitudes.map(s => ({
      'Application #': s.id,
      'Customer #': s.clienteId,
      'Age': s.edad,
      'Marital Status': s.estadoCivil,
      'Gender': s.genero,
      'State': s.estado,
      'Branch #': s.sucursal,
      'Years as customer': s.aniosCliente,
      'Credit Bureau Score': s.scoreBuro,
      'ETFBank Score': s.scoreETF,
      'Date of first data input': s.fechaPrimerCaptura,
      'Date of last data input': s.fechaUltimaCaptura,
      '# of tries': s.intentos,
      'Date documents sent': s.fechaEnvioDocumentos,
      'Date documents Received at CrOP': s.fechaRecepcionCrOP,
      'Credit Bureau result': s.resultadoBuro,
      'Credit Bureau run date': s.fechaBuro,
      'ETFBank Score result': s.resultadoScoreETF,
      'ETFB Score Date': s.fechaScoreETF,
      'Date Plastic Sent': s.fechaPlastico,
      'Last Status': s.ultimoEstatus,
      'Credit Line Granted': s.lineaCredito,
      'Comments': s.comentariosRaw,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    XLSX.utils.book_append_sheet(wb, ws, 'MX CAMPUS');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="R2_ETF_Bank_Data.xlsx"');
    res.send(buf);
  });

  app.get('/api/descargar/comentarios', (_req, res) => {
    const filas = datos.comentarios.map(c => ({
      'ID': c.id,
      'Solicitud #': c.solicitudId,
      'Estado': c.estado,
      'Sucursal #': c.sucursal,
      'Intentos': c.intentos,
      'Canal de captación': c.canalCaptacion,
      'Fecha del comentario': c.fechaComentario,
      'Categoría primaria': c.categoriaPrimaria,
      'Categoría secundaria': c.categoriaSecundaria,
      'Comentario del cliente': c.comentario,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    XLSX.utils.book_append_sheet(wb, ws, 'Comentarios');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="R2_ETF_Bank_Comentarios.xlsx"');
    res.send(buf);
  });

  const distCliente = resolve('dist/cliente');
  if (existsSync(distCliente)) {
    app.use(express.static(distCliente));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(resolve(distCliente, 'index.html'));
    });
  }

  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = '0.0.0.0';

  await new Promise<void>((res) => httpServer.listen(PORT, HOST, res));
  console.log(`  Servidor escuchando en puerto ${PORT} (healthcheck listo)`);

  if (process.env.DATABASE_URL) {
    console.log('Conectando a base de datos...');
    dbConectada = await conectarDB();
    if (dbConectada) {
      await ejecutarMigraciones();
      console.log('  Base de datos lista ✓');
    } else {
      console.warn('  ⚠ No se pudo conectar a Postgres. Estado solo en memoria.');
    }
  } else {
    console.warn('⚠ DATABASE_URL no configurada. Estado solo en memoria.');
  }

  configurarSockets(io, config, datos, dbConectada);

  const faltantes = verificarVariables();
  const modeloPensar = process.env.ANTHROPIC_MODEL_PENSAR || 'claude-sonnet-5';
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║   SIMULADOR DE ANALISIS CAUSAL — ETF Bank                  ║`);
  console.log(`║   Servidor escuchando en puerto ${String(PORT).padEnd(29)}║`);
  console.log(`║   Base de datos: ${(dbConectada ? 'conectada' : 'solo memoria').padEnd(40)}║`);
  console.log(`║   IA consejo:  ${modeloPensar.padEnd(42)}║`);
  console.log(`║   Acto 1:      texto fijo + Deepgram en vivo${' '.padEnd(14)}║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);

  if (faltantes.length > 0) {
    console.warn(`\n⚠ Variables faltantes (funcionalidad reducida):`);
    for (const v of faltantes) {
      console.warn(`  - ${v}`);
    }
  }

  process.on('SIGTERM', async () => {
    console.log('\nCerrando servidor...');
    await cerrarDB();
    httpServer.close();
    process.exit(0);
  });
}

function verificarVariables(): string[] {
  const requeridas = ['DATABASE_URL', 'ANTHROPIC_API_KEY', 'DEEPGRAM_API_KEY', 'CLAVE_PROFESOR'];
  return requeridas.filter(v => !process.env[v]);
}

main().catch(err => {
  console.error('Error al iniciar servidor:', err);
  process.exit(1);
});
