import { useState } from 'react';
import type { StravaActivity } from '../../types/strava';
import { ICONS, fmt, dur, pace, hrColor, dateStr } from '../../lib/utils';
import ActivityModal from './ActivityModal';
import styles from './ActivityList.module.css';

interface Props { activities: StravaActivity[] }

export default function ActivityList({ activities }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <>
      <div className={styles.list}>
        {activities.slice(0, 50).map(a => (
          <div key={a.id} className={styles.row} onClick={() => setSelectedId(a.id)}>
            <div className={styles.icon}>{ICONS[a.type] || '🏅'}</div>
            <div>
              <div className={styles.name}>{a.name}</div>
              <div className={styles.date}>{dateStr(a.start_date_local)}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Дистанция</div>
              {fmt(a.distance / 1000)} км
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Время</div>
              {dur(a.moving_time)}
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Темп</div>
              {a.average_speed > 0 ? pace(a.average_speed) + '/км' : '—'}
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Пульс</div>
              <span style={{ color: hrColor(a.average_heartrate) }}>
                {a.average_heartrate ? fmt(a.average_heartrate, 0) + ' bpm' : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {selectedId !== null && (
        <ActivityModal activityId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}
