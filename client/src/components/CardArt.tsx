import React from 'react';

export interface CardArtProps {
  value: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const CardArtwork: React.FC<CardArtProps> = ({ value, size = 'md' }) => {
  const iconSize = size === 'xs' ? 30 : size === 'sm' ? 36 : size === 'lg' ? 84 : 48;

  switch (value) {
    case 0:
      // Void Wisp - Cosmic ethereal vortex
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none" className="drop-shadow-lg">
          <circle cx="50" cy="50" r="38" stroke="url(#g0_glow)" strokeWidth="2.5" strokeDasharray="4 3" opacity="0.8" />
          <circle cx="50" cy="50" r="28" fill="url(#g0_core)" opacity="0.85" />
          <ellipse cx="50" cy="50" rx="16" ry="34" stroke="#a78bfa" strokeWidth="2" transform="rotate(45 50 50)" />
          <ellipse cx="50" cy="50" rx="16" ry="34" stroke="#67e8f9" strokeWidth="2" transform="rotate(-45 50 50)" />
          <circle cx="50" cy="50" r="8" fill="#ffffff" filter="drop-shadow(0 0 8px #ffffff)" />
          <circle cx="38" cy="35" r="2.5" fill="#fbcfe8" />
          <circle cx="62" cy="65" r="2.5" fill="#bae6fd" />
          <defs>
            <radialGradient id="g0_core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#312e81" stopOpacity="0.1" />
            </radialGradient>
            <linearGradient id="g0_glow" x1="0" y1="0" x2="100" y2="100">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 1:
      // Forest Pixie - Gentle dawn fairy
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none">
          <path d="M50 18 C35 30 25 50 48 65 C40 45 42 30 50 18 Z" fill="#4ade80" opacity="0.75" />
          <path d="M50 18 C65 30 75 50 52 65 C60 45 58 30 50 18 Z" fill="#86efac" opacity="0.75" />
          <path d="M48 65 C30 72 20 88 50 92 C45 80 46 72 48 65 Z" fill="#22c55e" opacity="0.6" />
          <path d="M52 65 C70 72 80 88 50 92 C55 80 54 72 52 65 Z" fill="#22c55e" opacity="0.6" />
          <circle cx="50" cy="52" r="7" fill="#fef08a" filter="drop-shadow(0 0 6px #fef08a)" />
          <circle cx="50" cy="52" r="3" fill="#ffffff" />
        </svg>
      );

    case 2:
      // Silver Hare - Swift crescent hare
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none">
          <path d="M35 20 C36 35 44 42 46 54 C40 50 36 40 35 20 Z" fill="#cbd5e1" />
          <path d="M45 16 C48 33 52 42 50 54 C48 40 46 32 45 16 Z" fill="#e2e8f0" />
          <ellipse cx="52" cy="64" rx="20" ry="14" fill="#94a3b8" />
          <circle cx="48" cy="56" r="11" fill="#cbd5e1" />
          <circle cx="44" cy="53" r="2" fill="#38bdf8" />
          <circle cx="68" cy="68" r="4.5" fill="#f8fafc" />
        </svg>
      );

