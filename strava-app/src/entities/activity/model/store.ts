import { create } from 'zustand';
import { describeStravaError } from '@/shared/api';
import { periodStartTs } from '@/shared/lib';
import type { StravaActivity } from './types';
import { fetchActivities, getCachedActivities, clearActivityCache } from '../api/activities';

interface ActivitiesStore {
  activities: StravaActivity[];
  loading: boolean;
  loadingText: string;
  /** Nothing to show: Strava failed and there is no cache, or the period is empty. */
  error: string | null;
  /** Showing stale cached data because Strava is unreachable. */
  warning: string | null;

  /** Loads activities for the last `days` days (0 = all time), falling back to cache if Strava fails. */
  load: (days: number, opts?: { clearCache?: boolean }) => Promise<void>;
}

const cachedAtStr = (ts: number) =>
  new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const useActivitiesStore = create<ActivitiesStore>((set) => ({
  activities:  [],
  loading:     false,
  loadingText: '',
  error:       null,
  warning:     null,

  load: async (days, { clearCache = false } = {}) => {
    if (clearCache) clearActivityCache();
    const afterTs = periodStartTs(days);
    set({ loading: true, loadingText: 'Загружаю активности...', error: null, warning: null });
    try {
      const activities = await fetchActivities(afterTs, n => set({ loadingText: `Загружаю... ${n} активностей` }));
      set(activities.length ? { activities } : { activities, error: 'Нет активностей за выбранный период.' });
    } catch (e) {
      const reason = describeStravaError(e);
      const cached = getCachedActivities(afterTs);
      if (cached?.activities.length) {
        set({ activities: cached.activities, warning: `${reason} Показаны данные из кеша от ${cachedAtStr(cached.cachedAt)}.` });
      } else {
        set({ error: reason });
      }
    } finally {
      set({ loading: false });
    }
  },
}));
