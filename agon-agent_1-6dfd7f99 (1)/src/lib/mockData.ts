import type {
  AlertEvent,
  ContainerInfo,
  HistoryPoint,
  SensorReading,
  SystemStatus,
  Thresholds,
} from './types';

export const THRESHOLDS: Thresholds = {
  tempMin: 2,
  tempMax: 8,
  humidityMax: 60,
  stockMin: 25,
  massDropKg: 0.15,
  gasThreshold: 400,
};

export const CONTAINER: ContainerInfo = {
  id: 'DR-001',
  name: 'Cold-Chain Vault A',
  location: 'BIET Pharma Lab · Bay 2',
  product: 'Temperature-sensitive vaccines',
  batchId: 'VX-2026-0412',
  capacity: '5 kg / 12 vials',
  status: 'healthy',
};

const now = Date.now();

function jitter(base: number, amp: number) {
  return base + (Math.random() - 0.5) * amp;
}

export function generateHistory(hours = 24): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  const steps = hours * 12; // every 5 min
  for (let i = steps; i >= 0; i--) {
    const t = now - i * 5 * 60 * 1000;
    const hour = new Date(t).getHours();
    // slight diurnal drift
    const tempBase = 4.8 + Math.sin((hour / 24) * Math.PI * 2) * 0.6;
    const stockBase = 72 - (steps - i) * 0.02;
    const massBase = 3.45 - (steps - i) * 0.001;

    // inject a few excursion events for realism
    let temp = jitter(tempBase, 0.35);
    let humidity = jitter(48, 4);
    let gas = jitter(180, 30);

    if (i === Math.floor(steps * 0.35)) temp = 9.2;
    if (i === Math.floor(steps * 0.36)) temp = 8.6;
    if (i === Math.floor(steps * 0.7)) humidity = 64;
    if (i === Math.floor(steps * 0.15)) gas = 520;

    points.push({
      time: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: t,
      temperature: Math.round(temp * 10) / 10,
      humidity: Math.round(humidity * 10) / 10,
      stockLevel: Math.max(20, Math.round(stockBase * 10) / 10),
      mass: Math.max(2.5, Math.round(massBase * 100) / 100),
      gasRaw: Math.round(gas),
    });
  }
  return points;
}

export function createInitialReading(): SensorReading {
  return {
    temperature: 5.1,
    humidity: 47.2,
    stockLevel: 68,
    mass: 3.32,
    door: 'closed',
    leak: 'dry',
    gasRaw: 175,
    timestamp: new Date(),
  };
}

export function nextReading(prev: SensorReading): SensorReading {
  const roll = Math.random();
  let door = prev.door;
  let leak = prev.leak;

  // rare door open pulse
  if (door === 'open') {
    door = Math.random() > 0.4 ? 'closed' : 'open';
  } else if (roll > 0.97) {
    door = 'open';
  }

  // very rare leak
  if (leak === 'wet') {
    leak = Math.random() > 0.3 ? 'dry' : 'wet';
  } else if (roll < 0.008) {
    leak = 'wet';
  }

  const tempDrift =
    door === 'open' ? jitter(0.4, 0.5) : jitter(0, 0.15);
  const humidityDrift = door === 'open' ? jitter(1.2, 1) : jitter(0, 0.4);

  let temperature = Math.min(12, Math.max(1, prev.temperature + tempDrift));
  // gently pull back toward safe zone
  temperature += (5 - temperature) * 0.08;

  let humidity = Math.min(75, Math.max(30, prev.humidity + humidityDrift));
  humidity += (48 - humidity) * 0.06;

  const stockLevel = Math.max(
    15,
    Math.min(100, prev.stockLevel + jitter(-0.05, 0.12))
  );
  const mass = Math.max(2.2, Math.min(5, prev.mass + jitter(-0.002, 0.006)));

  let gasRaw = prev.gasRaw + jitter(0, 12);
  if (roll > 0.985) gasRaw = 480 + Math.random() * 80;
  gasRaw += (175 - gasRaw) * 0.1;
  gasRaw = Math.max(80, Math.min(700, gasRaw));

  return {
    temperature: Math.round(temperature * 10) / 10,
    humidity: Math.round(humidity * 10) / 10,
    stockLevel: Math.round(stockLevel * 10) / 10,
    mass: Math.round(mass * 100) / 100,
    door,
    leak,
    gasRaw: Math.round(gasRaw),
    timestamp: new Date(),
  };
}

