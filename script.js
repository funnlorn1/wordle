"use strict";

// FUNNLORN WORDLE

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const STORAGE_KEY = "funnlorn-wordle-v2";
const STATS_KEY = "funnlorn-wordle-stats-v2";

const normalize = (word) =>
  String(word).trim().toUpperCase().replace(/Ё/g, "Е");

const answers = [...new Set(
  (typeof WORDS !== "undefined" ? WORDS : [])
    .map(normalize)
    .filter(word => /^[А-Я]{5}$/.test(word))
)];

const validWords = new Set(answers);

const board = document.getElementById("board");
const keyboard = document.getElementById("keyboard");
const message = document.getElementById("message");
const attemptsElement =
  document.getElementById("attempts") ||
  document.getElementById("attempt-count");

const restartButton = document.getElementById("restart-button");
const shareButton = document.getElementById("share-button");

const keyboardRows = [
  "ЙЦУКЕНГШЩЗХ",
  "ФЫВАПРОЛДЖЭ",
  "ЯЧСМИТЬБЮ"
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dailyWord() {
  if (!answers.length) return "СЛОВО";

  const start = Date.UTC(2026, 0, 1);
  const today = new Date();
  const currentDay = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );

  const dayNumber = Math.floor((currentDay - start) / 86400000);
  const index = ((dayNumber % answers.length) + answers.length) % answers.length;

  return answers[index];
}

function randomWord(exclude = "") {
  if (!answers.length) return "СЛОВО";

  const options = answers.filter(word => word !== exclude);
  const pool = options.length ? options : answers;

  return pool[Math.floor(Math.random() * pool.length)];
}

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Игра продолжит работать, даже если хранилище недоступно.
  }
}

function emptyStats() {
  return {
    played: 0,
    wins: 0,
    streak: 0,
    maxStreak: 0,
    distribution: [0, 0, 0, 0, 0, 0],
    lastPlayed: ""
  };
}

let stats = {
  ...emptyStats(),
  ...readStorage(STATS_KEY, {})
};

let mode = "daily";
let target = dailyWord();
let guesses = [];
let currentGuess = "";
let finished = false;
let gameResult = "";
let messageTimer = null;
let tileElements = [];
let keyElements = {};

function showMessage(text, duration = 1800) {
  if (!message) return;

  message.textContent = text;
  message.classList.add("show");

  clearTimeout(messageTimer);

  if (duration > 0) {
    messageTimer = setTimeout(() => {
      message.classList.remove("show");
    }, duration);
  }
}

function createBoard() {
  if (!board) return;

  board.replaceChildren();
  tileElements = [];

  for (let row = 0; row < MAX_ATTEMPTS; row++) {
    const rowElement = document.createElement("div");
    rowElement.className = "board-row";

    for (let col = 0; col < WORD_LENGTH; col++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.setAttribute("aria-label", `Строка ${row + 1}, буква ${col + 1}`);
      rowElement.appendChild(tile);
      tileElements.push(tile);
    }

    board.appendChild(rowElement);
  }
}

function createKeyboard() {
  if (!keyboard) return;

  keyboard.replaceChildren();
  keyElements = {};

  keyboardRows.forEach((letters, index) => {
    const row = document.createElement("div");
    row.className = "keyboard-row";

    if (index === 2) {
      const enter = makeKey("ВВОД", "enter-key");
      row.appendChild(enter);
    }

    for (const letter of letters) {
      const key = makeKey(letter, "letter-key");
      row.appendChild(key);
    }

    if (index === 2) {
      const backspace = makeKey("⌫", "backspace-key");
      row.appendChild(backspace);
    }

    keyboard.appendChild(row);
  });
}

function makeKey(label, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `key ${extraClass}`.trim();
  button


er();
    return;
  }

  if (/^[а-яё]$/i.test(event.key)) {
    addLetter(event.key);
  }
}

if (restartButton) {
  restartButton.addEventListener("click", startTrainingGame);
}

if (shareButton) {
  shareButton.addEventListener("click", shareResult);
}

document.addEventListener("keydown", handlePhysicalKeyboard);

// Дополнительная защита от пустого или невалидного словаря.
if (!answers.length) {
  showMessage("Ошибка словаря: нет подходящих слов", 0);
} else {
  createBoard();
  createKeyboard();
  startDailyGame();
  renderStats();
}.tex


