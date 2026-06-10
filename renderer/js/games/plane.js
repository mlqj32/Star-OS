
/** Star OS - 飞机大战（商业化升级：高 DPI 缩放、键鼠触控、粒子、敌机多样化、暂停） */
window.StarGames = window.StarGames || {};
window.StarGames.plane = function(container) {
  if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '0');
  const canvas = container.querySelector('#plane-canvas');
  const ctx = canvas.getContext('2d');
  const W = 440, H = 560;
  const fit = (window.StarGameKit && StarGameKit.createCanvasFitter) ? StarGameKit.createCanvasFitter(canvas, W, H, { allowUpscale: true }) : null;
  if (!fit) { canvas.width = W; canvas.height = H; }

  const keys = { left: false, right: false };
  const stars = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 0.6 + Math.random() * 1.8, a: 0.25 + Math.random() * 0.55 }));
  let player = { x: W / 2 - 22, y: H - 86, w: 44, h: 58, cooldown: 0, targetX: W / 2 - 22 };
  let bullets = [];
  let enemies = [];
  let particles = [];
  let running = false;
  let paused = false;
  let frame = 0;
  let score = 0, highScore = parseInt(localStorage.getItem('star-plane-high') || '0', 10);
  let tripleOverride = null; // null: auto by score, boolean: force x1/x3

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(min, max) { return min + Math.random() * (max - min); }
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
  function hexToRgba(hex, a) {
    const h = String(hex || '').replace('#', '').trim();
    if (h.length !== 6) return `rgba(255,255,255,${a})`;
    const r = parseInt(h.slice(0, 2), 16) || 255;
    const g = parseInt(h.slice(2, 4), 16) || 255;
    const b = parseInt(h.slice(4, 6), 16) || 255;
    return `rgba(${r},${g},${b},${a})`;
  }

  function hitSparks(x, y, color) {
    for (let i = 0; i < 6; i++) particles.push({ kind: 'spark', x, y, vx: rand(-2.2, 2.2), vy: rand(-1.8, 1.8), t: 0, life: 14 + Math.random() * 10, drag: 0.92, color });
  }
  function boom(x, y, radius) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(1.4, 4.8) * (radius / 20);
      particles.push({ kind: 'boom', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 24 + Math.random() * 18, drag: 0.9, color: '#ffd166' });
    }
    particles.push({ kind: 'ring', x, y, vx: 0, vy: 0, t: 0, life: 14, drag: 1, color: '#ffb703', radius });
  }

  function update() {
    if (!running) return;
    if (paused) { draw(); return; }
    frame++;

    // movement: keyboard nudges target, pointer sets target
    const accel = 6.5;
    if (keys.left) player.targetX -= accel;
    if (keys.right) player.targetX += accel;
    player.targetX = clamp(player.targetX, 8, W - player.w - 8);
    player.x += (player.targetX - player.x) * 0.22;

    // auto fire: rate & spread scale with score
    player.cooldown--;
    const fireRate = score < 400 ? 7 : score < 1200 ? 6 : 5;
    const bulletSpeed = score < 600 ? -12 : -13.5;
    if (player.cooldown <= 0) {
      const autoTriple = score >= 900;
      const triple = (tripleOverride == null) ? autoTriple : !!tripleOverride;
      const spread = triple ? 6 : 0;
      bullets.push({ x: player.x + player.w/2 - 1.5, y: player.y + 4, vx: 0, vy: bulletSpeed });
      if (spread) {
        bullets.push({ x: player.x + player.w/2 - 1.5, y: player.y + 8, vx: -0.8, vy: bulletSpeed });
        bullets.push({ x: player.x + player.w/2 - 1.5, y: player.y + 8, vx: 0.8, vy: bulletSpeed });
      }
      player.cooldown = fireRate;
    }

    bullets.forEach(b => { b.x += b.vx; b.y += b.vy; });
    bullets = bullets.filter(b => b.y > -40 && b.x > -40 && b.x < W + 40);

    // spawn enemies: ramp + variety
    const baseSpawn = score < 600 ? 0.045 : score < 1500 ? 0.055 : 0.065;
    const waveBoost = (Math.sin(frame / 160) + 1) * 0.012;
    if (Math.random() < baseSpawn + waveBoost) {
      const r = Math.random();
      if (r < 0.65) enemies.push({ type: 'drone', x: rand(10, W - 34), y: -36, w: 30, h: 26, vx: rand(-0.3, 0.3), vy: rand(2.2, 3.4), hp: 1, score: 20 });
      else if (r < 0.9) enemies.push({ type: 'fighter', x: rand(10, W - 50), y: -48, w: 44, h: 32, vx: rand(-1.2, 1.2), vy: rand(2.6, 3.8), hp: 2, score: 45 });
      else enemies.push({ type: 'tank', x: rand(10, W - 72), y: -72, w: 64, h: 44, vx: rand(-0.6, 0.6), vy: rand(1.6, 2.2), hp: 5, score: 120 });
    }
    enemies.forEach(e => {
      e.x += e.vx;
      e.y += e.vy;
      if (e.x < 6 || e.x > W - e.w - 6) e.vx *= -1;
      if (e.y > H + 80) e.dead = true;
    });

    // collisions: bullets vs enemies
    bullets.forEach(b => {
      enemies.forEach(e => {
        if (e.dead) return;
        if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
          b.dead = true;
          e.hp -= 1;
          hitSparks(b.x, b.y, e.type === 'tank' ? '#ffb703' : '#7c9cff');
          if (e.hp <= 0) {
            e.dead = true;
            score += e.score || 10;
            boom(e.x + e.w/2, e.y + e.h/2, e.type === 'tank' ? 26 : 16);
          }
        }
      });
    });
    bullets = bullets.filter(b => !b.dead);

    // collision: player vs enemies
    for (const e of enemies) {
      if (e.dead) continue;
      if (e.x < player.x + player.w && e.x + e.w > player.x && e.y < player.y + player.h && e.y + e.h > player.y) {
        boom(player.x + player.w/2, player.y + player.h/2, 30);
        endGame();
        break;
      }
    }

    enemies = enemies.filter(e => !e.dead);
    particles.forEach(p => { p.t++; p.x += p.vx; p.y += p.vy; p.vx *= p.drag; p.vy *= p.drag; });
    particles = particles.filter(p => p.t < p.life);

    if (score > highScore) { highScore = score; try { localStorage.setItem('star-plane-high', String(highScore)); } catch (_) {} }
    container.querySelector('#plane-score').textContent = score;
    container.querySelector('#plane-high').textContent = highScore;
    draw();
  }

  function endGame() {
    running = false;
    paused = false;
    container.querySelector('#plane-start').textContent = t('startGame');
    const pauseBtn = container.querySelector('#plane-pause');
    if (pauseBtn) { pauseBtn.textContent = t('pause'); pauseBtn.disabled = true; }
    draw();
  }

  function draw() {
    if (fit) fit.applyTransform(ctx);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#050814');
    bg.addColorStop(0.6, '#0b1130');
    bg.addColorStop(1, '#03050c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    stars.forEach(s => {
      s.y += 0.6 + s.s * 0.35;
      if (s.y > H + 2) { s.y = -2; s.x = Math.random() * W; }
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    });

    bullets.forEach(b => {
      ctx.fillStyle = 'rgba(255,230,120,0.85)';
      rr(ctx, b.x - 1, b.y, 3.5, 12, 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,230,120,0.25)';
      rr(ctx, b.x - 2.2, b.y - 2, 6, 16, 3);
      ctx.fill();
    });

    enemies.forEach(e => {
      if (e.type === 'tank') {
        ctx.fillStyle = '#ef4444';
        rr(ctx, e.x, e.y, e.w, e.h, 10); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        rr(ctx, e.x + 10, e.y + 10, e.w - 20, e.h - 18, 8); ctx.fill();
      } else if (e.type === 'fighter') {
        ctx.fillStyle = '#fb7185';
        rr(ctx, e.x, e.y, e.w, e.h, 10); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        rr(ctx, e.x + 8, e.y + 6, e.w - 16, 6, 4); ctx.fill();
      } else {
        ctx.fillStyle = '#f97316';
        rr(ctx, e.x, e.y, e.w, e.h, 9); ctx.fill();
      }
    });

    // player ship
    ctx.save();
    ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
    ctx.fillStyle = '#7c9cff';
    ctx.beginPath();
    ctx.moveTo(0, -player.h / 2);
    ctx.lineTo(player.w * 0.48, player.h * 0.42);
    ctx.lineTo(0, player.h * 0.32);
    ctx.lineTo(-player.w * 0.48, player.h * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, -2, player.w * 0.22, player.h * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.ellipse(-3, -4, player.w * 0.12, player.h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // particles
    particles.forEach(p => {
      const a = 1 - p.t / p.life;
      if (p.kind === 'ring') {
        ctx.strokeStyle = `rgba(255,209,102,${0.55 * a})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (p.radius || 18) * (0.5 + p.t / p.life), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color ? (p.color.startsWith('#') ? hexToRgba(p.color, 0.45 * a) : p.color) : `rgba(255,209,102,${0.45 * a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2 + 1.2 * (1 - a), 0, Math.PI * 2);
        ctx.fill();
      }
    });

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

  // input: keyboard + pointer movement
  container.addEventListener('keydown', e => {
    if (e.code === 'KeyP') {
      const pauseBtn = container.querySelector('#plane-pause');
      if (pauseBtn && running) pauseBtn.click();
      e.preventDefault();
      return;
    }
    if (e.code === 'Space') {
      // Toggle between x1 and x3 bullets when the triple-shot is available (unlocked by score),
      // and also allow switching back to single-shot.
      if (running && !paused) {
        const autoTriple = score >= 900;
        const currentTriple = (tripleOverride == null) ? autoTriple : !!tripleOverride;
        tripleOverride = !currentTriple;
      }
      e.preventDefault();
      return;
    }
    if (!running || paused) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    e.preventDefault();
  });
  container.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  });
  canvas.addEventListener('pointermove', e => {
    if (!running || paused) return;
    if (fit) {
      const p = fit.toBasePointFromClient(e.clientX, e.clientY);
      player.targetX = clamp(p.x - player.w / 2, 8, W - player.w - 8);
    } else {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (W / (rect.width || 1));
      player.targetX = clamp(x - player.w / 2, 8, W - player.w - 8);
    }
  });

  const planeStartBtn = container.querySelector('#plane-start');
  const planePauseBtn = container.querySelector('#plane-pause');
  if (planePauseBtn) planePauseBtn.disabled = true;
  function stopPlaneGame() {
    running = false;
    paused = false;
    planeStartBtn.textContent = t('startGame');
    if (planePauseBtn) { planePauseBtn.textContent = t('pause'); planePauseBtn.disabled = true; }
    draw();
  }
  planeStartBtn.onclick = () => {
    if (running) {
      if (window.StarGameKit && StarGameKit.confirmStopGame) {
        StarGameKit.confirmStopGame({ root: container, onConfirm: stopPlaneGame });
      } else if (window.StarDialog && typeof window.StarDialog.confirm === 'function') {
        window.StarDialog.confirm({
          title: t('confirmStopGameTitle'),
          message: t('confirmStopGameDesc'),
          okText: t('stopGame'),
          cancelText: t('cancel')
        }).then(ok => {
          if (ok) stopPlaneGame();
        });
      }
      return;
    }
    player = { x: W / 2 - 22, y: H - 86, w: 44, h: 58, cooldown: 0, targetX: W / 2 - 22 };
    bullets = [];
    enemies = [];
    particles = [];
    score = 0;
    frame = 0;
    tripleOverride = null;
    running = true;
    paused = false;
    planeStartBtn.textContent = t('stopGame');
    if (planePauseBtn) { planePauseBtn.textContent = t('pause'); planePauseBtn.disabled = false; }
    container.focus();
    const loop = () => { update(); if (running) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  };
  if (planePauseBtn) {
    planePauseBtn.onclick = () => {
      if (!running) return;
      paused = !paused;
      planePauseBtn.textContent = paused ? t('resume') : t('pause');
      container.focus();
      draw();
    };
  }

  container.querySelector('#plane-score').textContent = '0';
  container.querySelector('#plane-high').textContent = highScore;
  draw();
};