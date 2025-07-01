# wt

[![CI](https://github.com/ry-itto/wt/actions/workflows/ci.yml/badge.svg)](https://github.com/ry-itto/wt/actions/workflows/ci.yml)
[![CodeQL](https://github.com/ry-itto/wt/actions/workflows/codeql.yml/badge.svg)](https://github.com/ry-itto/wt/actions/workflows/codeql.yml)
[![npm version](https://badge.fury.io/js/@ry-itto%2Fwt.svg)](https://badge.fury.io/js/@ry-itto%2Fwt)

TypeScript-based git worktree management tool with interactive selection and shell integration.

## Features

- 🚀 Interactive worktree selection with fzf
- 📁 Smart directory navigation with automatic cd
- 🔄 Pre/post operation hooks
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

# Generate shell integration with custom path
WT_CLI_PATH="$(pwd)/dist/index.js" wt shell-init > ~/.wt-integration.zsh

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

# Create new worktree
wt add feature-branch [optional-path]

# Remove worktree with interactive selection
wt remove

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

# Or use the provided static file (deprecated)
source wt.zsh
```

### Environment Variables

- `WT_CLI_PATH`: Custom path to the wt executable (for local development)
- `WT_WORKTREE_DIR`: Custom base directory for worktree creation

## Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Build
npm run build
```