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

function errorJson(response: any, status: number, error: string, extra?: Record<string, unknown>) {
  return response.status(status).json({ error, ...extra });
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

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return errorJson(response, 405, 'Method Not Allowed');
  }

  const key = process.env.ORS_API_KEY;
  if (!key) {
    return errorJson(response, 500, 'ORS_API_KEY is not set');
  }

  try {
    const body = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : (request.body ?? {});

    const { start, end, distanceM, roundTrip, seed, waypoint } = body as {
      start: [number, number];
      end?: [number, number];
      distanceM: number;
      roundTrip: boolean;
      seed: number;
      waypoint?: [number, number];
    };

    if (!start || !Array.isArray(start) || start.length !== 2) {
      return errorJson(response, 400, 'start is required');
    }

    if (waypoint) {
      const finalPt = roundTrip ? start : end;
      if (!finalPt) {
        return errorJson(response, 400, 'end is required when roundTrip is false');
      }

      const resp = await callORS(key, {
        coordinates: [
          [start[1], start[0]],
          [waypoint[1], waypoint[0]],
          [finalPt[1], finalPt[0]],
        ],
      });

      const text = await resp.text();
      const data = JSON.parse(text);
      return resp.ok
        ? response.status(resp.status).json(data)
        : errorJson(response, resp.status, text);
    }

    if (roundTrip) {
      const resp = await callORS(key, {
        coordinates: [[start[1], start[0]]],
        options: { round_trip: { length: distanceM, points: 3, seed } },
      });

      const text = await resp.text();
      if (!resp.ok) {
        return errorJson(response, resp.status, text);
      }

      return response.status(resp.status).json(JSON.parse(text));
    }

    if (!end) {
      return errorJson(response, 400, 'end is required when roundTrip is false');
    }

    for (let i = 0; i < 14; i++) {
      const waypointCandidate = detourWaypoint(start, end, distanceM, seed + i);
      const coords = waypointCandidate
        ? [[start[1], start[0]], [waypointCandidate[1], waypointCandidate[0]], [end[1], end[0]]]
        : [[start[1], start[0]], [end[1], end[0]]];

      const resp = await callORS(key, { coordinates: coords });
      const text = await resp.text();

      if (resp.ok) {
        return response.status(resp.status).json(JSON.parse(text));
      }

      if (!text.includes('Could not find a valid point')) {
        return errorJson(response, resp.status, text);
      }
    }

    const directResp = await callORS(key, {
      coordinates: [[start[1], start[0]], [end[1], end[0]]],
    });
    const directText = await directResp.text();

    if (directResp.ok) {
      return response.status(directResp.status).json(JSON.parse(directText));
    }

    return errorJson(response, directResp.status, directText);
  } catch (error) {
    console.error('Route generation function crashed', error);
    return errorJson(response, 500, String(error));
  }
}
