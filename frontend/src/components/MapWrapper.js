"use client";
import dynamic from 'next/dynamic';

const GISOperationsMap = dynamic(
  () => import('./GISOperationsMap'),
  { 
    ssr: false, 
    loading: () => (
      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#020408', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
        Initializing GIS Subsystems...
      </div>
    )
  }
);

export default function MapWrapper({ data }) {
  return <GISOperationsMap data={data} />;
}
