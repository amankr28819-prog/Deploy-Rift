"""
NER-SAFE Disaster Management System - North Eastern Region Geographic Dataset
Authoritative state and district centroids for all 8 North Eastern states of India.
Covers 130 administrative districts with official coordinates.
"""

import math
from typing import Dict, List, Any, Optional

NORTHEAST_STATES = [
    "Arunachal Pradesh",
    "Assam",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Sikkim",
    "Tripura"
]

# Official district centroids (lat, lon) and headquarters
DISTRICTS_DATA: Dict[str, Dict[str, Dict[str, Any]]] = {
    "Arunachal Pradesh": {
        "Anjaw": {"lat": 27.9255, "lon": 96.8286, "hq": "Hawai"},
        "Changlang": {"lat": 27.1264, "lon": 95.7337, "hq": "Changlang"},
        "Dibang Valley": {"lat": 28.8286, "lon": 95.8458, "hq": "Anini"},
        "East Kameng": {"lat": 27.3000, "lon": 93.0300, "hq": "Seppa"},
        "East Siang": {"lat": 28.0667, "lon": 95.3333, "hq": "Pasighat"},
        "Itanagar Capital Complex": {"lat": 27.0844, "lon": 93.6053, "hq": "Itanagar"},
        "Kamle": {"lat": 27.6500, "lon": 94.0500, "hq": "Raga"},
        "Kra Daadi": {"lat": 27.8500, "lon": 93.4500, "hq": "Jamin"},
        "Kurung Kumey": {"lat": 27.9167, "lon": 93.3833, "hq": "Koloriang"},
        "Leparada": {"lat": 27.8333, "lon": 94.7500, "hq": "Basar"},
        "Lohit": {"lat": 27.9000, "lon": 96.1667, "hq": "Tezu"},
        "Longding": {"lat": 26.8500, "lon": 95.3000, "hq": "Longding"},
        "Lower Dibang Valley": {"lat": 28.1500, "lon": 95.8333, "hq": "Roing"},
        "Lower Siang": {"lat": 27.8000, "lon": 94.7000, "hq": "Likabali"},
        "Lower Subansiri": {"lat": 27.5500, "lon": 93.8333, "hq": "Ziro"},
        "Namsai": {"lat": 27.6667, "lon": 95.8667, "hq": "Namsai"},
        "Pakke Kessang": {"lat": 27.1500, "lon": 93.1000, "hq": "Lemmi"},
        "Papum Pare": {"lat": 27.1500, "lon": 93.5000, "hq": "Yupia"},
        "Shi Yomi": {"lat": 28.5800, "lon": 94.1300, "hq": "Tato"},
        "Siang": {"lat": 28.2500, "lon": 94.9500, "hq": "Pangin"},
        "Tawang": {"lat": 27.5861, "lon": 91.8594, "hq": "Tawang"},
        "Tirap": {"lat": 27.0000, "lon": 95.5000, "hq": "Khonsa"},
        "Upper Siang": {"lat": 28.6167, "lon": 94.9500, "hq": "Yingkiong"},
        "Upper Subansiri": {"lat": 28.0000, "lon": 94.1667, "hq": "Daporijo"},
        "West Kameng": {"lat": 27.2500, "lon": 92.4167, "hq": "Bomdila"},
        "West Siang": {"lat": 28.1667, "lon": 94.6667, "hq": "Aalo"}
    },
    "Assam": {
        "Bajali": {"lat": 26.5000, "lon": 91.1700, "hq": "Madan Rawta"},
        "Baksa": {"lat": 26.6500, "lon": 91.4000, "hq": "Mushalpur"},
        "Barpeta": {"lat": 26.3200, "lon": 91.0000, "hq": "Barpeta"},
        "Biswanath": {"lat": 26.7333, "lon": 93.1500, "hq": "Biswanath Chariali"},
        "Bongaigaon": {"lat": 26.4800, "lon": 90.5600, "hq": "Bongaigaon"},
        "Cachar": {"lat": 24.8333, "lon": 92.8000, "hq": "Silchar"},
        "Charaideo": {"lat": 27.0300, "lon": 95.0000, "hq": "Sonari"},
        "Chirang": {"lat": 26.5500, "lon": 90.5000, "hq": "Kajalgaon"},
        "Darrang": {"lat": 26.4500, "lon": 92.0300, "hq": "Mangaldai"},
        "Dhemaji": {"lat": 27.4800, "lon": 94.5800, "hq": "Dhemaji"},
        "Dhubri": {"lat": 26.0200, "lon": 89.9700, "hq": "Dhubri"},
        "Dibrugarh": {"lat": 27.4728, "lon": 94.9120, "hq": "Dibrugarh"},
        "Dima Hasao": {"lat": 25.1800, "lon": 93.0200, "hq": "Haflong"},
        "Goalpara": {"lat": 26.1700, "lon": 90.6200, "hq": "Goalpara"},
        "Golaghat": {"lat": 26.5200, "lon": 93.9700, "hq": "Golaghat"},
        "Hailakandi": {"lat": 24.6800, "lon": 92.5600, "hq": "Hailakandi"},
        "Hojai": {"lat": 26.0000, "lon": 92.8500, "hq": "Sankardev Nagar"},
        "Jorhat": {"lat": 26.7500, "lon": 94.2200, "hq": "Jorhat"},
        "Kamrup": {"lat": 26.3000, "lon": 91.5800, "hq": "Amingaon"},
        "Kamrup Metropolitan": {"lat": 26.1445, "lon": 91.7362, "hq": "Guwahati"},
        "Karbi Anglong": {"lat": 26.0000, "lon": 93.5000, "hq": "Diphu"},
        "Karimganj": {"lat": 24.8700, "lon": 92.3500, "hq": "Karimganj"},
        "Kokrajhar": {"lat": 26.4000, "lon": 90.2700, "hq": "Kokrajhar"},
        "Lakhimpur": {"lat": 27.2300, "lon": 94.1000, "hq": "North Lakhimpur"},
        "Majuli": {"lat": 26.9500, "lon": 94.2000, "hq": "Garamur"},
        "Morigaon": {"lat": 26.2500, "lon": 92.3400, "hq": "Morigaon"},
        "Nagaon": {"lat": 26.3500, "lon": 92.6800, "hq": "Nagaon"},
        "Nalbari": {"lat": 26.4500, "lon": 91.4400, "hq": "Nalbari"},
        "Sivasagar": {"lat": 26.9800, "lon": 94.6300, "hq": "Sivasagar"},
        "Sonitpur": {"lat": 26.6300, "lon": 92.8000, "hq": "Tezpur"},
        "South Salmara-Mankachar": {"lat": 25.6800, "lon": 89.8700, "hq": "Hatsingimari"},
        "Tamulpur": {"lat": 26.6300, "lon": 91.5700, "hq": "Tamulpur"},
        "Tinsukia": {"lat": 27.5000, "lon": 95.3600, "hq": "Tinsukia"},
        "Udalguri": {"lat": 26.7500, "lon": 92.1000, "hq": "Udalguri"},
        "West Karbi Anglong": {"lat": 25.8000, "lon": 92.6000, "hq": "Hamren"}
    },
    "Manipur": {
        "Bishnupur": {"lat": 24.6300, "lon": 93.7600, "hq": "Bishnupur"},
        "Chandel": {"lat": 24.3200, "lon": 94.0000, "hq": "Chandel"},
        "Churachandpur": {"lat": 24.3300, "lon": 93.6700, "hq": "Churachandpur"},
        "Imphal East": {"lat": 24.8200, "lon": 93.9500, "hq": "Porompat"},
        "Imphal West": {"lat": 24.8170, "lon": 93.9368, "hq": "Lamphelpat"},
        "Jiribam": {"lat": 24.8000, "lon": 93.1200, "hq": "Jiribam"},
        "Kakching": {"lat": 24.4800, "lon": 93.9800, "hq": "Kakching"},
        "Kamjong": {"lat": 24.9000, "lon": 94.4500, "hq": "Kamjong"},
        "Kangpokpi": {"lat": 25.1500, "lon": 93.9700, "hq": "Kangpokpi"},
        "Noney": {"lat": 24.7800, "lon": 93.6000, "hq": "Noney"},
        "Pherzawl": {"lat": 24.2500, "lon": 93.1800, "hq": "Pherzawl"},
        "Senapati": {"lat": 25.2700, "lon": 94.0200, "hq": "Senapati"},
        "Tamenglong": {"lat": 24.9800, "lon": 93.4900, "hq": "Tamenglong"},
        "Tengnoupal": {"lat": 24.4000, "lon": 94.1500, "hq": "Tengnoupal"},
        "Thoubal": {"lat": 24.6300, "lon": 93.9900, "hq": "Thoubal"},
        "Ukhrul": {"lat": 25.1100, "lon": 94.3600, "hq": "Ukhrul"}
    },
    "Meghalaya": {
        "East Garo Hills": {"lat": 25.6000, "lon": 90.5800, "hq": "Williamnagar"},
        "East Jaintia Hills": {"lat": 25.3000, "lon": 92.3500, "hq": "Khliehriat"},
        "East Khasi Hills": {"lat": 25.5788, "lon": 91.8933, "hq": "Shillong"},
        "Eastern West Khasi Hills": {"lat": 25.5200, "lon": 91.4500, "hq": "Mairang"},
        "North Garo Hills": {"lat": 25.9000, "lon": 90.5800, "hq": "Resubelpara"},
        "Ri Bhoi": {"lat": 25.9000, "lon": 91.8800, "hq": "Nongpoh"},
        "South Garo Hills": {"lat": 25.3000, "lon": 90.6300, "hq": "Baghmara"},
        "South West Garo Hills": {"lat": 25.5000, "lon": 89.9500, "hq": "Ampati"},
        "South West Khasi Hills": {"lat": 25.3500, "lon": 91.2500, "hq": "Mawkyrwat"},
        "West Garo Hills": {"lat": 25.5200, "lon": 90.2200, "hq": "Tura"},
        "West Jaintia Hills": {"lat": 25.4500, "lon": 92.2000, "hq": "Jowai"},
        "West Khasi Hills": {"lat": 25.5200, "lon": 91.2500, "hq": "Nongstoin"}
    },
    "Mizoram": {
        "Aizawl": {"lat": 23.7271, "lon": 92.7176, "hq": "Aizawl"},
        "Champhai": {"lat": 23.4700, "lon": 93.3300, "hq": "Champhai"},
        "Hnahthial": {"lat": 22.9700, "lon": 92.9300, "hq": "Hnahthial"},
        "Khawzawl": {"lat": 23.5300, "lon": 93.1800, "hq": "Khawzawl"},
        "Kolasib": {"lat": 24.2200, "lon": 92.6800, "hq": "Kolasib"},
        "Lawngtlai": {"lat": 22.5300, "lon": 92.8900, "hq": "Lawngtlai"},
        "Lunglei": {"lat": 22.8800, "lon": 92.7300, "hq": "Lunglei"},
        "Mamit": {"lat": 23.9300, "lon": 92.4900, "hq": "Mamit"},
        "Saitual": {"lat": 23.6800, "lon": 92.9700, "hq": "Saitual"},
        "Serchhip": {"lat": 23.3100, "lon": 92.8500, "hq": "Serchhip"},
        "Siaha": {"lat": 22.4800, "lon": 92.9800, "hq": "Siaha"}
    },
    "Nagaland": {
        "Chumoukedima": {"lat": 25.7900, "lon": 93.7700, "hq": "Chumoukedima"},
        "Dimapur": {"lat": 25.9200, "lon": 93.7300, "hq": "Dimapur"},
        "Kiphire": {"lat": 25.9000, "lon": 94.7800, "hq": "Kiphire"},
        "Kohima": {"lat": 25.6751, "lon": 94.1086, "hq": "Kohima"},
        "Longleng": {"lat": 26.4700, "lon": 94.8100, "hq": "Longleng"},
        "Mokokchung": {"lat": 26.3200, "lon": 94.5200, "hq": "Mokokchung"},
        "Mon": {"lat": 26.7500, "lon": 95.0700, "hq": "Mon"},
        "Niuland": {"lat": 25.8800, "lon": 93.8800, "hq": "Niuland"},
        "Noklak": {"lat": 26.2000, "lon": 95.0300, "hq": "Noklak"},
        "Peren": {"lat": 25.5200, "lon": 93.7300, "hq": "Peren"},
        "Phek": {"lat": 25.6700, "lon": 94.5000, "hq": "Phek"},
        "Shamator": {"lat": 26.0500, "lon": 94.9000, "hq": "Shamator"},
        "Tseminyu": {"lat": 25.9200, "lon": 94.2200, "hq": "Tseminyu"},
        "Tuensang": {"lat": 26.2800, "lon": 94.8300, "hq": "Tuensang"},
        "Wokha": {"lat": 26.1000, "lon": 94.2600, "hq": "Wokha"},
        "Zunheboto": {"lat": 25.9700, "lon": 94.5200, "hq": "Zunheboto"}
    },
    "Sikkim": {
        "Gangtok": {"lat": 27.3389, "lon": 88.6065, "hq": "Gangtok"},
        "Gyalshing": {"lat": 27.2800, "lon": 88.2500, "hq": "Gyalshing"},
        "Mangan": {"lat": 27.5100, "lon": 88.5300, "hq": "Mangan"},
        "Namchi": {"lat": 27.1700, "lon": 88.3500, "hq": "Namchi"},
        "Pakyong": {"lat": 27.2400, "lon": 88.5900, "hq": "Pakyong"},
        "Soreng": {"lat": 27.1800, "lon": 88.2000, "hq": "Soreng"}
    },
    "Tripura": {
        "Dhalai": {"lat": 23.8500, "lon": 91.8500, "hq": "Ambassa"},
        "Gomati": {"lat": 23.5300, "lon": 91.4800, "hq": "Udaipur"},
        "Khowai": {"lat": 24.0600, "lon": 91.6000, "hq": "Khowai"},
        "North Tripura": {"lat": 24.3000, "lon": 92.1500, "hq": "Dharmanagar"},
        "Sepahijala": {"lat": 23.6800, "lon": 91.3300, "hq": "Bishramganj"},
        "South Tripura": {"lat": 23.2300, "lon": 91.5000, "hq": "Belonia"},
        "Unakoti": {"lat": 24.2800, "lon": 92.0200, "hq": "Kailashahar"},
        "West Tripura": {"lat": 23.8315, "lon": 91.2868, "hq": "Agartala"}
    }
}

