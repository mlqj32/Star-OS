
/** Star OS desktop icons and wallpaper handling. */
(function() {
  const desktopEl = document.getElementById('desktop');
  const desktopIcons = document.getElementById('desktop-icons');
  const disclaimerEntry = document.getElementById('desktop-disclaimer-entry');
  const disclaimerEntryText = document.getElementById('desktop-disclaimer-entry-text');
  const defaultShortcuts = [
    { appId: 'file-manager', titleKey: 'fileManager' },
    { appId: 'browser', titleKey: 'browser' },
    { appId: 'text-editor', titleKey: 'textEditor' },
    { appId: 'wps-editor', titleKey: 'wpsEditor' },
    { appId: 'terminal', titleKey: 'terminal' },
    { appId: 'settings', titleKey: 'settings' },
    { appId: 'task-manager', titleKey: 'taskManager' },
    { appId: 'star-unzip', titleKey: 'starUnzip' },
    { appId: 'image-viewer', titleKey: 'imageViewer' },
    { appId: 'music-player', titleKey: 'musicPlayer' },
    { appId: 'video-player', titleKey: 'videoPlayer' },
    { appId: 'paint', titleKey: 'paint' },
    { appId: 'screenshot', titleKey: 'screenshot' },
    { appId: 'calculator', titleKey: 'calculator' },
    { appId: 'sticky-notes', titleKey: 'stickyNotes' },
    { appId: 'markdown-reader', titleKey: 'markdownReader' },
    { appId: 'control-panel', titleKey: 'controlPanel' },
    { appId: 'run', titleKey: 'run' },
    { appId: 'clock', titleKey: 'clock' },
    { appId: 'java-ide', titleKey: 'javaIDE' },
    { appId: 'linux-shell', titleKey: 'linuxShell' },
    { appId: 'docker-shell', titleKey: 'dockerShell' },
    { appId: 'redis-cli', titleKey: 'redisCli' },
    { appId: 'character-map', titleKey: 'characterMap' },
    { appId: 'on-screen-keyboard', titleKey: 'onScreenKeyboard' },
    { appId: 'about', titleKey: 'about' },
    { appId: 'game-gomoku', titleKey: 'gameGomoku' },
    { appId: 'game-landlord', titleKey: 'gameLandlord' },
    { appId: 'game-solitaire', titleKey: 'gameSolitaire' },
    { appId: 'game-othello', titleKey: 'gameOthello' },
    { appId: 'game-minesweeper', titleKey: 'gameMinesweeper' },
    { appId: 'game-2048', titleKey: 'game2048' },
    { appId: 'game-link', titleKey: 'gameLink' },
    { appId: 'game-sokoban', titleKey: 'gameSokoban' },
    { appId: 'game-tetris', titleKey: 'gameTetris' },
    { appId: 'game-snake', titleKey: 'gameSnake' },
    { appId: 'game-runner', titleKey: 'gameRunner' },
    { appId: 'game-platformer', titleKey: 'gamePlatformer' },
    { appId: 'game-tank', titleKey: 'gameTank' },
    { appId: 'game-plane', titleKey: 'gamePlane' },
    { appId: 'game-sudoku', titleKey: 'gameSudoku' },
    { appId: 'game-carrot-defense', titleKey: 'gameCarrotDefense' },
  ];

  // Built-in wallpapers switch with the current theme so the visual style stays consistent.
  const BUILTIN_WALLPAPERS_DARK = {
    '__wallpaper_deep__': 'linear-gradient(135deg, #020617 0%, #0b1120 40%, #020617 100%)',
    '__wallpaper_blue__': 'linear-gradient(145deg, #0f172a 0%, #1d4ed8 45%, #22c1c3 100%)',
    '__wallpaper_purple__': 'radial-gradient(circle at 0 0, #6366f1 0%, transparent 55%), radial-gradient(circle at 100% 100%, #ec4899 0%, transparent 55%), #020617',
    '__wallpaper_light__': 'linear-gradient(135deg, #020617 0%, #111827 45%, #020617 100%)',
  };

  const BUILTIN_WALLPAPERS_LIGHT = {
    '__wallpaper_deep__': 'linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 45%, #e5e7eb 100%)',
    '__wallpaper_blue__': 'linear-gradient(145deg, #e0f2fe 0%, #bfdbfe 40%, #eff6ff 100%)',
    '__wallpaper_purple__': 'radial-gradient(circle at 0 0, #e9d5ff 0%, transparent 55%), radial-gradient(circle at 100% 100%, #fee2e2 0%, transparent 55%), #f5f3ff',
    '__wallpaper_light__': 'radial-gradient(circle at 0 0, #e0f2fe 0%, transparent 55%), radial-gradient(circle at 100% 100%, #fee2e2 0%, transparent 55%), #f3f4f6',
  };

  window.applyDesktopWallpaper = function() {
    if (!desktopEl) return;
    try {
      let url = (localStorage.getItem('star-wallpaper') || '').trim();
      const theme = ((typeof localStorage !== 'undefined' && localStorage.getItem('star-theme')) || 'dark').toLowerCase();
      const table = theme === 'light' ? BUILTIN_WALLPAPERS_LIGHT : BUILTIN_WALLPAPERS_DARK;
      const lockEl = document.getElementById('lock-screen');
      const resetTiling = (el) => {
        if (!el) return;
        el.style.backgroundSize = '';
        el.style.backgroundPosition = '';
        el.style.backgroundRepeat = '';
      };
      if (url && table[url]) {
        desktopEl.style.backgroundImage = 'none';
        desktopEl.style.background = table[url];
        desktopEl.style.backgroundSize = '';
        desktopEl.style.backgroundPosition = '';
        desktopEl.style.backgroundRepeat = '';
        if (lockEl) {
          lockEl.style.backgroundImage = 'none';
          lockEl.style.background = table[url];
          resetTiling(lockEl);
        }
      } else if (url) {
        if (!url.startsWith('http') && !url.startsWith('file:') && !url.startsWith('data:')) {
          url = 'file:///' + url.replace(/\\/g, '/').replace(/^\/+/, '');
        }
        const safeUrl = url.replace(/"/g, '%22');
        desktopEl.style.backgroundImage = 'url("' + safeUrl + '")';
        desktopEl.style.backgroundColor = '#020617';
        desktopEl.style.backgroundSize = 'cover';
        desktopEl.style.backgroundPosition = 'center center';
        desktopEl.style.backgroundRepeat = 'no-repeat';
        if (lockEl) {
          lockEl.style.backgroundImage = 'url("' + safeUrl + '")';
          lockEl.style.backgroundColor = '#020617';
          lockEl.style.backgroundSize = 'cover';
          lockEl.style.backgroundPosition = 'center center';
          lockEl.style.backgroundRepeat = 'no-repeat';
        }
      } else {
        const fallback = 'linear-gradient(135deg, #0c0c1e 0%, #1a1a3e 50%, #0d1b2a 100%)';
        desktopEl.style.background = fallback;
        desktopEl.style.backgroundImage = '';
        desktopEl.style.backgroundSize = '';
        desktopEl.style.backgroundPosition = '';
        desktopEl.style.backgroundRepeat = '';
        if (lockEl) {
          lockEl.style.background = fallback;
          lockEl.style.backgroundImage = '';
          lockEl.style.backgroundSize = '';
          lockEl.style.backgroundPosition = '';
          lockEl.style.backgroundRepeat = '';
        }
      }
    } catch (_) {}
  };

  function getIconSvg(appId) {
    try {
      if (typeof StarAppsRegistry !== 'undefined' && typeof StarAppsRegistry.getAll === 'function') {
        const apps = StarAppsRegistry.getAll();
        const app = apps && apps.find((item) => item.id === appId);
        if (app && app.icon) return app.icon;
      }
    } catch (_) {}
    // Fallback to a neutral rounded-square icon so missing assets still look intentional.
    return '<svg viewBox="0 0 24 24" fill="currentColor"><rect width="20" height="20" x="2" y="2" rx="6"/></svg>';
  }

  let desktopSelection = new Set();
  let desktopClipboard = { type: null, items: [] };

  function renderDisclaimerEntry() {
    if (!disclaimerEntry) return;
    const label = t('projectDisclaimerEntry');
    const title = t('projectDisclaimerTitle');
    const detail = t('viewDetails');
    if (disclaimerEntryText) disclaimerEntryText.textContent = label;
    disclaimerEntry.title = title + ' · ' + detail;
    disclaimerEntry.setAttribute('aria-label', title + ' · ' + detail);
  }

  function renderDesktop() {
    desktopIcons.innerHTML = defaultShortcuts.map((shortcut) => {
      const selected = desktopSelection.has(shortcut.appId);
      return `
        <div class="desktop-icon${selected ? ' selected' : ''}" data-app-id="${shortcut.appId}">
          ${getIconSvg(shortcut.appId)}
          <span>${escapeHtml(t(shortcut.titleKey))}</span>
        </div>
      `;
    }).join('');
    desktopIcons.querySelectorAll('.desktop-icon').forEach((el) => {
      const appId = el.getAttribute('data-app-id');
      el.addEventListener('dblclick', () => StarAppsRegistry.open(appId));
      el.addEventListener('click', (ev) => {
        if (ev.ctrlKey || ev.metaKey) {
          if (desktopSelection.has(appId)) desktopSelection.delete(appId);
          else desktopSelection.add(appId);
        } else {
          desktopSelection.clear();
          desktopSelection.add(appId);
        }
        renderDesktop();
      });
    });
  }

  const ctxMenu = document.getElementById('desktop-context-menu');
  const refreshBtn = document.getElementById('desktop-refresh');
  if (refreshBtn) refreshBtn.textContent = t('refresh');
  if (disclaimerEntry && !disclaimerEntry._starBound) {
    disclaimerEntry.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      try {
        if (window.StarAppsRegistry && typeof window.StarAppsRegistry.open === 'function') {
          window.StarAppsRegistry.open('about');
        }
      } catch (_) {}
    });
    disclaimerEntry.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    });
    disclaimerEntry._starBound = true;
  }

  desktopEl.addEventListener('contextmenu', (e) => {
    // Only show the desktop refresh menu on the desktop surface.
    // App windows, taskbar, and Start menu keep their own right-click behaviors.
    const target = e.target;
    if (target && target.closest) {
      if (target.closest('.star-window')) return;
      if (target.closest('#taskbar')) return;
      if (target.closest('#start-menu')) return;
    }
    e.preventDefault();
    if (ctxMenu) {
      ctxMenu.style.left = e.clientX + 'px';
      ctxMenu.style.top = e.clientY + 'px';
      ctxMenu.classList.remove('hidden');
      if (refreshBtn) refreshBtn.textContent = t('refresh');
    }
  });

  document.addEventListener('click', () => {
    if (ctxMenu) ctxMenu.classList.add('hidden');
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      renderDesktop();
      if (window.applyDesktopWallpaper) window.applyDesktopWallpaper();
      if (ctxMenu) ctxMenu.classList.add('hidden');
    });
  }

  // Desktop keyboard shortcuts only apply when focus is on the desktop surface.
  document.addEventListener('keydown', (e) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    const target = e.target;
    const tag = (target && target.tagName) ? target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || target.isContentEditable) return;
    if (!desktopEl.contains(document.activeElement) && document.activeElement !== document.body) return;
    if (!isCtrl) return;
    if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      desktopSelection = new Set(defaultShortcuts.map((shortcut) => shortcut.appId));
      renderDesktop();
    } else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      desktopCopy('copy');
    } else if (e.key === 'x' || e.key === 'X') {
      e.preventDefault();
      desktopCopy('cut');
    } else if (e.key === 'v' || e.key === 'V') {
      e.preventDefault();
      desktopPaste();
    }
  });

  renderDesktop();
  renderDisclaimerEntry();
  if (window.applyDesktopWallpaper) window.applyDesktopWallpaper();
  window.onLocaleChange = function() {
    renderDesktop();
    renderDisclaimerEntry();
    if (window.refreshStartMenu) window.refreshStartMenu();
    if (window.updateTaskbarApps) window.updateTaskbarApps();
    if (window.StarAppsRegistry && typeof window.StarAppsRegistry.refreshOpenWindowsLocale === 'function') {
      window.StarAppsRegistry.refreshOpenWindowsLocale();
    }
  };
})();