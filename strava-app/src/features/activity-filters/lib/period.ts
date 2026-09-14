export function periodStartTs(days: number): number | null {
  return days > 0 ? Math.floor((Date.now() - days * 86400000) / 1000) : null;
}
