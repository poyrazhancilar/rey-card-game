import React, { useState, useEffect } from 'react';
import type { Card, ClientGameState } from '../types/game';
import { CardView } from './CardView';
import { IsometricTable } from './IsometricTable';
import { Eye, Check, Brain, Sparkles, Clock } from 'lucide-react';
import { sound } from '../audio/soundEngine';
import { haptic } from '../utils/haptics';

interface InitialPeekViewProps {
  gameState: ClientGameState;
  myPlayerId: string;
  onInitialPeek: (indices: number[], callback: (peekedCards: Card[]) => void) => void;
  onConfirmInitialPeek: () => void;
}

export const InitialPeekView: React.FC<InitialPeekViewProps> = ({
  gameState,
  myPlayerId,
  onInitialPeek,
  onConfirmInitialPeek,
}) => {
  const me = gameState.players.find((p) => p.id === myPlayerId);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [peekedCards, setPeekedCards] = useState<Record<number, Card>>({});
  const [isReady, setIsReady] = useState(me?.initialPeeksDone || false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const toggleSelectSlot = (idx: number) => {
    if (isReady || Object.keys(peekedCards).length > 0) return;
    sound.playCardFlip();
    haptic('selection');

    let next: number[];
    if (selectedIndices.includes(idx)) {
      next = selectedIndices.filter((i) => i !== idx);
    } else {
      if (selectedIndices.length >= 2) return;
      next = [...selectedIndices, idx];
    }
    setSelectedIndices(next);

    // If 2 selected, trigger peek!
    if (next.length === 2) {
      onInitialPeek(next, (cards) => {
        sound.playPeek();
        haptic('power');
        setPeekedCards({
          [next[0]]: cards[0],
          [next[1]]: cards[1],
        });
      });
    }
  };

  const handleFinishPeek = () => {
    sound.playCardSnap();
    haptic('success');
    setIsReady(true);
    onConfirmInitialPeek();
  };

  // 12-second memorization timer once cards are peeked
  useEffect(() => {
    if (Object.keys(peekedCards).length === 2 && !isReady) {
      setCountdown(12);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            handleFinishPeek();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [peekedCards, isReady]);

  const totalPlayers = gameState.players.length;
  const readyPlayersCount = gameState.players.filter((p) => p.initialPeeksDone).length;

  // Table inner content
  const tableContent = (
    <>
      {/* Opponents Hands resting on table */}
      <div className="w-full flex flex-wrap items-center justify-center gap-1.5 sm:gap-6 pt-0.5 sm:pt-1">
        {gameState.players
          .filter((p) => p.id !== myPlayerId)
          .map((opp) => (
            <div
              key={opp.id}
              className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl bg-[#16271e]/90 border border-[#2d4d3a]/60 shadow-sm flex flex-col items-center backdrop-blur-xs"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm sm:text-lg">{opp.avatar}</span>
                <span className="font-bold text-[11px] sm:text-xs text-[#e6f4ea]">{opp.name}</span>
                {opp.initialPeeksDone && (
                  <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold">✓ Hazır</span>
                )}
              </div>
              <div className="flex gap-1 min-[390px]:gap-1.5 sm:gap-2">
                {[0, 1, 2, 3].map((cIdx) => (
                  <CardView key={cIdx} isFaceUp={false} size="sm" />
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Center Instructions */}
      <div className="flex flex-col items-center text-center my-1.5 sm:my-3">
        <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#24170d]/85 border border-[#b45309]/60 text-amber-200 text-[10px] sm:text-xs font-extrabold mb-1 shadow-sm backdrop-blur-xs">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>🌱 Aşağıdan gizlice bakıp ezberlemek istediğin 2 kartını seç</span>
        </div>
        <p className="text-[10px] sm:text-xs text-[#9db6a5] max-w-sm">
          Seçtiğin 2 kartı dikkatlice aklında tut, ardından "Ezberledim! (Hazırım)" butonuna bas.
        </p>
      </div>

      {/* Player's 4 Cards resting in slots on the felt - SIDE-BY-SIDE IN 1 ROW */}
      <div className="w-full flex flex-col items-center pb-1">
        <div className="flex items-center gap-1.5 px-3 py-0.5 sm:py-1 rounded-full bg-[#1b2d23]/85 border border-[#446d54]/70 mb-1 sm:mb-2 shadow-sm text-[10px] sm:text-xs font-bold text-amber-200 backdrop-blur-xs">
          <span>{me?.avatar || '🌱'}</span>
          <span>{me?.name} (Senin Kartların)</span>
        </div>

        <div className="w-full max-w-[360px] sm:max-w-[430px] p-2 sm:p-2.5 rounded-2xl bg-[#071710]/80 backdrop-blur-sm border border-[#1b3b28]/85 shadow-xl flex flex-nowrap items-center justify-center gap-1.5 sm:gap-2.5">
          {[0, 1, 2, 3].map((slotIdx) => {
            const cardData = peekedCards[slotIdx];
            const isSelected = selectedIndices.includes(slotIdx);
            const selectedOrder = selectedIndices.indexOf(slotIdx);
            const selectionBadge = selectedOrder !== -1 ? `${selectedOrder + 1}. KART` : undefined;
            const isRevealed = !isReady && !!cardData;

            return (
              <div key={slotIdx} className="flex flex-col items-center relative">
                <CardView
                  value={cardData?.value || 0}
                  ability={cardData?.ability || 'none'}
                  name={cardData?.name || `Slot ${slotIdx + 1}`}
                  flavor={cardData?.flavor || ''}
                  isFaceUp={isRevealed}
                  size="sm"
                  isSelectable={!isReady && Object.keys(peekedCards).length === 0}
                  isSelected={isSelected}
                  selectionBadge={selectionBadge}
                  badge={isRevealed ? `Slot ${slotIdx + 1}` : undefined}
                  onClick={() => toggleSelectSlot(slotIdx)}
                  glowColor="purple"
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <div className="w-full h-screen h-[100dvh] flex flex-col justify-between overflow-hidden select-none relative bg-[#07170e]">
      {/* Fixed Top Header */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-2.5 bg-[#08150e]/90 border-b border-[#1b3425]/70 backdrop-blur-md shadow-md z-30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 text-lg">🌱</span>
            <span className="font-['Cinzel',serif] font-black text-amber-200 text-lg tracking-wider">
              REY
            </span>
          </div>
          <span className="text-xs px-3 py-1 rounded-xl bg-[#24170e]/90 text-[#fde68a] border border-[#784d1c] font-semibold flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>2 Kartını Seç & Ezberle</span>
          </span>
          <span className="hidden sm:inline text-xs text-[#a6c4b2] font-mono">
            Oda: <strong className="text-white">{gameState.roomCode}</strong>
          </span>
        </div>

        {/* Ready counter */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0e2518]/90 border border-[#235839] text-xs font-semibold text-[#a7bfae]">
          <span>Hazır:</span>
          <span className="text-emerald-400 font-black">{readyPlayersCount}/{totalPlayers}</span>
        </div>
      </header>

      {/* 2D Isometric Casino Table View */}
      <IsometricTable contentClassName="rey-initial-peek-content">{tableContent}</IsometricTable>

      {/* Ready Button Fixed Dock */}
      <div className="fixed bottom-6 inset-x-0 z-40 flex flex-col items-center pointer-events-none">
        <div className="pointer-events-auto">
          {Object.keys(peekedCards).length === 2 && !isReady ? (
            <button
              onClick={handleFinishPeek}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-black flex items-center gap-2 shadow-md cursor-pointer transition text-sm sm:text-base hover:scale-105 active:scale-95 border border-emerald-300/40"
            >
              <Brain className="w-5 h-5" />
              <span>Ezberledim! (Hazırım){countdown !== null ? ` [${countdown}s]` : ''}</span>
              {countdown !== null && <Clock className="w-4 h-4 ml-1 animate-spin" />}
            </button>
          ) : isReady ? (
            <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#16271e]/95 border border-emerald-500/60 text-emerald-300 font-extrabold text-xs sm:text-sm shadow-xl backdrop-blur-md">
              <Check className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-400" />
              <span>Hazırsınız! Diğer oyuncu bekleniyor...</span>
            </div>
          ) : (
            <div className="px-5 py-2 rounded-xl bg-[#16271e]/95 border border-[#3b5d47]/70 text-xs text-amber-200 font-semibold shadow-md backdrop-blur-md animate-pulse">
              Ezberlemek için {2 - selectedIndices.length} kart daha seçin...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
