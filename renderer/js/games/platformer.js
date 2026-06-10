
/** Star OS - 平台跳跃 (多关卡/收集/敌人/终点) */
window.StarGames = window.StarGames || {};
window.StarGames.platformer = function(container) {
  const canvas = container.querySelector('#plat-canvas');
  const ctx = canvas.getContext('2d');
  const TILE = 32;
  const LEVEL_ROWS = 12;
  const VIEW_W = 800;
  const VIEW_H = LEVEL_ROWS * TILE;
  const fit = (window.StarGameKit && StarGameKit.createCanvasFitter) ? StarGameKit.createCanvasFitter(canvas, VIEW_W, VIEW_H, { allowUpscale: true }) : null;
  if (!fit) { canvas.width = VIEW_W; canvas.height = VIEW_H; }
  let W = 0, H = 0;
  let player = { x: 0, y: 0, vx: 0, vy: 0, w: 24, h: 28 };
  let level = 1, score = 0;
  let platforms = [], coins = [], enemies = [], goal = null;
  let running = false;
  let paused = false;
  const GRAV = 0.6, JUMP = -12, SPD = 5;
  const SAFE_GAP_UP = 4;
  const SAFE_GAP_DOWN = 5;
  const SAFE_RISE = 3;
  const SAFE_DROP = 4;
  const generatedLevels = new Map();

  function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }
  function canFollowPlatform(from, to) {
    const horizontalGap = Math.max(0, to.x - (from.x + from.w), from.x - (to.x + to.w));
    const rise = from.y - to.y;
    const drop = to.y - from.y;
    if (rise > SAFE_RISE || drop > SAFE_DROP) return false;
    return horizontalGap <= (rise > 0 ? SAFE_GAP_UP : SAFE_GAP_DOWN);
  }
  function overlapsPlatform(candidate, list) {
    return list.some(p => p.y === candidate.y && candidate.x < p.x + p.w && candidate.x + candidate.w > p.x);
  }
  function addCoin(coinTiles, occupied, x, y) {
    const key = `${x},${y}`;
    if (occupied.has(key)) return;
    occupied.add(key);
    coinTiles.push([x, y]);
  }
  function createProceduralLevel(n) {
    const widthTiles = 30 + Math.min(12, n * 2) + randInt(0, 3);
    const mainPath = [{ x: 0, y: 10, w: 5 }];
    let current = mainPath[0];
    const targetX = widthTiles - 8;
    let guard = 0;
    while (current.x + current.w < targetX && guard < 80) {
      guard++;
      const remaining = targetX - (current.x + current.w);
      const gapLimit = remaining > 7 ? 4 : 3;
      const gap = randInt(1, Math.max(1, Math.min(gapLimit, remaining - 3)));
      const nextWidth = randInt(3, 5);
      const nextX = current.x + current.w + gap;
      const nextY = clamp(current.y + randInt(-2, 2), 5, 10);
      const next = {
        x: nextX,
        y: clamp(nextY, current.y - SAFE_RISE, current.y + SAFE_DROP),
        w: Math.min(nextWidth, widthTiles - nextX - 2)
      };
      if (next.w < 3 || !canFollowPlatform(current, next)) continue;
      mainPath.push(next);
      current = next;
    }
    let finalPlatform = {
      x: widthTiles - 6,
      y: clamp(current.y + randInt(-1, 1), 5, 10),
      w: 4
    };
    if (!canFollowPlatform(current, finalPlatform)) {
      finalPlatform = {
        x: current.x + current.w + Math.min(3, SAFE_GAP_DOWN),
        y: clamp(current.y + randInt(-1, 1), current.y - SAFE_RISE, current.y + SAFE_DROP),
        w: 4
      };
    }
    finalPlatform.x = clamp(finalPlatform.x, current.x + 2, widthTiles - finalPlatform.w - 1);
    if (!canFollowPlatform(current, finalPlatform)) {
      finalPlatform.x = current.x + current.w + 2;
      finalPlatform.y = clamp(current.y, 5, 10);
    }
    mainPath.push(finalPlatform);

    const allPlatforms = mainPath.map(p => ({ ...p }));
    const mainPlatformKeys = new Set(mainPath.map(p => `${p.x},${p.y},${p.w}`));
    const extraCount = 3 + Math.min(4, Math.floor(n / 2));
    for (let i = 0; i < extraCount && mainPath.length > 2; i++) {
      const anchor = mainPath[randInt(1, mainPath.length - 2)];
      const candidate = {
        x: clamp(anchor.x + randInt(-3, 3), 1, widthTiles - 5),
        y: clamp(anchor.y + randInt(-3, 2), 4, 10),
        w: randInt(2, 4)
      };
      if (candidate.x + candidate.w >= widthTiles - 1) candidate.w = Math.max(2, widthTiles - candidate.x - 2);
      if (overlapsPlatform(candidate, allPlatforms)) continue;
      if (!mainPath.some(p => canFollowPlatform(p, candidate) || canFollowPlatform(candidate, p))) continue;
      allPlatforms.push(candidate);
    }

    const coinTiles = [];
    const coinOccupied = new Set();
    mainPath.forEach((p, index) => {
      if (index === 0) return;
      addCoin(coinTiles, coinOccupied, p.x + Math.max(0, Math.floor(p.w / 2) - 1), p.y - 1);
      if (p.w >= 4 && Math.random() < 0.4) addCoin(coinTiles, coinOccupied, p.x + p.w - 2, p.y - 1);
    });
    allPlatforms.forEach(p => {
      if (mainPlatformKeys.has(`${p.x},${p.y},${p.w}`) || Math.random() < 0.45) return;
      addCoin(coinTiles, coinOccupied, p.x + Math.max(0, Math.floor(p.w / 2) - 1), p.y - 1);
    });

    const enemyTiles = [];
    mainPath.forEach((p, index) => {
      if (index === 0 || index >= mainPath.length - 1 || p.w < 4) return;
      if (Math.random() < 0.45) enemyTiles.push([p.x + 1, p.y - 1]);
    });

    return {
      plat: allPlatforms.map(p => [p.x, p.y, p.w]),
      coins: coinTiles,
      enemy: enemyTiles,
      goal: [finalPlatform.x + finalPlatform.w - 1, finalPlatform.y - 2],
      spawn: [1, mainPath[0].y],
      widthTiles,
      mainPath
    };
  }
  function isLevelPassable(L) {
    if (!L.mainPath || L.mainPath.length < 2) return false;
    for (let i = 0; i < L.mainPath.length - 1; i++) {
      if (!canFollowPlatform(L.mainPath[i], L.mainPath[i + 1])) return false;
    }
    const last = L.mainPath[L.mainPath.length - 1];
    return L.goal[0] >= last.x && L.goal[0] <= last.x + last.w && L.goal[1] === last.y - 2;
  }
  function getLevelData(n) {
    if (!generatedLevels.has(n)) {
      let generated = null;
      for (let i = 0; i < 24; i++) {
        const candidate = createProceduralLevel(n);
        if (isLevelPassable(candidate)) {
          generated = candidate;
          break;
        }
      }
      generatedLevels.set(n, generated || createProceduralLevel(n));
    }
    return generatedLevels.get(n);
  }

  function loadLevel(n) {
    const L = getLevelData(n);
    platforms = L.plat.map(([x, y, w]) => ({ x: x * TILE, y: y * TILE, w: w * TILE, h: TILE }));
    coins = L.coins.map(([x, y]) => ({ x: x * TILE + 8, y: y * TILE + 8, got: false }));
    enemies = L.enemy.map(([x, y]) => ({ x: x * TILE, y: y * TILE, vx: 1.5, w: 24, h: 24 }));
    goal = { x: L.goal[0] * TILE, y: L.goal[1] * TILE, w: TILE, h: TILE * 2 };
    player.x = L.spawn[0] * TILE + 8;
    player.y = L.spawn[1] * TILE - player.h;
    player.vx = 0;
    player.vy = 0;
    W = L.widthTiles * TILE;
    H = LEVEL_ROWS * TILE;
  }
  function run() {
    if (!running) return;
    if (paused) { draw(); return; }
    player.vx = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) player.vx = -SPD;
    if (keys['ArrowRight'] || keys['KeyD']) player.vx = SPD;
    player.x += player.vx;
    player.vy += GRAV;
    player.y += player.vy;
    platforms.forEach(p => {
      if (player.vy > 0 && player.x + player.w > p.x && player.x < p.x + p.w && player.y + player.h >= p.y && player.y + player.h <= p.y + 20) {
        player.y = p.y - player.h;
        player.vy = 0;
      }
    });
    if (player.y > H) { loadLevel(level); score = Math.max(0, score - 50); }
    coins.forEach(c => {
      if (!c.got && player.x + player.w > c.x && player.x < c.x + 16 && player.y + player.h > c.y && player.y < c.y + 16) {
        c.got = true;
        score += 100;
      }
    });
    enemies.forEach(e => {
      e.x += e.vx;
      platforms.forEach(p => {
        if (e.x <= p.x || e.x + e.w >= p.x + p.w) e.vx *= -1;
      });
      if (e.x < 0 || e.x + e.w > W) e.vx *= -1;
      if (player.x + player.w > e.x && player.x < e.x + e.w && player.y + player.h > e.y && player.y < e.y + e.h) {
        loadLevel(level);
        score = Math.max(0, score - 50);
      }
    });
    if (goal && player.x + player.w > goal.x && player.x < goal.x + goal.w && player.y + player.h > goal.y) {
      score += 500;
      level++;
      loadLevel(level);
    }
    container.querySelector('#plat-level').textContent = level;
    container.querySelector('#plat-score').textContent = score;
    draw();
  }
  const keys = {};
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
  function coinPaint(ctx, x, y) {
    const cx = x + 8, cy = y + 8;
    const g = ctx.createRadialGradient(cx - 3, cy - 4, 2, cx, cy, 10);
    g.addColorStop(0, '#fff7b0');
    g.addColorStop(0.55, '#facc15');
    g.addColorStop(1, '#f59e0b');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 8.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(2,6,23,0.72)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 8.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx - 2.4, cy - 3.2, 2.8, 1.8, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  function draw() {
    if (fit) fit.applyTransform(ctx);
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, '#050814');
    sky.addColorStop(0.55, '#0b1130');
    sky.addColorStop(1, '#070a12');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const camX = clamp(player.x - VIEW_W / 2 + player.w / 2, 0, Math.max(0, W - VIEW_W));

    // simple parallax stars + hills (deterministic, no allocations)
    ctx.save();
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 70; i++) {
      const sx = (i * 97.3 + camX * 0.18) % (VIEW_W + 80) - 40;
      const sy = 20 + (i * 61.7) % (VIEW_H * 0.55);
      const s = 0.8 + (i % 3) * 0.7;
      ctx.fillStyle = `rgba(255,255,255,${0.12 + (i % 5) * 0.02})`;
      ctx.fillRect(sx, sy, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(124,156,255,0.12)';
    ctx.beginPath();
    const hillBase = VIEW_H - 48;
    ctx.moveTo(0, hillBase);
    for (let x = 0; x <= VIEW_W + 40; x += 40) {
      const yy = hillBase - 12 - 10 * Math.sin((x + camX * 0.35) / 140);
      ctx.quadraticCurveTo(x + 20, yy, x + 40, hillBase);
    }
    ctx.lineTo(VIEW_W, VIEW_H);
    ctx.lineTo(0, VIEW_H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(-camX, 0);
    platforms.forEach(p => {
      const g = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
      g.addColorStop(0, '#64748b');
      g.addColorStop(1, '#334155');
      ctx.fillStyle = g;
      rr(ctx, p.x, p.y, p.w, p.h, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(124,156,255,0.55)';
      ctx.lineWidth = 2;
      rr(ctx, p.x + 1, p.y + 1, p.w - 2, p.h - 2, 10);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + 8, p.y + 7);
      ctx.lineTo(p.x + p.w - 10, p.y + 7);
      ctx.stroke();
    });
    coins.forEach(c => {
      if (c.got) return;
      coinPaint(ctx, c.x, c.y);
    });
    enemies.forEach(e => {
      const g = ctx.createLinearGradient(0, e.y, 0, e.y + e.h);
      g.addColorStop(0, '#fb7185');
      g.addColorStop(1, '#ef4444');
      ctx.fillStyle = g;
      rr(ctx, e.x, e.y, e.w, e.h, 8);
      ctx.fill();
      ctx.fillStyle = 'rgba(2,6,23,0.55)';
      ctx.beginPath(); ctx.arc(e.x + e.w * 0.35, e.y + e.h * 0.38, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x + e.w * 0.65, e.y + e.h * 0.38, 2.2, 0, Math.PI * 2); ctx.fill();
    });
    if (goal) {
      // finish flag
      ctx.fillStyle = 'rgba(2,6,23,0.65)';
      rr(ctx, goal.x + 10, goal.y + 4, 6, goal.h - 8, 3);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(goal.x + 16, goal.y + 10);
      ctx.lineTo(goal.x + goal.w + 18, goal.y + 18);
      ctx.lineTo(goal.x + 16, goal.y + 26);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(2,6,23,0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(34,197,94,0.18)';
      rr(ctx, goal.x, goal.y, goal.w, goal.h, 10);
      ctx.fill();
    }
    // player
    const pg = ctx.createLinearGradient(0, player.y, 0, player.y + player.h);
    pg.addColorStop(0, '#93c5fd');
    pg.addColorStop(1, '#60a5fa');
    ctx.fillStyle = pg;
    rr(ctx, player.x, player.y, player.w, player.h, 9);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    rr(ctx, player.x + 6, player.y + 9, player.w - 12, 11, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    rr(ctx, player.x + 8, player.y + 11, player.w - 18, 3, 2);
    ctx.fill();
    ctx.restore();

    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '600 20px Segoe UI, Microsoft YaHei UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('pause'), VIEW_W / 2, VIEW_H / 2 - 6);
      ctx.font = '12px Segoe UI, Microsoft YaHei UI, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText('P', VIEW_W / 2, VIEW_H / 2 + 16);
      ctx.textAlign = 'left';
    }
  }
  container.addEventListener('keydown', e => {
    if (e.code === 'KeyP') {
      const btn = container.querySelector('#plat-pause');
      if (btn && running) btn.click();
      e.preventDefault();
      return;
    }
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      const onGround = platforms.some(p => player.y + player.h >= p.y - 2 && player.y + player.h <= p.y + 5 && player.x + player.w > p.x && player.x < p.x + p.w);
      if (!paused && onGround) player.vy = JUMP;
      e.preventDefault();
    }
    keys[e.code] = true;
  });
  container.addEventListener('keyup', e => { keys[e.code] = false; });
  if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '0');
  let platInterval = null;
  const platStartBtn = container.querySelector('#plat-start');
  const platPauseBtn = container.querySelector('#plat-pause');
  if (platPauseBtn) platPauseBtn.disabled = true;
  function stopPlatformerGame() {
    running = false;
    paused = false;
    if (platInterval) clearInterval(platInterval);
    platInterval = null;
    platStartBtn.textContent = t('startGame');
    if (platPauseBtn) { platPauseBtn.textContent = t('pause'); platPauseBtn.disabled = true; }
    draw();
  }
  platStartBtn.onclick = () => {
    if (running) {
      if (window.StarGameKit && StarGameKit.confirmStopGame) {
        StarGameKit.confirmStopGame({ root: container, onConfirm: stopPlatformerGame });
      } else if (window.StarDialog && typeof window.StarDialog.confirm === 'function') {
        window.StarDialog.confirm({
          title: t('confirmStopGameTitle'),
          message: t('confirmStopGameDesc'),
          okText: t('stopGame'),
          cancelText: t('cancel')
        }).then(ok => {
          if (ok) stopPlatformerGame();
        });
      }
      return;
    }
    if (platInterval) clearInterval(platInterval);
    level = 1;
    score = 0;
    generatedLevels.clear();
    loadLevel(1);
    running = true;
    paused = false;
    platStartBtn.textContent = t('stopGame');
    if (platPauseBtn) { platPauseBtn.textContent = t('pause'); platPauseBtn.disabled = false; }
    container.focus();
    platInterval = setInterval(run, 1000/60);
  };
  if (platPauseBtn) {
    platPauseBtn.onclick = () => {
      if (!running) return;
      paused = !paused;
      platPauseBtn.textContent = paused ? t('resume') : t('pause');
      container.focus();
      draw();
    };
  }
  loadLevel(1);
  draw();
};