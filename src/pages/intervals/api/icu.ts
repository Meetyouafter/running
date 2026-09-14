export interface IcuData {
  activities: unknown[];
  wellness: unknown[];
  updated_at: string;
}

export async function fetchICUData(days = 90): Promise<IcuData> {
  const resp = await fetch(`/api/icu/data?days=${days}`);
  if (!resp.ok) throw new Error(`ICU HTTP ${resp.status}`);
  return resp.json() as Promise<IcuData>;
}
