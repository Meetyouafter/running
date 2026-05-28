import { useEffect, useRef, useState } from 'react';

interface Series {
  data:   number[];
  color:  string;
  label?: string;
}

interface Props {
  labels:  string[];
  series:  Series[];
  height?: number;
}

export default function MultiLineChart({ labels, series, height = 180 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const [tooltip, setTooltip] = useState<{
    x: number;
    label: string;
    values: { color: string; label?: string; val: number }[];
  } | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !labels.length) return;

    let start: number | null = null;
    const duration = 700;

    const frame = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      const prog = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      const ctx = canvas.getContext('2d')!;
      const W = canvas.offsetWidth || 600;
      const H = height;
      canvas.width  = W;
      canvas.height = H;
      const pad = { top: 16, right: 10, bottom: 28, left: 42 };
      const gW  = W - pad.left - pad.right;
      const gH  = H - pad.top  - pad.bottom;

      const allVals = series.flatMap(s => s.data);
      const max = Math.max(...allVals) * 1.1;
      let   min = Math.min(...allVals);
      if (min > 0) min = 0;

      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + gH - (i / 4) * gH;
        ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + gW, y); ctx.stroke();
        ctx.fillStyle = '#555'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(String(Math.round(min + (max - min) * (i / 4))), pad.left - 4, y + 4);
      }

      if (min < 0) {
        const zy = pad.top + gH - (0 - min) / (max - min) * gH;
        ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.left, zy); ctx.lineTo(pad.left + gW, zy); ctx.stroke();
      }

      const xOf = (i: number) => pad.left + (i / (labels.length - 1)) * gW;
      const yOf = (v: number) => pad.top  + gH - ((v - min) / (max - min)) * gH;

      // Clip to animated width (left-to-right reveal)
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad.left, 0, gW * prog, H);
      ctx.clip();

      series.forEach(s => {
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.lineWidth   = 2;
        s.data.forEach((v, i) => i === 0 ? ctx.moveTo(xOf(i), yOf(v)) : ctx.lineTo(xOf(i), yOf(v)));
        ctx.stroke();
      });

      ctx.restore();

      const step = Math.ceil(labels.length / 8);
      labels.forEach((l, i) => {
        if (i % step === 0) {
          ctx.fillStyle = '#555'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(l, xOf(i), H - 6);
        }
      });

      if (t < 1) rafRef.current = requestAnimationFrame(frame);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [labels, series, height]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas || labels.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const W = canvas.width;
    const pad = { left: 42, right: 10 };
    const gW = W - pad.left - pad.right;

    if (mx < pad.left || mx > pad.left + gW) { setTooltip(null); return; }

    const idx = Math.max(0, Math.min(labels.length - 1, Math.round((mx - pad.left) / gW * (labels.length - 1))));
    const xOf = (i: number) => pad.left + (i / (labels.length - 1)) * gW;
    setTooltip({
      x: xOf(idx) / W * 100,
      label: labels[idx] ?? '',
      values: series.map(s => ({ color: s.color, label: s.label, val: s.data[idx] ?? 0 })),
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: `${tooltip.x}%`,
          top: 0,
          bottom: 0,
          width: 1,
          background: 'rgba(255,255,255,0.08)',
          pointerEvents: 'none',
          zIndex: 5,
        }} />
      )}
      <canvas
        ref={ref}
        style={{ display: 'block', width: '100%', cursor: 'crosshair' }}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: `${tooltip.x}%`,
          top: 8,
          transform: 'translateX(-50%)',
          background: '#1c1c1c',
          border: '1px solid #333',
          borderRadius: 6,
          padding: '5px 10px',
          fontSize: 11,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          color: '#ddd',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
        }}>
          <div style={{ color: '#888', fontSize: 10, marginBottom: 4 }}>{tooltip.label}</div>
          {tooltip.values.map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: v.color, flexShrink: 0 }} />
              {v.label && <span style={{ color: '#aaa', fontSize: 10 }}>{v.label}</span>}
              <span style={{ fontFamily: 'Space Mono', color: v.color, marginLeft: 'auto', paddingLeft: 8 }}>{Math.round(v.val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
