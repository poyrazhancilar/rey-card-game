import React, { useCallback, useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import {
  Swords,
  Users,
  BookOpen,
  ChevronRight,
  BarChart2,
  Settings,
  X,
  Volume2,
  VolumeX,
  Eye,
  Radio,
  ArrowLeftRight,
  Flame,
  Trophy,
  Camera,
  ImageUp,
  Loader2,
  ScanLine,
} from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface MainMenuProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  selectedAvatar: string;
  setSelectedAvatar: (avatar: string) => void;
  inputRoomCode: string;
  setInputRoomCode: (code: string) => void;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onOpenRules: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const AVATARS = ['🌱', '🦊', '🦉', '🐺', '🐈‍⬛', '🌰', '🧹', '🔥', '🐉', '🧙‍♂️'];

function extractRoomCode(qrValue: string): string | null {
  const rawValue = qrValue.trim();
  if (/^\d{6}$/.test(rawValue)) return rawValue;

  try {
    const url = new URL(rawValue, window.location.origin);
    const roomCode = url.searchParams.get('room')?.trim() || '';
    return /^\d{6}$/.test(roomCode) ? roomCode : null;
  } catch {
    return null;
  }
}

function QrScannerDialog({
  onDetected,
  onClose,
}: {
  onDetected: (roomCode: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [scannerError, setScannerError] = useState('');
  const [isStarting, setIsStarting] = useState(true);
  const [isReadingImage, setIsReadingImage] = useState(false);

  const acceptQrValue = useCallback((value: string) => {
    const roomCode = extractRoomCode(value);
    if (!roomCode) {
      setScannerError('Bu QR kodunda geçerli bir REY oda bağlantısı bulunamadı.');
      return;
    }
    scannerRef.current?.stop();
    onDetected(roomCode);
  }, [onDetected]);

  useEffect(() => {
    if (!videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => acceptQrValue(result.data),
      {
        preferredCamera: 'environment',
        maxScansPerSecond: 10,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        returnDetailedScanResult: true,
      }
    );
    scannerRef.current = scanner;

    scanner
      .start()
      .then(() => setIsStarting(false))
      .catch((error: unknown) => {
        setIsStarting(false);
        const message = error instanceof Error ? error.message : String(error);
        if (/permission|denied|notallowed/i.test(message)) {
          setScannerError('Kamera izni verilmedi. İzin verin veya aşağıdan QR fotoğrafı seçin.');
        } else if (!window.isSecureContext) {
          setScannerError('Kamera yalnızca HTTPS bağlantısında açılabilir. QR fotoğrafı seçebilirsiniz.');
        } else {
          setScannerError('Kamera açılamadı. Aşağıdan QR fotoğrafı seçebilirsiniz.');
        }
      });

    return () => {
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [acceptQrValue]);

  const scanImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setScannerError('');
    setIsReadingImage(true);
    try {
      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
        alsoTryWithoutScanRegion: true,
      });
      acceptQrValue(result.data);
    } catch {
      setScannerError('Bu fotoğrafta okunabilir bir QR kodu bulunamadı.');
    } finally {
      setIsReadingImage(false);
      event.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-400/70 bg-[#0b1710] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#284735] px-4 py-3">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-emerald-300" />
            <div>
              <h3 className="text-sm font-black text-white">QR ile Oda Kodunu Al</h3>
              <p className="text-[10px] text-[#8ca898]">Kodu çerçevenin içine hizalayın</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-stone-400 transition hover:bg-white/10 hover:text-white"
            aria-label="QR tarayıcıyı kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative aspect-square w-full overflow-hidden bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
          {isStarting && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 text-emerald-200">
              <div className="flex flex-col items-center gap-2 text-xs font-bold">
                <Loader2 className="h-6 w-6 animate-spin" /> Kamera açılıyor…
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute inset-[14%] rounded-3xl border-2 border-emerald-300/80 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]" />
        </div>

        <div className="space-y-3 p-4">
          {scannerError && (
            <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-200">
              {scannerError}
            </div>
          )}
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#3b5d47] bg-[#17291f] px-4 py-3 text-xs font-bold text-emerald-100 transition active:scale-[0.98]">
            {isReadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
            {isReadingImage ? 'QR okunuyor…' : 'QR Fotoğrafı Seç'}
            <input type="file" accept="image/*" className="hidden" onChange={scanImage} />
          </label>
        </div>
      </div>
    </div>
  );
}

export const MainMenu: React.FC<MainMenuProps> = ({
  playerName,
  setPlayerName,
  selectedAvatar,
  setSelectedAvatar,
  inputRoomCode,
  setInputRoomCode,
  errorMessage,
  setErrorMessage,
  onCreateRoom,
  onJoinRoom,
  onOpenRules,
  isMuted,
  onToggleMute,
}) => {
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(() => /^\d{6}$/.test(inputRoomCode.trim()));
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Active tab on mobile view ('menu' | 'howToPlay' | 'cards')
  const [mobileTab, setMobileTab] = useState<'menu' | 'howToPlay' | 'cards'>('menu');

  // Stats from localStorage
  const getStats = () => {
    try {
      const statsStr = localStorage.getItem('rey_game_stats');
      if (statsStr) return JSON.parse(statsStr);
    } catch {
      // fallback
    }
    return { played: 0, won: 0, kamikaze: 0, bestScore: 0 };
  };
  const stats = getStats();

  const handleStartCreate = () => {
    sound.playCardSnap();
    setShowCreateModal(false);
    onCreateRoom();
  };

  const handleStartJoin = () => {
    sound.playCardSnap();
    if (inputRoomCode.trim().length !== 6) {
      setErrorMessage('Lütfen 6 haneli oda kodunu eksiksiz girin');
      return;
    }
    setShowJoinModal(false);
    onJoinRoom();
  };

  return (
    <div
      className="min-h-screen w-full relative flex flex-col justify-between overflow-x-hidden bg-[#0c1610] select-none"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(10, 18, 13, 0.45), rgba(10, 18, 13, 0.25), rgba(7, 13, 9, 0.85)), url('/images/rey_main_menu_bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Ambient background glow layers */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#0c1610]/30 to-[#070d09]/90 pointer-events-none" />

      {/* Floating soft fireflies / fairy sparkles */}
      <div className="absolute top-1/4 left-1/5 w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_12px_#fde047] animate-pulse pointer-events-none opacity-80" />
      <div className="absolute top-1/3 right-1/4 w-2.5 h-2.5 rounded-full bg-yellow-200 shadow-[0_0_16px_#fef08a] animate-pulse pointer-events-none opacity-90 delay-300" />
      <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_#86efac] animate-pulse pointer-events-none opacity-75 delay-700" />
      <div className="absolute top-1/2 right-1/6 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_14px_#fbbf24] animate-pulse pointer-events-none opacity-85 delay-500" />

      {/* TOP RIGHT CONTROLS: STATS, SETTINGS, PROFILE */}
      <header className="w-full flex items-center justify-end px-4 sm:px-8 pt-4 sm:pt-6 z-30 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Stats Button */}
          <button
            type="button"
            onClick={() => {
              sound.playCardSnap();
              setShowStatsModal(true);
            }}
            className="w-10 h-10 rounded-2xl bg-[#0d1712]/75 hover:bg-[#15251d]/90 backdrop-blur-md border border-white/10 hover:border-amber-400/50 flex items-center justify-center text-white/80 hover:text-amber-200 transition shadow-lg cursor-pointer active:scale-95"
            title="İstatistikler"
          >
            <BarChart2 className="w-4 h-4" />
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => {
              sound.playCardSnap();
              setShowSettingsModal(true);
            }}
            className="w-10 h-10 rounded-2xl bg-[#0d1712]/75 hover:bg-[#15251d]/90 backdrop-blur-md border border-white/10 hover:border-amber-400/50 flex items-center justify-center text-white/80 hover:text-amber-200 transition shadow-lg cursor-pointer active:scale-95"
            title="Ayarlar & Ses"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Profile Avatar Badge */}
          <button
            type="button"
            onClick={() => {
              sound.playCardSnap();
              setShowProfileModal(true);
            }}
            className="relative w-10 h-10 rounded-2xl bg-[#0d1712]/75 hover:bg-[#15251d]/90 backdrop-blur-md border border-white/10 hover:border-emerald-400/50 flex items-center justify-center text-xl transition shadow-lg cursor-pointer active:scale-95 group"
            title="Profilini Düzenle"
          >
            <span className="group-hover:scale-110 transition">{selectedAvatar}</span>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0c1610] shadow-[0_0_8px_#34d399]" />
          </button>
        </div>
      </header>

      {/* MOBILE TABS (Hidden on LG screens and above) */}
      <div className="lg:hidden flex items-center justify-center gap-1.5 px-4 pt-2 z-20">
        <button
          type="button"
          onClick={() => setMobileTab('menu')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer backdrop-blur-md border ${
            mobileTab === 'menu'
              ? 'bg-amber-500/25 border-amber-400/80 text-amber-200 shadow-md'
              : 'bg-[#0e1813]/70 border-white/10 text-white/70 hover:text-white'
          }`}
        >
          🏰 Menü
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('howToPlay')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer backdrop-blur-md border ${
            mobileTab === 'howToPlay'
              ? 'bg-emerald-500/25 border-emerald-400/80 text-emerald-200 shadow-md'
              : 'bg-[#0e1813]/70 border-white/10 text-white/70 hover:text-white'
          }`}
        >
          📖 Nasıl Oynanır?
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cards')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer backdrop-blur-md border ${
            mobileTab === 'cards'
              ? 'bg-teal-500/25 border-teal-400/80 text-teal-200 shadow-md'
              : 'bg-[#0e1813]/70 border-white/10 text-white/70 hover:text-white'
          }`}
        >
          🎴 Kartlar (32)
        </button>
      </div>

      {/* MAIN 3-COLUMN CONTENT CONTAINER */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col lg:flex-row items-center lg:items-start justify-center lg:justify-between gap-6 sm:gap-8 z-20 flex-1">
        {/* ========================================================================= */}
        {/* LEFT PANEL: "Nasıl Oynanır?" */}
        {/* ========================================================================= */}
        <div
          className={`w-full max-w-[360px] lg:max-w-[330px] xl:max-w-[360px] bg-[#0c1813]/85 backdrop-blur-md border border-[#233d2f]/70 rounded-3xl p-5 sm:p-6 shadow-2xl flex-col justify-between transition-all duration-300 ${
            mobileTab === 'howToPlay' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div>
            <h3 className="text-white font-bold text-lg sm:text-xl tracking-wide mb-4">
              Nasıl Oynanır?
            </h3>

            <div className="flex flex-col gap-4">
              {/* Step 1 */}
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-[#fbf3db] text-stone-900 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  1
                </div>
                <p className="text-xs sm:text-[13px] text-[#e0ece5] leading-snug font-medium">
                  Her oyuncuya 4 kapalı kart verir. 2 tanesine bakıp hatırla.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-[#fbf3db] text-stone-900 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  2
                </div>
                <p className="text-xs sm:text-[13px] text-[#e0ece5] leading-snug font-medium">
                  Sıranda desteden kart çek, elindeki bir kartla değiştir veya at.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-[#fbf3db] text-stone-900 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  3
                </div>
                <p className="text-xs sm:text-[13px] text-[#e0ece5] leading-snug font-medium">
                  Her tur için 20 saniyen var. Oyun 3 turda biter.
                </p>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-[#fbf3db] text-stone-900 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  4
                </div>
                <p className="text-xs sm:text-[13px] text-[#e0ece5] leading-snug font-medium">
                  Tüm kartlar açılır, toplamı daha düşük olan kazanır.
                </p>
              </div>
            </div>
          </div>

          {/* Kamikaze Highlight Box */}
          <div className="mt-5 pt-3 border-t border-[#1d3527]/80">
            <div className="bg-[#261116]/90 border border-rose-500/35 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 shadow-inner">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 text-base">
                💀
              </div>
              <div className="text-left flex-1 min-w-0">
                <span className="text-rose-400 font-black text-xs sm:text-sm block">
                  Kamikaze
                </span>
                <span className="text-rose-200/80 text-[11px] leading-tight font-medium block">
                  12 – 12 – 13 – 13 yaptıysan oyun direkt biter ve kazanırsın.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER COLUMN: "REY" LOGO, TAGLINE & PRIMARY ACTION CARDS */}
        {/* ========================================================================= */}
        <div
          className={`w-full max-w-[420px] flex-col items-center text-center transition-all duration-300 ${
            mobileTab === 'menu' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Sprout Icon Above Title */}
          <div className="mb-0 flex items-center justify-center">
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12 text-[#86efac] drop-shadow-[0_0_16px_rgba(74,222,128,0.85)] filter animate-pulse-slow"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M24 44V22C24 14 30 8 40 8C40 18 34 24 24 24"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="currentColor"
                fillOpacity="0.85"
              />
              <path
                d="M24 28C18 28 10 24 8 16C16 14 22 18 24 24"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="currentColor"
                fillOpacity="0.75"
              />
            </svg>
          </div>

          {/* Monumental REY Title */}
          <h1 className="font-['Cinzel',serif] font-black text-6xl sm:text-7xl md:text-8xl tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-[#fffbe8] via-[#f7d98b] to-[#c59639] drop-shadow-[0_6px_25px_rgba(201,154,62,0.45)] leading-tight select-none">
            REY
          </h1>

          {/* Subtitle */}
          <p className="text-[#dbe6d9] font-['Cinzel',serif] tracking-wider text-xs sm:text-sm md:text-base font-semibold mb-3.5">
            Büyülü Ormanın Zihin ve Kart Oyunu
          </p>

          {/* 3 Feature Pills in a Row: 32 Kart • 3 Tur • 3 El (4 Kart) */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 px-4 py-1.5 rounded-full bg-[#0a1610]/80 border border-[#2b4837]/70 shadow-sm backdrop-blur-xs text-xs font-semibold text-[#b5cbbe] mb-4">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-300">📄</span>
              <span>32 Kart</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-300">🚩</span>
              <span>3 Tur</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-300">👥</span>
              <span>3 El (4 Kart)</span>
            </div>
          </div>

          {/* Delicate Sprout Divider & Poetic Tagline */}
          <div className="flex items-center justify-center gap-2 text-emerald-400 mb-1.5">
            <div className="w-10 h-px bg-gradient-to-r from-transparent to-[#3b6b4f]" />
            <span className="text-xs">🌱</span>
            <div className="w-10 h-px bg-gradient-to-l from-transparent to-[#3b6b4f]" />
          </div>

          <div className="text-center text-xs sm:text-[13px] font-['Cinzel',serif] text-[#e3ece2] leading-relaxed mb-6 font-medium">
            <p>Hatırla. Değiştir. Altında Kal.</p>
            <p>Ya da Kamikaze yapıp oyunu bitir.</p>
          </div>

          {/* Error Message Notification */}
          {errorMessage && (
            <div className="w-full mb-3 p-3 rounded-2xl bg-[#2e1418]/90 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between text-left animate-shake shadow-lg">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 3 Interactive Menu Action Cards */}
          <div className="w-full flex flex-col gap-3">
            {/* 1. Oyun Oluştur (Golden Border & Glow) */}
            <button
              type="button"
              onClick={() => {
                sound.playCardSnap();
                setShowCreateModal(true);
              }}
              className="w-full p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#17231c]/95 via-[#233428]/95 to-[#17231c]/95 border-2 border-[#d4af37]/85 hover:border-amber-300 shadow-[0_0_25px_rgba(212,175,55,0.25)] hover:shadow-[0_0_35px_rgba(212,175,55,0.4)] transition-all duration-200 cursor-pointer flex items-center justify-between group active:scale-98"
            >
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:scale-105 transition shrink-0">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-base sm:text-lg text-[#fef3c7] group-hover:text-amber-200 transition">
                    Oyun Oluştur
                  </div>
                  <div className="text-xs text-[#a7bfae]">
                    Yeni bir oda aç ve arkadaşını davet et.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-300 group-hover:translate-x-1 transition shrink-0" />
            </button>

            {/* 2. Odaya Katıl */}
            <button
              type="button"
              onClick={() => {
                sound.playCardSnap();
                setShowJoinModal(true);
              }}
              className="w-full p-3.5 sm:p-4 rounded-2xl bg-[#0c1812]/85 hover:bg-[#14261d]/90 border border-[#2b4837]/70 hover:border-[#447053]/80 shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-between group active:scale-98"
            >
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-base sm:text-lg text-white group-hover:text-emerald-100 transition">
                    Odaya Katıl
                  </div>
                  <div className="text-xs text-[#8caaa0]">
                    Oda kodu ile oyuna katıl.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-1 transition shrink-0" />
            </button>

            {/* 3. Kuralları Gör */}
            <button
              type="button"
              onClick={() => {
                sound.playCardSnap();
                onOpenRules();
              }}
              className="w-full p-3.5 sm:p-4 rounded-2xl bg-[#0c1812]/85 hover:bg-[#14261d]/90 border border-[#2b4837]/70 hover:border-[#447053]/80 shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-between group active:scale-98"
            >
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center text-teal-300 group-hover:scale-105 transition shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-base sm:text-lg text-white group-hover:text-teal-100 transition">
                    Kuralları Gör
                  </div>
                  <div className="text-xs text-[#8caaa0]">
                    Hızlı bir şekilde nasıl oynanır öğren.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-1 transition shrink-0" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: "Kartlar (32)" */}
        {/* ========================================================================= */}
        <div
          className={`w-full max-w-[360px] lg:max-w-[330px] xl:max-w-[360px] bg-[#0c1813]/85 backdrop-blur-md border border-[#233d2f]/70 rounded-3xl p-5 sm:p-6 shadow-2xl flex-col justify-between transition-all duration-300 ${
            mobileTab === 'cards' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div>
            <h3 className="text-white font-bold text-lg sm:text-xl tracking-wide mb-4">
              Kartlar (32)
            </h3>

            <div className="flex flex-col gap-3.5">
              {/* Row 1: 0 – 6 (Normal Kartlar) */}
              <div className="flex items-center justify-between py-1 border-b border-[#1b3425]/60 pb-2.5">
                <div className="flex items-center gap-3">
                  {/* Mini Card 0 */}
                  <div className="w-8 h-12 rounded-md bg-gradient-to-b from-[#fcfbf7] to-[#eee8d5] border border-[#cfc3a5] shadow flex flex-col items-center justify-between p-0.5 text-stone-900 shrink-0">
                    <span className="text-[10px] font-black leading-none">0</span>
                    <span className="text-[10px]">🌱</span>
                    <span className="text-[10px] font-black leading-none rotate-180">0</span>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-white">0 – 6</div>
                    <div className="text-xs text-[#8da898]">Normal kartlar</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white">2'şer</div>
                  <div className="text-[11px] text-[#8da898]">(14 toplam)</div>
                </div>
              </div>

              {/* Row 2: 7 & 8 (Peek) */}
              <div className="flex items-center justify-between py-1 border-b border-[#1b3425]/60 pb-2.5">
                <div className="flex items-center gap-3">
                  {/* Mini Cards 7 & 8 */}
                  <div className="flex items-center -space-x-2 shrink-0">
                    <div className="w-7 h-11 rounded-md bg-gradient-to-b from-[#f0fcf6] to-[#d6f5e3] border border-emerald-400 shadow flex flex-col items-center justify-between p-0.5 text-emerald-950 z-10">
                      <span className="text-[9px] font-black leading-none">7</span>
                      <Eye className="w-2.5 h-2.5 text-emerald-700" />
                      <span className="text-[9px] font-black leading-none rotate-180">7</span>
                    </div>
                    <div className="w-7 h-11 rounded-md bg-gradient-to-b from-[#f5f3ff] to-[#ddd6fe] border border-indigo-400 shadow flex flex-col items-center justify-between p-0.5 text-indigo-950">
                      <span className="text-[9px] font-black leading-none">8</span>
                      <Eye className="w-2.5 h-2.5 text-indigo-700" />
                      <span className="text-[9px] font-black leading-none rotate-180">8</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-white">Peek</div>
                    <div className="text-xs text-[#8da898]">Kendi kartına bak.</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white">2'şer</div>
                  <div className="text-[11px] text-[#8da898]">(4 toplam)</div>
                </div>
              </div>

              {/* Row 3: 9 & 10 (Spy) */}
              <div className="flex items-center justify-between py-1 border-b border-[#1b3425]/60 pb-2.5">
                <div className="flex items-center gap-3">
                  {/* Mini Cards 9 & 10 */}
                  <div className="flex items-center -space-x-2 shrink-0">
                    <div className="w-7 h-11 rounded-md bg-gradient-to-b from-[#f0f9ff] to-[#bae6fd] border border-sky-400 shadow flex flex-col items-center justify-between p-0.5 text-sky-950 z-10">
                      <span className="text-[9px] font-black leading-none">9</span>
                      <Radio className="w-2.5 h-2.5 text-sky-700" />
                      <span className="text-[9px] font-black leading-none rotate-180">9</span>
                    </div>
                    <div className="w-7 h-11 rounded-md bg-gradient-to-b from-[#fffbeb] to-[#fde68a] border border-amber-400 shadow flex flex-col items-center justify-between p-0.5 text-amber-950">
                      <span className="text-[9px] font-black leading-none">10</span>
                      <Radio className="w-2.5 h-2.5 text-amber-700" />
                      <span className="text-[9px] font-black leading-none rotate-180">10</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-white">Spy</div>
                    <div className="text-xs text-[#8da898]">Rakibin kartına bak.</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white">2'şer</div>
                  <div className="text-[11px] text-[#8da898]">(4 toplam)</div>
                </div>
              </div>

              {/* Row 4: 11 & 12 (Swap) */}
              <div className="flex items-center justify-between py-1 border-b border-[#1b3425]/60 pb-2.5">
                <div className="flex items-center gap-3">
                  {/* Mini Cards 11 & 12 */}
                  <div className="flex items-center -space-x-2 shrink-0">
                    <div className="w-7 h-11 rounded-md bg-gradient-to-b from-[#fff7ed] to-[#fed7aa] border border-amber-400 shadow flex flex-col items-center justify-between p-0.5 text-amber-950 z-10">
                      <span className="text-[9px] font-black leading-none">11</span>
                      <ArrowLeftRight className="w-2.5 h-2.5 text-amber-700" />
                      <span className="text-[9px] font-black leading-none rotate-180">11</span>
                    </div>
                    <div className="w-7 h-11 rounded-md bg-gradient-to-b from-[#fff1f2] to-[#fecdd3] border border-rose-400 shadow flex flex-col items-center justify-between p-0.5 text-rose-950">
                      <span className="text-[9px] font-black leading-none">12</span>
                      <ArrowLeftRight className="w-2.5 h-2.5 text-rose-700" />
                      <span className="text-[9px] font-black leading-none rotate-180">12</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-white">Swap</div>
                    <div className="text-xs text-[#8da898]">Bir kartı değiştir.</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold text-white">11: 2 adet</div>
                  <div className="text-[11px] font-bold text-white">12: 4 adet</div>
                  <div className="text-[10px] text-[#8da898]">(6 toplam)</div>
                </div>
              </div>

              {/* Row 5: 13 (Kamikaze) */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  {/* Mini Card 13 */}
                  <div className="w-8 h-12 rounded-md bg-gradient-to-b from-[#fff1f2] via-[#ffe4e6] to-[#fecdd3] border border-rose-400 shadow flex flex-col items-center justify-between p-0.5 text-rose-950 shrink-0">
                    <span className="text-[10px] font-black leading-none">13</span>
                    <Flame className="w-3.5 h-3.5 text-rose-600 fill-current" />
                    <span className="text-[10px] font-black leading-none rotate-180">13</span>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-rose-300">Kamikaze</div>
                    <div className="text-[11px] text-rose-200/90 font-medium">12 – 12 – 13 – 13</div>
                    <div className="text-[10px] text-rose-300/80 font-medium">= anında kazan.</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white">4 adet</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER: Minimal transparent footer so table card art stays visible */}
      <footer className="w-full py-2 px-4 text-center z-10">
        <span className="text-[10px] text-stone-400/60 font-serif tracking-widest">
          REY CARD GAME
        </span>
      </footer>

      {/* ========================================================================= */}
      {/* MODAL 1: OYUN OLUŞTUR (CREATE ROOM) */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#13241b] border-2 border-amber-400/80 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.3)] relative">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white transition p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#fef3c7]">Oyun Oluştur</h3>
                <p className="text-xs text-[#a7bfae]">Yeni bir masa kur ve oyunu başlat</p>
              </div>
            </div>

            {/* Name Input */}
            <div className="mb-4">
              <label className="text-xs font-bold text-amber-200 block mb-1.5">
                Oyuncu Adınız
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={16}
                placeholder="Adınız..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#0b1610] border border-[#2d4d38] text-white text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Avatar Selector */}
            <div className="mb-6">
              <label className="text-xs font-bold text-amber-200 block mb-1.5">
                Avatar Seçin
              </label>
              <div className="grid grid-cols-5 gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => {
                      sound.playCardFlip();
                      setSelectedAvatar(av);
                    }}
                    className={`h-11 rounded-xl text-xl flex items-center justify-center transition border cursor-pointer ${
                      selectedAvatar === av
                        ? 'bg-amber-500/25 border-amber-400 scale-105 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                        : 'bg-[#0b1610] border-[#274232] hover:bg-[#1a3123]'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 rounded-xl bg-[#1b2f23] hover:bg-[#253f30] text-stone-300 font-bold text-xs sm:text-sm transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleStartCreate}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-black text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🌱 Masayı Kur</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ODAYA KATIL (JOIN ROOM) */}
      {/* ========================================================================= */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border-2 border-emerald-400/80 bg-[#13241b] p-5 shadow-[0_0_50px_rgba(52,211,153,0.3)] sm:p-7">
            <button
              type="button"
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white transition p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Odaya Katıl</h3>
                <p className="text-xs text-[#a7bfae]">Arkadaşının paylaştığı kodu gir</p>
              </div>
            </div>

            {/* Room Code Input */}
            <div className="mb-4">
              <label className="text-xs font-bold text-emerald-200 block mb-1.5">
                6 Haneli Oda Kodu
              </label>
              <input
                type="text"
                value={inputRoomCode}
                onChange={(e) => {
                  setInputRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setErrorMessage(null);
                }}
                maxLength={6}
                placeholder="Örn: 482910"
                className="w-full px-4 py-3 rounded-xl bg-[#0b1610] border border-[#2d4d38] text-white text-center text-xl font-mono tracking-widest focus:outline-none focus:border-emerald-400 placeholder:text-stone-600"
              />
              <button
                type="button"
                onClick={() => {
                  sound.playCardSnap();
                  setErrorMessage(null);
                  setShowQrScanner(true);
                }}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/45 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-200 transition active:scale-[0.98] sm:hidden"
              >
                <Camera className="h-4 w-4" />
                QR Kodunu Kamerayla Okut
              </button>
              {errorMessage && (
                <p className="mt-2 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-[10px] font-semibold text-rose-200">
                  {errorMessage}
                </p>
              )}
            </div>

            {/* Player Name */}
            <div className="mb-4">
              <label className="text-xs font-bold text-emerald-200 block mb-1.5">
                Oyuncu Adınız
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={16}
                placeholder="Adınız..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#0b1610] border border-[#2d4d38] text-white text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Avatar Selector */}
            <div className="mb-6">
              <label className="text-xs font-bold text-emerald-200 block mb-1.5">
                Avatar Seçin
              </label>
              <div className="grid grid-cols-5 gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => {
                      sound.playCardFlip();
                      setSelectedAvatar(av);
                    }}
                    className={`h-11 rounded-xl text-xl flex items-center justify-center transition border cursor-pointer ${
                      selectedAvatar === av
                        ? 'bg-emerald-500/25 border-emerald-400 scale-105 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                        : 'bg-[#0b1610] border-[#274232] hover:bg-[#1a3123]'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="flex-1 py-3 rounded-xl bg-[#1b2f23] hover:bg-[#253f30] text-stone-300 font-bold text-xs sm:text-sm transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleStartJoin}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-stone-950 font-black text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🍃 Masaya Katıl</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showQrScanner && (
        <QrScannerDialog
          onClose={() => setShowQrScanner(false)}
          onDetected={(roomCode) => {
            sound.playCardSnap();
            setInputRoomCode(roomCode);
            setErrorMessage(null);
            setShowQrScanner(false);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PROFİL / AVATAR DÜZENLE */}
      {/* ========================================================================= */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#13241b] border border-amber-400/60 rounded-3xl p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>🌱</span> Profilini Düzenle
            </h3>

            <div className="mb-4">
              <label className="text-xs text-[#a7bfae] block mb-1">Oyuncu Adınız</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  localStorage.setItem('rey_player_name', e.target.value);
                }}
                maxLength={16}
                className="w-full px-3.5 py-2 rounded-xl bg-[#0b1610] border border-[#2d4d38] text-white text-sm"
              />
            </div>

            <div className="mb-5">
              <label className="text-xs text-[#a7bfae] block mb-1.5">Avatarın</label>
              <div className="grid grid-cols-5 gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => {
                      sound.playCardFlip();
                      setSelectedAvatar(av);
                      localStorage.setItem('rey_avatar', av);
                    }}
                    className={`h-10 rounded-xl text-lg flex items-center justify-center transition border cursor-pointer ${
                      selectedAvatar === av
                        ? 'bg-amber-500/25 border-amber-400'
                        : 'bg-[#0b1610] border-[#274232]'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowProfileModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm transition"
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: İSTATİSTİKLER (STATS) */}
      {/* ========================================================================= */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#13241b] border border-amber-400/60 rounded-3xl p-6 shadow-2xl relative text-center">
            <button
              type="button"
              onClick={() => setShowStatsModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 mx-auto mb-3">
              <Trophy className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-[#fef3c7] mb-1">Kariyer İstatistikleri</h3>
            <p className="text-xs text-[#a7bfae] mb-4">{playerName} ({selectedAvatar})</p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-[#0b1610] border border-[#2d4d38]">
                <div className="text-2xl font-black text-amber-300">{stats.played || 0}</div>
                <div className="text-[11px] text-[#8da898]">Oynanan Maç</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#0b1610] border border-[#2d4d38]">
                <div className="text-2xl font-black text-emerald-300">{stats.won || 0}</div>
                <div className="text-[11px] text-[#8da898]">Kazanılan Parti</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#0b1610] border border-[#2d4d38]">
                <div className="text-2xl font-black text-rose-300">{stats.kamikaze || 0}</div>
                <div className="text-[11px] text-[#8da898]">Kamikaze Zaferi</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#0b1610] border border-[#2d4d38]">
                <div className="text-2xl font-black text-yellow-300">
                  {stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0}%
                </div>
                <div className="text-[11px] text-[#8da898]">Kazanma Oranı</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowStatsModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm transition"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: AYARLAR (SETTINGS) */}
      {/* ========================================================================= */}
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
              {/* Sound Toggle */}
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

              {/* Version & Credits */}
              <div className="p-3 rounded-2xl bg-[#0b1610] border border-[#2d4d38] text-xs text-[#8da898]">
                <div className="font-bold text-white mb-1">REY v2.0</div>
                <div>Ghibli Studio Inspired Card Game</div>
                <div className="mt-1 text-[11px] text-amber-200/80">
                  32 Kart • 3 Tur • Özel Güçler • Kamikaze
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm transition"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
