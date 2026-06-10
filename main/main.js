
/**
 * Star OS - Electron 主进程
 * 窗口管理、IPC、协议、内置浏览器与托管 EXE 等。
 */
const { app, BrowserWindow, ipcMain, shell, dialog, protocol, session, webContents, clipboard } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const iconv = require('iconv-lite');

// Make custom protocols behave like standard schemes so <webview> can load HTML + relative assets reliably.
try {
  protocol.registerSchemesAsPrivileged([{
    scheme: 'star-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: true
    }
  }]);
} catch (_) {}

// When the app is launched without a console (or the parent pipe is closed),
// Electron/Node may attempt to write logs to a broken stdio pipe, causing an
// uncaught EPIPE and a fatal "JavaScript error occurred in the main process".
// We defensively swallow EPIPE/EBADF to keep the app running.
function hardenStdio(stream) {
  if (!stream || typeof stream.write !== 'function') return;
  const origWrite = stream.write;
  stream.write = function (chunk, encoding, cb) {
    try {
      return origWrite.call(this, chunk, encoding, cb);
    } catch (err) {
      const code = err && err.code ? String(err.code) : '';
      if (code === 'EPIPE' || code === 'EBADF' || code === 'ERR_STREAM_DESTROYED') {
        try { if (typeof cb === 'function') cb(); } catch (_) {}
        return false;
      }
      throw err;
    }
  };
  if (typeof stream.on === 'function') {
    stream.on('error', (err) => {
      const code = err && err.code ? String(err.code) : '';
      if (code === 'EPIPE' || code === 'EBADF' || code === 'ERR_STREAM_DESTROYED') return;
    });
  }
}
hardenStdio(process.stdout);
hardenStdio(process.stderr);
process.on('uncaughtException', (err) => {
  const code = err && err.code ? String(err.code) : '';
  if (code === 'EPIPE' || code === 'EBADF' || code === 'ERR_STREAM_DESTROYED') return;
  throw err;
});
let pty;
try {
  pty = require('node-pty');
} catch (_) {
  pty = null;
}
let Seven;
let path7za;
try {
  Seven = require('node-7z');
  const bin = require('7zip-bin');
  path7za = bin.path7za;
} catch (_) {
  Seven = null;
  path7za = null;
}
function resolveArchiveBinaryPath() {
  const raw = typeof path7za === 'string' ? path7za.trim() : '';
  if (!raw) return '';
  const normalizedRaw = raw.replace(/\//g, '\\');
  const candidates = [];
  // Never execute binaries from inside app.asar directly.
  const isInsideAsar = /app\.asar([\\/]|$)/i.test(normalizedRaw) && !/app\.asar\.unpacked([\\/]|$)/i.test(normalizedRaw);
  if (!isInsideAsar) candidates.push(normalizedRaw);
  // 1) Direct app.asar -> app.asar.unpacked replacement
  if (/app\.asar([\\/]|$)/i.test(normalizedRaw)) {
    candidates.push(normalizedRaw.replace(/app\.asar([\\/]|$)/i, 'app.asar.unpacked$1'));
  }
  // 2) Build from resourcesPath + node_modules/7zip-bin tail (packaged mode)
  try {
    const tailMatch = normalizedRaw.match(/node_modules[\\/]7zip-bin[\\/].*$/i);
    if (tailMatch && tailMatch[0]) {
      candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', tailMatch[0]));
      candidates.push(path.join(process.resourcesPath, tailMatch[0]));
    }
  } catch (_) {}
  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate)) return candidate;
    } catch (_) {}
  }
  // If still unresolved, fail fast and let callers use fallback strategy.
  return '';
}
function isZipArchivePath(archivePath) {
  return /\.zip$/i.test(String(archivePath || '').trim());
}
async function listZipEntriesWithPowerShell(archivePath) {
  const args = [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-Command',
    "$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.UTF8Encoding]::UTF8; Add-Type -AssemblyName 'System.IO.Compression.FileSystem'; $zip=[System.IO.Compression.ZipFile]::OpenRead($args[0]); try { foreach($e in $zip.Entries){ if($null -eq $e){ continue }; $n=[string]$e.FullName; if([string]::IsNullOrWhiteSpace($n)){ continue }; $s=0; try { $s=[int64]$e.Length } catch { $s=0 }; Write-Output ($n + \"`t\" + $s) } } finally { if($zip){ $zip.Dispose() } }",
    archivePath
  ];
  const child = spawn('powershell.exe', args, { windowsHide: true, shell: false, env: { ...process.env } });
  const outBuf = [];
  const errBuf = [];
  child.stdout.on('data', (d) => outBuf.push(Buffer.from(d)));
  child.stderr.on('data', (d) => errBuf.push(Buffer.from(d)));
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  if (code !== 0) {
    const stderr = Buffer.concat(errBuf).toString('utf8').trim();
    throw new Error(stderr || 'Zip list failed');
  }
  const text = Buffer.concat(outBuf).toString('utf8');
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return lines.map((line) => {
    const tabIdx = line.lastIndexOf('\t');
    const p = tabIdx >= 0 ? line.slice(0, tabIdx) : line;
    const sizeText = tabIdx >= 0 ? line.slice(tabIdx + 1) : '0';
    const size = parseInt(sizeText, 10);
    const isFolder = /[\\/]$/.test(p);
    return { path: String(p || '').replace(/[\\/]$/, ''), size: Number.isFinite(size) ? size : 0, isFolder };
  }).filter((it) => it.path);
}
async function extractZipWithPowerShell(archivePath, destDir, entries) {
  const selectedEntries = Array.isArray(entries)
    ? entries.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const selectedJson = JSON.stringify(selectedEntries);
  const args = [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-Command',
    "$ErrorActionPreference='Stop'; Add-Type -AssemblyName 'System.IO.Compression.FileSystem'; $zipPath=$args[0]; $dest=$args[1]; $selectedJson=$args[2]; $selected=@(); if(-not [string]::IsNullOrWhiteSpace($selectedJson)){ try { $selected = @((ConvertFrom-Json -InputObject $selectedJson)) } catch { $selected=@() } }; if(-not (Test-Path -LiteralPath $dest)){ New-Item -ItemType Directory -Path $dest -Force | Out-Null }; $zip=[System.IO.Compression.ZipFile]::OpenRead($zipPath); try { foreach($e in $zip.Entries){ if($null -eq $e){ continue }; $name=[string]$e.FullName; if([string]::IsNullOrWhiteSpace($name)){ continue }; $trimName=$name.TrimEnd('/','\\'); $need=($selected.Count -eq 0) -or ($selected -contains $name) -or ($selected -contains $trimName); if(-not $need){ continue }; $target=Join-Path $dest $name; if($name.EndsWith('/') -or $name.EndsWith('\\')){ New-Item -ItemType Directory -Path $target -Force | Out-Null; continue }; $parent=Split-Path -Parent $target; if(-not [string]::IsNullOrWhiteSpace($parent)){ New-Item -ItemType Directory -Path $parent -Force | Out-Null }; [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, $target, $true) } } finally { if($zip){ $zip.Dispose() } }",
    archivePath,
    destDir,
    selectedJson
  ];
  const child = spawn('powershell.exe', args, { windowsHide: true, shell: false, env: { ...process.env } });
  const errBuf = [];
  child.stderr.on('data', (d) => errBuf.push(Buffer.from(d)));
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  if (code !== 0) {
    const stderr = Buffer.concat(errBuf).toString('utf8').trim();
    throw new Error(stderr || 'Zip extract failed');
  }
  return true;
}
let WordExtractor;
try {
  WordExtractor = require('word-extractor');
} catch (_) {
  WordExtractor = null;
}
let PPT;
try {
  PPT = require('ppt');
} catch (_) {
  PPT = null;
}

const directorySizeCache = new Map();
const directorySizePending = new Map();
const DIRECTORY_SIZE_CACHE_TTL_MS = 5 * 60 * 1000;
const PROTECTED_SYSTEM_DIR_NAMES = new Set(['system volume information', '$recycle.bin']);

let mainWindow;
const windows = new Map();
const ptySessions = new Map(); // id -> { write, resize, kill, ownerWebContentsId, transport, term?/child? }
const managedExeSessions = new Map(); // id -> managed EXE hosting session
const managedExeHelperPath = path.join(__dirname, '../tools/managed-exe-helper.ps1');
const browserDownloadRecords = new Map(); // id -> metadata for UI
const browserDownloadLiveItems = new Map(); // id -> Electron DownloadItem
const browserDownloadItemMeta = new WeakMap(); // DownloadItem -> { id }
const browserDownloadBoundSessions = new WeakSet();
let browserDownloadSeed = 0;
let browserDownloadPersistTimer = null;
const browserNetworkRecords = [];
const browserNetworkBoundSessions = new WeakSet();
const browserNetworkRequestStarts = new Map();
const browserWebviewEditSnapshots = new Map();
const BROWSER_NETWORK_MAX_RECORDS = 900;
const MAIN_I18N = {
  'zh-CN': {
    managedExeOnlyWindows: '托管 EXE 仅支持在 Windows 上运行。',
    managedExeExecutableNotFound: '未找到可执行文件。',
    managedExeWaitingTitle: '正在接管应用窗口...',
    managedExeWaitingHint: 'Star OS 正在将外部 EXE 托管到内部应用窗口中。',
    managedExeExitHint: '应用已退出，此窗口即将关闭。',
    managedExeSyncFailed: '窗口同步失败',
    managedExeLaunching: '正在启动应用...',
    managedExeLaunchHost: 'Star OS 正在创建托管 EXE 的宿主窗口。',
    managedExeStartFailed: '启动失败',
    managedExeAppStartFailed: '应用启动失败',
    managedExeExited: '应用已退出',
    managedExeExitCode: '退出代码：{code}',
    managedExeSearching: '正在接管应用窗口...',
    managedExeSearchHint: 'Star OS 正在继续扫描主窗口，较慢的程序可能需要更久。',
    managedExeWindowNotFound: '未找到可托管的窗口',
    managedExeWindowNotFoundDetail: '程序可能已经在外部打开，但没有暴露可嵌入托管的原生主窗口。',
    managedExeReady: '应用正在 Star OS 窗口中运行。',
    managedExeReadyDetail: '该 EXE 仍由 Windows 执行，但其窗口现已由 Star OS 托管。'
  },
  'zh-TW': {
    managedExeOnlyWindows: '託管 EXE 僅支援在 Windows 上執行。',
    managedExeExecutableNotFound: '找不到可執行檔。',
    managedExeWaitingTitle: '正在接管應用視窗...',
    managedExeWaitingHint: 'Star OS 正在將外部 EXE 託管到內部應用視窗中。',
    managedExeExitHint: '應用已結束，此視窗即將關閉。',
    managedExeSyncFailed: '視窗同步失敗',
    managedExeLaunching: '正在啟動應用...',
    managedExeLaunchHost: 'Star OS 正在建立託管 EXE 的宿主視窗。',
    managedExeStartFailed: '啟動失敗',
    managedExeAppStartFailed: '應用啟動失敗',
    managedExeExited: '應用已結束',
    managedExeExitCode: '結束代碼：{code}',
    managedExeSearching: '正在接管應用視窗...',
    managedExeSearchHint: 'Star OS 正持續掃描主視窗，較慢的程式可能需要更久。',
    managedExeWindowNotFound: '找不到可託管的視窗',
    managedExeWindowNotFoundDetail: '程式可能已在外部開啟，但未暴露可嵌入託管的原生主視窗。',
    managedExeReady: '應用正在 Star OS 視窗中執行。',
    managedExeReadyDetail: '此 EXE 仍由 Windows 執行，但其視窗現在已由 Star OS 託管。'
  },
  en: {
    managedExeOnlyWindows: 'Managed EXE hosting is only available on Windows.',
    managedExeExecutableNotFound: 'Executable file not found.',
    managedExeWaitingTitle: 'Attaching app window...',
    managedExeWaitingHint: 'Star OS is hosting the external EXE inside an internal app window.',
    managedExeExitHint: 'The app has exited. This window will close shortly.',
    managedExeSyncFailed: 'Window sync failed',
    managedExeLaunching: 'Launching app...',
    managedExeLaunchHost: 'Star OS is creating the managed EXE host window.',
    managedExeStartFailed: 'Launch failed',
    managedExeAppStartFailed: 'App launch failed',
    managedExeExited: 'App exited',
    managedExeExitCode: 'Exit code: {code}',
    managedExeSearching: 'Attaching app window...',
    managedExeSearchHint: 'Star OS is still scanning for the main window. Slower apps may take longer.',
    managedExeWindowNotFound: 'No hostable window found',
    managedExeWindowNotFoundDetail: 'The program may have opened externally, but no embeddable native main window was exposed.',
    managedExeReady: 'The app is running inside a Star OS window.',
    managedExeReadyDetail: 'This EXE is still executed by Windows, but its window is now hosted by Star OS.'
  },
  ja: {
    managedExeOnlyWindows: '管理対象 EXE のホスト実行は Windows でのみ利用できます。',
    managedExeExecutableNotFound: '実行ファイルが見つかりません。',
    managedExeWaitingTitle: 'アプリのウィンドウを接続中...',
    managedExeWaitingHint: 'Star OS は外部 EXE を内部アプリウィンドウ内でホストしています。',
    managedExeExitHint: 'アプリは終了しました。このウィンドウはまもなく閉じます。',
    managedExeSyncFailed: 'ウィンドウ同期に失敗しました',
    managedExeLaunching: 'アプリを起動中...',
    managedExeLaunchHost: 'Star OS は管理対象 EXE のホストウィンドウを作成しています。',
    managedExeStartFailed: '起動に失敗しました',
    managedExeAppStartFailed: 'アプリの起動に失敗しました',
    managedExeExited: 'アプリは終了しました',
    managedExeExitCode: '終了コード: {code}',
    managedExeSearching: 'アプリのウィンドウを接続中...',
    managedExeSearchHint: 'Star OS はメインウィンドウを引き続きスキャンしています。起動が遅いアプリは時間がかかる場合があります。',
    managedExeWindowNotFound: 'ホスト可能なウィンドウが見つかりません',
    managedExeWindowNotFoundDetail: 'プログラムは外部で開かれた可能性がありますが、埋め込み可能なネイティブのメインウィンドウは公開されていませんでした。',
    managedExeReady: 'アプリは Star OS のウィンドウ内で実行中です。',
    managedExeReadyDetail: 'この EXE 自体は引き続き Windows 上で実行されていますが、そのウィンドウは現在 Star OS によってホストされています。'
  },
  ko: {
    managedExeOnlyWindows: '관리형 EXE 호스팅은 Windows에서만 사용할 수 있습니다.',
    managedExeExecutableNotFound: '실행 파일을 찾을 수 없습니다.',
    managedExeWaitingTitle: '앱 창을 연결하는 중...',
    managedExeWaitingHint: 'Star OS가 외부 EXE를 내부 앱 창 안에서 호스팅하고 있습니다.',
    managedExeExitHint: '앱이 종료되었습니다. 이 창은 곧 닫힙니다.',
    managedExeSyncFailed: '창 동기화 실패',
    managedExeLaunching: '앱을 시작하는 중...',
    managedExeLaunchHost: 'Star OS가 관리형 EXE 호스트 창을 만드는 중입니다.',
    managedExeStartFailed: '실행 실패',
    managedExeAppStartFailed: '앱 실행 실패',
    managedExeExited: '앱이 종료되었습니다',
    managedExeExitCode: '종료 코드: {code}',
    managedExeSearching: '앱 창을 연결하는 중...',
    managedExeSearchHint: 'Star OS가 메인 창을 계속 검색 중입니다. 느린 앱은 더 오래 걸릴 수 있습니다.',
    managedExeWindowNotFound: '호스팅 가능한 창을 찾을 수 없습니다',
    managedExeWindowNotFoundDetail: '프로그램이 외부에서 열렸을 수 있지만, 내장 가능한 기본 메인 창이 노출되지 않았습니다.',
    managedExeReady: '앱이 Star OS 창 안에서 실행 중입니다.',
    managedExeReadyDetail: '이 EXE는 계속 Windows에서 실행되지만, 해당 창은 이제 Star OS가 호스팅합니다.'
  }
};
let currentMainLocale = 'zh-CN';

try {
  // Reduce noisy STUN/WebRTC DNS lookups from pages opened inside the built-in browser.
  app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'disable_non_proxied_udp');
} catch (_) {}

