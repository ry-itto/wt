import { execSync } from 'child_process';
import chalk from 'chalk';

/**
 * GitHub Pull Request の情報
 */
export interface GitHubPRInfo {
  /** PR 番号 */
  number: number;
  /** PR タイトル */
  title: string;
  /** ブランチ名 */
  headRefName: string;
  /** PR の状態 */
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  /** マージ日時（マージ済みの場合） */
  mergedAt?: string;
  /** マージ可能かどうか */
  mergeable: string;
}

/**
 * GitHub CLI (gh) との連携を管理するクラス
 */
export class GitHubCLI {

  /**
   * GitHub CLI がインストールされているかチェック
   * @returns インストールされている場合は true
   */
  public static async isAvailable(): Promise<boolean> {
    try {
      execSync('gh --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * GitHub CLI で認証済みかチェック
   * @returns 認証済みの場合は true
   */
  public static async isAuthenticated(): Promise<boolean> {
    try {
      execSync('gh auth status', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * GitHub CLI の利用可能性と認証状態を確認
   * @returns available（インストール済み）、authenticated（認証済み）、error（エラーメッセージ）
   */
  public static async checkRequirements(): Promise<{ available: boolean; authenticated: boolean; error?: string }> {
    const available = await this.isAvailable();
    if (!available) {
      return {
        available: false,
        authenticated: false,
        error: 'GitHub CLI (gh) is not installed. Please install it from https://cli.github.com/'
      };
    }

    const authenticated = await this.isAuthenticated();
    if (!authenticated) {
      return {
        available: true,
        authenticated: false,
        error: 'GitHub CLI is not authenticated. Please run: gh auth login'
      };
    }

    return { available: true, authenticated: true };
  }

  /**
   * マージ済み Pull Request の一覧を取得
   * @param repoPath - リポジトリのパス
   * @returns マージ済み PR の配列（最大 100 件）
   * @throws GitHub CLI が利用できない場合、またはコマンド実行に失敗した場合
   */
  public static async fetchMergedPullRequests(repoPath: string): Promise<GitHubPRInfo[]> {
    try {
      const output = execSync(
        'gh pr list --state merged --json number,title,headRefName,state,mergedAt --limit 100',
        { 
          cwd: repoPath, 
          encoding: 'utf8' 
        }
      );
      
      const prs: GitHubPRInfo[] = JSON.parse(output);
      return prs;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error('GitHub CLI (gh) is not installed');
      }
      throw new Error(`Failed to fetch merged pull requests: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * すべての Pull Request の一覧を取得
   * @param repoPath - リポジトリのパス
   * @returns PR の配列（最大 200 件）
   * @throws GitHub CLI が利用できない場合、またはコマンド実行に失敗した場合
   */
  public static async fetchAllPullRequests(repoPath: string): Promise<GitHubPRInfo[]> {
    try {
      const output = execSync(
        'gh pr list --state all --json number,title,headRefName,state,mergedAt --limit 200',
        { 
          cwd: repoPath, 
          encoding: 'utf8' 
        }
      );
      
      const prs: GitHubPRInfo[] = JSON.parse(output);
      return prs;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error('GitHub CLI (gh) is not installed');
      }
      throw new Error(`Failed to fetch pull requests: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * ブランチがリモートで削除されているかチェック
   * @param branchName - ブランチ名
   * @param repoPath - リポジトリのパス
   * @returns 削除されている場合は true
   */
  public static async checkBranchDeleted(branchName: string, repoPath: string): Promise<boolean> {
    try {
      // Check if branch exists on remote
      const output = execSync(
        `git ls-remote --heads origin ${branchName}`,
        { 
          cwd: repoPath, 
          encoding: 'utf8' 
        }
      );
      
      return output.trim() === '';
    } catch {
      // If command fails, assume branch might be deleted
      return true;
    }
  }

  /**
   * 特定のブランチに対応する PR を検索
   * @param branchName - ブランチ名
   * @param prs - PR の配列
   * @returns 対応する PR、または見つからない場合は null
   */
  public static async getPullRequestForBranch(branchName: string, prs: GitHubPRInfo[]): Promise<GitHubPRInfo | null> {
    return prs.find(pr => pr.headRefName === branchName) || null;
  }

  /**
   * GitHub CLI の要件エラーメッセージを表示
   * @param error - エラーメッセージ
   */
  public static displayRequirementError(error: string): void {
    console.error(chalk.red('Error: ' + error));
    console.log();
    
    if (error.includes('not installed')) {
      console.log(chalk.yellow('To install GitHub CLI:'));
      console.log(chalk.gray('  macOS: brew install gh'));
      console.log(chalk.gray('  Linux: See https://github.com/cli/cli/blob/trunk/docs/install_linux.md'));
      console.log(chalk.gray('  Windows: winget install --id GitHub.cli'));
    } else if (error.includes('not authenticated')) {
      console.log(chalk.yellow('To authenticate with GitHub:'));
      console.log(chalk.gray('  gh auth login'));
    }
  }
}