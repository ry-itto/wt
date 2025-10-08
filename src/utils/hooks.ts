import { existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { HookContext, HookType } from '../types.js';
import chalk from 'chalk';

/**
 * フックの実行を管理するクラス
 */
export class HookManager {
  /**
   * worktree 作成前のフックを実行
   * @param context - フック実行コンテキスト
   */
  static async executePreAddHooks(context: HookContext): Promise<void> {
    await this.executeHook('pre-add', context);
  }
  
  /**
   * worktree 作成後のフックを実行
   * @param context - フック実行コンテキスト
   */
  static async executePostAddHooks(context: HookContext): Promise<void> {
    await this.executeHook('post-add', context);
  }
  
  /**
   * worktree 削除前のフックを実行
   * @param context - フック実行コンテキスト
   */
  static async executePreRemoveHooks(context: HookContext): Promise<void> {
    await this.executeHook('pre-remove', context);
  }
  
  /**
   * worktree 削除後のフックを実行
   * @param context - フック実行コンテキスト
   */
  static async executePostRemoveHooks(context: HookContext): Promise<void> {
    await this.executeHook('post-remove', context);
  }
  
  /**
   * 指定されたタイプのフックを実行（グローバル & リポジトリ固有）
   * @param hookType - フックのタイプ
   * @param context - フック実行コンテキスト
   */
  private static async executeHook(hookType: HookType, context: HookContext): Promise<void> {
    // Execute global hook
    const globalHookPath = join(process.env.HOME!, '.zsh', 'hooks', 'wt', hookType);
    await this.runHookScript(globalHookPath, context, 'global');
    
    // Execute repository-specific hook
    const repoHookPath = join(context.repoPath, '.wt', 'hooks', hookType);
    await this.runHookScript(repoHookPath, context, 'repository-specific');
  }
  
  /**
   * フックスクリプトを実行
   * @param scriptPath - スクリプトのパス
   * @param context - フック実行コンテキスト
   * @param type - フックのタイプ（global または repository-specific）
   */
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
  
  /**
   * スクリプトを zsh で実行
   * @param scriptPath - スクリプトのパス
   * @param args - スクリプトに渡す引数
   */
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