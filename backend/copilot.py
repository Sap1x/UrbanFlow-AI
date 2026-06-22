"""
UrbanFlow Command Center — AI Copilot (Phase 13)
Natural language query engine for traffic operations.
"""

import re
from . import ml_engine, digital_twin, resource_optimizer, economic_engine, explainability, command_center_service, intervention_engine


def process_query(query: str) -> dict:
    """
    Process a natural language query and route to appropriate engines.

    Supported query types:
    - Officer/resource queries: "How many officers for a 50K concert?"
    - Impact queries: "What's the impact of a rally on MG Road?"
    - Road queries: "Which roads will be affected?"
    - Cost queries: "What's the cheapest deployment plan?"
    - Comparison queries: "Compare 30K vs 50K attendance"
    - Live queries: "What is the current city risk score?"
    - Strategy queries: "What is the best intervention strategy for an accident?"
    """
    query_lower = query.lower().strip()

    # Extract parameters from query
    attendance = _extract_number(query_lower, ["people", "person", "crowd", "attendance", "k concert", "k rally", "k event"])
    event_type = _extract_event_type(query_lower)
    location = _extract_location(query_lower)

    # Build event data from extracted parameters
    event_data = {
        "event_cause": event_type or "public_event",
        "attendance": attendance or 10000,
        "latitude": location.get("lat", 12.9716) if location else 12.9716,
        "longitude": location.get("lng", 77.5946) if location else 77.5946,
        "priority": "High",
        "requires_road_closure": any(w in query_lower for w in ["closure", "closed", "block"]),
        "hour": 17,
        "zone": location.get("zone", "unknown") if location else "unknown",
        "corridor": "Non-corridor",
        "description": query,
    }

    # Route to appropriate handler
    if any(w in query_lower for w in ["officer", "police", "personnel", "deploy", "barricade", "manpower"]):
        return _handle_resource_query(query, event_data)
    elif any(w in query_lower for w in ["road", "route", "corridor", "affect", "block"]):
        return _handle_road_query(query, event_data)
    elif any(w in query_lower for w in ["cost", "cheap", "budget", "expense", "save", "economic"]):
        return _handle_cost_query(query, event_data)
    elif any(w in query_lower for w in ["compare", "versus", "vs", "scenario", "what if"]):
        return _handle_comparison_query(query, event_data)
    elif any(w in query_lower for w in ["live", "current", "status", "command center", "now"]):
        return _handle_live_query(query)
    elif any(w in query_lower for w in ["intervention", "strategy", "mitigate", "action plan"]):
        return _handle_strategy_query(query, event_data)
    elif any(w in query_lower for w in ["why", "explain", "reason", "cause", "driver"]):
        return _handle_explanation_query(query, event_data)
    elif any(w in query_lower for w in ["impact", "congestion", "predict", "score", "severity"]):
        return _handle_impact_query(query, event_data)
    else:
        return _handle_general_query(query, event_data)


def _handle_resource_query(query: str, event_data: dict) -> dict:
    prediction = ml_engine.predict_impact(event_data)
    sim = digital_twin.simulate_event(event_data)
    opt_data = {
        "predicted_impact": prediction["score"],
        "affected_radius_km": sim["affected_radius_km"],
        "attendance": event_data["attendance"],
        "requires_road_closure": event_data["requires_road_closure"],
        "event_type": "planned",
        "duration_hours": 4,
    }
    deployment = resource_optimizer.optimize_deployment(opt_data)

    d = deployment["deployment"]
    cost = deployment["cost_breakdown"]
    response_text = (
        f"For a {event_data['event_cause'].replace('_', ' ')} with {event_data['attendance']:,} expected attendance:\n\n"
        f"📋 **Recommended Deployment:**\n"
        f"• **{d['officers']} Police Officers** (across {deployment['shift_plan']['total_shifts']} shift(s))\n"
        f"• **{d['patrol_vehicles']} Patrol Vehicles**\n"
        f"• **{d['barricades']} Barricades**\n\n"
        f"💰 **Estimated Cost:** ₹{cost['total_cost']:,} (₹{cost['total_cost']/100000:.1f} Lakhs)\n\n"
        f"⚠️ **Predicted Impact Score:** {prediction['score']}/10 ({prediction['severity_label']})\n"
        f"📍 **Affected Radius:** {sim['affected_radius_km']} km"
    )

    return {
        "query": query,
        "response_type": "resource_deployment",
        "response_text": response_text,
        "data": {
            "prediction": prediction,
            "deployment": deployment,
            "simulation": {
                "affected_radius_km": sim["affected_radius_km"],
                "road_saturation_pct": sim["road_saturation_pct"],
            },
        },
    }


