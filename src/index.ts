#!/usr/bin/env node

import { Command } from 'commander';
import { WorktreeManager } from './commands/worktree.js';
import { WtOptions } from './types.js';
import chalk from 'chalk';

const program = new Command();

// Get options from environment
const options: WtOptions = {
  worktreeDir: process.env.WT_WORKTREE_DIR
};

// Get CLI path for shell integration
const getCliPath = (): string => {
  // Check if we're running from npm global install
  if (process.env.WT_CLI_PATH) {
    return process.env.WT_CLI_PATH;
  }
  
  // Default to expected ghq path
  const defaultPath = `${process.env.HOME}/.zsh/bin/wt/dist/index.js`;
  return defaultPath;
};

const manager = new WorktreeManager(options);

program
  .name('wt')
  .description('Git worktree operations wrapper with interactive interface')
  .version('1.0.0');

program
  .command('list')
  .description('List git worktrees in current repository')
  .action(async () => {
    await manager.listWorktrees();
  });

program
  .command('add <branch> [path]')
  .description('Add a new worktree in current repository')
  .action(async (branch: string, path?: string) => {
    await manager.addWorktree(branch, path);
  });

program
  .command('remove')
  .alias('rm')
  .description('Remove a worktree in current repository')
  .action(async () => {
    await manager.removeWorktree();
  });

program
  .command('cd')
  .description('Change directory to selected worktree')
  .action(async () => {
    await manager.changeDirectory();
  });

program
  .command('select')
  .description('Select worktree and output path for shell integration')
  .action(async () => {
    await manager.defaultAction();
  });

program
  .command('shell-init')
  .description('Output shell integration function')
  .action(() => {
    const cliPath = getCliPath();
    console.log(`# wt shell integration
wt() {
  if [ $# -eq 0 ]; then
    local output=$(node "${cliPath}")
    if [[ "$output" =~ ^WT_CD_FILE=(.+)$ ]]; then
      local cd_file="\${BASH_REMATCH[1]}"
      if [ -f "$cd_file" ]; then
        local target_dir=$(cat "$cd_file")
        rm -f "$cd_file"
        if [ -d "$target_dir" ]; then
          cd "$target_dir"
        fi
      fi
    fi
  elif [ "$1" = "cd" ]; then
    local output=$(node "${cliPath}" cd)
    if [[ "$output" =~ ^WT_CD_FILE=(.+)$ ]]; then
      local cd_file="\${BASH_REMATCH[1]}"
      if [ -f "$cd_file" ]; then
        local target_dir=$(cat "$cd_file")
        rm -f "$cd_file"
        if [ -d "$target_dir" ]; then
          cd "$target_dir"
        fi
      fi
    fi
  else
    node "${cliPath}" "$@"
  fi
}`);
  });

async function main() {
  // Handle "wt --" pattern
  const dashDashIndex = process.argv.indexOf('--');
  if (dashDashIndex !== -1) {
    const command = process.argv.slice(dashDashIndex + 1);
    if (command.length > 0) {
      await manager.executeInWorktree(command);
      process.exit(0);
    }
  }

  // Check for help and version first
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    program.outputHelp();
    process.exit(0);
  }
  
  if (process.argv.includes('--version') || process.argv.includes('-V')) {
    console.log(program.version());
    process.exit(0);
  }


  // Parse arguments but don't exit on unknown commands
  program.exitOverride((err) => {
    if (err.code === 'commander.unknownCommand') {
      throw err; // Re-throw to handle below
    }
    // Allow other exits to proceed normally
    process.exit(err.exitCode);
  });

  try {
    program.parse();
  } catch (err: any) {
    if (err.code === 'commander.unknownCommand') {
      // Handle "wt <command>" pattern - pass worktree as argument to command
      const args = process.argv.slice(2);
      if (args.length > 0) {
        await manager.executeWithWorktree(args);
      } else {
        // Default action - select worktree for cd
        await manager.defaultAction();
      }
    } else {
      console.error(chalk.red(err.message));
      process.exit(1);
    }
  }

  // If no command provided, run default action
  if (process.argv.length === 2) {
    await manager.defaultAction();
  }
}

main().catch(error => {
  console.error(chalk.red('Unexpected error:', error));
  process.exit(1);
});