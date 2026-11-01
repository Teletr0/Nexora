// Web Audio API — sonificação dos eventos.
// Corrigido: AudioContext criado independente de botão #audio-toggle.

let ctx = null;
let gainNode = null;
let muted = false;
let initialized = false;

export function initAudio() {
  if (initialized) return;
  initialized = true;
  console.log('[audio] initAudio() executado');

  const boot = () => {
    try {
      if (!ctx) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) { console.warn('[audio] AudioContext indisponível'); return; }
        ctx = new Ctor();
        gainNode = ctx.createGain();
        gainNode.gain.value = muted ? 0 : 0.2;
        gainNode.connect(ctx.destination);
        console.log('[audio] AudioContext criado. Estado:', ctx.state);
      }
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => console.log('[audio] resumed'));
      }
    } catch (e) {
      console.warn('[audio] falha:', e);
    }
  };

  ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evt =>
    document.addEventListener(evt, boot, { passive: true })
  );

  window.__dsAudio = {
    get ctx() { return ctx; },
    get muted() { return muted; },
    setMuted: (v) => { muted = !!v; if (gainNode) gainNode.gain.value = muted ? 0 : 0.2; },
    test: () => { boot(); beep(660, 0.15); setTimeout(() => beep(880, 0.15), 150); },
  };
  console.log('[audio] __dsAudio disponível');
}

function beep(freq, duration, vol = 0.3) {
  if (!ctx || muted || !gainNode) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(gainNode);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function tone(freq, duration, type = 'sine', delay = 0, vol = 0.3) {
  if (!ctx || muted || !gainNode) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(gainNode);
  const t = ctx.currentTime + delay;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

export function playLoading() {
  if (!ctx || muted) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.35);
  osc.connect(g);
  g.connect(gainNode);
  g.gain.value = 0.12;
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}

export function playSuccess(count = 6) {
  [523.25, 659.25, 783.99].forEach((f, i) => tone(f, 0.15, 'sine', i * 0.08));
  tone(783.99, 0.35, 'sine', 0.24);
  const n = Math.min(count, 6);
  for (let i = 0; i < n; i++) tone(880 + i * 60, 0.08, 'sine', 0.5 + i * 0.04, 0.15);
}

export function playError(status = 500) {
  const base = status >= 500 ? 160 : 200;
  tone(base, 0.3, 'sawtooth', 0, 0.2);
  tone(base * 0.9, 0.3, 'sawtooth', 0.05, 0.2);
}

export function playEmpty() { tone(330, 0.6, 'triangle', 0, 0.15); }

export function playMalformed() {
  tone(400, 0.1, 'square', 0, 0.1);
  tone(380, 0.1, 'square', 0.15, 0.1);
  tone(350, 0.2, 'square', 0.3, 0.1);
}

export function playLevelUp() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.15, 'sine', i * 0.08, 0.25));
}

export function playBadge() {
  tone(880, 0.12, 'sine', 0, 0.25);
  tone(1174, 0.35, 'sine', 0.1, 0.25);
}

export function playChime() { beep(880, 0.08); setTimeout(() => beep(1174, 0.15), 90); }
