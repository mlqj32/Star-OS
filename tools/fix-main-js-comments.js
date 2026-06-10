
/**
 * 去掉 main.js 行尾注释里整段 GBK 型乱码，保留代码部分。
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'main', 'main.js');
const raw = fs.readFileSync(file, 'utf8');
const lines = raw.split(/\r?\n/);
const hint = /\uFFFD|(?:Ã.|Â.|Ð.|Ñ.)/;

const out = lines.map((line) => {
  const idx = line.indexOf('//');
  if (idx < 0 || !hint.test(line.slice(idx))) return line;
  return line.slice(0, idx).replace(/\s+$/, '');
});

fs.writeFileSync(file, out.join('\n'), 'utf8');
console.log('main.js: stripped corrupted trailing comments');