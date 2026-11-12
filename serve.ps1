param(
    [int]$Port = 8765
)
$ErrorActionPreference = "Stop"
$site = Join-Path $PSScriptRoot "site"
Write-Host "Serving $site at http://127.0.0.1:$Port/"
python -m http.server $Port --bind 127.0.0.1 --directory $site
