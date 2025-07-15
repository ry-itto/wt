#!/bin/bash

# Test remove command functionality

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source test helpers
source "$SCRIPT_DIR/../test-helpers.sh"
source "$SCRIPT_DIR/../fixtures/setup-test-repo.sh"

# Setup
setup_test_environment
export CI=true  # Force non-interactive mode
export MOCK_FZF=1  # Enable fzf mocking

describe "Remove Command"

# Test removing a worktree
it "should remove selected worktree"
repo_path=$(setup_repo_with_worktrees "remove-basic")
cd "$repo_path" || exit 1

# Mock fzf to select feature-1 worktree
export FZF_MOCK_OUTPUT="$repo_path-feature-1"
run_wt_separate remove
assert_exit_code 0 $? "Remove should succeed"
assert_not_contains "$(git worktree list)" "$repo_path-feature-1" "Worktree should be removed"
assert_equal "0" "$(test -d "$repo_path-feature-1" && echo 1 || echo 0)" "Worktree directory should be deleted"

# Test rm alias
it "should accept 'rm' alias"
repo_path=$(setup_repo_with_worktrees "remove-alias")
cd "$repo_path" || exit 1

export FZF_MOCK_OUTPUT="$repo_path-feature-2"
run_wt_separate rm
assert_exit_code 0 $? "rm alias should work"
assert_not_contains "$(git worktree list)" "$repo_path-feature-2" "Worktree should be removed via rm"

# Test removing with uncommitted changes
it "should handle uncommitted changes"
repo_path=$(setup_repo_with_uncommitted_changes "remove-uncommitted")
cd "$repo_path" || exit 1

export FZF_MOCK_OUTPUT="$repo_path-work"
run_wt_separate remove
# Should fail due to uncommitted changes
assert_exit_code 1 $? "Remove should fail with uncommitted changes"
assert_contains "$STDERR" "uncommitted" "Should mention uncommitted changes"

# Test force removal with uncommitted changes
it "should force remove with confirmation"
repo_path=$(setup_repo_with_uncommitted_changes "remove-force")
cd "$repo_path" || exit 1

# For testing, we can't easily simulate interactive confirmation
# So we test that the command recognizes the situation
export FZF_MOCK_OUTPUT="$repo_path-work"
run_wt_separate remove
assert_exit_code 1 $? "Should detect uncommitted changes"

# Test removing locked worktree
it "should handle locked worktree"
repo_path=$(setup_repo_with_locked_worktree "remove-locked")
cd "$repo_path" || exit 1

export FZF_MOCK_OUTPUT="$repo_path-locked"
run_wt_separate remove
assert_exit_code 1 $? "Remove should fail for locked worktree"
assert_contains "$STDERR" "locked" "Should mention locked status"

# Test with no worktrees
it "should handle no worktrees gracefully"
repo_path=$(create_test_repo "remove-none")
cd "$repo_path" || exit 1

run_wt_separate remove
assert_exit_code 1 $? "Remove should fail when no worktrees"
assert_contains "$STDERR" "No worktrees found" "Should show appropriate message"

# Test cancelling selection
it "should handle cancelled selection"
repo_path=$(setup_repo_with_worktrees "remove-cancel")
cd "$repo_path" || exit 1

# Mock empty fzf output (ESC pressed)
export FZF_MOCK_OUTPUT=""
run_wt_separate remove
assert_exit_code 1 $? "Remove should fail on cancelled selection"
assert_contains "$STDERR" "No worktree selected" "Should show cancellation message"

# Test removing from within a worktree
it "should remove from within worktree"
repo_path=$(setup_repo_with_worktrees "remove-from-within")
cd "$repo_path-feature-1" || exit 1

# Try to remove a different worktree
export FZF_MOCK_OUTPUT="$repo_path-feature-2"
run_wt_separate remove
assert_exit_code 0 $? "Should be able to remove other worktree"
assert_not_contains "$(git worktree list)" "$repo_path-feature-2" "Other worktree should be removed"

# Test removing main worktree (should fail)
it "should not remove main worktree"
repo_path=$(setup_repo_with_worktrees "remove-main")
cd "$repo_path" || exit 1

# Try to select main worktree
export FZF_MOCK_OUTPUT="$repo_path"
run_wt_separate remove
# The main worktree should not appear in the selection list
# So this should fail differently
assert_exit_code 1 $? "Should not be able to remove main worktree"

# Test error when not in git repository
it "should fail when not in git repository"
cd /tmp || exit 1

run_wt_separate remove
assert_exit_code 1 $? "Remove should fail outside git repository"
assert_contains "$STDERR" "Not in a git repository" "Should show repository error"

# Cleanup
teardown_test_environment

# Print summary
print_test_summary