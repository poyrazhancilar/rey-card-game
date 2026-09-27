import { AdminSessionDetail, AdminSessionSummary, Card, GameState, Player } from './types.js';
import { CaboGameEngine } from './gameEngine.js';
import { CaboAIController } from './aiPlayer.js';
import { createDeck } from './cards.js';
import { randomBytes } from 'crypto';

export interface GameRoom {
  code: string;
  hostId: string;
  players: Player[];
  state: GameState;
  deck: Card[];
  socketPlayerMap: Map<string, string>; // socketId -> playerId
  playerSocketMap: Map<string, string>; // playerId -> socketId
  playerReconnectTokens: Map<string, string>; // playerId -> private reconnect token
  createdAt: number;
}

export class RoomManager {
  private static rooms: Map<string, GameRoom> = new Map();
  private static adminSessions: Map<string, AdminSessionDetail> = new Map();

  // Generate a random 6-digit code (e.g. "492018")
  public static generateRoomCode(): string {
    let code = '';
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (this.rooms.has(code));
    return code;
  }

  public static getRoom(code: string): GameRoom | undefined {
    return this.rooms.get(code);
  }

  public static isRoomActive(code: string): boolean {
    return this.rooms.has(code);
  }

  public static recordAdminSnapshot(room: GameRoom, isActive: boolean = this.rooms.has(room.code)): AdminSessionDetail {
    const now = Date.now();
    const previous = this.adminSessions.get(room.code);
    const state = structuredClone(room.state);
    const drawPile = structuredClone(room.deck);
    const activePlayer = room.players.find((player) => player.id === room.state.activePlayerId);
    const isCompleted = room.state.phase === 'game_over' || !isActive;

    const detail: AdminSessionDetail = {
      roomCode: room.code,
      phase: room.state.phase,
      createdAt: room.createdAt,
      updatedAt: now,
      endedAt: isCompleted ? previous?.endedAt || now : null,
      isActive,
      playerCount: room.players.length,
      connectedHumanCount: room.players.filter((player) => !player.isAI && player.connected).length,
      handNumber: room.state.handNumber,
      turNumber: room.state.turNumber,
      activePlayerId: room.state.activePlayerId,
      activePlayerName: activePlayer?.name || null,
      players: room.players.map((player) => ({
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        isAI: player.isAI,
        connected: player.connected,
        score: player.score,
        cardCount: player.cards.length,
      })),
      hostId: room.hostId,
      state,
      drawPile,
      drawPileTopFirst: [...drawPile].reverse(),
      discardPileTopFirst: [...state.discardPile].reverse(),
      socketConnections: room.socketPlayerMap.size,
    };

    this.adminSessions.set(room.code, detail);
    return detail;
  }

  public static getAdminSessions(): AdminSessionSummary[] {
    return [...this.adminSessions.values()]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((session) => ({
        roomCode: session.roomCode,
        phase: session.phase,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        endedAt: session.endedAt,
        isActive: session.isActive,
        playerCount: session.playerCount,
        connectedHumanCount: session.connectedHumanCount,
        handNumber: session.handNumber,
        turNumber: session.turNumber,
        activePlayerId: session.activePlayerId,
        activePlayerName: session.activePlayerName,
        players: session.players,
      }));
  }

  public static getAdminSession(roomCode: string): AdminSessionDetail | undefined {
    const activeRoom = this.rooms.get(roomCode);
    if (activeRoom) {
      return this.recordAdminSnapshot(activeRoom, true);
    }
    return this.adminSessions.get(roomCode);
  }

  public static removeAdminSession(roomCode: string): void {
    this.adminSessions.delete(roomCode);
  }

  public static getRoomBySocketId(socketId: string): { room?: GameRoom; playerId?: string } {
    for (const room of this.rooms.values()) {
      if (room.socketPlayerMap.has(socketId)) {
        return { room, playerId: room.socketPlayerMap.get(socketId) };
      }
    }
    return {};
  }

  private static createReconnectToken(): string {
    return randomBytes(32).toString('base64url');
  }

  public static isRoomPaused(room: GameRoom): boolean {
    return room.players.some((player) => !player.isAI && !player.connected);
  }

