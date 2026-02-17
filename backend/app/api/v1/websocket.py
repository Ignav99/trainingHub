"""
TrainingHub Pro - WebSocket Manager
Real-time notifications and team chat via WebSocket.
"""

import json
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.database import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Connection Manager ============

class ConnectionManager:
    """
    Manages WebSocket connections organized by user and team.

    Connections are indexed by:
    - user_id: for personal notifications
    - team_id: for team chat broadcasts
    """

    def __init__(self):
        # user_id -> list of WebSocket connections (user can have multiple tabs)
        self.user_connections: dict[str, list[WebSocket]] = {}
        # team_id -> dict of user_id -> WebSocket
        self.team_connections: dict[str, dict[str, WebSocket]] = {}

    async def connect_user(self, websocket: WebSocket, user_id: str, team_id: Optional[str] = None):
        """Accept and register a user's WebSocket connection."""
        await websocket.accept()

        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)

        if team_id:
            if team_id not in self.team_connections:
                self.team_connections[team_id] = {}
            self.team_connections[team_id][user_id] = websocket

        logger.info(f"WebSocket connected: user={user_id} team={team_id}")

    def disconnect_user(self, websocket: WebSocket, user_id: str, team_id: Optional[str] = None):
        """Remove a user's WebSocket connection."""
        if user_id in self.user_connections:
            self.user_connections[user_id] = [
                ws for ws in self.user_connections[user_id] if ws != websocket
            ]
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

        if team_id and team_id in self.team_connections:
            self.team_connections[team_id].pop(user_id, None)
            if not self.team_connections[team_id]:
                del self.team_connections[team_id]

        logger.info(f"WebSocket disconnected: user={user_id}")

    async def send_to_user(self, user_id: str, message: dict):
        """Send a message to all connections of a specific user."""
        connections = self.user_connections.get(user_id, [])
        disconnected = []

        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(ws)

        # Clean up dead connections
        for ws in disconnected:
            self.user_connections[user_id] = [
                w for w in self.user_connections.get(user_id, []) if w != ws
            ]

    async def broadcast_to_team(self, team_id: str, message: dict, exclude_user: Optional[str] = None):
        """Broadcast a message to all connected users of a team."""
        connections = self.team_connections.get(team_id, {})
        disconnected = []

        for uid, ws in connections.items():
            if uid == exclude_user:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(uid)

        for uid in disconnected:
            self.team_connections.get(team_id, {}).pop(uid, None)

    def get_online_users(self, team_id: str) -> list[str]:
        """Get list of online user IDs for a team."""
        return list(self.team_connections.get(team_id, {}).keys())


# Global manager instance
manager = ConnectionManager()


# ============ Auth Helper ============

async def _authenticate_ws(token: str) -> Optional[dict]:
    """
    Verify JWT token for WebSocket connection.
    Uses Supabase auth (same mechanism as REST endpoints).
    Returns user data or None if invalid.
    """
    try:
        supabase = get_supabase()

        # Verify token with Supabase
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return None

        user_id = str(user_response.user.id)

        # Get user data from our table
        user = supabase.table("usuarios").select(
            "id, nombre, organizacion_id"
        ).eq("id", user_id).single().execute()

        return user.data
    except Exception as e:
        logger.warning(f"WebSocket auth failed: {e}")
        return None


# ============ WebSocket Endpoints ============

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    equipo_id: Optional[str] = Query(None),
):
    """
    Main WebSocket endpoint.

    Connect with: ws://host/v1/ws?token=JWT_TOKEN&equipo_id=TEAM_ID

    Message types received:
    - notification: Personal notification
    - chat_message: Team chat message
    - presence: Online status updates

    Message types to send:
    - chat_send: Send a chat message to team
    - ping: Keep alive
    """
    # Authenticate
    user = await _authenticate_ws(token)
    if not user:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    user_id = user["id"]

    await manager.connect_user(websocket, user_id, equipo_id)

    # Notify team of user going online
    if equipo_id:
        await manager.broadcast_to_team(
            equipo_id,
            {
                "type": "presence",
                "user_id": user_id,
                "user_name": user.get("nombre", ""),
                "status": "online",
                "online_users": manager.get_online_users(equipo_id),
            },
            exclude_user=user_id,
        )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "chat_send" and equipo_id:
                await _handle_chat_message(user_id, user.get("nombre", ""), equipo_id, data)

            elif msg_type == "typing" and equipo_id:
                await manager.broadcast_to_team(
                    equipo_id,
                    {
                        "type": "typing",
                        "user_id": user_id,
                        "user_name": user.get("nombre", ""),
                    },
                    exclude_user=user_id,
                )

    except WebSocketDisconnect:
        manager.disconnect_user(websocket, user_id, equipo_id)

        if equipo_id:
            await manager.broadcast_to_team(
                equipo_id,
                {
                    "type": "presence",
                    "user_id": user_id,
                    "status": "offline",
                    "online_users": manager.get_online_users(equipo_id),
                },
            )

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect_user(websocket, user_id, equipo_id)


# ============ Message Handlers ============

async def _handle_chat_message(user_id: str, user_name: str, equipo_id: str, data: dict):
    """Handle incoming chat message: save to DB and broadcast."""
    contenido = data.get("contenido", "").strip()
    conversacion_id = data.get("conversacion_id")

    if not contenido or not conversacion_id:
        return

    supabase = get_supabase()

    # Save message to DB
    msg_data = {
        "conversacion_id": conversacion_id,
        "autor_id": user_id,
        "contenido": contenido,
        "tipo": "texto",
    }

    result = supabase.table("mensajes").insert(msg_data).execute()

    if result.data:
        saved = result.data[0]
        # Broadcast to team
        await manager.broadcast_to_team(
            equipo_id,
            {
                "type": "chat_message",
                "message": {
                    "id": saved["id"],
                    "conversacion_id": conversacion_id,
                    "autor_id": user_id,
                    "autor_nombre": user_name,
                    "contenido": contenido,
                    "created_at": saved["created_at"],
                },
            },
            exclude_user=user_id,
        )


# ============ Helper Functions (for use by other services) ============

async def notify_user_realtime(user_id: str, notification: dict):
    """
    Send a real-time notification to a user.
    Call this from notification_service or other services.
    """
    await manager.send_to_user(user_id, {
        "type": "notification",
        "notification": notification,
    })


async def notify_team_realtime(team_id: str, event: dict, exclude_user: Optional[str] = None):
    """
    Send a real-time event to all team members.
    """
    await manager.broadcast_to_team(team_id, event, exclude_user)
