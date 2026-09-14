import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from '@/pages/dashboard';
import { PlanPage } from '@/pages/plan';
import { AnalysisPage } from '@/pages/analysis';
import { RacesPage } from '@/pages/races';
import { CoachPage } from '@/pages/coach';
import { RoutePage } from '@/pages/route';
import { TrophiesPage } from '@/pages/trophies';
import { Header } from '@/widgets/header';
import { useFiltersStore } from '@/features/activity-filters';
import { useActivitiesStore, fetchActivities } from '@/entities/activity';
import { useAthleteStore, fetchAthleteZones } from '@/entities/athlete';
import { SplashScreen } from './ui/SplashScreen';

const SPLASH_KEY = 'splash_shown_v1';

export default function App() {
  const { activities, setActivities, setLoading, setLoadingText, setError } = useActivitiesStore();
  const { activeDays } = useFiltersStore();
  const { setHrZones } = useAthleteStore();
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

  useEffect(() => {
    // Falls back to null (handled by hrColor) if the token lacks profile:read_all.
    fetchAthleteZones().then(setHrZones).catch(() => setHrZones(null));
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
          <Route path="/"          element={<DashboardPage />} />
          <Route path="/plan"      element={<PlanPage />} />
          <Route path="/analysis"  element={<AnalysisPage />} />
          <Route path="/races"     element={<RacesPage />} />
          <Route path="/coach"     element={<CoachPage />} />
          <Route path="/route"     element={<RoutePage />} />
          <Route path="/trophies"  element={<TrophiesPage />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
