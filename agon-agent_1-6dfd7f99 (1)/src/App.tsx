import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Droplets,
  Package,
  Scale,
  Thermometer,
  Wind,
} from 'lucide-react';
import { Sidebar, type NavId } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { StatCard } from './components/StatCard';
import { SensorGauge } from './components/SensorGauge';
import { AlertList } from './components/AlertList';
import { HistoryCharts } from './components/HistoryCharts';
import { SystemPanel } from './components/SystemPanel';
import { ArchitectureView } from './components/ArchitectureView';
import { ThresholdsPanel } from './components/ThresholdsPanel';
import { ContainerStatus } from './components/ContainerStatus';
import { ConnectionBar } from './components/ConnectionBar';
import { FaultSimulator } from './components/FaultSimulator';
import {
  CONTAINER,
  SEED_ALERTS,
  THRESHOLDS,
  createInitialReading,
  createSystemStatus,
  evaluateAlerts,
  generateHistory,
  nextReading,
} from './lib/mockData';
import {
  THINGSPEAK,
  deriveEventCode,
  fetchChannelFeeds,
  parseFeed,
  toHistoryPoint,
  writeFeed,
  type ParsedFeed,
} from './lib/thingspeak';
import { FAULTS, applyFault, faultAlert, type FaultId } from './lib/faults';
import { useTheme } from './lib/theme';
import type {
  AlertEvent,
  ConnectionStatus,
  HistoryPoint,
  SensorReading,
  Thresholds,
} from './lib/types';
import { formatRelative } from './lib/format';

type DataMode = 'cloud' | 'demo';

function deriveOverall(
  reading: SensorReading,
  alerts: AlertEvent[],
  thresholds: Thresholds
): 'healthy' | 'warning' | 'critical' {
  const active = alerts.filter((a) => !a.acknowledged);
  if (
    active.some((a) => a.severity === 'critical') ||
    reading.leak === 'wet' ||
    reading.temperature > thresholds.tempMax + 2
  ) {
    return 'critical';
  }
  if (
    active.some((a) => a.severity === 'warning') ||
    reading.temperature > thresholds.tempMax ||
    reading.temperature < thresholds.tempMin ||
    reading.humidity > thresholds.humidityMax ||
    reading.door === 'open'
  ) {
    return 'warning';
  }
  return 'healthy';
}

function eventCodeAlert(feed: ParsedFeed): AlertEvent | null {
  const code = feed.eventCode.toUpperCase();
  if (!code || code === 'OK' || code === '0' || code === 'NONE' || code === 'NOM') {
    return null;
  }

  const map: Record<
    string,
    { title: string; severity: AlertEvent['severity']; source: string; message: string }
  > = {
    'EVT-T-HI': {
      title: 'Temperature High',
      severity: 'warning',
      source: 'DHT22',
      message: `Cloud event: temp ${feed.temperature}°C above cold-chain max.`,
    },
    'EVT-T-LO': {
      title: 'Temperature Low',
      severity: 'warning',
      source: 'DHT22',
      message: `Cloud event: temp ${feed.temperature}°C below cold-chain min.`,
    },
    'EVT-RH-HI': {
      title: 'Humidity Excursion',
      severity: 'warning',
      source: 'DHT22',
      message: `Cloud event: RH ${feed.humidity}% excursion.`,
    },
    'EVT-STK-LO': {
      title: 'Low Stock Level',
      severity: 'warning',
      source: 'HC-SR04',
      message: `Cloud event: stock at ${feed.stockLevel}%.`,
    },
    'EVT-MASS': {
      title: 'Significant Mass Drop',
      severity: 'warning',
      source: 'HX711',
      message: `Cloud event: mass change detected (${feed.mass} kg).`,
    },
    'EVT-DOOR': {
      title: 'Door Opened',
      severity: 'info',
      source: 'MC-38 Reed',
      message: 'Cloud event: container access opening.',
    },
    'EVT-LEAK': {
      title: 'Leak / Wet Contact',
      severity: 'critical',
      source: 'Wet Sensor',
      message: 'Cloud event: wet contact inside enclosure.',
    },
    'EVT-GAS': {
      title: 'Gas Anomaly',
      severity: 'warning',
      source: 'MQ-Series',
      message: `Cloud event: MQ raw ${feed.gasRaw}.`,
    },
  };

  const meta = map[code] ?? {
    title: `Event ${code}`,
    severity: 'info' as const,
    source: 'ESP32',
    message: `Cloud event code ${code} received from ThingSpeak field8.`,
  };

  return {
    id: `ts-${feed.entryId}-${code}`,
    code,
    title: meta.title,
    message: meta.message,
    severity: meta.severity,
    timestamp: feed.timestamp,
    source: meta.source,
    acknowledged: false,
    channel: ['cloud'],
  };
}

