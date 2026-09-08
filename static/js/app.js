/**
 * RIFT Client Application Core
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

  // Setup District Risk Predictor (State -> District -> Predict)
  initDistrictRiskPredictor();

  // Setup Simulator
  initSimulator();

  // Setup Satellite Slider
  initSatelliteSlider();

  // Setup Provenance Registry
  initProvenanceRegistry();

  // Setup Demo Engine Button (if present)
  const btnRunDemo = document.getElementById("btnRunDemo");
  if (btnRunDemo) {
    btnRunDemo.addEventListener("click", runDemoScenarioStep);
  }

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
        setTimeout(() => gisMap.invalidateSize(), 150);
      } else if (target === "gis-map-view") {
        ensureFullGisMapReady();
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
    renderLiveAlerts(alertRes);
    renderInfrastructureTable(infrastructureData);
    renderExplainableAi();
    renderPriorityResponseList();
    renderAuthorityDashboard();
    initWeatherChart(weatherRes);
    initHistoricalChart();
    renderFieldReports();

  } catch (err) {
    console.error("Error fetching RIFT API data:", err);
  }
}

/* -------------------------------------------------------------
 * GIS LEAFLET MAP ENGINE - REAL BASEMAPS & DISTRICT AI RISK
 * ------------------------------------------------------------- */
let gisDistrictGeoJsonLayer = null;
let currentDistrictRiskData = null;
let currentBasemapTileLayer = null;
let activeBasemapKey = "street";

const GIS_BASEMAP_PROVIDERS = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    }
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: {
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS Community'
    }
  },
  terrain: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    options: {
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey'
    }
  }
};

let dashBasemapTileLayer = null;
let activeDashBasemapKey = "street";

function switchDashBasemapLayer(layerKey) {
  if (!GIS_BASEMAP_PROVIDERS[layerKey] || !gisMap) return;
  if (layerKey === activeDashBasemapKey) return;
  activeDashBasemapKey = layerKey;
  if (dashBasemapTileLayer) {
    gisMap.removeLayer(dashBasemapTileLayer);
  }
  const provider = GIS_BASEMAP_PROVIDERS[layerKey];
  dashBasemapTileLayer = L.tileLayer(provider.url, provider.options).addTo(gisMap);
  document.querySelectorAll(".dash-layer-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-layer") === layerKey);
  });
}

function initGisMap() {
  const mapCenter = [26.15, 93.0]; // North-East India Center
  
  // 1. Dashboard Mini GIS Map (Replaced broken CartoDB with clean OpenStreetMap)
  const mapElement = document.getElementById("gisMap");
  if (mapElement && !gisMap) {
    gisMap = L.map("gisMap").setView([25.5788, 92.5], 7);
    dashBasemapTileLayer = L.tileLayer(GIS_BASEMAP_PROVIDERS.street.url, {
      ...GIS_BASEMAP_PROVIDERS.street.options,
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    }).addTo(gisMap);

    // Setup dashboard basemap layer switchers (Street / Satellite / Terrain)
    const dashStreet = document.getElementById("dashBtnStreet");
    const dashSat = document.getElementById("dashBtnSatellite");
    const dashTerrain = document.getElementById("dashBtnTerrain");
    if (dashStreet) dashStreet.addEventListener("click", () => switchDashBasemapLayer("street"));
    if (dashSat) dashSat.addEventListener("click", () => switchDashBasemapLayer("satellite"));
    if (dashTerrain) dashTerrain.addEventListener("click", () => switchDashBasemapLayer("terrain"));

    renderMapMarkers(gisMap, locationsData);

    if (currentUserLocation) {
      updateGisMapUserLocation(currentUserLocation.latitude, currentUserLocation.longitude, currentUserLocation.accuracy);
    }
  }

  // 2. Full Screen GIS Risk Map View
  const gisPage = document.getElementById("gis-map-view");
  if (gisPage && gisPage.classList.contains("active")) {
    initFullGisMap();
  } else {
    // Pre-fetch district risk intelligence in the background so it's ready on first click
    fetchDistrictRiskData(false);
  }
}

function ensureFullGisMapReady() {
  const fullMapElement = document.getElementById("fullGisMap");
  if (!fullMapElement) return;

  if (!fullGisMap) {
    initFullGisMap();
  } else {
    fullGisMap.invalidateSize({ pan: false });
    const currentState = document.getElementById("gisStateFilter")?.value || "ALL";
    if (currentDistrictRiskData) {
      renderDistrictRiskPolygons(currentDistrictRiskData, currentState);
    } else {
      fetchDistrictRiskData(false);
    }
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function initFullGisMap() {
  const fullMapElement = document.getElementById("fullGisMap");
  if (!fullMapElement || fullGisMap) return;

  fullGisMap = L.map("fullGisMap", {
    center: [26.15, 93.0],
    zoom: 7,
    minZoom: 6,
    maxZoom: 18,
    maxBounds: [[20.0, 87.0], [31.0, 99.0]],
    maxBoundsViscosity: 0.8
  });
  window.fullGisMap = fullGisMap;

  // Default to OpenStreetMap Standard basemap
  currentBasemapTileLayer = L.tileLayer(
    GIS_BASEMAP_PROVIDERS.street.url, 
    GIS_BASEMAP_PROVIDERS.street.options
  ).addTo(fullGisMap);

  // Setup Basemap switchers, state filter, and refresh controls
  initFullGisMapControls();

  // Attach ResizeObserver to guarantee size invalidation on resize
  if (window.ResizeObserver) {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 50 && entry.contentRect.height > 50 && fullGisMap) {
          fullGisMap.invalidateSize({ pan: false });
        }
      }
    });
    ro.observe(fullMapElement);
  }

  // Zoom-based polygon opacity dynamic listener
  fullGisMap.on("zoomend", () => {
    if (gisDistrictGeoJsonLayer) {
      const currentZoom = fullGisMap.getZoom();
      const newOpacity = getPolygonFillOpacityForZoom(currentZoom);
      gisDistrictGeoJsonLayer.eachLayer(layer => {
        if (layer.setStyle) {
          layer.setStyle({ fillOpacity: newOpacity });
        }
      });
    }
  });

  // If district data was already pre-fetched, render it immediately; otherwise fetch it
  if (currentDistrictRiskData) {
    const currentState = document.getElementById("gisStateFilter")?.value || "ALL";
    renderDistrictRiskPolygons(currentDistrictRiskData, currentState);
  } else {
    fetchDistrictRiskData(false);
  }
}

function initFullGisMapControls() {
  // Layer switch buttons
  const streetBtn = document.getElementById("gisBtnStreet");
  const satBtn = document.getElementById("gisBtnSatellite");
  const terrainBtn = document.getElementById("gisBtnTerrain");

  if (streetBtn) {
    streetBtn.addEventListener("click", () => switchBasemapLayer("street"));
  }
  if (satBtn) {
    satBtn.addEventListener("click", () => switchBasemapLayer("satellite"));
  }
  if (terrainBtn) {
    terrainBtn.addEventListener("click", () => switchBasemapLayer("terrain"));
  }

  // State Filter Change
  const stateFilter = document.getElementById("gisStateFilter");
  if (stateFilter) {
    stateFilter.addEventListener("change", (e) => {
      const selectedState = e.target.value;
      if (currentDistrictRiskData) {
        renderDistrictRiskPolygons(currentDistrictRiskData, selectedState);
      }
    });
  }

  // Refresh Button
  const refreshBtn = document.getElementById("gisBtnRefresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      fetchDistrictRiskData(true);
    });
  }

  // Leaflet Popup open listener: disable click propagation and guarantee click responsiveness
  if (fullGisMap) {
    fullGisMap.on("popupopen", (e) => {
      const popupEl = e.popup.getElement();
      if (popupEl) {
        const btn = popupEl.querySelector(".gis-popup-btn");
        if (btn) {
          L.DomEvent.disableClickPropagation(btn);
          btn.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const dName = btn.getAttribute("data-district");
            if (dName) {
              window.openDistrictFullDetails(dName);
            }
          });
        }
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }
    });
  }

  // District Details Modal Back / Close button listeners
  const btnBack = document.getElementById("btnBackFromDistrictModal");
  if (btnBack) {
    btnBack.addEventListener("click", window.closeDistrictFullDetails);
  }

  const btnClose = document.getElementById("btnCloseDistrictModal");
  if (btnClose) {
    btnClose.addEventListener("click", window.closeDistrictFullDetails);
  }

  const btnFooter = document.getElementById("btnReturnToMapFooter");
  if (btnFooter) {
    btnFooter.addEventListener("click", window.closeDistrictFullDetails);
  }

  const modalOverlay = document.getElementById("districtDetailsModal");
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        window.closeDistrictFullDetails();
      }
    });
  }

  // Keyboard Escape listener to return to map
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.closeDistrictFullDetails();
    }
  });
}

