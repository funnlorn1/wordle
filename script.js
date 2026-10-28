"use strict";

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const GAME_KEY = "funnlorn-wordle-daily-v2";
const STATS_KEY = "funnlorn-wordle-stats-v2";
const normalize = value => String(value || "").trim().toUpperCase().replace(/Ё/g, "Е");

const answers = [...new Set((Array.isArray(WORDS) ? WORDS : [])
  .map(normalize).filter(word => /^[А-Я]{5}$/.test(word)))];
const validWords = new Set(answers);

const $ = id => document.getElementById(id);
const board = $("board");
const keyboard = $("keyboard");
const message = $("message");
const attemptsLabel = $("attempts");
const modeLabel = $("mode-label");
const wordNumberLabel = $("word-number");

const keyboardRows = ["ЙЦУКЕНГШЩЗХ", "ФЫВАПРОЛДЖЭ", "ЯЧСМИТЬБЮ"];
const state = {
  mode: "daily",
  target: "",
  guesses: [],
  current: "",
  finished: false,
  outcome: "",
  keyButtons: {},
  tiles: [],
  messageTimer: null
};

const emptyStats = () => ({
  played: 0, wins: 0, streak: 0, maxStreak: 0,
  distribution: [0, 0, 0, 0, 0, 0], lastPlayed: ""
});

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
let stats = { ...emptyStats(), ...readJSON(STATS_KEY, {}) };
if (!Array.isArray(stats.distribution) || stats.distribution.length !== 6) {
  stats.distribution = [0, 0, 0, 0, 0, 0];
}

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}
function dayIndex() {
  const now = new Date();
  const utcToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((utcToday - Date.UTC(2026, 0, 1)) / 86400000);
}
function dailyWord() {
  if (!answers.length) return "";
  const i = ((dayIndex() % answers.length) + answers.length) % answers.length;
  return answers[i];
}
function randomWord(exclude = "") {
  const pool = answers.filter(word => word !== exclude);
  const source = pool.length ? pool : answers;
  return source[Math.floor(Math.random() * source.length)] || "";
}

function createBoard() {
  board.replaceChildren();
  state.tiles = [];
  for (let row = 0; row < MAX_ATTEMPTS; row++) {
    const rowEl = document.createElement("div");
    rowEl.className = "board-row";
    for (let col = 0; col < WORD_LENGTH; col++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      rowEl.appendChild(tile);
      state.tiles.push(tile);
    }
    board.appendChild(rowEl);
  }
}
function createKeyboard() {
  keyboard.replaceChildren();
  state.keyButtons = {};
  keyboardRows.forEach((letters, rowIndex) => {
    const row = document.createElement("div");
    row.className = "keyboard-row";
    if (rowIndex === 2) row.appendChild(makeKey("ВВОД", "enter-key"));
    for (const letter of letters) row.appendChild(makeKey(letter, "letter-key"));
    if (rowIndex === 2) row.appendChild(makeKey("⌫", "backspace-key"));
    keyboard.appendChild(row);
  });
}
function makeKey(label, extraClass) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `key ${extraClass}`;
  button.textContent = label;
  if (/^[А-ЯЁ]$/i.test(label)) state.keyButtons[normalize(label)] = button;
  button.addEventListener("click", () => {
    if (label === "ВВОД") submitGuess();
    else if (label === "⌫") deleteLetter();
    else addLetter(label);
  });
  return button;
}

function scoreGuess(guess, answer) {
  const result = Array(WORD_LENGTH).fill("absent");
  const remaining = answer.split("");
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
      remaining[i] = null;
    }
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "correct") continue;
    const pos = remaining.indexOf(guess[i]);
    if (pos !== -1) {
      result[i] = "present";
      remaining[pos] = null;
    }
  }
  return result;
}

function renderBoard() {
  const all = state.guesses.join("") + state.current;
  state.tiles.forEach((tile, index) => {
    const row = Math.floor(index / WORD_LENGTH);
    const col = index % WORD_LENGTH;
    tile.textContent = all[row * WORD_LENGTH + col] || "";
    tile.className = "tile";
    if (tile.textContent) tile.classList.add("filled");
    if (row < state.guesses.length) {
      tile.classList.add(scoreGuess(state.guesses[row], state.target)[col]);
    }
  });
  attemptsLabel.textContent = `${state.guesses.length} / ${MAX_ATTEMPTS}`;
}
function renderKeyboard() {
  Object.values(state.keyButtons).forEach(button => {
    button.classList.remove("correct", "present", "absent");
  });
  const rank = { absent: 1, present: 2, correct: 3 };
  state.guesses.forEach(guess => {
    scoreGuess(guess, state.target).forEach((color, i) => {
      const button = state.keyButtons[guess[i]];
      if (!button) return;
      const old = ["correct", "present", "absent"].find(c => button.classList.contains(c));
      if (!old || rank[color] > rank[old]) {
        button.classList.remove("correct", "present", "absent");
        button.classList.add(color);
      }
    });
  });
}
function render() {
  renderBoard();
  renderKeyboard();
  renderStats();
}
function showMessage(text, duration = 2000) {
  message.textContent = text;
  clearTimeout(state.messageTimer);
  if (duration > 0) {
    state.messageTimer = setTimeout(() => {
      if (message.textContent === text) message.textContent = "";
    }, duration);
  }
}
function addLetter(letter) {
  if (state.finished || state.current.length >= WORD_LENGTH) return;
  const value = normalize(letter);
  if (!/^[А-Я]$/.test(value)) return;
  state.current += value;
  renderBoard();
}
function deleteLetter() {
  if (state.finished || !state.current) return;
  state.current = state.current.slice(0, -1);
  renderBoard();
}

