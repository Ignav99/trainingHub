from app.services.video_room_pass import (
    parse_sala_guest_token,
    sign_video_room,
    video_room_pass_ok,
)


def test_signed_pass_opens_without_a_database_row():
    secret = "test-secret"
    code = "AB23CD"
    room_pass = sign_video_room(code, secret)
    assert video_room_pass_ok(code, room_pass, secret) is True
    assert video_room_pass_ok(code, "nope", secret) is False
    assert video_room_pass_ok(code, None, secret) is False
    assert video_room_pass_ok("ZZZZZZ", room_pass, secret) is False


def test_guest_token_keeps_code_and_pass_apart():
    parsed = parse_sala_guest_token("sala:ab12cd.AbCDef")
    assert parsed == ("AB12CD", "AbCDef")
    assert parse_sala_guest_token("sala:ab12cd") == ("AB12CD", None)
    assert parse_sala_guest_token("jwt.token") is None
