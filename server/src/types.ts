export type CardAbility = 'peek' | 'spy' | 'swap' | 'none';

export interface Card {
  id: string;
  value: number; // 0 to 13
  ability: CardAbility;
  name: string;
  flavor: string;
  isRevealed?: boolean;
}

export type SpecialPowerType =
  | 'peek_1'    // Röntgen Seviye 1: 1 kapalı kart gör
  | 'peek_2'    // Röntgen Seviye 2: 2 kapalı kartını gör
  | 'peek_3'    // Röntgen Seviye 3: Tüm elini ve sıradaki kartı gör
  | 'spy_1'     // Casusluk Seviye 1: Rakibin 1 kartını gör
  | 'spy_2'     // Casusluk Seviye 2: Rakibin 2 kartını gör
  | 'spy_3'     // Casusluk Seviye 3: Rakibin TÜM kartlarını gör
  | 'swap_all'; // El Değiştirme: Rakiple tüm elleri takas et

export interface SpecialPower {
  id: string;
  type: SpecialPowerType;
  level: number;
  title: string;
  description: string;
  icon: string;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isAI: boolean;
  avatar: string;
  cards: (Card | { id: string; isRevealed: boolean })[];
  cardCount: number;
  initialPeeksDone: boolean;
  score: number; // Cumulative match/parti score
  roundScore: number; // Score earned in current hand
  hasTakenFinalTurn?: boolean;
  connected: boolean;
  availablePowers?: SpecialPower[];
  chosenPower?: SpecialPower | null;
  hasChosenPowerInTur2?: boolean;
  missedKamikazeOpportunity?: boolean;
}

export type GamePhase = 'lobby' | 'initial_peek' | 'playing' | 'round_over' | 'game_over';

export type TurnSubPhase =
  | 'idle'
  | 'power_selection' // Player is choosing Tur 2 power
  | 'drawn_deck'      // Player drew from deck
  | 'drawn_discard'   // Player drew from discard
  | 'peeking_1'       // Röntgen 1: select 1 card to peek
  | 'peeking_2'       // Röntgen 2
  | 'spying_1'        // Casusluk 1: select 1 rival card
  | 'spying_2'        // Casusluk 2: select 2 rival cards
  | 'peeking'         // general peek
  | 'spying'          // general spy
  | 'swapping';       // general swap

export interface GameActionLog {
  id: string;
  timestamp: number;
  text: string;
  type: 'info' | 'cabo' | 'power' | 'swap' | 'match' | 'alert';
}

export interface HandResultSummary {
  handNumber: number;
  winnerId: string;
  winType: 'tur_end' | 'rey' | 'kamikaze';
  caboCallerId: string | null; // rey caller
  caboSuccess: boolean;
  scores: {
    playerId: string;
    name: string;
    cardValues: number[];
    sum: number;
    penalty: number;
    roundScore: number;
    totalScore: number;
    isKamikaze: boolean;
  }[];
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  currentTurnIndex: number;
  activePlayerId: string;
  caboCallerId: string | null; // Rey caller id
  drawPileCount: number;
  discardPile: Card[];
  currentDrawnCard: Card | null;
  turnSubPhase: TurnSubPhase;
  roundNumber: number; // Hand number (1..3)
  handNumber: number;  // Current hand in parti (1..3)
  maxHands: number;    // 3 hands per parti
  turNumber: number;   // Current turn round in hand (1..3)
  turnsTakenInHand: Record<string, number>; // playerId -> count of turns taken in current hand (0..3)
  actionLogs: GameActionLog[];
  powerSelections?: Record<string, {
    kind: 'peek' | 'spy';
    targetPlayerId?: string;
    slots: number[];
  }>;
  lastPairPlayerId?: string | null;
  consecutivePairCount?: number;
  roundResults?: HandResultSummary;
  partiWinnerId?: string | null;
}

export interface ClientGameState {
  roomCode: string;
  phase: GamePhase;
  players: {
    id: string;
    name: string;
    isHost: boolean;
    isAI: boolean;
    avatar: string;
    cards: (Card | { id: string; isRevealed: boolean })[];
    cardCount: number;
    initialPeeksDone: boolean;
    score: number;
    roundScore: number;
    hasTakenFinalTurn?: boolean;
    connected: boolean;
    availablePowers?: SpecialPower[];
    chosenPower?: SpecialPower | null;
    canKamikaze?: boolean;
  }[];
  myPlayerId: string;
  currentTurnIndex: number;
  activePlayerId: string;
  caboCallerId: string | null;
  drawPileCount: number;
  topDiscardCard: Card | null;
  currentDrawnCard: Card | null;
  turnSubPhase: TurnSubPhase;
  roundNumber: number;
  handNumber: number;
  maxHands: number;
  turNumber: number;
  actionLogs: GameActionLog[];
  roundResults?: HandResultSummary;
  partiWinnerId?: string | null;
  peekedCard?: {
    card: Card;
    playerId: string;
    cardIndex: number;
    durationMs?: number;
  } | null;
}

export interface AdminSessionSummary {
  roomCode: string;
  phase: GamePhase;
  createdAt: number;
  updatedAt: number;
  endedAt: number | null;
  isActive: boolean;
  playerCount: number;
  connectedHumanCount: number;
  handNumber: number;
  turNumber: number;
  activePlayerId: string;
  activePlayerName: string | null;
  players: {
    id: string;
    name: string;
    avatar: string;
    isAI: boolean;
    connected: boolean;
    score: number;
    cardCount: number;
  }[];
}

export interface AdminSessionDetail extends AdminSessionSummary {
  hostId: string;
  state: GameState;
  drawPile: Card[];
  drawPileTopFirst: Card[];
  discardPileTopFirst: Card[];
  socketConnections: number;
}
