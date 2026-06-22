"""
UrbanFlow Command Center — API Routes
All REST endpoints for the frontend.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import sys
import os

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import ml_engine, digital_twin, simulation_engine
from backend import diversion_engine, resource_optimizer, economic_engine
from backend import explainability, post_event, copilot, intervention_engine, scenario_planner, before_after_engine, command_center_service, timeline_engine

router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Request/Response Models
# ---------------------------------------------------------------------------

class EventInput(BaseModel):
    event_type: str = "unplanned"
    event_cause: str = "others"
    latitude: float = 12.9716
    longitude: float = 77.5946
    attendance: int = 1000
    requires_road_closure: bool = False
    priority: str = "High"
    hour: int = 12
    day_of_week: int = 2
    description: str = ""
    veh_type: str = "unknown"
    zone: str = "unknown"
    corridor: str = "Non-corridor"
    duration_hours: float = 4.0
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class ScenarioInput(BaseModel):
    event: EventInput
    attendance_variants: Optional[list[int]] = None


class CopilotInput(BaseModel):
    query: str


class PostEventInput(BaseModel):
    event_id: str = ""
    predicted_score: float = 5.0
    actual_score: float = 5.0
    actual_delay_mins: float = 0
    actual_officers_used: int = 0
    notes: str = ""


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "operational", "service": "UrbanFlow Command Center"}


@router.get("/dashboard-stats")
async def dashboard_stats():
    """Get aggregate dashboard metrics from historical data."""
    try:
        stats = ml_engine.get_dashboard_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events")
async def list_events(limit: int = 50):
    """List historical events."""
    try:
        events = ml_engine.get_historical_events(limit=limit)
        return {"events": events, "total": len(events)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/heatmap-data")
async def heatmap_data():
    """Get congestion heatmap data for map visualization."""
    try:
        data = ml_engine.get_heatmap_data()
        return {"points": data, "total": len(data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict")
async def predict(event: EventInput):
    """Predict congestion impact for an event."""
    try:
        result = ml_engine.predict_impact(event.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/simulate")
async def simulate(event: EventInput):
    """Run Digital Twin simulation for an event."""
    try:
        result = digital_twin.simulate_event(event.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scenarios")
async def scenarios(input_data: ScenarioInput):
    """Run What-If multi-scenario analysis."""
    try:
        result = simulation_engine.run_scenarios(
            input_data.event.model_dump(),
            input_data.attendance_variants,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/diversions")
async def diversions(event: EventInput):
    """Get AI-recommended diversion routes."""
    try:
        # First get affected radius from simulation
        sim = digital_twin.simulate_event(event.model_dump())
        prediction = ml_engine.predict_impact(event.model_dump())
        result = diversion_engine.get_diversions(
            event.latitude, event.longitude,
            affected_radius_km=sim["affected_radius_km"],
            score=prediction["score"],
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize")
async def optimize(event: EventInput):
    """Optimize police deployment for an event."""
    try:
        prediction = ml_engine.predict_impact(event.model_dump())
        sim = digital_twin.simulate_event(event.model_dump())
        opt_data = {
            "predicted_impact": prediction["score"],
            "affected_radius_km": sim["affected_radius_km"],
            "attendance": event.attendance,
            "requires_road_closure": event.requires_road_closure,
            "event_type": event.event_type,
            "duration_hours": event.duration_hours,
        }
        result = resource_optimizer.optimize_deployment(opt_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/economic-impact")
async def economic_impact(event: EventInput):
    """Calculate economic impact with AI vs without AI."""
    try:
        prediction = ml_engine.predict_impact(event.model_dump())
        sim = digital_twin.simulate_event(event.model_dump())
        opt_data = {
            "predicted_impact": prediction["score"],
            "affected_radius_km": sim["affected_radius_km"],
            "attendance": event.attendance,
            "requires_road_closure": event.requires_road_closure,
            "duration_hours": event.duration_hours,
        }
        deployment = resource_optimizer.optimize_deployment(opt_data)
        econ_data = {
            "congestion_score": prediction["score"],
            "affected_radius_km": sim["affected_radius_km"],
            "estimated_delay_mins": sim["estimated_delay_mins"],
            "attendance": event.attendance,
            "duration_hours": event.duration_hours,
            "deployment_cost": deployment["cost_breakdown"]["total_cost"],
        }
        result = economic_engine.calculate_economic_impact(econ_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explain")
async def explain(event: EventInput):
    """Get explainable AI breakdown for a prediction."""
    try:
        result = explainability.explain_prediction(event.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/copilot")
async def copilot_query(input_data: CopilotInput):
    """AI Copilot natural language query."""
    try:
        result = copilot.process_query(input_data.query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/copilot/suggestions")
async def copilot_suggestions():
    """Get suggested queries for the copilot."""
    return {"suggestions": copilot.get_suggested_queries()}


@router.post("/post-event")
async def post_event_record(input_data: PostEventInput):
    """Record post-event actual outcomes."""
    try:
        result = post_event.record_event_outcome(input_data.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/post-event/report")
async def post_event_report():
    """Generate prediction accuracy report."""
    try:
        result = post_event.generate_prediction_report()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interventions")
async def interventions(event: EventInput):
    """Generate and compare intervention strategies."""
    try:
        result = intervention_engine.generate_strategies(event.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scenario-templates")
async def scenario_templates():
    """Get pre-built scenario templates."""
    try:
        return {"templates": scenario_planner.get_scenario_templates()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/scenario-planner")
async def run_scenario_planner(payload: dict):
    """
    Evaluate multiple scenarios. 
    Expects payload: {"base_event": {...}, "scenarios": [{...}, {...}]}
    """
    try:
        base_event = payload.get("base_event", {})
        scenarios = payload.get("scenarios", [])
        result = scenario_planner.evaluate_scenarios(base_event, scenarios)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/before-after")
async def before_after(event: EventInput):
    """Generate Before vs After simulation states."""
    try:
        result = before_after_engine.generate_simulation(event.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/timeline")
async def timeline(event: EventInput):
    """Generate time-series frames for event replay scrubbing."""
    try:
        return timeline_engine.generate_timeline(event.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/command-center")
async def command_center():
    """Get full real-time command center payload."""
    try:
        return command_center_service.get_command_center_payload()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/command-center/incidents")
async def command_center_incidents():
    """Get live incidents only."""
    try:
        return command_center_service.get_live_incidents()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/full-analysis")
async def full_analysis(event: EventInput):
    """
    Run the complete UrbanFlow analysis pipeline in one call.
    Returns: prediction, simulation, diversions, deployment, economics, explanation.
    """
    try:
        event_dict = event.model_dump()

        prediction = ml_engine.predict_impact(event_dict)
        sim = digital_twin.simulate_event(event_dict)
        div = diversion_engine.get_diversions(
            event.latitude, event.longitude,
            sim["affected_radius_km"], prediction["score"]
        )
        opt = resource_optimizer.optimize_deployment({
            "predicted_impact": prediction["score"],
            "affected_radius_km": sim["affected_radius_km"],
            "attendance": event.attendance,
            "requires_road_closure": event.requires_road_closure,
            "event_type": event.event_type,
            "duration_hours": event.duration_hours,
        })
        econ = economic_engine.calculate_economic_impact({
            "congestion_score": prediction["score"],
            "affected_radius_km": sim["affected_radius_km"],
            "estimated_delay_mins": sim["estimated_delay_mins"],
            "attendance": event.attendance,
            "duration_hours": event.duration_hours,
            "deployment_cost": opt["cost_breakdown"]["total_cost"],
        })
        expl = explainability.explain_prediction(event_dict)

        return {
            "prediction": prediction,
            "simulation": sim,
            "diversions": div,
            "deployment": opt,
            "economic_impact": econ,
            "explanation": expl,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
