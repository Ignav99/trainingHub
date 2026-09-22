from app.services.video_clip_service import clip_copy_cmd, clip_encode_cmd


def test_clip_copy_uses_stream_copy_without_reencode():
    cmd = clip_copy_cmd("https://example/match.mp4", 12.0, 8.5, "/tmp/out.mp4")
    assert cmd[cmd.index("-c") + 1] == "copy"
    assert "-avoid_negative_ts" in cmd
    assert "libx264" not in cmd


def test_clip_encode_fallback_keeps_audio_and_h264():
    cmd = clip_encode_cmd("https://example/match.mp4", 12.0, 8.5, "/tmp/out.mp4")
    assert cmd[cmd.index("-c:v") + 1] == "libx264"
    assert cmd[cmd.index("-c:a") + 1] == "aac"
    assert "copy" not in cmd
