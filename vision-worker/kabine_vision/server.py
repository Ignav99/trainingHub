"""Programa local de Visión. Solo escucha en este PC, en el puerto 8765."""

from __future__ import annotations

import json
import os
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

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
        route = self.path.split("?", 1)[0]
        if route == "/match":
            try:
                self._send(200, _body(_match_status(_query_path(self.path))))
            except PreviewError as exc:
                self._send(400, _body({"error": str(exc)}))
            return
        if route != "/health":
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
            if path == "/match":
                self._send(200, _body(self._start_match()))
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

    def _start_match(self) -> dict:
        payload = json.loads(self._read_body().decode("utf-8") or "{}")
        return start_match_job(
            str(payload.get("path") or ""),
            payload.get("whistles") or {},
            sample_fps=payload.get("sample_fps") or 10,
        )

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


_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


def start_match_job(raw_path: str, whistles: dict, sample_fps: float = 10) -> dict:
    from .blobs import detect_blobs
    from .match import analyze_match, ordered_whistles, sidecar_for

    video = Path(os.path.expanduser(raw_path.strip())).resolve()
    if video.suffix.lower() not in VIDEO_EXT:
        raise PreviewError("la ruta tiene que ser un vídeo")
    if not video.is_file():
        raise PreviewError("no encuentro ese partido en este PC")
    marks = ordered_whistles(whistles)
    key = str(video)
    with _jobs_lock:
        current = _jobs.get(key)
        if current and current.get("status") == "running":
            return _public_job(current)
        job = {
            "status": "running",
            "phase": "primera",
            "kept_frames": 0,
            "stored_path": str(sidecar_for(video)),
            "error": None,
            "sample_fps": float(sample_fps or 10),
        }
        _jobs[key] = job

    def work() -> None:
        def on_progress(phase: str, kept: int) -> None:
            with _jobs_lock:
                job["phase"] = phase
                job["kept_frames"] = kept

        try:
            doc = analyze_match(
                key,
                marks,
                sample_fps=float(sample_fps or 10),
                detector=detect_blobs,
                on_progress=on_progress,
            )
            with _jobs_lock:
                job["status"] = "done"
                job["kept_frames"] = doc["preview"]["kept_frames"]
                job["stored_path"] = doc["preview"]["stored_path"]
                job["document"] = doc
        except Exception as exc:
            with _jobs_lock:
                job["status"] = "error"
                job["error"] = str(exc)

    threading.Thread(target=work, name="kabine-vision-match", daemon=True).start()
    return _public_job(job)


def _match_status(raw_path: str) -> dict:
    from .match import load_sidecar, sidecar_for

    video = Path(os.path.expanduser(raw_path.strip())).resolve()
    key = str(video)
    with _jobs_lock:
        current = _jobs.get(key)
        if current:
            return _public_job(current)
    stored = sidecar_for(video)
    doc = load_sidecar(stored)
    if doc is None:
        raise PreviewError("ese partido todavía no tiene tracking")
    return {
        "status": "done",
        "phase": "listo",
        "kept_frames": (doc.get("preview") or {}).get("kept_frames") or 0,
        "stored_path": str(stored),
        "error": None,
        "sample_fps": (doc.get("preview") or {}).get("sample_fps") or 10,
        "document": doc,
    }


def _public_job(job: dict) -> dict:
    public = {
        "status": job.get("status"),
        "phase": job.get("phase"),
        "kept_frames": job.get("kept_frames") or 0,
        "stored_path": job.get("stored_path"),
        "error": job.get("error"),
        "sample_fps": job.get("sample_fps") or 10,
    }
    if job.get("status") == "done" and job.get("document") is not None:
        public["document"] = job["document"]
    return public


def _query_path(raw: str) -> str:
    query = parse_qs(urlparse(raw).query)
    values = query.get("path") or [""]
    return values[0]


def _body(payload: dict) -> bytes:
    return json.dumps(payload, ensure_ascii=False).encode("utf-8")
