"""
UrbanFlow Command Center — Traffic Digital Twin Engine (Phase 1)
Simulates future event impact with congestion propagation modeling.
"""

import numpy as np
from . import ml_engine


def simulate_event(event_data: dict) -> dict:
    """
    Run a Digital Twin simulation for a planned/unplanned event.

    Input event_data keys:
        event_type, event_cause, attendance, latitude, longitude,
        start_time, end_time, requires_road_closure, priority,
        description, veh_type, zone, corridor

    Returns detailed simulation results including congestion propagation rings.
    """
    # --- Core ML prediction ---
    prediction = ml_engine.predict_impact(event_data)
    base_score = prediction["score"]
    severity = prediction["severity_label"]

    lat = float(event_data.get("latitude", 12.97))
    lng = float(event_data.get("longitude", 77.59))
    attendance = int(event_data.get("attendance", 1000))
    requires_closure = event_data.get("requires_road_closure", False)
    if isinstance(requires_closure, str):
        requires_closure = requires_closure.upper() == "TRUE"

    # --- Affected Radius Calculation ---
    # Based on crowd density modeling: ~2 persons/sq.m for events
    # Radius grows with sqrt of attendance
    base_radius_km = 0.5  # minimum 500m
    crowd_radius = np.sqrt(attendance / (2 * np.pi * 1000)) if attendance > 0 else 0
    affected_radius_km = round(base_radius_km + crowd_radius, 2)
    if requires_closure:
        affected_radius_km *= 1.4  # closure expands impact zone

    # --- Road Saturation Estimate ---
    # Bengaluru avg road capacity: ~1800 vehicles/hour/lane
    # Event-induced additional load based on attendance
    vehicles_generated = int(attendance * 0.3)  # 30% drive
    road_lanes_affected = max(2, int(affected_radius_km * 4))
    base_capacity = road_lanes_affected * 1800
    saturation_pct = min(100, round((vehicles_generated / max(base_capacity, 1)) * 100, 1))
    if requires_closure:
        saturation_pct = min(100, saturation_pct * 1.5)

    # --- Estimated Delay ---
    # BPR function: delay = free_flow_time * (1 + 0.15 * (V/C)^4)
    vc_ratio = saturation_pct / 100
    free_flow_mins = 15  # avg 15 min baseline trip
    delay_factor = 1 + 0.15 * (vc_ratio ** 4)
    estimated_delay_mins = round(free_flow_mins * (delay_factor - 1), 1)
    if base_score >= 8:
        estimated_delay_mins = max(estimated_delay_mins, 25)
    elif base_score >= 6:
        estimated_delay_mins = max(estimated_delay_mins, 12)

    # --- Traffic Load Increase ---
    traffic_load_increase_pct = round(min(300, attendance * 0.006 + base_score * 8), 1)

    # --- High Risk Corridors ---
    high_risk_corridors = _identify_risk_corridors(lat, lng, affected_radius_km, base_score)

    # --- Congestion Propagation Rings (for animation) ---
    propagation_rings = _generate_propagation_rings(
        lat, lng, affected_radius_km, base_score, attendance
    )

    # --- Time-series congestion forecast (next 6 hours) ---
    congestion_timeline = _generate_congestion_timeline(base_score, attendance)

    return {
        "congestion_score": base_score,
        "severity_label": severity,
        "affected_radius_km": affected_radius_km,
        "road_saturation_pct": saturation_pct,
        "estimated_delay_mins": estimated_delay_mins,
        "traffic_load_increase_pct": traffic_load_increase_pct,
        "vehicles_generated": vehicles_generated,
        "high_risk_corridors": high_risk_corridors,
        "propagation_rings": propagation_rings,
        "congestion_timeline": congestion_timeline,
        "center": {"lat": lat, "lng": lng},
    }


