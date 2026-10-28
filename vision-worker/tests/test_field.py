"""Camisetas, acta y líneas. El vídeo es dibujado: no es un partido de Veo."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from kabine_vision.field import detect_field, paint_digits, read_dorsal, write_field_fixture
from kabine_vision.match import analyze_match, session_match
from kabine_vision.tracking import Box


KITS = {"ours": "#f5f5f5", "rival": "#1e28b4"}
ROSTER = {"ours": [7, 8], "rival": [4, 5]}
MARKS = {"inicio_1": 0.0, "final_1": 0.5, "inicio_2": 1.0, "final_partido": 1.5}


class FieldTests(unittest.TestCase):
    def test_a_number_outside_the_acta_is_dropped(self) -> None:
        frame = np.zeros((80, 60, 3), dtype=np.uint8)
        frame[:] = (245, 245, 245)
        paint_digits(frame, 30, 28, 9, (8, 8, 8), scale=3)
        box = Box(0.0, "player", 8, 4, 44, 64, team=0)
        self.assertEqual(read_dorsal(frame, box, {7, 8}), None)
        self.assertEqual(read_dorsal(frame, box, {9}), 9)

    def test_shirts_lines_ball_and_acta_numbers(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            video = write_field_fixture(Path(folder) / "campo.avi", frames=16, fps=10)

            def detector(frame, t):
                return detect_field(frame, t, kits=KITS, roster=ROSTER)

            doc = analyze_match(
                str(video),
                MARKS,
                sample_fps=10,
                detector=detector,
                kits=KITS,
                roster=ROSTER,
                detector_name="field",
            )
        metrics = doc["metrics"]
        players = [track for track in doc["tracks"] if track["role"] == "player"]
        self.assertGreaterEqual(len(players), 4)
        self.assertLessEqual(metrics["max_players_in_frame"], 8)
        self.assertEqual(metrics["team_coverage"], 1)
        self.assertGreaterEqual(metrics["dorsals_in_acta"], 4)
        self.assertGreater(metrics["ball_samples"], 0)
        self.assertEqual(metrics["homography_primera"], 6)
        self.assertEqual(metrics["homography_segunda"], 6)
        self.assertGreater(metrics["pitch_coverage"], 0.5)
        numbers = {track["dorsal"] for track in players if track["dorsal"] is not None}
        self.assertTrue(numbers <= {4, 5, 7, 8})
        self.assertGreaterEqual(len(numbers), 2)

    def test_orange_corners_still_open_the_pitch_without_white_lines(self) -> None:
        frame = np.zeros((360, 640, 3), dtype=np.uint8)
        frame[:] = (40, 110, 45)
        for cx, cy in ((48, 36), (592, 36), (592, 324), (48, 324)):
            cv2.rectangle(frame, (cx - 8, cy - 8), (cx + 8, cy + 8), (0, 140, 255), -1)
        boxes = detect_field(frame, 1.0, kits=KITS, roster=ROSTER)
        self.assertGreaterEqual(sum(1 for box in boxes if box.kind == "keypoint"), 4)

    def test_other_shirts_mean_a_new_read(self) -> None:
        saved = {"whistles": MARKS, "kits": KITS, "roster": ROSTER, "reader": "estable-1"}
        self.assertTrue(session_match(saved, MARKS, KITS, ROSTER))
        self.assertFalse(session_match({"whistles": MARKS, "kits": KITS, "roster": ROSTER}, MARKS, KITS, ROSTER))
        self.assertFalse(session_match(saved, MARKS, {"ours": "#f5f5f5", "rival": "#aa0000"}, ROSTER))
        self.assertFalse(session_match(saved, MARKS, KITS, {"ours": [7], "rival": [4]}))


if __name__ == "__main__":
    unittest.main()
