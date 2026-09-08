/**
 * NER-SAFE Client Application Core
 * Ministry of Development of North Eastern Region (MDoNER) - SIH 2026 PS 26001
 */

// Global State
let locationsData = [];
let infrastructureData = [];
let translationsData = {};
let currentLanguage = "English";
let currentRole = "RESPONSE_OFFICER";
let gisMap = null;
let fullGisMap = null;
let weatherChart = null;
let historicalChart = null;

// User Geolocation State (Accessible for future risk & weather queries)
let currentUserLocation = null;
let userLocationMarker = null;
let userLocationAccuracyCircle = null;

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Theme (Light / Dark Mode)
  initTheme();

  // Initialize Current Location Feature
  initCurrentLocationFeature();

  // Initialize Weather & Rainfall Analytics Module
  initWeatherModule();

  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Setup Navigation
  initTabNavigation();

  // Setup Role & Multilingual
  initRoleSelector();
  initLangSelector();

  // Load Data & Render Modules
  fetchInitialData();

  // Setup Field Report Form
  initFieldReportForm();

  // Setup Simulator
  initSimulator();

  // Setup Satellite Slider
  initSatelliteSlider();

  // Setup Demo Engine Button
  document.getElementById("btnRunDemo").addEventListener("click", runDemoScenarioStep);

  // Register PWA Service Worker for Offline Field Support
  initServiceWorker();
});

/* -------------------------------------------------------------
 * NAVIGATION TAB ROUTER
 * ------------------------------------------------------------- */
function initTabNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const modulePages = document.querySelectorAll(".module-page");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-target");

      navItems.forEach(n => n.classList.remove("active"));
      modulePages.forEach(p => p.classList.remove("active"));

      item.classList.add("active");
      const page = document.getElementById(target);
      if (page) {
        page.classList.add("active");
      }

      // Trigger map resize if switching to GIS map views
      if (target === "dashboard" && gisMap) {
        setTimeout(() => gisMap.invalidateSize(), 200);
      } else if (target === "gis-map-view" && fullGisMap) {
        setTimeout(() => fullGisMap.invalidateSize(), 200);
      } else if (target === "ai-prediction" && currentUserLocation) {
        updateAiPageLocation("success", currentUserLocation.latitude, currentUserLocation.longitude, currentUserLocation.accuracy, null);
      } else if (target === "weather-monitoring") {
        if (weatherTrendChartInstance) {
          setTimeout(() => weatherTrendChartInstance.resize(), 150);
        }
        if (weatherComparisonChartInstance) {
          setTimeout(() => weatherComparisonChartInstance.resize(), 150);
        }
      }
    });
  });
}

/* -------------------------------------------------------------
 * INITIAL DATA FETCHING
 * ------------------------------------------------------------- */
async function fetchInitialData() {
  try {
    const [locRes, infraRes, transRes, alertRes, weatherRes] = await Promise.all([
      fetch("/api/locations").then(r => r.json()),
      fetch("/api/infrastructure").then(r => r.json()),
      fetch("/api/translations").then(r => r.json()),
      fetch("/api/alerts").then(r => r.json()),
      fetch("/api/weather").then(r => r.json())
    ]);

    locationsData = locRes.locations || [];
    infrastructureData = infraRes.infrastructure || [];
    translationsData = transRes || {};

    // Render Components
    initGisMap();
    renderLiveAlerts(alertRes.alerts || locationsData);
    renderInfrastructureTable(infrastructureData);
    renderExplainableAi(locationsData[0]);
    renderPriorityResponseList(locationsData);
    initWeatherChart(weatherRes);
    initHistoricalChart();
    renderFieldReports();

  } catch (err) {
    console.error("Error fetching NER-SAFE API data:", err);
  }
}

/* -------------------------------------------------------------
 * GIS LEAFLET MAP ENGINE
 * ------------------------------------------------------------- */
function initGisMap() {
  const mapCenter = [25.5788, 92.5]; // NER Regional Center
  
  // 1. Dashboard Mini GIS Map
  const mapElement = document.getElementById("gisMap");
  if (mapElement && !gisMap) {
    gisMap = L.map("gisMap").setView(mapCenter, 7);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      attribution: '&copy; CartoDB &copy; OpenStreetMap'
    }).addTo(gisMap);

    renderMapMarkers(gisMap, locationsData);

    if (currentUserLocation) {
      updateGisMapUserLocation(currentUserLocation.latitude, currentUserLocation.longitude, currentUserLocation.accuracy);
    }
  }

  // 2. Full Screen GIS Risk Map View
  const fullMapElement = document.getElementById("fullGisMap");
  if (fullMapElement && !fullGisMap) {
    fullGisMap = L.map("fullGisMap").setView(mapCenter, 7);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      attribution: '&copy; CartoDB &copy; OpenStreetMap'
    }).addTo(fullGisMap);

    renderMapMarkers(fullGisMap, locationsData);

    // State Filter Change
    document.getElementById("gisStateFilter").addEventListener("change", (e) => {
      const state = e.target.value;
      if (state === "ALL") {
        fullGisMap.setView(mapCenter, 7);
      } else {
        const filtered = locationsData.filter(l => l.state === state);
        if (filtered.length > 0) {
          fullGisMap.setView([filtered[0].lat, filtered[0].lng], 9);
        }
      }
    });
  }
}

function renderMapMarkers(mapInstance, locations) {
  locations.forEach(loc => {
    let color = "#22c55e"; // Low
    if (loc.riskLevel === "MODERATE") color = "#eab308";
    if (loc.riskLevel === "HIGH") color = "#f97316";
    if (loc.riskLevel === "CRITICAL") color = "#ef4444";

    const circle = L.circleMarker([loc.lat, loc.lng], {
      radius: loc.riskLevel === "CRITICAL" ? 14 : 10,
      fillColor: color,
      color: "#ffffff",
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.8
    }).addTo(mapInstance);

    const popupHtml = `
      <div style="font-family: sans-serif; padding: 4px;">
        <div style="font-weight: 700; font-size: 14px;">${loc.name}</div>
        <div style="margin-top: 4px;">
          <span style="background: ${color}; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">
            ${loc.riskLevel} (${loc.probability}%)
          </span>
        </div>
        <div style="font-size: 11px; color: #475569; margin-top: 6px; line-height: 1.4;">
          🌧️ 24h Rain: <b>${loc.rainfall24h} mm</b><br>
          💧 Soil Saturation: <b>${loc.soilMoisture}%</b><br>
          ⛰️ Terrain Slope: <b>${loc.slope}°</b><br>
          🛣️ Nearby Roads: <b>${loc.nearbyRoads.join(", ")}</b><br>
          🏥 Population: <b>${loc.populationAffected.toLocaleString()}</b>
        </div>
        <div style="margin-top: 8px; font-size: 11px; background: #f8fafc; padding: 6px; border-radius: 4px; border-left: 3px solid ${color};">
          <b>Recommended Action:</b><br>${loc.recommendedAction}
        </div>
      </div>
    `;

    circle.bindPopup(popupHtml);
  });
}

/* -------------------------------------------------------------
 * LIVE ALERTS FEED
 * ------------------------------------------------------------- */
function renderLiveAlerts(alerts) {
  const container = document.getElementById("dashboardLiveAlertsFeed");
  const fullAlertsContainer = document.getElementById("fullAlertsList");
  if (!container) return;

  container.innerHTML = "";
  if (fullAlertsContainer) fullAlertsContainer.innerHTML = "";

  alerts.forEach(loc => {
    let badgeClass = loc.riskLevel;
    const cardHtml = `
      <div class="card-inner-box" style="padding: 12px; border-left: 4px solid var(--risk-${loc.riskLevel.toLowerCase()});">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="font-weight: 700; font-size: 13px; color: var(--text-primary);">${loc.name}</div>
          <span class="risk-badge ${badgeClass}">${loc.riskLevel} (${loc.probability}%)</span>
        </div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
          ${loc.state} • Rainfall: ${loc.rainfall24h}mm • Moisture: ${loc.soilMoisture}%
        </div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px; font-style: italic;">
          "${loc.recommendedAction}"
        </div>
        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button class="btn-primary" style="font-size: 10px; padding: 4px 8px;" onclick="focusLocationOnMap(${loc.lat}, ${loc.lng})">VIEW ON MAP</button>
          <button class="btn-secondary" style="font-size: 10px; padding: 4px 8px;" onclick="broadcastAlert('${loc.name}')">NOTIFY COMMUNITY</button>
        </div>
      </div>
    `;

    container.innerHTML += cardHtml;
    if (fullAlertsContainer) fullAlertsContainer.innerHTML += cardHtml;
  });
}

function focusLocationOnMap(lat, lng) {
  if (gisMap) {
    gisMap.setView([lat, lng], 11);
  }
}

function broadcastAlert(locName) {
  alert(`📢 Emergency Multilingual Warning Dispatched for ${locName} via SMS, Radio, and App!`);
}

/* -------------------------------------------------------------
 * INFRASTRUCTURE MATRIX
 * ------------------------------------------------------------- */
function renderInfrastructureTable(infra) {
  const tbody = document.getElementById("infrastructureTableBody");
  if (!tbody) return;

  tbody.innerHTML = infra.map(item => `
    <tr style="border-bottom: 1px solid var(--border-color);">
      <td style="padding: 10px; font-weight: 600;">${item.name}</td>
      <td style="padding: 10px; color: var(--text-secondary);">${item.type}</td>
      <td style="padding: 10px;"><span class="risk-badge ${item.riskLevel}">${item.riskLevel}</span></td>
      <td style="padding: 10px; color: var(--risk-high); font-weight: 600;">${item.status}</td>
      <td style="padding: 10px;">${item.affectedPopulation.toLocaleString()}</td>
      <td style="padding: 10px; color: var(--text-muted);">${item.nearestHospital}</td>
    </tr>
  `).join("");
}

