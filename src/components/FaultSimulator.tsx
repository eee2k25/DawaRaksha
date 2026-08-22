import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Flame,
  Package,
  Scale,
  Snowflake,
  Thermometer,
  Wind,
  DoorOpen,
  Zap,
} from 'lucide-react';
import { FAULTS, type FaultId } from '../lib/faults';

interface FaultSimulatorProps {
  onInject: (id: FaultId) => void;
  busy?: boolean;
  mode: 'cloud' | 'demo';
  lastFault: string | null;
}

const ICONS: Record<FaultId, typeof Thermometer> = {
  'temp-high': Thermometer,
  'temp-low': Snowflake,
  humidity: Droplets,
  door: DoorOpen,
  leak: Flame,
  gas: Wind,
  stock: Package,
  mass: Scale,
  multi: Zap,
  clear: CheckCircle2,
};

export function FaultSimulator({
  onInject,
  busy,
  mode,
  lastFault,
}: FaultSimulatorProps) {
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-[var(--border)] bg-[var(--accent-soft)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--danger)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">Fault Simulator</h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Inject test faults for demos
                {mode === 'cloud' ? ' · also writes to ThingSpeak when possible' : ' · local stream only'}
              </p>
            </div>
          </div>
          {lastFault && (
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 font-mono text-[10px] font-semibold text-[var(--accent)]">
              Last: {lastFault}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-5">
        {FAULTS.map((f) => {
          const Icon = ICONS[f.id];
          const isClear = f.id === 'clear';
          const isCrit = f.severity === 'critical';
          return (
            <button
              key={f.id}
              type="button"
              disabled={busy}
              onClick={() => onInject(f.id)}
              title={f.description}
              className={`group flex flex-col items-start gap-1.5 rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isClear
                  ? 'border-[var(--ok)]/30 bg-[var(--ok-soft)] hover:brightness-105'
                  : isCrit
                    ? 'border-[var(--danger)]/35 bg-[var(--danger-soft)] hover:brightness-105'
                    : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]'
              }`}
            >
              <div className="flex w-full items-center gap-2">
                <Icon
                  size={14}
                  className={
                    isClear
                      ? 'text-[var(--ok)]'
                      : isCrit
                        ? 'text-[var(--danger)]'
                        : 'text-[var(--accent)]'
                  }
                />
                <span className="text-xs font-bold text-[var(--text)]">{f.short}</span>
              </div>
              <span className="text-[10px] leading-snug text-[var(--text-muted)]">{f.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
