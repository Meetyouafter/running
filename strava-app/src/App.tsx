import { useStore } from './store/useStore';
import Header from './components/Header/Header';
import DashboardTab from './tabs/Dashboard/index';
import PlanTab from './tabs/Plan/index';
import AnalysisTab from './tabs/Analysis/index';
import IntervalsTab from './tabs/Intervals/index';
import RacesTab from './tabs/Races/index';

export default function App() {
  const { activeTab } = useStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1 }}>
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'plan'      && <PlanTab />}
        {activeTab === 'analysis'  && <AnalysisTab />}
        {activeTab === 'intervals' && <IntervalsTab />}
        {activeTab === 'races'     && <RacesTab />}
      </main>
    </div>
  );
}
