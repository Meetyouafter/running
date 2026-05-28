function haversineM(a: [number, number], b: [number, number]): number {
  const radius = 6_371_000;
  const phi1 = a[0] * Math.PI / 180;
  const phi2 = b[0] * Math.PI / 180;
  const dPhi = (b[0] - a[0]) * Math.PI / 180;
  const dLambda = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function coordsLengthM(coords: [number, number][]): number {
  let distance = 0;
  for (let i = 1; i < coords.length; i++) {
    distance += haversineM(coords[i - 1], coords[i]);
  }
  return distance;
}

function errorJson(response: any, status: number, error: string) {
  return response.status(status).json({ error });
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return errorJson(response, 405, 'Method Not Allowed');
  }

  const swLat = Number.parseFloat(String(request.query.swLat ?? ''));
  const swLng = Number.parseFloat(String(request.query.swLng ?? ''));
  const neLat = Number.parseFloat(String(request.query.neLat ?? ''));
  const neLng = Number.parseFloat(String(request.query.neLng ?? ''));

  if ([swLat, swLng, neLat, neLng].some(Number.isNaN)) {
    return errorJson(response, 400, 'Invalid bounding box');
  }

  const bbox = `${swLat},${swLng},${neLat},${neLng}`;
  const query = `[out:json][timeout:30];
(
  relation["route"~"running|foot|hiking|walking"](${bbox});
  way["leisure"="track"](${bbox});
  way["highway"~"footway|path|track"]["name"](${bbox});
  way["highway"~"footway|path"]["foot"="designated"](${bbox});
);
out geom tags;`;

  try {
    const upstream = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
      },
      body: new URLSearchParams({ data: query }).toString(),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      console.error('Overpass request failed', { status: upstream.status, body: text.slice(0, 500) });
      return errorJson(response, upstream.status, text || `Overpass API: ${upstream.status}`);
    }

    const data = JSON.parse(text) as {
      elements: Array<{
        type: string;
        id: number;
        tags?: Record<string, string>;
        geometry?: Array<{ lat: number; lon: number }>;
        members?: Array<{ type: string; geometry?: Array<{ lat: number; lon: number }> }>;
      }>;
    };

    const results: Array<{
      id: number;
      name: string;
      distanceM: number;
      coords: [number, number][];
    }> = [];

    for (const element of data.elements) {
      let coords: [number, number][] = [];

      if (element.type === 'relation' && element.members) {
        for (const member of element.members) {
          if (member.type === 'way' && member.geometry) {
            for (const pt of member.geometry) {
              coords.push([pt.lat, pt.lon]);
            }
          }
        }
      } else if (element.type === 'way' && element.geometry) {
        coords = element.geometry.map((pt) => [pt.lat, pt.lon]);
      }

      if (coords.length < 2) continue;

      const name = element.tags?.name
        || (element.tags?.leisure === 'track' ? 'Беговая дорожка' : null)
        || element.tags?.ref
        || null;

      if (!name) continue;

      results.push({
        id: element.id,
        name,
        distanceM: coordsLengthM(coords),
        coords,
      });
    }

    return response.status(200).json(results.sort((a, b) => a.distanceM - b.distanceM));
  } catch (error) {
    console.error('Overpass function crashed', error);
    return errorJson(response, 500, String(error));
  }
}
