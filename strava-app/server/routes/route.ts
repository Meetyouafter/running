import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const φ1 = a[0] * Math.PI / 180, φ2 = b[0] * Math.PI / 180;
  const dφ = (b[0] - a[0]) * Math.PI / 180;
  const dλ = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Возвращает промежуточную точку на эллипсе с фокусами A и B,
// где |AM| + |MB| = targetM. Угол на эллипсе варьируется через seed —
// каждый вариант даёт другой маршрут при «Перестроить».
function detourWaypoint(
  start: [number, number],
  end: [number, number],
  targetM: number,
  seed: number,
): [number, number] | null {
  const directM = haversineM(start, end);
  if (targetM <= directM) return null;

  const latAvgRad = ((start[0] + end[0]) / 2) * Math.PI / 180;
  const mPerLat = 111_000;
  const mPerLng = 111_000 * Math.cos(latAvgRad);

  // A→B в метрах (x=восток, y=север)
  const ex = (end[1] - start[1]) * mPerLng;
  const ey = (end[0] - start[0]) * mPerLat;
  const len = Math.sqrt(ex * ex + ey * ey);

  // Параметры эллипса: 2a = targetM, c = directM/2
  const a = targetM / 2;
  const b = Math.sqrt(a * a - (directM / 2) ** 2);

  // Варьируем угол θ ∈ [30°, 150°] и сторону через seed
  const angles = [Math.PI / 2, Math.PI / 3, 2 * Math.PI / 3, 5 * Math.PI / 12, 7 * Math.PI / 12, Math.PI / 4, 3 * Math.PI / 4];
  const θ = angles[Math.floor(seed / 2) % angles.length];
  const side = seed % 2 === 0 ? 1 : -1;

  // Точка на эллипсе в мировых метрах от старта
  const wx = ex / 2 + a * Math.cos(θ) * (ex / len) + b * Math.sin(θ) * side * (-ey / len);
  const wy = ey / 2 + a * Math.cos(θ) * (ey / len) + b * Math.sin(θ) * side * (ex / len);

  return [
    start[0] + wy / mPerLat,
    start[1] + wx / mPerLng,
  ];
}

router.post('/generate', async (req, res) => {
  const key = process.env.ORS_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'ORS_API_KEY не задан в .env' });
    return;
  }

  const { start, end, distanceM, roundTrip, seed, waypoint } = req.body as {
    start: [number, number];
    end?: [number, number];
    distanceM: number;
    roundTrip: boolean;
    seed: number;
    waypoint?: [number, number];
  };

  async function callORS(body: Record<string, unknown>) {
    return fetch(
      'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
      {
        method: 'POST',
        headers: {
          Authorization: key!,
          'Content-Type': 'application/json',
          Accept: 'application/json, application/geo+json',
        },
        body: JSON.stringify(body),
      }
    );
  }

  try {
    // Explicit waypoint — direct routing through all points, no detour math
    if (waypoint) {
      const finalPt = roundTrip ? start : end!;
      const coords = [
        [start[1], start[0]],
        [waypoint[1], waypoint[0]],
        [finalPt[1], finalPt[0]],
      ];
      const resp = await callORS({ coordinates: coords });
      const text = await resp.text();
      if (resp.ok) { res.json(JSON.parse(text)); } else { res.status(resp.status).json({ error: text }); }
      return;
    }

    if (roundTrip) {
      const body = {
        coordinates: [[start[1], start[0]]],
        options: { round_trip: { length: distanceM, points: 3, seed } },
      };
      const resp = await callORS(body);
      if (!resp.ok) {
        res.status(resp.status).json({ error: await resp.text() });
        return;
      }
      res.json(await resp.json());
      return;
    }

    // Point-to-point: перебираем все 14 вариантов угол×сторона,
    // затем падаем на прямой маршрут без промежуточной точки.
    for (let i = 0; i < 14; i++) {
      const wp = detourWaypoint(start, end!, distanceM, seed + i);
      const coords = wp
        ? [[start[1], start[0]], [wp[1], wp[0]], [end![1], end![0]]]
        : [[start[1], start[0]], [end![1], end![0]]];

      const resp = await callORS({ coordinates: coords });
      const text = await resp.text();

      if (resp.ok) {
        res.json(JSON.parse(text));
        return;
      }
      if (!text.includes('Could not find a valid point')) {
        res.status(resp.status).json({ error: text });
        return;
      }
    }

    // Все варианты объезда непроходимы — отдаём прямой маршрут
    const directResp = await callORS({
      coordinates: [[start[1], start[0]], [end![1], end![0]]],
    });
    const directText = await directResp.text();
    if (directResp.ok) {
      res.json(JSON.parse(directText));
    } else {
      res.status(directResp.status).json({ error: directText });
    }
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
