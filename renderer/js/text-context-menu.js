
(function () {
  let electronClipboard = null;
  try {
    const electron = require('electron');
    electronClipboard = electron && electron.clipboard ? electron.clipboard : null;
  } catch (_) {}

  let activeEditable = null;
  let activeSelectionText = '';
  let activeInputSelectionText = '';
  let lastMenuOpenAt = 0;

  // Vue may re-render and replace DOM nodes inside #app. Always query fresh refs.
  function getMenu() { return document.getElementById('text-context-menu'); }
  function getBtns() {
    return {
      cutBtn: document.getElementById('text-ctx-cut'),
      copyBtn: document.getElementById('text-ctx-copy'),
      pasteBtn: document.getElementById('text-ctx-paste'),
      selectAllBtn: document.getElementById('text-ctx-select-all')
    };
  }

  function isTextInput(el) {
    if (!el || !el.tagName) return false;
    const tag = String(el.tagName).toLowerCase();
    if (tag === 'textarea') return true;
    if (tag !== 'input') return false;
    const type = String(el.type || '').toLowerCase();
    return !['button', 'submit', 'checkbox', 'radio', 'range', 'color', 'file'].includes(type);
  }

  function getEditableTarget(target) {
    if (!target || !target.closest) return null;
    const editable = target.closest('textarea, input, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]');
    return editable || null;
  }

  function getSelectionText() {
    try {
      const sel = window.getSelection && window.getSelection();
      if (!sel) return '';
      const text = String(sel.toString ? sel.toString() : '').trim();
      return text;
    } catch (_) {
      return '';
    }
  }

  function getInputSelectionText(input) {
    if (!input) return '';
    if (!isTextInput(input)) return '';
    try {
      const start = typeof input.selectionStart === 'number' ? input.selectionStart : 0;
      const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : 0;
      if (end <= start) return '';
      return String(input.value || '').slice(start, end);
    } catch (_) {
      return '';
    }
  }

  function setBtnVisible(btn, visible) {
    if (!btn) return;
    btn.style.display = visible ? '' : 'none';
  }

  function hideMenu() {
    const menu = getMenu();
    if (menu) menu.classList.add('hidden');
    activeEditable = null;
    activeSelectionText = '';
    activeInputSelectionText = '';
  }

  function resolveAction(target) {
    if (!target || !target.closest) return '';
    const btn = target.closest('button');
    if (!btn || !btn.id) return '';
    const id = String(btn.id);
    if (id === 'text-ctx-cut') return 'cut';
    if (id === 'text-ctx-copy') return 'copy';
    if (id === 'text-ctx-paste') return 'paste';
    if (id === 'text-ctx-select-all') return 'selectAll';
    return '';
  }

  function clampMenuPosition(x, y) {
    const menu = getMenu();
    if (!menu) return;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.remove('hidden');
    lastMenuOpenAt = Date.now();
    // After unhide, measure and clamp.
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      const pad = 8;
      let nx = x;
      let ny = y;
      if (nx + rect.width + pad > window.innerWidth) nx = Math.max(pad, window.innerWidth - rect.width - pad);
      if (ny + rect.height + pad > window.innerHeight) ny = Math.max(pad, window.innerHeight - rect.height - pad);
      menu.style.left = nx + 'px';
      menu.style.top = ny + 'px';
    });
  }

  async function writeClipboard(text) {
    const value = String(text == null ? '' : text);
    try {
      if (electronClipboard && typeof electronClipboard.writeText === 'function') {
        electronClipboard.writeText(value);
        return true;
      }
    } catch (_) {}
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (_) {}
    return false;
  }

  async function readClipboard() {
    try {
      if (electronClipboard && typeof electronClipboard.readText === 'function') {
        return String(electronClipboard.readText() || '');
      }
    } catch (_) {}
    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        return String((await navigator.clipboard.readText()) || '');
      }
    } catch (_) {}
    return '';
  }

  function replaceInputSelection(input, insertText, { deleteSelection } = {}) {
    if (!input || !isTextInput(input)) return;
    const text = String(insertText == null ? '' : insertText);
    try {
      const start = typeof input.selectionStart === 'number' ? input.selectionStart : 0;
      const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : 0;
      const value = String(input.value || '');
      const left = value.slice(0, start);
      const right = value.slice(deleteSelection ? end : start);
      input.value = left + text + right;
      const nextPos = (left + text).length;
      input.selectionStart = nextPos;
      input.selectionEnd = nextPos;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (_) {}
  }

  function selectAllInEditable(el) {
    if (!el) return;
    if (isTextInput(el)) {
      try { el.focus(); el.select(); } catch (_) {}
      return;
    }
    if (el.isContentEditable) {
      try {
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch (_) {}
    }
  }

  async function onCut() {
    const el = activeEditable;
    if (!el) return;
    if (isTextInput(el)) {
      const text = activeInputSelectionText || getInputSelectionText(el);
      if (!text) return;
      await writeClipboard(text);
      replaceInputSelection(el, '', { deleteSelection: true });
      return;
    }
    if (el.isContentEditable) {
      try {
        el.focus();
        document.execCommand('cut');
      } catch (_) {}
    }
  }

  async function onCopy() {
    const el = activeEditable;
    const text = activeSelectionText || (el ? activeInputSelectionText : '') || '';
    if (!text) return;
    await writeClipboard(text);
  }

  async function onPaste() {
    const el = activeEditable;
    if (!el) return;
    const text = await readClipboard();
    if (!text) return;
    if (isTextInput(el)) {
      replaceInputSelection(el, text, { deleteSelection: true });
      return;
    }
    if (el.isContentEditable) {
      try {
        el.focus();
        document.execCommand('insertText', false, text);
      } catch (_) {}
    }
  }

  function onSelectAll() {
    selectAllInEditable(activeEditable);
  }

  // Use capture+mousedown so actions happen before selection/focus is changed by button click.
  document.addEventListener('mousedown', (e) => {
    const action = resolveAction(e && e.target);
    if (!action) return;
    e.preventDefault();
    e.stopPropagation();
    if (action === 'cut') {
      onCut().catch(() => {}).finally(hideMenu);
      return;
    }
    if (action === 'copy') {
      onCopy().catch(() => {}).finally(hideMenu);
      return;
    }
    if (action === 'paste') {
      onPaste().catch(() => {}).finally(hideMenu);
      return;
    }
    if (action === 'selectAll') {
      onSelectAll();
      hideMenu();
    }
  }, true);

  document.addEventListener('click', (e) => {
    const menu = getMenu();
    if (!menu) return;
    if (resolveAction(e && e.target)) return;

    // Some environments fire a click immediately after contextmenu; ignore that to prevent instant close.
    if (Date.now() - lastMenuOpenAt < 160) return;
    if (!menu.classList.contains('hidden') && (!e.target || !menu.contains(e.target))) hideMenu();
  });
  document.addEventListener('contextmenu', (e) => {
    const menu = getMenu();
    if (!menu) return;
    if (e && e.target && menu.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
  window.addEventListener('blur', hideMenu);
  window.addEventListener('resize', hideMenu);
  window.addEventListener('scroll', hideMenu, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideMenu(); }, true);

  // Capture-phase: ensure it runs before desktop's context menu.
  document.addEventListener('contextmenu', (e) => {
    try {
      const target = e.target;
      if (!target || !target.closest) return;

      // Only for app windows.
      const win = target.closest('.star-window');
      if (!win) return;
      if (target.closest('.window-titlebar')) return;

      const editable = getEditableTarget(target);
      // File manager has its own context menu for file operations,
      // but inline rename inputs should still use the text edit menu.
      if (target.closest('#file-manager-app') && !editable) return;

      const selectionText = getSelectionText();
      const inputSel = editable ? getInputSelectionText(editable) : '';

      const hasEditable = !!editable;
      const hasSelection = !!selectionText;
      const hasInputSelection = !!inputSel;

      // Show menu if selection exists OR we are in an editable field.
      if (!hasSelection && !hasEditable) return;

      activeEditable = editable;
      activeSelectionText = selectionText;
      activeInputSelectionText = inputSel;

      const canCut = hasEditable && (editable.isContentEditable || hasInputSelection);
      const canCopy = hasSelection || (hasEditable && hasInputSelection);
      const canPaste = hasEditable;
      const canSelectAll = hasEditable;

      if (!canCut && !canCopy && !canPaste && !canSelectAll) return;

      const { cutBtn, copyBtn, pasteBtn, selectAllBtn } = getBtns();
      setBtnVisible(cutBtn, canCut);
      setBtnVisible(copyBtn, canCopy);
      setBtnVisible(pasteBtn, canPaste);
      setBtnVisible(selectAllBtn, canSelectAll);

      e.preventDefault();
      e.stopPropagation();
      clampMenuPosition(e.clientX, e.clientY);
    } catch (_) {}
  }, true);
})();