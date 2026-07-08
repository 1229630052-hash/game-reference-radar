$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$taskName = "Game Reference Radar Daily"
$runner = Join-Path $projectRoot "scripts\run-node-with-system-proxy.ps1"
$dailyScript = "src\daily.js"
$configPath = Join-Path $projectRoot "data\config.json"
$config = Get-Content -Raw $configPath | ConvertFrom-Json
$time = if ($config.scheduleTime) { $config.scheduleTime } else { "09:00" }

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$runner`" `"$dailyScript`"" -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -Daily -At $time
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Generate daily game creative inspiration report." -Force | Out-Null

Write-Host "Installed scheduled task '$taskName' at $time."
