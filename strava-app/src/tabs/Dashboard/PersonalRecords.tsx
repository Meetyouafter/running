import type { StravaActivity } from '../../types/strava';
import { actPaceSec, paceSecToStr } from '../../lib/utils';
import styles from './PersonalRecords.module.css';

const RANGES = [
  { name: '1 км',         minD: 900,   maxD: 1200  },
  { name: '5 км',         minD: 4500,  maxD: 5600  },
  { name: '10 км',        minD: 9500,  maxD: 10500 },
  { name: 'Полумарафон',  minD: 20000, maxD: 22000 },
];

interface Props { activities: StravaActivity[] }

export default function PersonalRecords({ activities }: Props) {
  const runs = activities.filter(a => a.type === 'Run');
  const bests: { name: string; act: StravaActivity }[] = [];

  RANGES.forEach(r => {
    const cands = runs
      .filter(a => a.distance >= r.minD && a.distance <= r.maxD)
      .sort((a, b) => actPaceSec(a) - actPaceSec(b));
    if (cands.length) bests.push({ name: r.name, act: cands[0] });
  });

  if (!bests.length) return null;

  return (
    <div style={{ marginBottom: 22 }}>
      <div className="section-title">🏅 Личные рекорды</div>
      <div className={styles.grid}>
        {bests.map(({ name, act }) => {
          const p   = actPaceSec(act);
          const sec = p * act.distance / 1000;
          const h   = Math.floor(sec / 3600);
          const m   = Math.floor((sec % 3600) / 60);
          const s   = Math.round(sec % 60);
          const timeStr = h > 0 ? `${h}ч ${m}мин` : `${m}:${String(s).padStart(2, '0')}`;
          return (
            <div key={name} className={styles.card}>
              <div className={styles.label}>{name}</div>
              <div className={styles.time}>{timeStr}</div>
              <div className={styles.pace}>{paceSecToStr(Math.round(p))}/км</div>
              <div className={styles.date}>{act.start_date_local.slice(0, 10)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
