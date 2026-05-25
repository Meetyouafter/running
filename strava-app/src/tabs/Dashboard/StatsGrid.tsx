import type { StravaActivity } from '../../types/strava';
import { fmt, dur, hrColor, ICONS, BADGE_CLASS } from '../../lib/utils';

interface Props { activities: StravaActivity[] }

export default function StatsGrid({ activities }: Props) {
  const totalDist = activities.reduce((s, a) => s + (a.distance || 0), 0);
  const totalTime = activities.reduce((s, a) => s + (a.moving_time || 0), 0);
  const totalElev = activities.reduce((s, a) => s + (a.total_elevation_gain || 0), 0);
  const hrActs    = activities.filter(a => a.average_heartrate);
  const avgHR     = hrActs.length ? hrActs.reduce((s, a) => s + a.average_heartrate!, 0) / hrActs.length : 0;

  const byType: Record<string, number> = {};
  activities.forEach(a => { byType[a.type] = (byType[a.type] || 0) + 1; });

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">Активности</div>
        <div className="stat-value">{activities.length}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Дистанция</div>
        <div className="stat-value">{fmt(totalDist / 1000, 0)}<span className="stat-unit">км</span></div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Время</div>
        <div className="stat-value" style={{ fontSize: 28 }}>{dur(totalTime)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Набор высоты</div>
        <div className="stat-value">{fmt(totalElev, 0)}<span className="stat-unit">м</span></div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Ср. пульс</div>
        <div className="stat-value" style={{ color: hrColor(avgHR) }}>
          {avgHR ? fmt(avgHR, 0) : '—'}<span className="stat-unit">bpm</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Типы</div>
        <div style={{ marginTop: 6 }}>
          {Object.keys(byType).map(t => (
            <span key={t} className={`badge ${BADGE_CLASS[t] || 'badge-other'}`} style={{ marginRight: 4 }}>
              {ICONS[t] || '🏅'} {t}: {byType[t]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
