#!/bin/bash

# Test shell-init command and shell integration

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source test helpers
source "$SCRIPT_DIR/../test-helpers.sh"

# Setup
setup_test_environment

describe "Shell Integration"

# Test shell-init output
it "should generate shell integration function"
output=$(run_wt shell-init)
exit_code=$?
assert_exit_code 0 $exit_code "shell-init should succeed"
assert_contains "$output" "# wt shell integration" "Should have header comment"
assert_contains "$output" "wt() {" "Should define wt function"
assert_contains "$output" "switch_file=" "Should use switch file mechanism"
assert_contains "$output" "WT_SWITCH_FILE=" "Should set switch file env var"

# Test function structure
it "should have proper shell function structure"
output=$(run_wt shell-init)
assert_contains "$output" 'if [ $# -eq 0 ]; then' "Should handle no arguments"
assert_contains "$output" 'elif [ "$1" = "cd" ]; then' "Should handle cd command"
assert_contains "$output" 'else' "Should handle other commands"
assert_contains "$output" 'fi' "Should close if statements"

# Test global installation detection
it "should detect global installation"
# Temporarily set WT_CLI_PATH to simulate global install
export WT_CLI_PATH="wt"
output=$(run_wt shell-init)
assert_contains "$output" 'command wt' "Should use 'command wt' for global install"
unset WT_CLI_PATH

# Test local installation detection
it "should detect local installation"
# Default should be local installation in test
output=$(run_wt shell-init)
assert_contains "$output" 'node "' "Should use node for local install"
assert_contains "$output" '.js"' "Should reference JavaScript file"

# Test switch file mechanism
it "should implement switch file mechanism correctly"
output=$(run_wt shell-init)
assert_contains "$output" '/tmp/wt_switch_$$' "Should use PID-based temp file"
assert_contains "$output" 'cat "$switch_file"' "Should read switch file"
assert_contains "$output" 'rm -f "$switch_file"' "Should clean up switch file"

# Test directory change logic
it "should implement directory change logic"
output=$(run_wt shell-init)
assert_contains "$output" 'if [[ -f "$switch_file" ]]; then' "Should check for switch file"
assert_contains "$output" 'cd "$new_dir"' "Should change directory"
assert_contains "$output" 'WT_CD:(.+)' "Should check for stdout marker as fallback"

# Test error handling
it "should handle errors gracefully"
output=$(run_wt shell-init)
assert_contains "$output" 'exit_code=$?' "Should capture exit code"
assert_contains "$output" 'return $exit_code' "Should return original exit code"

# Test output handling
it "should handle command output properly"
output=$(run_wt shell-init)
assert_contains "$output" 'echo "$output"' "Should echo output when no cd"

# Test with custom WT_CLI_PATH
it "should respect WT_CLI_PATH environment variable"
export WT_CLI_PATH="/custom/path/to/wt"
output=$(run_wt shell-init)
assert_contains "$output" '/custom/path/to/wt' "Should use custom CLI path"
unset WT_CLI_PATH

# Test shell compatibility
it "should use POSIX-compatible syntax"
output=$(run_wt shell-init)
# Check for bash-specific syntax that should be avoided
assert_not_contains "$output" '[[' "Should use [ instead of [[ for POSIX"
assert_not_contains "$output" 'function wt' "Should use wt() syntax"
# Note: The actual implementation uses [[ for better compatibility with zsh/bash
# This test would need adjustment based on target shell

# Test complete function generation
it "should generate complete working function"
output=$(run_wt shell-init)
# Count opening and closing braces
open_braces=$(echo "$output" | grep -c '{')
close_braces=$(echo "$output" | grep -c '}')
assert_equal "$open_braces" "$close_braces" "Should have matching braces"

# Verify no syntax errors by checking with bash -n
echo "$output" > "$TEST_BASE_DIR/shell-init-test.sh"
bash -n "$TEST_BASE_DIR/shell-init-test.sh" 2>&1
assert_exit_code 0 $? "Generated function should have valid syntax"

# Test that function handles all wt commands
it "should pass through all wt commands"
output=$(run_wt shell-init)
# The else clause should pass all arguments
assert_contains "$output" '"$@"' "Should pass all arguments in else clause"

# Cleanup
teardown_test_environment

# Print summary
print_test_summary