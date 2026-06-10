
/** Star OS - 连连看 (路径≤3折/多关卡/提示/重排) */
window.StarGames = window.StarGames || {};
window.StarGames.link = function(container) {
  const canvas = container.querySelector('#link-canvas');
  const ctx = canvas.getContext('2d');
  const ROWS = 8, COLS = 10;
  const TYPES = 12;
  let grid = [];
  let sel = null;
  let level = 1, score = 0;
  let running = false;
  const padding = 8;

  function resize() {
    const parent = canvas.parentElement;
    const maxWidth = parent.clientWidth;
    const maxHeight = parent.clientHeight;
    const innerWidth = Math.max(0, maxWidth - padding * 2);
    const innerHeight = Math.max(0, maxHeight - padding * 2);
    const cell = Math.max(1, Math.floor(Math.min(innerWidth / COLS, innerHeight / ROWS)));
    const w = cell * COLS + padding * 2;
    const h = cell * ROWS + padding * 2;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    draw();
  }
  function cellSize() {
    return Math.min(
      Math.floor((canvas.width - padding * 2) / COLS),
      Math.floor((canvas.height - padding * 2) / ROWS)
    );
  }
  function boardMetrics() {
    const cs = cellSize();
    return {
      cs,
      ox: padding + (canvas.width - padding * 2 - COLS * cs) / 2,
      oy: padding + (canvas.height - padding * 2 - ROWS * cs) / 2
    };
  }
  function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const width = canvas.clientWidth || rect.width || 1;
    const height = canvas.clientHeight || rect.height || 1;
    return {
      x: (e.clientX - rect.left - canvas.clientLeft) * (canvas.width / width),
      y: (e.clientY - rect.top - canvas.clientTop) * (canvas.height / height)
    };
  }
  function fillGrid() {
    const total = ROWS * COLS;
    const pairs = total / 2;
    const arr = [];
    for (let i = 0; i < pairs; i++) {
      const t = i % TYPES;
      arr.push(t, t);
    }
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    grid = [];
    for (let r = 0; r < ROWS; r++) grid.push(arr.slice(r * COLS, (r + 1) * COLS));
  }
  // 严格连连看路径判断：最多 3 个拐弯，且路径上不能穿过其它图块
  function path(a, b) {
    if (grid[a.y][a.x] !== grid[b.y][b.x]) return false;
    const H = ROWS + 2, W = COLS + 2;
    const ar = a.y + 1, ac = a.x + 1;
    const br = b.y + 1, bc = b.x + 1;
    const dirs = [
      { dr: -1, dc: 0 }, // 上
      { dr: 1, dc: 0 },  // 下
      { dr: 0, dc: -1 }, // 左
      { dr: 0, dc: 1 },  // 右
    ];
    function isEmptyCell(r, c) {
      if (r < 0 || r >= H || c < 0 || c >= W) return false;
      const gr = r - 1, gc = c - 1;
      if (gr < 0 || gr >= ROWS || gc < 0 || gc >= COLS) return true; // 外围视为空
      if (gr === a.y && gc === a.x) return true;
      if (gr === b.y && gc === b.x) return true;
      return grid[gr][gc] === -1;
    }
    // visited[r][c][dir]：到达 (r,c) 且最后方向为 dir 时是否访问过
    const visited = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => [false, false, false, false])
    );
    const queue = [];
    // 从起点四个方向出发
    for (let d = 0; d < 4; d++) {
      const nr = ar + dirs[d].dr;
      const nc = ac + dirs[d].dc;
      if (!isEmptyCell(nr, nc)) continue;
      visited[nr][nc][d] = true;
      queue.push({ r: nr, c: nc, dir: d, turns: 0 });
    }
    while (queue.length) {
      const { r, c, dir, turns } = queue.shift();
      if (r === br && c === bc) return true;
      for (let nd = 0; nd < 4; nd++) {
        const nr = r + dirs[nd].dr;
        const nc = c + dirs[nd].dc;
        if (!isEmptyCell(nr, nc)) continue;
        const nt = dir === nd ? turns : turns + 1;
        if (nt > 3) continue;
        if (visited[nr][nc][nd]) continue;
        visited[nr][nc][nd] = true;
        queue.push({ r: nr, c: nc, dir: nd, turns: nt });
      }
    }
    return false;
  }

  function rr(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  const SHAPES = [
    { draw: (ctx, x, y, cs) => { ctx.beginPath(); ctx.arc(x + cs/2, y + cs/2, cs * 0.32, 0, Math.PI*2); ctx.fill(); ctx.stroke(); } }, // orb
    { draw: (ctx, x, y, cs) => { rr(ctx, x + cs*0.18, y + cs*0.18, cs*0.64, cs*0.64, cs*0.18); ctx.fill(); ctx.stroke(); } }, // square gem
    { draw: (ctx, x, y, cs) => { ctx.beginPath(); ctx.moveTo(x + cs/2, y + cs*0.16); ctx.lineTo(x + cs*0.84, y + cs*0.84); ctx.lineTo(x + cs*0.16, y + cs*0.84); ctx.closePath(); ctx.fill(); ctx.stroke(); } }, // triangle
    { draw: (ctx, x, y, cs) => { rr(ctx, x + cs*0.18, y + cs*0.2, cs*0.24, cs*0.6, cs*0.12); ctx.fill(); ctx.stroke(); rr(ctx, x + cs*0.58, y + cs*0.2, cs*0.24, cs*0.6, cs*0.12); ctx.fill(); ctx.stroke(); } }, // twin
    { draw: (ctx, x, y, cs) => { ctx.beginPath(); ctx.arc(x + cs*0.34, y + cs/2, cs*0.16, 0, Math.PI*2); ctx.arc(x + cs*0.66, y + cs/2, cs*0.16, 0, Math.PI*2); ctx.fill(); ctx.stroke(); } }, // double dots
    { draw: (ctx, x, y, cs) => { const s = cs*0.18; for (let i = 0; i < 3; i++) { rr(ctx, x + cs*0.2 + i*(s + cs*0.07), y + cs*0.18, s, cs*0.64, cs*0.12); ctx.fill(); ctx.stroke(); } } }, // bars
    { draw: (ctx, x, y, cs) => { ctx.beginPath(); ctx.moveTo(x + cs/2, y + cs*0.14); ctx.lineTo(x + cs*0.86, y + cs/2); ctx.lineTo(x + cs/2, y + cs*0.86); ctx.lineTo(x + cs*0.14, y + cs/2); ctx.closePath(); ctx.fill(); ctx.stroke(); } }, // diamond
    { draw: (ctx, x, y, cs) => { rr(ctx, x + cs*0.2, y + cs*0.18, cs*0.6, cs*0.18, cs*0.12); ctx.fill(); ctx.stroke(); rr(ctx, x + cs*0.2, y + cs*0.41, cs*0.6, cs*0.18, cs*0.12); ctx.fill(); ctx.stroke(); rr(ctx, x + cs*0.2, y + cs*0.64, cs*0.6, cs*0.18, cs*0.12); ctx.fill(); ctx.stroke(); } }, // stripes
    { draw: (ctx, x, y, cs) => { ctx.beginPath(); ctx.arc(x + cs/2, y + cs/2, cs*0.28, 0, Math.PI*2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(x + cs/2, y + cs/2, cs*0.12, 0, Math.PI*2); ctx.stroke(); } }, // ring
    { draw: (ctx, x, y, cs) => { rr(ctx, x + cs*0.2, y + cs*0.46, cs*0.6, cs*0.12, cs*0.08); ctx.fill(); ctx.stroke(); rr(ctx, x + cs*0.46, y + cs*0.2, cs*0.12, cs*0.6, cs*0.08); ctx.fill(); ctx.stroke(); } }, // plus
    { draw: (ctx, x, y, cs) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { rr(ctx, x + cs*0.2 + j*cs*0.32, y + cs*0.2 + i*cs*0.32, cs*0.22, cs*0.22, cs*0.08); ctx.fill(); ctx.stroke(); } } }, // quad
    { draw: (ctx, x, y, cs) => { ctx.beginPath(); ctx.ellipse(x + cs/2, y + cs/2, cs*0.22, cs*0.28, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + cs*0.36, y + cs/2); ctx.lineTo(x + cs*0.64, y + cs/2); ctx.stroke(); } }, // seed
  ];
  function draw() {
    const { cs, ox, oy } = boardMetrics();
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#050814');
    bg.addColorStop(0.6, '#0b1130');
    bg.addColorStop(1, '#070a12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const colors = ['#7c9cff','#f0a000','#00f0a0','#f05050','#a050f0','#50a0f0','#f0f050','#50f0a0','#f08080','#80f080','#8080f0','#f0c080'];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const v = grid[r][c];
        if (v === -1) continue;
        const x = ox + c * cs, y = oy + r * cs;

        // tile
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 6;
        const tileG = ctx.createLinearGradient(0, y, 0, y + cs);
        tileG.addColorStop(0, 'rgba(255,255,255,0.08)');
        tileG.addColorStop(1, 'rgba(255,255,255,0.03)');
        ctx.fillStyle = tileG;
        rr(ctx, x + 2, y + 2, cs - 4, cs - 4, Math.max(10, cs * 0.22));
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = sel && sel.x === c && sel.y === r ? 'rgba(253,224,71,0.92)' : 'rgba(124,156,255,0.35)';
        ctx.lineWidth = sel && sel.x === c && sel.y === r ? 3 : 2;
        rr(ctx, x + 2, y + 2, cs - 4, cs - 4, Math.max(10, cs * 0.22));
        ctx.stroke();
        ctx.restore();

        // icon
        ctx.save();
        ctx.lineWidth = Math.max(2, cs * 0.06);
        ctx.strokeStyle = 'rgba(2,6,23,0.62)';
        const iconG = ctx.createLinearGradient(0, y, 0, y + cs);
        iconG.addColorStop(0, 'rgba(255,255,255,0.22)');
        iconG.addColorStop(0.3, colors[v % colors.length]);
        iconG.addColorStop(1, 'rgba(2,6,23,0.08)');
        ctx.fillStyle = iconG;
        if (SHAPES[v % SHAPES.length]) SHAPES[v % SHAPES.length].draw(ctx, x, y, cs);
        ctx.restore();

        if (sel && sel.x === c && sel.y === r) {
          ctx.save();
          ctx.shadowColor = 'rgba(250,204,21,0.55)';
          ctx.shadowBlur = 18;
          ctx.strokeStyle = 'rgba(250,204,21,0.95)';
          ctx.lineWidth = 3;
          rr(ctx, x + 1.5, y + 1.5, cs - 3, cs - 3, Math.max(12, cs * 0.24));
          ctx.stroke();
          ctx.restore();
        }
      }
  }
  function findHint() {
    const list = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] !== -1) list.push({ x: c, y: r });
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++)
        if (path(list[i], list[j])) return [list[i], list[j]];
    return null;
  }
  function checkWin() {
    if (grid.every(row => row.every(c => c === -1))) {
      score += level * 100;
      level++;
      fillGrid();
      container.querySelector('#link-level').textContent = level;
      container.querySelector('#link-score').textContent = score;
    }
  }
  canvas.onclick = (e) => {
    if (!running) return;
    const { cs, ox, oy } = boardMetrics();
    const point = canvasPoint(e);
    const c = Math.floor((point.x - ox) / cs), r = Math.floor((point.y - oy) / cs);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS || grid[r][c] === -1) return;
    if (!sel) { sel = { x: c, y: r }; draw(); return; }
    if (sel.x === c && sel.y === r) { sel = null; draw(); return; }
    if (path(sel, { x: c, y: r })) {
      grid[sel.y][sel.x] = -1;
      grid[r][c] = -1;
      score += 10;
      container.querySelector('#link-score').textContent = score;
      sel = null;
      checkWin();
    } else sel = { x: c, y: r };
    draw();
  };
  const linkStartBtn = container.querySelector('#link-start');
  function stopLinkGame() {
    running = false;
    linkStartBtn.textContent = t('startGame');
    draw();
  }
  linkStartBtn.onclick = () => {
    if (running) {
      if (window.StarGameKit && StarGameKit.confirmStopGame) {
        StarGameKit.confirmStopGame({ root: container, onConfirm: stopLinkGame });
      } else if (window.StarDialog && typeof window.StarDialog.confirm === 'function') {
        window.StarDialog.confirm({
          title: t('confirmStopGameTitle'),
          message: t('confirmStopGameDesc'),
          okText: t('stopGame'),
          cancelText: t('cancel')
        }).then(ok => {
          if (ok) stopLinkGame();
        });
      }
      return;
    }
    level = 1;
    score = 0;
    fillGrid();
    sel = null;
    running = true;
    linkStartBtn.textContent = t('stopGame');
    container.querySelector('#link-level').textContent = level;
    container.querySelector('#link-score').textContent = score;
    draw();
  };
  container.querySelector('#link-hint').onclick = () => {
    const h = findHint();
    if (h) { sel = h[0]; draw(); setTimeout(() => { if (path(sel, h[1])) { grid[sel.y][sel.x] = -1; grid[h[1].y][h[1].x] = -1; score += 5; sel = null; checkWin(); } draw(); }, 300); }
  };
  container.querySelector('#link-shuffle').onclick = () => {
    const left = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] !== -1) left.push(grid[r][c]);
    for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
    let i = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] !== -1) grid[r][c] = left[i++];
    sel = null;
    draw();
  };
  window.addEventListener('resize', resize);
  resize();
};