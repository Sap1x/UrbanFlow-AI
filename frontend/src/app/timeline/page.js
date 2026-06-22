'use client';
import { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:8000';

export default function TimelinePage() {
  const [form, setForm] = useState({
    event_cause: 'public_event',
    attendance: 15000,
    latitude: 12.9716, longitude: 77.5946,
    duration_hours: 4.0,
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const playIntervalRef = useRef(null);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      setData(result);
      setFrameIndex(0);
      setIsPlaying(false);
    } catch (err) {
      console.error(err);
      // Demo Data Fallback
      setTimeout(() => {
        const dummyFrames = [];
        for(let i=0; i<=20; i++) {
          const t = -60 + i*15;
          let score = 2.0;
          let status = 'BUILD_UP';
          if(t > 0 && t <= 240) { score = 2.0 + Math.sin((t/240)*Math.PI)*6.5; status = 'ACTIVE'; }
          else if(t > 240) { score = Math.max(2.0, 8.5 - ((t-240)/60)*6.5); status = 'RECOVERY'; }
          
          dummyFrames.push({
            time_offset_mins: t,
            status,
            metrics: {
              congestion_score: score,
              affected_radius_km: score * 0.4,
              avg_speed_kmh: Math.max(5, 40 - (score*3.5)),
              estimated_delay_mins: score * 4.5
            },
            heatmap: Array.from({length: Math.floor(score*8)}).map(() => ({
              lat: 12.97 + (Math.random()-0.5)*0.06,
              lng: 77.59 + (Math.random()-0.5)*0.06,
              intensity: Math.random() * (score/10)
            }))
          });
        }
        setData({ frames: dummyFrames, peak_metrics: { max_score: 8.5, max_radius: 3.4, total_duration_mins: 240 } });
        setFrameIndex(0);
        setIsPlaying(false);
        setLoading(false);
      }, 800);
      return;
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isPlaying && data) {
      playIntervalRef.current = setInterval(() => {
        setFrameIndex(prev => {
          if (prev >= data.frames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 600); // 600ms per frame
    } else if (!isPlaying && playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    return () => clearInterval(playIntervalRef.current);
  }, [isPlaying, data]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const getScoreColor = (s) => s >= 8 ? 'var(--status-danger)' : s >= 6 ? 'var(--status-warning)' : s >= 4 ? 'var(--status-info)' : 'var(--status-success)';

  const formatTimeOffset = (mins) => {
    if (mins < 0) return `T${mins}m`;
    if (mins === 0) return 'T-0 (Event Start)';
    return `T+${mins}m`;
  };

  return (
    <div>
      <div className="page-header">
        <h2>⏪ Event Timeline Replay</h2>
        <p>Scrub through simulated event lifecycles from build-up to recovery</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Event Type</label>
            <select className="form-select" value={form.event_cause} onChange={e => setForm({...form, event_cause: e.target.value})}>
              <option value="public_event">Public Event</option>
              <option value="vip_movement">VIP Movement</option>
              <option value="construction">Construction</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Est. Attendance</label>
            <input className="form-input" type="number" value={form.attendance} onChange={e => setForm({...form, attendance: parseInt(e.target.value)})} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Duration (Hours)</label>
            <input className="form-input" type="number" step="0.5" value={form.duration_hours} onChange={e => setForm({...form, duration_hours: parseFloat(e.target.value)})} />
          </div>
          <button className="btn btn-primary" onClick={runSimulation} disabled={loading} style={{ height: 42 }}>
            {loading ? '⏳ Generating...' : '🔄 Generate Timeline'}
          </button>
        </div>
      </div>

      {data && data.frames && (
        <div className="animate-slide">
          
          <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
            {/* Visual Map Simulator */}
            <div style={{ width: '100%', height: 350, background: '#020408', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ background: 'rgba(0,0,0,0.8)', padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Time</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{formatTimeOffset(data.frames[frameIndex].time_offset_mins)}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.8)', padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Phase</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: data.frames[frameIndex].status === 'ACTIVE' ? 'var(--status-danger)' : 'var(--status-warning)' }}>{data.frames[frameIndex].status.replace('_', ' ')}</div>
                </div>
              </div>

              {/* Grid Lines */}
              <svg width="100%" height="100%" style={{ position: 'absolute', opacity: 0.15 }}>
                <pattern id="grid-bg" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="var(--accent-cyan)" strokeWidth="0.5" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid-bg)" />
                <circle cx="50%" cy="50%" r="100" fill="none" stroke="var(--accent-cyan)" strokeWidth="0.5" strokeDasharray="4,4" />
                <circle cx="50%" cy="50%" r="200" fill="none" stroke="var(--accent-cyan)" strokeWidth="0.5" strokeDasharray="4,4" />
              </svg>

              {/* Heat Points */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 400, height: 400, position: 'relative' }}>
                  {data.frames[frameIndex].heatmap && data.frames[frameIndex].heatmap.map((p, i) => (
                    <div key={i} style={{
                      position: 'absolute',
                      left: `${((p.lng - 77.53) / 0.12) * 100}%`,
                      top: `${((13.03 - p.lat) / 0.12) * 100}%`,
                      width: Math.max(15, p.intensity * 40),
                      height: Math.max(15, p.intensity * 40),
                      background: `radial-gradient(circle, ${getScoreColor(data.frames[frameIndex].metrics.congestion_score)} 0%, transparent 70%)`,
                      borderRadius: '50%',
                      opacity: p.intensity,
                      transform: 'translate(-50%, -50%)',
                      mixBlendMode: 'screen',
                      transition: 'all 0.6s ease'
                    }} />
                  ))}
                  
                  {/* Event Epicenter */}
                  <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 12, height: 12, background: '#fff', borderRadius: '50%', boxShadow: '0 0 15px #fff', zIndex: 10 }}>
                    <div className="congestion-ring" style={{ borderColor: '#fff', animationDuration: '2s' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 1, background: 'var(--border-subtle)', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ padding: 16, background: 'var(--bg-surface)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Congestion Score</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: getScoreColor(data.frames[frameIndex].metrics.congestion_score) }}>{data.frames[frameIndex].metrics.congestion_score.toFixed(1)}</div>
              </div>
              <div style={{ padding: 16, background: 'var(--bg-surface)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Affected Radius</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{data.frames[frameIndex].metrics.affected_radius_km.toFixed(1)}<span style={{ fontSize: 14, color: 'var(--text-muted)', marginLeft: 4 }}>km</span></div>
              </div>
              <div style={{ padding: 16, background: 'var(--bg-surface)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Speed</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{data.frames[frameIndex].metrics.avg_speed_kmh.toFixed(1)}<span style={{ fontSize: 14, color: 'var(--text-muted)', marginLeft: 4 }}>km/h</span></div>
              </div>
              <div style={{ padding: 16, background: 'var(--bg-surface)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Delay</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--status-warning)' }}>{data.frames[frameIndex].metrics.estimated_delay_mins.toFixed(0)}<span style={{ fontSize: 14, color: 'var(--text-muted)', marginLeft: 4 }}>m</span></div>
              </div>
            </div>

            {/* Scrub Controls */}
            <div style={{ padding: 24, background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <button 
                  onClick={togglePlay}
                  style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--accent-cyan)', color: '#000', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}
                >
                  {isPlaying ? '⏸' : '▶️'}
                </button>
                
                <div style={{ flex: 1 }}>
                  <input 
                    type="range" 
                    min={0} 
                    max={data.frames.length - 1} 
                    value={frameIndex} 
                    onChange={e => { setFrameIndex(parseInt(e.target.value)); setIsPlaying(false); }}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    {data.frames.map((f, i) => {
                      // Only show labels for some ticks
                      if (i % 4 !== 0 && i !== data.frames.length - 1) return <div key={i} />;
                      return (
                        <div key={i} style={{ fontSize: 10, color: i === frameIndex ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: i === frameIndex ? 800 : 400 }}>
                          {formatTimeOffset(f.time_offset_mins)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
