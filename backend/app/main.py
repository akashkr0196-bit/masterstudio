from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .db_bootstrap import initialize_database
from .routers import events, photos, search, users, payments, support, selections, leads, audit_logs, validation, otp
from .websocket_manager import manager

initialize_database()

app = FastAPI(
    title="MasterStudio API",
    description="Full-stack AI Face Recognition event photography platform",
    version="1.0.0",
)

# Enable CORS for frontend origin (React Vite dev server runs on 5173+ by default)
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://localhost:5175,"
        "http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directory for local file serving fallback
STATIC_DIR = "static"
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Register API routers
app.include_router(events.router, prefix="/api")
app.include_router(photos.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(support.router, prefix="/api")
app.include_router(selections.router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(audit_logs.router, prefix="/api")
app.include_router(validation.router, prefix="/api")
app.include_router(otp.router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "Welcome to the MasterStudio Full-Stack API!"}

@app.websocket("/api/ws/events/{event_id}")
async def event_websocket_endpoint(websocket: WebSocket, event_id: str):
    await manager.connect(event_id, websocket)
    try:
        while True:
            # Keep connection alive; wait for messages or client disconnect
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(event_id, websocket)