    case 3:
      // Shadow Fox - Cunning dusk fox
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none">
          <polygon points="32,24 44,48 26,44" fill="#fb923c" />
          <polygon points="68,24 74,44 56,48" fill="#f97316" />
          <polygon points="32,28 40,44 29,42" fill="#fed7aa" />
          <polygon points="68,28 71,42 60,44" fill="#fed7aa" />
          <polygon points="50,78 30,46 70,46" fill="#ea580c" />
          <polygon points="50,78 40,54 60,54" fill="#fff7ed" />
          <circle cx="42" cy="50" r="2.5" fill="#1e293b" />
          <circle cx="58" cy="50" r="2.5" fill="#1e293b" />
          <polygon points="50,74 46,69 54,69" fill="#0f172a" />
        </svg>
      );

    case 4:
      // Emerald Serpent - Jade coils
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none">
          <path
            d="M30 75 C18 60 22 36 40 28 C60 18 80 34 76 54 C72 70 54 82 38 78 C25 75 35 60 50 62 C62 64 68 52 64 42 C60 32 46 32 38 40"
            stroke="url(#g4_snake)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle cx="34" cy="42" r="3" fill="#fbbf24" />
          <defs>
            <linearGradient id="g4_snake" x1="20" y1="20" x2="80" y2="80">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 5:
      // Golden Gryphon - Suncrest gryphon
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="34" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          <path d="M50 22 L55 35 L68 37 L58 46 L61 59 L50 52 L39 59 L42 46 L32 37 L45 35 Z" fill="#fbbf24" />
          <path d="M50 42 C40 42 34 52 34 66 C42 64 48 58 50 52 C52 58 58 64 66 66 C66 52 60 42 50 42 Z" fill="#d97706" />
          <circle cx="50" cy="48" r="3" fill="#ffffff" />
        </svg>
      );

    case 6:
      // Crystal Stag - Antlered winter monarch
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none">
          <path d="M50 52 L50 82" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          <path d="M50 52 C44 44 38 40 28 36 M38 40 L34 28 M30 37 L24 32" stroke="#67e8f9" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M50 52 C56 44 62 40 72 36 M62 40 L66 28 M70 37 L76 32" stroke="#67e8f9" strokeWidth="2.5" strokeLinecap="round" />
          <polygon points="50,48 42,66 58,66" fill="#0284c7" />
          <circle cx="50" cy="58" r="2.5" fill="#e0f2fe" />
        </svg>
      );

    case 7:
      // Moon Owl - PEEK (Eye icon & night owl)
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none">
          <ellipse cx="50" cy="58" rx="24" ry="28" fill="#4338ca" />
          <polygon points="36,28 44,42 30,42" fill="#3730a3" />
          <polygon points="64,28 70,42 56,42" fill="#3730a3" />
          {/* Glowing Eyes */}
          <circle cx="42" cy="48" r="9" fill="#fef08a" stroke="#a5b4fc" strokeWidth="1.5" />
          <circle cx="58" cy="48" r="9" fill="#fef08a" stroke="#a5b4fc" strokeWidth="1.5" />
          <circle cx="42" cy="48" r="4.5" fill="#1e1b4b" />
          <circle cx="58" cy="48" r="4.5" fill="#1e1b4b" />
          <circle cx="44" cy="46" r="1.5" fill="#ffffff" />
          <circle cx="60" cy="46" r="1.5" fill="#ffffff" />
          <polygon points="50,56 46,62 54,62" fill="#f59e0b" />
        </svg>
      );

    case 8:
      // Solar Lynx - PEEK (Sun Lynx)
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="32" stroke="#eab308" strokeWidth="2" strokeDasharray="5 3" />
          <polygon points="32,24 40,42 26,40" fill="#a855f7" />
          <polygon points="68,24 74,40 60,42" fill="#a855f7" />
          <path d="M28 20 L32 25 M72 20 L68 25" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="50" cy="56" rx="22" ry="18" fill="#7e22ce" />
          <ellipse cx="42" cy="52" rx="4" ry="6" fill="#fde047" />
          <ellipse cx="58" cy="52" rx="4" ry="6" fill="#fde047" />
          <ellipse cx="42" cy="52" rx="1.5" ry="4" fill="#3b0764" />
          <ellipse cx="58" cy="52" rx="1.5" ry="4" fill="#3b0764" />
        </svg>
      );

    case 9:
      // Astral Crow - SPY (Celestial Raven)
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none">
          {/* Wings */}
          <path d="M50 50 C30 32 14 36 10 50 C24 50 36 54 50 62 Z" fill="#0284c7" />
          <path d="M50 50 C70 32 86 36 90 50 C76 50 64 54 50 62 Z" fill="#0284c7" />
          {/* Crow Body */}
          <ellipse cx="50" cy="58" rx="12" ry="18" fill="#0f172a" stroke="#06b6d4" strokeWidth="1.5" />
          {/* Beak */}
          <polygon points="50,44 42,40 50,34" fill="#38bdf8" />
          {/* Glowing Eye */}
          <circle cx="48" cy="42" r="3" fill="#06b6d4" filter="drop-shadow(0 0 4px #06b6d4)" />
          <circle cx="48" cy="42" r="1" fill="#ffffff" />
        </svg>
      );

    case 10:
      // Mystic Wolf - SPY (Howling Moon Wolf)
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none">
          <circle cx="62" cy="38" r="22" fill="#0369a1" opacity="0.4" />
          <path
            d="M32 78 C32 60 40 48 50 38 C52 36 50 28 46 24 C52 25 58 30 60 36 C66 38 72 48 70 56 C70 64 66 74 62 78 Z"
            fill="#0891b2"
          />
          <polygon points="46,24 52,22 50,30" fill="#22d3ee" />
          <circle cx="54" cy="38" r="2.5" fill="#fef08a" filter="drop-shadow(0 0 4px #fef08a)" />
        </svg>
      );

    case 11:
      // Arcane Drake - SWAP (Twin-serpent dragon)
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none">
          <path
            d="M34 68 C22 52 30 30 46 32 C58 34 54 48 46 54 C38 60 40 70 52 70 C64 70 74 60 74 46"
            stroke="url(#g11_swap)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <polygon points="74,40 82,48 70,50" fill="#f43f5e" />
          <polygon points="34,74 26,66 38,64" fill="#a855f7" />
          <circle cx="50" cy="50" r="4" fill="#fbbf24" filter="drop-shadow(0 0 6px #fbbf24)" />
          <defs>
            <linearGradient id="g11_swap" x1="20" y1="20" x2="80" y2="80">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 12:
      // Celestial Phoenix - SWAP (Fiery Phoenix)
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none">
          <path d="M50 16 C48 30 38 42 20 46 C34 50 44 44 48 54 C46 64 36 74 42 86 C46 76 52 70 56 70 C60 70 66 76 70 86 C76 74 66 64 64 54 C68 44 78 50 92 46 C74 42 64 30 62 16 C58 28 54 30 50 16 Z" fill="url(#g12_fire)" />
          <circle cx="56" cy="30" r="3" fill="#ffffff" filter="drop-shadow(0 0 4px #facc15)" />
          <defs>
            <linearGradient id="g12_fire" x1="0" y1="0" x2="0" y2="100">
              <stop offset="0%" stopColor="#facc15" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 13:
      // Chaos Dragon - 13 Points (Infernal Titan)
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none">
          {/* Horns */}
          <path d="M38 34 C30 20 18 16 14 18 C18 28 26 34 32 38 Z" fill="#b91c1c" />
          <path d="M62 34 C70 20 82 16 86 18 C82 28 74 34 68 38 Z" fill="#b91c1c" />
          {/* Dragon Head */}
          <polygon points="50,84 28,44 72,44" fill="#7f1d1d" stroke="#ef4444" strokeWidth="2" />
          <polygon points="50,78 36,46 64,46" fill="#450a0a" />
          {/* Glowing Infernal Eyes */}
          <polygon points="40,50 46,52 38,54" fill="#facc15" filter="drop-shadow(0 0 5px #ef4444)" />
          <polygon points="60,50 54,52 62,54" fill="#facc15" filter="drop-shadow(0 0 5px #ef4444)" />
          {/* Nostrils & fire sparks */}
          <circle cx="47" cy="72" r="1.5" fill="#f97316" />
          <circle cx="53" cy="72" r="1.5" fill="#f97316" />
        </svg>
      );

    default:
      return null;
  }
};