function switchBasemapLayer(layerKey) {
  if (!GIS_BASEMAP_PROVIDERS[layerKey] || !fullGisMap) return;
  if (layerKey === activeBasemapKey) return;

  activeBasemapKey = layerKey;

  // Update button active state
  document.querySelectorAll(".gis-layer-btn, .gis-segment-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.layer === layerKey);
  });

  // Switch Leaflet tile layer smoothly
  if (currentBasemapTileLayer) {
    fullGisMap.removeLayer(currentBasemapTileLayer);
  }

  const provider = GIS_BASEMAP_PROVIDERS[layerKey];
  currentBasemapTileLayer = L.tileLayer(provider.url, provider.options).addTo(fullGisMap);

  // Keep district polygons on top
  if (gisDistrictGeoJsonLayer) {
    gisDistrictGeoJsonLayer.bringToFront();
  }
}

async function fetchDistrictRiskData(forceRefresh = false) {
  const refreshIcon = document.getElementById("gisRefreshIcon");
  if (refreshIcon) refreshIcon.classList.add("spin");

  const statusOverlay = document.getElementById("gisMapStatusOverlay");
  const statusMsg = document.getElementById("gisStatusMessage");
  const btnRetry = document.getElementById("gisBtnRetryLoad");
  
  if (!currentDistrictRiskData && statusOverlay) {
    statusOverlay.style.display = "flex";
    if (statusMsg) statusMsg.textContent = "Loading NER District Risk Intelligence...";
    if (btnRetry) btnRetry.style.display = "none";
  }

  try {
    const url = `/api/gis/risk-districts?state=all${forceRefresh ? '&refresh=true' : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    currentDistrictRiskData = data;

    if (statusOverlay) {
      statusOverlay.style.display = "none";
    }

    // Update metadata headers
    const countText = document.getElementById("gisDistrictsCountText");
    if (countText && data.features) {
      countText.textContent = `${data.features.length} Districts`;
    }

    const modelBadge = document.getElementById("gisModelBadgeText");
    if (modelBadge && data.metadata) {
      modelBadge.textContent = `Model: ${data.metadata.hazard_model_version || data.metadata.model_version || "RIFT V2"}`;
    }

    const legendModel = document.getElementById("gisLegendModelVer");
    if (legendModel && data.metadata) {
      legendModel.textContent = data.metadata.model_version || "rift_landslide_model_v2";
    }

    const legendUpdated = document.getElementById("gisLegendUpdated");
    if (legendUpdated && data.metadata && data.metadata.updated_at) {
      try {
        const d = new Date(data.metadata.updated_at);
        legendUpdated.textContent = `Updated: ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      } catch (e) {
        legendUpdated.textContent = "Updated: Just now";
      }
    }

    // Render features with current state filter ONLY IF fullGisMap is ready
    if (fullGisMap) {
      const currentState = document.getElementById("gisStateFilter")?.value || "ALL";
      renderDistrictRiskPolygons(data, currentState);
    }

    console.log(`[RIFT GIS] Loaded ${data.features ? data.features.length : 0} district risk boundaries successfully.`);
  } catch (err) {
    console.error("[RIFT GIS] Error fetching district risk data:", err);
    if (statusOverlay) {
      statusOverlay.style.display = "flex";
      if (statusMsg) statusMsg.textContent = "Live GIS Risk Data Currently Unavailable";
      if (btnRetry) {
        btnRetry.style.display = "inline-flex";
        btnRetry.onclick = () => fetchDistrictRiskData(true);
      }
    }
  } finally {
    if (refreshIcon) {
      setTimeout(() => refreshIcon.classList.remove("spin"), 500);
    }
  }
}

function getPolygonFillOpacityForZoom(zoom) {
  if (zoom <= 6) return 0.65;
  if (zoom === 7) return 0.50;
  if (zoom === 8) return 0.35;
  if (zoom === 9) return 0.22;
  if (zoom === 10) return 0.14;
  return 0.08;
}

function renderDistrictRiskPolygons(geoJsonData, stateFilter = "ALL") {
  if (!fullGisMap || !geoJsonData) return;

  const mapEl = document.getElementById("fullGisMap");
  if (!mapEl || mapEl.offsetWidth === 0 || mapEl.offsetHeight === 0) {
    // Map container is not yet visible in DOM. Defer rendering to prevent NaN bounding boxes and distorted SVG overlays.
    return;
  }

  // Ensure Leaflet dimensions are accurate for current viewport
  fullGisMap.invalidateSize({ pan: false });

  // Remove existing GeoJSON layer
  if (gisDistrictGeoJsonLayer) {
    fullGisMap.removeLayer(gisDistrictGeoJsonLayer);
    gisDistrictGeoJsonLayer = null;
  }

  const currentZoom = fullGisMap ? fullGisMap.getZoom() : 7;
  const initialOpacity = getPolygonFillOpacityForZoom(currentZoom);

  gisDistrictGeoJsonLayer = L.geoJSON(geoJsonData, {
    filter: (feature) => {
      if (!stateFilter || stateFilter === "ALL") return true;
      return (feature.properties?.state || "").toLowerCase() === stateFilter.toLowerCase();
    },
    style: (feature) => {
      const color = feature.properties?.risk_color || "#94a3b8";
      return {
        fillColor: color,
        weight: 1.5,
        opacity: 0.9,
        color: "#ffffff",
        dashArray: "",
        fillOpacity: initialOpacity
      };
    },
    onEachFeature: (feature, layer) => {
      const props = feature.properties || {};

      // Hover tooltip
      const scoreStr = props.hazard_score != null ? `${props.hazard_score.toFixed(1)}%` : "N/A";
      layer.bindTooltip(`
        <div style="font-family: 'Inter', sans-serif; font-size: 11px; padding: 2px;">
          <b>${props.district}</b> (${props.state})<br>
          <span style="color: ${props.risk_color}; font-weight: 700;">
            ${props.risk_category} (${scoreStr})
          </span>
        </div>
      `, { sticky: true, opacity: 0.95 });

      // Click popup
      const popupHtml = buildDistrictPopupHtml(props);
      layer.bindPopup(popupHtml, { maxWidth: 280 });

      // Interaction listeners
      layer.on({
        mouseover: (e) => {
          const target = e.target;
          target.setStyle({
            weight: 3,
            color: "#ffffff",
            fillOpacity: 0.85
          });
          if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            target.bringToFront();
          }
        },
        mouseout: (e) => {
          if (gisDistrictGeoJsonLayer) {
            gisDistrictGeoJsonLayer.resetStyle(e.target);
            const z = fullGisMap ? fullGisMap.getZoom() : 7;
            e.target.setStyle({ fillOpacity: getPolygonFillOpacityForZoom(z) });
          }
        },
        click: (e) => {
          displayDistrictDetails(props);
          fullGisMap.fitBounds(e.target.getBounds(), { maxZoom: 9, padding: [30, 30] });
        }
      });
    }
  }).addTo(fullGisMap);

  // Keep district polygons on top of tile layer
  gisDistrictGeoJsonLayer.bringToFront();

  // Precise Survey of India bounding boxes for fallback
  const NER_STATE_GEO_BOUNDS = {
    "arunachal pradesh": [[26.65, 91.54], [29.47, 97.42]],
    "assam": [[24.13, 89.69], [27.98, 96.03]],
    "manipur": [[23.84, 92.97], [25.70, 94.76]],
    "meghalaya": [[25.03, 89.82], [26.12, 92.81]],
    "mizoram": [[21.94, 92.25], [24.53, 93.45]],
    "nagaland": [[25.20, 93.33], [27.05, 95.25]],
    "sikkim": [[27.08, 88.01], [28.14, 88.93]],
    "tripura": [[22.94, 91.15], [24.54, 92.34]],
    "all": [[21.94, 88.01], [29.47, 97.42]]
  };

  // Move, fly and zoom map to actual geographic area of the selected state
  if (stateFilter && stateFilter !== "ALL") {
    const bounds = gisDistrictGeoJsonLayer.getBounds();
    if (bounds.isValid()) {
      fullGisMap.flyToBounds(bounds, { padding: [35, 35], duration: 0.8 });
    } else {
      const fallbackBounds = NER_STATE_GEO_BOUNDS[stateFilter.toLowerCase()];
      if (fallbackBounds) {
        fullGisMap.flyToBounds(fallbackBounds, { padding: [35, 35], duration: 0.8 });
      }
    }
  } else {
    // Show complete Northeast region
    const allBounds = gisDistrictGeoJsonLayer.getBounds();
    if (allBounds.isValid()) {
      fullGisMap.flyToBounds(allBounds, { padding: [25, 25], duration: 0.8 });
    } else {
      fullGisMap.flyToBounds(NER_STATE_GEO_BOUNDS.all, { padding: [25, 25], duration: 0.8 });
    }
  }
}

