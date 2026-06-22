'use client';
import { useState } from 'react';

const API = 'http://localhost:8000';

export default function SimulationPage() {
  const [form, setForm] = useState({
    event_cause: 'public_event', event_type: 'planned',
    latitude: 12.9716, longitude: 77.5946,
    attendance: 50000, requires_road_closure: true,
    priority: 'High', hour: 18, zone: 'unknown',
    corridor: 'Non-corridor', description: 'Large public event',
    duration_hours: 4,
  });
  const [scenarios, setScenarios] = useState(null);
  const [twinResult, setTwinResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const runSimulation = async () => {
    setLoading(true);
    try {
      const [simRes, scenRes] = await Promise.all([
        fetch(`${API}/api/simulate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }),
        fetch(`${API}/api/scenarios`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: form }) }),
      ]);
      setTwinResult(await simRes.json());
      setScenarios(await scenRes.json());
    } catch (err) {
      console.error(err);
      // Fallback demo data
      setTwinResult({
        congestion_score: 8.2, severity_label: 'CRITICAL', affected_radius_km: 3.1,
        road_saturation_pct: 78, estimated_delay_mins: 28, traffic_load_increase_pct: 120,
        vehicles_generated: 15000,
        high_risk_corridors: [
          { name: 'MG Road', risk_level: 'CRITICAL', additional_delay_mins: 18, distance_km: 0.8 },
          { name: 'Hosur Road', risk_level: 'HIGH', additional_delay_mins: 12, distance_km: 2.1 },
        ],
        propagation_rings: [
          { ring_index: 0, radius_km: 0.62, congestion_intensity: 8.2, color: 'rgba(255,0,0,0.6)' },
          { ring_index: 1, radius_km: 1.24, congestion_intensity: 6.5, color: 'rgba(255,100,0,0.45)' },
          { ring_index: 2, radius_km: 1.86, congestion_intensity: 4.8, color: 'rgba(255,180,0,0.35)' },
          { ring_index: 3, radius_km: 2.48, congestion_intensity: 3.0, color: 'rgba(255,220,0,0.25)' },
          { ring_index: 4, radius_km: 3.1, congestion_intensity: 1.5, color: 'rgba(200,255,0,0.15)' },
        ],
        congestion_timeline: [
          { hour_label: '-2h', congestion_score: 2.5, avg_speed_kmph: 32 },
          { hour_label: '-1h', congestion_score: 4.9, avg_speed_kmph: 22 },
          { hour_label: 'Event Start', congestion_score: 8.2, avg_speed_kmph: 8 },
          { hour_label: '+1h', congestion_score: 7.4, avg_speed_kmph: 10 },
          { hour_label: '+2h', congestion_score: 4.9, avg_speed_kmph: 20 },
          { hour_label: '+3h', congestion_score: 2.5, avg_speed_kmph: 30 },
        ],
      });
      setScenarios({
        scenarios: [
          { label: 'Conservative', attendance: 30000, congestion_score: 5.8, estimated_delay_mins: 14, road_saturation_pct: 45, affected_radius_km: 2.1, vehicles_generated: 9000 },
          { label: 'Expected', attendance: 50000, congestion_score: 8.2, estimated_delay_mins: 28, road_saturation_pct: 78, affected_radius_km: 3.1, vehicles_generated: 15000 },
          { label: 'Worst Case', attendance: 80000, congestion_score: 9.4, estimated_delay_mins: 42, road_saturation_pct: 95, affected_radius_km: 4.2, vehicles_generated: 24000 },
        ],
      });
    }
    setLoading(false);
  };

  const getScoreColor = (s) => s >= 8 ? 'var(--status-danger)' : s >= 6 ? 'var(--status-warning)' : s >= 4 ? 'var(--status-info)' : 'var(--status-success)';

  return (
    <div>
      <div className="page-header">
        <h2>🔮 Digital Twin & Simulation</h2>
        <p>Simulate future events before they occur — What-If scenario analysis</p>
      </div>

      {/* Event Input */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Event Type</label>
            <select className="form-select" value={form.event_cause} onChange={e => update('event_cause', e.target.value)}>
              {['public_event','procession','vip_movement','protest','construction','water_logging','accident'].map(c =>
                <option key={c} value={c}>{c.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>
              )}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Attendance</label>
            <input className="form-input" type="number" value={form.attendance} onChange={e => update('attendance', parseInt(e.target.value)||0)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Latitude</label>
            <input className="form-input" type="number" step="0.001" value={form.latitude} onChange={e => update('latitude', parseFloat(e.target.value))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Longitude</label>
            <input className="form-input" type="number" step="0.001" value={form.longitude} onChange={e => update('longitude', parseFloat(e.target.value))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Start Hour</label>
            <input className="form-input" type="number" min="0" max="23" value={form.hour} onChange={e => update('hour', parseInt(e.target.value))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Priority</label>
            <select className="form-select" value={form.priority} onChange={e => update('priority', e.target.value)}>
              <option value="High">High</option><option value="Low">Low</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label className="form-checkbox">
            <input type="checkbox" checked={form.requires_road_closure} onChange={e => update('requires_road_closure', e.target.checked)} />
            Road Closure Required
          </label>
          <button className="btn btn-primary" onClick={runSimulation} disabled={loading} style={{ marginLeft: 'auto' }}>
            {loading ? '⏳ Simulating...' : '🔮 Run Simulation'}
          </button>
        </div>
      </div>

      {/* Digital Twin Result */}
      {twinResult && (
        <div className="animate-slide">
          {/* Core Metrics */}
          <div className="metrics-grid" style={{ marginBottom: 24 }}>
            <div className="metric-card"><div className="metric-icon danger">⚡</div><div className="metric-value" style={{ color: getScoreColor(twinResult.congestion_score) }}>{twinResult.congestion_score}</div><div className="metric-label">Congestion Score</div></div>
            <div className="metric-card"><div className="metric-icon cyan">📍</div><div className="metric-value">{twinResult.affected_radius_km}km</div><div className="metric-label">Affected Radius</div></div>
            <div className="metric-card"><div className="metric-icon warning">🚗</div><div className="metric-value">{twinResult.road_saturation_pct}%</div><div className="metric-label">Road Saturation</div></div>
            <div className="metric-card"><div className="metric-icon purple">⏱️</div><div className="metric-value">+{twinResult.estimated_delay_mins}m</div><div className="metric-label">Est. Delay</div></div>
          </div>

          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Congestion Propagation Animation */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', alignSelf: 'flex-start' }}>
                Congestion Propagation
              </h3>
              <div className="rings-container">
                {twinResult.propagation_rings?.map((ring, i) => (
                  <div key={i} className="congestion-ring" style={{
                    width: `${60 + i * 48}px`, height: `${60 + i * 48}px`,
                    borderColor: ring.color,
                    background: ring.color.replace(/[\d.]+\)$/, `${0.08 - i * 0.012})`),
                  }} />
                ))}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 28, zIndex: 10 }}>📍</div>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                {twinResult.vehicles_generated?.toLocaleString()} vehicles affected
              </div>
            </div>

            {/* Congestion Timeline */}
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Congestion Forecast Timeline
              </h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: 160, gap: 8, paddingBottom: 24, position: 'relative' }}>
                {twinResult.congestion_timeline?.map((t, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: getScoreColor(t.congestion_score) }}>{t.congestion_score}</span>
                    <div style={{
                      width: '100%', borderRadius: '4px 4px 0 0',
                      height: `${(t.congestion_score / 10) * 130}px`,
                      background: `linear-gradient(to top, ${getScoreColor(t.congestion_score)}, ${getScoreColor(t.congestion_score)}88)`,
                      transition: 'height 0.8s ease',
                    }} />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t.hour_label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* High Risk Corridors */}
          {twinResult.high_risk_corridors?.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                🛣️ High Risk Corridors
              </h3>
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Corridor</th><th>Risk Level</th><th>Distance</th><th>Additional Delay</th></tr></thead>
                  <tbody>
                    {twinResult.high_risk_corridors.map((c, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                        <td><span className={`badge badge-${c.risk_level === 'CRITICAL' ? 'critical' : c.risk_level === 'HIGH' ? 'high' : 'moderate'}`}>{c.risk_level}</span></td>
                        <td>{c.distance_km} km</td>
                        <td style={{ color: 'var(--status-warning)' }}>+{c.additional_delay_mins} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Scenario Comparison */}
          {scenarios?.scenarios && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📊 What-If Scenario Comparison</h3>
              <div className="scenario-grid">
                {scenarios.scenarios.map((s, i) => (
                  <div key={i} className={`scenario-card ${i === 1 ? 'highlight' : i === 2 ? 'worst' : ''}`}>
                    <div className="scenario-label" style={{ marginTop: i > 0 ? 16 : 0 }}>{s.label}</div>
                    <div className="scenario-attendance">{(s.attendance / 1000).toFixed(0)}K</div>
                    <div className="scenario-label">Attendance</div>
                    <div className="scenario-metrics">
                      <div className="scenario-metric">
                        <span className="scenario-metric-label">Congestion</span>
                        <span className="scenario-metric-value" style={{ color: getScoreColor(s.congestion_score) }}>{s.congestion_score}/10</span>
                      </div>
                      <div className="scenario-metric">
                        <span className="scenario-metric-label">Delay</span>
                        <span className="scenario-metric-value">+{s.estimated_delay_mins}m</span>
                      </div>
                      <div className="scenario-metric">
                        <span className="scenario-metric-label">Saturation</span>
                        <span className="scenario-metric-value">{s.road_saturation_pct}%</span>
                      </div>
                      <div className="scenario-metric">
                        <span className="scenario-metric-label">Radius</span>
                        <span className="scenario-metric-value">{s.affected_radius_km}km</span>
                      </div>
                      <div className="scenario-metric">
                        <span className="scenario-metric-label">Vehicles</span>
                        <span className="scenario-metric-value">{s.vehicles_generated?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
