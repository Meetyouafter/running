import { useEffect, useRef, useState } from 'react';

interface Props {
  labels:   string[];
  data:     number[];
  color:    string;
  yMin?:    number;
  height?:  number;
  formatY?: (v: number) => string;
}

export default function LineChart({ labels, data, color, yMin = 0, height = 140, formatY }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: string } | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || data.length < 2) return;

    let start: number | null = null;
    const duration = 700;

    const frame = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      const prog = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out

      const ctx = canvas.getContext('2d')!;
      const W = canvas.offsetWidth || 400;
      const H = height;
      canvas.width  = W;
      canvas.height = H;
      const pad = { top: 16, right: 10, bottom: 28, left: 42 };
      const gW  = W - pad.left - pad.right;
      const gH  = H - pad.top  - pad.bottom;
      const max = Math.max(...data) * 1.05;
      const min = Math.max(yMin, Math.min(...data) * 0.95);

      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + gH - (i / 4) * gH;
        ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + gW, y); ctx.stroke();
        const yVal = min + (max - min) * (i / 4);
        ctx.fillStyle = '#555'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(formatY ? formatY(yVal) : String(Math.round(yVal)), pad.left - 4, y + 4);
      }

      const xOf = (i: number) => pad.left + (i / (data.length - 1)) * gW;
      const yOf = (v: number) => pad.top + gH - ((v - min) / (max - min)) * gH;

      // Clip to animated width (left-to-right reveal)
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad.left, 0, gW * prog, H);
      ctx.clip();

      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + gH);
      grad.addColorStop(0, color + '55');
      grad.addColorStop(1, color + '00');
      ctx.beginPath();
      data.forEach((v, i) => i === 0 ? ctx.moveTo(xOf(i), yOf(v)) : ctx.lineTo(xOf(i), yOf(v)));
      ctx.lineTo(pad.left + gW, pad.top + gH);
      ctx.lineTo(pad.left, pad.top + gH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2;
      data.forEach((v, i) => i === 0 ? ctx.moveTo(xOf(i), yOf(v)) : ctx.lineTo(xOf(i), yOf(v)));
      ctx.stroke();

      ctx.restore();

      const step = Math.ceil(data.length / 8);
      data.forEach((_, i) => {
        if (i % step === 0) {
          ctx.fillStyle = '#555'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(labels[i] ?? '', xOf(i), H - 6);
        }
      });

      if (t < 1) rafRef.current = requestAnimationFrame(frame);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [data, labels, color, yMin, height, formatY]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas || data.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const W = canvas.width;
    const H = height;
    const pad = { top: 16, right: 10, bottom: 28, left: 42 };
    const gW = W - pad.left - pad.right;
    const gH = H - pad.top - pad.bottom;
    const max = Math.max(...data) * 1.05;
    const min = Math.max(yMin, Math.min(...data) * 0.95);

    if (mx < pad.left || mx > pad.left + gW) { setTooltip(null); return; }

    const idx = Math.max(0, Math.min(data.length - 1, Math.round((mx - pad.left) / gW * (data.length - 1))));
    const xOf = (i: number) => pad.left + (i / (data.length - 1)) * gW;
    const yOf = (v: number) => pad.top + gH - ((v - min) / (max - min)) * gH;

    setTooltip({
      x: xOf(idx) / W * 100,
      y: yOf(data[idx]) / H * 100,
      label: labels[idx] ?? '',
      value: formatY ? formatY(data[idx]) : String(Math.round(data[idx])),
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
          top: `${tooltip.y}%`,
          transform: 'translate(-50%, calc(-100% - 6px))',
          background: '#1c1c1c',
          border: '1px solid #333',
          borderRadius: 6,
          padding: '4px 9px',
          fontSize: 11,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          color: '#ddd',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
        }}>
          <div style={{ color: '#888', fontSize: 10, marginBottom: 2 }}>{tooltip.label}</div>
          <div style={{ fontFamily: 'Space Mono', color }}>{tooltip.value}</div>
        </div>
      )}
    </div>
  );
}
