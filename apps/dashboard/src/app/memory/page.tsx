'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Brain, Trash2, Search, Shield } from 'lucide-react';

export default function MemoryPage() {
  const [data, setData] = useState<any>({ memories: [], total: 0 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const loadMemories = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('userId', search);
    if (category) params.set('category', category);
    params.set('limit', '50');
    api.getMemories(params.toString()).then(setData).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadMemories(); }, [category]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this memory?')) return;
    await api.deleteMemory(id);
    loadMemories();
  };

  const handleGDPR = async () => {
    const userId = prompt('Enter user ID to delete all memories (GDPR):');
    if (!userId) return;
    if (!confirm(`Delete ALL memories for "${userId}"? This cannot be undone.`)) return;
    await api.deleteAllMemories(userId);
    loadMemories();
  };

  const categories = ['personal', 'preference', 'goal', 'context'];

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Memory Store</h2>
          <p>View and manage extracted user memories</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleGDPR}>
          <Shield size={14} /> GDPR Delete
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', padding: '16px 20px' }}>
        <Search size={16} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Filter by User ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadMemories()}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={`badge ${!category ? 'badge-purple' : 'badge-gray'}`}
            onClick={() => setCategory('')}
            style={{ cursor: 'pointer', border: 'none' }}
          >All</button>
          {categories.map(c => (
            <button
              key={c}
              className={`badge ${category === c ? 'badge-purple' : 'badge-gray'}`}
              onClick={() => setCategory(c)}
              style={{ cursor: 'pointer', border: 'none' }}
            >{c}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Memory</th>
              <th>Category</th>
              <th>Confidence</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.memories.map((m: any) => (
              <tr key={m.id}>
                <td style={{ maxWidth: 400 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Brain size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    {m.content}
                  </div>
                </td>
                <td><span className={`badge badge-${categoryColor(m.category)}`}>{m.category || 'unknown'}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 60, height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${(m.confidence || 0) * 100}%`, height: '100%',
                        background: 'var(--accent-gradient)', borderRadius: 2,
                      }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{((m.confidence || 0) * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleDelete(m.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4,
                  }}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {data.memories.length === 0 && (
              <tr><td colSpan={5} className="empty-state">No memories found</td></tr>
            )}
          </tbody>
        </table>
        {data.total > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', fontSize: 13, color: 'var(--text-muted)' }}>
            Showing {data.memories.length} of {data.total} memories
          </div>
        )}
      </div>
    </>
  );
}

function categoryColor(c: string): string {
  switch (c) {
    case 'personal': return 'blue';
    case 'preference': return 'purple';
    case 'goal': return 'green';
    case 'context': return 'yellow';
    default: return 'gray';
  }
}
