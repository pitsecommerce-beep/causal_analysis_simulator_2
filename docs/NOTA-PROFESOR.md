# Nota del profesor — Simulador de Analisis Causal ETF Bank

## Resumen del ejercicio

Los participantes actuan como equipo de mejora continua del banco ETF Bank. Su mision: diagnosticar por que el proceso de emision de tarjetas de credito tiene tiempos excesivos, clientes insatisfechos y errores recurrentes. Tienen 50 minutos, presupuesto limitado ($100), 12 creditos de indagacion y deben entregar un diagnostico causal al consejo del banco.

## La verdad oculta (solo para el profesor)

El sistema tiene tres hallazgos causales verdaderos:

1. **La ventana de captura es el cuello de botella** — El tiempo entre la primera y ultima captura de documentos en sucursal es el factor que mas infla el ciclo total.
2. **El reproceso por errores de captura es el mecanismo** — Documentos incompletos e ilegibles generan re-trabajo que multiplica los tiempos.
3. **Hay fuga de plasticos aprobados** — Solicitudes que pasan todas las validaciones pero nunca reciben su tarjeta.
4. **Se pierde trabajo en casos rechazados por buro** — La secuencia actual procesa documentos antes de consultar buro, desperdiciando esfuerzo.

Las **trampas** (causas espurias que parecen correlacionadas pero no tienen efecto causal):
- Edad del cliente
- Antiguedad como cliente
- Score del buro de credito
- Score interno ETF
- Genero
- Estado civil
- Linea de credito otorgada

Los errores estan **concentrados en tres sucursales** (110, 676, 728), pero esto NO es masa real — son pocas sucursales con volumenes altos que sesgan el total.

## Intervenciones optimas

La combinacion optima (maximo impacto con presupuesto eficiente):

| # | Intervencion | Costo | Efecto |
|---|---|---|---|
| 1 | Checklist documental CRASS | $15 | Reduce errores de captura drasticamente |
| 4 | Prefiltro de buro antes de captura | $10 | Elimina trabajo perdido |
| 5 | Concentrar capacitacion en foco | $10 | Reduce errores en sucursales criticas |

Costo total: $35/100. Deja presupuesto para la intervencion 2 (lectura optica) si la detectan.

### Intervenciones trampa

| # | Intervencion | Riesgo |
|---|---|---|
| 6 | Cambiar al mediador de envios | No ataca la causa raiz (C.R.A.S.S. sigue fallando) |
| 8 | Filtro agresivo de prospectos | Baja la conversion por debajo de 80% |
| 9 | Bono por velocidad a sucursales | Genera incentivo perverso (mas errores) |

## Los 8 finales posibles

| Final | Nombre | Que ocurrio |
|---|---|---|
| A | Reconversion | Diagnostico excelente, intervenciones correctas, alto rigor |
| B | Buen proyecto incompleto | Buen diagnostico pero impacto parcial o rigor incompleto |
| C | Ataque al mediador | Intervinieron al mediador de envios en vez de la causa raiz |
| D | La metrica traicionera | Filtro agresivo que mejoro tiempos pero destruyo conversion |
| E | El incentivo perverso | Bono por velocidad que genero mas errores |
| F | Dispersion | Muchas intervenciones dispersas sin foco causal |
| G | Paralisis por analisis | No aplicaron ninguna intervencion |
| H | Falso positivo | Diagnosticaron causas espurias como reales |

## Facilitacion por fase

### Sala de juntas (0-6 min)
- El director del banco presenta el problema via audio/texto
- Los participantes solo observan; no pueden interactuar
- **Tip**: Asegurese de que el audio funcione. Si no, los subtitulos siempre estan visibles

### Voz del cliente (6-10 min)
- Testimonios de 4 clientes afectados con diferentes perfiles
- Los equipos deben prestar atencion a las quejas especificas
- **Tip**: Los comentarios clave se alinean con los datos cuantitativos

### Transicion (10-12 min)
- Asignacion de roles en la mesa redonda
- Los participantes eligen su nombre y rol
- **Tip**: Con 3 participantes, el Lider asume la Voz del cliente

### Trimestres 1-3 (12-45 min)
- Fase de analisis e intervenciones
- Cada consulta cuesta creditos (12 disponibles)
- Cada intervencion cuesta presupuesto ($100 disponibles)
- **Tip**: Observe que consultas hacen primero. Los buenos equipos segmentan y hacen embudo antes de intervenir

### Consejo (45-50 min)
- El Lider envía el diagnostico
- La IA genera 3 preguntas escepticas del consejo
- Se muestra el tablero final con puntuacion
- **Tip**: Puede revelar el DAG verdadero en esta fase usando el boton "Revelar DAG"

## Uso del panel de profesor

1. Ingrese a la aplicacion y seleccione la pestana "Profesor"
2. Ingrese la clave de profesor (configurada en `CLAVE_PROFESOR`)
3. Para crear nueva sesion: click "Crear nueva sesion"
4. Para unirse a sesion existente: ingrese el codigo de sala y click "Unirse"

### Controles del reloj
- **Iniciar reloj**: Comienza el conteo de los 50 minutos
- **Pausar/Reanudar**: Para discusion grupal o explicaciones
- **+2 min / +5 min**: Extiende la fase actual
- **Revelar DAG**: Solo disponible en fase de consejo

### Tablero de equipos
- Muestra KPIs en vivo de cada equipo
- Intervenciones aplicadas con tags
- Puntuacion final cuando entregan diagnostico
- Equipos ordenados por puntuacion (con posicion)

## Preguntas frecuentes de participantes

**P: Por que mi intervencion no tiene efecto?**
R: Las intervenciones tienen retraso de 1 trimestre. Apliquenla antes para que surta efecto.

**P: No tenemos suficientes creditos.**
R: Prioricen. Un Pareto con estratificacion (1 credito) revela mas que tres consultas dispersas.

**P: Por que baja la conversion?**
R: Probablemente aplicaron la intervencion 8 (filtro agresivo). Esto mejora tiempos pero destruye la tasa de conversion.

**P: Que es el DAG?**
R: El diagrama causal real del sistema. Se revela al final como herramienta de aprendizaje.
