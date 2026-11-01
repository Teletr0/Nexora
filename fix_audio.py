#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix áudio — versão robusta.
Detecta o projeto automaticamente e verifica byte a byte.
"""
from pathlib import Path
import os
import shutil
import sys
from datetime import datetime


def find_project() -> Path | None:
    """Sobe a árvore procurando por app.py + static/audio.js."""
    candidates = [Path.cwd(), Path(__file__).resolve().parent]
    for start in candidates:
        for p in [start, *start.parents]:
            if (p / "app.py").exists() and (p / "static").exists():
                return p
    return None


AUDIO_JS = '''// Web Audio API — sonificação dos eventos.
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
'''

SPEECH_JS = '''// Web Speech API — narração pt-BR.
// Corrigido: detecta ausência de vozes e avisa.

let enabled = false;
let voice = null;
let voicesLoaded = false;

export function initSpeech() {
  console.log('[speech] initSpeech() executado');

  if (!window.speechSynthesis) {
    console.warn('[speech] speechSynthesis indisponível');
    const t = document.getElementById('speech-toggle');
    if (t) { t.disabled = true; t.textContent = 'Narrador (indisponível)'; }
    window.__dsSpeech = {
      get enabled() { return false; },
      get voicesCount() { return 0; },
      get voicesPtBr() { return []; },
      test: () => console.warn('[speech] indisponível'),
      speak: () => {},
    };
    return;
  }

  function pick() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) { voicesLoaded = false; return; }
    voicesLoaded = true;
    voice = voices.find(v => v.lang === 'pt-BR')
         || voices.find(v => v.lang.startsWith('pt'))
         || null;
    console.log('[speech] vozes:', voices.length,
                '| pt-BR:', !!voice, '| voz:', voice?.name || '(default)');
  }

  pick();
  window.speechSynthesis.addEventListener('voiceschanged', pick);

  window.__dsSpeech = {
    get enabled() { return enabled; },
    get voicesCount() { return window.speechSynthesis.getVoices().length; },
    get voicesPtBr() {
      return window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('pt'));
    },
    test: () => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('Teste de narração em português.');
      u.lang = 'pt-BR';
      if (voice) u.voice = voice;
      window.speechSynthesis.speak(u);
    },
    speak: (t) => { enabled = true; speak(t); },
  };

  const toggle = document.getElementById('speech-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    enabled = !enabled;
    toggle.classList.toggle('on', enabled);
    toggle.setAttribute('aria-pressed', String(enabled));

    if (enabled) {
      if (!voicesLoaded || window.speechSynthesis.getVoices().length === 0) {
        const live = document.getElementById('sr-live');
        if (live) live.textContent =
          'Narração ativada, mas sem vozes instaladas. No Linux: ' +
          'sudo apt install speech-dispatcher espeak-ng';
        toggle.textContent = 'Narrador (sem voz)';
        return;
      }
      speak('Narração ativada.');
    } else {
      window.speechSynthesis.cancel();
    }
  });

  console.log('[speech] __dsSpeech disponível');
}

export function speak(text) {
  if (!enabled || !window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR';
  u.rate = 1.05;
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}
'''


def main() -> int:
    print()
    print("╔══════════════════════════════════════════════════════╗")
    print("║  Fix áudio v2 · detecção automática                  ║")
    print("╚══════════════════════════════════════════════════════╝")
    print()

    project = find_project()
    if project is None:
        print("✗ Não achei o projeto (nem app.py nem static/).")
        print(f"  Diretório atual: {Path.cwd()}")
        print("  Rode este script de dentro de ds-lab-dom-api, ou de ds/.")
        return 1

    print(f"✓ Projeto detectado: {project}")
    print()

    targets = {
        "static/audio.js":  AUDIO_JS,
        "static/speech.js": SPEECH_JS,
    }

    # Validação anti-backslash
    for rel, content in targets.items():
        if content.startswith("\\"):
            print(f"✗ {rel}: começa com backslash — ABORTANDO")
            return 1
        if not content.strip():
            print(f"✗ {rel}: vazio — ABORTANDO")
            return 1

    # Backup
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    for rel in targets:
        full = project / rel
        if full.exists():
            bkp = full.with_name(full.name + f".bak-{stamp}")
            shutil.copy2(full, bkp)
            print(f"  backup: {bkp.name}")

    print()
    for rel, content in targets.items():
        full = project / rel
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_text(content, encoding="utf-8")

        # Verificação byte a byte
        written = full.read_text(encoding="utf-8")
        if written != content:
            print(f"✗ {rel}: divergiu após escrita! ABORTANDO")
            return 1

        first = written[:40].replace("\n", " ")
        print(f"✓ {rel} ({len(written)} bytes)")
        print(f"   primeiros 40: {first!r}")

    print()
    print("╔══════════════════════════════════════════════════════╗")
    print("║  Aplicado com sucesso                                ║")
    print("╚══════════════════════════════════════════════════════╝")
    print()
    print("Próximos passos OBRIGATÓRIOS:")
    print("  1. Ctrl+C no terminal do Flask")
    print("  2. ./run.sh")
    print("  3. No navegador: feche TODAS as abas do localhost:5000")
    print("  4. F12 → Network → marque 'Disable cache'")
    print("  5. Abra http://localhost:5000/ecommerce")
    print("  6. Clique em qualquer lugar da página")
    print("  7. F12 → Console → cole: typeof __dsAudio")
    print("     Esperado: 'object'")
    print()
    print("Se ainda der 'undefined' após isso, é cache do Chrome.")
    print("Solução nuclear: chrome://settings/clearBrowserData")
    print("Selecione 'Cached images and files' → Clear data.")
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
