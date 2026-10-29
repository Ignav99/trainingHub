"""El ruido de un partido de noche no puede colarse como tracking."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from kabine_vision.field import detect_field, write_noise_fixture
from kabine_vision.homography import PITCH_LENGTH_M, PITCH_WIDTH_M, homography_step_is_calm
from kabine_vision.match import analyze_match
from kabine_vision.pipeline import run_span
from kabine_vision.tracking import Box, Track, vote_team

KITS = {"ours": "#f5f5f5", "rival": "#1e28b4"}
ROSTER = {"ours": [7, 8], "rival": [4, 5]}


def _corners(width: float, height: float, t: float) -> list[Box]:
    image = ((40.0, 30.0), (width - 40.0, 30.0), (40.0, height - 30.0), (width - 40.0, height - 30.0))
    pitch = ((0.0, 0.0), (PITCH_LENGTH_M, 0.0), (0.0, PITCH_WIDTH_M), (PITCH_LENGTH_M, PITCH_WIDTH_M))
    return [Box(t, "keypoint", x, y, 1, 1, pitch_xy=xy) for (x, y), xy in zip(image, pitch)]


class StableReadingTests(unittest.TestCase):
    def test_one_odd_frame_does_not_change_the_team(self) -> None:
        track = Track(id=1, kind="player", role="player", team=0)
        vote_team(track, 0)
        vote_team(track, 0)
        vote_team(track, 1)
        self.assertEqual(track.team, 0)

    def test_a_homography_that_teleports_the_pitch_is_dropped(self) -> None:
        width, height = 640.0, 360.0
        calm = _corners(width, height, 0.0) + _corners(width, height, 0.1)
        player = [
            Box(0.0, "player", 200, 120, 30, 60, team=0),
            Box(0.1, "player", 204, 120, 30, 60, team=0),
            Box(0.2, "player", 208, 120, 30, 60, team=0),
        ]
        jumped = [
            Box(0.2, "keypoint", 40, 30, 1, 1, pitch_xy=(PITCH_LENGTH_M, PITCH_WIDTH_M)),
            Box(0.2, "keypoint", width - 40, 30, 1, 1, pitch_xy=(0.0, 0.0)),
            Box(0.2, "keypoint", 40, height - 30, 1, 1, pitch_xy=(PITCH_LENGTH_M, 0.0)),
            Box(0.2, "keypoint", width - 40, height - 30, 1, 1, pitch_xy=(0.0, PITCH_WIDTH_M)),
        ]
        out = run_span(calm + player + jumped, start_s=0.0, end_s=0.2, width=width, height=height, fps=10)
        accepted = [row for row in out["homography"] if row["accepted"]]
        self.assertEqual(len(accepted), 2)
        self.assertTrue(homography_step_is_calm(
            np.array(accepted[0]["H"], dtype=float).reshape(3, 3),
            np.array(accepted[1]["H"], dtype=float).reshape(3, 3),
            width,
            height,
        ))

    def test_a_ball_that_crosses_the_pitch_in_one_frame_is_dropped(self) -> None:
        width, height = 640.0, 360.0
        boxes: list[Box] = []
        for index, x in enumerate((80.0, 520.0, 90.0, 500.0)):
            t = index / 10
            boxes.extend(_corners(width, height, t))
            boxes.append(Box(t, "ball", x, 180, 1, 1))
        out = run_span(boxes, start_s=0.0, end_s=0.3, width=width, height=height, fps=10)
        moving = [row for row in out["ball"] if not row["held"]]
        self.assertEqual(len(moving), 0)
        for prev, row in zip(moving, moving[1:]):
            dist = ((row["x"] - prev["x"]) * PITCH_LENGTH_M) ** 2 + ((row["y"] - prev["y"]) * PITCH_WIDTH_M) ** 2
            speed = dist ** 0.5 / (row["t"] - prev["t"])
            self.assertLessEqual(speed, 40.0)

    def test_the_pitch_is_not_kept_after_the_camera_has_moved_on(self) -> None:
        width, height = 640.0, 360.0
        boxes = _corners(width, height, 0.0) + _corners(width, height, 0.1)
        boxes.append(Box(0.0, "player", 200, 140, 28, 56, team=0))
        boxes.append(Box(1.2, "player", 210, 140, 28, 56, team=0))
        boxes.append(Box(4.0, "player", 210, 140, 28, 56, team=0))
        out = run_span(boxes, start_s=0.0, end_s=4.0, width=width, height=height, fps=10)
        held = [sample for track in out["tracks"] for sample in track["samples"] if sample["t"] == 1.2]
        late = [sample for track in out["tracks"] for sample in track["samples"] if sample["t"] >= 4.0]
        self.assertTrue(held and held[0].get("x") is not None)
        self.assertTrue(late)
        self.assertTrue(all(sample.get("x") is None for sample in late))

    def test_a_blink_does_not_split_the_player(self) -> None:
        width, height = 640.0, 360.0
        boxes: list[Box] = []
        for t, x in ((0.0, 180.0), (0.1, 184.0), (0.3, 192.0), (0.4, 196.0)):
            boxes.extend(_corners(width, height, t))
            boxes.append(Box(t, "player", x, 140, 28, 64, team=0, rgb=(240, 240, 240)))
        out = run_span(boxes, start_s=0.0, end_s=0.4, width=width, height=height, fps=10)
        players = [track for track in out["tracks"] if track["role"] == "player"]
        self.assertEqual(len(players), 1)
        self.assertGreaterEqual(len(players[0]["samples"]), 4)

    def test_a_smooth_ball_stays_and_an_outside_one_does_not(self) -> None:
        width, height = 640.0, 360.0
        boxes: list[Box] = []
        for index in range(6):
            t = index / 10
            boxes.extend(_corners(width, height, t))
            boxes.append(Box(t, "ball", 300 + index * 4, 180, 1, 1))
        kept = run_span(boxes, start_s=0.0, end_s=0.5, width=width, height=height, fps=10)
        moving = [row for row in kept["ball"] if not row["held"]]
        self.assertGreaterEqual(len(moving), 4)
        self.assertTrue(all(0 <= row["x"] <= 1 and 0 <= row["y"] <= 1 for row in moving))
        outside: list[Box] = []
        for index in range(6):
            t = index / 10
            outside.extend(_corners(width, height, t))
            outside.append(Box(t, "ball", 4, 4, 1, 1))
        dropped = run_span(outside, start_s=0.0, end_s=0.5, width=width, height=height, fps=10)
        self.assertEqual(dropped["ball"], [])

    def test_boards_and_jumping_dots_are_not_the_match(self) -> None:
        marks = {"inicio_1": 0.0, "final_1": 0.9, "inicio_2": 1.2, "final_partido": 2.1}
        with tempfile.TemporaryDirectory() as folder:
            video = write_noise_fixture(Path(folder) / "ruido.avi", frames=24, fps=10)

            def detector(frame, t):
                return detect_field(frame, t, kits=KITS, roster=ROSTER)

            doc = analyze_match(
                str(video),
                marks,
                sample_fps=10,
                detector=detector,
                kits=KITS,
                roster=ROSTER,
                detector_name="field",
            )
        metrics = doc["metrics"]
        players = [track for track in doc["tracks"] if track["role"] == "player"]
        longest = max(len(track["samples"]) for track in players)
        self.assertLessEqual(metrics["max_players_in_frame"], 4)
        self.assertGreaterEqual(longest, 8)
        self.assertEqual(metrics["team_coverage"], 1)
        self.assertLess(len(doc["ball"]), 8)
        for prev, row in zip(doc["ball"], doc["ball"][1:]):
            dt = row["t"] - prev["t"]
            if dt <= 0 or dt > 0.25:
                continue
            dist = ((row["x"] - prev["x"]) * PITCH_LENGTH_M) ** 2 + ((row["y"] - prev["y"]) * PITCH_WIDTH_M) ** 2
            self.assertLessEqual(dist ** 0.5 / dt, 40.0)


if __name__ == "__main__":
    unittest.main()