function normalizeMainLocale(locale) {
  return Object.prototype.hasOwnProperty.call(MAIN_I18N, locale) ? locale : 'zh-CN';
}

function formatMainText(value, params) {
  if (typeof value !== 'string' || !params) return value;
  return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    const next = params[key];
    return next === undefined || next === null ? `{${key}}` : String(next);
  });
}

function tm(key, params, locale = currentMainLocale) {
  const nextLocale = normalizeMainLocale(locale);
  const localeMap = MAIN_I18N[nextLocale] || {};
  const enMap = MAIN_I18N.en || {};
  const zhMap = MAIN_I18N['zh-CN'] || {};
  const raw =
    (localeMap[key] ?? (
      nextLocale === 'zh-TW'
        ? (zhMap[key] ?? enMap[key])
        : (enMap[key] ?? zhMap[key])
    ) ?? key);
  return formatMainText(raw, params);
}

function resolveManagedExeStatusPayload(payload = {}, locale = currentMainLocale) {
  const next = Object.assign({}, payload);
  if (!next.message && next.messageKey) {
    next.message = tm(next.messageKey, next.messageParams, locale);
  }
  if ((next.detail === undefined || next.detail === null) && next.detailKey) {
    next.detail = tm(next.detailKey, next.detailParams, locale);
  }
  return next;
}

function nativeHandleToString(handle) {
  try {
    if (!handle) return '0';
    if (typeof handle === 'bigint') return handle.toString();
    if (Buffer.isBuffer(handle)) {
      if (handle.length >= 8) return handle.readBigUInt64LE(0).toString();
      if (handle.length >= 4) return String(handle.readUInt32LE(0));
    }
    return String(handle);
  } catch (_) {
    return '0';
  }
}

function splitCommandArgs(input) {
  const args = [];
  const source = String(input || '').trim();
  if (!source) return args;
  source.replace(/"([^\"]*)"|([^\s]+)/g, (_, quoted, bare) => {
    args.push(typeof quoted === 'string' ? quoted : bare);
    return '';
  });
  return args;
}

function splitLaunchCommand(input) {
  const source = String(input || '').trim();
  if (!source) return null;
  const quoted = source.match(/^"([^"]+)"(?:\s+(.*))?$/);
  if (quoted) {
    return { command: quoted[1], args: splitCommandArgs(quoted[2] || '') };
  }
  const bare = source.match(/^([^\s]+)(?:\s+(.*))?$/);
  if (!bare) return { command: source, args: [] };
  return { command: bare[1], args: splitCommandArgs(bare[2] || '') };
}

function parseManagedExecutableTarget(target) {
  const parsed = splitLaunchCommand(target);
  if (!parsed || !parsed.command) return null;
  if (!isManagedExecutablePath(parsed.command)) return null;
  return { exePath: parsed.command, args: parsed.args };
}

function isManagedExecutablePath(targetPath) {
  const ext = path.extname(String(targetPath || '')).toLowerCase();
  return ext === '.exe' || ext === '.com';
}

function getExecutableCandidateNames(command) {
  const source = String(command || '').trim();
  if (!source) return [];
  const ext = path.extname(source).toLowerCase();
  if (ext) return isManagedExecutablePath(source) ? [source] : [];
  const pathext = process.platform === 'win32'
    ? String(process.env.PATHEXT || '.COM;.EXE').split(';').map(item => item.trim().toLowerCase()).filter(Boolean)
    : ['.exe', '.com'];
  const allowed = Array.from(new Set(pathext.filter(item => item === '.exe' || item === '.com')));
  return allowed.length ? allowed.map(item => source + item) : [source + '.exe', source + '.com'];
}

async function resolveManagedExecutableTarget(target, cwd) {
  if (process.platform !== 'win32') return null;
  const raw = String(target || '').trim();
  if (!raw) return null;
  // Prefer treating raw target as a direct path first (supports spaces without quotes).
  const rawAbs = path.isAbsolute(raw)
    ? raw
    : path.resolve(cwd && String(cwd).trim() ? String(cwd).trim() : (process.env.USERPROFILE || process.env.HOME || process.cwd()), raw);
  const rawStat = await safeStat(rawAbs);
  if (rawStat && rawStat.isFile() && isManagedExecutablePath(rawAbs)) {
    return { exePath: rawAbs, args: [] };
  }
  const parsed = splitLaunchCommand(target);
  if (!parsed || !parsed.command) return null;
  const command = parsed.command.trim();
  if (!command) return null;

  const candidateNames = getExecutableCandidateNames(command);
  if (!candidateNames.length) return null;

  const searchBase = cwd && String(cwd).trim()
    ? path.resolve(String(cwd).trim())
    : (process.env.USERPROFILE || process.env.HOME || process.cwd());
  const hasSeparators = /[\\/]/.test(command);
  const searchDirs = path.isAbsolute(command)
    ? ['']
    : (hasSeparators
      ? [searchBase]
      : [searchBase, ...String(process.env.PATH || '').split(path.delimiter).filter(Boolean)]);

  for (const dir of searchDirs) {
    for (const candidateName of candidateNames) {
      const fullPath = path.isAbsolute(candidateName)
        ? candidateName
        : path.resolve(dir || searchBase, candidateName);
      const stat = await safeStat(fullPath);
      if (stat && stat.isFile() && isManagedExecutablePath(fullPath)) {
        return { exePath: fullPath, args: parsed.args };
      }
    }
  }
  return null;
}

async function resolveExistingLaunchPath(target, cwd) {
  const raw = String(target || '').trim();
  if (!raw) return null;
  const baseDirRaw = cwd && String(cwd).trim()
    ? path.resolve(String(cwd).trim())
    : (process.env.USERPROFILE || process.env.HOME || process.cwd());
  const rawFullPath = path.isAbsolute(raw) ? raw : path.resolve(baseDirRaw, raw);
  const rawStat = await safeStat(rawFullPath);
  if (rawStat && rawStat.isFile()) return rawFullPath;

  const parsed = splitLaunchCommand(target);
  if (!parsed || !parsed.command || (parsed.args && parsed.args.length)) return null;
  const command = parsed.command.trim();
  if (!command) return null;
  const baseDir = cwd && String(cwd).trim()
    ? path.resolve(String(cwd).trim())
    : (process.env.USERPROFILE || process.env.HOME || process.cwd());
  const fullPath = path.isAbsolute(command) ? command : path.resolve(baseDir, command);
  const stat = await safeStat(fullPath);
  return stat && stat.isFile() ? fullPath : null;
}

function runManagedExeHelper(action, options = {}) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      reject(new Error(tm('managedExeOnlyWindows')));
      return;
    }
    const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', managedExeHelperPath, '-Action', action];
    Object.entries(options).forEach(([key, value]) => {
      if (value == null || value === '') return;
      args.push('-' + key, String(value));
    });
    const helper = spawn('powershell.exe', args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    helper.stdout.on('data', chunk => { stdout += chunk.toString('utf8'); });
    helper.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); });
    helper.on('error', reject);
    helper.on('close', code => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error((stderr || stdout || ('helper exited with code ' + code)).trim()));
    });
  });
}

function managedExeWait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForManagedExeWindow(pid, exePath, timeoutMs = 45000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const found = await runManagedExeHelper('find', { ProcessId: pid });
      if (found && found !== '0') return found;
    } catch (_) {}
    if (exePath) {
      try {
        const foundByPath = await runManagedExeHelper('findpath', { ProcessPath: exePath });
        if (foundByPath && foundByPath !== '0') return foundByPath;
      } catch (_) {}
    }
    await managedExeWait(250);
  }
  return null;
}

async function getExeIconDataUrl(exePath) {
  try {
    if (typeof app.getFileIcon !== 'function') return '';
    const img = await app.getFileIcon(exePath, { size: 'normal' });
    if (!img || img.isEmpty()) return '';
    return img.toDataURL();
  } catch (_) {
    return '';
  }
}

function sendManagedExeStatus(session, payload = {}) {
  if (!session || !session.hostWin || session.hostWin.isDestroyed()) return;
  const nextStatus = Object.assign({}, session.lastStatus || {}, payload);
  if (Object.prototype.hasOwnProperty.call(payload, 'messageKey') && !Object.prototype.hasOwnProperty.call(payload, 'message')) {
    delete nextStatus.message;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'detailKey') && !Object.prototype.hasOwnProperty.call(payload, 'detail')) {
    delete nextStatus.detail;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'message') && !Object.prototype.hasOwnProperty.call(payload, 'messageKey')) {
    delete nextStatus.messageKey;
    delete nextStatus.messageParams;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'detail') && !Object.prototype.hasOwnProperty.call(payload, 'detailKey')) {
    delete nextStatus.detailKey;
    delete nextStatus.detailParams;
  }
  session.lastStatus = nextStatus;
  const localized = resolveManagedExeStatusPayload(session.lastStatus);
  session.hostWin.webContents.send('managed-exe:status', Object.assign({
    sessionId: session.id,
    title: session.title,
    path: session.exePath,
    isMaximized: session.hostWin.isMaximized()
  }, localized));
}

function refreshManagedExeLocale() {
  managedExeSessions.forEach(session => {
    try {
      sendManagedExeStatus(session, {});
    } catch (_) {}
  });
}

function managedExeHostNativeHandleString(session) {
  try {
    if (!session || !session.hostWin || session.hostWin.isDestroyed()) return '0';
    return nativeHandleToString(session.hostWin.getNativeWindowHandle());
  } catch (_) {
    return '0';
  }
}

async function syncManagedExeBounds(session) {
  if (!session || !session.hwnd || !session.hostWin || session.hostWin.isDestroyed()) return;
  const parentHwnd = managedExeHostNativeHandleString(session);
  await runManagedExeHelper('embed', {
    ParentHwnd: parentHwnd,
    ChildHwnd: session.hwnd,
    Y: 44,
  });
}

async function focusManagedExe(session) {
  if (!session || !session.hwnd) return;
  try {
    await runManagedExeHelper('focus', { ChildHwnd: session.hwnd });
  } catch (_) {}
}

async function hideManagedExeWindow(session) {
  if (!session || !session.hwnd) return;
  try {
    await runManagedExeHelper('hide', { ChildHwnd: session.hwnd });
  } catch (_) {}
}

function focusMainSystemWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    if (mainWindow.isMinimized()) mainWindow.restore();
  } catch (_) {}
  try { app.focus({ steal: true }); } catch (_) {}
  try { mainWindow.show(); } catch (_) {}
  try { mainWindow.moveTop(); } catch (_) {}
  try { mainWindow.setAlwaysOnTop(true, 'screen-saver'); } catch (_) {}
  try { mainWindow.focus(); } catch (_) {}
  setTimeout(() => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(false);
      }
    } catch (_) {}
  }, 180);
}

function killManagedExeProcess(session) {
  if (!session || session.killed || !session.pid) return;
  session.killed = true;
  try {
    const killer = spawn('taskkill', ['/PID', String(session.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    if (killer && typeof killer.unref === 'function') killer.unref();
  } catch (_) {}
}

function bindManagedExeWindow(session) {
  if (!session || !session.hostWin) return;
  const sync = () => syncManagedExeBounds(session)
    .then(() => {
      if (!session.hostWin || session.hostWin.isDestroyed()) return;
      if (session.attached) {
        sendManagedExeStatus(session, { type: 'ready', messageKey: 'managedExeReady', detailKey: 'managedExeReadyDetail' });
        return;
      }
      // 已发过 ready 后不应再被 show/resize 打回「启动中」，否则遮罩会重新盖住已托管窗口
      const prevType = (session.lastStatus && session.lastStatus.type) || '';
      if (prevType === 'ready' || prevType === 'error' || prevType === 'exit') return;
      sendManagedExeStatus(session, { type: 'launching', messageKey: 'managedExeLaunching', detailKey: 'managedExeLaunchHost' });
    })
    .catch(err => sendManagedExeStatus(session, { type: 'error', messageKey: 'managedExeSyncFailed', detail: err.message }));
  ['resize', 'maximize', 'unmaximize', 'restore', 'show'].forEach(eventName => {
    session.hostWin.on(eventName, sync);
  });
  session.hostWin.on('minimize', () => {
    hideManagedExeWindow(session).catch(() => {});
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('managed-exe:taskbar-minimized', { sessionId: session.id, minimized: true });
    }
  });
  session.hostWin.on('restore', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('managed-exe:taskbar-minimized', { sessionId: session.id, minimized: false });
    }
  });
  session.hostWin.on('focus', () => {
    focusManagedExe(session);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('managed-exe:taskbar-focus', session.id);
    }
  });
  session.hostWin.on('close', () => {
    hideManagedExeWindow(session).catch(() => {});
    if (!session.exited) killManagedExeProcess(session);
    setTimeout(() => focusMainSystemWindow(), 0);
    setTimeout(() => focusMainSystemWindow(), 120);
  });
  session.hostWin.on('closed', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('managed-exe:taskbar-unregister', session.id);
    }
    windows.delete(session.hostWin.id);
    managedExeSessions.delete(session.id);
    if (!session.exited) killManagedExeProcess(session);
    focusMainSystemWindow();
  });
}

async function launchManagedExecutable(targetPath, args = []) {
  if (process.platform !== 'win32') {
    return { ok: false, error: tm('managedExeOnlyWindows') };
  }
  const exePath = path.isAbsolute(targetPath) ? targetPath : path.resolve(targetPath);
  const stat = await safeStat(exePath);
  if (!stat || !stat.isFile()) {
    return { ok: false, error: tm('managedExeExecutableNotFound') };
  }

  const title = path.basename(exePath);
  const session = {
    id: 'managed-exe-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8),
    title,
    exePath,
    args: Array.isArray(args) ? args : [],
    attached: false,
    exited: false,
    killed: false,
    hwnd: null,
    pid: 0,
    hostWin: null,
    child: null,
    lastStatus: {
      type: 'launching',
      messageKey: 'managedExeLaunching',
      detailKey: 'managedExeLaunchHost'
    }
  };

  const hostWin = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 720,
    minHeight: 480,
    parent: mainWindow,
    modal: false,
    frame: false,
    show: false,
    backgroundColor: '#08100c',
    webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false }
  });
  session.hostWin = hostWin;
  managedExeSessions.set(session.id, session);
  windows.set(hostWin.id, { appId: 'managed-exe-host', title, win: hostWin, sessionId: session.id });
  bindManagedExeWindow(session);
  const hostHtmlPath = path.join(__dirname, '../renderer/managed-exe-host.html');
  await hostWin.loadFile(hostHtmlPath, {
    query: {
      session: session.id,
      title: encodeURIComponent(title),
      path: encodeURIComponent(exePath),
    },
  });
  if (!hostWin.isDestroyed()) {
    try {
      const bootStatus = JSON.stringify(tm('managedExeWaitingTitle'));
      const bootHint = JSON.stringify(tm('managedExeWaitingHint'));
      await hostWin.webContents.executeJavaScript(
        `(() => { var s = document.getElementById('status'), h = document.getElementById('hint'); if (s) s.textContent = ${bootStatus}; if (h) h.textContent = ${bootHint}; })()`
      );
    } catch (_) {}
    let iconDataUrl = '';
    try {
      iconDataUrl = await getExeIconDataUrl(exePath);
    } catch (_) {}
    if (iconDataUrl) {
      try {
        const snippet = `<img src="${iconDataUrl.replace(/"/g, '&quot;')}" alt="" />`;
        await hostWin.webContents.executeJavaScript(`document.getElementById('title-icon').innerHTML=${JSON.stringify(snippet)}`);
      } catch (_) {}
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('managed-exe:taskbar-register', {
        sessionId: session.id,
        title,
        iconDataUrl,
      });
    }
    hostWin.show();
  }
  sendManagedExeStatus(session, { type: 'launching', messageKey: 'managedExeLaunching', detailKey: 'managedExeLaunchHost' });

  try {
    session.child = spawn(exePath, session.args, { cwd: path.dirname(exePath), detached: false, windowsHide: false, stdio: 'ignore' });
    session.pid = session.child.pid || 0;
  } catch (error) {
    sendManagedExeStatus(session, { type: 'error', messageKey: 'managedExeStartFailed', detail: error.message });
    return { ok: false, error: error.message };
  }

  session.child.on('error', error => {
    sendManagedExeStatus(session, { type: 'error', messageKey: 'managedExeAppStartFailed', detail: error.message });
    if (session.hostWin && !session.hostWin.isDestroyed()) session.hostWin.focus();
  });
  session.child.on('exit', (code, signal) => {
    session.exited = true;
    sendManagedExeStatus(session, {
      type: 'exit',
      messageKey: 'managedExeExited',
      detailKey: 'managedExeExitCode',
      detailParams: { code: code != null ? code : (signal || 0) }
    });
    if (session.hostWin && !session.hostWin.isDestroyed()) {
      setTimeout(() => {
        if (!session.hostWin.isDestroyed()) session.hostWin.close();
      }, 220);
    }
  });

  sendManagedExeStatus(session, { type: 'searching', messageKey: 'managedExeSearching', detailKey: 'managedExeSearchHint' });
  session.hwnd = await waitForManagedExeWindow(session.pid, exePath, 45000);
  if (!session.hwnd) {
    sendManagedExeStatus(session, { type: 'error', messageKey: 'managedExeWindowNotFound', detailKey: 'managedExeWindowNotFoundDetail' });
    return { ok: false, error: tm('managedExeWindowNotFound') };
  }

  try {
    await syncManagedExeBounds(session);
    session.attached = true;
    sendManagedExeStatus(session, { type: 'ready', messageKey: 'managedExeReady', detailKey: 'managedExeReadyDetail' });
    // 再推一次，避免宿主页 listener 注册略晚时漏掉 ready
    setTimeout(() => {
      try {
        if (session.hostWin && !session.hostWin.isDestroyed() && session.attached) {
          sendManagedExeStatus(session, { type: 'ready', messageKey: 'managedExeReady', detailKey: 'managedExeReadyDetail' });
        }
      } catch (_) {}
    }, 120);
  } catch (embedErr) {
    const msg = embedErr && embedErr.message ? embedErr.message : String(embedErr);
    sendManagedExeStatus(session, { type: 'error', messageKey: 'managedExeSyncFailed', detail: msg });
    return { ok: false, error: msg, sessionId: session.id };
  }
  await focusManagedExe(session);
  return { ok: true, managed: true, sessionId: session.id, pid: session.pid };
}


