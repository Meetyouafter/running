import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

router.get('/data', async (req, res) => {
  const id  = process.env.ICU_ID!;
  const key = process.env.ICU_KEY!;
  const days = parseInt(String(req.query.days || '90'));
  const after = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const before = new Date().toISOString().slice(0, 10);

  try {
    const headers: Record<string, string> = {
      Authorization: 'Basic ' + Buffer.from(`API_KEY:${key}`).toString('base64'),
    };

    const [actRes, wellRes] = await Promise.all([
      fetch(`https://intervals.icu/api/v1/athlete/${id}/activities?oldest=${after}&newest=${before}`, { headers }),
      fetch(`https://intervals.icu/api/v1/athlete/${id}/wellness?oldest=${after}&newest=${before}`, { headers }),
    ]);

    const activities = actRes.ok ? await actRes.json() : [];
    const wellness   = wellRes.ok ? await wellRes.json() : [];

    res.json({ activities, wellness, updated_at: new Date().toISOString().slice(0, 16).replace('T', ' ') });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
