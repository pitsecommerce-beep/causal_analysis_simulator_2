// Camera and scene layout — values match config/simulador.json "camara"
export const CAMARA = {
  arcoGrados: 140,
  aceleracionGrados: 400,
  velocidadMaxGrados: 200,
  spriteEscalaAlto: 0.32,
  spriteBaseY: 0.65,
  brujulaAlto: 20,
  posiciones: {
    director: 0,
    adriana: -55,
    'cliente-0': -40,
    'cliente-1': -15,
    'cliente-2': 15,
    'cliente-3': 40,
    'companero-0': -30,
    'companero-1': 10,
    'companero-2': 35,
    'companero-3': 55,
  },
} as const;

export const PANORAMA_ANCHO = 3072;
export const PANORAMA_ALTO = 1024;
