/* ============================================================================
   LinguaLeaf — учи английски като игра
   Vanilla JS, без бекенд. Отвори index.html и работи навсякъде.
   ========================================================================== */

const storageKey = "lingualeaf-progress-v4";

const defaultState = {
  user: null,
  xp: 2450,
  streak: 7,
  completedLessons: [],
  activeLevel: "A2",
  currentLessonId: "A2-lesson-1",
  reviews: {},
  soundOn: true,
  stats: { correct: 0, total: 0, streakAnswers: 0 }
};

let state = loadState();
let lessonRun = null;

/* ----------------------------- Persistence ------------------------------- */

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return clone(defaultState);
    return { ...clone(defaultState), ...JSON.parse(saved) };
  } catch (error) {
    return clone(defaultState);
  }
}

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    /* storage недостъпен — продължаваме само в паметта */
  }
}

/* ------------------------------- Sounds ---------------------------------- */
/* Генерираме звуци през Web Audio API — без външни файлове, работи офлайн. */

let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function blip(freq, startAt, duration, type = "sine", peak = 0.18) {
  const ctx = audioCtx;
  if (!ctx) return;
  const t0 = ctx.currentTime + startAt;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function playCorrect() {
  if (!state.soundOn || !ensureAudio()) return;
  // светъл възходящ акорд
  blip(659.25, 0, 0.16, "triangle", 0.2);   // E5
  blip(987.77, 0.08, 0.22, "triangle", 0.2); // B5
  blip(1318.5, 0.16, 0.28, "sine", 0.16);    // E6
}

function playWrong() {
  if (!state.soundOn || !ensureAudio()) return;
  // нисък, мек "не" сигнал
  blip(196, 0, 0.18, "sawtooth", 0.12);  // G3
  blip(146.83, 0.1, 0.3, "sawtooth", 0.12); // D3
}

function playComplete() {
  if (!state.soundOn || !ensureAudio()) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
  notes.forEach((n, i) => blip(n, i * 0.1, 0.32, "triangle", 0.2));
}

function toggleSound() {
  state.soundOn = !state.soundOn;
  if (state.soundOn) {
    ensureAudio();
    playCorrect();
  }
  saveState();
  render();
}

/* -------------------------------- Icons ---------------------------------- */
/* Чисти линейни SVG иконки (currentColor) — по-приятни от emoji. */

const ICONS = {
  flame: '<path d="M12 3c0 3-3 4-3 7a3 3 0 0 0 6 0c0-1.2-.6-2-1.2-2.7C15.5 6.5 13.5 4.5 12 3Z"/><path d="M9.5 14.5c-.6.8-1 1.7-1 2.8a3.5 3.5 0 0 0 7 0c0-1.6-.9-2.6-1.7-3.4"/>',
  gem: '<path d="M6 3h12l3 5-9 13L3 8Z"/><path d="M3 8h18M9 3 7.5 8 12 21M15 3l1.5 5L12 21"/>',
  trophy: '<path d="M7 4h10v4a5 5 0 0 1-10 0Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 14h6M10 14v3h4v-3M8 21h8"/>',
  heart: '<path d="M12 20s-7-4.6-9.3-9C1.2 8 2.8 4.5 6.2 4.5c2 0 3.2 1.2 3.8 2.2.6-1 1.8-2.2 3.8-2.2 3.4 0 5 3.5 3.5 6.5C19 15.4 12 20 12 20Z"/>',
  star: '<path d="M12 3.5 14.4 9l5.6.5-4.3 3.8 1.3 5.6L12 16l-5 2.9 1.3-5.6L4 9.5 9.6 9Z"/>',
  check: '<path d="M5 12.5 10 17l9-10"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  speaker: '<path d="M4 9v6h4l5 4V5L8 9Z"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>',
  pen: '<path d="M4 20l1-4L16 5l3 3L8 19Z"/><path d="M14 7l3 3"/>',
  bolt: '<path d="M13 3 5 13h5l-1 8 8-10h-5Z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  refresh: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4"/>',
  arrow: '<path d="M5 12h13M13 6l6 6-6 6"/>',
  play: '<path d="M7 5v14l12-7Z"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5Z"/><path d="M5 19.5A1.5 1.5 0 0 1 6.5 18H19v3H6.5A1.5 1.5 0 0 1 5 19.5Z"/><path d="M9 7h6M9 10h4"/>',
  // категории
  food: '<path d="M12 8c1.5-3 6-3 6 1 0 5-4 11-6 11S6 14 6 9c0-4 4.5-4 6-1Z"/><path d="M12 8V4M12 4c0-1 1-1.5 2-1.5"/>',
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9M10 19v-5h4v5"/>',
  school: '<path d="M5 5.5A2 2 0 0 1 7 4h12v15H7a2 2 0 0 0-2 2Z"/><path d="M5 19.5A2 2 0 0 1 7 18h12"/>',
  people: '<circle cx="12" cy="9" r="3.5"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>',
  travel: '<path d="M10 16 3 14l1-2 4 .5L13 7c.8-1 2-1.6 3-1l-3 7 4 .8 1-1.5 1.5.5-1.5 3-1.5 3-1.5-.5.2-1.7L13 18Z"/>',
  work: '<rect x="3.5" y="8" width="17" height="11" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3.5 13h17"/>',
  health: '<path d="M3 12h4l2-4 3 8 2-5 2 1h5"/>',
  technology: '<rect x="3" y="5" width="18" height="11" rx="2"/><path d="M2 20h20"/>',
  nature: '<path d="M5 20c0-8 6-13 14-14-1 9-6 14-14 14Z"/><path d="M5 20c2-5 5-7 9-9"/>',
  shopping: '<path d="M6 8h12l-1 11H7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  feelings: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
  time: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  city: '<path d="M4 21V8l5-3v6M9 21V11l5-3v13M14 21V9l6 3v9M4 21h16"/>',
  hobbies: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-1.4 1-2.3-.8-1 0-2.2 1.2-2.2H17a4 4 0 0 0 4-4c0-4.6-4-7.5-9-7.5Z"/><circle cx="8" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="11" r="1" fill="currentColor" stroke="none"/>',
  conversation: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v6A2.5 2.5 0 0 1 17.5 15H10l-4 4v-4H6.5A2.5 2.5 0 0 1 4 12.5Z"/>',
  grammar: '<path d="M11 3 7 3v4M7 3l5 5-5 5M21 13h-4v8h-8v-4"/>',
  stories: '<path d="M12 6c-1.5-1.4-3.6-2-6-2H3v14h3c2.4 0 4.5.6 6 2M12 6c1.5-1.4 3.6-2 6-2h3v14h-3c-2.4 0-4.5.6-6 2M12 6v14"/>',
  culture: '<path d="M4 10a4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 0 4 4 4 4 0 0 0 4-4M6 10V7M18 10V7M9 9h.01M15 9h.01M8 14v2a4 4 0 0 0 8 0v-2"/>',
  plans: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16M8 3v4M16 3v4M9 13h2v3"/>',
  daily: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
  colors: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-1.4 1-2.3-.8-1 0-2.2 1.2-2.2H17a4 4 0 0 0 4-4c0-4.6-4-7.5-9-7.5Z"/>',
  places: '<path d="M12 21c5-5.5 7-8.6 7-12a7 7 0 1 0-14 0c0 3.4 2 6.5 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  learning: '<path d="M12 3 6 6v5c0 4 3 6 6 8 3-2 6-4 6-8V6Z"/><path d="M9.5 12 11 13.5 15 9.5"/>',
  ideas: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 3.5 10.9c-.6.5-.9 1.2-1 2H9.5c-.1-.8-.4-1.5-1-2A6 6 0 0 1 12 3Z"/>',
  academic: '<path d="M3 9 12 5l9 4-9 4Z"/><path d="M7 11v4.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V11M21 9v4"/>',
  sparkles: '<path d="M12 4l1.4 3.6L17 9l-3.6 1.4L12 14l-1.4-3.6L7 9l3.6-1.4ZM18 14l.7 1.8L20.5 16l-1.8.7L18 18.5l-.7-1.8L15.5 16l1.8-.5Z"/>'
};

function icon(name, cls = "") {
  const body = ICONS[name] || ICONS.sparkles;
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

const CATEGORY_ICON = {
  food: "food", home: "home", school: "school", people: "people", travel: "travel",
  work: "work", health: "health", technology: "technology", nature: "nature",
  shopping: "shopping", feelings: "feelings", feeling: "feelings", time: "time",
  city: "city", hobbies: "hobbies", fun: "hobbies", conversation: "conversation",
  grammar: "grammar", stories: "stories", culture: "culture", plans: "plans",
  daily: "daily", "daily life": "daily", basic: "grammar", colors: "colors", places: "places",
  learning: "learning", ideas: "ideas", academic: "academic", thinking: "ideas",
  speaking: "conversation", world: "nature", life: "feelings", jobs: "work",
  social: "people", habits: "target", nuance: "sparkles"
};

function iconFor(theme) {
  return icon(CATEGORY_ICON[theme] || "sparkles");
}

/* ------------------------------- Helpers --------------------------------- */

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/[.!?,;]/g, "");
}

