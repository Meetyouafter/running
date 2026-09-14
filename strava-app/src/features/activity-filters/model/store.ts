import { create } from 'zustand';
import type { ActivityFilter } from '@/entities/activity';

interface FiltersStore {
  activeFilter: ActivityFilter;
  setActiveFilter: (f: ActivityFilter) => void;

  /** Period in days; 0 = all time. */
  activeDays: number;
  setActiveDays: (d: number) => void;
}

export const useFiltersStore = create<FiltersStore>((set) => ({
  activeFilter:    'Run',
  setActiveFilter: (f) => set({ activeFilter: f }),

  activeDays:    0,
  setActiveDays: (d) => set({ activeDays: d }),
}));
