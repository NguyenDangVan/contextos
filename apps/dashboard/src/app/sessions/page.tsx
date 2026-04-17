'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MessageSquare, Clock, Hash, ChevronDown, ChevronRight } from 'lucide-react';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    api.getSessions().then(d => setSessions(d.sessions || [])).catch(console.error);
  }, []);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const data = await api.getSessionMessages(id);
    setMessages(data.messages || []);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Sessions</h2>
          <p>Conversation sessions and message history</p>
        </div>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Session ID</th>
              <th>User</th>
              <th>Turns</th>
              <th>Tokens</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s: any) => (
              <>
                <tr key={s.id} onClick={() => toggleExpand(s.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ width: 30 }}>
                    {expanded === s.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </td>
                  <td><code style={{ fontSize: 12, color: 'var(--text-accent)' }}>{s.id.slice(0, 8)}...</code></td>
                  <td><span className="badge badge-blue">{s.user_id || 'unknown'}</span></td>
                  <td><Hash size={12} style={{ display: 'inline', marginRight: 4 }} />{s.turn_count}</td>
                  <td>{Number(s.token_count).toLocaleString()}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {new Date(s.last_active_at).toLocaleString()}
                  </td>
                </tr>
                {expanded === s.id && (
                  <tr key={`${s.id}-messages`}>
                    <td colSpan={6} style={{ padding: 0, background: 'var(--bg-secondary)' }}>
                      <div style={{ padding: '16px 24px', maxHeight: 400, overflowY: 'auto' }}>
                        {messages.map((m: any, i: number) => (
                          <div key={m.id} style={{
                            display: 'flex', gap: 12, marginBottom: 12,
                            flexDirection: m.role === 'user' ? 'row' : 'row',
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                              background: m.role === 'user' ? 'var(--accent-gradient)' : 'rgba(34, 197, 94, 0.2)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 600,
                              color: m.role === 'user' ? 'white' : 'var(--success)',
                            }}>
                              {m.role === 'user' ? 'U' : 'AI'}
                            </div>
                            <div style={{
                              background: m.role === 'user' ? 'rgba(124, 58, 237, 0.1)' : 'var(--bg-card)',
                              borderRadius: 'var(--radius-md)', padding: '10px 14px',
                              fontSize: 14, lineHeight: 1.6, maxWidth: '80%',
                              border: `1px solid ${m.role === 'user' ? 'rgba(124, 58, 237, 0.2)' : 'var(--border-color)'}`,
                            }}>
                              {m.content}
                            </div>
                          </div>
                        ))}
                        {messages.length === 0 && (
                          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No messages in this session</div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {sessions.length === 0 && (
              <tr><td colSpan={6} className="empty-state">No sessions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
