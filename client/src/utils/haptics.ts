export type HapticKind = 'tap' | 'selection' | 'impact' | 'power' | 'success' | 'warning' | 'royal';

const patterns: Record<HapticKind, number | number[]> = {
  tap: 10,
  selection: 7,
  impact: 16,
  power: [12, 22, 30],
  success: [14, 28, 20],
  warning: [28, 34, 28],
  royal: [16, 24, 16, 24, 38],
};

let lastPulseAt = 0;

const canVibrate = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (typeof navigator.vibrate !== 'function' || document.visibilityState !== 'visible') return false;
  return navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
};

export const haptic = (kind: HapticKind = 'tap') => {
  if (!canVibrate()) return;

  const now = Date.now();
  if (now - lastPulseAt < 35) return;
  lastPulseAt = now;

  try {
    navigator.vibrate(patterns[kind]);
  } catch {
    // Some embedded browsers expose the API but block it at runtime.
  }
};
