import { create } from 'zustand';
import type { StravaActivity, ActivityFilter } from '../types/strava';
import type { PlanSession } from '../lib/trainingPlan';
import { TRAINING_PLAN } from '../lib/trainingPlan';

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

interface AppStore {
  // data
  activities: StravaActivity[];
  setActivities: (acts: StravaActivity[]) => void;

  plan: PlanSession[];
  setPlan: (plan: PlanSession[]) => void;
  resetPlan: () => void;

  // ui
  activeFilter: ActivityFilter;
  setActiveFilter: (f: ActivityFilter) => void;

  activeDays: number;
  setActiveDays: (d: number) => void;

  loading: boolean;
  setLoading: (v: boolean) => void;

  loadingText: string;
  setLoadingText: (t: string) => void;

  error: string | null;
  setError: (e: string | null) => void;
}

export const useStore = create<AppStore>((set) => ({
  activities:    [],
  setActivities: (acts) => set({ activities: acts }),

  plan:      loadPlan(),
  setPlan:   (plan) => { savePlan(plan); set({ plan }); },
  resetPlan: ()     => { savePlan(TRAINING_PLAN); set({ plan: TRAINING_PLAN }); },

  activeFilter:    'all',
  setActiveFilter: (f) => set({ activeFilter: f }),

  activeDays:    30,
  setActiveDays: (d) => set({ activeDays: d }),

  loading:    false,
  setLoading: (v) => set({ loading: v }),

  loadingText:    '',
  setLoadingText: (t) => set({ loadingText: t }),

  error:    null,
  setError: (e) => set({ error: e }),
}));
