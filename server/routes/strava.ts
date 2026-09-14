import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

router.post('/token', async (req, res) => {
  try {
    const resp = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.STRAVA_CLIENT_ID!,
        client_secret: process.env.STRAVA_CLIENT_SECRET!,
        refresh_token: process.env.STRAVA_REFRESH_TOKEN!,
        grant_type:    'refresh_token',
      }).toString(),
    });
    const data = await resp.json() as Record<string, unknown>;
    if (!resp.ok) return res.status(resp.status).json(data);
    res.json({ access_token: data.access_token, expires_at: data.expires_at });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
