#!/usr/bin/env python3
"""Deja el JSON de un partido por debajo del límite de 25 MB de GitHub.

No vuelve a leer el vídeo. Reescribe el archivo que ya está al lado del MP4:

  python3 scripts/vision_compact.py "/ruta/CAC B VS NERVION.kabine-vision.json"
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "vision-worker"))

from kabine_vision.match import load_sidecar


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("indica la ruta del .kabine-vision.json", file=sys.stderr)
        return 1
    for raw in argv[1:]:
        path = Path(raw).expanduser()
        if not path.is_file():
            print(f"no está el archivo {path}", file=sys.stderr)
            return 1
        before = path.stat().st_size
        load_sidecar(path)
        after = path.stat().st_size
        if after == before:
            print(f"{path} ya estaba comprimido ({after / (1024 * 1024):.1f} MB).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
