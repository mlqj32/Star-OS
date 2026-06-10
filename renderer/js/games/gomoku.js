
window.StarGames = window.StarGames || {};
window.StarGames.gomoku = function(container) {
  const root = container.querySelector('#game-gomoku');
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
      hint: '你执黑棋先手，电脑执白棋。不同难度会使用不同强度的判断、堵棋和搜索策略。',
      humanWin: '你赢了，黑棋完成五连',
      aiWin: '电脑获胜，白棋完成五连',
      draw: '平局，棋盘已满',
      aiThinking: level => '电脑正在思考，当前难度：' + level,
      humanTurn: '轮到你落子，黑棋先手',
      playAgain: '再来一局',
      retry: '重新挑战',
      restart: '重新开始',
      resultHumanTitle: '你赢了',
      resultHumanText: '黑棋完成五连，拿下本局。',
      resultAiTitle: '电脑获胜',
      resultAiText: '白棋率先完成五连，再试一局。',
      resultDrawTitle: '平局',
      resultDrawText: '棋盘已经落满，双方都没有再形成五连。',
      newGameStatus: level => '新对局开始，你执黑棋先手，当前难度：' + level
    },
    'zh-TW': {
      easy: '簡單模式',
      normal: '普通模式',
      hard: '困難模式',
      master: '大師模式',
      difficulty: '難度',
      hint: '你執黑棋先手，電腦執白棋。不同難度會使用不同強度的判斷、堵棋和搜索策略。',
      humanWin: '你贏了，黑棋完成五連',
      aiWin: '電腦獲勝，白棋完成五連',
      draw: '平局，棋盤已滿',
      aiThinking: level => '電腦正在思考，當前難度：' + level,
      humanTurn: '輪到你落子，黑棋先手',
      playAgain: '再來一局',
      retry: '重新挑戰',
      restart: '重新開始',
      resultHumanTitle: '你贏了',
      resultHumanText: '黑棋完成五連，拿下本局。',
      resultAiTitle: '電腦獲勝',
      resultAiText: '白棋率先完成五連，再試一局。',
      resultDrawTitle: '平局',
      resultDrawText: '棋盤已經落滿，雙方都沒有再形成五連。',
      newGameStatus: level => '新對局開始，你執黑棋先手，當前難度：' + level
    },
    en: {
      easy: 'Casual',
      normal: 'Normal',
      hard: 'Hard',
      master: 'Master',
      difficulty: 'Difficulty',
      hint: 'You play black and move first. The computer plays white with stronger judgement and search at higher difficulties.',
      humanWin: 'You win. Black made five in a row',
      aiWin: 'Computer wins. White made five in a row',
      draw: 'Draw. The board is full',
      aiThinking: level => 'Computer is thinking. Difficulty: ' + level,
      humanTurn: 'Your move. Black goes first',
      playAgain: 'Play again',
      retry: 'Try again',
      restart: 'Restart',
      resultHumanTitle: 'You win',
      resultHumanText: 'Black completed five in a row.',
      resultAiTitle: 'Computer wins',
      resultAiText: 'White completed five in a row first.',
      resultDrawTitle: 'Draw',
      resultDrawText: 'The board is full and neither side formed another five.',
      newGameStatus: level => 'New game started. You play black first. Difficulty: ' + level
    },
    ja: {
      easy: 'かんたん',
      normal: 'ふつう',
      hard: 'むずかしい',
      master: 'マスター',
      difficulty: '難易度',
      hint: 'あなたは黒で先手です。難易度が上がるほど、判断力や読みが強くなります。',
      humanWin: 'あなたの勝ちです。黒が五連を作りました',
      aiWin: 'コンピューターの勝ちです。白が五連を作りました',
      draw: '引き分けです。盤面が埋まりました',
      aiThinking: level => 'コンピューターが思考中です。難易度: ' + level,
      humanTurn: 'あなたの手番です。黒が先手です',
      playAgain: 'もう一局',
      retry: '再挑戦',
      restart: 'やり直す',
      resultHumanTitle: 'あなたの勝ち',
      resultHumanText: '黒が五連を完成させました。',
      resultAiTitle: 'コンピューターの勝ち',
      resultAiText: '白が先に五連を完成させました。',
      resultDrawTitle: '引き分け',
      resultDrawText: '盤面が埋まり、どちらも五連を作れませんでした。',
      newGameStatus: level => '新しい対局です。あなたは黒で先手です。難易度: ' + level
    },
    ko: {
      easy: '쉬움',
      normal: '보통',
      hard: '어려움',
      master: '마스터',
      difficulty: '난이도',
      hint: '당신은 흑돌 선공입니다. 난이도가 높을수록 판단과 수읽기가 강해집니다.',
      humanWin: '당신이 이겼습니다. 흑돌이 오목을 만들었습니다',
      aiWin: '컴퓨터가 이겼습니다. 백돌이 오목을 만들었습니다',
      draw: '무승부입니다. 판이 가득 찼습니다',
      aiThinking: level => '컴퓨터가 생각 중입니다. 난이도: ' + level,
      humanTurn: '당신의 차례입니다. 흑돌 선공',
      playAgain: '한 판 더',
      retry: '다시 도전',
      restart: '다시 시작',
      resultHumanTitle: '당신 승리',
      resultHumanText: '흑돌이 오목을 완성했습니다.',
      resultAiTitle: '컴퓨터 승리',
      resultAiText: '백돌이 먼저 오목을 완성했습니다.',
      resultDrawTitle: '무승부',
      resultDrawText: '판이 가득 차 더 이상 오목이 나오지 않았습니다.',
      newGameStatus: level => '새 대국 시작. 당신은 흑돌 선공입니다. 난이도: ' + level
    }
  };
  function tr(key, ...args) {
    const table = I18N[currentLocale()] || I18N.en;
    const value = table[key] || I18N.en[key] || key;
    return typeof value === 'function' ? value(...args) : value;
  }

  const canvas = root.querySelector('#gomoku-canvas');
  const statusEl = root.querySelector('#gomoku-status');
  const restartBtn = root.querySelector('#gomoku-restart');
  const ctx = canvas.getContext('2d');

  const HUMAN = 1;
  const AI = 2;
  const size = 15;
  const cell = 40;
  const padding = 20;
  const boardSize = padding * 2 + cell * (size - 1);
  const center = Math.floor(size / 2);
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  function getDifficultyLabel(level) {
    return tr(level);
  }

  canvas.width = boardSize;
  canvas.height = boardSize;

  let difficultyEl = root.querySelector('#gomoku-difficulty');
  let board = [];
  let current = HUMAN;
  let winner = 0;
  let moves = 0;
  let lastMove = null;
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
    panel.style.width = 'min(420px, 100%)';
    panel.style.padding = '26px 24px 22px';
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
    const toolbar = statusEl && statusEl.parentElement;
    if (!toolbar) return;
    toolbar.style.flexWrap = 'wrap';
    toolbar.style.gap = '10px';
    toolbar.style.alignItems = 'center';
    if (!difficultyEl) {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '8px';
      label.style.fontSize = '12px';
      label.style.color = 'var(--text-dim)';

      const text = document.createElement('span');
      text.dataset.role = 'difficulty-label';
      text.textContent = tr('difficulty');

      difficultyEl = document.createElement('select');
      difficultyEl.id = 'gomoku-difficulty';
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
      ].forEach(([value, labelText]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = labelText;
        option.style.backgroundColor = '#1a1a2e';
        option.style.color = '#f8fafc';
        if (value === 'normal') option.selected = true;
        difficultyEl.appendChild(option);
      });

      label.appendChild(text);
      label.appendChild(difficultyEl);
      toolbar.insertBefore(label, restartBtn);
    }

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

    const hint = root.querySelector('p');
    if (hint) {
      hint.textContent = tr('hint');
    }
  }

  function inBounds(row, col) {
    return row >= 0 && row < size && col >= 0 && col < size;
  }

  function otherPlayer(player) {
    return player === HUMAN ? AI : HUMAN;
  }

  function boardHasStone(targetBoard) {
    return targetBoard.some(row => row.some(cellValue => cellValue !== 0));
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
    if (moves === size * size) {
      statusEl.textContent = tr('draw');
      return;
    }
    if (aiPending || current === AI) {
      statusEl.textContent = tr('aiThinking', getDifficultyLabel(difficulty));
      return;
    }
    statusEl.textContent = tr('humanTurn');
  }

  function drawStone(row, col, player) {
    const x = padding + col * cell;
    const y = padding + row * cell;
    const gradient = ctx.createRadialGradient(x - 6, y - 6, 4, x, y, 16);
    if (player === HUMAN) {
      gradient.addColorStop(0, '#666');
      gradient.addColorStop(1, '#111');
    } else {
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(1, '#d8d8d8');
    }
    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = player === HUMAN ? '#000' : '#999';
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#d9a85f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#6c4b1f';
    ctx.lineWidth = 1;
    for (let index = 0; index < size; index++) {
      const position = padding + index * cell;
      ctx.beginPath();
      ctx.moveTo(padding, position);
      ctx.lineTo(canvas.width - padding, position);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(position, padding);
      ctx.lineTo(position, canvas.height - padding);
      ctx.stroke();
    }
    [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]].forEach(([row, col]) => {
      ctx.beginPath();
      ctx.fillStyle = '#4e3312';
      ctx.arc(padding + col * cell, padding + row * cell, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (board[row][col]) drawStone(row, col, board[row][col]);
      }
    }
    if (lastMove) {
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.arc(padding + lastMove.col * cell, padding + lastMove.row * cell, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function checkWinnerAt(targetBoard, row, col) {
    const player = targetBoard[row][col];
    if (!player) return false;
    return directions.some(([dr, dc]) => {
      let count = 1;
      let nextRow = row + dr;
      let nextCol = col + dc;
      while (inBounds(nextRow, nextCol) && targetBoard[nextRow][nextCol] === player) {
        count++;
        nextRow += dr;
        nextCol += dc;
      }
      nextRow = row - dr;
      nextCol = col - dc;
      while (inBounds(nextRow, nextCol) && targetBoard[nextRow][nextCol] === player) {
        count++;
        nextRow -= dr;
        nextCol -= dc;
      }
      return count >= 5;
    });
  }

  function analyzeDirection(targetBoard, row, col, dr, dc, player) {
    let count = 1;
    let openEnds = 0;
    let nextRow = row + dr;
    let nextCol = col + dc;
    while (inBounds(nextRow, nextCol) && targetBoard[nextRow][nextCol] === player) {
      count++;
      nextRow += dr;
      nextCol += dc;
    }
    if (inBounds(nextRow, nextCol) && targetBoard[nextRow][nextCol] === 0) openEnds++;
    nextRow = row - dr;
    nextCol = col - dc;
    while (inBounds(nextRow, nextCol) && targetBoard[nextRow][nextCol] === player) {
      count++;
      nextRow -= dr;
      nextCol -= dc;
    }
    if (inBounds(nextRow, nextCol) && targetBoard[nextRow][nextCol] === 0) openEnds++;
    return { count, openEnds };
  }

  function scorePattern(count, openEnds) {
    if (count >= 5) return 100000000;
    if (count === 4 && openEnds === 2) return 2800000;
    if (count === 4 && openEnds === 1) return 320000;
    if (count === 3 && openEnds === 2) return 90000;
    if (count === 3 && openEnds === 1) return 8500;
    if (count === 2 && openEnds === 2) return 2200;
    if (count === 2 && openEnds === 1) return 220;
    if (count === 1 && openEnds === 2) return 36;
    return 8;
  }

  function centerBonus(row, col) {
    return 18 - (Math.abs(row - center) + Math.abs(col - center));
  }

  function inspectPoint(targetBoard, row, col, player) {
    if (targetBoard[row][col] !== 0) return null;
    targetBoard[row][col] = player;
    let total = 0;
    let openFours = 0;
    let blockedFours = 0;
    let openThrees = 0;
    let openTwos = 0;
    let winning = false;

    for (const [dr, dc] of directions) {
      const result = analyzeDirection(targetBoard, row, col, dr, dc, player);
      if (result.count >= 5) winning = true;
      total += scorePattern(result.count, result.openEnds);
      if (result.count === 4 && result.openEnds === 2) openFours++;
      if (result.count === 4 && result.openEnds === 1) blockedFours++;
      if (result.count === 3 && result.openEnds === 2) openThrees++;
      if (result.count === 2 && result.openEnds === 2) openTwos++;
    }

    targetBoard[row][col] = 0;

    if (winning) {
      return {
        winning: true,
        openFours,
        blockedFours,
        openThrees,
        openTwos,
        threat: 6,
        score: 1000000000
      };
    }

    let threat = 0;
    if (openFours > 0) threat = 5;
    else if (blockedFours > 1 || (blockedFours > 0 && openThrees > 0) || openThrees > 1) threat = 4;
    else if (blockedFours > 0) threat = 3;
    else if (openThrees > 0) threat = 2;
    else if (openTwos > 1) threat = 1;

    total += centerBonus(row, col);
    if (openFours > 0) total += 5000000;
    if (blockedFours > 1) total += 1200000;
    if (blockedFours > 0 && openThrees > 0) total += 1100000;
    if (openThrees > 1) total += 900000;
    if (openThrees > 0 && openTwos > 0) total += 18000;

    return {
      winning: false,
      openFours,
      blockedFours,
      openThrees,
      openTwos,
      threat,
      score: total
    };
  }

  function collectEmptyMoves(targetBoard) {
    const result = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (targetBoard[row][col] === 0) result.push({ row, col });
      }
    }
    return result;
  }

  function collectNearbyMoves(targetBoard) {
    if (!boardHasStone(targetBoard)) return [{ row: center, col: center }];
    const seen = new Set();
    const result = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!targetBoard[row][col]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nextRow = row + dr;
            const nextCol = col + dc;
            if (!inBounds(nextRow, nextCol) || targetBoard[nextRow][nextCol] !== 0) continue;
            const key = nextRow + ':' + nextCol;
            if (seen.has(key)) continue;
            seen.add(key);
            result.push({ row: nextRow, col: nextCol });
          }
        }
      }
    }
    return result.length ? result : collectEmptyMoves(targetBoard);
  }

  function rankCandidateMoves(targetBoard, player, limit) {
    const opponent = otherPlayer(player);
    const ranked = collectNearbyMoves(targetBoard).map(move => {
      const attack = inspectPoint(targetBoard, move.row, move.col, player);
      const defense = inspectPoint(targetBoard, move.row, move.col, opponent);
      return {
        row: move.row,
        col: move.col,
        attackScore: attack ? attack.score : -Infinity,
        defenseScore: defense ? defense.score : -Infinity,
        attackThreat: attack ? attack.threat : -1,
        defenseThreat: defense ? defense.threat : -1,
        attack,
        defense,
        score: (attack ? attack.score : 0) * 1.12 + (defense ? defense.score : 0) * 1.02 + centerBonus(move.row, move.col)
      };
    }).sort((left, right) => {
      if (right.attackThreat !== left.attackThreat) return right.attackThreat - left.attackThreat;
      if (right.defenseThreat !== left.defenseThreat) return right.defenseThreat - left.defenseThreat;
      return right.score - left.score;
    });
    return typeof limit === 'number' ? ranked.slice(0, limit) : ranked;
  }

  function weightedRandom(candidates) {
    const weighted = candidates.map((candidate, index) => ({
      candidate,
      weight: Math.max(1, candidates.length - index) + Math.max(0, candidate.defenseThreat * 3)
    }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let random = Math.random() * total;
    for (const entry of weighted) {
      random -= entry.weight;
      if (random <= 0) return entry.candidate;
    }
    return weighted[0].candidate;
  }

  function evaluateBoard(targetBoard) {
    const aiMoves = rankCandidateMoves(targetBoard, AI, 6);
    const humanMoves = rankCandidateMoves(targetBoard, HUMAN, 6);
    const aiScore = (aiMoves[0] ? aiMoves[0].score : 0) + (aiMoves[1] ? aiMoves[1].score * 0.42 : 0) + (aiMoves[2] ? aiMoves[2].score * 0.15 : 0);
    const humanScore = (humanMoves[0] ? humanMoves[0].score : 0) + (humanMoves[1] ? humanMoves[1].score * 0.42 : 0) + (humanMoves[2] ? humanMoves[2].score * 0.15 : 0);
    const tactical = (aiMoves[0] ? aiMoves[0].attackThreat * 400000 : 0) - (humanMoves[0] ? humanMoves[0].attackThreat * 460000 : 0);
    return aiScore - humanScore * 1.08 + tactical;
  }

  function search(targetBoard, depth, alpha, beta, player, lastPlaced, moveLimit, ply) {
    if (lastPlaced && checkWinnerAt(targetBoard, lastPlaced.row, lastPlaced.col)) {
      return lastPlaced.player === AI ? 900000000 - ply : -900000000 + ply;
    }
    if (depth === 0) return evaluateBoard(targetBoard);

    const candidates = rankCandidateMoves(targetBoard, player, moveLimit);
    if (!candidates.length) return evaluateBoard(targetBoard);

    if (player === AI) {
      let best = -Infinity;
      for (const candidate of candidates) {
        targetBoard[candidate.row][candidate.col] = player;
        const score = search(
          targetBoard,
          depth - 1,
          alpha,
          beta,
          HUMAN,
          { row: candidate.row, col: candidate.col, player },
          moveLimit,
          ply + 1
        );
        targetBoard[candidate.row][candidate.col] = 0;
        if (score > best) best = score;
        if (score > alpha) alpha = score;
        if (alpha >= beta) break;
      }
      return best;
    }

    let best = Infinity;
    for (const candidate of candidates) {
      targetBoard[candidate.row][candidate.col] = player;
      const score = search(
        targetBoard,
        depth - 1,
        alpha,
        beta,
        AI,
        { row: candidate.row, col: candidate.col, player },
        moveLimit,
        ply + 1
      );
      targetBoard[candidate.row][candidate.col] = 0;
      if (score < best) best = score;
      if (score < beta) beta = score;
      if (alpha >= beta) break;
    }
    return best;
  }

  function chooseForcedMove(aiCandidates, minDefenseThreat) {
    const winning = aiCandidates.find(candidate => candidate.attack && candidate.attack.winning);
    if (winning) return winning;
    const blockers = aiCandidates.filter(candidate => candidate.defenseThreat >= minDefenseThreat);
    if (!blockers.length) return null;
    blockers.sort((left, right) => {
      if (right.defenseThreat !== left.defenseThreat) return right.defenseThreat - left.defenseThreat;
      if (right.defenseScore !== left.defenseScore) return right.defenseScore - left.defenseScore;
      return right.score - left.score;
    });
    return blockers[0];
  }

  function chooseEasyMove() {
    const aiCandidates = rankCandidateMoves(board, AI, 20);
    if (!aiCandidates.length) return null;
    const winning = aiCandidates.find(candidate => candidate.attack && candidate.attack.winning);
    if (winning) return winning;
    const choices = aiCandidates.slice(0, 12);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function chooseNormalMove() {
    const aiCandidates = rankCandidateMoves(board, AI, 14);
    if (!aiCandidates.length) return null;
    const forced = chooseForcedMove(aiCandidates, 5);
    if (forced) return forced;
    const veryDangerous = aiCandidates.find(candidate => candidate.defenseThreat >= 4);
    if (veryDangerous) return veryDangerous;
    return weightedRandom(aiCandidates.slice(0, 6));
  }

  function chooseSearchMove(depth, moveLimit, topCount, defenseThreshold, allowMistake) {
    const aiCandidates = rankCandidateMoves(board, AI, topCount);
    if (!aiCandidates.length) return null;

    const forced = chooseForcedMove(aiCandidates, defenseThreshold);
    if (forced) return forced;

    const scored = [];
    for (const candidate of aiCandidates) {
      board[candidate.row][candidate.col] = AI;
      const score = checkWinnerAt(board, candidate.row, candidate.col)
        ? 900000000
        : search(board, depth - 1, -Infinity, Infinity, HUMAN, { row: candidate.row, col: candidate.col, player: AI }, moveLimit, 1);
      board[candidate.row][candidate.col] = 0;
      scored.push({ ...candidate, searchScore: score });
    }
    scored.sort((left, right) => right.searchScore - left.searchScore);
    if (allowMistake && scored[1] && scored[0].searchScore - scored[1].searchScore < 90000 && Math.random() < 0.22) {
      return scored[1];
    }
    return scored[0];
  }

  function chooseAIMove() {
    if (difficulty === 'easy') return chooseEasyMove();
    if (difficulty === 'normal') return chooseNormalMove();
    if (difficulty === 'hard') return chooseSearchMove(2, 10, 10, 4, true);
    return chooseSearchMove(moves >= 10 ? 4 : 3, 8, 12, 3, false);
  }

  function clearAITimer() {
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
  }

  function finishTurn(row, col, player) {
    board[row][col] = player;
    moves++;
    lastMove = { row, col, player };
    if (checkWinnerAt(board, row, col)) {
      winner = player;
    } else if (moves < size * size) {
      current = otherPlayer(player);
    }
    updateStatus();
    draw();
    if (winner === HUMAN) {
      showResultOverlay(tr('resultHumanTitle'), tr('resultHumanText'), tr('playAgain'));
    } else if (winner === AI) {
      showResultOverlay(tr('resultAiTitle'), tr('resultAiText'), tr('retry'));
    } else if (moves >= size * size) {
      showResultOverlay(tr('resultDrawTitle'), tr('resultDrawText'), tr('restart'));
    }
    if (!winner && moves < size * size && current === AI) {
      queueAIMove();
    }
  }

  function queueAIMove() {
    if (winner || aiPending) return;
    aiPending = true;
    updateStatus();
    draw();
    clearAITimer();
    const delay = difficulty === 'master' ? 180 : difficulty === 'hard' ? 220 : 260;
    aiTimer = setTimeout(() => {
      aiPending = false;
      if (winner || current !== AI) return;
      const move = chooseAIMove();
      if (!move) {
        updateStatus();
        draw();
        return;
      }
      finishTurn(move.row, move.col, AI);
    }, delay);
  }

  function reset() {
    clearAITimer();
    hideResultOverlay();
    board = Array.from({ length: size }, () => Array(size).fill(0));
    current = HUMAN;
    winner = 0;
    moves = 0;
    lastMove = null;
    aiPending = false;
    updateStatus(tr('newGameStatus', getDifficultyLabel(difficulty)));
    draw();
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
    if (winner || current !== HUMAN || aiPending) return;
    let x = 0, y = 0;
    if (window.StarGameKit && StarGameKit.getCanvasPoint) {
      const p = StarGameKit.getCanvasPoint(canvas, event.clientX, event.clientY);
      x = p.x; y = p.y;
    } else {
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width ? canvas.width / rect.width : 1;
      const scaleY = rect.height ? canvas.height / rect.height : 1;
      x = (event.clientX - rect.left) * scaleX;
      y = (event.clientY - rect.top) * scaleY;
    }
    const col = Math.round((x - padding) / cell);
    const row = Math.round((y - padding) / cell);
    if (!inBounds(row, col)) return;
    const centerX = padding + col * cell;
    const centerY = padding + row * cell;
    if (Math.abs(x - centerX) > 16 || Math.abs(y - centerY) > 16) return;
    if (board[row][col]) return;
    finishTurn(row, col, HUMAN);
  });

  ensureControls();
  difficulty = difficultyEl ? difficultyEl.value : 'normal';
  restartBtn.addEventListener('click', () => openRestartConfirm());
  if (difficultyEl) {
    difficultyEl.addEventListener('change', () => {
      difficulty = difficultyEl.value;
      reset();
    });
  }

  window.addEventListener('star:locale-change', () => {
    ensureControls();
    updateStatus();
  });
  reset();
};