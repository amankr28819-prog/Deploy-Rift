"""
NER-SAFE / RIFT - Centralized Data Source Registry & Provenance Architecture
Ministry of Development of North Eastern Region (MDoNER) - SIH 2026 PS 26001

Provides authoritative metadata, official URLs, licenses, attribution, and 
standardized provenance structures for all external and internal data sources.
"""

import datetime
from typing import Dict, Any, Optional

# Universal Source Registry Definition
SOURCE_REGISTRY: Dict[str, Dict[str, Any]] = {
    "open_meteo_weather": {
        "source_id": "open_meteo_weather",
        "name": "Open-Meteo Weather Forecast API",
        "url": "https://open-meteo.com/en/docs",
        "dataset": "ECMWF IFS / GFS / Seamless Weather Forecast",
        "source_type": "External Meteorological API",
        "data_type": "Observed / Forecast",
        "license": "Non-Commercial / CC BY 4.0",
        "attribution": "Weather data by Open-Meteo.com",
        "update_frequency": "Hourly",
        "description": "High-resolution global weather model forecasts and hourly surface measurements."
    },
    "open_meteo_archive": {
        "source_id": "open_meteo_archive",
        "name": "Open-Meteo Historical Weather API",
        "url": "https://open-meteo.com/en/docs/historical-weather-api",
        "dataset": "ERA5 Reanalysis (ECMWF) & High-Resolution Models",
        "source_type": "External Meteorological Reanalysis",
        "data_type": "Historical / Reanalysis",
        "license": "Non-Commercial / CC BY 4.0",
        "attribution": "Reanalysis data by ECMWF / Open-Meteo",
        "update_frequency": "Daily update",
        "description": "Historical gridded meteorological reanalysis and estimated rainfall series."
    },
    "imd_benchmark": {
        "source_id": "imd_benchmark",
        "name": "India Meteorological Department (IMD)",
        "url": "https://mausam.imd.gov.in/",
        "dataset": "IMD Standard Rainfall Classification Criteria",
        "source_type": "Government Standard / Meteorological Benchmark",
        "data_type": "Classification Standard (Not numerical rainfall source)",
        "license": "Government Open Data",
        "attribution": "India Meteorological Department (IMD), Ministry of Earth Sciences",
        "update_frequency": "Standard criteria",
        "description": "Standardized meteorological rainfall intensity thresholds (Rainy Day >= 2.5mm, Heavy >= 64.5mm, Very Heavy >= 115.6mm, Extreme >= 204.5mm)."
    },
    "survey_of_india": {
        "source_id": "survey_of_india",
        "name": "Survey of India / Census of India",
        "url": "https://surveyofindia.gov.in/",
        "dataset": "Administrative District Boundaries of North Eastern Region",
        "source_type": "Government Spatial Boundary Dataset",
        "data_type": "Official Vector Polygons (GeoJSON)",
        "license": "Government Open Data (GODL-India)",
        "attribution": "Survey of India / Administrative Atlas of India",
        "update_frequency": "Static Reference (78 NER Districts)",
        "description": "Official administrative district boundaries for all 8 Northeast Indian states."
    },
    "copernicus_dem": {
        "source_id": "copernicus_dem",
        "name": "Copernicus European Space Agency (ESA)",
        "url": "https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model",
        "dataset": "Copernicus Digital Elevation Model (GLO-90)",
        "source_type": "Satellite Remote Sensing Dataset",
        "data_type": "DEM-Derived Topography",
        "license": "Copernicus Open Access",
        "attribution": "Copernicus WorldDEM-90 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018",
        "update_frequency": "Static Reference",
        "description": "90m spatial resolution Digital Elevation Model covering elevation, slope, and topographic relief."
    },
    "esa_worldcover": {
        "source_id": "esa_worldcover",
        "name": "European Space Agency (ESA) WorldCover",
        "url": "https://esa-worldcover.org/",
        "dataset": "ESA WorldCover 10m Land Cover Product",
        "source_type": "Satellite Remote Sensing Dataset",
        "data_type": "Satellite-Derived Land Cover",
        "license": "CC BY 4.0",
        "attribution": "ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021)",
        "update_frequency": "Annual / Reference Product",
        "description": "10m global land cover classification distinguishing tree cover, shrubland, grassland, cropland, built-up, and bare areas."
    },
    "gsi_inventory": {
        "source_id": "gsi_inventory",
        "name": "Geological Survey of India (GSI)",
        "url": "https://www.gsi.gov.in/webcenter/portal/OCBIS/pageGeoScience/pageNLSM",
        "dataset": "National Landslide Susceptibility Mapping (NLSM) Inventory",
        "source_type": "Official National Geological Inventory",
        "data_type": "Observed Historical Landslide Catalog",
        "license": "Government Open Data",
        "attribution": "Geological Survey of India (GSI), Ministry of Mines",
        "update_frequency": "National Mapping Catalog",
        "description": "Authoritative inventory of 9,992 historical landslide occurrences across Northeast India used for spatial proximity clustering."
    },
    "usgs_earthquake": {
        "source_id": "usgs_earthquake",
        "name": "USGS Earthquake Hazards Program",
        "url": "https://earthquake.usgs.gov/fdsnws/event/1/",
        "dataset": "USGS Comprehensive Earthquake Catalog (ComCat)",
        "source_type": "Official Global Seismic API",
        "data_type": "Observed Seismic Catalog",
        "license": "Public Domain (USGS)",
        "attribution": "U.S. Geological Survey (USGS)",
        "update_frequency": "Real-time / Near real-time",
        "description": "Global real-time seismic event recording, magnitude, depth, and epicenter location within regional radius."
    },
    "openstreetmap": {
        "source_id": "openstreetmap",
        "name": "OpenStreetMap Contributors",
        "url": "https://www.openstreetmap.org/",
        "dataset": "OpenStreetMap Vector Map & Overpass Infrastructure Query",
        "source_type": "Open Collaborative Spatial Database",
        "data_type": "Observed Spatial Vector Data / Basemap",
        "license": "Open Data Commons Open Database License (ODbL)",
        "attribution": "© OpenStreetMap contributors",
        "update_frequency": "Continuous / On-Demand API",
        "description": "Global crowd-sourced and official spatial geometry for transport highways, local roads, waterways, and base tiles."
    },
    "esri_imagery": {
        "source_id": "esri_imagery",
        "name": "Esri World Imagery",
        "url": "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
        "dataset": "Esri World Imagery Basemap",
        "source_type": "Commercial Satellite / Aerial Imagery Tile Service",
        "data_type": "Satellite / Aerial Imagery (Not Live)",
        "license": "Esri Terms of Use for Mapping Applications",
        "attribution": "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS Community",
        "update_frequency": "Periodic archive refresh",
        "description": "High-resolution satellite and aerial imagery composites for background visual context. Not live optical feed."
    },
    "esri_topo": {
        "source_id": "esri_topo",
        "name": "Esri World Topo Map",
        "url": "https://www.arcgis.com/home/item.html?id=30eab2e0d1424d71ace04381d6b879fd",
        "dataset": "Esri World Topographic Map",
        "source_type": "Commercial Topographic Tile Service",
        "data_type": "Topographic Map Tiles",
        "license": "Esri Terms of Use",
        "attribution": "Tiles © Esri — Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey",
        "update_frequency": "Periodic archive refresh",
        "description": "Topographic basemap with elevation contours, shaded relief, and geographic labels."
    },
    "rift_ai_v4": {
        "source_id": "rift_ai_v4",
        "name": "RIFT Landslide Intelligence Engine (V4 Model)",
        "url": "/api/ai-risk/model-info",
        "dataset": "Verified V4 XGBoost & Random Forest Physical Pipeline",
        "source_type": "Internal AI/ML Model Pipeline",
        "data_type": "Model-derived Landslide Risk",
        "license": "Proprietary / SIH 2026 MDoNER",
        "attribution": "RIFT / NER-SAFE AI Research Group (Decision Threshold: 0.2675)",
        "update_frequency": "Dynamic on-demand inference",
        "description": "Machine learning prediction pipeline evaluating Hazard, Exposure, Vulnerability, and composite Landslide Risk from physical features."
    },
    "citizen_reports": {
        "source_id": "citizen_reports",
        "name": "NER-SAFE Citizen & Field Reporting System",
        "url": "/api/reports",
        "dataset": "Field Officer & Community Incident Submissions",
        "source_type": "Crowdsourced & Officer Field Reports",
        "data_type": "User-Reported (Unverified until Officer Review)",
        "license": "MDoNER Internal Operations",
        "attribution": "Submitted by Local Field Responders and NER Citizens",
        "update_frequency": "Real-time user submissions",
        "description": "Ground observations of slope cracks, mudslides, and road blockages."
    },
    "infrastructure_reference": {
        "source_id": "infrastructure_reference",
        "name": "National Highways Authority of India (NHAI) & OpenStreetMap",
        "url": "https://nhai.gov.in/",
        "dataset": "Northeast India Critical Highway & Mountain Rail Corridors",
        "source_type": "Government Infrastructure Reference / Spatial Vector",
        "data_type": "Reference Asset Profiles (Live Structural Sensors: Unavailable)",
        "license": "Government Open Data / ODbL",
        "attribution": "NHAI / Ministry of Road Transport and Highways & OpenStreetMap",
        "update_frequency": "Static Reference Profile",
        "description": "Reference geographic alignments for NH-6, NH-10, NH-27, and mountain rail lines. Live structural sensor telemetry is currently unconfigured."
    }
}


