import { create } from 'zustand';
import { readStorage, writeStorage } from '@/shared/lib';
import type { PlanSession } from './types';
import { TRAINING_PLAN } from '../config/plan';

const PLAN_KEY = 'custom_training_plan';

const loadPlan = () => readStorage<PlanSession[]>(PLAN_KEY, TRAINING_PLAN);
const savePlan = (plan: PlanSession[]) => writeStorage(PLAN_KEY, plan);

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
