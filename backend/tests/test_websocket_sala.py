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

    def test_second_peer_increments(self):
        m = ConnectionManager()
        a, b = FakeWS(), FakeWS()
        assert m.join_sala(a, "zz9k2m") == 1
        assert m.join_sala(b, "zz9k2m") == 2
        assert m.sala_peer_count("ZZ9K2M") == 2

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
