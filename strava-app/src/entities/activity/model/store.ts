import { create } from 'zustand';
import type { StravaActivity } from './types';

interface ActivitiesStore {
  activities: StravaActivity[];
  setActivities: (acts: StravaActivity[]) => void;

  loading: boolean;
  setLoading: (v: boolean) => void;

  loadingText: string;
  setLoadingText: (t: string) => void;

  error: string | null;
  setError: (e: string | null) => void;
}

export const useActivitiesStore = create<ActivitiesStore>((set) => ({
  activities:    [],
  setActivities: (acts) => set({ activities: acts }),

  loading:    false,
  setLoading: (v) => set({ loading: v }),

  loadingText:    '',
  setLoadingText: (t) => set({ loadingText: t }),

  error:    null,
  setError: (e) => set({ error: e }),
}));
