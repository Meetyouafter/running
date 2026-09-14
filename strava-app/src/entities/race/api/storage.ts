import type { Race, RaceMark } from '../model/types';

const MARKS_KEY   = 'raceMarks';
const CUSTOMS_KEY = 'customRaces';

export function loadRaceStorage(): { marks: Record<string, RaceMark>; customs: Race[] } {
  try {
    const marks   = JSON.parse(localStorage.getItem(MARKS_KEY)   || '{}');
    const customs = JSON.parse(localStorage.getItem(CUSTOMS_KEY) || '[]');
    return { marks, customs };
  } catch { return { marks: {}, customs: [] }; }
}

export function saveRaceMarks(marks: Record<string, RaceMark>) {
  try { localStorage.setItem(MARKS_KEY, JSON.stringify(marks)); } catch { /* quota */ }
}

/** Persists only manually added races; seeded/imported ones are re-fetched. */
export function saveCustomRaces(races: Race[]) {
  const customs = races.filter(r => r.source === 'manual');
  try { localStorage.setItem(CUSTOMS_KEY, JSON.stringify(customs)); } catch { /* quota */ }
}