async function pathExists(targetPath) {
  try {
    await fs.promises.access(targetPath);
    return true;
  } catch (_) {
    return false;
  }
}

async function safeStat(targetPath) {
  try {
    return await fs.promises.stat(targetPath);
  } catch (_) {
    return null;
  }
}

function isProtectedSystemDirectoryName(name) {
  return PROTECTED_SYSTEM_DIR_NAMES.has(String(name || '').trim().toLowerCase());
}

async function runPowerShellJson(command, args = [], timeout = 3200) {
  if (process.platform !== 'win32') return null;
  try {
    const { execFile } = require('child_process');
    const stdout = await new Promise((resolve, reject) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-Command', command, ...args],
        {
          windowsHide: true,
          timeout,
          maxBuffer: 4 * 1024 * 1024,
        },
        (err, out) => err ? reject(err) : resolve(out)
      );
    });
    const text = String(stdout || '').trim();
    if (!text) return null;
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

async function getWindowsDirectoryEntryAttributeMap(dirPath) {
  if (process.platform !== 'win32') return new Map();
  const command = "$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.Encoding]::UTF8; $items = Get-ChildItem -LiteralPath $args[0] -Force | Select-Object Name, Attributes; $items | ConvertTo-Json -Compress -Depth 3";
  const parsed = await runPowerShellJson(command, [String(dirPath || '')], 3200);
  const list = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
  const next = new Map();
  list.forEach(item => {
    if (!item || typeof item !== 'object') return;
    const name = String(item.Name || '').trim();
    if (!name) return;
    next.set(name, String(item.Attributes || ''));
  });
  return next;
}

async function getPathVisibilityFlags(targetPath, isDirHint = false) {
  const name = String(path.basename(String(targetPath || '')) || '').trim();
  const fallbackProtected = !!isDirHint && isProtectedSystemDirectoryName(name);
  const fallbackHidden = !!name && name.startsWith('.') && name !== '.' && name !== '..';
  if (process.platform !== 'win32') {
    return { isHidden: fallbackHidden, isSystem: false, isProtected: fallbackProtected };
  }
  const command = "$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.Encoding]::UTF8; $item = Get-Item -LiteralPath $args[0] -Force; $item | Select-Object Name, Attributes | ConvertTo-Json -Compress -Depth 3";
  const parsed = await runPowerShellJson(command, [String(targetPath || '')], 2200);
  const attributes = parsed && typeof parsed === 'object' ? String(parsed.Attributes || '') : '';
  const isProtected = (!!isDirHint && isProtectedSystemDirectoryName(parsed && parsed.Name ? parsed.Name : name)) || fallbackProtected;
  return {
    isHidden: /\bHidden\b/i.test(attributes) || isProtected || fallbackHidden,
    isSystem: /\bSystem\b/i.test(attributes) || isProtected,
    isProtected,
  };
}

function toSafeNumber(value) {
  if (typeof value === 'bigint') return Number(value);
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

async function getDirectorySize(targetPath) {
  let total = 0;
  const entries = await fs.promises.readdir(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name);
    try {
      if (entry.isSymbolicLink && entry.isSymbolicLink()) {
        const stat = await safeStat(fullPath);
        total += stat ? toSafeNumber(stat.size) : 0;
        continue;
      }
      if (entry.isDirectory()) {
        total += await getDirectorySize(fullPath);
        continue;
      }
      const stat = await safeStat(fullPath);
      total += stat ? toSafeNumber(stat.size) : 0;
    } catch (_) {
      // ignore unreadable descendants so one inaccessible child does not break the folder listing
    }
  }
  return total;
}

async function queueDirectorySize(targetPath, mtime) {
  const cached = directorySizeCache.get(targetPath);
  if (cached && cached.mtime === mtime && cached.expiresAt > Date.now()) {
    return cached.size;
  }
  if (directorySizePending.has(targetPath)) {
    return directorySizePending.get(targetPath);
  }
  const pending = getDirectorySize(targetPath)
    .then(size => {
      directorySizeCache.set(targetPath, {
        size,
        mtime,
        expiresAt: Date.now() + DIRECTORY_SIZE_CACHE_TTL_MS,
      });
      return size;
    })
    .catch(() => (cached && cached.mtime === mtime ? cached.size : undefined))
    .finally(() => {
      directorySizePending.delete(targetPath);
    });
  directorySizePending.set(targetPath, pending);
  return pending;
}

async function getEntryMeta(targetPath, isDir, options = {}) {
  const stat = await safeStat(targetPath);
  if (!stat) return { size: undefined, mtime: undefined };
  const mtime = stat.mtimeMs;
  if (!isDir) {
    return { size: toSafeNumber(stat.size), mtime };
  }
  const cached = directorySizeCache.get(targetPath);
  if (cached && cached.mtime === mtime && cached.expiresAt > Date.now()) {
    return { size: cached.size, mtime };
  }
  if (options.eagerDirectorySize) {
    return { size: await queueDirectorySize(targetPath, mtime), mtime };
  }
  queueDirectorySize(targetPath, mtime).catch(() => {});
  return { size: cached && cached.mtime === mtime ? cached.size : undefined, mtime };
}

async function getDriveMeta(rootPath) {
  const stat = await safeStat(rootPath);
  let size;
  const mtime = stat ? stat.mtimeMs : undefined;
  if (typeof fs.promises.statfs === 'function') {
    try {
      const info = await fs.promises.statfs(rootPath);
      size = toSafeNumber(info.blocks) * toSafeNumber(info.bsize);
    } catch (_) {
      // ignore and keep size undefined
    }
  }
  return { size, mtime };
}

async function ensureUniquePath(targetPath) {
  if (!(await pathExists(targetPath))) return targetPath;
  const dir = path.dirname(targetPath);
  const ext = path.extname(targetPath);
  const base = path.basename(targetPath, ext);
  let index = 2;
  while (true) {
    const next = path.join(dir, `${base} (${index})${ext}`);
    if (!(await pathExists(next))) return next;
    index++;
  }
}

async function copyRecursive(src, dest) {
  if (fs.promises.cp) {
    await fs.promises.cp(src, dest, { recursive: true, force: false, errorOnExist: true });
    return;
  }
  const stat = await fs.promises.stat(src);
  if (stat.isDirectory()) {
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src);
    for (const entry of entries) {
      await copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  await fs.promises.copyFile(src, dest);
}

async function removeRecursive(targetPath) {
  await fs.promises.rm(targetPath, { recursive: true, force: false });
}

function isSubPath(parentPath, childPath) {
  const from = path.resolve(parentPath).toLowerCase();
  const to = path.resolve(childPath).toLowerCase();
  return to === from || to.startsWith(from + path.sep);
}

function shouldOpenInInternalBrowser(url) {
  const text = String(url || '').trim();
  if (!text) return false;
  return /^https?:\/\//i.test(text)
    || /^file:\/\//i.test(text)
    || /^star-file:\/\//i.test(text)
    || /^about:/i.test(text);
}

function routeUrlToInternalBrowser(url) {
  const nextUrl = String(url || '').trim();
  if (!shouldOpenInInternalBrowser(nextUrl)) return false;
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  mainWindow.webContents.send('browser:new-tab', nextUrl);
  return true;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    frame: false,
    transparent: false,
    show: false,
    backgroundColor: '#08111f',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      webviewTag: true
    },
  });
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.show();
  });

  // Route window.open / target=_blank into the internal browser whenever possible.
  // Fall back to the external browser only when the internal route cannot handle it.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (routeUrlToInternalBrowser(url)) return { action: 'deny' };
      if (url) shell.openExternal(url).catch(() => {});
      return { action: 'deny' };
    } catch {
      return { action: 'deny' };
    }
  });
}

