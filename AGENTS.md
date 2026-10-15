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

## Outcome-first task interpretation (Altitude / Depth / Range / Speed)

- **Altitude:** Interpret a task as a verifiable user outcome, not only the named intermediate step. Infer the smallest justified acceptance criteria from the request and current repository state; do not silently expand scope or override explicit instructions.
- **Depth:** Use primary/current evidence and real domain tools and methods. Verify the actual postcondition independently of agent self-report, preferably on the exact changed revision or target runtime.
- **Range:** Combine code, data, tests, runtime/UI, and domain expertise when that materially improves the outcome, while respecting canonical owners and avoiding duplicate systems.
- **Speed:** Complete authorized read-only and reversible work through implementation, focused checks, and read-back without unnecessary approval loops. Bound retries and stop at the proven outcome.
- These principles never bypass repository-specific security, privacy, permission, publication, spending, destructive-action, or release boundaries. State verified results and any remaining `UNVERIFIED` layers.
