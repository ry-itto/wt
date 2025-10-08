# フックシステム

## 概要

`wt` は Git スタイルのフックシステムを提供し、worktree の作成・削除時にカスタムスクリプトを実行できます。これにより、依存関係のインストール、IDE 設定、通知などの自動化が可能になります。

## フックの種類

### worktree 作成時

- **pre-add** - worktree 作成前に実行
- **post-add** - worktree 作成後に実行

### worktree 削除時

- **pre-remove** - worktree 削除前に実行
- **post-remove** - worktree 削除後に実行

## フックの場所

### グローバルフック

すべてのリポジトリに適用されるフックです。

```
~/.zsh/hooks/wt/
├── pre-add
├── post-add
├── pre-remove
└── post-remove
```

### リポジトリ固有フック

特定のリポジトリのみに適用されるフックです。

```
<リポジトリパス>/.wt/hooks/
├── pre-add
├── post-add
├── pre-remove
└── post-remove
```

**例:**
```
~/ghq/github.com/user/repo/.wt/hooks/
├── post-add
└── post-remove
```

## 実行順序

フックは以下の順序で実行されます:

### worktree 作成時

1. グローバル `pre-add`
2. リポジトリ固有 `pre-add`
3. **worktree 作成**
4. グローバル `post-add`
5. リポジトリ固有 `post-add`

### worktree 削除時

1. グローバル `pre-remove`
2. リポジトリ固有 `pre-remove`
3. **worktree 削除**
4. グローバル `post-remove`
5. リポジトリ固有 `post-remove`

## フックスクリプトの作成

### 基本的な手順

1. **ディレクトリを作成**

```bash
# グローバルフック
mkdir -p ~/.zsh/hooks/wt

# リポジトリ固有フック
mkdir -p /path/to/repo/.wt/hooks
```

2. **フックスクリプトを作成**

```bash
# グローバル post-add フック
cat > ~/.zsh/hooks/wt/post-add << 'EOF'
#!/bin/zsh
# $1: ブランチ名
# $2: worktree パス
# $3: リポジトリパス
# $4: 成功フラグ ("true" or "false")

if [[ "$4" == "true" && -f "$2/package.json" ]]; then
    echo "📦 Installing dependencies..."
    (cd "$2" && npm install)
fi
EOF
```

3. **実行権限を付与**

```bash
chmod +x ~/.zsh/hooks/wt/post-add
```

## フック引数

### pre-add / pre-remove

```bash
$1  # ブランチ名
$2  # worktree パス
$3  # リポジトリパス
```

**例:**
```bash
#!/bin/zsh
echo "Branch: $1"           # feature-branch
echo "Worktree: $2"         # /path/to/repo-feature-branch
echo "Repository: $3"       # /path/to/repo
```

### post-add / post-remove

```bash
$1  # ブランチ名
$2  # worktree パス
$3  # リポジトリパス
$4  # 成功フラグ ("true" or "false")
```

**例:**
```bash
#!/bin/zsh
if [[ "$4" == "true" ]]; then
    echo "✅ Worktree created successfully"
else
    echo "❌ Worktree creation failed"
fi
```

## フックの例

### 依存関係の自動インストール

**post-add**

Node.js プロジェクトの場合:

```bash
#!/bin/zsh
# ~/.zsh/hooks/wt/post-add

if [[ "$4" == "true" && -f "$2/package.json" ]]; then
    echo "📦 Installing npm dependencies..."
    (cd "$2" && npm install --silent)
fi
```

Python プロジェクトの場合:

```bash
#!/bin/zsh
# ~/.zsh/hooks/wt/post-add

if [[ "$4" == "true" && -f "$2/requirements.txt" ]]; then
    echo "🐍 Installing Python dependencies..."
    (cd "$2" && pip install -r requirements.txt)
fi
```

### ブランチ名のバリデーション

**pre-add**

```bash
#!/bin/zsh
# <repo>/.wt/hooks/pre-add

# ブランチ名の規則をチェック
if [[ ! "$1" =~ ^(feature|bugfix|hotfix)/.+ ]]; then
    echo "❌ Error: Branch name must start with feature/, bugfix/, or hotfix/"
    echo "   Current: $1"
    exit 1
fi

echo "✅ Branch name is valid"
```

### IDE の自動起動

**post-add**

VSCode を自動で開く:

```bash
#!/bin/zsh
# ~/.zsh/hooks/wt/post-add

if [[ "$4" == "true" ]]; then
    echo "🚀 Opening VSCode..."
    code "$2"
fi
```

### Git 設定のカスタマイズ

**post-add**

worktree 固有の Git 設定:

```bash
#!/bin/zsh
# <repo>/.wt/hooks/post-add

if [[ "$4" == "true" ]]; then
    echo "⚙️  Configuring Git..."
    (cd "$2" && git config core.hooksPath .githooks)
fi
```

### Slack 通知

**post-add**

```bash
#!/bin/zsh
# ~/.zsh/hooks/wt/post-add

if [[ "$4" == "true" ]]; then
    webhook_url="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    message="New worktree created: $1 at $2"

    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"$message\"}" \
        "$webhook_url" 2>/dev/null
fi
```

