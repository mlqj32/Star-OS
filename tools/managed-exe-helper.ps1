
param(
  [Parameter(Mandatory=$true)][string]$Action,
  [Int64]$ProcessId = 0,
  [string]$ProcessPath = '',
  [Int64]$ParentHwnd = 0,
  [Int64]$ChildHwnd = 0,
  [int]$X = 0,
  [int]$Y = 0,
  [int]$Width = 0,
  [int]$Height = 0,
  [int]$TimeoutMs = 45000,
  [int]$IntervalMs = 300
)

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

[StructLayout(LayoutKind.Sequential)]
public struct StarClientRect {
  public int Left;
  public int Top;
  public int Right;
  public int Bottom;
}

public static class WinApi {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hWnd, out StarClientRect lpRect);
  [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr hWnd);

  [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr", SetLastError = true)] private static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);
  [DllImport("user32.dll", EntryPoint = "SetWindowLongPtr", SetLastError = true)] private static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);
  [DllImport("user32.dll", EntryPoint = "GetWindowLong", SetLastError = true)] private static extern IntPtr GetWindowLong32(IntPtr hWnd, int nIndex);
  [DllImport("user32.dll", EntryPoint = "SetWindowLong", SetLastError = true)] private static extern IntPtr SetWindowLong32(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

  public static IntPtr GetWindowLongPtr(IntPtr hWnd, int nIndex) {
    return IntPtr.Size == 8 ? GetWindowLongPtr64(hWnd, nIndex) : GetWindowLong32(hWnd, nIndex);
  }

  public static IntPtr SetWindowLongPtr(IntPtr hWnd, int nIndex, IntPtr dwNewLong) {
    return IntPtr.Size == 8 ? SetWindowLongPtr64(hWnd, nIndex, dwNewLong) : SetWindowLong32(hWnd, nIndex, dwNewLong);
  }
}
"@

$GWL_STYLE = -16
$GWL_EXSTYLE = -20
$GW_OWNER = 4
$WS_CAPTION = 0x00C00000L
$WS_THICKFRAME = 0x00040000L
$WS_MINIMIZE = 0x20000000L
$WS_MAXIMIZE = 0x01000000L
$WS_SYSMENU = 0x00080000L
$WS_BORDER = 0x00800000L
$WS_POPUP = 0x80000000L
$WS_CHILD = 0x40000000L
$WS_VISIBLE = 0x10000000L
$WS_EX_DLGMODALFRAME = 0x00000001L
$WS_EX_CLIENTEDGE = 0x00000200L
$WS_EX_STATICEDGE = 0x00020000L
$SW_HIDE = 0
$SW_SHOW = 5
$SW_RESTORE = 9
$SWP_NOZORDER = 0x0004
$SWP_FRAMECHANGED = 0x0020
$SWP_SHOWWINDOW = 0x0040
$SWP_NOSIZE = 0x0001
$SWP_NOMOVE = 0x0002
$HWND_TOP = [IntPtr]::new(-1)
$WS_CLIPSIBLINGS = 0x04000000
$WS_CLIPCHILDREN = 0x02000000

function Normalize-PathValue {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  try {
    return [System.IO.Path]::GetFullPath($Value).Trim().ToLowerInvariant()
  } catch {
    return $Value.Trim().ToLowerInvariant()
  }
}

function Get-ProcessImagePath {
  param([UInt32]$TargetPid)
  try {
    return Normalize-PathValue ([System.Diagnostics.Process]::GetProcessById([int]$TargetPid).MainModule.FileName)
  } catch {
    return ''
  }
}

function Get-MainWindowHandle {
  param(
    [UInt32[]]$TargetPids,
    [string]$TargetProcessPath = ''
  )
  $candidates = New-Object System.Collections.Generic.List[IntPtr]
  $pidMap = @{}
  foreach ($pidItem in ($TargetPids | Where-Object { $_ -gt 0 })) {
    $pidMap[[string]$pidItem] = $true
  }
  $normalizedPath = Normalize-PathValue $TargetProcessPath
  [WinApi]::EnumWindows({
    param($hWnd, $lParam)
    $windowPid = 0
    [void][WinApi]::GetWindowThreadProcessId($hWnd, [ref]$windowPid)
    if ($pidMap.Count -gt 0 -and -not $pidMap.ContainsKey([string]$windowPid)) { return $true }
    if ($normalizedPath) {
      $imagePath = Get-ProcessImagePath $windowPid
      if (-not $imagePath -or $imagePath -ne $normalizedPath) { return $true }
    }
    if (-not [WinApi]::IsWindowVisible($hWnd)) { return $true }
    if ([WinApi]::GetWindow($hWnd, $GW_OWNER) -ne [IntPtr]::Zero) { return $true }
    $cr = New-Object StarClientRect
    if (-not [WinApi]::GetClientRect($hWnd, [ref]$cr)) { return $true }
    $cw = [int]($cr.Right - $cr.Left)
    $ch = [int]($cr.Bottom - $cr.Top)
    if ($cw -lt 120 -or $ch -lt 80) { return $true }
    [void]$candidates.Add($hWnd)
    return $true
  }, [IntPtr]::Zero) | Out-Null

  if ($candidates.Count -eq 0) { return [IntPtr]::Zero }

  $best = [IntPtr]::Zero
  $bestArea = -1
  foreach ($h in $candidates) {
    $cr = New-Object StarClientRect
    if (-not [WinApi]::GetClientRect($h, [ref]$cr)) { continue }
    $cw = [int]($cr.Right - $cr.Left)
    $ch = [int]($cr.Bottom - $cr.Top)
    $area = $cw * $ch
    if ($area -gt $bestArea) {
      $bestArea = $area
      $best = $h
    }
  }
  return $best
}

