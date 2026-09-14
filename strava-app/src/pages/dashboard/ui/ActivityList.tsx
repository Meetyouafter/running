import { useState } from 'react';
import { ICONS, type StravaActivity } from '@/entities/activity';
import { useAthleteStore } from '@/entities/athlete';
import { fmt, dur, pace, hrColor, dateStr } from '@/shared/lib';
import { ActivityModal } from '@/widgets/activity-modal';
import styles from './ActivityList.module.css';

interface Props { activities: StravaActivity[] }

export default function ActivityList({ activities }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { hrZones } = useAthleteStore();

  return (
    <>
      <div className={styles.list}>
        {activities.slice(0, 50).map(a => (
          <div key={a.id} className={styles.row} onClick={() => setSelectedId(a.id)}>
            <div className={styles.icon}>{ICONS[a.type] || '🏅'}</div>
            <div>
              <div className={styles.name}>
                {a.name}
                {!!a.pr_count && <span title={`${a.pr_count} личных рекордов`}> 🥇{a.pr_count}</span>}
                {!a.pr_count && !!a.achievement_count && <span title={`${a.achievement_count} достижений`}> 🏆{a.achievement_count}</span>}
              </div>
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
              <span style={{ color: hrColor(a.average_heartrate, hrZones?.heart_rate?.zones) }}>
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
