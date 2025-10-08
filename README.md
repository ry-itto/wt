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
- 🔗 GitHub integration for PR-based workflow
- 🧹 Automatic cleanup of merged worktrees

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

## Quick Start

```bash
# Interactive worktree selection and navigation
wt

# List all worktrees
wt list

# Create new worktree
wt add

# Remove worktree
wt remove

# Clean up merged worktrees
wt prune
```

詳細なコマンドリファレンスは [docs/commands.md](docs/commands.md) を参照してください。

## Documentation

- **[コマンドリファレンス](docs/commands.md)** - すべてのコマンドの詳細な使い方
- **[シェル統合](docs/shell-integration.md)** - シェル統合の仕組みとセットアップ
- **[フックシステム](docs/hooks.md)** - カスタムスクリプトによる自動化
- **[GitHub 統合](docs/github-integration.md)** - Pull Request ベースのワークフロー
- **[アーキテクチャ](docs/architecture.md)** - 内部設計と実装詳細
- **[開発ガイド](docs/development.md)** - コントリビューション方法
- **[テストガイド](docs/testing.md)** - テストの書き方と実行方法

## Advanced Features

### Hook System

worktree の作成・削除時にカスタムスクリプトを自動実行できます。

```bash
# 依存関係の自動インストール例
cat > ~/.zsh/hooks/wt/post-add << 'EOF'
#!/bin/zsh
if [[ "$4" == "true" && -f "$2/package.json" ]]; then
    (cd "$2" && npm install)
fi
EOF
chmod +x ~/.zsh/hooks/wt/post-add
```

詳細は [docs/hooks.md](docs/hooks.md) を参照してください。

### GitHub Integration

GitHub CLI を使用した PR ベースのワークフローをサポート:

```bash
# PR があるブランチのみ表示
wt add --pr-only

# マージ済み PR の worktree を削除
wt prune
```

詳細は [docs/github-integration.md](docs/github-integration.md) を参照してください。

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

開発の詳細は [docs/development.md](docs/development.md) を参照してください。

### Testing

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# Shell integration tests
npm run test:shell

# Docker environment (isolated)
npm run test:docker
```

テストの詳細は [docs/testing.md](docs/testing.md) を参照してください。