function submitGuess() {
  if (state.finished) {
    showMessage("Эта партия уже завершена. Нажми «Новая игра».");
    return;
  }
  if (state.current.length !== WORD_LENGTH) {
    showMessage("Введи слово из 5 букв");
    return;
  }
  if (!validWords.has(state.current)) {
    showMessage("Такого слова нет в словаре");
    return;
  }

  state.guesses.push(state.current);
  state.current = "";
  const won = state.guesses[state.guesses.length - 1] === state.target;
  if (won) finishGame(true);
  else if (state.guesses.length >= MAX_ATTEMPTS) finishGame(false);
  else {
    saveDailyState();
    render();
  }
}
function finishGame(won) {
  state.finished = true;
  state.outcome = won ? "win" : "loss";
  if (won) showMessage("Есть! Ты угадал слово 🎉", 0);
  else showMessage(`Попытки закончились. Ответ: ${state.target}`, 0);

  if (state.mode === "daily") recordDailyResult(won);
  saveDailyState();
  render();
}
function recordDailyResult(won) {
  if (stats.lastPlayed === dayKey()) return;
  stats.played++;
  stats.lastPlayed = dayKey();
  if (won) {
    stats.wins++;
    stats.streak++;
    stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
    stats.distribution[state.guesses.length - 1]++;
  } else {
    stats.streak = 0;
  }
  saveJSON(STATS_KEY, stats);
}
function saveDailyState() {
  if (state.mode !== "daily") return;
  saveJSON(GAME_KEY, {
    date: dayKey(), guesses: state.guesses,
    finished: state.finished, outcome: state.outcome
  });
}
function loadDailyState() {
  const saved = readJSON(GAME_KEY, null);
  if (!saved || saved.date !== dayKey()) return;
  state.guesses = Array.isArray(saved.guesses)
    ? saved.guesses.map(normalize).filter(word => /^[А-Я]{5}$/.test(word)).slice(0, MAX_ATTEMPTS)
    : [];
  state.finished = Boolean(saved.finished);
  state.outcome = saved.outcome || "";
  if (state.finished) {
    showMessage(state.outcome === "win" ? "Слово дня уже угадано!" : `Слово дня: ${state.target}`, 0);
  }
}
function startDailyGame() {
  state.mode = "daily";
  state.target = dailyWord();
  state.guesses = [];
  state.current = "";
  state.finished = false;
  state.outcome = "";
  modeLabel.textContent = "DAILY CHALLENGE";
  wordNumberLabel.textContent = `WORD #${String(Math.max(1, dayIndex() + 1)).padStart(3, "0")}`;
  loadDailyState();
  render();
  if (!state.finished) showMessage("Угадай слово из пяти букв");
}
function startTrainingGame() {
  state.mode = "training";
  state.target = randomWord(dailyWord());
  state.guesses = [];
  state.current = "";
  state.finished = false;
  state.outcome = "";
  modeLabel.textContent = "TRAINING MODE";
  wordNumberLabel.textContent = "НОВАЯ ПАРТИЯ";
  render();
  showMessage("Тренировка началась — новое слово! 🎮");
}

function renderStats() {
  $("stat-played").textContent = stats.played;
  $("stat-wins").textContent = stats.played ? `${Math.round(stats.wins / stats.played * 100)}%` : "0%";
  $("stat-streak").textContent = stats.streak;
  $("stat-max-streak").textContent = stats.maxStreak;
  const container = $("stats-distribution");
  container.replaceChildren();
  const max = Math.max(1, ...stats.distribution);
  stats.distribution.forEach((count, i) => {
    const row = document.createElement("div");
    row.className = "distribution-row";
    const label = document.createElement("span");
    label.textContent = String(i + 1);
    const bar = document.createElement("div");
    bar.className = "distribution-bar";
    const fill = document.createElement("div");
    fill.className = "distribution-fill";
    fill.style.width = `${Math.max(count ? 8 : 0, count / max * 100)}%`;
    fill.textContent = String(count);
    bar.appendChild(fill);
    row.append(label, bar);
    container.appendChild(row);
  });
}
function shareText() {
  const squares = state.guesses.map(guess => scoreGuess(guess, state.target).map(color => {
    if (color === "correct") return "🟪";
    if (color === "present") return "🟨";
    return "⬛";
  }).join(""));
  const result = state.outcome === "win" ? `${state.guesses.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
  return `FUNNLORN WORDLE ${state.mode === "daily" ? `#${Math.max(1, dayIndex() + 1)}` : "TRAINING"}\n${result}\n\n${squares.join("\n")}`;
}
async function shareResult() {
  if (!state.finished) {
    showMessage("Закончи партию, чтобы поделиться результатом");
    return;
  }
  const text = shareText();
  try {
    if (navigator.share) await navigator.share({ text });
    else if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showMessage("Результат скопирован!");
    } else {
      window.prompt("Скопируй результат:", text);
    }
  } catch (error) {
    if (error && error.name !== "AbortError") showMessage("Не удалось поделиться результатом");
  }
}
function handleKey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === "Enter") {
    event.preventDefault();
    submitGuess();
  } else if (event.key === "Backspace") {
    event.preventDefault();
    deleteLetter();
  } else if (/^[а-яё]$/i.test(event.key)) {
    addLetter(event.key);
  }
}

$("restart-button").addEventListener("click", startTrainingGame);
$("share-button").addEventListener("click", shareResult);
document.addEventListener("keydown", handleKey);

if (!answers.length) {
  showMessage("Ошибка словаря: нет слов из пяти букв", 0);
  board.textContent = "Проверь файл words.js";
} else {
  createBoard();
  createKeyboard();
  startDailyGame();
}
