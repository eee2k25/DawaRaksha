import { chartUrl, type ThingSpeakConfig } from '../lib/thingspeak';

const EMBEDS: { field: number; title: string; sub: string }[] = [
  { field: 1, title: 'Temperature', sub: 'Field 1 · °C' },
  { field: 2, title: 'Humidity', sub: 'Field 2 · %RH' },
  { field: 4, title: 'Stock Level', sub: 'Field 4 · %' },
  { field: 7, title: 'Gas Raw', sub: 'Field 7 · ADC' },
];

interface ThingSpeakChartsProps {
  config: ThingSpeakConfig;
  results?: number;
}

/** Live charts rendered by thingspeak.com for the connected channel. */
export function ThingSpeakCharts({ config, results = 60 }: ThingSpeakChartsProps) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            ThingSpeak Charts
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
            Rendered live from channel{' '}
            <span className="font-mono">{config.channelId}</span> on thingspeak.com
          </p>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          Cloud embed
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {EMBEDS.map(({ field, title, sub }) => (
          <div
            key={`${config.channelId}-${field}`}
            className="rounded-2xl border p-3"
            style={{ borderColor: 'var(--border)', background: 'var(--card-bg, var(--surface))' }}
          >
            <div className="mb-2 flex items-baseline justify-between px-1">
              <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                {title}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                {sub}
              </span>
            </div>
            <iframe
              src={chartUrl(field, config, results)}
              title={`ThingSpeak field ${field} — ${title}`}
              className="h-[260px] w-full rounded-xl border-0 bg-white"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
