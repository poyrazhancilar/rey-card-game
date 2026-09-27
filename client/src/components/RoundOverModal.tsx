import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { ClientGameState } from '../types/game';
import { CardView } from './CardView';
import { Trophy, ArrowRight, RotateCcw, Crown, Flame } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface RoundOverModalProps {
  gameState: ClientGameState;
  myPlayerId: string;
  onNextRound: () => void;
  onRestartGame: () => void;
}

export const RoundOverModal: React.FC<RoundOverModalProps> = ({
  gameState,
  myPlayerId,
  onNextRound,
  onRestartGame,
}) => {
  const isGameOver = gameState.phase === 'game_over';
  const me = gameState.players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost || false;
  const results = gameState.roundResults;

  useEffect(() => {
    sound.playVictory();
    // Fire confetti bursts!
    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  if (!results) return null;

  const winner = gameState.players.find((p) => p.id === results.winnerId);
  const partiChampion = gameState.players.slice().sort((a, b) => b.score - a.score)[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto select-none">
      <div className="bg-[#16271e] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative text-center text-[#e6f4ea]">
        {/* Trophy & Title */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#24170d]/85 border-2 border-[#b45309]/60 flex items-center justify-center text-amber-300 mb-3 shadow-[0_4px_20px_rgba(245,158,11,0.25)]">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 font-['Comfortaa',sans-serif]">
            {isGameOver ? '🏆 PARTİ ŞAMPİYONU BELİRLENDİ!' : `EL ${gameState.handNumber || 1} TAMAMLANDI!`}
          </h2>
          <p className="text-sm text-[#d5e4da] mt-1">
            {isGameOver ? (
              <span className="font-bold text-amber-200">
                🎉 {partiChampion?.name} 3 el sonucunda en yüksek skorla ({partiChampion?.score} puan) Partiyi kazandı!
              </span>
            ) : winner ? (
              <span className="font-semibold text-emerald-300">
                🎉 {winner.name} bu eli kazandı!
              </span>
            ) : (
              'Tüm kartlar açıldı!'
            )}
          </p>
        </div>

        {/* Player Hands & Score Breakdown */}
        <div className="flex flex-col gap-3.5 mb-7 text-left">
          {results.scores.map((scoreItem) => {
            const player = gameState.players.find((p) => p.id === scoreItem.playerId);
            const isMe = scoreItem.playerId === myPlayerId;
            const isWinner = scoreItem.playerId === results.winnerId;

            return (
              <div
                key={scoreItem.playerId}
                className={`p-4 rounded-2xl border transition ${
                  isWinner
                    ? 'bg-[#241a10]/75 border-amber-500/60 shadow-md ring-1 ring-amber-400/40'
                    : isMe
                    ? 'bg-[#15251c]/75 border-[#2b4737]'
                    : 'bg-[#121f17]/75 border-[#233a2c]'
                }`}
              >
                {/* Player header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{player?.avatar || '🌱'}</span>
                    <div>
                      <span className="font-bold text-[#e6f4ea] text-base">
                        {scoreItem.name} {isMe && '(Sen)'}
                      </span>
                      {scoreItem.isKamikaze && (
                        <span className="ml-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse flex-inline items-center gap-1">
                          <Flame className="w-3 h-3 inline" /> KAMİKAZE
                        </span>
                      )}
                      {results.winType === 'rey' && results.caboCallerId === scoreItem.playerId && (
                        <span className="ml-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40">
                          <Crown className="w-3 h-3 inline mr-0.5" /> REY ÇAĞRISI
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score pills */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-[#9db6a5] block">
                        Bu Eldeki Skor
                      </span>
                      <span className={`text-base sm:text-lg font-black ${scoreItem.roundScore >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                        {scoreItem.roundScore >= 0 ? `+${scoreItem.roundScore}` : scoreItem.roundScore}
                      </span>
                    </div>
                    <div className="text-right pl-3 border-l border-[#2d4d3a]">
                      <span className="text-[10px] uppercase tracking-wider text-[#9db6a5] block">
                        Toplam Parti Skoru
                      </span>
                      <span className="text-base sm:text-lg font-black text-emerald-300">
                        {scoreItem.totalScore}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hand cards display */}
                <div className="flex flex-wrap gap-2 items-center pt-2.5 border-t border-[#264433]">
                  {scoreItem.cardValues.map((val: number, cIdx: number) => (
                    <CardView
                      key={cIdx}
                      value={val}
                      ability="none"
                      name={`Kart ${val}`}
                      isFaceUp={true}
                      size="sm"
                    />
                  ))}
                  <div className="text-xs text-[#9db6a5] ml-auto font-mono">
                    El Toplamı: {scoreItem.cardValues.join(' + ')} ={' '}
                    <strong className="text-[#e6f4ea]">{scoreItem.sum}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isGameOver ? (
            isHost ? (
              <button
                type="button"
                onClick={onRestartGame}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition text-base active:scale-95 border border-amber-200/50"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Yeni Parti Başlat (3 El)</span>
              </button>
            ) : (
              <div className="text-sm text-[#9db6a5] animate-pulse">
                Parti bitti! Kurucunun yeni parti başlatması bekleniyor...
              </div>
            )
          ) : isHost ? (
            <button
              type="button"
              onClick={onNextRound}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition text-base active:scale-95 border border-emerald-300/40"
            >
              <span>{(gameState.handNumber || 1) + 1}. Ele Geç ({(gameState.handNumber || 1) + 1}/3)</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="text-sm text-amber-200 font-semibold animate-pulse">
              Kurucunun {(gameState.handNumber || 1) + 1}. Eli başlatması bekleniyor...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
