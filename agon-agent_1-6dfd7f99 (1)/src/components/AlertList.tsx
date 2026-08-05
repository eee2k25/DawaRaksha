import { AlertTriangle, CheckCircle2, ClipboardList, Info, XCircle } from 'lucide-react';
import { formatDateTime, formatRelative, severityColor } from '../lib/format';
import { ACK_ACTIONS } from '../lib/alertEngine';
import type { AlertEvent } from '../lib/types';

interface AlertListProps {
  alerts: AlertEvent[];
  onAckRequest?: (alert: AlertEvent) => void;
  compact?: boolean;
  limit?: number;
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === 'critical') return <XCircle size={16} />;
  if (severity === 'warning') return <AlertTriangle size={16} />;
  if (severity === 'info') return <Info size={16} />;
  return <CheckCircle2 size={16} />;
}

function actionLabel(value: string) {
  return ACK_ACTIONS.find((a) => a.value === value)?.label ?? value;
}

export function AlertList({ alerts, onAckRequest, compact, limit }: AlertListProps) {
  const items = limit ? alerts.slice(0, limit) : alerts;

  if (items.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center"
        style={{
          borderColor: 'color-mix(in srgb, var(--ok) 30%, transparent)',
          background: 'var(--ok-soft)',
        }}
      >
        <CheckCircle2 className="mb-3" size={32} style={{ color: 'var(--ok)' }} />
        <p className="font-semibold" style={{ color: 'var(--ok)' }}>
          All systems nominal
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          No active alerts on container DR-001
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((a) => {
        const c = severityColor(a.severity);
        return (
          <div
            key={a.id}
            className={`rounded-xl border ${c.border} ${c.bg} p-3 transition hover:brightness-105 ${
              a.acknowledged ? 'opacity-75' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${c.text}`}>
                <SeverityIcon severity={a.severity} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-mono text-[10px] font-bold ${c.text}`}>{a.code}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {a.title}
                  </span>
                  {a.acknowledged && (
                    <span
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide"
                      style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}
                    >
                      <ClipboardList size={10} />
                      ACK
                    </span>
                  )}
                </div>
                {!compact && (
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {a.message}
                  </p>
                )}
                <div
                  className="mt-2 flex flex-wrap items-center gap-2 text-[10px]"
                  style={{ color: 'var(--text-faint)' }}
                >
                  <span>{formatRelative(a.timestamp)}</span>
                  <span>·</span>
                  <span>{a.source}</span>
                  <span>·</span>
                  <span className="uppercase tracking-wide">{a.channel.join(' + ')}</span>
                </div>

                {a.acknowledged && a.ack && !compact && (
                  <div
                    className="mt-2 rounded-lg border px-2.5 py-2 text-[11px]"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--ok) 25%, transparent)',
                      background: 'var(--ok-soft)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <p className="font-semibold" style={{ color: 'var(--ok)' }}>
                      Audit · {actionLabel(a.ack.action)}
                    </p>
                    <p className="mt-0.5">
                      {a.ack.operator} · {formatDateTime(a.ack.at)}
                      {a.ack.note ? ` · “${a.ack.note}”` : ''}
                    </p>
                  </div>
                )}
              </div>
              {onAckRequest && !a.acknowledged && (
                <button
                  onClick={() => onAckRequest(a)}
                  className="shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Ack
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
