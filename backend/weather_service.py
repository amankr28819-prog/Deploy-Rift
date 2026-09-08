"""
NER-SAFE Disaster Management System - Weather & Rainfall Gateway Service
Fetches, normalizes, and caches real-time and historical weather analytics from Open-Meteo.
Calculates 7-day, 30-day, and monthly rainfall statistics with India Meteorological Department (IMD) thresholds.
"""

import time
import json
import datetime
import urllib.request
import urllib.parse
from typing import Dict, List, Any, Optional

# WMO Weather Interpretation Codes
WMO_WEATHER_CODES: Dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    62: "Moderate rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
}

# In-memory weather cache: (round(lat, 3), round(lon, 3)) -> (timestamp, data)
WEATHER_CACHE: Dict[tuple, tuple[float, Dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes cache for current weather


def get_weather_condition(code: Optional[int]) -> str:
    """Maps WMO code to human-readable description."""
    if code is None:
        return "Unknown"
    return WMO_WEATHER_CODES.get(int(code), "Overcast / Rain")


def fetch_comprehensive_weather(lat: float, lon: float, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Fetches real-time, 7-day, 30-day, and 90-day daily historical weather from Open-Meteo.
    Applies IMD thresholds for rainy days (>= 2.5 mm) and heavy rainfall (>= 64.5 mm).
    Local timezone: Asia/Kolkata.
    """
    cache_key = (round(lat, 3), round(lon, 3))
    now_ts = time.time()

    if not force_refresh and cache_key in WEATHER_CACHE:
        cached_ts, cached_data = WEATHER_CACHE[cache_key]
        if now_ts - cached_ts < CACHE_TTL_SECONDS:
            return cached_data

    # Query Open-Meteo with 90 past days for complete monthly analyses
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m"
        f"&daily=weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,rain_sum"
        f"&past_days=90&forecast_days=1&timezone=Asia%2FKolkata"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "NERSAFE/1.0 (sih-ner-safe@gov.in)"})

    with urllib.request.urlopen(req, timeout=9) as resp:
        raw_data = json.loads(resp.read().decode("utf-8"))

    current_raw = raw_data.get("current", {})
    daily_raw = raw_data.get("daily", {})

    times = daily_raw.get("time", [])
    precip_sums = daily_raw.get("precipitation_sum", [])
    temp_maxes = daily_raw.get("temperature_2m_max", [])
    temp_mins = daily_raw.get("temperature_2m_min", [])
    temp_means = daily_raw.get("temperature_2m_mean", [])
    weather_codes = daily_raw.get("weather_code", [])

    total_days = len(times)
    # The last element in forecast_days=1 is today (current day)
    today_idx = total_days - 1 if total_days > 0 else 0

    # Current weather object
    now_ist = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
    formatted_updated = now_ist.strftime("%H:%M:%S IST")

    w_code = current_raw.get("weather_code")
    curr_precip = round(float(current_raw.get("precipitation", 0.0) or 0.0), 1)
    today_rain = round(float(precip_sums[today_idx] or 0.0), 1) if today_idx < len(precip_sums) else 0.0

    current_weather = {
        "temperature": round(float(current_raw.get("temperature_2m", 0.0) or 0.0), 1),
        "temperature_min": round(float(temp_mins[today_idx] or 0.0), 1) if today_idx < len(temp_mins) else None,
        "temperature_max": round(float(temp_maxes[today_idx] or 0.0), 1) if today_idx < len(temp_maxes) else None,
        "rainfall": curr_precip,
        "rainfall_intensity": curr_precip,
        "humidity": int(current_raw.get("relative_humidity_2m", 0) or 0),
        "wind_speed": round(float(current_raw.get("wind_speed_10m", 0.0) or 0.0), 1),
        "weather_code": w_code,
        "weather_condition": get_weather_condition(w_code),
        "today_rainfall": today_rain,
        "updated_at": formatted_updated,
        "source": "Open-Meteo Weather API",
        "source_type": "Latest Available Weather Data",
        "timezone": "Asia/Kolkata",
        "period": "Real-time atmospheric reading"
    }

    # Slice past 7 completed days preceding today
    slice_7_start = max(0, today_idx - 7)
    slice_7_end = today_idx

    daily_7d = []
    for i in range(slice_7_start, slice_7_end):
        d_str = times[i]
        d_obj = datetime.datetime.strptime(d_str, "%Y-%m-%d")
        daily_7d.append({
            "date": d_str,
            "date_formatted": d_obj.strftime("%b %d, %Y"),
            "date_label": d_obj.strftime("%b %d"),
            "rainfall": round(float(precip_sums[i] or 0.0), 1),
            "temperature_min": round(float(temp_mins[i] or 0.0), 1) if temp_mins[i] is not None else None,
            "temperature_max": round(float(temp_maxes[i] or 0.0), 1) if temp_maxes[i] is not None else None,
            "temperature_mean": round(float(temp_means[i] or 0.0), 1) if temp_means[i] is not None else None,
            "weather_code": weather_codes[i] if i < len(weather_codes) else 0,
            "weather_condition": get_weather_condition(weather_codes[i] if i < len(weather_codes) else 0),
            "data_source": "Open-Meteo Historical/Reanalysis"
        })

    # Slice past 30 completed days preceding today
    slice_30_start = max(0, today_idx - 30)
    slice_30_end = today_idx

    daily_30d = []
    for i in range(slice_30_start, slice_30_end):
        d_str = times[i]
        d_obj = datetime.datetime.strptime(d_str, "%Y-%m-%d")
        daily_30d.append({
            "date": d_str,
            "date_formatted": d_obj.strftime("%b %d, %Y"),
            "date_label": d_obj.strftime("%b %d"),
            "rainfall": round(float(precip_sums[i] or 0.0), 1),
            "temperature_min": round(float(temp_mins[i] or 0.0), 1) if temp_mins[i] is not None else None,
            "temperature_max": round(float(temp_maxes[i] or 0.0), 1) if temp_maxes[i] is not None else None,
            "temperature_mean": round(float(temp_means[i] or 0.0), 1) if temp_means[i] is not None else None,
            "weather_code": weather_codes[i] if i < len(weather_codes) else 0,
            "weather_condition": get_weather_condition(weather_codes[i] if i < len(weather_codes) else 0),
            "data_source": "Open-Meteo Historical/Reanalysis"
        })

    # Statistical Aggregations (Past 7 Days & Past 30 Days)
    p7_rains = [d["rainfall"] for d in daily_7d]
    p30_rains = [d["rainfall"] for d in daily_30d]

    rain_7d_total = round(sum(p7_rains), 1)
    rain_30d_total = round(sum(p30_rains), 1)

    avg_7d = round(rain_7d_total / len(p7_rains), 2) if p7_rains else 0.0
    avg_30d = round(rain_30d_total / len(p30_rains), 2) if p30_rains else 0.0

    max_7d = max(p7_rains) if p7_rains else 0.0
    max_30d = max(p30_rains) if p30_rains else 0.0
    min_30d = min(p30_rains) if p30_rains else 0.0

    wettest_day_7d = ""
    for d in daily_7d:
        if d["rainfall"] == max_7d and max_7d > 0:
            wettest_day_7d = d["date_label"]
            break

    wettest_day_30d = ""
    for d in daily_30d:
        if d["rainfall"] == max_30d and max_30d > 0:
            wettest_day_30d = d["date_label"]
            break

    # IMD Meteorological Standard Thresholds:
    # A "Rainy Day" is defined by IMD as a day with 2.5 mm or more rainfall.
    # A "Heavy Rainfall Day" is defined as 64.5 mm or more rainfall.
    rainy_days_7d = sum(1 for r in p7_rains if r >= 2.5)
    rainy_days_30d = sum(1 for r in p30_rains if r >= 2.5)
    heavy_rain_days_30d = sum(1 for r in p30_rains if r >= 64.5)

    period_7d_str = f"{daily_7d[0]['date']} to {daily_7d[-1]['date']}" if daily_7d else ""
    period_30d_str = f"{daily_30d[0]['date']} to {daily_30d[-1]['date']}" if daily_30d else ""

    # Monthly Rainfall Aggregation (Current month vs Previous calendar month)
    curr_year_month = now_ist.strftime("%Y-%m")
    # Previous month calculation
    first_of_curr_month = now_ist.replace(day=1)
    last_of_prev_month = first_of_curr_month - datetime.timedelta(days=1)
    prev_year_month = last_of_prev_month.strftime("%Y-%m")

    curr_month_rains = []
    prev_month_rains = []
    months_map: Dict[str, List[float]] = {}

    for i in range(total_days):
        d_str = times[i]
        ym = d_str[:7]
        r = float(precip_sums[i] or 0.0)
        if ym not in months_map:
            months_map[ym] = []
        months_map[ym].append(r)

        if ym == curr_year_month:
            curr_month_rains.append(r)
        elif ym == prev_year_month:
            prev_month_rains.append(r)

    curr_month_total = round(sum(curr_month_rains), 1)
    prev_month_total = round(sum(prev_month_rains), 1)
    curr_month_avg = round(curr_month_total / len(curr_month_rains), 2) if curr_month_rains else 0.0
    curr_month_rainy = sum(1 for r in curr_month_rains if r >= 2.5)

    recent_months_list = []
    sorted_ym = sorted(list(months_map.keys()))[-4:]
    for ym in sorted_ym:
        dt_m = datetime.datetime.strptime(ym, "%Y-%m")
        m_rains = months_map[ym]
        recent_months_list.append({
            "year_month": ym,
            "month_name": dt_m.strftime("%B %Y"),
            "rainfall_total": round(sum(m_rains), 1),
            "rainy_days": sum(1 for r in m_rains if r >= 2.5),
            "max_daily": max(m_rains) if m_rains else 0.0,
            "data_source": "Open-Meteo Historical/Reanalysis"
        })

    statistics = {
        "rainfall_7d": rain_7d_total,
        "rainfall_30d": rain_30d_total,
        "average_7d": avg_7d,
        "average_30d": avg_30d,
        "maximum_daily_7d": max_7d,
        "maximum_daily_30d": max_30d,
        "minimum_daily_30d": min_30d,
        "wettest_day_7d": wettest_day_7d or (daily_7d[-1]["date_label"] if daily_7d else "—"),
        "wettest_day_30d": wettest_day_30d or (daily_30d[-1]["date_label"] if daily_30d else "—"),
        "rainy_days_7d": rainy_days_7d,
        "rainy_days_30d": rainy_days_30d,
        "heavy_rain_days_30d": heavy_rain_days_30d,
        "period_7d": period_7d_str,
        "period_30d": period_30d_str,
        "threshold_source": "IMD Rainfall Classification Benchmark (Rainy Day >= 2.5mm, Heavy Rain >= 64.5mm)",
        "current_month_rainfall": curr_month_total,
        "current_month_name": now_ist.strftime("%B"),
        "current_month_average": curr_month_avg,
        "current_month_rainy_days": curr_month_rainy,
        "previous_month_rainfall": prev_month_total,
        "previous_month_name": last_of_prev_month.strftime("%B"),
        "last_updated": formatted_updated,
        "data_source": "Open-Meteo Historical/Reanalysis"
    }

    metadata = {
        "current_weather_source": "Open-Meteo Weather API",
        "current_weather_type": "Latest Available Weather Data",
        "rainfall_data_source": "Open-Meteo Historical/Reanalysis",
        "rainfall_data_type": "Historical/Reanalysis Estimates",
        "classification_standard": "IMD Rainfall Classification Benchmark",
        "classification_note": "IMD thresholds are used for scientific classification and hazard benchmarking; numerical precipitation values originate from Open-Meteo.",
        "timezone": "Asia/Kolkata (IST)",
        "last_updated": formatted_updated
    }

    payload = {
        "current": current_weather,
        "daily_7d": daily_7d,
        "daily_30d": daily_30d,
        "statistics": statistics,
        "monthly_summary": {
            "current_month_name": now_ist.strftime("%B"),
            "current_month_rainfall": curr_month_total,
            "previous_month_name": last_of_prev_month.strftime("%B"),
            "previous_month_rainfall": prev_month_total,
            "data_source": "Open-Meteo Historical/Reanalysis",
            "recent_months": recent_months_list
        },
        "metadata": metadata
    }

    WEATHER_CACHE[cache_key] = (now_ts, payload)
    return payload


def fetch_state_district_comparison(state_name: str) -> List[Dict[str, Any]]:
    """
    Fetches 7-day cumulative rainfall comparison for key districts in the chosen state.
    Limits to top 6 representative districts to avoid excessive external calls.
    Results are cached for high responsiveness.
    """
    from backend.northeast_data import DISTRICTS_DATA
    dist_dict = DISTRICTS_DATA.get(state_name, {})
    if not dist_dict:
        return []

    # Pick up to 6 key districts
    d_keys = list(dist_dict.keys())
    sample_keys = d_keys[:6] if len(d_keys) > 6 else d_keys

    results = []
    for d_name in sample_keys:
        info = dist_dict[d_name]
        try:
            w = fetch_comprehensive_weather(info["lat"], info["lon"])
            results.append({
                "district": d_name,
                "rainfall_7d": w["statistics"]["rainfall_7d"],
                "total_7d_mm": w["statistics"]["rainfall_7d"],
                "rainfall_30d": w["statistics"]["rainfall_30d"],
                "current_rainfall": w["current"]["rainfall"],
                "temperature": w["current"]["temperature"],
                "data_source": "Open-Meteo Historical/Reanalysis",
                "available": True
            })
        except Exception as e:
            results.append({
                "district": d_name,
                "rainfall_7d": None,
                "total_7d_mm": None,
                "rainfall_30d": None,
                "current_rainfall": None,
                "temperature": None,
                "available": False,
                "error": str(e)
            })

    return results
