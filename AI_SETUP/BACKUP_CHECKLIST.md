# Backup Checklist

Complete this checklist **before changing or reinstalling a computer**. Copy each item into the matching `AI_SETUP` subfolder.

## Windows Terminal
- [ ] `settings.json` (profiles, color schemes, keybindings)
- [ ] Any custom color scheme files
- [ ] Startup profile / default shell note

## VS Code
- [ ] `settings.json` (user settings)
- [ ] `keybindings.json`
- [ ] Installed extensions list (`code --list-extensions`)
- [ ] Snippets (if any)
- [ ] Workspace-specific settings (if relevant)

## Claude Code
- [ ] Configuration files / settings
- [ ] Custom skills, agents, hooks (if any)
- [ ] Any local auth notes (do **not** store secrets/tokens in plain text)

## Codex CLI
- [ ] Configuration files / settings
- [ ] Custom prompts / agent files (if any)
- [ ] Any local auth notes (do **not** store secrets/tokens in plain text)

## Fonts
- [ ] Terminal font(s)
- [ ] Editor font(s)
- [ ] Nerd Fonts / icon fonts used

## Scripts
- [ ] Setup / bootstrap scripts
- [ ] Utility scripts used in daily workflow

## General
- [ ] List of installed CLI tools and versions
- [ ] Package manager used (winget / other)
- [ ] Environment variables that matter (names only, not secret values)
- [ ] Git global config (`.gitconfig`) — user name, email, aliases
- [ ] SSH keys location noted (store keys securely, **not** in this repo)

## Final verification
- [ ] Every subfolder in `AI_SETUP/` contains the expected files
- [ ] `BACKUP_INFO.md` is up to date
- [ ] Nothing sensitive (passwords, tokens, private keys) is committed in plain text
