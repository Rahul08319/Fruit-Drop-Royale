import React from 'react';
import { Opponent } from '../types';
import { Award, Skull, Flame, Trophy } from 'lucide-react';

interface LeaderboardProps {
  opponents: Opponent[];
  playerScore: number;
  playerRank: number;
  playerAlive: boolean;
  onRestartClick?: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  opponents,
  playerScore,
  playerRank,
  playerAlive,
  onRestartClick
}) => {
  // Combine user and opponents to create a unified scoreboard sorted by score
  const allPlayers = [
    {
      id: 'player',
      name: 'You (Challenger)',
      avatar: '👑',
      color: '#00F2FE',
      score: playerScore,
      status: playerAlive ? 'alive' as const : 'dead' as const,
      isUser: true,
      topLineFactor: 0, // dynamic client-side tracked in main canvas
    },
    ...opponents.map(o => ({
      id: o.id,
      name: o.name,
      avatar: o.avatar,
      color: o.color,
      score: o.score,
      status: o.status,
      isUser: false,
      topLineFactor: o.topLineFactor,
    }))
  ];

  // Sort: alive players on top sorted by score, then dead players sorted by when they were eliminated / score
  const sortedPlayers = [...allPlayers].sort((a, b) => {
    if (a.status === 'alive' && b.status === 'dead') return -1;
    if (a.status === 'dead' && b.status === 'alive') return 1;
    return b.score - a.score;
  });

  const aliveCount = allPlayers.filter(p => p.status === 'alive').length;

  return (
    <div id="leaderboard-panel" className="glass rounded-3xl p-5 text-slate-800 w-full flex flex-col gap-4">
      {/* Royale Status Header */}
      <div className="flex items-center justify-between bg-white/25 border border-white/40 rounded-2xl p-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-pink-600 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-pink-700">Royale Status</span>
          </div>
          <span className="text-2xl font-black text-slate-900 font-mono">
            {aliveCount} <span className="text-sm text-slate-600 font-medium">/ 10 Alive</span>
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Your Rank</span>
          <span className="text-2xl font-black text-pink-600 font-mono flex items-center gap-1">
            #{playerRank}
            {playerRank === 1 && <Trophy className="w-5 h-5 text-amber-500 fill-amber-500" />}
          </span>
        </div>
      </div>

      {/* Players List */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-white/25 pb-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-pink-700 font-display">Survival Standings</h3>
          <span className="text-[10px] text-slate-500 font-mono">Real-time stats</span>
        </div>

        <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
          {sortedPlayers.map((player, index) => {
            const isEliminated = player.status === 'dead';
            const place = index + 1;

            return (
              <div
                key={player.id}
                className={`relative flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300 ${
                  player.isUser
                    ? 'bg-pink-500/15 border-pink-500/40 shadow-[0_0_12px_rgba(236,72,153,0.15)] ring-1 ring-pink-550/20'
                    : isEliminated
                    ? 'bg-white/5 border-white/10 opacity-60'
                    : 'bg-white/10 border-white/15 hover:border-white/35'
                }`}
              >
                {/* Danger overlay indicator */}
                {!isEliminated && player.topLineFactor > 0.7 && (
                  <div className="absolute inset-0 bg-red-500/5 border border-red-500/25 rounded-xl pointer-events-none animate-pulse" />
                )}

                <div className="flex items-center gap-3">
                  {/* Rank Position */}
                  <div className="w-5 text-center text-xs font-black font-mono text-slate-600">
                    {place}
                  </div>

                  {/* Character Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-sm border border-white/30 bg-white/20"
                    style={player.isUser ? { borderColor: '#ec4899' } : {}}
                  >
                    {isEliminated ? '💀' : player.avatar}
                  </div>

                  {/* Name and Danger meter */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-semibold truncate max-w-[110px] ${player.isUser ? 'text-pink-700 font-black' : 'text-slate-800'}`}>
                        {player.name}
                      </span>
                      {player.isUser && (
                        <span className="text-[9px] bg-pink-500/20 text-pink-600 font-extrabold px-1 py-0.2 rounded uppercase">
                          You
                        </span>
                      )}
                    </div>
                    {!isEliminated && player.topLineFactor > 0.5 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-12 h-1 bg-white/30 rounded-full overflow-hidden">
                          <div
                            className="bg-red-500 h-full animate-pulse"
                            style={{ width: `${Math.min(player.topLineFactor * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-[8px] uppercase tracking-wider text-red-650 font-extrabold animate-pulse">
                          Danger!
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Score & Status */}
                <div className="flex flex-col items-end gap-0.5 font-mono">
                  <span className={`text-sm font-bold ${isEliminated ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {player.score.toLocaleString()}
                  </span>
                  {isEliminated ? (
                    <span className="text-[9px] text-slate-400 font-extrabold flex items-center gap-0.5 uppercase">
                      ELIMINATED
                    </span>
                  ) : (
                    <span className={`text-[9px] font-extrabold px-1 rounded uppercase ${
                      player.topLineFactor > 0.7 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-white/20 text-slate-600'
                    }`}>
                      {player.topLineFactor > 0.7 ? '危 CRITICAL' : '✓ SURVIVING'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

