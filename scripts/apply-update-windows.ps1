param(
  [Parameter(Mandatory = $true)][string]$StateFile
)

$ErrorActionPreference = "Stop"
$resultPath = "$StateFile.result"
function Write-UpdateResult([string]$Status, [string]$Message) {
  try {
    [System.IO.File]::WriteAllText($resultPath, "$Status`r`n$Message", [System.Text.Encoding]::UTF8)
    return $true
  } catch {
    return $false
  }
}
try {
  $stateText = [System.IO.File]::ReadAllText($StateFile, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
  $stateLines = $stateText -split "`r?`n"
  $archive = $stateLines[0].TrimEnd("`r")
  $target = $stateLines[1].TrimEnd("`r")
  $version = $stateLines[2].TrimEnd("`r")
  if (-not [System.IO.File]::Exists($archive)) { throw "The downloaded update ZIP was not found." }
  $parent = [System.IO.Path]::GetDirectoryName($target)
  if (-not [System.IO.Directory]::Exists($parent)) { throw "The ToolKeeper install folder does not exist: $parent" }
  $work = [System.IO.Path]::Combine($parent, ".ToolKeeper-update-" + [Guid]::NewGuid().ToString("N"))
  $payload = [System.IO.Path]::Combine($work, "ToolKeeper")
  $backup = "$target.update-backup-" + [Guid]::NewGuid().ToString("N")
  [System.IO.Directory]::CreateDirectory($work) | Out-Null
  try {
    Write-UpdateResult "PROGRESS" "Extracting the update ZIP." | Out-Null
    Expand-Archive -LiteralPath $archive -DestinationPath $work -Force
    $manifest = [System.IO.Path]::Combine($payload, "CSXS\manifest.xml")
    if (-not [System.IO.File]::Exists($manifest) -or -not ([System.IO.File]::ReadAllText($manifest).Contains("com.endlessaudios.toolkeeper"))) {
      throw "The update archive does not contain a valid ToolKeeper extension."
    }
    Write-UpdateResult "PROGRESS" "Replacing the installed extension." | Out-Null
    if ([System.IO.Directory]::Exists($target)) { [System.IO.Directory]::Move($target, $backup) }
    try {
      [System.IO.Directory]::Move($payload, $target)
    } catch {
      if ([System.IO.Directory]::Exists($backup)) { [System.IO.Directory]::Move($backup, $target) }
      throw
    }
    if ([System.IO.Directory]::Exists($backup)) {
      try { [System.IO.Directory]::Delete($backup, $true) } catch {}
    }
    try { [System.IO.File]::Delete($archive) } catch {}
    try { [System.IO.File]::Delete($StateFile) } catch {}
  } finally {
    if ([System.IO.Directory]::Exists($work)) {
      try { [System.IO.Directory]::Delete($work, $true) } catch {}
    }
  }
  if (-not (Write-UpdateResult "INSTALLED" $version)) { exit 11 }
} catch {
  Write-UpdateResult "ERROR" $_.Exception.Message | Out-Null
  exit 10
}
