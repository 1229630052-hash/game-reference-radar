$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$settings = Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
$proxy = ""

if ($settings.ProxyEnable -eq 1 -and $settings.ProxyServer) {
  $proxy = [string]$settings.ProxyServer
  if ($proxy -match "=") {
    $parts = @{}
    foreach ($item in $proxy -split ";") {
      $pair = $item -split "=", 2
      if ($pair.Length -eq 2) { $parts[$pair[0].ToLowerInvariant()] = $pair[1] }
    }
    $proxy = if ($parts["https"]) { $parts["https"] } elseif ($parts["http"]) { $parts["http"] } else { "" }
  }
}

if ($proxy -and $proxy -notmatch "^https?://") {
  $proxy = "http://$proxy"
}

if ($proxy) {
  $env:HTTP_PROXY = $proxy
  $env:HTTPS_PROXY = $proxy
  $env:ALL_PROXY = $proxy
  $env:NO_PROXY = "127.0.0.1,localhost"
  Write-Host "Using Windows proxy for Node: $proxy"
} else {
  Write-Host "Windows proxy is not enabled. Starting Node without proxy."
}

$nodeArgs = @()
if ($proxy -and ((node --help) -match "--use-env-proxy")) {
  $nodeArgs += "--use-env-proxy"
}
$nodeArgs += $args

Push-Location $projectRoot
try {
  & node @nodeArgs
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
