import { useEffect, useRef } from 'react';

interface Series {
  data:  number[];
  color: string;
}

interface Props {
  labels: string[];
  series: Series[];
  height?: number;
}

export default function MultiLineChart({ labels, series, height = 180 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !labels.length) return;
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

    series.forEach(s => {
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth   = 2;
      s.data.forEach((v, i) => i === 0 ? ctx.moveTo(xOf(i), yOf(v)) : ctx.lineTo(xOf(i), yOf(v)));
      ctx.stroke();
    });

    const step = Math.ceil(labels.length / 8);
    labels.forEach((l, i) => {
      if (i % step === 0) {
        ctx.fillStyle = '#555'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(l, xOf(i), H - 6);
      }
    });
  }, [labels, series, height]);

  return <canvas ref={ref} style={{ display: 'block', width: '100%' }} height={height} />;
}
