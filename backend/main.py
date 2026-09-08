"""
NER-SAFE Disaster Management System - Main FastAPI Backend Server
Ministry of Development of North Eastern Region (MDoNER) - SIH 2026 PS 26001
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from typing import Optional, List

from backend.mock_data import (
    NER_STATES, LOCATIONS, INFRASTRUCTURE_ASSETS, 
    HISTORICAL_ANALYTICS, MULTILINGUAL_TRANSLATIONS
)
from backend.ml_engine import predict_landslide_risk
from backend.demo_engine import demo_engine_instance
from backend.factor_service import get_location_landslide_factors
from backend.northeast_data import (
    get_states as get_ne_states, get_districts_by_state, resolve_district_location,
    reverse_lookup_northeast_location, STATE_CENTROIDS
)
from backend.weather_service import (
    fetch_comprehensive_weather, fetch_state_district_comparison
)
from backend.ai_risk_service import predict_ai_risk, get_model_bundle
from backend.gis_service import get_filtered_district_risk_geojson
from backend.source_registry import SOURCE_REGISTRY, build_provenance, get_source

app = FastAPI(
    title="NER-SAFE API Server",
    description="North Eastern Region – Smart AI-based Forecasting & Emergency System",
    version="1.0.0"
)

# Serves static frontend files
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Models
class RiskPredictRequest(BaseModel):
    rainfall: float
    soilMoisture: float
    slope: float
    elevation: Optional[float] = 1200.0
    historicalRisk: Optional[float] = 70.0
    satelliteRisk: Optional[float] = 60.0

class AiRiskPredictRequest(BaseModel):
    latitude: float
    longitude: float
    district: Optional[str] = None
    state: Optional[str] = None
    material_involved: Optional[str] = None
    elevation_m: Optional[float] = None
    slope_deg: Optional[float] = None
    aspect_deg: Optional[float] = None
    annual_rainfall_mm: Optional[float] = None
    landcover_class: Optional[float] = None
    soil_moisture_source_value: Optional[float] = None
    ndvi: Optional[float] = None

class FieldReportRequest(BaseModel):
    reporterName: str
    reporterRole: str
    incidentType: str
    locationName: str
    lat: float
    lng: float
    severity: str
    description: str
    photoBase64: Optional[str] = None

# Store field reports in memory
FIELD_REPORTS_DB = [
    {
        "id": "report-101",
        "reporterName": "Officer T. Zothan",
        "reporterRole": "FIELD OFFICER",
        "incidentType": "Road Blockage & Mudslide",
        "locationName": "NH-6 Km 42 (Aizawl Link)",
        "lat": 23.73,
        "lng": 92.72,
        "severity": "High",
        "status": "Verified",
        "submittedAgo": "18 minutes ago",
        "description": "Debris and mud accumulation blocking northbound lane after continuous 120mm rainfall."
    },
    {
        "id": "report-102",
        "reporterName": "Citizen L. Sangma",
        "reporterRole": "CITIZEN",
        "incidentType": "Soil Crack",
        "locationName": "Haflong Valley Hill Cut",
        "lat": 25.18,
        "lng": 93.02,
        "severity": "Critical",
        "status": "Under Review",
        "submittedAgo": "35 minutes ago",
        "description": "Noticeable 4-inch deep crack formed across hill retaining wall near school footpath."
    }
]

@app.get("/", response_class=HTMLResponse)
def read_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return "<h1>NER-SAFE Platform Initializing...</h1>"

@app.get("/api/states")
def get_states():
    return {"states": NER_STATES}

@app.get("/api/locations")
def get_locations():
    return {"locations": LOCATIONS}

@app.post("/api/predict-risk")
def predict_risk_api(req: RiskPredictRequest):
    res = predict_landslide_risk(
        rainfall_24h=req.rainfall,
        soil_moisture=req.soilMoisture,
        slope_deg=req.slope,
        elevation_m=req.elevation or 1200.0,
        historical_risk_score=req.historicalRisk or 70.0,
        satellite_risk_score=req.satelliteRisk or 60.0
    )
    return res

@app.get("/api/risk/factors")
def get_risk_factors_endpoint(lat: float, lon: float):
    """
    Returns normalized location-based landslide factors for the specified coordinates.
    Validates coordinates, fetches external APIs with partial-failure tolerance, and returns factor cards.
    Does NOT calculate any risk scores or predictions.
    """
    if lat < -90.0 or lat > 90.0:
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90 degrees.")
    if lon < -180.0 or lon > 180.0:
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180 degrees.")
    try:
        factors = get_location_landslide_factors(lat, lon)
        return factors
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve factors: {str(e)}")

# ==========================================
# V4 LANDSLIDE AI PREDICTION APIS
# ==========================================

@app.post("/api/ai-risk/predict")
def predict_ai_risk_endpoint(req: AiRiskPredictRequest):
    """
    Evaluates landslide risk using the verified Friend V4 Landslide AI model pipeline.
    Accepts latitude & longitude, retrieves real available factors from central gateway,
    evaluates Hazard, Exposure, Vulnerability, and composite Overall Risk using verified
    decision threshold (0.2675), NA policy, and explanation signals.
    """
    if req.latitude < -90.0 or req.latitude > 90.0:
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90 degrees.")
    if req.longitude < -180.0 or req.longitude > 180.0:
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180 degrees.")
    try:
        req_dict = req.dict()
        overrides = {
            k: v for k, v in req_dict.items()
            if k not in ["latitude", "longitude"] and v is not None
        }
        result = predict_ai_risk(req.latitude, req.longitude, overrides=overrides)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Risk prediction failed: {str(e)}")

@app.get("/api/ai-risk/model-info")
def get_ai_risk_model_info_endpoint():
    """Returns metadata for the verified V4 Landslide Intelligence model."""
    try:
        bundle = get_model_bundle()
        return {
            "model_version": bundle.get("model_version", "landslide_intelligence_model_v4"),
            "hazard_model_version": bundle.get("hazard_model_version", "landslide_model_real_v2"),
            "decision_threshold": bundle.get("decision_threshold", 0.2675),
            "hazard_features": list(bundle.get("hazard_features", [])),
            "feature_count": len(bundle.get("hazard_features", [])),
            "urban_center_count": len(bundle.get("urban_centers", [])),
            "status": "ready"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load V4 model bundle: {str(e)}")

# ==========================================
# NORTH-EAST INDIA GEOGRAPHIC APIS
# ==========================================

@app.get("/api/northeast/states")
def get_northeast_states_endpoint():
    """Returns all 8 North Eastern states."""
    return {"states": get_ne_states()}

@app.get("/api/northeast/districts")
def get_northeast_districts_endpoint(state: str):
    """Returns the complete current list of districts for the selected state."""
    districts = get_districts_by_state(state)
    if not districts:
        raise HTTPException(status_code=404, detail=f"State '{state}' not found in North Eastern Region.")
    return {"state": state, "districts": districts, "total": len(districts)}

@app.get("/api/northeast/location")
def get_northeast_district_location_endpoint(state: str, district: str):
    """Resolves state + district to official centroid coordinates."""
    loc = resolve_district_location(state, district)
    if not loc:
        raise HTTPException(status_code=404, detail=f"District '{district}' in state '{state}' not found.")
    return loc

@app.get("/api/northeast/reverse")
def reverse_lookup_location_endpoint(lat: float, lon: float):
    """Reverse geocodes latitude/longitude to the nearest North Eastern district."""
    if lat < -90.0 or lat > 90.0 or lon < -180.0 or lon > 180.0:
        raise HTTPException(status_code=400, detail="Invalid coordinates.")
    return reverse_lookup_northeast_location(lat, lon)

@app.get("/api/northeast/overview")
def get_northeast_overview_endpoint():
    """Returns 8-state overview with capitals and centroids."""
    return {"states": STATE_CENTROIDS}

# ==========================================
# WEATHER & RAINFALL ANALYTICS APIS
# ==========================================

@app.get("/api/weather/comprehensive")
def get_weather_comprehensive_endpoint(
    lat: float, 
    lon: float, 
    state: Optional[str] = None, 
    district: Optional[str] = None,
    force: bool = False
):
    """
    Returns full weather analytics payload for coordinates:
    - Current weather conditions (temp, humidity, wind, rainfall, WMO condition)
    - Past 7 days daily observation series
    - Past 30 days daily observation series
    - Statistical aggregations (totals, averages, IMD rainy days, wettest day)
    - Monthly rainfall summary (current & previous calendar months)
    """
    if lat < -90.0 or lat > 90.0 or lon < -180.0 or lon > 180.0:
        raise HTTPException(status_code=400, detail="Invalid coordinates.")
    try:
        # Detect state and district if not explicitly provided
        loc_meta = None
        if state and district:
            loc_meta = {
                "state": state,
                "district": district,
                "latitude": lat,
                "longitude": lon,
                "timezone": "Asia/Kolkata"
            }
        else:
            rev = reverse_lookup_northeast_location(lat, lon)
            loc_meta = {
                "state": rev["state"],
                "district": rev["district"],
                "headquarters": rev.get("headquarters"),
                "latitude": lat,
                "longitude": lon,
                "timezone": "Asia/Kolkata"
            }

        weather_data = fetch_comprehensive_weather(lat, lon, force_refresh=force)
        return {
            "location": loc_meta,
            "current": weather_data["current"],
            "daily_7d": weather_data["daily_7d"],
            "daily_30d": weather_data["daily_30d"],
            "statistics": weather_data["statistics"],
            "monthly_summary": weather_data["monthly_summary"],
            "metadata": weather_data.get("metadata", {})
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Weather gateway error: {str(e)}")

@app.get("/api/weather/current")
def get_weather_current_endpoint(lat: float, lon: float):
    """Returns current weather only."""
    if lat < -90.0 or lat > 90.0 or lon < -180.0 or lon > 180.0:
        raise HTTPException(status_code=400, detail="Invalid coordinates.")
    try:
        w = fetch_comprehensive_weather(lat, lon)
        return {"current": w["current"]}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Weather gateway error: {str(e)}")

@app.get("/api/weather/history")
def get_weather_history_endpoint(lat: float, lon: float, days: int = 7):
    """Returns historical daily rainfall and temperature records for 7 or 30 days."""
    if lat < -90.0 or lat > 90.0 or lon < -180.0 or lon > 180.0:
        raise HTTPException(status_code=400, detail="Invalid coordinates.")
    try:
        w = fetch_comprehensive_weather(lat, lon)
        if days <= 7:
            return {"days": 7, "daily": w["daily_7d"], "statistics": w["statistics"]}
        else:
            return {"days": 30, "daily": w["daily_30d"], "statistics": w["statistics"]}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Weather gateway error: {str(e)}")

@app.get("/api/weather/comparison")
def get_weather_comparison_endpoint(state: str):
    """Returns 7-day rainfall comparison across major districts in the state."""
    try:
        data = fetch_state_district_comparison(state)
        return {"state": state, "comparison": data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Comparison fetch error: {str(e)}")

@app.get("/api/weather")
def get_weather():
    """
    Dashboard weather endpoint.
    Attempts to fetch real meteorological data from Open-Meteo for regional reference point (Aizawl).
    Clearly identifies source and falls back to honest unavailable payload if offline.
    """
    try:
        payload = fetch_comprehensive_weather(lat=23.7271, lon=92.7176, force_refresh=False)
        current = payload.get("current", {})
        stats = payload.get("statistics", {})
        daily_7d = payload.get("daily_7d", [])

        trend = [
            {"time": d.get("date_label", ""), "rainfall": d.get("rainfall", 0.0)}
            for d in (daily_7d[-6:] if daily_7d else [])
        ]

        return {
            "data_type": "real",
            "source": "Open-Meteo Weather & Forecast API",
            "note": "Atmospheric data retrieved dynamically from Open-Meteo.",
            "currentRainfallMm": current.get("today_rainfall") or current.get("rainfall", 0.0),
            "rainfall1h": current.get("rainfall", 0.0),
            "rainfall6h": None,
            "rainfall24h": current.get("today_rainfall", 0.0),
            "rainfall7d": stats.get("rainfall_7d"),
            "anomalyPercentage": None,
            "soilMoisturePercentage": None,
            "temperatureC": current.get("temperature"),
            "humidityPercentage": current.get("humidity"),
            "hourlyTrend": trend,
            "provenance": build_provenance(
                source_id="open_meteo_weather",
                data_type="Observed / Forecast",
                status="available",
                notes="Atmospheric data retrieved dynamically from Open-Meteo for regional center (Aizawl)."
            )
        }
    except Exception as e:
        return {
            "data_type": "unavailable",
            "source": "Open-Meteo (unavailable)",
            "note": f"Weather data currently unavailable: {str(e)[:120]}.",
            "currentRainfallMm": None,
            "rainfall1h": None,
            "rainfall6h": None,
            "rainfall24h": None,
            "rainfall7d": None,
            "anomalyPercentage": None,
            "soilMoisturePercentage": None,
            "temperatureC": None,
            "humidityPercentage": None,
            "hourlyTrend": [],
            "provenance": build_provenance(
                source_id="open_meteo_weather",
                data_type="Observed / Forecast",
                status="unavailable",
                notes=f"Weather service unreachable: {str(e)[:120]}"
            )
        }

@app.get("/api/alerts")
def get_alerts():
    """
    Returns alert records derived from the NER reference dataset (demo simulation data).
    These are representative locations for demonstration, NOT live sensor readings.
    """
    critical_alerts = [
        {
            **loc,
            "data_type": "demo_simulation",
            "source": "RIFT NER Reference Dataset (Demo Simulation)"
        }
        for loc in LOCATIONS if loc["riskLevel"] in ["CRITICAL", "HIGH"]
    ]
    return {
        "alerts": critical_alerts,
        "data_type": "demo_simulation",
        "source": "RIFT NER Reference Dataset (Demo Simulation)",
        "note": "Alert locations are representative NER reference points for demonstration. Not live sensor data.",
        "provenance": build_provenance(
            source_id="demo_simulation",
            data_type="Demo Data / Synthetic Simulation",
            status="demo",
            notes="Alert locations are representative NER reference points for demonstration. Not live sensor data."
        )
    }

# ==========================================
# GIS DISTRICT RISK MAP APIS
# ==========================================

@app.get("/api/gis/risk-districts")
def get_gis_district_risk_endpoint(state: Optional[str] = "all", force: bool = False):
    """
    Returns enriched GeoJSON FeatureCollection of North Eastern Region administrative districts
    with AI-derived landslide risk scores, classifications, physical parameters, and provenance.
    Supports filtering by state ('all' or specific state name like 'Mizoram', 'Assam', etc.).
    """
    try:
        data = get_filtered_district_risk_geojson(state=state, force_refresh=force)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate district GIS risk: {str(e)}")

@app.get("/api/infrastructure")
def get_infrastructure():
    """
    Returns NER infrastructure reference records (representative data, not live sensor feeds).
    """
    labeled = [
        {
            **asset,
            "data_type": "reference",
            "source": "NER Infrastructure Reference (OpenStreetMap + NHAI)"
        }
        for asset in INFRASTRUCTURE_ASSETS
    ]
    return {
        "infrastructure": labeled,
        "data_type": "reference",
        "source": "NER Infrastructure Reference (OpenStreetMap + NHAI)",
        "note": "Infrastructure records are reference profiles. Live structural sensor telemetry is currently unconfigured.",
        "provenance": build_provenance(
            source_id="infrastructure_reference",
            data_type="Reference Asset Profiles",
            status="reference",
            notes="Infrastructure alignments from NHAI & OSM. Live structural sensor telemetry currently unavailable."
        )
    }

@app.get("/api/historical")
def get_historical():
    """
    Returns NER historical landslide statistics (GSI + published research reference estimates).
    Values are reference estimates compiled from published literature, not real-time data.
    """
    result = dict(HISTORICAL_ANALYTICS)
    result["data_type"] = "reference_estimate"
    result["source"] = "GSI Landslide Inventory + Published NER Research (Reference Estimates)"
    result["note"] = (
        "Yearly incident counts are reference estimates compiled from GSI landslide inventory "
        "and published NER disaster research. Exact figures are not independently verified real-time data."
    )
    result["provenance"] = build_provenance(
        source_id="gsi_inventory",
        data_type="Historical / Reference Estimates",
        status="reference",
        notes="Yearly trends compiled from Geological Survey of India (GSI) NLSM inventory and published academic literature."
    )
    return result

@app.get("/api/translations")
def get_translations():
    return MULTILINGUAL_TRANSLATIONS

@app.get("/api/reports")
def get_field_reports():
    return {
        "reports": FIELD_REPORTS_DB,
        "provenance": build_provenance(
            source_id="citizen_reports",
            data_type="User-Reported (Officer / Citizen Submissions)",
            status="active"
        )
    }

@app.post("/api/reports")
def submit_field_report(report: FieldReportRequest):
    new_id = f"report-{len(FIELD_REPORTS_DB) + 101}"
    item = {
        "id": new_id,
        "reporterName": report.reporterName,
        "reporterRole": report.reporterRole,
        "incidentType": report.incidentType,
        "locationName": report.locationName,
        "lat": report.lat,
        "lng": report.lng,
        "severity": report.severity,
        "status": "Submitted",
        "submittedAgo": "Just now",
        "description": report.description,
        "data_type": "user_reported"
    }
    FIELD_REPORTS_DB.insert(0, item)
    return {"status": "success", "report": item}

@app.get("/api/satellite")
def get_satellite():
    """
    Satellite / SAR monitoring endpoint.
    Real Sentinel-1 / ISRO SAR imagery is NOT configured in this local deployment.
    Returns an honest 'unavailable' response — zero fake stock photos.
    """
    return {
        "status": "unavailable",
        "data_type": "unavailable",
        "source": "Sentinel-1 SAR / ISRO Bhuvan (Not Configured)",
        "note": (
            "Real satellite SAR imagery and ground deformation telemetry require a configured "
            "ESA Sentinel Hub or ISRO Bhuvan API credential. "
            "No live satellite SAR telemetry is available in this local deployment."
        ),
        "location": None,
        "lastCaptureDate": None,
        "beforeImage": None,
        "afterImage": None,
        "sarDeformationMm": None,
        "vegetationAnomalyIndex": None,
        "scarAlert": None,
        "provenance": build_provenance(
            source_id="esri_imagery",
            data_type="Satellite SAR Telemetry",
            status="unavailable",
            notes="Optical basemap imagery available via Esri tile service, but live SAR deformation monitoring is unconfigured."
        )
    }

@app.get("/api/provenance/sources")
def get_provenance_sources_endpoint():
    """
    Universal Source Registry endpoint:
    Returns the authoritative metadata, official URLs, licenses, and attribution for all
    data sources used across the RIFT platform.
    """
    return {
        "status": "success",
        "total_sources": len(SOURCE_REGISTRY),
        "sources": SOURCE_REGISTRY
    }

@app.get("/api/demo/trigger")
def trigger_demo_step():
    return demo_engine_instance.run_next_step()

@app.get("/api/demo/reset")
def reset_demo():
    demo_engine_instance.reset()
    return {"status": "reset"}
