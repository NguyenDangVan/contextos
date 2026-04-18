'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, Key, Cpu, Brain, Shield, Save } from 'lucide-react';
import { clearStoredApiKey, DEMO_API_KEY, getStoredApiKey, maskApiKey, persistApiKey } from '@/lib/api-key';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    defaultModel: 'gpt-4o-mini',
    llmProvider: 'openai',
    recentTurnsToKeep: 10,
    compressionThreshold: 0.8,
    monthlyBudgetTokens: '',
    maskFields: 'email, phone',
  });

  const update = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  const saveChanges = () => {
    setApiKey(persistApiKey(apiKey));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  const resetToDemo = () => {
    setApiKey(clearStoredApiKey());
    setSaved(false);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p>Project configuration and API management</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={saveChanges}>
          <Save size={14} /> {saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>

      {/* API Key */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Key size={16} style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>API Key</h3>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{
              flex: 1, padding: '10px 16px', background: 'var(--bg-input)',
              border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
              fontSize: 13, color: 'var(--text-accent)', fontFamily: 'inherit',
            }}
          />
          <code style={{
            padding: '10px 16px', background: 'var(--bg-input)',
            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
            fontSize: 13, color: 'var(--text-accent)', minWidth: 140,
          }}>
            {showKey ? apiKey : maskApiKey(apiKey)}
          </code>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowKey(!showKey)}>
            {showKey ? 'Hide' : 'Reveal'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(apiKey)}>
            Copy
          </button>
          <button className="btn btn-secondary btn-sm" onClick={resetToDemo}>
            Use Demo Key
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
          <SettingField label="Default Provider" value={settings.llmProvider} onChange={(value: string) => update('llmProvider', value)} options={['openai', 'anthropic']} />
          <SettingField label="Default Model" value={settings.defaultModel} onChange={(value: string) => update('defaultModel', value)} options={['gpt-4o-mini', 'gpt-4o', 'claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001']} />
        </div>

        {/* Memory Settings */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Brain size={16} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Memory & Compression</h3>
          </div>
          <SettingInput label="Recent Turns to Keep" value={settings.recentTurnsToKeep} type="number" onChange={(value: string) => update('recentTurnsToKeep', value)} />
          <SettingInput label="Compression Threshold" value={settings.compressionThreshold} type="number" onChange={(value: string) => update('compressionThreshold', value)} hint="0.0 to 1.0 — ratio of context window before compression triggers" />
        </div>

        {/* Budget */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <SettingsIcon size={16} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Budget Caps</h3>
          </div>
          <SettingInput label="Monthly Token Budget (per user)" value={settings.monthlyBudgetTokens} placeholder="Unlimited" type="number" onChange={(value: string) => update('monthlyBudgetTokens', value)} hint="Leave empty for unlimited" />
        </div>

        {/* Privacy */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Shield size={16} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Privacy & PII Masking</h3>
          </div>
          <SettingInput label="Mask Fields" value={settings.maskFields} onChange={(value: string) => update('maskFields', value)} hint="Comma-separated field names to redact from logs" />
        </div>
      </div>
    </>
  );
}

type SettingFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
};

function SettingField({ label, value, onChange, options }: SettingFieldProps) {
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

type SettingInputProps = {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
};

function SettingInput({ label, value, onChange, type = 'text', placeholder, hint }: SettingInputProps) {
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