  public static createRoom(
    hostName: string,
    avatar: string,
    socketId: string
  ): { room: GameRoom; player: Player; reconnectToken: string } {
    const code = this.generateRoomCode();
    const playerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const reconnectToken = this.createReconnectToken();

    const hostPlayer: Player = {
      id: playerId,
      name: hostName.trim() || 'Host',
      isHost: true,
      isAI: false,
      avatar: avatar || '🧙‍♂️',
      cards: [],
      cardCount: 0,
      initialPeeksDone: false,
      score: 0,
      roundScore: 0,
      connected: true,
    };

    const emptyState: GameState = {
      roomCode: code,
      phase: 'lobby',
      players: [hostPlayer],
      currentTurnIndex: 0,
      activePlayerId: playerId,
      caboCallerId: null,
      drawPileCount: 0,
      discardPile: [],
      currentDrawnCard: null,
      turnSubPhase: 'idle',
      roundNumber: 1,
      handNumber: 1,
      maxHands: 3,
      turNumber: 1,
      turnsTakenInHand: {},
      actionLogs: [
        {
          id: `log_init_${Date.now()}`,
          timestamp: Date.now(),
          text: `Room ${code} created. Waiting for players...`,
          type: 'info',
        },
      ],
    };

    const room: GameRoom = {
      code,
      hostId: playerId,
      players: [hostPlayer],
      state: emptyState,
      deck: [],
      socketPlayerMap: new Map([[socketId, playerId]]),
      playerSocketMap: new Map([[playerId, socketId]]),
      playerReconnectTokens: new Map([[playerId, reconnectToken]]),
      createdAt: Date.now(),
    };

    this.rooms.set(code, room);
    this.recordAdminSnapshot(room, true);
    return { room, player: hostPlayer, reconnectToken };
  }

  public static joinRoom(
    code: string,
    playerName: string,
    avatar: string,
    socketId: string
  ): { success: boolean; room?: GameRoom; player?: Player; reconnectToken?: string; error?: string } {
    const room = this.rooms.get(code);
    if (!room) {
      return { success: false, error: 'Room not found. Check the 6-digit code!' };
    }

    if (room.state.phase !== 'lobby') {
      return { success: false, error: 'Game has already started in this room.' };
    }

    if (room.players.length >= 2) {
      return { success: false, error: 'Rey 2 kişilik bir oyundur (Maksimum 2 oyuncu).' };
    }

    const playerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const reconnectToken = this.createReconnectToken();
    const newPlayer: Player = {
      id: playerId,
      name: playerName.trim() || `Player ${room.players.length + 1}`,
      isHost: false,
      isAI: false,
      avatar: avatar || '🧝‍♀️',
      cards: [],
      cardCount: 0,
      initialPeeksDone: true,
      score: 0,
      roundScore: 0,
      connected: true,
    };

    room.players.push(newPlayer);
    room.state.players = room.players;
    room.socketPlayerMap.set(socketId, playerId);
    room.playerSocketMap.set(playerId, socketId);
    room.playerReconnectTokens.set(playerId, reconnectToken);

    room.state.actionLogs.unshift({
      id: `log_join_${Date.now()}`,
      timestamp: Date.now(),
      text: `${newPlayer.name} odaya katıldı!`,
      type: 'info',
    });

    return { success: true, room, player: newPlayer, reconnectToken };
  }

  public static resumePlayer(
    roomCode: string,
    playerId: string,
    reconnectToken: string,
    socketId: string
  ): {
    success: boolean;
    room?: GameRoom;
    player?: Player;
    reconnectToken?: string;
    previousSocketId?: string;
    error?: string;
  } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Oyun oturumu artık mevcut değil' };

    const player = room.players.find((candidate) => candidate.id === playerId && !candidate.isAI);
    const expectedToken = room.playerReconnectTokens.get(playerId);
    if (!player || !expectedToken || expectedToken !== reconnectToken) {
      return { success: false, error: 'Yeniden bağlanma anahtarı geçersiz' };
    }

    const previousSocketId = room.playerSocketMap.get(playerId);
    if (previousSocketId) room.socketPlayerMap.delete(previousSocketId);

    room.socketPlayerMap.set(socketId, playerId);
    room.playerSocketMap.set(playerId, socketId);
    player.connected = true;

    room.state.actionLogs.unshift({
      id: `log_reconnect_${Date.now()}`,
      timestamp: Date.now(),
      text: `${player.name} yeniden bağlandı. Oyun devam ediyor.`,
      type: 'info',
    });

