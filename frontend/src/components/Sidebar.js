'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'OPERATIONS', items: [
    { href: '/command-center', icon: '🎛️', label: 'Command Center' },
    { href: '/', icon: '⬡', label: 'Dashboard' },
    { href: '/events', icon: '📋', label: 'Event Manager' },
    { href: '/intervention', icon: '🛠️', label: 'Intervention Engine' },
    { href: '/simulation', icon: '🔮', label: 'Digital Twin' },
  ]},
  { label: 'INTELLIGENCE', items: [
    { href: '/scenarios', icon: '📐', label: 'Scenario Planner' },
    { href: '/before-after', icon: '⚖️', label: 'Before vs After' },
    { href: '/timeline', icon: '⏪', label: 'Timeline Replay' },
    { href: '/analytics', icon: '📊', label: 'Analytics' },
    { href: '/copilot', icon: '🤖', label: 'Traffic GPT' },
  ]},
  { label: 'SYSTEM', items: [
    { href: '/map', icon: '🗺️', label: 'Live Map' },
  ]}
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🚦</div>
          <div className="sidebar-brand-text">
            <h1>UrbanFlow</h1>
            <span>Command Center</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-status">
        <div>
          <span className="sidebar-status-dot"></span>
          <span className="sidebar-status-text" style={{ fontWeight: 600, color: 'var(--status-success)' }}>
            System Online
          </span>
        </div>
        <div className="sidebar-status-text" style={{ marginTop: 6 }}>
          ML Engine: Active<br />
          Model MAE: 0.98
        </div>
      </div>
    </aside>
  );
}