switch ($Action.ToLowerInvariant()) {
  'find' {
    $hWnd = Get-MainWindowHandle -TargetPids @([UInt32]$ProcessId)
    if ($hWnd -eq [IntPtr]::Zero) { Write-Output '0' } else { Write-Output $hWnd.ToInt64() }
    break
  }
  'findpath' {
    $hWnd = Get-MainWindowHandle -TargetPids @() -TargetProcessPath $ProcessPath
    if ($hWnd -eq [IntPtr]::Zero) { Write-Output '0' } else { Write-Output $hWnd.ToInt64() }
    break
  }
  'wait' {
    $deadline = [DateTime]::UtcNow.AddMilliseconds([double]$TimeoutMs)
    while ([DateTime]::UtcNow -lt $deadline) {
      try {
        $hWnd = Get-MainWindowHandle -TargetPids @([UInt32]$ProcessId)
        if ($hWnd -ne [IntPtr]::Zero) { Write-Output $hWnd.ToInt64(); exit 0 }
      } catch {
        # ignore and retry
      }

      try {
        if ($ProcessPath -and $ProcessPath.Trim().Length -gt 0) {
          $hWnd2 = Get-MainWindowHandle -TargetPids @() -TargetProcessPath $ProcessPath
          if ($hWnd2 -ne [IntPtr]::Zero) { Write-Output $hWnd2.ToInt64(); exit 0 }
        }
      } catch {
        # ignore and retry
      }

      Start-Sleep -Milliseconds $IntervalMs
    }
    Write-Output '0'
    break
  }
  'embed' {
    # 恢复原托管策略：SetParent + 客户区 MoveWindow。
    $child = [IntPtr]::new($ChildHwnd)
    $parent = [IntPtr]::new($ParentHwnd)
    if (-not [WinApi]::IsWindow($child) -or -not [WinApi]::IsWindow($parent)) {
      Write-Error 'Invalid window handle.'
      exit 1
    }
    $titleLogical = 44
    if ($Y -gt 0 -and $Y -le 128) { $titleLogical = $Y }
    $dpi = 96
    $d = [WinApi]::GetDpiForWindow($parent)
    if ($d -gt 0) { $dpi = [int]$d }
    $titlebarPx = [int][Math]::Round($titleLogical * $dpi / 96.0)

    $crect = New-Object StarClientRect
    if (-not [WinApi]::GetClientRect($parent, [ref]$crect)) {
      Write-Error 'GetClientRect failed.'
      exit 1
    }
    $clientW = [int]($crect.Right - $crect.Left)
    $clientH = [int]($crect.Bottom - $crect.Top)
    if ($titlebarPx -ge $clientH) { $titlebarPx = [Math]::Max(0, $clientH - 80) }
    $embedW = [Math]::Max(240, $clientW)
    $embedH = [Math]::Max(160, $clientH - $titlebarPx)

    $style = [WinApi]::GetWindowLongPtr($child, $GWL_STYLE).ToInt64()
    $style = $style -band (-bnot [Int64]$WS_POPUP)
    $style = $style -band (-bnot [Int64]$WS_CAPTION)
    $style = $style -band (-bnot [Int64]$WS_THICKFRAME)
    $style = $style -band (-bnot [Int64]$WS_MINIMIZE)
    $style = $style -band (-bnot [Int64]$WS_MAXIMIZE)
    $style = $style -band (-bnot [Int64]$WS_SYSMENU)
    $style = $style -band (-bnot [Int64]$WS_BORDER)
    $style = $style -bor ([Int64]$WS_CHILD -bor [Int64]$WS_VISIBLE)
    [void][WinApi]::SetWindowLongPtr($child, $GWL_STYLE, [IntPtr]::new($style))

    [void][WinApi]::SetParent($child, $parent)
    [void][WinApi]::MoveWindow($child, 0, $titlebarPx, $embedW, $embedH, $true)
    [void][WinApi]::ShowWindow($child, $SW_RESTORE)
    [void][WinApi]::ShowWindow($child, $SW_SHOW)
    Write-Output 'ok'
    break
  }
  'raise' {
    $child = [IntPtr]::new($ChildHwnd)
    if (-not [WinApi]::IsWindow($child)) {
      Write-Error 'Invalid window handle.'
      exit 1
    }
    [void][WinApi]::SetWindowPos($child, $HWND_TOP, 0, 0, 0, 0, $SWP_NOMOVE -bor $SWP_NOSIZE -bor $SWP_SHOWWINDOW)
    Write-Output 'ok'
    break
  }
  'focus' {
    $child = [IntPtr]::new($ChildHwnd)
    if (-not [WinApi]::IsWindow($child)) {
      Write-Error 'Invalid window handle.'
      exit 1
    }
    [void][WinApi]::ShowWindow($child, $SW_RESTORE)
    [void][WinApi]::SetForegroundWindow($child)
    Write-Output 'ok'
    break
  }
  'hide' {
    $child = [IntPtr]::new($ChildHwnd)
    if (-not [WinApi]::IsWindow($child)) {
      Write-Error 'Invalid window handle.'
      exit 1
    }
    [void][WinApi]::ShowWindow($child, $SW_HIDE)
    Write-Output 'ok'
    break
  }
  default {
    Write-Error "Unknown action: $Action"
    exit 1
  }
}