"""
UrbanFlow Command Center — Real-Time Aggregation Service (Priority 6)
Generates the real-time payload for the dark-mode operations dashboard.
"""
from datetime import datetime, timedelta
import random
from . import ml_engine, digital_twin

def get_command_center_payload() -> dict:
    """
    Returns a unified real-time snapshot of the city's traffic operations.
    Combines stats, active incidents, active deployments, and system health.
    """
    stats = ml_engine.get_dashboard_stats()
    
    # Generate live simulated active incidents based on historical data
    active_events = _generate_active_events()
    
    # Calculate current real-time metrics
    current_active_count = len(active_events)
    avg_active_score = sum(e["impact_score"] for e in active_events) / current_active_count if current_active_count > 0 else 0
    total_active_delay = sum(e["metrics"]["estimated_delay_mins"] for e in active_events)
    
    # Resource utilization (simulated based on active high-impact events)
    high_impact_count = sum(1 for e in active_events if e["impact_score"] >= 6.0)
    officers_deployed = high_impact_count * 12 + random.randint(10, 30)
    vehicles_deployed = high_impact_count * 4 + random.randint(5, 10)
    
    # Generate 6-hour trend forecast
    forecast = _generate_trend_forecast(avg_active_score)
    
    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "system_status": "OPERATIONAL",
        "realtime_metrics": {
            "active_incidents": current_active_count,
            "critical_incidents": sum(1 for e in active_events if e["impact_score"] >= 8.0),
            "city_risk_score": round(avg_active_score, 1),
            "total_delay_mins": round(total_active_delay, 1),
            "officers_deployed": officers_deployed,
            "officer_utilization_pct": min(100, round((officers_deployed / 500) * 100, 1)),
            "vehicles_deployed": vehicles_deployed
        },
        "active_events": active_events,
        "trend_forecast": forecast,
        "live_recommendations": _generate_live_recommendations(active_events)
    }

def get_live_incidents() -> dict:
    """Returns just the live incidents for fast polling."""
    return {"active_events": _generate_active_events()}

def _generate_active_events():
    """Simulates active events by picking from historical and making them 'live'."""
    hist = ml_engine.get_historical_events(15)
    
    active = []
    # Pick 5-8 random events to be "active"
    num_active = random.randint(5, 8)
    sampled = random.sample(hist, min(num_active, len(hist)))
    
    now = datetime.utcnow()
    
    for i, e in enumerate(sampled):
        # Enhance event with simulation metrics
        sim = digital_twin.simulate_event(e)
        
        # Determine status based on duration
        progress = random.random() # 0 to 1
        status = "ESCALATING" if progress < 0.3 else ("STABLE" if progress < 0.7 else "RESOLVING")
        
        active.append({
            "id": f"LIVE-{i+1000}",
            "cause": e["event_cause"],
            "location": e["zone"],
            "corridor": e["corridor"],
            "latitude": e["latitude"],
            "longitude": e["longitude"],
            "impact_score": e["impact_score"],
            "severity": "CRITICAL" if e["impact_score"] >= 8 else ("HIGH" if e["impact_score"] >= 6 else "MODERATE"),
            "status": status,
            "time_active_mins": int(progress * e["duration_mins"]),
            "metrics": {
                "affected_radius_km": sim["affected_radius_km"],
                "estimated_delay_mins": sim["estimated_delay_mins"]
            }
        })
        
    # Sort by impact score
    active.sort(key=lambda x: x["impact_score"], reverse=True)
    return active

def _generate_trend_forecast(current_score):
    """Generates a 6-hour forecast array."""
    forecast = []
    now = datetime.utcnow()
    score = current_score
    
    for i in range(6):
        forecast.append({
            "time": (now + timedelta(hours=i)).strftime("%H:00"),
            "predicted_score": round(max(1.0, min(10.0, score)), 1)
        })
        # Add random walk with slight mean reversion
        drift = (4.5 - score) * 0.2 + random.uniform(-1.0, 1.0)
        score += drift
        
    return forecast

def _generate_live_recommendations(active_events):
    """Generates ticker recommendations based on current state."""
    recs = []
    
    criticals = [e for e in active_events if e["severity"] == "CRITICAL"]
    if criticals:
        recs.append(f"URGENT: Deploy Level 3 response to {criticals[0]['location']} for {criticals[0]['cause'].replace('_', ' ')}.")
        
    highs = [e for e in active_events if e["severity"] == "HIGH"]
    if highs:
        recs.append(f"Activate VMS diversions for {highs[0]['corridor']} to mitigate {highs[0]['cause'].replace('_', ' ')}.")
        
    total_delay = sum(e["metrics"]["estimated_delay_mins"] for e in active_events)
    if total_delay > 100:
        recs.append("City-wide delay exceeds 100 mins. Consider extending green light phases on major arterial roads.")
        
    if not recs:
        recs.append("Traffic conditions stable. Maintain standard patrol routing.")
        recs.append("Review post-event logs from yesterday's deployments.")
        
    return recs
