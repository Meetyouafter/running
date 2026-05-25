import { useStore } from '../../store/useStore';
import { ctype, ICONS } from '../../lib/utils';
import styles from './FilterBar.module.css';

export default function FilterBar() {
  const { activities, activeFilter, setActiveFilter } = useStore();

  const counts: Record<string, number> = {};
  activities.forEach(a => { const t = ctype(a); counts[t] = (counts[t] || 0) + 1; });

  function filterClass(t: string) {
    if (t === 'all') return styles.faAll;
    if (t === 'Run')  return styles.faRun;
    if (t === 'Ride') return styles.faRide;
    if (t === 'Walk' || t === 'Hike') return styles.faWalk;
    return styles.faOther;
  }

  return (
    <div className={styles.bar}>
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
  );
}
