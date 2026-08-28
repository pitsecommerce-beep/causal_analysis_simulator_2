#!/usr/bin/env bash
# Busca palabras españolas sin acentos en texto visible del cliente.
# Revisa: contenido JSX, cadenas entre comillas, placeholders, titles, labels.
# Ignora: nombres de variables, propiedades, tipos, eventos de socket, CSS.
# Uso: npm run acentos:revisar

set -euo pipefail

DIR="src/cliente"
EXIT=0

# Patrón → corrección esperada
PATRONES=(
  'Analisis'
  'hipotesis'
  'Hipotesis'
  'diagnostico'
  'Diagnostico'
  'intervencion'
  'Intervencion'
  'Codigo'
  'electronico'
  'Electronico'
  'Sesion'
  'reconexion'
  'Reconexion'
  'Puntuacion'
  'Conversion'
  'Creditos'
  'Justificacion'
  'Dispersion'
  'Paralisis'
  'metrica'
  'Bitacora'
  'plastico'
  'Plastico'
  'Accion'
  'aprobacion'
  'percepcion'
  'Concentracion'
  'Conexion'
  'Asignacion'
  'automaticamente'
  'validos'
  'numeros'
  'Evalua'
)

EXTS="--include=*.tsx --include=*.ts"

for PAT in "${PATRONES[@]}"; do
  # Buscar, luego filtrar líneas que son claramente código, no texto visible
  HITS=$(grep -rn $EXTS "$PAT" "$DIR" \
    | grep -v '^\s*//' \
    | grep -v 'className=' \
    | grep -v '^[^:]*:import ' \
    | grep -v '^[^:]*:.*from ' \
    | grep -v '\.css' \
    | grep -v '\btype\b.*=' \
    | grep -v '\binterface\b ' \
    | grep -v 'useState' \
    | grep -v 'function ' \
    | grep -v 'socket\.\(emit\|on\|off\)' \
    | grep -v '\bconst\b.*=' \
    | grep -v '\blet\b.*=' \
    | grep -v '^\s*export' \
    | grep -v 'key:.*label:' \
    | grep -v '^[^:]*:[^:]*:\s*[a-zA-Z]*:' \
    | grep -v '| '"'"'.*'"'"'' \
    || true)

  if [ -n "$HITS" ]; then
    echo "⚠  «$PAT» (posible falta de acento):"
    echo "$HITS"
    echo ""
    EXIT=1
  fi
done

if [ $EXIT -eq 0 ]; then
  echo "✓ No se encontraron palabras sin acento en texto visible."
fi

exit $EXIT
