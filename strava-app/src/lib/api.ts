import type { StravaActivity, StravaStreams } from '../types/strava';

let cachedToken: string | null = null;
let tokenExpiry  = 0;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() / 1000 < tokenExpiry - 60) return cachedToken;
  const res  = await fetch('/api/strava/token', { method: 'POST' });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
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

export async function fetchActivities(
  afterTs: number | null,
  onProgress?: (count: number) => void,
): Promise<StravaActivity[]> {
  const all: StravaActivity[] = [];
  let before: number | null = null;

  while (true) {
    let url = '/api/strava/activities?per_page=200';
    if (before)  url += `&before=${before}`;
    if (afterTs) url += `&after=${afterTs}`;

    const resp = await stravaFetch(`/athlete/activities?per_page=200${before ? `&before=${before}` : ''}${afterTs ? `&after=${afterTs}` : ''}`);
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

export async function fetchICUData(days = 90): Promise<{ activities: unknown[]; wellness: unknown[]; updated_at: string }> {
  const resp = await fetch(`/api/icu/data?days=${days}`);
  if (!resp.ok) throw new Error(`ICU HTTP ${resp.status}`);
  return resp.json() as Promise<{ activities: unknown[]; wellness: unknown[]; updated_at: string }>;
}
