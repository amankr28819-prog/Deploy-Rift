"""
NER-SAFE Disaster Management System - AI Landslide Risk Service (V4 Intelligence)
Encapsulates verified friend V4 Landslide AI model pipeline.
Uses: backend/models/landslide_intelligence_model_v4.pkl
Applies verified decision threshold (0.2675), NA policy, and composite risk formulas.
"""

from __future__ import annotations

import os
import math
from pathlib import Path
from math import cos, exp, log1p, pi, radians, sin, sqrt
from typing import Any, Dict, Optional, List

import joblib
import numpy as np
import pandas as pd

from backend.factor_service import fetch_open_meteo_factors
from backend.northeast_data import reverse_lookup_northeast_location

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "landslide_intelligence_model_v4.pkl"

_MODEL_BUNDLE: Optional[Dict[str, Any]] = None


def is_na(x: Any) -> bool:
    """Checks if a value is NA or None without throwing type errors."""
    if x is None:
        return True
    try:
        return bool(pd.isna(x))
    except (TypeError, ValueError):
        return False


def get_model_bundle() -> Dict[str, Any]:
    """Loads and caches the verified V4 model bundle."""
    global _MODEL_BUNDLE
    if _MODEL_BUNDLE is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Verified V4 model bundle not found at {MODEL_PATH}."
            )
        _MODEL_BUNDLE = joblib.load(MODEL_PATH)
    return _MODEL_BUNDLE


def city_distance_km(lat: float, lon: float, city: dict) -> float:
    """Calculates haversine distance between coordinates and an urban center."""
    r = 6371.0088
    p1, p2 = radians(lat), radians(city["latitude"])
    dlat = radians(city["latitude"] - lat)
    dlon = radians(city["longitude"] - lon)
    a = sin(dlat / 2) ** 2 + cos(p1) * cos(p2) * sin(dlon / 2) ** 2
    return float(2 * r * np.arcsin(np.sqrt(np.clip(a, 0, 1))))


def nearest_urban_center(latitude: Any, longitude: Any, bundle: dict) -> dict[str, Any]:
    """Finds nearest reference urban center and urban school count."""
    if is_na(latitude) or is_na(longitude):
        return {
            "nearest_urban_center": "NA",
            "urban_center_state": "NA",
            "distance_to_urban_center_km": pd.NA,
            "urban_center_area_km2": pd.NA,
            "school_count_in_urban_footprint": pd.NA,
            "school_vulnerability_component": pd.NA,
            "area_vulnerability_component": pd.NA,
        }

    lat, lon = float(latitude), float(longitude)
    ranked = [(city_distance_km(lat, lon, c), c) for c in bundle["urban_centers"]]
    distance, city = min(ranked, key=lambda item: item[0])
    school_info = next(
        (s for s in bundle["urban_school_counts"] if s["city"] == city["city"]),
        None,
    )
    if school_info is None:
        return {
            "nearest_urban_center": city["city"],
            "urban_center_state": city["state"],
            "distance_to_urban_center_km": round(distance, 2),
            "urban_center_area_km2": city["area_km2"],
            "school_count_in_urban_footprint": pd.NA,
            "school_vulnerability_component": pd.NA,
            "area_vulnerability_component": pd.NA,
        }

    return {
        "nearest_urban_center": city["city"],
        "urban_center_state": city["state"],
        "distance_to_urban_center_km": round(distance, 2),
        "urban_center_area_km2": city["area_km2"],
        "school_count_in_urban_footprint": school_info["school_count"],
        "school_vulnerability_component": school_info["school_vulnerability_component"],
        "area_vulnerability_component": school_info["area_vulnerability_component"],
    }


