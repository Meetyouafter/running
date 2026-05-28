import type { StravaActivity, StravaStreams, StravaSegmentExplore } from '../types/strava';

// ─── localStorage activity cache ────────────────────────────────────────────
const CACHE_KEY = 'strava_activities_cache';

interface ActivityCache {
  activities: StravaActivity[];
  lastFetchedAt: number;
  coversAllTime?: boolean;
}

function loadCache(): ActivityCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ActivityCache) : null;
  } catch { return null; }
}

function saveCache(cache: ActivityCache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* quota */ }
}

export function clearActivityCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}
// ────────────────────────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiry  = 0;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() / 1000 < tokenExpiry - 60) return cachedToken;
  const res  = await fetch('/api/strava/token', { method: 'POST' });
  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json() as { error?: string; message?: string; errors?: unknown };
      detail = data.error || data.message || JSON.stringify(data);
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = '';
      }
    }
    throw new Error(`Token refresh failed: ${res.status}${detail ? ` - ${detail}` : ''}`);
  }
  const data = await res.json() as { access_token: string; expires_at: number };
  cachedToken = data.access_token;
  tokenExpiry  = data.expires_at;
  return cachedToken;
}

async function stravaFetch(path: string): Promise<Response> {
  const token = await getAccessToken();
  let resp = await fetch(`https://www.strava.com/api/v3${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (resp.status === 401) {
    cachedToken = null;
    const newToken = await getAccessToken();
    resp = await fetch(`https://www.strava.com/api/v3${path}`, {
      headers: { Authorization: `Bearer ${newToken}` },
    });
  }
  return resp;
}

async function fetchActivitiesFromStrava(
  afterTs: number | null,
  onProgress?: (count: number) => void,
): Promise<StravaActivity[]> {
  const all: StravaActivity[] = [];
  let before: number | null = null;

  while (true) {
    const resp = await stravaFetch(
      `/athlete/activities?per_page=200${before ? `&before=${before}` : ''}${afterTs ? `&after=${afterTs}` : ''}`
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const batch = await resp.json() as StravaActivity[];
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
    const oldestCached = cache.activities.reduce(
      (min, a) => Math.min(min, Math.floor(new Date(a.start_date).getTime() / 1000)),
      Infinity
    );
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
        const newest = Math.floor(new Date(newActivities[0].start_date).getTime() / 1000);
        saveCache({ activities: merged, lastFetchedAt: newest, coversAllTime: cache.coversAllTime });
        return merged.filter(a =>
          afterTs === null || Math.floor(new Date(a.start_date).getTime() / 1000) >= afterTs
        );
      }

      // Cache is up to date — filter to requested period
      return cache.activities.filter(a =>
        afterTs === null || Math.floor(new Date(a.start_date).getTime() / 1000) >= afterTs
      );
    }
  }

  // No usable cache — full fetch
  onProgress?.(0);
  const activities = await fetchActivitiesFromStrava(afterTs, onProgress);

  if (activities.length > 0) {
    const newest = Math.floor(new Date(activities[0].start_date).getTime() / 1000);
    const existing = cache?.activities ?? [];
    const existingIds = new Set(existing.map(a => a.id));
    const merged = [...activities.filter(a => !existingIds.has(a.id)), ...existing];
    saveCache({ activities: merged, lastFetchedAt: newest, coversAllTime: afterTs === null });
  }

  return activities;
}

export async function fetchActivityDetail(id: number): Promise<StravaActivity> {
  const resp = await stravaFetch(`/activities/${id}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json() as Promise<StravaActivity>;
}

export async function fetchActivityStreams(id: number): Promise<StravaStreams> {
  const resp = await stravaFetch(
    `/activities/${id}/streams?keys=heartrate,cadence,watts,velocity_smooth,altitude,distance&key_by_type=true`
  );
  if (!resp.ok) return {};
  return resp.json() as Promise<StravaStreams>;
}

export async function fetchSegmentsExplore(
  swLat: number, swLng: number, neLat: number, neLng: number,
): Promise<StravaSegmentExplore[]> {
  const bounds = `${swLat},${swLng},${neLat},${neLng}`;
  const resp = await stravaFetch(`/segments/explore?bounds=${bounds}&activity_type=running`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json() as { segments: StravaSegmentExplore[] };
  return data.segments;
}

export async function fetchICUData(days = 90): Promise<{ activities: unknown[]; wellness: unknown[]; updated_at: string }> {
  const resp = await fetch(`/api/icu/data?days=${days}`);
  if (!resp.ok) throw new Error(`ICU HTTP ${resp.status}`);
  return resp.json() as Promise<{ activities: unknown[]; wellness: unknown[]; updated_at: string }>;
}
