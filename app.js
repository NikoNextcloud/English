const storageKey = "wordjoy-english-progress-v2";

const defaultState = {
  user: null,
  xp: 2450,
  streak: 7,
  completedLessons: [],
  activeLevel: "A2",
  currentLessonId: "A2-lesson-1",
  reviews: {},
  chat: [{ from: "ai", text: "Hello! I am your English teacher. What is your name?" }],
  aiStatus: "checking",
  stats: { correct: 0, total: 0, streakAnswers: 0 }
};

let state = loadState();
let lessonRun = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return clone(defaultState);
  return { ...clone(defaultState), ...JSON.parse(saved) };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function userLevel() {
  if (state.xp >= 2500) return 4;
  if (state.xp >= 1200) return 3;
  if (state.xp >= 500) return 2;
  return 1;
}

function nextLesson() {
  return LESSONS.find((lesson) => lesson.id === state.currentLessonId) || LESSONS.find((lesson) => lesson.level === state.activeLevel);
}

function levelLessons() {
  return LESSONS.filter((lesson) => lesson.level === state.activeLevel);
}

function courseProgress() {
  const lessons = levelLessons();
  const completed = lessons.filter((lesson) => state.completedLessons.includes(lesson.id)).length;
  return Math.round((completed / lessons.length) * 100);
}

function levelName(level) {
  return LEVELS.find((item) => item.id === level)?.label || level;
}

function addXp(points) {
  const before = userLevel();
  state.xp += points;
  const after = userLevel();
  saveState();
  if (after > before) showToast(`Congratulations! You reached Level ${after}.`);
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function speak(text) {
  if (!window.speechSynthesis) {
    showToast("Аудиото не е налично в този браузър.");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
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
    showToast(heard.includes(word.english.toLowerCase()) ? "Great pronunciation!" : `I heard "${heard}". Try again slowly.`);
  };
  recognition.start();
}

function iconFor(theme) {
  const icons = {
    food: "🍎", home: "🏠", school: "📚", people: "🙂", travel: "✈️", work: "💼", health: "💪",
    technology: "💻", nature: "🌿", shopping: "🛍️", feelings: "⭐", time: "⏰", city: "🏙️",
    hobbies: "🎨", conversation: "💬", grammar: "🧩", stories: "📖", culture: "🎭", plans: "🗓️",
    daily: "☀️", basic: "🔤", colors: "🎨", places: "📍", learning: "🚀", ideas: "💡", academic: "🎓"
  };
  return icons[theme] || "✨";
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/[.!?]/g, "");
}

function render() {
  document.getElementById("app").innerHTML = state.user ? appTemplate() : registerTemplate();
  bindEvents();
  if (state.user && state.aiStatus === "checking") checkAiStatus();
}

function registerTemplate() {
  return `
    <section class="register-layout">
      <div class="hero-copy">
        <p class="eyebrow">WordJoy English</p>
        <h1>Учи английски като игра: кратки задачи, серии и бърза обратна връзка.</h1>
        <p>Всеки ден получаваш малък урок с 10 думи, звук, картинки и упражнения за A1, A2, B1-B2 и C1-C2.</p>
        <img class="hero-image" src="assets/teacher-hero.png" alt="Friendly virtual English teacher with flashcards" />
      </div>
      <form class="auth-panel" id="registerForm">
        <h2>Регистрация</h2>
        <label>Име<input name="name" value="Ivan" required /></label>
        <label>Имейл<input name="email" type="email" value="ivan@example.com" required /></label>
        <label>Избери ниво
          <select name="level">
            ${LEVELS.map((level) => `<option value="${level.id}" ${level.id === "A2" ? "selected" : ""}>${level.title} (${level.label})</option>`).join("")}
          </select>
        </label>
        <button class="primary-button" type="submit">Започни обучението</button>
        <button class="google-button" type="button" id="googleLogin">Вход с Google</button>
      </form>
    </section>
  `;
}

