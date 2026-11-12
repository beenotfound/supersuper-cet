#requires -Version 5.1
<#
  tools/net_check.ps1 — 裸连 GitHub 连通性体检。
  用法：powershell -ExecutionPolicy Bypass -File tools\net_check.ps1 [-Rounds 5]
  输出：git ls-remote / api / ssh 443 / codeload 的成功率与耗时，改配置前后各跑一次。
#>
param(
  [string]$Repo = 'https://github.com/beenotfound/supersuper-cet.git',
  [int]$Rounds = 5
)

function Report($name, $ok, $total, $times, $extra = '') {
  $avg = if ($times.Count) { [math]::Round(($times | Measure-Object -Average).Average) } else { 0 }
  $max = if ($times.Count) { [math]::Round(($times | Measure-Object -Maximum).Maximum) } else { 0 }
  '{0,-20} ok={1}/{2}  avg={3,6}ms  max={4,6}ms  {5}' -f $name, $ok, $total, $avg, $max, $extra
}

# 1) git ls-remote (HTTPS smart HTTP)
$ok = 0; $times = @()
for ($i = 0; $i -lt $Rounds; $i++) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  git ls-remote --heads $Repo *> $null
  $code = $LASTEXITCODE
  $sw.Stop()
  if ($code -eq 0) { $ok++ }
  $times += $sw.Elapsed.TotalMilliseconds
}
Report 'git ls-remote' $ok $Rounds $times

# 2) api.github.com（短请求基线）
$ok = 0; $times = @()
for ($i = 0; $i -lt $Rounds; $i++) {
  $out = curl.exe -s -o NUL -w '%{time_total}' --max-time 8 https://api.github.com/zen 2>$null
  if ($LASTEXITCODE -eq 0) { $ok++ }
  if ($out -as [double]) { $times += [double]$out * 1000 }
}
Report 'api.github.com' $ok $Rounds $times

# 3) SSH over 443（看能否完成握手；“Permission denied (publickey)”也算连通）
$ok = 0; $times = @()
for ($i = 0; $i -lt $Rounds; $i++) {
  $outFile = Join-Path $env:TEMP 'net_check_ssh_out.txt'
  $errFile = Join-Path $env:TEMP 'net_check_ssh_err.txt'
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $p = Start-Process ssh -ArgumentList '-o','BatchMode=yes','-o','ConnectTimeout=8','-T','git@github.com' `
        -NoNewWindow -PassThru -RedirectStandardOutput $outFile -RedirectStandardError $errFile
  if ($p.WaitForExit(12000)) {
    $txt = ((Get-Content $outFile -Raw -ErrorAction SilentlyContinue) + (Get-Content $errFile -Raw -ErrorAction SilentlyContinue))
    if ($txt -match 'Permission denied|Hi ') { $ok++ }
  } else { $p.Kill() }
  $sw.Stop()
  $times += $sw.Elapsed.TotalMilliseconds
}
Report 'ssh github.com:443' $ok $Rounds $times

# 4) codeload 下载（约 1 MB，看吞吐）
$out = curl.exe -s -o NUL -w '%{http_code} %{size_download} %{speed_download}' --max-time 20 `
  -r 0-1048575 https://codeload.github.com/beenotfound/supersuper-cet/tar.gz/refs/heads/main 2>$null
$p = $out -split ' '
if ($p.Count -ge 3) {
  '{0,-20} http={1}  size={2}KB  speed={3}KB/s' -f 'codeload', $p[0], [math]::Round([double]$p[1]/1KB), [math]::Round([double]$p[2]/1KB)
}

Write-Host ''
Write-Host '提示：改完 SSH/git 配置后再跑一次本脚本对比。'
