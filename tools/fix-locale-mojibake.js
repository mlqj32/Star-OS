}/**
 * 修复「UTF-8 被误按 GBK 解读后再存为 UTF-8」及少量 Latin-1 误读的文案。
 */
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const root = path.join(__dirname, '..');
const targets = [
  path.join(root, 'renderer', 'i18n', 'locales.js'),
  path.join(root, 'renderer', 'i18n', 'locales-lock.js'),
  path.join(root, 'renderer', 'i18n', 'locales-browser-devtools.js'),
  path.join(root, 'renderer', 'i18n', 'locales-browser-downloads.js'),
];

const MOJIBAKE_HINT =
  /\uFFFD|(?:Ã.|Â.|Ð.|Ñ.)|[\u4E00-\u9FFF][\uE000-\uF8FF]/;

function tryGbkReverse(s) {
  try {
    return iconv.encode(s, 'gbk').toString('utf8');
  } catch (_) {
    return s;
  }
}

function tryLatin1Utf8(s) {
  try {
    if ([...s].some((c) => c.charCodeAt(0) > 255)) return s;
    return Buffer.from(s, 'latin1').toString('utf8');
  } catch (_) {
    return s;
  }
}

function scoreText(s) {
  let bad = 0;
  let han = 0;
  let jp = 0;
  let kr = 0;
  for (const c of s) {
    const cp = c.codePointAt(0);
    if (cp === 0xfffd) bad += 5;
    if (cp >= 0x4e00 && cp <= 0x9fff) han += 1;
    if (cp >= 0x3400 && cp <= 0x4dbf) han += 1;
    if ((cp >= 0x3040 && cp <= 0x30ff) || (cp >= 0xff66 && cp <= 0xff9f)) jp += 1;
    if (cp >= 0xac00 && cp <= 0xd7af) kr += 1;
  }
  const mojibakePenalty = (s.match(/\uFFFD|(?:Ã.|Â.|Ð.|Ñ.)/g) || []).length;
  return han + jp + kr - bad - mojibakePenalty * 2;
}

function fixStringContent(s) {
  if (!s || !/[^\x00-\x7f]/.test(s)) return s;

  const candidates = [s];
  if (MOJIBAKE_HINT.test(s)) {
    candidates.push(tryGbkReverse(s));
  }
  const lat = tryLatin1Utf8(s);
  if (lat !== s) candidates.push(lat);

  let best = s;
  let bestScore = scoreText(s);
  for (const c of candidates) {
    if (!c || c.includes('\u0000')) continue;
    const sc = scoreText(c);
    if (sc > bestScore) {
      bestScore = sc;
      best = c;
    }
  }

  const patches = [
    [/^开\?$/, '开始'],
    [/^最\?$/, '最近'],
    [/^国际\?$/, '国际化'],
    [/^图\?$/, '图片'],
    [/^所有应$/, '所有应用'],
    [/^上一$/, '上一首'],
    [/^下一$/, '下一首'],
    [/^记事$/, '记事本'],
    [/^计算$/, '计算器'],
    [/^Star浏览$/, 'Star 浏览器'],
    [/^Docker $/, 'Docker 终端'],
    [/^（已执行完毕，无输出$/, '（已执行完毕，无输出）'],
  ];
  for (const [re, rep] of patches) {
    if (re.test(best)) best = best.replace(re, rep);
  }

  return best;
}

function jsUnescapeSingle(inner) {
  let out = '';
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    i += 1;
    if (i >= inner.length) {
      out += '\\';
      break;
    }
    const e = inner[i];
    if (e === 'n') out += '\n';
    else if (e === 'r') out += '\r';
    else if (e === 't') out += '\t';
    else if (e === "'" || e === '"' || e === '\\') out += e;
    else out += '\\' + e;
  }
  return out;
}

function jsEscapeSingle(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/'/g, "\\'");
}

function jsUnescapeDouble(inner) {
  let out = '';
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    i += 1;
    if (i >= inner.length) {
      out += '\\';
      break;
    }
    const e = inner[i];
    if (e === 'n') out += '\n';
    else if (e === 'r') out += '\r';
    else if (e === 't') out += '\t';
    else if (e === '"' || e === "'" || e === '\\') out += e;
    else out += '\\' + e;
  }
  return out;
}

function jsEscapeDouble(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/"/g, '\\"');
}

function processSingleQuotedStrings(raw) {
  return raw.replace(/'([^'\\]|\\.)*'/gs, (m) => {
    if (!/[^\x00-\x7f]/.test(m)) return m;
    const inner = m.slice(1, -1);
    if (/^\\u[0-9a-fA-F]{4}$/.test(inner)) return m;
    const dec = jsUnescapeSingle(inner);
    const fixed = fixStringContent(dec);
    if (fixed === dec) return m;
    return "'" + jsEscapeSingle(fixed) + "'";
  });
}

function processDoubleQuotedStrings(raw) {
  return raw.replace(/"([^"\\]|\\.)*"/gs, (m) => {
    if (!/[^\x00-\x7f]/.test(m)) return m;
    const inner = m.slice(1, -1);
    const dec = jsUnescapeDouble(inner);
    const fixed = fixStringContent(dec);
    if (fixed === dec) return m;
    return '"' + jsEscapeDouble(fixed) + '"';
  });
}

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let raw = fs.readFileSync(filePath, 'utf8');
  const original = raw;
  raw = processSingleQuotedStrings(raw);
  raw = processDoubleQuotedStrings(raw);
  if (raw !== original) {
    fs.writeFileSync(filePath, raw, 'utf8');
    console.log('fixed:', path.relative(root, filePath));
  }
}

for (const f of targets) fixFile(f);