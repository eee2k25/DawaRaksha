import { useState } from 'react';
import { ExternalLink, KeyRound, Loader2, Radio, RotateCcw, Save, X } from 'lucide-react';
import {
  DEFAULT_THINGSPEAK,
  channelUrl,
  fetchChannelInfo,
  type ThingSpeakChannelMeta,
  type ThingSpeakConfig,
} from '../lib/thingspeak';

interface ThingSpeakSettingsModalProps {
  config: ThingSpeakConfig;
  onClose: () => void;
  onSave: (cfg: ThingSpeakConfig) => void;
}

type TestState =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok'; meta: ThingSpeakChannelMeta }
  | { kind: 'error'; message: string };

export function ThingSpeakSettingsModal({
  config,
  onClose,
  onSave,
}: ThingSpeakSettingsModalProps) {
  const [channelId, setChannelId] = useState(String(config.channelId));
  const [readKey, setReadKey] = useState(config.readKey);
  const [writeKey, setWriteKey] = useState(config.writeKey);
  const [test, setTest] = useState<TestState>({ kind: 'idle' });

  const parsedId = parseInt(channelId, 10);
  const valid = Number.isFinite(parsedId) && parsedId > 0 && readKey.trim() !== '';

  const draft = (): ThingSpeakConfig => ({
    channelId: parsedId,
    readKey: readKey.trim(),
    writeKey: writeKey.trim(),
  });

  const runTest = async () => {
    if (!valid) return;
    setTest({ kind: 'testing' });
    try {
      const meta = await fetchChannelInfo(draft());
      setTest({ kind: 'ok', meta });
    } catch (err) {
      setTest({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Connection test failed',
      });
    }
  };

  const inputStyle = {
    borderColor: 'var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)' }}
      onClick={onClose}
    >
      <div
        className="panel-solid w-full max-w-lg p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ts-settings-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <Radio size={18} />
            </div>
            <div>
              <h3
                id="ts-settings-title"
                className="text-base font-bold"
                style={{ color: 'var(--text)' }}
              >
                ThingSpeak connection
              </h3>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                Point the dashboard at your own channel — stored locally in this browser.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <label
          className="mb-1 block text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-faint)' }}
        >
          Channel ID
        </label>
        <input
          value={channelId}
          onChange={(e) => setChannelId(e.target.value.replace(/[^0-9]/g, ''))}
          className="mb-3 w-full rounded-xl border px-3 py-2 font-mono text-sm outline-none"
          style={inputStyle}
          placeholder="e.g. 3444984"
          inputMode="numeric"
        />

        <label
          className="mb-1 block text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-faint)' }}
        >
          Read API key <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          value={readKey}
          onChange={(e) => setReadKey(e.target.value.trim())}
          className="mb-1 w-full rounded-xl border px-3 py-2 font-mono text-sm outline-none"
          style={inputStyle}
          placeholder="Read key from ThingSpeak → API Keys"
        />
        <p className="mb-3 text-[10px]" style={{ color: 'var(--text-faint)' }}>
          Required — used for live telemetry, history and charts.
        </p>

        <label
          className="mb-1 block text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-faint)' }}
        >
          Write API key <span style={{ color: 'var(--text-faint)' }}>(optional)</span>
        </label>
        <input
          value={writeKey}
          onChange={(e) => setWriteKey(e.target.value.trim())}
          className="mb-1 w-full rounded-xl border px-3 py-2 font-mono text-sm outline-none"
          style={inputStyle}
          placeholder="Enables “Push test reading” + fault injection to cloud"
        />
        <p className="mb-4 text-[10px]" style={{ color: 'var(--text-faint)' }}>
          Needed only for writing from the browser (test pushes / simulated faults). The ESP32 has
          its own copy in <span className="font-mono">firmware/esp32/secrets.h</span>.
        </p>

        {test.kind === 'ok' && (
          <div
            className="mb-4 rounded-xl border px-3 py-2.5 text-xs"
            style={{
              borderColor: 'color-mix(in srgb, var(--ok) 30%, transparent)',
              background: 'var(--ok-soft)',
              color: 'var(--text-muted)',
            }}
          >
            <p className="font-semibold" style={{ color: 'var(--ok)' }}>
              ✓ {test.meta.name || `Channel ${test.meta.id}`}
            </p>
            <p className="mt-0.5">
              {test.meta.description
                ? test.meta.description
                : `Connected · last entry #${test.meta.last_entry_id ?? '—'}`}
            </p>
            {test.meta.field1 && (
              <p className="mt-1 font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>
                F1 {test.meta.field1} · F2 {test.meta.field2 ?? '—'} · F7 {test.meta.field7 ?? '—'}
              </p>
            )}
          </div>
        )}
        {test.kind === 'error' && (
          <div
            className="mb-4 rounded-xl border px-3 py-2.5 text-xs"
            style={{
              borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)',
              background: 'var(--danger-soft)',
              color: 'var(--danger)',
            }}
          >
            {test.message}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void runTest()}
              disabled={!valid || test.kind === 'testing'}
              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {test.kind === 'testing' ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <KeyRound size={13} />
              )}
              Test connection
            </button>
            <button
              type="button"
              onClick={() => {
                setChannelId(String(DEFAULT_THINGSPEAK.channelId));
                setReadKey(DEFAULT_THINGSPEAK.readKey);
                setWriteKey(DEFAULT_THINGSPEAK.writeKey);
                setTest({ kind: 'idle' });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              <RotateCcw size={13} />
              Defaults
            </button>
            <a
              href={channelUrl(draft())}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              <ExternalLink size={13} />
              Open
            </a>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-4 py-2 text-xs font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!valid}
              onClick={() => onSave(draft())}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50"
              style={{
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                boxShadow: '0 8px 20px var(--accent-glow)',
              }}
            >
              <Save size={13} />
              Save & reconnect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
