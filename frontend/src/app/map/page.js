'use client';
import { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:8000';

export default function MapPage() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);
  const [events, setEvents] = useState([]);
  const [diversions, setDiversions] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      // Load Leaflet Heat plugin
      const heatScript = document.createElement('script');
      heatScript.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
      heatScript.onload = () => setLoaded(true);
      document.head.appendChild(heatScript);
    };
    document.head.appendChild(script);

    return () => {
      if (mapInstance.current) mapInstance.current.remove();
    };
  }, []);

  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstance.current) return;

    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: false,
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstance.current = map;

    // Load data
    loadData(map, L);
  }, [loaded]);

  async function loadData(map, L) {
    try {
      const [heatRes, eventsRes] = await Promise.all([
        fetch(`${API}/api/heatmap-data`),
        fetch(`${API}/api/events?limit=100`),
      ]);
      const heatData = await heatRes.json();
      const eventsData = await eventsRes.json();
      setHeatmapData(heatData.points || []);
      setEvents(eventsData.events || []);
      renderData(map, L, heatData.points || [], eventsData.events || []);
    } catch (err) {
      console.error('Map data error:', err);
      // Fallback demo data
      const demoEvents = [
        { event_cause: 'water_logging', latitude: 12.9352, longitude: 77.6245, impact_score: 8.5, zone: 'Koramangala' },
        { event_cause: 'accident', latitude: 12.9757, longitude: 77.6065, impact_score: 7.2, zone: 'MG Road' },
        { event_cause: 'construction', latitude: 13.0358, longitude: 77.5970, impact_score: 6.1, zone: 'Hebbal' },
        { event_cause: 'vehicle_breakdown', latitude: 12.9172, longitude: 77.6230, impact_score: 5.0, zone: 'Silk Board' },
        { event_cause: 'public_event', latitude: 12.9771, longitude: 77.5727, impact_score: 9.1, zone: 'Majestic' },
        { event_cause: 'tree_fall', latitude: 13.0050, longitude: 77.5736, impact_score: 3.5, zone: 'Bellary Road' },
      ];
      setEvents(demoEvents);
      renderData(map, L, [], demoEvents);
    }
  }

  function renderData(map, L, heatPoints, eventsList) {
    // Heatmap layer
    if (heatPoints.length > 0) {
      const points = heatPoints.map(p => [p.lat, p.lng, p.intensity]);
      L.heatLayer(points, {
        radius: 20, blur: 25, maxZoom: 15,
        gradient: { 0.2: '#00E676', 0.4: '#40C4FF', 0.6: '#FFD600', 0.8: '#FF9100', 1.0: '#FF1744' },
      }).addTo(map);
    }

    // Event markers
    eventsList.forEach((evt) => {
      if (!evt.latitude || !evt.longitude) return;
      const color = evt.impact_score >= 8 ? '#FF1744' : evt.impact_score >= 6 ? '#FFD600' : evt.impact_score >= 4 ? '#40C4FF' : '#00E676';
      const marker = L.circleMarker([evt.latitude, evt.longitude], {
        radius: Math.max(5, evt.impact_score * 1.2),
        color: color,
        fillColor: color,
        fillOpacity: 0.7,
        weight: 2,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${(evt.event_cause||'').replace(/_/g,' ').toUpperCase()}</div>
          <div style="font-size:12px;color:#666;margin-bottom:8px">${evt.zone || ''} ${evt.corridor ? '• ' + evt.corridor : ''}</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px">Impact Score</span>
            <span style="font-size:18px;font-weight:800;color:${color}">${evt.impact_score}</span>
          </div>
        </div>
      `);

      marker.on('click', () => setSelectedEvent(evt));
    });
  }

  async function loadDiversions() {
    if (!selectedEvent) return;
    try {
      const res = await fetch(`${API}/api/diversions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: selectedEvent.latitude, longitude: selectedEvent.longitude,
          event_cause: selectedEvent.event_cause, attendance: 10000,
          priority: 'High', requires_road_closure: false,
        }),
      });
      const data = await res.json();
      setDiversions(data);
      renderDiversions(data);
    } catch (err) {
      console.error(err);
    }
  }

  function renderDiversions(divData) {
    if (!mapInstance.current || !window.L) return;
    const L = window.L;
    const map = mapInstance.current;
    const colors = { primary: '#00E676', secondary: '#FFD600', emergency: '#FF1744' };

    Object.entries(divData.diversions || {}).forEach(([type, routes]) => {
      routes.forEach((route) => {
        if (!route.coordinates?.length) return;
        const latlngs = route.coordinates.map(c => [c.lat, c.lng]);
        L.polyline(latlngs, {
          color: colors[type] || '#40C4FF',
          weight: 4, opacity: 0.8,
          dashArray: type === 'emergency' ? '10, 10' : null,
        }).addTo(map).bindPopup(`
          <strong>${type.toUpperCase()} Route</strong><br/>
          ${route.from} → ${route.to}<br/>
          ${route.total_distance_km} km • ~${route.estimated_time_mins} min
        `);
      });
    });
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2>🗺️ Live Map</h2>
        <p>Interactive congestion heatmap with event markers and diversion routes</p>
      </div>

      <div style={{ position: 'relative' }}>
        <div ref={mapRef} className="map-container" style={{ height: 'calc(100vh - 140px)' }} />

        {/* Map Controls Overlay */}
        <div className="map-overlay">
          <div className="map-panel">
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Legend</div>
            {[
              { color: '#FF1744', label: 'Critical (8-10)' },
              { color: '#FFD600', label: 'High (6-8)' },
              { color: '#40C4FF', label: 'Moderate (4-6)' },
              { color: '#00E676', label: 'Low (1-4)' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{label}</span>
              </div>
            ))}
          </div>

          {selectedEvent && (
            <div className="map-panel animate-slide">
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Selected Event</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{(selectedEvent.event_cause || '').replace(/_/g, ' ').toUpperCase()}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{selectedEvent.zone}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-cyan)' }}>{selectedEvent.impact_score}/10</div>
              <button className="btn btn-primary btn-sm" onClick={loadDiversions} style={{ width: '100%', marginTop: 8 }}>
                Show Diversions
              </button>
            </div>
          )}

          {diversions && (
            <div className="map-panel animate-slide">
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Diversion Routes</div>
              {[
                { color: '#00E676', label: `Primary (${diversions.diversions?.primary?.length || 0})` },
                { color: '#FFD600', label: `Secondary (${diversions.diversions?.secondary?.length || 0})` },
                { color: '#FF1744', label: `Emergency (${diversions.diversions?.emergency?.length || 0})` },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 20, height: 3, background: color, borderRadius: 2 }} />
                  <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{label}</span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                Network: {diversions.road_network_nodes} nodes, {diversions.road_network_edges} edges
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
