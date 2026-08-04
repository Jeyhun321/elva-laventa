<#
    Backup.ps1  —  LaVenta AI_SETUP inspection script
    ---------------------------------------------------
    PURPOSE:
        Inspect the local machine and REPORT on the development / AI tooling
        that should later be backed up into the AI_SETUP folder.

    THIS SCRIPT IS READ-ONLY. It does the following ONLY:
        - Detects whether key tools are installed.
        - Prints their versions when available.
        - Prints the default Windows locations of their config files.
        - Explains which files should later be copied into AI_SETUP.

    HARD SAFETY RULES (by design this script):
        - Never copies anything (that step comes later, manually / in a future script).
        - Never deletes any file.
        - Never overwrites any file.
        - Never requires administrator privileges.
        - Only performs inspection and reporting.

    USAGE:
        Default inspection (tools + versions + default config locations):
            pwsh -File AI_SETUP/Scripts/Backup.ps1

        Detailed config report (real config paths on THIS machine,
        existence, size, last-modified, and sensitive-file flags):
            pwsh -File AI_SETUP/Scripts/Backup.ps1 -Report

    Both modes are strictly READ-ONLY and never require administrator rights.
#>

# ------------------------------------------------------------------
# Parameters.
#   -Report : run the detailed configuration report (see Invoke-ConfigReport
#             at the bottom of this file) instead of the default inspection.
# The param block MUST be the first executable statement in the script.
# ------------------------------------------------------------------
param(
    [switch]$Report
)

# ------------------------------------------------------------------
# Do not stop the whole script if a single check errors out.
# We want a full report even when some tools are missing.
# ------------------------------------------------------------------
$ErrorActionPreference = 'Continue'

# ------------------------------------------------------------------
# Small helper: print a section header for readability.
# ------------------------------------------------------------------
function Write-Section {
    param([string]$Title)
    Write-Host ''
    Write-Host ('=' * 64) -ForegroundColor DarkGray
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host ('=' * 64) -ForegroundColor DarkGray
}

# ------------------------------------------------------------------
# Helper: check whether a command / executable exists on PATH.
# Returns the resolved source path, or $null if not found.
# ------------------------------------------------------------------
function Get-CommandPath {
    param([string]$Name)
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd) { return $cmd.Source }
    return $null
}

# ------------------------------------------------------------------
# Helper: safely capture a tool's version output.
# Never throws; returns a trimmed string or 'UNKNOWN'.
# ------------------------------------------------------------------
function Get-ToolVersion {
    param([scriptblock]$Command)
    try {
        $output = & $Command 2>$null
        if ($output) {
            # Flatten multi-line version output into one line.
            return (($output | Out-String).Trim())
        }
    } catch {
        # Swallow errors — a missing tool must not break the report.
    }
    return 'UNKNOWN'
}

# ------------------------------------------------------------------
# Helper: report whether a path exists (config file / folder).
# Read-only: it only tests existence, it never touches the file.
# ------------------------------------------------------------------
function Test-ConfigPath {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return }
    $expanded = [System.Environment]::ExpandEnvironmentVariables($Path)
    if (Test-Path -LiteralPath $expanded) {
        Write-Host "    [FOUND]   $expanded" -ForegroundColor Green
    } else {
        Write-Host "    [absent]  $expanded" -ForegroundColor DarkYellow
    }
}

# ==================================================================
# -Report mode helpers (used only by Invoke-ConfigReport below).
# All of these are strictly READ-ONLY: they test existence and read
# file metadata (size, dates) only. They NEVER open or print file
# contents, so no secret value can ever leak into the output.
# ==================================================================

# ------------------------------------------------------------------
# Decide whether a path LOOKS sensitive purely from its NAME.
# We never read the file to make this decision.
# ------------------------------------------------------------------
function Test-SensitiveName {
    param([string]$Path)
    $name = Split-Path $Path -Leaf
    # Name-based patterns for secrets that must never enter Git.
    $patterns = @(
        'token', 'credential', 'cookie', 'session', 'auth',
        'secret', 'password', 'api[_-]?key', 'apikey', '\.pem$', '\.key$'
    )
    foreach ($p in $patterns) {
        if ($name -match $p) { return $true }
    }
    return $false
}

