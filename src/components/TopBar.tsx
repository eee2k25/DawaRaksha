import { Cloud, Menu, RefreshCw, Wifi } from 'lucide-react';
import { formatTime } from '../lib/format';
import type { ConnectionStatus, SystemStatus } from '../lib/types';

interface TopBarProps {
  onMenu: () => void;
  system: SystemStatus;
  lastTick: Date;
  live: boolean;
  onToggleLive: () => void;
  mode: 'cloud' | 'demo';
  cloudStatus: ConnectionStatus;
  syncing: boolean;
}

export function TopBar({
  onMenu,
  system,
  lastTick,
  live,
  onToggleLive,
  mode,
  cloudStatus,
  syncing,
}: TopBarProps) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b px-4 py-3 backdrop-blur-xl sm:px-6"
      style={{
        background: 'var(--header-bg)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="rounded-lg border p-2 lg:hidden"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-muted)',
            background: 'var(--surface)',
          }}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'var(--text-faint)' }}
          >
            Cloud Operations Center
          </p>
          <h2
            className="font-display text-base font-semibold sm:text-lg"
            style={{ color: 'var(--text)' }}
          >
            Container DR-001 · Cold-Chain Vault A
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:flex"
          style={{
            borderColor: 'var(--border)',
            background: mode === 'demo' ? 'var(--danger-soft)' : 'var(--accent-soft)',
            color: mode === 'demo' ? 'var(--danger)' : 'var(--accent)',
          }}
        >
          {mode === 'cloud' ? <Cloud size={14} /> : <Wifi size={14} />}
          <span className="capitalize">
            {mode === 'demo' ? 'simulate' : syncing ? 'syncing' : cloudStatus}
          </span>
        </div>

        <div
          className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:flex"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-muted)',
          }}
        >
          <Wifi size={13} />
          <span className="capitalize">{system.wifi}</span>
        </div>

        <div
          className="hidden rounded-full border px-3 py-1.5 font-mono text-xs lg:block"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-muted)',
          }}
        >
          {formatTime(lastTick)}
        </div>

        <button
          onClick={onToggleLive}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition"
          style={
            live
              ? {
                  border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                }
              : {
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-muted)',
                }
          }
        >
          <RefreshCw
            size={13}
            className={live ? 'animate-spin' : ''}
            style={{ animationDuration: '3s' }}
          />
          {live ? 'LIVE' : 'PAUSED'}
        </button>
      </div>
    </header>
  );
}
