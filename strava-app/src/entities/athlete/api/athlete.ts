import { stravaFetch } from '@/shared/api';
import type { StravaAthleteStats, StravaAthleteZones } from '../model/types';

let cachedAthleteId: number | null = null;

export async function fetchAthleteId(): Promise<number> {
  if (cachedAthleteId !== null) return cachedAthleteId;
  const { id } = await stravaFetch<{ id: number }>('/athlete');
  cachedAthleteId = id;
  return id;
}

export async function fetchAthleteStats(): Promise<StravaAthleteStats> {
  const id = await fetchAthleteId();
  return stravaFetch<StravaAthleteStats>(`/athletes/${id}/stats`);
}

/** Null when unavailable (most likely missing profile:read_all scope) — hrColor falls back to defaults. */
export function fetchAthleteZones(): Promise<StravaAthleteZones | null> {
  return stravaFetch<StravaAthleteZones>('/athlete/zones').catch(() => null);
}
