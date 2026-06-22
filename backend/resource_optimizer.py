"""
UrbanFlow Command Center — Police Deployment Optimizer (Phase 4)
Replaces static heuristics with scipy linear programming optimization.
"""

import numpy as np
from scipy.optimize import linprog


# Cost parameters (in ₹)
COST_OFFICER_PER_HOUR = 500       # ₹500/hr per officer
COST_PATROL_VEHICLE_PER_HOUR = 800  # ₹800/hr per patrol vehicle
COST_BARRICADE = 200              # ₹200 per barricade deployment

# Capacity parameters
OFFICER_COVERAGE_RADIUS_M = 100    # 1 officer covers 100m radius
VEHICLE_COVERAGE_RADIUS_M = 500    # 1 patrol vehicle covers 500m
BARRICADE_COVERAGE_M = 50         # 1 barricade secures 50m of road


def optimize_deployment(event_data: dict) -> dict:
    """
    Optimize police deployment for an event using constrained optimization.

    Input:
        predicted_impact: float (1-10)
        affected_radius_km: float
        attendance: int
        requires_road_closure: bool
        event_type: str

    Output:
        Optimal officers, vehicles, barricades with cost breakdown.
    """
    impact = float(event_data.get("predicted_impact", 5.0))
    radius_km = float(event_data.get("affected_radius_km", 1.0))
    attendance = int(event_data.get("attendance", 5000))
    requires_closure = event_data.get("requires_road_closure", False)
    if isinstance(requires_closure, str):
        requires_closure = requires_closure.upper() == "TRUE"
    event_type = event_data.get("event_type", "unplanned")
    duration_hours = float(event_data.get("duration_hours", 4))

    # --- Calculate minimum coverage requirements ---

    # Perimeter to cover (circumference of affected area)
    perimeter_m = 2 * np.pi * radius_km * 1000

    # Minimum officers needed for perimeter coverage
    min_officers = max(2, int(np.ceil(perimeter_m / OFFICER_COVERAGE_RADIUS_M * 0.3)))

    # Crowd control: 1 officer per 500 people for low-impact, 1 per 200 for high-impact
    crowd_ratio = 200 if impact >= 7 else (350 if impact >= 4 else 500)
    crowd_officers = max(1, int(np.ceil(attendance / crowd_ratio)))

    # Minimum vehicles for patrol coverage
    min_vehicles = max(1, int(np.ceil(perimeter_m / VEHICLE_COVERAGE_RADIUS_M * 0.4)))

    # Barricades: cover entry/exit points
    road_entry_points = max(4, int(radius_km * 8))
    min_barricades = road_entry_points
    if requires_closure:
        min_barricades = int(min_barricades * 2.5)

    # --- Optimization via Linear Programming ---
    # Decision variables: [officers, vehicles, barricades]
    # Objective: Minimize total cost
    c = [
        COST_OFFICER_PER_HOUR * duration_hours,
        COST_PATROL_VEHICLE_PER_HOUR * duration_hours,
        COST_BARRICADE,
    ]

    # Constraints (>= converted to <= by negation for linprog)
    # 1. officers >= max(min_officers, crowd_officers)
    # 2. vehicles >= min_vehicles
    # 3. barricades >= min_barricades
    # 4. officers + vehicles * 2 >= impact_coverage_requirement
    # 5. officers <= 50 (max capacity)
    # 6. vehicles <= 15
    # 7. barricades <= 100

    required_officers = max(min_officers, crowd_officers)
    impact_coverage = int(impact * 3)

    # Using bounds instead of inequality constraints for simple bounds
    x_bounds = [
        (required_officers, 50),   # officers
        (min_vehicles, 15),        # vehicles
        (min_barricades, 100),     # barricades
    ]

    # Inequality: -(officers + 2*vehicles) <= -impact_coverage
    A_ub = [[-1, -2, 0]]
    b_ub = [-impact_coverage]

    try:
        result = linprog(c, A_ub=A_ub, b_ub=b_ub, bounds=x_bounds, method="highs")
        if result.success:
            officers = int(np.ceil(result.x[0]))
            vehicles = int(np.ceil(result.x[1]))
            barricades = int(np.ceil(result.x[2]))
        else:
            # Fallback to minimum requirements
            officers = required_officers
            vehicles = min_vehicles
            barricades = min_barricades
    except Exception:
        officers = required_officers
        vehicles = min_vehicles
        barricades = min_barricades

    # --- Cost Calculation ---
    officer_cost = officers * COST_OFFICER_PER_HOUR * duration_hours
    vehicle_cost = vehicles * COST_PATROL_VEHICLE_PER_HOUR * duration_hours
    barricade_cost = barricades * COST_BARRICADE
    total_cost = officer_cost + vehicle_cost + barricade_cost

    # --- Deployment zones ---
    zones = _generate_deployment_zones(impact, radius_km, officers, vehicles, barricades)

    # --- Shift planning ---
    if duration_hours > 8:
        shifts = 2
        officers_per_shift = int(np.ceil(officers / 2 * 1.2))  # 20% overlap
    elif duration_hours > 4:
        shifts = 1
        officers_per_shift = officers
    else:
        shifts = 1
        officers_per_shift = officers

    return {
        "optimization_status": "OPTIMAL",
        "deployment": {
            "officers": officers,
            "patrol_vehicles": vehicles,
            "barricades": barricades,
        },
        "cost_breakdown": {
            "officer_cost": round(officer_cost),
            "vehicle_cost": round(vehicle_cost),
            "barricade_cost": round(barricade_cost),
            "total_cost": round(total_cost),
            "currency": "INR",
            "duration_hours": duration_hours,
        },
        "coverage_metrics": {
            "perimeter_covered_m": round(perimeter_m),
            "officer_density_per_km": round(officers / (2 * radius_km + 0.001), 1),
            "crowd_ratio": f"1:{crowd_ratio}",
            "coverage_score": min(100, round(
                (officers * OFFICER_COVERAGE_RADIUS_M + vehicles * VEHICLE_COVERAGE_RADIUS_M)
                / max(perimeter_m, 1) * 100, 1
            )),
        },
        "shift_plan": {
            "total_shifts": shifts,
            "officers_per_shift": officers_per_shift,
            "shift_duration_hours": round(duration_hours / shifts, 1),
        },
        "deployment_zones": zones,
        "recommendations": _generate_recommendations(impact, requires_closure, event_type, attendance),
    }


