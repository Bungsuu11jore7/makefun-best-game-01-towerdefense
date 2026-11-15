// All sound in ROOTWARDEN is synthesized live with WebAudio: no audio files.
// A tiny helper builds short oscillator blips and noise bursts on demand.
let ctx = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

// Create (or resume) the audio context. Called from the first user gesture so
// browsers allow sound; safe to call before any gesture too (it just stays
// suspended until one happens).
export function ensureAudio() {
  if (ctx === null) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type, vol, slideTo) {
  if (muted) return;
  const ac = ensureAudio();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst(dur, vol, lowpass) {
  if (muted) return;
  const ac = ensureAudio();
  if (!ac) return;
  const t0 = ac.currentTime;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
}

export const sfx = {
  shootThorn() { tone(720, 0.07, 'square', 0.05, 420); },
  shootSpore() { tone(240, 0.14, 'sine', 0.09, 120); noiseBurst(0.1, 0.05, 900); },
  shootFrost() { tone(1180, 0.16, 'sine', 0.06, 1900); },
  pop() { noiseBurst(0.09, 0.12, 1600); tone(320, 0.08, 'triangle', 0.06, 90); },
  kill() { tone(520, 0.12, 'triangle', 0.08, 180); },
  coin() { tone(880, 0.07, 'sine', 0.07); setTimeout(() => tone(1320, 0.1, 'sine', 0.07), 60); },
  place() { tone(300, 0.1, 'triangle', 0.1, 520); },
  upgrade() { tone(440, 0.09, 'sine', 0.09); setTimeout(() => tone(660, 0.09, 'sine', 0.09), 80); setTimeout(() => tone(880, 0.14, 'sine', 0.09), 160); },
  sell() { tone(660, 0.1, 'sine', 0.07, 330); },
  denied() { tone(160, 0.16, 'sawtooth', 0.08, 110); },
  horn() { tone(196, 0.5, 'sawtooth', 0.1, 262); tone(294, 0.5, 'sawtooth', 0.06, 392); },
  hurt() { tone(110, 0.25, 'sawtooth', 0.14, 55); noiseBurst(0.15, 0.1, 500); },
  waveClear() { tone(523, 0.1, 'sine', 0.09); setTimeout(() => tone(784, 0.16, 'sine', 0.09), 100); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.1), i * 130)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.08), i * 160)); },
  click() { tone(600, 0.05, 'sine', 0.05); },
};
