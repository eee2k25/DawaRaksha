interface SensorGaugeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  safeMin?: number;
  safeMax?: number;
  color?: string;
}

export function SensorGauge({
  label,
  value,
  min,
  max,
  unit,
  safeMin,
  safeMax,
  color = 'var(--accent)',
}: SensorGaugeProps) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const inSafe =
    safeMin === undefined || safeMax === undefined
      ? true
      : value >= safeMin && value <= safeMax;

  const stroke = inSafe ? color : 'var(--danger)';
  const r = 42;
  const c = 2 * Math.PI * r;

  return (
    <div className="panel flex flex-col items-center p-4">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-[135deg]">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth="8"
            strokeDasharray={`${c * 0.75} ${c}`}
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="8"
            strokeDasharray={`${c * 0.75} ${c}`}
            strokeLinecap="round"
            style={{
              strokeDashoffset: c * 0.75 - (pct / 100) * c * 0.75,
              transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease',
              filter: `drop-shadow(0 0 6px color-mix(in srgb, ${stroke} 40%, transparent))`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl font-bold" style={{ color: 'var(--text)' }}>
            {value}
          </span>
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-faint)' }}
          >
            {unit}
          </span>
        </div>
      </div>
      <p className="mt-2 text-center text-xs font-semibold" style={{ color: 'var(--text)' }}>
        {label}
      </p>
      {safeMin !== undefined && safeMax !== undefined && (
        <p
          className="mt-1 text-[10px]"
          style={{ color: inSafe ? 'var(--ok)' : 'var(--danger)' }}
        >
          Safe {safeMin}–{safeMax} {unit}
        </p>
      )}
    </div>
  );
}
