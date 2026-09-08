"""
RIFT Citizen & Field Officer Reporting Service
Handles persistent storage of incident reports in backend/data/field_reports.json,
with verification status workflow (Submitted, Pending Verification, Verified, Rejected, Resolved)
and provenance tracking.
"""

import json
import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

REPORTS_FILE = os.path.join(os.path.dirname(__file__), "data", "field_reports.json")

def _load_reports_raw() -> List[Dict[str, Any]]:
    if not os.path.exists(REPORTS_FILE):
        return []
    try:
        with open(REPORTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []

def _save_reports_raw(reports: List[Dict[str, Any]]) -> bool:
    try:
        os.makedirs(os.path.dirname(REPORTS_FILE), exist_ok=True)
        with open(REPORTS_FILE, "w", encoding="utf-8") as f:
            json.dump(reports, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[ERROR] Failed to save field reports to {REPORTS_FILE}: {e}")
        return False

def get_all_reports(status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns list of reports, optionally filtered by status or verification state."""
    reports = _load_reports_raw()
    if status_filter and status_filter.lower() != "all":
        target = status_filter.lower()
        reports = [
            r for r in reports
            if r.get("status", "").lower() == target or r.get("verification_state", "").lower() == target
        ]
    return reports

def add_report(
    reporter_name: str,
    reporter_role: str,
    incident_type: str,
    location_name: str,
    severity: str,
    description: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    district: Optional[str] = None,
    state: Optional[str] = None,
    image_url: Optional[str] = None
) -> Dict[str, Any]:
    """Appends a newly submitted incident report and persists to disk."""
    reports = _load_reports_raw()
    
    now_utc = datetime.now(timezone.utc)
    timestamp_iso = now_utc.isoformat()
    new_id = f"rpt-{int(now_utc.timestamp())}"

    is_officer = "officer" in reporter_role.lower()
    reporter_type = "Field Officer" if is_officer else "Citizen"
    initial_verification = "Pending Verification"
    
    report_item = {
        "id": new_id,
        "reporterName": reporter_name.strip(),
        "reporterRole": reporter_role.strip().upper(),
        "reporterType": reporter_type,
        "incidentType": incident_type.strip(),
        "locationName": location_name.strip(),
        "district": district or "Unspecified",
        "state": state or "NER",
        "lat": lat,
        "lng": lng,
        "severity": severity.capitalize(),
        "status": "Submitted",
        "verification_state": initial_verification,
        "description": description.strip(),
        "imageUrl": image_url,
        "submittedAt": timestamp_iso,
        "submittedAgo": "Just now",
        "provenance": {
            "source_id": "citizen_reports",
            "source_name": f"{reporter_type} Ground Report",
            "source_type": "user_reported",
            "data_type": "User-Reported (Unverified Ground Observation)",
            "retrieved_at": timestamp_iso,
            "status": "pending_verification"
        }
    }
    
    # Prepend newest report
    reports.insert(0, report_item)
    _save_reports_raw(reports)
    return report_item

def update_report_status(report_id: str, new_status: str, notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Updates the verification/operational status of a report.
    Valid statuses: 'Submitted', 'Pending Verification', 'Verified', 'Rejected', 'Resolved'
    """
    valid_statuses = ["submitted", "pending verification", "verified", "rejected", "resolved"]
    if new_status.lower() not in valid_statuses:
        raise ValueError(f"Invalid status: {new_status}. Must be one of {valid_statuses}")
    
    reports = _load_reports_raw()
    found = None
    for r in reports:
        if r.get("id") == report_id:
            canon_status = next(s for s in ["Submitted", "Pending Verification", "Verified", "Rejected", "Resolved"] if s.lower() == new_status.lower())
            r["status"] = canon_status
            r["verification_state"] = canon_status
            r["updatedAt"] = datetime.now(timezone.utc).isoformat()
            if notes:
                r["verification_notes"] = notes
            if canon_status == "Verified":
                r["provenance"]["status"] = "verified"
                r["provenance"]["data_type"] = "Verified Ground Truth Observation"
            found = r
            break
            
    if found:
        _save_reports_raw(reports)
    return found
