# ✦ CABO - Multiplayer Card Game ✦

A modern, real-time multiplayer web adaptation of the classic memory and deduction card game **CABO**. Built with **React**, **TypeScript**, **Tailwind CSS**, and **Socket.IO**.

---

## 🎮 Game Rules & Objective

In **CABO**, your goal is to minimize the total point value of the cards in your hand before anyone else calls "CABO".

1. **Setup**:
   - Each player is dealt **4 cards face down** in a row.
   - At the beginning of the round, every player secretly peeks at **2 of their cards** and memorizes them.
2. **On Your Turn**:
   - **Draw from the Deck**: Inspect the card secretly. You may swap it with any of your cards (or multiple matching cards), OR discard it. If discarded, and it has an ability (7-12), you may activate its power!
   - **Draw from the Discard Pile**: Take the face-up card and swap it with one of your cards. (Powers cannot be triggered from the discard pile).
   - **Call "CABO"**: If you think you hold the lowest total score, call CABO! You take no cards; every rival gets one final turn before all cards are revealed.
3. **Special Card Powers**:
   - **7 & 8 (Moon Owl / Solar Lynx)**: 👁️ **PEEK** — Secretly look at any one of your own cards.
   - **9 & 10 (Astral Crow / Mystic Wolf)**: 📡 **SPY** — Secretly look at any one card of an opponent.
   - **11 & 12 (Arcane Drake / Celestial Phoenix)**: 🔄 **SWAP** — Blindly trade one of your cards with any card of a rival.
4. **Matching Cards (Multiple Discards)**:
   - When replacing with a drawn card, if you know you hold 2 or more cards of the same rank (e.g. two 4s), you can declare a match!
   - If they match: all are discarded and replaced with the single drawn card, **permanently reducing your hand size**!
   - If they don't match: **PENALTY!** You keep them and draw an additional penalty card into your hand!
5. **Kamikaze House Rule**:
   - If a player ends the round holding **two 12s and two 13s**, they score **0 points** and all other players receive **50 points**!
6. **Scoring**:
   - **Lowest Score Wins**.
   - If the Cabo caller has the strictly lowest score: **0 points**!
   - If the Cabo caller fails (someone has equal or lower): **Caller's score + 10 penalty points**!

---

## ✨ Features

- **🌐 Real-Time Multiplayer**: Instant WebSocket synchronization with room codes and live turn updates.
- **🔢 6-Digit Room Codes**: Simple 6-digit room codes (e.g., `582910`) for easy verbal or text sharing.
- **📱 QR Code Sharing**: Instant QR Code generator rendered in the lobby for scanning directly from mobile phone cameras.
- **🎨 Custom Card Designs**: Handcrafted mystical vector SVG artwork for all card ranks from **0 to 13** (Void Wisp, Forest Pixie, Crystal Stag, Moon Owl, Chaos Dragon, and more) with custom borders, ability pills, and glowing card backs.
- **🔊 Procedural Sound FX**: Zero-dependency Web Audio API sound synthesizer with custom audio for card snaps, draws, 3D flips, peek chimes, spy sonar, swap warps, Cabo sirens, and victory fanfares.
- **🤖 Built-in AI Bots**: Host can add or remove intelligent AI bots (Bot Luna, Bot Orion, etc.) to practice solo or fill player slots.
- **🎲 High-Performance 2D Isometric Table**:
  - Pure 2D hardware-accelerated rendering optimized for mobile and desktop 60/120 FPS with zero touch/drag lag.
  - Classic casino felt table with 2.5D beveled mahogany wood rails, brass rivets, padded armrest rail, and emerald velvet felt with 60°/120° isometric diamond weave texture.
  - Completely eliminates heavy 3D compositing layers, free camera disorientation, and mobile battery drain.
- **📚 2D Isometric Physical Stacked Deck**: Multi-layered card stack with realistic diagonal offset depth, elevation, and tactile hover/tap draw effects.
- **🎴 2.5D Isometric Elevated Cards**: Cards rest on the felt with realistic diagonal cast shadows and physically lift off the table when hovered or selected.
- **📱 Mobile-First Responsive Viewport**: Perfectly auto-fits phone and tablet screens seamlessly without awkward camera dragging or gesture conflicts.
- **📖 In-Game Interactive Codex**: Click the book icon `(?)` anytime during the game for full rule explanations and power guides.

---

## 🚀 Quick Start

### Docker ile tek komut production çalıştırma

Kök dizinde `.env` dosyanızı hazırlayın (`.env.example` örnek olarak kullanılabilir), ardından:

```bash
docker compose up --build -d
```

Client production olarak derlenir ve Node.js sunucusu tarafından API ile Socket.IO'nun yanında aynı origin üzerinden servis edilir. Uygulama varsayılan olarak **http://localhost:3001** adresindedir. Portu değiştirmek için `.env` içindeki `APP_PORT` değerini kullanın.

```bash
# Canlı loglar
docker compose logs -f rey

# Kapatma
docker compose down
```

Kamera ile QR okutma production ortamında HTTPS gerektirir. İnternete açık kurulumda container'ın önüne TLS sonlandıran bir reverse proxy/load balancer koyun.

### 1. Install Dependencies
```bash
# From the project root:
cd client && npm install
cd ../server && npm install
cd ..
```

### 2. Run in Development Mode
To run both the server (port 3001) and Vite client (port 5173) concurrently:
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser!

### 3. Production Build & Run
To compile the client bundle and start the unified server:
```bash
npm run build
npm start
```
The application will be served at **[http://localhost:3001](http://localhost:3001)**.

### 4. Playing on Local Network / Mobile
To invite friends on your local Wi-Fi:
1. Start the server with `npm start` (or `npm run dev -- --host`).
2. Share your local IP (e.g., `http://192.168.1.X:3001`) or let your friends scan the QR Code displayed on screen!
