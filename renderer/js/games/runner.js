
/** Star OS - 趣味跑酷 (障碍/跳跃/加速/高分) */
window.StarGames = window.StarGames || {};
window.StarGames.runner = function(container) {
  if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '0');
  const canvas = container.querySelector('#runner-canvas');
  const ctx = canvas.getContext('2d');
  const W = 640, H = 280;
  const fit = (window.StarGameKit && StarGameKit.createCanvasFitter) ? StarGameKit.createCanvasFitter(canvas, W, H, { allowUpscale: true }) : null;
  if (!fit) { canvas.width = W; canvas.height = H; }
  let player = { x: 80, y: H - 60, w: 36, h: 50, vy: 0, jump: false };
  let obstacles = [];
  let score = 0, highScore = parseInt(localStorage.getItem('star-runner-high')||'0',10);
  let running = false;
  let paused = false;
  let gameOver = false;
  let frame = 0;
  const GRAV = 0.9, JUMP = -14;
  const GROUND = H - 50;
  const OBSTACLE_W = 24;
  const JUMP_AIR_FRAMES = 31;
  let spawnCooldown = 0;
  let bgTick = 0;
  let dust = [];

  function obstacleSpeed() {
    return 6 - Math.min(3, Math.floor(score / 500));
  }
  function scheduleNextSpawn(initial = false) {
    const speed = obstacleSpeed();
    const minGap = Math.max(190, speed * (JUMP_AIR_FRAMES - 4) + OBSTACLE_W);
    const maxGap = minGap + (initial ? 80 : 160);
    const gap = minGap + Math.random() * (maxGap - minGap);
    spawnCooldown = Math.max(1, Math.ceil(gap / speed));
  }
  function spawn() {
    if (spawnCooldown > 0) {
      spawnCooldown--;
      return;
    }
    const h = 30 + Math.random() * 40;
    obstacles.push({ x: W, y: GROUND - h, w: OBSTACLE_W, h });
    scheduleNextSpawn();
  }
  function run() {
    if (!running) return;
    if (paused) { draw(); return; }
    frame++;
    if (frame % 5 === 0) score++;
    if (score > highScore) { highScore = score; try { localStorage.setItem('star-runner-high', String(highScore)); } catch(_){} }
    player.vy += GRAV;
    player.y += player.vy;
    if (player.y >= GROUND - player.h) { player.y = GROUND - player.h; player.vy = 0; player.jump = false; }
    const speed = obstacleSpeed();
    bgTick += speed;
    obstacles.forEach(o => {
      o.x -= speed;
      if (player.x + player.w > o.x && player.x < o.x + o.w && player.y + player.h > o.y) {
        running = false;
        paused = false;
        gameOver = true;
        container.querySelector('#runner-start').textContent = t('restartGame');
        const pauseBtn = container.querySelector('#runner-pause');
        if (pauseBtn) { pauseBtn.textContent = t('pause'); pauseBtn.disabled = true; }
        return;
      }
    });
    obstacles = obstacles.filter(o => o.x + o.w > 0);
    // small dust particles for motion feedback
    if (!player.jump && frame % 6 === 0) {
      dust.push({ x: player.x + 8, y: GROUND - 4, vx: -speed * 0.35 - Math.random() * 0.8, vy: -Math.random() * 1.2, t: 0, life: 18 + Math.random() * 10 });
    }
    dust.forEach(p => { p.t++; p.x += p.vx; p.y += p.vy; p.vy += 0.05; });
    dust = dust.filter(p => p.t < p.life);
    spawn();
    container.querySelector('#runner-score').textContent = score;
    container.querySelector('#runner-high').textContent = highScore;
    draw();
  }
  function draw() {
    if (fit) fit.applyTransform(ctx);
    // Sky gradient + subtle scanlines for a more polished look
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#070a18');
    g.addColorStop(0.55, '#121a33');
    g.addColorStop(1, '#091026');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

    // Distant hills
    ctx.fillStyle = 'rgba(124,156,255,0.12)';
    ctx.beginPath();
    const hillBase = GROUND - 8;
    ctx.moveTo(0, hillBase);
    for (let x = 0; x <= W; x += 40) {
      const yy = hillBase - 12 - 10 * Math.sin((x + bgTick * 0.35) / 120);
      ctx.quadraticCurveTo(x + 20, yy, x + 40, hillBase);
    }
    ctx.lineTo(W, GROUND);
    ctx.lineTo(0, GROUND);
    ctx.closePath();
    ctx.fill();

    // Ground
    const gg = ctx.createLinearGradient(0, GROUND, 0, H);
    gg.addColorStop(0, '#1e2a3a');
    gg.addColorStop(1, '#0b1324');
    ctx.fillStyle = gg;
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let x = -80; x < W + 80; x += 28) {
      const xx = (x - (bgTick % 28));
      ctx.fillRect(xx, GROUND + 8, 10, 2);
    }

    // Player (rounded body + visor)
    ctx.fillStyle = '#7c9cff';
    roundRect(ctx, player.x, player.y, player.w, player.h, 9);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, player.x + 8, player.y + 10, player.w - 16, 12, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(ctx, player.x + 10, player.y + 12, player.w - 22, 3, 2);
    ctx.fill();

    // Obstacles (spikes)
    obstacles.forEach(o => {
      ctx.fillStyle = '#f05050';
      ctx.beginPath();
      const spikes = 4;
      const step = o.w / spikes;
      ctx.moveTo(o.x, o.y + o.h);
      for (let i = 0; i < spikes; i++) {
        const sx = o.x + i * step;
        ctx.lineTo(sx + step * 0.5, o.y);
        ctx.lineTo(sx + step, o.y + o.h);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(o.x + 3, o.y + 6, 2, Math.max(6, o.h - 12));
    });

    // Dust
    dust.forEach(p => {
      const a = 1 - p.t / p.life;
      ctx.fillStyle = `rgba(255,214,102,${0.18 * a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2 + 1.6 * (1 - a), 0, Math.PI * 2);
      ctx.fill();
    });

    // Pause overlay
    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '600 20px Segoe UI, Microsoft YaHei UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('pause'), W / 2, H / 2 - 6);
      ctx.font = '12px Segoe UI, Microsoft YaHei UI, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText('P', W / 2, H / 2 + 16);
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

  function doJump() {
    if (!running || paused) return;
    if (!player.jump && player.y >= GROUND - player.h - 2) { player.vy = JUMP; player.jump = true; }
  }

  const runnerStartBtn = container.querySelector('#runner-start');
  const runnerPauseBtn = container.querySelector('#runner-pause');
  if (runnerPauseBtn) runnerPauseBtn.disabled = true;
  function stopRunnerGame() {
    running = false;
    paused = false;
    gameOver = false;
    runnerStartBtn.textContent = t('startGame');
    if (runnerPauseBtn) { runnerPauseBtn.textContent = t('pause'); runnerPauseBtn.disabled = true; }
    draw();
  }
  runnerStartBtn.onclick = () => {
    if (running) {
      if (window.StarGameKit && StarGameKit.confirmStopGame) {
        StarGameKit.confirmStopGame({ root: container, onConfirm: stopRunnerGame });
      } else if (window.StarDialog && typeof window.StarDialog.confirm === 'function') {
        window.StarDialog.confirm({
          title: t('confirmStopGameTitle'),
          message: t('confirmStopGameDesc'),
          okText: t('stopGame'),
          cancelText: t('cancel')
        }).then(ok => {
          if (ok) stopRunnerGame();
        });
      }
      return;
    }
    gameOver = false;
    player.y = GROUND - player.h;
    player.vy = 0;
    player.jump = false;
    obstacles = [];
    dust = [];
    score = 0;
    frame = 0;
    scheduleNextSpawn(true);
    running = true;
    paused = false;
    runnerStartBtn.textContent = t('stopGame');
    if (runnerPauseBtn) { runnerPauseBtn.textContent = t('pause'); runnerPauseBtn.disabled = false; }
    container.focus();
    const loop = () => { run(); if (running) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  };
  if (runnerPauseBtn) {
    runnerPauseBtn.onclick = () => {
      if (!running) return;
      paused = !paused;
      runnerPauseBtn.textContent = paused ? t('resume') : t('pause');
      container.focus();
      draw();
    };
  }
  container.addEventListener('keydown', e => {
    if (e.code === 'KeyP') {
      if (runnerPauseBtn && running) runnerPauseBtn.click();
      e.preventDefault();
      return;
    }
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (!running && gameOver) {
      runnerStartBtn.click();
      return;
    }
    doJump();
  });
  if (window.StarGameKit && StarGameKit.onPointerTap) {
    StarGameKit.onPointerTap(canvas, () => {
      if (!running && gameOver) { runnerStartBtn.click(); return; }
      doJump();
    });
  }
  container.querySelector('#runner-score').textContent = '0';
  container.querySelector('#runner-high').textContent = highScore;
  draw();
};