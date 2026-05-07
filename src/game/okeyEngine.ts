/**
 * OkeyEngine - Turkish Rummy with tiles (cards as tiles) for 2-4 players
 * Uses Spanish 40-card deck doubled (80 tiles total)
 *
 * Rules:
 * - 40 cards x 2 = 80 tiles
 * - Deal 14 cards each (15 to first player)
 * - Draw from pile, discard one card each turn
 * - Goal: form sets (3+ same value, different suits) or runs (3+ consecutive, same suit)
 * - First player to form all cards into valid groups wins
 * - Joker: a random card is designated as wild card
 */

// ============================================================
// TYPES
// ============================================================

export type Suit = 'bastos' | 'copas' | 'espadas' | 'oros';
export type CardValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

export interface Card {
  suit: Suit;
  value: CardValue;
  id: string; // e.g. "07-copas" or "07-copas-2" for the duplicate
  isJoker?: boolean;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isBot: boolean;
}

export type GamePhase =
  | 'waiting'
  | 'drawing'
  | 'discarding'
  | 'winning'
  | 'game_over';

export interface GameState {
  phase: GamePhase;
  players: Player[];
  drawPile: Card[];
  discardPile: Card[];
  jokerCard: Card; // The card designated as joker (wild)
  currentPlayerIndex: number;
  roundNumber: number;
  winnerId: string | null;
  lastAction: string;
  hasDrawn: boolean; // Has the current player drawn this turn?
}

export type GameAction =
  | { type: 'JOIN'; playerId: string; playerName: string; isBot?: boolean }
  | { type: 'START_GAME' }
  | { type: 'DRAW_FROM_PILE'; playerId: string }
  | { type: 'DRAW_FROM_DISCARD'; playerId: string }
  | { type: 'DISCARD'; playerId: string; cardId: string }
  | { type: 'DECLARE_WIN'; playerId: string }
  | { type: 'NEW_ROUND' }
  | { type: 'RESET' };

// ============================================================
// CONSTANTS
// ============================================================

export const SUITS: Suit[] = ['bastos', 'copas', 'espadas', 'oros'];
export const VALUES: CardValue[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const INITIAL_HAND_SIZE = 14;
export const FIRST_PLAYER_HAND_SIZE = 15;

// Sequential values for run detection
const SEQ_MAP: Record<CardValue, number> = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 10: 8, 11: 9, 12: 10,
};

const REVERSE_SEQ: Record<number, CardValue> = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 10, 9: 11, 10: 12,
};

export const SUIT_NAMES: Record<Suit, string> = {
  bastos: 'Clubs',
  copas: 'Cups',
  espadas: 'Swords',
  oros: 'Coins',
};

export const VALUE_NAMES: Record<CardValue, string> = {
  1: 'As', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  10: 'Sota', 11: 'Caballo', 12: 'Rey',
};

// ============================================================
// DECK
// ============================================================