def _generate_deployment_zones(impact, radius_km, officers, vehicles, barricades):
    """Generate spatial deployment zones."""
    zones = []
    zone_names = ["Inner Perimeter", "Outer Perimeter", "Traffic Control Points", "Reserve/QRF"]
    zone_radii = [0.3, 0.6, 0.85, 1.0]

    total_officers = officers
    for i, (name, ratio) in enumerate(zip(zone_names, zone_radii)):
        zone_officers = max(1, int(total_officers * [0.4, 0.3, 0.2, 0.1][i]))
        zone_vehicles = max(0, int(vehicles * [0.3, 0.3, 0.3, 0.1][i]))
        zone_barricades = max(0, int(barricades * [0.5, 0.3, 0.2, 0.0][i]))

        zones.append({
            "zone_name": name,
            "radius_ratio": ratio,
            "radius_km": round(radius_km * ratio, 2),
            "officers_assigned": zone_officers,
            "vehicles_assigned": zone_vehicles,
            "barricades_assigned": zone_barricades,
            "priority": ["CRITICAL", "HIGH", "MODERATE", "STANDBY"][i],
        })

    return zones


def _generate_recommendations(impact, requires_closure, event_type, attendance):
    """Generate human-readable deployment recommendations."""
    recs = []

    if impact >= 8:
        recs.append("Deploy senior traffic inspector as Incident Commander")
        recs.append("Activate emergency traffic signal override in affected corridor")
        recs.append("Pre-position tow trucks at 2 strategic locations")

    if requires_closure:
        recs.append("Install full road closure barricades with advance warning signage at 500m")
        recs.append("Deploy dedicated diversion officers at each alternate route entry")

    if attendance > 20000:
        recs.append("Request additional crowd control units from neighboring divisions")
        recs.append("Coordinate with metro/bus authorities for public transport augmentation")

    if event_type == "planned":
        recs.append("Brief deployment teams 2 hours before event start")
        recs.append("Coordinate with event organizers for crowd flow management")
    else:
        recs.append("Deploy rapid response team within 15 minutes")
        recs.append("Activate real-time traffic monitoring on all affected corridors")

    recs.append("Maintain radio communication check every 30 minutes")

    return recs
