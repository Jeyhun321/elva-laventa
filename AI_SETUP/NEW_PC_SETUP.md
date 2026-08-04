# New PC Setup

> **Placeholder.** Full restore procedure will be filled in later.

This document will describe how to restore the complete AI + development environment on a **fresh computer**, using the backed-up files in this folder.

## Planned restore order

1. Install base tools (package manager, Git).
2. Install and configure Windows Terminal
   - Restore settings from `WindowsTerminal/`.
3. Install fonts
   - Install everything from `Fonts/`.
4. Install and configure VS Code
   - Restore `settings.json` and `keybindings.json` from `VSCode/`.
   - Reinstall extensions from the saved list.
5. Install and configure Claude Code CLI
   - Restore configuration from `ClaudeCode/`.
6. Install and configure Codex CLI
   - Restore configuration from `CodexCLI/`.
7. Run helper scripts
   - Execute setup scripts from `Scripts/`.
8. Restore Git config and secrets
   - Apply `.gitconfig`.
   - Re-add SSH keys / tokens from secure storage (never from this repo).
9. Verify everything
   - Launch each tool and confirm configuration is correct.
   - Clone/pull the LaVenta repository and confirm the workflow runs.

_(To be completed.)_
