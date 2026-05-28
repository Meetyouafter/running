import type { StravaActivity } from '../../types/strava';
import { actPaceSec, paceSecToStr, fmt, addDays, weekMondayKey } from '../../lib/utils';
import { TRAINING_PLAN, RACE_DATE, RACE_TARGET_MIN } from '../../lib/trainingPlan';
import LineChart from '../../components/Charts/LineChart';
import styles from './ProgressSection.module.css';

const START_MIN    = 61;
const GOAL_MIN     = RACE_TARGET_MIN;
const RACE_DISPLAY = new Date(RACE_DATE).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
const GOAL_TIME    = `${String(RACE_TARGET_MIN).padStart(2,'0')}:00`;


interface Props { activities: StravaActivity[] }

export default function ProgressSection({ activities }: Props) {
  const today   = new Date().toISOString().slice(0, 10);
  const runs    = activities.filter(a => a.type === 'Run');
  if (!runs.length) return null;

  /* ── 1. Progress to goal ── */
  const shortRuns  = runs.filter(a => a.distance >= 4000 && a.distance <= 7500);
  const bestShort  = [...shortRuns].sort((a, b) => actPaceSec(a) - actPaceSec(b))[0];
  const pred10k    = bestShort ? actPaceSec(bestShort) * 1.06 * 10 / 60 : null;
  const daysToRace = Math.round((new Date(RACE_DATE).getTime() - Date.now()) / 86400000);
  const progress   = pred10k
    ? Math.max(0, Math.min(100, (START_MIN - pred10k) / (START_MIN - GOAL_MIN) * 100))
    : 0;

  /* ── 2. Weekly predicted 10K trend ── */
  const weekBest: Record<string, number> = {};
  shortRuns.forEach(a => {
    const k = weekMondayKey(a.start_date_local);
    const v = actPaceSec(a) * 1.06 * 10 / 60;
    if (!weekBest[k] || v < weekBest[k]) weekBest[k] = v;
  });
  const trendKeys = Object.keys(weekBest).sort().slice(-10);
  const trendVals = trendKeys.map(k => Math.round(weekBest[k] * 10) / 10);

  /* ── 3. Easy pace trend (weekly avg, sec/km) ── */
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

  /* ── 4. Current week plan compliance ── */
  const nextSess   = TRAINING_PLAN.find(p => p.date > today);
  const weekNum    = nextSess?.week ?? TRAINING_PLAN[TRAINING_PLAN.length - 1].week;
  const weekSess   = TRAINING_PLAN.filter(p => p.week === weekNum);

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
      const found = runs.find(a => !usedIds.has(a.id) && a.start_date_local.slice(0, 10) === addDays(p.date, off));
      if (found) { doneSet.add(p.date); usedIds.add(found.id); break; }
    }
  }
  const doneSess = weekSess.filter(p => doneSet.has(p.date));

  return (
    <>
      {/* Progress to goal */}
      {daysToRace > 0 && pred10k && (
        <div className={styles.goalCard}>
          <div className={styles.goalRow}>
            <div>
              <div className={styles.goalTitle}>Прогресс к цели · 10 км</div>
              <div className={styles.goalSub}>{daysToRace} дней до старта · {RACE_DISPLAY}</div>
            </div>
            <div className={styles.goalTimes}>
              <div>
                <div className={styles.goalLabel}>Сейчас</div>
                <div className={styles.goalVal}>{fmt(pred10k, 1)}<span className={styles.goalUnit}> мин</span></div>
              </div>
              <div className={styles.goalArrow}>→</div>
              <div>
                <div className={styles.goalLabel}>Цель</div>
                <div className={`${styles.goalVal} ${styles.goalValTarget}`}>{GOAL_TIME}</div>
              </div>
            </div>
          </div>
          <div style={{ position: 'relative', paddingTop: 22 }}>
            <div style={{
              position: 'absolute',
              left: `${Math.max(2, progress)}%`,
              top: 0,
              transform: 'translateX(-50%)',
              fontSize: 18,
              lineHeight: 1,
              userSelect: 'none',
              filter: 'drop-shadow(0 0 5px rgba(252,76,2,0.7))',
            }}>
              🏃
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${Math.max(2, progress)}%` }} />
            </div>
          </div>
          <div className={styles.progressLabels}>
            <span>~{START_MIN} мин</span>
            <span className={styles.progressPct}>{fmt(progress, 0)}% пути</span>
            <span>{GOAL_TIME}</span>
          </div>
        </div>
      )}

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

      {/* Trend charts */}
      <div className="two-col" style={{ marginBottom: 22 }}>
        {trendVals.length >= 2 && (
          <div>
            <div className="section-title">Расч. 10 км по неделям (мин)</div>
            <div className="chart-container">
              <LineChart
                labels={trendKeys.map(k => k.slice(5))}
                data={trendVals}
                color="#FC4C02"
                yMin={50}
              />
            </div>
          </div>
        )}
        {easyVals.length >= 2 && (
          <div>
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
      </div>

    </>
  );
}