/** Create doubled deck (80 cards) */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let copy = 0; copy < 2; copy++) {
    for (const suit of SUITS) {
      for (const value of VALUES) {
        const valueStr = value.toString().padStart(2, '0');
        const suffix = copy === 0 ? '' : '-2';
        deck.push({
          suit,
          value,
          id: `${valueStr}-${suit}${suffix}`,
        });
      }
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Pick a random joker card */
function pickJoker(deck: Card[]): Card {
  const idx = Math.floor(Math.random() * deck.length);
  return { ...deck[idx] };
}

/** Mark cards matching the joker as jokers */
function markJokers(cards: Card[], jokerCard: Card): Card[] {
  return cards.map((c) => ({
    ...c,
    isJoker: c.value === jokerCard.value && c.suit === jokerCard.suit,
  }));
}

// ============================================================
// GROUPING VALIDATION
// ============================================================

/** Check if a group of cards forms a valid set (same value, different suits) */
function isValidSet(cards: Card[]): boolean {
  if (cards.length < 3) return false;
  const nonJokers = cards.filter((c) => !c.isJoker);
  const jokerCount = cards.length - nonJokers.length;

  if (nonJokers.length === 0) return cards.length >= 3;

  const targetValue = nonJokers[0].value;
  const suits = new Set<Suit>();

  for (const c of nonJokers) {
    if (c.value !== targetValue) return false;
    if (suits.has(c.suit)) return false; // Duplicate suit
    suits.add(c.suit);
  }

  return suits.size + jokerCount <= 4; // Max 4 suits
}

/** Check if a group of cards forms a valid run (consecutive values, same suit) */
function isValidRun(cards: Card[]): boolean {
  if (cards.length < 3) return false;
  const nonJokers = cards.filter((c) => !c.isJoker);
  const jokerCount = cards.length - nonJokers.length;

  if (nonJokers.length === 0) return cards.length >= 3;

  const suit = nonJokers[0].suit;
  if (!nonJokers.every((c) => c.suit === suit)) return false;

  const seqValues = nonJokers.map((c) => SEQ_MAP[c.value]).sort((a, b) => a - b);

  // Check for duplicates
  for (let i = 1; i < seqValues.length; i++) {
    if (seqValues[i] === seqValues[i - 1]) return false;
  }

  // Count gaps that need to be filled by jokers
  let gapsNeeded = 0;
  for (let i = 1; i < seqValues.length; i++) {
    gapsNeeded += seqValues[i] - seqValues[i - 1] - 1;
  }

  return gapsNeeded <= jokerCount;
}

/** Check if a group is valid (either set or run) */
export function isValidGroup(cards: Card[]): boolean {
  return isValidSet(cards) || isValidRun(cards);
}

/**
 * Check if a hand can be fully decomposed into valid groups.
 * Uses backtracking to try all possible groupings.
 */
export function canFormValidHand(hand: Card[]): boolean {
  if (hand.length === 0) return true;
  if (hand.length < 3) return false;

  // Try to find any valid grouping
  return tryGrouping(hand, []);
}

function tryGrouping(remaining: Card[], groups: Card[][]): boolean {
  if (remaining.length === 0) return true;
  if (remaining.length < 3) return false;

  // Try all possible groups of size 3 to remaining.length
  for (let size = 3; size <= remaining.length; size++) {
    const combos = getCombinations(remaining, size);
    for (const combo of combos) {
      if (isValidGroup(combo)) {
        const rest = remaining.filter((c) => !combo.includes(c));
        if (tryGrouping(rest, [...groups, combo])) {
          return true;
        }
      }
    }
  }

  return false;
}

function getCombinations(arr: Card[], size: number): Card[][] {
  if (size === 0) return [[]];
  if (arr.length < size) return [];

  const results: Card[][] = [];
  const first = arr[0];
  const rest = arr.slice(1);

  // Include first element
  for (const combo of getCombinations(rest, size - 1)) {
    results.push([first, ...combo]);
  }
  // Exclude first element
  for (const combo of getCombinations(rest, size)) {
    results.push(combo);
  }

  // Limit combinations to prevent exponential blowup
  if (results.length > 500) return results.slice(0, 500);

  return results;
}

// ============================================================
// BOT AI
// ============================================================

export function botPlay(state: GameState): GameAction | null {
  const player = state.players[state.currentPlayerIndex];
  if (!player || !player.isBot) return null;

  if (state.phase === 'drawing') {
    // Prefer draw pile, occasionally take discard
    if (state.discardPile.length > 0 && Math.random() > 0.7) {
      const topDiscard = state.discardPile[state.discardPile.length - 1];
      // Check if discard card would help
      if (wouldCardHelp(player.hand, topDiscard)) {
        return { type: 'DRAW_FROM_DISCARD', playerId: player.id };
      }
    }
    return { type: 'DRAW_FROM_PILE', playerId: player.id };
  }

  if (state.phase === 'discarding') {
    // Check if we can win
    if (canFormValidHand(player.hand)) {
      return { type: 'DECLARE_WIN', playerId: player.id };
    }

    // Discard the least useful card
    const cardToDiscard = findLeastUsefulCard(player.hand);
    return { type: 'DISCARD', playerId: player.id, cardId: cardToDiscard.id };
  }

  return null;
}

function wouldCardHelp(hand: Card[], card: Card): boolean {
  // Check if adding this card creates any new pairs or potential groups
  const sameValue = hand.filter((c) => c.value === card.value);
  if (sameValue.length >= 2) return true; // Would complete a set

  const sameSuit = hand
    .filter((c) => c.suit === card.suit)
    .map((c) => SEQ_MAP[c.value]);
  const cardSeq = SEQ_MAP[card.value];

  // Check if it extends a run
  for (const v of sameSuit) {
    if (Math.abs(v - cardSeq) === 1) return true;
  }

  return false;
}

function findLeastUsefulCard(hand: Card[]): Card {
  // Never discard jokers
  const nonJokers = hand.filter((c) => !c.isJoker);
  if (nonJokers.length === 0) return hand[0]; // All jokers, discard any

  let leastUseful = nonJokers[0];
  let lowestScore = Infinity;

  for (const card of nonJokers) {
    let score = 0;
    // Count same-value cards (potential sets)
    score += hand.filter((c) => c !== card && c.value === card.value).length * 3;
    // Count adjacent same-suit cards (potential runs)
    const cardSeq = SEQ_MAP[card.value];
    score += hand.filter(
      (c) => c !== card && c.suit === card.suit && Math.abs(SEQ_MAP[c.value] - cardSeq) <= 2
    ).length * 2;

    if (score < lowestScore) {
      lowestScore = score;
      leastUseful = card;
    }
  }

  return leastUseful;
}

// ============================================================
// GAME STATE
// ============================================================

export function initGame(): GameState {
  return {
    phase: 'waiting',
    players: [],
    drawPile: [],
    discardPile: [],
    jokerCard: { suit: 'bastos', value: 1, id: '01-bastos' },
    currentPlayerIndex: 0,
    roundNumber: 0,
    winnerId: null,
    lastAction: '',
    hasDrawn: false,
  };
}

function dealGame(state: GameState): GameState {
  const baseDeck = createDeck();
  const jokerCard = pickJoker(baseDeck);
  let deck = shuffleDeck(baseDeck);
  deck = markJokers(deck, jokerCard);

  let deckIndex = 0;
  const players = state.players.map((p, i) => {
    const handSize = i === 0 ? FIRST_PLAYER_HAND_SIZE : INITIAL_HAND_SIZE;
    const hand = deck.slice(deckIndex, deckIndex + handSize);
    deckIndex += handSize;
    return { ...p, hand };
  });

  const drawPile = deck.slice(deckIndex);

  return {
    ...state,
    phase: 'discarding', // First player has 15 cards, must discard first
    players,
    drawPile,
    discardPile: [],
    jokerCard,
    currentPlayerIndex: 0,
    roundNumber: state.roundNumber + 1,
    winnerId: null,
    lastAction: `Cards dealt! Joker: ${VALUE_NAMES[jokerCard.value]} de ${SUIT_NAMES[jokerCard.suit]}`,
    hasDrawn: true, // First player already has their extra card
  };
}

export function getWinner(state: GameState): { winnerId: string; description: string } | null {
  if (state.winnerId) {
    const winner = state.players.find((p) => p.id === state.winnerId);
    return winner
      ? { winnerId: winner.id, description: `${winner.name} completed all groups!` }
      : null;
  }
  return null;
}

// ============================================================
// REDUCER
// ============================================================

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'JOIN': {
      if (state.phase !== 'waiting') return state;
      if (state.players.length >= MAX_PLAYERS) return state;
      if (state.players.find((p) => p.id === action.playerId)) return state;
      return {
        ...state,
        players: [
          ...state.players,
          {
            id: action.playerId,
            name: action.playerName,
            hand: [],
            isBot: action.isBot || false,
          },
        ],
      };
    }

    case 'START_GAME': {
      if (state.players.length < MIN_PLAYERS) return state;
      return dealGame(state);
    }

    case 'DRAW_FROM_PILE': {
      if (state.phase !== 'drawing') return state;
      const pi = state.players.findIndex((p) => p.id === action.playerId);
      if (pi !== state.currentPlayerIndex) return state;
      if (state.drawPile.length === 0) {
        // Reshuffle discard pile
        if (state.discardPile.length === 0) return state; // No cards at all
        const newDraw = shuffleDeck(state.discardPile.slice(0, -1));
        const topDiscard = state.discardPile[state.discardPile.length - 1];
        const drawn = newDraw[0];
        const updatedPlayers = [...state.players];
        updatedPlayers[pi] = {
          ...updatedPlayers[pi],
          hand: [...updatedPlayers[pi].hand, drawn],
        };
        return {
          ...state,
          phase: 'discarding',
          players: updatedPlayers,
          drawPile: newDraw.slice(1),
          discardPile: [topDiscard],
          hasDrawn: true,
          lastAction: `${updatedPlayers[pi].name} draws from pile`,
        };
      }

      const drawn = state.drawPile[0];
      const updatedPlayers = [...state.players];
      updatedPlayers[pi] = {
        ...updatedPlayers[pi],
        hand: [...updatedPlayers[pi].hand, drawn],
      };

      return {
        ...state,
        phase: 'discarding',
        players: updatedPlayers,
        drawPile: state.drawPile.slice(1),
        hasDrawn: true,
        lastAction: `${updatedPlayers[pi].name} draws from pile`,
      };
    }

    case 'DRAW_FROM_DISCARD': {
      if (state.phase !== 'drawing') return state;
      const pi = state.players.findIndex((p) => p.id === action.playerId);
      if (pi !== state.currentPlayerIndex) return state;
      if (state.discardPile.length === 0) return state;

      const drawn = state.discardPile[state.discardPile.length - 1];
      const updatedPlayers = [...state.players];
      updatedPlayers[pi] = {
        ...updatedPlayers[pi],
        hand: [...updatedPlayers[pi].hand, drawn],
      };

      return {
        ...state,
        phase: 'discarding',
        players: updatedPlayers,
        discardPile: state.discardPile.slice(0, -1),
        hasDrawn: true,
        lastAction: `${updatedPlayers[pi].name} takes from discard`,
      };
    }

    case 'DISCARD': {
      if (state.phase !== 'discarding') return state;
      const pi = state.players.findIndex((p) => p.id === action.playerId);
      if (pi !== state.currentPlayerIndex) return state;

      const cardIdx = state.players[pi].hand.findIndex((c) => c.id === action.cardId);
      if (cardIdx === -1) return state;

      const card = state.players[pi].hand[cardIdx];
      const updatedPlayers = [...state.players];
      const newHand = [...state.players[pi].hand];
      newHand.splice(cardIdx, 1);
      updatedPlayers[pi] = { ...updatedPlayers[pi], hand: newHand };

      const nextPlayer = (pi + 1) % state.players.length;

      return {
        ...state,
        phase: 'drawing',
        players: updatedPlayers,
        discardPile: [...state.discardPile, card],
        currentPlayerIndex: nextPlayer,
        hasDrawn: false,
        lastAction: `${updatedPlayers[pi].name} discards ${VALUE_NAMES[card.value]} de ${SUIT_NAMES[card.suit]}`,
      };
    }

    case 'DECLARE_WIN': {
      if (state.phase !== 'discarding') return state;
      const pi = state.players.findIndex((p) => p.id === action.playerId);
      if (pi !== state.currentPlayerIndex) return state;

      // Validate that the hand can form valid groups
      if (!canFormValidHand(state.players[pi].hand)) {
        return {
          ...state,
          lastAction: `${state.players[pi].name} tried to declare but hand is not valid!`,
        };
      }

      return {
        ...state,
        phase: 'winning',
        winnerId: state.players[pi].id,
        lastAction: `${state.players[pi].name} wins! All groups complete!`,
      };
    }

    case 'NEW_ROUND': {
      if (state.phase !== 'winning' && state.phase !== 'game_over') return state;
      return dealGame({
        ...state,
        players: state.players.map((p) => ({ ...p, hand: [] })),
      });
    }

    case 'RESET': {
      return initGame();
    }

    default:
      return state;
  }
}

