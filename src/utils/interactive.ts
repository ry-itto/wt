import { spawn } from 'child_process';
import * as readline from 'readline';
import { WorktreeInfo, BranchInfo, BranchType } from '../types.js';
import chalk from 'chalk';

function isInteractiveEnvironment(): boolean {
  // Allow interactive selection in unit test environment
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
    return true;
  }
  // For E2E tests or CI environments, check TTY and CI flags
  // If we're in CI or have no TTY, it's not interactive
  if (process.env.CI || !process.stdout.isTTY || !process.stdin.isTTY) {
    return false;
  }
  return true;
}

export class InteractiveSelector {
  static async selectWorktree(worktrees: WorktreeInfo[], prompt: string = 'Select worktree: '): Promise<string | null> {
    if (worktrees.length === 0) {
      console.log(chalk.yellow('No worktrees found'));
      return null;
    }
    
    if (!isInteractiveEnvironment()) {
      console.error(chalk.red('Error: Interactive selection not available in non-interactive environment'));
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
    
    if (!isInteractiveEnvironment()) {
      console.error(chalk.red('Error: Interactive selection not available in non-interactive environment'));
      return null;
    }
    
    // Prepare branch list for fzf with mapping
    const branchDisplayLines: string[] = [];
    const branchMap = new Map<string, BranchInfo>();
    
    branches.forEach((branch, index) => {
      const typeColor = branch.type === BranchType.Local ? chalk.green : chalk.blue;
      const typeLabel = `[${typeColor(branch.type)}]`;
      
      let usageInfo = '';
      if (branch.inUse && branch.worktreePath) {
        usageInfo = chalk.gray(` (in use: ${branch.worktreePath})`);
      }
      
      let prInfo = '';
      if (branch.hasPullRequest && branch.prNumber) {
        const prTitle = branch.prTitle ? ` - ${branch.prTitle}` : '';
        prInfo = chalk.magenta(` [PR #${branch.prNumber}${prTitle}]`);
      }
      
      const remotePart = branch.remoteName ? chalk.gray(` ${branch.remoteName}/`) : '';
      const displayLine = `${remotePart}${branch.name} ${typeLabel}${prInfo}${usageInfo}`;
      
      branchDisplayLines.push(displayLine);
      
      // Create mapping from clean display line to branch object
      // eslint-disable-next-line no-control-regex
      const cleanLine = displayLine.replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI codes
      branchMap.set(cleanLine.trim(), branch);
      
      // Also map by index as fallback
      branchMap.set(`INDEX_${index}`, branch);
    });
    
    const branchList = branchDisplayLines.join('\n');
    
    try {
      const selectedLine = await this.runFzf(branchList, prompt);
      if (!selectedLine) {
        return null;
      }
      
      // First try to match by cleaned line
      // eslint-disable-next-line no-control-regex
      const cleanSelectedLine = selectedLine.replace(/\x1b\[[0-9;]*m/g, '').trim();
      let selectedBranch = branchMap.get(cleanSelectedLine);
      
      if (selectedBranch) {
        return selectedBranch;
      }
      
      // Fallback: find by matching line position
      const selectedIndex = branchDisplayLines.findIndex(line => {
        // eslint-disable-next-line no-control-regex
        const cleanDisplayLine = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
        return cleanDisplayLine === cleanSelectedLine;
      });
      
      if (selectedIndex >= 0) {
        selectedBranch = branchMap.get(`INDEX_${selectedIndex}`);
        if (selectedBranch) {
          return selectedBranch;
        }
      }
      
      // Last resort: try to extract branch name manually
      let branchName: string;
      if (cleanSelectedLine.includes('/')) {
        // Remote branch: " origin/branch-name [remote]"
        const trimmed = cleanSelectedLine.trim();
        const parts = trimmed.split(' ');
        const fullName = parts[0];
        branchName = fullName.split('/').slice(1).join('/');
      } else {
        // Local branch: "branch-name [local]"
        branchName = cleanSelectedLine.split(' ')[0];
      }
      
      // Find the selected branch in the original list
      selectedBranch = branches.find(b => b.name === branchName);
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