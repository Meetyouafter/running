export interface Race {
  id: string;
  name: string;
  date: string;
  city: string;
  country: string;
  countryCode?: string;
  distances: number[];
  url?: string;
  source: 'pre-seeded' | 'manual' | 'runsignup' | 'actiup';
  note?: string;
}

export interface RaceMark {
  status?: 'interested' | 'registered' | 'target' | 'completed';
  note?: string;
  targetDist?: number;
}
