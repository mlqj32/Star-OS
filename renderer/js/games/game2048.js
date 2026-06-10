
window.StarGames = window.StarGames || {};
window.StarGames.game2048 = function(container) {
  const root = container.querySelector('#game-2048');
  if (!root || root.dataset.bound === 'true') return;
  root.dataset.bound = 'true';
  function currentLocale() {
    return typeof getLocale === 'function' ? getLocale() : 'en';
  }
  const I18N = {
    'zh-CN': {
      moveHint: '方向键或下方按钮移动方块',
      noMoves: '没有可移动的位置了'
    },
    'zh-TW': {
      moveHint: '方向鍵或下方按鈕移動方塊',
      noMoves: '沒有可移動的位置了'
    },
    en: {
      moveHint: 'Use the arrow keys or buttons below to move tiles',
      noMoves: 'No more valid moves'
    },
    ja: {
      moveHint: '矢印キーまたは下のボタンでタイルを動かします',
      noMoves: 'もう動かせません'
    },
    ko: {
      moveHint: '방향키 또는 아래 버튼으로 타일을 이동하세요',
      noMoves: '더 이상 이동할 수 없습니다'
    }
  };
  function tr(key) {
    const table = I18N[currentLocale()] || I18N.en;
    return table[key] || I18N.en[key] || key;
  }

  function tt(key, fallback) {
    if (typeof t === 'function') return t(key, fallback);
    return fallback;
  }

  function openRestartConfirm() {
    const title = tt('confirmRestartGameTitle', 'Restart current game?');
    const desc = tt('confirmRestartGameDesc', 'Current game/level progress will be lost. Continue?');
    const confirmText = tt('confirmRestartGameBtn', 'Restart');
    const cancelText = tt('cancel', 'Cancel');
    if (window.StarGameKit && StarGameKit.confirmDialog) {
      StarGameKit.confirmDialog({
        root,
        title,
        desc,
        confirmText,
        cancelText,
        onConfirm: () => reset()
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
      });
    }
  }

  const gridEl = root.querySelector('#game2048-grid');
  const scoreEl = root.querySelector('#game2048-score');
  const bestEl = root.querySelector('#game2048-best');
  const statusEl = root.querySelector('#game2048-status');
  const newBtn = root.querySelector('#game2048-new');
  let board = [];
  let score = 0;
  let best = Number(localStorage.getItem('star-2048-best') || 0);

  function emptyBoard() {
    return Array.from({ length: 4 }, () => Array(4).fill(0));
  }

  function addRandomTile() {
    const spaces = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!board[r][c]) spaces.push([r, c]);
      }
    }
    if (!spaces.length) return;
    const [r, c] = spaces[Math.floor(Math.random() * spaces.length)];
    board[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function lineLeft(line) {
    const nums = line.filter(Boolean);
    const merged = [];
    let gain = 0;
    for (let i = 0; i < nums.length; i++) {
      if (nums[i] && nums[i] === nums[i + 1]) {
        const value = nums[i] * 2;
        merged.push(value);
        gain += value;
        i++;
      } else {
        merged.push(nums[i]);
      }
    }
    while (merged.length < 4) merged.push(0);
    return { line: merged, gain };
  }

  function move(dir) {
    const before = JSON.stringify(board);
    let gain = 0;
    if (dir === 'left' || dir === 'right') {
      board = board.map(row => {
        const source = dir === 'left' ? row.slice() : row.slice().reverse();
        const result = lineLeft(source);
        gain += result.gain;
        return dir === 'left' ? result.line : result.line.reverse();
      });
    } else {
      for (let c = 0; c < 4; c++) {
        const col = board.map(row => row[c]);
        const source = dir === 'up' ? col : col.slice().reverse();
        const result = lineLeft(source);
        gain += result.gain;
        const next = dir === 'up' ? result.line : result.line.reverse();
        for (let r = 0; r < 4; r++) board[r][c] = next[r];
      }
    }
    if (JSON.stringify(board) === before) return;
    score += gain;
    if (score > best) {
      best = score;
      localStorage.setItem('star-2048-best', String(best));
    }
    addRandomTile();
    render();
  }

  function hasMoves() {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!board[r][c]) return true;
        if (r < 3 && board[r][c] === board[r + 1][c]) return true;
        if (c < 3 && board[r][c] === board[r][c + 1]) return true;
      }
    }
    return false;
  }

  function tileColor(value) {
    return {
      0: 'rgba(255,255,255,0.08)',
      2: '#eee4da',
      4: '#ede0c8',
      8: '#f2b179',
      16: '#f59563',
      32: '#f67c5f',
      64: '#f65e3b',
      128: '#edcf72',
      256: '#edcc61',
      512: '#edc850',
      1024: '#edc53f',
      2048: '#edc22e'
    }[value] || '#3c3a32';
  }

  function render() {
    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
    statusEl.textContent = hasMoves() ? tr('moveHint') : tr('noMoves');
    gridEl.innerHTML = '';
    board.flat().forEach(value => {
      const tile = document.createElement('div');
      tile.className = 'game2048-tile';
      tile.dataset.v = String(value || 0);
      tile.style.fontSize = value >= 1024 ? '24px' : '30px';
      tile.style.background = tileColor(value);
      tile.style.color = value <= 4 ? '#776e65' : '#fff';
      tile.textContent = value ? String(value) : '';
      gridEl.appendChild(tile);
    });
  }

  function reset() {
    board = emptyBoard();
    score = 0;
    addRandomTile();
    addRandomTile();
    render();
  }

  root.addEventListener('click', () => root.focus());
  root.addEventListener('keydown', e => {
    const map = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down'
    };
    if (!map[e.key]) return;
    e.preventDefault();
    move(map[e.key]);
  });
  root.querySelectorAll('[data-dir]').forEach(btn => {
    btn.addEventListener('click', () => move(btn.getAttribute('data-dir')));
  });
  newBtn.addEventListener('click', () => openRestartConfirm());
  window.addEventListener('star:locale-change', render);
  bestEl.textContent = String(best);
  reset();
};