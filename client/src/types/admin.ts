import type {
  Card,
  GameActionLog,
  GamePhase,
  HandResultSummary,
  SpecialPower,
  TurnSubPhase,
} from './game';

export interface AdminSessionPlayerSummary {
  id: string;
  name: string;
  avatar: string;
  isAI: boolean;
  connected: boolean;
  score: number;
  cardCount: number;
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
  players: AdminSessionPlayerSummary[];
}

export interface AdminPlayerDebug {
  id: string;
  name: string;
  isHost: boolean;
  isAI: boolean;
  avatar: string;
  cards: Card[];
  cardCount: number;
  initialPeeksDone: boolean;
  score: number;
  roundScore: number;
  hasTakenFinalTurn?: boolean;
  connected: boolean;
  availablePowers?: SpecialPower[];
  chosenPower?: SpecialPower | null;
  hasChosenPowerInTur2?: boolean;
}

export interface AdminGameState {
  roomCode: string;
  phase: GamePhase;
  players: AdminPlayerDebug[];
  currentTurnIndex: number;
  activePlayerId: string;
  caboCallerId: string | null;
  drawPileCount: number;
  discardPile: Card[];
  currentDrawnCard: Card | null;
  turnSubPhase: TurnSubPhase;
  roundNumber: number;
  handNumber: number;
  maxHands: number;
  turNumber: number;
  turnsTakenInHand: Record<string, number>;
  actionLogs: GameActionLog[];
  roundResults?: HandResultSummary;
  partiWinnerId?: string | null;
}

export interface AdminSessionDetail extends AdminSessionSummary {
  hostId: string;
  state: AdminGameState;
  drawPile: Card[];
  drawPileTopFirst: Card[];
  discardPileTopFirst: Card[];
  socketConnections: number;
}