### データベースのマイグレーション

**post-add**

```bash
#!/bin/zsh
# <repo>/.wt/hooks/post-add

if [[ "$4" == "true" && -f "$2/migrate.sh" ]]; then
    echo "🗄️  Running database migrations..."
    (cd "$2" && ./migrate.sh)
fi
```

### 環境ファイルのコピー

**post-add**

```bash
#!/bin/zsh
# <repo>/.wt/hooks/post-add

if [[ "$4" == "true" ]]; then
    if [[ -f "$3/.env.example" && ! -f "$2/.env" ]]; then
        echo "📝 Copying .env.example to .env..."
        cp "$3/.env.example" "$2/.env"
    fi
fi
```

### クリーンアップ処理

**pre-remove**

```bash
#!/bin/zsh
# ~/.zsh/hooks/wt/pre-remove

echo "🧹 Cleaning up build artifacts..."
if [[ -d "$2/dist" ]]; then
    rm -rf "$2/dist"
fi

if [[ -d "$2/node_modules" ]]; then
    echo "Removing node_modules..."
    rm -rf "$2/node_modules"
fi
```

### バックアップの作成

**pre-remove**

```bash
#!/bin/zsh
# ~/.zsh/hooks/wt/pre-remove

backup_dir="$HOME/.wt-backups"
timestamp=$(date +%Y%m%d_%H%M%S)
backup_file="$backup_dir/$1_$timestamp.tar.gz"

mkdir -p "$backup_dir"
echo "💾 Creating backup: $backup_file"
tar czf "$backup_file" -C "$(dirname "$2")" "$(basename "$2")"
```

## エラーハンドリング

### フックの失敗

フックが失敗（終了ステータス 0 以外）した場合:

- **pre-add / pre-remove**: 警告が表示されますが、処理は継続されます
- **post-add / post-remove**: 警告が表示されますが、処理は継続されます

**例:**
```
❌ Error executing global hook: Error: Hook script exited with code 1
```

### 実行権限がない場合

フックスクリプトに実行権限がない場合:

```
⚠️  Hook script /path/to/hook is not executable, skipping
```

**解決策:**
```bash
chmod +x /path/to/hook
```

## ベストプラクティス

### 1. 冪等性を保つ

フックは複数回実行されても安全であるべきです。

**悪い例:**
```bash
echo "initialized" >> "$2/.initialized"
```

**良い例:**
```bash
if [[ ! -f "$2/.initialized" ]]; then
    echo "initialized" > "$2/.initialized"
fi
```

### 2. エラーハンドリング

失敗が許容できる場合は、エラーを無視するか適切に処理します。

```bash
# 依存関係のインストールが失敗しても継続
(cd "$2" && npm install) || echo "⚠️  npm install failed, continuing..."
```

### 3. 条件分岐

必要な場合のみ処理を実行します。

```bash
# package.json が存在する場合のみ
if [[ -f "$2/package.json" ]]; then
    # ...
fi

# 成功時のみ
if [[ "$4" == "true" ]]; then
    # ...
fi
```

### 4. 静かな出力

不要な出力を抑制します。

```bash
npm install --silent
git clone --quiet
curl -s https://...
```

### 5. タイムアウト設定

長時間実行される処理にはタイムアウトを設定します。

```bash
# timeout コマンドを使用（GNU coreutils）
timeout 300 npm install || echo "⚠️  npm install timed out"
```

## デバッグ

### フックの実行確認

フックが正しく実行されているか確認:

```bash
#!/bin/zsh
echo "🔗 Hook executed: $(basename "$0")"
echo "  Branch: $1"
echo "  Worktree: $2"
echo "  Repository: $3"
echo "  Success: $4"
```

### ログファイルへの記録

```bash
#!/bin/zsh
log_file="$HOME/.wt-hooks.log"
echo "$(date): post-add $1 $2 $4" >> "$log_file"
```

## セキュリティ考慮事項

### 実行権限のチェック

`wt` はフックスクリプトの実行権限を自動的にチェックします。実行権限がない場合はスキップされます。

### サンドボックス実行

フックは `zsh` シェルで実行されます。`process.env` を継承しますが、独立したプロセスとして実行されます。

### 信頼できるソースのみ

リポジトリ固有フックは、信頼できるリポジトリのみで使用してください。悪意のあるフックスクリプトが実行される可能性があります。

## トラブルシューティング

### フックが実行されない

**確認事項:**
1. フックファイルが正しいパスに配置されているか
2. 実行権限が付与されているか (`chmod +x`)
3. shebang (`#!/bin/zsh`) が正しく記述されているか

### フックでエラーが発生する

**デバッグ方法:**
```bash
# フックを手動で実行してテスト
~/.zsh/hooks/wt/post-add "test-branch" "/tmp/test-worktree" "/tmp/test-repo" "true"
```

## 参考

リポジトリ内のサンプルフック:
- `example/hooks/wt/` - 実用的なフック例
