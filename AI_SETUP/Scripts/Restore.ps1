<#
    Restore.ps1  —  LaVenta AI_SETUP restore roadmap (SIMULATION ONLY)
    ------------------------------------------------------------------
    PURPOSE:
        Print a step-by-step restore roadmap for rebuilding the full
        development / AI environment on a computer.

    THIS SCRIPT IS A DRY-RUN. It changes NOTHING. Specifically it:
        - Installs nothing.
        - Downloads nothing.
        - Touches no registry keys.
        - Copies, deletes or overwrites no files.
        - Requires no administrator privileges.

    It ONLY prints, in order, for every step:
        - What would be restored.
        - Which AI_SETUP folder would be used as the source.
        - Which files are expected there.
        - Which manual actions are still required.

    USAGE:
        Run from a normal (non-admin) PowerShell prompt:
            pwsh -File AI_SETUP/Scripts/Restore.ps1
        or:
            powershell -File AI_SETUP\Scripts\Restore.ps1
#>

# ------------------------------------------------------------------
# Read-only: never stop the whole roadmap on a minor error.
# ------------------------------------------------------------------
$ErrorActionPreference = 'Continue'

# ------------------------------------------------------------------
# Resolve the AI_SETUP root relative to THIS script's location, so
# the roadmap shows real source folders without touching them.
# (Path building only — nothing is read from or written to disk.)
# ------------------------------------------------------------------
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path   # ...\AI_SETUP\Scripts
$AiSetupRoot = Split-Path -Parent $ScriptDir                     # ...\AI_SETUP

# Common Windows destinations (shown for reference only; not used to write).
$AppData      = $env:APPDATA
$LocalAppData = $env:LOCALAPPDATA
$UserProfile  = $env:USERPROFILE

# ------------------------------------------------------------------
# Helper: render one restore step in a consistent format.
#   -Source   : subfolder under AI_SETUP that holds the backup
#   -Restore  : what would be restored
#   -Expected : files expected in the source folder
#   -Manual   : manual actions still required by the human
# NOTE: This only prints text. It never copies or installs anything.
# ------------------------------------------------------------------
function Write-Step {
    param(
        [int]$Number,
        [string]$Title,
        [string]$Restore,
        [string]$Source,
        [string[]]$Expected,
        [string[]]$Manual
    )
    Write-Host ''
    Write-Host ('-' * 64) -ForegroundColor DarkGray
    Write-Host ("STEP {0}: {1}" -f $Number, $Title) -ForegroundColor Cyan
    Write-Host ('-' * 64) -ForegroundColor DarkGray

    Write-Host "  What would be restored:" -ForegroundColor White
    Write-Host "    $Restore"

    Write-Host "  Source folder (AI_SETUP):" -ForegroundColor White
    if ($Source) { Write-Host "    $Source" } else { Write-Host "    (none — external / manual step)" }

    Write-Host "  Expected files:" -ForegroundColor White
    if ($Expected) { foreach ($f in $Expected) { Write-Host "    - $f" } }
    else { Write-Host "    (none)" }

    Write-Host "  Manual actions still required:" -ForegroundColor White
    if ($Manual) { foreach ($m in $Manual) { Write-Host "    * $m" } }
    else { Write-Host "    (none)" }
}

