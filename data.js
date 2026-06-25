const LEVELS = [
  { id: "A1", title: "Beginner", label: "A1", description: "Първи стъпки, ежедневни думи и кратки изречения." },
  { id: "A2", title: "Elementary", label: "A2", description: "Полезни фрази за дом, работа, храна и пътуване." },
  { id: "B1", title: "Intermediate", label: "B1-B2", description: "Разговори, истории, мнение и по-точни изрази." },
  { id: "C1", title: "Advanced", label: "C1-C2", description: "Нюанси, академичен език и уверено говорене." }
];

const WORD_SEEDS = {
  A1: [
    ["apple", "ябълка", "I eat an apple.", "food"], ["water", "вода", "I drink water.", "food"],
    ["house", "къща", "This is my house.", "home"], ["book", "книга", "I read a book.", "school"],
    ["friend", "приятел", "My friend is kind.", "people"], ["family", "семейство", "My family is small.", "people"],
    ["school", "училище", "I go to school.", "school"], ["music", "музика", "I like music.", "fun"],
    ["happy", "щастлив", "I am happy today.", "feeling"], ["small", "малък", "The cat is small.", "basic"],
    ["big", "голям", "The house is big.", "basic"], ["red", "червен", "The apple is red.", "colors"],
    ["green", "зелен", "The leaf is green.", "colors"], ["table", "маса", "The book is on the table.", "home"],
    ["chair", "стол", "I sit on a chair.", "home"], ["morning", "сутрин", "Good morning!", "time"],
    ["night", "нощ", "Good night.", "time"], ["city", "град", "I live in a city.", "places"],
    ["street", "улица", "The street is quiet.", "places"], ["car", "кола", "The car is blue.", "travel"]
  ],
  A2: [
    ["market", "пазар", "We buy fruit at the market.", "city"], ["ticket", "билет", "I need a ticket.", "travel"],
    ["weather", "време", "The weather is sunny.", "daily"], ["doctor", "лекар", "She is a doctor.", "jobs"],
    ["kitchen", "кухня", "The kitchen is clean.", "home"], ["question", "въпрос", "I have a question.", "school"],
    ["answer", "отговор", "This answer is correct.", "school"], ["travel", "пътувам", "I travel by train.", "travel"],
    ["cheap", "евтин", "This bag is cheap.", "shopping"], ["expensive", "скъп", "The phone is expensive.", "shopping"],
    ["usually", "обикновено", "I usually wake up early.", "time"], ["sometimes", "понякога", "Sometimes I cook dinner.", "time"],
    ["because", "защото", "I study because I want to improve.", "grammar"], ["before", "преди", "Wash your hands before dinner.", "time"],
    ["after", "след", "We walk after lunch.", "time"], ["healthy", "здравословен", "Vegetables are healthy.", "food"],
    ["busy", "зает", "I am busy today.", "daily"], ["ready", "готов", "Are you ready?", "daily"],
    ["invite", "каня", "I invite my friend.", "social"], ["message", "съобщение", "Send me a message.", "social"]
  ],
  B1: [
    ["improve", "подобрявам", "I want to improve my English.", "learning"], ["decision", "решение", "This is an important decision.", "ideas"],
    ["experience", "опит", "Travel gives you experience.", "ideas"], ["opinion", "мнение", "What is your opinion?", "speaking"],
    ["explain", "обяснявам", "Can you explain the rule?", "speaking"], ["compare", "сравнявам", "Compare the two photos.", "thinking"],
    ["support", "подкрепям", "My team supports me.", "people"], ["challenge", "предизвикателство", "Learning is a challenge.", "learning"],
    ["avoid", "избягвам", "Avoid repeating the same mistake.", "habits"], ["prepare", "подготвям", "I prepare for the interview.", "work"],
    ["relationship", "връзка", "Good relationships need trust.", "people"], ["environment", "околна среда", "We protect the environment.", "world"],
    ["opportunity", "възможност", "This job is a great opportunity.", "work"], ["confident", "уверен", "She feels confident.", "feeling"],
    ["although", "въпреки че", "Although it rained, we walked.", "grammar"], ["however", "обаче", "It was hard; however, I tried.", "grammar"],
    ["solution", "решение", "We found a solution.", "thinking"], ["goal", "цел", "My goal is clear.", "learning"],
    ["habit", "навик", "Daily practice becomes a habit.", "habits"], ["recently", "наскоро", "I recently started a course.", "time"]
  ],
  C1: [
    ["nevertheless", "въпреки това", "It was risky; nevertheless, we continued.", "grammar"], ["assumption", "предположение", "Your assumption may be wrong.", "thinking"],
    ["evidence", "доказателство", "The evidence supports the idea.", "academic"], ["perspective", "гледна точка", "This perspective is useful.", "ideas"],
    ["significant", "значителен", "There was a significant change.", "academic"], ["accurate", "точен", "The report is accurate.", "academic"],
    ["subtle", "фин", "There is a subtle difference.", "nuance"], ["complex", "сложен", "This is a complex issue.", "academic"],
    ["argue", "твърдя", "Researchers argue that sleep matters.", "academic"], ["maintain", "поддържам", "We maintain high standards.", "work"],
    ["consequence", "последствие", "Every choice has a consequence.", "ideas"], ["efficient", "ефективен", "This method is efficient.", "work"],
    ["reliable", "надежден", "The data is reliable.", "academic"], ["interpret", "тълкувам", "How do you interpret this result?", "academic"],
    ["clarify", "изяснявам", "Let me clarify my point.", "speaking"], ["briefly", "накратко", "Briefly explain your answer.", "speaking"],
    ["widespread", "широко разпространен", "The belief is widespread.", "world"], ["insight", "прозрение", "The article gives useful insight.", "ideas"],
    ["priority", "приоритет", "Health is a priority.", "life"], ["ultimately", "в крайна сметка", "Ultimately, practice wins.", "grammar"]
  ]
};

