# Requirements Document

## Introduction
wtコマンドを使用してworktreeへのディレクトリ変更を行う際、cd操作が失敗した場合でもユーザーに明確なフィードバックが提供されず、問題の認識が遅れる可能性があります。本機能は、cd操作の失敗を検出し、ユーザーに適切な警告メッセージを表示することで、ディレクトリ移動の問題を迅速に把握できるようにします。

この機能により、以下の価値を提供します：
- cd失敗の即座の検出と通知
- トラブルシューティングの効率化
- ユーザーエクスペリエンスの向上

## Requirements

### Requirement 1: cd失敗の検出と警告表示
**Objective:** ユーザーとして、wtコマンドでworktreeへのcd操作が失敗した際に、即座に警告メッセージを確認したい。これにより、ディレクトリ移動の失敗に気づき、問題の原因を迅速に把握できる。

#### Acceptance Criteria

1. WHEN ユーザーがwtコマンドでworktreeを選択し、cd操作が失敗した THEN wtシステム SHALL エラー状態を検出する
2. WHEN cd操作の失敗が検出された THEN wtシステム SHALL 標準エラー出力に警告メッセージを表示する
3. WHERE 警告メッセージ表示時 THE wtシステム SHALL 失敗したディレクトリパスを含める
4. WHERE 警告メッセージ表示時 THE wtシステム SHALL 赤色（chalk.red）でメッセージをハイライトする

### Requirement 2: cd失敗の原因情報提供
**Objective:** ユーザーとして、cd操作が失敗した理由を理解したい。これにより、問題を自己解決できる。

#### Acceptance Criteria

1. WHEN cd失敗が検出された AND ディレクトリが存在しない THEN wtシステム SHALL 「ディレクトリが存在しません」という情報を含める
2. WHEN cd失敗が検出された AND アクセス権限がない THEN wtシステム SHALL 「アクセス権限がありません」という情報を含める
3. WHEN cd失敗が検出された AND 原因が不明 THEN wtシステム SHALL 一般的なエラーメッセージを表示する

### Requirement 3: シェル統合の両方のメソッドでのサポート
**Objective:** システム管理者として、環境変数メソッドとstdoutマーカーメソッドの両方でcd失敗検出が機能することを確認したい。これにより、すべてのシェル統合方式でユーザーに一貫した体験を提供できる。

#### Acceptance Criteria

1. WHERE 環境変数メソッド（WT_SWITCH_FILE）使用時 THE wtシステム SHALL ファイル書き込み失敗を検出する
2. WHEN WT_SWITCH_FILEへの書き込みが失敗した THEN wtシステム SHALL 警告メッセージを表示する
3. WHERE stdoutマーカーメソッド使用時 THE wtシステム SHALL シェル側のcd失敗を想定したエラーハンドリングガイダンスを提供する
4. WHERE シェル統合スクリプト内 THE シェル関数 SHALL cd失敗時に警告メッセージを表示する

### Requirement 4: 操作の継続性
**Objective:** ユーザーとして、cd操作が失敗しても、wtコマンドが適切に終了し、次の操作を実行できるようにしたい。

#### Acceptance Criteria

1. WHEN cd操作が失敗した THEN wtシステム SHALL 非ゼロの終了コードで終了する
2. WHEN cd失敗後にwtコマンドが終了した THEN ユーザー SHALL 元のディレクトリに留まる
3. WHEN cd失敗後 THEN wtシステム SHALL プロセスをクラッシュさせない

### Requirement 5: ロギングとデバッグサポート
**Objective:** 開発者として、cd失敗の詳細情報をログで確認したい。これにより、問題のデバッグと改善が容易になる。

#### Acceptance Criteria

1. WHERE デバッグモード有効時 THE wtシステム SHALL cd失敗の詳細なスタックトレースを出力する
2. WHEN cd失敗が発生した THEN wtシステム SHALL 失敗時のシステム状態（環境変数、ファイル存在確認結果など）をログに記録する
3. WHERE 環境変数WT_DEBUG=true設定時 THE wtシステム SHALL 拡張デバッグ情報を表示する
