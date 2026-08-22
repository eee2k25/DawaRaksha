import type { DoorState, HistoryPoint, LeakState, SensorReading } from './types';

/**
 * DawaRaksh ⇄ ThingSpeak integration
 * ---------------------------------------------------------------------------
 * Field map (channel 3444984 by default):
 *  1 Temperature · 2 Humidity · 3 Mass · 4 Stock level
 *  5 Door State  · 6 Leak State · 7 Gas Raw · 8 Event Code
 *
 * The channel can be changed at runtime via the in-app Settings panel
 * (persisted in localStorage) or at build time via VITE_THINGSPEAK_* env vars.
 */

export interface ThingSpeakConfig {
  channelId: number;
  readKey: string;
  writeKey: string;
}

/** Channel that ships with the project — works out of the box. */
export const DEFAULT_THINGSPEAK: ThingSpeakConfig = {
  channelId: 3444984,
  readKey: 'DHSLAMWUOPOPMVVY',
  writeKey: '2JEC9DR8ZHUJ8T0N',
};

export const THINGSPEAK = {
  baseUrl: 'https://api.thingspeak.com',
  /** Free-tier friendly poll interval (ms) */
  pollMs: 15_000,
  /** Max historical points to pull (ThingSpeak free-tier max per request) */
  historyResults: 800,
} as const;

const STORAGE_KEY = 'dawaraksh-thingspeak-config';

function envConfig(): Partial<ThingSpeakConfig> {
  const env = import.meta.env as Record<string, string | undefined>;
  const cfg: Partial<ThingSpeakConfig> = {};
  const id = parseInt(env.VITE_THINGSPEAK_CHANNEL_ID ?? '', 10);
  if (Number.isFinite(id) && id > 0) cfg.channelId = id;
  if (env.VITE_THINGSPEAK_READ_KEY) cfg.readKey = env.VITE_THINGSPEAK_READ_KEY;
  if (env.VITE_THINGSPEAK_WRITE_KEY) cfg.writeKey = env.VITE_THINGSPEAK_WRITE_KEY;
  return cfg;
}

/** localStorage override → env vars → bundled default. */
export function loadThingSpeakConfig(): ThingSpeakConfig {
  let stored: Partial<ThingSpeakConfig> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) as Partial<ThingSpeakConfig>;
  } catch {
    /* corrupted entry — ignore */
  }
  const merged: ThingSpeakConfig = { ...DEFAULT_THINGSPEAK, ...envConfig(), ...stored };
  if (!Number.isFinite(merged.channelId) || merged.channelId <= 0) {
    merged.channelId = DEFAULT_THINGSPEAK.channelId;
  }
  return merged;
}

export function saveThingSpeakConfig(cfg: ThingSpeakConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    /* storage unavailable — config stays for this session only */
  }
}

export function resetThingSpeakConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isDefaultConfig(cfg: ThingSpeakConfig): boolean {
  return (
    cfg.channelId === DEFAULT_THINGSPEAK.channelId &&
    cfg.readKey === DEFAULT_THINGSPEAK.readKey &&
    cfg.writeKey === DEFAULT_THINGSPEAK.writeKey
  );
}

export interface ThingSpeakFeed {
  created_at: string;
  entry_id: number;
  field1: string | null;
  field2: string | null;
  field3: string | null;
  field4: string | null;
  field5: string | null;
  field6: string | null;
  field7: string | null;
  field8: string | null;
}

export interface ThingSpeakChannelMeta {
  id: number;
  name: string;
  description: string;
  field1?: string;
  field2?: string;
  field3?: string;
  field4?: string;
  field5?: string;
  field6?: string;
  field7?: string;
  field8?: string;
  latitude?: string;
  longitude?: string;
  created_at?: string;
  updated_at?: string;
  last_entry_id?: number | null;
}

export interface ThingSpeakResponse {
  channel: ThingSpeakChannelMeta;
  feeds: ThingSpeakFeed[];
}

export interface ParsedFeed extends SensorReading {
  entryId: number;
  eventCode: string;
}

function num(v: string | null | undefined, fallback = 0): number {
  if (v == null || v === '') return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseDoor(v: string | null | undefined): DoorState {
  if (v == null) return 'closed';
  const s = String(v).trim().toLowerCase();
  if (s === '1' || s === 'open' || s === 'true' || s === 'yes') return 'open';
  return 'closed';
}

function parseLeak(v: string | null | undefined): LeakState {
  if (v == null) return 'dry';
  const s = String(v).trim().toLowerCase();
  if (s === '1' || s === 'wet' || s === 'true' || s === 'leak' || s === 'yes') return 'wet';
  return 'dry';
}

export function parseFeed(feed: ThingSpeakFeed): ParsedFeed {
  return {
    entryId: feed.entry_id,
    temperature: num(feed.field1),
    humidity: num(feed.field2),
    mass: num(feed.field3),
    stockLevel: num(feed.field4),
    door: parseDoor(feed.field5),
    leak: parseLeak(feed.field6),
    gasRaw: Math.round(num(feed.field7)),
    eventCode: (feed.field8 ?? 'OK').trim() || 'OK',
    timestamp: new Date(feed.created_at),
  };
}

export function toHistoryPoint(p: ParsedFeed): HistoryPoint {
  return {
    time: p.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: p.timestamp.getTime(),
    temperature: p.temperature,
    humidity: p.humidity,
    stockLevel: p.stockLevel,
    mass: p.mass,
    gasRaw: p.gasRaw,
  };
}

export async function fetchChannelFeeds(
  results = THINGSPEAK.historyResults,
  cfg: ThingSpeakConfig = loadThingSpeakConfig()
): Promise<ThingSpeakResponse> {
  const url =
    `${THINGSPEAK.baseUrl}/channels/${cfg.channelId}/feeds.json` +
    `?api_key=${encodeURIComponent(cfg.readKey)}` +
    `&results=${results}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ThingSpeak read failed (${res.status})`);
  }
  return (await res.json()) as ThingSpeakResponse;
}

