/**
 * Tiny synthesised sound effects (Web Audio API) — no audio assets needed.
 * The AudioContext is created lazily on the first call, which only happens in
 * response to user input, so browsers' autoplay policies are respected and
 * nothing plays before the player interacts.
 */
type Cue = 'key' | 'invalid' | 'reveal' | 'win' | 'lose';

let ctx: AudioContext | null = null;

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

export function playCue(cue: Cue): void {
  const ac = context();
  if (!ac) return;
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
