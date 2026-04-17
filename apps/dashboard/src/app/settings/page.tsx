'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, Key, Cpu, Brain, Shield, Save } from 'lucide-react';

export default function SettingsPage() {
  const [apiKey] = useState('ctx_demo_key_2026_hackathon_testsprite');
  const [showKey, setShowKey] = useState(false);
  const [settings, setSettings] = useState({
    defaultModel: 'gpt-4o-mini',
    llmProvider: 'openai',
    recentTurnsToKeep: 10,
    compressionThreshold: 0.8,
    monthlyBudgetTokens: '',
    maskFields: 'email, phone',
  });

  const update = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p>Project configuration and API management</p>
        </div>
        <button className="btn btn-primary btn-sm"><Save size={14} /> Save Changes</button>
      </div>

      {/* API Key */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Key size={16} style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>API Key</h3>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <code style={{
            flex: 1, padding: '10px 16px', background: 'var(--bg-input)',
            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
            fontSize: 13, color: 'var(--text-accent)',
          }}>
            {showKey ? apiKey : apiKey.replace(/./g, '•').slice(0, 30) + '...'}
          </code>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowKey(!showKey)}>
            {showKey ? 'Hide' : 'Reveal'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(apiKey)}>
            Copy
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* LLM Settings */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Cpu size={16} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>LLM Configuration</h3>
          </div>
          <SettingField label="Default Provider" value={settings.llmProvider} onChange={(v) => update('llmProvider', v)} options={['openai', 'anthropic']} />
          <SettingField label="Default Model" value={settings.defaultModel} onChange={(v) => update('defaultModel', v)} options={['gpt-4o-mini', 'gpt-4o', 'claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001']} />
        </div>

        {/* Memory Settings */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Brain size={16} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Memory & Compression</h3>
          </div>
          <SettingInput label="Recent Turns to Keep" value={settings.recentTurnsToKeep} type="number" onChange={(v) => update('recentTurnsToKeep', v)} />
          <SettingInput label="Compression Threshold" value={settings.compressionThreshold} type="number" onChange={(v) => update('compressionThreshold', v)} hint="0.0 to 1.0 — ratio of context window before compression triggers" />
        </div>

        {/* Budget */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <SettingsIcon size={16} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Budget Caps</h3>
          </div>
          <SettingInput label="Monthly Token Budget (per user)" value={settings.monthlyBudgetTokens} placeholder="Unlimited" type="number" onChange={(v) => update('monthlyBudgetTokens', v)} hint="Leave empty for unlimited" />
        </div>

        {/* Privacy */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Shield size={16} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Privacy & PII Masking</h3>
          </div>
          <SettingInput label="Mask Fields" value={settings.maskFields} onChange={(v) => update('maskFields', v)} hint="Comma-separated field names to redact from logs" />
        </div>
      </div>
    </>
  );
}

function SettingField({ label, value, onChange, options }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px', background: 'var(--bg-input)',
          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit',
        }}
      >
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function SettingInput({ label, value, onChange, type = 'text', placeholder, hint }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px', background: 'var(--bg-input)',
          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
        }}
      />
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
