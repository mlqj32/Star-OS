
/** Star OS - 贪吃蛇 (完整版: 多级速度/墙/高分) */
window.StarGames = window.StarGames || {};
window.StarGames.snake = function(container) {
  if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '0');
  const canvas = container.querySelector('#snake-canvas');
  const ctx = canvas.getContext('2d');
  const VIEW = 400;
  const W = 20, H = 20, CELL = Math.min(20, Math.floor(VIEW / W));
  const fit = (window.StarGameKit && StarGameKit.createCanvasFitter) ? StarGameKit.createCanvasFitter(canvas, VIEW, VIEW, { allowUpscale: true }) : null;
  let snake = [{ x: 10, y: 10 }];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = { x: 15, y: 10 };
  let score = 0, highScore = parseInt(localStorage.getItem('star-snake-high')||'0',10);
  let running = false, paused = false;
  let gameOver = false;
  let speed = 120;
  let timer = null;

  function sameDir(a, b) { return a && b && a.x === b.x && a.y === b.y; }
  function isOpposite(a, b) { return a && b && a.x === -b.x && a.y === -b.y; }
  function queueDir(d) {
    if (!running || paused) return;
    // Compare against the last applied direction (dir), not nextDir.
    // This prevents "right -> up -> left" within a single move interval, which is effectively an instant 180 turn and can self-collide.
    if (isOpposite(d, dir)) return;
    if (sameDir(d, nextDir)) return;
    nextDir = d;
  }

  function placeFood() {
    const empty = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (!snake.some(s => s.x === x && s.y === y)) empty.push({ x, y });
    if (empty.length) food = empty[Math.floor(Math.random() * empty.length)];
  }
  function tick() {
    if (!running) return;
    timer = null;
    if (paused) { draw(); return; }
    // 每一帧只应用一次方向修改，避免同一帧内左右/上下快速连按导致 180° 掉头
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.x >= W || head.y < 0 || head.y >= H || snake.some(s => s.x === head.x && s.y === head.y)) {
      running = false;
      gameOver = true;
      if (timer) clearTimeout(timer);
      timer = null;
      container.querySelector('#snake-start').textContent = t('startGame');
      const pauseBtn = container.querySelector('#snake-pause');
      if (pauseBtn) { pauseBtn.textContent = t('pause'); pauseBtn.disabled = true; }
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      if (score > highScore) { highScore = score; try { localStorage.setItem('star-snake-high', String(highScore)); } catch(_){} }
      speed = Math.max(60, 120 - Math.floor(score / 50) * 10);
      placeFood();
    } else snake.pop();
    container.querySelector('#snake-score').textContent = score;
    container.querySelector('#snake-high').textContent = highScore;
    draw();
    timer = setTimeout(tick, speed);
  }
  function draw() {
    if (fit) fit.applyTransform(ctx);
    const bg = ctx.createLinearGradient(0, 0, 0, VIEW);
    bg.addColorStop(0, '#0a0f18');
    bg.addColorStop(1, '#070a12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, VIEW, VIEW);

    const ox = (VIEW - W * CELL) / 2, oy = (VIEW - H * CELL) / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= W; i++) {
      const x = ox + i * CELL;
      ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + H * CELL); ctx.stroke();
    }
    for (let i = 0; i <= H; i++) {
      const y = oy + i * CELL;
      ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + W * CELL, y); ctx.stroke();
    }

    snake.forEach((s, i) => {
      const x = ox + s.x * CELL, y = oy + s.y * CELL;
      ctx.fillStyle = i === 0 ? '#7c9cff' : '#66ff99';
      roundRect(ctx, x + 1.5, y + 1.5, CELL - 3, CELL - 3, 6);
      ctx.fill();
      if (i === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.arc(x + CELL * 0.35, y + CELL * 0.4, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + CELL * 0.65, y + CELL * 0.4, 2.2, 0, Math.PI * 2); ctx.fill();
      }
    });

    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.arc(ox + food.x * CELL + CELL/2, oy + food.y * CELL + CELL/2, CELL/2 - 2, 0, Math.PI*2);
    ctx.fill();

    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, VIEW, VIEW);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '600 20px Segoe UI, Microsoft YaHei UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('pause'), VIEW / 2, VIEW / 2 - 6);
      ctx.font = '12px Segoe UI, Microsoft YaHei UI, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText('P', VIEW / 2, VIEW / 2 + 16);
      ctx.textAlign = 'left';
    }
  }
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
  const snakeStartBtn = container.querySelector('#snake-start');
  const snakePauseBtn = container.querySelector('#snake-pause');
  if (snakePauseBtn) snakePauseBtn.disabled = true;
  function stopSnakeGame() {
    running = false;
    paused = false;
    gameOver = false;
    if (timer) clearTimeout(timer);
    timer = null;
    snakeStartBtn.textContent = t('startGame');
    if (snakePauseBtn) { snakePauseBtn.textContent = t('pause'); snakePauseBtn.disabled = true; }
    draw();
  }
  snakeStartBtn.onclick = () => {
    if (running) {
      if (window.StarGameKit && StarGameKit.confirmStopGame) {
        StarGameKit.confirmStopGame({ root: container, onConfirm: stopSnakeGame });
      } else if (window.StarDialog && typeof window.StarDialog.confirm === 'function') {
        window.StarDialog.confirm({
          title: t('confirmStopGameTitle'),
          message: t('confirmStopGameDesc'),
          okText: t('stopGame'),
          cancelText: t('cancel')
        }).then(ok => {
          if (ok) stopSnakeGame();
        });
      }
      return;
    }
    snake = [{ x: 10, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    speed = 120;
    paused = false;
    gameOver = false;
    placeFood();
    running = true;
    snakeStartBtn.textContent = t('stopGame');
    if (timer) clearTimeout(timer);
    container.focus();
    if (snakePauseBtn) { snakePauseBtn.textContent = t('pause'); snakePauseBtn.disabled = false; }
    tick();
  };
  if (snakePauseBtn) {
    snakePauseBtn.onclick = () => {
      if (!running) return;
      paused = !paused;
      snakePauseBtn.textContent = paused ? t('resume') : t('pause');
      container.focus();
      if (!paused && !timer) tick();
      draw();
    };
  }
  container.addEventListener('keydown', e => {
    if (!running && gameOver && e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) snakeStartBtn.click();
      return;
    }
    if (!running) return;
    if (e.code === 'KeyP') {
      if (snakePauseBtn) snakePauseBtn.click();
      e.preventDefault();
      return;
    }
    if (paused) { e.preventDefault(); return; }
    if (e.code === 'ArrowLeft') queueDir({ x: -1, y: 0 });
    if (e.code === 'ArrowRight') queueDir({ x: 1, y: 0 });
    if (e.code === 'ArrowUp') queueDir({ x: 0, y: -1 });
    if (e.code === 'ArrowDown') queueDir({ x: 0, y: 1 });
    if (['KeyA','KeyW','KeyS','KeyD'].includes(e.code)) {
      if (e.code === 'KeyA') queueDir({ x: -1, y: 0 });
      if (e.code === 'KeyD') queueDir({ x: 1, y: 0 });
      if (e.code === 'KeyW') queueDir({ x: 0, y: -1 });
      if (e.code === 'KeyS') queueDir({ x: 0, y: 1 });
    }
    e.preventDefault();
  });
  // Make sure keyboard controls feel responsive: click/tap the game area to focus it.
  container.addEventListener('pointerdown', () => { try { container.focus(); } catch (_) {} }, { passive: true });
  canvas.addEventListener('pointerdown', () => { try { container.focus(); } catch (_) {} }, { passive: true });
  // Touch/pointer swipe: change direction by dragging.
  let swipeStart = null;
  const onDown = e => {
    const p = e.touches && e.touches[0] ? e.touches[0] : e;
    swipeStart = { x: p.clientX, y: p.clientY };
  };
  const onUp = e => {
    if (!running || paused || !swipeStart) return;
    const p = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
    const dx = p.clientX - swipeStart.x;
    const dy = p.clientY - swipeStart.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (Math.max(adx, ady) < 12) return;
    if (adx > ady) {
      if (dx < 0) queueDir({ x: -1, y: 0 });
      if (dx > 0) queueDir({ x: 1, y: 0 });
    } else {
      if (dy < 0) queueDir({ x: 0, y: -1 });
      if (dy > 0) queueDir({ x: 0, y: 1 });
    }
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: true });
  canvas.addEventListener('touchend', onUp, { passive: true });
  container.querySelector('#snake-score').textContent = '0';
  container.querySelector('#snake-high').textContent = highScore;
  draw();
};