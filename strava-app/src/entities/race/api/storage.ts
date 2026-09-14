import { readStorage, writeStorage } from '@/shared/lib';
import type { Race, RaceMark } from '../model/types';

const MARKS_KEY   = 'raceMarks';
const CUSTOMS_KEY = 'customRaces';

export function loadRaceStorage(): { marks: Record<string, RaceMark>; customs: Race[] } {
  return {
    marks:   readStorage<Record<string, RaceMark>>(MARKS_KEY, {}),
    customs: readStorage<Race[]>(CUSTOMS_KEY, []),
  };
}

export function saveRaceMarks(marks: Record<string, RaceMark>) {
  writeStorage(MARKS_KEY, marks);
}

/** Persists only manually added races; seeded/imported ones are re-fetched. */
export function saveCustomRaces(races: Race[]) {
  writeStorage(CUSTOMS_KEY, races.filter(r => r.source === 'manual'));
}