function appTemplate() {
  return `
    <nav class="topbar">
      <strong>WordJoy English</strong>
      <div class="top-status">
        <span>🔥 ${state.streak}</span>
        <span>💎 ${state.xp}</span>
        <span>🏆 Level ${userLevel()}</span>
      </div>
      <div class="nav-pills">
        <button data-scroll="dashboard">Пътека</button>
        <button data-scroll="lesson">Урок</button>
        <button data-scroll="chat">AI чат</button>
        <button data-scroll="stats">Статистика</button>
      </div>
    </nav>
    ${dashboardTemplate()}
    ${lessonTemplate()}
    ${grammarTemplate()}
    ${chatTemplate()}
    ${statsTemplate()}
  `;
}

function dashboardTemplate() {
  const lesson = nextLesson();
  const lessons = levelLessons();
  const lessonNumber = lessons.findIndex((item) => item.id === lesson.id) + 1;
  return `
    <section id="dashboard" class="dashboard duo-dashboard">
      <div class="welcome">
        <p class="eyebrow">Привет, ${state.user.name}!</p>
        <h1>Продължи по учебната пътека.</h1>
        <p>Следващ урок: <strong>${lesson.title}</strong>. Напредък за ниво ${levelName(state.activeLevel)}: ${courseProgress()}%.</p>
        <div class="dashboard-actions">
          <button class="primary-button big-action" data-start-lesson>Стартирай урока</button>
          <button class="ghost-button" data-scroll="lesson">Виж урока</button>
        </div>
      </div>
      <div class="path-panel">
        <div class="path-header">
          <strong>Раздел ${Math.ceil(lessonNumber / 5)}</strong>
          <small>Урок ${lessonNumber} от ${lessons.length}</small>
        </div>
        ${pathTemplate(lessons)}
      </div>
      <div class="metric"><span>🔥</span><strong>${state.streak} дни</strong><small>дневна серия</small></div>
      <div class="metric"><span>💎</span><strong>${state.xp} XP</strong><small>точки</small></div>
      <div class="metric"><span>📚</span><strong>${lessonNumber}/${lessons.length}</strong><small>текущ урок</small></div>
      <div class="progress-line"><span style="width:${courseProgress()}%"></span></div>
      <p class="progress-caption">${courseProgress()}% завършен курс за ниво ${levelName(state.activeLevel)}</p>
    </section>
  `;
}

