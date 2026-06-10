
/** Star OS 窗口管理器 */
const StarWindowManager = {
  windows: [],
  /** 主进程托管 EXE：与内置窗口并列出现在任务栏 */
  managedHosts: [],
  managedActiveTaskbarId: null,
  zIndexBase: 1000,
  activeId: null,

  getMaximizeButtonSvg(maximized) {
    if (maximized) {
      return '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M4 1.5h6.5V8"/><path d="M1.5 4h6.5v6.5H1.5z"/><path d="M4 4h4V8"/></svg>';
    }
    return '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.5" y="1.5" width="9" height="9" rx="0.5"/></svg>';
  },

  syncWindowControls(win) {
    if (!win || !win.el) return;
    const maxBtn = win.el.querySelector('.title-btn.max');
    if (!maxBtn) return;
    maxBtn.innerHTML = this.getMaximizeButtonSvg(!!win.maximized);
    maxBtn.setAttribute('aria-label', win.maximized ? t('restoreWindow') : t('maximizeWindow'));
    maxBtn.title = t('maximize');
  },

  syncWindowStateClasses(win) {
    if (!win || !win.el) return;
    win.el.classList.toggle('is-maximized', !!win.maximized);
    win.el.classList.toggle('is-minimized', !!win.minimized);
  },

  create(options) {
    const id = 'win-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const win = {
      id,
      appId: options.appId || 'app',
      title: options.title || 'Star',
      icon: options.icon || '',
      width: options.width || 800,
      height: options.height || 600,
      x: options.x ?? Math.max(0, (document.documentElement.clientWidth - (options.width || 800)) / 2),
      y: options.y ?? Math.max(0, (document.documentElement.clientHeight - 48 - (options.height || 600)) / 2),
      content: options.content || '',
      iframeUrl: options.iframeUrl || '',
      minimized: false,
      maximized: false,
      el: null,
      contentEl: null,
      localeRefresh: null,
    };
    this.windows.push(win);
    this.render(win);
    this.focus(id);
    return id;
  },

  render(win) {
    const container = document.getElementById('windows-container');
    const div = document.createElement('div');
    div.className = 'star-window';
    div.id = win.id;
    div.dataset.appId = win.appId || 'app';
    div.style.width = win.width + 'px';
    div.style.height = win.height + 'px';
    div.style.left = win.x + 'px';
    div.style.top = win.y + 'px';
    div.style.zIndex = this.zIndexBase + this.windows.length;
    div.innerHTML = `
      <div class="window-titlebar">
        <span class="title-icon">${win.icon || '<svg viewBox="0 0 24 24" fill="currentColor"><defs><linearGradient id="starWinIconGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7c9cff"/><stop offset="100%" stop-color="#50e3c2"/></linearGradient></defs><rect width="20" height="20" x="2" y="2" rx="6" fill="url(#starWinIconGrad)"/><path d="M9 9h6v2H9zM9 13h4v2H9z" fill="#0b1020"/></svg>'}</span>
        <span class="title-text">${escapeHtml(win.title)}</span>
        <div class="title-btns">
          <button class="title-btn min" data-action="minimize" title="${t('minimize')}"><svg viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="5" width="12" height="2" rx="0.5"/></svg></button>
          <button class="title-btn max" data-action="maximize" title="${t('maximize')}">${this.getMaximizeButtonSvg(win.maximized)}</button>
          <button class="title-btn close" data-action="close" title="${t('close')}"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 2l8 8M10 2L2 10"/></svg></button>
        </div>
      </div>
      <div class="window-content">${win.iframeUrl ? `<iframe src="${win.iframeUrl}" style="width:100%;height:100%;border:0;"></iframe>` : (win.content || '')}</div>
    `;
    container.appendChild(div);
    win.el = div;
    win.contentEl = div.querySelector('.window-content');
    this.syncWindowStateClasses(win);
    this.syncWindowControls(win);
    if (!win.iframeUrl) win.contentEl.innerHTML = win.content;
    if (win.contentEl && win.appId && typeof StarAppsLogic !== 'undefined' && StarAppsLogic[win.appId]) {
      try { StarAppsLogic[win.appId](win.contentEl); } catch (e) { console.error(e); }
    }

    const titlebar = div.querySelector('.window-titlebar');
    let drag = null;
    const onMove = (e) => {
      if (!drag) return;
      win.x = e.clientX - drag.x;
      win.y = e.clientY - drag.y;
      div.style.left = win.x + 'px';
      div.style.top = win.y + 'px';
    };
    const onUp = (e) => {
      if (!drag) return;
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight - 48;
      const edge = 32;
      if (e.clientX <= edge) {
        win._prevSnap = { width: win.width, height: win.height, x: win.x, y: win.y };
        win.x = 0; win.y = 0; win.width = Math.floor(vw / 2); win.height = vh;
      } else if (e.clientX >= vw - edge) {
        win._prevSnap = { width: win.width, height: win.height, x: win.x, y: win.y };
        win.width = Math.floor(vw / 2); win.height = vh; win.x = vw - win.width; win.y = 0;
      }
      if (win.el) {
        win.el.style.left = win.x + 'px'; win.el.style.top = win.y + 'px';
        win.el.style.width = win.width + 'px'; win.el.style.height = win.height + 'px';
      }
      drag = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    titlebar.addEventListener('mousedown', e => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      e.stopPropagation();
      this.focus(win.id);
      drag = { x: e.clientX - win.x, y: e.clientY - win.y };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    div.querySelectorAll('.title-btn').forEach(btn => {
      // Prevent mousedown from focusing titlebar buttons; Space/Enter would then re-trigger them.
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        if (action === 'minimize') this.minimize(win.id);
        else if (action === 'maximize') this.maximize(win.id);
        else if (action === 'close') this.close(win.id);
        // Prevent the title buttons from keeping focus: Space/Enter would otherwise "click" them again,
        // which feels like Space toggles maximize/minimize while using games.
        try { btn.blur(); } catch (_) {}
        try { if (win && win.contentEl) win.contentEl.focus && win.contentEl.focus(); } catch (_) {}
      });
      // Space/Enter triggers button activation by default; avoid global hotkey conflicts while a game uses Space.
      btn.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          try { btn.blur(); } catch (_) {}
        }
      });
    });
    div.addEventListener('mousedown', () => this.focus(win.id));
    setTimeout(() => {
      if (window.updateTaskbarApps) window.updateTaskbarApps();
      if (window.scaleGameCanvases) window.scaleGameCanvases();
    }, 0);
  },

  focus(id) {
    const w = this.windows.find(x => x.id === id);
    if (!w || w.minimized) return;
    this.managedActiveTaskbarId = null;
    this.activeId = id;
    this.windows.forEach((x, i) => {
      if (x.el) x.el.style.zIndex = this.zIndexBase + (x.id === id ? this.windows.length : i);
    });
    if (w.el) w.el.style.zIndex = this.zIndexBase + this.windows.length;
    if (window.updateTaskbarApps) window.updateTaskbarApps();

    // If a titlebar button currently holds focus, Space/Enter can trigger minimize/maximize unexpectedly.
    // Move focus into the window content area when focusing a window.
    try {
      const ae = document.activeElement;
      if (ae && w.el && w.el.contains(ae) && ae.classList && ae.classList.contains('title-btn')) {
        ae.blur();
      }
      if (w.contentEl && w.contentEl.focus) w.contentEl.focus();
    } catch (_) {}
  },

  minimize(id) {
    const w = this.windows.find(x => x.id === id);
    if (!w) return;
    w.minimized = true;
    if (w.el) w.el.classList.add('hidden');
    this.syncWindowStateClasses(w);
    if (this.activeId === id) {
      const next = this.windows.filter(x => !x.minimized).pop();
      if (next) this.focus(next.id);
    }
    if (window.updateTaskbarApps) window.updateTaskbarApps();
  },

  maximize(id) {
    const w = this.windows.find(x => x.id === id);
    if (!w) return;
    w.maximized = !w.maximized;
    const area = document.getElementById('desktop').getBoundingClientRect();
    if (w.maximized) {
      w._prev = { width: w.width, height: w.height, x: w.x, y: w.y };
      w.width = area.width;
      w.height = area.height;
      w.x = 0;
      w.y = 0;
    } else if (w._prev) {
      w.width = w._prev.width;
      w.height = w._prev.height;
      w.x = w._prev.x;
      w.y = w._prev.y;
    }
    if (w.el) {
      w.el.style.width = w.width + 'px';
      w.el.style.height = w.height + 'px';
      w.el.style.left = w.x + 'px';
      w.el.style.top = w.y + 'px';
    }
    this.syncWindowStateClasses(w);
    this.syncWindowControls(w);
    if (w.appId === 'browser') {
      setTimeout(() => {
        try { window.dispatchEvent(new CustomEvent('star:browser-reflow')); } catch (_) {}
      }, 0);
    }
    setTimeout(function() { if (window.scaleGameCanvases) window.scaleGameCanvases(); }, 0);
  },

  close(id) {
    const idx = this.windows.findIndex(x => x.id === id);
    if (idx === -1) return;
    const w = this.windows[idx];
    const el = w.el;
    if (el) {
      el.classList.add('window-closing');
      const duration = 200;
      setTimeout(() => {
        if (el.parentNode) el.remove();
      }, duration);
    }
    this.windows.splice(idx, 1);
    if (this.activeId === id && this.windows.length) {
      const next = this.windows.filter(x => !x.minimized).pop();
      if (next) this.focus(next.id);
    }
    if (window.updateTaskbarApps) window.updateTaskbarApps();
  },

  restore(id) {
    const w = this.windows.find(x => x.id === id);
    if (!w) return;
    w.minimized = false;
    this.syncWindowStateClasses(w);
    if (w.el) {
      w.el.classList.remove('hidden');
      this.focus(id);
    }
    if (w.appId === 'browser') {
      setTimeout(() => {
        try { window.dispatchEvent(new CustomEvent('star:browser-reflow')); } catch (_) {}
      }, 0);
    }
    if (window.updateTaskbarApps) window.updateTaskbarApps();
  },

  registerManagedHost(meta) {
    const sessionId = meta && meta.sessionId != null ? String(meta.sessionId) : '';
    if (!sessionId) return;
    const taskbarId = 'mh-' + sessionId;
    const title = meta && meta.title ? String(meta.title) : 'App';
    const iconDataUrl = meta && meta.iconDataUrl ? String(meta.iconDataUrl) : '';
    const gid = 'mexe' + Math.random().toString(36).slice(2, 9);
    const fallbackIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7c9cff"/><stop offset="100%" stop-color="#50e3c2"/></linearGradient></defs><rect width="20" height="20" x="2" y="2" rx="6" fill="url(#${gid})"/><path d="M9 9h6v2H9zM9 13h4v2H9z" fill="#0b1020"/></svg>`;
    const icon = iconDataUrl
      ? `<img src="${iconDataUrl.replace(/"/g, '&quot;')}" alt="" class="taskbar-managed-exe-icon" />`
      : fallbackIcon;
    const idx = this.managedHosts.findIndex(h => h.sessionId === sessionId);
    const row = { sessionId, taskbarId, title, icon, minimized: false };
    if (idx >= 0) this.managedHosts[idx] = Object.assign({}, this.managedHosts[idx], row);
    else this.managedHosts.push(row);
    if (window.updateTaskbarApps) window.updateTaskbarApps();
  },

  unregisterManagedHost(sessionId) {
    const id = String(sessionId || '');
    this.managedHosts = this.managedHosts.filter(h => h.sessionId !== id);
    if (this.managedActiveTaskbarId === 'mh-' + id) this.managedActiveTaskbarId = null;
    if (window.updateTaskbarApps) window.updateTaskbarApps();
  },

  setManagedHostMinimized(sessionId, minimized) {
    const h = this.managedHosts.find(x => x.sessionId === String(sessionId));
    if (h) h.minimized = !!minimized;
    if (window.updateTaskbarApps) window.updateTaskbarApps();
  },
};

