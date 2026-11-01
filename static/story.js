// Sistema de XP + level + toast. Persiste em localStorage.

const KEY = "dslab-story-v2";
const LEVELS = [
  { min: 0,   name: "Iniciante" },
  { min: 20,  name: "Estagiário" },
  { min: 40,  name: "Júnior" },
  { min: 70,  name: "Pleno" },
  { min: 100, name: "Sênior" }
];

let state = { xp: 0, quiz: {}, badges: [] };

export function initStory() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch {}
  renderLevel();
}

export function addXP(amount, reason = "") {
  const before = levelName();
  state.xp += amount;
  save();
  renderLevel();
  toast(`+${amount} XP${reason ? " · " + reason : ""}`);
  const after = levelName();
  if (after !== before) {
    toast(`Nível: ${after}`, true);
  }
}

export function registerQuiz(conceptId, correct, firstTry) {
  const prev = state.quiz[conceptId] || { correct: false, attempts: 0 };
  state.quiz[conceptId] = {
    correct: correct || prev.correct,
    attempts: prev.attempts + 1,
    firstTry: prev.attempts === 0 && correct && firstTry
  };
  save();
}

export function quizCorrect(conceptId) {
  return !!(state.quiz[conceptId] && state.quiz[conceptId].correct);
}

export function unlockBadge(name) {
  if (state.badges.includes(name)) return;
  state.badges.push(name);
  save();
  toast(`Badge: ${name}`, true);
}

export function getState() { return state; }

function levelName() {
  return LEVELS.reduce((acc, l) => state.xp >= l.min ? l : acc, LEVELS[0]).name;
}

function renderLevel() {
  const lvl = levelName();
  const next = LEVELS.find(l => l.min > state.xp);
  const fill = next
    ? ((state.xp - LEVELS.filter(l => l.min <= state.xp).pop().min)
       / (next.min - LEVELS.filter(l => l.min <= state.xp).pop().min)) * 100
    : 100;

  // Injeta UI de XP no topbar se ainda não existe
  let box = document.querySelector(".player-xp");
  if (!box) {
    box = document.createElement("div");
    box.className = "player-xp";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Seu progresso");
    box.innerHTML =
      '<span class="xp-level"></span>' +
      '<span class="xp-bar"><span class="xp-fill"></span></span>' +
      '<span class="xp-text"></span>';
    const topbar = document.querySelector(".topbar");
    if (topbar) topbar.insertBefore(box, topbar.children[1] || null);
  }
  box.querySelector(".xp-level").textContent = lvl;
  box.querySelector(".xp-text").textContent = state.xp + " XP";
  box.querySelector(".xp-fill").style.width = fill + "%";
}

let toastTimer = null;
function toast(msg, big = false) {
  let t = document.getElementById("xp-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "xp-toast";
    t.className = "xp-toast";
    t.setAttribute("role", "status");
    document.body.appendChild(t);
  }
  t.classList.toggle("big", big);
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
