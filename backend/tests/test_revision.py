from datetime import datetime, timedelta, timezone

import pytest

from app.services.revision_service import (
    MAX_CLIP_BYTES,
    default_folders_for,
    drive_connected,
    ensure_video_bucket,
    flatten_pack_graph,
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


class TestClipUploadHelpers:
    def test_sanitize_replaces_spaces(self):
        from app.services.revision_service import sanitize_clip_filename
        assert sanitize_clip_filename("gol 1.mp4") == "gol_1.mp4"

    def test_path_includes_equipo_and_pack(self):
        from app.services.revision_service import make_clip_storage_path
        path = make_clip_storage_path("eq-1", "pack-2", "a.mp4", now_ms=99)
        assert path == "eq-1/pack-2/99_a.mp4"

    def test_rejects_foreign_or_traversal_path(self):
        from app.services.revision_service import is_allowed_clip_path
        assert is_allowed_clip_path("eq/pk/1_a.mp4", "eq", "pk") is True
        assert is_allowed_clip_path("other/pk/1_a.mp4", "eq", "pk") is False
        assert is_allowed_clip_path("eq/pk/../secret.mp4", "eq", "pk") is False

    def test_strip_bucket_prefix(self):
        from app.services.revision_service import strip_bucket_prefix
        assert strip_bucket_prefix("revision-clips/eq/a.webm") == "eq/a.webm"
        assert strip_bucket_prefix("eq/a.webm") == "eq/a.webm"

    def test_signed_url_relative_becomes_absolute(self):
        from app.services.revision_service import normalize_signed_upload_url
        out = normalize_signed_upload_url(
            {"url": "/object/upload/sign/revision-clips/eq/a", "token": "tok"},
            "https://proj.supabase.co",
            "eq/a",
        )
        assert out["signed_url"].startswith("https://proj.supabase.co/storage/v1/object/upload/sign/")
        assert "token=tok" in out["signed_url"]
        assert out["path"] == "eq/a"

    def test_signed_url_already_absolute(self):
        from app.services.revision_service import normalize_signed_upload_url
        out = normalize_signed_upload_url(
            {
                "signed_url": "https://proj.supabase.co/storage/v1/object/upload/sign/x?token=abc",
                "token": "tok",
                "path": "revision-clips/eq/pk/clip.webm",
            },
            "https://proj.supabase.co",
            "eq/pk/clip.webm",
        )
        assert out["signed_url"].startswith("https://")
        assert out["path"] == "eq/pk/clip.webm"

    def test_mime_from_name_and_rejects_images(self):
        from app.services.revision_service import normalize_clip_mime
        assert normalize_clip_mime("", "clip.mp4") == "video/mp4"
        assert normalize_clip_mime("application/octet-stream", "a.webm") == "video/webm"
        try:
            normalize_clip_mime("image/png", "a.png")
            raise AssertionError("expected ValueError")
        except ValueError:
            pass

    def test_upload_route_does_not_join_file_in_memory(self):
        from pathlib import Path
        src = Path(__file__).resolve().parents[1] / "app" / "api" / "v1" / "revision.py"
        text = src.read_text()
        assert 'b"".join' not in text
        assert "create_signed_upload_url" in text
        assert "/clips/upload-url" in text
        assert "NamedTemporaryFile" in text


class TestClipUploadEndpoints:
    @pytest.fixture(autouse=True)
    def _need_api_stack(self):
        pytest.importorskip("fastapi")
        pytest.importorskip("supabase")

    @pytest.mark.asyncio
    async def test_upload_url_rejects_oversize_before_storage(self):
        from unittest.mock import MagicMock, patch
        from uuid import uuid4

        from fastapi import HTTPException

        from app.api.v1.revision import create_clip_upload_url
        from app.models.revision import ClipUploadUrlRequest

        auth = MagicMock()
        auth.user_id = "user-1"
        with patch("app.api.v1.revision.get_supabase") as get_sb:
            with pytest.raises(HTTPException) as err:
                await create_clip_upload_url(
                    ClipUploadUrlRequest(
                        pack_id=uuid4(),
                        equipo_id=uuid4(),
                        filename="clip.webm",
                        size_bytes=201 * 1024 * 1024,
                        mime_type="video/webm",
                    ),
                    auth=auth,
                )
        assert err.value.status_code == 400
        get_sb.assert_not_called()

    @pytest.mark.asyncio
    async def test_upload_url_returns_signed_url_without_uploading_bytes(self):
        from unittest.mock import MagicMock, patch
        from uuid import uuid4

        from app.api.v1.revision import create_clip_upload_url
        from app.models.revision import ClipUploadUrlRequest

        equipo = uuid4()
        pack = uuid4()
        supabase = MagicMock()
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain

        def table(name):
            if name == "equipos":
                chain.execute.return_value = MagicMock(data=[{"id": str(equipo), "organizacion_id": "org"}])
            elif name == "revision_packs":
                chain.execute.return_value = MagicMock(data=[{"id": str(pack), "equipo_id": str(equipo)}])
            return chain

        supabase.table.side_effect = table
        supabase.storage.get_bucket.return_value = {"id": "revision-clips"}
        supabase.storage.from_.return_value.create_signed_upload_url.return_value = {
            "signed_url": "https://proj.supabase.co/storage/v1/object/upload/sign/x?token=abc",
            "token": "abc",
            "path": f"{equipo}/{pack}/1_clip.webm",
        }

        auth = MagicMock()
        auth.user_id = "user-1"
        with patch("app.api.v1.revision.get_supabase", return_value=supabase):
            result = await create_clip_upload_url(
                ClipUploadUrlRequest(
                    pack_id=pack,
                    equipo_id=equipo,
                    filename="clip.webm",
                    size_bytes=5000,
                    mime_type="video/webm",
                ),
                auth=auth,
            )

        assert result["signed_url"].startswith("https://")
        assert result["path"].startswith(f"{equipo}/{pack}/")
        supabase.storage.from_.return_value.upload.assert_not_called()

    @pytest.mark.asyncio
    async def test_confirm_rejects_path_from_another_team(self):
        from unittest.mock import MagicMock, patch
        from uuid import uuid4

        from fastapi import HTTPException

        from app.api.v1.revision import confirm_clip_upload
        from app.models.revision import ClipConfirmRequest

        auth = MagicMock()
        auth.user_id = "user-1"
        with patch("app.api.v1.revision.get_supabase") as get_sb:
            with pytest.raises(HTTPException) as err:
                await confirm_clip_upload(
                    ClipConfirmRequest(
                        pack_id=uuid4(),
                        equipo_id=uuid4(),
                        storage_path="other-team/pack/clip.webm",
                        titulo="Gol",
                        size_bytes=5000,
                        mime_type="video/webm",
                    ),
                    auth=auth,
                )
        assert err.value.status_code == 400
        get_sb.assert_not_called()


class TestFlattenPackGraph:
    def test_splits_nested_clips_and_links(self):
        flat = flatten_pack_graph({
            "id": "pack-1",
            "revision_folders": [
                {"id": "f2", "orden": 1, "nombre": "Defensa"},
                {"id": "f1", "orden": 0, "nombre": "Ataque"},
            ],
            "revision_clips": [
                {
                    "id": "c1",
                    "titulo": "Gol",
                    "created_at": "2026-09-09T10:00:00Z",
                    "revision_clip_links": [
                        {"id": "l1", "clip_id": "c1", "folder_id": "f1"},
                    ],
                },
                {
                    "id": "c2",
                    "titulo": "Pérdida",
                    "created_at": "2026-09-09T11:00:00Z",
                    "revision_clip_links": [],
                },
            ],
        })
        assert "revision_clips" not in flat
        assert [f["id"] for f in flat["folders"]] == ["f1", "f2"]
        assert [c["id"] for c in flat["clips"]] == ["c2", "c1"]
        assert "revision_clip_links" not in flat["clips"][0]
        assert flat["links"] == [{"id": "l1", "clip_id": "c1", "folder_id": "f1"}]

    def test_empty_graph(self):
        flat = flatten_pack_graph({"id": "pack-2"})
        assert flat["folders"] == []
        assert flat["clips"] == []
        assert flat["links"] == []


class TestEnsureVideoBucket:
    def test_raises_limit_on_existing_50mb_bucket(self):
        from unittest.mock import MagicMock

        supabase = MagicMock()
        supabase.storage.get_bucket.return_value = {"id": "revision-clips", "file_size_limit": 50 * 1024 * 1024}
        ensure_video_bucket(supabase)
        supabase.storage.update_bucket.assert_called_once_with(
            "revision-clips",
            {"public": True, "file_size_limit": MAX_CLIP_BYTES},
        )
        supabase.storage.create_bucket.assert_not_called()

    def test_skips_update_when_already_200mb(self):
        from unittest.mock import MagicMock

        supabase = MagicMock()
        supabase.storage.get_bucket.return_value = {"id": "revision-clips", "file_size_limit": MAX_CLIP_BYTES}
        ensure_video_bucket(supabase)
        supabase.storage.update_bucket.assert_not_called()

    def test_creates_bucket_when_missing(self):
        from unittest.mock import MagicMock

        supabase = MagicMock()
        supabase.storage.get_bucket.side_effect = Exception("not found")
        ensure_video_bucket(supabase)
        supabase.storage.create_bucket.assert_called_once_with(
            "revision-clips",
            options={"public": True, "file_size_limit": MAX_CLIP_BYTES},
        )
