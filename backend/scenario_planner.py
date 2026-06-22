"""
UrbanFlow Command Center — Scenario Planning Engine (Priority 2)
Generates and compares multiple "What-If" scenarios side-by-side.
"""
from copy import deepcopy
from . import ml_engine, digital_twin, intervention_engine, economic_engine

def get_scenario_templates():
    return [
        {"id": "rain", "name": "Heavy Rainfall", "modifiers": {"event_cause": "water_logging", "impact_multiplier": 1.5}},
        {"id": "vip", "name": "VIP Movement", "modifiers": {"event_cause": "vip_movement", "priority": "Critical"}},
        {"id": "attendance_150", "name": "50% More Crowd", "modifiers": {"attendance_multiplier": 1.5}},
        {"id": "closure", "name": "Requires Road Closure", "modifiers": {"requires_road_closure": True}},
    ]

def evaluate_scenarios(base_event: dict, scenarios: list) -> dict:
    """
    Evaluates a base event against multiple scenarios.
    scenarios is a list of dicts with name and modifiers.
    """
    results = []
    
    # Evaluate Base Case
    base_result = _evaluate_single_scenario("Base Case (Expected)", base_event)
    results.append(base_result)
    
    # Evaluate each scenario
    for sc in scenarios:
        mod_event = deepcopy(base_event)
        mods = sc.get("modifiers", {})
        
        if "event_cause" in mods:
            mod_event["event_cause"] = mods["event_cause"]
        if "priority" in mods:
            mod_event["priority"] = mods["priority"]
        if "requires_road_closure" in mods:
            mod_event["requires_road_closure"] = mods["requires_road_closure"]
        if "attendance_multiplier" in mods:
            mod_event["attendance"] = int(mod_event.get("attendance", 5000) * mods["attendance_multiplier"])
            
        res = _evaluate_single_scenario(sc.get("name", "Custom Scenario"), mod_event)
        
        # Apply impact multiplier if specified (e.g. for rain making things universally worse)
        if "impact_multiplier" in mods:
            res["metrics"]["congestion_score"] = min(10.0, round(res["metrics"]["congestion_score"] * mods["impact_multiplier"], 1))
            res["metrics"]["estimated_delay_mins"] = round(res["metrics"]["estimated_delay_mins"] * mods["impact_multiplier"], 1)
            
        results.append(res)
        
    # Rank scenarios by severity
    ranked = sorted(results, key=lambda x: x["metrics"]["congestion_score"], reverse=True)
    worst_case = ranked[0]["name"]
    
    return {
        "base_event": base_event,
        "scenarios_evaluated": len(results),
        "worst_case_scenario": worst_case,
        "results": results
    }

def _evaluate_single_scenario(name: str, event_data: dict) -> dict:
    pred = ml_engine.predict_impact(event_data)
    score = pred["score"]
    
    sim = digital_twin.simulate_event(event_data)
    
    # Get optimal intervention
    inv = intervention_engine.generate_strategies(event_data)
    rec_strategy = next(s for s in inv["strategies"] if s["id"] == inv["recommendation"]["recommended_strategy_id"])
    
    # Economics (without AI)
    econ = economic_engine.calculate_economic_impact({
        "congestion_score": score,
        "affected_radius_km": sim["affected_radius_km"],
        "estimated_delay_mins": sim["estimated_delay_mins"],
        "attendance": event_data.get("attendance", 5000),
        "duration_hours": event_data.get("duration_hours", 4),
        "deployment_cost": 0,
    })["without_ai"]
    
    return {
        "name": name,
        "event_parameters": event_data,
        "metrics": {
            "congestion_score": score,
            "severity": pred["severity_label"],
            "estimated_delay_mins": sim["estimated_delay_mins"],
            "affected_radius_km": sim["affected_radius_km"],
            "economic_cost_inr": econ["total_cost_inr"],
        },
        "optimal_intervention": {
            "strategy": rec_strategy["name"],
            "cost_inr": rec_strategy["operational_cost_inr"],
            "delay_reduction_mins": rec_strategy["delay_reduction_mins"]
        }
    }
