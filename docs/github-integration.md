# GitHub 統合

## 概要

`wt` は GitHub CLI (`gh`) を利用して、Pull Request 情報の取得や、マージ済み PR の worktree 管理を提供します。

## セットアップ

### GitHub CLI のインストール

```bash
# macOS
brew install gh

# Ubuntu/Debian
sudo apt install gh

# Windows
winget install --id GitHub.cli
```

その他のプラットフォームは [公式ドキュメント](https://cli.github.com/) を参照してください。

### 認証

GitHub CLI で GitHub にログインします:

```bash
gh auth login
```

**認証方法:**
1. GitHub.com を選択
2. HTTPS を選択
3. Web ブラウザでログイン、または トークンを入力

**確認:**
```bash
gh auth status
```

## 機能

### 1. PR 情報付きブランチ選択

ブランチ選択時に Pull Request 情報を表示します。

#### 自動表示（`--pr-only` 使用時）

```bash
wt add --pr-only
```

**表示例:**
```
feature-auth [local] [PR #123 - Add authentication system]
bugfix/login [remote] [PR #124 - Fix login redirect]
```

#### 常時表示（環境変数設定）

```bash
export WT_ALWAYS_SHOW_PR=1
```

すべてのブランチ選択時に PR 情報を表示します。

**注意:** GitHub API の呼び出しが増えるため、ブランチ選択が遅くなる可能性があります。

### 2. マージ済み PR の worktree 削除

`wt prune` コマンドで、マージ済み Pull Request のブランチに対応する worktree を削除できます。

```bash
wt prune
```

**動作:**
1. GitHub CLI で最近マージされた PR を取得（上限 100 件）
2. マージ済み PR のブランチに対応する worktree を検出
3. 削除対象の一覧を表示
4. 確認後、worktree を削除

**表示例:**
```
Found 2 worktree(s) to prune:

• feature-123
  Path: /path/to/repo-feature-123
  Reason: PR merged (#123: Add new feature)
  Merged: 2024-01-15

• bug-fix
  Path: /path/to/repo-bug-fix
  Reason: PR merged (#124: Fix critical bug)
  Merged: 2024-01-14
```

### 3. リモート削除ブランチの worktree 削除

`--all` オプションで、リモートで削除されたブランチも対象に含めます。

```bash
wt prune --all
```

**対象:**
- マージ済み PR のブランチ
- リモートで削除されたブランチ（PR がない場合も含む）

## コマンドオプション

### wt add --pr-only

Pull Request があるブランチのみを表示します。

```bash
wt add --pr-only
```

**要件:**
- GitHub CLI がインストールされている
- GitHub CLI で認証済み

**フィルタリング:**
- オープンな PR があるブランチのみ表示
- クローズ/マージ済みの PR は除外

### wt prune (デフォルト: --merged-only)

マージ済み PR の worktree のみを削除します。

```bash
wt prune
# または明示的に
wt prune --merged-only
```

**安全性:**
- マージ済みと確認できた PR のブランチのみ削除
- GitHub CLI が利用できない場合は、誤削除を防ぐため処理を中止

### wt prune --all

リモートで削除されたすべてのブランチの worktree を削除します。

```bash
wt prune --all
```

**対象:**
- マージ済み PR のブランチ
- リモートで削除されたブランチ（PR の有無に関わらず）

**注意:** PR なしで削除されたブランチも含まれます。

### wt prune --dry-run

削除対象を表示するのみで、実際には削除しません。

```bash
wt prune --dry-run
wt prune --all --dry-run
```

### wt prune --force

確認プロンプトをスキップして即座に削除します。

```bash
wt prune --force
```

## GitHub CLI の動作

### PR 情報の取得

**コマンド:**
```bash
gh pr list --state all --json number,title,headRefName,state,mergedAt --limit 200
```

**取得される情報:**
- `number` - PR 番号
- `title` - PR タイトル
- `headRefName` - ブランチ名
- `state` - PR の状態（OPEN, CLOSED, MERGED）
- `mergedAt` - マージ日時（マージ済みの場合）

### マージ済み PR の取得

**コマンド:**
```bash
gh pr list --state merged --json number,title,headRefName,state,mergedAt --limit 100
```

## エラーハンドリング

### GitHub CLI がインストールされていない場合

```
Error: GitHub CLI (gh) is not installed. Please install it from https://cli.github.com/
```

**解決策:**
GitHub CLI をインストールしてください。

### GitHub CLI で認証していない場合

```
Error: GitHub CLI is not authenticated. Please run: gh auth login
```

**解決策:**
```bash
gh auth login
```

### GitHub CLI が利用できない状態で prune を実行

```
Cannot verify merged PRs. Skipping prune to avoid removing active branches.
Hint: use --all to include branches deleted on remote regardless of PR status.
```

**説明:**
- デフォルトの `wt prune` はマージ済み PR を確認する必要があります
- GitHub CLI が利用できない場合、誤削除を防ぐため処理を中止します

**代替案:**
1. GitHub CLI をセットアップする
2. `--all` オプションを使用（リモート削除ブランチも対象）

## 内部実装

### GitHubCLI クラス (src/utils/github-cli.ts)

GitHub CLI との連携を担当します。

**主要メソッド:**

#### isAvailable()
GitHub CLI がインストールされているか確認します。

```typescript
public static async isAvailable(): Promise<boolean>
```

#### isAuthenticated()
GitHub CLI で認証済みか確認します。

```typescript
public static async isAuthenticated(): Promise<boolean>
```

#### checkRequirements()
GitHub CLI の利用可能性と認証状態を確認します。

```typescript
public static async checkRequirements(): Promise<{
  available: boolean;
  authenticated: boolean;
  error?: string;
}>
```

#### fetchMergedPullRequests()
マージ済み PR の一覧を取得します。

```typescript
public static async fetchMergedPullRequests(
  repoPath: string
): Promise<GitHubPRInfo[]>
```

#### getPullRequestForBranch()
特定のブランチに対応する PR を検索します。

```typescript
public static async getPullRequestForBranch(
  branchName: string,
  prs: GitHubPRInfo[]
): Promise<GitHubPRInfo | null>
```

## パフォーマンス考慮事項

### PR 情報の取得

- **キャッシング:** 現在はキャッシュなし
- **並列処理:** ブランチごとの PR 情報取得は `Promise.all()` で並列化

### API レート制限

GitHub CLI は GitHub API のレート制限に従います:

- **認証済み:** 5,000 リクエスト/時間
- **未認証:** 60 リクエスト/時間

`wt` の使用では通常レート制限に達することはありませんが、大量のブランチがある場合は注意が必要です。

## ベストプラクティス

### 1. --pr-only を活用する

PR があるブランチのみ作業する場合:

```bash
wt add --pr-only
```

不要なブランチが除外され、選択が容易になります。

### 2. 定期的な worktree クリーンアップ

マージ済み PR の worktree を定期的に削除:

```bash
# 週に一度実行
wt prune

# または dry-run で確認してから削除
wt prune --dry-run
wt prune
```

### 3. 安全性優先の削除

未確認の削除を避けるため、デフォルトの `--merged-only` を使用:

```bash
# 安全（マージ済み PR のみ）
wt prune

# 危険（すべての削除ブランチ）
wt prune --all
```

## トラブルシューティング

### PR 情報が表示されない

**原因:**
- GitHub CLI が認証されていない
- リポジトリが GitHub でホストされていない
- PR が存在しない

**確認:**
```bash
gh auth status
gh pr list
```

### prune で削除されない

**原因:**
- PR がまだマージされていない
- ブランチがリモートに存在する（`--merged-only` の場合）

**確認:**
```bash
# PR の状態を確認
gh pr view <branch-name>

# リモートブランチの存在確認
git ls-remote --heads origin <branch-name>
```

## 制限事項

### 1. GitHub 限定

GitHub CLI を使用するため、GitHub でホストされているリポジトリのみサポートします。

**非対応:**
- GitLab
- Bitbucket
- 自己ホスト Git サーバー

### 2. PR 取得上限

- マージ済み PR: 100 件
- すべての PR: 200 件

大規模プロジェクトでは一部の PR が取得されない可能性があります。

### 3. ネットワーク依存

PR 情報の取得には GitHub API へのアクセスが必要です。オフラインでは動作しません。

## 将来的な改善案

- [ ] PR 情報のローカルキャッシュ
- [ ] GitLab/Bitbucket サポート
- [ ] カスタム PR 取得上限設定
- [ ] PR ステータスのリアルタイム更新