# ==================================================================
# Banner
# ==================================================================
Write-Host ''
Write-Host 'LaVenta AI_SETUP — Restore Roadmap (SIMULATION / DRY-RUN)' -ForegroundColor White
Write-Host 'This script prints a plan only. It installs, downloads and copies NOTHING.' -ForegroundColor Gray
Write-Host ("AI_SETUP root: {0}" -f $AiSetupRoot) -ForegroundColor Gray
Write-Host ("Run at: {0}" -f (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) -ForegroundColor Gray

# ==================================================================
# 1. Git
# ==================================================================
Write-Step -Number 1 -Title 'Git' `
    -Restore 'Git installation and global user configuration.' `
    -Source $AiSetupRoot `
    -Expected @('.gitconfig (user name, email, aliases)') `
    -Manual @(
        'Install Git manually (e.g. winget install Git.Git) — this script does not install.',
        "Copy .gitconfig to $UserProfile\.gitconfig",
        'Re-add SSH keys from secure storage (NEVER from this repo).'
    )

# ==================================================================
# 2. Windows Terminal
# ==================================================================
Write-Step -Number 2 -Title 'Windows Terminal' `
    -Restore 'Windows Terminal profiles, keybindings and color schemes.' `
    -Source (Join-Path $AiSetupRoot 'WindowsTerminal') `
    -Expected @('settings.json', 'custom color scheme files (if any)') `
    -Manual @(
        'Install Windows Terminal manually (Microsoft Store or winget).',
        "Copy settings.json to $LocalAppData\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\",
        'Close Windows Terminal before replacing settings.json so it is not overwritten on exit.'
    )

# ==================================================================
# 3. VS Code
# ==================================================================
Write-Step -Number 3 -Title 'VS Code' `
    -Restore 'VS Code user settings, keybindings, snippets and extensions.' `
    -Source (Join-Path $AiSetupRoot 'VSCode') `
    -Expected @('settings.json', 'keybindings.json', 'snippets\', 'extensions.txt') `
    -Manual @(
        'Install VS Code manually.',
        "Copy settings.json and keybindings.json to $AppData\Code\User\",
        'Reinstall extensions:  Get-Content extensions.txt | ForEach-Object { code --install-extension $_ }'
    )

# ==================================================================
# 4. Claude Code CLI
# ==================================================================
Write-Step -Number 4 -Title 'Claude Code CLI' `
    -Restore 'Claude Code CLI configuration and custom skills/agents/hooks.' `
    -Source (Join-Path $AiSetupRoot 'ClaudeCode') `
    -Expected @('settings.json', 'custom skills / agents / hooks (if any)') `
    -Manual @(
        'Install Claude Code CLI manually.',
        "Copy configuration into $UserProfile\.claude\",
        'Re-authenticate (login) — auth tokens are NOT stored in this repo.'
    )

# ==================================================================
# 5. Codex CLI
# ==================================================================
Write-Step -Number 5 -Title 'Codex CLI' `
    -Restore 'Codex CLI configuration and custom prompts/agent files.' `
    -Source (Join-Path $AiSetupRoot 'CodexCLI') `
    -Expected @('config.toml or config.json', 'custom prompts / agent files (if any)') `
    -Manual @(
        'Install Codex CLI manually.',
        "Copy configuration into $UserProfile\.codex\",
        'Re-authenticate (login) — auth tokens are NOT stored in this repo.'
    )

# ==================================================================
# 6. Fonts
# ==================================================================
Write-Step -Number 6 -Title 'Fonts' `
    -Restore 'Terminal and editor fonts (including any Nerd / icon fonts).' `
    -Source (Join-Path $AiSetupRoot 'Fonts') `
    -Expected @('*.ttf / *.otf font files') `
    -Manual @(
        'Install fonts manually (right-click > Install, or per-user install).',
        'A per-user font install does NOT require administrator privileges.',
        'After installing, select the font in Windows Terminal and VS Code.'
    )

# ==================================================================
# 7. Project clone
# ==================================================================
Write-Step -Number 7 -Title 'Project clone' `
    -Restore 'The LaVenta project repository on the new machine.' `
    -Source $null `
    -Expected @('(cloned from the remote Git repository, not from AI_SETUP)') `
    -Manual @(
        'Ensure Git is installed and authenticated first (steps 1 and 4/SSH).',
        'Clone the repository:  git clone <remote-url>',
        'Confirm the working tree and branch match the expected project state.'
    )

# ==================================================================
# 8. AI_SETUP restore
# ==================================================================
Write-Step -Number 8 -Title 'AI_SETUP restore' `
    -Restore 'The AI_SETUP backup folder itself (arrives with the cloned repo).' `
    -Source $AiSetupRoot `
    -Expected @(
        'README.md', 'INSTALL_GUIDE.md', 'BACKUP_CHECKLIST.md',
        'NEW_PC_SETUP.md', 'BACKUP_INFO.md',
        'WindowsTerminal\', 'VSCode\', 'ClaudeCode\', 'CodexCLI\', 'Fonts\', 'Scripts\'
    ) `
    -Manual @(
        'Read NEW_PC_SETUP.md and follow the documented restore order.',
        'Use BACKUP_CHECKLIST.md to confirm nothing is missing.'
    )

# ==================================================================
# 9. Verification
# ==================================================================
Write-Step -Number 9 -Title 'Verification' `
    -Restore 'Confirmation that every tool launches and is configured correctly.' `
    -Source $null `
    -Expected @('(no files — verification only)') `
    -Manual @(
        'Check versions: git --version, code --version, claude --version, codex --version.',
        'Open Windows Terminal and VS Code and confirm settings/fonts applied.',
        'Run the LaVenta project workflow to confirm the environment is fully working.'
    )

# ==================================================================
# Closing note
# ==================================================================
Write-Host ''
Write-Host ('=' * 64) -ForegroundColor DarkGray
Write-Host '  Roadmap complete. This was a simulation — nothing was changed.' -ForegroundColor White
Write-Host '  Perform the manual actions above deliberately, one step at a time.' -ForegroundColor Gray
Write-Host ('=' * 64) -ForegroundColor DarkGray
