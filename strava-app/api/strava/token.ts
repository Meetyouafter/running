import { json, requireEnv } from '../_utils';

export const runtime = 'nodejs';

export async function POST(): Promise<Response> {
  try {
    const resp = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: requireEnv('STRAVA_CLIENT_ID'),
        client_secret: requireEnv('STRAVA_CLIENT_SECRET'),
        refresh_token: requireEnv('STRAVA_REFRESH_TOKEN'),
        grant_type: 'refresh_token',
      }).toString(),
    });

    const data = await resp.json() as Record<string, unknown>;
    if (!resp.ok) {
      return json(data, { status: resp.status });
    }

    return json({
      access_token: data.access_token,
      expires_at: data.expires_at,
    });
  } catch (error) {
    return json({ error: String(error) }, { status: 500 });
  }
}