try {
  if (typeof window !== 'undefined') window.StarWindowManager = StarWindowManager;
} catch (_) {}

try {
  const { ipcRenderer } = require('electron');
  if (ipcRenderer && typeof window !== 'undefined') {
    ipcRenderer.on('managed-exe:taskbar-register', (_e, payload) => {
      if (payload && StarWindowManager.registerManagedHost) StarWindowManager.registerManagedHost(payload);
    });
    ipcRenderer.on('managed-exe:taskbar-unregister', (_e, sessionId) => {
      if (StarWindowManager.unregisterManagedHost) StarWindowManager.unregisterManagedHost(sessionId);
    });
    ipcRenderer.on('managed-exe:taskbar-focus', (_e, sessionId) => {
      StarWindowManager.managedActiveTaskbarId = 'mh-' + String(sessionId || '');
      if (window.updateTaskbarApps) window.updateTaskbarApps();
    });
    ipcRenderer.on('managed-exe:taskbar-minimized', (_e, payload) => {
      if (!payload || !payload.sessionId) return;
      if (StarWindowManager.setManagedHostMinimized) {
        StarWindowManager.setManagedHostMinimized(payload.sessionId, !!payload.minimized);
      }
    });
  }
} catch (_) {}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/** 小游戏画布按窗口适应：保持比例缩放，不拉伸、不溢出 */
window.scaleGameCanvases = function() {
  document.querySelectorAll('.game-canvas-fit').forEach(function(wrap) {
    const canvas = wrap.querySelector('canvas');
    if (!canvas || !canvas.width || !canvas.height) return;
    var cw = wrap.clientWidth, ch = wrap.clientHeight;
    if (cw <= 0 || ch <= 0) return;
    var scale = Math.min(cw / canvas.width, ch / canvas.height);
    canvas.style.width = (canvas.width * scale) + 'px';
    canvas.style.height = (canvas.height * scale) + 'px';
  });
};
if (typeof window.addEventListener === 'function') {
  window.addEventListener('resize', function() { if (window.scaleGameCanvases) window.scaleGameCanvases(); });
}

// 系统内复制/粘贴隔离：在 Star 窗口内选中并复制时不同步到宿主剪贴板，避免触发外部复制粘贴
(function() {
  // Keep an optional in-app clipboard mirror, but do NOT hijack native edit actions.
  window.starClipboard = '';
  document.addEventListener('copy', function(e) {
    const target = e && e.target;
    if (!target || !target.closest || !target.closest('.star-window')) return;
    try {
      window.starClipboard = (window.getSelection && window.getSelection().toString()) || '';
    } catch (_) {}
  }, true);
  document.addEventListener('cut', function(e) {
    const target = e && e.target;
    if (!target || !target.closest || !target.closest('.star-window')) return;
    try {
      window.starClipboard = (window.getSelection && window.getSelection().toString()) || '';
    } catch (_) {}
  }, true);
})();