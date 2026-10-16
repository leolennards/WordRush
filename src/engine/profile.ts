/**
 * Profile pictures: your initial, a Tile Pal (a little letter-tile character)
 * or a small photo, on a colour of your choice. Shown to friends with your
 * frame, badge, title and banner.
 */

export type PalFace = 'happy' | 'joy' | 'wink' | 'cool' | 'wow' | 'sleepy' | 'cheeky' | 'starry' | 'love' | 'calm';
export type PalExtra = 'none' | 'sprout' | 'crown' | 'bow' | 'cap' | 'halo' | 'headphones' | 'moon' | 'sparkles';

export interface TilePal {
  id: string;
  name: string;
  face: PalFace;
  /** One colour, or two for a shimmering gradient. */
  color: string | [string, string];
  extra: PalExtra;
  /** A level reward (free for everyone otherwise). */
  level?: number;
}

/** Tile Pals: little letter tiles with faces, to use as your picture. */
export const TILE_PALS: readonly TilePal[] = [
  { id: 't1', name: 'Sunny', face: 'happy', color: '#f5b83d', extra: 'none' },
  { id: 't2', name: 'Sprout', face: 'joy', color: '#34b77a', extra: 'sprout' },
  { id: 't3', name: 'Berry', face: 'love', color: '#ec5c9c', extra: 'bow' },
  { id: 't4', name: 'Bluey', face: 'wink', color: '#3aa7e8', extra: 'none' },
  { id: 't5', name: 'Shades', face: 'cool', color: '#5b6b85', extra: 'none' },
  { id: 't6', name: 'Grape', face: 'starry', color: '#8b6cf0', extra: 'none' },
  { id: 't7', name: 'Minty', face: 'calm', color: '#2cc4b0', extra: 'none' },
  { id: 't8', name: 'Peachy', face: 'cheeky', color: '#f7826b', extra: 'none' },
  { id: 't9', name: 'Dozy', face: 'sleepy', color: '#a99bf5', extra: 'moon' },
  { id: 't10', name: 'Beats', face: 'happy', color: '#5a6ff0', extra: 'headphones' },
  { id: 't11', name: 'Zest', face: 'wow', color: '#8fcb3a', extra: 'none' },
  { id: 't12', name: 'Captain', face: 'joy', color: '#ef5a5a', extra: 'cap' },
  { id: 't13', name: 'Angel', face: 'calm', color: '#8fd0f2', extra: 'halo', level: 8 },
  { id: 't14', name: 'Royal', face: 'happy', color: ['#7c3aed', '#db2777'], extra: 'crown', level: 40 },
  { id: 't15', name: 'Legend', face: 'starry', color: ['#22d3ee', '#e879f9'], extra: 'sparkles', level: 100 },
];

export const tilePal = (id: unknown) => TILE_PALS.find((p) => p.id === id) ?? null;
export const isTilePal = (s: unknown): s is string => tilePal(s) !== null;
export const palUnlocked = (id: string, level: number) => {
  const p = tilePal(id);
  return p !== null && (p.level === undefined || level >= p.level);
};

export type AvatarTint = 'auto' | 'mint' | 'sky' | 'grape' | 'rose' | 'sun' | 'slate' | 'rainbow';

/** Background colours for your picture ("auto" picks one from your id). */
export const TINTS: readonly { id: AvatarTint; name: string; css: string }[] = [
  { id: 'auto', name: 'Automatic', css: '' },
  { id: 'mint', name: 'Mint', css: '#22a467' },
  { id: 'sky', name: 'Sky', css: '#0ea5e9' },
  { id: 'grape', name: 'Grape', css: '#7c3aed' },
  { id: 'rose', name: 'Rose', css: '#e0457b' },
  { id: 'sun', name: 'Sunshine', css: '#f59e0b' },
  { id: 'slate', name: 'Slate', css: '#475569' },
  { id: 'rainbow', name: 'Rainbow', css: 'conic-gradient(#ef4444, #f59e0b, #22c55e, #0ea5e9, #8b5cf6, #ef4444)' },
];

/** Largest photo we keep, as a data URL (about 12 KB of JPEG). */
export const PHOTO_MAX = 16000;
const PHOTO_RE = /^data:image\/(jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export const isPhotoData = (s: unknown): s is string => typeof s === 'string' && s.length <= PHOTO_MAX && PHOTO_RE.test(s);
