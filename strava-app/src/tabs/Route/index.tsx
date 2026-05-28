import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './index.module.css';
import { fetchSegmentsExplore } from '../../lib/api';
import type { StravaSegmentExplore } from '../../types/strava';

type LatLng = [number, number];
type ClickMode = 'start' | 'end' | 'waypoint' | 'idle';
type Tab = 'build' | 'popular';

interface RouteInfo {
  distanceM: number;
  durationS: number;
  ascentM: number;
  coords: LatLng[];
}

interface OSMRoute {
  id: number;
  name: string;
  distanceM: number;
  coords: LatLng[];
}

function fmtDist(m: number) {
  return (m / 1000).toFixed(2) + ' км';
}

function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}ч ${m}м` : `${m} мин`;
}

function haversineM(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const φ1 = a[0] * Math.PI / 180, φ2 = b[0] * Math.PI / 180;
  const dφ = (b[0] - a[0]) * Math.PI / 180;
  const dλ = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function coordsLengthM(coords: LatLng[]): number {
  let d = 0;
  for (let i = 1; i < coords.length; i++) d += haversineM(coords[i - 1], coords[i]);
  return d;
}

async function fetchOSMRoutes(swLat: number, swLng: number, neLat: number, neLng: number): Promise<OSMRoute[]> {
  const bbox = `${swLat},${swLng},${neLat},${neLng}`;
  const query = `[out:json][timeout:30];
