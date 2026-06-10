
// Extra i18n keys for lock screen and lock settings (added as a separate file to avoid touching legacy encodings).
(function () {
  if (typeof LOCALES !== 'object' || !LOCALES) return;

  function assign(locale, map) {
    try {
      if (!LOCALES[locale]) LOCALES[locale] = {};
      Object.assign(LOCALES[locale], map);
    } catch (_) {}
  }

  assign('zh-CN', {
    lockHintNoPin: '按 Enter 或点击屏幕解锁。',
    lockHintEnterPin: '请输入锁屏密码解锁。',
    lockPinIncorrect: '密码错误，请重试。',
    lockPinConfirmPlaceholder: '确认新的锁屏密码',
    showPassword: '显示密码',
    autoLock: '自动锁屏',
    autoLockHint: '在你无操作一段时间后自动锁屏。',
    autoLockOff: '关闭',
    autoLock1m: '1 分钟',
    autoLock5m: '5 分钟',
    autoLock10m: '10 分钟',
    autoLock30m: '30 分钟',
    lockPinMismatch: '两次输入的新密码不一致。',
    lockPinTooShort: '密码至少 {min} 位。',
    lockPinStatusSet: '当前状态：已设置锁屏密码',
    lockPinStatusUnset: '当前状态：未设置锁屏密码',
  });

  assign('zh-TW', {
    lockHintNoPin: '按 Enter 或點擊螢幕解鎖。',
    lockHintEnterPin: '請輸入鎖定 PIN 解鎖。',
    lockPinIncorrect: '密碼錯誤，請重試。',
    lockPinConfirmPlaceholder: '確認新的鎖定 PIN',
    showPassword: '顯示密碼',
    autoLock: '自動鎖屏',
    autoLockHint: '當你無操作一段時間後自動鎖屏。',
    autoLockOff: '關閉',
    autoLock1m: '1 分鐘',
    autoLock5m: '5 分鐘',
    autoLock10m: '10 分鐘',
    autoLock30m: '30 分鐘',
    lockPinMismatch: '兩次輸入的新密碼不一致。',
    lockPinTooShort: '密碼至少 {min} 位。',
    lockPinStatusSet: '目前狀態：已設定鎖屏密碼',
    lockPinStatusUnset: '目前狀態：未設定鎖屏密碼',
  });

  assign('en', {
    lockHintNoPin: 'Press Enter or click to unlock.',
    lockHintEnterPin: 'Enter your PIN to unlock.',
    lockPinIncorrect: 'Incorrect PIN. Please try again.',
    lockPinConfirmPlaceholder: 'Confirm new PIN',
    showPassword: 'Show PIN',
    autoLock: 'Auto lock',
    autoLockHint: 'Automatically lock the screen after a period of inactivity.',
    autoLockOff: 'Off',
    autoLock1m: '1 minute',
    autoLock5m: '5 minutes',
    autoLock10m: '10 minutes',
    autoLock30m: '30 minutes',
    lockPinMismatch: 'The new PINs do not match.',
    lockPinTooShort: 'PIN must be at least {min} characters.',
    lockPinStatusSet: 'Status: PIN is set',
    lockPinStatusUnset: 'Status: PIN is not set',
  });

  assign('ja', {
    lockHintNoPin: 'Enter またはクリックで解除。',
    lockHintEnterPin: 'PIN を入力して解除。',
    lockPinIncorrect: 'PIN が違います。もう一度試してください。',
    lockPinConfirmPlaceholder: '新しい PIN を再入力',
    showPassword: 'PIN を表示',
    autoLock: '自動ロック',
    autoLockHint: '一定時間操作がないと自動でロックします。',
    autoLockOff: 'オフ',
    autoLock1m: '1 分',
    autoLock5m: '5 分',
    autoLock10m: '10 分',
    autoLock30m: '30 分',
    lockPinMismatch: '新しい PIN が一致しません。',
    lockPinTooShort: 'PIN は最低 {min} 文字必要です。',
    lockPinStatusSet: '状態: PIN は設定済み',
    lockPinStatusUnset: '状態: PIN は未設定',
  });

  assign('ko', {
    lockHintNoPin: 'Enter 또는 클릭으로 잠금 해제.',
    lockHintEnterPin: 'PIN을 입력하여 잠금을 해제하세요.',
    lockPinIncorrect: 'PIN이 올바르지 않습니다. 다시 시도하세요.',
    lockPinConfirmPlaceholder: '새 PIN 확인',
    showPassword: 'PIN 표시',
    autoLock: '자동 잠금',
    autoLockHint: '일정 시간 활동이 없으면 자동으로 잠금합니다.',
    autoLockOff: '끄기',
    autoLock1m: '1분',
    autoLock5m: '5분',
    autoLock10m: '10분',
    autoLock30m: '30분',
    lockPinMismatch: '새 PIN이 일치하지 않습니다.',
    lockPinTooShort: 'PIN은 최소 {min}자여야 합니다.',
    lockPinStatusSet: '상태: PIN 설정됨',
    lockPinStatusUnset: '상태: PIN 미설정',
  });
})();
