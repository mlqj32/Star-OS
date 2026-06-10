
// Star OS - Minesweeper (commercialized baseline: responsive layout, clean i18n, touch-friendly flagging)
window.StarGames = window.StarGames || {};
window.StarGames.minesweeper = function(container) {
  const root = container.querySelector('#game-minesweeper');
  if (!root || root.dataset.bound === 'true') return;
  root.dataset.bound = 'true';

  const boardEl = root.querySelector('#minesweeper-board');
  const infoEl = root.querySelector('#minesweeper-info');
  const restartBtn = root.querySelector('#minesweeper-restart');

  function tr(key, fallback, params) {
    if (typeof t === 'function') return t(key, fallback, params);
    if (!params) return fallback || key;
    return String(fallback || key).replace(/\{(\w+)\}/g, (_, name) => (params[name] == null ? '' : String(params[name])));
  }

  const MODES = {
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    expert: { rows: 16, cols: 30, mines: 99 }
  };
  let mode = 'beginner';
  try {
    const saved = localStorage.getItem('star-minesweeper-mode');
    if (saved && MODES[saved]) mode = saved;
  } catch (_) {}

  // Inject difficulty selector (keeps HTML templates stable).
  const header = restartBtn && restartBtn.parentElement;
  let modeEl = root.querySelector('#minesweeper-mode');
  if (header && !modeEl) {
    modeEl = document.createElement('select');
    modeEl.id = 'minesweeper-mode';
    modeEl.className = 'settings-input';
    modeEl.style.height = '30px';
    modeEl.style.padding = '0 10px';
    modeEl.style.borderRadius = '10px';
    modeEl.style.border = '1px solid rgba(255,255,255,.14)';
    modeEl.style.background = 'rgba(255,255,255,.06)';
    modeEl.style.color = 'var(--text)';
    modeEl.style.outline = 'none';
    modeEl.style.cursor = 'pointer';
    modeEl.style.fontSize = '12px';
    modeEl.style.minWidth = '140px';
    modeEl.innerHTML = `
      <option value="beginner">${tr('minesweeperBeginner', 'Beginner')}</option>
      <option value="intermediate">${tr('minesweeperIntermediate', 'Intermediate')}</option>
      <option value="expert">${tr('minesweeperExpert', 'Expert')}</option>
    `;
    header.insertBefore(modeEl, restartBtn);
  }
  if (modeEl) modeEl.value = mode;

  let rows = MODES[mode].rows;
  let cols = MODES[mode].cols;
  let mineCount = MODES[mode].mines;

  let board = [];
  let started = false;
  let gameOver = false;
  let revealed = 0;
  let flags = 0;

  function neighbors(r, c) {
    const list = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) list.push([nr, nc]);
      }
    }
    return list;
  }

  function makeCell() {
    return { mine: false, revealed: false, flagged: false, count: 0 };
  }

  function plantMines(safeR, safeC) {
    let placed = 0;
    while (placed < mineCount) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if ((r === safeR && c === safeC) || board[r][c].mine) continue;
      board[r][c].mine = true;
      placed++;
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        board[r][c].count = neighbors(r, c).filter(([nr, nc]) => board[nr][nc].mine).length;
      }
    }
  }

  function updateInfo(text) {
    infoEl.textContent = text || tr('minesweeperSummary', 'Mines: {mines}  Flags: {flags}  Opened: {opened}', { mines: mineCount, flags, opened: revealed });
  }

  function reveal(r, c) {
    const cell = board[r][c];
    if (cell.revealed || cell.flagged || gameOver) return;
    if (!started) {
      started = true;
      plantMines(r, c);
    }
    cell.revealed = true;
    revealed++;
    if (cell.mine) {
      gameOver = true;
      board.forEach(row => row.forEach(item => { if (item.mine) item.revealed = true; }));
      updateInfo(tr('minesweeperHitMine', 'You hit a mine'));
      render();
      return;
    }
    if (cell.count === 0) {
      neighbors(r, c).forEach(([nr, nc]) => {
        if (!board[nr][nc].revealed) reveal(nr, nc);
      });
    }
    if (revealed === rows * cols - mineCount) {
      gameOver = true;
      updateInfo(tr('minesweeperCleared', 'Mines cleared'));
    } else {
      updateInfo();
    }
    render();
  }

  function toggleFlag(r, c) {
    const cell = board[r][c];
    if (cell.revealed || gameOver) return;
    cell.flagged = !cell.flagged;
    flags += cell.flagged ? 1 : -1;
    updateInfo();
    render();
  }

  function cellSizePx() {
    const rect = root.getBoundingClientRect();
    const usableW = Math.max(220, rect.width - 18);
    const usableH = Math.max(220, rect.height - 110);
    const s = Math.floor(Math.min(usableW / cols, usableH / rows));
    return Math.max(18, Math.min(34, s - 2));
  }

  function numberColor(n) {
    const map = {
      1: '#60a5fa',
      2: '#34d399',
      3: '#fb7185',
      4: '#a78bfa',
      5: '#f59e0b',
      6: '#22c55e',
      7: '#e2e8f0',
      8: '#94a3b8'
    };
    return map[n] || '#e2e8f0';
  }

  function render() {
    const cellPx = cellSizePx();
    boardEl.innerHTML = '';
    boardEl.classList.add('ms-board');
    boardEl.style.display = 'grid';
    boardEl.style.gridTemplateColumns = `repeat(${cols}, ${cellPx}px)`;
    boardEl.style.setProperty('--ms-cell', `${cellPx}px`);
    boardEl.style.setProperty('--ms-r', `${Math.max(8, Math.floor(cellPx * 0.25))}px`);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        const btn = document.createElement('button');
        btn.className = 'ms-cell';
        btn.classList.toggle('ms-revealed', !!cell.revealed);
        btn.classList.toggle('ms-flagged', !!cell.flagged);
        btn.style.lineHeight = '1';
        btn.style.userSelect = 'none';
        btn.style.touchAction = 'none';
        if (cell.revealed) {
          if (cell.mine) {
            btn.textContent = '●';
            btn.classList.add('ms-mine');
          } else if (cell.count) {
            btn.textContent = String(cell.count);
            btn.style.color = numberColor(cell.count);
          } else {
            btn.textContent = '';
          }
        } else if (cell.flagged) {
          btn.textContent = '⚑';
          // Color handled by CSS (.ms-cell.ms-flagged)
        }

        // Mouse: click to reveal. Touch/Pen: tap handled via pointerup for reliability in small-cell modes (expert).
        let suppressClick = false;
        btn.addEventListener('click', e => {
          if (suppressClick) {
            suppressClick = false;
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (e.shiftKey) { toggleFlag(r, c); return; }
          reveal(r, c);
        });
        btn.addEventListener('contextmenu', e => {
          e.preventDefault();
          toggleFlag(r, c);
        });
        let pressTimer = null;
        let didLongPress = false;
        let downX = 0;
        let downY = 0;
        const clearPress = () => { if (pressTimer) clearTimeout(pressTimer); pressTimer = null; };
        btn.addEventListener('pointerdown', e => {
          didLongPress = false;
          suppressClick = false;
          downX = e.clientX;
          downY = e.clientY;
          // Long-press flagging should only apply to touch/pen. On mouse, it makes clicks feel unreliable (especially in expert mode).
          if (!e || (e.pointerType !== 'touch' && e.pointerType !== 'pen')) return;
          clearPress();
          pressTimer = setTimeout(() => { didLongPress = true; toggleFlag(r, c); }, 420);
        });
        btn.addEventListener('pointermove', e => {
          if (!pressTimer) return;
          if (!e || (e.pointerType !== 'touch' && e.pointerType !== 'pen')) return;
          if (Math.abs(e.clientX - downX) > 10 || Math.abs(e.clientY - downY) > 10) clearPress();
        });
        btn.addEventListener('pointerup', e => {
          if (!e || (e.pointerType !== 'touch' && e.pointerType !== 'pen')) { clearPress(); return; }
          suppressClick = true;
          clearPress();
          if (didLongPress) {
            didLongPress = false;
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          reveal(r, c);
          e.preventDefault();
          e.stopPropagation();
        });
        btn.addEventListener('pointercancel', clearPress);
        btn.addEventListener('pointerleave', clearPress);
        boardEl.appendChild(btn);
      }
    }
  }

  function reset() {
    rows = MODES[mode].rows;
    cols = MODES[mode].cols;
    mineCount = MODES[mode].mines;
    board = Array.from({ length: rows }, () => Array.from({ length: cols }, makeCell));
    started = false;
    gameOver = false;
    revealed = 0;
    flags = 0;
    updateInfo();
    render();
  }

  if (modeEl) {
    modeEl.addEventListener('change', () => {
      mode = modeEl.value;
      try { localStorage.setItem('star-minesweeper-mode', mode); } catch (_) {}
      reset();
    });
  }
  restartBtn.addEventListener('click', reset);
  window.addEventListener('resize', () => { if (board.length) render(); });

  reset();
};