// ============================================================
// HELPERS
// ============================================================

export function formatCard(card: Card): string {
  const jokerLabel = card.isJoker ? ' (JOKER)' : '';
  return `${VALUE_NAMES[card.value]} de ${SUIT_NAMES[card.suit]}${jokerLabel}`;
}

export function createBots(count: number): GameAction[] {
  const names = ['Mehmet', 'Ayse', 'Kemal'];
  return Array.from({ length: Math.min(count, names.length) }, (_, i) => ({
    type: 'JOIN' as const,
    playerId: `bot-${i + 1}`,
    playerName: names[i],
    isBot: true,
  }));
}

export function getCurrentPlayer(state: GameState): Player | null {
  return state.players[state.currentPlayerIndex] || null;
}

export function isPlayerTurn(state: GameState, playerId: string): boolean {
  return getCurrentPlayer(state)?.id === playerId;
}

/** Get the display ID for card image lookup (strip the "-2" suffix) */
export function getCardDisplayId(card: Card): string {
  return card.id.replace(/-2$/, '');
}

/**
 * Détection de blocage Okey :
 *  - drawPile (talon) ET discardPile (défausse) tous vides
 *  - ET aucun joueur n'a une main pouvant former une sortie valide
 *  → match nul forcé, redistribution.
 */
export function isStuck(state: GameState): boolean {
  if (state.phase !== 'playing' && state.phase !== 'PLAYING' as any) {
    // we accept multiple phase enums depending on engine version
    if (state.phase === 'gameOver' || state.phase === 'GAME_OVER' as any) return false;
  }
  if (state.drawPile.length > 0 || state.discardPile.length > 0) return false;
  return state.players.every((p) => !canFormValidHand(p.hand));
}
