# WT Hooks

Git の hooks と同様に、`wt` コマンドに対してカスタムスクリプトを実行できます。

## フックの種類

### Global Hooks (全リポジトリ共通)
- `~/.zsh/hooks/wt/pre-add` - ワークツリー作成前に実行
- `~/.zsh/hooks/wt/post-add` - ワークツリー作成後に実行

### Repository-specific Hooks (リポジトリ固有)
- `<repo>/.wt/hooks/pre-add` - ワークツリー作成前に実行
- `<repo>/.wt/hooks/post-add` - ワークツリー作成後に実行

## セットアップ

1. フックスクリプトを作成:
```bash
# Global hook の場合
cp ~/.zsh/hooks/wt/pre-add.example ~/.zsh/hooks/wt/pre-add
chmod +x ~/.zsh/hooks/wt/pre-add

# Repository-specific hook の場合
mkdir -p /path/to/repo/.wt/hooks
cp ~/.zsh/hooks/wt/post-add.example /path/to/repo/.wt/hooks/post-add
chmod +x /path/to/repo/.wt/hooks/post-add
```

2. フックスクリプトをカスタマイズ

## 引数

### pre-add フック
- `$1`: ブランチ名
- `$2`: ワークツリーパス
- `$3`: リポジトリパス

### post-add フック
- `$1`: ブランチ名
- `$2`: ワークツリーパス
- `$3`: リポジトリパス
- `$4`: 成功フラグ ("true" または "false")

## 使用例

### 依存関係の自動インストール
```bash
#!/bin/zsh
# post-add hook example

if [[ "$4" == "true" && -f "$2/package.json" ]]; then
    echo "Installing dependencies..."
    (cd "$2" && npm install)
fi
```

### ブランチ命名規則の検証
```bash
#!/bin/zsh
# pre-add hook example

if [[ ! "$1" =~ ^(feature|bugfix|hotfix)/.+ ]]; then
    echo "Error: Branch must follow pattern feature/*, bugfix/*, or hotfix/*"
    exit 1
fi
```

### VS Code での自動オープン
```bash
#!/bin/zsh
# post-add hook example

if [[ "$4" == "true" ]] && command -v code &> /dev/null; then
    code "$2"
fi
```

## 実行順序

1. Global pre-add hook
2. Repository-specific pre-add hook
3. ワークツリー作成
4. Global post-add hook
5. Repository-specific post-add hook

フックスクリプトでエラーが発生した場合（終了コード != 0）、処理は継続されますが、エラーメッセージが表示されます。