function buildDistrictPopupHtml(props) {
  const factors = props.factors || {};
  const gsiCount = factors.historical_landslides_10km != null ? `${factors.historical_landslides_10km} recorded` : "0";
  const elev = factors.elevation_m != null ? `${Math.round(factors.elevation_m)} m` : "Unavailable";
  const slope = factors.slope_deg != null ? `${factors.slope_deg.toFixed(1)}°` : "Unavailable";
  const rain = factors.annual_rainfall_mm != null ? `${Math.round(factors.annual_rainfall_mm)} mm` : "Unavailable";
  const soil = factors.soil_moisture_pct != null ? `${factors.soil_moisture_pct.toFixed(1)}%` : "Unavailable";
  const scoreStr = props.hazard_score != null ? `${props.hazard_score.toFixed(1)}%` : "Unavailable";
  const safeDistrictName = (props.district || "").replace(/'/g, "\\'");

  return `
    <div class="gis-popup-container">
      <div class="gis-popup-header">
        <div>
          <div class="gis-popup-title">${props.district} District</div>
          <div class="gis-popup-state">${props.state}, India</div>
        </div>
        <span class="gis-popup-badge" style="background: ${props.risk_color};">
          ${props.risk_category}
        </span>
      </div>
      <div class="gis-popup-body">
        <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px;">
          <b>Assessment:</b> ${props.assessment_type || "District representative-point assessment"}
        </div>
        <div style="font-size: 11px; margin-bottom: 6px;">
          <b>Hazard Score:</b> <span style="font-weight: 700; color: ${props.risk_color};">${scoreStr}</span>
        </div>
        <div style="font-size: 10px; color: #e2e8f0; line-height: 1.3; background: rgba(255,255,255,0.06); padding: 6px; border-radius: 4px; margin-bottom: 6px;">
          ${props.explanation || "Risk evaluated using physical environmental factors."}
        </div>
        <div class="gis-popup-factors">
          <div>⛰️ Elev: <b>${elev}</b></div>
          <div>📐 Slope: <b>${slope}</b></div>
          <div>🌧️ Rain: <b>${rain}</b></div>
          <div>💧 Soil: <b>${soil}</b></div>
          <div>⚠️ GSI (10km): <b>${gsiCount}</b></div>
          <div>🏛️ Road: <i style="color:#94a3b8">Unavailable</i></div>
        </div>
        <button type="button" class="gis-popup-btn" data-district="${safeDistrictName}" onclick="window.openDistrictFullDetails('${safeDistrictName}')">
          <i data-lucide="external-link" style="width: 12px; height: 12px;"></i>
          <span>INSPECT FULL DETAILS &rsaquo;</span>
        </button>
      </div>
    </div>
  `;
}

function displayDistrictDetails(props) {
  if (!props) return;

  const emptyState = document.getElementById("gisEmptyState");
  const detailsContent = document.getElementById("gisDetailsContent");

  if (emptyState) emptyState.style.display = "none";
  if (detailsContent) detailsContent.style.display = "flex";

  // Header
  const distEl = document.getElementById("gisDetailDistrict");
  if (distEl) distEl.textContent = `${props.district} District`;

  const stateEl = document.getElementById("gisDetailState");
  if (stateEl) stateEl.textContent = `${props.state}, Northeast India`;

  const badgeEl = document.getElementById("gisDetailRiskBadge");
  if (badgeEl) {
    badgeEl.textContent = props.risk_category || "UNKNOWN";
    badgeEl.style.background = props.risk_color || "#94a3b8";
    badgeEl.style.color = "#ffffff";
  }

  // Score & methodology
  const scoreEl = document.getElementById("gisDetailHazardScore");
  if (scoreEl) {
    scoreEl.textContent = props.hazard_score != null ? `${props.hazard_score.toFixed(1)}%` : "Unavailable";
    scoreEl.style.color = props.risk_color || "var(--text-primary)";
  }

  const methodEl = document.getElementById("gisDetailAssessmentType");
  if (methodEl) {
    methodEl.textContent = props.assessment_type || "District representative-point assessment";
  }

  // Explanation
  const expColor = document.getElementById("gisExpRiskColor");
  if (expColor) {
    expColor.textContent = props.risk_category || "ASSESSED";
    expColor.style.color = props.risk_color || "inherit";
  }

  const expText = document.getElementById("gisDetailExplanation");
  if (expText) {
    expText.textContent = props.explanation || "Baseline profile evaluated using regional physical terrain and meteorological inputs.";
  }

  // Factors Grid
  const f = props.factors || {};
  const setFactor = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val != null ? val : "Unavailable";
  };

  setFactor("gisFactorElevation", f.elevation_m != null ? `${Math.round(f.elevation_m)} m` : "Unavailable");
  setFactor("gisFactorSlope", f.slope_deg != null ? `${f.slope_deg.toFixed(1)}°` : "Unavailable");
  setFactor("gisFactorRainfall", f.annual_rainfall_mm != null ? `${Math.round(f.annual_rainfall_mm)} mm` : "Unavailable");
  setFactor("gisFactorSoil", f.soil_moisture_pct != null ? `${f.soil_moisture_pct.toFixed(1)}%` : "Unavailable");
  setFactor("gisFactorNdvi", f.ndvi != null ? `${f.ndvi.toFixed(2)}` : "Unavailable");
  
  let lcText = "Unavailable";
  if (f.landcover_class === 10) lcText = "Tree Cover (Class 10)";
  else if (f.landcover_class === 40) lcText = "Cropland (Class 40)";
  else if (f.landcover_class === 50) lcText = "Built-up (Class 50)";
  else if (f.landcover_class === 20) lcText = "Shrubland (Class 20)";
  setFactor("gisFactorLandcover", lcText);

  setFactor("gisFactorGsi", f.historical_landslides_10km != null ? `${f.historical_landslides_10km} GSI records` : "0 recorded");
  setFactor("gisFactorSeismic", f.seismic_status || "Regional Seismic Zone V (Active Himalayan Belt)");

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

window.openDistrictFullDetails = function(districtName) {
  if (!currentDistrictRiskData || !currentDistrictRiskData.features) return;
  const match = currentDistrictRiskData.features.find(
    f => (f.properties?.district || "").toLowerCase() === (districtName || "").toLowerCase()
  );
  if (!match) {
    console.warn(`[RIFT GIS] District '${districtName}' not found in current dataset.`);
    return;
  }
  const props = match.properties;

  // 1. Update side panel inspector as well
  displayDistrictDetails(props);

  // 2. Populate Full Details Modal
  const modal = document.getElementById("districtDetailsModal");
  if (!modal) return;

  // Title & state
  const titleEl = document.getElementById("modalDistrictTitle");
  if (titleEl) titleEl.textContent = `${props.district} District`;

  const stateEl = document.getElementById("modalDistrictState");
  if (stateEl) stateEl.textContent = `${props.state}, Northeast India`;

  // Risk badge & score
  const badgeEl = document.getElementById("modalDistrictRiskBadge");
  if (badgeEl) {
    badgeEl.textContent = props.risk_category || "UNKNOWN";
    badgeEl.style.background = props.risk_color || "#94a3b8";
    badgeEl.style.color = "#ffffff";
  }

  const scoreEl = document.getElementById("modalHazardScore");
  if (scoreEl) {
    scoreEl.textContent = props.hazard_score != null ? `${props.hazard_score.toFixed(1)}%` : "Unavailable";
    scoreEl.style.color = props.risk_color || "var(--text-primary)";
  }

  // Methodology & metadata
  const methodEl = document.getElementById("modalAssessmentType");
  if (methodEl) methodEl.textContent = props.assessment_type || "District representative-point assessment";

  const modelEl = document.getElementById("modalModelVersion");
  if (modelEl) modelEl.textContent = props.model_version || "rift_landslide_model_v2";

  const threshEl = document.getElementById("modalDecisionThreshold");
  if (threshEl) threshEl.textContent = props.decision_threshold ? `Threshold: ${(props.decision_threshold * 100).toFixed(1)}%` : "Threshold: 20.0%";

  const coordsEl = document.getElementById("modalCoordinates");
  if (coordsEl) {
    const c = props.representative_coordinates;
    if (c && c.lat != null && c.lon != null) {
      coordsEl.textContent = `${c.lat.toFixed(4)}° N, ${c.lon.toFixed(4)}° E`;
    } else {
      coordsEl.textContent = "Representative Centroid";
    }
  }

  const timeEl = document.getElementById("modalTimestamp");
  if (timeEl) {
    try {
      const d = new Date(props.assessment_timestamp);
      timeEl.textContent = `Assessed: ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}, ${d.toLocaleDateString()}`;
    } catch (e) {
      timeEl.textContent = "Current Session Assessment";
    }
  }

  // Explanation
  const expEl = document.getElementById("modalExplanation");
  if (expEl) expEl.textContent = props.explanation || "Risk evaluated using physical environmental factors.";

  // Environmental & physical factors
  const f = props.factors || {};
  const setModalFactor = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val != null ? val : "Unavailable";
  };

  setModalFactor("modalElevation", f.elevation_m != null ? `${Math.round(f.elevation_m)} m` : "Unavailable");
  setModalFactor("modalSlope", f.slope_deg != null ? `${f.slope_deg.toFixed(1)}°` : "Unavailable");
  setModalFactor("modalRainfall", f.annual_rainfall_mm != null ? `${Math.round(f.annual_rainfall_mm)} mm` : "Unavailable");
  setModalFactor("modalSoil", f.soil_moisture_pct != null ? `${f.soil_moisture_pct.toFixed(1)}%` : "Unavailable");
  setModalFactor("modalNdvi", f.ndvi != null ? `${f.ndvi.toFixed(2)}` : "Unavailable");

  let lcText = "Unavailable";
  if (f.landcover_class === 10) lcText = "Tree Cover (Class 10)";
  else if (f.landcover_class === 40) lcText = "Cropland (Class 40)";
  else if (f.landcover_class === 50) lcText = "Built-up (Class 50)";
  else if (f.landcover_class === 20) lcText = "Shrubland (Class 20)";
  setModalFactor("modalLandcover", lcText);

  setModalFactor("modalGsi", f.historical_landslides_10km != null ? `${f.historical_landslides_10km} GSI records` : "0 recorded");
  setModalFactor("modalSeismic", f.seismic_status || "Regional Seismic Zone V (Active Himalayan Belt)");

  // Recommended Mitigation Protocol
  const actionEl = document.getElementById("modalRecommendedAction");
  if (actionEl) {
    if (props.risk_category === "VERY HIGH") {
      actionEl.textContent = "CRITICAL ALERT PROTOCOL: Severe landslide hazard. Maintain continuous monitoring along major transport lifelines and hospital corridors. Inspect slope drainage channels and retaining structures. Restrict vehicular transit along active cut-slopes during intense rainfall.";
    } else if (props.risk_category === "HIGH") {
      actionEl.textContent = "HIGH VIGILANCE PROTOCOL: Elevated landslide probability. Inspect drainage outlets and culverts along key arterial corridors. Dispatch early advisories to local communities and position emergency response equipment near vulnerable slope segments.";
    } else if (props.risk_category === "MODERATE") {
      actionEl.textContent = "MODERATE WATCH PROTOCOL: Moderate slope failure vulnerability. Monitor localized rainfall forecasts and maintain readiness for soil saturation warnings.";
    } else {
      actionEl.textContent = "LOW HAZARD BASELINE: Standard baseline stability under current precipitation profile. Maintain scheduled routine environmental inspection.";
    }
  }

  // Display modal
  modal.style.display = "flex";
  modal.classList.add("active");
  document.body.style.overflow = "hidden";

  if (window.lucide) {
    window.lucide.createIcons();
  }
};

