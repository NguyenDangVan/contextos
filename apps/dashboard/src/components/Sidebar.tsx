'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Brain, MessageSquare, FileCode2,
  Bug, BarChart3, Settings, Zap
} from 'lucide-react';

const navItems = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Memory', href: '/memory', icon: Brain },
  { label: 'Sessions', href: '/sessions', icon: MessageSquare },
  { label: 'Prompts', href: '/prompts', icon: FileCode2 },
  { label: 'Debugger', href: '/debugger', icon: Bug },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-dot"><Zap size={18} /></div>
        <h1>ContextOS</h1>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Dashboard</div>
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{
        padding: '16px',
        background: 'rgba(124, 58, 237, 0.08)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(124, 58, 237, 0.2)',
        marginTop: 'auto',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>API Key</div>
        <code style={{ fontSize: '11px', color: 'var(--text-accent)', wordBreak: 'break-all' }}>
          ctx_demo...sprite
        </code>
      </div>
    </aside>
  );
}
