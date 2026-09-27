import { Card, GameState, Player } from './types.js';
import { CaboGameEngine } from './gameEngine.js';

interface Memory {
  knownOwnCards: Record<number, number>; // slotIndex -> value
  knownOpponentCards: Record<string, Record<number, number>>; // playerId -> { slotIndex: value }
}

export class CaboAIController {
  private static memories: Map<string, Memory> = new Map();

  private static getMemory(aiId: string): Memory {
    if (!this.memories.has(aiId)) {
      this.memories.set(aiId, {
        knownOwnCards: { 0: 0, 1: 0 }, // In Rey, slots 0 and 1 are known from start
        knownOpponentCards: {},
      });
    }
    return this.memories.get(aiId)!;
  }

  public static resetMemory(aiId: string): void {
    this.memories.delete(aiId);
  }

  public static handleInitialPeek(state: GameState, aiPlayer: Player): void {
    const mem = this.getMemory(aiPlayer.id);
    const cards = aiPlayer.cards as Card[];
    if (cards[0]) mem.knownOwnCards[0] = cards[0].value;
    if (cards[1]) mem.knownOwnCards[1] = cards[1].value;
    aiPlayer.initialPeeksDone = true;
  }

  public static takeTurn(
    state: GameState,
    deck: Card[],
    aiPlayer: Player,
    onUpdate: () => void,
    onEvent?: (event: string, payload: any) => void
  ): void {
    if (state.activePlayerId !== aiPlayer.id || state.phase !== 'playing') return;

    const mem = this.getMemory(aiPlayer.id);
    const ownCards = aiPlayer.cards as Card[];

    // Update memory for slots 0 & 1 if needed
    if (ownCards[0] && mem.knownOwnCards[0] === undefined) mem.knownOwnCards[0] = ownCards[0].value;
    if (ownCards[1] && mem.knownOwnCards[1] === undefined) mem.knownOwnCards[1] = ownCards[1].value;

    // 1. Check Kamikaze condition (two 12s and two 13s)
    const count12 = ownCards.filter((c) => c.value === 12).length;
    const count13 = ownCards.filter((c) => c.value === 13).length;
    if (count12 >= 2 && count13 >= 2) {
      setTimeout(() => {
        CaboGameEngine.callKamikaze(state, aiPlayer.id);
        onUpdate();
      }, 600);
      return;
    }

    // 2. Check if in Tur 2 Power Selection Phase
    if (state.turnSubPhase === 'power_selection' && aiPlayer.availablePowers) {
      setTimeout(() => {
        // Choose best power
        let chosen = aiPlayer.availablePowers![0];
        const swapPow = aiPlayer.availablePowers!.find((p) => p.type === 'swap_all');
        const peek3Pow = aiPlayer.availablePowers!.find((p) => p.type === 'peek_3');
        const peek2Pow = aiPlayer.availablePowers!.find((p) => p.type === 'peek_2');
        const spy3Pow = aiPlayer.availablePowers!.find((p) => p.type === 'spy_3');

        if (swapPow) chosen = swapPow;
        else if (peek3Pow) chosen = peek3Pow;
        else if (spy3Pow) chosen = spy3Pow;
        else if (peek2Pow) chosen = peek2Pow;

        const handSlotsBeforePower = new Map(
          state.players.map((player) => [player.id, player.cards.map((_, index) => index)])
        );
        const res = CaboGameEngine.selectPower(state, aiPlayer.id, chosen.id);
        if (res.success && res.power) {
          if (res.power.type === 'swap_all' && onEvent) {
            onEvent('swap_animation', {
              fromPlayerId: state.players[0].id,
              fromSlotIndex: 0,
              fromSlotIndices: handSlotsBeforePower.get(state.players[0].id) || [],
              toPlayerId: state.players[1].id,
              toSlotIndex: 0,
              toSlotIndices: handSlotsBeforePower.get(state.players[1].id) || [],
              durationMs: 2200,
              isSwapAll: true,
            });
          } else if (res.power.type.startsWith('peek')) {
            const revealCount = res.power.type === 'peek_3' ? ownCards.length : res.power.level;
            const slots = ownCards
              .map((_, index) => index)
              .sort((a, b) => Number(mem.knownOwnCards[a] !== undefined) - Number(mem.knownOwnCards[b] !== undefined))
              .slice(0, revealCount);
            slots.forEach((slot) => {
              if (res.power?.type !== 'peek_3') CaboGameEngine.executePeek(state, aiPlayer.id, slot);
              mem.knownOwnCards[slot] = ownCards[slot].value;
            });
          } else if (res.power.type.startsWith('spy')) {
            const rival = state.players.find((player) => player.id !== aiPlayer.id);
            if (rival) {
              if (!mem.knownOpponentCards[rival.id]) mem.knownOpponentCards[rival.id] = {};
              const rivalCards = rival.cards as Card[];
              const revealCount = res.power.type === 'spy_3' ? rivalCards.length : res.power.level;
              rivalCards.slice(0, revealCount).forEach((card, slot) => {
                if (res.power?.type !== 'spy_3') {
                  CaboGameEngine.executeSpy(state, aiPlayer.id, rival.id, slot);
                }
                mem.knownOpponentCards[rival.id][slot] = card.value;
              });
              if (onEvent) {
                onEvent('spied', {
                  targetPlayerId: rival.id,
                  byPlayerName: aiPlayer.name,
                  slotIndex: revealCount === 1 ? 0 : undefined,
                  slots: revealCount > 1 && revealCount < rivalCards.length
                    ? rivalCards.slice(0, revealCount).map((_, index) => index)
                    : undefined,
                  isAll: revealCount === rivalCards.length,
                });
              }
            }
          }
        }
        onUpdate();

        // Continue AI turn after power selection
        setTimeout(() => {
          this.takeTurn(state, deck, aiPlayer, onUpdate, onEvent);
        }, 800);
      }, 600);
      return;
    }

    // 3. Check for matching cards (pair, triple, quad) in hand to discard
    const valToIndices: Record<number, number[]> = {};
    for (let i = 0; i < ownCards.length; i++) {
      const val = mem.knownOwnCards[i];
      if (val !== undefined) {
        if (!valToIndices[val]) valToIndices[val] = [];
        valToIndices[val].push(i);
      }
    }

    let bestIndices: number[] | null = null;
    for (const [valStr, idxs] of Object.entries(valToIndices)) {
      const v = Number(valStr);
      if (idxs.length >= 2 && v >= 4) {
        if (!bestIndices || idxs.length > bestIndices.length) {
          bestIndices = idxs;
        }
      }
    }

    if (bestIndices && bestIndices.length >= 2) {
      const matchIndices = bestIndices;
      setTimeout(() => {
        const res = CaboGameEngine.discardPair(state, deck, aiPlayer.id, matchIndices);
        // Clear memory for all matched indices
        matchIndices.forEach((idx) => delete mem.knownOwnCards[idx]);
        if (res.success && onEvent) {
          onEvent('match_draw_animation', {
            playerId: aiPlayer.id,
            slotIndex: res.keepSlot ?? 0,
            card: res.drawnCard,
            count: matchIndices.length,
            bonus: res.bonus,
            durationMs: 2200,
          });
        }
        onUpdate();
      }, 600);
      return;
    }

    // Calculate known sum
    let knownSum = 0;
    let knownCount = 0;
    for (let i = 0; i < ownCards.length; i++) {
      if (mem.knownOwnCards[i] !== undefined) {
        knownSum += mem.knownOwnCards[i];
        knownCount++;
      }
    }

    // 4. Consider calling REY if hand is low
    if (
      state.caboCallerId === null &&
      ((knownCount === ownCards.length && knownSum <= 6) || (knownCount >= 3 && knownSum <= 4))
    ) {
      setTimeout(() => {
        CaboGameEngine.callRey(state, aiPlayer.id);
        onUpdate();
      }, 700);
      return;
    }

    // 5. Draw and replace decision
    const topDiscard = state.discardPile.length > 0 ? state.discardPile[state.discardPile.length - 1] : null;

    let highestKnownSlot = -1;
    let highestKnownValue = -1;
    for (let i = 0; i < ownCards.length; i++) {
      const val = mem.knownOwnCards[i];
      if (val !== undefined && val > highestKnownValue) {
        highestKnownValue = val;
        highestKnownSlot = i;
      }
    }

    let unknownSlot = -1;
    for (let i = 0; i < ownCards.length; i++) {
      if (mem.knownOwnCards[i] === undefined) {
        unknownSlot = i;
        break;
      }
    }

    if (topDiscard && topDiscard.value <= 3 && (highestKnownValue > topDiscard.value || unknownSlot !== -1)) {
      // Pick discard
      setTimeout(() => {
        CaboGameEngine.drawFromDiscard(state, aiPlayer.id);
        onUpdate();

        setTimeout(() => {
          const targetSlot =
            highestKnownValue > topDiscard.value ? highestKnownSlot : unknownSlot !== -1 ? unknownSlot : 0;
          CaboGameEngine.replaceCard(state, aiPlayer.id, targetSlot);
          mem.knownOwnCards[targetSlot] = topDiscard.value;
          onUpdate();
        }, 700);
      }, 500);
      return;
    }

    // Otherwise draw from deck
    setTimeout(() => {
      const drawRes = CaboGameEngine.drawFromDeck(state, deck, aiPlayer.id);
      onUpdate();

      if (!drawRes.success || !drawRes.drawnCard) return;

      const card = drawRes.drawnCard;

      setTimeout(() => {
        // If card is low (0-4), keep it and replace high or unknown card
        if (card.value <= 4 || (highestKnownValue > card.value && highestKnownValue >= 7)) {
          const targetSlot =
            highestKnownValue > card.value ? highestKnownSlot : unknownSlot !== -1 ? unknownSlot : 0;
          CaboGameEngine.replaceCard(state, aiPlayer.id, targetSlot);
          mem.knownOwnCards[targetSlot] = card.value;
          onUpdate();
        } else {
          // Discard drawn card
          CaboGameEngine.discardDrawnCard(state, aiPlayer.id);
          onUpdate();
        }
      }, 700);
    }, 500);
  }
}