function pathTemplate(lessons) {
  const currentId = nextLesson().id;
  return `
    <div class="lesson-path">
      ${lessons.slice(0, 12).map((lesson, index) => {
        const completed = state.completedLessons.includes(lesson.id);
        const current = lesson.id === currentId;
        const locked = !completed && !current && index > lessons.findIndex((item) => item.id === currentId);
        return `
          <button class="path-node ${completed ? "done" : ""} ${current ? "current" : ""} ${locked ? "locked" : ""}" ${current ? "data-start-lesson" : ""}>
            <span>${completed ? "✓" : locked ? "🔒" : index + 1}</span>
            <small>${lesson.theme}</small>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function lessonTemplate() {
  const lesson = nextLesson();
  if (!lessonRun) return lessonStartTemplate(lesson);
  if (lessonRun.finished) return lessonResultTemplate(lesson);
  return lessonSlideTemplate(lesson);
}

function lessonStartTemplate(lesson) {
  const lessons = levelLessons();
  const lessonNumber = lessons.findIndex((item) => item.id === lesson.id) + 1;
  return `
    <section id="lesson" class="lesson-stage">
      <div class="lesson-intro">
        <p class="eyebrow">${levelName(lesson.level)} · ${lesson.theme}</p>
        <h2>${lesson.title}</h2>
        <p>Урокът е като игра: имаш 5 сърца, кратки задачи, моментална проверка и финален отчет с грешките.</p>
        <div class="lesson-progress-card">
          <div>
            <strong>Урок ${lessonNumber} от ${lessons.length}</strong>
            <small>${courseProgress()}% завършен курс</small>
          </div>
          <div class="mini-progress"><span style="width:${courseProgress()}%"></span></div>
        </div>
        <button class="primary-button big-action" data-start-lesson>Старт</button>
      </div>
      <div class="skill-preview">
        <h3>Днес ще тренираш</h3>
        ${lesson.words.slice(0, 6).map((word) => `
          <article>
            <span>${iconFor(word.image || word.category)}</span>
            <div><strong>${word.english}</strong><small>${word.bulgarian}</small></div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function lessonSlideTemplate(lesson) {
  const slides = buildLessonSlides(lesson);
  const slide = slides[lessonRun.slideIndex];
  const answer = lessonRun.answers[slide.id];
  const progress = Math.round(((lessonRun.slideIndex + 1) / slides.length) * 100);
  return `
    <section id="lesson" class="lesson-stage single duo-lesson">
      <div class="lesson-run-top">
        <button class="close-lesson" data-cancel-lesson title="Затвори">×</button>
        <div class="mini-progress"><span style="width:${progress}%"></span></div>
        <strong class="heart-count">${"♥".repeat(lessonRun.hearts)}${"♡".repeat(5 - lessonRun.hearts)}</strong>
      </div>
      <div class="slide-shell duo-shell">
        ${slideTemplate(slide, answer)}
      </div>
      ${answer ? feedbackTemplate(slide, answer, slides) : ""}
    </section>
  `;
}

function slideTemplate(slide, answer) {
  if (slide.type === "teach") return teachSlideTemplate(slide.word);
  if (slide.type === "choice") return choiceSlideTemplate(slide, answer);
  if (slide.type === "text") return textSlideTemplate(slide, answer);
  if (slide.type === "order") return orderSlideTemplate(slide, answer);
  if (slide.type === "listen") return choiceSlideTemplate(slide, answer);
  return "";
}

function teachSlideTemplate(word) {
  return `
    <article class="learning-slide teach-card">
      <div class="slide-visual">${iconFor(word.image || word.category)}</div>
      <p class="eyebrow">Запомни</p>
      <h2>${word.english}</h2>
      <p class="translation">${word.bulgarian}</p>
      <p class="example">"${word.sentence}"</p>
      <div class="card-actions center">
        <button title="Listen" data-speak="${word.english}">🔊 Чуй</button>
        <button title="Repeat" data-repeat="${word.id}">🎙️ Повтори</button>
      </div>
      <button class="primary-button check-button" data-next-slide>Продължи</button>
    </article>
  `;
}

function choiceSlideTemplate(slide, answer) {
  return `
    <article class="learning-slide exercise-slide duo-question">
      <p class="eyebrow">${slide.title}</p>
      <h2>${slide.question}</h2>
      ${slide.audio ? `<button class="listen-button sound-orb" data-speak="${slide.audio}">🔊</button>` : ""}
      <div class="choice-grid">
        ${slide.options.map((option) => `
          <button class="${answer?.given === option ? "selected" : ""}" data-choice-slide="${slide.id}" data-choice="${option}" ${answer ? "disabled" : ""}>${option}</button>
        `).join("")}
      </div>
    </article>
  `;
}

function textSlideTemplate(slide, answer) {
  return `
    <article class="learning-slide exercise-slide duo-question">
      <p class="eyebrow">${slide.title}</p>
      <h2>${slide.question}</h2>
      <input class="answer-input large-input" id="answerInput" value="${answer?.given || ""}" placeholder="Напиши отговора..." ${answer ? "disabled" : ""} />
      ${!answer ? `<button class="primary-button check-button" data-check-slide="${slide.id}">Провери</button>` : ""}
    </article>
  `;
}

function orderSlideTemplate(slide, answer) {
  return `
    <article class="learning-slide exercise-slide duo-question">
      <p class="eyebrow">${slide.title}</p>
      <h2>${slide.question}</h2>
      <div class="word-bank">
        ${slide.options.map((option) => `
          <button class="${answer?.given === option ? "selected" : ""}" data-choice-slide="${slide.id}" data-choice="${option}" ${answer ? "disabled" : ""}>${option}</button>
        `).join("")}
      </div>
    </article>
  `;
}

function feedbackTemplate(slide, answer, slides) {
  const last = lessonRun.slideIndex === slides.length - 1;
  return `
    <div class="feedback-bar ${answer.correct ? "correct-feedback" : "wrong-feedback"}">
      <div>
        <strong>${answer.correct ? "Вярно!" : "Почти. Запомни верния отговор:"}</strong>
        <p>${answer.correct ? "+10 XP" : slide.answer}</p>
      </div>
      <button class="primary-button" data-next-slide>${last ? "Виж резултата" : "Продължи"}</button>
    </div>
  `;
}

function lessonResultTemplate(lesson) {
  const totalExercises = buildLessonSlides(lesson).filter((slide) => slide.type !== "teach").length;
  const mistakes = lessonRun.mistakes;
  return `
    <section id="lesson" class="lesson-stage single">
      <div class="result-panel duo-result">
        <p class="eyebrow">Урокът приключи</p>
        <h2>${mistakes.length === 0 ? "Страхотна серия!" : `Имаш ${mistakes.length} грешки`}</h2>
        <div class="result-grid">
          <article><strong>${totalExercises - mistakes.length}/${totalExercises}</strong><small>верни задачи</small></article>
          <article><strong>${lessonRun.hearts}/5</strong><small>останали сърца</small></article>
          <article><strong>+${lessonRun.xpEarned} XP</strong><small>спечелени точки</small></article>
        </div>
        <div class="mistake-list">
          <h3>Грешки за повторение</h3>
          ${mistakes.length === 0 ? `<p class="good">Нямаш грешки в този урок.</p>` : mistakes.map((mistake) => `
            <article>
              <strong>${mistake.question}</strong>
              <span>Ти: ${mistake.given || "празен отговор"}</span>
              <span>Верен отговор: ${mistake.answer}</span>
            </article>
          `).join("")}
        </div>
        <div class="slide-actions">
          <button class="ghost-button" data-review-lesson>Повтори урока</button>
          <button class="primary-button" data-finish-lesson>Вземи наградата</button>
        </div>
      </div>
    </section>
  `;
}

function buildLessonSlides(lesson) {
  const w = lesson.words;
  return [
    { id: `teach-${w[0].id}`, type: "teach", word: w[0] },
    { id: "choice-apple", type: "choice", title: "Избери превода", question: `Какво означава "${w[0].english}"?`, answer: w[0].bulgarian, options: shuffle([w[0].bulgarian, w[1].bulgarian, w[2].bulgarian]) },
    { id: `teach-${w[1].id}`, type: "teach", word: w[1] },
    { id: "listen-1", type: "listen", title: "Слушане", question: "Какво чу?", answer: w[1].sentence, options: shuffle([w[1].sentence, w[2].sentence, w[3].sentence]), audio: w[1].sentence },
    { id: `teach-${w[2].id}`, type: "teach", word: w[2] },
    { id: "translate-1", type: "text", title: "Преведи", question: `${w[2].bulgarian}`, answer: w[2].english },
    { id: `teach-${w[3].id}`, type: "teach", word: w[3] },
    { id: "order-1", type: "order", title: "Подреди изречението", question: "am / I / student / a", answer: "I am a student", options: shuffle(["I am a student", "I student am a", "A student I am"]) },
    { id: `teach-${w[4].id}`, type: "teach", word: w[4] },
    { id: "choice-2", type: "choice", title: "Избери думата", question: `What is "${w[4].bulgarian}"?`, answer: w[4].english, options: shuffle([w[4].english, w[5].english, w[6].english]) },
    { id: "translate-2", type: "text", title: "Напиши на английски", question: `${w[7].bulgarian}`, answer: w[7].english },
    { id: "listen-2", type: "listen", title: "Слушане", question: "Избери правилното изречение", answer: w[8].sentence, options: shuffle([w[8].sentence, w[6].sentence, w[9].sentence]), audio: w[8].sentence }
  ];
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function grammarTemplate() {
  return `
    <section class="grammar-section">
      <div>
        <p class="eyebrow">Граматика</p>
        <h2>Мини правила, после практика.</h2>
      </div>
      <div class="grammar-grid">
        ${GRAMMAR_MODULES.map((module) => `
          <article>
            <h3>${module.title}</h3>
            <p>${module.rule}</p>
            <strong>${module.example}</strong>
            <label>${module.prompt}<input data-grammar="${module.answer}" placeholder="answer" /></label>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function chatTemplate() {
  return `
    <section id="chat" class="chat-section">
      <div>
        <p class="eyebrow">AI Teacher</p>
        <h2>Разговор с виртуален учител</h2>
        <p>Чатът поправя грешки, предлага нови думи и обяснява граматика.</p>
        <div class="ai-status ${state.aiStatus === "active" ? "online" : "demo"}">
          <strong>${state.aiStatus === "active" ? "AI активен" : state.aiStatus === "checking" ? "Проверявам AI връзката..." : "Демо режим"}</strong>
          <small>${state.aiStatus === "active" ? "Свързан е със server и OpenAI API ключ." : "Стартирай server-а с OPENAI_API_KEY, за да работи с реален AI."}</small>
        </div>
      </div>
      <div class="chat-box">
        <div class="messages" id="messages">
          ${state.chat.map((message) => `<p class="${message.from}">${message.text}</p>`).join("")}
        </div>
        <form id="chatForm" class="chat-form">
          <input name="message" placeholder="My name is Ivan..." autocomplete="off" />
          <button type="submit">Изпрати</button>
        </form>
      </div>
    </section>
  `;
}

function statsTemplate() {
  const dueReviews = Object.values(state.reviews).filter((review) => new Date(review.next) <= new Date()).length;
  return `
    <section id="stats" class="stats-section">
      <article><span>✅</span><strong>${state.stats.correct}/${state.stats.total}</strong><small>верни отговори</small></article>
      <article><span>🔁</span><strong>${dueReviews}</strong><small>думи за повторение днес</small></article>
      <article><span>🏁</span><strong>${state.completedLessons.length}</strong><small>завършени уроци</small></article>
      <article><span>🗄️</span><strong>Users · Lessons · Words · Progress</strong><small>модел за база данни</small></article>
    </section>
  `;
}

function bindEvents() {
  document.querySelector("#registerForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    state.user = { name: form.get("name"), email: form.get("email"), provider: "email" };
    state.activeLevel = form.get("level");
    state.currentLessonId = `${state.activeLevel}-lesson-1`;
    saveState();
    render();
  });

  document.querySelector("#googleLogin")?.addEventListener("click", () => {
    state.user = { name: "Google User", email: "google@example.com", provider: "google" };
    state.activeLevel = "A2";
    state.currentLessonId = "A2-lesson-1";
    saveState();
    render();
  });

  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth" }));
  });

  document.querySelectorAll("[data-start-lesson]").forEach((button) => button.addEventListener("click", startLesson));
  document.querySelector("[data-next-slide]")?.addEventListener("click", nextSlide);
  document.querySelector("[data-review-lesson]")?.addEventListener("click", startLesson);
  document.querySelector("[data-finish-lesson]")?.addEventListener("click", finishLesson);
  document.querySelector("[data-cancel-lesson]")?.addEventListener("click", () => {
    lessonRun = null;
    render();
  });

  document.querySelectorAll("[data-speak]").forEach((button) => {
    button.addEventListener("click", () => speak(button.dataset.speak));
  });

  document.querySelectorAll("[data-repeat]").forEach((button) => {
    const word = nextLesson().words.find((item) => item.id === button.dataset.repeat);
    button.addEventListener("click", () => listenFor(word));
  });

  document.querySelectorAll("[data-check-slide]").forEach((button) => {
    button.addEventListener("click", () => {
      const slide = buildLessonSlides(nextLesson()).find((item) => item.id === button.dataset.checkSlide);
      submitSlideAnswer(slide, document.getElementById("answerInput").value);
    });
  });

  document.querySelectorAll("[data-choice-slide]").forEach((button) => {
    button.addEventListener("click", () => {
      const slide = buildLessonSlides(nextLesson()).find((item) => item.id === button.dataset.choiceSlide);
      submitSlideAnswer(slide, button.dataset.choice);
    });
  });

  document.querySelectorAll("[data-grammar]").forEach((input) => {
    input.addEventListener("change", () => {
      const ok = normalize(input.value) === normalize(input.dataset.grammar);
      input.classList.toggle("correct", ok);
      if (ok) addXp(10);
    });
  });

  document.querySelector("#chatForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = new FormData(event.target).get("message").trim();
    if (!text) return;
    state.chat.push({ from: "user", text });
    state.chat.push({ from: "ai", text: "Thinking..." });
    event.target.reset();
    saveState();
    render();
    document.getElementById("chat")?.scrollIntoView({ behavior: "smooth" });
    askAiTeacher(text);
  });
}

