
/** Star OS 应用注册表 - 预装应用与 Windows 应用启动 */
const PROJECT_DISCLAIMER_META = Object.freeze({
  developer: '\u661f\u8587Star',
  homepage: 'https://space.bilibili.com/259516939',
  indieGameKey: 'projectDisclaimerIndieGameValue',
  baikePage: 'https://store.steampowered.com/app/4448620/_/',
});

function getProjectDisclaimerCardContent(extraClass) {
  const esc = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value == null ? '' : value);
  const cls = ['project-disclaimer-card', extraClass].filter(Boolean).join(' ');
  const title = typeof t === 'function' ? t('projectDisclaimerTitle') : 'Project notice';
  const body = typeof t === 'function' ? t('projectDisclaimerBody') : 'The information shown here is provided for reference. Related links open in this project\'s built-in browser.';
  const viewDetails = typeof t === 'function' ? t('viewDetails') : 'Open in built-in browser';
  const linkText = typeof t === 'function' ? t('projectDisclaimerLinkText') : 'Click to open';
  return `
    <section class="${cls}" aria-label="${esc(title)}">
      <div class="project-disclaimer-head">
        <div class="project-disclaimer-kicker">${esc(title)}</div>
        <p class="project-disclaimer-body">${esc(body)}</p>
      </div>
      <div class="project-disclaimer-grid">
        <div class="project-disclaimer-row">
          <span class="project-disclaimer-label">${esc(typeof t === 'function' ? t('developerLabel') : 'Developer')}</span>
          <span class="project-disclaimer-value">${esc(PROJECT_DISCLAIMER_META.developer)}</span>
        </div>
        <div class="project-disclaimer-row project-disclaimer-row--action">
          <span class="project-disclaimer-label">${esc(typeof t === 'function' ? t('personalHomepageLabel') : 'Personal Homepage')}</span>
          <a class="project-disclaimer-link" href="${esc(PROJECT_DISCLAIMER_META.homepage)}" data-internal-url="${esc(PROJECT_DISCLAIMER_META.homepage)}" rel="noopener noreferrer" title="${esc(viewDetails)}" aria-label="${esc(viewDetails)}">${esc(linkText)}</a>
        </div>
        <div class="project-disclaimer-row">
          <span class="project-disclaimer-label">${esc(typeof t === 'function' ? t('indieGameLabel') : 'Indie Game')}</span>
          <span class="project-disclaimer-value">${esc(typeof t === 'function' ? t(PROJECT_DISCLAIMER_META.indieGameKey) : 'Rovi\'s Diary')}</span>
        </div>
        <div class="project-disclaimer-row project-disclaimer-row--action">
          <span class="project-disclaimer-label">${esc(typeof t === 'function' ? t('baikePageLabel') : 'Steam Page')}</span>
          <a class="project-disclaimer-link" href="${esc(PROJECT_DISCLAIMER_META.baikePage)}" data-internal-url="${esc(PROJECT_DISCLAIMER_META.baikePage)}" rel="noopener noreferrer" title="${esc(viewDetails)}" aria-label="${esc(viewDetails)}">${esc(linkText)}</a>
        </div>
      </div>
    </section>`;
}

const HAND_DRAWN_APP_ICON_PALETTES = Object.freeze({
  'file-manager': { accent: '#f59e0b', accent2: '#fde68a', accent3: '#60a5fa' },
  'browser': { accent: '#2563eb', accent2: '#93c5fd', accent3: '#38bdf8' },
  'music-player': { accent: '#ec4899', accent2: '#f9a8d4', accent3: '#8b5cf6' },
  'video-player': { accent: '#ef4444', accent2: '#fca5a5', accent3: '#fb7185' },
  'wps-editor': { accent: '#2563eb', accent2: '#93c5fd', accent3: '#f97316' },
  'image-viewer': { accent: '#10b981', accent2: '#86efac', accent3: '#facc15' },
  'star-unzip': { accent: '#f97316', accent2: '#fdba74', accent3: '#22c55e' },
  terminal: { accent: '#0f172a', accent2: '#94a3b8', accent3: '#22c55e' },
  'redis-cli': { accent: '#dc2626', accent2: '#fca5a5', accent3: '#f59e0b' },
  'linux-shell': { accent: '#2563eb', accent2: '#93c5fd', accent3: '#22c55e' },
  'docker-shell': { accent: '#0ea5e9', accent2: '#7dd3fc', accent3: '#2563eb' },
  calculator: { accent: '#334155', accent2: '#cbd5e1', accent3: '#f59e0b' },
  'text-editor': { accent: '#0f766e', accent2: '#5eead4', accent3: '#f97316' },
  'markdown-reader': { accent: '#4338ca', accent2: '#a5b4fc', accent3: '#0f172a' },
  'java-ide': { accent: '#ea580c', accent2: '#fdba74', accent3: '#2563eb' },
  paint: { accent: '#7c3aed', accent2: '#c4b5fd', accent3: '#f472b6' },
  clock: { accent: '#1d4ed8', accent2: '#93c5fd', accent3: '#f97316' },
  'control-panel': { accent: '#16a34a', accent2: '#86efac', accent3: '#2563eb' },
  'network-tools': { accent: '#0284c7', accent2: '#67e8f9', accent3: '#2563eb' },
  settings: { accent: '#475569', accent2: '#cbd5e1', accent3: '#60a5fa' },
  'task-manager': { accent: '#2563eb', accent2: '#93c5fd', accent3: '#22c55e' },
  run: { accent: '#7c3aed', accent2: '#c4b5fd', accent3: '#f59e0b' },
  'game-tetris': { accent: '#2563eb', accent2: '#f97316', accent3: '#facc15', accent4: '#ec4899' },
  'game-snake': { accent: '#16a34a', accent2: '#86efac', accent3: '#ef4444' },
  'game-link': { accent: '#8b5cf6', accent2: '#c4b5fd', accent3: '#38bdf8' },
  'game-platformer': { accent: '#2563eb', accent2: '#93c5fd', accent3: '#f97316' },
  'game-landlord': { accent: '#dc2626', accent2: '#fca5a5', accent3: '#facc15' },
  'game-runner': { accent: '#f97316', accent2: '#fdba74', accent3: '#22c55e' },
  'game-tank': { accent: '#15803d', accent2: '#86efac', accent3: '#334155' },
  'game-plane': { accent: '#0284c7', accent2: '#7dd3fc', accent3: '#f59e0b' },
  'game-gomoku': { accent: '#b45309', accent2: '#fcd34d', accent3: '#111827' },
  'game-minesweeper': { accent: '#334155', accent2: '#cbd5e1', accent3: '#ef4444' },
  'game-2048': { accent: '#f59e0b', accent2: '#fb7185', accent3: '#38bdf8', accent4: '#f97316' },
  'game-othello': { accent: '#d64545', accent2: '#e7c78a', accent3: '#2f3747' },
  'game-sokoban': { accent: '#b45309', accent2: '#fcd34d', accent3: '#2563eb' },
  'game-sudoku': { accent: '#67c84b', accent2: '#a7ea73', accent3: '#58a63e' },
  'game-solitaire': { accent: '#2563eb', accent2: '#e2e8f0', accent3: '#111827' },
  'game-carrot-defense': { accent: '#ff8a3d', accent2: '#fff7ef', accent3: '#38c56a' },
  screenshot: { accent: '#0f172a', accent2: '#cbd5e1', accent3: '#38bdf8' },
  'sticky-notes': { accent: '#facc15', accent2: '#fde68a', accent3: '#f97316' },
  'character-map': { accent: '#7c3aed', accent2: '#c4b5fd', accent3: '#2563eb' },
  'on-screen-keyboard': { accent: '#475569', accent2: '#cbd5e1', accent3: '#38bdf8' },
  about: { accent: '#2563eb', accent2: '#93c5fd', accent3: '#f59e0b' },
});

