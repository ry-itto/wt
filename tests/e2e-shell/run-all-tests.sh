#!/bin/bash

# Main test runner for wt e2e shell tests

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TESTS_DIR="$SCRIPT_DIR/tests"
FAILED_TESTS=()
PASSED_TESTS=()
TOTAL_TIME=0

# Banner
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}       wt CLI E2E Shell Tests Runner${NC}"
echo -e "${BLUE}================================================${NC}"
echo

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    # Check if node is available
    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗ Node.js is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"
    
    # Check if git is available
    if ! command -v git &> /dev/null; then
        echo -e "${RED}✗ Git is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Git found: $(git --version | head -n1)${NC}"
    
    # Check if the project is built
    if [[ ! -f "$SCRIPT_DIR/../../dist/index.js" ]]; then
        echo -e "${YELLOW}⚠ Project not built. Building now...${NC}"
        (cd "$SCRIPT_DIR/../.." && npm run build)
        if [[ $? -ne 0 ]]; then
            echo -e "${RED}✗ Build failed${NC}"
            exit 1
        fi
    fi
    echo -e "${GREEN}✓ Project is built${NC}"
    
    # Set WT_CLI_PATH if not already set
    if [[ -z "$WT_CLI_PATH" ]]; then
        export WT_CLI_PATH="node $SCRIPT_DIR/../../dist/index.js"
    fi
    echo -e "${GREEN}✓ WT_CLI_PATH set to: $WT_CLI_PATH${NC}"
    
    echo
}

# Run a single test file
run_test() {
    local test_file="$1"
    local test_name=$(basename "$test_file" .sh)
    
    echo -e "${YELLOW}Running $test_name...${NC}"
    
    # Run the test and capture output
    local start_time=$(date +%s)
    local output_file="$SCRIPT_DIR/test-output-$test_name.log"
    
    if bash "$test_file" > "$output_file" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        TOTAL_TIME=$((TOTAL_TIME + duration))
        
        echo -e "${GREEN}✓ $test_name passed (${duration}s)${NC}"
        PASSED_TESTS+=("$test_name")
        
        # Show test summary from output
        if grep -q "Test Summary:" "$output_file"; then
            grep -A 3 "Test Summary:" "$output_file" | sed 's/^/  /'
        fi
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        TOTAL_TIME=$((TOTAL_TIME + duration))
        
        echo -e "${RED}✗ $test_name failed (${duration}s)${NC}"
        FAILED_TESTS+=("$test_name")
        
        # Show failure details
        echo -e "${RED}  Error output:${NC}"
        tail -n 20 "$output_file" | sed 's/^/    /'
        echo -e "${RED}  Full output saved to: $output_file${NC}"
    fi
    
    echo
}

# Run all tests
run_all_tests() {
    # Find all test files
    local test_files=($(find "$TESTS_DIR" -name "*.sh" -type f | sort))
    
    if [[ ${#test_files[@]} -eq 0 ]]; then
        echo -e "${RED}No test files found in $TESTS_DIR${NC}"
        exit 1
    fi
    
    echo "Found ${#test_files[@]} test files"
    echo
    
    # Run each test
    for test_file in "${test_files[@]}"; do
        # Make sure the test file is executable
        chmod +x "$test_file"
        run_test "$test_file"
    done
}

# Print final summary
print_summary() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}                Test Summary${NC}"
    echo -e "${BLUE}================================================${NC}"
    
    local total_tests=$((${#PASSED_TESTS[@]} + ${#FAILED_TESTS[@]}))
    
    echo "Total tests run: $total_tests"
    echo "Time taken: ${TOTAL_TIME}s"
    echo
    
    if [[ ${#PASSED_TESTS[@]} -gt 0 ]]; then
        echo -e "${GREEN}Passed (${#PASSED_TESTS[@]}):${NC}"
        for test in "${PASSED_TESTS[@]}"; do
            echo -e "  ${GREEN}✓ $test${NC}"
        done
    fi
    
    if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
        echo
        echo -e "${RED}Failed (${#FAILED_TESTS[@]}):${NC}"
        for test in "${FAILED_TESTS[@]}"; do
            echo -e "  ${RED}✗ $test${NC}"
        done
    fi
    
    echo
    
    if [[ ${#FAILED_TESTS[@]} -eq 0 ]]; then
        echo -e "${GREEN}All tests passed! 🎉${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed. Please check the output logs.${NC}"
        return 1
    fi
}

# Clean up old test outputs
cleanup() {
    rm -f "$SCRIPT_DIR"/test-output-*.log
}

# Main execution
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --clean)
                cleanup
                echo "Cleaned up old test outputs"
                exit 0
                ;;
            --help|-h)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --clean    Clean up old test output files"
                echo "  --help     Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
        shift
    done
    
    # Run tests
    check_prerequisites
    run_all_tests
    print_summary
    
    # Exit with appropriate code
    if [[ ${#FAILED_TESTS[@]} -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"