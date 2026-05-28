import { useState, useEffect, useCallback } from 'react';
import type { Race, RaceMark } from '../../types/races';
import styles from './Races.module.css';


/* ─── Helpers ─── */
function loadStorage(): { marks: Record<string, RaceMark>; customs: Race[] } {
  try {
    const marks   = JSON.parse(localStorage.getItem('raceMarks')   || '{}');
    const customs = JSON.parse(localStorage.getItem('customRaces') || '[]');
    return { marks, customs };
  } catch { return { marks: {}, customs: [] }; }
}

function saveMarks(marks: Record<string, RaceMark>) {
  try { localStorage.setItem('raceMarks', JSON.stringify(marks)); } catch { /* */ }
}

function saveCustomRaces(races: Race[]) {
  const customs = races.filter(r => r.source === 'manual');
  try { localStorage.setItem('customRaces', JSON.stringify(customs)); } catch { /* */ }
}

function countdown(dateStr: string) {
  const d     = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff  = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0)   return { text: 'Прошёл', cls: styles.countdownPast };
  if (diff === 0) return { text: 'Сегодня!', cls: '' };
  if (diff <= 60) return { text: diff + 'д', cls: styles.countdownSoon };
  return { text: diff + 'д', cls: '' };
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function distLabel(d: number) {
  if (d >= 20 && d <= 22) return 'Полумарафон';
  if (d >= 42 && d <= 43) return 'Марафон';
  if (d >= 70 || d === 113) return 'Ironman';
  return d + ' км';
}

const STATUS_CYCLE = ['', 'interested', 'registered', 'target', 'completed'] as const;
type Status = typeof STATUS_CYCLE[number];

const STATUS_LABEL: Record<string, string> = {
  interested: '👀 Интересует',
  registered: '✅ Зарегистрирован',
  target:     '🎯 Целевой',
  completed:  '🏅 Финишировал',
};

const DIST_FILTERS = [
  { label: 'Все', value: 'all' },
  { label: '5 км', value: '5' },
  { label: '10 км', value: '10' },
  { label: 'Полумарафон', value: '21' },
  { label: 'Марафон', value: '42' },
];

const REGION_FILTERS = [
  { label: 'Все регионы', value: 'all' },
  { label: '🇻🇳 Вьетнам', value: 'VN' },
  { label: 'Азия', value: 'asia' },
];

const ASIA_CODES = ['VN', 'TH', 'SG', 'JP', 'KR', 'MY', 'ID', 'PH', 'CN', 'IN'];

/* ─── Form state ─── */
interface FormState {
  name: string;
  date: string;
  city: string;
  country: string;
  url: string;
  status: Status;
  note: string;
  distances: number[];
}

const emptyForm = (): FormState => ({
  name: '', date: '', city: '', country: '', url: '', status: '', note: '', distances: [],
});

const DIST_OPTIONS = [
  { label: '1.5 км', val: 1.5 },
  { label: '5 км',   val: 5 },
  { label: '10 км',  val: 10 },
  { label: '21 км',  val: 21 },
  { label: '42 км',  val: 42 },
  { label: '100 км', val: 100 },
];

/* ─── ActiUp slug helpers ─── */

const BRAND_MAP: Record<string, string> = {
  vpbank: 'VPBank', vtv: 'VTV', hsbc: 'HSBC', tvb: 'TVB', aeon: 'AEON',
  lpbank: 'LPBank', hcmc: 'HCMC', vib: 'VIB', acb: 'ACB', mb: 'MB',
};

