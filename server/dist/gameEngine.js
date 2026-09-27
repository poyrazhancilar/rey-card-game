import { createDeck, generateSpecialPowerSlots } from './cards.js';
export class CaboGameEngine {
    static pauseError(state) {
        return state.players.some((player) => !player.isAI && !player.connected)
            ? 'Oyun, bağlantısı kesilen oyuncu yeniden bağlanana kadar duraklatıldı'
            : null;
    }
    static initGame(players, handNumber = 1, deck = createDeck()) {
        // Deal 4 cards to each player (2 players in Rey)
        const initializedPlayers = players.slice(0, 2).map((p) => {
            const hand = [];
            for (let i = 0; i < 4; i++) {
                const c = deck.pop();
                c.isRevealed = false; // All cards face-down initially
                hand.push(c);
            }
            return {
                ...p,
                cards: hand,
                cardCount: hand.length,
                initialPeeksDone: false,
                roundScore: 0,
                hasTakenFinalTurn: false,
                hasChosenPowerInTur2: false,
                availablePowers: undefined,
                chosenPower: null,
                missedKamikazeOpportunity: false,
            };
        });
        // 1 card starts the discard pile
        const firstDiscard = deck.pop();
        firstDiscard.isRevealed = true;
        const discardPile = [firstDiscard];
        const turnsTaken = {};
        initializedPlayers.forEach((p) => {
            turnsTaken[p.id] = 0;
        });
        const logs = [
            {
                id: `log_${Date.now()}_start`,
                timestamp: Date.now(),
                text: `Parti 1 / El ${handNumber} başladı! Destede 32 kart bulunuyor. Ezberlemek istediğiniz 2 kartı seçin!`,
                type: 'info',
            },
        ];
        return {
            roomCode: '',
            phase: 'initial_peek', // Players choose 2 cards to peek & memorize!
            players: initializedPlayers,
            currentTurnIndex: 0,
            activePlayerId: initializedPlayers[0].id,
            caboCallerId: null,
            drawPileCount: deck.length,
            discardPile,
            currentDrawnCard: null,
            turnSubPhase: 'idle',
            roundNumber: handNumber,
            handNumber,
            maxHands: 3,
            turNumber: 1,
            turnsTakenInHand: turnsTaken,
            actionLogs: logs,
            powerSelections: {},
            lastPairPlayerId: null,
            consecutivePairCount: 0,
        };
    }
    // Draw from deck helper
    static drawFromDeck(state, deck, playerId) {
        const pauseError = this.pauseError(state);
        if (pauseError)
            return { success: false, error: pauseError };
        if (state.phase !== 'playing')
            return { success: false, error: 'Oyun devam etmiyor' };
        if (state.activePlayerId !== playerId)
            return { success: false, error: 'Sıra sizde değil' };
        if (state.turnSubPhase !== 'idle')
            return { success: false, error: 'Zaten bir hamle yapıldı' };
        this.markMissedKamikazeIfAvailable(state, playerId);
        if (deck.length === 0) {
            this.reshuffleDiscardIntoDeck(state, deck);
            if (deck.length === 0) {
                return { success: false, error: 'Çekilecek kart kalmadı' };
            }
        }
        const card = deck.pop();
        card.isRevealed = true;
        state.currentDrawnCard = card;
        state.drawPileCount = deck.length;
        state.turnSubPhase = 'drawn_deck';
        state.actionLogs.unshift({
            id: `log_${Date.now()}_draw`,
            timestamp: Date.now(),
            text: `${this.getPlayerName(state, playerId)} desteden bir kart çekti.`,
            type: 'info',
        });
        return { success: true, drawnCard: card };
    }
    // Draw from discard pile
    static drawFromDiscard(state, playerId) {
        const pauseError = this.pauseError(state);
        if (pauseError)
            return { success: false, error: pauseError };
        if (state.phase !== 'playing')
            return { success: false, error: 'Oyun devam etmiyor' };
        if (state.activePlayerId !== playerId)
            return { success: false, error: 'Sıra sizde değil' };
        if (state.turnSubPhase !== 'idle')
            return { success: false, error: 'Zaten bir hamle yapıldı' };
        this.markMissedKamikazeIfAvailable(state, playerId);
        if (state.discardPile.length === 0)
            return { success: false, error: 'Ortada kart yok' };
        const card = state.discardPile.pop();
        state.currentDrawnCard = card;
        state.turnSubPhase = 'drawn_discard';
        state.actionLogs.unshift({
            id: `log_${Date.now()}_draw_disc`,
            timestamp: Date.now(),
            text: `${this.getPlayerName(state, playerId)} ortadan ${card.name} (${card.value}) kartını aldı.`,
            type: 'info',
        });
        return { success: true, card };
    }
    // Replace one card in hand with drawn card
    static replaceCard(state, playerId, slotIndex) {
        const pauseError = this.pauseError(state);
        if (pauseError)
            return { success: false, error: pauseError };
        if (state.phase !== 'playing')
            return { success: false, error: 'Oyun devam etmiyor' };
        if (state.activePlayerId !== playerId)
            return { success: false, error: 'Sıra sizde değil' };
        if (!state.currentDrawnCard)
            return { success: false, error: 'Çekilmiş kart yok' };
        const player = state.players.find((p) => p.id === playerId);
        if (!player)
            return { success: false, error: 'Oyuncu bulunamadı' };
        this.markMissedKamikazeIfAvailable(state, playerId);
        if (slotIndex < 0 || slotIndex >= player.cards.length) {
            return { success: false, error: 'Geçersiz kart yuvası' };
        }
        const oldCard = player.cards[slotIndex];
        const wasRevealed = oldCard.isRevealed ?? false;
        oldCard.isRevealed = true;
        const newCard = state.currentDrawnCard;
        // CRITICAL BUG FIX: If replacing a card in a slot that was not open/revealed, the new card stays closed/face-down!
        newCard.isRevealed = wasRevealed;
        player.cards[slotIndex] = newCard;
        state.discardPile.push(oldCard);
        state.currentDrawnCard = null;
        state.actionLogs.unshift({
            id: `log_${Date.now()}_rep`,
            timestamp: Date.now(),
            text: `${player.name} Slot ${slotIndex + 1} kartını ortaya attı (${oldCard.name}) ve yeni kartını yerleştirdi.`,
            type: 'info',
        });
        this.advanceTurn(state);
        return { success: true, replacedCard: oldCard };
    }
    // Discard the drawn card directly
    static discardDrawnCard(state, playerId, usePower = false) {
        const pauseError = this.pauseError(state);
        if (pauseError)
            return { success: false, error: pauseError };
        if (state.phase !== 'playing')
            return { success: false, error: 'Oyun devam etmiyor' };
        if (state.activePlayerId !== playerId)
            return { success: false, error: 'Sıra sizde değil' };
        if (!state.currentDrawnCard)
            return { success: false, error: 'Çekilmiş kart yok' };
        if (state.turnSubPhase !== 'drawn_deck' && state.turnSubPhase !== 'drawn_discard') {
            return { success: false, error: 'Çekilen kart şu anda ortaya atılamaz' };
        }
        const drawn = state.currentDrawnCard;
        let nextPhase = 'idle';
        if (usePower) {
            if (state.turnSubPhase !== 'drawn_deck') {
                return { success: false, error: 'Özel güç yalnızca desteden çekilen kartla kullanılabilir' };
            }
            if (drawn.ability === 'peek')
                nextPhase = 'peeking';
            else if (drawn.ability === 'spy')
                nextPhase = 'spying';
            else if (drawn.ability === 'swap')
                nextPhase = 'swapping';
            else
                return { success: false, error: 'Bu kartın kullanılabilir bir özel gücü yok' };
        }
        drawn.isRevealed = true;
        state.discardPile.push(drawn);
        state.currentDrawnCard = null;
        state.actionLogs.unshift({
            id: `log_${Date.now()}_disc_drawn`,
            timestamp: Date.now(),
            text: usePower
                ? `✨ ${this.getPlayerName(state, playerId)} ${drawn.name} (${drawn.value}) kartını ortaya atarak özel gücünü etkinleştirdi.`
                : `${this.getPlayerName(state, playerId)} çekilen ${drawn.name} (${drawn.value}) kartını ortaya attı.`,
            type: usePower ? 'power' : 'info',
        });
        if (usePower) {
            state.turnSubPhase = nextPhase;
        }
        else {
            this.advanceTurn(state);
        }
        return { success: true, nextPhase };
    }
    // Discard matching cards: Çiftleme (2), Üçleme (3), Dörtleme (4)
    // Matching cards are discarded, 1 replacement card is drawn from deck,
    // reducing total hand size by (count - 1).
    // A successful pair grants +20. A directly consecutive pair grants another +20.
    static discardPair(state, deck, playerId, indices) {
        const pauseError = this.pauseError(state);
        if (pauseError)
            return { success: false, error: pauseError };
        if (state.phase !== 'playing')
            return { success: false, error: 'Oyun devam etmiyor' };
        const player = state.players.find((p) => p.id === playerId);
        if (!player)
            return { success: false, error: 'Oyuncu bulunamadı' };
        this.markMissedKamikazeIfAvailable(state, playerId);
        if (!indices || !Array.isArray(indices)) {
            return { success: false, error: 'Geçersiz kart seçimi' };
        }
        const uniqueIndices = Array.from(new Set(indices));
        if (uniqueIndices.length !== indices.length) {
            return { success: false, error: 'Aynı kartı birden fazla kez seçemezsiniz' };
        }
        const cards = player.cards;
        if (indices.length < 2 || indices.length > 4 || indices.length > cards.length) {
            return { success: false, error: 'Eşleştirmek için 2, 3 veya 4 kart seçmelisiniz' };
        }
        for (const idx of indices) {
            if (idx < 0 || idx >= cards.length || !cards[idx]) {
                return { success: false, error: 'Geçersiz kart slotu' };
            }
        }
        const selectedCards = indices.map((idx) => cards[idx]);
        const actualValues = selectedCards.map((c) => c.value);
        const targetValue = actualValues[0];
        const isMatch = actualValues.every((v) => v === targetValue);
        // Mismatch: penalty applied to player score!
        if (!isMatch) {
            state.lastPairPlayerId = null;
            state.consecutivePairCount = 0;
            state.actionLogs.unshift({
                id: `log_${Date.now()}_mismatch`,
                timestamp: Date.now(),
                text: `❌ HATALI EŞLEŞTİRME! ${player.name} tarafından seçilen kartlar uyuşmadı.`,
                type: 'match',
            });
            return {
                success: false,
                isMatch: false,
                penalty: 0,
                error: 'Hatalı eşleştirme! Seçilen kartlar eşleşmedi.',
            };
        }
        // Match Success:
        // 1. Calculate bonus
        const isPair = indices.length === 2;
        const isConsecutivePair = isPair && state.lastPairPlayerId === playerId;
        const multiplier = state.handNumber === 3 ? 3 : 1;
        const bonus = isPair ? (20 + (isConsecutivePair ? 20 : 0)) * multiplier : 0;
        player.score += bonus;
        player.roundScore += bonus;
        state.lastPairPlayerId = isPair ? playerId : null;
        state.consecutivePairCount = isPair
            ? (isConsecutivePair ? (state.consecutivePairCount || 1) + 1 : 1)
            : 0;
        // 2. Put matching cards onto discard pile
        selectedCards.forEach((c) => {
            c.isRevealed = true;
            state.discardPile.push(c);
        });
        // 3. Draw 1 replacement card from deck
        if (deck.length === 0) {
            this.reshuffleDiscardIntoDeck(state, deck);
        }
        let drawnCard = null;
        if (deck.length > 0) {
            drawnCard = deck.pop();
            drawnCard.isRevealed = false;
            state.drawPileCount = deck.length;
        }
        // 4. Update hand: first chosen index gets the drawnCard, other chosen indices are removed
        const sortedAsc = [...indices].sort((a, b) => a - b);
        const keepSlot = sortedAsc[0];
        if (drawnCard) {
            cards[keepSlot] = drawnCard;
        }
        const removeSlots = sortedAsc.slice(1).sort((a, b) => b - a);
        removeSlots.forEach((slotIdx) => {
            cards.splice(slotIdx, 1);
        });
        player.cardCount = cards.length;
        const matchTypeName = indices.length === 2 ? 'ÇİFTLEME' : indices.length === 3 ? 'ÜÇLEME' : 'DÖRTLEME';
        state.actionLogs.unshift({
            id: `log_${Date.now()}_match`,
            timestamp: Date.now(),
            text: `✨ ${matchTypeName}! ${player.name} ${indices.length} adet ${targetValue} kartını eşleştirdi, desteden 1 yeni kart çekti!${bonus > 0 ? ` (+${bonus} Puan${isConsecutivePair ? ', üst üste çift bonusu' : ''})` : ''} Kalan Kart: ${player.cardCount}`,
            type: 'match',
        });
        return {
            success: true,
            isMatch: true,
            matchedValue: targetValue,
            count: indices.length,
            bonus,
            newHandCount: player.cardCount,
            drawnCard,
            keepSlot,
        };
    }
    // Call Rey button
    static callRey(state, playerId) {
        const pauseError = this.pauseError(state);
        if (pauseError)
            return { success: false, error: pauseError };
        if (state.phase !== 'playing')
            return { success: false, error: 'Oyun devam etmiyor' };
        if (state.caboCallerId !== null)
            return { success: false, error: 'Zaten Rey denildi' };
        if (state.activePlayerId !== playerId)
            return { success: false, error: 'Sadece sıranızda Rey diyebilirsiniz' };
        const player = state.players.find((p) => p.id === playerId);
        if (!player)
            return { success: false, error: 'Oyuncu bulunamadı' };
        this.markMissedKamikazeIfAvailable(state, playerId);
        state.caboCallerId = playerId;
        player.hasTakenFinalTurn = true;
        state.actionLogs.unshift({
            id: `log_${Date.now()}_rey`,
            timestamp: Date.now(),
            text: `👑 REY! ${player.name} "Rey" tuşuna bastı! Sıra rakibe geçti, rakibin sırasının ardından el tamamlanacak!`,
            type: 'cabo',
        });
        this.advanceTurn(state);
        return { success: true };
    }
    // Call Kamikaze button (two 12s and two 13s)
    static callKamikaze(state, playerId) {
        const pauseError = this.pauseError(state);
        if (pauseError)
            return { success: false, error: pauseError };
        if (state.phase !== 'playing')
            return { success: false, error: 'Oyun devam etmiyor' };
        const player = state.players.find((p) => p.id === playerId);
        if (!player)
            return { success: false, error: 'Oyuncu bulunamadı' };
        const cards = player.cards;
        const count12 = cards.filter((c) => c.value === 12).length;
        const count13 = cards.filter((c) => c.value === 13).length;
        if (cards.length !== 4 || count12 !== 2 || count13 !== 2) {
            return {
                success: false,
                error: 'Kamikaze için elinizde tam olarak iki adet 12 ve iki adet 13 (12, 12, 13, 13) bulunmalıdır!',
            };
        }
        this.endHand(state, 'kamikaze', playerId);
        return { success: true };
    }
    // Select a power in Tur 2
    static selectPower(state, playerId, powerId) {
        const pauseError = this.pauseError(state);
        if (pauseError)
            return { success: false, error: pauseError };
        const player = state.players.find((p) => p.id === playerId);
        if (!player)
            return { success: false, error: 'Oyuncu bulunamadı' };
        if (state.activePlayerId !== playerId || state.turnSubPhase !== 'power_selection') {
            return { success: false, error: 'Şu anda özel güç seçemezsiniz' };
        }
        this.markMissedKamikazeIfAvailable(state, playerId);
        if (!player.availablePowers)
            return { success: false, error: 'Seçilecek güç bulunmuyor' };
        const power = player.availablePowers.find((p) => p.id === powerId);
        if (!power)
            return { success: false, error: 'Geçersiz güç seçimi' };
        player.chosenPower = power;
        player.hasChosenPowerInTur2 = true;
        player.availablePowers = undefined;
        if (!state.powerSelections)
            state.powerSelections = {};
        delete state.powerSelections[playerId];
        state.actionLogs.unshift({
            id: `log_${Date.now()}_pow_sel`,
            timestamp: Date.now(),
            text: `⚡ ${player.name} 2. Turda "${power.title}" özel gücünü seçti!`,
            type: 'power',
        });
        // Set subPhase based on power type
        if (power.type === 'peek_1')
            state.turnSubPhase = 'peeking_1';
        else if (power.type === 'peek_2')
            state.turnSubPhase = 'peeking_2';
        else if (power.type === 'peek_3')
            state.turnSubPhase = 'idle';
        else if (power.type === 'spy_1')
            state.turnSubPhase = 'spying_1';
        else if (power.type === 'spy_2')
            state.turnSubPhase = 'spying_2';
        else if (power.type === 'spy_3') {
            // Reveal all rival cards directly
            state.turnSubPhase = 'idle';
        }
        else if (power.type === 'swap_all') {
            // Swaps hands between both players
            this.executeSwapAllHands(state, playerId);
            state.turnSubPhase = 'idle';
        }
        return { success: true, power };
    }
    // Execute Peek (Röntgen)
    static executePeek(state, playerId, slotIndex) {
        const pauseError = this.pauseError(state);
        if (pauseError)
            return { success: false, error: pauseError };
        const player = state.players.find((p) => p.id === playerId);
        if (!player)
            return { success: false, error: 'Oyuncu bulunamadı' };
        if (state.activePlayerId !== playerId)
            return { success: false, error: 'Sıra sizde değil' };
        if (slotIndex < 0 || slotIndex >= player.cards.length) {
            return { success: false, error: 'Geçersiz kart yuvası' };
        }
        const prevSubPhase = state.turnSubPhase;
        const required = prevSubPhase === 'peeking_2' ? 2 : prevSubPhase === 'peeking_1' ? 1 : 0;
        if (required > 0) {
            if (!state.powerSelections)
                state.powerSelections = {};
            const selection = state.powerSelections[playerId] || { kind: 'peek', slots: [] };
            if (selection.slots.includes(slotIndex)) {
                return { success: false, error: 'Aynı kartı iki kez seçemezsiniz' };
            }
            selection.slots.push(slotIndex);
            state.powerSelections[playerId] = selection;
            if (selection.slots.length < required) {
                return { success: true, slots: [...selection.slots], pending: true };
            }
            const slots = [...selection.slots];
            const cards = slots.map((slot) => player.cards[slot]);
            delete state.powerSelections[playerId];
            state.turnSubPhase = 'idle';
            state.actionLogs.unshift({
                id: `log_${Date.now()}_peek`,
                timestamp: Date.now(),
                text: `👁️ ${player.name} Röntgen gücü ile ${required} kartını inceledi.`,
                type: 'power',
            });
            return required === 1
                ? { success: true, card: cards[0], cards, slots }
                : { success: true, cards, slots };
        }
        if (prevSubPhase !== 'peeking')
            return { success: false, error: 'Röntgen gücü aktif değil' };
        const card = player.cards[slotIndex];
        state.turnSubPhase = 'idle';
        state.actionLogs.unshift({
            id: `log_${Date.now()}_peek`,
            timestamp: Date.now(),
            text: `👁️ ${player.name} Röntgen gücü ile Slot ${slotIndex + 1} kartını inceledi.`,
            type: 'power',
        });
        if (prevSubPhase === 'peeking') {
            this.advanceTurn(state);
        }
        return { success: true, card };
    }
    // Execute Spy (Casusluk)
    static executeSpy(state, playerId, targetPlayerId, slotIndex) {
        const pauseError = this.pauseError(state);
        if (pauseError)
            return { success: false, error: pauseError };
        const player = state.players.find((p) => p.id === playerId);
        const target = state.players.find((p) => p.id === targetPlayerId);
        if (!player || !target)
            return { success: false, error: 'Oyuncu bulunamadı' };
        if (state.activePlayerId !== playerId)
            return { success: false, error: 'Sıra sizde değil' };
        if (playerId === targetPlayerId)
            return { success: false, error: 'Kendi kartınızı gözetleyemezsiniz' };
        if (slotIndex < 0 || slotIndex >= target.cards.length) {
            return { success: false, error: 'Geçersiz hedef kart' };
        }
        const prevSubPhase = state.turnSubPhase;
        const required = prevSubPhase === 'spying_2' ? 2 : prevSubPhase === 'spying_1' ? 1 : 0;
        if (required > 0) {
            if (!state.powerSelections)
                state.powerSelections = {};
            const selection = state.powerSelections[playerId] || {
                kind: 'spy',
                targetPlayerId,
                slots: [],
            };
            if (selection.targetPlayerId !== targetPlayerId) {
                return { success: false, error: 'Aynı rakibin kartlarını seçmelisiniz' };
            }
            if (selection.slots.includes(slotIndex)) {
                return { success: false, error: 'Aynı kartı iki kez seçemezsiniz' };
            }
            selection.slots.push(slotIndex);
            state.powerSelections[playerId] = selection;
            if (selection.slots.length < required) {
                return { success: true, slots: [...selection.slots], pending: true };
            }
            const slots = [...selection.slots];
            const cards = slots.map((slot) => target.cards[slot]);
            delete state.powerSelections[playerId];
            state.turnSubPhase = 'idle';
            state.actionLogs.unshift({
                id: `log_${Date.now()}_spy`,
                timestamp: Date.now(),
                text: `📡 ${player.name} Casusluk gücü ile ${target.name} oyuncusunun ${required} kartını gözetledi!`,
                type: 'power',
            });
            return required === 1
                ? { success: true, card: cards[0], cards, slots }
                : { success: true, cards, slots };
        }
        if (prevSubPhase !== 'spying')
            return { success: false, error: 'Casusluk gücü aktif değil' };
        const card = target.cards[slotIndex];
        state.turnSubPhase = 'idle';
        state.actionLogs.unshift({
            id: `log_${Date.now()}_spy`,
            timestamp: Date.now(),
            text: `📡 ${player.name} Casusluk gücü ile ${target.name}'nin bir kartını gözetledi!`,
            type: 'power',
        });
        if (prevSubPhase === 'spying') {
            this.advanceTurn(state);
        }
        return { success: true, card };
    }
    // Execute Swap of single cards
    static executeSwap(state, playerId, ownSlotIndex, targetPlayerId, targetSlotIndex) {
        const pauseError = this.pauseError(state);
        if (pauseError)
            return { success: false, error: pauseError };
        const p1 = state.players.find((p) => p.id === playerId);
        const p2 = state.players.find((p) => p.id === targetPlayerId);
        if (!p1 || !p2)
            return { success: false, error: 'Oyuncu bulunamadı' };
        const c1 = p1.cards[ownSlotIndex];
        const c2 = p2.cards[targetSlotIndex];
        if (!c1 || !c2)
            return { success: false, error: 'Kartlar bulunamadı' };
        p1.cards[ownSlotIndex] = c2;
        p2.cards[targetSlotIndex] = c1;
        const prevSubPhase = state.turnSubPhase;
        state.turnSubPhase = 'idle';
        state.actionLogs.unshift({
            id: `log_${Date.now()}_swap`,
            timestamp: Date.now(),
            text: `🔄 ${p1.name} ile ${p2.name} arasında kart takası yapıldı!`,
            type: 'swap',
        });
        if (prevSubPhase === 'swapping') {
            this.advanceTurn(state);
        }
        return { success: true };
    }
    // Execute Swap of entire hands (El Değiştirme)
    static executeSwapAllHands(state, playerId) {
        if (this.pauseError(state))
            return;
        if (state.players.length < 2)
            return;
        const p1 = state.players[0];
        const p2 = state.players[1];
        const tempCards = p1.cards;
        p1.cards = p2.cards;
        p2.cards = tempCards;
        p1.cardCount = p1.cards.length;
        p2.cardCount = p2.cards.length;
        state.actionLogs.unshift({
            id: `log_${Date.now()}_swap_all`,
            timestamp: Date.now(),
            text: `🌪️ EL DEĞİŞTİRME! ${this.getPlayerName(state, playerId)} rakibi ile tüm ellerini takas etti!`,
            type: 'swap',
        });
    }
    // Advance turn and track 3 Turlar
    static advanceTurn(state) {
        if (state.phase !== 'playing')
            return;
        // Record turn completed
        const currentId = state.activePlayerId;
        state.lastPairPlayerId = null;
        state.consecutivePairCount = 0;
        state.turnsTakenInHand[currentId] = (state.turnsTakenInHand[currentId] || 0) + 1;
        // If Rey was called: rival gets 1 final turn, then hand ends!
        if (state.caboCallerId !== null) {
            const rival = state.players.find((p) => p.id !== state.caboCallerId);
            if (rival && state.activePlayerId === rival.id) {
                // Rival finished their final turn!
                this.endHand(state, 'rey');
                return;
            }
        }
        // Check if both players completed all 3 Turlar (3 turns each)
        const allTurns = state.players.map((p) => state.turnsTakenInHand[p.id] || 0);
        const minTurns = Math.min(...allTurns);
        const maxTurns = Math.max(...allTurns);
        if (minTurns >= 3) {
            // 3 Turlar completed normally!
            this.endHand(state, 'tur_end');
            return;
        }
        // Advance to next player
        const nextIndex = (state.currentTurnIndex + 1) % state.players.length;
        state.currentTurnIndex = nextIndex;
        const nextPlayer = state.players[nextIndex];
        state.activePlayerId = nextPlayer.id;
        state.turnSubPhase = 'idle';
        // Update turNumber (1, 2, or 3)
        const newMinTurns = Math.min(...state.players.map((p) => state.turnsTakenInHand[p.id] || 0));
        state.turNumber = Math.min(3, newMinTurns + 1);
        // If entering Tur 2 and player hasn't chosen power yet: trigger special power selection screen!
        if (state.turNumber === 2 && !nextPlayer.hasChosenPowerInTur2) {
            const powers = generateSpecialPowerSlots();
            nextPlayer.availablePowers = powers.length > 0 ? powers : undefined;
            nextPlayer.hasChosenPowerInTur2 = powers.length === 0;
            state.turnSubPhase = powers.length > 0 ? 'power_selection' : 'idle';
            state.actionLogs.unshift({
                id: `log_${Date.now()}_tur2_pow`,
                timestamp: Date.now(),
                text: powers.length > 0
                    ? `🔮 2. TUR! ${nextPlayer.name} için ${powers.length} özel güç slotu belirdi.`
                    : `🔮 2. TUR! ${nextPlayer.name} için özel güç slotları boş kaldı.`,
                type: 'power',
            });
        }
    }
    // Conclude the hand and evaluate score
    static endHand(state, winType, instantWinnerId) {
        state.phase = 'round_over';
        // Reveal all cards
        state.players.forEach((p) => {
            p.cards.forEach((c) => (c.isRevealed = true));
        });
        const summaries = state.players.map((p) => {
            const cards = p.cards;
            const values = cards.map((c) => c.value);
            const sum = values.reduce((acc, v) => acc + v, 0);
            const count12 = values.filter((v) => v === 12).length;
            const count13 = values.filter((v) => v === 13).length;
            const isKamikaze = count12 >= 2 && count13 >= 2;
            return {
                playerId: p.id,
                name: p.name,
                cardValues: values,
                sum,
                penalty: 0,
                roundScore: p.roundScore,
                totalScore: p.score,
                isKamikaze,
            };
        });
        let winnerId = state.players[0].id;
        let caboSuccess = false;
        const multiplier = state.handNumber === 3 ? 3 : 1;
        const addScore = (summary, baseScore) => {
            const score = baseScore * multiplier;
            summary.roundScore += score;
            if (score < 0)
                summary.penalty += Math.abs(score);
            return score;
        };
        if (winType === 'kamikaze') {
            winnerId = instantWinnerId || summaries.find((s) => s.isKamikaze)?.playerId || winnerId;
            summaries.forEach((s) => {
                if (s.playerId !== winnerId)
                    addScore(s, -20);
            });
            state.actionLogs.unshift({
                id: `log_${Date.now()}_kamikaze_win`,
                timestamp: Date.now(),
                text: `⚡ KAMİKAZE! ${this.getPlayerName(state, winnerId)} iki adet 12 ve iki adet 13 ile partiyi bitirdi. Rakibi ${20 * multiplier} skor kaybetti.`,
                type: 'cabo',
            });
        }
        else if (winType === 'rey') {
            const caller = summaries.find((s) => s.playerId === state.caboCallerId);
            const rival = summaries.find((s) => s.playerId !== state.caboCallerId);
            if (caller && rival) {
                if (caller.sum < rival.sum) {
                    winnerId = caller.playerId;
                    caboSuccess = true;
                    const reward = addScore(caller, 60);
                    state.actionLogs.unshift({
                        id: `log_${Date.now()}_rey_win`,
                        timestamp: Date.now(),
                        text: `👑 KABO ZAFERİ! ${caller.name} daha düşük el ile (${caller.sum} vs ${rival.sum}) çağrıyı kazandı! (+${reward} Skor)`,
                        type: 'cabo',
                    });
                }
                else {
                    winnerId = rival.playerId;
                    caboSuccess = false;
                    const rivalReward = addScore(rival, 40);
                    const callerPenalty = addScore(caller, -10);
                    state.actionLogs.unshift({
                        id: `log_${Date.now()}_rey_fail`,
                        timestamp: Date.now(),
                        text: `❌ KABO BAŞARISIZ! ${caller.name} (${caller.sum}) rakibinden (${rival.sum}) daha düşük kalamadı (${callerPenalty} Skor). ${rival.name} düşük el ödülü kazandı (+${rivalReward}).`,
                        type: 'alert',
                    });
                }
            }
        }
        else {
            // winType === 'tur_end': Lowest sum wins!
            const p1 = summaries[0];
            const p2 = summaries[1];
            if (p1.sum < p2.sum) {
                winnerId = p1.playerId;
                addScore(p1, 40);
            }
            else if (p2.sum < p1.sum) {
                winnerId = p2.playerId;
                addScore(p2, 40);
            }
            else {
                winnerId = p1.playerId;
            }
            state.actionLogs.unshift({
                id: `log_${Date.now()}_tur_end`,
                timestamp: Date.now(),
                text: p1.sum === p2.sum
                    ? `🏁 3 TUR BİTTİ! Eller eşit (${p1.sum}-${p2.sum}); düşük el ödülü verilmedi.`
                    : `🏁 3 TUR BİTTİ! ${this.getPlayerName(state, winnerId)} en düşük el ile eli kazandı! (+${40 * multiplier} Skor)`,
                type: 'info',
            });
        }
        // A player who finishes the hand with a valid Kamikaze but did not call it loses score.
        summaries.forEach((summary) => {
            const calledKamikaze = winType === 'kamikaze' && summary.playerId === winnerId;
            const player = state.players.find((candidate) => candidate.id === summary.playerId);
            if (!player?.missedKamikazeOpportunity || calledKamikaze)
                return;
            const penalty = addScore(summary, -20);
            state.actionLogs.unshift({
                id: `log_${Date.now()}_missed_kamikaze_${summary.playerId}`,
                timestamp: Date.now(),
                text: `⚠️ ${summary.name} Kamikaze şansı varken çağrı yapmadı (${penalty} Skor).`,
                type: 'alert',
            });
        });
        // Apply cumulative match score
        state.players.forEach((p) => {
            const s = summaries.find((sum) => sum.playerId === p.id);
            if (s) {
                const endOfHandDelta = s.roundScore - p.roundScore;
                p.score += endOfHandDelta;
                p.roundScore = s.roundScore;
                s.totalScore = p.score;
            }
        });
        state.roundResults = {
            handNumber: state.handNumber,
            winnerId,
            winType,
            caboCallerId: state.caboCallerId,
            caboSuccess,
            scores: summaries,
        };
        // If Kamikaze happened or 3rd hand finishes, Match (Parti) is over!
        if (winType === 'kamikaze' || state.handNumber >= 3) {
            state.phase = 'game_over';
            const grandChampion = winType === 'kamikaze'
                ? state.players.find((p) => p.id === winnerId)
                : [...state.players].sort((a, b) => b.score - a.score)[0];
            state.partiWinnerId = grandChampion.id;
            state.actionLogs.unshift({
                id: `log_${Date.now()}_parti_over`,
                timestamp: Date.now(),
                text: `🏆 PARTİ TAMAMLANDI! ${grandChampion.name} ${winType === 'kamikaze'
                    ? 'Kamikaze yaparak tüm maçı anında kazandı!'
                    : `toplam ${grandChampion.score} skor ile Partiyi kazandı!`}`,
                type: 'cabo',
            });
        }
    }
    // Start next hand in current parti (Hand 2 or Hand 3)
    static startNextHand(state, deck = createDeck()) {
        const nextHandNumber = state.handNumber + 1;
        state.players.forEach((p) => {
            const hand = [];
            for (let i = 0; i < 4; i++) {
                const c = deck.pop();
                c.isRevealed = false; // All cards face-down initially
                hand.push(c);
            }
            p.cards = hand;
            p.cardCount = hand.length;
            p.initialPeeksDone = false;
            p.roundScore = 0;
            p.hasTakenFinalTurn = false;
            p.hasChosenPowerInTur2 = false;
            p.availablePowers = undefined;
            p.chosenPower = null;
            p.missedKamikazeOpportunity = false;
        });
        const firstDiscard = deck.pop();
        firstDiscard.isRevealed = true;
        state.discardPile = [firstDiscard];
        const turnsTaken = {};
        state.players.forEach((p) => {
            turnsTaken[p.id] = 0;
        });
        state.phase = 'initial_peek';
        state.handNumber = nextHandNumber;
        state.roundNumber = nextHandNumber;
        state.turNumber = 1;
        state.turnsTakenInHand = turnsTaken;
        state.caboCallerId = null;
        state.drawPileCount = deck.length;
        state.currentDrawnCard = null;
        state.turnSubPhase = 'idle';
        state.currentTurnIndex = 0;
        state.activePlayerId = state.players[0].id;
        state.powerSelections = {};
        state.lastPairPlayerId = null;
        state.consecutivePairCount = 0;
        state.actionLogs.unshift({
            id: `log_${Date.now()}_next_hand`,
            timestamp: Date.now(),
            text: `El ${nextHandNumber} başladı! Destede 32 kart bulunuyor.`,
            type: 'info',
        });
    }
    // Reshuffle discard pile into draw pile helper
    static reshuffleDiscardIntoDeck(state, deck) {
        if (state.discardPile.length <= 1)
            return;
        const topCard = state.discardPile.pop();
        const cardsToShuffle = [...state.discardPile];
        state.discardPile = [topCard];
        for (let i = cardsToShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cardsToShuffle[i], cardsToShuffle[j]] = [cardsToShuffle[j], cardsToShuffle[i]];
        }
        cardsToShuffle.forEach((c) => (c.isRevealed = false));
        deck.push(...cardsToShuffle);
        state.drawPileCount = deck.length;
    }
    static handleInitialPeek(state, playerId, indices) {
        const pauseError = this.pauseError(state);
        if (pauseError)
            return { success: false, error: pauseError };
        const player = state.players.find((p) => p.id === playerId);
        if (!player)
            return { success: false, error: 'Oyuncu bulunamadı' };
        if (!indices || indices.length !== 2) {
            return { success: false, error: 'Tam olarak 2 kart seçmelisiniz' };
        }
        const cards = player.cards;
        const peeked = indices.map((idx) => cards[idx]).filter(Boolean);
        if (peeked.length !== 2) {
            return { success: false, error: 'Seçilen kartlar bulunamadı' };
        }
        return { success: true, peekedCards: peeked };
    }
    static confirmInitialPeek(state, playerId) {
        const pauseError = this.pauseError(state);
        if (pauseError)
            return { success: false, allReady: false, error: pauseError };
        const player = state.players.find((p) => p.id === playerId);
        if (!player)
            return { success: false, allReady: false, error: 'Oyuncu bulunamadı' };
        player.initialPeeksDone = true;
        const allReady = state.players.every((p) => p.initialPeeksDone);
        if (allReady) {
            state.phase = 'playing';
            state.actionLogs.unshift({
                id: `log_${Date.now()}_start_play`,
                timestamp: Date.now(),
                text: `Tüm oyuncular kartlarını ezberledi! 1. Tur başladı, sıra ${state.players[0].name} oyuncusunda.`,
                type: 'info',
            });
        }
        return { success: true, allReady };
    }
    static getPlayerName(state, playerId) {
        return state.players.find((p) => p.id === playerId)?.name || 'Oyuncu';
    }
    static markMissedKamikazeIfAvailable(state, playerId) {
        const player = state.players.find((candidate) => candidate.id === playerId);
        if (!player)
            return;
        const values = player.cards.map((card) => card.value);
        const canKamikaze = values.length === 4 &&
            values.filter((value) => value === 12).length === 2 &&
            values.filter((value) => value === 13).length === 2;
        if (canKamikaze)
            player.missedKamikazeOpportunity = true;
    }
    // Client sanitization
    static sanitizeForClient(state, playerId) {
        const isRoundOver = state.phase === 'round_over' || state.phase === 'game_over';
        const clientPlayers = state.players.map((p) => {
            const isMe = p.id === playerId;
            const maskedCards = p.cards.map((c, idx) => {
                if (isRoundOver) {
                    return { ...c, isRevealed: true };
                }
                // In Rey, cards revealed during game
                const isKnownToOwner = isMe && c.isRevealed;
                return {
                    id: c.id,
                    isRevealed: isKnownToOwner || false,
                    value: isKnownToOwner ? c.value : 0,
                    ability: isKnownToOwner ? c.ability : 'none',
                    name: isKnownToOwner ? c.name : `Card ${idx + 1}`,
                    flavor: isKnownToOwner ? c.flavor : '',
                };
            });
            const count12 = p.cards.filter((c) => c && c.value === 12).length;
            const count13 = p.cards.filter((c) => c && c.value === 13).length;
            const canKamikaze = p.cards.length === 4 && count12 === 2 && count13 === 2;
            return {
                id: p.id,
                name: p.name,
                isHost: p.isHost,
                isAI: p.isAI,
                avatar: p.avatar,
                cards: maskedCards,
                cardCount: p.cards.length,
                initialPeeksDone: p.initialPeeksDone,
                score: p.score,
                roundScore: p.roundScore,
                hasTakenFinalTurn: p.hasTakenFinalTurn,
                connected: p.connected,
                availablePowers: isMe ? p.availablePowers : undefined,
                chosenPower: p.chosenPower,
                canKamikaze: isMe ? canKamikaze : undefined,
            };
        });
        const topDiscard = state.discardPile.length > 0 ? state.discardPile[state.discardPile.length - 1] : null;
        const visibleDrawnCard = state.activePlayerId === playerId || state.turnSubPhase === 'drawn_discard'
            ? state.currentDrawnCard
            : null;
        return {
            roomCode: state.roomCode,
            phase: state.phase,
            players: clientPlayers,
            myPlayerId: playerId,
            currentTurnIndex: state.currentTurnIndex,
            activePlayerId: state.activePlayerId,
            caboCallerId: state.caboCallerId,
            drawPileCount: state.drawPileCount,
            topDiscardCard: topDiscard,
            currentDrawnCard: visibleDrawnCard,
            turnSubPhase: state.turnSubPhase,
            roundNumber: state.roundNumber,
            handNumber: state.handNumber,
            maxHands: state.maxHands,
            turNumber: state.turNumber,
            actionLogs: state.actionLogs.slice(0, 30),
            roundResults: state.roundResults,
            partiWinnerId: state.partiWinnerId,
        };
    }
}
