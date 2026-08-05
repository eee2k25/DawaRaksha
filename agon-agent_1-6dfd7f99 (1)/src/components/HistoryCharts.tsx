import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HistoryPoint } from '../lib/types';
import { useChartTheme } from '../lib/theme';

interface HistoryChartsProps {
  data: HistoryPoint[];
  range: '6h' | '12h' | '24h';
}

export function HistoryCharts({ data, range }: HistoryChartsProps) {
  const ct = useChartTheme();
  const hours = range === '6h' ? 6 : range === '12h' ? 12 : 24;
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const filtered = data.filter((d) => d.timestamp >= cutoff);
  const step = Math.max(1, Math.floor(filtered.length / 48));
  const chartData = filtered.filter((_, i) => i % step === 0);

  const tooltipStyle = {
    contentStyle: {
      background: ct.tooltipBg,
      border: `1px solid ${ct.tooltipBorder}`,
      borderRadius: 12,
      fontSize: 12,
      boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
    },
    labelStyle: { color: ct.tooltipLabel, marginBottom: 4 },
    itemStyle: { color: ct.tooltipItem },
  };

  const cardStyle = {
    borderColor: ct.cardBorder,
    background: ct.cardBg,
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border p-4" style={cardStyle}>
        <h3 className="mb-1 text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Temperature & Humidity
        </h3>
        <p className="mb-4 text-[11px]" style={{ color: 'var(--text-faint)' }}>
          DHT22 · cold-chain band 2–8°C
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fill: ct.tick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                yAxisId="temp"
                tick={{ fill: ct.tick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 12]}
                unit="°"
              />
              <YAxis
                yAxisId="rh"
                orientation="right"
                tick={{ fill: ct.tick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[20, 80]}
                unit="%"
              />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: ct.legend }} />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="temperature"
                name="Temp °C"
                stroke={ct.temp}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="rh"
                type="monotone"
                dataKey="humidity"
                name="RH %"
                stroke={ct.humidity}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border p-4" style={cardStyle}>
        <h3 className="mb-1 text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Stock Level & Mass
        </h3>
        <p className="mb-4 text-[11px]" style={{ color: 'var(--text-faint)' }}>
          HC-SR04 fill % · HX711 load cell kg
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ct.stock} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={ct.stock} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="massGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ct.mass} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={ct.mass} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fill: ct.tick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                yAxisId="stock"
                tick={{ fill: ct.tick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <YAxis
                yAxisId="mass"
                orientation="right"
                tick={{ fill: ct.tick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[2, 5]}
              />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: ct.legend }} />
              <Area
                yAxisId="stock"
                type="monotone"
                dataKey="stockLevel"
                name="Stock %"
                stroke={ct.stock}
                fill="url(#stockGrad)"
                strokeWidth={2}
              />
              <Area
                yAxisId="mass"
                type="monotone"
                dataKey="mass"
                name="Mass kg"
                stroke={ct.mass}
                fill="url(#massGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border p-4 lg:col-span-2" style={cardStyle}>
        <h3 className="mb-1 text-sm font-semibold" style={{ color: 'var(--text)' }}>
          MQ Gas Raw Response
        </h3>
        <p className="mb-4 text-[11px]" style={{ color: 'var(--text-faint)' }}>
          Qualitative anomaly channel · threshold line at 400
        </p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gasGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ct.gas} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={ct.gas} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fill: ct.tick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                tick={{ fill: ct.tick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 700]}
              />
              <Tooltip {...tooltipStyle} />
              <Area
                type="monotone"
                dataKey="gasRaw"
                name="MQ raw"
                stroke={ct.gas}
                fill="url(#gasGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
