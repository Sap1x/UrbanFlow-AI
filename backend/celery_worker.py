import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.task_routes = {
    "celery_worker.run_simulation": "main-queue"
}

@celery_app.task(name="celery_worker.run_simulation")
def run_simulation(event_data: dict):
    """
    Background task to run heavy Digital Twin simulations.
    In a real system, this would publish the result back to Kafka.
    """
    # Import locally to avoid circular dependencies
    from backend import digital_twin
    result = digital_twin.simulate_event(event_data)
    return result
