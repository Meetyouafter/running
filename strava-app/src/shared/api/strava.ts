let cachedToken: string | null = null;
let tokenExpiry  = 0;
let tokenRequest: Promise<string> | null = null;

interface StravaErrorBody {
  message?: string;
  errors?: { resource?: string; field?: string; code?: string }[];
}

/** Strava API failure with the parsed error body, so the UI can explain what went wrong. */
export class StravaApiError extends Error {
  readonly status: number;
  readonly body: StravaErrorBody | null;
  /** True when the failure happened while refreshing the token (server-side `.env` problem). */
  readonly duringTokenRefresh: boolean;

  constructor(status: number, body: StravaErrorBody | null, duringTokenRefresh = false) {
    super(`Strava HTTP ${status}${body?.message ? `: ${body.message}` : ''}`);
    this.name = 'StravaApiError';
    this.status = status;
    this.body = body;
    this.duringTokenRefresh = duringTokenRefresh;
  }

  /** Matches an entry of Strava's `errors[]`, e.g. hasError('Application', 'Inactive'). */
  hasError(resource: string, code: string): boolean {
    return !!this.body?.errors?.some(e => e.resource === resource && e.code === code);
  }
}

async function readErrorBody(res: Response): Promise<StravaErrorBody | null> {
  try { return await res.json() as StravaErrorBody; } catch { return null; }
}

async function refreshAccessToken(): Promise<string> {
  const res = await fetch('/api/strava/token', { method: 'POST' });
  if (!res.ok) throw new StravaApiError(res.status, await readErrorBody(res), true);
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

/**
 * Authenticated GET against the Strava v3 API. Retries once on 401 with a fresh token;
 * any other non-2xx response is thrown as StravaApiError.
 */
export async function stravaFetch<T>(path: string): Promise<T> {
  const call = (token: string) => fetch(`https://www.strava.com/api/v3${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let res = await call(await getAccessToken());
  if (res.status === 401) {
    cachedToken = null;
    res = await call(await getAccessToken());
  }
  if (!res.ok) throw new StravaApiError(res.status, await readErrorBody(res));
  return res.json() as Promise<T>;
}

/** Human-readable (ru) explanation of a Strava failure, with what to do about it. */
export function describeStravaError(e: unknown): string {
  if (e instanceof StravaApiError) {
    if (e.duringTokenRefresh) {
      return 'Не удалось обновить токен Strava — проверь STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / STRAVA_REFRESH_TOKEN в .env и что запущен сервер.';
    }
    if (e.hasError('Application', 'Inactive')) {
      return 'API-приложение Strava деактивировано. Проверь его статус на strava.com/settings/api — возможно, придётся создать новое приложение и получить новый refresh token.';
    }
    if (e.status === 401) return 'Strava не принимает токен (401) — refresh token отозван или устарел, переавторизуйся.';
    if (e.status === 403) return 'Strava запретила доступ (403) — у токена нет нужных прав (нужны activity:read_all и profile:read_all).';
    if (e.status === 429) return 'Превышен лимит запросов Strava (100 за 15 минут / 1000 в день). Подожди немного и обнови.';
    if (e.status >= 500) return `Strava временно недоступна (${e.status}). Попробуй позже.`;
    return e.message;
  }
  if (e instanceof TypeError) return 'Нет соединения со Strava — проверь интернет.';
  return String(e);
}