function levelName(level) {
  return LEVELS.find((item) => item.id === level)?.label || level;
}

function levelTitle(level) {
  return LEVELS.find((item) => item.id === level)?.title || level;
}

function userLevel() {
  if (state.xp >= 2500) return 4;
  if (state.xp >= 1200) return 3;
  if (state.xp >= 500) return 2;
  return 1;
}

function levelLessons() {
  return LESSONS.filter((lesson) => lesson.level === state.activeLevel);
}

/* Първият незавършен урок е "границата" — всичко до него е отключено. */
function frontierIndex(lessons = levelLessons()) {
  const idx = lessons.findIndex((lesson) => !state.completedLessons.includes(lesson.id));
  return idx === -1 ? lessons.length - 1 : idx;
}

function nextLesson() {
  const lessons = levelLessons();
  return (
    lessons.find((lesson) => lesson.id === state.currentLessonId) ||
    lessons[frontierIndex(lessons)] ||
    lessons[0]
  );
}

function lessonStatus(lesson, index, lessons = levelLessons()) {
  if (state.completedLessons.includes(lesson.id)) return "done";
  if (index === frontierIndex(lessons)) return "current";
  return index < frontierIndex(lessons) ? "current" : "locked";
}

function courseProgress() {
  const lessons = levelLessons();
  const completed = lessons.filter((lesson) => state.completedLessons.includes(lesson.id)).length;
  return Math.round((completed / lessons.length) * 100);
}