function startLesson() {
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
  document.getElementById("lesson")?.scrollIntoView({ behavior: "smooth" });
}

function nextSlide() {
  const slides = buildLessonSlides(nextLesson());
  if (lessonRun.slideIndex >= slides.length - 1) {
    lessonRun.finished = true;
  } else {
    lessonRun.slideIndex += 1;
  }
  render();
  document.getElementById("lesson")?.scrollIntoView({ behavior: "smooth" });
}

function submitSlideAnswer(slide, given) {
  if (lessonRun.answers[slide.id]) return;

  const correct = normalize(given) === normalize(slide.answer);
  lessonRun.answers[slide.id] = { given, correct };
  state.stats.total += 1;

  if (correct) {
    state.stats.correct += 1;
    state.stats.streakAnswers += 1;
    lessonRun.xpEarned += 10;
    addXp(10);
    if (state.stats.streakAnswers % 5 === 0) {
      lessonRun.xpEarned += 50;
      addXp(50);
    }
  } else {
    state.stats.streakAnswers = 0;
    lessonRun.hearts = Math.max(0, lessonRun.hearts - 1);
    lessonRun.mistakes.push({ question: slide.question, given, answer: slide.answer });
  }

  saveState();
  render();
  document.getElementById("lesson")?.scrollIntoView({ behavior: "smooth" });
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
  showToast("Урокът е завършен! +100 XP");
  render();
}

