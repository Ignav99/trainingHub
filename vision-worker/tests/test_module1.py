"""Partido sintético del módulo 1. No hay píxeles de Veo ni pesos del detector."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from kabine_vision.homography import apply_h, dlt_homography, homography_keeps_center_on_pitch
from kabine_vision.pipeline import run_span
from kabine_vision.tracking import Box

W = 1920.0
H = 1080.0
SX = 105.0 / W
SY = 68.0 / H


def pitch_to_img(x: float, y: float, pan: float = 0.0) -> tuple[float, float]:
    return x / SX + pan, y / SY


def keypoints(t: float, pan: float = 0.0, shift_m: tuple[float, float] = (0.0, 0.0)) -> list[Box]:
    boxes: list[Box] = []
    for x, y in ((0.0, 0.0), (105.0, 0.0), (105.0, 68.0), (0.0, 68.0)):
        ix, iy = pitch_to_img(x, y, pan)
        boxes.append(Box(t, "keypoint", ix, iy, 1, 1, pitch_xy=(x + shift_m[0], y + shift_m[1])))
    return boxes


def person(
    t: float,
    pitch_xy: tuple[float, float],
    rgb: tuple[float, float, float],
    kind: str = "player",
    pan: float = 0.0,
    image_xy: tuple[float, float] | None = None,
) -> Box:
    if image_xy is None:
        fx, fy = pitch_to_img(*pitch_xy, pan)
    else:
        fx, fy = image_xy
    w, h = 120.0, 180.0
    return Box(t, kind, fx - w / 2.0, fy - h, w, h, rgb=rgb)


def ball(t: float, pitch_xy: tuple[float, float], pan: float = 0.0) -> Box:
    ix, iy = pitch_to_img(*pitch_xy, pan)
    return Box(t, "ball", ix, iy, 12, 12)


WHITE = (240.0, 240.0, 240.0)
BLUE = (20.0, 40.0, 120.0)
YELLOW = (230.0, 200.0, 40.0)


class HomographyTests(unittest.TestCase):
    def test_rectangle_maps_center_to_midfield(self) -> None:
        src = np.array([[0, 0], [W, 0], [W, H], [0, H]], dtype=float)
        dst = np.array([[0, 0], [105, 0], [105, 68], [0, 68]], dtype=float)
        h = dlt_homography(src, dst)
        center = apply_h(h, np.array([[W / 2, H / 2]]))[0]
        self.assertAlmostEqual(center[0], 52.5, delta=0.05)
        self.assertAlmostEqual(center[1], 34.0, delta=0.05)
        self.assertTrue(homography_keeps_center_on_pitch(h, W, H))

    def test_center_off_the_pitch_is_rejected(self) -> None:
        src = np.array([[0, 0], [W, 0], [W, H], [0, H]], dtype=float)
        dst = np.array([[200, 200], [305, 200], [305, 268], [200, 268]], dtype=float)
        h = dlt_homography(src, dst)
        self.assertFalse(homography_keeps_center_on_pitch(h, W, H))


class SpanTests(unittest.TestCase):
    def test_two_teams_ball_and_stable_ids(self) -> None:
        boxes: list[Box] = []
        roles = (
            ((15.0, 20.0), WHITE, "player"),
            ((15.0, 48.0), WHITE, "player"),
            ((70.0, 20.0), BLUE, "player"),
            ((70.0, 48.0), BLUE, "player"),
            ((52.0, 34.0), YELLOW, "referee"),
        )
        for step in range(4):
            t = step * 0.2
            boxes.extend(keypoints(t))
            for (x, y), rgb, kind in roles:
                boxes.append(person(t, (x + step * 0.4, y), rgb, kind))
            if step < 3:
                boxes.append(ball(t, (40.0 + step * 3.0, 34.0)))
        boxes.append(person(9.0, (10.0, 10.0), WHITE))

        out = run_span(boxes, start_s=0.0, end_s=1.0, width=W, height=H, fps=10.0)
        self.assertEqual(out["schema"], "kabine.vision.v0")
        self.assertEqual(out["events"], [])
        self.assertEqual(out["phases"], [])
        self.assertEqual(out["our_team"], 0)
        self.assertEqual(out["our_kit"], "white")
        self.assertEqual(out["source"]["path"], "local")
        self.assertEqual(len(out["tracks"]), 5)
        self.assertTrue(all(len(track["samples"]) == 4 for track in out["tracks"]))
        self.assertTrue(all(sample["t"] <= 1.0 for track in out["tracks"] for sample in track["samples"]))

        players = [track for track in out["tracks"] if track["role"] == "player"]
        referee = next(track for track in out["tracks"] if track["role"] == "referee")
        self.assertIsNone(referee["team"])
        whites = [track for track in players if track["team"] == 0]
        blues = [track for track in players if track["team"] == 1]
        self.assertEqual(len(whites), 2)
        self.assertEqual(len(blues), 2)
        self.assertTrue(all(0.4 <= row["visible_m"] <= 2.5 for row in out["physical"]))
        self.assertTrue(all(row["note"] == "solo lo que se ve" for row in out["physical"]))
        self.assertEqual(len(out["physical"]), 4)
        self.assertTrue(all(item["accepted"] for item in out["homography"]))
        self.assertEqual(len(out["ball"]), 4)
        self.assertTrue(all(item["in_air"] is None for item in out["ball"]))
        self.assertTrue(all(item["held"] is False for item in out["ball"][:3]))
        self.assertTrue(out["ball"][3]["held"])
        self.assertGreater(whites[0]["samples"][-1]["x"], whites[0]["samples"][0]["x"])

    def test_bad_calibration_keeps_the_previous_homography(self) -> None:
        boxes = keypoints(0.0) + keypoints(0.2, shift_m=(200.0, 200.0))
        boxes.append(person(0.0, (20.0, 34.0), WHITE))
        boxes.append(person(0.2, (20.0, 34.0), BLUE))
        out = run_span(boxes, start_s=0.0, end_s=0.2, width=W, height=H, fps=10.0)
        self.assertEqual(len(out["homography"]), 2)
        self.assertTrue(out["homography"][0]["accepted"])
        self.assertFalse(out["homography"][1]["accepted"])
        self.assertEqual(out["homography"][0]["H"], out["homography"][1]["H"])

    def test_a_small_pan_stays_a_homography(self) -> None:
        boxes = keypoints(0.0) + keypoints(0.2, pan=40.0)
        boxes += [person(0.0, (30.0, 34.0), WHITE), person(0.2, (30.0, 34.0), BLUE, pan=40.0)]
        out = run_span(boxes, start_s=0.0, end_s=0.2, width=W, height=H, fps=10.0)
        self.assertTrue(all(item["accepted"] for item in out["homography"]))
        self.assertNotEqual(out["homography"][0]["H"], out["homography"][1]["H"])

    def test_impossible_speed_does_not_add_metres(self) -> None:
        foot = pitch_to_img(20.0, 34.0)
        boxes = keypoints(0.0) + keypoints(0.5) + keypoints(0.6, pan=400.0)
        boxes.append(person(0.0, (20.0, 34.0), WHITE, image_xy=foot))
        boxes.append(person(0.5, (22.0, 34.0), WHITE))
        boxes.append(person(0.6, (22.0, 34.0), WHITE, image_xy=pitch_to_img(22.0, 34.0)))
        boxes.append(person(0.0, (80.0, 34.0), BLUE))
        boxes.append(person(0.5, (80.0, 34.0), BLUE))
        boxes.append(person(0.6, (80.0, 34.0), BLUE, pan=400.0))
        out = run_span(boxes, start_s=0.0, end_s=0.6, width=W, height=H, fps=10.0)
        mover = next(track for track in out["tracks"] if track["samples"][0]["x"] < 0.3)
        self.assertLess(next(row["visible_m"] for row in out["physical"] if row["track_id"] == mover["id"]), 3.0)
        self.assertTrue(mover["samples"][-1].get("rejected_speed"))
        self.assertAlmostEqual(mover["samples"][-1]["x"], mover["samples"][-2]["x"], places=3)

    def test_end_before_start_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            run_span([], start_s=2.0, end_s=1.0, width=W, height=H, fps=25.0)


if __name__ == "__main__":
    unittest.main()
