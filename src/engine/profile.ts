/**
 * Profile pictures: your initial or a small photo, on a colour of your
 * choice. Shown to friends with your title.
 */

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
