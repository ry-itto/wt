import { basename, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { GitUtils } from '../utils/git.js';
import { GitHubCLI, GitHubPRInfo } from '../utils/github-cli.js';
import { HookManager } from '../utils/hooks.js';
import { InteractiveSelector } from '../utils/interactive.js';
import { WtOptions, PrunableWorktree, PruneOptions } from '../types.js';
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
      process.exit(1);
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
  
  async pruneWorktrees(options: PruneOptions = {}): Promise<void> {
    const repo = GitUtils.getCurrentRepo();
    if (!repo) {
      console.error(chalk.red('Error: Not in a git repository'));
      process.exit(1);
    }
    
    console.log(chalk.blue('Fetching latest remote information...'));
    await GitUtils.fetchRemote(repo.path);
    
    console.log(chalk.blue('Analyzing worktrees for pruning...'));
    const worktrees = GitUtils.listWorktrees(repo.path);
    const prunableWorktrees: PrunableWorktree[] = [];
    
    // Filter out the main worktree
    const candidateWorktrees = worktrees.filter(wt => !wt.isMain);
    
    if (candidateWorktrees.length === 0) {
      console.log(chalk.yellow('No worktrees found to prune'));
      return;
    }
    
    // Check GitHub CLI requirements for PR checks
    const ghRequirements = await GitHubCLI.checkRequirements();
    let canCheckPRs = ghRequirements.available && ghRequirements.authenticated;
    
    // When limiting to merged PRs, we must be able to check PRs.
    // If we cannot, abort safely instead of pruning deleted branches.
    if (!canCheckPRs && (options.mergedOnly !== false)) {
      if (ghRequirements.error) {
        GitHubCLI.displayRequirementError(ghRequirements.error);
      }
      console.log(chalk.yellow('Cannot verify merged PRs. Skipping prune to avoid removing active branches.'));
      console.log(chalk.gray('Hint: use --all to include branches deleted on remote regardless of PR status.'));
      return;
    }
    
    // Fetch merged PRs if GitHub CLI is available
    let mergedPRs: GitHubPRInfo[] = [];
    if (canCheckPRs) {
      try {
        console.log(chalk.blue('Fetching merged pull requests...'));
        mergedPRs = await GitHubCLI.fetchMergedPullRequests(repo.path);
      } catch (error) {
        console.log(chalk.yellow(`Warning: ${error instanceof Error ? error.message : error}`));
        canCheckPRs = false;
      }
    }
    
    // Check each worktree
    for (const worktree of candidateWorktrees) {
      const hasUncommittedChanges = GitUtils.hasUncommittedChanges(worktree.path);
      
      // Check if branch exists on remote
      const existsOnRemote = GitUtils.branchExists(repo.path, worktree.branch, 'remote');
      
      if (!existsOnRemote) {
        // Branch deleted on remote
        // Only include deleted branches when --all is specified (mergedOnly === false)
        if (options.mergedOnly === false) {
          prunableWorktrees.push({
            worktree,
            reason: 'deleted-branch',
            hasUncommittedChanges
          });
        }
      } else if (canCheckPRs && options.mergedOnly !== false) {
        // Check if branch has a merged PR using GitHub CLI data
        const mergedPR = await GitHubCLI.getPullRequestForBranch(worktree.branch, mergedPRs);
        if (mergedPR && mergedPR.state === 'MERGED') {
          prunableWorktrees.push({
            worktree,
            reason: 'merged-pr',
            prNumber: mergedPR.number,
            prTitle: mergedPR.title,
            mergedAt: mergedPR.mergedAt || undefined,
            hasUncommittedChanges
          });
        }
      }
    }
    
    if (prunableWorktrees.length === 0) {
      console.log(chalk.green('✅ No worktrees need pruning'));
      return;
    }
    
    // Display what will be pruned
    console.log(chalk.yellow(`\nFound ${prunableWorktrees.length} worktree(s) to prune:\n`));
    
    for (const prunable of prunableWorktrees) {
      const { worktree, reason, prNumber, prTitle, mergedAt, hasUncommittedChanges } = prunable;
      
      console.log(chalk.bold(`• ${worktree.branch}`));
      console.log(`  Path: ${worktree.path}`);
      
      if (reason === 'merged-pr') {
        console.log(`  Reason: ${chalk.green('PR merged')} (#${prNumber}: ${prTitle})`);
        if (mergedAt) {
          const mergedDate = new Date(mergedAt).toLocaleDateString();
          console.log(`  Merged: ${mergedDate}`);
        }
      } else {
        console.log(`  Reason: ${chalk.red('Branch deleted on remote')}`);
      }
      
      if (hasUncommittedChanges) {
        console.log(chalk.red(`  ⚠️  Has uncommitted changes`));
      }
      console.log();
    }
    
    if (options.dryRun) {
      console.log(chalk.blue('Dry run mode - no changes will be made'));
      return;
    }
    
    // Confirm deletion
    if (!options.force) {
      const worktreesWithChanges = prunableWorktrees.filter(p => p.hasUncommittedChanges);
      if (worktreesWithChanges.length > 0) {
        console.log(chalk.red(`⚠️  Warning: ${worktreesWithChanges.length} worktree(s) have uncommitted changes`));
      }
      
      const confirmed = await InteractiveSelector.confirmAction(
        `Remove ${prunableWorktrees.length} worktree(s)?`
      );
      
      if (!confirmed) {
        console.log(chalk.yellow('Pruning cancelled'));
        return;
      }
    }
    
    // Prune worktrees
    console.log(chalk.blue('\nPruning worktrees...'));
    let successCount = 0;
    let failureCount = 0;
    
    for (const prunable of prunableWorktrees) {
      const { worktree } = prunable;
      console.log(chalk.gray(`Removing ${worktree.branch}...`));
      
      const result = await GitUtils.removeWorktree(repo.path, worktree.path, options.force);
      if (result.success) {
        successCount++;
        console.log(chalk.green(`  ✅ Removed`));
      } else {
        failureCount++;
        console.log(chalk.red(`  ❌ Failed to remove: ${result.error || 'Unknown error'}`));
      }
    }
    
    // Summary
    console.log();
    if (failureCount === 0) {
      console.log(chalk.green(`✅ Successfully pruned ${successCount} worktree(s)`));
    } else {
      console.log(chalk.yellow(`Pruned ${successCount} worktree(s), ${failureCount} failed`));
    }
  }
}
