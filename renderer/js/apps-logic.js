
/** Star OS 各应用内逻辑 */
const STAR_FILE_MANAGER_SHOW_HIDDEN_KEY = 'star-file-manager-show-hidden';
const STAR_PROTECTED_SYSTEM_DIR_NAMES = new Set(['system volume information', '$recycle.bin']);

function readStarFileManagerShowHiddenSetting() {
  try {
    return localStorage.getItem(STAR_FILE_MANAGER_SHOW_HIDDEN_KEY) === '1';
  } catch (_) {
    return false;
  }
}

function writeStarFileManagerShowHiddenSetting(value) {
  const nextValue = !!value;
  try {
    localStorage.setItem(STAR_FILE_MANAGER_SHOW_HIDDEN_KEY, nextValue ? '1' : '0');
  } catch (_) {}
  try {
    window.dispatchEvent(new CustomEvent('star:file-manager-visibility-change', {
      detail: { showHidden: nextValue }
    }));
  } catch (_) {}
}

function isStarProtectedSystemDirName(name) {
  return STAR_PROTECTED_SYSTEM_DIR_NAMES.has(String(name || '').trim().toLowerCase());
}

function getAliveInternalBrowserBridge() {
  try {
    const bridge = window.StarBrowserBridge || {};
    const ids = Object.keys(bridge);
    for (let i = ids.length - 1; i >= 0; i -= 1) {
      const id = ids[i];
      const inst = bridge[id];
      if (!inst || typeof inst.addTab !== 'function') {
        delete bridge[id];
        continue;
      }
      let alive = true;
      if (typeof inst.isAlive === 'function') {
        try {
          alive = !!inst.isAlive();
        } catch (_) {
          alive = false;
        }
      }
      if (!alive) {
        delete bridge[id];
        continue;
      }
      return inst;
    }
  } catch (_) {}
  return null;
}

(function initStarBrowserSelfDevToolsIpcOnce() {
  if (typeof window === 'undefined' || window.__starBrowserSelfDevToolsIpcBound) return;
  window.__starBrowserSelfDevToolsIpcBound = true;
  window.__starBrowserSelfDevToolsHandlers = window.__starBrowserSelfDevToolsHandlers || [];
  try {
    const { ipcRenderer } = require('electron');
    ipcRenderer.on('browser:open-self-devtools', (_event, payload) => {
      const id = Number(payload && payload.webContentsId);
      if (!Number.isFinite(id) || id <= 0) return;
      const handlers = window.__starBrowserSelfDevToolsHandlers || [];
      for (let i = 0; i < handlers.length; i += 1) {
        try {
          if (typeof handlers[i] === 'function' && handlers[i](id)) return;
        } catch (_) {}
      }
    });
  } catch (_) {}
})();

function openUrlInInternalBrowser(url) {
  if (!url) return;
  try {
    const inst = getAliveInternalBrowserBridge();
    if (inst && typeof inst.addTab === 'function') {
      inst.addTab(url);
      if (typeof inst.focus === 'function') inst.focus();
      return;
    }
  } catch (_) {}
  try {
    if (window.StarAppsRegistry && typeof window.StarAppsRegistry.openWithFile === 'function') {
      window.StarAppsRegistry.openWithFile('browser', url, { url });
      return;
    }
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && typeof window.open === 'function') {
      window.open(url, '_blank', 'noopener');
    }
  } catch (_) {}
}

function toStarFileUrl(filePath) {
  const raw = String(filePath || '').trim();
  if (!raw) return 'star-file:///';
  const normalized = raw.replace(/\\/g, '/');
  // UNC path: \\server\share\file -> star-file://server/share/file
  if (/^\/\/[^/]/.test(normalized)) return 'star-file:' + encodeURI(normalized);
  // Drive path: C:\dir\file -> star-file:///C:/dir/file
  if (/^[A-Za-z]:\//.test(normalized)) return 'star-file:///' + encodeURI(normalized);
  return 'star-file:///' + encodeURI(normalized.replace(/^\/+/, ''));
}

const STAR_SHELL_ICON_THUMB_CACHE = typeof window !== 'undefined'
  ? (window.__starShellIconThumbCache || (window.__starShellIconThumbCache = new Map()))
  : new Map();
const STAR_SHELL_ICON_THUMB_PENDING = typeof window !== 'undefined'
  ? (window.__starShellIconThumbPending || (window.__starShellIconThumbPending = new Map()))
  : new Map();

function requestStarShellIconThumb(filePath, sizeHint) {
  const normalizedPath = String(filePath || '').trim();
  if (!normalizedPath) return Promise.resolve(null);
  const normalizedSize = String(sizeHint || '').toLowerCase() === 'large' ? 'large' : 'normal';
  const cacheKey = normalizedSize + '::' + normalizedPath;
  if (STAR_SHELL_ICON_THUMB_CACHE.has(cacheKey)) {
    return Promise.resolve(STAR_SHELL_ICON_THUMB_CACHE.get(cacheKey) || null);
  }
  if (STAR_SHELL_ICON_THUMB_PENDING.has(cacheKey)) {
    return STAR_SHELL_ICON_THUMB_PENDING.get(cacheKey);
  }
  let electron = null;
  try {
    electron = require('electron');
  } catch (_) {}
  if (!electron || !electron.ipcRenderer || typeof electron.ipcRenderer.invoke !== 'function') {
    STAR_SHELL_ICON_THUMB_CACHE.set(cacheKey, null);
    return Promise.resolve(null);
  }
  const pending = electron.ipcRenderer.invoke('os:getFileIconDataUrl', normalizedPath, normalizedSize)
    .then((dataUrl) => {
      const resolved = typeof dataUrl === 'string' && dataUrl.trim() ? dataUrl : null;
      STAR_SHELL_ICON_THUMB_CACHE.set(cacheKey, resolved);
      STAR_SHELL_ICON_THUMB_PENDING.delete(cacheKey);
      return resolved;
    })
    .catch(() => {
      STAR_SHELL_ICON_THUMB_CACHE.set(cacheKey, null);
      STAR_SHELL_ICON_THUMB_PENDING.delete(cacheKey);
      return null;
    });
  STAR_SHELL_ICON_THUMB_PENDING.set(cacheKey, pending);
  return pending;
}

function openPathInStarOs(filePath, name) {
  const nextPath = String(filePath || '').trim();
  if (!nextPath) return Promise.resolve(false);
  let electron = null;
  let path = null;
  try {
    electron = require('electron');
    path = require('path');
  } catch (_) {
    return Promise.resolve(false);
  }
  const lower = (name || path.basename(nextPath) || '').toLowerCase();
  const ext = path.extname(lower).toLowerCase();
  const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'];
  const videoExts = ['.mp4', '.avi', '.wmv', '.mkv', '.mov', '.webm', '.m4v'];
  const officeExts = ['.doc', '.docx', '.ppt', '.pptx', '.pdf', '.xls', '.xlsx'];
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.ico'];
  const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'];
  const htmlExts = ['.html', '.htm'];
  const scriptExts = ['.bat', '.cmd', '.ps1', '.sh'];
  const textExts = ['.txt', '.log', '.xml', '.json', '.yml', '.yaml', '.ini', '.cfg', '.conf', '.csv', '.tsv', '.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.less', '.java', '.py', '.c', '.cpp', '.cs', '.go', '.rs', '.php', '.sql'];
  const externalOnlyExts = ['.exe', '.msi', '.lnk', '.dll', '.com'];

  if (window.StarAppsRegistry && window.StarAppsRegistry.recordFileOpen) {
    window.StarAppsRegistry.recordFileOpen(nextPath);
  }
  if ((ext === '.md' || ext === '.markdown') && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
    window.StarAppsRegistry.openWithFile('markdown-reader', nextPath);
    return Promise.resolve(true);
  }
  if (audioExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
    window.StarAppsRegistry.openWithFile('music-player', nextPath);
    return Promise.resolve(true);
  }
  if (videoExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
    window.StarAppsRegistry.openWithFile('video-player', nextPath);
    return Promise.resolve(true);
  }
  if (officeExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
    window.StarAppsRegistry.openWithFile('wps-editor', nextPath);
    return Promise.resolve(true);
  }
  if (imageExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
    window.StarAppsRegistry.openWithFile('image-viewer', nextPath);
    return Promise.resolve(true);
  }
  if (archiveExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
    window.StarAppsRegistry.openWithFile('star-unzip', nextPath);
    return Promise.resolve(true);
  }
  if (htmlExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
    window.StarAppsRegistry.openWithFile('browser', nextPath, { url: toStarFileUrl(nextPath) });
    return Promise.resolve(true);
  }
  if (scriptExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
    const isWin = process.platform === 'win32';
    const cwd = path.dirname(nextPath);
    const cmd = isWin
      ? (ext === '.ps1' ? `powershell -NoProfile -ExecutionPolicy Bypass -File "${nextPath}"` : `call "${nextPath}"`)
      : (ext === '.sh' ? `bash "${nextPath}"` : `"${nextPath}"`);
    window.StarAppsRegistry.openWithFile('terminal', nextPath, { cwd, cmd, filePath: nextPath });
    return Promise.resolve(true);
  }
  if (textExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
    window.StarAppsRegistry.openWithFile('text-editor', nextPath);
    return Promise.resolve(true);
  }
  if (externalOnlyExts.includes(ext)) {
    return electron.ipcRenderer.invoke('os:launch', nextPath).then(() => true).catch(() => false);
  }
  if (window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
    window.StarAppsRegistry.openWithFile('text-editor', nextPath);
    return Promise.resolve(true);
  }
  return electron.ipcRenderer.invoke('os:launch', nextPath).then(() => true).catch(() => false);
}
window.openPathInStarOs = openPathInStarOs;

function revealPathInStarFileManager(filePath) {
  const nextPath = String(filePath || '').trim();
  if (!nextPath || !window.StarAppsRegistry || typeof window.StarAppsRegistry.openWithFile !== 'function') {
    return false;
  }
  let path = null;
  try {
    path = require('path');
  } catch (_) {
    return false;
  }
  const directoryPath = path.dirname(nextPath);
  window.StarAppsRegistry.openWithFile('file-manager', directoryPath, { directoryPath });
  return true;
}

function bindExternalLinks(root) {
  if (!root) return;
  let shell = null;
  try {
    const electron = require('electron');
    shell = electron && electron.shell ? electron.shell : null;
  } catch (_) {}
  root.querySelectorAll('[data-internal-url]').forEach(link => {
    if (link._starInternalBound) return;
    link.addEventListener('click', (ev) => {
      const url = link.getAttribute('data-internal-url');
      if (!url) return;
      ev.preventDefault();
      ev.stopPropagation();
      openUrlInInternalBrowser(url);
    });
    link._starInternalBound = true;
  });
  root.querySelectorAll('[data-external-url]').forEach(link => {
    if (link._starExternalBound) return;
    link.addEventListener('click', (ev) => {
      const url = link.getAttribute('data-external-url');
      if (!url) return;
      ev.preventDefault();
      ev.stopPropagation();
      try {
        if (shell && typeof shell.openExternal === 'function') shell.openExternal(url);
        else if (typeof window !== 'undefined' && typeof window.open === 'function') window.open(url, '_blank', 'noopener');
      } catch (_) {}
    });
    link._starExternalBound = true;
  });
}

(function initStarInternalDialog() {
  if (window.StarDialog) return;
  let host = null;
  let styleEl = null;
  let active = null;
  const queue = [];

  function trDialog(key, fallback, params) {
    try {
      return typeof t === 'function' ? t(key, fallback, params) : fallback;
    } catch (_) {
      return fallback;
    }
  }
  function ensureUi() {
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'star-dialog-style';
      styleEl.textContent = `
        .star-dialog-host {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 30000;
        }
        .star-dialog-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(7, 10, 18, 0.42);
          backdrop-filter: blur(8px);
          pointer-events: auto;
        }
        .star-dialog {
          width: min(520px, calc(100vw - 48px));
          max-width: 100%;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--window-bg);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }
        .star-dialog__head {
          padding: 16px 18px 12px;
          border-bottom: 1px solid var(--border);
          background: var(--window-titlebar);
        }
        .star-dialog__title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
        }
        .star-dialog__body {
          padding: 18px;
          color: var(--text);
          font-size: 14px;
          line-height: 1.7;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .star-dialog__input {
          width: 100%;
          margin-top: 14px;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--window-titlebar);
          color: var(--text);
          outline: none;
        }
        .star-dialog__input:focus {
          border-color: var(--border-focus);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }
        .star-dialog__extra {
          margin-top: 14px;
        }
        .star-dialog__choice-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .star-dialog__choice {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: color-mix(in srgb, var(--window-titlebar) 82%, var(--window-bg));
          cursor: pointer;
        }
        .star-dialog__choice input[type="radio"] {
          margin: 3px 0 0;
          accent-color: var(--accent);
          cursor: pointer;
        }
        .star-dialog__choice.is-disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }
        .star-dialog__choice-text {
          flex: 1;
          min-width: 0;
        }
        .star-dialog__choice-title {
          font-weight: 600;
          color: var(--text);
        }
        .star-dialog__choice-desc {
          margin-top: 4px;
          font-size: 12px;
          line-height: 1.55;
          color: var(--text-dim);
        }
        .star-dialog__actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 0 18px 18px;
        }
      `;
      document.head.appendChild(styleEl);
    }
    if (!host) {
      host = document.createElement('div');
      host.className = 'star-dialog-host';
      document.body.appendChild(host);
    }
    return host;
  }
  function normalizePayload(kind, payload, fallbackValue) {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return {
        kind,
        title: payload.title || trDialog(kind === 'confirm' ? 'confirm' : 'notice', kind === 'confirm' ? 'Confirm' : 'Notice'),
        message: payload.message || payload.desc || '',
        defaultValue: payload.defaultValue != null ? String(payload.defaultValue) : (fallbackValue || ''),
        okText: payload.okText || trDialog('ok', 'OK'),
        cancelText: payload.cancelText || trDialog('cancel', 'Cancel'),
        html: typeof payload.html === 'string' ? payload.html : '',
        onRender: typeof payload.onRender === 'function' ? payload.onRender : null,
        getResult: typeof payload.getResult === 'function' ? payload.getResult : null
      };
    }
    const text = String(payload == null ? '' : payload);
    const splitPattern = kind === 'confirm' && !/\n{2,}/.test(text) && /\n/.test(text)
      ? /\n/
      : /\n{2,}/;
    const parts = text.split(splitPattern);
    const title = parts.length > 1
      ? parts.shift()
      : trDialog(kind === 'confirm' ? 'confirm' : 'notice', kind === 'confirm' ? 'Confirm' : 'Notice');
    return {
      kind,
      title: title || trDialog(kind === 'confirm' ? 'confirm' : 'notice', kind === 'confirm' ? 'Confirm' : 'Notice'),
      message: parts.length ? parts.join('\n\n') : text,
      defaultValue: fallbackValue || '',
      okText: trDialog('ok', 'OK'),
      cancelText: trDialog('cancel', 'Cancel'),
      html: '',
      onRender: null,
      getResult: null
    };
  }
  function closeDialog(result) {
    if (!active) return;
    const current = active;
    active = null;
    try {
      if (current.overlay && current.overlay.parentNode) current.overlay.parentNode.removeChild(current.overlay);
    } catch (_) {}
    current.resolve(result);
    requestAnimationFrame(flushQueue);
  }
  function flushQueue() {
    if (active || !queue.length) return;
    const next = queue.shift();
    const uiHost = ensureUi();
    const overlay = document.createElement('div');
    overlay.className = 'star-dialog-overlay';
    const cancelButton = next.kind === 'alert' ? '' : `<button type="button" class="start-footer-btn" data-action="cancel">${escapeHtml(next.cancelText)}</button>`;
    const inputHtml = next.kind === 'prompt'
      ? `<input type="text" class="star-dialog__input" data-role="input" value="${escapeHtml(next.defaultValue || '')}">`
      : '';
    const extraHtml = next.html
      ? `<div class="star-dialog__extra" data-role="extra">${next.html}</div>`
      : '';
    overlay.innerHTML = `
      <div class="star-dialog" role="dialog" aria-modal="true">
        <div class="star-dialog__head">
          <h3 class="star-dialog__title">${escapeHtml(next.title)}</h3>
        </div>
        <div class="star-dialog__body">
          <div>${escapeHtml(next.message)}</div>
          ${inputHtml}
          ${extraHtml}
        </div>
        <div class="star-dialog__actions">
          ${cancelButton}
          <button type="button" class="start-footer-btn" style="background:var(--accent);color:#fff;" data-action="ok">${escapeHtml(next.okText)}</button>
        </div>
      </div>
    `;
    uiHost.appendChild(overlay);
    active = { overlay, resolve: next.resolve, kind: next.kind };
    const inputEl = overlay.querySelector('[data-role="input"]');
    const okBtn = overlay.querySelector('[data-action="ok"]');
    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    if (next.onRender) {
      try {
        next.onRender(overlay);
      } catch (_) {}
    }
    const resolveOk = () => {
      if (next.kind === 'confirm') {
        if (typeof next.getResult === 'function') {
          closeDialog(next.getResult(overlay));
        } else {
          closeDialog(true);
        }
      }
      else if (next.kind === 'prompt') closeDialog(inputEl ? inputEl.value : '');
      else closeDialog(undefined);
    };
    const resolveCancel = () => {
      if (next.kind === 'confirm') closeDialog(false);
      else if (next.kind === 'prompt') closeDialog(null);
      else closeDialog(undefined);
    };
    overlay.addEventListener('click', (event) => {
      event.stopPropagation();
      if (event.target === overlay) resolveCancel();
    });
    if (okBtn) okBtn.addEventListener('click', resolveOk);
    if (cancelBtn) cancelBtn.addEventListener('click', resolveCancel);
    overlay.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        resolveCancel();
      } else if (event.key === 'Enter' && event.target !== cancelBtn) {
        event.preventDefault();
        resolveOk();
      }
    });
    overlay.addEventListener('keyup', (event) => {
      event.stopPropagation();
    });
    overlay.addEventListener('keypress', (event) => {
      event.stopPropagation();
    });
    setTimeout(() => {
      const focusTarget = inputEl || okBtn || cancelBtn;
      if (focusTarget && typeof focusTarget.focus === 'function') {
        focusTarget.focus();
        if (inputEl && typeof inputEl.select === 'function') inputEl.select();
      }
    }, 0);
  }
  function enqueue(kind, payload, fallbackValue) {
    return new Promise(resolve => {
      queue.push(Object.assign(normalizePayload(kind, payload, fallbackValue), { resolve }));
      flushQueue();
    });
  }

  window.StarDialog = {
    alert(payload) { return enqueue('alert', payload); },
    confirm(payload) { return enqueue('confirm', payload); },
    prompt(payload, defaultValue) { return enqueue('prompt', payload, defaultValue); }
  };
  window.alert = function(message) {
    return window.StarDialog.alert(message);
  };
  window.confirm = function(message) {
    window.StarDialog.confirm(message);
    return false;
  };
  window.prompt = function(message, defaultValue) {
    window.StarDialog.prompt(message, defaultValue);
    return null;
  };
})();

function setWindowLocaleRefresh(container, refreshFn) {
  if (!container || typeof refreshFn !== 'function') return;
  try {
    const hostWin = container.closest && container.closest('.star-window');
    if (!hostWin || !window.StarWindowManager || !Array.isArray(StarWindowManager.windows)) return;
    const win = StarWindowManager.windows.find(item => item && item.id === hostWin.id);
    if (win) win.localeRefresh = refreshFn;
  } catch (_) {}
}

const STAR_TEXT_OPEN_LIMIT_BYTES = 10 * 1024 * 1024;

function getPathLeafName(filePath) {
  const text = String(filePath || '').trim();
  if (!text) return '';
  const parts = text.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : text;
}

function formatReadableBytes(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  try {
    if (window.StarMemory && typeof window.StarMemory.formatBytes === 'function') {
      return window.StarMemory.formatBytes(value);
    }
  } catch (_) {}
  if (value < 1024) return value + ' B';
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB';
  if (value < 1024 * 1024 * 1024) return (value / (1024 * 1024)).toFixed(1) + ' MB';
  return (value / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function showBlockedLargeTextFileAlert(filePath, appLabel, size, limit) {
  const title = (typeof t === 'function')
    ? t('textOpenTooLargeTitle', 'File too large')
    : 'File too large';
  const fallbackMessage = `To prevent ${appLabel || 'the app'} from freezing, "${getPathLeafName(filePath) || filePath}" cannot be opened.\nCurrent size: ${formatReadableBytes(size)}\nSafe limit: ${formatReadableBytes(limit)}\nPlease use a dedicated editor for this file.`;
  const message = (typeof t === 'function')
    ? t('textOpenTooLargeMessage', fallbackMessage, {
      app: appLabel || ((typeof t === 'function') ? t('textEditor', 'Text Editor') : 'Text Editor'),
      file: getPathLeafName(filePath) || String(filePath || ''),
      size: formatReadableBytes(size),
      limit: formatReadableBytes(limit)
    })
    : fallbackMessage;
  if (window.StarDialog && typeof window.StarDialog.alert === 'function') {
    window.StarDialog.alert({
      title,
      message,
      okText: (typeof t === 'function') ? t('ok', 'OK') : 'OK'
    });
    return;
  }
  alert(title + '\n\n' + message);
}

async function readTextFileWithOpenGuard(filePath, appLabel) {
  if (!filePath) return { content: '' };
  let electron = null;
  try {
    electron = require('electron');
  } catch (error) {
    return { error: error && error.message ? error.message : 'Electron is unavailable.' };
  }
  const stat = await electron.ipcRenderer.invoke('os:stat', filePath);
  if (stat && stat.error) return { error: stat.error };
  if (!stat || stat.isDir) {
    return {
      error: (typeof t === 'function')
        ? t('textOpenDirectoryBlocked', 'Folders cannot be opened in {app}.', { app: appLabel || t('textEditor', 'Text Editor') })
        : 'Folders cannot be opened here.'
    };
  }
  const size = Math.max(0, Number(stat.size) || 0);
  if (size > STAR_TEXT_OPEN_LIMIT_BYTES) {
    showBlockedLargeTextFileAlert(filePath, appLabel, size, STAR_TEXT_OPEN_LIMIT_BYTES);
    return { blocked: true, size, limit: STAR_TEXT_OPEN_LIMIT_BYTES };
  }
  const content = await electron.ipcRenderer.invoke('os:readFile', filePath);
  if (content && typeof content === 'object' && content.error) return { error: content.error };
  return { content: typeof content === 'string' ? content : String(content == null ? '' : content) };
}

const StarAppsLogic = {
  /*
   * Legacy duplicate file-manager implementations are intentionally disabled.
   * Keep only the consolidated implementation below active.
   [legacy file-manager implementation v1 disabled]
    if (!container) return;
    const pathInput = container.querySelector('#fm-path');
    const tbody = container.querySelector('#fm-tbody');
    const backBtn = container.querySelector('#fm-back');
    const forwardBtn = container.querySelector('#fm-forward');
    const goBtn = container.querySelector('#fm-go');
    const newFolderBtn = container.querySelector('#fm-newfolder');
    const newFileBtn = container.querySelector('#fm-newfile');
    const deleteBtn = container.querySelector('#fm-delete');
    const recycleBtn = container.querySelector('#fm-recyclebin');
    const electron = require('electron');
    const path = require('path');
    const homePath = process.env.USERPROFILE || process.env.HOME || (process.platform === 'win32' ? 'C:\\\\' : '/');
    const ROOT = '__star_drives__';
    let currentPath = ROOT;
    const history = [currentPath];
    let historyIndex = 0;
    let selectedPath = null;

    function formatSize(n) {
      if (n === undefined || n === null) return '—';
      if (n < 1024) return n + ' B';
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
      return (n / (1024 * 1024)).toFixed(1) + ' MB';
    }
    function formatDate(ms) {
      if (!ms) return '—';
      return new Date(ms).toLocaleString(getLocale());
    }
    function render() {
      if (!pathInput || !tbody) return;
      pathInput.value = currentPath === ROOT ? (typeof t === 'function' ? t('thisPC') : '此电脑') : currentPath;
      selectedPath = null;
      tbody.innerHTML = '<tr><td colspan="3" style="padding:12px;color:var(--text-dim);">' + t('loading') + '</td></tr>';
      const isRoot = currentPath === ROOT || currentPath === '' || currentPath === (typeof t === 'function' ? t('thisPC') : '此电脑');
      const promise = isRoot
        ? electron.ipcRenderer.invoke('os:listDrives')
        : electron.ipcRenderer.invoke('os:readdir', currentPath);
      promise.then(result => {
        if (!tbody) return;
        if (result && result.error) {
          tbody.innerHTML = '<tr><td colspan="3" style="padding:12px;color:var(--error, #f55);">' + escapeHtml(result.error) + '</td></tr>';
          return;
        }
        if (!Array.isArray(result)) {
          tbody.innerHTML = '<tr><td colspan="3" style="padding:12px;color:var(--text-dim);">' + t('loadFailed') + '</td></tr>';
          return;
        }
        const rows = (Array.isArray(result) ? result : []).map(f => {
          if (isRoot) {
            const full = f.path || f.name;
            const name = f.name || f.path;
            return `<tr class="fm-row" data-name="${escapeHtml(name)}" data-dir="true" data-path="${escapeHtml(full)}"><td style="padding:8px;">📁 ${escapeHtml(name)}</td><td style="text-align:right;padding:8px;">—</td><td style="padding:8px;"></td></tr>`;
          } else {
            const name = f.name;
            const isDir = f.isDir;
            const full = path.join(currentPath, name);
            return `<tr class="fm-row" data-name="${escapeHtml(name)}" data-dir="${isDir}" data-path="${escapeHtml(full)}"><td style="padding:8px;">${isDir ? '📁 ' : ''}${escapeHtml(name)}</td><td style="text-align:right;padding:8px;">${isDir ? '—' : (f.size != null ? formatSize(f.size) : '')}</td><td style="padding:8px;">${f.mtime != null ? formatDate(f.mtime) : ''}</td></tr>`;
          }
        }).join('');
        tbody.innerHTML = rows || '<tr><td colspan="3" style="padding:12px;color:var(--text-dim);">' + t('folderEmpty') + '</td></tr>';
        tbody.querySelectorAll('.fm-row').forEach(row => {
          row.addEventListener('click', () => {
            tbody.querySelectorAll('.fm-row').forEach(r => r.classList.remove('fm-selected'));
            row.classList.add('fm-selected');
            selectedPath = row.getAttribute('data-path');
          });
          row.addEventListener('dblclick', () => {
            const name = row.getAttribute('data-name');
            const isDir = row.getAttribute('data-dir') === 'true';
            const next = isRoot ? row.getAttribute('data-path') : path.join(currentPath, name);
            if (isDir) {
              historyIndex++;
              history.length = historyIndex;
              history.push(next);
              currentPath = next;
              render();
            } else {
              const lower = (name || path.basename(next) || '').toLowerCase();
              const ext = path.extname(lower).toLowerCase();
              const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'];
              const videoExts = ['.mp4', '.avi', '.wmv', '.mkv', '.mov', '.webm', '.m4v'];
              const officeExts = ['.doc', '.docx', '.ppt', '.pptx', '.pdf', '.xls', '.xlsx'];
              const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.ico'];
              const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'];
              const htmlExts = ['.html', '.htm'];
              const scriptExts = ['.bat', '.cmd', '.ps1', '.sh'];
              const textExts = ['.txt', '.log', '.xml', '.json', '.yml', '.yaml', '.ini', '.cfg', '.conf', '.csv', '.tsv', '.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.less', '.java', '.py', '.c', '.cpp', '.cs', '.go', '.rs', '.php', '.sql'];

              if ((ext === '.md' || ext === '.markdown') && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
                window.StarAppsRegistry.openWithFile('markdown-reader', next);
                return;
              }
              if (window.StarAppsRegistry && window.StarAppsRegistry.recordFileOpen) {
                window.StarAppsRegistry.recordFileOpen(next);
              }

              if (audioExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
                window.StarAppsRegistry.openWithFile('music-player', next);
                return;
              }
              if (videoExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
                window.StarAppsRegistry.openWithFile('video-player', next);
                return;
              }
              if (officeExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
                window.StarAppsRegistry.openWithFile('wps-editor', next);
                return;
              }
              if (imageExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
                window.StarAppsRegistry.openWithFile('image-viewer', next);
                return;
              }
	              if (archiveExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
	                window.StarAppsRegistry.openWithFile('star-unzip', next);
	                return;
	              }
	              if (htmlExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
	                window.StarAppsRegistry.openWithFile('browser', next, { url: toStarFileUrl(next) });
	                return;
	              }
              if (scriptExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
                const isWin = process.platform === 'win32';
                const cwd = path.dirname(next);
                let cmd = '';
                if (isWin) {
                  if (ext === '.ps1') cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${next}"`;
                  else cmd = `call "${next}"`;
                } else {
                  cmd = ext === '.sh' ? `bash "${next}"` : `"${next}"`;
                }
                window.StarAppsRegistry.openWithFile('terminal', next, { cwd, cmd, filePath: next });
                return;
              }
              if (textExts.includes(ext)) {
                try {
                  if (window.StarAppsRegistry && window.StarAppsRegistry.recordAppLaunch) {
                    window.StarAppsRegistry.recordAppLaunch('text-editor');
                  }
                  const apps = (typeof StarAppsRegistry !== 'undefined' && StarAppsRegistry.getAll) ? StarAppsRegistry.getAll() : [];
                  const npApp = apps && apps.find(a => a.id === 'text-editor');
                  const title = (npApp && t) ? t('textEditor') : (name || '记事本');
                  const icon = npApp && npApp.icon ? npApp.icon : '';
                  window.__starNotepadInitialPath = next;
                  StarWindowManager.create({
                    appId: 'text-editor',
                    title,
                    icon,
                    width: 700,
                    height: 500,
                    content: StarAppsRegistry.getTextEditorContent(),
                    contentEl: true,
                  });
                  if (window.updateTaskbarApps) window.updateTaskbarApps();
                  return;
                } catch (_) {}
              }
              const externalOnlyExts = ['.exe', '.msi', '.lnk', '.dll', '.com'];
              if (externalOnlyExts.includes(ext)) {
                electron.ipcRenderer.invoke('os:launch', next);
                return;
              }
              // 未知扩展名或无后缀：强制走记事本（当作纯文本）
              try {
                if (window.StarAppsRegistry && window.StarAppsRegistry.recordAppLaunch) {
                  window.StarAppsRegistry.recordAppLaunch('text-editor');
                }
                const apps = (typeof StarAppsRegistry !== 'undefined' && StarAppsRegistry.getAll) ? StarAppsRegistry.getAll() : [];
                const npApp = apps && apps.find(a => a.id === 'text-editor');
                const title = (npApp && t) ? t('textEditor') : (name || '记事本');
                const icon = npApp && npApp.icon ? npApp.icon : '';
                window.__starNotepadInitialPath = next;
                StarWindowManager.create({
                  appId: 'text-editor',
                  title,
                  icon,
                  width: 700,
                  height: 500,
                  content: StarAppsRegistry.getTextEditorContent(),
                  contentEl: true,
                });
                if (window.updateTaskbarApps) window.updateTaskbarApps();
              } catch (_) {
                electron.ipcRenderer.invoke('os:launch', next);
              }
            }
          });
        });
      });
    }
    backBtn.addEventListener('click', () => {
      if (historyIndex > 0) {
        historyIndex--;
        currentPath = history[historyIndex];
        render();
      } else if (currentPath !== ROOT) {
        currentPath = ROOT;
        historyIndex = 0;
        history.length = 1;
        history[0] = ROOT;
        render();
      }
    });
    forwardBtn.addEventListener('click', () => {
      if (historyIndex < history.length - 1) { historyIndex++; currentPath = history[historyIndex]; render(); }
    });
    goBtn.addEventListener('click', () => {
      if (!pathInput.value) return;
      const v = pathInput.value.trim();
      if (!v || v === (typeof t === 'function' ? t('thisPC') : '此电脑')) {
        currentPath = ROOT;
      } else {
        currentPath = v;
      }
      historyIndex++;
      history.length = historyIndex;
      history[historyIndex] = currentPath;
      render();
    });
    pathInput.addEventListener('keydown', e => { if (e.key === 'Enter') goBtn.click(); });
    newFolderBtn.addEventListener('click', () => {
      if (currentPath === ROOT) {
        alert(t('pleaseOpenDriveFirst'));
        return;
      }
      const base = '新建文件夹';
      const full = path.join(currentPath, base + '-' + Date.now());
      electron.ipcRenderer.invoke('os:mkdir', full).then(r => {
        if (r && r.error) alert(r.error);
        render();
      });
    });
    newFileBtn.addEventListener('click', () => {
      const base = '新建文件.txt';
      const full = path.join(currentPath, base.replace('.txt', '-' + Date.now() + '.txt'));
      electron.ipcRenderer.invoke('os:writeFile', full, '').then(r => {
        if (r && r.error) alert(r.error);
        render();
      });
    });
    deleteBtn.addEventListener('click', () => {
      if (!selectedPath) { alert(t('pleaseSelectItem')); return; }
      if (!confirm(t('delete') + '?')) return;
      electron.ipcRenderer.invoke('os:trashItem', selectedPath).then(r => { if (r.error) alert(r.error); else render(); });
    });
    recycleBtn.addEventListener('click', () => {
      electron.ipcRenderer.invoke('os:openRecycleBin').then(() => {});
    });
    container.addEventListener('keydown', e => {
      if (e.key === 'Delete' && selectedPath) {
        e.preventDefault();
        if (!confirm(t('delete') + '?')) return;
        electron.ipcRenderer.invoke('os:trashItem', selectedPath).then(r => { if (r.error) alert(r.error); else render(); });
      }
    });
    render();
  },

  */
  /*
   * Legacy duplicate file-manager implementation disabled.
   [legacy file-manager implementation v2 disabled]
    if (!container) return;
    const pathInput = container.querySelector('#fm-path');
    const tbody = container.querySelector('#fm-tbody');
    const backBtn = container.querySelector('#fm-back');
    const forwardBtn = container.querySelector('#fm-forward');
    const goBtn = container.querySelector('#fm-go');
    const newFolderBtn = container.querySelector('#fm-newfolder');
    const newFileBtn = container.querySelector('#fm-newfile');
    const renameBtn = container.querySelector('#fm-rename');
    const copyBtn = container.querySelector('#fm-copy');
    const cutBtn = container.querySelector('#fm-cut');
    const pasteBtn = container.querySelector('#fm-paste');
    const deleteBtn = container.querySelector('#fm-delete');
    const recycleBtn = container.querySelector('#fm-recyclebin');
    const sortLabelEl = container.querySelector('#fm-sort-label');
    const sortFieldSelect = container.querySelector('#fm-sort-field');
    const sortDirectionBtn = container.querySelector('#fm-sort-direction');
    const headNameEl = container.querySelector('#fm-head-name');
    const headSizeEl = container.querySelector('#fm-head-size');
    const headDateEl = container.querySelector('#fm-head-date');
    const electron = require('electron');
    const path = require('path');
    const ROOT = '__star_drives__';
    let currentPath = ROOT;
    const history = [ROOT];
    let historyIndex = 0;
    let selectedItem = null;
    let selectedPath = null;
    let renamingPath = null;
    let renameDraft = '';
    let renameBusy = false;
    let suppressRenameBlur = false;
    let sortField = 'name';
    let sortDirection = 'asc';
    let renderToken = 0;
    let loadingTimer = null;
    let hardLoadingTimer = null;
    const safeEscapeHtml = typeof escapeHtml === 'function'
      ? escapeHtml
      : (value => String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;'));
    const safeLocale = () => {
      try {
        return typeof getLocale === 'function' ? getLocale() : undefined;
      } catch (_) {
        return undefined;
      }
    };
    let hardLoadingTimer = null;
    window.__starFileClipboard = window.__starFileClipboard || null;

    function tr(key, fallback, params) {
      try {
        const value = typeof t === 'function' ? t(key, fallback, params) : (fallback ?? key);
        return value === key ? fallback : value;
      } catch (_) {
        return fallback;
      }
    }
    function getFsErrorSource(rawError) {
      if (!rawError) return '';
      if (typeof rawError === 'string') return rawError;
      if (rawError.message) return String(rawError.message);
      return String(rawError);
    }
    function extractFsErrorPath(rawError, fallbackPath) {
      const text = getFsErrorSource(rawError);
      const matches = [...text.matchAll(/["']([^"']+)["']/g)];
      if (matches.length) {
        const last = matches[matches.length - 1];
        if (last && last[1]) return last[1];
      }
      return fallbackPath || '';
    }
    function formatFsError(rawError, fallbackPath, mode) {
      const text = getFsErrorSource(rawError).trim();
      const lower = text.toLowerCase();
      const displayPath = extractFsErrorPath(text, fallbackPath) || tr('fmThisLocation', 'this location');
      if (!text) {
        return mode === 'open'
          ? tr('fmErrorOpenGeneric', 'Cannot open this location.', { message: '' })
          : tr('fmErrorGeneric', 'Operation failed.', { message: '' });
      }
      if (/\benoent\b/i.test(text) || /no such file or directory/i.test(lower)) {
        return tr('fmErrorPathNotFound', 'The path does not exist: {path}', { path: displayPath });
      }
      if (/\benotdir\b/i.test(text) || /not a directory/i.test(lower)) {
        return tr('fmErrorNotFolder', 'This location is not a folder: {path}', { path: displayPath });
      }
      if (/\beacces\b/i.test(text) || /\beperm\b/i.test(text) || /permission denied/i.test(lower) || /access is denied/i.test(lower) || /operation not permitted/i.test(lower)) {
        return tr('fmErrorAccessDenied', 'Access denied: {path}', { path: displayPath });
      }
      if (/\beexist\b/i.test(text) || /already exists/i.test(lower)) {
        return tr('fmErrorAlreadyExists', 'The target already exists: {path}', { path: displayPath });
      }
      if (/\bebusy\b/i.test(text) || /resource busy/i.test(lower) || /being used by another process/i.test(lower)) {
        return tr('fmErrorBusy', 'This item is currently in use: {path}', { path: displayPath });
      }
      if (/cannot copy a folder into itself/i.test(lower)) {
        return tr('fmErrorCopyIntoSelf', 'You cannot copy a folder into itself.');
      }
      if (/cannot move a folder into itself/i.test(lower)) {
        return tr('fmErrorMoveIntoSelf', 'You cannot move a folder into itself.');
      }
      if (/missing path/i.test(lower)) {
        return tr('fmErrorMissingPath', 'Please enter a valid path.');
      }
      return mode === 'open'
        ? tr('fmErrorOpenGeneric', 'Cannot open this location. {message}', { message: text })
        : tr('fmErrorGeneric', 'Operation failed. {message}', { message: text });
    }
    function updateStaticLabels() {
      if (backBtn) backBtn.textContent = tr('back', 'Back');
      if (forwardBtn) forwardBtn.textContent = tr('forward', 'Forward');
      if (goBtn) goBtn.textContent = tr('refresh', 'Refresh');
      if (pathInput) pathInput.placeholder = tr('addressBar', 'Address');
      if (newFolderBtn) newFolderBtn.textContent = tr('newFolder', 'New folder');
      if (newFileBtn) newFileBtn.textContent = tr('newFile', 'New file');
      if (renameBtn) renameBtn.textContent = tr('rename', 'Rename');
      if (copyBtn) copyBtn.textContent = tr('copy', 'Copy');
      if (cutBtn) cutBtn.textContent = tr('cut', 'Cut');
      if (pasteBtn) pasteBtn.textContent = tr('paste', 'Paste');
      if (deleteBtn) deleteBtn.textContent = tr('delete', 'Delete');
      if (recycleBtn) recycleBtn.textContent = tr('recycleBin', 'Recycle Bin');
      if (sortLabelEl) sortLabelEl.textContent = tr('sortLabel', 'Sort');
      if (sortFieldSelect) {
        const optionMap = {
          name: tr('sortByName', 'Name'),
          type: tr('sortByType', 'Type'),
          size: tr('sortBySize', 'Size'),
          date: tr('sortByDate', 'Date')
        };
        Array.from(sortFieldSelect.options).forEach(option => {
          option.textContent = optionMap[option.value] || option.textContent;
        });
      }
      if (headNameEl) headNameEl.textContent = tr('name', 'Name');
      if (headSizeEl) headSizeEl.textContent = tr('size', 'Size');
      if (headDateEl) headDateEl.textContent = tr('date', 'Date');
    }
    function formatSize(n) {
      if (n === undefined || n === null || Number.isNaN(Number(n))) return '--';
      const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
      let value = Math.max(0, Number(n));
      let unitIndex = 0;
      while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
      }
      if (unitIndex === 0) return Math.round(value) + ' B';
      const digits = value >= 100 ? 0 : (value >= 10 ? 1 : 2);
      return value.toFixed(digits) + ' ' + units[unitIndex];
    }
    function formatDate(ms) {
      if (ms === undefined || ms === null || !Number.isFinite(Number(ms))) return '--';
      const d = new Date(Number(ms));
      if (Number.isNaN(d.getTime())) return '--';
      const pad = v => String(v).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    function getExtension(name) {
      const ext = path.extname(name || '').toLowerCase();
      return ext || '';
    }
    function getFileKind(item) {
      if (!item) return 'file';
      if (item.isDir) return 'folder';
      const ext = getExtension(item.name);
      if (['.mp3', '.ogg', '.wav', '.flac', '.aac', '.m4a', '.wma'].includes(ext)) return 'audio';
      if (['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm', '.m4v'].includes(ext)) return 'video';
      if (['.exe', '.msi', '.bat', '.cmd', '.com'].includes(ext)) return 'executable';
      if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico'].includes(ext)) return 'image';
      if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) return 'archive';
      if (['.txt', '.md', '.json', '.js', '.ts', '.html', '.css', '.java', '.py', '.c', '.cpp', '.cs'].includes(ext)) return 'text';
      return 'file';
    }
    function getTypeLabel(item) {
      const kind = getFileKind(item);
      const labels = {
        folder: tr('folderType', 'Folder'),
        audio: tr('audioType', 'Audio'),
        video: tr('videoType', 'Video'),
        executable: tr('executableType', 'Application'),
        image: tr('imageType', 'Image'),
        archive: tr('archiveType', 'Archive'),
        text: tr('textType', 'Document'),
        file: tr('fileType', 'File')
      };
      return labels[kind] || labels.file;
    }
	    function getFileIconSvg(item) {
      const kind = getFileKind(item);
      const icons = {
        folder: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
        audio: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>',
        video: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h11a2 2 0 0 1 2 2v2.5l4-2.5v10l-4-2.5V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm5 3v8l6-4-6-4z"/></svg>',
        executable: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h10l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm8 1.5V8h3.5L13 4.5z"/><path d="M8 11h2v2H8zm0 4h2v2H8zm4-4h4v2h-4zm0 4h4v2h-4z"/></svg>',
        image: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 14H5l3.5-4.5 2.5 3.01L14.5 11l4.5 6zM8.5 9A1.5 1.5 0 1 0 8.5 6a1.5 1.5 0 0 0 0 3z"/></svg>',
        archive: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 5.23 19.15 3.3A2 2 0 0 0 17.53 2H6.47a2 2 0 0 0-1.62 1.3L3.46 5.23A2 2 0 0 0 3 6.46V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.46a2 2 0 0 0-.46-1.23zM12 18l-3-3h2v-3h2v3h2l-3 3zm5-11H7V4h10v3z"/></svg>',
        text: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1 7V3.5L18.5 9H15z"/><path d="M8 12h8v1.5H8zm0 3h8v1.5H8z"/></svg>',
        file: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 7V3.5L19.5 9H14z"/></svg>'
      };
      return icons[kind] || icons.file;
	    }
	    function buildStarFileUrl(filePath) {
	      const raw = String(filePath || '').trim();
	      if (!raw) return 'star-file:///';
	      const normalized = raw.replace(/\\/g, '/');
	      // UNC path: \\server\share\file -> star-file://server/share/file
	      if (/^\/\/[^/]/.test(normalized)) return 'star-file:' + encodeURI(normalized);
	      // Drive path: C:\dir\file -> star-file:///C:/dir/file
	      if (/^[A-Za-z]:\//.test(normalized)) return 'star-file:///' + encodeURI(normalized);
	      return 'star-file:///' + encodeURI(normalized.replace(/^\/+/, ''));
	    }
	    function toFilePreviewUrl(filePath) {
	      return buildStarFileUrl(String(filePath || ''));
	    }
    function buildPreviewVisual(item) {
      const kind = getFileKind(item);
      if (kind === 'image' && item && item.path) {
        return `
          <span class="fm-file-thumb" data-kind="image" aria-hidden="true">
            <img class="fm-file-thumb-image" src="${escapeHtml(toFilePreviewUrl(item.path))}" loading="lazy" decoding="async" alt="">
          </span>
        `;
      }
      if (kind === 'video' && item && item.path) {
        return `
          <span class="fm-file-thumb fm-file-thumb--video" data-kind="video" aria-hidden="true">
            <video class="fm-file-thumb-video" src="${escapeHtml(toFilePreviewUrl(item.path))}" preload="metadata" muted playsinline></video>
            <span class="fm-file-thumb-play">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 6v12l10-6z"/></svg>
            </span>
          </span>
        `;
      }
      return `<span class="fm-file-icon" aria-hidden="true">${getFileIconSvg(item)}</span>`;
    }
    function sortItems(items) {
      const factor = sortDirection === 'desc' ? -1 : 1;
      return items.slice().sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        let result = 0;
        if (sortField === 'size') {
          result = (a.size || 0) - (b.size || 0);
        } else if (sortField === 'date') {
          result = (a.mtime || 0) - (b.mtime || 0);
        } else if (sortField === 'type') {
          result = getTypeLabel(a).localeCompare(getTypeLabel(b), safeLocale(), { sensitivity: 'base' });
          if (!result) result = (a.name || '').localeCompare(b.name || '', safeLocale(), { sensitivity: 'base' });
        } else {
          result = (a.name || '').localeCompare(b.name || '', safeLocale(), { sensitivity: 'base', numeric: true });
        }
        return result * factor;
      });
    }
    function isRootPath(value) {
      return value === ROOT || value === '' || value === tr('thisPC', 'This PC');
    }
    function canEditSelection() {
      return !!selectedItem && !isRootPath(currentPath) && !isProtectedSystemItem(selectedItem);
    }
    function updateActions() {
      const hasSelection = canEditSelection();
      const canPaste = !!window.__starFileClipboard && !isRootPath(currentPath);
      if (renameBtn) { renameBtn.disabled = false; renameBtn.dataset.ready = hasSelection ? 'true' : 'false'; }
      if (copyBtn) { copyBtn.disabled = false; copyBtn.dataset.ready = hasSelection ? 'true' : 'false'; }
      if (cutBtn) { cutBtn.disabled = false; cutBtn.dataset.ready = hasSelection ? 'true' : 'false'; }
      if (deleteBtn) { deleteBtn.disabled = false; deleteBtn.dataset.ready = hasSelection ? 'true' : 'false'; }
      if (pasteBtn) { pasteBtn.disabled = false; pasteBtn.dataset.ready = canPaste ? 'true' : 'false'; }
    }
    function setSelection(row, item) {
      tbody.querySelectorAll('.fm-row').forEach(r => r.classList.remove('fm-selected'));
      row.classList.add('fm-selected');
      selectedItem = item;
      selectedPath = item ? item.path : null;
      updateActions();
    }
    function clearRenameState() {
      renamingPath = null;
      renameDraft = '';
      renameBusy = false;
      suppressRenameBlur = false;
    }
    function setRenameBlurSuppressed(nextValue) {
      suppressRenameBlur = !!nextValue;
    }
    function pushHistory(next) {
      history.splice(historyIndex + 1);
      history.push(next);
      historyIndex = history.length - 1;
      currentPath = next;
      render();
    }
    function normalizePathInputValue(rawValue) {
      const trimmed = String(rawValue || '').trim();
      const unquoted = trimmed.replace(/^"(.*)"$/, '$1');
      if (!unquoted || isRootPath(unquoted)) return ROOT;
      if (/^[a-zA-Z]:$/.test(unquoted)) return unquoted + '\\';
      return unquoted;
    }
    function showPathOpenError(rawError, targetPath) {
      const message = formatFsError(rawError, targetPath, 'open');
      alert(message);
      if (pathInput) {
        setTimeout(() => {
          if (!pathInput.isConnected) return;
          pathInput.focus();
          pathInput.select();
        }, 0);
      }
    }
    async function submitPathInput(rawValue) {
      const targetPath = normalizePathInputValue(rawValue);
      if (targetPath === ROOT) {
        if (currentPath === ROOT) render();
        else pushHistory(ROOT);
        return;
      }
      try {
        const stat = await electron.ipcRenderer.invoke('os:stat', targetPath);
        if (stat && stat.error) {
          showPathOpenError(stat.error, targetPath);
          return;
        }
        if (stat && stat.isDir && stat.isProtected) {
          showProtectedSystemFolderBlocked(targetPath);
          return;
        }
        if (stat && stat.isDir) {
          if (currentPath === targetPath) render();
          else pushHistory(targetPath);
          return;
        }
        openFile(targetPath, path.basename(targetPath));
      } catch (error) {
        showPathOpenError(error, targetPath);
      }
    }
    function openFile(filePath, name) {
      if (window.StarAppsRegistry && window.StarAppsRegistry.recordFileOpen) {
        window.StarAppsRegistry.recordFileOpen(filePath);
      }
      const lower = (name || path.basename(filePath) || '').toLowerCase();
      const ext = path.extname(lower).toLowerCase();
      const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'];
      const videoExts = ['.mp4', '.avi', '.wmv', '.mkv', '.mov', '.webm', '.m4v'];
      const officeExts = ['.doc', '.docx', '.ppt', '.pptx', '.pdf', '.xls', '.xlsx'];
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.ico'];
      const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'];
      const htmlExts = ['.html', '.htm'];
      const scriptExts = ['.bat', '.cmd', '.ps1', '.sh'];
      const textExts = ['.txt', '.log', '.xml', '.json', '.yml', '.yaml', '.ini', '.cfg', '.conf', '.csv', '.tsv', '.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.less', '.java', '.py', '.c', '.cpp', '.cs', '.go', '.rs', '.php', '.sql'];

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
	        window.StarAppsRegistry.openWithFile('browser', filePath, { url: buildStarFileUrl(filePath) });
	        return;
	      }
      if (scriptExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
        const isWin = process.platform === 'win32';
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
      if (textExts.includes(ext)) {
        try {
          if (window.StarAppsRegistry && window.StarAppsRegistry.recordAppLaunch) {
            window.StarAppsRegistry.recordAppLaunch('text-editor');
          }
          const app = window.StarAppsRegistry && window.StarAppsRegistry.getApp ? window.StarAppsRegistry.getApp('text-editor') : null;
          window.__starNotepadInitialPath = filePath;
          StarWindowManager.create({
            appId: 'text-editor',
            title: typeof t === 'function' ? t('textEditor') : 'Text Editor',
            icon: app && app.icon ? app.icon : '',
            width: 700,
            height: 500,
            content: StarAppsRegistry.getTextEditorContent(),
            contentEl: true,
          });
          if (window.updateTaskbarApps) window.updateTaskbarApps();
          return;
        } catch (_) {}
      }
      const externalOnlyExts = ['.exe', '.msi', '.lnk', '.dll', '.com'];
      if (externalOnlyExts.includes(ext)) {
        electron.ipcRenderer.invoke('os:launch', filePath);
        return;
      }
      // 未知扩展名或无后缀：强制走记事本（当作纯文本）
      try {
        if (window.StarAppsRegistry && window.StarAppsRegistry.recordAppLaunch) {
          window.StarAppsRegistry.recordAppLaunch('text-editor');
        }
        const app = window.StarAppsRegistry && window.StarAppsRegistry.getApp ? window.StarAppsRegistry.getApp('text-editor') : null;
        window.__starNotepadInitialPath = filePath;
        StarWindowManager.create({
          appId: 'text-editor',
          title: typeof t === 'function' ? t('textEditor') : 'Text Editor',
          icon: app && app.icon ? app.icon : '',
          width: 700,
          height: 500,
          content: StarAppsRegistry.getTextEditorContent(),
          contentEl: true,
        });
        if (window.updateTaskbarApps) window.updateTaskbarApps();
      } catch (_) {
        electron.ipcRenderer.invoke('os:launch', filePath);
      }
    }
    function startRenameSelected() {
      if (!canEditSelection()) {
        alert(tr('chooseItem', 'Please select an item first.'));
        return;
      }
      renamingPath = selectedItem.path;
      renameDraft = selectedItem.name;
      render();
    }
    async function commitRename(itemPath, originalName, nextName) {
      if (renameBusy) return;
      const trimmedName = (nextName || '').trim();
      if (!trimmedName || trimmedName === originalName) {
        clearRenameState();
        render();
        return;
      }
      if (!itemPath) {
        clearRenameState();
        render();
        return;
      }
      if (/[\\\\/:*?\"<>|]/.test(trimmedName)) {
        alert(tr('invalidName', 'Invalid name.'));
        return;
      }
      renameBusy = true;
      renameDraft = trimmedName;
      const nextPath = path.join(path.dirname(itemPath), trimmedName);
      const result = await electron.ipcRenderer.invoke('os:renamePath', itemPath, nextPath);
      renameBusy = false;
      if (result && result.error) {
        alert(result.error);
        return;
      }
      selectedPath = (result && result.path) || nextPath;
      clearRenameState();
      render();
    }
    function cancelRename() {
      if (!renamingPath) return;
      clearRenameState();
      render();
    }
    function bindRenameEditor(item) {
      const input = tbody.querySelector('.fm-rename-input');
      if (!input || !item || input.dataset.bound === 'true') return;
      input.dataset.bound = 'true';
      input.value = renameDraft || item.name || '';
      const finishPointerSelection = () => {
        if (input.dataset.dragSelecting !== 'true') return;
        input.dataset.dragSelecting = 'false';
        if (renameBusy || renamingPath !== item.path || !document.body.contains(input) || document.activeElement === input) return;
        setTimeout(() => {
          if (renameBusy || renamingPath !== item.path || !document.body.contains(input) || document.activeElement === input) return;
          try {
            input.focus({ preventScroll: true });
          } catch (_) {
            input.focus();
          }
        }, 0);
      };
      setTimeout(() => {
        if (!document.body.contains(input)) return;
        input.focus();
        input.select();
      }, 0);
      input.addEventListener('pointerdown', e => e.stopPropagation());
      input.addEventListener('mouseup', e => e.stopPropagation());
      input.addEventListener('selectstart', e => e.stopPropagation());
      input.addEventListener('click', e => e.stopPropagation());
      input.addEventListener('mousedown', e => {
        e.stopPropagation();
        input.dataset.dragSelecting = 'true';
        window.addEventListener('mouseup', finishPointerSelection, { capture: true, once: true });
      });
      input.addEventListener('dblclick', e => e.stopPropagation());
      input.addEventListener('contextmenu', e => e.stopPropagation());
      input.addEventListener('input', () => {
        renameDraft = input.value;
      });
      input.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          commitRename(item.path, item.name, input.value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelRename();
        }
      });
      input.addEventListener('blur', () => {
        if (renameBusy || suppressRenameBlur || renamingPath !== item.path || input.dataset.dragSelecting === 'true') return;
        commitRename(item.path, item.name, input.value);
      });
    }
    function shouldFreezeRenameRender() {
      if (!renamingPath || !tbody) return false;
      return !!tbody.querySelector('.fm-rename-input');
    }
    function markClipboard(cutMode) {
      if (!canEditSelection()) {
        alert(tr('chooseItem', 'Please select an item first.'));
        return;
      }
      window.__starFileClipboard = {
        path: selectedItem.path,
        name: selectedItem.name,
        cut: !!cutMode
      };
      updateActions();
    }
    async function pasteClipboard() {
      if (!window.__starFileClipboard) {
        alert(tr('clipboardEmpty', 'Clipboard is empty.'));
        return;
      }
      if (isRootPath(currentPath)) return;
      const method = window.__starFileClipboard.cut ? 'os:moveItem' : 'os:copyItem';
      const result = await electron.ipcRenderer.invoke(method, window.__starFileClipboard.path, currentPath);
      if (result && result.error) {
        alert(result.error);
        return;
      }
      if (window.__starFileClipboard.cut) window.__starFileClipboard = null;
      render();
    }
    function render() {
      if (!pathInput || !tbody) return;
      const requestToken = ++renderToken;
      const showRoot = isRootPath(currentPath);
      const hasExistingRows = !!tbody.querySelector('.fm-row');
      pathInput.value = showRoot ? tr('thisPC', 'This PC') : currentPath;
      selectedItem = null;
      setRenameBlurSuppressed(true);
      updateActions();
      tbody.innerHTML = '<tr><td colspan="3" style="padding:12px;color:var(--text-dim);">' + escapeHtml(tr('loading', 'Loading...')) + '</td></tr>';
      const promise = showRoot
        ? electron.ipcRenderer.invoke('os:listDrives')
        : electron.ipcRenderer.invoke('os:readdir', currentPath);
      promise.then(result => {
        if (!tbody) return;
        if (shouldFreezeRenameRender()) {
          setRenameBlurSuppressed(false);
          return;
        }
        if (result && result.error) {
          setRenameBlurSuppressed(false);
          tbody.innerHTML = '<tr><td colspan="3" style="padding:12px;color:var(--error, #f55);">' + escapeHtml(result.error) + '</td></tr>';
          return;
        }
        const items = Array.isArray(result) ? result.map(entry => showRoot ? {
          name: entry.name || entry.path,
          isDir: true,
          path: entry.path || entry.name,
          size: entry.size,
          mtime: entry.mtime
        } : {
          name: entry.name,
          isDir: !!entry.isDir,
          path: path.join(currentPath, entry.name),
          size: entry.size,
          mtime: entry.mtime
        }) : [];
        tbody.innerHTML = items.map(item => `
          <tr class="fm-row" data-path="${escapeHtml(item.path)}">
            <td style="padding:8px;">${item.isDir ? '📁 ' : ''}${escapeHtml(item.name)}</td>
            <td style="text-align:right;padding:8px;">${item.size != null ? formatSize(item.size) : '--'}</td>
            <td style="padding:8px;">${item.mtime != null ? formatDate(item.mtime) : '--'}</td>
          </tr>
        `).join('') || '<tr><td colspan="3" style="padding:12px;color:var(--text-dim);">' + escapeHtml(tr('folderEmpty', 'Empty')) + '</td></tr>';
        tbody.querySelectorAll('.fm-row').forEach((row, index) => {
          const item = items[index];
          row.addEventListener('click', (event) => {
            if (event && event.target && event.target.closest && event.target.closest('.fm-rename-input')) return;
            setSelection(row, item);
          });
          row.addEventListener('dblclick', (event) => {
            if (event && event.target && event.target.closest && event.target.closest('.fm-rename-input')) return;
            if (item.isDir) {
              pushHistory(item.path);
            } else {
              openFile(item.path, item.name);
            }
          });
        });
        setRenameBlurSuppressed(false);
      });
    }

    backBtn.addEventListener('click', () => {
      if (historyIndex > 0) {
        historyIndex--;
        currentPath = history[historyIndex];
        render();
      } else if (!isRootPath(currentPath)) {
        historyIndex = 0;
        history.splice(0, history.length, ROOT);
        currentPath = ROOT;
        render();
      }
    });
    forwardBtn.addEventListener('click', () => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        currentPath = history[historyIndex];
        render();
      }
    });
    goBtn.addEventListener('click', () => {
      submitPathInput(pathInput && pathInput.value);
    });
    pathInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        submitPathInput(pathInput && pathInput.value);
      }
    });
    if (sortFieldSelect) {
      sortFieldSelect.addEventListener('change', () => {
        sortField = sortFieldSelect.value || 'name';
        render();
      });
    }
    if (sortDirectionBtn) {
      sortDirectionBtn.addEventListener('click', () => {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        render();
      });
    }
    newFolderBtn.addEventListener('click', () => {
      if (isRootPath(currentPath)) return;
      const full = path.join(currentPath, `New Folder-${Date.now()}`);
      electron.ipcRenderer.invoke('os:mkdir', full).then(r => {
        if (r && r.error) alert(r.error);
        render();
      });
    });
    newFileBtn.addEventListener('click', () => {
      if (isRootPath(currentPath)) return;
      const full = path.join(currentPath, `New File-${Date.now()}.txt`);
      electron.ipcRenderer.invoke('os:writeFile', full, '').then(r => {
        if (r && r.error) alert(r.error);
        render();
      });
    });
    if (renameBtn) renameBtn.addEventListener('click', renameSelected);
    if (copyBtn) copyBtn.addEventListener('click', () => markClipboard(false));
    if (cutBtn) cutBtn.addEventListener('click', () => markClipboard(true));
    if (pasteBtn) pasteBtn.addEventListener('click', pasteClipboard);
    deleteBtn.addEventListener('click', () => {
      if (!canEditSelection()) {
        alert(tr('chooseItem', 'Please select an item first.'));
        return;
      }
      if (!confirm(t('delete') + '?')) return;
      electron.ipcRenderer.invoke('os:trashItem', selectedItem.path).then(r => {
        if (r && r.error) alert(r.error);
        else render();
      });
    });
    recycleBtn.addEventListener('click', () => {
      electron.ipcRenderer.invoke('os:openRecycleBin').then(() => {});
    });
    container.addEventListener('keydown', e => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete' && canEditSelection()) {
        e.preventDefault();
        deleteBtn.click();
      } else if (e.key === 'F2' && canEditSelection()) {
        e.preventDefault();
        renameSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
        e.preventDefault();
        markClipboard(false);
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyX') {
        e.preventDefault();
        markClipboard(true);
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        e.preventDefault();
        pasteClipboard();
      }
    });
    // 资源管理器专用右键菜单（剪切 / 复制 / 粘贴 / 全选）
    const fmCtxMenu = document.getElementById('filemanager-context-menu');
    const fmCtxCut = document.getElementById('fm-ctx-cut');
    const fmCtxCopy = document.getElementById('fm-ctx-copy');
    const fmCtxPaste = document.getElementById('fm-ctx-paste');
    const fmCtxSelectAll = document.getElementById('fm-ctx-select-all');

    function hideFmMenu() {
      if (fmCtxMenu) fmCtxMenu.classList.add('hidden');
    }
    function showFmMenu(x, y) {
      if (!fmCtxMenu) return;
      fmCtxMenu.style.left = x + 'px';
      fmCtxMenu.style.top = y + 'px';
      fmCtxMenu.classList.remove('hidden');
      if (fmCtxCut) fmCtxCut.disabled = !canEditSelection();
      if (fmCtxCopy) fmCtxCopy.disabled = !canEditSelection();
      if (fmCtxPaste) fmCtxPaste.disabled = !window.__starFileClipboard || isRootPath(currentPath);
    }

    if (tbody && fmCtxMenu) {
      tbody.addEventListener('contextmenu', (e) => {
        if (e.target && e.target.closest && e.target.closest('.fm-rename-input')) return;
        e.preventDefault();
        e.stopPropagation();
        const row = e.target && e.target.closest && e.target.closest('.fm-row');
        if (row) {
          const p = row.getAttribute('data-path');
          const allRows = Array.from(tbody.querySelectorAll('.fm-row'));
          const idx = allRows.indexOf(row);
          const item = idx >= 0 ? {
            name: row.textContent.trim(),
            path: p
          } : null;
          if (item) setSelection(row, item);
        } else {
          selectedItem = null;
          selectedPath = null;
          tbody.querySelectorAll('.fm-row').forEach(r => r.classList.remove('fm-selected'));
          updateActions();
        }
        showFmMenu(e.clientX, e.clientY);
      });
      document.addEventListener('click', hideFmMenu);
    }

    if (fmCtxCut) fmCtxCut.addEventListener('click', () => { hideFmMenu(); markClipboard(true); });
    if (fmCtxCopy) fmCtxCopy.addEventListener('click', () => { hideFmMenu(); markClipboard(false); });
    if (fmCtxPaste) fmCtxPaste.addEventListener('click', () => { hideFmMenu(); pasteClipboard(); });
    if (fmCtxSelectAll) fmCtxSelectAll.addEventListener('click', () => {
      hideFmMenu();
      if (!tbody) return;
      tbody.querySelectorAll('.fm-row').forEach(r => r.classList.add('fm-selected'));
    });

    render();
  },

  */
  // Active consolidated file manager implementation.
  'file-manager'(container) {
    if (!container) return;
    try {
    const pathInput = container.querySelector('#fm-path');
    const tbody = container.querySelector('#fm-tbody');
    const backBtn = container.querySelector('#fm-back');
    const forwardBtn = container.querySelector('#fm-forward');
    const goBtn = container.querySelector('#fm-go');
    const newFolderBtn = container.querySelector('#fm-newfolder');
    const newFileBtn = container.querySelector('#fm-newfile');
    const renameBtn = container.querySelector('#fm-rename');
    const copyBtn = container.querySelector('#fm-copy');
    const cutBtn = container.querySelector('#fm-cut');
    const pasteBtn = container.querySelector('#fm-paste');
    const deleteBtn = container.querySelector('#fm-delete');
    const recycleBtn = container.querySelector('#fm-recyclebin');
    const sortLabelEl = container.querySelector('#fm-sort-label');
    const sortFieldSelect = container.querySelector('#fm-sort-field');
    const sortDirectionBtn = container.querySelector('#fm-sort-direction');
    const headNameEl = container.querySelector('#fm-head-name');
    const headSizeEl = container.querySelector('#fm-head-size');
    const headDateEl = container.querySelector('#fm-head-date');
    const electron = require('electron');
    const path = require('path');
    const fs = require('fs');
    const ROOT = '__star_drives__';
    let currentPath = ROOT;
    const history = [ROOT];
    let historyIndex = 0;
    let selectedItem = null;
    let selectedPath = null;
    let renamingPath = null;
    let renameDraft = '';
    let renameBusy = false;
    let sortField = 'name';
    let sortDirection = 'asc';
    let renderToken = 0;
    let loadingTimer = null;
    let hardLoadingTimer = null;
    const safeEscapeHtml = typeof escapeHtml === 'function'
      ? escapeHtml
      : (value => String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;'));
    window.__starFileClipboard = window.__starFileClipboard || null;

    function tr(key, fallback) {
      try {
        const value = typeof t === 'function' ? t(key) : key;
        return value === key ? fallback : value;
      } catch (_) {
        return fallback;
      }
    }
    function trWithParams(key, fallback, params) {
      try {
        if (typeof t === 'function') {
          return t(key, fallback, params);
        }
      } catch (_) {}
      let text = String(fallback || '');
      Object.keys(params || {}).forEach(paramKey => {
        const token = '{' + paramKey + '}';
        text = text.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), params[paramKey]);
      });
      return text;
    }
    function showDialogAlert(title, message) {
      if (window.StarDialog && typeof window.StarDialog.alert === 'function') {
        window.StarDialog.alert({
          title,
          message,
          okText: tr('ok', 'OK')
        });
        return;
      }
      alert((title ? title + '\n\n' : '') + message);
    }
    function updateStaticLabels() {
      if (backBtn) backBtn.textContent = tr('back', 'Back');
      if (forwardBtn) forwardBtn.textContent = tr('forward', 'Forward');
      if (goBtn) goBtn.textContent = tr('refresh', 'Refresh');
      if (pathInput) pathInput.placeholder = tr('addressBar', 'Address');
      if (newFolderBtn) newFolderBtn.textContent = tr('newFolder', 'New folder');
      if (newFileBtn) newFileBtn.textContent = tr('newFile', 'New file');
      if (renameBtn) renameBtn.textContent = tr('rename', 'Rename');
      if (copyBtn) copyBtn.textContent = tr('copy', 'Copy');
      if (cutBtn) cutBtn.textContent = tr('cut', 'Cut');
      if (pasteBtn) pasteBtn.textContent = tr('paste', 'Paste');
      if (deleteBtn) deleteBtn.textContent = tr('delete', 'Delete');
      if (recycleBtn) recycleBtn.textContent = tr('recycleBin', 'Recycle Bin');
      if (sortLabelEl) sortLabelEl.textContent = tr('sortLabel', 'Sort');
      if (sortFieldSelect) {
        const optionMap = {
          name: tr('sortByName', 'Name'),
          type: tr('sortByType', 'Type'),
          size: tr('sortBySize', 'Size'),
          date: tr('sortByDate', 'Date')
        };
        Array.from(sortFieldSelect.options).forEach(option => {
          option.textContent = optionMap[option.value] || option.textContent;
        });
      }
      if (headNameEl) headNameEl.textContent = tr('name', 'Name');
      if (headSizeEl) headSizeEl.textContent = tr('size', 'Size');
      if (headDateEl) headDateEl.textContent = tr('date', 'Date');
      updateSortDirectionButton();
    }
    function getSortDirectionLabel() {
      return sortDirection === 'desc'
        ? tr('sortDescending', 'Descending')
        : tr('sortAscending', 'Ascending');
    }
    function getSortDirectionSvg() {
      if (sortDirection === 'desc') {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"></path><path d="M7 14l5 5 5-5"></path></svg>';
      }
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"></path><path d="M7 10l5-5 5 5"></path></svg>';
    }
    function updateSortDirectionButton() {
      if (!sortDirectionBtn) return;
      const label = getSortDirectionLabel();
      sortDirectionBtn.dataset.direction = sortDirection;
      sortDirectionBtn.title = label;
      try { sortDirectionBtn.setAttribute('aria-label', label); } catch (_) {}
      // Icon-only button; keep text out of layout to avoid the "正序" awkward pill.
      sortDirectionBtn.innerHTML = getSortDirectionSvg();
    }
    function formatSize(n) {
      if (n === undefined || n === null || Number.isNaN(Number(n))) return '--';
      const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
      let value = Math.max(0, Number(n));
      let unitIndex = 0;
      while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
      }
      if (unitIndex === 0) return Math.round(value) + ' B';
      const digits = value >= 100 ? 0 : (value >= 10 ? 1 : 2);
      return value.toFixed(digits) + ' ' + units[unitIndex];
    }
    function formatDate(ms) {
      if (ms === undefined || ms === null || !Number.isFinite(Number(ms))) return '--';
      const d = new Date(Number(ms));
      if (Number.isNaN(d.getTime())) return '--';
      const pad = v => String(v).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    function getExtension(name) {
      const ext = path.extname(name || '').toLowerCase();
      return ext || '';
    }
    function getFileKind(item) {
      if (!item) return 'file';
      if (item.isDir) return 'folder';
      const ext = getExtension(item.name);
      if (['.mp3', '.ogg', '.wav', '.flac', '.aac', '.m4a', '.wma'].includes(ext)) return 'audio';
      if (['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm', '.m4v'].includes(ext)) return 'video';
      if (['.exe', '.msi', '.bat', '.cmd', '.com'].includes(ext)) return 'executable';
      if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico'].includes(ext)) return 'image';
      if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) return 'archive';
      if (['.txt', '.md', '.json', '.js', '.ts', '.html', '.css', '.java', '.py', '.c', '.cpp', '.cs'].includes(ext)) return 'text';
      return 'file';
    }
    function getTypeLabel(item) {
      const kind = getFileKind(item);
      const labels = {
        folder: tr('folderType', 'Folder'),
        audio: tr('audioType', 'Audio'),
        video: tr('videoType', 'Video'),
        executable: tr('executableType', 'Application'),
        image: tr('imageType', 'Image'),
        archive: tr('archiveType', 'Archive'),
        text: tr('textType', 'Document'),
        file: tr('fileType', 'File')
      };
      return labels[kind] || labels.file;
    }
    function getFileIconSvg(item) {
      const kind = getFileKind(item);
      const icons = {
        folder: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
        audio: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>',
        video: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h11a2 2 0 0 1 2 2v2.5l4-2.5v10l-4-2.5V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm5 3v8l6-4-6-4z"/></svg>',
        executable: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h10l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm8 1.5V8h3.5L13 4.5z"/><path d="M8 11h2v2H8zm0 4h2v2H8zm4-4h4v2h-4zm0 4h4v2h-4z"/></svg>',
        image: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 14H5l3.5-4.5 2.5 3.01L14.5 11l4.5 6zM8.5 9A1.5 1.5 0 1 0 8.5 6a1.5 1.5 0 0 0 0 3z"/></svg>',
        archive: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 5.23 19.15 3.3A2 2 0 0 0 17.53 2H6.47a2 2 0 0 0-1.62 1.3L3.46 5.23A2 2 0 0 0 3 6.46V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.46a2 2 0 0 0-.46-1.23zM12 18l-3-3h2v-3h2v3h2l-3 3zm5-11H7V4h10v3z"/></svg>',
        text: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1 7V3.5L18.5 9H15z"/><path d="M8 12h8v1.5H8zm0 3h8v1.5H8z"/></svg>',
        file: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 7V3.5L19.5 9H14z"/></svg>'
      };
      return icons[kind] || icons.file;
	    }
	    function buildStarFileUrl(filePath) {
	      const raw = String(filePath || '').trim();
	      if (!raw) return 'star-file:///';
	      const normalized = raw.replace(/\\/g, '/');
	      if (/^\/\/[^/]/.test(normalized)) return 'star-file:' + encodeURI(normalized);
	      if (/^[A-Za-z]:\//.test(normalized)) return 'star-file:///' + encodeURI(normalized);
	      return 'star-file:///' + encodeURI(normalized.replace(/^\/+/, ''));
	    }
	    function toFilePreviewUrl(filePath) {
	      return buildStarFileUrl(String(filePath || ''));
	    }
    function buildPreviewVisual(item) {
      const kind = getFileKind(item);
      const icon = `<span class="fm-file-icon" data-kind="${kind}" aria-hidden="true">${getFileIconSvg(item)}</span>`;
      if (!item || item.isDir) return icon;
      if (kind === 'executable' && item.path) {
        return `
          <span class="fm-file-thumb fm-file-thumb--shell" data-kind="executable" aria-hidden="true">
            <img
              class="fm-file-thumb-image fm-file-thumb-image--shell"
              data-shell-icon-path="${safeEscapeHtml(item.path)}"
              alt=""
            >
            <span class="fm-file-thumb-fallback-icon" aria-hidden="true">${getFileIconSvg(item)}</span>
          </span>
        `;
      }
      if (kind === 'image') {
        return `
          <span class="fm-file-thumb" data-kind="image" aria-hidden="true">
            <img class="fm-file-thumb-image" src="${safeEscapeHtml(toFilePreviewUrl(item.path))}" loading="lazy" decoding="async" alt="">
            <span class="fm-file-thumb-fallback-icon" aria-hidden="true">${getFileIconSvg(item)}</span>
          </span>
        `;
      }
      if (kind === 'video') {
        return `
          <span class="fm-file-thumb fm-file-thumb--video" data-kind="video" aria-hidden="true">
            <video class="fm-file-thumb-video" src="${safeEscapeHtml(toFilePreviewUrl(item.path))}" preload="metadata" muted playsinline></video>
            <span class="fm-file-thumb-play">▶</span>
            <span class="fm-file-thumb-fallback-icon" aria-hidden="true">${getFileIconSvg(item)}</span>
          </span>
        `;
      }
      return icon;
    }
    function sortItems(items) {
      const factor = sortDirection === 'desc' ? -1 : 1;
      return items.slice().sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        let result = 0;
        if (sortField === 'size') {
          result = (a.size || 0) - (b.size || 0);
        } else if (sortField === 'date') {
          result = (a.mtime || 0) - (b.mtime || 0);
        } else if (sortField === 'type') {
          result = getTypeLabel(a).localeCompare(getTypeLabel(b), getLocale(), { sensitivity: 'base' });
          if (!result) result = (a.name || '').localeCompare(b.name || '', getLocale(), { sensitivity: 'base' });
        } else {
          result = (a.name || '').localeCompare(b.name || '', getLocale(), { sensitivity: 'base', numeric: true });
        }
        return result * factor;
      });
    }
    function isRootPath(value) {
      return value === ROOT || value === '' || value === tr('thisPC', 'This PC');
    }
    function canEditSelection() {
      return !!selectedItem && !isRootPath(currentPath);
    }
    function updateActions() {
      const hasSelection = canEditSelection();
      const canPaste = !!window.__starFileClipboard && !isRootPath(currentPath);
      if (renameBtn) { renameBtn.disabled = false; renameBtn.dataset.ready = hasSelection ? 'true' : 'false'; }
      if (copyBtn) { copyBtn.disabled = false; copyBtn.dataset.ready = hasSelection ? 'true' : 'false'; }
      if (cutBtn) { cutBtn.disabled = false; cutBtn.dataset.ready = hasSelection ? 'true' : 'false'; }
      if (deleteBtn) { deleteBtn.disabled = false; deleteBtn.dataset.ready = hasSelection ? 'true' : 'false'; }
      if (pasteBtn) { pasteBtn.disabled = false; pasteBtn.dataset.ready = canPaste ? 'true' : 'false'; }
    }
    function setSelection(row, item) {
      if (!tbody) return;
      tbody.querySelectorAll('.fm-row').forEach(r => r.classList.remove('fm-selected'));
      if (row) row.classList.add('fm-selected');
      selectedItem = item || null;
      selectedPath = item ? item.path : null;
      updateActions();
    }
    function clearRenameState() {
      renamingPath = null;
      renameDraft = '';
      renameBusy = false;
      suppressRenameBlur = false;
    }
    function setRenameBlurSuppressed(nextValue) {
      suppressRenameBlur = !!nextValue;
    }
    function pushHistory(next) {
      history.splice(historyIndex + 1);
      history.push(next);
      historyIndex = history.length - 1;
      currentPath = next;
      render();
    }
    function normalizePathInputValue(rawValue) {
      const trimmed = String(rawValue || '').trim();
      const unquoted = trimmed.replace(/^"(.*)"$/, '$1');
      if (!unquoted || isRootPath(unquoted)) return ROOT;
      if (/^[a-zA-Z]:$/.test(unquoted)) return unquoted + '\\';
      return unquoted;
    }
    const initialFileManagerPath = (typeof window !== 'undefined' && window.__starFileManagerInitialPath)
      ? normalizePathInputValue(window.__starFileManagerInitialPath)
      : '';
    if (typeof window !== 'undefined') window.__starFileManagerInitialPath = null;
    if (initialFileManagerPath && !isRootPath(initialFileManagerPath)) {
      currentPath = initialFileManagerPath;
      history[0] = initialFileManagerPath;
    }
    function looksLikeBrowserAddressInput(rawValue) {
      const text = String(rawValue || '').trim().replace(/^"(.*)"$/, '$1');
      if (!text) return false;
      if (/^[a-zA-Z]:$/.test(text) || /^[a-zA-Z]:[\\/]/.test(text) || /^\\\\[^\\]/.test(text)) return false;
      return /^(?:https?|file|ftp):\/\//i.test(text)
        || /^star-file:\/\//i.test(text)
        || /^about:/i.test(text)
        || /^www\.[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[:/][^\s]*)?$/i.test(text)
        || /^localhost(?::\d+)?(?:[/?#].*)?$/i.test(text)
        || /^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:[/?#].*)?$/i.test(text)
        || /^(?:[a-z0-9-]+\.)+[a-z0-9-]+(?::\d+)?(?:[/?#].*)$/i.test(text);
    }
    function focusAndSelectPathInput() {
      if (!pathInput) return;
      setTimeout(() => {
        if (!pathInput.isConnected) return;
        pathInput.focus();
        pathInput.select();
      }, 0);
    }

    function withTimeout(promise, ms, message) {
      const timeoutMs = Math.max(50, Number(ms) || 0);
      let timer = null;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message || 'Timeout')), timeoutMs);
      });
      return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
        if (timer) clearTimeout(timer);
      });
    }

    async function listDrivesLocal() {
      try {
        const drives = [];
        if (process.platform === 'win32') {
          const candidates = new Set();
          const addRoot = (value) => {
            const text = String(value || '').trim();
            if (!text) return;
            const m = text.match(/^([a-zA-Z]):/);
            if (!m) return;
            candidates.add(m[1].toUpperCase() + ':\\');
          };
          addRoot(process.cwd && process.cwd());
          addRoot(process.env.SystemDrive);
          addRoot(process.env.HOMEDRIVE);
          addRoot(process.env.USERPROFILE);
          // Do not inject guessed drive letters (like E:) to avoid fake flash.
          // Only probe roots discovered from current environment.
          const checks = Array.from(candidates).map(async root => {
            try {
              await withTimeout(fs.promises.stat(root), 220);
              return root;
            } catch (_) {
              return null;
            }
          });
          const resolved = await Promise.all(checks);
          resolved.forEach(root => { if (root) drives.push(root); });
          if (!drives.length) drives.push('C:\\');
        } else {
          drives.push(process.env.HOME || '/');
        }

        const entries = await Promise.all(drives.map(async (root) => {
          let mtime = undefined;
          try {
            const s = await withTimeout(fs.promises.stat(root), 250);
            mtime = s ? s.mtimeMs : undefined;
          } catch (_) {}
          let size = undefined;
          try {
            if (fs.promises && typeof fs.promises.statfs === 'function') {
              const info = await withTimeout(fs.promises.statfs(root), 350);
              if (info) {
                const blocks = typeof info.blocks === 'bigint' ? Number(info.blocks) : Number(info.blocks);
                const bsize = typeof info.bsize === 'bigint' ? Number(info.bsize) : Number(info.bsize);
                if (Number.isFinite(blocks) && Number.isFinite(bsize)) size = blocks * bsize;
              }
            }
          } catch (_) {}
          return { path: root, name: root, size, mtime };
        }));

        return entries;
      } catch (error) {
        return { error: error && error.message ? error.message : String(error) };
      }
    }
    function listDrivesQuickFallback() {
      const roots = new Set();
      const addRoot = (value) => {
        const text = String(value || '').trim();
        const m = text.match(/^([a-zA-Z]):/);
        if (!m) return;
        roots.add(m[1].toUpperCase() + ':\\');
      };
      try { addRoot(process.cwd && process.cwd()); } catch (_) {}
      try { addRoot(process.env.SystemDrive); } catch (_) {}
      try { addRoot(process.env.HOMEDRIVE); } catch (_) {}
      try { addRoot(process.env.USERPROFILE); } catch (_) {}
      // Keep quick fallback minimal; avoid hardcoded guessed drives.
      if (!roots.size) roots.add('C:\\');
      return Array.from(roots).map(root => ({ path: root, name: root, size: undefined, mtime: undefined }));
    }

    async function readdirLocal(dir) {
      try {
        const base = dir || process.env.USERPROFILE || process.env.HOME || '/';
        const entries = await fs.promises.readdir(base, { withFileTypes: true });
        const result = await Promise.all(entries.map(async (d) => {
          const name = d.name;
          const fullPath = path.join(base, name);
          const stat = await withTimeout(fs.promises.stat(fullPath), 400).catch(() => null);
          const isDir = !!((stat && typeof stat.isDirectory === 'function' && stat.isDirectory()) || d.isDirectory());
          const isProtected = !!isDir && isStarProtectedSystemDirName(name);
          const isDotHidden = !!name && name.startsWith('.') && name !== '.' && name !== '..';
          const isHidden = process.platform === 'win32'
            ? isProtected
            : (isDotHidden || isProtected);
          let size = undefined;
          let mtime = undefined;
          if (stat) {
            mtime = stat.mtimeMs;
            if (!isDir) size = stat.size;
          }
          return {
            name,
            isDir,
            size,
            mtime,
            isHidden,
            isSystem: isProtected,
            isProtected,
          };
        }));
        return result;
      } catch (error) {
        return { error: error && error.message ? error.message : String(error) };
      }
    }
    function isProtectedSystemItem(item) {
      if (!item || !item.isDir) return false;
      return !!item.isProtected || isStarProtectedSystemDirName(item.name || path.basename(item.path || ''));
    }
    function shouldShowHiddenSystemItems() {
      return readStarFileManagerShowHiddenSetting();
    }
    function getRenderedVisiblePathSet() {
      if (!tbody) return null;
      const rows = Array.from(tbody.querySelectorAll('.fm-row[data-path]'));
      if (!rows.length) return null;
      const visiblePaths = new Set();
      rows.forEach(row => {
        const rowPath = row.getAttribute('data-path');
        if (rowPath) visiblePaths.add(rowPath);
      });
      return visiblePaths;
    }
    function filterVisibleItems(items) {
      if (shouldShowHiddenSystemItems()) return items.slice();
      if (renamingPath) {
        const visiblePaths = getRenderedVisiblePathSet();
        if (visiblePaths && visiblePaths.size) {
          return items.filter(item => item && (visiblePaths.has(item.path) || item.path === renamingPath));
        }
      }
      return items.filter(item => {
        if (!item) return false;
        if (renamingPath && item.path === renamingPath) return true;
        return !item.isHidden && !item.isSystem;
      });
    }
    function showProtectedSystemFolderBlocked(targetPath) {
      const title = tr('protectedSystemFolderTitle', 'Protected system folder');
      const message = trWithParams(
        'protectedSystemFolderMessage',
        'This folder is managed by the operating system and cannot be opened here.\n\nPath: {path}',
        { path: String(targetPath || '').trim() || tr('fmThisLocation', 'this location') }
      );
      showDialogAlert(title, message);
      focusAndSelectPathInput();
    }
    function showUrlNotSupportedError(rawValue) {
      const title = tr('fmErrorUrlNotSupportedTitle', 'Unsupported address');
      const message = trWithParams(
        'fmErrorUrlNotSupported',
        'The File Manager address bar only supports local file paths. Open web addresses in the built-in browser instead.\n\nEntered address: {path}',
        { path: String(rawValue || '').trim() || tr('fmThisLocation', 'this location') }
      );
      showDialogAlert(title, message);
      focusAndSelectPathInput();
    }
    function showPathOpenError(rawError, targetPath) {
      const message = formatFsError(rawError, targetPath, 'open');
      alert(message);
      focusAndSelectPathInput();
    }
    async function submitPathInput(rawValue) {
      const targetPath = normalizePathInputValue(rawValue);
      if (targetPath === ROOT) {
        if (currentPath === ROOT) render();
        else pushHistory(ROOT);
        return;
      }
      if (looksLikeBrowserAddressInput(targetPath)) {
        showUrlNotSupportedError(rawValue);
        return;
      }
      try {
        const stat = await electron.ipcRenderer.invoke('os:stat', targetPath);
        if (stat && stat.error) {
          showPathOpenError(stat.error, targetPath);
          return;
        }
        if (stat && stat.isDir) {
          if (currentPath === targetPath) render();
          else pushHistory(targetPath);
          return;
        }
        openFile(targetPath, path.basename(targetPath));
      } catch (error) {
        showPathOpenError(error, targetPath);
      }
    }
    function openFile(filePath, name) {
      if (window.StarAppsRegistry && window.StarAppsRegistry.recordFileOpen) {
        window.StarAppsRegistry.recordFileOpen(filePath);
      }
      const lower = (name || path.basename(filePath) || '').toLowerCase();
      const ext = path.extname(lower).toLowerCase();
      const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'];
      const videoExts = ['.mp4', '.avi', '.wmv', '.mkv', '.mov', '.webm', '.m4v'];
      const officeExts = ['.doc', '.docx', '.ppt', '.pptx', '.pdf', '.xls', '.xlsx'];
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.ico'];
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
      const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'];
      if (archiveExts.some(e => lower.endsWith(e)) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
        window.StarAppsRegistry.openWithFile('star-unzip', filePath);
        return;
      }
      const htmlExts = ['.html', '.htm'];
      const scriptExts = ['.bat', '.cmd', '.ps1', '.sh'];
      const textExts = ['.txt', '.log', '.xml', '.json', '.yml', '.yaml', '.ini', '.cfg', '.conf', '.csv', '.tsv', '.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.less', '.java', '.py', '.c', '.cpp', '.cs', '.go', '.rs', '.php', '.sql'];
      if ((ext === '.md' || ext === '.markdown') && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
        window.StarAppsRegistry.openWithFile('markdown-reader', filePath);
        return;
      }
	      if (htmlExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
	        window.StarAppsRegistry.openWithFile('browser', filePath, { url: buildStarFileUrl(filePath) });
	        return;
	      }
      if (scriptExts.includes(ext) && window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
        const isWin = process.platform === 'win32';
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
      if (textExts.includes(ext)) {
        try {
          if (window.StarAppsRegistry && window.StarAppsRegistry.recordAppLaunch) {
            window.StarAppsRegistry.recordAppLaunch('text-editor');
          }
          const app = window.StarAppsRegistry && window.StarAppsRegistry.getApp ? window.StarAppsRegistry.getApp('text-editor') : null;
          window.__starNotepadInitialPath = filePath;
          StarWindowManager.create({
            appId: 'text-editor',
            title: typeof t === 'function' ? t('textEditor') : 'Text Editor',
            icon: app && app.icon ? app.icon : '',
            width: 700,
            height: 500,
            content: StarAppsRegistry.getTextEditorContent(),
            contentEl: true,
          });
          if (window.updateTaskbarApps) window.updateTaskbarApps();
          return;
        } catch (_) {}
      }
      const externalOnlyExts = ['.exe', '.msi', '.lnk', '.dll', '.com'];
      if (externalOnlyExts.includes(ext)) {
        electron.ipcRenderer.invoke('os:launch', filePath);
        return;
      }
      // 未知扩展名或无后缀：强制走记事本（当作纯文本）
      try {
        if (window.StarAppsRegistry && window.StarAppsRegistry.recordAppLaunch) {
          window.StarAppsRegistry.recordAppLaunch('text-editor');
        }
        const app = window.StarAppsRegistry && window.StarAppsRegistry.getApp ? window.StarAppsRegistry.getApp('text-editor') : null;
        window.__starNotepadInitialPath = filePath;
        StarWindowManager.create({
          appId: 'text-editor',
          title: typeof t === 'function' ? t('textEditor') : 'Text Editor',
          icon: app && app.icon ? app.icon : '',
          width: 700,
          height: 500,
          content: StarAppsRegistry.getTextEditorContent(),
          contentEl: true,
        });
        if (window.updateTaskbarApps) window.updateTaskbarApps();
      } catch (_) {
        electron.ipcRenderer.invoke('os:launch', filePath);
      }
    }
    function startRenameSelected() {
      if (!canEditSelection()) {
        alert(tr('chooseItem', 'Please select an item first.'));
        return;
      }
      renamingPath = selectedItem.path;
      renameDraft = selectedItem.name;
      render();
    }
    async function commitRename(item, nextName) {
      if (!item || renameBusy) return;
      const trimmedName = (nextName || '').trim();
      if (!trimmedName || trimmedName === item.name) {
        clearRenameState();
        render();
        return;
      }
      if (/[\\\\/:*?\"<>|]/.test(trimmedName)) {
        alert(tr('invalidName', 'Invalid name.'));
        return;
      }
      renameBusy = true;
      renameDraft = trimmedName;
      const nextPath = path.join(path.dirname(item.path), trimmedName);
      const result = await electron.ipcRenderer.invoke('os:renamePath', item.path, nextPath);
      renameBusy = false;
      if (result && result.error) {
        alert(formatFsError(result.error, nextPath, 'operate'));
        return;
      }
      selectedPath = (result && result.path) || nextPath;
      clearRenameState();
      render();
    }
    function cancelRename() {
      if (!renamingPath) return;
      clearRenameState();
      render();
    }
    function clearLoadingFeedback() {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
        loadingTimer = null;
      }
      if (hardLoadingTimer) {
        clearTimeout(hardLoadingTimer);
        hardLoadingTimer = null;
      }
      if (tbody) {
        tbody.style.opacity = '';
        tbody.style.pointerEvents = '';
      }
    }
    function markClipboard(cutMode) {
      if (!canEditSelection()) {
        alert(tr('chooseItem', 'Please select an item first.'));
        return;
      }
      window.__starFileClipboard = {
        path: selectedItem.path,
        name: selectedItem.name,
        cut: !!cutMode
      };
      updateActions();
    }
    async function pasteClipboard() {
      if (!window.__starFileClipboard) {
        alert(tr('clipboardEmpty', 'Clipboard is empty.'));
        return;
      }
      if (isRootPath(currentPath)) return;
      const method = window.__starFileClipboard.cut ? 'os:moveItem' : 'os:copyItem';
      const result = await electron.ipcRenderer.invoke(method, window.__starFileClipboard.path, currentPath);
      if (result && result.error) {
        alert(formatFsError(result.error, currentPath, 'operate'));
        return;
      }
      if (window.__starFileClipboard.cut) window.__starFileClipboard = null;
      render();
    }
    function buildNameCell(item) {
      const iconHtml = buildPreviewVisual(item);
      if (renamingPath !== item.path) {
        return `<div class="fm-file-name-cell">${iconHtml}<span class="fm-file-label">${safeEscapeHtml(item.name)}</span></div>`;
      }
      return `
        <div class="fm-file-name-cell">
          ${iconHtml}
          <input
            type="text"
            class="fm-rename-input"
            style="flex:1;min-width:0;padding:6px 8px;background:var(--window-titlebar);border:1px solid var(--accent);border-radius:6px;color:var(--text);outline:none;"
          >
        </div>
      `;
    }
    function hydratePreviews() {
      if (!tbody) return;
      tbody.querySelectorAll('.fm-file-thumb-image').forEach(img => {
        if (img.dataset.bound === 'true') return;
        img.dataset.bound = 'true';
        if (img.dataset.shellIconPath) {
          requestStarShellIconThumb(img.dataset.shellIconPath, 'large').then((dataUrl) => {
            if (!img.isConnected) return;
            const host = img.closest('.fm-file-thumb');
            if (!host) return;
            if (dataUrl) {
              img.src = dataUrl;
              host.classList.remove('is-fallback');
            } else {
              host.classList.add('is-fallback');
            }
          });
        }
        img.addEventListener('error', () => {
          const host = img.closest('.fm-file-thumb');
          if (!host) return;
          host.classList.add('is-fallback');
        });
      });
      tbody.querySelectorAll('.fm-file-thumb-video').forEach(video => {
        if (video.dataset.bound === 'true') return;
        video.dataset.bound = 'true';
        video.addEventListener('loadeddata', () => {
          try {
            if (video.readyState >= 2 && video.currentTime < 0.05 && Number.isFinite(video.duration) && video.duration > 0.12) {
              video.currentTime = Math.min(0.1, Math.max(0, video.duration / 20));
            }
          } catch (_) {}
        });
        video.addEventListener('error', () => {
          const host = video.closest('.fm-file-thumb');
          if (!host) return;
          host.classList.add('is-fallback');
        });
      });
    }
    function bindRenameInput(item) {
      const input = tbody && tbody.querySelector('.fm-rename-input');
      if (!input || input.dataset.bound === 'true') return;
      input.dataset.bound = 'true';
      input.value = renameDraft || item.name || '';
      const finishPointerSelection = () => {
        if (input.dataset.dragSelecting !== 'true') return;
        input.dataset.dragSelecting = 'false';
        if (renameBusy || renamingPath !== item.path || !document.body.contains(input) || document.activeElement === input) return;
        setTimeout(() => {
          if (renameBusy || renamingPath !== item.path || !document.body.contains(input) || document.activeElement === input) return;
          try {
            input.focus({ preventScroll: true });
          } catch (_) {
            input.focus();
          }
        }, 0);
      };
      setTimeout(() => {
        if (!document.body.contains(input)) return;
        input.focus();
        input.select();
      }, 0);
      input.addEventListener('pointerdown', e => e.stopPropagation());
      input.addEventListener('mouseup', e => e.stopPropagation());
      input.addEventListener('selectstart', e => e.stopPropagation());
      input.addEventListener('click', e => e.stopPropagation());
      input.addEventListener('mousedown', e => {
        e.stopPropagation();
        input.dataset.dragSelecting = 'true';
        window.addEventListener('mouseup', finishPointerSelection, { capture: true, once: true });
      });
      input.addEventListener('dblclick', e => e.stopPropagation());
      input.addEventListener('contextmenu', e => e.stopPropagation());
      input.addEventListener('input', () => {
        renameDraft = input.value;
      });
      input.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          commitRename(item, input.value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelRename();
        }
      });
      input.addEventListener('blur', () => {
        if (renameBusy || suppressRenameBlur || renamingPath !== item.path || input.dataset.dragSelecting === 'true') return;
        commitRename(item, input.value);
      });
    }
    function shouldFreezeRenameRender() {
      if (!renamingPath || !tbody) return false;
      return !!tbody.querySelector('.fm-rename-input');
    }
    function render() {
      if (!pathInput || !tbody) return;
      try {
        const requestToken = ++renderToken;
        const showRoot = isRootPath(currentPath);
        const hasExistingRows = !!tbody.querySelector('.fm-row');
        pathInput.value = showRoot ? tr('thisPC', 'This PC') : currentPath;
        if (sortFieldSelect) sortFieldSelect.value = sortField;
        updateSortDirectionButton();
        selectedItem = null;
        if (showRoot) clearRenameState();
        setRenameBlurSuppressed(true);
        updateActions();
        clearLoadingFeedback();
        if (!hasExistingRows) {
          tbody.innerHTML = '<tr><td colspan="3" style="padding:12px;color:var(--text-dim);">' + safeEscapeHtml(tr('loading', 'Loading...')) + '</td></tr>';
        } else {
          loadingTimer = setTimeout(() => {
            if (requestToken !== renderToken || !tbody) return;
            tbody.style.opacity = '0.58';
            tbody.style.pointerEvents = 'none';
          }, 160);
        }

        function applyListResult(result) {
          if (requestToken !== renderToken || !tbody) return;
          if (shouldFreezeRenameRender()) {
            clearLoadingFeedback();
            setRenameBlurSuppressed(false);
            return;
          }
          clearLoadingFeedback();
          if (result && result.error) {
            setRenameBlurSuppressed(false);
            tbody.innerHTML = '<tr><td colspan="3" style="padding:12px;color:var(--error, #f55);">' + safeEscapeHtml(formatFsError(result.error, currentPath, 'open')) + '</td></tr>';
            return;
          }
          const itemsRaw = Array.isArray(result) ? result.map(entry => showRoot ? {
            name: entry.name || entry.path,
            isDir: true,
            path: entry.path || entry.name,
            size: entry.size,
            mtime: entry.mtime,
            isHidden: !!entry.isHidden,
            isSystem: !!entry.isSystem,
            isProtected: !!entry.isProtected
          } : {
            name: entry.name,
            isDir: !!entry.isDir,
            path: path.join(currentPath, entry.name),
            size: entry.size,
            mtime: entry.mtime,
            isHidden: !!entry.isHidden,
            isSystem: !!entry.isSystem,
            isProtected: !!entry.isProtected
          }) : [];
          const items = sortItems(filterVisibleItems(itemsRaw));
          if (selectedPath && !items.some(item => item.path === selectedPath)) {
            selectedPath = null;
          }
          tbody.innerHTML = items.map(item => `
            <tr class="fm-row" data-path="${safeEscapeHtml(item.path)}">
              <td class="fm-col-name">${buildNameCell(item)}</td>
              <td class="fm-col-size">${item.size != null ? formatSize(item.size) : '--'}</td>
              <td class="fm-col-date">${item.mtime != null ? formatDate(item.mtime) : '--'}</td>
            </tr>
          `).join('') || '<tr><td colspan="3" style="padding:12px;color:var(--text-dim);">' + safeEscapeHtml(tr('folderEmpty', 'This folder is empty')) + '</td></tr>';
          tbody.querySelectorAll('.fm-row').forEach((row, index) => {
            const item = items[index];
            row.addEventListener('click', (event) => {
              if (event && event.target && event.target.closest && event.target.closest('.fm-rename-input')) return;
              setSelection(row, item);
            });
            row.addEventListener('dblclick', (event) => {
              if (event && event.target && event.target.closest && event.target.closest('.fm-rename-input')) return;
              if (renamingPath === item.path) return;
              if (item.isDir) {
                if (isProtectedSystemItem(item)) {
                  showProtectedSystemFolderBlocked(item.path);
                  return;
                }
                pushHistory(item.path);
              }
              else openFile(item.path, item.name);
            });
            if (selectedPath && item.path === selectedPath) {
              setSelection(row, item);
            }
            if (renamingPath === item.path) {
              setSelection(row, item);
              bindRenameInput(item);
            }
          });
          hydratePreviews();
          setRenameBlurSuppressed(false);
        }

        if (showRoot) {
          applyListResult(listDrivesQuickFallback());
        }

        // Hard fallback: never stay at "Loading..." forever.
        hardLoadingTimer = setTimeout(() => {
          if (requestToken !== renderToken || !tbody) return;
          clearLoadingFeedback();
          tbody.innerHTML = '<tr><td colspan="3" style="padding:12px;color:var(--error, #f55);">' + safeEscapeHtml(tr('loadingTimeout', 'Loading timed out.')) + '</td></tr>';
        }, 2800);

        // 1) Render fast local fs list first (always available with nodeIntegration).
        (showRoot ? listDrivesLocal() : readdirLocal(currentPath))
          .then(applyListResult)
          .catch(err => applyListResult({ error: err && err.message ? err.message : String(err) }));

        // 2) Then try IPC list for authoritative metadata; keep it guarded by a timeout.
        const ipcPromise = showRoot
          ? withTimeout(electron.ipcRenderer.invoke('os:listDrives'), 2500, tr('loadingTimeout', 'Loading timed out.'))
          : withTimeout(electron.ipcRenderer.invoke('os:readdir', currentPath), 3500, tr('loadingTimeout', 'Loading timed out.'));
        ipcPromise.then(applyListResult).catch(() => {});
      } catch (error) {
        clearLoadingFeedback();
        setRenameBlurSuppressed(false);
        tbody.innerHTML = '<tr><td colspan="3" style="padding:12px;color:var(--error, #f55);white-space:pre-wrap;">'
          + safeEscapeHtml((error && error.stack) ? error.stack : String(error))
          + '</td></tr>';
      }
    }

    if (backBtn) backBtn.addEventListener('click', () => {
      if (historyIndex > 0) {
        historyIndex--;
        currentPath = history[historyIndex];
        render();
      } else if (!isRootPath(currentPath)) {
        historyIndex = 0;
        history.splice(0, history.length, ROOT);
        currentPath = ROOT;
        render();
      }
    });
    if (forwardBtn) forwardBtn.addEventListener('click', () => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        currentPath = history[historyIndex];
        render();
      }
    });
    if (goBtn) goBtn.addEventListener('click', () => {
      submitPathInput(pathInput && pathInput.value);
    });
    if (pathInput) pathInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        submitPathInput(pathInput && pathInput.value);
      }
    });
    if (newFolderBtn) newFolderBtn.addEventListener('click', () => {
      if (isRootPath(currentPath)) return;
      const full = path.join(currentPath, `${tr('newFolder', 'New folder')}-${Date.now()}`);
      electron.ipcRenderer.invoke('os:mkdir', full).then(r => {
        if (r && r.error) alert(formatFsError(r.error, full, 'operate'));
        render();
      });
    });
    if (newFileBtn) newFileBtn.addEventListener('click', () => {
      if (isRootPath(currentPath)) return;
      const full = path.join(currentPath, `${tr('newFile', 'New file')}-${Date.now()}.txt`);
      electron.ipcRenderer.invoke('os:writeFile', full, '').then(r => {
        if (r && r.error) alert(formatFsError(r.error, full, 'operate'));
        render();
      });
    });
    if (renameBtn) renameBtn.addEventListener('click', startRenameSelected);
    if (copyBtn) copyBtn.addEventListener('click', () => markClipboard(false));
    if (cutBtn) cutBtn.addEventListener('click', () => markClipboard(true));
    if (pasteBtn) pasteBtn.addEventListener('click', pasteClipboard);
    if (sortFieldSelect) {
      sortFieldSelect.addEventListener('change', () => {
        sortField = sortFieldSelect.value || 'name';
        render();
      });
    }
    if (sortDirectionBtn) {
      sortDirectionBtn.addEventListener('click', () => {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        render();
      });
    }
    if (deleteBtn) deleteBtn.addEventListener('click', async () => {
      if (!canEditSelection()) {
        alert(tr('chooseItem', 'Please select an item first.'));
        return;
      }
      const confirmed = window.StarDialog && typeof window.StarDialog.confirm === 'function'
        ? await window.StarDialog.confirm({
          title: t('delete'),
          message: t('delete') + '?',
          okText: t('delete'),
          cancelText: t('cancel')
        })
        : false;
      if (!confirmed) return;
      const r = await electron.ipcRenderer.invoke('os:trashItem', selectedItem.path);
      if (r && r.error) alert(formatFsError(r.error, selectedItem.path, 'operate'));
      else {
        selectedPath = null;
        render();
      }
    });
    if (recycleBtn) recycleBtn.addEventListener('click', () => {
      electron.ipcRenderer.invoke('os:openRecycleBin').then(() => {});
    });
    container.addEventListener('keydown', e => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete' && canEditSelection()) {
        e.preventDefault();
        deleteBtn.click();
      } else if (e.key === 'F2' && canEditSelection()) {
        e.preventDefault();
        startRenameSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
        e.preventDefault();
        markClipboard(false);
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyX') {
        e.preventDefault();
        markClipboard(true);
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        e.preventDefault();
        pasteClipboard();
      }
    });
    window.addEventListener('star:file-manager-visibility-change', () => {
      if (!container || !container.isConnected) return;
      render();
    });
    setWindowLocaleRefresh(container, () => {
      updateStaticLabels();
      render();
    });
    updateStaticLabels();
    render();
    } catch (error) {
      try {
        const tbody = container && container.querySelector ? container.querySelector('#fm-tbody') : null;
        const esc = (value) => {
          try { return (typeof escapeHtml === 'function') ? escapeHtml(String(value ?? '')) : String(value ?? ''); } catch (_) { return String(value ?? ''); }
        };
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="3" style="padding:12px;color:var(--error, #f55);white-space:pre-wrap;">'
            + esc((typeof t === 'function' ? t('fileManagerInitFailed', 'File manager failed to start.') : 'File manager failed to start.'))
            + '\n\n'
            + esc(error && error.stack ? error.stack : String(error))
            + '</td></tr>';
        }
      } catch (_) {}
      try { console.error(error); } catch (_) {}
    }
  },

  'music-player'(container) {
    if (!container) return;
    const electron = require('electron');
    const path = require('path');
    const audio = container.querySelector('#mp-audio');
    const playlistEl = container.querySelector('#mp-playlist');
    const progressEl = container.querySelector('#mp-progress');
    const volumeEl = container.querySelector('#mp-volume');
    const playBtn = container.querySelector('#mp-play');
    const prevBtn = container.querySelector('#mp-prev');
    const nextBtn = container.querySelector('#mp-next');
    const nowEl = container.querySelector('#mp-now');
    const timeEl = container.querySelector('#mp-time');
    const shuffleCb = container.querySelector('#mp-shuffle');
    const repeatCb = container.querySelector('#mp-repeat');
    const openBtn = container.querySelector('#mp-open');
    const addBtn = container.querySelector('#mp-add');
    const clearBtn = container.querySelector('#mp-clear');
    const shuffleLabelEl = container.querySelector('#mp-shuffle-label');
    const repeatLabelEl = container.querySelector('#mp-repeat-label');
    let playlist = [];
    let index = -1;
    let shuffle = false;
    let repeat = false;
    function tr(key, fallback) {
      try {
        const value = typeof t === 'function' ? t(key) : key;
        return value === key ? fallback : value;
      } catch (_) {
        return fallback;
      }
    }
    function fileUrl(p) { return toStarFileUrl(p); }
    function updatePlayButtonLabel() {
      if (!playBtn) return;
      const glyph = audio.paused ? '▶' : '❚❚';
      const text = audio.paused ? tr('play', 'Play') : tr('pause', 'Pause');
      playBtn.textContent = `${glyph} ${text}`;
    }
    function updateStaticLabels() {
      if (openBtn) openBtn.textContent = tr('open', 'Open');
      if (addBtn) addBtn.textContent = tr('addToPlaylist', 'Add');
      if (clearBtn) clearBtn.textContent = tr('clearList', 'Clear list');
      if (prevBtn) prevBtn.title = tr('previous', 'Previous');
      if (nextBtn) nextBtn.title = tr('next', 'Next');
      if (shuffleLabelEl) shuffleLabelEl.textContent = tr('shuffle', 'Shuffle');
      if (repeatLabelEl) repeatLabelEl.textContent = tr('repeat', 'Repeat');
      updatePlayButtonLabel();
    }
    function renderList() {
      playlistEl.innerHTML = playlist.map((item, i) =>
        `<div class="mp-item" data-index="${i}" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);${i === index ? 'background:var(--accent);color:#fff;' : ''}">${escapeHtml(path.basename(item))}</div>`
      ).join('') || '<div style="padding:12px;color:var(--text-dim);font-size:12px;">' + (typeof t === 'function' ? t('addToPlaylist', '添加音频文件') : 'Add audio files') + '</div>';
      playlistEl.querySelectorAll('.mp-item').forEach(el => {
        el.addEventListener('click', () => { index = parseInt(el.dataset.index, 10); play(); });
      });
    }
    function play() {
      if (index < 0 || !playlist[index]) return;
      const src = fileUrl(playlist[index]);
      audio.src = src;
      audio.load();
      audio.play().catch(() => {});
      if (nowEl) nowEl.textContent = path.basename(playlist[index]);
      renderList();
    }
    function updateTime() {
      if (!timeEl) return;
      const c = Math.floor(audio.currentTime);
      const d = Math.floor(audio.duration);
      const pad = n => String(n).padStart(2, '0');
      timeEl.textContent = (pad(Math.floor(c / 60)) + ':' + pad(c % 60)) + ' / ' + (isNaN(d) ? '0:00' : pad(Math.floor(d / 60)) + ':' + pad(d % 60));
    }
    audio.addEventListener('timeupdate', () => { progressEl.value = audio.duration ? (audio.currentTime / audio.duration * 100) : 0; updateTime(); });
    audio.addEventListener('loadedmetadata', updateTime);
    audio.addEventListener('ended', () => {
      if (repeat && playlist.length) { play(); return; }
      if (index < playlist.length - 1) { index++; play(); }
      else if (shuffle && playlist.length > 1) { index = Math.floor(Math.random() * playlist.length); play(); }
    });
    progressEl.addEventListener('input', () => { if (audio.duration) audio.currentTime = progressEl.value / 100 * audio.duration; });
    volumeEl.addEventListener('input', () => { audio.volume = volumeEl.value / 100; });
    playBtn.addEventListener('click', () => { if (audio.paused) audio.play().catch(() => {}); else audio.pause(); });
    prevBtn.addEventListener('click', () => { if (index > 0) { index--; play(); } });
    nextBtn.addEventListener('click', () => { if (index < playlist.length - 1) { index++; play(); } else if (playlist.length) { index = 0; play(); } });
    if (shuffleCb) shuffleCb.addEventListener('change', () => { shuffle = shuffleCb.checked; });
    if (repeatCb) repeatCb.addEventListener('change', () => { repeat = repeatCb.checked; });
    audio.addEventListener('play', updatePlayButtonLabel);
    audio.addEventListener('pause', updatePlayButtonLabel);
    container.querySelector('#mp-open')?.addEventListener('click', () => {
      window.showInternalOpenDialog({ properties: ['openFile', 'multiSelections'], filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'] }] }).then(r => {
        if (r.canceled || !r.filePaths.length) return;
        r.filePaths.forEach(f => { if (!playlist.includes(f)) playlist.push(f); });
        if (index < 0) index = 0;
        renderList();
        if (audio.paused) play();
      });
    });
    container.querySelector('#mp-add')?.addEventListener('click', () => {
      window.showInternalOpenDialog({ properties: ['openFile', 'multiSelections'], filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'] }] }).then(r => {
        if (r.canceled || !r.filePaths.length) return;
        r.filePaths.forEach(f => { if (!playlist.includes(f)) playlist.push(f); });
        renderList();
      });
    });
    container.querySelector('#mp-clear')?.addEventListener('click', () => { playlist = []; index = -1; audio.pause(); audio.src = ''; renderList(); if (nowEl) nowEl.textContent = ''; });
    setWindowLocaleRefresh(container, () => {
      updateStaticLabels();
      renderList();
      updateTime();
    });
    const initial = window.__starMusicInitialPath;
    updateStaticLabels();
    if (initial) { window.__starMusicInitialPath = null; if (!playlist.includes(initial)) playlist.push(initial); index = playlist.length - 1; renderList(); play(); }
    else renderList();
  },

  'video-player'(container) {
    if (!container) return;
    const electron = require('electron');
    const path = require('path');
    const video = container.querySelector('#vp-video');
    const progressEl = container.querySelector('#vp-progress');
    const volumeEl = container.querySelector('#vp-volume');
    const playBtn = container.querySelector('#vp-play');
    const timeEl = container.querySelector('#vp-time');
    const filenameEl = container.querySelector('#vp-filename');
    const openBtn = container.querySelector('#vp-open');
    function tr(key, fallback) {
      try {
        const value = typeof t === 'function' ? t(key) : key;
        return value === key ? fallback : value;
      } catch (_) {
        return fallback;
      }
    }
    function fileUrl(p) { return toStarFileUrl(p); }
    function updatePlayGlyph() {
      if (!playBtn) return;
      playBtn.textContent = video.paused ? '▶' : '❚❚';
    }
    function updateTime() {
      if (!timeEl) return;
      const c = Math.floor(video.currentTime);
      const d = Math.floor(video.duration);
      const pad = n => String(n).padStart(2, '0');
      timeEl.textContent = (pad(Math.floor(c / 60)) + ':' + pad(c % 60)) + ' / ' + (isNaN(d) ? '0:00' : pad(Math.floor(d / 60)) + ':' + pad(d % 60));
    }
    video.addEventListener('timeupdate', () => { progressEl.value = video.duration ? (video.currentTime / video.duration * 100) : 0; updateTime(); });
    video.addEventListener('loadedmetadata', updateTime);
    progressEl.addEventListener('input', () => { if (video.duration) video.currentTime = progressEl.value / 100 * video.duration; });
    volumeEl.addEventListener('input', () => { video.volume = volumeEl.value / 100; });
    playBtn.addEventListener('click', () => { if (video.paused) video.play(); else video.pause(); });
    video.addEventListener('play', updatePlayGlyph);
    video.addEventListener('pause', updatePlayGlyph);
    openBtn?.addEventListener('click', () => {
      window.showInternalOpenDialog({ properties: ['openFile'], filters: [{ name: 'Video', extensions: ['mp4', 'avi', 'wmv', 'mkv', 'mov', 'webm', 'm4v'] }] }).then(r => {
        if (r.canceled || !r.filePaths[0]) return;
        video.src = fileUrl(r.filePaths[0]);
        if (filenameEl) filenameEl.textContent = path.basename(r.filePaths[0]);
        video.play().catch(() => {});
      });
    });
    container.querySelector('#vp-fullscreen')?.addEventListener('click', () => {
      const wrap = container.querySelector('#video-player-app');
      if (!document.fullscreenElement) wrap.requestFullscreen?.();
      else document.exitFullscreen?.();
    });
    setWindowLocaleRefresh(container, () => {
      if (openBtn) openBtn.textContent = tr('open', 'Open');
      updatePlayGlyph();
      updateTime();
    });
    if (openBtn) openBtn.textContent = tr('open', 'Open');
    updatePlayGlyph();
    const initial = window.__starVideoInitialPath;
    if (initial) { window.__starVideoInitialPath = null; video.src = fileUrl(initial); if (filenameEl) filenameEl.textContent = path.basename(initial); video.play().catch(() => {}); }
  },

  'wps-editor'(container) {
    if (!container) return;
    const electron = require('electron');
    const path = require('path');
    const bodyEl = container.querySelector('#wps-body');
    const filenameEl = container.querySelector('#wps-filename');
    const openBtn = container.querySelector('#wps-open');
    function showError(msg) { bodyEl.innerHTML = '<p style="color:var(--error,#f55);padding:16px;">' + escapeHtml(msg) + '</p>'; }
    function tr(key, fallback, params) {
      try {
        return typeof t === 'function' ? t(key, fallback, params) : fallback;
      } catch (_) {
        return fallback;
      }
    }
    function renderOpenHint() {
      bodyEl.innerHTML = '<p style="padding:16px;color:var(--text-dim);">' + tr('openDocumentHint', 'Open a document') + '</p>';
    }
    function updateStaticLabels() {
      if (openBtn) openBtn.textContent = tr('open', 'Open');
    }
    let loadSeq = 0;
    let currentFilePath = '';
    function loadFile(filePath) {
      const seq = ++loadSeq;
      currentFilePath = String(filePath || '');
      const name = path.basename(filePath);
      const ext = path.extname(name).toLowerCase();
      if (filenameEl) filenameEl.textContent = name;
      // 立即清空上一份文档并显示加载中，避免“上一个不关闭、仍弹出加载中”的错乱
      bodyEl.innerHTML = '<p style="padding:16px;color:var(--text-dim);">' + tr('unzipLoading', 'Loading...') + '</p>';
      if (['.pdf'].includes(ext)) {
        electron.ipcRenderer.invoke('os:readFileBinary', filePath).then(res => {
          if (seq !== loadSeq) return;
          if (res && res.error) { showError(res.error); return; }
          if (typeof pdfjsLib === 'undefined') {
            bodyEl.innerHTML = '<p style="padding:16px;">' + (typeof t === 'function' ? t('loadPdfHint', '加载 PDF 查看器…') : 'Loading PDF viewer…') + '</p>';
            const s = document.createElement('script');
            s.src = 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.min.js';
            s.onload = () => { pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js'; loadFile(filePath); };
            document.head.appendChild(s);
            return;
          }
          const raw = Uint8Array.from(atob(res.base64), c => c.charCodeAt(0));
          pdfjsLib.getDocument({ data: raw }).promise.then(pdf => {
            if (seq !== loadSeq) return;
            const numPages = pdf.numPages;
            let html = '';
            for (let i = 1; i <= Math.min(numPages, 50); i++) {
              html += '<div class="wps-pdf-page" data-page="' + i + '" style="margin-bottom:16px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>';
            }
            bodyEl.innerHTML = html;
            bodyEl.style.background = '#666';
            for (let i = 1; i <= Math.min(numPages, 50); i++) {
              pdf.getPage(i).then(page => {
                if (seq !== loadSeq) return;
                const scale = 1.5;
                const view = page.getViewport({ scale });
                const div = bodyEl.querySelector('.wps-pdf-page[data-page="' + page.pageNumber + '"]');
                if (!div) return;
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.height = view.height;
                canvas.width = view.width;
                div.appendChild(canvas);
                page.render({ canvasContext: ctx, viewport: view });
              });
            }
          }).catch(e => { if (seq === loadSeq) showError(e.message || (typeof t === 'function' ? t('pdfError', 'Failed to render PDF') : 'Failed to render PDF')); });
        }).catch(e => { if (seq === loadSeq) showError(e.message); });
        return;
      }
      if (['.xls', '.xlsx'].includes(ext)) {
        // 优先直接 require 本地 xlsx（不依赖网络/不依赖 star-file:// 动态脚本加载）
        const tryRequireXlsx = () => {
          try {
            // 常规：工程根目录 node_modules
            // eslint-disable-next-line no-undef
            return require('xlsx');
          } catch (_) {}
          try {
            // 兜底：从 cwd 显式拼路径加载
            // eslint-disable-next-line no-undef
            return require(path.join(process.cwd(), 'node_modules', 'xlsx'));
          } catch (_) {}
          return null;
        };
        const ensureXlsxLoaded = async () => {
          if (typeof XLSX !== 'undefined' && typeof XLSX.read === 'function') return XLSX;
          if (window.__starXlsxLoadingPromise) return window.__starXlsxLoadingPromise;
          const loadingMsg = typeof t === 'function' ? t('loadXlsxHint', '加载中…') : 'Loading…';
          bodyEl.innerHTML = '<p style="padding:16px;color:var(--text-dim);">' + loadingMsg + '</p>';
          const lib = tryRequireXlsx();
          window.__starXlsxLoadingPromise = Promise.resolve(lib);
          return lib;
        };

        electron.ipcRenderer.invoke('os:readFileBinary', filePath).then(async res => {
          if (seq !== loadSeq) return;
          if (res && res.error) { showError(res.error); return; }

          const xlsxLib = await ensureXlsxLoaded();
          if (seq !== loadSeq) return;
          const lib = xlsxLib || (typeof XLSX !== 'undefined' ? XLSX : null);
          if (!lib || typeof lib.read !== 'function') {
            showError(typeof t === 'function' ? t('loadXlsxFailed', '表格解析器加载失败，请检查网络') : 'Failed to load spreadsheet parser');
            return;
          }
          try {
            const base64 = (res && typeof res.base64 === 'string') ? res.base64 : '';
            const rawBuffer = base64 ? Buffer.from(base64, 'base64') : Buffer.alloc(0);
            const rawBytes = Uint8Array.from(rawBuffer);
            const parseAttempts = [];
            let wb = null;
            const tryParse = (loader) => {
              try {
                const parsed = loader();
                if (parsed && Array.isArray(parsed.SheetNames)) return parsed;
              } catch (err) {
                parseAttempts.push((err && err.message) ? err.message : String(err));
              }
              return null;
            };
            // 优先 array/buffer 方式，兼容性更好（尤其是老 .xls 在打包环境中的读取）
            wb = tryParse(() => lib.read(rawBytes, { type: 'array' }))
              || tryParse(() => lib.read(rawBuffer, { type: 'buffer' }))
              || tryParse(() => lib.read(base64, { type: 'base64' }));
            // 对新建空文件做兜底，避免直接报错无法打开
            if (!wb && rawBuffer.length === 0 && lib.utils && typeof lib.utils.book_new === 'function' && typeof lib.utils.aoa_to_sheet === 'function' && typeof lib.utils.book_append_sheet === 'function') {
              wb = lib.utils.book_new();
              const emptySheet = lib.utils.aoa_to_sheet([[]]);
              lib.utils.book_append_sheet(wb, emptySheet, 'Sheet1');
            }
            if (!wb) {
              throw new Error(parseAttempts[0] || (typeof t === 'function' ? t('parseFailed', 'Parse failed') : 'Parse failed'));
            }
            const names = Array.isArray(wb.SheetNames) ? wb.SheetNames : [];
            if (!names.length) { showError(typeof t === 'function' ? t('emptyWorkbook', 'Empty workbook') : 'Empty workbook'); return; }
            const blocks = names.map((sheetName, idx) => {
              const sheet = wb.Sheets[sheetName];
              const hasValidRangeRef = !!(sheet && typeof sheet['!ref'] === 'string' && sheet['!ref'].trim());
              if (!sheet || !hasValidRangeRef || !lib.utils || typeof lib.utils.sheet_to_html !== 'function') {
                return `
                <div class="wps-sheet" style="padding:12px 14px;border:1px solid var(--border);border-radius:12px;margin:0 0 12px;background:rgba(255,255,255,0.04);">
                  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px;">
                    <span style="font-weight:800;color:var(--text);">${escapeHtml(String(idx + 1))}. ${escapeHtml(String(sheetName))}</span>
                    <span style="margin-left:auto;font-size:12px;color:var(--text-dim);">${typeof t === 'function' ? t('sheetLabel', 'Sheet') : 'Sheet'}</span>
                  </div>
                  <div style="padding:12px;color:var(--text-dim);font-size:12px;">${typeof t === 'function' ? t('noContent', '(No content)') : '(No content)'}</div>
                </div>
              `;
              }
              const html = lib.utils.sheet_to_html(sheet);
              return `
                <div class="wps-sheet" style="padding:12px 14px;border:1px solid var(--border);border-radius:12px;margin:0 0 12px;background:rgba(255,255,255,0.04);">
                  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px;">
                    <span style="font-weight:800;color:var(--text);">${escapeHtml(String(idx + 1))}. ${escapeHtml(String(sheetName))}</span>
                    <span style="margin-left:auto;font-size:12px;color:var(--text-dim);">${typeof t === 'function' ? t('sheetLabel', 'Sheet') : 'Sheet'}</span>
                  </div>
                  <div style="overflow:auto;border-radius:10px;border:1px solid rgba(15,23,42,0.6);background:rgba(15,23,42,0.9);">
                    ${html}
                  </div>
                </div>
              `;
            }).join('');
            bodyEl.innerHTML = `
              <div style="padding:14px 12px;display:flex;flex-direction:column;gap:0;">
                <style>
                  /* 通用表格样式（深色主题） */
                  #wps-body table { border-collapse: collapse; font-size: 13px; width: 100%; background: transparent; color: var(--text); }
                  #wps-body td, #wps-body th { border: 1px solid rgba(148,163,184,0.45); padding: 6px 10px; background: rgba(15,23,42,0.86); }
                  #wps-body tr:nth-child(even) td { background: rgba(15,23,42,0.94); }
                  #wps-body th { background: linear-gradient(180deg, rgba(30,64,175,0.9), rgba(15,23,42,0.98)); font-weight: 700; }
                  #wps-body a { color: #38bdf8; }

                  /* 浅色主题单独优化，避免“深底深字/看不清” */
                  :root[data-theme="light"] #wps-body table { background: transparent; color: #0f172a; }
                  :root[data-theme="light"] #wps-body td,
                  :root[data-theme="light"] #wps-body th {
                    border: 1px solid #e5e7eb;
                    padding: 6px 10px;
                    background: #ffffff;
                    color: #111827;
                  }
                  :root[data-theme="light"] #wps-body tr:nth-child(even) td {
                    background: #f9fafb;
                  }
                  :root[data-theme="light"] #wps-body th {
                    background: linear-gradient(180deg,#e5f0ff,#eef2ff);
                    color: #111827;
                  }
                  :root[data-theme="light"] #wps-body a { color: #2563eb; }
                </style>
                ${blocks}
              </div>
            `;
          } catch (e) { showError(e.message || (typeof t === 'function' ? t('parseFailed', 'Parse failed') : 'Parse failed')); }
        }).catch(e => { if (seq === loadSeq) showError(e.message); });
        return;
      }
      if (ext === '.doc') {
        bodyEl.innerHTML = '<p style="padding:16px;color:var(--text-dim);">' + (typeof t === 'function' ? t('unzipLoading', '正在加载…') : 'Loading…') + '</p>';
        electron.ipcRenderer.invoke('os:docExtractText', filePath).then(res => {
          if (seq !== loadSeq) return;
          if (res && res.error) { showError(res.error); return; }
          const text = (res && res.text) ? String(res.text) : '';
          bodyEl.innerHTML = '<div style="white-space:pre-wrap;line-height:1.7;padding:16px;">' + escapeHtml(text || (typeof t === 'function' ? t('noContent', '(No content)') : '(No content)')) + '</div>';
        }).catch(e => { if (seq === loadSeq) showError(e.message); });
        return;
      }
      if (ext === '.docx') {
        electron.ipcRenderer.invoke('os:readFileBinary', filePath).then(res => {
          if (seq !== loadSeq) return;
          if (res && res.error) { showError(res.error); return; }
          const raw = Uint8Array.from(atob(res.base64), c => c.charCodeAt(0));
          function parseDocxAndShow() {
            if (seq !== loadSeq) return;
            if (typeof JSZip === 'undefined') {
              bodyEl.innerHTML = '<p style="padding:16px;">' + (typeof t === 'function' ? t('loadXlsxHint', '加载中…') : 'Loading…') + '</p>';
              const s = document.createElement('script');
              s.src = 'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js';
              s.onload = () => parseDocxAndShow();
              document.head.appendChild(s);
              return;
            }
            JSZip.loadAsync(raw).then(zip => {
              if (seq !== loadSeq) return null;
              const docXml = zip.files['word/document.xml'];
              if (!docXml) { showError(typeof t === 'function' ? t('invalidDocxMissingDocument', 'Invalid .docx: missing word/document.xml') : 'Invalid .docx: missing word/document.xml'); return; }
              return docXml.async('string');
            }).then(xmlStr => {
              if (seq !== loadSeq) return;
              if (!xmlStr) return;
              const parser = new DOMParser();
              const doc = parser.parseFromString(xmlStr, 'application/xml');
              const body = doc.querySelector('w\\:body') || doc.querySelector('body') || doc.getElementsByTagName('w:body')[0] || doc.getElementsByTagName('body')[0];
              if (!body) { bodyEl.innerHTML = '<p style="padding:16px;color:var(--text-dim);">' + (typeof t === 'function' ? t('cannotParseDocumentStructure', 'Cannot parse document structure') : 'Cannot parse document structure') + '</p>'; return; }
              let pList = body.querySelectorAll('w\\:p, p');
              if (!pList.length) pList = body.getElementsByTagName('w:p');
              if (!pList.length) pList = body.getElementsByTagName('p');
              let html = '';
              for (let i = 0; i < pList.length; i++) {
                const p = pList[i];
                let tList = p.querySelectorAll('w\\:t, t');
                if (!tList.length) tList = p.getElementsByTagName('w:t');
                if (!tList.length) tList = p.getElementsByTagName('t');
                let text = '';
                for (let j = 0; j < tList.length; j++) text += tList[j].textContent || '';
                text = text.trim();
                if (text) html += '<p style="margin:0 0 0.6em;">' + escapeHtml(text) + '</p>';
              }
              bodyEl.innerHTML = html || '<p style="padding:16px;color:var(--text-dim);">' + (typeof t === 'function' ? t('noContent', '(No content)') : '(No content)') + '</p>';
            }).catch(e => { if (seq === loadSeq) showError(e.message || (typeof t === 'function' ? t('failedParseDocx', 'Failed to parse .docx') : 'Failed to parse .docx')); });
          }
          parseDocxAndShow();
        }).catch(e => { if (seq === loadSeq) showError(e.message); });
        return;
      }
      if (ext === '.ppt') {
        bodyEl.innerHTML = '<p style="padding:16px;color:var(--text-dim);">' + (typeof t === 'function' ? t('unzipLoading', '正在加载…') : 'Loading…') + '</p>';
        electron.ipcRenderer.invoke('os:pptExtractText', filePath).then(res => {
          if (seq !== loadSeq) return;
          if (res && res.error) { showError(res.error); return; }
          const slides = (res && res.slides) ? res.slides : [];
          if (slides.length === 0) {
            bodyEl.innerHTML = '<p style="padding:16px;color:var(--text-dim);">' + (typeof t === 'function' ? t('noContent', '(No content)') : '(No content)') + '</p>';
            return;
          }
          const out = slides.map((text, idx) =>
            `<div style="padding:12px 16px;border:1px solid var(--border);border-radius:10px;margin-bottom:12px;background:rgba(255,255,255,0.04);">
              <div style="font-weight:700;margin-bottom:8px;">${escapeHtml((typeof t === 'function' ? t('pptSlide', '幻灯片') : 'Slide') + ' ' + (idx + 1))}</div>
              <div style="white-space:pre-wrap;line-height:1.7;color:var(--text);">${escapeHtml(text || (typeof t === 'function' ? t('noText', '(No text)') : '(No text)'))}</div>
            </div>`
          );
          bodyEl.innerHTML = out.join('');
        }).catch(e => { if (seq === loadSeq) showError(e.message); });
        return;
      }
      if (ext === '.pptx') {
        electron.ipcRenderer.invoke('os:readFileBinary', filePath).then(res => {
          if (seq !== loadSeq) return;
          if (res && res.error) { showError(res.error); return; }
          const raw = Uint8Array.from(atob(res.base64), c => c.charCodeAt(0));
          function parsePptxAndShow() {
            if (seq !== loadSeq) return;
            if (typeof JSZip === 'undefined') {
              bodyEl.innerHTML = '<p style="padding:16px;">' + (typeof t === 'function' ? t('loadXlsxHint', '加载中…') : 'Loading…') + '</p>';
              const s = document.createElement('script');
              s.src = 'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js';
              s.onload = () => parsePptxAndShow();
              document.head.appendChild(s);
              return;
            }
            JSZip.loadAsync(raw).then(zip => {
              if (seq !== loadSeq) return null;
              const slideNames = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/i.test(n)).sort((a, b) => {
                const na = parseInt((a.match(/slide(\d+)\.xml/i) || [,'0'])[1], 10);
                const nb = parseInt((b.match(/slide(\d+)\.xml/i) || [,'0'])[1], 10);
                return na - nb;
              });
              if (!slideNames.length) { showError(typeof t === 'function' ? t('invalidPptxMissingSlides', 'Invalid .pptx: missing slides') : 'Invalid .pptx: missing slides'); return; }
              return Promise.all(slideNames.map(n => zip.files[n].async('string').then(xml => ({ name: n, xml })) ));
            }).then(slides => {
              if (seq !== loadSeq) return;
              if (!slides) return;
              const out = [];
              slides.forEach((s, idx) => {
                const doc = new DOMParser().parseFromString(s.xml, 'application/xml');
                // pptx 文本一般在 a:t 节点
                const nodes = Array.from(doc.getElementsByTagName('a:t'));
                const text = nodes.map(n => (n.textContent || '')).join(' ').replace(/\s+/g, ' ').trim();
                out.push(`<div style="padding:12px 16px;border:1px solid var(--border);border-radius:10px;margin-bottom:12px;background:rgba(255,255,255,0.04);">
                  <div style="font-weight:700;margin-bottom:8px;">${escapeHtml((typeof t === 'function' ? t('pptSlide', '幻灯片') : 'Slide') + ' ' + (idx + 1))}</div>
                  <div style="white-space:pre-wrap;line-height:1.7;color:var(--text);">${escapeHtml(text || (typeof t === 'function' ? t('noText','(No text)') : '(No text)'))}</div>
                </div>`);
              });
              bodyEl.innerHTML = out.join('') || '<p style="padding:16px;color:var(--text-dim);">' + (typeof t === 'function' ? t('noContent', '(No content)') : '(No content)') + '</p>';
            }).catch(e => { if (seq === loadSeq) showError(e.message || (typeof t === 'function' ? t('failedParsePptx', 'Failed to parse .pptx') : 'Failed to parse .pptx')); });
          }
          parsePptxAndShow();
        }).catch(e => { if (seq === loadSeq) showError(e.message); });
        return;
      }
      showError(typeof t === 'function' ? t('unsupportedFormat', '不支持该格式') : 'Unsupported format');
    }
    openBtn?.addEventListener('click', () => {
      window.showInternalOpenDialog({ properties: ['openFile'], filters: [{ name: 'Documents', extensions: ['doc', 'docx', 'ppt', 'pptx', 'pdf', 'xls', 'xlsx'] }] }).then(r => {
        if (r.canceled || !r.filePaths[0]) return;
        loadFile(r.filePaths[0]);
      });
    });
    const initial = window.__starWpsInitialPath;
    if (initial) { window.__starWpsInitialPath = null; loadFile(initial); }
    else renderOpenHint();

    // 当 WPS 已打开时，再次“打开文件”会通过事件通知当前窗口加载新文件
    if (!container._starWpsBound) {
      container._starWpsBound = true;
      const onOpen = (ev) => {
        if (!container.isConnected) {
          window.removeEventListener('star:wps-open', onOpen);
          return;
        }
        const p = ev && ev.detail && ev.detail.filePath ? String(ev.detail.filePath) : '';
        if (p) loadFile(p);
      };
      window.addEventListener('star:wps-open', onOpen);
    }
    setWindowLocaleRefresh(container, () => {
      updateStaticLabels();
      if (currentFilePath) loadFile(currentFilePath);
      else renderOpenHint();
    });
    updateStaticLabels();
  },

  'image-viewer'(container) {
    if (!container) return;
    const electron = require('electron');
    const path = require('path');
    const img = container.querySelector('#iv-image');
    const filenameEl = container.querySelector('#iv-filename');
    const openBtn = container.querySelector('#iv-open');
    const fitBtn = container.querySelector('#iv-fit');
    const zoomInBtn = container.querySelector('#iv-zoom-in');
    const zoomOutBtn = container.querySelector('#iv-zoom-out');
    const STEP = 0.25;
    const MIN_STEP = -3;  // 1 + (-3)*0.25 = 0.25 最小缩放
    const MAX_STEP = 16;  // 1 + 16*0.25 = 5 最大缩放
    let zoomStep = 0;     // 0 表示 1.0 倍
    let scale = 1;
    let rotateDeg = 0;
    let currentFilePath = '';
    function tr(key, fallback, params) {
      try {
        return typeof t === 'function' ? t(key, fallback, params) : fallback;
      } catch (_) {
        return fallback;
      }
    }
    function updateStaticLabels() {
      if (openBtn) openBtn.textContent = tr('open', 'Open');
      if (fitBtn) fitBtn.textContent = tr('fitWindow', 'Fit window');
    }
    function fileUrl(p) { return toStarFileUrl(p); }
    function loadImage(filePath) {
      if (!filePath) return;
      currentFilePath = String(filePath);
      img.src = fileUrl(currentFilePath);
      if (filenameEl) filenameEl.textContent = path.basename(currentFilePath);
      fitToWindow();
    }
    function applyTransform() {
      // 缩放使用宽/高百分比参与布局，这样放大后滚动区域会随之变大，滚动条可以真正拉到顶部
      const absDeg = ((rotateDeg % 360) + 360) % 360;
      if (absDeg === 90 || absDeg === 270) {
        img.style.width = 'auto';
        img.style.height = (scale * 100) + '%';
      } else {
        img.style.width = (scale * 100) + '%';
        img.style.height = 'auto';
      }
      img.style.transform = 'rotate(' + rotateDeg + 'deg)';
      // 根据当前缩放级别启用/禁用放大缩小按钮
      const atMin = zoomStep <= MIN_STEP;
      const atMax = zoomStep >= MAX_STEP;
      if (zoomInBtn) zoomInBtn.disabled = atMax;
      if (zoomOutBtn) zoomOutBtn.disabled = atMin;
    }
    function fitToWindow() {
      zoomStep = 0;
      scale = 1;
      rotateDeg = 0;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'contain';
      applyTransform();
    }
    openBtn?.addEventListener('click', () => {
      window.showInternalOpenDialog({ properties: ['openFile'], filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'ico'] }] }).then(r => {
        if (r.canceled || !r.filePaths[0]) return;
        loadImage(r.filePaths[0]);
      });
    });
    container.querySelector('#iv-zoom-in')?.addEventListener('click', () => {
      img.style.maxWidth = 'none';
      img.style.maxHeight = 'none';
      if (zoomStep >= MAX_STEP) return; // 已到最大，不再重复计算
      zoomStep += 1;
      scale = 1 + zoomStep * STEP;
      applyTransform();
    });
    container.querySelector('#iv-zoom-out')?.addEventListener('click', () => {
      img.style.maxWidth = 'none';
      img.style.maxHeight = 'none';
      if (zoomStep <= MIN_STEP) return; // 已到最小，不再重复计算
      zoomStep -= 1;
      scale = 1 + zoomStep * STEP;
      applyTransform();
    });
    container.querySelector('#iv-rotate')?.addEventListener('click', () => { rotateDeg += 90; applyTransform(); });
    container.querySelector('#iv-fit')?.addEventListener('click', () => { fitToWindow(); });
    const initial = window.__starImageInitialPath;
    if (initial) {
      window.__starImageInitialPath = null;
      loadImage(initial);
    }
    const onImageOpen = (ev) => {
      if (!container.isConnected) {
        window.removeEventListener('star:image-open', onImageOpen);
        return;
      }
      const p = ev && ev.detail && ev.detail.filePath ? String(ev.detail.filePath) : '';
      if (p) loadImage(p);
    };
    window.addEventListener('star:image-open', onImageOpen);
    setWindowLocaleRefresh(container, updateStaticLabels);
    updateStaticLabels();
  },

  browser(container) {
    if (!container) return;
    const browserRootEl = container.querySelector('#browser-app');
    const isIncognito = !!(browserRootEl && browserRootEl.dataset && browserRootEl.dataset.incognito === '1');
    const incognitoPartition = isIncognito ? ('star-browser-incognito-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)) : 'persist:star-browser';
    const brHost = container.querySelector('#br-webviews');
    const brUrl = container.querySelector('#br-url');
    const brTabs = container.querySelector('#br-tabs');
    const goBtn = container.querySelector('#br-go');
    const backBtn = container.querySelector('#br-back');
    const forwardBtn = container.querySelector('#br-forward');
    const homeBtn = container.querySelector('#br-home');
    const reloadBtn = container.querySelector('#br-reload');
    const newTabBtn = container.querySelector('#br-newtab');
    const incognitoBtn = container.querySelector('#br-incognito');
    const restoreTabBtn = container.querySelector('#br-restore-tab');
    const favoriteBtn = container.querySelector('#br-favorite');
    const favoritesBtn = container.querySelector('#br-favorites');
    const downloadsBtn = container.querySelector('#br-downloads');
    const historyBtn = container.querySelector('#br-history');
	    const siteDataBtn = container.querySelector('#br-site-data');
	    const devToolsBtn = container.querySelector('#br-devtools');
	    const downloadBannerEl = container.querySelector('#br-download-banner');
	    const sidePanelEl = container.querySelector('#br-side-panel');
    const sidePanelKickerEl = container.querySelector('#br-side-panel-kicker');
    const sidePanelTitleEl = container.querySelector('#br-side-panel-title');
    const sidePanelHintEl = container.querySelector('#br-side-panel-hint');
    const sidePanelCloseBtn = container.querySelector('#br-side-panel-close');
    const panelTabsEl = container.querySelector('#browser-app .br-panel-tabs');
    const panelTabHistoryBtn = container.querySelector('#br-panel-tab-history');
    const panelTabFavoritesBtn = container.querySelector('#br-panel-tab-favorites');
    const panelTabDataBtn = container.querySelector('#br-panel-tab-data');
    const panelActionsEl = container.querySelector('#br-panel-actions');
    const sidePanelBodyEl = container.querySelector('#br-side-panel-body');
    const devPanelEl = container.querySelector('#br-dev-panel');
    const devPanelKickerEl = container.querySelector('#br-dev-panel-kicker');
    const devPanelTitleEl = container.querySelector('#br-dev-panel-title');
    const devPanelHintEl = container.querySelector('#br-dev-panel-hint');
    const devPanelCloseBtn = container.querySelector('#br-dev-panel-close');
    const devPanelModeTabsEl = container.querySelector('#br-dev-panel-mode-tabs');
    const devPanelActionsEl = container.querySelector('#br-dev-panel-actions');
    const devPanelBodyEl = container.querySelector('#br-dev-panel-body');
    const statusEl = container.querySelector('#br-status');
    const hostWindowEl = container.closest('.star-window');
    const hostWinId = hostWindowEl && hostWindowEl.id;
    const toolbarEl = container.querySelector('.br-toolbar');
    const stageEl = brHost ? brHost.parentElement : null;
    const ipcRenderer = require('electron').ipcRenderer;
    const STORAGE_SESSION_KEY = 'star-browser-session-v3';
    const STORAGE_HISTORY_KEY = 'star-browser-history-v3';
    const STORAGE_CLOSED_TABS_KEY = 'star-browser-closed-tabs-v3';
    const STORAGE_FAVORITES_KEY = 'star-browser-favorites-v1';
	    const MAX_SESSION_TABS = 18;
	    const MAX_HISTORY_ENTRIES = 320;
	    const MAX_CLOSED_TABS = 20;
	    const MAX_FAVORITES = 120;
	    const downloadBannerSeenIds = new Set();
	    let downloadBannerTimer = null;
	    let downloadBannerTitleEl = null;
	    let downloadBannerMsgEl = null;
	    let downloadBannerOpenBtn = null;
	    let downloadBannerCloseBtn = null;
	    let lastDownloadBannerRecord = null;
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.minHeight = '0';
    container.style.overflow = 'hidden';
    if (brTabs && brTabs.dataset.scrollBound !== '1') {
      brTabs.dataset.scrollBound = '1';
      // Vertical wheel should scroll tab strip horizontally when tabs overflow.
      brTabs.addEventListener('wheel', (e) => {
        if (!brTabs) return;
        const scroller = brTabs.querySelector('.br-tabs-scroller') || brTabs;
        if (!scroller || !(e.target && (scroller === e.target || (e.target.closest && e.target.closest('.br-tabs-scroller'))))) return;
        const canScroll = scroller.scrollWidth > scroller.clientWidth + 2;
        if (!canScroll) return;
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (!Number.isFinite(delta) || Math.abs(delta) < 0.1) return;
        e.preventDefault();
        scroller.scrollLeft += delta;
      }, { passive: false });
    }
    function forceBrowserLayout() {
      if (browserRootEl) {
        browserRootEl.style.width = '100%';
        browserRootEl.style.height = '100%';
        browserRootEl.style.minHeight = '0';
        browserRootEl.style.overflow = 'hidden';
        browserRootEl.style.display = 'flex';
        browserRootEl.style.flexDirection = 'column';
        browserRootEl.style.position = 'relative';
        browserRootEl.style.flex = '1 1 auto';
      }
      if (toolbarEl) {
        toolbarEl.style.flex = '0 0 auto';
      }
      if (brTabs) {
        brTabs.style.flex = '0 0 auto';
        brTabs.style.display = 'flex';
        brTabs.style.flexWrap = 'nowrap';
        brTabs.style.overflow = 'hidden';
        brTabs.style.whiteSpace = 'normal';
      }
      if (stageEl) {
        stageEl.style.flex = '1 1 auto';
        stageEl.style.minHeight = '0';
        stageEl.style.position = 'relative';
        stageEl.style.overflow = 'hidden';
        // Clear legacy inline height left by previous broken layout patches.
        stageEl.style.height = '';
      }
      if (brHost) {
        brHost.style.position = 'absolute';
        brHost.style.inset = '0';
        brHost.style.width = '100%';
        brHost.style.height = '100%';
        brHost.style.minHeight = '0';
        brHost.style.overflow = 'hidden';
      }
      tabs.forEach((tab) => {
        const view = tab && tab.webview;
        if (!view || !view.isConnected) return;
        view.style.position = 'absolute';
        view.style.inset = '0';
        view.style.width = '100%';
        view.style.height = '100%';
        view.style.display = 'flex';
      });
      layoutBrowserPanelOffsets();
    }
    function tr(key, fallback, params) {
      try {
        return typeof t === 'function' ? t(key, fallback, params) : fallback;
      } catch (_) {
        return fallback;
      }
    }
    function getDefaultTabTitle() {
      return tr('newTab', 'New tab');
    }
    function getDefaultStatusText() {
      if (isIncognito) return tr('browserIncognitoHint', 'Incognito mode: this window does not save local history, tabs, or favorites.');
      return tr('browserDataPersistenceHint', 'Cookies, cache and login state are saved automatically.');
    }
    function safeLoadJson(key, fallback) {
      if (isIncognito) return fallback;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed == null ? fallback : parsed;
      } catch (_) {
        return fallback;
      }
    }
    function safeLoadJsonArray(key, fallback) {
      const parsed = safeLoadJson(key, null);
      if (Array.isArray(parsed)) return parsed;
      return Array.isArray(fallback) ? fallback : [];
    }
    function migrateJsonArrayStorage(targetKey, prefix) {
      if (isIncognito) return [];
      // If storage keys were renamed (e.g. v2 -> v3), try to migrate without data loss.
      const existing = safeLoadJsonArray(targetKey, null);
      if (existing && existing.length) return existing;

      const candidates = [];
      try {
        const prefixText = String(prefix || '');
        if (prefixText) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || key === targetKey) continue;
            if (!String(key).startsWith(prefixText)) continue;
            const value = safeLoadJsonArray(key, null);
            if (value && value.length) candidates.push({ key, value });
          }
        }
      } catch (_) {}

      if (!candidates.length) return existing || [];
      candidates.sort((a, b) => {
        const lenDiff = (b.value ? b.value.length : 0) - (a.value ? a.value.length : 0);
        if (lenDiff) return lenDiff;
        const av = parseInt((String(a.key).match(/-v(\d+)/i) || [])[1] || '0', 10) || 0;
        const bv = parseInt((String(b.key).match(/-v(\d+)/i) || [])[1] || '0', 10) || 0;
        return bv - av;
      });
      const chosen = candidates[0].value;
      safeSaveJson(targetKey, chosen);
      return chosen;
    }
    function safeSaveJson(key, value) {
      if (isIncognito) return;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (_) {}
    }
    function openIncognitoBrowserWindow() {
      try {
        const active = getActiveTab();
        const initialUrl = String(active && active.url ? active.url : '').trim();
        if (window.StarAppsRegistry && typeof window.StarAppsRegistry.openBrowserIncognito === 'function') {
          window.StarAppsRegistry.openBrowserIncognito(initialUrl || getHomepage());
          return;
        }
      } catch (_) {}
      showTransientStatus(tr('browserIncognitoOpenFailed', 'Unable to open an incognito window right now.'), 'error', 2600);
    }
    function renderStatus(message, tone) {
      if (!statusEl) return;
      statusEl.textContent = message || getDefaultStatusText();
      statusEl.style.color = tone === 'error'
        ? 'var(--error, #ff7f7f)'
        : tone === 'success'
          ? 'var(--accent)'
          : 'var(--text-dim)';
    }
    let statusTimer = null;
	    function showTransientStatus(message, tone, duration) {
	      renderStatus(message, tone);
      if (statusTimer) clearTimeout(statusTimer);
      statusTimer = setTimeout(() => {
        statusTimer = null;
        renderStatus(getDefaultStatusText(), 'muted');
      }, duration || 2600);
	    }

	    function ensureDownloadBannerDom() {
	      if (!downloadBannerEl || downloadBannerEl.dataset.ready === '1') return;
	      downloadBannerEl.dataset.ready = '1';
	      downloadBannerEl.innerHTML = `
	        <span class="br-top-banner-title" id="br-download-banner-title"></span>
	        <span class="br-top-banner-msg" id="br-download-banner-msg"></span>
	        <span class="br-top-banner-actions">
	          <button type="button" id="br-download-banner-open" class="start-footer-btn" style="padding:6px 10px;"></button>
	          <button type="button" id="br-download-banner-close" class="start-footer-btn br-top-banner-close" aria-label="${escapeHtml(tr('close', 'Close'))}" title="${escapeHtml(tr('close', 'Close'))}">x</button>
	        </span>
	      `;
	      downloadBannerTitleEl = downloadBannerEl.querySelector('#br-download-banner-title');
	      downloadBannerMsgEl = downloadBannerEl.querySelector('#br-download-banner-msg');
	      downloadBannerOpenBtn = downloadBannerEl.querySelector('#br-download-banner-open');
	      downloadBannerCloseBtn = downloadBannerEl.querySelector('#br-download-banner-close');
	      if (downloadBannerOpenBtn) {
	        downloadBannerOpenBtn.addEventListener('click', () => {
	          panelMode = 'downloads';
	          renderSidePanel();
	          hideDownloadCapturedBanner();
	        });
	      }
	      if (downloadBannerCloseBtn) {
	        downloadBannerCloseBtn.addEventListener('click', () => hideDownloadCapturedBanner());
	      }
	    }

	    function hideDownloadCapturedBanner() {
	      if (downloadBannerTimer) clearTimeout(downloadBannerTimer);
	      downloadBannerTimer = null;
	      if (downloadBannerEl) downloadBannerEl.classList.add('hidden');
	    }

	    function showDownloadCapturedBanner(record) {
	      if (!downloadBannerEl) return;
	      ensureDownloadBannerDom();
	      lastDownloadBannerRecord = record || null;
	      const fileName = record && record.fileName ? String(record.fileName) : '';
	      const title = tr('browserDownloadCapturedTitle', 'Downloads captured');
	      const message = tr(
	        'browserDownloadCapturedMessage',
	        'This download is managed by Star OS. Open Downloads to manage it. ({file})',
	        { file: fileName || tr('browserDownloadUnnamed', 'Unnamed file') }
	      );
	      if (downloadBannerTitleEl) downloadBannerTitleEl.textContent = title;
	      if (downloadBannerMsgEl) downloadBannerMsgEl.textContent = message;
	      if (downloadBannerOpenBtn) downloadBannerOpenBtn.textContent = tr('browserDownloadCapturedOpen', 'Open Downloads');
	      downloadBannerEl.classList.remove('hidden');
	      if (downloadBannerTimer) clearTimeout(downloadBannerTimer);
	      downloadBannerTimer = setTimeout(() => {
	        downloadBannerTimer = null;
	        if (downloadBannerEl) downloadBannerEl.classList.add('hidden');
	      }, 3600);
	    }

	    function refreshDownloadBannerLocale() {
	      if (!downloadBannerEl || downloadBannerEl.classList.contains('hidden')) return;
	      if (!lastDownloadBannerRecord) return;
	      showDownloadCapturedBanner(lastDownloadBannerRecord);
	    }
    function formatHistoryTime(timestamp) {
      const date = new Date(Number(timestamp) || Date.now());
      try {
        return date.toLocaleString(getLocale(), {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (_) {
        return date.toLocaleString();
      }
    }
    function formatHistoryDateGroup(timestamp) {
      const date = new Date(Number(timestamp) || Date.now());
      try {
        return date.toLocaleDateString(getLocale(), {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          weekday: 'short'
        });
      } catch (_) {
        return date.toLocaleDateString();
      }
    }
    function renderHistoryEntriesGroupedHtml() {
      if (!Array.isArray(historyEntries) || !historyEntries.length) {
        return `<div class="br-empty">${escapeHtml(tr('browserNoHistory', 'No browsing history yet.'))}</div>`;
      }
      let currentDateKey = '';
      const parts = [];
      historyEntries.forEach((item, index) => {
        const visitedAt = Number(item && item.visitedAt) || Date.now();
        const dt = new Date(visitedAt);
        const dateKey = `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
        if (dateKey !== currentDateKey) {
          currentDateKey = dateKey;
          parts.push(`<div class="br-history-group-title">${escapeHtml(formatHistoryDateGroup(visitedAt))}</div>`);
        }
        parts.push(`
            <button type="button" class="br-history-item" data-history-index="${index}">
              <span class="br-history-title">${escapeHtml(item.title || inferTabTitleFromUrl(item.url))}</span>
              <span class="br-history-url">${escapeHtml(item.url)}</span>
              <span class="br-history-time">${escapeHtml(formatHistoryTime(visitedAt))}</span>
            </button>
        `);
      });
      return parts.join('');
    }
    function formatDownloadBytes(bytes) {
      const value = Number(bytes);
      if (!Number.isFinite(value) || value <= 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let idx = 0;
      let next = value;
      while (next >= 1024 && idx < units.length - 1) {
        next /= 1024;
        idx += 1;
      }
      const digits = idx === 0 ? 0 : (next >= 100 ? 0 : (next >= 10 ? 1 : 2));
      return `${next.toFixed(digits)} ${units[idx]}`;
    }
    function looksLikeLocalPath(value) {
      const text = String(value || '').trim();
      return /^[a-zA-Z]:[\\/]/.test(text) || /^\\\\[^\\]/.test(text);
    }
	    function looksLikeDomain(value) {
      const text = String(value || '').trim();
      return /^localhost(?::\d+)?(?:[/?#].*)?$/i.test(text)
        || /^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:[/?#].*)?$/.test(text)
        || /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[:/][^\s]*)?$/i.test(text);
	    }
	    function buildStarFileUrl(filePath) {
	      const raw = String(filePath || '').trim();
	      if (!raw) return 'star-file:///';
	      const normalized = raw.replace(/\\/g, '/');
	      if (/^\/\/[^/]/.test(normalized)) return 'star-file:' + encodeURI(normalized);
	      if (/^[A-Za-z]:\//.test(normalized)) return 'star-file:///' + encodeURI(normalized);
	      return 'star-file:///' + encodeURI(normalized.replace(/^\/+/, ''));
	    }
	    function canonicalizeStarFileUrl(value) {
	      const text = String(value || '').trim();
	      if (!/^star-file:\/\//i.test(text)) return text;
	      if (/^star-file:\/\/\/[A-Za-z]:\//.test(text)) return text;
	      const singleDrive = /^star-file:\/\/([A-Za-z])(?::)?(?:\/(.*))?$/i.exec(text);
	      if (singleDrive) {
	        const drive = String(singleDrive[1] || '').toUpperCase();
	        const rest = String(singleDrive[2] || '').replace(/^\/+/, '');
	        return 'star-file:///' + drive + ':/' + rest;
	      }
	      return text;
	    }
	    function isDirectBrowserUrl(value) {
	      const text = String(value || '').trim().toLowerCase();
	      return text.startsWith('http://')
	        || text.startsWith('https://')
	        || text.startsWith('file://')
	        || text.startsWith('star-file://')
	        || text.startsWith('about:');
	    }
    function inferTabTitleFromUrl(url) {
      const text = String(url || '').trim();
      if (!text || /^about:blank$/i.test(text)) return getDefaultTabTitle();
      if (text.startsWith('star-file://')) {
        try {
          const decodedPath = decodeURIComponent(text.replace(/^star-file:\/\//i, ''));
          const fileName = decodedPath.split(/[\\/]/).filter(Boolean).pop();
          return fileName || decodedPath || getDefaultTabTitle();
        } catch (_) {}
      }
      if (text.startsWith('file://')) {
        try {
          const parsedFileUrl = new URL(text);
          const fileName = decodeURIComponent(parsedFileUrl.pathname || '').split('/').filter(Boolean).pop();
          return fileName || getDefaultTabTitle();
        } catch (_) {}
      }
      try {
        const parsed = new URL(text);
        if (/baidu\.com$/i.test(parsed.hostname) && parsed.pathname === '/s') {
          const keyword = parsed.searchParams.get('wd');
          if (keyword) return keyword;
        }
        const host = parsed.hostname || '';
        const lastPathSegment = decodeURIComponent((parsed.pathname || '').split('/').filter(Boolean).pop() || '');
        if (lastPathSegment && lastPathSegment !== host) return lastPathSegment;
        if (host) return host;
      } catch (_) {}
      return text;
    }
    function getTabTitle(tab) {
      if (!tab) return getDefaultTabTitle();
      if (tab.defaultTitle || !tab.title) return inferTabTitleFromUrl(tab.url) || getDefaultTabTitle();
      return String(tab.title);
    }
    function getTabFaviconKind(tab) {
      const text = String((tab && tab.url) || '').trim().toLowerCase();
      if (!text || /^about:blank$/i.test(text)) return 'newtab';
      if (text.startsWith('star-file://') || text.startsWith('file://')) return 'file';
      return 'web';
    }
    function getTabFaviconSvg(kind) {
      if (kind === 'file') {
        return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7zm0 1.5L17.5 7H14z"/><path d="M8 12h8v1.5H8zm0 3h6v1.5H8z"/></svg>';
      }
      if (kind === 'newtab') {
        return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm4.5 10.75h-3.75v3.75h-1.5v-3.75H7.5v-1.5h3.75V7.5h1.5v3.75h3.75z"/></svg>';
      }
      return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm6.93 9h-3.02a15.7 15.7 0 0 0-1.19-5.01A8.03 8.03 0 0 1 18.93 11zM12 4.06c.81 1.14 1.9 3.44 2.36 6.94H9.64C10.1 7.5 11.19 5.2 12 4.06zM9.28 5.99A15.7 15.7 0 0 0 8.09 11H5.07a8.03 8.03 0 0 1 4.21-5.01zM5.07 13h3.02a15.7 15.7 0 0 0 1.19 5.01A8.03 8.03 0 0 1 5.07 13zm6.93 6.94c-.81-1.14-1.9-3.44-2.36-6.94h4.72c-.46 3.5-1.55 5.8-2.36 6.94zm2.72-1.93A15.7 15.7 0 0 0 15.91 13h3.02a8.03 8.03 0 0 1-4.21 5.01z"/></svg>';
    }
    function getTabFaviconMarkup(tab) {
      const iconTitle = escapeHtml(getTabTitle(tab) || getDefaultTabTitle());
      const favicon = String(tab && tab.favicon ? tab.favicon : '').trim();
      const fallbackSvg = getTabFaviconSvg(getTabFaviconKind(tab));
      const loadingClass = tab && tab.loading ? ' is-loading' : '';
      if (favicon) {
        return `
          <span class="br-tab-favicon${loadingClass}" data-kind="${escapeHtml(getTabFaviconKind(tab))}" aria-hidden="true">
            <img class="br-tab-favicon-img" src="${escapeHtml(favicon)}" alt="">
            <span class="br-tab-favicon-fallback" title="${iconTitle}">${fallbackSvg}</span>
            <span class="br-tab-loading-indicator"></span>
          </span>
        `;
      }
      return `
        <span class="br-tab-favicon is-fallback${loadingClass}" data-kind="${escapeHtml(getTabFaviconKind(tab))}" aria-hidden="true">
          <span class="br-tab-favicon-fallback" title="${iconTitle}">${fallbackSvg}</span>
          <span class="br-tab-loading-indicator"></span>
        </span>
      `;
    }
    function updateStaticLabels() {
      if (backBtn) backBtn.textContent = tr('back', 'Back');
      if (forwardBtn) forwardBtn.textContent = tr('forward', 'Forward');
      if (homeBtn) homeBtn.textContent = tr('homePage', 'Home');
      if (reloadBtn) reloadBtn.textContent = tr('refresh', 'Refresh');
      if (goBtn) goBtn.textContent = tr('go', 'Go');
      if (newTabBtn) newTabBtn.textContent = tr('newTab', 'New tab');
      if (restoreTabBtn) restoreTabBtn.textContent = tr('browserRestoreClosedTab', 'Restore tab');
      if (favoriteBtn) favoriteBtn.textContent = tr('browserFavoriteToggle', 'Favorite');
      if (favoritesBtn) favoritesBtn.textContent = tr('bookmarks', 'Bookmarks');
      if (downloadsBtn) downloadsBtn.textContent = tr('browserDownloads', 'Downloads');
      if (historyBtn) historyBtn.textContent = tr('history', 'History');
      if (siteDataBtn) siteDataBtn.textContent = tr('browserSiteData', 'Site data');
      if (devToolsBtn) devToolsBtn.textContent = tr('browserOpenDevTools', 'DevTools');
      if (incognitoBtn) incognitoBtn.textContent = tr('browserIncognitoOpen', 'Incognito');
      if (sidePanelKickerEl) sidePanelKickerEl.textContent = tr('browserSidebar', 'Browser sidebar');
      if (sidePanelTitleEl) {
        sidePanelTitleEl.textContent = panelMode === 'data'
          ? tr('browserSiteData', 'Site data')
          : panelMode === 'downloads'
            ? tr('browserDownloads', 'Downloads')
            : panelMode === 'favorites'
              ? tr('browserFavorites', tr('bookmarks', 'Bookmarks'))
              : tr('history', 'History');
      }
      if (sidePanelHintEl) {
        sidePanelHintEl.textContent = panelMode === 'data'
          ? tr('browserSiteDataHint', 'Inspect cookies and saved login state, then edit or remove entries one by one.')
          : panelMode === 'downloads'
            ? tr('browserDownloadsHint', 'Manage download queue, retry failed items, and open completed files.')
            : panelMode === 'favorites'
              ? tr('browserFavoritesTabHint', 'Saved pages you marked as favorites will appear here.')
              : tr('browserHistoryTabHint', 'Visited pages are shown here.');
      }
      if (panelTabHistoryBtn) panelTabHistoryBtn.textContent = tr('history', 'History');
      if (panelTabFavoritesBtn) panelTabFavoritesBtn.textContent = tr('browserFavorites', 'Favorites');
      if (panelTabDataBtn) panelTabDataBtn.textContent = tr('browserSiteData', 'Site data');
      if (brUrl) brUrl.placeholder = tr('searchOrAddress', 'Search or enter address');
      renderStatus(getDefaultStatusText(), 'muted');
    }
    function getHomepage() {
      try {
        const u = localStorage.getItem('star-browser-homepage');
        if (u && u.trim()) return u.trim();
      } catch (_) {}
      return 'https://www.baidu.com';
    }
	    function normalizeBrowserUrl(value) {
	      const text = String(value || '').trim();
	      if (!text) return getHomepage();
	      if (looksLikeLocalPath(text)) return buildStarFileUrl(text);
	      if (isDirectBrowserUrl(text)) return canonicalizeStarFileUrl(text);
	      if (looksLikeDomain(text)) {
	        if (/^localhost(?::\d+)?(?:[/?#].*)?$/i.test(text) || /^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:[/?#].*)?$/.test(text)) {
	          return 'http://' + text;
	        }
        return 'https://' + text.replace(/^\/+/, '');
      }
      return 'https://www.baidu.com/s?wd=' + encodeURIComponent(text);
    }
    function focusAndSelectBrowserAddress() {
      if (!brUrl) return;
      setTimeout(() => {
        if (!brUrl.isConnected) return;
        brUrl.focus();
        brUrl.select();
      }, 0);
    }
    function showBrowserDialogAlert(title, message) {
      if (window.StarDialog && typeof window.StarDialog.alert === 'function') {
        window.StarDialog.alert({
          title,
          message,
          okText: tr('ok', 'OK')
        });
        return;
      }
      showTransientStatus((title ? title + ' ' : '') + message, 'error', 4200);
    }
    function validateBrowserAddress(rawValue) {
      const text = String(rawValue || '').trim();
      const finalUrl = normalizeBrowserUrl(text);
      if (!text) {
        return {
          ok: true,
          rawInput: '',
          finalUrl
        };
      }
      if (isDirectBrowserUrl(text) || looksLikeDomain(text)) {
        try {
          new URL(finalUrl);
        } catch (_) {
          return {
            ok: false,
            rawInput: text,
            finalUrl
          };
        }
      }
      return {
        ok: true,
        rawInput: text,
        finalUrl
      };
    }
    function showInvalidBrowserAddress(rawInput) {
      const title = tr('browserInvalidAddressTitle', 'Invalid address');
      const message = tr(
        'browserInvalidAddressMessage',
        'The address "{address}" is not valid. Check the format and try again.',
        { address: rawInput || '' }
      );
      showBrowserDialogAlert(title, message);
      showTransientStatus(message, 'error', 3600);
      focusAndSelectBrowserAddress();
    }
    function showBrowserLoadFailed(rawInput, errorDescription, errorCode) {
      const title = tr('browserLoadFailedTitle', 'Unable to open page');
      const detail = String(errorDescription || errorCode || '').trim();
      const message = tr(
        'browserLoadFailedMessage',
        'The address "{address}" could not be opened.\nPlease check the address or your network connection.\nReason: {reason}',
        {
          address: rawInput || '',
          reason: detail || String(errorCode || '')
        }
      );
      showBrowserDialogAlert(title, message);
      showTransientStatus(message, 'error', 4200);
      focusAndSelectBrowserAddress();
    }
    function submitBrowserAddress(rawValue) {
      const result = validateBrowserAddress(rawValue);
      if (!result.ok) {
        showInvalidBrowserAddress(result.rawInput);
        return;
      }
      navigateActiveTab(result.finalUrl, {
        source: 'manual',
        rawInput: result.rawInput || result.finalUrl,
        finalUrl: result.finalUrl
      });
    }
    function isHistoryEligible(url) {
      return /^(https?|file|star-file):/i.test(String(url || '').trim());
    }
    let tabs = [];
    let activeTab = 0;
    let tabSeed = 0;
    let panelMode = null;
    let historyEntries = migrateJsonArrayStorage(STORAGE_HISTORY_KEY, 'star-browser-history').filter(item => item && item.url);
    let closedTabs = migrateJsonArrayStorage(STORAGE_CLOSED_TABS_KEY, 'star-browser-closed-tabs').filter(item => item && item.url);
    let favoriteEntries = migrateJsonArrayStorage(STORAGE_FAVORITES_KEY, 'star-browser-favorites').filter(item => item && item.url);
    let downloadEntries = [];
    let downloadsFilter = '';
    let downloadsLoading = false;
    let downloadsLoadedOnce = false;
    let downloadsLoadPromise = null;
    let cookieEntries = [];
    let cookieLoading = false;
    let cookieFilter = '';
    let cookieScope = 'current';
    let cookieEditor = null;
    let cookieLoadedForKey = '';
    let cookieLoadRequestId = 0;
    let devPanelMode = 'network';
    let devPanelFilter = '';
    let devPanelNetworkEntries = [];
    let devPanelNetworkLoading = false;
    let devPanelPerfSnapshot = null;
    let devPanelStorageSnapshot = null;
    let devPanelPerfTimer = null;
    let devPanelVisible = false;
    let devPanelExpandedNetId = '';
    let devPanelSourceHtml = '';
    let devPanelSourceLoading = false;
    let devPanelSourceTruncated = false;
    const COOKIE_SAMESITE_VALUES = ['unspecified', 'no_restriction', 'lax', 'strict'];

    function layoutBrowserPanelOffsets() {
      if (!stageEl) return;
      const gap = 12;
      const base = 10;
      let nextRight = base;
      const devOn = !!(devPanelEl && !devPanelEl.classList.contains('hidden'));
      const userOn = !!(sidePanelEl && !sidePanelEl.classList.contains('hidden'));
      if (devOn) {
        devPanelEl.style.right = nextRight + 'px';
        const w = devPanelEl.offsetWidth || 320;
        nextRight += w + gap;
      } else if (devPanelEl) {
        devPanelEl.style.right = base + 'px';
      }
      if (userOn) {
        sidePanelEl.style.right = nextRight + 'px';
      } else if (sidePanelEl) {
        sidePanelEl.style.right = base + 'px';
      }
    }

    function renderDevModeTabs() {
      if (!devPanelModeTabsEl) return;
      const modes = [
        { id: 'network', label: tr('network', 'Network') },
        { id: 'performance', label: tr('browserDevModePerformance', 'Performance') },
        { id: 'storage', label: tr('browserDevModeStorage', 'Storage') },
        { id: 'source', label: tr('browserDevViewSource', 'Page source') }
      ];
      devPanelModeTabsEl.innerHTML = modes.map(m => `
        <button type="button" class="br-dev-tab ${devPanelMode === m.id ? 'active' : ''}" data-dev-tab="${m.id}">${escapeHtml(m.label)}</button>
      `).join('');
      devPanelModeTabsEl.querySelectorAll('[data-dev-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = String(btn.getAttribute('data-dev-tab') || '').trim();
          devPanelMode = (id === 'performance' || id === 'storage' || id === 'source') ? id : 'network';
          renderDevDrawer();
        });
      });
    }

    function refreshDevPanelChrome() {
      if (devPanelKickerEl) devPanelKickerEl.textContent = tr('browserDevDrawerKicker', 'Developer tools');
      if (devPanelTitleEl) devPanelTitleEl.textContent = tr('browserDevPanel', 'Developer tools');
      if (devPanelHintEl) {
        devPanelHintEl.textContent = tr('browserDevPanelHintDetached', 'Debugging views for the current tab. Bookmarks, history and site data stay in the other sidebar.');
      }
    }

    async function loadDevPanelPageSource(force) {
      if (!devPanelVisible || devPanelMode !== 'source') return;
      const tab = getActiveTab();
      const view = getActiveWebview();
      if (!view || !tab || !tab.domReady) {
        devPanelSourceHtml = '';
        devPanelSourceTruncated = false;
        devPanelSourceLoading = false;
        renderDevPanelBody();
        return;
      }
      if (!force && devPanelSourceHtml && !devPanelSourceLoading) return;
      devPanelSourceLoading = true;
      devPanelSourceTruncated = false;
      renderDevPanelBody();
      try {
        const raw = await view.executeJavaScript(`document.documentElement.outerHTML`, true);
        const s = String(raw || '');
        const max = 480000;
        devPanelSourceTruncated = s.length > max;
        devPanelSourceHtml = devPanelSourceTruncated ? s.slice(0, max) : s;
      } catch (err) {
        devPanelSourceHtml = '<!-- ' + escapeHtml(String(err && err.message ? err.message : err)) + ' -->';
        devPanelSourceTruncated = false;
      }
      devPanelSourceLoading = false;
      renderDevPanelBody();
    }

    function renderDevDrawer() {
      if (!devPanelVisible || !devPanelEl) return;
      refreshDevPanelChrome();
      renderDevModeTabs();
      renderDevPanelActions();
      renderDevPanelBody();
      if (devPanelMode === 'network') {
        loadDevPanelNetworkEntries();
        stopDevPanelPerfTimer();
      } else if (devPanelMode === 'performance') {
        loadDevPanelPerfSnapshot();
        ensureDevPanelPerfTimer();
      } else if (devPanelMode === 'storage') {
        loadDevPanelStorageSnapshot();
        stopDevPanelPerfTimer();
      } else if (devPanelMode === 'source') {
        stopDevPanelPerfTimer();
        loadDevPanelPageSource(true);
      }
      requestAnimationFrame(() => layoutBrowserPanelOffsets());
    }

    function showDevPanel() {
      devPanelVisible = true;
      if (devPanelEl) devPanelEl.classList.remove('hidden');
      requestAnimationFrame(() => {
        layoutBrowserPanelOffsets();
        renderDevDrawer();
        requestAnimationFrame(() => layoutBrowserPanelOffsets());
      });
      updateToolbarStates();
    }

    function hideDevPanel() {
      devPanelVisible = false;
      devPanelExpandedNetId = '';
      stopDevPanelPerfTimer();
      if (devPanelEl) devPanelEl.classList.add('hidden');
      layoutBrowserPanelOffsets();
      updateToolbarStates();
    }

    window.__starBrowserSelfDevToolsHandlers = window.__starBrowserSelfDevToolsHandlers || [];
    function tryOpenSelfDevToolsByWebContentsId(webContentsId) {
      const id = Number(webContentsId);
      if (!Number.isFinite(id) || id <= 0) return false;
      for (let i = 0; i < tabs.length; i += 1) {
        const tab = tabs[i];
        const view = tab && tab.webview;
        if (!view || typeof view.getWebContentsId !== 'function') continue;
        let vid;
        try { vid = Number(view.getWebContentsId()); } catch (_) { continue; }
        if (vid !== id) continue;
        activeTab = i;
        syncVisibleWebviews(true);
        renderTabs();
        showDevPanel();
        if (hostWinId && window.StarWindowManager && typeof window.StarWindowManager.focus === 'function') {
          try {
            if (typeof window.StarWindowManager.restore === 'function') window.StarWindowManager.restore(hostWinId);
            window.StarWindowManager.focus(hostWinId);
          } catch (_) {}
        }
        return true;
      }
      return false;
    }
    window.__starBrowserSelfDevToolsHandlers.push(tryOpenSelfDevToolsByWebContentsId);

    function persistSessionState() {
      safeSaveJson(STORAGE_SESSION_KEY, {
        activeTab: Math.max(0, Math.min(activeTab, Math.max(0, tabs.length - 1))),
        tabs: tabs.slice(0, MAX_SESSION_TABS).map(tab => ({
          url: String(tab && tab.url ? tab.url : getHomepage()),
          title: String(tab && tab.title ? tab.title : ''),
          defaultTitle: !!(tab && tab.defaultTitle)
        })),
        savedAt: Date.now()
      });
    }
    function persistHistoryEntries() {
      safeSaveJson(STORAGE_HISTORY_KEY, historyEntries.slice(0, MAX_HISTORY_ENTRIES));
    }
    function persistClosedTabs() {
      safeSaveJson(STORAGE_CLOSED_TABS_KEY, closedTabs.slice(0, MAX_CLOSED_TABS));
    }
    function persistFavorites() {
      safeSaveJson(STORAGE_FAVORITES_KEY, favoriteEntries.slice(0, MAX_FAVORITES));
    }

    function isFavoriteUrl(url) {
      const nextUrl = String(url || '').trim();
      if (!nextUrl) return false;
      return favoriteEntries.some(item => String(item.url || '').trim() === nextUrl);
    }
    function updateFavoriteForUrl(url, title) {
      const nextUrl = String(url || '').trim();
      if (!nextUrl) return;
      const idx = favoriteEntries.findIndex(item => String(item.url || '').trim() === nextUrl);
      if (idx < 0) return;
      favoriteEntries[idx].title = String(title || inferTabTitleFromUrl(nextUrl) || getDefaultTabTitle());
      persistFavorites();
    }
    function addFavoriteEntry(url, title) {
      const nextUrl = String(url || '').trim();
      if (!nextUrl) return false;
      if (!isHistoryEligible(nextUrl)) return false;
      const nextTitle = String(title || inferTabTitleFromUrl(nextUrl) || getDefaultTabTitle()).trim() || getDefaultTabTitle();
      favoriteEntries = favoriteEntries.filter(item => String(item && item.url ? item.url : '').trim() !== nextUrl);
      favoriteEntries.unshift({ url: nextUrl, title: nextTitle, addedAt: Date.now() });
      if (favoriteEntries.length > MAX_FAVORITES) favoriteEntries.length = MAX_FAVORITES;
      persistFavorites();
      updateToolbarStates();
      if (panelMode === 'favorites') renderSidePanel();
      showTransientStatus(tr('browserFavoriteAdded', 'Added to favorites.'), 'success', 2200);
      return true;
    }
    function removeFavoriteEntry(url) {
      const nextUrl = String(url || '').trim();
      if (!nextUrl) return false;
      const before = favoriteEntries.length;
      favoriteEntries = favoriteEntries.filter(item => String(item && item.url ? item.url : '').trim() !== nextUrl);
      if (favoriteEntries.length === before) return false;
      persistFavorites();
      updateToolbarStates();
      if (panelMode === 'favorites') renderSidePanel();
      showTransientStatus(tr('browserFavoriteRemoved', 'Removed from favorites.'), 'muted', 2200);
      return true;
    }
    function toggleFavoriteForActiveTab() {
      const tab = getActiveTab();
      const url = String(tab && tab.url ? tab.url : '').trim();
      if (!url || !isHistoryEligible(url)) return;
      if (isFavoriteUrl(url)) removeFavoriteEntry(url);
      else addFavoriteEntry(url, getTabTitle(tab));
    }
    function updateToolbarStates() {
      if (restoreTabBtn) restoreTabBtn.disabled = closedTabs.length === 0;
      const activeTabModel = getActiveTab();
      const activeUrl = String(activeTabModel && activeTabModel.url ? activeTabModel.url : '').trim();
      const canFavorite = !!activeUrl && isHistoryEligible(activeUrl);
      const favorited = canFavorite && isFavoriteUrl(activeUrl);
      if (favoriteBtn) {
        favoriteBtn.disabled = !canFavorite;
        favoriteBtn.dataset.active = favorited ? 'true' : 'false';
        const label = favorited
          ? tr('browserFavoriteCancel', 'Unfavorite')
          : tr('browserFavoriteToggle', 'Favorite');
        if (favoriteBtn.textContent !== label) favoriteBtn.textContent = label;
        favoriteBtn.title = favorited
          ? tr('browserFavoriteRemove', 'Remove favorite')
          : tr('browserFavoriteAdd', 'Add favorite');
      }
      if (favoritesBtn) favoritesBtn.dataset.active = panelMode === 'favorites' ? 'true' : 'false';
      if (downloadsBtn) downloadsBtn.dataset.active = panelMode === 'downloads' ? 'true' : 'false';
      if (historyBtn) historyBtn.dataset.active = panelMode === 'history' ? 'true' : 'false';
      if (siteDataBtn) siteDataBtn.dataset.active = panelMode === 'data' ? 'true' : 'false';
      if (devToolsBtn) devToolsBtn.dataset.active = devPanelVisible ? 'true' : 'false';
      if (panelTabHistoryBtn) panelTabHistoryBtn.classList.toggle('active', panelMode === 'history');
      if (panelTabFavoritesBtn) panelTabFavoritesBtn.classList.toggle('active', panelMode === 'favorites');
      if (panelTabDataBtn) panelTabDataBtn.classList.toggle('active', panelMode === 'data');
    }
    function rememberClosedTab(tab) {
      if (!tab || !tab.url) return;
      closedTabs.unshift({
        url: String(tab.url),
        title: getTabTitle(tab),
        defaultTitle: !!tab.defaultTitle,
        favicon: String(tab.favicon || ''),
        closedAt: Date.now()
      });
      if (closedTabs.length > MAX_CLOSED_TABS) closedTabs.length = MAX_CLOSED_TABS;
      persistClosedTabs();
      updateToolbarStates();
      if (panelMode === 'history') renderSidePanel();
    }
    function recordHistoryEntry(url, title) {
      const nextUrl = String(url || '').trim();
      if (!isHistoryEligible(nextUrl)) return;
      const nextTitle = String(title || inferTabTitleFromUrl(nextUrl) || getDefaultTabTitle()).trim();
      const now = Date.now();
      const first = historyEntries[0];
      if (first && first.url === nextUrl && now - Number(first.visitedAt || 0) < 15000) {
        first.title = nextTitle;
        first.visitedAt = now;
      } else {
        historyEntries.unshift({ url: nextUrl, title: nextTitle, visitedAt: now });
        if (historyEntries.length > MAX_HISTORY_ENTRIES) historyEntries.length = MAX_HISTORY_ENTRIES;
      }
      persistHistoryEntries();
      updateFavoriteForUrl(nextUrl, nextTitle);
      if (panelMode === 'history') renderSidePanel();
    }
    let favoritesFilter = '';
    function renderFavoritesActions() {
      if (!panelActionsEl) return;
      panelActionsEl.innerHTML = `
        <div class="br-panel-row">
          <input type="text" id="br-fav-search" class="br-panel-search" placeholder="${escapeHtml(tr('browserFavoritesSearch', 'Search favorites'))}" value="${escapeHtml(favoritesFilter)}">
        </div>
      `;
      const searchInput = panelActionsEl.querySelector('#br-fav-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          favoritesFilter = searchInput.value;
          renderFavoritesBody();
        });
      }
    }
    function renderFavoritesBody() {
      if (!sidePanelBodyEl) return;
      const needle = String(favoritesFilter || '').trim().toLowerCase();
      const filtered = needle
        ? favoriteEntries.filter(item => {
          const u = String(item && item.url ? item.url : '').toLowerCase();
          const ti = String(item && item.title ? item.title : '').toLowerCase();
          return u.includes(needle) || ti.includes(needle);
        })
        : favoriteEntries;
      const listHtml = filtered.length
        ? filtered.map((item, index) => `
            <div class="br-fav-card" data-fav-index="${index}">
              <button type="button" class="br-history-item br-fav-open" data-fav-open="${escapeHtml(String(item.url || ''))}">
                <span class="br-history-title">${escapeHtml(item.title || inferTabTitleFromUrl(item.url))}</span>
                <span class="br-history-url">${escapeHtml(item.url)}</span>
                <span class="br-history-time">${escapeHtml(formatHistoryTime(item.addedAt || Date.now()))}</span>
              </button>
              <button type="button" class="br-fav-remove br-danger" data-fav-remove="${escapeHtml(String(item.url || ''))}">${escapeHtml(tr('browserFavoriteRemove', 'Remove favorite'))}</button>
            </div>
          `).join('')
        : `<div class="br-empty">${escapeHtml(tr('browserNoFavorites', 'No favorites yet.'))}</div>`;
      sidePanelBodyEl.innerHTML = `
        <section>
          <div class="br-panel-section-title">${escapeHtml(tr('browserFavorites', tr('bookmarks', 'Bookmarks')))}</div>
          ${listHtml}
        </section>
      `;
      sidePanelBodyEl.querySelectorAll('[data-fav-open]').forEach(btn => {
        btn.addEventListener('click', () => {
          const url = btn.getAttribute('data-fav-open');
          if (url) addTab(url);
          panelMode = null;
          renderSidePanel();
        });
      });
      sidePanelBodyEl.querySelectorAll('[data-fav-remove]').forEach(btn => {
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const url = btn.getAttribute('data-fav-remove');
          if (url) removeFavoriteEntry(url);
        });
      });
    }
    function renderSidePanel() {
      if (!sidePanelEl || !sidePanelBodyEl) return;
      const visible = panelMode === 'history';
      sidePanelEl.classList.toggle('hidden', !visible);
      updateToolbarStates();
      if (!visible) return;
      if (sidePanelTitleEl) sidePanelTitleEl.textContent = tr('history', 'History');
      const historyHtml = renderHistoryEntriesGroupedHtml();
      sidePanelBodyEl.innerHTML = `
        <section>
          <div class="br-panel-section-title">${escapeHtml(tr('history', 'History'))}</div>
          ${historyHtml}
        </section>
      `;
      sidePanelBodyEl.querySelectorAll('[data-history-index]').forEach(btn => {
        btn.addEventListener('click', () => {
          const entry = historyEntries[parseInt(btn.getAttribute('data-history-index'), 10)];
          if (!entry) return;
          navigateActiveTab(entry.url);
          panelMode = null;
          renderSidePanel();
        });
      });
    }
    function togglePanel(mode) {
      panelMode = panelMode === mode ? null : mode;
      renderSidePanel();
    }
    function restoreClosedTabAt(index) {
      if (index < 0 || index >= closedTabs.length) {
        showTransientStatus(tr('browserNoClosedTabs', 'No recently closed tabs.'), 'muted');
        return;
      }
      const snapshot = closedTabs.splice(index, 1)[0];
      persistClosedTabs();
      addTab(snapshot.url, { seed: snapshot });
      showTransientStatus(tr('browserRestoreClosedTabDone', 'Restored the most recently closed tab.'), 'success');
      renderSidePanel();
    }

    function getCookieQueryUrl() {
      const tab = getActiveTab();
      const url = String(tab && tab.url ? tab.url : '').trim();
      return /^(https?):/i.test(url) ? url : '';
    }
    function getCookieScopeKey() {
      return cookieScope === 'current' ? ('current:' + getCookieQueryUrl()) : 'all';
    }
    function getCookieScopeLabel() {
      if (cookieScope !== 'current') return tr('browserCookieAllSites', 'All sites');
      const currentUrl = getCookieQueryUrl();
      if (!currentUrl) return tr('browserCookieCurrentSite', 'Current site');
      try {
        return new URL(currentUrl).hostname || tr('browserCookieCurrentSite', 'Current site');
      } catch (_) {
        return tr('browserCookieCurrentSite', 'Current site');
      }
    }
    function cloneCookieDraft(source) {
      return {
        name: String(source && source.name ? source.name : ''),
        value: String(source && source.value != null ? source.value : ''),
        domain: String(source && source.domain ? source.domain : ''),
        path: String(source && source.path ? source.path : '/'),
        sameSite: COOKIE_SAMESITE_VALUES.includes(String(source && source.sameSite ? source.sameSite : ''))
          ? String(source.sameSite)
          : 'lax',
        expirationDate: source && source.expirationDate != null && Number.isFinite(Number(source.expirationDate))
          ? Number(source.expirationDate)
          : null,
        session: !!(source && source.session),
        secure: !!(source && source.secure),
        httpOnly: !!(source && source.httpOnly),
        hostOnly: !!(source && source.hostOnly),
        url: String(source && source.url ? source.url : '')
      };
    }
    function buildDefaultCookieDraft() {
      const currentUrl = getCookieQueryUrl();
      let domain = '';
      let secure = false;
      try {
        if (currentUrl) {
          const parsed = new URL(currentUrl);
          domain = parsed.hostname || '';
          secure = parsed.protocol === 'https:';
        }
      } catch (_) {}
      return {
        name: '',
        value: '',
        domain,
        path: '/',
        sameSite: 'lax',
        expirationDate: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000),
        session: false,
        secure,
        httpOnly: false,
        hostOnly: false,
        url: currentUrl
      };
    }
    function toDateTimeLocalValue(expirationDate) {
      const seconds = Number(expirationDate);
      if (!Number.isFinite(seconds) || seconds <= 0) return '';
      const date = new Date(seconds * 1000);
      if (Number.isNaN(date.getTime())) return '';
      const pad = value => String(value).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    function formatCookieExpiry(entry) {
      if (!entry || entry.session || !Number.isFinite(Number(entry.expirationDate))) {
        return tr('browserCookieSession', 'Session');
      }
      const date = new Date(Number(entry.expirationDate) * 1000);
      try {
        return date.toLocaleString(getLocale());
      } catch (_) {
        return date.toLocaleString();
      }
    }
    function formatCookieSameSite(value) {
      const normalized = String(value || '').toLowerCase();
      if (normalized === 'strict') return tr('browserCookieSameSiteStrict', 'Strict');
      if (normalized === 'no_restriction') return tr('browserCookieSameSiteNone', 'None');
      if (normalized === 'unspecified') return tr('browserCookieSameSiteUnspecified', 'Unspecified');
      return tr('browserCookieSameSiteLax', 'Lax');
    }
    function getFilteredCookieEntries() {
      const keyword = String(cookieFilter || '').trim().toLowerCase();
      if (!keyword) return cookieEntries.slice();
      return cookieEntries.filter(entry => {
        return [entry.name, entry.value, entry.domain, entry.path, entry.url]
          .some(value => String(value || '').toLowerCase().includes(keyword));
      });
    }
    function invalidateCookiePanelIfNeeded() {
      if (panelMode === 'data' && cookieScope === 'current') {
        cookieLoadedForKey = '';
      }
    }
    function readCookieDraftFromDom() {
      if (!cookieEditor) return null;
      const form = sidePanelBodyEl ? sidePanelBodyEl.querySelector('.br-cookie-editor') : null;
      if (!form) return cloneCookieDraft(cookieEditor.draft || buildDefaultCookieDraft());
      const sessionCheckbox = form.querySelector('#br-cookie-session');
      const expirationInput = form.querySelector('#br-cookie-expiration');
      const isSession = !!(sessionCheckbox && sessionCheckbox.checked);
      let expirationDate = null;
      if (!isSession && expirationInput && expirationInput.value) {
        const parsed = Date.parse(expirationInput.value);
        if (Number.isFinite(parsed)) expirationDate = Math.floor(parsed / 1000);
      }
      return {
        name: String((form.querySelector('#br-cookie-name') || {}).value || '').trim(),
        value: String((form.querySelector('#br-cookie-value') || {}).value || ''),
        domain: String((form.querySelector('#br-cookie-domain') || {}).value || '').trim(),
        path: String((form.querySelector('#br-cookie-path') || {}).value || '/').trim() || '/',
        sameSite: String((form.querySelector('#br-cookie-samesite') || {}).value || 'lax').trim() || 'lax',
        expirationDate,
        session: isSession,
        secure: !!((form.querySelector('#br-cookie-secure') || {}).checked),
        httpOnly: !!((form.querySelector('#br-cookie-http-only') || {}).checked),
        hostOnly: !!(cookieEditor.draft && cookieEditor.draft.hostOnly),
        url: String(cookieEditor.draft && cookieEditor.draft.url ? cookieEditor.draft.url : getCookieQueryUrl())
      };
    }
    function syncCookieDraftFromDom() {
      const nextDraft = readCookieDraftFromDom();
      if (cookieEditor && nextDraft) cookieEditor.draft = nextDraft;
    }
    function openCookieEditor(mode, entry) {
      cookieEditor = {
        mode,
        original: mode === 'edit' && entry ? { name: entry.name, url: entry.url } : null,
        draft: mode === 'edit' && entry ? cloneCookieDraft({
          name: entry.name,
          value: entry.value,
          domain: String(entry.domain || '').replace(/^\.+/, ''),
          path: entry.path,
          sameSite: entry.sameSite,
          expirationDate: entry.expirationDate,
          session: entry.session,
          secure: entry.secure,
          httpOnly: entry.httpOnly,
          hostOnly: entry.hostOnly,
          url: entry.url
        }) : buildDefaultCookieDraft()
      };
      renderCookieBody();
    }
    async function loadCookieEntries(force) {
      const scopeKey = getCookieScopeKey();
      if (!force && (cookieLoading || cookieLoadedForKey === scopeKey)) return;
      if (cookieScope === 'current' && !getCookieQueryUrl()) {
        cookieEntries = [];
        cookieLoading = false;
        cookieLoadedForKey = scopeKey;
        if (panelMode === 'data') renderCookieBody();
        return;
      }
      cookieLoading = true;
      if (panelMode === 'data') renderCookieBody();
      const requestId = ++cookieLoadRequestId;
      const result = await ipcRenderer.invoke('browser:listCookies', cookieScope === 'current' ? { url: getCookieQueryUrl() } : {});
      if (requestId !== cookieLoadRequestId) return;
      cookieLoading = false;
      if (result && result.error) {
        cookieEntries = [];
        cookieLoadedForKey = '';
        showTransientStatus(
          tr('browserCookieLoadFailed', 'Failed to load cookies: {message}', { message: result.error }),
          'error',
          3600
        );
        if (panelMode === 'data') renderCookieBody();
        return;
      }
      cookieEntries = Array.isArray(result)
        ? result
        : (result && Array.isArray(result.cookies) ? result.cookies : []);
      cookieLoadedForKey = scopeKey;
      if (panelMode === 'data') renderCookieBody();
    }
    async function clearHistoryEntries() {
      if (!historyEntries.length) {
        showTransientStatus(tr('browserNoHistory', 'No browsing history yet.'), 'muted');
        return;
      }
      const confirmed = window.StarDialog && typeof window.StarDialog.confirm === 'function'
        ? await window.StarDialog.confirm({
          title: tr('browserClearHistory', 'Clear history'),
          message: tr('browserClearHistoryConfirm', 'Clear all browsing history for the built-in browser?'),
          okText: tr('browserClearHistory', 'Clear history'),
          cancelText: tr('cancel', 'Cancel')
        })
        : false;
      if (!confirmed) return;
      historyEntries = [];
      persistHistoryEntries();
      renderSidePanel();
      showTransientStatus(tr('browserHistoryCleared', 'Browsing history cleared.'), 'success');
    }
    function renderCookieEditorHtml() {
      if (!cookieEditor) return '';
      const draft = cloneCookieDraft(cookieEditor.draft || buildDefaultCookieDraft());
      const title = cookieEditor.mode === 'edit'
        ? tr('browserCookieEdit', 'Edit cookie')
        : tr('browserCookieAdd', 'Add cookie');
      const sameSiteOptions = [
        { value: 'unspecified', label: tr('browserCookieSameSiteUnspecified', 'Unspecified') },
        { value: 'lax', label: tr('browserCookieSameSiteLax', 'Lax') },
        { value: 'strict', label: tr('browserCookieSameSiteStrict', 'Strict') },
        { value: 'no_restriction', label: tr('browserCookieSameSiteNone', 'None') }
      ].map(option => `<option value="${escapeHtml(option.value)}"${draft.sameSite === option.value ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join('');
      return `
        <section class="br-cookie-editor">
          <div class="br-editor-title">${escapeHtml(title)}</div>
          <div class="br-cookie-grid">
            <label class="br-field">
              <span>${escapeHtml(tr('browserCookieName', 'Cookie name'))}</span>
              <input id="br-cookie-name" type="text" value="${escapeHtml(draft.name)}">
            </label>
            <label class="br-field">
              <span>${escapeHtml(tr('browserCookieDomain', 'Domain'))}</span>
              <input id="br-cookie-domain" type="text" value="${escapeHtml(draft.domain)}">
            </label>
            <label class="br-field">
              <span>${escapeHtml(tr('browserCookiePath', 'Path'))}</span>
              <input id="br-cookie-path" type="text" value="${escapeHtml(draft.path || '/')}">
            </label>
            <label class="br-field">
              <span>${escapeHtml(tr('browserCookieSameSite', 'SameSite'))}</span>
              <select id="br-cookie-samesite">${sameSiteOptions}</select>
            </label>
            <label class="br-field">
              <span>${escapeHtml(tr('browserCookieExpires', 'Expires'))}</span>
              <input id="br-cookie-expiration" type="datetime-local" value="${escapeHtml(toDateTimeLocalValue(draft.expirationDate))}"${draft.session ? ' disabled' : ''}>
            </label>
            <label class="br-field br-field-wide">
              <span>${escapeHtml(tr('browserCookieValue', 'Value'))}</span>
              <textarea id="br-cookie-value">${escapeHtml(draft.value)}</textarea>
            </label>
          </div>
          <div class="br-toggle-row">
            <label class="br-toggle"><input id="br-cookie-session" type="checkbox"${draft.session ? ' checked' : ''}> <span>${escapeHtml(tr('browserCookieSession', 'Session'))}</span></label>
            <label class="br-toggle"><input id="br-cookie-secure" type="checkbox"${draft.secure ? ' checked' : ''}> <span>${escapeHtml(tr('browserCookieSecure', 'Secure'))}</span></label>
            <label class="br-toggle"><input id="br-cookie-http-only" type="checkbox"${draft.httpOnly ? ' checked' : ''}> <span>${escapeHtml(tr('browserCookieHttpOnly', 'HttpOnly'))}</span></label>
          </div>
          <div class="br-card-actions">
            <button type="button" id="br-cookie-save" class="start-footer-btn">${escapeHtml(tr('browserCookieSave', 'Save'))}</button>
            <button type="button" id="br-cookie-cancel" class="start-footer-btn">${escapeHtml(tr('browserCookieCancel', 'Cancel'))}</button>
          </div>
        </section>
      `;
    }
    async function saveCookieDraft() {
      syncCookieDraftFromDom();
      const draft = cookieEditor && cookieEditor.draft ? cloneCookieDraft(cookieEditor.draft) : null;
      if (!draft) return;
      if (!draft.name) {
        const message = tr('browserCookieNameRequired', 'Cookie name is required.');
        showBrowserDialogAlert(tr('browserCookieSave', 'Save'), message);
        showTransientStatus(message, 'error', 3200);
        return;
      }
      if (!draft.domain) {
        const message = tr('browserCookieDomainRequired', 'Cookie domain is required.');
        showBrowserDialogAlert(tr('browserCookieSave', 'Save'), message);
        showTransientStatus(message, 'error', 3200);
        return;
      }
      const result = await ipcRenderer.invoke('browser:setCookie', {
        cookie: {
          name: draft.name,
          value: draft.value,
          domain: draft.domain,
          path: draft.path,
          sameSite: draft.sameSite,
          expirationDate: draft.expirationDate,
          session: draft.session,
          secure: draft.secure,
          httpOnly: draft.httpOnly
        },
        original: cookieEditor.original
      });
      if (result && result.error) {
        const message = tr('browserCookieSaveFailed', 'Failed to save cookie: {message}', { message: result.error });
        showBrowserDialogAlert(tr('browserCookieSave', 'Save'), message);
        showTransientStatus(message, 'error', 3600);
        return;
      }
      cookieEditor = null;
      cookieLoadedForKey = '';
      await loadCookieEntries(true);
      renderSidePanel();
      showTransientStatus(tr('browserCookieSaved', 'Cookie saved.'), 'success', 3200);
    }
    async function deleteCookieEntry(index) {
      const filteredEntries = getFilteredCookieEntries();
      const entry = filteredEntries[index];
      if (!entry) return;
      const confirmed = window.StarDialog && typeof window.StarDialog.confirm === 'function'
        ? await window.StarDialog.confirm({
          title: tr('browserCookieDelete', 'Delete'),
          message: tr('browserCookieDeleteConfirm', 'Delete cookie "{name}"?', { name: entry.name || '' }),
          okText: tr('browserCookieDelete', 'Delete'),
          cancelText: tr('cancel', 'Cancel')
        })
        : false;
      if (!confirmed) return;
      const result = await ipcRenderer.invoke('browser:removeCookie', {
        name: entry.name,
        url: entry.url,
        domain: entry.domain,
        path: entry.path,
        secure: entry.secure
      });
      if (result && result.error) {
        const message = tr('browserCookieDeleteFailed', 'Failed to delete cookie: {message}', { message: result.error });
        showBrowserDialogAlert(tr('browserCookieDelete', 'Delete'), message);
        showTransientStatus(message, 'error', 3600);
        return;
      }
      if (cookieEditor && cookieEditor.original && cookieEditor.original.name === entry.name && cookieEditor.original.url === entry.url) {
        cookieEditor = null;
      }
      cookieLoadedForKey = '';
      await loadCookieEntries(true);
      renderSidePanel();
      showTransientStatus(tr('browserCookieDeleted', 'Cookie deleted.'), 'success', 3200);
    }
    function updateToolbarStates() {
      if (restoreTabBtn) restoreTabBtn.disabled = closedTabs.length === 0;
      const activeModel = getActiveTab();
      const activeUrl = String(activeModel && activeModel.url ? activeModel.url : '').trim();
      const canFavorite = !!activeUrl && isHistoryEligible(activeUrl);
      const favorited = canFavorite && isFavoriteUrl(activeUrl);
      if (favoriteBtn) {
        favoriteBtn.disabled = !canFavorite;
        favoriteBtn.dataset.active = favorited ? 'true' : 'false';
        const label = favorited
          ? tr('browserFavoriteCancel', 'Unfavorite')
          : tr('browserFavoriteToggle', 'Favorite');
        if (favoriteBtn.textContent !== label) favoriteBtn.textContent = label;
        favoriteBtn.title = favorited
          ? tr('browserFavoriteRemove', 'Remove favorite')
          : tr('browserFavoriteAdd', 'Add favorite');
      }
      if (favoritesBtn) favoritesBtn.dataset.active = panelMode === 'favorites' ? 'true' : 'false';
      if (downloadsBtn) downloadsBtn.dataset.active = panelMode === 'downloads' ? 'true' : 'false';
      if (historyBtn) historyBtn.dataset.active = panelMode === 'history' ? 'true' : 'false';
      if (siteDataBtn) siteDataBtn.dataset.active = panelMode === 'data' ? 'true' : 'false';
      if (devToolsBtn) devToolsBtn.dataset.active = devPanelVisible ? 'true' : 'false';
      if (panelTabHistoryBtn) panelTabHistoryBtn.classList.toggle('active', panelMode === 'history');
      if (panelTabFavoritesBtn) panelTabFavoritesBtn.classList.toggle('active', panelMode === 'favorites');
      if (panelTabDataBtn) panelTabDataBtn.classList.toggle('active', panelMode === 'data');
    }
    function renderHistoryBody() {
      if (!sidePanelBodyEl) return;
      const historyHtml = renderHistoryEntriesGroupedHtml();
      sidePanelBodyEl.innerHTML = `
        <section>
          <div class="br-panel-section-title">${escapeHtml(tr('history', 'History'))}</div>
          ${historyHtml}
        </section>
      `;
      sidePanelBodyEl.querySelectorAll('[data-history-index]').forEach(btn => {
        btn.addEventListener('click', () => {
          const entry = historyEntries[parseInt(btn.getAttribute('data-history-index'), 10)];
          if (!entry) return;
          navigateActiveTab(entry.url);
          panelMode = null;
          renderSidePanel();
        });
      });
    }
    async function loadDownloadEntries(force) {
      if (downloadsLoading) return downloadsLoadPromise;
      const shouldShowLoadingState = !downloadsLoadedOnce && !downloadEntries.length;
      downloadsLoading = true;
      if (shouldShowLoadingState && panelMode === 'downloads') renderDownloadsBody();
      downloadsLoadPromise = (async () => {
        let result = null;
        try {
          result = await ipcRenderer.invoke('browser:listDownloads');
        } catch (_) {
          result = { error: 'browser:listDownloads failed' };
        }
        downloadsLoading = false;
        downloadsLoadPromise = null;
        if (result && !result.error) {
          const list = Array.isArray(result.downloads) ? result.downloads : [];
          downloadEntries = list.slice().sort((a, b) => Number(b.startTime || 0) - Number(a.startTime || 0));
          downloadsLoadedOnce = true;
        }
        if (panelMode === 'downloads') renderDownloadsBody();
        return result;
      })();
      return downloadsLoadPromise;
    }
    function getFilteredDownloadEntries() {
      const keyword = String(downloadsFilter || '').trim().toLowerCase();
      if (!keyword) return downloadEntries.slice();
      return downloadEntries.filter(entry => {
        return [entry.fileName, entry.url, entry.state]
          .some(value => String(value || '').toLowerCase().includes(keyword));
      });
    }
    function renderDownloadsActions() {
      if (!panelActionsEl) return;
      const markup = `
        <div class="br-panel-row">
          <input type="text" id="br-download-search" class="br-panel-search" placeholder="${escapeHtml(tr('browserDownloadSearch', 'Search downloads'))}" value="${escapeHtml(downloadsFilter)}">
        </div>
        <div class="br-panel-row compact">
          <button type="button" id="br-download-refresh" class="start-footer-btn">${escapeHtml(tr('browserDownloadRefresh', 'Refresh'))}</button>
          <button type="button" id="br-download-clear-finished" class="start-footer-btn">${escapeHtml(tr('browserDownloadClearFinished', 'Clear finished'))}</button>
        </div>
      `;
      if (panelActionsEl.innerHTML === markup) return;
      panelActionsEl.innerHTML = markup;
      panelActionsEl.dataset.panelMode = 'downloads';
      panelActionsEl.dataset.downloadMarkup = markup;
      const searchInput = panelActionsEl.querySelector('#br-download-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          downloadsFilter = searchInput.value;
          renderDownloadsBody();
        });
      }
      const refreshBtn = panelActionsEl.querySelector('#br-download-refresh');
      if (refreshBtn) refreshBtn.addEventListener('click', () => loadDownloadEntries(true));
      const clearBtn = panelActionsEl.querySelector('#br-download-clear-finished');
      if (clearBtn) clearBtn.addEventListener('click', async () => {
        await ipcRenderer.invoke('browser:downloadAction', { id: '__all__', action: 'clearFinished' });
        loadDownloadEntries(true);
      });
    }
    function getDownloadActionErrorMessage(result, action) {
      const code = String(result && result.errorCode ? result.errorCode : '').trim();
      const details = String(result && result.errorDetails ? result.errorDetails : '').trim();
      if (code === 'browserDownloadRemoveActive') {
        return tr('browserDownloadRemoveActive', 'Cannot remove an active download.');
      }
      if (code === 'browserDownloadDeleteLocalFailed') {
        return tr('browserDownloadDeleteLocalFailed', 'Failed to delete the local file: {message}', {
          message: details || String(result && result.error ? result.error : '')
        });
      }
      if (code === 'browserDownloadRecordNotFound') {
        return tr('browserDownloadRecordNotFound', 'Download record not found.');
      }
      if (code === 'browserDownloadIdRequired') {
        return tr('browserDownloadIdRequired', 'Download id is required.');
      }
      if (code === 'browserDownloadDeleteLocalUnavailable') {
        return tr('browserDownloadDeleteLocalUnavailable', 'This download does not have a local file to delete.');
      }
      return String(result && result.error ? result.error : '');
    }
    async function confirmDownloadRemoval(entry) {
      if (!(window.StarDialog && typeof window.StarDialog.confirm === 'function')) {
        return { confirmed: false, deleteLocalFile: false };
      }
      const hasLocalFile = !!String(entry && entry.savePath ? entry.savePath : '').trim();
      const selection = await window.StarDialog.confirm({
        title: tr('browserDownloadDeleteTitle', 'Delete download'),
        message: tr('browserDownloadDeleteConfirm', 'Remove "{file}" from Downloads?', {
          file: entry && entry.fileName ? entry.fileName : tr('browserDownloadUnnamed', 'Unnamed file')
        }),
        okText: tr('delete', 'Delete'),
        cancelText: tr('cancel', 'Cancel'),
        html: `
          <div class="star-dialog__choice-list">
            <label class="star-dialog__choice">
              <input type="radio" name="download-remove-mode" value="list" checked>
              <span class="star-dialog__choice-text">
                <span class="star-dialog__choice-title">${escapeHtml(tr('browserDownloadDeleteKeepFileTitle', 'Only remove from the download list'))}</span>
                <span class="star-dialog__choice-desc">${escapeHtml(tr('browserDownloadDeleteKeepFileDesc', 'Keep the downloaded file on local disk.'))}</span>
              </span>
            </label>
            <label class="star-dialog__choice${hasLocalFile ? '' : ' is-disabled'}">
              <input type="radio" name="download-remove-mode" value="local"${hasLocalFile ? '' : ' disabled'}>
              <span class="star-dialog__choice-text">
                <span class="star-dialog__choice-title">${escapeHtml(tr('browserDownloadDeleteLocalTitle', 'Also delete the local file'))}</span>
                <span class="star-dialog__choice-desc">${escapeHtml(
                  hasLocalFile
                    ? tr('browserDownloadDeleteLocalDesc', 'Remove the record and delete the downloaded file from local disk.')
                    : tr('browserDownloadDeleteLocalUnavailable', 'This download does not have a local file to delete.')
                )}</span>
              </span>
            </label>
          </div>
        `,
        getResult(overlay) {
          const checked = overlay.querySelector('input[name="download-remove-mode"]:checked');
          return {
            confirmed: true,
            deleteLocalFile: !!(checked && checked.value === 'local' && hasLocalFile)
          };
        }
      });
      if (!selection || selection.confirmed !== true) {
        return { confirmed: false, deleteLocalFile: false };
      }
      return selection;
    }
    function renderDownloadsBody() {
      if (!sidePanelBodyEl) return;
      const filteredEntries = getFilteredDownloadEntries();
      let markup = '';
      if (downloadsLoading && !downloadsLoadedOnce && !downloadEntries.length) {
        markup = `<div class="br-empty">${escapeHtml(tr('browserDownloadLoading', 'Loading downloads...'))}</div>`;
      } else if (!filteredEntries.length) {
        markup = `<div class="br-empty">${escapeHtml(tr('browserDownloadEmpty', 'No downloads yet.'))}</div>`;
      } else {
        markup = `<section><div class="br-cookie-list">` + filteredEntries.map((entry, index) => {
        const total = Number(entry.totalBytes) || 0;
        const recv = Number(entry.receivedBytes) || 0;
        const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((recv / total) * 100))) : 0;
        const state = String(entry.state || 'unknown');
        const stateLabel = tr(`browserDownloadState_${state}`, state);
        const canPause = state === 'downloading';
        const canResume = state === 'paused' || (state === 'interrupted' && !!entry.canResume);
        const canCancel = state === 'downloading' || state === 'paused';
        const canRetry = state === 'failed' || state === 'interrupted' || state === 'cancelled';
        const canRemove = state !== 'downloading' && state !== 'paused';
        return `
          <article class="br-cookie-card" data-download-index="${index}">
            <div class="br-cookie-card-head">
              <div style="min-width:0;flex:1;">
                <div class="br-cookie-name">${escapeHtml(entry.fileName || tr('browserDownloadUnnamed', 'Unnamed file'))}</div>
                <div class="br-cookie-domain">${escapeHtml(entry.url || '')}</div>
              </div>
              <div class="br-card-actions">
                <button type="button" class="start-footer-btn" data-download-action="open"${state === 'completed' ? '' : ' disabled'}>${escapeHtml(tr('open', 'Open'))}</button>
                <button type="button" class="start-footer-btn" data-download-action="reveal">${escapeHtml(tr('browserDownloadReveal', 'Show in folder'))}</button>
              </div>
            </div>
            <div class="br-cookie-meta">
              <span class="br-cookie-badge">${escapeHtml(tr('browserDownloadState', 'State') + ': ' + stateLabel)}</span>
              <span class="br-cookie-badge">${escapeHtml(formatDownloadBytes(recv) + (total > 0 ? (' / ' + formatDownloadBytes(total)) : ''))}</span>
              ${total > 0 ? `<span class="br-cookie-badge">${escapeHtml(String(percent) + '%')}</span>` : ''}
            </div>
            <div class="br-card-actions" style="margin-top:10px;">
              <button type="button" class="start-footer-btn" data-download-action="pause"${canPause ? '' : ' disabled'}>${escapeHtml(tr('pause', 'Pause'))}</button>
              <button type="button" class="start-footer-btn" data-download-action="resume"${canResume ? '' : ' disabled'}>${escapeHtml(tr('resume', 'Resume'))}</button>
              <button type="button" class="start-footer-btn" data-download-action="cancel"${canCancel ? '' : ' disabled'}>${escapeHtml(tr('cancel', 'Cancel'))}</button>
              <button type="button" class="start-footer-btn" data-download-action="retry"${canRetry ? '' : ' disabled'}>${escapeHtml(tr('browserDownloadRetry', 'Retry'))}</button>
              <button type="button" class="start-footer-btn br-danger-btn" data-download-action="remove"${canRemove ? '' : ' disabled'}>${escapeHtml(tr('delete', 'Delete'))}</button>
            </div>
          </article>
        `;
        }).join('') + `</div></section>`;
      }
      if (sidePanelBodyEl.innerHTML === markup) return;
      sidePanelBodyEl.innerHTML = markup;
      sidePanelBodyEl.dataset.panelMode = 'downloads';
      sidePanelBodyEl.dataset.downloadMarkup = markup;

      sidePanelBodyEl.querySelectorAll('[data-download-index]').forEach(card => {
        const idx = parseInt(card.getAttribute('data-download-index'), 10);
        const entry = filteredEntries[idx];
        if (!entry || !entry.id) return;
        card.querySelectorAll('[data-download-action]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const action = String(btn.getAttribute('data-download-action') || '').trim();
            if (!action) return;
            if (action === 'open') {
              const handled = await openPathInStarOs(entry.savePath, entry.fileName);
              if (!handled) {
                showTransientStatus(tr('browserDownloadActionFailed', 'Download action failed: {message}', {
                  message: tr('browserDownloadOpenUnavailable', 'Unable to open this file inside Star OS.')
                }), 'error', 3000);
                return;
              }
              loadDownloadEntries(true);
              return;
            }
            if (action === 'reveal') {
              const handled = revealPathInStarFileManager(entry.savePath);
              if (!handled) {
                showTransientStatus(tr('browserDownloadActionFailed', 'Download action failed: {message}', {
                  message: tr('browserDownloadRevealUnavailable', 'Unable to open the containing folder inside Star OS.')
                }), 'error', 3000);
                return;
              }
              loadDownloadEntries(true);
              return;
            }
            const requestPayload = { id: entry.id, action };
            let deleteLocalFile = false;
            if (action === 'remove') {
              const decision = await confirmDownloadRemoval(entry);
              if (!decision || !decision.confirmed) return;
              deleteLocalFile = !!decision.deleteLocalFile;
              requestPayload.deleteLocalFile = deleteLocalFile;
            }
            const result = await ipcRenderer.invoke('browser:downloadAction', requestPayload);
            if (result && result.error) {
              showTransientStatus(tr('browserDownloadActionFailed', 'Download action failed: {message}', {
                message: getDownloadActionErrorMessage(result, action)
              }), 'error', 3000);
              return;
            }
            if (action === 'remove') {
              showTransientStatus(
                deleteLocalFile
                  ? tr('browserDownloadRemovedWithFile', 'Download record and local file deleted.')
                  : tr('browserDownloadRemoved', 'Download removed from the list.'),
                'success',
                2600
              );
            }
            loadDownloadEntries(true);
          });
        });
      });
    }
    function getActiveWebview() {
      const tab = getActiveTab();
      return tab && tab.webview ? tab.webview : null;
    }
    function getTabWebContentsId(tab) {
      const view = tab && tab.webview ? tab.webview : null;
      if (!view || typeof view.getWebContentsId !== 'function') return 0;
      try {
        const id = Number(view.getWebContentsId());
        return Number.isFinite(id) && id > 0 ? id : 0;
      } catch (_) {
        return 0;
      }
    }
    function getActiveWebContentsId() {
      return getTabWebContentsId(getActiveTab());
    }
    function maybeCloseDownloadPlaceholderTab(downloadRecord) {
      if (!downloadRecord || tabs.length <= 1) return false;
      const sourceContentsId = Number(downloadRecord.sourceContentsId || 0);
      if (!sourceContentsId) return false;
      const tabIndex = tabs.findIndex(tab => getTabWebContentsId(tab) === sourceContentsId);
      if (tabIndex < 0) return false;
      const tab = tabs[tabIndex];
      if (!tab) return false;
      const tabUrl = String(tab.url || '').trim();
      const downloadUrl = String(downloadRecord.url || '').trim();
      const title = getTabTitle(tab);
      const inferredTitle = inferTabTitleFromUrl(tabUrl);
      const createdAt = Number(tab.createdAt || 0);
      const looksTemporary = !createdAt || (Date.now() - createdAt) < 15000;
      const isBlankLike = !tabUrl || /^about:blank$/i.test(tabUrl);
      const matchesDownloadUrl = !!downloadUrl && !!tabUrl && tabUrl === downloadUrl;
      const titleLooksAuto = !!tab.defaultTitle || !title || title === getDefaultTabTitle() || title === inferredTitle;
      const hasHistory = !!tab.canGoBack || !!tab.canGoForward;
      if (hasHistory || !looksTemporary) return false;
      if (!(isBlankLike || matchesDownloadUrl || titleLooksAuto)) return false;
      closeTab(tabIndex, { remember: false });
      return true;
    }
    function stopDevPanelPerfTimer() {
      if (!devPanelPerfTimer) return;
      clearInterval(devPanelPerfTimer);
      devPanelPerfTimer = null;
    }
    function ensureDevPanelPerfTimer() {
      if (devPanelPerfTimer) return;
      devPanelPerfTimer = setInterval(() => {
        if (!container || !container.isConnected) {
          stopDevPanelPerfTimer();
          return;
        }
        if (!devPanelVisible || devPanelMode !== 'performance') {
          stopDevPanelPerfTimer();
          return;
        }
        loadDevPanelPerfSnapshot(true);
      }, 2200);
    }
    function formatDevTimestamp(timestamp) {
      const date = new Date(Number(timestamp) || Date.now());
      try {
        return date.toLocaleTimeString(getLocale(), { hour12: false });
      } catch (_) {
        return date.toLocaleTimeString();
      }
    }
    function formatDevDuration(ms) {
      const value = Number(ms);
      if (!Number.isFinite(value) || value <= 0) return '-';
      if (value < 1000) return `${Math.round(value)} ms`;
      return `${(value / 1000).toFixed(2)} s`;
    }
    function formatMetricBytes(bytes) {
      const value = Number(bytes);
      if (!Number.isFinite(value) || value <= 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let next = value;
      let idx = 0;
      while (next >= 1024 && idx < units.length - 1) {
        next /= 1024;
        idx += 1;
      }
      const digits = idx === 0 ? 0 : (next >= 100 ? 0 : (next >= 10 ? 1 : 2));
      return `${next.toFixed(digits)} ${units[idx]}`;
    }
    async function loadDevPanelNetworkEntries(force) {
      if (devPanelNetworkLoading && !force) return;
      devPanelNetworkLoading = true;
      if (devPanelVisible && devPanelMode === 'network') renderDevPanelBody();
      const webContentsId = getActiveWebContentsId();
      if (!webContentsId) {
        devPanelNetworkLoading = false;
        devPanelNetworkEntries = [];
        if (devPanelVisible && devPanelMode === 'network') renderDevPanelBody();
        return;
      }
      let result = null;
      try {
        result = await ipcRenderer.invoke('browser:listNetworkEvents', {
          webContentsId,
          limit: 500
        });
      } catch (_) {
        result = { error: 'browser:listNetworkEvents failed' };
      }
      devPanelNetworkLoading = false;
      if (result && !result.error) {
        devPanelNetworkEntries = Array.isArray(result.entries) ? result.entries : [];
      }
      if (devPanelVisible && devPanelMode === 'network') renderDevPanelBody();
    }
    function getFilteredDevPanelNetworkEntries() {
      const keyword = String(devPanelFilter || '').trim().toLowerCase();
      if (!keyword) return devPanelNetworkEntries.slice();
      return devPanelNetworkEntries.filter(entry => {
        return [
          entry.url,
          entry.method,
          entry.resourceType,
          entry.state,
          entry.statusCode
        ].some(value => String(value == null ? '' : value).toLowerCase().includes(keyword));
      });
    }
    async function collectActiveWebviewPerf() {
      const view = getActiveWebview();
      if (!view || typeof view.executeJavaScript !== 'function') return null;
      try {
        return await view.executeJavaScript(`(() => {
          const nav = (performance.getEntriesByType && performance.getEntriesByType('navigation') || [])[0] || null;
          const timing = (performance && performance.timing) ? performance.timing : null;
          const memory = (performance && performance.memory) ? performance.memory : null;
          const now = (performance && typeof performance.now === 'function') ? performance.now() : 0;
          return {
            href: String(location.href || ''),
            title: String(document.title || ''),
            now,
            nav: nav ? {
              domContentLoaded: Number(nav.domContentLoadedEventEnd || 0),
              loadEventEnd: Number(nav.loadEventEnd || 0),
              responseEnd: Number(nav.responseEnd || 0),
              transferSize: Number(nav.transferSize || 0),
              encodedBodySize: Number(nav.encodedBodySize || 0),
              decodedBodySize: Number(nav.decodedBodySize || 0),
              type: String(nav.type || '')
            } : null,
            timing: timing ? {
              navigationStart: Number(timing.navigationStart || 0),
              domContentLoadedEventEnd: Number(timing.domContentLoadedEventEnd || 0),
              loadEventEnd: Number(timing.loadEventEnd || 0)
            } : null,
            memory: memory ? {
              jsHeapSizeLimit: Number(memory.jsHeapSizeLimit || 0),
              totalJSHeapSize: Number(memory.totalJSHeapSize || 0),
              usedJSHeapSize: Number(memory.usedJSHeapSize || 0)
            } : null
          };
        })()`, true);
      } catch (_) {
        return null;
      }
    }
    async function loadDevPanelPerfSnapshot(force) {
      if (devPanelVisible && devPanelMode === 'performance' && !force) renderDevPanelBody();
      const webContentsId = getActiveWebContentsId();
      if (!webContentsId) {
        devPanelPerfSnapshot = null;
        if (devPanelVisible && devPanelMode === 'performance') renderDevPanelBody();
        return;
      }
      let mainSnapshot = null;
      try {
        const result = await ipcRenderer.invoke('browser:getPerfSnapshot', { webContentsId });
        if (result && !result.error) mainSnapshot = result.snapshot || null;
      } catch (_) {
        mainSnapshot = null;
      }
      const pageSnapshot = await collectActiveWebviewPerf();
      devPanelPerfSnapshot = {
        capturedAt: Date.now(),
        main: mainSnapshot,
        page: pageSnapshot
      };
      if (devPanelVisible && devPanelMode === 'performance') renderDevPanelBody();
    }
    async function collectActiveWebviewStorage() {
      const view = getActiveWebview();
      if (!view || typeof view.executeJavaScript !== 'function') return null;
      try {
        return await view.executeJavaScript(`(() => {
          const toList = (store) => {
            const out = [];
            try {
              for (let i = 0; i < store.length; i += 1) {
                const key = store.key(i);
                const value = store.getItem(key);
                out.push({
                  key: String(key || ''),
                  bytes: String(key || '').length + String(value || '').length
                });
              }
            } catch (_) {}
            out.sort((a, b) => Number(b.bytes || 0) - Number(a.bytes || 0));
            return out.slice(0, 12);
          };
          return {
            href: String(location.href || ''),
            localCount: (() => { try { return Number(localStorage.length || 0); } catch (_) { return 0; } })(),
            sessionCount: (() => { try { return Number(sessionStorage.length || 0); } catch (_) { return 0; } })(),
            localItems: (() => { try { return toList(localStorage); } catch (_) { return []; } })(),
            sessionItems: (() => { try { return toList(sessionStorage); } catch (_) { return []; } })(),
            indexedDbSupported: !!(window.indexedDB)
          };
        })()`, true);
      } catch (_) {
        return null;
      }
    }
    async function loadDevPanelStorageSnapshot(force) {
      if (devPanelVisible && devPanelMode === 'storage' && !force) renderDevPanelBody();
      const tab = getActiveTab();
      const currentUrl = String(tab && tab.url ? tab.url : '').trim();
      let cookieCount = 0;
      try {
        const result = await ipcRenderer.invoke('browser:listCookies', { url: currentUrl });
        if (result && !result.error && Array.isArray(result.cookies)) cookieCount = result.cookies.length;
      } catch (_) {
        cookieCount = 0;
      }
      const pageStorage = await collectActiveWebviewStorage();
      devPanelStorageSnapshot = {
        capturedAt: Date.now(),
        cookieCount,
        page: pageStorage
      };
      if (devPanelVisible && devPanelMode === 'storage') renderDevPanelBody();
    }
    function renderDevPanelActions() {
      if (!devPanelActionsEl) return;
      devPanelActionsEl.innerHTML = `
        <div class="br-panel-row compact">
          <div class="br-panel-spacer"></div>
          <button type="button" id="br-dev-refresh" class="start-footer-btn">${escapeHtml(tr('browserDownloadRefresh', 'Refresh'))}</button>
          ${devPanelMode === 'network'
            ? `<button type="button" id="br-dev-clear-network" class="start-footer-btn br-danger-btn">${escapeHtml(tr('browserDevClearNetwork', 'Clear network log'))}</button>`
            : ''}
        </div>
        ${devPanelMode === 'network'
          ? `<div class="br-panel-row">
              <input type="text" id="br-dev-search" class="br-panel-search" placeholder="${escapeHtml(tr('browserDevNetworkSearch', 'Filter URL / method / status'))}" value="${escapeHtml(devPanelFilter)}">
            </div>`
          : ''}
      `;
      const refreshBtn = devPanelActionsEl.querySelector('#br-dev-refresh');
      if (refreshBtn) refreshBtn.addEventListener('click', () => {
        if (devPanelMode === 'network') loadDevPanelNetworkEntries(true);
        else if (devPanelMode === 'performance') loadDevPanelPerfSnapshot(true);
        else if (devPanelMode === 'storage') loadDevPanelStorageSnapshot(true);
        else if (devPanelMode === 'source') loadDevPanelPageSource(true);
      });
      const clearNetworkBtn = devPanelActionsEl.querySelector('#br-dev-clear-network');
      if (clearNetworkBtn) clearNetworkBtn.addEventListener('click', async () => {
        await ipcRenderer.invoke('browser:clearNetworkEvents');
        devPanelNetworkEntries = [];
        renderDevPanelBody();
      });
      const searchInput = devPanelActionsEl.querySelector('#br-dev-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          devPanelFilter = searchInput.value;
          renderDevPanelBody();
        });
      }
    }
    function renderDevPanelBody() {
      if (!devPanelBodyEl) return;
      if (devPanelMode === 'network') {
        if (devPanelNetworkLoading) {
          devPanelBodyEl.innerHTML = `<div class="br-empty">${escapeHtml(tr('browserDevLoadingNetwork', 'Collecting network requests...'))}</div>`;
          return;
        }
        const list = getFilteredDevPanelNetworkEntries();
        if (!list.length) {
          devPanelBodyEl.innerHTML = `<div class="br-empty">${escapeHtml(tr('browserDevNoNetwork', 'No network requests captured for this tab yet.'))}</div>`;
          return;
        }
        devPanelBodyEl.innerHTML = `<section><div class="br-cookie-list">` + list.map((entry, netIx) => {
          const state = String(entry.state || '');
          const statusText = state === 'error'
            ? tr('browserDownloadState_failed', 'Failed')
            : String(entry.statusCode || '-');
          const durationText = formatDevDuration(entry.durationMs);
          const eid = String(entry.id || '');
          const expanded = eid && eid === String(devPanelExpandedNetId || '');
          const cacheLabel = entry.fromCache ? tr('yes', 'Yes') : tr('no', 'No');
          const ipText = String(entry.ip || '').trim() || '—';
          return `
            <article class="br-cookie-card" data-net-id="${escapeHtml(eid)}">
              <div class="br-cookie-card-head">
                <div style="min-width:0;flex:1;">
                  <div class="br-cookie-name">${escapeHtml(String(entry.method || 'GET'))} · ${escapeHtml(String(entry.resourceType || 'other'))}</div>
                  <div class="br-cookie-domain">${escapeHtml(String(entry.url || ''))}</div>
                </div>
                <div class="br-card-actions">
                  <span class="br-cookie-badge">${escapeHtml(statusText)}</span>
                  <button type="button" class="start-footer-btn" data-net-toggle="${escapeHtml(eid)}">${escapeHtml(expanded ? tr('browserDevNetHideDetails', 'Hide details') : tr('browserDevNetShowDetails', 'Details'))}</button>
                </div>
              </div>
              <div class="br-cookie-meta">
                <span class="br-cookie-badge">${escapeHtml(tr('browserDevRequestTime', 'Time') + ': ' + formatDevTimestamp(entry.timestamp))}</span>
                <span class="br-cookie-badge">${escapeHtml(tr('browserDevRequestDuration', 'Duration') + ': ' + durationText)}</span>
                ${entry.error ? `<span class="br-cookie-badge">${escapeHtml(tr('browserDevRequestError', 'Error') + ': ' + String(entry.error))}</span>` : ''}
              </div>
              ${expanded ? `
                <div class="br-net-detail">
                  <div class="br-net-detail-row"><span class="br-net-detail-k">${escapeHtml(tr('browserDevNetState', 'State'))}</span><span class="br-net-detail-v">${escapeHtml(state)}</span></div>
                  <div class="br-net-detail-row"><span class="br-net-detail-k">${escapeHtml(tr('browserDevNetFromCache', 'From cache'))}</span><span class="br-net-detail-v">${escapeHtml(cacheLabel)}</span></div>
                  <div class="br-net-detail-row"><span class="br-net-detail-k">${escapeHtml(tr('browserDevNetIp', 'Remote IP'))}</span><span class="br-net-detail-v">${escapeHtml(ipText)}</span></div>
                  <div class="br-net-detail-row"><span class="br-net-detail-k">${escapeHtml(tr('browserDevNetId', 'Log id'))}</span><span class="br-net-detail-v">${escapeHtml(eid || '—')}</span></div>
                  <div class="br-panel-row compact" style="margin-top:6px;">
                    <button type="button" class="start-footer-btn" data-net-copy-ix="${netIx}">${escapeHtml(tr('browserDevCopyUrl', 'Copy URL'))}</button>
                  </div>
                </div>
              ` : ''}
            </article>
          `;
        }).join('') + `</div></section>`;
        devPanelBodyEl.querySelectorAll('[data-net-toggle]').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = String(btn.getAttribute('data-net-toggle') || '');
            devPanelExpandedNetId = (devPanelExpandedNetId === id) ? '' : id;
            renderDevPanelBody();
          });
        });
        devPanelBodyEl.querySelectorAll('[data-net-copy-ix]').forEach(btn => {
          btn.addEventListener('click', () => {
            const ix = parseInt(btn.getAttribute('data-net-copy-ix') || '', 10);
            const row = list[ix];
            const u = row && row.url ? String(row.url) : '';
            if (!u) return;
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).catch(() => {});
              else {
                const ta = document.createElement('textarea');
                ta.value = u;
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); } catch (_) {}
                ta.remove();
              }
              showTransientStatus(tr('browserDevCopied', 'Copied.'), 'success', 1600);
            } catch (_) {}
          });
        });
        return;
      }
      if (devPanelMode === 'performance') {
        const snap = devPanelPerfSnapshot;
        if (!snap) {
          devPanelBodyEl.innerHTML = `<div class="br-empty">${escapeHtml(tr('browserDevNoPerformance', 'No performance snapshot yet.'))}</div>`;
          return;
        }
        const main = snap.main || {};
        const page = snap.page || {};
        const mem = (main && main.memory) || {};
        const pageMem = (page && page.memory) || {};
        const nav = (page && page.nav) || null;
        devPanelBodyEl.innerHTML = `
          <section>
            <div class="br-panel-section-title">${escapeHtml(tr('browserDevProcessMetrics', 'Process metrics'))}</div>
            <div class="br-cookie-list">
              <article class="br-cookie-card">
                <div class="br-cookie-meta">
                  <span class="br-cookie-badge">PID: ${escapeHtml(String(main.pid || '-'))}</span>
                  <span class="br-cookie-badge">CPU: ${escapeHtml((Number(main.cpuPercent || 0)).toFixed(1))}%</span>
                  <span class="br-cookie-badge">${escapeHtml(tr('memory', 'Memory'))}: ${escapeHtml(formatMetricBytes(Number(mem.workingSetSize || 0) * 1024))}</span>
                </div>
                <div class="br-cookie-expiry">${escapeHtml(tr('browserDevCapturedAt', 'Captured at'))}: ${escapeHtml(formatHistoryTime(snap.capturedAt || Date.now()))}</div>
              </article>
              <article class="br-cookie-card">
                <div class="br-panel-section-title">${escapeHtml(tr('browserDevPageMetrics', 'Page metrics'))}</div>
                <div class="br-cookie-meta">
                  <span class="br-cookie-badge">${escapeHtml(tr('browserDevDomContentLoaded', 'DOM Ready'))}: ${escapeHtml(formatDevDuration(nav && nav.domContentLoaded))}</span>
                  <span class="br-cookie-badge">${escapeHtml(tr('browserDevLoadEvent', 'Load Event'))}: ${escapeHtml(formatDevDuration(nav && nav.loadEventEnd))}</span>
                  <span class="br-cookie-badge">${escapeHtml(tr('browserDevTransferSize', 'Transfer'))}: ${escapeHtml(formatMetricBytes(nav && nav.transferSize))}</span>
                  <span class="br-cookie-badge">${escapeHtml(tr('browserDevJsHeapUsed', 'JS Heap Used'))}: ${escapeHtml(formatMetricBytes(pageMem.usedJSHeapSize || 0))}</span>
                </div>
                <div class="br-cookie-domain">${escapeHtml(String(page.href || ''))}</div>
              </article>
            </div>
          </section>
        `;
        return;
      }
      if (devPanelMode === 'source') {
        const tab = getActiveTab();
        if (devPanelSourceLoading) {
          devPanelBodyEl.innerHTML = `<div class="br-empty">${escapeHtml(tr('browserDevLoadingSource', 'Loading page source...'))}</div>`;
          return;
        }
        if (!tab || !tab.domReady) {
          devPanelBodyEl.innerHTML = `<div class="br-empty">${escapeHtml(tr('browserDevSourceNeedPage', 'Open a page and wait until it finishes loading to view source.'))}</div>`;
          return;
        }
        const truncNote = devPanelSourceTruncated
          ? `<div class="br-empty" style="border-style:solid;">${escapeHtml(tr('browserDevSourceTruncated', 'Source was truncated for performance. Use Refresh after save or copy visible portion.'))}</div>`
          : '';
        devPanelBodyEl.innerHTML = `
          <section class="br-dev-source-wrap">
            <div class="br-dev-source-toolbar">
              <button type="button" id="br-dev-copy-source" class="start-footer-btn">${escapeHtml(tr('browserDevCopySource', 'Copy source'))}</button>
              <button type="button" id="br-dev-download-source" class="start-footer-btn">${escapeHtml(tr('browserDevDownloadSource', 'Download source'))}</button>
              <span class="br-cookie-badge">${escapeHtml(tr('browserDevSourceBytes', '{count} characters', { count: String((devPanelSourceHtml || '').length) }))}</span>
            </div>
            ${truncNote}
            <pre class="br-dev-source-pre" id="br-dev-source-pre">${escapeHtml(devPanelSourceHtml || '')}</pre>
          </section>
        `;
        const copySrc = devPanelBodyEl.querySelector('#br-dev-copy-source');
        const downloadSrc = devPanelBodyEl.querySelector('#br-dev-download-source');
        if (copySrc) {
          copySrc.addEventListener('click', () => {
            const text = devPanelSourceHtml || '';
            if (!text) return;
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
              else {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); } catch (_) {}
                ta.remove();
              }
              showTransientStatus(tr('browserDevCopied', 'Copied.'), 'success', 1800);
            } catch (_) {}
          });
        }
        if (downloadSrc) {
          downloadSrc.addEventListener('click', async () => {
            const text = String(devPanelSourceHtml || '');
            const tabTitle = String(getTabTitle(tab) || '').trim();
            const baseName = (tabTitle || 'page')
              .replace(/[\\/:*?"<>|]+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            const fileName = (baseName || 'page') + '.html';
            const view = getActiveWebview();
            if (!text || !view || typeof view.executeJavaScript !== 'function') {
              showTransientStatus(tr('browserDevSourceDownloadFailed', 'Unable to download source for current page.'), 'error', 2000);
              return;
            }
            try {
              const result = await view.executeJavaScript(`(() => {
                try {
                  const html = ${JSON.stringify(text)};
                  const fileName = ${JSON.stringify(fileName)};
                  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = fileName;
                  a.style.display = 'none';
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => {
                    try { URL.revokeObjectURL(url); } catch (_) {}
                    try { a.remove(); } catch (_) {}
                  }, 1200);
                  return { ok: true };
                } catch (err) {
                  return { ok: false, error: String(err && err.message ? err.message : err) };
                }
              })()`, true);
              if (result && result.ok) {
                showTransientStatus(tr('browserDevSourceDownloadStarted', 'Source download started in Downloads.'), 'success', 2200);
              } else {
                showTransientStatus(tr('browserDevSourceDownloadFailed', 'Unable to download source for current page.'), 'error', 2200);
              }
            } catch (_) {
              showTransientStatus(tr('browserDevSourceDownloadFailed', 'Unable to download source for current page.'), 'error', 2200);
            }
          });
        }
        return;
      }
      const storage = devPanelStorageSnapshot;
      if (!storage) {
        devPanelBodyEl.innerHTML = `<div class="br-empty">${escapeHtml(tr('browserDevNoStorage', 'No storage snapshot yet.'))}</div>`;
        return;
      }
      const page = storage.page || {};
      const localItems = Array.isArray(page.localItems) ? page.localItems : [];
      const sessionItems = Array.isArray(page.sessionItems) ? page.sessionItems : [];
      const renderStorageList = (items) => {
        if (!items.length) return `<div class="br-empty">${escapeHtml(tr('browserDevNoStorageItems', 'No keys'))}</div>`;
        return items.map(item => `
          <div class="br-cookie-meta">
            <span class="br-cookie-badge">${escapeHtml(String(item.key || ''))}</span>
            <span class="br-cookie-badge">${escapeHtml(formatMetricBytes(item.bytes || 0))}</span>
          </div>
        `).join('');
      };
      devPanelBodyEl.innerHTML = `
        <section>
          <div class="br-panel-section-title">${escapeHtml(tr('browserDevStorageSummary', 'Storage summary'))}</div>
          <div class="br-cookie-list">
            <article class="br-cookie-card">
              <div class="br-cookie-meta">
                <span class="br-cookie-badge">Cookie: ${escapeHtml(String(storage.cookieCount || 0))}</span>
                <span class="br-cookie-badge">localStorage: ${escapeHtml(String(page.localCount || 0))}</span>
                <span class="br-cookie-badge">sessionStorage: ${escapeHtml(String(page.sessionCount || 0))}</span>
                <span class="br-cookie-badge">IndexedDB: ${escapeHtml(page.indexedDbSupported ? tr('yes', 'Yes') : tr('no', 'No'))}</span>
              </div>
              <div class="br-cookie-expiry">${escapeHtml(tr('browserDevCapturedAt', 'Captured at'))}: ${escapeHtml(formatHistoryTime(storage.capturedAt || Date.now()))}</div>
              <div class="br-cookie-domain">${escapeHtml(String(page.href || ''))}</div>
            </article>
            <article class="br-cookie-card">
              <div class="br-panel-section-title">${escapeHtml(tr('browserDevLocalStorageTop', 'Top localStorage keys'))}</div>
              ${renderStorageList(localItems)}
            </article>
            <article class="br-cookie-card">
              <div class="br-panel-section-title">${escapeHtml(tr('browserDevSessionStorageTop', 'Top sessionStorage keys'))}</div>
              ${renderStorageList(sessionItems)}
            </article>
          </div>
        </section>
      `;
    }
    function renderCookieBody() {
      if (!sidePanelBodyEl) return;
      const filteredEntries = getFilteredCookieEntries();
      const summary = tr(
        'browserCookieSummary',
        'Showing {shown} of {total} cookies · {scope}',
        {
          shown: String(filteredEntries.length),
          total: String(cookieEntries.length),
          scope: getCookieScopeLabel()
        }
      );
      let bodyHtml = '';
      if (cookieEditor) bodyHtml += renderCookieEditorHtml();
      bodyHtml += `<section><div class="br-cookie-summary"><span>${escapeHtml(summary)}</span><span>${escapeHtml(tr('browserCookieCount', '{count} items', { count: String(cookieEntries.length) }))}</span></div>`;
      if (cookieLoading) {
        bodyHtml += `<div class="br-empty">${escapeHtml(tr('browserCookieLoading', 'Loading cookies...'))}</div>`;
      } else if (cookieScope === 'current' && !getCookieQueryUrl()) {
        bodyHtml += `<div class="br-empty">${escapeHtml(tr('browserCookieCurrentUnavailable', 'Open a webpage first or switch to all sites to inspect cookies.'))}</div>`;
      } else if (!filteredEntries.length) {
        bodyHtml += `<div class="br-empty">${escapeHtml(tr('browserCookieEmpty', 'No cookies match the current filter.'))}</div>`;
      } else {
        bodyHtml += `<div class="br-cookie-list">` + filteredEntries.map((entry, index) => {
          const badges = [];
          if (entry.session) badges.push(tr('browserCookieSession', 'Session'));
          if (entry.secure) badges.push(tr('browserCookieSecure', 'Secure'));
          if (entry.httpOnly) badges.push(tr('browserCookieHttpOnly', 'HttpOnly'));
          if (entry.hostOnly) badges.push(tr('browserCookieHostOnly', 'HostOnly'));
          badges.push(`${tr('browserCookieSameSite', 'SameSite')}: ${formatCookieSameSite(entry.sameSite)}`);
          return `
            <article class="br-cookie-card">
              <div class="br-cookie-card-head">
                <div style="min-width:0;flex:1;">
                  <div class="br-cookie-name">${escapeHtml(entry.name || tr('browserCookieUnnamed', '(unnamed)'))}</div>
                  <div class="br-cookie-domain">${escapeHtml(String(entry.domain || '') + '  ' + String(entry.path || '/'))}</div>
                </div>
                <div class="br-card-actions">
                  <button type="button" class="start-footer-btn" data-cookie-edit="${index}">${escapeHtml(tr('browserCookieEdit', 'Edit'))}</button>
                  <button type="button" class="start-footer-btn br-danger-btn" data-cookie-delete="${index}">${escapeHtml(tr('browserCookieDelete', 'Delete'))}</button>
                </div>
              </div>
              <div class="br-cookie-value">${escapeHtml(entry.value || '')}</div>
              <div class="br-cookie-meta">${badges.map(label => `<span class="br-cookie-badge">${escapeHtml(label)}</span>`).join('')}</div>
              <div class="br-cookie-expiry">${escapeHtml(tr('browserCookieExpires', 'Expires'))}: ${escapeHtml(formatCookieExpiry(entry))}</div>
            </article>
          `;
        }).join('') + `</div>`;
      }
      bodyHtml += `</section>`;
      sidePanelBodyEl.innerHTML = bodyHtml;
      const sessionCheckbox = sidePanelBodyEl.querySelector('#br-cookie-session');
      const expirationInput = sidePanelBodyEl.querySelector('#br-cookie-expiration');
      if (sessionCheckbox && expirationInput) {
        sessionCheckbox.addEventListener('change', () => {
          expirationInput.disabled = sessionCheckbox.checked;
          syncCookieDraftFromDom();
        });
      }
      sidePanelBodyEl.querySelectorAll('#br-cookie-name,#br-cookie-domain,#br-cookie-path,#br-cookie-value,#br-cookie-samesite,#br-cookie-expiration,#br-cookie-session,#br-cookie-secure,#br-cookie-http-only').forEach(el => {
        const eventName = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(eventName, syncCookieDraftFromDom);
        if (eventName !== 'change') el.addEventListener('change', syncCookieDraftFromDom);
      });
      const saveBtn = sidePanelBodyEl.querySelector('#br-cookie-save');
      if (saveBtn) saveBtn.addEventListener('click', saveCookieDraft);
      const cancelBtn = sidePanelBodyEl.querySelector('#br-cookie-cancel');
      if (cancelBtn) cancelBtn.addEventListener('click', () => {
        cookieEditor = null;
        renderCookieBody();
      });
      sidePanelBodyEl.querySelectorAll('[data-cookie-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
          const entry = filteredEntries[parseInt(btn.getAttribute('data-cookie-edit'), 10)];
          if (!entry) return;
          openCookieEditor('edit', entry);
        });
      });
      sidePanelBodyEl.querySelectorAll('[data-cookie-delete]').forEach(btn => {
        btn.addEventListener('click', () => deleteCookieEntry(parseInt(btn.getAttribute('data-cookie-delete'), 10)));
      });
    }
    function renderHistoryActions() {
      if (!panelActionsEl) return;
      panelActionsEl.innerHTML = `
        <div class="br-panel-row compact">
          <button type="button" id="br-panel-clear-history" class="start-footer-btn">${escapeHtml(tr('browserClearHistory', 'Clear history'))}</button>
        </div>
      `;
      const clearBtn = panelActionsEl.querySelector('#br-panel-clear-history');
      if (clearBtn) clearBtn.addEventListener('click', clearHistoryEntries);
    }
    function renderCookieActions() {
      if (!panelActionsEl) return;
      panelActionsEl.innerHTML = `
        <div class="br-panel-row">
          <input type="text" id="br-cookie-search" class="br-panel-search" placeholder="${escapeHtml(tr('browserCookieSearch', 'Search cookies'))}" value="${escapeHtml(cookieFilter)}">
        </div>
        <div class="br-panel-row compact">
          <div class="br-scope-group">
            <button type="button" class="br-scope-btn ${cookieScope === 'current' ? 'active' : ''}" data-cookie-scope="current">${escapeHtml(tr('browserCookieCurrentSite', 'Current site'))}</button>
            <button type="button" class="br-scope-btn ${cookieScope === 'all' ? 'active' : ''}" data-cookie-scope="all">${escapeHtml(tr('browserCookieAllSites', 'All sites'))}</button>
          </div>
          <div class="br-panel-spacer"></div>
          <button type="button" id="br-cookie-refresh" class="start-footer-btn">${escapeHtml(tr('browserCookieRefresh', 'Refresh'))}</button>
          <button type="button" id="br-cookie-add" class="start-footer-btn">${escapeHtml(tr('browserCookieAdd', 'Add'))}</button>
          <button type="button" id="br-cookie-clear" class="start-footer-btn br-danger-btn">${escapeHtml(tr('browserClearData', 'Clear data'))}</button>
        </div>
      `;
      const searchInput = panelActionsEl.querySelector('#br-cookie-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          cookieFilter = searchInput.value;
          renderCookieBody();
        });
      }
      panelActionsEl.querySelectorAll('[data-cookie-scope]').forEach(btn => {
        btn.addEventListener('click', () => {
          cookieScope = btn.getAttribute('data-cookie-scope') === 'all' ? 'all' : 'current';
          cookieLoadedForKey = '';
          renderSidePanel();
        });
      });
      const refreshBtn = panelActionsEl.querySelector('#br-cookie-refresh');
      if (refreshBtn) refreshBtn.addEventListener('click', () => {
        cookieLoadedForKey = '';
        loadCookieEntries(true);
      });
      const addBtn = panelActionsEl.querySelector('#br-cookie-add');
      if (addBtn) addBtn.addEventListener('click', () => openCookieEditor('add'));
      const clearBtn = panelActionsEl.querySelector('#br-cookie-clear');
      if (clearBtn) clearBtn.addEventListener('click', clearBrowserData);
    }
    function renderSidePanel() {
      if (!sidePanelEl || !sidePanelBodyEl || !panelActionsEl) return;
      const visible = panelMode === 'history' || panelMode === 'favorites' || panelMode === 'data' || panelMode === 'downloads';
      sidePanelEl.classList.toggle('hidden', !visible);
      updateToolbarStates();
      if (!visible) {
        layoutBrowserPanelOffsets();
        return;
      }
      // Downloads should be a dedicated page: hide unrelated panel tabs (bookmarks/history/site data).
      if (panelTabsEl) panelTabsEl.style.display = panelMode === 'downloads' ? 'none' : '';
      if (sidePanelKickerEl) sidePanelKickerEl.textContent = tr('browserSidebar', 'Browser sidebar');
      if (panelMode === 'downloads') {
        if (sidePanelTitleEl) sidePanelTitleEl.textContent = tr('browserDownloads', 'Downloads');
        if (sidePanelHintEl) sidePanelHintEl.textContent = tr('browserDownloadsHint', 'Manage download queue, retry failed items, and open completed files.');
        stopDevPanelPerfTimer();
        renderDownloadsActions();
        renderDownloadsBody();
        loadDownloadEntries();
      } else if (panelMode === 'data') {
        if (sidePanelTitleEl) sidePanelTitleEl.textContent = tr('browserSiteData', 'Site data');
        if (sidePanelHintEl) sidePanelHintEl.textContent = tr('browserSiteDataHint', 'Inspect cookies and saved login state, then edit or remove entries one by one.');
        stopDevPanelPerfTimer();
        renderCookieActions();
        renderCookieBody();
        loadCookieEntries();
      } else if (panelMode === 'favorites') {
        if (sidePanelTitleEl) sidePanelTitleEl.textContent = tr('browserFavorites', tr('bookmarks', 'Bookmarks'));
        if (sidePanelHintEl) sidePanelHintEl.textContent = tr('browserFavoritesTabHint', 'Saved pages you marked as favorites will appear here.');
        stopDevPanelPerfTimer();
        renderFavoritesActions();
        renderFavoritesBody();
      } else {
        if (sidePanelTitleEl) sidePanelTitleEl.textContent = tr('history', 'History');
        if (sidePanelHintEl) sidePanelHintEl.textContent = tr('browserHistoryTabHint', 'Visited pages are shown here.');
        stopDevPanelPerfTimer();
        renderHistoryActions();
        renderHistoryBody();
      }
      layoutBrowserPanelOffsets();
    }
    function togglePanel(mode) {
      panelMode = panelMode === mode ? null : mode;
      renderSidePanel();
    }
    function restoreClosedTabAt(index) {
      if (index < 0 || index >= closedTabs.length) {
        showTransientStatus(tr('browserNoClosedTabs', 'No recently closed tabs.'), 'muted');
        return;
      }
      const snapshot = closedTabs.splice(index, 1)[0];
      persistClosedTabs();
      addTab(snapshot.url, { seed: snapshot });
      showTransientStatus(tr('browserRestoreClosedTabDone', 'Restored the most recently closed tab.'), 'success');
      renderSidePanel();
    }

    function getActiveTab() {
      return tabs[activeTab] || null;
    }
    function ensureTabExists() {
      if (!tabs.length) addTab(getHomepage());
    }
    function createTabModel(url, seed) {
      const finalUrl = normalizeBrowserUrl(url);
      return {
        id: 'br-tab-' + (++tabSeed),
        url: finalUrl,
        createdAt: seed && Number(seed.createdAt) ? Number(seed.createdAt) : Date.now(),
        title: seed && seed.title ? String(seed.title) : getDefaultTabTitle(),
        defaultTitle: seed && typeof seed.defaultTitle === 'boolean' ? !!seed.defaultTitle : !(seed && seed.title),
        favicon: seed && seed.favicon ? String(seed.favicon) : '',
        canGoBack: false,
        canGoForward: false,
        loading: true,
        webview: null,
        domReady: false,
        pendingUrl: finalUrl,
        pendingDevTools: false,
        pendingLoadFeedback: null
      };
    }
    function syncAddressBar(url) {
      if (brUrl) brUrl.value = url || '';
    }
    function refreshTabNavState(tab) {
      if (!tab) return;
      let canGoBack = false;
      let canGoForward = false;
      const view = tab.webview;
      if (view && tab.domReady) {
        try { canGoBack = !!view.canGoBack(); } catch (_) {}
        try { canGoForward = !!view.canGoForward(); } catch (_) {}
      }
      tab.canGoBack = canGoBack;
      tab.canGoForward = canGoForward;
    }
    function updateNavButtons() {
      const tab = getActiveTab();
      refreshTabNavState(tab);
      const canGoBack = !!(tab && tab.canGoBack);
      const canGoForward = !!(tab && tab.canGoForward);
      if (backBtn) {
        backBtn.disabled = !canGoBack;
        backBtn.style.opacity = canGoBack ? '1' : '0.5';
        backBtn.style.cursor = canGoBack ? 'pointer' : 'not-allowed';
      }
      if (forwardBtn) {
        forwardBtn.disabled = !canGoForward;
        forwardBtn.style.opacity = canGoForward ? '1' : '0.5';
        forwardBtn.style.cursor = canGoForward ? 'pointer' : 'not-allowed';
      }
    }
    function ensureTabTitle(tab, explicitTitle) {
      if (!tab) return false;
      const cleaned = String(explicitTitle || '').trim();
      const nextTitle = cleaned || inferTabTitleFromUrl(tab.url) || getDefaultTabTitle();
      const nextDefaultTitle = !cleaned;
      let changed = false;
      if (tab.title !== nextTitle) {
        tab.title = nextTitle;
        changed = true;
      }
      if (tab.defaultTitle !== nextDefaultTitle) {
        tab.defaultTitle = nextDefaultTitle;
        changed = true;
      }
      return changed;
    }
    function syncTabFromWebview(tab, options) {
      if (!tab || !tab.webview) return;
      let changed = false;
      let nextUrl = tab.url || '';
      let nextTitle = '';
      try {
        if (typeof tab.webview.getURL === 'function') nextUrl = tab.webview.getURL() || nextUrl;
      } catch (_) {}
      if (nextUrl && tab.url !== nextUrl) {
        tab.url = nextUrl;
        changed = true;
      }
      try {
        if (!tab.favicon && typeof tab.webview.getURL === 'function') {
          const currentUrl = String(tab.webview.getURL() || '').trim();
          if (!currentUrl || /^about:blank$/i.test(currentUrl) || /^star-file:\/\//i.test(currentUrl) || /^file:\/\//i.test(currentUrl)) {
            tab.favicon = '';
          }
        }
      } catch (_) {}
      try {
        if (typeof tab.webview.getTitle === 'function') nextTitle = String(tab.webview.getTitle() || '').trim();
      } catch (_) {}
      if (ensureTabTitle(tab, nextTitle)) changed = true;
      const prevBack = !!tab.canGoBack;
      const prevForward = !!tab.canGoForward;
      refreshTabNavState(tab);
      if (prevBack !== !!tab.canGoBack || prevForward !== !!tab.canGoForward) changed = true;
      if (tab === getActiveTab() && brUrl && brUrl.value !== (tab.url || '')) syncAddressBar(tab.url);
      if (options && options.commitHistory) recordHistoryEntry(tab.url, getTabTitle(tab));
      if (changed || (options && options.forceRender)) renderTabs();
      updateNavButtons();
    }
    function syncTabFromNavigation(tab, nextUrl) {
      if (!tab) return;
      let changed = false;
      if (nextUrl && tab.url !== nextUrl) {
        tab.url = nextUrl;
        changed = true;
      }
      if (ensureTabTitle(tab, '')) changed = true;
      const prevBack = !!tab.canGoBack;
      const prevForward = !!tab.canGoForward;
      refreshTabNavState(tab);
      if (prevBack !== !!tab.canGoBack || prevForward !== !!tab.canGoForward) changed = true;
      if (tab === getActiveTab()) syncAddressBar(tab.url);
      if (changed) renderTabs();
      recordHistoryEntry(tab.url, getTabTitle(tab));
      updateNavButtons();
      if (tab === getActiveTab()) {
        invalidateCookiePanelIfNeeded();
        if (panelMode === 'data' || devPanelVisible) renderSidePanel();
        if (devPanelVisible) {
          devPanelExpandedNetId = '';
          if (devPanelMode === 'network') loadDevPanelNetworkEntries(true);
          else if (devPanelMode === 'source') loadDevPanelPageSource(true);
          else if (devPanelMode === 'performance') loadDevPanelPerfSnapshot(true);
          else if (devPanelMode === 'storage') loadDevPanelStorageSnapshot(true);
        }
      }
    }
    function openSelfDevToolsPanelForTab(tab) {
      if (!tab) return;
      const idx = tabs.indexOf(tab);
      if (idx >= 0) {
        activeTab = idx;
        syncVisibleWebviews(true);
        renderTabs();
      }
      showDevPanel();
    }
    function attachWebviewEvents(tab, view) {
      if (!tab || !view || view.dataset.bound === 'true') return;
      view.dataset.bound = 'true';
      view.addEventListener('dom-ready', () => {
        tab.domReady = true;
        tab.pendingUrl = '';
        if (tab.pendingDevTools) {
          tab.pendingDevTools = false;
          openSelfDevToolsPanelForTab(tab);
        }
        syncTabFromWebview(tab, { forceRender: true, commitHistory: true });
      });
      view.addEventListener('did-start-loading', () => {
        tab.loading = true;
        renderTabs();
        updateNavButtons();
      });
      view.addEventListener('did-stop-loading', () => {
        tab.loading = false;
        tab.pendingLoadFeedback = null;
        syncTabFromWebview(tab, { forceRender: true, commitHistory: true });
      });
      view.addEventListener('did-navigate', (event) => {
        syncTabFromNavigation(tab, event && event.url ? String(event.url) : tab.url);
      });
      view.addEventListener('did-navigate-in-page', (event) => {
        syncTabFromNavigation(tab, event && event.url ? String(event.url) : tab.url);
      });
      view.addEventListener('page-title-updated', (event) => {
        if (ensureTabTitle(tab, event && event.title ? String(event.title) : '')) {
          recordHistoryEntry(tab.url, getTabTitle(tab));
          renderTabs();
        }
      });
      view.addEventListener('page-favicon-updated', (event) => {
        const favicons = event && Array.isArray(event.favicons) ? event.favicons : [];
        const nextFavicon = favicons.find(url => String(url || '').trim()) || '';
        const normalized = String(nextFavicon || '').trim();
        if (tab.favicon !== normalized) {
          tab.favicon = normalized;
          renderTabs();
        }
      });
      view.addEventListener('did-fail-load', (event) => {
        if (event && Number(event.errorCode) === -3) return;
        const isMainFrame = !event || !Object.prototype.hasOwnProperty.call(event, 'isMainFrame') || !!event.isMainFrame;
        if (!isMainFrame) return;
        const pendingLoadFeedback = tab.pendingLoadFeedback;
        tab.pendingLoadFeedback = null;
        tab.loading = false;
        if (event && event.validatedURL) tab.url = String(event.validatedURL);
        ensureTabTitle(tab, '');
        syncTabFromWebview(tab, { forceRender: true });
        if (pendingLoadFeedback && pendingLoadFeedback.source === 'manual') {
          const failedInput = pendingLoadFeedback.rawInput || (event && event.validatedURL) || tab.url;
          showBrowserLoadFailed(failedInput, event && event.errorDescription, event && event.errorCode);
        }
      });
      view.addEventListener('close', () => {
        const idx = tabs.findIndex(item => item && item.id === tab.id);
        if (idx >= 0) closeTab(idx);
      });
    }
    function createWebview(tab) {
      if (!tab || !brHost) return null;
      const view = document.createElement('webview');
      view.className = 'br-webview';
      view.dataset.tabId = tab.id;
      view.setAttribute('partition', incognitoPartition);
      view.setAttribute('allowpopups', '');
      view.setAttribute('webpreferences', 'contextIsolation=no');
      view.style.position = 'absolute';
      view.style.inset = '0';
      view.style.border = '0';
      view.style.width = '100%';
      view.style.height = '100%';
      // Electron webview host should stay flex; block can collapse guest iframe height.
      view.style.display = 'flex';
      view.style.visibility = 'hidden';
      view.style.pointerEvents = 'none';
      view.style.zIndex = '1';
      view.style.background = '#ffffff';
      view.setAttribute('src', tab.url);
      tab.webview = view;
      tab.domReady = false;
      tab.pendingUrl = '';
      attachWebviewEvents(tab, view);
      brHost.appendChild(view);
      return view;
    }
    function ensureWebview(tab) {
      if (!tab) return null;
      if (tab.webview && tab.webview.isConnected) return tab.webview;
      return createWebview(tab);
    }
    function syncVisibleWebviews(focusActive) {
      tabs.forEach((tab, index) => {
        const view = ensureWebview(tab);
        if (!view) return;
        const active = index === activeTab;
        view.style.display = 'flex';
        view.style.visibility = active ? 'visible' : 'hidden';
        view.style.pointerEvents = active ? 'auto' : 'none';
        view.style.zIndex = active ? '2' : '1';
      });
      forceBrowserLayout();
      const tab = getActiveTab();
      if (tab) syncAddressBar(tab.url);
      updateNavButtons();
      if (focusActive && tab && tab.webview) {
        try { tab.webview.focus(); } catch (_) {}
      }
      invalidateCookiePanelIfNeeded();
      if (panelMode === 'data' || devPanelVisible) renderSidePanel();
    }
    function loadTabUrl(tab, url, options) {
      if (!tab) return;
      const finalUrl = options && options.finalUrl ? String(options.finalUrl) : normalizeBrowserUrl(url);
      tab.url = finalUrl;
      tab.loading = true;
      tab.favicon = '';
      tab.pendingUrl = finalUrl;
      tab.pendingLoadFeedback = options && options.source === 'manual'
        ? {
          source: 'manual',
          rawInput: options.rawInput || String(url || '').trim(),
          finalUrl
        }
        : null;
      ensureTabTitle(tab, '');
      const view = ensureWebview(tab);
      if (tab === getActiveTab()) syncAddressBar(finalUrl);
      if (view) {
        if (tab.domReady && typeof view.loadURL === 'function') {
          try {
            view.loadURL(finalUrl);
          } catch (_) {
            view.setAttribute('src', finalUrl);
          }
        } else {
          view.setAttribute('src', finalUrl);
          tab.pendingUrl = '';
        }
      }
      renderTabs();
      updateNavButtons();
    }
    function navigateActiveTab(url, options) {
      ensureTabExists();
      const tab = getActiveTab();
      if (!tab) return;
      loadTabUrl(tab, url, options);
    }
    function addTab(url, options) {
      const tab = createTabModel(url, options && options.seed);
      tabs.push(tab);
      activeTab = tabs.length - 1;
      ensureWebview(tab);
      renderTabs();
      syncVisibleWebviews(!options || options.focus !== false);
      return tab;
    }
    function closeTab(index, options) {
      const opts = options && typeof options === 'object' ? options : {};
      if (index < 0 || index >= tabs.length) return;
      if (tabs.length <= 1) {
        const onlyTab = tabs[0];
        if (opts.remember !== false) rememberClosedTab(onlyTab);
        onlyTab.loading = true;
        onlyTab.canGoBack = false;
        onlyTab.canGoForward = false;
        onlyTab.title = getDefaultTabTitle();
        onlyTab.defaultTitle = true;
        loadTabUrl(onlyTab, getHomepage());
        activeTab = 0;
        syncVisibleWebviews(true);
        return;
      }
      const removed = tabs.splice(index, 1)[0];
      if (opts.remember !== false) rememberClosedTab(removed);
      try {
        if (removed && removed.webview) removed.webview.remove();
      } catch (_) {}
      if (activeTab >= index) activeTab = Math.max(0, activeTab - 1);
      if (!tabs[activeTab]) activeTab = 0;
      renderTabs();
      syncVisibleWebviews(true);
    }
    function renderTabs() {
      const closeTitle = escapeHtml(tr('close', 'Close'));
      const tabButtonsHtml = tabs.map((tab, i) => {
        const title = getTabTitle(tab) || tab.url || getDefaultTabTitle();
        const shortTitle = title.slice(0, 24);
        const suffix = title.length > 24 ? '...' : '';
        return `
        <button type="button" class="br-tab ${i === activeTab ? 'active' : ''}" data-i="${i}" draggable="true">
          ${getTabFaviconMarkup(tab)}
          <span class="br-tab-title">
            ${escapeHtml(shortTitle)}${suffix}
          </span>
          <span class="br-tab-close" data-close="${i}" title="${closeTitle}">x</span>
        </button>
      `;
      }).join('');

	      brTabs.innerHTML = `
	        <div class="br-tabs-scroller">${tabButtonsHtml}</div>
	        <div class="br-tabs-tools">
	          <button type="button" id="br-tabs-prev" class="br-tab-tool" title="${escapeHtml(tr('back', 'Back'))}" aria-label="${escapeHtml(tr('back', 'Back'))}"><</button>
	          <button type="button" id="br-tabs-next" class="br-tab-tool" title="${escapeHtml(tr('forward', 'Forward'))}" aria-label="${escapeHtml(tr('forward', 'Forward'))}">></button>
	          <button type="button" id="br-add-tab" class="br-tab-add" title="${escapeHtml(tr('newTab', 'New tab'))}" aria-label="${escapeHtml(tr('newTab', 'New tab'))}">+</button>
	        </div>
	      `;

	      const scroller = brTabs.querySelector('.br-tabs-scroller');
	      const prevBtn = brTabs.querySelector('#br-tabs-prev');
	      const nextBtn = brTabs.querySelector('#br-tabs-next');
	      const addBtn = brTabs.querySelector('#br-add-tab');
	      const updateOverflowControls = () => {
	        if (!scroller) return;
	        const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
	        const canScroll = maxLeft > 2;
	        if (prevBtn) prevBtn.disabled = !canScroll || scroller.scrollLeft <= 1;
	        if (nextBtn) nextBtn.disabled = !canScroll || scroller.scrollLeft >= (maxLeft - 1);
	      };

      if (scroller) {
        scroller.addEventListener('scroll', () => updateOverflowControls(), { passive: true });
      }
      if (!brTabs.__tabOverflowObserver && typeof ResizeObserver === 'function') {
        try {
          brTabs.__tabOverflowObserver = new ResizeObserver(() => {
            if (typeof brTabs.__updateTabOverflow === 'function') brTabs.__updateTabOverflow();
          });
          brTabs.__tabOverflowObserver.observe(brTabs);
        } catch (_) {
          brTabs.__tabOverflowObserver = null;
        }
      }
      brTabs.__updateTabOverflow = updateOverflowControls;

      brTabs.querySelectorAll('.br-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
          if (e.target && e.target.classList.contains('br-tab-close')) return;
          activeTab = parseInt(btn.getAttribute('data-i'), 10);
          renderTabs();
          syncVisibleWebviews(true);
        });
      });
      brTabs.querySelectorAll('.br-tab-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          closeTab(parseInt(closeBtn.getAttribute('data-close'), 10));
        });
      });
      const brTabDndMime = 'application/x-star-browser-tab';
      let brTabDragFrom = -1;
      brTabs.querySelectorAll('.br-tab').forEach((btn) => {
        btn.addEventListener('dragstart', (e) => {
          if (e.target && e.target.closest && e.target.closest('.br-tab-close')) {
            e.preventDefault();
            return;
          }
          const from = parseInt(btn.getAttribute('data-i'), 10);
          if (!Number.isFinite(from)) return;
          brTabDragFrom = from;
          try {
            e.dataTransfer.setData(brTabDndMime, String(from));
            e.dataTransfer.effectAllowed = 'move';
          } catch (_) {}
          btn.classList.add('is-dragging');
        });
        btn.addEventListener('dragend', () => {
          brTabDragFrom = -1;
          btn.classList.remove('is-dragging');
          brTabs.querySelectorAll('.br-tab.drag-over').forEach((el) => el.classList.remove('drag-over'));
        });
        btn.addEventListener('dragenter', (e) => {
          e.preventDefault();
          btn.classList.add('drag-over');
        });
        btn.addEventListener('dragleave', (e) => {
          const rel = e.relatedTarget;
          if (rel && btn.contains(rel)) return;
          btn.classList.remove('drag-over');
        });
        btn.addEventListener('dragover', (e) => {
          e.preventDefault();
          try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
        });
        btn.addEventListener('drop', (e) => {
          e.preventDefault();
          btn.classList.remove('drag-over');
          let from = brTabDragFrom;
          try {
            const raw = e.dataTransfer.getData(brTabDndMime);
            const parsed = parseInt(raw, 10);
            if (Number.isFinite(parsed)) from = parsed;
          } catch (_) {}
          const to = parseInt(btn.getAttribute('data-i'), 10);
          if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return;
          if (from < 0 || to < 0 || from >= tabs.length || to >= tabs.length) return;
          const activeModel = tabs[activeTab];
          const [moved] = tabs.splice(from, 1);
          tabs.splice(to, 0, moved);
          activeTab = Math.max(0, tabs.indexOf(activeModel));
          renderTabs();
          syncVisibleWebviews(true);
        });
      });
      brTabs.querySelectorAll('.br-tab-favicon-img').forEach((img) => {
        if (img.dataset.bound === '1') return;
        img.dataset.bound = '1';
        img.addEventListener('error', () => {
          const host = img.closest('.br-tab-favicon');
          if (host) host.classList.add('is-fallback');
        });
        img.addEventListener('load', () => {
          const host = img.closest('.br-tab-favicon');
          if (host) host.classList.remove('is-fallback');
        });
      });

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (!scroller) return;
          const step = Math.max(180, Math.round(scroller.clientWidth * 0.6));
          try {
            scroller.scrollBy({ left: -step, behavior: 'smooth' });
          } catch (_) {
            scroller.scrollLeft -= step;
          }
          updateOverflowControls();
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (!scroller) return;
          const step = Math.max(180, Math.round(scroller.clientWidth * 0.6));
          try {
            scroller.scrollBy({ left: step, behavior: 'smooth' });
          } catch (_) {
            scroller.scrollLeft += step;
          }
          updateOverflowControls();
        });
      }
	      if (addBtn) addBtn.addEventListener('click', () => addTab(getHomepage()));
	      // Removed "... more tabs" menu for a cleaner UI.
	      if (brTabs.__tabsOutsideHandler) {
	        document.removeEventListener('mousedown', brTabs.__tabsOutsideHandler, true);
	        brTabs.__tabsOutsideHandler = null;
	      }

      const activeBtn = (scroller || brTabs).querySelector(`.br-tab[data-i="${activeTab}"]`);
      if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
        try { activeBtn.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) {}
      }
      updateOverflowControls();
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          if (typeof brTabs.__updateTabOverflow === 'function') brTabs.__updateTabOverflow();
        });
      }
      updateToolbarStates();
      persistSessionState();
      if (panelMode) renderSidePanel();
    }
    function toggleActiveDevTools() {
      ensureTabExists();
      const tab = getActiveTab();
      if (!tab) return;
      ensureWebview(tab);
      if (!tab.domReady) {
        tab.pendingDevTools = true;
        showTransientStatus(tr('browserDevToolsPending', 'Developer tools will open when the page is ready.'), 'muted');
        return;
      }
      if (devPanelVisible) {
        hideDevPanel();
        showTransientStatus(tr('browserDevPanelClosed', 'Developer panel closed.'), 'muted');
        return;
      }
      openSelfDevToolsPanelForTab(tab);
      showTransientStatus(tr('browserDevPanelOpened', 'Developer panel opened.'), 'success');
    }
    async function clearBrowserData() {
      const confirmed = window.StarDialog && typeof window.StarDialog.confirm === 'function'
        ? await window.StarDialog.confirm({
          title: tr('browserClearData', 'Clear data'),
          message: tr('browserClearDataConfirm', 'Clear cookies, cache and saved login state for the built-in browser?'),
          okText: tr('browserClearData', 'Clear data'),
          cancelText: tr('cancel', 'Cancel')
        })
        : false;
      if (!confirmed) return;
      const result = await ipcRenderer.invoke('browser:clearData');
      if (result && result.error) {
        const message = tr('browserClearDataFailed', 'Failed to clear browser data: {message}', { message: result.error });
        showBrowserDialogAlert(tr('browserClearData', 'Clear data'), message);
        showTransientStatus(message, 'error', 3600);
        return;
      }
      cookieEntries = [];
      cookieEditor = null;
      cookieLoadedForKey = '';
      persistHistoryEntries();
      persistClosedTabs();
      renderSidePanel();
      updateToolbarStates();
      tabs.forEach(tab => {
        try {
          if (tab && tab.webview && tab.domReady && typeof tab.webview.reloadIgnoringCache === 'function') {
            tab.webview.reloadIgnoringCache();
          }
        } catch (_) {}
      });
      showTransientStatus(tr('browserDataCleared', 'Browser cookies, cache and saved login state have been cleared.'), 'success', 3600);
    }
    function onBrowserShortcut(e) {
      const key = String(e.key || '').toLowerCase();
      const meta = e.ctrlKey || e.metaKey;
      if (meta && !e.shiftKey && key === 'l') {
        e.preventDefault();
        if (brUrl) {
          brUrl.focus();
          brUrl.select();
        }
        return;
      }
      if (meta && !e.shiftKey && key === 't') {
        e.preventDefault();
        addTab(getHomepage());
        return;
      }
      if (meta && !e.shiftKey && key === 'w') {
        e.preventDefault();
        closeTab(activeTab);
        return;
      }
      if (meta && e.shiftKey && key === 't') {
        e.preventDefault();
        restoreClosedTabAt(0);
        return;
      }
      if (key === 'f12' || (meta && e.shiftKey && key === 'i')) {
        e.preventDefault();
        toggleActiveDevTools();
        return;
      }
      if (e.altKey && key === 'arrowleft') {
        e.preventDefault();
        backBtn && backBtn.click();
        return;
      }
      if (e.altKey && key === 'arrowright') {
        e.preventDefault();
        forwardBtn && forwardBtn.click();
      }
    }
    goBtn.addEventListener('click', () => {
      submitBrowserAddress(brUrl.value);
    });
    brUrl.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        goBtn.click();
      }
    });
    backBtn.addEventListener('click', () => {
      const tab = getActiveTab();
      try {
        if (tab && tab.webview && tab.domReady && tab.canGoBack && typeof tab.webview.goBack === 'function') {
          tab.webview.goBack();
        }
      } catch (_) {}
    });
    forwardBtn.addEventListener('click', () => {
      const tab = getActiveTab();
      try {
        if (tab && tab.webview && tab.domReady && tab.canGoForward && typeof tab.webview.goForward === 'function') {
          tab.webview.goForward();
        }
      } catch (_) {}
    });
    homeBtn.addEventListener('click', () => {
      navigateActiveTab(getHomepage());
    });
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        ensureTabExists();
        const tab = getActiveTab();
        if (!tab) return;
        try {
          if (tab.webview && tab.domReady && typeof tab.webview.reload === 'function') {
            tab.webview.reload();
          } else {
            loadTabUrl(tab, tab.url || getHomepage());
          }
        } catch (_) {
          loadTabUrl(tab, tab.url || getHomepage());
        }
        updateNavButtons();
      });
    }
    if (newTabBtn) newTabBtn.addEventListener('click', () => addTab(getHomepage()));
    if (incognitoBtn) incognitoBtn.addEventListener('click', openIncognitoBrowserWindow);
    if (restoreTabBtn) restoreTabBtn.addEventListener('click', () => restoreClosedTabAt(0));
    if (favoriteBtn) favoriteBtn.addEventListener('click', toggleFavoriteForActiveTab);
    if (favoritesBtn) favoritesBtn.addEventListener('click', () => togglePanel('favorites'));
    if (downloadsBtn) downloadsBtn.addEventListener('click', () => togglePanel('downloads'));
    if (historyBtn) historyBtn.addEventListener('click', () => togglePanel('history'));
    if (siteDataBtn) siteDataBtn.addEventListener('click', () => togglePanel('data'));
    if (devToolsBtn) devToolsBtn.addEventListener('click', toggleActiveDevTools);
    if (sidePanelCloseBtn) sidePanelCloseBtn.addEventListener('click', () => {
      panelMode = null;
      renderSidePanel();
    });
    if (panelTabFavoritesBtn) panelTabFavoritesBtn.addEventListener('click', () => {
      panelMode = 'favorites';
      renderSidePanel();
    });
    if (panelTabHistoryBtn) panelTabHistoryBtn.addEventListener('click', () => {
      panelMode = 'history';
      renderSidePanel();
    });
    if (panelTabDataBtn) panelTabDataBtn.addEventListener('click', () => {
      panelMode = 'data';
      renderSidePanel();
    });
    if (devPanelCloseBtn) devPanelCloseBtn.addEventListener('click', () => hideDevPanel());
    container.addEventListener('keydown', onBrowserShortcut, true);
    if (!window.StarBrowserBridge) window.StarBrowserBridge = {};
    const bridgeId = hostWinId || 'single-browser';
    const isBridgeAlive = () => !!(container && container.isConnected && (!hostWindowEl || hostWindowEl.isConnected));
    const bridgeApi = {
      addTab: (url) => addTab(url),
      focus: () => {
        if (hostWinId && window.StarWindowManager) {
          window.StarWindowManager.restore(hostWinId);
          window.StarWindowManager.focus(hostWinId);
        }
      },
      isAlive: isBridgeAlive,
    };
    window.StarBrowserBridge[bridgeId] = bridgeApi;
    let disconnectObserver = null;
	    const cleanupBrowserBridge = () => {
	      try { persistSessionState(); } catch (_) {}
      try {
        if (window.StarBrowserBridge && window.StarBrowserBridge[bridgeId] === bridgeApi) delete window.StarBrowserBridge[bridgeId];
      } catch (_) {}
      try {
        window.removeEventListener('star:browser-open', onBrowserOpen);
      } catch (_) {}
      try {
        window.removeEventListener('star:browser-reflow', forceBrowserLayout);
      } catch (_) {}
      try {
        window.removeEventListener('resize', onStarBrowserWindowResize);
      } catch (_) {}
      try {
        ipcRenderer.removeListener('browser:download-updated', onBrowserDownloadUpdated);
      } catch (_) {}
      try {
        ipcRenderer.removeListener('browser:network-updated', onBrowserNetworkUpdated);
      } catch (_) {}
      try {
        if (disconnectObserver) disconnectObserver.disconnect();
      } catch (_) {}
	      try {
	        if (statusTimer) clearTimeout(statusTimer);
	      } catch (_) {}
	      try {
	        hideDownloadCapturedBanner();
	      } catch (_) {}
	      try {
	        stopDevPanelPerfTimer();
	      } catch (_) {}
      try {
        tabs.forEach(tab => { if (tab && tab.webview) tab.webview.remove(); });
      } catch (_) {}
    };
    const onBrowserOpen = (ev) => {
      if (!container.isConnected) {
        cleanupBrowserBridge();
        return;
      }
      const url = ev && ev.detail && ev.detail.url ? String(ev.detail.url) : '';
      if (url) addTab(url);
    };
	    const onBrowserDownloadUpdated = (_event, payload) => {
	      if (!container || !container.isConnected) return;
	      const data = payload && typeof payload === 'object' ? payload : null;
	      if (!data || !data.id) return;
	      const idx = downloadEntries.findIndex(item => String(item && item.id ? item.id : '') === String(data.id));
	      if (idx >= 0) downloadEntries[idx] = Object.assign({}, downloadEntries[idx], data);
	      else downloadEntries.unshift(Object.assign({}, data));
	      const isNew = idx < 0;
	      if (isNew && String(data.state || '') === 'downloading') {
	        maybeCloseDownloadPlaceholderTab(data);
	        const did = String(data.id);
	        if (!downloadBannerSeenIds.has(did)) {
	          downloadBannerSeenIds.add(did);
	          showDownloadCapturedBanner(data);
	        }
	      }
	      if (panelMode === 'downloads') renderDownloadsBody();
	    };
    const onBrowserNetworkUpdated = (_event, payload) => {
      if (!container || !container.isConnected) return;
      const data = payload && typeof payload === 'object' ? payload : null;
      if (!data) return;
      const activeId = getActiveWebContentsId();
      if (!activeId) return;
      if (activeId && Number(data.webContentsId || 0) !== activeId) return;
      devPanelNetworkEntries.unshift(Object.assign({}, data));
      if (devPanelNetworkEntries.length > 600) devPanelNetworkEntries.length = 600;
      if (devPanelVisible && devPanelMode === 'network') renderDevPanelBody();
    };
    function onStarBrowserWindowResize() {
      layoutBrowserPanelOffsets();
    }
    window.addEventListener('star:browser-open', onBrowserOpen);
    window.addEventListener('star:browser-reflow', forceBrowserLayout);
    window.addEventListener('resize', onStarBrowserWindowResize);
    ipcRenderer.on('browser:download-updated', onBrowserDownloadUpdated);
    ipcRenderer.on('browser:network-updated', onBrowserNetworkUpdated);
    try {
      if (typeof MutationObserver === 'function' && document && document.body) {
        disconnectObserver = new MutationObserver(() => {
          if (!isBridgeAlive()) cleanupBrowserBridge();
        });
        disconnectObserver.observe(document.body, { childList: true, subtree: true });
      }
    } catch (_) {}

	    setWindowLocaleRefresh(container, () => {
	      updateStaticLabels();
	      renderTabs();
	      renderSidePanel();
	      if (devPanelVisible) renderDevDrawer();
	      syncVisibleWebviews(false);
	      forceBrowserLayout();
	      refreshDownloadBannerLocale();
	    });
    updateStaticLabels();
    forceBrowserLayout();

    const initialUrl = window.__starBrowserInitialUrl;
    if (initialUrl) {
      window.__starBrowserInitialUrl = null;
    }
    const savedSession = safeLoadJson(STORAGE_SESSION_KEY, null);
    if (savedSession && Array.isArray(savedSession.tabs) && savedSession.tabs.length) {
      tabs = savedSession.tabs.slice(0, MAX_SESSION_TABS).map(entry => createTabModel(entry.url || getHomepage(), entry));
      activeTab = Math.max(0, Math.min(Number(savedSession.activeTab) || 0, tabs.length - 1));
    }
    if (initialUrl) {
      const normalizedInitial = normalizeBrowserUrl(initialUrl);
      const existingIndex = tabs.findIndex(tab => tab.url === normalizedInitial);
      if (existingIndex >= 0) {
        activeTab = existingIndex;
        loadTabUrl(tabs[existingIndex], normalizedInitial);
      } else {
        addTab(normalizedInitial);
      }
    }
    if (!tabs.length) addTab(getHomepage());
    else renderTabs();
    renderSidePanel();
    syncVisibleWebviews(true);
    setTimeout(() => {
      if (!container || !container.isConnected) return;
      forceBrowserLayout();
    }, 0);
  },

  terminal(container) {
    if (!container) return;
    if (typeof container.__starTerminalTeardown === 'function') {
      try { container.__starTerminalTeardown(); } catch (_) {}
    }
    container.__starTerminalTeardown = null;
    const headerEl = container.querySelector('#terminal-header');
    const input = container.querySelector('#terminal-input');
    const output = container.querySelector('#terminal-output');
    const promptEl = container.querySelector('#terminal-prompt');
    const electron = require('electron');
    const path = require('path');
    const fs = require('fs');
    const isWin = process.platform === 'win32';
    /** 与 PTY 共用 _ptyLines；不用纯 textContent 模式，避免与 appendPty/renderPtyBuffer 混用出错 */
    const usePlainWinTerminalScrollback = false;
    let cwd = process.env.USERPROFILE || process.env.HOME || process.cwd();
    let ptyId = null;
    let ptyEnabled = false;
    let ptyPromptReady = false;
    let ptyPromptSeen = false;
    let ptyTransport = 'none';
    let ptyCommandsSent = 0;
    let _ptyLines = [''];
    let _ptyCursorRow = 0;
    let _ptyCursorCol = 0;
    let _ptyAnsiCarry = '';
    let ptySessionGen = 0;
    let detachPtyIpc = null;
    let lastPtyEmptyCrnlTs = 0;
    function tr(key, fallback, params) {
      try {
        return typeof t === 'function' ? t(key, fallback, params) : fallback;
      } catch (_) {
        return fallback;
      }
    }
    function updateStaticLabels() {
      if (headerEl) headerEl.textContent = 'Star OS - ' + tr('terminal', 'Terminal');
      if (input) {
        input.placeholder = ptyPromptReady ? '' : tr('terminalStarting', 'Connecting terminal...');
      }
    }

    // PTY 输出需要处理 \r/\b 等控制字符（否则会出现“提示不换行/光标错位”）
    let _ptyTextBuf = '';
    /** 与 PTY 共用行缓冲；append 走 _ptyLines + renderPtyBuffer */
    function append(text) {
      if (text == null || !output) return;
      if (usePlainWinTerminalScrollback) {
        output.textContent = (output.textContent ?? '') + String(text).replace(/\r\n/g, '\n');
        output.scrollTop = output.scrollHeight;
        return;
      }
      const normalized = String(text).replace(/\r\n/g, '\n');
      const parts = normalized.split('\n');
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          _ptyLines.push('');
          _ptyCursorCol = 0;
        }
        const lineIdx = _ptyLines.length - 1;
        _ptyLines[lineIdx] = String(_ptyLines[lineIdx] ?? '') + parts[i];
        _ptyCursorCol = (_ptyLines[lineIdx] || '').length;
      }
      _ptyCursorRow = _ptyLines.length - 1;
      syncPtyTextBuf();
      renderPtyBuffer();
    }
    /** 回显用户输入行：若当前行已是 cmd 风格提示符，则接在同一行后，避免 D:>D:> 重复 */
    function echoTerminalCommandLine(cmdline) {
      if (usePlainWinTerminalScrollback && output) {
        output.textContent = (output.textContent ?? '') + formatTerminalPrompt() + String(cmdline || '') + '\n';
        output.scrollTop = output.scrollHeight;
        return;
      }
      const c = String(cmdline || '');
      const prompt = formatTerminalPrompt();
      const lastIdx = _ptyLines.length - 1;
      const last = String(_ptyLines[lastIdx] ?? '');
      const lineLooksPrompt = !!(last && (last === prompt || /^[A-Za-z]:\\[^<>|?*"\r\n]*>$/.test(last)));
      if (lineLooksPrompt) {
        _ptyLines[lastIdx] = last + c;
      } else if (!last) {
        _ptyLines[lastIdx] = prompt + c;
      } else {
        _ptyLines.push(prompt + c);
      }
      _ptyCursorCol = (String(_ptyLines[_ptyLines.length - 1] ?? '')).length;
      _ptyLines.push('');
      _ptyCursorCol = 0;
      _ptyCursorRow = _ptyLines.length - 1;
      syncPtyTextBuf();
      renderPtyBuffer();
    }
    function formatTerminalPrompt() {
      if (isWin) {
        const normalized = String(cwd || process.env.USERPROFILE || process.env.HOME || process.cwd() || '').replace(/\//g, '\\');
        return (normalized || ((process.env.SystemDrive || 'C:') + '\\')) + '>';
      }
      return String(cwd || '~') + ' $';
    }
    function updateTerminalPrompt() {
      if (promptEl) promptEl.textContent = formatTerminalPrompt();
    }
    function setTerminalInputReady(ready) {
      ptyPromptReady = !!ready;
      if (input) {
        input.disabled = !ptyPromptReady;
        input.placeholder = ptyPromptReady
          ? ''
          : tr('terminalStarting', 'Connecting terminal...');
        if (ptyPromptReady) {
          try { input.focus(); } catch (_) {}
        }
      }
      updateTerminalPrompt();
      updateStaticLabels();
    }
    function syncPromptFromPtyBuffer() {
      if (!isWin) return;
      const matches = [...String(_ptyTextBuf || '').matchAll(/([A-Za-z]:\\[^\r\n<>|?*"]*)>/g)];
      if (!matches.length) return;
      const nextCwd = matches[matches.length - 1][1];
      if (!nextCwd) return;
      ptyPromptSeen = true;
      cwd = nextCwd;
      updateTerminalPrompt();
      if (!ptyPromptReady) setTerminalInputReady(true);
    }
    function syncPtyTextBuf() {
      _ptyTextBuf = _ptyLines.join('\n');
      if (_ptyTextBuf.length > 200000) {
        const trimmed = _ptyTextBuf.slice(-150000);
        _ptyLines = trimmed.split('\n');
        if (!_ptyLines.length) _ptyLines = [''];
        _ptyCursorRow = _ptyLines.length - 1;
        _ptyCursorCol = _ptyLines[_ptyCursorRow].length;
        _ptyTextBuf = _ptyLines.join('\n');
      }
    }
    function trimInitialPromptTrailingLines() {
      if (!isWin || ptyCommandsSent > 0 || _ptyLines.length < 2) return;
      let lastNonEmpty = _ptyLines.length - 1;
      while (lastNonEmpty >= 0 && !_ptyLines[lastNonEmpty]) lastNonEmpty -= 1;
      if (lastNonEmpty < 0 || lastNonEmpty === _ptyLines.length - 1) return;
      const promptLine = String(_ptyLines[lastNonEmpty] || '');
      if (!/^[A-Za-z]:\\[^\r\n<>|?*"]*>$/.test(promptLine)) return;
      _ptyLines = _ptyLines.slice(0, lastNonEmpty + 1);
      _ptyCursorRow = _ptyLines.length - 1;
      _ptyCursorCol = promptLine.length;
      syncPtyTextBuf();
    }
    function normalizeTerminalDisplayText(text) {
      let normalized = String(text || '').replace(/\r\n/g, '\n');
      if (isWin) {
        normalized = normalized.replace(/([^\n])((?:[A-Za-z]:\\[^\r\n<>|?*"]*)>)/g, '$1\n$2');
      }
      // Localize a few common Windows shell error messages when the UI language is not English.
      try {
        if (isWin && typeof getLocale === 'function') {
          const loc = String(getLocale() || '').toLowerCase();
          if (loc && loc !== 'en') {
            const cmdNotFoundRe = /(?:'|‘|’)([^'‘’\r\n]+)(?:'|‘|’)\s+is not recognized as an internal or external command,\s*\n\s*operable program or batch file\./g;
            normalized = normalized.replace(cmdNotFoundRe, (_m, cmd) =>
              tr('terminalCmdNotRecognized', "'{cmd}' is not recognized as an internal or external command, operable program or batch file.", { cmd })
            );
          }
        }
      } catch (_) {}
      return normalized.replace(/\n{3,}/g, '\n\n');
    }
    function renderPtyBuffer() {
      if (usePlainWinTerminalScrollback || !output) return;
      trimInitialPromptTrailingLines();
      syncPtyTextBuf();
      output.textContent = normalizeTerminalDisplayText(_ptyTextBuf);
      syncPromptFromPtyBuffer();
      output.scrollTop = output.scrollHeight;
    }
    function parseCsiNums(raw) {
      const s = String(raw || '');
      if (!s) return [];
      return s.split(';').map(seg => {
        const n = parseInt(String(seg).replace(/\D/g, '') || '0', 10);
        return Number.isFinite(n) ? n : 0;
      });
    }
    function ptyCup(row1, col1) {
      const r = Math.max(1, row1 | 0);
      const c = Math.max(1, col1 | 0);
      while (_ptyLines.length < r) _ptyLines.push('');
      _ptyCursorRow = r - 1;
      _ptyCursorCol = c - 1;
      const lineIdx = _ptyCursorRow;
      const line = String(_ptyLines[lineIdx] ?? '');
      if (_ptyCursorCol > line.length) {
        _ptyLines[lineIdx] = line + ' '.repeat(_ptyCursorCol - line.length);
      }
    }
    function ptyEl(mode) {
      const m = mode | 0;
      const lineIdx = _ptyCursorRow;
      let line = String(_ptyLines[lineIdx] ?? '');
      const col = _ptyCursorCol;
      if (m === 0) {
        _ptyLines[lineIdx] = line.slice(0, Math.min(col, line.length));
      } else if (m === 1) {
        const p = Math.min(col, line.length);
        _ptyLines[lineIdx] = ' '.repeat(p) + line.slice(p);
      } else if (m === 2) {
        _ptyLines[lineIdx] = '';
        _ptyCursorCol = 0;
      }
    }
    function ptyEdClearScreen() {
      _ptyLines = [''];
      _ptyCursorRow = 0;
      _ptyCursorCol = 0;
    }
    function ptyCuu(n) {
      let steps = Math.max(1, Number(n) || 1);
      while (steps-- > 0 && _ptyCursorRow > 0) _ptyCursorRow -= 1;
      const line = String(_ptyLines[_ptyCursorRow] ?? '');
      _ptyCursorCol = Math.min(_ptyCursorCol, line.length);
    }
    function ptyCud(n) {
      let steps = Math.max(1, Number(n) || 1);
      while (steps-- > 0) {
        if (_ptyCursorRow < _ptyLines.length - 1) _ptyCursorRow += 1;
        else {
          _ptyLines.push('');
          _ptyCursorRow = _ptyLines.length - 1;
        }
      }
      const line = String(_ptyLines[_ptyCursorRow] ?? '');
      _ptyCursorCol = Math.min(_ptyCursorCol, line.length);
    }
    function ptyCuf(n) {
      const steps = Math.max(1, Number(n) || 1);
      _ptyCursorCol += steps;
      const lineIdx = _ptyCursorRow;
      const line = String(_ptyLines[lineIdx] ?? '');
      if (_ptyCursorCol > line.length) {
        _ptyLines[lineIdx] = line + ' '.repeat(_ptyCursorCol - line.length);
      }
    }
    function ptyCub(n) {
      const steps = Math.max(1, Number(n) || 1);
      _ptyCursorCol = Math.max(0, _ptyCursorCol - steps);
    }
    function ptyCha(n) {
      const col = Math.max(1, Number(n) || 1);
      _ptyCursorCol = col - 1;
      const lineIdx = _ptyCursorRow;
      const line = String(_ptyLines[lineIdx] ?? '');
      if (_ptyCursorCol > line.length) {
        _ptyLines[lineIdx] = line + ' '.repeat(_ptyCursorCol - line.length);
      }
    }
    function parseCsiAfterBracket(s, bracketIdx) {
      let j = bracketIdx + 1;
      if (j >= s.length) return { incomplete: true };
      let privateMarker = '';
      if ('?>=!'.includes(s[j])) {
        privateMarker = s[j];
        j += 1;
      }
      const bodyStart = j;
      while (j < s.length) {
        const co = s.charCodeAt(j);
        if (co >= 0x40 && co <= 0x7e) {
          const final = s[j];
          const rawParams = s.slice(bodyStart, j);
          return {
            incomplete: false,
            nextIndex: j + 1,
            final,
            params: parseCsiNums(rawParams),
            privateMarker
          };
        }
        j += 1;
      }
      return { incomplete: true };
    }
    function applyPtyCsi(csi) {
      if (!csi || csi.incomplete) return;
      const fin = csi.final;
      const params = csi.params || [];
      if (fin === 'm') return;
      if ((fin === 'h' || fin === 'l') && csi.privateMarker === '?') return;
      switch (fin) {
        case 'K':
          ptyEl(params.length ? params[0] : 0);
          break;
        case 'J': {
          const n = params.length ? params[0] : 0;
          if (n === 2 || n === 3) ptyEdClearScreen();
          break;
        }
        case 'H':
        case 'f':
          ptyCup(
            params[0] != null && params[0] > 0 ? params[0] : 1,
            params[1] != null && params[1] > 0 ? params[1] : 1
          );
          break;
        case 'A':
          ptyCuu(params[0] || 1);
          break;
        case 'B':
          ptyCud(params[0] || 1);
          break;
        case 'C':
          ptyCuf(params[0] || 1);
          break;
        case 'D':
          ptyCub(params[0] || 1);
          break;
        case 'G':
          ptyCha(params[0] || 1);
          break;
        default:
          break;
      }
    }
    function ptyPutChar(ch) {
      const cc = ch.charCodeAt(0);
      if (cc !== 0x09 && cc < 32 && ch !== '\r' && ch !== '\n' && ch !== '\b') return;
      if (ch === '\t') {
        const target = Math.floor(_ptyCursorCol / 8) * 8 + 8;
        while (_ptyCursorCol < target) ptyPutChar(' ');
        return;
      }
      if (ch === '\r') {
        _ptyCursorCol = 0;
        return;
      }
      if (ch === '\b') {
        const lineIdx = _ptyCursorRow;
        const line = _ptyLines[lineIdx] || '';
        if (_ptyCursorCol > 0) {
          const pos = _ptyCursorCol - 1;
          _ptyLines[lineIdx] = line.slice(0, pos) + line.slice(pos + 1);
          _ptyCursorCol = pos;
        } else if (line.length > 0) {
          _ptyLines[lineIdx] = line.slice(0, -1);
        }
        return;
      }
      if (ch === '\n') {
        if (_ptyCursorRow < _ptyLines.length - 1) {
          _ptyCursorRow += 1;
          _ptyCursorCol = 0;
          if (_ptyLines[_ptyCursorRow] === undefined) _ptyLines[_ptyCursorRow] = '';
        } else {
          _ptyLines.push('');
          _ptyCursorRow = _ptyLines.length - 1;
          _ptyCursorCol = 0;
        }
        return;
      }
      const lineIdx = _ptyCursorRow;
      const line = _ptyLines[lineIdx] || '';
      if (_ptyCursorCol >= line.length) {
        _ptyLines[lineIdx] = line + ' '.repeat(Math.max(0, _ptyCursorCol - line.length)) + ch;
      } else {
        _ptyLines[lineIdx] = line.slice(0, _ptyCursorCol) + ch + line.slice(_ptyCursorCol + 1);
      }
      _ptyCursorCol += 1;
      syncPtyTextBuf();
    }
    function appendPty(text) {
      if (text == null) return;
      const s = String(text);
      for (let i = 0; i < s.length; i += 1) ptyPutChar(s[i]);
      syncPtyTextBuf();
      renderPtyBuffer();
    }
    function feedPtyTerminal(raw) {
      const data = _ptyAnsiCarry + String(raw ?? '');
      _ptyAnsiCarry = '';
      let i = 0;
      while (i < data.length) {
        const code = data.charCodeAt(i);
        if (code === 0x1b) {
          if (i + 1 >= data.length) {
            _ptyAnsiCarry = data.slice(i);
            break;
          }
          if (data[i + 1] === '[') {
            const csi = parseCsiAfterBracket(data, i + 1);
            if (csi.incomplete) {
              _ptyAnsiCarry = data.slice(i);
              syncPtyTextBuf();
              renderPtyBuffer();
              return;
            }
            applyPtyCsi(csi);
            i = csi.nextIndex;
            continue;
          }
          if (data[i + 1] === ']') {
            let j = i + 2;
            while (j < data.length) {
              if (data.charCodeAt(j) === 7) {
                j += 1;
                break;
              }
              if (data[j] === '\x1b' && j + 1 < data.length && data[j + 1] === '\\') {
                j += 2;
                break;
              }
              j += 1;
            }
            if (j > data.length) {
              _ptyAnsiCarry = data.slice(i);
              syncPtyTextBuf();
              renderPtyBuffer();
              return;
            }
            i = j;
            continue;
          }
          i += 2;
          continue;
        }
        ptyPutChar(data[i]);
        i += 1;
      }
      syncPtyTextBuf();
      renderPtyBuffer();
    }
    function clearOutput() {
      if (!output) return;
      output.innerHTML = '';
      _ptyTextBuf = '';
      _ptyLines = [''];
      _ptyCursorRow = 0;
      _ptyCursorCol = 0;
      _ptyAnsiCarry = '';
      ptyCommandsSent = 0;
    }
    function resolveTerminalDir(dir) {
      const raw = String(dir || '').trim();
      if (!raw) return cwd;
      if (isWin) {
        const normalized = raw.replace(/\//g, '\\');
        if (/^[A-Za-z]:$/.test(normalized)) return normalized + '\\';
        if (/^[A-Za-z]:\\/.test(normalized)) return normalized;
        return path.resolve(cwd, normalized);
      }
      return path.resolve(cwd, raw);
    }
    function toShellCdCommand(dir) {
      const next = resolveTerminalDir(dir);
      if (isWin) return `cd /d "${next.replace(/"/g, '""')}"`;
      return `cd "${next.replace(/"/g, '\\"')}"`;
    }
    function applyTerminalInitial(initial, syncPty) {
      if (!initial) return;
      try {
        const initObj = (typeof initial === 'object' && initial) ? initial : { filePath: String(initial) };
        let nextCwd = null;
        if (initObj.cwd) nextCwd = resolveTerminalDir(initObj.cwd);
        else if (initObj.filePath) nextCwd = path.dirname(String(initObj.filePath));
        if (nextCwd) {
          cwd = nextCwd;
          updateTerminalPrompt();
        }
        if (syncPty && nextCwd && ptyEnabled && ptyId) {
          const cdCmd = toShellCdCommand(nextCwd);
          electron.ipcRenderer.invoke('terminal:ptyWrite', ptyId, cdCmd + '\r\n').catch(() => {});
        }
        if (initObj.cmd) {
          input.value = initObj.cmd;
        } else if (initObj.filePath) {
          const fp = String(initObj.filePath);
          input.value = (isWin ? `call "${fp}"` : `"${fp}"`);
        }
      } catch (_) {}
    }
    function translateCmd(cmd) {
      const t = cmd.trim();
      if (!t) return cmd;
      if (isWin) {
        if (!/^cd\s+\/d\s+/i.test(t)) {
          const driveOnly = t.match(/^cd\s+([A-Za-z]:)\s*$/i);
          if (driveOnly) return `cd /d ${driveOnly[1]}\\`;
          if (/^cd\s+[A-Za-z]:(\\.*)?\s*$/i.test(t)) return t.replace(/^cd\s+/i, 'cd /d ');
        }
        if (t === 'ls' || /^ls\s/.test(t)) return 'dir';
        if (t === 'll' || /^ll\s/.test(t)) return t.replace(/^ll(\s+|$)/, 'dir$1'); // ll 视为 ls -l，Windows 下统一转 dir
        if (t === 'pwd') return 'cd';
        if (t === 'clear' || t === 'cls') return null;
        if (t === 'cat' || /^cat\s+/.test(t)) return t.replace(/^cat\s+/, 'type ');
      }
      return cmd;
    }
    function normalizeWinCmd(cmd) {
      if (!isWin) return cmd;
      let s = String(cmd);
      try { s = s.normalize('NFKC'); } catch (_) {}
      // 修正常见的中文/弯引号，避免 cmd.exe 识别失败
      s = s
        .replace(/[\u201C\u201D\u201E\u2033\u301D\u301E\u301F]/g, '"') // “ ” „ ″ 以及部分全角引号
        .replace(/[\u2018\u2019\u201A\u2032]/g, "'") // ‘ ’ ‚ ′
        .replace(/[\u300C\u300D\u300E\u300F\uFF02]/g, '"') // 「 」 『 』 ＂
        .replace(/[\uFF07]/g, "'"); // ＇
      // 修复用户/输入法导致的 call"xxx" / call'xxx' 缺空格
      s = s.replace(/^\s*call(?=["'])/i, m => m + ' ');
      return s;
    }
    function normalizeWindowsBatchInvocation(cmd) {
      if (!isWin) return cmd;
      const src = String(cmd || '').trim();
      if (!src) return src;
      const stripPairQuotes = (value) => {
        const v = String(value || '').trim();
        return v.replace(/^[\"'“”‘’「」『』]+/, '').replace(/[\"'“”‘’「」『』]+$/, '').trim();
      };
      const callMatch = src.match(/^call\s+(.+)$/i);
      if (callMatch) {
        const rest = String(callMatch[1] || '').trim();
        const m = rest.match(/^[\"'“”‘’「」『』]?(.+?\.(?:bat|cmd))[\"'“”‘’「」『』]?(?:\s+(.*))?$/i);
        if (m) {
          const rawPath = stripPairQuotes(m[1]);
          const extra = String(m[2] || '').trim();
          const abs = /^[A-Za-z]:[\\/]/.test(rawPath) ? rawPath : path.resolve(cwd, rawPath);
          const target = (abs && fs.existsSync(abs)) ? abs : rawPath;
          return `call "${target.replace(/"/g, '""')}"${extra ? ' ' + extra : ''}`;
        }
      }
      const directMatch = src.match(/^[\"'“”‘’「」『』]?(.+?\.(?:bat|cmd))[\"'“”‘’「」『』]?(?:\s+(.*))?$/i);
      if (directMatch) {
        const rawPath = stripPairQuotes(directMatch[1]);
        const extra = String(directMatch[2] || '').trim();
        const abs = /^[A-Za-z]:[\\/]/.test(rawPath) ? rawPath : path.resolve(cwd, rawPath);
        const target = (abs && fs.existsSync(abs)) ? abs : rawPath;
        return `call "${target.replace(/"/g, '""')}"${extra ? ' ' + extra : ''}`;
      }
      return src;
    }

    function guessColsRows() {
      try {
        const rect = output.getBoundingClientRect();
        const style = window.getComputedStyle(output);
        const fontSize = parseFloat(style.fontSize || '14') || 14;
        const lineHeight = parseFloat(style.lineHeight || String(fontSize * 1.35)) || (fontSize * 1.35);
        const colW = fontSize * 0.62;
        const cols = Math.max(40, Math.floor(rect.width / colW));
        const rows = Math.max(10, Math.floor(rect.height / lineHeight));
        return { cols, rows };
      } catch (_) {
        return { cols: 100, rows: 30 };
      }
    }

    function enablePtySession() {
      if (ptyEnabled) return;
      ptySessionGen += 1;
      const myGen = ptySessionGen;
      ptyId = 'pty_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const sessionPtyId = ptyId;
      ptyTransport = 'none';
      setTerminalInputReady(false);
      const onData = (_ev, id, data) => {
        if (id !== sessionPtyId || data == null) return;
        const raw = String(data);
        const isEmpty = !_ptyTextBuf.length;
        const chunk = isEmpty ? raw.replace(/^\n{3,}/, '\n') : raw;
        if (chunk) {
          feedPtyTerminal(chunk);
          if (!ptyPromptReady) setTerminalInputReady(true);
        }
      };
      const onExit = (_ev, id, code) => {
        if (id !== sessionPtyId) return;
        electron.ipcRenderer.removeListener('terminal:ptyData', onData);
        electron.ipcRenderer.removeListener('terminal:ptyExit', onExit);
        detachPtyIpc = null;
        ptyEnabled = false;
        ptyTransport = 'none';
        ptyId = null;
        setTerminalInputReady(true);
        append('\n');
        append(tr('terminalProcessExited', '[process exited {code}]', { code: code ?? 0 }) + '\n');
      };
      electron.ipcRenderer.on('terminal:ptyData', onData);
      electron.ipcRenderer.on('terminal:ptyExit', onExit);
      detachPtyIpc = () => {
        try {
          electron.ipcRenderer.removeListener('terminal:ptyData', onData);
          electron.ipcRenderer.removeListener('terminal:ptyExit', onExit);
        } catch (_) {}
      };
      const size = guessColsRows();
      electron.ipcRenderer.invoke('terminal:ptyCreate', { id: sessionPtyId, cwd, cols: size.cols, rows: size.rows }).then(res => {
        if (myGen !== ptySessionGen) {
          if (res && res.ok && sessionPtyId) {
            electron.ipcRenderer.invoke('terminal:ptyKill', sessionPtyId).catch(() => {});
          }
          if (typeof detachPtyIpc === 'function') detachPtyIpc();
          detachPtyIpc = null;
          return;
        }
        if (res && res.ok && (res.transport === 'pty' || res.transport === 'pipe')) {
          ptyEnabled = true;
          ptyTransport = String(res.transport || 'pty');
          const bootMs = isWin ? 400 : 900;
          setTimeout(() => {
            if (myGen !== ptySessionGen) return;
            if (ptyId && !ptyPromptReady) setTerminalInputReady(true);
          }, bootMs);
        } else {
          const stalePtyId = sessionPtyId;
          if (typeof detachPtyIpc === 'function') detachPtyIpc();
          detachPtyIpc = null;
          ptyEnabled = false;
          ptyTransport = 'none';
          ptyId = null;
          setTerminalInputReady(true);
          if (res && res.ok && stalePtyId) {
            electron.ipcRenderer.invoke('terminal:ptyKill', stalePtyId).catch(() => {});
          }
        }
      }).catch(() => {
        if (typeof detachPtyIpc === 'function') detachPtyIpc();
        detachPtyIpc = null;
        ptyEnabled = false;
        ptyTransport = 'none';
        ptyId = null;
        setTerminalInputReady(true);
      });
    }

    // 默认启用交互式 PTY；若不可用则自动回退到原 os:exec 逻辑
    const startupInitial = window.__starTerminalInitial;
    if (startupInitial) {
      window.__starTerminalInitial = null;
      applyTerminalInitial(startupInitial, false);
    }
    updateTerminalPrompt();
    setTerminalInputReady(false);
    updateStaticLabels();
    function onStarTerminalOpen(event) {
      if (!container.isConnected) {
        window.removeEventListener('star:terminal-open', onStarTerminalOpen);
        return;
      }
      applyTerminalInitial(event && event.detail, true);
    }
    function onStarTerminalResize() {
      if (!ptyEnabled || !ptyId) return;
      const size = guessColsRows();
      electron.ipcRenderer.invoke('terminal:ptyResize', ptyId, size.cols, size.rows).catch(() => {});
    }
    enablePtySession();
    window.addEventListener('star:terminal-open', onStarTerminalOpen);
    window.addEventListener('resize', onStarTerminalResize);
    async function tryManagedLaunch(cmdLine) {
      if (!isWin) return false;
      const text = String(cmdLine || '').trim();
      if (!text || /[|><]/.test(text)) return false;
      const firstMatch = text.match(/^"([^"]+)"|^([^\s]+)/);
      const firstToken = (firstMatch && (firstMatch[1] || firstMatch[2]) || '').toLowerCase();
      const builtins = new Set(['cd', 'chdir', 'cls', 'dir', 'echo', 'set', 'path', 'prompt', 'title', 'type', 'copy', 'del', 'erase', 'move', 'ren', 'rename', 'md', 'mkdir', 'rd', 'rmdir', 'pushd', 'popd', 'call', 'start', 'exit']);
      if (!firstToken || builtins.has(firstToken)) return false;
      try {
        const resolved = await electron.ipcRenderer.invoke('os:resolveManagedLaunch', text, cwd);
        if (!resolved || !resolved.managed) return false;
        echoTerminalCommandLine(text);
        await electron.ipcRenderer.invoke('os:launch', { target: text, cwd });
        append(tr('terminalManagedLaunch', '[Star OS] launched internally: {path}', { path: resolved.exePath }) + '\n');
        output.scrollTop = output.scrollHeight;
        return true;
      } catch (_) {
        return false;
      }
    }

    async function run(cmd) {
      const rawLine = String(cmd ?? '');
      // 交互式 PTY：空行也发给 shell（部分脚本用「直接回车」确认）；节流避免误触/连发刷屏
      if (!rawLine.trim()) {
        if (ptyEnabled && ptyId) {
          const now = Date.now();
          if (now - lastPtyEmptyCrnlTs < 180) {
            input.value = '';
            return;
          }
          lastPtyEmptyCrnlTs = now;
          try {
            const writeRes = await electron.ipcRenderer.invoke('terminal:ptyWrite', ptyId, '\r\n');
            if (writeRes && writeRes.error) {
              append(normalizeTerminalDisplayText(String(writeRes.error)) + '\n');
            }
          } catch (e) {
            append(normalizeTerminalDisplayText(String((e && e.message) || e || 'terminal write failed')) + '\n');
          }
          input.value = '';
        }
        return;
      }
      const normalized = normalizeWinCmd(rawLine);
      const normalizedCommand = normalizeWindowsBatchInvocation(normalized);
      const parts = normalizedCommand.trim().split(/\s+/);
      // PTY 模式下交给 shell 自己处理 cd 与交互；旧模式保留原有逻辑
      if (!ptyEnabled && parts[0] === 'cd') {
        echoTerminalCommandLine(normalizedCommand);
        const dir = parts[1] || process.cwd() || process.env.USERPROFILE || process.env.HOME;
        const next = resolveTerminalDir(dir);
        electron.ipcRenderer.invoke('os:stat', next).then(stat => {
          if (stat && stat.isDir) { cwd = next; updateTerminalPrompt(); append(''); }
          else append((stat && stat.error) || 'cd: no such directory\n');
        });
        input.value = '';
        return;
      }
      const winCmd = translateCmd(normalizedCommand);
      if (winCmd === null) {
        clearOutput();
        input.value = '';
        return;
      }
      // 必须先交给 PTY：否则 tryManagedLaunch 会把用户名等误判成「内部启动应用」，根本进不了 cmd 的 stdin
      if (ptyEnabled && ptyId) {
        ptyCommandsSent += 1;
        try {
          const writeRes = await electron.ipcRenderer.invoke('terminal:ptyWrite', ptyId, String(winCmd) + '\r\n');
          if (writeRes && writeRes.error) {
            append(normalizeTerminalDisplayText(String(writeRes.error)) + '\n');
          }
        } catch (e) {
          append(normalizeTerminalDisplayText(String((e && e.message) || e || 'terminal write failed')) + '\n');
        }
        input.value = '';
        return;
      }
      if (await tryManagedLaunch(String(winCmd))) {
        input.value = '';
        return;
      }
      echoTerminalCommandLine(normalizedCommand);

      // Stable fallback: avoid relying on streamed exec events (some environments may drop them),
      // and instead wait for the full stdout/stderr result.
      try {
        const r = await electron.ipcRenderer.invoke('os:exec', winCmd, cwd);
        if (r && r.stdout) append(normalizeTerminalDisplayText(r.stdout));
        if (r && r.stderr) append(normalizeTerminalDisplayText(r.stderr));
        if (!r || (!r.stdout && !r.stderr)) {
          append(tr('terminalNoOutput', '(No output)') + '\n');
        }
      } catch (error) {
        append(normalizeTerminalDisplayText(String(error && error.message ? error.message : error)) + '\n');
      }
      append('\n');
      output.scrollTop = output.scrollHeight;
      input.value = '';
      return;

      const execId = 'exec_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      let hadChunk = false;
      const onChunk = (_, id, type, text) => {
        if (id !== execId || !text) return;
        hadChunk = true;
        append(text);
      };
      const onEnd = (_, id, code) => {
        if (id !== execId) return;
        electron.ipcRenderer.removeListener('terminal:execChunk', onChunk);
        electron.ipcRenderer.removeListener('terminal:execEnd', onEnd);
        if (!hadChunk) append(typeof t === 'function' ? t('terminalNoOutput', '（已执行完毕，无输出）') : '(No output)\n');
        append('\n');
        output.scrollTop = output.scrollHeight;
      };
      electron.ipcRenderer.on('terminal:execEnd', onEnd);
      electron.ipcRenderer.on('terminal:execChunk', onChunk);
      electron.ipcRenderer.invoke('os:exec', winCmd, cwd, execId).then(r => {
        if (r.streamed) return;
        electron.ipcRenderer.removeListener('terminal:execChunk', onChunk);
        electron.ipcRenderer.removeListener('terminal:execEnd', onEnd);
        if (r.stdout) append(r.stdout);
        if (r.stderr) append(r.stderr);
        if (!r.stdout && !r.stderr) append(typeof t === 'function' ? t('terminalNoOutput', '（已执行完毕，无输出）') : '(No output)\n');
        append('\n');
        output.scrollTop = output.scrollHeight;
      });
      input.value = '';
    }
    function onTerminalInputKeydown(e) {
      // PTY 模式下支持 Ctrl+C 发送 SIGINT（不影响选中文本时的复制）
      if (ptyEnabled && ptyId && e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === 'c' || e.key === 'C')) {
        try {
          const sel = window.getSelection && window.getSelection();
          const hasSelection = sel && String(sel.toString() || '').length > 0;
          if (!hasSelection) {
            e.preventDefault();
            e.stopPropagation();
            electron.ipcRenderer.invoke('terminal:ptyWrite', ptyId, '\x03').catch(() => {});
            return;
          }
        } catch (_) {}
      }
      if (e.key === 'Enter') {
        if (e.repeat) return;
        if (e.isComposing) return;
        e.preventDefault();
        e.stopPropagation();
        const text = input.value;
        input.value = '';
        run(text);
      }
    }
    if (input) input.addEventListener('keydown', onTerminalInputKeydown);
    setWindowLocaleRefresh(container, () => {
      updateStaticLabels();
      updateTerminalPrompt();
    });
    container.__starTerminalTeardown = () => {
      ptySessionGen += 1;
      try {
        if (typeof detachPtyIpc === 'function') detachPtyIpc();
      } catch (_) {}
      detachPtyIpc = null;
      const killId = ptyId;
      ptyId = null;
      ptyEnabled = false;
      if (killId) {
        try { electron.ipcRenderer.invoke('terminal:ptyKill', killId).catch(() => {}); } catch (_) {}
      }
      try {
        window.removeEventListener('star:terminal-open', onStarTerminalOpen);
        window.removeEventListener('resize', onStarTerminalResize);
      } catch (_) {}
      if (input) {
        try { input.removeEventListener('keydown', onTerminalInputKeydown); } catch (_) {}
      }
    };
  },

  'redis-cli'(container) {
    if (!container) return;
    const output = container.querySelector('#redis-output');
    const input = container.querySelector('#redis-input');
    const promptEl = container.querySelector('#redis-prompt');

    const STORAGE_KEY = 'star-redis-v1';
    const DEFAULT_HOST = '127.0.0.1';
    const DEFAULT_PORT = 6379;
    const MAX_DBS = 16;

    const now = () => Date.now();

    function append(text) {
      if (!output) return;
      output.appendChild(document.createTextNode(text));
      output.scrollTop = output.scrollHeight;
    }
    function tr(key, fallback) {
      try {
        if (typeof t === 'function') {
          const v = t(key);
          return v === key ? fallback : v;
        }
      } catch (_) {}
      return fallback;
    }

    function save(state) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    }
    function load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch (_) { return null; }
    }

    function createEmptyState() {
      return {
        selectedDb: 0,
        dbs: Array.from({ length: MAX_DBS }, () => ({ keys: {}, meta: { versions: {} } }))
      };
    }

    const state = load() || createEmptyState();
    if (!Array.isArray(state.dbs) || state.dbs.length < 1) {
      const fresh = createEmptyState();
      state.selectedDb = fresh.selectedDb;
      state.dbs = fresh.dbs;
    }

    function setPrompt() {
      const db = Number(state.selectedDb || 0);
      if (promptEl) promptEl.textContent = `${DEFAULT_HOST}:${DEFAULT_PORT}[${db}]>`;
    }
    setPrompt();

    function getDb() {
      const idx = Math.max(0, Math.min(MAX_DBS - 1, Number(state.selectedDb || 0)));
      if (!state.dbs[idx]) state.dbs[idx] = { keys: {}, meta: { versions: {} } };
      if (!state.dbs[idx].keys) state.dbs[idx].keys = {};
      if (!state.dbs[idx].meta) state.dbs[idx].meta = { versions: {} };
      if (!state.dbs[idx].meta.versions) state.dbs[idx].meta.versions = {};
      return state.dbs[idx];
    }

    function purgeExpired(db) {
      const t = now();
      const keys = db.keys || {};
      let changed = false;
      for (const k of Object.keys(keys)) {
        const e = keys[k];
        if (e && e.expireAt && t >= e.expireAt) {
          delete keys[k];
          changed = true;
        }
      }
      if (changed) save(state);
    }

    function replyNil() { return '(nil)\n'; }
    /** cmd(..., { blockProbe: true }) 在阻塞类命令未就绪时返回此值，供 setTimeout 轮询 */
    const REDIS_BLOCK_PENDING = '__STAR_REDIS_BLOCK_PENDING__\n';
    function replyOk() { return 'OK\n'; }
    function replyInt(n) { return `(integer) ${Number(n)}\n`; }
    function replyErr(msg) { return `(error) ${msg}\n`; }
    function replyStr(s) {
      // redis-cli: bulk string with quotes
      const v = String(s);
      return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"\n`;
    }
    function replyArr(items) {
      if (!items || !items.length) return '(empty array)\n';
      return items.map((it, i) => `${i + 1}) ${it}`).join('') + '\n'.replace(/\n\n$/, '\n');
    }

    function quoteItem(v) { return `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`; }

    function formatArray(values) {
      if (!values.length) return '(empty array)\n';
      let out = '';
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        out += `${i + 1}) ${v === null ? '(nil)' : quoteItem(v)}\n`;
      }
      return out;
    }

    function parseArgs(line) {
      const s = String(line || '').trim();
      if (!s) return [];
      const out = [];
      let cur = '';
      let q = null;
      let esc = false;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (esc) { cur += ch; esc = false; continue; }
        if (ch === '\\\\') { esc = true; continue; }
        if (q) {
          if (ch === q) { q = null; continue; }
          cur += ch;
          continue;
        }
        if (ch === '"' || ch === "'") { q = ch; continue; }
        if (/\s/.test(ch)) {
          if (cur.length) { out.push(cur); cur = ''; }
          continue;
        }
        cur += ch;
      }
      if (cur.length) out.push(cur);
      return out;
    }

    function globToRegExp(glob) {
      const g = String(glob || '*');
      const esc = g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
      return new RegExp('^' + esc + '$');
    }

    function getEntry(db, key) {
      purgeExpired(db);
      return db.keys[key] || null;
    }
    function setEntry(db, key, entry) {
      db.keys[key] = entry;
      if (db.meta && db.meta.versions) db.meta.versions[String(key)] = (Number(db.meta.versions[String(key)] || 0) + 1);
      save(state);
    }
    function delEntry(db, key) {
      const existed = Object.prototype.hasOwnProperty.call(db.keys, key);
      if (existed) delete db.keys[key];
      if (existed && db.meta && db.meta.versions) db.meta.versions[String(key)] = (Number(db.meta.versions[String(key)] || 0) + 1);
      if (existed) save(state);
      return existed;
    }
    function getKeyVersion(db, key) {
      try { return Number(db && db.meta && db.meta.versions ? (db.meta.versions[String(key)] || 0) : 0); } catch (_) { return 0; }
    }

    function ensureType(entry, type) {
      if (!entry) return null;
      if (entry.type !== type) return 'WRONGTYPE Operation against a key holding the wrong kind of value';
      return null;
    }

    // --- helpers for advanced types ---
    function getOrCreateBitmap(db, key) {
      let e = getEntry(db, key);
      if (!e) e = { type: 'bitmap', value: { bits: {}, max: -1 }, expireAt: null };
      const err = ensureType(e, 'bitmap');
      if (err) return { err };
      if (!e.value || typeof e.value !== 'object') e.value = { bits: {}, max: -1 };
      if (!e.value.bits || typeof e.value.bits !== 'object') e.value.bits = {};
      if (typeof e.value.max !== 'number') e.value.max = -1;
      return { entry: e };
    }
    function bitmapGet(e, offset) {
      return e.value.bits && e.value.bits[String(offset)] ? 1 : 0;
    }
    function bitmapSet(e, offset, bit) {
      const k = String(offset);
      const old = bitmapGet(e, offset);
      if (bit) e.value.bits[k] = 1;
      else delete e.value.bits[k];
      if (offset > e.value.max) e.value.max = offset;
      return old;
    }
    function bitmapClone(e) {
      return {
        type: 'bitmap',
        value: {
          bits: { ...(e.value && e.value.bits ? e.value.bits : {}) },
          max: typeof (e.value && e.value.max) === 'number' ? e.value.max : -1
        },
        expireAt: e.expireAt || null
      };
    }
    function bitmapFromBits(bitsObj, maxBit) {
      return { type: 'bitmap', value: { bits: bitsObj || {}, max: typeof maxBit === 'number' ? maxBit : -1 }, expireAt: null };
    }
    function getOrCreateHll(db, key) {
      let e = getEntry(db, key);
      if (!e) e = { type: 'hll', value: { set: {} }, expireAt: null };
      const err = ensureType(e, 'hll');
      if (err) return { err };
      if (!e.value || typeof e.value !== 'object') e.value = { set: {} };
      if (!e.value.set || typeof e.value.set !== 'object') e.value.set = {};
      return { entry: e };
    }
    function getOrCreateGeo(db, key) {
      let e = getEntry(db, key);
      if (!e) e = { type: 'geo', value: { members: {} }, expireAt: null };
      const err = ensureType(e, 'geo');
      if (err) return { err };
      if (!e.value || typeof e.value !== 'object') e.value = { members: {} };
      if (!e.value.members || typeof e.value.members !== 'object') e.value.members = {};
      return { entry: e };
    }
    function haversineMeters(lon1, lat1, lon2, lat2) {
      const toRad = (d) => (d * Math.PI) / 180;
      const R = 6371000;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    }
    function unitToMeters(unit) {
      const u = String(unit || 'm').toLowerCase();
      if (u === 'm') return 1;
      if (u === 'km') return 1000;
      if (u === 'mi') return 1609.344;
      if (u === 'ft') return 0.3048;
      return null;
    }

    // --- pubsub (cross-window) ---
    const pubsub = (() => {
      const bc = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('star-redis-pubsub') : null;
      const clientId = (() => {
        try { return 'c_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36); } catch (_) { return String(Date.now()); }
      })();
      const subs = new Map(); // channel -> true
      const psubs = new Map(); // pattern -> true
      const ssSubs = new Map(); // sharded channel -> true
      const handlers = new Set(); // callback(channel, message, raw)
      const shardHandlers = new Set(); // callback(shardchannel, message, raw)
      const peers = new Map(); // peerId -> { ts, subs:Set, psubs:Set, ssSubs:Set }
      const PEER_TTL_MS = 15000;

      function snapshot() {
        return {
          type: 'sub-snapshot',
          peer: clientId,
          ts: Date.now(),
          subs: Array.from(subs.keys()),
          psubs: Array.from(psubs.keys()),
          ssSubs: Array.from(ssSubs.keys()),
        };
      }

      function sendSnapshot() {
        if (!bc) return;
        try { bc.postMessage(snapshot()); } catch (_) {}
      }

      function prunePeers() {
        const t = Date.now();
        for (const [pid, info] of peers.entries()) {
          if (!info || !info.ts || (t - info.ts) > PEER_TTL_MS) peers.delete(pid);
        }
      }

      function updatePeer(msg) {
        if (!msg || !msg.peer || msg.peer === clientId) return;
        peers.set(String(msg.peer), {
          ts: Number(msg.ts) || Date.now(),
          subs: new Set((msg.subs || []).map(String)),
          psubs: new Set((msg.psubs || []).map(String)),
          ssSubs: new Set((msg.ssSubs || []).map(String)),
        });
      }

      if (bc) {
        bc.onmessage = (ev) => {
          const msg = ev && ev.data;
          if (!msg) return;
          if (msg.type === 'sub-snapshot') {
            updatePeer(msg);
            return;
          }
          if (msg.type === 'shard-publish') {
            const sch = String(msg.shard || msg.channel || '');
            if (!ssSubs.has(sch)) return;
            shardHandlers.forEach(fn => { try { fn(sch, msg.message, msg); } catch (_) {} });
            return;
          }
          if (msg.type !== 'publish') return;
          const channel = String(msg.channel);
          let matched = subs.has(channel);
          if (!matched) {
            for (const p of psubs.keys()) {
              try { if (globToRegExp(p).test(channel)) { matched = true; break; } } catch (_) {}
            }
          }
          if (!matched) return;
          handlers.forEach(fn => { try { fn(channel, msg.message, msg); } catch (_) {} });
        };
      }

      // periodic heartbeat for cross-window subscription counting
      try {
        setInterval(() => { prunePeers(); sendSnapshot(); }, 5000);
      } catch (_) {}
      // initial announce
      sendSnapshot();

      return {
        subscribe(ch) { subs.set(ch, true); sendSnapshot(); },
        unsubscribe(ch) { subs.delete(ch); sendSnapshot(); },
        psubscribe(p) { psubs.set(p, true); sendSnapshot(); },
        punsubscribe(p) { psubs.delete(p); sendSnapshot(); },
        onMessage(fn) { handlers.add(fn); return () => handlers.delete(fn); },
        publish(ch, message) {
          if (bc) bc.postMessage({ type: 'publish', channel: ch, message });
        },
        ssubscribe(ch) { ssSubs.set(ch, true); sendSnapshot(); },
        sunsubscribe(ch) { if (ch == null || ch === '') ssSubs.clear(); else ssSubs.delete(ch); sendSnapshot(); },
        spublish(ch, message) {
          if (bc) bc.postMessage({ type: 'shard-publish', shard: ch, channel: ch, message });
        },
        onShardMessage(fn) { shardHandlers.add(fn); return () => shardHandlers.delete(fn); },
        isSSubscribed(ch) { return ssSubs.has(ch); },
        shardList() { return Array.from(ssSubs.keys()); },
        shardNumSub(ch) {
          prunePeers();
          let n = ssSubs.has(String(ch)) ? 1 : 0;
          for (const info of peers.values()) {
            try { if (info && info.ssSubs && info.ssSubs.has(String(ch))) n += 1; } catch (_) {}
          }
          return n;
        },
        isSubscribed(ch) { return subs.has(ch); },
        isPSubscribed(p) { return psubs.has(p); },
        list() { return Array.from(subs.keys()); },
        plist() { return Array.from(psubs.keys()); },
        numsub(ch) {
          prunePeers();
          const channel = String(ch);
          let n = subs.has(channel) ? 1 : 0;
          for (const info of peers.values()) {
            try { if (info && info.subs && info.subs.has(channel)) n += 1; } catch (_) {}
          }
          return n;
        },
        numpat() {
          prunePeers();
          let n = psubs.size;
          for (const info of peers.values()) {
            try { n += info && info.psubs ? info.psubs.size : 0; } catch (_) {}
          }
          return n;
        }
      };
    })();

    // --- transaction ---
    const tx = {
      inMulti: false,
      queue: [],
      watching: {}, // key -> version
      reset() { this.inMulti = false; this.queue = []; },
    };

    /** Redis 学习终端：扩展模拟（配置/认证/脚本/慢日志等） */
    const redisSimMeta = {
      requirepass: null,
      authed: true,
      clientName: '',
      clientId: 1,
      slowlog: [],
      scripts: new Map(),
      functions: new Map(), // libName -> { code: string, engine: string }
      loadedModules: [], // { name, ver }
      replicaOf: null, // null | { host, port }
      replId: '8371c39e0b8c7f5a0b0d0c0e0f0a0b0c0d0e0f0',
      replOffset: 0,
      clientCaching: false,
      clientTracking: false,
      lastSave: Date.now(),
      config: { databases: '16', 'tcp-keepalive': '300', timeout: '0', 'maxmemory-policy': 'noeviction' }
    };
    function redisKeySlot(key) {
      let h = 5381;
      for (let i = 0; i < key.length; i++) h = ((h << 5) + h) ^ key.charCodeAt(i);
      return Math.abs(h >>> 0) % 16384;
    }
    function redisEntryToDumpObj(e) {
      if (!e) return null;
      try { return JSON.parse(JSON.stringify(e)); } catch (_) { return { type: e.type, value: e.value, expireAt: e.expireAt }; }
    }
    function redisDumpHex(e) {
      const json = JSON.stringify(redisEntryToDumpObj(e));
      let hex = '';
      for (let i = 0; i < json.length; i++) hex += ('00' + json.charCodeAt(i).toString(16)).slice(-2);
      return hex;
    }
    function redisRestoreFromHex(hex) {
      const s = String(hex || '').replace(/\s+/g, '');
      if (s.length % 2) throw new Error('DUMP payload length');
      let bin = '';
      for (let i = 0; i < s.length; i += 2) bin += String.fromCharCode(parseInt(s.slice(i, i + 2), 16));
      return JSON.parse(bin);
    }
    function redisLcsStrings(a, b) {
      const m = a.length; const n = b.length;
      const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
      let i = m; let j = n; let out = '';
      while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) { out = a[i - 1] + out; i--; j--; }
        else if (dp[i - 1][j] > dp[i][j - 1]) i--; else j--;
      }
      return { str: out, len: dp[m][n] };
    }
    function redisSlowlogPush(cmdArgs) {
      redisSimMeta.slowlog.unshift({ id: redisSimMeta.slowlog.length + 1, ts: Date.now(), args: (cmdArgs || []).map(String) });
      if (redisSimMeta.slowlog.length > 128) redisSimMeta.slowlog.length = 128;
    }
    function redisScriptSha1(src) {
      let h = 2166136261;
      for (let i = 0; i < src.length; i++) h = Math.imul(h ^ src.charCodeAt(i), 16777619);
      return ('0000000000000000000000000000000000000000' + (h >>> 0).toString(16)).slice(-40);
    }
    function evalRedisCall(cmd, callArgs, db) {
      const c = String(cmd || '').toUpperCase();
      const a = callArgs.map(String);
      if (c === 'GET' && a[0]) {
        const e = getEntry(db, a[0]);
        if (!e || e.type !== 'string') return null;
        return e.value;
      }
      if (c === 'SET' && a.length >= 2) {
        setEntry(db, a[0], { type: 'string', value: String(a[1]), expireAt: null });
        return 'OK';
      }
      if (c === 'DEL' && a.length) {
        let n = 0;
        for (const k of a) if (delEntry(db, k)) n++;
        return n;
      }
      if (c === 'INCR' && a[0]) {
        const e = getEntry(db, a[0]);
        let v = 0;
        let ex = null;
        if (e) {
          if (e.type !== 'string') throw new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
          ex = e.expireAt;
          v = parseInt(e.value, 10) || 0;
        }
        v++;
        setEntry(db, a[0], { type: 'string', value: String(v), expireAt: ex });
        return v;
      }
      if (c === 'ECHO' && a[0] != null) return a.join(' ');
      return null;
    }
    function runEvalJs(script, keys, argv, db) {
      const redis = { call: (cmd, ...ra) => evalRedisCall(cmd, ra, db) };
      try {
        const fn = new Function('redis', 'KEYS', 'ARGV', '"use strict"; return (function(){\n' + script + '\n})();');
        return fn(redis, keys, argv);
      } catch (e) {
        return replyErr('ERR Error running script: ' + (e && e.message));
      }
    }

    // --- streams ---
    function getOrCreateStream(db, key) {
      let e = getEntry(db, key);
      if (!e) e = { type: 'stream', value: { entries: [], lastMs: 0, lastSeq: 0, groups: {} }, expireAt: null };
      const err = ensureType(e, 'stream');
      if (err) return { err };
      if (!e.value || typeof e.value !== 'object') e.value = { entries: [], lastMs: 0, lastSeq: 0, groups: {} };
      if (!Array.isArray(e.value.entries)) e.value.entries = [];
      if (!Number.isFinite(e.value.lastMs)) e.value.lastMs = 0;
      if (!Number.isFinite(e.value.lastSeq)) e.value.lastSeq = 0;
      if (!e.value.groups || typeof e.value.groups !== 'object') e.value.groups = {};
      return { entry: e };
    }
    function parseStreamId(id) {
      if (id === '-') return { ms: Number.NEGATIVE_INFINITY, seq: Number.NEGATIVE_INFINITY };
      if (id === '+') return { ms: Number.POSITIVE_INFINITY, seq: Number.POSITIVE_INFINITY };
      const m = String(id).match(/^(\d+)-(\d+)$/);
      if (!m) return null;
      return { ms: Number(m[1]), seq: Number(m[2]) };
    }
    function cmpId(a, b) {
      if (a.ms !== b.ms) return a.ms - b.ms;
      return a.seq - b.seq;
    }
    function nextAutoId(stream) {
      const ms = now();
      if (ms > stream.value.lastMs) { stream.value.lastMs = ms; stream.value.lastSeq = 0; }
      else stream.value.lastSeq += 1;
      return `${stream.value.lastMs}-${stream.value.lastSeq}`;
    }
    function formatStreamEntries(entries) {
      if (!entries.length) return '(empty array)\n';
      let out = '';
      for (let i = 0; i < entries.length; i++) {
        const en = entries[i];
        out += `${i + 1}) 1) "${en.id}"\n   2) ${'\n'}`;
        const kv = en.fields || {};
        const keys = Object.keys(kv);
        if (!keys.length) {
          out += '      (empty array)\n';
        } else {
          for (let j = 0; j < keys.length; j++) {
            const k = keys[j];
            const v = kv[k];
            out += `      ${j + 1}) "${k}"\n      ${j + 2}) "${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"\n`;
            j++; // we wrote 2 lines per field in redis-cli style; keep simple output later (see below)
          }
        }
      }
      // Above is messy; we will not use this helper directly.
      return out;
    }

    // --- scan family helpers ---
    function scanSlice(items, cursor, count) {
      const c = Number(cursor);
      let cur = Number.isInteger(c) && c >= 0 ? c : 0;
      let cnt = Number(count);
      if (!Number.isFinite(cnt) || cnt <= 0) cnt = 10;
      const slice = items.slice(cur, cur + cnt);
      const next = (cur + cnt) >= items.length ? 0 : (cur + cnt);
      return { next, slice };
    }

    // --- set operations ---
    function setAsArray(e) {
      return Object.keys(e.value || {});
    }
    function setFromArray(arr) {
      const obj = {};
      arr.forEach(v => { obj[String(v)] = 1; });
      return obj;
    }

    // --- zset helpers ---
    function zsetMembers(e) {
      return Object.keys(e.value || {});
    }
    function zsetSorted(e, desc = false) {
      const v = e.value || {};
      const members = Object.keys(v);
      members.sort((a, b) => (v[a] - v[b]) || (a < b ? -1 : 1));
      if (desc) members.reverse();
      return members;
    }
    function normalizeIndex(idx, len) {
      let i = Number(idx);
      if (!Number.isInteger(i)) return null;
      if (i < 0) i = len + i;
      return i;
    }

    // --- SORT (learning) ---
    function sortValues(values, alpha, desc) {
      const arr = values.slice();
      if (alpha) arr.sort((a, b) => String(a).localeCompare(String(b)));
      else arr.sort((a, b) => Number(a) - Number(b));
      if (desc) arr.reverse();
      return arr;
    }

    function cmd(line, _internalExec = false, opts = {}) {
      const args = parseArgs(line);
      if (!args.length) return '';
      const name = args[0].toUpperCase();
      const db = getDb();
      purgeExpired(db);

      const noAuthWhitelist = new Set(['AUTH', 'HELLO', 'QUIT', 'EXIT', 'PING', 'ECHO', 'COMMAND', 'CONFIG']);
      if (redisSimMeta.requirepass && !redisSimMeta.authed && !noAuthWhitelist.has(name)) {
        return replyErr('NOAUTH Authentication required.');
      }

      // Transaction queueing
      if (tx.inMulti && !_internalExec) {
        // MULTI itself is handled below; DISCARD/EXEC also handled below.
        if (!['EXEC', 'DISCARD', 'MULTI'].includes(name)) {
          tx.queue.push(line);
          return 'QUEUED\n';
        }
      }

      // connection
      if (name === 'PING') return args[1] ? replyStr(args[1]) : 'PONG\n';
      if (name === 'ECHO') return args.length >= 2 ? replyStr(args.slice(1).join(' ')) : replyErr('ERR wrong number of arguments for \'echo\' command');
      if (name === 'QUIT' || name === 'EXIT') return 'OK\n';

      if (name === 'HELP') {
        if (args.length === 1) {
          return 'Star OS redis-cli (learning):\n'
            + 'HELP [@category]  — @connection @string @hash @list @set @sorted_set @keys @stream @pubsub @transactions @server @script\n'
            + 'Core: PING ECHO AUTH HELLO SELECT GET SET HSET LPUSH ...\n'
            + 'EVAL uses JavaScript subset with redis.call(\'GET\',key), KEYS[], ARGV[] (not full Lua).\n';
        }
        const t = String(args[1] || '').toLowerCase();
        const map = {
          '@connection': 'AUTH HELLO PING ECHO QUIT SELECT',
          '@string': 'GET GETEX SET SETNX GETSET MGET MSET MSETNX APPEND STRLEN GETRANGE SETRANGE GETDEL COPY DUMP RESTORE LCS STRALGO INCR INCRBY DECR DECRBY INCRBYFLOAT GETBIT SETBIT BITCOUNT BITOP BITPOS BITFIELD',
          '@hash': 'HSET HGET HDEL HGETALL HKEYS HVALS HEXISTS HLEN HMSET HMGET HINCRBY HINCRBYFLOAT HRANDFIELD HSTRLEN',
          '@list': 'LPUSH RPUSH LPUSHX RPUSHX LPOP RPOP LLEN LINDEX LINSERT LSET LREM LTRIM LRANGE RPOPLPUSH LMOVE LPOS BLPOP BRPOP BLMOVE BLMPOP (blocking: 50ms 轮询至 timeout，上限 60s；MULTI 内仍同步 QUEUED)',
          '@set': 'SADD SREM SMEMBERS SCARD SISMEMBER SMISMEMBER SMOVE SPOP SRANDMEMBER SINTERCARD SINTER SUNION SDIFF ...',
          '@sorted_set': 'ZADD ZREM ZRANGE ZRANGESTORE ZSCORE ZCARD ZINCRBY ZCOUNT ZRANK ZMSCORE ZLEXCOUNT ZRANDMEMBER ZINTER ZUNION ZDIFF ZDIFFSTORE ZINTERCARD ZMPOP BZMPOP BZPOPMIN BZPOPMAX (BZ* 同 BLPOP 轮询) ...',
          '@keys': 'DEL EXISTS TYPE TTL PTTL EXPIRE EXPIREAT PEXPIRE PEXPIREAT EXPIRETIME PEXPIRETIME PERSIST MOVE MIGRATE RENAME RANDOMKEY TOUCH UNLINK OBJECT WAIT',
          '@stream': 'XADD (NOMKSTREAM MAXLEN) XRANGE XREVRANGE XLEN XDEL XTRIM (MAXLEN|MINID) XINFO XGROUP XREAD XAUTOCLAIM XSETID',
          '@pubsub': 'SUBSCRIBE UNSUBSCRIBE PSUBSCRIBE PUNSUBSCRIBE PUBLISH SPUBLISH SSUBSCRIBE SUNSUBSCRIBE PUBSUB',
          '@transactions': 'MULTI EXEC DISCARD WATCH UNWATCH',
          '@server': 'INFO TIME DBSIZE FLUSHDB FLUSHALL CONFIG CLIENT RESET MODULE ACL LATENCY SWAPDB REPLICAOF ROLE PSYNC FAILOVER SHUTDOWN SAVE BGSAVE LASTSAVE MEMORY SLOWLOG',
          '@cluster': 'CLUSTER INFO NODES SLOTS KEYSLOT GETKEYSINSLOT COUNTKEYSINSLOT READONLY READWRITE ASKING',
          '@script': 'EVAL EVALSHA SCRIPT LOAD EXISTS FLUSH KILL FUNCTION FCALL FCALL_RO'
        };
        return (map[t] || 'Unknown topic. Try HELP without args.') + '\n';
      }
      if (name === 'HELLO') {
        return formatArray(['server', 'redis', 'version', '7.2.0-sim', 'proto', '3', 'id', String(redisSimMeta.clientId), 'mode', 'standalone', 'role', 'master']);
      }
      if (name === 'AUTH') {
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'auth\' command');
        const pw = args.slice(1).join(' ');
        if (!redisSimMeta.requirepass) { redisSimMeta.authed = true; return replyOk(); }
        if (pw === redisSimMeta.requirepass) { redisSimMeta.authed = true; return replyOk(); }
        return replyErr('ERR invalid password');
      }
      if (name === 'TIME') {
        const s = Math.floor(Date.now() / 1000);
        const us = (Date.now() % 1000) * 1000;
        return formatArray([String(s), String(us)]);
      }
      if (name === 'INFO') {
        const sec = (args[1] || 'default').toLowerCase();
        let out = '# Server\nredis_version:7.2.0-sim\nredis_mode:standalone\nos:StarOS\n';
        if (sec === 'default' || sec === 'all' || sec === 'memory') {
          out += '# Memory\nused_memory_human:1.00M\nused_memory_peak_human:1.00M\n';
        }
        if (sec === 'default' || sec === 'all' || sec === 'clients') {
          out += '# Clients\nconnected_clients:1\n';
        }
        if (sec === 'default' || sec === 'all' || sec === 'stats') {
          out += '# Stats\ntotal_connections_received:1\ntotal_commands_processed:0\n';
        }
        if (sec === 'default' || sec === 'all' || sec === 'replication') {
          out += '# Replication\nrole:master\nconnected_slaves:0\n';
        }
        if (sec === 'default' || sec === 'all' || sec === 'cpu') {
          out += '# CPU\nused_cpu_sys:0\n';
        }
        if (sec === 'keyspace') {
          out += '# Keyspace\ndb0:keys=' + Object.keys(db.keys || {}).length + ',expires=0\n';
        }
        return out;
      }
      if (name === 'CONFIG') {
        const sub = (args[1] || '').toUpperCase();
        if (sub === 'GET' && args[2]) {
          const pat = args[2];
          if (pat === '*') {
            let o = '';
            for (const k of Object.keys(redisSimMeta.config)) o += k + '\n' + redisSimMeta.config[k] + '\n';
            if (redisSimMeta.requirepass) o += 'requirepass\n' + redisSimMeta.requirepass + '\n';
            return o;
          }
          if (pat === 'requirepass') return redisSimMeta.requirepass ? (pat + '\n' + redisSimMeta.requirepass + '\n') : pat + '\n\n';
          const v = redisSimMeta.config[pat];
          return v != null ? pat + '\n' + v + '\n' : '\n';
        }
        if (sub === 'SET' && args[2] != null) {
          const k = args[2];
          const v = args.slice(3).join(' ') || '';
          if (k === 'requirepass') {
            redisSimMeta.requirepass = v || null;
            redisSimMeta.authed = !redisSimMeta.requirepass;
            return replyOk();
          }
          redisSimMeta.config[k] = v;
          return replyOk();
        }
        if (sub === 'RESETSTAT') return replyOk();
        return replyErr('ERR CONFIG subcommand or wrong number of arguments');
      }
      if (name === 'CLIENT') {
        const sub = (args[1] || '').toUpperCase();
        if (sub === 'LIST') return 'id=' + redisSimMeta.clientId + ' addr=127.0.0.1:0 name=' + (redisSimMeta.clientName || '') + ' age=0 idle=0\n';
        if (sub === 'ID') return replyInt(redisSimMeta.clientId);
        if (sub === 'GETNAME') return redisSimMeta.clientName ? replyStr(redisSimMeta.clientName) : replyNil();
        if (sub === 'SETNAME' && args[2]) { redisSimMeta.clientName = String(args[2]); return replyOk(); }
        if (sub === 'INFO') {
          return 'id=' + redisSimMeta.clientId + '\r\naddr=127.0.0.1:6379\r\nname=' + (redisSimMeta.clientName || '') + '\r\nuser=default\r\nlib-name=\r\nlib-ver=\r\n(learning)\r\n';
        }
        if (sub === 'SETINFO') return replyOk();
        if (sub === 'CACHING') {
          if (String(args[2] || '').toUpperCase() === 'YES') redisSimMeta.clientCaching = true;
          else if (String(args[2] || '').toUpperCase() === 'NO') redisSimMeta.clientCaching = false;
          return replyOk();
        }
        if (sub === 'TRACKING') {
          const on = String(args[2] || 'ON').toUpperCase() !== 'OFF';
          redisSimMeta.clientTracking = on;
          return replyOk();
        }
        if (sub === 'TRACKINGINFO') return formatArray(['flags', redisSimMeta.clientTracking ? 'on' : 'off']);
        if (sub === 'NO-TOUCH') return replyOk();
        if (sub === 'NO-EVICT') return replyOk();
        if (sub === 'UNBLOCK') return replyInt(0);
        if (sub === 'KILL' || sub === 'PAUSE' || sub === 'REPLY') return replyErr('ERR learning mode: CLIENT ' + sub + ' not fully implemented');
        return replyErr('ERR unknown CLIENT subcommand');
      }
      if (name === 'SHUTDOWN') {
        redisSimMeta.authed = false;
        return replyErr('ERR command not allowed in learning shell (simulated: would stop server)');
      }
      if (name === 'SAVE' || name === 'BGSAVE') {
        redisSimMeta.lastSave = Date.now();
        return name === 'BGSAVE' ? 'Background saving started\n' : replyOk();
      }
      if (name === 'LASTSAVE') return replyInt(Math.floor(redisSimMeta.lastSave / 1000));
      if (name === 'MEMORY') {
        const sub = (args[1] || '').toUpperCase();
        if (sub === 'STATS' || sub === 'DOCTOR') {
          return 'used_memory:1048576\nused_memory_human:1.00M\nused_memory_peak:1048576\nmaxmemory:0\n(learning mode)\n';
        }
        if (sub === 'USAGE' && args[2]) {
          const e = getEntry(db, args[2]);
          return replyInt(e ? 64 : 0);
        }
        return replyErr('ERR syntax');
      }
      if (name === 'SLOWLOG') {
        const sub = (args[1] || '').toUpperCase();
        if (sub === 'GET') {
          const n = Math.min(128, Math.max(1, parseInt(args[2], 10) || 10));
          if (!redisSimMeta.slowlog.length) return '(empty array)\n';
          return redisSimMeta.slowlog.slice(0, n).map((e, i) => (i + 1) + ') 1) (integer) ' + e.id + '\n   2) (integer) ' + Math.floor(e.ts / 1000) + '\n   3) (integer) 0\n   4) 1) ' + quoteItem(e.args.join(' ')) + '\n').join('') + '\n';
        }
        if (sub === 'LEN') return replyInt(redisSimMeta.slowlog.length);
        if (sub === 'RESET') { redisSimMeta.slowlog = []; return replyOk(); }
        return replyErr('ERR syntax');
      }
      if (name === 'MODULE') {
        const sub = (args[1] || '').toUpperCase();
        if (sub === 'LIST') {
          if (!redisSimMeta.loadedModules.length) return '(empty array)\n';
          return formatArray(redisSimMeta.loadedModules.flatMap(m => [m.name, m.ver]));
        }
        if (sub === 'LOAD') {
          const path = String(args[2] || 'unknown');
          const modName = path.split(/[/\\]/).pop().replace(/\.[^.]+$/, '') || 'module';
          redisSimMeta.loadedModules.push({ name: modName, ver: '1' });
          return replyOk();
        }
        if (sub === 'LOADEX') {
          redisSimMeta.loadedModules.push({ name: 'loadedex', ver: '1' });
          return replyOk();
        }
        if (sub === 'UNLOAD') {
          const n = String(args[2] || '');
          redisSimMeta.loadedModules = redisSimMeta.loadedModules.filter(m => m.name !== n);
          return replyOk();
        }
        return replyErr('ERR unknown MODULE subcommand');
      }
      if (name === 'ACL') {
        const sub = (args[1] || '').toUpperCase();
        if (sub === 'LIST') return 'user default on sanitize-payload #... ~* &* +@all (simulated)\n';
        if (sub === 'USERS') return formatArray(['default']);
        if (sub === 'WHOAMI') return replyStr('default');
        if (sub === 'GETUSER' && args[2]) return 'flags on sanitize-payload (simulated)\n';
        if (sub === 'SETUSER') return replyOk();
        if (sub === 'DELUSER') return replyInt(1);
        if (sub === 'SAVE') return replyOk();
        if (sub === 'LOAD') return replyOk();
        if (sub === 'GENPASS') return replyStr('simulated-password');
        if (sub === 'LOG') return '(empty array)\n';
        if (sub === 'HELP') return 'ACL subcommands: LIST USERS WHOAMI GETUSER SETUSER DELUSER SAVE LOAD GENPASS LOG (learning)\n';
        return replyErr('ERR unknown ACL subcommand');
      }
      if (name === 'LATENCY') {
        return 'Latency doctor (simulated): No latency issues detected.\n';
      }
      if (name === 'SWAPDB') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments');
        const a = Number(args[1]);
        const b = Number(args[2]);
        if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a >= MAX_DBS || b >= MAX_DBS) return replyErr('ERR invalid DB index');
        const ta = state.dbs[a] || { keys: {} };
        const tb = state.dbs[b] || { keys: {} };
        state.dbs[a] = tb;
        state.dbs[b] = ta;
        save(state);
        return replyOk();
      }
      if (name === 'CLUSTER') {
        const sub = (args[1] || 'INFO').toUpperCase();
        if (sub === 'INFO') return 'cluster_state:ok\r\ncluster_slots_assigned:16384\r\ncluster_known_nodes:3\r\ncluster_enabled:1\r\n(learning)\r\n';
        if (sub === 'NODES') return 'myself 127.0.0.1:6379@16379 myself,master - 0 0 1 connected 0-5460\r\n';
        if (sub === 'SLOTS') {
          return '1) 1) (integer) 0\n   2) (integer) 5460\n   3) 1) "127.0.0.1"\n      2) (integer) 6379\n      3) "node1"\n'
            + '2) 1) (integer) 5461\n   2) (integer) 10922\n   3) 1) "127.0.0.1"\n      2) (integer) 6380\n      3) "node2"\n';
        }
        if (sub === 'KEYSLOT' && args[2]) return replyInt(redisKeySlot(String(args[2])));
        if (sub === 'COUNTKEYSINSLOT' && args[2] != null) return replyInt(0);
        if (sub === 'GETKEYSINSLOT') {
          if (args.length < 4) return replyErr('ERR wrong number of arguments');
          return '(empty array)\n';
        }
        if (sub === 'MYID') return replyStr('0123456789abcdef0123456789abcdef01234567');
        if (sub === 'SHARDS') return '(empty array)\n';
        if (sub === 'HELP') return 'CLUSTER HELP | INFO | NODES | SLOTS | KEYSLOT | COUNTKEYSINSLOT | GETKEYSINSLOT | MYID (learning)\n';
        return replyErr('ERR unknown CLUSTER subcommand');
      }
      if (name === 'READONLY') return replyOk();
      if (name === 'READWRITE') return replyOk();
      if (name === 'ASKING') return replyInt(1);
      if (name === 'RESET') {
        tx.reset();
        tx.watching = {};
        redisSimMeta.clientName = '';
        redisSimMeta.clientCaching = false;
        redisSimMeta.clientTracking = false;
        if (redisSimMeta.requirepass) redisSimMeta.authed = false;
        return replyOk();
      }
      if (name === 'REPLICAOF' || name === 'SLAVEOF') {
        if (args.length < 3) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const h = String(args[1]).toUpperCase();
        const p = String(args[2]).toUpperCase();
        if (h === 'NO' && p === 'ONE') { redisSimMeta.replicaOf = null; return replyOk(); }
        redisSimMeta.replicaOf = { host: args[1], port: args[2] };
        return replyOk();
      }
      if (name === 'ROLE') {
        if (redisSimMeta.replicaOf) {
          return 'slave\r\n' + redisSimMeta.replicaOf.host + '\r\n' + redisSimMeta.replicaOf.port + '\r\nconnecting\r\n' + redisSimMeta.replOffset + '\r\n';
        }
        return 'master\r\n0\r\n' + redisSimMeta.replOffset + '\r\n';
      }
      if (name === 'PSYNC') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'psync\' command');
        redisSimMeta.replOffset += 1;
        return '+FULLRESYNC ' + redisSimMeta.replId + ' 0\r\n';
      }
      if (name === 'FAILOVER') return replyOk();
      if (name === 'COMMAND') {
        const sub = (args[1] || '').toUpperCase();
        if (!sub || sub === 'COUNT') return replyInt(200);
        if (sub === 'INFO' && args[2]) return 'name\n' + args[2] + '\narity\n-2\n';
        if (sub === 'GETKEYS' && args[2]) return formatArray(args.slice(3));
        return replyErr('ERR COMMAND subcommand');
      }
      if (name === 'WAIT') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments');
        return replyInt(0);
      }

      // server-ish
      if (name === 'SELECT') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'select\' command');
        const idx = Number(args[1]);
        if (!Number.isInteger(idx) || idx < 0 || idx >= MAX_DBS) return replyErr('ERR invalid DB index');
        state.selectedDb = idx;
        save(state);
        setPrompt();
        return 'OK\n';
      }
      if (name === 'DBSIZE') return replyInt(Object.keys(db.keys || {}).length);
      if (name === 'FLUSHDB') { db.keys = {}; save(state); return 'OK\n'; }
      if (name === 'FLUSHALL') {
        for (let i = 0; i < MAX_DBS; i++) {
          if (!state.dbs[i]) state.dbs[i] = { keys: {} };
          state.dbs[i].keys = {};
        }
        save(state);
        return 'OK\n';
      }

      // Transactions: MULTI/EXEC/DISCARD
      if (name === 'MULTI') {
        if (args.length !== 1) return replyErr('ERR wrong number of arguments for \'multi\' command');
        if (tx.inMulti) return replyErr('ERR MULTI calls can not be nested');
        tx.inMulti = true;
        tx.queue = [];
        return replyOk();
      }
      if (name === 'DISCARD') {
        if (args.length !== 1) return replyErr('ERR wrong number of arguments for \'discard\' command');
        if (!tx.inMulti) return replyErr('ERR DISCARD without MULTI');
        tx.reset();
        return replyOk();
      }
      if (name === 'EXEC') {
        if (args.length !== 1) return replyErr('ERR wrong number of arguments for \'exec\' command');
        if (!tx.inMulti) return replyErr('ERR EXEC without MULTI');
        const queue = tx.queue.slice();
        const watching = { ...(tx.watching || {}) };
        tx.reset();
        tx.watching = {};
        for (const k of Object.keys(watching)) {
          if (getKeyVersion(db, k) !== watching[k]) return replyNil();
        }
        if (!queue.length) return '(empty array)\n';
        let out = '';
        for (let i = 0; i < queue.length; i++) {
          const r = cmd(queue[i], true, {});
          // strip trailing newline for display as array item
          const one = String(r || '').replace(/\n$/, '');
          out += `${i + 1}) ${one}\n`;
        }
        return out;
      }

      // WATCH/UNWATCH
      if (name === 'WATCH') {
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'watch\' command');
        args.slice(1).forEach(k => { tx.watching[String(k)] = getKeyVersion(db, String(k)); });
        return replyOk();
      }
      if (name === 'UNWATCH') {
        if (args.length !== 1) return replyErr('ERR wrong number of arguments for \'unwatch\' command');
        tx.watching = {};
        return replyOk();
      }

      // Pub/Sub: SUBSCRIBE/UNSUBSCRIBE/PUBLISH
      if (name === 'SUBSCRIBE') {
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'subscribe\' command');
        args.slice(1).forEach(ch => pubsub.subscribe(String(ch)));
        return replyOk();
      }
      if (name === 'UNSUBSCRIBE') {
        if (args.length === 1) {
          pubsub.list().forEach(ch => pubsub.unsubscribe(ch));
          return replyOk();
        }
        args.slice(1).forEach(ch => pubsub.unsubscribe(String(ch)));
        return replyOk();
      }
      if (name === 'PSUBSCRIBE') {
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'psubscribe\' command');
        args.slice(1).forEach(p => pubsub.psubscribe(String(p)));
        return replyOk();
      }
      if (name === 'PUNSUBSCRIBE') {
        if (args.length === 1) {
          pubsub.plist().forEach(p => pubsub.punsubscribe(p));
          return replyOk();
        }
        args.slice(1).forEach(p => pubsub.punsubscribe(String(p)));
        return replyOk();
      }
      if (name === 'PUBSUB') {
        const sub = String(args[1] || '').toUpperCase();
        if (!sub) return replyErr('ERR wrong number of arguments for \'pubsub\' command');
        if (sub === 'CHANNELS') {
          const pattern = args[2] || '*';
          const re = globToRegExp(pattern);
          return formatArray(pubsub.list().filter(ch => re.test(ch)));
        }
        if (sub === 'NUMPAT') return replyInt(pubsub.numpat());
        if (sub === 'NUMSUB') {
          if (args.length < 3) return '(empty array)\n';
          const out = [];
          for (const ch of args.slice(2)) { out.push(String(ch)); out.push(String(pubsub.numsub(String(ch)))); }
          return formatArray(out);
        }
        if (sub === 'SHARDCHANNELS') {
          const pattern = args[2] || '*';
          const re = globToRegExp(pattern);
          return formatArray(pubsub.shardList().filter(ch => re.test(ch)));
        }
        if (sub === 'SHARDNUMSUB') {
          if (args.length < 3) return '(empty array)\n';
          const out = [];
          for (const ch of args.slice(2)) { out.push(String(ch)); out.push(String(pubsub.shardNumSub(String(ch)))); }
          return formatArray(out);
        }
        return replyErr('ERR unknown PUBSUB subcommand');
      }
      if (name === 'PUBLISH') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'publish\' command');
        const ch = String(args[1]);
        const msg = args.slice(2).join(' ');
        pubsub.publish(ch, msg);
        // 返回订阅者数量（学习版只能统计当前窗口）
        return replyInt(pubsub.isSubscribed(ch) ? 1 : 0);
      }
      if (name === 'SPUBLISH') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'spublish\' command');
        const ch = String(args[1]);
        const msg = args.slice(2).join(' ');
        pubsub.spublish(ch, msg);
        return replyInt(pubsub.shardNumSub(ch));
      }
      if (name === 'SSUBSCRIBE') {
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'ssubscribe\' command');
        args.slice(1).forEach(c => pubsub.ssubscribe(String(c)));
        return replyOk();
      }
      if (name === 'SUNSUBSCRIBE') {
        if (args.length === 1) { pubsub.sunsubscribe(''); return replyOk(); }
        args.slice(1).forEach(c => pubsub.sunsubscribe(String(c)));
        return replyOk();
      }

      function redisFormatEvalResult(v) {
        if (v === undefined || v === null) return replyNil();
        if (typeof v === 'number' && Number.isFinite(v)) return Number.isInteger(v) ? replyInt(v) : replyStr(String(v));
        if (typeof v === 'boolean') return replyInt(v ? 1 : 0);
        if (Array.isArray(v)) return formatArray(v.map(x => (x === null || x === undefined ? null : String(x))));
        if (typeof v === 'object') return replyStr(JSON.stringify(v));
        return replyStr(String(v));
      }
      if (name === 'EVAL') {
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'eval\' command');
        const script = String(args[1]);
        const numkeys = Number(args[2]);
        if (!Number.isInteger(numkeys) || numkeys < 0) return replyErr('ERR Number of keys cannot be negative');
        if (args.length < 3 + numkeys) return replyErr('ERR Number of keys cannot be greater than number of args');
        const keys = args.slice(3, 3 + numkeys).map(String);
        const argv = args.slice(3 + numkeys).map(String);
        const r = runEvalJs(script, keys, argv, db);
        if (typeof r === 'string' && /^\(error\)/.test(r)) return r;
        return redisFormatEvalResult(r);
      }
      if (name === 'EVALSHA') {
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'evalsha\' command');
        const sha = String(args[1]).toLowerCase();
        const src = redisSimMeta.scripts.get(sha);
        if (!src) return replyErr('ERR NOSCRIPT No matching script. Please use SCRIPT LOAD.');
        const tail = args.slice(2);
        return cmd(`EVAL ${JSON.stringify(src)} ${tail.join(' ')}`, true);
      }
      if (name === 'SCRIPT') {
        const sub = String(args[1] || '').toUpperCase();
        if (!sub) return replyErr('ERR wrong number of arguments for \'script\' command');
        if (sub === 'LOAD' && args[2] != null) {
          const src = String(args[2]);
          const sha = redisScriptSha1(src);
          redisSimMeta.scripts.set(sha, src);
          return replyStr(sha);
        }
        if (sub === 'EXISTS') {
          if (args.length < 3) return replyErr('ERR wrong number of arguments for \'script\' command');
          return formatArray(args.slice(2).map(sh => (redisSimMeta.scripts.has(String(sh).toLowerCase()) ? '1' : '0')));
        }
        if (sub === 'FLUSH') { redisSimMeta.scripts.clear(); return replyOk(); }
        if (sub === 'KILL') return replyOk();
        return replyErr('ERR Unknown SCRIPT subcommand or wrong number of args for SCRIPT');
      }
      if (name === 'FUNCTION') {
        const sub = String(args[1] || '').toUpperCase();
        if (!sub) return replyErr('ERR wrong number of arguments for \'function\' command');
        if (sub === 'LOAD') {
          let replace = false; let i = 2;
          if (String(args[i] || '').toUpperCase() === 'REPLACE') { replace = true; i++; }
          const body = args.slice(i).join(' ') || '';
          const firstLine = body.split('\n')[0] || '';
          let lib = 'default';
          if (firstLine.startsWith('#!')) lib = firstLine.slice(2).trim() || 'default';
          if (redisSimMeta.functions.has(lib) && !replace) return replyErr('ERR Library ' + lib + ' already exists');
          redisSimMeta.functions.set(lib, { code: body, engine: 'js' });
          return replyStr(lib);
        }
        if (sub === 'LIST') {
          let filter = null;
          for (let i = 2; i < args.length; i++) {
            if (String(args[i]).toUpperCase() === 'LIBRARYNAME' && i + 1 < args.length) filter = String(args[++i]);
          }
          const names = [...redisSimMeta.functions.keys()].filter(n => !filter || n === filter);
          if (!names.length) return '(empty array)\n';
          let out = '';
          names.forEach((n, li) => {
            const ent = redisSimMeta.functions.get(n);
            out += `${li + 1}) 1) library_name\n   2) ${quoteItem(n)}\n   3) engine\n   4) ${quoteItem(ent.engine || 'js')}\n`;
          });
          return out;
        }
        if (sub === 'DUMP' && args[2]) {
          const ent = redisSimMeta.functions.get(String(args[2]));
          if (!ent) return replyErr('ERR Library not found');
          return replyStr(redisDumpHex({ type: 'string', value: ent.code, expireAt: null }));
        }
        if (sub === 'DELETE' && args[2]) {
          const ok = redisSimMeta.functions.delete(String(args[2]));
          return replyInt(ok ? 1 : 0);
        }
        if (sub === 'FLUSH') { redisSimMeta.functions.clear(); return replyOk(); }
        if (sub === 'KILL') return replyOk();
        if (sub === 'HELP') return 'FUNCTION LOAD [REPLACE] | LIST | DUMP | DELETE | FLUSH | KILL (learning, JS engine)\n';
        return replyErr('ERR unknown FUNCTION subcommand');
      }
      if (name === 'FCALL') {
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'fcall\' command');
        const lib = String(args[1]);
        const numkeys = Number(args[2]);
        if (!Number.isInteger(numkeys) || numkeys < 0) return replyErr('ERR invalid numkeys');
        const ent = redisSimMeta.functions.get(lib);
        if (!ent) return replyErr('ERR Library not found');
        const keys = args.slice(3, 3 + numkeys).map(String);
        const argv = args.slice(3 + numkeys).map(String);
        const r = runEvalJs(ent.code, keys, argv, db);
        if (typeof r === 'string' && /^\(error\)/.test(r)) return r;
        return redisFormatEvalResult(r);
      }
      if (name === 'FCALL_RO') {
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'fcall_ro\' command');
        const lib = String(args[1]);
        const numkeys = Number(args[2]);
        if (!Number.isInteger(numkeys) || numkeys < 0) return replyErr('ERR invalid numkeys');
        const ent = redisSimMeta.functions.get(lib);
        if (!ent) return replyErr('ERR Library not found');
        const keys = args.slice(3, 3 + numkeys).map(String);
        const argv = args.slice(3 + numkeys).map(String);
        const r = runEvalJs(ent.code, keys, argv, db);
        if (typeof r === 'string' && /^\(error\)/.test(r)) return r;
        return redisFormatEvalResult(r);
      }

      // Streams: XADD/XRANGE/XLEN/XDEL/XTRIM/XINFO/XGROUP/XREAD/XREADGROUP/XACK/XPENDING/XCLAIM
      if (name === 'XLEN') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'xlen\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'stream');
        if (err) return replyErr(err);
        return replyInt((e.value && Array.isArray(e.value.entries)) ? e.value.entries.length : 0);
      }
      if (name === 'XADD') {
        if (args.length < 5) return replyErr('ERR wrong number of arguments for \'xadd\' command');
        const key = String(args[1]);
        let i = 2;
        let nomkstream = false;
        let maxlen = null;
        while (i < args.length) {
          const u = String(args[i] || '').toUpperCase();
          if (u === 'NOMKSTREAM') { nomkstream = true; i++; continue; }
          if (u === 'MAXLEN') {
            i++;
            if (args[i] === '~' || String(args[i]).toUpperCase() === '~') i++;
            maxlen = Number(args[i++]);
            if (!Number.isInteger(maxlen) || maxlen < 0) return replyErr('ERR value is not an integer or out of range');
            continue;
          }
          break;
        }
        if (args.length - i < 3 || (args.length - i - 1) % 2 !== 0) return replyErr('ERR wrong number of arguments for \'xadd\' command');
        if (nomkstream && !getEntry(db, key)) return replyNil();
        const idArg = String(args[i++]);
        const fields = {};
        for (; i < args.length; i += 2) fields[String(args[i])] = String(args[i + 1]);
        const r = getOrCreateStream(db, key);
        if (r.err) return replyErr(r.err);
        const stream = r.entry;
        const id = (idArg === '*') ? nextAutoId(stream) : idArg;
        const parsed = parseStreamId(id);
        if (!parsed) return replyErr('ERR Invalid stream ID specified as stream command argument');
        stream.value.entries.push({ id, fields });
        if (maxlen != null && stream.value.entries.length > maxlen) {
          stream.value.entries = stream.value.entries.slice(stream.value.entries.length - maxlen);
        }
        setEntry(db, key, stream);
        return replyStr(id);
      }
      if (name === 'XRANGE') {
        // XRANGE key start end [COUNT n]
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'xrange\' command');
        const key = String(args[1]);
        const start = parseStreamId(args[2]);
        const end = parseStreamId(args[3]);
        if (!start || !end) return replyErr('ERR Invalid stream ID specified as stream command argument');
        let count = null;
        for (let i = 4; i < args.length; i++) {
          if (String(args[i]).toUpperCase() === 'COUNT' && i + 1 < args.length) { count = Number(args[i + 1]); break; }
        }
        const e = getEntry(db, key);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'stream');
        if (err) return replyErr(err);
        let entries = (e.value.entries || []).filter(en => {
          const pid = parseStreamId(en.id);
          return pid && cmpId(pid, start) >= 0 && cmpId(pid, end) <= 0;
        });
        if (count != null && Number.isFinite(count)) entries = entries.slice(0, Math.max(0, Math.floor(count)));
        if (!entries.length) return '(empty array)\n';
        // 简化输出：每个 entry -> ["id", [field, value, ...]]
        let out = '';
        for (let i = 0; i < entries.length; i++) {
          const en = entries[i];
          const kv = [];
          for (const k of Object.keys(en.fields || {})) { kv.push(k); kv.push(en.fields[k]); }
          out += `${i + 1}) 1) ${quoteItem(en.id)}\n   2) ${formatArray(kv).split('\n').filter(Boolean).map(l => '      ' + l).join('\n')}\n`;
        }
        return out;
      }
      if (name === 'XREVRANGE') {
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'xrevrange\' command');
        const key = String(args[1]);
        const endId = parseStreamId(args[2]);
        const startId = parseStreamId(args[3]);
        if (!startId || !endId) return replyErr('ERR Invalid stream ID specified as stream command argument');
        let count = null;
        for (let i = 4; i < args.length; i++) {
          if (String(args[i]).toUpperCase() === 'COUNT' && i + 1 < args.length) { count = Number(args[i + 1]); break; }
        }
        const e = getEntry(db, key);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'stream');
        if (err) return replyErr(err);
        let entries = (e.value.entries || []).filter(en => {
          const pid = parseStreamId(en.id);
          return pid && cmpId(pid, startId) >= 0 && cmpId(pid, endId) <= 0;
        });
        entries = entries.slice().reverse();
        if (count != null && Number.isFinite(count)) entries = entries.slice(0, Math.max(0, Math.floor(count)));
        if (!entries.length) return '(empty array)\n';
        let out = '';
        for (let i = 0; i < entries.length; i++) {
          const en = entries[i];
          const kv = [];
          for (const k of Object.keys(en.fields || {})) { kv.push(k); kv.push(en.fields[k]); }
          out += `${i + 1}) 1) ${quoteItem(en.id)}\n   2) ${formatArray(kv).split('\n').filter(Boolean).map(l => '      ' + l).join('\n')}\n`;
        }
        return out;
      }
      if (name === 'XDEL') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'xdel\' command');
        const key = String(args[1]);
        const ids = new Set(args.slice(2).map(String));
        const e = getEntry(db, key);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'stream');
        if (err) return replyErr(err);
        const before = e.value.entries.length;
        e.value.entries = e.value.entries.filter(en => !ids.has(en.id));
        // also remove pending references for all groups
        for (const gName of Object.keys(e.value.groups || {})) {
          const g = e.value.groups[gName];
          for (const id of ids) {
            if (g.pending && g.pending[id]) {
              const c = g.pending[id].consumer;
              delete g.pending[id];
              if (g.consumers && g.consumers[c] && g.consumers[c].pending) delete g.consumers[c].pending[id];
            }
          }
        }
        setEntry(db, key, e);
        return replyInt(before - e.value.entries.length);
      }
      if (name === 'XTRIM') {
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'xtrim\' command');
        const key = String(args[1]);
        const mode = String(args[2]).toUpperCase();
        const e = getEntry(db, key);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'stream');
        if (err) return replyErr(err);
        const before = e.value.entries.length;
        if (mode === 'MAXLEN') {
          let idx = 3;
          if (args[idx] === '~' || String(args[idx]).toUpperCase() === '~') idx++;
          const maxlen = Number(args[idx]);
          if (!Number.isInteger(maxlen) || maxlen < 0) return replyErr('ERR value is not an integer or out of range');
          if (before > maxlen) e.value.entries = e.value.entries.slice(before - maxlen);
        } else if (mode === 'MINID') {
          let idx = 3;
          if (args[idx] === '~' || String(args[idx]).toUpperCase() === '~') idx++;
          const minId = parseStreamId(String(args[idx] || ''));
          if (!minId) return replyErr('ERR Invalid stream ID specified as stream command argument');
          e.value.entries = e.value.entries.filter(en => {
            const pid = parseStreamId(en.id);
            return pid && cmpId(pid, minId) >= 0;
          });
        } else return replyErr('ERR syntax error');
        setEntry(db, key, e);
        return replyInt(Math.max(0, before - e.value.entries.length));
      }
      if (name === 'XINFO') {
        // XINFO STREAM key | GROUPS key | CONSUMERS key group
        const sub = String(args[1] || '').toUpperCase();
        if (!sub) return replyErr('ERR wrong number of arguments for \'xinfo\' command');
        if (sub === 'STREAM') {
          if (args.length < 3) return replyErr('ERR wrong number of arguments for \'xinfo\' command');
          const key = String(args[2]);
          const full = args.length > 3 && String(args[3]).toUpperCase() === 'FULL';
          const e = getEntry(db, key);
          if (!e) return replyErr('ERR no such key');
          const err = ensureType(e, 'stream');
          if (err) return replyErr(err);
          const len = e.value.entries.length;
          const first = len ? e.value.entries[0].id : null;
          const last = len ? e.value.entries[len - 1].id : null;
          const gcount = Object.keys(e.value.groups || {}).length;
          const arr = [
            'length', String(len),
            'radix-tree-keys', String(len),
            'radix-tree-nodes', '1',
            'last-generated-id', last || '0-0',
            'max-deleted-entry-id', '0-0',
            'entries-added', String(len),
            'recorded-first-entry-id', first || '0-0',
            'groups', String(gcount),
            'first-entry', first || null,
            'last-entry', last || null,
          ];
          if (full) {
            arr.push('entries', String(len));
            let count = len;
            for (let i = 4; i < args.length; i++) {
              if (String(args[i]).toUpperCase() === 'COUNT' && i + 1 < args.length) count = Math.min(len, Number(args[i + 1]));
            }
            return formatArray(arr);
          }
          return formatArray(['length', String(len), 'first-entry', first || null, 'last-entry', last || null, 'groups', String(gcount)]);
        }
        if (sub === 'GROUPS') {
          if (args.length < 3) return replyErr('ERR wrong number of arguments for \'xinfo\' command');
          const e = getEntry(db, args[2]);
          if (!e) return '(empty array)\n';
          const err = ensureType(e, 'stream');
          if (err) return replyErr(err);
          return formatArray(Object.keys(e.value.groups || {}));
        }
        if (sub === 'CONSUMERS') {
          if (args.length < 4) return replyErr('ERR wrong number of arguments for \'xinfo\' command');
          const e = getEntry(db, args[2]);
          if (!e) return '(empty array)\n';
          const err = ensureType(e, 'stream');
          if (err) return replyErr(err);
          const g = e.value.groups[String(args[3])];
          if (!g) return '(empty array)\n';
          return formatArray(Object.keys(g.consumers || {}));
        }
        if (sub === 'HELP') {
          return 'XINFO subcommands (learning): STREAM key | GROUPS key | CONSUMERS key group | HELP\n';
        }
        return replyErr('ERR unknown XINFO subcommand');
      }
      if (name === 'XGROUP') {
        // XGROUP CREATE/DESTROY/SETID/CREATECONSUMER/DELCONSUMER
        const sub = String(args[1] || '').toUpperCase();
        if (!sub) return replyErr('ERR wrong number of arguments for \'xgroup\' command');
        if (sub === 'CREATE') {
          if (args.length < 5) return replyErr('ERR wrong number of arguments for \'xgroup\' command');
          const key = String(args[2]);
          const group = String(args[3]);
          const id = String(args[4]);
          const r = getOrCreateStream(db, key);
          if (r.err) return replyErr(r.err);
          const stream = r.entry;
          if (stream.value.groups[group]) return replyErr('BUSYGROUP Consumer Group name already exists');
          stream.value.groups[group] = { lastId: id, consumers: {}, pending: {} };
          setEntry(db, key, stream);
          return replyOk();
        }
        if (sub === 'DESTROY') {
          if (args.length < 4) return replyErr('ERR wrong number of arguments for \'xgroup\' command');
          const key = String(args[2]);
          const group = String(args[3]);
          const e = getEntry(db, key);
          if (!e) return replyInt(0);
          const err = ensureType(e, 'stream');
          if (err) return replyErr(err);
          const existed = !!(e.value.groups && e.value.groups[group]);
          if (e.value.groups) delete e.value.groups[group];
          setEntry(db, key, e);
          return replyInt(existed ? 1 : 0);
        }
        if (sub === 'SETID') {
          if (args.length < 5) return replyErr('ERR wrong number of arguments for \'xgroup\' command');
          const key = String(args[2]);
          const group = String(args[3]);
          const id = String(args[4]);
          const e = getEntry(db, key);
          if (!e) return replyErr('ERR no such key');
          const err = ensureType(e, 'stream');
          if (err) return replyErr(err);
          const g = e.value.groups[group];
          if (!g) return replyErr('NOGROUP No such key or consumer group');
          g.lastId = id;
          setEntry(db, key, e);
          return replyOk();
        }
        if (sub === 'CREATECONSUMER') {
          if (args.length < 5) return replyErr('ERR wrong number of arguments for \'xgroup\' command');
          const key = String(args[2]);
          const group = String(args[3]);
          const consumer = String(args[4]);
          const e = getEntry(db, key);
          if (!e) return replyInt(0);
          const err = ensureType(e, 'stream');
          if (err) return replyErr(err);
          const g = e.value.groups[group];
          if (!g) return replyErr('NOGROUP No such key or consumer group');
          if (!g.consumers[consumer]) g.consumers[consumer] = { pending: {} };
          setEntry(db, key, e);
          return replyInt(1);
        }
        if (sub === 'DELCONSUMER') {
          if (args.length < 5) return replyErr('ERR wrong number of arguments for \'xgroup\' command');
          const key = String(args[2]);
          const group = String(args[3]);
          const consumer = String(args[4]);
          const e = getEntry(db, key);
          if (!e) return replyInt(0);
          const err = ensureType(e, 'stream');
          if (err) return replyErr(err);
          const g = e.value.groups[group];
          if (!g) return replyErr('NOGROUP No such key or consumer group');
          const existed = !!g.consumers[consumer];
          delete g.consumers[consumer];
          setEntry(db, key, e);
          return replyInt(existed ? 1 : 0);
        }
        if (sub === 'HELP') {
          return 'XGROUP CREATE key groupname id|0|$\nXGROUP DESTROY key groupname\nXGROUP SETID key groupname id\nXGROUP CREATECONSUMER key groupname consumer\nXGROUP DELCONSUMER key groupname consumer\n(learning)\n';
        }
        return replyErr('ERR unknown XGROUP subcommand');
      }
      if (name === 'XREAD') {
        // XREAD [COUNT n] STREAMS key id [key id ...]
        let idx = 1;
        let count = null;
        if (String(args[idx] || '').toUpperCase() === 'COUNT' && idx + 1 < args.length) { count = Number(args[idx + 1]); idx += 2; }
        if (String(args[idx] || '').toUpperCase() !== 'STREAMS') return replyErr('ERR syntax error');
        idx += 1;
        const rest = args.slice(idx);
        if (rest.length < 2 || rest.length % 2 !== 0) return replyErr('ERR syntax error');
        let out = '';
        let outer = 1;
        for (let i = 0; i < rest.length; i += 2) {
          const key = String(rest[i]);
          const lastId = parseStreamId(rest[i + 1]);
          if (!lastId) return replyErr('ERR Invalid stream ID specified as stream command argument');
          const e = getEntry(db, key);
          if (!e) continue;
          const err = ensureType(e, 'stream');
          if (err) return replyErr(err);
          let entries = (e.value.entries || []).filter(en => {
            const pid = parseStreamId(en.id);
            return pid && cmpId(pid, lastId) > 0;
          });
          if (count != null && Number.isFinite(count)) entries = entries.slice(0, Math.max(0, Math.floor(count)));
          if (!entries.length) continue;
          out += `${outer++}) 1) ${quoteItem(key)}\n   2) \n`;
          for (let j = 0; j < entries.length; j++) {
            const en = entries[j];
            const kv = [];
            for (const k of Object.keys(en.fields || {})) { kv.push(k); kv.push(en.fields[k]); }
            out += `   ${j + 1}) 1) ${quoteItem(en.id)}\n      2) ${formatArray(kv).split('\n').filter(Boolean).map(l => '         ' + l).join('\n')}\n`;
          }
        }
        return out || replyNil();
      }
      if (name === 'XREADGROUP') {
        // XREADGROUP GROUP group consumer [COUNT n] STREAMS key id
        if (String(args[1] || '').toUpperCase() !== 'GROUP') return replyErr('ERR syntax error');
        if (args.length < 7) return replyErr('ERR syntax error');
        const group = String(args[2]);
        const consumer = String(args[3]);
        let idx = 4;
        let count = null;
        if (String(args[idx] || '').toUpperCase() === 'COUNT' && idx + 1 < args.length) { count = Number(args[idx + 1]); idx += 2; }
        if (String(args[idx] || '').toUpperCase() !== 'STREAMS') return replyErr('ERR syntax error');
        const key = String(args[idx + 1]);
        const idArg = String(args[idx + 2] || '>');
        const e = getEntry(db, key);
        if (!e) return replyNil();
        const err = ensureType(e, 'stream');
        if (err) return replyErr(err);
        const g = e.value.groups[group];
        if (!g) return replyErr('NOGROUP No such key or consumer group');
        if (!g.consumers[consumer]) g.consumers[consumer] = { pending: {} };
        let entries = [];
        if (idArg === '>') {
          const last = parseStreamId(g.lastId || '0-0') || { ms: 0, seq: 0 };
          entries = (e.value.entries || []).filter(en => {
            const pid = parseStreamId(en.id);
            return pid && cmpId(pid, last) > 0;
          });
          if (entries.length) g.lastId = entries[entries.length - 1].id;
        } else {
          const from = parseStreamId(idArg);
          if (!from) return replyErr('ERR Invalid stream ID specified as stream command argument');
          entries = (e.value.entries || []).filter(en => {
            const pid = parseStreamId(en.id);
            return pid && cmpId(pid, from) >= 0;
          });
        }
        if (count != null && Number.isFinite(count)) entries = entries.slice(0, Math.max(0, Math.floor(count)));
        const ts = now();
        for (const en of entries) {
          if (!g.pending) g.pending = {};
          if (!g.consumers) g.consumers = {};
          if (!g.consumers[consumer]) g.consumers[consumer] = { pending: {} };
          g.pending[en.id] = g.pending[en.id] || { consumer, ts, deliveries: 0 };
          g.pending[en.id].consumer = consumer;
          g.pending[en.id].ts = ts;
          g.pending[en.id].deliveries += 1;
          g.consumers[consumer].pending[en.id] = 1;
        }
        setEntry(db, key, e);
        if (!entries.length) return replyNil();
        let out = `1) 1) ${quoteItem(key)}\n   2) \n`;
        for (let j = 0; j < entries.length; j++) {
          const en = entries[j];
          const kv = [];
          for (const k of Object.keys(en.fields || {})) { kv.push(k); kv.push(en.fields[k]); }
          out += `   ${j + 1}) 1) ${quoteItem(en.id)}\n      2) ${formatArray(kv).split('\n').filter(Boolean).map(l => '         ' + l).join('\n')}\n`;
        }
        return out;
      }
      if (name === 'XACK') {
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'xack\' command');
        const key = String(args[1]);
        const group = String(args[2]);
        const ids = args.slice(3).map(String);
        const e = getEntry(db, key);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'stream');
        if (err) return replyErr(err);
        const g = e.value.groups[group];
        if (!g) return replyErr('NOGROUP No such key or consumer group');
        let n = 0;
        for (const id of ids) {
          if (g.pending && g.pending[id]) {
            const c = g.pending[id].consumer;
            delete g.pending[id];
            if (g.consumers && g.consumers[c] && g.consumers[c].pending) delete g.consumers[c].pending[id];
            n++;
          }
        }
        setEntry(db, key, e);
        return replyInt(n);
      }
      if (name === 'XPENDING') {
        // XPENDING key group [start end count [consumer]]
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'xpending\' command');
        const key = String(args[1]);
        const group = String(args[2]);
        const e = getEntry(db, key);
        if (!e) return replyNil();
        const err = ensureType(e, 'stream');
        if (err) return replyErr(err);
        const g = e.value.groups[group];
        if (!g) return replyErr('NOGROUP No such key or consumer group');
        const ids = Object.keys(g.pending || {});
        if (args.length === 3) {
          // return: [count, min, max, [[consumer, count]...]]
          if (!ids.length) {
            return `1) (integer) 0\n2) (nil)\n3) (nil)\n4) (empty array)\n`;
          }
          const sorted = ids.slice().sort((a, b) => cmpId(parseStreamId(a), parseStreamId(b)));
          const min = sorted[0];
          const max = sorted[sorted.length - 1];
          const byConsumer = {};
          for (const id of ids) {
            const p = g.pending[id];
            const c = p && p.consumer ? String(p.consumer) : '';
            byConsumer[c] = (byConsumer[c] || 0) + 1;
          }
          const consumers = Object.keys(byConsumer).sort();
          let out = '';
          out += `1) (integer) ${ids.length}\n`;
          out += `2) ${quoteItem(min)}\n`;
          out += `3) ${quoteItem(max)}\n`;
          if (!consumers.length) {
            out += `4) (empty array)\n`;
            return out;
          }
          out += `4) \n`;
          for (let i = 0; i < consumers.length; i++) {
            const c = consumers[i];
            out += `   ${i + 1}) 1) ${quoteItem(c)}\n`;
            out += `      2) (integer) ${byConsumer[c]}\n`;
          }
          return out;
        }
        if (args.length < 6) return replyErr('ERR wrong number of arguments for \'xpending\' command');
        const start = parseStreamId(args[3]);
        const end = parseStreamId(args[4]);
        const count = Number(args[5]);
        const consumer = args[6] != null ? String(args[6]) : null;
        if (!start || !end || !Number.isFinite(count)) return replyErr('ERR syntax error');
        const sorted = ids.slice().sort((a, b) => cmpId(parseStreamId(a), parseStreamId(b)));
        const list = [];
        const tNow = now();
        for (const id of sorted) {
          const pid = parseStreamId(id);
          if (!pid) continue;
          if (cmpId(pid, start) < 0 || cmpId(pid, end) > 0) continue;
          const p = g.pending[id];
          if (consumer && p.consumer !== consumer) continue;
          list.push({
            id,
            consumer: String(p.consumer),
            idle: Math.max(0, tNow - Number(p.ts || tNow)),
            deliveries: Number(p.deliveries || 0),
          });
          if (list.length >= count) break;
        }
        if (!list.length) return '(empty array)\n';
        let out = '';
        for (let i = 0; i < list.length; i++) {
          const it = list[i];
          out += `${i + 1}) 1) ${quoteItem(it.id)}\n`;
          out += `   2) ${quoteItem(it.consumer)}\n`;
          out += `   3) (integer) ${it.idle}\n`;
          out += `   4) (integer) ${it.deliveries}\n`;
        }
        return out;
      }
      if (name === 'XCLAIM') {
        // XCLAIM key group consumer min-idle-time id [id...]
        if (args.length < 6) return replyErr('ERR wrong number of arguments for \'xclaim\' command');
        const key = String(args[1]);
        const group = String(args[2]);
        const consumer = String(args[3]);
        const minIdle = Number(args[4]);
        const ids = args.slice(5).map(String);
        if (!Number.isFinite(minIdle)) return replyErr('ERR value is not an integer or out of range');
        const e = getEntry(db, key);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'stream');
        if (err) return replyErr(err);
        const g = e.value.groups[group];
        if (!g) return replyErr('NOGROUP No such key or consumer group');
        if (!g.consumers[consumer]) g.consumers[consumer] = { pending: {} };
        const ts = now();
        const outEntries = [];
        for (const id of ids) {
          const p = g.pending && g.pending[id];
          if (!p) continue;
          if ((ts - p.ts) < minIdle) continue;
          if (g.consumers[p.consumer] && g.consumers[p.consumer].pending) delete g.consumers[p.consumer].pending[id];
          p.consumer = consumer;
          p.ts = ts;
          p.deliveries = Number(p.deliveries || 0) + 1;
          g.consumers[consumer].pending[id] = 1;
          const en = (e.value.entries || []).find(x => x.id === id);
          if (en) outEntries.push(en);
        }
        setEntry(db, key, e);
        if (!outEntries.length) return '(empty array)\n';
        let out = '';
        for (let i = 0; i < outEntries.length; i++) {
          const en = outEntries[i];
          const kv = [];
          for (const k of Object.keys(en.fields || {})) { kv.push(k); kv.push(en.fields[k]); }
          out += `${i + 1}) 1) ${quoteItem(en.id)}\n   2) ${formatArray(kv).split('\n').filter(Boolean).map(l => '      ' + l).join('\n')}\n`;
        }
        return out;
      }
      if (name === 'XSETID') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'xsetid\' command');
        const key = String(args[1]);
        const id = String(args[2]);
        const pid = parseStreamId(id);
        if (!pid) return replyErr('ERR Invalid stream ID specified as stream command argument');
        const e = getEntry(db, key);
        if (!e) return replyErr('ERR no such key');
        const err = ensureType(e, 'stream');
        if (err) return replyErr(err);
        const ents = e.value.entries || [];
        if (ents.length) {
          const last = parseStreamId(ents[ents.length - 1].id);
          if (last && cmpId(pid, last) < 0) return replyErr('ERR The ID specified in XSETID is smaller than the target stream top item');
        }
        e.value.lastMs = pid.ms;
        e.value.lastSeq = pid.seq;
        setEntry(db, key, e);
        return replyOk();
      }
      if (name === 'XAUTOCLAIM') {
        // XAUTOCLAIM key group consumer min-idle-time start [COUNT count] [JUSTID]
        if (args.length < 6) return replyErr('ERR wrong number of arguments for \'xautoclaim\' command');
        const key = String(args[1]);
        const group = String(args[2]);
        const consumer = String(args[3]);
        const minIdle = Number(args[4]);
        const startArg = String(args[5]);
        if (!Number.isFinite(minIdle)) return replyErr('ERR value is not an integer or out of range');
        const start = startArg === '-' ? { ms: Number.NEGATIVE_INFINITY, seq: Number.NEGATIVE_INFINITY } : parseStreamId(startArg);
        if (!start) return replyErr('ERR Invalid stream ID specified as stream command argument');
        let idx = 6;
        let claimCount = 100;
        let justId = false;
        while (idx < args.length) {
          const u = String(args[idx] || '').toUpperCase();
          if (u === 'COUNT' && idx + 1 < args.length) { claimCount = Number(args[++idx]); idx++; continue; }
          if (u === 'JUSTID') { justId = true; idx++; continue; }
          return replyErr('ERR syntax error');
        }
        const e = getEntry(db, key);
        if (!e) return replyErr('ERR no such key');
        const err = ensureType(e, 'stream');
        if (err) return replyErr(err);
        const g = e.value.groups[group];
        if (!g) return replyErr('NOGROUP No such key or consumer group');
        if (!g.consumers[consumer]) g.consumers[consumer] = { pending: {} };
        const ts = now();
        const pendingIds = Object.keys(g.pending || {}).sort((a, b) => cmpId(parseStreamId(a), parseStreamId(b)));
        const claimed = [];
        const deleted = [];
        let nextId = '0-0';
        for (let pi = 0; pi < pendingIds.length; pi++) {
          const id = pendingIds[pi];
          const pid = parseStreamId(id);
          if (!pid || cmpId(pid, start) < 0) continue;
          const p = g.pending[id];
          if (!p) continue;
          if ((ts - p.ts) < minIdle) {
            if (claimed.length === 0) nextId = id;
            continue;
          }
          if (claimed.length >= claimCount) {
            nextId = id;
            break;
          }
          if (g.consumers[p.consumer] && g.consumers[p.consumer].pending) delete g.consumers[p.consumer].pending[id];
          p.consumer = consumer;
          p.ts = ts;
          p.deliveries = Number(p.deliveries || 0) + 1;
          g.consumers[consumer].pending[id] = 1;
          const en = (e.value.entries || []).find(x => x.id === id);
          if (!en) deleted.push(id);
          else if (justId) claimed.push(id);
          else claimed.push(en);
          if (pi + 1 < pendingIds.length) nextId = pendingIds[pi + 1];
          else nextId = '0-0';
        }
        setEntry(db, key, e);
        let out = `1) ${quoteItem(nextId)}\n2) \n`;
        if (!claimed.length) out += '   (empty array)\n';
        else {
          for (let i = 0; i < claimed.length; i++) {
            const item = claimed[i];
            if (typeof item === 'string') out += `   ${i + 1}) ${quoteItem(item)}\n`;
            else {
              const kv = [];
              for (const k of Object.keys(item.fields || {})) { kv.push(k); kv.push(item.fields[k]); }
              out += `   ${i + 1}) 1) ${quoteItem(item.id)}\n      2) ${formatArray(kv).split('\n').filter(Boolean).map(l => '         ' + l).join('\n')}\n`;
            }
          }
        }
        out += `3) \n`;
        if (!deleted.length) out += '   (empty array)\n';
        else for (let i = 0; i < deleted.length; i++) out += `   ${i + 1}) ${quoteItem(deleted[i])}\n`;
        return out;
      }

      // keys
      if (name === 'DEL') {
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'del\' command');
        let n = 0;
        for (const k of args.slice(1)) if (delEntry(db, k)) n++;
        return replyInt(n);
      }
      if (name === 'EXISTS') {
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'exists\' command');
        let n = 0;
        for (const k of args.slice(1)) if (getEntry(db, k)) n++;
        return replyInt(n);
      }
      if (name === 'TYPE') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'type\' command');
        const e = getEntry(db, args[1]);
        return (e ? e.type : 'none') + '\n';
      }
      if (name === 'RENAME') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'rename\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyErr('ERR no such key');
        db.keys[args[2]] = e;
        delete db.keys[args[1]];
        save(state);
        return 'OK\n';
      }
      if (name === 'RENAMENX') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'renamenx\' command');
        const src = args[1];
        const dst = args[2];
        const e = getEntry(db, src);
        if (!e) return replyErr('ERR no such key');
        if (getEntry(db, dst)) return replyInt(0);
        db.keys[dst] = e;
        delete db.keys[src];
        save(state);
        return replyInt(1);
      }
      if (name === 'TTL' || name === 'PTTL') {
        if (args.length !== 2) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(-2);
        if (!e.expireAt) return replyInt(-1);
        const ms = Math.max(0, e.expireAt - now());
        return replyInt(name === 'PTTL' ? ms : Math.ceil(ms / 1000));
      }
      if (name === 'EXPIRE' || name === 'PEXPIRE') {
        if (args.length !== 3) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(0);
        const n = Number(args[2]);
        if (!Number.isFinite(n) || n < 0) return replyErr('ERR value is not an integer or out of range');
        e.expireAt = now() + (name === 'PEXPIRE' ? n : n * 1000);
        setEntry(db, args[1], e);
        return replyInt(1);
      }
      if (name === 'EXPIREAT' || name === 'PEXPIREAT') {
        if (args.length !== 3) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(0);
        const ts = Number(args[2]);
        if (!Number.isFinite(ts) || ts < 0) return replyErr('ERR value is not an integer or out of range');
        e.expireAt = name === 'PEXPIREAT' ? ts : ts * 1000;
        setEntry(db, args[1], e);
        return replyInt(1);
      }
      if (name === 'PERSIST') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'persist\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(0);
        if (!e.expireAt) return replyInt(0);
        e.expireAt = null;
        setEntry(db, args[1], e);
        return replyInt(1);
      }
      if (name === 'EXPIRETIME' || name === 'PEXPIRETIME') {
        if (args.length !== 2) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(-2);
        if (!e.expireAt) return replyInt(-1);
        const sec = Math.floor(e.expireAt / 1000);
        const ms = e.expireAt;
        return replyInt(name === 'PEXPIRETIME' ? ms : sec);
      }
      if (name === 'MOVE') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'move\' command');
        const key = args[1];
        const destIdx = Number(args[2]);
        if (!Number.isInteger(destIdx) || destIdx < 0 || destIdx >= MAX_DBS) return replyErr('ERR invalid DB index');
        const e = getEntry(db, key);
        if (!e) return replyInt(0);
        if (!state.dbs[destIdx]) state.dbs[destIdx] = { keys: {} };
        if (!state.dbs[destIdx].keys) state.dbs[destIdx].keys = {};
        const destDb = state.dbs[destIdx];
        purgeExpired(destDb);
        if (destDb.keys[key]) return replyInt(0);
        destDb.keys[key] = e;
        delete db.keys[key];
        save(state);
        return replyInt(1);
      }
      if (name === 'MIGRATE') {
        if (args.length < 6) return replyErr('ERR wrong number of arguments for \'migrate\' command');
        const host = args[1];
        const port = args[2];
        let keyEmpty = args[3];
        const destDb = Number(args[4]);
        const timeout = Number(args[5]);
        if (!Number.isInteger(destDb) || destDb < 0 || destDb >= MAX_DBS) return replyErr('ERR DB index is out of range');
        if (!Number.isFinite(timeout)) return replyErr('ERR timeout');
        let i = 6;
        let copy = false; let replace = false;
        const keys = [];
        while (i < args.length) {
          const u = String(args[i]).toUpperCase();
          if (u === 'COPY') { copy = true; i++; continue; }
          if (u === 'REPLACE') { replace = true; i++; continue; }
          if (u === 'AUTH' && i + 1 < args.length) { i += 2; continue; }
          if (u === 'AUTH2' && i + 2 < args.length) { i += 3; continue; }
          if (u === 'KEYS') { keys.push(...args.slice(i + 1).map(String)); break; }
          i++;
        }
        if (!keys.length && keyEmpty) keys.push(String(keyEmpty));
        if (!keys.length) return replyErr('ERR wrong number of arguments for \'migrate\' command');
        if (!state.dbs[destDb]) state.dbs[destDb] = { keys: {} };
        const dest = state.dbs[destDb];
        purgeExpired(dest);
        for (const k of keys) {
          const e = getEntry(db, k);
          if (!e) continue;
          if (dest.keys[k] && !replace) return replyErr('ERR Target key name is busy');
          dest.keys[k] = JSON.parse(JSON.stringify(e));
          if (!copy) delEntry(db, k);
        }
        save(state);
        return replyOk();
      }

      // string
      if (name === 'GET') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'get\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyNil();
        const err = ensureType(e, 'string');
        if (err) return replyErr(err);
        return replyStr(e.value ?? '');
      }
      if (name === 'GETEX') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'getex\' command');
        const key = args[1];
        const e = getEntry(db, key);
        if (!e) return replyNil();
        const err = ensureType(e, 'string');
        if (err) return replyErr(err);
        let expireAt = e.expireAt;
        for (let i = 2; i < args.length; i++) {
          const opt = String(args[i] || '').toUpperCase();
          if (opt === 'PERSIST') expireAt = null;
          else if (opt === 'EX' && i + 1 < args.length) { const s = Number(args[++i]); expireAt = now() + s * 1000; }
          else if (opt === 'PX' && i + 1 < args.length) { const ms = Number(args[++i]); expireAt = now() + ms; }
          else if (opt === 'EXAT' && i + 1 < args.length) { const s = Number(args[++i]); expireAt = s * 1000; }
          else if (opt === 'PXAT' && i + 1 < args.length) { expireAt = Number(args[++i]); }
          else return replyErr('ERR syntax error');
        }
        e.expireAt = expireAt;
        setEntry(db, key, e);
        return replyStr(String(e.value ?? ''));
      }
      if (name === 'SET') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'set\' command');
        const key = args[1];
        let value = args[2];
        let nx = false, xx = false, get = false, keepttl = false;
        let ex = null, px = null, exat = null, pxat = null;
        for (let i = 3; i < args.length; i++) {
          const opt = String(args[i] || '').toUpperCase();
          if (opt === 'NX') nx = true;
          else if (opt === 'XX') xx = true;
          else if (opt === 'GET') get = true;
          else if (opt === 'KEEPTTL') keepttl = true;
          else if (opt === 'EX' && i + 1 < args.length) { ex = Number(args[++i]); }
          else if (opt === 'PX' && i + 1 < args.length) { px = Number(args[++i]); }
          else if (opt === 'EXAT' && i + 1 < args.length) { exat = Number(args[++i]); }
          else if (opt === 'PXAT' && i + 1 < args.length) { pxat = Number(args[++i]); }
          else return replyErr('ERR syntax error');
        }
        const prev = getEntry(db, key);
        const existed = !!prev;
        if (nx && existed) return replyNil();
        if (xx && !existed) return replyNil();
        let oldVal = null;
        if (get) {
          if (prev) {
            const er = ensureType(prev, 'string');
            if (er) return replyErr(er);
            oldVal = String(prev.value ?? '');
          } else oldVal = null;
        }
        let expireAt = null;
        if (keepttl && prev && prev.expireAt) expireAt = prev.expireAt;
        if (Number.isFinite(ex) && ex != null) expireAt = now() + ex * 1000;
        if (Number.isFinite(px) && px != null) expireAt = now() + px;
        if (Number.isFinite(exat) && exat != null) expireAt = exat * 1000;
        if (Number.isFinite(pxat) && pxat != null) expireAt = pxat;
        const e = { type: 'string', value: String(value), expireAt };
        setEntry(db, key, e);
        if (get) return oldVal == null ? replyNil() : replyStr(oldVal);
        return replyOk();
      }
      if (name === 'SETNX') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'setnx\' command');
        const key = args[1];
        if (getEntry(db, key)) return replyInt(0);
        setEntry(db, key, { type: 'string', value: String(args[2]), expireAt: null });
        return replyInt(1);
      }
      if (name === 'GETSET') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'getset\' command');
        const key = args[1];
        const e = getEntry(db, key);
        let old = null;
        if (e) {
          const err = ensureType(e, 'string');
          if (err) return replyErr(err);
          old = String(e.value ?? '');
        }
        // GETSET 会覆盖值并清除 TTL（与 Redis 行为一致）
        setEntry(db, key, { type: 'string', value: String(args[2]), expireAt: null });
        return old == null ? replyNil() : replyStr(old);
      }
      if (name === 'SETEX' || name === 'PSETEX') {
        if (args.length !== 4) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const key = args[1];
        const ttl = Number(args[2]);
        if (!Number.isFinite(ttl) || ttl < 0) return replyErr('ERR value is not an integer or out of range');
        const expireAt = now() + (name === 'PSETEX' ? ttl : ttl * 1000);
        setEntry(db, key, { type: 'string', value: String(args[3]), expireAt });
        return replyOk();
      }
      if (name === 'INCR' || name === 'DECR') {
        if (args.length !== 2) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const key = args[1];
        const e = getEntry(db, key);
        let v = 0;
        let expireAt = null;
        if (e) {
          const err = ensureType(e, 'string');
          if (err) return replyErr(err);
          expireAt = e.expireAt || null;
          v = Number(e.value);
          if (!Number.isInteger(v)) return replyErr('ERR value is not an integer or out of range');
        }
        v = name === 'INCR' ? v + 1 : v - 1;
        setEntry(db, key, { type: 'string', value: String(v), expireAt });
        return replyInt(v);
      }
      if (name === 'MGET') {
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'mget\' command');
        const vals = args.slice(1).map(k => {
          const e = getEntry(db, k);
          if (!e) return null;
          if (e.type !== 'string') return null;
          return String(e.value ?? '');
        });
        return formatArray(vals);
      }
      if (name === 'MSET') {
        if (args.length < 3 || (args.length - 1) % 2 !== 0) return replyErr('ERR wrong number of arguments for \'mset\' command');
        for (let i = 1; i < args.length; i += 2) {
          setEntry(db, args[i], { type: 'string', value: String(args[i + 1]), expireAt: null });
        }
        return replyOk();
      }
      if (name === 'MSETNX') {
        if (args.length < 3 || (args.length - 1) % 2 !== 0) return replyErr('ERR wrong number of arguments for \'msetnx\' command');
        for (let i = 1; i < args.length; i += 2) {
          if (getEntry(db, args[i])) return replyInt(0);
        }
        for (let i = 1; i < args.length; i += 2) {
          setEntry(db, args[i], { type: 'string', value: String(args[i + 1]), expireAt: null });
        }
        return replyInt(1);
      }
      if (name === 'APPEND') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'append\' command');
        const key = args[1];
        const add = String(args[2]);
        let e = getEntry(db, key);
        if (!e) {
          e = { type: 'string', value: add, expireAt: null };
          setEntry(db, key, e);
          return replyInt(add.length);
        }
        const err = ensureType(e, 'string');
        if (err) return replyErr(err);
        e.value = String(e.value ?? '') + add;
        setEntry(db, key, e);
        return replyInt(String(e.value).length);
      }
      if (name === 'STRLEN') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'strlen\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'string');
        if (err) return replyErr(err);
        return replyInt(String(e.value ?? '').length);
      }
      if (name === 'GETRANGE') {
        if (args.length !== 4) return replyErr('ERR wrong number of arguments for \'getrange\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyStr('');
        const err = ensureType(e, 'string');
        if (err) return replyErr(err);
        const s = String(e.value ?? '');
        let st = Number(args[2]);
        let en = Number(args[3]);
        if (!Number.isFinite(st) || !Number.isFinite(en)) return replyErr('ERR value is not an integer');
        if (st < 0) st = s.length + st;
        if (en < 0) en = s.length + en;
        st = Math.max(0, st);
        en = Math.min(s.length - 1, en);
        if (en < st) return replyStr('');
        return replyStr(s.slice(st, en + 1));
      }
      if (name === 'SETRANGE') {
        if (args.length !== 4) return replyErr('ERR wrong number of arguments for \'setrange\' command');
        const key = args[1];
        const off = Number(args[2]);
        const val = String(args[3]);
        if (!Number.isInteger(off) || off < 0) return replyErr('ERR offset is out of range');
        let e = getEntry(db, key);
        if (!e) e = { type: 'string', value: '', expireAt: null };
        const err = ensureType(e, 'string');
        if (err) return replyErr(err);
        let cur = String(e.value ?? '');
        if (off > cur.length) cur = cur + ' '.repeat(off - cur.length);
        cur = cur.slice(0, off) + val + cur.slice(off + val.length);
        e.value = cur;
        setEntry(db, key, e);
        return replyInt(cur.length);
      }
      if (name === 'GETDEL') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'getdel\' command');
        const key = args[1];
        const e = getEntry(db, key);
        if (!e) return replyNil();
        const err = ensureType(e, 'string');
        if (err) return replyErr(err);
        const v = String(e.value ?? '');
        delEntry(db, key);
        return replyStr(v);
      }
      if (name === 'COPY') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'copy\' command');
        const src = args[1];
        const dst = args[2];
        let replace = false;
        if (args[3] === 'REPLACE') replace = true;
        const e = getEntry(db, src);
        if (!e) return replyInt(0);
        if (getEntry(db, dst) && !replace) return replyInt(0);
        setEntry(db, dst, JSON.parse(JSON.stringify(e)));
        return replyInt(1);
      }
      if (name === 'DUMP') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'dump\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyNil();
        return replyStr(redisDumpHex(e));
      }
      if (name === 'RESTORE') {
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'restore\' command');
        const key = args[1];
        const ttl = Number(args[2]);
        const serialized = String(args[3]);
        if (!Number.isInteger(ttl)) return replyErr('ERR value is not an integer or out of range');
        let replace = false; let absttl = false;
        for (let i = 4; i < args.length; i++) {
          const u = String(args[i]).toUpperCase();
          if (u === 'REPLACE') replace = true;
          else if (u === 'ABSTTL') absttl = true;
          else if (u === 'IDLETIME' && i + 1 < args.length) i++;
          else if (u === 'FREQ' && i + 1 < args.length) i++;
        }
        if (getEntry(db, key) && !replace) return replyErr('BUSYKEY Target key name already exists');
        let obj;
        try { obj = redisRestoreFromHex(serialized); } catch (err) { return replyErr('ERR DUMP payload version or checksum are wrong'); }
        let expireAt = null;
        if (ttl === 0) expireAt = null;
        else if (ttl > 0) {
          // Redis RESTORE：ttl 为毫秒；ABSTTL 表示绝对 Unix 时间（毫秒）
          expireAt = absttl ? ttl : now() + ttl;
        }
        obj.expireAt = expireAt;
        setEntry(db, key, obj);
        return replyOk();
      }
      if (name === 'LCS') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'lcs\' command');
        const k1 = args[1]; const k2 = args[2];
        const e1 = getEntry(db, k1); const e2 = getEntry(db, k2);
        if (!e1 || !e2) return replyErr('ERR no such key');
        if (ensureType(e1, 'string') || ensureType(e2, 'string')) return replyErr('WRONGTYPE');
        const a = String(e1.value ?? ''); const b = String(e2.value ?? '');
        let wantLen = false;
        for (let i = 3; i < args.length; i++) if (String(args[i]).toUpperCase() === 'LEN') wantLen = true;
        const r = redisLcsStrings(a, b);
        return wantLen ? replyInt(r.len) : replyStr(r.str);
      }
      if (name === 'STRALGO') {
        const algo = String(args[1] || '').toUpperCase();
        if (algo !== 'LCS') return replyErr('ERR STRALGO subcommand must be LCS');
        if (String(args[2] || '').toUpperCase() !== 'KEYS' || args.length < 5) return replyErr('ERR syntax error');
        return cmd(`LCS ${quoteItem(args[3])} ${quoteItem(args[4])}${args.slice(5).length ? ' ' + args.slice(5).join(' ') : ''}`, true);
      }
      if (name === 'INCRBY' || name === 'DECRBY') {
        if (args.length !== 3) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const key = args[1];
        const delta = Number(args[2]);
        if (!Number.isInteger(delta)) return replyErr('ERR value is not an integer or out of range');
        const e = getEntry(db, key);
        let v = 0;
        let expireAt = null;
        if (e) {
          const err = ensureType(e, 'string');
          if (err) return replyErr(err);
          expireAt = e.expireAt;
          v = parseInt(e.value, 10);
          if (!Number.isFinite(v)) return replyErr('ERR value is not an integer or out of range');
        }
        v = name === 'INCRBY' ? v + delta : v - delta;
        setEntry(db, key, { type: 'string', value: String(v), expireAt });
        return replyInt(v);
      }
      if (name === 'INCRBYFLOAT') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'incrbyfloat\' command');
        const key = args[1];
        const delta = Number(args[2]);
        if (!Number.isFinite(delta)) return replyErr('ERR value is not a valid float');
        const e = getEntry(db, key);
        let v = 0;
        let expireAt = null;
        if (e) {
          const err = ensureType(e, 'string');
          if (err) return replyErr(err);
          expireAt = e.expireAt;
          v = Number(e.value);
          if (!Number.isFinite(v)) v = 0;
        }
        v += delta;
        const out = String(v);
        setEntry(db, key, { type: 'string', value: out, expireAt });
        return replyStr(out);
      }
      if (name === 'UNLINK') {
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'unlink\' command');
        let n = 0;
        for (const k of args.slice(1)) if (delEntry(db, k)) n++;
        return replyInt(n);
      }
      if (name === 'TOUCH') {
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'touch\' command');
        let n = 0;
        for (const k of args.slice(1)) if (getEntry(db, k)) n++;
        return replyInt(n);
      }
      if (name === 'RANDOMKEY') {
        const ks = Object.keys(db.keys || {});
        if (!ks.length) return replyNil();
        return replyStr(ks[Math.floor(Math.random() * ks.length)]);
      }
      if (name === 'OBJECT') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'object\' command');
        const sub = args[1].toUpperCase();
        const key = args[2];
        const e = getEntry(db, key);
        if (!e) return replyNil();
        if (sub === 'ENCODING') return e.type === 'string' ? 'embstr\n' : 'hashtable\n';
        if (sub === 'IDLETIME' || sub === 'FREQ') return replyInt(0);
        return replyNil();
      }

      // bitmap (learning): SETBIT/GETBIT/BITCOUNT
      if (name === 'GETBIT') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'getbit\' command');
        const key = args[1];
        const off = Number(args[2]);
        if (!Number.isInteger(off) || off < 0) return replyErr('ERR bit offset is not an integer or out of range');
        const e = getEntry(db, key);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'bitmap');
        if (err) return replyErr(err);
        return replyInt(bitmapGet(e, off));
      }
      if (name === 'SETBIT') {
        if (args.length !== 4) return replyErr('ERR wrong number of arguments for \'setbit\' command');
        const key = args[1];
        const off = Number(args[2]);
        const bit = Number(args[3]);
        if (!Number.isInteger(off) || off < 0) return replyErr('ERR bit offset is not an integer or out of range');
        if (!(bit === 0 || bit === 1)) return replyErr('ERR bit is not an integer or out of range');
        const r = getOrCreateBitmap(db, key);
        if (r.err) return replyErr(r.err);
        const old = bitmapSet(r.entry, off, bit === 1);
        setEntry(db, key, r.entry);
        return replyInt(old);
      }
      if (name === 'BITCOUNT') {
        if (args.length < 2 || args.length > 4) return replyErr('ERR wrong number of arguments for \'bitcount\' command');
        const key = args[1];
        const e = getEntry(db, key);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'bitmap');
        if (err) return replyErr(err);
        // Redis 以字节为单位范围：start end（可负）
        let startByte = null;
        let endByte = null;
        if (args.length >= 4) {
          startByte = Number(args[2]);
          endByte = Number(args[3]);
          if (!Number.isInteger(startByte) || !Number.isInteger(endByte)) return replyErr('ERR value is not an integer or out of range');
        }
        const maxBit = Math.max(-1, Number(e.value.max || -1));
        const maxByte = Math.floor(maxBit / 8);
        let sB = startByte;
        let eB = endByte;
        if (sB == null) { sB = 0; eB = maxByte; }
        if (sB < 0) sB = maxByte + 1 + sB;
        if (eB < 0) eB = maxByte + 1 + eB;
        sB = Math.max(0, sB);
        eB = Math.min(maxByte, eB);
        if (eB < sB) return replyInt(0);
        const startBit = sB * 8;
        const endBit = eB * 8 + 7;
        let cnt = 0;
        for (const k of Object.keys(e.value.bits || {})) {
          const off = Number(k);
          if (off >= startBit && off <= endBit) cnt++;
        }
        return replyInt(cnt);
      }
      if (name === 'BITOP') {
        // BITOP operation destkey key [key ...]
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'bitop\' command');
        const op = String(args[1] || '').toUpperCase();
        const dest = String(args[2] || '');
        const srcKeys = args.slice(3).map(String);
        if (!dest) return replyErr('ERR syntax error');
        const validOps = new Set(['AND', 'OR', 'XOR', 'NOT']);
        if (!validOps.has(op)) return replyErr('ERR syntax error');
        if (op === 'NOT' && srcKeys.length !== 1) return replyErr('ERR BITOP NOT must be called with a single source key.');
        // 取源 bitmap（不存在当作全 0）
        const srcEntries = srcKeys.map(k => {
          const e = getEntry(db, k);
          if (!e) return null;
          const err = ensureType(e, 'bitmap');
          if (err) return { err };
          return e;
        });
        for (const e of srcEntries) {
          if (e && e.err) return replyErr(e.err);
        }
        const maxBit = Math.max(-1, ...srcEntries.map(e => (e && e.value && typeof e.value.max === 'number') ? e.value.max : -1));
        const outBits = {};
        const limit = Math.max(-1, maxBit);
        // 对稀疏 bits 进行合并：我们遍历可能为 1 的 offset 集合
        const candidateOffsets = new Set();
        for (const e of srcEntries) {
          if (!e || !e.value || !e.value.bits) continue;
          Object.keys(e.value.bits).forEach(k => candidateOffsets.add(k));
        }
        // AND 需要考虑“某个 key 缺失 -> 0”，但 candidateOffsets 已涵盖所有 1 位；只要有一个 0，结果 0，不必记录
        // OR/XOR/NOT 仅在结果为 1 时记录
        const getBit = (e, off) => (e && e.value && e.value.bits && e.value.bits[String(off)]) ? 1 : 0;
        if (op === 'NOT') {
          const e0 = srcEntries[0];
          // NOT 在真实 Redis 是按字节长度取反；学习版按 maxBit 近似（足够学习）
          const allOffsets = new Set(candidateOffsets);
          // 还需要把 0->1 的位也考虑进来：但无法遍历无限，这里按 maxBit 范围遍历
          for (let off = 0; off <= limit; off++) {
            const v = getBit(e0, off) ? 0 : 1;
            if (v) outBits[String(off)] = 1;
          }
        } else {
          // AND/OR/XOR
          for (const k of candidateOffsets) {
            const off = Number(k);
            if (!Number.isFinite(off) || off < 0) continue;
            let v = 0;
            if (op === 'AND') {
              v = 1;
              for (const e of srcEntries) {
                if (!getBit(e, off)) { v = 0; break; }
              }
            } else if (op === 'OR') {
              v = 0;
              for (const e of srcEntries) {
                if (getBit(e, off)) { v = 1; break; }
              }
            } else if (op === 'XOR') {
              let c = 0;
              for (const e of srcEntries) c ^= getBit(e, off);
              v = c ? 1 : 0;
            }
            if (v) outBits[String(off)] = 1;
          }
          // AND 的结果也可能在“所有都是 1”但 candidateOffsets 未覆盖？不会：若某位为 1，至少在某个源 bits 中存在，candidateOffsets 会包含。
        }
        // 写入 dest
        const outMax = Object.keys(outBits).length ? Math.max(...Object.keys(outBits).map(n => Number(n))) : -1;
        setEntry(db, dest, bitmapFromBits(outBits, outMax));
        // 返回 dest 字节长度
        const bytes = outMax < 0 ? 0 : (Math.floor(outMax / 8) + 1);
        return replyInt(bytes);
      }
      if (name === 'BITPOS') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'bitpos\' command');
        const key = args[1];
        const bit = Number(args[2]);
        let start = 0;
        let end = null;
        let idx = 3;
        if (args[idx] === 'BYTE' || args[idx] === 'BIT') idx++;
        if (args[idx] != null && !isNaN(Number(args[idx]))) { start = Number(args[idx++]); }
        if (args[idx] != null && !isNaN(Number(args[idx]))) { end = Number(args[idx++]); }
        const e = getEntry(db, key);
        if (!e) return bit === 1 ? replyInt(-1) : replyInt(0);
        const err = ensureType(e, 'bitmap');
        if (err) return replyErr(err);
        const max = e.value.max >= 0 ? e.value.max : 0;
        const last = end == null ? max : Math.min(end, max);
        for (let off = Math.max(0, start); off <= last; off++) {
          const b = bitmapGet(e, off);
          if (b === bit) return replyInt(off);
        }
        return bit === 1 ? replyInt(-1) : replyInt(last + 1);
      }
      if (name === 'BITFIELD') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'bitfield\' command');
        const key = args[1];
        const r = getOrCreateBitmap(db, key);
        if (r.err) return replyErr(r.err);
        const e = r.entry;
        const outs = [];
        for (let i = 2; i < args.length; i++) {
          const sub = String(args[i] || '').toUpperCase();
          if (sub === 'GET' && i + 2 < args.length) {
            const type = args[++i];
            const off = Number(args[++i]);
            if (!type.startsWith('u') && !type.startsWith('i')) return replyErr('ERR Invalid bitfield type');
            const w = parseInt(type.slice(1), 10) || 1;
            let v = 0;
            for (let b = 0; b < w && off + b <= e.value.max + 64; b++) v = (v << 1) | bitmapGet(e, off + b);
            outs.push(String(v));
          } else if (sub === 'SET' && i + 3 < args.length) {
            const type = args[++i];
            const off = Number(args[++i]);
            const val = Number(args[++i]);
            const w = parseInt(String(type).slice(1), 10) || 1;
            for (let b = w - 1; b >= 0; b--) bitmapSet(e, off + b, (val >> b) & 1);
            setEntry(db, key, e);
            outs.push(String(val));
          } else if (sub === 'INCRBY' && i + 3 < args.length) {
            i += 3;
            outs.push('0');
          } else return replyErr('ERR syntax error');
        }
        return outs.length ? outs.map((v, j) => `${j + 1}) (integer) ${v}`).join('\n') + '\n' : replyOk();
      }

      // HyperLogLog (learning): PFADD/PFCOUNT/PFMERGE
      if (name === 'PFADD') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'pfadd\' command');
        const key = args[1];
        const r = getOrCreateHll(db, key);
        if (r.err) return replyErr(r.err);
        let changed = 0;
        for (const v of args.slice(2)) {
          const s = String(v);
          if (!r.entry.value.set[s]) { r.entry.value.set[s] = 1; changed = 1; }
        }
        setEntry(db, key, r.entry);
        return replyInt(changed);
      }
      if (name === 'PFCOUNT') {
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'pfcount\' command');
        // 学习版：用精确集合近似 HLL 行为
        let union = {};
        for (const key of args.slice(1)) {
          const e = getEntry(db, key);
          if (!e) continue;
          const err = ensureType(e, 'hll');
          if (err) return replyErr(err);
          union = { ...union, ...(e.value && e.value.set ? e.value.set : {}) };
        }
        return replyInt(Object.keys(union).length);
      }
      if (name === 'PFMERGE') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'pfmerge\' command');
        const dest = args[1];
        const r = getOrCreateHll(db, dest);
        if (r.err) return replyErr(r.err);
        const merged = { ...(r.entry.value.set || {}) };
        for (const key of args.slice(2)) {
          const e = getEntry(db, key);
          if (!e) continue;
          const err = ensureType(e, 'hll');
          if (err) return replyErr(err);
          Object.assign(merged, e.value && e.value.set ? e.value.set : {});
        }
        r.entry.value.set = merged;
        setEntry(db, dest, r.entry);
        return replyOk();
      }
      if (name === 'PFSELFTEST') {
        if (args.length !== 1) return replyErr('ERR wrong number of arguments for \'pfselftest\' command');
        return replyOk();
      }
      if (name === 'PFDEBUG') {
        // PFDEBUG is an internal command in Redis; keep minimal for learning.
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'pfdebug\' command');
        const sub = String(args[1] || '').toUpperCase();
        if (sub === 'HELP') {
          return formatArray([
            'PFDEBUG HELP',
            'PFDEBUG ENCODING key',
            'PFDEBUG GETREGISTERS key',
          ]);
        }
        if (sub === 'ENCODING') {
          if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'pfdebug\' command');
          const e = getEntry(db, args[2]);
          if (!e) return replyStr('sparse');
          const err = ensureType(e, 'hll');
          if (err) return replyErr(err);
          return replyStr('dense');
        }
        if (sub === 'GETREGISTERS') {
          if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'pfdebug\' command');
          const e = getEntry(db, args[2]);
          if (!e) return '(empty array)\n';
          const err = ensureType(e, 'hll');
          if (err) return replyErr(err);
          // 学习版没有寄存器，返回空
          return '(empty array)\n';
        }
        return replyErr('ERR unknown subcommand or wrong arguments for PFDEBUG');
      }

      // GEO (learning): GEOADD/GEOPOS/GEODIST/GEORADIUS (basic)
      if (name === 'GEOADD') {
        if (args.length < 5 || (args.length - 2) % 3 !== 0) return replyErr('ERR wrong number of arguments for \'geoadd\' command');
        const key = args[1];
        const r = getOrCreateGeo(db, key);
        if (r.err) return replyErr(r.err);
        let added = 0;
        for (let i = 2; i < args.length; i += 3) {
          const lon = Number(args[i]);
          const lat = Number(args[i + 1]);
          const member = String(args[i + 2]);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) return replyErr('ERR value is not a valid float');
          if (!Object.prototype.hasOwnProperty.call(r.entry.value.members, member)) added++;
          r.entry.value.members[member] = { lon, lat };
        }
        setEntry(db, key, r.entry);
        return replyInt(added);
      }
      if (name === 'GEOPOS') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'geopos\' command');
        const e = getEntry(db, args[1]);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'geo');
        if (err) return replyErr(err);
        const members = args.slice(2);
        let out = '';
        for (let i = 0; i < members.length; i++) {
          const m = String(members[i]);
          const p = e.value.members[m];
          if (!p) out += `${i + 1}) (nil)\n`;
          else out += `${i + 1}) 1) "${p.lon}"\n   2) "${p.lat}"\n`;
        }
        return out;
      }
      if (name === 'GEODIST') {
        if (args.length < 4 || args.length > 5) return replyErr('ERR wrong number of arguments for \'geodist\' command');
        const key = args[1];
        const m1 = String(args[2]);
        const m2 = String(args[3]);
        const unit = args[4] || 'm';
        const e = getEntry(db, key);
        if (!e) return replyNil();
        const err = ensureType(e, 'geo');
        if (err) return replyErr(err);
        const p1 = e.value.members[m1];
        const p2 = e.value.members[m2];
        if (!p1 || !p2) return replyNil();
        const scale = unitToMeters(unit);
        if (!scale) return replyErr('ERR unsupported unit provided. please use m, km, ft, mi');
        const meters = haversineMeters(p1.lon, p1.lat, p2.lon, p2.lat);
        const v = meters / scale;
        return replyStr(String(v));
      }
      if (name === 'GEORADIUS') {
        // GEORADIUS key lon lat radius unit [WITHDIST]
        if (args.length < 6) return replyErr('ERR wrong number of arguments for \'georadius\' command');
        const key = args[1];
        const lon = Number(args[2]);
        const lat = Number(args[3]);
        const radius = Number(args[4]);
        const unit = args[5];
        if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(radius)) return replyErr('ERR value is not a valid float');
        const scale = unitToMeters(unit);
        if (!scale) return replyErr('ERR unsupported unit provided. please use m, km, ft, mi');
        const withDist = args.slice(6).map(a => String(a).toUpperCase()).includes('WITHDIST');
        const e = getEntry(db, key);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'geo');
        if (err) return replyErr(err);
        const metersRadius = radius * scale;
        const rows = Object.keys(e.value.members).map(m => {
          const p = e.value.members[m];
          const d = haversineMeters(lon, lat, p.lon, p.lat);
          return { m, d };
        }).filter(r => r.d <= metersRadius).sort((a, b) => a.d - b.d);
        if (!rows.length) return '(empty array)\n';
        let out = '';
        for (let i = 0; i < rows.length; i++) {
          if (!withDist) out += `${i + 1}) ${quoteItem(rows[i].m)}\n`;
          else out += `${i + 1}) 1) ${quoteItem(rows[i].m)}\n   2) ${quoteItem(String(rows[i].d / scale))}\n`;
        }
        return out;
      }
      if (name === 'GEORADIUSBYMEMBER') {
        // GEORADIUSBYMEMBER key member radius unit [WITHDIST]
        if (args.length < 5) return replyErr('ERR wrong number of arguments for \'georadiusbymember\' command');
        const key = args[1];
        const member = String(args[2]);
        const radius = Number(args[3]);
        const unit = args[4];
        if (!Number.isFinite(radius)) return replyErr('ERR value is not a valid float');
        const scale = unitToMeters(unit);
        if (!scale) return replyErr('ERR unsupported unit provided. please use m, km, ft, mi');
        const withDist = args.slice(5).map(a => String(a).toUpperCase()).includes('WITHDIST');
        const e = getEntry(db, key);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'geo');
        if (err) return replyErr(err);
        const center = e.value.members[member];
        if (!center) return '(empty array)\n';
        const metersRadius = radius * scale;
        const rows = Object.keys(e.value.members).map(m => {
          const p = e.value.members[m];
          const d = haversineMeters(center.lon, center.lat, p.lon, p.lat);
          return { m, d };
        }).filter(r => r.d <= metersRadius).sort((a, b) => a.d - b.d);
        if (!rows.length) return '(empty array)\n';
        let out = '';
        for (let i = 0; i < rows.length; i++) {
          if (!withDist) out += `${i + 1}) ${quoteItem(rows[i].m)}\n`;
          else out += `${i + 1}) 1) ${quoteItem(rows[i].m)}\n   2) ${quoteItem(String(rows[i].d / scale))}\n`;
        }
        return out;
      }
      if (name === 'GEOSEARCH') {
        // GEOSEARCH key FROMMEMBER m | FROMLONLAT lon lat  BYRADIUS r unit  [ASC|DESC] [COUNT n] [WITHDIST] [WITHCOORD]
        if (args.length < 6) return replyErr('ERR wrong number of arguments for \'geosearch\' command');
        const key = args[1];
        const e = getEntry(db, key);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'geo');
        if (err) return replyErr(err);

        let idx = 2;
        let fromLon = null;
        let fromLat = null;
        const fromMode = String(args[idx] || '').toUpperCase();
        if (fromMode === 'FROMMEMBER') {
          const m = String(args[idx + 1] || '');
          const p = e.value.members[m];
          if (!p) return '(empty array)\n';
          fromLon = p.lon; fromLat = p.lat;
          idx += 2;
        } else if (fromMode === 'FROMLONLAT') {
          fromLon = Number(args[idx + 1]);
          fromLat = Number(args[idx + 2]);
          if (!Number.isFinite(fromLon) || !Number.isFinite(fromLat)) return replyErr('ERR value is not a valid float');
          idx += 3;
        } else {
          return replyErr('ERR syntax error');
        }
        const by = String(args[idx] || '').toUpperCase();
        if (by !== 'BYRADIUS') return replyErr('ERR only BYRADIUS is supported in learning mode');
        const radius = Number(args[idx + 1]);
        const unit = args[idx + 2];
        if (!Number.isFinite(radius)) return replyErr('ERR value is not a valid float');
        const scale = unitToMeters(unit);
        if (!scale) return replyErr('ERR unsupported unit provided. please use m, km, ft, mi');
        idx += 3;

        let order = 'ASC';
        let count = null;
        let withDist = false;
        let withCoord = false;
        while (idx < args.length) {
          const opt = String(args[idx] || '').toUpperCase();
          if (opt === 'ASC' || opt === 'DESC') { order = opt; idx++; continue; }
          if (opt === 'COUNT' && idx + 1 < args.length) {
            const n = Number(args[idx + 1]);
            if (Number.isFinite(n) && n > 0) count = Math.floor(n);
            idx += 2;
            continue;
          }
          if (opt === 'WITHDIST') { withDist = true; idx++; continue; }
          if (opt === 'WITHCOORD') { withCoord = true; idx++; continue; }
          // ignore unsupported options in learning mode
          idx++;
        }

        const metersRadius = radius * scale;
        let rows = Object.keys(e.value.members).map(m => {
          const p = e.value.members[m];
          const dMeters = haversineMeters(fromLon, fromLat, p.lon, p.lat);
          return { m, p, dMeters };
        }).filter(r => r.dMeters <= metersRadius);
        rows.sort((a, b) => order === 'DESC' ? (b.dMeters - a.dMeters) : (a.dMeters - b.dMeters));
        if (count != null) rows = rows.slice(0, count);
        if (!rows.length) return '(empty array)\n';

        let out = '';
        for (let i = 0; i < rows.length; i++) {
          if (!withDist && !withCoord) {
            out += `${i + 1}) ${quoteItem(rows[i].m)}\n`;
            continue;
          }
          let innerIndex = 1;
          out += `${i + 1}) ${innerIndex++}) ${quoteItem(rows[i].m)}\n`;
          if (withDist) out += `   ${innerIndex++}) ${quoteItem(String(rows[i].dMeters / scale))}\n`;
          if (withCoord) {
            out += `   ${innerIndex++}) 1) ${quoteItem(String(rows[i].p.lon))}\n      2) ${quoteItem(String(rows[i].p.lat))}\n`;
          }
        }
        return out;
      }
      if (name === 'GEOSEARCHSTORE') {
        if (args.length < 7) return replyErr('ERR wrong number of arguments for \'geosearchstore\' command');
        const dest = String(args[1]);
        const key = args[2];
        const e = getEntry(db, key);
        if (!e) { delEntry(db, dest); return replyInt(0); }
        const errT = ensureType(e, 'geo');
        if (errT) return replyErr(errT);
        let idx = 3;
        let fromLon = null; let fromLat = null;
        const fromMode = String(args[idx] || '').toUpperCase();
        if (fromMode === 'FROMMEMBER') {
          const m = String(args[idx + 1] || '');
          const p = e.value.members[m];
          if (!p) { delEntry(db, dest); return replyInt(0); }
          fromLon = p.lon; fromLat = p.lat;
          idx += 2;
        } else if (fromMode === 'FROMLONLAT') {
          fromLon = Number(args[idx + 1]); fromLat = Number(args[idx + 2]);
          if (!Number.isFinite(fromLon) || !Number.isFinite(fromLat)) return replyErr('ERR value is not a valid float');
          idx += 3;
        } else return replyErr('ERR syntax error');
        const by = String(args[idx] || '').toUpperCase();
        if (by !== 'BYRADIUS') return replyErr('ERR only BYRADIUS is supported in learning mode');
        const radius = Number(args[idx + 1]);
        const unit = args[idx + 2];
        if (!Number.isFinite(radius)) return replyErr('ERR value is not a valid float');
        const scale = unitToMeters(unit);
        if (!scale) return replyErr('ERR unsupported unit provided. please use m, km, ft, mi');
        idx += 3;
        let order = 'ASC';
        let count = null;
        while (idx < args.length) {
          const opt = String(args[idx] || '').toUpperCase();
          if (opt === 'ASC' || opt === 'DESC') { order = opt; idx++; continue; }
          if (opt === 'COUNT' && idx + 1 < args.length) {
            const n = Number(args[idx + 1]);
            if (Number.isFinite(n) && n > 0) count = Math.floor(n);
            idx += 2; continue;
          }
          idx++;
        }
        const metersRadius = radius * scale;
        let rows = Object.keys(e.value.members).map(m => {
          const p = e.value.members[m];
          const dMeters = haversineMeters(fromLon, fromLat, p.lon, p.lat);
          return { m, p, dMeters };
        }).filter(r => r.dMeters <= metersRadius);
        rows.sort((a, b) => (order === 'DESC' ? (b.dMeters - a.dMeters) : (a.dMeters - b.dMeters)));
        if (count != null) rows = rows.slice(0, count);
        const r = getOrCreateGeo(db, dest);
        if (r.err) return replyErr(r.err);
        const de = r.entry;
        de.value.members = {};
        for (const row of rows) de.value.members[row.m] = { lon: row.p.lon, lat: row.p.lat };
        if (!rows.length) delEntry(db, dest); else setEntry(db, dest, de);
        return replyInt(rows.length);
      }

      // hash
      if (name === 'HSET') {
        if (args.length < 4 || (args.length - 2) % 2 !== 0) return replyErr('ERR wrong number of arguments for \'hset\' command');
        const key = args[1];
        let e = getEntry(db, key);
        if (!e) e = { type: 'hash', value: {}, expireAt: null };
        const err = ensureType(e, 'hash');
        if (err) return replyErr(err);
        let added = 0;
        for (let i = 2; i < args.length; i += 2) {
          const f = args[i];
          const v = args[i + 1];
          if (!Object.prototype.hasOwnProperty.call(e.value, f)) added++;
          e.value[f] = String(v);
        }
        setEntry(db, key, e);
        return replyInt(added);
      }
      if (name === 'HDEL') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'hdel\' command');
        const key = args[1];
        const e = getEntry(db, key);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'hash');
        if (err) return replyErr(err);
        let removed = 0;
        for (const f of args.slice(2)) {
          if (Object.prototype.hasOwnProperty.call(e.value, f)) {
            delete e.value[f];
            removed++;
          }
        }
        if (Object.keys(e.value).length === 0) {
          // Redis 中 hash 为空时 key 仍可存在，但多数情况下会被删除；学习版这里删除以简化
          delEntry(db, key);
        } else {
          setEntry(db, key, e);
        }
        return replyInt(removed);
      }
      if (name === 'HGET') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'hget\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyNil();
        const err = ensureType(e, 'hash');
        if (err) return replyErr(err);
        const v = Object.prototype.hasOwnProperty.call(e.value, args[2]) ? e.value[args[2]] : null;
        return v == null ? replyNil() : replyStr(v);
      }
      if (name === 'HGETALL') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'hgetall\' command');
        const e = getEntry(db, args[1]);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'hash');
        if (err) return replyErr(err);
        const fields = Object.keys(e.value);
        const arr = [];
        for (const f of fields) { arr.push(quoteItem(f)); arr.push(quoteItem(e.value[f])); }
        if (!arr.length) return '(empty array)\n';
        let out = '';
        for (let i = 0; i < arr.length; i++) out += `${i + 1}) ${arr[i]}\n`;
        return out;
      }
      if (name === 'HKEYS') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'hkeys\' command');
        const e = getEntry(db, args[1]);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'hash');
        if (err) return replyErr(err);
        return formatArray(Object.keys(e.value || {}));
      }
      if (name === 'HVALS') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'hvals\' command');
        const e = getEntry(db, args[1]);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'hash');
        if (err) return replyErr(err);
        return formatArray(Object.keys(e.value || {}).map(k => String(e.value[k])));
      }
      if (name === 'HEXISTS') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'hexists\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'hash');
        if (err) return replyErr(err);
        return replyInt(Object.prototype.hasOwnProperty.call(e.value, args[2]) ? 1 : 0);
      }
      if (name === 'HLEN') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'hlen\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'hash');
        if (err) return replyErr(err);
        return replyInt(Object.keys(e.value || {}).length);
      }
      if (name === 'HMSET') {
        if (args.length < 4 || (args.length - 2) % 2 !== 0) return replyErr('ERR wrong number of arguments for \'hmset\' command');
        const key = args[1];
        let e = getEntry(db, key);
        if (!e) e = { type: 'hash', value: {}, expireAt: null };
        const err = ensureType(e, 'hash');
        if (err) return replyErr(err);
        for (let i = 2; i < args.length; i += 2) e.value[String(args[i])] = String(args[i + 1]);
        setEntry(db, key, e);
        return replyOk();
      }
      if (name === 'HMGET') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'hmget\' command');
        const e = getEntry(db, args[1]);
        const fields = args.slice(2);
        const arr = [];
        for (const f of fields) {
          if (!e) { arr.push(null); continue; }
          const err = ensureType(e, 'hash');
          if (err) return replyErr(err);
          arr.push(Object.prototype.hasOwnProperty.call(e.value, f) ? e.value[f] : null);
        }
        return formatArray(arr.map(v => (v == null ? null : String(v))));
      }
      if (name === 'HINCRBY') {
        if (args.length !== 4) return replyErr('ERR wrong number of arguments for \'hincrby\' command');
        const key = args[1];
        const field = String(args[2]);
        const inc = Number(args[3]);
        if (!Number.isInteger(inc)) return replyErr('ERR value is not an integer or out of range');
        let e = getEntry(db, key);
        if (!e) e = { type: 'hash', value: {}, expireAt: null };
        const err = ensureType(e, 'hash');
        if (err) return replyErr(err);
        const cur = e.value[field];
        if (cur != null && !/^[-+]?\d+$/.test(String(cur))) return replyErr('ERR hash value is not an integer');
        const next = (cur == null ? 0 : parseInt(cur, 10)) + inc;
        e.value[field] = String(next);
        setEntry(db, key, e);
        return replyInt(next);
      }
      if (name === 'HINCRBYFLOAT') {
        if (args.length !== 4) return replyErr('ERR wrong number of arguments for \'hincrbyfloat\' command');
        const key = args[1];
        const field = String(args[2]);
        const inc = Number(args[3]);
        if (!Number.isFinite(inc)) return replyErr('ERR value is not a valid float');
        let e = getEntry(db, key);
        if (!e) e = { type: 'hash', value: {}, expireAt: null };
        const err = ensureType(e, 'hash');
        if (err) return replyErr(err);
        const cur = e.value[field];
        const base = cur == null ? 0 : Number(cur);
        if (!Number.isFinite(base)) return replyErr('ERR hash value is not a float');
        const next = base + inc;
        const s = String(next);
        e.value[field] = s;
        setEntry(db, key, e);
        return replyStr(s);
      }
      if (name === 'HRANDFIELD') {
        if (args.length < 2 || args.length > 4) return replyErr('ERR wrong number of arguments for \'hrandfield\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyNil();
        const err = ensureType(e, 'hash');
        if (err) return replyErr(err);
        const keys = Object.keys(e.value || {});
        if (!keys.length) return replyNil();
        let count = 1;
        let withValues = false;
        if (args[2] != null) {
          if (String(args[2]).toUpperCase() === 'WITHVALUES') withValues = true;
          else {
            count = Number(args[2]);
            if (!Number.isInteger(count)) return replyErr('ERR value is not an integer or out of range');
            if (String(args[3] || '').toUpperCase() === 'WITHVALUES') withValues = true;
          }
        }
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        if (count === 1 && !withValues) return replyStr(pick(keys));
        const shuffled = keys.slice().sort(() => Math.random() - 0.5);
        const take = shuffled.slice(0, Math.max(0, count));
        if (!withValues) return formatArray(take);
        const out = [];
        for (const k of take) { out.push(k); out.push(String(e.value[k])); }
        return formatArray(out);
      }
      if (name === 'HSTRLEN') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'hstrlen\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'hash');
        if (err) return replyErr(err);
        const v = e.value[args[2]];
        return replyInt(v == null ? 0 : String(v).length);
      }

      // list
      if (name === 'LPUSH' || name === 'RPUSH') {
        if (args.length < 3) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const key = args[1];
        let e = getEntry(db, key);
        if (!e) e = { type: 'list', value: [], expireAt: null };
        const err = ensureType(e, 'list');
        if (err) return replyErr(err);
        const vals = args.slice(2).map(String);
        if (name === 'LPUSH') e.value.unshift(...vals);
        else e.value.push(...vals);
        setEntry(db, key, e);
        return replyInt(e.value.length);
      }
      if (name === 'LPOP' || name === 'RPOP') {
        if (args.length < 2 || args.length > 3) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const e = getEntry(db, args[1]);
        if (!e) return replyNil();
        const err = ensureType(e, 'list');
        if (err) return replyErr(err);
        const count = args[2] != null ? Number(args[2]) : null;
        if (count == null) {
          const v = name === 'LPOP' ? e.value.shift() : e.value.pop();
          if (e.value.length === 0) delEntry(db, args[1]); else setEntry(db, args[1], e);
          return v == null ? replyNil() : replyStr(v);
        }
        if (!Number.isInteger(count) || count < 0) return replyErr('ERR value is not an integer or out of range');
        const outVals = [];
        for (let i = 0; i < count; i++) {
          const v = name === 'LPOP' ? e.value.shift() : e.value.pop();
          if (v == null) break;
          outVals.push(v);
        }
        if (e.value.length === 0) delEntry(db, args[1]); else setEntry(db, args[1], e);
        return formatArray(outVals);
      }
      if (name === 'LRANGE') {
        if (args.length !== 4) return replyErr('ERR wrong number of arguments for \'lrange\' command');
        const e = getEntry(db, args[1]);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'list');
        if (err) return replyErr(err);
        let start = Number(args[2]);
        let stop = Number(args[3]);
        if (!Number.isInteger(start) || !Number.isInteger(stop)) return replyErr('ERR value is not an integer or out of range');
        const arr = e.value;
        const len = arr.length;
        if (start < 0) start = len + start;
        if (stop < 0) stop = len + stop;
        start = Math.max(0, start);
        stop = Math.min(len - 1, stop);
        if (stop < start || len === 0) return '(empty array)\n';
        const slice = arr.slice(start, stop + 1);
        return formatArray(slice);
      }
      if (name === 'LLEN') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'llen\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'list');
        if (err) return replyErr(err);
        return replyInt(e.value.length);
      }
      if (name === 'LINDEX') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'lindex\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyNil();
        const err = ensureType(e, 'list');
        if (err) return replyErr(err);
        let idx = Number(args[2]);
        const arr = e.value;
        if (!Number.isInteger(idx)) return replyErr('ERR value is not an integer');
        if (idx < 0) idx = arr.length + idx;
        if (idx < 0 || idx >= arr.length) return replyNil();
        return replyStr(arr[idx]);
      }
      if (name === 'LINSERT') {
        if (args.length !== 5) return replyErr('ERR wrong number of arguments for \'linsert\' command');
        const key = args[1];
        const where = args[2].toUpperCase();
        const pivot = args[3];
        const val = args[4];
        const e = getEntry(db, key);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'list');
        if (err) return replyErr(err);
        const i = e.value.indexOf(pivot);
        if (i < 0) return replyInt(-1);
        if (where === 'BEFORE') e.value.splice(i, 0, val);
        else if (where === 'AFTER') e.value.splice(i + 1, 0, val);
        else return replyErr('ERR syntax error');
        setEntry(db, key, e);
        return replyInt(e.value.length);
      }
      if (name === 'LSET') {
        if (args.length !== 4) return replyErr('ERR wrong number of arguments for \'lset\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyErr('ERR no such key');
        const err = ensureType(e, 'list');
        if (err) return replyErr(err);
        let idx = Number(args[2]);
        if (!Number.isInteger(idx)) return replyErr('ERR value is not an integer');
        if (idx < 0) idx = e.value.length + idx;
        if (idx < 0 || idx >= e.value.length) return replyErr('ERR index out of range');
        e.value[idx] = String(args[3]);
        setEntry(db, args[1], e);
        return replyOk();
      }
      if (name === 'LREM') {
        if (args.length !== 4) return replyErr('ERR wrong number of arguments for \'lrem\' command');
        const key = args[1];
        let count = Number(args[2]);
        const val = args[3];
        const e = getEntry(db, key);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'list');
        if (err) return replyErr(err);
        let removed = 0;
        if (count === 0) {
          const nv = e.value.filter(x => { if (x === val) { removed++; return false; } return true; });
          e.value = nv;
        } else if (count > 0) {
          const nv = [];
          for (const x of e.value) {
            if (removed < count && x === val) { removed++; continue; }
            nv.push(x);
          }
          e.value = nv;
        } else {
          const c = -count;
          for (let i = e.value.length - 1; i >= 0 && removed < c; i--) {
            if (e.value[i] === val) { e.value.splice(i, 1); removed++; }
          }
        }
        if (e.value.length === 0) delEntry(db, key); else setEntry(db, key, e);
        return replyInt(removed);
      }
      if (name === 'LTRIM') {
        if (args.length !== 4) return replyErr('ERR wrong number of arguments for \'ltrim\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyOk();
        const err = ensureType(e, 'list');
        if (err) return replyErr(err);
        let st = Number(args[2]);
        let en = Number(args[3]);
        const len = e.value.length;
        if (st < 0) st = len + st;
        if (en < 0) en = len + en;
        st = Math.max(0, st);
        en = Math.min(len - 1, en);
        if (st > en || len === 0) e.value = [];
        else e.value = e.value.slice(st, en + 1);
        if (e.value.length === 0) delEntry(db, args[1]); else setEntry(db, args[1], e);
        return replyOk();
      }
      if (name === 'RPOPLPUSH') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'rpoplpush\' command');
        const src = args[1];
        const dst = args[2];
        const se = getEntry(db, src);
        if (!se) return replyNil();
        const err = ensureType(se, 'list');
        if (err) return replyErr(err);
        const v = se.value.pop();
        if (se.value.length === 0) delEntry(db, src); else setEntry(db, src, se);
        let de = getEntry(db, dst);
        if (!de) de = { type: 'list', value: [], expireAt: null };
        const err2 = ensureType(de, 'list');
        if (err2) return replyErr(err2);
        de.value.unshift(v);
        setEntry(db, dst, de);
        return replyStr(v);
      }
      if (name === 'LMOVE') {
        if (args.length !== 5) return replyErr('ERR wrong number of arguments for \'lmove\' command');
        const src = args[1];
        const dst = args[2];
        const from = args[3].toUpperCase();
        const to = args[4].toUpperCase();
        const se = getEntry(db, src);
        if (!se) return replyNil();
        const err = ensureType(se, 'list');
        if (err) return replyErr(err);
        let v;
        if (from === 'LEFT') v = se.value.shift(); else if (from === 'RIGHT') v = se.value.pop(); else return replyErr('ERR syntax error');
        if (v == null) return replyNil();
        if (se.value.length === 0) delEntry(db, src); else setEntry(db, src, se);
        let de = getEntry(db, dst);
        if (!de) de = { type: 'list', value: [], expireAt: null };
        const errDe = ensureType(de, 'list');
        if (errDe) return replyErr(errDe);
        if (to === 'LEFT') de.value.unshift(v); else if (to === 'RIGHT') de.value.push(v); else return replyErr('ERR syntax error');
        setEntry(db, dst, de);
        return replyStr(v);
      }
      if (name === 'LPUSHX' || name === 'RPUSHX') {
        if (args.length < 3) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const key = args[1];
        const e = getEntry(db, key);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'list');
        if (err) return replyErr(err);
        const vals = args.slice(2).map(String);
        if (name === 'LPUSHX') e.value.unshift(...vals); else e.value.push(...vals);
        setEntry(db, key, e);
        return replyInt(e.value.length);
      }
      if (name === 'LPOS') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'lpos\' command');
        const key = args[1];
        const element = args[2];
        let rank = 1;
        let count = null;
        let maxlen = null;
        for (let i = 3; i < args.length; i++) {
          const u = String(args[i]).toUpperCase();
          if (u === 'RANK' && i + 1 < args.length) rank = Number(args[++i]);
          else if (u === 'COUNT' && i + 1 < args.length) count = Number(args[++i]);
          else if (u === 'MAXLEN' && i + 1 < args.length) maxlen = Number(args[++i]);
          else return replyErr('ERR syntax error');
        }
        if (!Number.isInteger(rank) || rank < 1) return replyErr('ERR RANK cannot be zero: use 1 to start from the first match');
        const e = getEntry(db, key);
        if (!e) return replyNil();
        const err = ensureType(e, 'list');
        if (err) return replyErr(err);
        const arr = e.value;
        const scanLen = maxlen != null && Number.isInteger(maxlen) ? Math.min(maxlen, arr.length) : arr.length;
        const matches = [];
        for (let i = 0; i < scanLen; i++) if (arr[i] === element) matches.push(i);
        if (count != null) {
          if (!Number.isInteger(count) || count < 0) return replyErr('ERR value is not an integer or out of range');
          const slice = matches.slice(rank - 1, (rank - 1) + count);
          if (count === 0) return '(empty array)\n';
          return formatArray(slice.map(String));
        }
        const at = matches[rank - 1];
        return at === undefined ? replyNil() : replyInt(at);
      }
      if (name === 'BLPOP') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'blpop\' command');
        const timeout = Number(args[args.length - 1]);
        if (!Number.isInteger(timeout) || timeout < 0) return replyErr('ERR timeout is not an integer or out of range');
        const keys = args.slice(1, -1).map(String);
        for (const k of keys) {
          const e = getEntry(db, k);
          if (!e) continue;
          const err = ensureType(e, 'list');
          if (err) return replyErr(err);
          if (e.value.length > 0) {
            const v = e.value.shift();
            if (e.value.length === 0) delEntry(db, k); else setEntry(db, k, e);
            return formatArray([k, v]);
          }
        }
        if (opts && opts.blockProbe) return REDIS_BLOCK_PENDING;
        return replyNil();
      }
      if (name === 'BRPOP') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'brpop\' command');
        const timeout = Number(args[args.length - 1]);
        if (!Number.isInteger(timeout) || timeout < 0) return replyErr('ERR timeout is not an integer or out of range');
        const keys = args.slice(1, -1).map(String);
        for (const k of keys) {
          const e = getEntry(db, k);
          if (!e) continue;
          const err = ensureType(e, 'list');
          if (err) return replyErr(err);
          if (e.value.length > 0) {
            const v = e.value.pop();
            if (e.value.length === 0) delEntry(db, k); else setEntry(db, k, e);
            return formatArray([k, v]);
          }
        }
        if (opts && opts.blockProbe) return REDIS_BLOCK_PENDING;
        return replyNil();
      }
      if (name === 'BRPOPLPUSH') {
        if (args.length !== 4) return replyErr('ERR wrong number of arguments for \'brpoplpush\' command');
        const src = args[1];
        const dst = args[2];
        const timeout = Number(args[3]);
        if (!Number.isInteger(timeout) || timeout < 0) return replyErr('ERR timeout is not an integer or out of range');
        const se = getEntry(db, src);
        if (!se) { if (opts && opts.blockProbe) return REDIS_BLOCK_PENDING; return replyNil(); }
        const err = ensureType(se, 'list');
        if (err) return replyErr(err);
        if (se.value.length === 0) { if (opts && opts.blockProbe) return REDIS_BLOCK_PENDING; return replyNil(); }
        const v = se.value.pop();
        if (se.value.length === 0) delEntry(db, src); else setEntry(db, src, se);
        let de = getEntry(db, dst);
        if (!de) de = { type: 'list', value: [], expireAt: null };
        const err2 = ensureType(de, 'list');
        if (err2) return replyErr(err2);
        de.value.unshift(v);
        setEntry(db, dst, de);
        return replyStr(v);
      }
      if (name === 'BLMOVE') {
        if (args.length !== 6) return replyErr('ERR wrong number of arguments for \'blmove\' command');
        const timeout = Number(args[5]);
        if (!Number.isInteger(timeout) || timeout < 0) return replyErr('ERR timeout is not an integer or out of range');
        const r = cmd(`LMOVE ${quoteItem(args[1])} ${quoteItem(args[2])} ${args[3]} ${args[4]}`, true, opts);
        if (r === replyNil() && opts && opts.blockProbe) return REDIS_BLOCK_PENDING;
        return r;
      }
      if (name === 'BLMPOP') {
        // BLMPOP timeout numkeys key [key ...] LEFT|RIGHT [COUNT count]
        if (args.length < 5) return replyErr('ERR wrong number of arguments for \'blmpop\' command');
        const timeout = Number(args[1]);
        if (!Number.isInteger(timeout) || timeout < 0) return replyErr('ERR timeout is not an integer or out of range');
        const numkeys = Number(args[2]);
        if (!Number.isInteger(numkeys) || numkeys <= 0) return replyErr('ERR numkeys should be greater than 0');
        if (args.length < 3 + numkeys + 1) return replyErr('ERR syntax error');
        const keys = args.slice(3, 3 + numkeys).map(String);
        let idx = 3 + numkeys;
        const side = String(args[idx++] || '').toUpperCase();
        if (side !== 'LEFT' && side !== 'RIGHT') return replyErr('ERR syntax error');
        let popCount = 1;
        if (args[idx] != null && String(args[idx]).toUpperCase() === 'COUNT') {
          popCount = Number(args[idx + 1]);
          if (!Number.isInteger(popCount) || popCount < 1) return replyErr('ERR value is not an integer or out of range');
        }
        for (const k of keys) {
          const e = getEntry(db, k);
          if (!e) continue;
          const err = ensureType(e, 'list');
          if (err) return replyErr(err);
          if (e.value.length === 0) continue;
          const outVals = [];
          for (let i = 0; i < popCount && e.value.length; i++) {
            outVals.push(side === 'LEFT' ? e.value.shift() : e.value.pop());
          }
          if (e.value.length === 0) delEntry(db, k); else setEntry(db, k, e);
          let out = `1) ${quoteItem(k)}\n2) \n`;
          for (let j = 0; j < outVals.length; j++) out += `   ${j + 1}) ${quoteItem(outVals[j])}\n`;
          return out;
        }
        if (opts && opts.blockProbe) return REDIS_BLOCK_PENDING;
        return replyNil();
      }
      if (name === 'ZMPOP') {
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'zmpop\' command');
        const numkeys = Number(args[1]);
        if (!Number.isInteger(numkeys) || numkeys <= 0) return replyErr('ERR value is not an integer or out of range');
        if (args.length < 2 + numkeys + 1) return replyErr('ERR syntax error');
        const keys = args.slice(2, 2 + numkeys).map(String);
        let idx = 2 + numkeys;
        const where = String(args[idx++] || '').toUpperCase();
        if (where !== 'MIN' && where !== 'MAX') return replyErr('ERR syntax error');
        let popCount = 1;
        if (idx < args.length && String(args[idx]).toUpperCase() === 'COUNT') {
          popCount = Number(args[idx + 1]);
          if (!Number.isInteger(popCount) || popCount < 1) return replyErr('ERR value is not an integer or out of range');
        }
        for (const k of keys) {
          const e = getEntry(db, k);
          if (!e) continue;
          const err = ensureType(e, 'zset');
          if (err) return replyErr(err);
          const members = zsetSorted(e, where === 'MAX');
          if (!members.length) continue;
          const take = Math.min(popCount, members.length);
          const picked = where === 'MIN' ? members.slice(0, take) : members.slice(-take);
          const pairs = picked.map(m => ({ m, sc: e.value[m] }));
          const lines = [];
          let lineIdx = 1;
          for (const { m, sc } of pairs) {
            delete e.value[m];
            lines.push(`   ${lineIdx++}) 1) ${quoteItem(m)}\n      2) ${quoteItem(String(sc))}\n`);
          }
          if (!Object.keys(e.value).length) delEntry(db, k); else setEntry(db, k, e);
          let out = `1) ${quoteItem(k)}\n2) \n` + lines.join('');
          return out;
        }
        if (opts && opts.blockProbe) return REDIS_BLOCK_PENDING;
        return replyNil();
      }
      if (name === 'BZMPOP') {
        if (args.length < 5) return replyErr('ERR wrong number of arguments for \'bzmpop\' command');
        const timeout = Number(args[1]);
        if (!Number.isInteger(timeout) || timeout < 0) return replyErr('ERR timeout is not an integer or out of range');
        const tail = args.slice(2);
        return cmd(`ZMPOP ${tail.join(' ')}`, true, opts);
      }
      if (name === 'BZPOPMIN' || name === 'BZPOPMAX') {
        if (args.length < 3) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const timeout = Number(args[args.length - 1]);
        if (!Number.isInteger(timeout) || timeout < 0) return replyErr('ERR timeout is not an integer or out of range');
        const keys = args.slice(1, -1).map(String);
        const useMax = name === 'BZPOPMAX';
        for (const k of keys) {
          const e = getEntry(db, k);
          if (!e) continue;
          const err = ensureType(e, 'zset');
          if (err) return replyErr(err);
          const members = zsetSorted(e, useMax);
          if (!members.length) continue;
          const m = useMax ? members[members.length - 1] : members[0];
          const sc = e.value[m];
          delete e.value[m];
          if (!Object.keys(e.value).length) delEntry(db, k); else setEntry(db, k, e);
          return formatArray([k, m, String(sc)]);
        }
        if (opts && opts.blockProbe) return REDIS_BLOCK_PENDING;
        return replyNil();
      }

      // set
      if (name === 'SADD') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'sadd\' command');
        const key = args[1];
        let e = getEntry(db, key);
        if (!e) e = { type: 'set', value: {}, expireAt: null };
        const err = ensureType(e, 'set');
        if (err) return replyErr(err);
        let added = 0;
        for (const v of args.slice(2).map(String)) {
          if (!e.value[v]) { e.value[v] = 1; added++; }
        }
        setEntry(db, key, e);
        return replyInt(added);
      }
      if (name === 'SREM') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'srem\' command');
        const key = args[1];
        const e = getEntry(db, key);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'set');
        if (err) return replyErr(err);
        let removed = 0;
        for (const v of args.slice(2).map(String)) {
          if (e.value[v]) { delete e.value[v]; removed++; }
        }
        if (Object.keys(e.value).length === 0) delEntry(db, key);
        else setEntry(db, key, e);
        return replyInt(removed);
      }
      if (name === 'SMEMBERS') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'smembers\' command');
        const e = getEntry(db, args[1]);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'set');
        if (err) return replyErr(err);
        return formatArray(Object.keys(e.value));
      }
      if (name === 'SCARD') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'scard\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'set');
        if (err) return replyErr(err);
        return replyInt(Object.keys(e.value || {}).length);
      }
      if (name === 'SISMEMBER') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'sismember\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'set');
        if (err) return replyErr(err);
        return replyInt(e.value && e.value[args[2]] ? 1 : 0);
      }
      if (name === 'SMISMEMBER') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'smismember\' command');
        const e = getEntry(db, args[1]);
        const bits = [];
        for (const m of args.slice(2)) {
          if (!e) { bits.push('0'); continue; }
          const err = ensureType(e, 'set');
          if (err) return replyErr(err);
          bits.push(e.value && e.value[m] ? '1' : '0');
        }
        return formatArray(bits);
      }
      if (name === 'SPOP') {
        if (args.length < 2 || args.length > 3) return replyErr('ERR wrong number of arguments for \'spop\' command');
        const key = args[1];
        const e = getEntry(db, key);
        if (!e) return replyNil();
        const err = ensureType(e, 'set');
        if (err) return replyErr(err);
        const members = Object.keys(e.value || {});
        if (!members.length) return replyNil();
        const count = args[2] != null ? Number(args[2]) : 1;
        if (args[2] != null && (!Number.isInteger(count) || count < 0)) return replyErr('ERR value is out of range');
        if (args[2] == null) {
          const pick = members[Math.floor(Math.random() * members.length)];
          delete e.value[pick];
          if (!Object.keys(e.value).length) delEntry(db, key); else setEntry(db, key, e);
          return replyStr(pick);
        }
        if (count === 0) return '(empty array)\n';
        const out = [];
        for (let i = 0; i < count && Object.keys(e.value).length; i++) {
          const ms = Object.keys(e.value);
          const pick = ms[Math.floor(Math.random() * ms.length)];
          out.push(pick);
          delete e.value[pick];
        }
        if (!Object.keys(e.value).length) delEntry(db, key); else setEntry(db, key, e);
        return formatArray(out);
      }
      if (name === 'SRANDMEMBER') {
        if (args.length < 2 || args.length > 3) return replyErr('ERR wrong number of arguments for \'srandmember\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyNil();
        const err = ensureType(e, 'set');
        if (err) return replyErr(err);
        const members = Object.keys(e.value || {});
        if (!members.length) return replyNil();
        if (args[2] == null) return replyStr(members[Math.floor(Math.random() * members.length)]);
        const count = Number(args[2]);
        if (!Number.isInteger(count)) return replyErr('ERR value is not an integer or out of range');
        if (count >= 0) {
          const shuffled = members.slice().sort(() => Math.random() - 0.5);
          return formatArray(shuffled.slice(0, Math.min(count, members.length)));
        }
        const out = [];
        for (let i = 0; i < -count; i++) out.push(members[Math.floor(Math.random() * members.length)]);
        return formatArray(out);
      }
      if (name === 'SMOVE') {
        if (args.length !== 4) return replyErr('ERR wrong number of arguments for \'smove\' command');
        const src = args[1];
        const dst = args[2];
        const member = String(args[3]);
        const se = getEntry(db, src);
        if (!se) return replyInt(0);
        const err = ensureType(se, 'set');
        if (err) return replyErr(err);
        if (!se.value[member]) return replyInt(0);
        delete se.value[member];
        if (!Object.keys(se.value).length) delEntry(db, src); else setEntry(db, src, se);
        let de = getEntry(db, dst);
        if (!de) de = { type: 'set', value: {}, expireAt: null };
        const err2 = ensureType(de, 'set');
        if (err2) return replyErr(err2);
        de.value[member] = 1;
        setEntry(db, dst, de);
        return replyInt(1);
      }
      if (name === 'SINTERCARD') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'sintercard\' command');
        const numkeys = Number(args[1]);
        if (!Number.isInteger(numkeys) || numkeys <= 0) return replyErr('ERR value is not an integer or out of range');
        if (args.length < 2 + numkeys) return replyErr('ERR syntax error');
        const keys = args.slice(2, 2 + numkeys).map(String);
        let idx = 2 + numkeys;
        let lim = null;
        if (idx < args.length) {
          if (String(args[idx]).toUpperCase() !== 'LIMIT' || idx + 1 >= args.length) return replyErr('ERR syntax error');
          lim = Number(args[idx + 1]);
          if (!Number.isInteger(lim) || lim < 0) return replyErr('ERR value is not an integer or out of range');
        }
        const sets = keys.map(k => {
          const e = getEntry(db, k);
          if (!e) return new Set();
          const er = ensureType(e, 'set');
          if (er) return { err: er };
          return new Set(Object.keys(e.value || {}));
        });
        for (const s of sets) if (s && s.err) return replyErr(s.err);
        let inter = null;
        for (const s of sets) {
          if (inter == null) inter = new Set(s);
          else inter = new Set([...inter].filter(x => s.has(x)));
        }
        let n = inter ? inter.size : 0;
        if (lim != null) n = Math.min(n, lim);
        return replyInt(n);
      }

      // zset (minimal)
      if (name === 'ZADD') {
        if (args.length < 4 || (args.length - 2) % 2 !== 0) return replyErr('ERR wrong number of arguments for \'zadd\' command');
        const key = args[1];
        let e = getEntry(db, key);
        if (!e) e = { type: 'zset', value: {}, expireAt: null };
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        let added = 0;
        for (let i = 2; i < args.length; i += 2) {
          const score = Number(args[i]);
          const member = String(args[i + 1]);
          if (!Number.isFinite(score)) return replyErr('ERR value is not a valid float');
          if (!Object.prototype.hasOwnProperty.call(e.value, member)) added++;
          e.value[member] = score;
        }
        setEntry(db, key, e);
        return replyInt(added);
      }
      if (name === 'ZREM') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'zrem\' command');
        const key = args[1];
        const e = getEntry(db, key);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        let removed = 0;
        for (const m of args.slice(2).map(String)) {
          if (Object.prototype.hasOwnProperty.call(e.value, m)) { delete e.value[m]; removed++; }
        }
        if (Object.keys(e.value).length === 0) delEntry(db, key);
        else setEntry(db, key, e);
        return replyInt(removed);
      }
      if (name === 'ZRANGE') {
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'zrange\' command');
        const key = args[1];
        const e = getEntry(db, key);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        let start = Number(args[2]);
        let stop = Number(args[3]);
        if (!Number.isInteger(start) || !Number.isInteger(stop)) return replyErr('ERR value is not an integer or out of range');
        const withScores = args.slice(4).map(a => a.toUpperCase()).includes('WITHSCORES');
        const members = Object.keys(e.value).sort((a, b) => (e.value[a] - e.value[b]) || (a < b ? -1 : 1));
        const len = members.length;
        if (start < 0) start = len + start;
        if (stop < 0) stop = len + stop;
        start = Math.max(0, start);
        stop = Math.min(len - 1, stop);
        if (stop < start || len === 0) return '(empty array)\n';
        const slice = members.slice(start, stop + 1);
        if (!withScores) return formatArray(slice);
        const out = [];
        for (const m of slice) { out.push(m); out.push(String(e.value[m])); }
        return formatArray(out);
      }

      if (name === 'ZREVRANGE') {
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'zrevrange\' command');
        const key = args[1];
        const e = getEntry(db, key);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        let start = Number(args[2]);
        let stop = Number(args[3]);
        if (!Number.isInteger(start) || !Number.isInteger(stop)) return replyErr('ERR value is not an integer or out of range');
        const withScores = args.slice(4).map(a => String(a).toUpperCase()).includes('WITHSCORES');
        const members = Object.keys(e.value).sort((a, b) => (e.value[b] - e.value[a]) || (a < b ? -1 : 1));
        const len = members.length;
        if (start < 0) start = len + start;
        if (stop < 0) stop = len + stop;
        start = Math.max(0, start);
        stop = Math.min(len - 1, stop);
        if (stop < start || len === 0) return '(empty array)\n';
        const slice = members.slice(start, stop + 1);
        if (!withScores) return formatArray(slice);
        const out = [];
        for (const m of slice) { out.push(m); out.push(String(e.value[m])); }
        return formatArray(out);
      }
      if (name === 'ZRANGEWITHSCORES') {
        if (args.length !== 4) return replyErr('ERR wrong number of arguments for \'zrangewithscores\' command');
        return cmd(`ZRANGE ${quoteItem(args[1])} ${args[2]} ${args[3]} WITHSCORES`, true);
      }
      if (name === 'ZRANGESTORE') {
        if (args.length < 5) return replyErr('ERR wrong number of arguments for \'zrangestore\' command');
        const dest = String(args[1]);
        const src = String(args[2]);
        let start = Number(args[3]);
        let stop = Number(args[4]);
        if (!Number.isInteger(start) || !Number.isInteger(stop)) return replyErr('ERR value is not an integer or out of range');
        const rev = args.slice(5).map(a => String(a).toUpperCase()).includes('REV');
        const withScores = args.slice(5).map(a => String(a).toUpperCase()).includes('WITHSCORES');
        const e = getEntry(db, src);
        if (!e) { delEntry(db, dest); return replyInt(0); }
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        const members = Object.keys(e.value).sort((a, b) => {
          const da = e.value[a]; const dbv = e.value[b];
          if (rev) return (dbv - da) || (a < b ? -1 : 1);
          return (da - dbv) || (a < b ? -1 : 1);
        });
        const len = members.length;
        if (start < 0) start = len + start;
        if (stop < 0) stop = len + stop;
        start = Math.max(0, start);
        stop = Math.min(len - 1, stop);
        if (stop < start || len === 0) {
          delEntry(db, dest);
          return replyInt(0);
        }
        const slice = members.slice(start, stop + 1);
        const out = {};
        for (const m of slice) out[m] = e.value[m];
        setEntry(db, dest, { type: 'zset', value: out, expireAt: null });
        return replyInt(slice.length);
      }
      if (name === 'ZRANGEBYLEX') {
        // lex range across members, requires same score (Redis assumes same score for all elements)
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'zrangebylex\' command');
        const key = args[1];
        const e = getEntry(db, key);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        // enforce same-score constraint (learning: strict to avoid misleading results)
        const scoreVals = Object.values(e.value || {});
        const distinct = {};
        for (const s of scoreVals) distinct[String(s)] = 1;
        if (Object.keys(distinct).length > 1) {
          return replyErr('ERR ZRANGEBYLEX requires all elements to have the same score');
        }
        const parseBound = (b) => {
          const s = String(b);
          if (s === '-') return { t: 'min' };
          if (s === '+') return { t: 'max' };
          const inclusive = s.startsWith('[');
          const exclusive = s.startsWith('(');
          const v = (inclusive || exclusive) ? s.slice(1) : s;
          return { t: 'val', inclusive, exclusive, v };
        };
        const minB = parseBound(args[2]);
        const maxB = parseBound(args[3]);
        let offset = 0;
        let count = null;
        for (let i = 4; i < args.length; i++) {
          const opt = String(args[i]).toUpperCase();
          if (opt === 'LIMIT' && i + 2 < args.length) { offset = Number(args[++i]); count = Number(args[++i]); continue; }
          return replyErr('ERR syntax error');
        }
        const members = Object.keys(e.value).sort((a, b) => a.localeCompare(b));
        const inMin = (m) => {
          if (minB.t === 'min') return true;
          if (minB.exclusive) return m > minB.v;
          if (minB.inclusive) return m >= minB.v;
          return m >= minB.v;
        };
        const inMax = (m) => {
          if (maxB.t === 'max') return true;
          if (maxB.exclusive) return m < maxB.v;
          if (maxB.inclusive) return m <= maxB.v;
          return m <= maxB.v;
        };
        let filtered = members.filter(m => inMin(m) && inMax(m));
        offset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
        filtered = filtered.slice(offset);
        if (count != null && Number.isFinite(count)) filtered = filtered.slice(0, Math.max(0, Math.floor(count)));
        return formatArray(filtered);
      }
      if (name === 'ZPOPMIN' || name === 'ZPOPMAX') {
        if (args.length < 2 || args.length > 3) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const key = args[1];
        const count = args[2] != null ? Number(args[2]) : 1;
        if (!Number.isInteger(count) || count < 0) return replyErr('ERR value is not an integer or out of range');
        const e = getEntry(db, key);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        const members = Object.keys(e.value).sort((a, b) => {
          const da = e.value[a], dbv = e.value[b];
          if (name === 'ZPOPMAX') return (dbv - da) || (a < b ? -1 : 1);
          return (da - dbv) || (a < b ? -1 : 1);
        });
        const slice = members.slice(0, count);
        const out = [];
        for (const m of slice) { out.push(m); out.push(String(e.value[m])); delete e.value[m]; }
        if (Object.keys(e.value).length === 0) delEntry(db, key);
        else setEntry(db, key, e);
        return formatArray(out);
      }
      if (name === 'ZUNIONSTORE' || name === 'ZINTERSTORE') {
        // Z*STORE dest numkeys key... [WEIGHTS ...] [AGGREGATE SUM|MIN|MAX]
        if (args.length < 4) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const dest = String(args[1]);
        const numkeys = Number(args[2]);
        if (!Number.isInteger(numkeys) || numkeys <= 0) return replyErr('ERR value is not an integer or out of range');
        if (args.length < 3 + numkeys) return replyErr('ERR syntax error');
        const keys = args.slice(3, 3 + numkeys).map(String);
        let idx = 3 + numkeys;
        let weights = Array.from({ length: numkeys }, () => 1);
        let aggregate = 'SUM';
        while (idx < args.length) {
          const opt = String(args[idx]).toUpperCase();
          if (opt === 'WEIGHTS') {
            if (idx + numkeys >= args.length) return replyErr('ERR syntax error');
            weights = args.slice(idx + 1, idx + 1 + numkeys).map(Number);
            if (weights.some(w => !Number.isFinite(w))) return replyErr('ERR weight value is not a float');
            idx += 1 + numkeys;
            continue;
          }
          if (opt === 'AGGREGATE' && idx + 1 < args.length) {
            aggregate = String(args[idx + 1]).toUpperCase();
            if (!['SUM', 'MIN', 'MAX'].includes(aggregate)) return replyErr('ERR syntax error');
            idx += 2;
            continue;
          }
          return replyErr('ERR syntax error');
        }
        const maps = [];
        for (let i = 0; i < keys.length; i++) {
          const e = getEntry(db, keys[i]);
          if (!e) { maps.push({}); continue; }
          const err = ensureType(e, 'zset');
          if (err) return replyErr(err);
          const m = {};
          for (const member of Object.keys(e.value || {})) {
            const s = Number(e.value[member]);
            if (Number.isFinite(s)) m[member] = s * weights[i];
          }
          maps.push(m);
        }
        const out = {};
        const all = {};
        maps.forEach(m => Object.keys(m).forEach(x => { all[x] = 1; }));
        for (const member of Object.keys(all)) {
          const vals = maps.map(m => (Object.prototype.hasOwnProperty.call(m, member) ? m[member] : null));
          if (name === 'ZINTERSTORE' && vals.some(v => v === null)) continue;
          let acc = null;
          for (const v of vals) {
            if (v === null) continue;
            if (acc == null) acc = v;
            else if (aggregate === 'SUM') acc += v;
            else if (aggregate === 'MIN') acc = Math.min(acc, v);
            else if (aggregate === 'MAX') acc = Math.max(acc, v);
          }
          if (acc != null) out[member] = acc;
        }
        setEntry(db, dest, { type: 'zset', value: out, expireAt: null });
        return replyInt(Object.keys(out).length);
      }
      if (name === 'ZINTER' || name === 'ZUNION') {
        if (args.length < 3) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const numkeys = Number(args[1]);
        if (!Number.isInteger(numkeys) || numkeys <= 0) return replyErr('ERR value is not an integer or out of range');
        if (args.length < 2 + numkeys) return replyErr('ERR syntax error');
        const keys = args.slice(2, 2 + numkeys).map(String);
        let idx = 2 + numkeys;
        let weights = Array.from({ length: numkeys }, () => 1);
        let aggregate = 'SUM';
        let withScores = false;
        while (idx < args.length) {
          const opt = String(args[idx]).toUpperCase();
          if (opt === 'WEIGHTS') {
            if (idx + numkeys >= args.length) return replyErr('ERR syntax error');
            weights = args.slice(idx + 1, idx + 1 + numkeys).map(Number);
            if (weights.some(w => !Number.isFinite(w))) return replyErr('ERR weight value is not a float');
            idx += 1 + numkeys;
            continue;
          }
          if (opt === 'AGGREGATE' && idx + 1 < args.length) {
            aggregate = String(args[idx + 1]).toUpperCase();
            if (!['SUM', 'MIN', 'MAX'].includes(aggregate)) return replyErr('ERR syntax error');
            idx += 2;
            continue;
          }
          if (opt === 'WITHSCORES') { withScores = true; idx++; continue; }
          return replyErr('ERR syntax error');
        }
        const maps = [];
        for (let i = 0; i < keys.length; i++) {
          const e = getEntry(db, keys[i]);
          if (!e) { maps.push({}); continue; }
          const err = ensureType(e, 'zset');
          if (err) return replyErr(err);
          const m = {};
          for (const member of Object.keys(e.value || {})) {
            const s = Number(e.value[member]);
            if (Number.isFinite(s)) m[member] = s * weights[i];
          }
          maps.push(m);
        }
        const out = {};
        const all = {};
        maps.forEach(m => Object.keys(m).forEach(x => { all[x] = 1; }));
        for (const member of Object.keys(all)) {
          const vals = maps.map(m => (Object.prototype.hasOwnProperty.call(m, member) ? m[member] : null));
          if (name === 'ZINTER' && vals.some(v => v === null)) continue;
          let acc = null;
          for (const v of vals) {
            if (v === null) continue;
            if (acc == null) acc = v;
            else if (aggregate === 'SUM') acc += v;
            else if (aggregate === 'MIN') acc = Math.min(acc, v);
            else if (aggregate === 'MAX') acc = Math.max(acc, v);
          }
          if (acc != null) out[member] = acc;
        }
        const sortedMembers = Object.keys(out).sort((a, b) => (out[a] - out[b]) || (a < b ? -1 : 1));
        if (!withScores) return formatArray(sortedMembers);
        const flat = [];
        for (const m of sortedMembers) { flat.push(m); flat.push(String(out[m])); }
        return formatArray(flat);
      }
      if (name === 'ZDIFF') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'zdiff\' command');
        const numkeys = Number(args[1]);
        if (!Number.isInteger(numkeys) || numkeys <= 0) return replyErr('ERR value is not an integer or out of range');
        if (args.length < 2 + numkeys) return replyErr('ERR syntax error');
        const keys = args.slice(2, 2 + numkeys).map(String);
        let idx = 2 + numkeys;
        let withScores = false;
        if (idx < args.length && String(args[idx]).toUpperCase() === 'WITHSCORES') withScores = true;
        const e0 = getEntry(db, keys[0]);
        if (!e0) return '(empty array)\n';
        const err0 = ensureType(e0, 'zset');
        if (err0) return replyErr(err0);
        const rest = new Set();
        for (let ki = 1; ki < keys.length; ki++) {
          const ek = getEntry(db, keys[ki]);
          if (!ek) continue;
          const err = ensureType(ek, 'zset');
          if (err) return replyErr(err);
          Object.keys(ek.value || {}).forEach(m => rest.add(m));
        }
        let members = Object.keys(e0.value).filter(m => !rest.has(m));
        members.sort((a, b) => (e0.value[a] - e0.value[b]) || (a < b ? -1 : 1));
        if (!withScores) return formatArray(members);
        const flat = [];
        for (const m of members) { flat.push(m); flat.push(String(e0.value[m])); }
        return formatArray(flat);
      }
      if (name === 'ZDIFFSTORE') {
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'zdiffstore\' command');
        const dest = String(args[1]);
        const numkeys = Number(args[2]);
        if (!Number.isInteger(numkeys) || numkeys <= 0) return replyErr('ERR value is not an integer or out of range');
        if (args.length < 3 + numkeys) return replyErr('ERR syntax error');
        const keys = args.slice(3, 3 + numkeys).map(String);
        const e0 = getEntry(db, keys[0]);
        if (!e0) { delEntry(db, dest); return replyInt(0); }
        const err0 = ensureType(e0, 'zset');
        if (err0) return replyErr(err0);
        const rest = new Set();
        for (let ki = 1; ki < keys.length; ki++) {
          const ek = getEntry(db, keys[ki]);
          if (!ek) continue;
          const err = ensureType(ek, 'zset');
          if (err) return replyErr(err);
          Object.keys(ek.value || {}).forEach(m => rest.add(m));
        }
        const out = {};
        for (const m of Object.keys(e0.value)) {
          if (!rest.has(m)) out[m] = e0.value[m];
        }
        if (!Object.keys(out).length) delEntry(db, dest);
        else setEntry(db, dest, { type: 'zset', value: out, expireAt: null });
        return replyInt(Object.keys(out).length);
      }
      if (name === 'ZINTERCARD') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'zintercard\' command');
        const numkeys = Number(args[1]);
        if (!Number.isInteger(numkeys) || numkeys <= 0) return replyErr('ERR value is not an integer or out of range');
        if (args.length < 2 + numkeys) return replyErr('ERR syntax error');
        const keys = args.slice(2, 2 + numkeys).map(String);
        let idx = 2 + numkeys;
        let lim = null;
        if (idx < args.length) {
          if (String(args[idx]).toUpperCase() !== 'LIMIT' || idx + 1 >= args.length) return replyErr('ERR syntax error');
          lim = Number(args[idx + 1]);
          if (!Number.isInteger(lim) || lim < 0) return replyErr('ERR value is not an integer or out of range');
        }
        const sets = keys.map(k => {
          const e = getEntry(db, k);
          if (!e) return new Set();
          const err = ensureType(e, 'zset');
          if (err) return { err };
          return new Set(Object.keys(e.value || {}));
        });
        for (const s of sets) if (s && s.err) return replyErr(s.err);
        let inter = null;
        for (const s of sets) {
          if (inter == null) inter = new Set(s);
          else inter = new Set([...inter].filter(x => s.has(x)));
        }
        let n = inter ? inter.size : 0;
        if (lim != null) n = Math.min(n, lim);
        return replyInt(n);
      }

      if (name === 'KEYS') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'keys\' command');
        const re = globToRegExp(args[1]);
        const keys = Object.keys(db.keys || {}).filter(k => re.test(k));
        return formatArray(keys);
      }

      if (name === 'SCAN') {
        // SCAN cursor [MATCH pattern] [COUNT count]
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'scan\' command');
        let cursor = Number(args[1]);
        if (!Number.isInteger(cursor) || cursor < 0) cursor = 0;
        let match = '*';
        let count = 10;
        for (let i = 2; i < args.length; i++) {
          const opt = String(args[i] || '').toUpperCase();
          if (opt === 'MATCH' && i + 1 < args.length) match = String(args[++i]);
          else if (opt === 'COUNT' && i + 1 < args.length) count = Number(args[++i]);
          else return replyErr('ERR syntax error');
        }
        if (!Number.isFinite(count) || count <= 0) count = 10;
        const re = globToRegExp(match);
        const allKeys = Object.keys(db.keys || {}).filter(k => re.test(k));
        const slice = allKeys.slice(cursor, cursor + count);
        const next = (cursor + count) >= allKeys.length ? 0 : (cursor + count);
        let out = '';
        out += `1) "${next}"\n`;
        if (!slice.length) out += '2) (empty array)\n';
        else {
          out += '2) ' + '\n';
          for (let i = 0; i < slice.length; i++) {
            out += `   ${i + 1}) ${quoteItem(slice[i])}\n`;
          }
        }
        return out;
      }

      // SCAN family: SSCAN/HSCAN/ZSCAN
      if (name === 'SSCAN') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'sscan\' command');
        const key = args[1];
        const cursor = args[2];
        let match = '*';
        let count = 10;
        for (let i = 3; i < args.length; i++) {
          const opt = String(args[i] || '').toUpperCase();
          if (opt === 'MATCH' && i + 1 < args.length) match = String(args[++i]);
          else if (opt === 'COUNT' && i + 1 < args.length) count = Number(args[++i]);
          else return replyErr('ERR syntax error');
        }
        const e = getEntry(db, key);
        if (!e) return `1) "0"\n2) (empty array)\n`;
        const err = ensureType(e, 'set');
        if (err) return replyErr(err);
        const re = globToRegExp(match);
        const items = Object.keys(e.value || {}).filter(v => re.test(v));
        const { next, slice } = scanSlice(items, cursor, count);
        let out = `1) "${next}"\n`;
        if (!slice.length) out += '2) (empty array)\n';
        else {
          out += '2) \n';
          for (let i = 0; i < slice.length; i++) out += `   ${i + 1}) ${quoteItem(slice[i])}\n`;
        }
        return out;
      }
      if (name === 'HSCAN') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'hscan\' command');
        const key = args[1];
        const cursor = args[2];
        let match = '*';
        let count = 10;
        for (let i = 3; i < args.length; i++) {
          const opt = String(args[i] || '').toUpperCase();
          if (opt === 'MATCH' && i + 1 < args.length) match = String(args[++i]);
          else if (opt === 'COUNT' && i + 1 < args.length) count = Number(args[++i]);
          else return replyErr('ERR syntax error');
        }
        const e = getEntry(db, key);
        if (!e) return `1) "0"\n2) (empty array)\n`;
        const err = ensureType(e, 'hash');
        if (err) return replyErr(err);
        const re = globToRegExp(match);
        const fields = Object.keys(e.value || {}).filter(f => re.test(f));
        const { next, slice } = scanSlice(fields, cursor, count);
        let out = `1) "${next}"\n`;
        if (!slice.length) out += '2) (empty array)\n';
        else {
          out += '2) \n';
          let idx2 = 1;
          for (const f of slice) {
            out += `   ${idx2++}) ${quoteItem(f)}\n`;
            out += `   ${idx2++}) ${quoteItem(String(e.value[f]))}\n`;
          }
        }
        return out;
      }
      if (name === 'ZSCAN') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'zscan\' command');
        const key = args[1];
        const cursor = args[2];
        let match = '*';
        let count = 10;
        for (let i = 3; i < args.length; i++) {
          const opt = String(args[i] || '').toUpperCase();
          if (opt === 'MATCH' && i + 1 < args.length) match = String(args[++i]);
          else if (opt === 'COUNT' && i + 1 < args.length) count = Number(args[++i]);
          else return replyErr('ERR syntax error');
        }
        const e = getEntry(db, key);
        if (!e) return `1) "0"\n2) (empty array)\n`;
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        const re = globToRegExp(match);
        const members = Object.keys(e.value || {}).filter(m => re.test(m));
        const { next, slice } = scanSlice(members, cursor, count);
        let out = `1) "${next}"\n`;
        if (!slice.length) out += '2) (empty array)\n';
        else {
          out += '2) \n';
          let idx2 = 1;
          for (const m of slice) {
            out += `   ${idx2++}) ${quoteItem(m)}\n`;
            out += `   ${idx2++}) ${quoteItem(String(e.value[m]))}\n`;
          }
        }
        return out;
      }

      // Set operations: SINTER/SUNION/SDIFF + STORE
      if (name === 'SINTER' || name === 'SUNION' || name === 'SDIFF' || name === 'SINTERSTORE' || name === 'SUNIONSTORE' || name === 'SDIFFSTORE') {
        const isStore = name.endsWith('STORE');
        const keys = isStore ? args.slice(2) : args.slice(1);
        const dest = isStore ? args[1] : null;
        if ((isStore && args.length < 4) || (!isStore && args.length < 2)) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const sets = [];
        for (const k of keys) {
          const e = getEntry(db, k);
          if (!e) { sets.push([]); continue; }
          const err = ensureType(e, 'set');
          if (err) return replyErr(err);
          sets.push(Object.keys(e.value || {}));
        }
        let result = [];
        if (name.startsWith('SINTER')) {
          result = sets.reduce((acc, cur) => acc.filter(v => cur.includes(v)), sets[0] || []);
        } else if (name.startsWith('SUNION')) {
          const u = {};
          sets.forEach(arr => arr.forEach(v => { u[v] = 1; }));
          result = Object.keys(u);
        } else if (name.startsWith('SDIFF')) {
          const base = sets[0] || [];
          const rest = {};
          sets.slice(1).forEach(arr => arr.forEach(v => { rest[v] = 1; }));
          result = base.filter(v => !rest[v]);
        }
        if (isStore) {
          setEntry(db, dest, { type: 'set', value: setFromArray(result), expireAt: null });
          return replyInt(result.length);
        }
        return formatArray(result);
      }

      // ZSET common suite
      if (name === 'ZCARD') {
        if (args.length !== 2) return replyErr('ERR wrong number of arguments for \'zcard\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        return replyInt(Object.keys(e.value || {}).length);
      }
      if (name === 'ZSCORE') {
        if (args.length !== 3) return replyErr('ERR wrong number of arguments for \'zscore\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyNil();
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        const s = e.value && Object.prototype.hasOwnProperty.call(e.value, args[2]) ? e.value[args[2]] : null;
        return s == null ? replyNil() : replyStr(String(s));
      }
      if (name === 'ZMSCORE') {
        if (args.length < 3) return replyErr('ERR wrong number of arguments for \'zmscore\' command');
        const e = getEntry(db, args[1]);
        const arr = [];
        for (const m of args.slice(2)) {
          if (!e) { arr.push(null); continue; }
          const err = ensureType(e, 'zset');
          if (err) return replyErr(err);
          arr.push(Object.prototype.hasOwnProperty.call(e.value, m) ? String(e.value[m]) : null);
        }
        return formatArray(arr);
      }
      if (name === 'ZRANK' || name === 'ZREVRANK') {
        if (args.length !== 3) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const e = getEntry(db, args[1]);
        if (!e) return replyNil();
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        const members = zsetSorted(e, name === 'ZREVRANK');
        const idx = members.indexOf(String(args[2]));
        return idx < 0 ? replyNil() : replyInt(idx);
      }
      if (name === 'ZINCRBY') {
        if (args.length !== 4) return replyErr('ERR wrong number of arguments for \'zincrby\' command');
        const key = args[1];
        const inc = Number(args[2]);
        const member = String(args[3]);
        if (!Number.isFinite(inc)) return replyErr('ERR value is not a valid float');
        let e = getEntry(db, key);
        if (!e) e = { type: 'zset', value: {}, expireAt: null };
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        const cur = Number(e.value[member] ?? 0);
        const next = cur + inc;
        e.value[member] = next;
        setEntry(db, key, e);
        return replyStr(String(next));
      }
      if (name === 'ZCOUNT') {
        if (args.length !== 4) return replyErr('ERR wrong number of arguments for \'zcount\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        const min = Number(args[2]);
        const max = Number(args[3]);
        if (!Number.isFinite(min) || !Number.isFinite(max)) return replyErr('ERR value is not a valid float');
        let cnt = 0;
        for (const m of Object.keys(e.value || {})) {
          const s = Number(e.value[m]);
          if (s >= min && s <= max) cnt++;
        }
        return replyInt(cnt);
      }
      if (name === 'ZLEXCOUNT') {
        if (args.length !== 4) return replyErr('ERR wrong number of arguments for \'zlexcount\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyInt(0);
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        const scoreVals = Object.values(e.value || {});
        const distinct = {};
        for (const s of scoreVals) distinct[String(s)] = 1;
        if (Object.keys(distinct).length > 1) {
          return replyErr('ERR ZLEXCOUNT requires all elements to have the same score');
        }
        const parseBound = (b) => {
          const s = String(b);
          if (s === '-') return { t: 'min' };
          if (s === '+') return { t: 'max' };
          const inclusive = s.startsWith('[');
          const exclusive = s.startsWith('(');
          const v = (inclusive || exclusive) ? s.slice(1) : s;
          return { t: 'val', inclusive, exclusive, v };
        };
        const minB = parseBound(args[2]);
        const maxB = parseBound(args[3]);
        const members = Object.keys(e.value).sort((a, b) => a.localeCompare(b));
        const inMin = (m) => {
          if (minB.t === 'min') return true;
          if (minB.exclusive) return m > minB.v;
          if (minB.inclusive) return m >= minB.v;
          return m >= minB.v;
        };
        const inMax = (m) => {
          if (maxB.t === 'max') return true;
          if (maxB.exclusive) return m < maxB.v;
          if (maxB.inclusive) return m <= maxB.v;
          return m <= maxB.v;
        };
        return replyInt(members.filter(m => inMin(m) && inMax(m)).length);
      }
      if (name === 'ZRANDMEMBER') {
        if (args.length < 2 || args.length > 4) return replyErr('ERR wrong number of arguments for \'zrandmember\' command');
        const e = getEntry(db, args[1]);
        if (!e) return replyNil();
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        const members = Object.keys(e.value || {});
        if (!members.length) return replyNil();
        let count = 1;
        let withScores = false;
        if (args[2] != null) {
          if (String(args[2]).toUpperCase() === 'WITHSCORES') withScores = true;
          else {
            count = Number(args[2]);
            if (!Number.isInteger(count)) return replyErr('ERR value is not an integer or out of range');
            if (String(args[3] || '').toUpperCase() === 'WITHSCORES') withScores = true;
          }
        }
        const shuffled = members.slice().sort(() => Math.random() - 0.5);
        const take = shuffled.slice(0, Math.max(0, count));
        if (count === 1 && !withScores) return replyStr(take[0] || members[0]);
        if (!withScores) return formatArray(take);
        const out = [];
        for (const m of take) { out.push(m); out.push(String(e.value[m])); }
        return formatArray(out);
      }
      if (name === 'ZRANGEBYSCORE' || name === 'ZREVRANGEBYSCORE') {
        // ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT offset count]
        if (args.length < 4) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        const key = args[1];
        const e = getEntry(db, key);
        if (!e) return '(empty array)\n';
        const err = ensureType(e, 'zset');
        if (err) return replyErr(err);
        const min = Number(args[2]);
        const max = Number(args[3]);
        if (!Number.isFinite(min) || !Number.isFinite(max)) return replyErr('ERR value is not a valid float');
        let withScores = false;
        let offset = 0;
        let count = null;
        for (let i = 4; i < args.length; i++) {
          const opt = String(args[i] || '').toUpperCase();
          if (opt === 'WITHSCORES') withScores = true;
          else if (opt === 'LIMIT' && i + 2 < args.length) {
            offset = Number(args[++i]);
            count = Number(args[++i]);
          } else return replyErr('ERR syntax error');
        }
        const members = zsetSorted(e, name === 'ZREVRANGEBYSCORE');
        const filtered = members.filter(m => {
          const s = Number(e.value[m]);
          return s >= min && s <= max;
        });
        const off = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
        let slice = filtered.slice(off);
        if (count != null && Number.isFinite(count)) slice = slice.slice(0, Math.max(0, Math.floor(count)));
        if (!withScores) return formatArray(slice);
        const out = [];
        for (const m of slice) { out.push(m); out.push(String(e.value[m])); }
        return formatArray(out);
      }

      // SORT (learning): SORT key [BY pattern] [LIMIT off count] [GET pattern [GET pattern ...]] [ASC|DESC] [ALPHA] [STORE dest]
      if (name === 'SORT_RO') {
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'sort_ro\' command');
        for (let i = 2; i < args.length; i++) {
          if (String(args[i]).toUpperCase() === 'STORE') return replyErr('ERR SORT_RO cannot be used with STORE');
        }
        const parts = args.slice(1).map(a => (/\s/.test(String(a)) ? quoteItem(a) : String(a)));
        return cmd('SORT ' + parts.join(' '), true);
      }
      if (name === 'SORT') {
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'sort\' command');
        const key = args[1];
        const e = getEntry(db, key);
        if (!e) return '(empty array)\n';
        let desc = false;
        let alpha = false;
        let offset = 0;
        let count = null;
        let store = null;
        let by = null;
        const gets = [];
        for (let i = 2; i < args.length; i++) {
          const opt = String(args[i] || '').toUpperCase();
          if (opt === 'ASC') desc = false;
          else if (opt === 'DESC') desc = true;
          else if (opt === 'ALPHA') alpha = true;
          else if (opt === 'LIMIT' && i + 2 < args.length) { offset = Number(args[++i]); count = Number(args[++i]); }
          else if (opt === 'BY' && i + 1 < args.length) { by = String(args[++i]); }
          else if (opt === 'GET' && i + 1 < args.length) { gets.push(String(args[++i])); }
          else if (opt === 'STORE' && i + 1 < args.length) { store = String(args[++i]); }
          else return replyErr('ERR syntax error');
        }
        let values = [];
        if (e.type === 'list') values = (e.value || []).slice();
        else if (e.type === 'set') values = Object.keys(e.value || {});
        else return replyErr('WRONGTYPE Operation against a key holding the wrong kind of value');
        const resolvePattern = (pattern, v) => String(pattern).replace(/\*/g, String(v));
        const resolveLookup = (pattern, v) => {
          if (pattern === '#') return String(v);
          const p = resolvePattern(pattern, v);
          const m = p.match(/^(.*)->(.+)$/);
          if (m) {
            const base = m[1];
            const field = m[2];
            const he = getEntry(db, base);
            if (!he) return null;
            if (he.type === 'hash') return (he.value && Object.prototype.hasOwnProperty.call(he.value, field)) ? String(he.value[field]) : null;
            return null;
          }
          const se = getEntry(db, p);
          if (!se) return null;
          if (se.type === 'string') return String(se.value);
          return null;
        };
        let sorted = values.slice();
        if (by && by.toLowerCase() !== 'nosort') {
          sorted.sort((a, b) => {
            const av = resolveLookup(by, a);
            const bv = resolveLookup(by, b);
            if (alpha) return String(av ?? '').localeCompare(String(bv ?? '')) || String(a).localeCompare(String(b));
            return (Number(av) - Number(bv)) || String(a).localeCompare(String(b));
          });
          if (desc) sorted.reverse();
        } else {
          sorted = sortValues(sorted, alpha, desc);
        }
        const off = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
        let sliced = sorted.slice(off);
        if (count != null && Number.isFinite(count)) sliced = sliced.slice(0, Math.max(0, Math.floor(count)));
        const outVals = [];
        if (!gets.length) {
          sliced.forEach(v => outVals.push(String(v)));
        } else {
          for (const v of sliced) {
            for (const g of gets) outVals.push(resolveLookup(g, v));
          }
        }
        if (store) {
          setEntry(db, store, { type: 'list', value: outVals.map(x => (x == null ? '' : String(x))), expireAt: null });
          return replyInt(outVals.length);
        }
        return formatArray(outVals);
      }

      // Redis Stack / 模块（学习壳：JSON 用 string 存整段；Search 仅占位）
      if (name === 'JSON.SET') {
        if (args.length < 4) return replyErr('ERR wrong number of arguments for \'json.set\' command');
        const path = String(args[2]);
        const val = args.slice(3).join(' ');
        if (path !== '$') return replyErr('ERR learning JSON.SET: only path "$" is supported');
        try { JSON.parse(val); } catch (_) { return replyErr('ERR invalid JSON'); }
        setEntry(db, args[1], { type: 'string', value: val, expireAt: null });
        return replyOk();
      }
      if (name === 'JSON.GET') {
        if (args.length < 2 || args.length > 3) return replyErr('ERR wrong number of arguments for \'json.get\' command');
        const path = args[2] != null ? String(args[2]) : '$';
        if (path !== '$') return replyErr('ERR learning JSON.GET: only path "$" is supported');
        const e = getEntry(db, args[1]);
        if (!e) return replyNil();
        const err = ensureType(e, 'string');
        if (err) return replyErr(err);
        return replyStr(e.value);
      }
      if (name === 'JSON.DEL' || name === 'JSON.FORGET') {
        if (args.length < 2) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        return replyInt(delEntry(db, args[1]) ? 1 : 0);
      }
      if (name === 'JSON.MGET') {
        if (args.length < 2) return replyErr('ERR wrong number of arguments for \'json.mget\' command');
        const arr = [];
        for (const k of args.slice(1)) {
          const e = getEntry(db, k);
          if (!e) { arr.push(null); continue; }
          const err = ensureType(e, 'string');
          if (err) arr.push(null);
          else arr.push(e.value);
        }
        return formatArray(arr.map(v => (v == null ? null : String(v))));
      }
      if (name === 'FT.CREATE' || name === 'FT.DROPINDEX' || name === 'FT.ALTER') return replyOk();
      if (name === 'FT.SEARCH' || name === 'FT.AGGREGATE') {
        if (args.length < 3) return replyErr(`ERR wrong number of arguments for \'${name.toLowerCase()}\' command`);
        return '(empty array)\n';
      }
      if (name.startsWith('JSON.') || name.startsWith('FT.') || name.startsWith('SEARCH.')) {
        return replyErr(`ERR unknown subcommand or wrong number of arguments for '${name.toLowerCase()}'`);
      }

      return replyErr(`ERR unknown command '${args[0]}'`);
    }

    // greeting（走多语言，不写死英文）
    append(tr('redisCliGreeting', 'redis-cli (Star OS)') + '\n');
    append(tr('redisCliHelpHint', '输入 "PING" 或 "HELP" 查看帮助。') + '\n\n');
    setPrompt();

    // pub/sub print
    pubsub.onMessage((channel, message) => {
      // redis-cli subscribe message output style（简化）
      append(`\n1) "message"\n2) "${String(channel).replace(/"/g, '\\"')}"\n3) "${String(message).replace(/"/g, '\\"')}"\n`);
      if (input) { try { input.focus(); } catch (_) {} }
    });
    pubsub.onShardMessage((shard, message) => {
      append(`\n1) "smessage"\n2) "${String(shard).replace(/"/g, '\\"')}"\n3) "${String(message).replace(/"/g, '\\"')}"\n`);
      if (input) { try { input.focus(); } catch (_) {} }
    });

    const REDIS_BLOCKING_CMDS = new Set(['BLPOP', 'BRPOP', 'BRPOPLPUSH', 'BLMOVE', 'BLMPOP', 'BZPOPMIN', 'BZPOPMAX', 'BZMPOP']);
    function redisCliIsBlockingCommand(line) {
      const a = parseArgs(line);
      return a.length > 0 && REDIS_BLOCKING_CMDS.has(a[0].toUpperCase());
    }
    function redisCliBlockingTimeoutMs(line) {
      const a = parseArgs(line);
      if (a.length < 2) return 0;
      const n = a[0].toUpperCase();
      let t = 0;
      if (n === 'BLPOP' || n === 'BRPOP' || n === 'BZPOPMIN' || n === 'BZPOPMAX') t = Number(a[a.length - 1]);
      else if (n === 'BRPOPLPUSH') t = Number(a[3]);
      else if (n === 'BLMOVE') t = Number(a[5]);
      else if (n === 'BLMPOP' || n === 'BZMPOP') t = Number(a[1]);
      if (!Number.isInteger(t) || t < 0) return 0;
      return Math.min(t, 60000);
    }

    function handleLine(line) {
      const trimmed = String(line || '').trim();
      if (!trimmed) return;
      append(`${promptEl ? promptEl.textContent : ''} ${trimmed}\n`);
      if (redisCliIsBlockingCommand(trimmed) && !tx.inMulti) {
        const waitMs = redisCliBlockingTimeoutMs(trimmed);
        const pollEvery = 50;
        const deadline = Date.now() + waitMs;
        const finishBlocking = () => {
          if (input) {
            input.disabled = false;
            try { input.focus(); } catch (_) {}
          }
        };
        const pollTick = () => {
          const r = cmd(trimmed, false, { blockProbe: true });
          if (r !== REDIS_BLOCK_PENDING) {
            append(r);
            finishBlocking();
            return;
          }
          if (Date.now() >= deadline) {
            append(replyNil());
            finishBlocking();
            return;
          }
          setTimeout(pollTick, pollEvery);
        };
        if (input) input.disabled = true;
        pollTick();
        return;
      }
      const res = cmd(trimmed, false, {});
      append(res);
      if (trimmed.toUpperCase() === 'QUIT' || trimmed.toUpperCase() === 'EXIT') {
        // just leave output; window can be closed normally
      }
    }

    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          handleLine(input.value);
          input.value = '';
        }
      });
      setTimeout(() => { try { input.focus(); } catch (_) {} }, 50);
    }
  },

  'linux-shell'(container) {
    if (!container) return;
    const output = container.querySelector('#linux-output');
    const input = container.querySelector('#linux-input');
    const promptEl = container.querySelector('#linux-prompt');

    const tr = (key, fallback) => {
      try {
        if (typeof t === 'function') {
          const v = t(key);
          return v === key ? fallback : v;
        }
      } catch (_) {}
      return fallback;
    };

    let captureBuf = null;
    function append(text) {
      if (captureBuf) {
        captureBuf.push(text);
        return;
      }
      if (!output) return;
      output.appendChild(document.createTextNode(text));
      output.scrollTop = output.scrollHeight;
    }
    function finishCapture() {
      if (!captureBuf) return undefined;
      const r = captureBuf.join('');
      captureBuf = null;
      return r;
    }
    function splitPipeline(line) {
      const s = String(line || '').trim();
      if (!s || !s.includes('|')) return [s];
      const parts = [];
      let cur = '';
      let inDbl = false;
      let inSgl = false;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === '"' && !inSgl) inDbl = !inDbl;
        else if (c === "'" && !inDbl) inSgl = !inSgl;
        else if ((c === '|') && !inDbl && !inSgl) {
          parts.push(cur.trim());
          cur = '';
          continue;
        }
        cur += c;
      }
      if (cur.trim()) parts.push(cur.trim());
      return parts;
    }

    // 非真实文件系统：用内存对象模拟一个 Linux 根目录
    const fs = {
      '/': { type: 'dir', children: {
        home: { type: 'dir', children: {
          star: { type: 'dir', children: {
            'readme.txt': { type: 'file', content: 'Welcome to Star OS Linux shell learning mode.\n这是一个学习版 Linux 终端，不会修改真实系统。\n' }
          } }
        } },
        etc: { type: 'dir', children: {} },
        var: { type: 'dir', children: {} },
        tmp: { type: 'dir', children: {} },
        usr: { type: 'dir', children: {} },
      } }
    };
    let cwd = '/home/star';
    let cmdHistory = [];
    let shellAliases = {};
    let dirStack = [];
    let shellVars = {};
    const shellReadonly = new Set();

    /** 模拟 journal / syslog（选项 A：与 logger、apt 等联动） */
    let simJournalLines = [];
    function simJournalPush(msg, unit) {
      simJournalLines.push({ ts: Date.now(), unit: unit || 'kernel', msg: String(msg || '') });
      if (simJournalLines.length > 800) simJournalLines.splice(0, simJournalLines.length - 800);
    }
    const simSysctl = {
      'net.ipv4.ip_forward': '0',
      'kernel.hostname': 'learn-linux',
      'vm.swappiness': '60'
    };
    const simPkgPool = [
      { n: 'curl', v: '8.0.1-1', desc: 'command line tool for transferring data' },
      { n: 'git', v: '2.40.0-1', desc: 'fast, scalable, distributed revision control' },
      { n: 'vim', v: '9.0.1378-2', desc: 'Vi IMproved' },
      { n: 'nginx', v: '1.22.1-9', desc: 'small, powerful, scalable web/proxy server' },
      { n: 'nodejs', v: '18.19.0+dfsg-1', desc: 'evented I/O for V8 javascript' },
      { n: 'python3', v: '3.11.2-1', desc: 'interactive high-level object-oriented language' },
      { n: 'docker.io', v: '24.0.5-1', desc: 'Linux container runtime' },
      { n: 'htop', v: '3.2.2-2', desc: 'interactive processes viewer' }
    ];
    let simPkgInstalled = new Map([
      ['bash', '5.2.15-2'],
      ['coreutils', '9.1-1'],
      ['dpkg', '1.21.22'],
      ['apt', '2.6.1'],
      ['libc6', '2.36-9+deb12u4']
    ]);
    const simPkgProtected = new Set(['bash', 'coreutils', 'dpkg', 'apt', 'libc6']);

    function initMeta(node) {
      if (!node || typeof node !== 'object') return;
      if (!node.meta) node.meta = {};
      if (!node.meta.owner) node.meta.owner = 'star';
      if (!node.meta.group) node.meta.group = 'star';
      if (!node.meta.mode) node.meta.mode = (node.type === 'dir') ? 'drwxr-xr-x' : '-rw-r--r--';
      if (!node.meta.mtime) node.meta.mtime = Date.now();
      if (node.type === 'dir' && node.children) {
        for (const k of Object.keys(node.children)) initMeta(node.children[k]);
      }
    }
    initMeta(fs['/']);

    function formatMtime(ms) {
      try {
        const d = new Date(ms);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const m = months[d.getMonth()] || 'Jan';
        const day = String(d.getDate()).padStart(2, ' ');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${m} ${day} ${hh}:${mm}`;
      } catch (_) {
        return 'Jan 01 00:00';
      }
    }
    function formatSize(bytes, human) {
      const b = Math.max(0, Number(bytes) || 0);
      if (!human) return String(b);
      const units = ['B','K','M','G','T'];
      let v = b;
      let u = 0;
      while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
      const s = (u === 0) ? String(Math.round(v)) : (v.toFixed(v >= 10 ? 0 : 1));
      return s + units[u];
    }

    function resolvePath(p) {
      if (!p || p === '.') return cwd;
      let path = p.startsWith('/') ? p : (cwd.replace(/\/+$/, '') + '/' + p);
      const parts = path.split('/').filter(Boolean);
      const stack = [];
      for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') { stack.pop(); continue; }
        stack.push(part);
      }
      return '/' + stack.join('/');
    }

    function getNode(path) {
      const norm = resolvePath(path);
      if (norm === '/') return fs['/'];
      const parts = norm.split('/').filter(Boolean);
      let cur = fs['/'];
      for (const seg of parts) {
        if (!cur.children || !cur.children[seg]) return null;
        cur = cur.children[seg];
      }
      return cur;
    }

    function ensureDir(path) {
      const norm = resolvePath(path);
      if (norm === '/') return fs['/'];
      const parts = norm.split('/').filter(Boolean);
      let cur = fs['/'];
      for (const seg of parts) {
        cur.children = cur.children || {};
        if (!cur.children[seg]) cur.children[seg] = { type: 'dir', children: {} };
        initMeta(cur.children[seg]);
        cur = cur.children[seg];
      }
      if (cur && cur.meta) cur.meta.mtime = Date.now();
      return cur;
    }

    function listDir(path) {
      const node = getNode(path);
      if (!node || node.type !== 'dir') return null;
      const names = Object.keys(node.children || {}).sort();
      return names;
    }

    function basename(path) {
      const norm = resolvePath(path);
      if (norm === '/') return '/';
      const parts = norm.split('/').filter(Boolean);
      return parts[parts.length - 1] || '/';
    }

    function dirname(path) {
      const norm = resolvePath(path);
      if (norm === '/') return '/';
      const parts = norm.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    }

    function deleteNodeRecursive(absPath) {
      const norm = resolvePath(absPath);
      if (norm === '/' || norm === '') return;
      const dir = dirname(norm);
      const base = basename(norm);
      const parent = getNode(dir);
      if (!parent || !parent.children || !parent.children[base]) return;
      const node = parent.children[base];
      if (node.type === 'dir' && node.children) {
        for (const k of Object.keys(node.children)) deleteNodeRecursive(norm + '/' + k);
      }
      delete parent.children[base];
    }

    function parseRmFlags(argv) {
      let recursive = false;
      let force = false;
      const paths = [];
      for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--') {
          paths.push(...argv.slice(i + 1));
          break;
        }
        if (a === '--recursive') { recursive = true; continue; }
        if (a === '--dir' || a === '-d') { recursive = true; continue; }
        if (a === '--force') { force = true; continue; }
        if (a.startsWith('-') && a.length > 1 && a !== '-') {
          for (let j = 1; j < a.length; j++) {
            const c = a[j];
            if (c === 'r' || c === 'R') recursive = true;
            else if (c === 'f') force = true;
            else if (c === 'd') recursive = true;
          }
          continue;
        }
        paths.push(a);
      }
      return { recursive, force, paths };
    }

    function deepCopyNode(node) {
      if (!node) return null;
      const copy = { type: node.type };
      if (node.meta) copy.meta = { ...node.meta };
      if (node.type === 'file') copy.content = String(node.content || '');
      if (node.type === 'dir' && node.children) {
        copy.children = {};
        for (const k of Object.keys(node.children)) copy.children[k] = deepCopyNode(node.children[k]);
      }
      return copy;
    }

    function linuxPrompt() {
      const home = '/home/star';
      let shown = cwd.startsWith(home) ? '~' + cwd.slice(home.length) : cwd;
      if (shown === '') shown = '~';
      return `star@learn-linux:${shown}$`;
    }

    function printPrompt() {
      if (promptEl) promptEl.textContent = linuxPrompt();
    }

    function cmdLinux(line, optsIn) {
      const opts = optsIn || {};
      const pipeStdin = opts.stdin != null ? String(opts.stdin) : '';
      if (opts.capture) captureBuf = [];
      const raw = String(line || '');
      const s = raw.trim();
      if (!s) return finishCapture();
      const parts = s.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      let name = parts[0];
      let args = parts.slice(1).map(x => x.replace(/^"(.*)"$/, '$1'));
      if (shellAliases[name]) {
        return cmdLinux(shellAliases[name] + (args.length ? ' ' + args.map(x => /\s/.test(x) ? '"' + x + '"' : x).join(' ') : ''), opts);
      }

      // 常用别名与伪命令
      if (name === 'll') {
        // ll -> ls -l
        return cmdLinux(['ls', '-l', ...args].join(' '), opts);
      }
      if (name === 'sudo') {
        if (!args.length) {
          append('sudo: no command specified (learning mode, no real privileges)\n');
          return finishCapture();
        }
        // 学习版：直接以普通用户身份执行后续命令
        return cmdLinux(args.join(' '), opts);
      }

      // 内建：help / clear / exit
      if (name === 'clear') {
        if (!opts.capture && output) output.textContent = '';
        return finishCapture();
      }
      if (name === 'help' || name === 'man') {
        append('\n' + tr('linuxShellHelpHint', 'This is a learning shell. Common commands: ls, cd, pwd, cat, echo, mkdir, rm, ps, top, ...') + '\n\n');
        return finishCapture();
      }
      if (name === 'exit' || name === 'logout' || name === 'quit') {
        append('\nlogout\n');
        return finishCapture();
      }
      if (name === 'alias') {
        if (!args.length) {
          Object.keys(shellAliases).sort().forEach(k => append(`alias ${k}='${shellAliases[k]}'\n`));
          return finishCapture();
        }
        for (const a of args) {
          const eq = a.indexOf('=');
          if (eq > 0) {
            const k = a.slice(0, eq);
            let v = a.slice(eq + 1);
            if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
            else if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
            shellAliases[k] = v;
          }
        }
        return finishCapture();
      }
      if (name === 'unalias') {
        if (!args.length) { append('unalias: usage: unalias name [name ...]\n'); return finishCapture(); }
        for (const a of args) {
          if (a === '-a') { shellAliases = {}; break; }
          delete shellAliases[a];
        }
        return finishCapture();
      }
      if (name === 'source' || name === '.') {
        const f = args[0];
        if (!f) { append('source: filename argument required\n'); return finishCapture(); }
        const node = getNode(f);
        if (!node) { append(`source: ${f}: No such file or directory\n`); return finishCapture(); }
        if (node.type !== 'file') { append(`source: ${f}: Is a directory\n`); return finishCapture(); }
        const body = String(node.content || '');
        const lines = body.split('\n');
        for (const ln of lines) {
          const t = ln.trim();
          if (!t || t.startsWith('#')) continue;
          cmdLinux(t, opts);
        }
        return finishCapture();
      }
      if (name === 'read') {
        const varName = args.find(a => !a.startsWith('-'));
        if (!varName) { append('read: usage: read [-r] name\n'); return finishCapture(); }
        if (pipeStdin) {
          const line = pipeStdin.split('\n')[0] || '';
          shellVars[varName] = line;
        } else append('read: learning mode (no stdin)\n');
        return finishCapture();
      }
      if (name === 'set') {
        if (!args.length) {
          append('BASH_VERSION=learning\n');
          append('PWD=' + cwd + '\n');
          append('OLDPWD=' + (dirStack[dirStack.length - 1] || cwd) + '\n');
          Object.keys(shellVars).sort().forEach(k => append(k + '=' + (shellVars[k] || '') + '\n'));
          return finishCapture();
        }
        append('set: learning mode — options not applied\n');
        return finishCapture();
      }
      if (name === 'unset') {
        if (!args.length) { append('unset: usage: unset name [name...]\n'); return finishCapture(); }
        args.forEach(a => {
          if (shellReadonly.has(a)) append(`unset: ${a}: cannot unset: readonly variable\n`);
          else delete shellVars[a];
        });
        return finishCapture();
      }
      if (name === 'declare' || name === 'typeset') {
        if (!args.length || (args.length === 1 && (args[0] === '-p' || args[0] === '-x'))) {
          Object.keys(shellVars).sort().forEach(k => append('declare -- ' + k + '="' + String(shellVars[k] || '').replace(/"/g, '\\"') + '"\n'));
          return finishCapture();
        }
        for (const a of args) {
          if (a.startsWith('-')) continue;
          const eq = a.indexOf('=');
          if (eq > 0) {
            const k = a.slice(0, eq);
            let v = a.slice(eq + 1);
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
            if (shellReadonly.has(k)) append(`declare: ${k}: readonly variable\n`);
            else shellVars[k] = v;
          }
        }
        return finishCapture();
      }
      if (name === 'readonly') {
        if (!args.length || args[0] === '-p') {
          Array.from(shellReadonly).sort().forEach(k => append('readonly ' + k + '="' + String(shellVars[k] || '').replace(/"/g, '\\"') + '"\n'));
          return finishCapture();
        }
        for (const a of args) {
          if (a.startsWith('-')) continue;
          const eq = a.indexOf('=');
          if (eq > 0) {
            const k = a.slice(0, eq);
            let v = a.slice(eq + 1);
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
            shellVars[k] = v;
            shellReadonly.add(k);
          }
        }
        return finishCapture();
      }
      if (name === 'eval') {
        const line = args.join(' ');
        if (!line) return finishCapture();
        return cmdLinux(line, opts);
      }
      if (name === 'exec') {
        if (!args.length) { append('exec: learning mode — no process replacement in learning shell\n'); return finishCapture(); }
        return cmdLinux(args.join(' '), opts);
      }
      if (name === 'command') {
        const rest = [];
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-v' || args[i] === '-V') { append('command: learning mode\n'); return finishCapture(); }
          if (args[i].startsWith('-')) continue;
          rest.push(args[i]);
        }
        if (!rest.length) return finishCapture();
        return cmdLinux(rest.join(' '), opts);
      }
      if (name === 'printf') {
        const fmt = args[0];
        if (!fmt) { append('printf: usage: printf format [arg...]\n'); return finishCapture(); }
        const rest = args.slice(1);
        let i = 0;
        let out = String(fmt)
          .replace(/%%/g, '\x00')
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/%s/g, () => rest[i++] != null ? String(rest[i - 1]) : '')
          .replace(/%d/g, () => rest[i++] != null ? String(parseInt(rest[i - 1], 10) || 0) : '0')
          .replace(/\x00/g, '%');
        append(out);
        return finishCapture();
      }
      if (name === 'test' || name === '[') {
        const a = name === '[' ? args.slice(0, -1) : args;
        if (a[a.length - 1] === ']') a.pop();
        let result = false;
        if (a.length === 1 && a[0] === '') result = false;
        else if (a.length === 1) result = !!a[0];
        else if (a.length === 2 && a[0] === '-z') result = !a[1];
        else if (a.length === 2 && a[0] === '-n') result = !!a[1];
        else if (a.length === 3 && a[0] === '-f') { const n = getNode(a[2]); result = n && n.type === 'file'; }
        else if (a.length === 3 && a[0] === '-d') { const n = getNode(a[2]); result = n && n.type === 'dir'; }
        else if (a.length === 3 && a[0] === '-e') { result = !!getNode(a[2]); }
        else if (a.length === 3 && a[1] === '=') result = a[0] === a[2];
        else if (a.length === 3 && a[1] === '!=') result = a[0] !== a[2];
        if (!result) append('');
        return finishCapture();
      }
      if (name === ':') {
        return finishCapture();
      }
      if (name === 'wait') {
        append('wait: learning mode — no background jobs\n');
        return finishCapture();
      }
      if (name === 'pushd') {
        const target = args[0];
        if (!target) {
          if (!dirStack.length) { append('pushd: no other directory\n'); return finishCapture(); }
          const prev = dirStack.pop();
          dirStack.push(cwd);
          cwd = prev;
        } else if (target === '-') {
          if (!dirStack.length) { append('pushd: no other directory\n'); return finishCapture(); }
          const prev = dirStack.pop();
          dirStack.push(cwd);
          cwd = prev;
        } else {
          const n = getNode(resolvePath(target));
          if (!n || n.type !== 'dir') { append(`pushd: ${target}: No such file or directory\n`); return finishCapture(); }
          dirStack.push(cwd);
          cwd = resolvePath(target);
        }
        printPrompt();
        append(cwd + (dirStack.length ? ' ' + dirStack.join(' ') : '') + '\n');
        return finishCapture();
      }
      if (name === 'popd') {
        if (!dirStack.length) { append('popd: directory stack empty\n'); return finishCapture(); }
        cwd = dirStack.pop();
        printPrompt();
        return finishCapture();
      }
      if (name === 'dirs') {
        append(cwd + (dirStack.length ? ' ' + dirStack.join(' ') : '') + '\n');
        return finishCapture();
      }
      if (name === 'ulimit') {
        append('unlimited\n');
        return finishCapture();
      }
      if (name === 'tty') {
        append('/dev/pts/0\n');
        return finishCapture();
      }
      if (name === 'stty') {
        append('stty: learning mode — terminal settings not changed\n');
        return finishCapture();
      }

      if (name === 'pwd') {
        append(cwd + '\n');
        return finishCapture();
      }

      if (name === 'cd') {
        const target = args[0] || '~';
        const real = target === '~' ? '/home/star' : target;
        const n = getNode(real);
        if (!n || n.type !== 'dir') {
          append(`bash: cd: ${target}: No such file or directory\n`);
          return finishCapture();
        }
        cwd = resolvePath(real);
        printPrompt();
        return finishCapture();
      }

      if (name === 'ls') {
        let longFmt = false;
        let showAll = false;
        let human = false;
        let recursive = false;
        let target = '.';
        for (const a of args) {
          if (a.startsWith('-')) {
            if (a.includes('l')) longFmt = true;
            if (a.includes('a')) showAll = true;
            if (a.includes('h')) human = true;
            if (a.includes('R')) recursive = true;
          } else {
            target = a;
          }
        }
        const n = getNode(target);
        if (!n) {
          append(`ls: cannot access '${target}': No such file or directory\n`);
          return;
        }
        if (n.type === 'file') {
          append(basename(target) + '\n');
          return;
        }
        const printDir = (dirPath, isRoot) => {
          const node = getNode(dirPath);
          if (!node || node.type !== 'dir') return;
          const items = listDir(dirPath) || [];
          const names = showAll ? ['.', '..', ...items] : items;
          if (recursive || !isRoot) {
            append(`\n${dirPath}:\n`);
          }
          if (!longFmt) {
            append(names.join('  ') + '\n');
            return;
          }
          const basePath = resolvePath(dirPath);
          for (const nm of names) {
            let child = null;
            if (nm === '.') child = node;
            else if (nm === '..') child = getNode(dirname(basePath));
            else child = (node.children || {})[nm] || null;
            if (!child) continue;
            initMeta(child);
            const mode = child.meta.mode || (child.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--');
            const links = (child.type === 'dir') ? 2 : 1;
            const owner = child.meta.owner || 'star';
            const group = child.meta.group || 'star';
            const sizeBytes = (child.type === 'file') ? String((child.content || '').length) : '4096';
            const size = formatSize(sizeBytes, human).padStart(5, ' ');
            const mtime = formatMtime(child.meta.mtime);
            append(`${mode} ${String(links).padStart(2, ' ')} ${owner.padEnd(5)} ${group.padEnd(5)} ${size} ${mtime} ${nm}\n`);
          }
          if (recursive) {
            items.forEach(nm => {
              const child = (node.children || {})[nm];
              if (child && child.type === 'dir') {
                printDir(resolvePath(basePath + '/' + nm), false);
              }
            });
          }
        };
        printDir(target, true);
        return finishCapture();
      }

      if (name === 'cat') {
        if (!args.length) {
          if (pipeStdin) append(pipeStdin);
          else append('cat: missing file operand\n');
          return finishCapture();
        }
        for (const p of args) {
          if (p === '-') {
            if (pipeStdin) append(pipeStdin);
            continue;
          }
          const n = getNode(p);
          if (!n) append(`cat: ${p}: No such file or directory\n`);
          else if (n.type !== 'file') append(`cat: ${p}: Is a directory\n`);
          else append(String(n.content || '') + '\n');
        }
        return finishCapture();
      }

      if (name === 'echo') {
        append(args.join(' ') + '\n');
        return finishCapture();
      }

      if (name === 'mkdir') {
        if (!args.length) {
          append('mkdir: missing operand\n');
          return;
        }
        for (const p of args) {
          const full = resolvePath(p);
          ensureDir(full);
        }
        return finishCapture();
      }

      if (name === 'touch') {
        if (!args.length) {
          append('touch: missing file operand\n');
          return;
        }
        for (const p of args) {
          const dir = dirname(p);
          const base = basename(p);
          const dnode = ensureDir(dir);
          dnode.children = dnode.children || {};
          if (!dnode.children[base]) dnode.children[base] = { type: 'file', content: '' };
          initMeta(dnode.children[base]);
          dnode.children[base].meta.mtime = Date.now();
        }
        return finishCapture();
      }

      if (name === 'rm') {
        const { recursive, force, paths: rmPaths } = parseRmFlags(args);
        if (!rmPaths.length) {
          append('rm: missing operand\n');
          return finishCapture();
        }
        for (const p of rmPaths) {
          const full = resolvePath(p);
          if (full === '/') {
            append('rm: cannot remove \'/\': Operation not permitted\n');
            continue;
          }
          const dir = dirname(full);
          const base = basename(full);
          const d = getNode(dir);
          if (!d || !d.children || !d.children[base]) {
            if (!force) append(`rm: cannot remove '${p}': No such file or directory\n`);
            continue;
          }
          const node = d.children[base];
          if (node.type === 'dir' && !recursive) {
            append(`rm: cannot remove '${p}': Is a directory\n`);
            continue;
          }
          if (node.type === 'dir' && recursive) deleteNodeRecursive(full);
          else delete d.children[base];
        }
        return finishCapture();
      }

      if (name === 'rmdir') {
        if (!args.length) {
          append('rmdir: missing operand\n');
          return;
        }
        for (const p of args) {
          const full = resolvePath(p);
          if (full === '/') {
            append('rmdir: failed to remove \'/\': Permission denied\n');
            continue;
          }
          const dir = dirname(full);
          const base = basename(full);
          const d = getNode(dir);
          if (!d || !d.children || !d.children[base]) {
            append(`rmdir: failed to remove '${p}': No such file or directory\n`);
            continue;
          }
          const node = d.children[base];
          if (node.type !== 'dir') {
            append(`rmdir: failed to remove '${p}': Not a directory\n`);
            continue;
          }
          if (node.children && Object.keys(node.children).length) {
            append(`rmdir: failed to remove '${p}': Directory not empty\n`);
            continue;
          }
          delete d.children[base];
        }
        return finishCapture();
      }

      if (name === 'ps') {
        append('  PID TTY          TIME CMD\n');
        append('    1 pts/0    00:00:00 init\n');
        append('  101 pts/0    00:00:00 bash\n');
        append('  202 pts/0    00:00:00 star-linux-shell\n');
        return finishCapture();
      }

      if (name === 'top') {
        append('top - 00:00:00 up 0 min,  0 users,  load average: 0.00, 0.00, 0.00\n');
        append('Tasks:   3 total,   1 running,   2 sleeping,   0 stopped,   0 zombie\n');
        append('%Cpu(s):  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st\n');
        append('MiB Mem :  1024.0 total,   800.0 free,   224.0 used,     0.0 buff/cache\n\n');
        append('  PID USER      PR  NI    VIRT    RES    SHR S  %CPU %MEM     TIME+ COMMAND\n');
        append('    1 root      20   0   10000   2000   1500 S   0.0  0.2   0:00.01 init\n');
        append('  101 star      20   0   12000   3000   2000 S   0.0  0.3   0:00.01 bash\n');
        append('  202 star      20   0   14000   4000   2200 R   0.0  0.4   0:00.01 star-linux-shell\n');
        return finishCapture();
      }

      if (name === 'whoami') {
        append('star\n');
        return;
      }
      if (name === 'id') {
        append('uid=1000(star) gid=1000(star) groups=1000(star)\n');
        return;
      }
      if (name === 'uname') {
        const opt = args[0] || '-s';
        if (opt === '-a') append('Linux star-learn 5.10.0-virtual #1 SMP x86_64 GNU/Linux (simulated)\n');
        else append('Linux\n');
        return;
      }
      if (name === 'chmod' || name === 'chown') {
        append(`${name}: operation is simulated in learning mode (no real permissions changed).\n`);
        return;
      }

      // 网络相关（模拟输出）
      if (name === 'ifconfig') {
        append('lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536\n');
        append('        inet 127.0.0.1  netmask 255.0.0.0  inet6 ::1  prefixlen 128  scopeid 0x10\n');
        append('eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n');
        append('        inet 10.0.2.15  netmask 255.255.255.0  broadcast 10.0.2.255\n');
        append('        inet6 fe80::5054:ff:fe12:3456  prefixlen 64  scopeid 0x20\n');
        return;
      }
      if (name === 'ip') {
        const sub = (args[0] || 'addr').toLowerCase();
        if (sub === 'addr' || sub === 'a') {
          append('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n');
          append('    inet 127.0.0.1/8 scope host lo\n');
          append('2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n');
          append('    inet 10.0.2.15/24 brd 10.0.2.255 scope global eth0\n');
        } else if (sub === 'link' || sub === 'l') {
          append('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n');
          append('2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n');
        } else if (sub === 'route' || sub === 'r') {
          append('default via 10.0.2.2 dev eth0\n');
          append('10.0.2.0/24 dev eth0 proto kernel scope link src 10.0.2.15\n');
        } else {
          append(`ip: unknown command '${sub}' (try: ip addr, ip link, ip route)\n`);
        }
        return finishCapture();
      }

      if (name === 'hostname') {
        append('star-learn\n');
        return;
      }
      if (name === 'date') {
        const d = new Date();
        append(d.toString() + '\n');
        return;
      }
      if (name === 'df') {
        append('Filesystem     1K-blocks   Used Available Use% Mounted on\n');
        append('/dev/sda1       10485760 2097152   8388608  20% /\n');
        append('tmpfs             524288     256    524032   1% /tmp\n');
        return;
      }
      if (name === 'du') {
        const target = args[0] || '.';
        const n = getNode(target);
        if (!n) {
          append(`du: cannot access '${target}': No such file or directory\n`);
          return;
        }
        if (n.type === 'file') {
          const len = String(n.content || '').length;
          append(`${Math.max(4, Math.ceil(len / 1024))}\t${target}\n`);
          return;
        }
        let total = 4;
        const list = listDir(target) || [];
        for (const nm of list) {
          const child = (n.children || {})[nm];
          if (child) total += child.type === 'file' ? Math.ceil(String(child.content || '').length / 1024) || 1 : 4;
        }
        append(`${total}\t${target}\n`);
        return;
      }
      if (name === 'free') {
        append('              total        used        free      shared  buff/cache   available\n');
        append('Mem:         1024000      224000      800000        1000           0      799000\n');
        append('Swap:         524288           0      524288\n');
        return;
      }
      if (name === 'env' || name === 'printenv') {
        append('HOME=/home/star\n');
        append('USER=star\n');
        append('SHELL=/bin/bash\n');
        append('PWD=' + cwd + '\n');
        append('PATH=/usr/local/bin:/usr/bin:/bin\n');
        return finishCapture();
      }
      if (name === 'which') {
        const cmd = args[0];
        if (!cmd) {
          append('which: missing command name\n');
          return finishCapture();
        }
        const known = ['ls','cd','cat','echo','pwd','mkdir','rm','ps','top','whoami','id','uname','ifconfig','ip','hostname','date','df','du','free','env','clear','exit','cp','mv','head','tail','wc','grep','find','history','uptime','cal','type','file','stat','groups','netstat','ss','less','more','sort','uniq','cut','tr','tar','gzip','gunzip','ln','who','w','yes','seq','true','false','curl','wget','printenv','rmdir','touch','basename','dirname','realpath','kill','killall','nohup','nproc','dmesg','lsblk','mount','umount','lsof','systemctl','diff','tee','xargs','nslookup','dig','route','chgrp','passwd','export','readlink','sleep','time','shutdown','reboot','sed','awk','nl','paste','comm','fmt','fold','bzip2','bunzip2','xz','unxz','zip','unzip','md5sum','sha256sum','base64','od','xxd','hexdump','host','traceroute','tracepath','ssh','scp','nc','su','useradd','userdel','usermod','last','lastlog','umask','jobs','bg','fg','nice','renice','lsmod','modinfo','crontab','bc','expr','watch','service','alias','unalias','source','set','unset','read','printf','test','[',':','wait','pushd','popd','dirs','ulimit','tty','stty','join','pr','split','expand','unexpand','column','strings','sha1sum','cksum','iconv','whereis','locate','whatis','apropos','install','mktemp','sync','chattr','lsattr','chsh','finger','getent','pkill','pgrep','pidof','runlevel','init','journalctl','sftp','ftp','telnet','fdisk','parted','blkid','lspci','lsusb','lscpu','dd','script','disown','fc','vi','vim','nano','emacs','sh','bash','dash','python','python3','node','perl','ruby','php','make','gcc','g++','clang','eval','exec','command','builtin','hash','declare','typeset','readonly','local','trap','getopts','shopt','bind','compgen','complete','compopt','caller','return','shift','break','continue','tac','rev','shuf','csplit','stdbuf','timeout','ionice','zcat','bzcat','xzcat','7z','rar','apt','apt-get','dpkg','yum','dnf','rpm','pacman','snap','flatpak','ping6','traceroute6','mtr','iptables','nft','firewall-cmd','nmcli','iwconfig','iw','resolvectl','rsync','socat','openssl','gpg','htop','vmstat','iostat','sar','perf','strace','ltrace','gdb','sysctl','loginctl','timedatectl','hostnamectl','busctl','systemd-run','logger','groupadd','groupdel','groupmod','newgrp','gpasswd','visudo','mkfs','fsck','e2fsck','tune2fs','resize2fs','swapon','swapoff','tree','readelf','ldd','nm','objdump','strip','ar','poweroff','halt','users','mesg','wall','write','info'];
        append(known.includes(cmd) ? `/usr/bin/${cmd}\n` : '');
        return finishCapture();
      }
      if (name === 'ping') {
        const host = args[0] || '';
        if (!host) {
          append('ping: missing host operand\n');
          return finishCapture();
        }
        append(`PING ${host} (127.0.0.1): 56 data bytes\n`);
        append(`64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.1 ms\n`);
        append(`\n--- ${host} ping statistics ---\n`);
        append('1 packets transmitted, 1 packets received, 0.0% packet loss\n');
        return finishCapture();
      }

      // ---------- 高优先级：cp, mv, head, tail, wc, grep, find, history ----------
      if (name === 'cp') {
        if (args.length < 2) {
          append('cp: missing file operand\n');
          return;
        }
        const src = resolvePath(args[0]);
        const dest = resolvePath(args[args.length - 1]);
        const srcNode = getNode(args[0]);
        if (!srcNode) {
          append(`cp: cannot stat '${args[0]}': No such file or directory\n`);
          return;
        }
        const destParent = getNode(dirname(dest));
        const destBase = basename(dest);
        if (!destParent || destParent.type !== 'dir') {
          append(`cp: cannot create regular file '${dest}': No such file or directory\n`);
          return;
        }
        destParent.children = destParent.children || {};
        if (srcNode.type === 'file') {
          destParent.children[destBase] = deepCopyNode(srcNode);
          initMeta(destParent.children[destBase]);
        } else {
          destParent.children[destBase] = deepCopyNode(srcNode);
          initMeta(destParent.children[destBase]);
        }
        return finishCapture();
      }

      if (name === 'mv') {
        if (args.length < 2) {
          append('mv: missing file operand\n');
          return;
        }
        const srcPath = resolvePath(args[0]);
        const destPath = resolvePath(args[args.length - 1]);
        const srcDir = getNode(dirname(srcPath));
        const srcBase = basename(srcPath);
        if (!srcDir || !srcDir.children || !srcDir.children[srcBase]) {
          append(`mv: cannot stat '${args[0]}': No such file or directory\n`);
          return;
        }
        const destDir = getNode(dirname(destPath));
        const destBase = basename(destPath);
        if (!destDir || destDir.type !== 'dir') {
          append(`mv: cannot move to '${destPath}': No such file or directory\n`);
          return;
        }
        destDir.children = destDir.children || {};
        destDir.children[destBase] = srcDir.children[srcBase];
        delete srcDir.children[srcBase];
        return finishCapture();
      }

      if (name === 'head') {
        let n = 10;
        let files = [];
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-n' && args[i + 1]) { n = parseInt(args[i + 1], 10) || 10; i++; }
          else if (!args[i].startsWith('-')) files.push(args[i]);
        }
        if (!files.length) files.push('-');
        for (const p of files) {
          if (p === '-') {
            if (pipeStdin) { const lines = pipeStdin.split('\n'); append(lines.slice(0, n).join('\n') + (lines.length > n ? '\n' : '') + '\n'); }
            else append('head: missing file operand\n');
            continue;
          }
          const node = getNode(p);
          if (!node) append(`head: cannot open '${p}' for reading: No such file or directory\n`);
          else if (node.type !== 'file') append(`head: error reading '${p}': Is a directory\n`);
          else {
            const lines = String(node.content || '').split('\n');
            append(lines.slice(0, n).join('\n') + (lines.length > n ? '\n' : '') + '\n');
          }
        }
        return finishCapture();
      }

      if (name === 'tail') {
        let n = 10;
        let files = [];
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-n' && args[i + 1]) { n = parseInt(args[i + 1], 10) || 10; i++; }
          else if (!args[i].startsWith('-')) files.push(args[i]);
        }
        if (!files.length) files.push('-');
        for (const p of files) {
          if (p === '-') {
            if (pipeStdin) { const lines = pipeStdin.split('\n'); append(lines.slice(-n).join('\n') + '\n'); }
            else append('tail: missing file operand\n');
            continue;
          }
          const node = getNode(p);
          if (!node) append(`tail: cannot open '${p}' for reading: No such file or directory\n`);
          else if (node.type !== 'file') append(`tail: error reading '${p}': Is a directory\n`);
          else {
            const lines = String(node.content || '').split('\n');
            append(lines.slice(-n).join('\n') + '\n');
          }
        }
        return finishCapture();
      }

      if (name === 'wc') {
        let opts = { l: false, w: false, c: false };
        let files = [];
        for (const a of args) {
          if (a === '-l') opts.l = true;
          else if (a === '-w') opts.w = true;
          else if (a === '-c') opts.c = true;
          else if (!a.startsWith('-')) files.push(a);
        }
        if (!opts.l && !opts.w && !opts.c) opts.l = opts.w = opts.c = true;
        if (!files.length) files.push('-');
        let totalL = 0, totalW = 0, totalC = 0;
        for (const p of files) {
          let content = '';
          if (p === '-') content = pipeStdin;
          else {
            const node = getNode(p);
            if (!node) { append(`wc: ${p}: No such file or directory\n`); continue; }
            if (node.type !== 'file') { append(`wc: ${p}: Is a directory\n`); continue; }
            content = String(node.content || '');
          }
          const lines = content.split('\n');
          const l = lines.length;
          const w = content.trim() ? content.trim().split(/\s+/).length : 0;
          const c = content.length;
          totalL += l; totalW += w; totalC += c;
          const parts = [];
          if (opts.l) parts.push(String(l).padStart(7));
          if (opts.w) parts.push(String(w).padStart(7));
          if (opts.c) parts.push(String(c).padStart(7));
          if (parts.length === 0) parts.push(String(l).padStart(7), String(w).padStart(7), String(c).padStart(7));
          append(parts.join('') + (p === '-' ? '' : ' ' + p) + '\n');
        }
        if (files.length > 1) {
          const parts = [];
          if (opts.l) parts.push(String(totalL).padStart(7));
          if (opts.w) parts.push(String(totalW).padStart(7));
          if (opts.c) parts.push(String(totalC).padStart(7));
          if (parts.length === 0) parts.push(String(totalL).padStart(7), String(totalW).padStart(7), String(totalC).padStart(7));
          append(parts.join('') + ' total\n');
        }
        return finishCapture();
      }

      if (name === 'grep') {
        let pattern = '';
        let files = [];
        for (const a of args) {
          if (a === '-i') continue;
          if (!pattern && !a.startsWith('-')) pattern = a;
          else if (pattern && !a.startsWith('-')) files.push(a);
        }
        if (!pattern) { append('grep: missing pattern\n'); return finishCapture(); }
        if (!files.length) files.push('-');
        const regex = new RegExp(pattern, 'i');
        function grepLines(content, label) {
          const lines = String(content || '').split('\n');
          lines.forEach((line, i) => { if (regex.test(line)) append((label ? label + ':' : '') + (lines.length > 1 ? (i + 1) + ':' : '') + line + '\n'); });
        }
        for (const p of files) {
          if (p === '-') {
            if (pipeStdin) grepLines(pipeStdin, '');
            continue;
          }
          const node = getNode(p);
          if (!node) append(`grep: ${p}: No such file or directory\n`);
          else if (node.type !== 'file') append(`grep: ${p}: Is a directory\n`);
          else grepLines(node.content, p);
        }
        return finishCapture();
      }

      if (name === 'find') {
        const start = args[0] || '.';
        let namePat = null;
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-name' && args[i + 1]) { namePat = args[i + 1].replace(/\*/g, '.*'); i++; }
        }
        const re = namePat ? new RegExp('^' + namePat + '$') : null;
        function walk(path) {
          const node = getNode(path);
          if (!node) return;
          if (node.type === 'file') {
            if (!re || re.test(basename(path))) append(path + '\n');
            return;
          }
          if (!re || re.test(basename(path))) append(path + '\n');
          const list = listDir(path) || [];
          for (const nm of list) walk(path + '/' + nm);
        }
        walk(resolvePath(start));
        return finishCapture();
      }

      if (name === 'history') {
        const n = parseInt(args[0], 10);
        const len = cmdHistory.length;
        const start = isNaN(n) ? 1 : Math.max(1, len - (n || 500));
        for (let i = start; i <= len; i++) append('  ' + i + '  ' + (cmdHistory[i - 1] || '') + '\n');
        return finishCapture();
      }

      // ---------- 中优先级：uptime, cal, type, file, stat, groups, netstat, ss, less, more ----------
      if (name === 'uptime') {
        append(' 00:00:00 up 1 day,  0:00,  0 users,  load average: 0.00, 0.00, 0.00\n');
        return finishCapture();
      }
      if (name === 'cal') {
        const d = new Date();
        let month = d.getMonth();
        let year = d.getFullYear();
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-y' && args[i + 1]) { year = parseInt(args[i + 1], 10); i++; }
          else if (/^\d+$/.test(args[i]) && args[i].length <= 2) month = parseInt(args[i], 10) - 1;
          else if (/^\d{4}$/.test(args[i])) year = parseInt(args[i], 10);
        }
        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);
        const days = last.getDate();
        const weekStart = first.getDay();
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        append('   ' + months[month] + ' ' + year + '\n');
        append('Su Mo Tu We Th Fr Sa\n');
        let line = '   '.repeat(weekStart);
        for (let i = 1; i <= days; i++) {
          line += String(i).padStart(2) + ' ';
          if ((weekStart + i) % 7 === 0) { append(line + '\n'); line = ''; }
        }
        if (line.trim()) append(line + '\n');
        return finishCapture();
      }
      if (name === 'type') {
        const cmd = args[0];
        if (!cmd) { append('type: usage: type name [name ...]\n'); return finishCapture(); }
        const builtins = ['cd','pwd','echo','exit','clear','help','man','history','type','export','alias','unalias','source','.','set','unset','read','printf','test',':','wait','pushd','popd','dirs','ulimit','tty','stty','declare','typeset','readonly','eval','exec','command','builtin','hash','local','trap','getopts','shopt','bind','compgen','complete','compopt','caller','return','shift','break','continue'];
        if (builtins.includes(cmd)) append(cmd + ' is a shell builtin\n');
        else if (cmd === 'll') append('ll is aliased to `ls -l\'\n');
        else append(cmd + ' is /usr/bin/' + cmd + '\n');
        return finishCapture();
      }
      if (name === 'file') {
        const p = args[0];
        if (!p) { append('file: missing operand\n'); return finishCapture(); }
        const node = getNode(p);
        if (!node) append(p + ': cannot open (No such file or directory)\n');
        else if (node.type === 'dir') append(p + ': directory\n');
        else append(p + ': ASCII text\n');
        return;
      }
      if (name === 'stat') {
        const p = args[0] || '.';
        const node = getNode(p);
        if (!node) append("stat: cannot stat '" + p + "': No such file or directory\n");
        else {
          initMeta(node);
          const m = node.meta || {};
          append('  File: ' + p + '\n');
          append('  Size: ' + (node.type === 'file' ? String((node.content || '').length) : '4096') + '  Blocks: 8  IO Block: 4096  ' + (node.type === 'dir' ? 'directory' : 'regular file') + '\n');
          append('Access: (' + (m.mode || '-rw-r--r--') + ')  Uid: ( 1000/  star)   Gid: ( 1000/  star)\n');
          append('Modify: ' + new Date(m.mtime || 0).toISOString() + '\n');
        }
        return;
      }
      if (name === 'groups') {
        append('star\n');
        return;
      }
      if (name === 'netstat') {
        append('Active Internet connections (servers and established)\n');
        append('Proto Recv-Q Send-Q Local Address   Foreign Address   State\n');
        append('tcp        0      0 0.0.0.0:22       0.0.0.0:*         LISTEN\n');
        append('tcp        0      0 127.0.0.1:631   0.0.0.0:*         LISTEN\n');
        return;
      }
      if (name === 'ss') {
        append('Netid  State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port\n');
        append('tcp    LISTEN  0       128      0.0.0.0:22            0.0.0.0:*\n');
        return;
      }
      if (name === 'less' || name === 'more') {
        const p = args[0];
        if (!p) { append(name + ': missing filename\n'); return finishCapture(); }
        const node = getNode(p);
        if (!node) append(name + ': ' + p + ': No such file or directory\n');
        else if (node.type !== 'file') append(name + ': ' + p + ': Is a directory\n');
        else {
          const lines = String(node.content || '').split('\n');
          append(lines.slice(0, 20).join('\n') + '\n');
          append('(learning mode: showing first 20 lines; real ' + name + ' would paginate)\n');
        }
        return finishCapture();
      }

      // ---------- 低优先级：sort, uniq, cut, tr, tar, gzip, ln, who, w, yes, seq, true, false, curl, wget ----------
      if (name === 'sort') {
        const p = args[0];
        const content = (!p || p === '-') ? pipeStdin : null;
        if (content !== null) {
          const lines = content.split('\n').filter(Boolean);
          append(lines.sort().join('\n') + '\n');
          return finishCapture();
        }
        const node = getNode(p);
        if (!node) append('sort: read failed: ' + p + ': No such file or directory\n');
        else if (node.type !== 'file') append('sort: read failed: ' + p + ': Is a directory\n');
        else {
          const lines = String(node.content || '').split('\n').filter(Boolean);
          append(lines.sort().join('\n') + '\n');
        }
        return finishCapture();
      }
      if (name === 'uniq') {
        const p = args[0];
        const content = (!p || p === '-') ? pipeStdin : null;
        if (content !== null) {
          const lines = content.split('\n');
          let prev = '';
          lines.forEach(l => { if (l !== prev) { append(l + '\n'); prev = l; } });
          return finishCapture();
        }
        const node = getNode(p);
        if (!node) append('uniq: ' + p + ': No such file or directory\n');
        else if (node.type !== 'file') append('uniq: ' + p + ': Is a directory\n');
        else {
          const lines = String(node.content || '').split('\n');
          let prev = '';
          lines.forEach(l => { if (l !== prev) { append(l + '\n'); prev = l; } });
        }
        return finishCapture();
      }
      if (name === 'cut') {
        const p = args[args.length - 1];
        let field = '1';
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-f' && args[i + 1]) field = args[i + 1];
        }
        const idx = parseInt(field, 10) - 1;
        const delim = '\t';
        const content = (!p || p === '-') ? pipeStdin : null;
        if (content !== null) {
          content.split('\n').forEach(l => { const cols = l.split(delim); append((cols[idx] !== undefined ? cols[idx] : l) + '\n'); });
          return finishCapture();
        }
        const node = getNode(p);
        if (!node) append('cut: ' + p + ': No such file or directory\n');
        else if (node.type !== 'file') append('cut: ' + p + ': Is a directory\n');
        else {
          const lines = String(node.content || '').split('\n');
          lines.forEach(l => { const cols = l.split(delim); append((cols[idx] !== undefined ? cols[idx] : l) + '\n'); });
        }
        return finishCapture();
      }
      if (name === 'tr') {
        if (args.length < 2) { append('tr: missing operand\n'); return finishCapture(); }
        if (pipeStdin && args.length >= 2) {
          const set1 = args[0];
          const set2 = args[1] || '';
          let out = pipeStdin;
          for (let i = 0; i < set1.length; i++) {
            const c = set1[i];
            const r = set2[i] !== undefined ? set2[i] : set2[set2.length - 1] || '';
            out = out.split(c).join(r);
          }
          append(out);
        } else append('tr: learning mode (no stdin); use command | tr SET1 SET2\n');
        return finishCapture();
      }
      if (name === 'tar' || name === 'gzip' || name === 'gunzip') {
        append(name + ': learning mode — archive operations are simulated only.\n');
        return finishCapture();
      }
      if (name === 'ln') {
        append('ln: learning mode — symbolic/hard links are not simulated.\n');
        return finishCapture();
      }
      if (name === 'who' || name === 'w') {
        append('star    pts/0    00:00  ' + (new Date().toLocaleString()) + '\n');
        return finishCapture();
      }
      if (name === 'yes') {
        const str = args[0] || 'y';
        for (let i = 0; i < 5; i++) append(str + '\n');
        append('(learning mode: limited output)\n');
        return finishCapture();
      }
      if (name === 'seq') {
        let start = 1, end = 1, step = 1;
        if (args.length === 1) end = parseInt(args[0], 10) || 1;
        else if (args.length === 2) { start = parseInt(args[0], 10) || 1; end = parseInt(args[1], 10) || 1; }
        else if (args.length >= 3) { start = parseInt(args[0], 10) || 1; step = parseInt(args[1], 10) || 1; end = parseInt(args[2], 10) || 1; }
        for (let i = start; step > 0 ? i <= end : i >= end; i += step) append(i + '\n');
        return finishCapture();
      }
      if (name === 'true' || name === 'false') {
        return finishCapture();
      }
      if (name === 'curl' || name === 'wget') {
        const url = args[args.length - 1] || 'http://example.com';
        append('  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current\n');
        append('                                 Dload  Upload   Total   Spent    Left  Speed\n');
        append('  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0 (learning mode: no real download)\n');
        return finishCapture();
      }

      // ---------- 路径/文件名类 ----------
      if (name === 'basename') {
        const p = args[0] || '';
        append(basename(p || cwd) + '\n');
        return finishCapture();
      }
      if (name === 'dirname') {
        const p = args[0] || '';
        append(dirname(p || cwd) + '\n');
        return finishCapture();
      }
      if (name === 'realpath') {
        const p = args[0] || '.';
        append(resolvePath(p) + '\n');
        return finishCapture();
      }

      // ---------- 进程/信号类 ----------
      if (name === 'kill') {
        const sig = args[0] && args[0].startsWith('-') ? args[0] : '-TERM';
        const pid = args[0] && args[0].startsWith('-') ? args[1] : args[0];
        if (!pid) { append('kill: usage: kill [-s sigspec] pid\n'); return finishCapture(); }
        append('(learning mode: signal not sent)\n');
        return finishCapture();
      }
      if (name === 'killall') {
        const proc = args[0];
        if (!proc) { append('killall: need at least one process name\n'); return finishCapture(); }
        append('(learning mode: process not killed)\n');
        return finishCapture();
      }
      if (name === 'nohup') {
        if (!args.length) { append('nohup: missing operand\n'); return finishCapture(); }
        append('nohup: ignoring input and appending output to \'nohup.out\'\n');
        return cmdLinux(args.join(' '), opts);
      }
      if (name === 'nproc') {
        append('4\n');
        return finishCapture();
      }

      // ---------- 系统/设备类 ----------
      if (name === 'dmesg') {
        append('[    0.000000] Linux version 5.10.0-virtual (simulated)\n');
        append('[    0.000100] Command line: root=/dev/sda1\n');
        append('[    0.100000] ata1: SATA link up\n');
        return finishCapture();
      }
      if (name === 'lsblk') {
        append('NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT\n');
        append('sda      8:0    0   10G  0 disk\n');
        append('sda1     8:1    0   10G  0 part /\n');
        return finishCapture();
      }
      if (name === 'mount') {
        append('proc on /proc type proc (rw)\n');
        append('sysfs on /sys type sysfs (rw)\n');
        append('/dev/sda1 on / type ext4 (rw)\n');
        return finishCapture();
      }
      if (name === 'umount') {
        append('umount: learning mode — no real unmount.\n');
        return finishCapture();
      }
      if (name === 'lsof') {
        append('COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\n');
        append('init        1 root  cwd    DIR    8,1     4096    2 /\n');
        append('bash      101 star    0u   CHR  136,0      0t0    3 /dev/pts/0\n');
        return finishCapture();
      }
      if (name === 'systemctl') {
        const sub = args[0] || 'status';
        if (sub === 'status') append('● learn-linux.service - Star OS Linux learning shell\n   Loaded: loaded (simulated)\n   Active: active (running)\n');
        else if (sub === 'start' || sub === 'stop' || sub === 'restart') append('(learning mode: no real service change)\n');
        else append('systemctl: unknown operation \'' + sub + '\'.\n');
        return finishCapture();
      }

      // ---------- 文本/比较与管道 ----------
      if (name === 'diff') {
        const a = args[0];
        const b = args[1];
        if (!a || !b) { append('diff: missing operand\n'); return finishCapture(); }
        const na = getNode(a);
        const nb = getNode(b);
        if (!na) { append(`diff: ${a}: No such file or directory\n`); return finishCapture(); }
        if (!nb) { append(`diff: ${b}: No such file or directory\n`); return finishCapture(); }
        if (na.type !== 'file' || nb.type !== 'file') { append('diff: Is a directory\n'); return finishCapture(); }
        const la = String(na.content || '').split('\n');
        const lb = String(nb.content || '').split('\n');
        let out = '';
        for (let i = 0; i < Math.max(la.length, lb.length); i++) {
          const x = la[i];
          const y = lb[i];
          if (x !== y) {
            if (x !== undefined) out += '< ' + x + '\n';
            if (y !== undefined) out += '> ' + y + '\n';
          }
        }
        append(out || '');
        return finishCapture();
      }
      if (name === 'tee') {
        if (!pipeStdin) {
          append('tee: usage: command | tee [-a] file\n');
          return finishCapture();
        }
        const fileArg = args.find(a => !a.startsWith('-'));
        if (fileArg) {
          const full = resolvePath(fileArg);
          const d = getNode(dirname(full));
          const base = basename(full);
          if (d && d.type === 'dir') {
            d.children = d.children || {};
            d.children[base] = { type: 'file', content: pipeStdin };
            initMeta(d.children[base]);
          }
        }
        append(pipeStdin);
        return finishCapture();
      }
      if (name === 'xargs') {
        if (!pipeStdin) {
          append('xargs: usage: command | xargs [command [initial-arguments]]\n');
          return finishCapture();
        }
        const cmdArgs = [];
        for (const a of args) {
          if (a === '-I' || a === '-0') continue;
          if (a.startsWith('-')) continue;
          cmdArgs.push(a);
        }
        const tokens = pipeStdin.trim() ? pipeStdin.trim().split(/\s+/).filter(Boolean) : [];
        const line = cmdArgs.length ? cmdArgs.join(' ') + ' ' + tokens.join(' ') : tokens.join(' ');
        if (!line.trim()) return finishCapture();
        const out = cmdLinux(line.trim(), { stdin: '', capture: true });
        if (out != null) append(out);
        return finishCapture();
      }

      // ---------- 网络/解析与 ip route ----------
      if (name === 'nslookup' || name === 'dig') {
        const host = args[0] || 'example.com';
        append('Server:    127.0.0.53\nAddress:  127.0.0.53#53\n\n');
        append('Non-authoritative answer:\nName:\t' + host + '\nAddress: 93.184.216.34\n');
        return finishCapture();
      }
      if (name === 'route') {
        append('Kernel IP routing table\nDestination     Gateway         Genmask         Flags Metric Ref    Use Iface\n');
        append('0.0.0.0         10.0.2.2        0.0.0.0         UG    0      0        0 eth0\n');
        append('10.0.2.0        0.0.0.0         255.255.255.0   U     0      0        0 eth0\n');
        return finishCapture();
      }

      // ---------- 用户/权限/其它 ----------
      if (name === 'chgrp') {
        append('chgrp: operation is simulated in learning mode (no real group changed).\n');
        return finishCapture();
      }
      if (name === 'passwd') {
        append('passwd: password unchanged (learning mode)\n');
        return finishCapture();
      }
      if (name === 'export') {
        if (!args.length) {
          append('HOME=/home/star\nUSER=star\nSHELL=/bin/bash\nPWD=' + cwd + '\nPATH=/usr/local/bin:/usr/bin:/bin\n');
          return finishCapture();
        }
        append('(learning mode: export not persisted)\n');
        return finishCapture();
      }
      if (name === 'readlink') {
        const p = args[0];
        if (!p) { append('readlink: missing operand\n'); return finishCapture(); }
        append('readlink: learning mode — no symlinks simulated\n');
        return finishCapture();
      }
      if (name === 'sleep') {
        const n = parseFloat(args[0], 10) || 0;
        if (n <= 0) return finishCapture();
        append('(learning mode: sleep skipped)\n');
        return finishCapture();
      }
      if (name === 'time') {
        append('real    0m0.001s\nuser    0m0.000s\nsys     0m0.000s\n');
        return finishCapture();
      }
      if (name === 'shutdown' || name === 'reboot') {
        append('Learning mode: would ' + (name === 'reboot' ? 'reboot' : 'shutdown') + ' (no action).\n');
        return finishCapture();
      }

      // ---------- 文本/流处理：sed, awk, nl, paste, comm, fmt, fold ----------
      if (name === 'sed') {
        const script = args[0];
        const fileArg = args[1];
        let content = (fileArg === '-' || !fileArg) ? pipeStdin : null;
        if (content === null && fileArg) {
          const node = getNode(fileArg);
          if (node && node.type === 'file') content = String(node.content || '');
        }
        if (content === null && !pipeStdin && !fileArg) {
          append('sed: usage: sed script [file...] or command | sed script\n');
          return finishCapture();
        }
        if (content == null) content = '';
        if (script && script.startsWith('s/')) {
          const m = script.match(/^s\/(.*?)\/(.*?)\/(g?)$/);
          if (m) {
            const [_, a, b, g] = m;
            const regex = new RegExp(a.replace(/\\\//g, '/'), g ? 'g' : '');
            content = content.split('\n').map(l => l.replace(regex, b)).join('\n');
          }
        }
        append(content + (content && !content.endsWith('\n') ? '\n' : ''));
        return finishCapture();
      }
      if (name === 'awk') {
        const fileArg = args.find(a => !a.startsWith('-') && a !== '-' && getNode(a) && getNode(a).type === 'file');
        let content = pipeStdin || (fileArg ? String(getNode(fileArg).content || '') : '');
        if (!content && !fileArg && !pipeStdin) { append('awk: usage: awk [options] program [file...] or command | awk program\n'); return finishCapture(); }
        const lineStr = args.join(' ');
        const m = lineStr.match(/\$(\d+)/);
        const field = m ? m[1] : '1';
        const idx = parseInt(field, 10) - 1;
        const delim = /\s+/;
        content.split('\n').forEach(l => {
          const cols = l.split(delim).filter(Boolean);
          append((cols[idx] !== undefined ? cols[idx] : l) + '\n');
        });
        return finishCapture();
      }
      if (name === 'nl') {
        let content = pipeStdin;
        const fileArg = args.find(a => !a.startsWith('-') && a !== '-');
        if (content === '' && fileArg) {
          const node = getNode(fileArg);
          if (node && node.type === 'file') content = String(node.content || '');
        }
        if (!content && !fileArg) { append('nl: usage: nl [file...] or command | nl\n'); return finishCapture(); }
        content = (content || '').split('\n');
        content.forEach((l, i) => append(String(i + 1).padStart(6) + '  ' + l + '\n'));
        return finishCapture();
      }
      if (name === 'paste') {
        const files = args.filter(a => !a.startsWith('-'));
        const columns = [];
        if (pipeStdin) columns.push(pipeStdin.split('\n'));
        for (const f of files) {
          const node = getNode(f);
          if (node && node.type === 'file') columns.push(String(node.content || '').split('\n'));
        }
        if (!columns.length) { append('paste: usage: paste [-s] [file...] or command | paste -\n'); return finishCapture(); }
        const maxLen = Math.max(...columns.map(c => c.length), 0);
        for (let i = 0; i < maxLen; i++) append(columns.map(c => c[i] || '').join('\t') + '\n');
        return finishCapture();
      }
      if (name === 'comm') {
        const a = args[0], b = args[1];
        if (!a || !b) { append('comm: missing operand\n'); return finishCapture(); }
        const na = getNode(a), nb = getNode(b);
        if (!na || na.type !== 'file') { append(`comm: ${a}: No such file or directory\n`); return finishCapture(); }
        if (!nb || nb.type !== 'file') { append(`comm: ${b}: No such file or directory\n`); return finishCapture(); }
        const la = String(na.content || '').split('\n').map(s => s.trim()).filter(Boolean).sort();
        const lb = String(nb.content || '').split('\n').map(s => s.trim()).filter(Boolean).sort();
        const setB = new Set(lb);
        const setA = new Set(la);
        let i = 0, j = 0;
        while (i < la.length || j < lb.length) {
          const x = la[i], y = lb[j];
          if (i >= la.length) { append('\t' + y + '\n'); j++; continue; }
          if (j >= lb.length) { append('\t\t' + x + '\n'); i++; continue; }
          if (x === y) { append('\t\t\t' + x + '\n'); i++; j++; }
          else if (x < y) { append('\t\t' + x + '\n'); i++; }
          else { append('\t' + y + '\n'); j++; }
        }
        return finishCapture();
      }
      if (name === 'fmt' || name === 'fold') {
        let width = name === 'fold' ? 80 : 75;
        const wi = args.findIndex(a => a === '-w' || a === '-width');
        if (wi >= 0 && args[wi + 1]) width = parseInt(args[wi + 1], 10) || width;
        let content = pipeStdin;
        const fileArg = args.find(a => !a.startsWith('-') && a !== '-');
        if (content === '' && fileArg) {
          const node = getNode(fileArg);
          if (node && node.type === 'file') content = String(node.content || '');
        }
        content = content || '';
        if (name === 'fold') {
          const out = [];
          content.split('\n').forEach(l => { for (let i = 0; i < l.length; i += width) out.push(l.slice(i, i + width)); });
          append(out.join('\n') + '\n');
        } else {
          const out = [];
          content.split(/\s+/).filter(Boolean).forEach(w => {
            const last = out[out.length - 1];
            const line = last ? last + ' ' + w : w;
            if (line.length <= width) { if (last) out.pop(); out.push(line); } else { if (last) out.push(last); out.push(w); }
          });
          append(out.join('\n') + '\n');
        }
        return finishCapture();
      }

      // ---------- 压缩/归档：bzip2, bunzip2, xz, unxz, zip, unzip ----------
      if (name === 'bzip2' || name === 'bunzip2' || name === 'xz' || name === 'unxz') {
        append(name + ': learning mode — compression is simulated only.\n');
        return finishCapture();
      }
      if (name === 'zip') {
        if (!args.length) { append('zip: usage: zip [-r] output.zip file...\n'); return finishCapture(); }
        append('zip: learning mode — archive operations are simulated only.\n');
        return finishCapture();
      }
      if (name === 'unzip') {
        if (!args.length) { append('unzip: usage: unzip file.zip [-d dir]\n'); return finishCapture(); }
        append('unzip: learning mode — extract is simulated only.\n');
        return finishCapture();
      }

      // ---------- 校验/编码：md5sum, sha256sum, base64, od, xxd, hexdump ----------
      if (name === 'md5sum' || name === 'sha256sum') {
        const hashLen = name === 'md5sum' ? 32 : 64;
        function simpleHash(s) {
          let h = 0;
          for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) >>> 0;
          let hex = h.toString(16);
          while (hex.length < hashLen) hex += ((h + hex.length) >>> 0).toString(16);
          return hex.slice(0, hashLen);
        }
        const files = args.filter(a => a !== '-');
        if (!files.length && !pipeStdin) { append(name + ': missing file operand\n'); return finishCapture(); }
        if (pipeStdin) {
          append(simpleHash(pipeStdin) + '  -\n');
          return finishCapture();
        }
        for (const f of files) {
          const node = getNode(f);
          if (!node) append(name + ': ' + f + ': No such file or directory\n');
          else if (node.type !== 'file') append(name + ': ' + f + ': Is a directory\n');
          else append(simpleHash(String(node.content || '')) + '  ' + f + '\n');
        }
        return finishCapture();
      }
      if (name === 'base64') {
        const decode = args.includes('-d') || args.includes('--decode');
        let content = pipeStdin;
        const fileArg = args.find(a => !a.startsWith('-') && a !== '-');
        if (content === '' && fileArg) {
          const node = getNode(fileArg);
          if (node && node.type === 'file') content = String(node.content || '');
        }
        if (content === '' && !fileArg) { append('base64: usage: base64 [file] or command | base64 [-d]\n'); return finishCapture(); }
        content = content || '';
        try {
          if (decode) {
            const bin = atob(content.replace(/\s/g, ''));
            append(bin);
          } else append(btoa(content));
          if (!decode) append('\n');
        } catch (_) { append('base64: invalid input\n'); }
        return finishCapture();
      }
      if (name === 'od' || name === 'xxd' || name === 'hexdump') {
        let content = pipeStdin;
        const fileArg = args.find(a => !a.startsWith('-') && a !== '-');
        if (content === '' && fileArg) {
          const node = getNode(fileArg);
          if (node && node.type === 'file') content = String(node.content || '');
        }
        content = content || '';
        const bytes = new TextEncoder().encode(content).slice(0, 128);
        for (let i = 0; i < bytes.length; i += 16) {
          const chunk = bytes.slice(i, i + 16);
          const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
          append(hex + '\n');
        }
        return finishCapture();
      }

      // ---------- 网络/远程：host, traceroute, tracepath, ssh, scp, nc ----------
      if (name === 'host') {
        const domain = args[0] || 'example.com';
        append(domain + ' has address 93.184.216.34\n');
        return finishCapture();
      }
      if (name === 'traceroute' || name === 'tracepath') {
        const target = args[0] || 'example.com';
        append('traceroute to ' + target + ', 30 hops max\n');
        for (let i = 1; i <= 5; i++) append(' ' + i + '  127.0.0.' + i + '  0.1 ms\n');
        return finishCapture();
      }
      if (name === 'ssh' || name === 'scp') {
        append(name + ': learning mode — no real connection.\n');
        return finishCapture();
      }
      if (name === 'nc') {
        if (!pipeStdin && !args.length) {
          append('nc: usage: command | nc host port, or nc -l -p port\n');
          return finishCapture();
        }
        if (pipeStdin) append('(learning mode: stdin forwarded to ' + (args[0] || 'host') + ':' + (args[1] || '80') + ')\n');
        else append('nc: learning mode — no real connection.\n');
        append(pipeStdin || '');
        return finishCapture();
      }

      // ---------- 用户/权限/会话：su, useradd, userdel, usermod, last, lastlog, umask ----------
      if (name === 'su') {
        append('su: learning mode — switch user is simulated only.\n');
        return finishCapture();
      }
      if (name === 'useradd' || name === 'userdel' || name === 'usermod') {
        append(name + ': learning mode — user management is simulated only.\n');
        return finishCapture();
      }
      if (name === 'last' || name === 'lastlog') {
        append('star    pts/0    Mon Mar 18 00:00   still logged in\n');
        append('wtmp begins Mon Mar 18 00:00:00 2025\n');
        return finishCapture();
      }
      if (name === 'umask') {
        append('0022\n');
        return finishCapture();
      }

      // ---------- 作业/进程：jobs, bg, fg, nice, renice ----------
      if (name === 'jobs') {
        append('(learning mode: no background jobs)\n');
        return finishCapture();
      }
      if (name === 'bg' || name === 'fg') {
        append(name + ': learning mode — no job control.\n');
        return finishCapture();
      }
      if (name === 'nice' || name === 'renice') {
        append(name + ': learning mode — priority is simulated only.\n');
        return finishCapture();
      }

      // ---------- 内核/模块：lsmod, modinfo ----------
      if (name === 'lsmod') {
        append('Module                  Size  Used by\n');
        append('ext4                  123456  1\n');
        append('nf_conntrack           56789  2\n');
        return finishCapture();
      }
      if (name === 'modinfo') {
        const mod = args[0] || 'ext4';
        append('name:           ' + mod + '\n');
        append('description:    (learning mode)\n');
        return finishCapture();
      }

      // ---------- 计划任务/其它：crontab, bc, expr, watch, service ----------
      if (name === 'crontab') {
        if (args[0] === '-l') {
          append('# learning mode crontab\n');
          append('# no crontab for star\n');
          return finishCapture();
        }
        append('crontab: learning mode — install/list is simulated only.\n');
        return finishCapture();
      }
      if (name === 'bc') {
        let expr = pipeStdin || args.join(' ');
        if (!expr.trim()) { append('bc: usage: echo "1+2" | bc or bc -e "1+2"\n'); return finishCapture(); }
        try {
          const safe = expr.replace(/[^0-9+\-*/().%\s]/g, '');
          const result = Function('"use strict"; return (' + safe + ')')();
          append(String(result) + '\n');
        } catch (_) { append('(parse error)\n'); }
        return finishCapture();
      }
      if (name === 'expr') {
        if (args.length < 3) { append('expr: usage: expr arg op arg (e.g. expr 1 + 2)\n'); return finishCapture(); }
        const a = parseFloat(args[0], 10), b = parseFloat(args[2], 10);
        const op = args[1];
        let r = 0;
        if (op === '+') r = a + b; else if (op === '-') r = a - b; else if (op === '*') r = a * b; else if (op === '/') r = b ? a / b : 0; else if (op === '%') r = b ? a % b : 0;
        append(String(r) + '\n');
        return finishCapture();
      }
      if (name === 'watch') {
        append('watch: learning mode — periodic execution is simulated only.\n');
        return finishCapture();
      }
      if (name === 'service') {
        const svc = args[0], action = args[1] || 'status';
        if (!svc) { append('service: usage: service <name> {start|stop|restart|status}\n'); return finishCapture(); }
        append(' * ' + svc + ': ' + (action === 'status' ? 'running' : action) + ' (learning mode)\n');
        return finishCapture();
      }

      // ---------- 内建/Shell 已在上方；以下为 文本/查找/文件/用户/进程/网络/磁盘/其它 ----------
      if (name === 'join') {
        const a = args[0], b = args[1];
        if (!a || !b) { append('join: missing operand\n'); return finishCapture(); }
        const na = getNode(a), nb = getNode(b);
        if (!na || na.type !== 'file') { append(`join: ${a}: No such file or directory\n`); return finishCapture(); }
        if (!nb || nb.type !== 'file') { append(`join: ${b}: No such file or directory\n`); return finishCapture(); }
        const field = 1;
        const la = String(na.content || '').split('\n').map(l => l.split(/\s+/));
        const lb = String(nb.content || '').split('\n').map(l => l.split(/\s+/));
        const keyB = {};
        lb.forEach(p => { if (p[field - 1] != null) keyB[p[field - 1]] = p; });
        la.forEach(p => { const k = p[field - 1]; if (keyB[k]) append(p.join(' ') + ' ' + (keyB[k].slice(field) || []).join(' ') + '\n'); });
        return finishCapture();
      }
      if (name === 'pr') {
        let content = pipeStdin;
        const fileArg = args.find(a => !a.startsWith('-'));
        if (content === '' && fileArg) { const node = getNode(fileArg); if (node && node.type === 'file') content = String(node.content || ''); }
        content = content || '';
        content.split('\n').forEach((l, i) => append(String(i + 1).padStart(6) + ' ' + l + '\n'));
        return finishCapture();
      }
      if (name === 'split') {
        const nonOpt = args.filter(a => !a.startsWith('-'));
        const fileArg = nonOpt[0];
        const prefix = nonOpt[1] || 'x';
        if (!fileArg) { append('split: missing file operand\n'); return finishCapture(); }
        const node = getNode(fileArg);
        if (!node || node.type !== 'file') { append(`split: ${fileArg}: No such file or directory\n`); return finishCapture(); }
        const lines = String(node.content || '').split('\n');
        const n = Math.min(1000, Math.max(1, parseInt(args[args.indexOf('-l') + 1], 10) || 1000));
        const d = getNode(cwd);
        for (let i = 0; i < lines.length; i += n) {
          const chunk = lines.slice(i, i + n).join('\n');
          const idx = Math.floor(i / n);
          const suffix = String.fromCharCode(97 + Math.floor(idx / 26)) + String.fromCharCode(97 + (idx % 26));
          const base = prefix + suffix;
          if (d && d.type === 'dir') { d.children = d.children || {}; d.children[base] = { type: 'file', content: chunk }; initMeta(d.children[base]); }
        }
        append('(learning mode: split into ' + Math.ceil(lines.length / n) + ' file(s))\n');
        return finishCapture();
      }
      if (name === 'expand') {
        let content = pipeStdin;
        const fileArg = args.find(a => !a.startsWith('-'));
        if (content === '' && fileArg) { const node = getNode(fileArg); if (node && node.type === 'file') content = String(node.content || ''); }
        content = (content || '').replace(/\t/g, '        ');
        append(content + (content && !content.endsWith('\n') ? '\n' : ''));
        return finishCapture();
      }
      if (name === 'unexpand') {
        let content = pipeStdin;
        const fileArg = args.find(a => !a.startsWith('-'));
        if (content === '' && fileArg) { const node = getNode(fileArg); if (node && node.type === 'file') content = String(node.content || ''); }
        content = content || '';
        append(content.replace(/        /g, '\t') + (content && !content.endsWith('\n') ? '\n' : ''));
        return finishCapture();
      }
      if (name === 'column') {
        let content = pipeStdin;
        const fileArg = args.find(a => !a.startsWith('-'));
        if (content === '' && fileArg) { const node = getNode(fileArg); if (node && node.type === 'file') content = String(node.content || ''); }
        const rows = (content || '').split('\n').map(l => l.split(/\s+/).filter(Boolean));
        const cols = Math.max(...rows.map(r => r.length), 0);
        const w = 12;
        for (const row of rows) {
          append(row.map(c => String(c).slice(0, w).padEnd(w)).join(' ') + '\n');
        }
        return finishCapture();
      }
      if (name === 'strings') {
        const fileArg = args.find(a => !a.startsWith('-'));
        if (!fileArg) { append('strings: missing file operand\n'); return finishCapture(); }
        const node = getNode(fileArg);
        if (!node || node.type !== 'file') { append(`strings: ${fileArg}: No such file or directory\n`); return finishCapture(); }
        const s = String(node.content || '').replace(/[^\x20-\x7E\n]/g, ' ');
        s.split(/\s+/).filter(w => w.length >= 4).forEach(w => append(w + '\n'));
        return finishCapture();
      }
      if (name === 'sha1sum' || name === 'cksum') {
        const hashLen = name === 'sha1sum' ? 40 : 0;
        function simpleHash(s) {
          let h = 0;
          for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) >>> 0;
          if (name === 'cksum') return String(h) + ' ' + s.length;
          let hex = h.toString(16);
          while (hex.length < hashLen) hex += ((h + hex.length) >>> 0).toString(16);
          return hex.slice(0, hashLen);
        }
        const files = args.filter(a => a !== '-');
        if (!files.length && !pipeStdin) { append(name + ': missing file operand\n'); return finishCapture(); }
        if (pipeStdin) { append(simpleHash(pipeStdin) + (name === 'cksum' ? ' -' : '  -') + '\n'); return finishCapture(); }
        for (const f of files) {
          const node = getNode(f);
          if (!node) append(name + ': ' + f + ': No such file or directory\n');
          else if (node.type !== 'file') append(name + ': ' + f + ': Is a directory\n');
          else append(simpleHash(String(node.content || '')) + (name === 'cksum' ? ' ' + f : '  ' + f) + '\n');
        }
        return finishCapture();
      }
      if (name === 'iconv') {
        if (!args.length) { append('iconv: usage: iconv -f from -t to [file]\n'); return finishCapture(); }
        append('iconv: learning mode — conversion simulated.\n');
        return finishCapture();
      }
      if (name === 'whereis') {
        const cmd = args[0];
        if (!cmd) { append('whereis: missing program name\n'); return finishCapture(); }
        append(cmd + ': /usr/bin/' + cmd + ' /usr/share/man/man1/' + cmd + '.1.gz\n');
        return finishCapture();
      }
      if (name === 'locate') {
        const pattern = args[0] || '';
        if (!pattern) { append('locate: no pattern to search for\n'); return finishCapture(); }
        append('/usr/share/doc/' + pattern + '\n');
        append('/var/lib/' + pattern + '\n');
        return finishCapture();
      }
      if (name === 'whatis') {
        const cmd = args[0] || '';
        append(cmd + ' (1) - ' + (cmd ? 'manual page for ' + cmd : 'nothing appropriate') + '\n');
        return finishCapture();
      }
      if (name === 'apropos') {
        const key = args[0] || '';
        append(key + ' (1) - manual page for ' + key + '\n');
        return finishCapture();
      }
      if (name === 'install') {
        if (args.length < 2) { append('install: missing file operand\n'); return finishCapture(); }
        append('install: learning mode — copy/set attributes simulated.\n');
        return finishCapture();
      }
      if (name === 'mktemp') {
        const template = args[0] || '/tmp/tmp.XXXXXX';
        const base = template.replace(/X+$/, '12345');
        const full = resolvePath(base);
        const d = getNode(dirname(full));
        const b = basename(full);
        if (d && d.type === 'dir') { d.children = d.children || {}; d.children[b] = { type: 'file', content: '' }; initMeta(d.children[b]); append(resolvePath(base) + '\n'); }
        else append('/tmp/tmp.12345\n');
        return finishCapture();
      }
      if (name === 'sync') {
        append('sync: learning mode — no real sync.\n');
        return finishCapture();
      }
      if (name === 'chattr' || name === 'lsattr') {
        append(name + ': learning mode — extended attributes not simulated.\n');
        return finishCapture();
      }
      if (name === 'chsh') {
        append('chsh: learning mode — shell not changed.\n');
        return finishCapture();
      }
      if (name === 'finger') {
        append('Login: star     Name: Star User\n');
        append('Directory: /home/star   Shell: /bin/bash\n');
        return finishCapture();
      }
      if (name === 'getent') {
        const db = args[0], key = args[1];
        if (!db) { append('getent: missing database name\n'); return finishCapture(); }
        if (db === 'passwd') append('star:x:1000:1000:Star User:/home/star:/bin/bash\n');
        else if (db === 'group') append('star:x:1000:star\n');
        else append('getent: learning mode\n');
        return finishCapture();
      }
      if (name === 'pkill' || name === 'pgrep') {
        const pat = args[0] || '';
        if (name === 'pgrep') append(pat ? '101\n102\n' : '');
        else append(pat ? 'pkill: learning mode — would signal processes matching "' + pat + '"\n' : 'pkill: usage: pkill pattern\n');
        return finishCapture();
      }
      if (name === 'pidof') {
        const prog = args[0] || '';
        append(prog ? '101 102\n' : '');
        return finishCapture();
      }
      if (name === 'runlevel') {
        append('N 5\n');
        return finishCapture();
      }
      if (name === 'init') {
        append('init: learning mode — runlevel not changed.\n');
        return finishCapture();
      }
      if (name === 'journalctl') {
        let n = 50;
        const ni = args.indexOf('-n');
        if (ni >= 0 && args[ni + 1]) n = parseInt(args[ni + 1], 10) || 50;
        const tail = simJournalLines.slice(-Math.min(200, Math.max(1, n)));
        if (!tail.length) append('-- No entries --\n');
        else {
          tail.forEach(e => {
            const d = new Date(e.ts);
            append(d.toISOString().replace('T', ' ').slice(0, 19) + ' ' + e.unit + ': ' + e.msg + '\n');
          });
        }
        return finishCapture();
      }
      if (name === 'sftp' || name === 'ftp' || name === 'telnet') {
        append(name + ': learning mode — no real connection.\n');
        return finishCapture();
      }
      if (name === 'fdisk' || name === 'parted') {
        append(name + ': learning mode — partition table not modified.\n');
        return finishCapture();
      }
      if (name === 'blkid') {
        append('/dev/sda1: UUID="a1b2c3d4" TYPE="ext4" PARTUUID="0001"\n');
        append('/dev/sda2: UUID="e5f6g7h8" TYPE="swap"\n');
        return finishCapture();
      }
      if (name === 'lspci') {
        append('00:00.0 Host bridge: Intel Corp. Device 1234\n');
        append('00:02.0 VGA compatible controller: Intel Corp. HD Graphics\n');
        return finishCapture();
      }
      if (name === 'lsusb') {
        append('Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub\n');
        return finishCapture();
      }
      if (name === 'lscpu') {
        append('Architecture:        x86_64\n');
        append('CPU(s):               4\n');
        append('Model name:           Learning CPU\n');
        return finishCapture();
      }
      if (name === 'dd') {
        append('dd: learning mode — no real block copy (dangerous).\n');
        return finishCapture();
      }
      if (name === 'script') {
        append('Script started, file is typescript (learning mode)\n');
        return finishCapture();
      }
      if (name === 'disown') {
        append('disown: learning mode — no job control.\n');
        return finishCapture();
      }
      if (name === 'fc') {
        if (!cmdHistory.length) append('fc: no history\n');
        else append(cmdHistory.slice(-5).join('\n') + '\n');
        return finishCapture();
      }

      // ---------- 扩展：编辑器/解释器/包管理/网络/调试等（多数为 learning mode） ----------
      if (name === 'vi' || name === 'vim' || name === 'nano' || name === 'emacs') {
        append(name + ': learning mode — use a real editor on a full Linux system.\n');
        return finishCapture();
      }
      if (name === 'sh' || name === 'bash' || name === 'dash') {
        append(name + ': learning mode — no nested shell interpreter.\n');
        return finishCapture();
      }
      if (name === 'python' || name === 'python3' || name === 'node' || name === 'perl' || name === 'ruby' || name === 'php') {
        append(name + ': learning mode — interpreter not embedded.\n');
        return finishCapture();
      }
      if (name === 'make' || name === 'gcc' || name === 'g++' || name === 'clang') {
        append(name + ': learning mode — build toolchain not embedded.\n');
        return finishCapture();
      }
      if (name === 'builtin') {
        append('builtin: learning mode — use command name directly.\n');
        return finishCapture();
      }
      if (name === 'hash') {
        append('hash: learning mode — hash table empty\n');
        return finishCapture();
      }
      if (name === 'local') {
        append('local: learning mode — only valid in a function\n');
        return finishCapture();
      }
      if (name === 'trap') {
        append('trap: learning mode — signal traps not implemented\n');
        return finishCapture();
      }
      if (name === 'getopts') {
        append('getopts: learning mode — use in shell scripts on a real bash\n');
        return finishCapture();
      }
      if (name === 'shopt') {
        append('shopt: learning mode — shell options not applied\n');
        return finishCapture();
      }
      if (name === 'bind') {
        append('bind: learning mode — readline bindings not implemented\n');
        return finishCapture();
      }
      if (name === 'compgen' || name === 'complete' || name === 'compopt') {
        append(name + ': learning mode — programmable completion not implemented\n');
        return finishCapture();
      }
      if (name === 'caller') {
        append('caller: learning mode — not in a function\n');
        return finishCapture();
      }
      if (name === 'return') {
        append('return: learning mode — only valid in a function\n');
        return finishCapture();
      }
      if (name === 'shift') {
        append('shift: learning mode — positional parameters not modeled\n');
        return finishCapture();
      }
      if (name === 'break' || name === 'continue') {
        append(name + ': learning mode — only valid in a loop\n');
        return finishCapture();
      }
      if (name === 'tac') {
        const fileArg = args.find(a => !a.startsWith('-') && a !== '-');
        let content = pipeStdin;
        if (content === '' && fileArg) {
          const node = getNode(fileArg);
          if (node && node.type === 'file') content = String(node.content || '');
        }
        if (content === '' && !fileArg && !pipeStdin) { append('tac: missing file operand\n'); return finishCapture(); }
        const lines = (content || '').split('\n');
        if (lines.length && lines[lines.length - 1] === '') lines.pop();
        append(lines.reverse().join('\n') + (lines.length ? '\n' : ''));
        return finishCapture();
      }
      if (name === 'rev') {
        let content = pipeStdin;
        const fileArg = args.find(a => !a.startsWith('-') && a !== '-');
        if (content === '' && fileArg) {
          const node = getNode(fileArg);
          if (node && node.type === 'file') content = String(node.content || '');
        }
        if (content === '' && !fileArg && !pipeStdin) { append('rev: missing file operand\n'); return finishCapture(); }
        append((content || '').split('\n').map(l => l.split('').reverse().join('')).join('\n') + '\n');
        return finishCapture();
      }
      if (name === 'shuf') {
        let content = pipeStdin;
        const fileArg = args.find(a => !a.startsWith('-') && a !== '-');
        if (content === '' && fileArg) {
          const node = getNode(fileArg);
          if (node && node.type === 'file') content = String(node.content || '');
        }
        if (content === '' && !fileArg && !pipeStdin) { append('shuf: missing file operand\n'); return finishCapture(); }
        const lines = (content || '').split('\n');
        if (lines.length && lines[lines.length - 1] === '') lines.pop();
        for (let i = lines.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const t = lines[i]; lines[i] = lines[j]; lines[j] = t;
        }
        append(lines.join('\n') + (lines.length ? '\n' : ''));
        return finishCapture();
      }
      if (name === 'csplit') {
        append('csplit: learning mode — context split not implemented (use split)\n');
        return finishCapture();
      }
      if (name === 'stdbuf' || name === 'timeout' || name === 'ionice') {
        append(name + ': learning mode — process wrapper not implemented\n');
        return finishCapture();
      }
      if (name === 'zcat' || name === 'bzcat' || name === 'xzcat') {
        append(name + ': learning mode — compressed stream read not implemented\n');
        return finishCapture();
      }
      if (name === '7z' || name === 'rar') {
        append(name + ': learning mode — archive format not implemented\n');
        return finishCapture();
      }
      if (name === 'apt' || name === 'apt-get') {
        const sub = (args[0] || '').toLowerCase();
        const rest = args.slice(1);
        if (sub === 'update' || (name === 'apt-get' && sub === 'update')) {
          append('Hit:1 http://deb.debian.org/debian bookworm InRelease\n');
          append('Reading package lists... Done\n');
          simJournalPush('apt: simulated package index update', 'apt');
          return finishCapture();
        }
        if (sub === 'upgrade' || sub === 'dist-upgrade' || sub === 'full-upgrade') {
          append('0 upgraded, 0 newly installed, 0 to remove (simulated).\n');
          simJournalPush('apt: simulated upgrade check', 'apt');
          return finishCapture();
        }
        if (sub === 'install' || (name === 'apt-get' && sub === 'install')) {
          const pkgs = rest.filter(a => !a.startsWith('-'));
          if (!pkgs.length) { append('apt: missing package name\n'); return finishCapture(); }
          pkgs.forEach(pkg => {
            const meta = simPkgPool.find(x => x.n === pkg);
            if (simPkgInstalled.has(pkg)) append(pkg + ' is already the newest version (simulated).\n');
            else if (meta) {
              simPkgInstalled.set(pkg, meta.v);
              append('Setting up ' + pkg + ' (' + meta.v + ') ...\n');
              simJournalPush('installed package ' + pkg + ' ' + meta.v, 'apt');
            } else append('E: Unable to locate package ' + pkg + ' (simulated catalog)\n');
          });
          return finishCapture();
        }
        if (sub === 'remove' || sub === 'purge' || (name === 'apt-get' && (sub === 'remove' || sub === 'purge'))) {
          const pkgs = rest.filter(a => !a.startsWith('-'));
          pkgs.forEach(pkg => {
            if (simPkgProtected.has(pkg)) append('Refusing to remove essential package ' + pkg + ' (simulated).\n');
            else if (simPkgInstalled.has(pkg)) {
              simPkgInstalled.delete(pkg);
              append('Removing ' + pkg + ' ...\n');
              simJournalPush('removed package ' + pkg, 'apt');
            } else append('Package \'' + pkg + '\' is not installed (simulated).\n');
          });
          return finishCapture();
        }
        if (sub === 'search') {
          const q = (rest[0] || '').toLowerCase();
          let any = false;
          simPkgPool.forEach(m => {
            if (!q || m.n.includes(q) || m.desc.toLowerCase().includes(q)) {
              append(m.n + '/' + m.v + ' ' + m.desc + '\n');
              any = true;
            }
          });
          if (!any) append('(no matches in simulated catalog)\n');
          return finishCapture();
        }
        if (sub === 'show') {
          const pkg = rest[0];
          const meta = simPkgPool.find(x => x.n === pkg);
          const ver = simPkgInstalled.get(pkg);
          if (meta || ver) {
            append('Package: ' + pkg + '\n');
            append('Version: ' + (ver || meta.v) + '\n');
            if (meta) append('Description: ' + meta.desc + '\n');
            append('Status: ' + (ver ? 'install ok installed' : 'not installed (available)') + '\n');
          } else append('E: No packages found (simulated)\n');
          return finishCapture();
        }
        if (sub === 'list' && rest[0] === '--installed') {
          Array.from(simPkgInstalled.keys()).sort().forEach(p => append(p + '/' + simPkgInstalled.get(p) + ' installed\n'));
          return finishCapture();
        }
        append('apt: simulated — try: update, install PKG, remove PKG, search TERM, show PKG, list --installed\n');
        return finishCapture();
      }
      if (name === 'dpkg') {
        const sub = args[0] || '';
        if (sub === '-l' || sub === '--list') {
          append('Desired=Unknown/Install/Remove/Purge/Hold\n');
          append('| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend\n');
          Array.from(simPkgInstalled.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([p, v]) => {
            append('ii  ' + p.padEnd(14) + ' ' + v.padEnd(16) + ' amd64        (simulated)\n');
          });
          return finishCapture();
        }
        if (sub === '-s' || sub === '--status') {
          const pkg = args[1];
          const v = simPkgInstalled.get(pkg);
          if (!v) { append('dpkg-query: package \'' + pkg + '\' is not installed\n'); return finishCapture(); }
          append('Package: ' + pkg + '\n');
          append('Status: install ok installed\n');
          append('Version: ' + v + '\n');
          return finishCapture();
        }
        append('dpkg: simulated — try: -l, -s package\n');
        return finishCapture();
      }
      if (name === 'yum' || name === 'dnf') {
        const sub = (args[0] || '').toLowerCase();
        if (sub === 'list' && args[1] === 'installed') {
          Array.from(simPkgInstalled.keys()).sort().forEach(p => append(p + '.' + simPkgInstalled.get(p) + '\n'));
          return finishCapture();
        }
        append(name + ': simulated — try: list installed (same package set as apt)\n');
        return finishCapture();
      }
      if (name === 'rpm') {
        if (args[0] === '-qa') {
          Array.from(simPkgInstalled.keys()).sort().forEach(p => append(p + '-' + simPkgInstalled.get(p) + '.x86_64\n'));
          return finishCapture();
        }
        append('rpm: simulated — try: -qa\n');
        return finishCapture();
      }
      if (name === 'pacman') {
        if (args[0] === '-Q') {
          Array.from(simPkgInstalled.keys()).sort().forEach(p => append(p + ' ' + simPkgInstalled.get(p) + '\n'));
          return finishCapture();
        }
        append('pacman: simulated — try: -Q\n');
        return finishCapture();
      }
      if (name === 'snap' || name === 'flatpak') {
        append(name + ': simulated — no packages listed (use apt for demo)\n');
        return finishCapture();
      }
      if (name === 'ping6') {
        const host = args[0] || '::1';
        append(`PING6 ${host}: 56 data bytes\n64 bytes from ::1: icmp_seq=0 time=0.1 ms\n(learning mode)\n`);
        return finishCapture();
      }
      if (name === 'traceroute6') {
        append('traceroute6 to ::1, 30 hops max\n 1  ::1  0.1 ms\n(learning mode)\n');
        return finishCapture();
      }
      if (name === 'mtr') {
        append('Start: ' + (new Date().toISOString()) + ' (simulated)\n');
        append('HOST: example.com  Loss%   Snt   Last   Avg  Best  Wrst StDev\n');
        append('  1.|-- gateway.local      0.0%    10    0.5   0.4   0.3   0.8   0.1\n');
        append('  2.|-- isp-core.net       0.0%    10    8.2   7.5   6.1  12.0   1.8\n');
        append('  3.|-- example.com        0.0%    10   42.1  40.0  38.0  55.0   4.2\n');
        return finishCapture();
      }
      if (name === 'iptables' || name === 'nft' || name === 'firewall-cmd') {
        append(name + ': learning mode — firewall not modified\n');
        return finishCapture();
      }
      if (name === 'nmcli') {
        const sub = args[0] || '';
        if (sub === 'device' && (args[1] === 'status' || args[1] === 'show')) {
          append('DEVICE  TYPE      STATE      CONNECTION\n');
          append('eth0    ethernet  connected  Wired connection 1\n');
          append('wlan0   wifi      connected  StarWiFi\n');
          append('lo      loopback  connected  (loopback)\n');
          return finishCapture();
        }
        if (sub === 'general' && args[1] === 'status') {
          append('STATE      CONNECTED\n');
          append('connectivity full\n');
          return finishCapture();
        }
        append('nmcli: simulated — try: device status, general status\n');
        return finishCapture();
      }
      if (name === 'iwconfig') {
        append('lo        no wireless extensions.\n');
        append('eth0      no wireless extensions.\n');
        append('wlan0     IEEE 802.11  ESSID:"StarWiFi"  Mode:Managed  (simulated)\n');
        return finishCapture();
      }
      if (name === 'iw') {
        append('Usage: iw [options] command (simulated)\n');
        append('Try: iw dev wlan0 link → connected to StarWiFi (simulated)\n');
        return finishCapture();
      }
      if (name === 'resolvectl') {
        if (!args.length || args[0] === 'status') {
          append('Global\n');
          append('       Protocols: +LLMNR -mDNS +DNSOverTLS DNSSEC=no/unsupported\n');
          append('Current DNS Server: 127.0.0.53\n');
          append('Fallback DNS Servers: 8.8.8.8\n');
          return finishCapture();
        }
        if (args[0] === 'query' && args[1]) {
          append(args[1] + ': 93.184.216.34\n');
          return finishCapture();
        }
        append('resolvectl: simulated — try: status, query HOST\n');
        return finishCapture();
      }
      if (name === 'rsync' || name === 'socat') {
        append(name + ': learning mode — no real sync/socket relay\n');
        return finishCapture();
      }
      if (name === 'openssl') {
        const sub = args[0] || '';
        if (!sub || sub === 'version' || sub === 'help') {
          append('OpenSSL 3.0.12 30 Jan 2024 (simulated)\n');
          return finishCapture();
        }
        if (sub === 'dgst') {
          let algo = 'sha256';
          let fileArg = null;
          for (let i = 1; i < args.length; i++) {
            if (args[i] === '-sha256' || args[i] === '-sha1') algo = args[i].slice(1);
            else if (!args[i].startsWith('-')) { fileArg = args[i]; break; }
          }
          if (!fileArg) { append('openssl: dgst: missing file\n'); return finishCapture(); }
          const node = getNode(fileArg);
          if (!node || node.type !== 'file') { append('openssl: ' + fileArg + ': No such file\n'); return finishCapture(); }
          const body = String(node.content || '');
          let h = 0;
          for (let i = 0; i < body.length; i++) h = ((h << 5) - h + body.charCodeAt(i)) >>> 0;
          const hex = h.toString(16);
          const out = algo === 'sha1' ? (hex + '0'.repeat(40)).slice(0, 40) : (hex + '0'.repeat(64)).slice(0, 64);
          append(out + '  ' + fileArg + '\n');
          return finishCapture();
        }
        if (sub === 'enc') {
          append('openssl enc: simulated — use base64 command for simple encode/decode\n');
          return finishCapture();
        }
        append('openssl: simulated — try: version, dgst -sha256 FILE\n');
        return finishCapture();
      }
      if (name === 'gpg') {
        append('gpg: simulated — no keyring; use openssl dgst for checksum demo\n');
        return finishCapture();
      }
      if (name === 'htop') {
        append('  PID USER PRI NI  VIRT   RES S  CPU% MEM%   TIME+  COMMAND\n');
        append('    1 root 20   0  100M  8.2M S   0.0  0.1   0:00.12 systemd\n');
        append('  412 star 20   0   12M  3.1M S   1.2  0.4   0:00.45 bash\n');
        append('  501 star 20   0  200M 45.0M S   5.0  2.8   0:12.34 electron\n');
        append('(simulated snapshot — not live refresh)\n');
        return finishCapture();
      }
      if (name === 'vmstat') {
        append('procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----\n');
        append(' r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st\n');
        append(' 1  0      0 2048000 12345 456789    0    0     4     8  120  200  5  2 93  0  0\n');
        return finishCapture();
      }
      if (name === 'iostat') {
        append('Device            tps    kB_read/s    kB_wrtn/s\n');
        append('sda               12.3       80.0        40.0\n');
        return finishCapture();
      }
      if (name === 'sar' || name === 'perf') {
        append(name + ': simulated — use vmstat/iostat for static demo\n');
        return finishCapture();
      }
      if (name === 'strace' || name === 'ltrace' || name === 'gdb') {
        append(name + ': learning mode — debugger/tracer not embedded\n');
        return finishCapture();
      }
      if (name === 'sysctl') {
        if (!args.length) { append('sysctl: missing argument\n'); return finishCapture(); }
        if (args[0] === '-a' || args[0] === '-A') {
          Object.keys(simSysctl).sort().forEach(k => append(k + ' = ' + simSysctl[k] + '\n'));
          return finishCapture();
        }
        if (args[0] === '-w' && args[1]) {
          const kv = args[1].split('=');
          if (kv.length >= 2) {
            const k = kv[0].trim();
            const v = kv.slice(1).join('=').trim();
            simSysctl[k] = v;
            append(k + ' = ' + v + '\n');
            simJournalPush('sysctl -w ' + k + '=' + v, 'kernel');
          }
          return finishCapture();
        }
        const k = args[0];
        if (simSysctl[k] !== undefined) append(k + ' = ' + simSysctl[k] + '\n');
        else append('sysctl: cannot stat ' + k + ' (simulated)\n');
        return finishCapture();
      }
      if (name === 'loginctl') {
        if ((args[0] || '') === 'list-sessions') {
          append('SESSION UID USER SEAT  TTY\n');
          append('c1      1000 star seat0 pts/0\n');
          return finishCapture();
        }
        append('loginctl: simulated — try: list-sessions\n');
        return finishCapture();
      }
      if (name === 'timedatectl') {
        append('               Local time: ' + (new Date().toString()) + '\n');
        append('           Universal time: ' + (new Date().toUTCString()) + '\n');
        append('                 RTC time: n/a (simulated)\n');
        append('                Time zone: Asia/Shanghai (simulated)\n');
        return finishCapture();
      }
      if (name === 'hostnamectl') {
        append(' Static hostname: learn-linux\n');
        append('       Icon name: computer-vm\n');
        append('      Machine ID: a1b2c3d4e5f6 (simulated)\n');
        return finishCapture();
      }
      if (name === 'busctl') {
        append('NAME           PID PROCESS         USER\n');
        append(':1.0          1 systemd         root\n');
        append('org.freedesktop.DBus 1 dbus-daemon root\n');
        return finishCapture();
      }
      if (name === 'systemd-run') {
        append('systemd-run: simulated — would start transient unit\n');
        simJournalPush('systemd-run ' + args.join(' '), 'systemd');
        return finishCapture();
      }
      if (name === 'logger') {
        const msg = args.join(' ') || 'empty message';
        simJournalPush(msg, 'logger');
        append('(logged to simulated journal — use journalctl)\n');
        return finishCapture();
      }
      if (name === 'groupadd' || name === 'groupdel' || name === 'groupmod' || name === 'newgrp' || name === 'gpasswd' || name === 'visudo') {
        append(name + ': learning mode — group/sudo policy not modified\n');
        return finishCapture();
      }
      if (name === 'mkfs' || name === 'fsck' || name === 'e2fsck' || name === 'tune2fs' || name === 'resize2fs') {
        append(name + ': learning mode — filesystem operations not performed\n');
        return finishCapture();
      }
      if (name === 'swapon' || name === 'swapoff') {
        append(name + ': learning mode — swap not modified\n');
        return finishCapture();
      }
      if (name === 'tree') {
        let maxD = 3;
        let target = '.';
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-L' && args[i + 1]) { maxD = parseInt(args[i + 1], 10) || 3; i++; }
          else if (!args[i].startsWith('-')) target = args[i];
        }
        const rootPath = target === '.' ? cwd : resolvePath(target);
        const rootNode = getNode(rootPath);
        if (!rootNode || rootNode.type !== 'dir') { append(`tree: ${target}: Not a directory\n`); return finishCapture(); }
        const walk = (p, pref, depth) => {
          const n = getNode(p);
          if (!n || n.type !== 'dir') return;
          const items = Object.keys(n.children || {}).sort();
          items.forEach((nm, idx) => {
            const isLast = idx === items.length - 1;
            const branch = isLast ? '└── ' : '├── ';
            append(pref + branch + nm + '\n');
            const ch = n.children[nm];
            if (ch.type === 'dir' && depth < maxD) walk(resolvePath(p + '/' + nm), pref + (isLast ? '    ' : '│   '), depth + 1);
          });
        };
        append(rootPath + '\n');
        walk(rootPath, '', 1);
        return finishCapture();
      }
      if (name === 'readelf' || name === 'ldd' || name === 'nm' || name === 'objdump' || name === 'strip' || name === 'ar') {
        append(name + ': learning mode — binary utilities simulated only\n');
        return finishCapture();
      }
      if (name === 'poweroff' || name === 'halt') {
        append('Learning mode: would ' + name + ' (no action).\n');
        return finishCapture();
      }
      if (name === 'users') {
        append('star\n');
        return finishCapture();
      }
      if (name === 'mesg') {
        append('is y\n');
        return finishCapture();
      }
      if (name === 'wall' || name === 'write') {
        append(name + ': learning mode — no real tty broadcast\n');
        return finishCapture();
      }
      if (name === 'info') {
        append('info: learning mode — GNU Info not installed; try: help or man\n');
        return finishCapture();
      }

      // Redirect some "learning-mode" commands to dedicated simulated terminals.
      // (So linux-shell can teach docker/redis without missing those commands.)
      if (name === 'docker' || name === 'docker-compose') {
        try {
          if (window.StarAppsRegistry && typeof window.StarAppsRegistry.open === 'function') {
            window.StarAppsRegistry.open('docker-shell');
          }
        } catch (_) {}
        const dockerCmd = (name === 'docker-compose')
          ? ('docker compose ' + args.join(' ')).trim()
          : s;
        append('Redirected to docker-shell (learning mode). In that window, run: ' + dockerCmd + '\n');
        return finishCapture();
      }
      if (name === 'redis-cli' || name === 'redis-server' || name === 'redis') {
        try {
          if (window.StarAppsRegistry && typeof window.StarAppsRegistry.open === 'function') {
            window.StarAppsRegistry.open('redis-cli');
          }
        } catch (_) {}
        if (name === 'redis-server') {
          append('Redirected to redis-cli (learning mode). redis-server is simulated automatically here. Try: HELP or PING\n');
        } else {
          const redisSubCmd = args.length ? args.join(' ') : 'HELP';
          append('Redirected to redis-cli (learning mode). In that window, run: ' + redisSubCmd + '\n');
        }
        return finishCapture();
      }

      // 未实现命令：给出接近真实 bash 的报错
      append(`bash: ${name}: command not found\n`);
      return finishCapture();
    }

    append(tr('linuxShellGreeting', 'Linux shell learning mode (simulated).') + '\n');
    append(tr('linuxShellHelpHint', 'Try ls, cd, pwd, cat, echo, ...') + '\n\n');
    simJournalPush('Linux learning shell session started (simulated).', 'systemd[1]');
    printPrompt();

    function handle(line) {
      const trimmed = String(line || '').trim();
      if (trimmed) cmdHistory.push(trimmed);
      append(`${linuxPrompt()} ${line}\n`);
      const segments = splitPipeline(line);
      if (segments.length > 1) {
        let stdin = '';
        for (let i = 0; i < segments.length; i++) {
          const out = cmdLinux(segments[i], { stdin: stdin, capture: true });
          stdin = out != null ? out : '';
        }
        if (stdin) append(stdin);
      } else {
        cmdLinux(line);
      }
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handle(input.value);
          input.value = '';
        }
      });
      setTimeout(() => { try { input.focus(); } catch (_) {} }, 50);
    }
  },

  'docker-shell'(container) {
    if (!container) return;
    const output = container.querySelector('#docker-output');
    const input = container.querySelector('#docker-input');
    const promptEl = container.querySelector('#docker-prompt');

    const tr = (key, fallback) => {
      try {
        if (typeof t === 'function') {
          const v = t(key);
          return v === key ? fallback : v;
        }
      } catch (_) {}
      return fallback;
    };

    function append(text) {
      if (!output) return;
      output.appendChild(document.createTextNode(text));
      output.scrollTop = output.scrollHeight;
    }

    const STORAGE_KEY = 'star-docker-v1';
    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch (_) { return null; }
    }
    function saveState() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    }
    const state = loadState() || {
      images: [
        { repository: 'ubuntu', tag: '22.04', id: 'sha256:ubuntu2204', size: '77MB' },
        { repository: 'nginx', tag: 'latest', id: 'sha256:nginxlatest', size: '133MB' },
      ],
      containers: [], // {id,name,image,status,ports,createdAt,rm}
      networks: [{ name: 'bridge', driver: 'bridge', scope: 'local' }],
      volumes: [{ name: 'learn-data', driver: 'local' }],
      nextId: 1,
      contexts: [{ name: 'default', description: 'Default endpoint', dockerHost: 'unix:///var/run/docker.sock', current: true }],
      swarm: { active: false, advertiseAddr: '', nodes: [], services: [], stacks: [] },
      secrets: [],
      configs: [],
      plugins: [{ name: 'vieus/sshfs', enabled: true, version: '1.0.0' }],
    };
    if (!Array.isArray(state.images)) state.images = [];
    if (!Array.isArray(state.containers)) state.containers = [];
    if (!Array.isArray(state.networks)) state.networks = [{ name: 'bridge', driver: 'bridge', scope: 'local' }];
    if (!Array.isArray(state.volumes)) state.volumes = [{ name: 'learn-data', driver: 'local' }];
    if (!Number.isInteger(state.nextId) || state.nextId < 1) state.nextId = 1;
    if (!state.contexts) state.contexts = [{ name: 'default', description: 'Default endpoint', dockerHost: 'unix:///var/run/docker.sock', current: true }];
    if (!state.swarm) state.swarm = { active: false, advertiseAddr: '', nodes: [], services: [], stacks: [] };
    if (!Array.isArray(state.secrets)) state.secrets = [];
    if (!Array.isArray(state.configs)) state.configs = [];
    if (!Array.isArray(state.plugins)) state.plugins = [{ name: 'vieus/sshfs', enabled: true, version: '1.0.0' }];
    state.networks.forEach(n => { if (!n.id) n.id = 'net_' + Math.random().toString(36).slice(2, 12); });
    state.volumes.forEach(v => { if (!v.mountpoint) v.mountpoint = '/var/lib/docker/volumes/' + v.name + '/_data'; });
    state.containers.forEach(c => { if (!Array.isArray(c.attachedNetworks)) c.attachedNetworks = ['bridge']; });

    function dockerPrompt() {
      return 'docker@learn:~$';
    }
    function printPrompt() {
      if (promptEl) promptEl.textContent = dockerPrompt();
    }

    function shortId(id) {
      return String(id).slice(0, 12);
    }

    function formatPs(all) {
      const list = all ? state.containers : state.containers.filter(c => c.status.startsWith('Up'));
      append('CONTAINER ID   IMAGE          COMMAND       STATUS         NAMES\n');
      list.forEach(c => {
        append(`${shortId(c.id).padEnd(13)} ${String(c.image).padEnd(13)} "bash"        ${c.status.padEnd(13)} ${c.name}\n`);
      });
    }
    function findContainer(t) {
      return state.containers.find(cn => cn.name === t || shortId(cn.id) === t || cn.id === t) || null;
    }
    function findNetwork(t) {
      return state.networks.find(n => n.name === t || shortId(n.id || '') === t || n.id === t) || null;
    }
    function findVolume(t) {
      return state.volumes.find(v => v.name === t) || null;
    }
    function parseImageRef(ref) {
      const s = String(ref || '');
      const [repo, tag] = s.includes(':') ? s.split(':') : [s, 'latest'];
      return { repository: repo || s, tag: tag || 'latest' };
    }
    function ensureImage(ref) {
      const { repository, tag } = parseImageRef(ref);
      const found = state.images.find(i => i.repository === repository && String(i.tag) === String(tag));
      if (found) return found;
      const id = `sha256:${repository}-${tag}-${Math.random().toString(16).slice(2, 10)}`;
      const img = { repository, tag, id, size: '120MB' };
      state.images.push(img);
      saveState();
      return img;
    }

    function cmdDocker(line) {
      const raw = String(line || '');
      const s = raw.trim();
      if (!s) return;
      const parts = s.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      const base = parts[0];
      if (base !== 'docker') {
        append(`bash: ${base}: command not found\n`);
        return;
      }
      const args = parts.slice(1);
      const sub = (args[0] || '').toLowerCase();

      if (!sub || sub === 'help') {
        append('\nUsage: docker [COMMAND]\n\nCommon commands (learning shell):\n');
        append('  ps / images / info / version\n');
        append('  build / tag / pull / push / login / logout\n');
        append('  save / load / export / import / manifest / trust\n');
        append('  buildx / builder (stub)\n');
        append('  run / start / stop / restart / kill / pause / unpause / rm\n');
        append('  attach / wait / update\n');
        append('  logs / exec / inspect / stats / top / port / cp / commit\n');
        append('  history / search / events\n');
        append('  network ls|create|rm|connect|disconnect|inspect\n');
        append('  volume ls|create|rm|inspect\n');
        append('  system df|prune|info   context ls|use\n');
        append('  plugin ls|enable|disable   scan / sbom\n');
        append('  swarm / node / service / stack / secret / config\n');
        append('  compose up|down\n');
        append('  rmi          Remove image(s)\n\n');
        return;
      }

      if (sub === 'version') {
        append('Docker version 25.0.0, build learnmode\n');
        return;
      }
      if (sub === 'info') {
        const ctx = state.contexts.find(c => c.current) || state.contexts[0];
        append('Client:\n');
        append(` Context:    ${ctx ? ctx.name : 'default'}\n`);
        append(' Debug Mode: false\n');
        append(` Plugins:\n  Volume: local\n  Network: bridge host null overlay\n`);
        append('\nServer:\n');
        append(' Containers: ' + state.containers.length + '\n');
        append('  Running: ' + state.containers.filter(c => c.status.startsWith('Up')).length + '\n');
        append('  Paused: 0\n');
        append('  Stopped: ' + state.containers.filter(c => !c.status.startsWith('Up')).length + '\n');
        append(' Images: ' + state.images.length + '\n');
        append(' Server Version: 25.0.0\n');
        append(' Storage Driver: overlay2 (simulated)\n');
        append(' Logging Driver: json-file\n');
        append(' Cgroup Driver: cgroupfs\n');
        append(' Plugins:\n  Volume: local\n  Network: bridge host overlay macvlan\n');
        append(' Swarm: ' + (state.swarm.active ? 'active' : 'inactive') + '\n');
        append(' Operating System: Linux (simulated)\n');
        append(' OSType: linux\n');
        append(' Architecture: x86_64\n');
        append(' CPUs: 4\n');
        append(' Total Memory: 7.7GiB\n');
        append(' Docker Root Dir: /var/lib/docker (simulated)\n');
        return;
      }

      if (sub === 'images' || (sub === 'image' && (args[1] || '').toLowerCase() === 'ls')) {
        append('REPOSITORY      TAG       IMAGE ID       SIZE\n');
        state.images.forEach(img => {
          append(`${img.repository.padEnd(14)} ${String(img.tag).padEnd(8)} ${shortId(img.id).padEnd(13)} ${img.size}\n`);
        });
        return;
      }

      if (sub === 'build') {
        // docker build [-t name:tag] PATH
        let tagRef = null;
        const rest = args.slice(1);
        let pathArg = null;
        for (let i = 0; i < rest.length; i++) {
          const a = rest[i];
          if ((a === '-t' || a === '--tag') && i + 1 < rest.length) { tagRef = rest[++i]; continue; }
          if (a.startsWith('-')) continue;
          pathArg = a;
        }
        if (!pathArg) { append('docker: "build" requires a build context PATH\n'); return; }
        const ref = tagRef || 'learn/build:latest';
        const created = ensureImage(ref);
        append(`Sending build context to Docker daemon  5.12kB\n`);
        append(`Step 1/1 : FROM ${created.repository}:${created.tag}\n`);
        append(' ---> Using cache\n');
        append(`Successfully built ${shortId(created.id)}\n`);
        append(`Successfully tagged ${created.repository}:${created.tag}\n`);
        return;
      }

      if (sub === 'tag') {
        // docker tag SOURCE_IMAGE TARGET_IMAGE
        const src = args[1];
        const dst = args[2];
        if (!src || !dst) { append('docker: "tag" requires SOURCE_IMAGE and TARGET_IMAGE\n'); return; }
        const srcImg = state.images.find(i => `${i.repository}:${i.tag}` === src || i.repository === src || shortId(i.id) === src);
        if (!srcImg) { append(`Error: No such image: ${src}\n`); return; }
        const ref = parseImageRef(dst);
        let dstImg = state.images.find(i => i.repository === ref.repository && String(i.tag) === String(ref.tag));
        if (!dstImg) {
          dstImg = { repository: ref.repository, tag: ref.tag, id: srcImg.id, size: srcImg.size };
          state.images.push(dstImg);
          saveState();
        }
        return;
      }

      if (sub === 'login') {
        append('Login Succeeded (learning mode, credentials not stored)\n');
        state.loggedIn = true;
        saveState();
        return;
      }
      if (sub === 'logout') {
        state.loggedIn = false;
        saveState();
        append('Removing login credentials for https://index.docker.io/v1/ (simulated)\n');
        return;
      }
      if (sub === 'push') {
        const img = args[1];
        if (!img) { append('docker: "push" requires an image name\n'); return; }
        append(`The push refers to repository [${img}]\n`);
        append('latest: digest: sha256:learnmode size: 1024 (simulated)\n');
        return;
      }

      if (sub === 'ps' || (sub === 'container' && (args[1] || '').toLowerCase() === 'ls')) {
        const all = args.includes('-a') || args.includes('--all');
        formatPs(all);
        return;
      }

      if (sub === 'pull') {
        const img = args[1];
        if (!img) { append('docker: "pull" requires an image name\n'); return; }
        const created = ensureImage(img);
        append(`${created.repository}:${created.tag}\n`);
        return;
      }

      if (sub === 'run') {
        // docker run [OPTIONS] IMAGE [COMMAND] [ARG...]
        const rest = args.slice(1);
        if (!rest.length) { append('docker: "run" requires an image name\n'); return; }
        let detach = false;
        let interactive = false;
        let tty = false;
        let rm = false;
        let nameOpt = null;
        const ports = [];
        let image = null;
        for (let i = 0; i < rest.length; i++) {
          const a = rest[i];
          if (a === '-d' || a === '--detach') { detach = true; continue; }
          if (a === '-i' || a === '--interactive') { interactive = true; continue; }
          if (a === '-t' || a === '--tty') { tty = true; continue; }
          if (a === '--rm') { rm = true; continue; }
          if ((a === '--name' || a === '--name=') && i + 1 < rest.length) { nameOpt = rest[++i]; continue; }
          if (a.startsWith('--name=')) { nameOpt = a.split('=').slice(1).join('='); continue; }
          if ((a === '-p' || a === '--publish') && i + 1 < rest.length) { ports.push(rest[++i]); continue; }
          if (a.startsWith('-')) continue;
          image = a;
          break;
        }
        if (!image) { append('docker: "run" requires an image name\n'); return; }
        ensureImage(image);
        const name = nameOpt || `learn_${state.nextId}`;
        const id = `learncontainer-${state.nextId++}`;
        state.containers.push({
          id, name, image,
          status: detach ? 'Up 1 second' : 'Up 1 second',
          ports: ports.join(', '),
          createdAt: Date.now(),
          rm: !!rm,
          interactive: interactive || tty,
          attachedNetworks: ['bridge'],
        });
        saveState();
        append(`${shortId(id)}\n`);
        if (!detach && (interactive || tty)) {
          append(`[learning] attached to ${name}. Type "exit" to detach.\n`);
        }
        return;
      }

      if (sub === 'start') {
        const targets = args.slice(1);
        if (!targets.length) { append('docker: "start" requires at least one container\n'); return; }
        targets.forEach(t => {
          const c = findContainer(t);
          if (!c) append(`Error: No such container: ${t}\n`);
          else { c.status = 'Up 1 second'; append(shortId(c.id) + '\n'); }
        });
        saveState();
        return;
      }

      if (sub === 'restart') {
        const targets = args.slice(1);
        if (!targets.length) { append('docker: "restart" requires at least one container\n'); return; }
        targets.forEach(t => {
          const c = findContainer(t);
          if (!c) append(`Error: No such container: ${t}\n`);
          else { c.status = 'Up 1 second'; append(shortId(c.id) + '\n'); }
        });
        saveState();
        return;
      }

      if (sub === 'kill') {
        const targets = args.slice(1).filter(a => !a.startsWith('-'));
        if (!targets.length) { append('docker: "kill" requires at least one container\n'); return; }
        targets.forEach(t => {
          const c = findContainer(t);
          if (!c) append(`Error: No such container: ${t}\n`);
          else { c.status = 'Exited (137) 1 second ago'; append(shortId(c.id) + '\n'); }
        });
        saveState();
        return;
      }

      if (sub === 'pause') {
        const targets = args.slice(1);
        if (!targets.length) { append('docker: "pause" requires at least one container\n'); return; }
        targets.forEach(t => {
          const c = findContainer(t);
          if (!c) append(`Error: No such container: ${t}\n`);
          else if (!c.status.startsWith('Up')) append(`Error: Container ${t} is not running\n`);
          else { c.status = 'Up 1 second (Paused)'; append(shortId(c.id) + '\n'); }
        });
        saveState();
        return;
      }
      if (sub === 'unpause') {
        const targets = args.slice(1);
        if (!targets.length) { append('docker: "unpause" requires at least one container\n'); return; }
        targets.forEach(t => {
          const c = findContainer(t);
          if (!c) append(`Error: No such container: ${t}\n`);
          else { c.status = 'Up 1 second'; append(shortId(c.id) + '\n'); }
        });
        saveState();
        return;
      }

      if (sub === 'rename') {
        const oldN = args[1];
        const newN = args[2];
        if (!oldN || !newN) { append('docker: "rename" requires OLD_NAME NEW_NAME\n'); return; }
        const c = findContainer(oldN);
        if (!c) { append(`Error: No such container: ${oldN}\n`); return; }
        c.name = newN;
        saveState();
        append(newN + '\n');
        return;
      }

      if (sub === 'port') {
        const target = args[1];
        if (!target) { append('docker: "port" requires a container name or ID\n'); return; }
        const c = findContainer(target);
        if (!c) { append(`Error: No such container: ${target}\n`); return; }
        append(c.ports ? String(c.ports) + '\n' : '80/tcp -> 0.0.0.0:8080\n');
        return;
      }

      if (sub === 'top') {
        const target = args[1];
        if (!target) { append('docker: "top" requires a container name or ID\n'); return; }
        const c = findContainer(target);
        if (!c) { append(`Error: No such container: ${target}\n`); return; }
        append('UID   PID   PPID  C STIME TTY          TIME CMD\n');
        append('root    1     0   0 00:00 ?        00:00:00 bash (simulated)\n');
        return;
      }

      if (sub === 'cp') {
        append('[learning] docker cp SRC DEST — simulated OK (no file copy)\n');
        return;
      }

      if (sub === 'commit') {
        let i = 1;
        while (i < args.length && String(args[i]).startsWith('-')) {
          if ((args[i] === '-m' || args[i] === '--message') && i + 1 < args.length) i += 2;
          else if (args[i] === '-p' || args[i] === '--pause') i += 1;
          else i += 1;
        }
        const cname = args[i];
        const repoTag = args[i + 1] || 'learn/snapshot:latest';
        if (!cname) { append('docker: "commit" requires a container name\n'); return; }
        const c = findContainer(cname);
        if (!c) { append(`Error: No such container: ${cname}\n`); return; }
        const img = ensureImage(repoTag);
        append(shortId(img.id) + '\n');
        return;
      }

      if (sub === 'history') {
        const imgRef = args[1];
        if (!imgRef) { append('docker: "history" requires an image name\n'); return; }
        append('IMAGE          CREATED BY                                      SIZE\n');
        append('<missing>      /bin/sh -c #(nop) CMD ["bash"]                0B\n');
        append(`${shortId('hist').padEnd(13)}  ADD file in /                                   12MB (simulated)\n`);
        return;
      }

      if (sub === 'search') {
        const term = args[1] || 'nginx';
        append('NAME                      DESCRIPTION                         STARS\n');
        append(`${term.padEnd(24)} official image (simulated)              9999\n`);
        return;
      }

      if (sub === 'events') {
        append('2024-01-01T00:00:00.000000000+00:00 container create ' + shortId('evt') + ' (simulated)\n');
        append('(learning mode: static sample event)\n');
        return;
      }

      if (sub === 'stop') {
        const targets = args.slice(1);
        if (!targets.length) {
          append('docker: "stop" requires at least one container\n');
          return;
        }
        targets.forEach(t => {
          const c = findContainer(t);
          if (!c) {
            append(`Error: No such container: ${t}\n`);
          } else {
            c.status = 'Exited (0) 1 second ago';
            append(shortId(c.id) + '\n');
          }
        });
        // auto-remove --rm containers when stopped
        const before = state.containers.length;
        state.containers = state.containers.filter(c => !(c.rm && c.status.startsWith('Exited')));
        if (state.containers.length !== before) saveState();
        else saveState();
        return;
      }

      if (sub === 'rm') {
        const targets = args.slice(1);
        if (!targets.length) {
          append('docker: "rm" requires at least one container\n');
          return;
        }
        targets.forEach(t => {
          const idx = state.containers.findIndex(cn => cn.name === t || shortId(cn.id) === t);
          if (idx === -1) {
            append(`Error: No such container: ${t}\n`);
          } else {
            const [c] = state.containers.splice(idx, 1);
            append(shortId(c.id) + '\n');
          }
        });
        saveState();
        return;
      }

      if (sub === 'rmi') {
        const targets = args.slice(1);
        if (!targets.length) {
          append('docker: "rmi" requires at least one image\n');
          return;
        }
        targets.forEach(t => {
          const idx = state.images.findIndex(img => img.repository === t || `${img.repository}:${img.tag}` === t || shortId(img.id) === t);
          if (idx === -1) {
            append(`Error: No such image: ${t}\n`);
          } else {
            const [img] = state.images.splice(idx, 1);
            append(`Untagged: ${img.repository}:${img.tag}\n`);
          }
        });
        saveState();
        return;
      }

      if (sub === 'logs') {
        const target = args[1];
        if (!target) {
          append('docker: "logs" requires a container name or ID\n');
          return;
        }
        const c = findContainer(target);
        if (!c) {
          append(`Error: No such container: ${target}\n`);
          return;
        }
        append(`[learning] showing simulated logs for ${c.name}\n`);
        append('App started.\nHandling requests...\n(Use this to practice docker logs workflow.)\n');
        return;
      }

      if (sub === 'exec') {
        append('[learning] docker exec is simulated; imagine running a command inside the container.\n');
        return;
      }

      if (sub === 'inspect') {
        const target = args[1];
        if (!target) { append('docker: "inspect" requires a container or image\n'); return; }
        const c = findContainer(target);
        if (c) {
          append(JSON.stringify({ Id: c.id, Name: '/' + c.name, Config: { Image: c.image }, State: { Status: c.status.startsWith('Up') ? 'running' : 'exited' } }, null, 2) + '\n');
          return;
        }
        const img = state.images.find(i => i.repository === target || `${i.repository}:${i.tag}` === target || shortId(i.id) === target);
        if (img) {
          append(JSON.stringify({ Id: img.id, RepoTags: [`${img.repository}:${img.tag}`], Size: img.size }, null, 2) + '\n');
          return;
        }
        const net = findNetwork(target);
        if (net) {
          append(JSON.stringify({ Name: net.name, Id: net.id, Driver: net.driver, Scope: net.scope }, null, 2) + '\n');
          return;
        }
        const vol = findVolume(target);
        if (vol) {
          append(JSON.stringify({
            Name: vol.name,
            Driver: vol.driver,
            Mountpoint: vol.mountpoint || '/var/lib/docker/volumes/' + vol.name + '/_data',
          }, null, 2) + '\n');
          return;
        }
        append(`Error: No such object: ${target}\n`);
        return;
      }

      if (sub === 'stats') {
        append('CONTAINER ID   NAME       CPU %     MEM USAGE / LIMIT\n');
        state.containers.filter(c => c.status.startsWith('Up')).forEach(c => {
          append(`${shortId(c.id).padEnd(13)} ${c.name.padEnd(10)} 0.00%     5.0MiB / 1.0GiB\n`);
        });
        return;
      }

      if (sub === 'system') {
        const sysSub = (args[1] || '').toLowerCase();
        if (sysSub === 'df') {
          append('TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE\n');
          append(`Images          ${state.images.length}         ${state.images.length}         210.0MB   0B (0%)\n`);
          append(`Containers      ${state.containers.length}         ${state.containers.filter(c => c.status.startsWith('Up')).length}         0B        0B\n`);
          append(`Local Volumes   ${state.volumes.length}         ${state.volumes.length}         10.0MB    0B (0%)\n`);
          return;
        }
        if (sysSub === 'prune') {
          append('[learning] docker system prune — no real disk freed\n');
          append('Total reclaimed space: 0B\n');
          return;
        }
        if (sysSub === 'info') {
          append('Server Version: 25.0.0\n');
          append('Images: ' + state.images.length + '\n');
          append('Containers: ' + state.containers.length + '\n');
          append('Swarm: ' + (state.swarm.active ? 'active' : 'inactive') + '\n');
          return;
        }
        append('docker system: df | prune | info (learning mode)\n');
        return;
      }

      if (sub === 'network') {
        const nsub = (args[1] || 'ls').toLowerCase();
        if (nsub === 'ls' || nsub === 'list') {
          append('NETWORK ID     NAME      DRIVER    SCOPE\n');
          state.networks.forEach(n => append(`${shortId(n.id || n.name).padEnd(13)} ${n.name.padEnd(9)} ${n.driver.padEnd(9)} ${n.scope}\n`));
          return;
        }
        if (nsub === 'create') {
          let name = null;
          let driver = 'bridge';
          for (let i = 2; i < args.length; i++) {
            if (args[i] === '-d' || args[i] === '--driver') { driver = args[++i] || driver; continue; }
            if (!String(args[i]).startsWith('-')) name = args[i];
          }
          if (!name) { append('docker network create requires a name\n'); return; }
          if (findNetwork(name)) { append(`Error: network with name ${name} already exists\n`); return; }
          const id = 'net_' + Math.random().toString(36).slice(2, 12);
          state.networks.push({ name, driver, scope: 'local', id });
          saveState();
          append(id + '\n');
          return;
        }
        if (nsub === 'rm' || nsub === 'remove') {
          const names = args.slice(2);
          if (!names.length) { append('docker network rm requires NETWORK\n'); return; }
          names.forEach(nm => {
            const n = findNetwork(nm);
            if (!n) append(`Error: No such network: ${nm}\n`);
            else if (n.name === 'bridge') append('Error: bridge is a predefined network and cannot be removed\n');
            else {
              const idx = state.networks.indexOf(n);
              state.networks.splice(idx, 1);
              state.containers.forEach(c => {
                if (Array.isArray(c.attachedNetworks)) c.attachedNetworks = c.attachedNetworks.filter(x => x !== n.name);
              });
              append(n.id + '\n');
            }
          });
          saveState();
          return;
        }
        if (nsub === 'connect') {
          const netName = args[2];
          const contName = args[3];
          if (!netName || !contName) { append('Usage: docker network connect NETWORK CONTAINER\n'); return; }
          const n = findNetwork(netName);
          const c = findContainer(contName);
          if (!n) { append(`Error: No such network: ${netName}\n`); return; }
          if (!c) { append(`Error: No such container: ${contName}\n`); return; }
          if (!c.attachedNetworks) c.attachedNetworks = [];
          if (!c.attachedNetworks.includes(n.name)) c.attachedNetworks.push(n.name);
          saveState();
          return;
        }
        if (nsub === 'disconnect') {
          const netName = args[2];
          const contName = args[3];
          if (!netName || !contName) { append('Usage: docker network disconnect NETWORK CONTAINER\n'); return; }
          const n = findNetwork(netName);
          const c = findContainer(contName);
          if (!n) { append(`Error: No such network: ${netName}\n`); return; }
          if (!c) { append(`Error: No such container: ${contName}\n`); return; }
          if (c.attachedNetworks) c.attachedNetworks = c.attachedNetworks.filter(x => x !== n.name);
          saveState();
          return;
        }
        if (nsub === 'inspect') {
          const nm = args[2];
          if (!nm) { append('docker network inspect requires NETWORK\n'); return; }
          const n = findNetwork(nm);
          if (!n) { append(`Error: No such network: ${nm}\n`); return; }
          append(JSON.stringify([{ Name: n.name, Id: n.id, Driver: n.driver, Scope: n.scope }], null, 2) + '\n');
          return;
        }
        append('docker network: ls | create | rm | connect | disconnect | inspect (learning mode)\n');
        return;
      }

      if (sub === 'volume') {
        const vsub = (args[1] || 'ls').toLowerCase();
        if (vsub === 'ls' || vsub === 'list') {
          append('DRIVER    VOLUME NAME\n');
          state.volumes.forEach(v => append(`${String(v.driver).padEnd(9)} ${v.name}\n`));
          return;
        }
        if (vsub === 'create') {
          let name = null;
          for (let i = 2; i < args.length; i++) {
            if (!String(args[i]).startsWith('-')) name = args[i];
          }
          if (!name) name = `vol_${state.nextId++}`;
          if (findVolume(name)) { append(`Error: volume with name ${name} already exists\n`); return; }
          state.volumes.push({ name, driver: 'local', mountpoint: '/var/lib/docker/volumes/' + name + '/_data' });
          saveState();
          append(name + '\n');
          return;
        }
        if (vsub === 'rm' || vsub === 'remove') {
          const names = args.slice(2);
          if (!names.length) { append('docker volume rm requires VOLUME\n'); return; }
          names.forEach(nm => {
            const v = findVolume(nm);
            if (!v) append(`Error: No such volume: ${nm}\n`);
            else {
              state.volumes.splice(state.volumes.indexOf(v), 1);
              append(nm + '\n');
            }
          });
          saveState();
          return;
        }
        if (vsub === 'inspect') {
          const nm = args[2];
          if (!nm) { append('docker volume inspect requires VOLUME\n'); return; }
          const v = findVolume(nm);
          if (!v) { append(`Error: No such volume: ${nm}\n`); return; }
          append(JSON.stringify([{
            Name: v.name,
            Driver: v.driver,
            Mountpoint: v.mountpoint || '/var/lib/docker/volumes/' + v.name + '/_data',
          }], null, 2) + '\n');
          return;
        }
        append('docker volume: ls | create | rm | inspect (learning mode)\n');
        return;
      }

      if (sub === 'save') {
        const imgs = [];
        let outfile = null;
        for (let i = 1; i < args.length; i++) {
          if ((args[i] === '-o' || args[i] === '--output') && i + 1 < args.length) { outfile = args[++i]; continue; }
          if (!String(args[i]).startsWith('-')) imgs.push(args[i]);
        }
        if (!imgs.length) { append('docker: "save" requires at least 1 image reference\n'); return; }
        const missing = imgs.filter(ref => !state.images.some(i => `${i.repository}:${i.tag}` === ref || i.repository === ref || shortId(i.id) === ref));
        if (missing.length) { append(`Error: No such image: ${missing[0]}\n`); return; }
        append(`[learning] saved ${imgs.length} image(s) to ${outfile || '(stdout)'} — tarball ~${(Math.random() * 2 + 0.3).toFixed(2)}MB (simulated)\n`);
        return;
      }

      if (sub === 'load') {
        let infile = null;
        for (let i = 1; i < args.length; i++) {
          if ((args[i] === '-i' || args[i] === '--input') && i + 1 < args.length) { infile = args[++i]; continue; }
        }
        const img = ensureImage('loaded/import:latest');
        append(`Loaded image: ${img.repository}:${img.tag}\n`);
        if (infile) append(`(from ${infile}, simulated)\n`);
        return;
      }

      if (sub === 'export') {
        const cname = args[1];
        if (!cname) { append('docker: "export" requires a container\n'); return; }
        const c = findContainer(cname);
        if (!c) { append(`Error: No such container: ${cname}\n`); return; }
        append(`[learning] exported rootfs tarball for ${c.name} (simulated)\n`);
        return;
      }

      if (sub === 'import') {
        const rest = args.slice(1);
        if (!rest.length) { append('docker: "import" requires file|- [REPOSITORY[:TAG]]\n'); return; }
        const repoTag = rest[1] || 'learn/imported:latest';
        const img = ensureImage(repoTag);
        append(shortId(img.id) + '\n');
        return;
      }

      if (sub === 'manifest') {
        const msub = (args[1] || '').toLowerCase();
        if (msub === 'inspect') {
          const ref = args[2] || 'library/nginx:latest';
          append(JSON.stringify({
            Name: ref,
            MediaType: 'application/vnd.docker.distribution.manifest.v2+json',
            Layers: [{ digest: 'sha256:abc123def', size: 2048 }],
          }, null, 2) + '\n');
          return;
        }
        append('docker manifest: inspect IMAGE (learning mode)\n');
        return;
      }

      if (sub === 'trust') {
        const tsub = (args[1] || 'help').toLowerCase();
        append(`[learning] docker trust ${tsub} — Docker Content Trust / Notary not connected; workflow only.\n`);
        if (tsub === 'inspect') append('Signatures: (none, simulated)\n');
        return;
      }

      if (sub === 'buildx') {
        const bsub = (args[1] || '').toLowerCase();
        if (bsub === 'version') {
          append('github.com/docker/buildx v0.12.0 learnmode\n');
          return;
        }
        if (bsub === 'ls') {
          append('NAME/NODE       DRIVER/ENDPOINT\n');
          append('default *       docker\n');
          return;
        }
        if (bsub === 'build') {
          append('Building with Buildx (simulated)...\n');
          const created = ensureImage('learn/buildx:latest');
          append(`Successfully built ${shortId(created.id)}\n`);
          return;
        }
        append('docker buildx: version | ls | build (learning mode)\n');
        return;
      }

      if (sub === 'builder') {
        const bsub = (args[1] || '').toLowerCase();
        if (bsub === 'ls' || bsub === 'list') {
          append('NAME/NODE       DRIVER/ENDPOINT\n');
          append('default *       docker\n');
          return;
        }
        if (bsub === 'prune') {
          append('Total:\t0B (learning mode)\n');
          return;
        }
        append('docker builder: ls | prune (learning mode)\n');
        return;
      }

      if (sub === 'swarm') {
        const ssub = (args[1] || '').toLowerCase();
        if (ssub === 'init') {
          state.swarm.active = true;
          state.swarm.advertiseAddr = '127.0.0.1:2377';
          state.swarm.nodes = [{ id: 'manager1', hostname: 'docker-desktop', role: 'manager', status: 'ready', availability: 'active' }];
          saveState();
          append('Swarm initialized: current node is now a manager.\n');
          return;
        }
        if (ssub === 'join') {
          append('[learning] docker swarm join --token TOKEN HOST:2377 (use real cluster for practice)\n');
          return;
        }
        if (ssub === 'leave') {
          state.swarm.active = false;
          state.swarm.nodes = [];
          state.swarm.services = [];
          state.swarm.stacks = [];
          saveState();
          append('Node left the swarm.\n');
          return;
        }
        append('docker swarm: init | join | leave (learning mode)\n');
        return;
      }

      if (sub === 'node') {
        const nsub = (args[1] || '').toLowerCase();
        if (nsub === 'ls' || nsub === 'list') {
          if (!state.swarm.active) { append('Error: This node is not a swarm manager.\n'); return; }
          append('ID             HOSTNAME         STATUS    AVAILABILITY   MANAGER STATUS\n');
          state.swarm.nodes.forEach(n => {
            append(`${shortId(n.id).padEnd(13)} ${String(n.hostname).padEnd(15)} ${String(n.status).padEnd(9)} ${String(n.availability).padEnd(14)} ${n.role === 'manager' ? 'Leader' : ''}\n`);
          });
          return;
        }
        append('docker node: ls (learning mode)\n');
        return;
      }

      if (sub === 'service') {
        const ssub = (args[1] || '').toLowerCase();
        if (ssub === 'ls' || ssub === 'list') {
          if (!state.swarm.active) { append('Error: This node is not a swarm manager.\n'); return; }
          append('ID             NAME      MODE        REPLICAS   IMAGE\n');
          state.swarm.services.forEach(s => {
            append(`${shortId(s.id).padEnd(13)} ${String(s.name).padEnd(9)} replicated  ${s.replicas}/1        ${s.image}\n`);
          });
          return;
        }
        if (ssub === 'create') {
          if (!state.swarm.active) { append('Error: This node is not a swarm manager.\n'); return; }
          let name = `svc_${state.nextId}`;
          let image = 'nginx:latest';
          for (let i = 2; i < args.length; i++) {
            if (args[i] === '--name' && i + 1 < args.length) { name = args[++i]; continue; }
            if (!String(args[i]).startsWith('-')) image = args[i];
          }
          const id = `svc-${state.nextId++}`;
          state.swarm.services.push({ id, name, image, replicas: 1 });
          saveState();
          append(shortId(id) + '\n');
          return;
        }
        if (ssub === 'rm' || ssub === 'remove') {
          const nm = args[2];
          if (!nm) { append('docker service rm requires SERVICE\n'); return; }
          const idx = state.swarm.services.findIndex(s => s.name === nm || shortId(s.id) === nm);
          if (idx === -1) append(`Error: No such service: ${nm}\n`);
          else state.swarm.services.splice(idx, 1);
          saveState();
          append(nm + '\n');
          return;
        }
        append('docker service: ls | create | rm (learning mode)\n');
        return;
      }

      if (sub === 'stack') {
        const ssub = (args[1] || '').toLowerCase();
        if (ssub === 'deploy') {
          if (!state.swarm.active) { append('Error: This node is not a swarm manager.\n'); return; }
          let stackName = 'mystack';
          for (let i = 2; i < args.length; i++) {
            if (args[i] === '-c' || args[i] === '--compose-file') { i++; continue; }
            if (!String(args[i]).startsWith('-')) stackName = args[i];
          }
          state.swarm.stacks.push({ name: stackName, created: Date.now() });
          saveState();
          append(`Creating network ${stackName}_default ...\n`);
          append(`Deploying stack ${stackName} (simulated)\n`);
          return;
        }
        if (ssub === 'ls' || ssub === 'list') {
          append('NAME                SERVICES\n');
          state.swarm.stacks.forEach(st => append(`${String(st.name).padEnd(20)} 1\n`));
          return;
        }
        if (ssub === 'rm') {
          const nm = args[2];
          if (!nm) { append('docker stack rm requires STACK\n'); return; }
          state.swarm.stacks = state.swarm.stacks.filter(s => s.name !== nm);
          saveState();
          append(`Removing stack ${nm} (simulated)\n`);
          return;
        }
        append('docker stack: deploy | ls | rm (learning mode)\n');
        return;
      }

      if (sub === 'scan') {
        const img = args[1] || 'alpine:latest';
        append(`Scanning ${img} (learning mode)...\n`);
        append('Summary: 0 vulnerabilities (simulated)\n');
        return;
      }

      if (sub === 'sbom') {
        const img = args[1] || 'alpine:latest';
        append(`SBOM for ${img} (simulated SPDX JSON)\n`);
        append('{"spdxVersion":"SPDX-2.3","packages":[{"name":"simulated-base","version":"1.0"}]}\n');
        return;
      }

      if (sub === 'context') {
        const csub = (args[1] || '').toLowerCase();
        if (csub === 'ls' || csub === 'list') {
          append('NAME        DESCRIPTION                               DOCKER ENDPOINT\n');
          state.contexts.forEach(ctx => {
            const mark = ctx.current ? '*' : ' ';
            append(`${(ctx.name + mark).padEnd(11)} ${String(ctx.description).padEnd(40)} ${ctx.dockerHost}\n`);
          });
          return;
        }
        if (csub === 'use') {
          const nm = args[2];
          if (!nm) { append('docker context use requires CONTEXT\n'); return; }
          const ctx = state.contexts.find(c => c.name === nm);
          if (!ctx) { append(`context "${nm}" does not exist\n`); return; }
          state.contexts.forEach(c => { c.current = c.name === nm; });
          saveState();
          append(`"${nm}"\n`);
          append(`Current context is now "${nm}"\n`);
          return;
        }
        append('docker context: ls | use NAME (learning mode)\n');
        return;
      }

      if (sub === 'plugin') {
        const psub = (args[1] || '').toLowerCase();
        if (psub === 'ls' || psub === 'list') {
          append('NAME                  VERSION             ENABLED\n');
          state.plugins.forEach(p => append(`${String(p.name).padEnd(20)} ${String(p.version).padEnd(16)} ${p.enabled}\n`));
          return;
        }
        if (psub === 'enable' || psub === 'disable') {
          const nm = args[2];
          if (!nm) { append(`docker plugin ${psub} requires PLUGIN\n`); return; }
          const pl = state.plugins.find(p => p.name === nm);
          if (!pl) { append(`Error: No such plugin: ${nm}\n`); return; }
          pl.enabled = psub === 'enable';
          saveState();
          append(pl.name + '\n');
          return;
        }
        append('docker plugin: ls | enable | disable (learning mode)\n');
        return;
      }

      if (sub === 'attach') {
        const nm = args[1];
        if (!nm) { append('docker: "attach" requires a container\n'); return; }
        const c = findContainer(nm);
        if (!c) { append(`Error: No such container: ${nm}\n`); return; }
        if (!c.status.startsWith('Up')) { append('You cannot attach to a stopped container\n'); return; }
        append(`Attached to ${c.name} — stdin/stdout/stderr forwarded (simulated)\n`);
        append('[learning] In real Docker: Ctrl+P Ctrl+Q detaches without stopping the container.\n');
        append('simulated main process output: ready\n');
        return;
      }

      if (sub === 'wait') {
        const nm = args[1];
        if (!nm) { append('docker: "wait" requires a container\n'); return; }
        const c = findContainer(nm);
        if (!c) { append(`Error: No such container: ${nm}\n`); return; }
        append((c.status.startsWith('Exited') ? '137' : '0') + '\n');
        return;
      }

      if (sub === 'update') {
        const rest = args.slice(1);
        if (!rest.length) { append('docker: "update" requires a container\n'); return; }
        const nm = rest[rest.length - 1];
        const flags = rest.slice(0, -1);
        const c = findContainer(nm);
        if (!c) { append(`Error: No such container: ${nm}\n`); return; }
        if (flags.length) append(`[learning] applied: ${flags.join(' ')} (simulated)\n`);
        append(shortId(c.id) + '\n');
        return;
      }

      if (sub === 'secret') {
        const ssub = (args[1] || '').toLowerCase();
        if (ssub === 'ls' || ssub === 'list') {
          if (!state.swarm.active) { append('Error: This node is not a swarm manager.\n'); return; }
          append('ID                          NAME                CREATED\n');
          state.secrets.forEach(s => append(`${String(s.id).padEnd(26)} ${String(s.name).padEnd(18)} ${new Date(s.createdAt).toISOString()}\n`));
          return;
        }
        if (ssub === 'create') {
          if (!state.swarm.active) { append('Error: This node is not a swarm manager.\n'); return; }
          const name = args[2];
          if (!name) { append('docker secret create NAME [file|-]\n'); return; }
          const id = 'sec_' + Math.random().toString(36).slice(2, 14);
          state.secrets.push({ id, name, createdAt: Date.now() });
          saveState();
          append(id + '\n');
          return;
        }
        if (ssub === 'rm' || ssub === 'remove') {
          const nm = args[2];
          if (!nm) { append('docker secret rm requires SECRET\n'); return; }
          const idx = state.secrets.findIndex(s => s.name === nm || s.id === nm || shortId(s.id) === nm);
          if (idx === -1) append(`Error: secret not found: ${nm}\n`);
          else state.secrets.splice(idx, 1);
          saveState();
          append(nm + '\n');
          return;
        }
        append('docker secret: create | ls | rm (learning mode, swarm)\n');
        return;
      }

      if (sub === 'config') {
        const ssub = (args[1] || '').toLowerCase();
        if (ssub === 'ls' || ssub === 'list') {
          if (!state.swarm.active) { append('Error: This node is not a swarm manager.\n'); return; }
          append('ID                          NAME                CREATED\n');
          state.configs.forEach(s => append(`${String(s.id).padEnd(26)} ${String(s.name).padEnd(18)} ${new Date(s.createdAt).toISOString()}\n`));
          return;
        }
        if (ssub === 'create') {
          if (!state.swarm.active) { append('Error: This node is not a swarm manager.\n'); return; }
          const name = args[2];
          if (!name) { append('docker config create NAME [file|-]\n'); return; }
          const id = 'cfg_' + Math.random().toString(36).slice(2, 14);
          state.configs.push({ id, name, createdAt: Date.now() });
          saveState();
          append(id + '\n');
          return;
        }
        if (ssub === 'rm' || ssub === 'remove') {
          const nm = args[2];
          if (!nm) { append('docker config rm requires CONFIG\n'); return; }
          const idx = state.configs.findIndex(s => s.name === nm || s.id === nm || shortId(s.id) === nm);
          if (idx === -1) append(`Error: config not found: ${nm}\n`);
          else state.configs.splice(idx, 1);
          saveState();
          append(nm + '\n');
          return;
        }
        append('docker config: create | ls | rm (learning mode, swarm)\n');
        return;
      }

      if (sub === 'compose') {
        const action = (args[1] || '').toLowerCase();
        if (action === 'up') {
          // 学习版：创建一个示例 compose 服务容器
          const img = ensureImage('compose-web:latest');
          const name = 'compose_web_1';
          let c = findContainer(name);
          if (!c) {
            const id = `compose-${state.nextId++}`;
            c = { id, name, image: `${img.repository}:${img.tag}`, status: 'Up 1 second', ports: '8080:80', createdAt: Date.now(), rm: false, attachedNetworks: ['bridge', 'compose_default'] };
            state.containers.push(c);
          } else {
            c.status = 'Up 1 second';
          }
          saveState();
          append('Creating network "compose_default" with the default driver\n');
          append('Creating compose_web_1 ... done\n');
          return;
        }
        if (action === 'down') {
          const before = state.containers.length;
          state.containers = state.containers.filter(c => !c.name.startsWith('compose_'));
          saveState();
          append('Stopping and removing compose services (learning mode)\n');
          append(`Removed ${before - state.containers.length} container(s)\n`);
          return;
        }
        append('docker compose: supported subcommands: up, down (learning mode)\n');
        return;
      }

      append(`docker: '${sub}' is not a docker command (learning mode).\n`);
    }

    append(tr('dockerShellGreeting', 'Docker CLI learning mode (simulated).') + '\n');
    append(tr('dockerShellHelpHint', 'Try commands like: docker images, docker ps, docker run ...') + '\n\n');
    printPrompt();

    function handle(line) {
      append(`${dockerPrompt()} ${line}\n`);
      cmdDocker(line);
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handle(input.value);
          input.value = '';
        }
      });
      setTimeout(() => { try { input.focus(); } catch (_) {} }, 50);
    }
  },

  calculator(container) {
    if (!container) return;
    const display = container.querySelector('#calc-display');
    let current = '';
    let prev = null;
    let op = null;
    const eqBtn = container.querySelector('.calc-btn[data-op="="]');
    let errorState = false;

    function isFiniteNumberString(s) {
      if (s == null) return false;
      const t = String(s).trim();
      if (t === '' || t === '.' || t === '-' || t === '+') return false;
      const n = Number(t);
      return Number.isFinite(n);
    }

    function canCompute() {
      if (errorState) return false;
      if (prev === null || !op) return false;
      if (!isFiniteNumberString(prev)) return false;
      if (!isFiniteNumberString(current)) return false;
      if (op === '/' && Number(current) === 0) return false;
      return true;
    }

    function setEqEnabled(enabled) {
      if (!eqBtn) return;
      eqBtn.disabled = !enabled;
      eqBtn.style.opacity = enabled ? '1' : '0.45';
      eqBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }

    function renderDisplay() {
      setEqEnabled(canCompute());
      if (errorState) {
        display.value = '错误';
        return;
      }
      if (prev !== null && op) {
        display.value = `${prev}${op}${current}`;
        return;
      }
      display.value = current || prev || '0';
    }

    function clearAll() {
      current = '';
      prev = null;
      op = null;
      errorState = false;
      renderDisplay();
    }

    function compute(aStr, bStr, oper) {
      const a = Number(aStr);
      const b = Number(bStr);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return { ok: false };
      if (oper === '/' && b === 0) return { ok: false };
      let r = 0;
      if (oper === '+') r = a + b;
      else if (oper === '-') r = a - b;
      else if (oper === '*') r = a * b;
      else if (oper === '/') r = a / b;
      else return { ok: false };
      if (!Number.isFinite(r)) return { ok: false };
      return { ok: true, value: String(r) };
    }

    container.querySelectorAll('.calc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = btn.getAttribute('data-num');
        const operation = btn.getAttribute('data-op');
        if (num !== null) {
          if (errorState) clearAll();
          // 避免 NaN/Infinity 继续被拼接成 NaN123
          if (current === 'NaN' || current === 'Infinity' || current === '-Infinity') current = '';
          if (num === '.' && current.includes('.')) return;
          if (num === '.' && current === '') { current = '0.'; renderDisplay(); return; }
          if (num === '.' && current.includes('.')) return;
          current += num;
        } else if (operation === 'C') {
          clearAll();
        } else if (operation === '=') {
          if (!canCompute()) { renderDisplay(); return; }
          const res = compute(prev, current, op);
          if (!res.ok) { errorState = true; prev = null; op = null; current = ''; renderDisplay(); return; }
          current = res.value;
          prev = null;
          op = null;
        } else {
          if (errorState) return;
          if (current === '' && prev === null) {
            prev = '0';
            op = operation;
            renderDisplay();
            return;
          }
          if (prev !== null && op && current !== '') {
            if (!isFiniteNumberString(prev) || !isFiniteNumberString(current) || (op === '/' && Number(current) === 0)) {
              errorState = true;
              prev = null;
              op = null;
              current = '';
              renderDisplay();
              return;
            }
            const res = compute(prev, current, op);
            if (!res.ok) {
              errorState = true;
              prev = null;
              op = null;
              current = '';
              renderDisplay();
              return;
            }
            current = res.value;
          }
          prev = current || prev; current = ''; op = operation;
        }
        renderDisplay();
      });
    });
    renderDisplay();
  },

  'markdown-reader'(container) {
    if (!container) return;
    const mdContent = container.querySelector('#md-content');
    const openBtn = container.querySelector('#md-open');
    const refreshBtn = container.querySelector('#md-refresh');
    const electron = require('electron');
    const path = require('path');
    let currentPath = null;
    const initialPath = (typeof window !== 'undefined' && window.__starMarkdownInitialPath) || null;
    if (typeof window !== 'undefined') window.__starMarkdownInitialPath = null;
    const appLabel = typeof t === 'function' ? t('markdownReader', 'Markdown Reader') : 'Markdown Reader';

    function safeHtml(html) {
      if (!html) return '';
      const div = document.createElement('div');
      div.innerHTML = html;
      div.querySelectorAll('script').forEach(s => s.remove());
      return div.innerHTML;
    }
    function renderMd(content) {
      if (!mdContent) return;
      if (typeof content !== 'string') { mdContent.innerHTML = '<p style="color:var(--text-dim);">' + escapeHtml(String(content && content.error ? content.error : '')) + '</p>'; return; }
      if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
        try {
          marked.setOptions({ gfm: true, breaks: true });
          const raw = marked.parse(content);
          mdContent.innerHTML = safeHtml(raw);
          // Resolve markdown-relative assets (images/links) to local star-file URLs.
          if (currentPath) {
            const baseDir = path.dirname(currentPath);
            const toResolvedUrl = (value) => {
              const text = String(value || '').trim();
              if (!text) return '';
              if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|#|\/\/)/.test(text)) return text;
              const absPath = path.resolve(baseDir, text.replace(/^file:\/\//i, ''));
              return toStarFileUrl(absPath);
            };
            mdContent.querySelectorAll('img[src]').forEach((imgEl) => {
              const src = imgEl.getAttribute('src');
              const resolved = toResolvedUrl(src);
              if (resolved) imgEl.setAttribute('src', resolved);
            });
            mdContent.querySelectorAll('a[href]').forEach((linkEl) => {
              const href = linkEl.getAttribute('href');
              const resolved = toResolvedUrl(href);
              if (resolved) linkEl.setAttribute('href', resolved);
            });
          }
          mdContent.querySelectorAll('pre code').forEach(block => {
            block.style.background = 'var(--window-titlebar)';
            block.style.padding = '12px';
            block.style.borderRadius = '6px';
            block.style.overflow = 'auto';
            block.style.display = 'block';
          });
        } catch (e) {
          mdContent.innerHTML = '<p style="color:var(--error,#f55);">' + escapeHtml(e.message || (typeof t === 'function' ? t('parseFailed', 'Parse failed') : 'Parse failed')) + '</p>';
        }
      } else {
        mdContent.innerHTML = '<p style="color:var(--text-dim);">' + escapeHtml(content) + '</p>';
      }
    }
    function renderEmptyHint() {
      if (!mdContent) return;
      mdContent.innerHTML = '<p style="color:var(--text-dim);">' + (typeof t === 'function' ? t('markdownOpenHint', 'Open a .md file to view it') : 'Open a .md file to view it') + '</p>';
    }
    async function openPath(nextPath) {
      if (!nextPath) {
        currentPath = null;
        renderEmptyHint();
        return false;
      }
      const result = await readTextFileWithOpenGuard(nextPath, appLabel);
      if (result.blocked) return false;
      currentPath = nextPath;
      renderMd(result.error ? { error: result.error } : result.content);
      return !result.error;
    }
    renderEmptyHint();
    if (initialPath) openPath(initialPath);
    if (openBtn) openBtn.onclick = () => {
      window.showInternalOpenDialog({ properties: ['openFile'], filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }] }).then(r => {
        if (!r.canceled && r.filePaths[0]) openPath(r.filePaths[0]);
      });
    };
    if (refreshBtn) refreshBtn.onclick = () => {
      if (currentPath) openPath(currentPath);
      else renderEmptyHint();
    };
    window.addEventListener('star:markdown-open', function onOpen(ev) {
      const path = ev.detail && ev.detail.filePath;
      if (path) openPath(path);
    });
  },

  'text-editor'(container) {
    if (!container) return;
    const textarea = container.querySelector('#np-text');
    const electron = require('electron');
    let currentPath = null;
    const initialPath = (typeof window !== 'undefined' && window.__starNotepadInitialPath) || null;
    if (typeof window !== 'undefined') window.__starNotepadInitialPath = null;
    const appLabel = typeof t === 'function' ? t('textEditor', 'Text Editor') : 'Text Editor';

    const openPath = async (nextPath) => {
      if (!nextPath) {
        currentPath = null;
        textarea.value = '';
        return false;
      }
      const result = await readTextFileWithOpenGuard(nextPath, appLabel);
      if (result.blocked) return false;
      currentPath = nextPath;
      textarea.value = result.error ? result.error : (result.content || '');
      return !result.error;
    };
    if (initialPath) openPath(initialPath);
    window.addEventListener('star:text-editor-open', function onOpen(ev) {
      const path = ev.detail && ev.detail.filePath;
      if (path) openPath(path);
    });

    container.querySelector('#np-new').onclick = () => { currentPath = null; textarea.value = ''; };
    container.querySelector('#np-open').onclick = () => {
      window.showInternalOpenDialog({ properties: ['openFile'] }).then(r => {
        if (!r.canceled && r.filePaths[0]) openPath(r.filePaths[0]);
      });
    };
    container.querySelector('#np-save').onclick = () => {
      const doSave = (filePath, content) => {
        electron.ipcRenderer.invoke('os:writeFile', filePath, content).then(res => {
          if (res && res.error && window.StarNotify) window.StarNotify.show({ title: t('save'), message: res.error });
          else if (window.StarNotify) window.StarNotify.show({ title: t('save'), message: t('ok') });
        });
      };
      if (currentPath) {
        doSave(currentPath, textarea.value);
      } else {
        window.showInternalSaveDialog({ defaultPath: '未命名.txt' }).then(r => {
          if (!r.canceled && r.filePath) { currentPath = r.filePath; doSave(currentPath, textarea.value); }
        });
      }
    };
  },

  settings(container) {
    if (!container) return;
    // 左侧导航
    bindExternalLinks(container);
    const navItems = container.querySelectorAll('.settings-nav-item');
    const sections = container.querySelectorAll('.settings-section');
    function showSection(name) {
      sections.forEach(sec => {
        sec.classList.toggle('hidden', sec.id !== 'settings-section-' + name);
      });
      navItems.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-section') === name);
      });
      if (name === 'devices' && window.StarDevice) {
        window.StarDevice.getInfo().then(info => {
          const el = container.querySelector('#settings-device-info');
          if (!el) return;
          if (!info || !info.platform) { el.textContent = '—'; return; }
          const lines = [
            t('cpu') + ': ' + (info.cpuModel || '') + ' (' + (info.cpuCount || 0) + ' ' + t('cores') + ')',
            t('memory') + ': ' + (window.StarMemory ? window.StarMemory.formatBytes(info.totalMemory) : '') + ' ' + t('system') + ', ' + (window.StarMemory ? window.StarMemory.formatBytes(info.freeMemory) : '') + ' free',
            'OS: ' + (info.platform || '') + ' ' + (info.release || ''),
            'Host: ' + (info.hostname || ''),
            'Arch: ' + (info.arch || ''),
            (info.networkInterfaces && info.networkInterfaces.length) ? 'Network: ' + info.networkInterfaces.map(n => n.name + ' ' + (n.addresses && n.addresses[0] ? n.addresses[0].address : '')).join(', ') : ''
          ];
          el.textContent = lines.filter(Boolean).join('\n');
        }).catch(() => {});
      }
      if (name === 'search') {
        const input = container.querySelector('#settings-search-input');
        const results = container.querySelector('#settings-search-results');
        if (input && results && !input._starSearchBound) {
          const renderResults = (q) => {
            const all = StarAppsRegistry.getAll();
            const kw = (q || '').trim().toLowerCase();
            const filtered = kw ? all.filter(a => {
              const title = t(a.titleKey) || '';
              return title.toLowerCase().includes(kw) || (a.id && a.id.toLowerCase().includes(kw));
            }) : all;
            results.innerHTML = filtered.map(app => `
              <button class="start-menu-item" data-app-id="${app.id}" style="display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--window-titlebar);cursor:pointer;text-align:left;">
                <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.04);margin-bottom:2px;">${app.icon}</span>
                <span style="font-size:13px;">${escapeHtml(t(app.titleKey))}</span>
                <span style="font-size:11px;color:var(--text-dim);">${escapeHtml(app.id)}</span>
              </button>
            `).join('') || '<p style="color:var(--text-dim);font-size:12px;margin:4px 0;">' + escapeHtml(t('noMatchingApps')) + '</p>';
            results.querySelectorAll('.start-menu-item').forEach(btn => {
              btn.addEventListener('click', () => {
                const appId = btn.getAttribute('data-app-id');
                if (appId) StarAppsRegistry.open(appId);
              });
            });
          };
          input.addEventListener('input', () => renderResults(input.value));
          renderResults('');
          input._starSearchBound = true;
        }

        // 文件名搜索
        const fsRootInput = container.querySelector('#settings-file-search-root');
        const fsRootBrowse = container.querySelector('#settings-file-search-root-browse');
        const fsKeywordInput = container.querySelector('#settings-file-search-keyword');
        const fsBtn = container.querySelector('#settings-file-search-btn');
        const fsResults = container.querySelector('#settings-file-search-results');
        if (fsRootInput && !fsRootInput._starInit) {
          try {
            const home = process.env.USERPROFILE || process.env.HOME || 'C:\\\\';
            fsRootInput.value = home;
          } catch (_) {}
          fsRootInput._starInit = true;
        }
        if (fsRootBrowse && fsRootInput && !fsRootBrowse._starBound) {
          fsRootBrowse.addEventListener('click', () => {
            window.showInternalOpenDialog({
              properties: ['openDirectory'],
              title: t('selectSearchRoot')
            }).then(r => {
              if (!r.canceled && r.filePaths && r.filePaths[0]) fsRootInput.value = r.filePaths[0];
            });
          });
          fsRootBrowse._starBound = true;
        }
        if (fsBtn && fsRootInput && fsKeywordInput && fsResults && !fsBtn._starBound) {
          const electron = require('electron');
          const doSearch = () => {
            const root = (fsRootInput.value || '').trim();
            const kw = (fsKeywordInput.value || '').trim();
            if (!kw) {
              fsResults.innerHTML = '<p style="color:var(--text-dim);font-size:12px;margin:4px 8px;">' + escapeHtml(t('enterFileKeyword')) + '</p>';
              return;
            }
            fsResults.innerHTML = '<p style="color:var(--text-dim);font-size:12px;margin:4px 8px;">' + escapeHtml(t('searching')) + '</p>';
            electron.ipcRenderer.invoke('os:searchFiles', root, kw, 200).then(list => {
              if (!Array.isArray(list) || !list.length) {
                fsResults.innerHTML = '<p style="color:var(--text-dim);font-size:12px;margin:4px 8px;">' + escapeHtml(t('noMatchingFiles')) + '</p>';
                return;
              }
              fsResults.innerHTML = list.map(item => `
                <div class="settings-file-result" data-path="${escapeHtml(item.path)}" data-is-dir="${item.isDir ? '1' : '0'}" style="padding:4px 10px;display:flex;flex-direction:column;gap:2px;cursor:pointer;">
                  <span style="color:${item.isDir ? '#7ee787' : '#e5e7eb'};">${item.isDir ? escapeHtml(t('directoryPrefix')) : ''}${escapeHtml(item.name)}</span>
                  <span style="color:var(--text-dim);font-size:11px;">${escapeHtml(item.path)}</span>
                </div>
              `).join('');
              fsResults.querySelectorAll('.settings-file-result').forEach(row => {
                row.addEventListener('click', () => {
                  const p = row.getAttribute('data-path');
                  if (!p) return;
                  const isDir = row.getAttribute('data-is-dir') === '1';
                  if (isDir) {
                    if (window.StarAppsRegistry && window.StarAppsRegistry.openWithFile) {
                      window.StarAppsRegistry.openWithFile('file-manager', p, { directoryPath: p });
                    } else {
                      electron.ipcRenderer.invoke('os:launch', p);
                    }
                    return;
                  }
                  if (typeof openPathInStarOs === 'function') {
                    Promise.resolve(openPathInStarOs(p))
                      .then((handled) => {
                        if (!handled) electron.ipcRenderer.invoke('os:launch', p);
                      })
                      .catch(() => {
                        electron.ipcRenderer.invoke('os:launch', p);
                      });
                    return;
                  }
                  electron.ipcRenderer.invoke('os:launch', p);
                });
              });
            }).catch(err => {
              fsResults.innerHTML = '<p style="color:var(--error,#f55);font-size:12px;margin:4px 8px;">' + escapeHtml(t('searchFailed')) + escapeHtml(err && err.message ? err.message : String(err)) + '</p>';
            });
          };
          fsBtn.addEventListener('click', doSearch);
          fsKeywordInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
          fsBtn._starBound = true;
        }
      }
    }
    navItems.forEach(btn => {
      btn.addEventListener('click', () => showSection(btn.getAttribute('data-section')));
    });
    showSection('system');

    // 语言
    const langSelect = container.querySelector('#settings-lang');
    if (langSelect) {
      langSelect.addEventListener('change', () => { setLocale(langSelect.value); });
    }
    // 运行 Windows 应用
    const runBtn = container.querySelector('#settings-run');
    if (runBtn) runBtn.addEventListener('click', () => StarAppsRegistry.openRunDialog());

    // 浏览器主页
    const homepageInput = container.querySelector('#settings-homepage');
    if (homepageInput) {
      const saveHome = () => {
        try { localStorage.setItem('star-browser-homepage', homepageInput.value.trim() || 'https://www.baidu.com'); } catch (_) {}
      };
      homepageInput.addEventListener('change', saveHome);
      homepageInput.addEventListener('blur', saveHome);
    }
    const showHiddenFilesToggle = container.querySelector('#settings-show-hidden-files');
    if (showHiddenFilesToggle) {
      showHiddenFilesToggle.checked = readStarFileManagerShowHiddenSetting();
      showHiddenFilesToggle.addEventListener('change', () => {
        writeStarFileManagerShowHiddenSetting(!!showHiddenFilesToggle.checked);
      });
    }

    // 主题
    const themeSelect = container.querySelector('#settings-theme');
    if (themeSelect) {
      try {
        const cur = localStorage.getItem('star-theme') || 'dark';
        themeSelect.value = cur;
      } catch (_) {}
      themeSelect.addEventListener('change', () => {
        if (window.applyStarTheme) window.applyStarTheme(themeSelect.value);
        if (window.applyDesktopWallpaper) window.applyDesktopWallpaper();
      });
    }

    // 壁纸
    const wallpaperInput = container.querySelector('#settings-wallpaper');
    const wallpaperApply = container.querySelector('#settings-wallpaper-apply');
    const wallpaperBrowse = container.querySelector('#settings-wallpaper-browse');
    const wpDefaultLight = container.querySelector('#settings-wallpaper-default-light');
    const wpDefaultDeep = container.querySelector('#settings-wallpaper-default-deep');
    const wpDefaultBlue = container.querySelector('#settings-wallpaper-default-blue');
    const wpDefaultAurora = container.querySelector('#settings-wallpaper-default-aurora');
    if (wallpaperBrowse && wallpaperInput) {
      wallpaperBrowse.addEventListener('click', () => {
        window.showInternalOpenDialog({
          properties: ['openFile'],
          title: t('wallpaperImageTitle'),
          filters: [{ name: t('imageFilterLabel'), extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }]
        }).then(r => {
          if (!r.canceled && r.filePaths && r.filePaths[0]) wallpaperInput.value = r.filePaths[0];
        });
      });
    }
    if (wallpaperApply && wallpaperInput) {
      wallpaperApply.addEventListener('click', () => {
        const v = wallpaperInput.value.trim();
        // 输入为空时，不改变当前壁纸，避免误把默认壁纸覆盖掉
        if (!v) return;
        try { localStorage.setItem('star-wallpaper', v); } catch (_) {}
        if (window.applyDesktopWallpaper) window.applyDesktopWallpaper();
        else if (typeof location !== 'undefined' && location.reload) location.reload();
      });
    }
    const setBuiltinWallpaper = (key) => {
      try { localStorage.setItem('star-wallpaper', key); } catch (_) {}
      if (wallpaperInput) wallpaperInput.value = '';
      if (window.applyDesktopWallpaper) window.applyDesktopWallpaper();
      else if (typeof location !== 'undefined' && location.reload) location.reload();
    };
    if (wpDefaultLight && !wpDefaultLight._starBound) {
      wpDefaultLight.addEventListener('click', () => setBuiltinWallpaper('__wallpaper_light__'));
      wpDefaultLight._starBound = true;
    }
    if (wpDefaultDeep && !wpDefaultDeep._starBound) {
      wpDefaultDeep.addEventListener('click', () => setBuiltinWallpaper('__wallpaper_deep__'));
      wpDefaultDeep._starBound = true;
    }
    if (wpDefaultBlue && !wpDefaultBlue._starBound) {
      wpDefaultBlue.addEventListener('click', () => setBuiltinWallpaper('__wallpaper_blue__'));
      wpDefaultBlue._starBound = true;
    }
    if (wpDefaultAurora && !wpDefaultAurora._starBound) {
      wpDefaultAurora.addEventListener('click', () => setBuiltinWallpaper('__wallpaper_purple__'));
      wpDefaultAurora._starBound = true;
    }

    // 锁屏密码（支持删除，删除前需验证原密码）
    const lockOldInput = container.querySelector('#settings-lock-pin-old');
    const lockNewInput = container.querySelector('#settings-lock-pin-new');
    const lockPinApply = container.querySelector('#settings-lock-pin-apply');
    const lockSection = container.querySelector('#settings-section-lock');
    const lockBlock = lockSection ? lockSection.querySelector('.settings-block') : null;
    function showLockAlert(message) {
      if (window.StarDialog && typeof window.StarDialog.alert === 'function') {
        window.StarDialog.alert({
          title: t('settingsLock'),
          message: String(message || ''),
          okText: t('ok', 'OK')
        });
        return;
      }
      alert(message);
    }

    function ensureLockSettingsUi() {
      if (!lockSection || !lockBlock) return;

      // Status line (current PIN status)
      let statusEl = lockBlock.querySelector('#settings-lock-pin-status');
      const labelEl = lockBlock.querySelector('label');
      if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'settings-lock-pin-status';
        statusEl.style.cssText = 'margin-top:6px;margin-bottom:10px;font-size:12px;color:var(--text-dim);';
        if (labelEl && labelEl.parentNode) labelEl.parentNode.insertBefore(statusEl, labelEl.nextSibling);
        else lockBlock.insertBefore(statusEl, lockBlock.firstChild);
      }

      // Confirm input
      let confirmInput = lockBlock.querySelector('#settings-lock-pin-confirm');
      if (!confirmInput) {
        confirmInput = document.createElement('input');
        confirmInput.type = 'password';
        confirmInput.id = 'settings-lock-pin-confirm';
        confirmInput.className = 'settings-input';
        confirmInput.style.marginTop = '8px';
        if (lockNewInput && lockNewInput.parentNode) lockNewInput.parentNode.insertBefore(confirmInput, lockNewInput.nextSibling);
        else lockBlock.appendChild(confirmInput);
      }

      // The "save password" button should not stick to the inputs visually.
      try {
        if (lockPinApply) lockPinApply.style.marginTop = '12px';
      } catch (_) {}

      // Show password toggle
      let showRow = lockBlock.querySelector('#settings-lock-pin-show-row');
      if (!showRow) {
        showRow = document.createElement('label');
        showRow.id = 'settings-lock-pin-show-row';
        showRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;color:var(--text-dim);user-select:none;';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = 'settings-lock-pin-show';
        cb.style.accentColor = 'var(--accent)';
        const text = document.createElement('span');
        text.id = 'settings-lock-pin-show-text';
        showRow.appendChild(cb);
        showRow.appendChild(text);
        if (confirmInput && confirmInput.parentNode) confirmInput.parentNode.insertBefore(showRow, confirmInput.nextSibling);
        else lockBlock.appendChild(showRow);

        cb.addEventListener('change', () => {
          const show = !!cb.checked;
          const type = show ? 'text' : 'password';
          try { if (lockOldInput) lockOldInput.type = type; } catch (_) {}
          try { if (lockNewInput) lockNewInput.type = type; } catch (_) {}
          try { confirmInput.type = type; } catch (_) {}
        });
      }

      // Auto lock block
      let autoBlock = lockSection.querySelector('#settings-lock-autolock-block');
      if (!autoBlock) {
        autoBlock = document.createElement('div');
        autoBlock.id = 'settings-lock-autolock-block';
        autoBlock.className = 'settings-block';
        autoBlock.style.marginTop = '14px';
        autoBlock.innerHTML = `
          <label id="settings-lock-autolock-label"></label>
          <select id="settings-lock-autolock" class="settings-input" style="margin-top:8px;">
            <option value="0"></option>
            <option value="60000"></option>
            <option value="300000"></option>
            <option value="600000"></option>
            <option value="1800000"></option>
          </select>
          <div id="settings-lock-autolock-hint" style="margin-top:8px;font-size:12px;color:var(--text-dim);"></div>
        `;
        lockSection.appendChild(autoBlock);
      }

      const autoSelect = lockSection.querySelector('#settings-lock-autolock');
      if (autoSelect && !autoSelect._starBound) {
        autoSelect.addEventListener('change', () => {
          const ms = Number(autoSelect.value) || 0;
          if (window.StarLock && typeof window.StarLock.setAutoLockMs === 'function') window.StarLock.setAutoLockMs(ms);
          else {
            try { localStorage.setItem('star-lock-autolock-ms', String(ms)); } catch (_) {}
          }
        });
        autoSelect._starBound = true;
      }
    }

    function updateLockSettingsLabels() {
      if (!lockSection || !lockBlock || !window.StarLock) return;
      const hasPin = !!(window.StarLock.hasPin && window.StarLock.hasPin());
      const statusEl = lockBlock.querySelector('#settings-lock-pin-status');
      const confirmInput = lockBlock.querySelector('#settings-lock-pin-confirm');
      const showText = lockBlock.querySelector('#settings-lock-pin-show-text');
      const autoLabel = lockSection.querySelector('#settings-lock-autolock-label');
      const autoHint = lockSection.querySelector('#settings-lock-autolock-hint');
      const autoSelect = lockSection.querySelector('#settings-lock-autolock');

      if (statusEl) statusEl.textContent = hasPin ? t('lockPinStatusSet') : t('lockPinStatusUnset');
      if (lockOldInput) lockOldInput.placeholder = t('currentPasswordPlaceholder');
      if (lockNewInput) lockNewInput.placeholder = t('lockPinPlaceholder');
      if (confirmInput) confirmInput.placeholder = t('lockPinConfirmPlaceholder');
      if (showText) showText.textContent = t('showPassword');

      if (autoLabel) autoLabel.textContent = t('autoLock');
      if (autoHint) autoHint.textContent = t('autoLockHint');
      if (autoSelect) {
        const opts = Array.from(autoSelect.querySelectorAll('option'));
        if (opts[0]) opts[0].textContent = t('autoLockOff');
        if (opts[1]) opts[1].textContent = t('autoLock1m');
        if (opts[2]) opts[2].textContent = t('autoLock5m');
        if (opts[3]) opts[3].textContent = t('autoLock10m');
        if (opts[4]) opts[4].textContent = t('autoLock30m');
        const ms = window.StarLock.getAutoLockMs ? Number(window.StarLock.getAutoLockMs()) : 0;
        const value = String(Number.isFinite(ms) && ms > 0 ? ms : 0);
        const has = Array.from(autoSelect.options).some(opt => String(opt.value) === value);
        autoSelect.value = has ? value : '0';
      }
    }

    ensureLockSettingsUi();
    updateLockSettingsLabels();
    if (lockPinApply && window.StarLock && !lockPinApply._starBound) {
      lockPinApply.addEventListener('click', () => {
        const hasPin = window.StarLock.hasPin && window.StarLock.hasPin();
        const oldVal = lockOldInput ? lockOldInput.value.trim() : '';
        const newVal = lockNewInput ? lockNewInput.value.trim() : '';
        const confirmInput = lockBlock ? lockBlock.querySelector('#settings-lock-pin-confirm') : null;
        const confirmVal = confirmInput ? String(confirmInput.value || '').trim() : '';
        if (hasPin) {
          const current = window.StarLock.getPin ? window.StarLock.getPin() : null;
          if (!oldVal) {
            showLockAlert(t('currentPasswordRequired'));
            return;
          }
          if (!current || oldVal !== current) {
            showLockAlert(t('incorrectCurrentPassword'));
            return;
          }
        }
        // 到这里说明：要么之前没有设置密码，要么原密码校验通过
        const finalPin = newVal; // 允许 newVal 为空串，表示删除密码
        if (newVal) {
          const minLen = 4;
          if (newVal.length < minLen) {
            showLockAlert(t('lockPinTooShort', 'PIN must be at least {min} characters.', { min: minLen }));
            return;
          }
          if (confirmVal !== newVal) {
            showLockAlert(t('lockPinMismatch', 'The new PINs do not match.'));
            return;
          }
        }
        window.StarLock.setPin(finalPin);
        if (window.StarNotify) {
          const msg = finalPin ? t('passwordUpdated') : t('passwordRemoved');
          window.StarNotify.show({ title: t('settingsLock'), message: msg });
        }
        if (lockOldInput) lockOldInput.value = '';
        if (lockNewInput) lockNewInput.value = '';
        if (confirmInput) confirmInput.value = '';
        updateLockSettingsLabels();
      });
      lockPinApply._starBound = true;
    }
  },

  'control-panel'(container) {
    if (!container) return;
    container.querySelectorAll('.control-panel-item').forEach(btn => {
      btn.addEventListener('click', () => StarAppsRegistry.open(btn.getAttribute('data-open')));
    });
  },

  'network-tools'(container) {
    if (!container) return;
    const electron = require('electron');
    const titleEl = container.querySelector('#nt-title');
    const input = container.querySelector('#nt-ping-input');
    const pingBtn = container.querySelector('#nt-ping-btn');
    const ipconfigBtn = container.querySelector('#nt-ipconfig-btn');
    const output = container.querySelector('#nt-output');
    function tr(key, fallback) {
      try {
        const value = typeof t === 'function' ? t(key) : key;
        return value === key ? fallback : value;
      } catch (_) {
        return fallback;
      }
    }
    function updateStaticLabels() {
      if (titleEl) titleEl.textContent = tr('networkTools', 'Network Tools');
      if (input) input.placeholder = tr('pingPlaceholder', 'Enter host or IP');
      if (pingBtn) pingBtn.textContent = tr('goPing', 'Ping');
      if (ipconfigBtn) ipconfigBtn.textContent = tr('ipConfig', 'IP Config');
    }
    function append(s) { output.textContent += s; output.scrollTop = output.scrollHeight; }
    function clear() { output.textContent = ''; }
    pingBtn.addEventListener('click', () => {
      const host = input.value.trim();
      if (!host) return;
      clear();
      append('> ping ' + host + '\n');
      electron.ipcRenderer.invoke('os:exec', 'ping ' + host).then(r => {
        append(r.stdout || r.stderr || '');
      });
    });
    ipconfigBtn.addEventListener('click', () => {
      clear();
      append('> ipconfig\n');
      electron.ipcRenderer.invoke('os:exec', process.platform === 'win32' ? 'ipconfig' : 'ifconfig').then(r => {
        append(r.stdout || r.stderr || '');
      });
    });
    setWindowLocaleRefresh(container, updateStaticLabels);
    updateStaticLabels();
  },

  paint(container) {
    if (!container) return;
    const canvas = container.querySelector('#paint-canvas');
    const colorInput = container.querySelector('#paint-color');
    const sizeInput = container.querySelector('#paint-size');
    const sizeVal = container.querySelector('#paint-size-val');
    const clearBtn = container.querySelector('#paint-clear');
    const ctx = canvas.getContext('2d');
    let drawing = false;
    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize);
    function getPos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function setPaintStyle() {
      ctx.strokeStyle = colorInput.value;
      ctx.lineWidth = sizeInput.value;
      ctx.lineCap = 'round';
    }
    canvas.addEventListener('mousedown', e => { setPaintStyle(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
    canvas.addEventListener('mousemove', e => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); });
    canvas.addEventListener('mouseup', () => drawing = false);
    canvas.addEventListener('mouseleave', () => drawing = false);
    colorInput.addEventListener('input', setPaintStyle);
    sizeInput.addEventListener('input', () => { sizeVal.textContent = sizeInput.value + 'px'; setPaintStyle(); });
    sizeVal.textContent = sizeInput.value + 'px';
    setPaintStyle();
    clearBtn.addEventListener('click', () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); });
  },

  clock(container) {
    if (!container) return;
    const timeEl = container.querySelector('#clock-time');
    const dateEl = container.querySelector('#clock-date');
    function tick() {
      const d = new Date();
      timeEl.textContent = d.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      dateEl.textContent = d.toLocaleDateString(getLocale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    tick();
    setInterval(tick, 1000);
  },

  'game-tetris'(container) { if (window.StarGames && window.StarGames.tetris) window.StarGames.tetris(container); },
  'game-snake'(container) { if (window.StarGames && window.StarGames.snake) window.StarGames.snake(container); },
  'game-link'(container) { if (window.StarGames && window.StarGames.link) window.StarGames.link(container); },
  'game-platformer'(container) { if (window.StarGames && window.StarGames.platformer) window.StarGames.platformer(container); },
  'game-landlord'(container) { if (window.StarGames && window.StarGames.landlord) window.StarGames.landlord(container); },
  'game-runner'(container) { if (window.StarGames && window.StarGames.runner) window.StarGames.runner(container); },
  'game-tank'(container) { if (window.StarGames && window.StarGames.tank) window.StarGames.tank(container); },
  'game-plane'(container) { if (window.StarGames && window.StarGames.plane) window.StarGames.plane(container); },
  'game-gomoku'(container) { if (window.StarGames && window.StarGames.gomoku) window.StarGames.gomoku(container); },
  'game-minesweeper'(container) { if (window.StarGames && window.StarGames.minesweeper) window.StarGames.minesweeper(container); },
  'game-2048'(container) { if (window.StarGames && window.StarGames.game2048) window.StarGames.game2048(container); },
  'game-othello'(container) { if (window.StarGames && window.StarGames.othello) window.StarGames.othello(container); },
  'game-sokoban'(container) { if (window.StarGames && window.StarGames.sokoban) window.StarGames.sokoban(container); },
  'game-sudoku'(container) { if (window.StarGames && window.StarGames.sudoku) window.StarGames.sudoku(container); },
  'game-solitaire'(container) { if (window.StarGames && window.StarGames.solitaire) window.StarGames.solitaire(container); },
  'game-carrot-defense'(container) { if (window.StarGames && window.StarGames.carrotDefense) window.StarGames.carrotDefense(container); },

  'star-unzip'(container) {
    if (!container) return;
    const path = require('path');
    const electron = require('electron');
    const openBtn = container.querySelector('#unzip-open');
    const extractAllBtn = container.querySelector('#unzip-extract-all');
    const extractSelectedBtn = container.querySelector('#unzip-extract-selected');
    const extractToBtn = container.querySelector('#unzip-extract-to');
    const addBtn = container.querySelector('#unzip-add');
    const newBtn = container.querySelector('#unzip-new');
    const pathEl = container.querySelector('#unzip-path');
    const selectAllCb = container.querySelector('#unzip-select-all');
    const headNameEl = container.querySelector('#unzip-head-name');
    const headSizeEl = container.querySelector('#unzip-head-size');
    const tbody = container.querySelector('#unzip-tbody');
    const statusEl = container.querySelector('#unzip-status');
    const _t = (k, d) => (typeof t === 'function' ? t(k, d) : d);

    let currentArchivePath = null;
    let entries = [];
    let selectedPaths = new Set();
    let statusMode = 'hint';
    let statusCount = 0;
    // 默认 GBK（更符合中文压缩包常见情况），主进程会自动回退 UTF-8
    let currentCharset = 'gbk';

    function getEntryKey(rawPath) {
      return String(rawPath || '').replace(/\\/g, '/');
    }
    function getStatusText(mode, count) {
      switch (mode) {
        case 'loading':
          return _t('unzipLoading', 'Loading...');
        case 'extracting':
          return _t('unzipExtracting', 'Extracting...');
        case 'adding':
          return _t('unzipAdding', 'Processing...');
        case 'done':
          return _t('unzipDone', 'Done');
        case 'empty':
          return _t('folderEmpty', 'Empty');
        case 'count':
          return String(count || 0) + ' ' + _t('unzipItems', 'items');
        case 'hint':
          return _t('unzipOpenHint', 'Open an archive or create a new one');
        default:
          return statusEl ? statusEl.textContent : '';
      }
    }
    function setStatus(msg, mode, count) {
      if (mode) statusMode = mode;
      if (typeof count === 'number') statusCount = count;
      if (statusEl) statusEl.textContent = msg || '';
    }
    function refreshStatusText() {
      if (statusMode === 'error') return;
      setStatus(getStatusText(statusMode, statusCount), statusMode, statusCount);
    }
    function updateStaticLabels() {
      if (openBtn) openBtn.textContent = _t('open', 'Open');
      if (extractAllBtn) extractAllBtn.textContent = _t('unzipExtractAll', 'Extract All');
      if (extractSelectedBtn) extractSelectedBtn.textContent = _t('unzipExtractSelected', 'Extract Selected');
      if (extractToBtn) extractToBtn.textContent = _t('unzipExtractTo', 'Extract To...');
      if (addBtn) addBtn.textContent = _t('unzipAddFiles', 'Add Files');
      if (newBtn) newBtn.textContent = _t('unzipNewArchive', 'New Archive');
      if (selectAllCb) selectAllCb.title = _t('selectAll', 'Select All');
      if (headNameEl) headNameEl.textContent = _t('name', 'Name');
      if (headSizeEl) headSizeEl.textContent = _t('size', 'Size');
    }
    function formatSize(n) {
      if (n === undefined || n === null) return '—';
      if (n < 1024) return n + ' B';
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
      return (n / (1024 * 1024)).toFixed(2) + ' MB';
    }
    function setPath(p) {
      currentArchivePath = p;
      if (pathEl) pathEl.textContent = p ? path.basename(p) : '';
      const hasArchive = !!p;
      if (extractAllBtn) extractAllBtn.disabled = !hasArchive;
      if (extractToBtn) extractToBtn.disabled = !hasArchive;
      if (addBtn) addBtn.disabled = !hasArchive;
    }
    function updateExtractSelectedState() {
      const hasSel = selectedPaths.size > 0;
      if (extractSelectedBtn) extractSelectedBtn.disabled = !hasSel;
      if (selectAllCb) selectAllCb.checked = entries.length > 0 && selectedPaths.size === entries.length;
      if (selectAllCb) selectAllCb.indeterminate = selectedPaths.size > 0 && selectedPaths.size < entries.length;
    }
    function renderList(list, options = {}) {
      const preserveSelection = !!options.preserveSelection;
      const previousSelection = preserveSelection ? new Set(selectedPaths) : new Set();
      entries = list || [];
      selectedPaths = preserveSelection
        ? new Set(entries.map(entry => getEntryKey(entry && entry.path)).filter(key => previousSelection.has(key)))
        : new Set();
      if (!tbody) return;
      tbody.innerHTML = entries.map(e => {
        const rawPath = e.path ? String(e.path) : '';
        const name = rawPath ? rawPath.split(/[/\\]/).pop() || rawPath : '';
        const isDir = e.isFolder;
        const sizeStr = isDir ? (typeof t === 'function' ? t('folderType', '文件夹') : '文件夹') : formatSize(e.size);
        const pathKey = getEntryKey(rawPath);
        return `<tr class="unzip-row" data-path="${escapeHtml(pathKey)}" data-folder="${!!isDir}">
          <td style="padding:6px 8px;"><input type="checkbox" class="unzip-row-cb" ${isDir ? '' : 'data-file="1"'}></td>
          <td style="padding:6px 8px;">${isDir ? '📁 ' : ''}${escapeHtml(name)}</td>
          <td style="text-align:right;padding:6px 8px;">${sizeStr}</td>
        </tr>`;
      }).join('');
      tbody.querySelectorAll('.unzip-row').forEach(row => {
        const pathKey = row.getAttribute('data-path');
        const cb = row.querySelector('.unzip-row-cb');
        if (cb) {
          cb.checked = selectedPaths.has(pathKey);
          cb.addEventListener('change', () => {
            if (cb.checked) selectedPaths.add(pathKey);
            else selectedPaths.delete(pathKey);
            updateExtractSelectedState();
          });
        }
        row.addEventListener('click', (e) => {
          if (e.target.tagName === 'INPUT') return;
          if (cb) {
            cb.checked = !cb.checked;
            if (cb.checked) selectedPaths.add(pathKey);
            else selectedPaths.delete(pathKey);
            updateExtractSelectedState();
          }
        });
      });
      updateExtractSelectedState();
    }
    async function loadArchive(archivePath) {
      if (!archivePath) return;
      setPath(archivePath);
      statusMode = 'loading';
      statusCount = 0;
      setStatus(typeof t === 'function' ? t('unzipLoading', '正在加载…') : '正在加载…');
      renderList([]);
      const result = await electron.ipcRenderer.invoke('os:archiveList', archivePath, currentCharset);
      if (result && result.error) {
        statusMode = 'error';
        setStatus(result.error);
        return;
      }
      statusMode = 'done';
      statusMode = 'done';
      statusMode = 'done';
      // 主进程会自动侦测更合适的编码（936/65001），这里回写，保证后续“解压选中/全部”使用同一编码策略
      if (result && result.charset != null) {
        const picked = String(result.charset);
        currentCharset = (picked === '65001' || picked === 'utf8') ? 'utf8' : 'gbk';
      }
      const list = (result && result.entries) || [];
      renderList(list);
      statusMode = list.length === 0 ? 'empty' : 'count';
      statusCount = list.length;
      setStatus(list.length === 0 ? (typeof t === 'function' ? t('folderEmpty', '空') : '空') : list.length + ' ' + (typeof t === 'function' ? t('unzipItems', '项') : '项'));
    }
    async function doExtract(entryPaths) {
      if (!currentArchivePath) return;
      const win = (electron.remote && electron.remote.getCurrentWindow()) || null;
      const dest = await window.showInternalOpenDialog({ properties: ['openDirectory'], title: typeof t === 'function' ? t('unzipSelectDest', '选择解压目标文件夹') : '选择解压目标文件夹' });
      if (!dest || dest.canceled || !dest.filePaths || !dest.filePaths[0]) return;
      const destDir = dest.filePaths[0];
      statusMode = 'extracting';
      statusCount = 0;
      setStatus(typeof t === 'function' ? t('unzipExtracting', '解压中…') : '解压中…');
      const result = await electron.ipcRenderer.invoke('os:archiveExtract', currentArchivePath, destDir, entryPaths, currentCharset);
      if (result && result.error) {
        statusMode = 'error';
        setStatus(result.error);
        return;
      }
      setStatus(typeof t === 'function' ? t('unzipDone', '解压完成') : '解压完成');
    }
    if (selectAllCb) {
      selectAllCb.addEventListener('change', () => {
        const checked = selectAllCb.checked;
        entries.forEach(e => {
          const key = getEntryKey(e.path);
          if (checked) selectedPaths.add(key);
          else selectedPaths.delete(key);
        });
        tbody.querySelectorAll('.unzip-row-cb').forEach(cb => { cb.checked = checked; });
        updateExtractSelectedState();
      });
    }
    if (openBtn) {
      openBtn.addEventListener('click', async () => {
        const r = await window.showInternalOpenDialog({
          properties: ['openFile'],
          filters: [{ name: 'Archives', extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'] }],
          title: typeof t === 'function' ? t('open', '打开') : '打开'
        });
        if (r && !r.canceled && r.filePaths && r.filePaths[0]) await loadArchive(r.filePaths[0]);
      });
    }
    if (extractAllBtn) extractAllBtn.addEventListener('click', () => doExtract(null));
    if (extractSelectedBtn) extractSelectedBtn.addEventListener('click', () => doExtract(Array.from(selectedPaths)));
    if (extractToBtn) {
      extractToBtn.addEventListener('click', async () => {
        if (!currentArchivePath) return;
        const dir = path.dirname(currentArchivePath);
        const baseName = path.basename(currentArchivePath, path.extname(currentArchivePath));
        const defaultPath = path.join(dir, baseName);
        const r = await window.showInternalOpenDialog({ properties: ['openDirectory'], title: typeof t === 'function' ? t('unzipExtractTo', '解压到…') : '解压到…' });
        if (!r || r.canceled || !r.filePaths || !r.filePaths[0]) return;
        statusMode = 'extracting';
        statusCount = 0;
        setStatus(typeof t === 'function' ? t('unzipExtracting', '解压中…') : '解压中…');
        const result = await electron.ipcRenderer.invoke('os:archiveExtract', currentArchivePath, r.filePaths[0], null, currentCharset);
        if (result && result.error) { statusMode = 'error'; setStatus(result.error); return; }
        statusMode = 'done';
        setStatus(typeof t === 'function' ? t('unzipDone', '解压完成') : '解压完成');
      });
    }
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        if (!currentArchivePath) return;
        const r = await window.showInternalOpenDialog({ properties: ['openFile', 'multiSelections'], title: typeof t === 'function' ? t('unzipAddFiles', '添加文件') : '添加文件' });
        if (!r || r.canceled || !r.filePaths || r.filePaths.length === 0) return;
        statusMode = 'adding';
        statusCount = 0;
        setStatus(typeof t === 'function' ? t('unzipAdding', '添加中…') : '添加中…');
        const result = await electron.ipcRenderer.invoke('os:archiveAdd', currentArchivePath, r.filePaths);
        if (result && result.error) { statusMode = 'error'; setStatus(result.error); return; }
        await loadArchive(currentArchivePath);
        statusMode = 'done';
        setStatus(typeof t === 'function' ? t('unzipDone', '完成') : '完成');
      });
    }
    if (newBtn) {
      newBtn.addEventListener('click', async () => {
        const save = await window.showInternalSaveDialog({
          title: typeof t === 'function' ? t('unzipNewArchive', '新建压缩包') : '新建压缩包',
          defaultPath: 'archive.zip',
          filters: [{ name: 'ZIP', extensions: ['zip'] }, { name: '7z', extensions: ['7z'] }]
        });
        if (!save || save.canceled || !save.filePath) return;
        const open = await window.showInternalOpenDialog({ properties: ['openFile', 'multiSelections'], title: typeof t === 'function' ? t('unzipSelectFiles', '选择要压缩的文件') : '选择要压缩的文件' });
        if (!open || open.canceled || !open.filePaths || open.filePaths.length === 0) return;
        statusMode = 'adding';
        statusCount = 0;
        setStatus(typeof t === 'function' ? t('unzipAdding', '压缩中…') : '压缩中…');
        const result = await electron.ipcRenderer.invoke('os:archiveAdd', save.filePath, open.filePaths);
        if (result && result.error) { statusMode = 'error'; setStatus(result.error); return; }
        setPath(save.filePath);
        await loadArchive(save.filePath);
        statusMode = 'done';
        setStatus(typeof t === 'function' ? t('unzipDone', '完成') : '完成');
      });
    }
    setWindowLocaleRefresh(container, () => {
      updateStaticLabels();
      if (currentArchivePath) renderList(entries, { preserveSelection: true });
      refreshStatusText();
    });
    updateStaticLabels();
    const initialPath = window.__starUnzipInitialPath;
    if (initialPath) {
      window.__starUnzipInitialPath = null;
      loadArchive(initialPath);
    } else {
      setStatus(typeof t === 'function' ? t('unzipOpenHint', '打开压缩包或新建') : '打开压缩包或新建');
    }
  },

  'java-ide'(container) {
    if (!container) return;
    const electron = require('electron');
    const path = require('path');
    const osHome = process.env.USERPROFILE || process.env.HOME || 'C:\\\\';
    const baseDir = path.join(osHome, 'StarJavaProjects');
    const projectPathEl = container.querySelector('#java-ide-project-path');
    const fileListEl = container.querySelector('#java-ide-filelist');
    const filenameInput = container.querySelector('#java-ide-filename');
    const consoleEl = container.querySelector('#java-ide-console');
    const consoleInput = container.querySelector('#java-ide-console-input');
    const consolePrompt = container.querySelector('#java-ide-console-prompt');
    const btnNew = container.querySelector('#java-ide-new');
    const btnOpen = container.querySelector('#java-ide-open');
    const btnRun = container.querySelector('#java-ide-run');
    const btnSave = container.querySelector('#java-ide-save');
    const tplSelect = container.querySelector('#java-ide-template');
    const fontSizeSelect = container.querySelector('#java-ide-fontsize');
    let currentProject = null;
    let editor = null;

    const STORAGE_FONT = 'star-java-ide-fontsize';
    const STORAGE_PROJECT = 'star-java-ide-last-project';
    const STORAGE_FILENAME = 'star-java-ide-last-file';

    function log(msg) {
      if (!consoleEl) return;
      const text = String(msg).replace(/\\n/g, '\n');
      consoleEl.textContent += text + '\n';
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
    function clearConsole() {
      if (consoleEl) consoleEl.textContent = '';
    }
    function ensureBaseDir() {
      return electron.ipcRenderer.invoke('os:mkdir', baseDir).then(() => baseDir);
    }
    function setProject(p) {
      currentProject = p;
      if (projectPathEl) projectPathEl.textContent = p || '(未选择)';
      try {
        if (p) localStorage.setItem(STORAGE_PROJECT, p);
        else localStorage.removeItem(STORAGE_PROJECT);
      } catch (_) {}
    }
    const templates = {
      hello: {
        file: 'Main.java',
        className: 'Main',
        code:
`public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Star OS Java IDE!");
    }
}`
      },
      loop: {
        file: 'Main.java',
        className: 'Main',
        code:
`import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] nums = {1,2,3,4,5};
        int sum = 0;
        for (int n : nums) {
            sum += n;
        }
        System.out.println("nums=" + Arrays.toString(nums));
        System.out.println("sum=" + sum);
    }
}`
      },
      oop: {
        file: 'Main.java',
        className: 'Main',
        code:
`class Person {
    private String name;
    public Person(String name) {
        this.name = name;
    }
    public void sayHello() {
        System.out.println("Hello, I am " + name);
    }
}

public class Main {
    public static void main(String[] args) {
        Person p = new Person("Star");
        p.sayHello();
    }
}`
      }
    };

    // JavaIDE 内置终端当前工作目录（默认等于当前工程）
    let shellCwd = null;

    function updatePrompt() {
      if (!consolePrompt) return;
      const cwd = shellCwd || currentProject || baseDir;
      const short = cwd ? cwd.replace(osHome, '~') : '~';
      consolePrompt.textContent = short + ' $';
    }

    function runShellCommand(cmd) {
      const text = (cmd || '').trim();
      if (!text) return;
      const cwd = shellCwd || currentProject || osHome;
      log((cwd || '') + ' $ ' + text);
      // 内部支持 cd
      const parts = text.split(/\s+/);
      if (parts[0] === 'cd') {
        const target = parts[1] || osHome;
        const next = path.isAbsolute(target) ? target : path.join(cwd, target);
        electron.ipcRenderer.invoke('os:stat', next).then(stat => {
          if (stat && stat.isDir) {
            shellCwd = next;
            updatePrompt();
          } else {
            log((stat && stat.error) || 'cd: no such directory');
          }
        });
        if (consoleInput) consoleInput.value = '';
        return;
      }

      // 在 Windows 下兼容常见 Linux 命令
      let toExec = text;
      if (typeof process !== 'undefined' && process.platform === 'win32') {
        const cmdName = parts[0];
        const args = parts.slice(1);
        if (cmdName === 'ls') {
          // 忽略简单参数（如 -la），只保留路径参数
          const pathArgs = args.filter(a => !a.startsWith('-'));
          toExec = 'dir' + (pathArgs.length ? ' ' + pathArgs.join(' ') : '');
        } else if (cmdName === 'pwd') {
          toExec = 'cd';
        } else if (cmdName === 'clear') {
          if (consoleEl) consoleEl.textContent = '';
          if (consoleInput) consoleInput.value = '';
          return;
        }
      } else if (parts[0] === 'clear') {
        // 在类 Unix 下，直接清屏，而不是真的执行 clear 命令，避免闪烁
        if (consoleEl) consoleEl.textContent = '';
        if (consoleInput) consoleInput.value = '';
        return;
      }

      electron.ipcRenderer.invoke('os:exec', toExec, cwd).then(r => {
        if (r.stdout) log(r.stdout.trimEnd());
        if (r.stderr) log(r.stderr.trimEnd());
        if (!r.stdout && !r.stderr) log('');
      });
      if (consoleInput) consoleInput.value = '';
    }

    function loadCodeMirrorAssets(cb) {
      if (window.CodeMirror) { cb(); return; }
      if (window.__starJavaCMLoading) {
        // 已在加载，轮询等待
        let tries = 0;
        (function wait() {
          if (window.CodeMirror || tries > 200) {
            if (window.CodeMirror) cb();
            return;
          }
          tries++;
          setTimeout(wait, 50);
        })();
        return;
      }
      window.__starJavaCMLoading = true;
      const head = document.head || document.getElementsByTagName('head')[0];
      function addCss(href) {
        if ([...document.styleSheets].some(s => s.href && s.href.indexOf(href) !== -1)) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        head.appendChild(link);
      }
      function addScript(src) {
        return new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = src;
          s.onload = () => resolve();
      s.onerror = () => reject(new Error((typeof t === 'function' ? t('loadFailed', 'Load failed') : 'Load failed') + ': ' + src));
          head.appendChild(s);
        });
      }
      addCss('https://unpkg.com/codemirror@5/lib/codemirror.css');
      addCss('https://unpkg.com/codemirror@5/theme/material-darker.css');
      addCss('https://unpkg.com/codemirror@5/addon/hint/show-hint.css');
      Promise.resolve()
        .then(() => addScript('https://unpkg.com/codemirror@5/lib/codemirror.js'))
        .then(() => addScript('https://unpkg.com/codemirror@5/mode/clike/clike.js'))
        .then(() => addScript('https://unpkg.com/codemirror@5/addon/hint/show-hint.js'))
        .then(() => { cb(); })
        .catch(() => { /* 失败时不致命，只是没有高亮 */ });
    }

    loadCodeMirrorAssets(() => {
      const editorHost = container.querySelector('#java-ide-editor');
      if (!editorHost) return;

      // 恢复上次保存的字号设置
      let initialFont = '13';
      try {
        const saved = localStorage.getItem(STORAGE_FONT);
        if (saved) initialFont = saved;
      } catch (_) {}
      editor = window.CodeMirror(editorHost, {
        value: '',
        mode: 'text/x-java',
        theme: 'material-darker',
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        extraKeys: {
          'Ctrl-S': () => doSave(),
          'F5': () => doRun(),
          'Ctrl-Space': (cm) => {
            if (window.CodeMirror && window.CodeMirror.showHint) {
              window.CodeMirror.showHint(cm, javaIDEHint, { completeSingle: false });
            }
          }
        }
      });
      // 默认字号（带持久化）
      if (fontSizeSelect) {
        fontSizeSelect.value = initialFont;
      }
      editor.getWrapperElement().style.fontSize = initialFont + 'px';
      editor.refresh();
      // 自动补全：输入标识符时弹出提示
      if (window.CodeMirror && window.CodeMirror.showHint) {
        editor.on('inputRead', (cm, change) => {
          if (cm.state.completionActive) return;
          const text = (change && change.text && change.text[0]) || '';
          if (!text || !/[A-Za-z0-9_.]/.test(text)) return;
          window.CodeMirror.showHint(cm, javaIDEHint, { completeSingle: false });
        });
      }

      // 初始化终端 cwd 与提示符
      shellCwd = currentProject || baseDir;
      updatePrompt();
      if (consoleInput) {
        consoleInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') runShellCommand(consoleInput.value);
        });
      }
    });

    // JavaIDE 专用补全函数：关键字 + 常用类 + 简单片段
    function javaIDEHint(cm) {
      const CodeMirror = window.CodeMirror;
      const cur = cm.getCursor();
      const token = cm.getTokenAt(cur);
      const start = token.start;
      const end = cur.ch;
      const curWord = token.string.slice(0, end - start);
      const from = CodeMirror.Pos(cur.line, start);
      const to = CodeMirror.Pos(cur.line, end);

      const baseKeywords = [
        'class','public','private','protected','static','final','void','int','long','double','float',
        'boolean','char','String','new','if','else','for','while','do','switch','case','default',
        'try','catch','finally','throw','throws','return','import','package','extends','implements'
      ];
      const commonTypes = [
        'System','System.out','System.err','StringBuilder','List','ArrayList','Map','HashMap',
        'Set','HashSet','Arrays','Collections','Scanner'
      ];
      const snippets = [
        { label: 'sout', insert: 'System.out.println();' },
        // 使用真实换行，而不是文本形式的 "\n"
        { label: 'psvm', insert: 'public static void main(String[] args) {\n    \n}' }
      ];

      let list = [];
      const lower = (curWord || '').toLowerCase();

      if (lower) {
        list = list.concat(
          baseKeywords.filter(k => k.toLowerCase().startsWith(lower)),
          commonTypes.filter(k => k.toLowerCase().startsWith(lower))
        );
        snippets.forEach(sn => {
          if (sn.label.startsWith(lower)) list.push(sn.insert);
        });
      } else {
        list = baseKeywords.concat(commonTypes).concat(snippets.map(sn => sn.insert));
      }

      // 去重
      list = Array.from(new Set(list));

      return { list, from, to };
    }

    function loadTemplateIntoEditor(key) {
      if (!editor) return;
      const tpl = templates[key] || templates.hello;
      editor.setValue(tpl.code);
      if (filenameInput) filenameInput.value = tpl.file;
    }

    function createProject(initialCode) {
      // 返回 Promise，方便在创建完成后继续运行代码
      return ensureBaseDir().then(async () => {
        // 基础目录固定在 StarJavaProjects，用户可以自定义工程名
        let projName = 'JavaProject-' + Date.now();
        if (window.StarDialog && typeof window.StarDialog.prompt === 'function') {
          const input = await window.StarDialog.prompt({
            title: typeof t === 'function' ? t('javaNewProject') : 'New Project',
            message: typeof t === 'function' ? t('javaProjectNamePrompt') : 'Enter a project name',
            defaultValue: projName,
            okText: typeof t === 'function' ? t('ok') : 'OK',
            cancelText: typeof t === 'function' ? t('cancel') : 'Cancel'
          });
          if (!input || !input.trim()) {
            const cancelError = new Error('Project creation canceled');
            cancelError.code = 'STAR_DIALOG_CANCEL';
            throw cancelError;
          }
          projName = input.trim();
        }

        const proj = path.join(baseDir, projName);
        return electron.ipcRenderer.invoke('os:mkdir', proj).then(() => {
          const key = tplSelect ? (tplSelect.value || 'hello') : 'hello';
          const tpl = templates[key] || templates.hello;
          const filePath = path.join(proj, tpl.file);
          const code = typeof initialCode === 'string' && initialCode.trim() ? initialCode : tpl.code;
          return electron.ipcRenderer.invoke('os:writeFile', filePath, code).then(() => {
            setProject(proj);
            if (editor) editor.setValue(code);
            if (filenameInput) {
              filenameInput.value = tpl.file;
              try { localStorage.setItem(STORAGE_FILENAME, tpl.file); } catch (_) {}
            }
            clearConsole();
            log(typeof t === 'function' ? t('javaProjectCreated', null, { project: proj }) : ('Project created: ' + proj));
            refreshFileList();
            return proj;
          });
        });
      });
    }

    function openProject() {
      ensureBaseDir().then(() => {
        window.showInternalOpenDialog({
          properties: ['openDirectory'],
          title: typeof t === 'function' ? t('javaSelectProjectDir') : 'Choose a Java project folder'
        }).then(r => {
          if (r.canceled || !r.filePaths || !r.filePaths[0]) return;
          const proj = r.filePaths[0];

          // 在选中的目录中查找第一个 Java 源文件（优先 Main.java），避免强行读取一个不存在的 Main.java
          const findFirstJavaFile = (root) => {
            const maxDepth = 6;
            const found = { path: null };
            const walk = (dir, depth) => {
              if (found.path || depth > maxDepth) return Promise.resolve();
              return electron.ipcRenderer.invoke('os:readdir', dir).then(list => {
                if (!Array.isArray(list)) return;
                // 先找 Main.java
                const files = list.slice();
                for (const f of files) {
                  const name = f.name || '';
                  const full = path.join(dir, name);
                  if (!f.isDir && /\.java$/i.test(name)) {
                    if (name === 'Main.java') {
                      found.path = full;
                      return;
                    }
                  }
                }
                // 再递归子目录并记录第一个 .java 文件
                const tasks = [];
                for (const f of files) {
                  const name = f.name || '';
                  const full = path.join(dir, name);
                  if (f.isDir) {
                    tasks.push(walk(full, depth + 1));
                  } else if (!found.path && /\.java$/i.test(name)) {
                    found.path = full;
                  }
                }
                return Promise.all(tasks);
              }).catch(() => {});
            };
            return walk(root, 0).then(() => found.path);
          };

          findFirstJavaFile(proj).then(firstJava => {
            setProject(proj);
            clearConsole();
            log(typeof t === 'function' ? t('javaProjectOpened', null, { project: proj }) : ('Project opened: ' + proj));
            if (firstJava) {
              electron.ipcRenderer.invoke('os:readFile', firstJava).then(content => {
                if (editor) editor.setValue(typeof content === 'string' ? content : (content && content.error ? content.error : ''));
                if (filenameInput) {
                  const base = path.basename(firstJava);
                  filenameInput.value = base;
                  try { localStorage.setItem(STORAGE_FILENAME, base); } catch (_) {}
                }
                refreshFileList();
              });
            } else {
              if (editor) editor.setValue(typeof t === 'function' ? t('javaNoJavaSourceFound') : '// No Java source file was found in this project. Create one before running.');
              if (filenameInput) {
                filenameInput.value = 'Main.java';
                try { localStorage.setItem(STORAGE_FILENAME, 'Main.java'); } catch (_) {}
              }
              refreshFileList();
            }
          });
        });
      });
    }

    function doSave() {
      if (!editor) return;
      if (!currentProject) {
        // 自动根据当前代码创建临时工程，而不是弹出“请先创建工程”
        createProject(editor.getValue()).catch(err => {
          if (err && err.code === 'STAR_DIALOG_CANCEL') return;
          log(typeof t === 'function'
            ? t('javaCreateError', null, { message: err && err.message ? err.message : String(err) })
            : ('Error creating project: ' + (err && err.message ? err.message : String(err))));
        });
        return;
      }
      const file = filenameInput ? filenameInput.value.trim() || 'Main.java' : 'Main.java';
      const filePath = path.join(currentProject, file);
      electron.ipcRenderer.invoke('os:writeFile', filePath, editor.getValue()).then(res => {
        if (res && res.error) log(typeof t === 'function' ? t('javaSaveFailed', null, { message: res.error }) : ('Save failed: ' + res.error));
        else {
          log(typeof t === 'function' ? t('javaSavedFile', null, { file: filePath }) : ('Saved ' + filePath));
          try { localStorage.setItem(STORAGE_FILENAME, file); } catch (_) {}
          refreshFileList();
        }
      });
    }

    function doRun() {
      if (!editor) return;
      if (!currentProject) {
        // 若尚未创建工程，先根据当前代码创建工程，完成后自动继续运行
        clearConsole();
        log(typeof t === 'function' ? t('javaCreatingProject') : 'Creating a project from the current code. Please wait...');
        createProject(editor.getValue()).then(() => {
          if (!currentProject) {
            log(typeof t === 'function' ? t('javaCreateFailedCheckDisk') : 'Failed to create the project. Check disk permissions or the path.');
            return;
          }
          doRun();
        }).catch(err => {
          if (err && err.code === 'STAR_DIALOG_CANCEL') return;
          log(typeof t === 'function'
            ? t('javaCreateError', null, { message: err && err.message ? err.message : String(err) })
            : ('Error creating project: ' + (err && err.message ? err.message : String(err))));
        });
        return;
      }
      const file = filenameInput ? filenameInput.value.trim() || 'Main.java' : 'Main.java';
      const mainClass = path.basename(file, '.java');
      const code = editor.getValue();
      const filePath = path.join(currentProject, file);
      clearConsole();
      log(typeof t === 'function' ? t('javaSaving') : 'Saving...');
      electron.ipcRenderer.invoke('os:writeFile', filePath, code).then(res => {
        if (res && res.error) {
          log(typeof t === 'function' ? t('javaSaveFailed', null, { message: res.error }) : ('Save failed: ' + res.error));
          return;
        }
        // 在“终端”中展示将要执行的命令
        shellCwd = currentProject;
        updatePrompt();
        const relFile = path.basename(filePath);
        log(currentProject + ' $ javac -encoding UTF-8 ' + relFile);
        log(currentProject + ' $ java -cp . ' + mainClass);
        log(typeof t === 'function' ? t('javaCompilingRunning') : 'Compiling/running (javac + java)...');
        electron.ipcRenderer.invoke('java:compileRun', {
          filePath,
          className: mainClass,
          cwd: currentProject
        }).then(r => {
          if (r.stdout) log(r.stdout.trimEnd());
          if (r.stderr) log(r.stderr.trimEnd());
          if (r.code !== 0) {
            const phase = r.phase === 'compile'
              ? (typeof t === 'function' ? t('javaCompilePhase') : 'Compile')
              : (r.phase === 'run'
                ? (typeof t === 'function' ? t('javaRunPhase') : 'Run')
                : 'Java');
            log(typeof t === 'function'
              ? t('javaExitCodeMessage', null, { phase, code: r.code })
              : (phase + ' phase exited with code ' + r.code));
          } else if (!r.stdout && !r.stderr) {
            log(typeof t === 'function' ? t('javaDone') : 'Done.');
          }
        }).catch(e => log(String(e)));
      });
    }

    // Java 文件树当前浏览的目录（默认为工程根）
    let currentTreeDir = null;

    function refreshFileList() {
      if (!fileListEl) return;
      if (!currentProject) {
        fileListEl.innerHTML = '<div style="color:var(--text-dim);">' + (typeof t === 'function' ? t('javaNoFiles') : 'No files') + '</div>';
        return;
      }

      const dir = currentTreeDir || currentProject;
      electron.ipcRenderer.invoke('os:readdir', dir).then(list => {
        if (!Array.isArray(list)) {
          fileListEl.innerHTML = '<div style="color:var(--text-dim);">' + (typeof t === 'function' ? t('javaCannotReadProjectDir') : 'Cannot read the project directory.') + '</div>';
          return;
        }

        const entries = list.slice().sort((a, b) => {
          if (a.isDir && !b.isDir) return -1;
          if (!a.isDir && b.isDir) return 1;
          return (a.name || '').localeCompare(b.name || '');
        });

        const parts = [];
        // 上级目录入口
        if (dir !== currentProject) {
          const parent = path.dirname(dir);
          parts.push(`
            <div class="java-ide-file-item"
                 data-path="${escapeHtml(parent)}"
                 data-is-dir="1"
                 data-up="1"
                 style="padding:3px 4px;cursor:pointer;border-radius:4px;">
              📁 .. （${escapeHtml(typeof t === 'function' ? t('javaParentDirectoryLabel') : 'Parent folder')}）
            </div>
          `);
        }

        entries.forEach(e => {
          const name = e.name || '';
          const full = path.join(dir, name);
          if (!e.isDir && !/\.java$/i.test(name)) return;
          const icon = e.isDir ? '📁 ' : '';
          parts.push(`
            <div class="java-ide-file-item"
                 data-path="${escapeHtml(full)}"
                 data-is-dir="${e.isDir ? '1' : '0'}"
                 style="padding:3px 4px;cursor:pointer;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${icon}${escapeHtml(name)}
            </div>
          `);
        });

        if (!parts.length) {
          fileListEl.innerHTML = '<div style="color:var(--text-dim);">' + (typeof t === 'function' ? t('javaNoJavaEntries') : 'There are no Java files or subfolders in this directory.') + '</div>';
          return;
        }

        fileListEl.innerHTML = parts.join('');

        const rows = Array.from(fileListEl.querySelectorAll('.java-ide-file-item'));
        rows.forEach(item => {
          const isDir = item.getAttribute('data-is-dir') === '1';
          const isUp = item.getAttribute('data-up') === '1';
          const fullPath = item.getAttribute('data-path');

          if (isDir) {
            // 目录：进入该目录
            item.addEventListener('click', () => {
              if (!fullPath) return;
              currentTreeDir = fullPath;
              refreshFileList();
            });
          } else {
            // Java 文件：打开到编辑器
            item.addEventListener('click', () => {
              if (!fullPath) return;
              electron.ipcRenderer.invoke('os:readFile', fullPath).then(content => {
                if (editor) editor.setValue(typeof content === 'string' ? content : (content && content.error ? content.error : ''));
                if (filenameInput) {
                  const base = path.basename(fullPath);
                  filenameInput.value = base;
                  try { localStorage.setItem(STORAGE_FILENAME, base); } catch (_) {}
                }
                rows.forEach(i => { i.style.background = 'transparent'; });
                item.style.background = 'rgba(148,163,184,0.25)';
              });
            });
          }
        });
      });
    }

    if (btnNew) btnNew.addEventListener('click', () => {
      createProject(editor ? editor.getValue() : '').catch(err => {
        if (err && err.code === 'STAR_DIALOG_CANCEL') return;
        log(typeof t === 'function'
          ? t('javaCreateError', null, { message: err && err.message ? err.message : String(err) })
          : ('Error creating project: ' + (err && err.message ? err.message : String(err))));
      });
    });
    if (btnOpen) btnOpen.addEventListener('click', openProject);
    if (btnSave) btnSave.addEventListener('click', doSave);
    if (btnRun) btnRun.addEventListener('click', doRun);
    if (tplSelect) tplSelect.addEventListener('change', () => loadTemplateIntoEditor(tplSelect.value));
    if (fontSizeSelect) {
      fontSizeSelect.addEventListener('change', () => {
        if (!editor) return;
        const size = fontSizeSelect.value || '13';
        editor.getWrapperElement().style.fontSize = size + 'px';
        editor.refresh();
        try { localStorage.setItem(STORAGE_FONT, size); } catch (_) {}
      });
    }

    // 启动时自动恢复上次工程和主类文件
    (function restoreLastProject() {
      try {
        const lastProj = localStorage.getItem(STORAGE_PROJECT);
        if (!lastProj) return;
        electron.ipcRenderer.invoke('os:stat', lastProj).then(stat => {
          if (!stat || !stat.isDir) return;
          setProject(lastProj);
          clearConsole();
          log('已恢复上次工程：' + lastProj);
          refreshFileList();
          const lastFile = (function () {
            try { return localStorage.getItem(STORAGE_FILENAME); } catch (_) { return null; }
          })() || (filenameInput ? filenameInput.value.trim() || 'Main.java' : 'Main.java');
          const filePath = path.join(lastProj, lastFile);
          electron.ipcRenderer.invoke('os:readFile', filePath).then(content => {
            if (typeof content === 'string') {
              if (editor) editor.setValue(content);
              if (filenameInput) filenameInput.value = lastFile;
            }
          }).catch(() => {});
        });
      } catch (_) {}
    })();
  },

  'task-manager'(container) {
    if (!container) return;
    const os = require('os');
    const processListEl = container.querySelector('#tm-process-list');
    const refreshBtn = container.querySelector('#tm-refresh');
    const tabProcesses = container.querySelector('#tm-tab-processes');
    const tabPerformance = container.querySelector('#tm-tab-performance');
    const panelProcesses = container.querySelector('#tm-panel-processes');
    const panelPerformance = container.querySelector('#tm-panel-performance');
    const summaryCpuEl = container.querySelector('#tm-summary-cpu');
    const summaryMemoryEl = container.querySelector('#tm-summary-memory');
    const summaryDiskEl = container.querySelector('#tm-summary-disk');
    const summaryNetworkEl = container.querySelector('#tm-summary-network');
    const headNameEl = container.querySelector('#tm-head-name');
    const headPidEl = container.querySelector('#tm-head-pid');
    const headCpuEl = container.querySelector('#tm-head-cpu');
    const headMemoryEl = container.querySelector('#tm-head-memory');
    const headDiskEl = container.querySelector('#tm-head-disk');
    const headNetworkEl = container.querySelector('#tm-head-network');
    const headCloseEl = container.querySelector('#tm-head-close');
    const processFootnoteEl = container.querySelector('#tm-process-footnote');
    const memoryEl = container.querySelector('#tm-memory');
    const deviceEl = container.querySelector('#tm-device');
    const perfCpuValueEl = container.querySelector('#tm-perf-cpu-value');
    const perfCpuLabelEl = container.querySelector('#tm-perf-cpu-label');
    const perfCpuSubEl = container.querySelector('#tm-perf-cpu-sub');
    const perfMemoryValueEl = container.querySelector('#tm-perf-memory-value');
    const perfMemoryLabelEl = container.querySelector('#tm-perf-memory-label');
    const perfMemorySubEl = container.querySelector('#tm-perf-memory-sub');
    const perfDiskValueEl = container.querySelector('#tm-perf-disk-value');
    const perfDiskLabelEl = container.querySelector('#tm-perf-disk-label');
    const perfDiskSubEl = container.querySelector('#tm-perf-disk-sub');
    const perfNetworkValueEl = container.querySelector('#tm-perf-network-value');
    const perfNetworkLabelEl = container.querySelector('#tm-perf-network-label');
    const perfNetworkSubEl = container.querySelector('#tm-perf-network-sub');
    const perfRefreshBtn = container.querySelector('#tm-perf-refresh');
    const lastUpdatedEl = container.querySelector('#tm-last-updated');
    const memoryTitleEl = container.querySelector('#tm-memory-title');
    const deviceTitleEl = container.querySelector('#tm-device-title');
    const resourceState = new Map();
    const cpuSampler = { previous: null, value: 0 };
    let activePanel = 'processes';
    let refreshTimer = null;
    let cleanupObserver = null;
    let updating = false;
    let lastSnapshot = null;
    let selectedProcessId = null;

    function tr(key, fallback, params) {
      try {
        const value = typeof t === 'function' ? t(key, fallback, params) : (fallback || key);
        return value == null ? (fallback || key) : value;
      } catch (_) {
        return fallback || key;
      }
    }
    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, Number(value) || 0));
    }
    function formatPercent(value, digits) {
      const precision = Number.isFinite(digits) ? digits : 0;
      return clamp(value, 0, 999).toFixed(precision) + '%';
    }
    function formatBytes(value) {
      try {
        if (window.StarMemory && typeof window.StarMemory.formatBytes === 'function') {
          return window.StarMemory.formatBytes(value);
        }
      } catch (_) {}
      const bytes = Math.max(0, Number(value) || 0);
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    function formatThroughput(value, unit) {
      const numeric = Math.max(0, Number(value) || 0);
      if (numeric <= 0.04) return '0 ' + unit;
      if (numeric >= 10) return numeric.toFixed(0) + ' ' + unit;
      return numeric.toFixed(1) + ' ' + unit;
    }
    function formatUpdatedTime(date) {
      try {
        return date.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      } catch (_) {
        return date.toLocaleTimeString();
      }
    }
    function computeStablePid(id, fallbackIndex) {
      const text = String(id || '');
      let hash = 0;
      for (let i = 0; i < text.length; i += 1) hash = ((hash * 33) + text.charCodeAt(i)) >>> 0;
      return 2000 + ((hash + (fallbackIndex || 0) * 97) % 50000);
    }
    function getAppProfile(appId) {
      const id = String(appId || '').toLowerCase();
      const gameIds = new Set([
        'tetris', 'snake', 'link', 'platformer', 'landlord', 'runner', 'tank', 'plane',
        'gomoku', 'minesweeper', '2048', 'othello', 'sokoban', 'sudoku', 'solitaire',
        'carrot-defense'
      ]);
      if (gameIds.has(id)) return { cpu: 2.4, memory: 180, disk: 0.18, network: 0.03 };
      if (id === 'browser') return { cpu: 2.2, memory: 260, disk: 0.46, network: 0.90 };
      if (id === 'video-player') return { cpu: 2.0, memory: 230, disk: 0.38, network: 0.22 };
      if (id === 'music-player') return { cpu: 1.2, memory: 128, disk: 0.08, network: 0.04 };
      if (id === 'file-manager') return { cpu: 1.1, memory: 140, disk: 0.22, network: 0.05 };
      if (id === 'wps-editor' || id === 'java-ide') return { cpu: 1.7, memory: 250, disk: 0.24, network: 0.05 };
      if (id === 'image-viewer') return { cpu: 1.0, memory: 118, disk: 0.08, network: 0.02 };
      if (id === 'terminal' || id === 'redis-cli' || id === 'linux-shell' || id === 'docker-shell') return { cpu: 1.0, memory: 100, disk: 0.05, network: 0.03 };
      if (id === 'task-manager') return { cpu: 0.95, memory: 96, disk: 0.03, network: 0.01 };
      if (id === 'settings' || id === 'clock' || id === 'calculator' || id === 'sticky-notes') return { cpu: 0.65, memory: 78, disk: 0.02, network: 0.01 };
      return { cpu: 1.05, memory: 120, disk: 0.05, network: 0.02 };
    }
    function getWindowState(win, index) {
      let state = resourceState.get(win.id);
      if (!state) {
        state = {
          pid: computeStablePid(win.id, index),
          phase: (index + 1) * 1.173 + Math.random() * Math.PI
        };
        resourceState.set(win.id, state);
      }
      return state;
    }
    function cleanupWindowStates(wins) {
      const keepIds = new Set((wins || []).map(win => win.id));
      resourceState.forEach((_value, key) => {
        if (!keepIds.has(key)) resourceState.delete(key);
      });
    }
    function readCpuTimes() {
      const cpus = os.cpus() || [];
      let idle = 0;
      let total = 0;
      cpus.forEach(cpu => {
        const times = (cpu && cpu.times) || {};
        idle += Number(times.idle) || 0;
        total += (Number(times.user) || 0)
          + (Number(times.nice) || 0)
          + (Number(times.sys) || 0)
          + (Number(times.irq) || 0)
          + (Number(times.idle) || 0);
      });
      return { idle, total };
    }
    function sampleSystemCpuPercent() {
      const next = readCpuTimes();
      const previous = cpuSampler.previous;
      cpuSampler.previous = next;
      if (!previous) return cpuSampler.value || 0;
      const idleDelta = next.idle - previous.idle;
      const totalDelta = next.total - previous.total;
      if (totalDelta <= 0) return cpuSampler.value || 0;
      cpuSampler.value = clamp(Math.round((1 - idleDelta / totalDelta) * 100), 0, 100);
      return cpuSampler.value;
    }
    function summarizeEngineMetrics(metrics) {
      return (Array.isArray(metrics) ? metrics : []).reduce((acc, item) => {
        const memory = Math.max(0, Number(item && item.memory) || 0);
        const cpu = Math.max(0, Number(item && item.cpu) || 0);
        acc.cpu += cpu;
        acc.memory += memory;
        acc.count += 1;
        return acc;
      }, { cpu: 0, memory: 0, count: 0 });
    }
    function buildRowModels(wins, engineMetrics, systemCpuPercent, memoryInfo) {
      const activeId = window.StarWindowManager ? StarWindowManager.activeId : null;
      const now = Date.now();
      cleanupWindowStates(wins);
      const rows = wins.map((win, index) => {
        const state = getWindowState(win, index);
        const profile = getAppProfile(win.appId);
        const minimizedFactor = win.minimized ? 0.28 : 1;
        const focusFactor = win.id === activeId ? 1.42 : 1;
        const maxFactor = win.maximized ? 1.08 : 1;
        const cpuWave = 0.78 + 0.22 * Math.abs(Math.sin(now / 1180 + state.phase));
        const memoryWave = 0.94 + 0.06 * Math.abs(Math.cos(now / 3200 + state.phase * 1.3));
        const diskWave = Math.max(0, Math.sin(now / 1650 + state.phase * 2.1));
        const networkWave = Math.max(0, Math.cos(now / 2100 + state.phase * 1.7));
        const cpuWeight = profile.cpu * minimizedFactor * focusFactor * maxFactor * cpuWave;
        const memoryWeight = profile.memory * Math.max(0.72, minimizedFactor) * memoryWave;
        const diskWeight = profile.disk * minimizedFactor * (0.14 + diskWave * 0.86) * Math.max(0.9, focusFactor * 0.92);
        const networkWeight = profile.network * minimizedFactor * (0.08 + networkWave * 0.92) * Math.max(0.85, focusFactor * 0.90);
        return {
          win,
          pid: state.pid,
          cpuWeight,
          memoryWeight,
          diskWeight,
          networkWeight
        };
      });
      const totalCpuWeight = rows.reduce((sum, row) => sum + row.cpuWeight, 0) || 1;
      const totalMemoryWeight = rows.reduce((sum, row) => sum + row.memoryWeight, 0) || 1;
      const totalDiskWeight = rows.reduce((sum, row) => sum + row.diskWeight, 0) || 1;
      const totalNetworkWeight = rows.reduce((sum, row) => sum + row.networkWeight, 0) || 1;
      const cpuBudget = clamp(engineMetrics.cpu || Math.max(1.2, rows.length * 1.4), 0.8, Math.max(12, systemCpuPercent || 0, engineMetrics.cpu || 0));
      const minimumMemoryBudget = rows.length * 72 * 1024 * 1024;
      const rendererBudget = engineMetrics.memory || minimumMemoryBudget;
      const memoryBudget = Math.max(rendererBudget, minimumMemoryBudget, (memoryInfo && memoryInfo.process && memoryInfo.process.rss) || 0);
      const diskRate = Math.max(0.02, rows.reduce((sum, row) => sum + row.diskWeight, 0) * 0.42);
      const networkRate = Math.max(0.01, rows.reduce((sum, row) => sum + row.networkWeight, 0) * 0.88);
      rows.forEach(row => {
        row.cpu = cpuBudget * row.cpuWeight / totalCpuWeight;
        row.memoryBytes = memoryBudget * row.memoryWeight / totalMemoryWeight;
        row.diskRate = diskRate * row.diskWeight / totalDiskWeight;
        row.networkRate = networkRate * row.networkWeight / totalNetworkWeight;
      });
      rows.sort((a, b) => {
        const focusDelta = (b.win.id === activeId ? 1 : 0) - (a.win.id === activeId ? 1 : 0);
        if (focusDelta) return focusDelta;
        if (b.cpu !== a.cpu) return b.cpu - a.cpu;
        return String(a.win.title || '').localeCompare(String(b.win.title || ''), getLocale(), { sensitivity: 'base' });
      });
      return {
        rows,
        diskRate,
        networkRate,
        diskPercent: clamp(Math.round(Math.min(100, diskRate * 18)), 0, 100),
        networkPercent: clamp(Math.round(Math.min(100, networkRate * 9)), 0, 100)
      };
    }
    function updateStaticLabels() {
      if (tabProcesses) tabProcesses.textContent = tr('processes', 'Processes');
      if (tabPerformance) tabPerformance.textContent = tr('performance', 'Performance');
      if (headNameEl) headNameEl.textContent = tr('name', 'Name');
      if (headPidEl) headPidEl.textContent = tr('pid', 'PID');
      if (headCpuEl) headCpuEl.textContent = tr('cpu', 'CPU');
      if (headMemoryEl) headMemoryEl.textContent = tr('memory', 'Memory');
      if (headDiskEl) headDiskEl.textContent = tr('disk', 'Disk');
      if (headNetworkEl) headNetworkEl.textContent = tr('network', 'Network');
      if (headCloseEl) headCloseEl.textContent = tr('endTask', 'End task');
      if (refreshBtn) refreshBtn.textContent = tr('refresh', 'Refresh');
      if (memoryTitleEl) memoryTitleEl.textContent = tr('memory', 'Memory');
      if (deviceTitleEl) deviceTitleEl.textContent = tr('cpu', 'CPU') + ' / ' + tr('system', 'System');
      if (perfRefreshBtn) perfRefreshBtn.textContent = tr('refresh', 'Refresh');
      if (perfCpuLabelEl) perfCpuLabelEl.textContent = tr('cpu', 'CPU');
      if (perfMemoryLabelEl) perfMemoryLabelEl.textContent = tr('memory', 'Memory');
      if (perfDiskLabelEl) perfDiskLabelEl.textContent = tr('disk', 'Disk');
      if (perfNetworkLabelEl) perfNetworkLabelEl.textContent = tr('network', 'Network');
    }
    function showPanel(panel) {
      activePanel = panel;
      if (panelProcesses) panelProcesses.classList.toggle('hidden', panel !== 'processes');
      if (panelPerformance) panelPerformance.classList.toggle('hidden', panel !== 'performance');
      if (tabProcesses) tabProcesses.classList.toggle('active', panel === 'processes');
      if (tabPerformance) tabPerformance.classList.toggle('active', panel === 'performance');
    }
    if (tabProcesses) tabProcesses.addEventListener('click', () => showPanel('processes'));
    if (tabPerformance) tabPerformance.addEventListener('click', () => showPanel('performance'));

    function resolveSelectedProcessId(rows) {
      const availableRows = Array.isArray(rows) ? rows : [];
      const activeId = window.StarWindowManager ? StarWindowManager.activeId : null;
      if (selectedProcessId && availableRows.some(row => row && row.win && row.win.id === selectedProcessId)) {
        return selectedProcessId;
      }
      if (activeId && availableRows.some(row => row && row.win && row.win.id === activeId)) {
        selectedProcessId = activeId;
        return selectedProcessId;
      }
      selectedProcessId = availableRows[0] && availableRows[0].win ? availableRows[0].win.id : null;
      return selectedProcessId;
    }

    function updateProcessSelectionUi() {
      if (!processListEl) return;
      const activeId = window.StarWindowManager ? StarWindowManager.activeId : null;
      processListEl.querySelectorAll('.tm-row').forEach(rowEl => {
        const id = rowEl.getAttribute('data-wid');
        const selected = !!id && id === selectedProcessId;
        const focused = !!id && id === activeId;
        rowEl.classList.toggle('selected', selected);
        rowEl.classList.toggle('focused', focused);
        rowEl.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
    }

    function renderProcessRows(snapshot) {
      if (!processListEl) return;
      const rows = (snapshot && snapshot.rows) || [];
      if (!rows.length) {
        selectedProcessId = null;
        processListEl.innerHTML = '<div class="tm-footnote" style="padding:18px 8px;">' + escapeHtml(tr('taskManagerNoProcesses', 'No app windows are currently open.')) + '</div>';
        return;
      }
      const activeId = window.StarWindowManager ? StarWindowManager.activeId : null;
      const resolvedSelectedId = resolveSelectedProcessId(rows);
      processListEl.innerHTML = rows.map(row =>         '<div class="tm-row ' + (row.win.id === activeId ? 'focused ' : '') + (row.win.id === resolvedSelectedId ? 'selected' : '') + '" data-wid="' + escapeHtml(row.win.id) + '" tabindex="0" aria-selected="' + (row.win.id === resolvedSelectedId ? 'true' : 'false') + '">' +
          '<div class="tm-name-cell">' +
            '<span class="tm-app-badge"></span>' +
            '<span class="tm-app-title" title="' + escapeHtml(row.win.title || '') + '">' + escapeHtml(row.win.title || '') + '</span>' +
          '</div>' +
          '<div class="tm-value">' + row.pid + '</div>' +
          '<div class="tm-value">' + formatPercent(row.cpu, row.cpu >= 10 ? 0 : 1) + '</div>' +
          '<div class="tm-value">' + formatBytes(row.memoryBytes) + '</div>' +
          '<div class="tm-value">' + formatThroughput(row.diskRate, 'MB/s') + '</div>' +
          '<div class="tm-value">' + formatThroughput(row.networkRate, 'Mbps') + '</div>' +
          '<div><button class="start-footer-btn tm-end-btn" data-wid="' + escapeHtml(row.win.id) + '">' + escapeHtml(tr('endTask', 'End task')) + '</button></div>' +
        '</div>'
      ).join('');
      processListEl.querySelectorAll('.tm-end-btn').forEach(btn => {
        btn.addEventListener('click', (event) => {
          event.stopPropagation();
          selectedProcessId = btn.getAttribute('data-wid');
          StarWindowManager.close(btn.getAttribute('data-wid'));
          tick(true);
        });
      });
      processListEl.querySelectorAll('.tm-row').forEach(rowEl => {
        rowEl.addEventListener('click', () => {
          selectedProcessId = rowEl.getAttribute('data-wid');
          if (typeof rowEl.focus === 'function') rowEl.focus();
          updateProcessSelectionUi();
        });
        rowEl.addEventListener('dblclick', () => {
          const id = rowEl.getAttribute('data-wid');
          selectedProcessId = id;
          if (typeof rowEl.focus === 'function') rowEl.focus();
          StarWindowManager.restore(id);
          StarWindowManager.focus(id);
          tick(true);
        });
        rowEl.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectedProcessId = rowEl.getAttribute('data-wid');
            if (typeof rowEl.focus === 'function') rowEl.focus();
            updateProcessSelectionUi();
          }
        });
      });
    }
    function renderSnapshot(snapshot) {
      if (!snapshot) return;
      if (summaryCpuEl) summaryCpuEl.textContent = formatPercent(snapshot.summary.cpu, 0);
      if (summaryMemoryEl) summaryMemoryEl.textContent = formatPercent(snapshot.summary.memory, 0);
      if (summaryDiskEl) summaryDiskEl.textContent = formatPercent(snapshot.summary.disk, 0);
      if (summaryNetworkEl) summaryNetworkEl.textContent = formatPercent(snapshot.summary.network, 0);
      renderProcessRows(snapshot);
      if (processFootnoteEl) {
        processFootnoteEl.textContent = tr('taskManagerMonitoring', 'Monitoring {count} app windows in real time.', { count: snapshot.rows.length });
      }
      if (perfCpuValueEl) perfCpuValueEl.textContent = formatPercent(snapshot.summary.cpu, 0);
      if (perfMemoryValueEl) perfMemoryValueEl.textContent = formatPercent(snapshot.summary.memory, 0);
      if (perfDiskValueEl) perfDiskValueEl.textContent = formatPercent(snapshot.summary.disk, 0);
      if (perfNetworkValueEl) perfNetworkValueEl.textContent = formatPercent(snapshot.summary.network, 0);
      if (perfCpuSubEl) {
        perfCpuSubEl.textContent = [
          snapshot.deviceInfo.cpuModel || tr('taskManagerNoData', 'No data'),
          (snapshot.deviceInfo.cpuCount || 0) + ' ' + tr('cores', 'cores')
        ].filter(Boolean).join('\n');
      }
      if (perfMemorySubEl) {
        perfMemorySubEl.textContent = [
          formatBytes(snapshot.memoryInfo.system.used || 0) + ' / ' + formatBytes(snapshot.memoryInfo.system.total || 0),
          tr('taskManagerStarProcesses', 'Star OS related processes: {count}', { count: snapshot.engine.count || 0 })
        ].join('\n');
      }
      if (perfDiskSubEl) {
        perfDiskSubEl.textContent = tr('taskManagerDiskActivity', 'Estimated activity: {value}', {
          value: formatThroughput(snapshot.diskRate, 'MB/s')
        });
      }
      if (perfNetworkSubEl) {
        perfNetworkSubEl.textContent = tr('taskManagerNetworkActivity', 'Estimated traffic: {value}', {
          value: formatThroughput(snapshot.networkRate, 'Mbps')
        });
      }
      if (memoryEl) {
        memoryEl.textContent = [
          tr('taskManagerSystemMemory', 'System memory: {used} / {total} ({pct}%)', {
            used: formatBytes(snapshot.memoryInfo.system.used || 0),
            total: formatBytes(snapshot.memoryInfo.system.total || 0),
            pct: snapshot.summary.memory
          }),
          tr('taskManagerElectronUsage', 'Star OS engine: {memory} / CPU {cpu}', {
            memory: formatBytes(snapshot.engine.memory || 0),
            cpu: formatPercent(snapshot.engine.cpu || 0, snapshot.engine.cpu >= 10 ? 0 : 1)
          }),
          tr('taskManagerStarProcesses', 'Star OS related processes: {count}', { count: snapshot.engine.count || 0 })
        ].join('\n');
      }
      if (deviceEl) {
        const interfaces = Array.isArray(snapshot.deviceInfo.networkInterfaces) ? snapshot.deviceInfo.networkInterfaces : [];
        const interfaceLine = interfaces.length
          ? interfaces.map(item => {
            const first = item && item.addresses && item.addresses[0] ? item.addresses[0].address : '';
            return item.name + (first ? ' ' + first : '');
          }).join(', ')
          : tr('taskManagerNoData', 'No data');
        deviceEl.textContent = [
          tr('cpu', 'CPU') + ': ' + (snapshot.deviceInfo.cpuModel || tr('taskManagerNoData', 'No data')),
          (tr('system', 'System') + ': ' + ((snapshot.deviceInfo.platform || '--') + ' ' + (snapshot.deviceInfo.release || '')).trim()),
          tr('hostLabel', 'Host') + ': ' + (snapshot.deviceInfo.hostname || '--'),
          tr('archLabel', 'Arch') + ': ' + (snapshot.deviceInfo.arch || '--'),
          tr('network', 'Network') + ': ' + interfaceLine
        ].join('\n');
      }
      if (lastUpdatedEl) {
        lastUpdatedEl.textContent = tr('taskManagerLastUpdated', 'Last updated: {time}', {
          time: formatUpdatedTime(snapshot.updatedAt)
        });
      }
    }
    async function collectSnapshot() {
      const wins = (window.StarWindowManager && Array.isArray(StarWindowManager.windows)) ? StarWindowManager.windows.slice() : [];
      const [memoryInfo, deviceInfo, processMetrics] = await Promise.all([
        window.StarMemory && typeof window.StarMemory.getInfo === 'function'
          ? window.StarMemory.getInfo()
          : Promise.resolve({ process: {}, system: {} }),
        window.StarDevice && typeof window.StarDevice.getInfo === 'function'
          ? window.StarDevice.getInfo()
          : Promise.resolve({}),
        window.StarProcess && typeof window.StarProcess.getSystemProcesses === 'function'
          ? window.StarProcess.getSystemProcesses()
          : Promise.resolve([])
      ]);
      const engine = summarizeEngineMetrics(processMetrics);
      let cpuPercent = sampleSystemCpuPercent();
      if (!cpuPercent && engine.cpu) cpuPercent = clamp(Math.round(engine.cpu), 0, 100);
      const sys = (memoryInfo && memoryInfo.system) || {};
      const memoryPercent = sys.total ? clamp(Math.round(((sys.used || 0) / sys.total) * 100), 0, 100) : 0;
      const modeled = buildRowModels(wins, engine, cpuPercent, memoryInfo);
      return {
        rows: modeled.rows,
        diskRate: modeled.diskRate,
        networkRate: modeled.networkRate,
        summary: {
          cpu: cpuPercent,
          memory: memoryPercent,
          disk: modeled.diskPercent,
          network: modeled.networkPercent
        },
        memoryInfo: memoryInfo || { process: {}, system: {} },
        deviceInfo: deviceInfo || {},
        engine,
        updatedAt: new Date()
      };
    }
    async function tick(force) {
      if (updating && !force) return;
      updating = true;
      try {
        lastSnapshot = await collectSnapshot();
        renderSnapshot(lastSnapshot);
      } finally {
        updating = false;
      }
    }
    function cleanup() {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      try {
        if (cleanupObserver) cleanupObserver.disconnect();
      } catch (_) {}
      cleanupObserver = null;
    }

    if (refreshBtn) refreshBtn.addEventListener('click', () => tick(true));
    if (perfRefreshBtn) perfRefreshBtn.addEventListener('click', () => tick(true));
    setWindowLocaleRefresh(container, () => {
      updateStaticLabels();
      renderSnapshot(lastSnapshot);
    });
    updateStaticLabels();
    showPanel(activePanel);
    sampleSystemCpuPercent();
    tick(true);
    refreshTimer = setInterval(() => {
      if (!container.isConnected) {
        cleanup();
        return;
      }
      tick(false);
    }, 1200);
    try {
      if (typeof MutationObserver === 'function' && document && document.body) {
        cleanupObserver = new MutationObserver(() => {
          if (!container.isConnected) cleanup();
        });
        cleanupObserver.observe(document.body, { childList: true, subtree: true });
      }
    } catch (_) {}
  },

  screenshot(container) {
    if (!container) return;
    const captureBtn = container.querySelector('#ss-capture');
    const saveBtn = container.querySelector('#ss-save');
    const copyBtn = container.querySelector('#ss-copy');
    const img = container.querySelector('#ss-image');
    const placeholder = container.querySelector('#ss-placeholder');
    let lastDataUrl = null;
    captureBtn.addEventListener('click', () => {
      require('electron').ipcRenderer.invoke('os:captureScreen').then(dataUrl => {
        if (!dataUrl || !img || !placeholder) return;
        lastDataUrl = dataUrl;
        img.src = dataUrl;
        img.style.display = 'block';
        placeholder.style.display = 'none';
        if (saveBtn) saveBtn.disabled = false;
        if (copyBtn) copyBtn.disabled = false;
      });
    });
    saveBtn.addEventListener('click', () => {
      if (!lastDataUrl) return;
      window.showInternalSaveDialog({ defaultPath: 'screenshot.png' }).then(r => {
        if (r.canceled || !r.filePath) return;
        const fs = require('fs');
        const base64 = lastDataUrl.replace(/^data:image\/\w+;base64,/, '');
        try { fs.writeFileSync(r.filePath, Buffer.from(base64, 'base64')); } catch (e) { alert(e.message); }
      });
    });
    copyBtn.addEventListener('click', () => {
      if (!lastDataUrl) return;
      fetch(lastDataUrl).then(res => res.blob()).then(blob => {
        const clipboard = require('electron').clipboard;
        if (clipboard && clipboard.writeImage) {
          const nativeImg = require('electron').nativeImage.createFromDataURL(lastDataUrl);
          if (nativeImg && !nativeImg.isEmpty()) clipboard.writeImage(nativeImg);
        }
      }).catch(() => {});
    });
  },

  'sticky-notes'(container) {
    if (!container) return;
    const textarea = container.querySelector('#sticky-text');
    const key = 'star-sticky-note';
    if (!textarea) return;
    textarea.addEventListener('input', () => {
      try { localStorage.setItem(key, textarea.value); } catch (_) {}
    });
  },

  'character-map'(container) {
    if (!container) return;
    const writeCharToClipboard = async (text) => {
      const value = String(text || '');
      if (!value) return;
      try {
        const electron = require('electron');
        if (electron && electron.clipboard && typeof electron.clipboard.writeText === 'function') {
          electron.clipboard.writeText(value);
          return;
        }
      } catch (_) {}
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(value);
          return;
        }
      } catch (_) {}
      try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', 'readonly');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        ta.style.pointerEvents = 'none';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (_) {}
    };
    container.querySelectorAll('.charmap-char').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = parseInt(btn.getAttribute('data-code'), 10);
        const ch = String.fromCodePoint(code);
        writeCharToClipboard(ch);
      });
    });
  },

  'on-screen-keyboard'(container) {
    if (!container) return;
    const input = container.querySelector('#osk-input');
    container.querySelectorAll('.osk-key').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = btn.getAttribute('data-key');
        if (!input) return;
        if (k === 'Backspace') input.value = input.value.slice(0, -1);
        else if (k === 'Enter') input.value += '\n';
        else if (k === 'Space') input.value += ' ';
        else if (k !== 'Shift') input.value += k;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(input.value).catch(() => {});
        }
      });
    });
  },

  about(container) {
    if (!container) return;
    bindExternalLinks(container);
    const openBtn = container.querySelector('#about-open-settings');
    if (openBtn) openBtn.addEventListener('click', () => {
      // 打开设置窗口
      try {
        if (typeof StarAppsRegistry !== 'undefined' && typeof StarAppsRegistry.open === 'function') {
          StarAppsRegistry.open('settings');
        }
      } catch (_) {}

      // 关闭当前“关于”窗口，避免挡住设置窗口
      try {
        const hostWin = container.closest('.star-window');
        if (hostWin && typeof StarWindowManager !== 'undefined') {
          const id = hostWin.id;
          if (id) StarWindowManager.close(id);
        }
      } catch (_) {}
    });
  },
};

// 主进程要求在内置浏览器里用“新标签页”打开某个 URL
try {
  const { ipcRenderer } = require('electron');
  ipcRenderer.on('browser:new-tab', (_event, url) => {
    const nextUrl = String(url || '').trim();
    if (!nextUrl) return;
    openUrlInInternalBrowser(nextUrl);
  });
} catch (_) {}