function slugToName(slug: string): string {
  return slug
    .replace(/-(\d+)(st|nd|rd|th)-/g, '-$1$2-')
    .split('-')
    .filter(w => w.length > 0)
    .map(w => BRAND_MAP[w.toLowerCase()] ?? (w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CITY_PATTERNS: [RegExp, string][] = [
  [/hanoi|ha-noi|ha noi/i,               'Hanoi'],
  [/ho-chi-minh|hochiminh|hcmc/i,        'Ho Chi Minh City'],
  [/da-nang|danang/i,                     'Da Nang'],
  [/hoi-an|hoian/i,                       'Hoi An'],
  [/nha-trang|nhatrang/i,                 'Nha Trang'],
  [/\bhue\b/i,                            'Hue'],
  [/phu-quoc|phuquoc/i,                   'Phu Quoc'],
  [/da-lat|dalat/i,                       'Da Lat'],
  [/quang-tri|quangtri/i,                 'Quang Tri'],
  [/hai-phong|haiphong/i,                 'Hai Phong'],
  [/sa-pa|sapa/i,                         'Sa Pa'],
  [/cao-bang|caobang/i,                   'Cao Bang'],
  [/ha-long|halong/i,                     'Ha Long'],
  [/gia-lai/i,                            'Gia Lai'],
  [/buon-ma-thuot/i,                      'Buon Ma Thuot'],
  [/lang-son/i,                           'Lang Son'],
  [/mekong/i,                             'Mekong Delta'],
  [/phong-nha/i,                          'Phong Nha'],
  [/trang-an/i,                           'Trang An'],
  [/sam-son/i,                            'Sam Son'],
  [/cu-chi/i,                             'Cu Chi'],
  [/yen-tu/i,                             'Yen Tu'],
  [/cat-tien/i,                           'Cat Tien'],
  [/cuc-phuong/i,                         'Cuc Phuong'],
  [/ly-son/i,                             'Ly Son'],
  [/lam-dong|lamdong/i,                   'Lam Dong'],
  [/dak-lak|daklak/i,                     'Dak Lak'],
  [/phu-thuan/i,                          'Phu Thuan'],
  [/kon-ka-kinh/i,                        'Kon Ka Kinh'],
];

function detectCity(slug: string): string {
  for (const [re, city] of CITY_PATTERNS) {
    if (re.test(slug)) return city;
  }
  return 'Vietnam';
}

function detectDistances(slug: string): number[] {
  const s = slug.toLowerCase();
  if (/ultra/.test(s))                        return [70];
  if (/half.marathon|half-marathon/.test(s))  return [21];
  if (/\bmarathon\b/.test(s) && !/half/.test(s)) return [42];
  if (/ekiden/.test(s))                       return [42];
  if (/\b10k\b|\b10km\b/.test(s))            return [10];
  if (/\b5k\b|\b5km\b/.test(s))              return [5];
  if (/trail/.test(s))                        return [21, 42];
  return [];
}

const RUNNING_CAT_IDS = new Set([1, 2, 4]);
const RUNNING_SLUG_RE  = /run|marathon|trail|sprint|chay|ekiden/i;
const EXCLUDE_SLUG_RE  = /aqua.warrior|kayak|ironkids|swim|archery/i;

function isRunningEvent(ev: Record<string, unknown>): boolean {
  const slug = String(ev.event_slug || '');
  if (EXCLUDE_SLUG_RE.test(slug)) return false;
  const catIds = ((ev.categories || []) as { cat_id: number }[]).map(c => c.cat_id);
  return catIds.some(id => RUNNING_CAT_IDS.has(id)) || RUNNING_SLUG_RE.test(slug);
}

/* ─── Component ─── */
export default function RacesTab() {
  const { marks: savedMarks, customs } = loadStorage();

  const [races,     setRaces]    = useState<Race[]>(() => [...customs]);
  const [marks,     setMarks]    = useState<Record<string, RaceMark>>(savedMarks);
  const [distFlt,   setDistFlt]  = useState('all');
  const [regionFlt, setRegionFlt] = useState('all');
  const [search,    setSearch]   = useState('');
  const [loadStatus, setLoadStatus] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  useEffect(() => {
    loadActiup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  async function loadActiup() {
    const URL = 'https://api.actiup.net/v2/content/event/homepage?event_type=sports&limit=100&page=1';
    const today = new Date(); today.setHours(0, 0, 0, 0);

    let items: Record<string, unknown>[] = [];
    try {
      const res = await fetch(URL, { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const data = await res.json() as { result?: Record<string, unknown>[] };
      items = data.result ?? [];
    } catch { return; }

    const seenSlugs = new Set<string>();
    const collected: Race[] = [];
    for (const ev of items) {
      const slug = String(ev.event_slug || '');
      const date = String(ev.start_date || '').slice(0, 10);
      if (!slug || !date || new Date(date) < today) continue;
      if (!isRunningEvent(ev)) continue;
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      collected.push({
        id: 'actiup-' + slug,
        name: slugToName(slug),
        date,
        city: detectCity(slug),
        country: 'Vietnam',
        countryCode: 'VN',
        distances: detectDistances(slug),
        url: `https://actiup.net/en/event/${slug}`,
        source: 'actiup',
      });
    }

    if (collected.length === 0) return;
    setRaces(prev => {
      const existingIds = new Set(prev.map(r => r.id));
      const newOnes = collected.filter(r => !existingIds.has(r.id));
      if (newOnes.length === 0) return prev;
      setLoadStatus(`✅ ActiUp: +${newOnes.length} событий`);
      return [...prev, ...newOnes];
    });
  }

  const updateMarks = useCallback((next: Record<string, RaceMark>) => {
    setMarks(next);
    saveMarks(next);
  }, []);

  function cycleStatus(id: string) {
    const cur   = STATUS_CYCLE.indexOf((marks[id]?.status || '') as Status);
    const next  = STATUS_CYCLE[(cur + 1) % STATUS_CYCLE.length];
    const updated = { ...marks };
    if (!updated[id]) updated[id] = {};
    if (next) updated[id] = { ...updated[id], status: next };
    else { const { status: _, ...rest } = updated[id]; updated[id] = rest; }
    updateMarks(updated);
  }

  function matchesDist(r: Race) {
    if (distFlt === 'all') return true;
    const fd = parseFloat(distFlt);
    return r.distances.some(d => {
      if (fd === 5)  return d >= 4.5 && d <= 5.5;
      if (fd === 10) return d >= 9 && d <= 11;
      if (fd === 21) return d >= 20 && d <= 22;
      if (fd === 42) return d >= 42 && d <= 43;
      return false;
    });
  }

  function matchesRegion(r: Race) {
    if (regionFlt === 'all')  return true;
    if (regionFlt === 'VN')   return r.countryCode === 'VN';
    if (regionFlt === 'asia') return ASIA_CODES.includes(r.countryCode || '');
    return true;
  }

  function matchesSearch(r: Race) {
    if (!search) return true;
    return (r.name + r.city + r.country).toLowerCase().includes(search.toLowerCase());
  }

  const filtered = races
    .filter(r => matchesDist(r) && matchesRegion(r) && matchesSearch(r))
    .sort((a, b) => a.date.localeCompare(b.date));

  const today      = new Date(); today.setHours(0, 0, 0, 0);
  const myRaces    = filtered.filter(r => marks[r.id]?.status);
  const upcoming   = filtered.filter(r => new Date(r.date) >= today);
  const past       = filtered.filter(r => new Date(r.date) < today);
  const allDisplay = [...upcoming, ...past];

  /* ─── Modal ─── */
  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(r: Race) {
    const mark = marks[r.id] || {};
    setEditingId(r.id);
    setForm({
      name:    r.name,
      date:    r.date,
      city:    r.city,
      country: r.country,
      url:     r.url || '',
      status:  (mark.status || '') as Status,
      note:    mark.note || '',
      distances: r.distances,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function saveRace() {
    if (!form.name || !form.date) { alert('Название и дата обязательны'); return; }
    const nextRaces = [...races];
    const nextMarks = { ...marks };

    if (editingId) {
      const idx = nextRaces.findIndex(r => r.id === editingId);
      if (idx >= 0 && nextRaces[idx].source === 'manual') {
        nextRaces[idx] = { ...nextRaces[idx], name: form.name, date: form.date, city: form.city, country: form.country, url: form.url, distances: form.distances };
      }
      if (form.status || form.note) {
        nextMarks[editingId] = { ...nextMarks[editingId], status: form.status || undefined, note: form.note || undefined };
      } else {
        delete nextMarks[editingId];
      }
    } else {
      const id = 'manual-' + Date.now();
      nextRaces.push({ id, name: form.name, date: form.date, city: form.city, country: form.country, url: form.url, distances: form.distances, source: 'manual' });
      if (form.status || form.note) {
        nextMarks[id] = { status: form.status || undefined, note: form.note || undefined };
      }
    }

    setRaces(nextRaces);
    saveCustomRaces(nextRaces);
    updateMarks(nextMarks);
    closeModal();
  }

  function deleteRace() {
    if (!editingId || !confirm('Удалить этот забег?')) return;
    const nextRaces = races.filter(r => r.id !== editingId);
    const nextMarks = { ...marks };
    delete nextMarks[editingId];
    setRaces(nextRaces);
    saveCustomRaces(nextRaces);
    updateMarks(nextMarks);
    closeModal();
  }

  function toggleDist(val: number) {
    setForm(f => ({
      ...f,
      distances: f.distances.includes(val) ? f.distances.filter(d => d !== val) : [...f.distances, val],
    }));
  }

  /* ─── Race Card ─── */
  function RaceCard({ r }: { r: Race }) {
    const mark     = marks[r.id] || {};
    const status   = mark.status || '';
    const cd       = countdown(r.date);
    const statusCls = status ? styles[`status_${status}` as keyof typeof styles] : '';

    return (
      <div className={`${styles.card} ${statusCls}`}>
        <div className={styles.cardTop}>
          <div className={styles.cardMeta}>
            <span className={styles.cardDate}>{fmtDate(r.date)}</span>
            <span className={`${styles.countdown} ${cd.cls}`}>{cd.text}</span>
          </div>
          <div className={styles.cardName}>{r.name}</div>
          <div className={styles.cardLocation}>📍 {r.city}{r.country && r.country !== r.city ? ', ' + r.country : ''}</div>
          <div className={styles.cardDists}>
            {r.distances.map(d => (
              <span key={d} className={`${styles.distBadge} ${mark.targetDist && Math.round(d) === Math.round(mark.targetDist) ? styles.distBadgeHL : ''}`}>
                {distLabel(d)}
              </span>
            ))}
          </div>
          {(mark.note || r.note) && <div className={styles.cardNote}>💬 {mark.note || r.note}</div>}
          <div className={styles.cardSource}>{r.source === 'manual' ? '✏️ мой' : r.source === 'actiup' ? '📍 ActiUp' : '📍'}</div>
        </div>
        <div className={styles.cardBottom}>
          <button className={`${styles.statusBtn} ${status ? styles[`s_${status}` as keyof typeof styles] : ''}`} onClick={() => cycleStatus(r.id)}>
            {status ? STATUS_LABEL[status] : 'Отметить'}
          </button>
          {r.url && (
            <a className={styles.cardLink} href={r.url} target="_blank" rel="noreferrer" title="Открыть">↗</a>
          )}
          <button className={styles.cardEdit} title="Редактировать" onClick={() => openEdit(r)}>✎</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tab}>
      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Поиск по названию или городу..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.pills}>
          {DIST_FILTERS.map(f => (
            <button key={f.value} className={`${styles.pill} ${distFlt === f.value ? styles.pillActive : ''}`} onClick={() => setDistFlt(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className={styles.pills}>
          {REGION_FILTERS.map(f => (
            <button key={f.value} className={`${styles.pill} ${regionFlt === f.value ? styles.pillActive : ''}`} onClick={() => setRegionFlt(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <button className="btn" onClick={openAdd} style={{ marginLeft: 'auto' }}>+ Добавить</button>
      </div>

      {loadStatus && <div className={styles.loadStatus}>{loadStatus}</div>}

      {/* My races */}
      {myRaces.length > 0 && (
        <>
          <div className="an-section" style={{ marginTop: 0 }}>
            Мои забеги <span className={styles.count}>{myRaces.length}</span>
          </div>
          <div className={styles.grid}>
            {myRaces.map(r => <RaceCard key={r.id} r={r} />)}
          </div>
        </>
      )}

      {/* All races */}
      <div className="an-section" style={{ marginTop: myRaces.length ? undefined : 0 }}>
        Предстоящие <span className={styles.count}>{upcoming.length}</span>
      </div>
      {allDisplay.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔍</div>
          <div className={styles.emptyTitle}>Ничего не найдено</div>
          <div className={styles.emptySub}>Попробуй другой фильтр или добавь забег вручную</div>
        </div>
      ) : (
        <div className={styles.grid}>
          {allDisplay.map(r => <RaceCard key={r.id} r={r} />)}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>{editingId ? 'Редактировать' : 'Добавить забег'}</div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Название *</label>
              <input className={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Danang Marathon 2026" />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Дата *</label>
                <input className={styles.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Статус</label>
                <select className={styles.input} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}>
                  <option value="">—</option>
                  <option value="interested">👀 Интересует</option>
                  <option value="registered">✅ Зарегистрирован</option>
                  <option value="target">🎯 Целевой</option>
                  <option value="completed">🏅 Финишировал</option>
                </select>
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Город</label>
                <input className={styles.input} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Da Nang" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Страна</label>
                <input className={styles.input} value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Vietnam" />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Сайт / ссылка</label>
              <input className={styles.input} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Дистанции</label>
              <div className={styles.distChecks}>
                {DIST_OPTIONS.map(opt => (
                  <label key={opt.val} className={`${styles.distCheck} ${form.distances.includes(opt.val) ? styles.distCheckActive : ''}`}>
                    <input type="checkbox" checked={form.distances.includes(opt.val)} onChange={() => toggleDist(opt.val)} style={{ display: 'none' }} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Заметка</label>
              <input className={styles.input} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Личный рекорд, цель..." />
            </div>

            <div className={styles.formActions}>
              <button className="btn" style={{ flex: 1 }} onClick={saveRace}>Сохранить</button>
              <button className="btn-secondary" onClick={closeModal}>Отмена</button>
              {editingId && races.find(r => r.id === editingId)?.source === 'manual' && (
                <button className={`btn-secondary ${styles.deleteBtn}`} onClick={deleteRace}>Удалить</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
