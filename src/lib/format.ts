export function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDateTime(d: Date) {
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(d: Date) {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function severityColor(severity: string) {
  switch (severity) {
    case 'critical':
      return {
        text: 'text-rose-400',
        bg: 'bg-rose-500/15',
        border: 'border-rose-500/30',
        dot: 'bg-rose-500',
        ring: 'ring-rose-500/40',
      };
    case 'warning':
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-500/15',
        border: 'border-amber-500/30',
        dot: 'bg-amber-500',
        ring: 'ring-amber-500/40',
      };
    case 'info':
      return {
        text: 'text-sky-400',
        bg: 'bg-sky-500/15',
        border: 'border-sky-500/30',
        dot: 'bg-sky-500',
        ring: 'ring-sky-500/40',
      };
    default:
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-500',
        ring: 'ring-emerald-500/40',
      };
  }
}

export function statusColor(status: string) {
  switch (status) {
    case 'online':
    case 'healthy':
      return 'text-emerald-400';
    case 'degraded':
    case 'warning':
      return 'text-amber-400';
    case 'offline':
    case 'critical':
      return 'text-rose-400';
    default:
      return 'text-slate-400';
  }
}
