#!/bin/bash

# Test helper functions for wt e2e shell tests

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test environment variables
export TEST_BASE_DIR="/tmp/wt-test-$$"
export GHQ_ROOT="$TEST_BASE_DIR/ghq"
export WT_CLI_PATH="${WT_CLI_PATH:-node $PWD/dist/index.js}"

# Setup functions
setup_test_environment() {
    mkdir -p "$TEST_BASE_DIR"
    mkdir -p "$GHQ_ROOT"
    
    # Set up environment variables
    export HOME="$TEST_BASE_DIR/home"
    mkdir -p "$HOME"
    
    # Create mock fzf if needed
    if [[ -n "$MOCK_FZF" ]]; then
        setup_mock_fzf
    fi
}

teardown_test_environment() {
    if [[ -d "$TEST_BASE_DIR" ]]; then
        rm -rf "$TEST_BASE_DIR"
    fi
}

# Git repository setup
create_test_repo() {
    local repo_name="${1:-test-repo}"
    local repo_path="$GHQ_ROOT/github.com/test/$repo_name"
    
    mkdir -p "$(dirname "$repo_path")"
    cd "$repo_path" || return 1
    
    git init --quiet
    git config user.name "Test User"
    git config user.email "test@example.com"
    
    # Create initial commit
    echo "# $repo_name" > README.md
    git add README.md
    git commit -m "Initial commit" --quiet
    
    # Set up a fake remote
    git remote add origin "https://github.com/test/$repo_name.git"
    
    echo "$repo_path"
}

create_branch() {
    local branch_name="$1"
    git checkout -b "$branch_name" --quiet 2>/dev/null || git checkout "$branch_name" --quiet
}

create_remote_branch() {
    local branch_name="$1"
    # Simulate a remote branch by creating it locally and prefixing with origin/
    git branch "remotes/origin/$branch_name" 2>/dev/null || true
}

# Mock fzf for non-interactive testing
setup_mock_fzf() {
    local mock_bin="$TEST_BASE_DIR/bin"
    mkdir -p "$mock_bin"
    
    cat > "$mock_bin/fzf" << 'EOF'
#!/bin/bash
# Mock fzf for testing
# Reads from FZF_MOCK_OUTPUT environment variable
if [[ -n "$FZF_MOCK_OUTPUT" ]]; then
    cat
    echo "$FZF_MOCK_OUTPUT"
    exit 0
else
    # If no mock output, exit with error (simulating ESC)
    cat >/dev/null
    exit 130
fi
EOF
    
    chmod +x "$mock_bin/fzf"
    export PATH="$mock_bin:$PATH"
}

# Test assertion functions
assert_equal() {
    local expected="$1"
    local actual="$2"
    local message="${3:-Assertion failed}"
    
    ((TESTS_RUN++))
    
    if [[ "$expected" == "$actual" ]]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}✓${NC} $message"
        return 0
    else
        ((TESTS_FAILED++))
        echo -e "${RED}✗${NC} $message"
        echo -e "  Expected: '$expected'"
        echo -e "  Actual:   '$actual'"
        return 1
    fi
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local message="${3:-String should contain substring}"
    
    ((TESTS_RUN++))
    
    if [[ "$haystack" == *"$needle"* ]]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}✓${NC} $message"
        return 0
    else
        ((TESTS_FAILED++))
        echo -e "${RED}✗${NC} $message"
        echo -e "  String:    '$haystack'"
        echo -e "  Should contain: '$needle'"
        return 1
    fi
}

assert_not_contains() {
    local haystack="$1"
    local needle="$2"
    local message="${3:-String should not contain substring}"
    
    ((TESTS_RUN++))
    
    if [[ "$haystack" != *"$needle"* ]]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}✓${NC} $message"
        return 0
    else
        ((TESTS_FAILED++))
        echo -e "${RED}✗${NC} $message"
        echo -e "  String:    '$haystack'"
        echo -e "  Should not contain: '$needle'"
        return 1
    fi
}

assert_exit_code() {
    local expected="$1"
    local actual="$2"
    local message="${3:-Exit code assertion}"
    
    ((TESTS_RUN++))
    
    if [[ "$expected" -eq "$actual" ]]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}✓${NC} $message (exit code: $actual)"
        return 0
    else
        ((TESTS_FAILED++))
        echo -e "${RED}✗${NC} $message"
        echo -e "  Expected exit code: $expected"
        echo -e "  Actual exit code:   $actual"
        return 1
    fi
}

assert_file_exists() {
    local file="$1"
    local message="${2:-File should exist}"
    
    ((TESTS_RUN++))
    
    if [[ -f "$file" ]]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}✓${NC} $message: $file"
        return 0
    else
        ((TESTS_FAILED++))
        echo -e "${RED}✗${NC} $message: $file"
        return 1
    fi
}

assert_directory_exists() {
    local dir="$1"
    local message="${2:-Directory should exist}"
    
    ((TESTS_RUN++))
    
    if [[ -d "$dir" ]]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}✓${NC} $message: $dir"
        return 0
    else
        ((TESTS_FAILED++))
        echo -e "${RED}✗${NC} $message: $dir"
        return 1
    fi
}

# Command execution helpers
run_wt() {
    local output
    local exit_code
    
    # Capture both stdout and stderr
    output=$($WT_CLI_PATH "$@" 2>&1)
    exit_code=$?
    
    echo "$output"
    return $exit_code
}

run_wt_separate() {
    # Run command and capture stdout/stderr separately
    local stdout_file="$TEST_BASE_DIR/stdout.tmp"
    local stderr_file="$TEST_BASE_DIR/stderr.tmp"
    
    $WT_CLI_PATH "$@" >"$stdout_file" 2>"$stderr_file"
    local exit_code=$?
    
    STDOUT=$(cat "$stdout_file")
    STDERR=$(cat "$stderr_file")
    
    rm -f "$stdout_file" "$stderr_file"
    
    return $exit_code
}

# Test suite helpers
describe() {
    local description="$1"
    echo
    echo -e "${YELLOW}$description${NC}"
}

it() {
    local description="$1"
    echo -n "  "
}

# Summary function
print_test_summary() {
    echo
    echo "----------------------------------------"
    echo "Test Summary:"
    echo "  Tests run:    $TESTS_RUN"
    echo -e "  Tests passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "  Tests failed: ${RED}$TESTS_FAILED${NC}"
    echo "----------------------------------------"
    
    if [[ $TESTS_FAILED -gt 0 ]]; then
        return 1
    else
        return 0
    fi
}

# Hook helpers
create_hook() {
    local hook_type="$1"  # pre-add, post-add, etc.
    local hook_location="$2"  # global or repo path
    local hook_content="$3"
    
    local hook_dir
    if [[ "$hook_location" == "global" ]]; then
        hook_dir="$HOME/.zsh/hooks/wt"
    else
        hook_dir="$hook_location/.wt/hooks"
    fi
    
    mkdir -p "$hook_dir"
    
    cat > "$hook_dir/$hook_type" << EOF
#!/bin/bash
$hook_content
EOF
    
    chmod +x "$hook_dir/$hook_type"
}

# Utility functions
wait_for_file() {
    local file="$1"
    local timeout="${2:-5}"
    local count=0
    
    while [[ ! -f "$file" ]] && [[ $count -lt $timeout ]]; do
        sleep 0.1
        ((count++))
    done
    
    [[ -f "$file" ]]
}

# Initialize test environment on source
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "This script should be sourced, not executed directly"
    exit 1
fi