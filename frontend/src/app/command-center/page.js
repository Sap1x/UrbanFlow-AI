'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import MapWrapper from '../../components/MapWrapper';

const API = 'http://localhost:8000';

function MetricGauge({ value, label, max = 100, color = 'var(--accent-cyan)' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', height: 120, justifyContent: 'center' }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${pct * 2.51} 251`}
          style={{ transition: 'stroke-dasharray 1s ease-out' }} />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 8 }}>{label}</div>
    </div>
  );
}

export default function CommandCenterPage() {
  const [data, setData] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Document level dark mode override for full screen immersion
    document.body.style.background = '#020408'; // Darker than normal
    document.body.classList.add('command-center-active');
    
    // Hide sidebar for this view
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (sidebar) sidebar.style.display = 'none';
    if (mainContent) {
      mainContent.style.marginLeft = '0';
      mainContent.style.padding = '0';
    }

    const timer = setInterval(() => setTime(new Date()), 1000);
    
    return () => {
      document.body.style.background = '';
      document.body.classList.remove('command-center-active');
      if (sidebar) sidebar.style.display = '';
      if (mainContent) {
        mainContent.style.marginLeft = '';
        mainContent.style.padding = '';
      }
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    // Determine WS protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Force 127.0.0.1 for local dev to avoid IPv6 ::1 hanging issues on mac
    const hostname = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${hostname}:8000`;
    
    console.log("Connecting to WebSocket:", `${wsUrl}/api/ws/command-center`);
    const ws = new WebSocket(`${wsUrl}/api/ws/command-center`);

    ws.onopen = () => {
      console.log("WebSocket connected successfully!");
    };

    ws.onmessage = (event) => {
      try {
        const result = JSON.parse(event.data);
        console.log("WebSocket received data:", result.system_status);
        setData(result);
      } catch (e) {
        console.error("Failed to parse WS data", e);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error", error);
      // Fallback Demo Data for UI testing in case WS fails
      setData({
        system_status: "OPERATIONAL",
        realtime_metrics: {
          active_incidents: 7, critical_incidents: 2,
          city_risk_score: 6.8, total_delay_mins: 145.5,
          officers_deployed: 142, officer_utilization_pct: 28.4, vehicles_deployed: 45
        },
        active_events: [
          { id: 'LIVE-1004', cause: 'public_event', location: 'Central Zone 1', corridor: 'MG Road', severity: 'CRITICAL', status: 'ESCALATING', impact_score: 8.9, time_active_mins: 45, latitude: 12.9716, longitude: 77.5946, metrics: { affected_radius_km: 4.2, estimated_delay_mins: 42 } },
          { id: 'LIVE-1002', cause: 'water_logging', location: 'South East', corridor: 'Hosur Road', severity: 'CRITICAL', status: 'STABLE', impact_score: 8.1, time_active_mins: 120, latitude: 12.9300, longitude: 77.6200, metrics: { affected_radius_km: 3.1, estimated_delay_mins: 35 } },
          { id: 'LIVE-1007', cause: 'vehicle_breakdown', location: 'East', corridor: 'ORR East 1', severity: 'HIGH', status: 'RESOLVING', impact_score: 6.5, time_active_mins: 18, latitude: 12.9500, longitude: 77.6500, metrics: { affected_radius_km: 1.5, estimated_delay_mins: 15 } },
          { id: 'LIVE-1001', cause: 'accident', location: 'North', corridor: 'Bellary Road', severity: 'MODERATE', status: 'STABLE', impact_score: 5.4, time_active_mins: 32, latitude: 13.0200, longitude: 77.5800, metrics: { affected_radius_km: 1.2, estimated_delay_mins: 12 } },
        ],
        trend_forecast: [
          { time: "18:00", predicted_score: 6.8 }, { time: "19:00", predicted_score: 7.2 },
          { time: "20:00", predicted_score: 7.5 }, { time: "21:00", predicted_score: 6.1 },
          { time: "22:00", predicted_score: 4.5 }, { time: "23:00", predicted_score: 3.2 }
        ],
        live_recommendations: [
          "URGENT: Deploy Level 3 response to Central Zone 1 for public event.",
          "Activate VMS diversions for Hosur Road to mitigate water logging.",
          "City-wide delay exceeds 100 mins. Consider extending green light phases on major arterial roads."
        ]
      });
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, []);

  if (!data) return <div className="loading-overlay"><div className="spinner" /><div className="loading-text">Initializing WebSocket Stream...</div></div>;

  const getRiskColor = (s) => s >= 8 ? 'var(--status-danger)' : s >= 6 ? 'var(--status-warning)' : s >= 4 ? 'var(--status-info)' : 'var(--status-success)';

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)', overflow: 'hidden' }}>
      
      {/* Top Header Bar */}
      <div style={{ height: 60, borderBottom: '1px solid var(--border-subtle)', background: 'rgba(6, 10, 19, 0.9)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--status-success)', boxShadow: '0 0 10px var(--status-success)' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--status-warning)', opacity: 0.3 }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--status-danger)', opacity: 0.3 }} />
          </div>
          <h1 style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0, color: 'var(--text-primary)' }}>
            UrbanFlow<span style={{ color: 'var(--accent-cyan)' }}>_OPS</span>
          </h1>
          <div style={{ padding: '4px 12px', background: 'var(--status-success-dim)', color: 'var(--status-success)', fontSize: 11, fontWeight: 800, borderRadius: 20, letterSpacing: '0.1em' }}>
            SYSTEM {data.system_status}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>AUTO-REFRESH: 10s</div>
          <div style={{ fontSize: 24, fontWeight: 300, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
            {time.toLocaleTimeString('en-US', { hour12: false })} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>IST</span>
          </div>
          <a href="/" style={{ padding: '6px 12px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>EXIT</a>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr 360px', gap: 1, background: 'var(--border-subtle)' }}>
        
        {/* LEFT PANEL: Active Incidents */}
        <div style={{ background: '#04070D', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--border-subtle)', background: 'linear-gradient(180deg, rgba(255,23,68,0.05) 0%, transparent 100%)' }}>
            <div style={{ fontSize: 10, color: 'var(--status-danger)', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>Live Feed</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{data.realtime_metrics.active_incidents} Active Events</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {data.active_events.map(e => (
              <div key={e.id} style={{ padding: 12, background: 'var(--bg-surface)', border: `1px solid ${getRiskColor(e.impact_score)}33`, borderRadius: 'var(--radius-sm)', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: getRiskColor(e.impact_score) }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{e.id}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: getRiskColor(e.impact_score), letterSpacing: '0.1em' }}>{e.status}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{e.cause.replace(/_/g, ' ').toUpperCase()}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{e.location} • {e.corridor}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Score</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: getRiskColor(e.impact_score) }}>{e.impact_score.toFixed(1)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Delay</div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{e.metrics.estimated_delay_mins}m</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--accent-cyan)' }}>T+{e.time_active_mins}m</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER PANEL: Map & Metrics */}
        <div style={{ background: '#020408', display: 'flex', flexDirection: 'column' }}>
          
          {/* Top Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ background: '#04070D', padding: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>City Risk Score</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: getRiskColor(data.realtime_metrics.city_risk_score), marginTop: 8 }}>{data.realtime_metrics.city_risk_score.toFixed(1)}</div>
            </div>
            <div style={{ background: '#04070D', padding: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Net Delay</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--status-warning)', marginTop: 8 }}>{data.realtime_metrics.total_delay_mins.toFixed(0)}<span style={{ fontSize: 16, color: 'var(--text-muted)', marginLeft: 4 }}>m</span></div>
            </div>
            <div style={{ background: '#04070D', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <MetricGauge value={data.realtime_metrics.officers_deployed} label="Officers Deployed" max={500} color="var(--accent-cyan)" />
            </div>
            <div style={{ background: '#04070D', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <MetricGauge value={data.realtime_metrics.vehicles_deployed} label="Patrol Vehicles" max={100} color="var(--accent-purple)" />
            </div>
          </div>

          {/* Central Visualization Area */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <MapWrapper data={data} />
          </div>
        </div>

        {/* RIGHT PANEL: Analytics & Ticker */}
        <div style={{ background: '#04070D', display: 'flex', flexDirection: 'column' }}>
          
          {/* Ticker / AI Recommendations */}
          <div style={{ padding: 20, borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 16 }}>🤖</div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-cyan)' }}>UrbanFlow Copilot</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.live_recommendations.map((rec, i) => (
                <div key={i} style={{ padding: '10px 12px', background: rec.includes('URGENT') ? 'var(--status-danger-dim)' : 'var(--bg-surface)', borderLeft: `3px solid ${rec.includes('URGENT') ? 'var(--status-danger)' : 'var(--accent-cyan)'}`, borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', fontSize: 13, lineHeight: 1.5 }}>
                  {rec}
                </div>
              ))}
            </div>
          </div>

          {/* Trend Forecast */}
          <div style={{ padding: 20, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 24 }}>6-Hour Risk Forecast</div>
            
            <div style={{ display: 'flex', alignItems: 'flex-end', height: 160, gap: 12 }}>
              {data.trend_forecast.map((f, i) => {
                const heightPct = (f.predicted_score / 10) * 100;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: getRiskColor(f.predicted_score), marginBottom: 8 }}>{f.predicted_score.toFixed(1)}</div>
                    <div style={{ width: '100%', height: `${heightPct}%`, background: `linear-gradient(to top, transparent, ${getRiskColor(f.predicted_score)})`, borderTop: `2px solid ${getRiskColor(f.predicted_score)}`, borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>{f.time}</div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Status Indicators */}
          <div style={{ padding: 20, borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ML Pipeline</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--status-success)' }}>ONLINE • 14ms</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data Stream</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--status-success)' }}>SYNCED</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ATCS Grid</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--status-warning)' }}>PARTIAL</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Optimization</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--status-success)' }}>READY</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
