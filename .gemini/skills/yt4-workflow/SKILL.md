---
name: yt4-workflow
description: Strict development workflow for the yt4 project. Use for all technical tasks including feature implementation, debugging, and refactoring. Enforces structured Research, Strategy, and Execution phases with Zero-Fat and Crash-Driven principles.
---

# yt4 Development Workflow

## Core Principles (KJ Philosophy)
This project treats the agent as a professional, deterministic engine. Context is a managed dependency.
- **Zero-Fat**: Ruthlessly eliminate unused code, comments, and boilerplate.
- **Crash-Driven**: No `try-catch` in business logic. Fail fast to identify root causes.
- **Workflow Isolation**: Maintain strict separation between Research, Strategy, and Execution.

## Phase 1: Research
Systematically map the codebase and validate assumptions.
- **Empirical Reproduction**: For bugs, always create a reproduction script first.
- **Codebase Mapping**: Use `grep_search` and `glob` to understand dependencies.
- **Dependency Check**: Verify tool usage (e.g., `bun`, `uv run`, `Taskfile.yml`).

## Phase 2: Strategy
Formulate a grounded plan based on research findings.
- **ADR Alignment**: Ensure the plan aligns with existing Architecture Decision Records (see `docs/adr/`).
- **Minimalism**: Propose the smallest possible change to achieve the goal.

## Phase 3: Execution (Iterative Plan -> Act -> Validate)
For each sub-task in the strategy:
1. **Plan**: Define implementation and testing strategy.
2. **Act**: Apply targeted, surgical changes.
   - Use `bun` for TypeScript.
   - Use `uv run` for Python.
   - Use `Taskfile.yml` for all CLI operations.
3. **Validate**: 
   - Run `task lint` and type checks (`tsc --noEmit`).
   - Run relevant tests.
   - Verify zero-fat (no new comments, no dead code).

## Asset Management & Audio Production
1. **Never Nest / Simplify**: All asset files must be placed directly under the numbered asset directory (e.g., `assets/009_tsundere_kafka_maid/`). Do NOT create subdirectories (like `recordings/`).
2. **Asset-Driven Config**: Every asset directory MUST contain a `config.json` defining `identity`, `script_path`, and `image_path`.
3. **Zero-Fat Scripts**: Use a flat array of objects for scripts (`[{ "text": "...", "pause": 5 }]`) in `0001_situation.json`. Avoid verbose metadata or `phases`.
4. **TTS Synthesis**: Use Irodori-TTS with ADR-0020 stability protocol.
5. **ASR QA**: Treat as a mandatory semantic integrity check.
6. **Video Integration**: The task is NOT complete until `final_video.mp4` exists in the same asset directory.

## Technical Standards
- **Validation**: Use Zod (TS) or Pydantic (Python) for all data structures.
- **Persistence**: Local-first. Use SQLite or local files.
- **Metrics**: Record execution data in `NUMBERS.md` when performing production runs.
- **Commits**: Proposal must include `task lint` and type-check verification.

## Terminal Commands
- `task lint`: Run linters and formatters.
- `task test`: Execute test suite.
- `bun run <file>`: Execute TypeScript files.
- `uv run <file>`: Execute Python files.

---
*End of yt4 Workflow Skill*
