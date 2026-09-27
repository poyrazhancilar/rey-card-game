import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  Activity,
  Bot,
  ChevronRight,
  CircleDot,
  Clock3,
  Copy,
  Database,
  Eye,
  History,
  KeyRound,
  Layers3,
  LockKeyhole,
  LogIn,
  LogOut,
  Pencil,
  Radio,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { Card, GamePhase } from '../types/game';
import type { AdminSessionDetail, AdminSessionSummary } from '../types/admin';

type SessionFilter = 'all' | 'live' | 'completed';

type CardOverrideTarget =
  | { target: 'player'; playerId: string; playerName: string; cardIndex: number; currentCard: Card }
  | { target: 'draw_pile'; cardIndex: number; currentCard: Card };

const phaseLabels: Record<GamePhase, string> = {
  lobby: 'Lobi',
  initial_peek: 'İlk Bakış',
  playing: 'Oynanıyor',
  round_over: 'El Bitti',
  game_over: 'Parti Bitti',
};

const phaseClasses: Record<GamePhase, string> = {
  lobby: 'border-slate-300 bg-slate-100 text-slate-600',
  initial_peek: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  playing: 'border-blue-200 bg-blue-50 text-blue-700',
  round_over: 'border-amber-200 bg-amber-50 text-amber-700',
  game_over: 'border-rose-200 bg-rose-50 text-rose-700',
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function formatDate(value: number | null) {
  return value ? dateFormatter.format(value) : '—';
}

function formatDuration(start: number, end: number | null) {
  const duration = Math.max(0, (end || Date.now()) - start);
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes}d ${seconds.toString().padStart(2, '0')}s`;
}

function getAdminAbilityLabel(card: Card) {
  if (card.value === 12) return 'Takas + Kamikaze';
  if (card.value === 13) return 'Kamikaze';
  return {
    peek: 'Röntgen',
    spy: 'Casusluk',
    swap: 'Takas',
    none: 'Yok',
  }[card.ability];
}

function DebugCard({
  card,
  index,
  label,
  onEdit,
}: {
  card: Card;
  index: number;
  label?: string;
  onEdit?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={!onEdit}
      className={`relative flex h-[126px] w-[112px] min-w-[112px] flex-col rounded-md border bg-white p-2.5 text-left transition ${
        onEdit
          ? 'cursor-pointer border-slate-300 hover:border-blue-500 hover:ring-2 hover:ring-blue-100'
          : 'cursor-default border-slate-300'
      }`}
      title={onEdit ? `Kartı değiştir — ${card.id}` : `${card.id} — ${card.flavor}`}
    >
      {onEdit && (
        <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded bg-blue-600 text-white shadow-sm">
          <Pencil className="h-3 w-3" />
        </span>
      )}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
        <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">
          {label || `#${index + 1}`}
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
      </div>

      <div className="flex flex-1 items-center gap-2 py-1.5">
        <span className="text-[30px] font-black leading-none tracking-tighter text-slate-950">
          {card.value}
        </span>
        <span className="line-clamp-2 text-[9px] font-bold leading-tight text-slate-600">
          {card.name}
        </span>
      </div>

      <div className="border-t border-slate-200 pt-1.5">
        <div className="text-[7px] font-bold uppercase tracking-[0.14em] text-slate-400">Özellik</div>
        <div className="mt-0.5 truncate text-[9px] font-black text-blue-700">
          {getAdminAbilityLabel(card)}
        </div>
      </div>
    </button>
  );
}

type AdminAuthState = 'checking' | 'authenticated' | 'guest';

export function AdminPanel() {
  const [authState, setAuthState] = useState<AdminAuthState>('checking');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/session', { credentials: 'include' })
      .then((response) => response.json())
      .then((data: { authenticated?: boolean }) => {
        if (!cancelled) setAuthState(data.authenticated ? 'authenticated' : 'guest');
      })
      .catch(() => {
        if (!cancelled) setAuthState('guest');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUnauthorized = useCallback(() => setAuthState('guest'), []);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setAuthState('guest');
    }
  };

  if (authState === 'checking') return <AdminAuthLoading />;
  if (authState === 'guest') {
    return <AdminLogin onSuccess={() => setAuthState('authenticated')} />;
  }
  return <AdminDashboard onLogout={handleLogout} onUnauthorized={handleUnauthorized} />;
}

function AdminAuthLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 font-mono text-blue-700">
      <div className="flex items-center gap-3 text-sm font-bold">
        <RefreshCw className="h-5 w-5 animate-spin" /> Admin oturumu kontrol ediliyor
      </div>
    </div>
  );
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password || isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || 'Giriş yapılamadı');
        return;
      }
      setPassword('');
      onSuccess();
    } catch {
      setError('Sunucuya ulaşılamadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f3f6fa] px-4 font-mono text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.035)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-[400px] rounded-xl border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-7"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg border border-blue-200 bg-blue-50">
            <LockKeyhole className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-slate-950">
                REY ADMIN
              </h1>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">operations console</p>
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs leading-relaxed text-slate-600">
          Oyuncu elleri ve deste sırası gibi gizli oyun verilerine erişmek için yönetici şifresini girin.
        </div>

        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          Yönetici Şifresi
        </label>
        <div className="relative">
          <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            autoFocus
            placeholder="••••••••••••"
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs font-bold text-rose-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!password || isSubmitting}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-blue-700 bg-blue-600 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {isSubmitting ? 'Doğrulanıyor...' : 'Admin Paneline Gir'}
        </button>
      </form>
    </div>
  );
}

function AdminDashboard({
  onLogout,
  onUnauthorized,
}: {
  onLogout: () => void;
  onUnauthorized: () => void;
}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessions, setSessions] = useState<AdminSessionSummary[]>([]);
  const [selectedRoomCode, setSelectedRoomCode] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<AdminSessionDetail | null>(null);
  const [filter, setFilter] = useState<SessionFilter>('all');
  const [search, setSearch] = useState('');
  const [copiedRoom, setCopiedRoom] = useState<string | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<CardOverrideTarget | null>(null);
  const [overrideError, setOverrideError] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);

  useEffect(() => {
    const adminSocket = io({ transports: ['websocket', 'polling'], withCredentials: true });
    socketRef.current = adminSocket;

    adminSocket.on('connect', () => {
      setIsConnected(true);
      adminSocket.emit('admin_subscribe');
    });
    adminSocket.on('disconnect', () => setIsConnected(false));
    adminSocket.on('admin_unauthorized', onUnauthorized);
    adminSocket.on('admin_sessions', (nextSessions: AdminSessionSummary[]) => {
      setSessions(nextSessions);
      setSelectedRoomCode((current) => {
        if (current && nextSessions.some((session) => session.roomCode === current)) {
          return current;
        }
        return nextSessions[0]?.roomCode || null;
      });
    });
    adminSocket.on('admin_session_state', (session: AdminSessionDetail) => {
      setSelectedSession(session);
      setSessions((current) => {
        const summary: AdminSessionSummary = {
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
        };
        return [summary, ...current.filter((item) => item.roomCode !== summary.roomCode)].sort(
          (a, b) => b.updatedAt - a.updatedAt
        );
      });
    });

    return () => {
      adminSocket.emit('admin_unwatch_session');
      adminSocket.disconnect();
      socketRef.current = null;
    };
  }, [onUnauthorized]);

  useEffect(() => {
    const adminSocket = socketRef.current;
    if (!adminSocket || !isConnected || !selectedRoomCode) return;
    adminSocket.emit('admin_watch_session', { roomCode: selectedRoomCode });
  }, [isConnected, selectedRoomCode]);

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return sessions.filter((session) => {
      if (filter === 'live' && (!session.isActive || session.phase === 'game_over')) return false;
      if (filter === 'completed' && session.phase !== 'game_over' && session.isActive) return false;
      if (!query) return true;
      return (
        session.roomCode.includes(query) ||
        session.players.some((player) => player.name.toLocaleLowerCase('tr-TR').includes(query))
      );
    });
  }, [filter, search, sessions]);

  const liveCount = sessions.filter((session) => session.isActive && session.phase !== 'game_over').length;
  const playingCount = sessions.filter((session) => session.phase === 'playing').length;
  const completedCount = sessions.filter(
    (session) => session.phase === 'game_over' || !session.isActive
  ).length;

  const refresh = () => {
    socketRef.current?.emit('admin_subscribe');
    if (selectedRoomCode) {
      socketRef.current?.emit('admin_watch_session', { roomCode: selectedRoomCode });
    }
  };

  const copyRoomCode = async (roomCode: string) => {
    await navigator.clipboard.writeText(roomCode);
    setCopiedRoom(roomCode);
    window.setTimeout(() => setCopiedRoom(null), 1400);
  };

  const overrideCard = (cardValue: number) => {
    if (!overrideTarget || !selectedRoomCode || !socketRef.current || isOverriding) return;
    setOverrideError('');
    setIsOverriding(true);
    socketRef.current.emit(
      'admin_override_card',
      {
        roomCode: selectedRoomCode,
        target: overrideTarget.target,
        playerId: overrideTarget.target === 'player' ? overrideTarget.playerId : undefined,
        cardIndex: overrideTarget.cardIndex,
        cardValue,
      },
      (response: { success?: boolean; error?: string }) => {
        setIsOverriding(false);
        if (!response?.success) {
          setOverrideError(response?.error || 'Kart değiştirilemedi');
          return;
        }
        setOverrideTarget(null);
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#f3f6fa] font-mono text-slate-900">
      <header className="sticky top-0 z-40 border-b border-blue-200 bg-white/95 px-3 py-2 backdrop-blur-xl sm:px-4">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-blue-200 bg-blue-50">
              <Database className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-slate-950">
                  REY ADMIN
                </h1>
                <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-blue-700">
                  OPS CONSOLE
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Canlı oyun oturumu / sunucu görünümü</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${
                isConnected
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {isConnected ? 'Canlı bağlantı' : 'Bağlantı kesildi'}
            </div>
            <button
              type="button"
              onClick={refresh}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:border-blue-400 hover:text-blue-700"
              title="Yenile"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex h-8 items-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 text-[10px] font-black text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
              title="Çıkış yap"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] p-2.5 sm:p-3">
        <section className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { label: 'Toplam Oturum', value: sessions.length, icon: Server, color: 'text-blue-600' },
            { label: 'Canlı Oda', value: liveCount, icon: Radio, color: 'text-cyan-600' },
            { label: 'Aktif Oyun', value: playingCount, icon: Activity, color: 'text-indigo-600' },
            { label: 'Tamamlanan', value: completedCount, icon: History, color: 'text-slate-500' },
          ].map((metric) => (
            <div key={metric.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  {metric.label}
                </span>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
              <div className="mt-0.5 text-xl font-black text-slate-950">{metric.value}</div>
            </div>
          ))}
        </section>

        <div className="grid min-h-[calc(100vh-150px)] gap-3 xl:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-2.5">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Oda kodu veya oyuncu ara"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-[11px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                {([
                  ['all', 'Tümü'],
                  ['live', 'Canlı'],
                  ['completed', 'Biten'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-md py-1.5 text-[9px] font-black transition ${
                      filter === value
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[calc(100vh-255px)] flex-1 space-y-1.5 overflow-y-auto p-2">
              {filteredSessions.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-xs text-slate-400">
                  <Server className="h-7 w-7 opacity-50" />
                  <span>Bu filtrede oyun oturumu yok.</span>
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const isSelected = selectedRoomCode === session.roomCode;
                  return (
                    <button
                      key={session.roomCode}
                      type="button"
                      onClick={() => setSelectedRoomCode(session.roomCode)}
                      className={`relative w-full rounded-lg border p-2.5 text-left transition ${
                        isSelected
                          ? 'border-blue-400 bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              session.isActive && session.phase !== 'game_over'
                                ? 'bg-blue-500 shadow-[0_0_6px_#3b82f6]'
                                : 'bg-slate-300'
                            }`}
                          />
                          <span className="font-mono text-sm font-black text-slate-950">{session.roomCode}</span>
                        </div>
                        <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black ${phaseClasses[session.phase]}`}>
                          {phaseLabels[session.phase]}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-600">
                        {session.players.map((player) => (
                          <span key={player.id} className="truncate">
                            {player.avatar} {player.name}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400">
                        <span>El {session.handNumber}/3 • Tur {session.turNumber}/3</span>
                        <span>{formatDate(session.updatedAt)}</span>
                      </div>
                      {isSelected && <ChevronRight className="absolute right-2.5 h-4 w-4 text-blue-600" />}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="min-w-0">
            {!selectedRoomCode ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center">
                <Eye className="mb-3 h-10 w-10 text-slate-300" />
                <h2 className="font-bold text-slate-600">İzlenecek oturumu seçin</h2>
                <p className="mt-1 text-xs text-slate-400">Sol listeden bir oda seçildiğinde ham veriler burada açılır.</p>
              </div>
            ) : !selectedSession || selectedSession.roomCode !== selectedRoomCode ? (
              <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-slate-200 bg-white">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <SessionInspector
                session={selectedSession}
                copiedRoom={copiedRoom}
                onCopyRoom={copyRoomCode}
                onRequestOverride={(target) => {
                  setOverrideError('');
                  setOverrideTarget(target);
                }}
              />
            )}
          </section>
        </div>
      </main>

      {overrideTarget && (
        <CardOverrideModal
          key={`${overrideTarget.target}_${overrideTarget.cardIndex}_${
            overrideTarget.target === 'player' ? overrideTarget.playerId : 'deck'
          }`}
          target={overrideTarget}
          error={overrideError}
          isSaving={isOverriding}
          onClose={() => !isOverriding && setOverrideTarget(null)}
          onConfirm={overrideCard}
        />
      )}
    </div>
  );
}

function SessionInspector({
  session,
  copiedRoom,
  onCopyRoom,
  onRequestOverride,
}: {
  session: AdminSessionDetail;
  copiedRoom: string | null;
  onCopyRoom: (roomCode: string) => void;
  onRequestOverride: (target: CardOverrideTarget) => void;
}) {
  const { state } = session;
  const activePlayer = state.players.find((player) => player.id === state.activePlayerId);
  const canOverrideCards = session.isActive && (session.phase === 'initial_peek' || session.phase === 'playing');

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-xl font-black text-slate-950">{session.roomCode}</h2>
              <button
                type="button"
                onClick={() => onCopyRoom(session.roomCode)}
                className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:border-blue-300 hover:text-blue-700"
                title="Oda kodunu kopyala"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {copiedRoom === session.roomCode && (
                <span className="text-[10px] font-bold text-blue-700">Kopyalandı</span>
              )}
              <span className={`rounded-lg border px-2 py-1 text-[10px] font-black ${phaseClasses[session.phase]}`}>
                {phaseLabels[session.phase]}
              </span>
              {session.isActive && (
                <span className="flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                  <CircleDot className="h-3 w-3 animate-pulse" /> CANLI
                </span>
              )}
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Oluşturuldu: {formatDate(session.createdAt)} • Süre: {formatDuration(session.createdAt, session.endedAt)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <DebugMetric label="Socket" value={session.socketConnections} />
            <DebugMetric label="El" value={`${state.handNumber}/${state.maxHands}`} />
            <DebugMetric label="Tur" value={`${state.turNumber}/3`} />
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <StateChip label="Aktif Oyuncu" value={activePlayer?.name || state.activePlayerId || '—'} tone="emerald" />
          <StateChip label="Alt Faz" value={state.turnSubPhase} tone="amber" />
          <StateChip label="REY Çağıran" value={state.caboCallerId || 'Yok'} tone="rose" />
          <StateChip label="Deste / Iskarta" value={`${session.drawPile.length} / ${state.discardPile.length}`} tone="sky" />
        </div>
      </div>

      <div className="grid gap-3 2xl:grid-cols-2">
        {state.players.map((player, playerIndex) => {
          const isActive = player.id === state.activePlayerId;
          const handSum = player.cards.reduce((sum, card) => sum + card.value, 0);
          return (
            <article
              key={player.id}
              className={`rounded-lg border bg-white p-3 shadow-sm ${
                isActive
                  ? 'border-blue-400 ring-1 ring-blue-100'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg border border-blue-200 bg-blue-50 text-xl">
                    {player.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-950">{player.name}</h3>
                      {player.isAI && <Bot className="h-4 w-4 text-cyan-600" />}
                      {isActive && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-black text-blue-700">
                          SIRADA
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[9px] text-slate-400">{player.id}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <DebugMetric label="Skor" value={player.score} />
                  <DebugMetric label="El Toplamı" value={handSum} />
                  <DebugMetric label="Hamle" value={state.turnsTakenInHand[player.id] || 0} />
                </div>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                {player.cards.map((card, index) => (
                  <DebugCard
                    key={`${card.id}_${index}`}
                    card={card}
                    index={index}
                    label={`Slot ${index + 1}`}
                    onEdit={canOverrideCards
                      ? () =>
                          onRequestOverride({
                            target: 'player',
                            playerId: player.id,
                            playerName: player.name,
                            cardIndex: index,
                            currentCard: card,
                          })
                      : undefined}
                  />
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] lg:grid-cols-4">
                <StateChip label="Bağlantı" value={player.connected ? 'Bağlı' : 'Kopuk'} tone={player.connected ? 'emerald' : 'rose'} />
                <StateChip label="İlk Bakış" value={player.initialPeeksDone ? 'Tamam' : 'Bekliyor'} tone="violet" />
                <StateChip label="Seçili Güç" value={player.chosenPower?.title || 'Yok'} tone="amber" />
                <StateChip label="Rol" value={playerIndex === 0 ? 'Oyuncu 1' : 'Oyuncu 2'} tone="sky" />
              </div>

              {player.availablePowers && player.availablePowers.length > 0 && (
                <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/70 p-2.5">
                  <div className="mb-2 text-[9px] font-black uppercase tracking-widest text-indigo-700">
                    Sunulan Güçler
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {player.availablePowers.map((power) => (
                      <span key={power.id} className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-[10px] text-indigo-700">
                        {power.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-black text-slate-950">Deste Debug</h3>
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              İlk kart = sıradaki çekilecek kart
            </span>
          </div>

          {state.currentDrawnCard && (
            <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50/60 p-2.5">
              <div className="mb-2 text-[9px] font-black uppercase tracking-widest text-blue-700">
                Şu An Çekilmiş Kart
              </div>
              <div className="flex items-center gap-3">
                <DebugCard card={state.currentDrawnCard} index={0} label="AKTİF" />
                <div className="text-xs text-slate-600">
                  <div><strong className="text-slate-950">{state.currentDrawnCard.name}</strong></div>
                  <div>Değer: {state.currentDrawnCard.value}</div>
                  <div>Güç: {state.currentDrawnCard.ability}</div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-2 flex items-center justify-between text-[10px]">
            <span className="font-black uppercase tracking-widest text-slate-500">Çekme Destesi — Toplam {session.drawPileTopFirst.length}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-3">
            {session.drawPileTopFirst.length > 0 ? (
              session.drawPileTopFirst.map((card, index) => (
                <DebugCard
                  key={`draw_${card.id}_${index}`}
                  card={card}
                  index={index}
                  onEdit={canOverrideCards
                    ? () =>
                        onRequestOverride({
                          target: 'draw_pile',
                          cardIndex: index,
                          currentCard: card,
                        })
                    : undefined}
                />
              ))
            ) : (
              <span className="py-8 text-xs text-slate-400">Deste boş.</span>
            )}
          </div>

          <div className="mt-3 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Iskarta — Üstten Alta {session.discardPileTopFirst.length} Kart
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {session.discardPileTopFirst.length > 0 ? (
              session.discardPileTopFirst.map((card, index) => (
                <DebugCard key={`discard_${card.id}_${index}`} card={card} index={index} />
              ))
            ) : (
              <span className="py-8 text-xs text-slate-400">Iskarta boş.</span>
            )}
          </div>
        </section>

        <section className="flex min-h-[380px] flex-col rounded-lg border border-[#18283b] bg-[#0b1420] p-3 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-sky-400" />
            <h3 className="text-sm font-black text-white">Canlı Hamle Günlüğü</h3>
          </div>
          <div className="max-h-[520px] flex-1 space-y-2 overflow-y-auto pr-1">
            {state.actionLogs.map((log) => (
              <div key={log.id} className="rounded-md border border-slate-700/70 bg-[#101d2b] p-2.5">
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      log.type === 'alert'
                        ? 'bg-rose-400'
                        : log.type === 'power'
                        ? 'bg-violet-400'
                        : log.type === 'cabo'
                        ? 'bg-amber-400'
                        : 'bg-sky-400'
                    }`}
                  />
                  <div>
                    <p className="text-[11px] leading-relaxed text-slate-200">{log.text}</p>
                    <span className="mt-1 block font-mono text-[9px] text-sky-400/60">
                      {formatDate(log.timestamp)} • {log.type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <details className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer items-center gap-2 p-3 text-xs font-black text-slate-600">
          <ShieldAlert className="h-4 w-4 text-blue-600" />
          Ham JSON Durumu
        </summary>
        <pre className="max-h-[520px] overflow-auto border-t border-slate-700 bg-[#0b1420] p-4 text-[10px] leading-relaxed text-sky-200/90">
          {JSON.stringify(session, null, 2)}
        </pre>
      </details>
    </div>
  );
}

const overrideCardOptions = [
  { value: 0, name: 'Kral Rey', ability: 'Yok' },
  { value: 1, name: 'Muhafız', ability: 'Yok' },
  { value: 2, name: 'Çırak Büyücü', ability: 'Yok' },
  { value: 3, name: 'Gezgin', ability: 'Yok' },
  { value: 4, name: 'Orman Avcısı', ability: 'Yok' },
  { value: 5, name: 'Şövalye', ability: 'Yok' },
  { value: 6, name: 'İkiz Büyücü', ability: 'Yok' },
  { value: 7, name: 'Simyacı', ability: 'Yok' },
  { value: 8, name: 'Gözcü', ability: 'Yok' },
  { value: 9, name: 'Casus', ability: 'Yok' },
  { value: 10, name: 'Karanlık Gölge', ability: 'Yok' },
  { value: 11, name: 'Ejder Lordu', ability: 'Takas' },
  { value: 12, name: 'Titan', ability: 'Takas + Kamikaze' },
  { value: 13, name: 'Kaos Lordu', ability: 'Kamikaze' },
] as const;

function CardOverrideModal({
  target,
  error,
  isSaving,
  onClose,
  onConfirm,
}: {
  target: CardOverrideTarget;
  error: string;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (cardValue: number) => void;
}) {
  const [selectedValue, setSelectedValue] = useState(target.currentCard.value);
  const targetLabel =
    target.target === 'player'
      ? `${target.playerName} / Slot ${target.cardIndex + 1}`
      : `Deste / Sıradaki ${target.cardIndex + 1}. kart`;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">Admin Override</div>
            <h3 className="mt-0.5 text-base font-black text-slate-950">{targetLabel}</h3>
            <p className="mt-1 text-[10px] text-slate-500">
              Mevcut kart: {target.currentCard.value} / {target.currentCard.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid max-h-[55vh] grid-cols-2 gap-2 overflow-y-auto p-4 sm:grid-cols-4 lg:grid-cols-7">
          {overrideCardOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedValue(option.value)}
              className={`flex min-h-[92px] flex-col rounded-lg border p-2.5 text-left transition ${
                selectedValue === option.value
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-2xl font-black tracking-tighter text-slate-950">{option.value}</span>
              <span className="mt-1 text-[9px] font-bold leading-tight text-slate-600">{option.name}</span>
              <span className="mt-auto pt-1 text-[8px] font-black uppercase text-blue-700">{option.ability}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold text-amber-700">Bu işlem canlı oyun state’ini anında değiştirir.</p>
            {error && <p className="mt-1 text-[10px] font-bold text-rose-700">{error}</p>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[10px] font-black text-slate-600 disabled:opacity-40"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => onConfirm(selectedValue)}
              disabled={isSaving || selectedValue === target.currentCard.value}
              className="flex items-center gap-2 rounded-lg border border-blue-700 bg-blue-600 px-4 py-2 text-[10px] font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Override Uygula
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DebugMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-[58px] rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
      <div className="text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-0.5 font-mono text-xs font-black text-slate-950">{value}</div>
    </div>
  );
}

function StateChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
}) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    violet: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  };
  return (
    <div className={`min-w-0 rounded-md border px-2.5 py-1.5 ${tones[tone]}`}>
      <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-[10px] font-bold" title={value}>{value}</div>
    </div>
  );
}
