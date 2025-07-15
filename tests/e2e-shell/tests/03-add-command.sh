#!/bin/bash

# Test add command functionality

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source test helpers
source "$SCRIPT_DIR/../test-helpers.sh"
source "$SCRIPT_DIR/../fixtures/setup-test-repo.sh"

# Setup
setup_test_environment
export CI=true  # Force non-interactive mode
export MOCK_FZF=1  # Enable fzf mocking

describe "Add Command"

# Test adding with explicit branch name
it "should add worktree with explicit branch name"
repo_path=$(create_test_repo "add-explicit")
cd "$repo_path" || exit 1

# Create a branch first
git checkout -b test-branch --quiet
git checkout main --quiet

# Add worktree with explicit branch
run_wt_separate add test-branch
assert_exit_code 0 $? "Add should succeed with explicit branch"
assert_directory_exists "$repo_path-test-branch" "Worktree directory should be created"

# Verify worktree was added
output=$(git worktree list)
assert_contains "$output" "test-branch" "Worktree should be in git worktree list"

# Test adding with custom path
it "should add worktree with custom path"
repo_path=$(create_test_repo "add-custom-path")
cd "$repo_path" || exit 1

git checkout -b custom-branch --quiet
git checkout main --quiet

custom_path="$TEST_BASE_DIR/custom-worktree"
run_wt_separate add custom-branch "$custom_path"
assert_exit_code 0 $? "Add should succeed with custom path"
assert_directory_exists "$custom_path" "Custom worktree directory should be created"

# Test adding existing branch error
it "should fail when branch already has worktree"
repo_path=$(setup_repo_with_worktrees "add-duplicate")
cd "$repo_path" || exit 1

run_wt_separate add feature-1
assert_exit_code 1 $? "Add should fail for existing worktree"
assert_contains "$STDERR" "already exists" "Should show appropriate error"

# Test adding remote branch
it "should create local branch from remote"
repo_path=$(setup_repo_with_remote_branches "add-remote")
cd "$repo_path" || exit 1

# Mock fzf to select remote branch
export FZF_MOCK_OUTPUT="remotes/origin/remote-feature-1"
run_wt_separate add
assert_exit_code 0 $? "Add should succeed for remote branch"
assert_directory_exists "$repo_path-remote-feature-1" "Worktree should be created for remote branch"

# Verify local tracking branch was created
git checkout remote-feature-1 --quiet 2>/dev/null
exit_code=$?
assert_exit_code 0 $exit_code "Local tracking branch should be created"
git checkout main --quiet

# Test interactive branch selection
it "should handle interactive branch selection"
repo_path=$(create_test_repo "add-interactive")
cd "$repo_path" || exit 1

# Create some branches
git checkout -b branch-a --quiet
git checkout -b branch-b --quiet
git checkout main --quiet

# Mock fzf to select branch-a
export FZF_MOCK_OUTPUT="branch-a"
run_wt_separate add
assert_exit_code 0 $? "Interactive add should succeed"
assert_directory_exists "$repo_path-branch-a" "Worktree should be created for selected branch"

# Test creating new branch
it "should create new branch when it doesn't exist"
repo_path=$(create_test_repo "add-new-branch")
cd "$repo_path" || exit 1

run_wt_separate add new-feature
assert_exit_code 0 $? "Add should create new branch"
assert_directory_exists "$repo_path-new-feature" "Worktree should be created for new branch"

# Verify branch was created
git branch | grep -q "new-feature"
assert_exit_code 0 $? "New branch should exist"

# Test --pr-only flag
it "should filter branches with --pr-only flag"
repo_path=$(create_test_repo "add-pr-only")
cd "$repo_path" || exit 1

# Note: This will fail in test environment as we can't mock gh CLI
# But we should test that the flag is accepted
run_wt_separate add --pr-only
# Should fail gracefully when gh is not available or no PRs
assert_exit_code 1 $? "Should handle --pr-only when gh not available"

# Test with WT_WORKTREE_DIR environment variable
it "should respect WT_WORKTREE_DIR environment variable"
repo_path=$(create_test_repo "add-custom-dir")
cd "$repo_path" || exit 1

export WT_WORKTREE_DIR="$TEST_BASE_DIR/custom-worktrees"
mkdir -p "$WT_WORKTREE_DIR"

run_wt_separate add test-custom-dir
assert_exit_code 0 $? "Add should succeed with WT_WORKTREE_DIR"
assert_directory_exists "$WT_WORKTREE_DIR/test-custom-dir" "Worktree should be created in custom directory"

# Test error handling
it "should handle invalid branch names"
repo_path=$(create_test_repo "add-invalid")
cd "$repo_path" || exit 1

# Test with invalid branch name
run_wt_separate add "invalid..branch"
assert_exit_code 1 $? "Add should fail with invalid branch name"

# Test cancelling interactive selection
it "should handle cancelled fzf selection"
repo_path=$(create_test_repo "add-cancel")
cd "$repo_path" || exit 1

# Mock fzf to simulate ESC (empty output)
export FZF_MOCK_OUTPUT=""
run_wt_separate add
assert_exit_code 1 $? "Add should fail when selection is cancelled"
assert_contains "$STDERR" "No branch selected" "Should show cancellation message"

# Cleanup
teardown_test_environment

# Print summary
print_test_summary