import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, X } from 'lucide-react';
import { suggestedActionsFor } from '../lib/alertEngine';
import type { AlertEvent } from '../lib/types';

interface AckModalProps {
  alert: AlertEvent | null;
  /** When set, bulk-ack all unacked with same form */
  bulkCount?: number;
  onClose: () => void;
  onConfirm: (payload: {
    action: string;
    note: string;
    operator: string;
    alertId: string | 'ALL';
  }) => void;
}

export function AckModal({ alert, bulkCount, onClose, onConfirm }: AckModalProps) {
  const isBulk = !alert && (bulkCount ?? 0) > 0;
  const open = !!alert || isBulk;

  const actions = useMemo(
    () => suggestedActionsFor(alert?.code ?? ''),
    [alert?.code]
  );

  const [action, setAction] = useState(actions[0]?.value ?? 'monitoring');
  const [note, setNote] = useState('');
  const [operator, setOperator] = useState(() => {
    try {
      return localStorage.getItem('dawaraksh-operator') || 'Operator-1';
    } catch {
      return 'Operator-1';
    }
  });

  useEffect(() => {
    if (!open) return;
    setAction(actions[0]?.value ?? 'monitoring');
    setNote('');
  }, [open, alert?.id, actions]);

  if (!open) return null;

  const submit = () => {
    try {
      localStorage.setItem('dawaraksh-operator', operator.trim() || 'Operator-1');
    } catch {
      /* ignore */
    }
    onConfirm({
      action,
      note: note.trim(),
      operator: operator.trim() || 'Operator-1',
      alertId: isBulk ? 'ALL' : alert!.id,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)' }}
      onClick={onClose}
    >
      <div
        className="panel-solid w-full max-w-md p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ack-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <ClipboardCheck size={18} />
            </div>
            <div>
              <h3 id="ack-title" className="text-base font-bold" style={{ color: 'var(--text)' }}>
                {isBulk ? 'Acknowledge all alerts' : 'Acknowledge alert'}
              </h3>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                {isBulk
                  ? `Compliance audit trail for ${bulkCount} open events`
                  : `${alert!.code} · ${alert!.title}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {!isBulk && alert && (
          <p
            className="mb-4 rounded-xl px-3 py-2 text-xs leading-relaxed"
            style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}
          >
            {alert.message}
          </p>
        )}

        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          Operator ID
        </label>
        <input
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
          className="mb-3 w-full rounded-xl border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
          }}
          placeholder="e.g. Navya / QA-02"
        />

        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          Action taken
        </label>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="mb-3 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
          }}
        >
          {actions.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          Notes (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mb-4 w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
          }}
          placeholder="Batch affected, corrective steps, follow-up…"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-4 py-2 text-xs font-semibold"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-xl px-4 py-2 text-xs font-bold"
            style={{
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              boxShadow: '0 8px 20px var(--accent-glow)',
            }}
          >
            Record & acknowledge
          </button>
        </div>

        <p className="mt-3 text-[10px] leading-relaxed" style={{ color: 'var(--text-faint)' }}>
          Audit entry is stored with timestamp, operator, action code and optional note for
          PHARMA//VAULT compliance review.
        </p>
      </div>
    </div>
  );
}
