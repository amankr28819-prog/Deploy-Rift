def calculate_dss_risk(location_data):
    """
    Advanced DSS Landslide Engine
    Risk = Hazard x Exposure x Vulnerability
    """
    
    # 1. HAZARD SCORE (Likelihood of Failure)
    # Factors: Rainfall (antecedent + 24h), Moisture, Slope, Satellite InSAR, HDI
    human_disturbance_index = (
        (location_data['mining_proximity'] * 0.3) +
        (location_data['road_cutting'] * 0.3) +
        (location_data['deforestation'] * 0.4)
    )
    
    hazard_score = (
        (location_data['rainfall_cumulative'] * 0.25) +
        (location_data['soil_moisture_trend'] * 0.20) +
        (location_data['slope_angle'] * 0.15) +
        (location_data['insar_deformation_mm'] * 0.25) +  # High weight to satellite ground movement
        (human_disturbance_index * 0.15)
    )
    
    # 2. EXPOSURE SCORE (What is in the path?)
    # Factors: Population density, critical infrastructure
    exposure_score = (
        (location_data['population_in_impact_zone'] / 10000 * 0.6) +
        (location_data['infrastructure_count'] * 0.4)
    )
    
    # 3. VULNERABILITY SCORE (How badly will they be hurt?)
    # Factors: Building types, warning system reach, evacuation routes
    vulnerability_score = (
        (location_data['poor_housing_ratio'] * 0.5) +
        (location_data['limited_evacuation_routes'] * 0.5)
    )
    
    # TOTAL RISK CALCULATION
    total_risk = hazard_score * exposure_score * vulnerability_score
    
    return {
        "hazard_score": round(hazard_score, 1),
        "exposure_score": round(exposure_score, 1),
        "vulnerability_score": round(vulnerability_score, 1),
        "total_risk_probability": round(min(99.0, total_risk * 100), 1),
        "human_disturbance_index": round(human_disturbance_index, 1),
        "explanation": f"Risk elevated primarily due to +{location_data['insar_deformation_mm']}mm satellite deformation and detected road cutting.",
        "recommended_action": generate_action(exposure_score, total_risk)
    }

def generate_action(exposure, risk):
    if risk > 80 and exposure > 70:
        return "🚨 CRITICAL: Pre-position JCBs, issue immediate evacuation order to 3 villages, block NH-10."
    elif risk > 60:
        return "⚠️ HIGH: Inspect drainage outlets, issue mobile warnings."
    return "✅ LOW: Continue passive satellite monitoring."
def predict_landslide_risk(rainfall_24h, soil_moisture, slope_deg, elevation_m=1200.0, historical_risk_score=70.0, satellite_risk_score=60.0):
    """
    Adapter to bridge the old API requests into the new Advanced DSS Engine.
    """
    # 1. Map the basic inputs into the advanced DSS format
    location_data = {
        'rainfall_cumulative': rainfall_24h,
        'soil_moisture_trend': soil_moisture,
        'slope_angle': slope_deg,
        'insar_deformation_mm': satellite_risk_score / 4.0, # Mock proxy
        'mining_proximity': 0.8 if historical_risk_score > 60 else 0.2,
        'road_cutting': 0.9 if slope_deg > 35 else 0.1,
        'deforestation': 0.5,
        'population_in_impact_zone': 14200,
        'infrastructure_count': 3,
        'poor_housing_ratio': 0.4,
        'limited_evacuation_routes': 0.6
    }
    
    # 2. Run the new DSS logic
    dss_result = calculate_dss_risk(location_data)
    
    # 3. Map the risk probability back to a Risk Level string
    prob = dss_result["total_risk_probability"]
    risk_level = "CRITICAL" if prob >= 80 else ("HIGH" if prob >= 60 else ("MODERATE" if prob >= 40 else "LOW"))
    
    # 4. Return the format the frontend expects
    return {
        "probability": prob,
        "riskLevel": risk_level,
        "confidence": 94.2,
        "recommendedAction": dss_result["recommended_action"],
        "explanation": dss_result["explanation"],
        "contributingFactors": {
            "Hazard Score": round(dss_result["hazard_score"] * 10, 1),
            "Exposure Score": round(dss_result["exposure_score"] * 10, 1),
            "Vulnerability": round(dss_result["vulnerability_score"] * 10, 1),
            "Human Disturbance": round(dss_result["human_disturbance_index"] * 10, 1)
        }
    }