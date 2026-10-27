"""Programa local de Visión. Solo escucha en este PC, en el puerto 8765."""

from __future__ import annotations

import json
import os
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from .blobs import detect_blobs, write_fixture
from .preview import PreviewError, analyze_video

HOST = "127.0.0.1"
PORT = 8765
MAX_BYTES = 40 * 1024 * 1024
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".avi", ".webm", ".mkv"}


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Visión escuchando en http://{HOST}:{PORT}", flush=True)
    print("El partido no sale de este PC. Ctrl+C para parar.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nVisión parada.", flush=True)
    finally:
        server.server_close()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args) -> None:
        print(f"[visión] {self.address_string()} {fmt % args}", flush=True)

    def do_OPTIONS(self) -> None:
        self._send(204, b"")

    def do_GET(self) -> None:
        if self.path.split("?", 1)[0] != "/health":
            self._send(404, _body({"error": "no existe"}))
            return
        self._send(200, _body({
            "ok": True,
            "detector": "blobs",
            "product_detector": "rf-detr",
            "product_detector_ready": False,
            "max_mb": 40,
            "note": "Modo prueba de colores. El ejemplo se ve en el césped. Un partido pide el detector RF-DETR.",
        }))

    def do_POST(self) -> None:
        path = self.path.split("?", 1)[0]
        try:
            if path == "/fixture":
                self._send(200, _body(_fixture()))
                return
            if path == "/preview-file":
                self._send(200, _body(self._from_upload()))
                return
            if path == "/preview":
                self._send(200, _body(self._from_path()))
                return
        except PreviewError as exc:
            self._send(400, _body({"error": str(exc)}))
            return
        except ValueError as exc:
            self._send(400, _body({"error": str(exc)}))
            return
        self._send(404, _body({"error": "no existe"}))

    def _from_upload(self) -> dict:
        raw = self._read_body()
        suffix = ".mp4"
        handle = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        try:
            handle.write(raw)
            handle.close()
            return _with_note(analyze_video(handle.name, detector=detect_blobs, **_limits(self.headers)), upload=True)
        finally:
            os.unlink(handle.name)

    def _from_path(self) -> dict:
        payload = json.loads(self._read_body().decode("utf-8") or "{}")
        raw_path = str(payload.get("path") or "").strip()
        if not raw_path:
            raise PreviewError("falta la ruta del vídeo")
        path = Path(os.path.expanduser(raw_path)).resolve()
        if path.suffix.lower() not in VIDEO_EXT:
            raise PreviewError("la ruta tiene que ser un vídeo")
        if not path.is_file():
            raise PreviewError("no encuentro ese vídeo en este PC")
        if path.stat().st_size > MAX_BYTES:
            raise PreviewError("para esta prueba el vídeo tiene que pesar 40 MB como mucho")
        limits = _limits_from(payload.get("start_s"), payload.get("seconds"), payload.get("frames"), payload.get("stride"))
        return _with_note(analyze_video(str(path), detector=detect_blobs, **limits), upload=False)

    def _read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length") or 0)
        if length < 0 or length > MAX_BYTES:
            raise PreviewError("para esta prueba el vídeo tiene que pesar 40 MB como mucho")
        return self.rfile.read(length)

    def _send(self, code: int, body: bytes) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Start-S, X-Seconds, X-Frames, X-Stride")
        self.end_headers()
        self.wfile.write(body)


def _fixture() -> dict:
    handle = tempfile.NamedTemporaryFile(suffix=".avi", delete=False)
    handle.close()
    try:
        write_fixture(handle.name)
        result = analyze_video(handle.name, start_s=0.0, seconds=2.0, frames=None, stride=1, detector=detect_blobs)
    finally:
        os.unlink(handle.name)
    result["preview"]["detector"] = "blobs"
    result["preview"]["note"] = "Ejemplo dibujado de 2 segundos. No es un partido: sirve para ver los dos equipos, el balón y el césped."
    return result


def _with_note(result: dict, *, upload: bool) -> dict:
    result["preview"]["detector"] = "blobs"
    result["preview"]["note"] = (
        "Lectura de prueba por colores, sobre el archivo que elegiste."
        if upload
        else "Lectura de prueba por colores, sobre la ruta de este PC."
    )
    return result


def _limits(headers) -> dict:
    def optional_int(name: str) -> int | None:
        raw = (headers.get(name) or "").strip()
        if not raw:
            return None
        return int(raw)

    return _limits_from(headers.get("X-Start-S"), headers.get("X-Seconds"), optional_int("X-Frames"), headers.get("X-Stride"))


def _limits_from(start_s, seconds, frames, stride) -> dict:
    start = float(start_s or 0)
    sec = None if seconds in (None, "", "null") else float(seconds)
    kept = None if frames in (None, "", "null") else int(frames)
    step = int(stride or 6)
    if sec is None and (kept is None or kept <= 0):
        sec = 5.0
    return {"start_s": start, "seconds": sec, "frames": kept, "stride": step}


def _body(payload: dict) -> bytes:
    return json.dumps(payload, ensure_ascii=False).encode("utf-8")
