# wt

[![CI](https://github.com/ry-itto/wt/actions/workflows/ci.yml/badge.svg)](https://github.com/ry-itto/wt/actions/workflows/ci.yml)
[![CodeQL](https://github.com/ry-itto/wt/actions/workflows/codeql.yml/badge.svg)](https://github.com/ry-itto/wt/actions/workflows/codeql.yml)
[![npm version](https://badge.fury.io/js/@ry-itto%2Fwt.svg)](https://badge.fury.io/js/@ry-itto%2Fwt)

TypeScript-based git worktree management tool with interactive selection and shell integration.

## Features

- 🚀 Interactive worktree selection with fzf
- 📁 Smart directory navigation with automatic cd
- 🪝 Pre/post operation hooks (global and repository-specific)
- 🛠 TypeScript implementation with comprehensive tests
- 🐚 Self-generating shell integration
- 🔄 Robust directory change mechanism (inspired by git-workers)

## Installation

### Global Installation (Recommended)

```bash
# Install globally via npm
npm install --global @ry-itto/wt

# Generate and load shell integration
eval "$(wt shell-init)"

# Or save permanently
wt shell-init > ~/.wt-integration.zsh
echo "source ~/.wt-integration.zsh" >> ~/.zshrc
```

### Local Development Setup

```bash
# Clone and build locally
git clone <repo-url>
cd wt
npm install && npm run build

# Generate shell integration
node dist/index.js shell-init > ~/.wt-integration.zsh

# Add to your shell configuration
echo "source ~/.wt-integration.zsh" >> ~/.zshrc
```

## Usage

```bash
# Interactive worktree selection and navigation (auto-cd)
wt

# Explicit directory change to selected worktree  
wt cd

# List worktrees in current repository
wt list

# Create new worktree (interactive branch selection)
wt add

# Create new worktree with specific branch
wt add feature-branch [optional-path]

# Remove worktree with interactive selection
wt remove

# Prune worktrees for merged PRs or deleted branches
wt prune
wt prune --dry-run  # Preview what would be pruned
wt prune --force    # Skip confirmation
wt prune --all      # Include all deleted branches, not just merged PRs

# Execute command in selected worktree
wt -- <command>

# Pass selected worktree as argument to command
wt <command>

# Generate shell integration function
wt shell-init
```

## Shell Integration

The tool uses a robust directory change mechanism inspired by [git-workers](https://github.com/wasabeef/git-workers). The shell integration automatically handles directory changes when switching worktrees.

### How it works

1. **Environment Variable Method**: Uses `WT_SWITCH_FILE` to communicate the target directory via temporary files
2. **Fallback Method**: Uses stdout markers (`WT_CD:`) when environment variables aren't available
3. **Automatic Cleanup**: Temporary files are automatically cleaned up after use

### Setup

```bash
# Generate integration function (automatic method)
eval "$(wt shell-init)"

# Or save permanently
wt shell-init > ~/.wt-integration.zsh
source ~/.wt-integration.zsh

# Or use the provided static file
source wt.zsh
```

### Environment Variables

- `WT_CLI_PATH`: Custom path to the wt executable (for local development)
- `WT_WORKTREE_DIR`: Custom base directory for worktree creation

## Hook System

`wt` supports a hook system for automating tasks during worktree operations, similar to Git hooks.

### Hook Types

- **pre-add**: Executed before creating a worktree
- **post-add**: Executed after creating a worktree

### Hook Locations

**Global hooks** (affect all repositories):
- `~/.zsh/hooks/wt/pre-add`
- `~/.zsh/hooks/wt/post-add`

**Repository-specific hooks** (affect single repository):
- `<repo>/.wt/hooks/pre-add`
- `<repo>/.wt/hooks/post-add`

### Setup

1. Create hook directories:
```bash
# Global hooks
mkdir -p ~/.zsh/hooks/wt

# Repository-specific hooks
mkdir -p /path/to/repo/.wt/hooks
```

2. Create hook scripts:
```bash
# Example: Auto-install dependencies after worktree creation
cat > ~/.zsh/hooks/wt/post-add << 'EOF'
#!/bin/zsh
# $1: branch name, $2: worktree path, $3: repo path, $4: success flag

if [[ "$4" == "true" && -f "$2/package.json" ]]; then
    echo "Installing dependencies in new worktree..."
    (cd "$2" && npm install)
fi
EOF

chmod +x ~/.zsh/hooks/wt/post-add
```

### Hook Arguments

**pre-add hooks receive**:
- `$1`: Branch name
- `$2`: Worktree path
- `$3`: Repository path

**post-add hooks receive**:
- `$1`: Branch name
- `$2`: Worktree path  
- `$3`: Repository path
- `$4`: Success flag ("true" or "false")

### Execution Order

1. Global pre-add hook
2. Repository-specific pre-add hook
3. Worktree creation
4. Global post-add hook
5. Repository-specific post-add hook

### Example Hooks

See [`example/hooks/wt/`](example/hooks/wt/) for example hook scripts including:
- Dependency installation
- Branch naming validation
- IDE integration

## Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Build
npm run build
```

### Automated Dependency Management

This project uses [Dependabot](https://docs.github.com/en/code-security/dependabot) for automated dependency updates:

- **Automatic Updates**: Weekly updates for npm packages and GitHub Actions
- **Auto-merge**: Patch and minor version updates are automatically merged after CI passes
- **Manual Review**: Major version updates require manual review due to potential breaking changes
- **No Assignees**: Dependabot PRs don't assign reviewers to reduce notification noise

Dependabot configuration can be found in [`.github/dependabot.yml`](.github/dependabot.yml).

### Running E2E Tests in Docker

To run the e2e shell tests in an isolated Docker environment without affecting your local machine:

```bash
# Run tests with default Node.js version (20)
npm run test:docker

# Run tests with specific Node.js version
npm run test:docker -- --node 18

# Run tests with all Node.js versions (18, 20, 22)
npm run test:docker:all

# Start interactive shell for debugging
npm run test:docker:shell

# Clean up Docker images and test results
npm run test:docker:clean
```

The Docker test environment:
- Runs tests in isolated Ubuntu 22.04 containers
- Supports multiple Node.js versions (18, 20, 22)
- Installs all required dependencies (git, fzf, ghq)
- Preserves test output in `tests/e2e-shell/test-results/`
- Prevents any changes to your local environment

### Running E2E Tests with Apple Container CLI (Experimental)

[Apple's Container CLI](https://github.com/apple/container) support is experimental due to network limitations:

```bash
# Run minimal tests with mocked dependencies (no network required)
npm run test:container:minimal
```

**Note**: Due to Container CLI's network restrictions on macOS 15, only a minimal test suite with mocked dependencies is available. For full testing, use Docker (`npm run test:docker`) or run tests locally.