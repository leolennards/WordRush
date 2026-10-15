/**
 * Ranks: named tiers of levels. Each rank has its own colours and an
 * `effects` strength (0–5) that the UI turns into sheen, glow, rings,
 * sparks and, at the top, an animated prismatic emblem. Some ranks unlock
 * a tile theme.
 */
import { HALLOWEEN, WINTER, type Season } from './season';

export interface Rank {
  id: string;
  name: string;
  /** First level of this rank. */
  minLevel: number;
  /** Emblem gradient (from → to) and the colour of its number. */
  from: string;
  to: string;
  ink: string;
  /** 0 = plain … 5 = legendary. */
  effects: number;
  /** Tile theme unlocked on reaching this rank. */
  unlocks?: SkinId;
}

export type SkinId =
  | 'classic' | 'mint' | 'candy' | 'lavender'
  | 'ocean' | 'sunset' | 'forest' | 'neon' | 'royal' | 'ember' | 'aurora' | 'prism'
  | ShopSkinId;

/** Tile themes sold in the shop for coins. */
export type ShopSkinId =
  | 'citrus' | 'sakura' | 'berry' | 'arctic' | 'matcha' | 'midnight' | 'retro' | 'coral' | 'cyber'
  | 'galaxy' | 'toxic' | 'lava' | 'vapor' | 'gold' | 'holo' | 'rainbow'
  | 'haunted' | 'candycane';

export const RANKS: readonly Rank[] = [
  { id: 'rookie', name: 'Rookie', minLevel: 1, from: '#9aa1ad', to: '#6b7280', ink: '#ffffff', effects: 0 },
  { id: 'apprentice', name: 'Apprentice', minLevel: 5, from: '#d99a6c', to: '#a0603a', ink: '#ffffff', effects: 0, unlocks: 'ocean' },
  { id: 'wordsmith', name: 'Wordsmith', minLevel: 10, from: '#e4e9f0', to: '#94a3b8', ink: '#1e293b', effects: 1, unlocks: 'sunset' },
  { id: 'lexicon', name: 'Lexicon', minLevel: 20, from: '#fde68a', to: '#d4a017', ink: '#3b2a00', effects: 1, unlocks: 'forest' },
  { id: 'scholar', name: 'Scholar', minLevel: 30, from: '#6ee7b7', to: '#059669', ink: '#022c22', effects: 2, unlocks: 'neon' },
  { id: 'sage', name: 'Sage', minLevel: 40, from: '#93c5fd', to: '#2563eb', ink: '#ffffff', effects: 2 },
  { id: 'virtuoso', name: 'Virtuoso', minLevel: 50, from: '#d8b4fe', to: '#7c3aed', ink: '#ffffff', effects: 3, unlocks: 'royal' },
  { id: 'grandmaster', name: 'Grandmaster', minLevel: 65, from: '#fca5a5', to: '#be123c', ink: '#ffffff', effects: 3, unlocks: 'ember' },
  { id: 'mythic', name: 'Mythic', minLevel: 80, from: '#5eead4', to: '#6d28d9', ink: '#ffffff', effects: 4, unlocks: 'aurora' },
  { id: 'legend', name: 'Wordskiis Legend', minLevel: 100, from: '#fde047', to: '#ec4899', ink: '#ffffff', effects: 5, unlocks: 'prism' },
];

export function rankFor(level: number): { rank: Rank; next: Rank | null; index: number } {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) if (level >= RANKS[i]!.minLevel) index = i;
  return { rank: RANKS[index]!, next: RANKS[index + 1] ?? null, index };
}

export interface Skin {
  id: SkinId;
  name: string;
  /** Level needed to use it. */
  minLevel: number;
  /** Swatch colours for previews: [correct, present]. */
  swatch: [string, string];
  animated?: boolean;
  /** Available to everyone from the start. */
  free?: boolean;
  /** Sold in the shop for this many coins (no level needed). */
  price?: number;
  /** Only on sale at this time of year. */
  season?: Season;
}