tContent = label;
  button.setAttribute("aria-label", label === "⌫" ? "Удалить букву" : label);

  if (label.length === 1 && /^[А-ЯЁ]$/.test(label)) {
    keyElements[normalize(label)] = button;
  }

  button.addEventListener("click", () => {
    if (label === "ВВОД") {
      submitGuess();
    } else if (label === "⌫") {
      deleteLetter();
    } else {
      addLetter(label);
    }
  });

  return button;
}

function currentRowIndex() {
  return guesses.length;
}

function renderBoard() {
  if (!board) return;

  const letters = guesses.join("") + currentGuess;
  const colors = guesses.map(guess => scoreGuess(guess, target));

  tileElements.forEach((tile, index) => {
    const row = Math.floor(index / WORD_LENGTH);
    const col = index % WORD_LENGTH;
    const letter = letters[row * WORD_LENGTH + col] || "";

    tile.textContent = letter;
    tile.classList.remove(
      "filled", "correct", "present", "absent", "flip"
    );

    if (letter) tile.classList.add("filled");

    if (row < guesses.length) {
      const status = colors[row][col];
      tile.classList.add(status);
    }
  });

  if (attemptsElement) {
    attemptsElement.textContent =
      `${guesses.length}/${MAX_ATTEMPTS}`;
  }
}

function scoreGuess(guess, answer) {
  const result = Array(WORD_LENGTH).fill("absent");
  const remaining = answer.split("");

  // Сначала отмечаем совпадения по позиции.
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
      remaining[i] = null;
    }
  }

  // Затем учитываем буквы в других позициях и повторы.
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "correct") continue;

    const found = remaining.indexOf(guess[i]);

    if (found !== -1) {
      result[i] = "present";
      remaining[found] = null;
    }
  }

  return result;
}

function updateKeyboard() {
  Object.values(keyElements).forEach(key => {
    key.classList.remove("correct", "present", "absent");
  });

  const priority = { absent: 1, present: 2, correct: 3 };

  guesses.forEach(guess => {
    const result = scoreGuess(guess, target);

    [...guess].forEach((letter, index) => {
      const key = keyElements[letter];
      if (!key) return;

      const next = result[index];
      const current = ["correct", "present", "absent"].find(
        className => key.classList.contains(className)
      );

      if (!current || priority[next] > priority[current]) {
        key.classList.remove("correct", "present", "absent");
        key.classList.add(next);
      }
    });
  });
}

function addLetter(letter) {
  if (finished || currentGuess.length >= WORD_LENGTH) return;

  const normalized = normalize(letter);

  if (!/^[А-Я]$/.test(normalized)) return;

  currentGuess += normalized;
  renderBoard();
}

function deleteLetter() {
  if (finished || !currentGuess.length) return;

  currentGuess = currentGuess.slice(0, -1);
  renderBoard();
}

function submitGuess() {
  if (finished) return;

  if (currentGuess.length !== WORD_LENGTH) {
    showMessage("Нужно ввести 5 букв");
    return;
  }

  if (!validWords.has(currentGuess)) {
    showMessage("Такого слова нет в словаре");
    return;
  }

  guesses.push(currentGuess);
  currentGuess = "";

  renderBoard();
  updateKeyboard();

  if (guesses[guesses.length - 1] === target) {
    finishGame(true);
    return;
  }

  if (guesses.length >= MAX_ATTEMPTS) {
    finishGame(false);
    return;
  }

  saveDailyGame();
}

function finishGame(won) {
  finished = true;
  gameResult = won ? "win" : "loss";

  if (won) {
    showMessage("Красиво! Ты угадал слово 🎉", 0);
  } else {
    showMessage(`Попытки закончились. Слово: ${target}`, 0);
  }

  if (mode === "daily") {
    updateDailyStats(won);
    saveDailyGame();
  }

  renderBoard();
  updateKeyboard();
  renderStats();
}

function updateDailyStats(won) {
  if (stats.lastPlayed === todayKey()) return;

  stats.played += 1;
  stats.lastPlayed = todayKey();

  if (won) {
    stats.wins += 1;
    stats.streak += 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
    stats.distr


ibution[guesses.length - 1] += 1;
  } else {
    stats.streak = 0;
  }

  writeStorage(STATS_KEY, stats);
}

function saveDailyGame() {
  if (mode !== "daily") return;

  writeStorage(STORAGE_KEY, {
    date: todayKey(),
    guesses,
    finished,
    gameResult
  });
}

