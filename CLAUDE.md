# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `wt`, a git worktree operations wrapper written in TypeScript that provides an interactive interface for managing git worktrees using fzf. The tool is designed to work within ghq environments and integrates with a hook system for automation.

## Core Architecture

### Main Components

- **`src/index.ts`** - Main CLI entry point with command parsing
- **`src/commands/worktree.ts`** - Core worktree management functionality
- **`src/utils/git.ts`** - Git operations wrapper
- **`src/utils/hooks.ts`** - Hook system implementation
- **`src/utils/interactive.ts`** - fzf integration for interactive selection
- **`wt.zsh`** - Shell wrapper functions for integration

### Key Functions

1. **Worktree Selection** - Uses fzf for interactive worktree selection
2. **Branch Management** - Handles local, remote, and new branch creation
3. **Hook System** - Executes custom scripts before/after worktree operations
4. **ghq Integration** - Designed for ghq-based repository organization

### Hook Architecture

The hook system operates at two levels:
- **Global hooks**: `~/.zsh/hooks/wt/` (affects all repositories)
- **Repository-specific hooks**: `<repo>/.wt/hooks/` (affects single repository)

Hook execution order:
1. Global pre-add hook
2. Repository-specific pre-add hook  
3. Worktree creation
4. Global post-add hook
5. Repository-specific post-add hook

## Common Commands

### Development Commands
```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Run in development mode
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Clean build artifacts
npm run clean

# Run all tests (unit + e2e)
npm test

# Run only unit tests
npm run test:unit

# Run only e2e tests  
npm run test:e2e

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with coverage report
npm run test:coverage
```

### Basic Operations
```bash
# Interactive worktree selection and navigation
wt

# List worktrees in current repository
wt list

# Create new worktree
wt add <branch> [path]

# Remove worktree (with fzf selection)
wt remove

# Change directory to selected worktree
wt cd

# Run command in selected worktree
wt -- <command>

# Pass selected worktree as argument to command
wt <command>

# Generate shell integration function
wt shell-init
```

### Installation/Setup

Two installation methods are supported:

**Global Installation (Recommended):**
```bash
npm install --global @ry-itto/wt
wt shell-init > ~/.wt-integration.zsh
```

**Local Development:**
- Project directory: `$HOME/.zsh/bin/wt/` (with built JavaScript in `dist/`)
- Build the project: `npm run build` before first use
- Use `WT_CLI_PATH` environment variable for custom paths

### Shell Integration
Two ways to set up shell integration:
1. **Static**: Source the provided `wt.zsh` file
2. **Dynamic**: Run `wt shell-init > ~/.wt-integration.zsh` and source that file

The CLI can generate its own shell integration function with correct paths.

### Environment Variables
- **`WT_WORKTREE_DIR`** - Custom base directory for worktree creation (optional)
- **`WT_CLI_PATH`** - Custom path to CLI executable for shell integration (optional)

## Development Notes

### Dependencies
- **Node.js** - Runtime environment (≥18.0.0)
- **TypeScript** - Development language
- **fzf** - Interactive selection interface
- **git** - Git worktree functionality
- **ghq** - Repository organization (assumed environment)

### File Structure
```
wt/
├── src/
│   ├── index.ts                    # Main CLI entry point
│   ├── types.ts                    # Type definitions
│   ├── commands/
│   │   └── worktree.ts            # Worktree management commands
│   └── utils/
│       ├── git.ts                 # Git operations
│       ├── hooks.ts               # Hook system
│       └── interactive.ts         # fzf integration
├── dist/                          # Built JavaScript (generated)
├── wt.zsh                         # Shell wrapper functions
├── example/
│   └── hooks/
│       └── wt/
│           ├── README.md
│           ├── pre-add.example
│           └── post-add.example
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── CLAUDE.md
├── README.md
└── LICENSE
```

### Hook Development
- Hooks receive specific arguments: branch_name, worktree_path, repo_path
- Post hooks additionally receive success flag
- Use example hooks as templates for custom automation
- Common use cases: dependency installation, IDE setup, environment configuration

### Testing

The project includes comprehensive test coverage:

**Unit Tests (`tests/unit/`):**
- Test individual utility functions in isolation
- Mock external dependencies (git, fzf, file system)
- Focus on core logic and edge cases
- Run with: `npm run test:unit`

**Integration Tests (`tests/e2e/`):**
- Basic CLI command validation
- Help and version output testing
- Argument validation testing
- Run with: `npm run test:e2e`

**Coverage:**
- Unit tests cover utility functions and core logic (primary focus)
- Integration tests cover basic CLI functionality
- Run `npm run test:coverage` for detailed coverage report

### Directory Change Mechanism

The TypeScript implementation handles directory changes directly through a file-based communication mechanism:

1. **Selection**: User selects a worktree through interactive fzf interface
2. **File Writing**: TypeScript writes the selected path to a temporary file in `/tmp/wt/cd-{PID}.tmp`
3. **Output Format**: Outputs `WT_CD_FILE=/path/to/temp/file` to stdout
4. **Shell Processing**: Shell wrapper uses regex to detect this pattern: `^WT_CD_FILE=(.+)$`
5. **Directory Change**: Shell reads the file content and executes `cd "$target_dir"`
6. **Cleanup**: Temporary file is automatically removed after use

This approach allows the TypeScript implementation to control directory changes without requiring shell evaluation of commands. The temporary files are process-specific (using PID) to avoid conflicts in concurrent usage.

### CI/CD Pipeline

The project includes comprehensive GitHub Actions workflows:

**CI Workflow (`.github/workflows/ci.yml`):**
- Multi-platform testing (Ubuntu, macOS)
- Multi-version Node.js support (18.x, 20.x, 22.x)
- Type checking, linting, and testing
- Global installation validation
- Code coverage reporting with Codecov
- Security auditing and dependency review

**Release Workflow (`.github/workflows/release.yml`):**
- Automated npm package publishing on version tags
- GitHub releases with asset uploads
- Triggered by `v*` tags (e.g., `v1.0.0`)

**Security Analysis (`.github/workflows/codeql.yml`):**
- CodeQL static analysis for security vulnerabilities
- Scheduled weekly scans
- Pull request analysis

**Dependency Management (`.github/dependabot.yml`):**
- Automated dependency updates
- Weekly schedule for npm and GitHub Actions
- Auto-assignment to maintainer

### Error Handling
- Graceful fallback when fzf selections are cancelled
- Repository detection validates ghq environment structure
- Hook execution continues on errors but reports them