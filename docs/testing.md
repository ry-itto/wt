# テストガイド

## 概要

`wt` は3種類のテストを提供しています:

1. **ユニットテスト** - 個々の関数・クラスのテスト
2. **E2E テスト** - CLI の統合テスト
3. **シェル統合テスト** - シェル関数のテスト

## テストの実行

### すべてのテストを実行

```bash
npm test
```

以下を順次実行します:
1. ユニットテスト
2. E2E テスト
3. シェル統合テスト

### ユニットテストのみ

```bash
npm run test:unit
```

### E2E テストのみ

```bash
npm run test:e2e
```

### シェル統合テストのみ

```bash
npm run test:shell
```

### Watch モード

開発中にファイル変更を監視して自動テスト:

```bash
npm run test:watch
```

### カバレッジ

テストカバレッジレポートを生成:

```bash
npm run test:coverage
```

## ユニットテスト

### 概要

- **フレームワーク:** Jest
- **場所:** `tests/unit/`
- **対象:** 個々のユーティリティ関数、クラスメソッド

### 構造

```
tests/unit/
├── utils/
│   ├── git.test.ts
│   ├── git-branches.test.ts
│   ├── hooks.test.ts
│   ├── interactive.test.ts
│   └── interactive-branches.test.ts
└── ...
```

### テストの例

**tests/unit/utils/git.test.ts**

```typescript
import { GitUtils } from '../../../src/utils/git';
import { execSync } from 'child_process';

jest.mock('child_process');

describe('GitUtils', () => {
  describe('listWorktrees', () => {
    it('should parse git worktree list output correctly', () => {
      const mockOutput = `worktree /path/to/repo
HEAD abc123
branch refs/heads/main

worktree /path/to/repo-feature
HEAD def456
branch refs/heads/feature
`;
      (execSync as jest.Mock).mockReturnValue(mockOutput);

      const worktrees = GitUtils.listWorktrees('/path/to/repo');

      expect(worktrees).toHaveLength(2);
      expect(worktrees[0]).toMatchObject({
        path: '/path/to/repo',
        branch: 'main',
        commit: 'abc123',
        isMain: true
      });
    });
  });
});
```

### モックの使用

外部コマンドや依存関係をモック:

```typescript
// child_process をモック
jest.mock('child_process');

// fs をモック
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  writeFileSync: jest.fn()
}));
```

## E2E テスト

### 概要

- **フレームワーク:** Jest
- **場所:** `tests/e2e/`
- **対象:** CLI の統合動作

### セットアップ

E2E テストはテスト環境を自動的にセットアップします:

1. 一時ディレクトリの作成
2. テスト用 Git リポジトリの初期化
3. worktree の作成
4. テスト実行
5. クリーンアップ

**tests/e2e/helpers/test-environment.ts**

```typescript
export class TestEnvironment {
  static async setup(): Promise<string> {
    const tmpDir = mkdtempSync(join(tmpdir(), 'wt-test-'));
    // Git リポジトリを初期化
    execSync('git init', { cwd: tmpDir });
    execSync('git commit --allow-empty -m "Initial commit"', { cwd: tmpDir });
    return tmpDir;
  }

  static async teardown(dir: string): Promise<void> {
    // テスト環境をクリーンアップ
    rmSync(dir, { recursive: true, force: true });
  }
}
```

### テストの例

**tests/e2e/cli.test.ts**

```typescript
describe('wt CLI', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await TestEnvironment.setup();
  });

  afterEach(async () => {
    await TestEnvironment.teardown(testDir);
  });

  it('should list worktrees', async () => {
    // worktree を作成
    execSync('git worktree add ../test-worktree', { cwd: testDir });

    // wt list を実行
    const output = execSync('node dist/index.js list', {
      cwd: testDir,
      encoding: 'utf8'
    });

    expect(output).toContain('test-worktree');
  });
});
```

## シェル統合テスト

### 概要

- **フレームワーク:** Bash スクリプト
- **場所:** `tests/e2e-shell/`
- **対象:** シェル関数の動作

### 構造

```
tests/e2e-shell/
├── run-all-tests.sh           # テストランナー
├── run-docker-tests.sh        # Docker テストランナー
├── run-container-cli-minimal.sh  # Container CLI テストランナー
├── test-shell-integration.sh  # シェル統合テスト
├── lib/
│   └── test-helpers.sh        # テストヘルパー関数
└── test-results/              # テスト結果出力
```

### テストの実行

#### ローカル環境

```bash
npm run test:shell
```

**要件:**
- Git
- fzf
- ghq（オプション）

#### Docker 環境

ローカル環境を汚さずに隔離された環境でテスト:

```bash
# デフォルト（Node.js 20）
npm run test:docker

# 特定の Node.js バージョン
npm run test:docker -- --node 18

# すべての Node.js バージョン（18, 20, 22）
npm run test:docker:all

# インタラクティブシェル（デバッグ用）
npm run test:docker:shell

# クリーンアップ
npm run test:docker:clean
```

#### Container CLI (macOS)

Apple の Container CLI を使用（実験的）:

```bash
npm run test:container:minimal
```

**注意:** ネットワーク制限により、最小限のテストのみサポート。

### テストヘルパー関数

**tests/e2e-shell/lib/test-helpers.sh**

