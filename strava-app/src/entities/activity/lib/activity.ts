import type { StravaActivity } from '../model/types';

export const ICONS: Record<string, string> = {
  Run: '🏃', Ride: '🚴', VirtualRide: '🚴', Walk: '🚶', Swim: '🏊',
  Hike: '🥾', WeightTraining: '💪', Yoga: '🧘', Workout: '⚡',
  AlpineSki: '⛷️', Rowing: '🚣', StandUpPaddling: '🏄',
};

/** Canonical activity type: VirtualRide is treated as Ride. */
export function ctype(a: StravaActivity) {
  return a.type === 'VirtualRide' ? 'Ride' : a.type;
}

/** Average pace in sec/km, 0 if speed is unknown. */
export function actPaceSec(a: StravaActivity): number {
  return a.average_speed > 0 ? 1000 / a.average_speed : 0;
}
