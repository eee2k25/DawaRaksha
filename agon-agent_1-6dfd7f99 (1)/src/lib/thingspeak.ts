import type { DoorState, HistoryPoint, LeakState, SensorReading } from './types';

/**
 * DawaRaksh ThingSpeak channel configuration
 * Field map (channel 3444984):
 *  1 Temperature · 2 Humidity · 3 Mass · 4 Stock level
 *  5 Door State  · 6 Leak State · 7 Gas Raw · 8 Event Code
 */
export const THINGSPEAK = {
  channelId: 3444984,
  readKey: 'DHSLAMWUOPOPMVVY',
  writeKey: '2JEC9DR8ZHUJ8T0N',
  baseUrl: 'https://api.thingspeak.com',
  /** Free-tier friendly poll interval (ms) */
  pollMs: 15_000,
  /** Max historical points to pull */
  historyResults: 200,
} as const;

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
  results = THINGSPEAK.historyResults
): Promise<ThingSpeakResponse> {
  const url =
    `${THINGSPEAK.baseUrl}/channels/${THINGSPEAK.channelId}/feeds.json` +
    `?api_key=${encodeURIComponent(THINGSPEAK.readKey)}` +
    `&results=${results}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ThingSpeak read failed (${res.status})`);
  }
  return (await res.json()) as ThingSpeakResponse;
}

export async function fetchLastFeed(): Promise<ParsedFeed | null> {
  const url =
    `${THINGSPEAK.baseUrl}/channels/${THINGSPEAK.channelId}/feeds/last.json` +
    `?api_key=${encodeURIComponent(THINGSPEAK.readKey)}`;

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
export async function writeFeed(payload: WritePayload): Promise<number> {
  const params = new URLSearchParams({
    api_key: THINGSPEAK.writeKey,
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
