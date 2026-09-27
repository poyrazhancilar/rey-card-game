import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  Card,
  ClientGameState,
  ActivePeekState,
  ActiveSpyRevealedState,
  ActiveSpiedAlertState,
  ActiveSwapAnimationState,
  ActiveMatchDrawAnimationState,
} from './types/game';
import { MainMenu } from './components/MainMenu';
import { Lobby } from './components/Lobby';
import { InitialPeekView } from './components/InitialPeekView';
import { GameBoard } from './components/GameBoard';
import { RoundOverModal } from './components/RoundOverModal';
import { RulesModal } from './components/RulesModal';
import { AdminPanel } from './components/AdminPanel';
import { sound } from './audio/soundEngine';
import { haptic } from './utils/haptics';
import { clearGameSession, readGameSession, saveGameSession } from './utils/gameSession';
import { Crown, LoaderCircle, Sparkles, Wifi, WifiOff } from 'lucide-react';

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting';

function ConnectionHoldOverlay({ isSelf, playerName }: { isSelf: boolean; playerName?: string }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#041009]/82 p-5 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl border border-amber-300/45 bg-[#102219]/96 px-6 py-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-amber-300/35 bg-amber-400/10 text-amber-200">
          {isSelf ? <LoaderCircle className="h-7 w-7 animate-spin" /> : <WifiOff className="h-7 w-7 animate-pulse" />}
        </div>
        <span className="text-[10px] font-black tracking-[0.2em] text-amber-300/80">OYUN DURAKLATILDI</span>
        <h2 className="mt-2 text-xl font-black text-[#f7f0d5]">
          {isSelf ? 'Bağlantın yeniden kuruluyor' : `${playerName || 'Rakip'} bekleniyor`}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#b8cbbf]">
          {isSelf
            ? 'Aynı koltuğa güvenli biçimde dönüyorsun. Sayfayı kapatmadan kısa bir süre bekle.'
            : 'Rakibin bağlantısını kaybetti. Kartlar ve oyun durumu korunuyor; yeniden bağlandığında oyun otomatik devam edecek.'}
        </p>
        <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-emerald-400/15 bg-black/20 px-3 py-2 text-[11px] font-bold text-emerald-200/75">
          <Crown className="h-3.5 w-3.5" />
          <span>REY masası güvenli beklemede</span>
        </div>
      </div>
    </div>
  );
}