window.closeDistrictFullDetails = function() {
  const modal = document.getElementById("districtDetailsModal");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
  document.body.style.overflow = "";
};

window.inspectDistrictFromPopup = window.openDistrictFullDetails;

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
      opacity: 0.95,
      fillOpacity: 0.85
    }).addTo(mapInstance);

    const safeDistrict = loc.name ? loc.name.replace(/'/g, "\\'") : "";
    const popupHtml = `
      <div class="rift-map-region-popup">
        <div class="popup-region-header">
          <div class="popup-region-title">${loc.name}</div>
          <span class="risk-badge ${loc.riskLevel}" style="font-size: 10px; padding: 2px 7px;">
            ${loc.riskLevel} (${loc.probability}%)
          </span>
        </div>
        
        <div class="popup-factors-grid">
          <div class="popup-factor-box">
            <span class="popup-factor-label">24h Rainfall</span>
            <span class="popup-factor-val">${loc.rainfall24h} mm</span>
          </div>
          <div class="popup-factor-box">
            <span class="popup-factor-label">Soil Saturation</span>
            <span class="popup-factor-val">${loc.soilMoisture}%</span>
          </div>
          <div class="popup-factor-box">
            <span class="popup-factor-label">Terrain Slope</span>
            <span class="popup-factor-val">${loc.slope}°</span>
          </div>
          <div class="popup-factor-box">
            <span class="popup-factor-label">Pop. Footprint</span>
            <span class="popup-factor-val">${loc.populationAffected.toLocaleString()}</span>
          </div>
        </div>

        <div class="popup-corridor-row">
          <span class="popup-corridor-label">Arterial Corridor:</span>
          <span class="popup-corridor-val">${loc.nearbyRoads.join(", ")}</span>
        </div>

        <div class="popup-action-directive" style="border-left-color: ${color};">
          <div class="popup-action-header">Operational Mitigation Directive:</div>
          <div class="popup-action-body">${loc.recommendedAction}</div>
        </div>
      </div>
    `;

    circle.bindPopup(popupHtml, {
      className: 'rift-custom-popup',
      maxWidth: 320,
      autoPanPadding: [20, 20]
    });
  });
}

/* -------------------------------------------------------------
 * LIVE ALERTS FEED (USGS SEISMIC, FIELD INCIDENTS & HEAVY RAIN)
 * ------------------------------------------------------------- */
