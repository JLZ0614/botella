#!/usr/bin/env python3
"""
Servidor estático mínimo para «Una tapa de botella».

Motivo: el servidor de la biblioteca estándar (python -m http.server) no
admite peticiones parciales (Range), y sin ellas un navegador no puede
saltar a un punto del vídeo hasta haberlo descargado entero.

Uso:
    python3 serve.py            # http://127.0.0.1:8123
    python3 serve.py 9000       # otro puerto
    python3 serve.py 9000 0.0.0.0   # accesible desde la red local
"""

import os
import sys
import mimetypes
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
CHUNK = 64 * 1024


class RangeHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Silencio: el registro de cada petición no aporta nada aquí.
        pass

    def do_HEAD(self):
        self._serve(head_only=True)

    def do_GET(self):
        self._serve(head_only=False)

    def _serve(self, head_only=False):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            index = os.path.join(path, "index.html")
            if os.path.exists(index):
                path = index
            else:
                self.send_error(HTTPStatus.NOT_FOUND, "No hay index.html")
                return
        if not os.path.isfile(path):
            self.send_error(HTTPStatus.NOT_FOUND, "Archivo no encontrado")
            return

        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            ctype += "; charset=utf-8"
        if path.endswith(".mp4"):
            ctype = "video/mp4"

        size = os.path.getsize(path)
        start, end = 0, size - 1
        status = HTTPStatus.OK

        rng = self.headers.get("Range")
        if rng and rng.startswith("bytes="):
            spec = rng[6:].split(",")[0].strip()
            first, _, last = spec.partition("-")
            try:
                if first:
                    start = int(first)
                    end = int(last) if last else size - 1
                elif last:                      # sufijo: bytes=-500
                    start = max(0, size - int(last))
                start = max(0, min(start, size - 1))
                end = max(start, min(end, size - 1))
                status = HTTPStatus.PARTIAL_CONTENT
            except ValueError:
                start, end, status = 0, size - 1, HTTPStatus.OK

        length = end - start + 1
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(length))
        if status == HTTPStatus.PARTIAL_CONTENT:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        # El vídeo y las imágenes no cambian: se pueden cachear.
        if path.endswith((".mp4", ".jpg", ".png", ".svg", ".woff2")):
            self.send_header("Cache-Control", "public, max-age=86400")
        else:
            self.send_header("Cache-Control", "no-cache")
        self.end_headers()

        if head_only:
            return

        with open(path, "rb") as fh:
            fh.seek(start)
            remaining = length
            try:
                while remaining > 0:
                    chunk = fh.read(min(CHUNK, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    host = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"
    mimetypes.add_type("video/mp4", ".mp4")
    mimetypes.add_type("image/svg+xml", ".svg")

    server = ThreadingHTTPServer((host, port), RangeHandler)
    print(f"Una tapa de botella → http://{host}:{port}")
    print("Ctrl+C para detener.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nDetenido.")


if __name__ == "__main__":
    main()