def _handle_road_query(query: str, event_data: dict) -> dict:
    sim = digital_twin.simulate_event(event_data)
    corridors = sim["high_risk_corridors"]

    if corridors:
        corridor_text = "\n".join(
            f"• **{c['name']}** — {c['risk_level']} risk, +{c['additional_delay_mins']}min delay ({c['distance_km']}km away)"
            for c in corridors
        )
    else:
        corridor_text = "No major corridors identified within the impact zone."

    response_text = (
        f"For this event at the specified location:\n\n"
        f"🛣️ **Affected Corridors:**\n{corridor_text}\n\n"
        f"📍 **Impact Radius:** {sim['affected_radius_km']} km\n"
        f"🚗 **Road Saturation:** {sim['road_saturation_pct']}%\n"
        f"⏱️ **Estimated Additional Delay:** {sim['estimated_delay_mins']} minutes"
    )

    return {
        "query": query,
        "response_type": "road_impact",
        "response_text": response_text,
        "data": {"simulation": sim},
    }


def _handle_cost_query(query: str, event_data: dict) -> dict:
    prediction = ml_engine.predict_impact(event_data)
    sim = digital_twin.simulate_event(event_data)
    opt_data = {
        "predicted_impact": prediction["score"],
        "affected_radius_km": sim["affected_radius_km"],
        "attendance": event_data["attendance"],
        "requires_road_closure": event_data["requires_road_closure"],
        "duration_hours": 4,
    }
    deployment = resource_optimizer.optimize_deployment(opt_data)
    econ = economic_engine.calculate_economic_impact({
        "congestion_score": prediction["score"],
        "affected_radius_km": sim["affected_radius_km"],
        "estimated_delay_mins": sim["estimated_delay_mins"],
        "attendance": event_data["attendance"],
        "duration_hours": 4,
        "deployment_cost": deployment["cost_breakdown"]["total_cost"],
    })

    response_text = (
        f"💰 **Economic Analysis:**\n\n"
        f"**Without AI (Reactive):**\n"
        f"• Total Cost: ₹{econ['without_ai']['total_cost_lakhs']} Lakhs\n"
        f"• Delay: {econ['without_ai']['avg_delay_mins']}min avg\n\n"
        f"**With UrbanFlow AI:**\n"
        f"• Total Cost: ₹{econ['with_ai']['total_cost_lakhs']} Lakhs\n"
        f"• Deployment Cost: ₹{deployment['cost_breakdown']['total_cost']:,}\n"
        f"• Delay: {econ['with_ai']['avg_delay_mins']}min avg\n\n"
        f"✅ **Savings: ₹{econ['savings']['total_savings_lakhs']} Lakhs ({econ['savings']['savings_percentage']}%)**\n"
        f"🌱 **CO₂ Prevented: {econ['savings']['co2_saved_kg']} kg**"
    )

    return {
        "query": query,
        "response_type": "economic_analysis",
        "response_text": response_text,
        "data": {"economic_impact": econ, "deployment": deployment},
    }