app.whenReady().then(() => {
  try {
    const registerStarFileForSession = (targetSession) => {
      if (!targetSession || !targetSession.protocol || typeof targetSession.protocol.registerFileProtocol !== 'function') return;
      targetSession.protocol.registerFileProtocol('star-file', (request, callback) => {
        try {
          const rawUrl = String(request && request.url ? request.url : '');
          let resolvedPath = '';
          try {
            const u = new URL(rawUrl);
            // Preferred format: star-file:///C:/path/to/file.html
            if (u && (u.pathname || u.hostname)) {
              if (u.hostname) {
                // Compatibility format seen in older renderer paths:
                //   star-file://d/folder/file.html
                // Treat a single-letter host plus pathname as a Windows drive path.
                if (process.platform === 'win32' && /^[A-Za-z]$/.test(u.hostname || '')) {
                  const drive = String(u.hostname || '').toUpperCase();
                  let pathnameDecoded = '';
                  try { pathnameDecoded = decodeURIComponent(u.pathname || ''); } catch (_) { pathnameDecoded = u.pathname || ''; }
                  const rest = String(pathnameDecoded || '').replace(/^\/+/, '').replace(/\//g, '\\');
                  resolvedPath = drive + ':\\' + rest;
                  if (!rest) resolvedPath = drive + ':\\';
                } else {
                // Legacy format: star-file://<encodeURIComponent(fullPath)>
                // NOTE: In this legacy format, the "hostname" is actually the encoded file path.
                // Relative resources become star-file://<encodedPathToHtml>/asset.js, so we need to
                // resolve them against the directory of the html file.
                let hostDecoded = '';
                try { hostDecoded = decodeURIComponent(u.hostname || ''); } catch (_) { hostDecoded = u.hostname || ''; }
                let pathnameDecoded = '';
                try { pathnameDecoded = decodeURIComponent(u.pathname || ''); } catch (_) { pathnameDecoded = u.pathname || ''; }

                if (process.platform === 'win32') hostDecoded = hostDecoded.replace(/\//g, '\\');
                else hostDecoded = hostDecoded.replace(/\\/g, '/');

                if (!pathnameDecoded || pathnameDecoded === '/') {
                  resolvedPath = hostDecoded;
                } else {
                  const rel = String(pathnameDecoded).replace(/^\/+/, '');
                  const base = /[.][a-z0-9]{1,8}$/i.test(hostDecoded) ? path.dirname(hostDecoded) : hostDecoded;
                  resolvedPath = path.join(base, rel);
                }
                }
              } else {
                resolvedPath = decodeURIComponent(u.pathname || '');
                // Windows paths often arrive as /C:/... (leading slash from URL pathname)
                if (process.platform === 'win32' && /^[\\/][A-Za-z]:[\\/]/.test(resolvedPath)) {
                  resolvedPath = resolvedPath.slice(1);
                }
                resolvedPath = resolvedPath.replace(/\//g, path.sep);
              }
            }
          } catch (_) {
            resolvedPath = rawUrl.replace(/^star-file:\/\//i, '');
            try { resolvedPath = decodeURIComponent(resolvedPath); } catch (_) {}
          }
          if (!resolvedPath) {
            callback({ error: -6 }); // FILE_NOT_FOUND
            return;
          }
          callback({ path: resolvedPath });
        } catch (_) {
          try { callback({ error: -2 }); } catch (_) {}
        }
      });
    };

    // Register protocol for both default session and the browser's persistent partition.
    try { registerStarFileForSession(session.defaultSession); } catch (_) {}
    try { registerStarFileForSession(session.fromPartition('persist:star-browser')); } catch (_) {}
    // Fallback for older Electron: keep default protocol registration best-effort.
    try {
      protocol.registerFileProtocol('star-file', (request, callback) => {
        try { callback({ path: String(request && request.url ? request.url : '').replace(/^star-file:\/\//i, '') }); } catch (_) {}
      });
    } catch (_) {}
  } catch (_) {}
  try {
    if (session && session.defaultSession && typeof session.defaultSession.setWebRTCIPHandlingPolicy === 'function') {
      session.defaultSession.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
    }
  } catch (_) {}
  try {
    const browserSession = session.fromPartition('persist:star-browser');
    if (browserSession && typeof browserSession.setWebRTCIPHandlingPolicy === 'function') {
      browserSession.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
    }
  } catch (_) {}
  try {
    loadBrowserDownloadRecords();
  } catch (_) {}
  try {
    bindBrowserDownloadSessions();
  } catch (_) {}
  try {
    bindBrowserNetworkSessions();
  } catch (_) {}
  createMainWindow();
});

app.on('web-contents-created', (_event, contents) => {
  try {
    if (!contents || typeof contents.getType !== 'function' || contents.getType() !== 'webview') return;
    try {
      // Ensure downloads from any browser webview session are captured by internal download manager.
      const webviewSession = contents.session;
      if (webviewSession) {
        bindBrowserDownloadSession(webviewSession);
        bindBrowserNetworkSession(webviewSession);
      }
    } catch (_) {}
    contents.on('before-input-event', (event, input) => {
      try {
        const key = String((input && input.key) || '').toLowerCase();
        const wantsDevTools = key === 'f12'
          || (((input && input.control) || (input && input.meta)) && input && input.shift && key === 'i');
        if (!wantsDevTools) return;
        event.preventDefault();
        if (!mainWindow || mainWindow.isDestroyed()) return;
        try {
          mainWindow.webContents.send('browser:open-self-devtools', { webContentsId: contents.id });
        } catch (_) {}
      } catch (_) {}
    });
    contents.on('context-menu', (event, params) => {
      try {
        // Use Star OS internal menu for the built-in browser webview.
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const p = params && typeof params === 'object' ? params : {};
        const flags = p.editFlags && typeof p.editFlags === 'object' ? p.editFlags : {};
        if (contents && contents.id) {
          if (p.isEditable) {
            captureWebviewEditSnapshot(contents)
              .then(snapshot => {
                if (snapshot) browserWebviewEditSnapshots.set(contents.id, snapshot);
                else browserWebviewEditSnapshots.delete(contents.id);
              })
              .catch(() => {
                browserWebviewEditSnapshots.delete(contents.id);
              });
          } else {
            browserWebviewEditSnapshots.delete(contents.id);
          }
        }
        mainWindow.webContents.send('browser:webview-context-menu', {
          webContentsId: contents.id,
          x: Number(p.x) || 0,
          y: Number(p.y) || 0,
          selectionText: typeof p.selectionText === 'string' ? p.selectionText : '',
          isEditable: !!p.isEditable,
          editFlags: {
            canCut: !!flags.canCut,
            canCopy: !!flags.canCopy,
            canPaste: !!flags.canPaste,
            canSelectAll: !!flags.canSelectAll
          }
        });
      } catch (_) {}
    });
    contents.setWindowOpenHandler(({ url }) => {
      try {
        if (!routeUrlToInternalBrowser(url) && url) shell.openExternal(url).catch(() => {});
      } catch (_) {}
      return { action: 'deny' };
    });
  } catch (_) {}
});

app.on('before-quit', () => {
  try {
    if (browserDownloadPersistTimer) {
      clearTimeout(browserDownloadPersistTimer);
      browserDownloadPersistTimer = null;
    }
  } catch (_) {}
  saveBrowserDownloadRecordsNow();
  managedExeSessions.forEach(session => killManagedExeProcess(session));
});

app.on('window-all-closed', () => app.quit());

ipcMain.on('os:quit', () => app.quit());
ipcMain.on('os:set-locale', (_event, locale) => {
  currentMainLocale = normalizeMainLocale(locale);
  refreshManagedExeLocale();
});

function getBrowserSession() {
  return session.fromPartition('persist:star-browser');
}

function emitBrowserDownloadUpdate(record) {
  try {
    if (!record || !mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('browser:download-updated', Object.assign({}, record));
  } catch (_) {}
}

function sanitizeDownloadName(name) {
  const raw = String(name || '').trim();
  if (!raw) return 'download.bin';
  return raw.replace(/[\\/:*?"<>|]+/g, '_') || 'download.bin';
}

function resolveUniqueDownloadPath(dirPath, fileName) {
  const safeName = sanitizeDownloadName(fileName);
  const ext = path.extname(safeName);
  const base = ext ? safeName.slice(0, -ext.length) : safeName;
  let attempt = path.join(dirPath, safeName);
  let idx = 1;
  while (fs.existsSync(attempt)) {
    attempt = path.join(dirPath, `${base} (${idx})${ext}`);
    idx += 1;
  }
  return attempt;
}

function ensureBrowserDownloadDir() {
  try {
    const dirPath = path.join(app.getPath('downloads'), 'StarBrowser');
    fs.mkdirSync(dirPath, { recursive: true });
    return dirPath;
  } catch (_) {
    return app.getPath('downloads');
  }
}

function getBrowserDownloadsStorePath() {
  try {
    return path.join(app.getPath('userData'), 'browser-downloads.json');
  } catch (_) {
    return path.join(__dirname, '../browser-downloads.json');
  }
}

function normalizeBrowserDownloadRecord(record) {
  if (!record || typeof record !== 'object') return null;
  const savePath = String(record.savePath || '').trim();
  const normalized = {
    id: String(record.id || '').trim(),
    url: String(record.url || '').trim(),
    fileName: String(record.fileName || '').trim() || (savePath ? path.basename(savePath) : 'download.bin'),
    savePath,
    totalBytes: Math.max(0, Number(record.totalBytes) || 0),
    receivedBytes: Math.max(0, Number(record.receivedBytes) || 0),
    sourceContentsId: Math.max(0, Number(record.sourceContentsId) || 0),
    state: String(record.state || '').trim() || 'completed',
    canResume: !!record.canResume,
    startTime: Math.max(0, Number(record.startTime) || 0) || Date.now(),
    updatedAt: Math.max(0, Number(record.updatedAt) || 0) || Date.now(),
    error: String(record.error || '').trim()
  };
  if (!normalized.id) return null;
  if (normalized.state === 'downloading' || normalized.state === 'paused') {
    normalized.state = 'interrupted';
    normalized.canResume = false;
  }
  return normalized;
}

function serializeBrowserDownloadRecords() {
  return Array.from(browserDownloadRecords.values())
    .map(normalizeBrowserDownloadRecord)
    .filter(Boolean)
    .sort((a, b) => Number(b.startTime || 0) - Number(a.startTime || 0));
}

function saveBrowserDownloadRecordsNow() {
  try {
    const storePath = getBrowserDownloadsStorePath();
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const tempPath = `${storePath}.tmp`;
    const payload = JSON.stringify({ downloads: serializeBrowserDownloadRecords() }, null, 2);
    fs.writeFileSync(tempPath, payload, 'utf8');
    fs.renameSync(tempPath, storePath);
  } catch (_) {}
}

function scheduleSaveBrowserDownloadRecords() {
  try {
    if (browserDownloadPersistTimer) clearTimeout(browserDownloadPersistTimer);
  } catch (_) {}
  browserDownloadPersistTimer = setTimeout(() => {
    browserDownloadPersistTimer = null;
    saveBrowserDownloadRecordsNow();
  }, 180);
}

function loadBrowserDownloadRecords() {
  try {
    const storePath = getBrowserDownloadsStorePath();
    if (!fs.existsSync(storePath)) return;
    const raw = fs.readFileSync(storePath, 'utf8');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed && parsed.downloads)
        ? parsed.downloads
        : [];
    let maxSeed = browserDownloadSeed;
    for (const entry of list) {
      const normalized = normalizeBrowserDownloadRecord(entry);
      if (!normalized || !normalized.id || browserDownloadRecords.has(normalized.id)) continue;
      browserDownloadRecords.set(normalized.id, normalized);
      const seedMatch = /-(\d+)$/.exec(normalized.id);
      if (seedMatch) {
        const seedValue = Number(seedMatch[1]) || 0;
        if (seedValue > maxSeed) maxSeed = seedValue;
      }
    }
    browserDownloadSeed = maxSeed;
  } catch (_) {}
}

function createDownloadRecord(item, sourceContentsId) {
  const id = `dl-${Date.now()}-${++browserDownloadSeed}`;
  const fileName = sanitizeDownloadName(item && typeof item.getFilename === 'function' ? item.getFilename() : 'download.bin');
  const downloadDir = ensureBrowserDownloadDir();
  const savePath = resolveUniqueDownloadPath(downloadDir, fileName);
  try { if (item && typeof item.setSavePath === 'function') item.setSavePath(savePath); } catch (_) {}
  const totalBytes = item && typeof item.getTotalBytes === 'function' ? Number(item.getTotalBytes()) || 0 : 0;
  const receivedBytes = item && typeof item.getReceivedBytes === 'function' ? Number(item.getReceivedBytes()) || 0 : 0;
  const urlChain = item && typeof item.getURLChain === 'function' ? item.getURLChain() : [];
  const url = Array.isArray(urlChain) && urlChain.length
    ? String(urlChain[urlChain.length - 1] || '')
    : String(item && typeof item.getURL === 'function' ? item.getURL() : '');
  return {
    id,
    url,
    fileName: path.basename(savePath),
    savePath,
    totalBytes,
    receivedBytes,
    sourceContentsId: Number(sourceContentsId) || 0,
    state: 'downloading',
    canResume: false,
    startTime: Date.now(),
    updatedAt: Date.now(),
    error: ''
  };
}

function bindBrowserDownloadItem(item, sourceContentsId) {
  if (!item) return;
  const record = createDownloadRecord(item, sourceContentsId);
  browserDownloadRecords.set(record.id, record);
  browserDownloadLiveItems.set(record.id, item);
  browserDownloadItemMeta.set(item, { id: record.id });
  scheduleSaveBrowserDownloadRecords();
  emitBrowserDownloadUpdate(record);

  item.on('updated', (_event, state) => {
    const meta = browserDownloadItemMeta.get(item);
    if (!meta || !meta.id) return;
    const current = browserDownloadRecords.get(meta.id);
    if (!current) return;
    current.receivedBytes = item && typeof item.getReceivedBytes === 'function' ? Number(item.getReceivedBytes()) || current.receivedBytes : current.receivedBytes;
    current.totalBytes = item && typeof item.getTotalBytes === 'function' ? Number(item.getTotalBytes()) || current.totalBytes : current.totalBytes;
    current.canResume = !!(item && typeof item.canResume === 'function' && item.canResume());
    current.updatedAt = Date.now();
    if (state === 'interrupted') current.state = 'interrupted';
    else if (item && typeof item.isPaused === 'function' && item.isPaused()) current.state = 'paused';
    else current.state = 'downloading';
    scheduleSaveBrowserDownloadRecords();
    emitBrowserDownloadUpdate(current);
  });

  item.once('done', (_event, state) => {
    const meta = browserDownloadItemMeta.get(item);
    if (!meta || !meta.id) return;
    const current = browserDownloadRecords.get(meta.id);
    if (!current) return;
    current.receivedBytes = item && typeof item.getReceivedBytes === 'function' ? Number(item.getReceivedBytes()) || current.receivedBytes : current.receivedBytes;
    current.totalBytes = item && typeof item.getTotalBytes === 'function' ? Number(item.getTotalBytes()) || current.totalBytes : current.totalBytes;
    current.updatedAt = Date.now();
    current.canResume = !!(item && typeof item.canResume === 'function' && item.canResume());
    if (state === 'completed') current.state = 'completed';
    else if (state === 'cancelled') current.state = 'cancelled';
    else current.state = 'failed';
    if (current.state !== 'completed' && !current.error) current.error = String(state || 'download_failed');
    browserDownloadLiveItems.delete(meta.id);
    scheduleSaveBrowserDownloadRecords();
    emitBrowserDownloadUpdate(current);
  });
}

function bindBrowserDownloadSession(nextSession) {
  if (!nextSession || browserDownloadBoundSessions.has(nextSession)) return;
  browserDownloadBoundSessions.add(nextSession);
  nextSession.on('will-download', (event, item, contents) => {
    try {
      bindBrowserDownloadItem(item, contents && contents.id ? Number(contents.id) : 0);
    } catch (_) {}
  });
}

function bindBrowserDownloadSessions() {
  try { bindBrowserDownloadSession(getBrowserSession()); } catch (_) {}
}

function emitBrowserNetworkUpdate(record) {
  try {
    if (!record || !mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('browser:network-updated', Object.assign({}, record));
  } catch (_) {}
}

function pushBrowserNetworkRecord(record) {
  if (!record || typeof record !== 'object') return;
  browserNetworkRecords.push(record);
  if (browserNetworkRecords.length > BROWSER_NETWORK_MAX_RECORDS) {
    browserNetworkRecords.splice(0, browserNetworkRecords.length - BROWSER_NETWORK_MAX_RECORDS);
  }
  emitBrowserNetworkUpdate(record);
}

function bindBrowserNetworkSession(nextSession) {
  if (!nextSession || browserNetworkBoundSessions.has(nextSession)) return;
  browserNetworkBoundSessions.add(nextSession);
  try {
    // IMPORTANT: onBeforeRequest is a blocking handler. We must always call callback,
    // otherwise requests can stall and pages will never load.
    const beforeRequest = (details, callback) => {
      try {
        if (details && details.id) {
          const requestKey = `${Number(details.webContentsId || 0)}:${String(details.id)}`;
          browserNetworkRequestStarts.set(requestKey, Number(details.timestamp) || Date.now());
        }
      } catch (_) {}
      try {
        if (typeof callback === 'function') callback({ cancel: false });
      } catch (_) {}
    };
    const onCompleted = (details) => {
      try {
        const requestId = String(details && details.id ? details.id : '');
        const requestKey = `${Number(details && details.webContentsId ? details.webContentsId : 0)}:${requestId}`;
        const startAt = requestId ? browserNetworkRequestStarts.get(requestKey) : null;
        if (requestId) browserNetworkRequestStarts.delete(requestKey);
        pushBrowserNetworkRecord({
          id: 'net-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8),
          webContentsId: Number(details && details.webContentsId ? details.webContentsId : 0),
          url: String(details && details.url ? details.url : ''),
          method: String(details && details.method ? details.method : 'GET'),
          resourceType: String(details && details.resourceType ? details.resourceType : 'other'),
          statusCode: Number(details && details.statusCode ? details.statusCode : 0),
          state: 'completed',
          fromCache: !!(details && details.fromCache),
          ip: String(details && details.ip ? details.ip : ''),
          error: '',
          timestamp: Number(details && details.timestamp ? details.timestamp : Date.now()),
          durationMs: Number(details && details.timestamp ? details.timestamp : Date.now()) - Number(startAt || 0)
        });
      } catch (_) {}
    };
    const onError = (details) => {
      try {
        const requestId = String(details && details.id ? details.id : '');
        const requestKey = `${Number(details && details.webContentsId ? details.webContentsId : 0)}:${requestId}`;
        const startAt = requestId ? browserNetworkRequestStarts.get(requestKey) : null;
        if (requestId) browserNetworkRequestStarts.delete(requestKey);
        pushBrowserNetworkRecord({
          id: 'net-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8),
          webContentsId: Number(details && details.webContentsId ? details.webContentsId : 0),
          url: String(details && details.url ? details.url : ''),
          method: String(details && details.method ? details.method : 'GET'),
          resourceType: String(details && details.resourceType ? details.resourceType : 'other'),
          statusCode: 0,
          state: 'error',
          fromCache: false,
          ip: '',
          error: String(details && details.error ? details.error : 'network_error'),
          timestamp: Number(details && details.timestamp ? details.timestamp : Date.now()),
          durationMs: Number(details && details.timestamp ? details.timestamp : Date.now()) - Number(startAt || 0)
        });
      } catch (_) {}
    };
    nextSession.webRequest.onBeforeRequest(beforeRequest);
    nextSession.webRequest.onCompleted(onCompleted);
    nextSession.webRequest.onErrorOccurred(onError);
  } catch (_) {}
}

function bindBrowserNetworkSessions() {
  try { bindBrowserNetworkSession(getBrowserSession()); } catch (_) {}
}

function normalizeCookieDomain(domain) {
  return String(domain || '').trim().replace(/^\.+/, '');
}

function buildCookieUrlFromDetails(details) {
  const domain = normalizeCookieDomain(details && details.domain);
  if (!domain) return '';
  const rawPath = String((details && details.path) || '/').trim() || '/';
  const cookiePath = rawPath.startsWith('/') ? rawPath : ('/' + rawPath);
  const secure = !!(details && details.secure);
  return (secure ? 'https://' : 'http://') + domain + cookiePath;
}

function normalizeCookieSameSite(value) {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'no_restriction' || text === 'none') return 'no_restriction';
  if (text === 'strict') return 'strict';
  if (text === 'lax') return 'lax';
  return 'unspecified';
}

function mapCookieForRenderer(cookie) {
  const domain = String(cookie && cookie.domain ? cookie.domain : '').trim();
  const pathValue = String(cookie && cookie.path ? cookie.path : '/').trim() || '/';
  const secure = !!(cookie && cookie.secure);
  return {
    name: String(cookie && cookie.name ? cookie.name : ''),
    value: String(cookie && cookie.value ? cookie.value : ''),
    domain,
    path: pathValue,
    secure,
    httpOnly: !!(cookie && cookie.httpOnly),
    session: !!(cookie && cookie.session),
    expirationDate: cookie && cookie.expirationDate != null ? Number(cookie.expirationDate) : null,
    sameSite: normalizeCookieSameSite(cookie && cookie.sameSite),
    hostOnly: !!(cookie && cookie.hostOnly),
    url: buildCookieUrlFromDetails({ domain, path: pathValue, secure })
  };
}

ipcMain.handle('browser:clearData', async () => {
  try {
    const browserSession = getBrowserSession();
    if (!browserSession) return { error: 'Browser session unavailable.' };
    await browserSession.clearStorageData({
      storages: ['cookies', 'localstorage', 'indexdb', 'serviceworkers', 'cachestorage']
    });
    await browserSession.clearCache();
    return { ok: true };
  } catch (error) {
    return { error: error && error.message ? error.message : String(error) };
  }
});

ipcMain.handle('browser:listCookies', async (_event, options) => {
  try {
    const browserSession = getBrowserSession();
    if (!browserSession) return { error: 'Browser session unavailable.' };
    const opts = options && typeof options === 'object' ? options : {};
    const url = opts.url ? String(opts.url).trim() : '';
    const query = {};
    if (url && /^(https?|file|star-file):/i.test(url)) query.url = url;
    const cookies = await browserSession.cookies.get(query);
    const mapped = (Array.isArray(cookies) ? cookies : [])
      .map(mapCookieForRenderer)
      .sort((a, b) => {
        const domainDelta = String(a.domain || '').localeCompare(String(b.domain || ''), 'en', { sensitivity: 'base' });
        if (domainDelta) return domainDelta;
        const nameDelta = String(a.name || '').localeCompare(String(b.name || ''), 'en', { sensitivity: 'base' });
        if (nameDelta) return nameDelta;
        return String(a.path || '').localeCompare(String(b.path || ''), 'en', { sensitivity: 'base' });
      });
    return { ok: true, cookies: mapped };
  } catch (error) {
    return { error: error && error.message ? error.message : String(error) };
  }
});

ipcMain.handle('browser:setCookie', async (_event, payload) => {
  try {
    const browserSession = getBrowserSession();
    if (!browserSession) return { error: 'Browser session unavailable.' };
    const data = payload && typeof payload === 'object' ? payload : {};
    const cookie = data.cookie && typeof data.cookie === 'object' ? data.cookie : {};
    const original = data.original && typeof data.original === 'object' ? data.original : null;
    const name = String(cookie.name || '').trim();
    const domain = normalizeCookieDomain(cookie.domain);
    if (!name) return { error: 'Cookie name is required.' };
    if (!domain) return { error: 'Cookie domain is required.' };
    const pathValue = String(cookie.path || '/').trim() || '/';
    const normalizedPath = pathValue.startsWith('/') ? pathValue : ('/' + pathValue);
    const secure = !!cookie.secure;
    const sessionCookie = !!cookie.session;
    const url = buildCookieUrlFromDetails({ domain, path: normalizedPath, secure });
    if (!url) return { error: 'Cookie URL is invalid.' };

    if (original && original.name && original.url) {
      try {
        await browserSession.cookies.remove(String(original.url), String(original.name));
      } catch (_) {}
    }

    const nextCookie = {
      url,
      name,
      value: String(cookie.value == null ? '' : cookie.value),
      domain,
      path: normalizedPath,
      secure,
      httpOnly: !!cookie.httpOnly,
      sameSite: normalizeCookieSameSite(cookie.sameSite)
    };
    if (!sessionCookie) {
      const expirationDate = Number(cookie.expirationDate);
      if (Number.isFinite(expirationDate) && expirationDate > (Date.now() / 1000)) {
        nextCookie.expirationDate = expirationDate;
      }
    }
    await browserSession.cookies.set(nextCookie);
    return { ok: true, cookie: mapCookieForRenderer(nextCookie) };
  } catch (error) {
    return { error: error && error.message ? error.message : String(error) };
  }
});

ipcMain.handle('browser:removeCookie', async (_event, payload) => {
  try {
    const browserSession = getBrowserSession();
    if (!browserSession) return { error: 'Browser session unavailable.' };
    const data = payload && typeof payload === 'object' ? payload : {};
    const name = String(data.name || '').trim();
    const url = String(data.url || buildCookieUrlFromDetails(data)).trim();
    if (!name || !url) return { error: 'Cookie name or URL is missing.' };
    await browserSession.cookies.remove(url, name);
    return { ok: true };
  } catch (error) {
    return { error: error && error.message ? error.message : String(error) };
  }
});

ipcMain.handle('browser:toggleDevTools', async () => ({
  error: 'Native DevTools are disabled; use the in-app developer sidebar (F12).'
}));

async function runWebviewEditFallback(targetContents, action) {
  if (!targetContents || typeof targetContents.executeJavaScript !== 'function') {
    return { ok: false, error: 'Fallback unavailable.' };
  }
  const actionName = String(action || '').trim();
  const script = `(() => {
    try {
      const action = ${JSON.stringify(actionName)};
      const doc = document;
      if (!doc) return { ok: false, error: 'NO_DOCUMENT' };
      const active = doc.activeElement || null;
      const tag = active && active.tagName ? String(active.tagName).toLowerCase() : '';
      const type = active && active.type ? String(active.type).toLowerCase() : '';
      const isTextInput = !!active && (tag === 'textarea' || (tag === 'input' && !['button','submit','checkbox','radio','range','color','file'].includes(type)));
      const isEditable = !!active && (isTextInput || !!active.isContentEditable);
      const exec = (cmd) => {
        try { return !!doc.execCommand(cmd); } catch (_) { return false; }
      };
      const selectEditableAll = () => {
        if (!active) return false;
        try {
          if (typeof active.focus === 'function') active.focus();
          if (isTextInput && typeof active.select === 'function') {
            active.select();
            return true;
          }
          if (active.isContentEditable) {
            const range = doc.createRange();
            range.selectNodeContents(active);
            const sel = window.getSelection();
            if (!sel) return false;
            sel.removeAllRanges();
            sel.addRange(range);
            return true;
          }
        } catch (_) {}
        return false;
      };

      if (action === 'selectAll') {
        if (selectEditableAll()) return { ok: true };
        return exec('selectAll') ? { ok: true } : { ok: false, error: 'SELECT_ALL_FAILED' };
      }
      if (action === 'copy') {
        return exec('copy') ? { ok: true } : { ok: false, error: 'COPY_FAILED' };
      }
      if (action === 'cut') {
        if (!isEditable) return { ok: false, error: 'CUT_NOT_EDITABLE' };
        return exec('cut') ? { ok: true } : { ok: false, error: 'CUT_FAILED' };
      }
      if (action === 'paste') {
        if (!isEditable) return { ok: false, error: 'PASTE_NOT_EDITABLE' };
        return exec('paste') ? { ok: true } : { ok: false, error: 'PASTE_FAILED' };
      }
      return { ok: false, error: 'UNSUPPORTED_ACTION' };
    } catch (error) {
      return { ok: false, error: error && error.message ? error.message : String(error) };
    }
  })();`;
  try {
    const result = await targetContents.executeJavaScript(script, true);
    if (result && result.ok) return { ok: true };
    return { ok: false, error: result && result.error ? String(result.error) : 'Fallback action failed.' };
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : String(error) };
  }
}

async function captureWebviewEditSnapshot(targetContents) {
  if (!targetContents || typeof targetContents.executeJavaScript !== 'function') {
    return null;
  }
  const script = `(() => {
    try {
      const doc = document;
      const el = doc && doc.activeElement ? doc.activeElement : null;
      if (!el) return null;
      const tag = el.tagName ? String(el.tagName).toLowerCase() : '';
      const type = el.type ? String(el.type).toLowerCase() : '';
      const isTextInput = tag === 'textarea' || (tag === 'input' && !['button','submit','checkbox','radio','range','color','file'].includes(type));
      const isEditable = !!el.isContentEditable;
      if (!isTextInput && !isEditable) return null;
      const path = [];
      let node = el;
      while (node && node !== doc.documentElement) {
        const parent = node.parentElement;
        if (!parent) break;
        path.unshift(Array.prototype.indexOf.call(parent.children, node));
        node = parent;
      }
      const payload = {
        path,
        tag,
        type,
        isTextInput,
        isContentEditable: isEditable
      };
      if (isTextInput) {
        payload.selectionStart = typeof el.selectionStart === 'number' ? el.selectionStart : 0;
        payload.selectionEnd = typeof el.selectionEnd === 'number' ? el.selectionEnd : payload.selectionStart;
      }
      return payload;
    } catch (_) {
      return null;
    }
  })();`;
  try {
    const result = await targetContents.executeJavaScript(script, true);
    return result && typeof result === 'object' ? result : null;
  } catch (_) {
    return null;
  }
}

async function webviewInsertClipboardText(targetContents, text, snapshot) {
  if (!targetContents || typeof targetContents.executeJavaScript !== 'function') {
    return { ok: false, error: 'Insert unavailable.' };
  }
  const value = String(text == null ? '' : text);
  const script = `(() => {
    try {
      const insertText = ${JSON.stringify(value)};
      const snapshot = ${JSON.stringify(snapshot || null)};
      const doc = document;
      const resolveSnapshotElement = () => {
        if (!snapshot || !Array.isArray(snapshot.path) || !doc || !doc.documentElement) return null;
        let node = doc.documentElement;
        for (const index of snapshot.path) {
          if (!node || !node.children || index < 0 || index >= node.children.length) return null;
          node = node.children[index];
        }
        return node || null;
      };
      let el = doc && doc.activeElement ? doc.activeElement : null;
      const activeTag = el && el.tagName ? String(el.tagName).toLowerCase() : '';
      const activeType = el && el.type ? String(el.type).toLowerCase() : '';
      const activeIsTextInput = activeTag === 'textarea' || (activeTag === 'input' && !['button','submit','checkbox','radio','range','color','file'].includes(activeType));
      const activeIsEditable = !!(el && el.isContentEditable);
      if (!activeIsTextInput && !activeIsEditable) {
        const restored = resolveSnapshotElement();
        if (restored) {
          el = restored;
          try { if (typeof el.focus === 'function') el.focus(); } catch (_) {}
        }
      }
      if (!el) return { ok: false, error: 'NO_ACTIVE_ELEMENT' };
      const tag = el.tagName ? String(el.tagName).toLowerCase() : '';
      const type = el.type ? String(el.type).toLowerCase() : '';
      const isTextInput = tag === 'textarea' || (tag === 'input' && !['button','submit','checkbox','radio','range','color','file'].includes(type));
      if (isTextInput) {
        const hasSnapshotSelection = snapshot && typeof snapshot.selectionStart === 'number' && typeof snapshot.selectionEnd === 'number';
        const start = hasSnapshotSelection
          ? snapshot.selectionStart
          : (typeof el.selectionStart === 'number' ? el.selectionStart : (el.value ? el.value.length : 0));
        const end = hasSnapshotSelection
          ? snapshot.selectionEnd
          : (typeof el.selectionEnd === 'number' ? el.selectionEnd : start);
        const before = String(el.value || '').slice(0, start);
        const after = String(el.value || '').slice(end);
        el.value = before + insertText + after;
        const nextPos = (before + insertText).length;
        try { el.selectionStart = nextPos; el.selectionEnd = nextPos; } catch (_) {}
        try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
        return { ok: true };
      }
      if (el.isContentEditable) {
        try {
          if (typeof el.focus === 'function') el.focus();
          if (doc.execCommand && doc.execCommand('insertText', false, insertText)) return { ok: true };
        } catch (_) {}
        try {
          const sel = window.getSelection && window.getSelection();
          if (!sel || !sel.rangeCount) return { ok: false, error: 'NO_SELECTION' };
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(doc.createTextNode(insertText));
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
          return { ok: true };
        } catch (_) {}
      }
      return { ok: false, error: 'NOT_EDITABLE' };
    } catch (error) {
      return { ok: false, error: error && error.message ? error.message : String(error) };
    }
  })();`;
  try {
    const result = await targetContents.executeJavaScript(script, true);
    return result && result.ok ? { ok: true } : { ok: false, error: result && result.error ? String(result.error) : 'Insert failed.' };
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : String(error) };
  }
}

async function webviewCutSelectionToClipboard(targetContents, snapshot) {
  if (!targetContents || typeof targetContents.executeJavaScript !== 'function') {
    return { ok: false, error: 'Cut unavailable.' };
  }
  const script = `(() => {
    try {
      const snapshot = ${JSON.stringify(snapshot || null)};
      const doc = document;
      const resolveSnapshotElement = () => {
        if (!snapshot || !Array.isArray(snapshot.path) || !doc || !doc.documentElement) return null;
        let node = doc.documentElement;
        for (const index of snapshot.path) {
          if (!node || !node.children || index < 0 || index >= node.children.length) return null;
          node = node.children[index];
        }
        return node || null;
      };
      let el = doc && doc.activeElement ? doc.activeElement : null;
      const readSelectionText = () => {
        try {
          const sel = window.getSelection && window.getSelection();
          return sel && sel.toString ? String(sel.toString()) : '';
        } catch (_) { return ''; }
      };
      const activeTag = el && el.tagName ? String(el.tagName).toLowerCase() : '';
      const activeType = el && el.type ? String(el.type).toLowerCase() : '';
      const activeIsTextInput = activeTag === 'textarea' || (activeTag === 'input' && !['button','submit','checkbox','radio','range','color','file'].includes(activeType));
      const activeIsEditable = !!(el && el.isContentEditable);
      if (!activeIsTextInput && !activeIsEditable) {
        const restored = resolveSnapshotElement();
        if (restored) {
          el = restored;
          try { if (typeof el.focus === 'function') el.focus(); } catch (_) {}
        }
      }
      if (!el) return { ok: false, error: 'NO_ACTIVE_ELEMENT' };
      const tag = el.tagName ? String(el.tagName).toLowerCase() : '';
      const type = el.type ? String(el.type).toLowerCase() : '';
      const isTextInput = tag === 'textarea' || (tag === 'input' && !['button','submit','checkbox','radio','range','color','file'].includes(type));
      if (isTextInput) {
        const hasSnapshotSelection = snapshot && typeof snapshot.selectionStart === 'number' && typeof snapshot.selectionEnd === 'number';
        const start = hasSnapshotSelection ? snapshot.selectionStart : (typeof el.selectionStart === 'number' ? el.selectionStart : 0);
        const end = hasSnapshotSelection ? snapshot.selectionEnd : (typeof el.selectionEnd === 'number' ? el.selectionEnd : 0);
        if (end <= start) return { ok: false, error: 'NO_SELECTION' };
        const value = String(el.value || '');
        const cutText = value.slice(start, end);
        el.value = value.slice(0, start) + value.slice(end);
        try { el.selectionStart = start; el.selectionEnd = start; } catch (_) {}
        try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
        return { ok: true, text: cutText };
      }
      if (el.isContentEditable) {
        const sel = window.getSelection && window.getSelection();
        if (!sel || !sel.rangeCount) return { ok: false, error: 'NO_SELECTION' };
        const text = readSelectionText();
        if (!text) return { ok: false, error: 'NO_SELECTION' };
        try {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          return { ok: true, text };
        } catch (_) {}
        return { ok: false, error: 'DELETE_FAILED' };
      }
      return { ok: false, error: 'NOT_EDITABLE' };
    } catch (error) {
      return { ok: false, error: error && error.message ? error.message : String(error) };
    }
  })();`;
  try {
    const result = await targetContents.executeJavaScript(script, true);
    if (!result || !result.ok) return { ok: false, error: result && result.error ? String(result.error) : 'Cut failed.' };
    return { ok: true, text: String(result.text || '') };
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : String(error) };
  }
}

ipcMain.handle('browser:webviewEdit', async (_event, payload) => {
  try {
    const data = payload && typeof payload === 'object' ? payload : {};
    const targetId = Number(data.webContentsId);
    const action = String(data.action || '').trim();
    const selectionText = String(data.selectionText || '');
    const isEditable = !!data.isEditable;
    if (!Number.isFinite(targetId) || targetId <= 0) return { error: 'Browser tab is not ready yet.' };
    const targetContents = webContents.fromId(targetId);
    if (!targetContents || (typeof targetContents.isDestroyed === 'function' && targetContents.isDestroyed())) {
      browserWebviewEditSnapshots.delete(targetId);
      return { error: 'Browser tab is no longer available.' };
    }
    const snapshot = browserWebviewEditSnapshots.get(targetId) || null;
    const allowed = new Set(['cut', 'copy', 'paste', 'selectAll']);
    if (!allowed.has(action)) return { error: 'Unsupported action.' };

    // Clipboard-bridged operations are more reliable than webContents.{copy,paste} when focus/selection is unstable.
    if (action === 'copy') {
      try {
        const text = selectionText.trim();
        if (text && clipboard && typeof clipboard.writeText === 'function') {
          clipboard.writeText(text);
          return { ok: true, strategy: 'clipboard' };
        }
      } catch (_) {}
      // Fallback to native copy (may still work for rich selection).
      try {
        if (typeof targetContents.focus === 'function') targetContents.focus();
      } catch (_) {}
      try {
        if (typeof targetContents.copy === 'function') {
          targetContents.copy();
          return { ok: true, strategy: 'native' };
        }
      } catch (_) {}
      return { error: 'Copy failed.' };
    }

    if (action === 'paste') {
      if (!isEditable) return { error: 'Paste is only available in editable fields.' };
      let text = '';
      try {
        text = clipboard && typeof clipboard.readText === 'function' ? String(clipboard.readText() || '') : '';
      } catch (_) {
        text = '';
      }
      try {
        if (typeof targetContents.focus === 'function') targetContents.focus();
      } catch (_) {}
      const injected = await webviewInsertClipboardText(targetContents, text, snapshot);
      if (injected && injected.ok) return { ok: true, strategy: 'inject' };
      // Last resort: native paste.
      try {
        if (typeof targetContents.paste === 'function') {
          targetContents.paste();
          return { ok: true, strategy: 'native' };
        }
      } catch (_) {}
      return { error: injected && injected.error ? injected.error : 'Paste failed.' };
    }

    if (action === 'cut') {
      if (!isEditable) return { error: 'Cut is only available in editable fields.' };
      try {
        if (typeof targetContents.focus === 'function') targetContents.focus();
      } catch (_) {}
      const cutResult = await webviewCutSelectionToClipboard(targetContents, snapshot);
      if (cutResult && cutResult.ok) {
        try {
          const text = String(cutResult.text || '');
          if (clipboard && typeof clipboard.writeText === 'function') clipboard.writeText(text);
        } catch (_) {}
        return { ok: true, strategy: 'inject' };
      }
      // Fallback to native cut.
      try {
        if (typeof targetContents.cut === 'function') {
          targetContents.cut();
          return { ok: true, strategy: 'native' };
        }
      } catch (_) {}
      return { error: cutResult && cutResult.error ? cutResult.error : 'Cut failed.' };
    }

    let nativeError = '';
    try {
      if (typeof targetContents.focus === 'function') targetContents.focus();
    } catch (_) {}
    try {
      if (typeof targetContents[action] === 'function') {
        targetContents[action]();
        return { ok: true, strategy: 'native' };
      }
      nativeError = 'Action not supported.';
    } catch (error) {
      nativeError = error && error.message ? error.message : String(error);
    }

    const fallback = await runWebviewEditFallback(targetContents, action);
    if (fallback && fallback.ok) return { ok: true, strategy: 'fallback' };
    return { error: (fallback && fallback.error) || nativeError || 'Action failed.' };
  } catch (error) {
    return { error: error && error.message ? error.message : String(error) };
  }
});

// List managed browser downloads for the internal download center.
ipcMain.handle('browser:listDownloads', async () => {
  try {
    const downloads = Array.from(browserDownloadRecords.values())
      .sort((a, b) => Number(b.startTime || 0) - Number(a.startTime || 0));
    return { ok: true, downloads };
  } catch (error) {
    return { error: error && error.message ? error.message : String(error) };
  }
});

ipcMain.handle('browser:downloadAction', async (_event, payload) => {
  try {
    const data = payload && typeof payload === 'object' ? payload : {};
    const action = String(data.action || '').trim();
    const deleteLocalFile = !!data.deleteLocalFile;
    if (action === 'clearFinished') {
      for (const [downloadId] of browserDownloadRecords) {
        if (!browserDownloadLiveItems.has(downloadId)) browserDownloadRecords.delete(downloadId);
      }
      saveBrowserDownloadRecordsNow();
      return { ok: true };
    }
    const id = String(data.id || '').trim();
    if (!id) return { error: 'Download id is required.', errorCode: 'browserDownloadIdRequired' };
    const record = browserDownloadRecords.get(id);
    if (!record) return { error: 'Download record not found.', errorCode: 'browserDownloadRecordNotFound' };
    const item = browserDownloadLiveItems.get(id) || null;

    if (action === 'pause') {
      if (!item || typeof item.pause !== 'function') return { error: 'Download is not pausable right now.' };
      item.pause();
      record.state = 'paused';
      record.updatedAt = Date.now();
      scheduleSaveBrowserDownloadRecords();
      return { ok: true };
    }
    if (action === 'resume') {
      if (!item || typeof item.resume !== 'function') return { error: 'Download is not resumable right now.' };
      item.resume();
      record.state = 'downloading';
      record.updatedAt = Date.now();
      scheduleSaveBrowserDownloadRecords();
      return { ok: true };
    }
    if (action === 'cancel') {
      if (!item || typeof item.cancel !== 'function') return { error: 'Download is no longer active.' };
      item.cancel();
      record.updatedAt = Date.now();
      scheduleSaveBrowserDownloadRecords();
      return { ok: true };
    }
    if (action === 'reveal') {
      if (!record.savePath) return { error: 'Saved file path is unavailable.' };
      shell.showItemInFolder(record.savePath);
      return { ok: true };
    }
    if (action === 'open') {
      if (!record.savePath) return { error: 'Saved file path is unavailable.' };
      const result = await shell.openPath(record.savePath);
      return result ? { error: result } : { ok: true };
    }
    if (action === 'remove') {
      const activeState = String(record.state || '').trim();
      const activelyDownloading = activeState === 'downloading' || activeState === 'paused';
      if (item && activelyDownloading) return { error: 'Cannot remove an active download.', errorCode: 'browserDownloadRemoveActive' };
      if (deleteLocalFile) {
        const filePath = String(record.savePath || '').trim();
        if (!filePath) {
          return { error: 'This download does not have a local file to delete.', errorCode: 'browserDownloadDeleteLocalUnavailable' };
        }
        try {
          await fs.promises.unlink(filePath);
        } catch (error) {
          const code = error && error.code ? String(error.code) : '';
          if (code !== 'ENOENT') {
            return {
              error: error && error.message ? error.message : String(error),
              errorCode: 'browserDownloadDeleteLocalFailed',
              errorDetails: error && error.message ? error.message : String(error)
            };
          }
        }
      }
      browserDownloadLiveItems.delete(id);
      browserDownloadRecords.delete(id);
      saveBrowserDownloadRecordsNow();
      return { ok: true };
    }
    if (action === 'retry') {
      const nextUrl = String(record.url || '').trim();
      if (!nextUrl || !/^https?:\/\//i.test(nextUrl)) return { error: 'Only HTTP/HTTPS downloads can be retried.' };
      const browserSession = getBrowserSession();
      if (!browserSession || typeof browserSession.downloadURL !== 'function') return { error: 'Browser session unavailable.' };
      await browserSession.downloadURL(nextUrl);
      return { ok: true };
    }
    return { error: 'Unsupported download action.' };
  } catch (error) {
    return { error: error && error.message ? error.message : String(error) };
  }
});

ipcMain.handle('browser:listNetworkEvents', async (_event, payload) => {
  try {
    const data = payload && typeof payload === 'object' ? payload : {};
    const webContentsId = Number(data.webContentsId) || 0;
    const keyword = String(data.keyword || '').trim().toLowerCase();
    const limitRaw = Number(data.limit);
    const limit = Number.isFinite(limitRaw) ? Math.max(20, Math.min(1500, Math.floor(limitRaw))) : 400;
    let list = browserNetworkRecords.slice();
    if (webContentsId > 0) {
      list = list.filter(item => Number(item && item.webContentsId ? item.webContentsId : 0) === webContentsId);
    }
    if (keyword) {
      list = list.filter(item => {
        const fields = [item.url, item.method, item.resourceType, item.state, item.statusCode, item.error];
        return fields.some(field => String(field == null ? '' : field).toLowerCase().includes(keyword));
      });
    }
    if (list.length > limit) list = list.slice(list.length - limit);
    list.reverse();
    return { ok: true, entries: list };
  } catch (error) {
    return { error: error && error.message ? error.message : String(error) };
  }
});

ipcMain.handle('browser:clearNetworkEvents', async () => {
  try {
    browserNetworkRecords.length = 0;
    browserNetworkRequestStarts.clear();
    return { ok: true };
  } catch (error) {
    return { error: error && error.message ? error.message : String(error) };
  }
});

ipcMain.handle('browser:getPerfSnapshot', async (_event, payload) => {
  try {
    const data = payload && typeof payload === 'object' ? payload : {};
    const webContentsId = Number(data.webContentsId) || 0;
    if (!webContentsId) return { error: 'Browser tab is not ready yet.' };
    const target = webContents.fromId(webContentsId);
    if (!target || (typeof target.isDestroyed === 'function' && target.isDestroyed())) {
      return { error: 'Browser tab is no longer available.' };
    }
    const pid = typeof target.getOSProcessId === 'function' ? Number(target.getOSProcessId()) || 0 : 0;
    const appMetrics = typeof app.getAppMetrics === 'function' ? app.getAppMetrics() : [];
    const matchedMetrics = Array.isArray(appMetrics)
      ? appMetrics.find(item => Number(item && item.pid ? item.pid : 0) === pid)
      : null;
    let processMemory = null;
    try {
      if (typeof target.getProcessMemoryInfo === 'function') {
        processMemory = await target.getProcessMemoryInfo();
      }
    } catch (_) {
      processMemory = null;
    }
    const cpu = matchedMetrics && matchedMetrics.cpu ? matchedMetrics.cpu : {};
    const memory = matchedMetrics && matchedMetrics.memory ? matchedMetrics.memory : {};
    return {
      ok: true,
      snapshot: {
        webContentsId,
        pid,
        cpuPercent: Number(cpu.percentCPUUsage || 0),
        idleWakeupsPerSecond: Number(cpu.idleWakeupsPerSecond || 0),
        memory: {
          workingSetSize: Number(memory.workingSetSize || 0),
          peakWorkingSetSize: Number(memory.peakWorkingSetSize || 0),
          privateBytes: Number(memory.privateBytes || 0),
          sharedBytes: Number(memory.sharedBytes || 0),
          process: processMemory || null
        },
        timestamp: Date.now()
      }
    };
  } catch (error) {
    return { error: error && error.message ? error.message : String(error) };
  }
});

ipcMain.handle('os:launch', async (_, target) => {
  try {
    const launchOptions = (target && typeof target === 'object' && !Array.isArray(target))
      ? target
      : { target };
    const source = String(launchOptions.target || '').trim();
    const cwd = launchOptions.cwd ? String(launchOptions.cwd).trim() : '';
    if (!source) return { ok: false, error: 'Empty launch target.' };
    if (source.startsWith('http://') || source.startsWith('https://')) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('browser:new-tab', source);
      }
      return { ok: true };
    }

    const managedTarget = await resolveManagedExecutableTarget(source, cwd);
    if (managedTarget) {
      return await launchManagedExecutable(managedTarget.exePath, managedTarget.args);
    }

    const fullPath = await resolveExistingLaunchPath(source, cwd);
    if (fullPath) {
      if (isManagedExecutablePath(fullPath)) {
        return await launchManagedExecutable(fullPath, []);
      }
      shell.openPath(fullPath).then(err => { if (err) shell.openExternal(source); });
      return { ok: true };
    }
    shell.openExternal(source);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('os:resolveManagedLaunch', async (_, target, cwd) => {
  try {
    const resolved = await resolveManagedExecutableTarget(target, cwd);
    if (!resolved) return { managed: false };
    return { managed: true, exePath: resolved.exePath, args: resolved.args || [] };
  } catch (e) {
    return { managed: false, error: e.message };
  }
});

ipcMain.handle('os:exec', async (event, cmd, cwd, execId) => {
  // General command execution via cmd/sh. When execId is provided, stdout/stderr
  // is streamed back to the renderer for terminal-style incremental updates.
    const isWin = process.platform === 'win32';
  const spawnOpts = {
      cwd: cwd || process.env.USERPROFILE || process.env.HOME,
      shell: false,
      env: { ...process.env, TERM: 'xterm-256color' }
  };
  if (isWin) spawnOpts.windowsVerbatimArguments = true;
  const send = (chan, ...args) => { try { event.sender.send(chan, ...args); } catch (_) {} };
  const child = spawn(isWin ? 'cmd.exe' : '/bin/sh', isWin ? ['/c', cmd] : ['-c', cmd], spawnOpts);
    const outBuf = [];
    const errBuf = [];
  const decodeChunk = (buf, _isErr) => {
    if (!buf.length) return '';
    if (isWin) { try { return iconv.decode(Buffer.from(buf), 'gbk'); } catch (_) { return Buffer.from(buf).toString('utf8'); } }
    return Buffer.from(buf).toString('utf8');
  };
  if (execId != null && typeof execId === 'string') {
    child.stdout.on('data', d => { outBuf.push(d); send('terminal:execChunk', execId, 'stdout', decodeChunk(d, false)); });
    child.stderr.on('data', d => { errBuf.push(d); send('terminal:execChunk', execId, 'stderr', decodeChunk(d, true)); });
    return new Promise((resolve) => {
      child.on('close', code => { send('terminal:execEnd', execId, code); resolve({ streamed: true, code }); });
      child.on('error', e => { send('terminal:execChunk', execId, 'stderr', e.message); send('terminal:execEnd', execId, -1); resolve({ streamed: true, code: -1 }); });
    });
  }
    child.stdout.on('data', d => { outBuf.push(Buffer.from(d)); });
    child.stderr.on('data', d => { errBuf.push(Buffer.from(d)); });
  return new Promise((resolve) => {
    child.on('close', code => {
      const outRaw = Buffer.concat(outBuf);
      const errRaw = Buffer.concat(errBuf);
      let stdout = '';
      let stderr = '';
      if (isWin) {
        try { stdout = iconv.decode(outRaw, 'gbk'); stderr = iconv.decode(errRaw, 'gbk'); } catch (_) { stdout = outRaw.toString('utf8'); stderr = errRaw.toString('utf8'); }
      } else { stdout = outRaw.toString('utf8'); stderr = errRaw.toString('utf8'); }
      resolve({ stdout, stderr, code });
    });
    child.on('error', e => resolve({ stdout: '', stderr: e.message, code: -1 }));
  });
});

function createPipeShellSession(event, id, opts) {
  const isWin = process.platform === 'win32';
  const cwd = opts.cwd || process.env.USERPROFILE || process.env.HOME || process.cwd();
  const ownerWebContentsId = event.sender && event.sender.id ? event.sender.id : null;
  const shellCmd = isWin ? (process.env.ComSpec || 'cmd.exe') : (process.env.SHELL || '/bin/bash');
  const shellArgs = isWin ? ['/d', '/k', 'chcp 65001>nul'] : ['-i'];
  const spawnOpts = {
    cwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      PROMPT: process.env.PROMPT || '$P$G'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  };
  if (isWin) spawnOpts.windowsHide = true;
  const send = (chan, ...args) => {
    try {
      if (event.sender && !event.sender.isDestroyed()) event.sender.send(chan, ...args);
    } catch (_) {}
  };
  const decodePipeChunk = (buf) => {
    if (!buf || !buf.length) return '';
    const raw = Buffer.from(buf);
    if (isWin) {
      const utf8 = raw.toString('utf8');
      if (utf8 && !utf8.includes('\uFFFD')) return utf8;
      try { return iconv.decode(raw, 'gbk'); } catch (_) { return utf8; }
    }
    return raw.toString('utf8');
  };
  const child = spawn(shellCmd, shellArgs, spawnOpts);
  child.stdout.on('data', data => {
    send('terminal:ptyData', id, decodePipeChunk(data));
  });
  child.stderr.on('data', data => {
    send('terminal:ptyData', id, decodePipeChunk(data));
  });
  child.on('close', code => {
    send('terminal:ptyExit', id, typeof code === 'number' ? code : 0);
    ptySessions.delete(id);
  });
  child.on('error', error => {
    send('terminal:ptyData', id, (error && error.message ? error.message : String(error)) + '\n');
    send('terminal:ptyExit', id, -1);
    ptySessions.delete(id);
  });

  const write = (data) => {
    if (!child.stdin || child.stdin.destroyed || child.killed) throw new Error('shell stdin is not available');
    const str = String(data == null ? '' : data);
    child.stdin.write(Buffer.from(str, 'utf8'));
  };
  const resize = () => {};
  const kill = () => {
    try {
      if (child.stdin && !child.stdin.destroyed) child.stdin.write(isWin ? 'exit\r\n' : 'exit\n');
    } catch (_) {}
    try { child.kill(); } catch (_) {}
  };

  ptySessions.set(id, { write, resize, kill, ownerWebContentsId, transport: 'pipe', child });
  return { ok: true, id, transport: 'pipe' };
}


ipcMain.handle('terminal:ptyCreate', async (event, options) => {
  const opts = options || {};
  const id = String(opts.id || ('pty_' + Date.now() + '_' + Math.random().toString(36).slice(2)));
  const isWin = process.platform === 'win32';
  const ownerWebContentsId = event.sender && event.sender.id ? event.sender.id : null;

  // If the same id is recreated, clean up the old session first.
  const old = ptySessions.get(id);
  if (old && old.kill) {
    try { old.kill(); } catch (_) {}
    ptySessions.delete(id);
  }

  if (!pty || opts.forcePipe) return createPipeShellSession(event, id, opts);

  const cwd = opts.cwd || process.env.USERPROFILE || process.env.HOME || process.cwd();
  const cols = Number(opts.cols || 100);
  const rows = Number(opts.rows || 30);

  // Prefer UTF-8 code page on Windows; os:exec still retains decode fallback.
  const shellPath = isWin ? (process.env.ComSpec || 'cmd.exe') : (process.env.SHELL || '/bin/bash');
  const args = isWin
    ? ['/k', 'chcp 65001>nul']
    : ['-l'];
  const term = pty.spawn(shellPath, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: { ...process.env, TERM: 'xterm-256color' },
  });

  const send = (chan, ...a) => {
    try {
      if (event.sender && !event.sender.isDestroyed()) event.sender.send(chan, ...a);
    } catch (_) {}
  };
  term.onData(data => {
    send('terminal:ptyData', id, data);
  });
  term.onExit(e => {
    send('terminal:ptyExit', id, e && typeof e.exitCode === 'number' ? e.exitCode : 0);
    ptySessions.delete(id);
  });

  ptySessions.set(id, {
    term,
    ownerWebContentsId,
    transport: 'pty',
    write(data) { term.write(String(data == null ? '' : data)); },
    resize(nextCols, nextRows) { term.resize(Number(nextCols || 80), Number(nextRows || 24)); },
    kill() { term.kill(); }
  });
  return { ok: true, id, transport: 'pty' };
});

ipcMain.handle('terminal:ptyWrite', async (_event, id, data) => {
  const sess = ptySessions.get(String(id));
  if (!sess || typeof sess.write !== 'function') return { error: 'pty not found' };
  try { sess.write(String(data ?? '')); } catch (e) { return { error: e.message }; }
  return { ok: true };
});

ipcMain.handle('terminal:ptyResize', async (_event, id, cols, rows) => {
  const sess = ptySessions.get(String(id));
  if (!sess || typeof sess.resize !== 'function') return { error: 'pty not found' };
  try { sess.resize(Number(cols || 80), Number(rows || 24)); } catch (e) { return { error: e.message }; }
  return { ok: true };
});

ipcMain.handle('terminal:ptyKill', async (_event, id) => {
  const sess = ptySessions.get(String(id));
  if (!sess || typeof sess.kill !== 'function') return { ok: true };
  try { sess.kill(); } catch (_) {}
  ptySessions.delete(String(id));
  return { ok: true };
});

ipcMain.handle('terminal:runBatch', async (_event, payload) => {
  const isWin = process.platform === 'win32';
  if (!isWin) return { error: 'batch execution is only supported on Windows in this handler', code: -1 };
  try {
    const filePath = String(payload && payload.filePath ? payload.filePath : '').trim();
    const argsRaw = String(payload && payload.args ? payload.args : '').trim();
    const cwdInput = String(payload && payload.cwd ? payload.cwd : '').trim();
    if (!filePath) return { error: 'empty batch file path', code: -1 };
    const runCwd = cwdInput || path.dirname(filePath) || process.env.USERPROFILE || process.env.HOME || process.cwd();
    const quotedFile = `"${filePath.replace(/"/g, '""')}"`;
    const command = argsRaw ? `${quotedFile} ${argsRaw}` : quotedFile;
    const child = spawn('cmd.exe', ['/d', '/c', command], {
      cwd: runCwd,
      shell: false,
      windowsHide: true,
      windowsVerbatimArguments: true,
      env: { ...process.env }
    });
    const outBuf = [];
    const errBuf = [];
    child.stdout.on('data', d => outBuf.push(Buffer.from(d)));
    child.stderr.on('data', d => errBuf.push(Buffer.from(d)));
    return await new Promise((resolve) => {
      child.on('close', code => {
        const outRaw = Buffer.concat(outBuf);
        const errRaw = Buffer.concat(errBuf);
        let stdout = '';
        let stderr = '';
        try {
          stdout = iconv.decode(outRaw, 'gbk');
          stderr = iconv.decode(errRaw, 'gbk');
        } catch (_) {
          stdout = outRaw.toString('utf8');
          stderr = errRaw.toString('utf8');
        }
        resolve({ stdout, stderr, code: Number.isFinite(code) ? code : 0 });
      });
      child.on('error', e => resolve({ stdout: '', stderr: (e && e.message) ? e.message : String(e), code: -1 }));
    });
  } catch (e) {
    return { error: (e && e.message) || String(e), code: -1 };
  }
});

/** Windows 子进程输出：优先 UTF-8（Steam 等常为 UTF-8）；仅当含替换字符时再尝试 GBK */
function decodeWindowsConsoleBytes(buf) {
  const raw = Buffer.from(buf || []);
  if (!raw.length) return '';
  const utf8 = raw.toString('utf8');
  if (!/\uFFFD/.test(utf8)) return utf8;
  try {
    return iconv.decode(raw, 'gbk');
  } catch (_) {
    return utf8;
  }
}

ipcMain.handle('terminal:runRawCommand', async (_event, payload) => {
  const isWin = process.platform === 'win32';
  try {
    let command = String(payload && payload.command ? payload.command : '').trim();
    const cwdInput = String(payload && payload.cwd ? payload.cwd : '').trim();
    if (!command) return { stdout: '', stderr: 'empty command', code: 1 };
    if (isWin) {
      try { command = command.normalize('NFKC'); } catch (_) {}
      command = command
        .replace(/[\u201C\u201D\u201E\u2033\u301D\u301E\u301F\u300C\u300D\u300E\u300F\uFF02]/g, '"')
        .replace(/[\u2018\u2019\u201A\u2032\uFF07]/g, "'");
      // Fix common IME input: call"xxx.bat"
      command = command.replace(/^\s*call(?=["'])/i, m => m + ' ');
    }
    const runCwd = cwdInput || process.env.USERPROFILE || process.env.HOME || process.cwd();
    const timeoutMs = Math.min(
      Math.max(Number(payload && payload.timeoutMs) || 0, 0) || (isWin ? 300000 : 120000),
      3600000
    );
    const child = spawn(isWin ? 'cmd.exe' : '/bin/sh', isWin ? ['/d', '/c', command] : ['-lc', command], {
      cwd: runCwd,
      shell: false,
      windowsHide: true,
      windowsVerbatimArguments: isWin,
      // 不挂可读 stdin，避免 cmd 在隐藏窗口下等“按键/pause”时永远不收尾，导致渲染层一直 await 不出后续输出
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    const outBuf = [];
    const errBuf = [];
    child.stdout.on('data', d => outBuf.push(Buffer.from(d)));
    child.stderr.on('data', d => errBuf.push(Buffer.from(d)));
    return await new Promise((resolve) => {
      let settled = false;
      const decodeBuffers = () => {
        const outRaw = Buffer.concat(outBuf);
        const errRaw = Buffer.concat(errBuf);
        if (isWin) {
          return {
            stdout: decodeWindowsConsoleBytes(outRaw),
            stderr: decodeWindowsConsoleBytes(errRaw)
          };
        }
        return {
          stdout: outRaw.toString('utf8'),
          stderr: errRaw.toString('utf8')
        };
      };
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { child.kill(); } catch (_) {}
        const { stdout, stderr } = decodeBuffers();
        const hint = isWin
          ? `\n[Star OS] 已超时终止（${Math.round(timeoutMs / 1000)}s）。批处理若含 pause / 等待按键，在隐藏控制台执行时会一直卡住；请去掉 pause 或改为 start \"\" 启动图形程序。`
          : `\n[Star OS] Command timed out after ${Math.round(timeoutMs / 1000)}s.`;
        resolve({ stdout, stderr: stderr + hint, code: 124 });
      }, timeoutMs);
      child.on('close', code => {
        if (settled) return;
        settled = true;
        try { clearTimeout(timeoutId); } catch (_) {}
        const { stdout, stderr } = decodeBuffers();
        resolve({ stdout, stderr, code: Number.isFinite(code) ? code : 0 });
      });
      child.on('error', e => {
        if (settled) return;
        settled = true;
        try { clearTimeout(timeoutId); } catch (_) {}
        resolve({ stdout: '', stderr: (e && e.message) ? e.message : String(e), code: -1 });
      });
    });
  } catch (e) {
    return { stdout: '', stderr: (e && e.message) ? e.message : String(e), code: -1 };
  }
});


ipcMain.handle('java:compileRun', async (_event, options) => {
  const { filePath, className, cwd } = options || {};
  const projDir = cwd || (filePath ? path.dirname(filePath) : (process.env.USERPROFILE || process.env.HOME));
  const isWin = process.platform === 'win32';

  const runProc = (cmd, args) => new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: projDir,
      env: { ...process.env },
    });
    const outBuf = [];
    const errBuf = [];
    child.stdout.on('data', d => outBuf.push(Buffer.from(d)));
    child.stderr.on('data', d => errBuf.push(Buffer.from(d)));
    child.on('close', code => {
      const outRaw = Buffer.concat(outBuf);
      const errRaw = Buffer.concat(errBuf);
      let stdout = '';
      let stderr = '';
      if (isWin) {
        try {
          stdout = iconv.decode(outRaw, 'gbk');
          stderr = iconv.decode(errRaw, 'gbk');
        } catch (_) {
          stdout = outRaw.toString('utf8');
          stderr = errRaw.toString('utf8');
        }
      } else {
        stdout = outRaw.toString('utf8');
        stderr = errRaw.toString('utf8');
      }
      resolve({ stdout, stderr, code });
    });
    child.on('error', e => resolve({ stdout: '', stderr: e.message, code: -1 }));
  });

  if (!filePath || !className) {
    return { stdout: '', stderr: 'java:compileRun 需要提供有效的 filePath 与 className', code: -1, phase: 'init' };
  }

  // Compile first.
  const compileRes = await runProc('javac', ['-encoding', 'UTF-8', filePath]);
  if (compileRes.code !== 0) {
    return { ...compileRes, phase: 'compile' };
  }

  // Then run the compiled class.
  const runRes = await runProc('java', ['-cp', projDir, className]);
  return { ...runRes, phase: 'run' };
});

// File system: returns name, isDir, size and mtime.
ipcMain.handle('os:readdir', async (_, dir) => {
  try {
    const base = dir || process.env.USERPROFILE || process.env.HOME || '/';
    const entries = await fs.promises.readdir(base, { withFileTypes: true });
    const attrMap = await getWindowsDirectoryEntryAttributeMap(base);
    const result = await Promise.all(entries.map(async (d) => {
      const name = d.name;
      const fullPath = path.join(base, name);
      const stat = await safeStat(fullPath);
      const isDir = !!((stat && typeof stat.isDirectory === 'function' && stat.isDirectory()) || d.isDirectory());
      const { size, mtime } = await getEntryMeta(fullPath, isDir, { eagerDirectorySize: false });
      const attrText = attrMap && attrMap.get ? attrMap.get(name) : '';
      const isProtected = !!isDir && isProtectedSystemDirectoryName(name);
      const isHidden = process.platform === 'win32'
        ? (/\bHidden\b/i.test(String(attrText || '')) || isProtected)
        : (!!name && name.startsWith('.') && name !== '.' && name !== '..');
      const isSystem = process.platform === 'win32'
        ? (/\bSystem\b/i.test(String(attrText || '')) || isProtected)
        : false;
      return { name, isDir, size, mtime, isHidden, isSystem, isProtected };
    }));
    return result;
  } catch (e) {
    return { error: e.message };
  }
});

// List available drives for the "This PC" view.
ipcMain.handle('os:listDrives', async () => {
  const drives = [];
  if (process.platform === 'win32') {
    // Prefer a fast OS-provided drive list over probing A:..Z: sequentially (which may hang on stale network mappings).
    let roots = [];
    try {
      const { execFile } = require('child_process');
      const stdout = await new Promise((resolve, reject) => {
        execFile(
          'powershell.exe',
          ['-NoProfile', '-Command', '(Get-PSDrive -PSProvider FileSystem | Select-Object -ExpandProperty Root) -join \"`n\"'],
          { windowsHide: true, timeout: 2500, maxBuffer: 1024 * 1024 },
          (err, out) => err ? reject(err) : resolve(out)
        );
      });
      roots = String(stdout || '')
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(Boolean)
        .filter(s => /^[a-zA-Z]:\\$/.test(s));
    } catch (_) {
      roots = [];
    }
    if (!roots.length) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      roots = letters.split('').map(ch => ch + ':\\');
    }
    const seen = new Set();
    for (const root of roots) {
      if (seen.has(root.toUpperCase())) continue;
      seen.add(root.toUpperCase());
      try {
        // Keep this guarded: some roots may still be slow/unavailable.
        await Promise.race([fs.promises.access(root), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 350))]);
        const meta = await Promise.race([getDriveMeta(root), new Promise(resolve => setTimeout(() => resolve({ size: undefined, mtime: undefined }), 650))]);
        drives.push({ path: root, name: root, size: meta && meta.size, mtime: meta && meta.mtime });
      } catch (_) {
        // ignore
      }
    }
  } else {
    const home = process.env.HOME || '/';
    const { size, mtime } = await getDriveMeta(home);
    drives.push({ path: home, name: home, size, mtime });
  }
  return drives;
});

ipcMain.handle('os:readFile', async (_, filePath) => {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('os:readFileBinary', async (_, filePath) => {
  try {
    const buf = await fs.promises.readFile(filePath);
    return { base64: buf.toString('base64') };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('os:writeFile', async (_, filePath, content) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('os:stat', async (_, filePath) => {
  try {
    const s = await fs.promises.stat(filePath);
    const isDir = s.isDirectory();
    const visibility = await getPathVisibilityFlags(filePath, isDir);
    return {
      isDir,
      size: s.size,
      mtime: s.mtimeMs,
      isHidden: !!(visibility && visibility.isHidden),
      isSystem: !!(visibility && visibility.isSystem),
      isProtected: !!(visibility && visibility.isProtected),
    };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('os:getFileIconDataUrl', async (_, filePath, sizeHint) => {
  try {
    const targetPath = String(filePath || '').trim();
    if (!targetPath) return null;
    await fs.promises.access(targetPath, fs.constants.F_OK);
    const icon = await app.getFileIcon(targetPath, {
      size: String(sizeHint || '').toLowerCase() === 'large' ? 'large' : 'normal'
    });
    if (!icon || typeof icon.isEmpty !== 'function' || icon.isEmpty()) return null;
    return icon.toDataURL();
  } catch (_) {
    return null;
  }
});

ipcMain.handle('os:mkdir', async (_, dirPath) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('os:trashItem', async (_, filePath) => {
  try {
    await shell.trashItem(filePath);
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('os:openRecycleBin', async () => {
  try {
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => exec('start shell:RecycleBinFolder', (err) => err ? reject(err) : resolve()));
    } else {
      await shell.openPath(process.env.HOME + '/.local/share/Trash').catch(() => shell.openPath(process.env.HOME + '/Trash'));
    }
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
});


ipcMain.handle('os:renamePath', async (_, oldPath, newPath) => {
  try {
    if (!oldPath || !newPath) return { error: 'Missing path.' };
    if (path.resolve(oldPath) === path.resolve(newPath)) return { ok: true, path: oldPath };
    if (await pathExists(newPath)) return { error: 'Target already exists.' };
    await fs.promises.rename(oldPath, newPath);
    return { ok: true, path: newPath };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('os:copyItem', async (_, srcPath, targetDir) => {
  try {
    if (!srcPath || !targetDir) return { error: 'Missing path.' };
    const stat = await fs.promises.stat(srcPath);
    if (stat.isDirectory() && isSubPath(srcPath, targetDir)) {
      return { error: 'Cannot copy a folder into itself.' };
    }
    const finalPath = await ensureUniquePath(path.join(targetDir, path.basename(srcPath)));
    await copyRecursive(srcPath, finalPath);
    return { ok: true, path: finalPath };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('os:moveItem', async (_, srcPath, targetDir) => {
  try {
    if (!srcPath || !targetDir) return { error: 'Missing path.' };
    const stat = await fs.promises.stat(srcPath);
    if (stat.isDirectory() && isSubPath(srcPath, targetDir)) {
      return { error: 'Cannot move a folder into itself.' };
    }
    const finalPath = await ensureUniquePath(path.join(targetDir, path.basename(srcPath)));
    try {
      await fs.promises.rename(srcPath, finalPath);
    } catch (e) {
      if (!e || e.code !== 'EXDEV') throw e;
      await copyRecursive(srcPath, finalPath);
      await removeRecursive(srcPath);
    }
    return { ok: true, path: finalPath };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('os:searchFiles', async (_event, baseDir, keyword, maxResults = 200) => {
  const results = [];
  const seen = new Set();
  const root = baseDir && typeof baseDir === 'string'
    ? baseDir
    : (process.env.USERPROFILE || process.env.HOME || 'C:\\');
  const kw = (keyword || '').trim().toLowerCase();
  if (!kw) return [];

  async function walk(dir, depth) {
    if (results.length >= maxResults || depth > 6) return;
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const d of entries) {
      if (results.length >= maxResults) break;
      const name = d.name || '';
      if (!name) continue;

      const full = path.join(dir, name);
      if (seen.has(full)) continue;
      seen.add(full);
      if (name.toLowerCase().includes(kw)) {
        results.push({ path: full, name, isDir: d.isDirectory() });
      }
      if (d.isDirectory()) {
        await walk(full, depth + 1);
      }
    }
  }

  await walk(root, 0);
  return results;
});


ipcMain.handle('os:archiveList', async (_, archivePath, charset) => {
  if (!Seven || !path7za) return { error: 'Archive support not available (node-7z/7zip-bin).' };
  try {
    const archiveBinPath = resolveArchiveBinaryPath();
    if (!archiveBinPath) {
      if (isZipArchivePath(archivePath)) {
        const listedEntries = await listZipEntriesWithPowerShell(archivePath);
        return { entries: listedEntries, charset: 'utf8' };
      }
      throw new Error('7z binary path is unavailable.');
    }
    async function runList() {
      const isWin = process.platform === 'win32';
      const args = ['l', '-slt', '-ba'];
      if (isWin) args.push('-sccUTF-8');
      args.push(archivePath);
      const child = spawn(archiveBinPath, args, {
        cwd: process.env.USERPROFILE || process.env.HOME || process.cwd(),
        shell: false,
        env: { ...process.env }
      });
      const outBuf = [];
      const errBuf = [];
      child.stdout.on('data', d => outBuf.push(Buffer.from(d)));
      child.stderr.on('data', d => errBuf.push(Buffer.from(d)));
      const code = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', resolve);
      });
      if (code !== 0) {
        const stderr = Buffer.concat(errBuf).toString('utf8');

        throw new Error(stderr || '7z list failed');
      }
      const text = Buffer.concat(outBuf).toString('utf8');


      const entries = [];
      const blocks = text.split(/\r?\n\r?\n+/);
      for (const blk of blocks) {
        const lines = blk.split(/\r?\n/);
        let p = '';
        let size = 0;
        let attrs = '';
        for (const line of lines) {
          const idx = line.indexOf(' = ');
          if (idx <= 0) continue;
          const k = line.slice(0, idx).trim();
          const v = line.slice(idx + 3);
          if (k === 'Path') p = v;
          else if (k === 'Size') size = parseInt(v, 10) || 0;
          else if (k === 'Attributes') attrs = v || '';
        }
        if (!p) continue;

        const isDir = (attrs && attrs.includes('D')) || p.endsWith('/') || p.endsWith('\\');
        p = p.replace(/[\/\\]$/, '');
        entries.push({ path: p, size: isNaN(size) ? 0 : size, isFolder: !!isDir });
      }
      return entries;
    }

    function garbleScore(entries) {
      if (!Array.isArray(entries) || entries.length === 0) return 0;
      let badEntries = 0;
      let badChars = 0;
      let totalChars = 0;
      for (const it of entries) {
        const p = (it && it.path) ? String(it.path) : '';
        if (!p) continue;
        totalChars += p.length;
        const rep = (p.match(/\uFFFD/g) || []).length; // Unicode replacement character (often indicates mojibake)
        const kif = (p.match(/\uFFFD/g) || []).length; // Replacement char is a strong mojibake marker
        const q = (p.match(/\?/g) || []).length;
        badChars += rep * 2 + kif * 6 + q * 0.2;
        if (rep > 0 || kif > 0) badEntries++;
      }
      if (totalChars === 0) return 0;
      const entryRatio = badEntries / Math.max(1, entries.length);
      const charRatio = badChars / totalChars;
      return entryRatio * 2 + charRatio;
    }


    const listedEntries = await runList();
    return { entries: listedEntries, charset: 'utf8' };
  } catch (e) {
    return { error: (e && e.message) || String(e) };
  }
});

ipcMain.handle('os:archiveExtract', async (_, archivePath, destDir, entries, charset) => {
  if (!Seven || !path7za) return { error: 'Archive support not available.' };
  try {
    const archiveBinPath = resolveArchiveBinaryPath();
    if (!archiveBinPath) {
      if (isZipArchivePath(archivePath)) {
        await extractZipWithPowerShell(archivePath, destDir, entries);
        return { ok: true, charset: 'utf8' };
      }
      throw new Error('7z binary path is unavailable.');
    }
    async function runList() {
      const isWin = process.platform === 'win32';
      const args = ['l', '-slt', '-ba'];
      if (isWin) args.push('-sccUTF-8');
      args.push(archivePath);
      const child = spawn(archiveBinPath, args, {
        cwd: process.env.USERPROFILE || process.env.HOME || process.cwd(),
        shell: false,
        env: { ...process.env }
      });
      const outBuf = [];
      const errBuf = [];
      child.stdout.on('data', d => outBuf.push(Buffer.from(d)));
      child.stderr.on('data', d => errBuf.push(Buffer.from(d)));
      const code = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', resolve);
      });
      if (code !== 0) {
        const stderr = Buffer.concat(errBuf).toString('utf8');
        throw new Error(stderr || '7z list failed');
      }
      const text = Buffer.concat(outBuf).toString('utf8');
      const out = [];
      const blocks = text.split(/\r?\n\r?\n+/);
      for (const blk of blocks) {
        const lines = blk.split(/\r?\n/);
        let p = '';
        let size = 0;
        let attrs = '';
        for (const line of lines) {
          const idx = line.indexOf(' = ');
          if (idx <= 0) continue;
          const k = line.slice(0, idx).trim();
          const v = line.slice(idx + 3);
          if (k === 'Path') p = v;
          else if (k === 'Size') size = parseInt(v, 10) || 0;
          else if (k === 'Attributes') attrs = v || '';
        }
        if (!p) continue;
        const isDir = (attrs && attrs.includes('D')) || p.endsWith('/') || p.endsWith('\\');
        p = p.replace(/[\/\\]$/, '');
        out.push({ path: p, size: isNaN(size) ? 0 : size, isFolder: !!isDir });
      }
      return out;
    }
    function garbleScore(entries) {
      if (!Array.isArray(entries) || entries.length === 0) return 0;
      let badEntries = 0;
      let badChars = 0;
      let totalChars = 0;
      for (const it of entries) {
        const p = (it && it.path) ? String(it.path) : '';
        if (!p) continue;
        totalChars += p.length;
        const rep = (p.match(/\uFFFD/g) || []).length; // Unicode replacement character (often indicates mojibake)
        const kif = (p.match(/\uFFFD/g) || []).length; // Replacement char is a strong mojibake marker
        const q = (p.match(/\?/g) || []).length;
        badChars += rep * 2 + kif * 6 + q * 0.2;
        if (rep > 0 || kif > 0) badEntries++;
      }
      if (totalChars === 0) return 0;
      const entryRatio = badEntries / Math.max(1, entries.length);
      const charRatio = badChars / totalChars;
      return entryRatio * 2 + charRatio;
    }

    async function runExtract() {
      const isWin = process.platform === 'win32';
      const selectedEntries = Array.isArray(entries)
        ? entries.map(item => String(item || '').trim()).filter(Boolean)
        : [];
      const args = ['x', '-y'];
      if (isWin) args.push('-sccUTF-8');
      args.push(`-o${destDir}`);
      args.push(archivePath);
      args.push(...selectedEntries);
      const child = spawn(archiveBinPath, args, {
        cwd: process.env.USERPROFILE || process.env.HOME || process.cwd(),
        shell: false,
        env: { ...process.env }
      });
      const errBuf = [];
      child.stderr.on('data', d => errBuf.push(Buffer.from(d)));
      const code = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', resolve);
      });
      if (code !== 0) {
        const stderr = Buffer.concat(errBuf).toString('utf8');
        throw new Error(stderr || '7z extract failed');
      }
      return true;
    }


    await runList();
    await runExtract();
    return { ok: true, charset: 'utf8' };
  } catch (e) {
    return { error: (e && e.message) || String(e) };
  }
});


ipcMain.handle('os:docExtractText', async (_, filePath) => {
  if (!WordExtractor) return { error: 'Word extractor not available.' };
  try {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(filePath);
    const parts = [];
    try { const body = doc.getBody(); if (body) parts.push(body); } catch (_) {}
    try { const headers = doc.getHeaders ? doc.getHeaders() : ''; if (headers) parts.push(headers); } catch (_) {}
    try { const footers = doc.getFooters ? doc.getFooters() : ''; if (footers) parts.push(footers); } catch (_) {}
    try { const notes = doc.getFootnotes ? doc.getFootnotes() : ''; if (notes) parts.push(notes); } catch (_) {}
    const text = parts.filter(Boolean).join('\n\n').trim();
    return { text };
  } catch (e) {
    return { error: (e && e.message) || String(e) };
  }
});


ipcMain.handle('os:pptExtractText', async (_, filePath) => {
  if (!PPT || !PPT.readFile || !PPT.utils || typeof PPT.utils.to_text !== 'function') {
    return { error: 'PPT parser not available.' };
  }
  try {
    const pres = PPT.readFile(filePath, {});
    const arr = PPT.utils.to_text(pres);
    const slides = Array.isArray(arr) ? arr.map(s => (s != null ? String(s).trim() : '')) : [];
    return { slides };
  } catch (e) {
    return { error: (e && e.message) || String(e) };
  }
});

ipcMain.handle('os:archiveAdd', async (_, archivePath, sourcePaths, options) => {
  if (!Seven || !path7za) return { error: 'Archive support not available.' };
  if (!Array.isArray(sourcePaths) || sourcePaths.length === 0) return { error: 'No files to add.' };
  try {
    const archiveBinPath = resolveArchiveBinaryPath();
    if (!archiveBinPath) return { error: '7z binary not found in packaged resources (asar unpack may be missing).' };
    const opts = { $bin: archiveBinPath, recursive: true };
    const stream = Seven.add(archivePath, sourcePaths, opts);
    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    return { ok: true };
  } catch (e) {
    return { error: (e && e.message) || String(e) };
  }
});

ipcMain.handle('os:showOpenDialog', async (_, options) => {
  const win = BrowserWindow.getFocusedWindow();
  const r = await dialog.showOpenDialog(win || mainWindow, options || {});
  return { canceled: r.canceled, filePaths: r.filePaths };
});

ipcMain.handle('os:showSaveDialog', async (_, options) => {
  const win = BrowserWindow.getFocusedWindow();
  const r = await dialog.showSaveDialog(win || mainWindow, options || {});
  return { canceled: r.canceled, filePath: r.filePath };
});



ipcMain.handle('os:openAppWindow', async (_, appId, title, url) => {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    parent: mainWindow,
    modal: false,
    frame: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false }
  });
  const file = path.join(__dirname, '../renderer', url || 'index.html');
  await win.loadFile(file, { hash: appId });
  windows.set(win.id, { appId, title, win });
  win.on('closed', () => windows.delete(win.id));
  return { winId: win.id };
});

ipcMain.on('os:closeAppWindow', (e, winId) => {
  const w = windows.get(winId);
  if (w && w.win) w.win.close();
});

ipcMain.on('managed-exe:request-status', (_, sessionId) => {
  const session = sessionId ? managedExeSessions.get(String(sessionId)) : null;
  if (!session || !session.hostWin || session.hostWin.isDestroyed()) return;
  try {
    sendManagedExeStatus(session, {});
  } catch (_) {}
});

ipcMain.on('managed-exe:control', async (_, sessionId, action) => {
  const session = managedExeSessions.get(sessionId);
  if (!session || !session.hostWin || session.hostWin.isDestroyed()) return;
  if (action === 'minimize') {
    session.hostWin.minimize();
    return;
  }
  if (action === 'toggle-maximize') {
    if (session.hostWin.isMaximized()) session.hostWin.unmaximize();
    else session.hostWin.maximize();
    sendManagedExeStatus(session, { type: session.attached ? 'ready' : 'launching' });
    return;
  }
  if (action === 'close') {
    session.hostWin.close();
    return;
  }
  if (action === 'focus-child') {
    await focusManagedExe(session);
  }
});

ipcMain.handle('managed-exe:taskbar-action', async (_, payload) => {
  const sessionId = payload && payload.sessionId ? String(payload.sessionId) : '';
  const action = payload && payload.action ? String(payload.action) : '';
  const session = sessionId ? managedExeSessions.get(sessionId) : null;
  if (!session || !session.hostWin || session.hostWin.isDestroyed()) return { ok: false };
  try {
    if (action === 'minimize') {
      session.hostWin.minimize();
      return { ok: true };
    }
    if (action === 'show-focus') {
      if (session.hostWin.isMinimized()) session.hostWin.restore();
      session.hostWin.show();
      session.hostWin.focus();
      return { ok: true };
    }
    if (action === 'close') {
      session.hostWin.close();
      return { ok: true };
    }
  } catch (_) {}
  return { ok: false };
});

ipcMain.handle('managed-exe:minimize-all', async () => {
  managedExeSessions.forEach((s) => {
    try {
      if (s.hostWin && !s.hostWin.isDestroyed() && !s.hostWin.isMinimized()) s.hostWin.minimize();
    } catch (_) {}
  });
  return { ok: true };
});

ipcMain.handle('managed-exe:restore-all', async () => {
  managedExeSessions.forEach((s) => {
    try {
      if (s.hostWin && !s.hostWin.isDestroyed() && s.hostWin.isMinimized()) s.hostWin.restore();
    } catch (_) {}
  });
  return { ok: true };
});


ipcMain.handle('os:getProcessList', async () => {
  try {
    const metrics = typeof app.getAppMetrics === 'function' ? app.getAppMetrics() : [];
    const list = (Array.isArray(metrics) ? metrics : []).map(item => {
      const memoryInfo = item && item.memory ? item.memory : {};
      const cpuInfo = item && item.cpu ? item.cpu : {};
      const rawMemoryKb = Number(
        memoryInfo.workingSetSize
        || memoryInfo.privateBytes
        || memoryInfo.residentSetSize
        || 0
      );
      const memory = Math.max(0, rawMemoryKb) * 1024;
      const cpu = Math.max(0, Number(cpuInfo.percentCPUUsage) || 0);
      const type = item && item.type ? String(item.type) : 'unknown';
      const serviceName = item && item.serviceName ? String(item.serviceName) : '';
      const nameMap = {
        Browser: 'Star OS Browser Process',
        GPU: 'Star OS GPU Process',
        Utility: serviceName ? ('Star OS Utility (' + serviceName + ')') : 'Star OS Utility Process',
        Tab: 'Star OS Renderer Process',
        Zygote: 'Star OS Zygote Process',
        SandboxHelper: 'Star OS Sandbox Helper'
      };
      return {
        pid: Number(item && item.pid) || 0,
        name: nameMap[type] || ('Star OS ' + type + ' Process'),
        memory,
        cpu,
        type
      };
    }).filter(item => item.pid > 0);
    if (!list.some(item => item.pid === process.pid)) {
      list.unshift({
        pid: process.pid,
        name: 'Star OS Main Process',
        memory: process.memoryUsage().rss,
        cpu: 0,
        type: 'Browser'
      });
    }
  return list;
  } catch (_) {
    return [{
      pid: process.pid,
      name: 'Star OS Main Process',
      memory: process.memoryUsage().rss,
      cpu: 0,
      type: 'Browser'
    }];
  }
});

ipcMain.handle('os:getMemoryInfo', async () => {
  const processMem = process.memoryUsage();
  const total = os.totalmem();
  const free = os.freemem();
  return {
    process: { rss: processMem.rss, heapUsed: processMem.heapUsed, heapTotal: processMem.heapTotal, external: processMem.external },
    system: { total, free, used: total - free }
  };
});

ipcMain.handle('os:getDeviceInfo', async () => {
  const cpus = os.cpus();
  const ifaces = os.networkInterfaces();
  const interfaces = [];
  if (ifaces) {
    for (const [name, addrs] of Object.entries(ifaces)) {
      const list = (addrs || []).filter(a => !a.internal).map(a => ({ address: a.address, family: a.family }));
      if (list.length) interfaces.push({ name, addresses: list });
    }
  }
  return {
    platform: os.platform(),
    release: os.release(),
    hostname: os.hostname(),
    arch: os.arch(),
    cpuCount: cpus.length,
    cpuModel: (cpus[0] && cpus[0].model) ? cpus[0].model.trim() : '',
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    networkInterfaces: interfaces
  };
});

// Capture the main window for the screenshot tool.
ipcMain.handle('os:captureScreen', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  try {
    const img = await mainWindow.webContents.capturePage();
    return img ? img.toDataURL() : null;
  } catch (_) {
    return null;
  }
});