
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

$patterns = '*.js','*.jsx','*.ts','*.tsx','*.html','*.css'
$files = Get-ChildItem -Recurse -Include $patterns -File |
  Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\dist\\' }

$total = 0
foreach ($f in $files) {
  $c = (Get-Content $f.FullName | Measure-Object -Line).Lines
  $total += $c
}

Write-Output \"TotalLines=$total\"
