from datetime import datetime, timedelta, timezone

from app.services.revision_service import (
    default_folders_for,
    drive_connected,
    generate_session_code,
    make_fingerprint,
    should_keep_hot,
)


class TestFingerprint:
    def test_includes_name_size_duration(self):
        assert make_fingerprint("partido.mp4", 5_000_000_000, 5400000) == "partido.mp4|5000000000|5400000"

    def test_same_file_same_key(self):
        a = make_fingerprint("J3 vs Rival.mp4", 123, 90_000)
        b = make_fingerprint("J3 vs Rival.mp4", 123, 90_000)
        assert a == b

    def test_different_size_is_new_file(self):
        assert make_fingerprint("a.mp4", 1, 1000) != make_fingerprint("a.mp4", 2, 1000)


class TestSessionCode:
    def test_length_and_charset(self):
        code = generate_session_code()
        assert len(code) == 6
        assert code.isupper()
        assert "O" not in code and "I" not in code and "0" not in code and "1" not in code

    def test_unique_enough(self):
        codes = {generate_session_code() for _ in range(40)}
        assert len(codes) == 40


class TestDefaultFolders:
    def test_partido_has_six_phases(self):
        folders = default_folders_for("partido_post")
        assert len(folders) == 6
        assert folders[0][0] == "ataque_organizado"

    def test_rival_includes_once_probable(self):
        folders = default_folders_for("rival")
        fases = [f[0] for f in folders]
        assert "once_probable" in fases
        assert "transicion_ofensiva" in fases


class TestRetention:
    def test_keep_if_match_still_upcoming(self):
        now = datetime(2026, 9, 9, tzinfo=timezone.utc)
        future = datetime(2026, 9, 20, tzinfo=timezone.utc)
        assert should_keep_hot(future, now) is True

    def test_archive_if_match_already_played(self):
        now = datetime(2026, 9, 9, tzinfo=timezone.utc)
        past = datetime(2026, 8, 1, tzinfo=timezone.utc)
        assert should_keep_hot(past, now) is False

    def test_no_partido_does_not_block_archive(self):
        assert should_keep_hot(None) is False


class TestArchiveJob:
    def test_does_not_delete_without_drive(self):
        from unittest.mock import MagicMock
        from app.services.revision_service import archive_expired_clips

        clip_id = "clip-1"
        pack_id = "pack-1"
        equipo_id = "eq-1"
        org_id = "org-1"

        supabase = MagicMock()
        calls = {"n": 0}

        def make_query(name):
            q = MagicMock()
            q.select.return_value = q
            q.eq.return_value = q
            q.lte.return_value = q
            q.limit.return_value = q
            q.update.return_value = q

            def execute():
                calls["n"] += 1
                if name == "revision_clips" and calls["n"] == 1:
                    return MagicMock(data=[{
                        "id": clip_id,
                        "equipo_id": equipo_id,
                        "storage_path": "x.webm",
                        "url": "http://x",
                        "hot_until": "2020-01-01T00:00:00+00:00",
                        "status": "hot",
                        "pack_id": pack_id,
                    }])
                if name == "revision_packs":
                    return MagicMock(data=[{"id": pack_id, "partido_id": None, "equipo_id": equipo_id}])
                if name == "equipos":
                    return MagicMock(data=[{"id": equipo_id, "organizacion_id": org_id}])
                if name == "organizaciones":
                    return MagicMock(data=[{"id": org_id, "config": {}}])
                return MagicMock(data=[{}])

            q.execute.side_effect = execute
            return q

        supabase.table.side_effect = make_query
        supabase.storage.from_.return_value.remove = MagicMock()

        stats = archive_expired_clips(supabase)
        assert stats["skipped_no_drive"] == 1
        assert stats["archived"] == 0
        supabase.storage.from_.return_value.remove.assert_not_called()


class TestDriveGate:
    def test_not_connected_by_default(self):
        assert drive_connected(None) is False
        assert drive_connected({}) is False
        assert drive_connected({"google_drive": {"connected": False}}) is False

    def test_connected_flag(self):
        assert drive_connected({"google_drive": {"connected": True, "folder_url": "https://drive.google.com"}}) is True
