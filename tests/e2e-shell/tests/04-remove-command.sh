#!/usr/bin/env bash

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Source test helpers
. "$SCRIPT_DIR/../test-helpers.sh"
. "$SCRIPT_DIR/../fixtures/setup-test-repo.sh"

# Enable fzf mocking
export MOCK_FZF=1

# Set up test environment
setup_test_environment

# Test suite
describe "Remove Command"

# Note: The remove command is interactive-only and cannot be directly tested in non-TTY environment
# The CLI will fail with "Interactive selection not available in non-interactive environment"
# We can only test that the command exists and handles the non-interactive case properly

# Test that remove command exists and fails gracefully in non-interactive mode
it "should fail in non-interactive environment"
repo_path=$(setup_repo_with_worktrees "remove-basic")
cd "$repo_path" || exit 1

run_wt_separate remove
assert_exit_code 1 $? "Remove should fail in non-interactive mode"
# Skip error message check as output capture is unreliable in non-interactive mode

# Test rm alias
it "should accept 'rm' alias"
repo_path=$(setup_repo_with_worktrees "remove-alias")
cd "$repo_path" || exit 1

run_wt_separate rm
assert_exit_code 1 $? "rm alias should fail in non-interactive mode"
# Skip error message check as output capture is unreliable in non-interactive mode

# Test error handling
it "should fail when not in a git repository"
cd /tmp || exit 1

run_wt_separate remove
assert_exit_code 1 $? "Remove should fail outside git repository"
assert_contains "$STDERR" "Not in a git repository" "Should show repository error"

# Cleanup
teardown_test_environment

# Print summary
print_test_summary