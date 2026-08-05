import type { Thresholds } from '../lib/types';
import { Thermometer, Droplets, Package, Scale, Wind } from 'lucide-react';

interface ThresholdsPanelProps {
  thresholds: Thresholds;
  onChange: (t: Thresholds) => void;
}

const FIELDS: {
  key: keyof Thresholds;
  label: string;
  unit: string;
  icon: typeof Thermometer;
  min: number;
  max: number;
  step: number;
  hint: string;
}[] = [
  {
    key: 'tempMin',
    label: 'Temp minimum',
    unit: '°C',
    icon: Thermometer,
    min: 0,
    max: 10,
    step: 0.5,
    hint: 'Cold-chain floor (typical 2°C)',
  },
  {
    key: 'tempMax',
    label: 'Temp maximum',
    unit: '°C',
    icon: Thermometer,
    min: 4,
    max: 15,
    step: 0.5,
    hint: 'Cold-chain ceiling (typical 8°C)',
  },
  {
    key: 'humidityMax',
    label: 'Humidity max',
    unit: '%RH',
    icon: Droplets,
    min: 40,
    max: 90,
    step: 1,
    hint: 'Relative humidity excursion limit',
  },
  {
    key: 'stockMin',
    label: 'Stock minimum',
    unit: '%',
    icon: Package,
    min: 5,
    max: 50,
    step: 1,
    hint: 'HC-SR04 fill-level restock alert',
  },
  {
    key: 'massDropKg',
    label: 'Mass drop delta',
    unit: 'kg',
    icon: Scale,
    min: 0.05,
    max: 1,
    step: 0.05,
    hint: 'HX711 significant change trigger',
  },
  {
    key: 'gasThreshold',
    label: 'Gas raw threshold',
    unit: 'ADC',
    icon: Wind,
    min: 200,
    max: 700,
    step: 10,
    hint: 'MQ qualitative anomaly cutoff',
  },
];

export function ThresholdsPanel({ thresholds, onChange }: ThresholdsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="panel p-5">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Alert Threshold Configuration
        </h3>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Mirrors firmware thresholding on ESP32. Adjust bands for demo scenarios — critical SMS
          still fires on leak and severe temperature excursions.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {FIELDS.map(({ key, label, unit, icon: Icon, min, max, step, hint }) => (
          <div key={key} className="panel p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  <Icon size={15} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {label}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                    {hint}
                  </p>
                </div>
              </div>
              <span className="font-mono text-sm font-bold" style={{ color: 'var(--accent)' }}>
                {thresholds[key]}
                <span className="ml-1 text-[10px] font-medium" style={{ color: 'var(--text-faint)' }}>
                  {unit}
                </span>
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={thresholds[key]}
              onChange={(e) => onChange({ ...thresholds, [key]: parseFloat(e.target.value) })}
              className="w-full"
              style={{ accentColor: 'var(--accent)' }}
            />
            <div
              className="mt-1 flex justify-between text-[10px]"
              style={{ color: 'var(--text-faint)' }}
            >
              <span>
                {min}
                {unit}
              </span>
              <span>
                {max}
                {unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
