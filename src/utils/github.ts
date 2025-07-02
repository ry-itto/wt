import { execSync } from 'child_process';

export interface GitHubPullRequest {
  number: number;
  title: string;
  head: {
    ref: string;
  };
  state: 'open' | 'closed' | 'merged';
}

export interface GitHubRepository {
  owner: string;
  repo: string;
}

export class GitHubUtils {
  private static readonly API_BASE_URL = 'https://api.github.com';
  
  public static extractRepositoryInfo(repoPath: string): GitHubRepository | null {
    try {
      const remoteUrl = execSync('git remote get-url origin', { 
        cwd: repoPath, 
        encoding: 'utf8' 
      }).trim();
      
      const githubMatch = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
      if (!githubMatch) {
        return null;
      }
      
      return {
        owner: githubMatch[1],
        repo: githubMatch[2]
      };
    } catch (error) {
      return null;
    }
  }

  public static async fetchPullRequests(
    repoInfo: GitHubRepository, 
    token?: string
  ): Promise<GitHubPullRequest[]> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'wt-cli'
    };
    
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }
    
    try {
      const url = `${this.API_BASE_URL}/repos/${repoInfo.owner}/${repoInfo.repo}/pulls?state=open&per_page=100`;
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('GitHub API authentication failed. Please set GITHUB_TOKEN environment variable.');
        }
        if (response.status === 403) {
          throw new Error('GitHub API rate limit exceeded or access denied.');
        }
        throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
      }
      
      const pullRequests: GitHubPullRequest[] = await response.json();
      return pullRequests;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch pull requests from GitHub API');
    }
  }

  public static async getBranchPullRequestInfo(
    branchName: string,
    repoPath: string,
    token?: string
  ): Promise<{ hasPullRequest: boolean; prNumber?: number; prTitle?: string }> {
    try {
      const repoInfo = this.extractRepositoryInfo(repoPath);
      if (!repoInfo) {
        return { hasPullRequest: false };
      }
      
      const pullRequests = await this.fetchPullRequests(repoInfo, token);
      
      const matchingPr = pullRequests.find(pr => 
        pr.head.ref === branchName || pr.head.ref === `origin/${branchName}`
      );
      
      if (matchingPr) {
        return {
          hasPullRequest: true,
          prNumber: matchingPr.number,
          prTitle: matchingPr.title
        };
      }
      
      return { hasPullRequest: false };
    } catch (error) {
      console.warn(`Failed to fetch PR info for branch ${branchName}:`, error instanceof Error ? error.message : error);
      return { hasPullRequest: false };
    }
  }

  public static getGitHubToken(): string | undefined {
    return process.env.GITHUB_TOKEN;
  }
}