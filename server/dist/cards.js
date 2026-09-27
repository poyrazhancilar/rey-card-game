// Exactly 32 cards total for Rey with swap and Kamikaze distribution.
export const REY_CARD_DEFINITIONS = [
    { value: 0, ability: 'none', name: 'Kral Rey', flavor: 'Saf sıfır; Rey destesi ruhunun en hafif kartı.', count: 2 },
    { value: 1, ability: 'none', name: 'Muhafız', flavor: 'Sessiz ve sadık bekçi (1 puan).', count: 2 },
    { value: 2, ability: 'none', name: 'Çırak Büyücü', flavor: 'Hafif adımlarla ilerleyen zihin ustası (2 puan).', count: 2 },
    { value: 3, ability: 'none', name: 'Gezgin', flavor: 'Yolunu bilen hızlı seyyah (3 puan).', count: 2 },
    { value: 4, ability: 'none', name: 'Orman Avcısı', flavor: 'Hedefini şaşmayan okçu (4 puan).', count: 2 },
    { value: 5, ability: 'none', name: 'Şövalye', flavor: 'Sağlam zırhlı saray muhafızı (5 puan).', count: 2 },
    { value: 6, ability: 'none', name: 'İkiz Büyücü', flavor: 'Zihin ustası ikiz (6 puan).', count: 2 },
    { value: 7, ability: 'none', name: 'Simyacı', flavor: 'Dengeli ve sade bir sayı kartı (7 puan).', count: 2 },
    { value: 8, ability: 'none', name: 'Gözcü', flavor: 'Dengeli ve sade bir sayı kartı (8 puan).', count: 2 },
    { value: 9, ability: 'none', name: 'Casus', flavor: 'Dengeli ve sade bir sayı kartı (9 puan).', count: 2 },
    { value: 10, ability: 'none', name: 'Karanlık Gölge', flavor: 'Dengeli ve sade bir sayı kartı (10 puan).', count: 2 },
    { value: 11, ability: 'swap', name: 'Ejder Lordu', flavor: 'Takas (Swap): Rakibinle 1 kart takas et.', count: 2 },
    { value: 12, ability: 'swap', name: 'Titan', flavor: 'Takas (Swap) & Kamikaze: Rakiple 1 kart takas et. Tam olarak 12, 12, 13, 13 maçı kazandırır!', count: 4 },
    { value: 13, ability: 'none', name: 'Kaos Lordu', flavor: 'Kamikaze: Tam olarak 12, 12, 13, 13 maçı anında kazandırır! (13 puan).', count: 4 },
];
export function createAdminCard(value) {
    const definition = REY_CARD_DEFINITIONS.find((card) => card.value === value);
    if (!definition)
        throw new Error('Geçersiz kart değeri');
    return {
        id: `admin_${value}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        value: definition.value,
        ability: definition.ability,
        name: definition.name,
        flavor: definition.flavor,
        isRevealed: false,
    };
}
export function createDeck() {
    const deck = [];
    let seq = 1;
    for (const def of REY_CARD_DEFINITIONS) {
        for (let i = 0; i < def.count; i++) {
            deck.push({
                id: `rey_${def.value}_${seq++}`,
                value: def.value,
                ability: def.ability,
                name: def.name,
                flavor: def.flavor,
                isRevealed: false,
            });
        }
    }
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}
function chance(percent) {
    return Math.random() * 100 < percent;
}
function rollPowerLevel() {
    const total = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4) + 1)
        .reduce((sum, value) => sum + value, 0);
    if (total <= 8)
        return 1;
    if (total <= 10)
        return 2;
    return 3;
}
function createPower(family, slot) {
    if (family === 'swap') {
        return {
            id: `pow_slot_${slot}_swap_all`,
            type: 'swap_all',
            level: 1,
            title: 'El Değiştirme',
            description: 'Rakibinle bütün elini değiştir.',
            icon: 'ArrowLeftRight',
        };
    }
    const level = rollPowerLevel();
    if (family === 'peek') {
        const descriptions = {
            1: 'Kendi kartlarından bir tanesini gör.',
            2: 'Kendi kartlarından iki tanesini gör.',
            3: 'Bütün kartlarını ve sonraki çekeceğin kartı gör.',
        };
        return {
            id: `pow_slot_${slot}_peek_${level}`,
            type: `peek_${level}`,
            level,
            title: `Röntgen (Seviye ${level})`,
            description: descriptions[level],
            icon: level === 3 ? 'Flame' : level === 2 ? 'Sparkles' : 'Eye',
        };
    }
    const descriptions = {
        1: 'Rakibinin bir kartını gör.',
        2: 'Rakibinin iki kartını gör.',
        3: 'Rakibinin bütün kartlarını gör.',
    };
    return {
        id: `pow_slot_${slot}_spy_${level}`,
        type: `spy_${level}`,
        level,
        title: `Casusluk (Seviye ${level})`,
        description: descriptions[level],
        icon: level === 3 ? 'Flame' : 'Radio',
    };
}
function resolveSlot(candidates) {
    const appeared = candidates.filter((candidate) => chance(candidate.probability));
    if (appeared.length === 0)
        return null;
    const highestProbability = Math.max(...appeared.map((candidate) => candidate.probability));
    const strongest = appeared.filter((candidate) => candidate.probability === highestProbability);
    return strongest[Math.floor(Math.random() * strongest.length)].family;
}
// Probability rules intentionally stay on the server. Clients only receive occupied slots.
export function generateSpecialPowerSlots() {
    const powers = [];
    const slot1 = resolveSlot([
        { family: 'peek', probability: 51 },
        { family: 'spy', probability: 50 },
    ]);
    if (slot1)
        powers.push(createPower(slot1, 1));
    const slot2 = resolveSlot([
        { family: 'peek', probability: slot1 === 'peek' ? 5 : 45 },
        { family: 'spy', probability: slot1 === 'spy' ? 5 : 51 },
        { family: 'swap', probability: 5 },
    ]);
    if (slot2)
        powers.push(createPower(slot2, 2));
    const slot3 = resolveSlot([{ family: 'swap', probability: 27 }]);
    if (slot3)
        powers.push(createPower(slot3, 3));
    return powers;
}
