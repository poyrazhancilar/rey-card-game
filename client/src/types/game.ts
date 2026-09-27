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

export interface PlayerClientView {
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
}

export type GamePhase = 'lobby' | 'initial_peek' | 'playing' | 'round_over' | 'game_over';

export type TurnSubPhase =
  | 'idle'
  | 'power_selection' // 2. Tur özel güç seçimi
  | 'drawn_deck'      // Desteden kart çekildi
  | 'drawn_discard'   // Ortadan kart çekildi
  | 'peeking_1'       // Röntgen 1
  | 'peeking_2'       // Röntgen 2
  | 'spying_1'        // Casusluk 1
  | 'spying_2'        // Casusluk 2
  | 'peeking'
  | 'spying'
  | 'swapping';

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
  caboCallerId: string | null;
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

export interface ClientGameState {
  roomCode: string;
  phase: GamePhase;
  players: PlayerClientView[];
  myPlayerId: string;
  currentTurnIndex: number;
  activePlayerId: string;
  caboCallerId: string | null; // Rey çağrısı yapan oyuncu
  drawPileCount: number;
  topDiscardCard: Card | null;
  currentDrawnCard: Card | null;
  turnSubPhase: TurnSubPhase;
  roundNumber: number; // El numarası
  handNumber: number;  // 1..3
  maxHands: number;    // 3
  turNumber: number;   // 1..3
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

export interface ActivePeekState {
  slotIndex?: number;
  slots?: number[];
  card?: Card;
  cards?: Card[];
  nextCard?: Card;
}

export interface ActiveSpyRevealedState {
  targetPlayerId: string;
  slotIndex?: number;
  slots?: number[];
  card?: Card;
  cards?: Card[];
  isAll?: boolean;
}

export interface ActiveSpiedAlertState {
  byPlayerName: string;
  slotIndex?: number;
  slots?: number[];
  isAll?: boolean;
}

export interface ActiveSwapAnimationState {
  fromPlayerId: string;
  fromSlotIndex: number;
  fromSlotIndices?: number[];
  toPlayerId: string;
  toSlotIndex: number;
  toSlotIndices?: number[];
  durationMs: number;
  isSwapAll?: boolean;
}

export interface ActiveMatchDrawAnimationState {
  playerId: string;
  slotIndex: number;
  card: Card | null;
  count: number;
  bonus?: number;
  durationMs: number;
}
