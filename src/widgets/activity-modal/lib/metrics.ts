import type { StravaStreams } from '@/entities/activity';

/** Average running cadence in steps/min (Strava reports per-leg), or null if absent. */
export function avgCadence(streams: StravaStreams): number | null {
  const cad = streams.cadence?.data;
  if (!cad?.length) return null;
  return cad.reduce((s, v) => s + v, 0) / cad.length * 2;
}

/**
 * Aerobic decoupling, %: how much the speed/HR efficiency of the second half
 * drops relative to the first. <5% is a well-paced aerobic run. Null if no data.
 */
export function aerobicDecoupling(streams: StravaStreams): number | null {
  const dist = streams.distance?.data, hr = streams.heartrate?.data, vel = streams.velocity_smooth?.data;
  if (!dist?.length || !hr?.length || !vel?.length) return null;
  const mid = Math.floor(dist.length / 2);
  let ef1 = 0, ef2 = 0, c1 = 0, c2 = 0;
  for (let i = 0; i < dist.length; i++) {
    if (vel[i] > 0 && hr[i] > 0) {
      const ef = vel[i] / hr[i];
      if (i < mid) { ef1 += ef; c1++; } else { ef2 += ef; c2++; }
    }
  }
  if (!c1 || !c2) return null;
  return Math.abs((ef1 / c1 - ef2 / c2) / (ef1 / c1) * 100);
}

/** Downsamples a stream to ≤`points` samples keyed by distance (km, 1 decimal). */
export function sampleByDistance(
  streams: StravaStreams,
  key: 'heartrate' | 'cadence',
  transform: (v: number) => number = v => v,
  points = 120,
): { labels: string[]; data: number[] } | null {
  const dist = streams.distance?.data, values = streams[key]?.data;
  if (!dist?.length || !values?.length) return null;
  const step = Math.max(1, Math.floor(dist.length / points));
  const labels: string[] = [], data: number[] = [];
  for (let i = 0; i < dist.length; i += step) {
    labels.push((dist[i] / 1000).toFixed(1));
    data.push(transform(values[i]));
  }
  return { labels, data };
}
