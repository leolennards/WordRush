/**
 * Looks up a short definition from the free Dictionary API
 * (https://dictionaryapi.dev). Only the answer word is sent, after the game
 * is over. Results (including misses) are cached for the session.
 */
export interface WordDefinition {
  word: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
}

const cache = new Map<string, Promise<WordDefinition | null>>();

export function defineWord(word: string): Promise<WordDefinition | null> {
  const key = word.toLowerCase();
  let hit = cache.get(key);
  if (!hit) {
    hit = fetchDefinition(key);
    cache.set(key, hit);
  }
  return hit;
}

async function fetchDefinition(word: string): Promise<WordDefinition | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return parseEntry(word, data);
  } catch {
    cache.delete(word); // network hiccup: allow a retry later
    return null;
  }
}

/** Picks the first usable meaning from the API response. Exported for tests. */
export function parseEntry(word: string, data: unknown): WordDefinition | null {
  if (!Array.isArray(data)) return null;
  for (const entry of data) {
    const meanings = (entry as { meanings?: unknown })?.meanings;
    if (!Array.isArray(meanings)) continue;
    for (const m of meanings as { partOfSpeech?: unknown; definitions?: unknown }[]) {
      if (!Array.isArray(m.definitions)) continue;
      for (const d of m.definitions as { definition?: unknown; example?: unknown }[]) {
        if (typeof d.definition === 'string' && d.definition.trim()) {
          return {
            word,
            partOfSpeech: typeof m.partOfSpeech === 'string' ? m.partOfSpeech : '',
            definition: d.definition.trim(),
            ...(typeof d.example === 'string' ? { example: d.example.trim() } : {}),
          };
        }
      }
    }
  }
  return null;
}
