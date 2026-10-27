"""Vídeo dibujado de 2 segundos: el módulo 1 lo lee sin un partido real."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from kabine_vision.blobs import detect_blobs, write_fixture
from kabine_vision.preview import analyze_video
from kabine_vision.server import _fixture


class FixturePreviewTests(unittest.TestCase):
    def test_two_seconds_land_on_the_pitch(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            path = write_fixture(Path(folder) / "ejemplo.avi")
            out = analyze_video(str(path), start_s=0.0, seconds=2.0, frames=None, stride=1, detector=detect_blobs)
        self.assertEqual(out["schema"], "kabine.vision.v0")
        self.assertEqual(out["preview"]["kept_frames"], 20)
        self.assertGreaterEqual(out["preview"]["end_s"], 1.5)
        players = [track for track in out["tracks"] if track["role"] == "player"]
        self.assertEqual(len(players), 4)
        self.assertEqual(sum(1 for track in players if track["team"] == 0), 2)
        self.assertEqual(sum(1 for track in players if track["team"] == 1), 2)
        referee = [track for track in out["tracks"] if track["role"] == "referee"]
        self.assertEqual(len(referee), 1)
        self.assertIsNone(referee[0]["team"])
        self.assertTrue(all(item["accepted"] for item in out["homography"]))
        self.assertGreaterEqual(len(out["ball"]), 15)
        self.assertTrue(all(0.3 <= row["visible_m"] <= 20 for row in out["physical"]))
        self.assertEqual(out["events"], [])

    def test_frames_cap_and_seconds_window(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            path = write_fixture(Path(folder) / "ejemplo.avi")
            short = analyze_video(str(path), start_s=0.0, seconds=0.5, frames=None, stride=1, detector=detect_blobs)
            few = analyze_video(str(path), start_s=0.0, seconds=2.0, frames=3, stride=1, detector=detect_blobs)
        self.assertLessEqual(short["preview"]["kept_frames"], 7)
        self.assertGreaterEqual(short["preview"]["kept_frames"], 4)
        self.assertEqual(few["preview"]["kept_frames"], 3)

    def test_fixture_endpoint_shape(self) -> None:
        out = _fixture()
        self.assertIn("Ejemplo dibujado", out["preview"]["note"])
        self.assertEqual(out["preview"]["detector"], "blobs")
        json.dumps(out)


if __name__ == "__main__":
    unittest.main()
