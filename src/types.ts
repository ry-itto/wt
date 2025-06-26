export interface WorktreeInfo {
  path: string;
  branch: string;
  commit: string;
  isMain: boolean;
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
}