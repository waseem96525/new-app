"use strict";

(function () {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("highScore");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");
  const speedSelect = document.getElementById("speedSelect");
  const dpadBtns = document.querySelectorAll(".dpad-btn");

  const CELL = 20; // 420x420 canvas -> 21x21 grid
  const COLS = Math.floor(canvas.width / CELL);
  const ROWS = Math.floor(canvas.height / CELL);

  const COLORS = {
    bg: "#111316",
    grid: "#1a1d22",
    snakeHead: "#40c463",
    snakeBody: "#2aa84a",
    food: "#ff4d4f",
    text: "#e6edf3",
    overlay: "rgba(0,0,0,0.35)",
  };

  let snake = [];
  let direction = { x: 1, y: 0 }; // current direction
  let nextDirection = { x: 1, y: 0 }; // queued direction from input
  let food = { x: 10, y: 10 };
  let score = 0;
  let highScore = 0;
  let tickMs = parseInt(speedSelect.value, 10);
  let timer = null;
  let running = false;
  let gameOver = false;

  // Touch handling
  let touchStart = null;
  const SWIPE_THRESHOLD = 20;

  function loadHighScore() {
    try {
      const saved = localStorage.getItem("snakeHighScore");
      highScore = saved ? parseInt(saved, 10) : 0;
    } catch (_) {
      highScore = 0;
    }
    highScoreEl.textContent = String(highScore);
  }

  function saveHighScore() {
    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = String(highScore);
      try {
        localStorage.setItem("snakeHighScore", String(highScore));
      } catch (_) {}
    }
  }

  function initSnake() {
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
  }

  function resetGame() {
    score = 0;
    scoreEl.textContent = String(score);
    gameOver = false;
    initSnake();
    placeFood();
    draw();
  }

  function cellEq(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function isOutOfBounds(cell) {
    return cell.x < 0 || cell.y < 0 || cell.x >= COLS || cell.y >= ROWS;
  }

  function snakeContains(cell, skipHead = false) {
    const startIndex = skipHead ? 1 : 0;
    for (let i = startIndex; i < snake.length; i++) {
      if (cellEq(snake[i], cell)) return true;
    }
    return false;
  }

  function randomInt(n) {
    return Math.floor(Math.random() * n);
  }

  function placeFood() {
    if (snake.length >= COLS * ROWS) {
      // Board full (edge case) - treat as win and set game over
      gameOver = true;
      stopLoop();
      draw();
      return;
    }
    let c;
    do {
      c = { x: randomInt(COLS), y: randomInt(ROWS) };
    } while (snakeContains(c));
    food = c;
  }

  function setDirection(dx, dy) {
    // Prevent immediate reverse
    if (dx === -direction.x && dy === -direction.y) return;
    nextDirection = { x: dx, y: dy };
  }

  function tick() {
    // apply next direction at start of tick
    direction = { ...nextDirection };
    const head = snake[0];
    const newHead = { x: head.x + direction.x, y: head.y + direction.y };

    // collisions
    if (isOutOfBounds(newHead) || snakeContains(newHead)) {
      gameOver = true;
      stopLoop();
      saveHighScore();
      draw();
      return;
    }

    // move
    snake.unshift(newHead);

    // food
    if (cellEq(newHead, food)) {
      score += 1;
      scoreEl.textContent = String(score);
      saveHighScore();
      placeFood();
    } else {
      snake.pop();
    }

    draw();
  }

  function startLoop() {
    if (running) return;
    tickMs = parseInt(speedSelect.value, 10) || 130;
    timer = setInterval(tick, tickMs);
    running = true;
    pauseBtn.textContent = "Pause";
  }

  function stopLoop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    running = false;
  }

  function togglePause() {
    if (!running && !gameOver) {
      startLoop();
    } else if (running) {
      stopLoop();
      pauseBtn.textContent = "Resume";
    } else if (gameOver) {
      // if game over, pause acts like resume (restart)
      resetGame();
      startLoop();
    }
  }

  function updateSpeed() {
    tickMs = parseInt(speedSelect.value, 10) || 130;
    if (running) {
      stopLoop();
      startLoop();
    }
  }

  function clearCanvas() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawGrid() {
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let x = CELL; x < canvas.width; x += CELL) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let y = CELL; y < canvas.height; y += CELL) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvas.width, y + 0.5);
      ctx.stroke();
    }
  }

  function drawCell(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
  }

  function drawSnake() {
    for (let i = 0; i < snake.length; i++) {
      const seg = snake[i];
      drawCell(seg.x, seg.y, i === 0 ? COLORS.snakeHead : COLORS.snakeBody);
    }
  }

  function drawFood() {
    drawCell(food.x, food.y, COLORS.food);
  }

  function drawOverlayText(lines) {
    ctx.fillStyle = COLORS.overlay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 24px system-ui, -apple-system, Segoe UI, Roboto";
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    lines.forEach((t, i) => {
      ctx.fillText(t, cx, cy + i * 28);
    });
  }

  function draw() {
    clearCanvas();
    drawGrid();
    drawSnake();
    drawFood();
    if (gameOver) {
      drawOverlayText([
        "Game Over",
        `Score: ${score}  •  High: ${highScore}`,
        "Press Reset or Start to play again",
      ]);
    }
  }

  // Input handlers
  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (["arrowup", "w"].includes(k)) {
      setDirection(0, -1);
      e.preventDefault();
    } else if (["arrowdown", "s"].includes(k)) {
      setDirection(0, 1);
      e.preventDefault();
    } else if (["arrowleft", "a"].includes(k)) {
      setDirection(-1, 0);
      e.preventDefault();
    } else if (["arrowright", "d"].includes(k)) {
      setDirection(1, 0);
      e.preventDefault();
    } else if (k === " ") {
      // space toggles pause
      togglePause();
      e.preventDefault();
    }
  }

  function onTouchStart(e) {
    const t = e.changedTouches ? e.changedTouches[0] : null;
    if (!t) return;
    touchStart = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e) {
    const t = e.changedTouches ? e.changedTouches[0] : null;
    if (!t || !touchStart) return;
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (ax < SWIPE_THRESHOLD && ay < SWIPE_THRESHOLD) return;
    if (ax > ay) {
      // horizontal swipe
      setDirection(dx > 0 ? 1 : -1, 0);
    } else {
      // vertical swipe
      setDirection(0, dy > 0 ? 1 : -1);
    }
    touchStart = null;
    e.preventDefault();
  }

  // D-pad controls
  dpadBtns.forEach((btn) => {
    const dir = btn.getAttribute("data-dir");
    btn.addEventListener("click", () => {
      if (dir === "up") setDirection(0, -1);
      else if (dir === "down") setDirection(0, 1);
      else if (dir === "left") setDirection(-1, 0);
      else if (dir === "right") setDirection(1, 0);
    });
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
    });
  });

  // Buttons
  startBtn.addEventListener("click", () => {
    if (gameOver) {
      resetGame();
    }
    startLoop();
  });

  pauseBtn.addEventListener("click", () => {
    togglePause();
  });

  resetBtn.addEventListener("click", () => {
    stopLoop();
    resetGame();
  });

  speedSelect.addEventListener("change", () => {
    updateSpeed();
  });

  // Keyboard
  window.addEventListener("keydown", onKeyDown, { passive: false });

  // Touch on canvas
  canvas.addEventListener("touchstart", onTouchStart, { passive: true });
  canvas.addEventListener("touchend", onTouchEnd, { passive: false });
  canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

  // Initialize
  loadHighScore();
  resetGame();
})();