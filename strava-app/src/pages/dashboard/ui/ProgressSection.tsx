import { useEffect, useMemo, useState } from 'react';
import { fetchActivityDetail, actPaceSec, type StravaActivity, type StravaBestEffort } from '@/entities/activity';
import { TRAINING_PLAN, RACE_DATE, RACE_GOALS } from '@/entities/training-plan';
import { paceSecToStr, addDays, weekMondayKey, durMinStr } from '@/shared/lib';
import { LineChart } from '@/shared/ui';
import styles from './ProgressSection.module.css';

const RACE_DISPLAY = new Date(RACE_DATE).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
const FATIGUE      = 1.06; // Riegel exponent

function riegelPredict(t1: number, d1: number, d2: number): number {
  return t1 * Math.pow(d2 / d1, FATIGUE);
}

// Distances tracked on the goals card — independent of which ones have an
// explicit RACE_GOALS target, so e.g. the marathon still shows a record/
// prediction even with no target time set yet.
const GOAL_DISTANCES: { distKm: number; label: string; effortName: string; minD: number; maxD: number }[] = [
  { distKm: 5,    label: '5 км',    effortName: '5K',            minD: 4600,  maxD: 5500  },
  { distKm: 10,   label: '10 км',   effortName: '10K',           minD: 9500,  maxD: 10800 },
  { distKm: 21.1, label: '21.1 км', effortName: 'Half-Marathon', minD: 20000, maxD: 22500 },
  { distKm: 42.2, label: '42.2 км', effortName: 'Marathon',      minD: 40500, maxD: 43500 },
];

const PR_CACHE_KEY = 'strava_pr_cache';
const CANDIDATES_PER_RANGE = 3;

function loadPrCache(): Record<number, StravaBestEffort[]> {
  try { return JSON.parse(localStorage.getItem(PR_CACHE_KEY) || '{}'); } catch { return {}; }
}
function savePrCache(cache: Record<number, StravaBestEffort[]>) {
  try { localStorage.setItem(PR_CACHE_KEY, JSON.stringify(cache)); } catch { /* quota */ }
}

interface Record_ { min: number; date: string }

interface Props { activities: StravaActivity[] }

