import {
  Antenna,
  BatteryMedium,
  Cloud,
  Cpu,
  HardDrive,
  Hash,
  KeyRound,
  Radio,
  Signal,
  Timer,
} from 'lucide-react';
import { formatDateTime, statusColor } from '../lib/format';
import { FIELD_MAP } from '../lib/thingspeak';
import type { SystemStatus } from '../lib/types';

interface SystemPanelProps {
  system: SystemStatus;
  channelId: number;
  readKey: string;
  entryCount: number;
  lastEntryId: number | null;
  mode: 'cloud' | 'demo';
}

const LINKS = [
  { key: 'esp32' as const, label: 'ESP32 Controller', icon: Cpu, detail: 'DevKit V1 · event logic' },
  { key: 'wifi' as const, label: 'Wi-Fi / Hotspot', icon: Signal, detail: 'Upload path to cloud' },
  { key: 'thingspeak' as const, label: 'ThingSpeak Channel', icon: Cloud, detail: 'Time-series logging' },
  { key: 'gsm' as const, label: 'SIM900A GSM', icon: Antenna, detail: 'SMS backup alerts' },
];

export function SystemPanel({
  system,
  channelId,
  readKey,
  entryCount,
  lastEntryId,
  mode,
}: SystemPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {LINKS.map(({ key, label, icon: Icon, detail }) => {
          const st = system[key];
          return (
            <div key={key} className="panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  <Icon size={18} />
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColor(
                    st
                  )}`}
                  style={{ background: 'var(--surface-2)' }}
                >
                  {st}
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {label}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
                {detail}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div
          className="rounded-2xl border p-5"
          style={{
            borderColor: 'var(--border-strong)',
            background: 'linear-gradient(135deg, var(--accent-soft), transparent)',
          }}
        >
          <div className="mb-3 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
            <Cloud size={16} />
            <h3 className="text-sm font-semibold">ThingSpeak Link</h3>
          </div>
          <div className="space-y-2 text-sm">
            <Row icon={Hash} label="Channel ID" value={String(channelId)} mono />
            <Row
              icon={KeyRound}
              label="Read key"
              value={`${readKey.slice(0, 4)}…${readKey.slice(-4)}`}
              mono
            />
            <Row icon={Radio} label="Data mode" value={mode === 'cloud' ? 'ESP / Cloud' : 'Simulate'} />
            <Row icon={HardDrive} label="Feeds loaded" value={String(entryCount)} mono />
            <Row
              icon={Hash}
              label="Last entry"
              value={lastEntryId != null ? `#${lastEntryId}` : '—'}
              mono
            />
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Channel Field Map
          </h3>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {FIELD_MAP.map((f) => (
              <div
                key={f.field}
                className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs"
                style={{ background: 'var(--chip-bg)' }}
              >
                <span className="font-mono" style={{ color: 'var(--accent)' }}>
                  {f.field}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {f.name} <span style={{ color: 'var(--text-faint)' }}>({f.unit})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="panel p-4">
          <div className="mb-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <Timer size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">Uptime</span>
          </div>
          <p className="font-display text-2xl font-bold" style={{ color: 'var(--text)' }}>
            {system.uptimeHours.toFixed(1)} h
          </p>
        </div>
        <div className="panel p-4">
          <div className="mb-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <BatteryMedium size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">Backup Rail</span>
          </div>
          <p className="font-display text-2xl font-bold" style={{ color: 'var(--text)' }}>
            {system.batteryPct}%
          </p>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full"
            style={{ background: 'var(--border)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${system.batteryPct}%`,
                background: 'linear-gradient(90deg, var(--ok), var(--accent))',
              }}
            />
          </div>
        </div>
        <div className="panel p-4">
          <div className="mb-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <Radio size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">Last Upload</span>
          </div>
          <p className="font-display text-lg font-bold" style={{ color: 'var(--text)' }}>
            {formatDateTime(system.lastUpload)}
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
      style={{ background: 'var(--chip-bg)' }}
    >
      <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-faint)' }}>
        <Icon size={13} />
        {label}
      </span>
      <span
        className={`text-xs font-semibold ${mono ? 'font-mono' : ''}`}
        style={{ color: 'var(--text)' }}
      >
        {value}
      </span>
    </div>
  );
}
