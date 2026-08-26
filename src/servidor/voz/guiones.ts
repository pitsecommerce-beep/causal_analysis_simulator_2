export const DISCURSO_DIRECTOR = `Buenos días. Soy Ramón Betancourt, Director de Banca al Menudeo de ETF Bank.

Seré directo: los convoqué porque tenemos un problema que ya no puedo ignorar. Las quejas de clientes sobre nuestro proceso de solicitud de tarjeta de crédito han venido creciendo, y la presión de la Dirección General es cada vez más fuerte.

Ustedes son parte de varias consultoras que compiten por este mandato. Quiero que eso quede claro desde el principio: no son los únicos en esta sala. El equipo que demuestre el mejor diagnóstico se lleva el contrato.

Tenemos una muestra de mil quinientas solicitudes reales extraídas de nuestro sistema C.R.A.S.S., que cubre dieciocho meses de operación. También contamos con noventa comentarios directos de clientes que pasaron por este proceso. Son sus palabras textuales, no las mías ni las de nadie en este banco.

Nuestro proceso involucra tres actores. Primero, el cliente que llega a la sucursal. Segundo, el ejecutivo de sucursal que captura la solicitud. Y tercero, nuestra Oficina de Solicitud de Crédito, el CrOP, que procesa toda la documentación y coordina las evaluaciones crediticias.

Lo que necesito de ustedes es un diagnóstico basado en evidencia. No quiero opiniones, no quiero corazonadas, no quiero que adivinen. Quiero que analicen los datos con rigor, identifiquen qué está pasando realmente y me propongan acciones concretas.

Tienen tiempo limitado. Cada consulta al sistema tiene un costo. Piensen antes de actuar.

Adelante.`;

export interface TestimonioRespaldo {
  commentId: string;
  solicitudId: number;
  estado: string;
  sucursal: number;
  genero: string;
  texto: string;
}

export const TESTIMONIOS_RESPALDO: TestimonioRespaldo[] = [
  {
    commentId: 'C-012',
    solicitudId: 234,
    estado: 'Jalisco',
    sucursal: 110,
    genero: 'F',
    texto: 'Fui tres veces a la sucursal a dejar los mismos papeles. Tres veces. Cada vez me decían que algo estaba mal, que faltaba una firma, que la copia no se leía. Al final le pregunté al ejecutivo si ellos no tenían una lista de lo que necesitaban, y me dijo que sí pero que había cambiado. Llevo dos meses esperando.',
  },
  {
    commentId: 'C-027',
    solicitudId: 489,
    estado: 'Nuevo León',
    sucursal: 676,
    genero: 'M',
    texto: 'Ya van cuatro intentos para meter mi solicitud. Cuatro. Cada vez me piden algo diferente. La primera vez faltaba el comprobante de domicilio, la segunda que la identificación estaba borrosa. Siento que estoy peleando contra el sistema en lugar de solicitar una tarjeta.',
  },
  {
    commentId: 'C-045',
    solicitudId: 891,
    estado: 'CDMX',
    sucursal: 302,
    genero: 'M',
    texto: 'Me aprobaron la tarjeta hace mes y medio y todavía no me llega. Llamé al banco tres veces, y cada vez me dicen que está en proceso. En proceso de qué, si ya me la aprobaron. Mientras tanto, la oferta que quería aprovechar ya se venció.',
  },
  {
    commentId: 'C-068',
    solicitudId: 1102,
    estado: 'Puebla',
    sucursal: 728,
    genero: 'F',
    texto: 'Completé todo el proceso, llevé todos mis documentos, esperé semanas, y al final me rechazaron por el buró. Si desde el principio podían ver mi historial crediticio, ¿por qué me hicieron perder todo ese tiempo? No entiendo la lógica.',
  },
];
