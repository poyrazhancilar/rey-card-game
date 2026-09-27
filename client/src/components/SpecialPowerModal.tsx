import React from 'react';
import type { SpecialPower } from '../types/game';
import { Eye, Sparkles, Radio, Flame, ArrowLeftRight, Zap } from 'lucide-react';
import { haptic } from '../utils/haptics';

interface SpecialPowerModalProps {
  isOpen: boolean;
  powers: SpecialPower[];
  onSelectPower: (powerId: string) => void;
}

export const SpecialPowerModal: React.FC<SpecialPowerModalProps> = ({
  isOpen,
  powers,
  onSelectPower,
}) => {
  if (!isOpen || !powers || powers.length === 0) return null;

  const powerGridLayout =
    powers.length === 1
      ? 'sm:grid-cols-1 sm:max-w-[240px] sm:mx-auto'
      : powers.length === 2
      ? 'sm:grid-cols-2 sm:max-w-[500px] sm:mx-auto'
      : 'sm:grid-cols-3';

  const getPowerTheme = (type: string) => {
    if (type.startsWith('peek')) {
      return {
        gradient: 'from-[#1c142b] via-[#2a1d40] to-[#1c142b]',
        border: 'border-purple-400/60',
        glow: 'shadow-[0_4px_20px_rgba(168,85,247,0.3)]',
        badgeBg: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
        buttonBg: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold border border-purple-300/30',
        icon: type === 'peek_3'
          ? <Flame className="w-8 h-8 text-purple-300 animate-pulse" />
          : type === 'peek_2'
          ? <Sparkles className="w-8 h-8 text-purple-300" />
          : <Eye className="w-8 h-8 text-purple-300" />,
      };
    }
    if (type.startsWith('spy')) {
      return {
        gradient: 'from-[#0f242c] via-[#143540] to-[#0f242c]',
        border: 'border-cyan-400/60',
        glow: 'shadow-[0_4px_20px_rgba(6,182,212,0.3)]',
        badgeBg: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
        buttonBg: 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-stone-950 font-black border border-cyan-300/30',
        icon: type === 'spy_3' ? <Flame className="w-8 h-8 text-cyan-300 animate-pulse" /> : <Radio className="w-8 h-8 text-cyan-300" />,
      };
    }
    return {
      gradient: 'from-[#2d141e] via-[#401d2c] to-[#2d141e]',
      border: 'border-rose-400/60',
      glow: 'shadow-[0_4px_20px_rgba(244,63,94,0.3)]',
      badgeBg: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
      buttonBg: 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold border border-rose-300/30',
      icon: <ArrowLeftRight className="w-8 h-8 text-rose-300" />,
    };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="max-w-2xl w-full bg-[#16271e] border-2 border-amber-500/50 rounded-3xl p-5 sm:p-7 shadow-[0_4px_30px_rgba(245,158,11,0.2)] flex flex-col items-center text-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#24170d]/85 border border-[#b45309]/60 text-amber-200 text-xs font-black uppercase tracking-wider mb-2 shadow-sm">
          <Zap className="w-4 h-4 fill-current text-amber-400 animate-bounce" />
          <span>✨ 2. Tur Özel Güç Seçimi</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 mb-1 font-['Comfortaa',sans-serif]">
          Kaderini Belirleyecek Gücü Seç!
        </h2>
        <p className="text-xs text-[#9db6a5] mb-6 max-w-md">
          Bu tur güç slotlarında beliren seçeneklerden birini seç:
        </p>

        {/* 3 Power Cards */}
        <div className={`grid grid-cols-1 gap-3.5 sm:gap-4 w-full mb-2 ${powerGridLayout}`}>
          {powers.map((pow) => {
            const theme = getPowerTheme(pow.type);
            return (
              <div
                key={pow.id}
                className={`relative flex flex-col items-center justify-between p-4 rounded-2xl bg-gradient-to-b ${theme.gradient} border-2 ${theme.border} ${theme.glow} transition-all duration-200 hover:-translate-y-1.5`}
              >
                {/* Level badge */}
                <div className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider mb-3 ${theme.badgeBg}`}>
                  Seviye {pow.level}
                </div>

                {/* Icon */}
                <div className="p-3 rounded-2xl bg-black/40 border border-white/10 mb-3 shadow-inner">
                  {theme.icon}
                </div>

                {/* Title & Description */}
                <div className="flex flex-col items-center mb-4">
                  <h3 className="font-black text-sm text-[#e6f4ea] tracking-wide mb-1.5">
                    {pow.title}
                  </h3>
                  <p className="text-xs text-[#c9ded0] leading-relaxed font-medium">
                    {pow.description}
                  </p>
                </div>

                {/* Selection button */}
                <button
                  type="button"
                  onClick={() => {
                    haptic('power');
                    onSelectPower(pow.id);
                  }}
                  className={`w-full py-2.5 rounded-xl font-black text-xs transition cursor-pointer shadow-md active:scale-95 ${theme.buttonBg}`}
                >
                  Bu Gücü Seç
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
