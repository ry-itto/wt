import { basename, join } from 'path';
import { GitUtils } from '../utils/git.js';
import { HookManager } from '../utils/hooks.js';
import { InteractiveSelector } from '../utils/interactive.js';
import { WtOptions } from '../types.js';
import chalk from 'chalk';

export class WorktreeManager {
  constructor(private options: WtOptions = {}) {}
  
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
  
  async addWorktree(branch: string, path?: string): Promise<void> {
    if (!branch) {
      console.error(chalk.red('Error: Branch name is required'));
      console.log('Usage: wt add <branch> [path]');
      process.exit(1);
    }
    
    const repo = GitUtils.getCurrentRepo();
    if (!repo) {
      console.error(chalk.red('Error: Not in a git repository'));
      process.exit(1);
    }
    
    console.log(chalk.blue(`Using current repository: ${repo.path}`));
    
    // Determine worktree path
    let worktreePath: string;
    if (path) {
      worktreePath = path;
    } else {
      const repoName = basename(repo.path);
      if (this.options.worktreeDir) {
        worktreePath = join(this.options.worktreeDir, `${repoName}-${branch}`);
      } else {
        worktreePath = `${repo.path}-${branch}`;
      }
    }
    
    console.log(chalk.yellow(`Creating worktree for branch '${branch}' at '${worktreePath}'`));
    
    // Execute pre-hooks
    await HookManager.executePreAddHooks({
      branchName: branch,
      worktreePath,
      repoPath: repo.path
    });
    
    // Create worktree
    const success = await GitUtils.addWorktree(repo.path, branch, worktreePath);
    
    // Execute post-hooks
    await HookManager.executePostAddHooks({
      branchName: branch,
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
    
    const confirmed = await InteractiveSelector.confirmAction(`Remove worktree: ${selectedPath}?`);
    if (!confirmed) {
      console.log(chalk.yellow('Cancelled'));
      return;
    }
    
    console.log(chalk.yellow(`Removing worktree: ${selectedPath}`));
    const success = await GitUtils.removeWorktree(repo.path, selectedPath);
    
    if (success) {
      console.log(chalk.green('✅ Worktree removed successfully!'));
    } else {
      console.error(chalk.red('❌ Failed to remove worktree'));
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
      // For shell integration, output the cd command
      console.log(`cd '${selectedPath}'`);
    }
  }
  
  async defaultAction(): Promise<void> {
    const selectedPath = await this.selectWorktree('cd');
    if (selectedPath) {
      // Output path for shell wrapper
      console.log(selectedPath);
    }
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