// Tiny Web Audio sound helper — Caribbean-flavored blips with zero asset deps.
// Safe to call when AudioContext isn't available (silent fallback).

let ctx = null;
function audioCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { ctx = null; }
  }
  return ctx;
}

function tone(freq, dur, when = 0, type = 'sine', gain = 0.07) {
  const ac = audioCtx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  click() { tone(420, 0.08, 0, 'square', 0.05); },
  addIngredient() { tone(660, 0.09, 0, 'triangle', 0.06); },
  serve() { tone(523, 0.1, 0, 'sine', 0.06); tone(784, 0.12, 0.07, 'sine', 0.06); },
  perfect() {
    tone(659, 0.12, 0, 'sine', 0.07);
    tone(880, 0.12, 0.1, 'sine', 0.07);
    tone(1175, 0.16, 0.2, 'sine', 0.07);
  },
  wrong() { tone(180, 0.2, 0, 'sawtooth', 0.06); tone(140, 0.25, 0.05, 'sawtooth', 0.06); },
  combo() { tone(700, 0.1, 0, 'triangle', 0.06); tone(900, 0.1, 0.06, 'triangle', 0.06); },
  coin() { tone(990, 0.08, 0, 'square', 0.05); tone(1320, 0.1, 0.06, 'square', 0.05); },
  lose() { tone(300, 0.2, 0, 'sine', 0.06); tone(200, 0.3, 0.15, 'sine', 0.06); },
  levelup() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, i * 0.09, 'sine', 0.07));
  },
  sauce() { tone(880, 0.15, 0, 'triangle', 0.06); tone(1175, 0.15, 0.08, 'triangle', 0.06); },
};

export function unlockAudio() {
  const ac = audioCtx();
  if (ac && ac.state === 'suspended') ac.resume();
}