import React, { useEffect, useRef } from 'react';
import { Opponent } from '../types';

interface ArenaThumbnailsProps {
  opponents: Opponent[];
}

export const ArenaThumbnails: React.FC<ArenaThumbnailsProps> = ({ opponents }) => {
  return (
    <div id="arena-opponents-grid" className="glass rounded-3xl p-5 text-slate-800 w-full flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-white/25 pb-1.5 mb-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-pink-700 font-display">Live Opponent Feeds</h3>
        <span className="text-[10px] text-slate-500 font-mono">Simulated battle grid</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {opponents.map(opponent => (
          <ArenaThumbnailItem key={opponent.id} opponent={opponent} />
        ))}
      </div>
    </div>
  );
};

interface ArenaThumbnailItemProps {
  opponent: Opponent;
}

const ArenaThumbnailItem: React.FC<ArenaThumbnailItemProps> = ({ opponent }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear background - cute translucent pastel pink/warm tone matching the mesh
    ctx.fillStyle = '#ffe4e6'; 
    ctx.fillRect(0, 0, w, h);

    const isDead = opponent.status === 'dead';

    if (isDead) {
      // Draw dead grid skeleton look
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; // faint red tint
      ctx.fillRect(0, 0, w, h);

      // Draw standard bucket outline
      ctx.strokeStyle = '#e11d48'; // crimson boundary
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(6, 4);
      ctx.lineTo(6, h - 5);
      ctx.lineTo(w - 6, h - 5);
      ctx.lineTo(w - 6, 4);
      ctx.stroke();

      // Draw cross of death
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(8, 8);
      ctx.lineTo(w - 8, h - 8);
      ctx.moveTo(w - 8, 8);
      ctx.lineTo(8, h - 8);
      ctx.stroke();

      // Giant skull or "K.O." in the middle
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('K.O.', w / 2, h / 2);
    } else {
      // 1. Draw danger pulse background if overflowing
      if (opponent.topLineFactor > 0.75) {
        ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + Math.sin(Date.now() / 100) * 0.05})`;
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Draw bucket boundaries
      ctx.strokeStyle = opponent.topLineFactor > 0.75 
        ? '#ef4444' // solid red
        : '#f43f5e'; // rose pink boundary lines
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(6, 4);
      ctx.lineTo(6, h - 5);
      ctx.lineTo(w - 6, h - 5);
      ctx.lineTo(w - 6, 4);
      ctx.stroke();

      // 3. Draw danger warning line near the top index
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(6, 12);
      ctx.lineTo(w - 6, 12);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // 4. Draw simulated stacked physical circles representing fruits
      opponent.gridFruits.forEach(circle => {
        // Map original coordinate scale (e.g., width 420, height 600) to miniature thumbnail
        const mappedX = 6 + (circle.x / 420) * (w - 12);
        const mappedY = 4 + (circle.y / 600) * (h - 9);
        const mappedR = Math.max(1.5, (circle.r / 420) * (w - 12));

        // Draw circles
        ctx.fillStyle = circle.color;
        ctx.beginPath();
        ctx.arc(mappedX, mappedY, mappedR, 0, Math.PI * 2);
        ctx.fill();

        // Shiny glow on the bubble
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.arc(mappedX - mappedR / 3, mappedY - mappedR / 3, mappedR / 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Draw active glowing outline for merging triggers
      if (opponent.topLineFactor > 0.75) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);
      }
    }
  }, [opponent]);

  return (
    <div className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all duration-300 ${
      opponent.status === 'dead'
        ? 'bg-rose-500/5 border-rose-900/10 opacity-70'
        : opponent.topLineFactor > 0.75
        ? 'bg-red-500/10 border-red-500/55 shadow-[0_0_8px_rgba(239,68,68,0.15)] animate-pulse'
        : 'bg-white/15 border-white/25 hover:border-white/45'
    }`}>
      {/* Mini Title Banner */}
      <div className="flex items-center gap-1 w-full justify-between select-none">
        <span className="text-[10px] font-bold text-slate-800 truncate max-w-[48px]">
          {opponent.name.split(' ')[0]}
        </span>
        <span className="text-[9px] font-black text-pink-700 font-mono">
          {opponent.score >= 1000 ? `${(opponent.score / 1000).toFixed(1)}k` : opponent.score}
        </span>
      </div>

      {/* Embedded Miniature Board */}
      <div className="relative rounded-lg overflow-hidden border border-white/40 shadow-inner">
        <canvas
          ref={canvasRef}
          width={64}
          height={80}
          className="block bg-rose-50"
        />
        {opponent.topLineFactor > 0.75 && opponent.status === 'alive' && (
          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
        )}
      </div>

      {/* Badge representation */}
      <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-500 font-mono select-none">
        {opponent.status === 'dead' ? '💀 ELIM' : 'LIVE'}
      </span>
    </div>
  );
};
