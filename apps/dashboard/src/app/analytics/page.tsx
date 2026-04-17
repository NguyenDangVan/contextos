'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BarChart3, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#7c3aed', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

export default function AnalyticsPage() {
  const [usage, setUsage] = useState<any>(null);
  const [costs, setCosts] = useState<any>(null);

  const now = new Date();
  const [from] = useState(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [to] = useState(now.toISOString().split('T')[0]);

  useEffect(() => {
    api.getUsage(from, to).then(setUsage).catch(console.error);
    api.getCosts(from, to).then(setCosts).catch(console.error);
  }, [from, to]);

  const chartData = usage?.usage?.map((d: any) => ({
    date: d.date?.slice(5) || '',
    tokens: Number(d.total_tokens || 0) / 1000,
    calls: Number(d.total_calls || 0),
  })) || [];

  const pieData = costs?.byModel?.map((m: any) => ({
    name: m.model,
    value: m.cost,
  })) || [];

  const exportCSV = () => {
    if (!costs?.byModel) return;
    const csv = ['Model,Tokens,Calls,Cost USD',
      ...costs.byModel.map((m: any) => `${m.model},${m.tokens},${m.calls},${m.cost.toFixed(4)}`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'contextos-costs.csv'; a.click();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Analytics</h2>
          <p>Token usage, costs, and performance metrics</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">Total Cost</div>
          <div className="stat-value">${(costs?.total || 0).toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Models Used</div>
          <div className="stat-value">{costs?.byModel?.length || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Period</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{from} → {to}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="chart-container">
          <h3>Daily Usage (tokens in K)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
              <Bar dataKey="tokens" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Cost by Model</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {pieData.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Cost Breakdown</h3>
        <table className="data-table">
          <thead><tr><th>Model</th><th>Tokens</th><th>Calls</th><th>Cost (USD)</th></tr></thead>
          <tbody>
            {costs?.byModel?.map((m: any) => (
              <tr key={m.model}>
                <td><span className="badge badge-purple">{m.model}</span></td>
                <td>{Number(m.tokens).toLocaleString()}</td>
                <td>{Number(m.calls).toLocaleString()}</td>
                <td>${Number(m.cost).toFixed(4)}</td>
              </tr>
            ))}
            {(!costs?.byModel || costs.byModel.length === 0) && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
