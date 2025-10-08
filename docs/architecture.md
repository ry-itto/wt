# アーキテクチャ

## 概要

`wt` は TypeScript で実装された Git worktree 管理ツールです。インタラクティブな選択機能を提供し、シェルとの統合により効率的な worktree 操作を実現します。

## プロジェクト構造

```
wt/
├── src/
│   ├── index.ts                  # エントリーポイント、CLI パーサー
│   ├── types.ts                  # 型定義
│   ├── commands/
│   │   └── worktree.ts          # WorktreeManager クラス（メインロジック）
│   └── utils/
│       ├── git.ts               # Git 操作ユーティリティ
│       ├── github.ts            # GitHub API 統合
│       ├── github-cli.ts        # GitHub CLI (gh) 統合
│       ├── hooks.ts             # フックシステム
│       └── interactive.ts       # インタラクティブ選択 (fzf)
├── tests/
│   ├── unit/                    # ユニットテスト
│   ├── e2e/                     # E2E テスト
│   └── e2e-shell/               # シェル統合テスト
└── docs/                        # ドキュメント
```

## コアコンポーネント

### 1. WorktreeManager (src/commands/worktree.ts)

worktree 操作のメインロジックを担当します。

**主な責務:**
- worktree の CRUD 操作
- インタラクティブ選択のオーケストレーション
- フックの実行
- ディレクトリ変更の通知

**主要メソッド:**
- `listWorktrees()` - worktree 一覧表示
- `addWorktree()` - worktree 作成
- `removeWorktree()` - worktree 削除
- `pruneWorktrees()` - マージ済み PR や削除されたブランチの worktree を整理
- `defaultAction()` - デフォルトアクション（worktree 選択 & cd）
- `executeInWorktree()` - 選択した worktree でコマンド実行
- `executeWithWorktree()` - 選択した worktree をコマンド引数として渡す

### 2. GitUtils (src/utils/git.ts)

Git コマンドのラッパーを提供します。

**主な機能:**
- `getCurrentRepo()` - 現在のリポジトリ情報取得（ghq 構造を想定）
- `listWorktrees()` - `git worktree list --porcelain` のパース
- `addWorktree()` - worktree 作成（ローカル/リモートブランチ対応）
- `removeWorktree()` - worktree 削除
- `listBranches()` - ブランチ一覧取得（ローカル & リモート）
- `checkWorktreeStatus()` - worktree のステータス確認（dirty、locked）
- `hasUncommittedChanges()` - 未コミット変更の確認
- `fetchRemote()` - リモート情報の取得

**設計判断:**
- ghq ディレクトリ構造を前提とした実装（`~/ghq/github.com/owner/repo`）
- ブランチが既にチェックアウトされている場合の自動切り替え
- ローカル/リモートブランチの自動判別

### 3. InteractiveSelector (src/utils/interactive.ts)

fzf を使用したインタラクティブ選択を提供します。

**主な機能:**
- `selectWorktree()` - worktree の選択
- `selectBranch()` - ブランチの選択（PR 情報付き）
- `confirmAction()` - 確認プロンプト

**環境検出:**
- TTY の有無
- CI 環境の検出
- テスト環境での動作

### 4. HookManager (src/utils/hooks.ts)

Git スタイルのフックシステムを実装します。

**フックの種類:**
- `pre-add` / `post-add` - worktree 作成前後
- `pre-remove` / `post-remove` - worktree 削除前後

**フックの場所:**
- グローバル: `~/.zsh/hooks/wt/`
- リポジトリ固有: `<repo>/.wt/hooks/`

**実行順序:**
1. グローバル pre フック
2. リポジトリ固有 pre フック
3. 操作実行
4. グローバル post フック
5. リポジトリ固有 post フック

### 5. GitHubCLI (src/utils/github-cli.ts)

GitHub CLI (`gh`) を使用した GitHub 統合を提供します。

