import { useStore } from '../../store/useStore';
import { fetchActivities } from '../../lib/api';
import { ctype } from '../../lib/utils';
import type { StravaActivity } from '../../types/strava';
import FilterBar from './FilterBar';
import StatsGrid from './StatsGrid';
import ActivityList from './ActivityList';
import RacePredictor from './RacePredictor';
import PersonalRecords from './PersonalRecords';
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
  const { activities, activeFilter, activeDays, setActiveDays, loading, loadingText, error,
          setActivities, setLoading, setLoadingText, setError, setActiveFilter } = useStore();

  async function loadData(days = activeDays) {
    setLoading(true);
    setError(null);
    setLoadingText('Подключаюсь к Strava...');
    try {
      const afterTs = days > 0 ? Math.floor((Date.now() - days * 86400000) / 1000) : null;
      const acts = await fetchActivities(afterTs, (n) => setLoadingText(`Загружаю... ${n} активностей`));
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

  // Weekly km chart
  const weeklyMap: Record<string, number> = {};
  sorted.forEach(a => {
    const d = new Date(a.start_date_local);
    const mon = new Date(d);
    mon.setDate(d.getDate() - d.getDay() + 1);
    const key = mon.toISOString().slice(0, 10);
    weeklyMap[key] = (weeklyMap[key] || 0) + a.distance / 1000;
  });
  const maxBars = activeDays <= 30 ? 6 : activeDays <= 90 ? 13 : activeDays <= 180 ? 26 : 52;
  let weekKeys = Object.keys(weeklyMap).sort();
  if (weekKeys.length > maxBars) weekKeys = weekKeys.slice(-maxBars);
  const weekVals = weekKeys.map(k => weeklyMap[k]);

  // HR chart
  const hrList = sorted.filter(a => a.average_heartrate).slice(0, 30).reverse();

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
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => loadData()}>
          {loading ? 'Загружаю...' : 'Загрузить'}
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          {loadingText || 'Загружаю...'}
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
          <StatsGrid activities={sorted} />

          <div className="two-col" style={{ marginBottom: 22 }}>
            <div>
              <div className="section-title">Км по неделям</div>
              <div className="chart-container">
                <BarChart
                  labels={weekKeys.map(k => k.slice(5))}
                  data={weekVals}
                  color="#FC4C02"
                  yMin={0}
                />
              </div>
            </div>
            <div>
              <div className="section-title">Пульс по активностям</div>
              <div className="chart-container">
                <BarChart
                  labels={hrList.map(a => a.name.slice(0, 8))}
                  data={hrList.map(a => a.average_heartrate!)}
                  color="#2979ff"
                  yMin={60}
                />
              </div>
            </div>
          </div>

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
