"""
UrbanFlow Command Center — Explainable AI Command View (Phase 9)
Human-readable explanations from SHAP values.
"""

from . import ml_engine


def explain_prediction(event_data: dict) -> dict:
    """
    Generate human-readable explanation for a congestion prediction.

    Returns structured explanation with top drivers, natural language summary,
    and actionable insights.
    """
    # Get prediction
    prediction = ml_engine.predict_impact(event_data)
    score = prediction["score"]
    severity = prediction["severity_label"]
    confidence_score = prediction.get("confidence_score", 95.0)
    prediction_interval = prediction.get("prediction_interval", [max(1, score - 0.98), min(10, score + 0.98)])
    risk_level = prediction.get("risk_level", "MODERATE")

    # Get SHAP explanations
    shap_features = ml_engine.get_shap_explanation(event_data)

    # Build natural language explanation
    top_drivers = []
    total_impact = sum(abs(f["impact"]) for f in shap_features)
    for feat in shap_features[:5]:
        direction = "increased" if feat["direction"] == "increase" else "decreased"
        percentage = round((abs(feat["impact"]) / total_impact) * 100, 1) if total_impact > 0 else 0
        top_drivers.append({
            "factor": feat["feature"],
            "impact_magnitude": feat["impact"],
            "contribution_percentage": percentage,
            "direction": feat["direction"],
            "explanation": f"{feat['feature']} {direction} congestion impact by {feat['impact']:.2f} points ({percentage}%)",
        })

    # Generate human-readable summary
    if score >= 8:
        severity_text = "extremely severe"
        action_urgency = "IMMEDIATE"
    elif score >= 6:
        severity_text = "significant"
        action_urgency = "HIGH"
    elif score >= 4:
        severity_text = "moderate"
        action_urgency = "STANDARD"
    else:
        severity_text = "minor"
        action_urgency = "LOW"

    # Build narrative
    cause = event_data.get("event_cause", "incident")
    location = event_data.get("zone", "the area")

    increasing_factors = [d for d in top_drivers if d["direction"] == "increase"]
    decreasing_factors = [d for d in top_drivers if d["direction"] == "decrease"]

    narrative_parts = [
        f"This {cause.replace('_', ' ')} event in {location} is predicted to cause "
        f"{severity_text} congestion (score: {score}/10)."
    ]

    if increasing_factors:
        factor_names = [f["factor"] for f in increasing_factors[:3]]
        narrative_parts.append(
            f"The primary drivers of congestion are: {', '.join(factor_names)}."
        )

    if decreasing_factors:
        factor_names = [f["factor"] for f in decreasing_factors[:2]]
        narrative_parts.append(
            f"Factors mitigating impact: {', '.join(factor_names)}."
        )

    # Actionable insights
    insights = []
    for driver in top_drivers[:3]:
        if "Peak" in driver["factor"] and driver["direction"] == "increase":
            insights.append("Consider scheduling the event outside peak hours (8-11 AM, 5-8 PM) to reduce impact by ~15%")
        elif "Closure" in driver["factor"] and driver["direction"] == "increase":
            insights.append("Road closure is a major congestion driver. Consider partial closure or phased closure to reduce impact")
        elif "Priority" in driver["factor"] and driver["direction"] == "increase":
            insights.append("This high-priority corridor requires maximum resource deployment")
        elif "Zone" in driver["factor"]:
            insights.append(f"Historical data shows {driver['factor']} is a congestion hotspot — pre-deploy resources")
        elif "Corridor" in driver["factor"]:
            insights.append(f"{driver['factor']} typically experiences heavy traffic — activate diversion early")

    if not insights:
        insights.append("Deploy resources according to the optimization recommendations")
        insights.append("Monitor real-time traffic feeds for early warning of congestion buildup")

    # Generate Counterfactuals
    counterfactuals = []
    
    if event_data.get("attendance", 0) > 5000:
        cf_data = event_data.copy()
        cf_data["attendance"] = int(cf_data["attendance"] * 0.5)
        cf_score = ml_engine.predict_impact(cf_data)["score"]
        if score - cf_score > 0.3:
            counterfactuals.append(f"If attendance is reduced by 50%, congestion score drops to {cf_score} (-{round(score - cf_score, 1)}).")
            
    if event_data.get("is_peak_hour", False) or event_data.get("hour", 12) in [8,9,10,11, 17,18,19,20]:
        cf_data = event_data.copy()
        cf_data["hour"] = 14
        cf_score = ml_engine.predict_impact(cf_data)["score"]
        if score - cf_score > 0.3:
            counterfactuals.append(f"If rescheduled to off-peak hours (e.g., 2 PM), congestion score drops to {cf_score} (-{round(score - cf_score, 1)}).")
            
    if str(event_data.get("requires_road_closure", False)).upper() == "TRUE":
        cf_data = event_data.copy()
        cf_data["requires_road_closure"] = False
        cf_score = ml_engine.predict_impact(cf_data)["score"]
        if score - cf_score > 0.3:
            counterfactuals.append(f"If road closure is avoided, congestion score drops to {cf_score} (-{round(score - cf_score, 1)}).")

    return {
        "prediction": {
            "score": score,
            "severity_label": severity,
            "action_urgency": action_urgency,
            "risk_level": risk_level,
        },
        "top_drivers": top_drivers,
        "narrative": " ".join(narrative_parts),
        "actionable_insights": insights,
        "counterfactuals": counterfactuals,
        "confidence": {
            "score": confidence_score,
            "confidence_range": f"{prediction_interval[0]:.1f} - {prediction_interval[1]:.1f}",
            "reliability": "HIGH" if confidence_score > 80 else ("MODERATE" if confidence_score > 60 else "LOW"),
        },
        "methodology": "SHAP (SHapley Additive exPlanations) analysis of VotingRegressor ensemble (XGBoost + RandomForest)",
    }
