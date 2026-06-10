
window.StarGames = window.StarGames || {};
window.StarGames.solitaire = function(container) {
  const root = container.querySelector('#game-solitaire');
  if (!root || root.dataset.bound === 'true') return;
  root.dataset.bound = 'true';
  function currentLocale() {
    return typeof getLocale === 'function' ? getLocale() : 'en';
  }
  const I18N = {
    'zh-CN': {
      restart: '重新开局',
      completedStatus: '蜘蛛纸牌完成',
      defaultStatus: '将同花色的 K 到 A 排成完整序列并清除。',
      noMoreDeals: '没有更多发牌了',
      emptyColumnDeal: '空列时不能继续发牌',
      noMovesTitle: '无可行动',
      noMovesText: '当前牌面已没有可移动的牌，并且也没有剩余发牌了。你可以重新开局再试一次。',
      victoryTitle: '通关成功',
      victoryText: '八组完整同花顺都已经清除，蜘蛛纸牌挑战完成。',
      playAgain: '再玩一局',
      foundationPlaceholder: 'K-A'
    },
    'zh-TW': {
      restart: '重新開局',
      completedStatus: '蜘蛛紙牌完成',
      defaultStatus: '將同花色的 K 到 A 排成完整序列並清除。',
      noMoreDeals: '沒有更多發牌了',
      emptyColumnDeal: '空列時不能繼續發牌',
      noMovesTitle: '無可行動',
      noMovesText: '目前牌面已沒有可移動的牌，並且也沒有剩餘發牌了。你可以重新開局再試一次。',
      victoryTitle: '過關成功',
      victoryText: '八組完整同花順都已經清除，蜘蛛紙牌挑戰完成。',
      playAgain: '再玩一局',
      foundationPlaceholder: 'K-A'
    },
    en: {
      restart: 'Restart',
      completedStatus: 'Spider Solitaire completed',
      defaultStatus: 'Build complete same-suit runs from K to A and clear them.',
      noMoreDeals: 'No more deals left',
      emptyColumnDeal: 'You cannot deal while a column is empty',
      noMovesTitle: 'No moves',
      noMovesText: 'No valid moves remain and there are no deals left. You can restart and try again.',
      victoryTitle: 'Victory',
      victoryText: 'All eight complete runs have been cleared. Spider Solitaire finished.',
      playAgain: 'Play again',
      foundationPlaceholder: 'K-A'
    },
    ja: {
      restart: '新しく始める',
      completedStatus: 'スパイダーソリティアをクリアしました',
      defaultStatus: '同じスートで K から A までの並びを作って取り除きます。',
      noMoreDeals: 'これ以上配れません',
      emptyColumnDeal: '空の列がある間は配れません',
      noMovesTitle: '手詰まり',
      noMovesText: '動かせる手がなく、配れるカードも残っていません。やり直してもう一度挑戦できます。',
      victoryTitle: 'クリア',
      victoryText: '8 組の完成した並びをすべて取り除きました。',
      playAgain: 'もう一度',
      foundationPlaceholder: 'K-A'
    },
    ko: {
      restart: '새 게임',
      completedStatus: '스파이더 카드 완료',
      defaultStatus: '같은 무늬의 K부터 A까지 순서를 만들어 제거하세요.',
      noMoreDeals: '더 이상 나눠줄 카드가 없습니다',
      emptyColumnDeal: '빈 열이 있으면 카드를 더 나눌 수 없습니다',
      noMovesTitle: '더 이상 이동할 수 없음',
      noMovesText: '이동 가능한 수가 없고 남은 배분도 없습니다. 새 게임으로 다시 시도할 수 있어요.',
      victoryTitle: '클리어',
      victoryText: '완성된 8개의 무늬 순서를 모두 제거했습니다.',
      playAgain: '다시 하기',
      foundationPlaceholder: 'K-A'
    }
  };
  function tr(key) {
    const table = I18N[currentLocale()] || I18N.en;
    return table[key] || I18N.en[key] || key;
  }

  const stockEl = root.querySelector('#solitaire-stock');
  const foundationsEl = root.querySelector('#solitaire-foundations');
  const tableauEl = root.querySelector('#solitaire-tableau');
  const statusEl = root.querySelector('#solitaire-status');
  const completeEl = root.querySelector('#spider-complete');
  const movesEl = root.querySelector('#spider-moves');
  const newBtn = root.querySelector('#solitaire-new');

  if (!stockEl || !foundationsEl || !tableauEl || !statusEl || !completeEl || !movesEl || !newBtn) return;

  let stock = [];
  let tableau = [];
  let completed = 0;
  let moves = 0;
  let selected = null;
  let dragState = null;
  let suppressClick = false;
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
    overlay.style.background = 'rgba(7, 11, 20, 0.6)';
    overlay.style.backdropFilter = 'blur(6px)';
    overlay.style.zIndex = '20';

    const panel = document.createElement('div');
    panel.style.width = 'min(420px, 100%)';
    panel.style.padding = '28px 24px 22px';
    panel.style.borderRadius = '22px';
    panel.style.border = '1px solid rgba(255,255,255,0.14)';
    panel.style.background = 'linear-gradient(180deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92))';
    panel.style.boxShadow = '0 24px 60px rgba(0,0,0,0.38)';
    panel.style.textAlign = 'center';
    panel.innerHTML = `
      <div data-role="title" style="font-size:32px;font-weight:800;line-height:1.15;color:#f8fafc;margin-bottom:10px;"></div>
      <div data-role="text" style="font-size:14px;line-height:1.7;color:rgba(248,250,252,0.84);margin-bottom:18px;"></div>
      <button type="button" data-role="action" class="start-footer-btn" style="min-width:148px;font-size:15px;font-weight:700;">${tr('restart')}</button>
    `;
    overlay.appendChild(panel);
    root.appendChild(overlay);

    const actionBtn = panel.querySelector('[data-role="action"]');
    actionBtn.addEventListener('click', () => reset());
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
    overlay.actionBtn.textContent = actionText || tr('restart');
    overlay.el.style.display = 'flex';
  }

  function hideResultOverlay() {
    if (!resultOverlay) return;
    resultOverlay.el.style.display = 'none';
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

  function rankText(rank) {
    return { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[rank] || String(rank);
  }

  function makeDeck() {
    const deck = [];
    for (let copy = 0; copy < 8; copy++) {
      for (let rank = 1; rank <= 13; rank++) {
        deck.push({ suit: 'S', rank, faceUp: false, id: 'S-' + copy + '-' + rank + '-' + Math.random().toString(36).slice(2, 8) });
      }
    }
    for (let index = deck.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
    }
    return deck;
  }

  function revealTop(pileIndex) {
    const pile = tableau[pileIndex];
    if (pile.length && !pile[pile.length - 1].faceUp) pile[pile.length - 1].faceUp = true;
  }

  function isMovableSequence(pileIndex, cardIndex) {
    const pile = tableau[pileIndex];
    if (!pile[cardIndex] || !pile[cardIndex].faceUp) return false;
    for (let index = cardIndex; index < pile.length - 1; index++) {
      if (!pile[index + 1].faceUp) return false;
      if (pile[index].rank !== pile[index + 1].rank + 1) return false;
    }
    return true;
  }

  function getSelectedCards() {
    if (!selected) return [];
    return tableau[selected.pile].slice(selected.index);
  }

  function getCardsFrom(pileIndex, cardIndex) {
    return tableau[pileIndex].slice(cardIndex);
  }

  function canDropOn(targetPileIndex, cards) {
    if (!cards.length) return false;
    const pile = tableau[targetPileIndex];
    if (!pile.length) return true;
    const top = pile[pile.length - 1];
    return top.faceUp && top.rank === cards[0].rank + 1;
  }

  function hasAnyMove() {
    if (!tableau || tableau.length !== 10) return true;
    for (let sourcePileIndex = 0; sourcePileIndex < 10; sourcePileIndex++) {
      const pile = tableau[sourcePileIndex];
      for (let cardIndex = 0; cardIndex < pile.length; cardIndex++) {
        const card = pile[cardIndex];
        if (!card || !card.faceUp) continue;
        if (!isMovableSequence(sourcePileIndex, cardIndex)) continue;
        const cards = pile.slice(cardIndex);
        for (let targetPileIndex = 0; targetPileIndex < 10; targetPileIndex++) {
          if (targetPileIndex === sourcePileIndex) continue;
          if (canDropOn(targetPileIndex, cards)) return true;
        }
      }
    }
    return false;
  }

  function collectCompletedRuns() {
    tableau.forEach((pile, pileIndex) => {
      if (pile.length < 13) return;
      const tail = pile.slice(-13);
      const completeRun = tail.every((card, index) => card.faceUp && card.rank === 13 - index);
      if (!completeRun) return;
      tableau[pileIndex].splice(pile.length - 13, 13);
      completed++;
      revealTop(pileIndex);
    });
  }

  function updateStatus(text) {
    completeEl.textContent = String(completed);
    movesEl.textContent = String(moves);
    if (text) statusEl.textContent = text;
    else if (completed === 8) statusEl.textContent = tr('completedStatus');
    else statusEl.textContent = tr('defaultStatus');
  }

  function moveCards(sourcePileIndex, cardIndex, targetPileIndex) {
    const cards = getCardsFrom(sourcePileIndex, cardIndex);
    if (!cards.length || sourcePileIndex === targetPileIndex || !canDropOn(targetPileIndex, cards)) return false;
    tableau[targetPileIndex].push(...cards);
    tableau[sourcePileIndex].splice(cardIndex, cards.length);
    revealTop(sourcePileIndex);
    selected = null;
    moves++;
    collectCompletedRuns();
    render();
    return true;
  }

  function tryMoveTo(targetPileIndex) {
    if (!selected) return false;
    return moveCards(selected.pile, selected.index, targetPileIndex);
  }

  function dealFromStock() {
    if (!stock.length) {
      updateStatus(tr('noMoreDeals'));
      return;
    }
    if (tableau.some(pile => pile.length === 0)) {
      updateStatus(tr('emptyColumnDeal'));
      return;
    }
    for (let pileIndex = 0; pileIndex < 10; pileIndex++) {
      const card = stock.pop();
      card.faceUp = true;
      tableau[pileIndex].push(card);
    }
    selected = null;
    moves++;
    collectCompletedRuns();
    render();
  }

  function cardSvg(card) {
    const label = rankText(card.rank);
    return `<svg viewBox="0 0 80 110" width="100%" height="100%"><rect x="1.5" y="1.5" width="77" height="107" rx="10" fill="${card.faceUp ? '#ffffff' : '#1d4ed8'}" stroke="${card.faceUp ? '#cbd5e1' : '#60a5fa'}" stroke-width="2"/>${card.faceUp ? `<text x="12" y="18" font-size="16" font-family="Arial" fill="#0f172a">${label}</text><path d="M40 28c6 6 10 10 10 17 0 6-4.6 11-10 11s-10-5-10-11c0-7 4-11 10-17z" fill="#111827"/><path d="M40 56v17" stroke="#111827" stroke-width="4" stroke-linecap="round"/><text x="68" y="98" text-anchor="end" font-size="16" font-family="Arial" fill="#0f172a">${label}</text>` : `<rect x="10" y="10" width="60" height="90" rx="8" fill="rgba(255,255,255,0.15)"/><path d="M22 24h36M22 40h36M22 56h36M22 72h36" stroke="#bfdbfe" stroke-width="4" stroke-linecap="round"/>`}</svg>`;
  }

  function renderStock() {
    stockEl.innerHTML = '';
    const piles = Math.ceil(stock.length / 10);
    for (let index = 0; index < 5; index++) {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'start-footer-btn';
      slot.style.position = 'relative';
      slot.style.height = '90px';
      slot.style.padding = '0';
      slot.style.borderRadius = '12px';
      slot.style.background = index < piles ? 'rgba(29,78,216,0.32)' : 'rgba(255,255,255,0.05)';
      slot.style.overflow = 'hidden';
      if (index < piles) slot.innerHTML = `<svg viewBox="0 0 80 110" width="100%" height="100%"><rect x="1.5" y="1.5" width="77" height="107" rx="10" fill="#1d4ed8" stroke="#60a5fa" stroke-width="2"/><rect x="10" y="10" width="60" height="90" rx="8" fill="rgba(255,255,255,0.15)"/><path d="M22 24h36M22 40h36M22 56h36M22 72h36" stroke="#bfdbfe" stroke-width="4" stroke-linecap="round"/></svg>`;
      slot.addEventListener('click', dealFromStock);
      stockEl.appendChild(slot);
    }
  }

  function renderFoundations() {
    foundationsEl.innerHTML = '';
    for (let index = 0; index < 8; index++) {
      const slot = document.createElement('div');
      slot.className = 'start-footer-btn';
      slot.style.height = '90px';
      slot.style.padding = '0';
      slot.style.borderRadius = '12px';
      slot.style.background = 'rgba(255,255,255,0.05)';
      slot.style.display = 'flex';
      slot.style.alignItems = 'center';
      slot.style.justifyContent = 'center';
      slot.style.overflow = 'hidden';
      slot.innerHTML = index < completed
        ? cardSvg({ rank: 13, faceUp: true })
        : `<div style="opacity:0.35;color:#fff;font-size:12px;">${tr('foundationPlaceholder')}</div>`;
      foundationsEl.appendChild(slot);
    }
  }

  function renderTableau() {
    tableauEl.innerHTML = '';
    tableau.forEach((pile, pileIndex) => {
      const column = document.createElement('div');
      column.dataset.solitairePile = String(pileIndex);
      column.style.position = 'relative';
      column.style.minHeight = '560px';
      column.style.borderRadius = '14px';
      column.style.background = 'rgba(255,255,255,0.03)';
      column.style.padding = '4px';
      column.style.overflow = 'hidden';
      column.addEventListener('click', () => {
        if (selected) tryMoveTo(pileIndex);
      });
      pile.forEach((card, cardIndex) => {
        const cardEl = document.createElement('div');
        cardEl.dataset.solitairePile = String(pileIndex);
        cardEl.dataset.solitaireIndex = String(cardIndex);
        cardEl.style.position = 'absolute';
        cardEl.style.left = '4px';
        cardEl.style.right = '4px';
        cardEl.style.top = (cardIndex * 28) + 'px';
        cardEl.style.height = '90px';
        cardEl.style.cursor = card.faceUp && isMovableSequence(pileIndex, cardIndex) ? 'grab' : (card.faceUp ? 'pointer' : 'default');
        cardEl.style.touchAction = 'none';
        if (selected && selected.pile === pileIndex && selected.index === cardIndex) cardEl.style.filter = 'drop-shadow(0 0 12px rgba(56,189,248,0.7))';
        cardEl.innerHTML = cardSvg(card);
        cardEl.addEventListener('pointerdown', event => {
          if (!card.faceUp || !isMovableSequence(pileIndex, cardIndex)) return;
          dragState = {
            pointerId: event.pointerId,
            sourcePile: pileIndex,
            cardIndex,
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
            ghost: null,
            offsetX: 36,
            offsetY: 22
          };
        });
        cardEl.addEventListener('click', event => {
          event.stopPropagation();
          if (suppressClick) {
            suppressClick = false;
            return;
          }
          if (!card.faceUp) return;
          if (selected && tryMoveTo(pileIndex)) return;
          if (!isMovableSequence(pileIndex, cardIndex)) return;
          if (selected && selected.pile === pileIndex && selected.index === cardIndex) selected = null;
          else selected = { pile: pileIndex, index: cardIndex };
          render();
        });
        column.appendChild(cardEl);
      });
      tableauEl.appendChild(column);
    });
  }

  function buildDragGhost(cards) {
    const ghost = document.createElement('div');
    ghost.style.position = 'fixed';
    ghost.style.left = '0';
    ghost.style.top = '0';
    ghost.style.width = '72px';
    ghost.style.height = Math.max(90, 90 + (cards.length - 1) * 28) + 'px';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '999999';
    ghost.style.opacity = '0.96';
    ghost.style.filter = 'drop-shadow(0 14px 28px rgba(15,23,42,0.48))';
    cards.forEach((card, index) => {
      const ghostCard = document.createElement('div');
      ghostCard.style.position = 'absolute';
      ghostCard.style.left = '0';
      ghostCard.style.right = '0';
      ghostCard.style.top = (index * 28) + 'px';
      ghostCard.style.height = '90px';
      ghostCard.innerHTML = cardSvg(card);
      ghost.appendChild(ghostCard);
    });
    document.body.appendChild(ghost);
    return ghost;
  }

  function updateDragGhostPosition(clientX, clientY) {
    if (!dragState || !dragState.ghost) return;
    dragState.ghost.style.transform = `translate(${Math.round(clientX - dragState.offsetX)}px, ${Math.round(clientY - dragState.offsetY)}px)`;
  }

  function getPileIndexFromPoint(clientX, clientY) {
    const target = document.elementFromPoint(clientX, clientY);
    if (!target) return null;
    const pileEl = target.closest('[data-solitaire-pile]');
    if (!pileEl) return null;
    const pileIndex = Number(pileEl.getAttribute('data-solitaire-pile'));
    return Number.isInteger(pileIndex) ? pileIndex : null;
  }

  function cleanupDrag() {
    if (!dragState) return;
    if (dragState.ghost && dragState.ghost.parentNode) dragState.ghost.parentNode.removeChild(dragState.ghost);
    dragState = null;
  }

  function handlePointerMove(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    if (!dragState.moved) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      dragState.moved = true;
      dragState.ghost = buildDragGhost(getCardsFrom(dragState.sourcePile, dragState.cardIndex));
      selected = { pile: dragState.sourcePile, index: dragState.cardIndex };
      suppressClick = true;
      updateDragGhostPosition(event.clientX, event.clientY);
      render();
      return;
    }
    updateDragGhostPosition(event.clientX, event.clientY);
  }

  function handlePointerUp(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const activeDrag = dragState;
    const targetPileIndex = activeDrag.moved ? getPileIndexFromPoint(event.clientX, event.clientY) : null;
    cleanupDrag();
    if (!activeDrag.moved) return;
    if (targetPileIndex != null) {
      if (!moveCards(activeDrag.sourcePile, activeDrag.cardIndex, targetPileIndex)) render();
      return;
    }
    selected = null;
    render();
  }

  function render() {
    renderStock();
    renderFoundations();
    renderTableau();
    updateStatus();
    const stuck = completed < 8 && stock.length === 0 && !hasAnyMove();
    if (completed === 8) showResultOverlay(tr('victoryTitle'), tr('victoryText'), tr('playAgain'));
    else if (stuck) showResultOverlay(tr('noMovesTitle'), tr('noMovesText'), tr('restart'));
    else hideResultOverlay();
  }

  function reset() {
    const deck = makeDeck();
    tableau = Array.from({ length: 10 }, () => []);
    completed = 0;
    moves = 0;
    selected = null;
    hideResultOverlay();
    cleanupDrag();
    for (let pileIndex = 0; pileIndex < 10; pileIndex++) {
      const cardCount = pileIndex < 4 ? 6 : 5;
      for (let index = 0; index < cardCount; index++) {
        const card = deck.pop();
        card.faceUp = index === cardCount - 1;
        tableau[pileIndex].push(card);
      }
    }
    stock = deck.map(card => ({ ...card, faceUp: false }));
    render();
  }

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerUp);
  newBtn.addEventListener('click', () => openRestartConfirm());
  window.addEventListener('star:locale-change', render);
  reset();
};