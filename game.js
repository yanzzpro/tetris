(() => {
  const COLS = 10;
  const ROWS = 20;
  const CELL = 30;

  const COLORS = {
    I: "#4dd9e8",
    J: "#4d6fe8",
    L: "#e8a14d",
    O: "#e8d94d",
    S: "#4de87a",
    T: "#a14de8",
    Z: "#e84d5c",
  };

  const SHAPES = {
    I: [
      [0, 1], [1, 1], [2, 1], [3, 1],
    ],
    J: [
      [0, 0], [0, 1], [1, 1], [2, 1],
    ],
    L: [
      [2, 0], [0, 1], [1, 1], [2, 1],
    ],
    O: [
      [1, 0], [2, 0], [1, 1], [2, 1],
    ],
    S: [
      [1, 0], [2, 0], [0, 1], [1, 1],
    ],
    T: [
      [1, 0], [0, 1], [1, 1], [2, 1],
    ],
    Z: [
      [0, 0], [1, 0], [1, 1], [2, 1],
    ],
  };

  const PIECE_TYPES = Object.keys(SHAPES);

  function rotateCells(cells, times) {
    let result = cells;
    for (let t = 0; t < times; t++) {
      result = result.map(([x, y]) => [3 - y, x]);
    }
    return result;
  }

  function normalize(cells) {
    const minX = Math.min(...cells.map((c) => c[0]));
    const minY = Math.min(...cells.map((c) => c[1]));
    return cells.map(([x, y]) => [x - minX, y - minY]);
  }

  class Piece {
    constructor(type) {
      this.type = type;
      this.rotation = 0;
      this.cells = SHAPES[type].map((c) => [...c]);
      this.x = type === "O" ? 3 : 3;
      this.y = -1;
    }

    getCells(rotation = this.rotation) {
      return rotateCells(SHAPES[this.type], rotation);
    }
  }

  function createEmptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function bagShuffle() {
    const bag = [...PIECE_TYPES];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }

  class Game {
    constructor() {
      this.boardCanvas = document.getElementById("board");
      this.boardCtx = this.boardCanvas.getContext("2d");
      this.nextCanvas = document.getElementById("next");
      this.nextCtx = this.nextCanvas.getContext("2d");
      this.holdCanvas = document.getElementById("hold");
      this.holdCtx = this.holdCanvas.getContext("2d");

      this.scoreEl = document.getElementById("score");
      this.linesEl = document.getElementById("lines");
      this.levelEl = document.getElementById("level");
      this.overlay = document.getElementById("overlay");
      this.overlayText = document.getElementById("overlay-text");
      this.startBtn = document.getElementById("start-btn");

      this.startBtn.addEventListener("click", () => this.start());
      document.addEventListener("keydown", (e) => this.handleKey(e));

      this.reset();
      this.draw();
    }

    reset() {
      this.board = createEmptyBoard();
      this.bag = bagShuffle();
      this.current = new Piece(this.bag.shift());
      this.refillBag();
      this.holdType = null;
      this.canHold = true;
      this.score = 0;
      this.lines = 0;
      this.level = 1;
      this.dropInterval = 800;
      this.lastDrop = 0;
      this.running = false;
      this.paused = false;
      this.gameOver = false;
      this.updateStats();
    }

    refillBag() {
      if (this.bag.length < 1) {
        this.bag = this.bag.concat(bagShuffle());
      }
    }

    start() {
      this.reset();
      this.running = true;
      this.overlay.classList.add("hidden");
      this.lastDrop = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }

    showOverlay(text, showButton = true) {
      this.overlayText.textContent = text;
      this.startBtn.style.display = showButton ? "inline-block" : "none";
      this.overlay.classList.remove("hidden");
    }

    updateStats() {
      this.scoreEl.textContent = this.score;
      this.linesEl.textContent = this.lines;
      this.levelEl.textContent = this.level;
    }

    collides(cells, px, py) {
      for (const [cx, cy] of cells) {
        const x = px + cx;
        const y = py + cy;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && this.board[y][x]) return true;
      }
      return false;
    }

    lockPiece() {
      const cells = this.current.getCells();
      for (const [cx, cy] of cells) {
        const x = this.current.x + cx;
        const y = this.current.y + cy;
        if (y >= 0) this.board[y][x] = this.current.type;
      }
      this.clearLines();
      this.spawnNext();
      this.canHold = true;
    }

    clearLines() {
      let cleared = 0;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (this.board[y].every((cell) => cell)) {
          this.board.splice(y, 1);
          this.board.unshift(Array(COLS).fill(null));
          cleared++;
          y++;
        }
      }
      if (cleared > 0) {
        const points = [0, 100, 300, 500, 800][cleared] * this.level;
        this.score += points;
        this.lines += cleared;
        this.level = Math.floor(this.lines / 10) + 1;
        this.dropInterval = Math.max(100, 800 - (this.level - 1) * 60);
        this.updateStats();
      }
    }

    spawnNext() {
      this.refillBag();
      this.current = new Piece(this.bag.shift());
      this.refillBag();
      if (this.collides(this.current.getCells(), this.current.x, this.current.y)) {
        this.endGame();
      }
    }

    endGame() {
      this.running = false;
      this.gameOver = true;
      this.showOverlay(`Game Over\nScore: ${this.score}`);
    }

    move(dx) {
      const cells = this.current.getCells();
      if (!this.collides(cells, this.current.x + dx, this.current.y)) {
        this.current.x += dx;
      }
    }

    softDrop() {
      const cells = this.current.getCells();
      if (!this.collides(cells, this.current.x, this.current.y + 1)) {
        this.current.y += 1;
        this.score += 1;
        this.updateStats();
        return true;
      } else {
        this.lockPiece();
        return false;
      }
    }

    hardDrop() {
      const cells = this.current.getCells();
      let dist = 0;
      while (!this.collides(cells, this.current.x, this.current.y + 1)) {
        this.current.y += 1;
        dist++;
      }
      this.score += dist * 2;
      this.updateStats();
      this.lockPiece();
    }

    rotate() {
      const nextRotation = (this.current.rotation + 1) % 4;
      const cells = rotateCells(SHAPES[this.current.type], nextRotation);
      const kicks = [0, -1, 1, -2, 2];
      for (const k of kicks) {
        if (!this.collides(cells, this.current.x + k, this.current.y)) {
          this.current.rotation = nextRotation;
          this.current.x += k;
          return;
        }
      }
    }

    hold() {
      if (!this.canHold) return;
      const currentType = this.current.type;
      if (this.holdType === null) {
        this.holdType = currentType;
        this.spawnFromBag();
      } else {
        const swapType = this.holdType;
        this.holdType = currentType;
        this.current = new Piece(swapType);
      }
      this.canHold = false;
    }

    spawnFromBag() {
      this.refillBag();
      this.current = new Piece(this.bag.shift());
      this.refillBag();
    }

    togglePause() {
      if (!this.running) return;
      this.paused = !this.paused;
      if (this.paused) {
        this.showOverlay("Paused", false);
      } else {
        this.overlay.classList.add("hidden");
        this.lastDrop = performance.now();
        requestAnimationFrame((t) => this.loop(t));
      }
    }

    handleKey(e) {
      if (this.gameOver || !this.current) return;
      if (e.code === "KeyP") {
        this.togglePause();
        return;
      }
      if (!this.running || this.paused) return;

      switch (e.code) {
        case "ArrowLeft":
          this.move(-1);
          break;
        case "ArrowRight":
          this.move(1);
          break;
        case "ArrowUp":
          this.rotate();
          break;
        case "ArrowDown":
          this.softDrop();
          break;
        case "Space":
          e.preventDefault();
          this.hardDrop();
          break;
        case "KeyC":
          this.hold();
          break;
        default:
          return;
      }
      this.draw();
    }

    loop(timestamp) {
      if (!this.running || this.paused) return;
      if (timestamp - this.lastDrop > this.dropInterval) {
        this.softDrop();
        this.lastDrop = timestamp;
      }
      this.draw();
      if (this.running && !this.paused) {
        requestAnimationFrame((t) => this.loop(t));
      }
    }

    drawCell(ctx, x, y, color, size) {
      ctx.fillStyle = color;
      ctx.fillRect(x * size, y * size, size - 1, size - 1);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.strokeRect(x * size, y * size, size - 1, size - 1);
    }

    draw() {
      const ctx = this.boardCtx;
      ctx.clearRect(0, 0, this.boardCanvas.width, this.boardCanvas.height);

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const cell = this.board[y][x];
          if (cell) this.drawCell(ctx, x, y, COLORS[cell], CELL);
        }
      }

      if (this.current) {
        const cells = this.current.getCells();
        for (const [cx, cy] of cells) {
          const x = this.current.x + cx;
          const y = this.current.y + cy;
          if (y >= 0) this.drawCell(ctx, x, y, COLORS[this.current.type], CELL);
        }
      }

      this.drawPreview(this.nextCtx, this.nextCanvas, this.bag[0]);
      this.drawPreview(this.holdCtx, this.holdCanvas, this.holdType);
    }

    drawPreview(ctx, canvas, type) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!type) return;
      const cells = normalize(SHAPES[type]);
      const size = 20;
      const offsetX = (canvas.width - 4 * size) / 2;
      const offsetY = (canvas.height - 2 * size) / 2;
      ctx.save();
      ctx.translate(offsetX, offsetY);
      for (const [cx, cy] of cells) {
        ctx.fillStyle = COLORS[type];
        ctx.fillRect(cx * size, cy * size, size - 1, size - 1);
      }
      ctx.restore();
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    const game = new Game();
    game.showOverlay("Press Start to Play");
  });
})();
