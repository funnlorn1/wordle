(() => {
  "use strict";

  const ROWS = 6;
  const COLS = 5;
  const STORAGE_KEY = "funnlorn-wordle-v1";

  const $ = id => document.getElementById(id);

  const board = $("board");
  const keyboard = $("keyboard");
  const message = $("message");

  const normalize = word => word
    .toLocaleUpperCase("ru-RU")
    .replace(/Ё/g, "Е");

  // Оставляем только слова из пяти букв.
  const answers = [...new Set(
    WORDS.map(normalize).filter(word => /^[А-Я]{5}$/.test(word))
  )];

  const validWords = new Set(answers);

  if (answers.length === 0) {
    message.textContent = "Словарь пуст. Проверь файл words.js.";
    return;
  }

  // Дата в UTC обеспечивает одно слово дня для всех игроков.
  function getDailyInfo() {
    const date = new Date();
    const day = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    );

    const epoch = Date.UTC(2026, 0, 1);
    const dayNumber = Math.floor((day - epoch) / 86400000);

    return {
      date: date.toISOString().slice(0, 10),
      number: dayNumber + 1,
      answer: answers[((dayNumber % answers.length) + answers.length) % answers.length]
    };
  }

  const daily = getDailyInfo();

  $("date-label").textContent =
    "WORD #" + String(daily.number).padStart(3, "0");

  let guesses = [];
  let current = "";
  let finished = false;
  let won = false;
  let revealAnswer = false;
  let keyStates = {};
  let stats = loadStats();

  function loadStats() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
        played: 0,
        wins: 0,
        streak: 0,
        best: 0,
        lastPlayed: "",
        distribution: [0, 0, 0, 0, 0, 0],
        games: {}
      };
    } catch {
      return {
        played: 0,
        wins: 0,
        streak: 0,
        best: 0,
        lastPlayed: "",
        distribution: [0, 0, 0, 0, 0, 0],
        games: {}
      };
    }
  }

  function saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // Игра продолжает работать, даже если хранилище недоступно.
    }
  }

  function saveGame() {
    try {
      localStorage.setItem("funnlorn-wordle-game-v1", JSON.stringify({
        date: daily.date,
        guesses,
        finished,
        won,
        revealAnswer,
        keyStates
      }));
    } catch {}
  }

  function restoreGame() {
    try {
      const saved = JSON.parse(
        localStorage.getItem("funnlorn-wordle-game-v1")
      );

      if (!saved || saved.date !== daily.date) return;

      const validSavedGuesses = Array.isArray(saved.guesses)
        ? saved.guesses.filter(word =>
            typeof word === "string" &&
            /^[А-Я]{5}$/.test(word) &&
            validWords.has(word)
          ).slice(0, ROWS)
        : [];

      guesses = validSavedGuesses;
      finished = Boolean(saved.finished);
      won = Boolean(saved.won);
      revealAnswer = Boolean(saved.revealAnswer);
      keyStates = saved.keyStates || {};

      if (guesses.length >= ROWS) finished = true;
      if (guesses.includes(daily.answer)) {
        finished = true;
        won = true;
      }

      if (finished && !revealAnswer) {
        revealAnswer = true;
      }
    } catch {}
  }

  const keyboardRows = [
    ["Й","Ц","У","К","Е","Н","Г","Ш","Щ","З","Х"],
    ["Ф","Ы","В","А","П","Р","О","Л","Д","Ж","Э"],
    ["ENTER","Я","Ч","С","М","И","Т","Ь","Б","Ю","⌫"]
  ];

  function createBoard() {
    board.replaceChildren();

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.id = `tile-${row}-${col}`;
        tile.setAttribute("aria-label", `Попытка ${row + 1}, буква ${col + 1}`);
        board.appendChild(tile);
      }
    }
  }

  function createKeyboard() {
    keyboard.replaceChildren();

    keyboardRows.forEach((letters, rowIndex) => {
      const row = document.createElement("div");
      row.className = "key-row";

      letters.forEach(letter => {
        const button = document
TILE – Bluetooth Tracker
TILE – Bluetooth Tracker
tile.id


ateElement("button");
        button.type = "button";
        button.className = "key";
        button.textContent = letter;
        button.dataset.key = letter;
        button.setAttribute("aria-label",
          letter === "ENTER" ? "Проверить слово" :
          letter === "⌫" ? "Удалить букву" : letter
        );

        if (letter === "ENTER" || letter === "⌫") {
          button.classList.add("wide");
        }

        button.addEventListener("click", () => handleKey(letter));
        row.appendChild(button);
      });

      keyboard.appendChild(row);
    });
  }

  function renderBoard() {
    for (let row = 0; row < ROWS; row++) {
      const guess = guesses[row] || "";
      const isCurrent = row === guesses.length && !finished;

      for (let col = 0; col < COLS; col++) {
        const tile = $(`tile-${row}-${col}`);
        const letter = isCurrent
          ? current[col] || ""
          : guess[col] || "";

        tile.textContent = letter;
        tile.className = "tile";

        if (letter) tile.classList.add("filled");

        if (row < guesses.length) {
          const result = evaluateGuess(guess, daily.answer);
          tile.classList.add(result[col]);
        }
      }
    }

    $("attempt-count").textContent =
      `${guesses.length} / ${ROWS}`;
  }

  // Правильно обрабатываем повторяющиеся буквы.
  function evaluateGuess(guess, answer) {
    const result = Array(COLS).fill("absent");
    const remaining = answer.split("");

    for (let i = 0; i < COLS; i++) {
      if (guess[i] === answer[i]) {
        result[i] = "correct";
        remaining[i] = null;
      }
    }

    for (let i = 0; i < COLS; i++) {
      if (result[i] === "correct") continue;

      const index = remaining.indexOf(guess[i]);

      if (index !== -1) {
        result[i] = "present";
        remaining[index] = null;
      }
    }

    return result;
  }

  function renderKeyboard() {
    document.querySelectorAll(".key").forEach(button => {
      const state = keyStates[button.dataset.key];

      button.classList.remove("correct", "present", "absent");

      if (state) button.classList.add(state);
    });
  }

  function showMessage(text) {
    message.textContent = text;
  }

  function handleKey(key) {
    if (finished) return;

    if (key === "ENTER") {
      submitGuess();
      return;
    }

    if (key === "⌫" || key === "BACKSPACE") {
      current = current.slice(0, -1);
      renderBoard();
      return;
    }

    const letter = normalize(key);

    if (/^[А-Я]$/.test(letter) && current.length < COLS) {
      current += letter;
      renderBoard();
    }
  }

  function submitGuess() {
    if (current.length !== COLS) {
      showMessage("Нужно ввести 5 букв");
      return;
    }

    if (!validWords.has(current)) {
      showMessage("Этого слова нет в словаре");
      shakeCurrentRow();
      return;
    }

    const guess = current;
    guesses.push(guess);
    current = "";

    const result = evaluateGuess(guess, daily.answer);

    result.forEach((state, index) => {
      const letter = guess[index];
      const previous = keyStates[letter];

      const priority = {
        absent: 1,
        present: 2,
        correct: 3
      };

      if (!previous || priority[state] > priority[previous]) {
        keyStates[letter] = state;
      }
    });

    if (guess === daily.answer) {
      finished = true;
      won = true;
      revealAnswer = true;
      showMessage("Идеально! Ты угадал слово 🎉");
      recordResult(true);
    } else if (guesses.length >= ROWS) {
      finished = true;
      revealAnswer = true;
      showMessage(`Попытки закончились. Слово: ${daily.answer}`);
      recordResult(false);
    } else {
      showMessage("Продолжай, у тебя получится!");
    }

    renderBoard();
    renderKeyboard();
    saveGame();
  }

  function shakeCurrentRow() {
    const row = guesses.length;

    for (let col = 0; col < COLS; col++) {
      $(`tile-${row}-${col}`).classList.remove("shake");
      void $(`tile-${row}-${col}`).offsetWidth;
      $(`tile-${row}-${col}`).classList.add("shake");
    }


}

  function recordResult(didWin) {
    // Не записываем результат повторно за этот день.
    if (stats.games[daily.date]) return;

    stats.played++;
    stats.lastPlayed = daily.date;
    stats.games[daily.date] = {
      won: didWin,
      attempts: didWin ? guesses.length : null
    };

    if (didWin) {
      stats.wins++;
      stats.streak++;
      stats.best = Math.max(stats.best, stats.streak);
      stats.distribution[guesses.length - 1]++;
    } else {
      stats.streak = 0;
    }

    saveStats();
    renderStats();
  }

  function renderStats() {
    $("stat-played").textContent = stats.played;
    $("stat-win").textContent = stats.played
      ? Math.round(stats.wins / stats.played * 100) + "%"
      : "0%";
    $("stat-streak").textContent = stats.streak;
    $("stat-best").textContent = stats.best;

    const distribution = $("guess-distribution");
    distribution.replaceChildren();

    stats.distribution.forEach((count, index) => {
      const row = document.createElement("div");
      row.className = "distribution-row";

      const label = document.createElement("span");
      label.textContent = String(index + 1);

      const bar = document.createElement("div");
      bar.className = "distribution-bar";
      bar.textContent = String(count);
      bar.style.width =
        Math.max(24, count / Math.max(1, ...stats.distribution) * 100) + "%";

      if (won && guesses.length === index + 1) {
        bar.classList.add("highlight");
      }

      row.append(label, bar);
      distribution.appendChild(row);
    });
  }

  function shareResult() {
    if (!finished) {
      showMessage("Сначала закончи игру!");
      return;
    }

    const squares = {
      correct: "🟩",
      present: "🟨",
      absent: "⬛"
    };

    const grid = guesses.map(guess =>
      evaluateGuess(guess, daily.answer)
        .map(state => squares[state])
        .join("")
    ).join("\n");

    const result = [
      `FUNNLORN WORDLE #${daily.number}`,
      won ? `${guesses.length}/${ROWS}` : `X/${ROWS}`,
      "",
      grid,
      "",
      "Попробуй и ты!"
    ].join("\n");

    if (navigator.share) {
      navigator.share({ text: result }).catch(() => {});
    } else if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(result)
        .then(() => showMessage("Результат скопирован!"))
        .catch(() => showMessage("Не удалось скопировать результат"));
    } else {
      showMessage("Поделиться можно после публикации сайта по HTTPS");
    }
  }

  function restartGame() {
    if (finished) {
      showMessage("Слово дня уже сыграно. Возвращайся завтра!");
      return;
    }

    current = "";
    renderBoard();
    showMessage("Продолжаем угадывать!");
  }

  function handlePhysicalKeyboard(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === "Enter") {
      event.preventDefault();
      handleKey("ENTER");
    } else if (event.key === "Backspace") {
      event.preventDefault();
      handleKey("BACKSPACE");
    } else if (/^[а-яё]$/i.test(event.key)) {
      event.preventDefault();
      handleKey(event.key);
    }
  }

  $("share-button").addEventListener("click", shareResult);
  $("restart-button").addEventListener("click", restartGame);
  document.addEventListener("keydown", handlePhysicalKeyboard);

  restoreGame();
  createBoard();
  createKeyboard();
  renderBoard();
  renderKeyboard();
  renderStats();

  if (finished) {
    showMessage(won
      ? "Ты уже угадал слово дня! 🎉"
      : `Игра завершена. Слово: ${daily.answer}`
    );
  }
})();.cre