def _handle_comparison_query(query: str, event_data: dict) -> dict:
    numbers = re.findall(r"(\d+)[kK]", query)
    if numbers:
        variants = [int(n) * 1000 for n in numbers]
    else:
        base = event_data["attendance"]
        variants = [int(base * 0.6), base, int(base * 1.6)]

    from . import simulation_engine
    result = simulation_engine.run_scenarios(event_data, variants)

    scenario_text = "\n".join(
        f"• **{s['label']} ({s['attendance']:,}):** Score {s['congestion_score']}/10, "
        f"Delay +{s['estimated_delay_mins']}min, Saturation {s['road_saturation_pct']}%"
        for s in result["scenarios"]
    )

    response_text = (
        f"📊 **Scenario Comparison:**\n\n{scenario_text}\n\n"
        f"The difference between best and worst case is "
        f"{result['scenarios'][-1]['congestion_score'] - result['scenarios'][0]['congestion_score']:.1f} points."
    )

    return {
        "query": query,
        "response_type": "scenario_comparison",
        "response_text": response_text,
        "data": result,
    }


def _handle_explanation_query(query: str, event_data: dict) -> dict:
    explanation = explainability.explain_prediction(event_data)

    drivers_text = "\n".join(
        f"• **{d['factor']}** — {d['explanation']}"
        for d in explanation["top_drivers"][:5]
    )

    response_text = (
        f"🔍 **AI Explanation:**\n\n"
        f"{explanation['narrative']}\n\n"
        f"**Top Congestion Drivers:**\n{drivers_text}\n\n"
        f"💡 **Insights:**\n"
        + "\n".join(f"• {i}" for i in explanation["actionable_insights"])
    )

    return {
        "query": query,
        "response_type": "explanation",
        "response_text": response_text,
        "data": explanation,
    }


def _handle_live_query(query: str) -> dict:
    cc_data = command_center_service.get_command_center_payload()
    rm = cc_data["realtime_metrics"]
    
    response_text = (
        f"📡 **Live Command Center Status:**\n\n"
        f"• **System Status:** {cc_data['system_status']}\n"
        f"• **City Risk Score:** {rm['city_risk_score']}/10.0\n"
        f"• **Active Incidents:** {rm['active_incidents']} ({rm['critical_incidents']} Critical)\n"
        f"• **Total Delay:** {rm['total_delay_mins']} minutes\n"
        f"• **Resources Deployed:** {rm['officers_deployed']} Officers, {rm['vehicles_deployed']} Vehicles\n\n"
        f"🤖 **Live Recommendations:**\n"
        + "\n".join(f"• {r}" for r in cc_data["live_recommendations"])
    )
    
    return {
        "query": query,
        "response_type": "live_status",
        "response_text": response_text,
        "data": cc_data,
    }


def _handle_strategy_query(query: str, event_data: dict) -> dict:
    inv = intervention_engine.generate_strategies(event_data)
    best_id = inv["recommendation"]["recommended_strategy_id"]
    best_strategy = next(s for s in inv["strategies"] if s["id"] == best_id)
    
    strategies_text = "\n".join(
        f"• **{s['name']}**: Cost ₹{s['deployment_cost_inr']:,}, Delay Saved {s['delay_reduction_mins']}m"
        for s in inv["strategies"]
    )
    
    response_text = (
        f"🛡️ **Intervention Strategies:**\n\n"
        f"**Recommended Strategy: {best_strategy['name']}**\n"
        f"• Justification: {inv['recommendation']['justification']}\n"
        f"• Congestion Score: {best_strategy['expected_congestion_score']}/10\n"
        f"• Net ROI: ₹{best_strategy['net_roi_inr']:,}\n\n"
        f"**All Options Evaluated:**\n{strategies_text}"
    )
    
    return {
        "query": query,
        "response_type": "intervention_strategy",
        "response_text": response_text,
        "data": inv,
    }


def _handle_impact_query(query: str, event_data: dict) -> dict:
    prediction = ml_engine.predict_impact(event_data)
    sim = digital_twin.simulate_event(event_data)

    response_text = (
        f"⚡ **Impact Prediction:**\n\n"
        f"• **Congestion Score:** {prediction['score']}/10 ({prediction['severity_label']})\n"
        f"• **Affected Radius:** {sim['affected_radius_km']} km\n"
        f"• **Road Saturation:** {sim['road_saturation_pct']}%\n"
        f"• **Estimated Delay:** +{sim['estimated_delay_mins']} minutes\n"
        f"• **Traffic Load Increase:** {sim['traffic_load_increase_pct']}%\n"
        f"• **Vehicles Affected:** {sim['vehicles_generated']:,}"
    )

    return {
        "query": query,
        "response_type": "impact_prediction",
        "response_text": response_text,
        "data": {"prediction": prediction, "simulation": sim},
    }


