// Web Speech API — narração pt-BR.
// v3: toggle consistente (cancel imediato + botão sincronizado + retry).

let enabled = false;
let voice = null;
let voicesLoaded = false;
let attempts = 0;
let retryTimer = null;
let lastError = null;

export function initSpeech() {
  console.log('[speech] initSpeech() executado');
  const toggle = document.getElementById('speech-toggle');

  if (!window.speechSynthesis) {
    if (toggle) {
      toggle.disabled = true;
      toggle.textContent = '🗣️ Indisponível';
    }
    return;
  }

  // ── Retry de vozes (Firefox Linux pode retornar 0 na 1ª chamada) ──
  function pick() {
    attempts++;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
      voicesLoaded = false;
      if (attempts < 10) {
        retryTimer = setTimeout(pick, 300);
      }
      return;
    }
    voicesLoaded = true;
    voice = voices.find(v => v.lang === 'pt-BR')
         || voices.find(v => v.lang.startsWith('pt'))
         || voices[0] || null;
    console.log('[speech] vozes:', voices.length,
                '| pt-BR:', !!voice, '| voz:', voice?.name || '(default)');
  }

  pick();
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    console.log('[speech] voiceschanged');
    attempts = 0;
    pick();
  });

  // ── Toggle: liga/desliga com cancel imediato ──
  function setEnabled(v) {
    enabled = !!v;
    toggle.classList.toggle('on', enabled);
    toggle.setAttribute('aria-pressed', String(enabled));

    if (!enabled) {
      // CANCELA qualquer fala pendente ou em curso
      try { window.speechSynthesis.cancel(); } catch {}
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
      toggle.textContent = '🗣️ Narrar';
      toggle.title = 'Narração desligada';
      console.log('[speech] desligado — speak() cancelado');
      return;
    }

    // Tenta carregar vozes de novo
    if (!voicesLoaded) {
      attempts = 0;
      pick();
    }

    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
      toggle.textContent = '🗣️ Sem voz';
      toggle.title = 'Nenhuma voz instalada no sistema';
      showStatus(
        'Narração ligada, mas sem vozes instaladas. ' +
        'No Linux: sudo apt install speech-dispatcher espeak-ng. ' +
        'Depois reinicie o navegador.'
      );
      return;
    }

    toggle.textContent = '🗣️ Narrando';
    toggle.title = 'Clique para desligar narração';
    speak('Narração ativada.', true); // true = ignora o cancel do toggle
  }

  if (toggle) {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setEnabled(!enabled);
    });
  }

  // ── API pública para debug ──
  window.__dsSpeech = {
    get enabled() { return enabled; },
    get voice() { return voice; },
    get voicesCount() { return window.speechSynthesis.getVoices().length; },
    get voicesPtBr() {
      return window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('pt'));
    },
    get lastError() { return lastError; },
    get pending() { return window.speechSynthesis.pending; },
    get speaking() { return window.speechSynthesis.speaking; },
    retry: () => { attempts = 0; pick(); },
    off: () => setEnabled(false),
    on: () => setEnabled(true),
    test: () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) {
        showStatus('Nenhuma voz disponível. Rode __dsSpeech.retry() após ativar speech-dispatcher.');
        return;
      }
      try { window.speechSynthesis.cancel(); } catch {}
      const u = new SpeechSynthesisUtterance('Teste de narração.');
      u.lang = 'pt-BR';
      if (voice) u.voice = voice;
      u.onerror = (e) => {
        lastError = 'erro: ' + (e.error || 'desconhecido');
        console.warn('[speech] erro no test:', e);
      };
      window.speechSynthesis.speak(u);
    },
  };

  // Estado inicial visual
  if (toggle) {
    toggle.setAttribute('aria-pressed', 'false');
    toggle.textContent = '🗣️ Narrar';
  }

  console.log('[speech] __dsSpeech disponível');
}

function showStatus(msg) {
  let box = document.getElementById('speech-status');
  if (!box) {
    box = document.createElement('div');
    box.id = 'speech-status';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    box.style.cssText =
      'position:fixed;bottom:80px;right:24px;z-index:9500;' +
      'max-width:340px;padding:12px 16px;background:#fffbeb;' +
      'color:#78350f;border-left:4px solid #f59e0b;' +
      'border-radius:8px;font:13px/1.5 system-ui,sans-serif;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.15);';
    document.body.appendChild(box);
  }
  box.textContent = msg;
  setTimeout(() => box.remove(), 8000);

  const live = document.getElementById('sr-live');
  if (live) {
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = msg; });
  }
}

// force=true ignora o cancel do toggle (usado pela fala "Narração ativada")
export function speak(text, force = false) {
  if (!text) return;
  if (!force && !enabled) return;
  if (!window.speechSynthesis) return;

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) { lastError = 'sem vozes'; return; }

  try { window.speechSynthesis.cancel(); } catch {}
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR';
  u.rate = 1.05;
  if (voice) u.voice = voice;
  u.onerror = (e) => {
    lastError = 'erro: ' + (e.error || 'desconhecido');
    console.warn('[speech] erro ao falar:', e);
  };
  u.onend = () => {
    console.log('[speech] fala concluída');
  };
  window.speechSynthesis.speak(u);
}

export function isSpeechEnabled() { return enabled; }
