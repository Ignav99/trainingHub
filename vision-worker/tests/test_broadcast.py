"""Detector con RF-DETR y cámara: lo que se puede comprobar sin el modelo ni el partido."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from kabine_vision import camera as C
from kabine_vision.broadcast import BroadcastDetector, Sample, learn_kits, pitch_keypoints
from kabine_vision.homography import apply_h
from kabine_vision.pipeline import run_span
from kabine_vision.score import score_document
from kabine_vision.tracking import Box

WIDTH, HEIGHT = 1920, 1080
PITCH = C.Pitch(102.0, 66.0)
VIEW = np.array([51.0, 14.0, 9.5, 0.2, 0.21, 0.65, 0.0])


def _render(params: np.ndarray, pitch: C.Pitch = PITCH) -> tuple[np.ndarray, np.ndarray]:
    """Fotograma sintético de la cámara y su homografía de verdad, imagen → 105×68."""
    to_image = C.camera_h(params, (WIDTH, HEIGHT), pitch)
    frame = np.full((HEIGHT, WIDTH, 3), (90, 90, 90), np.uint8)
    ys, xs = np.mgrid[0:HEIGHT, 0:WIDTH]
    ground = np.stack([xs.ravel(), ys.ravel(), np.ones(xs.size)], axis=1) @ np.linalg.inv(to_image).T
    front = ground[:, 2] * np.sign(float((np.linalg.inv(to_image) @ [WIDTH / 2, HEIGHT - 1, 1])[2])) > 0
    gx, gy = ground[:, 0] / ground[:, 2], ground[:, 1] / ground[:, 2]
    turf = front & (gx > -8) & (gx < pitch.length + 8) & (gy > -8) & (gy < pitch.width + 8)
    frame.reshape(-1, 3)[turf] = (40, 120, 45)
    for x, y in apply_h(to_image, C.pitch_template(0.1, pitch.length, pitch.width)):
        if 0 <= x < WIDTH and 0 <= y < HEIGHT:
            cv2.circle(frame, (int(x), int(y)), 2, (170, 220, 175), -1)
    truth = pitch.to_standard() @ np.linalg.inv(to_image)
    return frame, truth / truth[2, 2]


def _lab(bgr: tuple[int, int, int], count: int = 40) -> np.ndarray:
    pixel = cv2.cvtColor(np.uint8([[bgr]]), cv2.COLOR_BGR2LAB).reshape(3).astype(np.float32)
    noise = np.random.default_rng(int(sum(bgr))).normal(0, 3, (count, 3)).astype(np.float32)
    return pixel[None] + noise


class CameraTests(unittest.TestCase):
    def test_known_camera_finds_the_lines_of_a_synthetic_pitch(self) -> None:
        frame, truth = _render(VIEW)
        camera = C.PitchCamera()
        camera.position, camera.pitch = VIEW[:3].copy(), PITCH
        found = camera.fit(frame)
        self.assertIsNotNone(found)
        grid = np.array([[x, y] for x in range(300, 1700, 200) for y in range(500, 1000, 100)], float)
        error = np.hypot(*(apply_h(found, grid) - apply_h(truth, grid)).T)
        self.assertLess(float(np.median(error)), 0.6)

    def test_following_the_camera_keeps_the_fit_while_it_pans(self) -> None:
        camera = C.PitchCamera()
        camera.position, camera.pitch = VIEW[:3].copy(), PITCH
        for step in range(4):
            params = VIEW.copy()
            params[3] += 0.02 * step
            frame, truth = _render(params)
            found = camera.fit(frame)
            self.assertIsNotNone(found)
            grid = np.array([[960.0, 700.0], [500.0, 900.0], [1400.0, 900.0]])
            self.assertLess(float(np.abs(apply_h(found, grid) - apply_h(truth, grid)).max()), 1.0)


class KeypointTests(unittest.TestCase):
    def test_keypoints_project_back_to_their_pitch_spot(self) -> None:
        _frame, truth = _render(VIEW)
        keys = pitch_keypoints(truth, WIDTH, HEIGHT, 1.0)
        self.assertGreaterEqual(len(keys), 12)
        src = np.array([[box.px, box.py] for box in keys])
        dst = np.array([box.pitch_xy for box in keys])
        self.assertLess(float(np.abs(apply_h(truth, src) - dst).max()), 1e-6)
        self.assertTrue(all(0 <= box.px < WIDTH and 0 <= box.py < HEIGHT for box in keys))


class KitTests(unittest.TestCase):
    def test_lone_shirts_become_referee_or_keeper(self) -> None:
        samples: list[Sample] = []
        for frame in range(12):
            for i in range(8):
                samples.append(Sample(_lab((240, 240, 240)), frame, 30.0 + i * 5, (240.0, 240.0, 240.0)))
                samples.append(Sample(_lab((90, 30, 20)), frame, 32.0 + i * 5, (20.0, 30.0, 90.0)))
            samples.append(Sample(_lab((170, 230, 120)), frame, 50.0, (120.0, 230.0, 170.0)))
            samples.append(Sample(_lab((20, 220, 240)), frame, 4.0, (240.0, 220.0, 20.0)))
        model = learn_kits(samples, our_kit="white")
        self.assertIsNotNone(model)
        assert model is not None
        self.assertEqual(model.classify(_lab((170, 230, 120))), ("referee", None))
        self.assertEqual(model.classify(_lab((20, 220, 240))), ("player", None))
        self.assertEqual(model.classify(_lab((240, 240, 240))), ("player", 0))
        self.assertEqual(model.classify(_lab((90, 30, 20))), ("player", 1))


class DetectorTests(unittest.TestCase):
    def test_people_off_the_pitch_and_balls_on_the_penalty_spot_are_dropped(self) -> None:
        frame, truth = _render(VIEW)
        to_image = np.linalg.inv(truth)
        on = apply_h(to_image, np.array([[52.5, 40.0]]))[0]
        off = apply_h(to_image, np.array([[52.5, -12.0]]))[0]
        spot = apply_h(to_image, np.array([[105.0 - 11.0 * 105.0 / PITCH.length, 34.0]]))[0]
        ball = apply_h(to_image, np.array([[60.0, 30.0]]))[0]

        def model(_frame: np.ndarray) -> list[tuple[str, float, float, float, float, float]]:
            return [
                ("person", on[0] - 10, on[1] - 50, on[0] + 10, on[1], 0.9),
                ("person", off[0] - 10, off[1] - 50, off[0] + 10, off[1], 0.9),
                ("sports ball", spot[0] - 3, spot[1] - 6, spot[0] + 3, spot[1], 0.8),
                ("sports ball", ball[0] - 3, ball[1] - 6, ball[0] + 3, ball[1], 0.8),
            ]

        detector = BroadcastDetector(model=model)
        detector.camera.position, detector.camera.pitch = VIEW[:3].copy(), PITCH
        boxes = detector(frame, 0.0)
        people = [box for box in boxes if box.kind in ("player", "referee")]
        balls = [box for box in boxes if box.kind == "ball"]
        self.assertEqual(len(people), 1)
        self.assertEqual(len(balls), 1)
        self.assertAlmostEqual(balls[0].px, float(ball[0]), delta=1.0)
        self.assertGreaterEqual(sum(box.kind == "keypoint" for box in boxes), 12)


def _keypoints(h_img_to_pitch: np.ndarray, t: float) -> list[Box]:
    return pitch_keypoints(h_img_to_pitch, WIDTH, HEIGHT, t)


class PitchLinkTests(unittest.TestCase):
    def test_a_camera_pan_does_not_split_the_player(self) -> None:
        boxes: list[Box] = []
        for step in range(8):
            params = VIEW.copy()
            params[3] += 0.03 * step
            to_image = C.camera_h(params, (WIDTH, HEIGHT), PITCH)
            img_to_pitch = PITCH.to_standard() @ np.linalg.inv(to_image)
            img_to_pitch /= img_to_pitch[2, 2]
            t = round(0.1 * step, 3)
            boxes.extend(_keypoints(img_to_pitch, t))
            foot = apply_h(np.linalg.inv(img_to_pitch), np.array([[50.0 + 0.5 * step, 40.0]]))[0]
            boxes.append(Box(t, "player", float(foot[0]) - 12, float(foot[1]) - 60, 24, 60, team=0, rgb=(240, 240, 240)))
        out = run_span(boxes, start_s=0.0, end_s=0.7, width=WIDTH, height=HEIGHT, fps=10)
        players = [track for track in out["tracks"] if track["role"] == "player"]
        self.assertEqual(len(players), 1)
        placed = [sample for sample in players[0]["samples"] if sample.get("x") is not None and not sample.get("rejected_speed")]
        self.assertEqual(len(placed), 8)
        self.assertAlmostEqual(placed[-1]["x"] * 105.0, 53.5, delta=1.0)

    def test_one_bad_step_does_not_reject_the_rest_of_the_track(self) -> None:
        boxes: list[Box] = []
        _frame, truth = _render(VIEW)
        to_image = np.linalg.inv(truth)
        for step in range(10):
            t = round(0.1 * step, 3)
            boxes.extend(_keypoints(truth, t))
            x = 50.0 + 0.6 * step + (8.0 if step == 3 else 0.0)
            foot = apply_h(to_image, np.array([[x, 40.0]]))[0]
            boxes.append(Box(t, "player", float(foot[0]) - 12, float(foot[1]) - 60, 24, 60, team=0, rgb=(240, 240, 240)))
        out = run_span(boxes, start_s=0.0, end_s=0.9, width=WIDTH, height=HEIGHT, fps=10)
        samples = [sample for track in out["tracks"] if track["role"] == "player" for sample in track["samples"]]
        rejected = [sample for sample in samples if sample.get("rejected_speed")]
        self.assertLessEqual(len(rejected), 1)

    def test_a_short_gap_is_stitched_and_a_doubtful_one_is_not(self) -> None:
        _frame, truth = _render(VIEW)
        to_image = np.linalg.inv(truth)

        def body(t: float, x: float, y: float) -> Box:
            foot = apply_h(to_image, np.array([[x, y]]))[0]
            return Box(t, "player", float(foot[0]) - 12, float(foot[1]) - 60, 24, 60, team=0, rgb=(240, 240, 240))

        clear: list[Box] = []
        doubt: list[Box] = []
        for step in range(50):
            t = round(0.1 * step, 3)
            clear.extend(_keypoints(truth, t))
            doubt.extend(_keypoints(truth, t))
            if step < 10 or step >= 45:
                clear.append(body(t, 40.0 + 0.2 * step, 30.0))
                doubt.append(body(t, 40.0 + 0.2 * step, 30.0))
            if step >= 45:
                doubt.append(body(t, 40.0 + 0.2 * step, 31.5))
        one = run_span(clear, start_s=0.0, end_s=4.9, width=WIDTH, height=HEIGHT, fps=10)
        two = run_span(doubt, start_s=0.0, end_s=4.9, width=WIDTH, height=HEIGHT, fps=10)
        self.assertEqual(sum(track["role"] == "player" for track in one["tracks"]), 1)
        self.assertEqual(sum(track["role"] == "player" for track in two["tracks"]), 3)


class ScoreTests(unittest.TestCase):
    def _doc(self, players: int, seconds: int) -> dict:
        tracks = []
        for i in range(players):
            samples = [{"t": round(0.1 * k, 3), "x": 0.5, "y": 0.5, "px": 0, "py": 0} for k in range(seconds * 10)]
            tracks.append({"id": i + 1, "role": "player", "team": i % 2, "dorsal": None, "samples": samples})
        return {"tracks": tracks, "ball": [], "spans": [{"start_s": 0, "end_s": seconds}]}

    def test_a_clip_is_scored_against_the_players_in_view(self) -> None:
        doc = self._doc(11, 10)
        full = score_document(doc)
        clip = score_document(doc, visible=lambda _second: 11, id_full_s=10.0)
        self.assertAlmostEqual(full["partes"]["jugadores"], 20.0, delta=0.1)
        self.assertAlmostEqual(clip["partes"]["jugadores"], 40.0, delta=0.1)
        self.assertGreater(clip["partes"]["identidad"], 17.0)

    def test_a_player_counts_by_frame_not_by_second(self) -> None:
        doc = self._doc(1, 2)
        doc["tracks"][0]["samples"] = doc["tracks"][0]["samples"][:5] + doc["tracks"][0]["samples"][10:15]
        result = score_document(doc, visible=lambda _second: 1, id_full_s=2.0)
        self.assertAlmostEqual(result["partes"]["jugadores"], 40.0, delta=0.1)
        doc["tracks"].append({"id": 9, "role": "player", "team": 0, "dorsal": None, "samples": [{"t": 0.0, "x": 0.5, "y": 0.5}]})
        crowded = score_document(doc, visible=lambda _second: 2, id_full_s=2.0)
        self.assertLess(crowded["partes"]["jugadores"], 25.0)


if __name__ == "__main__":
    unittest.main()
