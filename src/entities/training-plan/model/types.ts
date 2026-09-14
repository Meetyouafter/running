export interface RaceGoal {
  distKm: number;
  label: string;
  targetMin: number;
}

export interface PlanSession {
  date: string;
  week: number;
  type: 'interval' | 'easy' | 'tempo' | 'long' | 'race-p';
  title: string;
  targetDist: number;
  targetPaceSec: number;
  desc: string;
}
