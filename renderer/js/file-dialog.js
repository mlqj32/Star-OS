
(function initStarInternalFileDialog() {
  if (typeof window === 'undefined' || window.StarFileDialog) return;
  const electron = require('electron');
  const ipc = electron.ipcRenderer;
  const path = require('path');
  const ROOT = '__star_drives__';
  const STORAGE_LAST_DIR = 'star-file-dialog-last-dir';
  const STORAGE_SHOW_HIDDEN = 'star-file-manager-show-hidden';
  const PROTECTED_SYSTEM_DIR_NAMES = new Set(['system volume information', '$recycle.bin']);

  let styleEl = null;
  let host = null;
  let active = null;
  const queue = [];

  function readShowHiddenSetting() {
    try {
      return localStorage.getItem(STORAGE_SHOW_HIDDEN) === '1';
    } catch (_) {
      return false;
    }
  }

  function isProtectedSystemDirName(name) {
    return PROTECTED_SYSTEM_DIR_NAMES.has(String(name || '').trim().toLowerCase());
  }

  function esc(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function trf(key, fallback, params) {
    try {
      if (typeof t === 'function') return t(key, fallback, params);
    } catch (_) {}
    let text = String(fallback == null ? '' : fallback);
    Object.keys(params || {}).forEach((paramKey) => {
      const token = '{' + paramKey + '}';
      text = text.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), params[paramKey]);
    });
    return text;
  }

  function getLocaleName() {
    try {
      if (typeof getLocale === 'function') return getLocale();
    } catch (_) {}
    return undefined;
  }

  function ensureUi() {
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'star-file-dialog-style';
      styleEl.textContent = `
        .star-file-dialog-host {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 31000;
        }
        .star-file-dialog-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(8, 12, 18, 0.58);
          pointer-events: auto;
        }
        .star-file-dialog {
          width: min(1040px, calc(100vw - 36px));
          height: min(720px, calc(100vh - 44px));
          border: 1px solid var(--border);
          border-radius: 22px;
          background: var(--window-bg);
          box-shadow: var(--shadow-lg), 0 0 0 1px color-mix(in srgb, var(--border) 92%, transparent);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          color: var(--text);
        }
        .star-file-dialog__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 18px 14px;
          border-bottom: 1px solid var(--border);
          background: var(--window-titlebar);
        }
        .star-file-dialog__title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: .01em;
        }
        .star-file-dialog__chrome {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .star-file-dialog__toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: color-mix(in srgb, var(--window-titlebar) 88%, var(--window-bg));
          flex-wrap: wrap;
        }
        .star-file-dialog__nav {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .star-file-dialog__path {
          flex: 1 1 320px;
          min-width: 180px;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--window-titlebar);
          color: var(--text);
          outline: none;
        }
        .star-file-dialog__path:focus,
        .star-file-dialog__name:focus,
        .star-file-dialog__type:focus {
          border-color: var(--border-focus);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }
        .star-file-dialog__body {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          padding: 0 16px 14px;
          gap: 12px;
        }
        .star-file-dialog__table-wrap {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--window-bg);
        }
        .star-file-dialog__table-head {
          display: grid;
          grid-template-columns: 56% 16% 28%;
          align-items: center;
          gap: 0;
          padding-right: 14px;
          flex-shrink: 0;
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--window-titlebar) 98%, var(--window-bg)),
            color-mix(in srgb, var(--window-titlebar) 94%, var(--window-bg))
          );
          box-shadow: inset 0 -1px 0 var(--border);
        }
        .star-file-dialog__table-head-cell {
          min-width: 0;
          text-align: left;
          padding: 14px 16px;
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: .01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .star-file-dialog__table-head-cell.is-size {
          text-align: right;
        }
        .star-file-dialog__table-body {
          flex: 1;
          min-height: 0;
          overflow: auto;
          overflow-x: hidden;
        }
        .star-file-dialog__table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .star-file-dialog__table tbody tr {
          cursor: default;
          transition: background .16s ease, box-shadow .16s ease;
        }
        .star-file-dialog__table tbody tr:hover {
          background: color-mix(in srgb, var(--accent) 10%, var(--window-titlebar));
        }
        .star-file-dialog__table tbody tr.is-selected {
          background: color-mix(in srgb, var(--accent) 16%, var(--window-titlebar));
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 60%, var(--border));
        }
        .star-file-dialog__table tbody td {
          padding: 10px 12px;
          border-bottom: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
          vertical-align: middle;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .star-file-dialog__table tbody td.is-size {
          text-align: right;
          color: var(--text-dim);
        }
        .star-file-dialog__table tbody td.is-date {
          color: var(--text-dim);
        }
        .star-file-dialog__name-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .star-file-dialog__checkbox {
          width: 15px;
          height: 15px;
          margin: 0;
          accent-color: var(--accent);
          flex: 0 0 auto;
        }
        .star-file-dialog__icon {
          width: 18px;
          height: 18px;
          color: color-mix(in srgb, var(--accent) 60%, var(--text) 40%);
          flex: 0 0 auto;
        }
        .star-file-dialog__visual {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          overflow: hidden;
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--window-titlebar) 84%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 84%, transparent);
        }
        .star-file-dialog__visual.is-fallback {
          background: color-mix(in srgb, var(--window-titlebar) 84%, transparent);
        }
        .star-file-dialog__visual.is-fallback .star-file-dialog__thumb-image,
        .star-file-dialog__visual.is-fallback .star-file-dialog__thumb-video,
        .star-file-dialog__visual.is-fallback .star-file-dialog__thumb-play {
          display: none;
        }
        .star-file-dialog__visual.is-fallback .star-file-dialog__icon {
          display: inline-flex;
        }
        .star-file-dialog__thumb-image,
        .star-file-dialog__thumb-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          background: color-mix(in srgb, var(--window-titlebar) 92%, var(--window-bg));
        }
        .star-file-dialog__thumb-image--shell {
          object-fit: contain;
          padding: 3px;
          background: transparent;
        }
        .star-file-dialog__thumb-video {
          pointer-events: none;
        }
        .star-file-dialog__thumb-play {
          position: absolute;
          width: 16px;
          height: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.52);
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.28);
          pointer-events: none;
        }
        .star-file-dialog__thumb-play svg {
          width: 12px;
          height: 12px;
          display: block;
        }
        .star-file-dialog__visual--video {
          position: relative;
        }
        .star-file-dialog__visual .star-file-dialog__icon {
          display: none;
        }
        .star-file-dialog__icon svg {
          width: 18px;
          height: 18px;
          display: block;
        }
        .star-file-dialog__label {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .star-file-dialog__footer {
          display: grid;
          gap: 10px;
          padding-top: 2px;
        }
        .star-file-dialog__fields {
          display: grid;
          gap: 10px;
          grid-template-columns: minmax(0, 1fr) minmax(170px, 220px);
        }
        .star-file-dialog__field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .star-file-dialog__field.is-hidden {
          display: none;
        }
        .star-file-dialog__field-label {
          font-size: 12px;
          color: var(--text-dim);
        }
        .star-file-dialog__name,
        .star-file-dialog__type {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--window-titlebar);
          color: var(--text);
          outline: none;
        }
        :root[data-theme="light"] .star-file-dialog-overlay {
          background: rgba(226, 232, 240, 0.78);
        }
        :root[data-theme="light"] .star-file-dialog {
          box-shadow: 0 24px 56px rgba(15, 23, 42, 0.18), 0 8px 18px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(148, 163, 184, 0.22);
        }
        :root[data-theme="light"] .star-file-dialog__toolbar {
          background: #eef3ff;
        }
        :root[data-theme="light"] .star-file-dialog__path,
        :root[data-theme="light"] .star-file-dialog__name,
        :root[data-theme="light"] .star-file-dialog__type {
          background: #ffffff;
        }
        :root[data-theme="light"] .star-file-dialog__table-wrap {
          background: #ffffff;
        }
        :root[data-theme="light"] .star-file-dialog__table-head {
          background: linear-gradient(180deg, #f6f8ff, #edf2ff);
          box-shadow: inset 0 -1px 0 rgba(148, 163, 184, 0.28);
        }
        :root[data-theme="light"] .star-file-dialog__table-head-cell {
          color: #1f2937;
        }
        :root[data-theme="light"] .star-file-dialog__table tbody tr:hover {
          background: rgba(59, 130, 246, 0.08);
        }
        :root[data-theme="light"] .star-file-dialog__table tbody tr.is-selected {
          background: rgba(59, 130, 246, 0.14);
          box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.34);
        }
        :root[data-theme="light"] .star-file-dialog__visual {
          background: #f8fbff;
          border-color: rgba(148, 163, 184, 0.28);
        }
        :root[data-theme="light"] .star-file-dialog__table tbody td.is-size,
        :root[data-theme="light"] .star-file-dialog__table tbody td.is-date,
        :root[data-theme="light"] .star-file-dialog__field-label,
        :root[data-theme="light"] .star-file-dialog__status {
          color: #6b7280;
        }
        .star-file-dialog__meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .star-file-dialog__status {
          min-height: 20px;
          font-size: 12px;
          color: var(--text-dim);
        }
        .star-file-dialog__status.is-error {
          color: var(--error, #ff7d7d);
        }
        .star-file-dialog__status.is-success {
          color: #8de6aa;
        }
        .star-file-dialog__actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .star-file-dialog__empty {
          padding: 40px 18px;
          text-align: center;
          color: var(--text-dim);
        }
        .star-file-dialog__error-row {
          padding: 32px 18px;
          text-align: center;
          color: var(--error, #ff7d7d);
        }
        @media (max-width: 860px) {
          .star-file-dialog {
            width: calc(100vw - 18px);
            height: calc(100vh - 18px);
            border-radius: 18px;
          }
          .star-file-dialog__fields {
            grid-template-columns: 1fr;
          }
          .star-file-dialog__table-head-cell.is-size,
          .star-file-dialog__table tbody td.is-size {
            display: none;
          }
          .star-file-dialog__table-head {
            grid-template-columns: 66% 34%;
          }
        }
      `;
      document.head.appendChild(styleEl);
    }
    if (!host) {
      host = document.createElement('div');
      host.className = 'star-file-dialog-host';
      document.body.appendChild(host);
    }
    return host;
  }

  function normalizePathText(value) {
    const text = String(value == null ? '' : value).trim().replace(/^"(.*)"$/, '$1');
    if (!text) return '';
    if (/^[a-zA-Z]:$/.test(text)) return text + '\\';
    return text;
  }

  function formatSize(value) {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes < 0) return '--';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let current = bytes;
    let index = 0;
    while (current >= 1024 && index < units.length - 1) {
      current /= 1024;
      index += 1;
    }
    if (index === 0) return Math.round(current) + ' B';
    const digits = current >= 100 ? 0 : (current >= 10 ? 1 : 2);
    return current.toFixed(digits) + ' ' + units[index];
  }

  function formatDate(value) {
    const date = new Date(Number(value));
    if (!value || Number.isNaN(date.getTime())) return '--';
    const pad = (n) => String(n).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
  }

  function extensionOf(name) {
    return path.extname(String(name || '')).toLowerCase();
  }

  function normalizeFilters(filters) {
    if (!Array.isArray(filters) || !filters.length) {
      return [{ name: trf('fileDialogAllFiles', 'All files'), extensions: ['*'] }];
    }
    return filters.map((filter) => ({
      name: String((filter && filter.name) || trf('fileDialogAllFiles', 'All files')),
      extensions: Array.isArray(filter && filter.extensions) && filter.extensions.length
        ? filter.extensions.map((ext) => String(ext || '').replace(/^\./, '').toLowerCase())
        : ['*']
    }));
  }

  function isAllFilter(filter) {
    return !filter
      || !Array.isArray(filter.extensions)
      || !filter.extensions.length
      || filter.extensions.includes('*')
      || filter.extensions.includes('.*');
  }

  function matchesFilter(name, filter) {
    if (isAllFilter(filter)) return true;
    const ext = extensionOf(name).replace(/^\./, '');
    return !!ext && filter.extensions.includes(ext);
  }

  function filterDescription(filter) {
    if (!filter || isAllFilter(filter)) return trf('fileDialogAllFiles', 'All files');
    return filter.name + ' (' + filter.extensions.map((ext) => '*.' + ext).join(', ') + ')';
  }

  function kindOfEntry(entry) {
    if (!entry) return 'file';
    if (entry.isDrive) return 'drive';
    if (entry.isDir) return 'folder';
    const ext = extensionOf(entry.name);
    if (['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'].includes(ext)) return 'audio';
    if (['.mp4', '.avi', '.wmv', '.mkv', '.mov', '.webm', '.m4v'].includes(ext)) return 'video';
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'].includes(ext)) return 'image';
    if (['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'].includes(ext)) return 'archive';
    if (['.exe', '.msi', '.bat', '.cmd', '.com'].includes(ext)) return 'executable';
    return 'file';
  }

  function iconOfEntry(entry) {
    const kind = kindOfEntry(entry);
    const icons = {
      drive: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.2a3 3 0 0 0-5.6 0H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm2 9a1.2 1.2 0 1 0 0 2.4A1.2 1.2 0 0 0 6 14zm12 0a1.2 1.2 0 1 0 0 2.4A1.2 1.2 0 0 0 18 14z"/></svg>',
      folder: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
      audio: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>',
      video: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h11a2 2 0 0 1 2 2v2.5l4-2.5v10l-4-2.5V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm5 3v8l6-4-6-4z"/></svg>',
      image: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 14H5l3.5-4.5 2.5 3.01L14.5 11l4.5 6zM8.5 9A1.5 1.5 0 1 0 8.5 6a1.5 1.5 0 0 0 0 3z"/></svg>',
      archive: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 5.23 19.15 3.3A2 2 0 0 0 17.53 2H6.47a2 2 0 0 0-1.62 1.3L3.46 5.23A2 2 0 0 0 3 6.46V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.46a2 2 0 0 0-.46-1.23zM12 18l-3-3h2v-3h2v3h2l-3 3zm5-11H7V4h10v3z"/></svg>',
      executable: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h10l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm8 1.5V8h3.5L13 4.5z"/><path d="M8 11h2v2H8zm0 4h2v2H8zm4-4h4v2h-4zm0 4h4v2h-4z"/></svg>',
      file: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 7V3.5L19.5 9H14z"/></svg>'
    };
    return icons[kind] || icons.file;
  }

  function previewUrlOfEntry(entryPath) {
    const raw = String(entryPath || '').trim();
    if (!raw) return 'star-file:///';
    const normalized = raw.replace(/\\/g, '/');
    if (/^\/\/[^/]/.test(normalized)) return 'star-file:' + encodeURI(normalized);
    if (/^[A-Za-z]:\//.test(normalized)) return 'star-file:///' + encodeURI(normalized);
    return 'star-file:///' + encodeURI(normalized.replace(/^\/+/, ''));
  }

  const shellIconThumbCache = window.__starShellIconThumbCache || (window.__starShellIconThumbCache = new Map());
  const shellIconThumbPending = window.__starShellIconThumbPending || (window.__starShellIconThumbPending = new Map());

  function requestShellIconThumb(entryPath, sizeHint) {
    const normalizedPath = String(entryPath || '').trim();
    if (!normalizedPath) return Promise.resolve(null);
    const normalizedSize = String(sizeHint || '').toLowerCase() === 'large' ? 'large' : 'normal';
    const cacheKey = normalizedSize + '::' + normalizedPath;
    if (shellIconThumbCache.has(cacheKey)) {
      return Promise.resolve(shellIconThumbCache.get(cacheKey) || null);
    }
    if (shellIconThumbPending.has(cacheKey)) {
      return shellIconThumbPending.get(cacheKey);
    }
    const pending = ipc.invoke('os:getFileIconDataUrl', normalizedPath, normalizedSize)
      .then((dataUrl) => {
        const resolved = typeof dataUrl === 'string' && dataUrl.trim() ? dataUrl : null;
        shellIconThumbCache.set(cacheKey, resolved);
        shellIconThumbPending.delete(cacheKey);
        return resolved;
      })
      .catch(() => {
        shellIconThumbCache.set(cacheKey, null);
        shellIconThumbPending.delete(cacheKey);
        return null;
      });
    shellIconThumbPending.set(cacheKey, pending);
    return pending;
  }

  function visualOfEntry(entry) {
    const kind = kindOfEntry(entry);
    const fallbackIcon = '<span class="star-file-dialog__icon" aria-hidden="true">' + iconOfEntry(entry) + '</span>';
    if (kind === 'executable' && entry && entry.path) {
      return `
        <span class="star-file-dialog__visual" data-kind="executable" aria-hidden="true">
          <img class="star-file-dialog__thumb-image star-file-dialog__thumb-image--shell" data-shell-icon-path="${esc(entry.path)}" alt="">
          ${fallbackIcon}
        </span>
      `;
    }
    if (kind === 'image' && entry && entry.path) {
      return `
        <span class="star-file-dialog__visual" data-kind="image" aria-hidden="true">
          <img class="star-file-dialog__thumb-image" src="${esc(previewUrlOfEntry(entry.path))}" loading="lazy" decoding="async" alt="">
          ${fallbackIcon}
        </span>
      `;
    }
    if (kind === 'video' && entry && entry.path) {
      return `
        <span class="star-file-dialog__visual star-file-dialog__visual--video" data-kind="video" aria-hidden="true">
          <video class="star-file-dialog__thumb-video" src="${esc(previewUrlOfEntry(entry.path))}" preload="metadata" muted playsinline></video>
          <span class="star-file-dialog__thumb-play">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 6v12l10-6z"/></svg>
          </span>
          ${fallbackIcon}
        </span>
      `;
    }
    return '<span class="star-file-dialog__visual is-fallback" aria-hidden="true">' + fallbackIcon + '</span>';
  }

  function hydrateRowPreviews(rootEl) {
    if (!rootEl) return;
    rootEl.querySelectorAll('.star-file-dialog__thumb-image').forEach((img) => {
      if (img.dataset.bound === 'true') return;
      img.dataset.bound = 'true';
      if (img.dataset.shellIconPath) {
        requestShellIconThumb(img.dataset.shellIconPath, 'large').then((dataUrl) => {
          if (!img.isConnected) return;
          const hostEl = img.closest('.star-file-dialog__visual');
          if (!hostEl) return;
          if (dataUrl) {
            img.src = dataUrl;
            hostEl.classList.remove('is-fallback');
          } else {
            hostEl.classList.add('is-fallback');
          }
        });
      }
      img.addEventListener('error', () => {
        const hostEl = img.closest('.star-file-dialog__visual');
        if (hostEl) hostEl.classList.add('is-fallback');
      });
    });
    rootEl.querySelectorAll('.star-file-dialog__thumb-video').forEach((video) => {
      if (video.dataset.bound === 'true') return;
      video.dataset.bound = 'true';
      video.addEventListener('loadeddata', () => {
        try {
          if (video.readyState >= 2 && Number.isFinite(video.duration) && video.duration > 0.12) {
            video.currentTime = Math.min(0.1, Math.max(0, video.duration / 20));
          }
        } catch (_) {}
      });
      video.addEventListener('error', () => {
        const hostEl = video.closest('.star-file-dialog__visual');
        if (hostEl) hostEl.classList.add('is-fallback');
      });
    });
  }

  function readStoredLastDir() {
    try {
      return normalizePathText(localStorage.getItem(STORAGE_LAST_DIR) || '');
    } catch (_) {
      return '';
    }
  }

  function storeLastDir(nextPath) {
    const dir = normalizePathText(nextPath);
    if (!dir || dir === ROOT) return;
    // Never persist relative paths like "." from accidental defaultPath hints.
    try {
      if (!path.isAbsolute(dir)) return;
    } catch (_) {}
    try {
      localStorage.setItem(STORAGE_LAST_DIR, dir);
    } catch (_) {}
  }

  function defaultDirectory() {
    return normalizePathText(process.env.USERPROFILE || process.env.HOME || (process.platform === 'win32' ? 'C:\\' : '/'));
  }

  async function statPath(targetPath) {
    const normalized = normalizePathText(targetPath);
    if (!normalized || normalized === ROOT) return null;
    try {
      const result = await ipc.invoke('os:stat', normalized);
      if (result && result.error) return { error: result.error };
      return result || null;
    } catch (error) {
      return { error: error && error.message ? error.message : String(error) };
    }
  }

  async function resolveInitialLocation(config) {
    // First open: prefer "This PC" (drive list). Once the user successfully opens/saves,
    // we persist the last directory and will start from it next time.
    let initialDir = readStoredLastDir() || ROOT;
    let fileName = '';
    const hintedPath = normalizePathText(config.defaultPath || '');
    if (hintedPath) {
      if (config.kind === 'save') fileName = path.basename(hintedPath);
      // Relative defaultPath like "archive.zip" should not force us into ".".
      // Keep the initial directory as "This PC" (or the last used absolute directory).
      let hintedLooksAbsolute = false;
      try {
        hintedLooksAbsolute = hintedPath === ROOT || path.isAbsolute(hintedPath);
      } catch (_) {}
      if (!hintedLooksAbsolute) return { currentPath: initialDir || ROOT, fileName };
      const hintedStat = await statPath(hintedPath);
      if (hintedStat && !hintedStat.error) {
        if (hintedStat.isDir) {
          initialDir = hintedPath;
          if (config.kind === 'save') fileName = '';
        } else {
          initialDir = path.dirname(hintedPath);
          if (config.kind !== 'save' && !config.directoryMode) fileName = path.basename(hintedPath);
        }
      } else {
        const parent = hintedPath.endsWith(path.sep) ? hintedPath : path.dirname(hintedPath);
        const parentStat = await statPath(parent);
        if (parentStat && !parentStat.error && parentStat.isDir) initialDir = parent;
      }
    }
    if (!initialDir) initialDir = ROOT;
    return { currentPath: initialDir, fileName };
  }

  function normalizeConfig(kind, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const properties = Array.isArray(opts.properties) ? opts.properties.slice() : [];
    const directoryMode = kind === 'open' && properties.includes('openDirectory') && !properties.includes('openFile');
    const multi = kind === 'open' && properties.includes('multiSelections') && !directoryMode;
    const filters = normalizeFilters(opts.filters);
    const fallbackTitle = kind === 'save'
      ? trf('fileDialogSaveFile', 'Save File')
      : (directoryMode ? trf('fileDialogSelectFolder', 'Select Folder') : trf('fileDialogOpenFile', 'Open File'));
    const fallbackAction = kind === 'save'
      ? trf('save', 'Save')
      : (directoryMode ? trf('choose', 'Choose') : trf('open', 'Open'));
    return {
      kind,
      title: String(opts.title || fallbackTitle),
      actionLabel: String(opts.buttonLabel || fallbackAction),
      directoryMode,
      multi,
      filters,
      defaultPath: opts.defaultPath ? String(opts.defaultPath) : ''
    };
  }

  function cancelResult(kind) {
    return kind === 'save'
      ? { canceled: true, filePath: '' }
      : { canceled: true, filePaths: [] };
  }

  function closeDialog(result) {
    if (!active) return;
    const current = active;
    active = null;
    try { window.removeEventListener('star:locale-change', current.onLocaleChange); } catch (_) {}
    try { window.removeEventListener('star:file-manager-visibility-change', current.onVisibilityChange); } catch (_) {}
    try { if (current.overlay && current.overlay.parentNode) current.overlay.parentNode.removeChild(current.overlay); } catch (_) {}
    current.resolve(result);
    setTimeout(flushQueue, 0);
  }

  async function flushQueue() {
    if (active || !queue.length) return;
    const next = queue.shift();
    const overlay = document.createElement('div');
    overlay.className = 'star-file-dialog-overlay';
    ensureUi().appendChild(overlay);
    active = { overlay, resolve: next.resolve, onLocaleChange: null, onVisibilityChange: null };
    await showDialog(next.kind, next.options || {});
  }

  function enqueue(kind, options) {
    return new Promise((resolve) => {
      queue.push({ kind, options, resolve });
      flushQueue();
    });
  }

  async function showDialog(kind, options) {
    if (!active || !active.overlay) return;
    const config = normalizeConfig(kind, options);
    const initial = await resolveInitialLocation(config);
    const state = {
      config,
      currentPath: initial.currentPath,
      history: [initial.currentPath],
      historyIndex: 0,
      entries: [],
      filteredEntries: [],
      selectedPaths: new Set(),
      selectedDirectory: '',
      saveName: initial.fileName || '',
      filterIndex: 0,
      loading: false,
      statusText: '',
      statusTone: '',
      token: 0
    };

    const overlay = active.overlay;
    overlay.innerHTML = `
      <div class="star-file-dialog" role="dialog" aria-modal="true">
        <div class="star-file-dialog__head">
          <h3 class="star-file-dialog__title" data-role="title"></h3>
          <div class="star-file-dialog__chrome">
            <button type="button" class="start-footer-btn" data-role="close">${esc(trf('close', 'Close'))}</button>
          </div>
        </div>
        <div class="star-file-dialog__toolbar">
          <div class="star-file-dialog__nav">
            <button type="button" class="start-footer-btn" data-role="back"></button>
            <button type="button" class="start-footer-btn" data-role="forward"></button>
            <button type="button" class="start-footer-btn" data-role="up"></button>
            <button type="button" class="start-footer-btn" data-role="refresh"></button>
          </div>
          <input type="text" class="star-file-dialog__path" data-role="path">
          <button type="button" class="start-footer-btn" data-role="go"></button>
        </div>
        <div class="star-file-dialog__body">
          <div class="star-file-dialog__table-wrap">
            <div class="star-file-dialog__table-head" aria-hidden="true">
              <div class="star-file-dialog__table-head-cell" data-role="head-name"></div>
              <div class="star-file-dialog__table-head-cell is-size" data-role="head-size"></div>
              <div class="star-file-dialog__table-head-cell" data-role="head-date"></div>
            </div>
            <div class="star-file-dialog__table-body">
              <table class="star-file-dialog__table">
                <colgroup>
                  <col style="width:56%">
                  <col style="width:16%">
                  <col style="width:28%">
                </colgroup>
                <tbody data-role="tbody"></tbody>
              </table>
            </div>
          </div>
          <div class="star-file-dialog__footer">
            <div class="star-file-dialog__fields">
              <label class="star-file-dialog__field" data-role="name-field">
                <span class="star-file-dialog__field-label" data-role="name-label"></span>
                <input type="text" class="star-file-dialog__name" data-role="name-input">
              </label>
              <label class="star-file-dialog__field" data-role="type-field">
                <span class="star-file-dialog__field-label" data-role="type-label"></span>
                <select class="star-file-dialog__type" data-role="type-select"></select>
              </label>
            </div>
            <div class="star-file-dialog__meta">
              <div class="star-file-dialog__status" data-role="status"></div>
              <div class="star-file-dialog__actions">
                <button type="button" class="start-footer-btn" data-role="cancel"></button>
                <button type="button" class="start-footer-btn" style="background:var(--accent);color:#fff;" data-role="confirm"></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const refs = {
      title: overlay.querySelector('[data-role="title"]'),
      close: overlay.querySelector('[data-role="close"]'),
      back: overlay.querySelector('[data-role="back"]'),
      forward: overlay.querySelector('[data-role="forward"]'),
      up: overlay.querySelector('[data-role="up"]'),
      refresh: overlay.querySelector('[data-role="refresh"]'),
      path: overlay.querySelector('[data-role="path"]'),
      go: overlay.querySelector('[data-role="go"]'),
      headName: overlay.querySelector('[data-role="head-name"]'),
      headSize: overlay.querySelector('[data-role="head-size"]'),
      headDate: overlay.querySelector('[data-role="head-date"]'),
      tbody: overlay.querySelector('[data-role="tbody"]'),
      nameField: overlay.querySelector('[data-role="name-field"]'),
      nameLabel: overlay.querySelector('[data-role="name-label"]'),
      nameInput: overlay.querySelector('[data-role="name-input"]'),
      typeField: overlay.querySelector('[data-role="type-field"]'),
      typeLabel: overlay.querySelector('[data-role="type-label"]'),
      typeSelect: overlay.querySelector('[data-role="type-select"]'),
      status: overlay.querySelector('[data-role="status"]'),
      cancel: overlay.querySelector('[data-role="cancel"]'),
      confirm: overlay.querySelector('[data-role="confirm"]')
    };

    function setStatus(message, tone) {
      state.statusText = String(message || '');
      state.statusTone = tone || '';
      refs.status.textContent = state.statusText;
      refs.status.className = 'star-file-dialog__status' + (state.statusTone ? ' is-' + state.statusTone : '');
    }

    function visibleFilter() {
      return state.config.filters[state.filterIndex] || state.config.filters[0];
    }

    function applyDefaultExtension(name) {
      const trimmed = String(name || '').trim();
      if (!trimmed) return trimmed;
      const filter = visibleFilter();
      if (isAllFilter(filter)) return trimmed;
      const currentExt = extensionOf(trimmed).replace(/^\./, '');
      if (currentExt && filter.extensions.includes(currentExt.toLowerCase())) return trimmed;
      if (currentExt) return trimmed;
      const preferred = filter.extensions[0];
      return preferred ? (trimmed + '.' + preferred) : trimmed;
    }

    function computeConfirmPayload() {
      if (state.config.kind === 'save') {
        if (!state.currentPath || state.currentPath === ROOT) return null;
        const fileName = applyDefaultExtension(state.saveName);
        if (!fileName) return null;
        return { filePath: path.join(state.currentPath, fileName) };
      }
      if (state.config.directoryMode) {
        if (state.selectedDirectory) return { filePaths: [state.selectedDirectory] };
        if (state.currentPath && state.currentPath !== ROOT) return { filePaths: [state.currentPath] };
        return null;
      }
      const selected = Array.from(state.selectedPaths);
      if (!selected.length) return null;
      return { filePaths: state.config.multi ? selected : [selected[0]] };
    }

    function updateStatusHint() {
      const payload = computeConfirmPayload();
      if (state.statusTone === 'error') {
        refs.confirm.disabled = !payload;
        return;
      }
      if (state.config.kind === 'save') {
        if (payload && payload.filePath) setStatus(payload.filePath, 'success');
        else setStatus(trf('fileDialogNameRequired', 'Enter a file name to continue.'), '');
      } else if (state.config.directoryMode) {
        const target = payload && payload.filePaths && payload.filePaths[0] ? payload.filePaths[0] : '';
        if (target) setStatus(target, 'success');
        else setStatus(trf('fileDialogChooseFolderHint', 'Open a folder and click Choose, or select a subfolder.'), '');
      } else if (payload && payload.filePaths && payload.filePaths.length) {
        setStatus(trf('fileDialogSelectedCount', '{count} item(s) selected', { count: payload.filePaths.length }), 'success');
      } else {
        setStatus(trf('fileDialogSelectHint', 'Select a file to continue.'), '');
      }
      refs.confirm.disabled = !payload;
    }

    function renderLocale() {
      refs.title.textContent = state.config.title;
      refs.back.textContent = trf('back', 'Back');
      refs.forward.textContent = trf('forward', 'Forward');
      refs.up.textContent = trf('fileDialogUp', 'Up');
      refs.refresh.textContent = trf('refresh', 'Refresh');
      refs.go.textContent = trf('go', 'Go');
      refs.headName.textContent = trf('name', 'Name');
      refs.headSize.textContent = trf('size', 'Size');
      refs.headDate.textContent = trf('date', 'Date');
      refs.nameLabel.textContent = trf('fileDialogFileName', 'File name');
      refs.typeLabel.textContent = trf('fileDialogFileType', 'File type');
      refs.cancel.textContent = trf('cancel', 'Cancel');
      refs.confirm.textContent = state.config.actionLabel;
      refs.path.placeholder = trf('addressBar', 'Address');
      refs.nameField.classList.toggle('is-hidden', state.config.kind !== 'save');
      refs.typeField.classList.toggle('is-hidden', state.config.directoryMode);
      refs.typeSelect.innerHTML = state.config.filters.map((filter, index) => '<option value="' + index + '">' + esc(filterDescription(filter)) + '</option>').join('');
      refs.typeSelect.value = String(state.filterIndex);
      refs.nameInput.value = state.saveName;
      refs.back.disabled = state.historyIndex <= 0;
      refs.forward.disabled = state.historyIndex >= state.history.length - 1;
      refs.up.disabled = !state.currentPath || state.currentPath === ROOT;
      refs.path.value = state.currentPath === ROOT ? trf('thisPC', 'This PC') : state.currentPath;
      updateStatusHint();
    }

    function sortEntries(entries) {
      return entries.slice().sort((a, b) => {
        if (!!a.isDir !== !!b.isDir) return a.isDir ? -1 : 1;
        return String(a.name || '').localeCompare(String(b.name || ''), getLocaleName(), { sensitivity: 'base', numeric: true });
      });
    }

    function shouldShowHiddenItems() {
      return readShowHiddenSetting();
    }

    function isProtectedSystemEntry(entry) {
      if (!entry || !entry.isDir) return false;
      return !!entry.isProtected || isProtectedSystemDirName(entry.name || path.basename(entry.path || ''));
    }

    function filterVisibleEntries(entries) {
      if (!Array.isArray(entries)) return [];
      if (shouldShowHiddenItems()) return entries.slice();
      return entries.filter((entry) => !entry.isHidden && !entry.isSystem);
    }

    function showProtectedFolderBlocked(targetPath) {
      setStatus(
        trf('protectedSystemFolderMessage', 'This folder is managed by the operating system and cannot be opened here.\n\nPath: {path}', { path: targetPath }),
        'error'
      );
    }

    function mappedEntries(rawEntries) {
      if (!Array.isArray(rawEntries)) return [];
      return rawEntries.map((entry) => {
        if (state.currentPath === ROOT) {
          const drivePath = String((entry && entry.path) || (entry && entry.name) || '');
          return {
            name: String((entry && entry.name) || drivePath || ''),
            path: drivePath,
            isDir: true,
            isDrive: true,
            size: entry && entry.size,
            mtime: entry && entry.mtime,
            isHidden: !!(entry && entry.isHidden),
            isSystem: !!(entry && entry.isSystem),
            isProtected: !!(entry && entry.isProtected)
          };
        }
        const name = String((entry && entry.name) || '');
        return {
          name,
          path: path.join(state.currentPath, name),
          isDir: !!(entry && entry.isDir),
          size: entry && entry.size,
          mtime: entry && entry.mtime,
          isHidden: !!(entry && entry.isHidden),
          isSystem: !!(entry && entry.isSystem),
          isProtected: !!(entry && entry.isProtected)
        };
      });
    }

    function renderRows() {
      const filter = visibleFilter();
      state.filteredEntries = filterVisibleEntries(state.entries).filter((entry) => entry.isDir || matchesFilter(entry.name, filter));
      if (!state.config.directoryMode) {
        const visibleFilePaths = new Set(state.filteredEntries.filter((entry) => !entry.isDir).map((entry) => entry.path));
        state.selectedPaths = new Set(Array.from(state.selectedPaths).filter((entryPath) => visibleFilePaths.has(entryPath)));
      }
      if (state.config.directoryMode && state.selectedDirectory && !state.filteredEntries.some((entry) => entry.path === state.selectedDirectory)) {
        state.selectedDirectory = '';
      }
      if (state.loading) {
        refs.tbody.innerHTML = '<tr><td colspan="3" class="star-file-dialog__empty">' + esc(trf('loading', 'Loading...')) + '</td></tr>';
        updateStatusHint();
        return;
      }
      if (!state.filteredEntries.length) {
        refs.tbody.innerHTML = '<tr><td colspan="3" class="star-file-dialog__empty">' + esc(state.entries.length ? trf('fileDialogNoMatches', 'No files match the current filter.') : trf('folderEmpty', 'Folder is empty')) + '</td></tr>';
        updateStatusHint();
        return;
      }
      refs.tbody.innerHTML = state.filteredEntries.map((entry) => {
        const selected = state.config.directoryMode ? state.selectedDirectory === entry.path : state.selectedPaths.has(entry.path);
        const checkboxHtml = state.config.multi && !entry.isDir
          ? '<input type="checkbox" class="star-file-dialog__checkbox" data-role="pick-cb" ' + (selected ? 'checked' : '') + '>'
          : '';
        const rowClass = 'star-file-dialog__row' + (selected ? ' is-selected' : '');
        const sizeText = entry.isDir ? '--' : formatSize(entry.size);
        const dateText = formatDate(entry.mtime);
        return `
          <tr class="${rowClass}" data-path="${esc(entry.path)}">
            <td><div class="star-file-dialog__name-cell">${checkboxHtml}${visualOfEntry(entry)}<span class="star-file-dialog__label">${esc(entry.name)}</span></div></td>
            <td class="is-size">${esc(sizeText)}</td>
            <td class="is-date">${esc(dateText)}</td>
          </tr>
        `;
      }).join('');
      hydrateRowPreviews(refs.tbody);
      refs.tbody.querySelectorAll('tr[data-path]').forEach((row) => {
        const entryPath = row.getAttribute('data-path') || '';
        const entry = state.filteredEntries.find((item) => item.path === entryPath);
        if (!entry) return;
        const checkbox = row.querySelector('[data-role="pick-cb"]');
        const selectRow = (explicitValue) => {
          if (state.config.directoryMode) {
            state.selectedDirectory = entry.isDir ? entry.path : '';
            renderRows();
            return;
          }
          if (entry.isDir) {
            if (!state.config.multi) state.selectedPaths.clear();
            renderRows();
            return;
          }
          if (state.config.kind === 'save') {
            state.saveName = entry.name;
            refs.nameInput.value = state.saveName;
          }
          if (state.config.multi) {
            const shouldSelect = explicitValue != null ? !!explicitValue : !state.selectedPaths.has(entry.path);
            if (shouldSelect) state.selectedPaths.add(entry.path);
            else state.selectedPaths.delete(entry.path);
          } else {
            state.selectedPaths = new Set([entry.path]);
          }
          renderRows();
        };
        if (checkbox) {
          checkbox.addEventListener('click', (event) => event.stopPropagation());
          checkbox.addEventListener('change', () => selectRow(checkbox.checked));
        }
        row.addEventListener('click', () => {
          selectRow();
        });
        row.addEventListener('dblclick', () => {
          if (entry.isDir) {
            if (isProtectedSystemEntry(entry)) {
              showProtectedFolderBlocked(entry.path);
              return;
            }
            navigate(entry.path, true);
            return;
          }
          if (state.config.kind === 'save') {
            state.saveName = entry.name;
            refs.nameInput.value = state.saveName;
          } else {
            state.selectedPaths = new Set([entry.path]);
          }
          handleConfirm();
        });
      });
      updateStatusHint();
    }

    async function loadEntries() {
      const token = ++state.token;
      state.loading = true;
      renderRows();
      let result = null;
      try {
        result = state.currentPath === ROOT ? await ipc.invoke('os:listDrives') : await ipc.invoke('os:readdir', state.currentPath);
      } catch (error) {
        result = { error: error && error.message ? error.message : String(error) };
      }
      if (token !== state.token) return;
      state.loading = false;
      if (result && result.error) {
        refs.tbody.innerHTML = '<tr><td colspan="3" class="star-file-dialog__error-row">' + esc(String(result.error)) + '</td></tr>';
        setStatus(String(result.error), 'error');
        refs.confirm.disabled = true;
        return;
      }
      state.entries = sortEntries(mappedEntries(result));
      setStatus('', '');
      renderRows();
    }

    async function navigate(targetPath, pushHistory) {
      state.currentPath = normalizePathText(targetPath) || ROOT;
      if (pushHistory) {
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(state.currentPath);
        state.historyIndex = state.history.length - 1;
      }
      state.selectedPaths.clear();
      state.selectedDirectory = '';
      renderLocale();
      await loadEntries();
    }

    async function goToInputPath() {
      const nextPath = normalizePathText(refs.path.value);
      if (!nextPath || nextPath === trf('thisPC', 'This PC')) {
        navigate(ROOT, true);
        return;
      }
      const targetStat = await statPath(nextPath);
      if (targetStat && !targetStat.error) {
        if (targetStat.isDir) {
          if (targetStat.isProtected) {
            showProtectedFolderBlocked(nextPath);
            refs.confirm.disabled = true;
            return;
          }
          navigate(nextPath, true);
          return;
        }
        const parentDir = path.dirname(nextPath);
        const parentStat = await statPath(parentDir);
        if (parentStat && !parentStat.error && parentStat.isDir) {
          await navigate(parentDir, true);
          if (state.config.kind === 'save') {
            state.saveName = path.basename(nextPath);
            refs.nameInput.value = state.saveName;
          } else if (!state.config.directoryMode) {
            state.selectedPaths = new Set([nextPath]);
          }
          renderRows();
          return;
        }
      }
      setStatus(trf('fmErrorPathNotFound', 'Path not found: {path}', { path: nextPath }), 'error');
      refs.confirm.disabled = true;
    }

    async function handleConfirm() {
      const payload = computeConfirmPayload();
      if (!payload) {
        updateStatusHint();
        return;
      }
      if (state.config.kind === 'save') {
        const targetPath = payload.filePath;
        const existing = await statPath(targetPath);
        if (existing && !existing.error) {
          if (existing.isDir) {
            setStatus(trf('fmErrorNotFolder', 'This location is not a folder and cannot be opened here: {path}', { path: targetPath }), 'error');
            refs.confirm.disabled = true;
            return;
          }
          let overwrite = true;
          if (window.StarDialog && typeof window.StarDialog.confirm === 'function') {
            overwrite = await window.StarDialog.confirm({
              title: trf('fileDialogOverwriteTitle', 'Replace existing file?'),
              message: trf('fileDialogOverwriteMessage', 'The file "{name}" already exists. Replace it?', { name: path.basename(targetPath) }),
              okText: trf('save', 'Save'),
              cancelText: trf('cancel', 'Cancel')
            });
          }
          if (!overwrite) return;
        }
        storeLastDir(path.dirname(targetPath));
        closeDialog({ canceled: false, filePath: targetPath });
        return;
      }
      const resultPaths = payload.filePaths || [];
      if (!resultPaths.length) {
        updateStatusHint();
        return;
      }
      storeLastDir(state.config.directoryMode ? resultPaths[0] : path.dirname(resultPaths[0]));
      closeDialog({ canceled: false, filePaths: resultPaths });
    }

    refs.close.addEventListener('click', () => closeDialog(cancelResult(state.config.kind)));
    refs.cancel.addEventListener('click', () => closeDialog(cancelResult(state.config.kind)));
    refs.back.addEventListener('click', () => {
      if (state.historyIndex <= 0) return;
      state.historyIndex -= 1;
      navigate(state.history[state.historyIndex], false);
    });
    refs.forward.addEventListener('click', () => {
      if (state.historyIndex >= state.history.length - 1) return;
      state.historyIndex += 1;
      navigate(state.history[state.historyIndex], false);
    });
    refs.up.addEventListener('click', () => {
      if (!state.currentPath || state.currentPath === ROOT) return;
      const parent = path.dirname(state.currentPath);
      if (!parent || parent === state.currentPath) {
        navigate(ROOT, true);
        return;
      }
      navigate(parent, true);
    });
    refs.refresh.addEventListener('click', () => loadEntries());
    refs.go.addEventListener('click', goToInputPath);
    refs.path.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        event.preventDefault();
        goToInputPath();
      }
    });
    refs.path.addEventListener('input', () => {
      if (state.statusTone === 'error') {
        setStatus('', '');
        updateStatusHint();
      }
    });
    refs.nameInput.addEventListener('input', () => {
      state.saveName = refs.nameInput.value;
      setStatus('', '');
      updateStatusHint();
    });
    refs.nameInput.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        event.preventDefault();
        handleConfirm();
      }
    });
    refs.typeSelect.addEventListener('change', () => {
      state.filterIndex = Math.max(0, Number(refs.typeSelect.value) || 0);
      renderLocale();
      renderRows();
    });
    refs.confirm.addEventListener('click', handleConfirm);
    overlay.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        refs.cancel.click();
      }
    }, true);

    active.onLocaleChange = () => {
      renderLocale();
      renderRows();
    };
    window.addEventListener('star:locale-change', active.onLocaleChange);
    active.onVisibilityChange = () => {
      renderRows();
    };
    window.addEventListener('star:file-manager-visibility-change', active.onVisibilityChange);

    renderLocale();
    await loadEntries();
    setTimeout(() => {
      const focusTarget = state.config.kind === 'save' ? refs.nameInput : refs.path;
      try {
        focusTarget.focus();
        if (focusTarget.select) focusTarget.select();
      } catch (_) {}
    }, 0);
  }

  window.StarFileDialog = {
    open(options) {
      return enqueue('open', options || {});
    },
    save(options) {
      return enqueue('save', options || {});
    }
  };

  window.showInternalOpenDialog = function showInternalOpenDialog(options) {
    try {
      if (window.StarFileDialog && typeof window.StarFileDialog.open === 'function') {
        return window.StarFileDialog.open(options || {});
      }
    } catch (_) {}
    return ipc.invoke('os:showOpenDialog', options || {});
  };

  window.showInternalSaveDialog = function showInternalSaveDialog(options) {
    try {
      if (window.StarFileDialog && typeof window.StarFileDialog.save === 'function') {
        return window.StarFileDialog.save(options || {});
      }
    } catch (_) {}
    return ipc.invoke('os:showSaveDialog', options || {});
  };
})();