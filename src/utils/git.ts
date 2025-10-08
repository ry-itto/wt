import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import { WorktreeInfo, GitRepository, BranchInfo, BranchType } from '../types.js';
import { GitHubUtils } from './github.js';

/**
 * Git 操作のユーティリティクラス
 */
export class GitUtils {
  /**
   * 現在のディレクトリが属する Git リポジトリの情報を取得
   * ghq ディレクトリ構造（~/ghq/github.com/owner/repo）を前提とする
   * @returns リポジトリ情報、または Git リポジトリ内でない場合は null
   */
  static getCurrentRepo(): GitRepository | null {
    try {
      const currentDir = process.cwd();
      const ghqRoot = join(process.env.HOME!, 'ghq', 'github.com');
      
      if (!currentDir.startsWith(ghqRoot)) {
        return null;
      }
      
      const relativePath = currentDir.replace(ghqRoot + '/', '');
      const pathParts = relativePath.split('/');
      const repoPath = join(ghqRoot, pathParts[0], pathParts[1]);
      
      if (!existsSync(join(repoPath, '.git'))) {
        return null;
      }
      
      return {
        path: repoPath,
        name: basename(repoPath)
      };
    } catch {
      return null;
    }
  }
  
  /**
   * リポジトリ内のすべての worktree を一覧取得
   * @param repoPath - リポジトリのパス
   * @returns worktree 情報の配列
   */
  static listWorktrees(repoPath: string): WorktreeInfo[] {
    try {
      const output = execSync('git worktree list --porcelain', {
        cwd: repoPath,
        encoding: 'utf8'
      });
      
      const worktrees: WorktreeInfo[] = [];
      const entries = output.trim().split('\n\n');
      
      for (const entry of entries) {
        const lines = entry.split('\n');
        const worktreeLine = lines.find(line => line.startsWith('worktree '));
        const branchLine = lines.find(line => line.startsWith('branch '));
        const headLine = lines.find(line => line.startsWith('HEAD '));
        
        if (worktreeLine) {
          const path = worktreeLine.replace('worktree ', '');
          const branch = branchLine ? branchLine.replace('branch refs/heads/', '') : 'detached';
          const commit = headLine ? headLine.replace('HEAD ', '') : '';
          const isMain = lines.includes('bare') || path === repoPath;
          
          worktrees.push({ path, branch, commit, isMain });
        }
      }
      
      return worktrees;
    } catch {
      return [];
    }
  }
  
  /**
   * 新しい worktree を作成
   * ローカルブランチ、リモートブランチ、新規ブランチに対応
   * @param repoPath - リポジトリのパス
   * @param branch - ブランチ名
   * @param worktreePath - worktree を作成するパス
   * @returns 成功した場合は true
   */
  static async addWorktree(repoPath: string, branch: string, worktreePath: string): Promise<boolean> {
    try {
      // If the target branch is currently checked out in the main worktree,
      // temporarily switch to a safe base branch (e.g., main) to allow creating
      // a new worktree for that branch. Git disallows checking out the same
      // branch in multiple worktrees simultaneously.
      let switchedBranch = false;
      let previousBranch = '';
      try {
        previousBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: repoPath, encoding: 'utf8' }).trim();
        if (previousBranch === branch) {
          // Prefer 'main', fall back to 'master' if needed
          const hasMain = this.branchExists(repoPath, 'main', 'local');
          const hasMaster = this.branchExists(repoPath, 'master', 'local');
          const targetBase = hasMain ? 'main' : (hasMaster ? 'master' : '');
          if (targetBase) {
            execSync(`git checkout ${targetBase} --quiet`, { cwd: repoPath });
            switchedBranch = true;
          }
        }
      } catch {
        // ignore
      }

      // Check if branch exists locally
      const localBranchExists = this.branchExists(repoPath, branch, 'local');
      // Check if branch exists remotely
      const remoteBranchExists = this.branchExists(repoPath, branch, 'remote');
      
      let command: string[];
      
