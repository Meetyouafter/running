import { useEffect, useState } from 'react';

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHiding(true), 2500);
    const t2 = setTimeout(() => onDone(), 3050);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`splash-overlay${hiding ? ' hiding' : ''}`}>
      <div className="splash-scanline" />
      <div className="splash-text">кто сдох — тот лох</div>
      <div className="splash-sub">👟 значит, беги</div>
      <div className="splash-bar" />
    </div>
  );
}
