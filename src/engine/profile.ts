/**
 * Profile pictures: your initial, a Tile Pal (a little letter-tile character)
 * or a small photo, on a colour of your choice. Shown to friends with your
 * frame, badge, title and banner.
 */

export type PalShape = 'tile' | 'round' | 'hex' | 'cloud';
export type PalFace =
  | 'smile' | 'grin' | 'wink' | 'cool' | 'wow' | 'sleepy' | 'cheeky' | 'starry' | 'love' | 'calm' | 'determined' | 'laugh';
export type PalExtra = 'none' | 'sprout' | 'crown' | 'bow' | 'cap' | 'antenna' | 'halo' | 'headphones' | 'sparkles';

export interface TilePal {
  id: string;
  name: string;
  shape: PalShape;
  face: PalFace;
  /** One colour, or two for a gradient. */
  color: string | [string, string];
  extra: PalExtra;
  /** A level reward (free for everyone otherwise). */
  level?: number;
}

/** Tile Pals you can use as your picture. */
export const TILE_PALS: readonly TilePal[] = [
  { id: 'p1', name: 'Sunny', shape: 'tile', face: 'smile', color: '#f2b544', extra: 'none' },
  { id: 'p2', name: 'Leafy', shape: 'tile', face: 'grin', color: '#22a467', extra: 'sprout' },
  { id: 'p3', name: 'Blueberry', shape: 'round', face: 'wink', color: '#0ea5e9', extra: 'none' },
  { id: 'p4', name: 'Bubblegum', shape: 'round', face: 'love', color: '#ec4899', extra: 'bow' },
  { id: 'p5', name: 'Shades', shape: 'tile', face: 'cool', color: '#64748b', extra: 'none' },
  { id: 'p6', name: 'Zippy', shape: 'hex', face: 'determined', color: '#f97362', extra: 'none' },
  { id: 'p7', name: 'Snooze', shape: 'cloud', face: 'sleepy', color: '#7dd3fc', extra: 'none' },
  { id: 'p8', name: 'Gasp', shape: 'round', face: 'wow', color: '#8b5cf6', extra: 'none' },
  { id: 'p9', name: 'Cheeky', shape: 'tile', face: 'cheeky', color: '#84cc16', extra: 'none' },
  { id: 'p10', name: 'Starry', shape: 'hex', face: 'starry', color: '#6366f1', extra: 'none' },
  { id: 'p11', name: 'Chill', shape: 'cloud', face: 'calm', color: '#14b8a6', extra: 'none' },
  { id: 'p12', name: 'Giggles', shape: 'tile', face: 'laugh', color: '#f472b6', extra: 'none' },
  { id: 'p13', name: 'Beat', shape: 'round', face: 'smile', color: '#a855f7', extra: 'headphones' },
  { id: 'p14', name: 'Captain', shape: 'tile', face: 'grin', color: '#38bdf8', extra: 'cap' },
  { id: 'p15', name: 'Boop', shape: 'hex', face: 'love', color: '#fb923c', extra: 'none' },
  { id: 'p16', name: 'Bolt', shape: 'tile', face: 'determined', color: '#eab308', extra: 'antenna' },
  { id: 'p17', name: 'Minty', shape: 'round', face: 'calm', color: '#2dd4bf', extra: 'sprout' },
  { id: 'p18', name: 'Rosie', shape: 'cloud', face: 'wink', color: '#fb7185', extra: 'bow' },
  { id: 'p19', name: 'Ace', shape: 'hex', face: 'cool', color: '#ef4444', extra: 'none' },
  { id: 'p20', name: 'Pip', shape: 'round', face: 'wow', color: '#a3e635', extra: 'none' },
  { id: 'p21', name: 'Dreamy', shape: 'tile', face: 'sleepy', color: '#c084fc', extra: 'none' },
  { id: 'p22', name: 'Sparky', shape: 'hex', face: 'starry', color: '#f59e0b', extra: 'antenna' },
  { id: 'p23', name: 'Puff', shape: 'cloud', face: 'smile', color: '#94a3b8', extra: 'none' },
  { id: 'p24', name: 'Chuckles', shape: 'round', face: 'laugh', color: '#22c55e', extra: 'cap' },
  { id: 'p25', name: 'Angel', shape: 'cloud', face: 'calm', color: '#bae6fd', extra: 'halo', level: 8 },
  { id: 'p26', name: 'Royal', shape: 'tile', face: 'grin', color: ['#7c3aed', '#c026d3'], extra: 'crown', level: 40 },
  { id: 'p27', name: 'Goldie', shape: 'tile', face: 'cool', color: ['#fde047', '#d97706'], extra: 'crown', level: 60 },
  { id: 'p28', name: 'Cosmo', shape: 'round', face: 'starry', color: ['#312e81', '#db2777'], extra: 'sparkles', level: 85 },
  { id: 'p29', name: 'Legend', shape: 'hex', face: 'starry', color: ['#22d3ee', '#e879f9'], extra: 'crown', level: 100 },
];

export const tilePal = (id: unknown) => TILE_PALS.find((p) => p.id === id) ?? null;
export const isTilePal = (s: unknown): s is string => tilePal(s) !== null;
export const palUnlocked = (id: string, level: number) => {
  const p = tilePal(id);
  return p !== null && (p.level === undefined || level >= p.level);
};

export type AvatarTint = 'auto' | 'mint' | 'sky' | 'grape' | 'rose' | 'sun' | 'coral' | 'slate' | 'night' | 'rainbow';

/** Background colours for your picture ("auto" picks one from your id). */
export const TINTS: readonly { id: AvatarTint; name: string; css: string }[] = [
  { id: 'auto', name: 'Automatic', css: '' },
  { id: 'mint', name: 'Mint', css: '#22a467' },
  { id: 'sky', name: 'Sky', css: '#0ea5e9' },
  { id: 'grape', name: 'Grape', css: '#7c3aed' },
  { id: 'rose', name: 'Rose', css: '#e0457b' },
  { id: 'sun', name: 'Sunshine', css: '#f59e0b' },
  { id: 'coral', name: 'Coral', css: '#f97362' },
  { id: 'slate', name: 'Slate', css: '#475569' },
  { id: 'night', name: 'Night', css: '#1e1b4b' },
  { id: 'rainbow', name: 'Rainbow', css: 'conic-gradient(#ef4444, #f59e0b, #22c55e, #0ea5e9, #8b5cf6, #ef4444)' },
];

/** Largest photo we keep, as a data URL (about 12 KB of JPEG). */
export const PHOTO_MAX = 16000;
const PHOTO_RE = /^data:image\/(jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export const isPhotoData = (s: unknown): s is string => typeof s === 'string' && s.length <= PHOTO_MAX && PHOTO_RE.test(s);
