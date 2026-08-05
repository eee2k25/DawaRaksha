import type { AlertEvent, SensorReading, Thresholds } from './types';

export type FaultId =
  | 'temp-high'
  | 'temp-low'
  | 'humidity'
  | 'door'
  | 'leak'
  | 'gas'
  | 'stock'
  | 'mass'
  | 'multi'
  | 'clear';

export interface FaultDef {
  id: FaultId;
  label: string;
  short: string;
  description: string;
  severity: 'critical' | 'warning' | 'info' | 'ok';
  code: string;
}

export const FAULTS: FaultDef[] = [
  {
    id: 'temp-high',
    label: 'High Temperature',
    short: 'Temp ↑',
    description: 'Push cold-chain over-temp excursion (≈9.8°C)',
    severity: 'warning',
    code: 'EVT-T-HI',
  },
  {
    id: 'temp-low',
    label: 'Low Temperature',
    short: 'Temp ↓',
    description: 'Push under-temp freeze risk (≈0.8°C)',
    severity: 'warning',
    code: 'EVT-T-LO',
  },
  {
    id: 'humidity',
    label: 'Humidity Spike',
    short: 'RH ↑',
    description: 'Relative humidity excursion above threshold',
    severity: 'warning',
    code: 'EVT-RH-HI',
  },
  {
    id: 'door',
    label: 'Door Open',
    short: 'Door',
    description: 'Reed-switch access event',
    severity: 'info',
    code: 'EVT-DOOR',
  },
  {
    id: 'leak',
    label: 'Leak / Wet',
    short: 'Leak',
    description: 'Critical wet-contact inside enclosure',
    severity: 'critical',
    code: 'EVT-LEAK',
  },
  {
    id: 'gas',
    label: 'Gas Anomaly',
    short: 'Gas',
    description: 'MQ raw response above qualitative cutoff',
    severity: 'warning',
    code: 'EVT-GAS',
  },
  {
    id: 'stock',
    label: 'Low Stock',
    short: 'Stock',
    description: 'Ultrasonic fill level below minimum',
    severity: 'warning',
    code: 'EVT-STK-LO',
  },
  {
    id: 'mass',
    label: 'Mass Drop',
    short: 'Mass',
    description: 'Sudden load-cell mass reduction',
    severity: 'warning',
    code: 'EVT-MASS',
  },
  {
    id: 'multi',
    label: 'Cascade Fault',
    short: 'Multi',
    description: 'Door open + temp rise + gas anomaly together',
    severity: 'critical',
    code: 'EVT-T-HI',
  },
  {
    id: 'clear',
    label: 'Clear / Nominal',
    short: 'Clear',
    description: 'Restore safe nominal sensor values',
    severity: 'ok',
    code: 'OK',
  },
];

export function applyFault(
  base: SensorReading,
  faultId: FaultId,
  thresholds: Thresholds
): SensorReading {
  const ts = new Date();
  const nominal: SensorReading = {
    temperature: 5.1,
    humidity: 46,
    stockLevel: Math.max(base.stockLevel, 68),
    mass: Math.max(base.mass, 3.35),
    door: 'closed',
    leak: 'dry',
    gasRaw: 170,
    timestamp: ts,
  };

  switch (faultId) {
    case 'temp-high':
      return { ...nominal, temperature: thresholds.tempMax + 1.8, timestamp: ts };
    case 'temp-low':
      return { ...nominal, temperature: Math.max(0.5, thresholds.tempMin - 1.2), timestamp: ts };
    case 'humidity':
      return { ...nominal, humidity: thresholds.humidityMax + 8, timestamp: ts };
    case 'door':
      return { ...nominal, door: 'open', temperature: 6.4, timestamp: ts };
    case 'leak':
      return { ...nominal, leak: 'wet', humidity: 62, timestamp: ts };
    case 'gas':
      return { ...nominal, gasRaw: thresholds.gasThreshold + 120, timestamp: ts };
    case 'stock':
      return { ...nominal, stockLevel: Math.max(8, thresholds.stockMin - 10), timestamp: ts };
    case 'mass':
      return {
        ...nominal,
        mass: Math.max(1.5, base.mass - thresholds.massDropKg - 0.2),
        timestamp: ts,
      };
    case 'multi':
      return {
        ...nominal,
        temperature: thresholds.tempMax + 2.4,
        door: 'open',
        gasRaw: thresholds.gasThreshold + 90,
        humidity: thresholds.humidityMax + 3,
        timestamp: ts,
      };
    case 'clear':
    default:
      return nominal;
  }
}

export function faultAlert(
  fault: FaultDef,
  reading: SensorReading
): AlertEvent | null {
  if (fault.id === 'clear') return null;
  return {
    id: `fault-${fault.id}-${Date.now()}`,
    code: fault.code,
    title: `Simulated · ${fault.label}`,
    message: `${fault.description}. Live values: T=${reading.temperature}°C RH=${reading.humidity}% door=${reading.door} leak=${reading.leak}.`,
    severity: fault.severity === 'ok' ? 'info' : fault.severity,
    timestamp: reading.timestamp,
    source: 'Fault Simulator',
    acknowledged: false,
    channel: ['local', 'cloud'],
  };
}
