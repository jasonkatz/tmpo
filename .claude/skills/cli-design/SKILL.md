---
name: cli-design
description: Design and implement CLI commands, subcommands, flags, and output following clig.dev best practices. Use when adding new CLI commands, designing command interfaces, improving help text, or reviewing CLI ergonomics.
argument-hint: "[command or feature to design]"
---

# CLI Design

Follow these guidelines when designing or implementing CLI interfaces.

## Philosophy

- **Human-first** — default to human-readable output; add machine modes explicitly
- **Composable** — programs connect through pipes, exit codes, structured output
- **Consistent** — same patterns everywhere so users transfer knowledge between commands
- **Discoverable** — help text, examples, and suggestions over memorization
- **Empathetic** — show you understand the user's problem; suggest what to do next
- **Appropriately verbose** — not too noisy, not too silent

## Help

- `-h` shows concise help: usage line, one-line description, common flags, pointer to `--help`
- `--help` shows extended help: full flag/arg reference, examples, link to docs
- Lead with examples — they're what users actually read
- Every command, subcommand, flag, and argument gets a help string
- Suggest corrections for typos and near-misses
- Provide a feedback path (issue tracker, docs URL)

## Output

- Default to human-readable output (tables, confirmations, clear formatting)
- Support `--json` for structured output; scripts and tools depend on this
- stdout for primary output, stderr for diagnostics and errors
- Confirm state-changing actions: print what was created/deleted/modified, including identifiers
- Suggest a logical next command after mutations
- Detect TTY vs pipe; disable color, spinners, and animations when piped
- Respect `NO_COLOR` env var, `TERM=dumb`, and `--no-color` flag
- Use color sparingly — only where it adds real information
- Show activity within 100ms for long operations (spinner or progress bar)

## Arguments & Flags

- **Prefer flags** (`--workspace foo`) **over positional arguments** for clarity and extensibility
- Positional arguments are fine for the single obvious primary operand (a name, an ID, a file)
- Provide both `--long` and `-s` short forms for frequently-used flags
- Reserve single-letter flags for the most common options
- Use standard names consistently across all commands:
  - `-h, --help` / `-V, --version`
  - `-v, --verbose` / `-q, --quiet`
  - `-f, --force` / `-n, --dry-run`
  - `-o, --output` / `-p, --port`
- Never accept secrets as flag values — they're visible in `ps`, shell history, logs. Use interactive prompts or `--key-file`
- Make flag order independent
- Make sensible defaults so common cases need zero flags
- Support `-` to read from stdin or write to stdout where it makes sense

## Subcommands

- Use noun-verb structure: `workspaces create`, not `create-workspace`
- Keep naming, flags, and output format consistent across all subcommands
- Add short aliases for frequently-used commands
- Never create catch-all default subcommands — they block future additions
- Don't allow arbitrary abbreviations — they create forward-compatibility traps
- Avoid ambiguous or similarly-named commands

## Errors

- Catch anticipated errors and rewrite them for humans with guidance on what to do
- Tell the user: what went wrong, why, and how to fix it
- One clear message, not a stack trace
- Group similar errors to minimize noise
- Use red sparingly — only for truly critical errors
- For unexpected errors, print enough context to file a useful bug report
- All error output goes to stderr

## Interactivity

- Only prompt when stdin is a TTY
- Provide `--no-input` flag to disable all prompts (for scripts and CI)
- Dangerous operations (delete, destroy) require `--force` or interactive confirmation
- Don't echo passwords
- Ctrl-C exits cleanly and immediately

## Robustness

- Validate all input early; fail fast with clear messages showing the bad value and what was expected
- Respond within 100ms to feel fast; show progress for anything longer
- Set timeouts on all network requests
- Exit 0 on success, non-zero on failure
- Design for crash-only recovery — no state that depends on cleanup running
- Anticipate hostile environments: bad connectivity, concurrent instances, piped input, missing config

## Configuration

Precedence (highest to lowest):
1. Flags
2. Environment variables (uppercase, underscored, app-prefixed: `APPNAME_*`)
3. Project-level config
4. User-level config (`~/.config/appname/`)
5. System-wide config

Follow XDG Base Directory Specification. Never store secrets in env vars (leaks via logs, child processes, crash reports).

## Environment Variables

- Use for context-dependent behavior that varies per session or machine
- Uppercase with underscores; don't start with numbers
- Respect standard vars: `NO_COLOR`, `DEBUG`, `EDITOR`, `HTTP_PROXY`, `TERM`, `HOME`, `PAGER`, `TMPDIR`

## Naming

- Simple, memorable, easy to type
- Lowercase only; hyphens if multi-word
- Brief but not cryptic
- Avoid generic names ("tool", "util", "convert")

## Distribution

- Single binary when possible
- Clear uninstall instructions

## Future-Proofing

- Keep changes additive — new flags and subcommands, never change existing behavior
- Warn before removing or renaming anything; provide migration guidance
- Encourage `--json` in scripts so human output can evolve freely

## Applying This

For the feature described in `$ARGUMENTS`:

1. **Propose the interface** — subcommand name, flags, arguments, help text
2. **Show example invocations** — common use cases and edge cases
3. **Define output** — what the user sees on success, on error, in JSON mode
4. **Identify interactions** — how it fits with existing commands and workflows
5. **Implement**
