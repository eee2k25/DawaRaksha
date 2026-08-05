import { ARCHITECTURE_LAYERS, EVENT_CODE_LEGEND } from '../lib/mockData';
import { severityColor } from '../lib/format';
import { ArrowRight } from 'lucide-react';

export function ArchitectureView() {
  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl border p-5"
        style={{
          borderColor: 'var(--border-strong)',
          background: 'linear-gradient(135deg, var(--accent-soft), transparent 60%, var(--danger-soft))',
        }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: 'var(--accent)' }}
        >
          DawaRaksh · Proposed Block Diagram
        </p>
        <h3 className="mt-1 font-display text-xl font-bold" style={{ color: 'var(--text)' }}>
          Multi-sensor container · ESP32 · cloud + GSM
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Sensing layer feeds the ESP32 processing layer for filtering, debouncing and event-code
          generation. Data streams over Wi-Fi to ThingSpeak while SIM900A provides SMS backup.
          PHARMA//VAULT visualizes live state, history and alerts.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ARCHITECTURE_LAYERS.map((layer, idx) => (
          <div key={layer.title} className="panel relative p-4">
            {idx < ARCHITECTURE_LAYERS.length - 1 && (
              <ArrowRight
                className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 xl:block"
                size={16}
                style={{ color: 'var(--accent)', opacity: 0.45 }}
              />
            )}
            <p
              className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: 'var(--accent)' }}
            >
              Layer 0{idx + 1}
            </p>
            <h4 className="mb-3 font-display text-base font-semibold" style={{ color: 'var(--text)' }}>
              {layer.title}
            </h4>
            <ul className="space-y-2">
              {layer.items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs"
                  style={{ background: 'var(--chip-bg)', color: 'var(--text-muted)' }}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="panel p-5">
        <h3 className="mb-1 text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Event Code Legend
        </h3>
        <p className="mb-4 text-xs" style={{ color: 'var(--text-faint)' }}>
          Firmware generates coded events for local LEDs, cloud logs and SMS payloads
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {EVENT_CODE_LEGEND.map((e) => {
            const c = severityColor(e.severity);
            return (
              <div
                key={e.code}
                className={`flex items-start gap-3 rounded-xl border ${c.border} ${c.bg} px-3 py-2.5`}
              >
                <span className={`font-mono text-xs font-bold ${c.text}`}>{e.code}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {e.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { k: '6+', v: 'Sensor inputs & states' },
          { k: '3', v: 'Alert layers: local, cloud, GSM' },
          { k: 'ESP32', v: 'Unified controller architecture' },
        ].map((stat) => (
          <div key={stat.k} className="panel p-5 text-center">
            <p className="font-display text-3xl font-bold" style={{ color: 'var(--accent)' }}>
              {stat.k}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {stat.v}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
