# Shell Script E2E Tests for wt CLI

This directory contains shell script-based end-to-end tests for the wt CLI tool.

## Structure

- `run-all-tests.sh` - Main test runner
- `test-helpers.sh` - Common test utilities and assertions
- `tests/` - Individual test scripts
- `fixtures/` - Test setup scripts for creating test repositories

## Running Tests

```bash
# Run all tests
npm run test:shell

# Run tests directly
bash tests/e2e-shell/run-all-tests.sh

# Clean up test outputs
npm run test:shell:clean
```

## Test Coverage

The shell tests cover:

1. **Basic Commands** - Help, version, command structure
2. **List Command** - Listing worktrees in various states
3. **Add Command** - Creating worktrees with different options
4. **Remove Command** - Removing worktrees with various conditions
5. **Prune Command** - Pruning merged/deleted worktrees
6. **CD Command** - Directory change functionality
7. **Special Patterns** - `--` and command pass-through
8. **Error Scenarios** - Various error conditions
9. **Hooks** - Hook execution and ordering
10. **Shell Integration** - Shell function generation
11. **Environment Variables** - Environment variable handling

## Writing New Tests

1. Create a new test script in `tests/` directory
2. Source the test helpers: `source "$SCRIPT_DIR/../test-helpers.sh"`
3. Use the assertion functions provided
4. Follow the existing test patterns

## CI Integration

These tests run automatically in CI on:
- Ubuntu with bash
- macOS with bash and zsh

The CI workflow installs necessary dependencies (fzf, ghq) before running tests.