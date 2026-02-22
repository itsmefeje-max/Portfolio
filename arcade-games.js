/* -- Purpose: Game logic for Arcade games (Flappy Bird, Snake, Block Puzzle) */
/* -- Runs on: Client */
/* -- Dependencies: None (Vanilla JS) */

(() => {
  "use strict";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const keys = new Set();

  let activeGame = null;

  // Prevent scrolling when using arrow keys/spacebar ONLY if a game is actively being played
  const shouldPreventScroll = (key) => [
    'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'
  ].includes(key);

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    keys.add(key);
    if (activeGame && shouldPreventScroll(key)) {
      event.preventDefault();
    }
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.toLowerCase());
  });

  // Clear keys when window loses focus to prevent "stuck" inputs
  window.addEventListener('blur', () => keys.clear());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) keys.clear();
  });

  // --- FLAPPY BIRD ---
  class FlappyBird {
    constructor(canvas, statusEl) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.statusEl = statusEl;
      this.running = false;
      this.animationId = null;

      this.canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault(); // Prevent touch-action scrolling while tapping
        this.flap();
      });
      this.reset();
    }

    reset() {
      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.bird = { x: 120, y: this.canvas.height / 2, vy: 0, r: 12 };
      this.gravity = 0.34;
      this.jump = -5.8;
      this.pipes = [];
      this.spawnTimer = 0;
      this.score = 0;
      this.highScore = parseInt(localStorage.getItem('flappy-highscore') || '0', 10);
      this.lastTick = performance.now();
      this.running = false;
      if (activeGame === 'flappy') activeGame = null;
      this.statusEl.textContent = 'Ready to launch.';
      this.draw();
    }

    start() {
      if (this.running) return;
      activeGame = 'flappy';
      this.running = true;
      this.lastTick = performance.now();
      this.statusEl.textContent = 'Tap to flap. Avoid the pipes.';
      this.animationId = requestAnimationFrame((t) => this.loop(t));
    }

    stop(message) {
      this.running = false;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('flappy-highscore', this.highScore);
      }
      if (activeGame === 'flappy') activeGame = null;
      this.statusEl.textContent = message;
    }

    flap() {
      if (!this.running) {
        this.start();
      }
      this.bird.vy = this.jump;
    }

    spawnPipe() {
      const gap = 92;
      const minTop = 34;
      const maxTop = this.canvas.height - gap - 34;
      const topHeight = minTop + Math.random() * (maxTop - minTop);
      this.pipes.push({
        x: this.canvas.width + 36,
        w: 40,
        topHeight,
        gap,
        passed: false
      });
    }

    update(deltaMs) {
      const delta = deltaMs / 16.67; // Normalize to 60fps
      
      if (keys.has(' ') || keys.has('arrowup') || keys.has('w')) {
        keys.delete(' ');
        keys.delete('arrowup');
        keys.delete('w');
        this.flap();
      }

      this.bird.vy += this.gravity * delta;
      this.bird.y += this.bird.vy * delta;

      this.spawnTimer += deltaMs;
      if (this.spawnTimer > 1300) {
        this.spawnPipe();
        this.spawnTimer = 0;
      }

      const speed = 2.1 * delta;
      this.pipes.forEach((pipe) => {
        pipe.x -= speed;
        if (!pipe.passed && pipe.x + pipe.w < this.bird.x) {
          pipe.passed = true;
          this.score += 1;
        }
      });
      
      // Cleanup off-screen pipes
      this.pipes = this.pipes.filter((pipe) => pipe.x + pipe.w > -10);

      // Floor / Ceiling Collision
      if (this.bird.y - this.bird.r < 0 || this.bird.y + this.bird.r > this.canvas.height) {
        this.stop(`Game over. Score ${this.score}. Tap launch to retry.`);
      }

      // Pipe Collision
      for (const pipe of this.pipes) {
        const hitX = this.bird.x + this.bird.r > pipe.x && this.bird.x - this.bird.r < pipe.x + pipe.w;
        const hitTop = this.bird.y - this.bird.r < pipe.topHeight;
        const hitBottom = this.bird.y + this.bird.r > pipe.topHeight + pipe.gap;
        
        if (hitX && (hitTop || hitBottom)) {
          this.stop(`Game over. Score ${this.score}. Tap launch to retry.`);
          break;
        }
      }
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
      gradient.addColorStop(0, '#0ea5e9');
      gradient.addColorStop(1, '#082f49');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      ctx.fillStyle = '#16a34a';
      this.pipes.forEach((pipe) => {
        ctx.fillRect(pipe.x, 0, pipe.w, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.topHeight + pipe.gap, pipe.w, this.canvas.height - (pipe.topHeight + pipe.gap));
      });

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(this.bird.x, this.bird.y, this.bird.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = '700 16px Inter, sans-serif';
      ctx.fillText(`Score: ${this.score}`, 14, 26);

      ctx.textAlign = 'right';
      ctx.fillText(`High: ${this.highScore}`, this.canvas.width - 14, 26);
      ctx.textAlign = 'left';
    }

    loop(timestamp) {
      if (!this.running) {
        this.draw();
        return;
      }
      // Max delta of 40ms prevents massive jumps if user tabs out
      const deltaMs = Math.min(40, timestamp - this.lastTick);
      this.lastTick = timestamp;
      
      this.update(deltaMs);
      this.draw();
      
      if (this.running) {
        this.animationId = requestAnimationFrame((t) => this.loop(t));
      }
    }
  }

  // --- SNAKE GAME ---
  class SnakeGame {
    constructor(canvas, statusEl) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.statusEl = statusEl;
      this.gridSize = 20;
      this.animationId = null;

      // Swipe support
      this.swipeStart = null;
      this.canvas.addEventListener('touchstart', (e) => {
        const touch = e.changedTouches[0];
        this.swipeStart = { x: touch.clientX, y: touch.clientY };
      }, { passive: true });

      this.canvas.addEventListener('touchend', (e) => {
        if (!this.swipeStart) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - this.swipeStart.x;
        const dy = touch.clientY - this.swipeStart.y;
        
        // Prevent registering tiny taps as swipes
        if (Math.abs(dx) + Math.abs(dy) < 25) return; 
        
        if (Math.abs(dx) > Math.abs(dy)) {
          this.setDirection(dx > 0 ? 'right' : 'left');
        } else {
          this.setDirection(dy > 0 ? 'down' : 'up');
        }
        
        // Auto-start on swipe if not running
        if (!this.running && activeGame !== 'snake') this.start();
      }, { passive: true });

      this.reset();
    }

    reset() {
      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.cellsX = Math.floor(this.canvas.width / this.gridSize);
      this.cellsY = Math.floor(this.canvas.height / this.gridSize);
      this.snake = [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }];
      this.direction = 'right';
      this.pendingDirection = 'right';
      this.food = this.makeFood();
      this.score = 0;
      this.highScore = parseInt(localStorage.getItem('snake-highscore') || '0', 10);
      this.stepAccumulator = 0;
      this.stepMs = 120; // Initial speed
      this.running = false;
      this.lastTick = performance.now();
      
      if (activeGame === 'snake') activeGame = null;
      this.statusEl.textContent = 'Ready to launch.';
      this.draw();
    }

    start() {
      if (this.running) return;
      activeGame = 'snake';
      this.running = true;
      this.lastTick = performance.now();
      this.statusEl.textContent = 'Eat food. Avoid walls and tail.';
      this.animationId = requestAnimationFrame((t) => this.loop(t));
    }

    stop(message) {
      this.running = false;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('snake-highscore', this.highScore);
      }
      if (activeGame === 'snake') activeGame = null;
      this.statusEl.textContent = message;
    }

    setDirection(next) {
      const opposite = {
        up: 'down',
        down: 'up',
        left: 'right',
        right: 'left'
      };
      if (opposite[this.direction] === next) return;
      this.pendingDirection = next;
    }

    makeFood() {
      let point;
      let attempts = 0;
      let isOccupied = true;
      
      // If the snake is massive, fallback to deterministic finding to prevent infinite loop crash
      do {
        point = {
          x: Math.floor(Math.random() * this.cellsX),
          y: Math.floor(Math.random() * this.cellsY)
        };
        isOccupied = this.snake?.some((part) => part.x === point.x && part.y === point.y);
        attempts++;
      } while (isOccupied && attempts < 100);

      // Deterministic fallback
      if (isOccupied) {
        for (let x = 0; x < this.cellsX; x++) {
          for (let y = 0; y < this.cellsY; y++) {
            if (!this.snake?.some(p => p.x === x && p.y === y)) return {x, y};
          }
        }
      }
      return point;
    }

    readKeys() {
      if (keys.has('arrowup') || keys.has('w')) this.setDirection('up');
      else if (keys.has('arrowdown') || keys.has('s')) this.setDirection('down');
      else if (keys.has('arrowleft') || keys.has('a')) this.setDirection('left');
      else if (keys.has('arrowright') || keys.has('d')) this.setDirection('right');
    }

    moveOneStep() {
      this.direction = this.pendingDirection;
      const head = { ...this.snake[0] };

      if (this.direction === 'up') head.y -= 1;
      if (this.direction === 'down') head.y += 1;
      if (this.direction === 'left') head.x -= 1;
      if (this.direction === 'right') head.x += 1;

      const outOfBounds = head.x < 0 || head.y < 0 || head.x >= this.cellsX || head.y >= this.cellsY;
      const hitBody = this.snake.some((part) => part.x === head.x && part.y === head.y);
      
      if (outOfBounds || hitBody) {
        this.stop(`Game over. Score ${this.score}.`);
        return;
      }

      this.snake.unshift(head);
      const ate = head.x === this.food.x && head.y === this.food.y;
      
      if (ate) {
        this.score += 1;
        this.food = this.makeFood();
        // Ramp up speed slightly up to a cap
        this.stepMs = Math.max(70, this.stepMs - 2); 
      } else {
        this.snake.pop();
      }

      this.statusEl.textContent = `Score ${this.score} · Speed ${Math.round(1000 / this.stepMs)} TPS`;
    }

    update(deltaMs) {
      this.readKeys();
      this.stepAccumulator += deltaMs;
      while (this.stepAccumulator >= this.stepMs && this.running) {
        this.stepAccumulator -= this.stepMs;
        this.moveOneStep();
      }
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      ctx.strokeStyle = 'rgba(148,163,184,0.16)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= this.cellsX; x += 1) {
        ctx.beginPath();
        ctx.moveTo(x * this.gridSize, 0);
        ctx.lineTo(x * this.gridSize, this.canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= this.cellsY; y += 1) {
        ctx.beginPath();
        ctx.moveTo(0, y * this.gridSize);
        ctx.lineTo(this.canvas.width, y * this.gridSize);
        ctx.stroke();
      }

      // Draw Food
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(this.food.x * this.gridSize + 2, this.food.y * this.gridSize + 2, this.gridSize - 4, this.gridSize - 4);

      // Draw Snake
      this.snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? '#22d3ee' : '#14b8a6';
        ctx.fillRect(part.x * this.gridSize + 2, part.y * this.gridSize + 2, this.gridSize - 4, this.gridSize - 4);
      });

      // Draw High Score
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '600 14px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`High: ${this.highScore}`, this.canvas.width - 12, this.canvas.height - 12);
      ctx.textAlign = 'left';
    }

    loop(timestamp) {
      if (!this.running) {
        this.draw();
        return;
      }
      const deltaMs = Math.min(40, timestamp - this.lastTick);
      this.lastTick = timestamp;
      this.update(deltaMs);
      this.draw();
      if (this.running) {
        this.animationId = requestAnimationFrame((t) => this.loop(t));
      }
    }
  }

  // --- BLOCK PUZZLE ---
  class BlockPuzzle {
    constructor(canvas, statusEl) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.statusEl = statusEl;
      this.size = 8;
      this.cell = 34;
      this.boardX = 24;
      this.boardY = 24;

      this.shapes = [
        [{ x: 0, y: 0 }],
        [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        [{ x: 0, y: 0 }, { x: 0, y: 1 }],
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
        [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
        [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }]
      ];

      this.canvas.addEventListener('pointerdown', (event) => this.handleClick(event));
      this.reset();
    }

    reset() {
      this.board = Array.from({ length: this.size }, () => Array(this.size).fill(0));
      this.queue = [this.randomShape(), this.randomShape(), this.randomShape()];
      this.selected = 0;
      this.score = 0;
      this.highScore = parseInt(localStorage.getItem('block-highscore') || '0', 10);
      this.running = false;
      if (activeGame === 'block') activeGame = null;
      this.statusEl.textContent = 'Ready to launch.';
      this.draw();
    }

    randomShape() {
      return this.shapes[Math.floor(Math.random() * this.shapes.length)];
    }

    start() {
      if (this.running) return;
      activeGame = 'block';
      this.running = true;
      this.statusEl.textContent = 'Select a piece below, then tap board to place.';
      this.draw();
    }

    stop(message) {
      this.running = false;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('block-highscore', this.highScore);
      }
      if (activeGame === 'block') activeGame = null;
      this.statusEl.textContent = message;
      this.draw();
    }

    getPointer(event) {
      const clientX = event.clientX;
      const clientY = event.clientY;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    canPlace(shape, gridX, gridY) {
      return shape.every((cell) => {
        const x = gridX + cell.x;
        const y = gridY + cell.y;
        return x >= 0 && y >= 0 && x < this.size && y < this.size && this.board[y][x] === 0;
      });
    }

    place(shape, gridX, gridY) {
      shape.forEach((cell) => {
        this.board[gridY + cell.y][gridX + cell.x] = 1;
      });
      this.score += shape.length;

      const fullRows = [];
      const fullCols = [];
      for (let y = 0; y < this.size; y += 1) {
        if (this.board[y].every((cell) => cell === 1)) fullRows.push(y);
      }
      for (let x = 0; x < this.size; x += 1) {
        if (this.board.every((row) => row[x] === 1)) fullCols.push(x);
      }

      fullRows.forEach((y) => {
        for (let x = 0; x < this.size; x += 1) this.board[y][x] = 0;
      });
      fullCols.forEach((x) => {
        for (let y = 0; y < this.size; y += 1) this.board[y][x] = 0;
      });

      this.score += (fullRows.length + fullCols.length) * 8;
      this.queue[this.selected] = this.randomShape();
    }

    anyMoveAvailable() {
      return this.queue.some((shape) => {
        for (let y = 0; y < this.size; y += 1) {
          for (let x = 0; x < this.size; x += 1) {
            if (this.canPlace(shape, x, y)) return true;
          }
        }
        return false;
      });
    }

    handleClick(event) {
      if (!this.running) return;
      event.preventDefault(); 
      const pointer = this.getPointer(event);

      const queueY = 320;
      for (let i = 0; i < this.queue.length; i += 1) {
        const cardX = 28 + i * 160;
        if (pointer.x >= cardX && pointer.x <= cardX + 130 && pointer.y >= queueY - 18 && pointer.y <= queueY + 36) {
          this.selected = i;
          this.draw();
          return;
        }
      }

      const gridX = Math.floor((pointer.x - this.boardX) / this.cell);
      const gridY = Math.floor((pointer.y - this.boardY) / this.cell);
      if (gridX < 0 || gridY < 0 || gridX >= this.size || gridY >= this.size) return;

      const shape = this.queue[this.selected];
      if (!this.canPlace(shape, gridX, gridY)) {
        this.statusEl.textContent = 'Cannot place there.';
        return;
      }

      this.place(shape, gridX, gridY);
      
      if (!this.anyMoveAvailable()) {
        this.stop(`No moves left. Final score ${this.score}.`);
        return;
      }

      this.statusEl.textContent = `Score ${this.score} · Keep clearing lines.`;
      this.draw();
    }

    drawShape(shape, x, y, color) {
      this.ctx.fillStyle = color;
      shape.forEach((cell) => {
        this.ctx.fillRect(x + cell.x * 16, y + cell.y * 16, 14, 14);
      });
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      for (let y = 0; y < this.size; y += 1) {
        for (let x = 0; x < this.size; x += 1) {
          ctx.fillStyle = this.board[y][x] ? '#22c55e' : 'rgba(148,163,184,0.22)';
          ctx.fillRect(this.boardX + x * this.cell, this.boardY + y * this.cell, this.cell - 2, this.cell - 2);
        }
      }

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 15px Inter, sans-serif';
      ctx.fillText(`Score: ${this.score}`, 24, 16);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`High: ${this.highScore}`, this.canvas.width - 24, 16);
      ctx.textAlign = 'left';

      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('Pieces', 24, 308);

      this.queue.forEach((shape, index) => {
        const x = 28 + index * 160;
        const selected = index === this.selected;
        
        ctx.fillStyle = selected ? 'rgba(14,165,233,0.24)' : 'rgba(15,23,42,0.95)';
        ctx.strokeStyle = selected ? '#38bdf8' : 'rgba(148,163,184,0.45)';
        ctx.lineWidth = 2;
        
        ctx.fillRect(x, 302, 130, 46);
        ctx.strokeRect(x, 302, 130, 46);

        // Calculate shape dimensions for centering
        let maxX = 0;
        let maxY = 0;
        shape.forEach(p => {
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        });

        // Each block is 14px + 2px logical gap in drawShape logic?
        // drawShape: x + cell.x * 16.
        // The drawn rect is 14px wide.
        // So width = (maxX * 16) + 14.
        // Height = (maxY * 16) + 14.
        const shapeW = (maxX * 16) + 14;
        const shapeH = (maxY * 16) + 14;

        const offsetX = x + (130 - shapeW) / 2;
        const offsetY = 302 + (46 - shapeH) / 2;

        this.drawShape(shape, offsetX, offsetY, '#a78bfa');
      });
    }
  }

  // --- UI WIRING UTILITY ---
  function wireGame(gameName, instance) {
    const buttons = document.querySelectorAll(`[data-game="${gameName}"]`);
    buttons.forEach((button) => {
      
      const handleAction = (e) => {
        // Prevent default on pointerdown to stop double-firing the click event
        if (e.type === 'pointerdown' && e.cancelable) e.preventDefault();
        
        const action = button.dataset.action;
        if (action === 'start') instance.start();
        else if (action === 'reset') instance.reset();
        else if (action === 'tap' && typeof instance.flap === 'function') instance.flap();
        else if (typeof instance.setDirection === 'function' && ['up', 'down', 'left', 'right'].includes(action)) {
          instance.setDirection(action);
        }
      };

      // Pointerdown gives instant zero-latency feedback on mobile
      button.addEventListener('pointerdown', handleAction);
      
      // Accessibility fallback for keyboard (Tab + Enter/Space)
      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleAction(e);
        }
      });
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    const flappyCanvas = document.getElementById('flappy-game');
    const snakeCanvas = document.getElementById('snake-game');
    const blockCanvas = document.getElementById('block-game');

    if (!flappyCanvas || !snakeCanvas || !blockCanvas) return;

    const flappy = new FlappyBird(flappyCanvas, document.getElementById('flappy-status'));
    const snake = new SnakeGame(snakeCanvas, document.getElementById('snake-status'));
    const block = new BlockPuzzle(blockCanvas, document.getElementById('block-status'));

    wireGame('flappy', flappy);
    wireGame('snake', snake);
    wireGame('block', block);
  });
})();
