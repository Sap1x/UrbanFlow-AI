"use client";
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Play, Pause, Rewind, FastForward } from 'lucide-react';
import '../app/command-center/map.css';

// We must require leaflet.heat dynamically to avoid SSR window issues
if (typeof window !== 'undefined') {
  window.L = L;
  require('leaflet.heat');
}

// ---------------------------------------------------------------------------
// Heatmap Component Wrapper
// ---------------------------------------------------------------------------
function HeatmapLayer({ points }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!map || !points || points.length === 0) return;
    if (!L.heatLayer) return;

    // Convert to [lat, lng, intensity]
    const heatPoints = points.map(p => [p.latitude, p.longitude, p.impact_score * 10]);

    heatLayerRef.current = L.heatLayer(heatPoints, {
      radius: 30,
      blur: 20,
      maxZoom: 15,
      gradient: { 0.2: 'green', 0.5: 'yellow', 0.8: 'orange', 1.0: 'red' }
    }).addTo(map);

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map, points]);

  return null;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
const getRiskColor = (s) => {
  if (s >= 8) return '#FF1744'; // Red
  if (s >= 6) return '#FF9100'; // Orange
  if (s >= 4) return '#FFEA00'; // Yellow
  return '#00E676'; // Green
};

const createPulsingIcon = (score) => {
  const color = getRiskColor(score);
  return L.divIcon({
    className: 'incident-marker',
    html: `
      <div class="incident-marker-core" style="background: ${color}; box-shadow: 0 0 10px ${color}"></div>
      <div class="incident-marker-ring" style="border-color: ${color}"></div>
      <div class="incident-marker-ring" style="border-color: ${color}; animation-delay: 1s;"></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const createResourceIcon = (type) => {
  let emoji = '🚓';
  if (type === 'officer') emoji = '👮';
  if (type === 'barricade') emoji = '🚧';
  
  return L.divIcon({
    className: 'resource-marker',
    html: `<div style="font-size: 20px; background: rgba(0,0,0,0.5); padding: 4px; border-radius: 50%; border: 1px solid var(--accent-cyan); display: flex; align-items: center; justify-content: center;">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function GISOperationsMap({ data }) {
  const [digitalTwinMode, setDigitalTwinMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineProgress, setTimelineProgress] = useState(100); // 0 to 100

  // Center on Bangalore (approx)
  const center = [12.9716, 77.5946];

  // Dummy resources for the deployment layer
  const resources = [
    { id: 'R1', lat: 12.975, lng: 77.59, type: 'vehicle', radius: 1000 },
    { id: 'R2', lat: 12.965, lng: 77.60, type: 'officer', radius: 500 },
    { id: 'R3', lat: 12.930, lng: 77.62, type: 'vehicle', radius: 1500 },
    { id: 'R4', lat: 12.950, lng: 77.65, type: 'officer', radius: 500 }
  ];

  // Dummy interventions for the intervention layer
  const interventions = [
    { id: 'I1', coords: [[12.9716, 77.5946], [12.980, 77.60]], color: '#00E676', name: 'Diversion Route A' },
    { id: 'I2', coords: [[12.930, 77.620], [12.920, 77.630]], color: '#00E676', name: 'Signal Retiming Zone' }
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      
      {/* Top Left Floating Controls */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, display: 'flex', gap: 8 }}>
        <button 
          onClick={() => setDigitalTwinMode(false)}
          style={{ 
            padding: '8px 16px', 
            background: !digitalTwinMode ? 'var(--accent-cyan)' : 'rgba(0,0,0,0.8)',
            color: !digitalTwinMode ? '#000' : 'var(--text-primary)',
            border: '1px solid var(--accent-cyan)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '11px',
            letterSpacing: '0.1em'
          }}
        >
          TRAFFIC VIEW
        </button>
        <button 
          onClick={() => setDigitalTwinMode(true)}
          style={{ 
            padding: '8px 16px', 
            background: digitalTwinMode ? 'var(--accent-purple)' : 'rgba(0,0,0,0.8)',
            color: digitalTwinMode ? '#fff' : 'var(--text-primary)',
            border: '1px solid var(--accent-purple)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '11px',
            letterSpacing: '0.1em'
          }}
        >
          DIGITAL TWIN
        </button>
      </div>

      <MapContainer 
        center={center} 
        zoom={12} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <LayersControl position="topright">
          {/* Base Layer */}
          <LayersControl.BaseLayer checked name="CartoDB Dark Matter">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution="&copy; OpenStreetMap contributors &copy; CARTO"
            />
          </LayersControl.BaseLayer>

          {/* Traffic Congestion Heatmap */}
          <LayersControl.Overlay checked name="Congestion Heatmap">
            <HeatmapLayer points={data.active_events} />
          </LayersControl.Overlay>

          {/* Incident Markers */}
          <LayersControl.Overlay checked name="Active Incidents">
            {data.active_events.map(event => (
              <Marker 
                key={event.id} 
                position={[event.latitude, event.longitude]}
                icon={createPulsingIcon(event.impact_score)}
              >
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{event.id}</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: getRiskColor(event.impact_score), marginBottom: '8px' }}>
                      {event.cause.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Severity</div>
                        <div style={{ fontSize: '12px' }}>{event.severity}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Delay</div>
                        <div style={{ fontSize: '12px' }}>{event.metrics.estimated_delay_mins}m</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                      Recommends Level 3 Deployment
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </LayersControl.Overlay>

          {/* Resource Deployment */}
          <LayersControl.Overlay checked name="Resource Deployment">
            {resources.map(res => (
              <React.Fragment key={res.id}>
                <Marker position={[res.lat, res.lng]} icon={createResourceIcon(res.type)} />
                <Circle 
                  center={[res.lat, res.lng]} 
                  radius={res.radius} 
                  pathOptions={{ color: 'var(--accent-cyan)', fillColor: 'var(--accent-cyan)', fillOpacity: 0.1, weight: 1, dashArray: '4' }} 
                />
              </React.Fragment>
            ))}
          </LayersControl.Overlay>

          {/* Interventions */}
          <LayersControl.Overlay checked name="Interventions">
            {interventions.map(int => (
              <Polyline 
                key={int.id}
                positions={int.coords} 
                pathOptions={{ color: int.color, weight: 4, dashArray: '10, 10' }} 
              />
            ))}
          </LayersControl.Overlay>

          {/* Digital Twin Propagation (only visible if mode is active) */}
          {digitalTwinMode && (
            <LayersControl.Overlay checked name="Propagation Simulation">
              {data.active_events.map(event => (
                <Circle 
                  key={`dt-${event.id}`}
                  center={[event.latitude, event.longitude]} 
                  radius={event.metrics.affected_radius_km * 1000} 
                  pathOptions={{ color: 'var(--accent-purple)', fillColor: 'var(--accent-purple)', fillOpacity: 0.2, weight: 2 }} 
                />
              ))}
            </LayersControl.Overlay>
          )}

        </LayersControl>
      </MapContainer>

      {/* Bottom Timeline Controls */}
      <div style={{ 
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', 
        zIndex: 1000, background: 'rgba(6, 10, 19, 0.95)', border: '1px solid var(--border-subtle)',
        padding: '12px 24px', borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', gap: '24px', width: '80%', maxWidth: '600px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><Rewind size={18} /></button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><FastForward size={18} /></button>
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <span>-6H (HISTORIC)</span>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>LIVE</span>
            <span>+6H (PREDICTED)</span>
          </div>
          <input 
            type="range" 
            min="0" max="100" 
            value={timelineProgress} 
            onChange={(e) => setTimelineProgress(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>
      </div>

    </div>
  );
}
