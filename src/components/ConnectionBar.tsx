import {
  Cloud,
  Cpu,
  ExternalLink,
  Loader2,
  Moon,
  Radio,
  RefreshCw,
  Settings,
  Sun,
  Upload,
  Wifi,
} from 'lucide-react';
import { channelUrl } from '../lib/thingspeak';
import type { ConnectionStatus } from '../lib/types';
import type { ThemeMode } from '../lib/theme';

interface ConnectionBarProps {
  mode: 'cloud' | 'demo';
  onModeChange: (mode: 'cloud' | 'demo') => void;
  status: ConnectionStatus;
  channelId: number;
  entryCount: number;
  lastEntryId: number | null;
  error: string | null;
  syncing: boolean;
  pushing: boolean;
  connectingEsp: boolean;
  espConnected: boolean;
  onConnectEsp: () => void;
  onRefresh: () => void;
  onPushTest: () => void;
  onOpenSettings: () => void;
  theme: ThemeMode;
  onThemeChange: (t: ThemeMode) => void;
}

export function ConnectionBar({
  mode,
  onModeChange,
  status,
  channelId,
  entryCount,
  lastEntryId,
  error,
  syncing,
  pushing,
  connectingEsp,
  espConnected,
  onConnectEsp,
  onRefresh,
  onPushTest,
  onOpenSettings,
  theme,
  onThemeChange,
}: ConnectionBarProps) {
  const ok = status === 'online';

  return (
    <div className="mb-5 space-y-3">
      {/* Primary mode switch */}
      <div className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-faint)]">
              Data source
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--text)]">
              {mode === 'cloud'
                ? espConnected
                  ? 'ESP32 linked via ThingSpeak cloud'
                  : 'Cloud mode — waiting for ESP32'
                : 'Local simulator stream active'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onConnectEsp}
              disabled={connectingEsp}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                mode === 'cloud'
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-md shadow-[var(--accent-glow)]'
                  : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--accent)]/50'
              }`}
            >
              {connectingEsp ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Cpu size={14} />
              )}
              {connectingEsp ? 'Connecting…' : mode === 'cloud' ? 'ESP Connected' : 'Connect ESP'}
              {mode === 'cloud' && espConnected && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)] animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onModeChange('demo')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                mode === 'demo'
                  ? 'bg-[var(--danger)] text-white shadow-md shadow-[var(--danger-glow)]'
                  : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--danger)]/40'
              }`}
            >
              <Radio size={14} />
              Simulate
            </button>

            {/* Theme toggle */}
            <div className="flex rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
              <button
                type="button"
                onClick={() => onThemeChange('dark')}
                className={`inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[11px] font-semibold transition ${
                  theme === 'dark'
                    ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
                aria-label="Dark theme"
              >
                <Moon size={13} />
                Dark
              </button>
              <button
                type="button"
                onClick={() => onThemeChange('light')}
                className={`inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[11px] font-semibold transition ${
                  theme === 'light'
                    ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--danger)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
                aria-label="Light cream theme"
              >
                <Sun size={13} />
                Cream
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status strip */}
      <div
        className={`rounded-2xl border p-4 ${
          mode === 'demo'
            ? 'border-[var(--danger)]/25 bg-[var(--danger-soft)]'
            : ok
              ? 'border-[var(--accent)]/25 bg-[var(--accent-soft)]'
              : 'border-[var(--danger)]/30 bg-[var(--danger-soft)]'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${
                mode === 'demo'
                  ? 'bg-[var(--danger)]/15 text-[var(--danger)]'
                  : ok
                    ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                    : 'bg-[var(--danger)]/15 text-[var(--danger)]'
              }`}
            >
              {syncing || connectingEsp ? (
                <Loader2 size={18} className="animate-spin" />
              ) : mode === 'demo' ? (
                <Radio size={18} />
              ) : ok ? (
                <Cloud size={18} />
              ) : (
                <Wifi size={18} />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">
                {mode === 'demo'
                  ? 'Simulate mode — synthetic sensor stream'
                  : ok
                    ? 'ThingSpeak cloud connected'
                    : 'Cloud connection issue'}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">
                Channel{' '}
                <a
                  href={channelUrl({ channelId, readKey: '', writeKey: '' })}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[var(--accent)] underline decoration-dotted underline-offset-2"
                >
                  {channelId}
                </a>
                {' · '}
                {mode === 'cloud'
                  ? entryCount > 0
                    ? `${entryCount} feeds · last #${lastEntryId ?? '—'}`
                    : 'Waiting for ESP32 uploads…'
                  : 'Not writing to cloud · fault buttons work locally'}
              </p>
              {error && mode === 'cloud' && (
                <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode === 'cloud' && (
              <>
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-50"
                >
                  <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Syncing…' : 'Refresh'}
                </button>
                <button
                  type="button"
                  onClick={onPushTest}
                  disabled={pushing || syncing}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--accent)] hover:brightness-110 disabled:opacity-50"
                >
                  {pushing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  Push test reading
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onOpenSettings}
              title="ThingSpeak channel settings"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <Settings size={12} />
              Channel
            </button>
            <a
              href={channelUrl({ channelId, readKey: '', writeKey: '' })}
              target="_blank"
              rel="noreferrer"
              title="Open channel on thingspeak.com"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <ExternalLink size={12} />
              View
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
