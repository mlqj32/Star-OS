
window.StarGames = window.StarGames || {};
window.StarGames.sudoku = function (container) {
  const root = container.querySelector('#game-sudoku');
  if (!root || root.dataset.bound === 'true') return;
  root.dataset.bound = 'booting';
  try {

  const rows = 5;
  const cols = 9;
  const inset = 10;
  const BASE_LEVEL_COUNT = 50;
  const TOTAL_LEVELS = 1000;
  const LEGACY_TOTAL_LEVELS = 500;
  // Level index 500 (0-based) means Level 501 (1-based): start of the expansion pack.
  const PVZ_EXPANSION_START_INDEX = 500;
  const LEGACY_PLANT_COUNT = 150;
  const LEGACY_ZOMBIE_COUNT = 200;
  const TARGET_PLANT_COUNT = LEGACY_PLANT_COUNT + 30;
  const TARGET_ZOMBIE_COUNT = LEGACY_ZOMBIE_COUNT + 40;
  const $ = s => root.querySelector(s);
  const sunEl = $('#td-sun');
  const levelEl = $('#td-level');
  const livesEl = $('#td-lives');
  const stateEl = $('#td-state');
  const startBtn = $('#td-start');
  const resetBtn = $('#td-reset');
  const resetConfirmEl = $('#td-reset-confirm');
  const resetCancelBtn = $('#td-reset-cancel');
  const resetConfirmBtn = $('#td-reset-confirm-btn');
  const plantBarEl = $('#td-plant-bar');
  const boardWrapEl = $('#td-board-wrap');
  const gridEl = $('#td-grid');
  const zombieLayerEl = $('#td-zombie-layer');
  const peaLayerEl = $('#td-pea-layer');
  const sunsLayerEl = $('#td-suns-layer');
  const statusEl = $('#sudoku-status');
  if (!sunEl || !levelEl || !livesEl || !stateEl || !startBtn || !resetBtn || !plantBarEl || !boardWrapEl || !gridEl || !zombieLayerEl || !peaLayerEl || !sunsLayerEl || !statusEl) return;

  sunsLayerEl.style.pointerEvents = 'none';
  sunsLayerEl.style.zIndex = '40';
  zombieLayerEl.style.zIndex = '20';
  zombieLayerEl.style.pointerEvents = 'none';
  peaLayerEl.style.zIndex = '30';
  peaLayerEl.style.pointerEvents = 'none';
  boardWrapEl.style.touchAction = 'manipulation';

  const PVZ_SUPPORTED_LOCALES = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko'];
  function getPvzLocale() {
    try {
      const locale = typeof getLocale === 'function' ? getLocale() : 'zh-CN';
      return PVZ_SUPPORTED_LOCALES.includes(locale) ? locale : 'en';
    } catch (_) {
      return 'zh-CN';
    }
  }
  function pickPvzLocaleMap(map) {
    const locale = getPvzLocale();
    return map[locale] || map.en || map['zh-CN'];
  }
  function pvzJoiner(locale) {
    return locale === 'en' || locale === 'ko' ? ' ' : '';
  }
  function formatPvzLevelName(index, sceneName) {
    const level = index + 1;
    const locale = getPvzLocale();
    if (locale === 'en') return `Level ${level} · ${sceneName}`;
    if (locale === 'ja') return `第${level}関 · ${sceneName}`;
    if (locale === 'ko') return `${level} 스테이지 · ${sceneName}`;
    if (locale === 'zh-TW') return `第 ${level} 關 · ${sceneName}`;
    return `第 ${level} 关 · ${sceneName}`;
  }

  const PVZ_UI_TEXT = {
    'zh-CN': {
      cont: '继续', sel: '选关', allWin: '全部通关', stageWin: '本关胜利',
      allText: `所有 ${TOTAL_LEVELS} 关都守住了，草坪防线完好无损。`, stageText: '这一波攻势已经被挡住，点击“下一关”即可继续推进。',
      replay: '回到第 1 关', next: '下一关', lose: '防线失守', loseText: '有僵尸突破了你的防线，重新布阵再试一次。',
      retry: '重开本关', selPlant: n => `已选择 ${n}，点击草地放置`, collect: n => `收集到 ${n} 阳光`,
      occupied: '该位置已经有植物了', needSun: n => `${n} 需要更多阳光`, placed: n => `已放置 ${n}`,
      intro: (i, n) => `第 ${i} 关：${n}。先布阵，再点击“开始战斗”。`,
      battle: '僵尸开始进攻，记得及时收集阳光。', allStatus: '全部关卡已通关，草坪守住了。',
      winStatus: '本关胜利，点击“下一关”继续。', loseStatus: '防线失守，点击“重开本关”重试。',
      life: n => `有僵尸突破防线，剩余生命：${n}`, mine: '土豆雷已装填完毕', bloom: '金盏花爆发出了大量阳光',
      freeze: '寒冰菇冻结了整片草坪', gust: '三叶草掀起了一阵强风', magnet: '磁力菇拆掉了一层护甲',
      bomb: '爆炸清空了一大片区域', lane: '整条线路都被火焰扫空了', doom: '毁灭菇震碎了大半个战场'
    },
    'zh-TW': {
      cont: '繼續', sel: '選關', allWin: '全部通關', stageWin: '本關勝利',
      allText: `所有 ${TOTAL_LEVELS} 關都守住了，草坪防線完好無損。`, stageText: '這一波攻勢已被擋住，點擊「下一關」即可繼續推進。',
      replay: '回到第 1 關', next: '下一關', lose: '防線失守', loseText: '有殭屍突破了你的防線，重新佈陣再試一次。',
      retry: '重開本關', selPlant: n => `已選擇 ${n}，點擊草地放置`, collect: n => `收集到 ${n} 陽光`,
      occupied: '該位置已經有植物了', needSun: n => `${n} 需要更多陽光`, placed: n => `已放置 ${n}`,
      intro: (i, n) => `第 ${i} 關：${n}。先佈陣，再點擊「開始戰鬥」。`,
      battle: '殭屍開始進攻，記得及時收集陽光。', allStatus: '全部關卡已通關，草坪守住了。',
      winStatus: '本關勝利，點擊「下一關」繼續。', loseStatus: '防線失守，點擊「重開本關」重試。',
      life: n => `有殭屍突破防線，剩餘生命：${n}`, mine: '土豆雷已裝填完畢', bloom: '金盞花爆發出大量陽光',
      freeze: '寒冰菇凍結了整片草坪', gust: '三葉草掀起了一陣強風', magnet: '磁力菇拆掉了一層護甲',
      bomb: '爆炸清空了一大片區域', lane: '整條路線都被火焰掃空了', doom: '毀滅菇震碎了大半個戰場'
    },
    en: {
      cont: 'Continue', sel: 'Levels', allWin: 'All Clear', stageWin: 'Stage Clear',
      allText: `All ${TOTAL_LEVELS} levels held the line and the lawn stayed safe.`, stageText: 'This wave has been repelled. Click "Next Level" to keep advancing.',
      replay: 'Back to Level 1', next: 'Next Level', lose: 'Defenses Broken', loseText: 'A zombie broke through your defense. Rearrange and try again.',
      retry: 'Retry Stage', selPlant: n => `Selected ${n}. Click a tile to plant it`, collect: n => `Collected ${n} sun`,
      occupied: 'There is already a plant here', needSun: n => `${n} needs more sun`, placed: n => `${n} planted`,
      intro: (i, n) => `Level ${i}: ${n}. Set up first, then click "Start Battle".`,
      battle: 'Zombies are attacking. Collect sun in time.', allStatus: 'All levels cleared. The lawn held.',
      winStatus: 'Stage cleared. Click "Next Level" to continue.', loseStatus: 'Defenses broken. Click "Retry Stage" to try again.',
      life: n => `A zombie got through. Lives remaining: ${n}`, mine: 'Potato Mine is armed', bloom: 'Marigold released a burst of sun',
      freeze: 'Ice-shroom froze the whole lawn', gust: 'Blover whipped up a strong gust', magnet: 'Magnet-shroom stripped one layer of armor',
      bomb: 'The blast cleared a large area', lane: 'Flames swept an entire lane', doom: 'Doom-shroom shattered most of the battlefield'
    },
    ja: {
      cont: '続ける', sel: 'ステージ選択', allWin: '完全クリア', stageWin: 'このステージに勝利',
      allText: `${TOTAL_LEVELS} ステージすべてを守り切り、芝生の防衛線は無傷でした。`, stageText: 'この攻勢は食い止めました。「次のステージ」を押せばそのまま進めます。',
      replay: '第 1 関へ戻る', next: '次のステージ', lose: '防衛線崩壊', loseText: 'ゾンビに防衛線を突破されました。配置を見直してもう一度挑戦しましょう。',
      retry: 'このステージをやり直す', selPlant: n => `${n} を選択しました。芝生をクリックして配置`, collect: n => `${n} 日光を回収`,
      occupied: 'その場所にはすでに植物があります', needSun: n => `${n} を置くには日光が足りません`, placed: n => `${n} を配置しました`,
      intro: (i, n) => `第 ${i} 関：${n}。先に配置し、その後「戦闘開始」を押してください。`,
      battle: 'ゾンビの進軍が始まりました。日光を忘れずに回収しましょう。', allStatus: '全ステージをクリアし、芝生を守り切りました。',
      winStatus: 'このステージに勝利しました。「次のステージ」で続けられます。', loseStatus: '防衛線が崩れました。「このステージをやり直す」で再挑戦してください。',
      life: n => `ゾンビが防衛線を突破しました。残りライフ：${n}`, mine: 'ポテトマインの準備が完了しました', bloom: 'キンセンカが大量の日光を放ちました',
      freeze: 'アイスシュルームが芝生全体を凍らせました', gust: 'ブロワーが強い風を巻き起こしました', magnet: 'マグネットキノコが装甲を一枚はがしました',
      bomb: '爆発で広い範囲が一掃されました', lane: '炎が一列を焼き尽くしました', doom: 'ドゥームシュルームが戦場の大半を粉砕しました'
    },
    ko: {
      cont: '계속', sel: '스테이지 선택', allWin: '전체 클리어', stageWin: '이번 스테이지 승리',
      allText: `${TOTAL_LEVELS}개 스테이지를 모두 지켜 내며 잔디 방어선을 완벽히 유지했습니다.`, stageText: '이번 공세를 막아 냈습니다. "다음 스테이지"를 눌러 바로 이어서 진행할 수 있습니다.',
      replay: '1 스테이지로 돌아가기', next: '다음 스테이지', lose: '방어선 붕괴', loseText: '좀비가 방어선을 돌파했습니다. 배치를 다시 조정하고 재도전하세요.',
      retry: '현재 스테이지 다시 시작', selPlant: n => `${n} 선택됨, 잔디를 클릭해 배치`, collect: n => `${n} 햇빛 획득`,
      occupied: '그 위치에는 이미 식물이 있습니다', needSun: n => `${n} 를 놓으려면 햇빛이 더 필요합니다`, placed: n => `${n} 배치 완료`,
      intro: (i, n) => `${i} 스테이지: ${n}. 먼저 배치한 뒤 "전투 시작"을 누르세요.`,
      battle: '좀비가 공격을 시작했습니다. 햇빛을 제때 수집하세요.', allStatus: '모든 스테이지를 클리어하고 잔디를 지켜 냈습니다.',
      winStatus: '이번 스테이지를 클리어했습니다. "다음 스테이지"를 눌러 계속 진행하세요.', loseStatus: '방어선이 무너졌습니다. "현재 스테이지 다시 시작"으로 재도전하세요.',
      life: n => `좀비가 방어선을 돌파했습니다. 남은 생명: ${n}`, mine: '감자 지뢰 장전 완료', bloom: '금잔화가 많은 햇빛을 터뜨렸습니다',
      freeze: '얼음버섯이 잔디 전체를 얼렸습니다', gust: '블로버가 강한 돌풍을 일으켰습니다', magnet: '자석버섯이 장갑 한 겹을 벗겨 냈습니다',
      bomb: '폭발이 넓은 구역을 비웠습니다', lane: '불꽃이 한 줄 전체를 휩쓸었습니다', doom: '둠버섯이 전장의 대부분을 산산조각 냈습니다'
    }
  };
  const T = pickPvzLocaleMap(PVZ_UI_TEXT);

  const BASE_THEME_NAMES = {
    'zh-CN': ['晨露草坪', '午后花圃', '黄昏街角', '雾夜回廊', '雨中前院', '月光屋顶', '温室边界', '霓虹街区', '钢铁广场', '最终决战'],
    'zh-TW': ['晨露草坪', '午後花圃', '黃昏街角', '霧夜迴廊', '雨中前院', '月光屋頂', '溫室邊界', '霓虹街區', '鋼鐵廣場', '最終決戰'],
    en: ['Morning Lawn', 'Afternoon Garden', 'Dusk Corner', 'Misty Corridor', 'Rainy Yard', 'Moonlit Rooftop', 'Greenhouse Edge', 'Neon District', 'Iron Plaza', 'Final Battle'],
    ja: ['朝露の芝生', '午後の花壇', '黄昏の街角', '霧夜の回廊', '雨の前庭', '月光の屋上', '温室の境界', 'ネオン街区', '鋼鉄広場', '最終決戦'],
    ko: ['아침 이슬 잔디', '오후 화단', '황혼 골목', '안개 회랑', '빗속 앞마당', '달빛 옥상', '온실 경계', '네온 거리', '강철 광장', '최종 결전']
  };
  const themes = pickPvzLocaleMap(BASE_THEME_NAMES);
  const boardThemes = [
    'linear-gradient(180deg,#86d761 0%,#4f9d40 100%)', 'linear-gradient(180deg,#76d05e 0%,#3d8c38 100%)',
    'linear-gradient(180deg,#6cb85f 0%,#355e3b 100%)', 'linear-gradient(180deg,#547f5f 0%,#23322d 100%)',
    'linear-gradient(180deg,#5ba06d 0%,#305746 100%)', 'linear-gradient(180deg,#699d8d 0%,#24413a 100%)',
    'linear-gradient(180deg,#86b95b 0%,#4f6b2d 100%)', 'linear-gradient(180deg,#58a17c 0%,#21463d 100%)',
    'linear-gradient(180deg,#7aa45f 0%,#435430 100%)', 'linear-gradient(180deg,#7fb34f 0%,#2f4724 100%)'
  ];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let seq = 0;
  const uid = p => `${p}-${++seq}`;
  const gridCells = [];
  const sunDomById = new Map();
  let selectedPlantKey = null;
  let levelIndex = 0;
  let state = null;
  let frameHandle = null;
  let lastFrame = performance.now();
  let resultOverlay = null;
  let levelSelectEl = null;
  const LEVEL_STORAGE_KEY = 'star-game-pvz-last-level';

  const P = {
    sunflower:{n:'向日葵',d:'稳定生产阳光',f:'flower',k:'prod',cost:50,hp:120,t:7.2,sun:25,c:'#fde047',c2:'#22c55e'},
    twinflower:{n:'双子向日葵',d:'一次产出更多阳光',f:'flower',k:'prod',cost:125,hp:155,t:9.2,sun:50,c:'#facc15',c2:'#16a34a',twin:1},
    goldbloom:{n:'金盏花',d:'短暂蓄力后返还一团应急阳光',f:'flower',k:'spec',cost:100,hp:80,fuse:1.05,burstSun:90,c:'#fbbf24',c2:'#16a34a',gold:1},
    sunpod:{n:'阳光豆',d:'便宜又灵活的小型产光植物',f:'bud',k:'prod',cost:25,hp:90,t:5.1,sun:15,c:'#fb923c',c2:'#16a34a'},
    peashooter:{n:'豌豆射手',d:'标准单发远程',f:'pea',k:'atk',cost:100,hp:145,cd:1.2,dmg:22,spd:4.7,style:'pea',c:'#4ade80',c2:'#166534'},
    repeater:{n:'双发射手',d:'一次连射两发',f:'pea',k:'atk',cost:175,hp:160,cd:1.45,dmg:18,spd:4.9,style:'pea',b:2,bg:.15,c:'#34d399',c2:'#166534',two:1},
    gatling:{n:'加特林射手',d:'四连发高输出',f:'pea',k:'atk',cost:250,hp:170,cd:1.55,dmg:15,spd:5.15,style:'pea',b:4,bg:.1,c:'#22c55e',c2:'#14532d',four:1},
    icepea:{n:'寒冰射手',d:'命中后减速敌人',f:'pea',k:'atk',cost:175,hp:150,cd:1.35,dmg:18,spd:4.55,style:'ice',slow:.55,dur:2.6,c:'#7dd3fc',c2:'#0f766e'},
    firepea:{n:'火焰射手',d:'伤害更高并附带灼烧',f:'pea',k:'atk',cost:200,hp:150,cd:1.35,dmg:27,spd:4.9,style:'fire',burn:6,bdur:2.2,spl:.4,sdmg:10,c:'#fb923c',c2:'#9a3412'},
    cactus:{n:'仙人掌',d:'重型直线狙击',f:'cactus',k:'atk',cost:150,hp:185,cd:1.7,dmg:38,spd:5.2,style:'spike',c:'#22c55e',c2:'#14532d',c3:'#f472b6'},
    splitpea:{n:'裂荚射手',d:'更快的双连射',f:'pea',k:'atk',cost:165,hp:150,cd:1.25,dmg:18,spd:4.8,style:'pea',b:2,bg:.11,c:'#4ade80',c2:'#166534',split:1},
    laserbean:{n:'激光豆',d:'整排穿透激光',f:'beam',k:'atk',cost:225,hp:155,cd:1.85,dmg:26,c:'#6ee7b7',c2:'#34d399'},
    cabbage:{n:'卷心菜投手',d:'抛射打击，压制中甲',f:'lob',k:'atk',cost:125,hp:150,cd:1.65,dmg:28,spd:3.7,style:'cabbage',arm:1,c:'#84cc16',c2:'#166534'},
    melonpult:{n:'西瓜投手',d:'范围溅射压场',f:'lob',k:'atk',cost:275,hp:195,cd:2.25,dmg:42,spd:3.4,style:'melon',spl:.85,sdmg:20,c:'#f43f5e',c2:'#166534'},
    kernel:{n:'玉米投手',d:'有概率黄油定身',f:'lob',k:'atk',cost:125,hp:160,cd:1.65,dmg:16,spd:3.5,style:'kernel',butter:.28,stun:1.35,c:'#facc15',c2:'#166534'},
    wallnut:{n:'坚果墙',d:'高耐久前排',f:'wall',k:'def',cost:75,hp:700,c:'#d97706',c2:'#7c2d12'},
    tallnut:{n:'高坚果',d:'超厚护墙，可挡跳跃',f:'wall',k:'def',cost:125,hp:1120,block:1,c:'#b45309',c2:'#78350f',tall:1},
    pumpkin:{n:'南瓜护墙',d:'中等耐久盾墙',f:'pumpkin',k:'def',cost:100,hp:480,c:'#f97316',c2:'#7c2d12'},
    steelnut:{n:'钢坚果',d:'超高耐久并带反伤',f:'wall',k:'def',cost:175,hp:1450,refl:10,block:1,c:'#94a3b8',c2:'#334155',steel:1},
    cherry:{n:'樱桃炸弹',d:'短延迟范围爆破',f:'bomb',k:'spec',cost:150,hp:1,fuse:.7,rad:1.7,boom:300,c:'#ef4444',c2:'#166534'},
    jalapeno:{n:'火爆辣椒',d:'清空一整行',f:'pepper',k:'spec',cost:175,hp:1,fuse:.72,line:320,c:'#ef4444',c2:'#166534'},
    doomshroom:{n:'毁灭菇',d:'超大范围重爆',f:'mush',k:'spec',cost:225,hp:1,fuse:.95,rad:2.3,boom:440,doom:1,c:'#6d28d9',c2:'#e9d5ff'},
    potatomine:{n:'土豆雷',d:'埋伏装填后秒杀近敌',f:'mine',k:'spec',cost:50,hp:70,armt:5.2,mine:420,rad:.95,c:'#d97706',c2:'#22c55e'},
    squash:{n:'倭瓜',d:'贴脸重击单体目标',f:'squash',k:'spec',cost:100,hp:120,range:1.1,smash:360,c:'#84cc16',c2:'#15803d'},
    spikeweed:{n:'地刺',d:'路过就会持续掉血',f:'spikes',k:'def',cost:100,hp:220,spike:22,sti:.42,c:'#65a30d',c2:'#365314'},
    spikerock:{n:'尖刺岩',d:'更厚更痛的地刺',f:'spikes',k:'def',cost:150,hp:340,spike:36,sti:.34,rock:1,c:'#78716c',c2:'#292524'},
    chomper:{n:'大嘴花',d:'一口吞掉近身僵尸',f:'chomper',k:'spec',cost:150,hp:180,chomp:1.1,chew:7.2,boss:240,c:'#a855f7',c2:'#581c87',c3:'#22c55e'},
    magnetshroom:{n:'磁力菇',d:'专门拆除金属护甲',f:'mush',k:'spec',cost:125,hp:140,mag:6.8,strip:999,magnet:1,c:'#64748b',c2:'#e2e8f0'},
    iceshroom:{n:'寒冰菇',d:'冻结全场敌人',f:'mush',k:'spec',cost:150,hp:1,fuse:.65,freeze:36,slow:.28,dur:4.2,ice:1,c:'#38bdf8',c2:'#e0f2fe'},
    blover:{n:'三叶草',d:'强风击退整场敌人',f:'blover',k:'spec',cost:100,hp:1,fuse:.5,push:1.05,slow:.7,dur:2.2,c:'#4ade80',c2:'#166534'}
  };

  const Z = {
    basic:{hp:100,sp:.17,dmg:24,atk:.82,t:1,c:'#a3b3c9',g:'none'}, flag:{hp:85,sp:.21,dmg:24,atk:.82,t:1.1,c:'#fca5a5',g:'flag'},
    cone:{hp:175,sp:.16,dmg:24,atk:.82,t:1.7,c:'#fb923c',g:'cone',arm:35}, bucket:{hp:270,sp:.135,dmg:24,atk:.82,t:2.5,c:'#cbd5e1',g:'bucket',arm:80},
    runner:{hp:80,sp:.29,dmg:24,atk:.72,t:1.6,c:'#a78bfa',g:'runner'}, screen:{hp:155,sp:.16,dmg:24,atk:.82,t:2.2,c:'#f8fafc',g:'screen',arm:45,res:.55},
    barrel:{hp:210,sp:.15,dmg:24,atk:.82,t:2.6,c:'#a16207',g:'barrel',arm:60,death:'imp'}, miner:{hp:145,sp:.18,dmg:24,atk:.82,t:2.6,c:'#f59e0b',g:'miner',hide:5.35,hres:.35},
    pogo:{hp:135,sp:.22,dmg:24,atk:.82,t:2.7,c:'#22c55e',g:'pogo',jump:1}, knight:{hp:330,sp:.125,dmg:24,atk:.82,t:3.3,c:'#94a3b8',g:'knight',arm:120,res:.75},
    doctor:{hp:175,sp:.15,dmg:24,atk:.82,t:3,c:'#86efac',g:'doctor',heal:[5.8,24]}, jester:{hp:150,sp:.18,dmg:24,atk:.82,t:2.8,c:'#f472b6',g:'jester',ref:1},
    dancer:{hp:160,sp:.18,dmg:24,atk:.82,t:3.1,c:'#f9a8d4',g:'dancer',sum:[10.5,'imp']}, football:{hp:310,sp:.255,dmg:34,atk:.75,t:4,c:'#ef4444',g:'football',arm:90},
    gargantuar:{hp:920,sp:.09,dmg:72,atk:1.12,t:7.5,c:'#52525b',g:'garg',low:'imp'}, imp:{hp:70,sp:.31,dmg:18,atk:.64,t:1.2,c:'#fca5a5',g:'imp',sc:.72},
    scuba:{hp:135,sp:.18,dmg:24,atk:.82,t:2.6,c:'#38bdf8',g:'scuba',dodge:.28}, newspaper:{hp:120,sp:.15,dmg:24,atk:.82,t:2.5,c:'#e5e7eb',g:'news',rage:[.45,1.85,1.3]},
    torch:{hp:190,sp:.18,dmg:30,atk:.76,t:3.1,c:'#fb923c',g:'torch'}, freezer:{hp:175,sp:.17,dmg:24,atk:.82,t:2.9,c:'#7dd3fc',g:'ice',chill:1},
    ducker:{hp:160,sp:.2,dmg:24,atk:.82,t:2.7,c:'#fde68a',g:'duck',res:.75,hit:.2}, ladder:{hp:190,sp:.17,dmg:24,atk:.82,t:3.2,c:'#d6d3d1',g:'ladder',arm:45,jump:1},
    drummer:{hp:180,sp:.17,dmg:24,atk:.82,t:3.2,c:'#fbbf24',g:'drum',aura:1.15}, wizard:{hp:145,sp:.15,dmg:24,atk:.82,t:3.3,c:'#c4b5fd',g:'wizard',zap:[5.4,55,1.1]},
    mechanic:{hp:190,sp:.17,dmg:24,atk:.82,t:3.2,c:'#60a5fa',g:'mech',rep:[6.2,40]}, punk:{hp:150,sp:.21,dmg:24,atk:.82,t:3,c:'#f472b6',g:'punk',rage:[.7,1.5,1.15]},
    captain:{hp:230,sp:.17,dmg:32,atk:.82,t:3.8,c:'#facc15',g:'captain',arm:60,sum:[12.5,'flag']}, mummy:{hp:250,sp:.145,dmg:24,atk:.82,t:3.6,c:'#f5f5f4',g:'mummy',rev:.48}
  };

  const BASE_PLANT_ORDER = ['sunflower','peashooter','wallnut','sunpod','icepea','cabbage','cherry','repeater','pumpkin','potatomine','kernel','splitpea','magnetshroom','tallnut','spikeweed','goldbloom','firepea','melonpult','jalapeno','blover','gatling','spikerock','cactus','iceshroom','twinflower','steelnut','chomper','laserbean','squash','doomshroom'];
  const BASE_ZOMBIE_ORDER = ['basic','flag','cone','runner','bucket','screen','barrel','newspaper','miner','pogo','doctor','dancer','football','torch','freezer','ducker','ladder','drummer','wizard','mechanic','punk','captain','scuba','jester','knight','mummy','imp','gargantuar'];
  const pvzText5 = (zhCN, zhTW, en, ja, ko) => ({ 'zh-CN': zhCN, 'zh-TW': zhTW, en, ja, ko });
  const BASE_PLANT_TEXT = {
    sunflower: { n: pvzText5('向日葵', '向日葵', 'Sunflower', 'ヒマワリ', '해바라기'), d: pvzText5('稳定生产阳光', '穩定生產陽光', 'Produces sun steadily', '安定して日光を生み出す', '안정적으로 햇빛을 생산한다') },
    twinflower: { n: pvzText5('双子向日葵', '雙子向日葵', 'Twin Sunflower', '双子ヒマワリ', '쌍둥이 해바라기'), d: pvzText5('一次产出更多阳光', '一次產出更多陽光', 'Produces a larger burst of sun', '一度により多くの日光を生む', '한 번에 더 많은 햇빛을 만든다') },
    goldbloom: { n: pvzText5('金盏花', '金盞花', 'Marigold', 'キンセンカ', '금잔화'), d: pvzText5('短暂蓄力后返还一团应急阳光', '短暫蓄力後返還一團應急陽光', 'Stores up and releases emergency sun', '短く力を溜めて日光を放出する', '잠시 힘을 모았다가 긴급 햇빛을 방출한다') },
    sunpod: { n: pvzText5('阳光豆', '陽光豆', 'Sun Bean', 'サンビーン', '햇빛콩'), d: pvzText5('便宜又灵活的小型产光植物', '便宜又靈活的小型產光植物', 'A cheap and flexible sun producer', '安価で扱いやすい小型の日光役', '저렴하고 유연한 소형 햇빛 식물') },
    peashooter: { n: pvzText5('豌豆射手', '豌豆射手', 'Peashooter', 'ピーシューター', '완두 슈터'), d: pvzText5('标准单发远程', '標準單發遠程', 'Standard single-shot attacker', '基本の単発遠距離アタッカー', '기본 단발 원거리 공격수') },
    repeater: { n: pvzText5('双发射手', '雙發射手', 'Repeater', 'リピーター', '더블 슈터'), d: pvzText5('一次连射两发', '一次連射兩發', 'Fires two peas in a burst', '二連射で攻撃する', '두 발을 연속으로 발사한다') },
    gatling: { n: pvzText5('加特林射手', '加特林射手', 'Gatling Pea', 'ガトリングピー', '개틀링 슈터'), d: pvzText5('四连发高输出', '四連發高輸出', 'High-output four-shot burst', '四連射で高火力を出す', '4연사로 높은 화력을 낸다') },
    icepea: { n: pvzText5('寒冰射手', '寒冰射手', 'Ice Pea', 'アイスピー', '얼음 슈터'), d: pvzText5('命中后减速敌人', '命中後減速敵人', 'Slows enemies on hit', '命中した敵を減速させる', '맞은 적을 느리게 만든다') },
    firepea: { n: pvzText5('火焰射手', '火焰射手', 'Fire Pea', 'ファイアピー', '불꽃 슈터'), d: pvzText5('伤害更高并附带灼烧', '傷害更高並附帶灼燒', 'Deals higher damage and burns targets', '高火力で継続燃焼も与える', '더 높은 피해와 화상 효과를 준다') },
    cactus: { n: pvzText5('仙人掌', '仙人掌', 'Cactus', 'サボテン', '선인장'), d: pvzText5('重型直线狙击', '重型直線狙擊', 'Heavy straight-line sniper fire', '重い直線狙撃を行う', '강한 직선 저격 공격을 한다') },
    splitpea: { n: pvzText5('裂荚射手', '裂莢射手', 'Split Pea', 'スプリットピー', '갈래콩 슈터'), d: pvzText5('更快的双连射', '更快的雙連射', 'A faster two-shot attacker', 'より速い二連射を行う', '더 빠른 2연사를 구사한다') },
    laserbean: { n: pvzText5('激光豆', '激光豆', 'Laser Bean', 'レーザービーン', '레이저콩'), d: pvzText5('整排穿透激光', '整排穿透激光', 'Piercing laser across the whole row', '列を貫通するレーザーを放つ', '한 줄 전체를 관통하는 레이저를 쏜다') },
    cabbage: { n: pvzText5('卷心菜投手', '捲心菜投手', 'Cabbage-pult', 'キャベツ投げ', '양배추 투척기'), d: pvzText5('抛射打击，压制中甲', '拋射打擊，壓制中甲', 'Lobbed attacks that pressure medium armor', '放物線攻撃で中装甲を削る', '포물선 공격으로 중형 적을 압박한다') },
    melonpult: { n: pvzText5('西瓜投手', '西瓜投手', 'Melon-pult', 'メロン投げ', '수박 투척기'), d: pvzText5('范围溅射压场', '範圍濺射壓場', 'Area splash for lane control', '範囲 splash で戦線を抑える', '범위 피해로 전장을 제어한다') },
    kernel: { n: pvzText5('玉米投手', '玉米投手', 'Kernel-pult', 'コーン投げ', '옥수수 투척기'), d: pvzText5('有概率黄油定身', '有機率黃油定身', 'Can stun enemies with butter', 'バターで敵を足止めできる', '버터로 적을 멈춰 세울 수 있다') },
    wallnut: { n: pvzText5('坚果墙', '堅果牆', 'Wall-nut', 'ウォールナッツ', '월넛'), d: pvzText5('高耐久前排', '高耐久前排', 'High-durability front-line blocker', '高耐久の前線防壁', '높은 내구도의 전열 방어벽') },
    tallnut: { n: pvzText5('高坚果', '高堅果', 'Tall-nut', 'トールナッツ', '톨넛'), d: pvzText5('超厚护墙，可挡跳跃', '超厚護牆，可擋跳躍', 'Thick wall that also stops jumpers', '厚い壁で跳躍も防ぐ', '매우 두꺼워 점프도 막아낸다') },
    pumpkin: { n: pvzText5('南瓜护墙', '南瓜護牆', 'Pumpkin Shell', 'パンプキンシェル', '호박 보호막'), d: pvzText5('中等耐久盾墙', '中等耐久盾牆', 'Mid-durability protective shell', '中耐久の保護シェル', '중간 내구도의 보호 껍질') },
    steelnut: { n: pvzText5('钢坚果', '鋼堅果', 'Steel-nut', 'スチールナッツ', '강철 넛'), d: pvzText5('超高耐久并带反伤', '超高耐久並帶反傷', 'Very durable and reflects damage', '超高耐久で反撃も行う', '매우 단단하고 반사 피해도 준다') },
    cherry: { n: pvzText5('樱桃炸弹', '櫻桃炸彈', 'Cherry Bomb', 'チェリーボム', '체리 폭탄'), d: pvzText5('短延迟范围爆破', '短延遲範圍爆破', 'Short-delay area explosion', '短い溜めで範囲爆発を起こす', '짧은 준비 후 범위 폭발을 일으킨다') },
    jalapeno: { n: pvzText5('火爆辣椒', '火爆辣椒', 'Jalapeno', 'ハラペーニョ', '할라피뇨'), d: pvzText5('清空一整行', '清空一整行', 'Burns down a whole lane', '一列を一掃する', '한 줄 전체를 불태운다') },
    doomshroom: { n: pvzText5('毁灭菇', '毀滅菇', 'Doom-shroom', 'ドゥームシュルーム', '둠버섯'), d: pvzText5('超大范围重爆', '超大範圍重爆', 'Massive blast over a wide area', '超広範囲に大爆発を起こす', '넓은 범위에 거대한 폭발을 일으킨다') },
    potatomine: { n: pvzText5('土豆雷', '土豆雷', 'Potato Mine', 'ポテトマイン', '감자 지뢰'), d: pvzText5('埋伏装填后秒杀近敌', '埋伏裝填後秒殺近敵', 'Arms itself and destroys nearby enemies', '準備完了後に近くの敵を一撃で倒す', '준비를 마치면 가까운 적을 즉시 처치한다') },
    squash: { n: pvzText5('倭瓜', '倭瓜', 'Squash', 'スクワッシュ', '스쿼시'), d: pvzText5('贴脸重击单体目标', '貼臉重擊單體目標', 'Crushes a single nearby target', '近くの単体を押し潰す', '가까운 단일 적을 강하게 내려찍는다') },
    spikeweed: { n: pvzText5('地刺', '地刺', 'Spikeweed', 'スパイクウィード', '가시풀'), d: pvzText5('路过就会持续掉血', '路過就會持續掉血', 'Damages enemies that walk over it', '上を通る敵に継続ダメージ', '지나가는 적에게 지속 피해를 준다') },
    spikerock: { n: pvzText5('尖刺岩', '尖刺岩', 'Spikerock', 'スパイクロック', '가시바위'), d: pvzText5('更厚更痛的地刺', '更厚更痛的地刺', 'A tougher and deadlier spike trap', 'より硬く痛い地刺', '더 단단하고 더 아픈 가시 함정') },
    chomper: { n: pvzText5('大嘴花', '大嘴花', 'Chomper', 'チョンパー', '대왕입꽃'), d: pvzText5('一口吞掉近身僵尸', '一口吞掉近身殭屍', 'Swallows a nearby zombie whole', '近づいた敵を丸のみする', '가까운 좀비를 한입에 삼킨다') },
    magnetshroom: { n: pvzText5('磁力菇', '磁力菇', 'Magnet-shroom', 'マグネットキノコ', '자석버섯'), d: pvzText5('专门拆除金属护甲', '專門拆除金屬護甲', 'Strips metal armor from enemies', '金属装甲を引きはがす', '적의 금속 장비를 떼어 낸다') },
    iceshroom: { n: pvzText5('寒冰菇', '寒冰菇', 'Ice-shroom', 'アイスシュルーム', '얼음버섯'), d: pvzText5('冻结全场敌人', '凍結全場敵人', 'Freezes every enemy on the field', '画面内の敵をまとめて凍らせる', '전장의 적 전체를 얼려 버린다') },
    blover: { n: pvzText5('三叶草', '三葉草', 'Blover', 'ブロワー', '블로버'), d: pvzText5('强风击退整场敌人', '強風擊退整場敵人', 'Blows enemies back with a strong gust', '強風で敵を押し戻す', '강한 바람으로 적을 밀어낸다') }
  };
  const UNIQUE_PLANT_TEXT = {
    prod: {
      names: {
        'zh-CN': { prefixes: ['晨露', '晴岚', '曦光', '暖穗', '琥珀', '蜜铃'], nouns: ['向阳花', '铃兰', '芽苞', '花盘', '小冠', '晨菊'] },
        'zh-TW': { prefixes: ['晨露', '晴嵐', '曦光', '暖穗', '琥珀', '蜜鈴'], nouns: ['向陽花', '鈴蘭', '芽苞', '花盤', '小冠', '晨菊'] },
        en: { prefixes: ['Dew', 'Clearwind', 'Dawnglow', 'Warmgrain', 'Amber', 'Honeybell'], nouns: ['Sunflower', 'Lily', 'Bud', 'Bloom Disk', 'Sun Crown', 'Dawn Daisy'] },
        ja: { prefixes: ['朝露', '晴嵐', '曙光', '暖穂', '琥珀', '蜜鈴'], nouns: ['ヒマワリ', 'スズラン', 'つぼみ', '花盤', '陽冠', '朝菊'] },
        ko: { prefixes: ['이슬', '청람', '서광', '온이삭', '호박빛', '밀방울'], nouns: ['해바라기', '은방울꽃', '새싹', '꽃판', '햇관', '아침국화'] }
      },
      notes: {
        'zh-CN': ['稳定供光', '低费快产', '双头高产', '中后期滚雪球', '轻量补费', '高投入高回报'],
        'zh-TW': ['穩定供光', '低費快產', '雙頭高產', '中後期滾雪球', '輕量補費', '高投入高回報'],
        en: ['Steady sun income', 'Low-cost fast sun production', 'Twin-head high yield', 'Midgame economic snowball', 'Light support income', 'High-investment sun engine'],
        ja: ['安定した日光供給', '低コストで素早く生産', '双頭で高収入', '中盤以降の経済加速', '軽い補助収入', '重投資型の日光源'],
        ko: ['안정적인 햇빛 수급', '저비용 빠른 생산', '쌍두 고수익', '중후반 경제 가속', '가벼운 보조 수급', '고투자 고수익 태양원']
      }
    },
    atk: {
      names: {
        'zh-CN': { prefixes: ['青藤', '霜纹', '炽芯', '裂叶', '雷棘', '虹脉', '岩果', '流萤', '苍岚'], nouns: ['射手', '炮手', '豆荚', '尖刺掌', '棱镜豆', '投手'] },
        'zh-TW': { prefixes: ['青藤', '霜紋', '熾芯', '裂葉', '雷棘', '虹脈', '岩果', '流螢', '蒼嵐'], nouns: ['射手', '炮手', '豆莢', '尖刺掌', '稜鏡豆', '投手'] },
        en: { prefixes: ['Vine', 'Frost', 'Ember', 'Splitleaf', 'Thunderthorn', 'Rainbowvein', 'Stonefruit', 'Glowfly', 'Azurewind'], nouns: ['Shooter', 'Cannoneer', 'Pod', 'Spike Palm', 'Prism Bean', 'Lobber'] },
        ja: { prefixes: ['青藤', '霜紋', '炎芯', '裂葉', '雷棘', '虹脈', '岩果', '流蛍', '蒼嵐'], nouns: ['シューター', '砲手', 'ポッド', 'スパイク掌', 'プリズム豆', '投げ手'] },
        ko: { prefixes: ['청등', '서리결', '화염심', '갈래잎', '뇌극', '무지맥', '암과', '반딧불', '창람'], nouns: ['슈터', '포수', '콩꼬투리', '가시손바닥', '프리즘콩', '투척수'] }
      },
      notes: {
        'zh-CN': ['通用压制', '双连速射', '高频弹幕', '减速控场', '点燃溅射', '破甲狙击', '整行贯穿', '抛射压场', '范围轰击', '黄油控制', '裂射补刀', '重击穿甲'],
        'zh-TW': ['通用壓制', '雙連速射', '高頻彈幕', '減速控場', '點燃濺射', '破甲狙擊', '整行貫穿', '拋射壓場', '範圍轟擊', '黃油控制', '裂射補刀', '重擊穿甲'],
        en: ['General lane pressure', 'Fast double burst', 'High-frequency barrage', 'Slow and control', 'Ignite and splash', 'Armor-piercing snipe', 'Full-row piercing', 'Lobbed suppression', 'Area bombardment', 'Butter stun control', 'Split-shot finisher', 'Heavy armor break'],
        ja: ['汎用的な制圧', '高速二連射', '高頻度の弾幕', '減速コントロール', '着火と飛び火', '装甲狙撃', '列貫通攻撃', '投射で制圧', '範囲砲撃', 'バターで足止め', '裂射で追撃', '重打撃で装甲破壊'],
        ko: ['범용 압박 화력', '빠른 2연사', '고빈도 탄막', '감속 제어', '점화와 확산', '장갑 저격', '한 줄 관통', '포물선 제압', '범위 폭격', '버터 기절 제어', '분열 사격 마무리', '강타 장갑 파괴']
      }
    },
    def: {
      names: {
        'zh-CN': { prefixes: ['榆木', '玄壳', '磐石', '钢鬃', '荆棘', '厚藤'], nouns: ['壁垒', '盾果', '护壳', '地刺', '岩盾', '墙果'] },
        'zh-TW': { prefixes: ['榆木', '玄殼', '磐石', '鋼鬃', '荊棘', '厚藤'], nouns: ['壁壘', '盾果', '護殼', '地刺', '岩盾', '牆果'] },
        en: { prefixes: ['Elm', 'Darkshell', 'Crag', 'Steelmane', 'Thorn', 'Thickvine'], nouns: ['Bastion', 'Shield Nut', 'Guard Shell', 'Spike Trap', 'Stone Shield', 'Wall Nut'] },
        ja: { prefixes: ['榆', '玄殻', '盤石', '鋼鬣', '荊棘', '厚蔓'], nouns: ['バスティオン', '盾実', '護殻', '地刺', '岩盾', '壁実'] },
        ko: { prefixes: ['느릅', '현각', '반석', '강철갈기', '가시', '두꺼운덩굴'], nouns: ['보루', '방패열매', '보호껍질', '지상가시', '암석방패', '벽열매'] }
      },
      notes: {
        'zh-CN': ['前排扛线', '阻挡跳跃', '包裹护体', '反伤铁壁', '持续磨血', '厚重陷阱'],
        'zh-TW': ['前排扛線', '阻擋跳躍', '包裹護體', '反傷鐵壁', '持續磨血', '厚重陷阱'],
        en: ['Front-line tanking', 'Blocks jumpers', 'Wraparound protection', 'Reflective iron wall', 'Steady chip damage', 'Heavy trap defense'],
        ja: ['前線を支える', '跳躍を防ぐ', '包み込んで守る', '反撃する鉄壁', '継続的に削る', '重い罠防衛'],
        ko: ['전열 방어', '점프 차단', '감싸는 보호막', '반사 철벽', '지속 마모 피해', '무거운 함정 방어']
      }
    },
    spec: {
      names: {
        'zh-CN': { prefixes: ['金辉', '伏火', '寒潮', '旋叶', '裂空', '吞星', '磁暴', '震雷', '流炎', '夜魇'], nouns: ['花', '雷', '辣椒', '炸弹', '巨口花', '寒菇', '吹风叶', '矿豆', '磁菇', '毁灭菇'] },
        'zh-TW': { prefixes: ['金輝', '伏火', '寒潮', '旋葉', '裂空', '吞星', '磁暴', '震雷', '流炎', '夜魘'], nouns: ['花', '雷', '辣椒', '炸彈', '巨口花', '寒菇', '吹風葉', '礦豆', '磁菇', '毀滅菇'] },
        en: { prefixes: ['Goldflare', 'Emberhide', 'Cold Tide', 'Whirlleaf', 'Skytear', 'Starmaw', 'Magstorm', 'Thunderpulse', 'Flowfire', 'Nightmare'], nouns: ['Bloom', 'Mine', 'Pepper', 'Bomb', 'Mawflower', 'Icecap', 'Windleaf', 'Spud', 'Magnet Cap', 'Doom Cap'] },
        ja: { prefixes: ['金輝', '伏火', '寒潮', '旋葉', '裂空', '吞星', '磁嵐', '震雷', '流炎', '夜魘'], nouns: ['花', '雷', 'ペッパー', 'ボム', '大口花', '氷菇', '風葉', '芋', '磁菇', '滅亡菇'] },
        ko: { prefixes: ['금휘', '복화', '한조', '선엽', '열공', '식성', '자폭풍', '진뢰', '유염', '야몽'], nouns: ['꽃', '지뢰', '고추', '폭탄', '대입꽃', '얼음버섯', '바람잎', '감자콩', '자석버섯', '둠버섯'] }
      },
      notes: {
        'zh-CN': ['应急返光', '埋伏爆破', '圆形清场', '整行焚烧', '超大范围爆炸', '单点处决', '吞噬前锋', '拆除护甲', '全场冻结', '吹退压制'],
        'zh-TW': ['應急返光', '埋伏爆破', '圓形清場', '整行焚燒', '超大範圍爆炸', '單點處決', '吞噬前鋒', '拆除護甲', '全場凍結', '吹退壓制'],
        en: ['Emergency sun burst', 'Ambush detonation', 'Circular field clear', 'Burns an entire lane', 'Massive area explosion', 'Single-target execution', 'Devours frontliners', 'Removes armor', 'Freezes the whole field', 'Pushback control'],
        ja: ['緊急の日光補給', '待ち伏せ爆破', '円形一掃', '一列を焼き払う', '超広範囲爆発', '単体処刑', '前衛を飲み込む', '装甲を剥がす', '全体凍結', '吹き飛ばして制圧'],
        ko: ['긴급 햇빛 보충', '매복 폭파', '원형 광역 정리', '한 줄 전소', '초광역 폭발', '단일 처형', '전열 포식', '장갑 제거', '전장 전체 빙결', '밀어내기 제압']
      }
    }
  };
  // Extra naming/description pools for expansion-only unique plants.
  // Important: this is used only when the numeric id exceeds the legacy name-combo space,
  // so it won't rename the existing 1-500 roster.
  const UNIQUE_PLANT_TEXT_EXT = {
    atk: {
      names: {
        'zh-CN': { prefixes: ['星镭', '云弦', '曜刃', '磁暴', '潮汐', '熔光'], nouns: ['光束', '回旋刃', '脉冲', '裂隙'] },
        'zh-TW': { prefixes: ['星鐳', '雲弦', '曜刃', '磁暴', '潮汐', '熔光'], nouns: ['光束', '迴旋刃', '脈衝', '裂隙'] },
        en: { prefixes: ['Starray', 'Cloudstring', 'Sunblade', 'Magstorm', 'Tidecore', 'Meltglow'], nouns: ['Beam', 'Boomerang', 'Pulse', 'Rift'] },
        ja: { prefixes: ['スター', 'クラウド', 'サンブレード', 'マグストーム', 'タイド', 'メルト'], nouns: ['ビーム', 'ブーメラン', 'パルス', 'リフト'] },
        ko: { prefixes: ['별빛', '구름줄', '태양날', '자기폭풍', '조류핵', '용광'], nouns: ['빔', '부메랑', '펄스', '균열'] }
      },
      notes: {
        'zh-CN': ['能量穿透', '回旋追击', '脉冲压制', '裂隙溅射', '破甲收割', '远程点杀'],
        'zh-TW': ['能量貫穿', '迴旋追擊', '脈衝壓制', '裂隙濺射', '破甲收割', '遠程點殺'],
        en: ['Energy piercing', 'Boomerang chase', 'Pulse suppression', 'Rift splash', 'Armor break finisher', 'Long-range execution'],
        ja: ['エネルギー貫通', 'ブーメラン追撃', 'パルス制圧', 'リフト範囲', '装甲破壊', '遠距離処刑'],
        ko: ['에너지 관통', '부메랑 추격', '펄스 제압', '균열 광역', '방어 파괴', '원거리 처형']
      }
    }
  };
  const EXPANSION_PLANT_KEYS = [
    'u_prod_019','u_prod_020','u_prod_021','u_prod_022','u_prod_023','u_prod_024',
    'u_atk_055','u_atk_056','u_atk_057','u_atk_058','u_atk_059','u_atk_060','u_atk_061','u_atk_062','u_atk_063','u_atk_064','u_atk_065','u_atk_066',
    'u_atk_067','u_atk_068','u_atk_069','u_atk_070','u_atk_071','u_atk_072',
    'u_def_019','u_def_020','u_def_021','u_def_022','u_def_023','u_def_024',
    'u_spec_031','u_spec_032','u_spec_033','u_spec_034','u_spec_035','u_spec_036'
  ];
  const EXPANSION_PLANT_INDEX = Object.fromEntries(EXPANSION_PLANT_KEYS.map((key, index) => [key, index]));
  const EXPANSION_PLANT_TEXT = {
    'zh-CN': [
      ['晨辉竖琴','更快产出小束阳光'], ['曙光藤铃','便宜且稳定供光'], ['琥珀灯芯','耐久更高的经济植物'], ['日轮风车','周期性喷出双份阳光'], ['晴穗花盘','中期滚雪球型产阳光'], ['金晕晨钟','高投入高回报的后期供光'],
      ['棱镜芦笛','直线激光穿透'], ['彗火椒豆','火焰弹会溅射周围目标'], ['潮汐光束','冰缓射击压制整路'], ['晶刺仙掌','重型破甲尖刺射击'], ['烈霞藤炮','高频远程压制'], ['回声投叶','抛射并压制中甲单位'],
      ['月棱蕨束','连续扫线的月光束'], ['风暴豆荚','快速双连射'], ['玻璃柚炮','远程高伤穿甲'], ['熔核号角','爆裂火焰连射'], ['光环羽衣','散射补刀'], ['星海海葵','快速冰弹控场'],
      ['裂晖分株','双向补射'], ['钻锋豆钻','破甲重弹'], ['脉冲棘球','高速尖刺连击'], ['裂谷瓜投','范围砸场'], ['离子卷心','强化黄油定身'], ['镜竹棱炮','穿线束射'],
      ['余烬堡垒','反伤前排'], ['霜盾巨壁','高耐久防跳'], ['珊瑚护壳','中耐久包裹防护'], ['铁棘路障','持续磨血地刺'], ['棱镜壁堞','更硬的钢盾前排'], ['沙丘岩刺','重型陷阱防线'],
      ['晨耀铃兰','紧急爆发阳光'], ['陨火地雷','更大范围伏击爆炸'], ['迷雾樱弹','中范围清场'], ['太阳辣椒','整行高温灼烧'], ['深渊夜菇','超大范围重爆'], ['旋风三叶','强力吹退并补伤']
    ],
    'zh-TW': [
      ['晨輝豎琴','更快產出小束陽光'], ['曙光藤鈴','便宜且穩定供光'], ['琥珀燈芯','耐久更高的經濟植物'], ['日輪風車','週期性噴出雙份陽光'], ['晴穗花盤','中期滾雪球型產陽光'], ['金暈晨鐘','高投入高回報的後期供光'],
      ['稜鏡蘆笛','直線雷射穿透'], ['彗火椒豆','火焰彈會濺射周圍目標'], ['潮汐光束','冰緩射擊壓制整路'], ['晶刺仙掌','重型破甲尖刺射擊'], ['烈霞藤炮','高頻遠程壓制'], ['回聲投葉','拋射並壓制中甲單位'],
      ['月稜蕨束','連續掃線的月光束'], ['風暴豆莢','快速雙連射'], ['玻璃柚炮','遠程高傷穿甲'], ['熔核號角','爆裂火焰連射'], ['光環羽衣','散射補刀'], ['星海海葵','快速冰彈控場'],
      ['裂暉分株','雙向補射'], ['鑽鋒豆鑽','破甲重彈'], ['脈衝棘球','高速尖刺連擊'], ['裂谷瓜投','範圍砸場'], ['離子捲心','強化黃油定身'], ['鏡竹稜炮','穿線束射'],
      ['餘燼堡壘','反傷前排'], ['霜盾巨壁','高耐久防跳'], ['珊瑚護殼','中耐久包裹防護'], ['鐵棘路障','持續磨血地刺'], ['稜鏡壁堞','更硬的鋼盾前排'], ['沙丘岩刺','重型陷阱防線'],
      ['晨耀鈴蘭','緊急爆發陽光'], ['隕火地雷','更大範圍伏擊爆炸'], ['迷霧櫻彈','中範圍清場'], ['太陽辣椒','整行高溫灼燒'], ['深淵夜菇','超大範圍重爆'], ['旋風三葉','強力吹退並補傷']
    ],
    en: [
      ['Dawn Harp','Generates small bursts of sun faster'], ['Sunvine Bell','Cheap and stable sun income'], ['Amber Wick','A sturdier economy plant'], ['Sunwheel Mill','Periodically produces double sun'], ['Cleargrain Bloom','A midgame snowball economy plant'], ['Golden Chime','Expensive late-game sun engine'],
      ['Prism Reed','Piercing laser across a lane'], ['Comet Pepper','Fire shots splash nearby targets'], ['Tidal Beam','Icy shots that slow a whole lane'], ['Crystal Cactus','Heavy armor-piercing spikes'], ['Blazevine Cannon','High-frequency ranged pressure'], ['Echo Lobber','Lobbed shots pressure medium armor'],
      ['Moonfern Ray','Continuous moonlight lane sweep'], ['Storm Pod','Fast double burst fire'], ['Glass Pomelo','Long-range high-damage armor break'], ['Magma Horn','Explosive flame volleys'], ['Halo Frond','Scatter-shot finisher'], ['Star Anemone','Fast frost control shots'],
      ['Rift Splitter','Split follow-up fire'], ['Drill Bean','Heavy anti-armor rounds'], ['Pulse Thistle','Rapid spike volleys'], ['Rift Melon','Wide splash impact'], ['Ion Cabbage','Enhanced butter control'], ['Mirror Bamboo','Focused line-piercing beams'],
      ['Ember Bastion','Front-line reflector wall'], ['Frost Greatwall','Tall wall that stops jumpers'], ['Coral Shell','Protective wraparound shield'], ['Iron Briar','Ground thorns that chip away'], ['Prism Rampart','Harder steel front-line wall'], ['Dune Spikerock','Heavy trap defense'],
      ['Morning Lily','Emergency burst of sun'], ['Meteor Mine','Larger ambush explosion'], ['Mist Cherry','Mid-radius field clear'], ['Solar Pepper','High-heat lane burn'], ['Abyss Cap','Huge-area heavy blast'], ['Cyclone Clover','Powerful pushback with chip damage']
    ],
    ja: [
      ['暁光の竪琴','小さな日光を素早く生み出す'], ['曙の蔓鈴','安く安定した日光供給'], ['琥珀の灯芯','耐久が高い経済植物'], ['日輪風車','周期的に二倍の日光を出す'], ['晴穂花盤','中盤で伸びる日光源'], ['金暈の鐘花','終盤向けの高投資日光源'],
      ['プリズム葦笛','直線を貫くレーザー'], ['彗火ペッパー','火炎弾が周囲に飛び散る'], ['潮汐ビーム','減速で一列を抑える'], ['晶棘サボテン','重い装甲を貫く針弾'], ['烈霞ヴァイン','高頻度の遠距離制圧'], ['エコー投葉','中装甲に強い放物攻撃'],
      ['月稜シダ束','月光で連続掃射する'], ['ストームポッド','高速二連射'], ['玻璃ポメロ','高火力の装甲破壊砲'], ['熔核ホーン','爆ぜる火炎連射'], ['ハローフロンド','散弾の追撃手'], ['星海アネモネ','素早い氷弾で足止め'],
      ['裂暉スプリッタ','分裂する追撃弾'], ['ドリルビーンズ','重い破甲弾'], ['パルスシスル','高速の棘連射'], ['裂谷メロン','広範囲の叩きつけ'], ['イオンキャベツ','強化バター拘束'], ['鏡竹ビーム','一直線の集中光束'],
      ['残火バスティオン','反射する前衛壁'], ['霜盾大壁','跳躍を止める高耐久壁'], ['珊瑚シェル','包み込む保護殻'], ['鉄棘バリア','削り続ける地刺'], ['プリズムランパート','さらに硬い鋼壁'], ['砂丘スパイク','重罠の防衛線'],
      ['暁鈴ラン','緊急の日光補給'], ['流星マイン','広範囲の伏撃爆発'], ['霧桜ボム','中範囲の一掃'], ['太陽ペッパー','列全体を高熱で焼く'], ['深淵ナイトキャップ','超広範囲の重爆発'], ['サイクロンクローバー','強い吹き飛ばしと追撃']
    ],
    ko: [
      ['새벽 하프','작은 햇빛을 더 빠르게 만든다'], ['여명 덩굴방울','저렴하고 안정적인 햇빛 공급'], ['호박 심지','내구가 더 높은 경제 식물'], ['태양 풍차','주기적으로 두 배 햇빛 생성'], ['청수 꽃판','중반 운영형 햇빛 식물'], ['금빛 아침종','후반용 고투자 햇빛원'],
      ['프리즘 갈대','한 줄을 관통하는 레이저'], ['혜화 페퍼','화염탄이 주변에 튄다'], ['조류 광선','감속 사격으로 한 줄 제압'], ['수정 선인장','중장갑 파괴 가시탄'], ['열하 덩굴포','고빈도 원거리 압박'], ['메아리 투엽','중갑을 누르는 곡사포'],
      ['월릉 고사리','달빛으로 줄을 쓸어 담는다'], ['폭풍 꼬투리','빠른 2연사'], ['유리 포멜로','고화력 장갑 관통포'], ['용핵 호른','폭발하는 화염 연사'], ['광환 깃잎','산탄 마무리 사수'], ['성해 말미잘','빠른 빙탄 제어'],
      ['열휘 분주','분열 추격 사격'], ['드릴 빈','중장갑 파괴탄'], ['펄스 엉겅퀴','고속 가시 연타'], ['균열 멜론','광역 충격 투척'], ['이온 양배추','강화된 버터 구속'], ['거울 대나무','직선 관통 광선'],
      ['잿불 보루','반사하는 전열 벽'], ['서리 대벽','점프를 막는 고내구 벽'], ['산호 껍질','감싸는 보호막'], ['철가시 장애물','지속적으로 깎는 지면 가시'], ['프리즘 성벽','더 단단한 강철 전열벽'], ['사구 암가시','중형 함정 방어선'],
      ['새벽 방울난','긴급 햇빛 폭발'], ['유성 지뢰','더 넓은 기습 폭발'], ['안개 벚꽃탄','중범위 정리 폭탄'], ['태양 고추','한 줄 고열 연소'], ['심연 밤버섯','초대형 중폭발'], ['사이클론 클로버','강한 밀어내기와 추가 피해']
    ]
  };
  const EXPANSION_ZOMBIE_KEYS = Array.from({ length: 40 }, (_, index) => `u_z_${String(index + 1).padStart(3, '0')}`);
  const EXPANSION_ZOMBIE_INDEX = Object.fromEntries(EXPANSION_ZOMBIE_KEYS.map((key, index) => [key, index]));
  const EXPANSION_ZOMBIE_TEXT = {
    'zh-CN': [
      ['裂隙斥候','高速游走，擅长试探防线'], ['壁垒搬运工','厚甲慢推型前排'], ['坟场医师','持续治疗附近僵尸'], ['回声呼唤者','会召来后续支援'], ['咒光术士','周期性释放电弧打击'],
      ['废料工匠','会修补同伴的护甲'], ['跨栏跃尸','更容易越过前排阻挡'], ['隧道潜伏者','潜行接近后突然现身'], ['合唱督军','为附近僵尸提供增益'], ['灰烬泰坦','重型终结者，能带来小鬼'],
      ['霓虹滑步者','更灵活的高速骚扰者'], ['熔炉卫兵','高抗性的钢甲推进者'], ['白骨护士','擅长抬高队伍续航'], ['信号鼓手','呼叫额外杂兵压场'], ['棱镜先知','远程电击骚扰防线'],
      ['扳手监工','快速修复受损单位'], ['彗尾跳跃者','频繁越障切后排'], ['沙丘遁行者','地下接近后突袭'], ['旗阵指挥','成群推进时更难处理'], ['玄武巨像','厚血压场型大型僵尸'],
      ['潮汐疾行者','高速闪避型前锋'], ['铁幕守卫','重甲抗打且推进稳定'], ['沼泽急救员','能不断抬回血线'], ['迷雾传令官','不断唤来更多支援'], ['伏特窥视者','电弧攻击更频繁'],
      ['铸厂修机师','修理与推进兼备'], ['棘冠跃者','强突前排后快速贴脸'], ['礁影伏行者','潜伏时间更长'], ['战歌统领','强化身边的尸群'], ['惊惧碾压者','高压终盘巨型单位'],
      ['极光突击手','更敏捷的后期先锋'], ['堡垒负重者','兼具高甲与高耐久'], ['疫雾看护','治疗波次中的核心单位'], ['影幕先驱','负责持续召唤添压'], ['离子预言家','远程电击配合推进'],
      ['齿轮总管','修补友军并维持阵线'], ['月跃越障者','高机动跳跃压迫'], ['墓穴鼹行者','潜地切入后排'], ['脉冲指挥家','强化整波僵尸节奏'], ['星裂破城者','第 1000 关前后的重装压轴']
    ],
    'zh-TW': [
      ['裂隙斥候','高速游走，擅長試探防線'], ['壁壘搬運工','厚甲慢推型前排'], ['墳場醫師','持續治療附近殭屍'], ['回聲呼喚者','會召來後續支援'], ['咒光術士','週期性釋放電弧打擊'],
      ['廢料工匠','會修補同伴的護甲'], ['跨欄躍屍','更容易越過前排阻擋'], ['隧道潛伏者','潛行接近後突然現身'], ['合唱督軍','為附近殭屍提供增益'], ['灰燼泰坦','重型終結者，能帶來小鬼'],
      ['霓虹滑步者','更靈活的高速騷擾者'], ['熔爐衛兵','高抗性的鋼甲推進者'], ['白骨護士','擅長抬高隊伍續航'], ['信號鼓手','呼叫額外雜兵壓場'], ['稜鏡先知','遠程電擊騷擾防線'],
      ['扳手監工','快速修復受損單位'], ['彗尾跳躍者','頻繁越障切後排'], ['沙丘遁行者','地下接近後突襲'], ['旗陣指揮','成群推進時更難處理'], ['玄武巨像','厚血壓場型大型殭屍'],
      ['潮汐疾行者','高速閃避型前鋒'], ['鐵幕守衛','重甲抗打且推進穩定'], ['沼澤急救員','能不斷抬回血線'], ['迷霧傳令官','不斷喚來更多支援'], ['伏特窺視者','電弧攻擊更頻繁'],
      ['鑄廠修機師','修理與推進兼備'], ['棘冠躍者','強突前排後快速貼臉'], ['礁影伏行者','潛伏時間更長'], ['戰歌統領','強化身邊的屍群'], ['驚懼碾壓者','高壓終盤巨型單位'],
      ['極光突擊手','更敏捷的後期先鋒'], ['堡壘負重者','兼具高甲與高耐久'], ['疫霧看護','治療波次中的核心單位'], ['影幕先驅','負責持續召喚添壓'], ['離子預言家','遠程電擊配合推進'],
      ['齒輪總管','修補友軍並維持陣線'], ['月躍越障者','高機動跳躍壓迫'], ['墓穴鼴行者','潛地切入後排'], ['脈衝指揮家','強化整波殭屍節奏'], ['星裂破城者','第 1000 關前後的重裝壓軸']
    ],
    en: [
      ['Rift Scout','A fast skirmisher that probes your defense'], ['Bulwark Porter','A slow heavy frontliner with thick armor'], ['Grave Medic','Heals nearby zombies over time'], ['Echo Caller','Summons extra reinforcements'], ['Hex Caster','Periodically releases electric arcs'],
      ['Scrap Tinker','Repairs allied armor in the lane'], ['Vault Hopper','Jumps over part of the front line'], ['Tunnel Stalker','Approaches while hidden underground'], ['Chorus Marshal','Buffs nearby zombie groups'], ['Ash Titan','A heavy finisher that can bring in an imp'],
      ['Neon Skater','A more agile high-speed harasser'], ['Furnace Guard','A steel-armored resistance pusher'], ['Bone Nurse','Excels at sustaining the wave'], ['Signal Drummer','Calls in extra fodder pressure'], ['Prism Seer','Harasses with ranged arc strikes'],
      ['Wrench Overseer','Quickly repairs damaged allies'], ['Comet Vaulter','Frequently jumps to reach the back line'], ['Dune Burrower','Closes in underground before striking'], ['Banner Conductor','Makes grouped pushes harder to stop'], ['Basalt Colossus','A high-health pressure giant'],
      ['Tide Runner','A fast evasive vanguard'], ['Iron Custodian','Steady heavily armored advance'], ['Marsh Rescuer','Keeps the wave healthy for longer'], ['Mist Herald','Continually calls in support'], ['Volt Watcher','Uses electric bursts more often'],
      ['Foundry Engineer','Combines repair with lane pressure'], ['Thorn Crown','Breaks through the front line with jumps'], ['Reef Lurker','Stays hidden for longer'], ['War Song Chief','Empowers nearby zombie packs'], ['Dread Crusher','A late-wave giant built for pressure'],
      ['Aurora Raider','A nimble late-game attacker'], ['Bastion Carrier','High armor and high durability together'], ['Plague Tender','Heals the key units in a wave'], ['Shadow Forerunner','Adds constant summon pressure'], ['Ion Prophet','Combines ranged shocks with pushes'],
      ['Gear Warden','Repairs allies and stabilizes the lane'], ['Moon Vault','A mobile jumper that threatens the back line'], ['Crypt Mole','Burrows in before surfacing deep'], ['Pulse Maestro','Improves the tempo of the whole wave'], ['Starbreaker','A finale bruiser built for the road to 1000']
    ],
    ja: [
      ['リフト斥候','高速で防衛線を探る遊撃役'], ['バルワーク運び','厚い装甲で押してくる前衛'], ['墓場メディック','近くのゾンビを回復する'], ['エコーコーラー','追加の援軍を呼び込む'], ['呪光の術士','周期的に電弧を放つ'],
      ['スクラップ工匠','味方の装甲を修理する'], ['ヴォルトホッパー','前線の一部を跳び越える'], ['トンネルストーカー','地下に潜って接近する'], ['コーラス元帥','周囲のゾンビを強化する'], ['アッシュタイタン','小鬼を伴う大型フィニッシャー'],
      ['ネオンスケーター','より俊敏な高速嫌がらせ役'], ['炉衛兵','鋼鎧で押し込む耐久役'], ['ボーンナース','波全体の継戦力を高める'], ['シグナルドラマー','雑兵を追加で呼び込む'], ['プリズムの預言者','遠距離の電撃で揺さぶる'],
      ['レンチ監督','傷ついた味方を素早く修理する'], ['コメット跳躍者','頻繁に跳んで後衛へ迫る'], ['砂丘バロウアー','地下から接近して奇襲する'], ['旗陣コンダクター','群れで押す時の圧力が高い'], ['玄武の巨像','体力で押し込む大型個体'],
      ['潮汐ランナー','回避しながら走る前衛'], ['鉄幕の番人','重装で安定前進する'], ['湿地レスキュー','波の耐久を長く保つ'], ['霧の先触れ','支援を絶えず呼び続ける'], ['ボルト監視者','電撃の頻度が高い'],
      ['鋳造技師','修理しながら前進圧をかける'], ['棘冠ジャンパー','跳躍で前線を崩す'], ['礁影ルーカー','より長く潜伏する'], ['戦歌の長','周囲の群れを強化する'], ['ドレッドクラッシャー','終盤向けの圧力型巨体'],
      ['オーロラ襲撃者','俊敏な後半戦アタッカー'], ['バスティオン担ぎ','高装甲と高耐久を両立'], ['疫霧の看護役','波の主力を回復する'], ['影幕の先駆','継続的に召喚圧を加える'], ['イオン預言者','電撃と突進を組み合わせる'],
      ['ギアの番人','味方を修理して隊列を保つ'], ['ムーンヴォルト','後衛を狙う高機動跳躍役'], ['墓穴モグラ','深く潜ってから浮上する'], ['パルス指揮者','波全体のテンポを上げる'], ['スターブレイカー','1000 面へ向かう道の重装切り札']
    ],
    ko: [
      ['균열 정찰병','빠르게 움직이며 방어선을 시험한다'], ['보루 운반병','두꺼운 장갑으로 밀고 오는 전열'], ['묘지 의무병','주변 좀비를 계속 회복한다'], ['메아리 호출자','추가 지원군을 불러낸다'], ['주광 술사','주기적으로 전기 충격을 날린다'],
      ['스크랩 수리공','아군 장갑을 수리한다'], ['볼트 도약병','전열 일부를 뛰어넘는다'], ['터널 추적자','땅속에 숨은 채 접근한다'], ['합창 원수','주변 좀비 무리를 강화한다'], ['재의 타이탄','꼬마를 동반하는 중장 피니셔'],
      ['네온 스케이터','더 민첩한 고속 교란형'], ['용광 수비병','강철 갑옷으로 밀어붙인다'], ['뼈 간호병','웨이브 유지력을 높인다'], ['신호 북잡이','추가 잡졸을 호출한다'], ['프리즘 예언자','원거리 전격으로 흔든다'],
      ['렌치 감독관','다친 아군을 빠르게 수리한다'], ['혜성 도약자','자주 뛰며 후열을 압박한다'], ['사구 잠복자','지하로 접근해 기습한다'], ['기수 지휘자','무리 돌진의 압박을 높인다'], ['현무 거상','체력으로 눌러오는 대형 개체'],
      ['조류 질주병','회피하며 돌진하는 선봉'], ['철막 수호자','중장갑으로 안정적으로 전진'], ['늪지 구조원','웨이브 체력을 오래 유지한다'], ['안개 전령','지원을 계속 불러낸다'], ['볼트 감시자','전격 사용 빈도가 더 높다'],
      ['주조 기술자','수리와 압박을 동시에 수행'], ['가시관 도약병','점프로 전열을 무너뜨린다'], ['암초 잠복자','더 오래 숨어 있는 잠복형'], ['전가 지배자','주변 무리를 강화한다'], ['공포 분쇄자','후반 압박용 거대 개체'],
      ['오로라 습격병','민첩한 후반 공격수'], ['바스티온 짐꾼','고장갑과 고내구를 함께 지님'], ['역병 간병인','웨이브 핵심을 회복시킨다'], ['그림자 선도자','지속 소환 압박을 만든다'], ['이온 예언자','전격과 돌진을 함께 건다'],
      ['기어 수호관','아군 수리와 전열 유지 담당'], ['문 볼트','후열을 위협하는 고기동 점퍼'], ['무덤 두더지','깊게 잠입한 뒤 솟아오른다'], ['펄스 마에스트로','웨이브 전체의 템포를 끌어올린다'], ['스타브레이커','1000관으로 가는 길의 중장 보스']
    ]
  };
  function localizePlantStatic(key, locale) {
    const entry = BASE_PLANT_TEXT[key];
    if (!entry) return null;
    return {
      name: entry.n[locale] || entry.n.en || entry.n['zh-CN'] || key,
      desc: entry.d[locale] || entry.d.en || entry.d['zh-CN'] || ''
    };
  }
  function localizeExpansionPlant(key, locale) {
    const idx = EXPANSION_PLANT_INDEX[key];
    if (!Number.isInteger(idx)) return null;
    const arr = EXPANSION_PLANT_TEXT[locale] || EXPANSION_PLANT_TEXT.en || EXPANSION_PLANT_TEXT['zh-CN'];
    const pair = arr && arr[idx];
    if (!pair) return null;
    return { name: pair[0] || key, desc: pair[1] || '' };
  }
  function localizeUniquePlant(key, locale) {
    const match = /^u_(prod|atk|def|spec)_(\d+)$/.exec(String(key || ''));
    if (!match) return null;
    const kind = match[1];
    const idx = Math.max(0, Number(match[2]) - 1);
    const block = UNIQUE_PLANT_TEXT[kind];
    if (!block) return null;
    const names = block.names[locale] || block.names.en || block.names['zh-CN'];
    const notes = block.notes[locale] || block.notes.en || block.notes['zh-CN'];
    if (!names || !notes) return null;
    const basePrefixLen = Math.max(1, (names.prefixes || []).length);
    const baseNounLen = Math.max(1, (names.nouns || []).length);
    const baseCombos = basePrefixLen * baseNounLen;
    let prefixPool = names.prefixes || [''];
    let nounPool = names.nouns || [''];
    let notePool = notes || [''];
    let j = idx;
    if (idx >= baseCombos) {
      const extBlock = UNIQUE_PLANT_TEXT_EXT[kind];
      if (extBlock) {
        const extNames = extBlock.names && (extBlock.names[locale] || extBlock.names.en || extBlock.names['zh-CN']);
        const extNotes = extBlock.notes && (extBlock.notes[locale] || extBlock.notes.en || extBlock.notes['zh-CN']);
        if (extNames && (extNames.prefixes || []).length && (extNames.nouns || []).length) {
          prefixPool = extNames.prefixes;
          nounPool = extNames.nouns;
          j = idx - baseCombos;
        }
        if (extNotes && extNotes.length) notePool = extNotes;
      }
    }
    const prefix = prefixPool[j % prefixPool.length] || '';
    const noun = nounPool[Math.floor(j / Math.max(1, prefixPool.length)) % nounPool.length] || '';
    const joiner = locale === 'en' || locale === 'ko' ? ' ' : '';
    return { name: `${prefix}${joiner}${noun}`.trim(), desc: notePool[j % notePool.length] || '' };
  }
  function getPlantText(key) {
    const locale = getPvzLocale();
    const staticText = localizePlantStatic(key, locale);
    if (staticText) return staticText;
    const expansionText = localizeExpansionPlant(key, locale);
    if (expansionText) return expansionText;
    const uniqueText = localizeUniquePlant(key, locale);
    if (uniqueText) return uniqueText;
    const d = P[key] || {};
    return { name: d.n || key, desc: d.d || '' };
  }
  function getZombieText(key) {
    const locale = getPvzLocale();
    const idx = EXPANSION_ZOMBIE_INDEX[key];
    if (Number.isInteger(idx)) {
      const arr = EXPANSION_ZOMBIE_TEXT[locale] || EXPANSION_ZOMBIE_TEXT.en || EXPANSION_ZOMBIE_TEXT['zh-CN'];
      const pair = arr && arr[idx];
      if (pair) return { name: pair[0] || key, desc: pair[1] || '' };
    }
    const d = Z[key] || {};
    return { name: d.n || key, desc: d.d || '' };
  }

  const tone = (h, s, l) => `hsl(${Math.round(h)}deg ${Math.round(s)}% ${Math.round(l)}%)`;

  function buildUniquePlantCatalog() {
    const need = Math.max(0, TARGET_PLANT_COUNT - BASE_PLANT_ORDER.length);
    const catalog = {};
    const order = [];
    const pushPlant = (key, def) => {
      if (order.length >= need || catalog[key]) return;
      catalog[key] = Object.assign({}, def);
      order.push(key);
    };
    const paint = (h, i, s, l) => tone((h + i * 9) % 360, s, clamp(l - (i % 4) * 2, 18, 78));

    const producerProfiles = [
      (i) => ({ f:'flower', k:'prod', cost:42 + (i % 3) * 10, hp:118 + (i % 5) * 14, t:Math.max(4.6, 6.9 - (i % 6) * .28), sun:22 + (i % 4) * 4, c:paint(48, i, 92, 62), c2:paint(124, i, 64, 40) }),
      (i) => ({ f:'bud', k:'prod', cost:28 + (i % 4) * 7, hp:88 + (i % 5) * 12, t:Math.max(3.5, 5.2 - (i % 6) * .18), sun:14 + (i % 4) * 3, c:paint(28, i, 90, 60), c2:paint(118, i, 58, 38) }),
      (i) => ({ f:'flower', k:'prod', cost:96 + (i % 4) * 12, hp:138 + (i % 5) * 18, t:Math.max(5.8, 8.6 - (i % 5) * .24), sun:38 + (i % 4) * 6, twin:1, c:paint(44, i, 88, 60), c2:paint(116, i, 60, 36) }),
      (i) => ({ f:'flower', k:'prod', cost:74 + (i % 4) * 9, hp:130 + (i % 5) * 16, t:Math.max(4.1, 6.2 - (i % 5) * .22), sun:26 + (i % 5) * 5, c:paint(56, i, 90, 58), c2:paint(132, i, 58, 34) }),
      (i) => ({ f:'bud', k:'prod', cost:18 + (i % 4) * 5, hp:72 + (i % 5) * 10, t:Math.max(3.2, 4.6 - (i % 4) * .15), sun:10 + (i % 4) * 3, c:paint(20, i, 92, 62), c2:paint(136, i, 54, 36) }),
      (i) => ({ f:'flower', k:'prod', cost:112 + (i % 4) * 11, hp:152 + (i % 5) * 18, t:Math.max(5.2, 7.8 - (i % 5) * .2), sun:44 + (i % 4) * 7, c:paint(40, i, 94, 60), c2:paint(144, i, 56, 32) })
    ];
    for (let i = 0; i < 18; i++) {
      const def = producerProfiles[i % producerProfiles.length](i);
      pushPlant(`u_prod_${String(i + 1).padStart(3, '0')}`, def);
    }

    const attackerProfiles = [
      (i) => ({ f:'pea', k:'atk', cost:96 + (i % 4) * 8, hp:142 + (i % 5) * 10, cd:Math.max(.66, 1.18 - (i % 6) * .03), dmg:22 + (i % 5) * 3, spd:4.65 + (i % 4) * .08, style:'pea', c:paint(126, i, 72, 56), c2:paint(142, i, 58, 24) }),
      (i) => ({ f:'pea', k:'atk', cost:152 + (i % 4) * 10, hp:150 + (i % 5) * 11, cd:Math.max(.7, 1.36 - (i % 6) * .03), dmg:17 + (i % 5) * 2, spd:4.8 + (i % 4) * .08, style:'pea', b:2, bg:Math.max(.05, .14 - (i % 5) * .01), two:1, c:paint(140, i, 74, 56), c2:paint(156, i, 60, 22) }),
      (i) => ({ f:'pea', k:'atk', cost:208 + (i % 4) * 12, hp:160 + (i % 5) * 12, cd:Math.max(.76, 1.5 - (i % 6) * .03), dmg:15 + (i % 4) * 2, spd:4.95 + (i % 4) * .08, style:'pea', b:3 + (i % 2), bg:Math.max(.04, .11 - (i % 4) * .01), four:1, c:paint(154, i, 78, 54), c2:paint(168, i, 64, 22) }),
      (i) => ({ f:'pea', k:'atk', cost:164 + (i % 4) * 10, hp:148 + (i % 5) * 10, cd:Math.max(.72, 1.28 - (i % 5) * .02), dmg:18 + (i % 4) * 2, spd:4.52 + (i % 4) * .07, style:'ice', slow:Math.max(.24, .58 - (i % 5) * .04), dur:2.4 + (i % 5) * .22, c:paint(198, i, 80, 68), c2:paint(182, i, 66, 30) }),
      (i) => ({ f:'pea', k:'atk', cost:182 + (i % 4) * 11, hp:150 + (i % 5) * 11, cd:Math.max(.74, 1.3 - (i % 5) * .02), dmg:24 + (i % 5) * 3, spd:4.72 + (i % 4) * .08, style:'fire', burn:6 + (i % 5), bdur:2 + (i % 4) * .18, spl:.25 + (i % 4) * .07, sdmg:8 + (i % 5) * 2, c:paint(16, i, 92, 60), c2:paint(8, i, 74, 26) }),
      (i) => ({ f:'cactus', k:'atk', cost:144 + (i % 4) * 10, hp:178 + (i % 5) * 14, cd:Math.max(.82, 1.64 - (i % 5) * .03), dmg:34 + (i % 5) * 4, spd:5 + (i % 4) * .07, style:'spike', arm:1, c:paint(122, i, 62, 48), c2:paint(132, i, 58, 18), c3:paint(320, i, 78, 70) }),
      (i) => ({ f:'beam', k:'atk', cost:214 + (i % 4) * 10, hp:156 + (i % 5) * 10, cd:Math.max(.84, 1.82 - (i % 5) * .03), dmg:26 + (i % 5) * 3, pierceLine:1, c:paint(154, i, 74, 62), c2:paint(168, i, 72, 42) }),
      (i) => ({ f:'lob', k:'atk', cost:118 + (i % 4) * 10, hp:150 + (i % 5) * 11, cd:Math.max(.84, 1.58 - (i % 5) * .03), dmg:26 + (i % 5) * 3, spd:3.6 + (i % 4) * .05, style:'cabbage', arm:1, c:paint(86, i, 72, 52), c2:paint(136, i, 56, 24) }),
      (i) => ({ f:'lob', k:'atk', cost:216 + (i % 4) * 12, hp:182 + (i % 5) * 12, cd:Math.max(.98, 2.12 - (i % 5) * .05), dmg:38 + (i % 5) * 4, spd:3.34 + (i % 4) * .04, style:'melon', spl:.55 + (i % 4) * .09, sdmg:16 + (i % 5) * 3, c:paint(344, i, 82, 58), c2:paint(136, i, 56, 24) }),
      (i) => ({ f:'lob', k:'atk', cost:126 + (i % 4) * 9, hp:154 + (i % 5) * 11, cd:Math.max(.82, 1.56 - (i % 5) * .03), dmg:16 + (i % 4) * 2, spd:3.45 + (i % 4) * .05, style:'kernel', butter:Math.min(.72, .22 + (i % 6) * .07), stun:1.1 + (i % 4) * .16, c:paint(50, i, 92, 62), c2:paint(126, i, 56, 24) }),
      (i) => ({ f:'pea', k:'atk', cost:162 + (i % 4) * 10, hp:148 + (i % 5) * 10, cd:Math.max(.7, 1.22 - (i % 5) * .02), dmg:18 + (i % 5) * 2, spd:4.84 + (i % 4) * .08, style:'pea', b:2, bg:Math.max(.05, .12 - (i % 4) * .01), split:1, c:paint(132, i, 74, 58), c2:paint(148, i, 60, 24) }),
      (i) => ({ f:'pea', k:'atk', cost:188 + (i % 4) * 11, hp:152 + (i % 5) * 11, cd:Math.max(.78, 1.44 - (i % 5) * .03), dmg:30 + (i % 5) * 4, spd:5.12 + (i % 4) * .06, style:'pea', arm:1, c:paint(118, i, 68, 54), c2:paint(150, i, 58, 18) })
    ];
    for (let i = 0; i < 54; i++) {
      const def = attackerProfiles[i % attackerProfiles.length](i);
      pushPlant(`u_atk_${String(i + 1).padStart(3, '0')}`, def);
    }

    const defenderProfiles = [
      (i) => ({ f:'wall', k:'def', cost:74 + (i % 4) * 8, hp:620 + (i % 6) * 120, c:paint(26, i, 68, 48), c2:paint(18, i, 56, 24) }),
      (i) => ({ f:'wall', k:'def', cost:118 + (i % 4) * 9, hp:980 + (i % 6) * 135, block:1, tall:1, c:paint(30, i, 66, 44), c2:paint(22, i, 54, 20) }),
      (i) => ({ f:'pumpkin', k:'def', cost:98 + (i % 4) * 9, hp:430 + (i % 6) * 88, c:paint(24, i, 90, 56), c2:paint(14, i, 66, 24) }),
      (i) => ({ f:'wall', k:'def', cost:166 + (i % 4) * 10, hp:1320 + (i % 6) * 145, block:1, refl:8 + (i % 5) * 3, steel:1, c:paint(210, i, 20, 68), c2:paint(214, i, 18, 26) }),
      (i) => ({ f:'spikes', k:'def', cost:92 + (i % 4) * 8, hp:210 + (i % 6) * 26, spike:20 + (i % 6) * 5, sti:Math.max(.18, .4 - (i % 5) * .03), c:paint(88, i, 70, 42), c2:paint(82, i, 64, 22) }),
      (i) => ({ f:'spikes', k:'def', cost:144 + (i % 4) * 9, hp:308 + (i % 6) * 34, spike:32 + (i % 6) * 6, sti:Math.max(.16, .34 - (i % 5) * .025), rock:1, c:paint(34, i, 8, 50), c2:paint(28, i, 8, 20) })
    ];
    for (let i = 0; i < 18; i++) {
      const def = defenderProfiles[i % defenderProfiles.length](i);
      pushPlant(`u_def_${String(i + 1).padStart(3, '0')}`, def);
    }

    const specialProfiles = [
      (i) => ({ f:'flower', k:'spec', cost:84 + (i % 4) * 12, hp:80 + (i % 4) * 14, fuse:.9 + (i % 4) * .08, burstSun:70 + (i % 5) * 18, gold:1, c:paint(44, i, 92, 60), c2:paint(118, i, 56, 34) }),
      (i) => ({ f:'mine', k:'spec', cost:40 + (i % 4) * 8, hp:68 + (i % 4) * 12, armt:4.8 - (i % 4) * .25, mine:340 + (i % 5) * 36, rad:.88 + (i % 4) * .08, c:paint(34, i, 70, 48), c2:paint(118, i, 60, 38) }),
      (i) => ({ f:'bomb', k:'spec', cost:146 + (i % 4) * 12, hp:1, fuse:.62 + (i % 4) * .06, rad:1.45 + (i % 4) * .1, boom:260 + (i % 5) * 30, c:paint(2, i, 84, 58), c2:paint(118, i, 56, 34) }),
      (i) => ({ f:'pepper', k:'spec', cost:168 + (i % 4) * 10, hp:1, fuse:.64 + (i % 4) * .05, line:280 + (i % 5) * 24, burn:8 + (i % 5) * 2, c:paint(8, i, 90, 56), c2:paint(118, i, 56, 34) }),
      (i) => ({ f:'mush', k:'spec', cost:210 + (i % 4) * 14, hp:1, fuse:.88 + (i % 4) * .07, rad:2 + (i % 4) * .14, boom:390 + (i % 5) * 36, doom:1, c:paint(272, i, 72, 48), c2:paint(272, i, 60, 86) }),
      (i) => ({ f:'squash', k:'spec', cost:88 + (i % 4) * 8, hp:110 + (i % 4) * 12, range:1 + (i % 4) * .08, smash:300 + (i % 5) * 30, c:paint(86, i, 68, 52), c2:paint(124, i, 58, 24) }),
      (i) => ({ f:'chomper', k:'spec', cost:136 + (i % 4) * 10, hp:168 + (i % 5) * 12, chomp:.95 + (i % 4) * .08, chew:6.4 - (i % 4) * .25, boss:220 + (i % 5) * 26, c:paint(286, i, 68, 56), c2:paint(286, i, 62, 22), c3:paint(120, i, 56, 38) }),
      (i) => ({ f:'mush', k:'spec', cost:118 + (i % 4) * 9, hp:132 + (i % 4) * 12, mag:6.4 - (i % 4) * .25, strip:999, magnet:1, c:paint(214, i, 18, 52), c2:paint(214, i, 18, 86) }),
      (i) => ({ f:'mush', k:'spec', cost:138 + (i % 4) * 10, hp:1, fuse:.58 + (i % 4) * .05, freeze:30 + (i % 5) * 4, slow:Math.max(.2, .34 - (i % 4) * .03), dur:3.6 + (i % 4) * .34, ice:1, c:paint(198, i, 76, 60), c2:paint(198, i, 54, 92) }),
      (i) => ({ f:'blover', k:'spec', cost:86 + (i % 4) * 8, hp:1, fuse:.44 + (i % 4) * .04, push:.9 + (i % 4) * .08, slow:Math.max(.45, .74 - (i % 4) * .06), dur:1.8 + (i % 4) * .22, gustDmg:18 + (i % 5) * 3, c:paint(134, i, 70, 56), c2:paint(126, i, 56, 30) })
    ];
    for (let i = 0; i < 30; i++) {
      const def = specialProfiles[i % specialProfiles.length](i);
      pushPlant(`u_spec_${String(i + 1).padStart(3, '0')}`, def);
    }

    // Expansion plants (appended after the legacy 150-plant roster so Levels 1-500 stay stable).
    for (let i = 18; i < 24; i++) {
      const def = producerProfiles[i % producerProfiles.length](i);
      pushPlant(`u_prod_${String(i + 1).padStart(3, '0')}`, def);
    }
    for (let i = 54; i < 72; i++) {
      const def = attackerProfiles[i % attackerProfiles.length](i);
      pushPlant(`u_atk_${String(i + 1).padStart(3, '0')}`, def);
    }
    for (let i = 18; i < 24; i++) {
      const def = defenderProfiles[i % defenderProfiles.length](i);
      pushPlant(`u_def_${String(i + 1).padStart(3, '0')}`, def);
    }
    for (let i = 30; i < 36; i++) {
      const def = specialProfiles[i % specialProfiles.length](i);
      pushPlant(`u_spec_${String(i + 1).padStart(3, '0')}`, def);
    }

    return { catalog, order: order.slice(0, need) };
  }

  const uniquePlantCatalog = buildUniquePlantCatalog();
  Object.assign(P, uniquePlantCatalog.catalog);
  const EXPANSION_PLANT_OVERRIDES = {
    u_prod_019:{ f:'flower', k:'prod', cost:45, hp:126, t:5.5, sun:18, c:'#fde68a', c2:'#16a34a' },
    u_prod_020:{ f:'bud', k:'prod', cost:30, hp:96, t:4.3, sun:12, c:'#fb923c', c2:'#15803d' },
    u_prod_021:{ f:'flower', k:'prod', cost:70, hp:176, t:6.1, sun:28, c:'#f59e0b', c2:'#166534' },
    u_prod_022:{ f:'flower', k:'prod', cost:120, hp:152, t:7.4, sun:40, twin:1, c:'#facc15', c2:'#0f766e' },
    u_prod_023:{ f:'flower', k:'prod', cost:90, hp:136, t:5.2, sun:24, c:'#fde047', c2:'#15803d' },
    u_prod_024:{ f:'flower', k:'prod', cost:145, hp:188, t:6.2, sun:34, twin:1, c:'#fbbf24', c2:'#166534' },

    u_atk_055:{ f:'beam', k:'atk', cost:235, hp:162, cd:1.52, dmg:24, pierceLine:1, c:'#93c5fd', c2:'#2563eb' },
    u_atk_056:{ f:'pea', k:'atk', cost:220, hp:156, cd:1.18, dmg:24, spd:4.98, style:'fire', burn:8, bdur:2.5, spl:.36, sdmg:12, c:'#fb7185', c2:'#9f1239' },
    u_atk_057:{ f:'pea', k:'atk', cost:205, hp:150, cd:1.16, dmg:18, spd:4.66, style:'ice', slow:.62, dur:3.1, c:'#67e8f9', c2:'#155e75' },
    u_atk_058:{ f:'cactus', k:'atk', cost:188, hp:188, cd:1.62, dmg:42, spd:5.1, style:'spike', arm:1, c:'#22c55e', c2:'#14532d', c3:'#f472b6' },
    u_atk_059:{ f:'pea', k:'atk', cost:172, hp:150, cd:.92, dmg:16, spd:4.86, style:'pea', b:2, bg:.08, c:'#4ade80', c2:'#166534' },
    u_atk_060:{ f:'lob', k:'atk', cost:150, hp:155, cd:1.48, dmg:29, spd:3.72, style:'cabbage', arm:1, c:'#84cc16', c2:'#166534' },
    u_atk_061:{ f:'beam', k:'atk', cost:258, hp:164, cd:1.66, dmg:30, pierceLine:1, c:'#c4b5fd', c2:'#6d28d9' },
    u_atk_062:{ f:'pea', k:'atk', cost:184, hp:152, cd:1.04, dmg:18, spd:4.92, style:'pea', b:2, bg:.1, two:1, c:'#22c55e', c2:'#14532d' },
    u_atk_063:{ f:'cactus', k:'atk', cost:216, hp:176, cd:1.74, dmg:46, spd:5.18, style:'spike', arm:1, c:'#65a30d', c2:'#365314', c3:'#fda4af' },
    u_atk_064:{ f:'pea', k:'atk', cost:228, hp:160, cd:1.12, dmg:22, spd:5.06, style:'fire', burn:9, bdur:2.8, spl:.42, sdmg:14, b:2, bg:.08, c:'#f97316', c2:'#9a3412' },
    u_atk_065:{ f:'pea', k:'atk', cost:178, hp:148, cd:1.1, dmg:16, spd:4.82, style:'pea', b:2, bg:.1, split:1, c:'#86efac', c2:'#166534' },
    u_atk_066:{ f:'pea', k:'atk', cost:190, hp:154, cd:1.06, dmg:17, spd:4.7, style:'ice', slow:.52, dur:2.9, b:2, bg:.09, c:'#93c5fd', c2:'#0f766e' },
    u_atk_067:{ f:'pea', k:'atk', cost:182, hp:150, cd:1.08, dmg:17, spd:4.9, style:'pea', b:2, bg:.1, split:1, c:'#4ade80', c2:'#166534' },
    u_atk_068:{ f:'cactus', k:'atk', cost:224, hp:190, cd:1.68, dmg:48, spd:5.24, style:'spike', arm:1, c:'#16a34a', c2:'#14532d', c3:'#fb7185' },
    u_atk_069:{ f:'cactus', k:'atk', cost:196, hp:180, cd:1.24, dmg:28, spd:5.12, style:'spike', c:'#22c55e', c2:'#14532d', c3:'#facc15' },
    u_atk_070:{ f:'lob', k:'atk', cost:258, hp:188, cd:2.06, dmg:40, spd:3.36, style:'melon', spl:.72, sdmg:18, c:'#f43f5e', c2:'#166534' },
    u_atk_071:{ f:'lob', k:'atk', cost:168, hp:164, cd:1.42, dmg:17, spd:3.56, style:'kernel', butter:.42, stun:1.7, c:'#facc15', c2:'#166534' },
    u_atk_072:{ f:'beam', k:'atk', cost:276, hp:170, cd:1.78, dmg:34, pierceLine:1, c:'#6ee7b7', c2:'#059669' },

    u_def_019:{ f:'wall', k:'def', cost:88, hp:860, refl:8, c:'#b45309', c2:'#7c2d12' },
    u_def_020:{ f:'wall', k:'def', cost:140, hp:1260, block:1, tall:1, c:'#93c5fd', c2:'#1d4ed8' },
    u_def_021:{ f:'pumpkin', k:'def', cost:110, hp:560, c:'#fb923c', c2:'#7c2d12' },
    u_def_022:{ f:'spikes', k:'def', cost:120, hp:260, spike:28, sti:.3, c:'#65a30d', c2:'#365314' },
    u_def_023:{ f:'wall', k:'def', cost:182, hp:1500, block:1, steel:1, refl:12, c:'#94a3b8', c2:'#334155' },
    u_def_024:{ f:'spikes', k:'def', cost:162, hp:348, spike:40, sti:.28, rock:1, c:'#78716c', c2:'#292524' },

    u_spec_031:{ f:'flower', k:'spec', cost:95, hp:88, fuse:.78, burstSun:120, gold:1, c:'#fbbf24', c2:'#15803d' },
    u_spec_032:{ f:'mine', k:'spec', cost:65, hp:80, armt:4.1, mine:500, rad:1.12, c:'#f97316', c2:'#15803d' },
    u_spec_033:{ f:'bomb', k:'spec', cost:175, hp:1, fuse:.56, rad:1.72, boom:320, c:'#ef4444', c2:'#166534' },
    u_spec_034:{ f:'pepper', k:'spec', cost:210, hp:1, fuse:.58, line:390, burn:12, c:'#dc2626', c2:'#166534' },
    u_spec_035:{ f:'mush', k:'spec', cost:250, hp:1, fuse:.82, rad:2.46, boom:520, doom:1, c:'#7c3aed', c2:'#e9d5ff' },
    u_spec_036:{ f:'blover', k:'spec', cost:120, hp:1, fuse:.42, push:1.25, slow:.74, dur:2.7, gustDmg:34, c:'#4ade80', c2:'#166534' }
  };
  Object.keys(EXPANSION_PLANT_OVERRIDES).forEach(key => {
    if (P[key]) P[key] = Object.assign({}, P[key], EXPANSION_PLANT_OVERRIDES[key]);
  });

  function buildUniqueZombieCatalog(extraNeed) {
    const need = Math.max(0, Math.floor(Number(extraNeed) || 0));
    const catalog = {};
    const order = [];
    const pushZombie = (key, def) => {
      if (order.length >= need) return;
      if (catalog[key] || Z[key]) return;
      catalog[key] = Object.assign({}, def);
      order.push(key);
    };
    const paint = (h, i, s, l) => tone((h + i * 11) % 360, s, clamp(l - (i % 5) * 2, 18, 78));
    const gearKeys = ['visor', 'helm', 'horn', 'jet', 'shaman', 'glitch', 'crystal', 'toxic', 'phantom', 'crown'];
    const profiles = [
      // Fast skirmisher: quick but fragile, gives room for players to dodge.
      (i) => ({ hp: 115 + (i % 6) * 18, sp: +(0.24 + (i % 5) * 0.014).toFixed(3), dmg: 22 + (i % 4) * 3, atk: 0.72, t: +(2.1 + (i % 4) * 0.12).toFixed(2), dodge: +(0.18 + (i % 4) * 0.04).toFixed(2) }),
      // Armored bruiser: slow, armored, steady.
      (i) => ({ hp: 280 + (i % 7) * 36, sp: +(0.14 + (i % 4) * 0.01).toFixed(3), dmg: 26 + (i % 4) * 3, atk: 0.86, t: +(3.6 + (i % 4) * 0.18).toFixed(2), arm: 55 + (i % 6) * 14, res: +(0.6 + (i % 4) * 0.05).toFixed(2) }),
      // Medic: heals nearby zombies over time.
      (i) => ({ hp: 190 + (i % 6) * 24, sp: +(0.17 + (i % 4) * 0.012).toFixed(3), dmg: 24 + (i % 5) * 3, atk: 0.82, t: +(3.2 + (i % 4) * 0.2).toFixed(2), heal: [Math.max(4.2, +(5.2 - (i % 4) * 0.28).toFixed(2)), 22 + (i % 6) * 4] }),
      // Summoner: calls in reinforcements.
      (i) => ({ hp: 165 + (i % 6) * 20, sp: +(0.18 + (i % 5) * 0.012).toFixed(3), dmg: 22 + (i % 4) * 2, atk: 0.8, t: +(3.0 + (i % 4) * 0.18).toFixed(2), sum: [Math.max(9.6, +(11.4 - (i % 4) * 0.22).toFixed(2)), (i % 3 === 0 ? 'imp' : i % 3 === 1 ? 'flag' : 'runner')] }),
      // Caster: ranged zap pressure.
      (i) => ({ hp: 155 + (i % 6) * 22, sp: +(0.16 + (i % 4) * 0.012).toFixed(3), dmg: 24 + (i % 5) * 2, atk: 0.82, t: +(3.4 + (i % 4) * 0.2).toFixed(2), zap: [Math.max(4.6, +(5.6 - (i % 4) * 0.18).toFixed(2)), 48 + (i % 6) * 6, +(1.05 + (i % 3) * 0.06).toFixed(2)] }),
      // Mechanic: repairs allies (armor-ish sustain).
      (i) => ({ hp: 210 + (i % 6) * 28, sp: +(0.15 + (i % 4) * 0.01).toFixed(3), dmg: 26 + (i % 5) * 3, atk: 0.86, t: +(3.8 + (i % 4) * 0.18).toFixed(2), rep: [Math.max(5.2, +(6.6 - (i % 4) * 0.2).toFixed(2)), 38 + (i % 6) * 5] }),
      // Jumper: breaks some front-line positioning but still dodgeable.
      (i) => ({ hp: 140 + (i % 6) * 18, sp: +(0.22 + (i % 5) * 0.012).toFixed(3), dmg: 22 + (i % 5) * 2, atk: 0.74, t: +(2.6 + (i % 4) * 0.14).toFixed(2), jump: 1, res: +(0.55 + (i % 4) * 0.05).toFixed(2) }),
      // Burrower: hides for a while, then emerges.
      (i) => ({ hp: 160 + (i % 6) * 20, sp: +(0.19 + (i % 5) * 0.012).toFixed(3), dmg: 22 + (i % 4) * 2, atk: 0.78, t: +(3.1 + (i % 4) * 0.16).toFixed(2), hide: +(Math.max(3.8, 5.1 - (i % 4) * 0.35)).toFixed(2), hres: +(0.4 + (i % 4) * 0.05).toFixed(2) }),
      // Aura: buffs lane pressure by making groups feel denser.
      (i) => ({ hp: 220 + (i % 6) * 26, sp: +(0.16 + (i % 5) * 0.01).toFixed(3), dmg: 26 + (i % 4) * 3, atk: 0.86, t: +(3.7 + (i % 4) * 0.2).toFixed(2), aura: +(1.08 + (i % 5) * 0.03).toFixed(2) }),
      // Titan: late-game anchor that still isn't a full gargantuar.
      (i) => ({ hp: 520 + (i % 6) * 55, sp: +(0.105 + (i % 3) * 0.008).toFixed(3), dmg: 44 + (i % 4) * 5, atk: 1.0, t: +(6.2 + (i % 4) * 0.28).toFixed(2), low: 'imp', arm: 75 + (i % 5) * 18 })
    ];
    for (let i = 0; i < need; i++) {
      const base = profiles[i % profiles.length](i);
      const gearKey = gearKeys[(i * 7 + Math.floor(i / 3)) % gearKeys.length];
      const def = Object.assign({}, base, {
        c: paint(210 + i * 13, i, 54 + (i % 4) * 6, 66),
        g: gearKey
      });
      pushZombie(`u_z_${String(i + 1).padStart(3, '0')}`, def);
    }
    return { catalog, order };
  }

  const baseZombieSnapshots = Object.fromEntries(BASE_ZOMBIE_ORDER.map(key => [key, JSON.parse(JSON.stringify(Z[key]))]));
  const generatedZombieOrder = [];
  const generatedZombies = {};
  const mutantTarget = Math.min(LEGACY_ZOMBIE_COUNT, TARGET_ZOMBIE_COUNT);
  const mutantNeed = Math.max(0, mutantTarget - BASE_ZOMBIE_ORDER.length);
  for (let i = 0; i < mutantNeed; i++) {
    const baseKey = BASE_ZOMBIE_ORDER[i % BASE_ZOMBIE_ORDER.length];
    const base = baseZombieSnapshots[baseKey];
    const tier = 1 + Math.floor(i / BASE_ZOMBIE_ORDER.length);
    const drift = i % 5;
    const key = `mutant_${baseKey}_${String(tier).padStart(2, '0')}`;
    const hpScale = 1 + tier * .16 + drift * .03;
    const dmgScale = 1 + tier * .08 + (drift === 4 ? .06 : 0);
    const speedScale = Math.max(.78, 1 + tier * .012 + (drift - 2) * .018);
    const variant = Object.assign({}, base, {
      hp: Math.round(base.hp * hpScale),
      sp: +(base.sp * speedScale).toFixed(3),
      dmg: Math.round(base.dmg * dmgScale),
      atk: +(Math.max(.48, base.atk * (1 - tier * .01))).toFixed(2),
      t: +(base.t * (1 + tier * .08)).toFixed(2),
      c: tone((i * 17 + tier * 11) % 360, 56 + (i % 4) * 6, 68 - Math.min(22, tier * 3 + drift))
    });
    if (variant.arm) variant.arm = Math.round(variant.arm * (1 + tier * .18));
    if (variant.heal) variant.heal = [Math.max(2.8, +(variant.heal[0] - tier * .12).toFixed(2)), Math.round(variant.heal[1] * (1 + tier * .12))];
    if (variant.rep) variant.rep = [Math.max(3.2, +(variant.rep[0] - tier * .12).toFixed(2)), Math.round(variant.rep[1] * (1 + tier * .1))];
    if (variant.zap) variant.zap = [Math.max(2.8, +(variant.zap[0] - tier * .1).toFixed(2)), Math.round(variant.zap[1] * (1 + tier * .12)), +(variant.zap[2] * (1 + tier * .02)).toFixed(2)];
    if (variant.sum) variant.sum = [Math.max(4.8, +(variant.sum[0] - tier * .14).toFixed(2)), variant.sum[1]];
    if (variant.rage) variant.rage = [Math.max(.18, +(variant.rage[0] - tier * .03).toFixed(2)), +(variant.rage[1] + tier * .08).toFixed(2), +(variant.rage[2] + tier * .05).toFixed(2)];
    if (variant.hide) variant.hide = +(Math.max(2.2, variant.hide - tier * .24)).toFixed(2);
    if (variant.dodge) variant.dodge = Math.min(.62, +(variant.dodge + tier * .03).toFixed(2));
    if (variant.res) variant.res = Math.min(.9, +(variant.res + tier * .03).toFixed(2));
    if (variant.hres) variant.hres = Math.min(.85, +(variant.hres + tier * .04).toFixed(2));
    if (variant.sc) variant.sc = +(Math.min(1.12, variant.sc + tier * .03)).toFixed(2);
    generatedZombies[key] = variant;
    generatedZombieOrder.push(key);
  }
  Object.assign(Z, generatedZombies);

  const PORDER = BASE_PLANT_ORDER.concat(uniquePlantCatalog.order).slice(0, TARGET_PLANT_COUNT);
  const uniqueZombieNeed = Math.max(0, TARGET_ZOMBIE_COUNT - mutantTarget);
  const uniqueZombieCatalog = buildUniqueZombieCatalog(uniqueZombieNeed);
  Object.assign(Z, uniqueZombieCatalog.catalog);
  const EXPANSION_ZOMBIE_OVERRIDES = {};
  EXPANSION_ZOMBIE_KEYS.forEach((key, index) => {
    const band = Math.floor(index / 10);
    const slot = index % 10;
    const tintShift = band * 8;
    const base = {
      c: tone((index * 19 + 210 + tintShift) % 360, 58 + (index % 4) * 5, 66 - Math.min(18, band * 4 + (index % 3) * 2))
    };
    let extra = null;
    switch (slot) {
      case 0:
        extra = { hp: 138 + band * 18, sp: +(0.248 + band * 0.012).toFixed(3), dmg: 24 + band * 2, atk: 0.72, t: +(2.25 + band * 0.18).toFixed(2), dodge: +(0.2 + band * 0.04).toFixed(2), rage: [0.44, +(1.42 + band * 0.06).toFixed(2), +(1.1 + band * 0.05).toFixed(2)], g:'visor' };
        break;
      case 1:
        extra = { hp: 324 + band * 36, sp: +(0.146 + band * 0.008).toFixed(3), dmg: 28 + band * 2, atk: 0.86, t: +(3.8 + band * 0.18).toFixed(2), arm: 76 + band * 16, res: +(0.64 + band * 0.04).toFixed(2), g:'helm' };
        break;
      case 2:
        extra = { hp: 206 + band * 22, sp: +(0.176 + band * 0.008).toFixed(3), dmg: 24 + band * 2, atk: 0.82, t: +(3.18 + band * 0.2).toFixed(2), heal: [Math.max(3.8, +(4.9 - band * 0.18).toFixed(2)), 28 + band * 5], aura: +(1.06 + band * 0.02).toFixed(2), g:'horn' };
        break;
      case 3:
        extra = { hp: 182 + band * 20, sp: +(0.186 + band * 0.01).toFixed(3), dmg: 23 + band * 2, atk: 0.8, t: +(3.12 + band * 0.16).toFixed(2), sum: [Math.max(7.8, +(9.8 - band * 0.2).toFixed(2)), band >= 2 ? 'runner' : 'flag'], g:'jet' };
        break;
      case 4:
        extra = { hp: 176 + band * 20, sp: +(0.164 + band * 0.008).toFixed(3), dmg: 24 + band * 2, atk: 0.82, t: +(3.42 + band * 0.18).toFixed(2), zap: [Math.max(3.8, +(4.9 - band * 0.16).toFixed(2)), 54 + band * 8, +(1.08 + band * 0.06).toFixed(2)], g:'shaman' };
        break;
      case 5:
        extra = { hp: 224 + band * 26, sp: +(0.158 + band * 0.008).toFixed(3), dmg: 27 + band * 2, atk: 0.84, t: +(3.54 + band * 0.18).toFixed(2), rep: [Math.max(4.5, +(5.8 - band * 0.18).toFixed(2)), 42 + band * 6], arm: 24 + band * 10, g:'glitch' };
        break;
      case 6:
        extra = { hp: 158 + band * 18, sp: +(0.224 + band * 0.01).toFixed(3), dmg: 24 + band * 2, atk: 0.76, t: +(2.7 + band * 0.18).toFixed(2), jump: 1, res: +(0.58 + band * 0.04).toFixed(2), g:'crystal' };
        break;
      case 7:
        extra = { hp: 174 + band * 18, sp: +(0.194 + band * 0.01).toFixed(3), dmg: 23 + band * 2, atk: 0.78, t: +(3.08 + band * 0.18).toFixed(2), hide: +(Math.max(3.1, 4.6 - band * 0.24)).toFixed(2), hres: +(0.44 + band * 0.04).toFixed(2), g:'toxic' };
        break;
      case 8:
        extra = { hp: 246 + band * 28, sp: +(0.17 + band * 0.008).toFixed(3), dmg: 28 + band * 2, atk: 0.86, t: +(3.62 + band * 0.18).toFixed(2), aura: +(1.12 + band * 0.03).toFixed(2), sum: [Math.max(9.4, +(11 - band * 0.22).toFixed(2)), 'basic'], g:'phantom' };
        break;
      default:
        extra = { hp: 560 + band * 72, sp: +(0.106 + band * 0.006).toFixed(3), dmg: 46 + band * 4, atk: 1.02, t: +(6.5 + band * 0.26).toFixed(2), low:'imp', arm: 82 + band * 18, g:'crown' };
        break;
    }
    if (Z[key]) EXPANSION_ZOMBIE_OVERRIDES[key] = Object.assign({}, base, extra);
  });
  Object.keys(EXPANSION_ZOMBIE_OVERRIDES).forEach(key => {
    if (Z[key]) Z[key] = Object.assign({}, Z[key], EXPANSION_ZOMBIE_OVERRIDES[key]);
  });
  const ZORDER = BASE_ZOMBIE_ORDER.concat(generatedZombieOrder).concat(uniqueZombieCatalog.order).slice(0, TARGET_ZOMBIE_COUNT);

  const mkRng = seed => { let x = seed >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const pick = (arr, fn, rng) => { let s = 0; const ws = arr.map(v => Math.max(.001, fn(v))); ws.forEach(v => s += v); let n = rng() * s; for (let i = 0; i < arr.length; i++) { n -= ws[i]; if (n <= 0) return arr[i]; } return arr[arr.length - 1]; };
  const byCost = (a, b) => ((P[a] && P[a].cost) || 0) - ((P[b] && P[b].cost) || 0) || a.localeCompare(b);
  function tightenWaveCadence(arr, cfg) {
    const waves = arr.slice().sort((a, b) => a.time - b.time).map(w => ({ time: +w.time, row: w.row, type: w.type }));
    if (!waves.length) return waves;
    const firstAt = Math.max(.9, cfg.firstAt || waves[0].time || 1.8);
    const minGap = Math.max(.08, cfg.minGap || .14);
    const headGap = Math.max(minGap, cfg.headGap || 2);
    const tailGap = Math.max(minGap, cfg.tailGap || headGap);
    waves[0].time = +Math.min(waves[0].time, firstAt).toFixed(2);
    let prev = waves[0].time;
    for (let i = 1; i < waves.length; i++) {
      const p = i / Math.max(1, waves.length - 1);
      const maxGap = headGap + (tailGap - headGap) * p;
      let time = waves[i].time;
      const minAllowed = prev + minGap;
      const maxAllowed = prev + maxGap;
      if (time < minAllowed) time = minAllowed;
      if (time > maxAllowed) time = maxAllowed;
      waves[i].time = +time.toFixed(2);
      prev = waves[i].time;
    }
    return waves;
  }

  function chooseProducerPool(prod, seed, span) {
    const ranked = prod.slice().sort(byCost);
    if (!ranked.length) return null;
    if (ranked.length === 1) return ranked[0];
    const width = Math.max(1, Math.min(ranked.length, span || 3));
    const pool = ranked.slice(0, width);
    return pool[((seed % pool.length) + pool.length) % pool.length];
  }

  function buildPlantsLegacy(i) {
    const up = BASE_PLANT_ORDER.slice(0, Math.min(BASE_PLANT_ORDER.length, 4 + Math.floor(i * .55)));
    const cnt = i < 2 ? 3 : i < 8 ? 4 : 5;
    const prod = up.filter(k => P[k].k === 'prod');
    const atk = up.filter(k => P[k].k === 'atk');
    const def = up.filter(k => P[k].k === 'def');
    const spec = up.filter(k => P[k].k === 'spec');
    const extraProd = prod.filter(k => k !== 'sunflower');
    const out = [];
    const add = (list, salt) => { const a = list.filter(k => !out.includes(k)); if (a.length) out.push(a[(i + salt) % a.length]); };
    const openingProd = (i < 8 && up.includes('sunflower'))
      ? 'sunflower'
      : chooseProducerPool(prod, i * 3 + 1, Math.min(3, prod.length));
    if (openingProd) out.push(openingProd);
    add(atk, 2);
    if (cnt >= 3) add(def.length ? def : atk, 3);
    if (cnt >= 4) add(spec.length ? spec : atk, 4);
    if (cnt >= 5) add(extraProd.length ? extraProd : up, 5);
    while (out.length < cnt) add(up, out.length + 6);
    return out.slice(0, cnt);
  }

  function isLaserAttackPlant(key) {
    const d = P[key];
    return !!(d && d.k === 'atk' && (d.f === 'beam' || d.pierceLine));
  }

  function isPlainPeaAttackPlant(key) {
    const d = P[key];
    return !!(d && d.k === 'atk' && d.f === 'pea' && !isLaserAttackPlant(key));
  }

  function isAdvancedAttackPlant(key) {
    const d = P[key];
    if (!d || d.k !== 'atk') return false;
    return isLaserAttackPlant(key) || d.f === 'lob' || d.f === 'cactus' || d.style === 'fire' || d.style === 'ice' || !!d.arm;
  }

  function buildWavesLegacy(i) {
    const up = BASE_ZOMBIE_ORDER.slice(0, Math.min(BASE_ZOMBIE_ORDER.length, 4 + Math.floor(i * .5)));
    const rng = mkRng(4096 + i * 97);
    const total = 18 + Math.floor(i * 1.2) + Math.floor(i / 6);
    const arr = [];
    let t = 2.8;
    for (let n = 0; n < total; n++) {
      const p = n / Math.max(1, total - 1);
      const tier = Math.max(1, Math.min(up.length, 2 + Math.floor(p * (up.length - 1)) + (i > 12 ? 1 : 0)));
      const pool = up.slice(0, tier);
      const type = pick(pool, k => (1 + (pool.indexOf(k) / Math.max(1, pool.length - 1)) * (.5 + i * .01)) / Math.max(.75, Z[k].t * .78), rng);
      arr.push({ time: +t.toFixed(2), row: Math.floor(rng() * rows), type });
      if (i > 6 && n % 5 === 4) { const ep = pool.slice(Math.max(0, pool.length - 3)); arr.push({ time: +(t + .32 + rng() * .24).toFixed(2), row: Math.floor(rng() * rows), type: ep[Math.floor(rng() * ep.length)] }); }
      if (i > 18 && n % 8 === 7) { const sp = pool.slice(Math.max(0, pool.length - 2)); arr.push({ time: +(t + .58 + rng() * .28).toFixed(2), row: Math.floor(rng() * rows), type: sp[Math.floor(rng() * sp.length)] }); }
      if (i > 32 && n % 11 === 10 && rng() < .7) {
        const heavy = up.slice(Math.max(0, up.length - 3));
        arr.push({ time: +(t + .88 + rng() * .36).toFixed(2), row: Math.floor(rng() * rows), type: heavy[Math.floor(rng() * heavy.length)] });
      }
      t += Math.max(.64, 2.18 - i * .026) + rng() * .38;
      if (n % 5 === 4) t += .52 + rng() * .24;
    }
    if (i >= 24 && up.includes('football')) arr.push({ time: +(t + 1.4).toFixed(2), row: Math.floor(rng() * rows), type: 'football' });
    if (i >= 34 && up.includes('gargantuar')) arr.push({ time: +(t + 2.3).toFixed(2), row: Math.floor(rng() * rows), type: 'gargantuar' });
    return tightenWaveCadence(arr, { firstAt: 2.35, minGap: .16, headGap: 2.2, tailGap: 1.45 });
  }

  function buildPlantsExpanded(i) {
    const post = i - BASE_LEVEL_COUNT;
    const unlockRaw = 30 + Math.floor(post * .28);
    let unlock = Math.min(PORDER.length, unlockRaw);
    // Keep Level 1-500 behavior stable (before expansion), then gradually unlock the extra 30 plants across 501-1000.
    if (i < PVZ_EXPANSION_START_INDEX) {
      unlock = Math.min(unlock, LEGACY_PLANT_COUNT);
    } else {
      const extraTotal = Math.max(0, TARGET_PLANT_COUNT - LEGACY_PLANT_COUNT);
      const progress = Math.max(0, i - PVZ_EXPANSION_START_INDEX);
      const denom = Math.max(1, (TOTAL_LEVELS - 1) - PVZ_EXPANSION_START_INDEX);
      const extra = Math.floor((progress * extraTotal) / denom);
      unlock = Math.min(unlock, LEGACY_PLANT_COUNT + extra);
    }
    const up = PORDER.slice(0, Math.max(30, unlock));
    const cnt = Math.min(8, Math.max(5, 5 + Math.floor(post / 90)));
    const prod = up.filter(k => P[k].k === 'prod');
    const atk = up.filter(k => P[k].k === 'atk');
    const def = up.filter(k => P[k].k === 'def');
    const spec = up.filter(k => P[k].k === 'spec');
    const laserAtk = atk.filter(isLaserAttackPlant);
    const advancedAtk = atk.filter(isAdvancedAttackPlant);
    const peaAtk = atk.filter(isPlainPeaAttackPlant);
    const mixedAtk = atk.filter(k => !peaAtk.includes(k));
    const out = [];
    const add = (list, salt) => {
      const pool = list.filter(k => !out.includes(k));
      if (!pool.length) return;
      out.push(pool[(post + salt) % pool.length]);
    };
    let openingProd = chooseProducerPool(prod, post * 5 + 2, Math.min(6, Math.max(3, Math.floor(prod.length * .45))));
    // From Level 501 on, Sunflower should appear more often, but not dominate every level.
    if (i >= PVZ_EXPANSION_START_INDEX && up.includes('sunflower')) {
      const r = ((i * 9301 + post * 49297) % 233280) / 233280;
      const stageBand = Math.min(4, Math.floor(post / 100));
      const sunflowerChanceByBand = [.62, .54, .46, .38, .32];
      const sunflowerChance = sunflowerChanceByBand[stageBand];
      const reserveBreak = post % 6 === 2 || post % 9 === 4;
      const diversifyEconomy = prod.some(k => k !== 'sunflower') && (post % 10 === 0 || post % 13 === 7);
      if (!reserveBreak && !diversifyEconomy && r < sunflowerChance) openingProd = 'sunflower';
    }
    if (openingProd) out.push(openingProd);
    if (cnt >= 6 && prod.length > 1 && post % 4 === 1) add(prod.filter(k => k !== openingProd), 1);
    add(post >= 18 && mixedAtk.length ? mixedAtk : atk, 2);
    if (post >= 14 && laserAtk.length) add(laserAtk, 3);
    if (cnt >= 4) add(def.length ? def : atk, 3);
    if (cnt >= 5) add(spec.length ? spec : atk, 4);
    if (cnt >= 7 && post >= 140 && laserAtk.length > 1) add(laserAtk, 5);
    if (cnt >= 6 && post >= 40 && advancedAtk.length) add(advancedAtk, 6);
    const cycle = [
      post >= 20 && advancedAtk.length ? advancedAtk : mixedAtk.length ? mixedAtk : atk,
      laserAtk.length ? laserAtk : mixedAtk.length ? mixedAtk : atk,
      def,
      spec,
      prod,
      peaAtk.length ? peaAtk : atk,
      up
    ];
    let salt = 5;
    while (out.length < cnt) {
      add(cycle[(out.length + post) % cycle.length], salt++);
      if (salt > 32) add(up, salt++);
    }
    // 后续关卡增加三叶草出现率：但不能每关都出现。
    // 这里用“确定性概率”（基于关卡索引 i）来决定是否把一个 spec 替换成 blover。
    if (post >= 30 && up.includes('blover') && !out.includes('blover')) {
      const p = clamp(0.42 + (post - 30) * 0.0015, 0.42, 0.72);
      const roll = ((i * 9301 + post * 49297) % 233280) / 233280;
      const periodicBoost = post >= 100 && ((i + post * 3) % 5 === 0);
      if (roll < p || periodicBoost) {
        const specIdx = out.findIndex(k => P[k] && P[k].k === 'spec');
        if (specIdx >= 0) out[specIdx] = 'blover';
        else out[out.length - 1] = 'blover';
      }
    }

    // Special: PVZ 第 500 关（i=499）强制用三叶草替换一个“偏弱植物”
    // 规则：仅当该关目前不含 blover 时启用；优先替换非 prod（不破坏经济），并用 cost 最小作为弱项。
    if (i === TOTAL_LEVELS - 1 && up.includes('blover') && !out.includes('blover')) {
      const candidates = out.filter(k => k !== 'blover' && P[k] && P[k].k !== 'prod');
      const fallback = out.filter(k => k !== 'blover');
      const pool = candidates.length ? candidates : fallback;
      if (pool.length) {
        const weakest = pool.reduce((best, k) => {
          const cost = typeof P[k].cost === 'number' ? P[k].cost : 0;
          const bestCost = typeof P[best].cost === 'number' ? P[best].cost : 0;
          return cost < bestCost ? k : best;
        }, pool[0]);
        const idx = out.indexOf(weakest);
        if (idx >= 0) out[idx] = 'blover';
      }
    }
    return out.slice(0, cnt);
  }

  function buildWavesExpanded(i) {
    const post = i - BASE_LEVEL_COUNT;
    let unlock = 28 + Math.floor(post * .42);
    // Keep Level 1-500 zombie roster stable, then roll in the extra 40 zombies across 501-1000.
    if (i < PVZ_EXPANSION_START_INDEX) {
      unlock = Math.min(unlock, LEGACY_ZOMBIE_COUNT);
    } else {
      const extraTotal = Math.max(0, TARGET_ZOMBIE_COUNT - LEGACY_ZOMBIE_COUNT);
      const progress = Math.max(0, i - PVZ_EXPANSION_START_INDEX);
      const denom = Math.max(1, (TOTAL_LEVELS - 1) - PVZ_EXPANSION_START_INDEX);
      const extra = Math.floor((progress * extraTotal) / denom);
      unlock = Math.min(unlock, LEGACY_ZOMBIE_COUNT + extra);
    }
    unlock = Math.min(ZORDER.length, unlock);
    const up = ZORDER.slice(0, Math.max(BASE_ZOMBIE_ORDER.length, unlock));
    const rng = mkRng(12288 + i * 157);
    const total = Math.min(74, 24 + Math.floor(post * .24) + Math.floor(post / 18));
    const arr = [];
    let t = 2.4;
    for (let n = 0; n < total; n++) {
      const p = n / Math.max(1, total - 1);
      const tier = Math.max(6, Math.min(up.length, 8 + Math.floor(p * (up.length - 6))));
      const pool = up.slice(0, tier);
      const type = pick(pool, k => {
        const d = Z[k];
        const weight = 1 + (pool.indexOf(k) / Math.max(1, pool.length - 1)) * (.8 + post * .004);
        return weight / Math.max(.7, d.t * .72);
      }, rng);
      arr.push({ time: +t.toFixed(2), row: Math.floor(rng() * rows), type });
      if (n % 4 === 3) {
        const fastPool = pool.slice(Math.max(0, pool.length - 6));
        arr.push({ time: +(t + .26 + rng() * .2).toFixed(2), row: Math.floor(rng() * rows), type: fastPool[Math.floor(rng() * fastPool.length)] });
      }
      if (post > 80 && n % 6 === 5) {
        const elitePool = pool.slice(Math.max(0, pool.length - 4));
        arr.push({ time: +(t + .54 + rng() * .28).toFixed(2), row: Math.floor(rng() * rows), type: elitePool[Math.floor(rng() * elitePool.length)] });
      }
      if (post > 220 && n % 9 === 8 && rng() < .8) {
        const bossPool = pool.slice(Math.max(0, pool.length - 3));
        arr.push({ time: +(t + .82 + rng() * .36).toFixed(2), row: Math.floor(rng() * rows), type: bossPool[Math.floor(rng() * bossPool.length)] });
      }
      t += Math.max(.4, 1.46 - post * .0018) + rng() * .28;
      if (n % 5 === 4) t += .28 + rng() * .16;
    }
    return tightenWaveCadence(arr, { firstAt: 2.05, minGap: .14, headGap: 1.55, tailGap: .92 });
  }

  function buildPlants(i) {
    return i < BASE_LEVEL_COUNT ? buildPlantsLegacy(i) : buildPlantsExpanded(i);
  }

  function buildWaves(i) {
    return i < BASE_LEVEL_COUNT ? buildWavesLegacy(i) : buildWavesExpanded(i);
  }

  function zombieThreatScore(type) {
    const d = Z[type];
    if (!d) return 60;
    let score = d.hp * 0.16 + (d.arm || 0) * 0.22 + d.sp * 96 + d.dmg * 0.82 + d.t * 7.5;
    if (d.jump) score += 18;
    if (d.hide) score += 14;
    if (d.sum) score += 22;
    if (d.heal) score += 18;
    if (d.rep) score += 14;
    if (d.zap) score += 18;
    if (d.aura) score += 10;
    if (d.low) score += 26;
    if (d.g === 'garg') score += 36;
    if (d.g === 'football') score += 20;
    return score;
  }

  function computeStartSun(i, plants, waves, sky) {
    const plantDefs = plants.map(key => P[key]).filter(Boolean);
    const prod = plantDefs.filter(d => d.k === 'prod');
    const atk = plantDefs.filter(d => d.k === 'atk');
    const def = plantDefs.filter(d => d.k === 'def');
    const costs = plantDefs.map(d => d.cost || 0).sort((a, b) => a - b);
    const prodCosts = prod.map(d => d.cost || 0).sort((a, b) => a - b);
    const atkCosts = atk.map(d => d.cost || 0).sort((a, b) => a - b);
    const defCosts = def.map(d => d.cost || 0).sort((a, b) => a - b);
    const cheapest = costs[0] || 25;
    const firstProducer = prodCosts[0] || 0;
    const firstAttacker = atkCosts[0] || costs[0] || 50;
    const firstWall = defCosts[0] || 0;
    const openingBudget = Math.max(firstProducer ? firstProducer + firstAttacker : firstAttacker, cheapest * 2) + (firstWall ? Math.round(firstWall * 0.35) : 0);
    const earlyWindow = i < BASE_LEVEL_COUNT ? 18 + Math.min(6, i * 0.16) : 18 + Math.min(10, (i - BASE_LEVEL_COUNT) * 0.03);
    const earlyWaves = waves.filter(w => w.time <= earlyWindow);
    const openingWaves = earlyWaves.length ? earlyWaves : waves.slice(0, Math.min(8, waves.length));
    const avgThreat = openingWaves.length
      ? openingWaves.reduce((sum, wave) => sum + zombieThreatScore(wave.type), 0) / openingWaves.length
      : 0;
    const rowCounts = Array.from({ length: rows }, () => 0);
    openingWaves.forEach(wave => { rowCounts[wave.row] += 1; });
    const maxLanePressure = rowCounts.length ? Math.max(...rowCounts) : 0;
    const firstRush = waves.filter(w => w.time <= 9).length;
    const producerEase = prod.length ? Math.max(0, 24 - prod.length * 8) : 42;
    const skyRelief = clamp((6.8 - sky) * 14, 0, 58);
    const setupNeed = clamp(openingBudget * 0.62, 72, 170);
    const pressureNeed = clamp(avgThreat * 1.18 + maxLanePressure * 13 + firstRush * 6, 30, i < BASE_LEVEL_COUNT ? 160 : 205);
    const curveBias = i < BASE_LEVEL_COUNT ? i * 1.1 : 22 + Math.min(34, (i - BASE_LEVEL_COUNT) * 0.05);
    const deterministicJitter = ((i * 37) % 17) - 8;
    const minSun = i < BASE_LEVEL_COUNT ? 125 : 150;
    const maxSun = i < BASE_LEVEL_COUNT ? 305 : 390;
    return Math.round(clamp(setupNeed + pressureNeed + producerEase + curveBias - skyRelief + deterministicJitter, minSun, maxSun));
  }

  const LATE_THEME_ADJ = {
    'zh-CN': ['琉璃', '极光', '赤砂', '霜岚', '苍海', '曜金', '雷穹', '月影', '星潮'],
    'zh-TW': ['琉璃', '極光', '赤砂', '霜嵐', '蒼海', '曜金', '雷穹', '月影', '星潮'],
    en: ['Glass', 'Aurora', 'Crimson Sand', 'Frostwind', 'Azure Sea', 'Solar Gold', 'Thunder Sky', 'Moonshadow', 'Star Tide'],
    ja: ['瑠璃', '極光', '赤砂', '霜嵐', '蒼海', '耀金', '雷穹', '月影', '星潮'],
    ko: ['유리빛', '오로라', '적사', '서리바람', '창해', '요금', '뇌궁', '월영', '성조']
  };
  const LATE_THEME_NOUN = {
    'zh-CN': ['温室', '前庭', '屋顶', '花港', '苗圃'],
    'zh-TW': ['溫室', '前庭', '屋頂', '花港', '苗圃'],
    en: ['Greenhouse', 'Forecourt', 'Rooftop', 'Flower Harbor', 'Nursery'],
    ja: ['温室', '前庭', '屋上', '花港', '苗圃'],
    ko: ['온실', '전정', '옥상', '꽃항구', '묘포']
  };
  const lateThemeFamilyStops = [
    { sky: [142, 46, 18], mid: [118, 40, 28], ground: [96, 48, 22], glow: [48, 92, 64] },
    { sky: [205, 42, 16], mid: [228, 28, 26], ground: [28, 34, 24], glow: [14, 88, 62] },
    { sky: [216, 58, 18], mid: [196, 46, 28], ground: [22, 52, 24], glow: [34, 94, 66] },
    { sky: [188, 56, 16], mid: [176, 48, 24], ground: [154, 42, 22], glow: [196, 92, 72] },
    { sky: [268, 46, 16], mid: [312, 40, 28], ground: [28, 58, 22], glow: [56, 92, 66] }
  ];

  function shiftStop(stop, hueShift, lightShift) {
    const [h, s, l] = stop;
    return `hsl(${(h + hueShift + 360) % 360}deg ${s}% ${clamp(l + lightShift, 10, 82)}%)`;
  }

  function lateSceneName(bucket) {
    const locale = getPvzLocale();
    const adjectives = LATE_THEME_ADJ[locale] || LATE_THEME_ADJ.en || LATE_THEME_ADJ['zh-CN'];
    const nouns = LATE_THEME_NOUN[locale] || LATE_THEME_NOUN.en || LATE_THEME_NOUN['zh-CN'];
    const adjective = adjectives[bucket % adjectives.length] || '';
    const noun = nouns[Math.floor(bucket / adjectives.length) % nouns.length] || '';
    return `${adjective}${pvzJoiner(locale)}${noun}`.trim();
  }

  function lateBoardTheme(bucket) {
    const adjCount = (LATE_THEME_ADJ['zh-CN'] || LATE_THEME_ADJ.en || ['x']).length;
    const family = Math.floor(bucket / adjCount) % lateThemeFamilyStops.length;
    const variant = bucket % adjCount;
    const hueShift = variant * 9;
    const lightShift = ((bucket % 4) - 1.5) * 1.2;
    const stops = lateThemeFamilyStops[family];
    const sky = shiftStop(stops.sky, hueShift, lightShift - 2);
    const mid = shiftStop(stops.mid, hueShift * 0.65, lightShift - 1);
    const ground = shiftStop(stops.ground, hueShift * 0.4, lightShift - 2);
    return `linear-gradient(180deg, ${sky} 0%, ${mid} 54%, ${ground} 100%)`;
  }

  const ULTRA_BUCKET_START = Math.floor((PVZ_EXPANSION_START_INDEX - BASE_LEVEL_COUNT) / 10);
  const ULTRA_THEME_ADJ = {
    'zh-CN': ['星穹', '霓虹', '量子', '机甲', '深渊', '晶簇', '极夜', '风暴', '熔核', '幻境'],
    'zh-TW': ['星穹', '霓虹', '量子', '機甲', '深淵', '晶簇', '極夜', '風暴', '熔核', '幻境'],
    en: ['Starlit', 'Neon', 'Quantum', 'Mecha', 'Abyssal', 'Crystal', 'Midnight', 'Storm', 'Magma', 'Mirage'],
    ja: ['星穹', 'ネオン', '量子', '機甲', '深淵', '結晶', '極夜', '嵐', '熔核', '幻境'],
    ko: ['성궁', '네온', '양자', '메카', '심연', '크리스탈', '극야', '폭풍', '용핵', '환영']
  };
  const ULTRA_THEME_NOUN = {
    'zh-CN': ['实验庭', '列车站', '观测台', '炼金港', '异界林'],
    'zh-TW': ['實驗庭', '列車站', '觀測台', '鍊金港', '異界林'],
    en: ['Lab Garden', 'Rail Depot', 'Observatory', 'Alchemy Port', 'Otherworld Grove'],
    ja: ['実験庭', '列車基地', '観測台', '錬金港', '異界の森'],
    ko: ['실험정원', '열차기지', '관측대', '연금항', '이계숲']
  };
  const ultraThemeFamilyStops = [
    { sky: [220, 56, 18], mid: [198, 54, 20], ground: [154, 58, 18] },
    { sky: [320, 62, 18], mid: [280, 54, 20], ground: [190, 60, 18] },
    { sky: [176, 52, 18], mid: [150, 48, 20], ground: [108, 56, 18] },
    { sky: [28, 76, 18], mid: [16, 64, 20], ground: [6, 58, 18] },
    { sky: [268, 46, 18], mid: [238, 42, 20], ground: [210, 40, 18] },
    { sky: [206, 46, 20], mid: [186, 44, 22], ground: [160, 48, 18] },
    { sky: [34, 40, 18], mid: [212, 42, 18], ground: [140, 46, 18] }
  ];
  function ultraSceneName(bucket) {
    const locale = getPvzLocale();
    const adjectives = ULTRA_THEME_ADJ[locale] || ULTRA_THEME_ADJ.en || ULTRA_THEME_ADJ['zh-CN'];
    const nouns = ULTRA_THEME_NOUN[locale] || ULTRA_THEME_NOUN.en || ULTRA_THEME_NOUN['zh-CN'];
    const adjective = adjectives[bucket % adjectives.length] || '';
    const noun = nouns[Math.floor(bucket / adjectives.length) % nouns.length] || '';
    return `${adjective}${pvzJoiner(locale)}${noun}`.trim();
  }
  function ultraBoardTheme(bucket) {
    const adjCount = (ULTRA_THEME_ADJ['zh-CN'] || ULTRA_THEME_ADJ.en || ['x']).length;
    const family = Math.floor(bucket / adjCount) % ultraThemeFamilyStops.length;
    const variant = bucket % adjCount;
    const hueShift = variant * 12;
    const lightShift = ((bucket % 4) - 1.5) * 1.1;
    const stops = ultraThemeFamilyStops[family];
    const sky = shiftStop(stops.sky, hueShift, lightShift - 2);
    const mid = shiftStop(stops.mid, hueShift * 0.7, lightShift - 1);
    const ground = shiftStop(stops.ground, hueShift * 0.45, lightShift - 2);
    return `linear-gradient(180deg, ${sky} 0%, ${mid} 54%, ${ground} 100%)`;
  }

  function sceneNameByBucket(lateBucket) {
    if (lateBucket < ULTRA_BUCKET_START) return lateSceneName(lateBucket);
    return ultraSceneName(lateBucket - ULTRA_BUCKET_START);
  }
  function boardThemeByBucket(lateBucket) {
    if (lateBucket < ULTRA_BUCKET_START) return lateBoardTheme(lateBucket);
    return ultraBoardTheme(lateBucket - ULTRA_BUCKET_START);
  }

  function levelName(i) {
    if (i < BASE_LEVEL_COUNT) return formatPvzLevelName(i, themes[Math.floor(i / 5)]);
    return formatPvzLevelName(i, sceneNameByBucket(Math.floor((i - BASE_LEVEL_COUNT) / 10)));
  }

  const levels = Array.from({ length: TOTAL_LEVELS }, (_, i) => {
    const plants = buildPlants(i);
    const waves = buildWaves(i);
    if (i < BASE_LEVEL_COUNT) {
      const sky = Math.max(4.1, 7.2 - i * .05);
      const theme = Math.floor(i / 5);
      const name = formatPvzLevelName(i, themes[theme]);
      return { id: i + 1, name, theme, boardBg: boardThemes[theme % boardThemes.length], startSun: computeStartSun(i, plants, waves, sky), lives: i >= 20 ? 6 : 5, sky, plants, waves, seed: 8800 + i * 1337 };
    }
    const post = i - BASE_LEVEL_COUNT;
    const sky = Math.max(2.2, 5.9 - post * .0045);
    const lateBucket = Math.floor(post / 10);
    const name = formatPvzLevelName(i, sceneNameByBucket(lateBucket));
    return {
      id: i + 1,
      name,
      theme: 10 + lateBucket,
      boardBg: boardThemeByBucket(lateBucket),
      startSun: computeStartSun(i, plants, waves, sky),
      lives: Math.min(9, 6 + Math.floor(post / 140)),
      sky,
      plants,
      waves,
      seed: 8800 + i * 1337
    };
  });
  function readSavedLevelIndex() {
    try {
      const raw = Number(window.localStorage.getItem(LEVEL_STORAGE_KEY) || '1');
      if (Number.isFinite(raw)) return clamp(Math.floor(raw) - 1, 0, levels.length - 1);
    } catch (_) {}
    return 0;
  }
  function persistLevelIndex(index) {
    try {
      window.localStorage.setItem(LEVEL_STORAGE_KEY, String(clamp(index, 0, levels.length - 1) + 1));
    } catch (_) {}
  }
  const status = t => { statusEl.textContent = t || ''; };
  const metric = () => { const r = boardWrapEl.getBoundingClientRect(); return { w: Math.max(1, r.width - inset * 2) / cols, h: Math.max(1, r.height - inset * 2) / rows }; };

  function overlay() {
    if (resultOverlay) return resultOverlay;
    root.style.position = 'relative';
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(6,16,11,.56);backdrop-filter:blur(6px);z-index:60;';
    const panel = document.createElement('div');
    panel.style.cssText = 'width:min(480px,100%);padding:30px 24px 22px;border-radius:22px;border:1px solid rgba(255,255,255,.16);background:linear-gradient(180deg,rgba(17,32,22,.98),rgba(20,56,31,.94));box-shadow:0 24px 60px rgba(0,0,0,.38);text-align:center;';
    panel.innerHTML = `<div data-r='t' style='font-size:34px;font-weight:800;line-height:1.15;color:#f8fafc;margin-bottom:10px;'></div><div data-r='d' style='font-size:15px;line-height:1.7;color:rgba(248,250,252,.84);margin-bottom:18px;'></div><button type='button' data-r='b' class='start-footer-btn' style='min-width:170px;font-size:15px;font-weight:700;'>${T.cont}</button>`;
    el.appendChild(panel); root.appendChild(el);
    resultOverlay = { el, t: panel.querySelector("[data-r='t']"), d: panel.querySelector("[data-r='d']"), b: panel.querySelector("[data-r='b']"), a: null };
    resultOverlay.b.addEventListener('click', () => { if (typeof resultOverlay.a === 'function') resultOverlay.a(); });
    return resultOverlay;
  }
  const showOverlay = (t, d, b, a) => { if (!state || (!state.won && !state.lost)) return; const o = overlay(); o.t.textContent = t; o.d.textContent = d; o.b.textContent = b || T.cont; o.a = typeof a === 'function' ? a : null; o.el.style.display = 'flex'; };
  const hideOverlay = () => { if (!resultOverlay) return; resultOverlay.el.style.display = 'none'; resultOverlay.a = null; };

  function ensureSelector() {
    if (levelSelectEl && levelSelectEl.isConnected) return levelSelectEl;
    const host = startBtn.parentElement; if (!host) return null;
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;align-items:center;gap:8px;color:#f8fafc;font-size:12px;';
    const sp = document.createElement('span'); sp.textContent = T.sel;
    const sel = document.createElement('select');
    sel.className = 'settings-input';
    sel.style.cssText = 'height:34px;min-width:168px;padding:0 34px 0 10px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(15,23,42,.58);color:#f8fafc;color-scheme:dark;';
    levels.forEach((lv, i) => { const op = document.createElement('option'); op.value = String(i); op.textContent = `${i + 1}. ${lv.name}`; op.style.backgroundColor = '#102015'; op.style.color = '#f8fafc'; sel.appendChild(op); });
    sel.addEventListener('change', () => { const n = Number(sel.value); if (Number.isInteger(n)) resetLevel(n); });
    label.appendChild(sp); label.appendChild(sel); host.insertBefore(label, resetBtn); levelSelectEl = sel; return sel;
  }

  function buildGrid() {
    if (gridCells.length) return;
    gridEl.innerHTML = '';
    for (let r = 0; r < rows; r++) {
      gridCells[r] = [];
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.style.cssText = `border:1px solid rgba(255,255,255,.08);border-radius:16px;background:${r % 2 === 0 ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.09)'};padding:0;display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer;overflow:hidden;touch-action:manipulation;`;
        cell.addEventListener('pointerdown', e => { e.preventDefault(); placePlant(r, c); }, { passive: false });
        gridCells[r][c] = cell; gridEl.appendChild(cell);
      }
    }
  }

  function sunSvg(size) { return `<svg viewBox='0 0 72 72' width='${size}' height='${size}'><g>${Array.from({ length: 12 }, (_, i) => `<rect x='34' y='2' width='4' height='15' rx='2' fill='#fde047' transform='rotate(${i * 30} 36 36)'/>`).join('')}<circle cx='36' cy='36' r='18' fill='#facc15'/><circle cx='29' cy='29' r='5' fill='rgba(255,255,255,.22)'/></g></svg>`; }

  function flowerHeadSvg(cx, cy, petalColor, centerColor, scale, extraGlow) {
    const petals = Array.from({ length: 12 }, (_, i) => {
      const angle = i * 30;
      const rx = +(7 * scale).toFixed(2);
      const ry = +(13 * scale).toFixed(2);
      const px = +(cx - rx).toFixed(2);
      const py = +(cy - ry - 9 * scale).toFixed(2);
      return `<ellipse cx='${cx}' cy='${cy - 9 * scale}' rx='${rx}' ry='${ry}' fill='${petalColor}' transform='rotate(${angle} ${cx} ${cy})'/>`;
    }).join('');
    const seedDots = Array.from({ length: 8 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 8;
      const radius = 5.2 * scale;
      const x = +(cx + Math.cos(angle) * radius).toFixed(2);
      const y = +(cy + Math.sin(angle) * radius).toFixed(2);
      const r = +(1.1 * scale).toFixed(2);
      return `<circle cx='${x}' cy='${y}' r='${r}' fill='rgba(120,53,15,.55)'/>`;
    }).join('');
    return `<g>${extraGlow ? `<circle cx='${cx}' cy='${cy}' r='${+(20 * scale).toFixed(2)}' fill='rgba(255,255,255,.14)'/>` : ''}${petals}<circle cx='${cx}' cy='${cy}' r='${+(10.8 * scale).toFixed(2)}' fill='${centerColor}'/><circle cx='${+(cx - 2.2 * scale).toFixed(2)}' cy='${+(cy - 2.4 * scale).toFixed(2)}' r='${+(4.8 * scale).toFixed(2)}' fill='rgba(255,255,255,.14)'/>${seedDots}</g>`;
  }

  function marigoldHeadSvg(cx, cy, bloomColor, stemColor, scale) {
    const outerPetals = Array.from({ length: 16 }, (_, i) => {
      const angle = i * 22.5;
      const rx = +(6.2 * scale).toFixed(2);
      const ry = +(12.8 * scale).toFixed(2);
      return `<ellipse cx='${cx}' cy='${cy - 9.5 * scale}' rx='${rx}' ry='${ry}' fill='${bloomColor}' transform='rotate(${angle} ${cx} ${cy})'/>`;
    }).join('');
    const innerPetals = Array.from({ length: 12 }, (_, i) => {
      const angle = 15 + i * 30;
      const rx = +(4.6 * scale).toFixed(2);
      const ry = +(9.2 * scale).toFixed(2);
      return `<ellipse cx='${cx}' cy='${cy - 5.2 * scale}' rx='${rx}' ry='${ry}' fill='#fde68a' opacity='.78' transform='rotate(${angle} ${cx} ${cy})'/>`;
    }).join('');
    const folds = Array.from({ length: 8 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 8;
      const radius = 5.8 * scale;
      const x = +(cx + Math.cos(angle) * radius).toFixed(2);
      const y = +(cy + Math.sin(angle) * radius).toFixed(2);
      return `<circle cx='${x}' cy='${y}' r='${+(1.35 * scale).toFixed(2)}' fill='rgba(146,64,14,.3)'/>`;
    }).join('');
    return `<g><circle cx='${cx}' cy='${cy}' r='${+(22 * scale).toFixed(2)}' fill='rgba(251,191,36,.14)'/>${outerPetals}${innerPetals}<circle cx='${cx}' cy='${cy}' r='${+(11.5 * scale).toFixed(2)}' fill='#b45309'/><circle cx='${cx}' cy='${cy}' r='${+(8.2 * scale).toFixed(2)}' fill='#f59e0b'/>${folds}<path d='M${(cx - 9 * scale).toFixed(2)} ${(cy + 8 * scale).toFixed(2)}c${(4.5 * scale).toFixed(2)} ${(5 * scale).toFixed(2)} ${(13 * scale).toFixed(2)} ${(5 * scale).toFixed(2)} ${(18 * scale).toFixed(2)} 0' fill='none' stroke='rgba(255,255,255,.24)' stroke-width='${+(1.8 * scale).toFixed(2)}' stroke-linecap='round'/><path d='M${(cx - 4 * scale).toFixed(2)} ${(cy + 12 * scale).toFixed(2)}c0 ${(6.5 * scale).toFixed(2)} ${(-2.5 * scale).toFixed(2)} ${(10 * scale).toFixed(2)} ${(-7.5 * scale).toFixed(2)} ${(13.5 * scale).toFixed(2)}' fill='none' stroke='${stemColor}' stroke-width='${+(3.4 * scale).toFixed(2)}' stroke-linecap='round'/><path d='M${(cx + 3 * scale).toFixed(2)} ${(cy + 12 * scale).toFixed(2)}c${(1.4 * scale).toFixed(2)} ${(5.2 * scale).toFixed(2)} ${(4.4 * scale).toFixed(2)} ${(8.8 * scale).toFixed(2)} ${(10.5 * scale).toFixed(2)} ${(11.6 * scale).toFixed(2)}' fill='none' stroke='${stemColor}' stroke-width='${+(3.2 * scale).toFixed(2)}' stroke-linecap='round'/></g>`;
  }

  function flowerStemSvg(stemColor) {
    return `<g><path d='M48 86V53' stroke='${stemColor}' stroke-width='8' stroke-linecap='round'/><path d='M47 86V53' stroke='rgba(255,255,255,.18)' stroke-width='2' stroke-linecap='round'/><ellipse cx='32' cy='61' rx='10' ry='18' fill='${stemColor}' transform='rotate(-38 32 61)'/><ellipse cx='63' cy='58' rx='10' ry='19' fill='${stemColor}' transform='rotate(34 63 58)'/><path d='M44 66c-8-1-13 3-16 10' fill='none' stroke='rgba(255,255,255,.16)' stroke-width='2.2' stroke-linecap='round'/><path d='M52 63c8-2 13 2 17 9' fill='none' stroke='rgba(255,255,255,.16)' stroke-width='2.2' stroke-linecap='round'/></g>`;
  }

  function plantSvg(plant, size, ghost) {
    const d = P[plant.type || plant]; if (!d) return ''; const op = ghost ? .22 : 1;
    if (d.f === 'flower') {
      if (d.gold) {
        return `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'>${flowerStemSvg(d.c2)}${marigoldHeadSvg(48, 34, d.c, d.c2, 1)}</svg>`;
      }
      const heads = d.twin
        ? `${flowerHeadSvg(35, 33, d.c, '#6b3f10', 0.88, d.gold)}${flowerHeadSvg(60, 34, d.c, '#6b3f10', 0.8, d.gold)}`
        : flowerHeadSvg(48, 33, d.c, '#6b3f10', 1, d.gold);
      return `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'>${flowerStemSvg(d.c2)}${heads}</svg>`;
    }
    if (d.f === 'bud') return `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'>${flowerStemSvg(d.c2)}<g><path d='M48 23c10 0 18 8 18 18 0 11-8 19-18 19s-18-8-18-19c0-10 8-18 18-18z' fill='${d.c}'/><path d='M48 18c9 0 16 5 18 13-5-2-9-2-13 1-3-4-8-5-15-4 2-6 6-10 10-10z' fill='rgba(255,255,255,.2)'/><path d='M37 44c4-6 10-9 18-9 6 0 11 2 15 7-4 8-12 13-22 13-5 0-9-4-11-11z' fill='rgba(120,53,15,.16)'/></g></svg>`;
    if (d.f === 'pea') return `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'><path d='M38 86V46' stroke='${d.c}' stroke-width='8' stroke-linecap='round'/><ellipse cx='26' cy='62' rx='9' ry='18' fill='${d.c}' transform='rotate(-38 26 62)'/><ellipse cx='48' cy='56' rx='8' ry='16' fill='${d.c}' transform='rotate(42 48 56)'/>${d.four ? `<circle cx='58' cy='30' r='12' fill='${d.c}'/><circle cx='70' cy='24' r='10' fill='${d.c}'/><circle cx='70' cy='36' r='10' fill='${d.c}'/><circle cx='81' cy='30' r='9' fill='${d.c}'/>` : d.two || d.split ? `<circle cx='57' cy='30' r='13' fill='${d.c}'/><circle cx='74' cy='29' r='11' fill='${d.c}'/>` : `<circle cx='64' cy='30' r='15' fill='${d.c}'/>`}<circle cx='79' cy='30' r='7' fill='${d.c2}'/></svg>`;
    if (d.f === 'beam') return `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'><path d='M47 84V56' stroke='${d.c}' stroke-width='8' stroke-linecap='round'/><path d='M33 25l15-9 17 5 6 16-8 15-18 8-15-8-4-15 7-12z' fill='${d.c}'/><path d='M38 39h25' stroke='#ecfeff' stroke-width='4' stroke-linecap='round'/><path d='M63 39h17' stroke='${d.c2}' stroke-width='8' stroke-linecap='round' opacity='.8'/></svg>`;
    if (d.f === 'lob') return `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'><path d='M48 86V58' stroke='${d.c2}' stroke-width='8' stroke-linecap='round'/><ellipse cx='32' cy='69' rx='11' ry='18' fill='${d.c2}' transform='rotate(-34 32 69)'/><ellipse cx='61' cy='64' rx='10' ry='17' fill='${d.c2}' transform='rotate(38 61 64)'/><path d='M30 58c8-10 17-15 32-15' fill='none' stroke='${d.c2}' stroke-width='8' stroke-linecap='round'/><ellipse cx='57' cy='29' rx='18' ry='16' fill='${d.c}'/></svg>`;
    if (d.f === 'cactus') return `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'><rect x='33' y='22' width='30' height='50' rx='15' fill='${d.c}'/><rect x='22' y='34' width='14' height='26' rx='7' fill='${d.c}'/><rect x='60' y='38' width='14' height='24' rx='7' fill='${d.c}'/><circle cx='48' cy='15' r='6' fill='${d.c3}'/></svg>`;
    if (d.f === 'wall' || d.f === 'pumpkin') { const bad = plant.hp < P[plant.type].hp * .45; return `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'>${d.f === 'pumpkin' ? `<path d='M22 52c0-22 13-35 26-35 14 0 26 13 26 35 0 18-9 26-26 26-16 0-26-8-26-26z' fill='${d.c}'/>` : `<rect x='24' y='18' width='48' height='58' rx='22' fill='${d.c}'/>`}<circle cx='40' cy='40' r='3.6' fill='${d.c2}'/><circle cx='56' cy='40' r='3.6' fill='${d.c2}'/><path d='M40 56c4 4 12 4 16 0' fill='none' stroke='${d.c2}' stroke-width='3' stroke-linecap='round'/>${bad ? `<path d='M48 35l-6 8 8 8-7 10' fill='none' stroke='${d.c2}' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/>` : ''}</svg>`; }
    if (d.f === 'bomb' || d.f === 'pepper') return d.f === 'pepper' ? `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'><path d='M52 14c0 6 3 9 9 11-6 3-11 1-16-4-4 5-9 7-14 6 4-5 7-9 8-13 5 2 9 2 13 0z' fill='${d.c2}'/><path d='M30 24c11-4 24 0 31 8 8 9 10 20 6 32-4 12-14 21-28 24-10 2-18-2-21-12-3-10 1-20 9-28 7-7 5-16 3-24z' fill='${d.c}'/></svg>` : `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'><circle cx='36' cy='52' r='18' fill='${d.c}'/><circle cx='58' cy='52' r='18' fill='${d.c}'/><path d='M46 36C42 24 36 19 28 17' fill='none' stroke='${d.c2}' stroke-width='6' stroke-linecap='round'/></svg>`;
    if (d.f === 'mush') return `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'><path d='M18 44c0-16 14-26 30-26 17 0 30 10 30 26 0 6-3 9-11 9H29c-8 0-11-3-11-9z' fill='${d.c}'/><rect x='39' y='48' width='18' height='26' rx='8' fill='${d.c2}'/></svg>`;
    if (d.f === 'mine') return `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'><ellipse cx='48' cy='72' rx='28' ry='9' fill='rgba(15,23,42,.22)'/><path d='M24 68c6-20 18-34 24-34s18 14 24 34' fill='${d.c}'/><path d='M36 45c-6-8-11-13-17-16M60 45c6-8 11-13 17-16' fill='none' stroke='${d.c2}' stroke-width='6' stroke-linecap='round'/></svg>`;
    if (d.f === 'spikes') return `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'><path d='M22 72l10-22 7 22 9-26 10 26 8-20 10 20' fill='none' stroke='${d.c2}' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'/><path d='M20 76h56' stroke='${d.c}' stroke-width='8' stroke-linecap='round'/></svg>`;
    if (d.f === 'chomper') return `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'><path d='M44 84V58' stroke='${d.c3}' stroke-width='8' stroke-linecap='round'/><path d='M25 42c0-13 10-23 23-23 15 0 28 10 28 25 0 15-13 23-31 23-14 0-20-9-20-25z' fill='${d.c}'/><path d='M32 48c12-10 22-12 39-7-6 10-18 15-37 15' fill='${d.c2}'/></svg>`;
    if (d.f === 'blover') return `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'><path d='M48 86V58' stroke='${d.c2}' stroke-width='8' stroke-linecap='round'/><path d='M48 54c-16 0-24-8-24-19 0-9 6-15 16-15 7 0 12 3 15 10 2-8 8-13 16-13 10 0 17 7 17 17 0 11-8 18-22 18 1 7 6 12 14 14-10 3-18 1-24-6-3 6-7 10-14 11 4-6 6-11 6-17z' fill='${d.c}'/></svg>`;
    if (d.f === 'squash') return `<svg viewBox='0 0 96 96' width='${size}' height='${size}' style='opacity:${op};'><path d='M24 52c0-16 12-24 24-24 15 0 28 8 28 24 0 14-11 22-26 22S24 66 24 52z' fill='${d.c}'/></svg>`;
    return '';
  }

  function shotSvg(p, size) {
    if (p.style === 'ice') return `<svg viewBox='0 0 32 32' width='${size}' height='${size}'><circle cx='16' cy='16' r='9' fill='#7dd3fc'/></svg>`;
    if (p.style === 'fire') return `<svg viewBox='0 0 32 32' width='${size}' height='${size}'><path d='M16 5c5 5 8 8 8 13a8 8 0 1 1-16 0c0-3 2-6 8-13z' fill='#fb923c'/></svg>`;
    if (p.style === 'spike') return `<svg viewBox='0 0 32 32' width='${size}' height='${size}'><path d='M6 26l10-20 10 20' fill='#166534'/></svg>`;
    if (p.style === 'cabbage') return `<svg viewBox='0 0 32 32' width='${size}' height='${size}'><circle cx='16' cy='16' r='9' fill='#84cc16'/></svg>`;
    if (p.style === 'melon') return `<svg viewBox='0 0 32 32' width='${size}' height='${size}'><circle cx='16' cy='16' r='10' fill='#f43f5e'/></svg>`;
    if (p.style === 'kernel') return `<svg viewBox='0 0 32 32' width='${size}' height='${size}'><ellipse cx='16' cy='16' rx='8' ry='10' fill='#facc15'/></svg>`;
    if (p.style === 'butter') return `<svg viewBox='0 0 32 32' width='${size}' height='${size}'><rect x='7' y='10' width='18' height='12' rx='4' fill='#fde68a'/></svg>`;
    return `<svg viewBox='0 0 32 32' width='${size}' height='${size}'><circle cx='16' cy='16' r='9' fill='#4ade80'/></svg>`;
  }

  const gear = {
    flag:`<path d='M54 10v34' stroke='#f8fafc' stroke-width='3' stroke-linecap='round'/><path d='M54 12h17l-5 6 5 6H54z' fill='#ef4444'/>`, cone:`<path d='M40 6l18 26H22z' fill='#fb923c'/>`, bucket:`<path d='M24 8h28l-4 16H28z' fill='#cbd5e1'/>`,
    screen:`<rect x='8' y='34' width='18' height='24' rx='4' fill='#f8fafc' stroke='#64748b' stroke-width='2'/>`, barrel:`<rect x='18' y='33' width='18' height='24' rx='5' fill='#a16207'/>`, miner:`<path d='M20 14c0-7 6-11 14-11s14 4 14 11' fill='#f59e0b'/>`,
    pogo:`<path d='M17 66l14-32 14 32' fill='none' stroke='#ef4444' stroke-width='4' stroke-linecap='round'/>`, knight:`<path d='M18 10h28v16H18z' fill='#94a3b8'/>`, doctor:`<circle cx='18' cy='48' r='8' fill='#f8fafc'/>`,
    jester:`<path d='M18 16c6-10 15-12 24-5-6 0-9 3-12 8-3-5-6-8-12-3z' fill='#f472b6'/>`, dancer:`<path d='M20 12c8-5 18-5 26 0' fill='none' stroke='#f472b6' stroke-width='5' stroke-linecap='round'/>`, football:`<path d='M16 16c0-9 8-15 18-15 9 0 18 6 18 15v12H16z' fill='#ef4444'/>`,
    garg:`<path d='M8 64l12-36 18 8-12 36' fill='#7c2d12'/>`, imp:`<path d='M22 8l5 8M35 8l-5 8' stroke='#ef4444' stroke-width='3' stroke-linecap='round'/>`, scuba:`<circle cx='34' cy='20' r='9' fill='none' stroke='#38bdf8' stroke-width='4'/>`,
    news:`<rect x='10' y='36' width='24' height='18' rx='3' fill='#f8fafc' stroke='#94a3af' stroke-width='2'/>`, torch:`<path d='M49 36l11 20' stroke='#7c2d12' stroke-width='4' stroke-linecap='round'/><path d='M60 47c5 5 6 10 2 14-7-2-10-7-9-13 2-5 4-8 7-11z' fill='#fb923c'/>`,
    ice:`<path d='M18 12c7-5 16-5 24 0' fill='none' stroke='#7dd3fc' stroke-width='6' stroke-linecap='round'/>`, duck:`<path d='M18 52c6-7 14-10 22-8 4 1 7 4 7 8 0 5-5 9-12 9-7 0-13-3-17-9z' fill='#fde68a'/>`,
    ladder:`<path d='M10 30v34M22 30v34M10 38h12M10 48h12M10 58h12' stroke='#ca8a04' stroke-width='3' stroke-linecap='round'/>`, drum:`<ellipse cx='18' cy='49' rx='10' ry='13' fill='#f59e0b'/>`,
    wizard:`<path d='M18 16l12-12 12 12H18z' fill='#7c3aed'/>`, mech:`<path d='M16 16l8 8M22 10l9 9' stroke='#60a5fa' stroke-width='4' stroke-linecap='round'/>`, punk:`<path d='M17 16l4-10 5 10 5-12 5 12 4-9' stroke='#ec4899' stroke-width='4' stroke-linecap='round'/>`,
    captain:`<path d='M18 14c7-6 18-6 26 0v8H18z' fill='#facc15'/>`, mummy:`<path d='M20 12h28M18 20h24M22 28h26' stroke='#f5f5f4' stroke-width='5' stroke-linecap='round'/>`,

    // Extra gear for the 501-1000 expansion zombie roster.
    visor:`<rect x='22' y='18' width='28' height='10' rx='5' fill='rgba(148,163,184,.95)'/><rect x='24' y='20' width='24' height='6' rx='3' fill='rgba(15,23,42,.35)'/>`,
    helm:`<path d='M20 26c0-10 7-18 16-18s16 8 16 18v2H20z' fill='rgba(226,232,240,.92)'/><path d='M22 26h28' stroke='rgba(100,116,139,.8)' stroke-width='3' stroke-linecap='round'/>`,
    horn:`<path d='M22 18c-7-2-10-8-8-14 7 2 11 6 10 12' fill='rgba(244,114,182,.95)'/><path d='M50 18c7-2 10-8 8-14-7 2-11 6-10 12' fill='rgba(244,114,182,.95)'/>`,
    jet:`<path d='M22 44l-10 10' stroke='rgba(59,130,246,.9)' stroke-width='4' stroke-linecap='round'/><path d='M50 44l10 10' stroke='rgba(59,130,246,.9)' stroke-width='4' stroke-linecap='round'/><circle cx='18' cy='48' r='3' fill='rgba(56,189,248,.95)'/><circle cx='54' cy='48' r='3' fill='rgba(56,189,248,.95)'/>`,
    shaman:`<path d='M36 8l6 8-6 8-6-8z' fill='rgba(196,181,253,.95)'/><path d='M26 18h20' stroke='rgba(196,181,253,.75)' stroke-width='3' stroke-linecap='round'/>`,
    glitch:`<path d='M18 14h16v6H24v6h16v6H18z' fill='rgba(251,113,133,.9)' opacity='.9'/>`,
    crystal:`<path d='M36 6l10 16-10 16-10-16z' fill='rgba(167,243,208,.92)'/><path d='M26 22h20' stroke='rgba(15,23,42,.24)' stroke-width='3' stroke-linecap='round'/>`,
    toxic:`<path d='M36 10l10 8-4 12H30l-4-12z' fill='rgba(34,197,94,.92)'/><circle cx='36' cy='20' r='3.2' fill='rgba(15,23,42,.35)'/>`,
    phantom:`<path d='M22 22c5-10 10-14 14-14 6 0 12 6 14 16-6-4-10-4-14 1-5-6-9-7-14-3z' fill='rgba(226,232,240,.6)'/>`,
    crown:`<path d='M20 18l8 10 8-12 8 12 8-10v14H20z' fill='rgba(250,204,21,.95)'/><path d='M20 32h32' stroke='rgba(124,45,18,.35)' stroke-width='3' stroke-linecap='round'/>`
  };

  function zombieSvg(z, size) {
    const d = Z[z.type];
    if (z.hidden && d.hide) return `<svg viewBox='0 0 72 72' width='${size}' height='${size}'><ellipse cx='36' cy='52' rx='22' ry='9' fill='#7c5a36'/><path d='M18 52c10-12 26-12 36 0' fill='none' stroke='#a16207' stroke-width='5' stroke-linecap='round'/>${d.g === 'miner' ? `<circle cx='48' cy='33' r='6' fill='#f59e0b'/>` : ''}</svg>`;
    const sc = d.sc || 1;
    return `<svg viewBox='0 0 72 96' width='${size}' height='${size}' style='transform:scale(${sc});transform-origin:center bottom;opacity:${z.hidden ? .68 : 1};'>${gear[d.g] || ''}<circle cx='36' cy='24' r='14' fill='#cbd5e1'/><circle cx='31' cy='23' r='2.8' fill='#0f172a'/><circle cx='40' cy='24' r='2.8' fill='#0f172a'/><path d='M29 32h14' stroke='#475569' stroke-width='3' stroke-linecap='round'/><rect x='24' y='38' width='24' height='24' rx='10' fill='${d.c}'/><path d='M24 48l-12 12M48 48l12 12' stroke='${d.c}' stroke-width='6' stroke-linecap='round'/><path d='M29 61l-6 22M43 61l6 22' stroke='#cbd5e1' stroke-width='6' stroke-linecap='round'/></svg>`;
  }
  function createState(i) {
    const lv = levels[i];
    if (!lv.plants.includes(selectedPlantKey)) selectedPlantKey = null;
    return { run: false, won: false, lost: false, lv, rng: mkRng(lv.seed), sun: lv.startSun, lives: lv.lives, time: 0, sky: lv.sky * .75, wi: 0, plants: [], zombies: [], shots: [], suns: [], fx: [], grid: Array.from({ length: rows }, () => Array(cols).fill(null)) };
  }
  const roll = () => state && state.rng ? state.rng() : Math.random();
  const setFx = (kind, obj) => state.fx.push(Object.assign({ id: uid('fx'), kind, life: .3, max: .3 }, obj));
  const mt = () => { const m = metric(); return { cw: m.w, ch: m.h }; };

  function renderHud() {
    sunEl.textContent = String(Math.max(0, Math.floor(state.sun)));
    levelEl.textContent = `${levelIndex + 1} / ${levels.length}`;
    livesEl.textContent = String(state.lives);
    const tone = state.won ? 'good' : state.lost ? 'bad' : state.run ? 'warn' : 'wait';
    stateEl.textContent = state.won ? t('pvzWin') : state.lost ? t('pvzLose') : state.run ? t('pvzRunning') : t('pvzWaiting');
    stateEl.style.background = tone === 'bad' ? 'rgba(248,113,113,.18)' : tone === 'warn' ? 'rgba(250,204,21,.16)' : 'rgba(74,222,128,.18)';
    stateEl.style.color = tone === 'bad' ? '#fca5a5' : tone === 'warn' ? '#fde68a' : '#86efac';
    boardWrapEl.style.background = state.lv.boardBg || boardThemes[state.lv.theme % boardThemes.length];
    const sel = ensureSelector(); if (sel) sel.value = String(levelIndex);
    if (state.won) showOverlay(
      levelIndex === levels.length - 1 ? T.allWin : T.stageWin,
      levelIndex === levels.length - 1 ? T.allText : T.stageText,
      levelIndex === levels.length - 1 ? T.replay : T.next,
      () => resetLevel(levelIndex === levels.length - 1 ? 0 : (levelIndex + 1))
    );
    else if (state.lost) showOverlay(T.lose, T.loseText, T.retry, () => resetLevel(levelIndex)); else hideOverlay();
  }

  function renderBar() {
    plantBarEl.innerHTML = '';
    state.lv.plants.forEach(k => {
      const d = P[k];
      const text = getPlantText(k);
      const b = document.createElement('button');
      b.type = 'button';
      b.style.cssText = `display:grid;grid-template-columns:64px 1fr auto;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;color:#f8fafc;cursor:pointer;min-width:218px;opacity:${state.sun >= d.cost ? 1 : .72};transition:border-color .16s ease,box-shadow .16s ease,background .16s ease;`;
      const applyStyle = hover => {
        const active = selectedPlantKey === k;
        b.style.border = active ? '2px solid rgba(253,224,71,.92)' : hover ? '1px solid rgba(253,224,71,.72)' : '1px solid rgba(255,255,255,.14)';
        b.style.background = active ? 'rgba(250,204,21,.18)' : hover ? 'rgba(250,204,21,.12)' : 'rgba(15,23,42,.34)';
        b.style.boxShadow = active || hover ? '0 0 0 1px rgba(250,204,21,.12) inset, 0 0 20px rgba(250,204,21,.08)' : 'none';
      };
      applyStyle(false);
      b.innerHTML = `<div style='width:58px;height:58px;display:flex;align-items:center;justify-content:center;border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.03));'>${plantSvg({ type: k, hp: d.hp }, 54, false)}</div><div style='text-align:left;'><div style='font-size:14px;font-weight:700;line-height:1.2;'>${text.name}</div><div style='font-size:12px;color:rgba(248,250,252,.72);line-height:1.35;'>${text.desc}</div></div><div style='font-size:14px;font-weight:700;color:#fde047;'>${d.cost}</div>`;
      b.onmouseenter = () => applyStyle(true);
      b.onmouseleave = () => applyStyle(false);
      b.onclick = () => { selectedPlantKey = k; renderBar(); renderGrid(); status(T.selPlant(text.name)); };
      plantBarEl.appendChild(b);
    });
  }

  function badge(p) { if (p.type === 'potatomine') return p.armed ? t('pvzBadgeArmed') : t('pvzBadgeLoading'); if (p.type === 'chomper' && p.chew > 0) return t('pvzBadgeChewing'); if (p.type === 'goldbloom') return t('pvzBadgeCharging'); if (p.stun > 0) return t('pvzBadgeFrozen'); return ''; }

  function renderGrid() {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cell = gridCells[r][c], p = state.grid[r][c];
      cell.style.outline = selectedPlantKey && !p ? '1px dashed rgba(255,255,255,.16)' : 'none';
      if (!p) { const d = selectedPlantKey ? P[selectedPlantKey] : null; cell.innerHTML = d && state.sun >= d.cost ? `<div style='width:52px;height:52px;display:flex;align-items:center;justify-content:center;opacity:.18;'>${plantSvg({ type: selectedPlantKey, hp: d.hp }, 50, true)}</div>` : '<div style="width:16px;height:16px;border-radius:999px;background:rgba(255,255,255,.08);"></div>'; continue; }
      const d = P[p.type], hp = clamp(p.hp / d.hp, 0, 1), bd = badge(p);
      cell.innerHTML = `<div style='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;'>${plantSvg(p, 76, p.stun > 0)}</div>${bd ? `<div style='position:absolute;top:8px;right:8px;padding:2px 6px;border-radius:999px;background:rgba(15,23,42,.72);color:#f8fafc;font-size:10px;font-weight:700;'>${bd}</div>` : ''}<div style='position:absolute;left:10px;right:10px;bottom:8px;height:7px;border-radius:999px;background:rgba(15,23,42,.35);overflow:hidden;'><div style='height:100%;width:${(hp * 100).toFixed(2)}%;border-radius:999px;background:${hp > .55 ? '#22c55e' : hp > .25 ? '#facc15' : '#ef4444'};'></div></div>`;
    }
  }

  function renderShots() {
    const { cw, ch } = mt();
    peaLayerEl.innerHTML = '';
    state.shots.forEach(s => { const el = document.createElement('div'); el.style.cssText = `position:absolute;left:${inset + s.x * cw - 16}px;top:${inset + s.row * ch + ch * .36 - 16}px;width:32px;height:32px;`; el.innerHTML = shotSvg(s, 32); peaLayerEl.appendChild(el); });
    state.fx.filter(f => f.kind === 'beam' || f.kind === 'gust').forEach(f => { const el = document.createElement('div'); el.style.position = 'absolute'; el.style.left = f.kind === 'gust' ? `${inset}px` : `${inset + f.from * cw}px`; el.style.top = `${inset + f.row * ch + ch * .38}px`; el.style.height = `${Math.max(10, ch * .22)}px`; el.style.width = f.kind === 'gust' ? `${cw * cols}px` : `${cw * (cols - f.from)}px`; el.style.borderRadius = '999px'; el.style.opacity = String(clamp(f.life / f.max, 0, 1)); el.style.background = f.kind === 'gust' ? 'linear-gradient(90deg,rgba(186,230,253,0) 0%,rgba(186,230,253,.72) 20%,rgba(240,249,255,.92) 50%,rgba(186,230,253,0) 100%)' : 'linear-gradient(90deg,rgba(110,231,183,0) 0%,rgba(167,243,208,.4) 14%,rgba(236,253,245,.95) 40%,rgba(52,211,153,.92) 90%,rgba(52,211,153,0) 100%)'; peaLayerEl.appendChild(el); });
  }

  function renderZ() {
    const { cw, ch } = mt();
    zombieLayerEl.innerHTML = '';
    state.zombies.forEach(z => {
      const d = Z[z.type], el = document.createElement('div'), hp = clamp(z.hp / z.maxHp, 0, 1), ar = z.maxArm > 0 ? clamp(z.arm / z.maxArm, 0, 1) : 0, sc = d.sc || 1;
      el.style.cssText = `position:absolute;left:${inset + z.x * cw - cw * .44}px;top:${inset + z.row * ch + ch * .02}px;width:${cw * .96 * sc}px;height:${ch * .96 * sc}px;`;
      el.innerHTML = `<div style='position:relative;width:100%;height:100%;'><div style='position:absolute;left:8px;right:8px;top:0;height:8px;border-radius:999px;background:rgba(15,23,42,.35);overflow:hidden;'><div style='height:100%;width:${(hp * 100).toFixed(2)}%;background:${z.slowT > 0 ? '#38bdf8' : '#ef4444'};'></div></div>${ar > 0 ? `<div style='position:absolute;left:14px;right:14px;top:10px;height:5px;border-radius:999px;background:rgba(15,23,42,.28);overflow:hidden;'><div style='height:100%;width:${(ar * 100).toFixed(2)}%;background:#cbd5e1;'></div></div>` : ''}<div style='position:absolute;left:0;right:0;top:8px;bottom:0;display:flex;align-items:center;justify-content:center;'>${zombieSvg(z, Math.min(cw * .98, ch * .98))}</div></div>`;
      zombieLayerEl.appendChild(el);
    });
    state.fx.filter(f => f.kind === 'burst' || f.kind === 'line' || f.kind === 'flash').forEach(f => {
      const el = document.createElement('div'); el.style.position = 'absolute'; el.style.opacity = String(clamp(f.life / f.max, 0, 1));
      if (f.kind === 'burst') { el.style.left = `${inset + (f.x - f.r) * cw}px`; el.style.top = `${inset + (f.y - f.r) * ch}px`; el.style.width = `${f.r * 2 * cw}px`; el.style.height = `${f.r * 2 * ch}px`; el.style.borderRadius = '999px'; el.style.background = f.bg || 'radial-gradient(circle,rgba(253,224,71,.55) 0%,rgba(251,146,60,.38) 42%,rgba(239,68,68,.08) 72%,transparent 100%)'; }
      else if (f.kind === 'line') { el.style.left = `${inset}px`; el.style.top = `${inset + f.row * ch + ch * .12}px`; el.style.width = `${cw * cols}px`; el.style.height = `${ch * .76}px`; el.style.borderRadius = '999px'; el.style.background = 'linear-gradient(90deg,rgba(239,68,68,0) 0%,rgba(251,146,60,.78) 16%,rgba(253,224,71,.86) 50%,rgba(251,146,60,.78) 84%,rgba(239,68,68,0) 100%)'; }
      else { el.style.left = `${inset}px`; el.style.top = `${inset}px`; el.style.width = `${cw * cols}px`; el.style.height = `${ch * rows}px`; el.style.borderRadius = '18px'; el.style.background = f.bg || 'rgba(186,230,253,.28)'; }
      zombieLayerEl.appendChild(el);
    });
  }

  function renderSuns() {
    const { cw, ch } = mt(); const alive = new Set(state.suns.map(s => s.id));
    for (const [id, el] of sunDomById.entries()) if (!alive.has(id)) { el.remove(); sunDomById.delete(id); }
    state.suns.forEach(s => {
      let el = sunDomById.get(s.id);
      if (!el) {
        el = document.createElement('button'); el.type = 'button'; el.style.cssText = 'position:absolute;width:56px;height:56px;padding:0;border:0;border-radius:999px;background:transparent;cursor:pointer;z-index:50;appearance:none;outline:none;touch-action:manipulation;pointer-events:auto;';
        el.innerHTML = sunSvg(56);
        el.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); collectSun(s.id); }, { capture: true });
        el.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); collectSun(s.id); }, { capture: true });
        boardWrapEl.appendChild(el); sunDomById.set(s.id, el);
      }
      el.style.left = `${inset + s.x * cw - 28}px`; el.style.top = `${inset + s.y * ch - 28}px`;
    });
  }

  function renderScene() { renderGrid(); renderShots(); renderZ(); renderSuns(); }
  function clearSelectedPlant() { if (!selectedPlantKey) return; selectedPlantKey = null; renderBar(); renderGrid(); }

  function addSun(x, y, v, fall) { state.suns.push({ id: uid('sun'), x, y, sy: y, ty: y + fall, v, age: 0, ft: .7, life: 8 }); }
  function collectSun(id) { const s = state.suns.find(x => x.id === id); if (!s) return; state.suns = state.suns.filter(x => x.id !== id); state.sun += s.v; selectedPlantKey = null; renderHud(); renderBar(); renderGrid(); status(T.collect(s.v)); }
  function rmPlant(p) { if (!p) return; state.grid[p.row][p.col] = null; state.plants = state.plants.filter(x => x.id !== p.id); }
  function spawnZombie(type, row, x) { const d = Z[type]; if (!d) return; state.zombies.push({ id: uid('z'), type, row, x: typeof x === 'number' ? x : cols + .68, hp: d.hp, maxHp: d.hp, arm: d.arm || 0, maxArm: d.arm || 0, sp: d.sp, dmg: d.dmg, atk: d.atk, ac: d.atk, slowT: 0, slow: 1, stunT: 0, burnT: 0, burn: 0, hidden: !!d.hide, sumT: d.sum ? d.sum[0] : 0, supT: d.heal ? d.heal[0] : d.rep ? d.rep[0] : d.zap ? d.zap[0] : 0, spikeT: 0, jumped: false, enraged: false, revived: false, lowed: false }); }
  const zAhead = (r, c) => state.zombies.some(z => z.row === r && !z.hidden && z.x > c + .18);
  function nearZombie(r, c, dist) { let t = null; state.zombies.forEach(z => { if (z.row !== r || z.hidden || z.x < c - .15 || z.x > c + dist) return; if (!t || z.x < t.x) t = z; }); return t; }
  function blockPlant(r, z) { if (z.hidden && Z[z.type].hide) return null; let t = null; state.plants.forEach(p => { if (p.row !== r) return; if (z.x > p.col + .92 || z.x < p.col - .15) return; if (!t || p.col > t.col) t = p; }); return t; }
  function dmgPlant(p, n, chill) { if (!p) return; p.hp -= n; if (chill) p.stun = Math.max(p.stun || 0, chill); if (p.hp <= 0) rmPlant(p); }
  function rage(z, d) { if (z.enraged) return; z.enraged = true; z.sp *= d.rage ? d.rage[1] : 1.5; z.dmg *= d.rage ? d.rage[2] : 1.2; }
  function dmgZombie(z, n, o) {
    if (!z || z.hp <= 0) return 'none'; const d = Z[z.type], x = o || {}; let n2 = n;
    if (x.proj) { if (d.ref && !x.unref && !z.hidden) return 'ref'; if (d.dodge && roll() < d.dodge) return 'dodge'; if (z.hidden && d.hres) n2 *= d.hres; if (!z.hidden && d.res) n2 *= d.res; }
    if (!x.ign && z.arm > 0) { const ab = Math.min(z.arm, n2); z.arm -= ab; n2 -= ab; }
    if (n2 > 0) z.hp -= n2;
    if (x.sdur) { z.slowT = Math.max(z.slowT, x.sdur); z.slow = Math.min(z.slow, x.slow || 1); }
    if (x.stun) z.stunT = Math.max(z.stunT, x.stun);
    if (x.bdur) { z.burnT = Math.max(z.burnT, x.bdur); z.burn = Math.max(z.burn, x.burn || 0); }
    if (x.push) z.x += x.push;
    if (d.rage && !z.enraged && z.hp > 0 && z.hp <= z.maxHp * d.rage[0]) rage(z, d);
    if (d.low && !z.lowed && z.hp > 0 && z.hp <= z.maxHp * .45) { z.lowed = true; spawnZombie(d.low, z.row, z.x + .15); }
    return z.hp <= 0 ? 'kill' : 'hit';
  }
  function cleanZ() {
    const keep = [];
    state.zombies.forEach(z => {
      if (z.hp > 0) { keep.push(z); return; }
      const d = Z[z.type];
      if (d.rev && !z.revived) { z.revived = true; z.hp = Math.max(80, Math.floor(d.hp * d.rev)); z.maxHp = z.hp; keep.push(z); return; }
      if (d.death) spawnZombie(d.death, z.row, z.x + .08);
      setFx('burst', { x: z.x, y: z.row + .5, r: .55, life: .18, max: .18 });
    });
    state.zombies = keep;
  }
  function shot(plant, d, ex) { const e = ex || {}; state.shots.push({ id: uid('s'), row: plant.row, x: plant.col + .68, spd: e.spd || d.spd || 4.6, dmg: e.dmg || d.dmg || 20, style: e.style || d.style || 'pea', slow: e.slow || d.slow || 1, sdur: e.sdur || d.dur || 0, stun: e.stun || d.stun || 0, burn: e.burn || d.burn || 0, bdur: e.bdur || d.bdur || 0, spl: e.spl || d.spl || 0, sdmg: e.sdmg || d.sdmg || 0, ign: !!e.ign || !!d.arm, unref: !!e.unref }); }
  function boom(x, y, r, dmg, o) { state.zombies.forEach(z => { if (z.hidden) return; const dx = z.x - x, dy = z.row + .5 - y; if (Math.sqrt(dx * dx + dy * dy) <= r) dmgZombie(z, dmg, o); }); cleanZ(); }
  function lane(row, dmg, o) { state.zombies.forEach(z => { if (z.row === row && !z.hidden) dmgZombie(z, dmg, o); }); cleanZ(); }

  function actPlant(p) {
    const d = P[p.type];
    if (d.fuse != null) { p.fuse -= p.dt; if (p.fuse > 0) return; }
    if (d.burstSun != null) { state.sun += d.burstSun; setFx('flash', { bg: 'rgba(253,224,71,.22)', life: .25, max: .25 }); rmPlant(p); renderHud(); renderBar(); status(T.bloom); return; }
    if (d.line != null) { setFx('line', { row: p.row, life: .34, max: .34 }); lane(p.row, d.line, { bdur: 1.4, burn: d.burn || 8 }); rmPlant(p); status(T.lane); return; }
    if (d.freeze != null) { setFx('flash', { bg: 'rgba(186,230,253,.34)', life: .34, max: .34 }); state.zombies.forEach(z => dmgZombie(z, d.freeze, { slow: d.slow, sdur: d.dur, stun: .7 })); cleanZ(); rmPlant(p); status(T.freeze); return; }
    if (d.push != null) { state.zombies.forEach(z => dmgZombie(z, d.gustDmg || 18, { push: d.push, slow: d.slow, sdur: d.dur })); cleanZ(); setFx('gust', { row: 2, from: 0, life: .3, max: .3 }); rmPlant(p); status(T.gust); return; }
    if (d.boom != null) {
      setFx('burst', { x: p.col + .5, y: p.row + .5, r: d.rad, life: d.doom ? .46 : .34, max: d.doom ? .46 : .34, bg: d.doom ? 'radial-gradient(circle,rgba(216,180,254,.72) 0%,rgba(168,85,247,.45) 38%,rgba(88,28,135,.16) 72%,transparent 100%)' : undefined });
      boom(p.col + .5, p.row + .5, d.rad, d.boom, { stun: d.doom ? .5 : .2 });
      rmPlant(p);
      status(d.doom ? T.doom : T.bomb);
    }
  }

  function placePlant(r, c) {
    if (state.won || state.lost) return;
    if (state.grid[r][c]) return status(T.occupied);
    const d = P[selectedPlantKey]; if (!d) return;
    const text = getPlantText(selectedPlantKey);
    if (state.sun < d.cost) return status(T.needSun(text.name));
    const p = { id: uid('p'), type: selectedPlantKey, row: r, col: c, hp: d.hp, cd: d.cd ? d.cd * .55 : d.t ? d.t * .55 : d.fuse || d.armt || 0, pend: 0, gap: 0, armt: d.armt || 0, armed: false, chew: 0, stun: 0, spikeT: 0, fuse: d.fuse || 0, dt: 0 };
    state.sun -= d.cost; state.grid[r][c] = p; state.plants.push(p); renderHud(); renderBar(); renderGrid(); status(T.placed(text.name));
  }

  function updPlants(dt) {
    state.plants.slice().forEach(p => {
      const d = P[p.type]; p.dt = dt;
      if (p.stun > 0) { p.stun = Math.max(0, p.stun - dt); return; }
      if (d.fuse != null && (d.burstSun != null || d.boom != null || d.line != null || d.freeze != null || d.push != null)) return actPlant(p);
      if (d.mine != null) { if (!p.armed) { p.armt -= dt; if (p.armt <= 0) { p.armed = true; status(T.mine); } return; } const z = nearZombie(p.row, p.col, .95); if (z && z.x <= p.col + .95) { setFx('burst', { x: p.col + .5, y: p.row + .5, r: d.rad, life: .3, max: .3 }); boom(p.col + .5, p.row + .5, d.rad, d.mine, { ign: true, stun: .2 }); rmPlant(p); } return; }
      if (d.spike != null && d.sti != null) return;
      if (d.chomp != null) { if (p.chew > 0) return void (p.chew -= dt); const z = nearZombie(p.row, p.col + .15, d.chomp); if (z && z.x >= p.col - .1) { if (z.maxHp >= 700) dmgZombie(z, d.boss, { ign: true, stun: .4 }); else z.hp = -999; cleanZ(); p.chew = d.chew; } return; }
      if (d.mag != null) { p.cd -= dt; if (p.cd > 0) return; let z = null; state.zombies.forEach(n => { if (n.hidden || n.arm <= 0) return; if (!z || n.x < z.x) z = n; }); if (z) { z.arm = 0; z.maxArm = 0; setFx('flash', { bg: 'rgba(226,232,240,.18)', life: .18, max: .18 }); status(T.magnet); } p.cd = d.mag; return; }
      if (d.range != null && d.smash != null) { const z = nearZombie(p.row, p.col + .15, d.range); if (z) { setFx('burst', { x: z.x, y: z.row + .5, r: .8, life: .24, max: .24 }); dmgZombie(z, d.smash, { ign: true, stun: .4 }); cleanZ(); rmPlant(p); } return; }
      if (d.t && d.sun) { p.cd -= dt; if (p.cd <= 0) { addSun(p.col + .52, p.row + .26, d.sun, .38); p.cd += d.t; } return; }
      if (d.k !== 'atk' && d.f !== 'beam' && !d.pierceLine) return;
      if (!zAhead(p.row, p.col)) return;
      if (p.pend > 0) { p.gap -= dt; if (p.gap <= 0) { if (d.f === 'beam' || d.pierceLine) { setFx('beam', { row: p.row, from: p.col + .7, life: .18, max: .18 }); state.zombies.forEach(z => { if (z.row === p.row && !z.hidden && z.x > p.col + .2) dmgZombie(z, d.dmg, { proj: 1, unref: 1 }); }); cleanZ(); } else { let ex = null; if (d.butter && roll() < d.butter) ex = { style: 'butter', stun: d.stun, dmg: d.dmg + 4, unref: 1 }; shot(p, d, ex); } p.pend--; if (p.pend > 0) p.gap = d.bg || .12; } return; }
      p.cd -= dt; if (p.cd > 0) return; p.pend = Math.max(0, (d.b || 1) - 1);
      if (d.f === 'beam' || d.pierceLine) { setFx('beam', { row: p.row, from: p.col + .7, life: .18, max: .18 }); state.zombies.forEach(z => { if (z.row === p.row && !z.hidden && z.x > p.col + .2) dmgZombie(z, d.dmg, { proj: 1, unref: 1 }); }); cleanZ(); }
      else { let ex = null; if (d.butter && roll() < d.butter) ex = { style: 'butter', stun: d.stun, dmg: d.dmg + 4, unref: 1 }; shot(p, d, ex); }
      p.gap = d.bg || .12; p.cd = d.cd || d.t || 1.2;
    });
  }

  function updShots(dt) {
    const keep = [];
    state.shots.forEach(s => {
      s.x += s.spd * dt; let hit = false;
      for (const z of state.zombies) {
        if (z.row !== s.row || z.hidden) continue; const hb = Z[z.type].hit || .3;
        if (s.x + .12 < z.x - hb || s.x - .08 > z.x + hb) continue;
        const r = dmgZombie(z, s.dmg, { proj: 1, ign: s.ign, slow: s.slow, sdur: s.sdur, stun: s.stun, burn: s.burn, bdur: s.bdur, unref: s.unref });
        if (r === 'ref') { setFx('flash', { bg: 'rgba(253,186,116,.18)', life: .16, max: .16 }); hit = true; break; }
        if (r === 'dodge') continue;
        if (s.spl > 0) boom(z.x, z.row + .5, s.spl, s.sdmg, {});
        hit = true; break;
      }
      if (!hit && s.x < cols + 1.4) keep.push(s);
    });
    state.shots = keep; cleanZ();
  }

  function updSupport(dt) {
    state.zombies.forEach(z => {
      const d = Z[z.type]; if (d.hide && z.hidden && z.x <= d.hide) z.hidden = false;
      if (z.burnT > 0) { z.burnT = Math.max(0, z.burnT - dt); z.hp -= z.burn * dt; }
      if (z.slowT > 0) z.slowT = Math.max(0, z.slowT - dt); else z.slow = 1;
      if (z.stunT > 0) z.stunT = Math.max(0, z.stunT - dt);
      if (d.heal) { z.supT -= dt; if (z.supT <= 0) { state.zombies.forEach(t => { if (t.hidden) return; if (Math.abs(t.row - z.row) <= 1 && Math.abs(t.x - z.x) <= 1.8) t.hp = Math.min(t.maxHp, t.hp + d.heal[1]); }); z.supT = d.heal[0]; } }
      if (d.rep) { z.supT -= dt; if (z.supT <= 0) { state.zombies.forEach(t => { if (t === z || t.maxArm <= 0) return; if (Math.abs(t.row - z.row) <= 1 && Math.abs(t.x - z.x) <= 1.6) t.arm = Math.min(t.maxArm, t.arm + d.rep[1]); }); z.supT = d.rep[0]; } }
      if (d.sum) { z.sumT -= dt; if (z.sumT <= 0) { spawnZombie(d.sum[1], clamp(z.row + (roll() < .5 ? -1 : 1), 0, rows - 1), z.x + .18); z.sumT = d.sum[0]; } }
      if (d.zap) { z.supT -= dt; if (z.supT <= 0) { const p = state.plants.filter(t => t.row === z.row && t.col < z.x && t.col >= z.x - 2.6).sort((a, b) => b.col - a.col)[0]; if (p) dmgPlant(p, d.zap[1], d.zap[2]); z.supT = d.zap[0]; } }
    });
    cleanZ();
  }

  function updZ(dt) {
    updSupport(dt);
    const keep = [];
    state.zombies.forEach(z => {
      if (z.hp <= 0) return; const d = Z[z.type]; if (z.stunT > 0) return void keep.push(z);
      const g = state.grid[z.row][clamp(Math.floor(z.x + .15), 0, cols - 1)];
      if (g && P[g.type] && P[g.type].spike != null && !z.hidden) { z.spikeT -= dt; if (z.spikeT <= 0) { z.spikeT = P[g.type].sti; dmgZombie(z, P[g.type].spike, { ign: 1, slow: .92, sdur: P[g.type].rock ? .45 : 0 }); } }
      if (z.hp <= 0) return;
      const b = blockPlant(z.row, z);
      if (b) {
        const pd = P[b.type]; if (d.jump && !z.jumped && !pd.block) { z.jumped = true; z.x = b.col - .25; keep.push(z); return; }
        z.ac -= dt; if (z.ac <= 0) { dmgPlant(b, z.dmg, d.chill || 0); if (pd.refl) dmgZombie(z, pd.refl, { ign: 1 }); z.ac += z.atk; }
      } else {
        const aura = state.zombies.some(o => o !== z && Z[o.type].aura && Math.abs(o.row - z.row) <= 1 && Math.abs(o.x - z.x) <= 1.8) ? 1.12 : 1;
        z.x -= z.sp * z.slow * aura * dt; z.ac = z.atk;
      }
      if (z.hp <= 0) return;
      if (z.x < -.45) { state.lives = Math.max(0, state.lives - 1); renderHud(); if (state.lives <= 0) loseLevel(); else status(T.life(state.lives)); return; }
      keep.push(z);
    });
    state.zombies = keep; cleanZ();
  }

  function updSuns(dt) { state.suns = state.suns.filter(s => { s.age += dt; const p = clamp(s.age / s.ft, 0, 1); s.y = s.sy + (s.ty - s.sy) * p; return s.age < s.life; }); }
  function updFx(dt) { state.fx = state.fx.filter(f => ((f.life -= dt) > 0)); }
  function sky(dt) { state.sky -= dt; if (state.sky > 0) return; addSun(.7 + roll() * 7.6, -.12, 25, .95); state.sky = state.lv.sky + roll() * 1.25; }
  function waves() { while (state.wi < state.lv.waves.length && state.time >= state.lv.waves[state.wi].time) { const w = state.lv.waves[state.wi]; spawnZombie(w.type, w.row); state.wi++; } }
  function win() { if (state.won || state.lost) return; state.run = false; state.won = true; renderHud(); renderBar(); status(levelIndex === levels.length - 1 ? T.allStatus : T.winStatus); }
  function loseLevel() { if (state.lost) return; state.run = false; state.lost = true; renderHud(); status(T.loseStatus); }
  function tick(dt) { if (!state.run || state.won || state.lost) { updFx(dt); renderScene(); return; } state.time += dt; waves(); sky(dt); updPlants(dt); updShots(dt); updZ(dt); updSuns(dt); updFx(dt); if (!state.won && !state.lost && state.wi >= state.lv.waves.length && state.zombies.length === 0) win(); renderScene(); }
  function frame(now) { if (!root.isConnected) { if (frameHandle) cancelAnimationFrame(frameHandle); return; } const dt = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now; tick(dt); frameHandle = requestAnimationFrame(frame); }
  function closeResetConfirm() { if (resetConfirmEl) resetConfirmEl.style.display = 'none'; }
  function openResetConfirm() {
    if (resetConfirmEl) {
      resetConfirmEl.style.display = 'flex';
      return;
    }
    if (window.StarDialog && typeof window.StarDialog.confirm === 'function') {
      window.StarDialog.confirm({
        title: t('restart'),
        message: t('confirmRestart'),
        okText: t('restart'),
        cancelText: t('cancel')
      }).then(ok => {
        if (ok) resetLevel(levelIndex);
      });
    }
  }
  function resetLevel(i) { closeResetConfirm(); hideOverlay(); levelIndex = clamp(i, 0, levels.length - 1); persistLevelIndex(levelIndex); state = createState(levelIndex); renderHud(); renderBar(); renderScene(); status(T.intro(levelIndex + 1, state.lv.name)); }
  function startLevel() { if (state.run || state.won || state.lost) return; state.run = true; status(T.battle); renderHud(); }

  startBtn.addEventListener('click', startLevel);
  resetBtn.addEventListener('click', openResetConfirm);
  root.addEventListener('pointerdown', e => {
    if (!selectedPlantKey) return;
    if (boardWrapEl.contains(e.target)) return;
    const boardRect = boardWrapEl.getBoundingClientRect();
    if (e.clientY >= boardRect.top) return;
    if (plantBarEl.contains(e.target) && e.target.closest('button')) return;
    if (e.target.closest('button,select,input,label')) return;
    clearSelectedPlant();
  });
  if (resetCancelBtn) resetCancelBtn.addEventListener('click', closeResetConfirm);
  if (resetConfirmBtn) resetConfirmBtn.addEventListener('click', () => resetLevel(levelIndex));
  if (resetConfirmEl) resetConfirmEl.addEventListener('click', e => { if (e.target === resetConfirmEl) closeResetConfirm(); });
  buildGrid(); resetLevel(readSavedLevelIndex()); lastFrame = performance.now(); frameHandle = requestAnimationFrame(frame);
  root.dataset.bound = 'true';
  } catch (err) {
    root.dataset.bound = '';
    root.innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:#f8fafc;"><div><div style="font-size:20px;font-weight:800;margin-bottom:8px;">${t('pvzLoadFailedTitle')}</div><div style="font-size:13px;color:rgba(248,250,252,.78);line-height:1.7;">${t('pvzLoadFailedDesc')}</div></div></div>`;
    try { console.error('[StarGames.sudoku] init failed', err); } catch (_) {}
  }
};