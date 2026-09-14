import type { StravaActivity } from '@/entities/activity/@x/training-plan';
import { addDays } from '@/shared/lib';
import type { PlanSession } from '../model/types';

/**
 * Matches each planned session to an actual run: exact date first, then ±1 day
 * (never reaching back before the plan started). Each run is used at most once.
 */
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