    return {
      success: true,
      room,
      player,
      reconnectToken: expectedToken,
      previousSocketId: previousSocketId && previousSocketId !== socketId ? previousSocketId : undefined,
    };
  }

  public static addAI(roomCode: string): { success: boolean; aiPlayer?: Player; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.state.phase !== 'lobby') return { success: false, error: 'Game already in progress' };
    if (room.players.length >= 2) return { success: false, error: 'Oda dolu (Maksimum 2 oyuncu).' };

    const botNames = ['Bot Rey', 'Bot Nova', 'Bot Stella', 'Bot Atlas'];
    const botAvatars = ['🤖', '🐺', '🦊', '🦉'];

    const aiCount = room.players.filter((p) => p.isAI).length;
    const name = botNames[aiCount % botNames.length];
    const avatar = botAvatars[aiCount % botAvatars.length];
    const aiId = `ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const aiPlayer: Player = {
      id: aiId,
      name,
      isHost: false,
      isAI: true,
      avatar,
      cards: [],
      cardCount: 0,
      initialPeeksDone: true,
      score: 0,
      roundScore: 0,
      connected: true,
    };

    room.players.push(aiPlayer);
    room.state.players = room.players;

    room.state.actionLogs.unshift({
      id: `log_ai_${Date.now()}`,
      timestamp: Date.now(),
      text: `${aiPlayer.name} masaya oturdu.`,
      type: 'info',
    });

    return { success: true, aiPlayer };
  }

  public static removeAI(roomCode: string, aiId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.state.phase !== 'lobby') return { success: false, error: 'Game already in progress' };

    const idx = room.players.findIndex((p) => p.id === aiId && p.isAI);
    if (idx === -1) return { success: false, error: 'AI player not found' };

    const removed = room.players.splice(idx, 1)[0];
    room.state.players = room.players;
    CaboAIController.resetMemory(aiId);

    room.state.actionLogs.unshift({
      id: `log_ai_rem_${Date.now()}`,
      timestamp: Date.now(),
      text: `${removed.name} masadan kalktı.`,
      type: 'info',
    });

    return { success: true };
  }

  public static startGame(roomCode: string, hostPlayerId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (this.isRoomPaused(room)) return { success: false, error: 'Bağlantısı kesilen oyuncu bekleniyor' };
    if (room.hostId !== hostPlayerId) return { success: false, error: 'Yalnızca kurucu oyunu başlatabilir' };
    if (room.players.length !== 2) return { success: false, error: 'Rey tam 2 oyuncu ile oynanır (1 Rakip veya Bot ekleyin)!' };

    const deck = createDeck();
    room.deck = deck;

    // Reset AI memories
    room.players.filter((p) => p.isAI).forEach((ai) => CaboAIController.resetMemory(ai.id));

    // Initialize hand 1 of parti
    const newState = CaboGameEngine.initGame(room.players, 1, deck);
    newState.roomCode = roomCode;
    room.state = newState;
    room.players = newState.players;

    // AI players automatically perform initial peek
    room.players.filter((p) => p.isAI).forEach((ai) => {
      CaboAIController.handleInitialPeek(room.state, ai);
    });

    return { success: true };
  }

  public static startNextRound(roomCode: string, hostPlayerId: string): { success: boolean; error?: string } {
    return this.startNextHand(roomCode, hostPlayerId);
  }

  public static startNextHand(roomCode: string, hostPlayerId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (this.isRoomPaused(room)) return { success: false, error: 'Bağlantısı kesilen oyuncu bekleniyor' };
    if (room.hostId !== hostPlayerId) return { success: false, error: 'Yalnızca kurucu yeni ele geçebilir' };

    const deck = createDeck();
    room.deck = deck;

    room.players.filter((p) => p.isAI).forEach((ai) => CaboAIController.resetMemory(ai.id));
    CaboGameEngine.startNextHand(room.state, deck);
    room.players = room.state.players;

    // AI players automatically perform initial peek
    room.players.filter((p) => p.isAI).forEach((ai) => {
      CaboAIController.handleInitialPeek(room.state, ai);
    });

    return { success: true };
  }

  public static restartParti(roomCode: string, hostPlayerId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (this.isRoomPaused(room)) return { success: false, error: 'Bağlantısı kesilen oyuncu bekleniyor' };
    if (room.hostId !== hostPlayerId) return { success: false, error: 'Yalnızca kurucu partiyi yeniden başlatabilir' };

    room.players.forEach((p) => {
      p.score = 0;
    });

    const deck = createDeck();
    room.deck = deck;

    room.players.filter((p) => p.isAI).forEach((ai) => CaboAIController.resetMemory(ai.id));
    const newState = CaboGameEngine.initGame(room.players, 1, deck);
    newState.roomCode = roomCode;
    room.state = newState;
    room.players = newState.players;

    room.players.filter((p) => p.isAI).forEach((ai) => {
      CaboAIController.handleInitialPeek(room.state, ai);
    });

    return { success: true };
  }

  public static restartGame(roomCode: string, hostPlayerId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (this.isRoomPaused(room)) return { success: false, error: 'Bağlantısı kesilen oyuncu bekleniyor' };
    if (room.hostId !== hostPlayerId) return { success: false, error: 'Only host can restart' };

    // Reset all scores to 0
    room.players.forEach((p) => {
      p.score = 0;
      p.roundScore = 0;
      p.cards = [];
      p.cardCount = 0;
      p.initialPeeksDone = false;
    });

    room.state = {
      roomCode,
      phase: 'lobby',
      players: room.players,
      currentTurnIndex: 0,
      activePlayerId: room.hostId,
      caboCallerId: null,
      drawPileCount: 0,
      discardPile: [],
      currentDrawnCard: null,
      turnSubPhase: 'idle',
      roundNumber: 1,
      handNumber: 1,
      maxHands: 3,
      turNumber: 1,
      turnsTakenInHand: {},
      actionLogs: [
        {
          id: `log_restart_${Date.now()}`,
          timestamp: Date.now(),
          text: `Game was reset to lobby. Ready to begin new match!`,
          type: 'info',
        },
      ],
    };

    return { success: true };
  }

  public static triggerAIPeeks(room: GameRoom): void {
    const aiPlayers = room.players.filter((p) => p.isAI && !p.initialPeeksDone);
    aiPlayers.forEach((ai) => {
      CaboAIController.handleInitialPeek(room.state, ai);
    });
  }

  public static triggerAITurnIfNeeded(
    room: GameRoom,
    onUpdate: () => void,
    onEvent?: (event: string, payload: any) => void
  ): void {
    if (room.state.phase !== 'playing') return;
    if (this.isRoomPaused(room)) return;
    const activePlayer = room.players.find((p) => p.id === room.state.activePlayerId);
    if (activePlayer && activePlayer.isAI) {
      CaboAIController.takeTurn(
        room.state,
        room.deck,
        activePlayer,
        () => {
          onUpdate();
          // Check if next player is also AI
          if (room.state.phase === 'playing') {
            setTimeout(() => {
              this.triggerAITurnIfNeeded(room, onUpdate, onEvent);
            }, 800);
          }
        },
        onEvent
      );
    }
  }

  public static handleDisconnect(socketId: string): { room?: GameRoom; player?: Player; roomDestroyed?: boolean } {
    const { room, playerId } = this.getRoomBySocketId(socketId);
    if (!room || !playerId) return {};

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return {};

    room.socketPlayerMap.delete(socketId);
    if (room.playerSocketMap.get(playerId) === socketId) {
      room.playerSocketMap.delete(playerId);
    }
    player.connected = false;

    room.state.actionLogs.unshift({
      id: `log_disc_${Date.now()}`,
      timestamp: Date.now(),
      text: `${player.name} bağlantısını kaybetti. Oyun yeniden bağlanana kadar duraklatıldı.`,
      type: 'alert',
    });

    return { room, player, roomDestroyed: false };
  }

  public static expireDisconnectedPlayer(
    roomCode: string,
    playerId: string
  ): { room?: GameRoom; player?: Player; roomDestroyed: boolean } {
    const room = this.rooms.get(roomCode);
    if (!room) return { roomDestroyed: false };
    const player = room.players.find((candidate) => candidate.id === playerId);
    if (!player || player.connected) return { room, player, roomDestroyed: false };

    if (room.state.phase === 'lobby') {
      room.players = room.players.filter((candidate) => candidate.id !== playerId);
      room.state.players = room.players;
      room.playerSocketMap.delete(playerId);
      room.playerReconnectTokens.delete(playerId);

      if (player.isHost && room.players.length > 0) {
        const nextHuman = room.players.find((candidate) => !candidate.isAI) || room.players[0];
        nextHuman.isHost = true;
        room.hostId = nextHuman.id;
      }

      const connectedHumans = room.players.filter((candidate) => !candidate.isAI && candidate.connected);
      if (connectedHumans.length > 0) {
        room.state.actionLogs.unshift({
          id: `log_disc_expired_${Date.now()}`,
          timestamp: Date.now(),
          text: `${player.name} zamanında yeniden bağlanamadığı için masadan kaldırıldı.`,
          type: 'alert',
        });
        return { room, player, roomDestroyed: false };
      }
    }

    this.rooms.delete(room.code);
    if (room.state.phase === 'game_over') this.recordAdminSnapshot(room, false);
    else this.removeAdminSession(room.code);
    return { room, player, roomDestroyed: true };
  }
}
