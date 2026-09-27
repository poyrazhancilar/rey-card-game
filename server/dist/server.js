import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { loadEnvFile } from 'process';
import { RoomManager } from './roomManager.js';
import { CaboGameEngine } from './gameEngine.js';
import { CaboAIController } from './aiPlayer.js';
import { createAdminCard } from './cards.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
for (const envPath of [path.resolve(__dirname, '../../.env'), path.resolve(__dirname, '../.env')]) {
    try {
        loadEnvFile(envPath);
    }
    catch {
        // Environment variables may also be supplied by the deployment platform.
    }
}
const app = express();
app.use(cors());
app.use(express.json());
// Serve client build if available (production mode)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});
const PORT = process.env.PORT || 3001;
const ADMIN_CHANNEL = '__rey_admin__';
const ADMIN_COOKIE = 'rey_admin_session';
const ADMIN_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || ADMIN_PASSWORD || randomBytes(32).toString('hex');
const parsedReconnectGraceMs = Number(process.env.RECONNECT_GRACE_MS || 180000);
const RECONNECT_GRACE_MS = Number.isFinite(parsedReconnectGraceMs)
    ? Math.max(30000, parsedReconnectGraceMs)
    : 180000;
const reconnectExpiryTimers = new Map();
function parseCookies(cookieHeader) {
    if (!cookieHeader)
        return {};
    return Object.fromEntries(cookieHeader.split(';').map((part) => {
        const [rawKey, ...rawValue] = part.trim().split('=');
        return [rawKey, decodeURIComponent(rawValue.join('='))];
    }));
}
function signAdminPayload(payload) {
    return createHmac('sha256', ADMIN_SESSION_SECRET).update(payload).digest('base64url');
}
function createAdminToken() {
    const payload = Buffer.from(JSON.stringify({ expiresAt: Date.now() + ADMIN_SESSION_DURATION_MS })).toString('base64url');
    return `${payload}.${signAdminPayload(payload)}`;
}
function verifyAdminToken(token) {
    if (!token || !ADMIN_PASSWORD)
        return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature)
        return null;
    const expected = Buffer.from(signAdminPayload(payload));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received))
        return null;
    try {
        const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        return typeof parsed.expiresAt === 'number' && parsed.expiresAt > Date.now() ? parsed : null;
    }
    catch {
        return null;
    }
}
function getAdminToken(cookieHeader) {
    return parseCookies(cookieHeader)[ADMIN_COOKIE];
}
function passwordsMatch(candidate) {
    if (typeof candidate !== 'string' || !ADMIN_PASSWORD)
        return false;
    const expected = Buffer.from(ADMIN_PASSWORD);
    const received = Buffer.from(candidate);
    return expected.length === received.length && timingSafeEqual(expected, received);
}
function requireAdmin(req, res, next) {
    if (!verifyAdminToken(getAdminToken(req.headers.cookie))) {
        res.status(401).json({ error: 'Yetkisiz erişim' });
        return;
    }
    next();
}
function authorizeAdminSocket(socket, callback) {
    const session = verifyAdminToken(getAdminToken(socket.handshake.headers.cookie));
    if (!session) {
        socket.emit('admin_unauthorized');
        if (typeof callback === 'function')
            callback({ success: false, error: 'Yetkisiz erişim' });
        return null;
    }
    return session;
}
function scheduleAdminExpiry(socket, session) {
    const previousTimer = socket.data.adminExpiryTimer;
    if (previousTimer)
        clearTimeout(previousTimer);
    socket.data.adminExpiryTimer = setTimeout(() => {
        socket.leave(ADMIN_CHANNEL);
        const roomCode = socket.data.adminRoomCode;
        if (roomCode)
            socket.leave(adminSessionChannel(roomCode));
        delete socket.data.adminRoomCode;
        socket.emit('admin_unauthorized');
    }, Math.max(0, session.expiresAt - Date.now()));
}
function adminSessionChannel(roomCode) {
    return `__rey_admin_session_${roomCode}`;
}
function broadcastAdminSessions() {
    io.to(ADMIN_CHANNEL).emit('admin_sessions', RoomManager.getAdminSessions());
}
function reconnectTimerKey(roomCode, playerId) {
    return `${roomCode}:${playerId}`;
}
function clearReconnectExpiry(roomCode, playerId) {
    const key = reconnectTimerKey(roomCode, playerId);
    const timer = reconnectExpiryTimers.get(key);
    if (timer)
        clearTimeout(timer);
    reconnectExpiryTimers.delete(key);
}
function clearRoomReconnectExpiries(roomCode) {
    for (const [key, timer] of reconnectExpiryTimers) {
        if (!key.startsWith(`${roomCode}:`))
            continue;
        clearTimeout(timer);
        reconnectExpiryTimers.delete(key);
    }
}
function scheduleReconnectExpiry(room, playerId) {
    clearReconnectExpiry(room.code, playerId);
    const key = reconnectTimerKey(room.code, playerId);
    const timer = setTimeout(() => {
        reconnectExpiryTimers.delete(key);
        const result = RoomManager.expireDisconnectedPlayer(room.code, playerId);
        if (!result.room || !result.player)
            return;
        if (result.roomDestroyed) {
            clearRoomReconnectExpiries(room.code);
            io.to(room.code).emit('room_closed', {
                message: `${result.player.name} zamanında yeniden bağlanamadığı için oyun oturumu kapatıldı.`,
            });
            io.to(adminSessionChannel(room.code)).emit('admin_session_removed', { roomCode: room.code });
            broadcastAdminSessions();
        }
        else {
            io.to(room.code).emit('player_connection_changed', {
                playerId,
                playerName: result.player.name,
                connected: false,
                expired: true,
            });
            broadcastRoomState(result.room);
        }
    }, RECONNECT_GRACE_MS);
    reconnectExpiryTimers.set(key, timer);
}
// Broadcast sanitized game state to each connected player in the room
function broadcastRoomState(room) {
    room.players.forEach((player) => {
        if (player.isAI)
            return;
        const socketId = room.playerSocketMap.get(player.id);
        if (socketId) {
            const sanitized = CaboGameEngine.sanitizeForClient(room.state, player.id);
            io.to(socketId).emit('game_state', sanitized);
        }
    });
    const adminState = RoomManager.recordAdminSnapshot(room, RoomManager.isRoomActive(room.code));
    io.to(adminSessionChannel(room.code)).emit('admin_session_state', adminState);
    broadcastAdminSessions();
}
function triggerAITurn(room) {
    RoomManager.triggerAITurnIfNeeded(room, () => broadcastRoomState(room), (event, payload) => {
        if (event === 'spied') {
            const targetSocketId = room.playerSocketMap.get(payload.targetPlayerId);
            if (targetSocketId) {
                io.to(targetSocketId).emit('spied_alert', {
                    byPlayerName: payload.byPlayerName,
                    slotIndex: payload.slotIndex,
                    slots: payload.slots,
                    isAll: payload.isAll,
                    durationMs: 3000,
                });
                io.to(targetSocketId).emit('sound_effect', { name: 'spy' });
            }
        }
        else if (event === 'swap_animation') {
            io.to(room.code).emit('swap_animation', payload);
            io.to(room.code).emit('sound_effect', { name: 'swap' });
        }
        else if (event === 'match_draw_animation') {
            io.to(room.code).emit('match_draw_animation', payload);
            io.to(room.code).emit('sound_effect', { name: 'match_success' });
        }
    });
}
io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);
    socket.on('admin_subscribe', (callback) => {
        const session = authorizeAdminSocket(socket, callback);
        if (!session)
            return;
        scheduleAdminExpiry(socket, session);
        socket.join(ADMIN_CHANNEL);
        socket.emit('admin_sessions', RoomManager.getAdminSessions());
        if (typeof callback === 'function')
            callback({ success: true });
    });
    socket.on('resume_session', (data, callback) => {
        const roomCode = String(data?.roomCode || '').trim();
        const playerId = String(data?.playerId || '').trim();
        const reconnectToken = String(data?.reconnectToken || '');
        const result = RoomManager.resumePlayer(roomCode, playerId, reconnectToken, socket.id);
        if (!result.success || !result.room || !result.player || !result.reconnectToken) {
            if (typeof callback === 'function') {
                callback({ success: false, error: result.error || 'Oturum geri yüklenemedi' });
            }
            return;
        }
        clearReconnectExpiry(result.room.code, result.player.id);
        socket.join(result.room.code);
        if (result.previousSocketId) {
            io.sockets.sockets.get(result.previousSocketId)?.disconnect(true);
        }
        const clientState = CaboGameEngine.sanitizeForClient(result.room.state, result.player.id);
        if (typeof callback === 'function') {
            callback({
                success: true,
                roomCode: result.room.code,
                playerId: result.player.id,
                reconnectToken: result.reconnectToken,
                gameState: clientState,
            });
        }
        io.to(result.room.code).emit('player_connection_changed', {
            playerId: result.player.id,
            playerName: result.player.name,
            connected: true,
        });
        broadcastRoomState(result.room);
        setTimeout(() => triggerAITurn(result.room), 800);
    });
    socket.on('admin_watch_session', (data, callback) => {
        if (!authorizeAdminSocket(socket, callback))
            return;
        const roomCode = String(data?.roomCode || '').trim();
        const previousRoomCode = socket.data.adminRoomCode;
        if (previousRoomCode) {
            socket.leave(adminSessionChannel(previousRoomCode));
        }
        const session = RoomManager.getAdminSession(roomCode);
        if (!session) {
            if (typeof callback === 'function') {
                callback({ success: false, error: 'Oturum bulunamadı' });
            }
            return;
        }
        socket.data.adminRoomCode = roomCode;
        socket.join(adminSessionChannel(roomCode));
        socket.emit('admin_session_state', session);
        if (typeof callback === 'function') {
            callback({ success: true });
        }
    });
    socket.on('admin_unwatch_session', () => {
        const roomCode = socket.data.adminRoomCode;
        if (roomCode) {
            socket.leave(adminSessionChannel(roomCode));
            delete socket.data.adminRoomCode;
        }
    });
    socket.on('admin_override_card', (data, callback) => {
        if (!authorizeAdminSocket(socket, callback))
            return;
        const roomCode = String(data?.roomCode || '').trim();
        const cardValue = Number(data?.cardValue);
        const cardIndex = Number(data?.cardIndex);
        const room = RoomManager.getRoom(roomCode);
        if (!room) {
            if (typeof callback === 'function')
                callback({ success: false, error: 'Aktif oda bulunamadı' });
            return;
        }
        if (room.state.phase !== 'initial_peek' && room.state.phase !== 'playing') {
            if (typeof callback === 'function') {
                callback({ success: false, error: 'Kartlar yalnızca devam eden bir elde değiştirilebilir' });
            }
            return;
        }
        if (!Number.isInteger(cardValue) || cardValue < 0 || cardValue > 13) {
            if (typeof callback === 'function')
                callback({ success: false, error: 'Kart değeri 0-13 arasında olmalı' });
            return;
        }
        if (!Number.isInteger(cardIndex) || cardIndex < 0) {
            if (typeof callback === 'function')
                callback({ success: false, error: 'Kart konumu geçersiz' });
            return;
        }
        const replacement = createAdminCard(cardValue);
        let adminLog = '';
        if (data.target === 'player') {
            const player = room.players.find((candidate) => candidate.id === data.playerId);
            if (!player || cardIndex >= player.cards.length) {
                if (typeof callback === 'function')
                    callback({ success: false, error: 'Oyuncu kartı bulunamadı' });
                return;
            }
            const previous = player.cards[cardIndex];
            if (!previous || !('value' in previous)) {
                if (typeof callback === 'function')
                    callback({ success: false, error: 'Kart verisi override için uygun değil' });
                return;
            }
            player.cards[cardIndex] = replacement;
            player.cardCount = player.cards.length;
            room.players.filter((candidate) => candidate.isAI).forEach((candidate) => {
                CaboAIController.resetMemory(candidate.id);
            });
            adminLog = `👑 ADMIN OVERRIDE: ${player.name} / Slot ${cardIndex + 1}: ${previous.value} → ${replacement.value}`;
        }
        else if (data.target === 'draw_pile') {
            if (cardIndex >= room.deck.length) {
                if (typeof callback === 'function')
                    callback({ success: false, error: 'Deste kartı bulunamadı' });
                return;
            }
            const internalIndex = room.deck.length - 1 - cardIndex;
            const previous = room.deck[internalIndex];
            room.deck[internalIndex] = replacement;
            room.state.drawPileCount = room.deck.length;
            adminLog = `👑 ADMIN OVERRIDE: Deste sıra ${cardIndex + 1}: ${previous.value} → ${replacement.value}`;
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: 'Override hedefi geçersiz' });
            return;
        }
        room.state.actionLogs.unshift({
            id: `log_admin_override_${Date.now()}`,
            timestamp: Date.now(),
            text: adminLog,
            type: 'alert',
        });
        io.to(room.code).emit('admin_override_notice', {
            message: 'REY YÖNETİMİ OYUN AKIŞINA MÜDAHALE ETTİ',
            durationMs: 5000,
        });
        io.to(room.code).emit('sound_effect', { name: 'cabo_alert' });
        broadcastRoomState(room);
        if (typeof callback === 'function')
            callback({ success: true, card: replacement });
    });
    // Create Room
    socket.on('create_room', (data, callback) => {
        try {
            const { room, player, reconnectToken } = RoomManager.createRoom(data.hostName, data.avatar, socket.id);
            socket.join(room.code);
            const clientState = CaboGameEngine.sanitizeForClient(room.state, player.id);
            if (typeof callback === 'function') {
                callback({ success: true, roomCode: room.code, playerId: player.id, reconnectToken, gameState: clientState });
            }
            broadcastRoomState(room);
        }
        catch (err) {
            console.error('Error creating room:', err);
            if (typeof callback === 'function') {
                callback({ success: false, error: err.message });
            }
        }
    });
    // Join Room
    socket.on('join_room', (data, callback) => {
        try {
            const res = RoomManager.joinRoom(data.roomCode, data.playerName, data.avatar, socket.id);
            if (!res.success || !res.room || !res.player) {
                if (typeof callback === 'function') {
                    callback({ success: false, error: res.error || 'Failed to join room' });
                }
                return;
            }
            socket.join(res.room.code);
            const clientState = CaboGameEngine.sanitizeForClient(res.room.state, res.player.id);
            if (typeof callback === 'function') {
                callback({
                    success: true,
                    roomCode: res.room.code,
                    playerId: res.player.id,
                    reconnectToken: res.reconnectToken,
                    gameState: clientState,
                });
            }
            broadcastRoomState(res.room);
        }
        catch (err) {
            console.error('Error joining room:', err);
            if (typeof callback === 'function') {
                callback({ success: false, error: err.message });
            }
        }
    });
    // Add AI
    socket.on('add_ai', (data, callback) => {
        const res = RoomManager.addAI(data.roomCode);
        const room = RoomManager.getRoom(data.roomCode);
        if (res.success && room) {
            broadcastRoomState(room);
            if (typeof callback === 'function')
                callback({ success: true });
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    // Remove AI
    socket.on('remove_ai', (data, callback) => {
        const res = RoomManager.removeAI(data.roomCode, data.aiId);
        const room = RoomManager.getRoom(data.roomCode);
        if (res.success && room) {
            broadcastRoomState(room);
            if (typeof callback === 'function')
                callback({ success: true });
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    // Start Game
    socket.on('start_game', (data, callback) => {
        const res = RoomManager.startGame(data.roomCode, data.playerId);
        const room = RoomManager.getRoom(data.roomCode);
        if (res.success && room) {
            broadcastRoomState(room);
            io.to(room.code).emit('sound_effect', { name: 'game_start' });
            if (typeof callback === 'function')
                callback({ success: true });
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    // Initial Peek (Select 2 cards to peek)
    socket.on('initial_peek', (data, callback) => {
        const room = RoomManager.getRoom(data.roomCode);
        if (!room)
            return;
        const res = CaboGameEngine.handleInitialPeek(room.state, data.playerId, data.indices);
        if (res.success) {
            if (typeof callback === 'function') {
                callback({ success: true, peekedCards: res.peekedCards });
            }
        }
        else {
            if (typeof callback === 'function') {
                callback({ success: false, error: res.error });
            }
        }
    });
    // Confirm Initial Peek (Player finished memorizing and is ready)
    socket.on('confirm_initial_peek', (data, callback) => {
        const room = RoomManager.getRoom(data.roomCode);
        if (!room)
            return;
        const res = CaboGameEngine.confirmInitialPeek(room.state, data.playerId);
        if (res.success) {
            broadcastRoomState(room);
            if (typeof callback === 'function') {
                callback({ success: true, allReady: res.allReady });
            }
            // If game transitioned to playing, check if first player is AI
            if (room.state.phase === 'playing') {
                setTimeout(() => {
                    triggerAITurn(room);
                }, 1000);
            }
        }
        else {
            if (typeof callback === 'function') {
                callback({ success: false, error: res.error });
            }
        }
    });
    // Draw Card (from deck or discard)
    socket.on('draw_card', (data, callback) => {
        const room = RoomManager.getRoom(data.roomCode);
        if (!room)
            return;
        if (data.source === 'deck') {
            const res = CaboGameEngine.drawFromDeck(room.state, room.deck, data.playerId);
            if (res.success) {
                broadcastRoomState(room);
                socket.emit('sound_effect', { name: 'card_draw' });
                if (typeof callback === 'function')
                    callback({ success: true, card: res.drawnCard });
            }
            else {
                if (typeof callback === 'function')
                    callback({ success: false, error: res.error });
            }
        }
        else {
            const res = CaboGameEngine.drawFromDiscard(room.state, data.playerId);
            if (res.success) {
                broadcastRoomState(room);
                io.to(room.code).emit('sound_effect', { name: 'card_draw' });
                if (typeof callback === 'function')
                    callback({ success: true, card: res.card });
            }
            else {
                if (typeof callback === 'function')
                    callback({ success: false, error: res.error });
            }
        }
    });
    // Replace Card
    socket.on('replace_card', (data, callback) => {
        const room = RoomManager.getRoom(data.roomCode);
        if (!room)
            return;
        const res = CaboGameEngine.replaceCard(room.state, data.playerId, data.slotIndex);
        if (res.success) {
            io.to(room.code).emit('sound_effect', { name: 'card_snap' });
            broadcastRoomState(room);
            if (typeof callback === 'function')
                callback({ success: true, replacedCard: res.replacedCard });
            // Trigger AI turn if next is AI
            setTimeout(() => {
                triggerAITurn(room);
            }, 1300);
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    // Discard Drawn Card (and optionally activate ability)
    socket.on('discard_drawn', (data, callback) => {
        const room = RoomManager.getRoom(data.roomCode);
        if (!room)
            return;
        const res = CaboGameEngine.discardDrawnCard(room.state, data.playerId, data.usePower);
        if (res.success) {
            if (res.nextPhase === 'peeking' || res.nextPhase === 'spying' || res.nextPhase === 'swapping') {
                io.to(room.code).emit('sound_effect', { name: 'power_activate' });
            }
            else {
                io.to(room.code).emit('sound_effect', { name: 'card_snap' });
            }
            broadcastRoomState(room);
            if (typeof callback === 'function')
                callback({ success: true, nextPhase: res.nextPhase });
            if (res.nextPhase === 'idle') {
                setTimeout(() => {
                    triggerAITurn(room);
                }, 700);
            }
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    // Execute Peek Power
    socket.on('execute_peek', (data, callback) => {
        const room = RoomManager.getRoom(data.roomCode);
        if (!room)
            return;
        const res = CaboGameEngine.executePeek(room.state, data.playerId, data.slotIndex);
        if (res.success) {
            if (res.pending) {
                broadcastRoomState(room);
                if (typeof callback === 'function')
                    callback(res);
                return;
            }
            if (res.cards && res.slots && res.cards.length > 1) {
                socket.emit('peek_2_result', { cards: res.cards, slots: res.slots, durationMs: 3000 });
            }
            else if (res.card) {
                socket.emit('peek_result', {
                    card: res.card,
                    slotIndex: res.slots?.[0] ?? data.slotIndex,
                    durationMs: 3000,
                });
            }
            socket.emit('sound_effect', { name: 'peek' });
            broadcastRoomState(room);
            if (typeof callback === 'function')
                callback(res);
            setTimeout(() => {
                triggerAITurn(room);
            }, 3100);
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    // Execute Spy Power
    socket.on('execute_spy', (data, callback) => {
        const room = RoomManager.getRoom(data.roomCode);
        if (!room)
            return;
        const res = CaboGameEngine.executeSpy(room.state, data.playerId, data.targetPlayerId, data.slotIndex);
        if (res.success) {
            if (res.pending) {
                broadcastRoomState(room);
                if (typeof callback === 'function')
                    callback(res);
                return;
            }
            const spyer = room.players.find((p) => p.id === data.playerId);
            if (res.cards && res.slots && res.cards.length > 1) {
                socket.emit('spy_multi_result', {
                    cards: res.cards,
                    slots: res.slots,
                    targetPlayerId: data.targetPlayerId,
                    durationMs: 3000,
                });
            }
            else if (res.card) {
                socket.emit('spy_result', {
                    card: res.card,
                    targetPlayerId: data.targetPlayerId,
                    slotIndex: res.slots?.[0] ?? data.slotIndex,
                    durationMs: 3000,
                });
            }
            socket.emit('sound_effect', { name: 'spy' });
            // 2. Notify the victim (target player) with red overlay and glowing eye for 3 seconds
            const targetSocketId = room.playerSocketMap.get(data.targetPlayerId);
            if (targetSocketId) {
                io.to(targetSocketId).emit('spied_alert', {
                    byPlayerName: spyer?.name || 'A rival',
                    slotIndex: res.slots?.length === 1 ? res.slots[0] : undefined,
                    slots: res.slots && res.slots.length > 1 ? res.slots : undefined,
                    durationMs: 3000,
                });
                io.to(targetSocketId).emit('sound_effect', { name: 'spy' });
            }
            broadcastRoomState(room);
            if (typeof callback === 'function')
                callback(res);
            setTimeout(() => {
                triggerAITurn(room);
            }, 3100);
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    // Execute Swap Power
    socket.on('execute_swap', (data, callback) => {
        const room = RoomManager.getRoom(data.roomCode);
        if (!room)
            return;
        const res = CaboGameEngine.executeSwap(room.state, data.playerId, data.ownSlotIndex, data.targetPlayerId, data.targetSlotIndex);
        if (res.success) {
            // Emit swap animation to all clients in the room (cards remain face-down!)
            io.to(room.code).emit('swap_animation', {
                fromPlayerId: data.playerId,
                fromSlotIndex: data.ownSlotIndex,
                toPlayerId: data.targetPlayerId,
                toSlotIndex: data.targetSlotIndex,
                durationMs: 1400,
            });
            io.to(room.code).emit('sound_effect', { name: 'swap' });
            broadcastRoomState(room);
            if (typeof callback === 'function')
                callback({ success: true });
            setTimeout(() => {
                triggerAITurn(room);
            }, 1600);
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    // Discard Matching: Çiftleme (2), Üçleme (3), Dörtleme (4)
    socket.on('discard_pair', (data, callback) => {
        const room = RoomManager.getRoom(data.roomCode);
        if (!room)
            return;
        const res = CaboGameEngine.discardPair(room.state, room.deck, data.playerId, data.indices);
        if (res.success) {
            io.to(room.code).emit('match_draw_animation', {
                playerId: data.playerId,
                slotIndex: res.keepSlot ?? 0,
                card: res.drawnCard,
                count: data.indices.length,
                bonus: res.bonus,
                durationMs: 2200,
            });
            io.to(room.code).emit('sound_effect', { name: 'match_success' });
            broadcastRoomState(room);
            if (typeof callback === 'function')
                callback(res);
        }
        else {
            if (res.penalty) {
                io.to(room.code).emit('sound_effect', { name: 'match_fail' });
                broadcastRoomState(room);
            }
            if (typeof callback === 'function')
                callback(res);
        }
    });
    // Backward compatibility alias for match_discard
    socket.on('match_discard', (data, callback) => {
        const room = RoomManager.getRoom(data.roomCode);
        if (!room)
            return;
        const res = CaboGameEngine.discardPair(room.state, room.deck, data.playerId, data.indices);
        if (res.success) {
            io.to(room.code).emit('match_draw_animation', {
                playerId: data.playerId,
                slotIndex: res.keepSlot ?? 0,
                card: res.drawnCard,
                count: data.indices.length,
                bonus: res.bonus,
                durationMs: 2200,
            });
            io.to(room.code).emit('sound_effect', { name: 'match_success' });
            broadcastRoomState(room);
            if (typeof callback === 'function')
                callback(res);
        }
        else {
            if (res.penalty) {
                io.to(room.code).emit('sound_effect', { name: 'match_fail' });
                broadcastRoomState(room);
            }
            if (typeof callback === 'function')
                callback(res);
        }
    });
    // Call Rey button
    socket.on('call_rey', (data, callback) => {
        const room = RoomManager.getRoom(data.roomCode);
        if (!room)
            return;
        const res = CaboGameEngine.callRey(room.state, data.playerId);
        if (res.success) {
            const player = room.players.find((p) => p.id === data.playerId);
            io.to(room.code).emit('rey_called', { callerName: player?.name || 'Rakip' });
            io.to(room.code).emit('sound_effect', { name: 'cabo_alert' });
            broadcastRoomState(room);
            if (typeof callback === 'function')
                callback({ success: true });
            setTimeout(() => {
                triggerAITurn(room);
            }, 1500);
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    // Call Cabo alias
    socket.on('call_cabo', (data, callback) => {
        const room = RoomManager.getRoom(data.roomCode);
        if (!room)
            return;
        const res = CaboGameEngine.callRey(room.state, data.playerId);
        if (res.success) {
            const player = room.players.find((p) => p.id === data.playerId);
            io.to(room.code).emit('rey_called', { callerName: player?.name || 'Rakip' });
            io.to(room.code).emit('sound_effect', { name: 'cabo_alert' });
            broadcastRoomState(room);
            if (typeof callback === 'function')
                callback({ success: true });
            setTimeout(() => {
                triggerAITurn(room);
            }, 1500);
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    // Call Kamikaze button (two 12s and two 13s)
    socket.on('call_kamikaze', (data, callback) => {
        const room = RoomManager.getRoom(data.roomCode);
        if (!room)
            return;
        const res = CaboGameEngine.callKamikaze(room.state, data.playerId);
        if (res.success) {
            io.to(room.code).emit('sound_effect', { name: 'match_success' });
            broadcastRoomState(room);
            if (typeof callback === 'function')
                callback({ success: true });
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    // Select Power in Tur 2
    socket.on('select_power', (data, callback) => {
        const room = RoomManager.getRoom(data.roomCode);
        if (!room)
            return;
        const handSlotsBeforePower = new Map(room.players.map((player) => [player.id, player.cards.map((_, index) => index)]));
        const res = CaboGameEngine.selectPower(room.state, data.playerId, data.powerId);
        if (res.success && res.power) {
            io.to(room.code).emit('sound_effect', { name: 'power_activate' });
            if (res.power.type === 'swap_all') {
                io.to(room.code).emit('swap_animation', {
                    fromPlayerId: room.players[0].id,
                    fromSlotIndex: 0,
                    fromSlotIndices: handSlotsBeforePower.get(room.players[0].id) || [],
                    toPlayerId: room.players[1].id,
                    toSlotIndex: 0,
                    toSlotIndices: handSlotsBeforePower.get(room.players[1].id) || [],
                    durationMs: 2200,
                    isSwapAll: true,
                });
                io.to(room.code).emit('sound_effect', { name: 'swap' });
            }
            else if (res.power.type === 'peek_3') {
                const player = room.players.find((p) => p.id === data.playerId);
                if (player) {
                    socket.emit('peek_3_result', {
                        slots: player.cards.map((_, index) => index),
                        cards: player.cards,
                        nextCard: room.deck[room.deck.length - 1] || null,
                        durationMs: 4000,
                    });
                    socket.emit('sound_effect', { name: 'peek' });
                }
            }
            else if (res.power.type === 'spy_3') {
                const rival = room.players.find((p) => p.id !== data.playerId);
                if (rival) {
                    socket.emit('spy_all_result', {
                        targetPlayerId: rival.id,
                        cards: rival.cards,
                        durationMs: 3000,
                    });
                    const rivalSocketId = room.playerSocketMap.get(rival.id);
                    if (rivalSocketId) {
                        io.to(rivalSocketId).emit('spied_alert', {
                            byPlayerName: room.players.find((p) => p.id === data.playerId)?.name || 'Rakip',
                            slotIndex: 0,
                            durationMs: 3000,
                            isAll: true,
                        });
                    }
                }
            }
            broadcastRoomState(room);
            if (typeof callback === 'function')
                callback({ success: true, power: res.power });
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    // Start Next Hand in Parti
    socket.on('next_hand', (data, callback) => {
        const res = RoomManager.startNextHand(data.roomCode, data.playerId);
        const room = RoomManager.getRoom(data.roomCode);
        if (res.success && room) {
            broadcastRoomState(room);
            io.to(room.code).emit('sound_effect', { name: 'game_start' });
            if (typeof callback === 'function')
                callback({ success: true });
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    socket.on('next_round', (data, callback) => {
        const res = RoomManager.startNextHand(data.roomCode, data.playerId);
        const room = RoomManager.getRoom(data.roomCode);
        if (res.success && room) {
            broadcastRoomState(room);
            io.to(room.code).emit('sound_effect', { name: 'game_start' });
            if (typeof callback === 'function')
                callback({ success: true });
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    // Restart Entire Match / Parti
    socket.on('restart_parti', (data, callback) => {
        const res = RoomManager.restartParti(data.roomCode, data.playerId);
        const room = RoomManager.getRoom(data.roomCode);
        if (res.success && room) {
            broadcastRoomState(room);
            io.to(room.code).emit('sound_effect', { name: 'game_start' });
            if (typeof callback === 'function')
                callback({ success: true });
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    socket.on('restart_game', (data, callback) => {
        const res = RoomManager.restartParti(data.roomCode, data.playerId);
        const room = RoomManager.getRoom(data.roomCode);
        if (res.success && room) {
            broadcastRoomState(room);
            if (typeof callback === 'function')
                callback({ success: true });
        }
        else {
            if (typeof callback === 'function')
                callback({ success: false, error: res.error });
        }
    });
    // Disconnect
    socket.on('disconnect', () => {
        const adminExpiryTimer = socket.data.adminExpiryTimer;
        if (adminExpiryTimer)
            clearTimeout(adminExpiryTimer);
        const { room, player, roomDestroyed } = RoomManager.handleDisconnect(socket.id);
        if (roomDestroyed && room) {
            io.to(adminSessionChannel(room.code)).emit('admin_session_removed', { roomCode: room.code });
            broadcastAdminSessions();
        }
        else if (room && player) {
            scheduleReconnectExpiry(room, player.id);
            io.to(room.code).emit('player_connection_changed', {
                playerId: player.id,
                playerName: player.name,
                connected: false,
                graceMs: RECONNECT_GRACE_MS,
            });
            broadcastRoomState(room);
        }
    });
});
app.get('/api/admin/session', (req, res) => {
    res.json({ authenticated: Boolean(verifyAdminToken(getAdminToken(req.headers.cookie))) });
});
app.post('/api/admin/login', (req, res) => {
    if (!ADMIN_PASSWORD) {
        res.status(503).json({ error: 'ADMIN_PASSWORD yapılandırılmamış' });
        return;
    }
    if (!passwordsMatch(req.body?.password)) {
        res.status(401).json({ error: 'Şifre hatalı' });
        return;
    }
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=${encodeURIComponent(createAdminToken())}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(ADMIN_SESSION_DURATION_MS / 1000)}${secure}`);
    res.json({ success: true });
});
app.post('/api/admin/logout', (_req, res) => {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
    res.json({ success: true });
});
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.get('/api/admin/sessions', requireAdmin, (_req, res) => {
    res.json({ sessions: RoomManager.getAdminSessions() });
});
app.get('/api/admin/sessions/:roomCode', requireAdmin, (req, res) => {
    const session = RoomManager.getAdminSession(String(req.params.roomCode));
    if (!session) {
        res.status(404).json({ error: 'Oturum bulunamadı' });
        return;
    }
    res.json({ session });
});
// Catch-all for React SPA routing in production
app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
        if (err) {
            res.status(200).send('Cabo Card Game Backend Running. Vite frontend running on dev port 5173.');
        }
    });
});
server.listen(PORT, () => {
    console.log(`✨ Cabo Card Game Server running on port ${PORT}`);
});
