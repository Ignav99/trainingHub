"""El partido se lee solo entre los cuatro pitidos y el JSON se queda en el disco."""

from __future__ import annotations

import sys
import tempfile
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from kabine_vision.blobs import detect_blobs, write_fixture
from kabine_vision.match import analyze_match, ordered_whistles, sidecar_for
from kabine_vision.preview import PreviewError
from kabine_vision.server import start_match_job


class MatchWhistleTests(unittest.TestCase):
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
            self.assertTrue(stored.is_file())
            self.assertEqual(doc["preview"]["stored_path"], str(stored))
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


if __name__ == "__main__":
    unittest.main()
