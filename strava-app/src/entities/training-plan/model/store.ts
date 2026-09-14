import { create } from 'zustand';
import type { PlanSession } from './types';
import { TRAINING_PLAN } from '../config/plan';

const PLAN_KEY = 'custom_training_plan';

function loadPlan(): PlanSession[] {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    return raw ? (JSON.parse(raw) as PlanSession[]) : TRAINING_PLAN;
  } catch { return TRAINING_PLAN; }
}

export function savePlan(plan: PlanSession[]) {
  try { localStorage.setItem(PLAN_KEY, JSON.stringify(plan)); } catch { /* quota */ }
}

export function isDefaultPlan(plan: PlanSession[]): boolean {
  return JSON.stringify(plan) === JSON.stringify(TRAINING_PLAN);
}

interface PlanStore {
  plan: PlanSession[];
  setPlan: (plan: PlanSession[]) => void;
  resetPlan: () => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
  plan:      loadPlan(),
  setPlan:   (plan) => { savePlan(plan); set({ plan }); },
  resetPlan: ()     => { savePlan(TRAINING_PLAN); set({ plan: TRAINING_PLAN }); },
}));