(
  relation["route"~"running|foot|hiking|walking"](${bbox});
  way["leisure"="track"](${bbox});
  way["highway"~"footway|path|track"]["name"](${bbox});
  way["highway"~"footway|path"]["foot"="designated"](${bbox});
);
out geom tags;`;
  const resp = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
    headers: { 'Content-Type': 'text/plain' },
  });
  if (!resp.ok) throw new Error(`Overpass API: ${resp.status}`);
  const data = await resp.json() as {
    elements: Array<{
      type: string;
      id: number;
      tags?: Record<string, string>;
      geometry?: Array<{ lat: number; lon: number }>;
      members?: Array<{ type: string; geometry?: Array<{ lat: number; lon: number }> }>;
    }>;
  };

  const results: OSMRoute[] = [];
  for (const el of data.elements) {
    let coords: LatLng[] = [];
    if (el.type === 'relation' && el.members) {
      for (const m of el.members) {
        if (m.type === 'way' && m.geometry) {
          for (const pt of m.geometry) coords.push([pt.lat, pt.lon]);
        }
      }
    } else if (el.type === 'way' && el.geometry) {
      coords = el.geometry.map(pt => [pt.lat, pt.lon]);
    }
    if (coords.length < 2) continue;
    const name = el.tags?.name
      || (el.tags?.leisure === 'track' ? 'Беговая дорожка' : null)
      || el.tags?.ref
      || null;
    if (!name) continue;
    results.push({ id: el.id, name, distanceM: coordsLengthM(coords), coords });
  }
  return results.sort((a, b) => a.distanceM - b.distanceM);
}

function decodePolyline(encoded: string): LatLng[] {
  const pts: LatLng[] = [];
  let idx = 0, lat = 0, lng = 0;
  while (idx < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
}

function buildGpx(coords: LatLng[], name: string, durationS: number) {
  const start = new Date();
  const stepMs = (durationS * 1000) / Math.max(coords.length - 1, 1);
  const pts = coords
    .map(([lat, lng], i) => {
      const t = new Date(start.getTime() + i * stepMs).toISOString();
      return `    <trkpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}"><ele>0</ele><time>${t}</time></trkpt>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Strava Dashboard"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <trk>
    <name>${name}</name>
    <type>9</type>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>`;
}

function downloadGpx(coords: LatLng[], durationS: number, name = 'route') {
  const gpx = buildGpx(coords, name, durationS);
  const blob = new Blob([gpx], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\s+/g, '_')}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
}

const START_ICON = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#22c55e;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px #22c55e88"></div>',
  iconSize: [14, 14], iconAnchor: [7, 7],
});

const END_ICON = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#ef4444;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px #ef444488"></div>',
  iconSize: [14, 14], iconAnchor: [7, 7],
});

const WP_ICON = L.divIcon({
  className: '',
  html: '<div style="width:12px;height:12px;background:#eab308;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px #eab30888"></div>',
  iconSize: [12, 12], iconAnchor: [6, 6],
});

export default function RoutePage() {
  const mapRef         = useRef<L.Map | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef   = useRef<L.Marker | null>(null);
  const wpMarkerRef    = useRef<L.Marker | null>(null);
  const polyRef        = useRef<L.Polyline | null>(null);
  const segMarkersRef  = useRef<L.Marker[]>([]);
  const mapElRef       = useRef<HTMLDivElement | null>(null);

  // build tab state
  const [startPt,    setStartPt]    = useState<LatLng | null>(null);
  const [endPt,      setEndPt]      = useState<LatLng | null>(null);
  const [wayptPt,    setWayptPt]    = useState<LatLng | null>(null);
  const [roundTrip,  setRoundTrip]  = useState(true);
  const [distKm,     setDistKm]     = useState(10);
  const [clickMode,  setClickMode]  = useState<ClickMode>('start');
  const [loading,    setLoading]    = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [route,      setRoute]      = useState<RouteInfo | null>(null);
  const [seed,       setSeed]       = useState(1);

  // tabs
  const [tab, setTab] = useState<Tab>('build');

  // segments
  const [segments,    setSegments]    = useState<StravaSegmentExplore[] | null>(null);
  const [segLoading,  setSegLoading]  = useState(false);
  const [segError,    setSegError]    = useState<string | null>(null);
  const [activeSegId, setActiveSegId] = useState<number | null>(null);
  const [segMinKm,    setSegMinKm]    = useState(0.5);

  // OSM routes
  const [osmRoutes,   setOsmRoutes]   = useState<OSMRoute[] | null>(null);
  const [osmLoading,  setOsmLoading]  = useState(false);
  const [osmError,    setOsmError]    = useState<string | null>(null);
  const [activeOsmId, setActiveOsmId] = useState<number | null>(null);

  // init map once
  useEffect(() => {
    const el = mapElRef.current;
    if (!el || mapRef.current) return;
    const map = L.map(el, { zoomControl: true, attributionControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    map.setView([16.047, 108.206], 13);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // auto-fetch when switching to popular tab
  useEffect(() => {
    if (tab === 'popular' && segments === null && osmRoutes === null) {
      fetchPopular();
    }
  }, [tab]);

  // click handler
  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (tab !== 'build') return;
    const pt: LatLng = [e.latlng.lat, e.latlng.lng];
    const map = mapRef.current;
    if (!map) return;

    if (clickMode === 'start') {
      startMarkerRef.current?.remove();
      startMarkerRef.current = L.marker(pt, { icon: START_ICON }).addTo(map);
      setStartPt(pt);
      setClickMode(roundTrip ? 'idle' : 'end');
      polyRef.current?.remove(); polyRef.current = null;
      setRoute(null); setError(null);
    } else if (clickMode === 'end') {
      endMarkerRef.current?.remove();
      endMarkerRef.current = L.marker(pt, { icon: END_ICON }).addTo(map);
      setEndPt(pt);
      setClickMode('idle');
    } else if (clickMode === 'waypoint') {
      wpMarkerRef.current?.remove();
      wpMarkerRef.current = L.marker(pt, { icon: WP_ICON }).addTo(map);
      setWayptPt(pt);
      setClickMode('idle');
    }
  }, [clickMode, roundTrip, tab]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.on('click', handleMapClick);
    return () => { map.off('click', handleMapClick); };
  }, [handleMapClick]);

  function enableRoundTrip() {
    endMarkerRef.current?.remove(); endMarkerRef.current = null;
    setEndPt(null);
    if (clickMode === 'end') setClickMode('idle');
    setRoundTrip(true);
  }

  function clearWaypoint() {
    wpMarkerRef.current?.remove(); wpMarkerRef.current = null;
    setWayptPt(null);
    if (clickMode === 'waypoint') setClickMode('idle');
  }

  function clearMapOverlays() {
    polyRef.current?.remove(); polyRef.current = null;
    segMarkersRef.current.forEach(m => m.remove());
    segMarkersRef.current = [];
  }

  function drawPolyline(coords: LatLng[], color: string) {
    const map = mapRef.current;
    if (!map) return;
    clearMapOverlays();
    const poly = L.polyline(coords, { color, weight: 4, opacity: 0.9 });
    poly.addTo(map);
    polyRef.current = poly;
    map.fitBounds(poly.getBounds(), { padding: [32, 32] });
  }

  function selectSegment(seg: StravaSegmentExplore) {
    if (activeSegId === seg.id) return;
    const map = mapRef.current;
    if (!map) return;
    const coords = decodePolyline(seg.points);
    drawPolyline(coords, '#3b82f6');
    const sm = L.marker(seg.start_latlng, { icon: START_ICON }).addTo(map);
    const em = L.marker(seg.end_latlng, { icon: END_ICON }).addTo(map);
    segMarkersRef.current = [sm, em];
    startMarkerRef.current?.remove(); startMarkerRef.current = null;
    endMarkerRef.current?.remove(); endMarkerRef.current = null;
    setActiveSegId(seg.id);
    setActiveOsmId(null);
  }

  function selectOSMRoute(r: OSMRoute) {
    if (activeOsmId === r.id) return;
    drawPolyline(r.coords, '#a855f7');
    startMarkerRef.current?.remove(); startMarkerRef.current = null;
    endMarkerRef.current?.remove(); endMarkerRef.current = null;
    setActiveOsmId(r.id);
    setActiveSegId(null);
  }

  async function fetchPopular() {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    const sw: [number, number] = [b.getSouth(), b.getWest()];
    const ne: [number, number] = [b.getNorth(), b.getEast()];

    setSegLoading(true); setSegError(null);
    setOsmLoading(true); setOsmError(null);

    fetchSegmentsExplore(sw[0], sw[1], ne[0], ne[1])
      .then(setSegments)
      .catch(e => setSegError(String(e)))
      .finally(() => setSegLoading(false));

    fetchOSMRoutes(sw[0], sw[1], ne[0], ne[1])
      .then(setOsmRoutes)
      .catch(e => setOsmError(String(e)))
      .finally(() => setOsmLoading(false));
  }

  async function generate(newSeed?: number) {
    if (!startPt) return;
    if (!roundTrip && !endPt) return;
    const useSeed = newSeed ?? seed;
    setLoading(true); setError(null);
    try {
      const resp = await fetch('/api/route/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: startPt,
          end: endPt ?? undefined,
          waypoint: wayptPt ?? undefined,
          distanceM: distKm * 1000,
          roundTrip,
          seed: useSeed,
        }),
      });
      const text = await resp.text();
      let json: Record<string, unknown> = {};
      try {
        json = text ? JSON.parse(text) as Record<string, unknown> : {};
      } catch {
        if (!resp.ok) {
          setError(text || `Ошибка API (${resp.status})`);
          return;
        }
        throw new Error(`Invalid JSON from route API: ${text.slice(0, 120)}`);
      }
      if (!resp.ok) {
        const errObj = json as { error?: string };
        try {
          const parsed = JSON.parse(errObj.error ?? '{}') as { error?: { message?: string } };
          setError(parsed.error?.message ?? errObj.error ?? 'Ошибка API');
        } catch { setError(errObj.error ?? 'Ошибка API'); }
        return;
      }
      const geoJson = json as {
        features: Array<{
          geometry: { coordinates: [number, number][] };
          properties: { summary: { distance: number; duration: number }; ascent?: number };
        }>;
      };
      const feat = geoJson.features[0];
      const coords: LatLng[] = feat.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const summary = feat.properties.summary;
      const ascentM = feat.properties.ascent ?? 0;
      setRoute({ distanceM: summary.distance, durationS: summary.duration, ascentM, coords });
      const map = mapRef.current;
      if (!map) return;
      polyRef.current?.remove();
      const poly = L.polyline(coords, { color: '#FC4C02', weight: 4, opacity: 0.9 });
      poly.addTo(map);
      polyRef.current = poly;
      map.fitBounds(poly.getBounds(), { padding: [32, 32] });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setError('Геолокация не поддерживается браузером'); return; }
    setGeoLoading(true); setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt: LatLng = [pos.coords.latitude, pos.coords.longitude];
        const map = mapRef.current;
        if (map) {
          startMarkerRef.current?.remove();
          startMarkerRef.current = L.marker(pt, { icon: START_ICON }).addTo(map);
          map.setView(pt, 15);
        }
        setStartPt(pt);
        setClickMode(roundTrip ? 'idle' : 'end');
        polyRef.current?.remove(); polyRef.current = null;
        setRoute(null); setGeoLoading(false);
      },
      (err) => {
        setError(err.code === 1 ? 'Доступ к геолокации запрещён' : 'Не удалось определить местоположение');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function buildNew() {
    const next = Math.floor(Math.random() * 9999);
    setSeed(next);
    generate(next);
  }

  const canGenerate = !!startPt && (roundTrip || !!endPt);
  const cursorClass = tab === 'build' && clickMode !== 'idle' ? styles.cursorStart : '';

  return (
    <div className={styles.page}>
      <div className={styles.panel}>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'build' ? styles.tabActive : ''}`} onClick={() => setTab('build')}>
            Построить
          </button>
          <button className={`${styles.tab} ${tab === 'popular' ? styles.tabActive : ''}`} onClick={() => setTab('popular')}>
            Популярные
          </button>
        </div>

        {/* ── Build tab ── */}
        {tab === 'build' && (
          <>
            {/* Step 1 — Points */}
            <div className={styles.section}>
              <div className={styles.stepLabel}><span className={styles.stepNum}>1</span> Точки</div>

              <div className={styles.startRow}>
                <button
                  className={`${styles.pointBtn} ${styles.pointBtnFlex} ${clickMode === 'start' ? styles.pointBtnActive : ''}`}
                  onClick={() => setClickMode('start')}
                >
                  <span className={styles.dot} style={{ background: '#22c55e' }} />
                  {startPt ? `${startPt[0].toFixed(4)}, ${startPt[1].toFixed(4)}` : 'Кликните — старт'}
                </button>
                <button className={styles.geoBtn} onClick={useMyLocation} disabled={geoLoading} title="Моё местоположение">
                  {geoLoading ? '…' : '◎'}
                </button>
              </div>

              <div className={styles.toggleRow}>
                <button className={`${styles.toggleBtn} ${roundTrip ? styles.toggleActive : ''}`} onClick={enableRoundTrip}>
                  Вернуться назад
                </button>
                <button className={`${styles.toggleBtn} ${!roundTrip ? styles.toggleActive : ''}`} onClick={() => setRoundTrip(false)}>
                  Разные точки
                </button>
              </div>

              {!roundTrip && (
                <button
                  className={`${styles.pointBtn} ${clickMode === 'end' ? styles.pointBtnActive : ''}`}
                  onClick={() => setClickMode('end')}
                >
                  <span className={styles.dot} style={{ background: '#ef4444' }} />
                  {endPt ? `${endPt[0].toFixed(4)}, ${endPt[1].toFixed(4)}` : 'Кликните — финиш'}
                </button>
              )}

              {/* Waypoint */}
              {wayptPt ? (
                <div className={styles.wpRow}>
                  <button
                    className={`${styles.pointBtn} ${styles.pointBtnFlex} ${clickMode === 'waypoint' ? styles.pointBtnActive : ''}`}
                    onClick={() => setClickMode('waypoint')}
                  >
                    <span className={styles.dot} style={{ background: '#eab308' }} />
                    {`${wayptPt[0].toFixed(4)}, ${wayptPt[1].toFixed(4)}`}
                  </button>
                  <button className={styles.clearWpBtn} onClick={clearWaypoint} title="Убрать точку">✕</button>
                </div>
              ) : (
                <button
                  className={`${styles.addWpBtn} ${clickMode === 'waypoint' ? styles.pointBtnActive : ''}`}
                  onClick={() => setClickMode('waypoint')}
                >
                  <span className={styles.dot} style={{ background: '#eab308' }} />
                  {clickMode === 'waypoint' ? 'Кликните на карте' : '+ Добавить точку'}
                </button>
              )}
            </div>

            {/* Step 2 — Distance (hidden when waypoint is set) */}
            <div className={styles.section} style={wayptPt ? { display: 'none' } : undefined}>
              <div className={styles.stepLabel}><span className={styles.stepNum}>2</span> Дистанция</div>
              <div className={styles.distRow}>
                <input type="range" min={1} max={50} value={distKm} onChange={e => setDistKm(Number(e.target.value))} className={styles.slider} />
                <div className={styles.distInput}>
                  <input
                    type="number" min={1} max={100} value={distKm}
                    onChange={e => setDistKm(Math.max(1, Number(e.target.value)))}
                    className={styles.numInput}
                  />
                  <span className={styles.unit}>км</span>
                </div>
              </div>
            </div>

            {/* Step 3 — Generate */}
            <div className={styles.section}>
              <div className={styles.stepLabel}><span className={styles.stepNum}>3</span> Маршрут</div>
              <button className={styles.buildBtn} disabled={!canGenerate || loading} onClick={route ? buildNew : () => generate()}>
                {loading ? 'Строю...' : route ? 'Перестроить' : 'Построить маршрут'}
              </button>
              {error && <div className={styles.error}>{error}</div>}
              {route && (
                <>
                  <div className={styles.routeInfo}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Дистанция</span>
                      <span className={styles.infoVal}>
                        {fmtDist(route.distanceM)}
                        {(() => {
                          const diffM = route.distanceM - distKm * 1000;
                          const sign = diffM >= 0 ? '+' : '−';
                          const color = Math.abs(diffM) < 500 ? 'var(--green)' : Math.abs(diffM) < 1500 ? '#eab308' : '#ef4444';
                          return <span style={{ fontSize: 11, color, marginLeft: 6, fontFamily: 'Space Mono' }}>{sign}{fmtDist(Math.abs(diffM))}</span>;
                        })()}
                      </span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>~Время</span>
                      <span className={styles.infoVal}>{fmtTime(route.durationS)}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Набор высоты</span>
                      <span className={styles.infoVal}>{Math.round(route.ascentM)} м</span>
                    </div>
                  </div>
                  <div className={styles.exportRow}>
                    <button className={styles.exportBtn} onClick={() => downloadGpx(route.coords, route.durationS)}>
                      Скачать GPX
                    </button>
                    <a className={styles.garminBtn} href="https://connect.garmin.com/modern/import-data" target="_blank" rel="noreferrer">
                      Garmin Connect
                    </a>
                  </div>
                </>
              )}
            </div>

            <div className={styles.hint}>
              {clickMode === 'start'   && 'Кликните на карте для установки старта'}
              {clickMode === 'end'     && 'Кликните на карте для установки финиша'}
              {clickMode === 'waypoint' && 'Кликните на карте — маршрут пройдёт через эту точку'}
              {clickMode === 'idle' && !route && canGenerate && 'Нажмите «Построить маршрут»'}
            </div>
          </>
        )}

        {/* ── Popular tab ── */}
        {tab === 'popular' && (
          <div className={styles.savedList}>
            <div className={styles.popularControls}>
              <button className={styles.fetchBtn} onClick={fetchPopular} disabled={segLoading || osmLoading}>
                {(segLoading || osmLoading) ? 'Поиск...' : 'Обновить область'}
              </button>
              <div className={styles.filterPills}>
                {[0, 1, 2, 5].map(km => (
                  <button
                    key={km}
                    className={`${styles.pill} ${segMinKm === km ? styles.pillActive : ''}`}
                    onClick={() => setSegMinKm(km)}
                  >
                    {km === 0 ? 'Все' : `≥${km}км`}
                  </button>
                ))}
              </div>
            </div>

            {/* OSM routes */}
            <div className={styles.sectionHeader}>Маршруты (OSM)</div>
            {osmLoading && <div className={styles.loadingBox}>Загрузка...</div>}
            {osmError && <div className={styles.error}>{osmError}</div>}
            {osmRoutes && osmRoutes.filter(r => r.distanceM >= segMinKm * 1000).length === 0 && !osmLoading && (
              <div className={styles.emptyBox}>Маршрутов не найдено</div>
            )}
            {osmRoutes?.filter(r => r.distanceM >= segMinKm * 1000).map(r => (
              <button
                key={r.id}
                className={`${styles.savedItem} ${activeOsmId === r.id ? styles.savedItemActive : ''}`}
                onClick={() => selectOSMRoute(r)}
              >
                <div className={styles.savedItemName}>{r.name}</div>
                <div className={styles.savedItemMeta}><span>{fmtDist(r.distanceM)}</span></div>
              </button>
            ))}

            {/* Strava segments */}
            <div className={styles.sectionHeader}>Сегменты (Strava)</div>
            {segLoading && <div className={styles.loadingBox}>Загрузка...</div>}
            {segError && <div className={styles.error}>{segError}</div>}
            {segments && segments.filter(s => s.distance >= segMinKm * 1000).length === 0 && !segLoading && (
              <div className={styles.emptyBox}>Сегментов не найдено</div>
            )}
            {segments?.filter(s => s.distance >= segMinKm * 1000).map(seg => (
              <button
                key={seg.id}
                className={`${styles.savedItem} ${activeSegId === seg.id ? styles.savedItemActive : ''}`}
                onClick={() => selectSegment(seg)}
              >
                <div className={styles.savedItemName}>{seg.name}</div>
                <div className={styles.savedItemMeta}>
                  <span>{fmtDist(seg.distance)}</span>
                  <span>уклон {seg.avg_grade.toFixed(1)}%</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Map ── */}
      <div className={`${styles.mapWrap} ${cursorClass}`}>
        <div ref={mapElRef} className={styles.map} />
      </div>
    </div>
  );
}
