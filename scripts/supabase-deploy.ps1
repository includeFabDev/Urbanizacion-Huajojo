param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("status", "preflight", "sprint1-preflight", "dry-run", "apply", "import", "verify")]
  [string]$Action
)

$ErrorActionPreference = "Continue"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$envFile = Join-Path $repoRoot ".env.local"
if (-not (Test-Path -LiteralPath $envFile)) {
  throw ".env.local is missing."
}

$localValues = @{}
foreach ($line in Get-Content -LiteralPath $envFile) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
    $name = $Matches[1]
    $value = $Matches[2].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $localValues[$name] = $value
    Set-Item -Path "Env:$name" -Value $value
  }
}

foreach ($name in @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL"
)) {
  if (-not $localValues.ContainsKey($name) -or
      [string]::IsNullOrWhiteSpace($localValues[$name])) {
    throw "Required variable is missing: $name"
  }
}

$databaseUrl = $localValues["SUPABASE_DB_URL"]
if ($databaseUrl -notmatch '^postgres(ql)?://') {
  throw "SUPABASE_DB_URL is not a PostgreSQL connection URL."
}

$databaseHost = ([uri]$databaseUrl).Host

function Invoke-SupabaseCli {
  param([string[]]$Arguments)

  $result = & npx --yes supabase@latest @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $output = $result | Out-String

  foreach ($value in $localValues.Values) {
    if (-not [string]::IsNullOrEmpty($value)) {
      $output = $output.Replace($value, "[REDACTED]")
    }
  }
  if ($databaseHost) {
    $output = $output.Replace($databaseHost, "[DB-HOST]")
  }
  $output = [regex]::Replace(
    $output,
    '(?i)(password|token|apikey|service_role)=([^\s&]+)',
    '$1=[REDACTED]'
  )

  Write-Output $output
  if ($exitCode -ne 0) {
    throw "Supabase CLI failed (exit code $exitCode)."
  }
}

$remote = "--remote=$databaseUrl"
$workdir = "--workdir=$repoRoot"

switch ($Action) {
  "status" {
    Invoke-SupabaseCli -Arguments @(
      "db", "query", $remote, "--read-only",
      "select current_database() as connected_database, current_setting('server_version') as postgres_version",
      $workdir
    )
    Invoke-SupabaseCli -Arguments @(
      "migration", "list", $remote, $workdir
    )
  }
  "dry-run" {
    Invoke-SupabaseCli -Arguments @(
      "db", "push", "--dry-run", $remote, "--skip-vault", $workdir
    )
  }
  "preflight" {
    Invoke-SupabaseCli -Arguments @(
      "db", "query", $remote, "--read-only", "--file",
      (Join-Path $repoRoot "supabase\verification\pre-import.sql"), $workdir
    )
  }
  "sprint1-preflight" {
    Invoke-SupabaseCli -Arguments @(
      "db", "query", $remote, "--read-only", "--file",
      (Join-Path $repoRoot "supabase\verification\sprint1-preflight.sql"), $workdir
    )
  }
  "apply" {
    Invoke-SupabaseCli -Arguments @(
      "db", "push", $remote, "--yes", "--skip-vault", $workdir
    )
  }
  "import" {
    Invoke-SupabaseCli -Arguments @(
      "db", "query", $remote, "--file",
      (Join-Path $repoRoot "supabase\import_existing.sql"),
      "--yes", $workdir
    )
  }
  "verify" {
    Invoke-SupabaseCli -Arguments @(
      "db", "query", $remote, "--read-only", "--file",
      (Join-Path $repoRoot "supabase\verification\post-import.sql"), $workdir
    )
  }
}
