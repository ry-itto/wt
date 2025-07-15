#!/bin/bash

# Docker-based e2e shell test runner for wt CLI
# This script runs the e2e shell tests in isolated Docker containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default values
NODE_VERSION=${NODE_VERSION:-20}
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
TEST_SERVICE=""
BUILD_ONLY=false
SHELL_MODE=false
CLEAN_MODE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --node)
            NODE_VERSION="$2"
            shift 2
            ;;
        --all)
            TEST_SERVICE="all"
            shift
            ;;
        --build)
            BUILD_ONLY=true
            shift
            ;;
        --shell)
            SHELL_MODE=true
            shift
            ;;
        --clean)
            CLEAN_MODE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --node VERSION    Run tests with specific Node.js version (18, 20, 22)"
            echo "  --all             Run tests with all Node.js versions"
            echo "  --build           Build Docker images only"
            echo "  --shell           Start interactive shell in container"
            echo "  --clean           Clean up Docker images and test results"
            echo "  --help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                      # Run tests with Node.js 20"
            echo "  $0 --node 18            # Run tests with Node.js 18"
            echo "  $0 --all                # Run tests with all Node.js versions"
            echo "  $0 --shell              # Start interactive shell for debugging"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Clean mode
if [[ "$CLEAN_MODE" == true ]]; then
    echo -e "${YELLOW}Cleaning up Docker images and test results...${NC}"
    
    # Remove test result directories
    rm -rf "$SCRIPT_DIR/test-results"
    
    # Remove Docker images
    docker-compose -f "$COMPOSE_FILE" down --rmi all --volumes --remove-orphans
    
    echo -e "${GREEN}Cleanup completed${NC}"
    exit 0
fi

# Change to project root for Docker context
cd "$PROJECT_ROOT"

# Build Docker images
build_images() {
    echo -e "${BLUE}Building Docker images...${NC}"
    
    if [[ "$TEST_SERVICE" == "all" ]]; then
        docker-compose -f "$COMPOSE_FILE" build test-node18 test-node20 test-node22
    else
        docker-compose -f "$COMPOSE_FILE" build "test-node${NODE_VERSION}"
    fi
    
    echo -e "${GREEN}Docker images built successfully${NC}"
}

# Run tests in Docker
run_tests() {
    local service="$1"
    local node_version="$2"
    
    echo -e "${BLUE}Running e2e shell tests with Node.js ${node_version}...${NC}"
    
    # Create test results directory
    mkdir -p "$SCRIPT_DIR/test-results/node${node_version}"
    
    # Run the tests
    if docker-compose -f "$COMPOSE_FILE" run --rm "$service"; then
        echo -e "${GREEN}✓ Tests passed for Node.js ${node_version}${NC}"
        return 0
    else
        echo -e "${RED}✗ Tests failed for Node.js ${node_version}${NC}"
        return 1
    fi
}

# Main execution
main() {
    # Build images
    build_images
    
    if [[ "$BUILD_ONLY" == true ]]; then
        echo -e "${GREEN}Build completed${NC}"
        exit 0
    fi
    
    # Shell mode
    if [[ "$SHELL_MODE" == true ]]; then
        echo -e "${YELLOW}Starting interactive shell in test container...${NC}"
        echo -e "${YELLOW}Run 'bash tests/e2e-shell/run-all-tests.sh' to execute tests${NC}"
        docker-compose -f "$COMPOSE_FILE" run --rm test-shell
        exit 0
    fi
    
    # Run tests
    local failed=false
    
    if [[ "$TEST_SERVICE" == "all" ]]; then
        # Run tests for all Node.js versions
        for version in 18 20 22; do
            if ! run_tests "test-node${version}" "$version"; then
                failed=true
            fi
            echo
        done
    else
        # Run tests for specific Node.js version
        if ! run_tests "test-node${NODE_VERSION}" "$NODE_VERSION"; then
            failed=true
        fi
    fi
    
    # Summary
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}                Test Summary${NC}"
    echo -e "${BLUE}================================================${NC}"
    
    if [[ "$failed" == true ]]; then
        echo -e "${RED}Some tests failed. Check the logs above for details.${NC}"
        echo -e "Test results saved in: $SCRIPT_DIR/test-results/"
        exit 1
    else
        echo -e "${GREEN}All tests passed! 🎉${NC}"
        exit 0
    fi
}

# Run main function
main