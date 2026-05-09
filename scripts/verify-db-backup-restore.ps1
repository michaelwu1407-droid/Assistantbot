param(
  [string]$OutputDir = "",
  [string]$SourceUrl = "",
  [switch]$KeepContainer
)

$ErrorActionPreference = "Stop"

function Get-EnvValue {
  param(
    [string]$Name
  )

  $direct = [Environment]::GetEnvironmentVariable($Name)
  if ($direct) {
    return $direct
  }

  foreach ($path in @(".env.local", ".env")) {
    if (-not (Test-Path $path)) {
      continue
    }

    $line = Get-Content $path | Where-Object { $_ -match "^$Name=" } | Select-Object -First 1
    if ($line) {
      return $line.Substring($Name.Length + 1).Trim('"')
    }
  }

  return $null
}

function Invoke-Docker {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$DockerArgs
  )

  & docker @DockerArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed: docker $($DockerArgs -join ' ')"
  }
}

$databaseUrl = if ($SourceUrl) { $SourceUrl } else { Get-EnvValue -Name "DIRECT_URL" }
if (-not $databaseUrl) {
  throw "DIRECT_URL not found in environment, .env.local, or .env."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$safeRunId = "earlymark-db-restore-$timestamp"
$resolvedOutputDir = if ($OutputDir) {
  [System.IO.Path]::GetFullPath($OutputDir)
} else {
  Join-Path ([System.IO.Path]::GetTempPath()) $safeRunId
}

New-Item -ItemType Directory -Force -Path $resolvedOutputDir | Out-Null

$dumpPath = Join-Path $resolvedOutputDir "prod-backup.dump"
$summaryPath = Join-Path $resolvedOutputDir "restore-summary.json"
$containerName = "$safeRunId-pg"
$containerDumpPath = "/tmp/prod-backup.dump"
$postgresPassword = "postgres"
$postgresImage = "postgres:17"

Write-Host "Output directory: $resolvedOutputDir"
Write-Host "Creating compressed logical backup..."
Invoke-Docker -DockerArgs @(
  "run",
  "--rm",
  "-e",
  "PGSSLMODE=require",
  "-v",
  "${resolvedOutputDir}:/backup",
  $postgresImage,
  "pg_dump",
  "--format=custom",
  "--no-owner",
  "--no-acl",
  "--schema=public",
  "--file",
  "/backup/prod-backup.dump",
  $databaseUrl
)

Write-Host "Starting disposable restore container..."
Invoke-Docker -DockerArgs @(
  "run",
  "--name",
  $containerName,
  "-e",
  "POSTGRES_PASSWORD=$postgresPassword",
  "-e",
  "POSTGRES_DB=restorecheck",
  "-d",
  $postgresImage
)

try {
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    try {
      & docker exec $containerName pg_isready -U postgres -d restorecheck | Out-Null
      if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 1
    }
    Start-Sleep -Seconds 1
  }

  if (-not $ready) {
    throw "Restore container did not become ready in time."
  }

  Write-Host "Copying backup into restore container..."
  Invoke-Docker -DockerArgs @("cp", $dumpPath, "${containerName}:${containerDumpPath}")

  Write-Host "Restoring backup into disposable Postgres..."
  Invoke-Docker -DockerArgs @(
    "exec",
    $containerName,
    "pg_restore",
    "-U",
    "postgres",
    "-d",
    "restorecheck",
    "--clean",
    "--if-exists",
    "--no-owner",
    $containerDumpPath
  )

  $query = @"
select json_build_object(
  'workspace_count', (select count(*) from "Workspace"),
  'user_count', (select count(*) from "User"),
  'contact_count', (select count(*) from "Contact"),
  'deal_count', (select count(*) from "Deal"),
  'voice_call_count', (select count(*) from "VoiceCall"),
  'webhook_event_count', (select count(*) from "WebhookEvent")
);
"@

  $countsJson = $query | & docker exec -i $containerName psql -U postgres -d restorecheck -tA
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to query restored database."
  }

  $summary = [ordered]@{
    checkedAt = (Get-Date).ToString("o")
    backupFile = $dumpPath
    restoreContainer = $containerName
    counts = ($countsJson.Trim() | ConvertFrom-Json)
  }

  $summary | ConvertTo-Json -Depth 5 | Set-Content -Path $summaryPath -Encoding utf8

  Write-Host "Restore verification complete."
  Write-Host "Summary written to $summaryPath"
  Write-Host $countsJson.Trim()
} finally {
  if (-not $KeepContainer) {
    & docker rm -f $containerName | Out-Null
  }
}