export const SKINS: readonly Skin[] = [
  { id: 'classic', name: 'Classic', minLevel: 1, swatch: ['#22a467', '#eaa92b'], free: true },
  { id: 'mint', name: 'Mint', minLevel: 1, swatch: ['#14b8a6', '#fb923c'], free: true },
  { id: 'candy', name: 'Candy', minLevel: 1, swatch: ['#ec4899', '#38bdf8'], free: true },
  { id: 'lavender', name: 'Lavender', minLevel: 1, swatch: ['#7c6cf2', '#f5b945'], free: true },
  ...RANKS.filter((r) => r.unlocks).map((r): Skin => {
    type RankSkin = Exclude<SkinId, 'classic' | 'mint' | 'candy' | 'lavender' | ShopSkinId>;
    const meta: Record<RankSkin, { name: string; swatch: [string, string]; animated?: boolean }> = {
      ocean: { name: 'Ocean', swatch: ['#0e8fb8', '#f2b65a'] },
      sunset: { name: 'Sunset', swatch: ['#e0533f', '#f7c548'] },
      forest: { name: 'Forest', swatch: ['#2f7d4a', '#c9963a'] },
      neon: { name: 'Neon', swatch: ['#8b5cf6', '#22d3ee'] },
      royal: { name: 'Royal', swatch: ['#c9a227', '#7c3aed'] },
      ember: { name: 'Ember', swatch: ['#dc2626', '#f59e0b'] },
      aurora: { name: 'Aurora', swatch: ['#10b981', '#8b5cf6'], animated: true },
      prism: { name: 'Prism', swatch: ['#ec4899', '#facc15'], animated: true },
    };
    const id = r.unlocks as RankSkin;
    return { id, minLevel: r.minLevel, ...meta[id] };
  }),
  { id: 'citrus', name: 'Citrus', minLevel: 1, swatch: ['#65a30d', '#f97316'], price: 400 },
  { id: 'sakura', name: 'Sakura', minLevel: 1, swatch: ['#e85d9a', '#86c27a'], price: 400 },
  { id: 'berry', name: 'Berry Smoothie', minLevel: 1, swatch: ['#9d2b6b', '#f0a1c2'], price: 450 },
  { id: 'arctic', name: 'Arctic', minLevel: 1, swatch: ['#0ea5e9', '#a5b4fc'], price: 500 },
  { id: 'matcha', name: 'Matcha', minLevel: 1, swatch: ['#5f8f3e', '#d9a066'], price: 500 },
  { id: 'midnight', name: 'Midnight Ink', minLevel: 1, swatch: ['#111827', '#94a3b8'], price: 550 },
  { id: 'retro', name: 'Retro', minLevel: 1, swatch: ['#2a9d8f', '#e9c46a'], price: 600 },
  { id: 'coral', name: 'Coral Reef', minLevel: 1, swatch: ['#f43f5e', '#14b8a6'], price: 600 },
  { id: 'cyber', name: 'Cyberpunk', minLevel: 1, swatch: ['#d946ef', '#a3e635'], price: 900 },
  { id: 'galaxy', name: 'Galaxy', minLevel: 1, swatch: ['#6366f1', '#ec4899'], animated: true, price: 1600 },
  { id: 'toxic', name: 'Toxic', minLevel: 1, swatch: ['#84cc16', '#a855f7'], animated: true, price: 1700 },
  { id: 'lava', name: 'Lava Lamp', minLevel: 1, swatch: ['#dc2626', '#f59e0b'], animated: true, price: 1800 },
  { id: 'vapor', name: 'Vaporwave', minLevel: 1, swatch: ['#ec4899', '#22d3ee'], animated: true, price: 1900 },
  { id: 'gold', name: 'Solid Gold', minLevel: 1, swatch: ['#d4a017', '#9ca3af'], animated: true, price: 2200 },
  { id: 'holo', name: 'Hologram', minLevel: 1, swatch: ['#a5f3fc', '#f0abfc'], animated: true, price: 2600 },
  { id: 'rainbow', name: 'Rainbow', minLevel: 1, swatch: ['#ef4444', '#3b82f6'], animated: true, price: 3000 },
  { id: 'haunted', name: 'Haunted', minLevel: 1, swatch: ['#f97316', '#7c3aed'], animated: true, price: 1200, season: HALLOWEEN },
  { id: 'candycane', name: 'Candy Cane', minLevel: 1, swatch: ['#dc2626', '#16a34a'], animated: true, price: 1200, season: WINTER },
];

/** Whether a tile theme can be used: free, reached by rank, or bought in the shop. */
export function skinUnlocked(skin: SkinId, level: number, owned: readonly string[] = []): boolean {
  const s = SKINS.find((x) => x.id === skin);
  if (!s) return false;
  if (s.price !== undefined) return owned.includes(`skin:${s.id}`);
  return level >= s.minLevel;
}
