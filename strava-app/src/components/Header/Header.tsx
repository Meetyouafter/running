import { NavLink } from 'react-router-dom';
import styles from './Header.module.css';

const TABS = [
  { path: '/',          icon: '📊', label: 'Дашборд' },
  { path: '/plan',      icon: '🗓', label: 'План' },
  { path: '/analysis',  icon: '📈', label: 'Анализ' },
{ path: '/races',     icon: '🏁', label: 'Забеги' },
  { path: '/coach',     icon: '🤖', label: 'Тренер' },
  { path: '/route',     icon: '🗺', label: 'Маршрут' },
];

export default function Header() {
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
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) =>
              `${styles.tabBtn} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