// Studio Ghibli Enchanted REY card back (Dark emerald velvet, gold filigree & golden sprout)
export const CardBackArt: React.FC<{ size?: 'xs' | 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const isCompact = size === 'xs' || size === 'sm';
  return (
    <div className="w-full h-full rounded-xl bg-gradient-to-b from-[#0f271b] via-[#091b12] to-[#040e08] border border-[#d4af37]/75 p-1 sm:p-1.5 flex flex-col items-center justify-center relative overflow-hidden shadow-lg select-none">
      {/* Subtle felt texture overlay */}
      <div className="absolute inset-0 opacity-12 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:6px_6px] pointer-events-none" />

      {/* Inner ornate gold frame */}
      <div className="w-full h-full rounded-lg border border-[#d4af37]/45 relative flex items-center justify-center">
        {/* Four corner filigree flourishes */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none text-[#d4af37]/80"
          viewBox="0 0 100 140"
          fill="none"
        >
          {/* Top-left corner flourish */}
          <path d="M 6 18 C 6 10 10 6 18 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" />
          {/* Top-right corner flourish */}
          <path d="M 94 18 C 94 10 90 6 82 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="92" cy="8" r="1.2" fill="currentColor" />
          {/* Bottom-left corner flourish */}
          <path d="M 6 122 C 6 130 10 134 18 134" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="8" cy="132" r="1.2" fill="currentColor" />
          {/* Bottom-right corner flourish */}
          <path d="M 94 122 C 94 130 90 134 82 134" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="92" cy="132" r="1.2" fill="currentColor" />
        </svg>

        {/* Center Golden Sprout Emblem */}
        <div className="relative flex items-center justify-center">
          <svg
            className={`${
              isCompact ? 'w-5 h-5' : 'w-7 sm:w-8 h-7 sm:h-8'
            } text-[#f6d878] drop-shadow-[0_0_8px_rgba(246,216,120,0.7)]`}
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
              fillOpacity="0.95"
            />
            <path
              d="M24 28C18 28 10 24 8 16C16 14 22 18 24 24"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="currentColor"
              fillOpacity="0.85"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
