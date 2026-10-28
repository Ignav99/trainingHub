"""El partido se lee solo entre los cuatro pitidos y el JSON se queda en el disco."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from kabine_vision.blobs import detect_blobs, write_fixture
from kabine_vision.library import choose_video, native_picker, program_copy_for, recall_video, remember
from kabine_vision.match import analyze_match, file_summary, ordered_whistles, pitch_check, sidecar_for
from kabine_vision.preview import PreviewError
from kabine_vision.server import start_match_job


class MatchWhistleTests(unittest.TestCase):
    def setUp(self) -> None:
        self._dir = tempfile.TemporaryDirectory()
        self._old = os.environ.get("KABINE_VISION_DIR")
        os.environ["KABINE_VISION_DIR"] = str(Path(self._dir.name) / "programa")

    def tearDown(self) -> None:
        if self._old is None:
            os.environ.pop("KABINE_VISION_DIR", None)
        else:
            os.environ["KABINE_VISION_DIR"] = self._old
        self._dir.cleanup()

    def test_whistles_must_follow_the_match(self) -> None:
        with self.assertRaises(PreviewError):
            ordered_whistles({"inicio_1": 10, "final_1": 8, "inicio_2": 20, "final_partido": 30})

    def test_half_time_is_not_tracked_and_the_file_stays_beside_the_video(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            video = write_fixture(Path(folder) / "partido.avi", frames=20, fps=10)
            doc = analyze_match(
                str(video),
                {"inicio_1": 0.0, "final_1": 0.5, "inicio_2": 1.0, "final_partido": 1.5},
                sample_fps=10,
                detector=detect_blobs,
            )
            stored = sidecar_for(video)
            program = program_copy_for(video)
            self.assertTrue(stored.is_file())
            self.assertTrue(program.is_file())
            self.assertEqual(doc["preview"]["stored_path"], str(stored))
            self.assertEqual(doc["preview"]["program_path"], str(program))
            remembered = recall_video(video.name, video.stat().st_size)
            self.assertEqual(remembered["path"], str(video.resolve()))
            self.assertEqual(doc["preview"]["sample_fps"], 10)
            self.assertEqual(doc["spans"][0]["name"], "primera")
            self.assertEqual(doc["spans"][1]["name"], "segunda")
            times = [sample["t"] for track in doc["tracks"] for sample in track["samples"]]
            self.assertTrue(times)
            self.assertTrue(all(t <= 0.5 or t >= 1.0 for t in times))
            self.assertFalse(any(0.5 < t < 1.0 for t in times))
            ids = [track["id"] for track in doc["tracks"]]
            self.assertEqual(len(ids), len(set(ids)))
            self.assertGreaterEqual(len([track for track in doc["tracks"] if track["role"] == "player"]), 4)

    def test_the_job_finishes_with_the_same_document(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            video = write_fixture(Path(folder) / "partido.avi", frames=20, fps=10)
            status = start_match_job(
                str(video),
                {"inicio_1": 0.0, "final_1": 0.5, "inicio_2": 1.0, "final_partido": 1.5},
                sample_fps=10,
            )
            self.assertEqual(status["status"], "running")
            deadline = time.time() + 20
            done = status
            while time.time() < deadline and done["status"] == "running":
                time.sleep(0.05)
                from kabine_vision.server import _match_status

                done = _match_status(str(video))
            self.assertEqual(done["status"], "done")
            self.assertIn("document", done)
            self.assertEqual(done["document"]["schema"], "kabine.vision.v0")
            self.assertTrue(Path(done["stored_path"]).is_file())
            self.assertTrue(Path(done["document"]["preview"]["program_path"]).is_file())

    def test_the_program_remembers_the_file_and_rejects_a_different_one(self) -> None:
        video = write_fixture(Path(self._dir.name) / "partido.avi", frames=4, fps=10)
        self.assertFalse(recall_video(video.name, video.stat().st_size)["found"])
        remember(video)
        found = recall_video(video.name, video.stat().st_size)
        self.assertEqual(found["path"], str(video.resolve()))
        self.assertFalse(recall_video(video.name, video.stat().st_size + 1)["found"])
        other = write_fixture(Path(self._dir.name) / "otro.avi", frames=8, fps=10)
        self.assertNotEqual(other.stat().st_size, video.stat().st_size)
        with self.assertRaises(PreviewError):
            choose_video(video.name, video.stat().st_size, picker=lambda _name: str(other))

        def cancel(_name: str) -> str:
            raise PreviewError("has cancelado la elección del partido")

        with self.assertRaises(PreviewError):
            choose_video(video.name, video.stat().st_size, picker=cancel)
        chosen = choose_video(video.name, video.stat().st_size, picker=lambda _name: str(video))
        self.assertEqual(chosen["path"], str(video.resolve()))
        if sys.platform != "darwin":
            with self.assertRaises(PreviewError):
                native_picker("partido.mp4")

    def test_a_saved_file_opens_without_reading_the_video_again(self) -> None:
        video = write_fixture(Path(self._dir.name) / "partido.avi", frames=20, fps=10)
        marks = {"inicio_1": 0.0, "final_1": 0.5, "inicio_2": 1.0, "final_partido": 1.5}
        analyze_match(str(video), marks, sample_fps=10, detector=detect_blobs)
        opened = start_match_job(str(video), marks, sample_fps=10)
        self.assertEqual(opened["status"], "done")
        self.assertGreaterEqual(opened["summary"]["players"], 4)
        self.assertGreater(opened["summary"]["samples"], 0)
        self.assertEqual(opened["document"]["schema"], "kabine.vision.v0")
        full = file_summary(json.loads(sidecar_for(video).read_text(encoding="utf-8")), sidecar_for(video))
        self.assertEqual(full["samples"], opened["summary"]["samples"])

    def test_the_pitch_check_is_shorter_than_the_file(self) -> None:
        samples = [{"t": index / 10, "x": 0.2, "y": 0.4} for index in range(5000)]
        doc = {
            "schema": "kabine.vision.v0",
            "tracks": [{"id": 1, "team": 0, "role": "player", "samples": samples}],
            "ball": samples,
            "homography": [{"t": 0, "accepted": False}] * 5000,
            "physical": [{"track_id": 1, "visible_m": 12, "note": "solo lo que se ve"}],
            "preview": {"kept_frames": 5000, "detector": "blobs"},
        }
        view = pitch_check(doc)
        self.assertGreater(file_summary(doc)["samples"], len(view["tracks"][0]["samples"]))
        self.assertLessEqual(len(view["tracks"][0]["samples"]), 1800)
        self.assertEqual(view["preview"]["samples"], 5000)
        self.assertEqual(view["preview"]["homography_accepted"], 0)

    def test_a_failed_program_copy_still_keeps_the_file_beside_the_video(self) -> None:
        blocker = Path(self._dir.name) / "ocupado"
        blocker.write_text("x")
        os.environ["KABINE_VISION_DIR"] = str(blocker / "vision")
        video = write_fixture(Path(self._dir.name) / "partido.avi", frames=20, fps=10)
        doc = analyze_match(
            str(video),
            {"inicio_1": 0.0, "final_1": 0.5, "inicio_2": 1.0, "final_partido": 1.5},
            sample_fps=10,
            detector=detect_blobs,
        )
        self.assertTrue(sidecar_for(video).is_file())
        self.assertIsNone(doc["preview"]["program_path"])
        self.assertGreaterEqual(file_summary(doc, sidecar_for(video))["players"], 4)


if __name__ == "__main__":
    unittest.main()
