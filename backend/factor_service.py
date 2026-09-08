"""
NER-SAFE Disaster Management System - Landslide Factor Gateway Service
Fetches and normalizes live, derived, and reference spatial factors for a given coordinate.
Strictly collects and reports factor data without computing risk scores or predictions.
"""

import math
import time
import json
import datetime
import urllib.request
import urllib.parse
from typing import Dict, Any, Optional
from backend.source_registry import build_provenance, get_source

# In-memory spatial cache: key = (round(lat, 3), round(lon, 3)), value = (timestamp, data)
FACTOR_CACHE: Dict[tuple, tuple[float, Dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 600  # 10 minutes cache TTL


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def fetch_open_meteo_factors(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetches elevation, rainfall (hourly past 7 days), and soil moisture from Open-Meteo.
    Calculates 24h, 3-day (72h), and 7-day (168h) cumulative precipitation from hourly records.
    """
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        f"&hourly=precipitation,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm"
        f"&past_days=7&forecast_days=1&timezone=auto"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "NERSAFE/1.0 (sih-ner-safe@gov.in)"})
    
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    
    elevation_val = data.get("elevation")
    hourly = data.get("hourly", {})
    precip_list = hourly.get("precipitation", [])
    
    # Open-Meteo past_days=7 gives 7*24 = 168 past hours + 24 forecast hours = 192 hours
    # The past 168 hours correspond to index 0 to 168
    past_168_precip = precip_list[:168] if len(precip_list) >= 168 else precip_list
    
    # 24-hour rainfall = sum of previous 24 hours (hours 144 to 168)
    # 3-day rainfall = sum of previous 72 hours (hours 96 to 168)
    # 7-day rainfall = sum of previous 168 hours
    if len(past_168_precip) >= 24:
        rain_24h = round(sum(past_168_precip[-24:]), 2)
    else:
        rain_24h = round(sum(past_168_precip), 2) if past_168_precip else 0.0

    if len(past_168_precip) >= 72:
        rain_3d = round(sum(past_168_precip[-72:]), 2)
    else:
        rain_3d = round(sum(past_168_precip), 2) if past_168_precip else 0.0

    rain_7d = round(sum(past_168_precip), 2) if past_168_precip else 0.0
    current_rain = round(past_168_precip[-1], 2) if past_168_precip else 0.0

    # Soil moisture depths (latest available reading)
    sm_0_1 = hourly.get("soil_moisture_0_to_1cm", [])
    sm_1_3 = hourly.get("soil_moisture_1_to_3cm", [])
    sm_3_9 = hourly.get("soil_moisture_3_to_9cm", [])
    sm_9_27 = hourly.get("soil_moisture_9_to_27cm", [])

    current_sm = round(sm_0_1[167], 3) if len(sm_0_1) >= 168 and sm_0_1[167] is not None else (round(sm_0_1[-1], 3) if sm_0_1 else None)
    current_sm_0_1 = current_sm
    current_sm_1_3 = round(sm_1_3[167], 3) if len(sm_1_3) >= 168 and sm_1_3[167] is not None else (round(sm_1_3[-1], 3) if sm_1_3 else None)
    current_sm_3_9 = round(sm_3_9[167], 3) if len(sm_3_9) >= 168 and sm_3_9[167] is not None else (round(sm_3_9[-1], 3) if sm_3_9 else None)
    current_sm_9_27 = round(sm_9_27[167], 3) if len(sm_9_27) >= 168 and sm_9_27[167] is not None else (round(sm_9_27[-1], 3) if sm_9_27 else None)

    return {
        "elevation_m": elevation_val,
        "current_rainfall_mm": current_rain,
        "rainfall_intensity_mm_h": current_rain,
        "rainfall_24h_mm": rain_24h,
        "rainfall_3d_mm": rain_3d,
        "rainfall_7d_mm": rain_7d,
        "antecedent_rainfall_mm": rain_7d,
        "soil_moisture_m3_m3": current_sm,
        "soil_moisture_depths": {
            "depth_0_to_1cm": current_sm_0_1,
            "depth_1_to_3cm": current_sm_1_3,
            "depth_3_to_9cm": current_sm_3_9,
            "depth_9_to_27cm": current_sm_9_27
        }
    }


def fetch_usgs_earthquake_factors(lat: float, lon: float) -> Dict[str, Any]:
    """
    Queries USGS Earthquake Hazards API for events within regional radius (300 km) over the past 30 days.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    start_time = (now - datetime.timedelta(days=30)).strftime("%Y-%m-%d")
    url = (
        f"https://earthquake.usgs.gov/fdsnws/event/1/query?"
        f"format=geojson&latitude={lat}&longitude={lon}&maxradiuskm=300"
        f"&starttime={start_time}&minmagnitude=2.5&limit=1&orderby=time"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "NERSAFE/1.0 (sih-ner-safe@gov.in)"})
    
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    
    features = data.get("features", [])
    if not features:
        return {
            "detected": False,
            "message": "No recent earthquake detected",
            "nearest": None,
            "source": "USGS Earthquake Hazards Program",
            "status": "Recent seismic catalog"
        }
    
    f0 = features[0]
    props = f0.get("properties", {})
    geom = f0.get("geometry", {})
    coords = geom.get("coordinates", [0, 0, 0])
    
    eq_lon, eq_lat = coords[0], coords[1]
    eq_depth = coords[2] if len(coords) > 2 else None
    
    dist_m = haversine_distance_m(lat, lon, eq_lat, eq_lon)
    dist_km = round(dist_m / 1000.0, 1)
    
    time_epoch_ms = props.get("time")
    time_str = "Recent"
    if time_epoch_ms:
        time_str = datetime.datetime.fromtimestamp(time_epoch_ms / 1000.0, tz=datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    return {
        "detected": True,
        "message": "Recent earthquake detected within 300 km",
        "nearest": {
            "magnitude": props.get("mag"),
            "distance_km": dist_km,
            "depth_km": eq_depth,
            "time": time_str,
            "place": props.get("place", "Regional seismic epicenter")
        },
        "source": "USGS Earthquake Hazards Program",
        "status": "Recent seismic catalog"
    }


def fetch_osm_infrastructure_factors(lat: float, lon: float) -> Dict[str, Any]:
    """
    Queries OpenStreetMap Overpass API for nearest road, highway, and waterway within 3 km.
    """
    query = f"""[out:json][timeout:4];
(
  way["highway"](around:3000,{lat},{lon});
  way["waterway"](around:3000,{lat},{lon});
);
out center 20;"""
    url = "https://overpass-api.de/api/interpreter"
    data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "NERSAFE/1.0 (sih-ner-safe@gov.in)"})
    
    with urllib.request.urlopen(req, timeout=5) as resp:
        res = json.loads(resp.read().decode("utf-8"))
    
    elements = res.get("elements", [])
    road_dists = []
    hwy_dists = []
    river_dists = []
    
    for el in elements:
        tags = el.get("tags", {})
        center = el.get("center", {})
        clat = center.get("lat")
        clon = center.get("lon")
        if clat is not None and clon is not None:
            d = haversine_distance_m(lat, lon, clat, clon)
            if "highway" in tags:
                road_dists.append(d)
                hwy_type = tags.get("highway", "")
                if hwy_type in ["primary", "secondary", "trunk", "motorway", "primary_link", "trunk_link"]:
                    hwy_dists.append(d)
            if "waterway" in tags:
                river_dists.append(d)
                
    min_road = round(min(road_dists), 1) if road_dists else None
    min_hwy = round(min(hwy_dists), 1) if hwy_dists else None
    min_river = round(min(river_dists), 1) if river_dists else None
    
    return {
        "distance_to_nearest_road_m": min_road,
        "distance_to_nearest_highway_m": min_hwy,
        "distance_to_nearest_river_m": min_river,
        "nearby_infrastructure": f"{len(elements)} infrastructure features detected within 3 km buffer" if elements else "No major transport or water features within 3 km buffer",
        "source": "OpenStreetMap / Overpass API",
        "status": "Spatial distance query",
        "note": "Distance to road is a measurable spatial factor. Road cutting risk not inferred."
    }


def get_location_landslide_factors(lat: float, lon: float) -> Dict[str, Any]:
    """
    Main aggregator for location-based landslide factors.
    Returns normalized factor dictionary covering all 9 required categories.
    Implements caching and partial-failure resilience.
    NO risk percentages, scores, or predictions are generated.
    """
    # 1. Coordinate Validation
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
        raise ValueError(f"Invalid coordinates: lat={lat}, lon={lon}. Lat must be [-90, 90], Lon [-180, 180].")

    # 2. Check spatial cache (10-min TTL)
    cache_key = (round(lat, 3), round(lon, 3))
    now_ts = time.time()
    if cache_key in FACTOR_CACHE:
        cached_time, cached_payload = FACTOR_CACHE[cache_key]
        if now_ts - cached_time < CACHE_TTL_SECONDS:
            return cached_payload

    # 3. Collect Factors with Partial-Failure Resilience
    # Open-Meteo (Elevation & Rainfall & Soil Moisture)
    meteo_data = None
    meteo_error = None
    try:
        meteo_data = fetch_open_meteo_factors(lat, lon)
    except Exception as e:
        meteo_error = str(e)

    # USGS Earthquakes
    usgs_data = None
    usgs_error = None
    try:
        usgs_data = fetch_usgs_earthquake_factors(lat, lon)
    except Exception as e:
        usgs_error = str(e)

    # OpenStreetMap / Overpass
    osm_data = None
    osm_error = None
    try:
        osm_data = fetch_osm_infrastructure_factors(lat, lon)
    except Exception as e:
        osm_error = str(e)

    # 4. Construct Normalized Factor Payload across 9 Categories

    # 1. LOCATION
    cat_location = {
        "latitude": round(lat, 6),
        "longitude": round(lon, 6),
        "source": "Browser Geolocation API (HTML5 W3C)",
        "source_url": "https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API",
        "data_type": "Observed / Live GPS",
        "status": "Live GPS Fix"
    }

    # 2. TERRAIN
    elevation_val = meteo_data.get("elevation_m") if meteo_data else None
    cat_terrain = {
        "elevation_m": elevation_val,
        "elevation_source": "Copernicus GLO-90 DEM / Open-Meteo" if elevation_val is not None else "Unavailable",
        "elevation_status": "Derived / DEM" if elevation_val is not None else "Unavailable",
        "source_url": "https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model",
        "data_type": "DEM-Derived Topography",
        "slope_deg": None,
        "aspect": None,
        "curvature": None,
        "relative_relief": None,
        "drainage_density": None,
        "flow_accumulation": None,
        "twi": None,
        "status": "Partially Available" if elevation_val is not None else "Unavailable",
        "unavailable_reason": "DEM terrain raster processing not configured. A single elevation point cannot determine slope."
    }

    # 3. RAINFALL & WATER
    if meteo_data:
        cat_rainfall = {
            "current_rainfall_mm": meteo_data.get("current_rainfall_mm"),
            "rainfall_intensity_mm_h": meteo_data.get("rainfall_intensity_mm_h"),
            "rainfall_24h_mm": meteo_data.get("rainfall_24h_mm"),
            "rainfall_3d_mm": meteo_data.get("rainfall_3d_mm"),
            "rainfall_7d_mm": meteo_data.get("rainfall_7d_mm"),
            "antecedent_rainfall_mm": meteo_data.get("antecedent_rainfall_mm"),
            "soil_moisture_m3_m3": meteo_data.get("soil_moisture_m3_m3"),
            "soil_moisture_depths": meteo_data.get("soil_moisture_depths"),
            "source": "Open-Meteo Weather API",
            "source_url": "https://open-meteo.com/en/docs",
            "data_type": "Observed / Forecast",
            "status": "Live / Recent",
            "available": True
        }
    else:
        cat_rainfall = {
            "current_rainfall_mm": None,
            "rainfall_intensity_mm_h": None,
            "rainfall_24h_mm": None,
            "rainfall_3d_mm": None,
            "rainfall_7d_mm": None,
            "antecedent_rainfall_mm": None,
            "soil_moisture_m3_m3": None,
            "soil_moisture_depths": None,
            "source": "Open-Meteo Weather API",
            "source_url": "https://open-meteo.com/en/docs",
            "data_type": "Observed / Forecast",
            "status": "Temporarily unavailable",
            "available": False,
            "unavailable_reason": f"Weather API error: {meteo_error}"
        }

    # 4. SOIL
    cat_soil = {
        "soil_moisture_m3_m3": meteo_data.get("soil_moisture_m3_m3") if meteo_data else None,
        "soil_type": None,
        "sand_pct": None,
        "silt_pct": None,
        "clay_pct": None,
        "soil_depth": None,
        "bulk_density": None,
        "organic_carbon": None,
        "source": "Open-Meteo (Moisture) / SoilGrids (Pedological)",
        "source_url": "https://open-meteo.com/en/docs",
        "data_type": "Model-derived Soil Saturation",
        "status": "Moisture Live, Pedological Unavailable",
        "unavailable_reason": "Pedological dataset / SoilGrids raster not configured locally"
    }

    # 5. GEOLOGY
    cat_geology = {
        "geological_formation": None,
        "rock_type": None,
        "lithology": None,
        "fault_fracture": None,
        "source": "Geological Survey of India (GSI) / SEISAT",
        "source_url": "https://www.gsi.gov.in/",
        "data_type": "Geological Survey Vector Dataset (Offline)",
        "status": "Unavailable",
        "unavailable_reason": "Geological Survey of India (GSI) 1:50k vector dataset not configured locally"
    }

    # 6. LAND COVER / VEGETATION
    cat_land_cover = {
        "land_cover": None,
        "vegetation_cover": None,
        "ndvi": None,
        "builtup_bare_status": None,
        "source": "ESA WorldCover (Reference: 2021)",
        "source_url": "https://esa-worldcover.org/",
        "data_type": "Satellite-derived 10m Classification",
        "reference_year": "2021",
        "status": "Unavailable",
        "unavailable_reason": "ESA WorldCover 2021 offline raster not configured locally. Reference product: ESA WorldCover 2021."
    }

    # 7. HUMAN / INFRASTRUCTURE
    if osm_data:
        cat_infrastructure = dict(osm_data)
        cat_infrastructure["available"] = True
        cat_infrastructure["source_url"] = "https://www.openstreetmap.org/"
        cat_infrastructure["data_type"] = "Observed Spatial Vector Query"
    else:
        cat_infrastructure = {
            "distance_to_nearest_road_m": None,
            "distance_to_nearest_highway_m": None,
            "distance_to_nearest_river_m": None,
            "nearby_infrastructure": "Temporarily unavailable",
            "source": "OpenStreetMap / Overpass API",
            "source_url": "https://www.openstreetmap.org/",
            "data_type": "Observed Spatial Vector Query",
            "status": "Temporarily unavailable",
            "available": False,
            "unavailable_reason": "OpenStreetMap Overpass API request timed out or was temporarily unreachable",
            "note": "Distance to road is a measurable spatial factor. Road cutting risk not inferred."
        }

    # 8. EARTHQUAKE
    if usgs_data:
        cat_earthquake = dict(usgs_data)
        cat_earthquake["available"] = True
        cat_earthquake["source_url"] = "https://earthquake.usgs.gov/fdsnws/event/1/"
        cat_earthquake["data_type"] = "Observed Seismic Catalog"
    else:
        cat_earthquake = {
            "detected": False,
            "message": "Earthquake data unavailable",
            "nearest": None,
            "source": "USGS Earthquake Hazards Program",
            "source_url": "https://earthquake.usgs.gov/fdsnws/event/1/",
            "data_type": "Observed Seismic Catalog",
            "status": "Temporarily unavailable",
            "available": False,
            "unavailable_reason": f"USGS API error: {usgs_error}"
        }

    # 9. HISTORICAL LANDSLIDES
    cat_historical = {
        "count_nearby": None,
        "nearest_landslide": None,
        "distance_km": None,
        "density": None,
        "trigger": None,
        "source": "Geological Survey of India (GSI) / ISRO Atlas",
        "source_url": "https://www.gsi.gov.in/webcenter/portal/OCBIS/pageGeoScience/pageNLSM",
        "data_type": "Historical Landslide Inventory",
        "status": "Historical dataset (Offline/Not configured)",
        "available": False,
        "unavailable_reason": "ISRO Landslide Atlas of India / GSI localized query not configured locally"
    }

    payload = {
        "location": cat_location,
        "terrain": cat_terrain,
        "rainfall": cat_rainfall,
        "soil": cat_soil,
        "geology": cat_geology,
        "land_cover": cat_land_cover,
        "infrastructure": cat_infrastructure,
        "earthquake": cat_earthquake,
        "historical_landslides": cat_historical,
        "provenance": build_provenance("open_meteo_weather", data_type="Multi-Source Spatial Landslide Factors")
    }

    # Store in spatial cache
    FACTOR_CACHE[cache_key] = (now_ts, payload)
    return payload
