'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Bug, Eye, Clock, Cpu, Coins } from 'lucide-react';

export default function DebuggerPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api.getCalls('limit=30').then(d => {
      const logs = d.logs || [];
      setCalls(logs);
      setTotal(d.total || 0);
      const callId = new URLSearchParams(window.location.search).get('callId');
      if (callId && logs.some((call: any) => call.id === callId)) {
        inspectCall(callId);
      }
    }).catch(console.error);
  }, []);

  const inspectCall = async (id: string) => {
    const call = await api.getCall(id);
    setSelected(call);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Context Debugger</h2>
          <p>Inspect the exact payload sent to the LLM for any request</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Call Timeline */}
        <div className="card" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-muted)' }}>
            Call Timeline ({total} total)
          </h3>
          {calls.map((call: any) => (
            <div
              key={call.id}
              onClick={() => inspectCall(call.id)}
              style={{
                padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                marginBottom: 6, border: '1px solid',
                borderColor: selected?.id === call.id ? 'var(--border-accent)' : 'var(--border-color)',
                background: selected?.id === call.id ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="badge badge-purple" style={{ fontSize: 11 }}>{call.model}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(call.created_at).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                <span><Cpu size={11} style={{ display: 'inline', marginRight: 3 }} />{call.total_tokens} tok</span>
                <span><Clock size={11} style={{ display: 'inline', marginRight: 3 }} />{call.latency_ms}ms</span>
                <span><Coins size={11} style={{ display: 'inline', marginRight: 3 }} />${Number(call.cost_usd || 0).toFixed(4)}</span>
              </div>
            </div>
          ))}
          {calls.length === 0 && (
            <div className="empty-state"><Bug size={32} /><h3>No calls yet</h3><p>Send a chat request to see debug data</p></div>
          )}
        </div>

        {/* Call Inspector */}
        <div className="card" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
          {selected ? (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                <Eye size={14} style={{ display: 'inline', marginRight: 6 }} />
                Call Inspector
              </h3>

              {/* Token Breakdown */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Token Breakdown</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <TokenBar label="Prompt" value={selected.prompt_tokens} total={selected.total_tokens} color="#7c3aed" />
                  <TokenBar label="Completion" value={selected.completion_tokens} total={selected.total_tokens} color="#3b82f6" />
                </div>
              </div>

              {/* Messages Payload */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Context Payload</div>
                <div className="json-viewer">
                  <JsonView data={selected.messages_payload} />
                </div>
              </div>

              {/* Response */}
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Response</div>
                <div className="json-viewer">
                  <JsonView data={selected.response_payload} />
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ paddingTop: 100 }}>
              <Eye size={32} />
              <h3>Select a call</h3>
              <p>Click on any call in the timeline to inspect its context payload</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function TokenBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total * 100) : 0;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, color: 'var(--text-secondary)' }}>
        <span>{label}</span><span>{value?.toLocaleString()}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function JsonView({ data }: { data: any }) {
  if (!data) return <span className="json-null">null</span>;
  const formatted = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  // Simple syntax highlighting
  const highlighted = formatted
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
    .replace(/: "([^"]*?)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/: null/g, ': <span class="json-null">null</span>');
  return <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: highlighted }} />;
}
