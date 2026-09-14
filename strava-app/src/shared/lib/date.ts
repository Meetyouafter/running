export function weekMondayKey(isoLocal: string): string {
  const [y, m, d] = isoLocal.slice(0, 10).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const mon = new Date(y, m - 1, d - (dt.getDay() + 6) % 7);
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
