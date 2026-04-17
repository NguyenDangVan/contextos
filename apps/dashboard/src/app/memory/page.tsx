'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, isDemoApiKey } from '@/lib/api';
import { Brain, Trash2, Search, Shield } from 'lucide-react';

export default function MemoryPage() {
  const [data, setData] = useState<any>({ memories: [], total: 0 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [gdprOpen, setGdprOpen] = useState(false);
  const [gdprUserId, setGdprUserId] = useState('');
  const [gdprDeleting, setGdprDeleting] = useState(false);
  const [demoDeletedUsers, setDemoDeletedUsers] = useState<string[]>([]);

  const loadMemories = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    const userId = search.trim();
    if (isDemoApiKey() && userId && demoDeletedUsers.includes(userId)) {
      setData({ memories: [], total: 0 });
      setLoading(false);
      return;
    }
    if (userId) params.set('userId', userId);
    if (category) params.set('category', category);
    params.set('limit', '50');
    api.getMemories(params.toString()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [category, demoDeletedUsers, search]);

  useEffect(() => {
    const timer = setTimeout(loadMemories, 250);
    return () => clearTimeout(timer);
  }, [loadMemories]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this memory?')) return;
    if (isDemoApiKey()) {
      setData((current: any) => {
        const memories = current.memories.filter((memory: any) => memory.id !== id);
        return { memories, total: Math.max(0, Number(current.total || 0) - 1) };
      });
      return;
    }
    await api.deleteMemory(id);
    loadMemories();
  };

  const openGDPR = () => {
    setGdprUserId(search.trim());
    setGdprOpen(true);
  };

  const handleGDPR = async () => {
    const userId = gdprUserId.trim();
    if (!userId) return;
    setGdprDeleting(true);
    try {
      if (!isDemoApiKey()) {
        await api.deleteAllMemories(userId);
      } else {
        setDemoDeletedUsers((users) => users.includes(userId) ? users : [...users, userId]);
      }
      setGdprOpen(false);
      setSearch(userId);
      setData({ memories: [], total: 0 });
    } finally {
      setGdprDeleting(false);
    }
  };

  const categories = ['personal', 'preference', 'goal', 'context'];

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Memory Store</h2>
          <p>View and manage extracted user memories</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={openGDPR}>
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
              <tr><td colSpan={5} className="empty-state">{loading ? 'Loading memories...' : 'No memories found'}</td></tr>
            )}
          </tbody>
        </table>
        {data.total > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', fontSize: 13, color: 'var(--text-muted)' }}>
            Showing {data.memories.length} of {data.total} memories
          </div>
        )}
      </div>

      {gdprOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gdpr-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(2, 6, 23, 0.72)',
            padding: 24,
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 420 }}>
            <h3 id="gdpr-title" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>GDPR Delete</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Delete all memories for a user ID. This action cannot be undone.
            </p>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              User ID
            </label>
            <input
              type="text"
              autoFocus
              placeholder="alex"
              value={gdprUserId}
              onChange={(e) => setGdprUserId(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', background: 'var(--bg-input)',
                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setGdprOpen(false)} disabled={gdprDeleting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                aria-label="Delete Memories"
                onClick={handleGDPR}
                disabled={gdprDeleting}
              >
                {gdprDeleting ? 'Deleting...' : 'Delete Memories'}
              </button>
            </div>
          </div>
        </div>
      )}
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
