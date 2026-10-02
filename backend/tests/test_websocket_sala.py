import asyncio

from app.api.v1.websocket import ConnectionManager


class FakeWS:
    def __init__(self):
        self.sent = []

    async def send_json(self, msg):
        self.sent.append(msg)


class TestSalaRooms:
    def test_join_dedupes_same_socket(self):
        m = ConnectionManager()
        ws = FakeWS()
        assert m.join_sala(ws, "abc123") == 1
        assert m.join_sala(ws, "abc123") == 1
        assert m.sala_peer_count("abc123") == 1

    def test_guest_pass_accepts_open_video_room(self):
        from app.api.v1.websocket import manager, sala_pass_is_live

        ws = FakeWS()
        manager.join_sala(ws, "vide01")
        try:
            assert sala_pass_is_live("VIDE01") is True
        finally:
            manager.leave_all_salas(ws)

    def test_second_peer_increments(self):
        m = ConnectionManager()
        a, b = FakeWS(), FakeWS()
        assert m.join_sala(a, "zz9k2m") == 1
        assert m.join_sala(b, "zz9k2m") == 2
        assert m.sala_peer_count("ZZ9K2M") == 2

    def test_replay_gives_a_late_tablet_the_deck(self):
        m = ConnectionManager()
        host, tablet = FakeWS(), FakeWS()
        m.join_sala(host, "sala01")
        m.remember_sala_sync("sala01", {
            "type": "sala_sync",
            "session_code": "SALA01",
            "slide": 2,
            "show": {"kind": "plan", "slides": [{"id": "a"}]},
        })
        m.remember_sala_sync("SALA01", {
            "type": "sala_sync",
            "session_code": "SALA01",
            "slide": 4,
        })

        async def run():
            await m.replay_sala_sync(tablet, "sala01")

        asyncio.run(run())
        assert tablet.sent[0]["slide"] == 4
        assert tablet.sent[0]["show"]["kind"] == "plan"
        assert host.sent == []

    def test_broadcast_skips_sender(self):
        m = ConnectionManager()
        a, b = FakeWS(), FakeWS()
        m.join_sala(a, "sala01")
        m.join_sala(b, "sala01")

        async def run():
            await m.broadcast_sala("sala01", {"type": "sala_peer_joined", "peers": 2}, exclude=a)

        asyncio.run(run())
        assert a.sent == []
        assert b.sent == [{"type": "sala_peer_joined", "peers": 2}]


class TestSalaSyncPayload:
    def test_forwards_slide_and_show_for_presentation(self):
        from app.api.v1.websocket import sala_sync_payload

        payload = sala_sync_payload(
            {
                "session_code": "abc123",
                "clip_id": "clip-1",
                "t": 12.5,
                "paused": True,
                "overlay": [],
                "zoom": {"scale": 1, "x": 0, "y": 0},
                "role": "host",
                "slide": 3,
                "show": {"kind": "informe", "slides": []},
                "muted": True,
                "fullscreen": True,
                "seq": 7,
            },
            "user-1",
        )
        assert payload["type"] == "sala_sync"
        assert payload["slide"] == 3
        assert payload["show"]["kind"] == "informe"
        assert payload["clip_id"] == "clip-1"
        assert payload["muted"] is True
        assert payload["fullscreen"] is True
        assert payload["seq"] == 7

    def test_clip_sala_payload_omits_missing_show(self):
        from app.api.v1.websocket import sala_sync_payload

        payload = sala_sync_payload(
            {
                "session_code": "sala01",
                "clip_id": "c1",
                "t": 0,
                "paused": True,
                "overlay": None,
                "zoom": None,
                "role": "tablet",
            },
            "user-2",
        )
        assert "slide" not in payload
        assert "show" not in payload
        assert payload["clip_id"] == "c1"


class TestSalaFramePayload:
    def test_forwards_jpeg_frame(self):
        from app.api.v1.websocket import sala_frame_payload

        payload = sala_frame_payload(
            {"session_code": "vide01", "role": "host", "jpeg": "abc", "t": 1.5, "slide": 0},
            "user-1",
        )
        assert payload is not None
        assert payload["type"] == "sala_frame"
        assert payload["jpeg"] == "abc"
        assert payload["session_code"] == "VIDE01"
        assert payload["t"] == 1.5
        assert payload["slide"] == 0

    def test_drops_empty_or_huge_frame(self):
        from app.api.v1.websocket import FRAME_MAX_CHARS, sala_frame_payload

        assert sala_frame_payload({"jpeg": ""}, "user-1") is None
        assert sala_frame_payload({"jpeg": "a" * (FRAME_MAX_CHARS + 1)}, "user-1") is None
        assert sala_frame_payload({"jpeg": True}, "user-1") is None
