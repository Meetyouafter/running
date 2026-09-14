export interface StravaActivityTotals {
  count: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_gain: number;
  achievement_count?: number;
}

export interface StravaAthleteStats {
  biggest_ride_distance?: number;
  biggest_climb_elevation_gain?: number;
  recent_ride_totals: StravaActivityTotals;
  recent_run_totals: StravaActivityTotals;
  recent_swim_totals: StravaActivityTotals;
  ytd_ride_totals: StravaActivityTotals;
  ytd_run_totals: StravaActivityTotals;
  ytd_swim_totals: StravaActivityTotals;
  all_ride_totals: StravaActivityTotals;
  all_run_totals: StravaActivityTotals;
  all_swim_totals: StravaActivityTotals;
}

export interface StravaZoneRange { min: number; max: number }
export interface StravaAthleteZones {
  heart_rate?: { custom_zones: boolean; zones: StravaZoneRange[] };
  power?: { zones: StravaZoneRange[] };
}

