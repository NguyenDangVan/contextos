'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { BarChart3, Brain, MessageSquare, DollarSign, Zap, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function OverviewPage() {
  const router = useRouter();
  const [usage, setUsage] = useState<any>(null);
  const [costs, setCosts] = useState<any>(null);
  const [calls, setCalls] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCalls, setLoadingCalls] = useState(true);

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = now.toISOString().split('T')[0];

    Promise.all([
      api.getUsage(from, to).catch(() => ({ usage: [] })),
      api.getCosts(from, to).catch(() => ({ total: 0, byModel: [] })),
      api.getCalls('limit=10').catch(() => ({ logs: [], total: 0 })),
    ]).then(([u, c, cl]) => {
      setUsage(u);
      setCosts(c);
      setCalls(cl);
      setLoading(false);
      setLoadingCalls(false);
    });
  }, []);

  const totalTokens = usage?.usage?.reduce((s: number, d: any) => s + Number(d.total_tokens || 0), 0) || 0;
  const totalCalls = usage?.usage?.reduce((s: number, d: any) => s + Number(d.total_calls || 0), 0) || 0;
  const totalCost = costs?.total || 0;

  const chartData = usage?.usage?.map((d: any) => ({
    date: d.date?.slice(5) || '',
    tokens: Number(d.total_tokens || 0),
    calls: Number(d.total_calls || 0),
  })) || [];

  return (
    <>
      <div className="page-header animate-in">
        <div>
          <h2>Overview</h2>
          <p>Your LLM app performance at a glance</p>
        </div>
      </div>

      <div className="stats-grid animate-in delay-100">
        <StatCard icon={<BarChart3 size={20} />} label="Total Calls" value={totalCalls.toLocaleString()} change={totalCalls > 0 ? "+12%" : undefined} />
        <StatCard icon={<Zap size={20} />} label="Total Tokens" value={formatTokens(totalTokens)} change={totalTokens > 0 ? "+8%" : undefined} />
        <StatCard icon={<DollarSign size={20} />} label="Total Cost" value={`$${totalCost.toFixed(2)}`} change={totalCost > 0 ? "-5%" : undefined} positive={false} />
        <StatCard icon={<Brain size={20} />} label="Memories" value="—" change="Active" />
      </div>

      <div className="chart-container animate-in delay-200">
        <h3>Token Usage (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#71717A" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: 'rgba(15, 15, 15, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#EDEDED', backdropFilter: 'blur(20px)' }}
              labelStyle={{ color: '#A1A1AA', marginBottom: '8px' }}
              itemStyle={{ color: '#6366F1', fontWeight: 600 }}
            />
            <Area type="monotone" dataKey="tokens" stroke="url(#colorTokens)" fill="url(#colorTokens)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card animate-in delay-300" style={{ marginBottom: 40 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, letterSpacing: '-0.02em' }}>Recent Calls</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Tokens</th>
              <th>Cost</th>
              <th>Latency</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {calls?.logs?.map((log: any) => (
              <tr
                key={log.id}
                onClick={() => router.push(`/debugger?callId=${log.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <td><span className="badge badge-purple">{log.model}</span></td>
                <td>{log.total_tokens?.toLocaleString()}</td>
                <td>${Number(log.cost_usd || 0).toFixed(4)}</td>
                <td>{log.latency_ms}ms</td>
                <td>{new Date(log.created_at).toLocaleTimeString()}</td>
              </tr>
            ))}
            {loadingCalls && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading recent calls...</td></tr>
            )}
            {!loadingCalls && (!calls?.logs || calls.logs.length === 0) && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No calls yet. Send your first chat request!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card animate-in delay-400">
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, letterSpacing: '-0.02em' }}>Quick Start</h3>
        <div className="code-block">
          <button className="copy-btn" onClick={() => navigator.clipboard.writeText('import { ContextOS } from \'@contextos/sdk\'')}>Copy</button>
          <code>
{`import { ContextOS } from '@contextos/sdk';

const ctx = new ContextOS({
  apiKey: process.env.CONTEXTOS_API_KEY,
});

const response = await ctx.chat({
  userId: 'user_123',
  message: 'Hello! Remember my name is Alex.',
});

console.log(response.response);
// "Hi Alex! I'll remember your name."`}
          </code>
        </div>
      </div>
    </>
  );
}

function StatCard({ icon, label, value, change, positive = true }: any) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="stat-icon">{icon}</div>
        <span className={`stat-change ${positive ? 'positive' : 'negative'}`}>
          <TrendingUp size={12} />{change}
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
