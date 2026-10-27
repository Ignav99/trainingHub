#!/usr/bin/env python3
"""Arranca Visión en este PC, en http://127.0.0.1:8765.

Desde la raíz del repo:

  python3 scripts/vision_server.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "vision-worker"))

from kabine_vision.server import main

if __name__ == "__main__":
    main()
