/**
 * Git worktree の情報
 */
export interface WorktreeInfo {
  /** worktree のパス */
  path: string;
  /** チェックアウトされているブランチ名 */
  branch: string;
  /** コミットハッシュ */
  commit: string;
  /** メインの worktree かどうか */
  isMain: boolean;
}

/**
 * Git ブランチの情報
 */
export interface BranchInfo {
  /** ブランチ名 */
  name: string;
  /** ブランチのタイプ（ローカル/リモート） */
  type: BranchType;
  /** worktree で使用中かどうか */
  inUse: boolean;
  /** 使用中の worktree のパス（使用中の場合） */
  worktreePath?: string;
  /** リモートブランチかどうか */
  isRemote: boolean;
  /** リモート名（リモートブランチの場合） */
  remoteName?: string;
  /** Pull Request があるかどうか */
  hasPullRequest?: boolean;
  /** Pull Request 番号 */
  prNumber?: number;
  /** Pull Request タイトル */
  prTitle?: string;
}

/**
 * ブランチのタイプ
 */
export enum BranchType {
  /** ローカルブランチ */
  Local = 'local',
  /** リモートブランチ */
  Remote = 'remote'
}

/**
 * フック実行時のコンテキスト情報
 */
export interface HookContext {
  /** ブランチ名 */
  branchName: string;
  /** worktree のパス */
  worktreePath: string;
  /** リポジトリのパス */
  repoPath: string;
  /** 操作が成功したかどうか（post フックでのみ使用） */
  success?: boolean;
}

/**
 * フックのタイプ
 * - pre-add: worktree 作成前
 * - post-add: worktree 作成後
 * - pre-remove: worktree 削除前
 * - post-remove: worktree 削除後
 */
export type HookType = 'pre-add' | 'post-add' | 'pre-remove' | 'post-remove';

/**
 * Git リポジトリの情報
 */
export interface GitRepository {
  /** リポジトリのパス */
  path: string;
  /** リポジトリ名 */
  name: string;
}

/**
 * wt コマンドのオプション
 */
export interface WtOptions {
  /** worktree を作成するベースディレクトリ */
  worktreeDir?: string;
  /** PR があるブランチのみ表示するかどうか */
  prOnly?: boolean;
}

/**
 * prune コマンドのオプション
 */
export interface PruneOptions {
  /** dry-run モード（削除せず表示のみ） */
  dryRun?: boolean;
  /** 確認プロンプトをスキップ */
  force?: boolean;
  /** マージ済み PR のみを対象とするか（デフォルト: true） */
  mergedOnly?: boolean;
  /** すべての削除ブランチを対象とするか */
  all?: boolean;
}

/**
 * 削除対象の worktree 情報
 */
export interface PrunableWorktree {
  /** worktree 情報 */
  worktree: WorktreeInfo;
  /** 削除理由 */
  reason: 'merged-pr' | 'deleted-branch';
  /** Pull Request 番号（理由が merged-pr の場合） */
  prNumber?: number;
  /** Pull Request タイトル（理由が merged-pr の場合） */
  prTitle?: string;
  /** マージ日時（理由が merged-pr の場合） */
  mergedAt?: string;
  /** 未コミット変更があるかどうか */
  hasUncommittedChanges: boolean;
}