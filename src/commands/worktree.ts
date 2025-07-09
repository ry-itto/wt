import { basename, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { GitUtils } from '../utils/git.js';
import { HookManager } from '../utils/hooks.js';
import { InteractiveSelector } from '../utils/interactive.js';
import { WtOptions } from '../types.js';
import chalk from 'chalk';

export class WorktreeManager {
  constructor(private options: WtOptions = {}) {}

  private getWtTmpDir(): string {
    const wtTmpDir = join(tmpdir(), 'wt');
    try {
      mkdirSync(wtTmpDir, { recursive: true });
    } catch {
      // Directory already exists
    }
    return wtTmpDir;
  }

  private writeCdPath(path: string): void {
    // Check for WT_SWITCH_FILE environment variable (like git-workers)
    const switchFile = process.env.WT_SWITCH_FILE;
    
    if (switchFile) {
      // Primary method: write to file specified by shell
      try {
        writeFileSync(switchFile, path);
      } catch (error) {
        console.error(`Warning: Failed to write switch file: ${error}`);
        // Fallback to stdout marker
        console.log(`WT_CD:${path}`);
      }
    } else {
      // Fallback method: stdout marker for parsing by shell
      console.log(`WT_CD:${path}`);
    }
  }
  
  async listWorktrees(): Promise<void> {
    const repo = GitUtils.getCurrentRepo();
    if (!repo) {
      console.error(chalk.red('Error: Not in a git repository'));
      process.exit(1);
    }
    
    console.log(chalk.blue(`Worktrees in current repository (${repo.path}):`));
    const worktrees = GitUtils.listWorktrees(repo.path);
    
    if (worktrees.length === 0) {
      console.log('No worktrees found');
      return;
    }
    
    worktrees.forEach(wt => {
      const branchInfo = wt.isMain ? chalk.blue(`${wt.branch} (main)`) : chalk.green(wt.branch);
      console.log(`${wt.path} ${chalk.gray(`[${branchInfo}]`)}`);
    });
  }
  
  async addWorktree(branch?: string, path?: string, prOnly?: boolean): Promise<void> {
    const repo = GitUtils.getCurrentRepo();
    if (!repo) {
      console.error(chalk.red('Error: Not in a git repository'));
      process.exit(1);
    }

    let selectedBranch: string;
    
    if (!branch) {
      // Interactive branch selection mode
      const branches = await GitUtils.listBranches(repo.path, prOnly);
      if (branches.length === 0) {
        const message = prOnly ? 'No branches with pull requests found' : 'No branches found';
        console.error(chalk.red(message));
        process.exit(1);
      }
      
      console.log(chalk.blue('Select a branch to create worktree:'));
      const selectedBranchInfo = await InteractiveSelector.selectBranch(branches, 'Select branch: ');
      
      if (!selectedBranchInfo) {
        console.error(chalk.red('Error: Branch selection failed'));
        process.exit(1);
      }
      
      // Warn if branch is already in use
      if (selectedBranchInfo.inUse) {
        console.log(chalk.yellow(`⚠️  Branch '${selectedBranchInfo.name}' is already in use at: ${selectedBranchInfo.worktreePath}`));
        const confirmed = await InteractiveSelector.confirmAction('Do you want to create another worktree for this branch?');
        if (!confirmed) {
          console.log(chalk.yellow('Operation cancelled'));
          return;
        }
      }
      
      selectedBranch = selectedBranchInfo.name;
      
      // For remote branches, we'll checkout a local tracking branch
      if (selectedBranchInfo.type === 'remote' && selectedBranchInfo.remoteName) {
        console.log(chalk.blue(`Creating local tracking branch for ${selectedBranchInfo.remoteName}/${selectedBranchInfo.name}`));
      }
    } else {
      selectedBranch = branch;
    }
    
    console.log(chalk.blue(`Using current repository: ${repo.path}`));
    
    // Determine worktree path
    let worktreePath: string;
    if (path) {
      worktreePath = path;
    } else {
      const repoName = basename(repo.path);
      if (this.options.worktreeDir) {
        worktreePath = join(this.options.worktreeDir, `${repoName}-${selectedBranch}`);
      } else {
        worktreePath = `${repo.path}-${selectedBranch}`;
      }
    }
    
    console.log(chalk.yellow(`Creating worktree for branch '${selectedBranch}' at '${worktreePath}'`));
    
    // Execute pre-hooks
    await HookManager.executePreAddHooks({
      branchName: selectedBranch,
      worktreePath,
      repoPath: repo.path
    });
    
    // Create worktree
    const success = await GitUtils.addWorktree(repo.path, selectedBranch, worktreePath);
    
    // Execute post-hooks
    await HookManager.executePostAddHooks({
      branchName: selectedBranch,
      worktreePath,
      repoPath: repo.path,
      success
    });
    
    if (success) {
      console.log(chalk.green('✅ Worktree created successfully!'));
    } else {
      console.error(chalk.red('❌ Failed to create worktree'));
      process.exit(1);
    }
  }
  
  async removeWorktree(): Promise<void> {
    const repo = GitUtils.getCurrentRepo();
    if (!repo) {
      console.error(chalk.red('Error: Not in a git repository'));
      process.exit(1);
    }
    
    const worktrees = GitUtils.listWorktrees(repo.path);
    const selectedPath = await InteractiveSelector.selectWorktreeForRemoval(worktrees);
    
    if (!selectedPath) {
      return;
    }
    
    // Find the branch name for the selected worktree
    const selectedWorktree = worktrees.find(wt => wt.path === selectedPath);
    const branchName = selectedWorktree?.branch || 'unknown';
    
    // Check worktree status before attempting removal
    console.log(chalk.blue('🔍 Checking worktree status...'));
    const status = await GitUtils.checkWorktreeStatus(selectedPath);
    
    if (status.error) {
      console.error(chalk.red(`❌ ${status.error}`));
      process.exit(1);
    }
    
    let forceRemoval = false;
    
    if (status.isDirty || status.isLocked) {
      const issues = [];
      if (status.isDirty) issues.push('uncommitted changes');
      if (status.isLocked) issues.push('locked');
      
      console.log(chalk.yellow(`⚠️  Worktree has ${issues.join(' and ')}`));
      
      const useForce = await InteractiveSelector.confirmAction('Force remove worktree anyway? This may result in data loss.');
      if (!useForce) {
        console.log(chalk.yellow('Cancelled - worktree not removed'));
        return;
      }
      forceRemoval = true;
    }
    
    const confirmed = await InteractiveSelector.confirmAction(`Remove worktree: ${selectedPath}?`);
    if (!confirmed) {
      console.log(chalk.yellow('Cancelled'));
      return;
    }
    
    // Execute pre-remove hooks
    await HookManager.executePreRemoveHooks({
      branchName,
      worktreePath: selectedPath,
      repoPath: repo.path
    });
    
    console.log(chalk.yellow(`Removing worktree: ${selectedPath}`));
    const result = await GitUtils.removeWorktree(repo.path, selectedPath, forceRemoval);
    
    // Execute post-remove hooks
    await HookManager.executePostRemoveHooks({
      branchName,
      worktreePath: selectedPath,
      repoPath: repo.path,
      success: result.success
    });
    
    if (result.success) {
      console.log(chalk.green('✅ Worktree removed successfully!'));
    } else {
      console.error(chalk.red(`❌ Failed to remove worktree: ${result.error}`));
      process.exit(1);
    }
  }
  
  async selectWorktree(purpose: 'cd' | 'command'): Promise<string | null> {
    const repo = GitUtils.getCurrentRepo();
    if (!repo) {
      console.error(chalk.red('Error: Not in a git repository'));
      process.exit(1);
    }
    
    const worktrees = GitUtils.listWorktrees(repo.path);
    const promptMap = {
      cd: 'Select worktree to cd: ',
      command: 'Select worktree: '
    };
    
    return InteractiveSelector.selectWorktree(worktrees, promptMap[purpose]);
  }
  
  async changeDirectory(): Promise<void> {
    const selectedPath = await this.selectWorktree('cd');
    if (selectedPath) {
      this.writeCdPath(selectedPath);
    }
  }
  
  async defaultAction(): Promise<void> {
    const selectedPath = await this.selectWorktree('cd');
    if (selectedPath) {
      this.writeCdPath(selectedPath);
    }
  }

  async selectForShell(): Promise<string | null> {
    return await this.selectWorktree('cd');
  }
  
  async executeInWorktree(command: string[]): Promise<void> {
    const selectedPath = await this.selectWorktree('command');
    if (selectedPath) {
      // Change to the selected directory and execute command
      process.chdir(selectedPath);
      
      const { spawn } = await import('child_process');
      const child = spawn(command[0], command.slice(1), {
        stdio: 'inherit'
      });
      
      child.on('close', (code) => {
        process.exit(code || 0);
      });
    }
  }
  
  async executeWithWorktree(command: string[]): Promise<void> {
    const selectedPath = await this.selectWorktree('command');
    if (selectedPath) {
      const { spawn } = await import('child_process');
      const child = spawn(command[0], [...command.slice(1), selectedPath], {
        stdio: 'inherit'
      });
      
      child.on('close', (code) => {
        process.exit(code || 0);
      });
    }
  }
}