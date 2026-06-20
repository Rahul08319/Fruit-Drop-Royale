import React from 'react';
import { FRUITS } from '../types';

interface FruitLegendProps {
  currentNextId: number;
}

export const FruitLegend: React.FC<FruitLegendProps> = ({ currentNextId }) => {
  const nextFruit = FRUITS[currentNextId];

  return (
    <div id="fruit-legend-container" className="glass rounded-3xl p-5 text-white w-full flex flex-col gap-4">
      {/* Next Bubble Dropper Preview */}
      <div className="flex items-center gap-4 bg-white/10 border border-white/20 rounded-2xl p-4 transition-all duration-300">
        <div id="next-preview-box" className="relative flex items-center justify-center w-14 h-14 rounded-xl bg-white/20 border border-white/30 shadow-inner">
          <span className="text-3xl animate-bounce" style={{ animationDuration: '2.5s' }}>
            {nextFruit?.emoji}
          </span>
          <div className="absolute -top-2.5 -right-2 bg-pink-500 text-[10px] uppercase tracking-wider font-extrabold text-white px-2 py-0.5 rounded-full shadow-md">
            Next
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-white/70 font-medium">To Drop</span>
          <span className="text-base font-black text-rose-500 font-display">{nextFruit?.name}</span>
          <span className="text-[10px] font-mono text-white/80">Value: +{nextFruit?.scoreValue} pts</span>
        </div>
      </div>

      {/* Evolution Order */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-white/25 pb-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-pink-600 font-display">Evolution Path</h3>
          <span className="text-[10px] text-white/70 font-mono">Merge items to grow</span>
        </div>

        <div id="evolution-list" className="flex flex-col gap-1.5 max-h-[340px] overflow-y-auto pr-1 select-none scrollbar-thin">
          {FRUITS.map((fruit, idx) => {
            const isLast = idx === FRUITS.length - 1;
            return (
              <div
                key={fruit.id}
                className="group flex items-center justify-between p-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/15 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  {/* Circle outline with fruit color */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${fruit.gradientColors[0]}, ${fruit.gradientColors[1]})`,
                      boxShadow: `0 2px 8px ${fruit.color}30`
                    }}
                  >
                    {fruit.emoji}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800">{fruit.name}</span>
                    <span className="text-[10px] font-mono text-white/70">Level {idx + 1}</span>
                  </div>
                </div>

                {!isLast && (
                  <div className="flex items-center gap-1.5 text-xs text-white/50 font-semibold font-mono">
                    <span>➔</span>
                    <span className="text-[11px] text-white/80">{FRUITS[idx + 1].emoji}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Helpful Quick Tip */}
      <div className="bg-white/10 border border-white/20 rounded-xl p-3 text-[11px] text-slate-800 leading-relaxed font-sans">
        <span className="text-rose-600 font-bold block mb-0.5">🧠 Physics Tip:</span>
        Fruit shapes matter! Bananas <span className="text-yellow-600">🍌</span> are elongated and wobble/slide, while Pineapples <span className="text-amber-600">🍍</span> catch on each other. Use small Cherries <span className="text-red-500">🍒</span> to trigger chains!
      </div>
    </div>
  );
};
