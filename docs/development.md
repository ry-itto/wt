# 開発ガイド

## セットアップ

### 前提条件

- Node.js >= 18.0.0
- npm または yarn
- Git
- fzf（インタラクティブ選択に必要）
- GitHub CLI（GitHub 統合機能に必要、オプション）

### リポジトリのクローン

```bash
# HTTPS
git clone https://github.com/ry-itto/wt.git
cd wt

# SSH
git clone git@github.com:ry-itto/wt.git
cd wt
```

### 依存関係のインストール

```bash
npm install
```

### ビルド

```bash
npm run build
```

ビルド成果物は `dist/` ディレクトリに生成されます。

## 開発ワークフロー

### ローカルでの実行

TypeScript を直接実行（開発モード）:

```bash
npm run dev
```

または、ビルドしてから実行:

```bash
npm run build
npm start
```

### シェル統合のテスト

開発中の CLI をシェル統合でテストする:

```bash
# 環境変数でカスタムパスを指定
export WT_CLI_PATH=/path/to/wt/dist/index.js

# シェル統合を生成
eval "$(node dist/index.js shell-init)"

# テスト
wt
```

### コードの整形

ESLint でコードをチェック:

```bash
npm run lint
```

### 型チェック

TypeScript の型チェックを実行:

```bash
npm run typecheck
```

## プロジェクト構造

```
wt/
├── src/
│   ├── index.ts                  # エントリーポイント
│   ├── types.ts                  # 型定義
│   ├── commands/
│   │   └── worktree.ts          # WorktreeManager
│   └── utils/
│       ├── git.ts               # Git 操作
│       ├── github.ts            # GitHub API
│       ├── github-cli.ts        # GitHub CLI
│       ├── hooks.ts             # フックシステム
│       └── interactive.ts       # インタラクティブ選択
├── tests/
│   ├── unit/                    # ユニットテスト
│   ├── e2e/                     # E2E テスト
│   └── e2e-shell/               # シェル統合テスト
├── dist/                        # ビルド成果物
├── docs/                        # ドキュメント
├── example/                     # サンプルコード
└── package.json
```

## コーディング規約

### TypeScript

- **型安全性:** すべての関数に型注釈を付ける
- **null 安全:** `null` と `undefined` を適切に扱う
- **async/await:** Promise は async/await で扱う

**例:**
```typescript
async function addWorktree(
  branch: string,
  path?: string
): Promise<boolean> {
  // ...
}
```

### 命名規則

- **クラス:** PascalCase (`WorktreeManager`, `GitUtils`)
- **関数/メソッド:** camelCase (`listWorktrees`, `addWorktree`)
- **定数:** UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`)
- **ファイル:** kebab-case (`worktree-manager.ts`)

### エラーハンドリング

- ユーザーフレンドリーなエラーメッセージ
- `chalk` を使用した色付き出力
- 適切な終了コード

**例:**
```typescript
if (!repo) {
  console.error(chalk.red('Error: Not in a git repository'));
  process.exit(1);
}
```

### コメント

- 複雑なロジックには説明コメントを追加
- JSDoc スタイルのコメントを推奨

**例:**
```typescript
/**
 * Writes the target directory path for shell integration.
 * Uses environment variable method (preferred) or stdout marker as fallback.
 */
private writeCdPath(path: string): void {
  // ...
}
```

## テスト

テストについては [testing.md](./testing.md) を参照してください。

## リリースプロセス

### バージョニング

セマンティックバージョニングに従います:

- **MAJOR:** 破壊的変更
- **MINOR:** 後方互換性のある機能追加
- **PATCH:** 後方互換性のあるバグ修正

### リリース手順

1. **バージョンを更新**

```bash
# パッチリリース (1.0.0 → 1.0.1)
npm version patch

# マイナーリリース (1.0.0 → 1.1.0)
npm version minor

