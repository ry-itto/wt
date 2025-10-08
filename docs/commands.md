# コマンドリファレンス

## 概要

`wt` は Git worktree を効率的に管理するための CLI ツールです。fzf によるインタラクティブ選択と、シェル統合による自動ディレクトリ変更機能を提供します。

## 基本的な使い方

### デフォルトアクション（引数なし）

```bash
wt
```

インタラクティブに worktree を選択し、選択した worktree に自動的にディレクトリ移動します。

**動作:**
1. fzf で worktree を選択
2. 選択した worktree のパスをシェルに通知
3. シェル関数が `cd` を実行

## サブコマンド

### list

現在のリポジトリの worktree 一覧を表示します。

```bash
wt list
```

**出力例:**
```
Worktrees in current repository (/path/to/repo):
/path/to/repo [main (main)]
/path/to/repo-feature-branch [feature-branch]
```

**特徴:**
- メイン worktree は `(main)` と表示
- ブランチ名と worktree パスを表示

---

### add

新しい worktree を作成します。

#### インタラクティブモード

```bash
wt add
```

fzf を使用してブランチを選択し、worktree を作成します。

**動作:**
1. ローカル & リモートブランチの一覧を取得
2. fzf でブランチを選択
3. 選択したブランチで worktree を作成

**ブランチ表示形式:**
```
feature-branch [local]
origin/remote-feature [remote] [PR #123 - Feature Title]
main [local] (in use: /path/to/repo)
```

#### ブランチ指定モード

```bash
wt add <branch-name> [path]
```

**引数:**
- `<branch-name>` - 作成する worktree のブランチ名
- `[path]` - (オプション) worktree を作成するパス

**例:**
```bash
# ブランチ名のみ指定（デフォルトパスに作成）
wt add feature-branch

# パスも指定
wt add feature-branch /tmp/my-worktree
```

**worktree 作成パスの決定:**
1. `[path]` 引数が指定されている場合: そのパスを使用
2. `WT_WORKTREE_DIR` 環境変数が設定されている場合: `$WT_WORKTREE_DIR/<repo>-<branch>`
3. デフォルト: `<repo-path>-<branch>`

#### PR のみ表示モード

```bash
wt add --pr-only
```

オープンな Pull Request があるブランチのみを表示します。

**要件:**
- GitHub CLI (`gh`) がインストールされている
- `gh auth login` で認証済み

---

### remove (rm)

worktree を削除します。

```bash
wt remove
# または
wt rm
```

**動作:**
1. 削除可能な worktree 一覧を表示（メイン worktree を除く）
2. fzf で削除する worktree を選択
3. worktree の状態をチェック
4. 確認プロンプトを表示
5. worktree を削除

**状態チェック:**
- 未コミット変更の検出
- ロック状態の確認

**未コミット変更がある場合:**
```
⚠️  Worktree has uncommitted changes
Force remove worktree anyway? This may result in data loss. (y/N):
```

---

### prune

マージ済み PR や削除されたブランチの worktree を整理します。

```bash
wt prune [オプション]
```

**オプション:**
- `-n, --dry-run` - 削除対象を表示するのみ（実際には削除しない）
- `-f, --force` - 確認プロンプトをスキップ
- `--merged-only` - マージ済み PR のみを対象（デフォルト）
- `--all` - 削除されたリモートブランチも含める

#### デフォルト動作（--merged-only）

```bash
wt prune
```

マージ済み PR の worktree のみを削除対象とします。

**要件:**
- GitHub CLI (`gh`) がインストール & 認証済み

**表示例:**
```
Found 2 worktree(s) to prune:

• feature-123
  Path: /path/to/repo-feature-123
  Reason: PR merged (#123: Add new feature)
  Merged: 2024-01-15
  ⚠️  Has uncommitted changes

• bug-fix
  Path: /path/to/repo-bug-fix
  Reason: PR merged (#124: Fix critical bug)
  Merged: 2024-01-14
```

#### すべての削除ブランチを対象

```bash
wt prune --all
```

リモートで削除されたブランチの worktree も削除対象に含めます。

**対象:**
- マージ済み PR のブランチ
- リモートで削除されたブランチ

#### Dry Run モード

```bash
wt prune --dry-run
```

削除対象を表示するのみで、実際には削除しません。

#### Force モード

```bash
wt prune --force
```

確認プロンプトをスキップして即座に削除します。

**警告:** 未コミット変更がある場合でも強制削除されます。

