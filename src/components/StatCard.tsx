import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  tone?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky';
  trend?: string;
  status?: 'ok' | 'warn' | 'crit' | 'info';
}

const TONES: Record<string, { grad: string }> = {
  cyan: { grad: 'linear-gradient(135deg, var(--accent), var(--accent-2))' },
  emerald: { grad: 'linear-gradient(135deg, var(--ok), #059669)' },
  amber: { grad: 'linear-gradient(135deg, var(--gold), var(--warn))' },
  rose: { grad: 'linear-gradient(135deg, var(--danger), #9f1239)' },
  violet: { grad: 'linear-gradient(135deg, #c084fc, var(--danger))' },
  sky: { grad: 'linear-gradient(135deg, var(--accent), var(--gold))' },
};

const STATUS_DOT: Record<string, string> = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  crit: 'var(--danger)',
  info: 'var(--accent)',
};

export function StatCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  tone = 'cyan',
  trend,
  status = 'ok',
}: StatCardProps) {
  const t = TONES[tone] ?? TONES.cyan;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel relative overflow-hidden p-4"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl"
        style={{ background: 'var(--accent-soft)' }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: STATUS_DOT[status] }}
            />
            <p
              className="truncate text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              {title}
            </p>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
              style={{ color: 'var(--text)' }}
            >
              {value}
            </span>
            {unit && (
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                {unit}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-xs" style={{ color: 'var(--text-faint)' }}>
              {subtitle}
            </p>
          )}
          {trend && (
            <p className="mt-1 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {trend}
            </p>
          )}
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-lg"
          style={{ background: t.grad }}
        >
          <Icon className="text-white" size={20} strokeWidth={2.25} />
        </div>
      </div>
    </motion.div>
  );
}
