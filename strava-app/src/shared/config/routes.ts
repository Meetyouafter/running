// Top-level navigation; the app router maps these paths to pages.
export const NAV_ITEMS = [
  { path: '/',          icon: '📊', label: 'Дашборд' },
  { path: '/plan',      icon: '🗓', label: 'План' },
  { path: '/analysis',  icon: '📈', label: 'Анализ' },
  { path: '/races',     icon: '🏁', label: 'Забеги' },
  { path: '/coach',     icon: '🤖', label: 'Тренер' },
  { path: '/route',     icon: '🗺', label: 'Маршрут' },
  { path: '/trophies',  icon: '🏆', label: 'Трофеи' },
] as const;

export type AppPath = (typeof NAV_ITEMS)[number]['path'];