def exposure_score(distance_km: Any, area_km2: Any, bundle: dict) -> Any:
    """Computes exposure score based on proximity and urban area proxy."""
    if is_na(distance_km) or is_na(area_km2):
        return pd.NA
    area, distance = float(area_km2), float(distance_km)
    radius = max(3.0, sqrt(area / pi))
    proximity = exp(-distance / radius)
    area_factor = 0.65 + 0.35 * (
        log1p(area) / log1p(bundle["max_urban_area_km2"])
    )
    return round(float(np.clip(100 * proximity * area_factor, 0, 100)), 2)


def vulnerability_score_from_school_data(
    school_count: Any, area_km2: Any, bundle: dict
) -> Any:
    """School count is primary vulnerability factor; urban area is secondary proxy."""
    if is_na(school_count) or is_na(area_km2):
        return pd.NA

    max_school = float(bundle["max_school_count"])
    max_area = float(bundle["max_urban_area_km2"])
    if max_school <= 0 or max_area <= 0:
        return pd.NA

    school_component = 100 * log1p(float(school_count)) / log1p(max_school)
    area_component = 100 * log1p(float(area_km2)) / log1p(max_area)

    score = 0.75 * school_component + 0.25 * area_component
    return round(float(np.clip(score, 0, 100)), 2)


def calculate_hazard(row: pd.Series, bundle: dict) -> Any:
    """Evaluates hazard using the V4 pipeline under strict complete-factors policy."""
    features = list(bundle["hazard_features"])
    values = {}

    for feature in features:
        value = row.get(feature, pd.NA)
        if is_na(value) or (isinstance(value, str) and value.strip().upper() == "NA"):
            return pd.NA
        values[feature] = value

    model = bundle["hazard_model"]
    probability = model.predict_proba(
        pd.DataFrame([values], columns=features)
    )[0, 1] * 100
    return round(float(probability), 2)


def calculate_pipeline_probability(row_dict: Dict[str, Any], bundle: dict) -> Optional[float]:
    """
    Evaluates XGBoost pipeline probability on available features.
    XGBoost natively handles missing=nan for passthrough numerics.
    """
    try:
        features = list(bundle["hazard_features"])
        prepared = {}
        for feat in features:
            v = row_dict.get(feat)
            if v is None or is_na(v) or v == "Unavailable":
                if feat in ["District", "State", "Material_Involved"]:
                    prepared[feat] = "Unknown"
                else:
                    prepared[feat] = np.nan
            else:
                if feat in ["District", "State", "Material_Involved"]:
                    prepared[feat] = str(v)
                else:
                    try:
                        prepared[feat] = float(v)
                    except (TypeError, ValueError):
                        prepared[feat] = np.nan

        df = pd.DataFrame([prepared], columns=features)
        proba = bundle["hazard_model"].predict_proba(df)[0, 1]
        return round(float(proba), 4)
    except Exception as e:
        print(f"[V4 Model] Pipeline probability error: {e}")
        return None


def overall_risk(hazard: Any, exposure: Any, vulnerability: Any) -> Any:
    """Computes overall risk score = Hazard * Exposure * Vulnerability / 10000."""
    if is_na(hazard) or is_na(exposure) or is_na(vulnerability):
        return pd.NA
    return round(
        float(hazard) * float(exposure) * float(vulnerability) / 10000,
        2,
    )


def risk_level(score: Any) -> str:
    """Maps composite score to RED, ORANGE, YELLOW, GREEN, or NA."""
    if is_na(score):
        return "NA"
    score = float(score)
    if score >= 70:
        return "RED"
    if score >= 45:
        return "ORANGE"
    if score >= 25:
        return "YELLOW"
    return "GREEN"


