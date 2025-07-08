import { execSync } from 'child_process';
import chalk from 'chalk';

export interface GitHubPRInfo {
  number: number;
  title: string;
  headRefName: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  mergedAt?: string;
  mergeable: string;
}

export class GitHubCLI {
  
  public static async isAvailable(): Promise<boolean> {
    try {
      execSync('gh --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  public static async isAuthenticated(): Promise<boolean> {
    try {
      execSync('gh auth status', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

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

  public static async getPullRequestForBranch(branchName: string, prs: GitHubPRInfo[]): Promise<GitHubPRInfo | null> {
    return prs.find(pr => pr.headRefName === branchName) || null;
  }

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