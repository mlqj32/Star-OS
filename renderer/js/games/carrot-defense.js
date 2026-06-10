
window.StarGames = window.StarGames || {};
window.StarGames.carrotDefense = function (container) {
  const root = container.querySelector('#game-carrot-defense');
  if (!root || root.dataset.bound === 'true') return;
  root.dataset.bound = 'true';
  root.style.position = 'relative';

  const canvas = root.querySelector('#carrot-canvas');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  if (!ctx) return;

  const boardEl = canvas.parentElement;
  const levelNameEl = root.querySelector('#carrot-level-name');
  const themeLabelEl = root.querySelector('#carrot-theme-label');
  const statusEl = root.querySelector('#carrot-status');
  const waveEl = root.querySelector('#carrot-wave');
  const baseEl = root.querySelector('#carrot-base');
  const goldEl = root.querySelector('#carrot-gold');
  const levelSelectEl = root.querySelector('#carrot-level-select');
  const towerBarEl = root.querySelector('#carrot-tower-bar');
  const selectionEl = root.querySelector('#carrot-selection');
  const levelNotesEl = root.querySelector('#carrot-level-notes');
  const legendEl = root.querySelector('#carrot-legend');
  const progressEl = root.querySelector('#carrot-progress');
  const themeCountEl = root.querySelector('#carrot-theme-count');
  const levelCountEl = root.querySelector('#carrot-level-count');
  const startBtn = root.querySelector('#carrot-start');
  const pauseBtn = root.querySelector('#carrot-pause');
  const resetBtn = root.querySelector('#carrot-reset');
  const upgradeBtn = root.querySelector('#carrot-upgrade');
  const sellBtn = root.querySelector('#carrot-sell');
  if (!boardEl || !levelSelectEl || !towerBarEl || !selectionEl || !startBtn || !pauseBtn || !resetBtn || !upgradeBtn || !sellBtn) return;

  boardEl.style.position = 'relative';
  const buildMenuEl = document.createElement('div');
  buildMenuEl.style.cssText = 'position:absolute;left:0;top:0;display:none;min-width:250px;max-width:min(280px,calc(100% - 16px));padding:12px;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg,rgba(9,15,24,.96),rgba(15,23,42,.92));box-shadow:0 20px 56px rgba(0,0,0,.38);backdrop-filter:blur(12px);z-index:5;pointer-events:auto;user-select:none;';
  boardEl.appendChild(buildMenuEl);
  const resetConfirmEl = document.createElement('div');
  resetConfirmEl.style.cssText = 'position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(4,10,8,.42);backdrop-filter:blur(6px);z-index:9;pointer-events:auto;';
  resetConfirmEl.innerHTML = `<div style="width:min(360px,calc(100% - 32px));padding:18px;border-radius:22px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg,rgba(9,15,24,.98),rgba(15,23,42,.96));box-shadow:0 24px 60px rgba(0,0,0,.42);color:#f8fafc;"><div style="font-size:20px;font-weight:800;margin-bottom:8px;">${t('confirmRestart')}</div><div style="font-size:13px;line-height:1.65;color:rgba(248,250,252,.74);margin-bottom:16px;">${t('restartWarning')}</div><div style="display:flex;justify-content:flex-end;gap:10px;"><button type="button" data-action="cancel-reset" style="min-width:88px;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#f8fafc;cursor:pointer;">${t('cancel')}</button><button type="button" data-action="confirm-reset" style="min-width:104px;height:38px;border:none;border-radius:12px;background:linear-gradient(180deg,#facc15,#eab308);color:#1f2937;font-weight:800;cursor:pointer;">${t('confirmRestartBtn')}</button></div></div>`;
  root.appendChild(resetConfirmEl);
  const resultOverlayEl = document.createElement('div');
  resultOverlayEl.style.cssText = 'position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(3,8,18,.52);backdrop-filter:blur(8px);z-index:10;pointer-events:auto;padding:20px;';
  root.appendChild(resultOverlayEl);

  const COLS = 14;
  const ROWS = 8;
  const DPR = () => Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const uid = (() => { let i = 0; return p => `${p}-${++i}`; })();
  const fmt = (key, ...values) => values.reduce((out, value, index) => out.replace(`{${index}}`, value), t(key));

  const TEXT = {
    waiting: t('waiting'), running: t('running'), paused: t('paused'), win: t('win'), lose: t('lose'),
    noGold: t('noGold'), blocked: t('blocked'), cannotUpgrade: t('cannotUpgrade'), cannotSell: t('cannotSell'),
    wave: (a, b) => t('wave').replace('{0}', a).replace('{1}', b), 
    base: n => t('base').replace('{0}', n), 
    gold: n => t('gold').replace('{0}', n), 
    incoming: n => t('incoming').replace('{0}', n),
    statRangeDamage: (range, dmg) => fmt('carrotStatRangeDamage', range, dmg),
    builtFromProp: name => fmt('carrotBuiltFromProp', name),
    builtTower: name => fmt('carrotBuiltTower', name),
    defendSuccess: t('carrotDefendSuccess'),
    defendFail: t('carrotDefendFail'),
    spawnPoint: t('carrotSpawnPoint'),
    spawnPointN: n => fmt('carrotSpawnPointN', n),
    hasSurprise: t('carrotHasSurprise'),
    selectedLabel: t('carrotSelectedLabel'),
    towerLabel: t('carrotTowerLabel'),
    lockedPropLabel: t('carrotLockedPropLabel'),
    lockedEnemyLabel: t('carrotLockedEnemyLabel'),
    pendingBuildLabel: name => fmt('carrotPendingBuildLabel', name),
    buildPointLabel: t('carrotBuildPointLabel'),
    baseMulti: values => fmt('carrotBaseMulti', values),
    levelTitle: (id, name) => fmt('carrotLevelTitle', id, name),
    progressSummary: (levels, towers) => fmt('carrotProgressSummary', levels, towers),
    chapterTitle: (current, total) => fmt('carrotChapterTitle', current, total),
    levelOption: (id, name) => fmt('carrotLevelOption', id, name),
    noSelectionTitle: t('carrotNoSelectionTitle'),
    noSelectionDesc: t('carrotNoSelectionDesc'),
    towerLevel: n => fmt('carrotTowerLevel', n),
    towerDamage: n => fmt('carrotTowerDamage', n),
    towerRange: n => fmt('carrotTowerRange', n),
    towerCd: n => fmt('carrotTowerCd', n),
    towerRole: text => fmt('carrotTowerRole', text),
    towerSkill: text => fmt('carrotTowerSkill', text),
    towerDebut: n => fmt('carrotTowerDebut', n),
    towerMaxLevel: t('carrotTowerMaxLevel'),
    towerUpgradeCost: n => fmt('carrotTowerUpgradeCost', n),
    multiRole: t('carrotTowerRoleDefault'),
    multiSkill: t('carrotTowerSkillDefault'),
    enemyLockDesc: t('carrotEnemyLockDesc'),
    enemyHp: (cur, max) => fmt('carrotEnemyHp', cur, max),
    lockCancelTip: t('carrotLockCancelTip'),
    propLockDesc: t('carrotPropLockDesc'),
    propHp: n => fmt('carrotPropHp', n),
    propReward: n => fmt('carrotPropReward', n),
    propExtraReward: t('carrotPropExtraReward'),
    pendingBuildTitle: name => fmt('carrotPendingBuildTitle', name),
    pendingBuildCost: n => fmt('carrotPendingBuildCost', n),
    pendingBuildDesc: t('carrotPendingBuildDesc'),
    buildableTitle: t('carrotBuildableTitle'),
    buildableDesc: t('carrotBuildableDesc'),
    upgradeButton: t('carrotUpgradeButton'),
    sellButton: t('carrotSellButton'),
    sellButtonRefund: n => fmt('carrotSellButtonRefund', n),
    towerUpgraded: name => fmt('carrotTowerUpgraded', name),
    towerSold: name => fmt('carrotTowerSold', name),
    battleStart: t('carrotBattleStart')
  };
  function getTowerBriefDesc(towerKey) {
    if (!towerKey) return '';
    return t('carrotTowerBrief_' + towerKey, TEXT.multiRole);
  }

  const THEMES = {
    meadow: { name: t('meadow'), sky: ['#b7f3a1', '#59d16f', '#1a5930'], a: '#7fd56d', b: '#67ba53', pathOuter: '#8f5d30', pathInner: '#dbb98d' },
    frost: { name: t('frost'), sky: ['#dbeafe', '#9dd6ff', '#2b5fd8'], a: '#dcf5ff', b: '#c6ecfb', pathOuter: '#93a7c0', pathInner: '#edf2f7' },
    candy: { name: t('candy'), sky: ['#ffe4f1', '#ff9ec8', '#ff5f91'], a: '#ffd4e6', b: '#ffc1db', pathOuter: '#c7798d', pathInner: '#ffe8ef' },
    desert: { name: t('desert'), sky: ['#fee7a6', '#f59e0b', '#92400e'], a: '#f4d98d', b: '#eccb73', pathOuter: '#9a6c2f', pathInner: '#f8e4b1' },
    harbor: { name: t('harbor'), sky: ['#bae6fd', '#38bdf8', '#0f4c81'], a: '#97d7f5', b: '#7cc7ea', pathOuter: '#546a7b', pathInner: '#d7e5ee' },
    forest: { name: t('forest'), sky: ['#bbf7d0', '#22c55e', '#14532d'], a: '#8fd66d', b: '#79c85a', pathOuter: '#6b4f2a', pathInner: '#d9bd92' },
    volcano: { name: t('volcano'), sky: ['#fecaca', '#ef4444', '#4a0d0d'], a: '#6b2d22', b: '#7f3423', pathOuter: '#2f1b17', pathInner: '#c46d3b' },
    moon: { name: t('moon'), sky: ['#c4b5fd', '#7c3aed', '#111827'], a: '#44526d', b: '#394760', pathOuter: '#6d728e', pathInner: '#d3d8e8' },
    glacier: { name: t('glacier'), sky: ['#e0f2fe', '#7dd3fc', '#164e63'], a: '#dbf5ff', b: '#c8ebfb', pathOuter: '#7aa3bc', pathInner: '#edf7fd' },
    storm: { name: t('storm'), sky: ['#cbd5e1', '#64748b', '#0f172a'], a: '#8da3b8', b: '#7990a6', pathOuter: '#49566a', pathInner: '#dbe4ec' }
  };

  const TOWERS = {
    bottle: { name: t('bottle'), cost: 110, range: 2.2, dmg: 18, cd: 0.58, speed: 8.2, color: '#38bdf8', splash: 0, mode: 'projectile', icon: 'bottle' },
    fan: { name: t('fan'), cost: 145, range: 1.9, dmg: 14, cd: 0.82, speed: 0, color: '#a3e635', splash: 0.95, mode: 'burst', slow: 1.1, icon: 'fan' },
    star: { name: t('star'), cost: 165, range: 2.45, dmg: 16, cd: 1.05, speed: 0, color: '#fbbf24', splash: 0, mode: 'chain', jumps: 3, chainRange: 1.55, icon: 'star' },
    radar: { name: t('radar'), cost: 210, range: 3.55, dmg: 44, cd: 1.45, speed: 0, color: '#c084fc', splash: 0, mode: 'beam', icon: 'radar' },
    anchor: { name: t('anchor'), cost: 245, range: 3.1, dmg: 68, cd: 1.82, speed: 5.8, color: '#f97316', splash: 1.18, mode: 'artillery', icon: 'anchor' },
    prism: { name: t('prism'), cost: 275, range: 2.8, dmg: 25, cd: 1.36, speed: 0, color: '#34d399', splash: 0, mode: 'multibeam', shots: 4, icon: 'prism' },
    cannon: { name: t('cannon'), cost: 230, range: 2.9, dmg: 60, cd: 1.7, speed: 5.1, color: '#fb923c', splash: 1.36, mode: 'artillery', icon: 'cannon' },
    dart: { name: t('dart'), cost: 125, range: 2.6, dmg: 13, cd: 0.42, speed: 9.5, color: '#facc15', splash: 0, mode: 'volley', shots: 2, icon: 'dart' },
    thunder: { name: t('thunder'), cost: 260, range: 2.7, dmg: 24, cd: 1.0, speed: 0, color: '#60a5fa', splash: 0, mode: 'chain', jumps: 5, chainRange: 1.8, icon: 'thunder' },
    glacier: { name: t('glacierTower'), cost: 205, range: 2.8, dmg: 20, cd: 0.96, speed: 0, color: '#93c5fd', splash: 0, mode: 'slowBeam', slow: 1.8, icon: 'snow' },
    blossom: { name: t('blossom'), cost: 190, range: 2.15, dmg: 18, cd: 1.08, speed: 0, color: '#fb7185', splash: 1.22, mode: 'pulse', pulse: 1.2, icon: 'flower' },
    rocket: { name: t('rocket'), cost: 295, range: 3.45, dmg: 76, cd: 1.9, speed: 6.2, color: '#ef4444', splash: 1.42, mode: 'artillery', icon: 'rocket-sigil' },
    comet: { name: t('comet'), cost: 240, range: 3.8, dmg: 58, cd: 1.28, speed: 0, color: '#a78bfa', splash: 0, mode: 'sniper', icon: 'comet-sigil' },
    gear: { name: t('gear'), cost: 175, range: 2.5, dmg: 17, cd: 0.72, speed: 8.1, color: '#f59e0b', splash: 0, mode: 'volley', shots: 3, icon: 'gear' },
    lotus: { name: t('lotus'), cost: 225, range: 2.2, dmg: 22, cd: 1.0, speed: 0, color: '#f472b6', splash: 1.3, mode: 'pulse', pulse: 1.36, icon: 'lotus-sigil' },
    bubble: { name: t('bubble'), cost: 145, range: 2.4, dmg: 15, cd: 0.64, speed: 7.4, color: '#67e8f9', splash: 0, mode: 'slowProjectile', slow: 0.9, icon: 'bubble' },
    coral: { name: t('coral'), cost: 215, range: 3.1, dmg: 32, cd: 1.12, speed: 0, color: '#fb7185', splash: 0, mode: 'beam', icon: 'coral-sigil' },
    mushroom: { name: t('mushroom'), cost: 170, range: 2.0, dmg: 16, cd: 0.88, speed: 0, color: '#84cc16', splash: 1.05, mode: 'burst', icon: 'mushroom' },
    lantern: { name: t('lantern'), cost: 205, range: 3.25, dmg: 42, cd: 1.16, speed: 0, color: '#f97316', splash: 0, mode: 'sniper', icon: 'lantern' },
    vine: { name: t('vine'), cost: 160, range: 2.35, dmg: 14, cd: 0.6, speed: 7.2, color: '#4ade80', splash: 0, mode: 'slowProjectile', slow: 1.2, icon: 'vine-sigil' },
    mirror: { name: t('mirror'), cost: 285, range: 2.9, dmg: 27, cd: 1.22, speed: 0, color: '#22d3ee', splash: 0, mode: 'multibeam', shots: 5, icon: 'mirror-sigil' },
    volcano: { name: t('volcanoTower'), cost: 320, range: 2.75, dmg: 88, cd: 2.05, speed: 5.4, color: '#dc2626', splash: 1.65, mode: 'artillery', icon: 'volcano-sigil' },
    harp: { name: t('harp'), cost: 195, range: 2.85, dmg: 18, cd: 0.76, speed: 8.6, color: '#f9a8d4', splash: 0, mode: 'volley', shots: 4, icon: 'harp-sigil' },
    torch: { name: t('torch'), cost: 155, range: 2.1, dmg: 21, cd: 0.7, speed: 0, color: '#fb7185', splash: 0, mode: 'beam', icon: 'torch-sigil' },
    moonblade: { name: t('moonblade'), cost: 255, range: 2.7, dmg: 23, cd: 0.92, speed: 0, color: '#c4b5fd', splash: 0, mode: 'chain', jumps: 4, chainRange: 1.75, icon: 'moonblade-sigil' },
    pearl: { name: t('pearl'), cost: 180, range: 2.55, dmg: 19, cd: 0.68, speed: 8.4, color: '#e2e8f0', splash: 0, mode: 'projectile', icon: 'pearl-sigil' },
    cactus: { name: t('cactus'), cost: 165, range: 2.65, dmg: 16, cd: 0.58, speed: 8.6, color: '#65a30d', splash: 0, mode: 'volley', shots: 3, icon: 'cactus-sigil' },
    magnet: { name: t('magnet'), cost: 235, range: 2.35, dmg: 28, cd: 1.08, speed: 0, color: '#94a3b8', splash: 1.18, mode: 'pulse', pulse: 1.25, icon: 'magnet-sigil' },
    windmill: { name: t('windmill'), cost: 215, range: 2.3, dmg: 20, cd: 0.84, speed: 0, color: '#bef264', splash: 1.12, mode: 'burst', slow: 0.8, icon: 'windmill-sigil' },
    shell: { name: t('shell'), cost: 245, range: 3.4, dmg: 48, cd: 1.24, speed: 0, color: '#fdba74', splash: 0, mode: 'sniper', icon: 'shell-sigil' },
    acorn: { name: t('acorn'), cost: 150, range: 2.25, dmg: 17, cd: 0.62, speed: 8.1, color: '#b45309', splash: 0, mode: 'projectile', icon: 'seed' },
    beekeeper: { name: t('beekeeper'), cost: 220, range: 2.55, dmg: 16, cd: 0.9, speed: 0, color: '#facc15', splash: 1.08, mode: 'burst', slow: 0.55, icon: 'hive' },
    icicle: { name: t('icicle'), cost: 210, range: 3.05, dmg: 26, cd: 0.94, speed: 0, color: '#bfdbfe', splash: 0, mode: 'slowBeam', slow: 1.45, icon: 'crystal' },
    aurora: { name: t('aurora'), cost: 290, range: 3.2, dmg: 31, cd: 1.18, speed: 0, color: '#67e8f9', splash: 0, mode: 'multibeam', shots: 4, icon: 'aurora' },
    lollipop: { name: t('lollipop'), cost: 175, range: 2.5, dmg: 15, cd: 0.56, speed: 8.7, color: '#f472b6', splash: 0, mode: 'volley', shots: 3, icon: 'sweet' },
    cupcake: { name: t('cupcake'), cost: 225, range: 2.15, dmg: 24, cd: 1.04, speed: 0, color: '#fb7185', splash: 1.34, mode: 'pulse', pulse: 1.34, icon: 'cupcake-sigil' },
    totem: { name: t('totem'), cost: 240, range: 2.6, dmg: 30, cd: 1.06, speed: 0, color: '#d97706', splash: 0, mode: 'beam', icon: 'totem' },
    scorpion: { name: t('scorpion'), cost: 205, range: 2.7, dmg: 18, cd: 0.66, speed: 8.3, color: '#f59e0b', splash: 0, mode: 'slowProjectile', slow: 1.35, icon: 'scorpion-sigil' },
    lighthouse: { name: t('lighthouse'), cost: 310, range: 3.9, dmg: 64, cd: 1.36, speed: 0, color: '#f8fafc', splash: 0, mode: 'sniper', icon: 'beacon' },
    tidal: { name: t('tidal'), cost: 255, range: 2.8, dmg: 27, cd: 1.02, speed: 0, color: '#38bdf8', splash: 1.18, mode: 'pulse', pulse: 1.42, icon: 'tidal-sigil' },
    owl: { name: t('owl'), cost: 235, range: 3.45, dmg: 46, cd: 1.18, speed: 0, color: '#a3e635', splash: 0, mode: 'sniper', icon: 'forest' },
    fern: { name: t('fern'), cost: 180, range: 2.35, dmg: 17, cd: 0.72, speed: 0, color: '#4ade80', splash: 1.12, mode: 'burst', slow: 0.72, icon: 'fern-sigil' },
    magma: { name: t('magma'), cost: 335, range: 2.9, dmg: 92, cd: 2.1, speed: 5.6, color: '#f97316', splash: 1.7, mode: 'artillery', icon: 'lava' },
    obsidian: { name: t('obsidian'), cost: 275, range: 3.1, dmg: 34, cd: 1.08, speed: 0, color: '#1f2937', splash: 0, mode: 'chain', jumps: 4, chainRange: 1.72, icon: 'obsidian-sigil' },
    nebula: { name: t('nebula'), cost: 300, range: 3.35, dmg: 30, cd: 1.06, speed: 0, color: '#8b5cf6', splash: 0, mode: 'multibeam', shots: 5, icon: 'cosmos' },
    eclipse: { name: t('eclipse'), cost: 260, range: 2.95, dmg: 52, cd: 1.22, speed: 0, color: '#c4b5fd', splash: 0, mode: 'beam', icon: 'eclipse-sigil' },
    crystal: { name: t('crystal'), cost: 245, range: 3.0, dmg: 22, cd: 0.82, speed: 0, color: '#7dd3fc', splash: 0, mode: 'chain', jumps: 6, chainRange: 1.58, icon: 'icegem' },
    polar: { name: t('polar'), cost: 290, range: 3.25, dmg: 36, cd: 1.1, speed: 0, color: '#e0f2fe', splash: 0, mode: 'beam', icon: 'polar-sigil' },
    cyclone: { name: t('cyclone'), cost: 230, range: 2.75, dmg: 19, cd: 0.74, speed: 0, color: '#93c5fd', splash: 1.08, mode: 'burst', slow: 1.05, icon: 'storm' },
    tesla: { name: t('tesla'), cost: 305, range: 3.1, dmg: 28, cd: 0.92, speed: 0, color: '#60a5fa', splash: 0, mode: 'chain', jumps: 6, chainRange: 1.9, icon: 'tesla-sigil' }
  };

  const THEME_TOWER_GROUPS = {
    meadow: ['bottle', 'fan', 'acorn', 'beekeeper', 'windmill'],
    frost: ['radar', 'glacier', 'icicle', 'aurora', 'bubble'],
    candy: ['star', 'blossom', 'lollipop', 'cupcake', 'lotus'],
    desert: ['cannon', 'cactus', 'totem', 'scorpion', 'torch'],
    harbor: ['anchor', 'pearl', 'lighthouse', 'tidal', 'shell'],
    forest: ['mushroom', 'vine', 'owl', 'fern', 'dart'],
    volcano: ['rocket', 'volcano', 'magma', 'obsidian', 'lantern'],
    moon: ['comet', 'moonblade', 'nebula', 'eclipse', 'mirror'],
    glacier: ['prism', 'thunder', 'crystal', 'polar', 'magnet'],
    storm: ['gear', 'coral', 'harp', 'cyclone', 'tesla']
  };

  const TOWER_FIRST_APPEARANCE = {
    bottle: 1, fan: 3, star: 6, radar: 9, anchor: 13, prism: 17, glacier: 22, thunder: 28, bubble: 35, cannon: 43,
    acorn: 52, beekeeper: 62, windmill: 73, dart: 85, gear: 98, blossom: 112, lotus: 127, lollipop: 143, cupcake: 160, mushroom: 178,
    vine: 197, icicle: 217, aurora: 238, comet: 260, moonblade: 283, mirror: 307, pearl: 332, shell: 358, lighthouse: 385, tidal: 413,
    cactus: 442, torch: 472, totem: 503, scorpion: 535, rocket: 548, lantern: 572, volcano: 598, magma: 624, obsidian: 648, owl: 670,
    fern: 692, coral: 714, harp: 734, magnet: 752, crystal: 768, polar: 780, nebula: 790, eclipse: 796, cyclone: 800, tesla: 804
  };

  const TOWER_NOTES = Object.fromEntries(Object.entries(TOWER_FIRST_APPEARANCE).map(([key]) => [key, { theme: towerThemeOfKey(key) }]));

  const TOWER_DEBUT_BY_LEVEL = Object.fromEntries(Object.entries(TOWER_FIRST_APPEARANCE).map(([key, level]) => [level, key]));

  const ENEMIES = {
    jelly: { name: t('jelly'), hp: 38, speed: 0.78, reward: 42, color: '#fb7185', r: 0.36 },
    bunny: { name: t('bunny'), hp: 58, speed: 1.08, reward: 45, color: '#fde68a', r: 0.33 },
    barrel: { name: t('barrel'), hp: 98, speed: 0.66, reward: 48, color: '#c08457', armor: 8, r: 0.4 },
    skater: { name: t('skater'), hp: 124, speed: 0.92, reward: 50, color: '#93c5fd', r: 0.38 },
    boss: { name: t('boss'), hp: 360, speed: 0.55, reward: 96, color: '#7c3aed', armor: 20, r: 0.5 }
  };

  const PROPS = {
    crate: { name: t('crate'), hp: 95, reward: 30, color: '#a16207', accent: '#fdba74' },
    cake: { name: t('cake'), hp: 145, reward: 65, color: '#fb7185', accent: '#fff1f2' },
    drum: { name: t('drum'), hp: 130, reward: 52, color: '#f97316', accent: '#fdba74' },
    chest: { name: t('chest'), hp: 180, reward: 105, color: '#eab308', accent: '#fde68a' },
    snowman: { name: t('snowman'), hp: 155, reward: 58, color: '#e0f2fe', accent: '#60a5fa' },
    igloo: { name: t('igloo'), hp: 220, reward: 90, color: '#c7d2fe', accent: '#bfdbfe' }
  };

  const obstacle = (x, y, type, extra) => Object.assign({ x, y, type }, extra || {});
  const wave = (...packs) => packs.map(pack => Array.isArray(pack)
    ? ({ type: pack[0], count: pack[1], gap: pack[2], offset: pack[3] || 0, route: pack[4] || 0 })
    : ({ type: pack.type, count: pack.count, gap: pack.gap, offset: pack.offset || 0, route: pack.route || 0 }));
  const expandRoute = points => {
    const out = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[i + 1];
      out.push([ax, ay]);
      if (ax === bx) for (let y = ay + (by > ay ? 1 : -1); y !== by; y += by > ay ? 1 : -1) out.push([ax, y]);
      else if (ay === by) for (let x = ax + (bx > ax ? 1 : -1); x !== bx; x += bx > ax ? 1 : -1) out.push([x, ay]);
    }
    out.push(points[points.length - 1]);
    return out;
  };
  const cloneRoute = route => route.map(([x, y]) => [x, y]);
  const cloneRoutes = routes => routes.map(cloneRoute);
  const mirrorRoutes = routes => routes.map(route => route.map(([x, y]) => [COLS - 1 - x, y]).reverse());
  const flipRoutes = routes => routes.map(route => route.map(([x, y]) => [x, ROWS - 1 - y]));
  const getLevelRoutes = level => {
    if (!level) return [];
    if (Array.isArray(level.paths) && level.paths.length) return level.paths;
    if (Array.isArray(level.path) && level.path.length) return [level.path];
    return [];
  };
  const ROUTE_BLUEPRINTS = [
    { routes: [expandRoute([[0, 3], [3, 3], [3, 1], [8, 1], [8, 5], [13, 5]])] },
    { routes: [expandRoute([[0, 5], [2, 5], [2, 2], [6, 2], [6, 6], [12, 6], [12, 3], [13, 3]])] },
    { routes: [expandRoute([[0, 2], [4, 2], [4, 6], [8, 6], [8, 1], [13, 1]])] },
    { routes: [expandRoute([[0, 6], [4, 6], [4, 4], [1, 4], [1, 1], [9, 1], [9, 5], [13, 5]])] },
    { routes: [expandRoute([[0, 1], [5, 1], [5, 3], [2, 3], [2, 6], [10, 6], [10, 2], [13, 2]])] },
    { routes: [expandRoute([[0, 1], [3, 1], [3, 4], [7, 4], [7, 1], [13, 1]]), expandRoute([[0, 6], [4, 6], [4, 2], [9, 2], [9, 6], [13, 6]])] },
    { routes: [expandRoute([[0, 2], [2, 2], [2, 6], [6, 6], [6, 3], [13, 3]]), expandRoute([[0, 5], [4, 5], [4, 1], [8, 1], [8, 5], [13, 5]])] },
    { routes: [expandRoute([[0, 1], [4, 1], [4, 3], [7, 3], [7, 0], [13, 0]]), expandRoute([[0, 7], [3, 7], [3, 4], [9, 4], [9, 7], [13, 7]])] },
    { routes: [expandRoute([[0, 3], [2, 3], [2, 1], [6, 1], [6, 5], [9, 5], [9, 2], [13, 2]]), expandRoute([[0, 4], [3, 4], [3, 6], [8, 6], [8, 3], [13, 3]])] },
    { routes: [expandRoute([[0, 0], [3, 0], [3, 3], [6, 3], [6, 0], [13, 0]]), expandRoute([[0, 7], [4, 7], [4, 4], [8, 4], [8, 7], [13, 7]]), expandRoute([[0, 3], [2, 3], [2, 5], [10, 5], [10, 3], [13, 3]])] }
  ];
  const EXTRA_PROP_SLOTS = [
    [[1, 1], [4, 4], [6, 2], [9, 5], [11, 1], [12, 6], [2, 6], [7, 4], [10, 2], [5, 6]],
    [[1, 5], [3, 1], [5, 4], [8, 2], [10, 6], [12, 3], [6, 6], [9, 1], [2, 3], [11, 5]],
    [[1, 2], [3, 5], [5, 1], [7, 6], [9, 3], [11, 4], [12, 1], [4, 6], [8, 1], [10, 5]]
  ];
  const PROP_KEYS = Object.keys(PROPS);
  const TOWER_KEYS = Object.keys(TOWERS);

  const LEVELS = [
    { id: 1, theme: 'meadow', name: t('level1'), intro: t('level1Intro'), gold: 270, hp: 10, allow: ['bottle'], path: expandRoute([[0, 3], [2, 3], [2, 1], [5, 1], [5, 5], [9, 5], [9, 2], [13, 2]]), props: [obstacle(3, 2, 'cake', { reward: 78, reveal: 'bottle' }), obstacle(7, 5, 'crate', { reward: 35 }), obstacle(10, 3, 'drum', { reward: 50 }), obstacle(1, 1, 'crate', { reward: 26 }), obstacle(6, 3, 'cake', { reward: 62 })], waves: [wave(['jelly', 4, 0.98], ['bunny', 2, 1.18, 1]), wave(['jelly', 5, 0.82]), wave(['bunny', 4, 0.84], ['barrel', 1, 1.28, 1.2]), wave(['jelly', 3, 0.72], ['barrel', 2, 1.18, 0.8]), wave(['barrel', 2, 1.22], ['boss', 1, 1.5, 2])] },
    { id: 2, theme: 'meadow', name: t('level2'), intro: t('level2Intro'), gold: 300, hp: 10, allow: ['bottle'], path: expandRoute([[0, 6], [3, 6], [3, 2], [6, 2], [6, 5], [10, 5], [10, 1], [13, 1]]), props: [obstacle(4, 1, 'chest', { reward: 108, reveal: 'bottle' }), obstacle(5, 4, 'crate', { reward: 28 }), obstacle(11, 2, 'cake', { reward: 72 }), obstacle(1, 4, 'drum', { reward: 42 }), obstacle(8, 3, 'crate', { reward: 30 })], waves: [wave(['jelly', 6, 0.86], ['bunny', 2, 0.92, 1]), wave(['barrel', 2, 1.18], ['jelly', 4, 0.78, 0.7]), wave(['skater', 3, 0.9], ['barrel', 2, 1.1, 1.1])] },
    { id: 3, theme: 'meadow', name: t('level3'), intro: t('level3Intro'), gold: 285, hp: 9, allow: ['bottle', 'fan'], path: expandRoute([[0, 1], [4, 1], [4, 4], [2, 4], [2, 6], [8, 6], [8, 2], [13, 2]]), props: [obstacle(3, 3, 'drum', { reward: 54, reveal: 'fan' }), obstacle(7, 5, 'cake', { reward: 70 }), obstacle(9, 3, 'crate', { reward: 32 }), obstacle(1, 5, 'crate', { reward: 29 }), obstacle(6, 2, 'cake', { reward: 58 })], waves: [wave(['jelly', 5, 0.84]), wave(['bunny', 4, 0.78], ['barrel', 1, 1.2, 1]), wave(['jelly', 4, 0.7], ['skater', 2, 0.92, 0.9]), wave(['skater', 4, 0.82]), wave(['barrel', 3, 1.0], ['bunny', 4, 0.72, 1.2]), wave(['boss', 1, 1.45], ['barrel', 2, 1.02, 0.9])] },
    { id: 4, theme: 'meadow', name: t('level4'), intro: t('level4Intro'), gold: 320, hp: 10, allow: ['bottle', 'fan'], path: expandRoute([[0, 4], [2, 4], [2, 1], [7, 1], [7, 6], [11, 6], [11, 3], [13, 3]]), props: [obstacle(1, 3, 'crate', { reward: 26 }), obstacle(5, 2, 'chest', { reward: 112, reveal: 'fan' }), obstacle(8, 4, 'drum', { reward: 58 }), obstacle(10, 6, 'cake', { reward: 72 }), obstacle(4, 4, 'crate', { reward: 30 }), obstacle(9, 2, 'drum', { reward: 46 })], waves: [wave(['jelly', 5, 0.84], ['barrel', 2, 1.25, 1]), wave(['bunny', 7, 0.78]), wave(['skater', 5, 0.9], ['barrel', 4, 1.04, 1.2]), wave(['boss', 1, 1.4], ['skater', 5, 0.74, 1.8], ['barrel', 2, 1.1, 0.8])] },
    { id: 5, theme: 'meadow', name: t('level5'), intro: t('level5Intro'), gold: 360, hp: 10, allow: ['bottle', 'fan'], path: expandRoute([[0, 2], [5, 2], [5, 5], [3, 5], [3, 1], [9, 1], [9, 6], [13, 6]]), props: [obstacle(2, 4, 'cake', { reward: 80, reveal: 'fan' }), obstacle(6, 1, 'drum', { reward: 48 }), obstacle(8, 3, 'chest', { reward: 115, reveal: 'bottle' }), obstacle(10, 6, 'crate', { reward: 34 }), obstacle(1, 5, 'crate', { reward: 30 }), obstacle(7, 4, 'cake', { reward: 66 })], waves: [wave(['jelly', 6, 0.8], ['bunny', 2, 0.86, 1]), wave(['bunny', 5, 0.76], ['barrel', 2, 1.08, 1]), wave(['skater', 4, 0.82]), wave(['barrel', 3, 0.98], ['jelly', 4, 0.72, 0.9]), wave(['boss', 1, 1.4], ['barrel', 3, 0.92, 1], ['bunny', 4, 0.7, 2.2])] },
    { id: 6, theme: 'frost', name: t('level6'), intro: t('level6Intro'), gold: 295, hp: 10, allow: ['bottle', 'fan', 'star'], path: expandRoute([[0, 5], [2, 5], [2, 2], [6, 2], [6, 6], [10, 6], [10, 3], [13, 3]]), props: [obstacle(3, 1, 'snowman', { reward: 62, reveal: 'fan' }), obstacle(7, 3, 'igloo', { reward: 96, reveal: 'star' }), obstacle(11, 4, 'crate', { reward: 30 }), obstacle(4, 5, 'snowman', { reward: 44 }), obstacle(8, 2, 'crate', { reward: 28 })], waves: [wave(['jelly', 4, 0.9], ['bunny', 3, 0.92, 1.1]), wave(['skater', 3, 0.84], ['jelly', 4, 0.76, 0.8]), wave(['skater', 4, 0.78], ['barrel', 2, 1.08, 1.2]), wave(['jelly', 5, 0.72]), wave(['boss', 1, 1.45], ['skater', 4, 0.74, 1.3])] },
    { id: 7, theme: 'frost', name: t('level7'), intro: t('level7Intro'), gold: 330, hp: 9, allow: ['bottle', 'fan', 'star'], path: expandRoute([[0, 1], [2, 1], [2, 5], [5, 5], [5, 2], [9, 2], [9, 6], [13, 6]]), props: [obstacle(3, 4, 'chest', { reward: 120, reveal: 'star' }), obstacle(6, 4, 'snowman', { reward: 58 }), obstacle(8, 5, 'cake', { reward: 74 }), obstacle(1, 4, 'snowman', { reward: 40 }), obstacle(7, 4, 'igloo', { reward: 70 })], waves: [wave(['jelly', 6, 0.82]), wave(['bunny', 6, 0.74]), wave(['skater', 4, 0.8], ['barrel', 2, 1.06, 1]), wave(['boss', 1, 1.48], ['skater', 3, 0.76, 1.1], ['barrel', 2, 1.0, 2])] },
    { id: 8, theme: 'frost', name: t('level8'), intro: t('level8Intro'), gold: 350, hp: 10, allow: ['bottle', 'fan', 'star'], path: expandRoute([[0, 6], [4, 6], [4, 3], [7, 3], [7, 1], [11, 1], [11, 5], [13, 5]]), props: [obstacle(3, 3, 'drum', { reward: 56, reveal: 'star' }), obstacle(6, 1, 'snowman', { reward: 60 }), obstacle(9, 5, 'igloo', { reward: 92 }), obstacle(1, 4, 'crate', { reward: 28 }), obstacle(8, 4, 'snowman', { reward: 46 })], waves: [wave(['jelly', 5, 0.8], ['bunny', 2, 0.88, 1]), wave(['bunny', 5, 0.72], ['skater', 2, 1.02, 1]), wave(['skater', 4, 0.78], ['barrel', 2, 1.0, 1.2])] },
    { id: 9, theme: 'frost', name: t('level9'), intro: t('level9Intro'), gold: 370, hp: 9, allow: ['bottle', 'fan', 'star', 'radar'], path: expandRoute([[0, 2], [3, 2], [3, 6], [7, 6], [7, 2], [10, 2], [10, 4], [13, 4]]), props: [obstacle(4, 5, 'igloo', { reward: 88, reveal: 'radar' }), obstacle(5, 2, 'chest', { reward: 125 }), obstacle(9, 1, 'snowman', { reward: 62 }), obstacle(11, 3, 'drum', { reward: 50 }), obstacle(1, 5, 'crate', { reward: 30 }), obstacle(8, 5, 'igloo', { reward: 76 })], waves: [wave(['jelly', 5, 0.8], ['skater', 2, 0.88, 1]), wave(['skater', 4, 0.76], ['barrel', 2, 1.12, 1]), wave(['jelly', 4, 0.72], ['bunny', 4, 0.7, 0.8]), wave(['barrel', 4, 0.96], ['skater', 3, 0.74, 1.2]), wave(['boss', 1, 1.4], ['barrel', 3, 0.9, 0.9])] },
    { id: 10, theme: 'frost', name: t('level10'), intro: t('level10Intro'), gold: 420, hp: 10, allow: ['bottle', 'fan', 'star', 'radar'], path: expandRoute([[0, 4], [1, 4], [1, 1], [5, 1], [5, 4], [8, 4], [8, 6], [12, 6], [12, 2], [13, 2]]), props: [obstacle(2, 3, 'igloo', { reward: 96, reveal: 'fan' }), obstacle(3, 1, 'chest', { reward: 130, reveal: 'radar' }), obstacle(6, 3, 'snowman', { reward: 65, reveal: 'star' }), obstacle(9, 5, 'cake', { reward: 76, reveal: 'star' }), obstacle(11, 6, 'drum', { reward: 56 }), obstacle(12, 4, 'igloo', { reward: 100, reveal: 'bottle' }), obstacle(4, 5, 'cake', { reward: 68 }), obstacle(10, 3, 'snowman', { reward: 48 })], waves: [wave(['jelly', 6, 0.74], ['bunny', 3, 0.82, 1]), wave(['skater', 4, 0.72], ['barrel', 2, 1.02, 1]), wave(['bunny', 5, 0.68], ['skater', 3, 0.76, 1.2], ['barrel', 2, 0.98, 2]), wave(['jelly', 4, 0.7], ['barrel', 3, 0.94, 0.9]), wave(['boss', 1, 1.38], ['barrel', 4, 0.88, 0.9], ['skater', 4, 0.72, 1.8]), wave(['bunny', 5, 0.66], ['skater', 3, 0.74, 1])] }
  ];
  const THEME_ORDER = Object.keys(THEMES);

  const WAVE_COUNT_PATTERN = [3, 5, 4, 7, 6, 8, 4, 5, 9, 3, 6, 7, 5, 8, 4, 6, 7, 3, 9, 5];
  const WAVE_ARCHETYPES = {
    burst: {
      name: t('waveType1'),
      waveChoices: [7, 7, 8, 8],
      packBias: 1,
      countBias: 2,
      gapShift: -0.12,
      offsetScale: 0.72,
      routeMode: 'focused',
      bonusBoss: 1,
      waveGap: 5.4
    },
    standard: {
      name: t('waveType2'),
      waveChoices: [7, 8, 8, 9],
      packBias: 0,
      countBias: 0,
      gapShift: 0,
      offsetScale: 1,
      routeMode: 'mixed',
      bonusBoss: 0,
      waveGap: 6
    },
    endurance: {
      name: t('waveType3'),
      waveChoices: [8, 8, 9, 9],
      packBias: -1,
      countBias: -1,
      gapShift: 0.1,
      offsetScale: 1.28,
      routeMode: 'spread',
      bonusBoss: 0,
      waveGap: 6.8
    }
  };
  function getWaveArchetypeText(type) {
    return t('waveArchetype' + type.charAt(0).toUpperCase() + type.slice(1));
  }
  function getThemeFlavor(theme) {
    return t('theme' + theme.charAt(0).toUpperCase() + theme.slice(1));
  }

  const THEME_LEVEL_STYLE = {
    meadow: { propPool: ['crate', 'cake', 'drum'], routeChoices: [0, 2, 4, 6], routePattern: [1, 1, 1, 2, 1], enemyBias: ['jelly', 'bunny', 'jelly', 'bunny', 'barrel'], countBonus: 0, gapBias: 0.05, propBonus: 1, bossStride: 7, revealSlots: [0, 3] },
    frost: { propPool: ['snowman', 'igloo', 'crate'], routeChoices: [1, 6, 8], routePattern: [1, 2, 2, 1, 2], enemyBias: ['jelly', 'skater', 'bunny', 'skater', 'barrel'], countBonus: 0, gapBias: 0.08, propBonus: 1, bossStride: 6, revealSlots: [0, 2] },
    candy: { propPool: ['cake', 'drum', 'chest'], routeChoices: [0, 3, 8], routePattern: [1, 2, 1, 2, 2], enemyBias: ['jelly', 'bunny', 'bunny', 'jelly', 'skater'], countBonus: 1, gapBias: -0.02, propBonus: 2, bossStride: 7, revealSlots: [0, 2, 4] },
    desert: { propPool: ['crate', 'drum', 'chest'], routeChoices: [2, 4, 5], routePattern: [1, 1, 2, 1, 2], enemyBias: ['barrel', 'bunny', 'barrel', 'jelly', 'skater'], countBonus: 1, gapBias: -0.01, propBonus: 1, bossStride: 5, revealSlots: [0, 3] },
    harbor: { propPool: ['chest', 'crate', 'drum'], routeChoices: [1, 5, 9], routePattern: [2, 1, 2, 3, 2], enemyBias: ['barrel', 'skater', 'bunny', 'barrel', 'boss'], countBonus: 1, gapBias: 0.02, propBonus: 1, bossStride: 5, revealSlots: [0, 2] },
    forest: { propPool: ['crate', 'cake', 'snowman'], routeChoices: [0, 6, 7], routePattern: [1, 2, 2, 1, 2], enemyBias: ['bunny', 'jelly', 'bunny', 'skater', 'jelly'], countBonus: 1, gapBias: -0.04, propBonus: 2, bossStride: 7, revealSlots: [0, 4] },
    volcano: { propPool: ['drum', 'chest', 'crate'], routeChoices: [3, 4, 9], routePattern: [1, 1, 2, 1, 3], enemyBias: ['barrel', 'barrel', 'skater', 'boss', 'jelly'], countBonus: 2, gapBias: -0.06, propBonus: 1, bossStride: 4, revealSlots: [0, 2] },
    moon: { propPool: ['chest', 'cake', 'igloo'], routeChoices: [5, 7, 8], routePattern: [2, 2, 3, 2, 1], enemyBias: ['skater', 'jelly', 'barrel', 'boss', 'bunny'], countBonus: 1, gapBias: -0.03, propBonus: 1, bossStride: 5, revealSlots: [0, 3] },
    glacier: { propPool: ['snowman', 'igloo', 'chest'], routeChoices: [6, 8, 9], routePattern: [2, 3, 2, 2, 1], enemyBias: ['skater', 'skater', 'barrel', 'jelly', 'boss'], countBonus: 1, gapBias: 0.04, propBonus: 1, bossStride: 5, revealSlots: [0, 2] },
    storm: { propPool: ['drum', 'crate', 'chest'], routeChoices: [5, 7, 9], routePattern: [2, 3, 2, 3, 1], enemyBias: ['bunny', 'skater', 'barrel', 'boss', 'jelly'], countBonus: 2, gapBias: -0.08, propBonus: 1, bossStride: 4, revealSlots: [0, 2, 4] }
  };
  const THEME_PROP_LAYOUT = {
    meadow: { countShift: 0, clusterWeight: 0.5, spreadWeight: 0.2, routeWeight: 0.7, edgeWeight: 0.1, centerWeight: 0.2, anchorWeight: 0.4, rewardShift: 0, rewardScale: 1, centerRewardBoost: 0, edgeRewardBoost: 0, preferHighValue: false },
    frost: { countShift: 0, clusterWeight: 0.1, spreadWeight: 0.9, routeWeight: 0.9, edgeWeight: 0.4, centerWeight: 0.4, anchorWeight: 0.9, rewardShift: 2, rewardScale: 1.02, centerRewardBoost: 4, edgeRewardBoost: 2, preferHighValue: false },
    candy: { countShift: 1, clusterWeight: 0.8, spreadWeight: 0.4, routeWeight: 0.8, edgeWeight: 0.2, centerWeight: 0.6, anchorWeight: 0.8, rewardShift: 4, rewardScale: 1.04, centerRewardBoost: 6, edgeRewardBoost: 0, preferHighValue: true },
    desert: { countShift: 0, clusterWeight: 0.2, spreadWeight: 0.8, routeWeight: 0.95, edgeWeight: 0.3, centerWeight: 0.5, anchorWeight: 0.5, rewardShift: 3, rewardScale: 1.04, centerRewardBoost: 6, edgeRewardBoost: 2, preferHighValue: true },
    harbor: { countShift: 0, clusterWeight: -0.6, spreadWeight: 2.6, routeWeight: 0.35, edgeWeight: 2.4, centerWeight: -1.2, anchorWeight: 1.9, rewardShift: 6, rewardScale: 1.06, centerRewardBoost: 0, edgeRewardBoost: 8, preferHighValue: true },
    forest: { countShift: 2, clusterWeight: 2.4, spreadWeight: -0.4, routeWeight: 1.35, edgeWeight: -0.3, centerWeight: 0.5, anchorWeight: 2.2, rewardShift: -2, rewardScale: 0.98, centerRewardBoost: 2, edgeRewardBoost: 0, preferHighValue: false },
    volcano: { countShift: 1, clusterWeight: 0.2, spreadWeight: 0.6, routeWeight: 1.8, edgeWeight: -0.8, centerWeight: 2.8, anchorWeight: 2.4, rewardShift: 14, rewardScale: 1.18, centerRewardBoost: 20, edgeRewardBoost: -2, preferHighValue: true },
    moon: { countShift: 0, clusterWeight: 0.6, spreadWeight: 0.7, routeWeight: 0.9, edgeWeight: 0.2, centerWeight: 1, anchorWeight: 1.2, rewardShift: 5, rewardScale: 1.05, centerRewardBoost: 7, edgeRewardBoost: 0, preferHighValue: true },
    glacier: { countShift: 0, clusterWeight: 0.3, spreadWeight: 1.1, routeWeight: 0.9, edgeWeight: 0.5, centerWeight: 0.8, anchorWeight: 1.1, rewardShift: 4, rewardScale: 1.05, centerRewardBoost: 8, edgeRewardBoost: 1, preferHighValue: true },
    storm: { countShift: 1, clusterWeight: 0.1, spreadWeight: 1.6, routeWeight: 1.1, edgeWeight: 1, centerWeight: 0.6, anchorWeight: 1.2, rewardShift: 7, rewardScale: 1.08, centerRewardBoost: 8, edgeRewardBoost: 4, preferHighValue: true }
  };
  const THEME_PROP_ANCHORS = {
    meadow: [[3, 2], [6, 4], [10, 2], [9, 5]],
    frost: [[2, 1], [5, 5], [9, 2], [11, 5]],
    candy: [[2, 2], [5, 4], [8, 2], [11, 4]],
    desert: [[3, 5], [6, 2], [9, 5], [11, 2]],
    harbor: [[1, 1], [1, 6], [12, 1], [12, 6], [2, 3], [11, 4]],
    forest: [[2, 2], [3, 5], [6, 3], [9, 4], [11, 6]],
    volcano: [[5, 2], [6, 5], [7, 3], [8, 4], [9, 2]],
    moon: [[3, 1], [5, 5], [8, 2], [10, 6]],
    glacier: [[2, 5], [4, 2], [8, 5], [11, 2]],
    storm: [[1, 3], [4, 6], [8, 1], [11, 4], [12, 6]]
  };

  function debutLevelOf(key) {
    return TOWER_FIRST_APPEARANCE[key] || 9999;
  }

  function towerThemeOfKey(key) {
    return Object.keys(THEME_TOWER_GROUPS).find(theme => (THEME_TOWER_GROUPS[theme] || []).includes(key)) || 'meadow';
  }

  function availableTowers(keys, levelId) {
    return (keys || []).filter(key => debutLevelOf(key) <= levelId);
  }

  function buildThemeSupportPool(themeIndex, cycle) {
    const support = [];
    for (let offset = 1; offset < THEME_ORDER.length; offset++) {
      const prevTheme = THEME_ORDER[(themeIndex - offset + THEME_ORDER.length) % THEME_ORDER.length];
      const nextTheme = THEME_ORDER[(themeIndex + offset) % THEME_ORDER.length];
      [prevTheme, nextTheme].forEach((themeName, sideIndex) => {
        const group = THEME_TOWER_GROUPS[themeName] || [];
        if (!group.length) return;
        const start = (cycle + offset + sideIndex) % group.length;
        for (let i = 0; i < group.length; i++) {
          support.push(group[(start + i) % group.length]);
        }
      });
    }
    return support;
  }

  function buildGeneratedAllow(levelId, theme, themeIndex) {
    const chapter = Math.floor((levelId - 1) / 20);
    const cycle = Math.floor(chapter / THEME_ORDER.length);
    const chapterStep = (levelId - 1) % 20;
    const debutTower = TOWER_DEBUT_BY_LEVEL[levelId];
    const countPattern = [5, 6, 7, 5, 8, 6, 7, 6];
    const count = levelId <= 50 ? countPattern[(levelId + themeIndex) % countPattern.length] : Math.min(8, 5 + ((levelId + themeIndex + cycle) % 4));
    const primaryPool = availableTowers(THEME_TOWER_GROUPS[theme] || [], levelId);
    const primaryStart = (levelId + cycle) % Math.max(1, primaryPool.length);
    const rotatedPrimary = primaryPool.length ? primaryPool.map((_, idx) => primaryPool[(primaryStart + idx) % primaryPool.length]) : [];
    const allow = [];
    if (debutTower && debutLevelOf(debutTower) === levelId) allow.push(debutTower);
    rotatedPrimary.forEach(key => {
      if (!allow.includes(key)) allow.push(key);
    });
    const supportPool = buildThemeSupportPool(themeIndex, cycle).filter(key => debutLevelOf(key) <= levelId);
    const supportBudget = Math.min(count - allow.length, Math.max(0, 1 + Math.floor(chapterStep / 6) + Math.min(2, cycle)));
    for (let i = 0; i < supportPool.length && allow.length < primaryPool.length + supportBudget; i++) {
      const key = supportPool[i];
      if (!allow.includes(key)) allow.push(key);
    }
    if (levelId < 20) {
      ['bottle', 'fan', 'star'].forEach(key => {
        if (!allow.includes(key) && allow.length < count) allow.unshift(key);
      });
    }
    if (debutTower && !allow.includes(debutTower)) allow.unshift(debutTower);
    return allow.slice(0, count);
  }

  function hash32(value) {
    let x = (value >>> 0) + 0x9e3779b9;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return (x ^ (x >>> 16)) >>> 0;
  }

  function routeSignature(routes) {
    return routes.map(route => route.map(([x, y]) => `${x},${y}`).join('>')).join('|');
  }

  function compactWaypoints(points) {
    const deduped = [];
    points.forEach(point => {
      const prev = deduped[deduped.length - 1];
      if (!prev || prev[0] !== point[0] || prev[1] !== point[1]) deduped.push(point);
    });
    const compact = [];
    deduped.forEach(point => {
      const prev = compact[compact.length - 1];
      const next = deduped[deduped.indexOf(point) + 1];
      if (prev && next && ((prev[0] === point[0] && point[0] === next[0]) || (prev[1] === point[1] && point[1] === next[1]))) return;
      compact.push(point);
    });
    return compact;
  }

  function laneRows(routeCount, routeIndex) {
    if (routeCount <= 1) return [0, 1, 2, 3, 4, 5, 6, 7];
    if (routeCount === 2) return routeIndex === 0 ? [0, 1, 2, 3] : [4, 5, 6, 7];
    return routeIndex === 0 ? [0, 1, 2] : routeIndex === 1 ? [2, 3, 4, 5] : [5, 6, 7];
  }

  function pickRow(options, seed, salt, avoid) {
    if (!options.length) return 0;
    const set = new Set((avoid || []).filter(v => options.includes(v)));
    const available = options.filter(v => !set.has(v));
    const pool = available.length ? available : options;
    return pool[hash32(seed + salt) % pool.length];
  }

  function buildRouteSkeleton(seed, routeCount, routeIndex, themeIndex) {
    const rows = laneRows(routeCount, routeIndex);
    const startY = pickRow(rows, seed, 11);
    const turn1Y = pickRow(rows, seed, 23, [startY]);
    const turn2Y = pickRow(rows, seed, 37, [turn1Y]);
    const turn3Y = pickRow(rows, seed, 53, [turn2Y]);
    const exitY = pickRow(rows, seed, 71, [turn3Y]);
    const x1 = 1 + (hash32(seed + 101) % 4);
    const x2 = Math.min(8, x1 + 2 + (hash32(seed + 131) % 3));
    const x3 = Math.min(11, x2 + 2 + (hash32(seed + 151) % 3));
    const x4 = Math.min(12, x3 + 1 + (hash32(seed + 181) % 2));
    const ySwing = routeCount === 1 ? ((hash32(seed + themeIndex * 19) % 3) - 1) : 0;
    const adjustedTurn2 = clamp(turn2Y + ySwing, 0, ROWS - 1);
    return compactWaypoints([
      [0, startY],
      [x1, startY],
      [x1, turn1Y],
      [x2, turn1Y],
      [x2, adjustedTurn2],
      [x3, adjustedTurn2],
      [x3, turn3Y],
      [x4, turn3Y],
      [x4, exitY],
      [13, exitY]
    ]);
  }

  function buildUniqueRoutesForLevel(levelId, theme, themeIndex, usedSignatures) {
    const style = THEME_LEVEL_STYLE[theme] || THEME_LEVEL_STYLE.meadow;
    const chapter = Math.floor((levelId - 1) / 20);
    const routeCount = style.routePattern[(levelId + chapter + themeIndex) % style.routePattern.length];
    const baseSeed = levelId * 4099 + themeIndex * 211 + routeCount * 97;
    for (let salt = 0; salt < 4096; salt++) {
      const routes = [];
      for (let routeIndex = 0; routeIndex < routeCount; routeIndex++) {
        const seed = baseSeed + salt * 131 + routeIndex * 977;
        const waypoints = buildRouteSkeleton(seed, routeCount, routeIndex, themeIndex);
        routes.push(expandRoute(waypoints));
      }
      const signature = routeSignature(routes);
      if (!usedSignatures.has(signature)) {
        usedSignatures.add(signature);
        return routes;
      }
    }
    return cloneRoutes((ROUTE_BLUEPRINTS[0] && ROUTE_BLUEPRINTS[0].routes) || [expandRoute([[0, 3], [13, 3]])]);
  }

  function manhattan(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  function nearestDistanceToRoute(slot, routes) {
    let best = Infinity;
    routes.forEach(route => {
      route.forEach(([x, y]) => {
        best = Math.min(best, manhattan(slot[0], slot[1], x, y));
      });
    });
    return Number.isFinite(best) ? best : 6;
  }

  function themePropAnchors(theme, levelId) {
    const base = THEME_PROP_ANCHORS[theme] || THEME_PROP_ANCHORS.meadow;
    if (!base.length) return [[6, 3]];
    const count = theme === 'forest' ? 3 : theme === 'harbor' ? 4 : theme === 'volcano' ? 3 : 2;
    const start = hash32(levelId * 97 + THEME_ORDER.indexOf(theme) * 131) % base.length;
    const anchors = [];
    for (let i = 0; i < count; i++) anchors.push(base[(start + i) % base.length]);
    return anchors;
  }

  function pickGeneratedPropType(theme, propPool, levelId, pickIndex, slot, profile) {
    const baseIndex = (levelId + pickIndex * 2 + slot[0] * 3 + slot[1] * 5 + THEME_ORDER.indexOf(theme)) % propPool.length;
    const centerScore = 1 - Math.min(1, Math.abs(slot[0] - (COLS - 1) / 2) / ((COLS - 1) / 2));
    if (profile.preferHighValue && centerScore > 0.55) {
      const elitePool = propPool.filter(type => (PROPS[type] && PROPS[type].reward >= 52));
      if (elitePool.length) return elitePool[(baseIndex + pickIndex) % elitePool.length];
    }
    return propPool[baseIndex];
  }

  function scoreGeneratedPropSlot(slot, theme, routes, selected, anchors, levelId) {
    const profile = THEME_PROP_LAYOUT[theme] || THEME_PROP_LAYOUT.meadow;
    const centerX = (COLS - 1) / 2;
    const centerY = (ROWS - 1) / 2;
    const edgeDist = Math.min(slot[0], COLS - 1 - slot[0], slot[1], ROWS - 1 - slot[1]);
    const edgeScore = 1 - Math.min(1, edgeDist / 3.5);
    const centerScore = 1 - Math.min(1, (Math.abs(slot[0] - centerX) / centerX + Math.abs(slot[1] - centerY) / centerY) / 2);
    const routeScore = 1 - Math.min(1, nearestDistanceToRoute(slot, routes) / 4.5);
    const nearestSelected = selected.length ? Math.min(...selected.map(item => manhattan(slot[0], slot[1], item.x, item.y))) : 4;
    const clusterScore = selected.length ? 1 - Math.min(1, nearestSelected / 4.5) : 0.35;
    const spreadScore = Math.min(1, nearestSelected / 5);
    const nearestAnchor = anchors.length ? Math.min(...anchors.map(([ax, ay]) => manhattan(slot[0], slot[1], ax, ay))) : 4;
    const anchorScore = 1 - Math.min(1, nearestAnchor / 4.5);
    const noise = (hash32(levelId * 199 + slot[0] * 17 + slot[1] * 29 + selected.length * 53) % 1000) / 1000;
    return centerScore * profile.centerWeight +
      edgeScore * profile.edgeWeight +
      routeScore * profile.routeWeight +
      clusterScore * profile.clusterWeight +
      spreadScore * profile.spreadWeight +
      anchorScore * profile.anchorWeight +
      noise * 0.18;
  }

  function resolveWaveArchetype(levelId, theme, routeCount) {
    const themeIndex = THEME_ORDER.indexOf(theme);
    const roll = hash32(levelId * 313 + themeIndex * 97 + routeCount * 43) % 100;
    if (routeCount === 1 && (roll < 26 || levelId % 17 === 0)) return 'endurance';
    if (routeCount >= 3 && (roll > 54 || levelId % 11 === 0)) return 'burst';
    if (theme === 'volcano' || theme === 'storm') {
      if (roll < 48) return 'burst';
      if (roll > 90) return 'endurance';
      return 'standard';
    }
    if (theme === 'forest' || theme === 'harbor' || theme === 'frost') {
      if (roll < 36) return 'endurance';
      if (roll > 82) return 'burst';
      return 'standard';
    }
    if (roll < 22) return 'burst';
    if (roll > 76) return 'endurance';
    return 'standard';
  }

  function waveIntensityCurve(archetypeKey, waveIndex, waveCount) {
    const t = waveCount <= 1 ? 1 : waveIndex / (waveCount - 1);
    if (archetypeKey === 'burst') return 1 + t * 0.95 + (waveIndex === waveCount - 1 ? 0.26 : 0) + (waveIndex === waveCount - 2 ? 0.12 : 0);
    if (archetypeKey === 'endurance') return 0.68 + t * 0.54 + ((waveIndex % 3) === 1 ? 0.06 : 0) - ((waveIndex % 4) === 0 ? 0.04 : 0);
    return 0.9 + t * 0.7 + ((waveIndex % 2) === 0 ? 0.04 : 0);
  }

  function pickWaveRoute(archetypeKey, levelId, waveIndex, packIndex, routeCount) {
    if (routeCount <= 1) return 0;
    if (archetypeKey === 'burst') return (levelId + Math.floor(waveIndex / 2) + packIndex) % routeCount;
    if (archetypeKey === 'endurance') return (waveIndex + packIndex + levelId) % routeCount;
    return (levelId + waveIndex * 2 + packIndex) % routeCount;
  }

  function buildGeneratedProps(levelId, theme, allow, routes) {
    const style = THEME_LEVEL_STYLE[theme] || THEME_LEVEL_STYLE.meadow;
    const profile = THEME_PROP_LAYOUT[theme] || THEME_PROP_LAYOUT.meadow;
    const routeCells = new Set(routes.flat().map(([x, y]) => `${x},${y}`));
    const propPool = style.propPool || PROP_KEYS;
    const propCount = Math.max(5, 6 + style.propBonus + profile.countShift + (levelId % 3) + (routes.length > 1 ? 1 : 0) + (routes.length > 2 ? 1 : 0));
    const props = [];
    const revealSlots = new Set(style.revealSlots || [0, 2]);
    const expandedSlots = [];
    const anchors = themePropAnchors(theme, levelId);
    for (let group = 0; group < EXTRA_PROP_SLOTS.length; group++) {
      const nextSlots = EXTRA_PROP_SLOTS[(levelId + THEME_ORDER.indexOf(theme) + group) % EXTRA_PROP_SLOTS.length];
      nextSlots.forEach(slot => expandedSlots.push(slot));
    }
    const availableSlots = expandedSlots.filter(slot => !routeCells.has(`${slot[0]},${slot[1]}`));
    while (props.length < propCount && availableSlots.length) {
      let bestIndex = -1;
      let bestScore = -Infinity;
      for (let i = 0; i < availableSlots.length; i++) {
        const slot = availableSlots[i];
        if (props.some(item => item.x === slot[0] && item.y === slot[1])) continue;
        const score = scoreGeneratedPropSlot(slot, theme, routes, props, anchors, levelId);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }
      if (bestIndex < 0) break;
      const slot = availableSlots.splice(bestIndex, 1)[0];
      const propType = pickGeneratedPropType(theme, propPool, levelId, props.length, slot, profile);
      const baseReward = (PROPS[propType] && PROPS[propType].reward) || 30;
      const centerScore = 1 - Math.min(1, Math.abs(slot[0] - (COLS - 1) / 2) / ((COLS - 1) / 2));
      const edgeDist = Math.min(slot[0], COLS - 1 - slot[0], slot[1], ROWS - 1 - slot[1]);
      const edgeScore = 1 - Math.min(1, edgeDist / 3.5);
      const routeScore = 1 - Math.min(1, nearestDistanceToRoute(slot, routes) / 4.5);
      const reward = Math.max(18, Math.round((baseReward + ((levelId + props.length + style.propBonus) % 5) * 6 + profile.rewardShift + centerScore * profile.centerRewardBoost + edgeScore * profile.edgeRewardBoost + routeScore * 8) * profile.rewardScale));
      const prop = obstacle(slot[0], slot[1], propType, { reward });
      if (revealSlots.has(props.length) && allow.length) {
        prop.reveal = allow[(levelId + props.length) % allow.length];
      }
      props.push(prop);
    }
    return props;
  }
  function buildGeneratedWaves(levelId, theme, routeCount, archetypeKey) {
    const style = THEME_LEVEL_STYLE[theme] || THEME_LEVEL_STYLE.meadow;
    const chapter = Math.floor((levelId - 1) / 20);
    const themeIndex = THEME_ORDER.indexOf(theme);
    const archetype = WAVE_ARCHETYPES[archetypeKey] || WAVE_ARCHETYPES.standard;
    const difficulty = Math.min(22, Math.floor((levelId - 1) / 38) + 1);
    const allowedEnemies = style.enemyBias.filter(type => {
      if (type === 'boss') return difficulty >= 10;
      if (type === 'skater') return difficulty >= 5;
      if (type === 'barrel') return difficulty >= 3;
      return true;
    });
    const enemyPool = allowedEnemies.length ? allowedEnemies : ['jelly', 'bunny'];
    const baseWaveCount = WAVE_COUNT_PATTERN[(levelId * 5 + routeCount + themeIndex) % WAVE_COUNT_PATTERN.length];
    const chapterWaveShift = [0, 1, -1, 2, 0, -1, 1, 0][chapter % 8];
    const themeWaveShift = [0, 1, 0, -1, 1, 0, 2, -1, 1, 0][themeIndex % 10];
    const routeWaveShift = routeCount >= 3 ? 1 : routeCount === 2 ? 0 : -1;
    const specialLong = levelId % (17 + (themeIndex % 4)) === 0 ? 1 : 0;
    const specialShort = levelId % (13 + routeCount) === 0 ? -1 : 0;
    const lateGameShift = levelId > 520 && style.countBonus > 1 ? 1 : 0;
    const archetypeBase = archetype.waveChoices[(levelId + chapter + themeIndex) % archetype.waveChoices.length];
    const waveCount = clamp(Math.round((baseWaveCount + archetypeBase) / 2) + chapterWaveShift + themeWaveShift + routeWaveShift + specialLong + specialShort + lateGameShift, 7, 9);
    const waves = [];
    for (let waveIndex = 0; waveIndex < waveCount; waveIndex++) {
      const openingHeavyCap = waveIndex === 0 ? 1 : waveIndex === 1 ? 2 : 99;
      let openingHeavyUsed = 0;
      const intensity = waveIntensityCurve(archetypeKey, waveIndex, waveCount);
      const lateTier = Math.floor(Math.max(0, levelId - 200) / 200);
      const basePackCount = 1 + ((levelId + waveIndex + chapter) % (difficulty >= 12 ? 2 : 3)) + (routeCount >= 3 && waveIndex % 3 === 1 ? 1 : 0) - (lateTier >= 2 ? 1 : 0);
      const packCount = clamp(basePackCount + archetype.packBias + (archetypeKey === 'endurance' && waveIndex % 3 === 0 ? -1 : 0), 1, archetypeKey === 'burst' ? 4 : 3);
      const packs = [];
      for (let packIndex = 0; packIndex < packCount; packIndex++) {
        const route = pickWaveRoute(archetypeKey, levelId, waveIndex, packIndex, routeCount);
        const typeSeed = levelId + waveIndex * (archetypeKey === 'burst' ? 3 : 2) + packIndex + themeIndex + route;
        let type = enemyPool[typeSeed % enemyPool.length];
        const lightType = enemyPool.includes('jelly') ? 'jelly' : 'bunny';
        const midType = enemyPool.includes('bunny') ? 'bunny' : lightType;
        const routeBonus = routeCount >= 3 ? 1 : routeCount === 2 ? 0 : -1;
        const baseCount = 3 + Math.floor(difficulty * 0.34) + Math.min(1, style.countBonus) + routeBonus + ((waveIndex + packIndex + levelId) % 3);
        let count = clamp(Math.round(baseCount + archetype.countBias + intensity + (archetypeKey === 'burst' ? packIndex * 0.55 : 0) - (archetypeKey === 'endurance' ? packIndex * 0.2 : 0)), 3, archetypeKey === 'burst' ? 15 : difficulty >= 16 ? 13 : 11);
        let gap = Math.max(archetypeKey === 'burst' ? 0.44 : 0.6, +(1.08 - difficulty * 0.013 - packIndex * 0.03 + style.gapBias + archetype.gapShift + (lateTier >= 1 ? 0.04 : 0) + (archetypeKey === 'endurance' ? waveIndex * 0.01 : 0)).toFixed(2));
        if (waveIndex <= 1) {
          const isHeavy = type === 'barrel' || type === 'skater' || type === 'boss';
          if (isHeavy) {
            const remainHeavy = Math.max(0, openingHeavyCap - openingHeavyUsed);
            if (remainHeavy === 0) {
              type = waveIndex === 0 ? lightType : midType;
            } else {
              const heavyCountCap = waveIndex === 0 ? remainHeavy : Math.min(remainHeavy + 1, remainHeavy * 2);
              count = Math.min(count, heavyCountCap);
              openingHeavyUsed += count;
              gap = +(gap + (waveIndex === 0 ? 0.16 : 0.08)).toFixed(2);
            }
          }
        }
        const offsetBase = 0.96 + packIndex * 0.14;
        const offset = +(packIndex * offsetBase * archetype.offsetScale + (archetypeKey === 'endurance' ? waveIndex * 0.08 : 0)).toFixed(2);
        packs.push({ type, count, gap, offset, route });
      }
      const shouldAddBoss = waveIndex === waveCount - 1 ||
        (difficulty >= 11 && waveIndex === waveCount - 2 && levelId % (style.bossStride + 1) === 0) ||
        (difficulty >= 18 && waveIndex === waveCount - 3 && levelId % (style.bossStride + 5) === 0 && routeCount >= 2) ||
        (archetype.bonusBoss && difficulty >= 13 && waveIndex === waveCount - 2 && levelId % (style.bossStride + 2) !== 1);
      if (shouldAddBoss) {
        packs.push({ type: 'boss', count: 1, gap: archetypeKey === 'burst' ? 1.18 : 1.5, offset: +(1.2 + (waveIndex % 2) * 0.4 + (archetypeKey === 'endurance' ? 0.2 : 0)).toFixed(2), route: pickWaveRoute(archetypeKey, levelId, waveIndex, packs.length, routeCount) });
      }
      waves.push(wave(...packs));
    }
    return waves;
  }
  function buildGeneratedLevel(levelId) {
    const themeIndex = Math.floor((levelId - 1) / 20) % THEME_ORDER.length;
    const theme = THEME_ORDER[themeIndex];
    const debutTower = TOWER_DEBUT_BY_LEVEL[levelId];
    const routes = buildUniqueRoutesForLevel(levelId, theme, themeIndex, USED_ROUTE_SIGNATURES);
    const waveArchetype = resolveWaveArchetype(levelId, theme, routes.length);
    const allow = buildGeneratedAllow(levelId, theme, themeIndex);
    const props = buildGeneratedProps(levelId, theme, allow, routes);
    const waves = buildGeneratedWaves(levelId, theme, routes.length, waveArchetype);
    const hp = routes.length >= 3 ? 12 : routes.length === 2 ? 11 : 10;
    const style = THEME_LEVEL_STYLE[theme] || THEME_LEVEL_STYLE.meadow;
    const gold = 320 + themeIndex * 24 + (levelId % 10) * 12 + routes.length * 18 + style.propBonus * 8;
    const prefixIndex = (levelId % 12) + 1;
    const suffixIndex = ((levelId + themeIndex) % 12) + 1;
    const title = `${t('levelPrefix' + prefixIndex)}${t('levelSuffix' + suffixIndex)}`;
    const debutLine = debutTower ? `${fmt('carrotDebutTower', TOWERS[debutTower].name)}\n` : '';
    return {
      id: levelId,
      theme,
      name: title,
      intro: routes.length > 1 ? `${debutLine}${getThemeFlavor(theme)} ${getWaveArchetypeText(waveArchetype) || getWaveArchetypeText('standard')} ${t('levelIntroMultiExit')}` : `${debutLine}${getThemeFlavor(theme)} ${getWaveArchetypeText(waveArchetype) || getWaveArchetypeText('standard')} ${t('levelIntroLongRoute')}`,

      gold,
      hp,
      waveGap: (WAVE_ARCHETYPES[waveArchetype] || WAVE_ARCHETYPES.standard).waveGap,
      allow,
      paths: routes,
      path: routes[0],
      props,
      waves
    };
  }
  const USED_ROUTE_SIGNATURES = new Set(LEVELS.map(level => routeSignature(getLevelRoutes(level))));
  for (let levelId = 11; levelId <= 1000; levelId++) {
    LEVELS.push(buildGeneratedLevel(levelId));
  }
  function sanitizeLevelProps(level) {
    const keyOf = (x, y) => `${x},${y}`;
    const pathCells = new Set(getLevelRoutes(level).flat().map(([x, y]) => keyOf(x, y)));
    const usedCells = new Set();
    const findNearestOpenCell = (originX, originY) => {
      let best = null;
      let bestScore = Infinity;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const key = keyOf(x, y);
          if (pathCells.has(key) || usedCells.has(key)) continue;
          const score = Math.abs(x - originX) + Math.abs(y - originY) + (y * 0.001) + (x * 0.0001);
          if (score < bestScore) {
            bestScore = score;
            best = { x, y };
          }
        }
      }
      return best;
    };
    level.props = (level.props || []).map(item => {
      const initialKey = keyOf(item.x, item.y);
      if (!pathCells.has(initialKey) && !usedCells.has(initialKey)) {
        usedCells.add(initialKey);
        return item;
      }
      const nextCell = findNearestOpenCell(item.x, item.y);
      if (!nextCell) return null;
      usedCells.add(keyOf(nextCell.x, nextCell.y));
      return Object.assign({}, item, nextCell);
    }).filter(Boolean);
    return level;
  }
  LEVELS.forEach(sanitizeLevelProps);

  const cellKey = (x, y) => `${x},${y}`;
  const isInsideGrid = (x, y) => x >= 0 && x < COLS && y >= 0 && y < ROWS;
  function getWorld(width, height) {
    const safeWidth = Math.max(320, width || 960);
    const safeHeight = Math.max(240, height || 600);
    const pad = 24;
    const cell = Math.max(32, Math.floor(Math.min((safeWidth - pad * 2) / COLS, (safeHeight - pad * 2) / ROWS)));
    const boardWidth = cell * COLS;
    const boardHeight = cell * ROWS;
    const ox = Math.floor((safeWidth - boardWidth) * 0.5);
    const oy = Math.floor((safeHeight - boardHeight) * 0.5);
    return { width: safeWidth, height: safeHeight, cell, ox, oy, boardWidth, boardHeight };
  }
  function cellCenter(world, x, y) {
    return { x: world.ox + (x + 0.5) * world.cell, y: world.oy + (y + 0.5) * world.cell };
  }
  function getRouteTotal(world, routeIndex) {
    const path = getLevelRoutes(currentLevel())[routeIndex] || getLevelRoutes(currentLevel())[0] || [];
    return Math.max(0, (path.length - 1) * world.cell);
  }
  function pathPos(world, progress, routeIndex) {
    const routes = getLevelRoutes(currentLevel());
    const path = routes[routeIndex || 0] || routes[0] || [];
    if (!path.length) return { x: world.ox, y: world.oy };
    const segmentLength = world.cell;
    const maxProgress = Math.max(0, (path.length - 1) * segmentLength);
    const clamped = clamp(progress, 0, maxProgress);
    const seg = Math.min(path.length - 2, Math.floor(clamped / segmentLength));
    const t = seg >= path.length - 1 ? 1 : (clamped - seg * segmentLength) / segmentLength;
    const from = cellCenter(world, path[seg][0], path[seg][1]);
    const to = cellCenter(world, path[Math.min(path.length - 1, seg + 1)][0], path[Math.min(path.length - 1, seg + 1)][1]);
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  }

  let levelIndex = 0;
  let state = null;
  let selected = null;
  let lockedTarget = null;
  let paused = false;
  let previewTowerKey = null;
  let frameId = 0;
  let lastTs = performance.now();
  let buildMenu = { open: false, x: -1, y: -1, px: 0, py: 0 };
  let lastGoldForUpgradeBtn = null;
  const LEVEL_STORAGE_KEY = 'star-game-carrot-last-level';

  const currentLevel = () => LEVELS[levelIndex] || LEVELS[0];
  function readSavedLevelIndex() {
    try {
      const raw = Number(window.localStorage.getItem(LEVEL_STORAGE_KEY) || '1');
      if (Number.isFinite(raw)) return clamp(Math.floor(raw) - 1, 0, LEVELS.length - 1);
    } catch (_) {}
    return 0;
  }
  function persistLevelIndex(index) {
    try {
      window.localStorage.setItem(LEVEL_STORAGE_KEY, String(clamp(index, 0, LEVELS.length - 1) + 1));
    } catch (_) {}
  }
  const PROCEDURAL_ICON_PALETTES = [
    ['#38bdf8', '#0f172a', '#fef08a', '#e0f2fe'],
    ['#fb7185', '#4c0519', '#fde68a', '#ffe4e6'],
    ['#34d399', '#052e2b', '#fef3c7', '#d1fae5'],
    ['#a78bfa', '#2e1065', '#f5d0fe', '#ede9fe'],
    ['#f97316', '#7c2d12', '#fdba74', '#ffedd5'],
    ['#facc15', '#713f12', '#67e8f9', '#fef9c3'],
    ['#60a5fa', '#172554', '#c4b5fd', '#dbeafe'],
    ['#4ade80', '#14532d', '#fef08a', '#dcfce7'],
    ['#f472b6', '#831843', '#f9a8d4', '#fce7f3'],
    ['#94a3b8', '#0f172a', '#a5f3fc', '#e2e8f0'],
    ['#fb923c', '#431407', '#fdba74', '#ffedd5'],
    ['#22d3ee', '#083344', '#cffafe', '#ecfeff']
  ];

  function hashString(input) {
    let hash = 2166136261;
    const text = String(input || 'tower');
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function regularPolygonPoints(cx, cy, radius, sides, rotation) {
    const points = [];
    for (let i = 0; i < sides; i++) {
      const angle = rotation + (Math.PI * 2 * i) / sides;
      points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
    }
    return points;
  }

  function starPoints(cx, cy, outer, inner, points, rotation) {
    const result = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = rotation + (Math.PI * i) / points;
      const radius = i % 2 === 0 ? outer : inner;
      result.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
    }
    return result;
  }

  function svgPointString(points) {
    return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  }

  function getProceduralTowerIconSpec(iconKey) {
    const seed = hashString(iconKey);
    const palette = PROCEDURAL_ICON_PALETTES[seed % PROCEDURAL_ICON_PALETTES.length];
    return {
      seed,
      primary: palette[0],
      secondary: palette[1],
      accent: palette[2],
      detail: palette[3],
      badge: seed % 7,
      emblem: (seed >>> 3) % 8,
      sides: 5 + ((seed >>> 6) % 4),
      spokes: 5 + ((seed >>> 9) % 3),
      dots: 2 + ((seed >>> 12) % 4),
      stripe: (seed >>> 15) % 3,
      tilt: ((seed >>> 18) % 90 - 45) * Math.PI / 180,
      spin: ((seed >>> 24) % 360) * Math.PI / 180
    };
  }

  function proceduralBadgeSvg(spec) {
    const spin = spec.spin - Math.PI / 2;
    if (spec.badge === 0) return `<circle cx="32" cy="32" r="18.5" fill="url(#grad-${spec.seed})" stroke="${spec.detail}" stroke-width="2.4"/>`;
    if (spec.badge === 1) return `<rect x="14" y="14" width="36" height="36" rx="12" fill="url(#grad-${spec.seed})" stroke="${spec.detail}" stroke-width="2.4"/>`;
    if (spec.badge === 2) return `<polygon points="${svgPointString(regularPolygonPoints(32, 32, 19, 6, spin))}" fill="url(#grad-${spec.seed})" stroke="${spec.detail}" stroke-width="2.4"/>`;
    if (spec.badge === 3) return `<polygon points="${svgPointString(regularPolygonPoints(32, 32, 19, 4, spin + Math.PI / 4))}" fill="url(#grad-${spec.seed})" stroke="${spec.detail}" stroke-width="2.4"/>`;
    if (spec.badge === 4) return `<polygon points="${svgPointString(starPoints(32, 32, 19, 11, spec.spokes, spin))}" fill="url(#grad-${spec.seed})" stroke="${spec.detail}" stroke-width="2.1"/>`;
    if (spec.badge === 5) return `<path d="M32 12c9 0 17 7 17 15 0 12-10 18-17 25-7-7-17-13-17-25 0-8 8-15 17-15z" fill="url(#grad-${spec.seed})" stroke="${spec.detail}" stroke-width="2.4"/>`;
    return `<g><circle cx="32" cy="22" r="8.8" fill="${spec.primary}" opacity=".94"/><circle cx="22" cy="34" r="8.8" fill="${spec.primary}" opacity=".88"/><circle cx="42" cy="34" r="8.8" fill="${spec.primary}" opacity=".88"/><circle cx="32" cy="44" r="8.8" fill="${spec.primary}" opacity=".9"/><circle cx="32" cy="32" r="8.6" fill="${spec.accent}" stroke="${spec.detail}" stroke-width="2.2"/></g>`;
  }

  function proceduralOverlaySvg(spec) {
    if (spec.stripe === 0) return `<path d="M19 43L45 21" stroke="${spec.detail}" stroke-width="2.4" stroke-linecap="round" opacity=".78"/><path d="M22 48L48 26" stroke="${spec.detail}" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>`;
    if (spec.stripe === 1) return `<path d="M18 24C24 16 40 16 46 24" stroke="${spec.detail}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".72"/><path d="M18 40C24 48 40 48 46 40" stroke="${spec.detail}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".64"/>`;
    return `<path d="M20 19L44 19M18 32L46 32M20 45L44 45" stroke="${spec.detail}" stroke-width="1.8" stroke-linecap="round" opacity=".46"/>`;
  }

  function proceduralEmblemSvg(spec) {
    if (spec.emblem === 0) return `<path d="M35 16L24 33h8l-4 15 13-19h-8l2-13z" fill="${spec.accent}" stroke="${spec.secondary}" stroke-width="1.4" stroke-linejoin="round"/>`;
    if (spec.emblem === 1) return `<circle cx="32" cy="32" r="9" fill="none" stroke="${spec.accent}" stroke-width="2.6"/><path d="M32 19v8M32 37v8M19 32h8M37 32h8" stroke="${spec.accent}" stroke-width="2.4" stroke-linecap="round"/>`;
    if (spec.emblem === 2) return `<path d="M23 38c0-9 7-15 15-15 2 0 4 .4 6 1.2-2 11-10 18-19 18-2 0-2-.8-2-4.2z" fill="${spec.accent}" stroke="${spec.secondary}" stroke-width="1.5" stroke-linejoin="round"/><path d="M28 38c5-2 9-6 12-11" stroke="${spec.secondary}" stroke-width="1.4" stroke-linecap="round"/>`;
    if (spec.emblem === 3) return `<path d="M18 36c6-10 10-12 14-12s8 2 14 12" fill="none" stroke="${spec.accent}" stroke-width="3" stroke-linecap="round"/><path d="M20 42c6-6 9-7 12-7 3 0 6 1 12 7" fill="none" stroke="${spec.detail}" stroke-width="2.3" stroke-linecap="round"/>`;
    if (spec.emblem === 4) return `<polygon points="${svgPointString(regularPolygonPoints(32, 32, 10.5, 4, spec.tilt + Math.PI / 4))}" fill="${spec.accent}" stroke="${spec.secondary}" stroke-width="1.8"/><circle cx="32" cy="32" r="2.5" fill="${spec.detail}"/>`;
    if (spec.emblem === 5) {
      let rays = '';
      for (let i = 0; i < spec.spokes; i++) {
        const angle = spec.spin + (Math.PI * 2 * i) / spec.spokes;
        const x1 = (32 + Math.cos(angle) * 7.5).toFixed(2);
        const y1 = (32 + Math.sin(angle) * 7.5).toFixed(2);
        const x2 = (32 + Math.cos(angle) * 13.5).toFixed(2);
        const y2 = (32 + Math.sin(angle) * 13.5).toFixed(2);
        rays += `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${spec.accent}" stroke-width="2.1" stroke-linecap="round"/>`;
      }
      return `${rays}<circle cx="32" cy="32" r="7" fill="${spec.accent}" stroke="${spec.secondary}" stroke-width="1.4"/>`;
    }
    if (spec.emblem === 6) return `<circle cx="32" cy="32" r="8.8" fill="none" stroke="${spec.accent}" stroke-width="2.4"/><circle cx="24" cy="27" r="2.8" fill="${spec.detail}"/><circle cx="40" cy="37" r="3.2" fill="${spec.accent}"/><path d="M22 39c3-6 8-9 14-9" stroke="${spec.detail}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
    return `<path d="M26 24c0-4 3-8 8-8 5 0 8 4 8 8 0 4-2 6-6 8 4 1 7 4 7 8 0 5-4 9-11 9-6 0-11-4-11-9 0-4 3-7 7-8-3-2-2-3-2-8z" fill="${spec.accent}" opacity=".95"/><circle cx="35" cy="27" r="5.8" fill="${spec.primary}"/>`;
  }

  function proceduralDotsSvg(spec) {
    let dots = '';
    for (let i = 0; i < spec.dots; i++) {
      const angle = spec.spin + (Math.PI * 2 * i) / spec.dots;
      const radius = 14 + (i % 2) * 3;
      const x = (32 + Math.cos(angle) * radius).toFixed(2);
      const y = (32 + Math.sin(angle) * radius).toFixed(2);
      const r = (2.1 + ((spec.seed >>> (i + 4)) % 14) / 10).toFixed(2);
      const fill = i % 2 === 0 ? spec.detail : spec.accent;
      dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity=".92"/>`;
    }
    return dots;
  }

  function proceduralTowerIconSvg(iconKey, size) {
    const s = size || 42;
    const spec = getProceduralTowerIconSpec(iconKey);
    return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><defs><linearGradient id="grad-${spec.seed}" x1="16" y1="14" x2="50" y2="50" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="${spec.detail}"/><stop offset="18%" stop-color="${spec.primary}"/><stop offset="100%" stop-color="${spec.secondary}"/></linearGradient></defs>${proceduralBadgeSvg(spec)}${proceduralOverlaySvg(spec)}${proceduralEmblemSvg(spec)}${proceduralDotsSvg(spec)}<circle cx="32" cy="32" r="2.6" fill="${spec.secondary}"/></svg>`;
  }

  function towerIconSvg(key, size) {
    const s = size || 42;
    const iconKey = (TOWERS[key] && TOWERS[key].icon) || key;
    if (iconKey === 'bottle') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><rect x="24" y="8" width="16" height="10" rx="4" fill="#bae6fd"/><path d="M20 18h24v30c0 7-5.5 12-12 12S20 55 20 48V18z" fill="#38bdf8"/><circle cx="32" cy="34" r="8" fill="#e0f2fe"/><path d="M28 34h8M32 30v8" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/></svg>`;
    if (iconKey === 'fan' || iconKey === 'windmill') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><rect x="28" y="42" width="8" height="14" rx="3" fill="#65a30d"/><circle cx="32" cy="28" r="14" fill="#bef264"/><circle cx="32" cy="28" r="4" fill="#3f6212"/><path d="M32 15c8 0 11 5 8 9s-8 3-8 3-3 5-8 3-1-12 8-15z" fill="#ecfccb"/></svg>`;
    if (iconKey === 'star' || iconKey === 'comet' || iconKey === 'moon') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><path d="M32 8l6.5 13.2 14.5 2.1-10.5 10.2 2.5 14.5L32 41.2 19 48l2.5-14.5L11 23.3l14.5-2.1L32 8z" fill="#fbbf24"/><circle cx="32" cy="32" r="6" fill="#fff7ed"/></svg>`;
    if (iconKey === 'radar' || iconKey === 'mirror') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><rect x="24" y="40" width="16" height="12" rx="4" fill="#312e81"/><circle cx="32" cy="28" r="16" fill="#c4b5fd"/><path d="M32 28l9-9" stroke="#4338ca" stroke-width="4" stroke-linecap="round"/></svg>`;
    if (iconKey === 'anchor' || iconKey === 'shell' || iconKey === 'coral') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><circle cx="32" cy="12" r="5" fill="#fcd34d"/><path d="M32 17v25" stroke="#fb923c" stroke-width="6" stroke-linecap="round"/><path d="M18 29c0 12 7 19 14 19s14-7 14-19" stroke="#f97316" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`;
    if (iconKey === 'cannon' || iconKey === 'rocket' || iconKey === 'volcano') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><circle cx="22" cy="42" r="8" fill="#64748b"/><circle cx="42" cy="42" r="8" fill="#64748b"/><rect x="16" y="34" width="32" height="8" rx="4" fill="#94a3b8"/><path d="M28 18h18l6 9H28z" fill="#f97316"/><rect x="20" y="18" width="10" height="12" rx="4" fill="#334155"/></svg>`;
    if (iconKey === 'thunder' || iconKey === 'torch') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><path d="M35 8L18 34h10l-3 22 19-28H34l1-20z" fill="#fde047"/><circle cx="20" cy="18" r="6" fill="#60a5fa"/></svg>`;
    if (iconKey === 'snow' || iconKey === 'glacier') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><circle cx="32" cy="32" r="16" fill="#dbeafe"/><path d="M32 14v36M14 32h36M20 20l24 24M44 20L20 44" stroke="#60a5fa" stroke-width="4" stroke-linecap="round"/></svg>`;
    if (iconKey === 'flower' || iconKey === 'lotus') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><circle cx="32" cy="31" r="6" fill="#fef08a"/><circle cx="22" cy="28" r="7" fill="#fb7185"/><circle cx="42" cy="28" r="7" fill="#f472b6"/><circle cx="26" cy="40" r="7" fill="#f9a8d4"/><circle cx="38" cy="40" r="7" fill="#fb7185"/></svg>`;
    if (iconKey === 'gear' || iconKey === 'magnet') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><circle cx="32" cy="32" r="14" fill="#94a3b8"/><circle cx="32" cy="32" r="6" fill="#1e293b"/><path d="M32 10v8M32 46v8M10 32h8M46 32h8M17 17l6 6M41 41l6 6M47 17l-6 6M23 41l-6 6" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round"/></svg>`;
    if (iconKey === 'bubble' || iconKey === 'pearl') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><circle cx="26" cy="32" r="12" fill="#67e8f9"/><circle cx="40" cy="24" r="8" fill="#a5f3fc"/><circle cx="42" cy="40" r="10" fill="#e0f2fe"/></svg>`;
    if (iconKey === 'mushroom' || iconKey === 'cactus' || iconKey === 'vine') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><path d="M18 30c0-9 7-15 14-15s14 6 14 15H18z" fill="#84cc16"/><rect x="28" y="30" width="8" height="18" rx="4" fill="#fef3c7"/><circle cx="24" cy="24" r="4" fill="#fef08a"/><circle cx="40" cy="24" r="4" fill="#fef08a"/></svg>`;
    if (iconKey === 'lantern' || iconKey === 'harp') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><path d="M26 12h12v6H26z" fill="#7c2d12"/><path d="M22 18h20l-3 22a8 8 0 01-8 7h2a8 8 0 01-8-7l-3-22z" fill="#fb923c"/><path d="M28 24h8M27 30h10M26 36h12" stroke="#fff7ed" stroke-width="3" stroke-linecap="round"/></svg>`;
    if (iconKey === 'seed') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><path d="M20 38c0-13 9-22 20-22 5 0 10 2 14 6-1 16-12 26-26 26-5 0-8-3-8-10z" fill="#b45309"/><path d="M24 44c10-2 17-10 21-21" stroke="#fde68a" stroke-width="3" stroke-linecap="round"/></svg>`;
    if (iconKey === 'hive') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><path d="M22 18h20l8 12-8 16H22l-8-16 8-12z" fill="#facc15"/><path d="M22 30h20M26 22h12M26 38h12" stroke="#78350f" stroke-width="3" stroke-linecap="round"/></svg>`;
    if (iconKey === 'crystal' || iconKey === 'icegem') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><path d="M32 8l12 12-4 24H24l-4-24L32 8z" fill="#bfdbfe"/><path d="M20 20h24M32 8v36" stroke="#eff6ff" stroke-width="3" stroke-linecap="round"/></svg>`;
    if (iconKey === 'aurora') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><path d="M12 40c8-16 12-20 20-20s12 4 20 20" fill="none" stroke="#67e8f9" stroke-width="6" stroke-linecap="round"/><path d="M16 46c8-11 12-14 16-14s8 3 16 14" fill="none" stroke="#a7f3d0" stroke-width="5" stroke-linecap="round"/></svg>`;
    if (iconKey === 'sweet') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><circle cx="32" cy="26" r="14" fill="#f472b6"/><path d="M22 20c4 6 16 6 20 12M24 30c6-2 10 3 16 1" stroke="#fff7ed" stroke-width="3" stroke-linecap="round"/><path d="M32 40v12" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/></svg>`;
    if (iconKey === 'totem' || iconKey === 'scorpion') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><rect x="24" y="12" width="16" height="34" rx="6" fill="#d97706"/><circle cx="32" cy="24" r="5" fill="#fde68a"/><path d="M27 34h10M25 42h14" stroke="#78350f" stroke-width="3" stroke-linecap="round"/></svg>`;
    if (iconKey === 'beacon') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><path d="M28 10h8l6 18-10 24-10-24 6-18z" fill="#f8fafc"/><path d="M18 30l8-6M46 30l-8-6" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/></svg>`;
    if (iconKey === 'forest') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><circle cx="26" cy="24" r="10" fill="#65a30d"/><circle cx="40" cy="26" r="9" fill="#84cc16"/><rect x="28" y="34" width="8" height="14" rx="4" fill="#7c4a1d"/><path d="M22 46c8-2 12-6 20-12" stroke="#4ade80" stroke-width="4" stroke-linecap="round"/></svg>`;
    if (iconKey === 'lava') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><path d="M20 46l6-26 8 10 6-18 4 34H20z" fill="#f97316"/><path d="M24 42h16" stroke="#7f1d1d" stroke-width="4" stroke-linecap="round"/></svg>`;
    if (iconKey === 'cosmos') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><circle cx="32" cy="32" r="16" fill="#8b5cf6"/><circle cx="38" cy="26" r="7" fill="#111827"/><path d="M14 18l6 3M44 46l6 3M18 50l3-6" stroke="#ddd6fe" stroke-width="3" stroke-linecap="round"/></svg>`;
    if (iconKey === 'storm') return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><path d="M16 24c4-8 9-12 16-12 10 0 16 7 16 16 0 10-7 16-18 16H18" fill="#93c5fd"/><path d="M34 24l-8 12h8l-4 12 12-16h-8l4-8z" fill="#facc15"/></svg>`;
    return proceduralTowerIconSvg(iconKey, s);
  }

  function makeSchedule(level) {
    const out = [];
    let time = 0.65;
    const waveGap = Math.max(4.8, level.waveGap || 5.6);
    level.waves.forEach((packs, index) => {
      out.push({ marker: true, wave: index + 1, time });
      packs.forEach(pack => {
        let t = time + (pack.offset || 0);
        for (let i = 0; i < pack.count; i++) {
          out.push({ marker: false, type: pack.type, wave: index + 1, route: pack.route || 0, time: +t.toFixed(2) });
          t += pack.gap;
        }
      });
      time += waveGap + packs.reduce((sum, item) => sum + item.count * item.gap, 0) * 0.32;
    });
    return out.sort((a, b) => a.time - b.time);
  }

  function buildCarrotHp(level) {
    const routeCount = Math.max(1, getLevelRoutes(level).length || 1);
    if (Array.isArray(level.carrotHp) && level.carrotHp.length) {
      return level.carrotHp.slice(0, routeCount).map(value => Math.max(1, Math.round(value || 1)));
    }
    if (routeCount === 1) return [Math.max(1, Math.round(level.hp || 10))];
    const totalHp = Math.max(routeCount, 10);
    const baseHp = Math.floor(totalHp / routeCount);
    let extra = totalHp - baseHp * routeCount;
    const result = Array.from({ length: routeCount }, () => baseHp);
    for (let i = routeCount - 1; i >= 0 && extra > 0; i--) {
      result[i] += 1;
      extra -= 1;
    }
    return result;
  }

  function totalCarrotHp(list) {
    return (list || []).reduce((sum, value) => sum + Math.max(0, value || 0), 0);
  }

  function createState(index) {
    const level = LEVELS[index];
    const carrotHp = buildCarrotHp(level);
    return { running: false, won: false, lost: false, gold: level.gold, hp: totalCarrotHp(carrotHp), carrotHp, carrotHpMax: carrotHp.slice(), time: 0, waveShown: 0, enemies: [], towers: [], shots: [], fx: [], pathCells: new Set(getLevelRoutes(level).flat().map(([x, y]) => cellKey(x, y))), hoverCell: null, waveNotice: null, props: level.props.map(item => Object.assign({ id: uid('prop'), hp: PROPS[item.type].hp, reward: PROPS[item.type].reward }, item)), schedule: makeSchedule(level) };
  }
  function isSelected(kind, id) { return !!selected && selected.kind === kind && selected.id === id; }
  function isLocked(kind, id) { return !!lockedTarget && lockedTarget.kind === kind && lockedTarget.id === id; }
  function sameEntity(a, b) { return !!a && !!b && a.kind === b.kind && a.id === b.id; }
  function getSelectionInfo() { return selected || lockedTarget; }
  function shouldRefreshSelectionEntity(kind, id) {
    const info = getSelectionInfo();
    return !!info && info.kind === kind && info.id === id;
  }
  function refreshSelectionEntity(kind, id) {
    if (shouldRefreshSelectionEntity(kind, id)) renderSelection();
  }
  function getTowerAt(x, y) { return state.towers.find(item => item.x === x && item.y === y); }
  function getPropAt(x, y) { return state.props.find(item => item.x === x && item.y === y); }
  function getEnemyAtPoint(px, py, world) { return state.enemies.find(item => !item.dead && dist(px, py, item.x, item.y) <= Math.max(world.cell * 0.28, world.cell * ENEMIES[item.type].r)); }
  function isPathCell(x, y) { return !!(state && state.pathCells && state.pathCells.has(cellKey(x, y))); }
  function isBuildableCell(x, y) { return !!state && isInsideGrid(x, y) && !isPathCell(x, y) && !getPropAt(x, y) && !getTowerAt(x, y); }
  function gridCellFromPoint(px, py, world) { const x = Math.floor((px - world.ox) / world.cell); const y = Math.floor((py - world.oy) / world.cell); return isInsideGrid(x, y) ? { x, y } : null; }
  function setWaveNotice(text, tone) { if (state) state.waveNotice = { text, tone: tone || 'warn', life: 2.1, max: 2.1 }; }

  function towerStats(key, level) {
    const base = TOWERS[key];
    const dmgMul = [1, 1.34, 1.78][level - 1] || 1;
    const cdMul = [1, 0.9, 0.82][level - 1] || 1;
    return { dmg: Math.round(base.dmg * dmgMul), range: base.range + (level - 1) * 0.18, cd: +(base.cd * cdMul).toFixed(2), splash: base.splash ? +(base.splash + (level - 1) * 0.08).toFixed(2) : 0 };
  }

  function setStatus(text, tone) {
    statusEl.textContent = text || '';
    statusEl.style.background = tone === 'good' ? 'rgba(34,197,94,.16)' : tone === 'bad' ? 'rgba(239,68,68,.18)' : 'rgba(250,204,21,.14)';
    statusEl.style.color = tone === 'good' ? '#bbf7d0' : tone === 'bad' ? '#fecaca' : '#fde68a';
  }

  function selectEntity(next) { selected = next || null; renderSelection(); }
  function setLockedTarget(next, options) {
    const keepSelected = !!(options && options.keepSelected);
    const previousLock = lockedTarget;
    lockedTarget = next || null;
    if (!lockedTarget && !keepSelected && selected && (selected.kind === 'enemy' || selected.kind === 'prop') && sameEntity(selected, previousLock)) {
      selected = null;
    }
    renderSelection();
  }
  function clearFocusedEntity(kind, id) {
    let changed = false;
    if (isSelected(kind, id)) {
      selected = null;
      changed = true;
    }
    if (isLocked(kind, id)) {
      lockedTarget = null;
      changed = true;
    }
    if (changed) renderSelection();
  }
  function allowedTowerKeys() { return currentLevel().allow.slice(); }
  function closeBuildMenu(keepSelection) { buildMenu = { open: false, x: -1, y: -1, px: 0, py: 0 }; buildMenuEl.style.display = 'none'; buildMenuEl.innerHTML = ''; if (!keepSelection && selected && selected.kind === 'cell') selectEntity(null); }
  function openResetConfirm() { resetConfirmEl.style.display = 'flex'; }
  function closeResetConfirm() { resetConfirmEl.style.display = 'none'; }
  function closeResultOverlay() { resultOverlayEl.style.display = 'none'; resultOverlayEl.innerHTML = ''; }
  function openResultOverlay(win) {
    const isLastLevel = levelIndex >= LEVELS.length - 1;
    const hasWinAction = !!win;
    const title = win ? t('carrotDefendSuccess') : t('carrotDefendFail');
    const desc = win ? t('win') : t('lose');
    const accent = win ? '#22c55e' : '#ef4444';
    const glow = win ? 'rgba(34,197,94,.26)' : 'rgba(239,68,68,.24)';
    const winActionLabel = isLastLevel ? t('backToFirstLevelLabel') : t('nextLevelLabel');
    // Win overlay: only show Next Level / Back to Level 1. Lose overlay: show Restart.
    resultOverlayEl.innerHTML = `<div style="width:min(440px,calc(100% - 24px));padding:24px 24px 20px;border-radius:26px;border:1px solid rgba(255,255,255,.14);background:linear-gradient(180deg,rgba(9,15,24,.98),rgba(15,23,42,.96));box-shadow:0 26px 72px rgba(0,0,0,.48);color:#f8fafc;position:relative;overflow:hidden;"><div style="position:absolute;inset:0 0 auto 0;height:4px;background:${accent};box-shadow:0 0 24px ${glow};"></div><div style="font-size:32px;font-weight:900;letter-spacing:.04em;color:${win ? '#dcfce7' : '#fee2e2'};text-align:center;margin-top:4px;">${title}</div><div style="margin-top:10px;font-size:15px;line-height:1.7;color:rgba(248,250,252,.8);text-align:center;">${desc}</div><div style="margin-top:20px;display:flex;justify-content:center;flex-wrap:wrap;gap:12px;">${hasWinAction ? `<button type="button" data-action="next-level" style="min-width:148px;height:42px;border:none;border-radius:14px;background:linear-gradient(180deg,#34d399,#10b981);color:#06281e;font-weight:800;cursor:pointer;">${winActionLabel}</button>` : `<button type="button" data-action="retry-level" style="min-width:148px;height:42px;border:none;border-radius:14px;background:linear-gradient(180deg,#facc15,#eab308);color:#1f2937;font-weight:800;cursor:pointer;">${t('restartGame')}</button>`}</div></div>`;
    resultOverlayEl.style.display = 'flex';
  }
  function getPreviewRangeInfo() { if (selected && selected.kind === 'tower') { const tower = state.towers.find(item => item.id === selected.id); if (tower) return { x: tower.x, y: tower.y, range: towerStats(tower.type, tower.level).range }; } if (selected && selected.kind === 'cell' && previewTowerKey) return { x: selected.x, y: selected.y, range: towerStats(previewTowerKey, 1).range }; return null; }
  function clearLockSelection() {
    const shouldClearCell = !!(selected && selected.kind === 'cell');
    const shouldClearSelectedLock = !!(selected && sameEntity(selected, lockedTarget));
    lockedTarget = null;
    closeBuildMenu(true);
    if (shouldClearCell || shouldClearSelectedLock) selected = null;
    renderSelection();
  }

  function renderBuildMenu() {
    if (!buildMenu.open || !isBuildableCell(buildMenu.x, buildMenu.y)) { closeBuildMenu(true); return; }
    const allow = allowedTowerKeys();
    buildMenuEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;"><strong style="font-size:13px;color:#f8fafc;">${t('carrotSelectTower')}</strong><button type="button" data-action="close" style="width:26px;height:26px;border:none;border-radius:999px;background:rgba(255,255,255,.08);color:#f8fafc;cursor:pointer;">×</button></div><div style="display:grid;grid-template-columns:1fr;gap:8px;">${allow.map(key => { const def = TOWERS[key]; const disabled = state.gold < def.cost; const active = previewTowerKey === key; return `<button type="button" data-tower="${key}" ${disabled ? 'disabled' : ''} style="display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:10px;padding:9px 10px;border-radius:14px;border:${active ? '1px solid rgba(253,224,71,.72)' : '1px solid rgba(255,255,255,.1)'};background:${disabled ? 'rgba(148,163,184,.16)' : active ? 'rgba(250,204,21,.14)' : 'rgba(15,23,42,.42)'};color:${disabled ? 'rgba(248,250,252,.42)' : '#f8fafc'};cursor:${disabled ? 'not-allowed' : 'pointer'};text-align:left;">` + `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(255,255,255,.06);">${towerIconSvg(key, 34)}</div>` + `<div><div style="font-size:13px;font-weight:700;">${def.name}</div><div style="font-size:11px;color:${disabled ? 'rgba(248,250,252,.32)' : 'rgba(248,250,252,.68)'};">${getTowerBriefDesc(key)}</div></div>` + `<div style="font-size:13px;font-weight:700;color:${disabled ? 'rgba(253,230,138,.4)' : '#fde68a'};">${def.cost}</div>` + `</button>`; }).join('')}</div>`;
    buildMenuEl.style.display = 'block';
    buildMenuEl.style.visibility = 'hidden';
    const menuWidth = buildMenuEl.offsetWidth || 250;
    const menuHeight = buildMenuEl.offsetHeight || 260;
    buildMenuEl.style.left = `${clamp(buildMenu.px - menuWidth * 0.5, 8, Math.max(8, boardEl.clientWidth - menuWidth - 8))}px`;
    buildMenuEl.style.top = `${clamp(buildMenu.py - menuHeight - 12, 8, Math.max(8, boardEl.clientHeight - menuHeight - 8))}px`;
    buildMenuEl.style.visibility = 'visible';
    syncBuildMenuHighlight();
  }

  function syncBuildMenuHighlight() {
    if (!buildMenuEl || buildMenuEl.style.display === 'none') return;
    buildMenuEl.querySelectorAll('button[data-tower]').forEach(button => {
      const key = button.dataset.tower;
      if (!key || !TOWERS[key]) return;
      const disabled = state.gold < TOWERS[key].cost;
      if (button.disabled !== disabled) button.disabled = disabled;
      const active = previewTowerKey === key;
      button.style.border = active ? '1px solid rgba(253,224,71,.72)' : '1px solid rgba(255,255,255,.1)';
      button.style.background = disabled ? 'rgba(148,163,184,.16)' : active ? 'rgba(250,204,21,.14)' : 'rgba(15,23,42,.42)';
      button.style.color = disabled ? 'rgba(248,250,252,.42)' : '#f8fafc';
      button.style.boxShadow = active ? '0 0 0 1px rgba(250,204,21,.14) inset, 0 0 24px rgba(250,204,21,.08)' : 'none';
      const meta = button.children[1];
      const price = button.children[2];
      if (meta && meta.lastElementChild) meta.lastElementChild.style.color = disabled ? 'rgba(248,250,252,.32)' : 'rgba(248,250,252,.68)';
      if (price) price.style.color = disabled ? 'rgba(253,230,138,.4)' : '#fde68a';
    });
  }

  function buildTower(x, y, key, freeBuild) {
    if (!freeBuild && !isBuildableCell(x, y)) { setStatus(TEXT.blocked, 'bad'); return false; }
    if (getTowerAt(x, y)) return false;
    const cost = freeBuild ? 0 : TOWERS[key].cost;
    if (state.gold < cost) { setStatus(TEXT.noGold, 'bad'); return false; }
    if (!freeBuild) state.gold -= cost;
    const world = getWorld((canvas.width || 960) / DPR(), (canvas.height || 600) / DPR());
    const pos = cellCenter(world, x, y);
    state.towers.push({ id: uid('tower'), type: key, x, y, level: 1, cd: 0, spent: cost, spawnAnim: 0.3 });
    state.fx.push({ kind: 'build', x: pos.x, y: pos.y, cellX: x, cellY: y, life: 0.3, max: 0.3, color: TOWERS[key].color });
    previewTowerKey = key;
    closeBuildMenu(true);
    selectEntity({ kind: 'tower', id: state.towers[state.towers.length - 1].id });
    setStatus(freeBuild ? TEXT.builtFromProp(TOWERS[key].name) : TEXT.builtTower(TOWERS[key].name), 'good');
    renderHud();
    renderTowerBar();
    return true;
  }

  function removeProp(prop) {
    clearFocusedEntity('prop', prop.id);
    state.props = state.props.filter(item => item.id !== prop.id);
    state.gold += prop.reward || 0;
    if (prop.reveal) buildTower(prop.x, prop.y, prop.reveal, true);
  }
  function hurtProp(prop, dmg) {
    if (!prop) return;
    prop.hp -= dmg;
    if (prop.hp <= 0) {
      removeProp(prop);
      return;
    }
    refreshSelectionEntity('prop', prop.id);
  }
  function hurtEnemy(enemy, dmg) {
    if (!enemy || enemy.dead) return;
    const real = Math.max(1, dmg - (enemy.armor || 0));
    enemy.hp -= real;
    if (enemy.hp <= 0) {
      clearFocusedEntity('enemy', enemy.id);
      enemy.dead = true;
      state.gold += enemy.reward;
      state.fx.push({ kind: 'coin', x: enemy.x, y: enemy.y, life: 0.48, max: 0.48, value: enemy.reward });
      return;
    }
    refreshSelectionEntity('enemy', enemy.id);
  }

  function spawnEnemy(type, waveIndex, world, routeIndex) {
    const meta = ENEMIES[type];
    const nextRoute = Math.max(0, Math.min((getLevelRoutes(currentLevel()).length - 1), routeIndex || 0));
    const start = pathPos(world, 0, nextRoute);
    state.enemies.push({ id: uid('enemy'), type, wave: waveIndex, routeIndex: nextRoute, hp: meta.hp, maxHp: meta.hp, reward: meta.reward, armor: meta.armor || 0, progress: 0, x: start.x, y: start.y, slow: 0, dead: false });
  }

  function spawnDue(world) {
    while (state.schedule.length && state.schedule[0].time <= state.time) {
      const next = state.schedule.shift();
      if (next.marker) { state.waveShown = next.wave; setStatus(TEXT.incoming(next.wave), 'warn'); setWaveNotice(TEXT.incoming(next.wave), 'warn'); }
      else spawnEnemy(next.type, next.wave, world, next.route || 0);
    }
  }

  function findTargets(tower, stats, world) {
    const center = cellCenter(world, tower.x, tower.y);
    const range = stats.range * world.cell;
    if (lockedTarget && (lockedTarget.kind === 'enemy' || lockedTarget.kind === 'prop')) {
      if (lockedTarget.kind === 'enemy') {
        const lockedEnemy = state.enemies.find(enemy => enemy.id === lockedTarget.id && !enemy.dead);
        if (!lockedEnemy) clearFocusedEntity('enemy', lockedTarget.id);
        else if (dist(center.x, center.y, lockedEnemy.x, lockedEnemy.y) <= range) return { center, kind: 'enemy', list: [lockedEnemy] };
      } else {
        const lockedProp = state.props.find(prop => prop.id === lockedTarget.id);
        if (!lockedProp) clearFocusedEntity('prop', lockedTarget.id);
        else {
          const propPos = cellCenter(world, lockedProp.x, lockedProp.y);
          if (dist(center.x, center.y, propPos.x, propPos.y) <= range) return { center, kind: 'prop', list: [lockedProp] };
        }
      }
    }
    const enemies = state.enemies.filter(enemy => !enemy.dead && dist(center.x, center.y, enemy.x, enemy.y) <= range).sort((a, b) => (b.progress - a.progress) || (a.hp - b.hp));
    if (enemies.length) return { center, kind: 'enemy', list: enemies };
    return { center, kind: 'enemy', list: [] };
  }

  function towerThemeOf(type) {
    return (TOWER_NOTES[type] && TOWER_NOTES[type].theme) || 'meadow';
  }

  function getSellRefund(tower) {
    if (!tower) return 0;
    return Math.round((tower.spent || 0) * 0.7);
  }

  function getUpgradeCost(tower) {
    if (!tower || tower.level >= 3) return 0;
    return Math.round(TOWERS[tower.type].cost * (tower.level === 1 ? 0.85 : 1.15));
  }

  function attackFxStyle(def, towerType) {
    if (!def) return 'orb';
    const theme = towerThemeOf(towerType);
    if (theme === 'candy') {
      if (def.mode === 'pulse' || def.mode === 'burst') return 'cream-pop';
      if (def.mode === 'volley' || def.mode === 'projectile') return 'candy-pearl';
      return 'candy-swirl';
    }
    if (theme === 'forest') {
      if (def.mode === 'burst' || def.mode === 'pulse') return 'spore-burst';
      if (def.mode === 'sniper' || def.mode === 'volley' || def.mode === 'projectile' || def.mode === 'slowProjectile') return 'leaf-dart';
      return 'leaf-orb';
    }
    if (theme === 'glacier' || theme === 'frost') {
      if (def.mode === 'pulse' || def.mode === 'burst') return 'snow-crystal';
      if (def.mode === 'chain' || def.mode === 'multibeam') return 'frost-shard';
      return 'ice-shard';
    }
    if (theme === 'harbor') {
      if (def.mode === 'pulse' || def.mode === 'burst') return 'shell-ripple';
      if (def.mode === 'artillery') return 'tide-shell';
      return 'water-drop';
    }
    if (theme === 'volcano') {
      if (def.mode === 'artillery' || def.mode === 'burst' || def.mode === 'pulse') return 'slag-burst';
      return 'ember-bolt';
    }
    if (theme === 'storm') {
      if (def.mode === 'burst' || def.mode === 'pulse') return 'cyclone-gust';
      if (def.mode === 'chain' || def.mode === 'beam' || def.mode === 'multibeam') return 'arc-bolt';
      return 'storm-orb';
    }
    if (def.mode === 'beam') return 'beam-orb';
    if (def.mode === 'slowBeam') return 'ice-shard';
    if (def.mode === 'sniper') return 'sniper-star';
    if (def.mode === 'pulse') return 'pulse-orb';
    if (def.mode === 'burst') return 'gust';
    if (def.mode === 'chain') return 'spark-bolt';
    if (def.mode === 'multibeam') return 'prism-shard';
    if (def.mode === 'volley') return 'dart';
    if (def.mode === 'artillery') return 'cannonball';
    if (def.mode === 'slowProjectile') return 'bubble';
    return 'orb';
  }

  function pushTravelFx(x1, y1, x2, y2, color, style, life, size) {
    state.fx.push({ kind: 'travel', x1, y1, x2, y2, color, style: style || 'orb', life: life || 0.22, max: life || 0.22, size: size || 6 });
  }

  function fireTower(tower, world) {
    const def = TOWERS[tower.type];
    const stats = towerStats(tower.type, tower.level);
    const found = findTargets(tower, stats, world);
    if (!found.list.length) return;
    const target = found.list[0];
    const center = found.center;
    if (def.mode === 'beam' || def.mode === 'sniper' || def.mode === 'slowBeam') {
      const tp = found.kind === 'enemy' ? { x: target.x, y: target.y } : cellCenter(world, target.x, target.y);
      pushTravelFx(center.x, center.y, tp.x, tp.y, def.color, attackFxStyle(def, tower.type), def.mode === 'sniper' ? 0.24 : 0.18, def.mode === 'sniper' ? 9 : 6);
      if (found.kind === 'enemy') {
        hurtEnemy(target, def.mode === 'sniper' ? Math.round(stats.dmg * 1.16) : stats.dmg);
        if (def.slow) target.slow = Math.max(target.slow, def.slow);
      } else {
        hurtProp(target, Math.round(stats.dmg * 0.9));
      }
      state.fx.push({ kind: 'beam', x1: center.x, y1: center.y, x2: tp.x, y2: tp.y, color: def.color, life: 0.18, max: 0.18 });
      tower.cd = stats.cd;
      return;
    }
    if (def.mode === 'burst' || def.mode === 'pulse') {
      const tp = found.kind === 'enemy' ? { x: target.x, y: target.y } : cellCenter(world, target.x, target.y);
      pushTravelFx(center.x, center.y, tp.x, tp.y, def.color, attackFxStyle(def, tower.type), 0.2, def.mode === 'pulse' ? 8 : 7);
      const radius = (def.mode === 'pulse' ? (def.pulse || stats.splash || 1.2) : (stats.splash || def.splash || 1)) * world.cell;
      if (found.kind === 'enemy') {
        state.enemies.forEach(enemy => {
          if (!enemy.dead && dist(enemy.x, enemy.y, tp.x, tp.y) <= radius) {
            hurtEnemy(enemy, stats.dmg);
            if (def.slow) enemy.slow = Math.max(enemy.slow, def.slow);
          }
        });
      } else {
        hurtProp(target, Math.round(stats.dmg * 1.15));
      }
      state.fx.push({ kind: 'ring', x: tp.x, y: tp.y, r: radius, color: def.color, life: 0.24, max: 0.24 });
      tower.cd = stats.cd;
      return;
    }
    if (def.mode === 'chain') {
      if (found.kind === 'enemy') {
        let current = target;
        let hit = stats.dmg;
        const visited = new Set();
        const jumps = def.jumps || 3;
        const chainRange = (def.chainRange || 1.55) * world.cell;
        pushTravelFx(center.x, center.y, target.x, target.y, def.color, attackFxStyle(def, tower.type), 0.2, 6);
        for (let i = 0; i < jumps && current; i++) {
          visited.add(current.id);
          hurtEnemy(current, Math.round(hit));
          const next = state.enemies.filter(enemy => !enemy.dead && !visited.has(enemy.id) && dist(enemy.x, enemy.y, current.x, current.y) <= chainRange).sort((a, b) => (b.progress - a.progress) || (a.hp - b.hp))[0];
          if (next) {
            pushTravelFx(current.x, current.y, next.x, next.y, def.color, 'spark-bolt', 0.16, 5);
            state.fx.push({ kind: 'beam', x1: current.x, y1: current.y, x2: next.x, y2: next.y, color: def.color, life: 0.16, max: 0.16 });
          }
          current = next;
          hit *= 0.8;
        }
      } else {
        hurtProp(target, Math.round(stats.dmg));
      }
      const p = found.kind === 'enemy' ? { x: target.x, y: target.y } : cellCenter(world, target.x, target.y);
      state.fx.push({ kind: 'spark', x: p.x, y: p.y, color: def.color, life: 0.2, max: 0.2 });
      tower.cd = stats.cd;
      return;
    }
    if (def.mode === 'multibeam') {
      if (found.kind === 'enemy') {
        found.list.slice(0, def.shots || 4).forEach((enemy, index) => {
          pushTravelFx(center.x, center.y, enemy.x, enemy.y, def.color, attackFxStyle(def, tower.type), 0.18, 6 + (index === 0 ? 1 : 0));
          hurtEnemy(enemy, Math.round(stats.dmg * (index === 0 ? 1.16 : 0.9)));
          state.fx.push({ kind: 'beam', x1: center.x, y1: center.y, x2: enemy.x, y2: enemy.y, color: def.color, life: 0.16, max: 0.16 });
        });
      } else {
        const tp = cellCenter(world, target.x, target.y);
        pushTravelFx(center.x, center.y, tp.x, tp.y, def.color, attackFxStyle(def, tower.type), 0.18, 6);
        hurtProp(target, Math.round(stats.dmg * 1.1));
        state.fx.push({ kind: 'beam', x1: center.x, y1: center.y, x2: tp.x, y2: tp.y, color: def.color, life: 0.16, max: 0.16 });
      }
      tower.cd = stats.cd;
      return;
    }
    if (def.mode === 'volley') {
      const targets = found.kind === 'enemy' ? found.list.slice(0, def.shots || 2) : [target];
      targets.forEach((unit, index) => {
        const tp = found.kind === 'enemy' ? { x: unit.x, y: unit.y } : cellCenter(world, unit.x, unit.y);
        state.shots.push({ id: uid('shot'), type: tower.type, style: attackFxStyle(def, tower.type), targetKind: found.kind, targetId: unit.id, x: center.x, y: center.y, tx: tp.x, ty: tp.y, dmg: Math.round(stats.dmg * (index === 0 ? 1 : 0.85)), splash: 0, speed: (def.speed || 8) * world.cell * 0.22, color: def.color, slow: def.slow || 0 });
      });
      tower.cd = stats.cd;
      return;
    }
    const tp = found.kind === 'enemy' ? { x: target.x, y: target.y } : cellCenter(world, target.x, target.y);
    state.shots.push({ id: uid('shot'), type: tower.type, style: attackFxStyle(def, tower.type), targetKind: found.kind, targetId: target.id, x: center.x, y: center.y, tx: tp.x, ty: tp.y, dmg: stats.dmg, splash: (stats.splash || def.splash || 0) * world.cell, speed: (def.speed || 6) * world.cell * 0.22, color: def.color, slow: def.slow || 0 });
    tower.cd = stats.cd;
  }

  function updateTowers(dt, world) { state.towers.forEach(tower => { tower.spawnAnim = Math.max(0, (tower.spawnAnim || 0) - dt); tower.cd -= dt; if (tower.cd <= 0) fireTower(tower, world); }); }
  function updateShots(dt, world) { state.shots = state.shots.filter(shot => { const target = shot.targetKind === 'enemy' ? state.enemies.find(enemy => enemy.id === shot.targetId && !enemy.dead) : state.props.find(prop => prop.id === shot.targetId); if (target) { if (shot.targetKind === 'enemy') { shot.tx = target.x; shot.ty = target.y; } else { const pos = cellCenter(world, target.x, target.y); shot.tx = pos.x; shot.ty = pos.y; } } const dx = shot.tx - shot.x; const dy = shot.ty - shot.y; const d = Math.hypot(dx, dy); const step = shot.speed * dt; if (d <= Math.max(4, step)) { if (shot.targetKind === 'enemy' && target) { hurtEnemy(target, shot.dmg); if (shot.slow) target.slow = Math.max(target.slow, shot.slow); if (shot.splash > 0) { state.enemies.forEach(enemy => { if (!enemy.dead && enemy.id !== target.id && dist(enemy.x, enemy.y, shot.tx, shot.ty) <= shot.splash) hurtEnemy(enemy, Math.round(shot.dmg * 0.45)); }); state.fx.push({ kind: 'ring', x: shot.tx, y: shot.ty, r: shot.splash, color: shot.color, life: 0.22, max: 0.22 }); } } else if (shot.targetKind === 'prop' && target) hurtProp(target, Math.round(shot.dmg * 0.9)); state.fx.push({ kind: 'spark', x: shot.tx, y: shot.ty, color: shot.color, life: 0.18, max: 0.18 }); return false; } shot.x += dx / d * step; shot.y += dy / d * step; return true; }); }
  function updateEnemies(dt, world) { state.enemies.forEach(enemy => { const meta = ENEMIES[enemy.type]; const slowMul = enemy.slow > 0 ? 0.7 : 1; enemy.slow = Math.max(0, enemy.slow - dt); enemy.progress += meta.speed * slowMul * dt * world.cell * 0.82; const routeIndex = Math.max(0, Math.min((state.carrotHp.length - 1), enemy.routeIndex || 0)); const pos = pathPos(world, enemy.progress, routeIndex); enemy.x = pos.x; enemy.y = pos.y; if (enemy.progress >= getRouteTotal(world, routeIndex)) { clearFocusedEntity('enemy', enemy.id); enemy.dead = true; state.carrotHp[routeIndex] = Math.max(0, (state.carrotHp[routeIndex] || 0) - 1); state.hp = totalCarrotHp(state.carrotHp); } }); state.enemies = state.enemies.filter(enemy => !enemy.dead); if ((state.carrotHp || []).some(value => value <= 0) && !state.lost) finishLevel(false); }
  function updateFx(dt) { state.fx = state.fx.filter(item => { item.life -= dt; return item.life > 0; }); if (state.waveNotice) { state.waveNotice.life -= dt; if (state.waveNotice.life <= 0) state.waveNotice = null; } }
  function finishLevel(win) { state.running = false; state.won = !!win; state.lost = !win; if (win) { setWaveNotice(TEXT.defendSuccess, 'good'); setStatus(TEXT.defendSuccess, 'good'); } else { setWaveNotice(TEXT.defendFail, 'bad'); setStatus(TEXT.defendFail, 'bad'); } closeResetConfirm(); openResultOverlay(win); }
  function resizeCanvas() { const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return; const ratio = DPR(); canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio); ctx.setTransform(ratio, 0, 0, ratio, 0, 0); }
  function roundRect(x, y, w, h, r) { const radius = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.arcTo(x + w, y, x + w, y + h, radius); ctx.arcTo(x + w, y + h, x, y + h, radius); ctx.arcTo(x, y + h, x, y, radius); ctx.arcTo(x, y, x + w, y, radius); ctx.closePath(); }
  function traceShape(points) { if (!points || !points.length) return; ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]); ctx.closePath(); }

  function drawProceduralTowerGlyph(iconKey, radius) {
    const spec = getProceduralTowerIconSpec(iconKey);
    const badgeFill = ctx.createLinearGradient(-radius * 0.8, -radius * 0.8, radius * 0.86, radius * 0.86);
    badgeFill.addColorStop(0, spec.detail);
    badgeFill.addColorStop(0.2, spec.primary);
    badgeFill.addColorStop(1, spec.secondary);
    ctx.save();
    ctx.fillStyle = badgeFill;
    ctx.strokeStyle = spec.detail;
    ctx.lineWidth = Math.max(1.6, radius * 0.11);
    if (spec.badge === 0) {
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (spec.badge === 1) {
      roundRect(-radius * 0.82, -radius * 0.82, radius * 1.64, radius * 1.64, radius * 0.5);
      ctx.fill();
      ctx.stroke();
    } else if (spec.badge === 2) {
      traceShape(regularPolygonPoints(0, 0, radius * 0.86, 6, spec.spin - Math.PI / 2));
      ctx.fill();
      ctx.stroke();
    } else if (spec.badge === 3) {
      traceShape(regularPolygonPoints(0, 0, radius * 0.82, 4, spec.spin + Math.PI / 4));
      ctx.fill();
      ctx.stroke();
    } else if (spec.badge === 4) {
      traceShape(starPoints(0, 0, radius * 0.86, radius * 0.5, spec.spokes, spec.spin - Math.PI / 2));
      ctx.fill();
      ctx.stroke();
    } else if (spec.badge === 5) {
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.9);
      ctx.bezierCurveTo(radius * 0.48, -radius * 0.9, radius * 0.8, -radius * 0.46, radius * 0.8, -radius * 0.06);
      ctx.bezierCurveTo(radius * 0.8, radius * 0.42, radius * 0.42, radius * 0.72, 0, radius * 0.96);
      ctx.bezierCurveTo(-radius * 0.42, radius * 0.72, -radius * 0.8, radius * 0.42, -radius * 0.8, -radius * 0.06);
      ctx.bezierCurveTo(-radius * 0.8, -radius * 0.46, -radius * 0.48, -radius * 0.9, 0, -radius * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const petals = [[0, -0.45], [-0.46, 0.1], [0.46, 0.1], [0, 0.54]];
      petals.forEach(([px, py], index) => {
        ctx.fillStyle = index === petals.length - 1 ? spec.secondary : spec.primary;
        ctx.beginPath();
        ctx.arc(px * radius, py * radius, radius * 0.44, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = spec.accent;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.44, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = spec.detail;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.44, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = spec.detail;
    ctx.lineWidth = Math.max(1.2, radius * 0.08);
    if (spec.stripe === 0) {
      ctx.globalAlpha = 0.78;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.62, radius * 0.56);
      ctx.lineTo(radius * 0.62, -radius * 0.56);
      ctx.stroke();
      ctx.globalAlpha = 0.54;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.48, radius * 0.8);
      ctx.lineTo(radius * 0.78, -radius * 0.4);
      ctx.stroke();
    } else if (spec.stripe === 1) {
      ctx.globalAlpha = 0.68;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.62, -radius * 0.3);
      ctx.quadraticCurveTo(0, -radius * 0.86, radius * 0.62, -radius * 0.3);
      ctx.stroke();
      ctx.globalAlpha = 0.56;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.58, radius * 0.38);
      ctx.quadraticCurveTo(0, radius * 0.88, radius * 0.58, radius * 0.38);
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.45;
      [-0.4, 0, 0.4].forEach(offset => {
        ctx.beginPath();
        ctx.moveTo(-radius * 0.62, radius * offset);
        ctx.lineTo(radius * 0.62, radius * offset);
        ctx.stroke();
      });
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = spec.accent;
    ctx.strokeStyle = spec.secondary;
    ctx.lineWidth = Math.max(1.2, radius * 0.09);
    if (spec.emblem === 0) {
      ctx.beginPath();
      ctx.moveTo(radius * 0.14, -radius * 0.74);
      ctx.lineTo(-radius * 0.42, radius * 0.08);
      ctx.lineTo(-radius * 0.02, radius * 0.08);
      ctx.lineTo(-radius * 0.2, radius * 0.72);
      ctx.lineTo(radius * 0.46, -radius * 0.18);
      ctx.lineTo(radius * 0.08, -radius * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (spec.emblem === 1) {
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.42, 0, Math.PI * 2);
      ctx.strokeStyle = spec.accent;
      ctx.lineWidth = Math.max(1.4, radius * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.66);
      ctx.lineTo(0, -radius * 0.26);
      ctx.moveTo(0, radius * 0.26);
      ctx.lineTo(0, radius * 0.66);
      ctx.moveTo(-radius * 0.66, 0);
      ctx.lineTo(-radius * 0.26, 0);
      ctx.moveTo(radius * 0.26, 0);
      ctx.lineTo(radius * 0.66, 0);
      ctx.stroke();
    } else if (spec.emblem === 2) {
      ctx.fillStyle = spec.accent;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.4, radius * 0.56);
      ctx.quadraticCurveTo(radius * 0.26, radius * 0.48, radius * 0.52, -radius * 0.34);
      ctx.quadraticCurveTo(radius * 0.1, -radius * 0.56, -radius * 0.36, -radius * 0.26);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = spec.secondary;
      ctx.lineWidth = Math.max(1, radius * 0.08);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.1, radius * 0.4);
      ctx.lineTo(radius * 0.24, -radius * 0.12);
      ctx.stroke();
    } else if (spec.emblem === 3) {
      ctx.strokeStyle = spec.accent;
      ctx.lineWidth = Math.max(1.8, radius * 0.16);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.66, radius * 0.22);
      ctx.quadraticCurveTo(-radius * 0.18, -radius * 0.68, radius * 0.14, -radius * 0.14);
      ctx.quadraticCurveTo(radius * 0.4, radius * 0.26, radius * 0.66, -radius * 0.18);
      ctx.stroke();
      ctx.strokeStyle = spec.detail;
      ctx.lineWidth = Math.max(1.2, radius * 0.1);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.54, radius * 0.5);
      ctx.quadraticCurveTo(-radius * 0.08, 0, radius * 0.44, radius * 0.26);
      ctx.stroke();
    } else if (spec.emblem === 4) {
      traceShape(regularPolygonPoints(0, 0, radius * 0.5, 4, spec.tilt + Math.PI / 4));
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = spec.detail;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.14, 0, Math.PI * 2);
      ctx.fill();
    } else if (spec.emblem === 5) {
      ctx.strokeStyle = spec.accent;
      ctx.lineWidth = Math.max(1.2, radius * 0.11);
      for (let i = 0; i < spec.spokes; i++) {
        const angle = spec.spin + (Math.PI * 2 * i) / spec.spokes;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * radius * 0.36, Math.sin(angle) * radius * 0.36);
        ctx.lineTo(Math.cos(angle) * radius * 0.66, Math.sin(angle) * radius * 0.66);
        ctx.stroke();
      }
      ctx.fillStyle = spec.accent;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = spec.secondary;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.34, 0, Math.PI * 2);
      ctx.stroke();
    } else if (spec.emblem === 6) {
      ctx.strokeStyle = spec.accent;
      ctx.lineWidth = Math.max(1.2, radius * 0.12);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = spec.detail;
      ctx.beginPath();
      ctx.arc(-radius * 0.36, -radius * 0.2, radius * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = spec.accent;
      ctx.beginPath();
      ctx.arc(radius * 0.36, radius * 0.22, radius * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = spec.detail;
      ctx.lineWidth = Math.max(1, radius * 0.08);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.46, radius * 0.34);
      ctx.quadraticCurveTo(0, -radius * 0.08, radius * 0.42, radius * 0.02);
      ctx.stroke();
    } else {
      ctx.fillStyle = spec.accent;
      ctx.beginPath();
      ctx.arc(-radius * 0.08, radius * 0.02, radius * 0.34, Math.PI * 0.6, Math.PI * 1.9);
      ctx.arc(radius * 0.24, radius * 0.04, radius * 0.3, Math.PI, Math.PI * 1.9);
      ctx.fill();
      ctx.fillStyle = spec.primary;
      ctx.beginPath();
      ctx.arc(radius * 0.14, -radius * 0.18, radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < spec.dots; i++) {
      const angle = spec.spin + (Math.PI * 2 * i) / spec.dots;
      const orbit = radius * (0.62 + (i % 2) * 0.14);
      const dotRadius = radius * (0.11 + (((spec.seed >>> (i + 4)) % 14) / 140));
      ctx.fillStyle = i % 2 === 0 ? spec.detail : spec.accent;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * orbit, Math.sin(angle) * orbit, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = spec.secondary;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBoard(world) {
    const theme = THEMES[currentLevel().theme];
    const routes = getLevelRoutes(currentLevel());
    const sky = ctx.createLinearGradient(0, 0, 0, world.height); sky.addColorStop(0, theme.sky[0]); sky.addColorStop(0.45, theme.sky[1]); sky.addColorStop(1, theme.sky[2]); ctx.fillStyle = sky; ctx.fillRect(0, 0, world.width, world.height);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { ctx.fillStyle = (x + y) % 2 === 0 ? theme.a : theme.b; ctx.fillRect(world.ox + x * world.cell, world.oy + y * world.cell, world.cell, world.cell); }
    routes.forEach((route, routeIndex) => {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = theme.pathOuter;
      ctx.lineWidth = world.cell * 0.68;
      ctx.beginPath();
      route.forEach(([x, y], i) => { const p = cellCenter(world, x, y); if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
      ctx.strokeStyle = theme.pathInner;
      ctx.lineWidth = world.cell * 0.52;
      ctx.beginPath();
      route.forEach(([x, y], i) => { const p = cellCenter(world, x, y); if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
      const spawn = route[0];
      const spawnPos = cellCenter(world, spawn[0], spawn[1]);
      ctx.save();
      ctx.translate(spawnPos.x, spawnPos.y);
      ctx.fillStyle = 'rgba(15,23,42,.72)';
      roundRect(-world.cell * 0.42, -world.cell * 0.66, world.cell * 0.84, world.cell * 0.26, 10);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.font = `700 ${Math.max(10, world.cell * 0.14)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(routes.length > 1 ? TEXT.spawnPointN(routeIndex + 1) : TEXT.spawnPoint, 0, -world.cell * 0.48);
      ctx.fillStyle = 'rgba(250,204,21,.22)';
      ctx.beginPath();
      ctx.arc(0, 0, world.cell * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-world.cell * 0.12, 0);
      ctx.lineTo(world.cell * 0.08, 0);
      ctx.lineTo(world.cell * 0.01, world.cell * 0.1);
      ctx.moveTo(world.cell * 0.08, 0);
      ctx.lineTo(world.cell * 0.01, -world.cell * 0.1);
      ctx.stroke();
      ctx.restore();
    });
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { if (!isBuildableCell(x, y)) continue; const pos = cellCenter(world, x, y); const hovered = state.hoverCell && state.hoverCell.x === x && state.hoverCell.y === y; const active = buildMenu.open && buildMenu.x === x && buildMenu.y === y; ctx.beginPath(); ctx.fillStyle = active ? 'rgba(250,204,21,.34)' : hovered ? 'rgba(255,243,196,.24)' : 'rgba(255,243,196,.16)'; ctx.strokeStyle = active ? '#fde047' : hovered ? 'rgba(253,224,71,.72)' : 'rgba(255,243,196,.38)'; ctx.lineWidth = active ? 2.3 : hovered ? 1.8 : 1.1; ctx.arc(pos.x, pos.y, hovered ? world.cell * 0.2 : world.cell * 0.17, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    routes.forEach((route, routeIndex) => {
      const exit = route[route.length - 1];
      const carrot = cellCenter(world, exit[0], exit[1]);
      const carrotHp = state.carrotHp && state.carrotHp.length ? (state.carrotHp[routeIndex] ?? state.carrotHp[0] ?? state.hp) : state.hp;
      const carrotHpMax = state.carrotHpMax && state.carrotHpMax.length ? (state.carrotHpMax[routeIndex] ?? state.carrotHpMax[0] ?? Math.max(1, carrotHp)) : Math.max(1, carrotHp);
      const carrotRate = carrotHpMax > 0 ? carrotHp / carrotHpMax : 0;
      ctx.save();
      ctx.translate(carrot.x, carrot.y);
      ctx.scale(routeIndex === 0 ? 1 : 0.92, routeIndex === 0 ? 1 : 0.92);
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-world.cell * 0.16, world.cell * 0.14);
      ctx.quadraticCurveTo(0, world.cell * 0.42, world.cell * 0.16, world.cell * 0.14);
      ctx.lineTo(world.cell * 0.18, -world.cell * 0.16);
      ctx.quadraticCurveTo(0, -world.cell * 0.26, -world.cell * 0.18, -world.cell * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(0, -world.cell * 0.24, world.cell * 0.08, world.cell * 0.15, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -world.cell * 0.24, world.cell * 0.08, world.cell * 0.15, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(15,23,42,.86)';
      roundRect(-world.cell * 0.34, -world.cell * 0.82, world.cell * 0.68, world.cell * 0.24, 12);
      ctx.fill();
      ctx.strokeStyle = carrotRate > 0.66 ? 'rgba(74,222,128,.78)' : carrotRate > 0.33 ? 'rgba(250,204,21,.78)' : 'rgba(248,113,113,.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = `800 ${Math.max(12, world.cell * 0.16)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(carrotHp), 0, -world.cell * 0.7);
      ctx.restore();
    });
  }

  function drawProp(prop, world) {
    const pos = cellCenter(world, prop.x, prop.y); prop.screenX = pos.x; prop.screenY = pos.y; const meta = PROPS[prop.type]; const s = world.cell * 0.72; ctx.save(); ctx.translate(pos.x, pos.y); ctx.fillStyle = meta.color;
    if (prop.type === 'crate' || prop.type === 'chest') { ctx.fillRect(-s * 0.46, -s * 0.34, s * 0.92, s * 0.68); ctx.fillStyle = meta.accent; ctx.fillRect(-s * 0.08, -s * 0.24, s * 0.16, s * 0.48); }
    else if (prop.type === 'cake') { ctx.beginPath(); ctx.ellipse(0, 2, s * 0.48, s * 0.34, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = meta.accent; ctx.beginPath(); ctx.ellipse(0, -s * 0.14, s * 0.42, s * 0.2, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (prop.type === 'drum') { ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = meta.accent; ctx.beginPath(); ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2); ctx.fill(); }
    else if (prop.type === 'snowman') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, s * 0.16, s * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0, -s * 0.16, s * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = meta.accent; ctx.beginPath(); ctx.arc(0, -s * 0.34, s * 0.08, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(-s * 0.44, s * 0.34); ctx.lineTo(-s * 0.3, -s * 0.22); ctx.quadraticCurveTo(0, -s * 0.52, s * 0.3, -s * 0.22); ctx.lineTo(s * 0.44, s * 0.34); ctx.closePath(); ctx.fill(); }
    const rate = clamp(prop.hp / (PROPS[prop.type].hp || prop.hp || 1), 0, 1); ctx.fillStyle = 'rgba(15,23,42,.45)'; ctx.fillRect(-s * 0.44, s * 0.54, s * 0.88, 5); ctx.fillStyle = rate > 0.55 ? '#22c55e' : rate > 0.25 ? '#facc15' : '#ef4444'; ctx.fillRect(-s * 0.44, s * 0.54, s * 0.88 * rate, 5);
    ctx.fillStyle = 'rgba(15,23,42,.78)';
    roundRect(-s * 0.42, -s * 0.7, s * 0.84, s * 0.22, 8);
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.font = `700 ${Math.max(10, s * 0.16)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`+${prop.reward}`, 0, -s * 0.55);
    if (prop.reveal && TOWERS[prop.reveal]) {
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.font = `700 ${Math.max(9, s * 0.13)}px sans-serif`;
      ctx.fillText(TEXT.hasSurprise, 0, -s * 0.36);
    }
    ctx.restore();
  }

  function drawTowerGlyph(type, radius) {
    const iconKey = (TOWERS[type] && TOWERS[type].icon) || type;
    if (iconKey === 'bottle') { ctx.fillStyle = '#bae6fd'; roundRect(-radius * 0.18, -radius * 1.08, radius * 0.36, radius * 0.28, radius * 0.1); ctx.fill(); ctx.fillStyle = '#38bdf8'; roundRect(-radius * 0.38, -radius * 0.78, radius * 0.76, radius * 1.18, radius * 0.2); ctx.fill(); ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.arc(0, radius * 0.02, radius * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-radius * 0.12, radius * 0.02); ctx.lineTo(radius * 0.12, radius * 0.02); ctx.moveTo(0, -radius * 0.1); ctx.lineTo(0, radius * 0.14); ctx.stroke(); return; }
    if (iconKey === 'fan' || iconKey === 'windmill') { ctx.fillStyle = '#65a30d'; roundRect(-radius * 0.08, radius * 0.36, radius * 0.16, radius * 0.5, radius * 0.06); ctx.fill(); ctx.fillStyle = '#bef264'; ctx.beginPath(); ctx.arc(0, -radius * 0.1, radius * 0.54, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ecfccb'; ctx.beginPath(); ctx.moveTo(0, -radius * 0.62); ctx.quadraticCurveTo(radius * 0.54, -radius * 0.3, radius * 0.1, 0); ctx.quadraticCurveTo(-radius * 0.16, radius * 0.1, 0, -radius * 0.62); ctx.fill(); return; }
    if (iconKey === 'star' || iconKey === 'comet' || iconKey === 'moon') { ctx.fillStyle = '#fbbf24'; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 0.4; const b = a + Math.PI * 0.2; const outer = radius * 0.76; const inner = radius * 0.34; if (i === 0) ctx.moveTo(Math.cos(a) * outer, Math.sin(a) * outer); else ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer); ctx.lineTo(Math.cos(b) * inner, Math.sin(b) * inner); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff7ed'; ctx.beginPath(); ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2); ctx.fill(); return; }
    if (iconKey === 'radar' || iconKey === 'mirror') { ctx.fillStyle = '#312e81'; roundRect(-radius * 0.34, radius * 0.38, radius * 0.68, radius * 0.34, radius * 0.12); ctx.fill(); ctx.fillStyle = '#c4b5fd'; ctx.beginPath(); ctx.arc(0, -radius * 0.12, radius * 0.58, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#4338ca'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -radius * 0.12); ctx.lineTo(radius * 0.36, -radius * 0.48); ctx.stroke(); return; }
    if (iconKey === 'anchor' || iconKey === 'shell' || iconKey === 'coral') { ctx.fillStyle = '#fcd34d'; ctx.beginPath(); ctx.arc(0, -radius * 0.86, radius * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -radius * 0.68); ctx.lineTo(0, radius * 0.44); ctx.moveTo(-radius * 0.5, -radius * 0.08); ctx.quadraticCurveTo(-radius * 0.44, radius * 0.56, 0, radius * 0.56); ctx.quadraticCurveTo(radius * 0.44, radius * 0.56, radius * 0.5, -radius * 0.08); ctx.stroke(); return; }
    if (iconKey === 'cannon' || iconKey === 'rocket' || iconKey === 'volcano') { // SVG: two side circles + base + top turret
      ctx.fillStyle = '#64748b';
      ctx.beginPath(); ctx.arc(-radius * 0.3125, radius * 0.3125, radius * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(radius * 0.3125, radius * 0.3125, radius * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#94a3b8';
      roundRect(-radius * 0.5, radius * 0.0625, radius * 1.0, radius * 0.25, radius * 0.125); ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-radius * 0.125, -radius * 0.4375);
      ctx.lineTo(radius * 0.4375, -radius * 0.4375);
      ctx.lineTo(radius * 0.625, -radius * 0.15625);
      ctx.lineTo(-radius * 0.125, -radius * 0.15625);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#334155';
      roundRect(-radius * 0.375, -radius * 0.4375, radius * 0.3125, radius * 0.375, radius * 0.125); ctx.fill();
      return;
    }
    if (iconKey === 'thunder' || iconKey === 'torch') { // SVG: lightning + small blue orb
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(radius * 0.09375, -radius * 0.75);
      ctx.lineTo(-radius * 0.4375, radius * 0.0625);
      ctx.lineTo(-radius * 0.125, radius * 0.0625);
      ctx.lineTo(-radius * 0.21875, radius * 0.75);
      ctx.lineTo(radius * 0.375, -radius * 0.125);
      ctx.lineTo(radius * 0.0625, -radius * 0.125);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.arc(-radius * 0.375, -radius * 0.4375, radius * 0.1875, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (iconKey === 'snow' || iconKey === 'glacier') { // SVG: circle + cross lines
      ctx.fillStyle = '#dbeafe';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = Math.max(1.2, radius * 0.11);
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.5625); ctx.lineTo(0, radius * 0.5625);
      ctx.moveTo(-radius * 0.5625, 0); ctx.lineTo(radius * 0.5625, 0);
      ctx.moveTo(-radius * 0.375, -radius * 0.375); ctx.lineTo(radius * 0.375, radius * 0.375);
      ctx.moveTo(radius * 0.375, -radius * 0.375); ctx.lineTo(-radius * 0.375, radius * 0.375);
      ctx.stroke();
      return;
    }
    if (iconKey === 'flower' || iconKey === 'lotus') { // SVG: 1 center + 4 petals
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, -radius * 0.03125, radius * 0.1875, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(-radius * 0.3125, -radius * 0.125, radius * 0.21875, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(radius * 0.3125, -radius * 0.125, radius * 0.21875, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f9a8d4';
      ctx.beginPath();
      ctx.arc(-radius * 0.1875, radius * 0.25, radius * 0.21875, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(radius * 0.1875, radius * 0.25, radius * 0.21875, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (iconKey === 'gear' || iconKey === 'magnet') { // SVG: outer gear circle + inner core + radial strokes
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.4375, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.1875, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = Math.max(1.2, radius * 0.12);
      ctx.beginPath();
      // vertical strokes
      ctx.moveTo(0, -radius * 0.6875); ctx.lineTo(0, -radius * 0.4375);
      ctx.moveTo(0, radius * 0.4375); ctx.lineTo(0, radius * 0.6875);
      // horizontal strokes
      ctx.moveTo(-radius * 0.6875, 0); ctx.lineTo(-radius * 0.4375, 0);
      ctx.moveTo(radius * 0.4375, 0); ctx.lineTo(radius * 0.6875, 0);
      // diagonals
      ctx.moveTo(-radius * 0.46875, -radius * 0.46875); ctx.lineTo(-radius * 0.28125, -radius * 0.28125);
      ctx.moveTo(radius * 0.28125, radius * 0.28125); ctx.lineTo(radius * 0.46875, radius * 0.46875);
      ctx.moveTo(radius * 0.46875, -radius * 0.46875); ctx.lineTo(radius * 0.28125, -radius * 0.28125);
      ctx.moveTo(-radius * 0.28125, radius * 0.28125); ctx.lineTo(-radius * 0.46875, radius * 0.46875);
      ctx.stroke();
      return;
    }
    if (iconKey === 'bubble' || iconKey === 'pearl') { // SVG: 3 circles
      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.arc(-radius * 0.1875, 0, radius * 0.375, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a5f3fc';
      ctx.beginPath();
      ctx.arc(radius * 0.25, -radius * 0.25, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(radius * 0.3125, radius * 0.25, radius * 0.3125, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (iconKey === 'mushroom' || iconKey === 'cactus' || iconKey === 'vine') { // SVG: cap + stem + 2 spores
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.ellipse(0, -radius * 0.296875, radius * 0.4375, radius * 0.234375, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      roundRect(-radius * 0.125, radius * 0.21875, radius * 0.25, radius * 0.5625, radius * 0.125); ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-radius * 0.25, -radius * 0.25, radius * 0.125, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(radius * 0.25, -radius * 0.25, radius * 0.125, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (iconKey === 'lantern' || iconKey === 'harp') { // SVG: top cap + lantern body + inner lines
      ctx.fillStyle = '#7c2d12';
      roundRect(-radius * 0.1875, -radius * 0.625, radius * 0.375, radius * 0.1875, radius * 0.08); ctx.fill();

      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.moveTo(-radius * 0.3125, -radius * 0.4375);
      ctx.lineTo(radius * 0.3125, -radius * 0.4375);
      ctx.lineTo(radius * 0.25, radius * 0.46875);
      ctx.quadraticCurveTo(0, radius * 0.52, -radius * 0.25, radius * 0.46875);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#fff7ed';
      ctx.lineWidth = Math.max(1.1, radius * 0.1);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-radius * 0.125, -radius * 0.25); ctx.lineTo(radius * 0.125, -radius * 0.25);
      ctx.moveTo(-radius * 0.15625, -radius * 0.0625); ctx.lineTo(radius * 0.15625, -radius * 0.0625);
      ctx.moveTo(-radius * 0.1875, radius * 0.125); ctx.lineTo(radius * 0.1875, radius * 0.125);
      ctx.stroke();
      return;
    }
    if (iconKey === 'seed') { ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.moveTo(-radius * 0.1, -radius * 0.66); ctx.quadraticCurveTo(radius * 0.62, -radius * 0.34, radius * 0.34, radius * 0.5); ctx.quadraticCurveTo(-radius * 0.42, radius * 0.58, -radius * 0.48, -radius * 0.18); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-radius * 0.12, radius * 0.28); ctx.lineTo(radius * 0.26, -radius * 0.24); ctx.stroke(); return; }
    if (iconKey === 'hive') { ctx.fillStyle = '#facc15'; roundRect(-radius * 0.48, -radius * 0.5, radius * 0.96, radius * 1.02, radius * 0.16); ctx.fill(); ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2; [-0.22, 0.02, 0.26].forEach(offset => { ctx.beginPath(); ctx.moveTo(-radius * 0.34, radius * offset); ctx.lineTo(radius * 0.34, radius * offset); ctx.stroke(); }); return; }
    if (iconKey === 'crystal' || iconKey === 'icegem') { ctx.fillStyle = '#bfdbfe'; ctx.beginPath(); ctx.moveTo(0, -radius * 0.82); ctx.lineTo(radius * 0.44, -radius * 0.18); ctx.lineTo(radius * 0.22, radius * 0.66); ctx.lineTo(-radius * 0.22, radius * 0.66); ctx.lineTo(-radius * 0.44, -radius * 0.18); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#eff6ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -radius * 0.74); ctx.lineTo(0, radius * 0.56); ctx.stroke(); return; }
    if (iconKey === 'aurora') { ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-radius * 0.7, radius * 0.18); ctx.quadraticCurveTo(-radius * 0.24, -radius * 0.72, radius * 0.12, -radius * 0.16); ctx.quadraticCurveTo(radius * 0.42, radius * 0.24, radius * 0.7, -radius * 0.26); ctx.stroke(); ctx.strokeStyle = '#a7f3d0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-radius * 0.58, radius * 0.4); ctx.quadraticCurveTo(-radius * 0.12, -radius * 0.2, radius * 0.46, radius * 0.22); ctx.stroke(); return; }
    if (iconKey === 'sweet') { ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.arc(0, -radius * 0.16, radius * 0.54, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff7ed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-radius * 0.28, -radius * 0.34); ctx.lineTo(radius * 0.26, radius * 0.02); ctx.moveTo(-radius * 0.22, 0); ctx.lineTo(radius * 0.18, -radius * 0.22); ctx.stroke(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, radius * 0.34); ctx.lineTo(0, radius * 0.78); ctx.stroke(); return; }
    if (iconKey === 'totem' || iconKey === 'scorpion') { ctx.fillStyle = '#d97706'; roundRect(-radius * 0.28, -radius * 0.72, radius * 0.56, radius * 1.36, radius * 0.16); ctx.fill(); ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(0, -radius * 0.26, radius * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-radius * 0.16, radius * 0.06); ctx.lineTo(radius * 0.16, radius * 0.06); ctx.moveTo(-radius * 0.2, radius * 0.34); ctx.lineTo(radius * 0.2, radius * 0.34); ctx.stroke(); return; }
    if (iconKey === 'beacon') { ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(0, -radius * 0.82); ctx.lineTo(radius * 0.34, -radius * 0.06); ctx.lineTo(0, radius * 0.76); ctx.lineTo(-radius * 0.34, -radius * 0.06); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-radius * 0.62, -radius * 0.04); ctx.lineTo(-radius * 0.18, -radius * 0.32); ctx.moveTo(radius * 0.62, -radius * 0.04); ctx.lineTo(radius * 0.18, -radius * 0.32); ctx.stroke(); return; }
    if (iconKey === 'forest') { ctx.fillStyle = '#65a30d'; ctx.beginPath(); ctx.arc(-radius * 0.18, -radius * 0.18, radius * 0.3, 0, Math.PI * 2); ctx.arc(radius * 0.22, -radius * 0.08, radius * 0.26, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#7c4a1d'; roundRect(-radius * 0.08, radius * 0.12, radius * 0.16, radius * 0.44, radius * 0.05); ctx.fill(); ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-radius * 0.44, radius * 0.44); ctx.quadraticCurveTo(0, radius * 0.2, radius * 0.46, -radius * 0.18); ctx.stroke(); return; }
    if (iconKey === 'lava') { ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(-radius * 0.48, radius * 0.58); ctx.lineTo(-radius * 0.2, -radius * 0.3); ctx.lineTo(0, radius * 0.04); ctx.lineTo(radius * 0.24, -radius * 0.72); ctx.lineTo(radius * 0.5, radius * 0.58); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-radius * 0.2, radius * 0.32); ctx.lineTo(radius * 0.22, radius * 0.32); ctx.stroke(); return; }
    if (iconKey === 'cosmos') { ctx.fillStyle = '#8b5cf6'; ctx.beginPath(); ctx.arc(0, 0, radius * 0.54, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(radius * 0.18, -radius * 0.16, radius * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#ddd6fe'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-radius * 0.62, -radius * 0.44); ctx.lineTo(-radius * 0.34, -radius * 0.28); ctx.moveTo(radius * 0.3, radius * 0.34); ctx.lineTo(radius * 0.62, radius * 0.48); ctx.stroke(); return; }
    if (iconKey === 'storm') { ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.arc(-radius * 0.08, -radius * 0.08, radius * 0.34, Math.PI * 0.65, Math.PI * 1.9); ctx.arc(radius * 0.22, -radius * 0.02, radius * 0.3, Math.PI, Math.PI * 1.9); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(radius * 0.04, -radius * 0.02); ctx.lineTo(-radius * 0.16, radius * 0.44); ctx.lineTo(radius * 0.08, radius * 0.44); ctx.lineTo(-radius * 0.02, radius * 0.82); ctx.lineTo(radius * 0.24, radius * 0.3); ctx.lineTo(0, radius * 0.3); ctx.closePath(); ctx.fill(); return; }
    drawProceduralTowerGlyph(iconKey, radius);
  }

  function drawTower(tower, world) {
    const pos = cellCenter(world, tower.x, tower.y);
    const pop = clamp(1 - (tower.spawnAnim || 0) / 0.3, 0, 1);
    const scale = 0.72 + pop * 0.28;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.fillStyle = '#fff8e1';
    ctx.arc(0, 0, world.cell * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,.32)';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawTowerGlyph(tower.type, world.cell * 0.36);
    ctx.strokeStyle = 'rgba(15,23,42,.88)';
    ctx.lineWidth = 3;
    ctx.font = '800 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.strokeText(String(tower.level), 0, world.cell * 0.42);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(String(tower.level), 0, world.cell * 0.42);
    const upgradeCost = getUpgradeCost(tower);
    if (upgradeCost > 0 && state && state.gold >= upgradeCost) {
      const pulse = 0.9 + 0.1 * (0.5 + 0.5 * Math.sin(performance.now() / 220));
      const badgeX = world.cell * 0.28;
      const badgeY = -world.cell * 0.28;
      ctx.save();
      ctx.translate(badgeX, badgeY);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(250,204,21,.96)';
      ctx.beginPath();
      ctx.arc(0, 0, world.cell * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-world.cell * 0.04, world.cell * 0.01);
      ctx.lineTo(0, -world.cell * 0.05);
      ctx.lineTo(world.cell * 0.04, world.cell * 0.01);
      ctx.moveTo(0, -world.cell * 0.05);
      ctx.lineTo(0, world.cell * 0.05);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(15,23,42,.9)';
      roundRect(world.cell * 0.04, -world.cell * 0.58, world.cell * 0.46, world.cell * 0.18, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(250,204,21,.9)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#fde68a';
      ctx.font = `800 ${Math.max(8, world.cell * 0.1)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(upgradeCost), world.cell * 0.27, -world.cell * 0.49);
    }
    ctx.restore();
  }
  function drawEnemy(enemy, world) { const meta = ENEMIES[enemy.type]; const size = world.cell; ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.fillStyle = meta.color; ctx.beginPath(); ctx.arc(0, 0, size * meta.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(-size * 0.07, -size * 0.05, size * 0.04, 0, Math.PI * 2); ctx.arc(size * 0.07, -size * 0.05, size * 0.04, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(-size * 0.06, -size * 0.05, size * 0.018, 0, Math.PI * 2); ctx.arc(size * 0.08, -size * 0.05, size * 0.018, 0, Math.PI * 2); ctx.fill(); if (enemy.type === 'bunny') { ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-size * 0.08, -size * 0.22); ctx.lineTo(-size * 0.12, -size * 0.38); ctx.moveTo(size * 0.08, -size * 0.22); ctx.lineTo(size * 0.12, -size * 0.38); ctx.stroke(); } if (enemy.type === 'barrel') { ctx.strokeStyle = 'rgba(120,53,15,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-size * 0.14, -size * 0.14); ctx.lineTo(size * 0.14, -size * 0.14); ctx.moveTo(-size * 0.14, size * 0.14); ctx.lineTo(size * 0.14, size * 0.14); ctx.stroke(); } const rate = clamp(enemy.hp / enemy.maxHp, 0, 1); ctx.fillStyle = 'rgba(15,23,42,.52)'; ctx.fillRect(-size * 0.26, size * 0.34, size * 0.52, 5); ctx.fillStyle = enemy.slow > 0 ? '#38bdf8' : '#ef4444'; ctx.fillRect(-size * 0.26, size * 0.34, size * 0.52 * rate, 5); ctx.restore(); }
  function drawShotVisual(x, y, color, style, size) {
    const s = size || 6;
    ctx.save();
    ctx.translate(x, y);
    if (style === 'leaf-dart') {
      ctx.rotate(-0.35);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, 0);
      ctx.quadraticCurveTo(-s * 0.08, -s * 0.54, s * 0.72, 0);
      ctx.quadraticCurveTo(-s * 0.08, s * 0.54, -s * 0.7, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.36, 0);
      ctx.lineTo(s * 0.42, 0);
      ctx.stroke();
    } else if (style === 'dart') {
      ctx.fillStyle = color;
      traceShape([[-s * 0.75, 0], [s * 0.15, -s * 0.42], [s * 0.7, 0], [s * 0.15, s * 0.42]]);
      ctx.fill();
    } else if (style === 'water-drop') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.92);
      ctx.bezierCurveTo(s * 0.52, -s * 0.36, s * 0.62, s * 0.08, 0, s * 0.78);
      ctx.bezierCurveTo(-s * 0.62, s * 0.08, -s * 0.52, -s * 0.36, 0, -s * 0.92);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath();
      ctx.arc(-s * 0.16, -s * 0.18, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'ember-bolt') {
      ctx.fillStyle = color;
      traceShape([[-s * 0.56, -s * 0.2], [0, -s * 0.72], [s * 0.48, -s * 0.08], [s * 0.16, s * 0.12], [s * 0.54, s * 0.72], [-s * 0.18, s * 0.2]]);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'candy-pearl') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff7ed';
      ctx.beginPath();
      ctx.arc(-s * 0.16, -s * 0.18, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
      ctx.stroke();
    } else if (style === 'candy-swirl') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.74, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff7ed';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.46, Math.PI * 0.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.22, Math.PI * 0.4, Math.PI * 2);
      ctx.stroke();
    } else if (style === 'cream-pop') {
      [[-0.35, 0.1], [0.12, -0.22], [0.34, 0.24]].forEach(([px, py], index) => {
        ctx.fillStyle = index === 1 ? '#fff7ed' : color;
        ctx.beginPath();
        ctx.arc(px * s, py * s, s * (index === 1 ? 0.34 : 0.28), 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (style === 'frost-shard') {
      ctx.save();
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = color;
      traceShape([[0, -s * 0.86], [s * 0.34, 0], [0, s * 0.86], [-s * 0.34, 0]]);
      ctx.fill();
      ctx.strokeStyle = '#eff6ff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.56);
      ctx.lineTo(0, s * 0.56);
      ctx.moveTo(-s * 0.22, 0);
      ctx.lineTo(s * 0.22, 0);
      ctx.stroke();
      ctx.restore();
    } else if (style === 'snow-crystal') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, 0); ctx.lineTo(s * 0.7, 0);
      ctx.moveTo(0, -s * 0.7); ctx.lineTo(0, s * 0.7);
      ctx.moveTo(-s * 0.5, -s * 0.5); ctx.lineTo(s * 0.5, s * 0.5);
      ctx.moveTo(s * 0.5, -s * 0.5); ctx.lineTo(-s * 0.5, s * 0.5);
      ctx.stroke();
    } else if (style === 'storm-orb') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.64, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      traceShape([[-s * 0.06, -s * 0.3], [-s * 0.28, s * 0.08], [-s * 0.02, s * 0.08], [-s * 0.16, s * 0.42], [s * 0.24, -s * 0.02], [0, -s * 0.02]]);
      ctx.fill();
    } else if (style === 'bubble') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath();
      ctx.arc(-s * 0.22, -s * 0.24, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'cannonball') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.82, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.48, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawTravelFx(fx, alpha) {
    const t = 1 - alpha;
    const x = fx.x1 + (fx.x2 - fx.x1) * t;
    const y = fx.y1 + (fx.y2 - fx.y1) * t;
    const dx = fx.x2 - fx.x1;
    const dy = fx.y2 - fx.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    ctx.strokeStyle = fx.color || '#fff';
    ctx.fillStyle = fx.color || '#fff';
    if (fx.style === 'leaf-orb') {
      drawShotVisual(x, y, fx.color, 'leaf-dart', fx.size || 7);
      ctx.strokeStyle = fx.color || '#fff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x - nx * 11, y - ny * 11);
      ctx.quadraticCurveTo(x - nx * 5 - ny * 4, y - ny * 5 + nx * 4, x, y);
      ctx.stroke();
    } else if (fx.style === 'spore-burst') {
      drawShotVisual(x, y, fx.color, 'bubble', fx.size || 7);
      [-0.38, 0, 0.38].forEach(offset => {
        ctx.fillStyle = fx.color || '#fff';
        ctx.beginPath();
        ctx.arc(x + ny * offset * 8, y - nx * offset * 8, (fx.size || 7) * 0.18, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (fx.style === 'candy-pearl') {
      drawShotVisual(x, y, fx.color, 'candy-pearl', fx.size || 7);
      ctx.strokeStyle = 'rgba(255,255,255,.42)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x - nx * 8, y - ny * 8);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (fx.style === 'candy-swirl') {
      drawShotVisual(x, y, fx.color, 'candy-swirl', fx.size || 8);
    } else if (fx.style === 'cream-pop') {
      drawShotVisual(x, y, fx.color, 'cream-pop', fx.size || 8);
      ctx.strokeStyle = '#fff7ed';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, (fx.size || 8) * (0.45 + t * 0.35), 0, Math.PI * 2);
      ctx.stroke();
    } else if (fx.style === 'frost-shard') {
      drawShotVisual(x, y, fx.color, 'frost-shard', fx.size || 7);
      ctx.strokeStyle = '#dbeafe';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - nx * 8, y - ny * 8);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (fx.style === 'snow-crystal') {
      drawShotVisual(x, y, fx.color, 'snow-crystal', fx.size || 8);
      ctx.strokeStyle = 'rgba(255,255,255,.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, (fx.size || 8) * (0.35 + t * 0.28), 0, Math.PI * 2);
      ctx.stroke();
    } else if (fx.style === 'water-drop') {
      drawShotVisual(x, y, fx.color, 'water-drop', fx.size || 7);
      ctx.strokeStyle = 'rgba(255,255,255,.46)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - nx * 10, y - ny * 10);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (fx.style === 'shell-ripple') {
      drawShotVisual(x, y, fx.color, 'water-drop', (fx.size || 8) * 0.82);
      ctx.strokeStyle = fx.color || '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, (fx.size || 8) * (0.48 + t * 0.5), Math.PI * 0.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, (fx.size || 8) * (0.24 + t * 0.28), Math.PI * 0.2, Math.PI * 1.8);
      ctx.stroke();
    } else if (fx.style === 'tide-shell') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.fillStyle = fx.color || '#fff';
      traceShape([[-(fx.size || 8) * 0.64, -(fx.size || 8) * 0.18], [0, -(fx.size || 8) * 0.66], [(fx.size || 8) * 0.76, 0], [0, (fx.size || 8) * 0.66], [-(fx.size || 8) * 0.64, (fx.size || 8) * 0.18]]);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - nx * 9, y - ny * 9);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (fx.style === 'slag-burst') {
      drawShotVisual(x, y, fx.color, 'ember-bolt', fx.size || 8);
      ctx.fillStyle = '#7f1d1d';
      [[-4, -2], [4, 1], [-2, 4]].forEach(([ox, oy]) => {
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (fx.style === 'ember-bolt') {
      drawShotVisual(x, y, fx.color, 'ember-bolt', fx.size || 7);
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - nx * 8, y - ny * 8);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (fx.style === 'storm-orb') {
      drawShotVisual(x, y, fx.color, 'storm-orb', fx.size || 7);
      ctx.strokeStyle = 'rgba(255,255,255,.36)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - nx * 8, y - ny * 8);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (fx.style === 'cyclone-gust') {
      ctx.strokeStyle = fx.color || '#fff';
      ctx.lineWidth = 2.1;
      for (let i = 0; i < 3; i++) {
        const offset = (i - 1) * 4;
        ctx.beginPath();
        ctx.moveTo(x - nx * 10 - ny * offset, y - ny * 10 + nx * offset);
        ctx.quadraticCurveTo(x - nx * 2 + ny * offset * 0.4, y - ny * 2 - nx * offset * 0.4, x + ny * offset * 0.8, y - nx * offset * 0.8);
        ctx.stroke();
      }
    } else if (fx.style === 'arc-bolt') {
      ctx.strokeStyle = fx.color || '#fff';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x - nx * 10, y - ny * 10);
      ctx.lineTo(x - nx * 5 + ny * 3, y - ny * 5 - nx * 3);
      ctx.lineTo(x - nx * 1 - ny * 2, y - ny * 1 + nx * 2);
      ctx.lineTo(x, y);
      ctx.stroke();
      drawShotVisual(x, y, '#fde68a', 'storm-orb', 4.8);
    } else if (fx.style === 'beam-orb') {
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(x - nx * 10, y - ny * 10);
      ctx.lineTo(x, y);
      ctx.stroke();
      drawShotVisual(x, y, fx.color, 'orb', fx.size || 6);
    } else if (fx.style === 'ice-shard') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.fillStyle = fx.color || '#fff';
      traceShape([[-(fx.size || 7) * 0.8, 0], [0, -(fx.size || 7) * 0.36], [(fx.size || 7), 0], [0, (fx.size || 7) * 0.36]]);
      ctx.fill();
      ctx.restore();
    } else if (fx.style === 'sniper-star') {
      drawShotVisual(x, y, fx.color, 'dart', fx.size || 9);
      ctx.strokeStyle = 'rgba(255,255,255,.72)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x + 6, y);
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y + 6);
      ctx.stroke();
    } else if (fx.style === 'pulse-orb') {
      drawShotVisual(x, y, fx.color, 'bubble', fx.size || 8);
      ctx.strokeStyle = fx.color || '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, (fx.size || 8) * (0.7 + t * 0.5), 0, Math.PI * 2);
      ctx.stroke();
    } else if (fx.style === 'gust') {
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x - nx * 10 - ny * 4, y - ny * 10 + nx * 4);
      ctx.quadraticCurveTo(x - nx * 4, y - ny * 4, x + ny * 5, y - nx * 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - nx * 8 + ny * 4, y - ny * 8 - nx * 4);
      ctx.quadraticCurveTo(x - nx * 2, y - ny * 2, x - ny * 5, y + nx * 5);
      ctx.stroke();
    } else if (fx.style === 'spark-bolt') {
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x - nx * 9, y - ny * 9);
      ctx.lineTo(x - nx * 3 + ny * 3, y - ny * 3 - nx * 3);
      ctx.lineTo(x + nx * 2 - ny * 2, y + ny * 2 + nx * 2);
      ctx.lineTo(x, y);
      ctx.stroke();
      drawShotVisual(x, y, fx.color, 'orb', 4.5);
    } else if (fx.style === 'prism-shard') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.fillStyle = fx.color || '#fff';
      traceShape([[0, -(fx.size || 6)], [(fx.size || 6) * 0.78, 0], [0, (fx.size || 6)], [-(fx.size || 6) * 0.34, 0]]);
      ctx.fill();
      ctx.restore();
    } else {
      drawShotVisual(x, y, fx.color, 'orb', fx.size || 6);
    }
  }
  function drawShotsAndFx() {
    state.shots.forEach(shot => {
      drawShotVisual(shot.x, shot.y, shot.color, shot.style || 'orb', shot.type === 'anchor' ? 8 : 6);
    });
    state.fx.forEach(fx => {
      const alpha = clamp(fx.life / fx.max, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (fx.kind === 'beam') {
        ctx.strokeStyle = fx.color || '#fff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(fx.x1, fx.y1);
        ctx.lineTo(fx.x2, fx.y2);
        ctx.stroke();
      } else if (fx.kind === 'travel') {
        drawTravelFx(fx, alpha);
      } else if (fx.kind === 'ring') {
        ctx.strokeStyle = fx.color || '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.r * (1.1 - alpha * 0.2), 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.kind === 'coin') {
        ctx.fillStyle = '#fde047';
        ctx.font = '700 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`+${fx.value}`, fx.x, fx.y - 18 * (1 - alpha));
      } else if (fx.kind === 'build') {
        ctx.strokeStyle = fx.color || '#fde68a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, 14 + (1 - alpha) * 24, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = fx.color || '#fff';
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, 8 * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }
  function getSelectionMarker(entity, world) {
    if (!entity) return null;
    let pos = null;
    let ringColor = '#fde047';
    let label = TEXT.selectedLabel;
    if (entity.kind === 'tower') {
      const tower = state.towers.find(item => item.id === entity.id);
      if (tower) pos = cellCenter(world, tower.x, tower.y);
      ringColor = '#facc15';
      label = TEXT.towerLabel;
    } else if (entity.kind === 'prop') {
      const prop = state.props.find(item => item.id === entity.id);
      if (prop) pos = cellCenter(world, prop.x, prop.y);
      ringColor = '#fb7185';
      label = TEXT.lockedPropLabel;
    } else if (entity.kind === 'enemy') {
      const enemy = state.enemies.find(item => item.id === entity.id && !item.dead);
      if (enemy) pos = { x: enemy.x, y: enemy.y };
      ringColor = '#38bdf8';
      label = TEXT.lockedEnemyLabel;
    } else if (entity.kind === 'cell') {
      pos = cellCenter(world, entity.x, entity.y);
      ringColor = '#fde047';
      label = previewTowerKey && TOWERS[previewTowerKey] ? TEXT.pendingBuildLabel(TOWERS[previewTowerKey].name) : TEXT.buildPointLabel;
    }
    return pos ? { kind: entity.kind, pos, ringColor, label } : null;
  }

  function drawSelectionMarker(marker, world, options) {
    if (!marker) return;
    const compact = !!(options && options.compact);
    const showLabel = !options || options.showLabel !== false;
    const pos = marker.pos;
    const ringColor = marker.ringColor;
    const pulse = 0.88 + 0.12 * (0.5 + 0.5 * Math.sin(performance.now() / 180));
    ctx.save();
    if (marker.kind === 'cell') {
      const tile = world.cell * 0.84;
      const tileY = pos.y - tile * 0.5;
      const tileX = pos.x - tile * 0.5;
      ctx.fillStyle = 'rgba(250,204,21,.18)';
      roundRect(tileX, tileY, tile, tile, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.86)';
      ctx.lineWidth = 2;
      roundRect(tileX + 3, tileY + 3, tile - 6, tile - 6, 10);
      ctx.stroke();
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 3;
      roundRect(tileX, tileY, tile, tile, 12);
      ctx.stroke();
      if (previewTowerKey && TOWERS[previewTowerKey]) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,248,225,.98)';
        ctx.arc(0, 0, world.cell * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(250,204,21,.9)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        drawTowerGlyph(previewTowerKey, world.cell * 0.28);
        ctx.restore();
      }
    }
    ctx.fillStyle = ringColor + (compact ? '18' : '22');
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, marker.kind === 'cell' ? world.cell * 0.56 * pulse : world.cell * (compact ? 0.44 : 0.5) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = compact ? 3 : 4;
    ctx.setLineDash(compact ? [7, 5] : []);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, marker.kind === 'cell' ? world.cell * 0.5 * pulse : world.cell * (compact ? 0.38 : 0.42) * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,.92)';
    ctx.lineWidth = compact ? 1.5 : 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, marker.kind === 'cell' ? world.cell * 0.58 * pulse : world.cell * (compact ? 0.45 : 0.5) * pulse, 0, Math.PI * 2);
    ctx.stroke();
    if (showLabel) {
      ctx.fillStyle = 'rgba(15,23,42,.88)';
      roundRect(pos.x - world.cell * 0.74, pos.y - world.cell * 0.96, world.cell * 1.48, world.cell * 0.3, 10);
      ctx.fill();
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = `800 ${Math.max(10, world.cell * 0.13)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(marker.label, pos.x, pos.y - world.cell * 0.78);
    }
    ctx.restore();
  }

  function drawSelection(world) {
    const preview = getPreviewRangeInfo();
    if (preview) {
      const center = cellCenter(world, preview.x, preview.y);
      ctx.save();
      ctx.fillStyle = 'rgba(56,189,248,.08)';
      ctx.strokeStyle = 'rgba(125,211,252,.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(center.x, center.y, preview.range * world.cell, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    const primaryMarker = getSelectionMarker(selected || lockedTarget, world);
    const lockMarker = sameEntity(selected, lockedTarget) ? null : getSelectionMarker(lockedTarget, world);
    if (primaryMarker) drawSelectionMarker(primaryMarker, world);
    if (lockMarker) drawSelectionMarker(lockMarker, world, { compact: true, showLabel: false });
  }
  function drawWaveNotice(width) { if (!state.waveNotice || !state.waveNotice.text) return; const alpha = clamp(state.waveNotice.life / state.waveNotice.max, 0, 1); const tone = state.waveNotice.tone === 'good' ? '#4ade80' : state.waveNotice.tone === 'bad' ? '#f87171' : '#facc15'; ctx.save(); ctx.globalAlpha = Math.min(1, alpha * 1.1); ctx.translate(width * 0.5, 58); ctx.fillStyle = 'rgba(15,23,42,.82)'; roundRect(-152, -22, 304, 44, 22); ctx.fill(); ctx.strokeStyle = tone; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = tone; ctx.font = '700 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(state.waveNotice.text, 0, 6); ctx.restore(); }
  function renderHud() {
    const waveText = TEXT.wave(Math.max(state.waveShown, state.running ? 1 : 0), currentLevel().waves.length);
    const baseText = state.carrotHp && state.carrotHp.length > 1 ? TEXT.baseMulti(state.carrotHp.map(value => Math.max(0, value)).join(' | ')) : TEXT.base(state.hp);
    const goldText = TEXT.gold(state.gold);
    const themeIndex = THEME_ORDER.indexOf(currentLevel().theme);
    const chapterCount = Math.ceil(LEVELS.length / 20);
    const chapterIndex = Math.floor((currentLevel().id - 1) / 20) + 1;
    levelNameEl.textContent = TEXT.levelTitle(currentLevel().id, currentLevel().name);
    themeLabelEl.textContent = THEMES[currentLevel().theme].name;
    waveEl.textContent = waveText;
    baseEl.textContent = baseText;
    goldEl.textContent = goldText;
    if (selected && selected.kind === 'tower' && state && typeof state.gold === 'number') {
      if (lastGoldForUpgradeBtn !== state.gold) {
        lastGoldForUpgradeBtn = state.gold;
        const tower = state.towers.find(item => item.id === selected.id);
        if (tower) {
          const cost = getUpgradeCost(tower);
          const shouldDisable = tower.level >= 3 || state.gold < cost;
          if (upgradeBtn.disabled !== shouldDisable) upgradeBtn.disabled = shouldDisable;
        } else if (!upgradeBtn.disabled) upgradeBtn.disabled = true;
      }
    }
    if (buildMenu.open && buildMenuEl && buildMenuEl.style.display !== 'none') syncBuildMenuHighlight();
    const waveTopEl = root.querySelector('#carrot-wave-top');
    const baseTopEl = root.querySelector('#carrot-base-top');
    const goldTopEl = root.querySelector('#carrot-gold-top');
    if (waveTopEl) waveTopEl.textContent = waveText;
    if (baseTopEl) baseTopEl.textContent = baseText;
    if (goldTopEl) goldTopEl.textContent = goldText;
    levelNotesEl.textContent = currentLevel().intro;
    progressEl.textContent = TEXT.progressSummary(LEVELS.length, TOWER_KEYS.length);
    if (themeCountEl) themeCountEl.textContent = `${themeIndex + 1} / ${THEME_ORDER.length}`;
    if (levelCountEl) levelCountEl.textContent = `${currentLevel().id} / ${LEVELS.length}`;
    if (themeLabelEl) themeLabelEl.title = TEXT.chapterTitle(chapterIndex, chapterCount);
    pauseBtn.textContent = paused ? t('resume') : t('pause');
  }
  function renderLevelOptions() {
    levelSelectEl.innerHTML = '';
    LEVELS.forEach((level, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      if (level.id <= 10) {
        option.textContent = TEXT.levelOption(level.id, t('level' + level.id));
      } else {
        const themeIndex = Math.floor((level.id - 1) / 20) % THEME_ORDER.length;
        const prefixIndex = (level.id % 12) + 1;
        const suffixIndex = ((level.id + themeIndex) % 12) + 1;
        const title = `${t('levelPrefix' + prefixIndex)}${t('levelSuffix' + suffixIndex)}`;
        option.textContent = TEXT.levelOption(level.id, title);
      }
      option.style.backgroundColor = '#102015';
      option.style.color = '#f8fafc';
      levelSelectEl.appendChild(option);
    });
    levelSelectEl.value = String(levelIndex);
  }
  function renderTowerBar() { towerBarEl.innerHTML = ''; towerBarEl.style.pointerEvents = 'auto'; towerBarEl.style.touchAction = 'pan-y'; allowedTowerKeys().forEach(key => { const def = TOWERS[key]; const card = document.createElement('div'); const active = previewTowerKey === key; card.style.cssText = `display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:8px;padding:8px 10px;border-radius:14px;border:${active ? '2px solid rgba(253,224,71,.92)' : '1px solid rgba(255,255,255,.12)'};background:${active ? 'rgba(250,204,21,.16)' : 'rgba(15,23,42,.32)'};color:#f8fafc;text-align:left;pointer-events:none;user-select:none;`; card.innerHTML = `<div style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.03));">${towerIconSvg(key, 34)}</div><div style="min-width:0;"><div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${def.name}</div><div style="font-size:10px;color:rgba(248,250,252,.68);">${getTowerBriefDesc(key)}</div></div><div style="font-size:12px;font-weight:700;color:#fde68a;">${def.cost}</div>`; towerBarEl.appendChild(card); }); }
  function renderLegend() { legendEl.innerHTML = ''; ['jelly', 'bunny', 'barrel', 'skater', 'boss'].forEach(type => { const meta = ENEMIES[type]; const card = document.createElement('div'); card.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;border-radius:12px;background:rgba(15,23,42,.35);font-size:12px;'; card.innerHTML = `<div style="width:14px;height:14px;border-radius:999px;background:${meta.color};"></div><div>${meta.name}</div>`; legendEl.appendChild(card); }); }
  function renderSelection() {
    upgradeBtn.disabled = true;
    sellBtn.disabled = true;
    upgradeBtn.textContent = TEXT.upgradeButton;
    sellBtn.textContent = TEXT.sellButton;
    const info = getSelectionInfo();
    if (!info) {
      selectionEl.innerHTML = `<strong>${TEXT.noSelectionTitle}</strong><br>${TEXT.noSelectionDesc}`;
      return;
    }
    if (selected && selected.kind === 'tower') {
      const tower = state.towers.find(item => item.id === selected.id);
      if (!tower) return;
      const def = TOWERS[tower.type];
      const note = TOWER_NOTES[tower.type] || {};
      const stats = towerStats(tower.type, tower.level);
      const cost = getUpgradeCost(tower);
      const refund = getSellRefund(tower);
      selectionEl.innerHTML = `<strong>${def.name}</strong><br>${TEXT.towerLevel(tower.level)}<br>${TEXT.towerDamage(stats.dmg)}<br>${TEXT.towerRange(stats.range.toFixed(1))}<br>${TEXT.towerCd(stats.cd.toFixed(2))}<br>${TEXT.towerDebut(TOWER_FIRST_APPEARANCE[tower.type] || '?')}${tower.level >= 3 ? `<br>${TEXT.towerMaxLevel}` : `<br>${TEXT.towerUpgradeCost(cost)}`}`;
      upgradeBtn.disabled = tower.level >= 3 || state.gold < cost;
      sellBtn.disabled = false;
      sellBtn.textContent = TEXT.sellButtonRefund(refund);
      return;
    }
    if (info.kind === 'enemy') {
      const enemy = state.enemies.find(item => item.id === info.id && !item.dead);
      if (!enemy) { clearFocusedEntity('enemy', info.id); return; }
      selectionEl.innerHTML = `<strong>${ENEMIES[enemy.type].name}</strong><br>${TEXT.enemyLockDesc}<br>${TEXT.enemyHp(Math.max(0, Math.ceil(enemy.hp)), enemy.maxHp)}<br>${TEXT.lockCancelTip}`;
      return;
    }
    if (info.kind === 'prop') {
      const prop = state.props.find(item => item.id === info.id);
      if (!prop) { clearFocusedEntity('prop', info.id); return; }
      selectionEl.innerHTML = `<strong>${PROPS[prop.type].name}</strong><br>${TEXT.propLockDesc}<br>${TEXT.propHp(Math.max(0, Math.ceil(prop.hp)))}<br>${TEXT.propReward(prop.reward)}${prop.reveal ? `<br>${TEXT.propExtraReward}` : ''}<br>${TEXT.lockCancelTip}`;
      return;
    }
    if (previewTowerKey && TOWERS[previewTowerKey]) {
      const def = TOWERS[previewTowerKey];
      const stats = towerStats(previewTowerKey, 1);
      selectionEl.innerHTML = `<strong>${TEXT.pendingBuildTitle(def.name)}</strong><br>${TEXT.pendingBuildCost(def.cost)}<br>${TEXT.towerRange(stats.range.toFixed(1))}<br>${TEXT.towerDamage(stats.dmg)}<br>${TEXT.pendingBuildDesc}`;
      return;
    }
    selectionEl.innerHTML = `<strong>${TEXT.buildableTitle}</strong><br>${TEXT.buildableDesc}`;
  }
  function upgradeTower() { if (!selected || selected.kind !== 'tower') { setStatus(TEXT.cannotUpgrade, 'bad'); return; } const tower = state.towers.find(item => item.id === selected.id); if (!tower || tower.level >= 3) { setStatus(TEXT.cannotUpgrade, 'bad'); return; } const cost = getUpgradeCost(tower); if (state.gold < cost) { setStatus(TEXT.noGold, 'bad'); return; } state.gold -= cost; tower.level += 1; tower.spent += cost; setStatus(TEXT.towerUpgraded(TOWERS[tower.type].name), 'good'); renderHud(); renderSelection(); }
  function sellTower() { if (!selected || selected.kind !== 'tower') { setStatus(TEXT.cannotSell, 'bad'); return; } const tower = state.towers.find(item => item.id === selected.id); if (!tower) { setStatus(TEXT.cannotSell, 'bad'); return; } state.gold += getSellRefund(tower); state.towers = state.towers.filter(item => item.id !== tower.id); state.fx = state.fx.filter(item => !(item && item.kind === 'build' && item.cellX === tower.x && item.cellY === tower.y)); if (state.hoverCell && state.hoverCell.x === tower.x && state.hoverCell.y === tower.y) state.hoverCell = null; selectEntity(null); setStatus(TEXT.towerSold(TOWERS[tower.type].name), 'good'); renderHud(); }
  function resetLevel(index) { levelIndex = clamp(index, 0, LEVELS.length - 1); persistLevelIndex(levelIndex); state = createState(levelIndex); paused = false; previewTowerKey = null; lockedTarget = null; closeBuildMenu(true); closeResetConfirm(); closeResultOverlay(); selectEntity(null); renderLevelOptions(); renderHud(); renderTowerBar(); renderLegend(); setStatus(TEXT.waiting, 'warn'); }
  function startLevel() { if (state.won || state.lost) resetLevel(levelIndex); closeResultOverlay(); state.running = true; paused = false; setWaveNotice(TEXT.battleStart, 'good'); renderHud(); setStatus(TEXT.running, 'warn'); }
  function handleCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = (canvas.width / DPR()) / rect.width;
    const scaleY = (canvas.height / DPR()) / rect.height;
    const px = (event.clientX - rect.left) * scaleX;
    const py = (event.clientY - rect.top) * scaleY;
    const world = getWorld(canvas.width / DPR(), canvas.height / DPR());
    const tower = state.towers.find(item => { const p = cellCenter(world, item.x, item.y); return dist(px, py, p.x, p.y) <= world.cell * 0.34; });
    if (tower) {
      closeBuildMenu(false);
      if (isSelected('tower', tower.id)) selectEntity(null);
      else selectEntity({ kind: 'tower', id: tower.id });
      return;
    }
    const enemy = getEnemyAtPoint(px, py, world);
    if (enemy) {
      closeBuildMenu(false);
      if (isLocked('enemy', enemy.id)) {
        setLockedTarget(null);
        if (isSelected('enemy', enemy.id)) selectEntity(null);
      } else {
        setLockedTarget({ kind: 'enemy', id: enemy.id }, { keepSelected: true });
        selectEntity({ kind: 'enemy', id: enemy.id });
      }
      return;
    }
    const prop = state.props.find(item => { const p = cellCenter(world, item.x, item.y); return dist(px, py, p.x, p.y) <= world.cell * 0.34; });
    if (prop) {
      closeBuildMenu(false);
      if (isLocked('prop', prop.id)) {
        setLockedTarget(null);
        if (isSelected('prop', prop.id)) selectEntity(null);
      } else {
        setLockedTarget({ kind: 'prop', id: prop.id }, { keepSelected: true });
        selectEntity({ kind: 'prop', id: prop.id });
      }
      return;
    }
    const cell = gridCellFromPoint(px, py, world);
    if (!cell || !isBuildableCell(cell.x, cell.y)) {
      closeBuildMenu(false);
      if (selected && selected.kind === 'tower') selectEntity(null);
      return;
    }
    if (selected && selected.kind === 'cell' && selected.x === cell.x && selected.y === cell.y && buildMenu.open) {
      previewTowerKey = null;
      closeBuildMenu(false);
      renderTowerBar();
      renderSelection();
      return;
    }
    previewTowerKey = null;
    buildMenu = { open: true, x: cell.x, y: cell.y, px: event.clientX - rect.left, py: event.clientY - rect.top };
    selectEntity({ kind: 'cell', x: cell.x, y: cell.y });
    renderBuildMenu();
  }
  function renderScene() { resizeCanvas(); const width = canvas.width / DPR(); const height = canvas.height / DPR(); const world = getWorld(width, height); drawBoard(world); state.props.forEach(prop => drawProp(prop, world)); state.towers.forEach(tower => drawTower(tower, world)); drawSelection(world); drawShotsAndFx(); state.enemies.forEach(enemy => drawEnemy(enemy, world)); drawWaveNotice(width); }
  function tick(ts) { if (!root.isConnected) { cancelAnimationFrame(frameId); return; } const dt = Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000)); lastTs = ts; const world = getWorld((canvas.width || 960) / DPR(), (canvas.height || 600) / DPR()); if (state.running && !paused && !state.won && !state.lost) { state.time += dt; spawnDue(world); updateTowers(dt, world); updateShots(dt, world); updateEnemies(dt, world); if (!state.lost && !state.schedule.length && state.enemies.length === 0) finishLevel(true); } if (!paused) updateFx(dt); renderHud(); renderScene(); frameId = requestAnimationFrame(tick); }

  buildMenuEl.addEventListener('click', event => { const closeBtn = event.target.closest('button[data-action="close"]'); if (closeBtn) { closeBuildMenu(false); return; } const towerBtn = event.target.closest('button[data-tower]'); if (!towerBtn || !buildMenu.open) return; const key = towerBtn.dataset.tower; if (!key) return; previewTowerKey = key; buildTower(buildMenu.x, buildMenu.y, key, false); });
  buildMenuEl.addEventListener('mouseover', event => { const towerBtn = event.target.closest('button[data-tower]'); if (!towerBtn) return; const key = towerBtn.dataset.tower; if (!key || !TOWERS[key]) return; previewTowerKey = key; syncBuildMenuHighlight(); renderTowerBar(); renderSelection(); });
  buildMenuEl.addEventListener('focusin', event => { const towerBtn = event.target.closest('button[data-tower]'); if (!towerBtn) return; const key = towerBtn.dataset.tower; if (!key || !TOWERS[key]) return; previewTowerKey = key; syncBuildMenuHighlight(); renderTowerBar(); renderSelection(); });
  canvas.addEventListener('mousemove', event => { if (!state) return; const rect = canvas.getBoundingClientRect(); const scaleX = (canvas.width / DPR()) / rect.width; const scaleY = (canvas.height / DPR()) / rect.height; const px = (event.clientX - rect.left) * scaleX; const py = (event.clientY - rect.top) * scaleY; const world = getWorld(canvas.width / DPR(), canvas.height / DPR()); const cell = gridCellFromPoint(px, py, world); state.hoverCell = cell && isBuildableCell(cell.x, cell.y) ? cell : null; });
  canvas.addEventListener('mouseleave', () => { if (state) state.hoverCell = null; });
  canvas.addEventListener('contextmenu', event => { event.preventDefault(); clearLockSelection(); });

  levelSelectEl.addEventListener('change', () => resetLevel(Number(levelSelectEl.value) || 0));
  startBtn.addEventListener('click', startLevel);
  pauseBtn.addEventListener('click', () => { if (!state.running || state.won || state.lost) return; paused = !paused; setStatus(paused ? TEXT.paused : TEXT.running, paused ? 'bad' : 'warn'); renderHud(); });
  resetBtn.addEventListener('click', openResetConfirm);
  resetConfirmEl.addEventListener('click', event => {
    if (event.target === resetConfirmEl) { closeResetConfirm(); return; }
    const cancelBtn = event.target.closest('button[data-action="cancel-reset"]');
    if (cancelBtn) { closeResetConfirm(); return; }
    const confirmBtn = event.target.closest('button[data-action="confirm-reset"]');
    if (confirmBtn) resetLevel(levelIndex);
  });
  resultOverlayEl.addEventListener('click', event => {
    const retryBtn = event.target.closest('button[data-action="retry-level"]');
    if (retryBtn) { resetLevel(levelIndex); return; }
    const nextBtn = event.target.closest('button[data-action="next-level"]');
    if (nextBtn) resetLevel(levelIndex < LEVELS.length - 1 ? (levelIndex + 1) : 0);
  });
  upgradeBtn.addEventListener('click', upgradeTower);
  sellBtn.addEventListener('click', sellTower);
  canvas.addEventListener('click', handleCanvasClick);
  window.addEventListener('resize', resizeCanvas);

  resetLevel(readSavedLevelIndex());
  resizeCanvas();
  frameId = requestAnimationFrame(tick);
};