#!/bin/bash

# Test error scenarios and edge cases

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source test helpers
source "$SCRIPT_DIR/../test-helpers.sh"
source "$SCRIPT_DIR/../fixtures/setup-test-repo.sh"

# Setup
setup_test_environment
export CI=true  # Force non-interactive mode

describe "Error Scenarios"

# Test not in git repository
it "should fail when not in git repository"
cd /tmp || exit 1

# Test various commands
run_wt_separate list
assert_exit_code 1 $? "list should fail outside git repo"
assert_contains "$STDERR" "Not in a git repository" "Should show git error"

run_wt_separate add test-branch
assert_exit_code 1 $? "add should fail outside git repo"
assert_contains "$STDERR" "Not in a git repository" "Should show git error"

run_wt_separate remove
assert_exit_code 1 $? "remove should fail outside git repo"
assert_contains "$STDERR" "Not in a git repository" "Should show git error"

# Test not in ghq structure
it "should fail when not in ghq directory structure"
# Create a git repo outside ghq
temp_repo="/tmp/wt-test-non-ghq-$$"
mkdir -p "$temp_repo"
cd "$temp_repo" || exit 1
git init --quiet
git config user.name "Test"
git config user.email "test@example.com"
touch README.md
git add README.md
git commit -m "Initial" --quiet

run_wt_separate list
assert_exit_code 1 $? "Should fail outside ghq structure"

rm -rf "$temp_repo"

# Test with corrupted git directory
it "should handle corrupted git directory"
repo_path=$(create_test_repo "corrupted")
cd "$repo_path" || exit 1

# Corrupt the git directory
rm -rf .git/refs

run_wt_separate list
assert_exit_code 1 $? "Should fail with corrupted git"

# Test permission issues
it "should handle permission denied"
repo_path=$(create_test_repo "permission")
cd "$repo_path" || exit 1

# Create a directory with no write permission
mkdir -p "$TEST_BASE_DIR/no-write"
chmod 555 "$TEST_BASE_DIR/no-write"

run_wt_separate add test-branch "$TEST_BASE_DIR/no-write/worktree"
assert_exit_code 1 $? "Should fail with permission denied"

chmod 755 "$TEST_BASE_DIR/no-write"
rm -rf "$TEST_BASE_DIR/no-write"

# Test invalid branch names
it "should reject invalid branch names"
repo_path=$(create_test_repo "invalid-branch")
cd "$repo_path" || exit 1

# Various invalid branch names
run_wt_separate add "branch..name"
assert_exit_code 1 $? "Should reject branch with .."

run_wt_separate add "branch name with spaces"
assert_exit_code 1 $? "Should reject branch with spaces"

run_wt_separate add ".branch"
assert_exit_code 1 $? "Should reject branch starting with ."

run_wt_separate add "branch/"
assert_exit_code 1 $? "Should reject branch ending with /"

# Test fzf not available
it "should handle missing fzf gracefully"
repo_path=$(setup_repo_with_worktrees "no-fzf")
cd "$repo_path" || exit 1

# Remove fzf from PATH by creating a function that fails
fzf() {
    echo "fzf: command not found" >&2
    return 127
}
export -f fzf

run_wt_separate remove
assert_exit_code 1 $? "Should fail when fzf not available"
assert_contains "$STDERR" "Interactive selection not available" "Should mention fzf issue"

unset -f fzf

# Test empty repository (no commits)
it "should handle empty repository"
empty_repo="$GHQ_ROOT/github.com/test/empty-repo"
mkdir -p "$(dirname "$empty_repo")"
cd "$empty_repo" || exit 1
git init --quiet

run_wt_separate list
assert_exit_code 1 $? "Should handle empty repo"

# Test cyclic worktree reference
it "should handle cyclic references"
repo_path=$(create_test_repo "cyclic")
cd "$repo_path" || exit 1

# Create a worktree
git worktree add "$repo_path-work" -b work --quiet

# Try to create another worktree inside the first one
cd "$repo_path-work" || exit 1
run_wt_separate add nested
assert_exit_code 1 $? "Should fail creating nested worktree"

# Test long path names
it "should handle very long paths"
repo_path=$(create_test_repo "long-path")
cd "$repo_path" || exit 1

# Create a very long path
long_path="$TEST_BASE_DIR"
for i in {1..50}; do
    long_path="$long_path/very_long_directory_name_$i"
done

run_wt_separate add test-long "$long_path"
assert_exit_code 1 $? "Should fail with too long path"

# Test with detached HEAD
it "should handle detached HEAD state"
repo_path=$(create_test_repo "detached")
cd "$repo_path" || exit 1

# Create a commit and checkout the commit directly (detached HEAD)
echo "test" > file.txt
git add file.txt
git commit -m "test commit" --quiet
commit_hash=$(git rev-parse HEAD)
git checkout "$commit_hash" --quiet 2>&1

run_wt_separate list
assert_exit_code 0 $? "Should handle detached HEAD"

# Test concurrent operations
it "should handle concurrent worktree operations"
repo_path=$(create_test_repo "concurrent")
cd "$repo_path" || exit 1

# Start multiple add operations in background
(run_wt add branch1 >/dev/null 2>&1) &
(run_wt add branch2 >/dev/null 2>&1) &
(run_wt add branch3 >/dev/null 2>&1) &

# Wait for all to complete
wait

# At least one should succeed
worktree_count=$(git worktree list | wc -l)
assert_equal "1" "$([[ $worktree_count -gt 1 ]] && echo 1 || echo 0)" "At least one worktree should be created"

# Cleanup
teardown_test_environment

# Print summary
print_test_summary