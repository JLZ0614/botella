#!/bin/bash
# Arranca el sitio y lo abre en el navegador. Doble clic para usarlo.
cd "$(dirname "$0")" || exit 1

PORT=8123

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "El puerto $PORT ya está ocupado: abro esa dirección."
  open "http://127.0.0.1:$PORT"
  exit 0
fi

python3 serve.py "$PORT" &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null' EXIT INT TERM

# espera a que el servidor responda
for _ in $(seq 1 40); do
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then break; fi
  sleep 0.1
done

open "http://127.0.0.1:$PORT"
echo "Sitio en http://127.0.0.1:$PORT — cierra esta ventana para detenerlo."
wait "$SERVER_PID"
