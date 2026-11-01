import { initSpeech, speak } from "./speech.js";
import { initStory, addXP, registerQuiz, quizCorrect, unlockBadge } from "./story.js";
import { QUIZZES } from "./concepts.js";

function announce(msg) {
  const live = document.getElementById("sr-live");
  if (!live) return;
  live.textContent = "";
  requestAnimationFrame(() => { live.textContent = msg; });
  try { speak(msg); } catch (e) {}
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Fallbacks (carregam em background)
let playChime = () => {};
let playSuccess = () => {};
let playError = () => {};
let celebrate = () => {};
let fail = () => {};

function loadAudio() {
  import("./audio.js").then(a => {
    a.initAudio();
    playChime = a.playChime;
    playSuccess = a.playSuccess;
    playError = a.playError;
  }).catch(() => {});
}
function load3D() {
  import("./scene.js").then(s => {
    celebrate = s.celebrate;
    fail = s.fail;
    return s.initScene();
  }).catch(() => {});
}

// ── Fundação ─────────────────────────────────────────────
const done = new Set();

function initConceptQuizzes() {
  document.querySelectorAll(".concept").forEach(card => {
    const id = card.dataset.id;
    const quiz = QUIZZES[id];
    if (!quiz) return;

    const check = card.querySelector(".quiz-check");
    const fb = card.querySelector(".quiz-feedback");
    const mark = card.querySelector(".mark-seen");
    const inputs = card.querySelectorAll('input[type="radio"]');

    // Se já acertou em sessão anterior, restaura
    if (quizCorrect(id)) {
      mark.disabled = false;
      mark.textContent = "Marcar como entendido";
      card.querySelector(".concept-quiz").classList.add("quiz-done");
    }

    check.addEventListener("click", () => {
      const sel = card.querySelector('input[type="radio"]:checked');
      if (!sel) {
        fb.className = "quiz-feedback error";
        fb.textContent = "Selecione uma alternativa antes de verificar.";
        return;
      }
      const choice = Number(sel.value);
      const correct = choice === quiz.correct;
      const firstTry = !card.dataset.tried;
      card.dataset.tried = "1";

      registerQuiz(id, correct, firstTry);

      if (correct) {
        fb.className = "quiz-feedback success";
        fb.textContent = "✓ " + quiz.fb[choice];
        card.querySelector(".concept-quiz").classList.add("quiz-done");
        mark.disabled = false;
        mark.textContent = "Marcar como entendido";

        const xp = firstTry ? 10 : 5;
        addXP(xp, firstTry ? "quiz de primeira" : "quiz correto");
        playSuccess();
        celebrate();
        announce("Correto. " + quiz.fb[choice]);
      } else {
        fb.className = "quiz-feedback error";
        fb.textContent = "✗ " + quiz.fb[choice] + " Tente de novo.";
        playError();
        fail();
        announce("Ainda não. " + quiz.fb[choice]);
      }
    });
  });
}

function initMarkSeen() {
  document.addEventListener("click", ev => {
    const btn = ev.target.closest(".mark-seen");
    if (!btn || btn.disabled) return;

    const card = btn.closest(".concept");
    if (!card) return;
    const id = card.dataset.id;
    if (done.has(id)) return;

    done.add(id);
    card.classList.add("seen");
    card.querySelector(".badge-read").hidden = false;

    addXP(5, "conceito concluído");
    playChime();
    updateUnlock();
    announce(`Conceito ${id} concluído.`);

    if (done.size === 5) {
      unlockBadge("Fundação Completa");
    }
  });
}

function updateUnlock() {
  const total = 5, n = done.size;
  const msg = document.getElementById("unlock-msg");
  const btn = document.getElementById("unlock-btn");
  const pill = document.getElementById("pill-fund");

  if (msg) msg.textContent = `${n} de ${total} conceitos concluídos.`;
  if (pill) pill.classList.toggle("done", n === total);

  if (n === total && btn) {
    if (msg) msg.textContent = "Fundação concluída. Missões liberadas.";
    btn.disabled = false;
    btn.textContent = "Ir para as missões →";
    btn.onclick = () => {
      const m = document.getElementById("missoes");
      if (m) {
        m.classList.remove("locked");
        m.scrollIntoView({ behavior: "smooth" });
      }
      const p = document.getElementById("pill-missions");
      if (p) p.classList.add("active");
      playSuccess();
      celebrate();
      announce("Missões liberadas.");
    };
  }
}

// ── Demo DOM ao vivo ─────────────────────────────────────
function initDemos() {
  document.querySelectorAll(".try[data-demo]").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".concept");
      const preview = card.querySelector(".demo-preview");
      if (!preview) return;
      preview.innerHTML = "";
      preview.hidden = false;

      const h = document.createElement("h3");
      h.textContent = "Elemento criado via createElement!";
      h.style.color = "var(--accent)";
      h.style.margin = "8px 0";
      preview.appendChild(h);

      const p = document.createElement("p");
      p.textContent = "Isso acabou de existir no DOM — não estava no HTML original.";
      p.style.color = "var(--muted)";
      p.style.fontSize = "13px";
      preview.appendChild(p);

      playChime();
      announce("Elemento h3 criado e inserido no DOM.");
    });
  });
}

