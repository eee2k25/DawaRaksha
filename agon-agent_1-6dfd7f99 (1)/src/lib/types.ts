export type AlertSeverity = 'critical' | 'warning' | 'info' | 'ok';
export type ConnectionStatus = 'online' | 'degraded' | 'offline';
export type DoorState = 'closed' | 'open';
export type LeakState = 'dry' | 'wet';

export type GasQuality = 'normal' | 'elevated' | 'contamination';

export interface SensorReading {
  temperature: number;
  humidity: number;
  stockLevel: number;
  mass: number;
  door: DoorState;
  leak: LeakState;
  gasRaw: number;
  timestamp: Date;
}

export interface Thresholds {
  tempMin: number;
  tempMax: number;
  humidityMax: number;
  stockMin: number;
  massDropKg: number;
  gasThreshold: number;
}

/** Compliance action recorded when an operator acknowledges an alert */
export interface AckAudit {
  action: string;
  note?: string;
  operator: string;
  at: Date;
}

export interface AlertEvent {
  id: string;
  code: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: Date;
  source: string;
  acknowledged: boolean;
  channel: ('local' | 'cloud' | 'sms')[];
  /** First time this condition was observed in the current episode */
  episodeStartedAt?: Date;
  /** Last time we re-logged / refreshed this sustained condition */
  lastLoggedAt?: Date;
  ack?: AckAudit;
}

export interface HistoryPoint {
  time: string;
  timestamp: number;
  temperature: number;
  humidity: number;
  stockLevel: number;
  mass: number;
  gasRaw: number;
}

export interface ContainerInfo {
  id: string;
  name: string;
  location: string;
  product: string;
  batchId: string;
  capacity: string;
  status: 'healthy' | 'warning' | 'critical';
}

export interface SystemStatus {
  wifi: ConnectionStatus;
  thingspeak: ConnectionStatus;
  gsm: ConnectionStatus;
  esp32: ConnectionStatus;
  lastUpload: Date;
  uptimeHours: number;
  batteryPct: number;
}

/** Edge / hysteresis state for continuous conditions */
export interface AlertLatchState {
  tempHigh: boolean;
  tempLow: boolean;
  humidityHigh: boolean;
  stockLow: boolean;
  gasHigh: boolean;
  doorOpen: boolean;
  leakWet: boolean;
  /** Last fire timestamps by code — used for sustained-event re-log cooldown */
  lastFireAt: Record<string, number>;
  /** Baseline mass for drop detection after clear */
  massBaseline: number | null;
}
