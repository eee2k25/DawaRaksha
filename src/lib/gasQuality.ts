import type { GasQuality } from './types';

export interface GasQualityInfo {
  quality: GasQuality;
  label: string;
  short: string;
  description: string;
  /** 0–100 normalized risk score for UI bars */
  riskPct: number;
  tone: 'ok' | 'warn' | 'crit';
}

/**
 * Map MQ-series raw ADC to an actionable air-quality status.
 * threshold ≈ contamination trip (default 400).
 * Elevated band starts ~70% of threshold (hysteresis-friendly).
 */
export function getGasQuality(raw: number, threshold = 400): GasQualityInfo {
  const elevatedAt = threshold * 0.7;
  const riskPct = Math.max(0, Math.min(100, Math.round((raw / (threshold * 1.25)) * 100)));

  if (raw >= threshold) {
    return {
      quality: 'contamination',
      label: 'Contamination Detected',
      short: 'Contaminated',
      description: `MQ raw ${raw} ADC exceeds trip ${threshold}. Inspect packaging integrity and enclosure air.`,
      riskPct,
      tone: 'crit',
    };
  }

  if (raw >= elevatedAt) {
    return {
      quality: 'elevated',
      label: 'Air Quality: Elevated',
      short: 'Elevated',
      description: `MQ raw ${raw} ADC in caution band (${Math.round(elevatedAt)}–${threshold}). Monitor trend.`,
      riskPct,
      tone: 'warn',
    };
  }

  return {
    quality: 'normal',
    label: 'Air Quality: Normal',
    short: 'Normal',
    description: `MQ raw ${raw} ADC within safe qualitative range (< ${Math.round(elevatedAt)}).`,
    riskPct,
    tone: 'ok',
  };
}
