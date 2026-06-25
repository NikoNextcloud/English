const storageKey = "wordjoy-english-progress-v1";

const defaultState = {
  user: null,
  xp: 2450,
  streak: 7,
  completedLessons: [],
  activeLevel: "A2",
  currentLessonId: "A2-lesson-1",
  reviews: {},
  chat: [
    { from: "ai", text: "Hello! I am your English teacher. What is your name?" }
  ],
  stats: { correct: 0, total: 0, streakAnswers: 0 }
};

let state = loadState();
let activeExercise = 0;

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return { ...defaultState };
  return { ...defaultState, ...JSON.parse(saved) };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function userLevel() {
  const xp = state.xp;
  if (xp >= 2500) return 4;
  if (xp >= 1200) return 3;
  if (xp >= 500) return 2;
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
  if (after > before) {
    showToast(`Congratulations! You reached Level ${after}.`);
  }
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
    const score = heard.includes(word.english.toLowerCase()) ? "Great pronunciation!" : `I heard "${heard}". Try again slowly.`;
    showToast(score);
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
  return `
    <section id="dashboard" class="dashboard">
      <div class="welcome">
        <p class="eyebrow">Привет, ${state.user.name}!</p>
        <h1>Днешната мисия: 10 думи и един кратък разговор.</h1>
        <button class="primary-button" data-scroll="lesson">Продължи обучението</button>
      </div>
      <div class="hero-card">
        <img src="assets/teacher-hero.png" alt="English teacher illustration" />
      </div>
      <div class="metric"><span>🔥</span><strong>${state.streak} дни поред</strong><small>дневна серия</small></div>
      <div class="metric"><span>⭐</span><strong>${state.xp} XP</strong><small>Level ${userLevel()}</small></div>
      <div class="metric"><span>📚</span><strong>${lesson.title}</strong><small>${courseProgress()}% завършен курс</small></div>
      <div class="progress-line"><span style="width:${courseProgress()}%"></span></div>
    </section>
  `;
}

function lessonTemplate() {
  const lesson = nextLesson();
  const exercises = buildExercises(lesson);
  const exercise = exercises[activeExercise % exercises.length];
  return `
    <section id="lesson" class="section-grid">
      <div>
        <p class="eyebrow">${levelName(lesson.level)} · ${lesson.theme}</p>
        <h2>${lesson.title}</h2>
        <div class="word-grid">
          ${lesson.words.map((word) => `
            <article class="word-card">
              <div class="word-image">${iconFor(word.image || word.category)}</div>
              <h3>${word.english}</h3>
              <p>${word.bulgarian}</p>
              <small>${word.sentence}</small>
              <div class="card-actions">
                <button title="Listen" data-speak="${word.english}">🔊</button>
                <button title="Repeat" data-repeat="${word.id}">🎙️</button>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
      <aside class="exercise-panel">
        <p class="eyebrow">Упражнение ${activeExercise + 1}</p>
        <h2>${exercise.title}</h2>
        <p class="exercise-question">${exercise.question}</p>
        ${exerciseTemplate(exercise)}
        <div class="exercise-feedback" id="exerciseFeedback"></div>
      </aside>
    </section>
  `;
}

function buildExercises(lesson) {
  const w = lesson.words;
  return [
    { type: "text", title: "Превод", question: `Translate: ${w[0].bulgarian}`, answer: w[0].english },
    { type: "order", title: "Подреди изречението", question: "am / I / student / a", answer: "I am a student" },
    { type: "choice", title: "Избери верния отговор", question: `What is "${w[1].bulgarian}"?`, answer: w[1].english, options: [w[2].english, w[1].english, w[3].english] },
    { type: "choice", title: "Слушане", question: `"${w[4].sentence}"`, answer: w[4].sentence, options: [w[4].sentence, w[5].sentence, w[6].sentence], audio: w[4].sentence }
  ];
}

function exerciseTemplate(exercise) {
  if (exercise.type === "text" || exercise.type === "order") {
    return `
      <input class="answer-input" id="answerInput" placeholder="Напиши отговора..." />
      <button class="primary-button" data-check="${exercise.answer}">Провери</button>
    `;
  }
  return `
    ${exercise.audio ? `<button class="listen-button" data-speak="${exercise.audio}">🔊 Пусни аудио</button>` : ""}
    <div class="choice-list">
      ${exercise.options.map((option) => `<button data-choice="${option}" data-answer="${exercise.answer}">${option}</button>`).join("")}
    </div>
  `;
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
    saveState();
    render();
  });

  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth" }));
  });

  document.querySelectorAll("[data-speak]").forEach((button) => {
    button.addEventListener("click", () => speak(button.dataset.speak));
  });

  document.querySelectorAll("[data-repeat]").forEach((button) => {
    const lesson = nextLesson();
    const word = lesson.words.find((item) => item.id === button.dataset.repeat);
    button.addEventListener("click", () => listenFor(word));
  });

  document.querySelectorAll("[data-check]").forEach((button) => {
    button.addEventListener("click", () => checkAnswer(document.getElementById("answerInput").value, button.dataset.check));
  });

  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => checkAnswer(button.dataset.choice, button.dataset.answer));
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

function normalize(value) {
  return value.trim().toLowerCase().replace(/[.!?]/g, "");
}

function checkAnswer(value, answer) {
  const ok = normalize(value) === normalize(answer);
  const feedback = document.getElementById("exerciseFeedback");
  state.stats.total += 1;
  if (ok) {
    state.stats.correct += 1;
    state.stats.streakAnswers += 1;
    addXp(10);
    if (state.stats.streakAnswers % 5 === 0) addXp(50);
    scheduleReviews(nextLesson().words);
    feedback.textContent = "✔ Correct! +10 XP";
    feedback.className = "exercise-feedback good";
    activeExercise += 1;
    if (activeExercise % 4 === 0) completeLesson();
    saveState();
    setTimeout(render, 700);
  } else {
    state.stats.streakAnswers = 0;
    feedback.textContent = `Try again. Correct answer: ${answer}`;
    feedback.className = "exercise-feedback bad";
    saveState();
  }
}

function completeLesson() {
  const lesson = nextLesson();
  if (!state.completedLessons.includes(lesson.id)) {
    state.completedLessons.push(lesson.id);
    addXp(100);
  }
  const levelLessons = LESSONS.filter((item) => item.level === state.activeLevel);
  const index = levelLessons.findIndex((item) => item.id === lesson.id);
  state.currentLessonId = levelLessons[Math.min(index + 1, levelLessons.length - 1)].id;
  showToast("Lesson complete! +100 XP");
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