def explain(row: pd.Series, assessment: dict) -> str:
    """Constructs rule-based explanation signals using verified V4 criteria."""
    reasons = []

    if not is_na(assessment["hazard_score"]):
        for label, col, threshold in [
            ("High slope", "slope_deg", 30),
            ("High annual rainfall", "annual_rainfall_mm", 2000),
            ("High soil moisture", "soil_moisture_source_value", 65),
        ]:
            value = row.get(col, pd.NA)
            if not is_na(value) and float(value) >= threshold:
                reasons.append(label)

        ndvi = row.get("NDVI", pd.NA)
        if not is_na(ndvi) and float(ndvi) <= 0.30:
            reasons.append("Low vegetation signal")

        historical = row.get("historical_landslide_count", pd.NA)
        if not is_na(historical) and float(historical) >= 3:
            reasons.append("Repeated historical landslide activity")

    city = assessment["nearest_urban_center"]
    if city != "NA":
        schools = assessment["school_count_in_urban_footprint"]
        dist = assessment["distance_to_urban_center_km"]
        if not is_na(dist):
            reasons.append(f"{city} is the nearest reference urban centre ({dist:.2f} km away)")
        else:
            reasons.append(f"{city} is the nearest reference urban centre")
        if not is_na(schools):
            reasons.append(
                f"{int(schools)} urban schools are in the estimated {city} footprint"
            )

    if is_na(assessment["overall_risk_score"]):
        return (
            "Composite risk is NA because at least one required domain "
            "(Hazard, Exposure or Vulnerability) is unknown. "
            + ("Main signals: " + "; ".join(reasons[:6]) + "." if reasons else "")
        )

    return (
        f"Hazard={assessment['hazard_score']:.2f}/100, "
        f"Exposure={assessment['exposure_score']:.2f}/100, "
        f"Vulnerability={assessment['vulnerability_score']:.2f}/100. "
        + ("Main signals: " + "; ".join(reasons[:6]) + "." if reasons else "")
    )


def recommended_actions(assessment: dict) -> list[str]:
    """Generates actionable guidance based on risk level and key signals."""
    risk = assessment["overall_risk_score"]
    hazard = assessment["hazard_score"]

    if is_na(risk):
        return ["Collect the missing location/hazard information before issuing a composite risk level."]

    risk = float(risk)
    actions_list = []

    if risk >= 70:
        actions_list += [
            "Issue a priority warning and alert the nearest response team.",
            "Prepare alternate access or evacuation routes.",
            "Inspect drainage and nearby slope/road-cut sections.",
        ]
    elif risk >= 45:
        actions_list += [
            "Increase monitoring frequency.",
            "Inspect drainage and nearby slope/road-cut sections.",
        ]
    elif risk >= 25:
        actions_list.append("Maintain enhanced monitoring and verify local conditions.")
    else:
        actions_list.append("Continue routine monitoring.")

    if not is_na(hazard) and float(hazard) >= 70:
        actions_list.append("Prioritize field verification because Hazard is very high.")

    if not is_na(assessment["school_count_in_urban_footprint"]):
        if int(assessment["school_count_in_urban_footprint"]) >= 100:
            actions_list.append(
                "Prioritize schools in the identified urban area in the impact/readiness plan."
            )

    return list(dict.fromkeys(actions_list))


def assess_location(row: pd.Series, bundle: dict | None = None) -> dict[str, Any]:
    """Evaluates a single location using verified V4 formulas."""
    bundle = bundle or get_model_bundle()

    hazard = calculate_hazard(row, bundle)
    urban = nearest_urban_center(
        row.get("Latitude", pd.NA),
        row.get("Longitude", pd.NA),
        bundle,
    )

    exposure = exposure_score(
        urban["distance_to_urban_center_km"],
        urban["urban_center_area_km2"],
        bundle,
    )

    vulnerability = vulnerability_score_from_school_data(
        urban["school_count_in_urban_footprint"],
        urban["urban_center_area_km2"],
        bundle,
    )

    result = {
        "hazard_score": hazard,
        **urban,
        "exposure_score": exposure,
        "vulnerability_score": vulnerability,
    }
    result["overall_risk_score"] = overall_risk(hazard, exposure, vulnerability)
    result["overall_risk_level"] = risk_level(result["overall_risk_score"])
    result["risk_formula"] = "Hazard × Exposure × Vulnerability / 10000"
    result["explanation"] = explain(row, result)
    result["recommended_actions"] = recommended_actions(result)
    return result


