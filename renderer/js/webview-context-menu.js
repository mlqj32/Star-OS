
(function () {
  let ipcRenderer = null;
  try {
    const electron = require('electron');
    ipcRenderer = electron && electron.ipcRenderer ? electron.ipcRenderer : null;
  } catch (_) {
    ipcRenderer = null;
  }
  if (!ipcRenderer) return;

  let activeWebContentsId = 0;
  let activeSelectionText = '';
  let activeIsEditable = false;
  let activeEditFlags = {};
  let lastMenuOpenAt = 0;

  // Vue may re-render and replace DOM nodes inside #app. Always query fresh refs.
  function getMenu() { return document.getElementById('webview-text-context-menu'); }
  function getBtns() {
    return {
      cutBtn: document.getElementById('wv-ctx-cut'),
      copyBtn: document.getElementById('wv-ctx-copy'),
      pasteBtn: document.getElementById('wv-ctx-paste'),
      selectAllBtn: document.getElementById('wv-ctx-select-all')
    };
  }

  function setBtnVisible(btn, visible) {
    if (!btn) return;
    btn.style.display = visible ? '' : 'none';
  }

  function hideMenu() {
    const menu = getMenu();
    if (menu) menu.classList.add('hidden');
    activeWebContentsId = 0;
    activeSelectionText = '';
    activeIsEditable = false;
    activeEditFlags = {};
  }

  function resolveAction(target) {
    if (!target || !target.closest) return '';
    const btn = target.closest('button');
    if (!btn || !btn.id) return '';
    const id = String(btn.id);
    if (id === 'wv-ctx-cut') return 'cut';
    if (id === 'wv-ctx-copy') return 'copy';
    if (id === 'wv-ctx-paste') return 'paste';
    if (id === 'wv-ctx-select-all') return 'selectAll';
    return '';
  }

  function clampMenuPosition(x, y) {
    const menu = getMenu();
    if (!menu) return;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.remove('hidden');
    lastMenuOpenAt = Date.now();
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

  async function invokeEdit(action, webContentsId, stateOverride) {
    const id = Number(webContentsId || activeWebContentsId) || 0;
    const state = stateOverride && typeof stateOverride === 'object' ? stateOverride : null;
    if (!id) return { ok: false, error: 'NO_TARGET' };
    let lastError = '';
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await ipcRenderer.invoke('browser:webviewEdit', {
          webContentsId: id,
          action,
          selectionText: state ? state.selectionText : activeSelectionText,
          isEditable: state ? state.isEditable : activeIsEditable,
          editFlags: state ? state.editFlags : activeEditFlags
        });
        if (result && result.ok) return result;
        lastError = String(result && result.error ? result.error : '');
      } catch (error) {
        lastError = error && error.message ? error.message : String(error || '');
      }
      if (attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 60));
      }
    }
    return { ok: false, error: lastError || 'UNKNOWN_ERROR' };
  }

  // Use capture+mousedown so actions run before focus/selection is lost.
  document.addEventListener('mousedown', (e) => {
    const action = resolveAction(e && e.target);
    if (!action) return;
    const targetId = Number(activeWebContentsId) || 0;
    const state = {
      selectionText: activeSelectionText,
      isEditable: activeIsEditable,
      editFlags: Object.assign({}, activeEditFlags || {})
    };
    e.preventDefault();
    e.stopPropagation();
    hideMenu();
    invokeEdit(action, targetId, state).catch(() => {});
  }, true);

  document.addEventListener('click', (e) => {
    const menu = getMenu();
    if (!menu) return;
    if (resolveAction(e && e.target)) return;

    // Some right-clicks trigger a click event right after opening; ignore to avoid instant close.
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

  ipcRenderer.on('browser:webview-context-menu', (_event, payload) => {
    try {
      const data = payload && typeof payload === 'object' ? payload : {};
      const webContentsId = Number(data.webContentsId) || 0;
      const x = Number(data.x) || 0;
      const y = Number(data.y) || 0;
      const selectionText = String(data.selectionText || '');
      const isEditable = !!data.isEditable;
      const flags = data.editFlags && typeof data.editFlags === 'object' ? data.editFlags : {};

      const canCut = !!flags.canCut && isEditable;
      const canCopy = (!!flags.canCopy && (isEditable || selectionText.trim())) || (!!selectionText.trim());
      const canPaste = !!flags.canPaste && isEditable;
      // For non-editable pages, "select all" often causes intrusive full-page highlight.
      const canSelectAll = !!flags.canSelectAll && isEditable;

      if (!canCut && !canCopy && !canPaste && !canSelectAll) {
        hideMenu();
        return;
      }

      activeWebContentsId = webContentsId;
      activeSelectionText = selectionText;
      activeIsEditable = isEditable;
      activeEditFlags = flags;
      const { cutBtn, copyBtn, pasteBtn, selectAllBtn } = getBtns();
      setBtnVisible(cutBtn, canCut);
      setBtnVisible(copyBtn, canCopy);
      setBtnVisible(pasteBtn, canPaste);
      setBtnVisible(selectAllBtn, canSelectAll);

      clampMenuPosition(x, y);
    } catch (_) {}
  });
})();