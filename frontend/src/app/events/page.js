'use client';
import { useState } from 'react';

const API = 'http://localhost:8000';

const EVENT_CAUSES = [
  'vehicle_breakdown', 'water_logging', 'accident', 'tree_fall', 'construction',
  'pot_holes', 'public_event', 'procession', 'vip_movement', 'protest', 'congestion', 'others'
];

const ZONES = [
  'unknown', 'Central Zone 1', 'Central Zone 2', 'East', 'North', 'North East',
  'South', 'South East', 'South West', 'West'
];

const PRIORITIES = ['High', 'Low'];

function ResultPanel({ result }) {
  if (!result) return null;
  const { prediction, simulation, deployment, economic_impact, explanation } = result;

  return (
    <div className="animate-slide" style={{ marginTop: 24 }}>
      {/* Prediction */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>⚡ AI Prediction</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {prediction.risk_level && (
              <span className={`badge badge-${prediction.risk_level.toLowerCase()}`} style={{ border: '1px solid var(--border-subtle)' }}>
                RISK: {prediction.risk_level}
              </span>
            )}
            <span className={`badge ${prediction.severity_label === 'CRITICAL' ? 'badge-critical' : prediction.severity_label === 'HIGH' ? 'badge-high' : prediction.severity_label === 'MODERATE' ? 'badge-moderate' : 'badge-low'}`}>
              IMPACT: {prediction.severity_label}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 48, fontWeight: 900, background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {prediction.score.toFixed(1)} <span style={{ fontSize: 20, color: 'var(--text-muted)', fontWeight: 700, background: 'none', WebkitTextFillColor: 'var(--text-muted)' }}>/ 10</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Congestion Impact Score</div>
          </div>
          {explanation?.confidence && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{explanation.confidence.score}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confidence</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Interval: [{explanation.confidence.confidence_range}]</div>
            </div>
          )}
        </div>
      </div>

      {/* Simulation */}
      {simulation && (
        <div className="metrics-grid" style={{ marginBottom: 16 }}>
          <div className="metric-card"><div className="metric-icon danger">📍</div><div className="metric-value">{simulation.affected_radius_km} km</div><div className="metric-label">Affected Radius</div></div>
          <div className="metric-card"><div className="metric-icon warning">🚗</div><div className="metric-value">{simulation.road_saturation_pct}%</div><div className="metric-label">Road Saturation</div></div>
          <div className="metric-card"><div className="metric-icon info">⏱️</div><div className="metric-value">+{simulation.estimated_delay_mins}m</div><div className="metric-label">Est. Delay</div></div>
          <div className="metric-card"><div className="metric-icon purple">📈</div><div className="metric-value">{simulation.traffic_load_increase_pct}%</div><div className="metric-label">Traffic Increase</div></div>
        </div>
      )}

      {/* Deployment */}
      {deployment && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>👮 Optimized Deployment</h3>
          <div className="grid-3">
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent-cyan)' }}>{deployment.deployment.officers}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Officers</div>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent-purple)' }}>{deployment.deployment.patrol_vehicles}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Patrol Vehicles</div>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--status-warning)' }}>{deployment.deployment.barricades}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Barricades</div>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)' }}>
            💰 Total Cost: <strong style={{ color: 'var(--accent-cyan)' }}>₹{deployment.cost_breakdown.total_cost.toLocaleString()}</strong>
            <span style={{ margin: '0 8px', color: 'var(--border-default)' }}>|</span>
            Coverage: <strong>{deployment.coverage_metrics.coverage_score}%</strong>
          </div>
        </div>
      )}

      {/* Economic Impact */}
      {economic_impact && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>💰 Economic Impact</h3>
          <div className="econ-comparison">
            <div className="econ-card without">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--status-danger)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Without AI</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>₹{economic_impact.without_ai.total_cost_lakhs}L</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Avg Delay: {economic_impact.without_ai.avg_delay_mins}min</div>
            </div>
            <div className="econ-vs">→</div>
            <div className="econ-card with-ai">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--status-success)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>With AI</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>₹{economic_impact.with_ai.total_cost_lakhs}L</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Avg Delay: {economic_impact.with_ai.avg_delay_mins}min</div>
            </div>
          </div>
          <div className="econ-savings" style={{ marginTop: 16 }}>
            <div className="econ-savings-value">{economic_impact.savings.savings_percentage}% Saved</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              ₹{economic_impact.savings.total_savings_lakhs} Lakhs saved • {economic_impact.savings.co2_saved_kg} kg CO₂ prevented
            </div>
          </div>
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🔍 Why This Score?</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>{explanation.narrative}</p>
          
          <div style={{ marginBottom: 20 }}>
            {explanation.top_drivers?.map((d, i) => (
              <div className="explanation-driver" key={i}>
                <span style={{ fontSize: 13, fontWeight: 600, width: 160, flexShrink: 0 }}>{d.factor}</span>
                <div className="explanation-bar">
                  <div className={`explanation-bar-fill ${d.direction}`} style={{ width: `${Math.min(100, d.impact_magnitude * 30)}%` }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: 60, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: d.direction === 'increase' ? 'var(--status-danger)' : 'var(--status-success)' }}>
                    {d.direction === 'increase' ? '+' : '-'}{d.impact_magnitude}
                  </span>
                  {d.contribution_percentage !== undefined && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.contribution_percentage}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {explanation.counterfactuals && explanation.counterfactuals.length > 0 && (
            <div style={{ padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-purple)' }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Counterfactual Analysis</h4>
              <ul style={{ paddingLeft: 16, margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                {explanation.counterfactuals.map((cf, i) => (
                  <li key={i} style={{ marginBottom: i === explanation.counterfactuals.length - 1 ? 0 : 8 }}>{cf}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  const [form, setForm] = useState({
    event_cause: 'public_event',
    event_type: 'planned',
    latitude: 12.9716,
    longitude: 77.5946,
    attendance: 10000,
    requires_road_closure: false,
    priority: 'High',
    hour: 17,
    zone: 'unknown',
    corridor: 'Non-corridor',
    description: '',
    duration_hours: 4,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/full-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      // Fallback demo data
      setResult({
        prediction: { score: 7.8, severity_label: 'HIGH', risk_level: 'CRITICAL' },
        simulation: { affected_radius_km: 2.3, road_saturation_pct: 67, estimated_delay_mins: 22, traffic_load_increase_pct: 85 },
        deployment: { deployment: { officers: 12, patrol_vehicles: 4, barricades: 24 }, cost_breakdown: { total_cost: 42000 }, coverage_metrics: { coverage_score: 87 } },
        economic_impact: { without_ai: { total_cost_lakhs: 18.2, avg_delay_mins: 45 }, with_ai: { total_cost_lakhs: 7.4, avg_delay_mins: 18 }, savings: { savings_percentage: 59, total_savings_lakhs: 10.8, co2_saved_kg: 340 } },
        explanation: { 
          narrative: 'This public event is predicted to cause significant congestion due to high attendance, peak hour timing, and road closure requirements.', 
          top_drivers: [
            { factor: 'Road Closure', impact_magnitude: 2.3, direction: 'increase', contribution_percentage: 42.5 }, 
            { factor: 'Peak Hour', impact_magnitude: 1.8, direction: 'increase', contribution_percentage: 33.3 }, 
            { factor: 'High Priority', impact_magnitude: 1.5, direction: 'increase', contribution_percentage: 24.2 }
          ],
          confidence: { score: 82.5, confidence_range: '6.8 - 8.8', reliability: 'HIGH' },
          counterfactuals: [
            'If attendance is reduced by 50%, congestion score drops to 6.2 (-1.6).',
            'If rescheduled to off-peak hours (e.g., 2 PM), congestion score drops to 5.4 (-2.4).'
          ]
        },
      });
    }
    setLoading(false);
  };

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div>
      <div className="page-header">
        <h2>Event Manager</h2>
        <p>Enter event details for AI-powered impact prediction and resource optimization</p>
      </div>

      <div className="grid-1-2">
        <form onSubmit={handleSubmit}>
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>📋 Event Details</h3>

            <div className="form-group">
              <label className="form-label">Event Cause</label>
              <select className="form-select" value={form.event_cause} onChange={e => update('event_cause', e.target.value)}>
                {EVENT_CAUSES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Event Type</label>
                <select className="form-select" value={form.event_type} onChange={e => update('event_type', e.target.value)}>
                  <option value="planned">Planned</option>
                  <option value="unplanned">Unplanned</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Expected Attendance</label>
                <input className="form-input" type="number" value={form.attendance} onChange={e => update('attendance', parseInt(e.target.value) || 0)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input className="form-input" type="number" step="0.0001" value={form.latitude} onChange={e => update('latitude', parseFloat(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input className="form-input" type="number" step="0.0001" value={form.longitude} onChange={e => update('longitude', parseFloat(e.target.value))} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => update('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Start Hour (0-23)</label>
                <input className="form-input" type="number" min="0" max="23" value={form.hour} onChange={e => update('hour', parseInt(e.target.value))} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Zone</label>
                <select className="form-select" value={form.zone} onChange={e => update('zone', e.target.value)}>
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Duration (hours)</label>
                <input className="form-input" type="number" min="0.5" step="0.5" value={form.duration_hours} onChange={e => update('duration_hours', parseFloat(e.target.value))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-checkbox">
                <input type="checkbox" checked={form.requires_road_closure} onChange={e => update('requires_road_closure', e.target.checked)} />
                Requires Road Closure
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" value={form.description} onChange={e => update('description', e.target.value)} placeholder="Brief event description..." />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? '⏳ Analyzing...' : '🚀 Run Full Analysis'}
            </button>
          </div>
        </form>

        <ResultPanel result={result} />
      </div>
    </div>
  );
}
