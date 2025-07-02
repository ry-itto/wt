import { GitUtils } from '../../../src/utils/git.js';
import { BranchType } from '../../../src/types.js';
import { execSync } from 'child_process';

// Mock execSync
jest.mock('child_process');
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

// Mock fs
jest.mock('fs');

describe('GitUtils.listBranches', () => {
  const mockRepoPath = '/test/repo';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when git commands fail', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('git command failed');
    });

    const branches = await GitUtils.listBranches(mockRepoPath);
    expect(branches).toEqual([]);
  });

  it('should list local branches correctly', async () => {
    // Mock worktree list (empty)
    mockExecSync
      .mockReturnValueOnce('') // worktree list
      .mockReturnValueOnce('main\nfeature\nbugfix') // local branches
      .mockReturnValueOnce(''); // remote branches (empty)

    const branches = await GitUtils.listBranches(mockRepoPath);

    expect(branches).toHaveLength(3);
    // Branches are sorted alphabetically within type
    const localBranches = branches.filter(b => b.type === BranchType.Local);
    expect(localBranches).toHaveLength(3);
    expect(localBranches.map(b => b.name)).toEqual(['bugfix', 'feature', 'main']);
  });

  it('should list remote branches correctly', async () => {
    // Mock worktree list (empty)
    mockExecSync
      .mockReturnValueOnce('') // worktree list
      .mockReturnValueOnce('main') // local branches
      .mockReturnValueOnce('origin/feature\norigin/bugfix\norigin/HEAD -> origin/main'); // remote branches

    const branches = await GitUtils.listBranches(mockRepoPath);

    expect(branches).toHaveLength(3);
    const localBranches = branches.filter(b => b.type === BranchType.Local);
    const remoteBranches = branches.filter(b => b.type === BranchType.Remote);
    
    expect(localBranches).toHaveLength(1);
    expect(localBranches[0].name).toBe('main');
    
    expect(remoteBranches).toHaveLength(2);
    expect(remoteBranches.map(b => b.name).sort()).toEqual(['bugfix', 'feature']);
  });

  it('should mark branches as in use when they have worktrees', async () => {
    // Mock worktree list with used branch
    mockExecSync
      .mockReturnValueOnce('worktree /path/to/feature\nbranch refs/heads/feature\nHEAD abc123\n\n') // worktree list
      .mockReturnValueOnce('main\nfeature') // local branches
      .mockReturnValueOnce(''); // remote branches

    const branches = await GitUtils.listBranches(mockRepoPath);

    expect(branches).toHaveLength(2);
    const featureBranch = branches.find(b => b.name === 'feature');
    const mainBranch = branches.find(b => b.name === 'main');
    
    expect(mainBranch).toMatchObject({
      name: 'main',
      type: BranchType.Local,
      inUse: false,
      isRemote: false
    });
    expect(featureBranch).toMatchObject({
      name: 'feature',
      type: BranchType.Local,
      inUse: true,
      worktreePath: '/path/to/feature',
      isRemote: false
    });
  });

  it('should skip remote branches that have local counterparts', async () => {
    mockExecSync
      .mockReturnValueOnce('') // worktree list
      .mockReturnValueOnce('main\nfeature') // local branches
      .mockReturnValueOnce('origin/main\norigin/feature\norigin/new-feature'); // remote branches

    const branches = await GitUtils.listBranches(mockRepoPath);

    expect(branches).toHaveLength(3);
    // Should have local main and feature, plus remote new-feature only
    const localBranches = branches.filter(b => b.type === BranchType.Local);
    const remoteBranches = branches.filter(b => b.type === BranchType.Remote);
    
    expect(localBranches.map(b => b.name).sort()).toEqual(['feature', 'main']);
    expect(remoteBranches.map(b => b.name)).toEqual(['new-feature']);
  });

  it('should sort branches with local branches first', async () => {
    mockExecSync
      .mockReturnValueOnce('') // worktree list
      .mockReturnValueOnce('zebra\nalpha') // local branches
      .mockReturnValueOnce('origin/beta\norigin/gamma'); // remote branches

    const branches = await GitUtils.listBranches(mockRepoPath);

    // Verify local branches come first, and both types are sorted alphabetically
    const localBranches = branches.filter(b => b.type === BranchType.Local);
    const remoteBranches = branches.filter(b => b.type === BranchType.Remote);
    
    expect(localBranches.map(b => b.name)).toEqual(['alpha', 'zebra']);
    expect(remoteBranches.map(b => b.name)).toEqual(['beta', 'gamma']);
    
    // Verify that all local branches come before remote branches
    const firstRemoteIndex = branches.findIndex(b => b.type === BranchType.Remote);
    const lastLocalIndex = branches.map(b => b.type).lastIndexOf(BranchType.Local);
    expect(lastLocalIndex).toBeLessThan(firstRemoteIndex);
  });
});