/* -------------------------------------------------------------
 * EXPLAINABLE AI (XAI)
 * ------------------------------------------------------------- */
function renderExplainableAi(loc) {
  const container = document.getElementById("fullXaiContainer");
  const predContainer = document.getElementById("predXaiBarsContainer");
  if (!loc) return;

  // Predict XAI
  fetch("/api/predict-risk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rainfall: loc.rainfall24h,
      soilMoisture: loc.soilMoisture,
      slope: loc.slope,
      elevation: loc.elevation
    })
  }).then(r => r.json()).then(res => {
    const factors = res.contributingFactors;
    const html = Object.keys(factors).map(key => `
      <div class="xai-bar-wrap">
        <div class="xai-label-row">
          <span>${key} Contribution</span>
          <span style="font-weight: 700;">${factors[key]}%</span>
        </div>
        <div class="xai-bar-bg">
          <div class="xai-bar-fill" style="width: ${factors[key]}%;"></div>
        </div>
      </div>
    `).join("");

    if (container) container.innerHTML = html;
    if (predContainer) predContainer.innerHTML = html;
  });
}

/* -------------------------------------------------------------
 * RESPONSE PRIORITY LIST
 * ------------------------------------------------------------- */
function renderPriorityResponseList(locations) {
  const container = document.getElementById("fullPriorityList");
  if (!container) return;

  // Sort locations by highest risk probability
  const sorted = [...locations].sort((a, b) => b.probability - a.probability);

  container.innerHTML = sorted.map((item, index) => `
    <div class="priority-item" style="border-left-color: var(--risk-${item.riskLevel.toLowerCase()});">
      <div>
        <div style="font-weight: 700; font-size: 13px;">#${index + 1} ${item.name}</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
          Population: ${item.populationAffected.toLocaleString()} • Highways: ${item.nearbyRoads.join(", ")}
        </div>
      </div>
      <span class="risk-badge ${item.riskLevel}">${item.riskLevel} (${item.probability}%)</span>
    </div>
  `).join("");
}

/* -------------------------------------------------------------
 * WEATHER & HISTORICAL CHARTS
 * ------------------------------------------------------------- */
function initWeatherChart(weather) {
  const ctx = document.getElementById("weatherChart");
  if (!ctx) return;

  const labels = weather.hourlyTrend.map(t => t.time);
  const data = weather.hourlyTrend.map(t => t.rainfall);

  const isLight = isLightTheme();
  const gridColor = isLight ? '#e2e8f0' : '#1e293b';
  const textColor = isLight ? '#334155' : '#cbd5e1';
  const strokeColor = isLight ? '#0284c7' : '#38bdf8';
  const fillColor = isLight ? 'rgba(2, 132, 199, 0.15)' : 'rgba(56, 189, 248, 0.15)';

  weatherChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Rainfall Intensity (mm/h)',
        data: data,
        borderColor: strokeColor,
        backgroundColor: fillColor,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } }
      }
    }
  });
}

function initHistoricalChart() {
  const ctx = document.getElementById("historicalChart");
  if (!ctx) return;

  const isLight = isLightTheme();
  const gridColor = isLight ? '#e2e8f0' : '#1e293b';
  const textColor = isLight ? '#334155' : '#94a3b8';

  historicalChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['2021', '2022', '2023', '2024', '2025'],
      datasets: [
        {
          label: 'Total Landslide Incidents',
          data: [142, 189, 215, 278, 310],
          backgroundColor: '#f97316'
        },
        {
          label: 'High-Risk Emergency Events',
          data: [18, 29, 34, 48, 56],
          backgroundColor: '#ef4444'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } }
      }
    }
  });
}

/* -------------------------------------------------------------
 * FIELD REPORTING & PWA SERVICE WORKER
 * ------------------------------------------------------------- */
function initFieldReportForm() {
  const form = document.getElementById("fieldReportForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("reportName").value;
    const type = document.getElementById("reportType").value;
    const loc = document.getElementById("reportLocation").value;
    const severity = document.getElementById("reportSeverity").value;
    const desc = document.getElementById("reportDescription").value;

    const payload = {
      reporterName: name,
      reporterRole: currentRole,
      incidentType: type,
      locationName: loc,
      lat: 23.73,
      lng: 92.72,
      severity: severity,
      description: desc
    };

    fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(res => {
      alert("✅ Incident Report Submitted & Synced Successfully!");
      renderFieldReports();
    }).catch(err => {
      // Save locally if offline
      saveReportLocally(payload);
      alert("📡 Offline Mode: Incident report saved locally in IndexedDB cache. It will auto-sync when connection is restored.");
    });
  });
}

function renderFieldReports() {
  fetch("/api/reports").then(r => r.json()).then(res => {
    const container = document.getElementById("fieldReportsList");
    if (!container) return;

    container.innerHTML = res.reports.map(rep => `
      <div class="card-inner-box" style="padding: 10px;">
        <div style="display: flex; justify-content: space-between;">
          <div style="font-weight: 700; font-size: 12px;">${rep.incidentType}</div>
          <span class="risk-badge ${rep.severity.toUpperCase()}">${rep.severity}</span>
        </div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
          ${rep.locationName} • By ${rep.reporterName} (${rep.submittedAgo})
        </div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
          ${rep.description}
        </div>
      </div>
    `).join("");
  });
}

function saveReportLocally(payload) {
  const offlineQueue = JSON.parse(localStorage.getItem("ner_offline_reports") || "[]");
  offlineQueue.push(payload);
  localStorage.setItem("ner_offline_reports", JSON.stringify(offlineQueue));
}

function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/static/js/sw.js').catch(err => console.log("SW Reg failure", err));
  }

  // Network Status Monitor
  window.addEventListener('online', syncOfflineReports);
  window.addEventListener('offline', updateNetworkBadge);
  updateNetworkBadge();
}

function updateNetworkBadge() {
  const dot = document.getElementById("networkDot");
  const text = document.getElementById("networkStatusText");
  const badge = document.getElementById("offlineStatusBadge");

  if (navigator.onLine) {
    if (dot) dot.style.backgroundColor = "#22c55e";
    if (text) text.innerText = "ONLINE";
    if (badge) { badge.innerText = "ONLINE MODE"; badge.className = "risk-badge LOW"; }
  } else {
    if (dot) dot.style.backgroundColor = "#ef4444";
    if (text) text.innerText = "OFFLINE MODE";
    if (badge) { badge.innerText = "OFFLINE CACHE ACTIVE"; badge.className = "risk-badge CRITICAL"; }
  }
}

function syncOfflineReports() {
  updateNetworkBadge();
  const queue = JSON.parse(localStorage.getItem("ner_offline_reports") || "[]");
  if (queue.length > 0) {
    Promise.all(queue.map(p => fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p)
    }))).then(() => {
      localStorage.removeItem("ner_offline_reports");
      alert(`🔄 Auto-Synced ${queue.length} offline field reports to central MDoNER server!`);
      renderFieldReports();
    });
  }
}

/* -------------------------------------------------------------
 * SIMULATOR & SATELLITE COMPARISON
 * ------------------------------------------------------------- */
function initSimulator() {
  const rSlider = document.getElementById("simRainfallSlider");
  const sSlider = document.getElementById("simSoilSlider");
  const slSlider = document.getElementById("simSlopeSlider");

  if (!rSlider) return;

  function updateSim() {
    const rainfall = parseFloat(rSlider.value);
    const soil = parseFloat(sSlider.value);
    const slope = parseFloat(slSlider.value);

    document.getElementById("simRainfallLabel").innerText = `Rainfall: ${rainfall} mm`;
    document.getElementById("simSoilLabel").innerText = `Soil Saturation: ${soil}%`;
    document.getElementById("simSlopeLabel").innerText = `Slope: ${slope}°`;

    fetch("/api/predict-risk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rainfall, soilMoisture: soil, slope })
    }).then(r => r.json()).then(res => {
      document.getElementById("simProbResult").innerText = `${res.probability}%`;
      const badgeWrap = document.getElementById("simBadgeWrap");
      badgeWrap.innerHTML = `<span class="risk-badge ${res.riskLevel}">${res.riskLevel} RISK</span>`;
    });
  }

  rSlider.addEventListener("input", updateSim);
  sSlider.addEventListener("input", updateSim);
  slSlider.addEventListener("input", updateSim);
}

function initSatelliteSlider() {
  const handle = document.getElementById("satSliderHandle");
  const afterImg = document.getElementById("satAfterImg");
  const container = document.querySelector(".satellite-comparison-container");

  if (!handle || !container) return;

  let isDragging = false;

  handle.addEventListener("mousedown", () => isDragging = true);
  window.addEventListener("mouseup", () => isDragging = false);

  container.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const rect = container.getBoundingClientRect();
    let x = e.clientX - rect.left;
    if (x < 0) x = 0;
    if (x > rect.width) x = rect.width;

    const percentage = (x / rect.width) * 100;
    handle.style.left = `${percentage}%`;
    afterImg.style.clipPath = `polygon(0 0, ${percentage}% 0, ${percentage}% 100%, 0 100%)`;
  });
}

/* -------------------------------------------------------------
 * HACKATHON 1-CLICK DEMO SCENARIO RUNNER
 * ------------------------------------------------------------- */
