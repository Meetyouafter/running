export function fmt(n: number, d = 1): string {
  return Number(n).toFixed(d);
}

export function pace(mps: number): string {
  if (!mps || mps <= 0) return '—';
  const spm = 1000 / mps;
  const m = Math.floor(spm / 60);
  const s = Math.round(spm % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function paceSecToStr(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function dur(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}

export function dateStr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// mm:ss for <1h, h:mm:ss for ≥1h — used for pace predictions with sub-minute precision.
export function durMinStr(totalMin: number): string {
  const totalSec = Math.round(totalMin * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

// h:mm — used for round target times (no seconds).
export function hmFromMin(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}
