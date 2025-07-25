#!/bin/sh

# Test basic commands: help, version, and command structure

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Source test helpers
. "$SCRIPT_DIR/../test-helpers.sh"
. "$SCRIPT_DIR/../fixtures/setup-test-repo.sh"

# Setup
setup_test_environment

describe "Basic Commands"

# Test --help flag
it "should display help with --help flag"
run_wt_separate --help
assert_exit_code 0 $? "Help command should exit successfully"
assert_contains "$STDOUT" "Git worktree operations wrapper" "Help should contain description"
assert_contains "$STDOUT" "Commands:" "Help should list commands"
assert_contains "$STDOUT" "list" "Help should show list command"
assert_contains "$STDOUT" "add" "Help should show add command"
assert_contains "$STDOUT" "remove" "Help should show remove command"
assert_contains "$STDOUT" "prune" "Help should show prune command"
assert_contains "$STDOUT" "cd" "Help should show cd command"
assert_contains "$STDOUT" "shell-init" "Help should show shell-init command"

# Test -h flag (short form)
it "should display help with -h flag"
run_wt_separate -h
assert_exit_code 0 $? "Help command with -h should exit successfully"
assert_contains "$STDOUT" "Git worktree operations wrapper" "Short help flag should work"

# Test --version flag
it "should display version with --version flag"
run_wt_separate --version
assert_exit_code 0 $? "Version command should exit successfully"
# Version should be in format X.Y.Z
assert_equal "1" $(echo "$STDOUT" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | wc -l) "Version should be in X.Y.Z format"

# Test -V flag (short form)
it "should display version with -V flag"
run_wt_separate -V
assert_exit_code 0 $? "Version command with -V should exit successfully"
assert_equal "1" $(echo "$STDOUT" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | wc -l) "Short version flag should work"

# Test command help
it "should show help for add command"
run_wt_separate add --help
assert_exit_code 0 $? "Add command help should exit successfully"
assert_contains "$STDOUT" "add" "Add command help should mention 'add'"
assert_contains "$STDOUT" "branch" "Add command help should mention branch parameter"

it "should show help for remove command"
run_wt_separate remove --help
assert_exit_code 0 $? "Remove command help should exit successfully"
assert_contains "$STDOUT" "remove" "Remove command help should mention 'remove'"

it "should show help for prune command"
run_wt_separate prune --help
assert_exit_code 0 $? "Prune command help should exit successfully"
assert_contains "$STDOUT" "prune" "Prune command help should mention 'prune'"
# Note: Commander.js doesn't show subcommand options with --help flag

# Test invalid commands
it "should handle invalid command gracefully"
# Mock fzf to return empty (cancelled)
export MOCK_FZF=1
export FZF_MOCK_OUTPUT=""
run_wt_separate invalid-command 2>&1
assert_exit_code 1 $? "Invalid command should fail when no worktree selected"

# Test command aliases
it "should accept 'rm' as alias for 'remove'"
# Create a test repo first
repo_path=$(create_test_repo "alias-test")
cd "$repo_path" || exit 1

# Set CI environment to avoid interactive mode
export CI=true
run_wt_separate rm
assert_exit_code 1 $? "Remove command should fail in non-interactive mode"
# Check both STDOUT and STDERR as the message might go to either
output="$STDOUT$STDERR"
# Either message is acceptable - depends on whether there are removable worktrees
if [[ "$output" == *"No removable worktrees found"* ]] || [[ "$output" == *"Interactive selection not available"* ]]; then
    pass "rm alias should show appropriate error"
else
    fail "rm alias should show appropriate error" "Expected 'No removable worktrees found' or 'Interactive selection not available'" "$output"
fi

# Cleanup
teardown_test_environment

# Print summary
print_test_summary