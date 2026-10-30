#!/usr/bin/env python3
"""Tracking de un partido entero sin navegador (Mac, PC o GPU de alquiler).

Desde la raíz del repo:

  python3 scripts/vision_match.py --video partido.mp4 \\
      --pitidos 6:47.8 54:12.1 1:12:29.8 2:00:36.5 \\
      --nuestra "#ffffff" --rival "#fff157"

Los pitidos son: inicial, final de la 1ª, inicio de la 2ª y final, en segundos
o en m:ss / h:mm:ss. --minutos 3 lee solo los 3 primeros minutos de cada parte
(para probar que todo arranca antes de lanzar el partido entero).

Deja `<vídeo>.kabine-vision.json` al lado del vídeo y `<vídeo>.tiempos.json`
con lo que ha tardado.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "vision-worker"))

from kabine_vision.match import analyze_match, ordered_whistles, play_spans, sidecar_for  # noqa: E402
from kabine_vision.server import _match_detector, _parse_kits, _parse_roster  # noqa: E402


def seconds(value: str) -> float:
    parts = value.strip().replace(",", ".").split(":")
    if not 1 <= len(parts) <= 3:
        raise argparse.ArgumentTypeError(f"pitido no válido: {value}")
    total = 0.0
    for part in parts:
        total = total * 60 + float(part)
    return total


def numbers(value: str | None) -> list[int]:
    return [int(item) for item in (value or "").replace(" ", "").split(",") if item]


def device() -> str:
    try:
        import torch

        if torch.cuda.is_available():
            return f"cuda:{torch.cuda.get_device_name(0)}"
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
    except Exception:  # noqa: BLE001
        pass
    return "cpu"


def clock(total: float) -> str:
    total = max(0, int(total))
    return f"{total // 3600}:{total % 3600 // 60:02d}:{total % 60:02d}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Tracking de un partido entero entre los cuatro pitidos.")
    parser.add_argument("--video", required=True)
    parser.add_argument("--pitidos", nargs=4, type=seconds, required=True, metavar=("INICIO_1", "FINAL_1", "INICIO_2", "FINAL"))
    parser.add_argument("--nuestra", help="color de nuestra camiseta, p. ej. #ffffff")
    parser.add_argument("--rival", help="color de la camiseta rival, p. ej. #fff157")
    parser.add_argument("--dorsales-nuestros", help="dorsales del acta separados por comas")
    parser.add_argument("--dorsales-rival", help="dorsales del acta separados por comas")
    parser.add_argument("--fps", type=float, default=10.0, help="fotogramas por segundo que se leen (10 por defecto)")
    parser.add_argument("--modelo", default=os.environ.get("KABINE_RFDETR_SIZE", "medium"), help="tamaño de RF-DETR: nano, small, medium, base, large")
    parser.add_argument("--minutos", type=float, help="leer solo estos minutos de cada parte (prueba corta)")
    args = parser.parse_args()

    video = Path(args.video).expanduser().resolve()
    if not video.is_file():
        sys.exit(f"No encuentro el vídeo: {video}")
    marks = ordered_whistles(dict(zip(("inicio_1", "final_1", "inicio_2", "final_partido"), args.pitidos)))
    if args.minutos:
        cut = args.minutos * 60
        marks["final_1"] = min(marks["final_1"], marks["inicio_1"] + cut)
        marks["final_partido"] = min(marks["final_partido"], marks["inicio_2"] + cut)
    kits = _parse_kits({"ours": args.nuestra, "rival": args.rival} if args.nuestra or args.rival else None)
    roster = _parse_roster({"ours": numbers(args.dorsales_nuestros), "rival": numbers(args.dorsales_rival)})
    os.environ["KABINE_RFDETR_SIZE"] = args.modelo

    play_s = sum(end - start for _, start, end in play_spans(marks))
    expected = max(1, int(play_s * args.fps))
    print(f"[visión] {video.name}: {clock(play_s)} de juego, ~{expected} fotogramas a {args.fps:g} fps, en {device()}", flush=True)

    started = time.monotonic()
    detector, detector_name = _match_detector(kits, roster, None, None)
    if detector_name != "rfdetr":
        sys.exit("RF-DETR no está instalado: pip install -r vision-worker/requirements-rfdetr.txt")
    loaded = time.monotonic()
    print(f"[visión] RF-DETR {args.modelo} cargado en {loaded - started:.0f} s", flush=True)

    last: dict[str, float] = {"print": 0.0}

    def on_progress(phase: str, kept: int) -> None:
        now = time.monotonic()
        if phase == "calibrando":
            print("[visión] calibrando la cámara con 16 fotogramas del partido (en CPU, unos minutos)", flush=True)
            last["print"] = now
            return
        if "since" not in last:
            last["since"], last["from"] = now, kept
            print(f"[visión] cámara lista en {clock(now - loaded)}; empieza la lectura", flush=True)
        if now - last["print"] < 15 and kept < expected:
            return
        last["print"] = now
        rate = (kept - last["from"]) / max(now - last["since"], 1e-6)
        left = (expected - kept) / rate if rate > 0 else 0
        print(f"[visión] {phase:<10} {kept:>6}/{expected} fotogramas  {rate:5.1f} fps  quedan ~{clock(left)}", flush=True)

    doc = analyze_match(
        str(video),
        marks,
        sample_fps=args.fps,
        detector=detector,
        kits=kits,
        roster=roster,
        detector_name=detector_name,
        our_kit=(kits or {}).get("ours") or "white",
        on_progress=on_progress,
    )
    finished = time.monotonic()
    kept = int((doc.get("preview") or {}).get("kept_frames") or 0)
    timing = {
        "video": video.name,
        "device": device(),
        "machine": platform.node(),
        "modelo": args.modelo,
        "fps_leidos": args.fps,
        "segundos_de_juego": round(play_s, 1),
        "fotogramas": kept,
        "carga_modelo_s": round(loaded - started, 1),
        "lectura_s": round(finished - loaded, 1),
        "total_s": round(finished - started, 1),
        "fotogramas_por_segundo": round(kept / max(finished - loaded, 1e-6), 2),
        "json": str(sidecar_for(video)),
        "json_mb": round(sidecar_for(video).stat().st_size / 1e6, 2),
        "metricas": doc.get("metrics"),
    }
    out = video.with_name(video.stem + ".tiempos.json")
    out.write_text(json.dumps(timing, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(timing, ensure_ascii=False, indent=2), flush=True)
    print(f"[visión] Hecho en {clock(finished - started)}. Archivos: {timing['json']} y {out}", flush=True)


if __name__ == "__main__":
    main()
