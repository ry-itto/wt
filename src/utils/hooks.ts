import { existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { HookContext, HookType } from '../types.js';
import chalk from 'chalk';

export class HookManager {
  static async executePreAddHooks(context: HookContext): Promise<void> {
    await this.executeHook('pre-add', context);
  }
  
  static async executePostAddHooks(context: HookContext): Promise<void> {
    await this.executeHook('post-add', context);
  }
  
  static async executePreRemoveHooks(context: HookContext): Promise<void> {
    await this.executeHook('pre-remove', context);
  }
  
  static async executePostRemoveHooks(context: HookContext): Promise<void> {
    await this.executeHook('post-remove', context);
  }
  
  private static async executeHook(hookType: HookType, context: HookContext): Promise<void> {
    // Execute global hook
    const globalHookPath = join(process.env.HOME!, '.zsh', 'hooks', 'wt', hookType);
    await this.runHookScript(globalHookPath, context, 'global');
    
    // Execute repository-specific hook
    const repoHookPath = join(context.repoPath, '.wt', 'hooks', hookType);
    await this.runHookScript(repoHookPath, context, 'repository-specific');
  }
  
  private static async runHookScript(
    scriptPath: string, 
    context: HookContext, 
    type: 'global' | 'repository-specific'
  ): Promise<void> {
    if (!existsSync(scriptPath)) {
      return;
    }
    
    try {
      // Check if file is executable
      const stats = await import('fs').then(fs => fs.promises.stat(scriptPath));
      if (!(stats.mode & parseInt('111', 8))) {
        console.log(chalk.yellow(`⚠️  Hook script ${scriptPath} is not executable, skipping`));
        return;
      }
      
      console.log(chalk.blue(`🔗 Executing ${type} ${scriptPath.split('/').pop()} hook...`));
      
      const args = [
        context.branchName,
        context.worktreePath,
        context.repoPath
      ];
      
      if (context.success !== undefined) {
        args.push(context.success.toString());
      }
      
      await this.executeScript(scriptPath, args);
    } catch (error) {
      console.error(chalk.red(`❌ Error executing ${type} hook: ${error}`));
      // Continue execution even if hook fails
    }
  }
  
  private static async executeScript(scriptPath: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('zsh', [scriptPath, ...args], {
        stdio: 'inherit',
        env: process.env
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Hook script exited with code ${code}`));
        }
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }
}