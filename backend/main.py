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

@app.get("/api/weather")
def get_weather():
    return {
        "currentRainfallMm": 165,
        "rainfall1h": 18,
        "rainfall6h": 72,
        "rainfall24h": 165,
        "rainfall7d": 410,
        "anomalyPercentage": 42.5,
        "soilMoisturePercentage": 82,
        "temperatureC": 21.4,
        "humidityPercentage": 94,
        "hourlyTrend": [
            {"time": "00:00", "rainfall": 5},
            {"time": "04:00", "rainfall": 12},
            {"time": "08:00", "rainfall": 28},
            {"time": "12:00", "rainfall": 45},
            {"time": "16:00", "rainfall": 57},
            {"time": "20:00", "rainfall": 18}
        ]
    }

@app.get("/api/alerts")
def get_alerts():
    critical_alerts = [
        loc for loc in LOCATIONS if loc["riskLevel"] in ["CRITICAL", "HIGH"]
    ]
    return {"alerts": critical_alerts}

@app.get("/api/infrastructure")
def get_infrastructure():
    return {"infrastructure": INFRASTRUCTURE_ASSETS}

@app.get("/api/historical")
def get_historical():
    return HISTORICAL_ANALYTICS

@app.get("/api/translations")
def get_translations():
    return MULTILINGUAL_TRANSLATIONS

@app.get("/api/reports")
def get_field_reports():
    return {"reports": FIELD_REPORTS_DB}

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
        "description": report.description
    }
    FIELD_REPORTS_DB.insert(0, item)
    return {"status": "success", "report": item}

@app.get("/api/satellite")
def get_satellite():
    return {
        "location": "Aizawl Ridge Sector 4",
        "lastCaptureDate": "2026-09-03",
        "beforeImage": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
        "afterImage": "https://images.unsplash.com/photo-1511497584788-8767611136f6?w=800&auto=format&fit=crop&q=80",
        "sarDeformationMm": 14.2,
        "vegetationAnomalyIndex": "-0.34 (Vegetation Loss Detected)",
        "scarAlert": "Potential 120-meter landslide scar forming along slope contour."
    }

@app.get("/api/demo/trigger")
def trigger_demo_step():
    return demo_engine_instance.run_next_step()

@app.get("/api/demo/reset")
def reset_demo():
    demo_engine_instance.reset()
    return {"status": "reset"}
