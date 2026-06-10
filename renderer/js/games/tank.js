
/** Star OS - 坦克大战 (1000关/选关/更强AI/自绘素材/主角不误伤基地) */
window.StarGames = window.StarGames || {};
window.StarGames.tank = function(container) {
  const root = container && (container.querySelector('#game-tank') || container);
  if (!root || root.dataset.bound === 'true') return;
  root.dataset.bound = 'true';
  if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '0');

  const canvas = root.querySelector('#tank-canvas');
  const ctx = canvas && canvas.getContext && canvas.getContext('2d');
  const startBtn = root.querySelector('#tank-start');
  const levelEl = root.querySelector('#tank-level');
  const scoreEl = root.querySelector('#tank-score');
  const livesEl = root.querySelector('#tank-lives');
  const levelSelect = root.querySelector('#tank-level-select');
  if (!canvas || !ctx || !startBtn || !levelEl || !scoreEl || !livesEl || !levelSelect) return;

  const MAX_LEVEL = 1000;
  const LEVEL_STORAGE_KEY = 'star-game-tank-last-level';
  const GRID_W = 15;
  const GRID_H = 15;
  const TILE = 32;
  const WORLD_W = GRID_W * TILE;
  const WORLD_H = GRID_H * TILE;

  const TILE_EMPTY = 0;
  const TILE_BRICK = 1;
  const TILE_STEEL = 2;
  const TILE_WATER = 3;
  const TILE_GRASS = 4;

  const DIRS = [
    { x: 0, y: -1 }, // up
    { x: 1, y: 0 },  // right
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }  // left
  ];

  const keys = Object.create(null);
  let running = false;
  let raf = 0;
  let lastTs = 0;
  let lastLoopAt = 0;
  let nextTankId = 1;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function readSavedLevel() {
    try {
      const raw = Number(window.localStorage.getItem(LEVEL_STORAGE_KEY) || '1');
      if (Number.isFinite(raw)) return clamp(Math.floor(raw), 1, MAX_LEVEL);
    } catch (_) {}
    return 1;
  }
  function persistLevel(level) {
    try {
      window.localStorage.setItem(LEVEL_STORAGE_KEY, String(clamp(level, 1, MAX_LEVEL)));
    } catch (_) {}
  }
  function makeRng(seed) {
    let x = (seed >>> 0) || 1;
    return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  function setCanvasSize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(WORLD_W * dpr);
    canvas.height = Math.floor(WORLD_H * dpr);
    canvas.style.width = WORLD_W + 'px';
    canvas.style.height = WORLD_H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }

  const state = {
    selectedLevel: 1,
    level: 1,
    score: 0,
    lives: 3,
    grid: null,
    base: null,
    playerSpawn: null,
    enemySpawns: null,
    player: null,
    enemies: [],
    bullets: [],
    fx: [],
    powerups: [],
    spawnLeft: 0,
    spawnCooldown: 0,
    won: false,
    lost: false
  };

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function tileAt(grid, px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || tx >= GRID_W || ty < 0 || ty >= GRID_H) return TILE_STEEL;
    return grid[ty][tx];
  }

  function isPerimeterTile(tx, ty) {
    return tx === 0 || ty === 0 || tx === GRID_W - 1 || ty === GRID_H - 1;
  }

  function circleRectOverlap(cx, cy, r, rect) {
    if (!rect) return false;
    const nx = clamp(cx, rect.x, rect.x + rect.w);
    const ny = clamp(cy, rect.y, rect.y + rect.h);
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy <= r * r;
  }

  function segmentRectOverlap(x0, y0, x1, y1, rect, pad) {
    if (!rect) return false;
    const minX = rect.x - (pad || 0);
    const maxX = rect.x + rect.w + (pad || 0);
    const minY = rect.y - (pad || 0);
    const maxY = rect.y + rect.h + (pad || 0);
    const dx = x1 - x0;
    const dy = y1 - y0;
    let t0 = 0;
    let t1 = 1;
    const clip = (p, q) => {
      if (p === 0) return q >= 0;
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
      return true;
    };
    return clip(-dx, x0 - minX) &&
      clip(dx, maxX - x0) &&
      clip(-dy, y0 - minY) &&
      clip(dy, maxY - y0);
  }

  function pointSegmentDistanceSq(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
      const ox = px - x0;
      const oy = py - y0;
      return ox * ox + oy * oy;
    }
    const t = clamp(((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy), 0, 1);
    const qx = x0 + dx * t;
    const qy = y0 + dy * t;
    const ox = px - qx;
    const oy = py - qy;
    return ox * ox + oy * oy;
  }

  function cross2(ax, ay, bx, by) {
    return ax * by - ay * bx;
  }

  function segmentsNear(ax, ay, bx, by, cx, cy, dx, dy, pad) {
    const abx = bx - ax;
    const aby = by - ay;
    const cdx = dx - cx;
    const cdy = dy - cy;
    const acx = cx - ax;
    const acy = cy - ay;
    const denom = cross2(abx, aby, cdx, cdy);
    if (Math.abs(denom) > 1e-6) {
      const t = cross2(acx, acy, cdx, cdy) / denom;
      const u = cross2(acx, acy, abx, aby) / denom;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
    }
    const padSq = pad * pad;
    return pointSegmentDistanceSq(ax, ay, cx, cy, dx, dy) <= padSq ||
      pointSegmentDistanceSq(bx, by, cx, cy, dx, dy) <= padSq ||
      pointSegmentDistanceSq(cx, cy, ax, ay, bx, by) <= padSq ||
      pointSegmentDistanceSq(dx, dy, ax, ay, bx, by) <= padSq;
  }

  function getBaseDamageRect() {
    if (!state.base) return { x: -9999, y: -9999, w: 1, h: 1 };
    return {
      x: state.base.drawX + 8,
      y: state.base.drawY + 8,
      w: state.base.drawW - 16,
      h: state.base.drawH - 14
    };
  }

  function isSolidTile(t) {
    return t === TILE_BRICK || t === TILE_STEEL || t === TILE_WATER;
  }

  function collidesWithMap(grid, rect) {
    const x0 = Math.floor(rect.x / TILE);
    const y0 = Math.floor(rect.y / TILE);
    const x1 = Math.floor((rect.x + rect.w - 1) / TILE);
    const y1 = Math.floor((rect.y + rect.h - 1) / TILE);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const t = (grid[y] && grid[y][x]) != null ? grid[y][x] : TILE_STEEL;
        if (isSolidTile(t)) return true;
      }
    }
    return false;
  }

  function lineOfSight(grid, x0, y0, x1, y1) {
    if (Math.abs(x0 - x1) < 1e-6) {
      const x = x0;
      const a = Math.min(y0, y1);
      const b = Math.max(y0, y1);
      for (let y = a; y <= b; y += TILE * 0.5) {
        const t = tileAt(grid, x, y);
        if (t === TILE_BRICK || t === TILE_STEEL || t === TILE_WATER) return false;
      }
      return true;
    }
    if (Math.abs(y0 - y1) < 1e-6) {
      const y = y0;
      const a = Math.min(x0, x1);
      const b = Math.max(x0, x1);
      for (let x = a; x <= b; x += TILE * 0.5) {
        const t = tileAt(grid, x, y);
        if (t === TILE_BRICK || t === TILE_STEEL || t === TILE_WATER) return false;
      }
      return true;
    }
    return false;
  }

  function getBaseBlockRect() {
    if (!state.base) return { x: -9999, y: -9999, w: 1, h: 1 };
    return { x: state.base.hitX, y: state.base.hitY - TILE, w: state.base.hitW, h: state.base.hitH + TILE * 2 };
  }

  function gridAlignedOrigin(v) {
    return Math.round((v - 3) / TILE) * TILE + 3;
  }

  function getTankGridPos(tank) {
    return {
      tx: Math.round((tank.x - 3) / TILE),
      ty: Math.round((tank.y - 3) / TILE)
    };
  }

  function collidesWithTanks(self, rect) {
    const p2 = state.player;
    if (p2 && p2 !== self && !p2.dead && rectsOverlap(rect, p2)) return true;
    for (const other of state.enemies) {
      if (!other || other === self || other.dead) continue;
      if (rectsOverlap(rect, other)) return true;
    }
    return false;
  }

  function tryMoveTankTo(self, nx, ny) {
    if (!state.grid || !state.base) return false;
    const rect = { x: nx, y: ny, w: self.w, h: self.h };
    const baseBlock = getBaseBlockRect();
    if (collidesWithMap(state.grid, rect) || rectsOverlap(rect, baseBlock)) return false;
    if (collidesWithTanks(self, rect)) return false;
    self.x = nx;
    self.y = ny;
    return true;
  }

  function canMoveTank(self, dir, dtScale) {
    if (!state.grid || !state.base) return false;
    const d = DIRS[dir];
    const nx = self.x + d.x * self.speed * dtScale;
    const ny = self.y + d.y * self.speed * dtScale;
    const rect = { x: nx, y: ny, w: self.w, h: self.h };
    const baseBlock = getBaseBlockRect();
    if (collidesWithMap(state.grid, rect) || rectsOverlap(rect, baseBlock)) return false;
    if (collidesWithTanks(self, rect)) return false;
    return true;
  }

  function alignTankToLane(self, dir, dtScale) {
    const alignSpeed = Math.max(1.6, self.speed * dtScale);
    if (dir === 0 || dir === 2) {
      const targetX = gridAlignedOrigin(self.x);
      const delta = targetX - self.x;
      if (Math.abs(delta) <= 0.35) {
        self.x = targetX;
        return true;
      }
      const step = clamp(delta, -alignSpeed, alignSpeed);
      tryMoveTankTo(self, self.x + step, self.y);
      return false;
    }
    const targetY = gridAlignedOrigin(self.y);
    const delta = targetY - self.y;
    if (Math.abs(delta) <= 0.35) {
      self.y = targetY;
      return true;
    }
    const step = clamp(delta, -alignSpeed, alignSpeed);
    tryMoveTankTo(self, self.x, self.y + step);
    return false;
  }

  function pickTurnDir(self, preferredDir, dtScale) {
    // Prefer perpendicular turns to avoid oscillation; fall back to any movable dir.
    const left = (self.dir + 3) % 4;
    const right = (self.dir + 1) % 4;
    const back = (self.dir + 2) % 4;

    const order = [];
    if (preferredDir != null) order.push(preferredDir);
    order.push(left, right, back, (self.dir + 0) % 4);

    const seen = new Set();
    const unique = order.filter(d => { if (seen.has(d)) return false; seen.add(d); return true; });

    let best = null;
    let bestScore = -1;
    for (const d of unique) {
      if (!canMoveTank(self, d, dtScale)) continue;
      const s = (preferredDir === d ? 3 : ((d === left || d === right) ? 2 : (d === back ? 1 : 0)));
      if (s > bestScore) { bestScore = s; best = d; }
    }
    return best;
  }

  function getBaseAssaultTargets() {
    if (!state.base) return [];
    const baseTileX = Math.floor(state.base.hitX / TILE);
    const baseTileY = Math.floor(state.base.hitY / TILE);
    return [
      { tx: baseTileX, ty: baseTileY - 3 },
      { tx: baseTileX + 1, ty: baseTileY - 3 },
      { tx: baseTileX - 2, ty: baseTileY - 1 },
      { tx: baseTileX - 2, ty: baseTileY },
      { tx: baseTileX + 3, ty: baseTileY - 1 },
      { tx: baseTileX + 3, ty: baseTileY }
    ].filter(pos => pos.tx >= 1 && pos.tx < GRID_W - 1 && pos.ty >= 1 && pos.ty < GRID_H - 1);
  }

  function assaultTargetKeySet(targets) {
    return new Set(targets.map(pos => `${pos.tx}:${pos.ty}`));
  }

  function getBaseAssaultDir(tx, ty) {
    if (!state.base) return null;
    const baseTileX = Math.floor(state.base.hitX / TILE);
    const baseTileY = Math.floor(state.base.hitY / TILE);
    if (ty === baseTileY - 3 && (tx === baseTileX || tx === baseTileX + 1)) return 2;
    if ((ty === baseTileY - 1 || ty === baseTileY) && tx === baseTileX - 2) return 1;
    if ((ty === baseTileY - 1 || ty === baseTileY) && tx === baseTileX + 3) return 3;
    return null;
  }

  function getFrontTileInfo(tank, dir) {
    const d = DIRS[dir];
    const probeX = tank.x + tank.w / 2 + d.x * 18;
    const probeY = tank.y + tank.h / 2 + d.y * 18;
    return {
      probeX,
      probeY,
      tx: Math.floor(probeX / TILE),
      ty: Math.floor(probeY / TILE),
      tile: tileAt(state.grid, probeX, probeY)
    };
  }

  function scanShotLine(tank, dir) {
    const d = DIRS[dir];
    const startX = tank.x + tank.w / 2;
    const startY = tank.y + tank.h / 2;
    const baseRect = getBaseDamageRect();
    const maxDist = Math.max(WORLD_W, WORLD_H) + TILE;

    for (let dist = 18; dist <= maxDist; dist += 4) {
      const x = startX + d.x * dist;
      const y = startY + d.y * dist;
      if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) break;
      const tx = Math.floor(x / TILE);
      const ty = Math.floor(y / TILE);
      const tile = tileAt(state.grid, x, y);
      if (tile === TILE_BRICK || tile === TILE_STEEL || tile === TILE_WATER) {
        return { hitsBase: false, tile, tx, ty, dist };
      }
      if (circleRectOverlap(x, y, 2, baseRect)) {
        return { hitsBase: true, tile: TILE_EMPTY, tx: -1, ty: -1, dist };
      }
    }

    return { hitsBase: false, tile: TILE_EMPTY, tx: -1, ty: -1, dist: Infinity };
  }

  function getPlayerShotDir(tank, player) {
    if (!tank || !player) return null;
    const ex = tank.x + tank.w / 2;
    const ey = tank.y + tank.h / 2;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;

    if (ex >= player.x - 2 && ex <= player.x + player.w + 2 && lineOfSight(state.grid, ex, ey, ex, py)) {
      return py < ey ? 0 : 2;
    }
    if (ey >= player.y - 2 && ey <= player.y + player.h + 2 && lineOfSight(state.grid, ex, ey, px, ey)) {
      return px < ex ? 3 : 1;
    }
    return null;
  }

  function getBaseShotDir(tank) {
    if (!tank || !state.base) return null;
    const rect = getBaseDamageRect();
    const ex = tank.x + tank.w / 2;
    const ey = tank.y + tank.h / 2;

    if (ex >= rect.x && ex <= rect.x + rect.w) {
      if (ey < rect.y && lineOfSight(state.grid, ex, ey, ex, rect.y)) return 2;
      if (ey > rect.y + rect.h && lineOfSight(state.grid, ex, ey, ex, rect.y + rect.h)) return 0;
    }
    if (ey >= rect.y && ey <= rect.y + rect.h) {
      if (ex < rect.x && lineOfSight(state.grid, ex, ey, rect.x, ey)) return 1;
      if (ex > rect.x + rect.w && lineOfSight(state.grid, ex, ey, rect.x + rect.w, ey)) return 3;
    }
    return null;
  }

  function clearEnemyPlayerAim(tank) {
    if (!tank) return;
    tank.aiPlayerAimDir = -1;
    tank.aiPlayerAimReadyAt = 0;
    tank.aiPlayerAimLockAt = 0;
  }

  function clearEnemyManeuver(tank) {
    if (!tank) return;
    tank.aiManeuverDir = -1;
    tank.aiManeuverUntil = 0;
  }

  function beginEnemyManeuver(tank, dir, now, durationMs) {
    if (!tank || dir == null || dir < 0) return;
    tank.aiManeuverDir = dir;
    tank.aiManeuverUntil = now + Math.max(260, durationMs || 520);
    tank.aiDir = dir;
    tank.dir = dir;
  }

  function getEnemyPlayerAimDelay(tank) {
    const tier = computeScaling(state.level).enemyTier;
    const base = tank.kind === 'boss' ? 520
      : tank.kind === 'rocket' ? 590
      : tank.kind === 'scout' ? 700
      : tank.kind === 'heavy' ? 820
      : 760;
    return Math.max(360, base - Math.min(220, tier * 18));
  }

  function shouldEnemyFireAtPlayer(tank, dir, now) {
    if (!tank) return false;
    const aimDelay = getEnemyPlayerAimDelay(tank);
    const sameAim = tank.aiPlayerAimDir === dir && tank.aiPlayerAimLockAt >= now;
    if (!sameAim) {
      tank.aiPlayerAimDir = dir;
      tank.aiPlayerAimReadyAt = now + aimDelay;
    }
    tank.aiPlayerAimLockAt = now + Math.max(420, aimDelay + 180);
    return now >= tank.aiPlayerAimReadyAt;
  }

  function getTankCenter(tank) {
    return { x: tank.x + tank.w / 2, y: tank.y + tank.h / 2 };
  }

  function getTankDistanceTiles(a, b) {
    if (!a || !b) return Infinity;
    const ac = getTankCenter(a);
    const bc = getTankCenter(b);
    return Math.hypot(ac.x - bc.x, ac.y - bc.y) / TILE;
  }

  function getEnemyBaseDistanceTiles(tank) {
    if (!tank || !state.base) return Infinity;
    const tc = getTankCenter(tank);
    const bx = state.base.hitX + state.base.hitW / 2;
    const by = state.base.hitY + state.base.hitH / 2;
    return Math.hypot(tc.x - bx, tc.y - by) / TILE;
  }

  function shouldEnemyCommitToPlayer(tank, player) {
    if (!tank || !player || !state.base) return false;
    const distPlayer = getTankDistanceTiles(tank, player);
    const distBase = getEnemyBaseDistanceTiles(tank);
    const pc = getTankCenter(player);
    const bx = state.base.hitX + state.base.hitW / 2;
    const by = state.base.hitY + state.base.hitH / 2;
    const playerBaseDist = Math.hypot(pc.x - bx, pc.y - by) / TILE;
    if (distPlayer <= 2.2) return true;
    if (distBase <= 2.8 && playerBaseDist <= 2.4) return true;
    if (tank.kind === 'boss') return distPlayer <= 4.8 || (distBase <= 3.2 && playerBaseDist <= 3.0);
    if (tank.kind === 'heavy') return distPlayer <= 3.1;
    if (tank.kind === 'rocket') return distPlayer <= 2.7;
    return false;
  }

  function getEnemyStrafeDir(tank, shotDir, fallbackDir, dtScale) {
    if (!tank) return null;
    const lateral = (shotDir === 0 || shotDir === 2) ? [3, 1] : [0, 2];
    const back = (shotDir + 2) % 4;
    const candidates = [...lateral, back];
    const baseCx = state.base ? (state.base.hitX + state.base.hitW / 2) : (WORLD_W / 2);
    const baseCy = state.base ? (state.base.hitY + state.base.hitH / 2) : (WORLD_H / 2);
    let best = null;
    let bestScore = -Infinity;
    for (const dir of candidates) {
      if (!canMoveTank(tank, dir, dtScale)) continue;
      const nx = tank.x + DIRS[dir].x * TILE;
      const ny = tank.y + DIRS[dir].y * TILE;
      const curDist = Math.abs((tank.x + tank.w / 2) - baseCx) + Math.abs((tank.y + tank.h / 2) - baseCy);
      const nextDist = Math.abs((nx + tank.w / 2) - baseCx) + Math.abs((ny + tank.h / 2) - baseCy);
      let score = (curDist - nextDist) * 0.04;
      if (dir === back) score -= 0.45;
      if (dir === fallbackDir) score += 0.7;
      if (dir === tank.aiDir) score += 0.35;
      if (score > bestScore) {
        bestScore = score;
        best = dir;
      }
    }
    return best;
  }

  function computeScaling(level) {
    const playerTier = clamp(Math.floor((level - 1) / 45), 0, 7);
    const enemyTier = clamp(Math.floor((level - 1) / 30), 0, 11);
    const maxAlive = clamp(4 + Math.floor(level / 180), 4, 6);
    const totalEnemies = clamp(6 + Math.floor(level * 0.18), 6, 22);
    return { playerTier, enemyTier, maxAlive, totalEnemies };
  }

  function getPlayerAssist(level) {
    return {
      reserveLives: level >= 650 ? 5 : (level >= 260 ? 4 : 3),
      bonusHp: (level >= 180 ? 1 : 0) + (level >= 420 ? 1 : 0) + (level >= 760 ? 1 : 0),
      extraBullets: (level >= 220 ? 1 : 0) + (level >= 560 ? 1 : 0),
      bonusDmg: (level >= 240 ? 1 : 0) + (level >= 640 ? 1 : 0),
      bonusFireRate: (level >= 180 ? 0.008 : 0) + (level >= 420 ? 0.010 : 0) + (level >= 760 ? 0.010 : 0),
      bonusBulletSpeed: (level >= 180 ? 14 : 0) + (level >= 420 ? 18 : 0) + (level >= 760 ? 20 : 0),
      bonusSpeed: (level >= 240 ? 4 : 0) + (level >= 620 ? 4 : 0),
      startShieldMs: (level >= 180 ? 180 : 0) + (level >= 420 ? 220 : 0) + (level >= 760 ? 260 : 0),
      canBreakSteel: level >= 170
    };
  }

  function generateLevel(level) {
    const rng = makeRng(0x9E3779B9 ^ (level * 2654435761));
    const grid = Array.from({ length: GRID_H }, () => Array.from({ length: GRID_W }, () => TILE_EMPTY));

    // Border steel
    for (let x = 0; x < GRID_W; x++) {
      grid[0][x] = TILE_STEEL;
      grid[GRID_H - 1][x] = TILE_STEEL;
    }
    for (let y = 0; y < GRID_H; y++) {
      grid[y][0] = TILE_STEEL;
      grid[y][GRID_W - 1] = TILE_STEEL;
    }

    const baseTileX = Math.floor(GRID_W / 2) - 1;
    const baseTileY = GRID_H - 2;
    const base = {
      drawX: baseTileX * TILE,
      drawY: (baseTileY - 1) * TILE,
      drawW: TILE * 2,
      drawH: TILE * 2,
      hitX: baseTileX * TILE,
      hitY: baseTileY * TILE,
      hitW: TILE * 2,
      hitH: TILE
    };

    const playerSpawn = { tx: baseTileX + 0.5, ty: baseTileY - 3 };
    const enemySpawns = [
      { tx: 2, ty: 1 },
      { tx: Math.floor(GRID_W / 2), ty: 1 },
      { tx: GRID_W - 3, ty: 1 }
    ];

    const reserved = new Set();
    function reserve(tx, ty) { reserved.add(`${tx},${ty}`); }

    for (let yy = baseTileY - 2; yy <= baseTileY; yy++) {
      for (let xx = baseTileX - 2; xx <= baseTileX + 3; xx++) {
        if (xx < 1 || xx > GRID_W - 2 || yy < 1 || yy > GRID_H - 2) continue;
        reserve(xx, yy);
      }
    }
    const playerSpawnLeft = Math.floor(playerSpawn.tx);
    const playerSpawnRight = Math.ceil(playerSpawn.tx);
    for (let yy = playerSpawn.ty - 1; yy <= playerSpawn.ty + 1; yy++) {
      for (let xx = playerSpawnLeft - 1; xx <= playerSpawnRight + 1; xx++) reserve(xx, yy);
    }
    enemySpawns.forEach(sp => reserve(sp.tx, sp.ty));

    // Carve 2-3 clear lanes to keep levels playable.
    const laneCount = level < 12 ? 2 : (level < 80 ? 3 : (rng() < 0.5 ? 2 : 3));
    const laneKeep = new Set();
    for (let i = 0; i < laneCount; i++) {
      let x = 2 + Math.floor(rng() * (GRID_W - 4));
      for (let y = 1; y <= baseTileY - 1; y++) {
        laneKeep.add(`${x},${y}`);
        laneKeep.add(`${x - 1},${y}`);
        laneKeep.add(`${x + 1},${y}`);
        if (rng() < 0.35) x += rng() < 0.5 ? -1 : 1;
        x = clamp(x, 2, GRID_W - 3);
      }
    }

    function canPlaceBarrier(tx, ty) {
      return tx >= 1 && tx <= GRID_W - 2 &&
        ty >= 1 && ty <= GRID_H - 2 &&
        !reserved.has(`${tx},${ty}`) &&
        !laneKeep.has(`${tx},${ty}`);
    }

    function placeBarrier(tx, ty, tile) {
      if (!canPlaceBarrier(tx, ty)) return false;
      grid[ty][tx] = tile;
      return true;
    }

    // Base walls: bricks by default; later levels add more steel.
    const baseSteelChance = clamp((level - 120) / 500, 0, 0.75);
    const wallType = (rng() < baseSteelChance) ? TILE_STEEL : TILE_BRICK;
    const wall = (tx, ty) => { if (tx >= 1 && tx <= GRID_W - 2 && ty >= 1 && ty <= GRID_H - 2) grid[ty][tx] = wallType; };
    wall(baseTileX - 1, baseTileY);
    wall(baseTileX - 1, baseTileY - 1);
    wall(baseTileX - 1, baseTileY - 2);
    wall(baseTileX + 2, baseTileY);
    wall(baseTileX + 2, baseTileY - 1);
    wall(baseTileX + 2, baseTileY - 2);
    wall(baseTileX, baseTileY - 2);
    wall(baseTileX + 1, baseTileY - 2);
    wall(baseTileX, baseTileY - 1);
    wall(baseTileX + 1, baseTileY - 1);

    const density = clamp(0.23 + level * 0.00024, 0.23, 0.5);
    const pSteel = clamp(0.04 + level * 0.00009, 0.04, 0.14);
    const pWater = clamp(0.04 + level * 0.00006, 0.04, 0.10);
    const pGrass = clamp(0.06 + level * 0.00005, 0.06, 0.10);

    for (let y = 1; y < GRID_H - 1; y++) {
      for (let x = 1; x < GRID_W - 1; x++) {
        if (reserved.has(`${x},${y}`)) continue;
        if (laneKeep.has(`${x},${y}`)) continue;
        if (rng() > density) continue;
        const roll = rng();
        if (roll < pSteel) grid[y][x] = TILE_STEEL;
        else if (roll < pSteel + pWater) grid[y][x] = TILE_WATER;
        else if (roll < pSteel + pWater + pGrass) grid[y][x] = TILE_GRASS;
        else grid[y][x] = TILE_BRICK;
      }
    }

    // Clear spawn areas
    enemySpawns.forEach(sp => {
      for (let yy = sp.ty; yy <= sp.ty + 2; yy++) {
        for (let xx = sp.tx - 1; xx <= sp.tx + 1; xx++) {
          if (xx < 1 || xx > GRID_W - 2 || yy < 1 || yy > GRID_H - 2) continue;
          grid[yy][xx] = TILE_EMPTY;
        }
      }
    });

    // Bottom band: easier recovery.
    for (let y = GRID_H - 5; y < GRID_H - 1; y++) {
      for (let x = 1; x < GRID_W - 1; x++) {
        if (reserved.has(`${x},${y}`)) continue;
        if (rng() < 0.55) grid[y][x] = TILE_EMPTY;
      }
    }

    // Guaranteed defensive cover between the battlefield and the base, while keeping gaps for pathing.
    const steelBandChance = clamp((level - 140) / 420, 0, 0.42);
    const defenseRows = [
      { ty: baseTileY - 4, gapL: baseTileX - 1, gapR: baseTileX + 2, stride: 2, phase: 0 },
      { ty: baseTileY - 6, gapL: baseTileX - 2, gapR: baseTileX + 3, stride: 2, phase: 1 }
    ];
    defenseRows.forEach(row => {
      for (let x = 2; x <= GRID_W - 3; x++) {
        if (x >= row.gapL && x <= row.gapR) continue;
        if (((x + row.phase) % row.stride) !== 0) continue;
        const tile = rng() < steelBandChance ? TILE_STEEL : TILE_BRICK;
        placeBarrier(x, row.ty, tile);
      }
    });

    // Add a few extra obstacle clusters so enemies cannot easily get a straight line to the base.
    const extraBarrierBudget = 8 + Math.min(12, Math.floor(level / 60));
    for (let i = 0; i < extraBarrierBudget; i++) {
      const tx = 2 + Math.floor(rng() * (GRID_W - 4));
      const ty = 2 + Math.floor(rng() * Math.max(1, baseTileY - 4));
      const tile = rng() < steelBandChance * 0.7 ? TILE_STEEL : (rng() < 0.18 ? TILE_WATER : TILE_BRICK);
      if (!placeBarrier(tx, ty, tile)) continue;
      if (rng() < 0.5) placeBarrier(tx + (rng() < 0.5 ? -1 : 1), ty, tile === TILE_WATER ? TILE_BRICK : tile);
      if (rng() < 0.28) placeBarrier(tx, ty + 1, tile === TILE_WATER ? TILE_BRICK : tile);
    }

    return { grid, base, playerSpawn, enemySpawns };
  }

  function getTraversalCost(grid, tx, ty, canBreakSteel) {
    if (tx < 1 || tx >= GRID_W - 1 || ty < 1 || ty >= GRID_H - 1) return Infinity;
    const tile = grid[ty][tx];
    if (tile === TILE_WATER) return Infinity;
    if (tile === TILE_STEEL) return canBreakSteel ? 9 : Infinity;
    if (tile === TILE_BRICK) return 4;
    return 1;
  }

  function bfsDirToTargets(grid, fromTx, fromTy, targets, currentDir, canBreakSteel) {
    const dist = Array.from({ length: GRID_H }, () => Array.from({ length: GRID_W }, () => Infinity));
    const visited = Array.from({ length: GRID_H }, () => Array.from({ length: GRID_W }, () => false));

    for (const target of targets || []) {
      const cost = getTraversalCost(grid, target.tx, target.ty, canBreakSteel);
      if (!isFinite(cost)) continue;
      dist[target.ty][target.tx] = 0;
    }

    for (;;) {
      let bestX = -1;
      let bestY = -1;
      let bestDist = Infinity;
      for (let y = 1; y < GRID_H - 1; y++) {
        for (let x = 1; x < GRID_W - 1; x++) {
          if (visited[y][x] || dist[y][x] >= bestDist) continue;
          bestDist = dist[y][x];
          bestX = x;
          bestY = y;
        }
      }

      if (bestX < 0) break;
      visited[bestY][bestX] = true;

      for (let i = 0; i < 4; i++) {
        const nx = bestX + DIRS[i].x;
        const ny = bestY + DIRS[i].y;
        const stepCost = getTraversalCost(grid, nx, ny, canBreakSteel);
        if (!isFinite(stepCost)) continue;
        const nextDist = bestDist + stepCost;
        if (nextDist < dist[ny][nx]) dist[ny][nx] = nextDist;
      }
    }

    const cur = currentDir == null ? 2 : currentDir;
    const left = (cur + 3) % 4;
    const right = (cur + 1) % 4;
    const back = (cur + 2) % 4;
    const order = [cur, left, right, back, 0, 1, 2, 3];
    const seen = new Set();

    let bestDir = cur;
    let bestScore = Infinity;
    for (const dir of order) {
      if (seen.has(dir)) continue;
      seen.add(dir);
      const nx = fromTx + DIRS[dir].x;
      const ny = fromTy + DIRS[dir].y;
      const stepCost = getTraversalCost(grid, nx, ny, canBreakSteel);
      if (!isFinite(stepCost) || !isFinite(dist[ny][nx])) continue;
      const turnPenalty = dir === cur ? 0 : ((dir === left || dir === right) ? 0.18 : 0.35);
      const score = dist[ny][nx] + stepCost * 0.08 + turnPenalty;
      if (score < bestScore) {
        bestScore = score;
        bestDir = dir;
      }
    }

    return bestDir;
  }

  function makeTank(kind, x, y, dir, level) {
    const { playerTier, enemyTier } = computeScaling(level);
    const isPlayer = kind === 'player';
    const tier = isPlayer ? playerTier : enemyTier;
    const playerAssist = isPlayer ? getPlayerAssist(level) : null;
    const baseSpeed = isPlayer ? 92 : 62;
    const speed = baseSpeed
      + (isPlayer ? tier * 8 + (playerAssist ? playerAssist.bonusSpeed : 0) : tier * 3.4)
      + (kind === 'scout' ? 16 : kind === 'heavy' ? -14 : kind === 'boss' ? -6 : 0);
    const hp = isPlayer
      ? (1 + Math.floor(tier / 2) + (playerAssist ? playerAssist.bonusHp : 0))
      : (kind === 'heavy' ? (3 + Math.floor(tier / 3)) : kind === 'boss' ? (6 + Math.floor(tier / 2)) : 1 + Math.floor(tier / 4));
    const fireRate = isPlayer
      ? clamp(0.22 - tier * 0.012 - (playerAssist ? playerAssist.bonusFireRate : 0), 0.06, 0.28)
      : (kind === 'rocket' ? 1.18 : kind === 'scout' ? 0.98 : kind === 'heavy' ? 1.26 : kind === 'boss' ? 1.08 : 1.12);
    const bulletSpeed = (isPlayer ? 270 : 230)
      + tier * (isPlayer ? 18 : 12)
      + (isPlayer && playerAssist ? playerAssist.bonusBulletSpeed : 0)
      + (kind === 'rocket' ? 28 : 0);
    const bulletDmg = 1
      + (isPlayer ? Math.floor(tier / 3) + (playerAssist ? playerAssist.bonusDmg : 0) : Math.floor(tier / 5))
      + (kind === 'rocket' ? 1 : 0);
    const maxBullets = isPlayer
      ? clamp(1 + Math.floor(tier / 3) + (playerAssist ? playerAssist.extraBullets : 0), 1, 5)
      : 1;
    const canBreakSteel = isPlayer
      ? (tier >= 5 || (playerAssist && playerAssist.canBreakSteel))
      : (kind === 'rocket' || kind === 'boss');
    const shieldMs = isPlayer
      ? Math.max(0, 1200 - tier * 60) + (playerAssist ? playerAssist.startShieldMs : 0)
      : 0;

    return {
      id: nextTankId++,
      kind,
      x, y,
      w: 26, h: 26,
      dir,
      hp,
      maxHp: hp,
      speed,
      fireCd: 0,
      fireRate,
      bulletSpeed,
      bulletDmg,
      maxBullets,
      canBreakSteel,
      shieldUntil: shieldMs ? performance.now() + shieldMs : 0,
      aiDir: dir,
      aiNextRepath: 0,
      aiAttackHoldUntil: 0,
      aiPlayerAimDir: -1,
      aiPlayerAimReadyAt: 0,
      aiPlayerAimLockAt: 0,
      aiIgnorePlayerUntil: 0,
      aiManeuverDir: -1,
      aiManeuverUntil: 0,
      aiBlockedCount: 0,
      aiGridKey: '',
      dead: false
    };
  }

  function addExplosion(x, y, scale, tint) {
    state.fx.push({ x, y, t: 0, life: 0.35, scale: scale || 1, tint: tint || '#fbbf24' });
  }

  function dropPowerup(x, y) {
    const rng = makeRng((state.level * 1337) ^ ((state.score + 1) * 17));
    if (rng() > 0.22) return;
    const roll = rng();
    const type = roll < 0.45 ? 'star' : (roll < 0.72 ? 'shield' : 'bomb');
    state.powerups.push({ type, x: clamp(x, 18, WORLD_W - 18), y: clamp(y, 18, WORLD_H - 18), t: 0, ttl: 11 });
  }

  function applyPowerup(type) {
    const p = state.player;
    if (!p) return;
    if (type === 'star') {
      p.fireRate = Math.max(0.08, p.fireRate * 0.82);
      p.canBreakSteel = true;
      p.bulletSpeed += 26;
      p.bulletDmg += 1;
      p.shieldUntil = Math.max(p.shieldUntil, performance.now() + 1200);
    } else if (type === 'shield') {
      p.shieldUntil = performance.now() + 4500;
    } else if (type === 'bomb') {
      state.enemies.forEach(e => {
        if (e.dead) return;
        e.dead = true;
        state.score += 70;
        addExplosion(e.x + e.w / 2, e.y + e.h / 2, 1.15, '#fb7185');
      });
    }
  }

  function shootTank(tank, owner) {
    if (tank.fireCd > 0) return false;
    const sameOwnerBullets = state.bullets.filter(b => !b.dead && b.owner === owner).length;
    const ownActiveBullets = state.bullets.filter(b => !b.dead && b.sourceId === tank.id).length;
    if (owner === 'player' && sameOwnerBullets >= tank.maxBullets) return false;
    if (owner === 'enemy') {
      const aliveEnemies = state.enemies.filter(e => !e.dead).length;
      const maxEnemyBullets = Math.min(5, Math.max(2, Math.ceil(aliveEnemies * 0.65)));
      if (sameOwnerBullets >= maxEnemyBullets || ownActiveBullets >= 1) return false;
    }
    const d = DIRS[tank.dir];
    const bx = tank.x + tank.w / 2 + d.x * 16;
    const by = tank.y + tank.h / 2 + d.y * 16;
    state.bullets.push({
      sourceId: tank.id,
      x: bx,
      y: by,
      prevX: bx,
      prevY: by,
      vx: d.x * tank.bulletSpeed,
      vy: d.y * tank.bulletSpeed,
      r: owner === 'player' ? 3.4 : 5.2,
      dmg: tank.bulletDmg,
      canBreakSteel: !!tank.canBreakSteel,
      owner,
      dead: false
    });
    tank.fireCd = tank.fireRate;
    return true;
  }

  function getInitialLives(level) {
    return getPlayerAssist(level).reserveLives;
  }

  function resetRun(startLevel) {
    state.level = clamp(startLevel, 1, MAX_LEVEL);
    state.selectedLevel = state.level;
    state.score = 0;
    state.lives = getInitialLives(state.level);
    loadLevel(state.level);
  }

  function previewSelectedLevel(level) {
    const target = clamp(level, 1, MAX_LEVEL);
    running = false;
    state.score = 0;
    state.lives = getInitialLives(target);
    loadLevel(target);
    syncHud();
    syncActionButton();
    drawFrame(performance.now());
    try { container.focus(); } catch (_) {}
  }

  function syncPlayerLifeBinding() {
    const player = state.player;
    if (!player || player.dead) return;
    const lives = Math.max(0, state.lives | 0);
    // The player's body number should mirror the HUD life counter exactly.
    player.hp = lives;
    player.maxHp = Math.max(1, lives, getPlayerAssist(state.level).reserveLives);
  }

  function spawnEnemy(now) {
    if (state.spawnLeft <= 0) return;
    const { maxAlive, enemyTier } = computeScaling(state.level);
    if (state.enemies.filter(e => !e.dead).length >= maxAlive) return;
    if (state.spawnCooldown > now) return;
    if (!state.enemySpawns || !state.enemySpawns.length) return;

    const rng = makeRng(0xDEADBEEF ^ (state.level * 19937) ^ (state.spawnLeft * 8191));
    const sp = state.enemySpawns[Math.floor(rng() * state.enemySpawns.length)];

    let kind = 'soldier';
    const roll = rng();
    if (enemyTier < 2) kind = roll < 0.7 ? 'soldier' : 'scout';
    else if (enemyTier < 5) kind = roll < 0.55 ? 'soldier' : (roll < 0.8 ? 'scout' : 'heavy');
    else if (enemyTier < 8) kind = roll < 0.45 ? 'soldier' : (roll < 0.72 ? 'heavy' : 'rocket');
    else kind = roll < 0.4 ? 'heavy' : (roll < 0.78 ? 'rocket' : 'boss');

    const e = makeTank(kind, sp.tx * TILE + 3, sp.ty * TILE + 3, 2, state.level);
    e.aiDir = 2;
    state.enemies.push(e);
    state.spawnLeft--;
    state.spawnCooldown = now + 600 + rng() * 380;
  }

  function syncHud() {
    syncPlayerLifeBinding();
    levelEl.textContent = String(state.level);
    scoreEl.textContent = String(state.score);
    livesEl.textContent = String(state.lives);
    if (levelSelect) levelSelect.value = String(state.selectedLevel);
  }

  function getActionButtonMode() {
    if (state.won) return state.level < MAX_LEVEL ? 'next' : 'restart';
    if (state.lost) return 'restart';
    if (running) return 'stop';
    return 'start';
  }

  function getActionButtonText(mode) {
    const action = mode || getActionButtonMode();
    if (action === 'next') return (typeof t === 'function' ? t('nextLevelLabel') : 'Next');
    if (action === 'restart') return (typeof t === 'function' ? t('restartGame') : 'Restart');
    if (action === 'stop') return (typeof t === 'function' ? t('stopGame') : 'Stop Game');
    return (typeof t === 'function' ? t('startGame') : 'Start');
  }

  function syncActionButton() {
    if (!startBtn) return;
    const mode = getActionButtonMode();
    startBtn.dataset.mode = mode;
    startBtn.textContent = getActionButtonText(mode);
  }

  function openStopConfirm() {
    if (window.StarGameKit && StarGameKit.confirmStopGame) {
      StarGameKit.confirmStopGame({ root: container, onConfirm: stopTankGame });
      return;
    }
    const title = typeof t === 'function' ? t('confirmStopGameTitle') : 'Stop the current game?';
    const desc = typeof t === 'function' ? t('confirmStopGameDesc') : 'Current game progress will be lost. Please confirm again.';
    if (window.StarDialog && typeof window.StarDialog.confirm === 'function') {
      window.StarDialog.confirm({
        title,
        message: desc,
        okText: typeof t === 'function' ? t('stopGame') : 'Stop Game',
        cancelText: typeof t === 'function' ? t('cancel') : 'Cancel'
      }).then(ok => {
        if (ok) stopTankGame();
      });
    }
  }

  function drawBackground() {
    const bg = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    bg.addColorStop(0, '#0b1220');
    bg.addColorStop(1, '#070a12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }

  function update(dt, now) {
    if (!state.grid || !state.player || state.won || state.lost) return;

    const p = state.player;
    p.fireCd = Math.max(0, p.fireCd - dt);

    spawnEnemy(now);

    // Player movement
    let moveX = 0, moveY = 0;
    if (keys.ArrowUp || keys.KeyW) { moveY = -1; p.dir = 0; }
    else if (keys.ArrowDown || keys.KeyS) { moveY = 1; p.dir = 2; }
    else if (keys.ArrowLeft || keys.KeyA) { moveX = -1; p.dir = 3; }
    else if (keys.ArrowRight || keys.KeyD) { moveX = 1; p.dir = 1; }

    if (moveX || moveY) {
      const nx = p.x + moveX * p.speed * dt;
      const ny = p.y + moveY * p.speed * dt;
      const rect = { x: nx, y: ny, w: p.w, h: p.h };
      const baseBlock = { x: state.base.hitX, y: state.base.hitY - TILE, w: state.base.hitW, h: state.base.hitH + TILE * 2 };
      if (!collidesWithMap(state.grid, rect) && !rectsOverlap(rect, baseBlock)) {
        p.x = nx;
        p.y = ny;
      }
    }

    // Hold Space to fire
    if (keys.Space) shootTank(p, 'player');

    // Enemies: deterministic assault AI with lane alignment + base breach targets.
    const dtScale = Math.min(dt, 0.03);
    const assaultTargets = getBaseAssaultTargets();
    const assaultKeys = assaultTargetKeySet(assaultTargets);

    for (const e of state.enemies) {
      if (e.dead) continue;
      e.fireCd = Math.max(0, e.fireCd - dt);

      const { tx, ty } = getTankGridPos(e);
      const gridKey = `${tx}:${ty}`;
      const inAssaultLane = assaultKeys.has(gridKey);
      const assaultDir = inAssaultLane ? getBaseAssaultDir(tx, ty) : null;

      let desiredDir = e.aiDir;
      let shouldFire = false;
      let holdPosition = false;
      let fireReason = '';
      if (e.aiManeuverUntil <= now) clearEnemyManeuver(e);
      const maneuverActive = e.aiManeuverUntil > now && e.aiManeuverDir >= 0;

      const currentShot = scanShotLine(e, e.dir);
      const currentShotBreakable = currentShot.tile === TILE_BRICK || (currentShot.tile === TILE_STEEL && e.canBreakSteel);
      if (e.aiAttackHoldUntil > now && (currentShot.hitsBase || currentShotBreakable)) {
        clearEnemyPlayerAim(e);
        clearEnemyManeuver(e);
        desiredDir = e.dir;
        shouldFire = true;
        holdPosition = true;
      } else if (maneuverActive) {
        clearEnemyPlayerAim(e);
        desiredDir = e.aiManeuverDir;
        shouldFire = false;
        holdPosition = false;
      } else {
        e.aiAttackHoldUntil = 0;

        let playerShotDir = getPlayerShotDir(e, p);
        const playerDist = playerShotDir != null ? getTankDistanceTiles(e, p) : Infinity;
        const emergencyPlayerThreat = playerShotDir != null && playerDist <= 2.15;
        if (playerShotDir != null && e.aiIgnorePlayerUntil > now && !emergencyPlayerThreat) playerShotDir = null;
        if (playerShotDir != null) {
          const commitPlayer = shouldEnemyCommitToPlayer(e, p);
          const allowPressureShot = playerDist <= 2.75;
          const flankDir = commitPlayer ? null : getEnemyStrafeDir(e, playerShotDir, e.aiDir, dtScale);
          const readyToFire = (commitPlayer || allowPressureShot) ? shouldEnemyFireAtPlayer(e, playerShotDir, now) : false;
          if (commitPlayer) {
            clearEnemyManeuver(e);
            desiredDir = playerShotDir;
            shouldFire = readyToFire;
            holdPosition = commitPlayer && (playerDist <= 3.6 || e.aiPlayerAimReadyAt > now || getEnemyBaseDistanceTiles(e) <= 4.5);
            fireReason = 'player';
          } else if (allowPressureShot && readyToFire) {
            clearEnemyManeuver(e);
            desiredDir = playerShotDir;
            shouldFire = true;
            holdPosition = false;
            fireReason = 'player';
          } else {
            clearEnemyPlayerAim(e);
            e.aiIgnorePlayerUntil = now + 900;
            const maneuverDir = flankDir != null ? flankDir : e.aiDir;
            beginEnemyManeuver(e, maneuverDir, now, 560);
            desiredDir = maneuverDir;
            shouldFire = false;
            holdPosition = false;
            fireReason = '';
            e.aiNextRepath = 0;
          }
        } else {
          clearEnemyPlayerAim(e);
          const baseShotDir = getBaseShotDir(e);
          if (baseShotDir != null) {
            clearEnemyManeuver(e);
            desiredDir = baseShotDir;
            shouldFire = true;
            holdPosition = true;
            fireReason = 'base';
          } else if (assaultDir != null) {
            const assaultShot = scanShotLine(e, assaultDir);
            const assaultBreakable = assaultShot.tile === TILE_BRICK || (assaultShot.tile === TILE_STEEL && e.canBreakSteel);
            if (assaultShot.hitsBase || assaultBreakable) {
              clearEnemyManeuver(e);
              desiredDir = assaultDir;
              shouldFire = true;
              holdPosition = true;
              e.aiAttackHoldUntil = now + 780;
              fireReason = 'assault';
            } else if (assaultShot.tile === TILE_STEEL || assaultShot.tile === TILE_WATER) {
              e.aiNextRepath = 0;
            }
          }

          if (!shouldFire) {
            if (e.aiNextRepath <= now || e.aiGridKey !== gridKey || e.aiBlockedCount >= 2) {
              e.aiDir = bfsDirToTargets(state.grid, tx, ty, assaultTargets, e.aiDir, e.canBreakSteel);
              e.aiNextRepath = now + 210 + e.aiBlockedCount * 90;
            }
            desiredDir = e.aiDir;

            const routeShot = scanShotLine(e, desiredDir);
            const routeBreakable = routeShot.tile === TILE_BRICK || (routeShot.tile === TILE_STEEL && e.canBreakSteel);
            if (routeBreakable && routeShot.dist <= TILE * 1.6) {
              shouldFire = true;
              holdPosition = true;
              e.aiAttackHoldUntil = now + 620;
              fireReason = 'route';
            }
          }
        }
      }

      e.aiDir = desiredDir;
      e.dir = desiredDir;
      e.aiGridKey = gridKey;

      if (shouldFire) {
        e.aiBlockedCount = 0;
        const fired = shootTank(e, 'enemy');
        if (fired && fireReason === 'player') clearEnemyPlayerAim(e);
        if (holdPosition) continue;
      }

      const beforeAlignX = e.x;
      const beforeAlignY = e.y;
      const aligned = alignTankToLane(e, desiredDir, dtScale);
      if (!aligned) {
        if (Math.abs(e.x - beforeAlignX) < 0.05 && Math.abs(e.y - beforeAlignY) < 0.05) {
          e.aiBlockedCount++;
          if (maneuverActive && e.aiBlockedCount >= 2) clearEnemyManeuver(e);
          if (e.aiBlockedCount >= 3) {
            const turn = pickTurnDir(e, desiredDir, dtScale);
            if (turn != null && turn !== desiredDir) {
              e.aiDir = turn;
              e.dir = turn;
              e.aiNextRepath = 0;
            }
          }
        } else {
          e.aiBlockedCount = 0;
        }
        continue;
      }

      if (holdPosition) continue;

      const d = DIRS[desiredDir];
      const moved = tryMoveTankTo(e, e.x + d.x * e.speed * dt, e.y + d.y * e.speed * dt);
      if (moved) {
        e.aiBlockedCount = 0;
        continue;
      }

      const frontInfo = getFrontTileInfo(e, desiredDir);
      const frontBreakable = frontInfo.tile === TILE_BRICK || (frontInfo.tile === TILE_STEEL && e.canBreakSteel);
      if (frontBreakable) {
        clearEnemyManeuver(e);
        e.aiAttackHoldUntil = now + 680;
        e.aiBlockedCount = 0;
        shootTank(e, 'enemy');
        continue;
      }

      e.aiBlockedCount++;
      if (maneuverActive && e.aiBlockedCount >= 2) clearEnemyManeuver(e);
      const turn = pickTurnDir(e, desiredDir, dtScale);
      if (turn != null && turn !== desiredDir) {
        e.aiDir = turn;
        e.dir = turn;
        e.aiNextRepath = now + 120;
      } else {
        e.aiNextRepath = 0;
      }
    }

    // Bullets
    const baseDamageRect = getBaseDamageRect();
    for (const b of state.bullets) {
      if (b.dead) continue;
      b.prevX = b.x;
      b.prevY = b.y;
      const travel = Math.max(Math.abs(b.vx * dt), Math.abs(b.vy * dt));
      const steps = Math.max(1, Math.ceil(travel / 2.5));
      const stepDt = dt / steps;

      for (let step = 0; step < steps && !b.dead; step++) {
        const stepPrevX = b.x;
        const stepPrevY = b.y;
        b.x += b.vx * stepDt;
        b.y += b.vy * stepDt;

        for (const other of state.bullets) {
          if (!other || other === b || other.dead || other.owner === b.owner) continue;
          const otherPrevX = other.prevX == null ? other.x : other.prevX;
          const otherPrevY = other.prevY == null ? other.y : other.prevY;
          if (!segmentsNear(stepPrevX, stepPrevY, b.x, b.y, otherPrevX, otherPrevY, other.x, other.y, b.r + other.r + 1.2)) continue;
          b.dead = true;
          other.dead = true;
          addExplosion((b.x + other.x) / 2, (b.y + other.y) / 2, 0.55, '#fde68a');
          break;
        }
        if (b.dead) break;

        // IMPORTANT: don't let bullets go out of the grid and then try to write grid[ty][tx],
        // otherwise an out-of-range ty can throw and freeze the whole game.
        if (b.x < -20 || b.y < -20 || b.x > WORLD_W + 20 || b.y > WORLD_H + 20) { b.dead = true; break; }
        const tx = Math.floor(b.x / TILE);
        const ty = Math.floor(b.y / TILE);
        if (tx < 0 || tx >= GRID_W || ty < 0 || ty >= GRID_H) { b.dead = true; break; }

        const t = tileAt(state.grid, b.x, b.y);
        if (t === TILE_BRICK) {
          const hitPerimeter = isPerimeterTile(tx, ty);
          // Safety: player's bullets won't accidentally open the base fortress area.
          const baseTx = Math.floor(state.base.hitX / TILE);
          const baseTy = Math.floor(state.base.hitY / TILE);
          const inBaseFortress = (tx >= baseTx - 1 && tx <= baseTx + 2 && ty >= baseTy - 2 && ty <= baseTy);
          if (!hitPerimeter && !(b.owner === 'player' && inBaseFortress)) state.grid[ty][tx] = TILE_EMPTY;
          b.dead = true;
          addExplosion(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 0.75, '#fb923c');
          break;
        }
        if (t === TILE_STEEL) {
          const hitPerimeter = isPerimeterTile(tx, ty);
          const baseTx = Math.floor(state.base.hitX / TILE);
          const baseTy = Math.floor(state.base.hitY / TILE);
          const inBaseFortress = (tx >= baseTx - 1 && tx <= baseTx + 2 && ty >= baseTy - 2 && ty <= baseTy);
          if (b.owner === 'player' && inBaseFortress) {
            b.dead = true;
            break;
          }
          if (!hitPerimeter && b.canBreakSteel) {
            state.grid[ty][tx] = TILE_EMPTY;
            addExplosion(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 0.9, '#a3b3c9');
          }
          b.dead = true;
          break;
        }
        if (t === TILE_WATER) { b.dead = true; break; }

        // Base hit: player's bullets are safe, enemy bullets can destroy the core once it is exposed.
        if (segmentRectOverlap(stepPrevX, stepPrevY, b.x, b.y, baseDamageRect, b.r + 2)) {
          b.dead = true;
          if (b.owner === 'enemy') {
            addExplosion(state.base.hitX + state.base.hitW / 2, state.base.hitY + state.base.hitH / 2, 1.6, '#fb7185');
            state.lost = true;
            running = false;
            syncActionButton();
          }
          break;
        }

        if (b.owner === 'player') {
          for (const e of state.enemies) {
            if (e.dead) continue;
            if (segmentRectOverlap(stepPrevX, stepPrevY, b.x, b.y, e, b.r + 1.6)) {
              b.dead = true;
              e.hp -= b.dmg;
              addExplosion(b.x, b.y, 0.75, '#fca5a5');
              if (e.hp <= 0) {
                e.dead = true;
                state.score += 60 + Math.floor(state.level / 8);
                addExplosion(e.x + e.w / 2, e.y + e.h / 2, 1.15, '#fb7185');
                dropPowerup(e.x + e.w / 2, e.y + e.h / 2);
              }
              break;
            }
          }
        } else {
          const player = state.player;
          if (player && segmentRectOverlap(stepPrevX, stepPrevY, b.x, b.y, player, b.r + 1.8)) {
            b.dead = true;
            if (now < player.shieldUntil) {
              addExplosion(b.x, b.y, 0.7, '#93c5fd');
            } else {
              addExplosion(b.x, b.y, 0.9, '#fb7185');
              state.lives--;
              syncPlayerLifeBinding();
              if (state.lives <= 0) {
                state.lost = true;
                running = false;
                syncActionButton();
              } else {
                const sp = state.playerSpawn;
                state.player = makeTank('player', sp.tx * TILE + 3, sp.ty * TILE + 3, 0, state.level);
                syncPlayerLifeBinding();
              }
            }
          }
        }
      }
    }
    state.bullets = state.bullets.filter(b => !b.dead);

    // Powerups + FX
    for (const pu of state.powerups) {
      pu.t += dt;
      pu.ttl -= dt;
      if (pu.ttl <= 0) pu.dead = true;
      if (!pu.dead) {
        const p = state.player;
        if (p && Math.hypot((p.x + p.w / 2) - pu.x, (p.y + p.h / 2) - pu.y) < 18) {
          pu.dead = true;
          applyPowerup(pu.type);
        }
      }
    }
    state.powerups = state.powerups.filter(pu => !pu.dead);

    for (const fx of state.fx) fx.t += dt;
    state.fx = state.fx.filter(fx => fx.t < fx.life);

    if (state.spawnLeft <= 0 && state.enemies.every(e => e.dead)) {
      state.won = true;
      running = false;
      state.selectedLevel = state.level < MAX_LEVEL ? state.level + 1 : state.level;
      syncActionButton();
    }
  }

  function goNextLevelFromWin() {
    if (!state.won) return;
    const next = state.level < MAX_LEVEL ? state.level + 1 : state.level;
    // Preserve score/lives, only advance the stage.
    state.lives = Math.max(state.lives, getPlayerAssist(next).reserveLives);
    loadLevel(next);
    running = true;
    syncActionButton();
    try { container.focus(); } catch (_) {}
  }

  function restartCurrentLevel() {
    resetRun(state.level);
    running = true;
    syncActionButton();
    try { container.focus(); } catch (_) {}
  }

  function drawTileBrick(x, y) {
    const g = ctx.createLinearGradient(x, y, x + TILE, y + TILE);
    g.addColorStop(0, '#b65a44');
    g.addColorStop(1, '#6e2f22');
    ctx.fillStyle = g;
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    for (let yy = y + 8; yy < y + TILE - 6; yy += 10) {
      ctx.beginPath();
      ctx.moveTo(x + 6, yy);
      ctx.lineTo(x + TILE - 6, yy);
      ctx.stroke();
    }
  }

  function drawTileSteel(x, y) {
    const g = ctx.createLinearGradient(x, y, x + TILE, y + TILE);
    g.addColorStop(0, '#7f93aa');
    g.addColorStop(1, '#3b4a5e');
    ctx.fillStyle = g;
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = 'rgba(15,23,42,0.5)';
    for (const p of [[x + 8, y + 8], [x + TILE - 8, y + 8], [x + 8, y + TILE - 8], [x + TILE - 8, y + TILE - 8]]) {
      ctx.beginPath();
      ctx.arc(p[0], p[1], 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTileWater(x, y, now) {
    const g = ctx.createLinearGradient(x, y, x, y + TILE);
    g.addColorStop(0, '#0ea5e9');
    g.addColorStop(1, '#0369a1');
    ctx.fillStyle = g;
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = 'rgba(224,242,254,0.5)';
    ctx.lineWidth = 1.2;
    for (let yy = y + 8; yy < y + TILE; yy += 9) {
      ctx.beginPath();
      const phase = (now / 190) + yy * 0.2;
      for (let xx = x + 2; xx <= x + TILE - 2; xx += 3) {
        const yyy = yy + Math.sin((xx * 0.22) + phase) * 1.2;
        if (xx === x + 2) ctx.moveTo(xx, yyy);
        else ctx.lineTo(xx, yyy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawTileGrass(x, y, now) {
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = 'rgba(22,163,74,0.35)';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(34,197,94,0.55)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) {
      const xx = x + 4 + ((i * 17) % (TILE - 8));
      const h = 6 + ((i * 13) % 10);
      const sway = Math.sin((now / 260) + i) * 2.0;
      ctx.beginPath();
      ctx.moveTo(xx, y + TILE - 4);
      ctx.quadraticCurveTo(xx + sway, y + TILE - 10 - h, xx + sway * 0.7, y + TILE - 8);
      ctx.stroke();
    }
  }

  function drawBase(base) {
    if (!base) return;
    const x = base.drawX;
    const y = base.drawY;
    const g = ctx.createLinearGradient(x, y, x, y + TILE * 2);
    g.addColorStop(0, '#fbbf24');
    g.addColorStop(1, '#b45309');
    ctx.fillStyle = g;
    ctx.fillRect(x + 6, y + 6, TILE * 2 - 12, TILE * 2 - 12);
    ctx.strokeStyle = 'rgba(15,23,42,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 6, y + 6, TILE * 2 - 12, TILE * 2 - 12);
    ctx.fillStyle = 'rgba(15,23,42,0.45)';
    ctx.fillRect(x + 14, y + 18, TILE * 2 - 28, TILE * 2 - 30);

    ctx.save();
    ctx.translate(x + TILE, y + TILE);
    const eg = ctx.createRadialGradient(-6, -8, 2, 0, 0, 26);
    eg.addColorStop(0, '#f8fafc');
    eg.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-6, -2, 4, 0, Math.PI * 2);
    ctx.arc(6, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBullets() {
    for (const b of state.bullets) {
      const prevX = b.prevX == null ? b.x : b.prevX;
      const prevY = b.prevY == null ? b.y : b.prevY;
      const dx = b.x - prevX;
      const dy = b.y - prevY;
      const lenBase = Math.hypot(dx, dy) || 1;
      const tailLen = Math.max(b.owner === 'player' ? 8 : 12, lenBase * (b.owner === 'player' ? 2.2 : 2.8));
      const tailX = (dx / lenBase) * tailLen;
      const tailY = (dy / lenBase) * tailLen;

      ctx.strokeStyle = b.owner === 'player' ? 'rgba(253,224,71,0.88)' : 'rgba(255,241,242,0.96)';
      ctx.lineWidth = b.owner === 'player' ? 2.8 : 4.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x - tailX, b.y - tailY);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      const glow = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.owner === 'player' ? 12 : 16);
      glow.addColorStop(0, b.owner === 'player' ? 'rgba(250,204,21,0.98)' : 'rgba(255,99,132,1)');
      glow.addColorStop(0.45, b.owner === 'player' ? 'rgba(251,191,36,0.55)' : 'rgba(254,205,211,0.42)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.owner === 'player' ? 11 : 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = b.owner === 'player' ? '#fde047' : '#fb7185';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.owner === 'player' ? Math.max(b.r, 3.4) : Math.max(b.r, 5.1), 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = b.owner === 'player' ? 'rgba(120,53,15,0.78)' : 'rgba(127,29,29,0.92)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  function drawTank(tank, now) {
    if (!tank || tank.dead) return;
    const isPlayer = tank.kind === 'player';
    const tier = isPlayer ? computeScaling(state.level).playerTier : computeScaling(state.level).enemyTier;
    const body1 = isPlayer ? '#60a5fa'
      : (tank.kind === 'scout' ? '#fb7185' : tank.kind === 'heavy' ? '#a3e635' : tank.kind === 'rocket' ? '#e879f9' : tank.kind === 'boss' ? '#facc15' : '#f97316');
    const body2 = isPlayer ? '#1d4ed8'
      : (tank.kind === 'scout' ? '#be123c' : tank.kind === 'heavy' ? '#4d7c0f' : tank.kind === 'rocket' ? '#a21caf' : tank.kind === 'boss' ? '#a16207' : '#c2410c');
    const edge = 'rgba(15,23,42,0.65)';

    const cx = tank.x + tank.w / 2;
    const cy = tank.y + tank.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((tank.dir * Math.PI) / 2);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // treads
    ctx.fillStyle = '#0b1220';
    ctx.strokeStyle = 'rgba(248,250,252,0.12)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-20, -18, 14, 36);
    ctx.fillRect(6, -18, 14, 36);
    ctx.strokeRect(-20, -18, 14, 36);
    ctx.strokeRect(6, -18, 14, 36);

    // body
    const g = ctx.createLinearGradient(-16, -18, 16, 18);
    g.addColorStop(0, body1);
    g.addColorStop(1, body2);
    ctx.fillStyle = g;
    ctx.fillRect(-18, -16, 36, 40);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2.2;
    ctx.strokeRect(-18, -16, 36, 40);

    // turret
    ctx.fillStyle = 'rgba(15,23,42,0.18)';
    ctx.beginPath();
    ctx.arc(0, -2, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // barrel
    const barrelL = 22 + tier * 2;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-4, -18 - barrelL, 8, barrelL);
    ctx.strokeRect(-4, -18 - barrelL, 8, barrelL);
    if (tier >= 4) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 120);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, -18 - barrelL, 8 + pulse * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Enemy tanks show current HP; the player tank mirrors the HUD life counter.
    const hpText = String(Math.max(0, tank.hp | 0));
    const hpLow = tank.hp <= Math.max(1, Math.ceil(tank.maxHp * 0.34));
    ctx.fillStyle = hpLow ? '#fee2e2' : 'rgba(248,250,252,0.92)';
    ctx.strokeStyle = 'rgba(15,23,42,0.72)';
    ctx.lineWidth = 2.2;
    ctx.font = `900 ${hpText.length >= 2 ? 10 : 12}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(hpText, 0, 12);
    ctx.fillText(hpText, 0, 12);

    ctx.restore();

    if (!isPlayer && tank.aiPlayerAimDir >= 0 && tank.aiPlayerAimLockAt > now) {
      const d = DIRS[tank.aiPlayerAimDir];
      const remain = Math.max(0, tank.aiPlayerAimReadyAt - now);
      const total = Math.max(1, getEnemyPlayerAimDelay(tank));
      const progress = clamp(1 - remain / total, 0, 1);
      const lineLen = TILE * (2.4 + progress * 6.2);
      const muzzleX = cx + d.x * 26;
      const muzzleY = cy + d.y * 26;
      const endX = muzzleX + d.x * lineLen;
      const endY = muzzleY + d.y * lineLen;
      const pulse = 0.45 + 0.55 * Math.sin(now / 70 + tank.id);
      ctx.save();
      ctx.strokeStyle = `rgba(251, 113, 133, ${0.22 + progress * 0.38 + pulse * 0.12})`;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = -(now / 28);
      ctx.beginPath();
      ctx.moveTo(muzzleX, muzzleY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(254, 205, 211, ${0.38 + progress * 0.28})`;
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 5 + pulse * 3 + progress * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // shield ring
    if (isPlayer && performance.now() < tank.shieldUntil) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 120);
      ctx.save();
      ctx.globalAlpha = 0.35 + pulse * 0.2;
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 18 + pulse * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawFrame(now) {
    drawBackground();

    // subtle grid
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    for (let y = 0; y <= WORLD_H; y += TILE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke(); }
    for (let x = 0; x <= WORLD_W; x += TILE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke(); }
    ctx.globalAlpha = 1;

    if (!state.grid) return;

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const t = state.grid[y][x];
        const px = x * TILE;
        const py = y * TILE;
        if (t === TILE_BRICK) drawTileBrick(px, py);
        else if (t === TILE_STEEL) drawTileSteel(px, py);
        else if (t === TILE_WATER) drawTileWater(px, py, now);
      }
    }

    drawBase(state.base);

    drawTank(state.player, now);
    state.enemies.forEach(e => drawTank(e, now));

    // powerups
    for (const pu of state.powerups) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 160 + pu.x * 0.01);
      ctx.save();
      ctx.translate(pu.x, pu.y);
      const r = 12 + pulse * 1.2;
      const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, r);
      if (pu.type === 'star') { g.addColorStop(0, '#fef08a'); g.addColorStop(1, '#f59e0b'); }
      else if (pu.type === 'shield') { g.addColorStop(0, '#93c5fd'); g.addColorStop(1, '#1d4ed8'); }
      else { g.addColorStop(0, '#fecaca'); g.addColorStop(1, '#be123c'); }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(15,23,42,0.85)';
      ctx.font = '900 12px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pu.type === 'star' ? '★' : (pu.type === 'shield' ? '⛨' : '✹'), 0, 1);
      ctx.restore();
    }

    // grass overlay
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (state.grid[y][x] !== TILE_GRASS) continue;
        drawTileGrass(x * TILE, y * TILE, now);
      }
    }

    drawBullets();

    // explosions
    for (const fx of state.fx) {
      const p = clamp(fx.t / fx.life, 0, 1);
      const r = (10 + 32 * p) * fx.scale;
      const a = 1 - p;
      ctx.save();
      ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(fx.x, fx.y, 2, fx.x, fx.y, r);
      g.addColorStop(0, fx.tint);
      g.addColorStop(0.4, 'rgba(250,204,21,0.35)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // end overlay
    if (state.won || state.lost) {
      ctx.save();
      ctx.fillStyle = 'rgba(2,6,23,0.72)';
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 26px system-ui, -apple-system, Segoe UI, sans-serif';
      const msg = state.won
        ? (typeof t === 'function' ? t('tankWin', '胜利') : 'Victory')
        : (typeof t === 'function' ? t('tankLose', '失败') : 'Defeat');
      ctx.fillText(msg, WORLD_W / 2, WORLD_H / 2 - 10);
      ctx.font = '600 12px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillStyle = 'rgba(248,250,252,0.8)';
      ctx.fillText((typeof t === 'function' ? t('level') : 'Level') + ': ' + state.level, WORLD_W / 2, WORLD_H / 2 + 20);
      ctx.restore();
    }
  }

  function loadLevel(level) {
    state.level = clamp(level, 1, MAX_LEVEL);
    state.selectedLevel = state.level;
    persistLevel(state.level);

    state.won = false;
    state.lost = false;
    state.enemies.length = 0;
    state.bullets.length = 0;
    state.powerups.length = 0;
    state.fx.length = 0;

    const gen = generateLevel(state.level);
    state.grid = gen.grid;
    state.base = gen.base;
    state.playerSpawn = gen.playerSpawn;
    state.enemySpawns = gen.enemySpawns;

    const sp = state.playerSpawn;
    state.player = makeTank('player', sp.tx * TILE + 3, sp.ty * TILE + 3, 0, state.level);
    syncPlayerLifeBinding();

    const { totalEnemies } = computeScaling(state.level);
    state.spawnLeft = totalEnemies;
    state.spawnCooldown = performance.now() + 600;
  }

  function tick(ts) {
    if (!raf) return;
    lastLoopAt = performance.now();
    if (!lastTs) lastTs = ts;
    const dt = clamp((ts - lastTs) / 1000, 0, 0.05);
    lastTs = ts;
    const now = performance.now();
    if (running) update(dt, now);
    drawFrame(now);
    syncHud();
    raf = requestAnimationFrame(tick);
  }

  function startFromSelection() {
    const v = Number(levelSelect.value || state.selectedLevel);
    const target = clamp(isFinite(v) ? Math.floor(v) : state.selectedLevel, 1, MAX_LEVEL);
    resetRun(target);
    running = true;
    syncActionButton();
    container.focus();
  }

  function stopTankGame() {
    running = false;
    syncActionButton();
    // Avoid Space key (fire) accidentally re-triggering the button when it keeps focus.
    try { startBtn.blur(); } catch (_) {}
    try { container.focus(); } catch (_) {}
  }
  function triggerEndActionBySpace() {
    const mode = getActionButtonMode();
    if (mode === 'next') {
      goNextLevelFromWin();
      return true;
    }
    if (mode === 'restart') {
      restartCurrentLevel();
      return true;
    }
    return false;
  }

  startBtn.addEventListener('click', () => {
    const mode = startBtn.dataset.mode || getActionButtonMode();
    if (mode === 'next') { goNextLevelFromWin(); return; }
    if (mode === 'restart') { restartCurrentLevel(); return; }
    if (mode === 'stop') {
      openStopConfirm();
      return;
    }
    // In some environments rAF handle may not be ready yet; ensure the loop is alive so the game can start reliably.
    const stale = !lastLoopAt || (performance.now() - lastLoopAt > 800);
    if (!raf || stale) {
      lastTs = 0;
      raf = requestAnimationFrame(tick);
    }
    startFromSelection();
    try { startBtn.blur(); } catch (_) {}
  });
  // Prevent Space/Enter from "clicking" the Start button when focused (Space is used for firing).
  startBtn.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // Level dropdown (PVZ-style): pick any stage at any time.
  function ensureLevelSelectOptions(forceRebuild) {
    if (!levelSelect) return;
    if (!forceRebuild && levelSelect.options && levelSelect.options.length === MAX_LEVEL) return;
    levelSelect.innerHTML = '';
    const frag = document.createDocumentFragment();
    const prefix = (typeof t === 'function' ? t('level', 'Level') : 'Level');
    for (let i = 1; i <= MAX_LEVEL; i++) {
      const op = document.createElement('option');
      op.value = String(i);
      op.textContent = prefix + ' ' + i;
      frag.appendChild(op);
    }
    levelSelect.appendChild(frag);
  }

  function refreshLevelSelectText() {
    if (!levelSelect) return;
    // Keep selection stable while rebuilding labels for locale changes.
    const cur = String(state.selectedLevel || levelSelect.value || 1);
    ensureLevelSelectOptions(true);
    levelSelect.value = cur;
    syncActionButton();
  }
  ensureLevelSelectOptions();
  levelSelect.value = String(state.selectedLevel);
  levelSelect.addEventListener('change', () => {
    const v = Number(levelSelect.value || state.selectedLevel);
    const target = clamp(isFinite(v) ? Math.floor(v) : state.selectedLevel, 1, MAX_LEVEL);
    previewSelectedLevel(target);
  });
  // Prevent accidental stage changes via mouse wheel while hovering the select during intense gameplay.
  levelSelect.addEventListener('wheel', e => {
    try { e.preventDefault(); } catch (_) {}
  }, { passive: false });
  window.addEventListener('star:locale-change', refreshLevelSelectText);

  container.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && (state.won || state.lost)) {
      e.preventDefault();
      if (e.repeat) return;
      if (triggerEndActionBySpace()) return;
    }
    keys[e.code] = true;
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  });
  container.addEventListener('keyup', (e) => { keys[e.code] = false; });
  container.addEventListener('blur', () => { Object.keys(keys).forEach(k => { keys[k] = false; }); });

  // Make sure Arrow keys work reliably: click/tap the game to focus the container.
  root.addEventListener('pointerdown', () => { try { container.focus(); } catch (_) {} }, { passive: true });
  canvas.addEventListener('pointerdown', () => { try { container.focus(); } catch (_) {} }, { passive: true });

  // Win flow: click the battlefield to advance to the next stage (no need to manually pick from dropdown).
  canvas.addEventListener('click', () => { if (state.won) goNextLevelFromWin(); });

  // Setup
  setCanvasSize();
  resetRun(readSavedLevel());
  ensureLevelSelectOptions();
  syncHud();
  syncActionButton();
  raf = requestAnimationFrame(tick);
};