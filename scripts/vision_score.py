#!/usr/bin/env python3
"""Nota Kabine de uno o varios JSON de visión, para ver si una prueba mejora a la anterior.

  python3 scripts/vision_score.py prueba-antigua.kabine-vision.json prueba-nueva.kabine-vision.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "vision-worker"))

from kabine_vision.compact import unpack_document  # noqa: E402
from kabine_vision.score import scorecard, scorecard_lines  # noqa: E402


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for name in sys.argv[1:]:
        doc = unpack_document(json.loads(Path(name).expanduser().read_text(encoding="utf-8")))
        print(f"== {Path(name).name}")
        print("\n".join(scorecard_lines(scorecard(doc))))


if __name__ == "__main__":
    main()
