/**
 * Looks up a word's meaning from the free Dictionary API
 * (https://dictionaryapi.dev), with Wiktionary as a fallback. Only the answer
 * word is sent, after the game is over. Results are cached for the session.
 */
export interface WordSense {
  partOfSpeech: string;
  definitions: { definition: string; example?: string }[];
  synonyms: string[];
}

export interface WordDefinition {
  word: string;
  /** First sense, for compact cards. */
  partOfSpeech: string;
  definition: string;
  example?: string;
  /** e.g. "/kreɪn/" */
  phonetic?: string;
  /** HTTPS link to a pronunciation recording. */
  audio?: string;
  /** Up to three parts of speech with up to two definitions each. */
  senses: WordSense[];
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

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok ? await res.json() : null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Two sources, asked at the same time: the Dictionary API (with pronunciation)
 * is preferred; Wiktionary covers for it when it is slow, down or has no entry.
 */
async function fetchDefinition(word: string): Promise<WordDefinition | null> {
  const w = encodeURIComponent(word);
  const wiktionary = getJson(`https://en.wiktionary.org/api/rest_v1/page/definition/${w}`, 8000)
    .then((d) => parseWiktionary(word, d))
    .catch(() => null);
  const primary = await getJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${w}`, 3500)
    .then((d) => parseEntry(word, d))
    .catch(() => null);
  const result = primary ?? (await wiktionary);
  if (!result) cache.delete(word); // allow a retry later
  return result;
}

/** Plain text from a Wiktionary HTML fragment. */
function stripHtml(html: string): string {
  if (typeof DOMParser !== 'undefined') {
    return (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim();
  }
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** Reads Wiktionary's REST definition response (English entries only). Exported for tests. */
export function parseWiktionary(word: string, data: unknown): WordDefinition | null {
  const entries = (data as { en?: unknown } | null)?.en;
  if (!Array.isArray(entries)) return null;
  const senses: WordSense[] = [];
  for (const e of entries as Record<string, unknown>[]) {
    if (!Array.isArray(e?.definitions)) continue;
    const definitions = (e.definitions as Record<string, unknown>[])
      .map((d) => {
        const definition = typeof d?.definition === 'string' ? stripHtml(d.definition) : '';
        const ex = Array.isArray(d?.examples) && typeof d.examples[0] === 'string' ? stripHtml(d.examples[0]) : '';
        return ex ? { definition, example: ex } : { definition };
      })
      .filter((d) => d.definition.length > 0)
      .slice(0, 2);
    if (definitions.length === 0) continue;
    const partOfSpeech = (typeof e.partOfSpeech === 'string' ? e.partOfSpeech : '').toLowerCase();
    if (senses.some((x) => x.partOfSpeech === partOfSpeech)) continue;
    senses.push({ partOfSpeech, definitions, synonyms: [] });
    if (senses.length === 3) break;
  }
  const first = senses[0]?.definitions[0];
  if (!first) return null;
  return {
    word,
    partOfSpeech: senses[0]!.partOfSpeech,
    definition: first.definition,
    ...(first.example ? { example: first.example } : {}),
    senses,
  };
}

const str = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : undefined);

/** Collects the useful parts of the API response. Exported for tests. */
export function parseEntry(word: string, data: unknown): WordDefinition | null {
  if (!Array.isArray(data)) return null;
  const senses: WordSense[] = [];
  let phonetic: string | undefined;
  let audio: string | undefined;

  for (const entry of data as Record<string, unknown>[]) {
    if (!entry || typeof entry !== 'object') continue;
    phonetic ??= str(entry.phonetic);
    if (Array.isArray(entry.phonetics)) {
      for (const p of entry.phonetics as Record<string, unknown>[]) {
        phonetic ??= str(p?.text);
        const a = str(p?.audio);
        if (!audio && a?.startsWith('https://')) audio = a;
      }
    }
    if (!Array.isArray(entry.meanings)) continue;
    for (const m of entry.meanings as Record<string, unknown>[]) {
      if (!Array.isArray(m?.definitions)) continue;
      const definitions = (m.definitions as Record<string, unknown>[])
        .map((d) => ({ definition: str(d?.definition), example: str(d?.example) }))
        .filter((d): d is { definition: string; example: string | undefined } => !!d.definition)
        .slice(0, 2)
        .map((d) => (d.example ? d : { definition: d.definition }));
      if (definitions.length === 0) continue;
      const partOfSpeech = str(m.partOfSpeech) ?? '';
      const synonyms = Array.isArray(m.synonyms)
        ? (m.synonyms as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 6)
        : [];
      const same = senses.find((x) => x.partOfSpeech === partOfSpeech);
      if (same) {
        same.definitions = [...same.definitions, ...definitions].slice(0, 2);
        same.synonyms = [...new Set([...same.synonyms, ...synonyms])].slice(0, 6);
      } else if (senses.length < 3) {
        senses.push({ partOfSpeech, definitions, synonyms });
      }
    }
  }

  const first = senses[0]?.definitions[0];
  if (!first) return null;
  return {
    word,
    partOfSpeech: senses[0]!.partOfSpeech,
    definition: first.definition,
    ...(first.example ? { example: first.example } : {}),
    ...(phonetic ? { phonetic } : {}),
    ...(audio ? { audio } : {}),
    senses,
  };
}
