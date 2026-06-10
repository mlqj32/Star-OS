
/** Star OS 开始菜单（事件委托 + 用时再取 DOM，避免 Vue 挂载后替换 #app 内 DOM 导致失效） */
(function() {
  function getStartMenu() { return document.getElementById('start-menu'); }
  function getPinnedGrid() { return document.getElementById('start-pinned-grid'); }
  function getRecentList() { return document.getElementById('start-recent-list'); }
  function getAllGrid() { return document.getElementById('start-all-grid'); }
  function tr(key, fallback) {
    try {
      const value = typeof t === 'function' ? t(key) : key;
      return value === key ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  // 统一从“最近”列表打开文件的逻辑：优先走内部应用，最后才退回系统外部打开
  function openRecentFile(filePath) {
    if (!filePath) return;
    // Reuse the same resolver as File Manager / Run dialog to guarantee internal-first behavior.
    if (typeof window.openPathInStarOs === 'function') {
      Promise.resolve(window.openPathInStarOs(filePath)).catch(() => {});
      return;
    }
    try {
      if (window.StarAppsRegistry && window.StarAppsRegistry.recordFileOpen) {
        window.StarAppsRegistry.recordFileOpen(filePath);
      }
      const path = require('path');
      const lower = (filePath || '').toLowerCase();
      const ext = path.extname(lower).toLowerCase();
      const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'];
      const videoExts = ['.mp4', '.avi', '.wmv', '.mkv', '.mov', '.webm', '.m4v'];
      const officeExts = ['.doc', '.docx', '.ppt', '.pptx', '.pdf', '.xls', '.xlsx'];
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.ico'];
      const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'];
      const htmlExts = ['.html', '.htm'];
      const scriptExts = ['.bat', '.cmd', '.ps1', '.sh'];

      if ((ext === '.md' || ext === '.markdown') && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
        window.StarAppsRegistry.openWithFile('markdown-reader', filePath);
        return;
      }
      if (audioExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
        window.StarAppsRegistry.openWithFile('music-player', filePath);
        return;
      }
      if (videoExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
        window.StarAppsRegistry.openWithFile('video-player', filePath);
        return;
      }
      if (officeExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
        window.StarAppsRegistry.openWithFile('wps-editor', filePath);
        return;
      }
      if (imageExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
        window.StarAppsRegistry.openWithFile('image-viewer', filePath);
        return;
      }
      if (archiveExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
        window.StarAppsRegistry.openWithFile('star-unzip', filePath);
        return;
      }
      if (htmlExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
        window.StarAppsRegistry.openWithFile('browser', filePath, { url: 'star-file://' + encodeURIComponent(filePath) });
        return;
      }
      if (scriptExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
        const isWin = require('os').platform() === 'win32';
        const cwd = path.dirname(filePath);
        let cmd = '';
        if (isWin) {
          if (ext === '.ps1') cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${filePath}"`;
          else cmd = `call "${filePath}"`;
        } else {
          cmd = ext === '.sh' ? `bash "${filePath}"` : `"${filePath}"`;
        }
        window.StarAppsRegistry.openWithFile('terminal', filePath, { cwd, cmd, filePath });
        return;
      }
    } catch (_) {
      // 出现异常时退回外部打开，避免“没反应”
    }
    require('electron').ipcRenderer.invoke('os:launch', filePath);
  }

  function closeMenu() {
    const el = getStartMenu();
    if (el) el.classList.add('hidden');
    if (window.closeStartMenu) window.closeStartMenu();
  }

  document.addEventListener('click', e => {
    const startMenu = getStartMenu();
    if (!startMenu || startMenu.classList.contains('hidden')) return;
    if (startMenu.contains(e.target) || e.target.closest('#start-btn')) return;
    closeMenu();
  });

  // 事件委托：点击任意 .start-menu-item 时打开应用并关闭菜单
  document.addEventListener('click', e => {
    const pinToggle = e.target.closest('[data-pin-app-id]');
    if (pinToggle) {
      e.preventDefault();
      e.stopPropagation();
      StarAppsRegistry.togglePinned(pinToggle.getAttribute('data-pin-app-id'));
      renderStartMenu();
      return;
    }
    const recentApp = e.target.closest('[data-recent-app-id]');
    if (recentApp) {
      e.preventDefault();
      e.stopPropagation();
      const startMenu = getStartMenu();
      if (!startMenu || !startMenu.contains(recentApp)) return;
      const appId = recentApp.getAttribute('data-recent-app-id');
      if (appId) {
        StarAppsRegistry.open(appId);
        closeMenu();
      }
      return;
    }
    const recentFile = e.target.closest('[data-recent-file-path]');
    if (recentFile) {
      e.preventDefault();
      e.stopPropagation();
      const startMenu = getStartMenu();
      if (!startMenu || !startMenu.contains(recentFile)) return;
      const filePath = recentFile.getAttribute('data-recent-file-path');
      if (filePath) {
        openRecentFile(filePath);
        closeMenu();
      }
      return;
    }
    const item = e.target.closest('.start-menu-item');
    if (!item) return;
    const startMenu = getStartMenu();
    if (!startMenu || !startMenu.contains(item)) return;
    const appId = item.getAttribute('data-app-id');
    if (appId) {
      StarAppsRegistry.open(appId);
      closeMenu();
    }
  });

  function renderStartMenu() {
    const pinnedGrid = getPinnedGrid();
    const recentList = getRecentList();
    const allGrid = getAllGrid();
    const recentTitle = document.querySelector('.start-menu-recent .start-menu-section-title');
    const pinned = StarAppsRegistry.getPinned();
    const all = StarAppsRegistry.getAll();
    if (recentTitle) recentTitle.textContent = tr('recent', 'Recent');
    const renderAppCard = (app) => `
      <button class="start-menu-item" data-app-id="${app.id}" title="${escapeHtml(t(app.titleKey))}">
        <span class="start-menu-pin-toggle" data-pin-app-id="${app.id}" title="${escapeHtml(StarAppsRegistry.isPinned(app.id) ? tr('unpinFromStart', 'Unpin from Start') : tr('pinToStart', 'Pin to Start'))}">${StarAppsRegistry.isPinned(app.id) ? '−' : '+'}</span>
        ${app.icon}
        <span>${escapeHtml(t(app.titleKey))}</span>
      </button>
    `;
    if (pinnedGrid) pinnedGrid.innerHTML = pinned.map(renderAppCard).join('');
    if (allGrid) allGrid.innerHTML = all.map(renderAppCard).join('');
    if (recentList) {
      const recentApps = StarAppsRegistry.getRecentApps(4);
      const recentFiles = StarAppsRegistry.getRecentFiles(4);
      const items = [
        ...recentApps.map(app => ({ type: 'app', title: t(app.titleKey), subtitle: tr('recentApps', 'App'), appId: app.id })),
        ...recentFiles.map(filePath => ({ type: 'file', title: escapeHtml((filePath.split(/[/\\\\]/).pop()) || filePath), subtitle: filePath, path: filePath }))
      ].slice(0, 8);
      recentList.innerHTML = items.length ? items.map(item => `
        <button class="start-menu-recent-item" ${item.type === 'app' ? `data-recent-app-id="${item.appId}"` : `data-recent-file-path="${escapeHtml(item.path)}"`}>
          <span class="start-menu-recent-title">${item.title}</span>
          <span class="start-menu-recent-subtitle">${escapeHtml(item.subtitle)}</span>
        </button>
      `).join('') : `<div class="start-menu-recent-empty">${escapeHtml(tr('noRecentItems', 'No recent items'))}</div>`;
    }
    document.querySelectorAll('[data-pin-app-id]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const appId = btn.getAttribute('data-pin-app-id');
        StarAppsRegistry.togglePinned(appId);
        renderStartMenu();
      });
    });
    if (recentList) {
      recentList.querySelectorAll('[data-recent-app-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          StarAppsRegistry.open(btn.getAttribute('data-recent-app-id'));
          closeMenu();
        });
      });
      recentList.querySelectorAll('[data-recent-file-path]').forEach(btn => {
        btn.addEventListener('click', () => {
          const filePath = btn.getAttribute('data-recent-file-path');
          openRecentFile(filePath);
          closeMenu();
        });
      });
    }
  }

  document.addEventListener('input', e => {
    if (e.target.id !== 'start-search') return;
    const q = e.target.value.trim().toLowerCase();
    const allGrid = getAllGrid();
    if (!allGrid) return;
    const all = StarAppsRegistry.getAll();
    const filtered = q ? all.filter(a => t(a.titleKey).toLowerCase().includes(q)) : all;
    allGrid.innerHTML = filtered.map(app => `
      <button class="start-menu-item" data-app-id="${app.id}">
        <span class="start-menu-pin-toggle" data-pin-app-id="${app.id}" title="${escapeHtml(StarAppsRegistry.isPinned(app.id) ? tr('unpinFromStart', 'Unpin from Start') : tr('pinToStart', 'Pin to Start'))}">${StarAppsRegistry.isPinned(app.id) ? '−' : '+'}</span>
        ${app.icon}
        <span>${escapeHtml(t(app.titleKey))}</span>
      </button>
    `).join('');
    allGrid.querySelectorAll('[data-pin-app-id]').forEach(btn => {
      btn.addEventListener('click', evt => {
        evt.stopPropagation();
        StarAppsRegistry.togglePinned(btn.getAttribute('data-pin-app-id'));
        renderStartMenu();
      });
    });
  });

  // 底部按钮也用事件委托
  document.addEventListener('click', e => {
    const startMenu = getStartMenu();
    if (!startMenu || !startMenu.contains(e.target)) return;
    if (e.target.id === 'start-settings' || e.target.closest('#start-settings')) {
      StarAppsRegistry.open('settings');
      closeMenu();
    } else if (e.target.id === 'start-lock' || e.target.closest('#start-lock')) {
      if (window.StarLock) window.StarLock.lock();
      closeMenu();
    } else if (e.target.id === 'start-power' || e.target.closest('#start-power')) {
      const dialogPromise = window.StarDialog && typeof window.StarDialog.confirm === 'function'
        ? window.StarDialog.confirm({
          title: t('power'),
          message: t('quitConfirm'),
          okText: t('power'),
          cancelText: t('cancel')
        })
        : Promise.resolve(false);
      dialogPromise.then(confirmed => {
        if (confirmed) require('electron').ipcRenderer.send('os:quit');
        closeMenu();
      });
    }
  });

  window.refreshStartMenu = renderStartMenu;
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('star:locale-change', renderStartMenu);
  }
})();