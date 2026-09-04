$ErrorActionPreference = 'Stop'
$taskName = 'NextGenScores Scoreboard Refresh'
$backendDirectory = Split-Path $PSScriptRoot -Parent
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$runnerPath = Join-Path $PSScriptRoot 'refreshScoreboardLocal.js'
$taskUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    throw "Task already exists: $taskName. Inspect it before replacing it."
}

$action = New-ScheduledTaskAction -Execute $nodePath -Argument ('"' + $runnerPath + '"') -WorkingDirectory $backendDirectory
$triggers = @(
    (New-ScheduledTaskTrigger -Daily -At '7:00AM'),
    (New-ScheduledTaskTrigger -Daily -At '7:00PM')
)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -RunOnlyIfNetworkAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 15) -ExecutionTimeLimit (New-TimeSpan -Minutes 25)
# S4U avoids storing a Windows password and can run while signed out.
# The importer uses its own API/database credentials, not Windows network authentication.
$principal = New-ScheduledTaskPrincipal -UserId $taskUser -LogonType S4U -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Settings $settings -Principal $principal -Description 'Refresh college football scores at 7 AM and 7 PM local time; catch up missed runs and retry failures.'