      if (localBranchExists) {
        command = ['git', 'worktree', 'add', worktreePath, branch];
      } else if (remoteBranchExists) {
        command = ['git', 'worktree', 'add', worktreePath, '-b', branch, `origin/${branch}`];
      } else {
        command = ['git', 'worktree', 'add', worktreePath, '-b', branch];
      }
      
      const result = await this.executeCommand(command, repoPath);

      // Restore previous branch if we switched away
      if (switchedBranch) {
        try {
          execSync(`git checkout ${previousBranch} --quiet`, { cwd: repoPath });
        } catch {
          // ignore
        }
      }

      return result.success;
    } catch {
      return false;
    }
  }
  
  /**
   * worktree の状態をチェック
   * @param worktreePath - worktree のパス
   * @returns isDirty（未コミット変更あり）、isLocked（ロック状態）、error（エラーメッセージ）
   */
  static async checkWorktreeStatus(worktreePath: string): Promise<{ isDirty: boolean; isLocked: boolean; error?: string }> {
    try {
      // Check if worktree directory exists
      if (!existsSync(worktreePath)) {
        return { isDirty: false, isLocked: false, error: 'Worktree directory does not exist' };
      }

      // Check for uncommitted changes (dirty status)
      try {
        const statusResult = await this.executeCommand(['git', 'status', '--porcelain'], worktreePath);
        const isDirty = statusResult.success && statusResult.output.trim().length > 0;
        
        // Check if worktree is locked
        const lockFile = join(worktreePath, '.git', 'worktree.lock');
        const isLocked = existsSync(lockFile);
        
        return { isDirty, isLocked };
      } catch (error) {
        return { isDirty: false, isLocked: false, error: `Failed to check status: ${error}` };
      }
    } catch (error) {
      return { isDirty: false, isLocked: false, error: `Failed to access worktree: ${error}` };
    }
  }

  /**
   * worktree を削除
   * @param repoPath - リポジトリのパス
   * @param worktreePath - 削除する worktree のパス
   * @param force - 強制削除フラグ（未コミット変更やロック状態を無視）
   * @returns success（成功フラグ）、error（エラーメッセージ）
   */
  static async removeWorktree(repoPath: string, worktreePath: string, force: boolean = false): Promise<{ success: boolean; error?: string }> {
    try {
      const command = force 
        ? ['git', 'worktree', 'remove', '--force', worktreePath]
        : ['git', 'worktree', 'remove', worktreePath];
      
      const result = await this.executeCommand(command, repoPath);
      
      if (!result.success) {
        // Provide more specific error information
        let errorMessage = result.output;
        if (result.output.includes('uncommitted changes')) {
          errorMessage = 'Worktree has uncommitted changes. Use force removal to proceed.';
        } else if (result.output.includes('locked')) {
          errorMessage = 'Worktree is locked. Use force removal to proceed.';
        } else if (result.output.includes('is the current working directory')) {
          errorMessage = 'Cannot remove worktree that is the current working directory.';
        }
        return { success: false, error: errorMessage };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to remove worktree: ${error}` };
    }
  }
  
  /**
   * リポジトリ内のブランチ一覧を取得（ローカル & リモート）
   * @param repoPath - リポジトリのパス
   * @param prOnly - PR があるブランチのみを返すか
   * @returns ブランチ情報の配列
   */
  static async listBranches(repoPath: string, prOnly: boolean = false): Promise<BranchInfo[]> {
    try {
      const branches: BranchInfo[] = [];
      const worktrees = this.listWorktrees(repoPath);
      const usedBranches = new Map<string, string>();
      
      // Map worktree usage
      worktrees.forEach(wt => {
        usedBranches.set(wt.branch, wt.path);
      });
      
      // Get local branches
      const localOutput = execSync('git branch --format="%(refname:short)"', {
        cwd: repoPath,
        encoding: 'utf8'
      });
      
      const localBranches = localOutput.trim().split('\n').filter(line => line.trim());
      for (const branch of localBranches) {
        const cleanBranch = branch.trim();
        if (cleanBranch) {
          branches.push({
            name: cleanBranch,
            type: BranchType.Local,
            inUse: usedBranches.has(cleanBranch),
            worktreePath: usedBranches.get(cleanBranch),
            isRemote: false
          });
        }
      }
      
      // Get remote branches
      try {
        const remoteOutput = execSync('git branch -r --format="%(refname:short)"', {
          cwd: repoPath,
          encoding: 'utf8'
        });
        
        const remoteBranches = remoteOutput.trim().split('\n').filter(line => line.trim());
        for (const remoteBranch of remoteBranches) {
          const cleanBranch = remoteBranch.trim();
          if (cleanBranch && !cleanBranch.includes('HEAD')) {
            const parts = cleanBranch.split('/');
            const remoteName = parts[0];
            const branchName = parts.slice(1).join('/');
            
            // Skip if we already have this branch locally
            const hasLocal = branches.some(b => b.name === branchName && b.type === BranchType.Local);
            if (!hasLocal) {
              branches.push({
                name: branchName,
                type: BranchType.Remote,
                inUse: usedBranches.has(branchName),
                worktreePath: usedBranches.get(branchName),
                isRemote: true,
                remoteName
              });
            }
          }
        }
      } catch {
        // Remote branches might not exist, ignore error
      }
      
      // Fetch PR information if requested or if we need to filter by PR
      if (prOnly || process.env.WT_ALWAYS_SHOW_PR) {
        const token = GitHubUtils.getGitHubToken();
        const prPromises = branches.map(async (branch) => {
          const prInfo = await GitHubUtils.getBranchPullRequestInfo(branch.name, repoPath, token);
          return {
            ...branch,
            hasPullRequest: prInfo.hasPullRequest,
            prNumber: prInfo.prNumber,
            prTitle: prInfo.prTitle
          };
        });
        
        const branchesWithPR = await Promise.all(prPromises);
        
        // Filter by PR if requested
        const filteredBranches = prOnly 
          ? branchesWithPR.filter(branch => branch.hasPullRequest)
          : branchesWithPR;
        
        return filteredBranches.sort((a, b) => {
          // Sort by: local first, then by name
          if (a.type !== b.type) {
            return a.type === BranchType.Local ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
      }
      
      return branches.sort((a, b) => {
        // Sort by: local first, then by name
        if (a.type !== b.type) {
          return a.type === BranchType.Local ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch {
      return [];
    }
  }
  
  /**
   * ブランチが存在するかチェック
   * @param repoPath - リポジトリのパス
   * @param branch - ブランチ名
   * @param type - ブランチのタイプ（local または remote）
   * @returns ブランチが存在する場合は true
   */
  static branchExists(repoPath: string, branch: string, type: 'local' | 'remote'): boolean {
    try {
      const ref = type === 'local' ? `refs/heads/${branch}` : `refs/remotes/origin/${branch}`;
      execSync(`git show-ref --verify --quiet ${ref}`, { cwd: repoPath });
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * worktree に未コミット変更があるかチェック
   * @param worktreePath - worktree のパス
   * @returns 未コミット変更がある場合は true
   */
  static hasUncommittedChanges(worktreePath: string): boolean {
    try {
      // Check if there are any uncommitted changes (staged or unstaged)
      const status = execSync('git status --porcelain', {
        cwd: worktreePath,
        encoding: 'utf8'
      });
      return status.trim().length > 0;
    } catch {
      // If git status fails, assume there might be changes to be safe
      return true;
    }
  }
  
  /**
   * リモートの情報を取得（削除されたブランチの参照も更新）
   * @param repoPath - リポジトリのパス
   * @returns 成功した場合は true
   */
  static async fetchRemote(repoPath: string): Promise<boolean> {
    try {
      // Fetch remote refs without downloading objects (prune deleted branches)
      const result = await this.executeCommand(['git', 'fetch', '--prune'], repoPath);
      return result.success;
    } catch {
      return false;
    }
  }
  
  /**
   * Git コマンドを実行
   * @param command - コマンドと引数の配列
   * @param cwd - 作業ディレクトリ
   * @returns success（成功フラグ）、output（標準出力と標準エラー出力）
   */
  private static async executeCommand(command: string[], cwd: string): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      const child = spawn(command[0], command.slice(1), { cwd, stdio: 'pipe' });
      let output = '';
      
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({ success: code === 0, output });
      });
    });
  }
}
