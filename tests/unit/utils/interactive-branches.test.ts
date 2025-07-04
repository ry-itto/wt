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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockSpawn.mockReturnValue(mockChild as any);

    // Just verify the branch list is formatted correctly (contains usage info)
    await InteractiveSelector.selectBranch(branches);
    
    expect(mockChild.stdin.write).toHaveBeenCalledWith(
      expect.stringContaining('(in use: /path/to/worktree)')
    );
  });

  it('should correctly extract remote branch name with leading space', async () => {
    const branches: BranchInfo[] = [
      {
        name: 'feature-branch',
        type: BranchType.Remote,
        inUse: false,
        isRemote: true,
        remoteName: 'origin'
      }
    ];

    const mockChild = {
      stdout: { on: jest.fn((event, callback) => {
        if (event === 'data') {
          // Simulate fzf output with leading space (as shown in user's problem)
          callback(' origin/feature-branch [remote]');
        }
      })},
      stdin: { write: jest.fn(), end: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(0); // Success exit code
        }
      })
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockSpawn.mockReturnValue(mockChild as any);

    const result = await InteractiveSelector.selectBranch(branches);
    expect(result).toMatchObject({
      name: 'feature-branch',
      type: BranchType.Remote,
      inUse: false,
      isRemote: true,
      remoteName: 'origin'
    });
  });

  it('should handle remote branch with complex name containing slashes', async () => {
    const branches: BranchInfo[] = [
      {
        name: 'feature/user-auth/login',
        type: BranchType.Remote,
        inUse: false,
        isRemote: true,
        remoteName: 'origin'
      }
    ];

    const mockChild = {
      stdout: { on: jest.fn((event, callback) => {
        if (event === 'data') {
          callback(' origin/feature/user-auth/login [remote]');
        }
      })},
      stdin: { write: jest.fn(), end: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(0); // Success exit code
        }
      })
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockSpawn.mockReturnValue(mockChild as any);

    const result = await InteractiveSelector.selectBranch(branches);
    expect(result).toMatchObject({
      name: 'feature/user-auth/login',
      type: BranchType.Remote,
      inUse: false,
      isRemote: true,
      remoteName: 'origin'
    });
  });

  it('should handle empty branch name from malformed fzf output', async () => {
    const branches: BranchInfo[] = [
      {
        name: 'main',
        type: BranchType.Local,
        inUse: false,
        isRemote: false
      }
    ];

    const mockChild = {
      stdout: { on: jest.fn((event, callback) => {
        if (event === 'data') {
          // Simulate malformed output that could result in empty name
          callback('   [local]');
        }
      })},
      stdin: { write: jest.fn(), end: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(0); // Success exit code
        }
      })
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockSpawn.mockReturnValue(mockChild as any);

    const result = await InteractiveSelector.selectBranch(branches);
    // Should return null when branch name cannot be extracted properly
    expect(result).toBeNull();
  });

  it('should use mapping fallback when direct matching fails', async () => {
    const branches: BranchInfo[] = [
      {
        name: 'develop',
        type: BranchType.Local,
        inUse: false,
        isRemote: false
      },
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
          // Return the second item (feature branch)
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
});