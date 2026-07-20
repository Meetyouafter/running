import type { StravaActivity, StravaZoneRange } from '../types/strava';
import type { PlanSession } from './trainingPlan';

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
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ZONE_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ff9800', '#f44336'];

export function hrColor(hr?: number | null, zones?: StravaZoneRange[] | null): string {
  if (!hr) return '#666';
  if (zones && zones.length) {
    for (let i = 0; i < zones.length; i++) {
      if (hr <= zones[i].max || i === zones.length - 1) return ZONE_COLORS[Math.min(i, ZONE_COLORS.length - 1)];
    }
  }
  if (hr < 120) return '#22c55e';
  if (hr < 140) return '#eab308';
  if (hr < 160) return '#ff9800';
  return '#f44336';
}

export function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function weekMondayKey(isoLocal: string): string {
  const [y, m, d] = isoLocal.slice(0, 10).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const mon = new Date(y, m - 1, d - (dt.getDay() + 6) % 7);
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function buildActivityMap(runs: StravaActivity[], sessions: PlanSession[]): Map<string, StravaActivity> {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const planStart = sorted[0]?.date;
  const usedIds = new Set<number>();
  const map = new Map<string, StravaActivity>();

  for (const p of sorted) {
    const found = runs.find(a => !usedIds.has(a.id) && a.start_date_local.slice(0, 10) === p.date);
    if (found) { map.set(p.date, found); usedIds.add(found.id); }
  }
  for (const p of sorted) {
    if (map.has(p.date)) continue;
    for (const off of [-1, 1]) {
      const cand = addDays(p.date, off);
      if (planStart && cand < planStart) continue; // don't reach back to before the plan started
      const found = runs.find(a => !usedIds.has(a.id) && a.start_date_local.slice(0, 10) === cand);
      if (found) { map.set(p.date, found); usedIds.add(found.id); break; }
    }
  }
  return map;
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
