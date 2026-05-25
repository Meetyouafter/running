import type { StravaStreams } from '../../../types/strava';
import type { PlanSession } from '../../../lib/trainingPlan';
import { dur, paceSecToStr, hrColor } from '../../../lib/utils';
import styles from './IntervalAnalysis.module.css';

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

interface Props {
  ivl:  IvlData;
  plan: PlanSession | null;
}

export default function IntervalAnalysis({ ivl, plan }: Props) {
  const planPace = plan?.type === 'interval' ? plan.targetPaceSec : null;
  const diffPace = planPace ? ivl.avgPaceSec - planPace : null;
  const verdict  = planPace
    ? (Math.abs(diffPace!) <= 15 ? '✅ В цель' : diffPace! > 15 ? `⚠️ Медленнее на ${diffPace}с/км` : `⚡ Быстрее на ${Math.abs(diffPace!)}с/км`)
    : '';

  function paceColor(ps: number) {
    if (!planPace) return 'var(--text)';
    const d = Math.abs(ps - planPace);
    return d <= 15 ? 'var(--green)' : d <= 30 ? '#eab308' : '#f44336';
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.title}>Анализ интервалов</div>
        <span className={styles.badge}>{ivl.count}×интервал{verdict ? ` · ${verdict}` : ''}</span>
      </div>

      <div className={styles.summary}>
        <div className={styles.sumCard}><div className={styles.sumLabel}>Интервалов</div><div className={styles.sumVal}>{ivl.count}</div></div>
        <div className={styles.sumCard}><div className={styles.sumLabel}>Ср. темп</div><div className={styles.sumVal}>{paceSecToStr(ivl.avgPaceSec)}/км</div></div>
        {planPace && (
          <div className={styles.sumCard}>
            <div className={styles.sumLabel}>План</div>
            <div className={styles.sumVal} style={{ color: paceColor(ivl.avgPaceSec) }}>{paceSecToStr(planPace)}/км</div>
          </div>
        )}
        <div className={styles.sumCard}>
          <div className={styles.sumLabel}>Стабильность</div>
          <div className={styles.sumVal} style={{ color: ivl.consistency >= 90 ? 'var(--green)' : ivl.consistency >= 80 ? '#eab308' : '#f44336' }}>
            {ivl.consistency}%
          </div>
        </div>
      </div>

      <table className={styles.table}>
        <thead><tr><th>#</th><th>Дист.</th><th>Темп</th><th>Время</th><th>Ср.ЧСС</th><th>Восст.</th></tr></thead>
        <tbody>
          {ivl.intervals.map(iv => {
            const rec = ivl.recoveries[iv.num - 1];
            return (
              <tr key={iv.num}>
                <td className={styles.num}>{iv.num}</td>
                <td>{iv.distance}м</td>
                <td style={{ color: paceColor(iv.paceSec) }}>{paceSecToStr(iv.paceSec)}/км</td>
                <td>{dur(iv.duration)}</td>
                <td>{iv.avgHR ? <span style={{ color: hrColor(iv.avgHR) }}>{iv.avgHR}</span> : '—'}</td>
                <td style={{ color: 'var(--muted)' }}>{rec ? dur(rec.duration) + (rec.avgHR ? ` ${rec.avgHR}bpm` : '') : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={styles.note}>
        Стабильность: <b>{ivl.consistency}%</b>
        {ivl.consistency >= 90 ? ' — отлично' : ivl.consistency >= 80 ? ' — хорошо' : ' — начинай сдержаннее'}
        {planPace && diffPace !== null && ` · Ошибка от плана: ${diffPace > 0 ? '+' : ''}${diffPace}с/км`}
      </div>
    </div>
  );
}