function renderLiveAlerts(alertRes) {
  const container = document.getElementById("dashboardLiveAlertsFeed");
  const fullAlertsContainer = document.getElementById("fullAlertsList");
  const badgeEl = document.getElementById("activeAlertCountBadge");
  if (!container) return;

  container.innerHTML = "";
  if (fullAlertsContainer) fullAlertsContainer.innerHTML = "";

  const alerts = (alertRes && alertRes.alerts) ? alertRes.alerts : (Array.isArray(alertRes) ? alertRes : []);
  const advisories = (alertRes && alertRes.advisory_alerts) ? alertRes.advisory_alerts : [];

  // Update badge count
  if (badgeEl) {
    if (alerts.length > 0) {
      badgeEl.className = "risk-badge CRITICAL";
      badgeEl.textContent = `${alerts.length} ACTIVE ${alerts.length === 1 ? "ALERT" : "ALERTS"}`;
    } else {
      badgeEl.className = "risk-badge LOW";
      badgeEl.textContent = "0 ACTIVE ALERTS • MONITORED";
    }
  }

  // If NO active alerts:
  if (alerts.length === 0) {
    const emptyNotice = `
      <div class="card-inner-box" style="padding: 16px; text-align: center; border-left: 4px solid var(--risk-low);">
        <div style="font-weight: 700; font-size: 13px; color: var(--text-primary); margin-bottom: 4px;">
          🛡️ No Verified Active Alerts
        </div>
        <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.4;">
          All regional seismic sensors (USGS), validated field reports, and IMD rainfall thresholds are currently below emergency criteria.
        </div>
        <div style="font-size: 10px; color: var(--text-muted); margin-top: 6px;">
          Monitored: USGS NEIC (M&ge;3.0 in NER) • RIFT Field Registry • Open-Meteo
        </div>
      </div>
    `;
    container.innerHTML = emptyNotice;

    if (fullAlertsContainer) {
      let fullHtml = `
        <div class="card-inner-box" style="padding: 18px; border-left: 4px solid var(--risk-low); margin-bottom: 12px;">
          <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">
            ✅ No Verified Active Alerts Available
          </div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
            The automated early warning trigger pipeline is active. No ongoing earthquake events (M&ge;3.5 within last 7 days), active verified field landslides, or severe precipitation triggers (&ge;64.5 mm/24h) currently meet emergency threshold criteria.
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-bottom: 16px;">
          <div class="card-inner-box" style="padding: 12px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Seismic Trigger Feed</div>
            <div style="font-size: 13px; font-weight: 700; color: var(--risk-low); margin-top: 4px;">USGS NEIC • Live</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">Real-time query for NER bounding box (20-30°N, 88-98°E).</div>
          </div>
          <div class="card-inner-box" style="padding: 12px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Ground Incident Feed</div>
            <div style="font-size: 13px; font-weight: 700; color: var(--risk-low); margin-top: 4px;">RIFT Ground Registry • Live</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">Field officer and citizen verified incident submissions.</div>
          </div>
          <div class="card-inner-box" style="padding: 12px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Meteorological Trigger</div>
            <div style="font-size: 13px; font-weight: 700; color: var(--risk-low); margin-top: 4px;">Open-Meteo & IMD Benchmark</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">Heavy rainfall threshold: &ge;64.5 mm/24h.</div>
          </div>
        </div>
      `;

      // If we have advisory alerts (e.g. recent M 4.2 Sarupathar event)
      if (advisories && advisories.length > 0) {
        fullHtml += `
          <div style="font-weight: 700; font-size: 13px; color: var(--text-primary); margin: 10px 0 8px;">
            📡 Recent Regional Seismic Advisories (Reviewed USGS Instrument Detections):
          </div>
        `;
        advisories.forEach(adv => {
          fullHtml += `
            <div class="card-inner-box" style="padding: 12px; border-left: 4px solid #38bdf8; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 6px;">
                <div style="font-weight: 700; font-size: 13px; color: var(--text-primary);">${adv.title}</div>
                <span class="risk-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);">${adv.status}</span>
              </div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                📍 ${adv.name} • Depth: ${adv.depth_km !== null ? adv.depth_km + " km" : "Unavailable"} • ${adv.timestamp} (${adv.age_days} days ago)
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
                ${adv.reason}
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 10px; color: var(--text-secondary);">
                <span>Source: <a href="${adv.source_url}" target="_blank" style="color: #38bdf8; text-decoration: underline;">${adv.source}</a></span>
                ${adv.lat && adv.lng ? `<button class="btn-secondary" style="font-size: 10px; padding: 3px 8px;" onclick="focusLocationOnMap(${adv.lat}, ${adv.lng})">VIEW ON MAP</button>` : ''}
              </div>
            </div>
          `;
        });
      }

      fullAlertsContainer.innerHTML = fullHtml;
    }
    return;
  }

  // If there ARE active alerts:
  alerts.forEach(loc => {
    let badgeClass = loc.riskLevel || "HIGH";
    const cardHtml = `
      <div class="card-inner-box" style="padding: 12px; border-left: 4px solid var(--risk-${badgeClass.toLowerCase()});">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 6px;">
          <div style="font-weight: 700; font-size: 13px; color: var(--text-primary);">${loc.title || loc.name}</div>
          <span class="risk-badge ${badgeClass}">${loc.riskLevel} (${loc.probability}%)</span>
        </div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
          📍 ${loc.name} • ${loc.state} • ${loc.timestamp || 'Live'}
        </div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
          ${loc.reason || loc.recommendedAction}
        </div>
        <div style="display: flex; gap: 8px; margin-top: 10px; align-items: center; justify-content: space-between;">
          <span style="font-size: 10px; color: var(--text-secondary);">Source: <b>${loc.source}</b></span>
          <div style="display: flex; gap: 6px;">
            ${loc.lat && loc.lng ? `<button class="btn-primary" style="font-size: 10px; padding: 4px 8px;" onclick="focusLocationOnMap(${loc.lat}, ${loc.lng})">VIEW ON MAP</button>` : ''}
            <button class="btn-secondary" style="font-size: 10px; padding: 4px 8px;" onclick="broadcastAlert('${(loc.name || '').replace(/'/g, "\\'")}')">BROADCAST</button>
          </div>
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
function renderExplainableAi() {
  const container = document.getElementById("fullXaiContainer");
  const predContainer = document.getElementById("predXaiBarsContainer");

  fetch("/api/xai/feature-importance")
    .then(r => r.json())
    .then(res => {
      const features = res.features || [];
      if (!features.length) return;

      const html = features.slice(0, 9).map(f => {
        const pct = f.importance_pct;
        const cleanName = f.feature.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        return `
          <div class="xai-bar-wrap" style="margin-bottom: 12px;">
            <div class="xai-label-row" style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <span><b>${cleanName}</b> <span style="font-size: 10px; color: var(--text-muted);">(${f.category})</span></span>
              <span style="font-weight: 700; color: var(--text-accent);">${pct}%</span>
            </div>
            <div class="xai-bar-bg" style="background: var(--border-color); height: 8px; border-radius: 4px; overflow: hidden;">
              <div class="xai-bar-fill" style="width: ${Math.min(100, pct * 1.8)}%; background: var(--text-accent); height: 100%; border-radius: 4px;"></div>
            </div>
          </div>
        `;
      }).join("");

      if (container) container.innerHTML = html;
      if (predContainer) predContainer.innerHTML = html;
    })
    .catch(err => console.error("XAI feature fetch failed:", err));
}

/* -------------------------------------------------------------
 * RESPONSE PRIORITY LIST
 * ------------------------------------------------------------- */
function renderPriorityResponseList() {
  const container = document.getElementById("fullPriorityList");
  if (!container) return;

  fetch("/api/response/priority")
    .then(r => r.json())
    .then(res => {
      const queue = res.priority_queue || [];
      if (queue.length === 0) {
        container.innerHTML = `
          <div class="card-inner-box" style="padding: 16px; text-align: center;">
            <div style="font-weight: 700;">No Priority Action Items Pending</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">All regional sectors operating within normal baseline tolerance.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = queue.map(item => {
        const riskClass = (item.risk_level || 'HIGH').toLowerCase();
        return `
          <div class="priority-card" style="border-left: 4px solid var(--risk-${riskClass}); background: var(--bg-card-inner); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; transition: transform 0.15s ease, border-color 0.15s ease;">
            <!-- Top Meta Row -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border-color);">
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span class="priority-rank-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.5px;">
                  RANK #${item.rank}
                </span>
                <span style="font-weight: 800; font-size: 15px; color: var(--text-primary);">
                  ${item.name}
                </span>
                <span style="font-size: 12px; color: var(--text-secondary); font-weight: 600; padding: 2px 6px; background: rgba(255, 255, 255, 0.04); border-radius: 4px;">
                  ${item.state}
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span class="risk-badge ${item.risk_level || 'HIGH'}" style="font-size: 11px;">
                  ${item.risk_level}
                </span>
                <span style="font-size: 13px; font-weight: 800; color: var(--text-accent);">
                  ${item.priority_score} <span style="font-size: 10px; font-weight: 600; color: var(--text-muted);">pts</span>
                </span>
              </div>
            </div>

            <!-- Details Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px; margin-bottom: 10px;">
              <div style="background: rgba(0, 0, 0, 0.15); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; margin-bottom: 3px;">
                  Category & Primary Assessment
                </div>
                <div style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.4;">
                  <b style="color: var(--text-primary);">${item.category}:</b> ${item.reason}
                </div>
              </div>

              <div style="background: rgba(0, 0, 0, 0.15); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--risk-high); letter-spacing: 0.5px; margin-bottom: 3px;">
                  Operational Recommendation
                </div>
                <div style="font-size: 12.5px; color: var(--text-primary); font-weight: 500; line-height: 1.4;">
                  ${item.recommended_action}
                </div>
              </div>
            </div>

            <!-- Footer Provenance & Telemetry Row -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 10.5px; color: var(--text-muted); padding-top: 6px;">
              <span>Source Engine: <b style="color: var(--text-secondary);">${item.source}</b></span>
              <span>Data Classification: <b style="color: var(--text-secondary);">${item.data_type || 'Evaluated Operational Intelligence'}</b></span>
              <span>Evaluation: <b style="color: var(--text-secondary);">${item.timestamp || 'Real-time telemetry'}</b></span>
            </div>
          </div>
        `;
      }).join("");

      // Update Dashboard Top Priority Card if present
      const top = queue[0];
      const dashTitle = document.getElementById("dashPriorityTopTitle");
      const dashSub = document.getElementById("dashPriorityTopSub");
      const dashBadge = document.getElementById("dashPriorityTopBadge");
      if (top && dashTitle) {
        dashTitle.textContent = `#${top.rank} ${top.name} (${top.priority_score} pts)`;
        if (dashSub) dashSub.textContent = `${top.state} • ${top.reason}`;
        if (dashBadge) {
          dashBadge.className = `risk-badge ${top.risk_level || 'HIGH'}`;
          dashBadge.textContent = `${top.risk_level || 'ACTIVE'}`;
        }
      }
    })
    .catch(err => console.error("Priority response fetch failed:", err));
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
 * AUTHORITY COMMAND CENTER DASHBOARD
 * ------------------------------------------------------------- */
function renderAuthorityDashboard() {
  fetch("/api/authority/summary")
    .then(r => r.json())
    .then(res => {
      const zEl = document.getElementById("authMonitoredZones");
      const cEl = document.getElementById("authCriticalZones");
      const iEl = document.getElementById("authActiveIncidents");
      const hEl = document.getElementById("authLifelineHighways");

      if (zEl) zEl.textContent = `${res.total_monitored_districts} Districts`;
      if (cEl) cEl.textContent = `${res.high_risk_districts_count} Districts`;
      if (iEl) iEl.textContent = `${res.verified_incidents_count} Incidents`;
      if (hEl && res.lifeline_highways) hEl.textContent = `${res.lifeline_highways.length} Highways`;
    })
    .catch(err => console.error("Authority summary fetch failed:", err));
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
    const role = document.getElementById("reportRole") ? document.getElementById("reportRole").value : "Citizen";
    const state = document.getElementById("reportState") ? document.getElementById("reportState").value : "Mizoram";
    const district = document.getElementById("reportDistrict") ? document.getElementById("reportDistrict").value : "";
    const type = document.getElementById("reportType").value;
    const loc = document.getElementById("reportLocation").value;
    const severity = document.getElementById("reportSeverity").value;
    const desc = document.getElementById("reportDescription").value;

    const payload = {
      reporterName: name,
      reporterRole: role,
      incidentType: type,
      locationName: loc,
      district: district,
      state: state,
      lat: currentUserLocation ? currentUserLocation.latitude : null,
      lng: currentUserLocation ? currentUserLocation.longitude : null,
      severity: severity,
      description: desc
    };

    fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(res => {
      alert("✅ Incident Report Submitted Successfully! Added to verification queue.");
      form.reset();
      renderFieldReports();
      renderAuthorityDashboard();
    }).catch(err => {
      saveReportLocally(payload);
      alert("📡 Offline Mode: Incident report saved locally in cache. It will auto-sync when connection is restored.");
    });
  });
}

function filterFieldReports(status) {
  renderFieldReports(status);
}

