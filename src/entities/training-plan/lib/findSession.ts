import { addDays } from '@/shared/lib';
import type { PlanSession } from '../model/types';

/** Planned session for an activity date: exact match first, then the day before / after. */
export function findSessionForDate(plan: PlanSession[], isoDate: string): PlanSession | null {
  return plan.find(p => p.date === isoDate)
    ?? plan.find(p => addDays(p.date, 1) === isoDate)
    ?? plan.find(p => addDays(p.date, -1) === isoDate)
    ?? null;
}