function GameApp() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');

  // Welcome screen state
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('rey_player_name') || localStorage.getItem('cabo_player_name') || ''
  );
  const [selectedAvatar, setSelectedAvatar] = useState(
    () => localStorage.getItem('rey_avatar') || localStorage.getItem('cabo_avatar') || '🌱'
  );
  const [inputRoomCode, setInputRoomCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room')?.trim() || '';
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());
  const [adminOverrideNotice, setAdminOverrideNotice] = useState<string | null>(null);
  const [roundSummaryReadyKey, setRoundSummaryReadyKey] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [connectionNotice, setConnectionNotice] = useState<{ message: string; connected: boolean } | null>(null);

  // Active in-place flip and power visual effects
  const [activePeek, setActivePeek] = useState<ActivePeekState | null>(null);
  const [activeSpyRevealed, setActiveSpyRevealed] = useState<ActiveSpyRevealedState | null>(null);
  const [activeSpiedAlert, setActiveSpiedAlert] = useState<ActiveSpiedAlertState | null>(null);
  const [activeSwapAnimation, setActiveSwapAnimation] = useState<ActiveSwapAnimationState | null>(null);
  const [activeMatchDrawAnimation, setActiveMatchDrawAnimation] = useState<ActiveMatchDrawAnimationState | null>(null);

  const peekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spiedAlertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swapAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchDrawAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminOverrideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const summaryRoomCode = gameState?.roomCode;
  const summaryHandNumber = gameState?.handNumber;
  const summaryPhase = gameState?.phase;
  const disconnectedHuman = gameState?.players.find((player) => !player.isAI && !player.connected);

  // Connect to Socket.IO
  useEffect(() => {
    const newSocket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to Rey server, socket ID:', newSocket.id);
      const storedSession = readGameSession();
      const urlRoomCode = new URLSearchParams(window.location.search).get('room')?.trim();
      if (!storedSession || urlRoomCode !== storedSession.roomCode) {
        setConnectionStatus('connected');
        return;
      }

      setConnectionStatus('reconnecting');
      newSocket.emit(
        'resume_session',
        storedSession,
        (res: {
          success: boolean;
          roomCode?: string;
          playerId?: string;
          reconnectToken?: string;
          gameState?: ClientGameState;
          error?: string;
        }) => {
          if (res.success && res.roomCode && res.playerId && res.reconnectToken && res.gameState) {
            saveGameSession({
              roomCode: res.roomCode,
              playerId: res.playerId,
              reconnectToken: res.reconnectToken,
            });
            setMyPlayerId(res.playerId);
            setGameState(res.gameState);
            setErrorMessage(null);
            setConnectionStatus('connected');
          } else {
            clearGameSession();
            setMyPlayerId('');
            setGameState(null);
            setConnectionStatus('connected');
            setErrorMessage(res.error || 'Önceki oyun oturumu geri yüklenemedi');
          }
        }
      );
    });

    newSocket.on('disconnect', () => {
      if (readGameSession()) {
        setConnectionStatus('reconnecting');
        haptic('warning');
      } else {
        setConnectionStatus('connecting');
      }
    });

    newSocket.on('connect_error', () => {
      setConnectionStatus(readGameSession() ? 'reconnecting' : 'connecting');
    });

    newSocket.on(
      'player_connection_changed',
      (data: { playerName?: string; connected?: boolean; expired?: boolean }) => {
        const connected = Boolean(data.connected);
        const message = data.expired
          ? `${data.playerName || 'Oyuncu'} zamanında geri dönemedi.`
          : connected
          ? `${data.playerName || 'Oyuncu'} yeniden bağlandı. Oyun devam ediyor.`
          : `${data.playerName || 'Oyuncu'} bağlantısını kaybetti. Oyun duraklatıldı.`;
        setConnectionNotice({ message, connected });
        if (connectionNoticeTimeoutRef.current) clearTimeout(connectionNoticeTimeoutRef.current);
        connectionNoticeTimeoutRef.current = setTimeout(() => setConnectionNotice(null), connected ? 2600 : 5000);
        if (connected) {
          sound.playTurnStart();
          haptic('success');
        } else {
          sound.playTurnPass();
          haptic('warning');
        }
      }
    );

    newSocket.on('room_closed', (data: { message?: string }) => {
      clearGameSession();
      setMyPlayerId('');
      setGameState(null);
      setConnectionStatus('connected');
      setErrorMessage(data.message || 'Oyun oturumu kapatıldı');
      window.history.replaceState({}, '', window.location.pathname);
    });

    newSocket.on('game_state', (state: ClientGameState) => {
      setGameState(state);
    });

    newSocket.on('sound_effect', (data: { name: string }) => {
      sound.playEffect(data.name);
    });

    newSocket.on('admin_override_notice', (data: { message?: string; durationMs?: number }) => {
      haptic('warning');
      if (adminOverrideTimeoutRef.current) clearTimeout(adminOverrideTimeoutRef.current);
      setAdminOverrideNotice(data.message || 'REY YÖNETİMİ OYUN AKIŞINA MÜDAHALE ETTİ');
      adminOverrideTimeoutRef.current = setTimeout(() => {
        setAdminOverrideNotice(null);
      }, data.durationMs || 5000);
    });

    // 1. PEEK: Flips card face-up in place for 3 seconds
    newSocket.on('peek_result', (data: { card: Card; slotIndex: number; durationMs?: number }) => {
      sound.playPeek();
      const duration = data.durationMs || 3000;
      if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
      setActivePeek({ slotIndex: data.slotIndex, card: data.card });
      peekTimeoutRef.current = setTimeout(() => {
        setActivePeek(null);
      }, duration);
    });

    // 1b. PEEK 2: Flips both closed cards (slots 2 & 3) face-up in place for 3 seconds
    newSocket.on('peek_2_result', (data: { slots: number[]; cards: Card[]; durationMs?: number }) => {
      sound.playPeek();
      const duration = data.durationMs || 3000;
      if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
      setActivePeek({ slots: data.slots, cards: data.cards });
      peekTimeoutRef.current = setTimeout(() => {
        setActivePeek(null);
      }, duration);
    });

    newSocket.on('peek_3_result', (data: { slots: number[]; cards: Card[]; nextCard?: Card; durationMs?: number }) => {
      sound.playPeek();
      const duration = data.durationMs || 4000;
      if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
      setActivePeek({ slots: data.slots, cards: data.cards, nextCard: data.nextCard });
      peekTimeoutRef.current = setTimeout(() => {
        setActivePeek(null);
      }, duration);
    });

    // 2. SPY (SPYER): Flips rival card face-up in rival slot for 3 seconds
    newSocket.on(
      'spy_result',
      (data: { card: Card; targetPlayerId: string; slotIndex: number; durationMs?: number }) => {
        sound.playSpy();
        const duration = data.durationMs || 3000;
        if (spyTimeoutRef.current) clearTimeout(spyTimeoutRef.current);
        setActiveSpyRevealed({
          card: data.card,
          targetPlayerId: data.targetPlayerId,
          slotIndex: data.slotIndex,
        });
        spyTimeoutRef.current = setTimeout(() => {
          setActiveSpyRevealed(null);
        }, duration);
      }
    );

    // 2b. SPY ALL: Flips all rival cards face-up for 3 seconds
    newSocket.on(
      'spy_all_result',
      (data: { targetPlayerId: string; cards: Card[]; durationMs?: number }) => {
        sound.playSpy();
        const duration = data.durationMs || 3000;
        if (spyTimeoutRef.current) clearTimeout(spyTimeoutRef.current);
        setActiveSpyRevealed({
          targetPlayerId: data.targetPlayerId,
          cards: data.cards,
          isAll: true,
        });
        spyTimeoutRef.current = setTimeout(() => {
          setActiveSpyRevealed(null);
        }, duration);
      }
    );

    newSocket.on(
      'spy_multi_result',
      (data: { targetPlayerId: string; slots: number[]; cards: Card[]; durationMs?: number }) => {
        sound.playSpy();
        const duration = data.durationMs || 3000;
        if (spyTimeoutRef.current) clearTimeout(spyTimeoutRef.current);
        setActiveSpyRevealed({
          targetPlayerId: data.targetPlayerId,
          slots: data.slots,
          cards: data.cards,
        });
        spyTimeoutRef.current = setTimeout(() => {
          setActiveSpyRevealed(null);
        }, duration);
      }
    );

    // 3. SPY (VICTIM): Shows red overlay panel with glowing animated eye on victim's card
    newSocket.on(
      'spied_alert',
      (data: { byPlayerName: string; slotIndex?: number; slots?: number[]; isAll?: boolean; durationMs?: number }) => {
        sound.playSpy();
        haptic('warning');
        const duration = data.durationMs || 3000;
        if (spiedAlertTimeoutRef.current) clearTimeout(spiedAlertTimeoutRef.current);
        setActiveSpiedAlert({
          byPlayerName: data.byPlayerName,
          slotIndex: data.slotIndex,
          slots: data.slots,
          isAll: data.isAll,
        });
        spiedAlertTimeoutRef.current = setTimeout(() => {
          setActiveSpiedAlert(null);
        }, duration);
      }
    );

    // 4. SWAP: Animated card exchange flight visible to all players (cards face-down)
    newSocket.on(
      'swap_animation',
      (data: {
        fromPlayerId: string;
        fromSlotIndex: number;
        fromSlotIndices?: number[];
        toPlayerId: string;
        toSlotIndex: number;
        toSlotIndices?: number[];
        durationMs?: number;
        isSwapAll?: boolean;
      }) => {
        sound.playSwap();
        const duration = data.durationMs || 1400;
        if (swapAnimationTimeoutRef.current) clearTimeout(swapAnimationTimeoutRef.current);
        setActiveSwapAnimation({
          fromPlayerId: data.fromPlayerId,
          fromSlotIndex: data.fromSlotIndex,
          fromSlotIndices: data.fromSlotIndices,
          toPlayerId: data.toPlayerId,
          toSlotIndex: data.toSlotIndex,
          toSlotIndices: data.toSlotIndices,
          durationMs: duration,
          isSwapAll: data.isSwapAll,
        });
        swapAnimationTimeoutRef.current = setTimeout(() => {
          setActiveSwapAnimation(null);
        }, duration);
      }
    );

    // 5. MATCH DRAW: Animated flight from deck pile to player slot, flips open then closed
    newSocket.on(
      'match_draw_animation',
      (data: ActiveMatchDrawAnimationState) => {
        sound.playMatchSuccess();
        const duration = data.durationMs || 2200;
        if (matchDrawAnimationTimeoutRef.current) clearTimeout(matchDrawAnimationTimeoutRef.current);
        setActiveMatchDrawAnimation(data);
        matchDrawAnimationTimeoutRef.current = setTimeout(() => {
          setActiveMatchDrawAnimation(null);
        }, duration);
      }
    );

    setSocket(newSocket);

    return () => {
      if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
      if (spyTimeoutRef.current) clearTimeout(spyTimeoutRef.current);
      if (spiedAlertTimeoutRef.current) clearTimeout(spiedAlertTimeoutRef.current);
      if (swapAnimationTimeoutRef.current) clearTimeout(swapAnimationTimeoutRef.current);
      if (matchDrawAnimationTimeoutRef.current) clearTimeout(matchDrawAnimationTimeoutRef.current);
      if (adminOverrideTimeoutRef.current) clearTimeout(adminOverrideTimeoutRef.current);
      if (connectionNoticeTimeoutRef.current) clearTimeout(connectionNoticeTimeoutRef.current);
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!summaryRoomCode || (summaryPhase !== 'round_over' && summaryPhase !== 'game_over')) return;

    const summaryKey = `${summaryRoomCode}:${summaryHandNumber}:${summaryPhase}`;
    sound.playRoundReveal();
    haptic('impact');
    const revealTimer = setTimeout(() => setRoundSummaryReadyKey(summaryKey), 850);
    return () => clearTimeout(revealTimer);
  }, [summaryRoomCode, summaryHandNumber, summaryPhase]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  const handleCreateRoom = () => {
    if (!socket) return;
    const trimmedName = playerName.trim() || 'Player';
    localStorage.setItem('rey_player_name', trimmedName);
    localStorage.setItem('rey_avatar', selectedAvatar);

    sound.playCardSnap();
    socket.emit(
      'create_room',
      { hostName: trimmedName, avatar: selectedAvatar },
      (res: { success: boolean; roomCode?: string; playerId?: string; reconnectToken?: string; error?: string }) => {
        if (res.success && res.roomCode && res.playerId && res.reconnectToken) {
          saveGameSession({ roomCode: res.roomCode, playerId: res.playerId, reconnectToken: res.reconnectToken });
          setMyPlayerId(res.playerId);
          window.history.replaceState({}, '', `?room=${res.roomCode}`);
        } else {
          setErrorMessage(res.error || 'Oda oluşturulamadı');
        }
      }
    );
  };

  const handleJoinRoom = () => {
    if (!socket) return;
    const trimmedCode = inputRoomCode.trim();
    if (trimmedCode.length !== 6) {
      setErrorMessage('Lütfen 6 haneli geçerli oda kodunu girin');
      return;
    }

    const trimmedName = playerName.trim() || 'Player';
    localStorage.setItem('rey_player_name', trimmedName);
    localStorage.setItem('rey_avatar', selectedAvatar);

    sound.playCardSnap();
    socket.emit(
      'join_room',
      { roomCode: trimmedCode, playerName: trimmedName, avatar: selectedAvatar },
      (res: { success: boolean; roomCode?: string; playerId?: string; reconnectToken?: string; error?: string }) => {
        if (res.success && res.roomCode && res.playerId && res.reconnectToken) {
          saveGameSession({ roomCode: res.roomCode, playerId: res.playerId, reconnectToken: res.reconnectToken });
          setMyPlayerId(res.playerId);
          window.history.replaceState({}, '', `?room=${res.roomCode}`);
        } else {
          setErrorMessage(res.error || 'Odaya katılınamadı');
        }
      }
    );
  };

  // Lobby actions
  const handleStartGame = () => {
    if (!socket || !gameState) return;
    sound.playCardDraw();
    socket.emit('start_game', { roomCode: gameState.roomCode, playerId: myPlayerId });
  };

  const handleAddAI = () => {
    if (!socket || !gameState) return;
    sound.playCardFlip();
    socket.emit('add_ai', { roomCode: gameState.roomCode });
  };

  const handleRemoveAI = (aiId: string) => {
    if (!socket || !gameState) return;
    socket.emit('remove_ai', { roomCode: gameState.roomCode, aiId });
  };

  // Initial Peek action
  const handleInitialPeek = (indices: number[], callback: (cards: Card[]) => void) => {
    if (!socket || !gameState) return;
    socket.emit(
      'initial_peek',
      { roomCode: gameState.roomCode, playerId: myPlayerId, indices },
      (res: { success: boolean; peekedCards?: Card[]; error?: string }) => {
        if (res.success && res.peekedCards) {
          callback(res.peekedCards);
        }
      }
    );
  };

  const handleConfirmInitialPeek = () => {
    if (!socket || !gameState) return;
    socket.emit('confirm_initial_peek', { roomCode: gameState.roomCode, playerId: myPlayerId });
  };

  // Game Board actions
  const handleDrawDeck = () => {
    if (!socket || !gameState) return;
    socket.emit('draw_card', { roomCode: gameState.roomCode, playerId: myPlayerId, source: 'deck' });
  };

  const handleDrawDiscard = () => {
    if (!socket || !gameState) return;
    socket.emit('draw_card', { roomCode: gameState.roomCode, playerId: myPlayerId, source: 'discard' });
  };

  const handleReplaceCard = (slotIndex: number) => {
    if (!socket || !gameState) return;
    socket.emit('replace_card', { roomCode: gameState.roomCode, playerId: myPlayerId, slotIndex });
  };

  const handleDiscardDrawn = (usePower: boolean) => {
    if (!socket || !gameState) return;
    socket.emit('discard_drawn', { roomCode: gameState.roomCode, playerId: myPlayerId, usePower });
  };

  const handleExecutePeek = (slotIndex: number) => {
    if (!socket || !gameState) return;
    socket.emit('execute_peek', { roomCode: gameState.roomCode, playerId: myPlayerId, slotIndex });
  };

  const handleExecuteSpy = (targetPlayerId: string, slotIndex: number) => {
    if (!socket || !gameState) return;
    socket.emit('execute_spy', {
      roomCode: gameState.roomCode,
      playerId: myPlayerId,
      targetPlayerId,
      slotIndex,
    });
  };

  const handleExecuteSwap = (ownSlotIndex: number, targetPlayerId: string, targetSlotIndex: number) => {
    if (!socket || !gameState) return;
    socket.emit('execute_swap', {
      roomCode: gameState.roomCode,
      playerId: myPlayerId,
      ownSlotIndex,
      targetPlayerId,
      targetSlotIndex,
    });
  };

  const handleMatchDiscard = (indices: number[]) => {
    if (!socket || !gameState) return;
    socket.emit('discard_pair', {
      roomCode: gameState.roomCode,
      playerId: myPlayerId,
      indices,
    });
  };

  const handleDiscardPair = (indices: number[], callback?: (res: any) => void) => {
    if (!socket || !gameState) return;
    socket.emit(
      'discard_pair',
      {
        roomCode: gameState.roomCode,
        playerId: myPlayerId,
        indices,
      },
      (res: any) => {
        if (typeof callback === 'function') {
          callback(res);
        }
      }
    );
  };

  const handleCallRey = () => {
    if (!socket || !gameState) return;
    socket.emit('call_rey', { roomCode: gameState.roomCode, playerId: myPlayerId });
  };

  const handleCallKamikaze = () => {
    if (!socket || !gameState) return;
    socket.emit('call_kamikaze', { roomCode: gameState.roomCode, playerId: myPlayerId });
  };

  const handleSelectPower = (powerId: string) => {
    if (!socket || !gameState) return;
    socket.emit('select_power', { roomCode: gameState.roomCode, playerId: myPlayerId, powerId });
  };

  const handleNextHand = () => {
    if (!socket || !gameState) return;
    socket.emit('next_hand', { roomCode: gameState.roomCode, playerId: myPlayerId });
  };

  const handleRestartParti = () => {
    if (!socket || !gameState) return;
    socket.emit('restart_parti', { roomCode: gameState.roomCode, playerId: myPlayerId });
  };

  // 1. RENDER EXACT REY MAIN MENU (if not in a room)
  if (!gameState) {
    return (
      <>
        <MainMenu
          playerName={playerName}
          setPlayerName={setPlayerName}
          selectedAvatar={selectedAvatar}
          setSelectedAvatar={setSelectedAvatar}
          inputRoomCode={inputRoomCode}
          setInputRoomCode={setInputRoomCode}
          errorMessage={errorMessage}
          setErrorMessage={setErrorMessage}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onOpenRules={() => setIsRulesOpen(true)}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
        <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
        {connectionStatus === 'reconnecting' && <ConnectionHoldOverlay isSelf />}
      </>
    );
  }

  // 2. IN-ROOM GAME PHASES
  const roundSummaryKey = `${gameState.roomCode}:${gameState.handNumber}:${gameState.phase}`;
  const isRoundConcluded = gameState.phase === 'round_over' || gameState.phase === 'game_over';
  const showRoundSummary = isRoundConcluded && roundSummaryReadyKey === roundSummaryKey;

  return (
    <div className={`min-h-screen bg-gradient-to-b from-[#0f1b14] via-[#14261c] to-[#0c1610] flex flex-col justify-between ${
      gameState.phase !== 'lobby' ? 'h-screen h-[100dvh] overflow-hidden' : ''
    }`}>
      {adminOverrideNotice && (
        <div className="pointer-events-none fixed left-1/2 top-16 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-amber-300/70 bg-gradient-to-r from-[#78350f] via-[#b45309] to-[#78350f] px-5 py-3 text-center text-xs font-black text-[#fef3c7] shadow-[0_12px_40px_rgba(245,158,11,0.45)] sm:text-sm">
          <Crown className="h-5 w-5 shrink-0 text-amber-200" />
          <span>{adminOverrideNotice}</span>
        </div>
      )}
      {connectionNotice && connectionStatus === 'connected' && !disconnectedHuman && (
        <div
          className={`pointer-events-none fixed left-1/2 top-16 z-[190] flex -translate-x-1/2 items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-black shadow-xl ${
            connectionNotice.connected
              ? 'border-emerald-300/55 bg-[#123524]/95 text-emerald-100'
              : 'border-amber-300/55 bg-[#4a2c0d]/95 text-amber-100'
          }`}
        >
          {connectionNotice.connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          <span>{connectionNotice.message}</span>
        </div>
      )}
      {(connectionStatus !== 'connected' || disconnectedHuman) && (
        <ConnectionHoldOverlay
          isSelf={connectionStatus !== 'connected'}
          playerName={connectionStatus === 'connected' ? disconnectedHuman?.name : undefined}
        />
      )}
      {gameState.phase === 'lobby' && (
        <Lobby
          gameState={gameState}
          myPlayerId={myPlayerId}
          onStartGame={handleStartGame}
          onAddAI={handleAddAI}
          onRemoveAI={handleRemoveAI}
          onOpenRules={() => setIsRulesOpen(true)}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
      )}

      {gameState.phase === 'initial_peek' && (
        <InitialPeekView
          gameState={gameState}
          myPlayerId={myPlayerId}
          onInitialPeek={handleInitialPeek}
          onConfirmInitialPeek={handleConfirmInitialPeek}
        />
      )}

      {(gameState.phase === 'playing' || gameState.phase === 'round_over' || gameState.phase === 'game_over') && (
        <GameBoard
          gameState={gameState}
          myPlayerId={myPlayerId}
          onDrawDeck={handleDrawDeck}
          onDrawDiscard={handleDrawDiscard}
          onReplaceCard={handleReplaceCard}
          onDiscardDrawn={handleDiscardDrawn}
          onExecutePeek={handleExecutePeek}
          onExecuteSpy={handleExecuteSpy}
          onExecuteSwap={handleExecuteSwap}
          onMatchDiscard={handleMatchDiscard}
          onDiscardPair={handleDiscardPair}
          onCallRey={handleCallRey}
          onCallKamikaze={handleCallKamikaze}
          onSelectPower={handleSelectPower}
          onCallCabo={handleCallRey}
          onOpenRules={() => setIsRulesOpen(true)}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          activePeek={activePeek}
          activeSpyRevealed={activeSpyRevealed}
          activeSpiedAlert={activeSpiedAlert}
          activeSwapAnimation={activeSwapAnimation}
          activeMatchDrawAnimation={activeMatchDrawAnimation}
        />
      )}

      {isRoundConcluded && !showRoundSummary && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/25 backdrop-blur-[1px] pointer-events-none">
          <div className="rey-round-reveal-cue">
            <Sparkles className="h-5 w-5 text-amber-300" />
            <span>KARTLAR AÇILIYOR</span>
          </div>
        </div>
      )}

      {/* Round Over / Game Over Celebration Modal */}
      {showRoundSummary && (
        <RoundOverModal
          gameState={gameState}
          myPlayerId={myPlayerId}
          onNextRound={handleNextHand}
          onRestartGame={handleRestartParti}
        />
      )}

      {/* Rules Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}

export function App() {
  if (window.location.pathname.startsWith('/admin')) {
    return <AdminPanel />;
  }

  return <GameApp />;
}

export default App;
