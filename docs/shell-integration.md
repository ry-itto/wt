# シェル統合

## 概要

`wt` のシェル統合機能により、worktree 選択後に自動的にディレクトリ移動が可能になります。この機能は [git-workers](https://github.com/wasabeef/git-workers) からインスピレーションを得た堅牢なメカニズムを採用しています。

## セットアップ

### 自動セットアップ（推奨）

シェル起動時に自動的に統合関数を読み込む方法:

```bash
# .zshrc に追加
eval "$(wt shell-init)"
```

### 手動セットアップ

統合関数をファイルに保存して永続化する方法:

```bash
# 統合関数を生成
wt shell-init > ~/.wt-integration.zsh

# .zshrc に読み込み設定を追加
echo "source ~/.wt-integration.zsh" >> ~/.zshrc

# 設定を反映
source ~/.zshrc
```

### 静的ファイルの使用

リポジトリに含まれる静的ファイルを使用する方法:

```bash
# リポジトリの wt.zsh をダウンロード
curl -o ~/.wt.zsh https://raw.githubusercontent.com/ry-itto/wt/main/wt.zsh

# .zshrc に追加
echo "source ~/.wt.zsh" >> ~/.zshrc
source ~/.zshrc
```

## 動作原理

### ディレクトリ変更メカニズム

`wt` は2段階のフォールバックメカニズムでディレクトリ変更を実現しています。

#### 1. 環境変数メソッド（推奨）

**仕組み:**
1. シェル関数が一時ファイルパスを作成（`/tmp/wt_switch_$$`）
2. `WT_SWITCH_FILE` 環境変数に一時ファイルパスを設定
3. CLI を実行
4. CLI が一時ファイルにターゲットディレクトリを書き込み
5. シェル関数が一時ファイルを読み取って `cd` を実行
6. 一時ファイルを削除

**利点:**
- 確実な動作
- 出力の汚染がない
- エラーハンドリングが容易

**実装（シェル側）:**
```bash
wt() {
  local switch_file="/tmp/wt_switch_$$"
  local output=$(WT_SWITCH_FILE="$switch_file" wt)

  if [[ -f "$switch_file" ]]; then
    local new_dir=$(cat "$switch_file" 2>/dev/null)
    rm -f "$switch_file"
    if [[ -n "$new_dir" && -d "$new_dir" ]]; then
      cd "$new_dir"
    fi
  fi
}
```

**実装（CLI 側）:**
```typescript
private writeCdPath(path: string): void {
  const switchFile = process.env.WT_SWITCH_FILE;
  if (switchFile) {
    writeFileSync(switchFile, path);
  }
}
```

#### 2. stdout マーカーメソッド（フォールバック）

環境変数が利用できない場合の代替手段。

**仕組み:**
1. CLI が `WT_CD:<path>` 形式で stdout に出力
2. シェル関数が正規表現でパスを抽出
3. `cd` を実行

**実装（シェル側）:**
```bash
elif [[ "$output" =~ WT_CD:(.+) ]]; then
  local new_dir="${BASH_REMATCH[1]}"
  if [[ -n "$new_dir" && -d "$new_dir" ]]; then
    cd "$new_dir"
  fi
fi
```

**実装（CLI 側）:**
```typescript
private writeCdPath(path: string): void {
  const switchFile = process.env.WT_SWITCH_FILE;
  if (switchFile) {
    writeFileSync(switchFile, path);
  } else {
    console.log(`WT_CD:${path}`);  // フォールバック
  }
}
```

### 統合関数の全体像

生成されるシェル関数は以下のような構造になっています:

```bash
wt() {
  # 一時ファイルを作成
  local switch_file="/tmp/wt_switch_$$"

  if [ $# -eq 0 ]; then
    # デフォルトアクション: worktree 選択 & cd
    local output=$(WT_SWITCH_FILE="$switch_file" command wt)
    local exit_code=$?

    # ディレクトリ変更のチェック
    if [[ -f "$switch_file" ]]; then
      # 環境変数メソッド
      local new_dir=$(cat "$switch_file" 2>/dev/null)
      rm -f "$switch_file"
      if [[ -n "$new_dir" && -d "$new_dir" ]]; then
        cd "$new_dir"
      fi
    elif [[ "$output" =~ WT_CD:(.+) ]]; then
      # フォールバックメソッド
      local new_dir="${BASH_REMATCH[1]}"
      if [[ -n "$new_dir" && -d "$new_dir" ]]; then
        cd "$new_dir"
      fi
    else
      # ディレクトリ変更なし: 出力を表示
      echo "$output"
    fi

    return $exit_code

  elif [ "$1" = "cd" ]; then
    # 明示的な cd コマンド
    local output=$(WT_SWITCH_FILE="$switch_file" command wt cd)
    # ... 同様の処理

  else
    # その他のコマンド: 直接実行
    command wt "$@"
  fi
}
```

## 環境変数

### WT_CLI_PATH

CLI の実行パスをカスタマイズします。主にローカル開発用です。

```bash
export WT_CLI_PATH=/path/to/wt/dist/index.js
```

**自動検出:**
- グローバルインストール: `wt` コマンドを直接使用
- ローカル開発: `$HOME/.zsh/bin/wt/dist/index.js`

**統合関数での使用:**
```bash
# グローバルインストールの場合
command wt "$@"

# ローカル開発の場合
node "$WT_CLI_PATH" "$@"
```

### WT_SWITCH_FILE

ディレクトリ変更用の一時ファイルパス（内部使用）。

通常、手動で設定する必要はありません。シェル関数が自動的に設定します。

**形式:**
```
/tmp/wt_switch_<プロセスID>
```

## トラブルシューティング

### ディレクトリ変更が動作しない

**症状:**
worktree を選択してもディレクトリが変更されない。

**原因:**
- シェル統合がロードされていない
- 統合関数が古い

**解決策:**
```bash
# 統合関数を再生成
wt shell-init > ~/.wt-integration.zsh

# シェルを再起動
source ~/.zshrc

# または
eval "$(wt shell-init)"
```

### 一時ファイルが残る

**症状:**
`/tmp` に `wt_switch_*` ファイルが残る。

**原因:**
- CLI が異常終了した
- シェル関数が正しく動作しなかった

**解決策:**
```bash
# 一時ファイルを手動で削除
rm -f /tmp/wt_switch_*
```

**自動クリーンアップ:**
統合関数は一時ファイルを自動的にクリーンアップします:
```bash
rm -f "$switch_file"
```

### 出力が二重に表示される

**症状:**
コマンドの出力が2回表示される。

**原因:**
統合関数の問題で、`echo "$output"` が不適切に実行されている。

**解決策:**
最新の統合関数を再生成してください:
```bash
eval "$(wt shell-init)"
```

## カスタマイズ

### カスタムプロンプトの追加

worktree 選択後にカスタム処理を追加する例:

```bash
wt() {
  # オリジナルの統合関数（wt shell-init で生成）
  # ...

  # カスタム処理を追加
  if [[ -f "$switch_file" ]]; then
    local new_dir=$(cat "$switch_file" 2>/dev/null)
    rm -f "$switch_file"
    if [[ -n "$new_dir" && -d "$new_dir" ]]; then
      cd "$new_dir"

      # カスタム処理
      echo "Switched to: $(basename $new_dir)"
      git status -s
    fi
  fi
}
```

### エイリアスの設定

よく使うコマンドにエイリアスを設定:

```bash
alias w='wt'
alias wa='wt add'
alias wr='wt remove'
alias wl='wt list'
alias wp='wt prune'
```

## 互換性

### サポートされているシェル

現在、**zsh** のみをサポートしています。

**将来的なサポート予定:**
- bash
- fish

### グローバル vs ローカルインストール

統合関数は両方のインストール方法に対応しています:

**グローバルインストール:**
```bash
npm install --global @ry-itto/wt
```

シェル関数は `wt` コマンドを直接使用:
```bash
command wt "$@"
```

**ローカル開発:**
```bash
git clone <repo>
npm install && npm run build
```

`WT_CLI_PATH` 環境変数または自動検出でパスを解決:
```bash
node "$WT_CLI_PATH" "$@"
```

## 高度な使い方

### 複数のシェルでの使用

異なるシェルで異なる設定を使う:

```bash
# .zshrc
if [[ -n $ZSH_VERSION ]]; then
  eval "$(wt shell-init)"
fi

# .bashrc (将来的にサポート予定)
# if [[ -n $BASH_VERSION ]]; then
#   eval "$(wt shell-init)"
# fi
```

### プラグインマネージャーとの統合

zplug などのプラグインマネージャーで管理:

```bash
# .zshrc
zplug "ry-itto/wt", from:github, use:"wt.zsh"
```

## 参考

- [git-workers](https://github.com/wasabeef/git-workers) - ディレクトリ変更メカニズムのインスピレーション元
