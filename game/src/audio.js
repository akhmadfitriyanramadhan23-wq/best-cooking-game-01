// WebAudio squeaks, thocks and dings — all synthesised, no audio files.
// The kitchen sizzles with oscillators and filtered noise, never a download.
let ctx = null;
let muted = false;

function audio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function toggleMute() { muted = !muted; return muted; }
export function isMuted() { return muted; }

function tone(freq, dur, type, vol, slideTo) {
  if (muted) return;
  const c = audio(); if (!c) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g); g.connect(c.destination);
  o.start(); o.stop(c.currentTime + dur);
}

function noise(dur, vol, freq) {
  if (muted) return;
  const c = audio(); if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = c.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(c.destination);
  src.start();
}

export const sfx = {
  pick() { tone(520, 0.07, 'triangle', 0.12); },
  chop() { noise(0.08, 0.25, 900); tone(180, 0.06, 'square', 0.08); },
  sizzle() { noise(0.35, 0.12, 2400); },
  plate() { tone(660, 0.08, 'sine', 0.12); tone(880, 0.1, 'sine', 0.1); },
  serve() { tone(880, 0.12, 'sine', 0.16); setTimeout(() => tone(1320, 0.18, 'sine', 0.16), 90); },
  ding() { tone(1046, 0.25, 'sine', 0.18); setTimeout(() => tone(1568, 0.3, 'sine', 0.12), 110); },
  burn() { tone(220, 0.3, 'sawtooth', 0.12, 110); },
  fail() { tone(330, 0.2, 'sawtooth', 0.1, 165); },
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.15), i * 120)); },
};
