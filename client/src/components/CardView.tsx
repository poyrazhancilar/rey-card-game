import React from 'react';
import type { CardAbility } from '../types/game';
import { CardArtwork, CardBackArt } from './CardArt';
import { getCardFaceImage } from '../utils/cardImages';
import { Eye, Radio, ArrowLeftRight, Check } from 'lucide-react';

interface CardViewProps {
  value?: number;
  ability?: CardAbility;
  name?: string;
  flavor?: string;
  isFaceUp: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isSelectable?: boolean;
  isSelected?: boolean;
  selectionBadge?: string;
  badge?: string;
  onClick?: () => void;
  className?: string;
  glowColor?: 'gold' | 'cyan' | 'purple' | 'red' | 'none';
}

export const CardView: React.FC<CardViewProps> = ({
  value = 0,
  ability = 'none',
  name = '',
  flavor = '',
  isFaceUp,
  size = 'md',
  isSelectable = false,
  isSelected = false,
  selectionBadge,
  badge,
  onClick,
  className = '',
  glowColor = 'none',
}) => {
  // Dimensions
  const sizeClasses = {
    xs: 'w-11 sm:w-14 h-16 sm:h-20 text-[10px]',
    sm: 'w-[62px] min-[390px]:w-[68px] sm:w-20 h-[88px] min-[390px]:h-[96px] sm:h-28 text-xs',
    md: 'w-[74px] min-[390px]:w-[80px] sm:w-24 md:w-28 h-[104px] min-[390px]:h-[114px] sm:h-34 md:h-40 text-xs sm:text-sm',
    lg: 'w-32 sm:w-36 h-44 sm:h-52 text-base',
  }[size];

  // Studio Ghibli soft watercolor paper theme palette
  const getTheme = () => {
    if (value === 0) {
      return {
        bg: 'from-[#fcf9ff] via-[#f6edfe] to-[#ebe0f8]',
        border: 'border-purple-300',
        text: 'text-purple-950',
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-300/80',
      };
    }
    if (value >= 1 && value <= 2) {
      return {
        bg: 'from-[#f6fcf8] via-[#eff9f3] to-[#def3e4]',
        border: 'border-emerald-300',
        text: 'text-emerald-950',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300/80',
      };
    }
    if (value >= 3 && value <= 4) {
      return {
        bg: 'from-[#f7fbf9] via-[#edf7f5] to-[#d8efe8]',
        border: 'border-teal-300',
        text: 'text-teal-950',
        badgeBg: 'bg-teal-100 text-teal-800 border-teal-300/80',
      };
    }
    if (value >= 5 && value <= 6) {
      return {
        bg: 'from-[#fffdf7] via-[#fef7e7] to-[#faeed0]',
        border: 'border-amber-300',
        text: 'text-amber-950',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-300/80',
      };
    }
    if (ability === 'peek') {
      return {
        bg: 'from-[#faf7ff] via-[#f2ebff] to-[#e4d6ff]',
        border: 'border-indigo-300',
        text: 'text-indigo-950',
        badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-300/80',
      };
    }
    if (ability === 'spy') {
      return {
        bg: 'from-[#f5fbff] via-[#e8f5fe] to-[#d5edfd]',
        border: 'border-sky-300',
        text: 'text-sky-950',
        badgeBg: 'bg-sky-100 text-sky-800 border-sky-300/80',
      };
    }
    if (ability === 'swap') {
      return {
        bg: 'from-[#fff8f6] via-[#fdede8] to-[#fbdad2]',
        border: 'border-rose-300',
        text: 'text-rose-950',
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-300/80',
      };
    }
    if (value === 13) {
      return {
        bg: 'from-[#fef8f7] via-[#f9ebe8] to-[#ebd3ce]',
        border: 'border-rose-400',
        text: 'text-rose-950',
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-300/80',
      };
    }
    return {
      bg: 'from-[#fcfaf7] via-[#f7f2ea] to-[#eee5d8]',
      border: 'border-[#c7b299]',
      text: 'text-stone-900',
      badgeBg: 'bg-stone-100 text-stone-800 border-stone-300/80',
    };
  };

  const theme = getTheme();
  const faceImage = getCardFaceImage(value);

  // Gentle Ghibli glow classes
  const getGlow = () => {
    if (isSelected) {
      return 'ring-4 ring-amber-400 ring-offset-2 ring-offset-[#0f1b14] shadow-[0_0_35px_rgba(251,191,36,0.95),0_15px_30px_rgba(0,0,0,0.6)]';
    }
    if (isSelectable) {
      if (glowColor === 'cyan') return 'hover:ring-2 hover:ring-sky-400 hover:scale-105 shadow-[0_4px_14px_rgba(56,189,248,0.4)] cursor-pointer';
      if (glowColor === 'purple') return 'hover:ring-2 hover:ring-purple-400 hover:scale-105 shadow-[0_4px_14px_rgba(192,132,252,0.4)] cursor-pointer';
      if (glowColor === 'red') return 'hover:ring-2 hover:ring-rose-400 hover:scale-105 shadow-[0_4px_14px_rgba(244,63,94,0.4)] cursor-pointer';
      return 'hover:ring-2 hover:ring-amber-400 hover:scale-105 shadow-[0_4px_14px_rgba(251,191,36,0.4)] cursor-pointer';
    }
    return '';
  };

  return (
    <div
      data-interactive="true"
      onClick={isSelectable ? onClick : undefined}
      title={flavor || name}
      className={`relative ${sizeClasses} isometric-card-shadow transition-all duration-200 ${getGlow()} ${
        isSelected
          ? 'scale-110 -translate-y-4 sm:-translate-y-5 z-30'
          : isSelectable
          ? 'hover:-translate-y-1.5 hover:scale-105 active:scale-95'
          : ''
      } ${className}`}
    >
      {/* Floating Selection Badge */}
      {isSelected && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 text-stone-950 font-black text-[9px] sm:text-[10px] shadow-[0_4px_14px_rgba(245,158,11,0.7)] flex items-center gap-1 animate-bounce border border-amber-100">
          <Check className="w-3 h-3 stroke-[3]" />
          <span>{selectionBadge || 'SEÇİLDİ'}</span>
        </div>
      )}

      {/* Optional Badge label (when not selected) */}
      {!isSelected && badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-[#1b3425]/90 border border-emerald-400/40 text-[9px] font-bold text-amber-200 shadow">
          {badge}
        </div>
      )}

      {/* Card 3D Flip container */}
      <div
        className={`w-full h-full relative transform-style-3d transition-transform duration-500 ${
          isFaceUp ? '' : 'rotate-y-180'
        }`}
      >
        {/* CARD FRONT */}
        {faceImage ? (
          <div className="absolute inset-0 backface-hidden overflow-hidden rounded-xl border border-[#b8aa89] bg-[#faf7eb] shadow-md select-none">
            <img
              src={faceImage}
              alt={`${value} numaralı ${name || 'REY'} kartı`}
              draggable={false}
              decoding="async"
              className="block h-full w-full object-fill contrast-[1.03] saturate-[1.04]"
            />
          </div>
        ) : (
          <div
            className={`absolute inset-0 backface-hidden rounded-xl bg-gradient-to-b ${theme.bg} border-2 ${theme.border} p-1 sm:p-1.5 flex flex-col justify-between shadow-md select-none`}
          >
            {/* Top Rank & Ability Badge */}
            <div className="flex items-center justify-between w-full">
              <span className={`font-black text-sm sm:text-base md:text-xl tracking-tight leading-none ${theme.text}`}>
                {value}
              </span>
              {ability !== 'none' && (
                <span
                  className={`flex items-center gap-0.5 text-[7px] sm:text-[9px] font-extrabold px-1 sm:px-1.5 py-0.5 rounded-full border ${theme.badgeBg}`}
                >
                  {ability === 'peek' && <Eye className="w-2 sm:w-2.5 h-2 sm:h-2.5" />}
                  {ability === 'spy' && <Radio className="w-2 sm:w-2.5 h-2 sm:h-2.5" />}
                  {ability === 'swap' && <ArrowLeftRight className="w-2 sm:w-2.5 h-2 sm:h-2.5" />}
                  <span className="uppercase text-[7px] sm:text-[8px]">{ability}</span>
                </span>
              )}
            </div>

            {/* Center Art */}
            <div className="flex-1 flex flex-col items-center justify-center py-0.5 min-h-0 overflow-hidden">
              <CardArtwork value={value} size={size} />
              <div className="text-[8px] sm:text-[10px] font-extrabold text-stone-700 mt-0.5 truncate max-w-full text-center px-0.5 leading-tight">
                {name}
              </div>
            </div>

            {/* Bottom Rank */}
            <div className="flex items-center justify-end w-full">
              <span className={`font-black text-sm sm:text-base md:text-xl rotate-180 tracking-tight leading-none ${theme.text}`}>
                {value}
              </span>
            </div>
          </div>
        )}

        {/* CARD BACK */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <CardBackArt size={size} />
        </div>
      </div>
    </div>
  );
};
