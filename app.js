const storageKey = "wordjoy-english-progress-v3";

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
  aiSpeaking: false,
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

function speakTeacher(text) {
  if (!window.speechSynthesis) return;
  const cleanText = text.replace(/[#*_`]/g, "").slice(0, 700);
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = cleanText.match(/[а-яА-Я]/) ? "bg-BG" : "en-US";
  utterance.rate = 0.95;
  utterance.onstart = () => {
    state.aiSpeaking = true;
    render();
    scrollChatToBottom();
  };
  utterance.onend = () => {
    state.aiSpeaking = false;
    render();
    scrollChatToBottom();
  };
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
    showToast(heard.includes(word.english.toLowerCase()) ? "Great pronunciation!" : `I heard "${heard}". Try again slowly.`);
  };
  recognition.start();
}

function dictateToChat() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("Гласовият вход изисква Chrome или Edge.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript.trim();
    if (text) sendChatMessage(text);
  };
  recognition.onstart = () => showToast("Слушам...");
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
  scrollChatToBottom();
  if (state.user && state.aiStatus === "checking") checkAiStatus();
}

function registerTemplate() {
  return `
    <section class="register-layout">
      <div class="hero-copy">
        <p class="eyebrow">WordJoy English</p>
        <h1>Учи английски като игра: думи, граматика, писане и AI учител в един поток.</h1>
        <p>Всеки урок смесва кратко правило, микрозадача, писане и разговор, за да учиш като в реална сесия с преподавател.</p>
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
  if (lessonRun) {
    return `
      <main class="lesson-focus-mode">
        ${lessonTemplate()}
      </main>
    `;
  }

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
      </div>
    </nav>
    ${dashboardTemplate()}
    ${lessonTemplate()}
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
        <h1>Днес учиш с думи, правило и AI писане.</h1>
        <p>Следващ урок: <strong>${lesson.title}</strong>. Напредък за ниво ${levelName(state.activeLevel)}: ${courseProgress()}%.</p>
        <div class="dashboard-actions">
          <button class="primary-button big-action" data-start-lesson>Стартирай урока</button>
          <button class="ghost-button" data-scroll="chat">Говори с AI</button>
        </div>
      </div>
      <div class="daily-words-panel">
        <div class="path-header">
          <strong>Дневни думи</strong>
          <small>10 думи</small>
        </div>
        <div class="daily-word-list">
          ${lesson.words.slice(0, 6).map((word) => `
            <article>
              <span>${iconFor(word.image || word.category)}</span>
              <div><strong>${word.english}</strong><small>${word.bulgarian}</small></div>
            </article>
          `).join("")}
        </div>
      </div>
      <div class="dashboard-lower-grid">
        <div class="path-panel">
          <div class="path-header">
            <strong>Раздел ${Math.ceil(lessonNumber / 5)}</strong>
            <small>Урок ${lessonNumber} от ${lessons.length}</small>
          </div>
          ${pathTemplate(lessons)}
        </div>
        <div class="metric-stack">
          <div class="metric"><span>🔥</span><strong>${state.streak} дни</strong><small>дневна серия</small></div>
          <div class="metric"><span>💎</span><strong>${state.xp} XP</strong><small>точки</small></div>
          <div class="metric"><span>✍️</span><strong>AI writing</strong><small>във всеки урок</small></div>
          <div class="metric"><span>🧩</span><strong>${grammarForLesson(lesson).title}</strong><small>днешна граматика</small></div>
        </div>
      </div>
      <div class="progress-line"><span style="width:${courseProgress()}%"></span></div>
      <p class="progress-caption">${courseProgress()}% завършен курс за ниво ${levelName(state.activeLevel)}</p>
    </section>
  `;
}

