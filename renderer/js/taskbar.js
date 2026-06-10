
/** Star OS taskbar */
(function() {
  const langNames = {
    'zh-CN': '简体中文',
    'zh-TW': '繁体中文',
    en: 'English',
    ja: '日本語',
    ko: '한국어'
  };

  let taskbarAppMenuWid = null;
  let taskbarResizeObserver = null;
  let observedTaskbarAppsViewport = null;
  let observedTaskbarApps = null;
  let taskbarWindowObserver = null;
  let observedWindowsContainer = null;
  let taskbarRefreshQueued = false;

  function getRefs() {
    return {
      taskbar: document.getElementById('taskbar'),
      taskbarApps: document.getElementById('taskbar-apps'),
      taskbarAppsWrap: document.querySelector('.taskbar-apps-wrap'),
      taskbarAppsViewport: document.getElementById('taskbar-apps-viewport'),
      taskbarScrollLeftBtn: document.getElementById('taskbar-scroll-left'),
      taskbarScrollRightBtn: document.getElementById('taskbar-scroll-right'),
      startMenu: document.getElementById('start-menu'),
      windowsContainer: document.getElementById('windows-container'),
      tbMenu: document.getElementById('taskbar-context-menu'),
      tbAppMenu: document.getElementById('taskbar-app-context-menu'),
      tbShowDesktopBtn: document.getElementById('taskbar-show-desktop'),
      tbTaskBtn: document.getElementById('taskbar-open-taskmgr'),
      tbSettingsBtn: document.getElementById('taskbar-open-settings'),
      tbTaskbarSettingsBtn: document.getElementById('taskbar-open-taskbar-settings'),
      tbAppCloseBtn: document.getElementById('taskbar-app-close-window'),
      trayTime: document.getElementById('tray-time'),
      trayLang: document.getElementById('tray-lang')
    };
  }

  function getEscapedIdSelector(id) {
    const text = String(id || '');
    if (!text) return '';
    try {
      if (typeof CSS !== 'undefined' && CSS && typeof CSS.escape === 'function') {
        return '#' + CSS.escape(text);
      }
    } catch (_) {}
    return '[id="' + text.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]';
  }

  function getWindowDomById(id) {
    const { windowsContainer } = getRefs();
    if (!windowsContainer || !id) return null;
    try {
      return windowsContainer.querySelector(getEscapedIdSelector(id));
    } catch (_) {
      return null;
    }
  }

  function resolveWindowTitle(win, domWin) {
    if (win && typeof win.title === 'string' && win.title.trim()) return win.title.trim();
    const titleEl = domWin && domWin.querySelector ? domWin.querySelector('.title-text') : null;
    const domTitle = titleEl && titleEl.textContent ? String(titleEl.textContent).trim() : '';
    if (domTitle) return domTitle;
    return 'Star';
  }

  function resolveWindowIcon(win, domWin) {
    if (win && typeof win.icon === 'string' && win.icon.trim()) return win.icon;
    const iconEl = domWin && domWin.querySelector ? domWin.querySelector('.title-icon') : null;
    const domIcon = iconEl && typeof iconEl.innerHTML === 'string' ? iconEl.innerHTML.trim() : '';
    if (domIcon) return domIcon;
    return getDefaultTaskbarIconMarkup();
  }

  function getDefaultTaskbarIconMarkup() {
    return '<svg viewBox="0 0 24 24" fill="currentColor"><rect width="20" height="20" x="2" y="2" rx="2"/></svg>';
  }

  function getShortTaskbarTitle(title) {
    const safeTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Star';
    return safeTitle.length > 14 ? (safeTitle.slice(0, 13) + '...') : safeTitle;
  }

  function ensureTaskbarButtonStructure(btn) {
    if (!btn) return null;
    let iconSlot = btn.querySelector('.taskbar-app-icon');
    let titleEl = btn.querySelector('.taskbar-app-title');
    if (iconSlot && titleEl) return { iconSlot, titleEl };

    btn.textContent = '';
    iconSlot = document.createElement('span');
    iconSlot.className = 'taskbar-app-icon';
    iconSlot.setAttribute('aria-hidden', 'true');
    titleEl = document.createElement('span');
    titleEl.className = 'taskbar-app-title';
    btn.appendChild(iconSlot);
    btn.appendChild(titleEl);
    return { iconSlot, titleEl };
  }

  function createTaskbarButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'taskbar-app-btn';
    ensureTaskbarButtonStructure(btn);
    return btn;
  }

  function syncTaskbarButton(btn, win, isActive) {
    if (!btn || !win) return;
    const safeTitle = typeof win.title === 'string' && win.title.trim() ? win.title.trim() : 'Star';
    const shortTitle = getShortTaskbarTitle(safeTitle);
    const iconMarkup = typeof win.icon === 'string' && win.icon.trim() ? win.icon.trim() : getDefaultTaskbarIconMarkup();
    const { iconSlot, titleEl } = ensureTaskbarButtonStructure(btn);

    if (btn.getAttribute('data-wid') !== String(win.id)) {
      btn.setAttribute('data-wid', String(win.id));
    }
    if (btn.getAttribute('data-app-id') !== String(win.appId || '')) {
      btn.setAttribute('data-app-id', String(win.appId || ''));
    }
    if (btn.title !== safeTitle) btn.title = safeTitle;
    if (btn.getAttribute('aria-label') !== safeTitle) {
      btn.setAttribute('aria-label', safeTitle);
    }
    const minimizedValue = win.minimized ? 'true' : 'false';
    if (btn.getAttribute('data-minimized') !== minimizedValue) {
      btn.setAttribute('data-minimized', minimizedValue);
    }
    btn.classList.toggle('active', !!isActive);

    if (btn.dataset.iconHtml !== iconMarkup) {
      iconSlot.innerHTML = iconMarkup;
      btn.dataset.iconHtml = iconMarkup;
    }
    if (titleEl.textContent !== shortTitle) {
      titleEl.textContent = shortTitle;
    }
  }

  function buildTaskbarWindowItems() {
    const { windowsContainer } = getRefs();
    const items = [];
    const seen = new Set();
    const sourceWins = (window.StarWindowManager && Array.isArray(StarWindowManager.windows))
      ? StarWindowManager.windows.slice()
      : [];

    sourceWins.forEach((win) => {
      if (!win || !win.id || seen.has(win.id)) return;
      const domWin = getWindowDomById(win.id);
      items.push({
        id: String(win.id),
        appId: win.appId || '',
        title: resolveWindowTitle(win, domWin),
        icon: resolveWindowIcon(win, domWin),
        minimized: !!(win.minimized || (domWin && domWin.classList && domWin.classList.contains('hidden')))
      });
      seen.add(win.id);
    });

    if (windowsContainer) {
      windowsContainer.querySelectorAll('.star-window[id]').forEach((domWin) => {
        const id = String(domWin.id || '').trim();
        if (!id || seen.has(id)) return;
        items.push({
          id,
          appId: '',
          title: resolveWindowTitle(null, domWin),
          icon: resolveWindowIcon(null, domWin),
          minimized: domWin.classList.contains('hidden')
        });
        seen.add(id);
      });
    }

    if (window.StarWindowManager && Array.isArray(StarWindowManager.managedHosts)) {
      StarWindowManager.managedHosts.forEach((h) => {
        if (!h || !h.taskbarId || seen.has(h.taskbarId)) return;
        items.push({
          id: h.taskbarId,
          appId: 'managed-exe',
          title: h.title || 'App',
          icon: h.icon || getDefaultTaskbarIconMarkup(),
          minimized: !!h.minimized
        });
        seen.add(h.taskbarId);
      });
    }

    return items;
  }

  function syncTaskbarOverflow() {
    const {
      taskbarAppsWrap,
      taskbarAppsViewport,
      taskbarScrollLeftBtn,
      taskbarScrollRightBtn
    } = getRefs();
    if (!taskbarAppsWrap || !taskbarAppsViewport) return;
    const maxScroll = Math.max(0, taskbarAppsViewport.scrollWidth - taskbarAppsViewport.clientWidth);
    const overflow = maxScroll > 4;
    if (!overflow && taskbarAppsViewport.scrollLeft !== 0) {
      taskbarAppsViewport.scrollLeft = 0;
    }
    const canScrollLeft = overflow && taskbarAppsViewport.scrollLeft > 4;
    const canScrollRight = overflow && taskbarAppsViewport.scrollLeft < maxScroll - 4;
    taskbarAppsWrap.classList.toggle('is-overflowing', overflow);
    taskbarAppsWrap.classList.toggle('can-scroll-left', canScrollLeft);
    taskbarAppsWrap.classList.toggle('can-scroll-right', canScrollRight);
    if (taskbarScrollLeftBtn) {
      taskbarScrollLeftBtn.classList.toggle('hidden', !overflow);
      taskbarScrollLeftBtn.disabled = !canScrollLeft;
    }
    if (taskbarScrollRightBtn) {
      taskbarScrollRightBtn.classList.toggle('hidden', !overflow);
      taskbarScrollRightBtn.disabled = !canScrollRight;
    }
  }

  function ensureTaskbarButtonVisible(btn) {
    const { taskbarAppsViewport, taskbarAppsWrap } = getRefs();
    if (!btn || !taskbarAppsViewport || !taskbarAppsWrap || !taskbarAppsWrap.classList.contains('is-overflowing')) return;
    const viewportRect = taskbarAppsViewport.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    if (btnRect.left < viewportRect.left || btnRect.right > viewportRect.right) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      window.setTimeout(syncTaskbarOverflow, 220);
    }
  }

  function scrollTaskbarApps(delta) {
    const { taskbarAppsViewport } = getRefs();
    if (!taskbarAppsViewport) return;
    taskbarAppsViewport.scrollBy({ left: delta, behavior: 'smooth' });
    window.setTimeout(syncTaskbarOverflow, 220);
  }

  function scheduleTaskbarRefresh() {
    if (taskbarRefreshQueued) return;
    taskbarRefreshQueued = true;
    requestAnimationFrame(() => {
      taskbarRefreshQueued = false;
      if (window.updateTaskbarApps) window.updateTaskbarApps();
    });
  }

  function updateTime() {
    const { trayTime } = getRefs();
    if (!trayTime) return;
    const now = new Date();
    trayTime.textContent = now.toLocaleTimeString(getLocale(), {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function refreshTaskbarLocale() {
    const {
      tbShowDesktopBtn,
      tbTaskBtn,
      tbSettingsBtn,
      tbTaskbarSettingsBtn,
      tbAppCloseBtn,
      taskbarScrollLeftBtn,
      taskbarScrollRightBtn,
      trayLang
    } = getRefs();
    if (tbShowDesktopBtn) tbShowDesktopBtn.textContent = t('showDesktop');
    if (tbTaskBtn) tbTaskBtn.textContent = t('taskManager');
    if (tbSettingsBtn) tbSettingsBtn.textContent = t('settings');
    if (tbTaskbarSettingsBtn) tbTaskbarSettingsBtn.textContent = t('taskbarSettings');
    if (tbAppCloseBtn) tbAppCloseBtn.textContent = t('closeWindow');
    if (taskbarScrollLeftBtn) {
      taskbarScrollLeftBtn.title = t('previous');
      taskbarScrollLeftBtn.setAttribute('aria-label', t('previous'));
    }
    if (taskbarScrollRightBtn) {
      taskbarScrollRightBtn.title = t('next');
      taskbarScrollRightBtn.setAttribute('aria-label', t('next'));
    }
    if (trayLang) trayLang.textContent = langNames[getLocale()] || getLocale();
    if (window.updateTaskbarApps) window.updateTaskbarApps();
    updateTime();
  }

  function hideTaskbarMenus(target) {
    const { tbMenu, tbAppMenu } = getRefs();
    if (tbMenu && !tbMenu.classList.contains('hidden') && (!target || !tbMenu.contains(target))) {
      tbMenu.classList.add('hidden');
    }
    if (tbAppMenu && !tbAppMenu.classList.contains('hidden') && (!target || !tbAppMenu.contains(target))) {
      tbAppMenu.classList.add('hidden');
    }
  }

  function showTaskbarMenu(event) {
    const { taskbar, tbMenu, tbAppMenu, tbShowDesktopBtn, tbTaskBtn, tbSettingsBtn, tbTaskbarSettingsBtn } = getRefs();
    if (!taskbar || !taskbar.contains(event.target)) return;
    event.preventDefault();
    if (event.target.closest('#start-btn')) return;
    const appBtn = event.target.closest('.taskbar-app-btn');
    if (appBtn && tbAppMenu) {
      taskbarAppMenuWid = appBtn.getAttribute('data-wid');
      tbAppMenu.style.left = event.clientX + 'px';
      tbAppMenu.style.top = (window.innerHeight - 56) + 'px';
      tbAppMenu.classList.remove('hidden');
      if (tbMenu) tbMenu.classList.add('hidden');
      return;
    }
    if (!tbMenu) return;
    if (tbShowDesktopBtn) tbShowDesktopBtn.textContent = t('showDesktop');
    if (tbTaskBtn) tbTaskBtn.textContent = t('taskManager');
    if (tbSettingsBtn) tbSettingsBtn.textContent = t('settings');
    if (tbTaskbarSettingsBtn) tbTaskbarSettingsBtn.textContent = t('taskbarSettings');
    tbMenu.style.left = event.clientX + 'px';
    tbMenu.style.top = (window.innerHeight - 56) + 'px';
    tbMenu.classList.remove('hidden');
    if (tbAppMenu) tbAppMenu.classList.add('hidden');
  }

  function bindTaskbarObservers() {
    const { taskbarAppsViewport, taskbarApps, windowsContainer } = getRefs();

    if (typeof ResizeObserver !== 'undefined') {
      if (!taskbarResizeObserver) {
        taskbarResizeObserver = new ResizeObserver(() => syncTaskbarOverflow());
      }
      if (observedTaskbarAppsViewport !== taskbarAppsViewport) {
        if (observedTaskbarAppsViewport) taskbarResizeObserver.unobserve(observedTaskbarAppsViewport);
        observedTaskbarAppsViewport = taskbarAppsViewport;
        if (observedTaskbarAppsViewport) taskbarResizeObserver.observe(observedTaskbarAppsViewport);
      }
      if (observedTaskbarApps !== taskbarApps) {
        if (observedTaskbarApps) taskbarResizeObserver.unobserve(observedTaskbarApps);
        observedTaskbarApps = taskbarApps;
        if (observedTaskbarApps) taskbarResizeObserver.observe(observedTaskbarApps);
      }
    }

    if (typeof MutationObserver !== 'undefined') {
      if (!taskbarWindowObserver) {
        taskbarWindowObserver = new MutationObserver(() => {
          scheduleTaskbarRefresh();
        });
      }
      if (observedWindowsContainer !== windowsContainer) {
        if (observedWindowsContainer) taskbarWindowObserver.disconnect();
        observedWindowsContainer = windowsContainer;
        if (observedWindowsContainer) {
          taskbarWindowObserver.observe(observedWindowsContainer, {
            childList: true
          });
        }
      }
    }
  }

  window.updateTaskbarApps = function() {
    const { taskbarApps } = getRefs();
    bindTaskbarObservers();
    if (!taskbarApps) return;
    const wins = buildTaskbarWindowItems();
    const mgr = window.StarWindowManager;
    const activeId = mgr ? mgr.activeId : null;
    const managedActive = mgr ? mgr.managedActiveTaskbarId : null;
    taskbarApps.dataset.empty = wins.length ? 'false' : 'true';
    const existingButtons = new Map();
    Array.from(taskbarApps.querySelectorAll('.taskbar-app-btn[data-wid]')).forEach((btn) => {
      const id = String(btn.getAttribute('data-wid') || '').trim();
      if (id && !existingButtons.has(id)) existingButtons.set(id, btn);
    });

    wins.forEach((win, index) => {
      const id = String(win.id || '').trim();
      if (!id) return;
      let btn = existingButtons.get(id);
      if (btn) {
        existingButtons.delete(id);
      } else {
        btn = createTaskbarButton();
      }
      const isActive = activeId === win.id || (managedActive && managedActive === win.id);
      syncTaskbarButton(btn, win, isActive);
      const currentAtIndex = taskbarApps.children[index] || null;
      if (currentAtIndex !== btn) {
        taskbarApps.insertBefore(btn, currentAtIndex);
      }
    });

    existingButtons.forEach((btn) => {
      if (btn && btn.parentNode === taskbarApps) {
        taskbarApps.removeChild(btn);
      }
    });

    requestAnimationFrame(() => {
      syncTaskbarOverflow();
      ensureTaskbarButtonVisible(taskbarApps.querySelector('.taskbar-app-btn.active'));
    });
  };

  document.addEventListener('click', (event) => {
    const target = event.target;
    const { startMenu, taskbar, taskbarApps } = getRefs();

    const startBtn = target && target.closest ? target.closest('#start-btn') : null;
    if (startBtn) {
      if (startMenu) {
        const willOpen = startMenu.classList.contains('hidden');
        startMenu.classList.toggle('hidden');
        if (willOpen && window.refreshStartMenu) window.refreshStartMenu();
      }
      hideTaskbarMenus(target);
      return;
    }

    const appBtn = target && target.closest ? target.closest('.taskbar-app-btn') : null;
    if (appBtn && taskbarApps && taskbarApps.contains(appBtn)) {
      const id = appBtn.getAttribute('data-wid');
      const manager = window.StarWindowManager;
      if (id && String(id).startsWith('mh-') && manager && Array.isArray(manager.managedHosts)) {
        let ipcRenderer = null;
        try {
          ipcRenderer = require('electron').ipcRenderer;
        } catch (_) {}
        const mh = manager.managedHosts.find(item => item && item.taskbarId === id);
        if (ipcRenderer && mh) {
          const active = manager.managedActiveTaskbarId === id;
          if (active && !mh.minimized) {
            ipcRenderer.invoke('managed-exe:taskbar-action', { sessionId: mh.sessionId, action: 'minimize' }).catch(() => {});
          } else {
            ipcRenderer.invoke('managed-exe:taskbar-action', { sessionId: mh.sessionId, action: 'show-focus' }).catch(() => {});
          }
        }
        hideTaskbarMenus(target);
        return;
      }
      const win = manager && Array.isArray(manager.windows) ? manager.windows.find(item => item && item.id === id) : null;
      if (win) {
        if (manager.activeId === id && !win.minimized) {
          manager.minimize(id);
        } else {
          if (win.minimized) manager.restore(id);
          manager.focus(id);
        }
      }
      hideTaskbarMenus(target);
      return;
    }

    if (target && target.closest && target.closest('#tray-lang')) {
      if (window.StarAppsRegistry) StarAppsRegistry.open('settings');
      if (startMenu) startMenu.classList.add('hidden');
      hideTaskbarMenus(target);
      return;
    }

    if (target && target.closest && target.closest('#taskbar-scroll-left')) {
      scrollTaskbarApps(-220);
      return;
    }
    if (target && target.closest && target.closest('#taskbar-scroll-right')) {
      scrollTaskbarApps(220);
      return;
    }

    if (target && target.closest && target.closest('#taskbar-app-close-window')) {
      if (taskbarAppMenuWid && window.StarWindowManager) {
        if (String(taskbarAppMenuWid).startsWith('mh-')) {
          let ipcRenderer = null;
          try {
            ipcRenderer = require('electron').ipcRenderer;
          } catch (_) {}
          const sessionId = String(taskbarAppMenuWid).slice(3);
          if (ipcRenderer) {
            ipcRenderer.invoke('managed-exe:taskbar-action', { sessionId, action: 'close' }).catch(() => {});
          }
        } else {
          StarWindowManager.close(taskbarAppMenuWid);
        }
      }
      hideTaskbarMenus();
      return;
    }

    if (target && target.closest && target.closest('#taskbar-show-desktop')) {
      const wins = window.StarWindowManager && Array.isArray(StarWindowManager.windows) ? StarWindowManager.windows : [];
      const mh = window.StarWindowManager && Array.isArray(StarWindowManager.managedHosts) ? StarWindowManager.managedHosts : [];
      let ipcRenderer = null;
      try {
        ipcRenderer = require('electron').ipcRenderer;
      } catch (_) {}
      const hasManagedVisible = mh.some((h) => h && !h.minimized);
      const hasInternalVisible = wins.some((w) => w && !w.minimized);
      if (wins.length || mh.length) {
        const hasVisible = hasInternalVisible || hasManagedVisible;
        if (hasVisible) {
          wins.forEach((w) => {
            if (w && !w.minimized) StarWindowManager.minimize(w.id);
          });
          if (ipcRenderer && mh.length) {
            ipcRenderer.invoke('managed-exe:minimize-all').catch(() => {});
          }
        } else {
          wins.forEach((w) => {
            if (w) StarWindowManager.restore(w.id);
          });
          if (ipcRenderer && mh.length) {
            ipcRenderer.invoke('managed-exe:restore-all').catch(() => {});
          }
        }
      }
      hideTaskbarMenus();
      return;
    }

    if (target && target.closest && target.closest('#taskbar-open-taskmgr')) {
      if (window.StarAppsRegistry) StarAppsRegistry.open('task-manager');
      hideTaskbarMenus();
      return;
    }

    if (target && target.closest && (target.closest('#taskbar-open-settings') || target.closest('#taskbar-open-taskbar-settings'))) {
      if (window.StarAppsRegistry) StarAppsRegistry.open('settings');
      hideTaskbarMenus();
      return;
    }

    if (event.button === 0) {
      hideTaskbarMenus(target);
    }

    if (taskbar && !taskbar.contains(target)) {
      syncTaskbarOverflow();
    }
  });

  // Taskbar context menu should only be triggered from the taskbar region.
  const { taskbar: taskbarEl } = getRefs();
  if (taskbarEl) {
    taskbarEl.addEventListener('contextmenu', (event) => {
      showTaskbarMenu(event);
    });
  }

  document.addEventListener('wheel', (event) => {
    const { taskbarAppsWrap, taskbarAppsViewport } = getRefs();
    if (!taskbarAppsViewport || !taskbarAppsWrap || !taskbarAppsWrap.classList.contains('is-overflowing')) return;
    if (!taskbarAppsViewport.contains(event.target)) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    event.preventDefault();
    taskbarAppsViewport.scrollLeft += delta;
    syncTaskbarOverflow();
  }, { passive: false });

  document.addEventListener('scroll', () => {
    syncTaskbarOverflow();
  }, true);

  window.addEventListener('resize', () => {
    bindTaskbarObservers();
    requestAnimationFrame(syncTaskbarOverflow);
  });

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('star:locale-change', refreshTaskbarLocale);
  }

  setInterval(updateTime, 1000);
  bindTaskbarObservers();
  refreshTaskbarLocale();
  updateTime();
  window.setTimeout(() => {
    bindTaskbarObservers();
    refreshTaskbarLocale();
    updateTime();
    if (window.updateTaskbarApps) window.updateTaskbarApps();
  }, 0);
})();