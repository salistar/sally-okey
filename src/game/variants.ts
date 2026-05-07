/**
 * @file variants.ts — Catalogue de toutes les variantes Okey (jeu turc).
 * Multi >1 joueur : socket+STUN/TURN+Jitsi via /room/create. Solo vs-ai sans socket.
 */

export type VariantKey =
  | 'okey-classic-4p' | 'okey-3p' | 'okey-pairs-2v2'
  | 'cift-okey' | 'okey-101' | 'okey-pisti' | 'okey-no-stock'
  | 'vs-ai';

export interface Variant {
  key: VariantKey;
  engine: 'okey' | 'cift-okey' | 'okey-101' | 'pisti' | 'no-stock' | 'vs-ai';
  emoji: string;
  name: string;
  shortDesc: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  winRate: string;
  duration: string;
  cards: number;          // tuiles
  rules: { title: string; body: string }[];
  available: boolean;
  options?: {
    players?: 2 | 3 | 4;
    teams?: boolean;
    targetScore?: number;
    multi?: boolean;
    pairsOnly?: boolean;       // çift okey
    threshold?: number;        // okey 101 (51 pour ouvrir)
    pisti?: boolean;
    noStock?: boolean;
  };
}

export const VARIANTS: Variant[] = [
  {
    key: 'okey-classic-4p', engine: 'okey', emoji: '🀄', name: 'Okey Classique',
    shortDesc: '4 joueurs chacun pour soi, sortie 14 tuiles.',
    difficulty: 4, winRate: '~25%', duration: '~30 min', cards: 106, available: true,
    options: { players: 4, multi: true },
    rules: [
      { title: 'Vue d\'ensemble', body: '4 joueurs chacun pour soi (kahvehane standard). Antihoraire.' },
      { title: 'Tuiles', body: '106 tuiles : 4 couleurs (rouge, jaune, noir, bleu) × 13 valeurs × 2 + 2 jokers (Sahte Okey).' },
      { title: 'Distribution', body: '14 tuiles par joueur, 15 pour le donneur. 49 tuiles dans la pioche centrale.' },
      { title: 'Tuile Okey', body: 'Le donneur retourne une tuile (Gösterge). La SUIVANTE en valeur dans la même couleur devient l\'Okey de la manche.' },
      { title: 'Sahte Okey', body: 'Les 2 jokers physiques jouent comme jokers universels.' },
      { title: 'Tour de jeu', body: '1) Pioche 1 tuile (talon ou défausse de droite). 2) Défausse 1 tuile à ta droite (visible).' },
      { title: 'Per (suite)', body: '3+ tuiles même couleur, valeurs consécutives.' },
      { title: 'Set (brelan/carré)', body: '3-4 tuiles même valeur, couleurs différentes.' },
      { title: 'Sortie', body: 'Quand tes 14 tuiles forment des combinaisons valides : annonce "Okey !" et révèle.' },
      { title: 'Sortie avec Okey', body: 'Si tu utilises la vraie Okey dans ta sortie = points × 2.' },
      { title: 'Décompte', body: 'Gagnant +1 (×2 ou ×4 si Okey/Çift). Perdants : somme des valeurs des tuiles restantes en pénalité.' },
      { title: 'Victoire', body: 'Premier à 101 points (ou format choisi).' },
    ],
  },
  {
    key: 'okey-3p', engine: 'okey', emoji: '👥', name: 'Okey 3 joueurs',
    shortDesc: 'Variante 3 joueurs, 14 tuiles chacun.',
    difficulty: 4, winRate: '~33%', duration: '~25 min', cards: 106, available: true,
    options: { players: 3, multi: true },
    rules: [
      { title: 'Différence', body: '3 joueurs au lieu de 4. Distribution similaire (14 tuiles, donneur 15).' },
      { title: 'Stratégie', body: 'Plus de tuiles dans la pioche = plus d\'incertitude.' },
    ],
  },
  {
    key: 'okey-pairs-2v2', engine: 'okey', emoji: '🤝', name: 'Okey 2v2 Équipes',
    shortDesc: '4 joueurs en 2 équipes face-à-face.',
    difficulty: 4, winRate: '~50%', duration: '~30 min', cards: 106, available: true,
    options: { players: 4, teams: true, multi: true },
    rules: [
      { title: 'Mode équipe', body: '4 joueurs en 2 équipes de 2, partenaires face-à-face.' },
      { title: 'Score', body: 'Cumul d\'équipe.' },
    ],
  },
  {
    key: 'cift-okey', engine: 'cift-okey', emoji: '👯', name: 'Çift Okey (Doublé)',
    shortDesc: 'Sortie en paires uniquement (7 paires) — points × 4.',
    difficulty: 5, winRate: '~10%', duration: '~30 min', cards: 106, available: true,
    options: { players: 4, pairsOnly: true, multi: true },
    rules: [
      { title: 'Mode', body: 'Sortie spéciale : uniquement 7 paires (2 tuiles identiques × 7 = 14 tuiles).' },
      { title: 'Bonus', body: 'Très rare et très puissant : points × 4.' },
      { title: 'Stratégie', body: 'Conserve toutes les paires possibles. Très difficile à réaliser.' },
    ],
  },
  {
    key: 'okey-101', engine: 'okey-101', emoji: '💯', name: 'Okey 101',
    shortDesc: 'Très populaire en ligne. Seuil 51 pts en combinaisons d\'abord.',
    difficulty: 5, winRate: '~25%', duration: '~45 min', cards: 106, available: true,
    options: { players: 4, targetScore: 101, threshold: 51, multi: true },
    rules: [
      { title: 'Mode unique', body: 'Pour ta première sortie, tu dois avoir au moins 51 points en combinaisons.' },
      { title: 'Combinaisons posées', body: 'Tu poses tes Per/Set sur la table (visibles), au lieu de garder en main jusqu\'à la fin.' },
      { title: 'Objectif', body: 'Premier à 101 points.' },
    ],
  },
  {
    key: 'okey-pisti', engine: 'pisti', emoji: '🎯', name: 'Okey Pişti',
    shortDesc: 'Bonus +5 pts si tu prends la défausse immédiatement.',
    difficulty: 4, winRate: '~25%', duration: '~30 min', cards: 106, available: true,
    options: { players: 4, pisti: true, multi: true },
    rules: [
      { title: 'Règle Pişti', body: 'Quand un joueur défausse une tuile et un autre la prend immédiatement → "Pişti" (= "cuit").' },
      { title: 'Bonus', body: '+5 points pour celui qui prend.' },
      { title: 'Stratégie', body: 'Être attentif aux défausses adverses pour saisir les opportunités.' },
    ],
  },
  {
    key: 'okey-no-stock', engine: 'no-stock', emoji: '⚡', name: 'Okey Sans Pioche',
    shortDesc: 'Pas de pioche centrale, uniquement défausse de droite. Très rapide.',
    difficulty: 3, winRate: '~25%', duration: '~15 min', cards: 106, available: true,
    options: { players: 4, noStock: true, multi: true },
    rules: [
      { title: 'Différence', body: 'Pas de pioche centrale. On prend uniquement la défausse de droite.' },
      { title: 'Rythme', body: 'Très rapide, parties courtes.' },
    ],
  },
  {
    key: 'vs-ai', engine: 'vs-ai', emoji: '🤖', name: 'Solo vs IA',
    shortDesc: 'Solo contre 3 IA — entraînement sans socket.',
    difficulty: 3, winRate: '~30%', duration: '~25 min', cards: 106, available: true,
    options: { players: 4 },
    rules: [
      { title: 'Mode', body: 'Solo : tu joues contre 3 IA en mode chacun pour soi.' },
      { title: 'IA', body: 'Stratégie : optimise les Per/Set, conserve les jokers (Okey + Sahte), surveille la défausse adverse.' },
      { title: 'Hors-ligne', body: 'Pas de socket, idéal pour s\'entraîner.' },
    ],
  },
];

export const AVAILABLE_VARIANTS = VARIANTS.filter((v) => v.available);
export function findVariant(key: string): Variant | undefined {
  return VARIANTS.find((v) => v.key === key);
}
