"""
UrbanFlow Command Center — Health Checks (Priority 10)
Endpoints for Kubernetes/Docker health probes.
"""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/health")

_start_time = datetime.utcnow()

@router.get("/liveness")
async def liveness():
    """Liveness probe to check if the server is running."""
    return {"status": "ok", "uptime_seconds": (datetime.utcnow() - _start_time).total_seconds()}

@router.get("/readiness")
async def readiness():
    """
    Readiness probe to check if the server is ready to accept traffic.
    In production, this would check DB connections, Redis, and Kafka.
    """
    # Try to import models to ensure ML engine is ready
    from . import ml_engine
    ml_ready = ml_engine._model is not None
    
    if not ml_ready:
        return {"status": "starting", "ml_engine": "not_initialized"}
        
    return {
        "status": "ready",
        "dependencies": {
            "ml_engine": "ok",
            "redis": "ok", # mock
            "kafka": "ok"  # mock
        }
    }
