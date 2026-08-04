# Backup Info

This file explains **what belongs in each subfolder** of `AI_SETUP/`. Keep each folder focused on its purpose.

## WindowsTerminal/
Windows Terminal configuration:
- `settings.json` (profiles, keybindings, default shell)
- Custom color schemes
- Notes about the default startup profile

## VSCode/
VS Code configuration:
- `settings.json` (user settings)
- `keybindings.json`
- Installed extensions list (e.g. output of `code --list-extensions`)
- Snippets, if used

## ClaudeCode/
Claude Code CLI configuration:
- Settings / config files
- Custom skills, agents, hooks
- Setup notes (no secrets or tokens in plain text)

## CodexCLI/
Codex CLI configuration:
- Settings / config files
- Custom prompts or agent files
- Setup notes (no secrets or tokens in plain text)

## Fonts/
Fonts used across the environment:
- Terminal fonts
- Editor fonts
- Nerd Fonts / icon fonts (with names and sources)

## Scripts/
Helper and setup scripts:
- Bootstrap / install scripts
- Utility scripts used in the daily workflow
- (Currently empty — scripts will be added later.)

## Security note
Never store passwords, API tokens, or private keys in plain text inside this repository. Keep those in a secure password manager or encrypted storage, and only note **where** they live — not their values.
