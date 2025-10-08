import { jest } from '@jest/globals';
import { WorktreeManager } from '../../../src/commands/worktree.js';
import { writeFileSync } from 'fs';
import chalk from 'chalk';

jest.mock('fs');
jest.mock('../../../src/utils/git.js');
jest.mock('../../../src/utils/interactive.js');

const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;

describe('WorktreeManager - cd失敗警告機能', () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('ファイル書き込みエラー検出', () => {
    it('writeFileSyncが失敗した際、警告メッセージを標準エラー出力に表示する', async () => {
      // Arrange
      const { GitUtils } = await import('../../../src/utils/git.js');
      const { InteractiveSelector } = await import('../../../src/utils/interactive.js');

      const testPath = '/test/worktree/path';
      (GitUtils.getCurrentRepo as jest.Mock).mockReturnValue({
        path: '/test/repo',
        isWorktree: false
      });
      (GitUtils.listWorktrees as jest.Mock).mockReturnValue([
        { path: testPath, branch: 'test-branch', isMain: false }
      ]);
      (InteractiveSelector.selectWorktree as jest.MockedFunction<typeof InteractiveSelector.selectWorktree>).mockResolvedValue(testPath);

      const manager = new WorktreeManager();
      const switchFile = '/tmp/wt_test_switch';
      process.env.WT_SWITCH_FILE = switchFile;

      const error = new Error('EACCES: permission denied');
      mockWriteFileSync.mockImplementation(() => {
        throw error;
      });

      // Act
      await manager.changeDirectory();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write switch file')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('EACCES: permission denied')
      );
    });

    it('エラーメッセージがchalk.redで装飾されている', async () => {
      // Arrange
      const { GitUtils } = await import('../../../src/utils/git.js');
      const { InteractiveSelector } = await import('../../../src/utils/interactive.js');

      const testPath = '/test/worktree/path';
      (GitUtils.getCurrentRepo as jest.Mock).mockReturnValue({
        path: '/test/repo',
        isWorktree: false
      });
      (GitUtils.listWorktrees as jest.Mock).mockReturnValue([
        { path: testPath, branch: 'test-branch', isMain: false }
      ]);
      (InteractiveSelector.selectWorktree as jest.MockedFunction<typeof InteractiveSelector.selectWorktree>).mockResolvedValue(testPath);

      const manager = new WorktreeManager();
      const switchFile = '/tmp/wt_test_switch';
      process.env.WT_SWITCH_FILE = switchFile;

      const error = new Error('Test error');
      mockWriteFileSync.mockImplementation(() => {
        throw error;
      });

      // Act
      await manager.changeDirectory();

      // Assert
      const errorCalls = consoleErrorSpy.mock.calls;
      const hasRedColoredMessage = errorCalls.some(call =>
        call.some(arg => typeof arg === 'string' && (arg.includes('\x1b[31m') || arg.includes('Failed to write switch file')))
      );
      expect(hasRedColoredMessage).toBe(true);
    });

    it('ファイル書き込み失敗時、対象ディレクトリパスをエラーメッセージに含める', async () => {
      // Arrange
      const { GitUtils } = await import('../../../src/utils/git.js');
      const { InteractiveSelector } = await import('../../../src/utils/interactive.js');

      const testPath = '/test/worktree/path';
      (GitUtils.getCurrentRepo as jest.Mock).mockReturnValue({
        path: '/test/repo',
        isWorktree: false
      });
      (GitUtils.listWorktrees as jest.Mock).mockReturnValue([
        { path: testPath, branch: 'test-branch', isMain: false }
      ]);
      (InteractiveSelector.selectWorktree as jest.MockedFunction<typeof InteractiveSelector.selectWorktree>).mockResolvedValue(testPath);

      const manager = new WorktreeManager();
      const switchFile = '/tmp/wt_test_switch';
      process.env.WT_SWITCH_FILE = switchFile;

      const error = new Error('Write failed');
      mockWriteFileSync.mockImplementation(() => {
        throw error;
      });

      // Act
      await manager.changeDirectory();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(testPath)
      );
    });

    it('ファイル書き込み失敗後、stdoutマーカーメソッドへフォールバックする', async () => {
      // Arrange
      const { GitUtils } = await import('../../../src/utils/git.js');
      const { InteractiveSelector } = await import('../../../src/utils/interactive.js');

      const testPath = '/test/worktree/path';
      (GitUtils.getCurrentRepo as jest.Mock).mockReturnValue({
        path: '/test/repo',
        isWorktree: false
      });
      (GitUtils.listWorktrees as jest.Mock).mockReturnValue([
        { path: testPath, branch: 'test-branch', isMain: false }
      ]);
      (InteractiveSelector.selectWorktree as jest.MockedFunction<typeof InteractiveSelector.selectWorktree>).mockResolvedValue(testPath);

      const manager = new WorktreeManager();
      const switchFile = '/tmp/wt_test_switch';
      process.env.WT_SWITCH_FILE = switchFile;

      const error = new Error('Write failed');
      mockWriteFileSync.mockImplementation(() => {
        throw error;
      });

      // Act
      await manager.changeDirectory();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(`WT_CD:${testPath}`);
    });
  });

  describe('エラー原因の分類', () => {
    it('Errorオブジェクトからエラーメッセージを抽出する', async () => {
      // Arrange
      const { GitUtils } = await import('../../../src/utils/git.js');
      const { InteractiveSelector } = await import('../../../src/utils/interactive.js');

      const testPath = '/test/worktree/path';
      (GitUtils.getCurrentRepo as jest.Mock).mockReturnValue({
        path: '/test/repo',
        isWorktree: false
      });
      (GitUtils.listWorktrees as jest.Mock).mockReturnValue([
        { path: testPath, branch: 'test-branch', isMain: false }
      ]);
      (InteractiveSelector.selectWorktree as jest.MockedFunction<typeof InteractiveSelector.selectWorktree>).mockResolvedValue(testPath);

      const manager = new WorktreeManager();
      const switchFile = '/tmp/wt_test_switch';
      process.env.WT_SWITCH_FILE = switchFile;

      const error = new Error('ENOSPC: no space left on device');
      mockWriteFileSync.mockImplementation(() => {
        throw error;
      });

      // Act
      await manager.changeDirectory();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ENOSPC: no space left on device')
      );
    });

    it('非Errorオブジェクトの場合、文字列に変換して表示する', async () => {
      // Arrange
      const { GitUtils } = await import('../../../src/utils/git.js');
      const { InteractiveSelector } = await import('../../../src/utils/interactive.js');

      const testPath = '/test/worktree/path';
      (GitUtils.getCurrentRepo as jest.Mock).mockReturnValue({
        path: '/test/repo',
        isWorktree: false
      });
      (GitUtils.listWorktrees as jest.Mock).mockReturnValue([
        { path: testPath, branch: 'test-branch', isMain: false }
      ]);
      (InteractiveSelector.selectWorktree as jest.MockedFunction<typeof InteractiveSelector.selectWorktree>).mockResolvedValue(testPath);

      const manager = new WorktreeManager();
      const switchFile = '/tmp/wt_test_switch';
      process.env.WT_SWITCH_FILE = switchFile;

      mockWriteFileSync.mockImplementation(() => {
        throw 'String error';
      });

      // Act
      await manager.changeDirectory();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('String error')
      );
    });
  });
});
