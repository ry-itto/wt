#!/bin/bash

# Test basic commands: help, version, and command structure

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source test helpers
source "$SCRIPT_DIR/../test-helpers.sh"

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
assert_contains "$STDOUT" "--dry-run" "Prune command help should show dry-run option"
assert_contains "$STDOUT" "--force" "Prune command help should show force option"

# Test invalid commands
it "should handle invalid command gracefully"
run_wt_separate invalid-command 2>&1
assert_exit_code 0 $? "Invalid command should be handled as pass-through pattern"

# Test command aliases
it "should accept 'rm' as alias for 'remove'"
# Create a test repo first
repo_path=$(create_test_repo "alias-test")
cd "$repo_path" || exit 1

# Set CI environment to avoid interactive mode
export CI=true
run_wt_separate rm
assert_exit_code 1 $? "Remove command should fail when no worktrees exist"
assert_contains "$STDERR" "No worktrees found" "rm alias should work like remove"

# Cleanup
teardown_test_environment

# Print summary
print_test_summary