def get_source(source_id: str) -> Dict[str, Any]:
    """Retrieves source metadata dictionary for a given source_id."""
    return SOURCE_REGISTRY.get(source_id, {
        "source_id": source_id,
        "name": f"Unknown ({source_id})",
        "url": None,
        "dataset": "Unregistered dataset",
        "source_type": "External",
        "data_type": "Unspecified",
        "license": "Unknown",
        "attribution": "Unknown source",
        "update_frequency": "Unknown",
        "description": "No metadata registered for this source ID."
    })


def build_provenance(
    source_id: str,
    data_type: Optional[str] = None,
    status: str = "available",
    is_cached: bool = False,
    is_stale: bool = False,
    notes: Optional[str] = None,
    period: Optional[str] = None
) -> Dict[str, Any]:
    """
    Constructs a standardized, transparent provenance metadata payload.
    """
    source_meta = get_source(source_id)
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    now_ist = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30)))

    provenance = {
        "source_id": source_id,
        "source_name": source_meta.get("name"),
        "source_url": source_meta.get("url"),
        "source_dataset": source_meta.get("dataset"),
        "source_type": source_meta.get("source_type"),
        "data_type": data_type or source_meta.get("data_type"),
        "license": source_meta.get("license"),
        "attribution": source_meta.get("attribution"),
        "retrieved_at": now_utc.isoformat(),
        "updated_at": now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
        "timezone": "Asia/Kolkata",
        "status": status,
        "is_cached": is_cached,
        "is_stale": is_stale
    }
    if period:
        provenance["period"] = period
    if notes:
        provenance["notes"] = notes
    return provenance
