"""
UrbanFlow Command Center — Timeline Replay Engine (Priority 7)
Generates time-series data for scrubbing through past events.
"""
from . import ml_engine, digital_twin
import random
import math

def generate_timeline(event_data: dict) -> dict:
    """
    Simulates the lifecycle of a traffic event from T-60 mins to T+Duration.
    Generates discrete snapshots (frames) every 15 minutes.
    """
    duration_hours = event_data.get("duration_hours", 4.0)
    duration_mins = int(duration_hours * 60)
    
    # Base prediction to anchor the peak impact
    peak_pred = ml_engine.predict_impact(event_data)
    peak_score = peak_pred["score"]
    
    sim = digital_twin.simulate_event(event_data)
    peak_radius = sim["affected_radius_km"]
    
    # Define the time steps: T-60 to T+Duration+60 in 15 min increments
    frames = []
    
    start_offset = -60
    end_offset = duration_mins + 60
    step = 15
    
    lat = event_data.get("latitude", 12.97)
    lon = event_data.get("longitude", 77.59)
    
    for t in range(start_offset, end_offset + step, step):
        # Calculate impact curve
        if t < 0:
            # Build up phase (pre-event)
            progress = max(0, (60 + t) / 60)
            score = 2.0 + progress * (peak_score * 0.4 - 2.0)
            status = "BUILD_UP"
        elif t <= duration_mins:
            # Active phase
            progress = t / max(1, duration_mins)
            # Peak at 50% through the event
            curve = math.sin(progress * math.pi) 
            score = (peak_score * 0.4) + (peak_score * 0.6 * curve)
            status = "ACTIVE"
        else:
            # Recovery phase
            progress = (t - duration_mins) / 60
            score = peak_score * max(0, 1.0 - progress)
            status = "RECOVERY"
            
        score = max(1.0, min(10.0, score))
        radius = peak_radius * (score / peak_score)
        
        # Add random noise to make it look realistic
        score += random.uniform(-0.2, 0.2)
        score = max(1.0, min(10.0, score))
        
        frames.append({
            "time_offset_mins": t,
            "status": status,
            "metrics": {
                "congestion_score": round(score, 1),
                "affected_radius_km": round(radius, 2),
                "avg_speed_kmh": round(max(5.0, 40.0 - (score * 3.5)), 1),
                "estimated_delay_mins": round((score / 10.0) * sim["estimated_delay_mins"], 1)
            },
            "heatmap": _generate_heatmap_frame(lat, lon, radius, score)
        })
        
    return {
        "event_parameters": event_data,
        "peak_metrics": {
            "max_score": peak_score,
            "max_radius": peak_radius,
            "total_duration_mins": duration_mins
        },
        "frames": frames
    }

def _generate_heatmap_frame(center_lat, center_lon, radius_km, score):
    """Generates synthetic heatmap points for a specific frame."""
    points = []
    num_points = int(score * 12)
    
    if radius_km <= 0 or num_points <= 0:
        return []
        
    for _ in range(num_points):
        r = radius_km * math.sqrt(random.random()) / 111.0 
        theta = random.random() * 2 * math.pi
        
        lat = center_lat + r * math.cos(theta)
        lon = center_lon + r * math.sin(theta)
        
        dist = math.sqrt((lat - center_lat)**2 + (lon - center_lon)**2) * 111.0
        intensity = score * (1 - (dist / radius_km))
        
        points.append({
            "lat": round(lat, 5),
            "lng": round(lon, 5),
            "intensity": round(max(0.1, intensity), 2)
        })
        
    return points
