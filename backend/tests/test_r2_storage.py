from unittest.mock import MagicMock, patch

from app.services.r2_storage import presign_get, presign_put, public_url, r2_enabled


def _settings(**kwargs):
    s = MagicMock()
    s.R2_ACCOUNT_ID = "accid"
    s.R2_ACCESS_KEY_ID = "AKIAEXAMPLE"
    s.R2_SECRET_ACCESS_KEY = "secret"
    s.R2_BUCKET = "revision-clips"
    s.R2_PUBLIC_BASE_URL = "https://pub.example.com"
    for k, v in kwargs.items():
        setattr(s, k, v)
    return s


class TestR2Enabled:
    def test_false_without_keys(self):
        with patch("app.services.r2_storage.get_settings", return_value=_settings(
            R2_ACCOUNT_ID=None, R2_ACCESS_KEY_ID=None, R2_SECRET_ACCESS_KEY=None, R2_PUBLIC_BASE_URL=None,
        )):
            assert r2_enabled() is False

    def test_true_when_all_set(self):
        with patch("app.services.r2_storage.get_settings", return_value=_settings()):
            assert r2_enabled() is True

    def test_cfut_token_is_not_access_key(self):
        from app.services.r2_storage import r2_config_error
        with patch("app.services.r2_storage.get_settings", return_value=_settings(
            R2_ACCESS_KEY_ID="cfut_not_an_s3_access_key_id",
        )):
            err = r2_config_error()
            assert err is not None
            assert "cfut_" in err


class TestPresignPut:
    def test_url_has_signature_and_bucket_key(self):
        with patch("app.services.r2_storage.get_settings", return_value=_settings()):
            url = presign_put("eq/pk/clip.webm", "video/webm")
        assert url.startswith("https://accid.r2.cloudflarestorage.com/revision-clips/eq/pk/clip.webm?")
        assert "X-Amz-Signature=" in url
        assert "X-Amz-Algorithm=AWS4-HMAC-SHA256" in url
        assert "X-Amz-SignedHeaders=host" in url
        assert "UNSIGNED" not in url.split("?")[0]

    def test_public_url_joins_base(self):
        with patch("app.services.r2_storage.get_settings", return_value=_settings()):
            assert public_url("eq/pk/a.webm") == "https://pub.example.com/eq/pk/a.webm"

    def test_presign_get_is_signed_get(self):
        with patch("app.services.r2_storage.get_settings", return_value=_settings()):
            url = presign_get("eq/pk/clip.webm")
        assert url.startswith("https://accid.r2.cloudflarestorage.com/revision-clips/eq/pk/clip.webm?")
        assert url.split("?")[0].endswith("/clip.webm")
        assert "X-Amz-Signature=" in url
        canonical = url.split("?")[0]
        assert "UNSIGNED" not in canonical


class TestR2SettingsStrip:
    def test_secret_newline_is_stripped(self):
        from app.config import Settings

        s = Settings(
            SUPABASE_URL="https://example.supabase.co",
            SUPABASE_ANON_KEY="anon",
            SUPABASE_SERVICE_ROLE_KEY="svc",
            SECRET_KEY="secret",
            R2_ACCOUNT_ID=" accid \n",
            R2_ACCESS_KEY_ID="AKIAEXAMPLE",
            R2_SECRET_ACCESS_KEY="deadbeef\n",
            R2_BUCKET="revision-clips",
            R2_PUBLIC_BASE_URL="https://pub.example.com/",
        )
        assert s.R2_SECRET_ACCESS_KEY == "deadbeef"
        assert s.R2_ACCOUNT_ID == "accid"
