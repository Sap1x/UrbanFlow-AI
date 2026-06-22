'use client';
import { useState, useEffect } from 'react';

const API = 'http://localhost:8000';

function RiskGauge({ score, label }) {
  const pct = Math.min(100, (score / 10) * 100);
  const color = score >= 8 ? '#FF1744' : score >= 6 ? '#FFD600' : score >= 4 ? '#40C4FF' : '#00E676';
  const angle = -90 + (pct / 100) * 180;

  return (
    <div className="risk-gauge-container">
      <div className="risk-gauge">
        <svg viewBox="0 0 180 100">
          <path d="M 10 90 A 80 80 0 0 1 170 90" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="12" strokeLinecap="round" />
          <path d="M 10 90 A 80 80 0 0 1 170 90" fill="none" stroke={`url(#gaugeGrad)`} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${pct * 2.51} 251`}
            style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.4,0,0.2,1)' }} />
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00E676" />
              <stop offset="50%" stopColor="#FFD600" />
              <stop offset="100%" stopColor="#FF1744" />
            </linearGradient>
          </defs>
        </svg>
        <div className="risk-gauge-value" style={{ color }}>{score.toFixed(1)}</div>
      </div>
      <div className="risk-gauge-label" style={{ color }}>{label}</div>
    </div>
  );
}

function MetricCard({ icon, iconClass, value, label, trend, trendDir }) {
  return (
    <div className="metric-card animate-slide">
      <div className={`metric-icon ${iconClass}`}>{icon}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      {trend && (
        <div className={`metric-trend ${trendDir}`}>
          {trendDir === 'up' ? '↑' : '↓'} {trend}
        </div>
      )}
    </div>
  );
}

function IncidentFeed({ events }) {
  const getSeverityBadge = (score) => {
    if (score >= 8) return <span className="badge badge-critical">CRITICAL</span>;
    if (score >= 6) return <span className="badge badge-high">HIGH</span>;
    if (score >= 4) return <span className="badge badge-moderate">MODERATE</span>;
    return <span className="badge badge-low">LOW</span>;
  };

  return (
    <div className="card" style={{ maxHeight: 400, overflowY: 'auto' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Recent Incidents
      </h3>
      {events.slice(0, 8).map((evt, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {(evt.event_cause || '').replace(/_/g, ' ').toUpperCase()}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              {evt.zone || 'Unknown Zone'} • {evt.corridor || 'N/A'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>{evt.impact_score}</span>
            {getSeverityBadge(evt.impact_score)}
          </div>
        </div>
      ))}
    </div>
  );
}

function HourlyChart({ data }) {
  if (!data) return null;
  const maxVal = Math.max(...Object.values(data), 1);

  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Incident Distribution (24h)
      </h3>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 120, gap: 3 }}>
        {Array.from({ length: 24 }, (_, h) => {
          const val = data[String(h)] || 0;
          const height = (val / maxVal) * 100;
          const isPeak = (h >= 8 && h <= 11) || (h >= 17 && h <= 20);
          return (
            <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: '100%',
                  height: `${height}%`,
                  minHeight: 2,
                  background: isPeak ? 'linear-gradient(to top, var(--accent-cyan), var(--accent-purple))' : 'var(--border-default)',
                  borderRadius: '2px 2px 0 0',
                  transition: 'height 0.5s ease',
                }}
                title={`${h}:00 — ${val} events`}
              />
              {h % 4 === 0 && (
                <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{h}h</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopCauses({ causes }) {
  if (!causes) return null;
  const total = Object.values(causes).reduce((a, b) => a + b, 0);
  const colors = ['var(--accent-cyan)', 'var(--accent-purple)', 'var(--status-warning)', 'var(--status-info)', 'var(--status-success)'];

  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Top Incident Causes
      </h3>
      {Object.entries(causes).map(([cause, count], i) => (
        <div key={cause} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500 }}>
              {cause.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2 }}>
            <div style={{
              height: '100%',
              width: `${(count / total) * 100}%`,
              background: colors[i % colors.length],
              borderRadius: 2,
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, eventsRes] = await Promise.all([
          fetch(`${API}/api/dashboard-stats`),
          fetch(`${API}/api/events?limit=20`),
        ]);
        const statsData = await statsRes.json();
        const eventsData = await eventsRes.json();
        setStats(statsData);
        setEvents(eventsData.events || []);
      } catch (err) {
        console.error('API error:', err);
        // Fallback data for demo
        setStats({
          total_events: 8204,
          average_impact_score: 4.32,
          high_impact_events: 1247,
          road_closure_events: 676,
          top_causes: { vehicle_breakdown: 4896, others: 638, pot_holes: 537, construction: 480, water_logging: 458 },
          hourly_distribution: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [String(i), Math.floor(Math.random() * 400 + 100)])),
          model_mae: 0.98,
          model_rmse: 1.32,
        });
        setEvents([
          { event_cause: 'water_logging', zone: 'Central Zone 2', corridor: 'MG Road', impact_score: 8.7 },
          { event_cause: 'vehicle_breakdown', zone: 'East', corridor: 'ORR East 1', impact_score: 5.2 },
          { event_cause: 'accident', zone: 'South East', corridor: 'Hosur Road', impact_score: 7.9 },
          { event_cause: 'construction', zone: 'North', corridor: 'Bellary Road', impact_score: 6.1 },
          { event_cause: 'tree_fall', zone: 'West', corridor: 'Non-corridor', impact_score: 3.4 },
        ]);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="loading-overlay" style={{ position: 'relative', background: 'transparent', minHeight: '80vh' }}>
        <div className="spinner"></div>
        <div className="loading-text">Initializing Command Center...</div>
      </div>
    );
  }

  const avgImpact = stats?.average_impact_score || 4.3;
  const riskLabel = avgImpact >= 7 ? 'HIGH ALERT' : avgImpact >= 4 ? 'ELEVATED' : 'NORMAL';

  return (
    <div>
      <div className="page-header">
        <h2>Command Center</h2>
        <p>Real-time traffic intelligence overview — Bengaluru Metropolitan Area</p>
      </div>

      {/* Top Metrics */}
      <div className="metrics-grid">
        <MetricCard icon="📡" iconClass="cyan" value={stats?.total_events?.toLocaleString() || '—'} label="Total Events" trend="Real-time" trendDir="up" />
        <MetricCard icon="⚠️" iconClass="danger" value={stats?.high_impact_events?.toLocaleString() || '—'} label="High Impact Events" trend={`${((stats?.high_impact_events / stats?.total_events) * 100).toFixed(1)}%`} trendDir="down" />
        <MetricCard icon="🚧" iconClass="warning" value={stats?.road_closure_events?.toLocaleString() || '—'} label="Road Closures" />
        <MetricCard icon="🎯" iconClass="success" value={stats?.model_mae || '—'} label="Model MAE" trend="±0.98 accuracy" trendDir="up" />
      </div>

      {/* Risk Gauge + Charts */}
      <div className="grid-2-1" style={{ marginBottom: 24 }}>
        <div className="grid-2">
          <HourlyChart data={stats?.hourly_distribution} />
          <TopCauses causes={stats?.top_causes} />
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            City Risk Level
          </h3>
          <RiskGauge score={avgImpact} label={riskLabel} />
          <div style={{ marginTop: 12, padding: '8px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)' }}>
            Avg. Impact: {avgImpact.toFixed(2)} / 10.0
          </div>
        </div>
      </div>

      {/* Incident Feed */}
      <IncidentFeed events={events} />
    </div>
  );
}
