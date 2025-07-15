#!/bin/bash

# Test list command functionality

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source test helpers
source "$SCRIPT_DIR/../test-helpers.sh"
source "$SCRIPT_DIR/../fixtures/setup-test-repo.sh"

# Setup
setup_test_environment

describe "List Command"

# Test listing with no worktrees
it "should handle repository with no worktrees"
repo_path=$(create_test_repo "no-worktrees")
cd "$repo_path" || exit 1

output=$(run_wt list)
exit_code=$?
assert_exit_code 0 $exit_code "List should succeed even with no worktrees"
assert_contains "$output" "$repo_path" "Should show main worktree path"
assert_contains "$output" "(main)" "Should indicate main worktree"

# Test listing with multiple worktrees
it "should list all worktrees"
repo_path=$(setup_repo_with_worktrees "list-test")
cd "$repo_path" || exit 1

output=$(run_wt list)
exit_code=$?
assert_exit_code 0 $exit_code "List should succeed with multiple worktrees"
assert_contains "$output" "$repo_path" "Should show main worktree"
assert_contains "$output" "(main)" "Should mark main worktree"
assert_contains "$output" "feature-1" "Should show feature-1 worktree"
assert_contains "$output" "feature-2" "Should show feature-2 worktree"
assert_contains "$output" "$repo_path-feature-1" "Should show feature-1 path"
assert_contains "$output" "$repo_path-feature-2" "Should show feature-2 path"

# Test listing from within a worktree
it "should list from within a worktree"
repo_path=$(setup_repo_with_worktrees "list-from-worktree")
cd "$repo_path-feature-1" || exit 1

output=$(run_wt list)
exit_code=$?
assert_exit_code 0 $exit_code "List should work from within worktree"
assert_contains "$output" "$repo_path" "Should show main worktree from feature worktree"
assert_contains "$output" "feature-1" "Should show current worktree"
assert_contains "$output" "feature-2" "Should show other worktree"

# Test output format
it "should format output correctly"
repo_path=$(setup_repo_with_worktrees "format-test")
cd "$repo_path" || exit 1

output=$(run_wt list)
# Check that each line contains both path and branch info
line_count=$(echo "$output" | wc -l)
assert_equal "3" "$line_count" "Should have 3 lines for 3 worktrees"

# Verify each line has expected format (path followed by branch)
while IFS= read -r line; do
    # Each line should have at least two parts when split
    parts=($line)
    [[ ${#parts[@]} -ge 2 ]] || assert_equal "2+" "${#parts[@]}" "Each line should have path and branch"
done <<< "$output"

# Test with locked worktree
it "should list locked worktrees"
repo_path=$(setup_repo_with_locked_worktree "list-locked")
cd "$repo_path" || exit 1

output=$(run_wt list)
exit_code=$?
assert_exit_code 0 $exit_code "List should succeed with locked worktree"
assert_contains "$output" "locked-branch" "Should show locked worktree"

# Test error handling
it "should fail when not in a git repository"
cd /tmp || exit 1

run_wt_separate list
assert_exit_code 1 $? "List should fail outside git repository"
assert_contains "$STDERR" "Not in a git repository" "Should show appropriate error"

# Test from non-ghq directory
it "should fail when not in ghq structure"
# Create a git repo outside ghq structure
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
assert_exit_code 1 $? "List should fail outside ghq structure"
assert_contains "$STDERR" "Not in a git repository" "Should show repository error"

rm -rf "$temp_repo"

# Cleanup
teardown_test_environment

# Print summary
print_test_summary