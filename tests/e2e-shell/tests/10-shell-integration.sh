#!/usr/bin/env bash

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Source test helpers
. "$SCRIPT_DIR/../test-helpers.sh"

# Set up test environment
setup_test_environment

# Test suite
describe "Shell Integration"

# Test basic shell-init command
it "should generate shell integration function"
output=$(run_wt shell-init)
assert_exit_code 0 $? "shell-init should succeed"
assert_contains "$output" "# wt shell integration" "Should have header comment"
assert_contains "$output" "wt()" "Should define wt function"
assert_contains "$output" "WT_SWITCH_FILE" "Should use switch file mechanism"
assert_contains "$output" "WT_SWITCH_FILE=" "Should set switch file env var"

# Test function content
it "should handle cd and other commands correctly"
output=$(run_wt shell-init)
# The implementation uses if/elif/else instead of case
assert_contains "$output" "if [ \$# -eq 0 ]" "Should handle no arguments"
assert_contains "$output" 'elif [ "$1" = "cd" ]' "Should handle cd command"
assert_contains "$output" "else" "Should handle other commands"
assert_contains "$output" "fi" "Should close if statements"

# Test global vs local installation detection
it "should detect global installation"
# Simulate global installation by setting WT_CLI_PATH
# Save current WT_CLI_PATH
ORIGINAL_WT_CLI_PATH="$WT_CLI_PATH"
output=$(WT_CLI_PATH="wt" eval "$WT_CLI_PATH shell-init" 2>&1)
assert_contains "$output" 'command wt' "Should use 'command wt' for global install"
# Restore original WT_CLI_PATH
WT_CLI_PATH="$ORIGINAL_WT_CLI_PATH"

# Test with custom WT_CLI_PATH
it "should respect WT_CLI_PATH environment variable"
# Save current WT_CLI_PATH
ORIGINAL_WT_CLI_PATH="$WT_CLI_PATH"
output=$(WT_CLI_PATH="/custom/path/to/wt" eval "$ORIGINAL_WT_CLI_PATH shell-init" 2>&1)
assert_contains "$output" '/custom/path/to/wt' "Should use custom CLI path"
# Restore original WT_CLI_PATH
WT_CLI_PATH="$ORIGINAL_WT_CLI_PATH"


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

# Cleanup
teardown_test_environment

# Print summary
print_test_summary