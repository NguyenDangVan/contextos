'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { FileCode2, Plus, GitBranch, Rocket, RotateCcw } from 'lucide-react';

export default function PromptsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);

  useEffect(() => {
    api.getPrompts().then(d => setTemplates(d.templates || [])).catch(console.error);
  }, []);

  const selectTemplate = async (t: any) => {
    setSelected(t);
    const data = await api.getPromptVersions(t.id);
    setVersions(data.versions || []);
  };

  const deploy = async (templateId: string, versionId: string, deployment: string) => {
    await api.updatePromptVersion(templateId, versionId, { deployment });
    await selectTemplate(selected);
  };

  const rollback = async (templateId: string, versionId: string) => {
    if (!confirm('Rollback to this version?')) return;
    await api.rollbackPrompt(templateId, versionId);
    await selectTemplate(selected);
  };

  const deploymentColor = (d: string) => {
    switch (d) {
      case 'production': return 'green';
      case 'staging': return 'yellow';
      case 'canary': return 'purple';
      default: return 'gray';
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Prompt Version Control</h2>
          <p>Git-like versioning for your system prompts</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
        {/* Template List */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Templates</h3>
          </div>
          {templates.map((t: any) => (
            <div
              key={t.id}
              onClick={() => selectTemplate(t)}
              style={{
                padding: '12px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                marginBottom: 6,
                border: `1px solid ${selected?.id === t.id ? 'var(--border-accent)' : 'var(--border-color)'}`,
                background: selected?.id === t.id ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileCode2 size={14} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</span>
              </div>
              {t.description && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, marginLeft: 22 }}>{t.description}</p>
              )}
            </div>
          ))}
          {templates.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: 13 }}>
              No templates yet
            </div>
          )}
        </div>

        {/* Version History */}
        <div className="card">
          {selected ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <GitBranch size={16} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{selected.name}</h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· {versions.length} versions</span>
              </div>

              {versions.map((v: any, i: number) => (
                <div key={v.id} style={{
                  padding: '16px 20px', marginBottom: 12,
                  background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <code style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-accent)' }}>v{v.version}</code>
                      <span className={`badge badge-${deploymentColor(v.deployment)}`}>{v.deployment}</span>
                      {v.deployment === 'canary' && v.canary_pct > 0 && (
                        <span className="badge badge-gray">{v.canary_pct}% traffic</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {v.deployment !== 'production' && (
                        <button className="btn btn-sm btn-secondary" onClick={() => deploy(selected.id, v.id, 'production')}>
                          <Rocket size={12} /> Deploy
                        </button>
                      )}
                      {v.deployment !== 'production' && i > 0 && (
                        <button className="btn btn-sm btn-secondary" onClick={() => rollback(selected.id, v.id)}>
                          <RotateCcw size={12} /> Rollback
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="code-block" style={{ fontSize: 12, padding: '12px 16px' }}>
                    {v.content}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>Variables: {(typeof v.variables === 'string' ? JSON.parse(v.variables) : v.variables || []).join(', ') || 'none'}</span>
                    <span>· {new Date(v.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="empty-state" style={{ paddingTop: 80 }}>
              <FileCode2 size={32} />
              <h3>Select a template</h3>
              <p>Choose a prompt template to view its version history</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
