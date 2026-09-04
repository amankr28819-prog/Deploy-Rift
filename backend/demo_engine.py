"""
NER-SAFE Live Hackathon Demo Scenario Engine (SIH 2026 PS 26001)
Simulates end-to-end disaster progression from rainfall surge to critical emergency alert & response.
"""
from backend.ml_engine import predict_landslide_risk

class HackathonDemoEngine:
    def __init__(self):
        self.reset()
        
    def reset(self):
        self.step = 0
        self.scenario = {
            "location": "Aizawl District (Ridge Zone)",
            "state": "Mizoram",
            "highway": "NH-6 (Silchar-Aizawl Lifeline)",
            "initialRainfall": 80,
            "simulatedRainfall": 185,
            "initialSoilMoisture": 55,
            "simulatedSoilMoisture": 88,
            "slope": 37,
            "elevation": 1132
        }
        
    def run_next_step(self):
        self.step = (self.step + 1) % 6
        
        if self.step == 0:
            # Baseline Moderate State
            prediction = predict_landslide_risk(80, 55, 37, 1132)
            return {
                "step": 0,
                "title": "Baseline Normal Monitoring",
                "description": "Monsoonal conditions normal. Rainfall 80mm/24h. Slope sensors stable.",
                "rainfall": 80,
                "soilMoisture": 55,
                "prediction": prediction,
                "alert": None,
                "infrastructureStatus": "Normal Traffic Flow on NH-6"
            }
        elif self.step == 1:
            # Torrential Deluge Begins
            prediction = predict_landslide_risk(125, 70, 37, 1132)
            return {
                "step": 1,
                "title": "Cloudburst & Torrential Deluge Detected",
                "description": "Heavy rainfall surge detected by IMD Doppler radar over Aizawl Ridge. 125mm in last 6 hours.",
                "rainfall": 125,
                "soilMoisture": 70,
                "prediction": prediction,
                "alert": {
                    "level": "HIGH",
                    "message": "High rainfall rate over Aizawl slope. Soil moisture rapidly rising."
                },
                "infrastructureStatus": "Cautionary speed limit on NH-6"
            }
        elif self.step == 2:
            # Soil Saturation Threshold Crossed -> CRITICAL RISK
            prediction = predict_landslide_risk(185, 88, 37, 1132)
            return {
                "step": 2,
                "title": "AI Risk Engine Predicts CRITICAL Failure",
                "description": "Soil saturation crossed 85% threshold. AI model probability spikes to 88.5% CRITICAL.",
                "rainfall": 185,
                "soilMoisture": 88,
                "prediction": prediction,
                "alert": {
                    "level": "CRITICAL",
                    "message": "EMERGENCY: Immediate slope failure probable near NH-6 kilometer 42."
                },
                "infrastructureStatus": "HIGH RISK: NH-6 Traffic Blockade Imminent"
            }
        elif self.step == 3:
            # Multilingual Emergency Broadcast & Alerts
            prediction = predict_landslide_risk(185, 88, 37, 1132)
            return {
                "step": 3,
                "title": "Multilingual Emergency Warning Broadcasted",
                "description": "Automated alert dispatched via SMS, App, and Control Room in English, Hindi, Mizo & Assamese.",
                "rainfall": 185,
                "soilMoisture": 88,
                "prediction": prediction,
                "alert": {
                    "level": "CRITICAL",
                    "message": "CRITICAL EMERGENCY BROADCAST DISPATCHED TO 14,200 POPULATION."
                },
                "infrastructureStatus": "NH-6 Temporarily Suspended for Emergency Clearance"
            }
        elif self.step == 4:
            # Emergency Response Auto-Prioritization
            prediction = predict_landslide_risk(185, 88, 37, 1132)
            return {
                "step": 4,
                "title": "Response Priority Re-calculated (#1 Priority)",
                "description": "Algorithm prioritizes Aizawl Ridge & NH-6 due to 14,200 population + lifeline highway impact.",
                "rainfall": 185,
                "soilMoisture": 88,
                "prediction": prediction,
                "alert": {
                    "level": "CRITICAL",
                    "message": "SDRF Battalion 3 & Earthmovers dispatched to NH-6 junction."
                },
                "infrastructureStatus": "SDRF Quick Response Team In-Transit"
            }
        else:
            # Resolution & Post-Incident Inspection
            prediction = predict_landslide_risk(140, 75, 37, 1132)
            return {
                "step": 5,
                "title": "Emergency Evacuation & Stabilization Complete",
                "description": "Field officers confirmed evacuation of high-risk dwellings. Highway traffic rerouted to SH-3.",
                "rainfall": 140,
                "soilMoisture": 75,
                "prediction": prediction,
                "alert": {
                    "level": "HIGH",
                    "message": "Area stabilized. Remedial slope netting recommended."
                },
                "infrastructureStatus": "Traffic Rerouted via SH-3 Bypass"
            }

demo_engine_instance = HackathonDemoEngine()