def _handle_general_query(query: str, event_data: dict) -> dict:
    prediction = ml_engine.predict_impact(event_data)

    response_text = (
        f"I can help with traffic intelligence queries. Here are some things you can ask:\n\n"
        f"• \"How many officers do we need for a 50K concert?\"\n"
        f"• \"Which roads will be affected by a rally at Majestic?\"\n"
        f"• \"What's the cheapest deployment plan?\"\n"
        f"• \"Compare 30K vs 50K vs 80K attendance\"\n"
        f"• \"Why is congestion predicted to be high?\"\n"
        f"• \"What's the economic impact of this event?\"\n\n"
        f"Based on your query, the current impact prediction is **{prediction['score']}/10**."
    )

    return {
        "query": query,
        "response_type": "general",
        "response_text": response_text,
        "data": {"prediction": prediction},
    }


def _extract_number(text: str, context_words: list) -> int | None:
    """Extract attendance/crowd numbers from query text."""
    # Try patterns like "50K", "50,000", "50000"
    match = re.search(r"(\d+)[kK]", text)
    if match:
        return int(match.group(1)) * 1000

    match = re.search(r"(\d{1,3}(?:,\d{3})+)", text)
    if match:
        return int(match.group(1).replace(",", ""))

    match = re.search(r"(\d{4,})", text)
    if match:
        return int(match.group(1))

    return None


def _extract_event_type(text: str) -> str | None:
    """Extract event type from query text."""
    event_map = {
        "concert": "public_event",
        "rally": "procession",
        "protest": "protest",
        "festival": "public_event",
        "match": "public_event",
        "cricket": "public_event",
        "marathon": "public_event",
        "parade": "procession",
        "vip": "vip_movement",
        "construction": "construction",
        "accident": "accident",
        "breakdown": "vehicle_breakdown",
        "water log": "water_logging",
        "flood": "water_logging",
        "tree fall": "tree_fall",
    }
    for keyword, etype in event_map.items():
        if keyword in text:
            return etype
    return None


def _extract_location(text: str) -> dict | None:
    """Extract location from query text."""
    locations = {
        "mg road": {"lat": 12.9757, "lng": 77.6065, "zone": "Central Zone 2"},
        "majestic": {"lat": 12.9771, "lng": 77.5727, "zone": "Central Zone 1"},
        "koramangala": {"lat": 12.9352, "lng": 77.6245, "zone": "South East"},
        "whitefield": {"lat": 12.9698, "lng": 77.7500, "zone": "East"},
        "indiranagar": {"lat": 12.9784, "lng": 77.6408, "zone": "East"},
        "silk board": {"lat": 12.9172, "lng": 77.6230, "zone": "South East"},
        "hebbal": {"lat": 13.0358, "lng": 77.5970, "zone": "North"},
        "electronic city": {"lat": 12.8440, "lng": 77.6600, "zone": "South"},
        "marathahalli": {"lat": 12.9591, "lng": 77.7009, "zone": "East"},
        "jayanagar": {"lat": 12.9308, "lng": 77.5838, "zone": "South"},
    }
    for name, coords in locations.items():
        if name in text:
            return coords
    return None


def get_suggested_queries() -> list:
    """Return list of suggested queries for the copilot UI."""
    return [
        "How many officers do we need for a 50K concert at Koramangala?",
        "Which roads will be affected by a rally near Majestic?",
        "What's the cheapest deployment plan for a festival?",
        "Compare 30K vs 50K vs 80K attendance scenarios",
        "Why is congestion predicted to be high?",
        "What is the current city risk score?",
        "What is the best intervention strategy for an accident?",
        "What's the economic impact of a VIP movement on MG Road?",
        "Predict impact of water logging near Silk Board",
        "How much delay will a 20K cricket match cause?",
    ]
