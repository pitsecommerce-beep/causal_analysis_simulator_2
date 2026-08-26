# Simulador de Analisis Causal — ETF Bank

Minijuego de 50 minutos para MBA en IPADE Business School. Los equipos diagnostican el cuello de botella en el proceso de emision de tarjetas de credito de un banco ficticio (ETF Bank), proponen intervenciones y defienden su diagnostico ante el consejo del banco.

## Requisitos

- Node.js >= 20
- PostgreSQL (Supabase o cualquier instancia compatible)
- Cuenta Anthropic (Claude API)
- Cuenta Deepgram (TTS, opcional)

## Variables de entorno

Copiar `.env.example` a `.env` y completar:

| Variable | Descripcion |
|---|---|
| `DATABASE_URL` | Cadena de conexion PostgreSQL |
| `ANTHROPIC_API_KEY` | Clave API de Anthropic |
| `DEEPGRAM_API_KEY` | Clave API de Deepgram (TTS) |
| `CLAVE_PROFESOR` | Clave de acceso al panel de profesor |
| `ANTHROPIC_MODEL_PENSAR` | Modelo para razonamiento (default: `claude-sonnet-5`) |
| `ANTHROPIC_MODEL_REDACTAR` | Modelo para redaccion (default: `claude-haiku-4-5`) |
| `PORT` | Puerto del servidor (default: `3000`) |

## Instalacion

```bash
npm ci
```

## Desarrollo

Dos terminales:

```bash
npm run dev:server   # servidor con hot-reload
npm run dev:client   # Vite dev server con proxy
```

## Build y produccion

```bash
npm run build        # compila TS + Vite
npm start            # sirve en production
```

## Scripts disponibles

| Script | Descripcion |
|---|---|
| `npm run dev:server` | Servidor Node con hot-reload (tsx --watch) |
| `npm run dev:client` | Cliente Vite dev con proxy al servidor |
| `npm run build` | Compila TypeScript del servidor + Vite build del cliente |
| `npm start` | Inicia el servidor en produccion |
| `npm test` | Ejecuta tests con Vitest |
| `npm run datos:verificar` | Valida integridad de los archivos de datos |
| `npm run motor:consola` | Arnes interactivo del motor de simulacion |
| `npm run salud` | Verifica conexion a BD, APIs y archivos |
| `npm run voz:respaldo` | Genera textos y audio de respaldo (requiere APIs) |
| `npm run voz:probar` | Prueba la generacion de voz end-to-end |
| `npm run tablero:demo` | Simula 16 equipos cubriendo los 8 finales |

## Despliegue

### Railway

El proyecto incluye `nixpacks.toml` y `railway.toml`. Configurar las variables de entorno en el dashboard de Railway y conectar el repositorio.

### Docker

```bash
docker build -t simulador-causal .
docker run -p 3000:3000 --env-file .env simulador-causal
```

## Estructura del proyecto

```
config/simulador.json           Configuracion del juego (fases, costos, intervenciones, puntuacion)
datos/                          Datos del caso (solicitudes, comentarios, verdad oculta)
src/
  servidor/
    index.ts                    Punto de entrada (Express + Socket.IO)
    motor/                      Motor de simulacion (DAG, KPIs, intervenciones, eventos)
    puntuacion/                 Evaluacion de diagnostico, rigor, impacto
    sockets/                    Logica de sockets (sala, reloj)
    db/                         Conexion PostgreSQL y migraciones
    datos/                      Cargador de archivos Excel/JSON
    voz/                        Generacion de voz (Anthropic + Deepgram)
    consola/                    Scripts CLI (arnes, salud, respaldo, demo)
  cliente/
    main.tsx                    Entry point React
    App.tsx                     Router principal (equipo/profesor)
    componentes/                UnirseEquipo
    escena/                     Escena inmersiva (sala de juntas, voz del cliente)
    consola/                    Consola de analisis (KPIs, consultas, graficas, diagnostico)
    profesor/                   Panel del profesor (reloj, tablero, DAG)
    lib/                        Socket client, tipos compartidos
    estilos.css                 Estilos globales
```

## Flujo del juego (50 minutos)

| Fase | Duracion | Descripcion |
|---|---|---|
| Sala de juntas | 6 min | Director presenta el problema, contexto del banco |
| Voz del cliente | 4 min | Testimonios de clientes afectados |
| Transicion | 2 min | Asignacion de roles y preparacion |
| Trimestre 1 | 14 min | Analisis, consultas e intervenciones |
| Trimestre 2 | 10 min | Segundo ciclo de analisis |
| Trimestre 3 | 9 min | Tercer ciclo y preparacion de diagnostico |
| Consejo | 5 min | Presentacion del diagnostico al consejo del banco |

## Roles del equipo

| Rol | Responsabilidad |
|---|---|
| Patrocinador del proceso | Autoriza intervenciones |
| Lider de mejora | Envia diagnostico final |
| Analista de datos | Ejecuta consultas de indagacion |
| Voz del cliente | Marca evidencia cualitativa |

En equipos de 3 personas, el Lider asume la Voz del cliente.

## Documentacion

- `docs/NOTA-PROFESOR.md` — Guia del profesor para facilitar la sesion
- `docs/CHECKLIST-PRESESION.md` — Lista de verificacion antes de la sesion
- `datos/DICCIONARIO-DATOS-R2.md` — Diccionario de variables del caso