function runDemoScenarioStep() {
  fetch("/api/demo/trigger").then(r => r.json()).then(stepData => {
    const dot = document.getElementById("networkDot");
    dot.classList.add("active-demo");

    // Display Alert Modal / Toast
    alert(`🚨 SIH DEMO STEP ${stepData.step}: ${stepData.title}\n\n${stepData.description}\n\nLandslide Probability: ${stepData.prediction.probability}%\nStatus: ${stepData.infrastructureStatus}`);

    // Update Aizawl Risk in data
    if (locationsData.length > 0) {
      locationsData[0].rainfall24h = stepData.rainfall;
      locationsData[0].soilMoisture = stepData.soilMoisture;
      locationsData[0].probability = stepData.prediction.probability;
      locationsData[0].riskLevel = stepData.prediction.riskLevel;

      renderLiveAlerts(locationsData);
      renderPriorityResponseList(locationsData);
      renderExplainableAi(locationsData[0]);
    }
  });
}

/* -------------------------------------------------------------
 * ROLE & MULTILINGUAL MANAGERS
 * ------------------------------------------------------------- */
function initRoleSelector() {
  const selector = document.getElementById("roleSelector");
  if (!selector) return;

  selector.addEventListener("change", (e) => {
    currentRole = e.target.value;
    alert(`👤 Switched Role to: ${currentRole}`);
  });
}

function initLangSelector() {
  const selector = document.getElementById("langSelector");
  if (!selector) return;

  selector.addEventListener("change", (e) => {
    currentLanguage = e.target.value;
    const t = translationsData[currentLanguage];
    if (t) {
      document.getElementById("brandTagline").innerText = t.tagline;
      document.getElementById("labelRunDemo").innerText = t.run_demo;
    }
  });
}

/* -------------------------------------------------------------
 * CURRENT LOCATION GEOLOCATION ENGINE
 * Native browser Geolocation API integration with Leaflet GIS
 * ------------------------------------------------------------- */

/**
 * Validates latitude and longitude coordinates.
 * Latitude must be between -90 and 90.
 * Longitude must be between -180 and 180.
 * Rejects non-numeric, empty, or out-of-bounds inputs.
 * Does not fabricate coordinates or coerce invalid inputs to zero.
 */
function validateCoordinates(latRaw, lonRaw) {
  if (latRaw === undefined || latRaw === null || String(latRaw).trim() === "") {
    return { valid: false, error: "Latitude coordinate is required." };
  }
  if (lonRaw === undefined || lonRaw === null || String(lonRaw).trim() === "") {
    return { valid: false, error: "Longitude coordinate is required." };
  }

  const latStr = String(latRaw).trim();
  const lonStr = String(lonRaw).trim();

  const lat = Number(latStr);
  const lon = Number(lonStr);

  if (isNaN(lat)) {
    return { valid: false, error: `Invalid Latitude "${latRaw}". Must be a valid numeric coordinate.` };
  }
  if (isNaN(lon)) {
    return { valid: false, error: `Invalid Longitude "${lonRaw}". Must be a valid numeric coordinate.` };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, error: `Latitude ${lat} is out of bounds. Must be between -90 and 90 degrees.` };
  }
  if (lon < -180 || lon > 180) {
    return { valid: false, error: `Longitude ${lon} is out of bounds. Must be between -180 and 180 degrees.` };
  }

  return { valid: true, lat, lon };
}

/**
 * Handles manual or button-triggered location refresh on the AI Risk Prediction page.
 * Uses manually typed coordinates if entered, validates them, and queries the backend.
 */
function handleAiLocationRefresh() {
  const latInput = document.getElementById("aiLocLatitude");
  const lonInput = document.getElementById("aiLocLongitude");
  const accEl = document.getElementById("aiLocAccuracy");
  const msgBox = document.getElementById("aiLocMessageBox");
  const statusState = document.getElementById("aiLocStatusState");
  const statusDot = document.getElementById("aiLocStatusDot");
  const statusPill = document.getElementById("aiLocStatusPill");
  const statusText = document.getElementById("aiLocStatusText");

  const latRaw = latInput ? latInput.value : "";
  const lonRaw = lonInput ? lonInput.value : "";

  // If both inputs are empty, fall back to requesting browser GPS
  if (String(latRaw).trim() === "" && String(lonRaw).trim() === "") {
    requestUserCurrentLocation();
    return;
  }

  // Validate coordinates
  const result = validateCoordinates(latRaw, lonRaw);
  if (!result.valid) {
    if (msgBox) {
      msgBox.textContent = result.error;
      msgBox.style.display = "block";
    }
    if (statusState) statusState.textContent = "Invalid coordinates";
    if (statusDot) {
      statusDot.style.background = "#ef4444";
      statusDot.style.boxShadow = "none";
    }
    if (statusPill) statusPill.className = "loc-status-pill status-error";
    if (statusText) statusText.textContent = "Error";
    return;
  }

  // Clear previous validation error
  if (msgBox) {
    msgBox.textContent = "";
    msgBox.style.display = "none";
  }

  // Determine accuracy label: check if matches GPS fix, else "Manual Input"
  let accDisplay = "Manual Input";
  if (currentUserLocation && 
      Math.abs(currentUserLocation.latitude - result.lat) < 0.00001 && 
      Math.abs(currentUserLocation.longitude - result.lon) < 0.00001 &&
      currentUserLocation.accuracy) {
    accDisplay = `±${Math.round(currentUserLocation.accuracy)} m`;
  }
  if (accEl) accEl.textContent = accDisplay;

  // Update status to success / active
  if (statusState) statusState.textContent = "Location entered";
  if (statusDot) {
    statusDot.style.background = "#22c55e";
    statusDot.style.boxShadow = "0 0 6px #22c55e";
  }
  if (statusPill) statusPill.className = "loc-status-pill status-success";
  if (statusText) statusText.textContent = "Active";

  // Trigger factor retrieval with manually entered coordinates
  fetchLocationFactors(result.lat, result.lon, accDisplay);
}

/**
 * Initializes the Current Location detection component on the dashboard and AI Risk Prediction page
 */
function initCurrentLocationFeature() {
  const btnDashboard = document.getElementById("btnGetLocation");
  const btnAi = document.getElementById("btnAiGetLocation");
  const btnAiGps = document.getElementById("btnAiGpsLocation");
  const latInput = document.getElementById("aiLocLatitude");
  const lonInput = document.getElementById("aiLocLongitude");
  const box = document.getElementById("currentLocationBox");

  if (box && typeof L !== "undefined" && L.DomEvent) {
    L.DomEvent.disableClickPropagation(box);
    L.DomEvent.disableScrollPropagation(box);
  }

  if (btnDashboard) {
    btnDashboard.addEventListener("click", (e) => {
      if (e) e.preventDefault();
      requestUserCurrentLocation();
    });
  }

  if (btnAi) {
    btnAi.addEventListener("click", (e) => {
      if (e) e.preventDefault();
      handleAiLocationRefresh();
    });
  }

  if (btnAiGps) {
    btnAiGps.addEventListener("click", (e) => {
      if (e) e.preventDefault();
      requestUserCurrentLocation();
    });
  }

  [latInput, lonInput].forEach(inp => {
    if (inp) {
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleAiLocationRefresh();
        }
      });
      inp.addEventListener("input", () => {
        const btnText = document.getElementById("aiLocBtnText");
        if (btnText) btnText.textContent = "Refresh Location";
        const msgBox = document.getElementById("aiLocMessageBox");
        if (msgBox && msgBox.style.display !== "none") {
          msgBox.style.display = "none";
        }
        const accEl = document.getElementById("aiLocAccuracy");
        if (accEl && accEl.textContent.startsWith("±")) {
          accEl.textContent = "Manual Input";
        }
      });
    }
  });

  if (currentUserLocation) {
    updateAiPageLocation("success", currentUserLocation.latitude, currentUserLocation.longitude, currentUserLocation.accuracy, null);
  }
}

/**
 * Requests GPS position from browser Geolocation API with high accuracy
 */
function requestUserCurrentLocation() {
  const btn = document.getElementById("btnGetLocation");
  const btnText = document.getElementById("btnLocateText");
  const latVal = document.getElementById("locLatValue");
  const lngVal = document.getElementById("locLngValue");
  const accVal = document.getElementById("locAccValue");

  // Verify browser Geolocation API support
  if (!("geolocation" in navigator) || !navigator.geolocation) {
    const unsupMsg = "Geolocation is not supported by this browser.";
    console.warn("[Location]", unsupMsg);
    updateLocationStatus("error", "Error", unsupMsg);
    updateAiPageLocation("error", null, null, null, unsupMsg);
    return;
  }

  // Set detecting state in UI
  console.log("Requesting current location...");
  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = "Detecting Location...";
  updateLocationStatus("detecting", "Detecting...", null);
  updateAiPageLocation("detecting", null, null, null, null);

  const geoOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
  };

  navigator.geolocation.getCurrentPosition(
    // 1. Success Callback
    (position) => {
      console.log("Location received:", position.coords);
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      // Store in clean frontend state (structured for future weather/risk APIs)
      currentUserLocation = {
        latitude: latitude,
        longitude: longitude,
        accuracy: accuracy,
        timestamp: Date.now()
      };

      // Display coordinates with 6 decimal places and accuracy in meters
      if (latVal) latVal.textContent = latitude.toFixed(6) + "°";
      if (lngVal) lngVal.textContent = longitude.toFixed(6) + "°";
      if (accVal) accVal.textContent = `±${Math.round(accuracy)} m`;

      // Update button & status indicator on dashboard
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = "Refresh Location";
      updateLocationStatus("success", "Location detected", null);

      // Update AI Risk Prediction page
      updateAiPageLocation("success", latitude, longitude, accuracy, null);

      // GIS Map Integration: place animated pulse marker & center map
      updateGisMapUserLocation(latitude, longitude, accuracy);

      if (window.lucide) {
        lucide.createIcons();
      }
    },
    // 2. Error Callback (graceful user-friendly messages)
    (error) => {
      console.warn("[Location] Geolocation error:", error.code, error.message);
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = currentUserLocation ? "Refresh Location" : "Get My Location";

      let userFriendlyMessage = "Unable to determine your current location.";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          userFriendlyMessage = "Location permission denied. Please allow location access.";
          break;
        case error.POSITION_UNAVAILABLE:
          userFriendlyMessage = "Unable to determine your current location.";
          break;
        case error.TIMEOUT:
          userFriendlyMessage = "Location request timed out. Please try again.";
          break;
        default:
          userFriendlyMessage = "Unable to determine your current location.";
          break;
      }

      updateLocationStatus("error", "Error", userFriendlyMessage);
      updateAiPageLocation("error", null, null, null, userFriendlyMessage);

      if (window.lucide) {
        lucide.createIcons();
      }
    },
    geoOptions
  );
}

