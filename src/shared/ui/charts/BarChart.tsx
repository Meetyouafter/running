import { useEffect, useRef, useState, useCallback } from 'react';

export interface BarDetail { date: string; km: number }

interface Props {
  labels:   string[];
  data:     number[];
  color:    string;
  yMin?:    number;
  height?:  number;
  counts?:  number[];
  unit?:    string;
  details?: BarDetail[][];
}

function lighten(hex: string, n: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + n);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + n);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + n);
  return `rgb(${r},${g},${b})`;
}

function fmtRuDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function BarChart({
  labels, data, color, yMin = 0, height = 160, counts, unit = '', details,
}: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef(0);
  const animDoneRef  = useRef(true);
  const hovIdxRef    = useRef<number | null>(null);
  const drawRef      = useRef<(prog: number) => void>(() => {});

  const [hov, setHov] = useState<{ pct: number; idx: number } | null>(null);

  // Build draw fn, keep ref in sync
  const buildDraw = useCallback(() => {
    drawRef.current = (prog: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !data.length) return;
      const ctx = canvas.getContext('2d')!;
      const W   = canvas.offsetWidth || 400;
      const H   = height;
      canvas.width  = W;
      canvas.height = H;
      const pad = { t: 24, r: 12, b: 28, l: 44 };
      const gW  = W - pad.l - pad.r;
      const gH  = H - pad.t - pad.b;
      const max = Math.max(...data) * 1.15 || 1;
      const min = yMin;
      const hi  = hovIdxRef.current;

      ctx.clearRect(0, 0, W, H);

      // Grid + y-labels
      for (let i = 0; i <= 4; i++) {
        const gy = pad.t + gH - (i / 4) * gH;
        ctx.strokeStyle = i === 0 ? '#333' : '#1e1e1e';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(pad.l + gW, gy); ctx.stroke();
        ctx.fillStyle = '#505050';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(String(Math.round(min + (max - min) * (i / 4))), pad.l - 6, gy + 4);
      }

      const gap = gW / data.length;
      const bW  = Math.max(4, gap * 0.72);

      data.forEach((val, i) => {
        const cx    = pad.l + i * gap + gap / 2;
        const bx    = cx - bW / 2;
        const fBH   = ((val - min) / (max - min)) * gH;
        const bH    = fBH * prog;
        const by    = pad.t + gH - bH;
        const isHi  = hi === i;

        if (bH < 1) return;

        // Glow
        if (isHi) { ctx.shadowColor = color + '99'; ctx.shadowBlur = 14; }

        // Bar gradient
        const g1 = ctx.createLinearGradient(0, by, 0, by + bH);
        g1.addColorStop(0, isHi ? lighten(color, 40) : color);
        g1.addColorStop(0.55, color + 'cc');
        g1.addColorStop(1, color + '28');
        ctx.fillStyle = g1;
        ctx.beginPath();
        (ctx as CanvasRenderingContext2D & { roundRect: (...a: unknown[]) => void })
          .roundRect(bx, by, bW, bH, [3, 3, 0, 0]);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Shine at top
        if (bH > 7) {
          const shH = Math.min(bH * 0.3, 13);
          const g2  = ctx.createLinearGradient(0, by, 0, by + shH);
          g2.addColorStop(0, 'rgba(255,255,255,0.15)');
          g2.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g2;
          ctx.beginPath();
          (ctx as CanvasRenderingContext2D & { roundRect: (...a: unknown[]) => void })
            .roundRect(bx, by, bW, shH, [3, 3, 0, 0]);
          ctx.fill();
        }

        // X-axis label
        if (i % Math.ceil(data.length / 8) === 0) {
          ctx.fillStyle = isHi ? '#aaa' : '#4d4d4d';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(labels[i] ?? '', cx, H - 5);
        }

        // Count badge above bar
        if (counts && prog > 0.65) {
          const a = Math.min(1, (prog - 0.65) / 0.35);
          ctx.globalAlpha = a;
          ctx.fillStyle = isHi ? '#c0c0c0' : '#5e5e5e';
          ctx.font = `bold 9px sans-serif`;
          ctx.textAlign = 'center';
          const ty = pad.t + gH - fBH - 5;
          if (ty > pad.t + 4) ctx.fillText(String(counts[i]), cx, ty);
          ctx.globalAlpha = 1;
        }
      });
    };
  }, [data, labels, color, yMin, height, counts]);

  // Rebuild draw fn when deps change
  useEffect(() => { buildDraw(); }, [buildDraw]);

  // Animate on data change
  useEffect(() => {
    animDoneRef.current = false;
    let start: number | null = null;
    const loop = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / 600, 1);
      drawRef.current(1 - Math.pow(1 - t, 3));
      if (t < 1) { rafRef.current = requestAnimationFrame(loop); }
      else { animDoneRef.current = true; }
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [data, labels, color, yMin, height, counts]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const rect = canvas.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (canvas.width / rect.width);
    const W    = canvas.width;
    const gW   = W - 44 - 12;
    const gap  = gW / data.length;
    const idx  = Math.floor((mx - 44) / gap);
    if (idx >= 0 && idx < data.length) {
      const cx = (44 + idx * gap + gap / 2) / W * 100;
      if (hovIdxRef.current !== idx) {
        hovIdxRef.current = idx;
        if (animDoneRef.current) drawRef.current(1);
      }
      setHov({ pct: cx, idx });
    } else {
      if (hovIdxRef.current !== null) {
        hovIdxRef.current = null;
        if (animDoneRef.current) drawRef.current(1);
      }
      setHov(null);
    }
  };

  const handleMouseLeave = () => {
    hovIdxRef.current = null;
    if (animDoneRef.current) drawRef.current(1);
    setHov(null);
  };

  // Tooltip content
  const ttIdx   = hov?.idx ?? -1;
  const ttRuns  = details?.[ttIdx] ? [...details[ttIdx]].sort((a, b) => a.date.localeCompare(b.date)) : null;
  const ttTotal = ttRuns
    ? ttRuns.reduce((s, r) => s + r.km, 0)
    : (ttIdx >= 0 ? data[ttIdx] : 0);
  const leftPct = hov ? Math.min(Math.max(hov.pct, 14), 86) : 50;

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', cursor: 'crosshair' }}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {hov && ttIdx >= 0 && (
        <div style={{
          position:     'absolute',
          left:         `${leftPct}%`,
          top:          6,
          transform:    'translateX(-50%)',
          background:   '#161616',
          border:       '1px solid #2a2a2a',
          borderRadius: 9,
          padding:      '9px 13px',
          pointerEvents: 'none',
          whiteSpace:   'nowrap',
          zIndex:       20,
          boxShadow:    '0 6px 20px rgba(0,0,0,0.75)',
          minWidth:     130,
        }}>
          {ttRuns ? (
            <>
              {ttRuns.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', gap: 18,
                  marginBottom: 4, fontSize: 11, color: '#888',
                }}>
                  <span>{fmtRuDate(r.date)}</span>
                  <span style={{ fontFamily: 'Space Mono', color: '#bbb' }}>
                    {r.km.toFixed(1)} км
                  </span>
                </div>
              ))}
              <div style={{
                borderTop: '1px solid #272727', marginTop: 5, paddingTop: 6,
                display: 'flex', justifyContent: 'space-between', gap: 18,
                fontSize: 12,
              }}>
                <span style={{ color: '#666' }}>Итого</span>
                <span style={{ fontFamily: 'Space Mono', fontWeight: 700, color }}>
                  {ttTotal.toFixed(1)} км
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={{ color: '#666', fontSize: 10, marginBottom: 4 }}>{labels[ttIdx]}</div>
              {counts && (
                <div style={{ color: '#777', fontSize: 11, marginBottom: 3 }}>{counts[ttIdx]} пр.</div>
              )}
              <div style={{ fontFamily: 'Space Mono', fontWeight: 700, color, fontSize: 12 }}>
                {data[ttIdx]?.toFixed(1)}{unit ? ' ' + unit : ''}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
