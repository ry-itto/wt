import { InteractiveSelector } from '../../../src/utils/interactive.js';
import { BranchInfo, BranchType } from '../../../src/types.js';
import { spawn } from 'child_process';

// Mock child_process
jest.mock('child_process');
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation()
};

describe('InteractiveSelector.selectBranch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
  });

  it('should return null when no branches provided', async () => {
    const result = await InteractiveSelector.selectBranch([]);
    expect(result).toBeNull();
    expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('No branches found'));
  });

  it('should handle user cancellation', async () => {
    const branches: BranchInfo[] = [
      {
        name: 'main',
        type: BranchType.Local,
        inUse: false,
        isRemote: false
      }
    ];

    const mockChild = {
      stdout: { on: jest.fn() },
      stdin: { write: jest.fn(), end: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(130); // Ctrl+C exit code
        }
      })
    };

    mockSpawn.mockReturnValue(mockChild as any);

    const result = await InteractiveSelector.selectBranch(branches);
    expect(result).toBeNull();
  });

  it('should return selected local branch', async () => {
    const branches: BranchInfo[] = [
      {
        name: 'main',
        type: BranchType.Local,
        inUse: false,
        isRemote: false
      },
      {
        name: 'feature',
        type: BranchType.Local,
        inUse: false,
        isRemote: false
      }
    ];

    const mockChild = {
      stdout: { on: jest.fn((event, callback) => {
        if (event === 'data') {
          callback('feature [local]');
        }
      })},
      stdin: { write: jest.fn(), end: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(0); // Success exit code
        }
      })
    };

    mockSpawn.mockReturnValue(mockChild as any);

    const result = await InteractiveSelector.selectBranch(branches);
    expect(result).toMatchObject({
      name: 'feature',
      type: BranchType.Local,
      inUse: false,
      isRemote: false
    });
  });

  it('should return selected remote branch', async () => {
    const branches: BranchInfo[] = [
      {
        name: 'feature',
        type: BranchType.Remote,
        inUse: false,
        isRemote: true,
        remoteName: 'origin'
      }
    ];

    const mockChild = {
      stdout: { on: jest.fn((event, callback) => {
        if (event === 'data') {
          callback(' origin/feature [remote]');
        }
      })},
      stdin: { write: jest.fn(), end: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(0); // Success exit code
        }
      })
    };

    mockSpawn.mockReturnValue(mockChild as any);

    const result = await InteractiveSelector.selectBranch(branches);
    expect(result).toMatchObject({
      name: 'feature',
      type: BranchType.Remote,
      inUse: false,
      isRemote: true,
      remoteName: 'origin'
    });
  });

  it('should handle fzf error', async () => {
    const branches: BranchInfo[] = [
      {
        name: 'main',
        type: BranchType.Local,
        inUse: false,
        isRemote: false
      }
    ];

    const mockChild = {
      stdout: { on: jest.fn() },
      stdin: { write: jest.fn(), end: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(1); // Error exit code
        } else if (event === 'error') {
          callback(new Error('fzf failed'));
        }
      })
    };

    mockSpawn.mockReturnValue(mockChild as any);

    const result = await InteractiveSelector.selectBranch(branches);
    expect(result).toBeNull();
    expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Error running fzf'));
  });

  it('should handle branches with in-use status', async () => {
    const branches: BranchInfo[] = [
      {
        name: 'feature',
        type: BranchType.Local,
        inUse: true,
        worktreePath: '/path/to/worktree',
        isRemote: false
      }
    ];

    const mockChild = {
      stdout: { on: jest.fn() },
      stdin: { write: jest.fn(), end: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(130); // User cancelled
        }
      })
    };

    mockSpawn.mockReturnValue(mockChild as any);

    // Just verify the branch list is formatted correctly (contains usage info)
    await InteractiveSelector.selectBranch(branches);
    
    expect(mockChild.stdin.write).toHaveBeenCalledWith(
      expect.stringContaining('(in use: /path/to/worktree)')
    );
  });
});