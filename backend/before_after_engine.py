"""
UrbanFlow Command Center — Before/After Simulation Engine (Priority 3)
Generates the 3 states: Current, Predicted, and Optimized.
"""
from . import ml_engine, digital_twin, intervention_engine, economic_engine
import math
import random

def generate_simulation(event_data: dict) -> dict:
    """
    Computes three states of traffic:
    1. Current (baseline, no event)
    2. Predicted (with event, no intervention)
    3. Optimized (with event, best intervention applied)
    """
    lat = event_data.get("latitude", 12.97)
    lon = event_data.get("longitude", 77.59)
    
    # --- 1. Current State (Baseline) ---
    # Assume baseline is generally okay but has typical city traffic
    baseline_score = 2.0 + (1.5 if event_data.get("is_peak_hour", False) else 0)
    current_state = {
        "state_name": "Current Status",
        "metrics": {
            "congestion_score": baseline_score,
            "avg_speed_kmh": 32.5 if baseline_score < 3 else 24.0,
            "delay_mins": 0,
            "affected_radius_km": 0,
            "active_interventions": []
        },
        "heatmap": _generate_heatmap(lat, lon, 0.5, baseline_score)
    }
    
    # --- 2. Predicted State (No Action) ---
    pred = ml_engine.predict_impact(event_data)
    score = pred["score"]
    
    sim = digital_twin.simulate_event(event_data)
    affected_radius = sim["affected_radius_km"]
    delay = sim["estimated_delay_mins"]
    
    econ = economic_engine.calculate_economic_impact({
        "congestion_score": score,
        "affected_radius_km": affected_radius,
        "estimated_delay_mins": delay,
        "attendance": event_data.get("attendance", 5000),
        "duration_hours": event_data.get("duration_hours", 4),
        "deployment_cost": 0,
    })["without_ai"]
    
    predicted_state = {
        "state_name": "Predicted (No Action)",
        "metrics": {
            "congestion_score": score,
            "avg_speed_kmh": max(5.0, 40.0 - (score * 3.5)),
            "delay_mins": delay,
            "affected_radius_km": affected_radius,
            "economic_cost_inr": econ["total_cost_inr"],
            "active_interventions": []
        },
        "heatmap": _generate_heatmap(lat, lon, affected_radius, score)
    }
    
    # --- 3. Optimized State (With AI) ---
    inv = intervention_engine.generate_strategies(event_data)
    best = next(s for s in inv["strategies"] if s["id"] == inv["recommendation"]["recommended_strategy_id"])
    
    opt_score = best["expected_congestion_score"]
    opt_delay = delay - best["delay_reduction_mins"]
    
    optimized_state = {
        "state_name": "Optimized (AI Driven)",
        "metrics": {
            "congestion_score": opt_score,
            "avg_speed_kmh": max(5.0, 40.0 - (opt_score * 3.5)),
            "delay_mins": opt_delay,
            "affected_radius_km": affected_radius * 0.7, # Assuming interventions contain the spread
            "economic_cost_inr": econ["total_cost_inr"] * (opt_score / max(1.0, score)),
            "active_interventions": [best["name"]]
        },
        "heatmap": _generate_heatmap(lat, lon, affected_radius * 0.7, opt_score)
    }
    
    # --- Improvements Delta ---
    improvements = {
        "delay_reduction_pct": round((best["delay_reduction_mins"] / max(1.0, delay)) * 100, 1),
        "congestion_reduction_pct": round(((score - opt_score) / score) * 100, 1),
        "cost_savings_inr": best["delay_reduction_mins"] * 500, # Rough proxy
        "co2_saved_kg": best["co2_savings_kg"]
    }
    
    return {
        "event_parameters": event_data,
        "current_state": current_state,
        "predicted_state": predicted_state,
        "optimized_state": optimized_state,
        "improvements": improvements
    }

def _generate_heatmap(center_lat, center_lon, radius_km, score):
    """
    Generate synthetic heatmap points around a center for visualization.
    radius_km controls spread, score controls intensity and number of points.
    """
    points = []
    num_points = int(score * 15)
    
    if radius_km == 0 or num_points == 0:
        return []
        
    for _ in range(num_points):
        # Random point within circle
        r = radius_km * math.sqrt(random.random()) / 111.0 # Rough km to deg conversion
        theta = random.random() * 2 * math.pi
        
        lat = center_lat + r * math.cos(theta)
        lon = center_lon + r * math.sin(theta)
        
        # Intensity decays from center
        dist = math.sqrt((lat - center_lat)**2 + (lon - center_lon)**2) * 111.0
        intensity = score * (1 - (dist / radius_km))
        
        points.append({
            "lat": round(lat, 5),
            "lng": round(lon, 5),
            "intensity": round(max(0.1, intensity), 2)
        })
        
    return points
