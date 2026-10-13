/**
 * Ranks: named tiers of levels. Each rank has its own colours and an
 * `effects` strength (0–5) that the UI turns into sheen, glow, rings,
 * sparks and, at the top, an animated prismatic emblem. Some ranks unlock
 * a tile theme.
 */
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

export type SkinId = 'classic' | 'ocean' | 'sunset' | 'forest' | 'neon' | 'royal' | 'ember' | 'aurora' | 'prism';

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
}

export const SKINS: readonly Skin[] = [
  { id: 'classic', name: 'Classic', minLevel: 1, swatch: ['#22a467', '#eaa92b'] },
  ...RANKS.filter((r) => r.unlocks).map((r): Skin => {
    const meta: Record<Exclude<SkinId, 'classic'>, { name: string; swatch: [string, string]; animated?: boolean }> = {
      ocean: { name: 'Ocean', swatch: ['#0e8fb8', '#f2b65a'] },
      sunset: { name: 'Sunset', swatch: ['#e0533f', '#f7c548'] },
      forest: { name: 'Forest', swatch: ['#2f7d4a', '#c9963a'] },
      neon: { name: 'Neon', swatch: ['#8b5cf6', '#22d3ee'] },
      royal: { name: 'Royal', swatch: ['#c9a227', '#7c3aed'] },
      ember: { name: 'Ember', swatch: ['#dc2626', '#f59e0b'] },
      aurora: { name: 'Aurora', swatch: ['#10b981', '#8b5cf6'], animated: true },
      prism: { name: 'Prism', swatch: ['#ec4899', '#facc15'], animated: true },
    };
    const id = r.unlocks as Exclude<SkinId, 'classic'>;
    return { id, minLevel: r.minLevel, ...meta[id] };
  }),
];

export const skinUnlocked = (skin: SkinId, level: number) => level >= (SKINS.find((s) => s.id === skin)?.minLevel ?? 1);
