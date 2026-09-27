export interface StoredGameSession {
  roomCode: string;
  playerId: string;
  reconnectToken: string;
}

const STORAGE_KEY = 'rey_game_session_v1';

export function readGameSession(): StoredGameSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredGameSession>;
    if (!parsed.roomCode || !parsed.playerId || !parsed.reconnectToken) return null;
    return {
      roomCode: parsed.roomCode,
      playerId: parsed.playerId,
      reconnectToken: parsed.reconnectToken,
    };
  } catch {
    return null;
  }
}

export function saveGameSession(session: StoredGameSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Private browsing/storage restrictions should not prevent gameplay.
  }
}

export function clearGameSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage restrictions.
  }
}

