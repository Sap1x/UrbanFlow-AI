"""
UrbanFlow Command Center — Traffic Intervention Engine (Priority 1)
Generates and evaluates operational strategies for events.
"""

from . import ml_engine, digital_twin, diversion_engine, resource_optimizer, economic_engine

def generate_strategies(event_data: dict) -> dict:
    """
    Generate 4 operational strategies for a given event:
    A: Signal Retiming
    B: Diversion Routing
    C: Personnel Deployment
    D: Hybrid Intervention

    Returns recommendations, metrics, and confidence scores for each.
    """
    prediction = ml_engine.predict_impact(event_data)
    base_score = prediction["score"]
    
    sim = digital_twin.simulate_event(event_data)
    affected_radius = sim["affected_radius_km"]
    base_delay = sim["estimated_delay_mins"]
    
    attendance = event_data.get("attendance", 5000)
    requires_closure = event_data.get("requires_road_closure", False)
    if isinstance(requires_closure, str):
        requires_closure = requires_closure.upper() == "TRUE"
    
    duration = event_data.get("duration_hours", 4)
    
    # Calculate Base Economics (Reactive/Without AI)
    base_econ = economic_engine.calculate_economic_impact({
        "congestion_score": base_score,
        "affected_radius_km": affected_radius,
        "estimated_delay_mins": base_delay,
        "attendance": attendance,
        "duration_hours": duration,
        "deployment_cost": 0,
    })["without_ai"]
    
    # -------------------------------------------------------------------------
    # Strategy A: Signal Retiming
    # Low cost, moderate impact, works well for lower scores.
    # -------------------------------------------------------------------------
    retiming_effectiveness = 0.15 if base_score < 6 else 0.08
    delay_reduction_a = base_delay * retiming_effectiveness
    score_reduction_a = base_score * retiming_effectiveness
    
    cost_a = 0  # Assuming centralized ATCS (Adaptive Traffic Control System)
    
    fuel_savings_a = base_econ["fuel_wasted_litres"] * retiming_effectiveness
    co2_savings_a = base_econ["co2_emissions_kg"] * retiming_effectiveness
    
    conf_a = 85 if base_score < 7 else 40
    
    strategy_a = {
        "id": "A",
        "name": "Signal Retiming",
        "description": "Adjust signal phases at junctions within the affected radius to prioritize event outflow.",
        "expected_congestion_score": round(base_score - score_reduction_a, 1),
        "delay_reduction_mins": round(delay_reduction_a, 1),
        "fuel_savings_litres": round(fuel_savings_a, 1),
        "co2_savings_kg": round(co2_savings_a, 1),
        "operational_cost_inr": cost_a,
        "confidence_score": conf_a,
        "pros": ["Zero physical deployment cost", "Instant activation"],
        "cons": ["Limited effectiveness for high-impact events", "May cause minor delays on cross-streets"]
    }
    
    # -------------------------------------------------------------------------
    # Strategy B: Diversion Routing
    # Uses diversion engine. Effective if alternative routes exist.
    # -------------------------------------------------------------------------
    div = diversion_engine.get_diversions(
        event_data.get("latitude", 12.97), 
        event_data.get("longitude", 77.59),
        affected_radius, base_score
    )
    
    has_good_diversions = div["total_routes_generated"] > 0
    div_effectiveness = 0.35 if has_good_diversions else 0.1
    if requires_closure:
        div_effectiveness += 0.15
        
    delay_reduction_b = base_delay * div_effectiveness
    score_reduction_b = base_score * div_effectiveness
    
    # Cost: variable messaging signs updates + app broadcasts
    cost_b = 5000 
    
    fuel_savings_b = base_econ["fuel_wasted_litres"] * div_effectiveness
    co2_savings_b = base_econ["co2_emissions_kg"] * div_effectiveness
    
    conf_b = 75 if has_good_diversions else 30
    
    strategy_b = {
        "id": "B",
        "name": "Diversion Routing",
        "description": f"Activate {div['total_routes_generated']} alternate routes via VMS and navigation apps.",
        "expected_congestion_score": round(max(1.0, base_score - score_reduction_b), 1),
        "delay_reduction_mins": round(delay_reduction_b, 1),
        "fuel_savings_litres": round(fuel_savings_b, 1),
        "co2_savings_kg": round(co2_savings_b, 1),
        "operational_cost_inr": cost_b,
        "confidence_score": conf_b,
        "pros": ["Diverts traffic before it hits the congestion zone", "Highly effective for road closures"],
        "cons": ["Relies on driver compliance", "Requires alternate capacity"]
    }
    
    # -------------------------------------------------------------------------
    # Strategy C: Personnel Deployment
    # High cost, highly reliable.
    # -------------------------------------------------------------------------
    opt = resource_optimizer.optimize_deployment({
        "predicted_impact": base_score,
        "affected_radius_km": affected_radius,
        "attendance": attendance,
        "requires_road_closure": requires_closure,
        "event_type": event_data.get("event_type", "unplanned"),
        "duration_hours": duration,
    })
    
    deployment_cost = opt["cost_breakdown"]["total_cost"]
    
    pers_effectiveness = 0.45
    delay_reduction_c = base_delay * pers_effectiveness
    score_reduction_c = base_score * pers_effectiveness
    
    fuel_savings_c = base_econ["fuel_wasted_litres"] * pers_effectiveness
    co2_savings_c = base_econ["co2_emissions_kg"] * pers_effectiveness
    
    conf_c = 92 # Physical presence is highly predictable
    
    strategy_c = {
        "id": "C",
        "name": "Personnel Deployment",
        "description": f"Deploy {opt['deployment']['officers']} officers, {opt['deployment']['patrol_vehicles']} vehicles, and {opt['deployment']['barricades']} barricades.",
        "expected_congestion_score": round(max(1.0, base_score - score_reduction_c), 1),
        "delay_reduction_mins": round(delay_reduction_c, 1),
        "fuel_savings_litres": round(fuel_savings_c, 1),
        "co2_savings_kg": round(co2_savings_c, 1),
        "operational_cost_inr": deployment_cost,
        "confidence_score": conf_c,
        "pros": ["Maximum control over traffic flow", "Handles unpredictable driver behavior"],
        "cons": ["High resource cost", "Takes time to deploy"]
    }
    
    # -------------------------------------------------------------------------
    # Strategy D: Hybrid Intervention (A + B + C)
    # The ultimate approach, combines strengths.
    # -------------------------------------------------------------------------
    hybrid_effectiveness = min(0.75, retiming_effectiveness + div_effectiveness + pers_effectiveness * 0.8)
    delay_reduction_d = base_delay * hybrid_effectiveness
    score_reduction_d = base_score * hybrid_effectiveness
    
    fuel_savings_d = base_econ["fuel_wasted_litres"] * hybrid_effectiveness
    co2_savings_d = base_econ["co2_emissions_kg"] * hybrid_effectiveness
    
    conf_d = 95
    
    strategy_d = {
        "id": "D",
        "name": "Hybrid Intervention",
        "description": "Combine Signal Retiming, Diversion Routing, and Optimized Personnel Deployment.",
        "expected_congestion_score": round(max(1.0, base_score - score_reduction_d), 1),
        "delay_reduction_mins": round(delay_reduction_d, 1),
        "fuel_savings_litres": round(fuel_savings_d, 1),
        "co2_savings_kg": round(co2_savings_d, 1),
        "operational_cost_inr": cost_a + cost_b + deployment_cost,
        "confidence_score": conf_d,
        "pros": ["Highest impact reduction", "Comprehensive coverage"],
        "cons": ["Maximum operational cost", "Requires complex coordination"]
    }
    
    strategies = [strategy_a, strategy_b, strategy_c, strategy_d]
    
    # -------------------------------------------------------------------------
    # Recommendation Engine
    # -------------------------------------------------------------------------
    # Score each strategy: (Delay Reduction * 100) - (Cost / 1000) + (Confidence * 2)
    # We want best bang for buck, but if score is CRITICAL, we care less about cost.
    
    best_strategy = None
    best_eval = -999999
    
    for s in strategies:
        cost_penalty_weight = 0.1 if base_score >= 8 else 1.0
        eval_score = (s["delay_reduction_mins"] * 50) - (s["operational_cost_inr"] / 500 * cost_penalty_weight) + (s["confidence_score"] * 1.5)
        if eval_score > best_eval:
            best_eval = eval_score
            best_strategy = s
            
    reasoning = ""
    if best_strategy["id"] == "D":
        reasoning = f"Due to the high predicted impact ({base_score}), a combined Hybrid approach provides the necessary {round(hybrid_effectiveness*100)}% mitigation despite higher costs."
    elif best_strategy["id"] == "C":
        reasoning = "Physical personnel deployment offers the most reliable control for this specific location and event type."
    elif best_strategy["id"] == "B":
        reasoning = "Effective alternative routes are available, making Diversion Routing the most cost-effective solution."
    elif best_strategy["id"] == "A":
        reasoning = f"The moderate impact ({base_score}) can be managed purely through Signal Retiming with zero additional deployment cost."

    return {
        "base_prediction": prediction,
        "base_metrics": {
            "estimated_delay_mins": base_delay,
            "affected_radius_km": affected_radius
        },
        "strategies": strategies,
        "recommendation": {
            "recommended_strategy_id": best_strategy["id"],
            "reasoning": reasoning,
            "expected_outcome": f"Reduces congestion score to {best_strategy['expected_congestion_score']} and saves {best_strategy['delay_reduction_mins']} mins of delay.",
            "confidence": f"{best_strategy['confidence_score']}%"
        }
    }
