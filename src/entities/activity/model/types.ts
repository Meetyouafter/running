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
  best_efforts?: StravaBestEffort[];
  segment_efforts?: StravaSegmentEffort[];
  achievement_count?: number;
  pr_count?: number;
  kudos_count?: number;
}

export interface StravaBestEffort {
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  start_date_local: string;
  pr_rank?: number | null;
}

export interface StravaSegmentEffort {
  name: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  pr_rank?: number | null;
  kom_rank?: number | null;
  segment: { id: number; name: string };
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

export interface StravaSegmentExplore {
  id: number;
  name: string;
  distance: number;
  avg_grade: number;
  start_latlng: [number, number];
  end_latlng: [number, number];
  points: string;
}
