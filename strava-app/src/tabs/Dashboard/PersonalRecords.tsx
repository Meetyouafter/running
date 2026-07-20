import { useEffect, useState } from 'react';
import type { StravaActivity, StravaBestEffort } from '../../types/strava';
import { fetchActivityDetail } from '../../lib/api';
import { actPaceSec, paceSecToStr } from '../../lib/utils';
import styles from './PersonalRecords.module.css';

const RANGES = [
  { name: '1 км',         minD: 900,   maxD: 1200,  effortName: '1K' },
  { name: '5 км',         minD: 4500,  maxD: 5600,  effortName: '5K' },
  { name: '10 км',        minD: 9500,  maxD: 10500, effortName: '10K' },
  { name: 'Полумарафон',  minD: 20000, maxD: 22000, effortName: 'Half-Marathon' },
];

const CACHE_KEY = 'strava_pr_cache';
const CANDIDATES_PER_RANGE = 3;

function loadCache(): Record<number, StravaBestEffort[]> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveCache(cache: Record<number, StravaBestEffort[]>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* quota */ }
}

interface Best { name: string; act: StravaActivity; effort: StravaBestEffort | null }

interface Props { activities: StravaActivity[] }

export default function PersonalRecords({ activities }: Props) {
  const [bests, setBests]     = useState<Best[] | null>(null);
  const runs = activities.filter(a => a.type === 'Run');

  useEffect(() => {
    let cancelled = false;
    const cache = loadCache();

    async function resolve() {
      const results: Best[] = [];

      for (const r of RANGES) {
        const candidates = runs
          .filter(a => a.distance >= r.minD && a.distance <= r.maxD)
          .sort((a, b) => actPaceSec(a) - actPaceSec(b))
          .slice(0, CANDIDATES_PER_RANGE);
        if (!candidates.length) continue;

        let bestEffort: StravaBestEffort | null = null;
        let bestAct = candidates[0];

        for (const cand of candidates) {
          let efforts = cache[cand.id];
          if (!efforts) {
            try {
              const detail = await fetchActivityDetail(cand.id);
              efforts = detail.best_efforts ?? [];
              cache[cand.id] = efforts;
            } catch {
              efforts = [];
            }
          }
          const match = efforts.find(e => e.name === r.effortName);
          if (match && (!bestEffort || match.elapsed_time < bestEffort.elapsed_time)) {
            bestEffort = match;
            bestAct = cand;
          }
        }

        // Fall back to the whole-activity heuristic if no best_efforts matched
        results.push({ name: r.name, act: bestEffort ? bestAct : candidates[0], effort: bestEffort });
      }

      saveCache(cache);
      if (!cancelled) setBests(results);
    }

    resolve();
    return () => { cancelled = true; };
  }, [runs.map(r => r.id).join(',')]);

  if (!bests || !bests.length) return null;

  return (
    <div style={{ marginBottom: 22 }}>
      <div className="section-title">🏅 Личные рекорды</div>
      <div className={styles.grid}>
        {bests.map(({ name, act, effort }) => {
          let sec: number, dateStr: string, isPr: boolean;
          if (effort) {
            sec = effort.elapsed_time;
            dateStr = effort.start_date_local.slice(0, 10);
            isPr = effort.pr_rank === 1;
          } else {
            const p = actPaceSec(act);
            sec = p * act.distance / 1000;
            dateStr = act.start_date_local.slice(0, 10);
            isPr = false;
          }
          const h = Math.floor(sec / 3600);
          const m = Math.floor((sec % 3600) / 60);
          const s = Math.round(sec % 60);
          const timeStr = h > 0 ? `${h}ч ${m}мин` : `${m}:${String(s).padStart(2, '0')}`;
          const paceSec = sec / (act.distance / 1000);
          return (
            <div key={name} className={styles.card}>
              <div className={styles.label}>{isPr ? '🥇 ' : ''}{name}</div>
              <div className={styles.time}>{timeStr}</div>
              <div className={styles.pace}>{paceSecToStr(Math.round(paceSec))}/км</div>
              <div className={styles.date}>{dateStr}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
