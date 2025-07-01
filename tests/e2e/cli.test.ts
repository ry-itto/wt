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

  describe('add command - validation', () => {
    it('should show error when branch name is missing', async () => {
      const result = await E2ETestHelper.runCommand('node', [cliPath, 'add']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("missing required argument 'branch'");
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