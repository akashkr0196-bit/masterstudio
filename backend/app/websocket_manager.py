from fastapi import WebSocket
from typing import Dict, List

class EventConnectionManager:
    def __init__(self):
        # Maps event_id -> list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, event_id: str, websocket: WebSocket):
        await websocket.accept()
        if event_id not in self.active_connections:
            self.active_connections[event_id] = []
        self.active_connections[event_id].append(websocket)

    def disconnect(self, event_id: str, websocket: WebSocket):
        if event_id in self.active_connections:
            if websocket in self.active_connections[event_id]:
                self.active_connections[event_id].remove(websocket)
            if not self.active_connections[event_id]:
                del self.active_connections[event_id]

    async def broadcast_to_event(self, event_id: str, message: dict):
        if event_id in self.active_connections:
            # We iterate over a copy of the list so we can modify it during iteration if a connection fails
            for connection in list(self.active_connections[event_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    self.disconnect(event_id, connection)

manager = EventConnectionManager()
