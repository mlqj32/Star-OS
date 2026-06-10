
/**
 * Star OS core services: process management, memory information, file access, and device info.
 * Exposes a shared system API layer for built-in apps.
 */
(function() {
  const electron = require('electron');
  const ipc = electron.ipcRenderer;

  /** Process management: built-in windows plus managed external sessions. */
  const StarProcess = {
    getAppProcesses() {
      const mgr = window.StarWindowManager;
      const internal = (mgr && Array.isArray(mgr.windows))
        ? mgr.windows.map(w => ({
          id: w.id,
          pid: w.id,
          name: w.title,
          appId: w.appId,
          memory: 0,
          type: 'app'
        }))
        : [];
      const managed = (mgr && Array.isArray(mgr.managedHosts))
        ? mgr.managedHosts.map(h => ({
          id: h.taskbarId,
          pid: h.taskbarId,
          name: h.title || 'App',
          appId: 'managed-exe',
          memory: 0,
          type: 'app'
        }))
        : [];
      return internal.concat(managed);
    },
    async getSystemProcesses() {
      try {
        return await ipc.invoke('os:getProcessList') || [];
      } catch (e) {
        return [];
      }
    },
    async getAllProcesses() {
      const appList = this.getAppProcesses();
      const systemList = await this.getSystemProcesses();
      return [...appList, ...systemList];
    },
    endTask(winId) {
      const wid = String(winId || '');
      if (wid.startsWith('mh-')) {
        const sessionId = wid.slice(3);
        ipc.invoke('managed-exe:taskbar-action', { sessionId, action: 'close' }).catch(() => {});
        return;
      }
      if (window.StarWindowManager) StarWindowManager.close(winId);
    }
  };

  /** Memory helpers. */
  const StarMemory = {
    async getInfo() {
      try {
        return await ipc.invoke('os:getMemoryInfo') || { process: {}, system: {} };
      } catch (e) {
        return { process: {}, system: {} };
      }
    },
    formatBytes(n) {
      if (n == null || isNaN(n)) return '--';
      if (n < 1024) return n + ' B';
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
      if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB';
      return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
  };

  /** Device helpers. */
  const StarDevice = {
    async getInfo() {
      try {
        return await ipc.invoke('os:getDeviceInfo') || {};
      } catch (e) {
        return {};
      }
    }
  };

  /** File helpers that wrap main-process IPC for consistent app-side usage. */
  const StarFile = {
    async readDir(dir) {
      const r = await ipc.invoke('os:readdir', dir);
      return r && r.error ? { error: r.error } : r;
    },
    async readFile(path) {
      const r = await ipc.invoke('os:readFile', path);
      return r && r.error ? { error: r.error } : r;
    },
    async writeFile(path, content) {
      const r = await ipc.invoke('os:writeFile', path, content);
      return r && r.error ? { error: r.error } : { ok: true };
    },
    async stat(path) {
      const r = await ipc.invoke('os:stat', path);
      return r && r.error ? { error: r.error } : r;
    },
    async mkdir(path) {
      const r = await ipc.invoke('os:mkdir', path);
      return r && r.error ? { error: r.error } : { ok: true };
    },
    async rename(oldPath, newPath) {
      const r = await ipc.invoke('os:renamePath', oldPath, newPath);
      return r && r.error ? { error: r.error } : r;
    },
    async copy(path, targetDir) {
      const r = await ipc.invoke('os:copyItem', path, targetDir);
      return r && r.error ? { error: r.error } : r;
    },
    async move(path, targetDir) {
      const r = await ipc.invoke('os:moveItem', path, targetDir);
      return r && r.error ? { error: r.error } : r;
    },
    async trash(path) {
      const r = await ipc.invoke('os:trashItem', path);
      return r && r.error ? { error: r.error } : { ok: true };
    },
    async openRecycleBin() {
      return ipc.invoke('os:openRecycleBin');
    }
  };

  const StarStorage = {
    readJson(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return Array.isArray(fallback) ? (Array.isArray(parsed) ? parsed : fallback) : (parsed ?? fallback);
      } catch (_) {
        return fallback;
      }
    },
    writeJson(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (_) {}
    },
    getPinnedAppIds(defaultIds = []) {
      const saved = this.readJson('star-pinned-apps', null);
      // 允许用户把“固定应用”清空；只要保存值是数组（即使为空）就直接使用。
      if (Array.isArray(saved)) return saved;
      return defaultIds.slice();
    },
    setPinnedAppIds(ids) {
      this.writeJson('star-pinned-apps', Array.from(new Set(ids)));
    },
    getRecentApps(limit = 8) {
      return this.readJson('star-recent-apps', []).slice(0, limit);
    },
    recordRecentApp(appId) {
      if (!appId) return;
      const next = [appId, ...this.getRecentApps(32).filter(id => id !== appId)];
      this.writeJson('star-recent-apps', next.slice(0, 12));
    },
    getRecentFiles(limit = 8) {
      return this.readJson('star-recent-files', []).slice(0, limit);
    },
    recordRecentFile(filePath) {
      if (!filePath) return;
      const next = [filePath, ...this.getRecentFiles(32).filter(item => item !== filePath)];
      this.writeJson('star-recent-files', next.slice(0, 12));
    }
  };

  window.StarProcess = StarProcess;
  window.StarMemory = StarMemory;
  window.StarDevice = StarDevice;
  window.StarFile = StarFile;
  window.StarStorage = StarStorage;
})();