# State-level representative centroids (State Capitals / Central Hubs)
STATE_CENTROIDS: Dict[str, Dict[str, Any]] = {
    "Arunachal Pradesh": {"lat": 27.0844, "lon": 93.6053, "capital": "Itanagar"},
    "Assam": {"lat": 26.1445, "lon": 91.7362, "capital": "Dispur / Guwahati"},
    "Manipur": {"lat": 24.8170, "lon": 93.9368, "capital": "Imphal"},
    "Meghalaya": {"lat": 25.5788, "lon": 91.8933, "capital": "Shillong"},
    "Mizoram": {"lat": 23.7271, "lon": 92.7176, "capital": "Aizawl"},
    "Nagaland": {"lat": 25.6751, "lon": 94.1086, "capital": "Kohima"},
    "Sikkim": {"lat": 27.3389, "lon": 88.6065, "capital": "Gangtok"},
    "Tripura": {"lat": 23.8315, "lon": 91.2868, "capital": "Agartala"}
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two coordinates in kilometers."""
    R = 6371.0  # Earth radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_states() -> List[str]:
    """Returns all 8 North Eastern states in alphabetical order."""
    return list(NORTHEAST_STATES)


def get_districts_by_state(state: str) -> List[str]:
    """Returns list of district names for the given North Eastern state."""
    dist_dict = DISTRICTS_DATA.get(state)
    if not dist_dict:
        return []
    return sorted(list(dist_dict.keys()))


def resolve_district_location(state: str, district: str) -> Optional[Dict[str, Any]]:
    """Resolves state + district to official coordinates."""
    state_dict = DISTRICTS_DATA.get(state)
    if not state_dict:
        return None
    d_info = state_dict.get(district)
    if not d_info:
        return None
    return {
        "state": state,
        "district": district,
        "latitude": d_info["lat"],
        "longitude": d_info["lon"],
        "headquarters": d_info.get("hq", district),
        "timezone": "Asia/Kolkata"
    }


def reverse_lookup_northeast_location(lat: float, lon: float) -> Dict[str, Any]:
    """
    Finds the nearest North East district centroid to the given coordinates.
    Allows manual lat/lon or device GPS input to display detected district and state.
    """
    nearest_state = None
    nearest_district = None
    min_dist_km = float("inf")
    hq = None

    for state, districts in DISTRICTS_DATA.items():
        for d_name, d_meta in districts.items():
            dist_km = haversine_km(lat, lon, d_meta["lat"], d_meta["lon"])
            if dist_km < min_dist_km:
                min_dist_km = dist_km
                nearest_state = state
                nearest_district = d_name
                hq = d_meta.get("hq", d_name)

    return {
        "state": nearest_state or "Assam",
        "district": nearest_district or "Kamrup Metropolitan",
        "headquarters": hq or "Guwahati",
        "distance_km": round(min_dist_km, 2),
        "latitude": lat,
        "longitude": lon,
        "timezone": "Asia/Kolkata"
    }