def _identify_risk_corridors(lat: float, lng: float, radius_km: float, score: float) -> list:
    """Identify high-risk corridors near the event based on historical data."""
    # Major Bengaluru corridors with approximate coordinates
    corridors = [
        {"name": "Outer Ring Road (ORR East)", "lat": 12.9352, "lng": 77.6245, "base_traffic": "Heavy"},
        {"name": "MG Road", "lat": 12.9757, "lng": 77.6065, "base_traffic": "Very Heavy"},
        {"name": "Hosur Road", "lat": 12.9165, "lng": 77.6101, "base_traffic": "Heavy"},
        {"name": "Bellary Road", "lat": 13.0050, "lng": 77.5736, "base_traffic": "Moderate"},
        {"name": "Tumkur Road", "lat": 13.0300, "lng": 77.5100, "base_traffic": "Heavy"},
        {"name": "Bannerghatta Road", "lat": 12.8898, "lng": 77.5969, "base_traffic": "Heavy"},
        {"name": "Old Airport Road", "lat": 12.9610, "lng": 77.6480, "base_traffic": "Moderate"},
        {"name": "Mysore Road", "lat": 12.9480, "lng": 77.5380, "base_traffic": "Moderate"},
        {"name": "Hennur Main Road", "lat": 13.0350, "lng": 77.6350, "base_traffic": "Moderate"},
        {"name": "Sarjapur Road", "lat": 12.9100, "lng": 77.6800, "base_traffic": "Heavy"},
    ]

    risk_corridors = []
    for c in corridors:
        dist = _haversine(lat, lng, c["lat"], c["lng"])
        if dist <= radius_km * 1.5:
            risk_level = "CRITICAL" if dist <= radius_km * 0.5 else (
                "HIGH" if dist <= radius_km else "MODERATE"
            )
            additional_delay = round(max(5, score * 3 * (1 - dist / (radius_km * 1.5 + 0.001))), 1)
            risk_corridors.append({
                "name": c["name"],
                "distance_km": round(dist, 2),
                "risk_level": risk_level,
                "base_traffic": c["base_traffic"],
                "additional_delay_mins": additional_delay,
            })

    risk_corridors.sort(key=lambda x: x["distance_km"])
    return risk_corridors[:5]


def _generate_propagation_rings(
    lat: float, lng: float, max_radius_km: float, score: float, attendance: int
) -> list:
    """Generate concentric congestion rings for animated visualization."""
    num_rings = 5
    rings = []
    for i in range(num_rings):
        ring_radius = max_radius_km * (i + 1) / num_rings
        # Intensity decreases with distance from center
        decay = 1 - (i / num_rings) ** 0.7
        intensity = round(score * decay, 2)
        color_intensity = max(0, min(255, int(255 * decay)))

        rings.append({
            "ring_index": i,
            "radius_km": round(ring_radius, 3),
            "radius_m": round(ring_radius * 1000, 0),
            "congestion_intensity": intensity,
            "color": f"rgba(255, {255 - color_intensity}, 0, {round(0.6 * decay, 2)})",
            "delay_seconds": round(intensity * 30, 0),
            "vehicles_affected": int(attendance * 0.3 * decay * (ring_radius / max_radius_km)),
        })

    return rings


def _generate_congestion_timeline(score: float, attendance: int) -> list:
    """Generate hour-by-hour congestion forecast for the next 6 hours."""
    timeline = []
    # Congestion curve: ramps up, peaks, then dissipates
    # Pattern: 30% → 60% → 100% → 90% → 60% → 30%
    pattern = [0.3, 0.6, 1.0, 0.9, 0.6, 0.3]
    labels = ["-2h", "-1h", "Event Start", "+1h", "+2h", "+3h"]

    for i, (mult, label) in enumerate(zip(pattern, labels)):
        timeline.append({
            "hour_label": label,
            "congestion_score": round(score * mult, 2),
            "vehicles_on_road": int(attendance * 0.3 * mult),
            "avg_speed_kmph": round(max(5, 40 * (1 - mult * 0.7)), 1),
        })

    return timeline


def _haversine(lat1, lng1, lat2, lng2):
    """Calculate distance between two points in km."""
    R = 6371
    dlat = np.radians(lat2 - lat1)
    dlng = np.radians(lng2 - lng1)
    a = (
        np.sin(dlat / 2) ** 2
        + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlng / 2) ** 2
    )
    return R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
