"""El JSON del partido cabe en la subida web de GitHub (25 MB)."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from kabine_vision.compact import dumps_document, unpack_document
from kabine_vision.match import load_sidecar


def _sample(t: float, px: float, py: float, x=None, y=None, rejected: bool = False) -> dict:
    row = {"t": t, "px": px, "py": py}
    if x is not None:
        row["x"] = x
        row["y"] = y
    if rejected:
        row["rejected_speed"] = True
    return row


class CompactRoundtripTests(unittest.TestCase):
    def test_deltas_survive_a_gap_and_a_rejected_step(self) -> None:
        samples = [
            _sample(407.807, 1128.0, 604.5),
            _sample(407.907, 1130.5, 605.0, 0.4521, 0.3312),
            _sample(408.007, 1131.0, 606.0, 0.4522, 0.3310, rejected=True),
            _sample(409.007, 20.0, 10.0),
            _sample(409.107, 21.0, 11.0, -0.0123, 1.0),
        ]
        doc = {
            "schema": "kabine.vision.v0",
            "metrics": {"players": 1},
            "tracks": [
                {"id": 7, "team": 0, "role": "player", "dorsal": 0, "samples": samples},
                {"id": 8, "team": None, "role": "referee", "dorsal": None, "samples": samples[:1]},
            ],
            "ball": [
                {"t": 1.0, "x": 0.5, "y": 0.5, "in_air": None, "held": False},
                {"t": 1.1, "x": 0.51, "y": 0.5, "in_air": None, "held": True},
            ],
            "homography": [
                {"t": 1.0, "H": [0.005451, -0.086947, 18.740678, 0.006024, -0.207067, 54.227413, 8e-05, -0.00365, 1.0], "accepted": True},
                {"t": 1.1, "H": [0.005451, -0.086947, 18.740678, 0.006024, -0.207067, 54.227413, 8e-05, -0.00365, 1.0], "accepted": False},
                {"t": 1.2, "H": [0.2, 0.0, 1.0, 0.0, 0.2, 2.0, 0.0, 0.0, 1.0], "accepted": True},
            ],
            "physical": [
                {"track_id": 7, "visible_m": 12.5, "note": "solo lo que se ve"},
            ],
        }
        raw = json.loads(dumps_document(doc))
        self.assertEqual(raw["encoding"], "pack1")
        self.assertIn("pack1", raw["pack"])
        self.assertNotIn("samples", raw["tracks"][0])
        self.assertLess(len(dumps_document(doc)), len(json.dumps(doc)))
        restored = unpack_document(raw)
        self.assertEqual(restored["tracks"][0]["samples"], samples)
        self.assertEqual(restored["tracks"][0]["dorsal"], 0)
        self.assertEqual(restored["tracks"][0]["team"], 0)
        self.assertIsNone(restored["tracks"][1]["team"])
        self.assertEqual(restored["ball"], doc["ball"])
        self.assertEqual(restored["homography"], doc["homography"])
        self.assertEqual(restored["physical"][0]["visible_m"], 12.5)
        self.assertEqual(restored["metrics"]["players"], 1)
        again = json.loads(dumps_document(restored))
        self.assertEqual(again["tracks"][0]["s"], raw["tracks"][0]["s"])

    def test_a_full_match_of_samples_stays_under_the_github_upload(self) -> None:
        samples = [
            _sample(
                round(index / 10, 3),
                float(100 + (index % 50)),
                400.0,
                round(0.2 + (index % 30) / 10000, 4),
                0.4,
            )
            for index in range(20000)
        ]
        doc = {
            "schema": "kabine.vision.v0",
            "tracks": [{"id": 1, "team": 0, "role": "player", "dorsal": 9, "samples": samples}],
            "ball": [],
            "homography": [{"t": index / 10, "H": [1, 0, 0, 0, 1, 0, 0, 0, 1], "accepted": index % 5 == 0} for index in range(5000)],
            "physical": [{"track_id": 1, "visible_m": 80, "note": "solo lo que se ve"}],
        }
        verbose = len(json.dumps(doc, ensure_ascii=False).encode())
        packed = len(dumps_document(doc).encode())
        self.assertLess(packed, verbose / 3)
        restored = unpack_document(json.loads(dumps_document(doc)))
        self.assertEqual(len(restored["tracks"][0]["samples"]), 20000)
        self.assertEqual(restored["tracks"][0]["samples"][0], samples[0])
        self.assertEqual(restored["tracks"][0]["samples"][-1], samples[-1])
        self.assertEqual(sum(1 for row in restored["homography"] if row["accepted"]), 1000)

    def test_an_old_verbose_file_is_rewritten_smaller(self) -> None:
        samples = [_sample(index / 10, 10.0, 20.0, 0.3, 0.4) for index in range(400)]
        doc = {
            "schema": "kabine.vision.v0",
            "tracks": [{"id": 1, "team": None, "role": "player", "samples": samples}],
            "ball": [],
            "homography": [],
            "physical": [{"track_id": 1, "visible_m": 0.0, "note": "solo lo que se ve"}],
            "preview": {"kept_frames": 400, "detector": "blobs"},
        }
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "partido.kabine-vision.json"
            path.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
            before = path.stat().st_size
            opened = load_sidecar(path)
            self.assertEqual(len(opened["tracks"][0]["samples"]), 400)
            self.assertEqual(opened["tracks"][0]["samples"][10]["x"], 0.3)
            self.assertIn("metrics", opened)
            self.assertLess(path.stat().st_size, before)
            saved = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(saved["encoding"], "pack1")
            second = path.stat().st_size
            again = load_sidecar(path)
            self.assertEqual(path.stat().st_size, second)
            self.assertEqual(again["tracks"][0]["samples"][10], samples[10])


if __name__ == "__main__":
    unittest.main()
