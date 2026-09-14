const ZONE_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ff9800', '#f44336'];

// Structural zone shape so this helper doesn't depend on the Strava athlete types.
export function hrColor(hr?: number | null, zones?: { max: number }[] | null): string {
  if (!hr) return '#666';
  if (zones && zones.length) {
    for (let i = 0; i < zones.length; i++) {
      if (hr <= zones[i].max || i === zones.length - 1) return ZONE_COLORS[Math.min(i, ZONE_COLORS.length - 1)];
    }
  }
  if (hr < 120) return '#22c55e';
  if (hr < 140) return '#eab308';
  if (hr < 160) return '#ff9800';
  return '#f44336';
}
