import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { cargarConfig } from './motor/dag.js';
import { cargarTodosDatos } from './datos/cargador.js';
import { conectarDB, ejecutarMigraciones, cerrarDB } from './db/conexion.js';
import { configurarSockets } from './sockets/sala.js';

async function main(): Promise<void> {
  console.log('Cargando configuración y datos...');
  const config = cargarConfig();
  const datos = cargarTodosDatos();
  console.log(`  ${datos.solicitudes.length} solicitudes, ${datos.comentarios.length} comentarios cargados`);

  const app = express();
  app.use(express.json());

  const httpServer = createServer(app);
  const io = new SocketServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  let dbConectada = false;
  if (process.env.DATABASE_URL) {
    console.log('Conectando a base de datos...');
    dbConectada = await conectarDB();
    if (dbConectada) {
      await ejecutarMigraciones();
      console.log('  Base de datos lista');
    } else {
      console.warn('  ⚠ No se pudo conectar a Postgres. Estado solo en memoria.');
    }
  } else {
    console.warn('⚠ DATABASE_URL no configurada. Estado solo en memoria.');
  }

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

  const distCliente = resolve('dist/cliente');
  if (existsSync(distCliente)) {
    app.use(express.static(distCliente));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(resolve(distCliente, 'index.html'));
    });
  }

  configurarSockets(io, config, datos, dbConectada);

  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = '0.0.0.0';
  httpServer.listen(PORT, HOST, () => {
    const modeloPensar = process.env.ANTHROPIC_MODEL_PENSAR || 'claude-sonnet-5';
    const modeloRedactar = process.env.ANTHROPIC_MODEL_REDACTAR || 'claude-haiku-4-5';
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║   SIMULADOR DE ANÁLISIS CAUSAL — ETF Bank                  ║`);
    console.log(`║   Servidor escuchando en puerto ${String(PORT).padEnd(29)}║`);
    console.log(`║   Base de datos: ${(dbConectada ? 'conectada' : 'solo memoria').padEnd(40)}║`);
    console.log(`║   IA pensar:   ${modeloPensar.padEnd(42)}║`);
    console.log(`║   IA redactar: ${modeloRedactar.padEnd(42)}║`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);
  });

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