/**
 * Updates status indicator pill and error message container on dashboard
 */
function updateLocationStatus(state, label, message) {
  const statusPill = document.getElementById("locStatusPill");
  const statusText = document.getElementById("locStatusText");
  const msgBox = document.getElementById("locMessageBox");

  if (statusPill) {
    statusPill.className = `loc-status-pill status-${state}`;
  }
  if (statusText) {
    statusText.textContent = label;
  }
  if (msgBox) {
    if (message) {
      msgBox.textContent = message;
      msgBox.style.display = "block";
    } else {
      msgBox.textContent = "";
      msgBox.style.display = "none";
    }
  }
}

/**
 * Updates Current Location UI on the AI Risk Prediction page
 */
function updateAiPageLocation(state, lat, lng, acc, message) {
  const btn = document.getElementById("btnAiGetLocation");
  const btnText = document.getElementById("aiLocBtnText");
  const latEl = document.getElementById("aiLocLatitude");
  const lngEl = document.getElementById("aiLocLongitude");
  const accEl = document.getElementById("aiLocAccuracy");
  const statusState = document.getElementById("aiLocStatusState");
  const statusDot = document.getElementById("aiLocStatusDot");
  const statusPill = document.getElementById("aiLocStatusPill");
  const statusText = document.getElementById("aiLocStatusText");
  const msgBox = document.getElementById("aiLocMessageBox");

  if (state === "detecting") {
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = "Detecting Location...";
    if (statusState) statusState.textContent = "Detecting...";
    if (statusDot) {
      statusDot.style.background = "#38bdf8";
      statusDot.style.boxShadow = "none";
    }
    if (statusPill) statusPill.className = "loc-status-pill status-detecting";
    if (statusText) statusText.textContent = "Detecting...";
    if (msgBox) {
      msgBox.textContent = "";
      msgBox.style.display = "none";
    }
  } else if (state === "success") {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = "Refresh Location";
    if (statusState) statusState.textContent = "Location detected";
    if (statusDot) {
      statusDot.style.background = "#22c55e";
      statusDot.style.boxShadow = "0 0 6px #22c55e";
    }
    if (statusPill) statusPill.className = "loc-status-pill status-success";
    if (statusText) statusText.textContent = "Location detected";
    if (latEl && lat !== null && lat !== undefined) {
      if ("value" in latEl) latEl.value = lat.toFixed(6);
      else latEl.textContent = lat.toFixed(6);
    }
    if (lngEl && lng !== null && lng !== undefined) {
      if ("value" in lngEl) lngEl.value = lng.toFixed(6);
      else lngEl.textContent = lng.toFixed(6);
    }
    if (accEl && acc !== null && acc !== undefined) {
      accEl.textContent = typeof acc === "number" ? `±${Math.round(acc)} m` : acc;
    }
    if (msgBox) {
      msgBox.textContent = "";
      msgBox.style.display = "none";
    }

    // Automatically retrieve location-based landslide factors from FastAPI gateway
    if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
      fetchLocationFactors(lat, lng, acc);
    }
  } else if (state === "error") {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = "Refresh Location";
    if (statusState) statusState.textContent = "Error";
    if (statusDot) {
      statusDot.style.background = "#ef4444";
      statusDot.style.boxShadow = "none";
    }
    if (statusPill) statusPill.className = "loc-status-pill status-error";
    if (statusText) statusText.textContent = "Error";
    if (msgBox) {
      msgBox.textContent = message || "Unable to determine your current location.";
      msgBox.style.display = "block";
    }
  }
}

/**
 * Formats factor numerical values safely without null/undefined/NaN
 */
function formatFactorVal(val, unit = "") {
  if (val === null || val === undefined || isNaN(val) || val === Infinity || val === -Infinity) {
    return "Unavailable";
  }
  return unit ? `${val} ${unit}` : `${val}`;
}

/**
 * Renders verified Friend V4 Landslide AI prediction response into UI
 */