export function evaluateAlerts(
  reading: SensorReading,
  prev: SensorReading | null,
  thresholds: Thresholds
): AlertEvent[] {
  const alerts: AlertEvent[] = [];
  const ts = reading.timestamp;

  if (reading.temperature > thresholds.tempMax) {
    alerts.push({
      id: `T-HI-${ts.getTime()}`,
      code: 'EVT-T-HI',
      title: 'Temperature High',
      message: `Internal temp ${reading.temperature}°C exceeds ${thresholds.tempMax}°C cold-chain limit.`,
      severity: reading.temperature > thresholds.tempMax + 2 ? 'critical' : 'warning',
      timestamp: ts,
      source: 'DHT22',
      acknowledged: false,
      channel: ['local', 'cloud', 'sms'],
    });
  }
  if (reading.temperature < thresholds.tempMin) {
    alerts.push({
      id: `T-LO-${ts.getTime()}`,
      code: 'EVT-T-LO',
      title: 'Temperature Low',
      message: `Internal temp ${reading.temperature}°C below ${thresholds.tempMin}°C floor.`,
      severity: 'warning',
      timestamp: ts,
      source: 'DHT22',
      acknowledged: false,
      channel: ['local', 'cloud'],
    });
  }
  if (reading.humidity > thresholds.humidityMax) {
    alerts.push({
      id: `RH-HI-${ts.getTime()}`,
      code: 'EVT-RH-HI',
      title: 'Humidity Excursion',
      message: `RH ${reading.humidity}% above ${thresholds.humidityMax}% threshold.`,
      severity: 'warning',
      timestamp: ts,
      source: 'DHT22',
      acknowledged: false,
      channel: ['local', 'cloud'],
    });
  }
  if (reading.stockLevel < thresholds.stockMin) {
    alerts.push({
      id: `STK-${ts.getTime()}`,
      code: 'EVT-STK-LO',
      title: 'Low Stock Level',
      message: `Fill level at ${reading.stockLevel}% — restock recommended.`,
      severity: 'warning',
      timestamp: ts,
      source: 'HC-SR04',
      acknowledged: false,
      channel: ['cloud'],
    });
  }
  if (prev && prev.mass - reading.mass >= thresholds.massDropKg) {
    alerts.push({
      id: `MASS-${ts.getTime()}`,
      code: 'EVT-MASS',
      title: 'Significant Mass Drop',
      message: `Mass fell ${((prev.mass - reading.mass) * 1000).toFixed(0)} g — possible removal.`,
      severity: 'warning',
      timestamp: ts,
      source: 'HX711',
      acknowledged: false,
      channel: ['local', 'cloud'],
    });
  }
  if (reading.door === 'open' && (!prev || prev.door === 'closed')) {
    alerts.push({
      id: `DOOR-${ts.getTime()}`,
      code: 'EVT-DOOR',
      title: 'Door Opened',
      message: 'Magnetic reed switch detected container access event.',
      severity: 'info',
      timestamp: ts,
      source: 'MC-38 Reed',
      acknowledged: false,
      channel: ['local', 'cloud'],
    });
  }
  if (reading.leak === 'wet' && (!prev || prev.leak === 'dry')) {
    alerts.push({
      id: `LEAK-${ts.getTime()}`,
      code: 'EVT-LEAK',
      title: 'Leak / Wet Contact',
      message: 'Wet sensor detected liquid contact inside enclosure.',
      severity: 'critical',
      timestamp: ts,
      source: 'Wet Sensor',
      acknowledged: false,
      channel: ['local', 'cloud', 'sms'],
    });
  }
  if (reading.gasRaw > thresholds.gasThreshold) {
    alerts.push({
      id: `GAS-${ts.getTime()}`,
      code: 'EVT-GAS',
      title: 'Gas Anomaly',
      message: `MQ raw response ${reading.gasRaw} above qualitative threshold ${thresholds.gasThreshold}.`,
      severity: 'warning',
      timestamp: ts,
      source: 'MQ-Series',
      acknowledged: false,
      channel: ['local', 'cloud'],
    });
  }

  return alerts;
}

