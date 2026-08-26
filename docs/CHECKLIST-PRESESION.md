# Checklist pre-sesion — Simulador de Analisis Causal

Verificar cada punto antes de iniciar una sesion con participantes.

## 1. Infraestructura

- [ ] Servidor desplegado y accesible (Railway, Docker, o local)
- [ ] URL del servidor confirmada y compartida con participantes
- [ ] Base de datos PostgreSQL conectada (verificar con `npm run salud`)
- [ ] Variables de entorno configuradas:
  - [ ] `DATABASE_URL` — cadena de conexion PostgreSQL
  - [ ] `ANTHROPIC_API_KEY` — clave de Anthropic valida
  - [ ] `DEEPGRAM_API_KEY` — clave de Deepgram valida
  - [ ] `CLAVE_PROFESOR` — clave de acceso al panel (compartir solo con co-facilitadores)
  - [ ] `ANTHROPIC_MODEL_PENSAR` — modelo configurado
  - [ ] `ANTHROPIC_MODEL_REDACTAR` — modelo configurado

## 2. Verificacion de salud

```bash
npm run salud
```

Debe reportar:
- Base de datos: conectada
- API Anthropic: accesible
- API Deepgram: accesible
- Archivos de datos: completos
- Audio de respaldo: presente

Si alguna API no responde, el simulador funciona con textos de respaldo y audio pre-generado.

## 3. Audio de respaldo

```bash
npm run voz:respaldo
```

Genera textos y audio de respaldo en `src/servidor/voz/respaldo/`. Ejecutar al menos una vez antes de la primera sesion. Los archivos se versionan en git — solo re-ejecutar si se cambian los datos del caso.

## 4. Datos del caso

```bash
npm run datos:verificar
```

Confirma que los archivos Excel y JSON en `datos/` estan integros y son consistentes.

## 5. Motor de simulacion

```bash
npm run tablero:demo
```

Ejecuta 16 equipos simulados. Verificar que:
- Los 8 finales (A-H) aparecen cubiertos
- Los puntajes estan en rangos razonables (0-1000)
- No hay errores de ejecucion

## 6. Prueba de flujo completo

1. Abrir la URL del servidor en un navegador
2. Seleccionar pestana "Profesor" e ingresar la clave
3. Crear nueva sesion — anotar el codigo de sala
4. En otra pestana/dispositivo, unirse como equipo con el codigo
5. Iniciar reloj desde el panel de profesor
6. Verificar que:
   - [ ] La escena inmersiva carga (sala de juntas)
   - [ ] El audio del director se reproduce (o subtitulos visibles)
   - [ ] La transicion a voz del cliente funciona
   - [ ] Los testimonios de clientes se muestran
   - [ ] La asignacion de roles funciona
   - [ ] La consola de analisis carga con KPIs
   - [ ] Las consultas consumen creditos
   - [ ] Las intervenciones descuentan presupuesto
   - [ ] El diagnostico se envia correctamente
   - [ ] El tablero final muestra puntuacion
7. Detener la sesion de prueba

## 7. Sala de clase

- [ ] Proyector/pantalla para el panel de profesor
- [ ] Cada equipo tiene al menos un dispositivo con navegador
- [ ] Conexion a internet estable
- [ ] Codigo de sala visible para todos (pizarron/pantalla)
- [ ] Reloj del aula sincronizado (el simulador tiene su propio reloj)

## 8. Durante la sesion

- [ ] Crear sesion desde el panel de profesor
- [ ] Compartir codigo de sala con los equipos
- [ ] Esperar a que todos los equipos se unan (visible en el tablero)
- [ ] Iniciar reloj cuando todos esten listos
- [ ] Monitorear progreso en el tablero de equipos
- [ ] Usar pausa si necesita explicar algo
- [ ] Usar +2min o +5min si los equipos necesitan mas tiempo
- [ ] En fase de consejo: revelar DAG cuando sea apropiado
- [ ] Discutir resultados y finales con el grupo

## 9. Despues de la sesion

- [ ] Los resultados quedan en la base de datos para revision posterior
- [ ] Puede consultar diagnosticos y puntuaciones via SQL
- [ ] Considerar exportar datos para analisis de la dinamica grupal