function scheduleReviews(words) {
  const intervals = [1, 3, 7, 30];
  words.forEach((word) => {
    const old = state.reviews[word.id] || { step: 0 };
    const step = Math.min(old.step + 1, intervals.length - 1);
    const next = new Date();
    next.setDate(next.getDate() + intervals[step]);
    state.reviews[word.id] = { step, next: next.toISOString(), english: word.english, bulgarian: word.bulgarian };
  });
}

async function checkAiStatus() {
  try {
    const response = await fetch("/api/teacher/status");
    const data = await response.json();
    state.aiStatus = data.ready ? "active" : "demo";
  } catch (error) {
    state.aiStatus = "demo";
  }
  saveState();
  render();
}

async function askAiTeacher(text) {
  const pendingIndex = state.chat.findLastIndex((message) => message.from === "ai" && message.text === "Thinking...");
  try {
    const recentMessages = state.chat
      .filter((message) => message.text !== "Thinking...")
      .slice(-10)
      .map((message) => ({ role: message.from === "ai" ? "assistant" : "user", content: message.text }));

    const response = await fetch("/api/teacher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        level: state.activeLevel,
        userName: state.user?.name || "student",
        lesson: nextLesson().title,
        recentMessages
      })
    });

    if (!response.ok) throw new Error("AI endpoint unavailable");
    const data = await response.json();
    state.chat[pendingIndex].text = data.reply || teacherReply(text);
  } catch (error) {
    state.chat[pendingIndex].text = teacherReply(text);
  }

  saveState();
  render();
  document.getElementById("chat")?.scrollIntoView({ behavior: "smooth" });
}

function teacherReply(text) {
  const lower = text.toLowerCase();
  if (lower.includes("my name is")) return "Nice to meet you! Your sentence is correct. Try: I am learning English every day.";
  if (lower.includes("i is")) return "Small correction: say 'I am', not 'I is'. Example: I am ready.";
  if (lower.includes("hello") || lower.includes("hi")) return "Hello! Tell me one thing you did today using Past Simple.";
  if (lower.includes("because")) return "Great use of 'because'. It connects a reason: I study because I want progress.";
  return "Good effort. New words for today: confident, usually, improve. Can you make one sentence with one of them?";
}

render();
