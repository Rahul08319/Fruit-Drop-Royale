import React, { useState, useEffect } from 'react';
import { GameMode, GameState, Opponent, LocalScore, FRUITS } from './types';
import { GameCanvas } from './components/GameCanvas';
import { FruitLegend } from './components/FruitLegend';
import { Leaderboard } from './components/Leaderboard';
import { ArenaThumbnails } from './components/ArenaThumbnails';
import { synths } from './utils/audio';
import { 
  Trophy, 
  Flame, 
  Play, 
  Crown, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Sparkles, 
  Heart, 
  ShieldCheck, 
  Info,
  Gift,
  HelpCircle,
  Video,
  ListOrdered
} from 'lucide-react';

export default function App() {
  // Modes & states
  const [mode, setMode] = useState<GameMode>('royale');
  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState<number>(0);
  const [nextFruitId, setNextFruitId] = useState<number>(0);

  // Scores persistence
  const [classicBest, setClassicBest] = useState<number>(0);
  const [royaleBest, setRoyaleBest] = useState<number>(0);
  const [recentScores, setRecentScores] = useState<LocalScore[]>([]);

  // Sound effects & music toggles
  const [musicEnabled, setMusicEnabled] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Live Royale tournament lists
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [playerRank, setPlayerRank] = useState<number>(10);
  const [eliminationToasts, setEliminationToasts] = useState<string[]>([]);

  // Load scores
  useEffect(() => {
    const cBest = localStorage.getItem('fruit_drop_classic_best');
    const rBest = localStorage.getItem('fruit_drop_royale_best');
    const recents = localStorage.getItem('fruit_drop_recent_scores');

    if (cBest) setClassicBest(parseInt(cBest));
    if (rBest) setRoyaleBest(parseInt(rBest));
    if (recents) {
      try {
        setRecentScores(JSON.parse(recents));
      } catch (e) {
        console.warn(e);
      }
    }
  }, []);

  // Update real-time rank during play
  const handleScoreUpdate = (newScore: number) => {
    setScore(newScore);

    // Re-evaluate rank
    if (mode === 'royale' && opponents.length > 0) {
      const activeScoreList = [
        newScore,
        ...opponents.filter(o => o.status === 'alive').map(o => o.score)
      ];
      activeScoreList.sort((a, b) => b - a);
      const rank = activeScoreList.indexOf(newScore) + 1;
      setPlayerRank(Math.max(1, rank));
    }
  };

  // Sync simulated opponents array
  const handleOpponentsUpdate = (updatedOpponents: Opponent[]) => {
    setOpponents(updatedOpponents);

    // Watch for new eliminations to show on-screen announcements
    updatedOpponents.forEach(opp => {
      const existing = opponents.find(old => old.id === opp.id);
      if (existing && existing.status === 'alive' && opp.status === 'dead') {
        triggerElimToast(`💥 Opponent ${opp.name} topped out!`);
        synths.playDangerTick(); // quick shake trigger chime
      }
    });

    // Re-evaluate rank with latest scores
    const activeScoreList = [
      score,
      ...updatedOpponents.filter(o => o.status === 'alive').map(o => o.score)
    ];
    activeScoreList.sort((a, b) => b - a);
    const rank = activeScoreList.indexOf(score) + 1;
    setPlayerRank(Math.max(1, rank));
  };

  // Safe toast stack triggers
  const triggerElimToast = (msg: string) => {
    setEliminationToasts((prev) => [...prev, msg]);
    setTimeout(() => {
      setEliminationToasts((prev) => prev.slice(1));
    }, 3200);
  };

  // Music trigger controls
  const toggleMusic = () => {
    if (musicEnabled) {
      synths.stopMusic();
      setMusicEnabled(false);
    } else {
      synths.startMusic();
      setMusicEnabled(true);
    }
  };

  const toggleSound = () => {
    const muted = synths.toggleMute();
    setIsMuted(muted);
  };

  // Game over state triggers
  const handleGameOver = () => {
    // Record scores
    const newRecord: LocalScore = {
      name: mode === 'royale' ? `Royale Tournament #${playerRank}` : 'Classic Solo',
      score,
      mode,
      date: new Date().toLocaleDateString()
    };

    const updated = [newRecord, ...recentScores].slice(0, 5);
    setRecentScores(updated);
    localStorage.setItem('fruit_drop_recent_scores', JSON.stringify(updated));

    if (mode === 'classic') {
      if (score > classicBest) {
        setClassicBest(score);
        localStorage.setItem('fruit_drop_classic_best', score.toString());
      }
      setGameState('gameover');
    } else {
      if (score > royaleBest) {
        setRoyaleBest(score);
        localStorage.setItem('fruit_drop_royale_best', score.toString());
      }
      
      // If we survived until we are number 1, it's VICTORY ROYALE!
      if (playerRank === 1) {
        setGameState('victory');
        synths.playVictorySound();
      } else {
        setGameState('gameover');
        synths.playGameOverSound();
      }
    }
  };

  const startGame = () => {
    // Stop prior audio context holds
    if (musicEnabled) {
      synths.stopMusic();
      synths.startMusic();
    }
    setScore(0);
    setPlayerRank(10);
    setGameState('playing');
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-800 flex flex-col font-sans select-none relative overflow-hidden">
      
      {/* Decorative ambient Frosted Glass mesh background circles */}
      <div className="absolute top-[-100px] left-[-100px] w-[450px] h-[450px] rounded-full bg-[#ff758c] blur-[90px] opacity-60 pointer-events-none" />
      <div className="absolute bottom-[-50px] right-[-50px] w-[550px] h-[550px] rounded-full bg-[#ff7eb3] blur-[110px] opacity-55 pointer-events-none" />

      {/* Primary Top Header Navigation */}
      <header className="border-b border-white/30 bg-white/15 backdrop-blur-md px-6 py-4 mx-auto w-full z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 p-0.5 flex items-center justify-center shadow-lg">
            <div className="w-full h-full rounded-[10px] bg-white/40 backdrop-blur-xs flex items-center justify-center text-xl">
              🍇
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight text-slate-900 font-display flex items-center gap-1.5 leading-none">
              FRUIT DROP <span className="bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">ROYALE</span>
            </h1>
            <span className="text-[10px] uppercase font-mono tracking-widest text-pink-700 font-bold mt-0.5">Procedural Physics Merge Battle</span>
          </div>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMusic}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
              musicEnabled
                ? 'bg-pink-500/15 border-pink-500/40 text-pink-700'
                : 'bg-white/20 border-white/30 text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎵 Music: {musicEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl text-xs transition-all border cursor-pointer ${
              isMuted
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-700'
                : 'bg-white/20 border-white/30 text-slate-600 hover:text-slate-900'
            }`}
            title="Toggle game sound effects"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-center" /> : <Volume2 className="w-4 h-4 text-center" />}
          </button>
        </div>
      </header>

      {/* Main Container Core Router */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col justify-center items-center z-10">

        {/* MENU STATE VIEW */}
        {gameState === 'menu' && (
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 items-start mt-4 animate-fade-in">
            {/* Left Main Banner Intro Block */}
            <div className="md:col-span-7 flex flex-col gap-6">
              <div className="glass rounded-3xl p-6 md:p-8 flex flex-col gap-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-pink-500/10 blur-[40px] pointer-events-none" />
                
                <div className="flex items-center gap-2 bg-white/30 self-start px-3 py-1 rounded-full border border-white/45 text-xs font-bold text-pink-700">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Version 1.2.0 - Physics Enabled</span>
                </div>

                <div className="flex flex-col gap-2">
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-display text-slate-900">
                    Drop. Wobble. <span className="bg-gradient-to-r from-pink-600 to-rose-650 bg-clip-text text-transparent">Merge!</span>
                  </h2>
                  <p className="text-sm text-slate-800 font-medium leading-relaxed max-w-lg">
                    Welcome to the ultimate fruit stacking showdown! Drop vibrant, adorable cartoon fruits into the container. Experience lifelike physics—bananas wobble, strawberries slide, and pineapples mesh. Connect matching pairs to expand them all the way to a giant Melon!
                  </p>
                </div>

                {/* Mode Select Tabs */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500 font-mono">Select Battle Rule:</span>
                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* Royale Tab */}
                    <button
                      onClick={() => setMode('royale')}
                      className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-300 relative cursor-pointer group ${
                        mode === 'royale'
                          ? 'bg-pink-500/15 border-pink-500/60 shadow-[0_0_15px_rgba(236,72,153,0.15)] ring-1 ring-pink-500/25'
                          : 'bg-white/10 border-white/20 hover:border-white/30'
                      }`}
                    >
                      <div className="absolute top-3 right-3 text-lg">👑</div>
                      <span className={`text-base font-black font-display ${mode === 'royale' ? 'text-pink-750' : 'text-slate-800'}`}>
                        Royale Tournament
                      </span>
                      <span className="text-xs text-slate-700 mt-1 leading-snug">
                        Compete in real-time against 9 simulated AI players. Be the last survivor remaining without topping out!
                      </span>
                    </button>

                    {/* Classic Tab */}
                    <button
                      onClick={() => setMode('classic')}
                      className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-300 relative cursor-pointer group ${
                        mode === 'classic'
                          ? 'bg-pink-500/15 border-pink-500/60 shadow-[0_0_15px_rgba(236,72,153,0.15)] ring-1 ring-pink-500/25'
                          : 'bg-white/10 border-white/20 hover:border-white/30'
                      }`}
                    >
                      <div className="absolute top-3 right-3 text-lg">🧘</div>
                      <span className={`text-base font-black font-display ${mode === 'classic' ? 'text-pink-750' : 'text-slate-800'}`}>
                        Classic Solo
                      </span>
                      <span className="text-xs text-slate-700 mt-1 leading-snug">
                        Relaxed single player gameplay. Take your time to merge fruits, chase clean combos and hit high scores.
                      </span>
                    </button>

                  </div>
                </div>

                {/* Primary CTA Play Button */}
                <button
                  onClick={startGame}
                  className="w-full mt-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-450 text-white font-black text-xl py-4.5 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:shadow-pink-500/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Play className="w-6 h-6 fill-white stroke-none" />
                  <span>START BATTLE ({mode === 'royale' ? 'ROYALE' : 'SOLO'})</span>
                </button>

              </div>
            </div>

            {/* Right Leaderboard stats history info panel */}
            <div className="md:col-span-5 flex flex-col gap-6">
              
              {/* Profile Best Scores */}
              <div className="glass rounded-3xl p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-pink-700 font-display">Personal Records</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/20 border border-white/30 p-3.5 rounded-2xl flex flex-col">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-black">Solo Best</span>
                    <span className="text-2xl font-black text-slate-900 font-mono mt-1">
                      {classicBest.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-600 mt-0.5 font-bold">High score points</span>
                  </div>
                  <div className="bg-white/20 border border-white/30 p-3.5 rounded-2xl flex flex-col">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-black">Royale Best</span>
                    <span className="text-2xl font-black text-pink-600 font-mono mt-1">
                      {royaleBest.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-600 mt-0.5 font-bold">Record survivor score</span>
                  </div>
                </div>
              </div>

              {/* Match History logs */}
              <div className="glass rounded-3xl p-5 flex flex-col gap-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-pink-700 font-display flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-pink-600" />
                  Recent Battles
                </h3>

                {recentScores.length === 0 ? (
                  <div className="text-center p-6 bg-white/10 rounded-2xl border border-white/20 text-slate-600 text-xs font-bold">
                    No recent games completed yet. Start your first match!
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1 scrollbar-thin">
                    {recentScores.map((scoreLog, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-white/20 border border-white/25 rounded-xl text-xs text-slate-850">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🏆</span>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{scoreLog.name}</span>
                            <span className="text-[9px] text-slate-500 font-mono uppercase">{scoreLog.mode} mode</span>
                          </div>
                        </div>
                        <span className="font-black font-mono text-pink-600">{scoreLog.score.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cute Interactive Game Guide Details */}
              <div className="glass rounded-3xl p-5 flex flex-col gap-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-pink-700 font-display flex items-center gap-2">
                  <span className="text-base font-emoji">🍇</span>
                  Physics Fruit List
                </h3>
                <div className="grid grid-cols-5 gap-2.5 text-center">
                  {FRUITS.slice(0, 5).map(f => (
                    <div key={f.id} className="p-1.5 bg-white/15 border border-white/20 rounded-xl hover:scale-105 transition-transform" title={`${f.name} (Lvl ${f.id+1})`}>
                      <span className="text-xl block">{f.emoji}</span>
                      <span className="text-[9px] font-bold text-slate-800 select-none block truncate mt-1">{f.name}</span>
                    </div>
                  ))}
                  {FRUITS.slice(5, 10).map(f => (
                    <div key={f.id} className="p-1.5 bg-white/15 border border-white/20 rounded-xl hover:scale-105 transition-transform" title={`${f.name} (Lvl ${f.id+1})`}>
                      <span className="text-xl block">{f.emoji}</span>
                      <span className="text-[9px] font-bold text-slate-800 select-none block truncate mt-1">{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ACTIVE PLAYING GAMESTATE */}
        {gameState === 'playing' && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2">
            
            {/* Left Side: Bento-Style Evolution Legend Guide */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="glass rounded-3xl p-4 flex justify-between items-center select-none mb-1 text-slate-800">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-black">Total Score</span>
                  <span className="text-2xl font-black text-pink-700 font-mono mt-0.5">
                    {score.toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => setGameState('menu')}
                  className="px-3.5 py-1.5 text-xs text-slate-800 hover:text-red-700 bg-white/30 hover:bg-white/50 border border-white/40 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Give Up
                </button>
              </div>

              <FruitLegend currentNextId={nextFruitId} />
            </div>

            {/* Center: Interactive Main Physics Canvas Column */}
            <div className="lg:col-span-5 flex flex-col justify-center items-center">
              <GameCanvas
                mode={mode}
                gameState={gameState}
                onScoreUpdate={handleScoreUpdate}
                onGameOver={handleGameOver}
                onOpponentsUpdate={handleOpponentsUpdate}
                onNextFruitSelection={(idx) => setNextFruitId(idx)}
                playerRank={playerRank}
              />
            </div>

            {/* Right Side Column (Royale battle simulation details vs Classic) */}
            <div className="lg:col-span-4 flex flex-col gap-5 w-full">
              {mode === 'royale' ? (
                <>
                  <Leaderboard
                    opponents={opponents}
                    playerScore={score}
                    playerRank={playerRank}
                    playerAlive={true}
                  />
                  <ArenaThumbnails opponents={opponents} />
                </>
              ) : (
                 <div className="glass rounded-3xl p-6 flex flex-col gap-5 text-slate-800">
                  <div className="border-b border-white/20 pb-2 flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wider text-pink-700 font-display">Classic Solo Stacking</h3>
                    <span className="text-[10px] font-mono text-slate-600 font-bold">High Scores Goal</span>
                  </div>

                  <div className="flex flex-col gap-3 bg-white/20 p-4 rounded-2xl border border-white/30">
                    <span className="text-[11px] text-slate-700 leading-relaxed font-sans font-medium">
                      Enjoy tranquil stacking controls. There are no competitor actions. Perfect your drops to trigger high-impact merge cascades. Work towards generating the supreme Melon 🍉!
                    </span>
                    <div className="flex items-center justify-between mt-1 text-xs">
                      <span className="text-slate-650 font-black">Your Solo High Score:</span>
                      <span className="font-extrabold text-pink-700 font-mono text-sm">{classicBest.toLocaleString()} pts</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-pink-750 font-display">Cascade Combo Multipliers</h4>
                    <div className="text-xs text-slate-700 font-medium leading-relaxed flex flex-col gap-1.5 mt-1">
                      <div className="flex justify-between border-b border-white/10 pb-1">
                        <span>1x Merge Drop</span>
                        <span className="text-slate-650 font-mono font-bold">Base Score</span>
                      </div>
                      <div className="flex justify-between border-b border-white/10 pb-1">
                        <span>2x Combos Link</span>
                        <span className="text-pink-600 font-mono font-black">+10% Bonus</span>
                      </div>
                      <div className="flex justify-between border-b border-white/10 pb-1">
                        <span>3x Combos Chain</span>
                        <span className="text-pink-750 font-mono font-black">+25% Bonus</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span>4x+ Extreme Burst</span>
                        <span className="text-rose-650 font-mono font-black">+40% Big Squeeze!</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* OVERLAY GAME OVER / VICTORY BANNER SCREENS */}
        {(gameState === 'gameover' || gameState === 'victory') && (
          <div id="results-overlay" className="fixed inset-0 z-50 bg-white/20 backdrop-blur-md flex items-center justify-center p-4">
            
            <div className="glass p-6 md:p-8 w-full max-w-md text-center flex flex-col gap-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-pink-500 to-rose-500" />

              {gameState === 'victory' ? (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center animate-bounce">
                    <Crown className="w-10 h-10 text-pink-600 fill-pink-500/30" />
                  </div>
                  <h2 className="text-3xl font-black font-display text-pink-750">
                    VICTORY ROYALE!
                  </h2>
                  <p className="text-xs text-slate-750 font-bold mt-1">
                    Outstanding stacking skills! You survived the tournament heat and triumphed as the undefeated #1 Fruit Master!
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto w-14 h-14 rounded-full bg-rose-550/10 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-rose-600" />
                  </div>
                  <h2 className="text-3xl font-black font-display text-pink-700">
                    BASKET OVERFLOWED!
                  </h2>
                  <p className="text-xs text-slate-750 font-bold mt-1">
                    Your container filled past the danger boundary line. Great attempt!
                  </p>
                </>
              )}

              {/* Stats Overview */}
              <div className="bg-white/25 rounded-2xl p-4.5 border border-white/35 flex flex-col gap-2 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-650 font-bold">Game Mode:</span>
                  <span className="font-extrabold uppercase text-slate-800 tracking-wider">
                    {mode === 'royale' ? 'Royale Tournament' : 'Classic Solo'}
                  </span>
                </div>
                {mode === 'royale' && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-650 font-bold">Tournament Place:</span>
                    <span className="text-[13px] font-black font-mono text-pink-600">
                      #{playerRank} Place
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs border-t border-white/20 pt-2 mt-1">
                  <span className="text-slate-650 font-bold">Your Final Score:</span>
                  <span className="text-xl font-mono font-black text-pink-700">
                    {score.toLocaleString()} pts
                  </span>
                </div>
              </div>

              {/* Action commands */}
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <button
                  onClick={startGame}
                  className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-450 text-white font-black py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 stroke-[3px]" />
                  <span>PLAY AGAIN</span>
                </button>
                <button
                  onClick={() => setGameState('menu')}
                  className="bg-white/35 hover:bg-white/50 border border-white/40 text-slate-800 font-bold py-3 rounded-xl transition-all cursor-pointer"
                >
                  MAIN MENU
                </button>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Floating Royale Alerts Toasts */}
      <div id="live-announcement-feed" className="fixed bottom-6 right-6 z-40 flex flex-col gap-2 pointer-events-none">
        {eliminationToasts.map((toast, index) => (
          <div
            key={index}
            className="glass border border-white/50 text-pink-700 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold font-mono tracking-wide animate-slide-in flex items-center gap-2"
          >
            <span className="text-base">☄️</span>
            <span>{toast}</span>
          </div>
        ))}
      </div>

      {/* Global Simple Footer credits */}
      <footer className="py-4 border-t border-white/20 text-center text-[10px] text-pink-800 font-bold select-none z-10">
        © 2026 Fruit Drop Royale Co. • Crafted with pixel-precise MatterJS rigid bodies
      </footer>

    </div>
  );
}
