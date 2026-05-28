export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return response.status(500).json({
      error: 'Missing Strava environment variables',
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      hasRefreshToken: Boolean(refreshToken),
    });
  }

  try {
    const upstream = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const text = await upstream.text();
    let data: unknown = text;

    try {
      data = JSON.parse(text);
    } catch {
      // Keep plain text payload if upstream did not return JSON.
    }

    if (!upstream.ok) {
      console.error('Strava token refresh failed', {
        status: upstream.status,
        body: data,
      });
      return response.status(upstream.status).json(data);
    }

    return response.status(200).json(data);
  } catch (error) {
    console.error('Strava token function crashed', error);
    return response.status(500).json({ error: String(error) });
  }
}
