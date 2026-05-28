import { json, requireEnv } from '../_utils';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  try {
    const id = requireEnv('ICU_ID');
    const key = requireEnv('ICU_KEY');
    const { searchParams } = new URL(request.url);
    const days = Number.parseInt(searchParams.get('days') ?? '90', 10);
    const after = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const before = new Date().toISOString().slice(0, 10);

    const headers = {
      Authorization: `Basic ${Buffer.from(`API_KEY:${key}`).toString('base64')}`,
    };

    const [actRes, wellRes] = await Promise.all([
      fetch(`https://intervals.icu/api/v1/athlete/${id}/activities?oldest=${after}&newest=${before}`, { headers }),
      fetch(`https://intervals.icu/api/v1/athlete/${id}/wellness?oldest=${after}&newest=${before}`, { headers }),
    ]);

    const activities = actRes.ok ? await actRes.json() : [];
    const wellness = wellRes.ok ? await wellRes.json() : [];

    return json({
      activities,
      wellness,
      updated_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
    });
  } catch (error) {
    return json({ error: String(error) }, { status: 500 });
  }
}
