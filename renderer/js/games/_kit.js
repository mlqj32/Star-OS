
// Star OS - GameKit: shared helpers for small games (canvas fit, input mapping, ui helpers)
// Keeps aspect ratio, avoids "flatten" on maximize, and fixes click offset under CSS scaling/borders.
(() => {
  if (window.StarGameKit) return;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function safeDpr(max = 2.5) {
    const dpr = Number(window.devicePixelRatio || 1) || 1;
    return clamp(dpr, 1, max);
  }

  function observeSize(el, cb) {
    if (!el) return () => {};
    let raf = 0;
    const fire = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => cb());
    };
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(fire);
      ro.observe(el);
      return () => {
        try { ro.disconnect(); } catch (_) {}
        if (raf) cancelAnimationFrame(raf);
      };
    }
    window.addEventListener('resize', fire);
    return () => {
      window.removeEventListener('resize', fire);
      if (raf) cancelAnimationFrame(raf);
    };
  }

  function getCanvasCssSize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const w = canvas.clientWidth || rect.width || 1;
    const h = canvas.clientHeight || rect.height || 1;
    return { rect, w, h };
  }

  // Raw canvas pixel coordinates (in canvas.width/canvas.height coordinate space).
  function getCanvasPoint(canvas, clientX, clientY) {
    const { rect, w, h } = getCanvasCssSize(canvas);
    const xCss = (clientX - rect.left - (canvas.clientLeft || 0));
    const yCss = (clientY - rect.top - (canvas.clientTop || 0));
    return {
      x: xCss * (canvas.width / w),
      y: yCss * (canvas.height / h)
    };
  }

  // Fit a canvas to its parent, keeping a virtual/base coordinate system.
  // Draw using ctx.setTransform(drawScale,0,0,drawScale,0,0) and then draw in base units.
  function createCanvasFitter(canvas, baseW, baseH, opts = {}) {
    if (!canvas) throw new Error('createCanvasFitter: canvas is required');
    const parent = opts.parent || canvas.parentElement || canvas;
    const maxDpr = typeof opts.maxDpr === 'number' ? opts.maxDpr : 2.5;
    const allowUpscale = opts.allowUpscale !== false;
    const padding = typeof opts.padding === 'number' ? opts.padding : 0;
    let state = {
      baseW,
      baseH,
      cssW: baseW,
      cssH: baseH,
      dpr: safeDpr(maxDpr),
      scale: 1,
      drawScale: 1
    };

    function resize() {
      const pw = Math.max(1, (parent.clientWidth || baseW) - padding * 2);
      const ph = Math.max(1, (parent.clientHeight || baseH) - padding * 2);
      let scale = Math.min(pw / baseW, ph / baseH);
      if (!allowUpscale) scale = Math.min(scale, 1);
      scale = clamp(scale, 0.1, 24);
      const cssW = Math.max(1, Math.floor(baseW * scale));
      const cssH = Math.max(1, Math.floor(baseH * scale));
      const dpr = safeDpr(maxDpr);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      state = {
        baseW,
        baseH,
        cssW,
        cssH,
        dpr,
        scale,
        drawScale: dpr * scale
      };
    }

    const stop = observeSize(parent, resize);
    resize();

    return {
      get state() { return state; },
      resize,
      dispose() { stop(); },
      applyTransform(ctx) {
        ctx.setTransform(state.drawScale, 0, 0, state.drawScale, 0, 0);
      },
      clear(ctx) {
        // clear in base units (transform already applied)
        ctx.clearRect(0, 0, baseW, baseH);
      },
      toBasePointFromClient(clientX, clientY) {
        const p = getCanvasPoint(canvas, clientX, clientY);
        return { x: p.x / state.drawScale, y: p.y / state.drawScale };
      }
    };
  }

  function onPointerTap(el, handler) {
    if (!el) return () => {};
    const onClick = e => handler(e.clientX, e.clientY, e);
    el.addEventListener('click', onClick);
    // Touch: treat as tap
    const onTouch = e => {
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      handler(t.clientX, t.clientY, e);
    };
    el.addEventListener('touchend', onTouch, { passive: true });
    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('touchend', onTouch);
    };
  }

  window.StarGameKit = {
    clamp,
    safeDpr,
    observeSize,
    getCanvasPoint,
    createCanvasFitter,
    onPointerTap,
    confirmDialog(opts) {
      const root = opts && (opts.root || opts.container || document.body);
      if (!root) return { close() {} };
      try {
        const cs = window.getComputedStyle(root);
        if (cs && cs.position === 'static') root.style.position = 'relative';
      } catch (_) {}

      const title = (opts && opts.title) || 'Confirm';
      const desc = (opts && opts.desc) || '';
      const confirmText = (opts && opts.confirmText) || 'OK';
      const cancelText = (opts && opts.cancelText) || 'Cancel';
      const onConfirm = (opts && typeof opts.onConfirm === 'function') ? opts.onConfirm : null;
      const onCancel = (opts && typeof opts.onCancel === 'function') ? opts.onCancel : null;

      const overlay = document.createElement('div');
      overlay.className = 'game-confirm-overlay';
      overlay.innerHTML = `
        <div class="game-confirm-panel" role="dialog" aria-modal="true">
          <div class="game-confirm-title"></div>
          <div class="game-confirm-desc"></div>
          <div class="game-confirm-actions">
            <button type="button" data-action="cancel" class="start-footer-btn">${cancelText}</button>
            <button type="button" data-action="confirm" class="start-footer-btn game-confirm-primary">${confirmText}</button>
          </div>
        </div>
      `;
      const titleEl = overlay.querySelector('.game-confirm-title');
      const descEl = overlay.querySelector('.game-confirm-desc');
      if (titleEl) titleEl.textContent = title;
      if (descEl) descEl.textContent = desc;

      const close = () => {
        try { overlay.remove(); } catch (_) {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }
      };

      overlay.addEventListener('click', e => {
        if (e.target === overlay) { close(); if (onCancel) onCancel(); }
      });
      const cancelBtn = overlay.querySelector('[data-action="cancel"]');
      const confirmBtn = overlay.querySelector('[data-action="confirm"]');
      if (cancelBtn) cancelBtn.addEventListener('click', () => { close(); if (onCancel) onCancel(); });
      if (confirmBtn) confirmBtn.addEventListener('click', () => { close(); if (onConfirm) onConfirm(); });

      root.appendChild(overlay);
      return { close, el: overlay };
    },
    confirmStopGame(opts) {
      const locale = typeof getLocale === 'function' ? getLocale() : 'en';
      const pack = ({
        'zh-CN': {
          title: '确认停止游戏？',
          desc: '当前游戏进度将结束，确定现在停止吗？',
          button: '确认停止',
          cancel: '取消'
        },
        'zh-TW': {
          title: '確認停止遊戲？',
          desc: '目前遊戲進度將結束，確定現在停止嗎？',
          button: '確認停止',
          cancel: '取消'
        },
        ja: {
          title: 'ゲームを停止しますか？',
          desc: '現在のプレイ進行は終了します。今すぐ停止しますか？',
          button: '停止する',
          cancel: 'キャンセル'
        },
        ko: {
          title: '게임을 종료할까요?',
          desc: '현재 진행 중인 플레이가 끝납니다. 지금 중지할까요?',
          button: '중지',
          cancel: '취소'
        },
        en: {
          title: 'Stop the current game?',
          desc: 'Your current play session will end. Stop now?',
          button: 'Stop',
          cancel: 'Cancel'
        }
      })[locale] || ({
        title: 'Stop the current game?',
        desc: 'Your current play session will end. Stop now?',
        button: 'Stop',
        cancel: 'Cancel'
      });

      const translate = (key, fallback) => (typeof t === 'function' ? t(key, fallback) : fallback);
      return this.confirmDialog({
        root: opts && (opts.root || opts.container),
        title: translate('confirmStopGameTitle', pack.title),
        desc: translate('confirmStopGameDesc', pack.desc),
        confirmText: translate('confirmStopGameBtn', pack.button),
        cancelText: translate('cancel', pack.cancel),
        onConfirm: opts && typeof opts.onConfirm === 'function' ? opts.onConfirm : null,
        onCancel: opts && typeof opts.onCancel === 'function' ? opts.onCancel : null
      });
    }
  };
})();