function renderV4AiPrediction(data) {
  if (!data) return;

  const modelTag = document.getElementById("v4ModelTag");
  const thresholdBadge = document.getElementById("v4ThresholdBadge");
  const statusBadge = document.getElementById("v4StatusBadge");
  const hazardProb = document.getElementById("v4HazardProb");
  const hazardBadge = document.getElementById("v4HazardBadge");
  const hazardSub = document.getElementById("v4HazardSub");
  const riskBadge = document.getElementById("v4RiskBadge");
  const riskScore = document.getElementById("v4RiskScore");
  const riskSub = document.getElementById("v4RiskSub");
  const expScore = document.getElementById("v4ExposureScore");
  const expSub = document.getElementById("v4ExposureSub");
  const vulnScore = document.getElementById("v4VulnerabilityScore");
  const vulnSub = document.getElementById("v4VulnerabilitySub");
  const expText = document.getElementById("v4ExplanationText");
  const actionsBox = document.getElementById("v4ActionsBox");
  const actionsList = document.getElementById("v4ActionsList");

  if (modelTag && data.model_info?.model_version) {
    modelTag.textContent = "V4 Intelligence";
    modelTag.title = `Model: ${data.model_info.model_version} (Hazard: ${data.model_info.hazard_model_version})`;
  }

  const threshold = data.model_info?.decision_threshold ?? 0.2675;
  if (thresholdBadge) {
    thresholdBadge.textContent = `Threshold: ${threshold}`;
  }

  const pred = data.prediction || {};
  const assess = data.assessment || {};

  // Status Badge
  if (statusBadge) {
    if (pred.is_composite_risk_available) {
      statusBadge.className = "factor-source-badge badge-green";
      statusBadge.textContent = "Complete Assessment";
    } else {
      statusBadge.className = "factor-source-badge badge-amber";
      statusBadge.textContent = "Partial Factors (NA Policy)";
    }
  }

  // 1. Hazard Probability
  if (hazardProb) {
    if (pred.hazard_probability_pct !== null && pred.hazard_probability_pct !== undefined) {
      hazardProb.textContent = `${pred.hazard_probability_pct.toFixed(1)}%`;
    } else {
      hazardProb.textContent = "Unavailable";
    }
  }

  if (hazardBadge) {
    if (pred.is_threshold_exceeded) {
      hazardBadge.className = "v4-hazard-badge badge-triggered";
      hazardBadge.textContent = "Hazard Triggered";
    } else if (pred.hazard_probability_pct !== null && pred.hazard_probability_pct !== undefined) {
      hazardBadge.className = "v4-hazard-badge badge-subthreshold";
      hazardBadge.textContent = "Sub-Threshold";
    } else {
      hazardBadge.className = "v4-hazard-badge badge-gray";
      hazardBadge.textContent = "Unavailable";
    }
  }

  if (hazardSub) {
    const threshPct = (threshold * 100).toFixed(2);
    hazardSub.textContent = `Decision Threshold: ${threshold} (${threshPct}%)`;
  }

  // 2. Overall Composite Risk Level & Score
  const rLevel = assess.overall_risk_level || pred.risk_category || "NA";
  if (riskBadge) {
    riskBadge.textContent = rLevel;
    riskBadge.className = `v4-risk-badge badge-${rLevel.toLowerCase()}`;
  }

  if (riskScore) {
    if (assess.overall_risk_score !== null && assess.overall_risk_score !== undefined) {
      riskScore.textContent = `${assess.overall_risk_score} / 100`;
    } else {
      riskScore.textContent = "Score: NA";
    }
  }

  if (riskSub) {
    if (assess.overall_risk_score !== null && assess.overall_risk_score !== undefined) {
      riskSub.textContent = assess.risk_formula || "Hazard × Exposure × Vulnerability / 10000";
    } else {
      riskSub.textContent = "Required hazard inputs incomplete (Strict NA Policy)";
    }
  }

  // 3. Exposure Score
  if (expScore) {
    if (assess.exposure_score !== null && assess.exposure_score !== undefined) {
      expScore.textContent = assess.exposure_score.toFixed(1);
    } else {
      expScore.textContent = "Unavailable";
    }
  }

  if (expSub) {
    const city = assess.nearest_urban_center || "NA";
    const dist = assess.distance_to_urban_center_km !== null && assess.distance_to_urban_center_km !== undefined
      ? `${assess.distance_to_urban_center_km} km`
      : "—";
    expSub.textContent = `Nearest: ${city} (${dist})`;
  }

  // 4. Vulnerability Score
  if (vulnScore) {
    if (assess.vulnerability_score !== null && assess.vulnerability_score !== undefined) {
      vulnScore.textContent = assess.vulnerability_score.toFixed(1);
    } else {
      vulnScore.textContent = "Unavailable";
    }
  }

  if (vulnSub) {
    const schools = assess.school_count_in_urban_footprint !== null && assess.school_count_in_urban_footprint !== undefined
      ? `${assess.school_count_in_urban_footprint} schools`
      : "—";
    vulnSub.textContent = `Urban footprint: ${schools}`;
  }

  // 12 V4 Input Factors
  const factors = data.factors || {};
  function setChip(id, val, suffix = "") {
    const el = document.getElementById(id);
    if (!el) return;
    if (val === null || val === undefined || val === "Unavailable" || (isNaN(val) && typeof val !== "string")) {
      el.textContent = "Unavailable";
      el.classList.add("val-unavailable");
    } else {
      el.textContent = typeof val === "number" ? `${val}${suffix}` : `${val}${suffix}`;
      el.classList.remove("val-unavailable");
    }
  }

  setChip("v4FeatDistrict", factors.District);
  setChip("v4FeatState", factors.State);
  setChip("v4FeatMaterial", factors.Material_Involved);
  setChip("v4FeatElevation", factors.elevation_m, " m");
  setChip("v4FeatSlope", factors.slope_deg, "°");
  setChip("v4FeatAspect", factors.aspect_deg, "°");
  setChip("v4FeatRainfall", factors.annual_rainfall_mm, " mm");
  setChip("v4FeatLandcover", factors.landcover_class);
  setChip("v4FeatSoilMoist", factors.soil_moisture_source_value, "%");
  setChip("v4FeatNdvi", factors.NDVI);
  setChip("v4FeatLatitude", factors.Latitude ? Number(factors.Latitude).toFixed(6) : null, "°");
  setChip("v4FeatLongitude", factors.Longitude ? Number(factors.Longitude).toFixed(6) : null, "°");

  // Explanation
  if (expText) {
    expText.textContent = assess.explanation || "No explanation signals generated.";
  }

  // Actions
  if (actionsBox && actionsList) {
    actionsList.innerHTML = "";
    const acts = assess.recommended_actions || [];
    if (acts.length > 0) {
      acts.forEach(act => {
        const li = document.createElement("li");
        li.textContent = act;
        actionsList.appendChild(li);
      });
      actionsBox.style.display = "flex";
    } else {
      actionsBox.style.display = "none";
    }
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

/**
 * Fetches location-based landslide factors and verified V4 AI prediction
 */
async function fetchLocationFactors(lat, lng, acc) {
  const statusState = document.getElementById("aiLocStatusState");
  const statusDot = document.getElementById("aiLocStatusDot");
  const bannerBadge = document.getElementById("factorsGatewayStatusBadge");
  const bannerSub = document.getElementById("factorsBannerSubText");
  const msgBox = document.getElementById("aiLocMessageBox");
  const v4StatusBadge = document.getElementById("v4StatusBadge");
  const v4ExplanationText = document.getElementById("v4ExplanationText");

  // Coordinate range validation
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const errText = `Invalid coordinates: Latitude must be between -90 and 90, Longitude between -180 and 180. Received (${lat}, ${lng}).`;
    if (msgBox) {
      msgBox.textContent = errText;
      msgBox.style.display = "block";
    }
    if (statusState) statusState.textContent = "Invalid Coordinates";
    if (statusDot) {
      statusDot.style.background = "#ef4444";
      statusDot.style.boxShadow = "none";
    }
    return;
  }

  // Step 1: Immediately show "Evaluating V4 Landslide AI..."
  if (statusState) statusState.textContent = "Evaluating V4 Landslide AI...";
  if (statusDot) {
    statusDot.style.background = "#38bdf8";
    statusDot.style.boxShadow = "0 0 6px #38bdf8";
  }
  if (bannerBadge) {
    bannerBadge.className = "factor-source-badge badge-amber";
    bannerBadge.textContent = "Evaluating...";
  }
  if (bannerSub) {
    bannerSub.textContent = "Querying verified V4 Landslide Intelligence model and factors gateway...";
  }
  if (v4StatusBadge) {
    v4StatusBadge.className = "factor-source-badge badge-amber";
    v4StatusBadge.textContent = "Evaluating Model...";
  }
  if (v4ExplanationText) {
    v4ExplanationText.textContent = "Running V4 XGBoost pipeline and environmental factor evaluation...";
  }

  try {
    // 1. Fetch AI Risk Prediction from verified V4 service
    const aiRes = await fetch("/api/ai-risk/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng })
    });

    if (!aiRes.ok) {
      const errJson = await aiRes.json().catch(() => ({}));
      throw new Error(errJson.detail || `AI Prediction API returned HTTP ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    renderV4AiPrediction(aiData);

    // 1. LOCATION CARD
    const valLocLat = document.getElementById("valFactorLat");
    const valLocLon = document.getElementById("valFactorLon");
    const valLocAcc = document.getElementById("valFactorAcc");
    const valLocStatus = document.getElementById("valFactorLocStatus");
    if (valLocLat) valLocLat.textContent = (lat !== null && lat !== undefined) ? `${lat.toFixed(6)}°` : "Unavailable";
    if (valLocLon) valLocLon.textContent = (lng !== null && lng !== undefined) ? `${lng.toFixed(6)}°` : "Unavailable";
    if (valLocAcc) valLocAcc.textContent = (acc !== null && acc !== undefined && typeof acc === "number") ? `±${Math.round(acc)} m` : (acc || "Unavailable");
    if (valLocStatus) valLocStatus.textContent = aiData.location?.is_within_northeast ? "NER Location Fix" : "Live Fix Evaluated";

    // Immediate success state for AI Risk Evaluation
    if (statusState) statusState.textContent = "AI risk prediction evaluated";
    if (statusDot) {
      statusDot.style.background = "#22c55e";
      statusDot.style.boxShadow = "0 0 6px #22c55e";
    }
    if (bannerBadge) {
      bannerBadge.className = "factor-source-badge badge-green";
      bannerBadge.textContent = "Prediction Complete";
    }
    if (bannerSub) {
      bannerSub.textContent = `V4 Landslide Intelligence evaluated (${new Date().toLocaleTimeString()}).`;
    }

    // 2. Fetch Granular Factor Telemetry in background
    fetch(`/api/risk/factors?lat=${lat}&lon=${lng}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        // 2. TERRAIN CARD
        const valElev = document.getElementById("valFactorElevation");
        if (valElev) valElev.textContent = formatFactorVal(data.terrain?.elevation_m, "m");

        // 3. RAINFALL & WATER CARD
        const valCurrentRain = document.getElementById("valFactorCurrentRain");
        const valRainIntensity = document.getElementById("valFactorRainIntensity");
        const valRain24h = document.getElementById("valFactorRain24h");
        const valRain3d = document.getElementById("valFactorRain3d");
        const valRain7d = document.getElementById("valFactorRain7d");
        const valRainAntecedent = document.getElementById("valFactorRainAntecedent");
        const valSoilMoisture = document.getElementById("valFactorSoilMoisture");
        const valSmDepths1 = document.getElementById("valFactorSmDepths1");
        const valSmDepths2 = document.getElementById("valFactorSmDepths2");

        if (valCurrentRain) valCurrentRain.textContent = formatFactorVal(data.rainfall?.current_rainfall_mm, "mm");
        if (valRainIntensity) valRainIntensity.textContent = formatFactorVal(data.rainfall?.rainfall_intensity_mm_h, "mm/h");
        if (valRain24h) valRain24h.textContent = formatFactorVal(data.rainfall?.rainfall_24h_mm, "mm");
        if (valRain3d) valRain3d.textContent = formatFactorVal(data.rainfall?.rainfall_3d_mm, "mm");
        if (valRain7d) valRain7d.textContent = formatFactorVal(data.rainfall?.rainfall_7d_mm, "mm");
        if (valRainAntecedent) valRainAntecedent.textContent = formatFactorVal(data.rainfall?.antecedent_rainfall_mm, "mm");
        if (valSoilMoisture) valSoilMoisture.textContent = formatFactorVal(data.rainfall?.soil_moisture_m3_m3, "m³/m³");

        const smDepths = data.rainfall?.soil_moisture_depths;
        if (smDepths && typeof smDepths === "object") {
          if (valSmDepths1) valSmDepths1.textContent = `${smDepths.depth_0_to_1cm ?? "—"} / ${smDepths.depth_1_to_3cm ?? "—"} m³/m³`;
          if (valSmDepths2) valSmDepths2.textContent = `${smDepths.depth_3_to_9cm ?? "—"} / ${smDepths.depth_9_to_27cm ?? "—"} m³/m³`;
        }

        // 4. SOIL CARD
        const valSoilMoist2 = document.getElementById("valFactorSoilMoist2");
        if (valSoilMoist2) valSoilMoist2.textContent = formatFactorVal(data.soil?.soil_moisture_m3_m3, "m³/m³");

        // 7. HUMAN / INFRASTRUCTURE CARD
        const valDistRoad = document.getElementById("valFactorDistRoad");
        const valDistHighway = document.getElementById("valFactorDistHighway");
        const valDistRiver = document.getElementById("valFactorDistRiver");
        const valInfraBuffer = document.getElementById("valFactorInfraBuffer");

        if (valDistRoad) {
          valDistRoad.textContent = (data.infrastructure?.distance_to_nearest_road_m !== null && data.infrastructure?.distance_to_nearest_road_m !== undefined)
            ? `${Math.round(data.infrastructure.distance_to_nearest_road_m)} m`
            : (data.infrastructure?.unavailable_reason ? "Temporarily unavailable" : "Unavailable");
        }
        if (valDistHighway) {
          valDistHighway.textContent = (data.infrastructure?.distance_to_nearest_highway_m !== null && data.infrastructure?.distance_to_nearest_highway_m !== undefined)
            ? `${Math.round(data.infrastructure.distance_to_nearest_highway_m)} m`
            : "None within 3 km";
        }
        if (valDistRiver) {
          valDistRiver.textContent = (data.infrastructure?.distance_to_nearest_river_m !== null && data.infrastructure?.distance_to_nearest_river_m !== undefined)
            ? `${Math.round(data.infrastructure.distance_to_nearest_river_m)} m`
            : "None within 3 km";
        }
        if (valInfraBuffer) valInfraBuffer.textContent = data.infrastructure?.nearby_infrastructure || "Spatial query complete";

        // 8. EARTHQUAKE CARD
        const valEqActivity = document.getElementById("valFactorEqActivity");
        const valEqMag = document.getElementById("valFactorEqMag");
        const valEqDist = document.getElementById("valFactorEqDist");
        const valEqDepth = document.getElementById("valFactorEqDepth");
        const valEqTime = document.getElementById("valFactorEqTime");

        if (data.earthquake?.detected && data.earthquake?.nearest) {
          const eq = data.earthquake.nearest;
          if (valEqActivity) valEqActivity.textContent = data.earthquake.message || "Seismic event in regional radius";
          if (valEqMag) valEqMag.textContent = `M ${eq.magnitude ?? "—"}`;
          if (valEqDist) valEqDist.textContent = `${eq.distance_km ?? "—"} km`;
          if (valEqDepth) valEqDepth.textContent = `${eq.depth_km ?? "—"} km`;
          if (valEqTime) valEqTime.textContent = `${eq.time ?? "—"} (${eq.place ?? ""})`;
        } else if (data.earthquake?.detected === false) {
          if (valEqActivity) valEqActivity.textContent = "No recent earthquake detected";
          if (valEqMag) valEqMag.textContent = "—";
          if (valEqDist) valEqDist.textContent = "—";
          if (valEqDepth) valEqDepth.textContent = "—";
          if (valEqTime) valEqTime.textContent = "No event within 300 km";
        } else {
          if (valEqActivity) valEqActivity.textContent = "Earthquake data unavailable";
          if (valEqMag) valEqMag.textContent = "Unavailable";
          if (valEqDist) valEqDist.textContent = "Unavailable";
          if (valEqDepth) valEqDepth.textContent = "Unavailable";
          if (valEqTime) valEqTime.textContent = "Unavailable";
        }
      })
      .catch(e => console.warn("[Factors] Secondary telemetry error:", e));

  } catch (err) {
    console.error("[Factors] Gateway fetch error:", err);
    if (statusState) statusState.textContent = "AI Prediction Error";
    if (statusDot) {
      statusDot.style.background = "#ef4444";
      statusDot.style.boxShadow = "none";
    }
    if (bannerBadge) {
      bannerBadge.className = "factor-source-badge badge-amber";
      bannerBadge.textContent = "Gateway Warning";
    }
    if (bannerSub) {
      bannerSub.textContent = "Some external factor sources were unavailable. Factors populated where possible.";
    }
    if (v4StatusBadge) {
      v4StatusBadge.className = "factor-source-badge badge-gray";
      v4StatusBadge.textContent = "Prediction Failed";
    }
    if (v4ExplanationText) {
      v4ExplanationText.textContent = `Prediction error: ${err.message}. Please verify coordinates and connectivity.`;
    }
    if (msgBox) {
      msgBox.textContent = `Error: ${err.message}`;
      msgBox.style.display = "block";
    }
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

/**
 * Places/updates the Current Location marker and accuracy boundary circle on Leaflet GIS map
 */
function updateGisMapUserLocation(lat, lng, accuracy) {
  if (!gisMap) return;

  try {
    // Custom pulsing marker icon
    const userIcon = L.divIcon({
      className: "user-location-marker-icon",
      html: '<div class="user-loc-dot"></div><div class="user-loc-pulse"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (userLocationMarker) {
      userLocationMarker.setLatLng([lat, lng]);
    } else {
      userLocationMarker = L.marker([lat, lng], {
        icon: userIcon,
        zIndexOffset: 1000
      }).addTo(gisMap);

      userLocationMarker.bindPopup(`
        <div style="font-family: inherit; padding: 4px; color: #0f172a;">
          <div style="font-weight: 800; font-size: 13px; color: #0284c7;">📍 Your Current Location</div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px; line-height: 1.5;">
            <b>Latitude:</b> ${lat.toFixed(6)}°<br>
            <b>Longitude:</b> ${lng.toFixed(6)}°<br>
            <b>Accuracy:</b> ±${Math.round(accuracy)} m
          </div>
        </div>
      `);
    }

    // Optional GPS accuracy boundary circle
    if (userLocationAccuracyCircle) {
      userLocationAccuracyCircle.setLatLng([lat, lng]).setRadius(accuracy);
    } else {
      userLocationAccuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: "#38bdf8",
        fillColor: "#38bdf8",
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: "4, 4"
      }).addTo(gisMap);
    }

    // Center map smoothly on the detected user coordinates
    gisMap.setView([lat, lng], Math.max(gisMap.getZoom(), 11));
    userLocationMarker.openPopup();
  } catch (err) {
    console.warn("[Location] Could not render user location on GIS map:", err);
  }
}

/* =============================================================
 * THEME SYSTEM (LIGHT / DARK MODE)
 * ============================================================= */
let activeTheme = "dark";

function initTheme() {
  const savedTheme = localStorage.getItem("ner_safe_theme");
  const btnToggle = document.getElementById("btnThemeToggle");
  
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
    document.documentElement.setAttribute("data-theme", "light");
    document.body.setAttribute("data-theme", "light");
    activeTheme = "light";
  } else {
    document.body.classList.remove("light-theme");
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-theme", "dark");
    activeTheme = "dark";
  }
  
  updateThemeButtonUI();

  if (btnToggle) {
    btnToggle.addEventListener("click", toggleTheme);
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle("light-theme");
  activeTheme = isLight ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", activeTheme);
  document.body.setAttribute("data-theme", activeTheme);
  localStorage.setItem("ner_safe_theme", activeTheme);
  updateThemeButtonUI();
  updateAllChartsTheme();
}

function updateThemeButtonUI() {
  const iconSun = document.getElementById("iconThemeSun");
  const iconMoon = document.getElementById("iconThemeMoon");
  const label = document.getElementById("labelThemeMode");

  if (activeTheme === "light") {
    if (iconSun) iconSun.style.display = "none";
    if (iconMoon) iconMoon.style.display = "inline-block";
    if (label) label.textContent = "Dark";
  } else {
    if (iconSun) iconSun.style.display = "inline-block";
    if (iconMoon) iconMoon.style.display = "none";
    if (label) label.textContent = "Light";
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

function isLightTheme() {
  return document.body.classList.contains("light-theme");
}

function updateAllChartsTheme() {
  if (weatherTrendChartInstance && latestWeatherPayload) {
    renderWeatherTrendChart(latestWeatherPayload);
  }
  if (weatherComparisonChartInstance && latestComparisonPayload) {
    renderWeatherComparisonChart(latestComparisonPayload);
  }
  if (historicalChart) {
    const isLight = isLightTheme();
    const gridColor = isLight ? "#e2e8f0" : "#1e293b";
    const textColor = isLight ? "#334155" : "#94a3b8";
    if (historicalChart.options && historicalChart.options.scales) {
      if (historicalChart.options.scales.x) {
        historicalChart.options.scales.x.grid.color = gridColor;
        historicalChart.options.scales.x.ticks.color = textColor;
      }
      if (historicalChart.options.scales.y) {
        historicalChart.options.scales.y.grid.color = gridColor;
        historicalChart.options.scales.y.ticks.color = textColor;
      }
      historicalChart.update();
    }
  }
  if (weatherChart) {
    const isLight = isLightTheme();
    const gridColor = isLight ? "#e2e8f0" : "#1e293b";
    const textColor = isLight ? "#334155" : "#cbd5e1";
    const strokeColor = isLight ? "#0284c7" : "#38bdf8";
    const fillColor = isLight ? "rgba(2, 132, 199, 0.15)" : "rgba(56, 189, 248, 0.15)";
    if (weatherChart.data && weatherChart.data.datasets && weatherChart.data.datasets[0]) {
      weatherChart.data.datasets[0].borderColor = strokeColor;
      weatherChart.data.datasets[0].backgroundColor = fillColor;
    }
    if (weatherChart.options && weatherChart.options.scales) {
      if (weatherChart.options.scales.x) {
        weatherChart.options.scales.x.grid.color = gridColor;
        weatherChart.options.scales.x.ticks.color = textColor;
      }
      if (weatherChart.options.scales.y) {
        weatherChart.options.scales.y.grid.color = gridColor;
        weatherChart.options.scales.y.ticks.color = textColor;
      }
      weatherChart.update();
    }
  }
  if (gisMap) {
    gisMap.invalidateSize();
  }
}

/* =============================================================
 * NORTH-EAST INDIA WEATHER & RAINFALL ANALYTICS ENGINE
 * ============================================================= */

let currentWeatherState = "Meghalaya";
let currentWeatherDistrict = "East Khasi Hills";
let currentWeatherLat = 25.5788;
let currentWeatherLon = 91.8933;
let currentTrendDays = 7;
let latestWeatherPayload = null;
let latestComparisonPayload = null;
let weatherTrendChartInstance = null;
let weatherComparisonChartInstance = null;
let weatherAutoRefreshTimer = null;

function initWeatherModule() {
  const selectState = document.getElementById("selectWeatherState");
  const selectDistrict = document.getElementById("selectWeatherDistrict");
  const btnLoadCoords = document.getElementById("btnLoadWeatherCoords");
  const btnCurrentLoc = document.getElementById("btnWeatherCurrentLoc");
  const btnRefresh = document.getElementById("btnWeatherRefresh");
  const btnRetry = document.getElementById("btnWeatherRetry");
  const btn7d = document.getElementById("btnTrend7d");
  const btn30d = document.getElementById("btnTrend30d");

  // Populate all 8 NER states
  loadNortheastStates();

  // State selection change
  if (selectState) {
    selectState.addEventListener("change", (e) => {
      const state = e.target.value;
      if (state) {
        currentWeatherState = state;
        loadDistrictsForSelectedState(state, null);
      }
    });
  }

  // District selection change
  if (selectDistrict) {
    selectDistrict.addEventListener("change", (e) => {
      const dist = e.target.value;
      if (dist) {
        currentWeatherDistrict = dist;
        onWeatherDistrictSelected();
      }
    });
  }

  // Coordinate Inputs: Enter key to refresh & input event to clear errors
  const inputLat = document.getElementById("inputWeatherLat");
  const inputLon = document.getElementById("inputWeatherLon");

  [inputLat, inputLon].forEach(inp => {
    if (inp) {
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          fetchWeatherData(true);
        }
      });
      inp.addEventListener("input", () => {
        const errorBanner = document.getElementById("weatherErrorBanner");
        if (errorBanner && errorBanner.style.display !== "none") {
          errorBanner.style.display = "none";
        }
      });
    }
  });

  // Refresh Button
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      fetchWeatherData(true);
    });
  }

  // Retry Button
  if (btnRetry) {
    btnRetry.addEventListener("click", () => {
      fetchWeatherData(true);
    });
  }

  // Trend 7D vs 30D Switcher
  if (btn7d && btn30d) {
    btn7d.addEventListener("click", () => {
      btn7d.classList.add("active");
      btn30d.classList.remove("active");
      currentTrendDays = 7;
      if (latestWeatherPayload) {
        renderWeatherTrendChart(latestWeatherPayload);
      }
    });

    btn30d.addEventListener("click", () => {
      btn30d.classList.add("active");
      btn7d.classList.remove("active");
      currentTrendDays = 30;
      if (latestWeatherPayload) {
        renderWeatherTrendChart(latestWeatherPayload);
      }
    });
  }

  // Initial load: Meghalaya -> East Khasi Hills
  loadDistrictsForSelectedState(currentWeatherState, currentWeatherDistrict);

  // Setup 10-minute auto-refresh interval
  if (weatherAutoRefreshTimer) clearInterval(weatherAutoRefreshTimer);
  weatherAutoRefreshTimer = setInterval(() => {
    fetchWeatherData(true);
  }, 10 * 60 * 1000);
}