# ------------------------------------------------------------------
# Report one logical configuration item across one or more candidate
# paths. Prints FOUND / NOT FOUND / MULTIPLE CANDIDATES, plus size and
# last-modified date for each existing path. Metadata only — no content.
# ------------------------------------------------------------------
function Report-ConfigItem {
    param(
        [string]$Label,
        [string[]]$Candidates
    )

    Write-Host ("  {0}" -f $Label) -ForegroundColor White

    # Keep only candidates that actually exist on this machine.
    $existing = @()
    foreach ($c in $Candidates) {
        if ([string]::IsNullOrWhiteSpace($c)) { continue }
        $expanded = [System.Environment]::ExpandEnvironmentVariables($c)
        if (Test-Path -LiteralPath $expanded) { $existing += $expanded }
    }

    # Status line based on how many candidates exist.
    if ($existing.Count -eq 0) {
        Write-Host "    STATUS: NOT FOUND" -ForegroundColor DarkYellow
        foreach ($c in $Candidates) { Write-Host "      (checked) $c" -ForegroundColor DarkGray }
        return
    }
    elseif ($existing.Count -eq 1) {
        Write-Host "    STATUS: FOUND" -ForegroundColor Green
    }
    else {
        Write-Host ("    STATUS: MULTIPLE CANDIDATES ({0})" -f $existing.Count) -ForegroundColor Magenta
    }

    # For each existing path: full path, size, last-modified. Metadata only.
    foreach ($path in $existing) {
        try {
            $item = Get-Item -LiteralPath $path -Force -ErrorAction Stop
            if ($item.PSIsContainer) {
                # Directory: report item count, not content.
                $count = (Get-ChildItem -LiteralPath $path -Force -ErrorAction SilentlyContinue | Measure-Object).Count
                Write-Host ("      Path     : {0}  [directory]" -f $item.FullName)
                Write-Host ("      Items    : {0}" -f $count)
                Write-Host ("      Modified : {0:yyyy-MM-dd HH:mm:ss}" -f $item.LastWriteTime)
            }
            else {
                Write-Host ("      Path     : {0}" -f $item.FullName)
                Write-Host ("      Size     : {0} bytes" -f $item.Length)
                Write-Host ("      Modified : {0:yyyy-MM-dd HH:mm:ss}" -f $item.LastWriteTime)
            }
            # Flag by name only — never open the file.
            if (Test-SensitiveName $item.FullName) {
                Write-Host "      WARNING  : name looks SENSITIVE — DO NOT COMMIT (content not shown)" -ForegroundColor Red
            }
        }
        catch {
            Write-Host ("      Path     : {0}  (metadata unavailable)" -f $path) -ForegroundColor DarkYellow
        }
    }
}

# ------------------------------------------------------------------
# Scan a directory (non-recursive + one level) for files whose NAMES
# look sensitive, and list them so the user knows what must stay out
# of Git. Names/paths only — file contents are never read or shown.
# ------------------------------------------------------------------
function Report-SensitiveInDir {
    param([string]$Dir)
    $expanded = [System.Environment]::ExpandEnvironmentVariables($Dir)
    if (-not (Test-Path -LiteralPath $expanded)) { return }
    $hits = Get-ChildItem -LiteralPath $expanded -Force -Recurse -Depth 1 -File -ErrorAction SilentlyContinue |
        Where-Object { Test-SensitiveName $_.FullName }
    foreach ($h in $hits) {
        Write-Host ("    [DO NOT COMMIT] {0}" -f $h.FullName) -ForegroundColor Red
    }
}

