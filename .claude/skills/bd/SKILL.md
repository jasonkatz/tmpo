---
name: bd
description: Issue tracking with beads (bd). Use when managing work items, finding available tasks, creating issues, tracking dependencies, or syncing with git.
argument-hint: "[command] [args]"
---

# Beads (bd) Issue Tracking

Beads is a lightweight issue tracker with first-class dependency support, designed for agent-driven development workflows.

## When to Use Beads

**Use beads for:**
- Multi-session work that needs persistence across context resets
- Work with dependencies between tasks
- Tracking discovered work during implementation
- Strategic planning and epic management

**Use TodoWrite instead for:**
- Simple single-session execution tasks
- Quick checklists that don't need persistence

When in doubt, prefer bd - persistence you don't need beats lost context.

## Essential Commands

### Finding Work
```bash
bd ready                      # Show issues ready to work (no blockers)
bd list --status=open         # All open issues
bd list --status=in_progress  # Your active work
bd show <id>                  # Detailed view with dependencies
bd search "query"             # Search issues by text
```

### Creating Issues
```bash
bd create --title="..." --type=task --priority=2
bd create --title="..." --type=bug --priority=1
bd create --title="..." --type=feature --priority=2
```

**Priority scale:** 0-4 or P0-P4 (0=critical, 2=medium, 4=backlog). Do NOT use "high", "medium", "low".

### Updating Issues
```bash
bd update <id> --status=in_progress  # Claim work
bd update <id> --status=open         # Release work
bd update <id> --assignee=username   # Assign to someone
bd update <id> --priority=1          # Change priority
```

### Closing Issues
```bash
bd close <id>                        # Mark complete
bd close <id1> <id2> <id3>           # Close multiple at once
bd close <id> --reason="explanation" # Close with reason
```

### Dependencies
```bash
bd dep add <issue> <depends-on>      # Add dependency
bd blocked                           # Show all blocked issues
bd graph <id>                        # Visualize dependency graph
```

### Sync & Collaboration
```bash
bd sync                              # Sync with git remote
bd sync --status                     # Check sync status
```

## Standard Workflow

### Starting Work
```bash
bd ready                             # Find available work
bd show <id>                         # Review issue details
bd update <id> --status=in_progress  # Claim it
```

### During Work
- Create new issues for discovered work: `bd create --title="..."`
- Add dependencies as needed: `bd dep add <new> <existing>`
- Use `bd show <id>` to review blockers

### Completing Work
```bash
bd close <id1> <id2> ...             # Close completed issues
bd sync                              # Push to remote
```

## Session Close Protocol

**CRITICAL**: Before ending a session, run this checklist:

```bash
git status                           # Check what changed
git add <files>                      # Stage code changes
bd sync                              # Commit beads changes
git commit -m "..."                  # Commit code
bd sync                              # Commit any new beads changes
git push                             # Push to remote
```

Work is not done until pushed.

## Project Health
```bash
bd status                            # Project overview and statistics
bd doctor                            # Check for issues
bd stale                             # Show stale issues
bd orphans                           # Find orphaned issues
```

## Tips

1. **Parallel creation**: When creating multiple issues, use parallel subagents
2. **Batch closes**: Close multiple issues at once with `bd close <id1> <id2> <id3>`
3. **Context recovery**: Run `bd prime` after compaction or new session
4. **Auto-sync**: Install hooks with `bd hooks install` for automatic sync
