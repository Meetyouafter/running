import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { fetchActivities, clearActivityCache } from '../../lib/api';
import { ctype, weekMondayKey } from '../../lib/utils';
import type { StravaActivity } from '../../types/strava';
import FilterBar from './FilterBar';
import StatsGrid from './StatsGrid';
import ActivityList from './ActivityList';
import RacePredictor from './RacePredictor';
import PersonalRecords from './PersonalRecords';
import ProgressSection from './ProgressSection';
import BarChart from '../../components/Charts/BarChart';
import styles from './Dashboard.module.css';

const PERIOD_OPTIONS = [
  { days: 30,  label: '30 дней' },
  { days: 90,  label: '3 месяца' },
  { days: 180, label: '6 месяцев' },
  { days: 365, label: '1 год' },
  { days: 0,   label: 'Всё время' },
];

export default function DashboardTab() {
  const { activities, activeFilter, activeDays, setActiveDays, loading, error,
          setActivities, setLoading, setError, setActiveFilter } = useStore();

  useEffect(() => { if (!activities.length) loadData(); }, []);

  async function loadData(days = activeDays) {
    setLoading(true);
    setError(null);
    try {
      const afterTs = days > 0 ? Math.floor((Date.now() - days * 86400000) / 1000) : null;
      const acts = await fetchActivities(afterTs);
      if (!acts.length) { setError('Нет активностей за выбранный период.'); return; }
      setActivities(acts);
      setActiveFilter('all');
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

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
      {/* Period selector */}
      <div className={styles.periodBar}>
        <span className={styles.periodLabel}>Период:</span>
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.days}
            className={`${styles.periodBtn} ${activeDays === opt.days ? styles.active : ''}`}
            onClick={() => { setActiveDays(opt.days); if (activities.length) loadData(opt.days); }}
          >
            {opt.label}
          </button>
        ))}
        <button
          className={styles.periodBtn}
          disabled={loading}
          onClick={() => { clearActivityCache(); loadData(); }}
          title="Очистить кеш и загрузить заново"
        >
          ↺
        </button>
      </div>

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
          <FilterBar />
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

          <RacePredictor activities={sorted} />
          <PersonalRecords activities={sorted} />

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
