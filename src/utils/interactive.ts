import { spawn } from 'child_process';
import { WorktreeInfo } from '../types.js';
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
      const readline = require('readline');
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