
﻿/** Star OS main entry: theme, locale, wallpaper, startup splash */
const BOOT_STAGE_ORDER = ['firmware', 'theme', 'locale', 'shell', 'desktop'];
const BOOT_STAGE_PROGRESS = {
  firmware: 0.18,
  theme: 0.34,
  locale: 0.52,
  shell: 0.76,
  desktop: 0.92,
  ready: 1
};

function applyStarTheme(theme) {
  try {
    const nextTheme = theme || (typeof localStorage !== 'undefined' && localStorage.getItem('star-theme')) || 'dark';
    if (typeof localStorage !== 'undefined') localStorage.setItem('star-theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  } catch (_) {}
}
window.applyStarTheme = applyStarTheme;

function getBootSplashRefs() {
  const root = document.getElementById('boot-splash');
  if (!root) return null;
  const stageRefs = {};
  BOOT_STAGE_ORDER.forEach((stageId) => {
    stageRefs[stageId] = {
      row: root.querySelector('[data-boot-stage="' + stageId + '"]'),
      label: document.getElementById('boot-bios-' + stageId + '-label'),
      value: document.getElementById('boot-bios-' + stageId + '-value')
    };
  });
  return {
    root,
    eyebrow: document.getElementById('boot-splash-eyebrow'),
    title: document.getElementById('boot-splash-title'),
    subtitle: document.getElementById('boot-splash-subtitle'),
    authorLabel: document.getElementById('boot-splash-author-label'),
    authorValue: document.getElementById('boot-splash-author-value'),
    gameLabel: document.getElementById('boot-splash-game-label'),
    gameValue: document.getElementById('boot-splash-game-value'),
    status: document.getElementById('boot-splash-status'),
    progressBar: document.getElementById('boot-splash-progress-bar'),
    biosHead: document.getElementById('boot-splash-bios-head'),
    biosStages: stageRefs
  };
}

function getBootLocale() {
  try {
    if (typeof getLocale === 'function') {
      const next = String(getLocale() || '').trim();
      if (next) return next;
    }
  } catch (_) {}
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('star-locale') : '';
    if (stored) return String(stored);
  } catch (_) {}
  return 'zh-CN';
}

function getBootSplashBundle() {
  const bootT = (key, fallback) => (typeof t === 'function' ? t(key, fallback) : fallback);
  return {
    eyebrow: bootT('bootSplashEyebrow', 'STAR OS'),
    title: bootT('bootSplashTitle', 'Star OS'),
    subtitle: bootT('bootSplashSubtitle', 'Preparing your desktop, apps, and game experience.'),
    authorLabel: bootT('bootSplashAuthorLabel', 'Developer'),
    authorValue: bootT('bootSplashAuthorValue', 'Xingwei Star'),
    gameLabel: bootT('bootSplashGameLabel', 'Indie Game'),
    gameValue: bootT('bootSplashGameValue', "Rovi's Diary"),
    biosHead: bootT('bootBiosHead', 'STAR BIOS :: BOOT SEQUENCE'),
    biosLabels: {
      firmware: bootT('bootBiosFirmware', 'Firmware Check'),
      theme: bootT('bootBiosTheme', 'Theme Profile'),
      locale: bootT('bootBiosLocale', 'Locale Pack'),
      shell: bootT('bootBiosShell', 'Shell Services'),
      desktop: bootT('bootBiosDesktop', 'Desktop Session')
    },
    biosValuePending: bootT('bootBiosValuePending', 'Pending'),
    biosValueActive: bootT('bootBiosValueActive', 'Loading'),
    biosValueReady: bootT('bootBiosValueReady', 'Ready'),
    statuses: {
      firmware: bootT('bootSplashStatusFirmware', 'Calibrating the boot sequence and firmware checks.'),
      theme: bootT('bootSplashStatusTheme', 'Applying the theme and visual baseline.'),
      locale: bootT('bootSplashStatusLocale', 'Loading interface language and text resources.'),
      shell: bootT('bootSplashStatusShell', 'Starting the taskbar, Start menu, and shell services.'),
      desktop: bootT('bootSplashStatusDesktop', 'Attaching the desktop, wallpaper, and user session.'),
      ready: bootT('bootSplashStatusReady', 'Desktop ready. Entering Star OS.')
    }
  };
}

function setBootSplashProgress(refs, value) {
  if (!refs || !refs.progressBar) return;
  const next = Math.max(0.04, Math.min(1, Number(value) || 0));
  refs.progressBar.style.transform = 'scaleX(' + next + ')';
}

function renderBootSplash(refs, currentStage, ready) {
  if (!refs || !refs.root) return;
  const bundle = getBootSplashBundle();
  if (refs.eyebrow) refs.eyebrow.textContent = bundle.eyebrow;
  if (refs.title) refs.title.textContent = bundle.title;
  if (refs.subtitle) refs.subtitle.textContent = bundle.subtitle;
  if (refs.authorLabel) refs.authorLabel.textContent = bundle.authorLabel;
  if (refs.authorValue) refs.authorValue.textContent = bundle.authorValue;
  if (refs.gameLabel) refs.gameLabel.textContent = bundle.gameLabel;
  if (refs.gameValue) refs.gameValue.textContent = bundle.gameValue;
  if (refs.biosHead) refs.biosHead.textContent = bundle.biosHead;
  const currentIndex = ready ? BOOT_STAGE_ORDER.length : Math.max(0, BOOT_STAGE_ORDER.indexOf(currentStage));
  BOOT_STAGE_ORDER.forEach((stageId, index) => {
    const stageRef = refs.biosStages && refs.biosStages[stageId];
    if (!stageRef) return;
    if (stageRef.label) stageRef.label.textContent = bundle.biosLabels[stageId];
    const isComplete = ready || index < currentIndex;
    const isActive = !ready && index === currentIndex;
    if (stageRef.value) {
      stageRef.value.textContent = isComplete
        ? bundle.biosValueReady
        : (isActive ? bundle.biosValueActive : bundle.biosValuePending);
    }
    if (stageRef.row) {
      stageRef.row.classList.toggle('is-complete', !!isComplete);
      stageRef.row.classList.toggle('is-active', !!isActive);
    }
  });
  if (refs.status) {
    const statusKey = ready ? 'ready' : currentStage;
    refs.status.textContent = bundle.statuses[statusKey] || bundle.statuses.firmware;
  }
}

function createBootProgressDriver(refs) {
  let current = 0.04;
  let target = 0.04;
  let rafId = 0;
  let finishResolver = null;

  const step = () => {
    const diff = target - current;
    if (Math.abs(diff) <= 0.0015) {
      current = target;
      setBootSplashProgress(refs, current);
      rafId = 0;
      if (current >= 1 && finishResolver) {
        const resolve = finishResolver;
        finishResolver = null;
        resolve();
      }
      return;
    }
    const factor = target >= 1 ? 0.52 : 0.2;
    current += diff * factor + (diff > 0 ? 0.006 : 0);
    if (current > target) current = target;
    setBootSplashProgress(refs, current);
    rafId = window.requestAnimationFrame(step);
  };

  const ensureTicking = () => {
    if (!rafId) rafId = window.requestAnimationFrame(step);
  };

  return {
    setTarget(value) {
      target = Math.max(current, Math.min(1, Number(value) || 0));
      ensureTicking();
    },
    finish() {
      target = 1;
      ensureTicking();
      if (current >= 1) return Promise.resolve();
      return new Promise((resolve) => {
        finishResolver = resolve;
      });
    },
    stop() {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (finishResolver) {
        finishResolver();
        finishResolver = null;
      }
    }
  };
}

function createBootSplashController(refs) {
  if (!refs || !refs.root) {
    return {
      advance() {},
      relocalize() {},
      complete() { return Promise.resolve(); },
      dispose() {}
    };
  }
  let currentStage = 'firmware';
  let completed = false;
  const progressDriver = createBootProgressDriver(refs);
  renderBootSplash(refs, currentStage, false);
  progressDriver.setTarget(BOOT_STAGE_PROGRESS[currentStage]);

  return {
    advance(stageId) {
      if (completed || !BOOT_STAGE_PROGRESS[stageId]) return;
      currentStage = stageId;
      renderBootSplash(refs, currentStage, false);
      progressDriver.setTarget(BOOT_STAGE_PROGRESS[stageId]);
    },
    relocalize() {
      renderBootSplash(refs, currentStage, completed);
    },
    complete() {
      completed = true;
      renderBootSplash(refs, currentStage, true);
      return progressDriver.finish();
    },
    dispose() {
      progressDriver.stop();
    }
  };
}

function hideBootSplash(refs, localeHandler) {
  if (!refs || !refs.root) return;
  if (localeHandler && typeof window.removeEventListener === 'function') {
    window.removeEventListener('star:locale-change', localeHandler);
  }
  refs.root.classList.add('is-leaving');
  window.setTimeout(() => {
    refs.root.classList.add('hidden');
    refs.root.classList.remove('is-leaving');
    document.body.classList.remove('star-booting');
  }, 260);
}

function mountStarVue() {
  if (typeof Vue === 'undefined' || window.starApp) return;
  const starApp = Vue.createApp({
    data() {
      return { startMenuOpen: false };
    },
    methods: {
      toggleStartMenu() {
        this.startMenuOpen = !this.startMenuOpen;
        if (this.startMenuOpen) {
          const el = document.getElementById('start-menu');
          if (el) el.classList.remove('hidden');
          if (window.refreshStartMenu) window.refreshStartMenu();
        }
      }
    },
    mounted() {
      window.closeStartMenu = () => { this.startMenuOpen = false; };
    }
  });
  starApp.mount('#app');
  window.starApp = starApp;
}

function waitForBootFrame() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      resolve();
      return;
    }
    window.requestAnimationFrame(() => resolve());
  });
}

async function initStarMain() {
  const bootRefs = getBootSplashRefs();
  const boot = createBootSplashController(bootRefs);
  let bootLocaleHandler = null;
  let hideScheduled = false;

  const scheduleHide = () => {
    if (hideScheduled) return;
    hideScheduled = true;
    boot.complete().then(() => {
      window.requestAnimationFrame(() => {
        hideBootSplash(bootRefs, bootLocaleHandler);
        boot.dispose();
      });
    });
  };

  try {
    boot.advance('firmware');
    await waitForBootFrame();
    applyStarTheme();
    boot.advance('theme');
    await waitForBootFrame();
    setLocale(getLocale());
    boot.advance('locale');
    if (typeof window.addEventListener === 'function') {
      bootLocaleHandler = () => boot.relocalize();
      window.addEventListener('star:locale-change', bootLocaleHandler);
    }
    await waitForBootFrame();
    if (window.refreshStartMenu) window.refreshStartMenu();
    boot.advance('shell');
    await waitForBootFrame();
    if (window.applyDesktopWallpaper) window.applyDesktopWallpaper();
    mountStarVue();
    boot.advance('desktop');
    await waitForBootFrame();
  } finally {
    scheduleHide();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStarMain);
} else {
  initStarMain();
}
