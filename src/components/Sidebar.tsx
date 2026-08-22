import {
  Activity,
  Bell,
  Boxes,
  Cpu,
  Gauge,
  LayoutDashboard,
  Radio,
  Settings2,
  ShieldCheck,
} from 'lucide-react';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'sensors', label: 'Live Sensors', icon: Gauge },
  { id: 'alerts', label: 'Alerts & Events', icon: Bell },
  { id: 'history', label: 'History', icon: Activity },
  { id: 'system', label: 'System Health', icon: Cpu },
  { id: 'architecture', label: 'Architecture', icon: Boxes },
  { id: 'thresholds', label: 'Thresholds', icon: Settings2 },
] as const;

export type NavId = (typeof NAV)[number]['id'];

interface SidebarProps {
  active: NavId;
  onChange: (id: NavId) => void;
  alertCount: number;
  open: boolean;
  onClose: () => void;
  cloudMode?: boolean;
  channelId?: number;
}

export function Sidebar({
  active,
  onChange,
  alertCount,
  open,
  onClose,
  cloudMode = true,
  channelId,
}: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
          style={{ background: 'var(--overlay)' }}
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'var(--bg-sidebar)',
          borderColor: 'var(--border-strong)',
        }}
      >
        <div className="border-b px-5 py-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="relative flex h-11 w-11 items-center justify-center rounded-xl shadow-lg"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--danger))',
                boxShadow: '0 8px 24px var(--accent-glow)',
              }}
            >
              <ShieldCheck className="h-6 w-6 text-white" strokeWidth={2.25} />
              <span
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full ring-2"
                style={{ background: 'var(--ok)', outlineColor: 'var(--bg-sidebar)' }}
              />
            </div>
            <div>
              <p
                className="font-display text-[11px] font-semibold tracking-[0.28em]"
                style={{ color: 'var(--accent)' }}
              >
                PHARMA//VAULT
              </p>
              <h1
                className="font-display text-lg font-bold tracking-tight"
                style={{ color: 'var(--text)' }}
              >
                DawaRaksh
              </h1>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            IoT cold-chain container monitoring for temperature-sensitive drugs & vaccines
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => {
                  onChange(id);
                  onClose();
                }}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all"
                style={
                  isActive
                    ? {
                        background: 'var(--accent-soft)',
                        color: 'var(--accent)',
                        boxShadow: 'inset 0 0 0 1px var(--border-strong)',
                      }
                    : { color: 'var(--text-muted)' }
                }
              >
                <Icon
                  size={18}
                  className="shrink-0"
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-faint)' }}
                />
                <span className="flex-1">{label}</span>
                {id === 'alerts' && alertCount > 0 && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: 'var(--danger-soft)',
                      color: 'var(--danger)',
                      boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--danger) 30%, transparent)',
                    }}
                  >
                    {alertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
          <div
            className="rounded-xl border p-3"
            style={{
              borderColor: 'var(--border-strong)',
              background: 'linear-gradient(135deg, var(--accent-soft), transparent)',
            }}
          >
            <div
              className="mb-2 flex items-center gap-2 text-xs font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              <Radio size={14} className="animate-pulse" />
              {cloudMode ? 'ThingSpeak Live' : 'Simulate Mode'}
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              ESP32 · Channel {channelId ?? '—'} · SIM900A
              <br />
              {cloudMode ? 'Polling cloud every 15s' : 'Local fault-ready stream'}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
