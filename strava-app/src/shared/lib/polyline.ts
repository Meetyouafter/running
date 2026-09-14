export function decodePolyline(enc: string): [number, number][] {
  const pts: [number, number][] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < enc.length) {
    let b, sh = 0, res = 0;
    do { b = enc.charCodeAt(i++) - 63; res |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20);
    lat += ((res & 1) ? ~(res >> 1) : (res >> 1));
    sh = 0; res = 0;
    do { b = enc.charCodeAt(i++) - 63; res |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20);
    lng += ((res & 1) ? ~(res >> 1) : (res >> 1));
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
}