export const SEED_ALERTS: AlertEvent[] = [
  {
    id: 'seed-1',
    code: 'EVT-T-HI',
    title: 'Temperature High',
    message: 'Internal temp 9.2°C exceeds 8°C cold-chain limit.',
    severity: 'warning',
    timestamp: new Date(now - 1000 * 60 * 95),
    source: 'DHT22',
    acknowledged: true,
    channel: ['local', 'cloud', 'sms'],
  },
  {
    id: 'seed-2',
    code: 'EVT-DOOR',
    title: 'Door Opened',
    message: 'Magnetic reed switch detected container access event.',
    severity: 'info',
    timestamp: new Date(now - 1000 * 60 * 180),
    source: 'MC-38 Reed',
    acknowledged: true,
    channel: ['local', 'cloud'],
  },
  {
    id: 'seed-3',
    code: 'EVT-GAS',
    title: 'Gas Anomaly',
    message: 'MQ raw response 520 above qualitative threshold 400.',
    severity: 'warning',
    timestamp: new Date(now - 1000 * 60 * 320),
    source: 'MQ-Series',
    acknowledged: true,
    channel: ['local', 'cloud'],
  },
  {
    id: 'seed-4',
    code: 'EVT-RH-HI',
    title: 'Humidity Excursion',
    message: 'RH 64% above 60% threshold.',
    severity: 'warning',
    timestamp: new Date(now - 1000 * 60 * 410),
    source: 'DHT22',
    acknowledged: true,
    channel: ['local', 'cloud'],
  },
];

export function createSystemStatus(): SystemStatus {
  return {
    wifi: 'online',
    thingspeak: 'online',
    gsm: 'online',
    esp32: 'online',
    lastUpload: new Date(),
    uptimeHours: 47.6,
    batteryPct: 92,
  };
}

export const EVENT_CODE_LEGEND = [
  { code: 'EVT-T-HI', desc: 'Temperature above cold-chain max', severity: 'warning' as const },
  { code: 'EVT-T-LO', desc: 'Temperature below cold-chain min', severity: 'warning' as const },
  { code: 'EVT-RH-HI', desc: 'Relative humidity excursion', severity: 'warning' as const },
  { code: 'EVT-STK-LO', desc: 'Ultrasonic stock below minimum', severity: 'warning' as const },
  { code: 'EVT-MASS', desc: 'Load-cell mass drop detected', severity: 'warning' as const },
  { code: 'EVT-DOOR', desc: 'Reed-switch door open event', severity: 'info' as const },
  { code: 'EVT-LEAK', desc: 'Wet-contact / leakage detected', severity: 'critical' as const },
  { code: 'EVT-GAS', desc: 'MQ qualitative gas anomaly', severity: 'warning' as const },
];

export const ARCHITECTURE_LAYERS = [
  {
    title: 'Sensing',
    items: ['DHT22 Temp/RH', 'HC-SR04 Stock', 'HX711 Mass', 'Reed Door', 'Wet Leak', 'MQ Gas'],
  },
  {
    title: 'Processing',
    items: ['ESP32 DevKit', 'Filter / Debounce', 'Event Logic', 'Fault Handling'],
  },
  {
    title: 'Communication',
    items: ['Wi-Fi Hotspot', 'ThingSpeak Cloud', 'SIM900A SMS Backup'],
  },
  {
    title: 'Visualization & Alert',
    items: ['PHARMA//VAULT UI', 'Buzzer + RGB LEDs', 'Event Codes', 'History Trends'],
  },
];
