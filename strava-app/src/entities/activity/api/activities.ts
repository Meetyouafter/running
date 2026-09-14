import { stravaFetch } from '@/shared/api';
import { readStorage, writeStorage, removeStorage } from '@/shared/lib';
import type { StravaActivity, StravaStreams, StravaSegmentExplore } from '../model/types';

// ─── localStorage activity cache ────────────────────────────────────────────
const CACHE_KEY = 'strava_activities_cache';

interface ActivityCache {
  activities: StravaActivity[];
  lastFetchedAt: number;
  coversAllTime?: boolean;
}

const loadCache = () => readStorage<ActivityCache | null>(CACHE_KEY, null);
const saveCache = (cache: ActivityCache) => writeStorage(CACHE_KEY, cache);
export const clearActivityCache = () => removeStorage(CACHE_KEY);

const startTs = (a: StravaActivity) => Math.floor(new Date(a.start_date).getTime() / 1000);
const inPeriod = (acts: StravaActivity[], afterTs: number | null) =>
  afterTs === null ? acts : acts.filter(a => startTs(a) >= afterTs);

/** Whatever is cached for the period (may be stale) — used when Strava is unreachable. */
export function getCachedActivities(afterTs: number | null): { activities: StravaActivity[]; cachedAt: number } | null {
  const cache = loadCache();
  if (!cache?.activities.length) return null;
  return { activities: inPeriod(cache.activities, afterTs), cachedAt: cache.lastFetchedAt * 1000 };
}
// ────────────────────────────────────────────────────────────────────────────

async function fetchActivitiesFromStrava(
  afterTs: number | null,
  onProgress?: (count: number) => void,
): Promise<StravaActivity[]> {
  const all: StravaActivity[] = [];
  let before: number | null = null;

  while (true) {
    const batch = await stravaFetch<StravaActivity[]>(
      `/athlete/activities?per_page=200${before ? `&before=${before}` : ''}${afterTs ? `&after=${afterTs}` : ''}`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;

    all.push(...batch);
    onProgress?.(all.length);
    if (batch.length < 200) break;

    const oldest = batch[batch.length - 1];
    before = Math.floor(new Date(oldest.start_date).getTime() / 1000) - 1;
  }
  return all;
}

export async function fetchActivities(
  afterTs: number | null,
  onProgress?: (count: number) => void,
): Promise<StravaActivity[]> {
  const cache = loadCache();

  // Use cache if it covers the requested period
  if (cache && cache.activities.length > 0) {
    const oldestCached = Math.min(...cache.activities.map(startTs));
    const cacheValid = afterTs === null
      ? cache.coversAllTime === true
      : oldestCached <= afterTs;

    if (cacheValid) {
      // Fetch only activities newer than our newest cached one
      const newActivities = await fetchActivitiesFromStrava(cache.lastFetchedAt, onProgress);

      if (newActivities.length > 0) {
        const existingIds = new Set(cache.activities.map(a => a.id));
        const merged = [
          ...newActivities.filter(a => !existingIds.has(a.id)),
          ...cache.activities,
        ];
        saveCache({ activities: merged, lastFetchedAt: startTs(newActivities[0]), coversAllTime: cache.coversAllTime });
        return inPeriod(merged, afterTs);
      }

      // Cache is up to date — filter to requested period
      return inPeriod(cache.activities, afterTs);
    }
  }

  // No usable cache — full fetch
  onProgress?.(0);
  const activities = await fetchActivitiesFromStrava(afterTs, onProgress);

  if (activities.length > 0) {
    const existing = cache?.activities ?? [];
    const existingIds = new Set(existing.map(a => a.id));
    const merged = [...activities.filter(a => !existingIds.has(a.id)), ...existing];
    saveCache({ activities: merged, lastFetchedAt: startTs(activities[0]), coversAllTime: afterTs === null });
  }

  return activities;
}

export function fetchActivityDetail(id: number): Promise<StravaActivity> {
  return stravaFetch<StravaActivity>(`/activities/${id}?include_all_efforts=true`);
}

/** Streams are optional extras — a failure just means no charts. */
export function fetchActivityStreams(id: number): Promise<StravaStreams> {
  return stravaFetch<StravaStreams>(
    `/activities/${id}/streams?keys=heartrate,cadence,watts,velocity_smooth,altitude,distance&key_by_type=true`
  ).catch(() => ({}));
}

export async function fetchSegmentsExplore(
  swLat: number, swLng: number, neLat: number, neLng: number,
): Promise<StravaSegmentExplore[]> {
  const bounds = `${swLat},${swLng},${neLat},${neLng}`;
  const data = await stravaFetch<{ segments: StravaSegmentExplore[] }>(`/segments/explore?bounds=${bounds}&activity_type=running`);
  return data.segments;
}