/** Cheap poll — one entry instead of the full history. */
export async function fetchLastFeed(
  cfg: ThingSpeakConfig = loadThingSpeakConfig()
): Promise<ParsedFeed | null> {
  const url =
    `${THINGSPEAK.baseUrl}/channels/${cfg.channelId}/feeds/last.json` +
    `?api_key=${encodeURIComponent(cfg.readKey)}`;

  const res = await fetch(url);
  if (!res.ok) {
    // 404 when channel has no entries yet
    if (res.status === 404) return null;
    throw new Error(`ThingSpeak last feed failed (${res.status})`);
  }
  const text = await res.text();
  if (!text || text === '-1' || text === 'null') return null;
  const feed = JSON.parse(text) as ThingSpeakFeed;
  if (!feed.entry_id && !feed.created_at) return null;
  return parseFeed(feed);
}

/** Channel metadata — used by the Settings panel to verify a configuration. */
export async function fetchChannelInfo(
  cfg: ThingSpeakConfig = loadThingSpeakConfig()
): Promise<ThingSpeakChannelMeta> {
  const url =
    `${THINGSPEAK.baseUrl}/channels/${cfg.channelId}.json` +
    `?api_key=${encodeURIComponent(cfg.readKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Channel not found — check the channel ID');
    if (res.status === 401) throw new Error('Read key rejected for this channel');
    throw new Error(`Channel check failed (${res.status})`);
  }
  return (await res.json()) as ThingSpeakChannelMeta;
}

export interface WritePayload {
  temperature: number;
  humidity: number;
  mass: number;
  stockLevel: number;
  door: DoorState;
  leak: LeakState;
  gasRaw: number;
  eventCode?: string;
}

/** Upload one reading (ESP32 equivalent). Free tier: ≥15s between writes. */
export async function writeFeed(
  payload: WritePayload,
  cfg: ThingSpeakConfig = loadThingSpeakConfig()
): Promise<number> {
  const params = new URLSearchParams({
    api_key: cfg.writeKey,
    field1: String(payload.temperature),
    field2: String(payload.humidity),
    field3: String(payload.mass),
    field4: String(payload.stockLevel),
    field5: payload.door === 'open' ? '1' : '0',
    field6: payload.leak === 'wet' ? '1' : '0',
    field7: String(payload.gasRaw),
    field8: payload.eventCode ?? 'OK',
  });

  const res = await fetch(`${THINGSPEAK.baseUrl}/update?${params.toString()}`);
  const text = (await res.text()).trim();
  const entryId = parseInt(text, 10);
  if (!res.ok || !entryId || entryId < 1) {
    throw new Error(
      entryId === 0
        ? 'ThingSpeak rejected write (rate limit — wait 15s)'
        : `ThingSpeak write failed: ${text}`
    );
  }
  return entryId;
}

export function deriveEventCode(
  reading: Omit<WritePayload, 'eventCode'>,
  thresholds: {
    tempMin: number;
    tempMax: number;
    humidityMax: number;
    stockMin: number;
    gasThreshold: number;
  }
): string {
  if (reading.leak === 'wet') return 'EVT-LEAK';
  if (reading.temperature > thresholds.tempMax) return 'EVT-T-HI';
  if (reading.temperature < thresholds.tempMin) return 'EVT-T-LO';
  if (reading.humidity > thresholds.humidityMax) return 'EVT-RH-HI';
  if (reading.stockLevel < thresholds.stockMin) return 'EVT-STK-LO';
  if (reading.gasRaw > thresholds.gasThreshold) return 'EVT-GAS';
  if (reading.door === 'open') return 'EVT-DOOR';
  return 'OK';
}

/** Embeddable ThingSpeak chart URL for a field (works with a read key). */
export function chartUrl(
  field: number,
  cfg: ThingSpeakConfig = loadThingSpeakConfig(),
  results = 60
): string {
  const params = new URLSearchParams({
    api_key: cfg.readKey,
    width: 'auto',
    height: '260',
    results: String(results),
  });
  return `https://thingspeak.com/channels/${cfg.channelId}/charts/${field}?${params.toString()}`;
}

export function channelUrl(cfg: ThingSpeakConfig = loadThingSpeakConfig()): string {
  return `https://thingspeak.com/channels/${cfg.channelId}`;
}

/** Serialize history to CSV for reports / offline analysis. */
export function historyToCsv(points: HistoryPoint[]): string {
  const header = 'timestamp,iso_time,temperature_c,humidity_pct,mass_kg,stock_pct,gas_raw';
  const rows = points.map((p) => {
    const iso = new Date(p.timestamp).toISOString();
    return [
      p.timestamp,
      iso,
      p.temperature.toFixed(2),
      p.humidity.toFixed(2),
      p.mass.toFixed(3),
      p.stockLevel.toFixed(1),
      String(p.gasRaw),
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

export const FIELD_MAP = [
  { field: 'field1', name: 'Temperature', unit: '°C' },
  { field: 'field2', name: 'Humidity', unit: '%RH' },
  { field: 'field3', name: 'Mass', unit: 'kg' },
  { field: 'field4', name: 'Stock level', unit: '%' },
  { field: 'field5', name: 'Door State', unit: '0/1' },
  { field: 'field6', name: 'Leak State', unit: '0/1' },
  { field: 'field7', name: 'Gas Raw', unit: 'ADC' },
  { field: 'field8', name: 'Event Code', unit: 'code' },
] as const;
