import type {
  AlertEvent,
  AlertLatchState,
  SensorReading,
  Thresholds,
} from './types';

/** Hysteresis margins — must fall this far back into band before latch clears */
export const HYSTERESIS = {
  temp: 0.5, // °C
  humidity: 3, // %RH
  stock: 5, // %
  gas: 40, // ADC counts below threshold to clear
} as const;

/**
 * Minimum gap between repeated cloud/UI logs for the SAME sustained condition.
 * Edge transitions (safe → fault) always fire immediately.
 */
export const SUSTAINED_RELOG_MS = 10 * 60 * 1000; // 10 minutes

export function createLatchState(massBaseline?: number): AlertLatchState {
  return {
    tempHigh: false,
    tempLow: false,
    humidityHigh: false,
    stockLow: false,
    gasHigh: false,
    doorOpen: false,
    leakWet: false,
    lastFireAt: {},
    massBaseline: massBaseline ?? null,
  };
}

function mkAlert(
  code: string,
  title: string,
  message: string,
  severity: AlertEvent['severity'],
  source: string,
  ts: Date,
  channel: AlertEvent['channel']
): AlertEvent {
  return {
    id: `${code}-${ts.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    code,
    title,
    message,
    severity,
    timestamp: ts,
    source,
    acknowledged: false,
    channel,
    episodeStartedAt: ts,
    lastLoggedAt: ts,
  };
}

function canRelog(latch: AlertLatchState, code: string, now: number): boolean {
  const last = latch.lastFireAt[code] ?? 0;
  return now - last >= SUSTAINED_RELOG_MS;
}

function markFire(latch: AlertLatchState, code: string, now: number) {
  latch.lastFireAt[code] = now;
}

/**
 * Edge-triggered evaluation with hysteresis + sustained-event cooldown.
 * Only emits alerts when:
 *  - condition newly enters fault (edge), OR
 *  - condition remains faulted AND cooldown elapsed (re-log episode)
 *
 * Continuous "while high" spam is suppressed.
 */
export function evaluateAlertsDebounced(
  reading: SensorReading,
  prev: SensorReading | null,
  thresholds: Thresholds,
  latch: AlertLatchState
): { alerts: AlertEvent[]; latch: AlertLatchState } {
  const next: AlertLatchState = {
    ...latch,
    lastFireAt: { ...latch.lastFireAt },
  };
  const alerts: AlertEvent[] = [];
  const ts = reading.timestamp;
  const now = ts.getTime();

  // ── Temperature high ──────────────────────────────────────
  if (!next.tempHigh && reading.temperature > thresholds.tempMax) {
    next.tempHigh = true;
    markFire(next, 'EVT-T-HI', now);
    alerts.push(
      mkAlert(
        'EVT-T-HI',
        'Temperature High',
        `Internal temp ${reading.temperature}°C exceeds ${thresholds.tempMax}°C cold-chain limit (edge trigger).`,
        reading.temperature > thresholds.tempMax + 2 ? 'critical' : 'warning',
        'DHT22',
        ts,
        ['local', 'cloud', 'sms']
      )
    );
  } else if (
    next.tempHigh &&
    reading.temperature > thresholds.tempMax &&
    canRelog(next, 'EVT-T-HI', now)
  ) {
    markFire(next, 'EVT-T-HI', now);
    alerts.push(
      mkAlert(
        'EVT-T-HI',
        'Temperature High (sustained)',
        `Still elevated at ${reading.temperature}°C after ≥10 min. Episode re-logged for audit.`,
        reading.temperature > thresholds.tempMax + 2 ? 'critical' : 'warning',
        'DHT22',
        ts,
        ['cloud']
      )
    );
  } else if (
    next.tempHigh &&
    reading.temperature <= thresholds.tempMax - HYSTERESIS.temp
  ) {
    next.tempHigh = false;
  }

  // ── Temperature low ───────────────────────────────────────
  if (!next.tempLow && reading.temperature < thresholds.tempMin) {
    next.tempLow = true;
    markFire(next, 'EVT-T-LO', now);
    alerts.push(
      mkAlert(
        'EVT-T-LO',
        'Temperature Low',
        `Internal temp ${reading.temperature}°C below ${thresholds.tempMin}°C floor (edge trigger).`,
        'warning',
        'DHT22',
        ts,
        ['local', 'cloud']
      )
    );
  } else if (
    next.tempLow &&
    reading.temperature < thresholds.tempMin &&
    canRelog(next, 'EVT-T-LO', now)
  ) {
    markFire(next, 'EVT-T-LO', now);
    alerts.push(
      mkAlert(
        'EVT-T-LO',
        'Temperature Low (sustained)',
        `Still below band at ${reading.temperature}°C after ≥10 min.`,
        'warning',
        'DHT22',
        ts,
        ['cloud']
      )
    );
  } else if (
    next.tempLow &&
    reading.temperature >= thresholds.tempMin + HYSTERESIS.temp
  ) {
    next.tempLow = false;
  }

  // ── Humidity ──────────────────────────────────────────────
  if (!next.humidityHigh && reading.humidity > thresholds.humidityMax) {
    next.humidityHigh = true;
    markFire(next, 'EVT-RH-HI', now);
    alerts.push(
      mkAlert(
        'EVT-RH-HI',
        'Humidity Excursion',
        `RH ${reading.humidity}% above ${thresholds.humidityMax}% threshold (edge trigger).`,
        'warning',
        'DHT22',
        ts,
        ['local', 'cloud']
      )
    );
  } else if (
    next.humidityHigh &&
    reading.humidity > thresholds.humidityMax &&
    canRelog(next, 'EVT-RH-HI', now)
  ) {
    markFire(next, 'EVT-RH-HI', now);
    alerts.push(
      mkAlert(
        'EVT-RH-HI',
        'Humidity Excursion (sustained)',
        `RH still ${reading.humidity}% after ≥10 min.`,
        'warning',
        'DHT22',
        ts,
        ['cloud']
      )
    );
  } else if (
    next.humidityHigh &&
    reading.humidity <= thresholds.humidityMax - HYSTERESIS.humidity
  ) {
    next.humidityHigh = false;
  }

  // ── Stock ─────────────────────────────────────────────────
  if (!next.stockLow && reading.stockLevel < thresholds.stockMin) {
    next.stockLow = true;
    markFire(next, 'EVT-STK-LO', now);
    alerts.push(
      mkAlert(
        'EVT-STK-LO',
        'Low Stock Level',
        `Fill level at ${reading.stockLevel}% — restock recommended (edge trigger).`,
        'warning',
        'HC-SR04',
        ts,
        ['cloud']
      )
    );
  } else if (
    next.stockLow &&
    reading.stockLevel < thresholds.stockMin &&
    canRelog(next, 'EVT-STK-LO', now)
  ) {
    markFire(next, 'EVT-STK-LO', now);
    alerts.push(
      mkAlert(
        'EVT-STK-LO',
        'Low Stock Level (sustained)',
        `Fill still ${reading.stockLevel}% after ≥10 min.`,
        'warning',
        'HC-SR04',
        ts,
        ['cloud']
      )
    );
  } else if (
    next.stockLow &&
    reading.stockLevel >= thresholds.stockMin + HYSTERESIS.stock
  ) {
    next.stockLow = false;
  }

  // ── Gas ───────────────────────────────────────────────────
  if (!next.gasHigh && reading.gasRaw > thresholds.gasThreshold) {
    next.gasHigh = true;
    markFire(next, 'EVT-GAS', now);
    alerts.push(
      mkAlert(
        'EVT-GAS',
        'Gas / Contamination',
        `MQ raw ${reading.gasRaw} above trip ${thresholds.gasThreshold} — contamination risk (edge trigger).`,
        'warning',
        'MQ-Series',
        ts,
        ['local', 'cloud']
      )
    );
  } else if (
    next.gasHigh &&
    reading.gasRaw > thresholds.gasThreshold &&
    canRelog(next, 'EVT-GAS', now)
  ) {
    markFire(next, 'EVT-GAS', now);
    alerts.push(
      mkAlert(
        'EVT-GAS',
        'Gas / Contamination (sustained)',
        `MQ raw still ${reading.gasRaw} after ≥10 min.`,
        'warning',
        'MQ-Series',
        ts,
        ['cloud']
      )
    );
  } else if (
    next.gasHigh &&
    reading.gasRaw <= thresholds.gasThreshold - HYSTERESIS.gas
  ) {
    next.gasHigh = false;
  }

  // ── Door (pure edge) ──────────────────────────────────────
  if (reading.door === 'open' && !next.doorOpen) {
    next.doorOpen = true;
    markFire(next, 'EVT-DOOR', now);
    alerts.push(
      mkAlert(
        'EVT-DOOR',
        'Door Opened',
        'Magnetic reed switch detected container access event.',
        'info',
        'MC-38 Reed',
        ts,
        ['local', 'cloud']
      )
    );
  } else if (reading.door === 'closed' && next.doorOpen) {
    next.doorOpen = false;
  }

  // ── Leak (pure edge) ──────────────────────────────────────
  if (reading.leak === 'wet' && !next.leakWet) {
    next.leakWet = true;
    markFire(next, 'EVT-LEAK', now);
    alerts.push(
      mkAlert(
        'EVT-LEAK',
        'Leak / Wet Contact',
        'Wet sensor detected liquid contact inside enclosure.',
        'critical',
        'Wet Sensor',
        ts,
        ['local', 'cloud', 'sms']
      )
    );
  } else if (reading.leak === 'dry' && next.leakWet) {
    next.leakWet = false;
  }

  // ── Mass drop (delta vs baseline / previous) ──────────────
  if (next.massBaseline == null) {
    next.massBaseline = reading.mass;
  }
  const refMass = prev?.mass ?? next.massBaseline;
  const drop = refMass - reading.mass;
  if (drop >= thresholds.massDropKg) {
    const code = 'EVT-MASS';
    // mass drops are discrete events — always log once per significant drop,
    // but still respect a short cooldown so noisy load-cell chatter is muted
    if (canRelog(next, code, now) || !next.lastFireAt[code]) {
      markFire(next, code, now);
      alerts.push(
        mkAlert(
          code,
          'Significant Mass Drop',
          `Mass fell ${(drop * 1000).toFixed(0)} g (ref ${refMass.toFixed(2)} → ${reading.mass.toFixed(2)} kg).`,
          'warning',
          'HX711',
          ts,
          ['local', 'cloud']
        )
      );
      next.massBaseline = reading.mass;
    }
  } else if (reading.mass > (next.massBaseline ?? 0) + 0.05) {
    // restock / add — refresh baseline quietly
    next.massBaseline = reading.mass;
  }

  return { alerts, latch: next };
}

/** Merge incoming alerts; drop near-duplicate codes already active & unacked */
export function mergeAlertsSmart(
  existing: AlertEvent[],
  incoming: AlertEvent[],
  windowMs = 60_000
): AlertEvent[] {
  if (!incoming.length) return existing;
  const now = Date.now();
  const activeCodes = new Set(
    existing
      .filter((a) => !a.acknowledged && now - a.timestamp.getTime() < windowMs * 30)
      .map((a) => a.code.replace(' (sustained)', '').split(' ')[0] || a.code)
  );

  // Also key by base code without sustained suffix
  const base = (code: string) => code.replace(/\s*\(sustained\)\s*/i, '').trim();

  const fresh = incoming.filter((a) => {
    const b = base(a.code);
    // Allow sustained re-logs (they have different title) but not duplicate edge spam
    if (a.title.includes('sustained')) return true;
    if (activeCodes.has(b) || activeCodes.has(a.code)) {
      // already have unacked episode of this type
      return false;
    }
    return true;
  });

  if (!fresh.length) return existing;
  // Mark codes as active
  for (const f of fresh) activeCodes.add(base(f.code));
  return [...fresh, ...existing].slice(0, 80);
}

/** Pharma compliance actions offered at ACK time */
export const ACK_ACTIONS: { value: string; label: string; codes?: string[] }[] = [
  { value: 'door-secured', label: 'Door secured / access closed', codes: ['EVT-DOOR'] },
  { value: 'cooling-checked', label: 'Cooling unit inspected & verified', codes: ['EVT-T-HI', 'EVT-T-LO'] },
  { value: 'temp-probe-reseat', label: 'Temperature probe reseated / recalibrated', codes: ['EVT-T-HI', 'EVT-T-LO'] },
  { value: 'humidity-control', label: 'Humidity control adjusted / desiccant checked', codes: ['EVT-RH-HI'] },
  { value: 'leak-contained', label: 'Leak contained · packaging isolated', codes: ['EVT-LEAK'] },
  { value: 'air-purged', label: 'Enclosure ventilated · source investigated', codes: ['EVT-GAS'] },
  { value: 'restocked', label: 'Stock replenished / inventory updated', codes: ['EVT-STK-LO', 'EVT-MASS'] },
  { value: 'false-positive', label: 'False positive · sensor noise / test inject' },
  { value: 'escalated', label: 'Escalated to supervisor / QA' },
  { value: 'monitoring', label: 'Monitoring only · no corrective action yet' },
  { value: 'other', label: 'Other (see note)' },
];

export function suggestedActionsFor(code: string) {
  const base = code.replace(/\s*\(sustained\)\s*/i, '').trim();
  const preferred = ACK_ACTIONS.filter((a) => a.codes?.includes(base));
  const rest = ACK_ACTIONS.filter((a) => !a.codes || !a.codes.includes(base));
  return [...preferred, ...rest];
}
