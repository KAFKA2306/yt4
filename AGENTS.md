# Antigravity Audit Rule

Before searching for `.agy`, always verify whether Antigravity CLI (`agy`) is installed.

Mandatory checks:

1. `which agy`
2. `agy --version`
3. `agy --help`
4. `agy /usage`
5. Search `Taskfile`, systemd services, tmux launchers, shell scripts, and cron jobs for `agy`.

Never infer that Antigravity is absent merely because `.agy` does not exist.

The canonical runtime identifier is `agy`, not `.agy`.

If `.agy` is not found but `agy` exists, continue investigation using the installed CLI and its integrations.

Failure to check `agy` before concluding Antigravity is absent is considered an audit failure.
