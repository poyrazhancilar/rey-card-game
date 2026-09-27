import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { ClientGameState } from '../types/game';
import {
  Copy,
  Check,
  Users,
  Bot,
  Play,
  BookOpen,
  Settings,
  Volume2,
  VolumeX,
  Share2,
  Camera,
  Loader2,
  X,
  Link as LinkIcon,
} from 'lucide-react';
import { sound } from '../audio/soundEngine';
import { copyText } from '../utils/clipboard';

interface LobbyProps {
  gameState: ClientGameState;
  myPlayerId: string;
  onStartGame: () => void;
  onAddAI: () => void;
  onRemoveAI: (aiId: string) => void;
  onOpenRules?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

// Decorative Tarot Card rendered on the corners of the background
const DecorativeCardBack: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`w-36 h-56 sm:w-44 sm:h-68 rounded-2xl bg-gradient-to-br from-[#0e2318] via-[#091710] to-[#040b07] border border-[#d4af37]/45 shadow-[0_15px_35px_rgba(0,0,0,0.85)] p-2.5 sm:p-3 flex flex-col items-center justify-between select-none pointer-events-none relative overflow-hidden ${className}`}
  >
    {/* Inner gold ornate filigree border */}
    <div className="absolute inset-1.5 sm:inset-2 rounded-xl border border-[#d4af37]/35 pointer-events-none" />
    <div className="absolute inset-2.5 sm:inset-3 rounded-lg border border-[#34d399]/15 pointer-events-none" />

    {/* Top left & bottom right corner diamonds */}
    <span className="self-start text-[10px] text-amber-300/60 font-serif">✦</span>

    {/* Center crest: Gold sprout in circle */}
    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-[#d4af37]/50 flex items-center justify-center bg-[#06120b]/80 shadow-inner">
      <svg
        className="w-8 h-8 sm:w-9 sm:h-9 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M24 44V22C24 14 30 8 40 8C40 18 34 24 24 24"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity="0.85"
        />
        <path
          d="M24 28C18 28 10 24 8 16C16 14 22 18 24 24"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity="0.75"
        />
      </svg>
    </div>

    <span className="self-end text-[10px] text-amber-300/60 font-serif">✦</span>
  </div>
);