```bash
# テスト開始
test_start() {
  echo "TEST: $1"
}

# 成功
test_pass() {
  echo "✅ PASS: $1"
}

# 失敗
test_fail() {
  echo "❌ FAIL: $1"
  exit 1
}

# アサーション
assert_contains() {
  local text="$1"
  local expected="$2"
  if [[ "$text" != *"$expected"* ]]; then
    test_fail "Expected to contain: $expected"
  fi
}
```

### テストの例

**tests/e2e-shell/test-shell-integration.sh**

```bash
#!/bin/bash

source ./lib/test-helpers.sh

test_start "Shell integration loads correctly"

# シェル統合を読み込み
eval "$(node dist/index.js shell-init)"

# wt 関数が定義されているか確認
if type wt &>/dev/null; then
  test_pass "wt function is defined"
else
  test_fail "wt function is not defined"
fi

test_start "Directory change works"

# テストリポジトリを作成
test_repo=$(mktemp -d)
git init "$test_repo"
cd "$test_repo"

# worktree を作成
git worktree add ../test-worktree

# wt cd を実行してディレクトリ変更
# （実際にはインタラクティブ選択をモックする必要がある）

test_pass "Directory change test completed"
```

## Docker テスト環境

### 概要

Docker を使用して、隔離された環境でテストを実行します。

### Dockerfile

**tests/e2e-shell/Dockerfile**

```dockerfile
FROM ubuntu:22.04

ARG NODE_VERSION=20

# 依存関係をインストール
RUN apt-get update && apt-get install -y \
  git \
  curl \
  fzf \
  && rm -rf /var/lib/apt/lists/*

# Node.js をインストール
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
  && apt-get install -y nodejs

# ghq をインストール
RUN curl -L https://github.com/x-motemen/ghq/releases/download/v1.4.2/ghq_linux_amd64.zip -o ghq.zip \
  && unzip ghq.zip \
  && mv ghq_linux_amd64/ghq /usr/local/bin/ \
  && rm -rf ghq.zip ghq_linux_amd64

# 作業ディレクトリを設定
WORKDIR /workspace
```

### テストの実行

```bash
# イメージをビルド
docker build -t wt-test -f tests/e2e-shell/Dockerfile .

# テストを実行
docker run --rm -v $(pwd):/workspace wt-test bash tests/e2e-shell/run-all-tests.sh
```

## CI/CD でのテスト

### GitHub Actions

**.github/workflows/ci.yml**

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run unit tests
        run: npm run test:unit

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Install test dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y git fzf

      - name: Run shell integration tests
        run: npm run test:shell
```

## テストのベストプラクティス

### 1. テストの独立性

各テストは独立して実行できるようにします。

**悪い例:**
```typescript
let globalState: any;

it('test 1', () => {
  globalState = { value: 1 };
});

it('test 2', () => {
  expect(globalState.value).toBe(1); // test 1 に依存
});
```

**良い例:**
```typescript
it('test 1', () => {
  const state = { value: 1 };
  expect(state.value).toBe(1);
});

it('test 2', () => {
  const state = { value: 1 };
  expect(state.value).toBe(1);
});
```

### 2. モックの適切な使用

外部依存をモックして、テストを高速化・安定化します。

```typescript
// Git コマンドをモック
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));
```

### 3. エッジケースのテスト

正常系だけでなく、エラーケースもテストします。

```typescript
it('should handle empty worktree list', () => {
  (execSync as jest.Mock).mockReturnValue('');
  const worktrees = GitUtils.listWorktrees('/path/to/repo');
  expect(worktrees).toEqual([]);
});

it('should handle git command errors', () => {
  (execSync as jest.Mock).mockImplementation(() => {
    throw new Error('Command failed');
  });
  const worktrees = GitUtils.listWorktrees('/path/to/repo');
  expect(worktrees).toEqual([]);
});
```

### 4. テストの可読性

テストは自己文書化されるべきです。

```typescript
describe('GitUtils.addWorktree', () => {
  it('should create worktree for local branch', async () => {
    // Arrange
    const repoPath = '/path/to/repo';
    const branch = 'feature-branch';
    const worktreePath = '/path/to/worktree';

    // Act
    const result = await GitUtils.addWorktree(repoPath, branch, worktreePath);

    // Assert
    expect(result).toBe(true);
  });
});
```

### 5. クリーンアップ

テスト後は必ずクリーンアップします。

```typescript
afterEach(async () => {
  // 一時ファイル・ディレクトリを削除
  await TestEnvironment.teardown(testDir);
});
```

## デバッグ

### 特定のテストのみ実行

```bash
# ファイル単位
npm test -- tests/unit/utils/git.test.ts

# テストケース単位（it.only を使用）
it.only('should test specific case', () => {
  // ...
});
```

### デバッグ出力

```typescript
// テスト中にログを出力
console.log('Debug:', someVariable);

// Jest のデバッグモード
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Docker テストのデバッグ

```bash
# インタラクティブシェルを起動
npm run test:docker:shell

# コンテナ内でテストを実行
bash tests/e2e-shell/run-all-tests.sh
```

## カバレッジ目標

- **ユニットテスト:** 80% 以上
- **E2E テスト:** 主要なユースケースをカバー
- **シェル統合テスト:** すべてのシェル関数をカバー

## トラブルシューティング

### テストがタイムアウトする

Jest のタイムアウトを増やす:

```typescript
jest.setTimeout(10000); // 10秒
```

### モックがリセットされない

各テスト後にモックをクリア:

```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

### シェルテストが失敗する

依存関係を確認:

```bash
# fzf がインストールされているか
which fzf

# Git がインストールされているか
git --version
```

## 参考

- [Jest ドキュメント](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