async function loadNortheastStates() {
  const selectState = document.getElementById("selectWeatherState");
  if (!selectState) return;

  try {
    const res = await fetch("/api/northeast/states");
    const data = await res.json();
    const states = data.states || [];

    if (states.length > 0) {
      selectState.innerHTML = states.map(s => `
        <option value="${s}" ${s === currentWeatherState ? "selected" : ""}>${s}</option>
      `).join("");
    }
  } catch (err) {
    console.warn("Could not load states list from API, keeping defaults:", err);
  }
}

async function loadDistrictsForSelectedState(stateName, defaultDistrict = null) {
  const selectDistrict = document.getElementById("selectWeatherDistrict");
  if (!selectDistrict) return;

  selectDistrict.innerHTML = `<option value="">Loading districts...</option>`;

  try {
    const res = await fetch(`/api/northeast/districts?state=${encodeURIComponent(stateName)}`);
    const data = await res.json();
    const districts = data.districts || [];

    if (districts.length === 0) {
      selectDistrict.innerHTML = `<option value="">No districts found</option>`;
      return;
    }

    // Determine which district to select
    let targetDistrict = defaultDistrict;
    if (!targetDistrict || !districts.includes(targetDistrict)) {
      targetDistrict = districts[0];
    }
    currentWeatherDistrict = targetDistrict;

    selectDistrict.innerHTML = districts.map(d => `
      <option value="${d}" ${d === targetDistrict ? "selected" : ""}>${d}</option>
    `).join("");
    selectDistrict.value = targetDistrict;

    onWeatherDistrictSelected();
  } catch (err) {
    console.error("Error loading districts for", stateName, err);
    selectDistrict.innerHTML = `<option value="">Failed to load districts</option>`;
  }
}

