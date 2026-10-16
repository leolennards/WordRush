/**
 * Tiny synthesised sound effects (Web Audio API) — no audio assets needed.
 * The AudioContext is created lazily on the first call, which only happens in
 * response to user input, so browsers' autoplay policies are respected and
 * nothing plays before the player interacts.
 */
import type { SoundPackId } from '@/engine/shop';

type Cue = 'key' | 'invalid' | 'reveal' | 'win' | 'lose';

let ctx: AudioContext | null = null;
let pack: SoundPackId = 'classic';

/** Picks the sound pack used from now on (set from Settings). */
export function setSoundPack(id: SoundPackId): void {
  pack = id;
}

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(ac: AudioContext, freq: number, start: number, duration: number, type: OscillatorType, gain: number) {
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  amp.gain.setValueAtTime(0.0001, ac.currentTime + start);
  amp.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.02);
}

/** A short burst of filtered noise: a typewriter's clack. */
function click(ac: AudioContext, start: number, gain: number, freq = 2400) {
  const length = Math.floor(ac.sampleRate * 0.04);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const amp = ac.createGain();
  amp.gain.value = gain;
  src.connect(filter).connect(amp).connect(ac.destination);
  src.start(ac.currentTime + start);
}

/** A pitch that slides up quickly: a bubble popping. */
function pop(ac: AudioContext, from: number, to: number, start: number, gain: number) {
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = 'sine';
  const t = ac.currentTime + start;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + 0.07);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(amp).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.14);
}

/** A struck wooden bar: a fundamental plus a quick, bright overtone. */
function mallet(ac: AudioContext, freq: number, start: number, gain: number) {
  tone(ac, freq, start, 0.45, 'sine', gain);
  tone(ac, freq * 4, start, 0.08, 'sine', gain * 0.35);
}

const PENTA = [523.25, 587.33, 659.25, 783.99, 880];

function playPack(ac: AudioContext, cue: Cue, use: SoundPackId): boolean {
  switch (use) {
    case 'bubbles':
      if (cue === 'key') pop(ac, 300 + Math.random() * 200, 900, 0, 0.06);
      else if (cue === 'reveal') pop(ac, 400, 1300, 0, 0.06);
      else if (cue === 'invalid') pop(ac, 500, 160, 0, 0.06);
      else if (cue === 'win') [0, 0.08, 0.16, 0.24, 0.32].forEach((t, i) => pop(ac, 300 + i * 120, 1200 + i * 200, t, 0.07));
      else [0, 0.15, 0.3].forEach((t, i) => pop(ac, 700 - i * 150, 200, t, 0.06));
      return true;
    case 'marimba':
      if (cue === 'key') mallet(ac, PENTA[Math.floor(Math.random() * PENTA.length)]!, 0, 0.05);
      else if (cue === 'reveal') mallet(ac, 659.25, 0, 0.06);
      else if (cue === 'invalid') mallet(ac, 196, 0, 0.07);
      else if (cue === 'win') [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => mallet(ac, f, i * 0.1, 0.07));
      else [440, 349.23, 293.66].forEach((f, i) => mallet(ac, f, i * 0.16, 0.06));
      return true;
    case 'arcade':
      if (cue === 'key') tone(ac, 880, 0, 0.04, 'square', 0.025);
      else if (cue === 'reveal') tone(ac, 660, 0, 0.06, 'square', 0.03);
      else if (cue === 'invalid') [220, 160].forEach((f, i) => tone(ac, f, i * 0.08, 0.08, 'square', 0.03));
      else if (cue === 'win')
        [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => tone(ac, f, i * 0.08, i === 5 ? 0.35 : 0.09, 'square', 0.035));
      else [392, 311.13, 261.63, 196].forEach((f, i) => tone(ac, f, i * 0.12, 0.14, 'square', 0.03));
      return true;
    case 'typewriter':
      if (cue === 'key') click(ac, 0, 0.5, 2000 + Math.random() * 800);
      else if (cue === 'reveal') click(ac, 0, 0.4, 1200);
      else if (cue === 'invalid') [0, 0.06].forEach((t) => click(ac, t, 0.45, 700));
      else if (cue === 'win') {
        [0, 0.07, 0.14].forEach((t) => click(ac, t, 0.4, 2200));
        tone(ac, 2093, 0.24, 0.9, 'sine', 0.06);
        tone(ac, 4186, 0.24, 0.4, 'sine', 0.02);
      } else [0, 0.1].forEach((t) => click(ac, t, 0.4, 500));
      return true;
    case 'chimes': {
      // A struck glass bell: a pure tone with a soft, shimmering overtone.
      const bell = (f: number, t: number, g: number) => {
        tone(ac, f, t, 0.9, 'sine', g);
        tone(ac, f * 2.76, t, 0.35, 'sine', g * 0.3);
      };
      if (cue === 'key') bell(1046.5 + Math.random() * 400, 0, 0.035);
      else if (cue === 'reveal') bell(1318.5, 0, 0.045);
      else if (cue === 'invalid') bell(392, 0, 0.05);
      else if (cue === 'win') [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => bell(f, i * 0.1, 0.05));
      else [880, 698.5, 523.25].forEach((f, i) => bell(f, i * 0.18, 0.045));
      return true;
    }
    default:
      return false;
  }
}

export function playCue(cue: Cue, use: SoundPackId = pack): void {
  const ac = context();
  if (!ac) return;
  if (playPack(ac, cue, use)) return;
  switch (cue) {
    case 'key':
      tone(ac, 520, 0, 0.05, 'triangle', 0.04);
      break;
    case 'invalid':
      tone(ac, 180, 0, 0.12, 'square', 0.03);
      tone(ac, 150, 0.1, 0.14, 'square', 0.03);
      break;
    case 'reveal':
      tone(ac, 440, 0, 0.08, 'sine', 0.05);
      break;
    case 'win':
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, i * 0.09, 0.28, 'triangle', 0.07));
      break;
    case 'lose':
      [392, 329.63, 261.63].forEach((f, i) => tone(ac, f, i * 0.14, 0.3, 'sine', 0.06));
      break;
  }
}

/** A taste of a sound pack: a few keys, a reveal and a win. */
export function previewPack(id: SoundPackId): void {
  playCue('key', id);
  window.setTimeout(() => playCue('key', id), 130);
  window.setTimeout(() => playCue('reveal', id), 300);
  window.setTimeout(() => playCue('win', id), 560);
}
