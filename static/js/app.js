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

document.addEventListener("DOMContentLoaded", () => {
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
      <div style="background: #172036; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); border-left: 4px solid var(--risk-${loc.riskLevel.toLowerCase()});">
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
      <td style="padding: 10px; color: #f97316;">${item.status}</td>
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

  weatherChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Rainfall Intensity (mm/h)',
        data: data,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

function initHistoricalChart() {
  const ctx = document.getElementById("historicalChart");
  if (!ctx) return;

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
        x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } }
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
      <div style="background: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color);">
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