async function onWeatherDistrictSelected() {
  const selectState = document.getElementById("selectWeatherState");
  const selectDistrict = document.getElementById("selectWeatherDistrict");

  const state = (selectState && selectState.value) ? selectState.value : currentWeatherState;
  const district = (selectDistrict && selectDistrict.value) ? selectDistrict.value : currentWeatherDistrict;

  currentWeatherState = state;
  currentWeatherDistrict = district;

  const titleEl = document.getElementById("weatherActiveLocationTitle");
  if (titleEl) titleEl.textContent = `${district}, ${state}`;

  // Resolve centroid coordinates
  try {
    const res = await fetch(`/api/northeast/location?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
    if (res.ok) {
      const loc = await res.json();
      currentWeatherLat = loc.latitude;
      currentWeatherLon = loc.longitude;

      const latInput = document.getElementById("inputWeatherLat");
      const lonInput = document.getElementById("inputWeatherLon");
      if (latInput) latInput.value = loc.latitude.toFixed(4);
      if (lonInput) lonInput.value = loc.longitude.toFixed(4);

      const metaEl = document.getElementById("weatherActiveLocationMeta");
      if (titleEl) titleEl.textContent = `${loc.district}, ${loc.state}`;
      if (metaEl) {
        metaEl.textContent = `Headquarters: ${loc.headquarters || loc.district} • Centroid: ${loc.latitude.toFixed(4)}°N, ${loc.longitude.toFixed(4)}°E • Timezone: Asia/Kolkata (IST)`;
      }
    }
  } catch (err) {
    console.warn("Could not resolve district location:", err);
  }

  // Fetch weather and district comparison
  fetchWeatherData(false);
  fetchStateDistrictComparison(state);
}

async function lookupAndLoadByCoordinates(lat, lon) {
  try {
    const res = await fetch(`/api/northeast/reverse?lat=${lat}&lon=${lon}`);
    if (res.ok) {
      const loc = await res.json();
      currentWeatherState = loc.state;
      currentWeatherDistrict = loc.district;
      currentWeatherLat = lat;
      currentWeatherLon = lon;

      const selectState = document.getElementById("selectWeatherState");
      if (selectState) {
        selectState.value = loc.state;
      }

      const titleEl = document.getElementById("weatherActiveLocationTitle");
      if (titleEl) titleEl.textContent = `${loc.district}, ${loc.state}`;

      await loadDistrictsForSelectedState(loc.state, loc.district);
      return;
    }
  } catch (err) {
    console.warn("Reverse lookup failed, loading coordinates directly:", err);
  }

  fetchWeatherData(false);
}

async function fetchWeatherData(force = false) {
  const errorBanner = document.getElementById("weatherErrorBanner");
  const refreshIcon = document.getElementById("iconWeatherRefresh");
  const latInput = document.getElementById("inputWeatherLat");
  const lonInput = document.getElementById("inputWeatherLon");

  // Read manually entered coordinates from the input fields
  const latRaw = latInput ? latInput.value : currentWeatherLat;
  const lonRaw = lonInput ? lonInput.value : currentWeatherLon;

  // Validate coordinates
  const coordResult = validateCoordinates(latRaw, lonRaw);
  if (!coordResult.valid) {
    if (errorBanner) {
      errorBanner.style.display = "flex";
      const msg = document.getElementById("weatherErrorMessage");
      if (msg) msg.textContent = coordResult.error;
    }
    return;
  }

  // Update internal coordinates so state remains strictly in sync with user inputs
  currentWeatherLat = coordResult.lat;
  currentWeatherLon = coordResult.lon;

  if (refreshIcon) refreshIcon.style.animation = "spin 1s linear infinite";

  try {
    const state = currentWeatherState;
    const district = currentWeatherDistrict;
    const lat = currentWeatherLat;
    const lon = currentWeatherLon;

    const url = `/api/weather/comprehensive?lat=${lat}&lon=${lon}&state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&force=${force}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();
    latestWeatherPayload = data;

    if (errorBanner) errorBanner.style.display = "none";

    renderWeatherMetrics(data);
    renderWeatherStats(data);
    renderWeatherDailyTable(data);
    renderWeatherMonthlySummary(data);
    renderWeatherTrendChart(data);

  } catch (err) {
    console.error("Error fetching weather data:", err);
    if (errorBanner) {
      errorBanner.style.display = "flex";
      const msg = document.getElementById("weatherErrorMessage");
      if (msg) msg.textContent = `Meteorological service unavailable: ${err.message}. Retrying or check connection.`;
    }
  } finally {
    if (refreshIcon) refreshIcon.style.animation = "";
  }
}

function renderWeatherMetrics(data) {
  const cur = data.current || {};
  const loc = data.location || {};

  // Active location banner
  const titleEl = document.getElementById("weatherActiveLocationTitle");
  const metaEl = document.getElementById("weatherActiveLocationMeta");
  if (titleEl) titleEl.textContent = `${loc.district || currentWeatherDistrict}, ${loc.state || currentWeatherState}`;
  if (metaEl) {
    metaEl.textContent = `Headquarters: ${loc.headquarters || loc.district || 'Station'} • Coordinates: ${loc.latitude?.toFixed(4)}°N, ${loc.longitude?.toFixed(4)}°E • Timezone: ${cur.timezone || 'Asia/Kolkata (IST)'}`;
  }

  // Temperature
  const tempEl = document.getElementById("valWeatherTemp");
  const tempRangeEl = document.getElementById("valWeatherTempRange");
  if (tempEl) tempEl.textContent = cur.temperature !== undefined ? cur.temperature : "--";
  if (tempRangeEl) tempRangeEl.textContent = `Min: ${cur.temperature_min ?? '--'}°C • Max: ${cur.temperature_max ?? '--'}°C`;

  // Rainfall Rate
  const rainEl = document.getElementById("valWeatherCurrentRain");
  const intensityEl = document.getElementById("valWeatherRainIntensity");
  if (rainEl) rainEl.textContent = cur.rainfall !== undefined ? cur.rainfall.toFixed(1) : "--";
  if (intensityEl) {
    const intensity = cur.rainfall_intensity || 0;
    intensityEl.textContent = intensity > 0 ? `Intensity: ${intensity.toFixed(1)} mm/h` : "Intensity: None";
  }

  // Today's Rain
  const todayRainEl = document.getElementById("valWeatherTodayRain");
  if (todayRainEl) todayRainEl.textContent = cur.today_rainfall !== undefined ? cur.today_rainfall.toFixed(1) : "--";

  // Humidity
  const humEl = document.getElementById("valWeatherHumidity");
  const humStatusEl = document.getElementById("valWeatherHumidityStatus");
  if (humEl) humEl.textContent = cur.humidity !== undefined ? cur.humidity : "--";
  if (humStatusEl) {
    const h = cur.humidity || 0;
    humStatusEl.textContent = h >= 80 ? "Saturated / Very High" : h >= 60 ? "Moderate monsoonal humidity" : "Normal atmospheric humidity";
  }

  // Wind
  const windEl = document.getElementById("valWeatherWind");
  if (windEl) windEl.textContent = cur.wind_speed !== undefined ? cur.wind_speed : "--";

  // Condition
  const condEl = document.getElementById("valWeatherCondition");
  const wmoEl = document.getElementById("valWeatherWmoCode");
  if (condEl) condEl.textContent = cur.weather_condition || "Clear sky";
  if (wmoEl) wmoEl.textContent = `WMO Code: ${cur.weather_code ?? '--'}`;

  // Timestamp
  const timeEl = document.getElementById("weatherLastUpdated");
  if (timeEl) timeEl.textContent = `Updated: ${cur.updated_at || 'Just now'}`;

  if (window.lucide) lucide.createIcons();
}

function renderWeatherStats(data) {
  const stats = data.statistics || {};

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setText("statRainTotal7d", `${stats.rainfall_7d ?? '--'} mm`);
  setText("statRainTotal30d", `${stats.rainfall_30d ?? '--'} mm`);
  setText("statRainAvg7d", `${stats.average_7d ?? '--'} mm/day`);
  setText("statRainAvg30d", `${stats.average_30d ?? '--'} mm/day`);
  setText("statRainMax7d", `${stats.maximum_daily_7d ?? '--'} mm`);
  setText("statWettestDay7d", `Wettest: ${stats.wettest_day_7d ?? '--'}`);
  setText("statRainMax30d", `${stats.maximum_daily_30d ?? '--'} mm`);
  setText("statWettestDay30d", `Wettest: ${stats.wettest_day_30d ?? '--'}`);
  setText("statRainyDays30d", `${stats.rainy_days_30d ?? '--'} / 30`);
  setText("statRainyDays7d", `7-Day: ${stats.rainy_days_7d ?? '--'} days`);
  setText("statHeavyRainDays30d", `${stats.heavy_rain_days_30d ?? '--'} days`);
}

function renderWeatherDailyTable(data) {
  const tbody = document.getElementById("weatherDailyTableBody");
  if (!tbody) return;

  const days = data.daily_7d || [];
  if (days.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No daily observations available</td></tr>`;
    return;
  }

  tbody.innerHTML = days.map(d => {
    const rain = d.rainfall ?? 0;
    let badgeClass = "badge-dry";
    let classification = "Dry (<2.5mm)";

    if (rain >= 115.5) {
      badgeClass = "badge-very-heavy-rain";
      classification = "Very Heavy Rain";
    } else if (rain >= 64.5) {
      badgeClass = "badge-heavy-rain";
      classification = "Heavy Rain (IMD)";
    } else if (rain >= 15.6) {
      badgeClass = "badge-moderate-rain";
      classification = "Moderate Rain";
    } else if (rain >= 2.5) {
      badgeClass = "badge-light-rain";
      classification = "Rainy Day (>=2.5mm)";
    }

    return `
      <tr>
        <td style="font-weight: 700;">${d.date_formatted || d.date}</td>
        <td>${d.weather_condition || 'Observation'}</td>
        <td class="col-temp-min">${d.temperature_min ?? '--'}°C</td>
        <td class="col-temp-max">${d.temperature_max ?? '--'}°C</td>
        <td style="font-family: monospace; font-weight: 700;">${rain.toFixed(1)} mm</td>
        <td><span class="table-badge ${badgeClass}">${classification}</span></td>
      </tr>
    `;
  }).join("");
}

function renderWeatherMonthlySummary(data) {
  const m = data.monthly_summary || {};
  const stats = data.statistics || {};

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setText("monthlyCurrentName", m.current_month_name || "Current Month");
  setText("monthlyCurrentRain", `${m.current_month_rainfall ?? '--'} mm`);
  setText("monthlyCurrentRainyDays", `${stats.current_month_rainy_days ?? '--'} days`);
  setText("monthlyCurrentAvg", `${stats.current_month_average ?? '--'} mm`);

  setText("monthlyPrevName", m.previous_month_name || "Previous Month");
  setText("monthlyPrevRain", `${m.previous_month_rainfall ?? '--'} mm`);
  setText("monthlyPrevTotal", `${m.previous_month_rainfall ?? '--'} mm`);
}

function renderWeatherTrendChart(data) {
  const canvas = document.getElementById("weatherTrendChart");
  if (!canvas) return;

  const isLight = isLightTheme();
  const gridColor = isLight ? "#e2e8f0" : "#1e293b";
  const textColor = isLight ? "#475569" : "#94a3b8";

  const series = currentTrendDays === 30 ? (data.daily_30d || []) : (data.daily_7d || []);
  const labels = series.map(s => s.date_formatted || s.date.slice(5));
  const rainValues = series.map(s => s.rainfall || 0);

  // Compute 3-day moving average for trend line
  const movingAvg = rainValues.map((val, idx, arr) => {
    const start = Math.max(0, idx - 2);
    const window = arr.slice(start, idx + 1);
    const sum = window.reduce((a, b) => a + b, 0);
    return +(sum / window.length).toFixed(1);
  });

  if (weatherTrendChartInstance) {
    weatherTrendChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");
  weatherTrendChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          type: "line",
          label: "Trend (3-day Moving Avg)",
          data: movingAvg,
          borderColor: "#f97316",
          borderWidth: 2,
          pointRadius: 2,
          fill: false,
          tension: 0.3,
          order: 1
        },
        {
          type: "bar",
          label: "Daily Rainfall (mm)",
          data: rainValues,
          backgroundColor: isLight ? "rgba(2, 132, 199, 0.75)" : "rgba(56, 189, 248, 0.75)",
          hoverBackgroundColor: "#38bdf8",
          borderRadius: 4,
          order: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: textColor,
            boxWidth: 12,
            font: { size: 11, weight: "600" }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.parsed.y;
              if (context.dataset.type === "line") {
                return ` Trend: ${val} mm`;
              }
              let rating = "Dry";
              if (val >= 64.5) rating = "Heavy Rain (IMD)";
              else if (val >= 15.6) rating = "Moderate Rain";
              else if (val >= 2.5) rating = "Rainy Day";
              return ` Rainfall: ${val} mm (${rating})`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 10 },
            callback: (v) => `${v} mm`
          },
          beginAtZero: true
        }
      }
    }
  });
}

async function fetchStateDistrictComparison(state) {
  const canvas = document.getElementById("weatherComparisonChart");
  const titleEl = document.getElementById("labelDistrictComparisonTitle");
  if (!canvas) return;

  if (titleEl) titleEl.textContent = `${state} District Comparison`;

  try {
    const res = await fetch(`/api/weather/comparison?state=${encodeURIComponent(state)}`);
    if (!res.ok) return;

    const data = await res.json();
    latestComparisonPayload = data;
    renderWeatherComparisonChart(data);
  } catch (err) {
    console.warn("Could not load district comparison chart:", err);
  }
}

function renderWeatherComparisonChart(data) {
  const canvas = document.getElementById("weatherComparisonChart");
  if (!canvas) return;

  const comparison = data.comparison || [];
  if (comparison.length === 0) return;

  const isLight = isLightTheme();
  const gridColor = isLight ? "#e2e8f0" : "#1e293b";
  const textColor = isLight ? "#475569" : "#94a3b8";

  const labels = comparison.map(c => c.district);
  const values = comparison.map(c => c.total_7d_mm);

  // Highlight active district
  const backgroundColors = comparison.map(c => 
    c.district.toLowerCase() === currentWeatherDistrict.toLowerCase() 
      ? (isLight ? "#0284c7" : "#38bdf8") 
      : (isLight ? "rgba(148, 163, 184, 0.4)" : "rgba(51, 65, 85, 0.6)")
  );

  if (weatherComparisonChartInstance) {
    weatherComparisonChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");
  weatherComparisonChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "7-Day Total (mm)",
          data: values,
          backgroundColor: backgroundColors,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` 7-Day Rainfall: ${ctx.parsed.y} mm`
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 10 },
            maxRotation: 45,
            minRotation: 20
          }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 10 },
            callback: (v) => `${v} mm`
          },
          beginAtZero: true
        }
      }
    }
  });
}
