from datetime import datetime, timedelta, timezone

import pytest
from unittest.mock import MagicMock, patch

from app.services.revision_service import (
    HOT_DAYS,
    MAX_CLIP_BYTES,
    WARN_DAYS,
    default_folders_for,
    drive_connected,
    drive_ready,
    ensure_video_bucket,
    flatten_pack_graph,
    generate_session_code,
    make_fingerprint,
    pack_expires_at,
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

    def test_expires_thirty_days_after_match(self):
        match = datetime(2026, 8, 10, tzinfo=timezone.utc)
        expires = pack_expires_at(match, created_at=datetime(2026, 8, 11, tzinfo=timezone.utc))
        assert expires == match + timedelta(days=HOT_DAYS)
        assert HOT_DAYS == 30
        assert WARN_DAYS == 7

    def test_expires_thirty_days_from_created_without_match(self):
        created = datetime(2026, 8, 1, tzinfo=timezone.utc)
        assert pack_expires_at(None, created) == created + timedelta(days=30)


class _Chain:
    def __init__(self, db, name):
        self.db = db
        self.name = name
        self._filters = {}
        self._op = "select"
        self._payload = None

    def select(self, *a, **k):
        self._op = "select"
        return self

    def eq(self, k, v):
        self._filters[k] = v
        return self

    def lte(self, k, v):
        self._filters[f"{k}__lte"] = v
        return self

    def limit(self, n):
        return self

    def update(self, payload):
        self._op = "update"
        self._payload = payload
        return self

    def delete(self):
        self._op = "delete"
        return self

    def execute(self):
        rows = list(self.db.data.get(self.name, []))
        for k, v in self._filters.items():
            if k.endswith("__lte"):
                field = k[:-5]
                rows = [r for r in rows if (r.get(field) or "") <= v]
            else:
                rows = [r for r in rows if r.get(k) == v]
        if self._op == "update":
            for r in rows:
                r.update(self._payload)
            self.db.ops.append(("update", self.name, dict(self._payload), dict(self._filters)))
            return MagicMock(data=rows)
        if self._op == "delete":
            remaining = []
            removed = []
            for r in self.db.data.get(self.name, []):
                if all(
                    (r.get(k[:-5]) or "") <= v if k.endswith("__lte") else r.get(k) == v
                    for k, v in self._filters.items()
                ):
                    removed.append(r)
                else:
                    remaining.append(r)
            self.db.data[self.name] = remaining
            self.db.ops.append(("delete", self.name, [x["id"] for r in removed for x in [r]]))
            return MagicMock(data=removed)
        return MagicMock(data=rows)


class _FakeDb:
    def __init__(self, data):
        self.data = data
        self.ops = []
        self.storage = MagicMock()
        self.storage.from_.return_value.remove = MagicMock()

    def table(self, name):
        return _Chain(self, name)


class TestArchiveJob:
    def test_deletes_expired_clip(self):
        from app.services.revision_service import archive_expired_clips

        clip_id = "clip-1"
        pack_id = "pack-1"
        equipo_id = "eq-1"
        supabase = _FakeDb({
            "revision_clips": [{
                "id": clip_id,
                "equipo_id": equipo_id,
                "storage_path": "x.webm",
                "hot_until": "2020-01-31T00:00:00+00:00",
                "status": "hot",
                "pack_id": pack_id,
                "archive_warning": None,
                "created_at": "2020-01-01T00:00:00+00:00",
            }],
            "revision_packs": [{"id": pack_id, "partido_id": None, "equipo_id": equipo_id, "created_at": "2020-01-01T00:00:00+00:00"}],
        })

        with patch("app.services.r2_storage.r2_enabled", return_value=False):
            stats = archive_expired_clips(supabase, now=datetime(2026, 9, 10, tzinfo=timezone.utc))
        assert stats["archived"] == 1
        assert stats["packs_purged"] == 1
        assert stats["skipped_future_match"] == 0
        supabase.storage.from_.return_value.remove.assert_called_once_with(["x.webm"])
        assert supabase.data["revision_clips"] == []

    def test_warns_pack_seven_days_before_without_deleting(self):
        from app.services.revision_service import archive_expired_clips

        now = datetime(2026, 9, 10, tzinfo=timezone.utc)
        created = now - timedelta(days=24)
        pack_id = "pack-w"
        supabase = _FakeDb({
            "revision_clips": [{
                "id": "c1",
                "equipo_id": "eq-1",
                "storage_path": "a.webm",
                "hot_until": (created + timedelta(days=30)).isoformat(),
                "status": "hot",
                "pack_id": pack_id,
                "archive_warning": None,
                "created_at": created.isoformat(),
            }, {
                "id": "c2",
                "equipo_id": "eq-1",
                "storage_path": "b.webm",
                "hot_until": (created + timedelta(days=30)).isoformat(),
                "status": "hot",
                "pack_id": pack_id,
                "archive_warning": None,
                "created_at": created.isoformat(),
            }],
            "revision_packs": [{"id": pack_id, "partido_id": None, "equipo_id": "eq-1", "created_at": created.isoformat()}],
        })
        with patch("app.services.revision_service._warn_pack_staff") as warn:
            stats = archive_expired_clips(supabase, now=now)
        assert stats["archived"] == 0
        assert stats["warned"] == 2
        assert stats["packs_warned"] == 1
        warn.assert_called_once()
        assert all(c.get("archive_warning") for c in supabase.data["revision_clips"])
        supabase.storage.from_.return_value.remove.assert_not_called()

        stats2 = archive_expired_clips(supabase, now=now)
        assert stats2["packs_warned"] == 0
        assert stats2["warned"] == 2

    def test_extends_when_match_not_played(self):
        from app.services.revision_service import archive_expired_clips

        now = datetime(2026, 9, 10, tzinfo=timezone.utc)
        future = datetime(2026, 9, 20, tzinfo=timezone.utc)
        supabase = _FakeDb({
            "revision_clips": [{
                "id": "c1",
                "equipo_id": "eq-1",
                "storage_path": "a.webm",
                "hot_until": "2026-09-09T00:00:00+00:00",
                "status": "hot",
                "pack_id": "p1",
                "archive_warning": "old",
                "created_at": "2026-08-01T00:00:00+00:00",
            }],
            "revision_packs": [{"id": "p1", "partido_id": "m1", "equipo_id": "eq-1", "created_at": "2026-08-01T00:00:00+00:00"}],
            "partidos": [{"id": "m1", "fecha": future.isoformat()}],
        })
        stats = archive_expired_clips(supabase, now=now)
        assert stats["archived"] == 0
        assert stats["skipped_future_match"] == 1
        assert supabase.data["revision_clips"][0]["archive_warning"] is None
        assert supabase.data["revision_clips"][0]["hot_until"].startswith("2026-10-20")

    def test_purges_whole_pack_together(self):
        from app.services.revision_service import archive_expired_clips

        now = datetime(2026, 9, 10, tzinfo=timezone.utc)
        match = datetime(2026, 8, 1, tzinfo=timezone.utc)
        supabase = _FakeDb({
            "revision_clips": [
                {
                    "id": "c1",
                    "equipo_id": "eq-1",
                    "storage_path": "a.webm",
                    "hot_until": "2026-09-20T00:00:00+00:00",
                    "status": "hot",
                    "pack_id": "p1",
                    "archive_warning": "warn",
                    "created_at": "2026-08-02T00:00:00+00:00",
                },
                {
                    "id": "c2",
                    "equipo_id": "eq-1",
                    "storage_path": "b.webm",
                    "hot_until": "2026-09-25T00:00:00+00:00",
                    "status": "hot",
                    "pack_id": "p1",
                    "archive_warning": "warn",
                    "created_at": "2026-08-03T00:00:00+00:00",
                },
            ],
            "revision_packs": [{"id": "p1", "partido_id": "m1", "equipo_id": "eq-1", "created_at": "2026-08-02T00:00:00+00:00"}],
            "partidos": [{"id": "m1", "fecha": match.isoformat()}],
        })
        with patch("app.services.r2_storage.r2_enabled", return_value=False):
            stats = archive_expired_clips(supabase, now=now)
        assert stats["archived"] == 2
        assert stats["packs_purged"] == 1
        assert supabase.data["revision_clips"] == []


class TestDriveGate:
    def test_not_connected_by_default(self):
        assert drive_connected(None) is False
        assert drive_connected({}) is False
        assert drive_connected({"google_drive": {"connected": False}}) is False

    def test_connected_flag(self):
        assert drive_connected({"google_drive": {"connected": True, "folder_url": "https://drive.google.com"}}) is True

    def test_drive_ready_needs_url(self):
        assert drive_ready({"google_drive": {"connected": True}}) is False
        assert drive_ready({"google_drive": {"connected": True, "folder_url": "https://drive.google.com/drive/folders/x"}}) is True


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
        assert "/packs/{pack_id}/purge" in text
        assert "NamedTemporaryFile" in text
        assert "presign_put" in text
        assert "r2_enabled" in text
        assert "pack_retention_payload" in text


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
            with patch("app.api.v1.revision.r2_enabled", return_value=False):
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
    async def test_upload_url_uses_r2_when_configured(self):
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
        auth = MagicMock()
        auth.user_id = "user-1"
        signed = "https://acc.r2.cloudflarestorage.com/revision-clips/eq/pk/clip.webm?X-Amz-Signature=abc"
        with patch("app.api.v1.revision.get_supabase", return_value=supabase):
            with patch("app.api.v1.revision.r2_enabled", return_value=True):
                with patch("app.api.v1.revision.presign_put", return_value=signed) as presign:
                    result = await create_clip_upload_url(
                        ClipUploadUrlRequest(
                            pack_id=pack,
                            equipo_id=equipo,
                            filename="clip.webm",
                            size_bytes=87 * 1024 * 1024,
                            mime_type="video/webm",
                        ),
                        auth=auth,
                    )

        assert result["storage"] == "r2"
        assert result["signed_url"] == signed
        assert result["path"].startswith(f"{equipo}/{pack}/")
        presign.assert_called_once()
        supabase.storage.from_.return_value.create_signed_upload_url.assert_not_called()

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


class TestSalaSync:
    def test_forwards_zoom_payload(self):
        from pathlib import Path
        src = Path(__file__).resolve().parents[1] / "app" / "api" / "v1" / "websocket.py"
        text = src.read_text()
        assert '"zoom": data.get("zoom")' in text
        assert '"overlay": data.get("overlay")' in text
        assert '"muted": data.get("muted")' in text
        assert '"fullscreen": data.get("fullscreen")' in text

    def test_player_exposes_jog_and_zoom(self):
        from pathlib import Path
        root = Path(__file__).resolve().parents[2]
        player = (root / "frontend/src/components/video-analyzer/VideoPlayer.tsx").read_text()
        sala = (root / "frontend/src/components/revision/SalaStage.tsx").read_text()
        chrome = (root / "frontend/src/components/revision/salaChrome.tsx").read_text()
        presentacion = (root / "frontend/src/components/revision/PresentacionSala.tsx").read_text()
        assert "frameStep:" in player
        assert "seekBy:" in player
        assert "contentTransform" in player
        chrome_src = sala + chrome + presentacion
        assert "Repetir" in chrome_src
        assert "Acercar" in chrome_src
        assert "Rebobinar" in chrome_src
        assert "Original" in chrome_src
        assert "SalaReviewBar" in sala
        assert "SalaReviewBar" in presentacion
        assert "presenterEmbed" in sala
        assert "SalaFloatingChrome" in sala
        assert "SalaFloatingChrome" in presentacion
        assert 'data-testid="sala-floating-chrome"' in chrome
        assert "overflow-hidden" in sala
        assert "z-50" in chrome
        assert "playbackMuted" in sala
        assert "playbackMuted" in presentacion
        assert "onMutedChange" in sala
        assert "onMutedChange" in presentacion
        assert "sala-video-fullscreen" in chrome
        assert "video-mute-toggle" in player
        assert "video-fullscreen-toggle" in player

    def test_shared_player_has_seek_bar_and_hold_rewind(self):
        from pathlib import Path
        root = Path(__file__).resolve().parents[2]
        player = (root / "frontend/src/components/video-analyzer/VideoPlayer.tsx").read_text()
        scout = (root / "frontend/src/components/microciclos/RivalScout.tsx").read_text()
        plan = (root / "frontend/src/components/microciclos/PlanPartido.tsx").read_text()
        library = (root / "frontend/src/components/revision/RevisionLibrary.tsx").read_text()
        sala = (root / "frontend/src/components/revision/SalaStage.tsx").read_text()
        section = (root / "frontend/src/components/partidos/VideoSection.tsx").read_text()
        organizer = (root / "frontend/src/components/video-analyzer/windows/OrganizerWindow.tsx").read_text()
        studio = (root / "frontend/src/components/video-analyzer/windows/StudioWindow.tsx").read_text()
        assert 'data-testid="video-seek-bar"' in player
        assert "Mantén pulsado para rebobinar" in player
        assert "startHoldRewind" in player
        assert "VIDEO_PLAYER_CHROME_CLASS" in player
        assert "VIDEO_PLAYER_CHROME_CLASS" in sala
        assert "<video" not in section
        assert "VideoPlayer" in section
        assert "VideoPlayer" in scout
        assert "VideoPlayer" in plan
        assert "VideoPlayer" in library
        assert "VideoPlayer" in organizer
        assert "Mini scrub bar" not in studio

