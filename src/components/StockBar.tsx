interface StockBarProps {
  value: number;
  minSafe?: number;
  label?: string;
  /** Approximate vial/bin capacity caption */
  capacityLabel?: string;
}

/**
 * Vertical bin/vial metaphor for HC-SR04 fill-level.
 * Reads more naturally than a circular dial for depth/stock.
 */
export function StockBar({
  value,
  minSafe = 25,
  label = 'Stock Fill',
  capacityLabel = 'Container capacity',
}: StockBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const low = pct < minSafe;
  const fillColor = low ? 'var(--danger)' : pct < minSafe + 15 ? 'var(--warn)' : 'var(--ok)';

  // tick marks every 25%
  const ticks = [100, 75, 50, 25, 0];

  return (
    <div className="panel flex flex-col items-center p-4">
      <p
        className="mb-3 w-full text-center text-xs font-semibold"
        style={{ color: 'var(--text)' }}
      >
        {label}
      </p>

      <div className="flex items-end gap-3">
        {/* scale */}
        <div className="flex h-40 flex-col justify-between py-0.5 text-[9px] font-mono" style={{ color: 'var(--text-faint)' }}>
          {ticks.map((t) => (
            <span key={t}>{t}%</span>
          ))}
        </div>

        {/* bin */}
        <div className="relative">
          {/* min-safe marker */}
          <div
            className="pointer-events-none absolute right-full mr-1 flex items-center"
            style={{ bottom: `${minSafe}%`, transform: 'translateY(50%)' }}
          >
            <span
              className="whitespace-nowrap rounded px-1 py-0.5 text-[8px] font-bold uppercase"
              style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}
            >
              min
            </span>
          </div>

          <div
            className="relative h-40 w-14 overflow-hidden rounded-b-lg rounded-t-md border-2"
            style={{
              borderColor: low
                ? 'color-mix(in srgb, var(--danger) 55%, transparent)'
                : 'color-mix(in srgb, var(--accent) 45%, transparent)',
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--surface-2) 80%, transparent), var(--chip-bg))',
              boxShadow: 'inset 0 0 12px color-mix(in srgb, var(--text) 6%, transparent)',
            }}
            role="meter"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${label} ${pct.toFixed(0)} percent`}
          >
            {/* safe-min dashed line */}
            <div
              className="absolute inset-x-0 z-10 border-t border-dashed"
              style={{
                bottom: `${minSafe}%`,
                borderColor: 'color-mix(in srgb, var(--warn) 70%, transparent)',
              }}
            />

            {/* liquid fill */}
            <div
              className="absolute inset-x-0 bottom-0 transition-all duration-700 ease-out"
              style={{
                height: `${pct}%`,
                background: `linear-gradient(180deg, color-mix(in srgb, ${fillColor} 85%, white), ${fillColor})`,
                boxShadow: `0 0 16px color-mix(in srgb, ${fillColor} 35%, transparent)`,
              }}
            >
              {/* surface sheen */}
              <div
                className="absolute inset-x-0 top-0 h-1.5 opacity-70"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                }}
              />
            </div>

            {/* vial gloss */}
            <div
              className="pointer-events-none absolute inset-y-2 left-1 w-1.5 rounded-full opacity-30"
              style={{ background: 'linear-gradient(180deg, white, transparent)' }}
            />
          </div>

          {/* base stand */}
          <div
            className="mx-auto mt-0.5 h-1.5 w-16 rounded-b-md"
            style={{ background: 'color-mix(in srgb, var(--accent) 35%, var(--border))' }}
          />
        </div>
      </div>

      <div className="mt-3 text-center">
        <p className="font-display text-2xl font-bold" style={{ color: fillColor }}>
          {pct.toFixed(0)}
          <span className="ml-0.5 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            %
          </span>
        </p>
        <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-faint)' }}>
          HC-SR04 depth · {capacityLabel}
        </p>
        <p
          className="mt-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: low ? 'var(--danger)' : 'var(--ok)' }}
        >
          {low ? 'Restock required' : 'Level OK'}
        </p>
      </div>
    </div>
  );
}
