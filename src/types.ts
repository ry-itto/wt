export interface WorktreeInfo {
  path: string;
  branch: string;
  commit: string;
  isMain: boolean;
}

export interface BranchInfo {
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

export enum BranchType {
  Local = 'local',
  Remote = 'remote'
}

export interface HookContext {
  branchName: string;
  worktreePath: string;
  repoPath: string;
  success?: boolean;
}

export type HookType = 'pre-add' | 'post-add';

export interface GitRepository {
  path: string;
  name: string;
}

export interface WtOptions {
  worktreeDir?: string;
  prOnly?: boolean;
}