# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Complete TypeScript rewrite of zsh-based CLI tool
- Interactive worktree selection with fzf integration
- Comprehensive test suite (unit and E2E tests)
- File-based directory change mechanism for shell integration
- npm global installation support with automatic path detection
- Pre/post operation hook system
- Self-generating shell integration function
- GitHub Actions CI/CD pipeline with multi-platform testing
- CodeQL security analysis
- Dependabot dependency management

### Changed
- Converted from zsh script to TypeScript implementation
- Improved shell integration with file-based communication
- Enhanced error handling and user experience

### Security
- Added automated security scanning with CodeQL
- Implemented dependency vulnerability checking
- Regular automated dependency updates via Dependabot

## [1.0.0] - 2024-06-26

### Added
- Initial TypeScript implementation
- Basic worktree operations (list, add, remove, cd)
- Interactive selection interface
- Shell wrapper integration
- Hook system for automation
- Comprehensive documentation