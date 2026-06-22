"""
UrbanFlow Command Center — Economic Impact Engine (Phase 7)
Calculates delay costs, fuel waste, productivity loss with AI vs without-AI comparison.
"""

import numpy as np


# Indian traffic economics parameters
AVG_HOURLY_PRODUCTIVITY_INR = 250       # ₹250/hr per person
AVG_FUEL_COST_PER_KM_INR = 10          # ₹10/km fuel cost
AVG_VEHICLES_PER_KM = 500              # vehicles per km of affected road
AVG_OCCUPANCY = 1.8                    # persons per vehicle
AVG_TRIP_DISTANCE_KM = 8              # average trip length
FUEL_IDLE_RATE_LITRE_PER_HR = 1.5     # litres/hr idle consumption
FUEL_PRICE_PER_LITRE = 105            # ₹105/litre petrol (Bengaluru avg)
CO2_PER_LITRE_KG = 2.31              # kg CO2 per litre petrol


def calculate_economic_impact(event_data: dict) -> dict:
    """
    Calculate economic impact of traffic congestion with and without AI intervention.

    Input:
        congestion_score: float (1-10)
        affected_radius_km: float
        estimated_delay_mins: float
        attendance: int
        duration_hours: float
        deployment_cost: float (from optimizer)

    Returns comprehensive economic analysis.
    """
    score = float(event_data.get("congestion_score", 5.0))
    radius_km = float(event_data.get("affected_radius_km", 1.5))
    delay_mins = float(event_data.get("estimated_delay_mins", 15))
    attendance = int(event_data.get("attendance", 5000))
    duration_hours = float(event_data.get("duration_hours", 4))
    deployment_cost = float(event_data.get("deployment_cost", 50000))

    # --- WITHOUT AI (reactive response) ---
    # Reactive response adds 45-90 mins before any action
    reactive_delay_mins = delay_mins + 45 + (score * 5)
    reactive_duration_hours = duration_hours * 1.5  # events last 50% longer without proactive management

    # Affected road km
    affected_road_km = 2 * np.pi * radius_km * 0.6  # ~60% of circumference is road

    # Vehicles affected
    vehicles_affected_reactive = int(affected_road_km * AVG_VEHICLES_PER_KM * reactive_duration_hours / 2)
    people_affected_reactive = int(vehicles_affected_reactive * AVG_OCCUPANCY)

    # Delay cost (without AI)
    delay_hours_reactive = reactive_delay_mins / 60
    delay_cost_reactive = people_affected_reactive * delay_hours_reactive * AVG_HOURLY_PRODUCTIVITY_INR

    # Fuel waste (without AI)
    fuel_litres_reactive = vehicles_affected_reactive * FUEL_IDLE_RATE_LITRE_PER_HR * delay_hours_reactive * 0.3
    fuel_cost_reactive = fuel_litres_reactive * FUEL_PRICE_PER_LITRE

    # CO2 emissions
    co2_kg_reactive = fuel_litres_reactive * CO2_PER_LITRE_KG

    total_cost_without_ai = delay_cost_reactive + fuel_cost_reactive

    # --- WITH AI (proactive response) ---
    # AI reduces delay by 40-60% through proactive deployment
    ai_delay_reduction = 0.4 + (score / 10) * 0.2  # 40-60% reduction
    proactive_delay_mins = delay_mins * (1 - ai_delay_reduction)
    proactive_duration_hours = duration_hours  # no extra time with proactive management

    vehicles_affected_ai = int(affected_road_km * AVG_VEHICLES_PER_KM * proactive_duration_hours / 2)
    people_affected_ai = int(vehicles_affected_ai * AVG_OCCUPANCY)

    delay_hours_ai = proactive_delay_mins / 60
    delay_cost_ai = people_affected_ai * delay_hours_ai * AVG_HOURLY_PRODUCTIVITY_INR
    fuel_litres_ai = vehicles_affected_ai * FUEL_IDLE_RATE_LITRE_PER_HR * delay_hours_ai * 0.3
    fuel_cost_ai = fuel_litres_ai * FUEL_PRICE_PER_LITRE
    co2_kg_ai = fuel_litres_ai * CO2_PER_LITRE_KG

    total_cost_with_ai = delay_cost_ai + fuel_cost_ai + deployment_cost

    # --- Savings ---
    total_savings = total_cost_without_ai - total_cost_with_ai
    savings_pct = round((total_savings / max(total_cost_without_ai, 1)) * 100, 1)
    co2_saved = co2_kg_reactive - co2_kg_ai

    return {
        "without_ai": {
            "delay_cost_inr": round(delay_cost_reactive),
            "fuel_waste_inr": round(fuel_cost_reactive),
            "total_cost_inr": round(total_cost_without_ai),
            "total_cost_lakhs": round(total_cost_without_ai / 100000, 2),
            "vehicles_affected": vehicles_affected_reactive,
            "people_affected": people_affected_reactive,
            "avg_delay_mins": round(reactive_delay_mins, 1),
            "response_time_mins": 45,
            "co2_emissions_kg": round(co2_kg_reactive, 1),
            "fuel_wasted_litres": round(fuel_litres_reactive, 1),
        },
        "with_ai": {
            "delay_cost_inr": round(delay_cost_ai),
            "fuel_waste_inr": round(fuel_cost_ai),
            "deployment_cost_inr": round(deployment_cost),
            "total_cost_inr": round(total_cost_with_ai),
            "total_cost_lakhs": round(total_cost_with_ai / 100000, 2),
            "vehicles_affected": vehicles_affected_ai,
            "people_affected": people_affected_ai,
            "avg_delay_mins": round(proactive_delay_mins, 1),
            "response_time_mins": 5,
            "co2_emissions_kg": round(co2_kg_ai, 1),
            "fuel_wasted_litres": round(fuel_litres_ai, 1),
        },
        "savings": {
            "total_savings_inr": round(max(0, total_savings)),
            "total_savings_lakhs": round(max(0, total_savings) / 100000, 2),
            "savings_percentage": max(0, savings_pct),
            "delay_reduction_pct": round(ai_delay_reduction * 100, 1),
            "co2_saved_kg": round(max(0, co2_saved), 1),
            "fuel_saved_litres": round(max(0, fuel_litres_reactive - fuel_litres_ai), 1),
            "additional_vehicles_served": max(0, vehicles_affected_reactive - vehicles_affected_ai),
        },
        "summary": {
            "headline": f"AI saves ₹{round(max(0, total_savings) / 100000, 1)} Lakhs ({max(0, savings_pct):.0f}% reduction)",
            "delay_headline": f"Average delay reduced from {round(reactive_delay_mins)}min to {round(proactive_delay_mins)}min",
            "environmental_headline": f"{round(max(0, co2_saved), 1)} kg CO₂ emissions prevented",
        },
    }