**主な機能:**
- `fetchMergedPullRequests()` - マージ済み PR の取得
- `checkBranchDeleted()` - ブランチ削除の確認
- `getPullRequestForBranch()` - ブランチに対応する PR の取得

**使用場面:**
- `wt prune` - マージ済み PR の worktree 削除
- `wt add --pr-only` - PR があるブランチのみ表示

## シェル統合メカニズム

### ディレクトリ変更の仕組み

`wt` は [git-workers](https://github.com/wasabeef/git-workers) からインスピレーションを得た堅牢なディレクトリ変更メカニズムを採用しています。

**2段階のフォールバック:**

1. **環境変数メソッド（推奨）:**
   - シェル関数が `WT_SWITCH_FILE` 環境変数を設定
   - CLI が一時ファイルにパスを書き込み
   - シェル関数がファイルを読み取って `cd` を実行

2. **stdout マーカーメソッド（フォールバック）:**
   - CLI が `WT_CD:<path>` 形式で stdout に出力
   - シェル関数が正規表現でパースして `cd` を実行

### 実装の詳細

**CLI 側 (src/commands/worktree.ts):**
```typescript
private writeCdPath(path: string): void {
  const switchFile = process.env.WT_SWITCH_FILE;
  if (switchFile) {
    writeFileSync(switchFile, path);
  } else {
    console.log(`WT_CD:${path}`);
  }
}
```

**シェル側 (wt shell-init):**
- 一時ファイル `/tmp/wt_switch_$$` を作成
- `WT_SWITCH_FILE` 環境変数を設定
- ファイルの存在を確認して `cd` を実行
- フォールバックとして stdout のパース

## 型システム

### 主要な型定義 (src/types.ts)

```typescript
interface WorktreeInfo {
  path: string;
  branch: string;
  commit: string;
  isMain: boolean;
}

interface BranchInfo {
  name: string;
  type: BranchType;
  inUse: boolean;
  worktreePath?: string;
  isRemote: boolean;
  remoteName?: string;
  hasPullRequest?: boolean;
  prNumber?: number;
  prTitle?: string;
}

interface PrunableWorktree {
  worktree: WorktreeInfo;
  reason: 'merged-pr' | 'deleted-branch';
  prNumber?: number;
  prTitle?: string;
  mergedAt?: string;
  hasUncommittedChanges: boolean;
}
```

## エラーハンドリング

### 設計方針

1. **ユーザーフレンドリーなエラーメッセージ**
   - `chalk` を使用した色付きメッセージ
   - 具体的なエラー理由と解決策の提示

2. **グレースフルデグラデーション**
   - GitHub CLI が利用できない場合でも基本機能は動作
   - フックの実行エラーは警告のみ（処理は継続）

3. **安全性優先**
   - 未コミット変更がある場合の確認プロンプト
   - dry-run モードのサポート
   - force フラグによる明示的な危険操作

## パフォーマンス考慮事項

### 並列処理

- ブランチの PR 情報取得は `Promise.all()` で並列化
- 大量のブランチがある場合の最適化

### Git コマンドの最適化

- `git worktree list --porcelain` でパース可能な形式を取得
- `git branch --format` で必要な情報のみ取得
- `git fetch --prune` でリモート参照を効率的に更新

## セキュリティ考慮事項

### GitHub 認証

- GitHub CLI の認証機能を利用
- トークンは GitHub CLI が管理（`wt` では保持しない）

### フック実行

- 実行権限のチェック
- 明示的なフックパスのみ実行
- zsh シェルでのサンドボックス実行

## 拡張性

### 設定可能な環境変数

- `WT_CLI_PATH` - CLI の実行パス（開発用）
- `WT_WORKTREE_DIR` - worktree の作成先ディレクトリ
- `WT_SWITCH_FILE` - ディレクトリ変更用一時ファイル（内部）
- `WT_ALWAYS_SHOW_PR` - PR 情報を常に表示

### プラグインポイント

- フックシステム（pre/post add/remove）
- カスタム worktree ディレクトリ設定
