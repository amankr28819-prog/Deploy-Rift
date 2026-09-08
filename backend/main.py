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
from backend.report_service import get_all_reports, add_report, update_report_status
from backend.alert_service import generate_live_alerts
from backend.xai_service import get_global_feature_importance, evaluate_landslide_simulation

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
    lat: Optional[float] = None
    lng: Optional[float] = None
    district: Optional[str] = None
    state: Optional[str] = None
    severity: str
    description: str
    photoBase64: Optional[str] = None

class ReportStatusUpdateRequest(BaseModel):
    status: str
    notes: Optional[str] = None

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
    """
    Scenario risk evaluation using geotechnical Mohr-Coulomb and IMD precipitation analysis.
    Transparently reports contributing factors without fake confidence metrics.
    """
    sim = evaluate_landslide_simulation(
        rainfall_24h=req.rainfall,
        soil_saturation_pct=req.soilMoisture,
        slope_deg=req.slope
    )
    return {
        "probability": sim["probability"],
        "riskLevel": sim["riskLevel"],
        "recommendedAction": (
            "🚨 CRITICAL: Evacuate vulnerable slopes and inspect drainage culverts immediately." if sim["riskLevel"] == "CRITICAL" else
            "⚠️ HIGH: Pre-position clearance equipment and issue local alerts." if sim["riskLevel"] == "HIGH" else
            "⚠️ MODERATE: Heighten weather monitoring and inspect road shoulders." if sim["riskLevel"] == "MODERATE" else
            "✅ LOW: Normal slope monitoring."
        ),
        "explanation": sim["explanation"],
        "contributingFactors": sim["contributingFactors"],
        "is_scenario": True,
        "data_type": "Synthetic Scenario Simulation"
    }

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
    Dynamic early warning alerts engine.
    Evaluates real USGS seismic sensor network (NER bounding box M>=3.0),
    verified citizen/officer ground incident reports, and IMD heavy precipitation triggers.
    Returns zero fake pre-filled alerts. If no events exceed critical criteria,
    returns an honest 'No verified active alerts available' payload with traceable sources.
    """
    try:
        data = generate_live_alerts()
        data["provenance"] = build_provenance(
            source_id="usgs_earthquake",
            data_type="Live Trigger Evaluation",
            status="available" if data.get("total_active_alerts", 0) > 0 else "monitored",
            notes="Dynamic trigger engine monitoring USGS seismic network, verified ground reports, and precipitation."
        )
        return data
    except Exception as e:
        return {
            "alerts": [],
            "total_active_alerts": 0,
            "status": "unavailable",
            "message": "Alert evaluation service temporarily unreachable.",
            "note": str(e),
            "checked_sources": [],
            "provenance": build_provenance(
                source_id="usgs_earthquake",
                data_type="Live Trigger Evaluation",
                status="unavailable",
                notes=f"Alert service error: {str(e)[:120]}"
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
def get_field_reports(status: Optional[str] = None):
    """
    Returns persistent field incident reports, optionally filtered by status.
    All reports are stored in backend/data/field_reports.json with verification provenance.
    """
    reports = get_all_reports(status_filter=status)
    return {
        "reports": reports,
        "total_reports": len(reports),
        "provenance": build_provenance(
            source_id="citizen_reports",
            data_type="User-Reported (Officer / Citizen Submissions)",
            status="active",
            notes="Persistent incident reports stored in JSON registry with verification status workflow."
        )
    }

@app.post("/api/reports")
def submit_field_report(report: FieldReportRequest):
    """
    Submits a new citizen or field officer report.
    Persists to disk with initial 'Submitted' / 'Pending Verification' state.
    """
    created = add_report(
        reporter_name=report.reporterName,
        reporter_role=report.reporterRole,
        incident_type=report.incidentType,
        location_name=report.locationName,
        severity=report.severity,
        description=report.description,
        lat=report.lat,
        lng=report.lng,
        district=report.district,
        state=report.state,
        image_url=report.photoBase64
    )
    return {"status": "success", "report": created}

@app.patch("/api/reports/{report_id}/status")
def update_report_status_endpoint(report_id: str, req: ReportStatusUpdateRequest):
    """
    Updates the operational/verification status of a report.
    Supported states: 'Submitted', 'Pending Verification', 'Verified', 'Rejected', 'Resolved'.
    """
    try:
        updated = update_report_status(report_id, req.status, notes=req.notes)
        if not updated:
            raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")
        return {"status": "success", "report": updated}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

# ==========================================
# AUTHORITY COMMAND & RESPONSE PRIORITY APIS
# ==========================================

@app.get("/api/authority/summary")
def get_authority_summary_endpoint():
    """
    Authority Command Center live operational summary.
    Calculates real counts dynamically from 78 official Survey of India administrative
    districts, live USGS earthquake triggers, and verified field reports. Zero fake counts.
    """
    try:
        district_geojson = get_filtered_district_risk_geojson(state="all")
        districts = district_geojson.get("features", [])
        total_districts = len(districts)
        
        critical_districts = [d for d in districts if d.get("properties", {}).get("risk_category") in ["Critical", "CRITICAL"]]
        high_districts = [d for d in districts if d.get("properties", {}).get("risk_category") in ["High", "HIGH"]]
        
        alert_data = generate_live_alerts()
        active_alerts = alert_data.get("alerts", [])
        advisory_alerts = alert_data.get("advisory_alerts", [])
        
        reports = get_all_reports()
        verified_reports = [r for r in reports if r.get("status") == "Verified"]
        pending_reports = [r for r in reports if r.get("status") in ["Submitted", "Pending Verification"]]

        return {
            "status": "success",
            "data_type": "Real-Time Operational Aggregation",
            "total_monitored_districts": total_districts,
            "total_states": 8,
            "states": NER_STATES,
            "high_risk_districts_count": len(high_districts) + len(critical_districts),
            "critical_districts_count": len(critical_districts),
            "active_alerts_count": len(active_alerts),
            "advisory_alerts_count": len(advisory_alerts),
            "verified_incidents_count": len(verified_reports),
            "pending_verification_count": len(pending_reports),
            "active_sdrf_teams_status": "Telemetry Unavailable (No automated SDRF GPS tracking feed)",
            "lifeline_highways": [
                {"name": "NH-6", "corridor": "Shillong - Silchar - Aizawl", "status": "Monitored Reference Corridor", "live_sensors": "Unavailable"},
                {"name": "NH-10", "corridor": "Siliguri - Gangtok", "status": "Monitored Reference Corridor", "live_sensors": "Unavailable"},
                {"name": "NH-29", "corridor": "Dimapur - Kohima", "status": "Monitored Reference Corridor", "live_sensors": "Unavailable"},
                {"name": "NH-102", "corridor": "Imphal - Moreh", "status": "Monitored Reference Corridor", "live_sensors": "Unavailable"}
            ],
            "provenance": build_provenance(
                source_id="survey_of_india",
                data_type="Operational Command Aggregation",
                status="available",
                notes="Aggregated dynamically from 78 official Survey of India administrative district boundaries, USGS seismic sensors, and verified field registry."
            )
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authority summary aggregation failed: {str(e)}")

@app.get("/api/response/priority")
def get_response_priority_endpoint():
    """
    Dynamically ranks response priorities based on real verified alerts,
    active ground incidents, and evaluated district terrain susceptibility.
    No random rankings.
    """
    try:
        priority_list = []
        rank = 1

        # 1. Active Alerts (Seismic or Severe Incidents)
        alert_data = generate_live_alerts()
        for a in alert_data.get("alerts", []):
            priority_list.append({
                "rank": rank,
                "id": a["id"],
                "name": a["name"],
                "state": a["state"],
                "category": a.get("category", "Emergency Trigger"),
                "priority_score": a.get("probability", 90),
                "risk_level": a.get("riskLevel", "CRITICAL"),
                "reason": a.get("reason", "Active seismic or hazard trigger recorded."),
                "recommended_action": a.get("recommendedAction", "Immediate precautionary inspection and readiness."),
                "source": a.get("source", "USGS NEIC"),
                "data_type": a.get("data_type", "Real Observation"),
                "timestamp": a.get("timestamp", "Live")
            })
            rank += 1

        # 2. Verified Field Incident Reports
        reports = get_all_reports()
        for r in reports:
            if r.get("status") == "Verified":
                priority_list.append({
                    "rank": rank,
                    "id": r["id"],
                    "name": r["locationName"],
                    "state": r.get("state", "NER"),
                    "category": f"Verified Ground Incident: {r.get('incidentType', 'Hazard')}",
                    "priority_score": 85 if r.get("severity") == "Critical" else 75,
                    "risk_level": r.get("severity", "High").upper(),
                    "reason": r.get("description", "Ground officer confirmed slope failure / obstruction."),
                    "recommended_action": "Deploy clearance machinery and establish regional detour.",
                    "source": f"Verified {r.get('reporterType', 'Officer')} Report",
                    "data_type": "Verified Ground Truth Observation",
                    "timestamp": r.get("submittedAt", "")
                })
                rank += 1

        # 3. High Susceptibility Districts from 78 Survey of India polygons
        district_geojson = get_filtered_district_risk_geojson(state="all")
        districts = district_geojson.get("features", [])
        
        # Sort districts by risk score
        sorted_districts = sorted(
            districts,
            key=lambda d: (
                0 if d.get("properties", {}).get("risk_category") == "CRITICAL" else
                1 if d.get("properties", {}).get("risk_category") == "HIGH" else
                2 if d.get("properties", {}).get("risk_category") == "MODERATE" else 3
            )
        )
        for d in sorted_districts[:6]:
            props = d.get("properties", {})
            cat = props.get("risk_category", "MODERATE")
            if cat in ["CRITICAL", "HIGH"]:
                priority_list.append({
                    "rank": rank,
                    "id": f"dist-{props.get('district')}",
                    "name": f"{props.get('district')} District",
                    "state": props.get("state"),
                    "category": "High Susceptibility District",
                    "priority_score": 78 if cat == "CRITICAL" else 68,
                    "risk_level": cat,
                    "reason": f"Representative slope {props.get('slope_deg')}°, elevation {props.get('elevation_m')}m, high historical GSI landslide density.",
                    "recommended_action": "Heighten rainfall monitoring and inspect vulnerable arterial cut slopes.",
                    "source": "RIFT V2 District Intelligence Engine",
                    "data_type": "Model-Derived Susceptibility",
                    "timestamp": "Evaluated dynamically"
                })
                rank += 1

        return {
            "status": "success",
            "total_priority_items": len(priority_list),
            "priority_queue": priority_list,
            "provenance": build_provenance(
                source_id="rift_ai_v4",
                data_type="Prioritized Operational Queue",
                status="available",
                notes="Priorities ranked dynamically by active emergency triggers, verified field reports, and evaluated terrain risk."
            )
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Priority queue generation failed: {str(e)}")

# ==========================================
# EXPLAINABLE AI (XAI) & SIMULATOR APIS
# ==========================================

@app.get("/api/xai/feature-importance")
def get_xai_feature_importance_endpoint():
    """
    Returns global feature importance rankings validated against the
    GSI 9,992 National Landslide Susceptibility Mapping records.
    """
    features = get_global_feature_importance()
    return {
        "status": "success",
        "model_version": "RIFT V4 Intelligence (XGBoost Pipeline)",
        "training_dataset": "GSI 9,992 National Landslide Susceptibility Mapping (NLSM) Records",
        "features": features,
        "provenance": build_provenance(
            source_id="rift_ai_v4",
            data_type="Model Feature Importance",
            status="available",
            notes="Global feature importance weights computed from validated XGBoost model training on GSI dataset."
        )
    }

class SimulatorRequest(BaseModel):
    rainfall: float
    soilMoisture: float
    slope: float

@app.post("/api/simulator/evaluate")
def evaluate_simulator_endpoint(req: SimulatorRequest):
    """
    Physics-based landslide simulation sandbox.
    Applies Mohr-Coulomb geotechnical shear strength analysis and IMD precipitation thresholds.
    Clearly labeled as a synthetic scenario simulation.
    """
    return evaluate_landslide_simulation(
        rainfall_24h=req.rainfall,
        soil_saturation_pct=req.soilMoisture,
        slope_deg=req.slope
    )

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
