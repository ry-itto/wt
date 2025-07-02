import { E2ETestHelper } from './helpers/test-environment.js';

describe('CLI E2E Tests', () => {
  let cliPath: string;

  beforeAll(() => {
    cliPath = E2ETestHelper.getBuiltCliPath();
  });

  describe('--help', () => {
    it('should display help information', async () => {
      const result = await E2ETestHelper.runCommand('node', [cliPath, '--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Git worktree operations wrapper');
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('list');
      expect(result.stdout).toContain('add');
      expect(result.stdout).toContain('remove');
      expect(result.stdout).toContain('shell-init');
    });
  });

  describe('--version', () => {
    it('should display version information', async () => {
      const result = await E2ETestHelper.runCommand('node', [cliPath, '--version']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('add command', () => {
    it('should show help when unknown branch flag is used', async () => {
      const result = await E2ETestHelper.runCommand('node', [cliPath, 'add', '--invalid-flag']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("unknown option");
    });

    it('should handle branch name extraction correctly in interactive mode', async () => {
      // This test verifies that when no branch is provided, the command
      // will attempt to use interactive selection, and proper error handling
      // occurs when not in a git repository
      const result = await E2ETestHelper.runCommand('node', [cliPath, 'add']);
      
      // Should exit with error when not in a git repo
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Not in a git repository');
    }, 10000);

    it('should properly validate branch argument when provided', async () => {
      // Test with an explicit branch name to ensure argument parsing works
      const result = await E2ETestHelper.runCommand('node', [cliPath, 'add', 'test-branch']);
      
      // When providing a branch name directly, it should also fail with git repo error
      // but the process should handle the branch name argument correctly
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Not in a git repository');
      // Should not contain branch-name related errors since parsing should work
      expect(result.stderr).not.toContain('branch name');
      expect(result.stderr).not.toContain('empty');
    });
  });

  describe('shell-init command', () => {
    it('should output shell integration function', async () => {
      const result = await E2ETestHelper.runCommand('node', [cliPath, 'shell-init']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('# wt shell integration');
      expect(result.stdout).toContain('wt() {');
      expect(result.stdout).toContain('WT_SWITCH_FILE');
      expect(result.stdout).toContain('switch_file="/tmp/wt_switch_$$"');
      expect(result.stdout).toContain('WT_CD:');
    });
  });
});