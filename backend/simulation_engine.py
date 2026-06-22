"""
UrbanFlow Command Center — What-If Simulation Engine (Phase 2)
Multi-scenario comparison for decision support.
"""

from . import digital_twin


def run_scenarios(base_event: dict, attendance_variants: list[int] | None = None) -> dict:
    """
    Run multiple attendance scenarios through the Digital Twin.

    If attendance_variants is None, defaults to [0.6x, 1.0x, 1.6x] of base attendance.

    Returns comparative matrix with side-by-side metrics.
    """
    base_attendance = int(base_event.get("attendance", 10000))

    if attendance_variants is None:
        attendance_variants = [
            int(base_attendance * 0.6),
            base_attendance,
            int(base_attendance * 1.6),
        ]

    scenario_labels = ["Conservative", "Expected", "Worst Case"]
    if len(attendance_variants) > 3:
        scenario_labels = [f"Scenario {i+1}" for i in range(len(attendance_variants))]

    scenarios = []
    for i, att in enumerate(attendance_variants):
        event_copy = {**base_event, "attendance": att}
        result = digital_twin.simulate_event(event_copy)

        label = scenario_labels[i] if i < len(scenario_labels) else f"Scenario {i+1}"
        scenarios.append({
            "label": label,
            "attendance": att,
            "congestion_score": result["congestion_score"],
            "severity_label": result["severity_label"],
            "affected_radius_km": result["affected_radius_km"],
            "road_saturation_pct": result["road_saturation_pct"],
            "estimated_delay_mins": result["estimated_delay_mins"],
            "traffic_load_increase_pct": result["traffic_load_increase_pct"],
            "vehicles_generated": result["vehicles_generated"],
            "high_risk_corridors": len(result["high_risk_corridors"]),
            "propagation_rings": result["propagation_rings"],
            "congestion_timeline": result["congestion_timeline"],
        })

    # Compute deltas between scenarios
    if len(scenarios) >= 2:
        base_scenario = scenarios[0]
        for s in scenarios[1:]:
            s["delta_congestion"] = round(
                s["congestion_score"] - base_scenario["congestion_score"], 2
            )
            s["delta_delay"] = round(
                s["estimated_delay_mins"] - base_scenario["estimated_delay_mins"], 1
            )
            s["delta_saturation"] = round(
                s["road_saturation_pct"] - base_scenario["road_saturation_pct"], 1
            )

    # Summary comparison
    comparison = {
        "metric_names": [
            "Congestion Score",
            "Delay (mins)",
            "Saturation (%)",
            "Affected Radius (km)",
            "Vehicles Generated",
        ],
        "scenario_data": [
            {
                "label": s["label"],
                "attendance": s["attendance"],
                "values": [
                    s["congestion_score"],
                    s["estimated_delay_mins"],
                    s["road_saturation_pct"],
                    s["affected_radius_km"],
                    s["vehicles_generated"],
                ],
            }
            for s in scenarios
        ],
    }

    return {
        "base_event": {
            "event_cause": base_event.get("event_cause", "unknown"),
            "latitude": base_event.get("latitude"),
            "longitude": base_event.get("longitude"),
        },
        "scenarios": scenarios,
        "comparison": comparison,
    }