const HAND_DRAWN_APP_ICON_ART = Object.freeze({
  'file-manager': `
    <path d="M16 27h12l4-4h14c3.3 0 6 2.7 6 6v15c0 4.4-3.6 8-8 8H20c-4.4 0-8-3.6-8-8V31c0-2.2 1.8-4 4-4z" fill="{accent2}" stroke="{ink}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M12 32h40c0 0-1 15-6 17H18c-4 0-6-3.5-6-8.5z" fill="{accent}" opacity="0.95"/>
    <path d="M20 37h14M20 42h18" fill="none" stroke="{paper2}" stroke-width="2.4" stroke-linecap="round"/>
  `,
  browser: `
    <circle cx="32" cy="34" r="15" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
    <path d="M19 34h26M32 19c5 6 7 10 7 15s-2 9-7 15c-5-6-7-10-7-15s2-9 7-15zM23 24c6 2 10 4 18 4" fill="none" stroke="{accent}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="43" cy="23" r="3.1" fill="{accent3}" stroke="{ink}" stroke-width="1.4"/>
  `,
  'music-player': `
    <path d="M26 24v18c0 4-2.7 6.5-6 6.5S14 46 14 42.8s2.7-5.6 6.1-5.6c1.1 0 2.2.2 3.9.7V20l20-3v18c0 4-2.7 6.5-6 6.5S32 39 32 35.8s2.7-5.6 6.1-5.6c1.1 0 2.2.2 3.9.7V21z" fill="{accent}" stroke="{ink}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M18 20c2-3 5-5 8-5 4 0 7 2 10 6" fill="none" stroke="{accent3}" stroke-width="2.4" stroke-linecap="round"/>
  `,
  'video-player': `
    <rect x="15" y="22" width="30" height="22" rx="5" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
    <path d="M29 28l10 5-10 5z" fill="{accent}" stroke="{ink}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M20 19h20" stroke="{accent3}" stroke-width="3" stroke-linecap="round"/>
    <path d="M20 47h20" stroke="{accent3}" stroke-width="3" stroke-linecap="round"/>
  `,
  'wps-editor': `
    <path d="M23 16h14l10 10v22c0 2.2-1.8 4-4 4H23c-3.3 0-6-2.7-6-6V22c0-3.3 2.7-6 6-6z" fill="{paper2}" stroke="{ink}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M37 16v10h10" fill="none" stroke="{accent2}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M23 40l4-14 5 10 5-10 4 14" fill="none" stroke="{accent}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  'image-viewer': `
    <rect x="15" y="20" width="34" height="26" rx="5" fill="{paper2}" stroke="{ink}" stroke-width="2"/>
    <circle cx="25" cy="28" r="4" fill="{accent3}"/>
    <path d="M20 42l8-9 7 7 5-5 5 7z" fill="{accent2}" stroke="{ink}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M19 18l6-3" stroke="{accent}" stroke-width="2.4" stroke-linecap="round"/>
  `,
  'star-unzip': `
    <path d="M18 24h28l4 6v16c0 3.3-2.7 6-6 6H20c-3.3 0-6-2.7-6-6V30z" fill="{accent2}" stroke="{ink}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M18 30h32" stroke="{ink}" stroke-width="2"/>
    <path d="M32 20v16M27 31l5 5 5-5" fill="none" stroke="{accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M40 22v10" stroke="{accent3}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1.8 3.4"/>
  `,
  terminal: `
    <rect x="14" y="20" width="36" height="26" rx="6" fill="{ink}" stroke="{paper2}" stroke-width="1.6"/>
    <path d="M21 28l6 5-6 5" fill="none" stroke="{accent2}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M31 38h10" stroke="{accent3}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="22" cy="24" r="1.8" fill="{accent}"/><circle cx="28" cy="24" r="1.8" fill="{accent3}"/>
  `,
  'redis-cli': `
    <ellipse cx="32" cy="25" rx="14" ry="5.5" fill="{accent}" stroke="{ink}" stroke-width="2"/>
    <path d="M18 25v7c0 3 6.3 5.5 14 5.5s14-2.5 14-5.5v-7" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
    <path d="M18 32v7c0 3 6.3 5.5 14 5.5s14-2.5 14-5.5v-7" fill="{accent3}" opacity="0.75" stroke="{ink}" stroke-width="2"/>
    <path d="M25 30h5M34 37h6" stroke="{paper2}" stroke-width="2.4" stroke-linecap="round"/>
  `,
  'linux-shell': `
    <rect x="14" y="18" width="36" height="28" rx="6" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
    <path d="M22 28l5 5-5 5" fill="none" stroke="{ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M31 38h10" stroke="{accent}" stroke-width="3" stroke-linecap="round"/>
    <path d="M36 20c2-3 4-4 7-4" stroke="{accent3}" stroke-width="2.2" stroke-linecap="round"/>
  `,
  'docker-shell': `
    <path d="M15 39h26c5.3 0 8.7-3.2 9.8-8.4-2.4 1.2-4.8 1-6.7-.5-1.3-1-1.9-2.4-2.2-4.1-2 1.5-4.2 2.4-6.7 2.4H22v10.6z" fill="{accent}" stroke="{ink}" stroke-width="2" stroke-linejoin="round"/>
    <rect x="20" y="24" width="6" height="5" rx="1.2" fill="{accent2}" stroke="{ink}" stroke-width="1.4"/>
    <rect x="27" y="24" width="6" height="5" rx="1.2" fill="{accent2}" stroke="{ink}" stroke-width="1.4"/>
    <rect x="34" y="24" width="6" height="5" rx="1.2" fill="{accent2}" stroke="{ink}" stroke-width="1.4"/>
    <rect x="27" y="18" width="6" height="5" rx="1.2" fill="{accent3}" stroke="{ink}" stroke-width="1.4"/>
  `,
  calculator: `
    <rect x="18" y="16" width="28" height="36" rx="7" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
    <rect x="23" y="21" width="18" height="7" rx="2.6" fill="{paper2}" stroke="{ink}" stroke-width="1.5"/>
    <g fill="{accent}" stroke="{ink}" stroke-width="1.2">
      <rect x="23" y="32" width="6" height="6" rx="1.6"/><rect x="31" y="32" width="6" height="6" rx="1.6"/><rect x="39" y="32" width="6" height="6" rx="1.6"/>
      <rect x="23" y="40" width="6" height="6" rx="1.6"/><rect x="31" y="40" width="14" height="6" rx="1.6" fill="{accent3}"/>
    </g>
  `,
  'text-editor': `
    <path d="M21 18h18l7 7v20c0 3.9-3.1 7-7 7H21c-3.9 0-7-3.1-7-7V25c0-3.9 3.1-7 7-7z" fill="{paper2}" stroke="{ink}" stroke-width="2"/>
    <path d="M31 28h10M22 34h16M22 40h20" stroke="{accent2}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M40 47l6-14 4 4-14 10-5 1z" fill="{accent3}" stroke="{ink}" stroke-width="1.8" stroke-linejoin="round"/>
  `,
  'markdown-reader': `
    <path d="M17 18h30v28H17z" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
    <path d="M22 41V26l8 9 8-9v15" fill="none" stroke="{accent}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M38 29h5l-5 6 5 6" fill="none" stroke="{ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  'java-ide': `
    <path d="M20 43c2 5 7 8 12 8s10-3 12-8" fill="none" stroke="{accent3}" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M24 40h16c4.5 0 8 3.5 8 8H24c-4.5 0-8-3.5-8-8z" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
    <path d="M25 27c3-2 6-3 9-3 3.5 0 6 .9 8 2.5" fill="none" stroke="{accent}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M30 20c2-1.8 3.7-4 3.4-7M37 19c2.6-2.1 3.8-4.8 3.3-8" fill="none" stroke="{ink}" stroke-width="2" stroke-linecap="round"/>
  `,
  paint: `
    <path d="M30 18c-10 0-17 6.7-17 14.9 0 7.6 5.6 13.1 13.1 13.1 2.8 0 4.5-1.6 4.5-3.8 0-1.6-.7-2.4-.7-3.5 0-1.6 1.3-2.9 3-2.9h2.9c8 0 14.2-5.5 14.2-12.3C50 22.2 41.3 18 30 18z" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
    <circle cx="24" cy="28" r="2.7" fill="{accent}"/><circle cx="19" cy="35" r="2.7" fill="{accent3}"/><circle cx="28" cy="38" r="2.7" fill="#60a5fa"/><circle cx="35" cy="29" r="2.7" fill="#22c55e"/>
    <path d="M39 19l8 8" stroke="{ink}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M44 24l6-6 3 3-6 6z" fill="{accent}" stroke="{ink}" stroke-width="1.8"/>
  `,
  clock: `
    <circle cx="32" cy="34" r="15" fill="{accent2}" stroke="{ink}" stroke-width="2.2"/>
    <path d="M32 25v10l7 4" fill="none" stroke="{accent}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M23 18l-4 5M41 18l4 5" stroke="{accent3}" stroke-width="2.6" stroke-linecap="round"/>
  `,
  'control-panel': `
    <rect x="17" y="20" width="30" height="26" rx="6" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
    <path d="M24 27h16M24 33h16M24 39h16" stroke="{ink}" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="29" cy="27" r="3" fill="{accent3}" stroke="{ink}" stroke-width="1.5"/>
    <circle cx="36" cy="33" r="3" fill="{accent}" stroke="{ink}" stroke-width="1.5"/>
    <circle cx="25" cy="39" r="3" fill="#22c55e" stroke="{ink}" stroke-width="1.5"/>
  `,
  'network-tools': `
    <circle cx="32" cy="22" r="5" fill="{accent3}" stroke="{ink}" stroke-width="1.8"/>
    <circle cx="22" cy="41" r="5" fill="{accent2}" stroke="{ink}" stroke-width="1.8"/>
    <circle cx="42" cy="41" r="5" fill="{accent}" stroke="{ink}" stroke-width="1.8"/>
    <path d="M32 27v8M28 30l-4 7M36 30l4 7" fill="none" stroke="{ink}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M18 18c4-4 9-6 14-6 5 0 10 2 14 6" fill="none" stroke="{accent}" stroke-width="2.2" stroke-linecap="round"/>
  `,
  settings: `
    <path d="M32 18l4 3 5-1 2 5 4 3-2 5 2 5-4 3-2 5-5-1-4 3-4-3-5 1-2-5-4-3 2-5-2-5 4-3 2-5 5 1z" fill="{accent2}" stroke="{ink}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="32" cy="34" r="6.5" fill="{accent}" stroke="{ink}" stroke-width="2"/>
  `,
  'task-manager': `
    <rect x="18" y="19" width="28" height="28" rx="6" fill="{paper2}" stroke="{ink}" stroke-width="2"/>
    <path d="M23 41V31M31 41V25M39 41V34" stroke="{accent}" stroke-width="4" stroke-linecap="round"/>
    <path d="M22 27h6l3-4 4 6 5-3" fill="none" stroke="{accent3}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  run: `
    <circle cx="32" cy="34" r="15" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
    <path d="M26 24l14 8-14 8 3-8z" fill="{accent}" stroke="{ink}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M44 20l4-4" stroke="{accent3}" stroke-width="2.4" stroke-linecap="round"/>
  `,
  'game-tetris': `
    <rect x="17" y="20" width="10" height="10" rx="2.2" fill="{accent}" stroke="{ink}" stroke-width="1.6"/>
    <rect x="27" y="20" width="10" height="10" rx="2.2" fill="{accent2}" stroke="{ink}" stroke-width="1.6"/>
    <rect x="37" y="20" width="10" height="10" rx="2.2" fill="{accent3}" stroke="{ink}" stroke-width="1.6"/>
    <rect x="27" y="30" width="10" height="10" rx="2.2" fill="{accent4}" stroke="{ink}" stroke-width="1.6"/>
    <rect x="17" y="40" width="20" height="10" rx="2.2" fill="#60a5fa" stroke="{ink}" stroke-width="1.6"/>
  `,
  'game-snake': `
    <path d="M19 39c0-7 5-11 11-11 4.5 0 8 2.1 8 6 0 2.9-2.2 5-5.7 5h-5.8c-1.8 0-3.2 1-3.2 2.8 0 2.3 2.4 3.7 5.1 3.7 4.1 0 7.7-1.8 11.6-5.6" fill="none" stroke="{accent}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="42.5" cy="25" r="4" fill="{accent2}" stroke="{ink}" stroke-width="1.8"/>
    <circle cx="40.8" cy="24" r="0.8" fill="{ink}"/><circle cx="43.8" cy="24" r="0.8" fill="{ink}"/>
    <circle cx="18" cy="24" r="3.2" fill="{accent3}" stroke="{ink}" stroke-width="1.6"/>
  `,
  'game-link': `
    <rect x="18" y="22" width="12" height="12" rx="3" fill="{accent2}" stroke="{ink}" stroke-width="1.8"/>
    <rect x="34" y="34" width="12" height="12" rx="3" fill="{accent}" stroke="{ink}" stroke-width="1.8"/>
    <path d="M30 28h5v12h-5" fill="none" stroke="{accent3}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="24" cy="28" r="2" fill="{paper2}"/><circle cx="40" cy="40" r="2" fill="{paper2}"/>
  `,
  'game-platformer': `
    <path d="M16 45h14M34 38h14" stroke="{accent}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="31" cy="25" r="4" fill="{accent3}" stroke="{ink}" stroke-width="1.6"/>
    <path d="M28 31l7 4 5-7M25 42l5-7 6 4M28 35l-6 6" fill="none" stroke="{ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  'game-landlord': `
    <rect x="16" y="20" width="12" height="18" rx="3" fill="{paper2}" stroke="{ink}" stroke-width="1.8"/>
    <rect x="26" y="24" width="12" height="18" rx="3" fill="{paper2}" stroke="{ink}" stroke-width="1.8"/>
    <rect x="36" y="20" width="12" height="18" rx="3" fill="{paper2}" stroke="{ink}" stroke-width="1.8"/>
    <path d="M32 45l3-5 3 5 5 1-3.5 4.5.8 5.5L32 53.6l-8.3 2.9.8-5.5L21 46z" fill="{accent3}" stroke="{ink}" stroke-width="1.6" stroke-linejoin="round"/>
  `,
  'game-runner': `
    <path d="M18 43c5-6 9-10 15-10 3.7 0 6.2 1.6 10 5" fill="none" stroke="{accent}" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M21 44h20l6-5" fill="none" stroke="{ink}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M28 23c2-4 4.5-6 8-7" fill="none" stroke="{accent3}" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="23" cy="47" r="2.2" fill="{accent2}"/><circle cx="42" cy="47" r="2.2" fill="{accent2}"/>
  `,
  'game-tank': `
    <rect x="17" y="28" width="28" height="14" rx="5" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
    <rect x="24" y="23" width="14" height="8" rx="3" fill="{accent}" stroke="{ink}" stroke-width="1.8"/>
    <path d="M38 27h12" stroke="{ink}" stroke-width="3" stroke-linecap="round"/>
    <path d="M22 44h4M30 44h4M38 44h4" stroke="{ink}" stroke-width="3" stroke-linecap="round"/>
  `,
  'game-plane': `
    <path d="M32 19l5 13 12 3-12 3-5 11-5-11-12-3 12-3z" fill="{accent2}" stroke="{ink}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M32 19v30" stroke="{accent}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M46 22l4-4" stroke="{accent3}" stroke-width="2.2" stroke-linecap="round"/>
  `,
  'game-gomoku': `
    <path d="M18 21h28M18 28h28M18 35h28M18 42h28M21 18v28M28 18v28M35 18v28M42 18v28" stroke="{ink}" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="28" cy="28" r="4.2" fill="{accent3}" stroke="{ink}" stroke-width="1.4"/>
    <circle cx="38" cy="38" r="4.2" fill="{paper2}" stroke="{ink}" stroke-width="1.4"/>
  `,
  'game-minesweeper': `
    <circle cx="27" cy="36" r="7" fill="{accent}" stroke="{ink}" stroke-width="2"/>
    <path d="M27 24v6M27 42v6M15 36h6M33 36h6M19 28l4 4M35 28l-4 4M19 44l4-4M35 44l-4-4" fill="none" stroke="{ink}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M40 21v26" stroke="{accent3}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M40 22l9 5-9 5z" fill="{accent3}" stroke="{ink}" stroke-width="1.5" stroke-linejoin="round"/>
  `,
  'game-2048': `
    <rect x="18" y="20" width="12" height="12" rx="3" fill="{accent}" stroke="{ink}" stroke-width="1.5"/>
    <rect x="34" y="20" width="12" height="12" rx="3" fill="{accent4}" stroke="{ink}" stroke-width="1.5"/>
    <rect x="18" y="36" width="12" height="12" rx="3" fill="{accent2}" stroke="{ink}" stroke-width="1.5"/>
    <rect x="34" y="36" width="12" height="12" rx="3" fill="{accent3}" stroke="{ink}" stroke-width="1.5"/>
    <text x="24" y="29" text-anchor="middle" font-size="7" font-weight="700" fill="{paper2}" font-family="Segoe UI, Arial">2</text>
    <text x="40" y="29" text-anchor="middle" font-size="7" font-weight="700" fill="{paper2}" font-family="Segoe UI, Arial">0</text>
    <text x="24" y="45" text-anchor="middle" font-size="7" font-weight="700" fill="{paper2}" font-family="Segoe UI, Arial">4</text>
    <text x="40" y="45" text-anchor="middle" font-size="7" font-weight="700" fill="{paper2}" font-family="Segoe UI, Arial">8</text>
  `,
  'game-othello': `
    <path d="M18 20h28v24H18z" fill="{accent2}" stroke="{ink}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M23 20v24M32 20v24M41 20v24M18 26h28M18 38h28" fill="none" stroke="rgba(91,70,53,0.5)" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M18 32h28" fill="none" stroke="{ink}" stroke-width="2.1" stroke-linecap="round" stroke-dasharray="4 3"/>
    <circle cx="26" cy="27.5" r="6.5" fill="{accent}" stroke="{ink}" stroke-width="1.8"/>
    <circle cx="38" cy="37.5" r="6.5" fill="{accent3}" stroke="{ink}" stroke-width="1.8"/>
    <circle cx="26" cy="27.5" r="4.8" fill="rgba(255,255,255,0.18)"/>
    <circle cx="38" cy="37.5" r="4.8" fill="rgba(255,255,255,0.08)"/>
    <text x="26" y="30.1" text-anchor="middle" font-size="6.2" font-weight="800" fill="{paper2}" font-family="'Microsoft YaHei UI','Noto Sans SC','PingFang SC','Segoe UI',sans-serif">帅</text>
    <text x="38" y="40.1" text-anchor="middle" font-size="6.2" font-weight="800" fill="{paper2}" font-family="'Microsoft YaHei UI','Noto Sans SC','PingFang SC','Segoe UI',sans-serif">将</text>
    <path d="M29 16c3.6-2.1 7.1-2.4 11-.7" fill="none" stroke="rgba(255,255,255,0.52)" stroke-width="1.6" stroke-linecap="round"/>
  `,
  'game-sokoban': `
    <path d="M18 44h28" stroke="{accent3}" stroke-width="3" stroke-dasharray="3 4" stroke-linecap="round"/>
    <rect x="20" y="24" width="14" height="14" rx="3" fill="{accent}" stroke="{ink}" stroke-width="2"/>
    <path d="M20 31h14M27 24v14" stroke="{paper2}" stroke-width="2"/>
    <circle cx="42" cy="42" r="5" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
  `,
  'game-sudoku': `
    <path d="M30 47V37" stroke="{accent3}" stroke-width="4" stroke-linecap="round"/>
    <path d="M30 38c-3 0-5.4 1.4-8 4.7 1.8-4.4 3.8-7.2 7-8.8M31 38c3 0 5.4 1.4 8 4.7-1.8-4.4-3.8-7.2-7-8.8" fill="{accent2}" stroke="{ink}" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M21 31c0-7.2 5.9-12.8 13.1-12.8 6.5 0 11.5 4.1 11.5 9.8 0 3.8-2.3 6.8-5.7 7.7h-4.7c-1.2 0-2.2 1-2.2 2.2 0 1.2 1 2.2 2.2 2.2h2.5c0 4.7-4.3 8.1-10.2 8.1-8.5 0-16.5-6.1-16.5-17.2z" fill="{accent}" stroke="{ink}" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="42.7" cy="29.6" rx="7.8" ry="6.8" fill="{accent}" stroke="{ink}" stroke-width="2"/>
    <circle cx="47.8" cy="29.6" r="3.3" fill="{paper2}" stroke="{ink}" stroke-width="1.5"/>
    <circle cx="28.7" cy="27.4" r="2.5" fill="{paper2}" stroke="{ink}" stroke-width="1.5"/>
    <circle cx="28.9" cy="27.4" r="0.9" fill="{ink}"/>
    <path d="M24.6 23.3c2.1-1.8 4.9-2.3 7.7-1.4" fill="none" stroke="{accent3}" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="56" cy="29.4" r="3.4" fill="{accent2}" stroke="{ink}" stroke-width="1.6"/>
  `,
  'game-solitaire': `
    <rect x="18" y="19" width="13" height="20" rx="3" fill="{paper2}" stroke="{ink}" stroke-width="1.8"/>
    <rect x="27" y="24" width="13" height="20" rx="3" fill="{paper2}" stroke="{ink}" stroke-width="1.8"/>
    <rect x="36" y="19" width="13" height="20" rx="3" fill="{accent2}" stroke="{ink}" stroke-width="1.8"/>
    <path d="M42 27c2 2 3 3 3 4.7 0 1.8-1.4 3.3-3.1 3.3s-3.1-1.5-3.1-3.3c0-1.7 1-2.8 3.2-4.7z" fill="{ink}"/>
    <path d="M42 35v5" stroke="{ink}" stroke-width="1.8" stroke-linecap="round"/>
  `,
  'game-carrot-defense': `
    <path d="M30.2 24.8c-3.9-3.9-5-7.8-3.1-11.8M36.2 23.5c.2-5.2 2.6-8.8 7.1-10.8M32.4 22.4c-1.8-4.8-.9-8.7 2.4-12" fill="none" stroke="{accent3}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M31.8 22.8c8 0 13.8 5.2 13.8 12.1 0 10.2-6.4 18-13.8 18-7.4 0-13.8-7.8-13.8-18 0-6.9 5.8-12.1 13.8-12.1z" fill="{accent}" stroke="{ink}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M31.8 25.7c5.9 0 10 3.7 10 8.5 0 7.5-4.6 13.9-10 13.9-5.4 0-10-6.4-10-13.9 0-4.8 4.1-8.5 10-8.5z" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.4"/>
    <path d="M27.1 31.5c3.5-2 6.9-2.4 10.7-1.2" fill="none" stroke="rgba(255,255,255,0.78)" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M27 34.2h9.8M26 39.5h11.8M27.4 44.8h8.9" fill="none" stroke="rgba(165,73,24,0.45)" stroke-width="1.9" stroke-linecap="round"/>
    <circle cx="28" cy="36.7" r="2.1" fill="{ink}"/>
    <circle cx="36" cy="36.7" r="2.1" fill="{ink}"/>
    <circle cx="25.2" cy="40.8" r="1.9" fill="#ffd1c2"/>
    <circle cx="38.8" cy="40.8" r="1.9" fill="#ffd1c2"/>
    <path d="M28.4 43.6c2 1.6 4.8 1.6 6.8 0" fill="none" stroke="{ink}" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M44.2 28.4c2.7 1.2 4.7 3.1 5.8 5.8" fill="none" stroke="{accent3}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="47.8" cy="37.2" r="3.2" fill="{accent2}" stroke="{ink}" stroke-width="1.3"/>
    <path d="M47.8 34.8v4.8M45.4 37.2h4.8" fill="none" stroke="{accent}" stroke-width="1.5" stroke-linecap="round"/>
  `,
  screenshot: `
    <path d="M20 24h7M37 24h7M20 44h7M37 44h7" stroke="{ink}" stroke-width="3" stroke-linecap="round"/>
    <path d="M20 24v7M20 37v7M44 24v7M44 37v7" stroke="{ink}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="32" cy="34" r="7.5" fill="{accent2}" stroke="{accent}" stroke-width="2.2"/>
    <circle cx="32" cy="34" r="2.6" fill="{accent3}"/>
  `,
  'sticky-notes': `
    <path d="M18 18h28a4 4 0 0 1 4 4v20a6 6 0 0 1-6 6H18a4 4 0 0 1-4-4V24a6 6 0 0 1 6-6z" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
    <path d="M38 48l12-12v8a4 4 0 0 1-4 4z" fill="{accent3}" stroke="{ink}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M22 29h18M22 35h14" stroke="{accent}" stroke-width="2.2" stroke-linecap="round"/>
  `,
  'character-map': `
    <rect x="18" y="21" width="12" height="12" rx="3" fill="{accent2}" stroke="{ink}" stroke-width="1.6"/>
    <rect x="34" y="21" width="12" height="12" rx="3" fill="{accent3}" stroke="{ink}" stroke-width="1.6"/>
    <rect x="26" y="36" width="12" height="12" rx="3" fill="{accent}" stroke="{ink}" stroke-width="1.6"/>
    <text x="24" y="30" text-anchor="middle" font-size="7" font-weight="700" fill="{ink}" font-family="Segoe UI, Arial">A</text>
    <text x="40" y="30" text-anchor="middle" font-size="7" font-weight="700" fill="{ink}" font-family="Segoe UI, Arial">文</text>
    <text x="32" y="45" text-anchor="middle" font-size="7" font-weight="700" fill="{paper2}" font-family="Segoe UI, Arial">Ω</text>
  `,
  'on-screen-keyboard': `
    <rect x="16" y="24" width="32" height="20" rx="5" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
    <g fill="{paper2}" stroke="{ink}" stroke-width="1.2">
      <rect x="21" y="29" width="5" height="4" rx="1.1"/><rect x="28" y="29" width="5" height="4" rx="1.1"/><rect x="35" y="29" width="5" height="4" rx="1.1"/>
      <rect x="21" y="35" width="19" height="4" rx="1.1" fill="{accent}"/>
    </g>
  `,
  about: `
    <circle cx="32" cy="34" r="15" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
    <circle cx="32" cy="27" r="2.3" fill="{accent3}"/>
    <path d="M32 32v10" stroke="{accent}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M44 21l3-3" stroke="{accent3}" stroke-width="2.2" stroke-linecap="round"/>
  `,
  default: `
    <circle cx="32" cy="34" r="13" fill="{accent2}" stroke="{ink}" stroke-width="2"/>
    <path d="M25 40l7-14 7 14" fill="none" stroke="{accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M29 34h6" stroke="{accent3}" stroke-width="2.2" stroke-linecap="round"/>
  `
});

function applyHandDrawnIconTemplate(template, palette) {
  return String(template || '').replace(/\{([a-zA-Z0-9]+)\}/g, (_match, key) => {
    return Object.prototype.hasOwnProperty.call(palette, key) ? palette[key] : '';
  });
}

function createHandDrawnAppIcon(appId) {
  const palette = Object.assign({
    paper: '#fff8ef',
    paper2: '#fffdf9',
    ink: '#5b4635',
    shadow: 'rgba(37, 24, 13, 0.16)',
    accent: '#3b82f6',
    accent2: '#93c5fd',
    accent3: '#f59e0b',
    accent4: '#ec4899',
  }, HAND_DRAWN_APP_ICON_PALETTES[appId] || null);
  const motifTemplate = HAND_DRAWN_APP_ICON_ART[appId] || HAND_DRAWN_APP_ICON_ART.default;
  const motif = applyHandDrawnIconTemplate(motifTemplate, palette);
  const safeId = String(appId || 'app').replace(/[^a-zA-Z0-9_-]+/g, '-');
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="star-app-plate-${safeId}" x1="10" y1="10" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${palette.paper2}"/>
          <stop offset="100%" stop-color="${palette.paper}"/>
        </linearGradient>
        <linearGradient id="star-app-halo-${safeId}" x1="14" y1="14" x2="50" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${palette.accent2}" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0.14"/>
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="54" rx="18" ry="4.6" fill="${palette.shadow}"/>
      <rect x="8" y="8" width="48" height="48" rx="15" fill="url(#star-app-plate-${safeId})" stroke="${palette.ink}" stroke-opacity="0.16" stroke-width="1.6"/>
      <path d="M14 18c11-8 24-8 36-2v13c-9 2-18 0-36-11z" fill="url(#star-app-halo-${safeId})"/>
      <path d="M17 16.5c10-4.5 19-5.1 30-1.6" fill="none" stroke="rgba(255,255,255,0.72)" stroke-width="1.8" stroke-linecap="round"/>
      ${motif}
    </svg>`;
}

const StarAppsRegistry = {
  apps: [
    { id: 'file-manager', titleKey: 'fileManager', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>', pinned: true },
    { id: 'browser', titleKey: 'browser', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>', pinned: true },
    { id: 'music-player', titleKey: 'musicPlayer', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>', pinned: true },
    { id: 'video-player', titleKey: 'videoPlayer', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h11a2 2 0 0 1 2 2v2.5l4-2.5v10l-4-2.5V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm5 3v8l6-4-6-4z"/></svg>', pinned: true },
    { id: 'wps-editor', titleKey: 'wpsEditor', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 7V3.5L19.5 9H14z"/><path d="M8 12h8v1.5H8zm0 3h8v1.5H8zm0 3h5v1.5H8z"/></svg>', pinned: true },
    { id: 'image-viewer', titleKey: 'imageViewer', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 14H5l3.5-4.5 2.5 3.01L14.5 11l4.5 6zM8.5 9A1.5 1.5 0 1 0 8.5 6a1.5 1.5 0 0 0 0 3z"/></svg>', pinned: true },
    { id: 'star-unzip', titleKey: 'starUnzip', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>', pinned: true },
    /* QQ app removed
    { id: 'qq', titleKey: 'qq', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.69 2.05c-2.17 0-4.1.94-5.4 2.44-.12.14-.12.34 0 .48.82.95 1.78 1.7 2.86 2.27.12.07.27.04.37-.08.98-1.22 2.31-1.98 3.86-1.98 1.55 0 2.88.76 3.86 1.98.1.12.25.15.37.08 1.08-.57 2.04-1.32 2.86-2.27.12-.14.12-.34 0-.48C12.79 2.99 10.86 2.05 8.69 2.05zm-5.4 7.12c-.12.14-.12.34 0 .48.82.95 1.78 1.7 2.86 2.27.12.07.27.04.37-.08.98-1.22 2.31-1.98 3.86-1.98 1.55 0 2.88.76 3.86 1.98.1.12.25.15.37.08 1.08-.57 2.04-1.32 2.86-2.27.12-.14.12-.34 0-.48-.82-.95-1.78-1.7-2.86-2.27-.12-.07-.27-.04-.37.08-.98 1.22-2.31 1.98-3.86 1.98-1.55 0-2.88-.76-3.86-1.98-.1-.12-.25-.15-.37-.08-1.08.57-2.04 1.32-2.86 2.27zm15.42 0c-.12-.14-.12-.34 0-.48.82-.95 1.78-1.7 2.86-2.27.12-.07.27-.04.37.08.98 1.22 2.31 1.98 3.86 1.98 1.55 0 2.88-.76 3.86-1.98.1-.12.25-.15.37-.08 1.08.57 2.04 1.32 2.86 2.27.12.14.12.34 0 .48-.82.95-1.78 1.7-2.86 2.27-.12.07-.27.04-.37-.08-.98-1.22-2.31-1.98-3.86-1.98-1.55 0-2.88.76-3.86 1.98-.1.12-.25.15-.37.08-1.08-.57-2.04-1.32-2.86-2.27zM12 10.5c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>', pinned: true },
    */
    { id: 'terminal', titleKey: 'terminal', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8h16v10zm-2-1h-2v-2h2v2zm-4 0H9v-2h5v2zm4-4h-2V9h2v4zm-4 0H9V9h5v4z"/></svg>', pinned: true },
    { id: 'redis-cli', titleKey: 'redisCli', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c4.97 0 9 1.79 9 4s-4.03 4-9 4-9-1.79-9-4 4.03-4 9-4zm0 8c4.97 0 9 1.79 9 4s-4.03 4-9 4-9-1.79-9-4 4.03-4 9-4zm0 8c4.97 0 9 1.79 9 4s-4.03 4-9 4-9-1.79-9-4 4.03-4 9-4z"/></svg>', pinned: false },
    { id: 'linux-shell', titleKey: 'linuxShell', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm2.5 5.5 2.5 2.5-2.5 2.5L5 13.5 6.5 12 5 10.5 6.5 9zm4.5 5.5h7v2h-7v-2z"/></svg>', pinned: false },
    { id: 'docker-shell', titleKey: 'dockerShell', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 12h3v3H3v-3zm4 0h3v3H7v-3zm4 0h3v3h-3v-3zm4 0h3v3h-3v-3zM7 8h3v3H7V8zm4 0h3v3h-3V8zm4 0h3v3h-3V8zM5 18h14c1.66 0 3-1.34 3-3h-2c0 .55-.45 1-1 1H4c-1.1 0-2-.9-2-2H0c0 2.21 1.79 4 4 4h1z"/></svg>', pinned: false },
    { id: 'calculator', titleKey: 'calculator', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM13 17H9v-2h4v2zm4-4H9v-2h8v2zm0-4H9V7h8v2z"/></svg>', pinned: false },
    { id: 'text-editor', titleKey: 'textEditor', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM3 13v2h6v-2H3zm14-6V7h2v2h-2zm-2 6h2v2h-2v-2zM5 7v2h2V7H5zm2 10v-2h2v2H7zm10-6h2v2h-2v-2zm2 6v-2h2v2h-2z"/></svg>', pinned: false },
    { id: 'markdown-reader', titleKey: 'markdownReader', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 16v-4.5l2.5 3 3.5-4.5 4.5 6H6zm14 0h-4l-3-4-2 2.67L10.5 10 8 14h12v2z"/></svg>', pinned: false },
    { id: 'java-ide', titleKey: 'javaIDE', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14a2 2 0 0 1 2 2v10.5a2 2 0 0 1-.8 1.6l-7 5a2 2 0 0 1-2.4 0l-7-5A2 2 0 0 1 3 15.5V5a2 2 0 0 1 2-2zm0 2v10.5l7 5 7-5V5H5z"/><path d="M9.5 8.5c0-1.4.9-2.3 2.6-2.3 1 0 1.7.3 2.3.8l-.7 1c-.4-.3-.9-.6-1.6-.6-.8 0-1.3.4-1.3 1.1 0 1.9 3.7 1.2 3.7 3.8 0 1.4-1 2.4-2.8 2.4-1.1 0-2-.3-2.7-.9l.7-1.1c.5.4 1.2.7 2 .7.9 0 1.4-.4 1.4-1.1 0-2-3.6-1.3-3.6-3.8z"/></svg>', pinned: false },
    { id: 'paint', titleKey: 'paint', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 4V3c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h1v5c0 .55.45 1 1 1h2v-2c0-.55.45-1 1-1s1 .45 1 1v2h2c.55 0 1-.45 1-1V8h1c.55 0 1-.45 1-1V4h-2zm-2 2v2h-2V6H8v2H6V6H4V4h12v2z"/></svg>', pinned: false },
    { id: 'clock', titleKey: 'clock', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>', pinned: false },
    { id: 'control-panel', titleKey: 'controlPanel', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>', pinned: true },
    { id: 'network-tools', titleKey: 'networkTools', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.7 2.06 7.3 2.06 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>', pinned: false },
    { id: 'settings', titleKey: 'settings', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>', pinned: false },
    { id: 'task-manager', titleKey: 'taskManager', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/></svg>', pinned: true },
    { id: 'run', titleKey: 'run', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 5v2h2v10H9v2h6v-2h-2V7h2V5H9zm3-4c4.42 0 8 3.58 8 8s-3.58 8-8 8-8-3.58-8-8 3.58-8 8-8z"/></svg>', pinned: true },
    { id: 'game-tetris', titleKey: 'gameTetris', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z"/></svg>', pinned: false },
    { id: 'game-snake', titleKey: 'gameSnake', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59 7.59L19 18l-9-9z"/></svg>', pinned: false },
    { id: 'game-link', titleKey: 'gameLink', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17l-5-5 1.41-1.41L12 16.17l4.59-4.58L18 13l-7 6z"/></svg>', pinned: false },
    { id: 'game-platformer', titleKey: 'gamePlatformer', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2v8h2V2h-2zM9 8v4h2V8H9zm8 0v4h2V8h-2zM5 14v6h2v-6H5zm14 0v6h2v-6h-2zm-8 2v4h2v-4h-2z"/></svg>', pinned: false },
    { id: 'game-landlord', titleKey: 'gameLandlord', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="6" height="8" rx="1"/><rect x="9" y="4" width="6" height="8" rx="1"/><rect x="16" y="4" width="6" height="8" rx="1"/><path d="M4 14h2v4H4zM11 14h2v4h-2zM18 14h2v4h-2z"/></svg>', pinned: false },
    { id: 'game-runner', titleKey: 'gameRunner', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9 8c.55 0 1 .45 1 1v4.5l-2.08 2.08L7 14l3.5-3.5 2 2 3-4-3-3z"/></svg>', pinned: false },
    { id: 'game-tank', titleKey: 'gameTank', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 12v-2h-2V8h2V6h2v2h2v2h-2v2h2v2h-2zm-4-4H4v12h16V8h-4V6h-2v2zm-2 4h4v4h-4v-4z"/></svg>', pinned: false },
    { id: 'game-plane', titleKey: 'gamePlane', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>', pinned: false },
    { id: 'game-gomoku', titleKey: 'gameGomoku', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M5 5v14M9.5 5v14M14.5 5v14M19 5v14M5 5h14M5 9.5h14M5 14.5h14M5 19h14"/><circle cx="9.5" cy="9.5" r="1.9" fill="currentColor" stroke="none"/><circle cx="14.5" cy="14.5" r="1.9" fill="#fff" stroke="currentColor"/></svg>', pinned: false },
    { id: 'game-minesweeper', titleKey: 'gameMinesweeper', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="9" cy="14" r="3" fill="currentColor" stroke="none"/><path d="M9 6v3M9 19v3M1 14h3M14 14h3M3.5 8.5l2.1 2.1M12.4 17.4l2.1 2.1M14.5 8.5l-2.1 2.1M5.6 17.4l-2.1 2.1"/><path d="M16 3v18"/><path d="M16 4l5 3-5 3z" fill="currentColor" stroke="none"/></svg>', pinned: false },
    { id: 'game-2048', titleKey: 'game2048', icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="2" fill="#f59e0b"/><rect x="13" y="3" width="8" height="8" rx="2" fill="#f97316"/><rect x="3" y="13" width="8" height="8" rx="2" fill="#fb7185"/><rect x="13" y="13" width="8" height="8" rx="2" fill="#38bdf8"/><text x="7" y="9" text-anchor="middle" font-size="5" font-family="Arial" fill="#fff">2</text><text x="17" y="9" text-anchor="middle" font-size="5" font-family="Arial" fill="#fff">0</text><text x="7" y="19" text-anchor="middle" font-size="5" font-family="Arial" fill="#fff">4</text><text x="17" y="19" text-anchor="middle" font-size="5" font-family="Arial" fill="#fff">8</text></svg>', pinned: false },
    { id: 'game-othello', titleKey: 'gameOthello', icon: '<svg viewBox="0 0 24 24" fill="none"><circle cx="8" cy="8" r="4.3" fill="#f4e4bf" stroke="#c2410c" stroke-width="1.2"/><circle cx="16" cy="16" r="4.3" fill="#f4e4bf" stroke="#111827" stroke-width="1.2"/><path d="M8 5.9v4.2M6.1 8h3.8" stroke="#c2410c" stroke-width="1.2" stroke-linecap="round"/><path d="M16 13.9v4.2M13.9 16h4.2" stroke="#111827" stroke-width="1.2" stroke-linecap="round"/><path d="M5 19.5h14" stroke="#7c2d12" stroke-width="1.1" stroke-linecap="round"/></svg>', pinned: false },
    { id: 'game-sokoban', titleKey: 'gameSokoban', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><rect x="7" y="7" width="6" height="6" fill="#fbbf24" stroke="none"/><path d="M7 10h6M10 7v6"/><circle cx="17" cy="17" r="2.5"/><path d="M14 17h-2"/></svg>', pinned: false },
    { id: 'game-sudoku', titleKey: 'gameSudoku', icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="2.5" y="4" width="19" height="16.5" rx="4" fill="#6bbf59"/><rect x="4" y="5.5" width="16" height="13.5" rx="3" fill="#84cc16"/><circle cx="7" cy="10" r="2" fill="#facc15"/><path d="M7 12.6v2.6" stroke="#166534" stroke-width="1.2" stroke-linecap="round"/><circle cx="12.5" cy="12.5" r="2.7" fill="#22c55e"/><path d="M12.5 9.2c1.2 0 2.4.9 2.4 2.1 0 1.3-1.2 2.2-2.4 2.2-1.4 0-2.5-.9-2.5-2.2 0-1.2 1.1-2.1 2.5-2.1z" fill="#14532d"/><rect x="16.2" y="9.2" width="2.8" height="6.6" rx="1.2" fill="#64748b"/><circle cx="17.6" cy="8.1" r="1.2" fill="#cbd5e1"/><circle cx="18.7" cy="8.7" r="0.45" fill="#ef4444"/></svg>', pinned: false },
    { id: 'game-solitaire', titleKey: 'gameSolitaire', icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="8.5" height="13" rx="2" fill="#fff"/><rect x="8.5" y="7" width="8.5" height="13" rx="2" fill="#f8fafc"/><rect x="14" y="4" width="7" height="13" rx="2" fill="#fff"/><path d="M6.2 7.6h2.1M6.2 10.4h2.1M6.2 13.2h2.1" stroke="#111827" stroke-width="1.2" stroke-linecap="round"/><path d="M17.5 8.2c1 1 1.6 1.7 1.6 2.6 0 1-.8 1.9-1.9 1.9s-1.9-.9-1.9-1.9c0-.9.6-1.6 2.2-2.6z" fill="#111827"/><path d="M17.4 13.2v2.5" stroke="#111827" stroke-width="1.2" stroke-linecap="round"/></svg>', pinned: false },
    { id: 'game-carrot-defense', titleKey: 'gameCarrotDefense', icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="2.5" y="3" width="19" height="18" rx="5" fill="#183d2d"/><path d="M5 17.6c0-4 3.7-7.1 7.8-7.1 3.9 0 6.8 2.6 6.8 5.9 0 2.6-2.1 4.6-5.3 4.6H9.4C6.7 21 5 19.8 5 17.6z" fill="#f97316"/><path d="M11.7 11.5c-.6-1.2-.4-2.5.8-3.7 1 .3 1.8.9 2.2 1.8" stroke="#fdba74" stroke-width="1.2" stroke-linecap="round"/><path d="M13.2 8.1c0-1 .5-1.9 1.5-2.8 1 .5 1.7 1.2 2 2.2" stroke="#4ade80" stroke-width="1.4" stroke-linecap="round"/><path d="M10.7 8.6c-.7-.9-1-1.9-.7-3 .9.1 1.8.5 2.4 1.3" stroke="#22c55e" stroke-width="1.4" stroke-linecap="round"/><circle cx="9.8" cy="15.2" r="2.2" fill="#f8fafc"/><circle cx="15.8" cy="14.4" r="2" fill="#38bdf8"/><path d="M9.8 13.8v2.8M8.4 15.2h2.8" stroke="#fb7185" stroke-width="1.1" stroke-linecap="round"/><path d="M15.8 12.8v3.2M14.2 14.4h3.2" stroke="#e0f2fe" stroke-width="1.1" stroke-linecap="round"/></svg>', pinned: false },
    { id: 'screenshot', titleKey: 'screenshot', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z"/><path d="M12 8.5c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5z"/></svg>', pinned: false },
    { id: 'sticky-notes', titleKey: 'stickyNotes', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>', pinned: false },
    { id: 'character-map', titleKey: 'characterMap', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5v14h8v-2H5V5h14v6h2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2zm16 6h-2v5h-2v-5h-2v-2h6v2zm-4 8v-2h4v2h-4z"/></svg>', pinned: false },
    { id: 'on-screen-keyboard', titleKey: 'onScreenKeyboard', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-3h-2v-2h2v2zm0-3h-2V8h2v2z"/></svg>', pinned: false },
    { id: 'about', titleKey: 'about', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>', pinned: false },
  ],

  getApp(appId) { return this.apps.find(a => a.id === appId) || null; },
  getDefaultPinnedIds() { return this.apps.filter(a => a.pinned).map(a => a.id); },
  getPinnedIds() {
    if (window.StarStorage && window.StarStorage.getPinnedAppIds) {
      return window.StarStorage.getPinnedAppIds(this.getDefaultPinnedIds());
    }
    return this.getDefaultPinnedIds();
  },
  isPinned(appId) { return this.getPinnedIds().includes(appId); },
  setPinned(appId, pinned) {
    if (!appId) return;
    const current = this.getPinnedIds().filter(id => this.getApp(id));
    const next = pinned ? [...current.filter(id => id !== appId), appId] : current.filter(id => id !== appId);
    if (window.StarStorage && window.StarStorage.setPinnedAppIds) {
      window.StarStorage.setPinnedAppIds(next);
    }
  },
  togglePinned(appId) {
    const next = !this.isPinned(appId);
    this.setPinned(appId, next);
    return next;
  },
  getPinned() {
    const ids = this.getPinnedIds();
    const map = new Map(this.apps.map(app => [app.id, app]));
    return ids.map(id => map.get(id)).filter(Boolean);
  },
  recordAppLaunch(appId) {
    if (window.StarStorage && window.StarStorage.recordRecentApp) {
      window.StarStorage.recordRecentApp(appId);
    }
  },
  recordFileOpen(filePath) {
    if (window.StarStorage && window.StarStorage.recordRecentFile) {
      window.StarStorage.recordRecentFile(filePath);
    }
  },
  getRecentApps(limit = 6) {
    const ids = (window.StarStorage && window.StarStorage.getRecentApps) ? window.StarStorage.getRecentApps(limit * 2) : [];
    return ids.map(id => this.getApp(id)).filter(Boolean).slice(0, limit);
  },
  getRecentFiles(limit = 6) {
    return (window.StarStorage && window.StarStorage.getRecentFiles) ? window.StarStorage.getRecentFiles(limit) : [];
  },
  getAll() { return this.apps; },

  open(appId) {
    if (appId === 'run') {
      this.recordAppLaunch(appId);
      StarAppsRegistry.openRunDialog();
      return;
    }
    const app = this.apps.find(a => a.id === appId);
    if (!app) {
      // 某些占位按钮（例如未来的应用）目前还没有实现，给出明确提示而不是“没反应”
      alert(t('notImplementedYet'));
      return;
    }
    this.recordAppLaunch(appId);
    const title = t(app.titleKey);
    const icon = app.icon;
    // 单实例应用：如果已打开则直接激活，不重复创建窗口
    try {
      const singletonAppIds = new Set(['settings', 'wps-editor', 'text-editor', 'markdown-reader', 'browser', 'terminal', 'redis-cli', 'linux-shell', 'docker-shell', 'star-unzip', 'image-viewer', 'music-player', 'video-player']);
      if (singletonAppIds.has(appId) && window.StarWindowManager && Array.isArray(StarWindowManager.windows)) {
        const existing = StarWindowManager.windows.find(w => w && w.appId === appId && !(w.el && w.el.dataset && w.el.dataset.browserIncognito === '1'));
        if (existing && existing.id) {
          StarWindowManager.restore(existing.id);
          StarWindowManager.focus(existing.id);
          if (appId === 'wps-editor' && window.__starWpsInitialPath) {
            const p = window.__starWpsInitialPath;
            window.__starWpsInitialPath = null;
            window.dispatchEvent(new CustomEvent('star:wps-open', { detail: { filePath: p } }));
          }
          if (appId === 'star-unzip' && window.__starUnzipInitialPath) {
            const p = window.__starUnzipInitialPath;
            window.__starUnzipInitialPath = null;
            window.dispatchEvent(new CustomEvent('star:unzip-open', { detail: { filePath: p } }));
          }
          if (appId === 'image-viewer' && window.__starImageInitialPath) {
            const p = window.__starImageInitialPath;
            window.__starImageInitialPath = null;
            window.dispatchEvent(new CustomEvent('star:image-open', { detail: { filePath: p } }));
          }
          if (appId === 'music-player' && window.__starMusicInitialPath) {
            const p = window.__starMusicInitialPath;
            window.__starMusicInitialPath = null;
            window.dispatchEvent(new CustomEvent('star:music-open', { detail: { filePath: p } }));
          }
          if (appId === 'video-player' && window.__starVideoInitialPath) {
            const p = window.__starVideoInitialPath;
            window.__starVideoInitialPath = null;
            window.dispatchEvent(new CustomEvent('star:video-open', { detail: { filePath: p } }));
          }
          if (appId === 'browser' && window.__starBrowserInitialUrl) {
            const u = window.__starBrowserInitialUrl;
            window.__starBrowserInitialUrl = null;
            window.dispatchEvent(new CustomEvent('star:browser-open', { detail: { url: u } }));
          }
          if (appId === 'browser') {
            if (!existing.maximized) {
              StarWindowManager.maximize(existing.id);
            }
            window.dispatchEvent(new CustomEvent('star:browser-reflow'));
          }
          if (appId === 'terminal' && window.__starTerminalInitial) {
            const init = window.__starTerminalInitial;
            window.__starTerminalInitial = null;
            window.dispatchEvent(new CustomEvent('star:terminal-open', { detail: init } ));
          }
          if (appId === 'markdown-reader' && window.__starMarkdownInitialPath) {
            const p = window.__starMarkdownInitialPath;
            window.__starMarkdownInitialPath = null;
            window.dispatchEvent(new CustomEvent('star:markdown-open', { detail: { filePath: p } }));
          }
          if (appId === 'text-editor' && window.__starNotepadInitialPath) {
            const p = window.__starNotepadInitialPath;
            window.__starNotepadInitialPath = null;
            window.dispatchEvent(new CustomEvent('star:text-editor-open', { detail: { filePath: p } }));
          }
          return;
        }
      }
    } catch (_) {}
    if (appId === 'file-manager') {
      StarWindowManager.create({ appId, title, icon, width: 900, height: 600, content: StarAppsRegistry.getFileManagerContent(), contentEl: true });
    } else if (appId === 'music-player') {
      StarWindowManager.create({ appId, title, icon, width: 720, height: 520, content: StarAppsRegistry.getMusicPlayerContent(), contentEl: true });
    } else if (appId === 'video-player') {
      StarWindowManager.create({ appId, title, icon, width: 960, height: 600, content: StarAppsRegistry.getVideoPlayerContent(), contentEl: true });
    } else if (appId === 'wps-editor') {
      StarWindowManager.create({ appId, title, icon, width: 900, height: 640, content: StarAppsRegistry.getWpsEditorContent(), contentEl: true });
    } else if (appId === 'image-viewer') {
      StarWindowManager.create({ appId, title, icon, width: 900, height: 640, content: StarAppsRegistry.getImageViewerContent(), contentEl: true });
    } else if (appId === 'star-unzip') {
      StarWindowManager.create({ appId, title, icon, width: 820, height: 560, content: StarAppsRegistry.getStarUnzipContent(), contentEl: true });
    } else if (appId === 'browser') {
      const wid = StarWindowManager.create({ appId, title, icon, width: 1000, height: 700, content: StarAppsRegistry.getBrowserContent(false), contentEl: true });
      if (wid) StarWindowManager.maximize(wid);
    } else if (appId === 'terminal') {
      StarWindowManager.create({ appId, title, icon, width: 900, height: 550, content: StarAppsRegistry.getTerminalContent(), contentEl: true });
    } else if (appId === 'redis-cli') {
      StarWindowManager.create({ appId, title, icon, width: 860, height: 560, content: StarAppsRegistry.getRedisCliContent(), contentEl: true });
    } else if (appId === 'linux-shell') {
      StarWindowManager.create({ appId, title, icon, width: 860, height: 560, content: StarAppsRegistry.getLinuxShellContent(), contentEl: true });
    } else if (appId === 'docker-shell') {
      StarWindowManager.create({ appId, title, icon, width: 860, height: 560, content: StarAppsRegistry.getDockerShellContent(), contentEl: true });
    } else if (appId === 'calculator') {
      StarWindowManager.create({ appId, title, icon, width: 320, height: 470, content: StarAppsRegistry.getCalculatorContent(), contentEl: true });
    } else if (appId === 'text-editor') {
      StarWindowManager.create({ appId, title, icon, width: 700, height: 500, content: StarAppsRegistry.getTextEditorContent(), contentEl: true });
    } else if (appId === 'markdown-reader') {
      StarWindowManager.create({ appId, title, icon, width: 800, height: 560, content: StarAppsRegistry.getMarkdownReaderContent(), contentEl: true });
    } else if (appId === 'java-ide') {
      StarWindowManager.create({ appId, title, icon, width: 1100, height: 720, content: StarAppsRegistry.getJavaIDEContent(), contentEl: true });
    } else if (appId === 'settings') {
      StarWindowManager.create({ appId, title, icon, width: 600, height: 520, content: StarAppsRegistry.getSettingsContent(), contentEl: true });
    } else if (appId === 'task-manager') {
      StarWindowManager.create({ appId, title, icon, width: 1120, height: 660, content: StarAppsRegistry.getTaskManagerContent(), contentEl: true });
    } else if (appId === 'paint') {
      StarWindowManager.create({ appId, title, icon, width: 800, height: 600, content: StarAppsRegistry.getPaintContent(), contentEl: true });
    } else if (appId === 'clock') {
      StarWindowManager.create({ appId, title, icon, width: 360, height: 380, content: StarAppsRegistry.getClockContent(), contentEl: true });
    } else if (appId === 'control-panel') {
      StarWindowManager.create({ appId, title, icon, width: 520, height: 480, content: StarAppsRegistry.getControlPanelContent(), contentEl: true });
    } else if (appId === 'network-tools') {
      StarWindowManager.create({ appId, title, icon, width: 560, height: 420, content: StarAppsRegistry.getNetworkToolsContent(), contentEl: true });
    } else if (appId === 'game-tetris') {
      StarWindowManager.create({ appId, title, icon, width: 620, height: 820, content: StarAppsRegistry.getTetrisContent(), contentEl: true });
    } else if (appId === 'game-snake') {
      StarWindowManager.create({ appId, title, icon, width: 620, height: 700, content: StarAppsRegistry.getSnakeContent(), contentEl: true });
    } else if (appId === 'game-link') {
      StarWindowManager.create({ appId, title, icon, width: 640, height: 580, content: StarAppsRegistry.getLinkContent(), contentEl: true });
    } else if (appId === 'game-platformer') {
      StarWindowManager.create({ appId, title, icon, width: 800, height: 520, content: StarAppsRegistry.getPlatformerContent(), contentEl: true });
    } else if (appId === 'game-landlord') {
      StarWindowManager.create({ appId, title, icon, width: 720, height: 620, content: StarAppsRegistry.getLandlordContent(), contentEl: true });
    } else if (appId === 'game-runner') {
      StarWindowManager.create({ appId, title, icon, width: 640, height: 400, content: StarAppsRegistry.getRunnerContent(), contentEl: true });
    } else if (appId === 'game-tank') {
      StarWindowManager.create({ appId, title, icon, width: 680, height: 560, content: StarAppsRegistry.getTankContent(), contentEl: true });
    } else if (appId === 'game-plane') {
      StarWindowManager.create({ appId, title, icon, width: 480, height: 640, content: StarAppsRegistry.getPlaneContent(), contentEl: true });
    } else if (appId === 'game-gomoku') {
      StarWindowManager.create({ appId, title, icon, width: 760, height: 760, content: StarAppsRegistry.getGomokuContent(), contentEl: true });
    } else if (appId === 'game-minesweeper') {
      StarWindowManager.create({ appId, title, icon, width: 500, height: 620, content: StarAppsRegistry.getMinesweeperContent(), contentEl: true });
    } else if (appId === 'game-2048') {
      StarWindowManager.create({ appId, title, icon, width: 500, height: 660, content: StarAppsRegistry.get2048Content(), contentEl: true });
    } else if (appId === 'game-othello') {
      StarWindowManager.create({ appId, title, icon, width: 760, height: 860, content: StarAppsRegistry.getOthelloContent(), contentEl: true });
    } else if (appId === 'game-sokoban') {
      StarWindowManager.create({ appId, title, icon, width: 860, height: 700, content: StarAppsRegistry.getSokobanContent(), contentEl: true });
    } else if (appId === 'game-sudoku') {
      const wid = StarWindowManager.create({ appId, title, icon, width: 1100, height: 760, content: StarAppsRegistry.getSudokuContent(), contentEl: true });
      if (wid) StarWindowManager.maximize(wid);
    } else if (appId === 'game-solitaire') {
      StarWindowManager.create({ appId, title, icon, width: 1140, height: 780, content: StarAppsRegistry.getSolitaireContent(), contentEl: true });
    } else if (appId === 'game-carrot-defense') {
      const wid = StarWindowManager.create({ appId, title, icon, width: 1260, height: 860, content: StarAppsRegistry.getCarrotDefenseContent(), contentEl: true });
      if (wid) StarWindowManager.maximize(wid);
    } else if (appId === 'screenshot') {
      StarWindowManager.create({ appId, title, icon, width: 640, height: 520, content: StarAppsRegistry.getScreenshotContent(), contentEl: true });
    } else if (appId === 'sticky-notes') {
      StarWindowManager.create({ appId, title, icon, width: 360, height: 400, content: StarAppsRegistry.getStickyNotesContent(), contentEl: true });
    } else if (appId === 'character-map') {
      StarWindowManager.create({ appId, title, icon, width: 560, height: 480, content: StarAppsRegistry.getCharacterMapContent(), contentEl: true });
    } else if (appId === 'on-screen-keyboard') {
      StarWindowManager.create({ appId, title, icon, width: 720, height: 320, content: StarAppsRegistry.getOnScreenKeyboardContent(), contentEl: true });
    } else if (appId === 'about') {
      const aboutWidth = 640;
      const aboutHeight = 540;
      const existingAbout = Array.isArray(StarWindowManager.windows)
        ? StarWindowManager.windows.find(win => win && win.appId === 'about')
        : null;
      if (existingAbout) {
        if (!existingAbout.maximized) {
          existingAbout.width = Math.max(existingAbout.width || 0, aboutWidth);
          existingAbout.height = Math.max(existingAbout.height || 0, aboutHeight);
          if (existingAbout.el) {
            existingAbout.el.style.width = existingAbout.width + 'px';
            existingAbout.el.style.height = existingAbout.height + 'px';
          }
        }
        StarWindowManager.restore(existingAbout.id);
        StarWindowManager.focus(existingAbout.id);
        if (window.updateTaskbarApps) window.updateTaskbarApps();
        return;
      }
      StarWindowManager.create({ appId, title, icon, width: aboutWidth, height: aboutHeight, content: StarAppsRegistry.getAboutContent(), contentEl: true });
    }
    if (window.updateTaskbarApps) window.updateTaskbarApps();
  },

  getWindowContentForAppId(appId) {
    if (appId === 'file-manager') return this.getFileManagerContent();
    if (appId === 'music-player') return this.getMusicPlayerContent();
    if (appId === 'video-player') return this.getVideoPlayerContent();
    if (appId === 'wps-editor') return this.getWpsEditorContent();
    if (appId === 'image-viewer') return this.getImageViewerContent();
    if (appId === 'star-unzip') return this.getStarUnzipContent();
    if (appId === 'browser') return this.getBrowserContent();
    if (appId === 'terminal') return this.getTerminalContent();
    if (appId === 'redis-cli') return this.getRedisCliContent();
    if (appId === 'linux-shell') return this.getLinuxShellContent();
    if (appId === 'docker-shell') return this.getDockerShellContent();
    if (appId === 'calculator') return this.getCalculatorContent();
    if (appId === 'text-editor') return this.getTextEditorContent();
    if (appId === 'markdown-reader') return this.getMarkdownReaderContent();
    if (appId === 'java-ide') return this.getJavaIDEContent();
    if (appId === 'settings') return this.getSettingsContent();
    if (appId === 'task-manager') return this.getTaskManagerContent();
    if (appId === 'paint') return this.getPaintContent();
    if (appId === 'clock') return this.getClockContent();
    if (appId === 'control-panel') return this.getControlPanelContent();
    if (appId === 'network-tools') return this.getNetworkToolsContent();
    if (appId === 'game-tetris') return this.getTetrisContent();
    if (appId === 'game-snake') return this.getSnakeContent();
    if (appId === 'game-link') return this.getLinkContent();
    if (appId === 'game-platformer') return this.getPlatformerContent();
    if (appId === 'game-landlord') return this.getLandlordContent();
    if (appId === 'game-runner') return this.getRunnerContent();
    if (appId === 'game-tank') return this.getTankContent();
    if (appId === 'game-plane') return this.getPlaneContent();
    if (appId === 'game-gomoku') return this.getGomokuContent();
    if (appId === 'game-minesweeper') return this.getMinesweeperContent();
    if (appId === 'game-2048') return this.get2048Content();
    if (appId === 'game-othello') return this.getOthelloContent();
    if (appId === 'game-sokoban') return this.getSokobanContent();
    if (appId === 'game-sudoku') return this.getSudokuContent();
    if (appId === 'game-solitaire') return this.getSolitaireContent();
    if (appId === 'game-carrot-defense') return this.getCarrotDefenseContent();
    if (appId === 'screenshot') return this.getScreenshotContent();
    if (appId === 'sticky-notes') return this.getStickyNotesContent();
    if (appId === 'character-map') return this.getCharacterMapContent();
    if (appId === 'on-screen-keyboard') return this.getOnScreenKeyboardContent();
    if (appId === 'about') return this.getAboutContent();
    return null;
  },

  refreshOpenWindowsLocale() {
    if (!window.StarWindowManager || !Array.isArray(StarWindowManager.windows)) return;
    StarWindowManager.windows.forEach(win => {
      if (!win || !win.el) return;
      const app = this.getApp(win.appId);
      const nextTitle = app ? t(app.titleKey) : (win.appId === 'run' ? t('runDialog') : win.title);
      win.title = nextTitle;
      const titleTextEl = win.el.querySelector('.title-text');
      if (titleTextEl) titleTextEl.textContent = nextTitle;
      const minBtn = win.el.querySelector('.title-btn.min');
      const maxBtn = win.el.querySelector('.title-btn.max');
      const closeBtn = win.el.querySelector('.title-btn.close');
      if (minBtn) minBtn.title = t('minimize');
      if (maxBtn) {
        maxBtn.title = t('maximize');
        maxBtn.setAttribute('aria-label', win.maximized ? t('restoreWindow') : t('maximizeWindow'));
      }
      if (closeBtn) closeBtn.title = t('close');
      if (win.appId === 'run' && win.contentEl) {
        const h2 = win.contentEl.querySelector('.run-dialog h2');
        const p = win.contentEl.querySelector('.run-dialog p');
        const input = win.contentEl.querySelector('#run-input');
        const browseBtn = win.contentEl.querySelector('#run-browse');
        const cancelBtn = win.contentEl.querySelector('#run-cancel');
        const okBtn = win.contentEl.querySelector('#run-ok');
        if (h2) h2.textContent = t('runDialog');
        if (p) p.textContent = t('runDialogDesc');
        if (input) input.placeholder = t('runInputPlaceholder');
        if (browseBtn) {
          browseBtn.textContent = t('browse');
          browseBtn.title = t('chooseLocalFile');
        }
        if (cancelBtn) cancelBtn.textContent = t('cancel');
        if (okBtn) okBtn.textContent = t('ok');
        return;
      }
      if (typeof win.localeRefresh === 'function') {
        try {
          win.localeRefresh();
          return;
        } catch (e) {
          console.error(e);
        }
      }
      const nextContent = this.getWindowContentForAppId(win.appId);
      if (typeof nextContent !== 'string' || !win.contentEl) return;
      win.content = nextContent;
      win.contentEl.innerHTML = nextContent;
      if (win.contentEl && win.appId && typeof StarAppsLogic !== 'undefined' && StarAppsLogic[win.appId]) {
        try { StarAppsLogic[win.appId](win.contentEl); } catch (e) { console.error(e); }
      }
    });
    if (window.updateTaskbarApps) window.updateTaskbarApps();
  },

  openRunDialog() {
    const runHtml = `
      <div class="run-dialog" style="padding:24px;font-family:inherit;">
        <h2 style="margin-bottom:8px;">${t('runDialog')}</h2>
        <p style="color:var(--text-dim);font-size:13px;margin-bottom:16px;">${t('runDialogDesc')}</p>
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <input type="text" id="run-input" placeholder="${t('runInputPlaceholder')}" style="flex:1;min-width:0;padding:10px;background:var(--window-titlebar);border:1px solid var(--border);border-radius:4px;color:var(--text);">
          <button id="run-browse" class="start-footer-btn" title="${t('chooseLocalFile')}">${t('browse')}</button>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;">
          <button id="run-cancel" class="start-footer-btn">${t('cancel')}</button>
          <button id="run-ok" class="start-footer-btn" style="background:var(--accent);color:#fff;">${t('ok')}</button>
        </div>
      </div>`;
    // 高度略增大，避免在浅色主题或高 DPI 下底部按钮被裁切
    const winId = StarWindowManager.create({ appId: 'run', title: t('runDialog'), icon: createHandDrawnAppIcon('run'), width: 480, height: 260, content: runHtml });
    const win = StarWindowManager.windows.find(w => w.id === winId);
    const content = win && win.contentEl;
    if (content) {
      const normalizeRunToken = (value) => String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[-_]/g, '');
      const tryOpenInternalApp = (inputValue) => {
        const token = normalizeRunToken(inputValue);
        if (!token) return false;
        const alias = new Map([
          ['explorer', 'file-manager'],
          ['filemanager', 'file-manager'],
          ['browser', 'browser'],
          ['terminal', 'terminal'],
          ['cmd', 'terminal'],
          ['powershell', 'terminal'],
          ['settings', 'settings'],
          ['controlpanel', 'control-panel'],
          ['taskmanager', 'task-manager'],
          ['notepad', 'text-editor'],
          ['markdown', 'markdown-reader'],
          ['paint', 'paint'],
          ['calculator', 'calculator'],
          ['clock', 'clock'],
          ['run', 'run']
        ]);
        if (alias.has(token)) {
          this.open(alias.get(token));
          return true;
        }
        const matched = this.apps.find((app) => {
          if (!app) return false;
          if (normalizeRunToken(app.id) === token) return true;
          const localizedTitle = normalizeRunToken(t(app.titleKey));
          return localizedTitle && localizedTitle === token;
        });
        if (!matched) return false;
        this.open(matched.id);
        return true;
      };

      content.querySelector('#run-ok').onclick = async () => {
        const v = content.querySelector('#run-input').value.trim();
        if (!v) return;
        if (tryOpenInternalApp(v)) {
          StarWindowManager.close(winId);
          return;
        }
        if (typeof window.openPathInStarOs === 'function') {
          try {
            const handled = await window.openPathInStarOs(v);
            if (handled) {
              StarWindowManager.close(winId);
              return;
            }
          } catch (_) {}
        }
        const result = await require('electron').ipcRenderer.invoke('os:launch', v);
        if (result && result.ok === false) {
          alert(result.error || 'Launch failed.');
          return;
        }
        StarWindowManager.close(winId);
      };
      content.querySelector('#run-cancel').onclick = () => StarWindowManager.close(winId);
      const runBrowse = content.querySelector('#run-browse');
      if (runBrowse) {
        runBrowse.onclick = () => {
          window.showInternalOpenDialog({ properties: ['openFile'], title: t('runOpenFileTitle') }).then(r => {
            if (!r.canceled && r.filePaths && r.filePaths[0]) content.querySelector('#run-input').value = r.filePaths[0];
          });
        };
      }
    }
  },

  getFileManagerContent() {
    return `
      <div id="file-manager-app" style="height:100%;display:flex;flex-direction:column;">
        <style>
          #file-manager-app .fm-table-wrap {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: color-mix(in srgb, var(--window-bg) 96%, #202433 4%);
          }
          #file-manager-app .fm-table-head {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 140px 220px;
            align-items: center;
            gap: 0;
            padding-right: 14px;
            border-bottom: 1px solid var(--border);
            background: rgba(24, 28, 40, 0.96);
            box-shadow: 0 10px 16px rgba(0, 0, 0, 0.12);
            flex-shrink: 0;
          }
          #file-manager-app .fm-table-head-cell {
            min-width: 0;
            padding: 12px 12px 11px;
            line-height: 20px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: var(--text-secondary);
            font-weight: 700;
            font-size: 13px;
          }
          #file-manager-app .fm-table-head-cell.fm-col-name {
            text-align: left;
          }
          #file-manager-app .fm-table-head-cell.fm-col-size {
            text-align: right;
          }
          #file-manager-app .fm-table-head-cell.fm-col-date {
            text-align: left;
          }
          #file-manager-app .fm-table-body {
            flex: 1;
            min-height: 0;
            overflow: auto;
            overflow-x: hidden;
          }
          #file-manager-app #fm-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            table-layout: fixed;
          }
          #file-manager-app #fm-table col.fm-col-size {
            width: 140px;
          }
          #file-manager-app #fm-table col.fm-col-date {
            width: 220px;
          }
          #file-manager-app #fm-table tbody td {
            background: transparent;
            padding: 10px 12px;
            vertical-align: middle;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            border-bottom: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
          }
          #file-manager-app #fm-table tbody td.fm-col-size {
            text-align: right;
          }
          #file-manager-app #fm-table tbody td.fm-col-date {
            color: var(--text-secondary);
          }
          #file-manager-app #fm-table tbody tr:last-child td {
            border-bottom: none;
          }
          :root[data-theme="light"] #file-manager-app .fm-table-wrap {
            background: rgba(255, 255, 255, 0.94);
          }
          :root[data-theme="light"] #file-manager-app .fm-table-head {
            background: rgba(247, 249, 255, 0.98);
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.05);
            border-bottom-color: rgba(203, 213, 225, 0.9);
          }
          /* Sort direction button: icon-only, compact, clearer than "正序/倒序" text */
          #file-manager-app #fm-sort-direction.fm-sort-direction-btn {
            width: 42px;
            min-width: 42px;
            height: 36px;
            padding: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
          }
          #file-manager-app #fm-sort-direction.fm-sort-direction-btn svg {
            width: 18px;
            height: 18px;
            display: block;
          }
        </style>
        <div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
          <button id="fm-back" class="start-footer-btn">${t('back')}</button>
          <button id="fm-forward" class="start-footer-btn">${t('forward')}</button>
          <input type="text" id="fm-path" style="flex:1;min-width:120px;padding:8px;background:var(--window-titlebar);border:1px solid var(--border);border-radius:4px;color:var(--text);" placeholder="${t('addressBar')}">
          <button id="fm-go" class="start-footer-btn">${t('refresh')}</button>
        </div>
        <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--border);">
          <button id="fm-newfolder" class="start-footer-btn">${t('newFolder')}</button>
          <button id="fm-newfile" class="start-footer-btn">${t('newFile')}</button>
          <button id="fm-rename" class="start-footer-btn">${t('rename')}</button>
          <button id="fm-copy" class="start-footer-btn">${t('copy')}</button>
          <button id="fm-cut" class="start-footer-btn">${t('cut')}</button>
          <button id="fm-paste" class="start-footer-btn">${t('paste')}</button>
          <button id="fm-delete" class="start-footer-btn">${t('delete')}</button>
          <button id="fm-recyclebin" class="start-footer-btn">${t('recycleBin')}</button>
          <button id="fm-sort-direction" type="button" class="start-footer-btn fm-sort-direction-btn" data-direction="asc" title="${t('sortAscending')}" aria-label="${t('sortAscending')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 19V5"></path>
              <path d="M7 10l5-5 5 5"></path>
            </svg>
          </button>
          <div style="margin-left:auto;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span id="fm-sort-label" style="font-size:12px;color:var(--text-dim);">${t('sortLabel')}</span>
            <select id="fm-sort-field" class="settings-input" style="min-width:110px;padding:8px 28px 8px 10px;border:1px solid var(--border);border-radius:6px;">
              <option value="name">${t('sortByName')}</option>
              <option value="type">${t('sortByType')}</option>
              <option value="size">${t('sortBySize')}</option>
              <option value="date">${t('sortByDate')}</option>
            </select>
          </div>
        </div>
        <div class="fm-table-wrap">
          <div class="fm-table-head" aria-hidden="true">
            <div id="fm-head-name" class="fm-table-head-cell fm-col-name">${t('name')}</div>
            <div id="fm-head-size" class="fm-table-head-cell fm-col-size">${t('size')}</div>
            <div id="fm-head-date" class="fm-table-head-cell fm-col-date">${t('date')}</div>
          </div>
          <div class="fm-table-body">
            <table id="fm-table" style="width:100%;">
              <colgroup>
                <col class="fm-col-name">
                <col class="fm-col-size">
                <col class="fm-col-date">
              </colgroup>
              <tbody id="fm-tbody"><tr><td colspan="3" style="padding:12px;color:var(--text-dim);">${t('loading')}</td></tr></tbody>
          </table>
          </div>
        </div>
      </div>`;
  },

  openBrowserIncognito(initialUrl) {
    const app = this.apps.find(a => a.id === 'browser');
    if (!app || !window.StarWindowManager) return null;
    const icon = app.icon;
    const title = t('browserIncognitoTitle', `${t(app.titleKey)} - ${t('browserIncognitoLabel', 'Incognito')}`);
    const wid = StarWindowManager.create({
      appId: 'browser',
      title,
      icon,
      width: 1000,
      height: 700,
      content: StarAppsRegistry.getBrowserContent(true),
      contentEl: true
    });
    if (!wid) return null;
    const win = Array.isArray(StarWindowManager.windows) ? StarWindowManager.windows.find(w => w && w.id === wid) : null;
    if (win && win.el) {
      win.el.dataset.browserIncognito = '1';
      win.el.classList.add('browser-incognito-window');
      const titleEl = win.el.querySelector('.title-text');
      if (titleEl) {
        titleEl.textContent = title;
        const existingBadge = win.el.querySelector('.window-title-badge.incognito');
        if (!existingBadge) {
          const badge = document.createElement('span');
          badge.className = 'window-title-badge incognito';
          badge.textContent = t('browserIncognitoBadge', 'Incognito window');
          titleEl.insertAdjacentElement('afterend', badge);
        }
      }
    }
    if (initialUrl) window.__starBrowserInitialUrl = String(initialUrl);
    StarWindowManager.maximize(wid);
    return wid;
  },

  getBrowserContent(incognito) {
    const isIncognito = !!incognito;
    return `
      <div id="browser-app" data-incognito="${isIncognito ? '1' : '0'}" style="width:100%;height:100%;min-height:0;overflow:hidden;display:flex;flex-direction:column;position:relative;flex:1;">
        <style>
          #browser-app {
            width:100%;
            height:100%;
            min-height:0;
            overflow:hidden;
            display:flex;
            flex-direction:column;
            position:relative;
            flex:1 1 auto;
          }
          #browser-app #br-tabs { flex:0 0 auto; }
          #browser-app .br-stage {
            flex:1 1 auto;
            min-height:0;
            position:relative;
            overflow:hidden;
            background:var(--window-bg);
          }
          #browser-app #br-webviews {
            position:absolute;
            inset:0;
            min-height:0;
            overflow:hidden;
            background:var(--window-bg);
          }
          #browser-app .br-toolbar {
            display:flex;
            align-items:center;
            gap:4px;
            padding:6px;
            border-bottom:1px solid var(--border);
            flex-wrap:wrap;
          }
          #browser-app[data-incognito="1"] .br-toolbar {
            background: linear-gradient(90deg, color-mix(in srgb, #5b21b6 30%, var(--window-titlebar)) 0%, color-mix(in srgb, #1f2937 75%, var(--window-titlebar)) 100%);
          }
          #browser-app .br-top-banner {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-bottom: 1px solid var(--border);
            background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 22%, var(--window-titlebar)) 0%, var(--window-titlebar) 62%);
            color: var(--text);
          }
          #browser-app .br-top-banner.hidden { display: none; }
          #browser-app .br-top-banner-title { font-weight: 800; font-size: 13px; }
          #browser-app .br-top-banner-msg {
            flex: 1;
            min-width: 0;
            font-size: 12px;
            color: var(--text-secondary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          #browser-app .br-top-banner-actions { display: inline-flex; align-items: center; gap: 8px; flex: 0 0 auto; }
          #browser-app .br-top-banner-close {
            width: 30px;
            min-width: 30px;
            height: 30px;
            padding: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
          }
          #browser-app .br-side-panel {
            position:absolute;
            top:10px;
            right:10px;
            bottom:10px;
            width:min(360px, 42%);
            min-width:280px;
            border:1px solid var(--border);
            border-radius:14px;
            background:color-mix(in srgb, var(--window-bg) 96%, rgba(15,23,42,.92));
            box-shadow:0 16px 40px rgba(0,0,0,.28);
            display:flex;
            flex-direction:column;
            overflow:hidden;
            z-index:4;
          }
          #browser-app .br-side-panel.hidden { display:none; }
          #browser-app .br-dev-panel {
            position:absolute;
            top:10px;
            right:10px;
            bottom:10px;
            width:min(380px, 44%);
            min-width:280px;
            border:1px solid var(--border);
            border-radius:14px;
            background:color-mix(in srgb, var(--window-bg) 96%, rgba(15,23,42,.92));
            box-shadow:0 16px 40px rgba(0,0,0,.28);
            display:flex;
            flex-direction:column;
            overflow:hidden;
            z-index:5;
          }
          #browser-app .br-dev-panel.hidden { display:none; }
          #browser-app .br-dev-panel .br-dev-panel-tabs {
            display:flex;
            flex-wrap:wrap;
            gap:6px;
            padding:8px 10px 10px;
            border-bottom:1px solid var(--border);
            background:var(--br-panel-tabs-bg, color-mix(in srgb, var(--window-titlebar) 82%, rgba(8,15,24,.92)));
          }
          #browser-app .br-dev-panel .br-dev-tab {
            border:1px solid var(--border);
            background:color-mix(in srgb, var(--window-titlebar) 70%, transparent);
            color:color-mix(in srgb, var(--text) 88%, var(--text-secondary) 12%);
            border-radius:999px;
            padding:6px 12px;
            font-size:12px;
            font-weight:600;
            cursor:pointer;
          }
          #browser-app .br-dev-panel .br-dev-tab:hover {
            color:var(--text);
            border-color:color-mix(in srgb, var(--accent) 35%, var(--border));
          }
          #browser-app .br-dev-panel .br-dev-tab.active {
            color:var(--text);
            border-color:color-mix(in srgb, var(--accent) 55%, var(--border));
            background:color-mix(in srgb, var(--accent) 16%, var(--window-titlebar));
          }
          #browser-app .br-dev-source-wrap { display:flex; flex-direction:column; gap:8px; min-height:0; flex:1; }
          #browser-app .br-dev-source-toolbar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
          #browser-app .br-dev-source-pre {
            margin:0;
            padding:10px;
            border-radius:10px;
            border:1px solid var(--border);
            background:color-mix(in srgb, var(--window-bg) 88%, var(--text) 4%);
            font-family:ui-monospace,Consolas,monospace;
            font-size:11px;
            line-height:1.45;
            white-space:pre-wrap;
            word-break:break-all;
            overflow:auto;
            flex:1;
            min-height:120px;
            max-height:100%;
            color:var(--text);
          }
          #browser-app .br-net-detail {
            margin-top:8px;
            padding-top:8px;
            border-top:1px dashed var(--border);
            font-size:11px;
            color:var(--text-secondary);
            display:grid;
            gap:4px;
          }
          #browser-app .br-net-detail-row { display:flex; gap:8px; flex-wrap:wrap; align-items:flex-start; }
          #browser-app .br-net-detail-k { flex:0 0 auto; color:var(--text-dim); min-width:4.5em; }
          #browser-app .br-net-detail-v { flex:1; min-width:0; word-break:break-all; color:var(--text); }
          #browser-app .br-panel-head {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:8px;
            padding:12px 14px 10px;
            border-bottom:1px solid var(--border);
          }
          #browser-app .br-panel-head-text { min-width:0; }
          #browser-app .br-panel-kicker {
            font-size:12px;
            color:var(--text-dim);
            letter-spacing:.08em;
            text-transform:uppercase;
          }
          #browser-app .br-panel-title {
            font-size:22px;
            font-weight:900;
            line-height:1.1;
            margin-top:2px;
          }
          #browser-app .br-panel-hint {
            margin-top:6px;
            font-size:12px;
            line-height:1.5;
            color:var(--text-dim);
          }
          #browser-app .br-panel-tabs {
            display:flex;
            gap:10px;
            padding:10px 14px;
            border-bottom:1px solid var(--border);
          }
          #browser-app .br-panel-tab {
            flex:1;
            border-radius:999px;
            padding:10px 12px;
            border:1px solid var(--border);
            background:color-mix(in srgb, var(--window-titlebar) 78%, transparent);
            color:var(--text);
            font-weight:700;
            cursor:pointer;
          }
          #browser-app .br-panel-tab.active {
            border-color:color-mix(in srgb, var(--accent) 56%, var(--border));
            background:color-mix(in srgb, var(--accent) 12%, var(--window-titlebar));
          }
          #browser-app .br-panel-actions {
            display:flex;
            gap:8px;
            flex-wrap:wrap;
            padding:10px 14px;
            border-bottom:1px solid var(--border);
          }
          #browser-app .br-panel-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; width:100%; }
          #browser-app .br-panel-row.compact { gap:8px; }
          #browser-app .br-panel-spacer { flex:1; }
          #browser-app .br-panel-search {
            flex:1 1 180px;
            min-width: 160px;
            padding: 10px 12px;
            border:1px solid var(--border);
            border-radius: 10px;
            background: var(--window-titlebar);
            color: var(--text);
            outline: none;
          }
          #browser-app .br-panel-search:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--accent-soft); }
          #browser-app .br-panel-body {
            flex:1;
            min-height:0;
            overflow:auto;
            overflow-x:hidden;
            padding:12px 14px 16px;
            display:flex;
            flex-direction:column;
            gap:14px;
          }
          #browser-app .br-panel-section-title {
            font-size:12px;
            color:var(--text-dim);
            margin-bottom:8px;
          }
          #browser-app .br-history-item {
            width:100%;
            text-align:left;
            border:1px solid var(--border);
            border-radius:10px;
            background:color-mix(in srgb, var(--window-titlebar) 78%, transparent);
            color:var(--text);
            padding:10px 12px;
            cursor:pointer;
            display:flex;
            flex-direction:column;
            gap:4px;
            overflow:hidden;
          }
          #browser-app .br-history-item:hover {
            border-color:color-mix(in srgb, var(--accent) 46%, var(--border));
            background:color-mix(in srgb, var(--accent) 12%, var(--window-titlebar));
          }
          #browser-app .br-history-title {
            font-size:13px;
            font-weight:600;
            display:-webkit-box;
            overflow:hidden;
            overflow-wrap:anywhere;
            -webkit-line-clamp:2;
            -webkit-box-orient:vertical;
            white-space:normal;
            line-height:1.35;
          }
          #browser-app .br-history-group-title {
            font-size:11px;
            color:var(--text-dim);
            margin:2px 2px 6px;
          }
          #browser-app .br-history-url {
            font-size:12px;
            color:var(--text-dim);
            white-space:normal;
            overflow-wrap:anywhere;
            word-break:break-all;
          }
          #browser-app .br-history-time {
            font-size:11px;
            color:var(--text-dim);
          }
          #browser-app .br-empty {
            padding:16px 12px;
            border:1px dashed var(--border);
            border-radius:10px;
            color:var(--text-dim);
            font-size:12px;
            text-align:center;
          }
          #browser-app .br-status {
            padding:5px 10px;
            border-top:1px solid var(--border);
            font-size:12px;
            color:var(--text-dim);
            min-height:28px;
            box-sizing:border-box;
          }
          #browser-app .br-toolbar .start-footer-btn[data-active="true"] {
            background:color-mix(in srgb, var(--accent) 18%, var(--window-titlebar));
            border-color:color-mix(in srgb, var(--accent) 54%, var(--border));
          }
          #browser-app .br-dev-panel .br-panel-kicker {
            color:color-mix(in srgb, var(--text-secondary) 45%, var(--text) 55%);
          }
          #browser-app .br-dev-panel .br-panel-hint {
            color:var(--text-secondary);
          }
          #browser-app .br-dev-panel .br-panel-body .br-panel-section-title {
            color:var(--text-secondary);
            font-weight:700;
          }
          #browser-app .br-dev-panel .br-net-detail {
            color:var(--text);
          }
          #browser-app .br-dev-panel .br-net-detail-k {
            color:var(--text-secondary);
          }
          #browser-app .br-dev-panel .br-empty {
            color:var(--text-secondary);
          }
        </style>
        <div id="br-download-banner" class="br-top-banner hidden" role="status" aria-live="polite"></div>
        <div class="br-toolbar">
          <button id="br-back" class="start-footer-btn" style="padding:6px 10px;">${t('back')}</button>
          <button id="br-forward" class="start-footer-btn" style="padding:6px 10px;">${t('forward')}</button>
          <button id="br-reload" class="start-footer-btn" style="padding:6px 10px;">${t('refresh')}</button>
          <button id="br-home" class="start-footer-btn" style="padding:6px 10px;">${t('homePage')}</button>
          <input type="text" id="br-url" style="flex:1;min-width:120px;padding:8px 12px;margin:0 4px;background:var(--window-titlebar);border:1px solid var(--border);border-radius:4px;color:var(--text);" placeholder="${t('searchOrAddress')}">
          <button id="br-go" class="start-footer-btn" style="padding:6px 12px;">${t('go')}</button>
          <button id="br-newtab" class="start-footer-btn" style="padding:6px 10px;">${t('newTab')}</button>
          <button id="br-incognito" class="start-footer-btn" style="padding:6px 10px;">${t('browserIncognitoOpen', 'Incognito')}</button>
          <button id="br-restore-tab" class="start-footer-btn" style="padding:6px 10px;">${t('browserRestoreClosedTab', 'Restore tab')}</button>
          <button id="br-downloads" class="start-footer-btn" style="padding:6px 10px;">${t('browserDownloads', 'Downloads')}</button>
          <button id="br-favorite" class="start-footer-btn" style="padding:6px 10px;" data-active="false">${t('browserFavoriteToggle', 'Favorite')}</button>
          <button id="br-favorites" class="start-footer-btn" style="padding:6px 10px;">${t('browserFavorites', 'Favorites')}</button>
          <button id="br-history" class="start-footer-btn" style="padding:6px 10px;">${t('history')}</button>
          <button id="br-site-data" class="start-footer-btn" style="padding:6px 10px;">${t('browserSiteData', 'Site data')}</button>
          <button id="br-devtools" class="start-footer-btn" style="padding:6px 10px;">${t('browserOpenDevTools', 'DevTools')}</button>
        </div>
        <div id="br-tabs" style="display:flex;background:var(--window-titlebar);padding:4px 8px 0;gap:4px;flex-wrap:nowrap;overflow:hidden;white-space:normal;"></div>
        <div class="br-stage">
          <div id="br-webviews"></div>
          <aside id="br-side-panel" class="br-side-panel hidden">
              <div class="br-panel-head">
                <div class="br-panel-head-text">
                  <div id="br-side-panel-kicker" class="br-panel-kicker">${t('browserSidebar', 'Browser sidebar')}</div>
                  <div id="br-side-panel-title" class="br-panel-title">${t('history')}</div>
                  <div id="br-side-panel-hint" class="br-panel-hint"></div>
        </div>
                <button id="br-side-panel-close" class="start-footer-btn" style="padding:4px 10px;">×</button>
              </div>
              <div class="br-panel-tabs">
                <button type="button" id="br-panel-tab-history" class="br-panel-tab active">${t('history')}</button>
                <button type="button" id="br-panel-tab-favorites" class="br-panel-tab">${t('bookmarks')}</button>
                <button type="button" id="br-panel-tab-data" class="br-panel-tab">${t('browserSiteData', 'Site data')}</button>
              </div>
              <div id="br-panel-actions" class="br-panel-actions"></div>
              <div id="br-side-panel-body" class="br-panel-body"></div>
          </aside>
          <aside id="br-dev-panel" class="br-dev-panel hidden" aria-label="${t('browserDevPanel', 'Developer tools')}">
              <div class="br-panel-head">
                <div class="br-panel-head-text">
                  <div id="br-dev-panel-kicker" class="br-panel-kicker"></div>
                  <div id="br-dev-panel-title" class="br-panel-title"></div>
                  <div id="br-dev-panel-hint" class="br-panel-hint"></div>
                </div>
                <button type="button" id="br-dev-panel-close" class="start-footer-btn" style="padding:4px 10px;">×</button>
              </div>
              <div class="br-dev-panel-tabs" id="br-dev-panel-mode-tabs"></div>
              <div id="br-dev-panel-actions" class="br-panel-actions"></div>
              <div id="br-dev-panel-body" class="br-panel-body"></div>
          </aside>
        </div>
        <div id="br-status" class="br-status"></div>
      </div>`;
  },

  getTerminalContent() {
    return `
      <div id="terminal-app" style="height:100%;display:flex;flex-direction:column;background:#0d1117;color:#c9d1d9;font-family:'Cascadia Code',Consolas,monospace;font-size:14px;">
        <div id="terminal-header" style="padding:8px;border-bottom:1px solid var(--border);">Star OS - ${t('terminal')}</div>
        <pre id="terminal-output" style="flex:1;margin:0;padding:12px;overflow:auto;white-space:pre-wrap;word-break:break-all;"></pre>
        <div style="display:flex;align-items:center;padding:8px;border-top:1px solid var(--border);gap:8px;">
          <span id="terminal-prompt" style="color:#7ee787;flex:0 0 auto;white-space:pre;"></span>
          <input type="text" id="terminal-input" autocomplete="off" spellcheck="false" style="flex:1;background:transparent;border:none;color:inherit;font:inherit;outline:none;">
        </div>
      </div>`;
  },

  getRedisCliContent() {
    return `
      <div id="redis-cli-app" style="height:100%;display:flex;flex-direction:column;background:#0d1117;color:#c9d1d9;font-family:'Cascadia Code',Consolas,monospace;font-size:14px;">
        <div style="padding:8px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span>Redis CLI — ${t('redisCli')}</span>
          <span style="margin-left:auto;font-size:12px;color:var(--text-dim);">127.0.0.1:6379</span>
        </div>
        <pre id="redis-output" style="flex:1;margin:0;padding:12px;overflow:auto;white-space:pre-wrap;word-break:break-word;"></pre>
        <div style="display:flex;align-items:center;padding:8px;border-top:1px solid var(--border);gap:8px;">
          <span style="color:#7ee787;" id="redis-prompt">127.0.0.1:6379&gt;</span>
          <input type="text" id="redis-input" autocomplete="off" spellcheck="false" style="flex:1;background:transparent;border:none;color:inherit;font:inherit;outline:none;">
        </div>
      </div>`;
  },

  getLinuxShellContent() {
    return `
      <div id="linux-shell-app" style="height:100%;display:flex;flex-direction:column;background:#020617;color:#e5e7eb;font-family:'Cascadia Code',Consolas,monospace;font-size:14px;">
        <div style="padding:8px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span>Linux Shell — ${t('linuxShell')}</span>
          <span style="margin-left:auto;font-size:12px;color:var(--text-dim);">star@learn-linux:~$</span>
        </div>
        <pre id="linux-output" style="flex:1;margin:0;padding:12px;overflow:auto;white-space:pre-wrap;word-break:break-word;"></pre>
        <div style="display:flex;align-items:center;padding:8px 10px;border-top:1px solid var(--border);gap:8px;">
          <span id="linux-prompt" style="color:#22c55e;">star@learn-linux:~$</span>
          <input type="text" id="linux-input" autocomplete="off" spellcheck="false" style="flex:1;background:transparent;border:none;color:inherit;font:inherit;outline:none;">
        </div>
      </div>`;
  },

  getDockerShellContent() {
    return `
      <div id="docker-shell-app" style="height:100%;display:flex;flex-direction:column;background:#020617;color:#e5e7eb;font-family:'Cascadia Code',Consolas,monospace;font-size:14px;">
        <div style="padding:8px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span>Docker CLI — ${t('dockerShell')}</span>
          <span style="margin-left:auto;font-size:12px;color:var(--text-dim);">docker@learn:~$</span>
        </div>
        <pre id="docker-output" style="flex:1;margin:0;padding:12px;overflow:auto;white-space:pre-wrap;word-break:break-word;"></pre>
        <div style="display:flex;align-items:center;padding:8px 10px;border-top:1px solid var(--border);gap:8px;">
          <span id="docker-prompt" style="color:#38bdf8;">docker@learn:~$</span>
          <input type="text" id="docker-input" autocomplete="off" spellcheck="false" style="flex:1;background:transparent;border:none;color:inherit;font:inherit;outline:none;">
        </div>
      </div>`;
  },

  getCalculatorContent() {
    return `
      <div id="calc-app" style="height:100%;padding:16px;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;">
        <input type="text" id="calc-display" readonly style="width:100%;padding:16px;font-size:24px;text-align:right;background:var(--window-titlebar);border:1px solid var(--border);border-radius:4px;color:var(--text);margin-bottom:12px;">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;flex:1;min-height:0;">
          <button class="calc-btn" data-op="C" style="grid-column:span 2;">${t('clear')}</button>
          <button class="calc-btn" data-op="/">/</button>
          <button class="calc-btn" data-op="*">*</button>
          <button class="calc-btn" data-num="7">7</button>
          <button class="calc-btn" data-num="8">8</button>
          <button class="calc-btn" data-num="9">9</button>
          <button class="calc-btn" data-op="-">-</button>
          <button class="calc-btn" data-num="4">4</button>
          <button class="calc-btn" data-num="5">5</button>
          <button class="calc-btn" data-num="6">6</button>
          <button class="calc-btn" data-op="+">+</button>
          <button class="calc-btn" data-num="1">1</button>
          <button class="calc-btn" data-num="2">2</button>
          <button class="calc-btn" data-num="3">3</button>
          <button class="calc-btn" data-op="=" style="grid-row:span 2;">=</button>
          <button class="calc-btn" data-num="0" style="grid-column:span 2;">0</button>
          <button class="calc-btn" data-num=".">.</button>
        </div>
      </div>`;
  },

  getTextEditorContent() {
    return `
      <div id="notepad-app" style="height:100%;display:flex;flex-direction:column;">
        <div style="display:flex;gap:8px;padding:8px;border-bottom:1px solid var(--border);">
          <button id="np-new" class="start-footer-btn">${t('newFile')}</button>
          <button id="np-open" class="start-footer-btn">${t('open')}</button>
          <button id="np-save" class="start-footer-btn">${t('save')}</button>
        </div>
        <textarea id="np-text" style="flex:1;min-height:200px;width:100%;padding:12px;background:var(--window-bg);border:none;color:var(--text);font-family:Consolas,monospace;font-size:14px;resize:none;box-sizing:border-box;"></textarea>
      </div>`;
  },

  getMarkdownReaderContent() {
    return `
      <div id="markdown-reader-app" style="height:100%;display:flex;flex-direction:column;">
        <style>#markdown-reader-app #md-content h1{font-size:1.6em;margin:0.6em 0 0.4em;} #markdown-reader-app #md-content h2{font-size:1.35em;margin:0.6em 0 0.35em;} #markdown-reader-app #md-content h3{font-size:1.15em;margin:0.5em 0 0.3em;} #markdown-reader-app #md-content pre{background:var(--window-titlebar);padding:12px;border-radius:6px;overflow:auto;margin:0.5em 0;} #markdown-reader-app #md-content code{background:var(--window-titlebar);padding:2px 6px;border-radius:4px;font-size:0.9em;} #markdown-reader-app #md-content pre code{padding:0;} #markdown-reader-app #md-content ul,#markdown-reader-app #md-content ol{margin:0.4em 0;padding-left:1.5em;} #markdown-reader-app #md-content p{margin:0.4em 0;} #markdown-reader-app #md-content blockquote{border-left:4px solid var(--border);margin:0.5em 0;padding-left:1em;color:var(--text-dim);}</style>
        <div style="display:flex;gap:8px;padding:8px;border-bottom:1px solid var(--border);">
          <button id="md-open" class="start-footer-btn">${t('open')}</button>
          <button id="md-refresh" class="start-footer-btn" title="${t('refresh')}">${t('refresh')}</button>
        </div>
        <div id="md-content" style="flex:1;overflow:auto;padding:16px 24px;color:var(--text);font-size:15px;line-height:1.6;box-sizing:border-box;"></div>
      </div>`;
  },

  openWithFile(appId, filePath, options) {
    if (appId === 'file-manager') window.__starFileManagerInitialPath = (options && options.directoryPath) ? options.directoryPath : filePath;
    else if (appId === 'music-player') window.__starMusicInitialPath = filePath;
    else if (appId === 'video-player') window.__starVideoInitialPath = filePath;
    else if (appId === 'wps-editor') window.__starWpsInitialPath = filePath;
    else if (appId === 'image-viewer') window.__starImageInitialPath = filePath;
    else if (appId === 'star-unzip') window.__starUnzipInitialPath = filePath;
    else if (appId === 'browser') window.__starBrowserInitialUrl = options && options.url ? options.url : filePath;
    else if (appId === 'terminal') window.__starTerminalInitial = options || { filePath };
    else if (appId === 'markdown-reader') window.__starMarkdownInitialPath = filePath;
    else if (appId === 'text-editor') window.__starNotepadInitialPath = filePath;
    this.open(appId);
  },

  getMusicPlayerContent() {
    return `
      <div id="music-player-app" style="height:100%;display:flex;flex-direction:column;background:var(--window-bg);">
        <div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
          <button id="mp-open" class="start-footer-btn">${t('open')}</button>
          <button id="mp-add" class="start-footer-btn">${t('addToPlaylist', '添加')}</button>
          <button id="mp-clear" class="start-footer-btn">${t('clearList', '清空列表')}</button>
          <span style="margin-left:auto;font-size:12px;color:var(--text-dim);" id="mp-now"></span>
        </div>
        <div style="display:flex;flex:1;min-height:0;">
          <div id="mp-playlist" style="width:260px;border-right:1px solid var(--border);overflow:auto;font-size:13px;"></div>
          <div style="flex:1;display:flex;flex-direction:column;min-width:0;">
            <div style="padding:12px;display:flex;flex-direction:column;gap:8px;">
              <input type="range" id="mp-progress" min="0" max="100" value="0" style="width:100%;cursor:pointer;">
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <button id="mp-prev" class="start-footer-btn" title="${t('previous', '上一首')}">⏮</button>
                <button id="mp-play" class="start-footer-btn" style="min-width:80px;">▶ ${t('play', '播放')}</button>
                <button id="mp-next" class="start-footer-btn" title="${t('next', '下一首')}">⏭</button>
                <span id="mp-time" style="font-size:12px;color:var(--text-dim);">0:00 / 0:00</span>
                <label style="display:flex;align-items:center;gap:6px;font-size:12px;"><span>🔊</span><input type="range" id="mp-volume" min="0" max="100" value="80" style="width:80px;"></label>
                <label style="display:flex;align-items:center;gap:6px;font-size:12px;"><input type="checkbox" id="mp-shuffle"> <span id="mp-shuffle-label">${t('shuffle', '随机')}</span></label>
                <label style="display:flex;align-items:center;gap:6px;font-size:12px;"><input type="checkbox" id="mp-repeat"> <span id="mp-repeat-label">${t('repeat', '循环')}</span></label>
              </div>
            </div>
            <audio id="mp-audio" style="display:none;"></audio>
          </div>
        </div>
      </div>`;
  },

  getVideoPlayerContent() {
    return `
      <div id="video-player-app" style="height:100%;display:flex;flex-direction:column;background:#000;">
        <div style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid var(--border);background:var(--window-titlebar);">
          <button id="vp-open" class="start-footer-btn">${t('open')}</button>
          <span id="vp-filename" style="flex:1;font-size:12px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;"></span>
        </div>
        <div style="flex:1;position:relative;display:flex;align-items:center;justify-content:center;min-height:0;">
          <video id="vp-video" style="max-width:100%;max-height:100%;object-fit:contain;" controlslist="nodownload"></video>
        </div>
        <div style="padding:8px 12px;background:var(--window-titlebar);border-top:1px solid var(--border);display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <button id="vp-play" class="start-footer-btn">▶</button>
          <input type="range" id="vp-progress" min="0" max="100" value="0" style="flex:1;min-width:80px;cursor:pointer;">
          <span id="vp-time" style="font-size:12px;color:var(--text-dim);white-space:nowrap;">0:00 / 0:00</span>
          <input type="range" id="vp-volume" min="0" max="100" value="80" style="width:70px;cursor:pointer;">
          <button id="vp-fullscreen" class="start-footer-btn">⛶</button>
        </div>
      </div>`;
  },

  getWpsEditorContent() {
    return `
      <div id="wps-editor-app" style="height:100%;display:flex;flex-direction:column;">
        <div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--border);">
          <button id="wps-open" class="start-footer-btn">${t('open')}</button>
          <span id="wps-filename" style="flex:1;font-size:12px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;"></span>
        </div>
        <div id="wps-body" style="flex:1;overflow:auto;padding:16px;background:var(--window-bg);color:var(--text);"></div>
      </div>`;
  },

  getImageViewerContent() {
    return `
      <div id="image-viewer-app" style="height:100%;display:flex;flex-direction:column;background:var(--window-bg);">
        <div style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid var(--border);">
          <button id="iv-open" class="start-footer-btn">${t('open')}</button>
          <button id="iv-zoom-out" class="start-footer-btn">−</button>
          <button id="iv-zoom-in" class="start-footer-btn">+</button>
          <button id="iv-rotate" class="start-footer-btn">↻</button>
          <button id="iv-fit" class="start-footer-btn">${t('fitWindow', '适应窗口')}</button>
          <span id="iv-filename" style="flex:1;font-size:12px;color:var(--text-dim);text-align:center;overflow:hidden;text-overflow:ellipsis;"></span>
        </div>
        <div id="iv-container" style="flex:1;overflow:auto;display:flex;align-items:flex-start;justify-content:center;min-height:0;">
          <img id="iv-image" alt="" style="max-width:none;max-height:none;object-fit:contain;">
        </div>
      </div>`;
  },

  getJavaIDEContent() {
    const baseHtml = `
      <link rel="stylesheet" href="https://unpkg.com/codemirror@5/lib/codemirror.css">
      <link rel="stylesheet" href="https://unpkg.com/codemirror@5/theme/material-darker.css">
      <style>
        .java-ide-root { height:100%;display:flex;flex-direction:row;background:var(--window-bg);color:var(--text);font-family:Consolas,monospace;font-size:13px; }
        .java-ide-sidebar { width:250px;border-right:1px solid var(--border);padding:10px;display:flex;flex-direction:column;gap:10px;background:rgba(15,15,30,0.9); }
        :root[data-theme="light"] .java-ide-sidebar { background: rgba(248,249,255,0.96); }
        .java-ide-sidebar h3 { font-size:13px;margin:0 0 4px;color:var(--text-secondary); }
        .java-ide-sidebar button { width:100%;text-align:left; }
        .java-ide-main { flex:1;display:flex;flex-direction:column;min-width:0; }
        .java-ide-toolbar { padding:8px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center; }
        #java-ide-filename { flex:1;min-width:0;padding:6px 8px;border-radius:4px;border:1px solid var(--border);background:var(--window-titlebar);color:var(--text);font-size:12px; }
        #java-ide-editor { flex:1;min-height:0; }
        .CodeMirror { height:100%;background:#020617;color:#e5e7eb;font-size:13px; }
        #java-ide-console-wrap { height:160px;display:flex;flex-direction:column;border-top:1px solid var(--border);background:#020617; }
        #java-ide-console { flex:1;background:transparent;color:#e5e7eb;padding:8px;overflow:auto;font-size:12px;white-space:pre-wrap; }
        #java-ide-console-input-row { display:flex;align-items:center;padding:4px 8px;border-top:1px solid rgba(148,163,184,0.35);font-size:12px;color:#9ca3af; }
        #java-ide-console-prompt { margin-right:6px; }
        #java-ide-console-input { flex:1;border:none;outline:none;background:transparent;color:#e5e7eb;font-family:Consolas,monospace;font-size:12px; }
      </style>
      <div class="java-ide-root">
        <aside class="java-ide-sidebar">
          <div>
            <h3>${t('javaProjectsLabel')}</h3>
            <button id="java-ide-new" class="start-footer-btn">${t('javaNewProject')}</button>
            <button id="java-ide-open" class="start-footer-btn">${t('javaOpenProject')}</button>
          </div>
          <div>
            <h3>${t('javaTemplatesLabel')}</h3>
            <select id="java-ide-template" class="settings-input" style="width:100%;">
              <option value="hello">${t('javaTemplateHello')}</option>
              <option value="loop">${t('javaTemplateLoop')}</option>
              <option value="oop">${t('javaTemplateOop')}</option>
            </select>
          </div>
          <div>
            <h3>${t('javaCurrentProjectLabel')}</h3>
            <div id="java-ide-project-path" style="font-size:11px;color:var(--text-dim);word-break:break-all;">${t('javaNotSelected')}</div>
            <div id="java-ide-filelist" style="margin-top:6px;flex:1;min-height:0;overflow:auto;font-size:11px;">
              <div style="color:var(--text-dim);">${t('javaNoFiles')}</div>
            </div>
          </div>
        </aside>
        <main class="java-ide-main">
          <div class="java-ide-toolbar">
            <button id="java-ide-run" class="start-footer-btn" style="background:var(--accent);color:#fff;">${t('javaRunF5')}</button>
            <button id="java-ide-save" class="start-footer-btn">${t('javaSaveShortcut')}</button>
            <span style="font-size:12px;color:var(--text-dim);margin-left:8px;">${t('javaMainClassLabel')}</span>
            <input type="text" id="java-ide-filename" value="Main.java">
            <span style="font-size:12px;color:var(--text-dim);margin-left:12px;">${t('javaFontSizeLabel')}</span>
            <select id="java-ide-fontsize" class="settings-input" style="width:auto;min-width:80px;">
              <option value="12">12</option>
              <option value="13" selected>13</option>
              <option value="14">14</option>
              <option value="16">16</option>
            </select>
          </div>
          <div id="java-ide-editor"></div>
          <div id="java-ide-console-wrap">
            <pre id="java-ide-console"></pre>
            <div id="java-ide-console-input-row">
              <span id="java-ide-console-prompt">$</span>
              <input id="java-ide-console-input" type="text" autocomplete="off" />
            </div>
          </div>
        </main>
      </div>
      <script src="https://unpkg.com/codemirror@5/lib/codemirror.js"></script>
      <script src="https://unpkg.com/codemirror@5/mode/clike/clike.js"></script>
      <script src="https://unpkg.com/codemirror@5/addon/hint/show-hint.js"></script>
      <link rel="stylesheet" href="https://unpkg.com/codemirror@5/addon/hint/show-hint.css">
    `;
    return baseHtml;
  },

  getSettingsContent() {
    const locales = getLocaleList();
    const options = locales.map(l => `<option value="${l}" ${getLocale() === l ? 'selected' : ''}>${l}</option>`).join('');
    const homepage = (typeof localStorage !== 'undefined' && localStorage.getItem('star-browser-homepage')) || 'https://www.baidu.com';
    const wallpaper = (typeof localStorage !== 'undefined' && localStorage.getItem('star-wallpaper')) || '';
    const showHiddenFiles = (typeof localStorage !== 'undefined' && localStorage.getItem('star-file-manager-show-hidden') === '1');
    return `
      <div id="settings-app" class="settings-root">
        <aside class="settings-nav">
          <button class="settings-nav-item active" data-section="system">${t('system')}</button>
          <button class="settings-nav-item" data-section="devices">${t('devices')}</button>
          <button class="settings-nav-item" data-section="personal">${t('settingsPersonalization')}</button>
          <button class="settings-nav-item" data-section="search">${t('settingsSearch')}</button>
          <button class="settings-nav-item" data-section="lock">${t('settingsLock')}</button>
          <button class="settings-nav-item" data-section="about">${t('about')}</button>
        </aside>
        <main class="settings-main">
          <section id="settings-section-system" class="settings-section">
            <h2>${t('system')}</h2>
            <div class="settings-block">
              <label>${t('language')}</label>
              <select id="settings-lang" class="settings-input">${options}</select>
            </div>
            <div class="settings-block">
              <label>${t('browserHomepage')}</label>
              <input type="text" id="settings-homepage" class="settings-input" value="${escapeHtml(homepage)}" placeholder="https://www.baidu.com">
            </div>
            <div class="settings-block">
              <label>${t('showHiddenFiles')}</label>
              <label style="display:flex;align-items:center;gap:10px;margin-top:8px;color:var(--text);cursor:pointer;user-select:none;">
                <input type="checkbox" id="settings-show-hidden-files" ${showHiddenFiles ? 'checked' : ''} style="accent-color:var(--accent);width:16px;height:16px;">
                <span style="font-size:13px;color:var(--text-dim);">${t('showHiddenFilesHint')}</span>
              </label>
            </div>
          </section>
          <section id="settings-section-devices" class="settings-section hidden">
            <h2>${t('devices')}</h2>
            <div id="settings-device-info" style="font-size:13px;color:var(--text-secondary);white-space:pre-wrap;"></div>
          </section>
          <section id="settings-section-personal" class="settings-section hidden">
            <h2>${t('settingsPersonalization')}</h2>
            <div class="settings-block">
              <label>${t('themeLabel')}</label>
              <select id="settings-theme" class="settings-input">
                <option value="dark">${t('themeDark')}</option>
                <option value="light">${t('themeLight')}</option>
              </select>
            </div>
            <div class="settings-block">
              <label>${t('wallpaper')} (${t('setWallpaper')})</label>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <input type="text" id="settings-wallpaper" class="settings-input" value="${escapeHtml(wallpaper)}" placeholder="${t('wallpaperPlaceholder')}" style="flex:1;min-width:200px;">
                <button id="settings-wallpaper-browse" class="start-footer-btn">${t('chooseLocalFile')}</button>
                <button id="settings-wallpaper-apply" class="start-footer-btn">${t('applyWallpaper')}</button>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                <button id="settings-wallpaper-default-light" class="start-footer-btn">${t('wallpaperDefaultLight')}</button>
                <button id="settings-wallpaper-default-deep" class="start-footer-btn">${t('wallpaperDefaultDeep')}</button>
                <button id="settings-wallpaper-default-blue" class="start-footer-btn">${t('wallpaperDefaultBlue')}</button>
                <button id="settings-wallpaper-default-aurora" class="start-footer-btn">${t('wallpaperDefaultAurora')}</button>
              </div>
            </div>
          </section>
          <section id="settings-section-search" class="settings-section hidden">
            <h2>${t('settingsSearch')}</h2>
            <div class="settings-block">
              <label>${t('searchAppsLabel')}</label>
              <input type="text" id="settings-search-input" class="settings-input" placeholder="${t('searchApps')}" />
            </div>
            <div id="settings-search-results" style="margin-top:8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;align-items:stretch;">
            </div>
            <div class="settings-block" style="margin-top:16px;">
              <label>${t('searchFilesLabel')}</label>
              <div style="display:flex;flex-direction:column;gap:6px;">
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <input type="text" id="settings-file-search-root" class="settings-input" placeholder="${t('fileSearchRootPlaceholder')}" style="flex:1;min-width:200px;">
                  <button id="settings-file-search-root-browse" class="start-footer-btn">${t('browseDots')}</button>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <input type="text" id="settings-file-search-keyword" class="settings-input" placeholder="${t('fileSearchKeywordPlaceholder')}" style="flex:1;min-width:200px;">
                  <button id="settings-file-search-btn" class="start-footer-btn">${t('searchFilesButton')}</button>
                </div>
              </div>
            </div>
            <div id="settings-file-search-results" style="margin-top:8px;max-height:260px;overflow:auto;border:1px solid var(--border);border-radius:8px;padding:6px 0;font-size:12px;">
            </div>
            <p style="color:var(--text-dim);font-size:12px;margin-top:8px;">${t('searchHintStartMenu')}</p>
          </section>
          <section id="settings-section-lock" class="settings-section hidden">
            <h2>${t('settingsLock')}</h2>
            <div class="settings-block">
              <label>${t('lockPasswordHelp')}</label>
              <input type="password" id="settings-lock-pin-old" class="settings-input" placeholder="${t('currentPasswordPlaceholder')}">
              <input type="password" id="settings-lock-pin-new" class="settings-input" placeholder="${typeof t === 'function' ? t('lockPinPlaceholder') : '输入新的锁屏密码（留空表示删除）'}" style="margin-top:8px;">
              <button id="settings-lock-pin-apply" class="start-footer-btn">${typeof t === 'function' ? t('savePassword') : '保存密码'}</button>
            </div>
          </section>
          <section id="settings-section-about" class="settings-section hidden">
            <h2>${t('about')}</h2>
            <p>${t('starOS')} ${t('version')} 1.0.0</p>
            ${getProjectDisclaimerCardContent('project-disclaimer-card--compact')}
            <div class="settings-block" style="margin-top:16px;">
              <h3 style="margin-bottom:8px;">${t('runWindowsApp')}</h3>
              <p style="color:var(--text-dim);font-size:13px;">${t('runWindowsAppDesc')}</p>
              <button id="settings-run" class="start-footer-btn" style="margin-top:8px;">${t('run')}</button>
            </div>
          </section>
        </main>
      </div>`;
  },

  getControlPanelContent() {
    return `
      <div id="control-panel-app" style="height:100%;padding:24px;overflow:auto;">
        <h2 style="margin-bottom:20px;">${t('controlPanel')}</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;">
          <button class="control-panel-item" data-open="settings" style="padding:20px;border:1px solid var(--border);border-radius:8px;background:var(--window-titlebar);color:var(--text);cursor:pointer;text-align:center;font-size:13px;">${t('settings')}</button>
          <button class="control-panel-item" data-open="file-manager" style="padding:20px;border:1px solid var(--border);border-radius:8px;background:var(--window-titlebar);color:var(--text);cursor:pointer;text-align:center;font-size:13px;">${t('fileManager')}</button>
          <button class="control-panel-item" data-open="network-tools" style="padding:20px;border:1px solid var(--border);border-radius:8px;background:var(--window-titlebar);color:var(--text);cursor:pointer;text-align:center;font-size:13px;">${t('networkTools')}</button>
        </div>
        <p style="margin-top:16px;color:var(--text-dim);font-size:12px;">${t('settingsHintConfigured').replace('{items}', `${t('wallpaper')}、${t('browserHomepage')}`).replace('{settings}', `「${t('settings')}」`)}</p>
      </div>`;
  },

  getNetworkToolsContent() {
    return `
      <div id="network-tools-app" style="height:100%;display:flex;flex-direction:column;padding:16px;">
        <h2 id="nt-title" style="margin-bottom:12px;">${t('networkTools')}</h2>
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <input type="text" id="nt-ping-input" style="flex:1;padding:8px 12px;background:var(--window-titlebar);border:1px solid var(--border);border-radius:4px;color:var(--text);" placeholder="${t('pingPlaceholder')}">
          <button id="nt-ping-btn" class="start-footer-btn">${t('goPing')}</button>
        </div>
        <div style="margin-bottom:8px;">
          <button id="nt-ipconfig-btn" class="start-footer-btn">${t('ipConfig')}</button>
        </div>
        <pre id="nt-output" style="flex:1;margin:0;padding:12px;background:#0d1117;color:#c9d1d9;font-size:12px;overflow:auto;border-radius:4px;white-space:pre-wrap;"></pre>
      </div>`;
  },

  getPaintContent() {
    return `
      <div id="paint-app" style="height:100%;display:flex;flex-direction:column;">
        <div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
          <input type="color" id="paint-color" value="#7c9cff" style="width:32px;height:32px;border:none;cursor:pointer;padding:0;">
          <input type="range" id="paint-size" min="1" max="40" value="4" style="width:80px;">
          <span id="paint-size-val" style="font-size:12px;">4px</span>
          <button id="paint-clear" class="start-footer-btn">${t('clear')}</button>
        </div>
        <canvas id="paint-canvas" style="flex:1;cursor:crosshair;display:block;background:#fff;"></canvas>
      </div>`;
  },

  getClockContent() {
    return `
      <div id="clock-app" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;">
        <div id="clock-time" style="font-size:48px;font-weight:200;letter-spacing:2px;margin-bottom:8px;">00:00:00</div>
        <div id="clock-date" style="font-size:16px;color:var(--text-dim);">—</div>
      </div>`;
  },

  getTetrisContent() {
    return `<div id="game-tetris" class="game-shell" style="height:100%;display:flex;justify-content:center;align-items:stretch;align-content:flex-start;flex-wrap:wrap;padding:10px 12px;gap:12px;min-height:0;">
      <div class="tetris-stage-col" style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;min-height:0;flex:0 1 var(--tetris-stage-width,360px);width:100%;max-width:var(--tetris-stage-width,360px);min-width:280px;">
        <div class="game-canvas-fit" style="flex:1;min-width:0;width:100%;">
          <canvas id="tetris-canvas" class="game-canvas" width="300" height="600"></canvas>
        </div>
        <div style="margin-top:8px;display:flex;gap:12px;">
          <button id="tetris-start" class="start-footer-btn">${t('startGame')}</button>
          <button id="tetris-pause" class="start-footer-btn">${t('pause')}</button>
        </div>
      </div>
      <div class="game-hud" style="flex:0 0 148px;max-width:148px;min-width:148px;color:var(--text);font-size:14px;display:flex;flex-direction:column;gap:4px;align-self:stretch;">
        <div>${t('score')}: <span id="tetris-score">0</span></div>
        <div>${t('level')}: <span id="tetris-level">1</span></div>
        <div>${t('lines')}: <span id="tetris-lines">0</span></div>
        <div>${t('highScore')}: <span id="tetris-high">0</span></div>
        <div style="margin-top:12px;">${t('next')}:</div>
        <canvas id="tetris-next" class="game-canvas" width="120" height="60" style="margin-top:4px;"></canvas>
        <div style="margin-top:8px;">${t('hold')}:</div>
        <canvas id="tetris-hold" class="game-canvas" width="120" height="60" style="margin-top:4px;"></canvas>
        <div id="tetris-controls" style="margin-top:12px;font-size:11px;color:var(--text-dim);display:flex;flex-direction:column;gap:4px;line-height:1.45;"></div>
      </div>
    </div>`;
  },
  getSnakeContent() {
    return `<div id="game-snake" class="game-shell" style="height:100%;display:flex;flex-direction:column;align-items:center;padding:12px;min-height:0;">
      <div class="game-hud" style="display:flex;justify-content:space-between;align-items:center;width:100%;max-width:720px;margin-bottom:8px;flex-shrink:0;gap:12px;">
        <span style="color:var(--text);">${t('score')}: <span id="snake-score">0</span></span>
        <span style="color:var(--text);">${t('highScore')}: <span id="snake-high">0</span></span>
      </div>
      <div class="game-canvas-fit" style="width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;">
        <canvas id="snake-canvas" class="game-canvas" width="400" height="400"></canvas>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px;">
        <button id="snake-start" class="start-footer-btn">${t('startGame')}</button>
        <button id="snake-pause" class="start-footer-btn">${t('pause')}</button>
      </div>
      <p style="font-size:11px;color:var(--text-dim);margin-top:8px;">${t('gameControlsSnake')}</p>
    </div>`;
  },
  getLinkContent() {
    return `<div id="game-link" class="game-shell" style="height:100%;display:flex;flex-direction:column;padding:12px;min-height:0;">
      <div class="game-hud" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-shrink:0;">
        <span style="color:var(--text);">${t('level')}: <span id="link-level">1</span> ${t('score')}: <span id="link-score">0</span></span>
        <div><button id="link-hint" class="start-footer-btn">${t('linkHint')}</button><button id="link-shuffle" class="start-footer-btn">${t('linkShuffle')}</button></div>
      </div>
      <div class="game-canvas-fit">
        <canvas id="link-canvas" class="game-canvas"></canvas>
      </div>
      <button id="link-start" class="start-footer-btn" style="margin-top:8px;">${t('startGame')}</button>
    </div>`;
  },
  getPlatformerContent() {
    return `<div id="game-platformer" class="game-shell" style="height:100%;display:flex;flex-direction:column;padding:8px;min-height:0;">
      <div class="game-hud" style="display:flex;justify-content:space-between;margin-bottom:4px;flex-shrink:0;">
        <span style="color:var(--text);">${t('level')}: <span id="plat-level">1</span> ${t('score')}: <span id="plat-score">0</span></span>
      </div>
      <div class="game-canvas-fit" style="flex:1;min-height:0;">
        <canvas id="plat-canvas" class="game-canvas"></canvas>
      </div>
      <div style="display:flex;gap:10px;margin-top:6px;">
        <button id="plat-start" class="start-footer-btn">${t('startGame')}</button>
        <button id="plat-pause" class="start-footer-btn">${t('pause')}</button>
      </div>
      <p style="font-size:11px;color:var(--text-dim);">${t('gameControlsPlatformer')}</p>
    </div>`;
  },
  getLandlordContent() {
    return `<div id="game-landlord" class="landlord-root">
      <div class="landlord-top">
        <span>${t('score')}: <span id="landlord-score">0</span></span>
        <span id="landlord-status" class="landlord-status">${t('landlordReady')}</span>
      </div>
      <div class="landlord-table">
        <div id="landlord-opp1-wrap" class="landlord-opp-wrap left">
          <div id="landlord-bubble-opp1" class="landlord-bubble hidden"></div>
          <div id="landlord-opp1" class="landlord-opp left">
            <span class="landlord-opp-name">${t('landlordUpper')}</span>
            <div class="landlord-opp-count-badge">
              <span id="landlord-opp1-count" class="landlord-opp-count">0</span>
              <span class="landlord-opp-count-unit">${t('cardUnit')}</span>
            </div>
          </div>
        </div>
        <div class="landlord-center-wrap">
          <div id="landlord-bottom-cards" class="landlord-bottom-cards hidden"></div>
          <div id="landlord-last-who" class="landlord-last-who"></div>
          <div id="landlord-pass-banner" class="landlord-pass-banner hidden"></div>
          <div id="landlord-center" class="landlord-last-play hidden"></div>
          <div id="landlord-bidding-panel" class="landlord-bidding-panel hidden">
            <p class="landlord-bid-title">${t('landlordAsk')}</p>
            <div class="landlord-bid-btns">
              <button type="button" id="landlord-bid-call" class="landlord-btn landlord-btn-call">${t('landlordCall')}</button>
              <button type="button" id="landlord-bid-pass" class="landlord-btn landlord-btn-pass">${t('landlordNoCall')}</button>
            </div>
          </div>
        </div>
        <div id="landlord-opp2-wrap" class="landlord-opp-wrap right">
          <div id="landlord-bubble-opp2" class="landlord-bubble hidden"></div>
          <div id="landlord-opp2" class="landlord-opp right">
            <span class="landlord-opp-name">${t('landlordLower')}</span>
            <div class="landlord-opp-count-badge">
              <span id="landlord-opp2-count" class="landlord-opp-count">0</span>
              <span class="landlord-opp-count-unit">${t('cardUnit')}</span>
          </div>
        </div>
      </div>
      </div>
      <div class="landlord-hand-tray">
        <div id="landlord-turn-prompt" class="landlord-turn-prompt landlord-turn-prompt-inline"></div>
      <div id="landlord-hand" class="landlord-hand"></div>
      </div>
      <div class="landlord-actions">
        <div class="landlord-actions-main">
        <button type="button" id="landlord-pass" class="landlord-btn landlord-btn-pass">${t('landlordPass')}</button>
          <button type="button" id="landlord-hint" class="landlord-btn">${t('landlordHint')}</button>
        <button type="button" id="landlord-play" class="landlord-btn landlord-btn-play">${t('landlordPlay')}</button>
        </div>
        <div class="landlord-actions-side">
          <button type="button" id="landlord-start" class="landlord-btn">${t('startGame')}</button>
        </div>
      </div>
    </div>`;
  },
  getRunnerContent() {
    return `<div id="game-runner" class="game-shell" style="height:100%;display:flex;flex-direction:column;padding:8px;min-height:0;">
      <div class="game-hud" style="display:flex;justify-content:space-between;margin-bottom:4px;color:var(--text);flex-shrink:0;">
        <span>${t('score')}: <span id="runner-score">0</span></span>
        <span>${t('highScore')}: <span id="runner-high">0</span></span>
      </div>
      <div class="game-canvas-fit">
        <canvas id="runner-canvas" class="game-canvas"></canvas>
      </div>
      <div style="display:flex;gap:10px;margin-top:6px;">
        <button id="runner-start" class="start-footer-btn">${t('startGame')}</button>
        <button id="runner-pause" class="start-footer-btn">${t('pause')}</button>
      </div>
      <p style="font-size:11px;color:var(--text-dim);">${t('gameControlsRunner')}</p>
    </div>`;
  },
  getTankContent() {
    return `<div id="game-tank" class="game-shell" style="height:100%;display:flex;flex-direction:column;padding:8px;min-height:0;">
      <div class="game-hud" style="display:flex;justify-content:space-between;gap:10px;margin-bottom:6px;color:var(--text);flex-shrink:0;flex-wrap:wrap;align-items:center;">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <span><span data-i18n="level">${t('level')}</span>: <span id="tank-level">1</span></span>
          <span><span data-i18n="score">${t('score')}</span>: <span id="tank-score">0</span></span>
          <span><span data-i18n="livesLabel">${t('livesLabel')}</span>: <span id="tank-lives">3</span></span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:12px;color:var(--text-dim);" data-i18n="tankSelectLevel">${t('tankSelectLevel')}</span>
          <select id="tank-level-select" class="settings-input"
            style="height:30px;min-width:170px;padding:0 34px 0 10px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:var(--text);outline:none;cursor:pointer;">
          </select>
        </div>
      </div>
      <div class="game-canvas-fit">
        <canvas id="tank-canvas" class="game-canvas" style="max-width:100%;max-height:100%;"></canvas>
      </div>
      <button id="tank-start" class="start-footer-btn" style="margin-top:6px;">${t('startGame')}</button>
      <p style="font-size:11px;color:var(--text-dim);" data-i18n="gameControlsTank">${t('gameControlsTank')}</p>
    </div>`;
  },
  getPlaneContent() {
    return `<div id="game-plane" class="game-shell" style="height:100%;display:flex;flex-direction:column;padding:8px;min-height:0;">
      <div class="game-hud" style="display:flex;justify-content:space-between;margin-bottom:4px;color:var(--text);flex-shrink:0;">
        <span>${t('score')}: <span id="plane-score">0</span> ${t('highScore')}: <span id="plane-high">0</span></span>
      </div>
      <div class="game-canvas-fit">
        <canvas id="plane-canvas" class="game-canvas"></canvas>
      </div>
      <div style="display:flex;gap:10px;margin-top:6px;">
        <button id="plane-start" class="start-footer-btn">${t('startGame')}</button>
        <button id="plane-pause" class="start-footer-btn">${t('pause')}</button>
      </div>
      <p style="font-size:11px;color:var(--text-dim);">${t('gameControlsPlane')}</p>
    </div>`;
  },

  getGomokuContent() {
    return `<div id="game-gomoku" class="game-shell" tabindex="0" style="height:100%;display:flex;flex-direction:column;padding:12px;min-height:0;outline:none;">
      <div class="game-hud" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;color:var(--text);">
        <span id="gomoku-status">${t('gomokuInitialStatus')}</span>
        <button id="gomoku-restart" class="start-footer-btn">${t('gomokuRestart')}</button>
      </div>
      <div class="game-canvas-fit" style="flex:1;min-height:0;">
        <canvas id="gomoku-canvas" class="game-canvas"></canvas>
      </div>
      <p style="margin:8px 0 0;font-size:12px;color:var(--text-dim);">${t('gomokuHint')}</p>
    </div>`;
  },
  getMinesweeperContent() {
    return `<div id="game-minesweeper" class="game-shell" style="height:100%;display:flex;flex-direction:column;padding:12px;min-height:0;">
      <div class="game-hud" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;color:var(--text);">
        <span id="minesweeper-info">${t('minesweeperSummary').replace('{mines}', '10').replace('{flags}', '0').replace('{opened}', '0')}</span>
        <button id="minesweeper-restart" class="start-footer-btn">${t('minesweeperNewGame')}</button>
      </div>
      <div id="minesweeper-board" class="ms-board" style="margin:auto;"></div>
      <p style="margin:10px 0 0;font-size:12px;color:var(--text-dim);">${t('minesweeperHint')}</p>
    </div>`;
  },
  get2048Content() {
    return `<div id="game-2048" class="game-shell" tabindex="0" style="height:100%;display:flex;flex-direction:column;padding:12px;min-height:0;outline:none;">
      <div class="game-hud" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;color:var(--text);">
        <span>${t('game2048ScoreSummary').replace('{score}', '<span id="game2048-score">0</span>').replace('{best}', '<span id="game2048-best">0</span>')}</span>
        <button id="game2048-new" class="start-footer-btn">${t('game2048NewGame')}</button>
      </div>
      <div id="game2048-grid" class="game2048-grid"></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:260px;margin:14px auto 0;">
        <div></div>
        <button class="start-footer-btn" data-dir="up">↑</button>
        <div></div>
        <button class="start-footer-btn" data-dir="left">←</button>
        <button class="start-footer-btn" data-dir="down">↓</button>
        <button class="start-footer-btn" data-dir="right">→</button>
      </div>
      <p id="game2048-status" style="margin:12px 0 0;font-size:12px;color:var(--text-dim);">${t('game2048InitialStatus')}</p>
    </div>`;
  },
  getOthelloContent() {
    return `<div id="game-othello" class="game-shell" style="height:100%;display:flex;flex-direction:column;padding:12px;min-height:0;">
      <div class="game-hud" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;color:var(--text);">
        <span id="othello-score">${t('chineseChessScoreSummary')}</span>
        <button id="othello-restart" class="start-footer-btn">${t('gomokuRestart')}</button>
      </div>
      <div id="othello-board" style="flex:1;min-height:0;"></div>
      <p id="othello-status" style="margin:10px 0 0;font-size:12px;color:var(--text-dim);">${t('chineseChessInitialStatus')}</p>
    </div>`;
  },
  getOthelloContent() {
    return `<div id="game-othello" class="game-shell" style="height:100%;display:flex;flex-direction:column;padding:12px;min-height:0;">
      <div class="game-hud" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;color:var(--text);flex-wrap:wrap;">
        <span id="othello-score">${t('chineseChessScoreSummary')}</span>
        <button id="othello-restart" class="start-footer-btn">${t('gomokuRestart')}</button>
      </div>
      <div id="othello-board" style="flex:1;min-height:0;"></div>
      <p id="othello-status" style="margin:10px 0 0;font-size:12px;color:var(--text-dim);">${t('chineseChessInitialStatus')}</p>
    </div>`;
  },

  getSokobanContent() {
    return `<div id="game-sokoban" class="game-shell" tabindex="0" style="height:100%;display:flex;flex-direction:column;padding:12px;min-height:0;outline:none;">
      <div class="game-hud" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;color:var(--text);flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span>${t('stageLabel')}</span>
          <select id="sokoban-level-select" class="game-select" aria-label="${t('stageLabel')}"></select>
          <span style="font-size:12px;color:var(--text-dim);">(<span id="sokoban-level">1</span>)</span>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="sokoban-prev" class="start-footer-btn">${t('previousLevel')}</button>
          <button id="sokoban-reset" class="start-footer-btn">${t('resetLabel')}</button>
          <button id="sokoban-next" class="start-footer-btn">${t('nextLevelLabel')}</button>
        </div>
      </div>
      <div id="sokoban-board-wrap" style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:8px 0;">
      <div id="sokoban-board" style="margin:auto;"></div>
      </div>
      <div class="sokoban-touch-pad" style="grid-template-columns:repeat(3,48px);gap:8px;justify-content:center;margin-top:12px;">
        <div></div>
        <button class="start-footer-btn" data-dir="up">↑</button>
        <div></div>
        <button class="start-footer-btn" data-dir="left">←</button>
        <button class="start-footer-btn" data-dir="down">↓</button>
        <button class="start-footer-btn" data-dir="right">→</button>
      </div>
      <p id="sokoban-status" style="margin:12px 0 0;font-size:12px;color:var(--text-dim);">${t('sokobanSteps').replace('{steps}', '0')}</p>
    </div>`;
  },
  getStarUnzipContent() {
    const T = (k, d) => (typeof t === 'function' ? t(k, d) : d);
    return `<div id="star-unzip-app" style="height:100%;display:flex;flex-direction:column;padding:12px;background:var(--window-bg);min-height:0;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
          <button id="unzip-open" class="start-footer-btn">${T('open', '打开')}</button>
          <button id="unzip-extract-all" class="start-footer-btn" disabled>${T('unzipExtractAll', '解压全部')}</button>
        <button id="unzip-extract-selected" class="start-footer-btn" disabled>${T('unzipExtractSelected', '解压选中')}</button>
        <button id="unzip-extract-to" class="start-footer-btn" disabled>${T('unzipExtractTo', '解压到…')}</button>
        <button id="unzip-add" class="start-footer-btn" disabled>${T('unzipAddFiles', '添加文件')}</button>
        <button id="unzip-new" class="start-footer-btn">${T('unzipNewArchive', '新建压缩包')}</button>
        <span id="unzip-path" style="font-size:12px;color:var(--text-dim);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
      </div>
        <div style="flex:1;min-height:0;display:flex;flex-direction:column;border:1px solid var(--border);border-radius:8px;overflow:hidden;">
          <div id="unzip-list-wrap" style="flex:1;min-height:0;overflow:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead><tr>
                <th style="text-align:left;padding:8px;width:28px;"><input type="checkbox" id="unzip-select-all" title="${T('selectAll', '全选')}"></th>
                <th id="unzip-head-name" style="text-align:left;padding:8px;">${T('name', '名称')}</th>
                <th id="unzip-head-size" style="text-align:right;padding:8px;width:100px;">${T('size', '大小')}</th>
              </tr></thead>
              <tbody id="unzip-tbody"></tbody>
            </table>
        </div>
        <p id="unzip-status" style="margin:8px 12px;font-size:12px;color:var(--text-dim);"></p>
      </div>
    </div>`;
  },
  getSudokuLegacyContent() {
    return `<div id="game-sudoku" class="game-shell" style="height:100%;display:flex;flex-direction:column;padding:12px;min-height:0;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;color:var(--text);">
        <span>${t('gameSudoku')}</span>
        <button id="sudoku-new" class="start-footer-btn">${t('game2048NewGame')}</button>
      </div>
      <div id="sudoku-board" style="padding:8px;border-radius:16px;background:rgba(255,255,255,0.08);"></div>
      <p id="sudoku-status" style="margin:12px 0 0;font-size:12px;color:var(--text-dim);">${t('pvzHint')}</p>
    </div>`;
  },
  getSolitaireContent() {
    return `<div id="game-solitaire" class="game-shell" style="height:100%;display:flex;flex-direction:column;padding:12px;min-height:0;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;color:var(--text);">
        <span id="solitaire-status">${t('spiderDefaultStatus')}</span>
        <button id="solitaire-new" class="start-footer-btn">${t('spiderNewGame')}</button>
      </div>
      <div style="display:grid;grid-template-columns:80px 80px 1fr;gap:12px;margin-bottom:12px;">
        <div id="solitaire-stock"></div>
        <div id="solitaire-waste"></div>
        <div id="solitaire-foundations" style="display:grid;grid-template-columns:repeat(4,80px);gap:12px;justify-content:end;"></div>
      </div>
      <div id="solitaire-tableau" style="display:grid;grid-template-columns:repeat(7,1fr);gap:12px;flex:1;min-height:0;"></div>
    </div>`;
  },

  getSudokuContent() {
    return `<div id="game-sudoku" class="game-shell" style="height:100%;display:flex;flex-direction:column;padding:12px;background:linear-gradient(180deg,#17301d 0%,#0c1514 100%);min-height:0;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;color:#f8fafc;flex-wrap:wrap;">
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
          <span>${t('sunLabel')} <strong id="td-sun">150</strong></span>
          <span>${t('stageLabel')} <strong id="td-level">1</strong></span>
          <span>${t('livesLabel')} <strong id="td-lives">5</strong></span>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="td-start" class="start-footer-btn">${t('battleStart')}</button>
          <button id="td-next" class="start-footer-btn" data-ready="false">${t('nextLevelLabel')}</button>
          <button id="td-reset" class="start-footer-btn">${t('restartCurrentLevel')}</button>
        </div>
      </div>
      <div id="td-plant-bar" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;"></div>
      <div id="td-board-wrap" style="position:relative;flex:1;min-height:0;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);background:linear-gradient(180deg,#78c850 0%,#4c9c3f 100%);">
        <div id="td-suns-layer" style="position:absolute;inset:0;pointer-events:none;"></div>
        <div id="td-grid" style="position:absolute;inset:0;display:grid;grid-template-columns:repeat(9,1fr);grid-template-rows:repeat(5,1fr);gap:2px;padding:10px;"></div>
        <div id="td-zombie-layer" style="position:absolute;inset:10px;"></div>
        <div id="td-pea-layer" style="position:absolute;inset:10px;pointer-events:none;"></div>
      </div>
      <p id="sudoku-status" style="margin:12px 0 0;font-size:12px;color:rgba(248,250,252,0.86);">${t('pvzHint')}</p>
    </div>`;
  },
  getSolitaireContent() {
    return `<div id="game-solitaire" class="game-shell" style="height:100%;display:flex;flex-direction:column;padding:12px;min-height:0;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;color:#f8fafc;flex-wrap:wrap;">
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
          <span id="solitaire-status">${t('spiderDefaultStatus')}</span>
          <span>${t('spiderCompletedSummary').replace('{complete}', '<strong id="spider-complete">0</strong>')}</span>
          <span>${t('spiderMovesSummary').replace('{moves}', '<strong id="spider-moves">0</strong>')}</span>
        </div>
        <button id="solitaire-new" class="start-footer-btn">${t('spiderNewGame')}</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,80px) 1fr;gap:12px;margin-bottom:12px;align-items:start;">
        <div id="solitaire-stock" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;grid-column:span 5;"></div>
        <div id="solitaire-foundations" style="display:grid;grid-template-columns:repeat(8,56px);gap:8px;justify-content:end;"></div>
      </div>
      <div id="solitaire-tableau" style="display:grid;grid-template-columns:repeat(10,1fr);gap:10px;flex:1;min-height:0;"></div>
    </div>`;
  },

  getSolitaireContent() {
    return `<div id="game-solitaire" class="game-shell" style="height:100%;display:flex;flex-direction:column;padding:12px;min-height:0;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;color:#f8fafc;flex-wrap:wrap;">
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
          <span id="solitaire-status">${t('spiderDefaultStatus')}</span>
          <span>${t('spiderCompletedSummary').replace('{complete}', '<strong id="spider-complete">0</strong>')}</span>
          <span>${t('spiderMovesSummary').replace('{moves}', '<strong id="spider-moves">0</strong>')}</span>
        </div>
        <button id="solitaire-new" class="start-footer-btn">${t('spiderNewGame')}</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,80px) 1fr;gap:12px;margin-bottom:12px;align-items:start;">
        <div id="solitaire-stock" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;grid-column:span 5;"></div>
        <div id="solitaire-foundations" style="display:grid;grid-template-columns:repeat(8,56px);gap:8px;justify-content:end;"></div>
      </div>
      <div id="solitaire-tableau" style="display:grid;grid-template-columns:repeat(10,1fr);gap:10px;flex:1;min-height:0;"></div>
    </div>`;
  },

  getCarrotDefenseContent() {
    return `<div id="game-carrot-defense" class="game-shell" style="height:100%;display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:14px;padding:14px;background:linear-gradient(180deg,#14281d 0%,#0b1410 100%);min-height:0;color:#f8fafc;">
      <div style="display:flex;flex-direction:column;min-width:0;min-height:0;gap:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 14px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.08);box-shadow:0 18px 48px rgba(0,0,0,.25);">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
            <div style="display:flex;flex-direction:column;gap:4px;">
              <strong id="carrot-level-name" style="font-size:18px;">${t('carrotLevelTitle').replace('{0}','1').replace('{1}', t('gameCarrotDefense'))}</strong>
              <span id="carrot-theme-label" style="font-size:12px;color:rgba(248,250,252,.72);">${t('meadow')}</span>
            </div>
            <span id="carrot-status" style="padding:6px 10px;border-radius:999px;background:rgba(250,204,21,.14);color:#fde68a;font-size:12px;font-weight:700;">${t('waiting')}</span>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span id="carrot-gold-top" style="padding:7px 12px;border-radius:999px;background:linear-gradient(180deg,rgba(250,204,21,.24),rgba(234,179,8,.14));border:1px solid rgba(253,224,71,.28);color:#fde68a;font-size:13px;font-weight:800;">${t('gold').replace('{0}','0')}</span>
              <span id="carrot-base-top" style="display:none;padding:7px 12px;border-radius:999px;background:rgba(15,23,42,.42);border:1px solid rgba(255,255,255,.08);color:#f8fafc;font-size:13px;font-weight:700;">${t('base').replace('{0}','10')}</span>
              <span id="carrot-wave-top" style="padding:7px 12px;border-radius:999px;background:rgba(15,23,42,.42);border:1px solid rgba(255,255,255,.08);color:#f8fafc;font-size:13px;font-weight:700;">${t('wave').replace('{0}','0').replace('{1}','0')}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(248,250,252,.76);">
              <span>${t('stageLabel')}</span>
              <select id="carrot-level-select" style="height:34px;min-width:170px;padding:0 10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(15,23,42,.58);color:#f8fafc;"></select>
            </label>
            <button id="carrot-start" class="start-footer-btn">${t('start')}</button>
            <button id="carrot-pause" class="start-footer-btn">${t('pause')}</button>
            <button id="carrot-reset" class="start-footer-btn">${t('restartCurrentLevel')}</button>
          </div>
        </div>
        <div style="position:relative;flex:1;min-height:0;padding:12px;border-radius:22px;background:linear-gradient(180deg,rgba(20,44,32,.95),rgba(8,15,12,.98));border:1px solid rgba(255,255,255,.08);box-shadow:0 24px 56px rgba(0,0,0,.32);overflow:hidden;">
          <canvas id="carrot-canvas" width="960" height="600" style="width:100%;height:100%;display:block;border-radius:16px;background:#1b3127;"></canvas>
          <div style="position:absolute;left:20px;bottom:20px;display:flex;gap:8px;flex-wrap:wrap;pointer-events:none;">
            <span id="carrot-wave" style="padding:6px 10px;border-radius:999px;background:rgba(15,23,42,.7);font-size:12px;font-weight:700;">${t('wave').replace('{0}','0').replace('{1}','0')}</span>
            <span id="carrot-base" style="display:none;padding:6px 10px;border-radius:999px;background:rgba(15,23,42,.7);font-size:12px;font-weight:700;">${t('base').replace('{0}','10')}</span>
            <span id="carrot-gold" style="padding:6px 10px;border-radius:999px;background:rgba(15,23,42,.7);font-size:12px;font-weight:700;">${t('gold').replace('{0}','0')}</span>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;min-height:0;gap:12px;overflow:hidden;">
        <div style="padding:14px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;min-height:0;flex:0 0 auto;">
          <div style="font-size:13px;font-weight:700;margin-bottom:10px;">${t('carrotSelectTower')}</div>
          <div id="carrot-tower-bar" style="display:grid;grid-template-columns:1fr;gap:6px;max-height:min(34vh,290px);overflow:auto;padding-right:4px;scrollbar-width:thin;"></div>
        </div>
        <div style="padding:14px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.08);flex:0 0 auto;">
          <div style="font-size:13px;font-weight:700;margin-bottom:10px;">${t('carrotSelectedLabel')}</div>
          <div id="carrot-selection" style="font-size:13px;line-height:1.6;color:rgba(248,250,252,.84);min-height:96px;">${t('carrotNoSelectionDesc')}</div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button id="carrot-upgrade" class="start-footer-btn" style="flex:1;">${t('carrotUpgradeButton')}</button>
            <button id="carrot-sell" class="start-footer-btn" style="flex:1;">${t('carrotSellButton')}</button>
          </div>
        </div>
        <div style="padding:14px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;gap:10px;min-height:0;flex:1 1 auto;overflow:auto;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <strong style="font-size:13px;">${t('linkHint')}</strong>
            <span id="carrot-progress" style="font-size:12px;color:rgba(248,250,252,.68);">${t('carrotProgressSummary').replace('{0}','0').replace('{1}','0')}</span>
          </div>
          <div id="carrot-level-notes" style="font-size:12px;line-height:1.6;color:rgba(248,250,252,.76);white-space:pre-line;">${t('levelIntroLongRoute')}</div>
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
            <div style="padding:10px;border-radius:14px;background:rgba(15,23,42,.35);">
              <div style="font-size:12px;color:rgba(248,250,252,.66);">${t('theme')}</div>
              <div id="carrot-theme-count" style="font-size:15px;font-weight:700;">2 / 10</div>
            </div>
            <div style="padding:10px;border-radius:14px;background:rgba(15,23,42,.35);">
              <div style="font-size:12px;color:rgba(248,250,252,.66);">${t('stageLabel')}</div>
              <div id="carrot-level-count" style="font-size:15px;font-weight:700;">10 / 200</div>
            </div>
          </div>
          <div id="carrot-legend" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;"></div>
        </div>
      </div>
    </div>`;
  },

  getTaskManagerContent() {
    return `
      <div id="task-manager-app" style="height:100%;display:flex;flex-direction:column;padding:12px;box-sizing:border-box;gap:12px;">
        <style>
          #task-manager-app .tm-tab-row { display:flex; gap:8px; flex-wrap:wrap; }
          #task-manager-app .tm-tab {
            padding:10px 18px;
            border:1px solid var(--border);
            border-radius:12px;
            background:var(--window-titlebar);
            color:var(--text);
            cursor:pointer;
            transition:background .18s ease,border-color .18s ease,transform .18s ease;
          }
          #task-manager-app .tm-tab.active {
            background:color-mix(in srgb, var(--accent) 24%, var(--window-bg));
            border-color:color-mix(in srgb, var(--accent) 70%, var(--border));
            color:var(--text);
          }
          #task-manager-app .tm-panel { min-height:0; flex:1; display:flex; flex-direction:column; gap:10px; }
          #task-manager-app .tm-grid-head,
          #task-manager-app .tm-row {
            display:grid;
            grid-template-columns:minmax(180px,1.9fr) 72px 88px 108px 92px 92px 116px;
            gap:6px;
            align-items:center;
            min-width:0;
            width:100%;
            box-sizing:border-box;
          }
          #task-manager-app .tm-grid-head {
            padding:0 8px 8px;
            border-bottom:1px solid var(--border);
          }
          #task-manager-app .tm-head-cell {
            min-width:0;
            font-size:12px;
            color:var(--text-dim);
          }
          #task-manager-app .tm-head-cell.metric {
            display:flex;
            flex-direction:column;
            gap:2px;
            align-items:flex-start;
          }
          #task-manager-app .tm-head-cell.metric strong {
            font-size:28px;
            line-height:1;
            color:var(--text);
            font-weight:800;
          }
          #task-manager-app .tm-head-cell.metric span {
            font-size:12px;
            color:var(--text-dim);
          }
          #task-manager-app .tm-process-list {
            flex:1;
            min-height:0;
            overflow-y:auto;
            overflow-x:hidden;
            display:flex;
            flex-direction:column;
            gap:8px;
            padding-right:2px;
          }
          #task-manager-app .tm-row {
            padding:10px 8px;
            border:1px solid var(--border);
            border-radius:14px;
            background:color-mix(in srgb, var(--window-titlebar) 70%, transparent);
            cursor:pointer;
            user-select:none;
            transition:border-color .16s ease, background .16s ease, transform .16s ease;
          }
          #task-manager-app .tm-row:hover {
            border-color:color-mix(in srgb, var(--accent) 40%, var(--border));
            transform:translateY(-1px);
          }
          #task-manager-app .tm-row.focused:not(.selected) {
            border-color:color-mix(in srgb, var(--accent) 42%, var(--border));
            box-shadow:0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent) inset;
          }
          #task-manager-app .tm-row.selected {
            border-color:color-mix(in srgb, var(--accent) 78%, var(--border));
            background:color-mix(in srgb, var(--accent) 12%, var(--window-titlebar));
            box-shadow:0 0 0 1px color-mix(in srgb, var(--accent) 32%, transparent) inset, 0 10px 26px rgba(0, 0, 0, 0.16);
          }
          #task-manager-app .tm-row.selected:hover {
            border-color:color-mix(in srgb, var(--accent) 86%, var(--border));
          }
          #task-manager-app .tm-row:focus-visible {
            outline:2px solid color-mix(in srgb, var(--accent) 72%, transparent);
            outline-offset:2px;
          }
          #task-manager-app .tm-name-cell {
            display:flex;
            align-items:center;
            gap:10px;
            min-width:0;
          }
          #task-manager-app .tm-app-badge {
            width:12px;
            height:12px;
            border-radius:999px;
            background:linear-gradient(135deg, color-mix(in srgb, var(--accent) 84%, #fff) 0%, color-mix(in srgb, var(--accent) 58%, #50e3c2) 100%);
            box-shadow:0 0 0 2px rgba(255,255,255,0.06);
            flex:0 0 auto;
          }
          #task-manager-app .tm-app-title {
            min-width:0;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            font-weight:600;
          }
          #task-manager-app .tm-value {
            font-variant-numeric:tabular-nums;
            color:var(--text);
            font-size:13px;
            min-width:0;
            white-space:nowrap;
          }
          #task-manager-app .tm-row .tm-end-btn {
            width:100%;
          }
          #task-manager-app .tm-footer {
            display:flex;
            justify-content:space-between;
            gap:12px;
            align-items:center;
            flex-wrap:wrap;
          }
          #task-manager-app .tm-footnote {
            color:var(--text-dim);
            font-size:12px;
            white-space:pre-wrap;
          }
          #task-manager-app .tm-perf-grid {
            display:grid;
            grid-template-columns:repeat(4,minmax(0,1fr));
            gap:10px;
          }
          #task-manager-app .tm-perf-card {
            border:1px solid var(--border);
            border-radius:16px;
            background:linear-gradient(180deg, color-mix(in srgb, var(--window-titlebar) 88%, transparent) 0%, color-mix(in srgb, var(--window-bg) 94%, transparent) 100%);
            padding:14px;
            min-height:118px;
            display:flex;
            flex-direction:column;
            justify-content:space-between;
            gap:10px;
          }
          #task-manager-app .tm-perf-value {
            font-size:34px;
            line-height:1;
            font-weight:800;
            color:var(--text);
          }
          #task-manager-app .tm-perf-label {
            color:var(--text-dim);
            font-size:12px;
            text-transform:uppercase;
            letter-spacing:.08em;
          }
          #task-manager-app .tm-perf-sub {
            color:var(--text-secondary);
            font-size:12px;
            line-height:1.5;
            white-space:pre-wrap;
          }
          #task-manager-app .tm-perf-detail {
            display:grid;
            grid-template-columns:1.1fr 1fr;
            gap:12px;
            min-height:0;
          }
          #task-manager-app .tm-perf-section {
            border:1px solid var(--border);
            border-radius:16px;
            background:color-mix(in srgb, var(--window-titlebar) 72%, transparent);
            padding:14px;
            min-height:180px;
            display:flex;
            flex-direction:column;
            gap:10px;
          }
          #task-manager-app .tm-perf-section h4 {
            margin:0;
            font-size:13px;
            color:var(--text);
          }
          #task-manager-app .tm-prelike {
            flex:1;
            min-height:0;
            margin:0;
            color:var(--text-secondary);
            font-size:13px;
            line-height:1.65;
            white-space:pre-wrap;
            overflow:auto;
          }
          @media (max-width: 900px) {
            #task-manager-app .tm-grid-head,
            #task-manager-app .tm-row {
              grid-template-columns:minmax(156px,1.7fr) 64px 78px 92px 88px 88px 102px;
            }
            #task-manager-app .tm-perf-grid,
            #task-manager-app .tm-perf-detail {
              grid-template-columns:1fr 1fr;
            }
          }
        </style>
        <div class="tm-tab-row">
          <button type="button" id="tm-tab-processes" class="tm-tab active">${t('processes')}</button>
          <button type="button" id="tm-tab-performance" class="tm-tab">${t('performance')}</button>
        </div>
        <div id="tm-panel-processes" class="tm-panel">
          <div class="tm-grid-head">
            <div class="tm-head-cell" id="tm-head-name">${t('name')}</div>
            <div class="tm-head-cell" id="tm-head-pid">${t('pid') || 'PID'}</div>
            <div class="tm-head-cell metric"><strong id="tm-summary-cpu">0%</strong><span id="tm-head-cpu">${t('cpu')}</span></div>
            <div class="tm-head-cell metric"><strong id="tm-summary-memory">0%</strong><span id="tm-head-memory">${t('memory')}</span></div>
            <div class="tm-head-cell metric"><strong id="tm-summary-disk">0%</strong><span id="tm-head-disk">${t('disk') || 'Disk'}</span></div>
            <div class="tm-head-cell metric"><strong id="tm-summary-network">0%</strong><span id="tm-head-network">${t('network') || 'Network'}</span></div>
            <div class="tm-head-cell" id="tm-head-close">${t('endTask') || 'End task'}</div>
          </div>
          <div id="tm-process-list" class="tm-process-list"></div>
          <div class="tm-footer">
            <div id="tm-process-footnote" class="tm-footnote"></div>
            <button id="tm-refresh" class="start-footer-btn">${t('refresh')}</button>
        </div>
        </div>
        <div id="tm-panel-performance" class="tm-panel hidden" style="overflow:auto;">
          <div class="tm-perf-grid">
            <section class="tm-perf-card">
              <div class="tm-perf-label" id="tm-perf-cpu-label">${t('cpu')}</div>
              <div class="tm-perf-value" id="tm-perf-cpu-value">0%</div>
              <div class="tm-perf-sub" id="tm-perf-cpu-sub">--</div>
            </section>
            <section class="tm-perf-card">
              <div class="tm-perf-label" id="tm-perf-memory-label">${t('memory')}</div>
              <div class="tm-perf-value" id="tm-perf-memory-value">0%</div>
              <div class="tm-perf-sub" id="tm-perf-memory-sub">--</div>
            </section>
            <section class="tm-perf-card">
              <div class="tm-perf-label" id="tm-perf-disk-label">${t('disk') || 'Disk'}</div>
              <div class="tm-perf-value" id="tm-perf-disk-value">0%</div>
              <div class="tm-perf-sub" id="tm-perf-disk-sub">--</div>
            </section>
            <section class="tm-perf-card">
              <div class="tm-perf-label" id="tm-perf-network-label">${t('network') || 'Network'}</div>
              <div class="tm-perf-value" id="tm-perf-network-value">0%</div>
              <div class="tm-perf-sub" id="tm-perf-network-sub">--</div>
            </section>
          </div>
          <div class="tm-perf-detail">
            <section class="tm-perf-section">
              <h4 id="tm-memory-title">${t('memory')}</h4>
              <pre id="tm-memory" class="tm-prelike"></pre>
            </section>
            <section class="tm-perf-section">
              <h4 id="tm-device-title">${t('cpu')} / ${t('system')}</h4>
              <pre id="tm-device" class="tm-prelike"></pre>
            </section>
          </div>
          <div class="tm-footer">
            <div id="tm-last-updated" class="tm-footnote"></div>
            <button id="tm-perf-refresh" class="start-footer-btn">${t('refresh')}</button>
          </div>
        </div>
      </div>`;
  },

  getScreenshotContent() {
    return `
      <div id="screenshot-app" style="height:100%;display:flex;flex-direction:column;padding:16px;">
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <button id="ss-capture" class="start-footer-btn">${t('captureScreen')}</button>
          <button id="ss-save" class="start-footer-btn" disabled>${t('saveImage')}</button>
          <button id="ss-copy" class="start-footer-btn" disabled>${t('copyToClipboard')}</button>
        </div>
        <div style="flex:1;min-height:200px;overflow:auto;border:1px solid var(--border);border-radius:8px;background:var(--window-titlebar);display:flex;align-items:center;justify-content:center;">
          <img id="ss-image" alt="" style="max-width:100%;max-height:100%;object-fit:contain;display:none;">
          <p id="ss-placeholder" style="color:var(--text-dim);margin:0;">${t('captureAfterShown')}</p>
        </div>
      </div>`;
  },

  getStickyNotesContent() {
    const key = 'star-sticky-note';
    const saved = (typeof localStorage !== 'undefined' && localStorage.getItem(key)) || '';
    return `
      <div id="sticky-notes-app" style="height:100%;display:flex;flex-direction:column;">
        <textarea id="sticky-text" style="flex:1;width:100%;padding:12px;border:none;background:var(--window-bg);color:var(--text);font-size:14px;resize:none;box-sizing:border-box;" placeholder="${t('stickyPlaceholder')}">${escapeHtml(saved)}</textarea>
      </div>`;
  },

  getCharacterMapContent() {
    const blocks = [
      { name: t('charBlockBasicLatin'), start: 0x0020, end: 0x007F },
      { name: t('charBlockLatinSupplement1'), start: 0x00A0, end: 0x00FF },
      { name: t('charBlockCommonSymbols'), start: 0x2000, end: 0x206F },
    ];
    let html = `<div id="charmap-app" style="height:100%;display:flex;flex-direction:column;padding:12px;overflow:auto;">
      <p style="font-size:12px;color:var(--text-dim);margin-bottom:8px;">${t('clickCharToCopy')}</p>`;
    blocks.forEach(b => {
      html += `<div style="margin-bottom:12px;"><div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">${b.name}</div><div style="display:flex;flex-wrap:wrap;gap:2px;">`;
      for (let i = b.start; i <= b.end; i++) {
        const ch = String.fromCodePoint(i);
        const display = ch === ' ' ? '&#9251;' : escapeHtml(ch);
        html += `<button type="button" class="charmap-char" data-code="${i}" style="width:28px;height:28px;padding:0;font-size:14px;border:1px solid var(--border);border-radius:4px;background:var(--window-titlebar);color:var(--text);cursor:pointer;">${display}</button>`;
      }
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  },

  getOnScreenKeyboardContent() {
    const rows = [
      ['1','2','3','4','5','6','7','8','9','0','-','=','Backspace'],
      ['Q','W','E','R','T','Y','U','I','O','P','[',']','\\\\'],
      ['A','S','D','F','G','H','J','K','L',';',"'",'Enter'],
      ['Z','X','C','V','B','N','M',',','.','/','Shift'],
      ['Space']
    ];
    let kb = `<div id="osk-app" style="height:100%;display:flex;flex-direction:column;padding:12px;"><input type="text" id="osk-input" readonly style="width:100%;padding:10px;margin-bottom:12px;background:var(--window-titlebar);border:1px solid var(--border);border-radius:4px;color:var(--text);" placeholder="${t('oskPlaceholder')}"><div id="osk-keys" style="display:flex;flex-direction:column;gap:4px;">`;
    rows.forEach(row => {
      kb += '<div style="display:flex;gap:2px;justify-content:center;flex-wrap:wrap;">';
      row.forEach(k => {
        const w = (k === 'Space' ? 'flex:1;min-width:120px' : k === 'Backspace' || k === 'Enter' || k === 'Shift' ? 'min-width:52px' : '');
        kb += `<button type="button" class="osk-key" data-key="${escapeHtml(k)}" style="min-width:28px;height:32px;padding:0 6px;font-size:13px;border:1px solid var(--border);border-radius:4px;background:var(--window-titlebar);color:var(--text);cursor:pointer;${w}">${k === 'Space' ? t('spaceKey') : escapeHtml(k)}</button>`;
      });
      kb += '</div>';
    });
    kb += '</div></div>';
    return kb;
  },

  getAboutContent() {
    return `
      <div id="about-app" style="height:100%;padding:16px 18px 10px;display:flex;flex-direction:column;gap:12px;">
        <div style="text-align:center;padding-top:0;">
        <h2 style="margin:0 0 8px;">${t('starOS')}</h2>
          <p style="margin:0;color:var(--text-dim);">${t('version')} 1.0.0</p>
        </div>
        ${getProjectDisclaimerCardContent('project-disclaimer-card--about')}
        <div style="display:flex;justify-content:center;margin-top:auto;padding-top:2px;">
        <button id="about-open-settings" class="start-footer-btn">${t('settings')}</button>
        </div>
      </div>`;
  },
};

// 让其它脚本通过 window.StarAppsRegistry 访问（顶层 const 在某些环境不会挂到 window 上）
try { if (typeof window !== 'undefined') window.StarAppsRegistry = StarAppsRegistry; } catch (_) {}
try {
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('star:locale-change', () => {
      try { StarAppsRegistry.refreshOpenWindowsLocale(); } catch (_) {}
    });
  }
} catch (_) {}

StarAppsRegistry.getSudokuContent = function() {
  return `<div id="game-sudoku" style="height:100%;display:flex;flex-direction:column;padding:12px;background:linear-gradient(180deg,#17301d 0%,#0c1514 100%);min-height:0;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;color:#f8fafc;flex-wrap:wrap;">
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
        <span>${t('sunLabel')} <strong id="td-sun">150</strong></span>
        <span>${t('stageLabel')} <strong id="td-level">1</strong></span>
        <span>${t('livesLabel')} <strong id="td-lives">5</strong></span>
      </div>
      <span id="td-state" style="padding:6px 10px;border-radius:999px;background:rgba(250,204,21,.14);color:#fde68a;font-size:12px;font-weight:700;">${t('pvzWaiting')}</span>
      <div style="display:flex;gap:8px;">
        <button id="td-start" class="start-footer-btn">${t('battleStart')}</button>
        <button id="td-reset" class="start-footer-btn">${t('restartCurrentLevel')}</button>
      </div>
    </div>
    <div id="td-plant-bar" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;"></div>
    <div id="td-board-wrap" style="position:relative;flex:1;min-height:0;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);background:linear-gradient(180deg,#78c850 0%,#4c9c3f 100%);">
      <div id="td-suns-layer" style="position:absolute;inset:0;pointer-events:none;"></div>
      <div id="td-grid" style="position:absolute;inset:0;display:grid;grid-template-columns:repeat(9,1fr);grid-template-rows:repeat(5,1fr);gap:2px;padding:10px;"></div>
      <div id="td-zombie-layer" style="position:absolute;inset:10px;"></div>
      <div id="td-pea-layer" style="position:absolute;inset:10px;pointer-events:none;"></div>
    </div>
    <p id="sudoku-status" style="margin:12px 0 0;font-size:12px;color:rgba(248,250,252,0.86);">${t('pvzHint')}</p>
    <div id="td-reset-confirm" style="position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(6,16,11,.58);backdrop-filter:blur(5px);z-index:80;">
      <div style="width:min(360px,calc(100% - 32px));padding:18px;border-radius:22px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg,rgba(9,15,24,.98),rgba(15,23,42,.96));box-shadow:0 24px 60px rgba(0,0,0,.42);color:#f8fafc;">
        <div style="font-size:20px;font-weight:800;margin-bottom:8px;">${t('confirmRestart')}</div>
        <div style="font-size:13px;line-height:1.65;color:rgba(248,250,252,.74);margin-bottom:16px;">${t('restartWarning')}</div>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button type="button" id="td-reset-cancel" class="start-footer-btn" style="min-width:88px;">${t('cancel')}</button>
          <button type="button" id="td-reset-confirm-btn" class="start-footer-btn" style="min-width:104px;">${t('restartCurrentLevel')}</button>
        </div>
      </div>
    </div>
  </div>`;
};

StarAppsRegistry.getSolitaireContent = function() {
  return `<div id="game-solitaire" class="game-shell" style="height:100%;display:flex;flex-direction:column;padding:12px;min-height:0;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;color:#f8fafc;flex-wrap:wrap;">
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
        <span id="solitaire-status">${t('spiderDefaultStatus')}</span>
        <span>${t('spiderCompletedSummary').replace('{complete}', '<strong id="spider-complete">0</strong>')}</span>
        <span>${t('spiderMovesSummary').replace('{moves}', '<strong id="spider-moves">0</strong>')}</span>
      </div>
      <button id="solitaire-new" class="start-footer-btn">${t('spiderNewGame')}</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(5,80px) 1fr;gap:12px;margin-bottom:12px;align-items:start;">
      <div id="solitaire-stock" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;grid-column:span 5;"></div>
      <div id="solitaire-foundations" style="display:grid;grid-template-columns:repeat(8,56px);gap:8px;justify-content:end;"></div>
    </div>
    <div id="solitaire-tableau" style="display:grid;grid-template-columns:repeat(10,1fr);gap:10px;flex:1;min-height:0;"></div>
  </div>`;
};

  StarAppsRegistry.getBrowserContent = function(incognito) {
    const isIncognito = !!incognito;
    return `
      <div id="browser-app" data-incognito="${isIncognito ? '1' : '0'}" style="width:100%;height:100%;min-height:0;overflow:hidden;display:flex;flex-direction:column;position:relative;flex:1;">
        <style>
        #browser-app {
          width:100%;
          height:100%;
          min-height:0;
          overflow:hidden;
          display:flex;
          flex-direction:column;
          position:relative;
          flex:1 1 auto;
          --br-panel-bg: linear-gradient(180deg, rgba(12,20,32,.98) 0%, rgba(9,15,24,.98) 100%);
          --br-panel-border: color-mix(in srgb, var(--border) 76%, rgba(255,255,255,.08));
          --br-panel-shadow: 0 24px 56px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.04);
          --br-panel-head-bg:
            radial-gradient(circle at top left, rgba(59,130,246,.14), transparent 54%),
            linear-gradient(180deg, rgba(255,255,255,.02) 0%, rgba(255,255,255,0) 100%);
          --br-panel-tabs-bg: color-mix(in srgb, var(--window-titlebar) 82%, rgba(8,15,24,.92));
          --br-panel-actions-bg: color-mix(in srgb, var(--window-titlebar) 72%, rgba(15,23,42,.82));
          --br-panel-body-bg:
            linear-gradient(180deg, rgba(255,255,255,.02) 0%, rgba(255,255,255,0) 18%),
            linear-gradient(180deg, rgba(9,15,24,.88) 0%, rgba(6,11,18,.98) 100%);
          --br-soft-bg: rgba(255,255,255,.03);
          --br-soft-border: rgba(255,255,255,.08);
          --br-value-bg: rgba(255,255,255,.03);
          --br-value-border: rgba(255,255,255,.04);
        }
        :root[data-theme="light"] #browser-app {
          --br-panel-bg: linear-gradient(180deg, rgba(255,255,255,.98) 0%, rgba(243,247,255,.98) 100%);
          --br-panel-border: color-mix(in srgb, var(--border) 88%, rgba(148,163,184,.24));
          --br-panel-shadow: 0 20px 44px rgba(59, 130, 246, .12), inset 0 1px 0 rgba(255,255,255,.82);
          --br-panel-head-bg:
            radial-gradient(circle at top left, rgba(59,130,246,.10), transparent 58%),
            linear-gradient(180deg, rgba(255,255,255,.76) 0%, rgba(245,248,255,.52) 100%);
          --br-panel-tabs-bg: color-mix(in srgb, var(--window-titlebar) 92%, rgba(255,255,255,.86));
          --br-panel-actions-bg: color-mix(in srgb, var(--window-titlebar) 94%, rgba(255,255,255,.92));
          --br-panel-body-bg:
            linear-gradient(180deg, rgba(255,255,255,.78) 0%, rgba(255,255,255,0) 18%),
            linear-gradient(180deg, rgba(250,252,255,.96) 0%, rgba(239,244,255,.98) 100%);
          --br-soft-bg: rgba(37,99,235,.05);
          --br-soft-border: rgba(37,99,235,.14);
          --br-value-bg: rgba(255,255,255,.82);
          --br-value-border: rgba(148,163,184,.24);
        }
        #browser-app #br-tabs { flex:0 0 auto; }
        #browser-app .br-stage {
          flex:1 1 auto;
          min-height:0;
          position:relative;
          overflow:hidden;
          background:var(--window-bg);
        }
        #browser-app #br-webviews {
          position:absolute;
          inset:0;
          min-height:0;
          overflow:hidden;
          background:var(--window-bg);
        }
        #browser-app .br-toolbar {
          display:flex;
          align-items:center;
          gap:4px;
          padding:6px;
          border-bottom:1px solid var(--border);
          flex-wrap:wrap;
        }
        #browser-app[data-incognito="1"] .br-toolbar {
          background: linear-gradient(90deg, color-mix(in srgb, #5b21b6 30%, var(--window-titlebar)) 0%, color-mix(in srgb, #1f2937 75%, var(--window-titlebar)) 100%);
        }
        #browser-app .br-side-panel {
          position:absolute;
          top:10px;
          right:10px;
          bottom:10px;
          width:min(420px, 48%);
          min-width:320px;
          border:1px solid var(--br-panel-border);
          border-radius:22px;
          background:var(--br-panel-bg);
          box-shadow:var(--br-panel-shadow);
          display:flex;
          flex-direction:column;
          overflow:hidden;
          z-index:4;
        }
        #browser-app .br-side-panel.hidden { display:none; }
        #browser-app .br-dev-panel {
          position:absolute;
          top:10px;
          right:10px;
          bottom:10px;
          width:min(400px, 46%);
          min-width:300px;
          border:1px solid var(--br-panel-border);
          border-radius:22px;
          background:var(--br-panel-bg);
          box-shadow:var(--br-panel-shadow);
          display:flex;
          flex-direction:column;
          overflow:hidden;
          z-index:5;
        }
        #browser-app .br-dev-panel.hidden { display:none; }
        #browser-app .br-dev-panel .br-dev-panel-tabs {
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          padding:10px 14px 12px;
          border-bottom:1px solid var(--border);
          background:var(--br-panel-tabs-bg);
        }
        #browser-app .br-dev-panel .br-dev-tab {
          border:1px solid var(--border);
          background:color-mix(in srgb, var(--window-titlebar) 72%, rgba(255,255,255,.02));
          color:color-mix(in srgb, var(--text) 88%, var(--text-secondary) 12%);
          border-radius:999px;
          padding:7px 14px;
          font-size:12px;
          font-weight:700;
          cursor:pointer;
          transition:background .18s ease, border-color .18s ease, color .18s ease;
        }
        #browser-app .br-dev-panel .br-dev-tab:hover {
          color:var(--text);
          border-color:color-mix(in srgb, var(--accent) 42%, var(--border));
        }
        #browser-app .br-dev-panel .br-dev-tab.active {
          color:var(--text);
          border-color:color-mix(in srgb, var(--accent) 70%, var(--border));
          background:color-mix(in srgb, var(--accent) 16%, var(--window-bg));
        }
        #browser-app .br-dev-source-wrap { display:flex; flex-direction:column; gap:10px; min-height:0; flex:1; }
        #browser-app .br-dev-source-toolbar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
        #browser-app .br-dev-source-pre {
          margin:0;
          padding:12px;
          border-radius:12px;
          border:1px solid var(--border);
          background:var(--br-value-bg);
          font-family:ui-monospace,Consolas,monospace;
          font-size:11px;
          line-height:1.45;
          white-space:pre-wrap;
          word-break:break-all;
          overflow:auto;
          flex:1;
          min-height:140px;
          max-height:100%;
          color:var(--text);
        }
        #browser-app .br-net-detail {
          margin-top:8px;
          padding-top:8px;
          border-top:1px dashed var(--border);
          font-size:11px;
          color:var(--text-secondary);
          display:grid;
          gap:6px;
        }
        #browser-app .br-net-detail-row { display:flex; gap:8px; flex-wrap:wrap; align-items:flex-start; }
        #browser-app .br-net-detail-k { flex:0 0 auto; color:var(--text-dim); min-width:5em; }
        #browser-app .br-net-detail-v { flex:1; min-width:0; word-break:break-all; color:var(--text); }
        #browser-app .br-panel-head {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
          padding:16px 16px 12px;
          border-bottom:1px solid var(--border);
          background:var(--br-panel-head-bg);
        }
        #browser-app .br-panel-copy {
          min-width:0;
          display:flex;
          flex-direction:column;
          gap:4px;
        }
        #browser-app .br-panel-kicker {
          font-size:11px;
          letter-spacing:.12em;
          text-transform:uppercase;
          color:color-mix(in srgb, var(--accent) 78%, #cfe6ff);
          font-weight:700;
        }
        #browser-app .br-panel-title {
          font-size:18px;
          font-weight:800;
          color:var(--text);
          line-height:1.15;
        }
        #browser-app .br-panel-hint {
          font-size:12px;
          color:var(--text-dim);
          line-height:1.5;
        }
        #browser-app .br-panel-tabs {
          display:flex;
          gap:8px;
          padding:12px 16px;
          border-bottom:1px solid var(--border);
          background:var(--br-panel-tabs-bg);
        }
        #browser-app .br-panel-tab {
          flex:1;
          padding:8px 12px;
          border:1px solid var(--border);
          border-radius:999px;
          background:color-mix(in srgb, var(--window-titlebar) 72%, rgba(255,255,255,.02));
          color:var(--text-secondary);
          cursor:pointer;
          transition:background .18s ease, border-color .18s ease, transform .18s ease, color .18s ease;
        }
        #browser-app .br-panel-tab:hover {
          transform:translateY(-1px);
          border-color:color-mix(in srgb, var(--accent) 42%, var(--border));
          color:var(--text);
        }
        #browser-app .br-panel-tab.active {
          background:color-mix(in srgb, var(--accent) 16%, var(--window-bg));
          border-color:color-mix(in srgb, var(--accent) 70%, var(--border));
          color:var(--text);
        }
        #browser-app .br-panel-actions {
          display:flex;
          flex-direction:column;
          gap:10px;
          padding:12px 16px;
          border-bottom:1px solid var(--border);
          background:var(--br-panel-actions-bg);
        }
        #browser-app .br-panel-row {
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          align-items:center;
        }
        #browser-app .br-panel-row.compact {
          gap:6px;
        }
        #browser-app .br-panel-spacer {
          flex:1 1 auto;
        }
        #browser-app .br-panel-search {
          flex:1 1 180px;
          min-width:160px;
          padding:8px 12px;
          background:color-mix(in srgb, var(--window-bg) 88%, rgba(255,255,255,.02));
          border:1px solid var(--border);
          border-radius:12px;
          color:var(--text);
        }
        #browser-app .br-scope-group {
          display:inline-flex;
          align-items:center;
          gap:4px;
          padding:4px;
          border-radius:999px;
          border:1px solid var(--border);
          background:var(--br-soft-bg);
        }
        #browser-app .br-scope-btn {
          border:none;
          background:transparent;
          color:var(--text-secondary);
          border-radius:999px;
          padding:6px 10px;
          cursor:pointer;
          transition:background .18s ease, color .18s ease;
        }
        #browser-app .br-scope-btn.active {
          background:color-mix(in srgb, var(--accent) 18%, var(--window-bg));
          color:var(--text);
        }
        #browser-app .br-danger-btn {
          border-color:color-mix(in srgb, #ef4444 55%, var(--border));
          color:color-mix(in srgb, #f87171 74%, var(--text));
        }
        :root[data-theme="light"] #browser-app .br-card-actions .br-danger-btn:not(:disabled),
        :root[data-theme="light"] #browser-app .br-panel-actions .br-danger-btn:not(:disabled) {
          color:#d92d20;
          font-weight:700;
          border-color:rgba(239,68,68,.9);
          background:linear-gradient(180deg, rgba(255,248,248,.98), rgba(255,232,232,.98));
          box-shadow:inset 0 0 0 1px rgba(255,255,255,.72), 0 6px 14px rgba(239,68,68,.14);
          text-shadow:0 1px 0 rgba(255,255,255,.78);
        }
        :root[data-theme="light"] #browser-app .br-card-actions .br-danger-btn:not(:disabled):hover,
        :root[data-theme="light"] #browser-app .br-panel-actions .br-danger-btn:not(:disabled):hover {
          color:#ffffff;
          border-color:rgba(220,38,38,.95);
          background:linear-gradient(180deg, #f25555, #dd3030);
          text-shadow:none;
        }
        #browser-app .br-panel-body {
          flex:1;
          min-height:0;
          overflow:auto;
          overflow-x:hidden;
          padding:14px 16px 18px;
          display:flex;
          flex-direction:column;
          gap:14px;
          background:var(--br-panel-body-bg);
        }
        #browser-app .br-panel-section-title {
          font-size:12px;
          color:var(--text-dim);
          margin-bottom:8px;
          letter-spacing:.02em;
        }
        #browser-app .br-history-item {
          width:100%;
          box-sizing:border-box;
          text-align:left;
          border:1px solid var(--border);
          border-radius:14px;
          background:linear-gradient(180deg, color-mix(in srgb, var(--window-titlebar) 78%, rgba(255,255,255,.02)) 0%, color-mix(in srgb, var(--window-bg) 92%, rgba(255,255,255,.01)) 100%);
          color:var(--text);
          padding:12px 14px;
          cursor:pointer;
          display:flex;
          flex-direction:column;
          gap:6px;
          transition:border-color .18s ease, background .18s ease, transform .18s ease;
        }
        #browser-app .br-history-item:hover {
          border-color:color-mix(in srgb, var(--accent) 46%, var(--border));
          background:linear-gradient(180deg, color-mix(in srgb, var(--accent) 12%, var(--window-titlebar)) 0%, color-mix(in srgb, var(--accent) 8%, var(--window-bg)) 100%);
          transform:translateY(-1px);
        }
        #browser-app .br-fav-card {
          display:flex;
          align-items:stretch;
          gap:10px;
        }
        #browser-app .br-fav-open {
          flex:1;
          min-width:0;
        }
        #browser-app .br-fav-remove {
          flex:0 0 auto;
          padding:6px 10px;
          border-radius:12px;
          border:1px solid var(--border);
          background:color-mix(in srgb, var(--window-titlebar) 72%, rgba(255,255,255,.02));
          color:var(--text);
          cursor:pointer;
          transition:background .18s ease, border-color .18s ease, transform .18s ease, color .18s ease;
          align-self:flex-start;
        }
        #browser-app .br-fav-remove:hover {
          transform:translateY(-1px);
          border-color:color-mix(in srgb, var(--accent) 42%, var(--border));
          background:color-mix(in srgb, var(--accent) 10%, var(--window-bg));
        }
        #browser-app .br-fav-remove.br-danger:hover {
          border-color: rgba(232, 17, 35, 0.7);
          background: rgba(232, 17, 35, 0.12);
          color: color-mix(in srgb, #fecaca 88%, var(--text));
        }
        :root[data-theme="light"] #browser-app .br-fav-remove.br-danger {
          border-color: rgba(225, 29, 72, 0.52);
          background: linear-gradient(180deg, rgba(255, 245, 247, 0.98), rgba(255, 236, 240, 0.96));
          color: #be123c;
          box-shadow: 0 1px 2px rgba(190, 24, 93, 0.08);
        }
        :root[data-theme="light"] #browser-app .br-fav-remove.br-danger:hover,
        :root[data-theme="light"] #browser-app .br-fav-remove.br-danger:focus-visible {
          border-color: rgba(225, 29, 72, 0.9);
          background: linear-gradient(180deg, #fb7185, #e11d48);
          color: #ffffff;
          box-shadow:
            0 10px 22px rgba(225, 29, 72, 0.24),
            0 0 0 2px rgba(244, 63, 94, 0.2);
          transform: translateY(-1px);
        }
        :root[data-theme="light"] #browser-app .br-fav-remove.br-danger:active {
          border-color: rgba(159, 18, 57, 0.95);
          background: linear-gradient(180deg, #e11d48, #be123c);
          color: #ffffff;
          box-shadow: inset 0 2px 5px rgba(136, 19, 55, 0.2);
          transform: translateY(0);
        }
        #browser-app .br-history-title {
          font-size:13px;
          font-weight:700;
          display:-webkit-box;
          overflow:hidden;
          overflow-wrap:anywhere;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          white-space:normal;
          line-height:1.35;
        }
        #browser-app .br-history-group-title {
          font-size:11px;
          color:var(--text-dim);
          margin:2px 2px 6px;
        }
        #browser-app .br-history-url {
          font-size:12px;
          color:var(--text-dim);
          white-space:normal;
          overflow-wrap:anywhere;
          word-break:break-all;
        }
        #browser-app .br-history-time {
          font-size:11px;
          color:var(--text-dim);
        }
        #browser-app .br-empty {
          padding:16px 12px;
          border:1px dashed var(--border);
          border-radius:14px;
          color:var(--text-dim);
          font-size:12px;
          text-align:center;
          line-height:1.6;
          background:var(--br-soft-bg);
        }
        #browser-app .br-cookie-summary {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
          font-size:12px;
          color:var(--text-dim);
        }
        #browser-app .br-cookie-list {
          display:flex;
          flex-direction:column;
          gap:12px;
        }
        #browser-app .br-cookie-card,
        #browser-app .br-cookie-editor {
          border:1px solid var(--border);
          border-radius:18px;
          padding:14px;
          background:linear-gradient(180deg, color-mix(in srgb, var(--window-titlebar) 76%, rgba(255,255,255,.02)) 0%, color-mix(in srgb, var(--window-bg) 94%, rgba(255,255,255,.01)) 100%);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
        }
        #browser-app .br-cookie-editor {
          border-color:color-mix(in srgb, var(--accent) 54%, var(--border));
        }
        #browser-app .br-cookie-card-head {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:10px;
          margin-bottom:10px;
        }
        #browser-app .br-cookie-name {
          font-size:14px;
          font-weight:800;
          color:var(--text);
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        #browser-app .br-cookie-domain {
          margin-top:4px;
          font-size:12px;
          color:var(--text-dim);
          word-break:break-all;
        }
        #browser-app .br-card-actions {
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          align-items:center;
        }
        #browser-app .br-cookie-value {
          margin-top:8px;
          padding:10px 12px;
          border-radius:12px;
          background:var(--br-value-bg);
          border:1px solid var(--br-value-border);
          color:var(--text-secondary);
          font-size:12px;
          line-height:1.55;
          word-break:break-all;
          white-space:pre-wrap;
        }
        #browser-app .br-cookie-meta {
          display:flex;
          flex-wrap:wrap;
          gap:6px;
          margin-top:10px;
        }
        #browser-app .br-cookie-badge {
          display:inline-flex;
          align-items:center;
          border:1px solid var(--br-soft-border);
          border-radius:999px;
          padding:4px 8px;
          font-size:11px;
          color:var(--text-dim);
          background:var(--br-soft-bg);
        }
        #browser-app .br-cookie-expiry {
          margin-top:10px;
          font-size:12px;
          color:var(--text-dim);
        }
        #browser-app .br-cookie-grid {
          display:grid;
          grid-template-columns:repeat(2, minmax(0, 1fr));
          gap:10px;
        }
        #browser-app .br-field {
          display:flex;
          flex-direction:column;
          gap:6px;
          min-width:0;
        }
        #browser-app .br-field-wide {
          grid-column:1 / -1;
        }
        #browser-app .br-field > span {
          font-size:12px;
          color:var(--text-dim);
        }
        #browser-app .br-field input,
        #browser-app .br-field select,
        #browser-app .br-field textarea {
          width:100%;
          box-sizing:border-box;
          border:1px solid var(--border);
          border-radius:12px;
          padding:8px 10px;
          background:color-mix(in srgb, var(--window-bg) 88%, rgba(255,255,255,.02));
          color:var(--text);
          min-height:40px;
        }
        #browser-app .br-field textarea {
          resize:vertical;
          min-height:84px;
          font-family:inherit;
        }
        #browser-app .br-toggle-row {
          display:flex;
          gap:14px;
          flex-wrap:wrap;
          margin-top:12px;
          margin-bottom:12px;
        }
        #browser-app .br-toggle {
          display:inline-flex;
          align-items:center;
          gap:6px;
          font-size:12px;
          color:var(--text-secondary);
        }
        #browser-app .br-toggle input {
          accent-color:var(--accent);
        }
        #browser-app .br-editor-title {
          font-size:13px;
          font-weight:700;
          color:var(--text);
          margin-bottom:12px;
        }
        #browser-app .br-status {
          padding:5px 10px;
          border-top:1px solid var(--border);
          font-size:12px;
          color:var(--text-dim);
          min-height:28px;
          box-sizing:border-box;
        }
        #browser-app .br-toolbar .start-footer-btn[data-active="true"] {
          background:color-mix(in srgb, var(--accent) 18%, var(--window-titlebar));
          border-color:color-mix(in srgb, var(--accent) 54%, var(--border));
        }
        #browser-app .br-dev-panel .br-panel-hint {
          color:var(--text-secondary);
        }
        #browser-app .br-dev-panel .br-panel-body .br-panel-section-title {
          color:var(--text-secondary);
          font-weight:800;
        }
        #browser-app .br-dev-panel .br-net-detail {
          color:var(--text);
        }
        #browser-app .br-dev-panel .br-net-detail-k {
          color:var(--text-secondary);
        }
        #browser-app .br-dev-panel .br-cookie-summary {
          color:var(--text-secondary);
        }
        #browser-app .br-dev-panel .br-cookie-domain,
        #browser-app .br-dev-panel .br-cookie-expiry {
          color:var(--text-secondary);
        }
        #browser-app .br-dev-panel .br-cookie-badge {
          color:color-mix(in srgb, var(--text) 82%, var(--text-secondary) 18%);
        }
        #browser-app .br-dev-panel .br-empty {
          color:var(--text-secondary);
        }
        #browser-app .br-top-banner {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--border);
          background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 22%, var(--window-titlebar)) 0%, var(--window-titlebar) 62%);
          color: var(--text);
        }
        #browser-app .br-top-banner.hidden { display: none; }
        #browser-app .br-top-banner-title { font-weight: 800; font-size: 13px; }
        #browser-app .br-top-banner-msg {
          flex: 1;
          min-width: 0;
          font-size: 12px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        #browser-app .br-top-banner-actions { display: inline-flex; align-items: center; gap: 8px; flex: 0 0 auto; }
        #browser-app .br-top-banner-close {
          width: 30px;
          min-width: 30px;
          height: 30px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }
        @media (max-width: 900px) {
          #browser-app .br-side-panel {
            width:min(100% - 20px, 440px);
            min-width:0;
          }
          #browser-app .br-cookie-grid {
            grid-template-columns:1fr;
          }
        }
      </style>
      <div id="br-download-banner" class="br-top-banner hidden" role="status" aria-live="polite"></div>
      <div class="br-toolbar">
        <button id="br-back" class="start-footer-btn" style="padding:6px 10px;">${t('back')}</button>
        <button id="br-forward" class="start-footer-btn" style="padding:6px 10px;">${t('forward')}</button>
        <button id="br-reload" class="start-footer-btn" style="padding:6px 10px;">${t('refresh')}</button>
        <button id="br-home" class="start-footer-btn" style="padding:6px 10px;">${t('homePage')}</button>
        <input type="text" id="br-url" style="flex:1;min-width:120px;padding:8px 12px;margin:0 4px;background:var(--window-titlebar);border:1px solid var(--border);border-radius:4px;color:var(--text);" placeholder="${t('searchOrAddress')}">
        <button id="br-go" class="start-footer-btn" style="padding:6px 12px;">${t('go')}</button>
        <button id="br-newtab" class="start-footer-btn" style="padding:6px 10px;">${t('newTab')}</button>
        <button id="br-incognito" class="start-footer-btn" style="padding:6px 10px;">${t('browserIncognitoOpen', 'Incognito')}</button>
        <button id="br-restore-tab" class="start-footer-btn" style="padding:6px 10px;">${t('browserRestoreClosedTab', 'Restore tab')}</button>
        <button id="br-downloads" class="start-footer-btn" style="padding:6px 10px;">${t('browserDownloads', 'Downloads')}</button>
        <button id="br-favorite" class="start-footer-btn" style="padding:6px 10px;" data-active="false">${t('browserFavoriteToggle', 'Favorite')}</button>
        <button id="br-favorites" class="start-footer-btn" style="padding:6px 10px;">${t('browserFavorites', t('bookmarks'))}</button>
        <button id="br-history" class="start-footer-btn" style="padding:6px 10px;">${t('history')}</button>
        <button id="br-site-data" class="start-footer-btn" style="padding:6px 10px;">${t('browserSiteData', 'Site data')}</button>
        <button id="br-devtools" class="start-footer-btn" style="padding:6px 10px;">${t('browserOpenDevTools', 'DevTools')}</button>
      </div>
      <div id="br-tabs" style="display:flex;background:var(--window-titlebar);padding:4px 8px 0;gap:4px;flex-wrap:nowrap;overflow:hidden;white-space:normal;"></div>
      <div class="br-stage">
        <div id="br-webviews"></div>
        <aside id="br-side-panel" class="br-side-panel hidden">
            <div class="br-panel-head">
              <div class="br-panel-copy">
                <span id="br-side-panel-kicker" class="br-panel-kicker">${t('browserSidebar', 'Browser sidebar')}</span>
                <strong id="br-side-panel-title" class="br-panel-title">${t('history')}</strong>
                <span id="br-side-panel-hint" class="br-panel-hint">${t('browserHistoryTabHint', 'Recently closed tabs and visited pages.')}</span>
              </div>
              <button id="br-side-panel-close" class="start-footer-btn" style="padding:4px 10px;">×</button>
            </div>
            <div class="br-panel-tabs">
              <button id="br-panel-tab-favorites" class="br-panel-tab" type="button">${t('browserFavorites', t('bookmarks'))}</button>
              <button id="br-panel-tab-history" class="br-panel-tab active" type="button">${t('history')}</button>
              <button id="br-panel-tab-data" class="br-panel-tab" type="button">${t('browserSiteData', 'Site data')}</button>
            </div>
            <div id="br-panel-actions" class="br-panel-actions"></div>
            <div id="br-side-panel-body" class="br-panel-body"></div>
        </aside>
        <aside id="br-dev-panel" class="br-dev-panel hidden" aria-label="${t('browserDevPanel', 'Developer tools')}">
            <div class="br-panel-head">
              <div class="br-panel-head-text br-panel-copy">
                <span id="br-dev-panel-kicker" class="br-panel-kicker"></span>
                <strong id="br-dev-panel-title" class="br-panel-title"></strong>
                <span id="br-dev-panel-hint" class="br-panel-hint"></span>
              </div>
              <button type="button" id="br-dev-panel-close" class="start-footer-btn" style="padding:4px 10px;">×</button>
            </div>
            <div class="br-dev-panel-tabs" id="br-dev-panel-mode-tabs"></div>
            <div id="br-dev-panel-actions" class="br-panel-actions"></div>
            <div id="br-dev-panel-body" class="br-panel-body"></div>
        </aside>
      </div>
      <div id="br-status" class="br-status"></div>
    </div>`;
};

if (Array.isArray(StarAppsRegistry.apps)) {
  StarAppsRegistry.apps.forEach(app => {
    if (!app || !app.id) return;
    app.icon = createHandDrawnAppIcon(app.id);
  });
}
