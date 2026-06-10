
/** Star OS - 通知中心与简单通知 API */
(function() {
  const electron = require('electron');
  const listEl = document.getElementById('nc-list');
  const panelEl = document.getElementById('notification-center');
  const trayBtn = document.getElementById('tray-notify');
  const clearBtn = document.getElementById('nc-clear');

  function togglePanel() {
    if (!panelEl) return;
    panelEl.classList.toggle('hidden');
  }

  if (trayBtn) trayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePanel();
  });
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (listEl) listEl.innerHTML = '';
  });
  document.addEventListener('click', (e) => {
    if (!panelEl || panelEl.classList.contains('hidden')) return;
    if (!panelEl.contains(e.target) && e.target !== trayBtn) {
      panelEl.classList.add('hidden');
    }
  });

  function pushNotification(payload) {
    if (!listEl) return;
    const { title, message, appId } = payload || {};
    const item = document.createElement('div');
    item.className = 'nc-item';
    item.innerHTML = `
      <div class="nc-item-title">${title || (typeof t === 'function' ? t('notification') : '通知')}</div>
      <div class="nc-item-body">${message || ''}</div>
    `;
    listEl.prepend(item);
    panelEl && panelEl.classList.remove('hidden');
  }

  // 提供给应用调用的通知 API
  window.StarNotify = {
    show(payload) {
      try {
        pushNotification(payload);
      } catch (e) {
        console.error('StarNotify error', e);
      }
    }
  };

  // 可选：主进程也可以通过 IPC 发送通知
  try {
    electron.ipcRenderer.on('os:notify', (_e, payload) => pushNotification(payload));
  } catch (_) {}
})();
