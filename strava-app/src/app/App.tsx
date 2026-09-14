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
import { useFiltersStore, periodStartTs } from '@/features/activity-filters';
import { useActivitiesStore, fetchActivities } from '@/entities/activity';
import { useAthleteStore, fetchAthleteZones } from '@/entities/athlete';
import { SplashScreen } from './ui/SplashScreen';

const SPLASH_KEY = 'splash_shown_v1';

export default function App() {
  const [showSplash, setShowSplash] = useState(() => !localStorage.getItem(SPLASH_KEY));

  useEffect(() => {
    const { activities, setActivities, setLoading, setLoadingText, setError } = useActivitiesStore.getState();
    const { activeDays } = useFiltersStore.getState();
    if (activities.length > 0) return; // already loaded (e.g. from Dashboard's own refresh)
    setLoading(true);
    setLoadingText('Загружаю активности...');
    fetchActivities(periodStartTs(activeDays), (n) => setLoadingText(`Загружаю... ${n} активностей`))
      .then(acts => { if (acts.length) setActivities(acts); })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const { setHrZones } = useAthleteStore.getState();
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