---

### cd

worktree を選択してディレクトリ移動します。

```bash
wt cd
```

デフォルトアクション (`wt`) と同じ動作です。

---

### shell-init

シェル統合関数を出力します。

```bash
wt shell-init
```

**使い方:**
```bash
# 即座に有効化
eval "$(wt shell-init)"

# .zshrc に保存
wt shell-init > ~/.wt-integration.zsh
echo "source ~/.wt-integration.zsh" >> ~/.zshrc
```

詳細は [シェル統合ドキュメント](./shell-integration.md) を参照してください。

---

## 高度な使い方

### コマンド実行パターン

#### 選択した worktree でコマンドを実行

```bash
wt -- <command>
```

**例:**
```bash
# 選択した worktree でテストを実行
wt -- npm test

# 選択した worktree でビルド
wt -- npm run build
```

**動作:**
1. fzf で worktree を選択
2. 選択した worktree に `cd`
3. 指定したコマンドを実行

#### 選択した worktree をコマンド引数として渡す

```bash
wt <command>
```

**例:**
```bash
# 選択した worktree を VSCode で開く
wt code

# 選択した worktree のパスをコピー
wt echo

# 選択した worktree を tar で圧縮
wt tar czf archive.tar.gz
```

**動作:**
1. fzf で worktree を選択
2. 選択した worktree のパスを最後の引数として `<command>` を実行

**展開例:**
```bash
wt code
# → code /path/to/selected/worktree
```

---

## 環境変数

### WT_CLI_PATH

CLI の実行パスを指定します（主に開発用）。

```bash
export WT_CLI_PATH=/path/to/wt/dist/index.js
```

### WT_WORKTREE_DIR

worktree を作成するベースディレクトリを指定します。

```bash
export WT_WORKTREE_DIR=$HOME/worktrees
```

設定すると、`wt add` で作成される worktree のパスは `$WT_WORKTREE_DIR/<repo>-<branch>` になります。

### WT_SWITCH_FILE

ディレクトリ変更用の一時ファイルパス（シェル統合で内部的に使用）。

通常、手動で設定する必要はありません。

### WT_ALWAYS_SHOW_PR

すべてのブランチ選択時に PR 情報を表示します。

```bash
export WT_ALWAYS_SHOW_PR=1
```

**注意:** GitHub API の呼び出しが増えるため、ブランチ選択が遅くなる可能性があります。

---

## フック

worktree の作成・削除時にカスタムスクリプトを実行できます。

詳細は [フックドキュメント](./hooks.md) を参照してください。

**利用可能なフック:**
- `pre-add` / `post-add`
- `pre-remove` / `post-remove`

**フックの場所:**
- グローバル: `~/.zsh/hooks/wt/`
- リポジトリ固有: `<repo>/.wt/hooks/`

---

## エラーハンドリング

### Git リポジトリでない場合

```
Error: Not in a git repository
```

Git リポジトリ内で実行してください。

### fzf がインストールされていない場合

```
Error: fzf is not installed. Please install fzf to use interactive selection.
```

fzf をインストールしてください:
```bash
# macOS
brew install fzf

# Ubuntu/Debian
sudo apt install fzf
```

### GitHub CLI が利用できない場合（prune, add --pr-only）

```
Error: GitHub CLI (gh) is not installed. Please install it from https://cli.github.com/
```

または

```
Error: GitHub CLI is not authenticated. Please run: gh auth login
```

GitHub CLI をインストール & 認証してください:
```bash
# macOS
brew install gh

# 認証
gh auth login
```

### worktree に未コミット変更がある場合

```
⚠️  Worktree has uncommitted changes
Force remove worktree anyway? This may result in data loss. (y/N):
```

`y` を入力すると強制削除、`N` でキャンセルされます。

---

## 終了ステータス

- `0` - 成功
- `1` - エラー
- `130` - ユーザーキャンセル（Ctrl+C）

---

## Tips

### エイリアス設定

`.zshrc` にエイリアスを設定すると便利です:

```bash
alias w='wt'
alias wa='wt add'
alias wr='wt remove'
alias wp='wt prune'
```

### ghq との統合

`wt` は ghq のディレクトリ構造 (`~/ghq/github.com/owner/repo`) を前提としています。

ghq と組み合わせることで効率的なリポジトリ管理が可能です:

```bash
# リポジトリに移動
cd $(ghq list --full-path | fzf)

# worktree を作成して移動
wt add
```
