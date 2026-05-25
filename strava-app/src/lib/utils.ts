import type { StravaActivity } from '../types/strava';

export const ICONS: Record<string, string> = {
  Run: '🏃', Ride: '🚴', VirtualRide: '🚴', Walk: '🚶', Swim: '🏊',
  Hike: '🥾', WeightTraining: '💪', Yoga: '🧘', Workout: '⚡',
  AlpineSki: '⛷️', Rowing: '🚣', StandUpPaddling: '🏄',
};

export const BADGE_CLASS: Record<string, string> = {
  Run: 'badge-run', Ride: 'badge-ride', VirtualRide: 'badge-ride',
  Walk: 'badge-walk', Hike: 'badge-walk',
};

export function ctype(a: StravaActivity) {
  return a.type === 'VirtualRide' ? 'Ride' : a.type;
}

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

export function actPaceSec(a: StravaActivity): number {
  return a.average_speed > 0 ? 1000 / a.average_speed : 0;
}

export function dur(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}

export function dateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function hrColor(hr?: number | null): string {
  if (!hr) return '#666';
  if (hr < 120) return '#22c55e';
  if (hr < 140) return '#eab308';
  if (hr < 160) return '#ff9800';
  return '#f44336';
}

export function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function decodePolyline(enc: string): [number, number][] {
  const pts: [number, number][] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < enc.length) {
    let b, sh = 0, res = 0;
    do { b = enc.charCodeAt(i++) - 63; res |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20);
    lat += ((res & 1) ? ~(res >> 1) : (res >> 1));
    sh = 0; res = 0;
    do { b = enc.charCodeAt(i++) - 63; res |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20);
    lng += ((res & 1) ? ~(res >> 1) : (res >> 1));
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
}
