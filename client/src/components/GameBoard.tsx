import React, { useState, useRef, useEffect } from 'react';
import type {
  Card,
  ClientGameState,
  ActivePeekState,
  ActiveSpyRevealedState,
  ActiveSpiedAlertState,
  ActiveSwapAnimationState,
  ActiveMatchDrawAnimationState,
  PlayerClientView,
} from '../types/game';
import { CardView } from './CardView';
import { CardBackArt } from './CardArt';
import { IsometricTable } from './IsometricTable';
import { GameActionDock, IsometricDeckArea } from './IsometricDeckArea';
import { SpecialPowerModal } from './SpecialPowerModal';
import { sound } from '../audio/soundEngine';
import { haptic } from '../utils/haptics';
import {
  Volume2,
  VolumeX,
  BookOpen,
  Eye,
  Radio,
  ArrowLeftRight,
  Flame,
  Sparkles,
  User,
  Crown,
  Copy,
  Check,
  Settings,
  X,
} from 'lucide-react';

interface GameBoardProps {
  gameState: ClientGameState;
  myPlayerId: string;
  onDrawDeck: () => void;
  onDrawDiscard: () => void;
  onReplaceCard: (slotIndex: number) => void;
  onDiscardDrawn: (usePower: boolean) => void;
  onExecutePeek: (slotIndex: number) => void;
  onExecuteSpy: (targetPlayerId: string, slotIndex: number) => void;
  onExecuteSwap: (ownSlotIndex: number, targetPlayerId: string, targetSlotIndex: number) => void;
  onMatchDiscard: (indices: number[]) => void;
  onDiscardPair: (indices: number[], callback?: (res: any) => void) => void;
  onCallRey: () => void;
  onCallKamikaze: () => void;
  onSelectPower: (powerId: string) => void;
  onCallCabo: () => void;
  onOpenRules: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  activePeek: ActivePeekState | null;
  activeSpyRevealed: ActiveSpyRevealedState | null;
  activeSpiedAlert: ActiveSpiedAlertState | null;
  activeSwapAnimation: ActiveSwapAnimationState | null;
  activeMatchDrawAnimation?: ActiveMatchDrawAnimationState | null;
}

interface SwapFlightOverlayProps {
  swap: ActiveSwapAnimationState;
  slotRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  oppSlotRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  myPlayerId: string;
  players: PlayerClientView[];
}

