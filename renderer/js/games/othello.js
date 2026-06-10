
window.StarGames = window.StarGames || {};
window.StarGames.othello = function(container) {
  const root = container.querySelector('#game-othello');
  if (!root || root.dataset.bound === 'true') return;
  root.dataset.bound = 'true';
  function currentLocale() {
    return typeof getLocale === 'function' ? getLocale() : 'en';
  }
  const I18N = {
    'zh-CN': {
      easy: '智障模式',
      normal: '普通模式',
      hard: '困难模式',
      master: '大师模式',
      difficulty: '难度',
      restart: '重新开始',
      playAgain: '再来一局',
      retry: '重新挑战',
      humanWin: '你赢了，红方将死黑方',
      aiWin: '电脑获胜，黑方掌控全局',
      aiThinking: level => '电脑正在思考，当前难度：' + level,
      yourTurn: '轮到你走棋，红方先手',
      aiTurn: '轮到电脑走棋',
      redWins: '你赢了',
      redWinsText: '红方拿下胜局。',
      blackWins: '电脑获胜',
      blackWinsText: '黑方赢下本局。',
      aiMate: '电脑获胜，黑方将军得手',
      humanCaptureKing: '你赢了，成功吃掉黑将',
      noLegalMovesHuman: '你赢了，黑方已无合法着法',
      noLegalMovesAi: '电脑获胜，红方已无合法着法',
      chooseTarget: piece => '已选中 ' + piece + '，请选择目标位置',
      newGameStatus: level => '新对局开始，你执红先手，当前难度：' + level,
      redLabel: '红方',
      blackLabel: '黑方',
      riverLeft: '楚河',
      riverRight: '汉界'
    },
    'zh-TW': {
      easy: '簡單模式',
      normal: '普通模式',
      hard: '困難模式',
      master: '大師模式',
      difficulty: '難度',
      restart: '重新開始',
      playAgain: '再來一局',
      retry: '重新挑戰',
      humanWin: '你贏了，紅方將死黑方',
      aiWin: '電腦獲勝，黑方掌控全局',
      aiThinking: level => '電腦正在思考，當前難度：' + level,
      yourTurn: '輪到你走棋，紅方先手',
      aiTurn: '輪到電腦走棋',
      redWins: '你贏了',
      redWinsText: '紅方拿下勝局。',
      blackWins: '電腦獲勝',
      blackWinsText: '黑方贏下本局。',
      aiMate: '電腦獲勝，黑方將軍得手',
      humanCaptureKing: '你贏了，成功吃掉黑將',
      noLegalMovesHuman: '你贏了，黑方已無合法著法',
      noLegalMovesAi: '電腦獲勝，紅方已無合法著法',
      chooseTarget: piece => '已選中 ' + piece + '，請選擇目標位置',
      newGameStatus: level => '新對局開始，你執紅先手，當前難度：' + level,
      redLabel: '紅方',
      blackLabel: '黑方',
      riverLeft: '楚河',
      riverRight: '漢界'
    },
    en: {
      easy: 'Casual',
      normal: 'Normal',
      hard: 'Hard',
      master: 'Master',
      difficulty: 'Difficulty',
      restart: 'Restart',
      playAgain: 'Play again',
      retry: 'Try again',
      humanWin: 'You win. Red has the advantage',
      aiWin: 'Computer wins. Black controls the board',
      aiThinking: level => 'Computer is thinking. Difficulty: ' + level,
      yourTurn: 'Your turn. Red moves first',
      aiTurn: 'Computer to move',
      redWins: 'You win',
      redWinsText: 'Red takes the game.',
      blackWins: 'Computer wins',
      blackWinsText: 'Black takes the game.',
      aiMate: 'Computer wins by checkmating the red side',
      humanCaptureKing: 'You win by capturing the black general',
      noLegalMovesHuman: 'You win. Black has no legal move',
      noLegalMovesAi: 'Computer wins. Red has no legal move',
      chooseTarget: piece => piece + ' selected. Choose a destination',
      newGameStatus: level => 'New game started. You play red first. Difficulty: ' + level,
      redLabel: 'Red',
      blackLabel: 'Black',
      riverLeft: 'Chu River',
      riverRight: 'Han Border'
    },
    ja: {
      easy: 'かんたん',
      normal: 'ふつう',
      hard: 'むずかしい',
      master: 'マスター',
      difficulty: '難易度',
      restart: 'やり直す',
      playAgain: 'もう一局',
      retry: '再挑戦',
      humanWin: 'あなたの勝ちです。赤が優勢です',
      aiWin: 'コンピューターの勝ちです。黒が主導権を握りました',
      aiThinking: level => 'コンピューターが思考中です。難易度: ' + level,
      yourTurn: 'あなたの手番です。赤が先手です',
      aiTurn: 'コンピューターの手番です',
      redWins: 'あなたの勝ち',
      redWinsText: '赤が勝利しました。',
      blackWins: 'コンピューターの勝ち',
      blackWinsText: '黒が勝利しました。',
      aiMate: 'コンピューターが詰ませました',
      humanCaptureKing: 'あなたの勝ちです。黒の将を取りました',
      noLegalMovesHuman: 'あなたの勝ちです。黒に合法手がありません',
      noLegalMovesAi: 'コンピューターの勝ちです。赤に合法手がありません',
      chooseTarget: piece => piece + ' を選択しました。移動先を選んでください',
      newGameStatus: level => '新しい対局です。あなたは赤で先手です。難易度: ' + level,
      redLabel: '赤',
      blackLabel: '黒',
      riverLeft: '楚河',
      riverRight: '漢界'
    },
    ko: {
      easy: '쉬움',
      normal: '보통',
      hard: '어려움',
      master: '마스터',
      difficulty: '난이도',
      restart: '다시 시작',
      playAgain: '한 판 더',
      retry: '다시 도전',
      humanWin: '당신이 이겼습니다. 홍측이 우세합니다',
      aiWin: '컴퓨터가 이겼습니다. 흑측이 우세합니다',
      aiThinking: level => '컴퓨터가 생각 중입니다. 난이도: ' + level,
      yourTurn: '당신의 차례입니다. 홍측 선공',
      aiTurn: '컴퓨터 차례입니다',
      redWins: '당신 승리',
      redWinsText: '홍측이 승리했습니다.',
      blackWins: '컴퓨터 승리',
      blackWinsText: '흑측이 승리했습니다.',
      aiMate: '컴퓨터가 장군으로 승리했습니다',
      humanCaptureKing: '당신이 흑장을 잡아 승리했습니다',
      noLegalMovesHuman: '당신 승리. 흑측에 합법 수가 없습니다',
      noLegalMovesAi: '컴퓨터 승리. 홍측에 합법 수가 없습니다',
      chooseTarget: piece => piece + '을(를) 선택했습니다. 이동 위치를 고르세요',
      newGameStatus: level => '새 대국 시작. 당신은 홍측 선공입니다. 난이도: ' + level,
      redLabel: '홍측',
      blackLabel: '흑측',
      riverLeft: '초하',
      riverRight: '한계'
    }
  };
  const pieceSets = {
    'zh-CN': {
      r: { k: '帅', a: '仕', b: '相', n: '马', r: '车', c: '炮', p: '兵' },
      b: { k: '将', a: '士', b: '象', n: '马', r: '车', c: '炮', p: '卒' }
    },
    'zh-TW': {
      r: { k: '帥', a: '仕', b: '相', n: '馬', r: '車', c: '炮', p: '兵' },
      b: { k: '將', a: '士', b: '象', n: '馬', r: '車', c: '炮', p: '卒' }
    },
    en: {
      r: { k: 'K', a: 'A', b: 'B', n: 'N', r: 'R', c: 'C', p: 'P' },
      b: { k: 'K', a: 'A', b: 'B', n: 'N', r: 'R', c: 'C', p: 'P' }
    },
    ja: {
      r: { k: '王', a: '仕', b: '相', n: '馬', r: '車', c: '砲', p: '兵' },
      b: { k: '将', a: '士', b: '象', n: '馬', r: '車', c: '砲', p: '卒' }
    },
    ko: {
      r: { k: 'K', a: 'A', b: 'B', n: 'M', r: 'R', c: 'C', p: 'P' },
      b: { k: 'K', a: 'A', b: 'B', n: 'M', r: 'R', c: 'C', p: 'P' }
    }
  };
  function tr(key, ...args) {
    const table = I18N[currentLocale()] || I18N.en;
    const value = table[key] || I18N.en[key] || key;
    return typeof value === 'function' ? value(...args) : value;
  }

  const boardEl = root.querySelector('#othello-board');
  const statusEl = root.querySelector('#othello-status');
  const scoreEl = root.querySelector('#othello-score');
  const restartBtn = root.querySelector('#othello-restart');

  const HUMAN = 'r';
  const AI = 'b';
  const ROWS = 10;
  const COLS = 9;
  const CELL = 62;
  const PADDING_X = 36;
  const PADDING_Y = 36;
  const CANVAS_WIDTH = PADDING_X * 2 + CELL * (COLS - 1);
  const CANVAS_HEIGHT = PADDING_Y * 2 + CELL * (ROWS - 1);
  const MATE_SCORE = 900000;
  function getDifficultyLabel(level) {
    return tr(level);
  }
  function getPieceText() {
    return pieceSets[currentLocale()] || pieceSets.en;
  }
  const pieceValue = {
    k: 100000,
    r: 900,
    c: 460,
    n: 420,
    b: 220,
    a: 220,
    p: 110
  };

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvas.style.width = CANVAS_WIDTH + 'px';
  canvas.style.height = CANVAS_HEIGHT + 'px';
  canvas.style.maxWidth = '100%';
  canvas.style.borderRadius = '18px';
  canvas.style.boxShadow = '0 18px 40px rgba(0,0,0,0.3)';
  canvas.style.cursor = 'pointer';
  canvas.style.display = 'block';
  boardEl.innerHTML = '';
  boardEl.style.display = 'flex';
  boardEl.style.alignItems = 'center';
  boardEl.style.justifyContent = 'center';
  boardEl.style.overflow = 'auto';
  boardEl.style.padding = '6px 0';
  boardEl.appendChild(canvas);

  // 根据主题适配顶部文字颜色：棋盘区域较暗，浅色主题时需要用浅色文字
  try {
    const rootEl = document.documentElement;
    const applyTextColor = () => {
      const isLight = rootEl && rootEl.getAttribute('data-theme') === 'light';
      const color = isLight ? '#f9fafb' : '#e5e7eb';
      if (scoreEl) scoreEl.style.color = color;
      if (statusEl) statusEl.style.color = color;
    };
    applyTextColor();
    const _setAttribute = rootEl.setAttribute.bind(rootEl);
    rootEl.setAttribute = function(name, value) {
      _setAttribute(name, value);
      if (name === 'data-theme') applyTextColor();
    };
  } catch (_) {}

  let difficultyEl = null;
  let board = [];
  let current = HUMAN;
  let selected = null;
  let selectedMoves = [];
  let winner = '';
  let aiPending = false;
  let aiTimer = null;
  let difficulty = 'normal';
  let resultOverlay = null;

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
    // 结束弹窗不使用毛玻璃，保留棋局清晰可见
    overlay.style.background = 'rgba(7, 11, 20, 0.28)';
    overlay.style.backdropFilter = 'none';
    overlay.style.webkitBackdropFilter = 'none';
    overlay.style.zIndex = '20';

    const panel = document.createElement('div');
    panel.style.width = 'min(440px, 100%)';
    panel.style.padding = '28px 24px 22px';
    panel.style.borderRadius = '22px';
    panel.style.border = '1px solid rgba(255,255,255,0.14)';
    panel.style.background = 'linear-gradient(180deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92))';
    panel.style.boxShadow = '0 24px 60px rgba(0,0,0,0.38)';
    panel.style.textAlign = 'center';
    panel.innerHTML = `
      <div data-role="title" style="font-size:32px;font-weight:800;line-height:1.15;color:#f8fafc;margin-bottom:10px;"></div>
      <div data-role="text" style="font-size:14px;line-height:1.7;color:rgba(248,250,252,0.84);margin-bottom:18px;"></div>
      <button type="button" data-role="action" class="start-footer-btn" style="min-width:148px;font-size:15px;font-weight:700;">${tr('playAgain')}</button>
    `;
    overlay.appendChild(panel);
    root.appendChild(overlay);

    const actionBtn = panel.querySelector('[data-role="action"]');
    actionBtn.addEventListener('click', () => reset());
    // Let players inspect the final position: click outside the panel to dismiss the overlay.
    try { panel.addEventListener('click', (ev) => ev.stopPropagation()); } catch (_) {}
    try { overlay.addEventListener('click', () => hideResultOverlay()); } catch (_) {}
    resultOverlay = {
      el: overlay,
      title: panel.querySelector('[data-role="title"]'),
      text: panel.querySelector('[data-role="text"]'),
      actionBtn
    };
    return resultOverlay;
  }

  function showResultOverlay(title, text, actionText) {
    const overlay = ensureResultOverlay();
    overlay.title.textContent = title;
    overlay.text.textContent = text;
    overlay.actionBtn.textContent = actionText || tr('playAgain');
    overlay.el.style.display = 'flex';
  }

  function hideResultOverlay() {
    if (!resultOverlay) return;
    resultOverlay.el.style.display = 'none';
  }

  function ensureControls() {
    const toolbar = scoreEl && scoreEl.parentElement;
    if (!toolbar) return;
    toolbar.style.flexWrap = 'wrap';
    toolbar.style.alignItems = 'center';
    toolbar.style.gap = '10px';
    if (!toolbar.querySelector('#xiangqi-difficulty')) {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '8px';
      label.style.fontSize = '12px';
      label.style.color = 'var(--text-dim)';
      label.innerHTML = '<span data-role="difficulty-label">' + tr('difficulty') + '</span>';
      difficultyEl = document.createElement('select');
      difficultyEl.id = 'xiangqi-difficulty';
      difficultyEl.className = 'settings-input';
      difficultyEl.style.height = '32px';
      difficultyEl.style.minWidth = '132px';
      difficultyEl.style.padding = '0 36px 0 10px';
      difficultyEl.style.borderRadius = '10px';
      difficultyEl.style.border = '1px solid var(--border)';
      difficultyEl.style.background = '#1a1a2e';
      difficultyEl.style.color = '#f8fafc';
      difficultyEl.style.colorScheme = 'dark';
      [
        ['easy', tr('easy')],
        ['normal', tr('normal')],
        ['hard', tr('hard')],
        ['master', tr('master')]
      ].forEach(([value, text]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        option.style.backgroundColor = '#1a1a2e';
        option.style.color = '#f8fafc';
        difficultyEl.appendChild(option);
      });
      difficultyEl.value = difficulty;
      label.appendChild(difficultyEl);
      toolbar.insertBefore(label, restartBtn);
      difficultyEl.addEventListener('change', () => {
        difficulty = difficultyEl.value;
        reset();
      });
    } else {
      difficultyEl = toolbar.querySelector('#xiangqi-difficulty');
    }
    if (difficultyEl) {
      const difficultyLabelEl = toolbar.querySelector('[data-role="difficulty-label"]');
      if (difficultyLabelEl) difficultyLabelEl.textContent = tr('difficulty');
      difficultyEl.classList.add('settings-input');
      difficultyEl.style.background = '#1a1a2e';
      difficultyEl.style.color = '#f8fafc';
      difficultyEl.style.colorScheme = 'dark';
      Array.from(difficultyEl.options).forEach(option => {
        option.textContent = tr(option.value);
        option.style.backgroundColor = '#1a1a2e';
        option.style.color = '#f8fafc';
      });
    }
    restartBtn.textContent = tr('restart');
  }

  function createPiece(side, type) {
    return { side, type };
  }

  function createInitialBoard() {
    const nextBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    const blackBack = ['r', 'n', 'b', 'a', 'k', 'a', 'b', 'n', 'r'];
    const redBack = ['r', 'n', 'b', 'a', 'k', 'a', 'b', 'n', 'r'];
    for (let col = 0; col < COLS; col++) {
      nextBoard[0][col] = createPiece('b', blackBack[col]);
      nextBoard[9][col] = createPiece('r', redBack[col]);
    }
    nextBoard[2][1] = createPiece('b', 'c');
    nextBoard[2][7] = createPiece('b', 'c');
    nextBoard[7][1] = createPiece('r', 'c');
    nextBoard[7][7] = createPiece('r', 'c');
    [0, 2, 4, 6, 8].forEach(col => {
      nextBoard[3][col] = createPiece('b', 'p');
      nextBoard[6][col] = createPiece('r', 'p');
    });
    return nextBoard;
  }

  function cloneBoard(source) {
    return source.map(row => row.map(piece => piece ? { ...piece } : null));
  }

  function inside(row, col) {
    return row >= 0 && row < ROWS && col >= 0 && col < COLS;
  }

  function inPalace(side, row, col) {
    const validCols = col >= 3 && col <= 5;
    if (side === 'r') return validCols && row >= 7 && row <= 9;
    return validCols && row >= 0 && row <= 2;
  }

  function crossedRiver(side, row) {
    return side === 'r' ? row <= 4 : row >= 5;
  }

  function sameSide(a, b) {
    return a && b && a.side === b.side;
  }

  function findKing(targetBoard, side) {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const piece = targetBoard[row][col];
        if (piece && piece.side === side && piece.type === 'k') {
          return { row, col };
        }
      }
    }
    return null;
  }

  function clearBetweenFile(targetBoard, fromRow, toRow, col) {
    const step = fromRow < toRow ? 1 : -1;
    for (let row = fromRow + step; row !== toRow; row += step) {
      if (targetBoard[row][col]) return false;
    }
    return true;
  }

  function generalsFacing(targetBoard) {
    const redKing = findKing(targetBoard, 'r');
    const blackKing = findKing(targetBoard, 'b');
    if (!redKing || !blackKing || redKing.col !== blackKing.col) return false;
    return clearBetweenFile(targetBoard, redKing.row, blackKing.row, redKing.col);
  }

  function createMove(fromRow, fromCol, toRow, toCol, targetBoard) {
    return {
      fromRow,
      fromCol,
      toRow,
      toCol,
      piece: targetBoard[fromRow][fromCol],
      capture: targetBoard[toRow][toCol]
    };
  }

  function addMove(moves, fromRow, fromCol, toRow, toCol, targetBoard) {
    if (!inside(toRow, toCol)) return;
    const piece = targetBoard[fromRow][fromCol];
    const target = targetBoard[toRow][toCol];
    if (sameSide(piece, target)) return;
    moves.push(createMove(fromRow, fromCol, toRow, toCol, targetBoard));
  }

  function generatePseudoMovesForPiece(targetBoard, row, col) {
    const piece = targetBoard[row][col];
    if (!piece) return [];
    const moves = [];
    const enemy = piece.side === 'r' ? 'b' : 'r';
    if (piece.type === 'k') {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (inPalace(piece.side, nextRow, nextCol)) {
          addMove(moves, row, col, nextRow, nextCol, targetBoard);
        }
      });
      const enemyKing = findKing(targetBoard, enemy);
      if (enemyKing && enemyKing.col === col && clearBetweenFile(targetBoard, row, enemyKing.row, col)) {
        moves.push(createMove(row, col, enemyKing.row, enemyKing.col, targetBoard));
      }
      return moves;
    }
    if (piece.type === 'a') {
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (inPalace(piece.side, nextRow, nextCol)) {
          addMove(moves, row, col, nextRow, nextCol, targetBoard);
        }
      });
      return moves;
    }
    if (piece.type === 'b') {
      [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dr, dc]) => {
        const nextRow = row + dr;
        const nextCol = col + dc;
        const eyeRow = row + dr / 2;
        const eyeCol = col + dc / 2;
        const allowedSide = piece.side === 'r' ? nextRow >= 5 : nextRow <= 4;
        if (inside(nextRow, nextCol) && allowedSide && !targetBoard[eyeRow][eyeCol]) {
          addMove(moves, row, col, nextRow, nextCol, targetBoard);
        }
      });
      return moves;
    }
    if (piece.type === 'n') {
      [
        { dr: -2, dc: -1, lr: -1, lc: 0 },
        { dr: -2, dc: 1, lr: -1, lc: 0 },
        { dr: 2, dc: -1, lr: 1, lc: 0 },
        { dr: 2, dc: 1, lr: 1, lc: 0 },
        { dr: -1, dc: -2, lr: 0, lc: -1 },
        { dr: 1, dc: -2, lr: 0, lc: -1 },
        { dr: -1, dc: 2, lr: 0, lc: 1 },
        { dr: 1, dc: 2, lr: 0, lc: 1 }
      ].forEach(({ dr, dc, lr, lc }) => {
        const legRow = row + lr;
        const legCol = col + lc;
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (!inside(nextRow, nextCol) || targetBoard[legRow][legCol]) return;
        addMove(moves, row, col, nextRow, nextCol, targetBoard);
      });
      return moves;
    }
    if (piece.type === 'r' || piece.type === 'c') {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        let nextRow = row + dr;
        let nextCol = col + dc;
        let jumped = false;
        while (inside(nextRow, nextCol)) {
          const target = targetBoard[nextRow][nextCol];
          if (piece.type === 'r') {
            if (!target) {
              moves.push(createMove(row, col, nextRow, nextCol, targetBoard));
            } else {
              if (target.side !== piece.side) moves.push(createMove(row, col, nextRow, nextCol, targetBoard));
              break;
            }
          } else if (!jumped) {
            if (!target) {
              moves.push(createMove(row, col, nextRow, nextCol, targetBoard));
            } else {
              jumped = true;
            }
          } else if (target) {
            if (target.side !== piece.side) moves.push(createMove(row, col, nextRow, nextCol, targetBoard));
            break;
          }
          nextRow += dr;
          nextCol += dc;
        }
      });
      return moves;
    }
    if (piece.type === 'p') {
      const forward = piece.side === 'r' ? -1 : 1;
      addMove(moves, row, col, row + forward, col, targetBoard);
      if (crossedRiver(piece.side, row)) {
        addMove(moves, row, col, row, col - 1, targetBoard);
        addMove(moves, row, col, row, col + 1, targetBoard);
      }
      return moves;
    }
    return moves;
  }

  function applyMoveToBoard(targetBoard, move) {
    const nextBoard = cloneBoard(targetBoard);
    nextBoard[move.toRow][move.toCol] = nextBoard[move.fromRow][move.fromCol];
    nextBoard[move.fromRow][move.fromCol] = null;
    return nextBoard;
  }

  function isKingInCheck(side, targetBoard) {
    const king = findKing(targetBoard, side);
    if (!king) return true;
    if (generalsFacing(targetBoard)) return true;
    const enemy = side === 'r' ? 'b' : 'r';
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const piece = targetBoard[row][col];
        if (!piece || piece.side !== enemy) continue;
        const moves = generatePseudoMovesForPiece(targetBoard, row, col);
        if (moves.some(move => move.toRow === king.row && move.toCol === king.col)) {
          return true;
        }
      }
    }
    return false;
  }

  function generateLegalMoves(targetBoard, side) {
    const moves = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const piece = targetBoard[row][col];
        if (!piece || piece.side !== side) continue;
        generatePseudoMovesForPiece(targetBoard, row, col).forEach(move => {
          const nextBoard = applyMoveToBoard(targetBoard, move);
          if (!isKingInCheck(side, nextBoard)) {
            moves.push(move);
          }
        });
      }
    }
    return moves;
  }

  function pawnProgress(piece, row) {
    return piece.side === 'r' ? 9 - row : row;
  }

  function positionalScore(piece, row, col) {
    const fileCenter = 4 - Math.abs(col - 4);
    if (piece.type === 'r') return fileCenter * 6 + pawnProgress(piece, row) * 2;
    if (piece.type === 'c') return fileCenter * 7 + pawnProgress(piece, row) * 2;
    if (piece.type === 'n') return fileCenter * 10 + (4 - Math.abs((piece.side === 'r' ? row : 9 - row) - 4)) * 4;
    if (piece.type === 'p') {
      const crossed = crossedRiver(piece.side, row) ? 40 : 0;
      return pawnProgress(piece, row) * 14 + crossed + fileCenter * 4;
    }
    if (piece.type === 'k') return inPalace(piece.side, row, col) ? 10 : -200;
    if (piece.type === 'a' || piece.type === 'b') return 8;
    return 0;
  }

  function evaluateBoard(targetBoard) {
    const redKing = findKing(targetBoard, HUMAN);
    const blackKing = findKing(targetBoard, AI);
    if (!redKing) return MATE_SCORE;
    if (!blackKing) return -MATE_SCORE;
    let total = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const piece = targetBoard[row][col];
        if (!piece) continue;
        const base = pieceValue[piece.type] || 0;
        const pos = positionalScore(piece, row, col);
        total += piece.side === AI ? base + pos : -(base + pos);
      }
    }
    return total;
  }

  function moveOrderingScore(targetBoard, move) {
    const captureValue = move.capture ? (pieceValue[move.capture.type] || 0) * 14 : 0;
    const piece = targetBoard[move.fromRow][move.fromCol];
    const positionalGain = positionalScore(piece, move.toRow, move.toCol) - positionalScore(piece, move.fromRow, move.fromCol);
    const center = (4 - Math.abs(move.toCol - 4)) * 4;
    return captureValue + positionalGain + center;
  }

  function orderedMoves(targetBoard, side, limit) {
    const moves = generateLegalMoves(targetBoard, side).sort((left, right) => moveOrderingScore(targetBoard, right) - moveOrderingScore(targetBoard, left));
    return typeof limit === 'number' ? moves.slice(0, limit) : moves;
  }

  function search(targetBoard, side, depth, alpha, beta, moveLimit, ply) {
    const redKing = findKing(targetBoard, HUMAN);
    const blackKing = findKing(targetBoard, AI);
    if (!redKing) return MATE_SCORE - ply;
    if (!blackKing) return -MATE_SCORE + ply;
    if (depth === 0) return evaluateBoard(targetBoard);

    const moves = orderedMoves(targetBoard, side, moveLimit);
    if (!moves.length) {
      if (isKingInCheck(side, targetBoard)) {
        return side === AI ? -MATE_SCORE + ply : MATE_SCORE - ply;
      }
      return evaluateBoard(targetBoard);
    }

    if (side === AI) {
      let best = -Infinity;
      for (const move of moves) {
        const score = search(applyMoveToBoard(targetBoard, move), HUMAN, depth - 1, alpha, beta, moveLimit, ply + 1);
        if (score > best) best = score;
        if (score > alpha) alpha = score;
        if (alpha >= beta) break;
      }
      return best;
    }

    let best = Infinity;
    for (const move of moves) {
      const score = search(applyMoveToBoard(targetBoard, move), AI, depth - 1, alpha, beta, moveLimit, ply + 1);
      if (score < best) best = score;
      if (score < beta) beta = score;
      if (alpha >= beta) break;
    }
    return best;
  }

  function chooseEasyMove(legalMoves) {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  function chooseNormalMove(legalMoves) {
    const scored = legalMoves.map(move => {
      const score = evaluateBoard(applyMoveToBoard(board, move));
      return { move, score: score + moveOrderingScore(board, move) };
    }).sort((left, right) => right.score - left.score);
    if (scored.length > 1 && Math.random() < 0.35) {
      return scored[Math.min(1, scored.length - 1)].move;
    }
    return scored[0].move;
  }

  function chooseSearchMove(depth, moveLimit, allowMistake) {
    const candidates = orderedMoves(board, AI, difficulty === 'master' ? 10 : 14);
    if (!candidates.length) return null;
    const scored = candidates.map(move => ({
      move,
      score: search(applyMoveToBoard(board, move), HUMAN, depth - 1, -Infinity, Infinity, moveLimit, 1)
    })).sort((left, right) => right.score - left.score);
    if (allowMistake && scored.length > 1 && scored[0].score - scored[1].score < 160 && Math.random() < 0.28) {
      return scored[1].move;
    }
    return scored[0].move;
  }

  function chooseAIMove() {
    const legalMoves = generateLegalMoves(board, AI);
    if (!legalMoves.length) return null;
    if (difficulty === 'easy') return chooseEasyMove(legalMoves);
    if (difficulty === 'normal') return chooseNormalMove(legalMoves);
    if (difficulty === 'hard') return chooseSearchMove(2, 14, true);
    return chooseSearchMove(3, 10, false);
  }

  function formatMaterial() {
    const pieceText = getPieceText();
    const red = { r: 0, n: 0, c: 0, p: 0 };
    const black = { r: 0, n: 0, c: 0, p: 0 };
    board.forEach(row => row.forEach(piece => {
      if (!piece || !['r', 'n', 'c', 'p'].includes(piece.type)) return;
      if (piece.side === HUMAN) red[piece.type]++;
      else black[piece.type]++;
    }));
    scoreEl.textContent = `${tr('redLabel')} ${pieceText.r.r}${red.r} ${pieceText.r.n}${red.n} ${pieceText.r.c}${red.c} ${pieceText.r.p}${red.p}  |  ${tr('blackLabel')} ${pieceText.b.r}${black.r} ${pieceText.b.n}${black.n} ${pieceText.b.c}${black.c} ${pieceText.b.p}${black.p}`;
  }

  function updateStatus(text) {
    if (text) {
      statusEl.textContent = text;
      return;
    }
    if (winner === HUMAN) {
      statusEl.textContent = tr('humanWin');
      return;
    }
    if (winner === AI) {
      statusEl.textContent = tr('aiWin');
      return;
    }
    if (aiPending) {
      statusEl.textContent = tr('aiThinking', getDifficultyLabel(difficulty));
      return;
    }
    statusEl.textContent = current === HUMAN ? tr('yourTurn') : tr('aiTurn');
  }

  function getCanvasPoint(row, col) {
    return {
      x: PADDING_X + col * CELL,
      y: PADDING_Y + row * CELL
    };
  }

  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
    background.addColorStop(0, '#e9c792');
    background.addColorStop(1, '#d7aa6a');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#7c4a15';
    ctx.lineWidth = 2;
    for (let row = 0; row < ROWS; row++) {
      const y = PADDING_Y + row * CELL;
      ctx.beginPath();
      ctx.moveTo(PADDING_X, y);
      ctx.lineTo(PADDING_X + CELL * (COLS - 1), y);
      ctx.stroke();
    }
    for (let col = 0; col < COLS; col++) {
      const x = PADDING_X + col * CELL;
      ctx.beginPath();
      ctx.moveTo(x, PADDING_Y);
      ctx.lineTo(x, PADDING_Y + CELL * 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, PADDING_Y + CELL * 5);
      ctx.lineTo(x, PADDING_Y + CELL * 9);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(PADDING_X + CELL * 3, PADDING_Y);
    ctx.lineTo(PADDING_X + CELL * 5, PADDING_Y + CELL * 2);
    ctx.moveTo(PADDING_X + CELL * 5, PADDING_Y);
    ctx.lineTo(PADDING_X + CELL * 3, PADDING_Y + CELL * 2);
    ctx.moveTo(PADDING_X + CELL * 3, PADDING_Y + CELL * 7);
    ctx.lineTo(PADDING_X + CELL * 5, PADDING_Y + CELL * 9);
    ctx.moveTo(PADDING_X + CELL * 5, PADDING_Y + CELL * 7);
    ctx.lineTo(PADDING_X + CELL * 3, PADDING_Y + CELL * 9);
    ctx.stroke();

    ctx.fillStyle = 'rgba(124,74,21,0.22)';
    ctx.fillRect(PADDING_X + 8, PADDING_Y + CELL * 4 + 10, CELL * 8 - 16, CELL - 20);
    ctx.fillStyle = '#7c4a15';
    ctx.font = 'bold 28px KaiTi, STKaiti, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const riverY = Math.round(PADDING_Y + CELL * 4 + CELL / 2);
    ctx.fillText(tr('riverLeft'), PADDING_X + CELL * 2, riverY);
    ctx.fillText(tr('riverRight'), PADDING_X + CELL * 6, riverY);
  }

  function drawHints() {
    ctx.fillStyle = 'rgba(34,197,94,0.28)';
    selectedMoves.forEach(move => {
      const point = getCanvasPoint(move.toRow, move.toCol);
      ctx.beginPath();
      ctx.arc(point.x, point.y, move.capture ? 13 : 8, 0, Math.PI * 2);
      ctx.fill();
    });
    if (selected) {
      const point = getCanvasPoint(selected.row, selected.col);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 26, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawPieces() {
    const pieceText = getPieceText();
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const piece = board[row][col];
        if (!piece) continue;
        const point = getCanvasPoint(row, col);
        const gradient = ctx.createRadialGradient(point.x - 8, point.y - 8, 8, point.x, point.y, 30);
        gradient.addColorStop(0, '#fff8eb');
        gradient.addColorStop(1, '#e4c18c');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = piece.side === HUMAN ? '#b91c1c' : '#111827';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = piece.side === HUMAN ? '#b91c1c' : '#111827';
        ctx.font = 'bold 26px KaiTi, STKaiti, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pieceText[piece.side][piece.type], point.x, point.y + 1);
      }
    }
  }

  function render() {
    formatMaterial();
    updateStatus();
    drawBoard();
    drawHints();
    drawPieces();
  }

  function clearAITimer() {
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
  }

  function finishGame(winningSide, message) {
    winner = winningSide;
    aiPending = false;
    selected = null;
    selectedMoves = [];
    updateStatus(message);
    render();
    if (winningSide === HUMAN) {
      showResultOverlay(tr('redWins'), message || tr('redWinsText'), tr('playAgain'));
    } else if (winningSide === AI) {
      showResultOverlay(tr('blackWins'), message || tr('blackWinsText'), tr('retry'));
    }
  }

  function afterMove(sideJustMoved) {
    const nextSide = sideJustMoved === HUMAN ? AI : HUMAN;
    const nextMoves = generateLegalMoves(board, nextSide);
    const redKing = findKing(board, HUMAN);
    const blackKing = findKing(board, AI);
    if (!redKing) {
      finishGame(AI, tr('aiMate'));
      return;
    }
    if (!blackKing) {
      finishGame(HUMAN, tr('humanCaptureKing'));
      return;
    }
    if (!nextMoves.length) {
      finishGame(sideJustMoved, sideJustMoved === HUMAN ? tr('noLegalMovesHuman') : tr('noLegalMovesAi'));
      return;
    }
    current = nextSide;
    selected = null;
    selectedMoves = [];
    render();
    if (current === AI) queueAIMove();
  }

  function applyMove(move) {
    board = applyMoveToBoard(board, move);
    afterMove(move.piece.side);
  }

  function queueAIMove() {
    if (winner || current !== AI || aiPending) return;
    aiPending = true;
    updateStatus();
    render();
    clearAITimer();
    const delay = difficulty === 'master' ? 180 : difficulty === 'hard' ? 240 : 300;
    aiTimer = setTimeout(() => {
      aiPending = false;
      if (winner || current !== AI) return;
      const move = chooseAIMove();
      if (!move) {
        finishGame(HUMAN, tr('noLegalMovesHuman'));
        return;
      }
      applyMove(move);
    }, delay);
  }

  function findMoveForSelection(targetRow, targetCol) {
    return selectedMoves.find(move => move.toRow === targetRow && move.toCol === targetCol) || null;
  }

  function setSelection(row, col) {
    selected = { row, col };
    selectedMoves = generateLegalMoves(board, HUMAN).filter(move => move.fromRow === row && move.fromCol === col);
    render();
  }

  function handleBoardClick(row, col) {
    if (winner || aiPending || current !== HUMAN) return;
    const piece = inside(row, col) ? board[row][col] : null;
    if (piece && piece.side === HUMAN) {
      setSelection(row, col);
      updateStatus(tr('chooseTarget', getPieceText()[piece.side][piece.type]));
      return;
    }
    if (!selected) return;
    const move = findMoveForSelection(row, col);
    if (!move) {
      selected = null;
      selectedMoves = [];
      render();
      return;
    }
    applyMove(move);
  }

  function locateIntersection(clientX, clientY) {
    let x = 0, y = 0;
    if (window.StarGameKit && StarGameKit.getCanvasPoint) {
      const p = StarGameKit.getCanvasPoint(canvas, clientX, clientY);
      x = p.x; y = p.y;
    } else {
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width ? canvas.width / rect.width : 1;
      const scaleY = rect.height ? canvas.height / rect.height : 1;
      x = (clientX - rect.left) * scaleX;
      y = (clientY - rect.top) * scaleY;
    }
    const col = Math.round((x - PADDING_X) / CELL);
    const row = Math.round((y - PADDING_Y) / CELL);
    if (!inside(row, col)) return null;
    const point = getCanvasPoint(row, col);
    if (Math.abs(point.x - x) > 25 || Math.abs(point.y - y) > 25) return null;
    return { row, col };
  }

  function reset() {
    clearAITimer();
    hideResultOverlay();
    board = createInitialBoard();
    current = HUMAN;
    selected = null;
    selectedMoves = [];
    winner = '';
    aiPending = false;
    render();
    updateStatus(tr('newGameStatus', getDifficultyLabel(difficulty)));
  }

  function tt(key, fallback) {
    if (typeof t === 'function') return t(key, fallback);
    return fallback;
  }

  function openRestartConfirm() {
    const title = tt('confirmRestartGameTitle', 'Restart current game?');
    const desc = tt('confirmRestartGameDesc', 'Current game/level progress will be lost. Continue?');
    const confirmText = tt('confirmRestartGameBtn', tr('restart'));
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

  canvas.addEventListener('click', event => {
    const point = locateIntersection(event.clientX, event.clientY);
    if (!point) return;
    handleBoardClick(point.row, point.col);
  });

  restartBtn.addEventListener('click', () => openRestartConfirm());
  ensureControls();
  window.addEventListener('star:locale-change', () => {
    ensureControls();
    render();
  });
  reset();
};