function mergeAlerts(existing: AlertEvent[], incoming: AlertEvent[]): AlertEvent[] {
  const ids = new Set(existing.map((a) => a.id));
  const fresh = incoming.filter((a) => !ids.has(a.id));
  if (!fresh.length) return existing;
  return [...fresh, ...existing].slice(0, 100);
}

export default function App() {
  const { theme, setTheme } = useTheme();
  const [nav, setNav] = useState<NavId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [live, setLive] = useState(true);
  const [mode, setMode] = useState<DataMode>('cloud');
  const [thresholds, setThresholds] = useState<Thresholds>(THRESHOLDS);
  const [reading, setReading] = useState<SensorReading>(createInitialReading);
  const [prevReading, setPrevReading] = useState<SensorReading | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [system, setSystem] = useState(createSystemStatus);
  const [range, setRange] = useState<'6h' | '12h' | '24h'>('24h');
  const [lastTick, setLastTick] = useState(() => new Date());
  const [syncing, setSyncing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [connectingEsp, setConnectingEsp] = useState(false);
  const [espConnected, setEspConnected] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [entryCount, setEntryCount] = useState(0);
  const [lastEntryId, setLastEntryId] = useState<number | null>(null);
  const [cloudStatus, setCloudStatus] = useState<ConnectionStatus>('degraded');
  const [lastFault, setLastFault] = useState<string | null>(null);
  const [faultBusy, setFaultBusy] = useState(false);
  /** Holds a simulated fault over the live stream for a short window */
  const faultHoldRef = useRef<SensorReading | null>(null);
  const faultHoldUntilRef = useRef(0);

  const prevRef = useRef<SensorReading | null>(null);
  const lastEntryRef = useRef<number | null>(null);
  const thresholdsRef = useRef(thresholds);
  thresholdsRef.current = thresholds;

  const applyCloudFeeds = useCallback((feeds: ParsedFeed[]) => {
    if (!feeds.length) {
      setEntryCount(0);
      setLastEntryId(null);
      setCloudStatus('degraded');
      setEspConnected(false);
      setCloudError('Channel is empty — connect ESP32 or push a test reading.');
      return;
    }

    const sorted = [...feeds].sort((a, b) => a.entryId - b.entryId);
    let latest = sorted[sorted.length - 1];
    const prev = sorted.length > 1 ? sorted[sorted.length - 2] : prevRef.current;

    // Overlay local fault hold if still active
    if (faultHoldRef.current && Date.now() < faultHoldUntilRef.current) {
      latest = {
        ...latest,
        ...faultHoldRef.current,
        entryId: latest.entryId,
        eventCode: faultHoldRef.current
          ? deriveEventCode(faultHoldRef.current, thresholdsRef.current)
          : latest.eventCode,
        timestamp: new Date(),
      };
    }

    const th = thresholdsRef.current;
    const sensorAlerts = evaluateAlerts(latest, prev, th);
    const codeAlert = eventCodeAlert(latest);
    const incoming = codeAlert ? [...sensorAlerts, codeAlert] : sensorAlerts;

    if (lastEntryRef.current !== latest.entryId) {
      if (lastEntryRef.current !== null) {
        setAlerts((a) => mergeAlerts(a, incoming));
      } else {
        const historical: AlertEvent[] = [];
        for (const f of sorted.slice(-30)) {
          const ca = eventCodeAlert(f);
          if (ca) historical.push({ ...ca, acknowledged: true, channel: ['cloud'] });
          const sa = evaluateAlerts(f, null, th);
          for (const s of sa) {
            historical.push({
              ...s,
              id: `hist-${f.entryId}-${s.code}`,
              acknowledged: true,
              channel: ['cloud'],
            });
          }
        }
        setAlerts(historical.reverse().slice(0, 40));
      }
      lastEntryRef.current = latest.entryId;
    }

    prevRef.current = latest;
    setPrevReading(prev);
    setReading(latest);
    setHistory(sorted.map(toHistoryPoint));
    setEntryCount(sorted.length);
    setLastEntryId(latest.entryId);
    setLastTick(latest.timestamp);
    setCloudError(null);
    setCloudStatus('online');
    const fresh = Date.now() - latest.timestamp.getTime() < 10 * 60 * 1000;
    setEspConnected(fresh);
    setSystem((s) => ({
      ...s,
      wifi: 'online',
      thingspeak: 'online',
      esp32: fresh ? 'online' : 'degraded',
      gsm: 'online',
      lastUpload: latest.timestamp,
    }));
  }, []);

  const syncCloud = useCallback(async () => {
    setSyncing(true);
    try {
      const data = await fetchChannelFeeds(THINGSPEAK.historyResults);
      const parsed = data.feeds
        .filter((f) => f.created_at && (f.field1 != null || f.field2 != null))
        .map(parseFeed);
      applyCloudFeeds(parsed);
      if (!parsed.length) {
        setSystem((s) => ({
          ...s,
          thingspeak: 'online',
          wifi: 'online',
          esp32: 'offline',
        }));
        setEspConnected(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown ThingSpeak error';
      setCloudError(msg);
      setCloudStatus('offline');
      setEspConnected(false);
      setSystem((s) => ({
        ...s,
        thingspeak: 'offline',
        wifi: 'degraded',
      }));
    } finally {
      setSyncing(false);
    }
  }, [applyCloudFeeds]);

  const connectEsp = useCallback(async () => {
    setConnectingEsp(true);
    setCloudError(null);
    setMode('cloud');
    try {
      await syncCloud();
      setEspConnected(true);
      setSystem((s) => ({
        ...s,
        esp32: 'online',
        wifi: 'online',
        thingspeak: 'online',
      }));
    } finally {
      setConnectingEsp(false);
    }
  }, [syncCloud]);

  const enterSimulate = useCallback(() => {
    setMode('demo');
    setEspConnected(false);
    setCloudError(null);
    setCloudStatus('online');
    setHistory(generateHistory(24));
    setReading(createInitialReading());
    setAlerts(SEED_ALERTS);
    setSystem((s) => ({
      ...s,
      wifi: 'online',
      thingspeak: 'degraded',
      esp32: 'online',
      lastUpload: new Date(),
    }));
    lastEntryRef.current = null;
    prevRef.current = null;
    faultHoldRef.current = null;
  }, []);

  // Cloud polling
  useEffect(() => {
    if (mode !== 'cloud') return;
    void syncCloud();
    if (!live) return;
    const id = window.setInterval(() => void syncCloud(), THINGSPEAK.pollMs);
    return () => window.clearInterval(id);
  }, [mode, live, syncCloud]);

  // Demo stream
  useEffect(() => {
    if (mode !== 'demo' || !live) return;
    const id = window.setInterval(() => {
      setReading((prev) => {
        let next =
          faultHoldRef.current && Date.now() < faultHoldUntilRef.current
            ? { ...faultHoldRef.current, timestamp: new Date() }
            : nextReading(prev);

        // gently clear hold
        if (faultHoldRef.current && Date.now() >= faultHoldUntilRef.current) {
          faultHoldRef.current = null;
        }

        setPrevReading(prev);
        prevRef.current = next;

        const newAlerts = evaluateAlerts(next, prev, thresholdsRef.current);
        if (newAlerts.length) {
          setAlerts((a) => mergeAlerts(a, newAlerts));
        }

        setHistory((h) => {
          const point: HistoryPoint = {
            time: next.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            timestamp: next.timestamp.getTime(),
            temperature: next.temperature,
            humidity: next.humidity,
            stockLevel: next.stockLevel,
            mass: next.mass,
            gasRaw: next.gasRaw,
          };
          return [...h.slice(-300), point];
        });

        setSystem((s) => ({
          ...s,
          lastUpload: next.timestamp,
          uptimeHours: s.uptimeHours + 2.5 / 3600,
          thingspeak: 'degraded',
        }));
        setLastTick(next.timestamp);
        return next;
      });
    }, 2500);
    return () => window.clearInterval(id);
  }, [mode, live]);

  const pushTestReading = useCallback(async () => {
    setPushing(true);
    setCloudError(null);
    try {
      const base = reading;
      const jitter = (n: number, a: number) =>
        Math.round((n + (Math.random() - 0.5) * a) * 10) / 10;
      const payload = {
        temperature: jitter(base.temperature || 5, 0.6),
        humidity: jitter(base.humidity || 47, 3),
        mass: Math.round((base.mass || 3.3) * 100) / 100,
        stockLevel: Math.max(20, jitter(base.stockLevel || 68, 2)),
        door: Math.random() > 0.9 ? ('open' as const) : ('closed' as const),
        leak: Math.random() > 0.97 ? ('wet' as const) : ('dry' as const),
        gasRaw: Math.round(150 + Math.random() * 80),
      };
      const eventCode = deriveEventCode(payload, thresholdsRef.current);
      await writeFeed({ ...payload, eventCode });
      await new Promise((r) => setTimeout(r, 800));
      await syncCloud();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Write failed';
      setCloudError(msg);
    } finally {
      setPushing(false);
    }
  }, [reading, syncCloud]);

  const injectFault = useCallback(
    async (faultId: FaultId) => {
      setFaultBusy(true);
      const def = FAULTS.find((f) => f.id === faultId)!;
      const prev = reading;
      const next = applyFault(reading, faultId, thresholdsRef.current);

      faultHoldRef.current = next;
      faultHoldUntilRef.current = Date.now() + (faultId === 'clear' ? 2000 : 45000);

      setPrevReading(prev);
      setReading(next);
      setLastTick(next.timestamp);
      setLastFault(def.code);

      const alert = faultAlert(def, next);
      const evaled = evaluateAlerts(next, prev, thresholdsRef.current);
      const bundle = alert ? [alert, ...evaled] : evaled;
      if (bundle.length) setAlerts((a) => mergeAlerts(a, bundle));

      setHistory((h) => [
        ...h.slice(-300),
        {
          time: next.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: next.timestamp.getTime(),
          temperature: next.temperature,
          humidity: next.humidity,
          stockLevel: next.stockLevel,
          mass: next.mass,
          gasRaw: next.gasRaw,
        },
      ]);

      // In cloud mode, also try to write the fault to ThingSpeak (rate-limited)
      if (mode === 'cloud' && faultId !== 'clear') {
        try {
          const eventCode = deriveEventCode(next, thresholdsRef.current);
          await writeFeed({
            temperature: next.temperature,
            humidity: next.humidity,
            mass: next.mass,
            stockLevel: next.stockLevel,
            door: next.door,
            leak: next.leak,
            gasRaw: next.gasRaw,
            eventCode,
          });
          await new Promise((r) => setTimeout(r, 600));
          await syncCloud();
        } catch (err) {
          // Local UI still shows the fault even if write is rate-limited
          const msg = err instanceof Error ? err.message : 'Cloud write skipped';
          setCloudError(msg);
        }
      }

      setFaultBusy(false);
    },
    [mode, reading, syncCloud]
  );

  const unacked = useMemo(
    () => alerts.filter((a) => !a.acknowledged).length,
    [alerts]
  );

  const overall = deriveOverall(reading, alerts, thresholds);

  const ack = (id: string) =>
    setAlerts((list) =>
      list.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );

  const ackAll = () =>
    setAlerts((list) => list.map((a) => ({ ...a, acknowledged: true })));

  const tempStatus =
    reading.temperature > thresholds.tempMax || reading.temperature < thresholds.tempMin
      ? reading.temperature > thresholds.tempMax + 2
        ? 'crit'
        : 'warn'
      : 'ok';
  const rhStatus = reading.humidity > thresholds.humidityMax ? 'warn' : 'ok';
  const stockStatus = reading.stockLevel < thresholds.stockMin ? 'warn' : 'ok';
  const gasStatus = reading.gasRaw > thresholds.gasThreshold ? 'warn' : 'ok';

  const sectionTitle: Record<NavId, string> = {
    overview: 'Operations Overview',
    sensors: 'Live Sensor Array',
    alerts: 'Alerts & Event Log',
    history: 'Historical Trends',
    system: 'System Health',
    architecture: 'System Architecture',
    thresholds: 'Threshold Controls',
  };

  return (
    <div
      className="flex min-h-screen transition-colors duration-300"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -left-32 top-0 h-96 w-96 rounded-full blur-3xl"
          style={{ background: 'var(--glow-1)' }}
        />
        <div
          className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{ background: 'var(--glow-2)' }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.5,
            backgroundImage: `linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <Sidebar
        active={nav}
        onChange={setNav}
        alertCount={unacked}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        cloudMode={mode === 'cloud'}
        channelId={THINGSPEAK.channelId}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar
          onMenu={() => setSidebarOpen(true)}
          system={system}
          lastTick={lastTick}
          live={live}
          onToggleLive={() => setLive((v) => !v)}
          mode={mode}
          cloudStatus={cloudStatus}
          syncing={syncing}
        />

        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: 'var(--accent)' }}
              >
                {CONTAINER.id} · PHARMA//VAULT · CH {THINGSPEAK.channelId}
              </p>
              <h2
                className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
                style={{ color: 'var(--text)' }}
              >
                {sectionTitle[nav]}
              </h2>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              {mode === 'cloud' ? 'ESP / ThingSpeak' : 'Simulate'} · Updated{' '}
              {formatRelative(lastTick)}
            </p>
          </div>

          <ConnectionBar
            mode={mode}
            onModeChange={(m) => (m === 'demo' ? enterSimulate() : void connectEsp())}
            status={cloudStatus}
            entryCount={entryCount}
            lastEntryId={lastEntryId}
            error={cloudError}
            syncing={syncing}
            pushing={pushing}
            connectingEsp={connectingEsp}
            espConnected={espConnected}
            onConnectEsp={() => void connectEsp()}
            onRefresh={() => void syncCloud()}
            onPushTest={() => void pushTestReading()}
            theme={theme}
            onThemeChange={setTheme}
          />

          {/* Fault simulator always visible on overview + alerts */}
          {(nav === 'overview' || nav === 'alerts' || nav === 'sensors') && (
            <div className="mb-5">
              <FaultSimulator
                onInject={(id) => void injectFault(id)}
                busy={faultBusy || pushing}
                mode={mode}
                lastFault={lastFault}
              />
            </div>
          )}

          {nav === 'overview' && (
            <div className="space-y-5">
              <ContainerStatus reading={reading} overall={overall} />

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                <StatCard
                  title="Temperature"
                  value={reading.temperature.toFixed(1)}
                  unit="°C"
                  subtitle={`Band ${thresholds.tempMin}–${thresholds.tempMax}°C · F1`}
                  icon={Thermometer}
                  tone={tempStatus === 'ok' ? 'cyan' : tempStatus === 'warn' ? 'amber' : 'rose'}
                  status={tempStatus}
                />
                <StatCard
                  title="Humidity"
                  value={reading.humidity.toFixed(1)}
                  unit="%RH"
                  subtitle={`Max ${thresholds.humidityMax}% · F2`}
                  icon={Droplets}
                  tone={rhStatus === 'ok' ? 'violet' : 'amber'}
                  status={rhStatus}
                />
                <StatCard
                  title="Stock Level"
                  value={reading.stockLevel.toFixed(0)}
                  unit="%"
                  subtitle="HC-SR04 · F4"
                  icon={Package}
                  tone={stockStatus === 'ok' ? 'emerald' : 'amber'}
                  status={stockStatus}
                />
                <StatCard
                  title="Mass"
                  value={reading.mass.toFixed(2)}
                  unit="kg"
                  subtitle="HX711 · F3"
                  icon={Scale}
                  tone="sky"
                  status="ok"
                />
                <StatCard
                  title="Gas Raw"
                  value={String(reading.gasRaw)}
                  unit="ADC"
                  subtitle="MQ-series · F7"
                  icon={Wind}
                  tone={gasStatus === 'ok' ? 'amber' : 'rose'}
                  status={gasStatus}
                />
                <StatCard
                  title="Open Alerts"
                  value={String(unacked)}
                  unit="active"
                  subtitle={`${alerts.length} total logged`}
                  icon={AlertTriangle}
                  tone={unacked ? 'rose' : 'emerald'}
                  status={unacked ? 'warn' : 'ok'}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-5">
                <div className="xl:col-span-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {mode === 'cloud' ? 'Cloud History' : 'Trend Snapshot'}
                    </h3>
                    <button
                      onClick={() => setNav('history')}
                      className="text-xs font-medium"
                      style={{ color: 'var(--accent)' }}
                    >
                      Full history →
                    </button>
                  </div>
                  {history.length > 1 ? (
                    <HistoryCharts data={history} range="24h" />
                  ) : (
                    <EmptyHistory />
                  )}
                </div>
                <div className="xl:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      Recent Events
                    </h3>
                    <button
                      onClick={() => setNav('alerts')}
                      className="text-xs font-medium"
                      style={{ color: 'var(--accent)' }}
                    >
                      View all →
                    </button>
                  </div>
                  <AlertList alerts={alerts} onAck={ack} compact limit={6} />
                </div>
              </div>
            </div>
          )}

          {nav === 'sensors' && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <SensorGauge
                  label="Temperature"
                  value={reading.temperature}
                  min={0}
                  max={15}
                  unit="°C"
                  safeMin={thresholds.tempMin}
                  safeMax={thresholds.tempMax}
                  color="var(--accent)"
                />
                <SensorGauge
                  label="Humidity"
                  value={reading.humidity}
                  min={20}
                  max={80}
                  unit="%RH"
                  safeMin={30}
                  safeMax={thresholds.humidityMax}
                  color="var(--danger)"
                />
                <SensorGauge
                  label="Stock Fill"
                  value={reading.stockLevel}
                  min={0}
                  max={100}
                  unit="%"
                  safeMin={thresholds.stockMin}
                  safeMax={100}
                  color="var(--ok)"
                />
                <SensorGauge
                  label="Mass"
                  value={reading.mass}
                  min={0}
                  max={5}
                  unit="kg"
                  safeMin={2}
                  safeMax={5}
                  color="var(--gold)"
                />
                <SensorGauge
                  label="Gas Raw"
                  value={reading.gasRaw}
                  min={0}
                  max={700}
                  unit="ADC"
                  safeMin={0}
                  safeMax={thresholds.gasThreshold}
                  color="var(--warn)"
                />
                <div className="panel flex flex-col justify-center gap-3 p-4">
                  <BinaryState
                    label="Door (Reed) · F5"
                    on={reading.door === 'open'}
                    onLabel="OPEN"
                    offLabel="CLOSED"
                  />
                  <BinaryState
                    label="Leak Sensor · F6"
                    on={reading.leak === 'wet'}
                    onLabel="WET"
                    offLabel="DRY"
                  />
                  <div
                    className="rounded-xl px-3 py-2 text-center"
                    style={{ background: 'var(--chip-bg)' }}
                  >
                    <p
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      Sample age
                    </p>
                    <p
                      className="font-mono text-sm font-semibold"
                      style={{ color: 'var(--accent)' }}
                    >
                      {formatRelative(reading.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {nav === 'alerts' && (
            <div className="space-y-4">
              <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {unacked} unacknowledged · {alerts.length} total
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                    Threshold engine · ThingSpeak field8 · Fault simulator
                  </p>
                </div>
                <button
                  onClick={ackAll}
                  disabled={!unacked}
                  className="rounded-xl px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent)',
                  }}
                >
                  Acknowledge all
                </button>
              </div>
              <AlertList alerts={alerts} onAck={ack} />
            </div>
          )}

          {nav === 'history' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['6h', '12h', '24h'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className="rounded-full px-4 py-1.5 text-xs font-semibold transition"
                    style={
                      range === r
                        ? {
                            background: 'var(--accent-soft)',
                            color: 'var(--accent)',
                            boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)',
                          }
                        : {
                            background: 'var(--surface)',
                            color: 'var(--text-muted)',
                          }
                    }
                  >
                    {r}
                  </button>
                ))}
              </div>
              {history.length > 1 ? (
                <HistoryCharts data={history} range={range} />
              ) : (
                <EmptyHistory />
              )}
            </div>
          )}

          {nav === 'system' && (
            <SystemPanel
              system={system}
              channelId={THINGSPEAK.channelId}
              entryCount={entryCount}
              lastEntryId={lastEntryId}
              mode={mode}
            />
          )}

          {nav === 'architecture' && <ArchitectureView />}

          {nav === 'thresholds' && (
            <ThresholdsPanel thresholds={thresholds} onChange={setThresholds} />
          )}

          <footer
            className="mt-10 border-t pt-6 pb-4 text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <p
              className="font-display text-xs font-semibold tracking-[0.2em]"
              style={{ color: 'var(--text-faint)' }}
            >
              DAWARAKSH · PHARMA//VAULT · THINGSPEAK {THINGSPEAK.channelId}
            </p>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-faint)' }}>
              IoT-Enabled Smart Container · Bharat Institute of Engineering and Technology · Guide:
              Dr. Chandralekha M
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

function EmptyHistory() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
        background: 'var(--accent-soft)',
      }}
    >
      <p className="font-semibold" style={{ color: 'var(--accent)' }}>
        No cloud history yet
      </p>
      <p className="mt-1 max-w-sm text-sm" style={{ color: 'var(--text-muted)' }}>
        Use <strong>Connect ESP</strong>, <strong>Push test reading</strong>, or inject a fault to
        populate ThingSpeak fields 1–8.
      </p>
    </div>
  );
}

function BinaryState({
  label,
  on,
  onLabel,
  offLabel,
}: {
  label: string;
  on: boolean;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{
        borderColor: on
          ? 'color-mix(in srgb, var(--danger) 35%, transparent)'
          : 'color-mix(in srgb, var(--ok) 30%, transparent)',
        background: on ? 'var(--danger-soft)' : 'var(--ok-soft)',
      }}
    >
      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${on ? 'animate-pulse' : ''}`}
          style={{ background: on ? 'var(--danger)' : 'var(--ok)' }}
        />
        <span className="text-sm font-bold" style={{ color: on ? 'var(--danger)' : 'var(--ok)' }}>
          {on ? onLabel : offLabel}
        </span>
      </div>
    </div>
  );
}
