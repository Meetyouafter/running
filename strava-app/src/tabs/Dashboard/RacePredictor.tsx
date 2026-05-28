import type { StravaActivity } from '../../types/strava';
import { paceSecToStr } from '../../lib/utils';
import styles from './RacePredictor.module.css';

const FATIGUE = 1.06;

const TARGETS = [
  { label: '1 км',  m: 1000  },
  { label: '5 км',  m: 5000  },
  { label: '10 км', m: 10000 },
  { label: '21 км', m: 21097 },
  { label: '42 км', m: 42195 },
];

// Riegel: T2 = T1 * (D2 / D1)^1.06
function riegelPredict(t1: number, d1: number, d2: number): number {
  return t1 * Math.pow(d2 / d1, FATIGUE);
}

function secsToTimeStr(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

interface Props { activities: StravaActivity[] }

export default function RacePredictor({ activities }: Props) {
  const runs = activities.filter(
    a => a.type === 'Run' && a.distance >= 1000 && a.moving_time > 0
  );
  const recent90 = runs.filter(
    a => new Date(a.start_date_local) >= new Date(Date.now() - 90 * 86400000)
  );
  if (!recent90.length) return null;

  return (
    <div style={{ marginBottom: 22 }}>
      <div className="section-title">
        🏁 Race Predictor{' '}
        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Sans', fontWeight: 400, letterSpacing: 0 }}>
          формула Ригеля
        </span>
      </div>
      <div className={styles.grid}>
        {TARGETS.map(target => {
          // pick the activity that gives the best (lowest) predicted time for this distance
          let bestSec = Infinity;
          for (const a of recent90) {
            const predicted = riegelPredict(a.moving_time, a.distance, target.m);
            if (predicted < bestSec) bestSec = predicted;
          }
          const predPace = bestSec / (target.m / 1000);
          return (
            <div key={target.label} className={styles.card}>
              <div className={styles.dist}>{target.label}</div>
              <div className={styles.time}>{secsToTimeStr(Math.round(bestSec))}</div>
              <div className={styles.pace}>{paceSecToStr(Math.round(predPace))}/км</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