export const Lobby: React.FC<LobbyProps> = ({
  gameState,
  myPlayerId,
  onStartGame,
  onAddAI,
  onRemoveAI,
  onOpenRules,
  isMuted = false,
  onToggleMute,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [linkFeedback, setLinkFeedback] = useState<'shared' | 'copied' | null>(null);
  const [shareError, setShareError] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const me = gameState.players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost || false;

  const botPlayer = gameState.players.find((p) => p.isAI);
  const otherPlayer = gameState.players.find((p) => p.id !== myPlayerId);

  // Construct sharing URL
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${gameState.roomCode}`;

  const copyCode = async () => {
    sound.playCardSnap();
    setShareError('');
    if (await copyText(gameState.roomCode)) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setShareError('Kod kopyalanamadı. Kodu basılı tutarak seçebilirsiniz.');
    }
  };

  const shareLink = async () => {
    sound.playCardSnap();
    setShareError('');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'REY oyun masası',
          text: `REY masasına katıl — Oda: ${gameState.roomCode}`,
          url: shareUrl,
        });
        setLinkFeedback('shared');
        setTimeout(() => setLinkFeedback(null), 2000);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    if (await copyText(shareUrl)) {
      setLinkFeedback('copied');
      setTimeout(() => setLinkFeedback(null), 2000);
    } else {
      setShareError('Bağlantı paylaşılamadı. QR kodunu kullanabilirsiniz.');
    }
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between overflow-x-hidden bg-[#09150e] text-[#f2f7f4] select-none">
      {/* ========================================================================= */}
      {/* BACKGROUND GEOMETRIC CURVES, STARS & FLOATING TAROT CARDS */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Deep radial vignette */}
        <div className="absolute inset-0 bg-radial from-[#12281c]/60 via-[#0c1b12]/90 to-[#06100a] pointer-events-none" />

        {/* Elegant geometric concentric arcs */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-45"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-80,180 Q 220,120 480,480 T 780,820"
            stroke="rgba(212, 175, 55, 0.18)"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M-40,240 Q 260,180 520,540 T 820,880"
            stroke="rgba(52, 211, 153, 0.12)"
            strokeWidth="1"
            fill="none"
          />
          <circle
            cx="220"
            cy="260"
            r="160"
            stroke="rgba(212, 175, 55, 0.14)"
            strokeWidth="1"
            fill="none"
          />
          <circle
            cx="220"
            cy="260"
            r="240"
            stroke="rgba(52, 211, 153, 0.08)"
            strokeWidth="1"
            fill="none"
          />

          <path
            d="M 1200,80 Q 940,320 860,640 T 1060,980"
            stroke="rgba(212, 175, 55, 0.18)"
            strokeWidth="1.5"
            fill="none"
          />
          <circle
            cx="1020"
            cy="360"
            r="190"
            stroke="rgba(52, 211, 153, 0.1)"
            strokeWidth="1"
            fill="none"
          />

          {/* Golden Diamond Star Accents ✦ */}
          <text x="320" y="380" fill="rgba(212, 175, 55, 0.6)" fontSize="18" fontFamily="serif">✦</text>
          <text x="890" y="320" fill="rgba(212, 175, 55, 0.6)" fontSize="18" fontFamily="serif">✦</text>
          <text x="140" y="780" fill="rgba(212, 175, 55, 0.5)" fontSize="16" fontFamily="serif">✦</text>
          <text x="1080" y="720" fill="rgba(212, 175, 55, 0.5)" fontSize="16" fontFamily="serif">✦</text>
        </svg>

        {/* Floating Decorative Cards (top-left, bottom-left, bottom-right) */}
        <DecorativeCardBack className="absolute -top-12 -left-12 -rotate-14 opacity-85 hidden sm:flex" />
        <DecorativeCardBack className="absolute -bottom-16 -left-10 rotate-18 opacity-80 hidden md:flex" />
        <DecorativeCardBack className="absolute -bottom-14 -right-10 rotate-14 opacity-85 hidden sm:flex" />
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR */}
      {/* ========================================================================= */}
      <header className="w-full flex items-center justify-between px-3.5 sm:px-8 py-2.5 sm:py-3.5 bg-[#08120d]/80 border-b border-[#1b3425]/70 backdrop-blur-md z-30 shrink-0">
        {/* Left: REY logo & Game Status Chips */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* Logo */}
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 text-lg sm:text-xl">🌱</span>
            <span className="font-['Cinzel',serif] font-black text-amber-200 text-lg sm:text-xl tracking-wider">
              REY
            </span>
          </div>

          {/* El Pill */}
          <span className="text-[11px] sm:text-xs font-bold px-3 py-0.5 sm:py-1 rounded-full bg-[#1b2b1f]/90 border border-[#3a5843]/80 text-[#fde68a]">
            El {gameState.handNumber || 1}/3
          </span>

          {/* Tur Pill */}
          <span className="text-[11px] sm:text-xs font-bold px-3 py-0.5 sm:py-1 rounded-full bg-[#132c20]/90 border border-[#2b543b]/80 text-[#86efac]">
            Tur {gameState.turNumber || 1}/3
          </span>

          {/* Room Code Badge with Copy Icon */}
          <button
            type="button"
            onClick={copyCode}
            className="flex items-center gap-1.5 text-xs text-amber-100/90 font-mono pl-2 sm:pl-3 border-l border-[#244230] cursor-pointer hover:text-amber-200 transition"
            title="Oda kodunu kopyala"
          >
            <span>Oda:</span>
            <strong className="text-white font-bold tracking-wider">{gameState.roomCode}</strong>
            {copiedCode ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-amber-300" />
            )}
          </button>
        </div>

        {/* Right: Rules, Settings & Mute Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Kurallar Button */}
          {onOpenRules && (
            <button
              type="button"
              onClick={() => {
                sound.playCardSnap();
                onOpenRules();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14261d]/85 hover:bg-[#1e382b] border border-[#2d4d3a]/70 text-xs font-bold text-[#e6f4ea] transition cursor-pointer shadow-sm active:scale-95"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-300" />
              <span>Kurallar</span>
            </button>
          )}

          {/* Settings Button */}
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

          {/* Audio / Mute Button */}
          {onToggleMute && (
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
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. CENTER BRANDING & TITLE */}
      {/* ========================================================================= */}
      <div className="w-full flex flex-col items-center pt-3 sm:pt-6 pb-2 text-center z-20">
        {/* Top Feature Pill */}
        <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#27190b]/90 border border-[#854d0e]/70 text-[#fde68a] text-xs font-bold mb-2 shadow-sm">
          <span>🌾</span>
          <span>2 Kişilik Büyülü Zihin & Kart Oyunu</span>
        </div>

        {/* Sprout Icon Above Title */}
        <div className="mb-0 flex items-center justify-center">
          <svg
            className="w-9 h-9 sm:w-11 sm:h-11 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]"
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
              fillOpacity="0.9"
            />
            <path
              d="M24 28C18 28 10 24 8 16C16 14 22 18 24 24"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="currentColor"
              fillOpacity="0.8"
            />
          </svg>
        </div>

        {/* Monumental REY Title with Line */}
        <div className="relative flex items-center justify-center">
          <div className="w-12 sm:w-20 h-px bg-gradient-to-r from-transparent to-[#b48937]" />
          <h1 className="font-['Cinzel',serif] font-black text-4xl sm:text-5xl md:text-6xl tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-b from-[#fffbe8] via-[#f7d98b] to-[#c59639] drop-shadow-[0_4px_20px_rgba(201,154,62,0.4)] px-4 select-none">
            REY
          </h1>
          <div className="w-12 sm:w-20 h-px bg-gradient-to-l from-transparent to-[#b48937]" />
        </div>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-[#9db6a5] font-serif tracking-wider mt-1">
          32 Kart • 3 Tur • 3 Oyunluk Parti
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 3. TWO MAIN GLASS CARDS: ODA KODU & OYUNCULAR */}
      {/* ========================================================================= */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-2 sm:py-4 flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 z-20 flex-1">
        {/* ------------------------------------------------------------------------- */}
        {/* LEFT CARD: ODA KODU & QR CODE */}
        {/* ------------------------------------------------------------------------- */}
        <div className="w-full max-w-[420px] bg-[#0c1812]/90 backdrop-blur-md border border-[#223d2e]/85 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col items-center justify-between">
          <div className="w-full flex flex-col items-center">
            {/* Header with link icon */}
            <div className="w-full flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <LinkIcon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-black tracking-widest text-[#e6f4ea] uppercase">
                  ODA KODU
                </div>
                <div className="text-xs text-[#8ca898]">Arkadaşınla paylaş ve oyuna başla.</div>
              </div>
            </div>

            {/* 6 Digit Display Boxes */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 my-2 w-full">
              {gameState.roomCode.split('').map((char, i) => (
                <div
                  key={i}
                  className="w-10 sm:w-11 h-13 sm:h-14 rounded-xl bg-[#08120d] border-2 border-amber-500/70 flex items-center justify-center text-2xl sm:text-3xl font-mono font-black text-[#fef08a] shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                >
                  {char}
                </div>
              ))}
            </div>

            {/* Action Buttons: Kodu Kopyala & Linki Paylaş */}
            <div className="flex gap-2.5 w-full mt-3.5">
              <button
                type="button"
                onClick={copyCode}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#24170d]/90 hover:bg-[#342213] border border-amber-500/60 text-xs sm:text-sm font-bold text-amber-200 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                {copiedCode ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedCode ? 'Kopyalandı!' : 'Kodu Kopyala'}</span>
              </button>

              <button
                type="button"
                onClick={shareLink}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#0e2418]/90 hover:bg-[#163826] border border-emerald-500/60 text-xs sm:text-sm font-bold text-emerald-200 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                {linkFeedback ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span>
                  {linkFeedback === 'shared'
                    ? 'Paylaşıldı!'
                    : linkFeedback === 'copied'
                    ? 'Link Kopyalandı!'
                    : 'Linki Paylaş'}
                </span>
              </button>
            </div>

            {shareError && (
              <p className="mt-2 text-center text-[10px] font-semibold text-rose-300">{shareError}</p>
            )}

            {/* QR Code Container */}
            <div className="p-3 bg-white rounded-2xl shadow-xl mt-5 mb-2.5">
              <QRCodeSVG value={shareUrl} size={135} level="M" includeMargin={false} />
            </div>

            {/* Camera Tip */}
            <div className="flex items-center gap-1.5 text-[11px] text-[#8ca898] mt-1">
              <Camera className="w-3.5 h-3.5 text-amber-300" />
              <span>Kameranla QR kodu taratarak katılın</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* RIGHT CARD: OYUNCULAR (1/2) & OYUNU BAŞLAT */}
        {/* ------------------------------------------------------------------------- */}
        <div className="w-full max-w-[460px] bg-[#0c1812]/90 backdrop-blur-md border border-[#223d2e]/85 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col justify-between min-h-[380px]">
          <div>
            {/* Header: Oyuncular count & Waiting Status */}
            <div className="w-full flex items-center justify-between pb-3.5 border-b border-[#1c3827] mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-white text-base sm:text-lg">
                  Oyuncular ({gameState.players.length}/2)
                </h3>
              </div>

              {gameState.players.length < 2 ? (
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>2. Oyuncu bekleniyor...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-bold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Masa Hazır!</span>
                </div>
              )}
            </div>

            {/* Players Stack */}
            <div className="flex flex-col gap-3">
              {/* Slot 1: You (Current Player) */}
              {me && (
                <div className="w-full p-3 sm:p-3.5 rounded-2xl bg-[#08120d] border border-[#223c2d] flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#14291d] border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                      {me.avatar || '🌱'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-sm sm:text-base">{me.name}</span>
                        <span className="bg-amber-500/20 border border-amber-400/50 text-amber-200 text-[10px] font-black px-1.5 py-0.5 rounded">
                          SEN
                        </span>
                        {me.isHost && (
                          <span className="bg-amber-950/60 border border-amber-600/50 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            KURUCU
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#8ca898] mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                        <span>Bağlandı</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Slot 2: Rival or Waiting */}
              {otherPlayer ? (
                <div className="w-full p-3 sm:p-3.5 rounded-2xl bg-[#08120d] border border-[#223c2d] flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#14291d] border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                      {otherPlayer.avatar || '🦊'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-sm sm:text-base">
                          {otherPlayer.name}
                        </span>
                        {otherPlayer.isAI ? (
                          <span className="bg-teal-500/20 border border-teal-400/50 text-teal-200 text-[10px] font-black px-1.5 py-0.5 rounded">
                            BOT
                          </span>
                        ) : (
                          <span className="bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-[10px] font-black px-1.5 py-0.5 rounded">
                            RAKİP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#8ca898] mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                        <span>Bağlandı</span>
                      </div>
                    </div>
                  </div>
                  {isHost && otherPlayer.isAI && (
                    <button
                      type="button"
                      onClick={() => onRemoveAI(otherPlayer.id)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/40 transition cursor-pointer"
                      title="Botu Çıkar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full p-4 rounded-2xl border border-dashed border-[#1f3729] bg-[#07100b]/60 flex items-center justify-center text-xs text-[#6e8a7c] gap-2">
                  <span className="text-amber-300 font-bold">+</span>
                  <span>2. oyuncunun katılması bekleniyor...</span>
                </div>
              )}
            </div>

            {/* Bot Option Row (Tek başına oynamak için: Bot Ekle) */}
            <div className="flex items-center justify-between pt-3 pb-1 border-t border-[#1a3325]/70 mt-4">
              <span className="text-xs text-[#8ca898]">Tek başına oynamak için:</span>
              {!botPlayer && gameState.players.length < 2 ? (
                <button
                  type="button"
                  onClick={() => {
                    sound.playCardFlip();
                    onAddAI();
                  }}
                  className="py-1.5 px-3 rounded-xl bg-[#0e2419] hover:bg-[#163625] border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
                >
                  <Bot className="w-4 h-4" />
                  <span>Bot Ekle</span>
                </button>
              ) : botPlayer && isHost ? (
                <button
                  type="button"
                  onClick={() => onRemoveAI(botPlayer.id)}
                  className="py-1.5 px-3 rounded-xl bg-[#2e1217] hover:bg-[#3d1820] border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
                >
                  <X className="w-4 h-4" />
                  <span>Botu Çıkar</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Big Action Button at bottom: 2 Oyuncu Gerekiyor OR Oyunu Başlat */}
          <div className="w-full mt-4">
            {gameState.players.length < 2 ? (
              <button
                type="button"
                disabled
                className="w-full py-3.5 sm:py-4 rounded-2xl bg-[#13241b] border border-[#233f2e] text-[#6b8577] font-black text-sm flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-current opacity-60" />
                <span>2 Oyuncu Gerekiyor</span>
              </button>
            ) : isHost ? (
              <button
                type="button"
                onClick={onStartGame}
                className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-black text-base shadow-[0_0_25px_rgba(245,158,11,0.45)] flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition animate-pulse-slow border border-amber-200"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Oyunu Başlat!</span>
              </button>
            ) : (
              <div className="w-full py-3.5 rounded-2xl bg-[#13241b] border border-[#233f2e] text-amber-200/90 font-bold text-xs sm:text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span>Kurucunun oyunu başlatması bekleniyor...</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer text */}
      <footer className="w-full py-2.5 px-4 text-center z-10">
        <span className="text-[10px] text-stone-400/50 font-serif tracking-widest">
          REY CARD GAME • LOBİ ODASI • 3 TUR 3 EL
        </span>
      </footer>

      {/* Settings Modal */}
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
              {onToggleMute && (
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
              )}

              <div className="p-3 rounded-2xl bg-[#0b1610] border border-[#2d4d38] text-xs text-[#8da898]">
                <div className="font-bold text-white mb-1">REY v2.0</div>
                <div>Ghibli Studio Inspired Card Game</div>
                <div className="mt-1 text-[11px] text-amber-200/80">
                  Oda: {gameState.roomCode}
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