function grammarForLesson(lesson) {
  const index = levelLessons().findIndex((item) => item.id === lesson.id);
  return GRAMMAR_MODULES[index % GRAMMAR_MODULES.length];
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function addXp(points) {
  const before = userLevel();
  state.xp += points;
  const after = userLevel();
  saveState();
  if (after > before) showToast(`Ново ниво! Достигна Level ${after}.`, "win");
}

function showToast(message, kind = "") {
  const toast = document.createElement("div");
  toast.className = `toast ${kind}`;
  toast.innerHTML = `${kind === "win" ? icon("trophy") : icon("sparkles")}<span>${message}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

/* Произношение (TTS) и микрофон — офлайн през браузъра, не са AI чат. */
function speak(text) {
  if (!window.speechSynthesis) {
    showToast("Аудиото не е налично в този браузър.");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function listenFor(word) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("Микрофон проверката изисква Chrome или Edge.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.onresult = (event) => {
    const heard = event.results[0][0].transcript.toLowerCase();
    if (heard.includes(word.english.toLowerCase())) {
      playCorrect();
      showToast("Чудесно произношение!", "win");
    } else {
      showToast(`Чух "${heard}". Опитай отново.`);
    }
  };
  recognition.start();
}

/* ------------------------------- Render ---------------------------------- */

function render() {
  document.getElementById("app").innerHTML = state.user ? appTemplate() : registerTemplate();
  bindEvents();
}

function logoTemplate() {
  return `
    <span class="brand">
      <span class="brand-mark">${icon("nature")}</span>
      <span class="brand-name">Lingua<b>Leaf</b></span>
    </span>
  `;
}

/* ------------------------------ Register --------------------------------- */

function registerTemplate() {
  return `
    <section class="auth">
      <div class="auth-hero">
        <div class="auth-hero-inner">
          ${logoTemplate()}
          <h1>Учи английски като игра — дума по дума, ден след ден.</h1>
          <p>Кратки уроци със звук, граматика и писане. 100 урока, 1000 думи, твое темпо.</p>
          <ul class="auth-points">
            <li>${icon("bolt")}<span>Микро-уроци по 5 минути</span></li>
            <li>${icon("flame")}<span>Серии и XP, които те връщат</span></li>
            <li>${icon("speaker")}<span>Произношение и слушане</span></li>
          </ul>
          <img class="auth-image" src="assets/teacher-hero.jpg" alt="Дружелюбен виртуален учител по английски" />
        </div>
      </div>
      <form class="auth-card" id="registerForm">
        <h2>Влез и започни</h2>
        <p class="auth-sub">Безплатно. Прогресът се пази на това устройство.</p>
        <label>Име<input name="name" value="Иван" autocomplete="name" required /></label>
        <label>Имейл<input name="email" type="email" value="ivan@example.com" autocomplete="email" required /></label>
        <label>Ниво
          <select name="level">
            ${LEVELS.map(
              (level) =>
                `<option value="${level.id}" ${level.id === "A2" ? "selected" : ""}>${level.title} · ${level.label}</option>`
            ).join("")}
          </select>
        </label>
        <button class="btn btn-primary" type="submit">Започни обучението ${icon("arrow")}</button>
        <button class="btn btn-ghost" type="button" id="guestLogin">Влез като гост</button>
      </form>
    </section>
  `;
}

/* -------------------------------- App ------------------------------------ */

function appTemplate() {
  if (lessonRun) {
    return `<section class="lesson-focus">${lessonTemplate()}</section>`;
  }
  return `
    ${topbarTemplate()}
    <div class="page">
      ${heroTemplate()}
      ${ladderTemplate()}
      ${todayTemplate()}
      ${statsTemplate()}
      <footer class="foot">LinguaLeaf · твоят прогрес се пази локално на това устройство.</footer>
    </div>
  `;
}

function topbarTemplate() {
  return `
    <header class="topbar">
      ${logoTemplate()}
      <div class="top-stats">
        <span class="chip chip-flame">${icon("flame")}<b>${state.streak}</b></span>
        <span class="chip chip-gem">${icon("gem")}<b>${state.xp}</b></span>
        <span class="chip chip-trophy">${icon("trophy")}<b>Lvl ${userLevel()}</b></span>
        <button class="sound-toggle ${state.soundOn ? "on" : "off"}" data-toggle-sound
          title="${state.soundOn ? "Звукът е включен" : "Звукът е изключен"}"
          aria-label="${state.soundOn ? "Изключи звука" : "Включи звука"}">
          ${state.soundOn ? icon("speaker") : icon("close")}
        </button>
      </div>
    </header>
  `;
}

function heroTemplate() {
  const lesson = nextLesson();
  return `
    <section class="hero">
      <div class="hero-text">
        <p class="eyebrow">Здравей, ${state.user.name} ${icon("sparkles", "tiny")}</p>
        <h1>Готов за днешния урок?</h1>
        <p class="hero-sub">Следващ: <strong>${lesson.title}</strong> · ${courseProgress()}% от ниво ${levelName(state.activeLevel)}.</p>
      </div>
      <div class="level-tabs" role="tablist" aria-label="Избор на ниво">
        ${LEVELS.map(
          (level) => `
          <button class="level-tab ${level.id === state.activeLevel ? "active" : ""}" data-level="${level.id}" role="tab" aria-selected="${level.id === state.activeLevel}">
            <b>${level.label}</b><small>${level.title}</small>
          </button>`
        ).join("")}
      </div>
    </section>
  `;
}

/* ------------------------------- Ladder ---------------------------------- */
/* Серпентина с уроците — стои най-горе и е "стълбата". */

function ladderTemplate() {
  const lessons = levelLessons();
  const frontier = frontierIndex(lessons);
  const offsets = [0, 1.1, 1.7, 1.1, 0, -1.1, -1.7, -1.1]; // нежна S-крива

  const nodes = lessons
    .map((lesson, index) => {
      const status = lessonStatus(lesson, index, lessons);
      const isCurrent = index === frontier;
      const sectionTip = index % 5 === 0;
      const offset = offsets[index % offsets.length];
      const inner =
        status === "done"
          ? icon("check")
          : status === "locked"
          ? icon("lock")
          : isCurrent
          ? icon("star")
          : iconFor(lesson.theme);
      return `
        ${sectionTip ? `<div class="ladder-section">${icon("sparkles", "tiny")} Раздел ${index / 5 + 1}</div>` : ""}
        <div class="node-row" style="--off:${offset}">
          ${isCurrent ? '<span class="node-flag">Старт</span>' : ""}
          <button
            class="node node-${status} ${isCurrent ? "node-current" : ""}"
            data-lesson-id="${lesson.id}"
            data-locked="${status === "locked"}"
            title="${lesson.title}"
            aria-label="${lesson.title}${status === "locked" ? " (заключен)" : ""}">
            <span class="node-face">${inner}</span>
            ${status === "current" && !isCurrent ? "" : ""}
          </button>
          <span class="node-caption">${lesson.theme}</span>
        </div>
      `;
    })
    .join("");

  return `
    <section class="ladder-wrap" id="ladder">
      <div class="ladder-head">
        <div>
          <h2>Пътеката</h2>
          <p>Урок ${frontier + 1} от ${lessons.length} · ниво ${levelName(state.activeLevel)}</p>
        </div>
        <button class="btn btn-primary btn-sm" data-start-current>
          ${icon("play")} Продължи
        </button>
      </div>
      <div class="ladder">
        <span class="ladder-spine"></span>
        ${nodes}
        <div class="ladder-end">${icon("trophy")} Ниво ${levelName(state.activeLevel)} завършено на ${courseProgress()}%</div>
      </div>
    </section>
  `;
}

/* ------------------------------- Today ----------------------------------- */

function todayTemplate() {
  const lesson = nextLesson();
  const grammar = grammarForLesson(lesson);
  return `
    <section class="today">
      <article class="card today-main">
        <p class="eyebrow">Днешен урок</p>
        <h3>Учи 10 нови думи</h3>
        <p class="muted">Дума → правило → задача → писане → точки.</p>
        <button class="btn btn-primary" data-start-current>${icon("play")} Стартирай урока</button>
        <div class="progress"><span style="width:${courseProgress()}%"></span></div>
        <small class="muted">${courseProgress()}% завършено за ниво ${levelName(state.activeLevel)}</small>
      </article>

      <article class="card words-card">
        <div class="card-head">
          <strong>Дневни думи</strong>
          <span class="pill">${icon("book")}10 думи</span>
        </div>
        <div class="word-chips">
          ${lesson.words
            .slice(0, 6)
            .map(
              (word) => `
            <div class="word-chip">
              <span class="word-ic">${iconFor(word.image || word.category)}</span>
              <span class="word-en">${word.english}</span>
              <span class="word-bg">${word.bulgarian}</span>
            </div>`
            )
            .join("")}
        </div>
      </article>

      <article class="card concept-card">
        <div class="card-head"><strong>Днешна концепция</strong></div>
        <div class="concept">
          <span class="concept-ic grammar">${icon("grammar")}</span>
          <div><b>${grammar.title}</b><small>${grammar.rule}</small></div>
        </div>
        <div class="concept">
          <span class="concept-ic write">${icon("pen")}</span>
          <div><b>Писане</b><small>Съставяш изречение и получаваш мигновена обратна връзка.</small></div>
        </div>
        <div class="concept">
          <span class="concept-ic listen">${icon("speaker")}</span>
          <div><b>Слушане</b><small>Чуваш произношението на всяка дума.</small></div>
        </div>
      </article>
    </section>
  `;
}

/* ------------------------------- Stats ----------------------------------- */

function statsTemplate() {
  const dueReviews = Object.values(state.reviews).filter(
    (review) => new Date(review.next) <= new Date()
  ).length;
  const accuracy = state.stats.total ? Math.round((state.stats.correct / state.stats.total) * 100) : 0;
  const items = [
    { ic: "target", val: `${accuracy}%`, label: "точност" },
    { ic: "refresh", val: dueReviews, label: "за повторение" },
    { ic: "check", val: state.completedLessons.length, label: "завършени урока" },
    { ic: "flame", val: `${state.streak} дни`, label: "серия" }
  ];
  return `
    <section class="stats">
      ${items
        .map(
          (item) => `
        <article class="stat">
          <span class="stat-ic">${icon(item.ic)}</span>
          <strong>${item.val}</strong>
          <small>${item.label}</small>
        </article>`
        )
        .join("")}
    </section>
  `;
}

/* ----------------------------- Lesson flow ------------------------------- */

function lessonTemplate() {
  const lesson = nextLesson();
  if (!lessonRun) return "";
  if (lessonRun.finished) return lessonResultTemplate(lesson);
  return lessonSlideTemplate(lesson);
}

function lessonSlideTemplate(lesson) {
  const slides = buildLessonSlides(lesson);
  const slide = slides[lessonRun.slideIndex];
  const answer = lessonRun.answers[slide.id];
  const progress = Math.round((lessonRun.slideIndex / slides.length) * 100);
  return `
    <div class="run-top">
      <button class="run-close" data-cancel-lesson aria-label="Затвори урока">${icon("close")}</button>
      <div class="run-progress"><span style="width:${progress}%"></span></div>
      <span class="run-hearts">${icon("heart", "heart-ic")}<b>${lessonRun.hearts}</b></span>
    </div>
    <div class="slide-stage">
      <div class="slide-card">
        ${slideTemplate(slide, answer)}
      </div>
    </div>
    ${answer ? feedbackTemplate(slide, answer, slides) : ""}
  `;
}

function slideTemplate(slide, answer) {
  if (slide.type === "teach") return teachSlide(slide.word);
  if (slide.type === "grammar-rule") return grammarRuleSlide(slide);
  if (slide.type === "choice" || slide.type === "listen") return choiceSlide(slide, answer);
  if (slide.type === "text" || slide.type === "grammar-input") return textSlide(slide, answer);
  if (slide.type === "order") return orderSlide(slide, answer);
  if (slide.type === "ai-writing") return writingSlide(slide, answer);
  return "";
}

function teachSlide(word) {
  return `
    <div class="slide teach">
      <div class="teach-visual">${iconFor(word.image || word.category)}</div>
      <p class="eyebrow">Запомни</p>
      <h2 class="teach-en">${word.english}</h2>
      <p class="teach-bg">${word.bulgarian}</p>
      <p class="teach-ex">“${word.sentence}”</p>
      <div class="teach-actions">
        <button class="icon-btn" data-speak="${word.english}" title="Чуй">${icon("speaker")} Чуй</button>
        <button class="icon-btn" data-repeat="${word.id}" title="Повтори">${icon("mic")} Повтори</button>
      </div>
      <button class="btn btn-primary slide-cta" data-next-slide>Продължи ${icon("arrow")}</button>
    </div>
  `;
}

function grammarRuleSlide(slide) {
  return `
    <div class="slide rule">
      <div class="teach-visual rule-visual">${icon("grammar")}</div>
      <p class="eyebrow">Мини правило</p>
      <h2>${slide.title}</h2>
      <p class="teach-bg">${slide.rule}</p>
      <p class="teach-ex">${slide.example}</p>
      <button class="btn btn-primary slide-cta" data-next-slide>Ясно, дай задача ${icon("arrow")}</button>
    </div>
  `;
}

function choiceSlide(slide, answer) {
  return `
    <div class="slide ex">
      <p class="eyebrow">${slide.title}</p>
      <h2 class="ex-q">${slide.question}</h2>
      ${slide.audio ? `<button class="sound-orb" data-speak="${slide.audio}" title="Чуй пак">${icon("speaker")}</button>` : ""}
      <div class="choices">
        ${slide.options
          .map((option) => {
            const chosen = answer?.given === option;
            const cls = answer ? (option === slide.answer ? "right" : chosen ? "wrong" : "dim") : "";
            return `<button class="choice ${chosen ? "chosen" : ""} ${cls}" data-choice-slide="${slide.id}" data-choice="${escapeAttr(option)}" ${answer ? "disabled" : ""}>${option}</button>`;
          })
          .join("")}
      </div>
    </div>
  `;
}

function textSlide(slide, answer) {
  return `
    <div class="slide ex">
      <p class="eyebrow">${slide.title}</p>
      <h2 class="ex-q">${slide.question}</h2>
      <input class="answer-input" id="answerInput" value="${answer ? escapeAttr(answer.given) : ""}" placeholder="Напиши отговора..." autocomplete="off" autocapitalize="off" ${answer ? "disabled" : ""} />
      ${!answer ? `<button class="btn btn-primary slide-cta" data-check-slide="${slide.id}">Провери</button>` : ""}
    </div>
  `;
}

function orderSlide(slide, answer) {
  return `
    <div class="slide ex">
      <p class="eyebrow">${slide.title}</p>
      <h2 class="ex-q">${slide.question}</h2>
      <div class="choices">
        ${slide.options
          .map((option) => {
            const chosen = answer?.given === option;
            const cls = answer ? (option === slide.answer ? "right" : chosen ? "wrong" : "dim") : "";
            return `<button class="choice block ${chosen ? "chosen" : ""} ${cls}" data-choice-slide="${slide.id}" data-choice="${escapeAttr(option)}" ${answer ? "disabled" : ""}>${option}</button>`;
          })
          .join("")}
      </div>
    </div>
  `;
}

function writingSlide(slide, answer) {
  return `
    <div class="slide ex writing">
      <p class="eyebrow">${icon("pen", "tiny")} Писане</p>
      <h2 class="ex-q">${slide.question}</h2>
      <p class="muted">${slide.hint}</p>
      <textarea id="writingInput" class="writing-input" placeholder="Напиши изречението си тук..." ${answer ? "disabled" : ""}>${answer ? answer.given : ""}</textarea>
      ${!answer ? `<button class="btn btn-primary slide-cta" data-ai-writing="${slide.id}">Провери писането</button>` : ""}
      ${
        answer?.correction
          ? `<div class="write-feedback">
              <strong>Оценка: ${answer.score ?? "..."}/100</strong>
              <p>${answer.correction}</p>
              ${answer.explanation ? `<small>${answer.explanation}</small>` : ""}
            </div>`
          : ""
      }
    </div>
  `;
}

function feedbackTemplate(slide, answer, slides) {
  const last = lessonRun.slideIndex === slides.length - 1;
  const good = answer.correct;
  const label = good ? "Вярно!" : slide.type === "ai-writing" ? "Запомни поправката:" : "Близо! Верният отговор е:";
  const detail = slide.type === "ai-writing"
    ? `+${answer.points || 0} XP`
    : good
    ? `+${answer.points || 10} XP`
    : slide.answer;
  return `
    <div class="feedback ${good ? "ok" : "no"}">
      <div class="feedback-text">
        <span class="feedback-ic">${good ? icon("check") : icon("close")}</span>
        <div><strong>${label}</strong><p>${detail}</p></div>
      </div>
      <button class="btn ${good ? "btn-feedback-ok" : "btn-feedback-no"}" data-next-slide>${last ? "Виж резултата" : "Продължи"}</button>
    </div>
  `;
}

function lessonResultTemplate(lesson) {
  const totalExercises = buildLessonSlides(lesson).filter(
    (slide) => !["teach", "grammar-rule"].includes(slide.type)
  ).length;
  const mistakes = lessonRun.mistakes;
  const perfect = mistakes.length === 0;
  return `
    <div class="run-top">
      <button class="run-close" data-cancel-lesson aria-label="Затвори">${icon("close")}</button>
      <div class="run-progress"><span style="width:100%"></span></div>
      <span class="run-hearts">${icon("heart", "heart-ic")}<b>${lessonRun.hearts}</b></span>
    </div>
    <div class="slide-stage">
      <div class="result">
        <div class="result-badge ${perfect ? "perfect" : ""}">${icon(perfect ? "trophy" : "star")}</div>
        <p class="eyebrow">Урокът приключи</p>
        <h2>${perfect ? "Перфектна сесия!" : `${mistakes.length} за повторение`}</h2>
        <div class="result-grid">
          <div><strong>${totalExercises - mistakes.length}/${totalExercises}</strong><small>верни</small></div>
          <div><strong>${lessonRun.hearts}/5</strong><small>сърца</small></div>
          <div><strong>+${lessonRun.xpEarned}</strong><small>XP</small></div>
        </div>
        ${
          perfect
            ? `<p class="good">Нямаш грешки — продължавай така!</p>`
            : `<div class="mistakes">
                <h3>Повтори това</h3>
                ${mistakes
                  .map(
                    (m) => `<div class="mistake">
                      <strong>${m.question}</strong>
                      <span>Ти: ${m.given || "—"}</span>
                      <span class="ok-ans">Правилно: ${m.answer}</span>
                    </div>`
                  )
                  .join("")}
              </div>`
        }
        <div class="result-actions">
          <button class="btn btn-ghost" data-review-lesson>${icon("refresh")} Повтори</button>
          <button class="btn btn-primary" data-finish-lesson>Вземи наградата ${icon("arrow")}</button>
        </div>
      </div>
    </div>
  `;
}

function buildLessonSlides(lesson) {
  const w = lesson.words;
  const grammar = grammarForLesson(lesson);
  return [
    { id: `teach-${w[0].id}`, type: "teach", word: w[0] },
    { id: "choice-1", type: "choice", title: "Избери превода", question: `Какво означава „${w[0].english}“?`, answer: w[0].bulgarian, options: shuffle([w[0].bulgarian, w[1].bulgarian, w[2].bulgarian]) },
    { id: "grammar-rule", type: "grammar-rule", ...grammar },
    { id: "grammar-input", type: "grammar-input", title: "Граматика в действие", question: grammar.prompt, answer: grammar.answer },
    { id: `teach-${w[1].id}`, type: "teach", word: w[1] },
    { id: "listen-1", type: "listen", title: "Слушане", question: "Какво чу?", answer: w[1].sentence, options: shuffle([w[1].sentence, w[2].sentence, w[3].sentence]), audio: w[1].sentence },
    { id: "translate-1", type: "text", title: "Преведи на английски", question: w[2].bulgarian, answer: w[2].english },
    { id: "writing-1", type: "ai-writing", question: `Напиши изречение с „${w[2].english}“.`, hint: `Опитай да включиш правилото „${grammar.title}“.`, targetWord: w[2].english, grammarTitle: grammar.title },
    { id: "order-1", type: "order", title: "Подреди изречението", question: "am / I / student / a", answer: "I am a student", options: shuffle(["I am a student", "I student am a", "A student I am"]) },
    { id: `teach-${w[4].id}`, type: "teach", word: w[4] },
    { id: "choice-2", type: "choice", title: "Избери думата", question: `Кое е „${w[4].bulgarian}“?`, answer: w[4].english, options: shuffle([w[4].english, w[5].english, w[6].english]) },
    { id: "writing-2", type: "ai-writing", question: "Отговори на английски: What do you usually do every day?", hint: `Използвай поне една дума: ${w.slice(0, 5).map((word) => word.english).join(", ")}.`, targetWord: w[4].english, grammarTitle: grammar.title }
  ];
}

function startLesson() {
  ensureAudio();
  lessonRun = {
    lessonId: nextLesson().id,
    slideIndex: 0,
    answers: {},
    mistakes: [],
    xpEarned: 0,
    hearts: 5,
    finished: false
  };
  render();
  window.scrollTo({ top: 0 });
}

function nextSlide() {
  const slides = buildLessonSlides(nextLesson());
  if (lessonRun.slideIndex >= slides.length - 1) {
    lessonRun.finished = true;
    playComplete();
  } else {
    lessonRun.slideIndex += 1;
  }
  render();
  document.querySelector(".slide-stage")?.scrollTo({ top: 0 });
  window.scrollTo({ top: 0 });
}

function submitSlideAnswer(slide, given) {
  if (lessonRun.answers[slide.id]) return;
  const correct = normalize(given) === normalize(slide.answer);
  const points = correct ? 10 : 0;
  lessonRun.answers[slide.id] = { given, correct, points };
  state.stats.total += 1;

  if (correct) {
    playCorrect();
    state.stats.correct += 1;
    state.stats.streakAnswers += 1;
    lessonRun.xpEarned += points;
    addXp(points);
    if (state.stats.streakAnswers % 5 === 0) {
      lessonRun.xpEarned += 50;
      addXp(50);
    }
  } else {
    playWrong();
    state.stats.streakAnswers = 0;
    lessonRun.hearts = Math.max(0, lessonRun.hearts - 1);
    lessonRun.mistakes.push({ question: slide.question, given, answer: slide.answer });
  }
  saveState();
  render();
}

function submitWritingAnswer(slide, given) {
  if (lessonRun.answers[slide.id]) return;
  if (!given.trim()) {
    showToast("Напиши поне едно изречение.");
    return;
  }
  const result = localWritingEvaluation(slide, given);
  const correct = result.score >= 60;
  const points = result.score >= 85 ? 25 : result.score >= 60 ? 15 : result.score >= 35 ? 5 : 0;

  lessonRun.answers[slide.id] = {
    given,
    correct,
    points,
    score: result.score,
    correction: result.correction,
    explanation: result.explanation
  };

  state.stats.total += 1;
  if (correct) {
    playCorrect();
    state.stats.correct += 1;
    state.stats.streakAnswers += 1;
    lessonRun.xpEarned += points;
    addXp(points);
  } else {
    playWrong();
    state.stats.streakAnswers = 0;
    lessonRun.hearts = Math.max(0, lessonRun.hearts - 1);
    lessonRun.mistakes.push({ question: slide.question, given, answer: result.correction });
  }
  saveState();
  render();
}

function localWritingEvaluation(slide, answer) {
  const hasTarget = normalize(answer).includes(normalize(slide.targetWord));
  const hasVerb = /\b(am|is|are|was|were|work|works|go|goes|like|likes|have|has|do|does|study|studies|want|need|can)\b/i.test(answer);
  const longEnough = answer.trim().length > 18;
  const score = Math.min(100, 35 + (hasTarget ? 35 : 0) + (hasVerb ? 20 : 0) + (longEnough ? 10 : 0));
  return {
    score,
    correction: hasTarget ? answer.trim() : `${answer.trim()} → опитай с „${slide.targetWord}“`,
    explanation: hasTarget
      ? "Добър опит! Пробвай и по-дълго изречение."
      : `Включи думата „${slide.targetWord}“ за повече точки.`
  };
}

function finishLesson() {
  const lesson = nextLesson();
  if (!state.completedLessons.includes(lesson.id)) {
    state.completedLessons.push(lesson.id);
    lessonRun.xpEarned += 100;
    addXp(100);
  }
  scheduleReviews(lesson.words);
  const lessons = levelLessons();
  const index = lessons.findIndex((item) => item.id === lesson.id);
  state.currentLessonId = lessons[Math.min(index + 1, lessons.length - 1)].id;
  lessonRun = null;
  saveState();
  showToast("Урокът е завършен! +100 XP", "win");
  render();
  window.scrollTo({ top: 0 });
}

function scheduleReviews(words) {
  const intervals = [1, 3, 7, 30];
  words.forEach((word) => {
    const old = state.reviews[word.id] || { step: 0 };
    const step = Math.min(old.step + 1, intervals.length - 1);
    const next = new Date();
    next.setDate(next.getDate() + intervals[step]);
    state.reviews[word.id] = {
      step,
      next: next.toISOString(),
      english: word.english,
      bulgarian: word.bulgarian
    };
  });
}

/* ------------------------------- Utils ----------------------------------- */

function escapeAttr(value) {
  return String(value).replace(/"/g, "&quot;");
}

/* ------------------------------- Events ---------------------------------- */

function bindEvents() {
  // Регистрация
  document.querySelector("#registerForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    ensureAudio();
    const form = new FormData(event.target);
    state.user = { name: form.get("name"), email: form.get("email"), provider: "email" };
    state.activeLevel = form.get("level");
    state.currentLessonId = `${state.activeLevel}-lesson-1`;
    saveState();
    render();
  });

  document.querySelector("#guestLogin")?.addEventListener("click", () => {
    ensureAudio();
    state.user = { name: "Гост", email: "guest@lingualeaf.app", provider: "guest" };
    state.currentLessonId = `${state.activeLevel}-lesson-1`;
    saveState();
    render();
  });

  // Звук
  document.querySelector("[data-toggle-sound]")?.addEventListener("click", toggleSound);

  // Нива
  document.querySelectorAll("[data-level]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeLevel = button.dataset.level;
      const lessons = levelLessons();
      state.currentLessonId = lessons[frontierIndex(lessons)].id;
      saveState();
      render();
    });
  });

  // Стартиране от текущия урок
  document.querySelectorAll("[data-start-current]").forEach((button) =>
    button.addEventListener("click", () => {
      const lessons = levelLessons();
      state.currentLessonId = lessons[frontierIndex(lessons)].id;
      startLesson();
    })
  );

  // Клик на възел от стълбата
  document.querySelectorAll("[data-lesson-id]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.locked === "true") {
        showToast("Първо завърши предишните уроци.");
        playWrong();
        return;
      }
      state.currentLessonId = button.dataset.lessonId;
      saveState();
      startLesson();
    });
  });

  // Навигация в урока
  document.querySelector("[data-next-slide]")?.addEventListener("click", nextSlide);
  document.querySelector("[data-review-lesson]")?.addEventListener("click", startLesson);
  document.querySelector("[data-finish-lesson]")?.addEventListener("click", finishLesson);
  document.querySelector("[data-cancel-lesson]")?.addEventListener("click", () => {
    lessonRun = null;
    render();
    window.scrollTo({ top: 0 });
  });

  // Задачи с избор
  document.querySelectorAll("[data-choice-slide]").forEach((button) => {
    button.addEventListener("click", () => {
      const slide = buildLessonSlides(nextLesson()).find((item) => item.id === button.dataset.choiceSlide);
      submitSlideAnswer(slide, button.dataset.choice);
    });
  });

  // Текстови задачи
  document.querySelectorAll("[data-check-slide]").forEach((button) => {
    const submit = () => {
      const slide = buildLessonSlides(nextLesson()).find((item) => item.id === button.dataset.checkSlide);
      submitSlideAnswer(slide, document.getElementById("answerInput").value);
    };
    button.addEventListener("click", submit);
  });
  document.getElementById("answerInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      document.querySelector("[data-check-slide]")?.click();
    }
  });

  // Писане
  document.querySelectorAll("[data-ai-writing]").forEach((button) => {
    button.addEventListener("click", () => {
      const slide = buildLessonSlides(nextLesson()).find((item) => item.id === button.dataset.aiWriting);
      submitWritingAnswer(slide, document.getElementById("writingInput").value);
    });
  });

  // Звук на думи / микрофон
  document.querySelectorAll("[data-speak]").forEach((button) =>
    button.addEventListener("click", () => speak(button.dataset.speak))
  );
  document.querySelectorAll("[data-repeat]").forEach((button) => {
    const word = nextLesson().words.find((item) => item.id === button.dataset.repeat);
    if (word) button.addEventListener("click", () => listenFor(word));
  });
}

/* -------------------------------- Init ----------------------------------- */

// Разблокираме аудиото при първи жест на потребителя.
["pointerdown", "keydown", "touchstart"].forEach((evt) =>
  window.addEventListener(evt, () => ensureAudio(), { once: true, passive: true })
);

render();
