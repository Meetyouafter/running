import type { StravaStreams } from '@/entities/activity';

export interface IvlData {
  count:            number;
  intervals:        { num: number; duration: number; distance: number; paceSec: number; avgHR: number | null; maxHR: number | null }[];
  recoveries:       { duration: number; avgHR: number | null }[];
  avgPaceSec:       number;
  consistency:      number;
  fastThreshPace:   number;
}

export function detectIntervals(streams: StravaStreams): IvlData | null {
  const vel = streams.velocity_smooth?.data;
  if (!vel || vel.length < 60) return null;
  const hr = streams.heartrate?.data || [];

  const active = vel.filter(v => v > 0.5);
  if (!active.length) return null;
  const mean = active.reduce((s, v) => s + v, 0) / active.length;
  const fastThresh = mean * 1.18;

  const segs: { s: number; e: number }[] = [];
  let inFast = false, segStart = 0;
  for (let i = 0; i < vel.length; i++) {
    if (!inFast && vel[i] >= fastThresh) { inFast = true; segStart = i; }
    else if (inFast && vel[i] < fastThresh) {
      if (i - segStart >= 25) segs.push({ s: segStart, e: i });
      inFast = false;
    }
  }
  if (inFast && vel.length - segStart >= 25) segs.push({ s: segStart, e: vel.length });

  const merged: { s: number; e: number }[] = [];
  segs.forEach(seg => {
    if (merged.length && seg.s - merged[merged.length - 1].e <= 15)
      merged[merged.length - 1].e = seg.e;
    else merged.push({ s: seg.s, e: seg.e });
  });
  if (merged.length < 2) return null;

  const intervals = merged.map((seg, idx) => {
    const vSlice = vel.slice(seg.s, seg.e);
    const hSlice = hr.slice(seg.s, seg.e).filter(Boolean);
    const avgVel = vSlice.reduce((s, v) => s + v, 0) / vSlice.length;
    const duration = seg.e - seg.s;
    return {
      num:      idx + 1,
      duration,
      distance: Math.round(avgVel * duration),
      paceSec:  Math.round(1000 / avgVel),
      avgHR:    hSlice.length ? Math.round(hSlice.reduce((s, v) => s + v, 0) / hSlice.length) : null,
      maxHR:    hSlice.length ? Math.max(...hSlice) : null,
    };
  });

  const recoveries = merged.slice(0, -1).map((seg, j) => {
    const recHR = hr.slice(seg.e, merged[j + 1].s).filter(Boolean);
    return {
      duration: merged[j + 1].s - seg.e,
      avgHR:    recHR.length ? Math.round(recHR.reduce((s, v) => s + v, 0) / recHR.length) : null,
    };
  });

  const paces   = intervals.map(x => x.paceSec);
  const avgPace = paces.reduce((s, v) => s + v, 0) / paces.length;
  const stdDev  = Math.sqrt(paces.reduce((s, v) => s + (v - avgPace) ** 2, 0) / paces.length);
  const consistency = Math.round((1 - stdDev / avgPace) * 100);

  return {
    count:          intervals.length,
    intervals,
    recoveries,
    avgPaceSec:     Math.round(avgPace),
    consistency,
    fastThreshPace: Math.round(1000 / fastThresh),
  };
}
