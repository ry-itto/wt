# Tests

This directory contains tests for the `wt` CLI tool.

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   └── utils/
│       ├── git.test.ts      # GitUtils tests
│       ├── hooks.test.ts    # HookManager tests
│       └── interactive.test.ts # InteractiveSelector tests
├── e2e/                     # Basic integration tests
│   ├── cli.test.ts          # CLI command tests
│   └── helpers/
│       └── test-environment.ts # Test utilities
└── __mocks__/               # Test mocks
```

## Running Tests

```bash
# All tests
npm test

# Unit tests (recommended for development)
npm run test:unit

# Basic integration tests
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Test Philosophy

**Unit Tests**: Fast, comprehensive testing of core logic with mocked dependencies.
**Integration Tests**: Basic CLI functionality validation.

Focus on unit tests for development and debugging.