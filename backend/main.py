"""
UrbanFlow Command Center — FastAPI Application Entry Point
"""

import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
import sys
import os

# Ensure the parent directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.routes import router
from backend import ml_engine
from backend.database import engine, Base
from backend.ws_manager import manager
from backend.command_center_service import get_command_center_payload

app = FastAPI(
    title="UrbanFlow Command Center",
    description="City-Scale Traffic Intelligence Platform — Predict. Simulate. Optimize. Deploy.",
    version="1.0.0",
)

# Initialize Database
Base.metadata.create_all(bind=engine)

# Setup Prometheus
Instrumentator().instrument(app).expose(app)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.websocket("/api/ws/command-center")
async def websocket_command_center(websocket: WebSocket):
    """
    WebSocket endpoint for real-time Command Center updates.
    """
    await manager.connect(websocket)
    try:
        # Send initial payload immediately
        initial_data = get_command_center_payload()
        await websocket.send_json(initial_data)
        
        while True:
            # We keep the connection alive.
            # In a full system, Kafka streamer would call manager.broadcast()
            # Here we just wait and keep alive. 
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Mock Real-time Loop to broadcast updates
async def broadcast_updates():
    while True:
        await asyncio.sleep(5)
        if manager.active_connections:
            payload = get_command_center_payload()
            await manager.broadcast(payload)


@app.on_event("startup")
async def startup():
    """Initialize the ML engine and background tasks on server startup."""
    print("=" * 60)
    print("  UrbanFlow Command Center — Starting Up")
    print("  Predict. Simulate. Optimize. Deploy.")
    print("=" * 60)
    metrics = ml_engine.init_engine()
    print(f"  Model Metrics: {metrics}")
    print("=" * 60)
    print("  ✅ All engines online. Server ready.")
    print("=" * 60)
    
    # Start the broadcast loop in the background
    asyncio.create_task(broadcast_updates())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