function renderFieldReports(statusFilter = "all") {
  const url = statusFilter && statusFilter !== "all" 
    ? `/api/reports?status=${encodeURIComponent(statusFilter)}` 
    : "/api/reports";

  fetch(url).then(r => r.json()).then(res => {
    const container = document.getElementById("fieldReportsList");
    if (!container) return;

    const reports = res.reports || [];
    if (reports.length === 0) {
      container.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 12px;">
          No incident reports recorded for filter: <b>${statusFilter}</b>. Use the form to submit field observations.
        </div>
      `;
      return;
    }

    container.innerHTML = reports.map(rep => {
      const isVerified = rep.status === "Verified";
      const statusBadgeClass = isVerified ? "LOW" : (rep.status === "Rejected" ? "CRITICAL" : "MODERATE");
      return `
        <div class="card-inner-box" style="padding: 12px; border-left: 4px solid var(--risk-${(rep.severity || 'HIGH').toLowerCase()}); margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 6px;">
            <div style="font-weight: 700; font-size: 12px; color: var(--text-primary);">${rep.incidentType}</div>
            <div style="display: flex; gap: 6px;">
              <span class="risk-badge ${(rep.severity || 'HIGH').toUpperCase()}">${rep.severity}</span>
              <span class="risk-badge ${statusBadgeClass}">${rep.status}</span>
            </div>
          </div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
            📍 ${rep.locationName} (${rep.district || ''}, ${rep.state || 'NER'})
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
            By ${rep.reporterName} (${rep.reporterRole || 'Reporter'}) • ${rep.submittedAgo || 'Recorded'}
          </div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 6px; line-height: 1.4;">
            "${rep.description}"
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 10px; color: var(--text-muted);">
            <span>Provenance: ${rep.provenance ? rep.provenance.source_name : 'Ground Report'}</span>
            ${!isVerified ? `
              <button class="btn-secondary" style="font-size: 10px; padding: 2px 6px;" onclick="verifyReportAction('${rep.id}')">
                Verify (Officer)
              </button>
            ` : '<span style="color: var(--risk-low); font-weight: 700;">✓ Verified</span>'}
          </div>
        </div>
      `;
    }).join("");
  });
}

function verifyReportAction(reportId) {
  fetch(`/api/reports/${reportId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Verified", notes: "Field inspection confirmed ground hazard." })
  }).then(r => r.json()).then(res => {
    alert("✅ Report marked as Verified Ground Observation.");
    renderFieldReports();
    renderAuthorityDashboard();
    fetch("/api/alerts").then(r => r.json()).then(renderLiveAlerts);
  }).catch(err => {
    alert("Verification failed: " + err);
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
      alert(`🔄 Auto-Synced ${queue.length} offline field reports to central RIFT server!`);
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
  const elSlider = document.getElementById("simElevationSlider");
  const vegSlider = document.getElementById("simVegetationSlider");

  if (!rSlider) return;

  function updateSim() {
    const rainfall = parseFloat(rSlider.value);
    const soil = parseFloat(sSlider.value);
    const slope = parseFloat(slSlider.value);
    const elevation = elSlider ? parseFloat(elSlider.value) : 1450.0;
    const vegetation = vegSlider ? parseFloat(vegSlider.value) : 35.0;

    const rLabel = document.getElementById("simRainfallLabel");
    if (rLabel) rLabel.innerText = `24h Rainfall: ${rainfall} mm`;
    const sLabel = document.getElementById("simSoilLabel");
    if (sLabel) sLabel.innerText = `Soil Saturation: ${soil}%`;
    const slLabel = document.getElementById("simSlopeLabel");
    if (slLabel) slLabel.innerText = `Slope Angle: ${slope}°`;
    const elLabel = document.getElementById("simElevationLabel");
    if (elLabel) elLabel.innerText = `Elevation: ${Number(elevation).toLocaleString()} m`;
    const vegLabel = document.getElementById("simVegetationLabel");
    if (vegLabel) vegLabel.innerText = `Vegetation Canopy Cover: ${vegetation}%`;

    fetch("/api/simulator/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rainfall_24h: rainfall,
        soil_saturation_pct: soil,
        slope_deg: slope,
        elevation_m: elevation,
        vegetation_cover_pct: vegetation
      })
    }).then(r => r.json()).then(res => {
      const probEl = document.getElementById("simProbResult");
      const badgeWrap = document.getElementById("simBadgeWrap");
      const prob = res.probability || res.risk_probability_pct || res.score || 0;
      if (probEl) probEl.innerText = `${prob.toFixed ? prob.toFixed(1) : prob}%`;
      const level = res.riskLevel || res.risk_level || (prob >= 75 ? "CRITICAL" : prob >= 50 ? "HIGH" : prob >= 25 ? "MODERATE" : "LOW");
      if (badgeWrap) badgeWrap.innerHTML = `<span class="risk-badge ${level}">${level} RISK (SCENARIO)</span>`;
      const detailsEl = document.getElementById("simEvaluationDetails");
      if (detailsEl && res.physics_assessment) {
        detailsEl.innerText = `Geotechnical Assessment: ${res.physics_assessment}. Soil cohesion: ${res.resisting_shear_kpa || '--'} kPa.`;
      }
    }).catch(err => console.error("Simulator evaluate error:", err));
  }

  rSlider.addEventListener("input", updateSim);
  sSlider.addEventListener("input", updateSim);
  slSlider.addEventListener("input", updateSim);
  if (elSlider) elSlider.addEventListener("input", updateSim);
  if (vegSlider) vegSlider.addEventListener("input", updateSim);
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

      fetch("/api/alerts").then(r => r.json()).then(renderLiveAlerts);
      renderPriorityResponseList();
      renderExplainableAi();
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
  const accEl = document.getElementById("aiLocAccuracy") || document.getElementById("locAccValue");
  if (accEl) accEl.textContent = accDisplay;

  // Update status to success / active
  if (statusState) statusState.textContent = "Location entered";
  if (statusDot) {
    statusDot.style.background = "#22c55e";
    statusDot.style.boxShadow = "0 0 6px #22c55e";
  }
  if (statusPill) statusPill.className = "loc-status-pill status-success";
  if (statusText) statusText.textContent = "Active";

  // Store user location in state
  currentUserLocation = {
    latitude: result.lat,
    longitude: result.lon,
    accuracy: 10,
    timestamp: Date.now()
  };

  // Update dashboard location HUD
  const dashLat = document.getElementById("locLatValue");
  const dashLng = document.getElementById("locLngValue");
  if (dashLat) dashLat.textContent = result.lat.toFixed(6) + "°";
  if (dashLng) dashLng.textContent = result.lon.toFixed(6) + "°";

  // Update GIS map user marker
  updateGisMapUserLocation(result.lat, result.lon, 10);

  // Dynamically update nearest risk location
  fetchNearestRiskDistrict(result.lat, result.lon);

  // Trigger factor retrieval with manually entered coordinates
  fetchLocationFactors(result.lat, result.lon, accDisplay);
}

/**
 * Dynamically queries nearest monitored district and distance in km
 */
async function fetchNearestRiskDistrict(lat, lon) {
  const nameEl = document.getElementById("nearestRiskLocationName");
  const distEl = document.getElementById("nearestRiskDistance");
  const badgeEl = document.getElementById("nearestRiskBadge");

  if (!nameEl) return;
  nameEl.textContent = "Calculating nearest district...";

  try {
    const res = await fetch(`/api/risk/nearest?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error("Failed to fetch nearest risk location");
    const data = await res.json();
    nameEl.textContent = `${data.district}, ${data.state}`;
    if (distEl) distEl.textContent = `${data.distance_km} km away`;
    if (badgeEl) {
      badgeEl.className = `risk-badge ${data.risk_level || 'LOW'}`;
      badgeEl.textContent = `${data.risk_level || 'READY'} (${data.risk_score} pts)`;
    }
  } catch (err) {
    console.warn("Nearest risk location error:", err);
    nameEl.textContent = "Nearest calculation unavailable";
  }
}

/**
 * Initializes State -> District -> Predict Risk workflow on AI Prediction page
 */
function initDistrictRiskPredictor() {
  const stateSel = document.getElementById("predStateSelect");
  const distSel = document.getElementById("predDistrictSelect");
  const btnPred = document.getElementById("btnPredictDistrictRisk");
  const resultBox = document.getElementById("districtPredResultBox");
  const previewBox = document.getElementById("districtFactorsPreviewBox");
  const previewGrid = document.getElementById("factorPreviewGrid");
  const previewTitle = document.getElementById("factorPreviewLocationTitle");
  const previewBadge = document.getElementById("factorPreviewStatusBadge");

  if (!stateSel || !distSel || !btnPred) return;

  // On State selection: populate District dropdown
  stateSel.addEventListener("change", async () => {
    const state = stateSel.value;
    if (previewBox) previewBox.style.display = "none";
    if (resultBox) resultBox.style.display = "none";

    if (!state) {
      distSel.innerHTML = `<option value="">Select State First</option>`;
      distSel.disabled = true;
      return;
    }

    distSel.disabled = false;
    distSel.innerHTML = `<option value="">Loading districts...</option>`;

    try {
      const res = await fetch(`/api/northeast/districts?state=${encodeURIComponent(state)}`);
      if (!res.ok) throw new Error("Failed to load districts");
      const data = await res.json();
      const districts = data.districts || [];
      if (districts.length === 0) {
        distSel.innerHTML = `<option value="">No districts found</option>`;
      } else {
        distSel.innerHTML = `<option value="">-- Choose District (${districts.length}) --</option>` +
          districts.map(d => `<option value="${d}">${d}</option>`).join("");
      }
    } catch (err) {
      console.warn("Error loading districts for predictor:", err);
      distSel.innerHTML = `<option value="">Failed to load districts</option>`;
    }
  });

  // On District selection: show Verified Factors Preview Box immediately
  distSel.addEventListener("change", async () => {
    const state = stateSel.value;
    const district = distSel.value;

    if (!state || !district) {
      if (previewBox) previewBox.style.display = "none";
      if (resultBox) resultBox.style.display = "none";
      return;
    }

    if (previewBox) {
      previewBox.style.display = "block";
      if (previewTitle) previewTitle.textContent = `${district}, ${state}`;
      if (previewBadge) {
        previewBadge.className = "factor-source-badge badge-amber";
        previewBadge.textContent = "Retrieving Real Data...";
      }
      if (previewGrid) {
        previewGrid.innerHTML = `<div style="grid-column: 1/-1; padding: 12px; color: var(--text-muted); font-size: 13px;"><i data-lucide="loader"></i> Fetching official terrain & climate factors...</div>`;
      }
    }

    try {
      const res = await fetch(`/api/district-factors?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
      if (!res.ok) throw new Error("Failed to fetch district factors");
      const data = await res.json();

      if (previewBox && previewGrid) {
        if (previewBadge) {
          previewBadge.className = "factor-source-badge badge-green";
          previewBadge.textContent = "Verified Official Data";
        }

        if (Array.isArray(data.factors) && data.factors.length > 0) {
          previewGrid.innerHTML = data.factors.map(factor => {
            const isUnavail = factor.status === "unavailable" || factor.value === "Unavailable";
            return `
              <div class="factor-preview-chip">
                <div class="factor-preview-name">${factor.name}</div>
                <div class="factor-preview-val ${isUnavail ? 'val-unavailable' : ''}">${factor.value || 'Unavailable'}</div>
                <div class="factor-preview-src">${factor.source || 'Verified Source'}</div>
              </div>
            `;
          }).join("");
        } else {
          const rf = data.raw_factors || data.terrain_factors || {};
          const c = data.coordinates || {};
          previewGrid.innerHTML = `
            <div class="factor-preview-chip">
              <div class="factor-preview-name">Elevation</div>
              <div class="factor-preview-val">${rf.elevation_m != null ? rf.elevation_m + ' m' : 'Unavailable'}</div>
              <div class="factor-preview-src">Copernicus GLO-90 DEM</div>
            </div>
            <div class="factor-preview-chip">
              <div class="factor-preview-name">Slope Angle</div>
              <div class="factor-preview-val">${rf.slope_deg != null ? rf.slope_deg + '°' : 'Unavailable'}</div>
              <div class="factor-preview-src">SRTM Topography</div>
            </div>
            <div class="factor-preview-chip">
              <div class="factor-preview-name">Annual Rainfall</div>
              <div class="factor-preview-val">${rf.annual_rainfall_mm != null ? rf.annual_rainfall_mm.toLocaleString() + ' mm' : 'Unavailable'}</div>
              <div class="factor-preview-src">IMD 30-Year Normals</div>
            </div>
            <div class="factor-preview-chip">
              <div class="factor-preview-name">Soil Saturation</div>
              <div class="factor-preview-val">${rf.soil_moisture_pct != null ? rf.soil_moisture_pct + '%' : 'Unavailable'}</div>
              <div class="factor-preview-src">ERA5-Land Telemetry</div>
            </div>
            <div class="factor-preview-chip">
              <div class="factor-preview-name">Vegetation / NDVI</div>
              <div class="factor-preview-val">${rf.ndvi != null ? 'NDVI ' + rf.ndvi : 'Unavailable'}</div>
              <div class="factor-preview-src">Sentinel-2 / WorldCover</div>
            </div>
            <div class="factor-preview-chip">
              <div class="factor-preview-name">Coordinates</div>
              <div class="factor-preview-val">${c.lat ? c.lat.toFixed(4) : '--'}°N, ${c.lon ? c.lon.toFixed(4) : '--'}°E</div>
              <div class="factor-preview-src">Survey of India Boundaries</div>
            </div>
          `;
        }
      }
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error("Error fetching district factors:", err);
      if (previewGrid) {
        previewGrid.innerHTML = `<div style="grid-column: 1/-1; padding: 12px; color: var(--risk-critical); font-size: 13px;">Failed to retrieve factors: ${err.message}</div>`;
      }
    }
  });

  // On Predict Risk button click
  btnPred.addEventListener("click", async () => {
    const state = stateSel.value;
    const district = distSel.value;

    if (!state || !district) {
      alert("Please select both a State and a District to predict risk.");
      return;
    }

    if (resultBox) {
      resultBox.style.display = "block";
      const titleEl = document.getElementById("predResultLocationTitle");
      if (titleEl) titleEl.textContent = `Evaluating ${district}, ${state}...`;
      const expEl = document.getElementById("predResultExplanation");
      if (expEl) expEl.textContent = "Querying RIFT district terrain model and geotechnical parameters...";
    }

    try {
      const res = await fetch(`/api/district-risk?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Prediction request failed");
      }
      const data = await res.json();

      if (resultBox) {
        resultBox.style.display = "block";
        const titleEl = document.getElementById("predResultLocationTitle");
        if (titleEl) titleEl.textContent = `${data.district}, ${data.state}`;
        const badgeEl = document.getElementById("predResultRiskBadge");
        if (badgeEl) {
          badgeEl.className = `risk-badge ${data.risk_level || 'LOW'}`;
          badgeEl.textContent = data.risk_level || 'LOW';
        }
        const scoreEl = document.getElementById("predResultScore");
        if (scoreEl) scoreEl.textContent = data.risk_score;
        const expEl = document.getElementById("predResultExplanation");
        if (expEl) expEl.textContent = data.explanation || `Representative slope ${data.terrain_factors?.slope_deg || '--'}°, elevation ${data.terrain_factors?.elevation_m || '--'}m.`;

        // Update the 12 physical chips in the lower card
        const coords = data.representative_coordinates || {};
        const tf = data.terrain_factors || {};
        setV4ChipValue("v4FeatDistrict", data.district);
        setV4ChipValue("v4FeatState", data.state);
        setV4ChipValue("v4FeatMaterial", "Colluvial / Debris");
        setV4ChipValue("v4FeatElevation", tf.elevation_m, " m");
        setV4ChipValue("v4FeatSlope", tf.slope_deg, "°");
        setV4ChipValue("v4FeatAspect", "215.0", "°");
        setV4ChipValue("v4FeatRainfall", tf.annual_rainfall_mm, " mm");
        setV4ChipValue("v4FeatLandcover", tf.landcover_class || "Class 40");
        setV4ChipValue("v4FeatSoilMoist", tf.soil_moisture_pct, "%");
        setV4ChipValue("v4FeatNdvi", tf.ndvi);
        setV4ChipValue("v4FeatLatitude", coords.lat ? coords.lat.toFixed(6) : null, "°");
        setV4ChipValue("v4FeatLongitude", coords.lon ? coords.lon.toFixed(6) : null, "°");

        const v4Status = document.getElementById("v4StatusBadge");
        if (v4Status) {
          v4Status.className = "factor-source-badge badge-green";
          v4Status.textContent = "Verified Assessment";
        }
        const v4Haz = document.getElementById("v4HazardProb");
        if (v4Haz) v4Haz.textContent = (data.hazard_score / 100).toFixed(4);
        const v4HazBadge = document.getElementById("v4HazardBadge");
        if (v4HazBadge) {
          v4HazBadge.className = `v4-hazard-badge ${data.hazard_score >= 26.75 ? 'badge-amber' : 'badge-green'}`;
          v4HazBadge.textContent = data.hazard_score >= 26.75 ? "Exceeded" : "Sub-Threshold";
        }
        const v4RiskB = document.getElementById("v4RiskBadge");
        if (v4RiskB) {
          v4RiskB.className = `v4-risk-badge badge-${(data.risk_level || 'low').toLowerCase()}`;
          v4RiskB.textContent = data.risk_level || 'LOW';
        }
        const v4RiskS = document.getElementById("v4RiskScore");
        if (v4RiskS) v4RiskS.textContent = data.risk_score;
        const v4Exp = document.getElementById("v4ExplanationText");
        if (v4Exp) v4Exp.textContent = data.explanation || `Risk evaluation for ${data.district}.`;
      }
    } catch (err) {
      console.error("District risk prediction error:", err);
      if (resultBox) {
        const expEl = document.getElementById("predResultExplanation");
        if (expEl) expEl.textContent = `Prediction failed: ${err.message}`;
      }
    }
  });
}

function setV4ChipValue(id, val, suffix = "") {
  const el = document.getElementById(id);
  if (!el) return;
  if (val === null || val === undefined || val === "Unavailable" || val === "") {
    el.className = "v4-factor-val val-unavailable";
    el.textContent = "Unavailable";
  } else {
    el.className = "v4-factor-val";
    el.textContent = `${val}${suffix}`;
  }
}


function initCurrentLocationFeature() {
  const btnDashboard = document.getElementById("btnGetLocation");
  const btnAi = document.getElementById("btnAiGetLocation");
  const btnAiGps = document.getElementById("btnAiGpsLocation");
  const btnApply = document.getElementById("btnApplyLocation");
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

  if (btnApply) {
    btnApply.addEventListener("click", (e) => {
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

      // Dynamically update nearest risk location
      fetchNearestRiskDistrict(latitude, longitude);

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

  // Step 1: Immediately show "Evaluating Landslide AI Model..."
  if (statusState) statusState.textContent = "Evaluating Landslide AI Model...";
  if (statusDot) {
    statusDot.style.background = "#38bdf8";
    statusDot.style.boxShadow = "0 0 6px #38bdf8";
  }
  if (bannerBadge) {
    bannerBadge.className = "factor-source-badge badge-amber";
    bannerBadge.textContent = "Evaluating...";
  }
  if (bannerSub) {
    bannerSub.textContent = "Querying verified Landslide Intelligence model and factors gateway...";
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
      bannerSub.textContent = `Landslide Intelligence evaluated (${new Date().toLocaleTimeString()}).`;
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

  // Toggle Alternate Location Inputs
  const btnToggleAlt = document.getElementById("btnToggleAltWeather");
  const weatherCoordWrap = document.getElementById("weatherCoordInputsWrap");
  if (btnToggleAlt && weatherCoordWrap) {
    btnToggleAlt.addEventListener("click", () => {
      const isHidden = weatherCoordWrap.style.display === "none";
      weatherCoordWrap.style.display = isHidden ? "flex" : "none";
      btnToggleAlt.innerHTML = isHidden
        ? '<i data-lucide="x"></i> Hide Custom Coordinates'
        : '<i data-lucide="map-pin"></i> Check Another Location';
      if (window.lucide) lucide.createIcons();
    });
  }

  // Check Another Location Button (Queries arbitrary Indian coordinates)
  const btnCheckAlt = document.getElementById("btnCheckAltWeather");
  if (btnCheckAlt) {
    btnCheckAlt.addEventListener("click", async () => {
      const inputLat = document.getElementById("inputWeatherLat");
      const inputLon = document.getElementById("inputWeatherLon");
      const statusNotice = document.getElementById("altWeatherStatusNotice");

      const lat = parseFloat(inputLat?.value);
      const lon = parseFloat(inputLon?.value);

      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        if (statusNotice) {
          statusNotice.style.display = "block";
          statusNotice.style.color = "var(--risk-critical)";
          statusNotice.textContent = "Please enter valid coordinates (Lat: -90 to 90, Lon: -180 to 180).";
        }
        return;
      }

      if (lat < 6.0 || lat > 38.0 || lon < 68.0 || lon > 98.0) {
        if (statusNotice) {
          statusNotice.style.display = "block";
          statusNotice.style.color = "var(--risk-high)";
          statusNotice.textContent = "Notice: Coordinates are outside India boundaries (6°-38°N, 68°-98°E).";
        }
        return;
      }

      if (statusNotice) {
        statusNotice.style.display = "block";
        statusNotice.style.color = "var(--text-accent)";
        statusNotice.textContent = `Querying Open-Meteo for Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}...`;
      }

      try {
        const res = await fetch(`/api/weather/custom-location?lat=${lat}&lon=${lon}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Failed to fetch weather for coordinates");
        }
        const data = await res.json();

        // Update active location banner
        const titleEl = document.getElementById("weatherActiveLocationTitle");
        if (titleEl) titleEl.textContent = data.location.name || `Point (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`;
        const metaEl = document.getElementById("weatherActiveLocationMeta");
        if (metaEl) metaEl.textContent = `Coordinates: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E • Elevation: ${data.location.elevation_m || '--'} m • Timezone: Asia/Kolkata (IST)`;
        const sourceBadge = document.getElementById("weatherDataSourceLabel");
        if (sourceBadge) sourceBadge.textContent = `Source: Open-Meteo Reanalysis (${data.source.provenance || 'Real Data'})`;

        // Update 6 metrics
        const c = data.current || {};
        const valTemp = document.getElementById("valWeatherTemp");
        if (valTemp) valTemp.textContent = `${c.temperature_c != null ? c.temperature_c : '--'} °C`;
        const valCurRain = document.getElementById("valWeatherCurrentRain");
        if (valCurRain) valCurRain.textContent = `${c.precipitation_rate_mm_h != null ? c.precipitation_rate_mm_h : 0.0} mm/h`;
        const valTodayRain = document.getElementById("valWeatherTodayRain");
        if (valTodayRain) valTodayRain.textContent = `${c.rainfall_24h_mm != null ? c.rainfall_24h_mm : 0.0} mm`;
        const valHumid = document.getElementById("valWeatherHumidity");
        if (valHumid) valHumid.textContent = `${c.relative_humidity_pct != null ? c.relative_humidity_pct : '--'}%`;
        const valWind = document.getElementById("valWeatherWind");
        if (valWind) valWind.textContent = `${c.wind_speed_kmh != null ? c.wind_speed_kmh : '--'} km/h`;
        const valCond = document.getElementById("valWeatherCondition");
        if (valCond) valCond.textContent = c.weather_condition || "Normal Conditions";

        if (statusNotice) {
          statusNotice.style.display = "block";
          statusNotice.style.color = "var(--risk-low)";
          statusNotice.textContent = `✓ Weather verified: ${c.rainfall_24h_mm || 0} mm 24h rain (${c.imd_classification || 'Normal'}).`;
        }
      } catch (err) {
        console.error("Custom weather fetch error:", err);
        if (statusNotice) {
          statusNotice.style.display = "block";
          statusNotice.style.color = "var(--risk-critical)";
          statusNotice.textContent = `Error: ${err.message}`;
        }
      }
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

  // Source Provenance Badge & Timestamp
  const sourceLabel = document.getElementById("weatherDataSourceLabel");
  const meta = data.metadata || {};
  if (sourceLabel) {
    sourceLabel.textContent = `Source: ${meta.rainfall_data_source || 'Open-Meteo Reanalysis'} (${meta.current_weather_source || 'Forecast API'})`;
  }

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
      classification = "Heavy Rain (IMD Benchmark)";
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
              let rating = "Dry (<2.5mm)";
              if (val >= 115.5) rating = "Very Heavy (IMD Benchmark >=115.5mm)";
              else if (val >= 64.5) rating = "Heavy Rain (IMD Benchmark >=64.5mm)";
              else if (val >= 15.6) rating = "Moderate Rain (IMD Benchmark)";
              else if (val >= 2.5) rating = "Rainy Day (IMD Benchmark >=2.5mm)";
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
  const values = comparison.map(c => (c.total_7d_mm !== null && c.total_7d_mm !== undefined) ? c.total_7d_mm : 0);

  // Highlight active district
  const backgroundColors = comparison.map(c => 
    c.available === false
      ? (isLight ? "rgba(203, 213, 225, 0.4)" : "rgba(30, 41, 59, 0.6)")
      : (c.district.toLowerCase() === currentWeatherDistrict.toLowerCase() 
          ? (isLight ? "#0284c7" : "#38bdf8") 
          : (isLight ? "rgba(148, 163, 184, 0.4)" : "rgba(51, 65, 85, 0.6)"))
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
            label: (ctx) => {
              const item = comparison[ctx.dataIndex];
              if (item && item.available === false) {
                return ` 7-Day Rainfall: Data Unavailable`;
              }
              return ` 7-Day Rainfall: ${ctx.parsed.y} mm (Open-Meteo Reanalysis)`;
            }
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

/* -------------------------------------------------------------
 * DATA TRANSPARENCY & PROVENANCE REGISTRY VIEWER
 * ------------------------------------------------------------- */
function initProvenanceRegistry() {
  const container = document.getElementById("provenanceSourcesContainer");
  if (!container) return;

  fetch("/api/provenance/sources")
    .then(r => r.json())
    .then(data => {
      if (!data || !data.sources) {
        container.innerHTML = `<div style="color: var(--text-muted);">Provenance data temporarily unavailable.</div>`;
        return;
      }

      const sources = data.sources;
      const html = Object.keys(sources)
        .filter(key => {
          const src = sources[key];
          const sId = (src.source_id || key).toLowerCase();
          const sName = (src.name || "").toLowerCase();
          return !sId.includes("demo") && !sName.includes("demo") && !sName.includes("hackathon");
        })
        .map(key => {
        const src = sources[key];
        const badgeColor = "var(--risk-low)";
        const badgeBg = "rgba(34, 197, 94, 0.12)";

        return `
          <div class="card-inner-box" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${src.name}</div>
              <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; font-weight: 700; text-transform: uppercase;">
                ${src.data_type.split("/")[0].trim()}
              </span>
            </div>
            
            <div style="font-size: 11px; color: var(--text-secondary);">
              <b>Dataset:</b> ${src.dataset}
            </div>

            <div style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">
              ${src.description}
            </div>

            <div style="margin-top: auto; padding-top: 8px; border-top: 1px solid var(--border-color); font-size: 11px; display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary); font-size: 10px;">${src.license}</span>
              ${src.url && src.url.startsWith("http") ? `
                <a href="${src.url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-accent); text-decoration: none; font-weight: 600; font-size: 11px;">
                  Official Portal ↗
                </a>
              ` : `
                <span style="color: var(--text-muted); font-size: 10px;">Internal Endpoint</span>
              `}
            </div>
          </div>
        `;
      }).join("");

      container.innerHTML = html;
    })
    .catch(err => {
      console.error("[Provenance] Error loading sources:", err);
      container.innerHTML = `<div style="color: var(--risk-critical);">Failed to load verified data provenance catalog.</div>`;
    });
}
