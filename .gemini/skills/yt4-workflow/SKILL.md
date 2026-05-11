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

## Audio Production Workflow (Yawa Archive)
1. **Script Preparation**: Create `script_master.md`. Target: **5000+ characters**.
2. **Expansion**: Use `task asmr:expand` if the length is insufficient.
3. **TTS Synthesis**: Use Irodori-TTS with ADR-0020 stability protocol.
4. **ASR QA**: Treat as a mandatory semantic integrity check.
5. **Video Integration**: The task is NOT complete until `final_video.mp4` exists.

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
