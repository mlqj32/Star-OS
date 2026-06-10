
/** Star OS - 斗地主（叫地主 / 左-右-下布局 / 大王小王 / 完整牌型） */
window.StarGames = window.StarGames || {};
window.StarGames.landlord = function(container) {
  const LANDLORD_I18N = {
    'zh-CN': {
      smallJoker: '小王',
      bigJoker: '大王',
      ready: '点击开始发牌',
      askBid: '是否叫地主？',
      landlordTitle: '地主',
      upper: '上家',
      lower: '下家',
      youPlayed: '你出的牌',
      upperPlayed: '上家出的牌',
      lowerPlayed: '下家出的牌',
      yourTurn: '轮到你出牌',
      waitUpper: '等待上家出牌',
      waitLower: '等待下家出牌',
      youLandlordLead: '你是地主，请先出牌',
      upperLandlordLead: '上家是地主，等待其出牌',
      lowerLandlordLead: '下家是地主，等待其出牌',
      playerLandlordWin: '你（地主）胜利！',
      playerFarmerWin: '你（农民）胜利！',
      landlordWin: '地主胜利',
      farmersWin: '农民胜利',
      invalidPlay: '无效牌型',
      cannotBeat: '牌不能压过上家/下家',
      cannotBeatPassTip: '这轮要不起，请点“不出”',
      youPlayedWaitUpper: '你出牌，等待上家',
      youPassedWaitUpper: '你选择不出，等待上家',
      restartGame: '重新开始',
      playAgain: '再来一局',
      restartGameConfirmTitle: '确认重新开始？',
      restartGameConfirmDesc: '当前牌局进度会丢失，确定要重新开始吗？',
      restartGameConfirmBtn: '重新开始',
      resultFeedbackDesc: '点击下方按钮可立即开始下一局。',
      settlementTitle: '牌局结算',
      settlementWinner: text => `获胜方：${text}`,
      settlementReason: text => `胜因：${text}`,
      settlementReasonEmpty: '先出完手牌',
      settlementLastHand: text => `终局最后一手：${text}`,
      settlementNoHand: '无',
      settlementLeft: (name, n) => `${name} 剩余 ${n} 张`,
      settlementCards: (name, cards) => `${name} 余牌：${cards}`,
      settlementLandlordRole: '地主',
      settlementFarmerRole: '农民',
      you: '你',
      playStatus: name => `${name} 出牌`,
      passStatus: name => `${name} 不出`,
      reactions: {
        passRocket: ['火箭太狠了，这轮我过。', '这手火箭接不住。'],
        passBomb: ['炸弹太大了，我过。', '这一炸弹我不要了。'],
        passBig: ['这手太大了，先不跟。', '压不过，先过。'],
        passSmall: ['先过一轮，再看看。', '这轮先不出。'],
        playAny: ['轮到我了，看牌。', '我来出一手。'],
        playBeat: ['这手我能压住。', '接上，这个更大。']
      }
    },
    'zh-TW': {
      smallJoker: '小王',
      bigJoker: '大王',
      ready: '點擊開始發牌',
      askBid: '是否叫地主？',
      landlordTitle: '地主',
      upper: '上家',
      lower: '下家',
      youPlayed: '你出的牌',
      upperPlayed: '上家出的牌',
      lowerPlayed: '下家出的牌',
      yourTurn: '輪到你出牌',
      waitUpper: '等待上家出牌',
      waitLower: '等待下家出牌',
      youLandlordLead: '你是地主，請先出牌',
      upperLandlordLead: '上家是地主，等待其出牌',
      lowerLandlordLead: '下家是地主，等待其出牌',
      playerLandlordWin: '你（地主）勝利！',
      playerFarmerWin: '你（農民）勝利！',
      landlordWin: '地主勝利',
      farmersWin: '農民勝利',
      invalidPlay: '無效牌型',
      cannotBeat: '牌不能壓過上家/下家',
      cannotBeatPassTip: '這輪要不起，請點「不出」',
      youPlayedWaitUpper: '你出牌，等待上家',
      youPassedWaitUpper: '你選擇不出，等待上家',
      restartGame: '重新開始',
      playAgain: '再來一局',
      restartGameConfirmTitle: '確認重新開始？',
      restartGameConfirmDesc: '目前牌局進度會遺失，確定要重新開始嗎？',
      restartGameConfirmBtn: '重新開始',
      resultFeedbackDesc: '點擊下方按鈕可立即開始下一局。',
      settlementTitle: '牌局結算',
      settlementWinner: text => `獲勝方：${text}`,
      settlementReason: text => `勝因：${text}`,
      settlementReasonEmpty: '先出完手牌',
      settlementLastHand: text => `終局最後一手：${text}`,
      settlementNoHand: '無',
      settlementLeft: (name, n) => `${name} 剩餘 ${n} 張`,
      settlementCards: (name, cards) => `${name} 餘牌：${cards}`,
      settlementLandlordRole: '地主',
      settlementFarmerRole: '農民',
      you: '你',
      playStatus: name => `${name} 出牌`,
      passStatus: name => `${name} 不出`,
      reactions: {
        passRocket: ['火箭太狠了，這輪我過。', '這手火箭接不住。'],
        passBomb: ['炸彈太大了，我過。', '這一炸彈我不要了。'],
        passBig: ['這手太大了，先不跟。', '壓不過，先過。'],
        passSmall: ['先過一輪，再看看。', '這輪先不出。'],
        playAny: ['輪到我了，看牌。', '我來出一手。'],
        playBeat: ['這手我能壓住。', '接上，這個更大。']
      }
    },
    en: {
      smallJoker: 'SJ',
      bigJoker: 'BJ',
      ready: 'Click Start to deal',
      askBid: 'Call landlord?',
      landlordTitle: 'Landlord',
      upper: 'Upper',
      lower: 'Lower',
      youPlayed: 'You played',
      upperPlayed: 'Upper played',
      lowerPlayed: 'Lower played',
      yourTurn: 'Your turn to play',
      waitUpper: 'Waiting for upper player',
      waitLower: 'Waiting for lower player',
      youLandlordLead: 'You are the landlord. Lead first',
      upperLandlordLead: 'Upper player is the landlord. Waiting...',
      lowerLandlordLead: 'Lower player is the landlord. Waiting...',
      playerLandlordWin: 'You win as the landlord!',
      playerFarmerWin: 'You win as the farmers!',
      landlordWin: 'Landlord wins',
      farmersWin: 'Farmers win',
      invalidPlay: 'Invalid hand',
      cannotBeat: 'Your cards do not beat the previous hand',
      cannotBeatPassTip: 'You cannot beat this hand. Please pass.',
      youPlayedWaitUpper: 'You played. Waiting for upper player',
      youPassedWaitUpper: 'You passed. Waiting for upper player',
      restartGame: 'Restart',
      playAgain: 'Play Again',
      restartGameConfirmTitle: 'Restart current game?',
      restartGameConfirmDesc: 'Current round progress will be lost. Continue?',
      restartGameConfirmBtn: 'Restart',
      resultFeedbackDesc: 'Tap the button below to start the next round now.',
      settlementTitle: 'Round Summary',
      settlementWinner: text => `Winner: ${text}`,
      settlementReason: text => `Reason: ${text}`,
      settlementReasonEmpty: 'Played all cards first',
      settlementLastHand: text => `Final hand: ${text}`,
      settlementNoHand: 'None',
      settlementLeft: (name, n) => `${name} left ${n}`,
      settlementCards: (name, cards) => `${name} cards: ${cards}`,
      settlementLandlordRole: 'Landlord',
      settlementFarmerRole: 'Farmer',
      you: 'You',
      playStatus: name => `${name} played`,
      passStatus: name => `${name} passed`,
      reactions: {
        passRocket: ['Rocket is too strong. I pass.', 'No answer to that rocket.'],
        passBomb: ['That bomb is too much. Pass.', 'I cannot answer that bomb.'],
        passBig: ['Too strong. I pass.', 'Cannot beat that one.'],
        passSmall: ['I will wait this round.', 'Pass for now.'],
        playAny: ['My turn now.', 'Let me lead this round.'],
        playBeat: ['I can beat that.', 'Here is a bigger one.']
      }
    },
    ja: {
      smallJoker: 'SJ',
      bigJoker: 'BJ',
      ready: 'Click Start to deal',
      askBid: 'Call landlord?',
      landlordTitle: 'Landlord',
      upper: 'Upper',
      lower: 'Lower',
      youPlayed: 'You played',
      upperPlayed: 'Upper played',
      lowerPlayed: 'Lower played',
      yourTurn: 'Your turn to play',
      waitUpper: 'Waiting for upper player',
      waitLower: 'Waiting for lower player',
      youLandlordLead: 'You are the landlord. Lead first',
      upperLandlordLead: 'Upper player is the landlord. Waiting...',
      lowerLandlordLead: 'Lower player is the landlord. Waiting...',
      playerLandlordWin: 'You win as the landlord!',
      playerFarmerWin: 'You win as the farmers!',
      landlordWin: 'Landlord wins',
      farmersWin: 'Farmers win',
      invalidPlay: 'Invalid hand',
      cannotBeat: 'Your cards do not beat the previous hand',
      cannotBeatPassTip: 'You cannot beat this hand. Please pass.',
      youPlayedWaitUpper: 'You played. Waiting for upper player',
      youPassedWaitUpper: 'You passed. Waiting for upper player',
      restartGame: 'Restart',
      playAgain: 'Play Again',
      restartGameConfirmTitle: 'Restart current game?',
      restartGameConfirmDesc: 'Current round progress will be lost. Continue?',
      restartGameConfirmBtn: 'Restart',
      resultFeedbackDesc: 'Tap the button below to start the next round now.',
      settlementTitle: 'Round Summary',
      settlementWinner: text => `Winner: ${text}`,
      settlementReason: text => `Reason: ${text}`,
      settlementReasonEmpty: 'Played all cards first',
      settlementLastHand: text => `Final hand: ${text}`,
      settlementNoHand: 'None',
      settlementLeft: (name, n) => `${name} left ${n}`,
      settlementCards: (name, cards) => `${name} cards: ${cards}`,
      settlementLandlordRole: 'Landlord',
      settlementFarmerRole: 'Farmer',
      you: 'You',
      playStatus: name => `${name} played`,
      passStatus: name => `${name} passed`,
      reactions: {
        passRocket: ['Rocket is too strong. I pass.', 'No answer to that rocket.'],
        passBomb: ['That bomb is too much. Pass.', 'I cannot answer that bomb.'],
        passBig: ['Too strong. I pass.', 'Cannot beat that one.'],
        passSmall: ['I will wait this round.', 'Pass for now.'],
        playAny: ['My turn now.', 'Let me lead this round.'],
        playBeat: ['I can beat that.', 'Here is a bigger one.']
      }
    },
    ko: {
      smallJoker: 'SJ',
      bigJoker: 'BJ',
      ready: 'Click Start to deal',
      askBid: 'Call landlord?',
      landlordTitle: 'Landlord',
      upper: 'Upper',
      lower: 'Lower',
      youPlayed: 'You played',
      upperPlayed: 'Upper played',
      lowerPlayed: 'Lower played',
      yourTurn: 'Your turn to play',
      waitUpper: 'Waiting for upper player',
      waitLower: 'Waiting for lower player',
      youLandlordLead: 'You are the landlord. Lead first',
      upperLandlordLead: 'Upper player is the landlord. Waiting...',
      lowerLandlordLead: 'Lower player is the landlord. Waiting...',
      playerLandlordWin: 'You win as the landlord!',
      playerFarmerWin: 'You win as the farmers!',
      landlordWin: 'Landlord wins',
      farmersWin: 'Farmers win',
      invalidPlay: 'Invalid hand',
      cannotBeat: 'Your cards do not beat the previous hand',
      cannotBeatPassTip: 'You cannot beat this hand. Please pass.',
      youPlayedWaitUpper: 'You played. Waiting for upper player',
      youPassedWaitUpper: 'You passed. Waiting for upper player',
      restartGame: 'Restart',
      playAgain: 'Play Again',
      restartGameConfirmTitle: 'Restart current game?',
      restartGameConfirmDesc: 'Current round progress will be lost. Continue?',
      restartGameConfirmBtn: 'Restart',
      resultFeedbackDesc: 'Tap the button below to start the next round now.',
      settlementTitle: 'Round Summary',
      settlementWinner: text => `Winner: ${text}`,
      settlementReason: text => `Reason: ${text}`,
      settlementReasonEmpty: 'Played all cards first',
      settlementLastHand: text => `Final hand: ${text}`,
      settlementNoHand: 'None',
      settlementLeft: (name, n) => `${name} left ${n}`,
      settlementCards: (name, cards) => `${name} cards: ${cards}`,
      settlementLandlordRole: 'Landlord',
      settlementFarmerRole: 'Farmer',
      you: 'You',
      playStatus: name => `${name} played`,
      passStatus: name => `${name} passed`,
      reactions: {
        passRocket: ['Rocket is too strong. I pass.', 'No answer to that rocket.'],
        passBomb: ['That bomb is too much. Pass.', 'I cannot answer that bomb.'],
        passBig: ['Too strong. I pass.', 'Cannot beat that one.'],
        passSmall: ['I will wait this round.', 'Pass for now.'],
        playAny: ['My turn now.', 'Let me lead this round.'],
        playBeat: ['I can beat that.', 'Here is a bigger one.']
      }
    }
  };
  function currentPack() {
    const locale = typeof getLocale === 'function' ? getLocale() : 'zh-CN';
    return LANDLORD_I18N[locale] || LANDLORD_I18N.en;
  }
  function tr(key, ...args) {
    const pack = currentPack();
    const value = pack[key];
    if (typeof value === 'function') return value(...args);
    return value;
  }
  function pick(list) {
    if (!Array.isArray(list) || !list.length) return '';
    return list[Math.floor(Math.random() * list.length)];
  }
  function rankLabels() {
    return ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', tr('smallJoker'), tr('bigJoker')];
  }

  let deck = [], hands = [[], [], []], landlord = -1, current = 0, bottom = [];
  let selected = [], lastPlay = null, lastWho = -1, score = 0, status = tr('ready');
  let phase = 'idle'; // 'idle' | 'bidding' | 'revealing' | 'playing'
  let bubbleStayUntil = 0, bubbleStayPlayer = -1, bubbleStayText = '';
  let lastBubbleText = '', lastBubblePlayer = -1;
  let passBannerUntil = 0, passBannerPlayer = -1, passBannerText = '';
  let bottomRevealVisible = false;
  let landlordRevealAnimating = false;
  const LANDLORD_REVEAL_PREVIEW_MS = 820;
  let renderedPlaySig = '';
  let resultOverlayVisible = false;
  let resultSummary = null;
  let roundToken = 0;
  const timers = new Set();

  function clearTimers() {
    timers.forEach(id => { try { clearTimeout(id); } catch (_) {} });
    timers.clear();
  }
  function schedule(fn, ms) {
    const token = roundToken;
    const id = setTimeout(() => {
      timers.delete(id);
      if (token !== roundToken) return;
      fn();
    }, ms);
    timers.add(id);
    return id;
  }
  function cancelRound() {
    roundToken++;
    clearTimers();
    bubbleStayUntil = 0;
    bubbleStayPlayer = -1;
    bubbleStayText = '';
    lastBubbleText = '';
    lastBubblePlayer = -1;
    passBannerUntil = 0;
    passBannerPlayer = -1;
    passBannerText = '';
    bottomRevealVisible = false;
    landlordRevealAnimating = false;
    renderedPlaySig = '';
    cleanupRevealFlight();
  }
  function startNewRound() {
    cancelRound();
    makeDeck();
    shuffle();
    deal();
  }

  function cardLabel(card) {
    const labels = rankLabels();
    return labels[card.v] != null ? labels[card.v] : String(card.v);
  }

  function makeDeck() {
    deck = [];
    for (let suit = 0; suit < 4; suit++)
      for (let v = 0; v < 13; v++) deck.push({ v, key: v + suit * 20 });
    deck.push({ v: 13, key: 100 });
    deck.push({ v: 14, key: 101 });
  }

  function shuffle() {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function sortHand(arr) {
    arr.sort((a, b) => (a.v !== b.v ? b.v - a.v : a.key - b.key));
  }

  function deal() {
    cancelRound();
    hands = [[], [], []];
    bottom = [];
    selected = [];
    lastPlay = null;
    lastWho = -1;
    landlord = -1;
    current = -1;
    phase = 'bidding';
    bottomRevealVisible = false;
    landlordRevealAnimating = false;
    resultOverlayVisible = false;
    resultSummary = null;

    for (let i = 0; i < 51; i++) hands[i % 3].push(deck[i]);
    bottom = deck.slice(51);
    hands.forEach(sortHand);

    status = tr('askBid');
    showBiddingPanel(true);
    render();
  }

  function showBiddingPanel(show) {
    const panel = container.querySelector('#landlord-bidding-panel');
    const passBtn = container.querySelector('#landlord-pass');
    const playBtn = container.querySelector('#landlord-play');
    const hintBtn = container.querySelector('#landlord-hint');
    if (panel) panel.classList.toggle('hidden', !show);
    if (passBtn) passBtn.style.display = show ? 'none' : '';
    if (playBtn) playBtn.style.display = show ? 'none' : '';
    if (hintBtn) hintBtn.style.display = show ? 'none' : '';
  }

  function revealLeadStatus(who) {
    return who === 0 ? tr('youLandlordLead') : (who === 1 ? tr('upperLandlordLead') : tr('lowerLandlordLead'));
  }

  function getRevealTarget(who) {
    if (who === 0) return container.querySelector('#landlord-hand');
    if (who === 1) return container.querySelector('#landlord-opp1');
    return container.querySelector('#landlord-opp2');
  }

  function ensureRevealFlightLayer() {
    const root = container.querySelector('#game-landlord') || container;
    if (!root) return null;
    let layer = root.querySelector('#landlord-reveal-flight');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'landlord-reveal-flight';
      layer.className = 'landlord-reveal-flight';
      root.appendChild(layer);
    }
    return layer;
  }

  function cleanupRevealFlight() {
    const layer = container.querySelector('#landlord-reveal-flight');
    if (layer) layer.innerHTML = '';
  }

  function finishLandlordReveal(who) {
    if (phase !== 'revealing' || landlord !== who) return;
    cleanupRevealFlight();
    landlordRevealAnimating = false;
    hands[landlord].push(...bottom);
    sortHand(hands[landlord]);
    bottomRevealVisible = false;
    phase = 'playing';
    current = landlord;
    status = revealLeadStatus(landlord);
    render();
    if (current !== 0) schedule(aiPlay, 1800);
  }

  function animateRevealToLandlord(who) {
    if (phase !== 'revealing' || landlord !== who || !bottom.length) return;
    const root = container.querySelector('#game-landlord') || container;
    const bottomEl = container.querySelector('#landlord-bottom-cards');
    const targetEl = getRevealTarget(who);
    const sourceCards = bottomEl ? Array.from(bottomEl.querySelectorAll('.landlord-card')) : [];
    if (!root || !bottomEl || !targetEl || sourceCards.length !== bottom.length) {
      finishLandlordReveal(who);
      return;
    }
    const layer = ensureRevealFlightLayer();
    if (!layer) {
      finishLandlordReveal(who);
      return;
    }

    cleanupRevealFlight();
    const rootRect = root.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const spread = who === 0 ? 34 : 18;
    const scale = who === 0 ? 1.16 : 0.96;
    const yShift = who === 0 ? -8 : 0;
    const flights = [];

    sourceCards.forEach((sourceEl, index) => {
      const sourceRect = sourceEl.getBoundingClientRect();
      const flyEl = renderCard(bottom[index], true);
      const startLeft = sourceRect.left - rootRect.left;
      const startTop = sourceRect.top - rootRect.top;
      const targetCenterX = targetRect.left - rootRect.left + (targetRect.width / 2) + (index - ((bottom.length - 1) / 2)) * spread;
      const targetCenterY = targetRect.top - rootRect.top + (targetRect.height / 2) + yShift;
      const deltaX = targetCenterX - (startLeft + sourceRect.width / 2);
      const deltaY = targetCenterY - (startTop + sourceRect.height / 2);

      flyEl.classList.add('landlord-fly-card');
      flyEl.style.left = `${startLeft}px`;
      flyEl.style.top = `${startTop}px`;
      flyEl.style.width = `${sourceRect.width}px`;
      flyEl.style.height = `${sourceRect.height}px`;
      flyEl.style.fontSize = window.getComputedStyle(sourceEl).fontSize;
      layer.appendChild(flyEl);
      sourceEl.style.opacity = '0.12';
      sourceEl.style.transform = 'translateY(4px) scale(0.96)';
      flights.push({ el: flyEl, deltaX, deltaY, delay: index * 70 });
    });

    layer.getBoundingClientRect();
    schedule(() => {
      flights.forEach(({ el, deltaX, deltaY, delay }) => {
        el.style.transitionDelay = `${delay}ms`;
        el.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scale})`;
        el.style.opacity = '0.94';
      });
    }, 24);
    schedule(() => finishLandlordReveal(who), 560 + (bottom.length - 1) * 70);
  }

  function startLandlordReveal(who) {
    if (phase !== 'bidding' || !bottom.length) return;
    landlord = who;
    current = -1;
    phase = 'revealing';
    bottomRevealVisible = true;
    landlordRevealAnimating = true;
    status = revealLeadStatus(who);
    showBiddingPanel(false);
    render();
    schedule(() => animateRevealToLandlord(who), LANDLORD_REVEAL_PREVIEW_MS);
  }

  function setLandlord(who) {
    startLandlordReveal(who);
  }

  function renderCard(card, small) {
    const s = small ? 28 : 44;
    const isJoker = card.v === 13 || card.v === 14;
    const el = document.createElement('div');
    el.className = 'landlord-card' + (isJoker ? ' joker' : '');
    el.style.width = s + 'px';
    el.style.height = (s * 1.4) + 'px';
    el.style.fontSize = (small ? 12 : 15) + 'px';
    el.textContent = cardLabel(card);
    el.dataset.key = card.key;
    return el;
  }

  function applyOpponentCountState(el, count) {
    if (!el) return;
    el.classList.toggle('landlord-opp-count-low', count > 0 && count <= 5);
    el.classList.toggle('landlord-opp-count-critical', count > 0 && count <= 2);
    el.setAttribute('data-cards-left', String(count));
  }

  function render() {
    const opp1El = container.querySelector('#landlord-opp1');
    const opp2El = container.querySelector('#landlord-opp2');
    const bottomEl = container.querySelector('#landlord-bottom-cards');
    const centerEl = container.querySelector('#landlord-center');
    const handEl = container.querySelector('#landlord-hand');

    const opp1CountEl = container.querySelector('#landlord-opp1-count');
    const opp2CountEl = container.querySelector('#landlord-opp2-count');
    if (opp1CountEl) opp1CountEl.textContent = hands[1].length;
    if (opp2CountEl) opp2CountEl.textContent = hands[2].length;
    if (opp1El) {
      applyOpponentCountState(opp1El, hands[1].length);
      opp1El.classList.toggle('landlord-just-played', lastWho === 1);
      opp1El.classList.toggle('landlord-current-turn', phase === 'playing' && current === 1);
      const nameEl = opp1El.querySelector('.landlord-opp-name');
      if (nameEl) {
        if (landlord === 1) nameEl.innerHTML = `${tr('upper')} <span class="landlord-badge">${tr('landlordTitle')}</span>`;
        else nameEl.textContent = tr('upper');
      }
    }
    if (opp2El) {
      applyOpponentCountState(opp2El, hands[2].length);
      opp2El.classList.toggle('landlord-just-played', lastWho === 2);
      opp2El.classList.toggle('landlord-current-turn', phase === 'playing' && current === 2);
      const nameEl = opp2El.querySelector('.landlord-opp-name');
      if (nameEl) {
        if (landlord === 2) nameEl.innerHTML = `${tr('lower')} <span class="landlord-badge">${tr('landlordTitle')}</span>`;
        else nameEl.textContent = tr('lower');
      }
    }

    const lastWhoEl = container.querySelector('#landlord-last-who');
    if (lastWhoEl) {
      if (lastPlay && lastPlay.length && lastWho >= 0) {
        lastWhoEl.textContent = lastWho === 0 ? tr('youPlayed') : (lastWho === 1 ? tr('upperPlayed') : tr('lowerPlayed'));
        lastWhoEl.classList.remove('landlord-last-who-you', 'landlord-last-who-upper', 'landlord-last-who-lower');
        lastWhoEl.classList.add(lastWho === 0 ? 'landlord-last-who-you' : (lastWho === 1 ? 'landlord-last-who-upper' : 'landlord-last-who-lower'));
        lastWhoEl.classList.remove('hidden');
      } else {
        lastWhoEl.textContent = '';
        lastWhoEl.classList.remove('landlord-last-who-you', 'landlord-last-who-upper', 'landlord-last-who-lower');
        lastWhoEl.classList.add('hidden');
      }
    }

    const passBannerEl = container.querySelector('#landlord-pass-banner');
    if (passBannerEl) {
      const showPassBanner = Date.now() < passBannerUntil && !!passBannerText;
      passBannerEl.classList.toggle('hidden', !showPassBanner);
      passBannerEl.classList.remove('landlord-pass-banner-you', 'landlord-pass-banner-upper', 'landlord-pass-banner-lower');
      if (showPassBanner) {
        passBannerEl.textContent = passBannerText;
        passBannerEl.classList.add(passBannerPlayer === 0 ? 'landlord-pass-banner-you' : (passBannerPlayer === 1 ? 'landlord-pass-banner-upper' : 'landlord-pass-banner-lower'));
      } else {
        passBannerEl.textContent = '';
      }
    }

    if (bottomEl) {
      const showBottom = bottomRevealVisible && bottom.length;
      bottomEl.classList.toggle('hidden', !showBottom);
      bottomEl.classList.toggle('landlord-bottom-cards-revealing', landlordRevealAnimating);
      bottomEl.innerHTML = '';
      if (showBottom) bottom.forEach(c => bottomEl.appendChild(renderCard(c, true)));
    }

    if (centerEl) {
      const showCenter = phase === 'playing' && !!(lastPlay && lastPlay.length);
      if (!showCenter) {
        centerEl.classList.add('hidden');
        centerEl.innerHTML = '';
      } else {
        centerEl.classList.remove('hidden');
        centerEl.innerHTML = '';
        const nextSig = lastPlay && lastPlay.length ? `${lastWho}:${lastPlay.map(c => c.key).join('-')}` : '';
        const animateCenter = !!nextSig && nextSig !== renderedPlaySig;
        centerEl.classList.remove('landlord-last-play-from-upper', 'landlord-last-play-from-lower', 'landlord-last-play-from-you');
        if (animateCenter && lastWho >= 0) centerEl.classList.add(lastWho === 0 ? 'landlord-last-play-from-you' : (lastWho === 1 ? 'landlord-last-play-from-upper' : 'landlord-last-play-from-lower'));
        if (lastPlay && lastPlay.length) {
          lastPlay.forEach((c, index) => {
            const cardEl = renderCard(c, true);
            cardEl.classList.add('landlord-center-card');
            if (animateCenter) {
              cardEl.classList.add('landlord-fly-in');
              cardEl.style.animationDelay = `${index * 40}ms`;
            }
            centerEl.appendChild(cardEl);
          });
        }
        renderedPlaySig = nextSig;
      }
    }

    const turnPromptEl = container.querySelector('#landlord-turn-prompt');
    if (turnPromptEl) {
      turnPromptEl.classList.remove('landlord-turn-prompt-your', 'landlord-turn-prompt-no-beat', 'landlord-turn-prompt-wait');
      if (current === -1 || !phase || phase !== 'playing') {
        turnPromptEl.textContent = status;
        turnPromptEl.classList.add('landlord-turn-prompt-wait');
        turnPromptEl.classList.remove('hidden');
      } else if (current === 0) {
        const noBeat = !!(lastPlay && lastPlay.length && lastWho !== 0 && playsThatBeat(hands[0], lastPlay).length === 0);
        turnPromptEl.textContent = noBeat ? tr('cannotBeatPassTip') : tr('yourTurn');
        turnPromptEl.classList.add(noBeat ? 'landlord-turn-prompt-no-beat' : 'landlord-turn-prompt-your');
        turnPromptEl.classList.remove('hidden');
      } else {
        turnPromptEl.textContent = current === 1 ? tr('waitUpper') : tr('waitLower');
        turnPromptEl.classList.add('landlord-turn-prompt-wait');
        turnPromptEl.classList.remove('hidden');
      }
    }

    const bubble1 = container.querySelector('#landlord-bubble-opp1');
    const bubble2 = container.querySelector('#landlord-bubble-opp2');
    const now = Date.now();
    const keepBubble = now < bubbleStayUntil && bubbleStayPlayer >= 1 && bubbleStayText;
    if (keepBubble) {
      const bubble = bubbleStayPlayer === 1 ? bubble1 : bubble2;
      const other = bubbleStayPlayer === 1 ? bubble2 : bubble1;
      if (bubble && bubbleStayText) {
        bubble.textContent = bubbleStayText;
        bubble.classList.remove('hidden');
      }
      if (other) other.classList.add('hidden');
    } else {
      if (bubble1) bubble1.classList.add('hidden');
      if (bubble2) bubble2.classList.add('hidden');
      if (phase === 'playing' && lastPlay && lastPlay.length && (current === 1 || current === 2)) {
        const canBeat = playsThatBeat(hands[current], lastPlay).length > 0;
        const msg = getLocalizedOpponentReaction(current, lastPlay, canBeat);
        const bubble = current === 1 ? bubble1 : bubble2;
        if (bubble && msg) {
          bubble.textContent = msg;
          bubble.classList.remove('hidden');
          lastBubbleText = msg;
          lastBubblePlayer = current;
        }
      }
    }

    if (handEl) {
      handEl.innerHTML = '';
      hands[0].forEach(card => {
        const el = renderCard(card, false);
        el.onclick = () => {
          if (current !== 0 || phase !== 'playing') return;
          const idx = selected.findIndex(x => x.key === card.key);
          if (idx >= 0) selected.splice(idx, 1);
          else selected.push(card);
          selected.sort((a, b) => b.v - a.v || a.key - b.key);
          render();
        };
        if (selected.some(x => x.key === card.key)) el.classList.add('selected');
        handEl.appendChild(el);
      });
    }

    const scoreEl = container.querySelector('#landlord-score');
    const statusEl = container.querySelector('#landlord-status');
    const startBtnEl = container.querySelector('#landlord-start');
    const passBtnEl = container.querySelector('#landlord-pass');
    const playBtnEl = container.querySelector('#landlord-play');
    const hintBtnEl = container.querySelector('#landlord-hint');
    if (scoreEl) scoreEl.textContent = score;
    if (statusEl) statusEl.textContent = status;
    if (startBtnEl) startBtnEl.textContent = phase === 'idle' ? t('startGame') : tr('restartGame');
    const canPass = phase === 'playing' && current === 0 && !!(lastPlay && lastPlay.length && lastWho !== 0);
    const userNoBeat = canPass && playsThatBeat(hands[0], lastPlay).length === 0;
    const selectedType = selected.length ? getType(selected) : null;
    const selectedCanBeat = !canPass || (selected.length && selectedType && canBeat(lastPlay, selected));
    const canPlay = phase === 'playing' && current === 0 && !userNoBeat && !!selected.length && !!selectedType && selectedCanBeat;
    const hintCards = bestHintPlay();
    const canHint = phase === 'playing' && current === 0 && Array.isArray(hintCards) && hintCards.length > 0;
    if (passBtnEl) passBtnEl.disabled = !canPass;
    if (playBtnEl) playBtnEl.disabled = !canPlay;
    if (hintBtnEl) hintBtnEl.disabled = !canHint;
    updateResultOverlay();
  }

  function getType(cards) {
    if (!cards.length) return null;
    const vals = cards.map(c => c.v).sort((a, b) => a - b);
    const len = vals.length;
    const count = {};
    vals.forEach(v => { count[v] = (count[v] || 0) + 1; });
    const uniq = Object.keys(count).map(x => parseInt(x, 10)).sort((a, b) => a - b);
    const maxCnt = Math.max(...Object.values(count));

    if (len === 2 && ((vals[0] === 13 && vals[1] === 14) || (vals[0] === 14 && vals[1] === 13)))
      return { t: 'rocket', main: 100, len };
    if (len === 4 && uniq.length === 1 && count[uniq[0]] === 4)
      return { t: 'bomb', main: uniq[0], len };
    if (len === 1) return { t: 'single', main: vals[0], len };
    if (len === 2 && uniq.length === 1 && count[uniq[0]] === 2)
      return { t: 'pair', main: uniq[0], len };
    if (len === 3 && uniq.length === 1 && count[uniq[0]] === 3)
      return { t: 'triple', main: uniq[0], len };
    if (len === 4 && uniq.length === 2) {
      const v3 = uniq.find(v => count[v] === 3);
      if (v3 !== undefined) return { t: 'triple1', main: v3, len };
    }
    if (len === 5 && uniq.length === 2) {
      const v3 = uniq.find(v => count[v] === 3);
      const v2 = uniq.find(v => count[v] === 2);
      if (v3 !== undefined && v2 !== undefined) return { t: 'triple2', main: v3, len };
    }

    function isSeq(list, minLen) {
      if (list.length < minLen) return false;
      if (list[list.length - 1] >= 12) return false;
      for (let i = 1; i < list.length; i++)
        if (list[i] !== list[i - 1] + 1) return false;
      return true;
    }

    if (maxCnt === 1 && len >= 5 && isSeq(uniq, 5) && len === uniq.length)
      return { t: 'single_seq', main: uniq[0], len, size: uniq.length };
    if (maxCnt === 2 && len >= 6 && len % 2 === 0 && uniq.every(v => count[v] === 2) && isSeq(uniq, 3))
      return { t: 'pair_seq', main: uniq[0], len, size: uniq.length };

    const tripleVals = uniq.filter(v => count[v] === 3);
    if (tripleVals.length >= 2 && isSeq(tripleVals, 2)) {
      const k = tripleVals.length;
      const tripleCount = 3 * k;
      if (len === tripleCount) return { t: 'plane', main: tripleVals[0], len, size: k };
      if (len === tripleCount + k) return { t: 'plane1', main: tripleVals[0], len, size: k };
      if (len === tripleCount + 2 * k) return { t: 'plane2', main: tripleVals[0], len, size: k };
    }

    if (maxCnt === 4) {
      const v4 = uniq.find(v => count[v] === 4);
      if (v4 !== undefined) {
        const others = [];
        Object.keys(count).forEach(k => {
          const v = parseInt(k, 10);
          if (v === v4) return;
          for (let i = 0; i < count[v]; i++) others.push(v);
        });
        if (others.length === 2) return { t: 'four2', main: v4, len };
        if (others.length === 4) {
          const tmp = {};
          others.forEach(v => { tmp[v] = (tmp[v] || 0) + 1; });
          if (Object.values(tmp).every(c => c === 2)) return { t: 'four22', main: v4, len };
        }
      }
    }
    return null;
  }

  function canBeat(prev, now) {
    const pt = getType(prev), nt = getType(now);
    if (!nt) return false;
    if (!pt) return true;
    if (nt.t === 'rocket') return true;
    if (pt.t === 'rocket') return false;
    if (nt.t === 'bomb' && pt.t !== 'bomb') return true;
    if (pt.t === 'bomb' && nt.t !== 'bomb') return false;
    if (pt.t !== nt.t || pt.len !== nt.len) return false;
    return nt.main > pt.main;
  }

  function getLocalizedOpponentReaction(whoseTurn, lastPlay, canBeat) {
    const pt = getType(lastPlay);
    if (!pt) return '';
    const reactions = currentPack().reactions;
    if (canBeat) return pick(reactions.playAny.concat(reactions.playBeat));
    if (pt.t === 'rocket') return pick(reactions.passRocket);
    if (pt.t === 'bomb') return pick(reactions.passBomb);
    if ((pt.t === 'single' && pt.main >= 12) || (pt.t === 'pair' && pt.main >= 11) || pt.len >= 5) return pick(reactions.passBig);
    return pick(reactions.passSmall);
  }

  function showPassBanner(playerIndex) {
    const playerName = playerIndex === 0 ? tr('you') : (playerIndex === 1 ? tr('upper') : tr('lower'));
    passBannerText = tr('passStatus', playerName);
    passBannerPlayer = playerIndex;
    passBannerUntil = Date.now() + 2400;
    schedule(() => {
      passBannerUntil = 0;
      passBannerPlayer = -1;
      passBannerText = '';
      render();
    }, 2400);
  }

  function finishIfWin(player) {
    if (hands[player].length) return false;
    if (player === 0) {
      score += landlord === 0 ? 200 : 100;
      status = landlord === 0 ? tr('playerLandlordWin') : tr('playerFarmerWin');
    } else {
      score += (player === landlord ? -200 : -100);
      status = player === landlord ? tr('landlordWin') : tr('farmersWin');
    }
    const getPlayerName = i => (i === 0 ? tr('you') : (i === 1 ? tr('upper') : tr('lower')));
    const getPlayerRole = i => (i === landlord ? tr('settlementLandlordRole') : tr('settlementFarmerRole'));
    const finalHand = lastPlay && lastPlay.length ? lastPlay.map(cardLabel).join(' ') : tr('settlementNoHand');
    const summarizeLeft = i => {
      const name = `${getPlayerName(i)}（${getPlayerRole(i)}）`;
      const cards = hands[i].length ? hands[i].map(cardLabel).join(' ') : tr('settlementNoHand');
      return [tr('settlementLeft', name, hands[i].length), tr('settlementCards', name, cards)];
    };
    resultSummary = {
      winnerText: `${getPlayerName(player)}（${getPlayerRole(player)}）`,
      reasonText: tr('settlementReasonEmpty'),
      finalHand,
      leftLines: [0, 1, 2].flatMap(summarizeLeft)
    };
    current = -1;
    resultOverlayVisible = true;
    render();
    return true;
  }

  function play() {
    if (current !== 0 || phase !== 'playing' || !selected.length) return;
    const my = hands[0];
    const type = getType(selected);
    if (!type) { status = tr('invalidPlay'); render(); return; }
    if (lastPlay && lastPlay.length && lastWho !== 0 && !canBeat(lastPlay, selected)) {
      status = tr('cannotBeat');
      render();
      return;
    }
    selected.forEach(c => {
      const idx = my.findIndex(x => x.key === c.key);
      if (idx >= 0) my.splice(idx, 1);
    });
    lastPlay = selected.slice();
    lastWho = 0;
    selected = [];
    current = 1;
    status = tr('youPlayedWaitUpper');
    render();
    if (finishIfWin(0)) return;
    schedule(aiPlay, 1800);
  }

  function pass() {
    if (current !== 0 || phase !== 'playing') return;
    if (!lastPlay || !lastPlay.length || lastWho === 0) return;
    current = 1;
    status = tr('youPassedWaitUpper');
    showPassBanner(0);
    render();
    schedule(aiPlay, 1800);
  }

  function bestHintPlay() {
    if (phase !== 'playing' || current !== 0) return [];
    if (!lastPlay || !lastPlay.length || lastWho === 0) return aiBestPlay(hands[0], null);
    return aiBestPlay(hands[0], lastPlay);
  }

  function hint() {
    const choice = bestHintPlay();
    if (!choice || !choice.length) {
      if (lastPlay && lastPlay.length && lastWho !== 0) status = tr('cannotBeatPassTip');
      render();
      return;
    }
    selected = choice.slice();
    render();
  }

  // ---------- 高智能 AI：枚举所有合法牌型，先出组合再出单，跟牌时拆小牌 ----------
  function handToCount(hand) {
    const count = {};
    hand.forEach(c => { count[c.v] = (count[c.v] || 0) + 1; });
    return count;
  }
  function handToGroups(hand) {
    const g = {};
    hand.forEach(c => { if (!g[c.v]) g[c.v] = []; g[c.v].push(c); });
    return g;
  }
  function isSeqStrict(list, minLen) {
    if (list.length < minLen) return false;
    if (list[list.length - 1] >= 12) return false;
    for (let i = 1; i < list.length; i++) if (list[i] !== list[i - 1] + 1) return false;
    return true;
  }

  function enumerateAllPlays(hand) {
    const groups = handToGroups(hand);
    const count = handToCount(hand);
    const vals = Object.keys(count).map(x => parseInt(x, 10)).sort((a, b) => a - b);
    const plays = [];

    function add(cards) {
      if (cards.length && getType(cards)) plays.push(cards.slice());
    }
    for (const v of vals) {
      if (groups[v].length >= 1) add([groups[v][0]]);
      if (groups[v].length >= 2) add(groups[v].slice(0, 2));
      if (groups[v].length >= 3) add(groups[v].slice(0, 3));
      if (groups[v].length >= 4) add(groups[v].slice(0, 4));
    }
    if (groups[13] && groups[14]) add([groups[13][0], groups[14][0]]);

    for (const v of vals) {
      if (count[v] < 3) continue;
      const tri = groups[v].slice(0, 3);
      for (const w of vals) if (w !== v && groups[w].length >= 1) add(tri.concat([groups[w][0]]));
      for (const w of vals) if (w !== v && count[w] >= 2) add(tri.concat(groups[w].slice(0, 2)));
    }

    for (let L = 5; L <= 12; L++) {
      for (let start = 0; start <= 12 - L; start++) {
        if (start + L - 1 >= 12) continue;
        const seq = [];
        for (let i = 0; i < L; i++) {
          const v = start + i;
          if (!groups[v] || groups[v].length < 1) break;
          seq.push(groups[v][0]);
        }
        if (seq.length === L) add(seq);
      }
    }
    for (let L = 3; L <= 10; L++) {
      for (let start = 0; start <= 12 - L; start++) {
        if (start + L - 1 >= 12) continue;
        const seq = [];
        for (let i = 0; i < L; i++) {
          const v = start + i;
          if (!groups[v] || groups[v].length < 2) break;
          seq.push(...groups[v].slice(0, 2));
        }
        if (seq.length === L * 2) add(seq);
      }
    }
    for (let k = 2; k <= 6; k++) {
      for (let start = 0; start <= 12 - k; start++) {
        if (start + k - 1 >= 12) continue;
        const plane = [];
        for (let i = 0; i < k; i++) {
          const v = start + i;
          if (!groups[v] || groups[v].length < 3) break;
          plane.push(...groups[v].slice(0, 3));
        }
        if (plane.length !== k * 3) continue;
        add(plane);
        const used = new Set();
        for (let i = 0; i < k; i++) used.add(start + i);
        const rest = hand.filter(c => !plane.some(p => p.key === c.key));
        rest.sort((a, b) => a.v - b.v);
        if (rest.length >= k) {
          const wings = rest.slice(0, k);
          add(plane.concat(wings));
        }
        const pairVals = vals.filter(v => !used.has(v) && count[v] >= 2);
        if (pairVals.length >= k) {
          const wings = [];
          for (let i = 0; i < k; i++) wings.push(...groups[pairVals[i]].slice(0, 2));
          add(plane.concat(wings));
        }
      }
    }
    for (const v of vals) {
      if (count[v] !== 4) continue;
      const four = groups[v].slice(0, 4);
      const others = vals.filter(x => x !== v);
      for (let i = 0; i < others.length; i++)
        for (let j = i + 1; j < others.length; j++)
          add(four.concat([groups[others[i]][0], groups[others[j]][0]]));
      for (let i = 0; i < others.length; i++)
        for (let j = i + 1; j < others.length; j++)
          if (count[others[i]] >= 2 && count[others[j]] >= 2)
            add(four.concat(groups[others[i]].slice(0, 2), groups[others[j]].slice(0, 2)));
    }
    return plays;
  }

  function playsThatBeat(hand, prev) {
    const pt = getType(prev);
    if (!pt) return [];
    const all = enumerateAllPlays(hand);
    const valid = all.filter(cards => canBeat(prev, cards));
    return valid;
  }

  function aiBestPlay(hand, prev) {
    const myCount = hand.length;
    const opp1Count = hands[1].length;
    const opp2Count = hands[2].length;
    const isLandlordAI = current === landlord;
    const nextPlayer = (current + 1) % 3;
    const prevPlayer = (current + 2) % 3;

    if (!prev || !prev.length) {
      const allLeads = enumerateAllPlays(hand);
      if (allLeads.length === 0) return [];
      allLeads.sort((a, b) => {
        const ta = getType(a), tb = getType(b);
        if (!ta || !tb) return 0;
        if (ta.t === 'rocket') return 1;
        if (tb.t === 'rocket') return -1;
        if (ta.t === 'bomb' && tb.t !== 'bomb') return 1;
        if (tb.t === 'bomb' && ta.t !== 'bomb') return -1;
        const lenDiff = b.length - a.length;
        if (lenDiff !== 0) return lenDiff;
        return (ta.main || 0) - (tb.main || 0);
      });
      for (const lead of allLeads) {
        const t = getType(lead);
        if (t && t.t !== 'rocket' && t.t !== 'bomb') return lead;
      }
      return allLeads[0] || [];
    }

    const choices = playsThatBeat(hand, prev);
    if (choices.length === 0) return [];

    const pt = getType(prev);
    choices.sort((a, b) => {
      const ta = getType(a), tb = getType(b);
      if (!ta || !tb) return 0;
      if (ta.t === 'rocket') return 1;
      if (tb.t === 'rocket') return -1;
      if (ta.t === 'bomb' && tb.t !== 'bomb') return 1;
      if (tb.t === 'bomb' && ta.t !== 'bomb') return -1;
      const mainA = ta.main ?? 0, mainB = tb.main ?? 0;
      if (mainA !== mainB) return mainA - mainB;
      return a.length - b.length;
    });

    const preferBomb = (myCount <= 6 && (opp1Count <= 2 || opp2Count <= 2)) || myCount <= 3;
    for (const play of choices) {
      const t = getType(play);
      if (t.t === 'bomb' || t.t === 'rocket') {
        if (preferBomb) return play;
        continue;
      }
      return play;
    }
    return choices[0] || [];
  }

  function aiPlay() {
    if (phase !== 'playing') return;
    if (current === 0 || current === -1) return;
    const justPlayed = current;
    const hand = hands[current];
    let out = (!lastPlay || lastWho === current || !lastPlay.length)
      ? aiBestPlay(hand, null)
      : aiBestPlay(hand, lastPlay);

    if (out && out.length) {
      out.forEach(c => {
        const idx = hand.findIndex(x => x.key === c.key);
        if (idx >= 0) hand.splice(idx, 1);
      });
      lastPlay = out.slice();
      lastWho = current;
      status = tr('playStatus', current === 1 ? tr('upper') : tr('lower'));
      if (finishIfWin(current)) return;
    } else {
      status = tr('passStatus', current === 1 ? tr('upper') : tr('lower'));
      showPassBanner(current);
      if (lastWho === current) { lastPlay = null; lastWho = -1; }
    }
    current = (current + 1) % 3;
    // 只有轮到玩家时才保留刚出牌者的气泡多 4 秒；轮到另一家 AI 时不清保留，让 render 正常显示下家/上家气泡
    if (current === 0 && lastBubblePlayer === justPlayed && lastBubbleText) {
      bubbleStayUntil = Date.now() + 4000;
      bubbleStayPlayer = justPlayed;
      bubbleStayText = lastBubbleText;
      schedule(() => { bubbleStayUntil = 0; render(); }, 4000);
    } else {
      bubbleStayUntil = 0;
    }
    if (current === 0) { status = tr('yourTurn'); render(); return; }
    render();
    schedule(aiPlay, 1800);
  }

  function ensureResultOverlay() {
    let el = container.querySelector('#landlord-result-overlay');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'landlord-result-overlay';
    el.className = 'landlord-result-overlay hidden';
    el.innerHTML = `<div class="landlord-result-dialog"><div class="landlord-result-title"></div><div class="landlord-result-winner"></div><div class="landlord-result-reason"></div><div class="landlord-result-last"></div><div class="landlord-result-left"></div><div class="landlord-result-actions"><button type="button" data-action="again" class="landlord-btn landlord-btn-play"></button></div></div>`;
    container.appendChild(el);
    const againBtn = el.querySelector('[data-action="again"]');
    if (againBtn) againBtn.addEventListener('click', () => {
      el.classList.add('hidden');
      startNewRound();
    });
    return el;
  }

  function updateResultOverlay() {
    const el = ensureResultOverlay();
    const show = current === -1 && resultOverlayVisible;
    if (!show) {
      el.classList.add('hidden');
      return;
    }
    const titleEl = el.querySelector('.landlord-result-title');
    const winnerEl = el.querySelector('.landlord-result-winner');
    const reasonEl = el.querySelector('.landlord-result-reason');
    const lastEl = el.querySelector('.landlord-result-last');
    const leftEl = el.querySelector('.landlord-result-left');
    const againBtn = el.querySelector('[data-action="again"]');
    if (titleEl) titleEl.textContent = tr('settlementTitle');
    if (winnerEl) winnerEl.textContent = tr('settlementWinner', (resultSummary && resultSummary.winnerText) ? resultSummary.winnerText : status);
    if (reasonEl) reasonEl.textContent = tr('settlementReason', (resultSummary && resultSummary.reasonText) ? resultSummary.reasonText : tr('settlementReasonEmpty'));
    if (lastEl) lastEl.textContent = tr('settlementLastHand', (resultSummary && resultSummary.finalHand) ? resultSummary.finalHand : tr('settlementNoHand'));
    if (leftEl) leftEl.innerHTML = (resultSummary && Array.isArray(resultSummary.leftLines) ? resultSummary.leftLines : []).map(line => `<div>${line}</div>`).join('');
    if (againBtn) againBtn.textContent = tr('playAgain');
    el.classList.remove('hidden');
  }

  const startBtn = container.querySelector('#landlord-start');
  const passBtn = container.querySelector('#landlord-pass');
  const playBtn = container.querySelector('#landlord-play');
  const hintBtn = container.querySelector('#landlord-hint');
  const bidCall = container.querySelector('#landlord-bid-call');
  const bidPass = container.querySelector('#landlord-bid-pass');

  function ensureRestartConfirm() {
    let el = container.querySelector('#landlord-restart-confirm');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'landlord-restart-confirm';
    el.className = 'landlord-restart-confirm hidden';
    el.innerHTML = `<div class="landlord-restart-dialog"><div class="landlord-restart-title"></div><div class="landlord-restart-desc"></div><div class="landlord-restart-actions"><button type="button" data-action="cancel" class="landlord-btn landlord-btn-cancel">${t('cancel')}</button><button type="button" data-action="confirm" class="landlord-btn landlord-btn-play"></button></div></div>`;
    container.appendChild(el);
    el.addEventListener('click', e => {
      if (e.target === el) el.classList.add('hidden');
    });
    const cancelBtn = el.querySelector('[data-action="cancel"]');
    const confirmBtn = el.querySelector('[data-action="confirm"]');
    if (cancelBtn) cancelBtn.addEventListener('click', () => el.classList.add('hidden'));
    if (confirmBtn) confirmBtn.addEventListener('click', () => {
      el.classList.add('hidden');
      startNewRound();
    });
    return el;
  }
  function openRestartConfirm() {
    const el = ensureRestartConfirm();
    const titleEl = el.querySelector('.landlord-restart-title');
    const descEl = el.querySelector('.landlord-restart-desc');
    const confirmBtn = el.querySelector('[data-action="confirm"]');
    if (titleEl) titleEl.textContent = tr('restartGameConfirmTitle');
    if (descEl) descEl.textContent = tr('restartGameConfirmDesc');
    if (confirmBtn) confirmBtn.textContent = tr('restartGameConfirmBtn');
    el.classList.remove('hidden');
  }

  if (startBtn) {
    startBtn.onclick = () => {
      if (phase !== 'idle') {
        openRestartConfirm();
        return;
      }
      startNewRound();
    };
  }
  if (bidCall) {
    bidCall.onclick = () => setLandlord(0);
  }
  if (bidPass) {
    bidPass.onclick = () => {
      const strength = (arr) => {
        const count = {};
        arr.forEach(c => { count[c.v] = (count[c.v] || 0) + 1; });
        let s = 0;
        Object.keys(count).forEach(k => {
          const v = parseInt(k, 10), n = count[k];
          s += (v + 3) * n;
          if (n >= 2) s += 15;
          if (n >= 3) s += 25;
          if (v >= 13) s += 30;
          if (v === 12) s += 15;
        });
        return s;
      };
      const s1 = strength(hands[1]), s2 = strength(hands[2]);
      setLandlord(s1 >= s2 ? 1 : 2);
    };
  }
  if (passBtn) passBtn.onclick = pass;
  if (playBtn) playBtn.onclick = play;
  if (hintBtn) hintBtn.onclick = hint;

  render();
};