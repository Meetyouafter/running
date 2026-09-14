let cachedToken: string | null = null;
let tokenExpiry  = 0;
let tokenRequest: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const res = await fetch('/api/strava/token', { method: 'POST' });
  if (!res.ok) {
    let detail: string;
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

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() / 1000 < tokenExpiry - 60) return cachedToken;
  // Dedupe concurrent callers (e.g. several tabs fetching in parallel on page load)
  // into a single in-flight /api/strava/token request instead of one each.
  if (!tokenRequest) {
    tokenRequest = refreshAccessToken().finally(() => { tokenRequest = null; });
  }
  return tokenRequest;
}

/** Authenticated GET against the Strava v3 API; retries once on 401 with a fresh token. */
export async function stravaFetch(path: string): Promise<Response> {
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
