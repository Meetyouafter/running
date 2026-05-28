import { json, readJson, requireEnv } from '../_utils';

export const runtime = 'nodejs';

interface RouteRequestBody {
  start: [number, number];
  end?: [number, number];
  distanceM: number;
  roundTrip: boolean;
  seed: number;
  waypoint?: [number, number];
}

function haversineM(a: [number, number], b: [number, number]): number {
  const radius = 6_371_000;
  const phi1 = a[0] * Math.PI / 180;
  const phi2 = b[0] * Math.PI / 180;
  const dPhi = (b[0] - a[0]) * Math.PI / 180;
  const dLambda = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

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

  const ex = (end[1] - start[1]) * mPerLng;
  const ey = (end[0] - start[0]) * mPerLat;
  const len = Math.sqrt(ex * ex + ey * ey);

  const a = targetM / 2;
  const b = Math.sqrt(a * a - (directM / 2) ** 2);

  const angles = [
    Math.PI / 2,
    Math.PI / 3,
    (2 * Math.PI) / 3,
    (5 * Math.PI) / 12,
    (7 * Math.PI) / 12,
    Math.PI / 4,
    (3 * Math.PI) / 4,
  ];
  const theta = angles[Math.floor(seed / 2) % angles.length];
  const side = seed % 2 === 0 ? 1 : -1;

  const wx = ex / 2 + a * Math.cos(theta) * (ex / len) + b * Math.sin(theta) * side * (-ey / len);
  const wy = ey / 2 + a * Math.cos(theta) * (ey / len) + b * Math.sin(theta) * side * (ex / len);

  return [
    start[0] + wy / mPerLat,
    start[1] + wx / mPerLng,
  ];
}

async function callORS(key: string, body: Record<string, unknown>): Promise<Response> {
  return fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
    method: 'POST',
    headers: {
      Authorization: key,
      'Content-Type': 'application/json',
      Accept: 'application/json, application/geo+json',
    },
    body: JSON.stringify(body),
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const key = requireEnv('ORS_API_KEY');
    const { start, end, distanceM, roundTrip, seed, waypoint } = await readJson<RouteRequestBody>(request);

    if (waypoint) {
      const finalPt = roundTrip ? start : end;
      if (!finalPt) {
        return json({ error: 'end is required when roundTrip is false' }, { status: 400 });
      }

      const coords = [
        [start[1], start[0]],
        [waypoint[1], waypoint[0]],
        [finalPt[1], finalPt[0]],
      ];
      const resp = await callORS(key, { coordinates: coords });
      const text = await resp.text();
      return new Response(text, {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (roundTrip) {
      const resp = await callORS(key, {
        coordinates: [[start[1], start[0]]],
        options: { round_trip: { length: distanceM, points: 3, seed } },
      });
      const text = await resp.text();
      return new Response(text, {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!end) {
      return json({ error: 'end is required when roundTrip is false' }, { status: 400 });
    }

    for (let i = 0; i < 14; i++) {
      const waypointCandidate = detourWaypoint(start, end, distanceM, seed + i);
      const coords = waypointCandidate
        ? [[start[1], start[0]], [waypointCandidate[1], waypointCandidate[0]], [end[1], end[0]]]
        : [[start[1], start[0]], [end[1], end[0]]];

      const resp = await callORS(key, { coordinates: coords });
      const text = await resp.text();

      if (resp.ok) {
        return new Response(text, {
          status: resp.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (!text.includes('Could not find a valid point')) {
        return json({ error: text }, { status: resp.status });
      }
    }

    const directResp = await callORS(key, {
      coordinates: [[start[1], start[0]], [end[1], end[0]]],
    });
    const directText = await directResp.text();

    if (directResp.ok) {
      return new Response(directText, {
        status: directResp.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return json({ error: directText }, { status: directResp.status });
  } catch (error) {
    return json({ error: String(error) }, { status: 500 });
  }
}