# メジャーリリース (1.0.0 → 2.0.0)
npm version major
```

2. **CHANGELOG.md を更新**

変更内容を記録します。

3. **コミット & タグ**

```bash
git add CHANGELOG.md package.json package-lock.json
git commit -m "chore: release v1.0.1"
git tag v1.0.1
```

4. **プッシュ**

```bash
git push origin main --tags
```

5. **npm に公開**

```bash
npm publish
```

## CI/CD

### GitHub Actions

プロジェクトは以下の GitHub Actions ワークフローを使用しています:

#### CI (.github/workflows/ci.yml)

- **トリガー:** プッシュ、プルリクエスト
- **実行内容:**
  - 依存関係のインストール
  - ビルド
  - ESLint チェック
  - 型チェック
  - ユニットテスト
  - E2E テスト
  - シェル統合テスト

#### CodeQL (.github/workflows/codeql.yml)

- **トリガー:** プッシュ、プルリクエスト、スケジュール（週次）
- **実行内容:** セキュリティ脆弱性の静的解析

### Dependabot

自動依存関係更新:

- **npm パッケージ:** 週次チェック
- **GitHub Actions:** 週次チェック
- **自動マージ:** パッチ & マイナーバージョン更新

設定: `.github/dependabot.yml`

## デバッグ

### ローカルデバッグ

VSCode のデバッガーを使用:

**.vscode/launch.json**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug wt",
      "program": "${workspaceFolder}/src/index.ts",
      "preLaunchTask": "npm: build",
      "args": [],
      "skipFiles": ["<node_internals>/**"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "runtimeArgs": ["--loader", "tsx"]
    }
  ]
}
```

### ログ出力

開発中に詳細なログを出力:

```typescript
if (process.env.DEBUG) {
  console.log('Debug:', someVariable);
}
```

実行時:
```bash
DEBUG=1 npm run dev
```

## コントリビューション

### ブランチ戦略

- `main` - 安定版
- `feature/*` - 新機能
- `bugfix/*` - バグ修正
- `hotfix/*` - 緊急修正

### プルリクエスト

1. **フォーク & ブランチ作成**

```bash
git checkout -b feature/my-feature
```

2. **コードを書く**

3. **テストを追加/更新**

```bash
npm test
```

4. **コミット**

コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/) に従います:

```
feat: Add support for remote branch creation
fix: Resolve directory change issue on macOS
docs: Update installation instructions
test: Add unit tests for GitUtils
chore: Update dependencies
```

5. **プッシュ & プルリクエスト作成**

```bash
git push origin feature/my-feature
```

GitHub でプルリクエストを作成します。

### コードレビュー

プルリクエストは以下を確認してからマージされます:

- すべてのテストが通過
- ESLint エラーなし
- 型チェック成功
- コードレビュー承認

## トラブルシューティング

### ビルドエラー

```bash
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install

# キャッシュをクリア
npm run clean
npm run build
```

### テスト失敗

```bash
# テストのみ実行
npm run test:unit

# 特定のテストを実行
npm test -- tests/unit/utils/git.test.ts
```

### シェル統合が動作しない

```bash
# 最新のシェル統合を生成
eval "$(node dist/index.js shell-init)"

# WT_CLI_PATH を確認
echo $WT_CLI_PATH

# 手動でパスを設定
export WT_CLI_PATH=/path/to/wt/dist/index.js
```

## リソース

### ドキュメント

- [アーキテクチャ](./architecture.md)
- [コマンドリファレンス](./commands.md)
- [シェル統合](./shell-integration.md)
- [フックシステム](./hooks.md)
- [GitHub 統合](./github-integration.md)
- [テストガイド](./testing.md)

### 外部リソース

- [TypeScript ハンドブック](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Commander.js](https://github.com/tj/commander.js)
- [chalk](https://github.com/chalk/chalk)
- [fzf](https://github.com/junegunn/fzf)
- [GitHub CLI](https://cli.github.com/)

## ライセンス

MIT License - 詳細は [LICENSE](../LICENSE) を参照してください。
