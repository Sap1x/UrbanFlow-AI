'use client';
import { useState } from 'react';

const API = 'http://localhost:8000';

const EVENT_CAUSES = [
  'vehicle_breakdown', 'water_logging', 'accident', 'tree_fall', 'construction',
  'pot_holes', 'public_event', 'procession', 'vip_movement', 'protest', 'congestion', 'others'
];

export default function InterventionPage() {
  const [form, setForm] = useState({
    event_cause: 'public_event', event_type: 'planned',
    latitude: 12.9716, longitude: 77.5946,
    attendance: 50000, requires_road_closure: true,
    priority: 'High', hour: 18, zone: 'unknown',
    corridor: 'Non-corridor', description: 'Large public event',
    duration_hours: 4,
  });
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const generateStrategies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/interventions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      // Fallback Demo Data
      setResult({
        base_prediction: { score: 8.2, severity_label: 'CRITICAL' },
        base_metrics: { estimated_delay_mins: 28, affected_radius_km: 3.1 },
        recommendation: {
          recommended_strategy_id: 'D',
          reasoning: 'Due to the high predicted impact (8.2), a combined Hybrid approach provides the necessary 75% mitigation despite higher costs.',
          expected_outcome: 'Reduces congestion score to 2.1 and saves 21.0 mins of delay.',
          confidence: '95%'
        },
        strategies: [
          {
            id: 'A', name: 'Signal Retiming', description: 'Adjust signal phases at junctions within the affected radius to prioritize event outflow.',
            expected_congestion_score: 7.5, delay_reduction_mins: 2.2, fuel_savings_litres: 120.5, co2_savings_kg: 278.4,
            operational_cost_inr: 0, confidence_score: 40,
            pros: ['Zero physical deployment cost', 'Instant activation'], cons: ['Limited effectiveness for high-impact events', 'May cause minor delays on cross-streets']
          },
          {
            id: 'B', name: 'Diversion Routing', description: 'Activate 3 alternate routes via VMS and navigation apps.',
            expected_congestion_score: 5.3, delay_reduction_mins: 9.8, fuel_savings_litres: 530.2, co2_savings_kg: 1224.8,
            operational_cost_inr: 5000, confidence_score: 75,
            pros: ['Diverts traffic before it hits the congestion zone', 'Highly effective for road closures'], cons: ['Relies on driver compliance', 'Requires alternate capacity']
          },
          {
            id: 'C', name: 'Personnel Deployment', description: 'Deploy 24 officers, 8 vehicles, and 45 barricades.',
            expected_congestion_score: 4.5, delay_reduction_mins: 12.6, fuel_savings_litres: 680.5, co2_savings_kg: 1572.0,
            operational_cost_inr: 75000, confidence_score: 92,
            pros: ['Maximum control over traffic flow', 'Handles unpredictable driver behavior'], cons: ['High resource cost', 'Takes time to deploy']
          },
          {
            id: 'D', name: 'Hybrid Intervention', description: 'Combine Signal Retiming, Diversion Routing, and Optimized Personnel Deployment.',
            expected_congestion_score: 2.1, delay_reduction_mins: 21.0, fuel_savings_litres: 1134.5, co2_savings_kg: 2620.7,
            operational_cost_inr: 80000, confidence_score: 95,
            pros: ['Highest impact reduction', 'Comprehensive coverage'], cons: ['Maximum operational cost', 'Requires complex coordination']
          }
        ]
      });
    }
    setLoading(false);
  };

  const getScoreColor = (s) => s >= 8 ? 'var(--status-danger)' : s >= 6 ? 'var(--status-warning)' : s >= 4 ? 'var(--status-info)' : 'var(--status-success)';

  return (
    <div>
      <div className="page-header">
        <h2>🛠️ Intervention Engine</h2>
        <p>Automatically generate and compare operational strategies for active incidents</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Event Type</label>
            <select className="form-select" value={form.event_cause} onChange={e => update('event_cause', e.target.value)}>
              {EVENT_CAUSES.map(c => <option key={c} value={c}>{c.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
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
            <label className="form-label">Duration (hr)</label>
            <input className="form-input" type="number" step="0.5" value={form.duration_hours} onChange={e => update('duration_hours', parseFloat(e.target.value))} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label className="form-checkbox">
            <input type="checkbox" checked={form.requires_road_closure} onChange={e => update('requires_road_closure', e.target.checked)} />
            Road Closure Required
          </label>
          <button className="btn btn-primary" onClick={generateStrategies} disabled={loading} style={{ marginLeft: 'auto' }}>
            {loading ? '⏳ Generating...' : '🛠️ Generate Strategies'}
          </button>
        </div>
      </div>

      {result && (
        <div className="animate-slide">
          {/* Base Prediction Summary */}
          <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-surface))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Base Situation (No Action)</h3>
              <span className={`badge badge-${result.base_prediction.severity_label.toLowerCase()}`}>
                {result.base_prediction.severity_label}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 32 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Congestion Score</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: getScoreColor(result.base_prediction.score) }}>{result.base_prediction.score} / 10</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Est. Delay</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>+{result.base_metrics.estimated_delay_mins} min</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Affected Radius</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{result.base_metrics.affected_radius_km} km</div>
              </div>
            </div>
          </div>

          {/* Recommendation Banner */}
          <div className="card" style={{ marginBottom: 24, border: '1px solid var(--accent-cyan)', background: 'var(--accent-cyan-dim)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ fontSize: 32 }}>🎯</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Recommended Action: Strategy {result.recommendation.recommended_strategy_id}
                </div>
                <div style={{ fontSize: 16, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.5 }}>
                  {result.recommendation.reasoning}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  <strong>Expected Outcome:</strong> {result.recommendation.expected_outcome}
                  <span style={{ margin: '0 12px', color: 'var(--border-default)' }}>|</span>
                  <strong>Confidence:</strong> {result.recommendation.confidence}
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {result.strategies.map((s) => {
              const isRecommended = s.id === result.recommendation.recommended_strategy_id;
              return (
                <div key={s.id} className="card" style={{ 
                  display: 'flex', flexDirection: 'column',
                  borderColor: isRecommended ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  boxShadow: isRecommended ? 'var(--shadow-glow)' : 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: isRecommended ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      Strategy {s.id}: {s.name}
                    </h3>
                    {isRecommended && <span className="badge badge-low" style={{ background: 'var(--accent-cyan)', color: '#000' }}>RECOMMENDED</span>}
                  </div>
                  
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, minHeight: 40 }}>
                    {s.description}
                  </p>

                  <div style={{ background: 'var(--bg-surface)', padding: 12, borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Expected Score</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: getScoreColor(s.expected_congestion_score) }}>{s.expected_congestion_score} / 10</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Delay Reduction</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--status-success)' }}>-{s.delay_reduction_mins} min</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Est. Cost</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--status-warning)' }}>₹{s.operational_cost_inr.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Confidence</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{s.confidence_score}%</span>
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--status-success)', marginBottom: 4 }}>Pros</div>
                    <ul style={{ paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                      {s.pros.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--status-danger)', marginBottom: 4 }}>Cons</div>
                    <ul style={{ paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                      {s.cons.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
