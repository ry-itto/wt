# wt

TypeScript-based git worktree management tool with interactive selection and shell integration.

## Features

- 🚀 Interactive worktree selection with fzf
- 📁 Smart directory navigation
- 🔄 Pre/post operation hooks
- 🛠 TypeScript implementation with comprehensive tests
- 🐚 Self-generating shell integration

## Installation

### Global Installation (Recommended)

```bash
# Install globally via npm
npm install --global @ry-itto/wt

# Generate shell integration
wt shell-init > ~/.wt-integration.zsh

# Add to your shell configuration
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
# Interactive worktree selection and navigation
wt

# List worktrees
wt list

# Create new worktree
wt add feature-branch

# Remove worktree with interactive selection
wt remove

# Generate shell integration function
wt shell-init
```

## Shell Integration

The tool can generate its own shell integration function:

```bash
# Generate integration function
wt shell-init > ~/.wt-integration.zsh

# Or use the provided static file
source wt.zsh
```

## Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Build
npm run build
```