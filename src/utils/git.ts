import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import { WorktreeInfo, GitRepository, BranchInfo, BranchType } from '../types.js';

export class GitUtils {
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
  
  static async addWorktree(repoPath: string, branch: string, worktreePath: string): Promise<boolean> {
    try {
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
      return result.success;
    } catch {
      return false;
    }
  }
  
  static async removeWorktree(repoPath: string, worktreePath: string): Promise<boolean> {
    try {
      const result = await this.executeCommand(['git', 'worktree', 'remove', worktreePath], repoPath);
      return result.success;
    } catch {
      return false;
    }
  }
  
  static listBranches(repoPath: string): BranchInfo[] {
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
  
  private static branchExists(repoPath: string, branch: string, type: 'local' | 'remote'): boolean {
    try {
      const ref = type === 'local' ? `refs/heads/${branch}` : `refs/remotes/origin/${branch}`;
      execSync(`git show-ref --verify --quiet ${ref}`, { cwd: repoPath });
      return true;
    } catch {
      return false;
    }
  }
  
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