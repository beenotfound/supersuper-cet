#requires -Version 5.1
<#
  tools/git_push.ps1 — 带退避重试的 git push（应对国内到 GitHub 的间歇性断流）。
  用法：
    powershell -ExecutionPolicy Bypass -File tools\git_push.ps1
    powershell -ExecutionPolicy Bypass -File tools\git_push.ps1 -Remote gitee
#>
param(
  [string]$Remote = 'origin',
  [string]$Branch = 'main',
  [int]$Retries = 5
)

for ($i = 1; $i -le $Retries; $i++) {
  Write-Host ("push {0} {1}  (attempt {2}/{3})" -f $Remote, $Branch, $i, $Retries)
  $sw = [Diagnostics.Stopwatch]::StartNew()
  git push $Remote $Branch
  $code = $LASTEXITCODE
  $sw.Stop()
  if ($code -eq 0) {
    Write-Host ("push ok in {0:N1}s" -f $sw.Elapsed.TotalSeconds)
    exit 0
  }
  $wait = [math]::Min(30, [math]::Pow(2, $i))
  Write-Host ("failed (exit {0}), retry in {1}s" -f $code, $wait)
  Start-Sleep -Seconds $wait
}

Write-Host @'

push 连续失败，建议按顺序试：
1) 再跑一次本脚本（链路可能只是短时抖动）
2) 确认 SSH 443 可用：ssh -T git@github.com
   remote 切到 SSH：git remote set-url origin git@github.com:beenotfound/supersuper-cet.git
3) 改用国内镜像：git push gitee main
4) 跑 php tools/net_check.ps1 看是 git 通道还是整体网络问题
'@
exit 1