// ── Missões ──────────────────────────────────────────────
async function initMissions() {
  const container = document.getElementById("missions-container");
  if (!container) return;
  try {
    const [{ MISSIONS }, { runMission }] = await Promise.all([
      import("./missions.js"),
      import("./runner.js")
    ]);
    MISSIONS.forEach(m => container.appendChild(buildMission(m, runMission)));
  } catch (e) {
    console.error("[DS] missões:", e);
    container.innerHTML =
      '<p style="color:var(--red);padding:16px">Erro ao carregar missões. ' +
      'Abra F12 → Console.</p>';
  }
}

function buildMission(m, runMission) {
  const el = document.createElement("article");
  el.className = "mission";
  el.innerHTML =
    `<h3>${m.title}</h3>` +
    `<p class="narrative">${m.narrative}</p>` +
    `<details><summary>Ver conceito</summary><p>${m.concept}</p></details>` +
    `<textarea spellcheck="false">${esc(m.starter)}</textarea>` +
    `<div class="actions">` +
    `<button class="verify primary" type="button">Verificar</button>` +
    `<button class="hint" type="button">Dica</button>` +
    `<button class="reset" type="button">Resetar</button>` +
    `</div>` +
    `<div class="feedback" role="status" aria-live="polite">Aguardando verificação.</div>` +
    `<div class="tests"></div>`;

  const ta = el.querySelector("textarea");
  const fb = el.querySelector(".feedback");
  const testsBox = el.querySelector(".tests");

  el.querySelector(".verify").addEventListener("click", async () => {
    fb.className = "feedback";
    fb.textContent = "Verificando...";
    testsBox.innerHTML = "";
    const results = await runMission(m, ta.value);
    results.forEach(r => {
      const row = document.createElement("div");
      row.className = "test " + (r.passed ? "pass" : "fail");
      row.innerHTML = `<span class="icon">${r.passed ? "✓" : "✗"}</span>` +
        `<span>${r.name}${r.detail ? " — " + esc(r.detail) : ""}</span>`;
      testsBox.appendChild(row);
    });
    const ok = results.every(r => r.passed);
    if (ok) {
      fb.className = "feedback success";
      fb.textContent = "✓ Missão cumprida.";
      el.classList.add("solved");
      celebrate(); playSuccess();
      addXP(20, "missão concluída");
      announce("Missão cumprida.");
    } else {
      fb.className = "feedback error";
      fb.textContent = results.filter(r => !r.passed).length + " teste(s) falharam.";
      fail(); playError();
      announce("Ainda não.");
    }
  });

  el.querySelector(".hint").addEventListener("click", () => {
    fb.className = "feedback";
    fb.textContent = "💡 " + m.hint;
    announce(m.hint);
  });

  el.querySelector(".reset").addEventListener("click", () => {
    ta.value = m.starter;
    testsBox.innerHTML = "";
    fb.className = "feedback";
    fb.textContent = "Código resetado.";
    el.classList.remove("solved");
  });

  return el;
}

// ── Boot ─────────────────────────────────────────────────
function boot() {
  console.log("[DS] app iniciado");
  try { initSpeech(); } catch (e) {}
  initStory();
  initConceptQuizzes();
  initMarkSeen();
  initDemos();
  updateUnlock();
  initMissions();
  loadAudio();
  load3D();
  announce("Laboratório carregado.");
}

if (document.readyState !== "loading") boot();
else document.addEventListener("DOMContentLoaded", boot);
