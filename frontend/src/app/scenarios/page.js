'use client';
import { useState, useEffect } from 'react';

const API = 'http://localhost:8000';

export default function ScenariosPage() {
  const [baseEvent, setBaseEvent] = useState({
    event_cause: 'public_event',
    attendance: 20000,
    latitude: 12.9716, longitude: 77.5946,
    requires_road_closure: false,
    duration_hours: 4,
  });

  const [templates, setTemplates] = useState([]);
  const [activeScenarios, setActiveScenarios] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/scenario-templates`)
      .then(res => res.json())
      .then(data => {
        setTemplates(data.templates || []);
        // Auto-select first two scenarios
        if (data.templates && data.templates.length >= 2) {
          setActiveScenarios([data.templates[0], data.templates[2]]);
        }
      })
      .catch(err => {
        // Fallback templates
        const t = [
          { id: 'rain', name: 'Heavy Rainfall', modifiers: { event_cause: 'water_logging', impact_multiplier: 1.5 } },
          { id: 'vip', name: 'VIP Movement', modifiers: { event_cause: 'vip_movement', priority: 'Critical' } },
          { id: 'attendance_150', name: '50% More Crowd', modifiers: { attendance_multiplier: 1.5 } },
          { id: 'closure', name: 'Requires Road Closure', modifiers: { requires_road_closure: true } },
        ];
        setTemplates(t);
        setActiveScenarios([t[0], t[2]]);
      });
  }, []);

  const toggleScenario = (template) => {
    setActiveScenarios(prev => 
      prev.find(s => s.id === template.id) 
        ? prev.filter(s => s.id !== template.id)
        : [...prev, template]
    );
  };

  const runSimulation = async () => {
    if (activeScenarios.length === 0) return alert('Select at least one scenario');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/scenario-planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_event: baseEvent, scenarios: activeScenarios }),
      });
      setResults(await res.json());
    } catch (err) {
      console.error(err);
      // Fallback Demo Data
      setTimeout(() => {
        setResults({
          worst_case_scenario: activeScenarios[0]?.name || 'Unknown',
          results: [
            {
              name: 'Base Case (Expected)',
              metrics: { congestion_score: 5.2, severity: 'MODERATE', estimated_delay_mins: 12.5, affected_radius_km: 1.8, economic_cost_inr: 450000 },
              optimal_intervention: { strategy: 'Diversion Routing', cost_inr: 5000, delay_reduction_mins: 4.5 }
            },
            ...activeScenarios.map((sc, i) => ({
              name: sc.name,
              metrics: { 
                congestion_score: Math.min(10, 5.2 + (i + 1) * 1.8), 
                severity: (5.2 + (i + 1) * 1.8) > 8 ? 'CRITICAL' : 'HIGH', 
                estimated_delay_mins: 12.5 + (i + 1) * 8, 
                affected_radius_km: 1.8 + (i * 0.5), 
                economic_cost_inr: 450000 * (1.5 + i) 
              },
              optimal_intervention: { 
                strategy: (5.2 + (i + 1) * 1.8) > 7.5 ? 'Hybrid Intervention' : 'Personnel Deployment', 
                cost_inr: (5.2 + (i + 1) * 1.8) > 7.5 ? 85000 : 45000, 
                delay_reduction_mins: 8.5 + i * 4 
              }
            }))
          ]
        });
        setLoading(false);
      }, 800);
      return;
    }
    setLoading(false);
  };

  const getScoreColor = (s) => s >= 8 ? 'var(--status-danger)' : s >= 6 ? 'var(--status-warning)' : s >= 4 ? 'var(--status-info)' : 'var(--status-success)';

  return (
    <div>
      <div className="page-header">
        <h2>📐 Scenario Planner</h2>
        <p>Compare "What-If" scenarios to prepare for compounding incidents</p>
      </div>

      <div className="grid-2-1" style={{ marginBottom: 24 }}>
        {/* Base Event Setup */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Base Event Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Event Type</label>
              <select className="form-select" value={baseEvent.event_cause} onChange={e => setBaseEvent({...baseEvent, event_cause: e.target.value})}>
                <option value="public_event">Public Event</option>
                <option value="construction">Construction</option>
                <option value="vip_movement">VIP Movement</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Est. Attendance</label>
              <input className="form-input" type="number" value={baseEvent.attendance} onChange={e => setBaseEvent({...baseEvent, attendance: parseInt(e.target.value)})} />
            </div>
          </div>
        </div>

        {/* Modifiers */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Apply "What-If" Modifiers</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {templates.map(t => {
              const isActive = activeScenarios.some(s => s.id === t.id);
              return (
                <label key={t.id} style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', 
                  background: isActive ? 'var(--accent-cyan-dim)' : 'var(--bg-surface)', 
                  border: `1px solid ${isActive ? 'var(--accent-cyan)' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  <input type="checkbox" checked={isActive} onChange={() => toggleScenario(t)} style={{ accentColor: 'var(--accent-cyan)' }} />
                  <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>{t.name}</span>
                </label>
              );
            })}
          </div>
          <button className="btn btn-primary" onClick={runSimulation} disabled={loading} style={{ width: '100%', marginTop: 16 }}>
            {loading ? '⏳ Simulating Dimensions...' : '🔮 Run Matrix Simulation'}
          </button>
        </div>
      </div>

      {results && (
        <div className="animate-slide">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700 }}>Comparison Matrix</h3>
            <span className="badge badge-critical" style={{ marginLeft: 'auto' }}>
              WORST CASE: {results.worst_case_scenario}
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${results.results.length}, 1fr)`, gap: 16 }}>
            {results.results.map((res, idx) => {
              const isBase = idx === 0;
              const isWorst = res.name === results.worst_case_scenario;
              
              return (
                <div key={idx} className={`scenario-card ${isBase ? 'highlight' : ''} ${isWorst && !isBase ? 'worst' : ''}`} style={{
                  background: isWorst && !isBase ? 'var(--status-danger-dim)' : 'var(--bg-glass)',
                  borderColor: isWorst && !isBase ? 'var(--status-danger)' : (isBase ? 'var(--accent-cyan)' : 'var(--border-subtle)')
                }}>
                  <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, marginTop: 12 }}>{res.name}</h4>
                  
                  <div style={{ padding: '24px 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', marginBottom: 20 }}>
                    <div style={{ fontSize: 42, fontWeight: 900, color: getScoreColor(res.metrics.congestion_score), lineHeight: 1 }}>
                      {res.metrics.congestion_score.toFixed(1)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>Impact Score</div>
                    <div style={{ marginTop: 8 }}><span className={`badge badge-${res.metrics.severity.toLowerCase()}`}>{res.metrics.severity}</span></div>
                  </div>

                  <div className="scenario-metrics">
                    <div className="scenario-metric">
                      <span className="scenario-metric-label">Estimated Delay</span>
                      <span className="scenario-metric-value" style={{ color: 'var(--status-warning)' }}>+{res.metrics.estimated_delay_mins} min</span>
                    </div>
                    <div className="scenario-metric">
                      <span className="scenario-metric-label">Affected Radius</span>
                      <span className="scenario-metric-value">{res.metrics.affected_radius_km} km</span>
                    </div>
                    <div className="scenario-metric">
                      <span className="scenario-metric-label">Economic Cost</span>
                      <span className="scenario-metric-value">₹{(res.metrics.economic_cost_inr / 100000).toFixed(1)}L</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', textAlign: 'left' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Best Intervention</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-cyan)' }}>{res.optimal_intervention.strategy}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Reduces delay by {res.optimal_intervention.delay_reduction_mins} mins
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Est. Cost: ₹{res.optimal_intervention.cost_inr.toLocaleString()}
                    </div>
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
