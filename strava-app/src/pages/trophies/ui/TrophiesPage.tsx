import { useEffect, useState } from 'react';
import { fetchAthleteStats, type StravaAthleteStats, type StravaActivityTotals } from '@/entities/athlete';
import { describeStravaError } from '@/shared/api';
import { fmt } from '@/shared/lib';
import styles from './TrophiesPage.module.css';

function km(m: number): string {
  return fmt(m / 1000, 0);
}

function TotalsCard({ title, totals }: { title: string; totals: StravaActivityTotals }) {
  if (!totals.count) return null;
  return (
    <div className={styles.block}>
      <div className={styles.blockTitle}>{title}</div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Активности</div>
          <div className="stat-value">{totals.count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Дистанция</div>
          <div className="stat-value">{km(totals.distance)}<span className="stat-unit">км</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Набор высоты</div>
          <div className="stat-value">{fmt(totals.elevation_gain, 0)}<span className="stat-unit">м</span></div>
        </div>
        {totals.achievement_count !== undefined && (
          <div className="stat-card">
            <div className="stat-label">Достижения</div>
            <div className="stat-value">{totals.achievement_count}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrophiesPage() {
  const [stats, setStats]     = useState<StravaAthleteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetchAthleteStats()
      .then(setStats)
      .catch(e => setError(describeStravaError(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '20px 28px' }}><div className="loading-state"><div className="spinner" />Загружаю статистику...</div></div>;
  }
  if (error || !stats) {
    return <div style={{ padding: '20px 28px' }}><div className="error-msg">{error || 'Нет данных'}</div></div>;
  }

  return (
    <div style={{ padding: '20px 28px' }}>
      <div className="section-title">🏆 Трофейная комната</div>

      <TotalsCard title="Бег · с начала года" totals={stats.ytd_run_totals} />
      <TotalsCard title="Бег · за всё время" totals={stats.all_run_totals} />
      <TotalsCard title="Велосипед · с начала года" totals={stats.ytd_ride_totals} />
      <TotalsCard title="Велосипед · за всё время" totals={stats.all_ride_totals} />
      <TotalsCard title="Плавание · с начала года" totals={stats.ytd_swim_totals} />
      <TotalsCard title="Плавание · за всё время" totals={stats.all_swim_totals} />

      {(stats.biggest_ride_distance || stats.biggest_climb_elevation_gain) && (
        <div className={styles.block}>
          <div className={styles.blockTitle}>Рекорды</div>
          <div className="stats-grid">
            {!!stats.biggest_ride_distance && (
              <div className="stat-card">
                <div className="stat-label">Самый длинный заезд</div>
                <div className="stat-value">{km(stats.biggest_ride_distance)}<span className="stat-unit">км</span></div>
              </div>
            )}
            {!!stats.biggest_climb_elevation_gain && (
              <div className="stat-card">
                <div className="stat-label">Самый большой подъём</div>
                <div className="stat-value">{fmt(stats.biggest_climb_elevation_gain, 0)}<span className="stat-unit">м</span></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
