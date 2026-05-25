export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  start_date: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  average_watts?: number;
  calories?: number;
  suffer_score?: number;
  average_temp?: number | null;
  gear?: { id: string; name: string } | null;
  map?: { summary_polyline: string } | null;
  laps?: StravaLap[];
  splits_metric?: StravaSplit[];
}

export interface StravaLap {
  distance: number;
  moving_time: number;
  average_speed: number;
  average_heartrate?: number;
  average_cadence?: number;
  average_watts?: number;
}

export interface StravaSplit {
  distance: number;
  moving_time: number;
  average_speed: number;
  average_heartrate?: number;
  elevation_difference: number;
}

export interface StravaStreams {
  heartrate?:        { data: number[] };
  cadence?:          { data: number[] };
  watts?:            { data: number[] };
  velocity_smooth?:  { data: number[] };
  altitude?:         { data: number[] };
  distance?:         { data: number[] };
}

export type ActivityFilter = 'all' | 'Run' | 'Ride' | 'Walk' | string;