# ==================================================================
# Invoke-ConfigReport — the -Report mode entry point.
# Finds REAL config paths on THIS machine for Windows Terminal,
# VS Code, Claude Code CLI, Codex CLI and PowerShell profiles.
# Strictly read-only: nothing is copied, deleted, overwritten, and no
# sensitive file content is ever displayed.
# ==================================================================
function Invoke-ConfigReport {

    $AppData      = $env:APPDATA
    $LocalAppData = $env:LOCALAPPDATA
    $UserProfile  = $env:USERPROFILE

    Write-Host ''
    Write-Host 'LaVenta AI_SETUP — Configuration Report (READ-ONLY, -Report)' -ForegroundColor White
    Write-Host 'Existence + size + last-modified only. No file contents are shown. Nothing is changed.' -ForegroundColor Gray
    Write-Host ("Run at: {0}" -f (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) -ForegroundColor Gray

    # ---- Windows Terminal -------------------------------------------------
    Write-Section '1. Windows Terminal'
    Report-ConfigItem 'settings.json' @(
        "$LocalAppData\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json",
        "$LocalAppData\Packages\Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe\LocalState\settings.json",
        "$LocalAppData\Microsoft\Windows Terminal\settings.json"
    )

    # ---- VS Code ----------------------------------------------------------
    Write-Section '2. VS Code'
    Report-ConfigItem 'settings.json' @(
        "$AppData\Code\User\settings.json",
        "$AppData\Code - Insiders\User\settings.json"
    )
    Report-ConfigItem 'keybindings.json' @(
        "$AppData\Code\User\keybindings.json",
        "$AppData\Code - Insiders\User\keybindings.json"
    )
    Report-ConfigItem 'snippets (folder)' @(
        "$AppData\Code\User\snippets",
        "$AppData\Code - Insiders\User\snippets"
    )

    # ---- Claude Code CLI --------------------------------------------------
    Write-Section '3. Claude Code CLI'
    Report-ConfigItem 'settings.json' @(
        "$UserProfile\.claude\settings.json"
    )
    Report-ConfigItem 'config (.claude.json)' @(
        "$UserProfile\.claude.json"
    )
    Report-ConfigItem 'config folder (.claude)' @(
        "$UserProfile\.claude"
    )

    # ---- Codex CLI --------------------------------------------------------
    Write-Section '4. Codex CLI'
    Report-ConfigItem 'config' @(
        "$UserProfile\.codex\config.toml",
        "$UserProfile\.codex\config.json"
    )
    Report-ConfigItem 'config folder (.codex)' @(
        "$UserProfile\.codex"
    )

    # ---- PowerShell profiles ----------------------------------------------
    # $PROFILE exposes the four standard profile paths on this host.
    Write-Section '5. PowerShell profiles'
    Report-ConfigItem 'CurrentUserCurrentHost' @( $PROFILE.CurrentUserCurrentHost )
    Report-ConfigItem 'CurrentUserAllHosts'    @( $PROFILE.CurrentUserAllHosts )
    Report-ConfigItem 'AllUsersCurrentHost'    @( $PROFILE.AllUsersCurrentHost )
    Report-ConfigItem 'AllUsersAllHosts'       @( $PROFILE.AllUsersAllHosts )

    # ---- Sensitive files that must NEVER be committed ---------------------
    Write-Section 'SENSITIVE — must NOT go into Git'
    Write-Host '  The following files were matched by NAME as potentially sensitive' -ForegroundColor Gray
    Write-Host '  (tokens / credentials / cookies / sessions / auth / API keys).' -ForegroundColor Gray
    Write-Host '  Their CONTENTS are never read or shown by this script.' -ForegroundColor Gray
    Write-Host ''
    $any = $false
    foreach ($dir in @("$UserProfile\.claude", "$UserProfile\.codex")) {
        $before = $any
        $expanded = [System.Environment]::ExpandEnvironmentVariables($dir)
        if (Test-Path -LiteralPath $expanded) {
            $hits = Get-ChildItem -LiteralPath $expanded -Force -Recurse -Depth 1 -File -ErrorAction SilentlyContinue |
                Where-Object { Test-SensitiveName $_.FullName }
            foreach ($h in $hits) {
                Write-Host ("    [DO NOT COMMIT] {0}" -f $h.FullName) -ForegroundColor Red
                $any = $true
            }
        }
    }
    if (-not $any) {
        Write-Host '    (No sensitive-named files detected in the scanned config folders.)' -ForegroundColor DarkGray
    }

    Write-Host ''
    Write-Host 'Configuration report complete. Nothing was copied, deleted or modified.' -ForegroundColor White
}

# ------------------------------------------------------------------
# Dispatch: -Report runs the detailed config report and exits.
# Without -Report, the default inspection below runs as before.
# ------------------------------------------------------------------
if ($Report) {
    Invoke-ConfigReport
    exit 0
}

# ==================================================================
# Intro banner
# ==================================================================
Write-Host ''
Write-Host 'LaVenta AI_SETUP — Backup Inspection (READ-ONLY)' -ForegroundColor White
Write-Host 'This script only inspects and reports. It copies, deletes and overwrites NOTHING.' -ForegroundColor Gray
Write-Host ("Run at: {0}" -f (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) -ForegroundColor Gray

# Common base folders on Windows, resolved once for reuse below.
$AppData      = $env:APPDATA        # e.g. C:\Users\<user>\AppData\Roaming
$LocalAppData = $env:LOCALAPPDATA   # e.g. C:\Users\<user>\AppData\Local
$UserProfile  = $env:USERPROFILE    # e.g. C:\Users\<user>

# ==================================================================
# 1. Git
# ==================================================================
Write-Section '1. Git'
$gitPath = Get-CommandPath 'git'
if ($gitPath) {
    Write-Host "  Installed : YES" -ForegroundColor Green
    Write-Host "  Location  : $gitPath"
    Write-Host ("  Version   : {0}" -f (Get-ToolVersion { git --version }))
} else {
    Write-Host "  Installed : NO (git not found on PATH)" -ForegroundColor Yellow
}
Write-Host "  Default config locations:"
Test-ConfigPath "$UserProfile\.gitconfig"
Test-ConfigPath "$UserProfile\.config\git\config"
Test-ConfigPath "$UserProfile\.ssh"
Write-Host "  -> Later copy into AI_SETUP: .gitconfig (user name, email, aliases)."
Write-Host "     NOTE: Do NOT copy SSH private keys into the repo. Store them securely."

# ==================================================================
# 2. Windows Terminal
# ==================================================================
Write-Section '2. Windows Terminal'
$wtPath = Get-CommandPath 'wt'
# Windows Terminal is a Store app; its settings live under LocalAppData\Packages.
$wtSettings = "$LocalAppData\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json"
$wtPreview  = "$LocalAppData\Packages\Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe\LocalState\settings.json"
if ($wtPath -or (Test-Path -LiteralPath $wtSettings) -or (Test-Path -LiteralPath $wtPreview)) {
    Write-Host "  Installed : YES" -ForegroundColor Green
    if ($wtPath) { Write-Host "  Launcher  : $wtPath" }
} else {
    Write-Host "  Installed : NO / not detected" -ForegroundColor Yellow
}
Write-Host "  Default config locations:"
Test-ConfigPath $wtSettings
Test-ConfigPath $wtPreview
Write-Host "  -> Later copy into AI_SETUP\WindowsTerminal: settings.json and any custom color schemes."

# ==================================================================
# 3. VS Code
# ==================================================================
Write-Section '3. VS Code'
$codePath = Get-CommandPath 'code'
if ($codePath) {
    Write-Host "  Installed : YES" -ForegroundColor Green
    Write-Host "  Location  : $codePath"
    Write-Host ("  Version   : {0}" -f (Get-ToolVersion { code --version }))
} else {
    Write-Host "  Installed : NO (code not found on PATH)" -ForegroundColor Yellow
}
Write-Host "  Default config locations:"
Test-ConfigPath "$AppData\Code\User\settings.json"
Test-ConfigPath "$AppData\Code\User\keybindings.json"
Test-ConfigPath "$AppData\Code\User\snippets"
Test-ConfigPath "$UserProfile\.vscode\extensions"
Write-Host "  -> Later copy into AI_SETUP\VSCode: settings.json, keybindings.json, snippets."
Write-Host "     Also save the extensions list:  code --list-extensions > extensions.txt"

# ==================================================================
# 4. Claude Code CLI
# ==================================================================
Write-Section '4. Claude Code CLI'
$claudePath = Get-CommandPath 'claude'
if ($claudePath) {
    Write-Host "  Installed : YES" -ForegroundColor Green
    Write-Host "  Location  : $claudePath"
    Write-Host ("  Version   : {0}" -f (Get-ToolVersion { claude --version }))
} else {
    Write-Host "  Installed : NO (claude not found on PATH)" -ForegroundColor Yellow
}
Write-Host "  Default config locations:"
Test-ConfigPath "$UserProfile\.claude"
Test-ConfigPath "$UserProfile\.claude\settings.json"
Test-ConfigPath "$UserProfile\.claude.json"
Write-Host "  -> Later copy into AI_SETUP\ClaudeCode: settings.json, custom skills/agents/hooks."
Write-Host "     NOTE: Do NOT copy auth tokens / credentials in plain text."

# ==================================================================
# 5. Codex CLI
# ==================================================================
Write-Section '5. Codex CLI'
$codexPath = Get-CommandPath 'codex'
if ($codexPath) {
    Write-Host "  Installed : YES" -ForegroundColor Green
    Write-Host "  Location  : $codexPath"
    Write-Host ("  Version   : {0}" -f (Get-ToolVersion { codex --version }))
} else {
    Write-Host "  Installed : NO (codex not found on PATH)" -ForegroundColor Yellow
}
Write-Host "  Default config locations:"
Test-ConfigPath "$UserProfile\.codex"
Test-ConfigPath "$UserProfile\.codex\config.toml"
Test-ConfigPath "$UserProfile\.codex\config.json"
Write-Host "  -> Later copy into AI_SETUP\CodexCLI: config files, custom prompts/agent files."
Write-Host "     NOTE: Do NOT copy auth tokens / credentials in plain text."

# ==================================================================
# Summary
# ==================================================================
Write-Section 'Summary — what to back up later'
Write-Host @"
  This was an inspection only. Nothing was copied, deleted or changed.

  Next (manual) step — copy the found configuration files into:
    AI_SETUP\WindowsTerminal\  -> Windows Terminal settings.json + color schemes
    AI_SETUP\VSCode\           -> settings.json, keybindings.json, snippets, extensions.txt
    AI_SETUP\ClaudeCode\       -> Claude Code settings + custom skills/agents/hooks
    AI_SETUP\CodexCLI\         -> Codex CLI config + custom prompts
    AI_SETUP\Fonts\            -> terminal / editor fonts
    AI_SETUP\Scripts\          -> helper scripts

  Security reminder: never store passwords, API tokens or private keys
  in plain text inside the repository. Keep only their locations noted.
"@ -ForegroundColor Gray

Write-Host ''
Write-Host 'Inspection complete.' -ForegroundColor White
