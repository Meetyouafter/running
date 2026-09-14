import { NavLink, useLocation } from 'react-router-dom';
import { FiltersPanel } from '@/features/activity-filters';
import { NAV_ITEMS } from '@/shared/config';
import styles from './Header.module.css';


export default function Header() {
  const { pathname } = useLocation();
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
        {NAV_ITEMS.map(tab => (
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
      {pathname === '/' && <FiltersPanel />}
    </header>
  );
}