function loadDailyGame() {
  const saved = readStorage(STORAGE_KEY, null);

  if (!saved || saved.date !== todayKey()) return;

  const restored = Array.isArray(saved.guesses)
    ? saved.guesses
        .map(normalize)
        .filter(word => /^[А-Я]{5}$/.test(word))
        .slice(0, MAX_ATTEMPTS)
    : [];

  guesses = restored;
  finished = Boolean(saved.finished);
  gameResult = saved.gameResult || "";

  if (finished) {
    showMessage(
      gameResult === "win"
        ? "Ты уже угадал слово дня!"
        : `Слово дня: ${target}`,
      0
    );
  }
}

function startDailyGame() {
  mode = "daily";
  target = dailyWord();
  guesses = [];
  currentGuess = "";
  finished = false;
  gameResult = "";

  loadDailyGame();
  renderBoard();
  updateKeyboard();

  if (!finished) {
    showMessage("Слово дня готово. Удачи!", 1500);
  }
}

function startTrainingGame() {
  mode = "training";
  target = randomWord(dailyWord());
  guesses = [];
  currentGuess = "";
  finished = false;
  gameResult = "";

  renderBoard();
  updateKeyboard();
  showMessage("Тренировка началась! Новое слово 🎮", 2000);
}

function renderStats() {
  const played = document.getElementById("stat-played");
  const wins = document.getElementById("stat-wins");
  const streak = document.getElementById("stat-streak");
  const maxStreak = document.getElementById("stat-max-streak");
  const distribution = document.getElementById("stats-distribution");

  if (played) played.textContent = stats.played;
  if (wins) {
    wins.textContent = stats.played
      ? `${Math.round((stats.wins / stats.played) * 100)}%`
      : "0%";
  }
  if (streak) streak.textContent = stats.streak;
  if (maxStreak) maxStreak.textContent = stats.maxStreak;

  if (distribution) {
    distribution.replaceChildren();

    const max = Math.max(1, ...stats.distribution);

    stats.distribution.forEach((count, index) => {
      const row = document.createElement("div");
      row.className = "distribution-row";

      const label = document.createElement("span");
      label.textContent = String(index + 1);

      const bar = document.createElement("div");
      bar.className = "distribution-bar";

      const fill = document.createElement("div");
      fill.className = "distribution-fill";
      fill.style.width = `${(count / max) * 100}%`;
      fill.textContent = String(count);

      bar.appendChild(fill);
      row.append(label, bar);
      distribution.appendChild(row);
    });
  }
}

function resultText() {
  const lines = guesses.map(guess =>
    scoreGuess(guess, target).map(status => {
      if (status === "correct") return "🟪";
      if (status === "present") return "🟨";
      return "⬛";
    }).join("")
  );

  const heading = mode === "daily"
    ? "FUNNLORN WORDLE — слово дня"
    : "FUNNLORN WORDLE — тренировка";

  const outcome = gameResult === "win"
    ? `${guesses.length}/${MAX_ATTEMPTS}`
    : `X/${MAX_ATTEMPTS}`;

  return `${heading}\n${outcome}\n\n${lines.join("\n")}`;
}

async function shareResult() {
  if (!finished) {
    showMessage("Сначала закончи игру!");
    return;
  }

  const text = resultText();

  try {
    if (navigator.share) {
      await navigator.share({ text });
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showMessage("Результат скопирован!");
    } else {
      showMessage("Не удалось поделиться на этом устройстве");
    }
  } catch (error) {
    if (error?.name !== "AbortError") {
      showMessage("Не удалось поделиться результатом");
    }
  }
}

function handlePhysicalKeyboard(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  if (event.key === "Enter") {
    event.preventDefault();
    submitGuess();
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    deleteLetter();


return;

  }

  if (/^[а-яё]$/i.test(event.key)) {

    addLetter(event.key);

  }

}

if (restartButton) {

  restartButton.addEventListener("click", startTrainingGame);

}

if (shareButton) {

  shareButton.addEventListener("click", shareResult);

}

document.addEventListener("keydown", handlePhysicalKeyboard);

// Дополнительная защита от пустого или невалидного словаря.

if (!answers.length) {

  showMessage("Ошибка словаря: нет подходящих слов", 0);

} else {

  createBoard();

  createKeyboard();

  startDailyGame();

  renderStats();

}