export default function ProgressSection({ activities }: Props) {
  const today   = new Date().toISOString().slice(0, 10);
  const [now]   = useState(() => Date.now());
  const runs    = useMemo(
    () => activities.filter(a => a.type === 'Run' && a.distance >= 1000 && a.moving_time > 0),
    [activities],
  );
  const [records, setRecords] = useState<Record<string, Record_ | null>>({});

  useEffect(() => {
    let cancelled = false;
    const cache = loadPrCache();

    async function resolve() {
      const result: Record<string, Record_ | null> = {};

      for (const d of GOAL_DISTANCES) {
        const candidates = runs
          .filter(a => a.distance >= d.minD && a.distance <= d.maxD)
          .sort((a, b) => actPaceSec(a) - actPaceSec(b))
          .slice(0, CANDIDATES_PER_RANGE);
        if (!candidates.length) { result[d.label] = null; continue; }

        let best: Record_ | null = null;
        for (const cand of candidates) {
          let efforts = cache[cand.id];
          if (!efforts) {
            try {
              const detail = await fetchActivityDetail(cand.id);
              efforts = detail.best_efforts ?? [];
              cache[cand.id] = efforts;
            } catch {
              efforts = [];
            }
          }
          const match = efforts.find(e => e.name === d.effortName);
          if (match && (!best || match.elapsed_time / 60 < best.min)) {
            best = { min: match.elapsed_time / 60, date: match.start_date_local.slice(0, 10) };
          }
        }
        if (!best) {
          // Fall back to the whole-activity heuristic if no matching best_effort
          const a = candidates[0];
          best = { min: (actPaceSec(a) * a.distance / 1000) / 60, date: a.start_date_local.slice(0, 10) };
        }
        result[d.label] = best;
      }

      savePrCache(cache);
      if (!cancelled) setRecords(result);
    }

    if (runs.length) resolve();
    return () => { cancelled = true; };
  }, [runs]);

  if (!runs.length) return null;

  /* ── Predictions (Riegel from best recent-90-day effort) ── */
  const recent90 = runs.filter(a => new Date(a.start_date_local) >= new Date(now - 90 * 86400000));
  const daysToRace = Math.round((new Date(RACE_DATE).getTime() - now) / 86400000);

  function bestPredictionMin(targetM: number): number | null {
    if (!recent90.length) return null;
    return Math.min(...recent90.map(a => riegelPredict(a.moving_time, a.distance, targetM))) / 60;
  }

  /* ── Easy pace trend (weekly avg, sec/km) ── */
  const easyWeek: Record<string, number[]> = {};
  runs.filter(a => actPaceSec(a) > 390 && a.distance > 4000).forEach(a => {
    const k = weekMondayKey(a.start_date_local);
    if (!easyWeek[k]) easyWeek[k] = [];
    easyWeek[k].push(actPaceSec(a));
  });
  const easyKeys = Object.keys(easyWeek).sort().slice(-10);
  const easyVals = easyKeys.map(k => {
    const arr = easyWeek[k];
    return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
  });

  /* ── Current week plan compliance ── */
  const nextSess   = TRAINING_PLAN.find(p => p.date > today);
  const weekNum    = nextSess?.week ?? TRAINING_PLAN[TRAINING_PLAN.length - 1].week;
  const weekSess   = TRAINING_PLAN.filter(p => p.week === weekNum);
  const planStart  = TRAINING_PLAN[0]?.date;

  // Two-pass match (mirrors buildActivityMap): each run counts for at most one session
  const usedIds = new Set<number>();
  const doneSet = new Set<string>();
  for (const p of weekSess) {
    const found = runs.find(a => !usedIds.has(a.id) && a.start_date_local.slice(0, 10) === p.date);
    if (found) { doneSet.add(p.date); usedIds.add(found.id); }
  }
  for (const p of weekSess) {
    if (doneSet.has(p.date)) continue;
    for (const off of [-1, 1]) {
      const cand = addDays(p.date, off);
      if (planStart && cand < planStart) continue; // don't reach back to before the plan started
      const found = runs.find(a => !usedIds.has(a.id) && a.start_date_local.slice(0, 10) === cand);
      if (found) { doneSet.add(p.date); usedIds.add(found.id); break; }
    }
  }
  const doneSess = weekSess.filter(p => doneSet.has(p.date));

  return (
    <>
      {/* Goals: record / target / Riegel prediction / gap to close */}
      <div className={styles.goalCard}>
        <div className={styles.goalRow}>
          <div>
            <div className={styles.goalTitle}>Прогресс к целям</div>
            <div className={styles.goalSub}>
              {daysToRace > 0 ? `${daysToRace} дней до старта · ${RACE_DISPLAY}` : 'Личные рекорды и прогнозы'}
            </div>
          </div>
        </div>
        <div className={styles.goalsGrid4}>
          {GOAL_DISTANCES.map(d => {
            const goal   = RACE_GOALS.find(g => g.distKm === d.distKm);
            const record = records[d.label];
            const pred   = bestPredictionMin(d.distKm * 1000);
            // Positive = still need to shave this much off the record to hit the goal.
            const toImprove = (goal && record) ? goal.targetMin - record.min : null;

            return (
              <div key={d.label} className={styles.goalCard4}>
                <div className={styles.goalCard4Title}>{d.label}</div>

                <div className={styles.goalMetricRow}>
                  <span className={styles.goalMetricLabel}>🏅 Рекорд</span>
                  <span className={styles.goalMetricVal}>{record ? durMinStr(record.min) : '-'}</span>
                </div>
                <div className={styles.goalMetricRow}>
                  <span className={styles.goalMetricLabel}>🎯 Цель</span>
                  <span className={styles.goalMetricVal}>{goal ? durMinStr(goal.targetMin) : '-'}</span>
                </div>
                <div className={styles.goalMetricRow}>
                  <span className={styles.goalMetricLabel}>📈 Прогноз</span>
                  <span className={styles.goalMetricVal}>{pred !== null ? durMinStr(pred) : '-'}</span>
                </div>
                <div className={`${styles.goalMetricRow} ${styles.goalMetricRowHi}`}>
                  <span className={styles.goalMetricLabel}>Улучшить на</span>
                  {toImprove === null ? (
                    <span className={styles.goalMetricVal}>-</span>
                  ) : toImprove >= 0 ? (
                    <span className={styles.goalMiniDiffOk}>✅ цель уже есть</span>
                  ) : (
                    <span className={styles.goalMiniDiffWarn}>−{fmtSignedMin(toImprove)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current week compliance */}
      {weekSess.length > 0 && (
        <div className={styles.weekBar}>
          <div className={styles.weekBarTitle}>
            {weekNum ? `Неделя ${weekNum} плана` : 'Текущая неделя'}
          </div>
          <div className={styles.dots}>
            {weekSess.map((s, i) => {
              const done = doneSess.includes(s);
              const past = s.date <= today;
              return (
                <div key={i} title={s.title}
                  className={`${styles.dot} ${done ? styles.dotDone : past ? styles.dotMiss : styles.dotFuture}`}
                />
              );
            })}
          </div>
          <div className={styles.weekBarSub}>{doneSess.length} / {weekSess.length} выполнено</div>
        </div>
      )}

      {/* Trend chart */}
      {easyVals.length >= 2 && (
        <div style={{ marginBottom: 22 }}>
          <div className="section-title">Лёгкий темп по неделям ⬇ лучше</div>
          <div className="chart-container">
            <LineChart
              labels={easyKeys.map(k => k.slice(5))}
              data={easyVals}
              color="#00e676"
              yMin={360}
              formatY={v => paceSecToStr(Math.round(v))}
            />
          </div>
        </div>
      )}

    </>
  );
}

function fmtSignedMin(min: number): string {
  const totalSec = Math.round(Math.abs(min) * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
