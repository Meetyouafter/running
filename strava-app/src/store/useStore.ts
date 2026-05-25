import { create } from 'zustand';
import type { StravaActivity, ActivityFilter } from '../types/strava';

type Tab = 'dashboard' | 'plan' | 'analysis' | 'intervals' | 'races';

interface AppStore {
  // data
  activities: StravaActivity[];
  setActivities: (acts: StravaActivity[]) => void;

  // ui
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

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

  activeTab:    'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

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