function pathTemplate(lessons) {
  const currentId = nextLesson().id;
  const currentIndex = lessons.findIndex((item) => item.id === currentId);
  return `
    <div class="lesson-path">
      ${lessons.slice(0, 12).map((lesson, index) => {
        const completed = state.completedLessons.includes(lesson.id);
        const current = lesson.id === currentId;
        const locked = !completed && !current && index > currentIndex;
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
  const grammar = grammarForLesson(lesson);
  return `
    <section id="lesson" class="lesson-stage">
      <div class="lesson-intro">
        <p class="eyebrow">${levelName(lesson.level)} · ${lesson.theme}</p>
        <h2>${lesson.title}</h2>
        <p>Урокът вече е една цяла мини сесия: дума → правило → задача → писане → AI feedback → точки.</p>
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
        <h3>Днешна концепция</h3>
        <article><span>🧩</span><div><strong>${grammar.title}</strong><small>${grammar.rule}</small></div></article>
        <article><span>✍️</span><div><strong>AI writing</strong><small>Ще напишеш свое изречение и AI ще го оцени.</small></div></article>
        ${lesson.words.slice(0, 4).map((word) => `
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
        <div class="mini-progress"><span style="width:${progress}%"></span></div>
        <strong class="heart-count">${"♥".repeat(lessonRun.hearts)}${"♡".repeat(5 - lessonRun.hearts)}</strong>
        <button class="close-lesson" data-cancel-lesson title="Затвори">×</button>
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
  if (slide.type === "grammar-rule") return grammarRuleSlideTemplate(slide);
  if (slide.type === "choice" || slide.type === "listen") return choiceSlideTemplate(slide, answer);
  if (slide.type === "text" || slide.type === "grammar-input") return textSlideTemplate(slide, answer);
  if (slide.type === "order") return orderSlideTemplate(slide, answer);
  if (slide.type === "ai-writing") return aiWritingSlideTemplate(slide, answer);
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

function grammarRuleSlideTemplate(slide) {
  return `
    <article class="learning-slide grammar-card">
      <div class="slide-visual">🧩</div>
      <p class="eyebrow">Мини правило</p>
      <h2>${slide.title}</h2>
      <p class="translation">${slide.rule}</p>
      <p class="example">${slide.example}</p>
      <button class="primary-button check-button" data-next-slide>Ясно, давай задача</button>
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

function aiWritingSlideTemplate(slide, answer) {
  return `
    <article class="learning-slide exercise-slide duo-question writing-slide">
      <p class="eyebrow">AI writing coach</p>
      <h2>${slide.question}</h2>
      <p>${slide.hint}</p>
      <textarea id="writingInput" class="writing-input" placeholder="Write your sentence here..." ${answer ? "disabled" : ""}>${answer?.given || ""}</textarea>
      ${!answer ? `<button class="primary-button check-button" data-ai-writing="${slide.id}">Изпрати за AI оценка</button>` : ""}
      ${answer?.correction ? `
        <div class="ai-writing-feedback">
          <strong>AI feedback: ${answer.score}/100</strong>
          <p>${answer.correction}</p>
          <small>${answer.explanation}</small>
        </div>
      ` : ""}
    </article>
  `;
}

function feedbackTemplate(slide, answer, slides) {
  const last = lessonRun.slideIndex === slides.length - 1;
  const label = answer.correct ? "Вярно!" : slide.type === "ai-writing" ? "AI даде препоръка:" : "Почти. Запомни верния отговор:";
  const detail = slide.type === "ai-writing" ? `+${answer.points || 0} XP` : answer.correct ? `+${answer.points || 10} XP` : slide.answer;
  return `
    <div class="feedback-bar ${answer.correct ? "correct-feedback" : "wrong-feedback"}">
      <div>
        <strong>${label}</strong>
        <p>${detail}</p>
      </div>
      <button class="primary-button" data-next-slide>${last ? "Виж резултата" : "Продължи"}</button>
    </div>
  `;
}

function lessonResultTemplate(lesson) {
  const totalExercises = buildLessonSlides(lesson).filter((slide) => !["teach", "grammar-rule"].includes(slide.type)).length;
  const mistakes = lessonRun.mistakes;
  return `
    <section id="lesson" class="lesson-stage single">
      <div class="result-panel duo-result">
        <p class="eyebrow">Урокът приключи</p>
        <h2>${mistakes.length === 0 ? "Страхотна сесия!" : `Имаш ${mistakes.length} неща за повторение`}</h2>
        <div class="result-grid">
          <article><strong>${totalExercises - mistakes.length}/${totalExercises}</strong><small>силни задачи</small></article>
          <article><strong>${lessonRun.hearts}/5</strong><small>останали сърца</small></article>
          <article><strong>+${lessonRun.xpEarned} XP</strong><small>спечелени точки</small></article>
        </div>
        <div class="mistake-list">
          <h3>Повтори това</h3>
          ${mistakes.length === 0 ? `<p class="good">Нямаш грешки в този урок.</p>` : mistakes.map((mistake) => `
            <article>
              <strong>${mistake.question}</strong>
              <span>Ти: ${mistake.given || "празен отговор"}</span>
              <span>Правилен/по-добър вариант: ${mistake.answer}</span>
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
  const grammar = grammarForLesson(lesson);
  return [
    { id: `teach-${w[0].id}`, type: "teach", word: w[0] },
    { id: "choice-1", type: "choice", title: "Избери превода", question: `Какво означава "${w[0].english}"?`, answer: w[0].bulgarian, options: shuffle([w[0].bulgarian, w[1].bulgarian, w[2].bulgarian]) },
    { id: "grammar-rule", type: "grammar-rule", ...grammar },
    { id: "grammar-input", type: "grammar-input", title: "Граматика в действие", question: grammar.prompt, answer: grammar.answer },
    { id: `teach-${w[1].id}`, type: "teach", word: w[1] },
    { id: "listen-1", type: "listen", title: "Слушане", question: "Какво чу?", answer: w[1].sentence, options: shuffle([w[1].sentence, w[2].sentence, w[3].sentence]), audio: w[1].sentence },
    { id: "translate-1", type: "text", title: "Преведи", question: `${w[2].bulgarian}`, answer: w[2].english },
    { id: "writing-1", type: "ai-writing", question: `Напиши едно изречение с "${w[2].english}" и правилото "${grammar.title}".`, hint: "AI ще ти даде оценка, поправка и кратко обяснение.", targetWord: w[2].english, grammarTitle: grammar.title },
    { id: "order-1", type: "order", title: "Подреди изречението", question: "am / I / student / a", answer: "I am a student", options: shuffle(["I am a student", "I student am a", "A student I am"]) },
    { id: `teach-${w[4].id}`, type: "teach", word: w[4] },
    { id: "choice-2", type: "choice", title: "Избери думата", question: `What is "${w[4].bulgarian}"?`, answer: w[4].english, options: shuffle([w[4].english, w[5].english, w[6].english]) },
    { id: "writing-2", type: "ai-writing", question: `Отговори на английски: What do you usually do every day?`, hint: `Използвай поне една дума от урока: ${w.slice(0, 5).map((word) => word.english).join(", ")}.`, targetWord: w[4].english, grammarTitle: grammar.title }
  ];
}

function grammarForLesson(lesson) {
  const index = levelLessons().findIndex((item) => item.id === lesson.id);
  return GRAMMAR_MODULES[index % GRAMMAR_MODULES.length];
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function chatTemplate() {
  return `
    <section id="chat" class="chat-section">
      <div class="teacher-panel">
        <div class="teacher-avatar ${state.aiSpeaking ? "speaking" : ""}" aria-hidden="true">
          <div class="teacher-head">
            <div class="teacher-eye left"></div>
            <div class="teacher-eye right"></div>
            <div class="teacher-mouth"></div>
          </div>
          <div class="teacher-neck"></div>
        </div>
        <div class="ai-status ${state.aiStatus === "active" ? "online" : "demo"}">
          <span class="connection-dot" title="${state.aiStatus === "active" ? "AI активен" : "AI не е свързан"}" aria-label="${state.aiStatus === "active" ? "AI активен" : "AI не е свързан"}"></span>
        </div>
      </div>
      <div class="chat-box">
        <div class="messages" id="messages">
          ${state.chat.map((message) => `<p class="${message.from}">${message.text}</p>`).join("")}
        </div>
        <div class="voice-chat-actions">
          <button type="button" class="mic-button voice-only" id="dictateButton" title="Говори">🎙️ Говори с AI</button>
        </div>
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
      <article><span>✍️</span><strong>AI writing</strong><small>оценка и поправки</small></article>
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

  document.querySelectorAll("[data-ai-writing]").forEach((button) => {
    button.addEventListener("click", () => {
      const slide = buildLessonSlides(nextLesson()).find((item) => item.id === button.dataset.aiWriting);
      submitWritingAnswer(slide, document.getElementById("writingInput").value);
    });
  });

  document.querySelector("#dictateButton")?.addEventListener("click", dictateToChat);

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
  const points = correct ? 10 : 0;
  lessonRun.answers[slide.id] = { given, correct, points };
  state.stats.total += 1;

  if (correct) {
    state.stats.correct += 1;
    state.stats.streakAnswers += 1;
    lessonRun.xpEarned += points;
    addXp(points);
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

async function submitWritingAnswer(slide, given) {
  if (lessonRun.answers[slide.id]) return;
  if (!given.trim()) {
    showToast("Напиши поне едно изречение.");
    return;
  }

  lessonRun.answers[slide.id] = { given, correct: true, points: 0, correction: "AI проверява..." };
  render();

  const result = await evaluateWriting(slide, given);
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
    state.stats.correct += 1;
    state.stats.streakAnswers += 1;
    lessonRun.xpEarned += points;
    addXp(points);
  } else {
    state.stats.streakAnswers = 0;
    lessonRun.hearts = Math.max(0, lessonRun.hearts - 1);
    lessonRun.mistakes.push({ question: slide.question, given, answer: result.correction });
  }

  saveState();
  render();
}

async function evaluateWriting(slide, answer) {
  try {
    const response = await fetch("/api/teacher/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answer,
        prompt: slide.question,
        level: state.activeLevel,
        targetWord: slide.targetWord,
        grammarTitle: slide.grammarTitle
      })
    });
    if (!response.ok) throw new Error("Evaluation unavailable");
    return await response.json();
  } catch (error) {
    return localWritingEvaluation(slide, answer);
  }
}

function localWritingEvaluation(slide, answer) {
  const hasTarget = normalize(answer).includes(normalize(slide.targetWord));
  const hasVerb = /\b(am|is|are|was|were|work|works|go|goes|like|likes|have|has|do|does|study|studies)\b/i.test(answer);
  const score = Math.min(100, 35 + (hasTarget ? 35 : 0) + (hasVerb ? 20 : 0) + (answer.length > 18 ? 10 : 0));
  return {
    score,
    correction: hasTarget ? answer.trim() : `${answer.trim()} (${slide.targetWord})`,
    explanation: hasTarget ? "Добър опит. Продължи с още едно по-дълго изречение." : `Опитай да използваш думата "${slide.targetWord}".`
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

  const reply = state.chat[pendingIndex].text;
  saveState();
  render();
  scrollChatToBottom();
  speakTeacher(reply);
}

function sendChatMessage(text) {
  if (!text) return;
  state.chat.push({ from: "user", text });
  state.chat.push({ from: "ai", text: "Thinking..." });
  saveState();
  render();
  scrollChatToBottom();
  askAiTeacher(text);
}

function scrollChatToBottom() {
  const messages = document.getElementById("messages");
  if (messages) messages.scrollTop = messages.scrollHeight;
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
