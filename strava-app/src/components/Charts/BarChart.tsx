import { useEffect, useRef } from 'react';

interface Props {
  labels: string[];
  data:   number[];
  color:  string;
  yMin?:  number;
  height?: number;
}

export default function BarChart({ labels, data, color, yMin = 0, height = 160 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.offsetWidth || 400;
    const H = height;
    canvas.width  = W;
    canvas.height = H;
    const pad = { top: 20, right: 10, bottom: 30, left: 42 };
    const gW = W - pad.left - pad.right;
    const gH = H - pad.top  - pad.bottom;
    const max = Math.max(...data) * 1.1;
    const min = yMin;

    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + gH - (i / 4) * gH;
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + gW, y); ctx.stroke();
      ctx.fillStyle = '#555'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(min + (max - min) * (i / 4))), pad.left - 4, y + 4);
    }

    const gap = gW / data.length;
    const bW  = Math.max(3, gap * 0.65);
    data.forEach((val, i) => {
      const x  = pad.left + i * gap + gap / 2 - bW / 2;
      const bH = ((val - min) / (max - min)) * gH;
      const y  = pad.top + gH - bH;
      const grad = ctx.createLinearGradient(0, y, 0, y + bH);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + '44');
      ctx.fillStyle = grad;
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect: (...a: unknown[]) => void }).roundRect(x, y, bW, bH, 3);
      ctx.fill();
      if (i % Math.ceil(data.length / 8) === 0) {
        ctx.fillStyle = '#555'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(labels[i] ?? '', pad.left + i * gap + gap / 2, H - 6);
      }
    });
  }, [data, labels, color, yMin, height]);

  return <canvas ref={ref} style={{ display: 'block', width: '100%' }} height={height} />;
}
