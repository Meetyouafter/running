import { useActivitiesStore, ctype, type StravaActivity } from '@/entities/activity';
import { useFiltersStore } from '@/features/activity-filters';
import { weekMondayKey } from '@/shared/lib';
import { BarChart } from '@/shared/ui';
import StatsGrid from './StatsGrid';
import ActivityList from './ActivityList';
import ProgressSection from './ProgressSection';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { activities, loading, error } = useActivitiesStore();
  const { activeFilter, activeDays } = useFiltersStore();

  const filtered: StravaActivity[] = activeFilter === 'all'
    ? activities
    : activities.filter(a => ctype(a) === activeFilter);

  const sorted = [...filtered].sort((a, b) =>
    new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime()
  );

  // Combined weekly km + run count + per-run details (runs only)
  const weekRunsMap: Record<string, { km: number; count: number; runs: { date: string; km: number }[] }> = {};
  sorted.filter(a => a.type === 'Run').forEach(a => {
    const key = weekMondayKey(a.start_date_local);
    if (!weekRunsMap[key]) weekRunsMap[key] = { km: 0, count: 0, runs: [] };
    const km = a.distance / 1000;
    weekRunsMap[key].km    += km;
    weekRunsMap[key].count += 1;
    weekRunsMap[key].runs.push({ date: a.start_date_local.slice(0, 10), km });
  });
  const maxBars = activeDays <= 30 ? 6 : activeDays <= 90 ? 13 : activeDays <= 180 ? 26 : 52;
  let weekKeys = Object.keys(weekRunsMap).sort();
  if (weekKeys.length > maxBars) weekKeys = weekKeys.slice(-maxBars);
  const weekKmVals    = weekKeys.map(k => Math.round(weekRunsMap[k].km * 10) / 10);
  const weekCountVals = weekKeys.map(k => weekRunsMap[k].count);
  const weekDetails   = weekKeys.map(k => weekRunsMap[k].runs);
  const totalKmShown  = weekKmVals.reduce((s, v) => s + v, 0);
  const avgKmPerWeek  = weekKeys.length ? totalKmShown / weekKeys.length : 0;

  return (
    <div className={styles.tab}>
      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          Загружаю активности
        </div>
      )}

      {error && !loading && <div className="error-msg">{error}</div>}

      {!loading && !error && activities.length === 0 && (
        <div className="loading-state">
          <div className="spinner" />
          Нажми «Загрузить» чтобы получить данные
        </div>
      )}

      {!loading && activities.length > 0 && (
        <>
          <ProgressSection activities={sorted} />
          <StatsGrid activities={sorted} />

          {weekKeys.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                <div className="section-title" style={{ margin: 0 }}>Км по неделям</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Space Mono' }}>
                  ср.&nbsp;{avgKmPerWeek.toFixed(0)}&nbsp;км/нед
                </div>
              </div>
              <div className="chart-container">
                <BarChart
                  labels={weekKeys.map(k => {
                    const [y, m, d] = k.split('-').map(Number);
                    return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                  })}
                  data={weekKmVals}
                  counts={weekCountVals}
                  details={weekDetails}
                  color="#FC4C02"
                  unit="км"
                  yMin={0}
                  height={180}
                />
              </div>
            </div>
          )}

          <div className="section-title">
            Активности{' '}
            <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'DM Sans' }}>
              — нажми для деталей
            </span>
          </div>
          <ActivityList activities={sorted} />
        </>
      )}
    </div>
  );
}
