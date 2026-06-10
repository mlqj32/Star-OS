
window.StarGames = window.StarGames || {};
window.StarGames.sokoban = function(container) {
  if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '0');
  const root = container.querySelector('#game-sokoban');
  if (!root || root.dataset.bound === 'true') return;
  root.dataset.bound = 'true';
  function currentLocale() {
    return typeof getLocale === 'function' ? getLocale() : 'en';
  }
  const I18N = {
    'zh-CN': {
      complete: steps => `已通关，用了 ${steps} 步`,
      steps: steps => `步数: ${steps}`,
      victoryTitle: '过关！',
      victoryNextLevel: '下一关',
      victoryReplay: '再玩一次'
    },
    'zh-TW': {
      complete: steps => `已通關，用了 ${steps} 步`,
      steps: steps => `步數: ${steps}`,
      victoryTitle: '過關！',
      victoryNextLevel: '下一關',
      victoryReplay: '再玩一次'
    },
    en: {
      complete: steps => `Level cleared in ${steps} moves`,
      steps: steps => `Moves: ${steps}`,
      victoryTitle: 'Level Complete!',
      victoryNextLevel: 'Next Level',
      victoryReplay: 'Play Again'
    },
    ja: {
      complete: steps => `${steps} 手でクリアしました`,
      steps: steps => `手数: ${steps}`,
      victoryTitle: 'クリア！',
      victoryNextLevel: '次のステージ',
      victoryReplay: 'もう一度'
    },
    ko: {
      complete: steps => `${steps}번 만에 클리어했습니다`,
      steps: steps => `이동 수: ${steps}`,
      victoryTitle: '클리어!',
      victoryNextLevel: '다음 단계',
      victoryReplay: '다시 하기'
    }
  };
  function tr(key, ...args) {
    const table = I18N[currentLocale()] || I18N.en;
    const value = table[key] || I18N.en[key] || key;
    return typeof value === 'function' ? value(...args) : value;
  }

  const boardEl = root.querySelector('#sokoban-board');
  const boardWrapEl = root.querySelector('#sokoban-board-wrap');
  const statusEl = root.querySelector('#sokoban-status');
  const levelEl = root.querySelector('#sokoban-level');
  const levelSelect = root.querySelector('#sokoban-level-select');
  const prevBtn = root.querySelector('#sokoban-prev');
  const nextBtn = root.querySelector('#sokoban-next');
  const resetBtn = root.querySelector('#sokoban-reset');

  const TOTAL_LEVELS = 1000;
  const LEVEL_STORAGE_KEY = 'star-game-sokoban-last-level';
  const levels = new Array(TOTAL_LEVELS);
  const DIRS = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 }
  ];

  let levelIndex = 0;
  let state = null;
  let steps = 0;
  let resultOverlay = null;
  let resizeFrame = 0;
  let focusFrame = 0;
  let boardResizeObserver = null;

  function focusGameHost() {
    try {
      container.focus({ preventScroll: true });
    } catch (_) {
      try { container.focus(); } catch (__ ) {}
    }
  }

  function scheduleFocusGameHost() {
    if (focusFrame) cancelAnimationFrame(focusFrame);
    focusFrame = requestAnimationFrame(() => {
      focusFrame = 0;
      if (!container.isConnected) return;
      focusGameHost();
    });
  }

  function clampLevelIndex(value) {
    return Math.max(0, Math.min(TOTAL_LEVELS - 1, value | 0));
  }
  function readSavedLevelIndex() {
    try {
      const raw = Number(window.localStorage.getItem(LEVEL_STORAGE_KEY) || '1');
      if (Number.isFinite(raw)) return clampLevelIndex(Math.floor(raw) - 1);
    } catch (_) {}
    return 0;
  }
  function persistLevelIndex(index) {
    try {
      window.localStorage.setItem(LEVEL_STORAGE_KEY, String(clampLevelIndex(index) + 1));
    } catch (_) {}
  }

  function ensureResultOverlay() {
    if (resultOverlay) return resultOverlay;
    root.style.position = 'relative';
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.display = 'none';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '24px';
    overlay.style.background = 'rgba(6, 16, 11, 0.56)';
    overlay.style.backdropFilter = 'blur(6px)';
    overlay.style.zIndex = '30';
    const panel = document.createElement('div');
    panel.style.width = 'min(360px, 100%)';
    panel.style.padding = '28px 24px 22px';
    panel.style.borderRadius = '22px';
    panel.style.border = '1px solid rgba(255,255,255,0.14)';
    panel.style.background = 'linear-gradient(180deg, rgba(16,32,22,0.98), rgba(20,52,28,0.94))';
    panel.style.boxShadow = '0 24px 60px rgba(0,0,0,0.38)';
    panel.style.textAlign = 'center';
    panel.innerHTML = `
      <div data-role="title" style="font-size:28px;font-weight:800;line-height:1.15;color:#f8fafc;margin-bottom:10px;"></div>
      <div data-role="text" style="font-size:14px;line-height:1.7;color:rgba(248,250,252,0.84);margin-bottom:18px;"></div>
      <button type="button" data-role="action" class="start-footer-btn" style="min-width:140px;font-size:15px;font-weight:700;"></button>
    `;
    overlay.appendChild(panel);
    root.appendChild(overlay);
    resultOverlay = {
      el: overlay,
      title: panel.querySelector('[data-role="title"]'),
      text: panel.querySelector('[data-role="text"]'),
      actionBtn: panel.querySelector('[data-role="action"]'),
      action: null
    };
    resultOverlay.actionBtn.addEventListener('click', () => {
      if (typeof resultOverlay.action === 'function') resultOverlay.action();
    });
    return resultOverlay;
  }

  function showVictoryOverlay() {
    const overlay = ensureResultOverlay();
    overlay.title.textContent = tr('victoryTitle');
    overlay.text.textContent = tr('complete', steps);
    const isLastLevel = levelIndex >= TOTAL_LEVELS - 1;
    overlay.actionBtn.textContent = isLastLevel ? tr('victoryReplay') : tr('victoryNextLevel');
    overlay.action = () => {
      overlay.el.style.display = 'none';
      overlay.action = null;
      if (isLastLevel) {
        levelIndex = 0;
      } else {
        levelIndex = (levelIndex + 1) % TOTAL_LEVELS;
      }
      reset();
    };
    overlay.el.style.display = 'flex';
  }

  function hideResultOverlay() {
    if (!resultOverlay) return;
    resultOverlay.el.style.display = 'none';
    resultOverlay.action = null;
  }

  function createRng(seed) {
    let t = seed >>> 0;
    return function() {
      t += 0x6D2B79F5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function shuffleInPlace(list, rng) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = randomInt(rng, 0, i);
      const temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
    return list;
  }

  function cellKey(r, c) {
    return r + ':' + c;
  }

  function parseKey(key) {
    const parts = key.split(':').map(Number);
    return { r: parts[0], c: parts[1] };
  }

  function cloneGrid(pattern) {
    return pattern.map(row => row.split(''));
  }

  function isFloor(map, r, c) {
    return r >= 0 && c >= 0 && r < map.length && c < map[r].length && map[r][c] !== '#';
  }

  function clampInt(v, min, max) {
    return Math.max(min, Math.min(max, v | 0));
  }

  function makeGrid(rows, cols, fill) {
    const ch = fill == null ? '#' : fill;
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ch));
  }

  function carveRect(map, x, y, w, h, ch) {
    const fill = ch == null ? '.' : ch;
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) {
        if (r <= 0 || c <= 0 || r >= map.length - 1 || c >= map[0].length - 1) continue;
        map[r][c] = fill;
      }
    }
  }

  function carveCorridor(map, x0, y0, x1, y1, rng) {
    let cx = x0, cy = y0;
    const horizFirst = (rng ? (rng() < 0.5) : (Math.random() < 0.5));
    const step = (a, b) => (a < b ? 1 : (a > b ? -1 : 0));
    const walkH = () => {
      const dx = step(cx, x1);
      while (cx !== x1) { cx += dx; carveRect(map, cx, cy, 1, 1, '.'); }
    };
    const walkV = () => {
      const dy = step(cy, y1);
      while (cy !== y1) { cy += dy; carveRect(map, cx, cy, 1, 1, '.'); }
    };
    carveRect(map, cx, cy, 1, 1, '.');
    if (horizFirst) { walkH(); walkV(); }
    else { walkV(); walkH(); }
  }

  function keepLargestComponent(map) {
    const rows = map.length;
    const cols = map[0].length;
    const seen = new Set();
    let best = null;
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (map[r][c] === '#') continue;
        const k = cellKey(r, c);
        if (seen.has(k)) continue;
        const q = [{ r, c }];
        const comp = new Set([k]);
        seen.add(k);
        for (let i = 0; i < q.length; i++) {
          const n = q[i];
          for (const d of DIRS) {
            const nr = n.r + d.dr, nc = n.c + d.dc;
            if (nr <= 0 || nc <= 0 || nr >= rows - 1 || nc >= cols - 1) continue;
            if (map[nr][nc] === '#') continue;
            const nk = cellKey(nr, nc);
            if (seen.has(nk)) continue;
            seen.add(nk);
            comp.add(nk);
            q.push({ r: nr, c: nc });
          }
        }
        if (!best || comp.size > best.size) best = comp;
      }
    }
    if (!best) return map;
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (map[r][c] === '#') continue;
        if (!best.has(cellKey(r, c))) map[r][c] = '#';
      }
    }
    return map;
  }

  function generateRoomsMap(rng, rows, cols) {
    const map = makeGrid(rows, cols, '#');
    // Outer border stays solid.
    const roomCount = clampInt(3 + Math.floor(rng() * 5), 3, 7);
    const rooms = [];
    for (let i = 0; i < roomCount; i++) {
      const rw = clampInt(3 + Math.floor(rng() * 6), 3, Math.min(8, cols - 4));
      const rh = clampInt(3 + Math.floor(rng() * 6), 3, Math.min(8, rows - 4));
      const rx = clampInt(1 + Math.floor(rng() * (cols - rw - 2)), 1, cols - rw - 2);
      const ry = clampInt(1 + Math.floor(rng() * (rows - rh - 2)), 1, rows - rh - 2);
      carveRect(map, rx, ry, rw, rh, '.');
      rooms.push({ cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2), rx, ry, rw, rh });
    }
    // Connect rooms
    for (let i = 1; i < rooms.length; i++) {
      const a = rooms[i - 1];
      const b = rooms[i];
      carveCorridor(map, a.cx, a.cy, b.cx, b.cy, rng);
    }
    // Sprinkle pillars for variety (keep it sparse)
    for (let r = 2; r < rows - 2; r++) {
      for (let c = 2; c < cols - 2; c++) {
        if (map[r][c] === '#') continue;
        if (rng() < 0.045) map[r][c] = '#';
      }
    }
    keepLargestComponent(map);
    // Ensure at least some open space near center
    carveRect(map, Math.floor(cols / 2) - 1, Math.floor(rows / 2) - 1, 3, 3, '.');
    return keepLargestComponent(map);
  }

  function generateMazeMap(rng, rows, cols) {
    // Use odd dimensions for a cleaner maze.
    const r2 = rows % 2 === 0 ? rows - 1 : rows;
    const c2 = cols % 2 === 0 ? cols - 1 : cols;
    const map = makeGrid(r2, c2, '#');
    const startR = 1 + 2 * Math.floor(rng() * Math.floor((r2 - 2) / 2));
    const startC = 1 + 2 * Math.floor(rng() * Math.floor((c2 - 2) / 2));
    const stack = [{ r: startR, c: startC }];
    map[startR][startC] = '.';
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const dirs = shuffleInPlace([{ dr: -2, dc: 0 }, { dr: 2, dc: 0 }, { dr: 0, dc: -2 }, { dr: 0, dc: 2 }], rng);
      let carved = false;
      for (const d of dirs) {
        const nr = cur.r + d.dr;
        const nc = cur.c + d.dc;
        if (nr <= 0 || nc <= 0 || nr >= r2 - 1 || nc >= c2 - 1) continue;
        if (map[nr][nc] !== '#') continue;
        map[cur.r + d.dr / 2][cur.c + d.dc / 2] = '.';
        map[nr][nc] = '.';
        stack.push({ r: nr, c: nc });
        carved = true;
        break;
      }
      if (!carved) stack.pop();
    }
    // Punch a couple of small chambers so it's less uniform.
    const chamberCount = clampInt(1 + Math.floor(rng() * 3), 1, 3);
    for (let i = 0; i < chamberCount; i++) {
      const rw = clampInt(3 + Math.floor(rng() * 4), 3, Math.min(7, c2 - 4));
      const rh = clampInt(3 + Math.floor(rng() * 4), 3, Math.min(7, r2 - 4));
      const rx = clampInt(1 + Math.floor(rng() * (c2 - rw - 2)), 1, c2 - rw - 2);
      const ry = clampInt(1 + Math.floor(rng() * (r2 - rh - 2)), 1, r2 - rh - 2);
      carveRect(map, rx, ry, rw, rh, '.');
    }
    return keepLargestComponent(map);
  }

  function generateCaveMap(rng, rows, cols) {
    const map = makeGrid(rows, cols, '#');
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        map[r][c] = rng() < 0.46 ? '#' : '.';
      }
    }
    const countWalls = (r, c) => {
      let w = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const rr = r + dr, cc = c + dc;
          if (rr <= 0 || cc <= 0 || rr >= rows - 1 || cc >= cols - 1) { w++; continue; }
          if (map[rr][cc] === '#') w++;
        }
      }
      return w;
    };
    for (let it = 0; it < 4; it++) {
      const next = makeGrid(rows, cols, '#');
      for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
          const w = countWalls(r, c);
          next[r][c] = (w >= 5) ? '#' : '.';
        }
      }
      for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) map[r][c] = next[r][c];
    }
    // Open up the center a bit for gameplay.
    carveRect(map, Math.floor(cols / 2) - 1, Math.floor(rows / 2) - 1, 3, 3, '.');
    return keepLargestComponent(map);
  }

  function generateSymmetryMap(rng, rows, cols) {
    const map = makeGrid(rows, cols, '#');
    carveRect(map, 1, 1, cols - 2, rows - 2, '.');
    // Add mirrored walls/pillars for a recognizable style.
    const blocks = clampInt(6 + Math.floor(rng() * 10), 6, 16);
    for (let i = 0; i < blocks; i++) {
      const bw = clampInt(1 + Math.floor(rng() * 3), 1, 3);
      const bh = clampInt(1 + Math.floor(rng() * 3), 1, 3);
      const x = clampInt(2 + Math.floor(rng() * (Math.floor(cols / 2) - bw - 2)), 2, Math.floor(cols / 2) - bw - 2);
      const y = clampInt(2 + Math.floor(rng() * (rows - bh - 4)), 2, rows - bh - 3);
      const mx = (cols - 1) - x - bw;
      carveRect(map, x, y, bw, bh, '#');
      carveRect(map, mx, y, bw, bh, '#');
      if (rng() < 0.35) {
        const my = (rows - 1) - y - bh;
        carveRect(map, x, my, bw, bh, '#');
        carveRect(map, mx, my, bw, bh, '#');
      }
    }
    // Ensure corridors exist by cutting a cross.
    const cx = Math.floor(cols / 2);
    for (let r = 1; r < rows - 1; r++) map[r][cx] = '.';
    const cy = Math.floor(rows / 2);
    for (let c = 1; c < cols - 1; c++) map[cy][c] = '.';
    return keepLargestComponent(map);
  }

  function setInteriorCell(map, r, c, ch) {
    if (r <= 0 || c <= 0 || r >= map.length - 1 || c >= map[0].length - 1) return;
    map[r][c] = ch == null ? '.' : ch;
  }

  function carveHorizontalLine(map, r, c0, c1, width, ch) {
    const fill = ch == null ? '.' : ch;
    const a = Math.min(c0, c1);
    const b = Math.max(c0, c1);
    const start = -Math.floor((Math.max(1, width | 0) - 1) / 2);
    for (let c = a; c <= b; c++) {
      for (let w = 0; w < Math.max(1, width | 0); w++) setInteriorCell(map, r + start + w, c, fill);
    }
  }

  function carveVerticalLine(map, c, r0, r1, width, ch) {
    const fill = ch == null ? '.' : ch;
    const a = Math.min(r0, r1);
    const b = Math.max(r0, r1);
    const start = -Math.floor((Math.max(1, width | 0) - 1) / 2);
    for (let r = a; r <= b; r++) {
      for (let w = 0; w < Math.max(1, width | 0); w++) setInteriorCell(map, r, c + start + w, fill);
    }
  }

  function carveDoorway(map, r, c, len, horizontal) {
    const length = Math.max(1, len | 0);
    for (let i = 0; i < length; i++) {
      if (horizontal) setInteriorCell(map, r, c + i, '.');
      else setInteriorCell(map, r + i, c, '.');
    }
  }

  function rectsOverlapMargin(a, b, margin) {
    const m = margin == null ? 0 : margin;
    return a.x - m < b.x + b.w && a.x + a.w + m > b.x && a.y - m < b.y + b.h && a.y + a.h + m > b.y;
  }

  function generateNarrowAlleyMap(rng, rows, cols, dense) {
    const map = makeGrid(rows, cols, '#');
    const spineCount = dense ? randomInt(rng, 2, 3) : randomInt(rng, 1, 2);
    const usedCols = [];
    for (let i = 0; i < spineCount; i++) {
      let c = clampInt(randomInt(rng, 2, cols - 3), 2, cols - 3);
      let guard = 0;
      while (usedCols.some(v => Math.abs(v - c) < 3) && guard++ < 10) c = clampInt(randomInt(rng, 2, cols - 3), 2, cols - 3);
      usedCols.push(c);
      for (let r = 1; r < rows - 1; r++) {
        setInteriorCell(map, r, c, '.');
        if (dense && rng() < 0.14) setInteriorCell(map, r, clampInt(c + (rng() < 0.5 ? -1 : 1), 1, cols - 2), '.');
        if (rng() < (dense ? 0.46 : 0.32)) c = clampInt(c + randomInt(rng, -1, 1), 2, cols - 3);
      }
    }
    const branches = dense ? randomInt(rng, 7, 11) : randomInt(rng, 4, 7);
    for (let i = 0; i < branches; i++) {
      const floors = collectFloorCells(map);
      if (!floors.length) break;
      const seed = floors[randomInt(rng, 0, floors.length - 1)];
      const horiz = rng() < 0.72;
      const dir = rng() < 0.5 ? -1 : 1;
      const len = randomInt(rng, 2, dense ? 6 : 5);
      const endR = horiz ? seed.r : clampInt(seed.r + dir * len, 1, rows - 2);
      const endC = horiz ? clampInt(seed.c + dir * len, 1, cols - 2) : seed.c;
      if (horiz) carveHorizontalLine(map, seed.r, seed.c, endC, 1, '.');
      else carveVerticalLine(map, seed.c, seed.r, endR, 1, '.');
      if (rng() < 0.74) carveRect(map, clampInt(endC - 1, 1, cols - 3), clampInt(endR - 1, 1, rows - 3), dense ? 3 : 2, 2, '.');
    }
    const links = dense ? randomInt(rng, 3, 5) : randomInt(rng, 1, 3);
    for (let i = 0; i < links; i++) {
      const floors = collectFloorCells(map);
      if (floors.length < 2) break;
      const a = floors[randomInt(rng, 0, floors.length - 1)];
      const b = floors[randomInt(rng, 0, floors.length - 1)];
      carveCorridor(map, a.c, a.r, b.c, b.r, rng);
    }
    return keepLargestComponent(map);
  }

  function generateRingCorridorMap(rng, rows, cols, nested) {
    const map = makeGrid(rows, cols, '#');
    carveRect(map, 1, 1, cols - 2, rows - 2, '.');
    carveRect(map, 3, 3, cols - 6, rows - 6, '#');
    if (rows >= 11 && cols >= 11) carveRect(map, 5, 5, cols - 10, rows - 10, '.');
    if (nested && rows >= 15 && cols >= 15) {
      carveRect(map, 7, 7, cols - 14, rows - 14, '#');
      if (rows >= 17 && cols >= 17) carveRect(map, 9, 9, cols - 18, rows - 18, '.');
    }

    const topDoor = clampInt(randomInt(rng, 4, cols - 5), 4, cols - 5);
    const bottomDoor = clampInt(randomInt(rng, 4, cols - 5), 4, cols - 5);
    const leftDoor = clampInt(randomInt(rng, 4, rows - 5), 4, rows - 5);
    const rightDoor = clampInt(randomInt(rng, 4, rows - 5), 4, rows - 5);
    carveRect(map, topDoor, 3, 1, 3, '.');
    carveRect(map, bottomDoor, rows - 6, 1, 3, '.');
    carveRect(map, 3, leftDoor, 3, 1, '.');
    carveRect(map, cols - 6, rightDoor, 3, 1, '.');

    if (nested && rows >= 15 && cols >= 15) {
      const midC = Math.floor(cols / 2);
      const midR = Math.floor(rows / 2);
      carveRect(map, midC, 7, 1, 3, '.');
      carveRect(map, midC, rows - 10, 1, 3, '.');
      carveRect(map, 7, midR, 3, 1, '.');
      carveRect(map, cols - 10, midR, 3, 1, '.');
    } else {
      if (rng() < 0.6) carveHorizontalLine(map, Math.floor(rows / 2), 2, cols - 3, 1, '.');
      if (rng() < 0.4) carveVerticalLine(map, Math.floor(cols / 2), 2, rows - 3, 1, '.');
    }

    const bays = nested ? randomInt(rng, 4, 7) : randomInt(rng, 2, 4);
    for (let i = 0; i < bays; i++) {
      const side = randomInt(rng, 0, 3);
      if (side === 0) carveRect(map, clampInt(randomInt(rng, 2, cols - 4), 2, cols - 4), 1, 2, 2, '.');
      else if (side === 1) carveRect(map, clampInt(randomInt(rng, 2, cols - 4), 2, cols - 4), rows - 3, 2, 2, '.');
      else if (side === 2) carveRect(map, 1, clampInt(randomInt(rng, 2, rows - 4), 2, rows - 4), 2, 2, '.');
      else carveRect(map, cols - 3, clampInt(randomInt(rng, 2, rows - 4), 2, rows - 4), 2, 2, '.');
    }
    return keepLargestComponent(map);
  }

  function generateWarehouseDistrictMap(rng, rows, cols, complex) {
    const map = makeGrid(rows, cols, '#');
    carveRect(map, 1, 1, cols - 2, rows - 2, '.');

    let x = 4;
    while (x <= cols - 5) {
      carveRect(map, x, 1, 1, rows - 2, '#');
      const doorCount = complex ? randomInt(rng, 2, 4) : randomInt(rng, 1, 3);
      for (let i = 0; i < doorCount; i++) carveDoorway(map, clampInt(randomInt(rng, 2, rows - 4), 2, rows - 4), x, randomInt(rng, 1, 2), false);
      x += (complex ? 4 : 5) + randomInt(rng, 0, 1);
    }

    let y = 4;
    while (y <= rows - 5) {
      carveRect(map, 1, y, cols - 2, 1, '#');
      const doorCount = complex ? randomInt(rng, 2, 4) : randomInt(rng, 1, 3);
      for (let i = 0; i < doorCount; i++) carveDoorway(map, y, clampInt(randomInt(rng, 2, cols - 4), 2, cols - 4), randomInt(rng, 1, 2), true);
      y += (complex ? 4 : 5) + randomInt(rng, 0, 1);
    }

    carveHorizontalLine(map, Math.floor(rows / 2), 1, cols - 2, 1, '.');
    if (complex || rng() < 0.6) carveVerticalLine(map, Math.floor(cols / 2), 1, rows - 2, 1, '.');
    return keepLargestComponent(map);
  }

  function generateRelayCorridorMap(rng, rows, cols, hub) {
    const map = makeGrid(rows, cols, '#');
    let row = 2;
    let dir = 1;
    while (row <= rows - 3) {
      carveHorizontalLine(map, row, 1, cols - 2, 1, '.');
      const bays = hub ? randomInt(rng, 2, 4) : randomInt(rng, 1, 2);
      for (let i = 0; i < bays; i++) {
        const bayC = clampInt(randomInt(rng, 2, cols - 4), 2, cols - 4);
        carveRect(map, bayC, clampInt(row - 1, 1, rows - 3), 2 + (hub ? 1 : 0), 2, '.');
      }
      const drop = randomInt(rng, 2, hub ? 3 : 2);
      const turnCol = dir === 1 ? cols - 2 : 1;
      if (row + drop <= rows - 2) {
        carveVerticalLine(map, turnCol, row, row + drop, 1, '.');
        carveRect(map, clampInt(turnCol - 1, 1, cols - 3), clampInt(row + Math.floor(drop / 2) - 1, 1, rows - 3), 3, 3, '.');
      }
      row += drop;
      dir *= -1;
    }
    if (hub) {
      const connectors = randomInt(rng, 2, 4);
      for (let i = 0; i < connectors; i++) {
        const c = clampInt(randomInt(rng, 3, cols - 4), 3, cols - 4);
        carveVerticalLine(map, c, 2, rows - 3, 1, '.');
        const midR = clampInt(randomInt(rng, 3, rows - 4), 3, rows - 4);
        carveRect(map, clampInt(c - 1, 1, cols - 3), clampInt(midR - 1, 1, rows - 3), 3, 3, '.');
      }
    }
    return keepLargestComponent(map);
  }

  function generateDispatchYardMap(rng, rows, cols, grand) {
    const map = makeGrid(rows, cols, '#');
    carveRect(map, 1, 1, cols - 2, rows - 2, '.');
    carveHorizontalLine(map, Math.floor(rows / 2), 1, cols - 2, grand ? 2 : 1, '.');
    carveVerticalLine(map, Math.floor(cols / 2), 1, rows - 2, 1, '.');

    const islands = [];
    const islandGoal = grand ? randomInt(rng, 6, 10) : randomInt(rng, 4, 7);
    let attempts = 0;
    while (islands.length < islandGoal && attempts++ < islandGoal * 10) {
      const w = randomInt(rng, 2, grand ? 4 : 3);
      const h = randomInt(rng, 2, grand ? 4 : 3);
      const x = clampInt(randomInt(rng, 2, cols - w - 2), 2, cols - w - 2);
      const y = clampInt(randomInt(rng, 2, rows - h - 2), 2, rows - h - 2);
      const rect = { x, y, w, h };
      const blocksMainCross = (x <= Math.floor(cols / 2) && x + w >= Math.floor(cols / 2)) || (y <= Math.floor(rows / 2) && y + h >= Math.floor(rows / 2));
      if (blocksMainCross) continue;
      if (islands.some(other => rectsOverlapMargin(rect, other, 1))) continue;
      carveRect(map, x, y, w, h, '#');
      islands.push(rect);
    }

    const strips = grand ? randomInt(rng, 3, 5) : randomInt(rng, 1, 3);
    for (let i = 0; i < strips; i++) {
      if (rng() < 0.5) carveRect(map, clampInt(randomInt(rng, 2, cols - 5), 2, cols - 5), clampInt(randomInt(rng, 2, rows - 3), 2, rows - 3), randomInt(rng, 2, 4), 1, '#');
      else carveRect(map, clampInt(randomInt(rng, 2, cols - 3), 2, cols - 3), clampInt(randomInt(rng, 2, rows - 5), 2, rows - 5), 1, randomInt(rng, 2, 4), '#');
    }

    carveHorizontalLine(map, Math.floor(rows / 2), 1, cols - 2, grand ? 2 : 1, '.');
    carveVerticalLine(map, Math.floor(cols / 2), 1, rows - 2, 1, '.');
    return keepLargestComponent(map);
  }

  const LEVEL_THEME_SEGMENTS = [
    // 1-100: narrow alley carrying
    { id: 'narrowAlleys', rows: [8, 11], cols: [10, 14], boxRange: [1, 2], scrambleBias: -6, attempts: 54 },
    // 101-200: ring corridor loops
    { id: 'ringCorridors', rows: [9, 12], cols: [11, 15], boxRange: [1, 3], scrambleBias: -2, attempts: 56 },
    // 201-300: multi-warehouse layouts
    { id: 'multiWarehouse', rows: [10, 13], cols: [12, 16], boxRange: [2, 4], scrambleBias: 3, attempts: 58 },
    // 301-400: long relay corridors
    { id: 'relayCorridors', rows: [10, 13], cols: [13, 17], boxRange: [2, 4], scrambleBias: 6, attempts: 58 },
    // 401-500: medium dispatch yards
    { id: 'dispatchYard', rows: [11, 15], cols: [13, 18], boxRange: [3, 5], scrambleBias: 10, attempts: 60 },
    // 501-600: dense alleys with more side bays
    { id: 'denseAlleys', rows: [11, 15], cols: [13, 18], boxRange: [3, 6], scrambleBias: 13, attempts: 62 },
    // 601-700: double ring and nested corridors
    { id: 'doubleRing', rows: [11, 15], cols: [13, 18], boxRange: [4, 7], scrambleBias: 16, attempts: 64 },
    // 701-800: warehouse district complexes
    { id: 'warehouseDistrict', rows: [12, 16], cols: [14, 19], boxRange: [4, 8], scrambleBias: 20, attempts: 66 },
    // 801-900: relay hub and switch-yard style routes
    { id: 'relayHub', rows: [12, 17], cols: [15, 19], boxRange: [5, 9], scrambleBias: 24, attempts: 68 },
    // 901-1000: large multi-box dispatch
    { id: 'grandDispatch', rows: [13, 19], cols: [15, 19], boxRange: [6, 10], scrambleBias: 28, attempts: 72 }
  ];

  function getThemeForLevel(levelNo) {
    const segmentIndex = clampInt(Math.floor((levelNo - 1) / 100), 0, LEVEL_THEME_SEGMENTS.length - 1);
    return LEVEL_THEME_SEGMENTS[segmentIndex];
  }

  function boxCountForLevel(levelNo, rng, theme) {
    // Progression: start with 1 box, then 2, 3, 4, and later up to 10.
    // Keep late-game variety: do not monotonically increase per level.
    const roll = rng();
    let baseCount = 1;
    if (levelNo <= 70) baseCount = roll < 0.86 ? 1 : 2;
    else if (levelNo <= 180) baseCount = roll < 0.74 ? 2 : (roll < 0.9 ? 1 : 3);
    else if (levelNo <= 320) baseCount = roll < 0.55 ? 3 : (roll < 0.85 ? 2 : 4);
    else if (levelNo <= 520) baseCount = roll < 0.62 ? 4 : (roll < 0.82 ? 3 : 5);
    else if (levelNo <= 720) baseCount = 3 + randomInt(rng, 2, 4); // 5-7
    else if (levelNo <= 860) baseCount = 4 + randomInt(rng, 2, 5); // 6-9
    else baseCount = 5 + randomInt(rng, 1, 5); // 6-10
    if (!theme || !theme.boxRange) return baseCount;
    return clampInt(baseCount, theme.boxRange[0], theme.boxRange[1]);
  }

  function scrambleTargetFor(levelNo, boxCount, map, rng, theme) {
    const area = map.length * map[0].length;
    const base = 10 + Math.floor(levelNo / 6) + boxCount * 7 + Math.floor(area / 18);
    const themeBias = theme && typeof theme.scrambleBias === 'number' ? theme.scrambleBias : 0;
    const jitter = randomInt(rng, -4, 10);
    return clampInt(base + themeBias + jitter, 12, 160);
  }

  function generateBaseMapFor(levelNo, boxCount, rng, theme) {
    const activeTheme = theme || getThemeForLevel(levelNo);
    const rowRange = activeTheme.rows || [9, 15];
    const colRange = activeTheme.cols || [11, 17];
    const growth = Math.max(0, boxCount - (activeTheme.boxRange ? activeTheme.boxRange[0] : 1));
    const rows = clampInt(randomInt(rng, rowRange[0], rowRange[1]) + Math.floor(growth / 3), rowRange[0], rowRange[1]);
    const cols = clampInt(randomInt(rng, colRange[0], colRange[1]) + Math.floor(growth / 2), colRange[0], colRange[1]);

    if (activeTheme.id === 'narrowAlleys') return generateNarrowAlleyMap(rng, rows, cols, false);
    if (activeTheme.id === 'ringCorridors') return generateRingCorridorMap(rng, rows, cols, false);
    if (activeTheme.id === 'multiWarehouse') return generateWarehouseDistrictMap(rng, rows, cols, false);
    if (activeTheme.id === 'relayCorridors') return generateRelayCorridorMap(rng, rows, cols, false);
    if (activeTheme.id === 'dispatchYard') return generateDispatchYardMap(rng, rows, cols, false);
    if (activeTheme.id === 'denseAlleys') return generateNarrowAlleyMap(rng, rows, cols, true);
    if (activeTheme.id === 'doubleRing') return generateRingCorridorMap(rng, rows, cols, true);
    if (activeTheme.id === 'warehouseDistrict') return generateWarehouseDistrictMap(rng, rows, cols, true);
    if (activeTheme.id === 'relayHub') return generateRelayCorridorMap(rng, rows, cols, true);
    if (activeTheme.id === 'grandDispatch') return generateDispatchYardMap(rng, rows, cols, true);
    return generateRoomsMap(rng, rows, cols);
  }

  function collectFloorCells(map) {
    const cells = [];
    for (let r = 0; r < map.length; r++) {
      for (let c = 0; c < map[r].length; c++) {
        if (isFloor(map, r, c)) cells.push({ r, c });
      }
    }
    return cells;
  }

  function canStartGoalAt(map, r, c) {
    return DIRS.some(({ dr, dc }) => isFloor(map, r - dr, c - dc) && isFloor(map, r - dr * 2, c - dc * 2));
  }

  function pickGoalCells(map, boxCount, rng) {
    const floors = collectFloorCells(map).filter(cell => canStartGoalAt(map, cell.r, cell.c));
    if (floors.length < boxCount) return [];
    shuffleInPlace(floors, rng);
    const picked = [];
    while (floors.length && picked.length < boxCount) {
      const next = floors.shift();
      const crowded = picked.some(cell => Math.abs(cell.r - next.r) + Math.abs(cell.c - next.c) < 3);
      if (!crowded || floors.length < boxCount - picked.length) picked.push(next);
    }
    return picked.length >= boxCount ? picked.slice(0, boxCount) : [];
  }

  function pickPlayerCell(map, boxes, rng) {
    const cells = collectFloorCells(map).filter(cell => !boxes.has(cellKey(cell.r, cell.c)));
    if (!cells.length) return { r: 1, c: 1 };
    return cells[randomInt(rng, 0, cells.length - 1)];
  }

  function reachableCells(map, boxes, player) {
    const queue = [player];
    const seen = new Set([cellKey(player.r, player.c)]);
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i];
      DIRS.forEach(({ dr, dc }) => {
        const nr = node.r + dr;
        const nc = node.c + dc;
        const key = cellKey(nr, nc);
        if (!isFloor(map, nr, nc) || boxes.has(key) || seen.has(key)) return;
        seen.add(key);
        queue.push({ r: nr, c: nc });
      });
    }
    return seen;
  }

  function enumerateReverseMoves(map, boxes, player) {
    const reachable = reachableCells(map, boxes, player);
    const moves = [];
    boxes.forEach(boxKey => {
      const box = parseKey(boxKey);
      DIRS.forEach(({ dr, dc }) => {
        const mid = { r: box.r - dr, c: box.c - dc };
        const src = { r: box.r - dr * 2, c: box.c - dc * 2 };
        const midKey = cellKey(mid.r, mid.c);
        const srcKey = cellKey(src.r, src.c);
        if (!isFloor(map, mid.r, mid.c) || !isFloor(map, src.r, src.c)) return;
        if (boxes.has(midKey) || boxes.has(srcKey)) return;
        if (!reachable.has(midKey)) return;
        moves.push({
          fromKey: boxKey,
          toKey: midKey,
          nextPlayer: src
        });
      });
    });
    return moves;
  }

  function scrambleState(map, goals, boxes, player, targetSteps, rng) {
    const boxesSet = new Set(boxes);
    let currentPlayer = { ...player };
    let steps = 0;
    let lastMove = null;
    const history = [];
    while (steps < targetSteps) {
      let moves = enumerateReverseMoves(map, boxesSet, currentPlayer);
      if (lastMove && moves.length > 1) {
        moves = moves.filter(move => !(move.fromKey === lastMove.toKey && move.toKey === lastMove.fromKey));
      }
      if (!moves.length) {
        break;
      }
      const move = moves[randomInt(rng, 0, moves.length - 1)];
      boxesSet.delete(move.fromKey);
      boxesSet.add(move.toKey);
      currentPlayer = { ...move.nextPlayer };
      lastMove = move;
      history.push({
        fromKey: move.fromKey,
        toKey: move.toKey,
        nextPlayer: { ...move.nextPlayer }
      });
      steps++;
    }
    return { boxes: boxesSet, player: currentPlayer, steps, history };
  }

  function validateScrambleReplay(map, goals, boxes, player, history) {
    const currentBoxes = new Set(boxes);
    let currentPlayer = { ...player };
    for (let i = history.length - 1; i >= 0; i--) {
      const move = history[i];
      if (!currentBoxes.has(move.toKey)) return false;
      const reachable = reachableCells(map, currentBoxes, currentPlayer);
      const requiredKey = cellKey(move.nextPlayer.r, move.nextPlayer.c);
      if (!reachable.has(requiredKey)) return false;
      currentBoxes.delete(move.toKey);
      currentBoxes.add(move.fromKey);
      currentPlayer = parseKey(move.toKey);
    }
    return Array.from(goals).every(key => currentBoxes.has(key));
  }

  function serializeLevel(map, goals, boxes, player) {
    return map.map((row, r) => row.map((cell, c) => {
      if (cell === '#') return '#';
      const key = cellKey(r, c);
      const hasGoal = goals.has(key);
      const hasBox = boxes.has(key);
      const hasPlayer = player.r === r && player.c === c;
      if (hasPlayer && hasGoal) return '+';
      if (hasBox && hasGoal) return '*';
      if (hasPlayer) return 'P';
      if (hasBox) return 'B';
      if (hasGoal) return 'G';
      return '.';
    }).join(''));
  }

  function buildFallbackLevel(map, rng) {
    const goalCandidates = collectFloorCells(map).filter(cell => canStartGoalAt(map, cell.r, cell.c));
    shuffleInPlace(goalCandidates, rng);
    for (const goal of goalCandidates) {
      const dirs = shuffleInPlace(DIRS.map(d => ({ ...d })), rng);
      for (const { dr, dc } of dirs) {
        const box = { r: goal.r - dr, c: goal.c - dc };
        const player = { r: goal.r - dr * 2, c: goal.c - dc * 2 };
        if (!isFloor(map, box.r, box.c) || !isFloor(map, player.r, player.c)) continue;
        const goals = new Set([cellKey(goal.r, goal.c)]);
        const boxes = new Set([cellKey(box.r, box.c)]);
        return serializeLevel(map, goals, boxes, player);
      }
    }

    const fallbackFloor = collectFloorCells(map);
    const first = fallbackFloor[0] || { r: 1, c: 1 };
    const second = fallbackFloor[1] || first;
    const third = fallbackFloor[2] || second;
    const goals = new Set([cellKey(first.r, first.c)]);
    const boxes = new Set([cellKey(second.r, second.c)]);
    return serializeLevel(map, goals, boxes, third);
  }

  function getLevel(index) {
    if (!levels[index]) {
      levels[index] = buildLevel(index);
    }
    return levels[index];
  }

  function warmupLevels(index) {
    [index + 1, index - 1].forEach(nextIndex => {
      if (nextIndex < 0 || nextIndex >= TOTAL_LEVELS || levels[nextIndex]) return;
      setTimeout(() => {
        if (!levels[nextIndex]) levels[nextIndex] = buildLevel(nextIndex);
      }, 0);
    });
  }

  function buildLevel(index) {
    const levelNo = index + 1;
    const rng = createRng(20260318 + index * 2654435761);
    const theme = getThemeForLevel(levelNo);
    const desiredBoxes = boxCountForLevel(levelNo, rng, theme);
    let best = null;

    for (let attempt = 0; attempt < (theme.attempts || 46); attempt++) {
      const map = generateBaseMapFor(levelNo, desiredBoxes, rng, theme);
      const scrambleTarget = scrambleTargetFor(levelNo, desiredBoxes, map, rng, theme);
      const goalsList = pickGoalCells(map, desiredBoxes, rng);
      if (goalsList.length < desiredBoxes) continue;
      const goals = new Set(goalsList.map(cell => cellKey(cell.r, cell.c)));
      const boxes = new Set(goals);
      const player = pickPlayerCell(map, boxes, rng);
      const scrambled = scrambleState(map, goals, boxes, player, scrambleTarget, rng);
      const replayValid = scrambled.steps > 0 && validateScrambleReplay(map, goals, scrambled.boxes, scrambled.player, scrambled.history || []);
      const solved = Array.from(goals).every(key => scrambled.boxes.has(key));
      if (!replayValid || solved) continue;
      if (!best || scrambled.steps > best.steps) {
        best = { map, goals, boxes: scrambled.boxes, player: scrambled.player, steps: scrambled.steps };
      }
      if (scrambled.steps >= Math.max(8, scrambleTarget - 6)) {
        best = { map, goals, boxes: scrambled.boxes, player: scrambled.player, steps: scrambled.steps };
        break;
      }
    }

    if (!best) {
      const map = generateBaseMapFor(levelNo, Math.max(1, desiredBoxes), rng, theme);
      return buildFallbackLevel(map, rng);
    }

    return serializeLevel(best.map, best.goals, best.boxes, best.player);
  }

  function parseLevel(raw) {
    const goals = new Set();
    const boxes = new Set();
    let player = { r: 0, c: 0 };
    const map = raw.map((line, r) => line.split('').map((ch, c) => {
      if (ch === 'G' || ch === '*' || ch === '+') goals.add(r + ':' + c);
      if (ch === 'B' || ch === '*') boxes.add(r + ':' + c);
      if (ch === 'P' || ch === '+') player = { r, c };
      return ch === '#' ? '#' : '.';
    }));
    return { map, goals, boxes, player };
  }

  function isGoal(r, c) {
    return state.goals.has(r + ':' + c);
  }

  function hasBox(r, c) {
    return state.boxes.has(r + ':' + c);
  }

  function cellType(r, c) {
    if (state.map[r][c] === '#') return 'wall';
    if (state.player.r === r && state.player.c === c) return isGoal(r, c) ? 'player-goal' : 'player';
    if (hasBox(r, c)) return isGoal(r, c) ? 'box-goal' : 'box';
    if (isGoal(r, c)) return 'goal';
    return 'floor';
  }

  function isComplete() {
    return Array.from(state.goals).every(key => state.boxes.has(key));
  }

  function render() {
    levelEl.textContent = String(levelIndex + 1) + ' / ' + TOTAL_LEVELS;
    if (levelSelect && levelSelect.value !== String(levelIndex + 1)) levelSelect.value = String(levelIndex + 1);
    statusEl.textContent = isComplete() ? tr('complete', steps) : tr('steps', steps);
    if (isComplete()) showVictoryOverlay();
    boardEl.innerHTML = '';
    boardEl.style.display = 'grid';
    const cols = state.map[0].length;
    const rows = state.map.length;
    const boardViewport = (boardWrapEl || boardEl.parentElement || root).getBoundingClientRect();
    const usableW = Math.max(240, boardViewport.width - 24);
    const usableH = Math.max(240, boardViewport.height - 24);
    const gap = clampInt(Math.floor(Math.min(6, Math.max(1, usableW / (cols * 20)))), 1, 6);
    const cellPx = clampInt(Math.floor(Math.min(
      (usableW - gap * (cols - 1)) / cols,
      (usableH - gap * (rows - 1)) / rows
    )), 12, 76);
    const iconPx = clampInt(Math.floor(cellPx * 0.72), 10, 56);
    const radius = clampInt(Math.floor(cellPx * 0.25), 4, 18);
    boardEl.style.gridTemplateColumns = `repeat(${cols}, ${cellPx}px)`;
    boardEl.style.gap = gap + 'px';

    const iconSvg = (kind, uid) => {
      const common = `width="${iconPx}" height="${iconPx}" viewBox="0 0 64 64" aria-hidden="true"`;
      if (kind === 'player') {
        const gId = `pBody_${uid}`;
        return `
          <svg ${common}>
            <defs>
              <linearGradient id="${gId}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#93c5fd"/>
                <stop offset="1" stop-color="#60a5fa"/>
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="22" fill="url(#${gId})" stroke="rgba(2,6,23,0.85)" stroke-width="3"/>
            <circle cx="24" cy="28" r="3.5" fill="rgba(2,6,23,0.7)"/>
            <circle cx="40" cy="28" r="3.5" fill="rgba(2,6,23,0.7)"/>
            <path d="M24 40c3 3 13 3 16 0" fill="none" stroke="rgba(2,6,23,0.6)" stroke-width="3" stroke-linecap="round"/>
            <path d="M44 39c6-3 8-7 6-12" fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="3" stroke-linecap="round"/>
          </svg>
        `;
      }
      if (kind === 'box') {
        const gId = `crate_${uid}`;
        return `
          <svg ${common}>
            <defs>
              <linearGradient id="${gId}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#fbbf24"/>
                <stop offset="1" stop-color="#f59e0b"/>
              </linearGradient>
            </defs>
            <rect x="14" y="16" width="36" height="36" rx="10" fill="url(#${gId})" stroke="rgba(2,6,23,0.85)" stroke-width="3"/>
            <path d="M18 28h28M18 40h28" stroke="rgba(120,53,15,0.45)" stroke-width="4" stroke-linecap="round"/>
            <path d="M24 20l16 28" stroke="rgba(2,6,23,0.18)" stroke-width="4" stroke-linecap="round"/>
            <path d="M19 21c6 2 10 2 16 0" stroke="rgba(255,255,255,0.24)" stroke-width="3" stroke-linecap="round"/>
          </svg>
        `;
      }
      if (kind === 'goal') {
        return `
          <svg ${common}>
            <circle cx="32" cy="32" r="20" fill="rgba(147,197,253,0.18)" stroke="rgba(191,219,254,0.95)" stroke-width="3"/>
            <circle cx="32" cy="32" r="12" fill="rgba(59,130,246,0.22)" stroke="rgba(59,130,246,0.85)" stroke-width="3"/>
            <circle cx="32" cy="32" r="4" fill="#fde68a" stroke="rgba(2,6,23,0.35)" stroke-width="2"/>
          </svg>
        `;
      }
      return '';
    };

    const fragment = document.createDocumentFragment();
    for (let r = 0; r < state.map.length; r++) {
      for (let c = 0; c < state.map[r].length; c++) {
        const cell = document.createElement('div');
        cell.style.width = cellPx + 'px';
        cell.style.height = cellPx + 'px';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        cell.style.borderRadius = radius + 'px';
        cell.style.fontWeight = '700';
        const type = cellType(r, c);
        if (type === 'wall') {
          cell.style.background = 'linear-gradient(180deg, rgba(51,65,85,1), rgba(30,41,59,1))';
          cell.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.06)';
        } else {
          cell.style.background = isGoal(r, c) ? 'linear-gradient(180deg, rgba(29,78,216,0.9), rgba(30,64,175,0.86))' : 'rgba(255,255,255,0.08)';
          cell.style.boxShadow = isGoal(r, c) ? 'inset 0 1px 0 rgba(255,255,255,0.10)' : 'inset 0 1px 0 rgba(255,255,255,0.06)';
        }
        if (type === 'player' || type === 'player-goal') {
          cell.innerHTML = iconSvg('player', `${levelIndex}_${r}_${c}`);
        } else if (type === 'box' || type === 'box-goal') {
          cell.innerHTML = iconSvg('box', `${levelIndex}_${r}_${c}`);
        } else if (type === 'goal') {
          cell.innerHTML = iconSvg('goal', `${levelIndex}_${r}_${c}`);
        }
        fragment.appendChild(cell);
      }
    }
    boardEl.appendChild(fragment);
  }

  function scheduleRender() {
    if (resizeFrame || !state) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      if (!root.isConnected || !state) return;
      render();
    });
  }

  function reset() {
    hideResultOverlay();
    persistLevelIndex(levelIndex);
    state = parseLevel(getLevel(levelIndex));
    steps = 0;
    render();
    warmupLevels(levelIndex);
    scheduleFocusGameHost();
  }

  function tt(key, fallback) {
    if (typeof t === 'function') return t(key, fallback);
    return fallback;
  }

  function openRestartConfirm() {
    const title = tt('confirmRestartGameTitle', 'Restart current game?');
    const desc = tt('confirmRestartGameDesc', 'Current game/level progress will be lost. Continue?');
    const confirmText = tt('confirmRestartGameBtn', tr('victoryReplay'));
    const cancelText = tt('cancel', 'Cancel');
    if (window.StarGameKit && StarGameKit.confirmDialog) {
      StarGameKit.confirmDialog({
        root,
        title,
        desc,
        confirmText,
        cancelText,
        onConfirm: () => reset(),
        onCancel: () => scheduleFocusGameHost()
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
        if (ok) reset();
        else scheduleFocusGameHost();
      });
    } else {
      scheduleFocusGameHost();
    }
  }

  function tryMove(dr, dc) {
    if (isComplete()) return;
    const nr = state.player.r + dr;
    const nc = state.player.c + dc;
    if (nr < 0 || nc < 0 || nr >= state.map.length || nc >= state.map[0].length) return;
    if (state.map[nr][nc] === '#') return;
    const nextKey = nr + ':' + nc;
    if (state.boxes.has(nextKey)) {
      const br = nr + dr;
      const bc = nc + dc;
      if (br < 0 || bc < 0 || br >= state.map.length || bc >= state.map[0].length) return;
      const boxKey = br + ':' + bc;
      if (state.map[br][bc] === '#' || state.boxes.has(boxKey)) return;
      state.boxes.delete(nextKey);
      state.boxes.add(boxKey);
    }
    state.player = { r: nr, c: nc };
    steps++;
    render();
  }

  function ensureLevelSelectOptions(forceRebuild) {
    if (!levelSelect) return;
    if (!forceRebuild && levelSelect.options && levelSelect.options.length === TOTAL_LEVELS) return;
    const cur = String(levelIndex + 1);
    levelSelect.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      const op = document.createElement('option');
      op.value = String(i);
      op.textContent = String(i);
      frag.appendChild(op);
    }
    levelSelect.appendChild(frag);
    levelSelect.value = cur;
  }

  function isInteractiveTarget(target) {
    return !!(target && target.closest && target.closest('select, option, button, input, textarea, label'));
  }

  root.addEventListener('click', e => {
    if (isInteractiveTarget(e.target)) return;
    focusGameHost();
  });
  container.addEventListener('keydown', e => {
    if (isInteractiveTarget(e.target)) return;
    const map = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      KeyW: [-1, 0],
      KeyS: [1, 0],
      KeyA: [0, -1],
      KeyD: [0, 1]
    };
    const entry = map[e.code] || map[e.key];
    if (!entry) return;
    e.preventDefault();
    tryMove(entry[0], entry[1]);
  });
  root.querySelectorAll('[data-dir]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = btn.getAttribute('data-dir');
      const map = { up: [-1,0], down: [1,0], left: [0,-1], right: [0,1] };
      tryMove(map[dir][0], map[dir][1]);
      scheduleFocusGameHost();
    });
  });
  prevBtn.addEventListener('click', () => {
    levelIndex = (levelIndex + TOTAL_LEVELS - 1) % TOTAL_LEVELS;
    reset();
  });
  nextBtn.addEventListener('click', () => {
    levelIndex = (levelIndex + 1) % TOTAL_LEVELS;
    reset();
  });
  if (levelSelect) {
    ensureLevelSelectOptions();
    levelSelect.addEventListener('click', e => e.stopPropagation());
    levelSelect.addEventListener('pointerdown', e => e.stopPropagation());
    levelSelect.addEventListener('keydown', e => e.stopPropagation());
    levelSelect.addEventListener('change', () => {
      const v = Number(levelSelect.value || (levelIndex + 1));
      const next = clampInt(isFinite(v) ? Math.floor(v) : (levelIndex + 1), 1, TOTAL_LEVELS);
      levelIndex = next - 1;
      reset();
      scheduleFocusGameHost();
    });
  window.addEventListener('star:locale-change', () => {
    ensureLevelSelectOptions(true);
    render();
  });
  }
  window.addEventListener('resize', scheduleRender);
  if (typeof ResizeObserver === 'function') {
    boardResizeObserver = new ResizeObserver(() => scheduleRender());
    boardResizeObserver.observe(boardWrapEl || root);
  }
  resetBtn.addEventListener('click', () => openRestartConfirm());
  levelIndex = readSavedLevelIndex();
  reset();
};