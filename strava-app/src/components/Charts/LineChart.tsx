import { useEffect, useRef } from 'react';

interface Props {
  labels:  string[];
  data:    number[];
  color:   string;
  yMin?:   number;
  height?: number;
}

export default function LineChart({ labels, data, color, yMin = 0, height = 140 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || data.length < 2) return;
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
      ctx.fillStyle = '#555'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(min + (max - min) * (i / 4))), pad.left - 4, y + 4);
    }

    const xOf = (i: number) => pad.left + (i / (data.length - 1)) * gW;
    const yOf = (v: number) => pad.top + gH - ((v - min) / (max - min)) * gH;

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

    const step = Math.ceil(data.length / 8);
    data.forEach((_, i) => {
      if (i % step === 0) {
        ctx.fillStyle = '#555'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(labels[i] ?? '', xOf(i), H - 6);
      }
    });
  }, [data, labels, color, yMin, height]);

  return <canvas ref={ref} style={{ display: 'block', width: '100%' }} height={height} />;
}
