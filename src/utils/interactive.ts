import { spawn } from 'child_process';
import * as readline from 'readline';
import { WorktreeInfo, BranchInfo, BranchType } from '../types.js';
import chalk from 'chalk';

export class InteractiveSelector {
  static async selectWorktree(worktrees: WorktreeInfo[], prompt: string = 'Select worktree: '): Promise<string | null> {
    if (worktrees.length === 0) {
      console.log(chalk.yellow('No worktrees found'));
      return null;
    }
    
    // Prepare worktree list for fzf
    const worktreeList = worktrees.map(wt => {
      const branchInfo = wt.isMain ? chalk.blue(`${wt.branch} (main)`) : wt.branch;
      return `${wt.path} ${chalk.gray(`[${branchInfo}]`)}`;
    }).join('\n');
    
    try {
      const selectedLine = await this.runFzf(worktreeList, prompt);
      if (!selectedLine) {
        return null;
      }
      
      // Extract path from selected line (everything before the first space)
      const path = selectedLine.split(' ')[0];
      return path;
    } catch (error) {
      console.error(chalk.red('Error running fzf:', error));
      return null;
    }
  }
  
  static async selectWorktreeForRemoval(worktrees: WorktreeInfo[]): Promise<string | null> {
    // Filter out main worktree for removal
    const removableWorktrees = worktrees.filter(wt => !wt.isMain);
    
    if (removableWorktrees.length === 0) {
      console.log(chalk.yellow('No removable worktrees found'));
      return null;
    }
    
    return this.selectWorktree(removableWorktrees, 'Select worktree to remove: ');
  }
  
  static async selectBranch(branches: BranchInfo[], prompt: string = 'Select branch: '): Promise<BranchInfo | null> {
    if (branches.length === 0) {
      console.log(chalk.yellow('No branches found'));
      return null;
    }
    
    // Prepare branch list for fzf
    const branchList = branches.map(branch => {
      const typeColor = branch.type === BranchType.Local ? chalk.green : chalk.blue;
      const typeLabel = `[${typeColor(branch.type)}]`;
      
      let usageInfo = '';
      if (branch.inUse && branch.worktreePath) {
        usageInfo = chalk.gray(` (in use: ${branch.worktreePath})`);
      }
      
      const remotePart = branch.remoteName ? chalk.gray(` ${branch.remoteName}/`) : '';
      
      return `${remotePart}${branch.name} ${typeLabel}${usageInfo}`;
    }).join('\n');
    
    try {
      const selectedLine = await this.runFzf(branchList, prompt);
      if (!selectedLine) {
        return null;
      }
      
      // Extract branch name from selected line
      // The branch name is after the remote part (if any) and before the type label
      // eslint-disable-next-line no-control-regex
      const cleanLine = selectedLine.replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI codes
      let branchName: string;
      
      if (cleanLine.includes('/')) {
        // Remote branch: "origin/branch-name [remote]"
        const parts = cleanLine.split(' ');
        const fullName = parts[0];
        branchName = fullName.split('/').slice(1).join('/');
      } else {
        // Local branch: "branch-name [local]"
        branchName = cleanLine.split(' ')[0];
      }
      
      // Find the selected branch in the original list
      const selectedBranch = branches.find(b => b.name === branchName);
      return selectedBranch || null;
      
    } catch (error) {
      console.error(chalk.red('Error running fzf:', error));
      return null;
    }
  }
  
  private static async runFzf(input: string, prompt: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const fzf = spawn('fzf', [
        '--prompt', prompt,
        '--ansi',
        '--height', '~40%',
        '--reverse',
        '--border'
      ], {
        stdio: ['pipe', 'pipe', 'inherit']
      });
      
      let output = '';
      
      fzf.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      fzf.on('close', (code) => {
        if (code === 0) {
          // Remove ANSI color codes from output
          // eslint-disable-next-line no-control-regex
          const cleanOutput = output.trim().replace(/\x1b\[[0-9;]*m/g, '');
          resolve(cleanOutput || null);
        } else if (code === 130) {
          // User cancelled (Ctrl+C)
          resolve(null);
        } else {
          reject(new Error(`fzf exited with code ${code}`));
        }
      });
      
      fzf.on('error', (error) => {
        if (error.message.includes('ENOENT')) {
          reject(new Error('fzf is not installed. Please install fzf to use interactive selection.'));
        } else {
          reject(error);
        }
      });
      
      // Send input to fzf
      fzf.stdin.write(input);
      fzf.stdin.end();
    });
  }
  
  static async confirmAction(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(`${message} (y/N): `, (answer: string) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }
}