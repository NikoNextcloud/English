const storageKey = "wordjoy-english-progress-v1";

const defaultState = {
  user: null,
  xp: 2450,
  streak: 7,
  completedLessons: [],
  activeLevel: "A2",
  currentLessonId: "A2-lesson-1",
  reviews: {},
  chat: [{ from: "ai", text: "Hello! I am your English teacher. What is your name?" }],
  stats: { correct: 0, total: 0, streakAnswers: 0 }
};

let state = loadState();
let lessonRun = null;

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  return { ...structuredClone(defaultState), ...JSON.parse(saved) };
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

function courseProgress() {
  const levelLessons = LESSONS.filter((lesson) => lesson.level === state.activeLevel);
  const completed = levelLessons.filter((lesson) => state.completedLessons.includes(lesson.id)).length;
  return Math.round((completed / levelLessons.length) * 100);
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
    const result = heard.includes(word.english.toLowerCase()) ? "Great pronunciation!" : `I heard "${heard}". Try again slowly.`;
    showToast(result);
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
}

function registerTemplate() {
  return `
    <section class="register-layout">
      <div class="hero-copy">
        <p class="eyebrow">WordJoy English</p>
        <h1>10 нови думи на ден, с картинки, звук и малки победи.</h1>
        <p>Лесно приложение за A1, A2, B1-B2 и C1-C2. Подходящо за качване в GitHub като първа MVP версия.</p>
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
      <div class="nav-pills">
        <button data-scroll="dashboard">Начало</button>
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
  const levelLessons = LESSONS.filter((item) => item.level === state.activeLevel);
  const lessonNumber = levelLessons.findIndex((item) => item.id === lesson.id) + 1;
  return `
    <section id="dashboard" class="dashboard">
      <div class="welcome">
        <p class="eyebrow">Привет, ${state.user.name}!</p>
        <h1>Днешната мисия: един урок, 10 думи и кратък тест.</h1>
        <div class="dashboard-actions">
          <button class="primary-button" data-start-lesson>Стартирай урока</button>
          <button class="ghost-button" data-scroll="lesson">Виж прогреса</button>
        </div>
      </div>
      <div class="hero-card">
        <img src="assets/teacher-hero.png" alt="English teacher illustration" />
      </div>
      <div class="metric"><span>🔥</span><strong>${state.streak} дни поред</strong><small>дневна серия</small></div>
      <div class="metric"><span>⭐</span><strong>${state.xp} XP</strong><small>Level ${userLevel()}</small></div>
      <div class="metric"><span>📚</span><strong>Урок ${lessonNumber} от ${levelLessons.length}</strong><small>${lesson.title}</small></div>
      <div class="progress-line"><span style="width:${courseProgress()}%"></span></div>
      <p class="progress-caption">${courseProgress()}% завършен курс за ниво ${levelName(state.activeLevel)}</p>
    </section>
  `;
}

function lessonTemplate() {
  const lesson = nextLesson();
  if (!lessonRun) return lessonStartTemplate(lesson);
  if (lessonRun.finished) return lessonResultTemplate(lesson);
  return lessonSlideTemplate(lesson);
}

function lessonStartTemplate(lesson) {
  const levelLessons = LESSONS.filter((item) => item.level === state.activeLevel);
  const lessonNumber = levelLessons.findIndex((item) => item.id === lesson.id) + 1;
  return `
    <section id="lesson" class="lesson-stage">
      <div class="lesson-intro">
        <p class="eyebrow">${levelName(lesson.level)} · ${lesson.theme}</p>
        <h2>${lesson.title}</h2>
        <p>Ще минеш през 10 думи, после през кратък тест. Накрая ще видиш колко грешки имаш и точно кои са те.</p>
        <div class="lesson-progress-card">
          <div>
            <strong>Урок ${lessonNumber} от ${levelLessons.length}</strong>
            <small>${courseProgress()}% завършен курс</small>
          </div>
          <div class="mini-progress"><span style="width:${courseProgress()}%"></span></div>
        </div>
        <button class="primary-button" data-start-lesson>Стартирай урока</button>
      </div>
      <div class="preview-words">
        ${lesson.words.slice(0, 4).map((word) => `
          <article class="word-card compact">
            <div class="word-image">${iconFor(word.image || word.category)}</div>
            <h3>${word.english}</h3>
            <p>${word.bulgarian}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function lessonSlideTemplate(lesson) {
  const slides = buildLessonSlides(lesson);
  const slide = slides[lessonRun.slideIndex];
  const progress = Math.round(((lessonRun.slideIndex + 1) / slides.length) * 100);
  return `
    <section id="lesson" class="lesson-stage single">
      <div class="slide-shell">
        <div class="slide-top">
          <p class="eyebrow">Слайд ${lessonRun.slideIndex + 1} от ${slides.length}</p>
          <div class="mini-progress"><span style="width:${progress}%"></span></div>
        </div>
        ${slide.type === "word" ? wordSlideTemplate(slide.word) : exerciseSlideTemplate(slide)}
        <div class="slide-actions">
          ${lessonRun.slideIndex > 0 ? `<button class="ghost-button" data-prev-slide>Назад</button>` : ""}
          ${slide.type === "word" ? `<button class="primary-button" data-next-slide>Напред</button>` : ""}
          ${slide.type !== "word" && lessonRun.answers[slide.id] ? `<button class="primary-button" data-next-slide>${lessonRun.slideIndex === slides.length - 1 ? "Финал" : "Напред"}</button>` : ""}
        </div>
      </div>
    </section>
  `;
}

function wordSlideTemplate(word) {
  return `
    <article class="learning-slide">
      <div class="slide-visual">${iconFor(word.image || word.category)}</div>
      <p class="eyebrow">Нова дума</p>
      <h2>${word.english}</h2>
      <p class="translation">${word.bulgarian}</p>
      <p class="example">"${word.sentence}"</p>
      <div class="card-actions center">
        <button title="Listen" data-speak="${word.english}">🔊 Чуй думата</button>
        <button title="Repeat" data-repeat="${word.id}">🎙️ Повтори</button>
      </div>
    </article>
  `;
}

function exerciseSlideTemplate(slide) {
  const saved = lessonRun.answers[slide.id];
  return `
    <article class="learning-slide exercise-slide">
      <p class="eyebrow">${slide.title}</p>
      <h2>${slide.question}</h2>
      ${slide.audio ? `<button class="listen-button" data-speak="${slide.audio}">🔊 Пусни аудио</button>` : ""}
      ${slide.type === "text" || slide.type === "order" ? `
        <input class="answer-input" id="answerInput" value="${saved?.given || ""}" placeholder="Напиши отговора..." ${saved ? "disabled" : ""} />
        ${!saved ? `<button class="primary-button" data-check-slide="${slide.id}">Провери</button>` : ""}
      ` : `
        <div class="choice-list">
          ${slide.options.map((option) => `
            <button data-choice-slide="${slide.id}" data-choice="${option}" ${saved ? "disabled" : ""}>${option}</button>
          `).join("")}
        </div>
      `}
      ${saved ? `<div class="exercise-feedback ${saved.correct ? "good" : "bad"}">${saved.correct ? "✔ Вярно! +10 XP" : `Грешка. Верен отговор: ${slide.answer}`}</div>` : `<div class="exercise-feedback">Отговори, за да отключиш бутона напред.</div>`}
    </article>
  `;
}

function lessonResultTemplate(lesson) {
  const totalExercises = buildExercises(lesson).length;
  const mistakes = lessonRun.mistakes;
  return `
    <section id="lesson" class="lesson-stage single">
      <div class="result-panel">
        <p class="eyebrow">Край на урока</p>
        <h2>${mistakes.length === 0 ? "Перфектен урок!" : `Имаш ${mistakes.length} грешки от ${totalExercises}`}</h2>
        <p>Получаваш преглед на грешките, за да знаеш какво да повториш.</p>
        <div class="result-grid">
          <article><strong>${totalExercises - mistakes.length}/${totalExercises}</strong><small>верни отговори</small></article>
          <article><strong>+${lessonRun.xpEarned} XP</strong><small>спечелени точки</small></article>
          <article><strong>${lesson.words.length}</strong><small>думи за повторение</small></article>
        </div>
        <div class="mistake-list">
          ${mistakes.length === 0 ? `<p class="good">Нямаш грешки в този урок.</p>` : mistakes.map((mistake) => `
            <article>
              <strong>${mistake.question}</strong>
              <span>Ти: ${mistake.given || "празен отговор"}</span>
              <span>Верен отговор: ${mistake.answer}</span>
            </article>
          `).join("")}
        </div>
        <div class="slide-actions">
          <button class="ghost-button" data-review-lesson>Прегледай отново</button>
          <button class="primary-button" data-finish-lesson>Завърши и продължи</button>
        </div>
      </div>
    </section>
  `;
}

function buildLessonSlides(lesson) {
  return [
    ...lesson.words.map((word) => ({ id: `word-${word.id}`, type: "word", word })),
    ...buildExercises(lesson)
  ];
}

function buildExercises(lesson) {
  const w = lesson.words;
  return [
    { id: "translate-1", type: "text", title: "Превод", question: `Translate: ${w[0].bulgarian}`, answer: w[0].english },
    { id: "order-1", type: "order", title: "Подреди изречението", question: "am / I / student / a", answer: "I am a student" },
    { id: "choice-1", type: "choice", title: "Избери верния отговор", question: `What is "${w[1].bulgarian}"?`, answer: w[1].english, options: [w[2].english, w[1].english, w[3].english] },
    { id: "listen-1", type: "choice", title: "Слушане", question: "Избери какво чу", answer: w[4].sentence, options: [w[4].sentence, w[5].sentence, w[6].sentence], audio: w[4].sentence }
  ];
}

function grammarTemplate() {
  return `
    <section class="grammar-section">
      <div>
        <p class="eyebrow">Граматика</p>
        <h2>Кратки правила, веднага с практика.</h2>
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
        <p>В MVP версията чатът е локален симулатор. По-късно може да се свърже с истински AI API.</p>
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

  document.querySelectorAll("[data-start-lesson]").forEach((button) => {
    button.addEventListener("click", () => startLesson());
  });

  document.querySelector("[data-prev-slide]")?.addEventListener("click", () => {
    lessonRun.slideIndex = Math.max(0, lessonRun.slideIndex - 1);
    render();
    document.getElementById("lesson")?.scrollIntoView({ behavior: "smooth" });
  });

  document.querySelector("[data-next-slide]")?.addEventListener("click", () => nextSlide());
  document.querySelector("[data-review-lesson]")?.addEventListener("click", () => startLesson());
  document.querySelector("[data-finish-lesson]")?.addEventListener("click", () => finishLesson());

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
    state.chat.push({ from: "ai", text: teacherReply(text) });
    event.target.reset();
    saveState();
    render();
    document.getElementById("chat")?.scrollIntoView({ behavior: "smooth" });
  });
}

function startLesson() {
  lessonRun = {
    lessonId: nextLesson().id,
    slideIndex: 0,
    answers: {},
    mistakes: [],
    xpEarned: 0,
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
  const levelLessons = LESSONS.filter((item) => item.level === state.activeLevel);
  const index = levelLessons.findIndex((item) => item.id === lesson.id);
  state.currentLessonId = levelLessons[Math.min(index + 1, levelLessons.length - 1)].id;
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

function teacherReply(text) {
  const lower = text.toLowerCase();
  if (lower.includes("my name is")) return "Nice to meet you! Small tip: your sentence is correct. Try: I am learning English every day.";
  if (lower.includes("i is")) return "Tiny correction: say 'I am', not 'I is'. Example: I am ready.";
  if (lower.includes("hello") || lower.includes("hi")) return "Hello! Tell me one thing you did today using Past Simple.";
  if (lower.includes("because")) return "Great use of 'because'. It connects a reason: I study because I want progress.";
  return "Good effort. I suggest three words for today: confident, usually, improve. Can you make one sentence with one of them?";
}

render();