const THEMES = [
  "daily life", "home", "food", "travel", "work", "school", "people", "health", "technology", "nature",
  "shopping", "feelings", "time", "city", "hobbies", "conversation", "grammar", "stories", "culture", "plans"
];

const GRAMMAR_MODULES = [
  { title: "Present Simple", rule: "Използва се за навици и факти.", example: "He works every day.", prompt: "She ___ a doctor.", answer: "is" },
  { title: "Past Simple", rule: "Използва се за завършени действия в миналото.", example: "I visited London.", prompt: "They ___ football yesterday.", answer: "played" },
  { title: "Future with going to", rule: "Използва се за планове.", example: "I am going to study.", prompt: "We are ___ to travel.", answer: "going" },
  { title: "Comparatives", rule: "Сравняваме две неща.", example: "English is easier today.", prompt: "This lesson is ___ than yesterday.", answer: "better" }
];

function buildWordBank() {
  const result = [];
  const levelOrder = ["A1", "A2", "B1", "C1"];

  levelOrder.forEach((level) => {
    for (let i = 0; i < 250; i += 1) {
      const seed = WORD_SEEDS[level][i % WORD_SEEDS[level].length];
      const cycle = Math.floor(i / WORD_SEEDS[level].length);
      const theme = THEMES[(i + cycle) % THEMES.length];
      const suffix = cycle === 0 ? "" : ` ${cycle + 1}`;
      result.push({
        id: `${level.toLowerCase()}-${i + 1}`,
        level,
        english: `${seed[0]}${suffix}`,
        bulgarian: `${seed[1]}${suffix}`,
        sentence: seed[2],
        category: seed[3] || theme,
        image: theme
      });
    }
  });

  return result;
}

function buildLessons() {
  const words = buildWordBank();
  const lessons = [];
  ["A1", "A2", "B1", "C1"].forEach((level) => {
    const levelWords = words.filter((word) => word.level === level);
    for (let i = 0; i < 25; i += 1) {
      lessons.push({
        id: `${level}-lesson-${i + 1}`,
        level,
        title: `${LEVELS.find((item) => item.id === level).title} Lesson ${i + 1}`,
        theme: THEMES[i % THEMES.length],
        words: levelWords.slice(i * 10, i * 10 + 10)
      });
    }
  });
  return lessons;
}

const WORDS = buildWordBank();
const LESSONS = buildLessons();
