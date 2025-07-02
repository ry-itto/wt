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
  // Allow custom path override
  if (process.env.WT_CLI_PATH) {
    return process.env.WT_CLI_PATH;
  }
  
  // Check if running as global npm package
  // When installed globally, the script location will be in npm's global bin
  const scriptPath = process.argv[1];
  
  if (scriptPath && (scriptPath.includes('/bin/wt') || scriptPath.includes('\\bin\\wt') || 
      scriptPath.includes('/.n/lib/node_modules') || scriptPath.includes('/.npm/') ||
      scriptPath.includes('/npm/') || scriptPath.includes('/node_modules/.bin/') ||
      scriptPath.includes('node_modules/@ry-itto/wt'))) {
    return 'wt'; // Use command name directly for global install
  }
  
  // Default to local development path
  return `${process.env.HOME}/.zsh/bin/wt/dist/index.js`;
};

const manager = new WorktreeManager(options);

program
  .name('wt')
  .description('Git worktree operations wrapper with interactive interface')
  .version('1.1.2')
  .action(async () => {
    // Default action when no subcommand is provided
    await manager.defaultAction();
  });

program
  .command('list')
  .description('List git worktrees in current repository')
  .action(async () => {
    await manager.listWorktrees();
  });

program
  .command('add [branch] [path]')
  .description('Add a new worktree (interactive branch selection if no branch specified)')
  .option('--pr-only', 'Show only branches with open pull requests')
  .action(async (branch?: string, path?: string, options?: { prOnly?: boolean }) => {
    await manager.addWorktree(branch, path, options?.prOnly);
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
    const isGlobal = cliPath === 'wt';
    const command = isGlobal ? 'command wt' : `node "${cliPath}"`;
    
    console.log(`# wt shell integration
wt() {
  # Create temp file for directory switching (like git-workers)
  local switch_file="/tmp/wt_switch_$$"
  
  if [ $# -eq 0 ]; then
    # Run wt with switch file environment variable
    local output=$(WT_SWITCH_FILE="$switch_file" ${command})
    local exit_code=$?
    
    # Check for directory switch
    if [[ -f "$switch_file" ]]; then
      local new_dir=$(cat "$switch_file" 2>/dev/null)
      rm -f "$switch_file"
      if [[ -n "$new_dir" && -d "$new_dir" ]]; then
        cd "$new_dir"
      fi
    elif [[ "$output" =~ WT_CD:(.+) ]]; then
      # Fallback: check for stdout marker
      local new_dir="\${BASH_REMATCH[1]}"
      if [[ -n "$new_dir" && -d "$new_dir" ]]; then
        cd "$new_dir"
      fi
    else
      # Show output if no directory change
      echo "$output"
    fi
    
    return $exit_code
  elif [ "$1" = "cd" ]; then
    # Run wt cd with switch file environment variable
    local output=$(WT_SWITCH_FILE="$switch_file" ${command} cd)
    local exit_code=$?
    
    # Check for directory switch
    if [[ -f "$switch_file" ]]; then
      local new_dir=$(cat "$switch_file" 2>/dev/null)
      rm -f "$switch_file"
      if [[ -n "$new_dir" && -d "$new_dir" ]]; then
        cd "$new_dir"
      fi
    elif [[ "$output" =~ WT_CD:(.+) ]]; then
      # Fallback: check for stdout marker
      local new_dir="\${BASH_REMATCH[1]}"
      if [[ -n "$new_dir" && -d "$new_dir" ]]; then
        cd "$new_dir"
      fi
    else
      # Show output if no directory change
      echo "$output"
    fi
    
    return $exit_code
  else
    ${command} "$@"
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
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && err.code === 'commander.unknownCommand') {
      // Handle "wt <command>" pattern - pass worktree as argument to command
      const args = process.argv.slice(2);
      if (args.length > 0) {
        await manager.executeWithWorktree(args);
      } else {
        // Default action - select worktree for cd
        await manager.defaultAction();
      }
    } else {
      console.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  }
}

main().catch(error => {
  console.error(chalk.red('Unexpected error:', error));
  process.exit(1);
});