$ErrorActionPreference = "Stop"

$taskName = "Game Reference Radar Daily"
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Removed scheduled task '$taskName'."
} else {
  Write-Host "Scheduled task '$taskName' was not installed."
}
