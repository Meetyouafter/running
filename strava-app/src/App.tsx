import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header/Header';
import DashboardTab from './tabs/Dashboard/index';
import PlanTab from './tabs/Plan/index';
import AnalysisTab from './tabs/Analysis/index';
import RacesTab from './tabs/Races/index';
import CoachTab from './tabs/Coach/index';
import RouteTab from './tabs/Route/index';
import { useStore } from './store/useStore';
import { fetchActivities } from './lib/api';

const SPLASH_KEY = 'splash_shown_v1';

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHiding(true), 2500);
    const t2 = setTimeout(() => onDone(), 3050);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`splash-overlay${hiding ? ' hiding' : ''}`}>
      <div className="splash-scanline" />
      <div className="splash-text">кто сдох — тот лох</div>
      <div className="splash-sub">👟 значит, беги</div>
      <div className="splash-bar" />
    </div>
  );
}

export default function App() {
  const { activities, activeDays, setActivities, setLoading, setLoadingText, setError } = useStore();
  const [showSplash, setShowSplash] = useState(() => !localStorage.getItem(SPLASH_KEY));

  useEffect(() => {
    if (activities.length > 0) return; // already loaded (e.g. from Dashboard's own refresh)
    setLoading(true);
    setLoadingText('Загружаю активности...');
    const afterTs = activeDays > 0 ? Math.floor((Date.now() - activeDays * 86400000) / 1000) : null;
    fetchActivities(afterTs, (n) => setLoadingText(`Загружаю... ${n} активностей`))
      .then(acts => { if (acts.length) setActivities(acts); })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  function handleSplashDone() {
    localStorage.setItem(SPLASH_KEY, '1');
    setShowSplash(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {showSplash && <SplashScreen onDone={handleSplashDone} />}
      <Header />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/"          element={<DashboardTab />} />
          <Route path="/plan"      element={<PlanTab />} />
          <Route path="/analysis"  element={<AnalysisTab />} />
          <Route path="/races"     element={<RacesTab />} />
          <Route path="/coach"     element={<CoachTab />} />
          <Route path="/route"     element={<RouteTab />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
