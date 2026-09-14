import { useState } from 'react';
import { useActivitiesStore, fetchActivities, clearActivityCache, ctype, ICONS } from '@/entities/activity';
import { useFiltersStore } from '../model/store';
import { PERIOD_OPTIONS } from '../config/periods';
import styles from './FiltersPanel.module.css';

export default function FiltersPanel() {
  const { activities, loading, setLoading, setError, setActivities } = useActivitiesStore();
  const { activeFilter, setActiveFilter, activeDays, setActiveDays } = useFiltersStore();
  const [open, setOpen] = useState(false);

  async function loadData(days: number) {
    setLoading(true);
    setError(null);
    try {
      const afterTs = days > 0 ? Math.floor((Date.now() - days * 86400000) / 1000) : null;
      const acts = await fetchActivities(afterTs);
      if (!acts.length) { setError('Нет активностей за выбранный период.'); return; }
      setActivities(acts);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function onPeriodChange(days: number) {
    setActiveDays(days);
    loadData(days);
  }

  function onRefresh() {
    clearActivityCache();
    loadData(activeDays);
  }

  const counts: Record<string, number> = {};
  activities.forEach(a => { const t = ctype(a); counts[t] = (counts[t] || 0) + 1; });

  function filterClass(t: string) {
    if (t === 'all') return styles.faAll;
    if (t === 'Run')  return styles.faRun;
    if (t === 'Ride') return styles.faRide;
    if (t === 'Walk' || t === 'Hike') return styles.faWalk;
    return styles.faOther;
  }

  const periodLabel = PERIOD_OPTIONS.find(p => p.days === activeDays)?.label ?? 'Всё время';
  const typeLabel = activeFilter === 'all' ? 'Все' : activeFilter;

  return (
    <div className={styles.wrap}>
      <button className={styles.toggle} onClick={() => setOpen(o => !o)}>
        🎚 <span className={styles.toggleText}>{periodLabel} · {typeLabel}</span> <span className={styles.chevron}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.panel}>
            <div className={styles.row}>
              <span className={styles.label}>Период:</span>
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.days}
                  className={`${styles.btn} ${activeDays === opt.days ? styles.btnActive : ''}`}
                  onClick={() => onPeriodChange(opt.days)}
                >
                  {opt.label}
                </button>
              ))}
              <button
                className={styles.btn}
                disabled={loading}
                onClick={onRefresh}
                title="Очистить кеш и загрузить заново"
              >
                ↺
              </button>
            </div>

            <div className={styles.row}>
              <span className={styles.label}>Тип:</span>
              <button
                className={`${styles.btn} ${activeFilter === 'all' ? filterClass('all') : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                🏅 Все <span className={styles.count}>{activities.length}</span>
              </button>
              {Object.keys(counts).map(t => (
                <button
                  key={t}
                  className={`${styles.btn} ${activeFilter === t ? filterClass(t) : ''}`}
                  onClick={() => setActiveFilter(t)}
                >
                  {ICONS[t] || '🏅'} {t} <span className={styles.count}>{counts[t]}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
