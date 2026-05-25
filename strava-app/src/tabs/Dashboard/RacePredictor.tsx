import type { StravaActivity } from '../../types/strava';
import { actPaceSec, paceSecToStr } from '../../lib/utils';
import styles from './RacePredictor.module.css';

const DISTS = [
  { d: '1 км',  km: 1,    m: 0.92 },
  { d: '5 км',  km: 5,    m: 1.0  },
  { d: '10 км', km: 10,   m: 1.06 },
  { d: '21 км', km: 21,   m: 1.15 },
  { d: '42 км', km: 42,   m: 1.22 },
];

interface Props { activities: StravaActivity[] }

export default function RacePredictor({ activities }: Props) {
  const runs = activities.filter(a => a.type === 'Run' && a.distance >= 4500);
  const recent90 = runs.filter(a =>
    new Date(a.start_date_local) >= new Date(Date.now() - 90 * 86400000)
  );
  if (!recent90.length) return null;

  const best = [...recent90.filter(a => a.distance <= 7500)]
    .sort((a, b) => actPaceSec(a) - actPaceSec(b))[0] || recent90[0];

  const bestPace = actPaceSec(best);
  if (!bestPace) return null;

  return (
    <div style={{ marginBottom: 22 }}>
      <div className="section-title">
        🏁 Race Predictor{' '}
        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Sans', fontWeight: 400, letterSpacing: 0 }}>
          на основе лучших недавних пробежек
        </span>
      </div>
      <div className={styles.grid}>
        {DISTS.map(item => {
          const predPace = bestPace * item.m;
          const predSec  = predPace * item.km;
          const h = Math.floor(predSec / 3600);
          const m = Math.floor((predSec % 3600) / 60);
          const s = Math.round(predSec % 60);
          const timeStr = h > 0
            ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            : `${m}:${String(s).padStart(2, '0')}`;
          return (
            <div key={item.d} className={styles.card}>
              <div className={styles.dist}>{item.d}</div>
              <div className={styles.time}>{timeStr}</div>
              <div className={styles.pace}>{paceSecToStr(Math.round(predPace))}/км</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
