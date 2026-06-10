
/** Star OS - 俄罗斯方块 (完整版: Next/Hold/等级/消行计分/幽灵块/暂停) */
window.StarGames = window.StarGames || {};
window.StarGames.tetris = function(container) {
  const canvas = container.querySelector('#tetris-canvas');
  const nextCan = container.querySelector('#tetris-next');
  const holdCan = container.querySelector('#tetris-hold');
  const controlsEl = container.querySelector('#tetris-controls');
  function gameLocale() {
    return typeof getLocale === 'function' ? getLocale() : 'en';
  }
  const ctx = canvas.getContext('2d');
  const nextCtx = nextCan.getContext('2d');
  const holdCtx = holdCan.getContext('2d');
  const COLS = 10, ROWS = 20;
  const SHAPES = [
    [[1,1,1,1]],
    [[1,1],[1,1]],
    [[0,1,0],[1,1,1]],
    [[1,0,0],[1,1,1]],
    [[0,0,1],[1,1,1]],
    [[0,1,1],[1,1,0]],
    [[1,1,0],[0,1,1]]
  ];
  const COLORS = ['#00f0f0','#f0f000','#a000f0','#00f000','#f00000','#00a0f0','#f0a000'];
  let grid = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
  let score = 0, level = 1, lines = 0, highScore = parseInt(localStorage.getItem('star-tetris-high')||'0',10);
  let piece = null, nextPiece = null, holdPiece = null, canHold = true;
  let running = false, paused = false;
  let dropInterval = 1000, lastDrop = 0;
  let animId = null;

  // 让容器可聚焦以接收键盘事件
  if (!container.hasAttribute('tabindex')) {
    container.setAttribute('tabindex', '0');
  }

  function tt(key, fallback) {
    if (typeof t === 'function') return t(key, fallback);
    return fallback || key;
  }
  function getControlsRows() {
    const rowsByLocale = {
      'zh-CN': ['←→ 移动  ↑ 旋转', '↓ 加速下落', 'Space 硬降', 'P 暂停'],
      'zh-TW': ['←→ 移動  ↑ 旋轉', '↓ 加速下落', 'Space 硬降', 'P 暫停'],
      en: ['←→ Move  ↑ Rotate', '↓ Soft Drop', 'Space Hard Drop', 'P Pause'],
      ja: ['←→ 移動  ↑ 回転', '↓ ソフトドロップ', 'Space ハードドロップ', 'P 一時停止'],
      ko: ['←→ 이동  ↑ 회전', '↓ 소프트 드롭', 'Space 하드 드롭', 'P 일시정지']
    };
    return rowsByLocale[gameLocale()] || rowsByLocale.en;
  }
  function renderControls() {
    if (!controlsEl) return;
    controlsEl.innerHTML = getControlsRows().map(row => `<div>${row}</div>`).join('');
  }
  function stopConfirmText(part) {
    const table = {
      'zh-CN': {
        title: '确认停止游戏？',
        desc: '当前对局进度会丢失。为了避免误触，需要你再确认一次。',
        button: '确认停止'
      },
      'zh-TW': {
        title: '確認停止遊戲？',
        desc: '目前對局進度會遺失。為了避免誤觸，需要你再確認一次。',
        button: '確認停止'
      },
      en: {
        title: 'Stop current game?',
        desc: 'Current match progress will be lost. To avoid accidental clicks, please confirm again.',
        button: 'Stop'
      },
      ja: {
        title: 'ゲームを停止しますか？',
        desc: '現在の対局進行が失われます。誤操作防止のため、もう一度確認してください。',
        button: '停止する'
      },
      ko: {
        title: '게임을 중지할까요?',
        desc: '현재 대국 진행 상황이 사라집니다. 오작동 방지를 위해 한 번 더 확인해 주세요.',
        button: '중지'
      }
    };
    const dict = table[gameLocale()] || table.en;
    return dict[part] || table.en[part];
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function hexToRgb(hex) {
    const h = String(hex || '').replace('#', '').trim();
    if (h.length !== 6) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some(v => Number.isNaN(v))) return null;
    return { r, g, b };
  }
  function mixRgb(a, b, t) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t)
    };
  }
  function rgbToCss(rgb) { return `rgb(${rgb.r},${rgb.g},${rgb.b})`; }
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

  function boardMetrics() {
    const cw = canvas.width || 300;
    const ch = canvas.height || 600;
    const cell = Math.max(1, Math.floor(Math.min(cw / COLS, ch / ROWS)));
    const boardW = COLS * cell;
    const boardH = ROWS * cell;
    const boardX = Math.floor((cw - boardW) / 2);
    const boardY = Math.floor((ch - boardH) / 2);
    return { cw, ch, cell, boardW, boardH, boardX, boardY };
  }

  function randPiece() {
    const i = Math.floor(Math.random() * SHAPES.length);
    return { shape: SHAPES[i].map(r=>[...r]), color: COLORS[i], x: 3, y: 0 };
  }
  function drawBlock(ctx, col, row, color, ghost) {
    const { cell, boardX, boardY } = boardMetrics();
    const x = boardX + col * cell;
    const y = boardY + row * cell;
    if (ghost) {
      ctx.strokeStyle = 'rgba(248,250,252,0.75)';
      ctx.lineWidth = 2;
      roundRect(ctx, x + 2, y + 2, cell - 4, cell - 4, 8);
      ctx.stroke();
      return;
    }
    const base = hexToRgb(color) || { r: 200, g: 200, b: 200 };
    const light = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.35);
    const dark = mixRgb(base, { r: 0, g: 0, b: 0 }, 0.28);
    const g = ctx.createLinearGradient(x, y, x, y + cell);
    g.addColorStop(0, rgbToCss(light));
    g.addColorStop(0.52, rgbToCss(base));
    g.addColorStop(1, rgbToCss(dark));

    ctx.fillStyle = g;
    roundRect(ctx, x + 1, y + 1, cell - 2, cell - 2, 8);
    ctx.fill();

    // inner highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    roundRect(ctx, x + 3, y + 3, cell - 6, cell - 6, 7);
    ctx.stroke();

    // outer ink outline
    ctx.strokeStyle = 'rgba(2,6,23,0.92)';
    ctx.lineWidth = 1.2;
    roundRect(ctx, x + 1, y + 1, cell - 2, cell - 2, 8);
    ctx.stroke();
  }
  function drawSmallBlock(ctx, ox, oy, color, size) {
    const base = hexToRgb(color) || { r: 200, g: 200, b: 200 };
    const light = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.32);
    const dark = mixRgb(base, { r: 0, g: 0, b: 0 }, 0.24);
    const g = ctx.createLinearGradient(ox, oy, ox, oy + size);
    g.addColorStop(0, rgbToCss(light));
    g.addColorStop(0.6, rgbToCss(base));
    g.addColorStop(1, rgbToCss(dark));
    ctx.fillStyle = g;
    roundRect(ctx, ox + 1, oy + 1, size - 2, size - 2, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(2,6,23,0.85)';
    ctx.lineWidth = 1;
    roundRect(ctx, ox + 1, oy + 1, size - 2, size - 2, 6);
    ctx.stroke();
  }
  function valid(p, dx, dy) {
    for (let r = 0; r < p.shape.length; r++)
      for (let c = 0; c < p.shape[0].length; c++)
        if (p.shape[r][c]) {
          const ny = p.y + r + dy, nx = p.x + c + dx;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
          if (ny >= 0 && grid[ny][nx]) return false;
        }
    return true;
  }
  function merge() {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[0].length; c++)
        if (piece.shape[r][c]) {
          const y = piece.y + r, x = piece.x + c;
          if (y >= 0) grid[y][x] = piece.color;
        }
    let cleared = 0;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (grid[row].every(c => c)) {
        grid.splice(row, 1);
        grid.unshift(Array(COLS).fill(0));
        cleared++;
        row++;
      }
    }
    if (cleared) {
      const pts = [0, 100, 300, 500, 800][cleared];
      score += pts * level;
      lines += cleared;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 80);
    }
    if (score > highScore) { highScore = score; try { localStorage.setItem('star-tetris-high', String(highScore)); } catch(_){} }
    piece = nextPiece || randPiece();
    nextPiece = randPiece();
    canHold = true;
    if (!valid(piece, 0, 0)) {
      running = false;
      paused = false;
      if (animId) cancelAnimationFrame(animId);
      animId = null;
      const startBtn = container.querySelector('#tetris-start');
      const pauseBtn = container.querySelector('#tetris-pause');
      if (startBtn) startBtn.textContent = tt('startGame', 'Start');
      if (pauseBtn) { pauseBtn.textContent = tt('pause', 'Pause'); pauseBtn.disabled = true; }
    }
    updateUI();
  }
  function ghostY() {
    const origY = piece.y;
    let g = origY;
    while (valid(piece, 0, 1)) { piece.y++; g = piece.y; }
    piece.y = origY;
    return g;
  }
  function draw() {
    const { cw, ch, boardX, boardY, boardW, boardH } = boardMetrics();
    const bg = ctx.createLinearGradient(0, 0, 0, ch);
    bg.addColorStop(0, '#050814');
    bg.addColorStop(0.55, '#0b1130');
    bg.addColorStop(1, '#03050c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);

    // subtle board panel
    const panelInsetX = boardX > 0 ? 10 : 0;
    const panelInsetY = boardY > 0 ? 8 : 0;
    const panelX = boardX - panelInsetX;
    const panelY = boardY - panelInsetY;
    const panelW = boardW + panelInsetX * 2;
    const panelH = boardH + panelInsetY * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    roundRect(ctx, panelX, panelY, panelW, panelH, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(124,156,255,0.16)';
    ctx.lineWidth = 1.2;
    roundRect(ctx, panelX, panelY, panelW, panelH, 18);
    ctx.stroke();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (grid[r][c]) drawBlock(ctx, c, r, grid[r][c], false);
    if (piece && running) {
      const gy = ghostY();
      for (let r = 0; r < piece.shape.length; r++)
        for (let c = 0; c < piece.shape[0].length; c++)
          if (piece.shape[r][c]) drawBlock(ctx, piece.x + c, gy + r, piece.color, true);
      for (let r = 0; r < piece.shape.length; r++)
        for (let c = 0; c < piece.shape[0].length; c++)
          if (piece.shape[r][c]) drawBlock(ctx, piece.x + c, piece.y + r, piece.color, false);
    }
    nextCtx.fillStyle = '#111';
    nextCtx.fillRect(0, 0, 120, 60);
    if (nextPiece) {
      const sz = 18, ox = (120 - nextPiece.shape[0].length * sz) / 2, oy = (60 - nextPiece.shape.length * sz) / 2;
      for (let r = 0; r < nextPiece.shape.length; r++)
        for (let c = 0; c < nextPiece.shape[0].length; c++)
          if (nextPiece.shape[r][c]) drawSmallBlock(nextCtx, ox + c * sz, oy + r * sz, nextPiece.color, sz);
    }
    holdCtx.fillStyle = '#111';
    holdCtx.fillRect(0, 0, 120, 60);
    if (holdPiece) {
      const sz = 18, ox = (120 - holdPiece.shape[0].length * sz) / 2, oy = (60 - holdPiece.shape.length * sz) / 2;
      for (let r = 0; r < holdPiece.shape.length; r++)
        for (let c = 0; c < holdPiece.shape[0].length; c++)
          if (holdPiece.shape[r][c]) drawSmallBlock(holdCtx, ox + c * sz, oy + r * sz, holdPiece.color, sz);
    }

    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '700 20px Segoe UI, Microsoft YaHei UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tt('pause', 'Paused'), cw / 2, ch / 2 - 10);
      ctx.font = '12px Segoe UI, Microsoft YaHei UI, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.70)';
      ctx.fillText('P', cw / 2, ch / 2 + 14);
      ctx.textAlign = 'left';
    }
  }
  function updateUI() {
    container.querySelector('#tetris-score').textContent = score;
    container.querySelector('#tetris-level').textContent = level;
    container.querySelector('#tetris-lines').textContent = lines;
    container.querySelector('#tetris-high').textContent = highScore;
  }
  function tick(now) {
    if (!running) { animId = null; return; }
    if (!paused) {
      if (now - lastDrop >= dropInterval) {
        lastDrop = now;
        if (valid(piece, 0, 1)) piece.y++;
        else merge();
      }
    }
    draw();
    animId = requestAnimationFrame(tick);
  }
  function start() {
    grid = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
    score = 0; level = 1; lines = 0;
    dropInterval = 1000;
    piece = randPiece();
    nextPiece = randPiece();
    holdPiece = null;
    canHold = true;
    running = true;
    paused = false;
    lastDrop = performance.now();
    const startBtn = container.querySelector('#tetris-start');
    const pauseBtn = container.querySelector('#tetris-pause');
    if (startBtn) startBtn.textContent = tt('stopGame', 'Stop');
    if (pauseBtn) { pauseBtn.textContent = tt('pause', 'Pause'); pauseBtn.disabled = false; }
    updateUI();
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(tick);
  }
  function stopGame() {
    running = false;
    paused = false;
    if (animId) cancelAnimationFrame(animId);
    animId = null;
    grid = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
    piece = null;
    nextPiece = null;
    holdPiece = null;
    canHold = true;
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;
    lastDrop = 0;
    const startBtn = container.querySelector('#tetris-start');
    const pauseBtn = container.querySelector('#tetris-pause');
    if (startBtn) startBtn.textContent = tt('startGame', 'Start');
    if (pauseBtn) { pauseBtn.textContent = tt('pause', 'Pause'); pauseBtn.disabled = true; }
    updateUI();
    draw();
  }
  function openStopConfirm() {
    const title = tt('confirmStopGameTitle', stopConfirmText('title'));
    const desc = tt('confirmStopGameDesc', stopConfirmText('desc'));
    const confirmText = tt('confirmStopGameBtn', stopConfirmText('button'));
    const cancelText = tt('cancel', 'Cancel');
    if (window.StarGameKit && StarGameKit.confirmDialog) {
      StarGameKit.confirmDialog({
        root: container,
        title,
        desc,
        confirmText,
        cancelText,
        onConfirm: () => stopGame()
      });
      return;
    }
    if (window.StarDialog && typeof window.StarDialog.confirm === 'function') {
      window.StarDialog.confirm({
        title,
        message: desc,
        okText: confirmText,
        cancelText
      }).then(ok => {
        if (ok) stopGame();
      });
    }
  }
  function pause() {
    if (!running) return;
    paused = !paused;
    const pauseBtn = container.querySelector('#tetris-pause');
    if (pauseBtn) pauseBtn.textContent = paused ? tt('resume', 'Resume') : tt('pause', 'Pause');
    if (!paused) lastDrop = performance.now();
    draw();
  }
  function hold() {
    if (!piece || !running || paused || !canHold) return;
    if (!holdPiece) {
      holdPiece = piece;
      piece = nextPiece;
      nextPiece = randPiece();
    } else {
      const t = piece;
      piece = holdPiece;
      holdPiece = t;
    }
    piece.x = 3;
    piece.y = 0;
    canHold = false;
  }
  const tetrisStartBtn = container.querySelector('#tetris-start');
  const tetrisPauseBtn = container.querySelector('#tetris-pause');
  if (tetrisPauseBtn) tetrisPauseBtn.disabled = true;
  tetrisStartBtn.onclick = () => {
    if (running) {
      openStopConfirm();
      return;
    }
    start();
  };
  if (tetrisPauseBtn) tetrisPauseBtn.onclick = pause;
  container.addEventListener('keydown', e => {
    if (!running) return;
    if (e.code === 'KeyP') { pause(); e.preventDefault(); return; }
    if (paused) return;
    if (e.code === 'Space') {
      e.preventDefault();
      while (valid(piece, 0, 1)) piece.y++;
      merge();
      return;
    }
    if (e.code === 'KeyC' || e.code === 'ShiftLeft') { hold(); e.preventDefault(); return; }
    if (e.code === 'ArrowLeft' && valid(piece, -1, 0)) piece.x--;
    if (e.code === 'ArrowRight' && valid(piece, 1, 0)) piece.x++;
    if (e.code === 'ArrowDown' && valid(piece, 0, 1)) { piece.y++; score += 1; }
    if (e.code === 'ArrowUp') {
      const rot = piece.shape[0].map((_, i) => piece.shape.map(r => r[i]).reverse());
      if (valid({ ...piece, shape: rot }, 0, 0)) piece.shape = rot;
    }
    e.preventDefault();
  });
  window.addEventListener('star:locale-change', renderControls);
  renderControls();
  updateUI();
  draw();
};