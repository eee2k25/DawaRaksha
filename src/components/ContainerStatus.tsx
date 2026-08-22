import { DoorOpen, Droplet, Package, Shield } from 'lucide-react';
import type { ContainerInfo, SensorReading } from '../lib/types';
import { CONTAINER } from '../lib/mockData';

interface ContainerStatusProps {
  reading: SensorReading;
  overall: 'healthy' | 'warning' | 'critical';
  container?: ContainerInfo;
}

export function ContainerStatus({
  reading,
  overall,
  container = CONTAINER,
}: ContainerStatusProps) {
  const statusStyles = {
    healthy: {
      border: 'color-mix(in srgb, var(--ok) 35%, transparent)',
      bg: 'linear-gradient(135deg, var(--ok-soft), transparent)',
      color: 'var(--ok)',
    },
    warning: {
      border: 'color-mix(in srgb, var(--warn) 40%, transparent)',
      bg: 'linear-gradient(135deg, var(--warn-soft), transparent)',
      color: 'var(--warn)',
    },
    critical: {
      border: 'color-mix(in srgb, var(--danger) 40%, transparent)',
      bg: 'linear-gradient(135deg, var(--danger-soft), transparent)',
      color: 'var(--danger)',
    },
  }[overall];

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: statusStyles.border, background: statusStyles.bg, color: statusStyles.color }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Shield size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
              Container Identity
            </span>
          </div>
          <h3 className="font-display text-xl font-bold" style={{ color: 'var(--text)' }}>
            {container.name}
          </h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {container.location}
          </p>
        </div>
        <div
          className="rounded-full border px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--chip-bg)',
            color: 'var(--text)',
          }}
        >
          {overall}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Product" value={container.product} />
        <Meta label="Batch" value={container.batchId} />
        <Meta label="Capacity" value={container.capacity} />
        <Meta label="Node ID" value={container.id} />
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <StateChip
          icon={DoorOpen}
          label="Access"
          value={reading.door === 'open' ? 'OPEN' : 'SECURE'}
          ok={reading.door === 'closed'}
        />
        <StateChip
          icon={Droplet}
          label="Leak"
          value={reading.leak === 'wet' ? 'WET CONTACT' : 'DRY'}
          ok={reading.leak === 'dry'}
        />
        <StateChip
          icon={Package}
          label="Stock"
          value={`${reading.stockLevel.toFixed(0)}% fill`}
          ok={reading.stockLevel >= 25}
        />
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: 'var(--chip-bg)' }}>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium" style={{ color: 'var(--text)' }}>
        {value}
      </p>
    </div>
  );
}

function StateChip({
  icon: Icon,
  label,
  value,
  ok,
}: {
  icon: typeof DoorOpen;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
      style={{
        borderColor: ok
          ? 'color-mix(in srgb, var(--ok) 30%, transparent)'
          : 'color-mix(in srgb, var(--danger) 35%, transparent)',
        background: ok ? 'var(--ok-soft)' : 'var(--danger-soft)',
      }}
    >
      <Icon size={16} style={{ color: ok ? 'var(--ok)' : 'var(--danger)' }} />
      <div>
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          {label}
        </p>
        <p className="text-xs font-bold" style={{ color: ok ? 'var(--ok)' : 'var(--danger)' }}>
          {value}
        </p>
      </div>
    </div>
  );
}
