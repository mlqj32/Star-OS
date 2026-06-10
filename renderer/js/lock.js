
/**
 * Star OS lock screen.
 * - Optional PIN:
 *   Stored in localStorage key `star-lock-pin`.
 *   `__none__` (or empty) means "no PIN".
 * - Optional auto lock:
 *   Stored in localStorage key `star-lock-autolock-ms` (0 means off).
 */
(function () {
  const INIT_KEY = 'star-lock-initialized';
  const PIN_KEY = 'star-lock-pin';
  const AUTOLOCK_KEY = 'star-lock-autolock-ms';

  const getLockEl = () => document.getElementById('lock-screen');
  const getPinWrapEl = () => document.getElementById('lock-pin-wrap');
  const getPinInput = () => document.getElementById('lock-pin');
  const getErrorEl = () => document.getElementById('lock-error');
  const getHintEl = () => document.getElementById('lock-hint');
  const getTimeEl = () => document.getElementById('lock-time');
  const getDateEl = () => document.getElementById('lock-date');

  function tr(key, fallback, params) {
    try {
      return typeof t === 'function' ? t(key, fallback, params) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function getLocaleSafe() {
    try {
      return typeof getLocale === 'function' ? getLocale() : undefined;
    } catch (_) {
      return undefined;
    }
  }

  function updateClock() {
    const timeEl = getTimeEl();
    const dateEl = getDateEl();
    if (!timeEl || !dateEl) return;
    const d = new Date();
    const locale = getLocaleSafe();
    try {
      timeEl.textContent = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      dateEl.textContent = d.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch (_) {
      timeEl.textContent = d.toLocaleTimeString();
      dateEl.textContent = d.toLocaleDateString();
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  function getStoredPin() {
    try {
      const v = localStorage.getItem(PIN_KEY);
      if (v === null || v === '' || v === '__none__') return null;
      return String(v);
    } catch (_) {
      return null;
    }
  }

  function setStoredPin(newPin) {
    try {
      localStorage.setItem(INIT_KEY, '1');
      const v = String(newPin == null ? '' : newPin).trim();
      localStorage.setItem(PIN_KEY, v || '__none__');
    } catch (_) {}
  }

  function getAutoLockMs() {
    try {
      const raw = localStorage.getItem(AUTOLOCK_KEY);
      const v = Number(raw);
      return Number.isFinite(v) && v > 0 ? v : 0;
    } catch (_) {
      return 0;
    }
  }

  function setAutoLockMs(ms) {
    try {
      const v = Number(ms);
      localStorage.setItem(AUTOLOCK_KEY, String(Number.isFinite(v) && v > 0 ? Math.floor(v) : 0));
    } catch (_) {}
    scheduleAutoLock();
  }

  let locked = false;
  let autolockTimer = null;
  let lastActivityAt = Date.now();
  let powerConfirmPending = false;

  function clearAutoLockTimer() {
    if (autolockTimer) clearTimeout(autolockTimer);
    autolockTimer = null;
  }

  function scheduleAutoLock() {
    clearAutoLockTimer();
    if (locked) return;
    const ms = getAutoLockMs();
    if (!ms) return;
    const plannedAt = Date.now();
    autolockTimer = setTimeout(() => {
      // If we had activity after the timer was scheduled, ignore this run.
      if (lastActivityAt > plannedAt) return;
      lock();
    }, ms);
  }

  function noteActivity() {
    lastActivityAt = Date.now();
    if (!locked) scheduleAutoLock();
  }

  function isShowing() {
    const lockEl = getLockEl();
    return !!(lockEl && !lockEl.classList.contains('hidden'));
  }

  function updateLockUiForState() {
    const pin = getStoredPin();
    const pinWrap = getPinWrapEl();
    const hintEl = getHintEl();
    if (pinWrap) pinWrap.classList.toggle('hidden', pin === null);
    if (hintEl) {
      hintEl.textContent = pin === null
        ? tr('lockHintNoPin', 'Press Enter or click to unlock.')
        : tr('lockHintEnterPin', 'Enter your PIN to unlock.');
    }
  }

  function lock() {
    const lockEl = getLockEl();
    if (!lockEl) return;
    locked = true;
    clearAutoLockTimer();

    lockEl.classList.remove('hidden');
    updateLockUiForState();

    const pinInput = getPinInput();
    const errorEl = getErrorEl();
    if (pinInput) pinInput.value = '';
    if (errorEl) errorEl.textContent = '';

    if (getStoredPin() !== null && pinInput) {
      try { pinInput.focus(); } catch (_) {}
    }
  }

  function unlock() {
    const lockEl = getLockEl();
    if (!lockEl) return;

    const stored = getStoredPin();
    const pinInput = getPinInput();
    const errorEl = getErrorEl();

    if (stored === null) {
      lockEl.classList.add('hidden');
      locked = false;
      if (errorEl) errorEl.textContent = '';
      scheduleAutoLock();
      return;
    }

    const val = pinInput ? String(pinInput.value || '').trim() : '';
    if (val === stored) {
      lockEl.classList.add('hidden');
      locked = false;
      if (errorEl) errorEl.textContent = '';
      scheduleAutoLock();
      return;
    }

    if (errorEl) errorEl.textContent = tr('lockPinIncorrect', 'Incorrect PIN. Please try again.');
    if (pinInput) {
      try { pinInput.focus(); pinInput.select(); } catch (_) {}
    }
  }

  function handleLockClick(e) {
    noteActivity();
    if (!isShowing()) return;

    // Power button should always quit the app, and must not be treated as "click to unlock".
    if (e && e.target && (e.target.id === 'lock-power' || (e.target.closest && e.target.closest('#lock-power')))) {
      try {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      } catch (_) {}
      if (powerConfirmPending) return;
      powerConfirmPending = true;
      const dialogPromise = window.StarDialog && typeof window.StarDialog.confirm === 'function'
        ? window.StarDialog.confirm({
          title: tr('power', 'Power'),
          message: tr('quitConfirm', 'Quit Star OS?'),
          okText: tr('power', 'Power'),
          cancelText: tr('cancel', 'Cancel')
        })
        : Promise.resolve(false);
      dialogPromise.then((confirmed) => {
        powerConfirmPending = false;
        if (!confirmed) return;
        try {
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('os:quit');
        } catch (_) {}
      }).catch(() => { powerConfirmPending = false; });
      return;
    }

    // If no PIN is set, click anywhere unlocks.
    if (getStoredPin() === null) {
      unlock();
      return;
    }

    if (e.target && (e.target.id === 'lock-unlock' || (e.target.closest && e.target.closest('#lock-unlock')))) {
      unlock();
      return;
    }

    // Click the card focuses PIN input.
    if (e.target && e.target.closest && e.target.closest('.lock-card')) {
      const pinInput = getPinInput();
      if (pinInput) {
        try { pinInput.focus(); } catch (_) {}
      }
    }
  }

  function isEditableTarget(target) {
    if (!target || !target.tagName) return false;
    const tag = String(target.tagName).toLowerCase();
    return tag === 'input' || tag === 'textarea' || !!target.isContentEditable;
  }

  function handleKeydown(e) {
    noteActivity();

    // Win+L (Meta+L) locks, but don't steal focus from text fields.
    if (!isShowing()) {
      const key = String(e.key || '').toLowerCase();
      const meta = !!e.metaKey;
      if (meta && key === 'l' && !isEditableTarget(e.target)) {
        e.preventDefault();
        lock();
        return;
      }
    }

    if (!isShowing()) return;

    const stored = getStoredPin();
    if (stored === null && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      unlock();
      return;
    }

    if (e.target && e.target.id === 'lock-pin' && e.key === 'Enter') {
      e.preventDefault();
      unlock();
      return;
    }
    if (e.target && e.target.id === 'lock-unlock' && e.key === 'Enter') {
      e.preventDefault();
      unlock();
    }
  }

  // Public API used by Settings and Start menu.
  window.StarLock = {
    lock,
    unlock,
    setPin: setStoredPin,
    getPin: () => getStoredPin(),
    hasPin: () => getStoredPin() !== null,
    getAutoLockMs,
    setAutoLockMs,
    isLocked: () => locked
  };

  document.addEventListener('click', handleLockClick, true);
  document.addEventListener('keydown', handleKeydown, true);
  ['mousemove', 'mousedown', 'wheel', 'touchstart'].forEach(type => {
    document.addEventListener(type, noteActivity, { passive: true });
  });
  scheduleAutoLock();
})();