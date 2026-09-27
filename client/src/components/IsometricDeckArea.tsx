import React from 'react';
import type { Card, TurnSubPhase } from '../types/game';
import { CardView } from './CardView';
import { CardBackArt } from './CardArt';
import { Crown, Flame, Hand, Layers3, Sparkles } from 'lucide-react';
import { haptic } from '../utils/haptics';

interface IsometricDeckAreaProps {
  drawPileCount: number;
  topDiscardCard: Card | null;
  isMyTurn: boolean;
  canDraw: boolean;
  onDrawDeck: () => void;
  onDrawDiscard: () => void;
  currentDrawnCard?: Card | null;
  turnSubPhase?: TurnSubPhase;
  isCurrentlyDragging?: boolean;
  onPointerDownDrawnCard?: (e: React.PointerEvent) => void;
  onDiscardDrawn?: (usePower: boolean) => void;
  deckPileRef?: React.RefObject<HTMLDivElement | null>;
}

interface GameActionDockProps {
  canDraw: boolean;
  canCallRey: boolean;
  canKamikaze: boolean;
  hasDiscardCard: boolean;
  onDrawDeck: () => void;
  onDrawDiscard: () => void;
  onCallRey: () => void;
  onCallKamikaze: () => void;
}

export const IsometricDeckArea: React.FC<IsometricDeckAreaProps> = ({
  drawPileCount,
  topDiscardCard,
  isMyTurn,
  canDraw,
  onDrawDeck,
  onDrawDiscard,
  currentDrawnCard,
  turnSubPhase,
  isCurrentlyDragging,
  onPointerDownDrawnCard,
  onDiscardDrawn,
  deckPileRef,
}) => {
  const isDrawnFromDeck = isMyTurn && turnSubPhase === 'drawn_deck' && !!currentDrawnCard;
  const isDrawnFromDiscard = isMyTurn && turnSubPhase === 'drawn_discard' && !!currentDrawnCard;

  return (
    <div className="rey-iso-table-shell" aria-label="İzometrik oyun masası">
      <div className="rey-iso-table-shadow" />
      <div className="rey-iso-table-depth" />
      <div className="rey-iso-table-rim" />
      <div className="rey-iso-table-felt" />

      <div className="rey-iso-corner rey-iso-corner-tl">⌜</div>
      <div className="rey-iso-corner rey-iso-corner-tr">⌝</div>
      <div className="rey-iso-corner rey-iso-corner-bl">⌞</div>
      <div className="rey-iso-corner rey-iso-corner-br">⌟</div>

      <div className="rey-iso-piles">
        <div className="rey-iso-pile group">
          <span className="rey-iso-pile-label">DESTE ({drawPileCount})</span>

          <div
            ref={deckPileRef}
            data-interactive="true"
            onClick={canDraw ? () => {
              haptic('impact');
              onDrawDeck();
            } : undefined}
            className={`rey-iso-card-slot ${canDraw ? 'cursor-pointer' : ''}`}
          >
            <div className="rey-deck-ground-shadow" />
            {[5, 4, 3, 2, 1].map((layer) => (
              <div key={layer} className={`rey-deck-layer rey-deck-layer-${layer}`} />
            ))}

            {isDrawnFromDeck && currentDrawnCard ? (
              <div
                onPointerDown={onPointerDownDrawnCard}
                className={`rey-drawn-card-arrive absolute inset-0 rounded-xl transition-all duration-200 cursor-grab active:cursor-grabbing select-none touch-none ${
                  isCurrentlyDragging
                    ? 'opacity-25 scale-95'
                    : '-translate-y-3 scale-105 z-20 ring-2 ring-amber-300 shadow-[0_18px_34px_rgba(245,158,11,0.48)] animate-pulse'
                }`}
                title="Tut ve elindeki bir kartın üzerine sürükle!"
              >
                <CardView
                  value={currentDrawnCard.value}
                  ability={currentDrawnCard.ability}
                  name={currentDrawnCard.name}
                  flavor={currentDrawnCard.flavor}
                  isFaceUp={true}
                  size="md"
                  badge={isCurrentlyDragging ? undefined : 'SÜRÜKLE'}
                  glowColor="gold"
                />
              </div>
            ) : (
              <div
                className={`absolute inset-0 z-10 rounded-xl transition-all duration-200 isometric-card-shadow ${
                  canDraw
                    ? 'group-hover:-translate-y-2 group-hover:scale-[1.03] ring-1 ring-amber-300/80 shadow-[0_14px_28px_rgba(251,191,36,0.3)]'
                    : ''
                }`}
              >
                <CardBackArt size="md" />
              </div>
            )}
          </div>

          {isDrawnFromDeck && currentDrawnCard && !isCurrentlyDragging && (
            <div className="rey-drawn-card-actions">
              <span className="rey-drawn-card-hint">Kendi kartına sürükle veya dokun</span>
              {currentDrawnCard.ability !== 'none' && onDiscardDrawn && (
                <button
                  type="button"
                  onClick={() => {
                    haptic('power');
                    onDiscardDrawn(true);
                  }}
                  className="rey-power-discard-button"
                >
                  <Sparkles className="w-3 h-3 fill-current" />
                  <span>
                    Ortaya At &amp;{' '}
                    {currentDrawnCard.ability === 'peek'
                      ? 'Röntgen'
                      : currentDrawnCard.ability === 'spy'
                      ? 'Casusluk'
                      : 'Takas'}
                  </span>
                </button>
              )}
              {onDiscardDrawn && (
                <button
                  type="button"
                  onClick={() => {
                    haptic('tap');
                    onDiscardDrawn(false);
                  }}
                  className="rey-pass-discard-button"
                >
                  Ortaya At (Pas)
                </button>
              )}
            </div>
          )}
        </div>

        <div className="rey-iso-center-mark" aria-hidden="true">
          <span>✦</span>
        </div>

        <div className="rey-iso-pile group">
          <span className="rey-iso-pile-label">ORTADAKİ KART</span>

          <div
            data-interactive="true"
            onClick={canDraw && topDiscardCard ? () => {
              haptic('impact');
              onDrawDiscard();
            } : undefined}
            className={`rey-iso-card-slot rey-discard-slot ${
              canDraw && topDiscardCard ? 'cursor-pointer' : ''
            }`}
          >
            <div className="rey-deck-ground-shadow" />
            <div className="rey-discard-underlay rey-discard-underlay-a" />
            <div className="rey-discard-underlay rey-discard-underlay-b" />

            {isDrawnFromDiscard && currentDrawnCard ? (
              <div
                onPointerDown={onPointerDownDrawnCard}
                className={`rey-drawn-card-arrive absolute inset-0 z-20 rounded-xl transition-all duration-200 cursor-grab active:cursor-grabbing select-none touch-none ${
                  isCurrentlyDragging
                    ? 'opacity-25 scale-95'
                    : '-translate-y-3 scale-105 ring-2 ring-emerald-300 shadow-[0_18px_34px_rgba(52,211,153,0.42)] animate-pulse'
                }`}
                title="Tut ve elindeki bir kartın üzerine sürükle!"
              >
                <CardView
                  value={currentDrawnCard.value}
                  ability={currentDrawnCard.ability}
                  name={currentDrawnCard.name}
                  flavor={currentDrawnCard.flavor}
                  isFaceUp={true}
                  size="md"
                  badge={isCurrentlyDragging ? undefined : 'SÜRÜKLE'}
                  glowColor="cyan"
                />
              </div>
            ) : (
              <div
                className={`absolute inset-0 z-10 rounded-xl transition-all duration-200 isometric-card-shadow ${
                  canDraw && topDiscardCard
                    ? 'group-hover:-translate-y-2 group-hover:scale-[1.03] ring-1 ring-emerald-300/80 shadow-[0_14px_28px_rgba(52,211,153,0.26)]'
                    : ''
                }`}
              >
                {topDiscardCard ? (
                  <CardView
                    value={topDiscardCard.value}
                    ability={topDiscardCard.ability}
                    name={topDiscardCard.name}
                    flavor={topDiscardCard.flavor}
                    isFaceUp={true}
                    size="md"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl border-2 border-dashed border-[#315d43] flex items-center justify-center text-xs text-emerald-300/60 bg-[#07150d]/85 font-bold">
                    Boş
                  </div>
                )}
              </div>
            )}
          </div>

          {isDrawnFromDiscard && currentDrawnCard && !isCurrentlyDragging && (
            <div className="rey-drawn-card-actions">
              <span className="rey-drawn-card-hint">Kendi kartına sürükle veya dokun</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const GameActionDock: React.FC<GameActionDockProps> = ({
  canDraw,
  canCallRey,
  canKamikaze,
  hasDiscardCard,
  onDrawDeck,
  onDrawDiscard,
  onCallRey,
  onCallKamikaze,
}) => (
  <div className="rey-action-dock">
    <button
      type="button"
      data-interactive="true"
      onClick={canCallRey ? () => {
        haptic('royal');
        onCallRey();
      } : undefined}
      disabled={!canCallRey}
      className={`rey-call-button ${canCallRey ? 'rey-call-button-active' : 'rey-call-button-disabled'}`}
    >
      <Crown className="w-5 h-5 sm:w-7 sm:h-7 fill-current" />
      <span>“REY” DE!</span>
    </button>

    <span className="rey-call-caption">Düşük el kazanır (+60) • Rakibin son hamlesi</span>

    {canKamikaze && (
      <button
        type="button"
        data-interactive="true"
        onClick={() => {
          haptic('warning');
          onCallKamikaze();
        }}
        className="rey-kamikaze-button"
      >
        <Flame className="w-4 h-4 text-yellow-200 animate-pulse" />
        <span>KAMİKAZE! (12, 12, 13, 13)</span>
      </button>
    )}

    <div className="rey-draw-actions">
      <button
        type="button"
        disabled={!canDraw}
        onClick={canDraw ? () => {
          haptic('impact');
          onDrawDeck();
        } : undefined}
        className={`rey-draw-action rey-draw-action-deck ${canDraw ? 'is-enabled' : 'is-disabled'}`}
      >
        <Layers3 className="w-5 h-5 sm:w-6 sm:h-6" />
        <span>Kart Çek</span>
      </button>

      <button
        type="button"
        disabled={!canDraw || !hasDiscardCard}
        onClick={canDraw && hasDiscardCard ? () => {
          haptic('impact');
          onDrawDiscard();
        } : undefined}
        className={`rey-draw-action rey-draw-action-discard ${
          canDraw && hasDiscardCard ? 'is-enabled' : 'is-disabled'
        }`}
      >
        <Hand className="w-5 h-5 sm:w-6 sm:h-6" />
        <span>Ortadan Al</span>
      </button>
    </div>
  </div>
);