def predict_ai_risk(
    latitude: float,
    longitude: float,
    overrides: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Main entry point for FastAPI AI Risk Prediction endpoint.
    Retrieves real environmental factors for given coordinates,
    runs verified V4 pipeline & assessment, and returns normalized payload.
    """
    # 1. Coordinate Validation
    if not (-90.0 <= latitude <= 90.0):
        raise ValueError(f"Latitude {latitude} is outside valid range [-90, 90].")
    if not (-180.0 <= longitude <= 180.0):
        raise ValueError(f"Longitude {longitude} is outside valid range [-180, 180].")

    bundle = get_model_bundle()
    overrides = overrides or {}

    # 2. Retrieve real available environmental factors
    elevation_val: Optional[float] = None
    soil_moisture_pct: Optional[float] = None
    weather_error = None

    try:
        meteo = fetch_open_meteo_factors(latitude, longitude)
        elevation_val = meteo.get("elevation_m")
        sm_vol = meteo.get("soil_moisture_m3_m3")
        if sm_vol is not None:
            soil_moisture_pct = round(sm_vol * 100.0, 2)
    except Exception as e:
        weather_error = str(e)

    # 3. Detect District and State via North-East reference database
    district_val = None
    state_val = None
    is_within_ner = False
    try:
        rev = reverse_lookup_northeast_location(latitude, longitude)
        if rev and rev.get("distance_km", 9999) < 250:
            district_val = rev.get("district")
            state_val = rev.get("state")
            is_within_ner = True
        else:
            district_val = rev.get("district") if rev else None
            state_val = rev.get("state") if rev else None
    except Exception as e:
        print(f"[V4 Model] Reverse lookup error: {e}")

    # 4. Construct feature dictionary for all 12 V4 inputs
    factors_raw: Dict[str, Any] = {
        "District": overrides.get("district") or district_val or pd.NA,
        "State": overrides.get("state") or state_val or pd.NA,
        "Material_Involved": overrides.get("material_involved") or pd.NA,
        "elevation_m": overrides.get("elevation_m") if overrides.get("elevation_m") is not None else (elevation_val if elevation_val is not None else pd.NA),
        "slope_deg": overrides.get("slope_deg") if overrides.get("slope_deg") is not None else pd.NA,
        "aspect_deg": overrides.get("aspect_deg") if overrides.get("aspect_deg") is not None else pd.NA,
        "annual_rainfall_mm": overrides.get("annual_rainfall_mm") if overrides.get("annual_rainfall_mm") is not None else pd.NA,
        "landcover_class": overrides.get("landcover_class") if overrides.get("landcover_class") is not None else pd.NA,
        "soil_moisture_source_value": overrides.get("soil_moisture_source_value") if overrides.get("soil_moisture_source_value") is not None else (soil_moisture_pct if soil_moisture_pct is not None else pd.NA),
        "NDVI": overrides.get("ndvi") if overrides.get("ndvi") is not None else pd.NA,
        "Latitude": latitude,
        "Longitude": longitude,
    }

    row_series = pd.Series(factors_raw)

    # 5. Run official V4 assessment
    v4_assessment = assess_location(row_series, bundle)

    # 6. Run XGBoost pipeline probability for model output
    raw_prob = calculate_pipeline_probability(factors_raw, bundle)
    threshold = float(bundle.get("decision_threshold", 0.2675))

    is_threshold_exceeded = (raw_prob is not None and raw_prob >= threshold)
    predicted_class = 1 if is_threshold_exceeded else 0
    predicted_label = (
        "Landslide Hazard Triggered (Above Decision Threshold)"
        if is_threshold_exceeded
        else "Sub-Threshold (Below Decision Threshold)"
    )

    # Factor availability metadata
    factor_display: Dict[str, Any] = {}
    factor_availability: Dict[str, Dict[str, Any]] = {}

    status_reasons = {
        "slope_deg": "DEM terrain raster processing not configured locally",
        "aspect_deg": "DEM terrain raster processing not configured locally",
        "annual_rainfall_mm": "Long-term climatological rainfall raster not configured locally",
        "landcover_class": "ESA WorldCover offline raster not configured locally",
        "NDVI": "Sentinel-2 / MODIS NDVI raster not configured locally",
        "Material_Involved": "Geological Survey of India lithological field dataset not configured locally",
    }

    for feat in bundle["hazard_features"]:
        val = factors_raw.get(feat)
        if is_na(val):
            factor_display[feat] = "Unavailable"
            factor_availability[feat] = {
                "available": False,
                "value": None,
                "reason": status_reasons.get(feat, "Factor unavailable locally")
            }
        else:
            factor_display[feat] = val
            factor_availability[feat] = {
                "available": True,
                "value": val,
                "source": "Live Service / User Override"
            }

    def json_safe(val: Any) -> Any:
        if is_na(val):
            return None
        if isinstance(val, (np.floating, float)):
            return round(float(val), 2)
        if isinstance(val, (np.integer, int)):
            return int(val)
        return val

    assessment_safe = {
        "hazard_score": json_safe(v4_assessment["hazard_score"]),
        "nearest_urban_center": v4_assessment["nearest_urban_center"],
        "urban_center_state": v4_assessment["urban_center_state"],
        "distance_to_urban_center_km": json_safe(v4_assessment["distance_to_urban_center_km"]),
        "urban_center_area_km2": json_safe(v4_assessment["urban_center_area_km2"]),
        "school_count_in_urban_footprint": json_safe(v4_assessment["school_count_in_urban_footprint"]),
        "exposure_score": json_safe(v4_assessment["exposure_score"]),
        "vulnerability_score": json_safe(v4_assessment["vulnerability_score"]),
        "overall_risk_score": json_safe(v4_assessment["overall_risk_score"]),
        "overall_risk_level": v4_assessment["overall_risk_level"],
        "risk_formula": v4_assessment["risk_formula"],
        "explanation": v4_assessment["explanation"],
        "explanation_type": "V4 explanation signal",
        "recommended_actions": v4_assessment["recommended_actions"],
    }

    all_features_present = all(
        not is_na(factors_raw.get(feat)) for feat in bundle["hazard_features"]
    )

    data_status = (
        "Complete (All 12 factors available)"
        if all_features_present
        else "Partial Environmental Data (Unconfigured factors marked Unavailable)"
    )

    return {
        "status": "success",
        "model_info": {
            "model_version": bundle.get("model_version", "landslide_intelligence_model_v4"),
            "hazard_model_version": bundle.get("hazard_model_version", "landslide_model_real_v2"),
            "decision_threshold": threshold,
            "target_classes": [0, 1],
            "feature_count": len(bundle["hazard_features"]),
        },
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "is_within_northeast": is_within_ner,
            "detected_district": district_val,
            "detected_state": state_val,
        },
        "prediction": {
            "hazard_probability": raw_prob,
            "hazard_probability_pct": round(raw_prob * 100.0, 2) if raw_prob is not None else None,
            "predicted_class": predicted_class,
            "predicted_label": predicted_label,
            "decision_threshold": threshold,
            "decision_threshold_pct": round(threshold * 100.0, 2),
            "is_threshold_exceeded": is_threshold_exceeded,
            "risk_category": v4_assessment["overall_risk_level"],
            "data_availability_status": data_status,
            "is_composite_risk_available": not is_na(v4_assessment["overall_risk_score"]),
        },
        "assessment": assessment_safe,
        "factors": factor_display,
        "factor_details": factor_availability,
    }