const SwapFlightOverlay: React.FC<SwapFlightOverlayProps> = ({
  swap,
  slotRefs,
  oppSlotRefs,
  myPlayerId,
  players,
}) => {
  const [isFlying, setIsFlying] = useState(false);

  const getSlotCenter = (playerId: string, slotIdx: number) => {
    let el: HTMLElement | null = null;
    if (playerId === myPlayerId) {
      el = slotRefs.current[slotIdx];
    } else {
      el = oppSlotRefs.current[`${playerId}_${slotIdx}`];
    }
    if (el) {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    if (playerId === myPlayerId) {
      return { x: window.innerWidth / 2, y: window.innerHeight - 90 };
    }
    return { x: window.innerWidth / 2, y: 130 };
  };

  const [flights] = useState(() => {
    const fromSlots = swap.isSwapAll
      ? (swap.fromSlotIndices?.length ? swap.fromSlotIndices : [swap.fromSlotIndex])
      : [swap.fromSlotIndex];
    const toSlots = swap.isSwapAll
      ? (swap.toSlotIndices?.length ? swap.toSlotIndices : [swap.toSlotIndex])
      : [swap.toSlotIndex];

    return [
      ...fromSlots.map((slotIndex, index) => ({
        key: `from-${slotIndex}-${index}`,
        start: getSlotCenter(swap.fromPlayerId, slotIndex),
        end: getSlotCenter(swap.toPlayerId, slotIndex),
        direction: 1,
        index,
        total: fromSlots.length,
      })),
      ...toSlots.map((slotIndex, index) => ({
        key: `to-${slotIndex}-${index}`,
        start: getSlotCenter(swap.toPlayerId, slotIndex),
        end: getSlotCenter(swap.fromPlayerId, slotIndex),
        direction: -1,
        index,
        total: toSlots.length,
      })),
    ];
  });

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsFlying(true);
      });
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  const fromPlayer = players.find((p) => p.id === swap.fromPlayerId);
  const toPlayer = players.find((p) => p.id === swap.toPlayerId);
  const fromName = fromPlayer ? (fromPlayer.id === myPlayerId ? 'Sen' : fromPlayer.name) : 'Oyuncu';
  const toName = toPlayer ? (toPlayer.id === myPlayerId ? 'Sen' : toPlayer.name) : 'Oyuncu';

  const animDuration = Math.max(800, swap.durationMs - (swap.isSwapAll ? 450 : 150));
  const exchangedCardCount = flights.length;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none">
      {/* Center status pill */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-1 px-5 py-2.5 rounded-2xl bg-black/85 backdrop-blur-md border border-pink-500/60 shadow-[0_0_30px_rgba(244,63,94,0.6)] animate-pulse">
        <div className="flex items-center gap-2 text-pink-300 font-black text-xs sm:text-sm">
          <ArrowLeftRight className="w-4 h-4 text-pink-400 animate-spin" />
          <span>{swap.isSwapAll ? 'TÜM ELLER TAKAS EDİLİYOR...' : 'KARTLAR TAKAS EDİLİYOR...'}</span>
        </div>
        <span className="text-[10px] text-pink-200/80 font-bold">
          {fromName} ⟷ {toName}
        </span>
        {swap.isSwapAll && (
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-pink-100/70">
            {exchangedCardCount} kart hareket halinde
          </span>
        )}
      </div>

      {/* Every card flies independently so a full-hand power cannot look like a single-card swap. */}
      {flights.map((flight) => {
        const fanOffset = flight.index - (flight.total - 1) / 2;
        const rotation = flight.direction * (10 + fanOffset * 4);
        const delay = swap.isSwapAll ? flight.index * 65 : 0;
        const currentPos = isFlying ? flight.end : flight.start;

        return (
          <div
            key={flight.key}
            className="fixed z-50 pointer-events-none select-none will-change-transform"
            style={{
              left: 0,
              top: 0,
              zIndex: 50 + flight.index,
              transform: `translate3d(${currentPos.x}px, ${currentPos.y}px, 0) translate(-50%, -50%) rotate(${isFlying ? rotation : fanOffset * 2}deg) scale(${isFlying ? 1.04 : 0.96})`,
              transition: `transform ${animDuration}ms cubic-bezier(0.25, 1, 0.5, 1) ${delay}ms`,
            }}
          >
            <div
              className={`w-20 h-28 sm:w-24 sm:h-34 rounded-xl overflow-hidden border-2 shadow-[0_20px_35px_rgba(244,63,94,0.55)] ring-2 ${
                flight.direction > 0
                  ? 'border-pink-400 ring-pink-500/50'
                  : 'border-purple-400 ring-purple-500/50'
              }`}
            >
              <CardBackArt />
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface MatchDrawFlightOverlayProps {
  anim: ActiveMatchDrawAnimationState;
  slotRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  oppSlotRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  deckPileRef: React.RefObject<HTMLDivElement | null>;
  myPlayerId: string;
  players: PlayerClientView[];
}

const MatchDrawFlightOverlay: React.FC<MatchDrawFlightOverlayProps> = ({
  anim,
  slotRefs,
  oppSlotRefs,
  deckPileRef,
  myPlayerId,
  players,
}) => {
  // Stages: 'spawn' -> 'flipped_open' -> 'flying' -> 'arrived' -> 'flipped_closed'
  const [stage, setStage] = useState<'spawn' | 'flipped_open' | 'flying' | 'arrived' | 'flipped_closed'>('spawn');

  const getSlotCenter = (playerId: string, slotIdx: number) => {
    let el: HTMLElement | null = null;
    if (playerId === myPlayerId) {
      el = slotRefs.current[slotIdx];
    } else {
      el = oppSlotRefs.current[`${playerId}_${slotIdx}`];
    }
    if (el) {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    if (playerId === myPlayerId) {
      return { x: window.innerWidth / 2, y: window.innerHeight - 90 };
    }
    return { x: window.innerWidth / 2, y: 130 };
  };

  const getDeckCenter = () => {
    if (deckPileRef.current) {
      const rect = deckPileRef.current.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    return { x: window.innerWidth / 2 - 45, y: window.innerHeight / 2 - 20 };
  };

  const [startPos] = useState(() => getDeckCenter());
  const [endPos] = useState(() => getSlotCenter(anim.playerId, anim.slotIndex));

  useEffect(() => {
    // 1. Flip open at pile after 80ms
    const t1 = setTimeout(() => {
      setStage('flipped_open');
      sound.playCardFlip();
    }, 80);

    // 2. Fly to destination slot after 480ms
    const t2 = setTimeout(() => {
      setStage('flying');
      sound.playCardSnap();
    }, 480);

    // 3. Arrive at destination slot after 1150ms
    const t3 = setTimeout(() => {
      setStage('arrived');
    }, 1150);

    // 4. Flip closed at slot after 1650ms
    const t4 = setTimeout(() => {
      setStage('flipped_closed');
      sound.playCardFlip();
    }, 1650);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const player = players.find((p) => p.id === anim.playerId);
  const isMe = anim.playerId === myPlayerId;
  const playerName = player ? (isMe ? 'Sen' : player.name) : 'Oyuncu';

  // For the matching player, show card face-up until stage === 'flipped_closed'!
  // For opponent, it remains face-down with CardBackArt so opponent's card stays secret.
  const isFaceUp = isMe && (stage === 'flipped_open' || stage === 'flying' || stage === 'arrived');

  const matchTitle =
    anim.count === 2 ? 'ÇİFTLEME' : anim.count === 3 ? 'ÜÇLEME' : 'DÖRTLEME';

  const isAtDestination = stage === 'flying' || stage === 'arrived' || stage === 'flipped_closed';
  const currentPos = isAtDestination ? endPos : startPos;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none">
      {/* Center status pill */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-1 px-4 py-2 rounded-2xl bg-black/90 backdrop-blur-md border border-amber-400/70 shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-pulse">
        <div className="flex items-center gap-1.5 text-amber-300 font-black text-xs sm:text-sm">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span>✨ {matchTitle} KARTI ÇEKİLİYOR!</span>
        </div>
        <span className="text-[10px] text-amber-100/90 font-bold">
          {playerName} için 1 yeni kart desteye ekleniyor
          {(anim.bonus ?? 0) > 0 ? ` (+${anim.bonus} Skor)` : ''}
        </span>
      </div>

      {/* Flying & Flipping Card */}
      <div
        className="fixed z-50 pointer-events-none select-none will-change-transform"
        style={{
          left: 0,
          top: 0,
          transform: `translate3d(${currentPos.x}px, ${currentPos.y}px, 0) translate(-50%, -50%) scale(${
            stage === 'flying' ? 1.15 : 1.05
          })`,
          transition: stage === 'flying'
            ? 'transform 650ms cubic-bezier(0.2, 0.9, 0.35, 1)'
            : 'transform 200ms ease-out',
        }}
      >
        <div className="w-[74px] min-[390px]:w-[80px] sm:w-24 md:w-28 h-[104px] min-[390px]:h-[114px] sm:h-34 md:h-40 relative">
          <CardView
            value={anim.card?.value || 0}
            ability={anim.card?.ability || 'none'}
            name={anim.card?.name || 'Yeni Kart'}
            flavor={anim.card?.flavor || ''}
            isFaceUp={isFaceUp}
            size="md"
            badge="YENİ KART"
            className="ring-4 ring-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.85)]"
          />
        </div>
      </div>
    </div>
  );
};

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  myPlayerId,
  onDrawDeck,
  onDrawDiscard,
  onReplaceCard,
  onDiscardDrawn,
  onExecutePeek,
  onExecuteSpy,
  onExecuteSwap,
  onMatchDiscard: _onMatchDiscard,
  onDiscardPair,
  onCallRey,
  onCallKamikaze,
  onSelectPower,
  onCallCabo: _onCallCabo,
  onOpenRules,
  isMuted,
  onToggleMute,
  activePeek,
  activeSpyRevealed,
  activeSpiedAlert,
  activeSwapAnimation,
  activeMatchDrawAnimation,
}) => {
  const me = gameState.players.find((p) => p.id === myPlayerId);
  const opponents = gameState.players.filter((p) => p.id !== myPlayerId);
  const isMyTurn = gameState.activePlayerId === myPlayerId;
  const isReyActive = gameState.caboCallerId !== null;
  const reyCaller = isReyActive ? gameState.players.find((p) => p.id === gameState.caboCallerId) : null;

  // Local interaction states
  const [matchingMode, setMatchingMode] = useState(false);
  const [selectedMatchIndices, setSelectedMatchIndices] = useState<number[]>([]);
  const [matchFeedback, setMatchFeedback] = useState<{ isSuccess: boolean; text: string } | null>(null);
  const [swapOwnIndex, setSwapOwnIndex] = useState<number | null>(null);
  const [swapTarget, setSwapTarget] = useState<{ playerId: string; slotIndex: number } | null>(null);
  const [selectedPeekSlots, setSelectedPeekSlots] = useState<number[]>([]);
  const [selectedSpySlots, setSelectedSpySlots] = useState<number[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const previousActivePlayerRef = useRef<string | null>(null);
  const turnStateRef = useRef({
    activePlayerId: gameState.activePlayerId,
    turnSubPhase: gameState.turnSubPhase,
    phase: gameState.phase,
  });

  useEffect(() => {
    turnStateRef.current = {
      activePlayerId: gameState.activePlayerId,
      turnSubPhase: gameState.turnSubPhase,
      phase: gameState.phase,
    };
  }, [gameState.activePlayerId, gameState.turnSubPhase, gameState.phase]);

  useEffect(() => {
    if (gameState.phase !== 'playing') {
      previousActivePlayerRef.current = null;
      return;
    }
    if (previousActivePlayerRef.current === gameState.activePlayerId) return;

    previousActivePlayerRef.current = gameState.activePlayerId;
    if (gameState.activePlayerId === myPlayerId) {
      sound.playTurnStart();
      haptic('impact');
    } else {
      sound.playTurnPass();
    }
  }, [gameState.activePlayerId, gameState.phase, myPlayerId]);

  useEffect(() => {
    if (gameState.phase !== 'playing' || gameState.activePlayerId !== myPlayerId) return;

    const reminderTimer = setTimeout(() => {
      const current = turnStateRef.current;
      if (
        current.phase === 'playing' &&
        current.activePlayerId === myPlayerId &&
        current.turnSubPhase === 'idle'
      ) {
        sound.playTurnReminder();
        haptic('selection');
      }
    }, 10000);

    return () => clearTimeout(reminderTimer);
  }, [gameState.activePlayerId, gameState.phase, myPlayerId]);

  const copyCode = () => {
    sound.playCardSnap();
    navigator.clipboard.writeText(gameState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Kamikaze detection (exactly two 12s and two 13s)
  const myCards = (me?.cards as Card[]) || [];
  const count12 = myCards.filter((c) => c && c.value === 12).length;
  const count13 = myCards.filter((c) => c && c.value === 13).length;
  const canKamikaze =
    isMyTurn &&
    (Boolean(me?.canKamikaze) || (myCards.length === 4 && count12 === 2 && count13 === 2));
  const canCallRey = isMyTurn && gameState.turnSubPhase === 'idle' && !isReyActive;
  const canDraw = isMyTurn && gameState.turnSubPhase === 'idle';

  // Tur 2 Special Power Selection Modal state
  const isChoosingPower =
    isMyTurn &&
    gameState.turnSubPhase === 'power_selection' &&
    !!me?.availablePowers &&
    me.availablePowers.length > 0;

  // Drag and drop states for drawn card replacement
  const [isDraggingDrawnCard, setIsDraggingDrawnCard] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const oppSlotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const deckAreaRef = useRef<HTMLDivElement | null>(null);

  // Placed card face-up flip animation state
  const [justReplacedSlot, setJustReplacedSlot] = useState<{
    slotIndex: number;
    card: Card;
    isClosing: boolean;
  } | null>(null);
  const justReplacedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justReplacedCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (justReplacedTimeoutRef.current) clearTimeout(justReplacedTimeoutRef.current);
      if (justReplacedCloseTimeoutRef.current) clearTimeout(justReplacedCloseTimeoutRef.current);
    };
  }, []);

  const triggerReplaceCard = (slotIdx: number) => {
    const drawn = gameState.currentDrawnCard;
    if (drawn) {
      if (justReplacedTimeoutRef.current) clearTimeout(justReplacedTimeoutRef.current);
      if (justReplacedCloseTimeoutRef.current) clearTimeout(justReplacedCloseTimeoutRef.current);

      setJustReplacedSlot({
        slotIndex: slotIdx,
        card: drawn,
        isClosing: false,
      });

      // Show face-up in slot for 650ms, then flip closed with flip sound
      justReplacedCloseTimeoutRef.current = setTimeout(() => {
        sound.playCardFlip();
        setJustReplacedSlot((prev) => (prev ? { ...prev, isClosing: true } : null));
      }, 650);

      // Settle into normal face-down slot after flip completes
      justReplacedTimeoutRef.current = setTimeout(() => {
        setJustReplacedSlot(null);
      }, 1250);
    }

    sound.playCardSnap();
    haptic('impact');
    onReplaceCard(slotIdx);
  };

  // Start dragging drawn card from panel
  const handleDrawnCardPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();

    setDragPos({ x: e.clientX, y: e.clientY });
    setIsDraggingDrawnCard(true);
    setDragOverSlotIndex(null);
    sound.playCardFlip();
    haptic('selection');
  };

  // Window pointer listeners for smooth touch and mouse drag tracking
  useEffect(() => {
    if (!isDraggingDrawnCard) return;

    const handlePointerMove = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      setDragPos({ x, y });

      let hoveredIdx: number | null = null;
      let minDistance = Infinity;
      slotRefs.current.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (y >= rect.top - 40 && y <= rect.bottom + 50) {
          const centerX = rect.left + rect.width / 2;
          const dist = Math.abs(x - centerX);
          if (dist < rect.width * 0.85 && dist < minDistance) {
            minDistance = dist;
            hoveredIdx = idx;
          }
        }
      });

      setDragOverSlotIndex(hoveredIdx);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      let droppedIdx: number | null = null;
      let minDistance = Infinity;
      slotRefs.current.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (y >= rect.top - 40 && y <= rect.bottom + 50) {
          const centerX = rect.left + rect.width / 2;
          const dist = Math.abs(x - centerX);
          if (dist < rect.width * 0.85 && dist < minDistance) {
            minDistance = dist;
            droppedIdx = idx;
          }
        }
      });

      setIsDraggingDrawnCard(false);
      setDragOverSlotIndex(null);

      if (droppedIdx !== null) {
        triggerReplaceCard(droppedIdx);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDraggingDrawnCard, onReplaceCard, gameState.currentDrawnCard]);

  const isDrawnPhase =
    isMyTurn &&
    (gameState.turnSubPhase === 'drawn_deck' || gameState.turnSubPhase === 'drawn_discard') &&
    !!gameState.currentDrawnCard;
  const isCurrentlyDragging = isDraggingDrawnCard && isDrawnPhase;

  // Handle clicking on own card slot
  const handleOwnCardClick = (slotIdx: number) => {
    if (!isMyTurn) return;

    if (
      gameState.turnSubPhase === 'peeking' ||
      gameState.turnSubPhase === 'peeking_1' ||
      gameState.turnSubPhase === 'peeking_2'
    ) {
      if (gameState.turnSubPhase === 'peeking_2') {
        if (selectedPeekSlots.includes(slotIdx)) return;
        setSelectedPeekSlots((current) => current.length >= 1 ? [] : [...current, slotIdx]);
      }
      sound.playPeek();
      haptic('selection');
      onExecutePeek(slotIdx);
      return;
    }

    if (gameState.turnSubPhase === 'swapping') {
      sound.playCardSnap();
      haptic('selection');
      setSwapOwnIndex(slotIdx);
      return;
    }

    if (matchingMode) {
      sound.playCardFlip();
      haptic('selection');
      if (selectedMatchIndices.includes(slotIdx)) {
        setSelectedMatchIndices(selectedMatchIndices.filter((i) => i !== slotIdx));
      } else {
        if (selectedMatchIndices.length < (me?.cards.length || 4)) {
          setSelectedMatchIndices([...selectedMatchIndices, slotIdx]);
        }
      }
      return;
    }

    if (gameState.turnSubPhase === 'drawn_deck' || gameState.turnSubPhase === 'drawn_discard') {
      triggerReplaceCard(slotIdx);
      return;
    }
  };

  // Handle clicking on opponent card slot
  const handleOpponentCardClick = (targetPlayerId: string, slotIdx: number) => {
    if (!isMyTurn) return;

    if (
      gameState.turnSubPhase === 'spying' ||
      gameState.turnSubPhase === 'spying_1' ||
      gameState.turnSubPhase === 'spying_2'
    ) {
      if (gameState.turnSubPhase === 'spying_2') {
        if (selectedSpySlots.includes(slotIdx)) return;
        setSelectedSpySlots((current) => current.length >= 1 ? [] : [...current, slotIdx]);
      }
      sound.playSpy();
      haptic('selection');
      onExecuteSpy(targetPlayerId, slotIdx);
      return;
    }

    if (gameState.turnSubPhase === 'swapping') {
      sound.playCardSnap();
      haptic('selection');
      setSwapTarget({ playerId: targetPlayerId, slotIndex: slotIdx });
      return;
    }
  };

  // Confirm Swap power execution
  const confirmSwap = () => {
    if (swapOwnIndex !== null && swapTarget !== null) {
      sound.playSwap();
      haptic('success');
      onExecuteSwap(swapOwnIndex, swapTarget.playerId, swapTarget.slotIndex);
      setSwapOwnIndex(null);
      setSwapTarget(null);
    }
  };

  // Inner table content rendered inside the 2D IsometricTable
  const tableContent = (
    <>
      {/* OPPONENTS AREA (TOP OF TABLE) */}
      <div className="rey-opponent-zone">
        {opponents.map((opp) => {
          const isActiveTurn = opp.id === gameState.activePlayerId;
          const isTargetForSpy =
            (gameState.turnSubPhase === 'spying' ||
              gameState.turnSubPhase === 'spying_1' ||
              gameState.turnSubPhase === 'spying_2') &&
            isMyTurn;
          const isTargetForSwap = gameState.turnSubPhase === 'swapping' && isMyTurn;

          return (
            <div
              key={opp.id}
              className={`rey-opponent-panel ${
                isActiveTurn
                  ? 'border-amber-400/80 ring-1 ring-amber-400/40 shadow-[0_0_18px_rgba(245,158,11,0.25)]'
                  : 'border-[#1b3b28]/85'
              }`}
            >
              {/* Opponent Info Plaque */}
              <div className="w-full flex items-center justify-between px-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg">{opp.avatar || '🦊'}</span>
                  <span className="font-bold text-[#e6f4ea] text-xs sm:text-sm">{opp.name}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="text-amber-200/90 font-bold">Skor: {opp.score}</span>
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0d2719] border border-[#275839] text-[#86efac] text-[10px] sm:text-xs font-bold">
                    <span>🎴</span>
                    <span>{opp.cardCount} kart</span>
                  </span>
                </div>
              </div>

              {/* Opponent Cards */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 w-full">
                {Array.from({ length: opp.cardCount }).map((_, cIdx) => {
                  const isSwapSelected =
                    swapTarget?.playerId === opp.id && swapTarget?.slotIndex === cIdx;
                  const isSpySelected = selectedSpySlots.includes(cIdx) && gameState.turnSubPhase === 'spying_2';
                  const isSpiedCard = Boolean(
                    activeSpyRevealed?.targetPlayerId === opp.id &&
                    (activeSpyRevealed.isAll ||
                      activeSpyRevealed.slotIndex === cIdx ||
                      (activeSpyRevealed.slots && activeSpyRevealed.slots.includes(cIdx)))
                  );
                  const isOppSwappingSlot =
                    activeSwapAnimation &&
                    (activeSwapAnimation.isSwapAll ||
                      (activeSwapAnimation.fromPlayerId === opp.id &&
                        activeSwapAnimation.fromSlotIndex === cIdx) ||
                      (activeSwapAnimation.toPlayerId === opp.id &&
                        activeSwapAnimation.toSlotIndex === cIdx));
                  const isOppMatchDrawingSlot =
                    activeMatchDrawAnimation &&
                    activeMatchDrawAnimation.playerId === opp.id &&
                    activeMatchDrawAnimation.slotIndex === cIdx;

                  let cardVal = 0;
                  let cardName = `Kart ${cIdx + 1}`;
                  let cardFlavor = '';
                  if (isSpiedCard && activeSpyRevealed) {
                    if (activeSpyRevealed.isAll && activeSpyRevealed.cards && activeSpyRevealed.cards[cIdx]) {
                      cardVal = activeSpyRevealed.cards[cIdx].value;
                      cardName = activeSpyRevealed.cards[cIdx].name;
                      cardFlavor = activeSpyRevealed.cards[cIdx].flavor;
                    } else if (activeSpyRevealed.slots && activeSpyRevealed.cards) {
                      const revealedIndex = activeSpyRevealed.slots.indexOf(cIdx);
                      const revealedCard = activeSpyRevealed.cards[revealedIndex];
                      if (revealedCard) {
                        cardVal = revealedCard.value;
                        cardName = revealedCard.name;
                        cardFlavor = revealedCard.flavor;
                      }
                    } else if (activeSpyRevealed.card) {
                      cardVal = activeSpyRevealed.card.value;
                      cardName = activeSpyRevealed.card.name;
                      cardFlavor = activeSpyRevealed.card.flavor;
                    }
                  }

                  return (
                    <div
                      key={cIdx}
                      ref={(el) => {
                        oppSlotRefs.current[`${opp.id}_${cIdx}`] = el;
                      }}
                      className={`relative transition-all duration-300 ${
                        isOppSwappingSlot || isOppMatchDrawingSlot ? 'opacity-25 scale-95' : ''
                      }`}
                    >
                      <CardView
                        value={cardVal}
                        ability="none"
                        name={cardName}
                        flavor={cardFlavor}
                        isFaceUp={isSpiedCard}
                        size="md"
                        isSelectable={isTargetForSpy || isTargetForSwap}
                        isSelected={isSwapSelected || isSpySelected}
                        glowColor={isSpiedCard ? 'cyan' : isTargetForSpy ? 'cyan' : 'purple'}
                        badge={
                          isTargetForSpy && !isSpiedCard
                            ? 'CASUSLUK'
                            : isTargetForSwap
                            ? 'SWAP'
                            : undefined
                        }
                        className={
                          isSpiedCard
                            ? 'ring-4 ring-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.8)] animate-pulse z-30'
                            : ''
                        }
                        onClick={() => handleOpponentCardClick(opp.id, cIdx)}
                      />

                      {/* Floating SPY indicator badge above opponent card */}
                      {isSpiedCard && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap px-2 py-0.5 rounded-full bg-cyan-600 border border-cyan-300 text-white font-black text-[9px] shadow-[0_0_15px_rgba(6,182,212,0.8)] flex items-center gap-1 animate-bounce">
                          <Radio className="w-3 h-3" />
                          <span>CASUSLUK (3s)</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* CENTER TABLE: DECK & DISCARD PILE */}
      <IsometricDeckArea
        deckPileRef={deckAreaRef}
        drawPileCount={gameState.drawPileCount}
        topDiscardCard={gameState.topDiscardCard}
        isMyTurn={isMyTurn}
        canDraw={canDraw}
        onDrawDeck={onDrawDeck}
        onDrawDiscard={onDrawDiscard}
        currentDrawnCard={gameState.currentDrawnCard}
        turnSubPhase={gameState.turnSubPhase}
        isCurrentlyDragging={isCurrentlyDragging}
        onPointerDownDrawnCard={handleDrawnCardPointerDown}
        onDiscardDrawn={onDiscardDrawn}
      />

      {/* POWER ACTION BANNERS */}
      {isMyTurn && (gameState.turnSubPhase === 'peeking' || gameState.turnSubPhase === 'peeking_1') && (
        <div className="px-3.5 py-1.5 rounded-full bg-[#271d36]/90 border border-purple-400/60 text-purple-200 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_16px_rgba(168,85,247,0.3)] animate-bounce my-0.5 backdrop-blur-sm">
          <Eye className="w-3.5 h-3.5 text-purple-300" />
          <span>👁️ RÖNTGEN: Kendi kapalı kartlarından 1 tanesine tıkla!</span>
        </div>
      )}

      {isMyTurn && gameState.turnSubPhase === 'peeking_2' && (
        <div className="px-3.5 py-1.5 rounded-full bg-[#271d36]/90 border border-purple-400/60 text-purple-200 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_16px_rgba(168,85,247,0.3)] animate-bounce my-0.5 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-purple-300" />
          <span>✨ RÖNTGEN SEVİYE 2: Kendi 2 kapalı kartını birden incele!</span>
        </div>
      )}

      {isMyTurn && (gameState.turnSubPhase === 'spying' || gameState.turnSubPhase === 'spying_1') && (
        <div className="px-3.5 py-1.5 rounded-full bg-[#132c35]/90 border border-cyan-400/60 text-cyan-200 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_16px_rgba(6,182,212,0.3)] animate-bounce my-0.5 backdrop-blur-sm">
          <Radio className="w-3.5 h-3.5 text-cyan-300" />
          <span>🔮 CASUSLUK: Rakibinin 1 kartına tıklayarak gözetle!</span>
        </div>
      )}

      {isMyTurn && gameState.turnSubPhase === 'spying_2' && (
        <div className="px-3.5 py-1.5 rounded-full bg-[#132c35]/90 border border-cyan-400/60 text-cyan-200 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_16px_rgba(6,182,212,0.3)] animate-bounce my-0.5 backdrop-blur-sm">
          <Radio className="w-3.5 h-3.5 text-cyan-300" />
          <span>🔮 CASUSLUK SEVİYE 2: Rakibinin 2 kartına tıklayarak gözetle!</span>
        </div>
      )}

      {isMyTurn && gameState.turnSubPhase === 'swapping' && (
        <div className="relative z-[70] flex flex-col items-center gap-1 my-0.5">
          <div className="px-3.5 py-1.5 rounded-full bg-[#351a24]/90 border border-rose-400/60 text-rose-200 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_16px_rgba(244,63,94,0.3)] backdrop-blur-sm">
            <ArrowLeftRight className="w-3.5 h-3.5 text-rose-300" />
            <span>
              🌸 KART TAKASI: {swapOwnIndex === null ? '1 kartını seç' : '✓ Kartın seçildi'} &{' '}
              {swapTarget === null ? '1 rakip kartı seç' : '✓ Rakip seçildi'}!
            </span>
          </div>
          {swapOwnIndex !== null && swapTarget !== null && (
            <button
              data-interactive="true"
              onClick={confirmSwap}
              className="relative z-[71] px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-400 hover:from-amber-400 hover:to-rose-300 text-stone-950 font-black text-xs shadow-[0_8px_24px_rgba(245,158,11,0.45)] transition cursor-pointer active:scale-95 border border-amber-200"
            >
              🌸 Kart Takasını Onayla!
            </button>
          )}
        </div>
      )}

      {/* PLAYER'S HAND (BOTTOM OF FELT TABLE) */}
      <div className="rey-player-zone">
        {/* Multi-Card Matching Toolbar (Çiftleme, Üçleme, Dörtleme) */}
        {isMyTurn && gameState.turnSubPhase === 'idle' && me && me.cards.length >= 2 && (
          <div className="relative z-50 flex items-center gap-2 mb-2">
            {!matchingMode ? (
              <button
                type="button"
                onClick={() => {
                  haptic('tap');
                  setMatchingMode(true);
                  setSelectedMatchIndices([]);
                }}
                className="py-1 px-4 rounded-xl bg-[#142319]/90 hover:bg-[#1d3625] border border-amber-500/50 text-[#fde68a] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Çiftleme / Üçleme Yap</span>
              </button>
            ) : (
              <div className="relative z-50 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#16271e]/95 border border-amber-500/60 shadow-md">
                <span className="text-[10px] sm:text-[11px] text-amber-200 font-bold">
                  {selectedMatchIndices.length === 0
                    ? 'Aynı değerdeki 2, 3 veya 4 kartına tıkla:'
                    : selectedMatchIndices.length === 1
                    ? '1 Kart Seçildi • Eşini seç...'
                    : selectedMatchIndices.length === 2
                    ? '2 Kart (Çiftleme) Seçildi'
                    : selectedMatchIndices.length === 3
                    ? '3 Kart (Üçleme) Seçildi'
                    : '4 Kart (Dörtleme) Seçildi'}
                </span>
                <button
                  type="button"
                  disabled={selectedMatchIndices.length < 2}
                  onClick={() => {
                    if (selectedMatchIndices.length >= 2) {
                      const indicesToSend = [...selectedMatchIndices];
                      onDiscardPair(indicesToSend, (res: any) => {
                        if (res && res.success) {
                          sound.playMatchSuccess();
                          haptic('success');
                          const matchName =
                            indicesToSend.length === 2
                              ? 'Çiftleme'
                              : indicesToSend.length === 3
                              ? 'Üçleme'
                              : 'Dörtleme';
                          setMatchFeedback({
                            isSuccess: true,
                            text: `✨ ${matchName} Başarılı! 1 yeni kart çekildi${res.bonus > 0 ? ` (+${res.bonus} Skor)` : ''}`,
                          });
                        } else if (res) {
                          sound.playMatchFail();
                          haptic('warning');
                          setMatchFeedback({
                            isSuccess: false,
                            text: '❌ Hatalı Eşleştirme! Seçilen kartlar uyuşmadı.',
                          });
                        }
                        setTimeout(() => setMatchFeedback(null), 3500);
                      });
                      setMatchingMode(false);
                      setSelectedMatchIndices([]);
                    }
                  }}
                  className={`px-2.5 py-0.5 rounded-lg font-black text-[11px] transition ${
                    selectedMatchIndices.length >= 2
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 cursor-pointer shadow-sm animate-bounce'
                      : 'bg-[#1e3427] text-stone-500 cursor-not-allowed'
                  }`}
                >
                  {selectedMatchIndices.length === 2
                    ? 'Çiftle (+20)'
                    : selectedMatchIndices.length === 3
                    ? 'Üçle'
                    : selectedMatchIndices.length === 4
                    ? 'Dörtle'
                    : 'Seç'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic('tap');
                    setMatchingMode(false);
                    setSelectedMatchIndices([]);
                  }}
                  className="px-1.5 py-0.5 rounded-lg bg-[#203629] hover:bg-[#2b4737] text-stone-300 text-[10px] cursor-pointer"
                >
                  İptal
                </button>
              </div>
            )}
          </div>
        )}

        {/* Hand Cards with Drag Drop Targets - SIDE-BY-SIDE FLEX-NOWRAP IN 1 ROW */}
        <div className="rey-player-hand">
          {me?.cards.map((c: any, slotIdx: number) => {
            const isReplacing =
              isMyTurn &&
              (gameState.turnSubPhase === 'drawn_deck' || gameState.turnSubPhase === 'drawn_discard') &&
              !matchingMode;
            const isPeeking =
              isMyTurn &&
              (gameState.turnSubPhase === 'peeking' ||
                gameState.turnSubPhase === 'peeking_1' ||
                gameState.turnSubPhase === 'peeking_2');
            const isSwapping = isMyTurn && gameState.turnSubPhase === 'swapping';
            const isSelectedForSwap = swapOwnIndex === slotIdx;
            const isSelectedForPeek = selectedPeekSlots.includes(slotIdx) && gameState.turnSubPhase === 'peeking_2';
            const matchIndexOrder = selectedMatchIndices.indexOf(slotIdx);
            const isSelectedForMatch = matchIndexOrder !== -1;
            const isHoveredByDrag = isCurrentlyDragging && dragOverSlotIndex === slotIdx;

            const isCurrentlyPeeked =
              activePeek?.slotIndex === slotIdx ||
              (activePeek?.slots && activePeek.slots.includes(slotIdx)) ||
              false;

            const isSpiedByRival =
              activeSpiedAlert &&
              (activeSpiedAlert.slotIndex === slotIdx ||
                activeSpiedAlert.slots?.includes(slotIdx) ||
                activeSpiedAlert.isAll);

            const isSwappingThisSlot =
              activeSwapAnimation &&
              (activeSwapAnimation.isSwapAll ||
                (activeSwapAnimation.fromPlayerId === myPlayerId &&
                  activeSwapAnimation.fromSlotIndex === slotIdx) ||
                (activeSwapAnimation.toPlayerId === myPlayerId &&
                  activeSwapAnimation.toSlotIndex === slotIdx));

            const isMatchDrawingThisSlot =
              activeMatchDrawAnimation &&
              activeMatchDrawAnimation.playerId === myPlayerId &&
              activeMatchDrawAnimation.slotIndex === slotIdx;

            const isJustReplaced = justReplacedSlot?.slotIndex === slotIdx;

            let cardData = c;
            if (isCurrentlyPeeked) {
              if (activePeek?.cards && activePeek?.slots) {
                const idxInSlots = activePeek.slots.indexOf(slotIdx);
                if (idxInSlots !== -1 && activePeek.cards[idxInSlots]) {
                  cardData = activePeek.cards[idxInSlots];
                }
              } else if (activePeek?.card) {
                cardData = activePeek.card;
              }
            } else if (isJustReplaced && justReplacedSlot) {
              cardData = justReplacedSlot.card;
            }

            const isFaceUp =
              isCurrentlyPeeked ||
              (isJustReplaced ? !justReplacedSlot?.isClosing : c.isRevealed) ||
              false;

            const isSelectable = isReplacing || isPeeking || isSwapping || matchingMode;

            let selectionBadge: string | undefined = undefined;
            if (isSelectedForMatch) {
              selectionBadge = `${matchIndexOrder + 1}. KART`;
            } else if (isSelectedForSwap) {
              selectionBadge = 'TAKAS';
            } else if (isSelectedForPeek) {
              selectionBadge = `${selectedPeekSlots.indexOf(slotIdx) + 1}. RÖNTGEN`;
            } else if (isHoveredByDrag) {
              selectionBadge = 'BURAYA';
            }

            return (
              <div
                key={`${c.id || 'card'}_${slotIdx}`}
                ref={(el) => {
                  slotRefs.current[slotIdx] = el;
                }}
                className={`flex flex-col items-center relative transition-all duration-150 ${
                  isHoveredByDrag
                    ? 'scale-110 -translate-y-2.5 z-30'
                    : isCurrentlyDragging
                    ? 'scale-95 opacity-85'
                    : isSwappingThisSlot || isMatchDrawingThisSlot
                    ? 'opacity-20 scale-95'
                    : ''
                }`}
              >
                <CardView
                  value={cardData.value || 0}
                  ability={cardData.ability || 'none'}
                  name={cardData.name || `Kart ${slotIdx + 1}`}
                  flavor={cardData.flavor || ''}
                  isFaceUp={isFaceUp}
                  size="md"
                  isSelectable={isSelectable}
                  isSelected={
                    isSelectedForSwap || isSelectedForPeek || isSelectedForMatch || isHoveredByDrag || isCurrentlyPeeked
                  }
                  selectionBadge={selectionBadge}
                  glowColor={
                    isCurrentlyPeeked
                      ? 'purple'
                      : isHoveredByDrag
                      ? 'gold'
                      : isPeeking
                      ? 'purple'
                      : isSwapping
                      ? 'purple'
                      : matchingMode
                      ? 'gold'
                      : 'gold'
                  }
                  badge={
                    isJustReplaced && !justReplacedSlot?.isClosing
                      ? 'YERLEŞTİRİLDİ'
                      : undefined
                  }
                  className={
                    isCurrentlyPeeked
                      ? 'ring-4 ring-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.7)] animate-pulse'
                      : isJustReplaced
                      ? 'ring-4 ring-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.8)]'
                      : ''
                  }
                  onClick={() => handleOwnCardClick(slotIdx)}
                />

                {/* Floating in-place PEEK banner above card */}
                {isCurrentlyPeeked && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap px-2 py-0.5 rounded-full bg-purple-600 border border-purple-300 text-white font-black text-[9px] shadow-[0_0_15px_rgba(168,85,247,0.8)] flex items-center gap-1 animate-bounce">
                    <Eye className="w-3 h-3" />
                    <span>RÖNTGEN (3s)</span>
                  </div>
                )}

                {/* Visual hover drop indicator badge when dragging over slot */}
                {isHoveredByDrag && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] shadow-lg animate-bounce">
                    BURAYA BIRAK
                  </div>
                )}

                {/* Victim Red Panel Overlay with Glowing Eye Icon when Spied by Rival */}
                {isSpiedByRival && (
                  <div className="absolute inset-0 z-40 rounded-xl overflow-hidden pointer-events-none flex flex-col items-center justify-center p-1.5 bg-gradient-to-b from-red-950/95 via-red-900/90 to-black/95 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.85)] ring-4 ring-red-500/60 animate-pulse">
                    {/* Scanning red laser line */}
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-400 shadow-[0_0_10px_#ef4444] animate-ping" />
                    <Eye className="w-6 h-6 text-red-400 drop-shadow-[0_0_12px_#ef4444] animate-bounce mb-0.5" />
                    <span className="text-[10px] font-black text-red-200 tracking-wider uppercase text-center leading-tight drop-shadow">
                      GÖZLENDİ!
                    </span>
                    <span className="text-[8px] text-red-300 font-bold truncate max-w-full text-center">
                      {activeSpiedAlert.byPlayerName}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rey-player-plaque">
          <span className="rey-player-avatar">{me?.avatar || '🧙'}</span>
          <span className="font-bold text-sm sm:text-base text-[#e6f4ea] flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-amber-300" />
            {me?.name} (Sen)
          </span>
          <span className="text-xs sm:text-sm font-semibold text-[#9db6a5] pl-3 border-l border-[#244b34]">
            Skor: <strong className="text-amber-200">{me?.score}</strong>
          </span>
        </div>
      </div>

      <GameActionDock
        canDraw={canDraw}
        canCallRey={canCallRey}
        canKamikaze={canKamikaze}
        hasDiscardCard={Boolean(gameState.topDiscardCard)}
        onDrawDeck={onDrawDeck}
        onDrawDiscard={onDrawDiscard}
        onCallRey={onCallRey}
        onCallKamikaze={onCallKamikaze}
      />
    </>
  );

  return (
    <div className="w-full h-screen h-[100dvh] flex flex-col justify-between overflow-hidden select-none relative bg-[#07170e]">
      {gameState.phase === 'playing' && (
        <div
          key={`${gameState.handNumber}-${gameState.activePlayerId}`}
          className={`rey-turn-cue-layer ${isMyTurn ? 'is-mine' : 'is-rival'}`}
          aria-live="polite"
        >
          <div className="rey-turn-cue-card">
            <span className="rey-turn-cue-kicker">{isMyTurn ? 'HAMLE ZAMANI' : 'SIRA DEĞİŞTİ'}</span>
            <strong>{isMyTurn ? 'SIRA SENDE' : `${gameState.players.find((p) => p.id === gameState.activePlayerId)?.name || 'RAKİP'} OYNUYOR`}</strong>
            <span className="rey-turn-cue-line" />
          </div>
        </div>
      )}

      {/* 1. FIXED TOP HEADER BAR */}
      <header className="rey-game-header">
        {/* Left: Brand logo & Game chips & Room code */}
        <div className="rey-game-header-meta">
          <div className="rey-game-brand">
            <span className="text-emerald-400 text-lg sm:text-xl">🌱</span>
            <span className="font-['Cinzel',serif] font-black text-amber-200 text-lg sm:text-xl tracking-wider">
              REY
            </span>
          </div>

          <span className="rey-hand-chip">
            El {gameState.handNumber || 1}/3
          </span>

          <span className="rey-turn-chip">
            Tur {gameState.turNumber || 1}/3
          </span>

          <button
            type="button"
            onClick={copyCode}
            className="rey-room-code"
            title="Oda kodunu kopyala"
          >
            <span>Oda:</span>
            <strong className="text-white font-bold">{gameState.roomCode}</strong>
            {copiedCode ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-amber-300" />
            )}
          </button>
        </div>

        {/* Center: Turn Status Pill */}
        <div className="rey-turn-status">
          {isMyTurn ? (
            <div className="rey-turn-pill rey-turn-pill-active animate-pulse-slow">
              <span>SIRA SENDE</span>
            </div>
          ) : (
            <div className="rey-turn-pill rey-turn-pill-passive">
              <span>SIRA RAKİPTE</span>
            </div>
          )}
        </div>

        {/* Right: Kurallar, Settings, Sound */}
        <div className="rey-game-tools">
          <button
            type="button"
            onClick={() => {
              sound.playCardSnap();
              onOpenRules();
            }}
            className="rey-rules-button"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-300" />
            <span className="rey-rules-label">Kurallar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playCardSnap();
              setShowSettingsModal(true);
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#14261d]/85 hover:bg-[#1e382b] border border-[#2d4d3a]/70 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer shadow-sm active:scale-95"
            title="Ayarlar"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#14261d]/85 hover:bg-[#1e382b] border border-[#2d4d3a]/70 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer shadow-sm active:scale-95"
            title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </header>

      {/* 2. REY ALERT BANNER (When Rey was called) */}
      {isReyActive && (
        <div className="w-full bg-gradient-to-r from-[#78350f] via-[#b45309] to-[#78350f] py-1 px-4 text-[#fef3c7] font-black text-xs text-center shadow-md border-y border-[#d97706]/40 z-20 flex items-center justify-center gap-2">
          <Crown className="w-4 h-4" />
          <span>
            {reyCaller?.name || 'Rakip'} "REY" DEDİ! Son hamlenin ardından el tamamlanacak!
          </span>
        </div>
      )}

      {/* 3. 2D ISOMETRIC FELT TABLE (Fills remaining screen without scrolling) */}
      <IsometricTable>{tableContent}</IsometricTable>

      {/* 4. FLOATING DRAGGED CARD (Follows touch/pointer across screen) */}
      {isCurrentlyDragging && gameState.currentDrawnCard && (
        <div
          className="fixed z-50 pointer-events-none select-none transition-transform duration-75"
          style={{
            left: dragPos.x,
            top: dragPos.y,
            transform: 'translate(-50%, -50%) rotate(4deg) scale(1.12)',
            filter: 'drop-shadow(0 20px 25px rgba(0,0,0,0.85))',
          }}
        >
          <CardView
            value={gameState.currentDrawnCard.value}
            ability={gameState.currentDrawnCard.ability}
            name={gameState.currentDrawnCard.name}
            flavor={gameState.currentDrawnCard.flavor}
            isFaceUp={true}
            size="md"
          />
        </div>
      )}

      {/* 5. TUR 2 SPECIAL POWER SELECTION MODAL */}
      <SpecialPowerModal
        isOpen={isChoosingPower}
        powers={me?.availablePowers || []}
        onSelectPower={onSelectPower}
      />

      {activePeek?.nextCard && (
        <div className="pointer-events-none fixed inset-x-0 top-[18%] z-40 flex justify-center">
          <div className="flex items-center gap-4 rounded-2xl border-2 border-purple-400/60 bg-[#160f22]/95 p-4 shadow-[0_0_35px_rgba(168,85,247,0.45)] backdrop-blur-md">
            <CardView
              value={activePeek.nextCard.value}
              ability={activePeek.nextCard.ability}
              name={activePeek.nextCard.name}
              flavor={activePeek.nextCard.flavor}
              isFaceUp={true}
              size="sm"
            />
            <div className="max-w-[180px] text-left">
              <div className="text-[10px] font-black uppercase tracking-widest text-purple-300">Röntgen Seviye 3</div>
              <div className="mt-1 text-sm font-black text-white">Sıradaki kart</div>
              <div className="mt-1 text-xs text-purple-100/75">Bir sonraki deste çekişinde bu kart gelecek.</div>
            </div>
          </div>
        </div>
      )}

      {/* 6. ACTIVE SWAP FLIGHT ANIMATION OVERLAY (Cards exchange positions face-down) */}
      {activeSwapAnimation && (
        <SwapFlightOverlay
          swap={activeSwapAnimation}
          slotRefs={slotRefs}
          oppSlotRefs={oppSlotRefs}
          myPlayerId={myPlayerId}
          players={gameState.players}
        />
      )}

      {/* 6b. ACTIVE MATCH DRAW FLIGHT OVERLAY (Center deck flip -> flight -> slot face-down flip) */}
      {activeMatchDrawAnimation && (
        <MatchDrawFlightOverlay
          anim={activeMatchDrawAnimation}
          slotRefs={slotRefs}
          oppSlotRefs={oppSlotRefs}
          deckPileRef={deckAreaRef}
          myPlayerId={myPlayerId}
          players={gameState.players}
        />
      )}

      {/* 7. SPIED NOTIFICATION BANNER FOR VICTIM */}
      {activeSpiedAlert && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#2b1216]/95 border-2 border-[#ef4444]/70 text-[#fecaca] text-xs sm:text-sm font-black flex items-center gap-2.5 shadow-[0_4px_20px_rgba(239,68,68,0.4)] animate-bounce pointer-events-none backdrop-blur-sm">
          <Eye className="w-5 h-5 text-red-400 animate-pulse shrink-0" />
          <span>
            <strong className="text-white underline">{activeSpiedAlert.byPlayerName}</strong> senin{' '}
            {activeSpiedAlert.isAll ? (
              <strong className="text-amber-300">TÜM KARTLARINI</strong>
            ) : (
              <strong className="text-amber-300">Slot {(activeSpiedAlert.slotIndex || 0) + 1}</strong>
            )}{' '}
            gözledi!
          </span>
        </div>
      )}

      {/* 8. MATCHING FEEDBACK BANNER (SUCCESS OR FAIL PENALTY) */}
      {matchFeedback && (
        <div
          className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center gap-2.5 shadow-2xl animate-bounce pointer-events-none backdrop-blur-md ${
            matchFeedback.isSuccess
              ? 'bg-[#132c1e]/95 border-emerald-400 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.5)]'
              : 'bg-[#2b1216]/95 border-rose-500 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.5)]'
          }`}
        >
          {matchFeedback.isSuccess ? (
            <Sparkles className="w-5 h-5 text-emerald-300 animate-spin" />
          ) : (
            <Flame className="w-5 h-5 text-rose-400 animate-pulse" />
          )}
          <span>{matchFeedback.text}</span>
        </div>
      )}

      {/* 9. SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#13241b] border border-amber-400/60 rounded-3xl p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-300" />
              <span>Ayarlar</span>
            </h3>

            <div className="flex flex-col gap-3 mb-6">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0b1610] border border-[#2d4d38]">
                <div className="flex items-center gap-2.5">
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-emerald-400" />
                  )}
                  <div>
                    <div className="text-sm font-bold text-white">Ses Efektleri</div>
                    <div className="text-[11px] text-[#8da898]">Kart çevirme & güç sesleri</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleMute}
                  className={`w-12 h-7 rounded-full p-1 transition cursor-pointer ${
                    !isMuted ? 'bg-emerald-500' : 'bg-stone-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      !isMuted ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-[#0b1610] border border-[#2d4d38] text-xs text-[#8da898]">
                <div className="font-bold text-white mb-1">REY v2.0</div>
                <div>Ghibli Studio Inspired Card Game</div>
                <div className="mt-1 text-[11px] text-amber-200/80">
                  Oda Kodu: <strong className="text-white font-mono">{gameState.roomCode}</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm transition cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
