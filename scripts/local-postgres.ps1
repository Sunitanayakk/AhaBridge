param([ValidateSet('start','stop','status')][string]$Action='status')
$projectPath = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $projectPath '.local\pgdata'
$controlPath = 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe'
if (!(Test-Path -LiteralPath $dataPath)) { throw 'The workspace-local development cluster has not been initialized.' }
if ($Action -eq 'start') {
    & $controlPath -D $dataPath -l (Join-Path $projectPath '.local\postgres.log') -o '-h 127.0.0.1 -p 55432 -c shared_buffers=32MB -c max_connections=30' start
} elseif ($Action -eq 'stop') {
    & $controlPath -D $dataPath stop -m fast
} else {
    & $controlPath -D $dataPath status
}
