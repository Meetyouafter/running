import { stravaFetch } from '@/shared/api';
import type { StravaAthleteStats, StravaAthleteZones } from '../model/types';

let cachedAthleteId: number | null = null;

export async function fetchAthleteId(): Promise<number> {
  if (cachedAthleteId !== null) return cachedAthleteId;
  const resp = await stravaFetch('/athlete');
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json() as { id: number };
  cachedAthleteId = data.id;
  return data.id;
}

export async function fetchAthleteStats(): Promise<StravaAthleteStats> {
  const id = await fetchAthleteId();
  const resp = await stravaFetch(`/athletes/${id}/stats`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json() as Promise<StravaAthleteStats>;
}

export async function fetchAthleteZones(): Promise<StravaAthleteZones | null> {
  const resp = await stravaFetch('/athlete/zones');
  if (!resp.ok) return null; // most likely missing profile:read_all scope
  return resp.json() as Promise<StravaAthleteZones>;
}
