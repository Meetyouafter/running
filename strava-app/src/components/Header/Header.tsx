import { useStore } from '../../store/useStore';
import styles from './Header.module.css';

const TABS = [
  { id: 'dashboard' as const, label: '📊 Дашборд' },
  { id: 'plan'      as const, label: '🏃 План' },
  { id: 'analysis'  as const, label: '📈 Анализ' },
  { id: 'intervals' as const, label: '⚡ Intervals' },
  { id: 'races'     as const, label: '🏁 Забеги' },
];

export default function Header() {
  const { activeTab, setActiveTab } = useStore();

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>S</div>
        <div>
          <div className={styles.title}>Strava Dashboard</div>
          <div className={styles.subtitle}>Anton Levus · Đà Nẵng</div>
        </div>
      </div>
      <nav className={styles.nav}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
