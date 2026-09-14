import { create } from 'zustand';
import type { StravaAthleteZones } from './types';

interface AthleteStore {
  hrZones: StravaAthleteZones | null;
  setHrZones: (z: StravaAthleteZones | null) => void;
}

export const useAthleteStore = create<AthleteStore>((set) => ({
  hrZones:    null,
  setHrZones: (z) => set({ hrZones: z }),
}));
