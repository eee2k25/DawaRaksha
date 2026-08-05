import { Cloud, CloudOff, Loader2, Radio, Upload } from 'lucide-react';
import { THINGSPEAK } from '../lib/thingspeak';
import type { ConnectionStatus } from '../lib/types';

interface CloudStatusBannerProps {
  status: ConnectionStatus;
  mode: 'cloud' | 'demo';
  entryCount: number;
  lastEntryId: number | null;
  error: string | null;
  syncing: boolean;
  pushing: boolean;
  onRefresh: () => void;
  onPushTest: () => void;
  onModeChange: (mode: 'cloud' | 'demo') => void;
}

export function CloudStatusBanner({
  status,
  mode,
  entryCount,
  lastEntryId,
  error,
  syncing,
  pushing,
  onRefresh,
  onPushTest,
  onModeChange,
}: CloudStatusBannerProps) {
  const ok = status === 'online';

  return (
    <div
      className={`mb-5 rounded-2xl border p-4 ${
        mode === 'demo'
          ? 'border-amber-500/25 bg-amber-500/10'
          : ok
            ? 'border-cyan-500/20 bg-cyan-500/10'
            : 'border-rose-500/25 bg-rose-500/10'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${
              mode === 'demo'
                ? 'bg-amber-500/20 text-amber-300'
                : ok
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'bg-rose-500/20 text-rose-300'
            }`}
          >
            {syncing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : mode === 'demo' ? (
              <Radio size={18} />
            ) : ok ? (
              <Cloud size={18} />
            ) : (
              <CloudOff size={18} />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {mode === 'demo'
                ? 'Demo simulator mode'
                : ok
                  ? 'ThingSpeak cloud connected'
                  : 'ThingSpeak connection issue'}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
              Channel <span className="font-mono text-cyan-300/90">{THINGSPEAK.channelId}</span>
              {' · '}
              {mode === 'cloud'
                ? entryCount > 0
                  ? `${entryCount} feeds loaded · last entry #${lastEntryId ?? '—'}`
                  : 'Waiting for ESP32 uploads…'
                : 'Local synthetic stream (not writing to cloud)'}
            </p>
            {error && mode === 'cloud' && (
              <p className="mt-1 text-xs text-rose-300">{error}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-white/10 bg-black/30 p-0.5">
            <button
              onClick={() => onModeChange('cloud')}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                mode === 'cloud'
                  ? 'bg-cyan-500/25 text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cloud
            </button>
            <button
              onClick={() => onModeChange('demo')}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                mode === 'demo'
                  ? 'bg-amber-500/25 text-amber-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Demo
            </button>
          </div>

          {mode === 'cloud' && (
            <>
              <button
                onClick={onRefresh}
                disabled={syncing}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-50"
              >
                {syncing ? 'Syncing…' : 'Refresh'}
              </button>
              <button
                onClick={onPushTest}
                disabled={pushing || syncing}
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-50"
                title="Write a sample reading (15s rate limit)"
              >
                {pushing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Upload size={12} />
                )}
                Push test reading
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
