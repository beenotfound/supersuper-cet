param(
    [switch]$DryRun
)
$ErrorActionPreference = "Stop"
if ($DryRun) { python (Join-Path $PSScriptRoot "tools\deploy.py") --dry-run }
else { python (Join-Path $PSScriptRoot "tools\deploy.py") }
