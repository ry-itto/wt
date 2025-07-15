#!/bin/bash

# Minimal Apple Container CLI test runner for wt CLI
# Uses Alpine-based image with mocked dependencies to avoid network issues

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
IMAGE_NAME="wt-test-minimal:node${NODE_VERSION}"
CONTAINER_NAME="wt-test-minimal-node${NODE_VERSION}"

# Check if container CLI is installed
check_container_cli() {
    if ! command -v container &> /dev/null; then
        echo -e "${RED}Error: Apple Container CLI is not installed${NC}"
        echo "Please install from: https://github.com/apple/container/releases"
        exit 1
    fi
    echo -e "${GREEN}✓ Apple Container CLI found${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Minimal test runner that works around Apple Container CLI network limitations"
            echo ""
            echo "This version:"
            echo "- Uses Alpine Linux (smaller, no network access needed)"
            echo "- Mocks fzf and ghq to avoid installation"
            echo "- Runs a subset of tests that don't require full environment"
            echo ""
            echo "Note: This is a workaround for Container CLI network restrictions."
            echo "      For full testing, use Docker or run tests locally."
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check container CLI installation
check_container_cli

# Change to project root for build context
cd "$PROJECT_ROOT"

# Build container image
echo -e "${BLUE}Building minimal container image...${NC}"
echo -e "${YELLOW}Note: This uses mocked dependencies due to Container CLI network limitations${NC}"

if container build \
    --build-arg NODE_VERSION="${NODE_VERSION}" \
    --tag "${IMAGE_NAME}" \
    --file tests/e2e-shell/Dockerfile.container-cli-minimal \
    .; then
    echo -e "${GREEN}Container image built successfully${NC}"
else
    echo -e "${RED}Failed to build container image${NC}"
    echo -e "${YELLOW}This might be due to Container CLI network restrictions${NC}"
    echo -e "${YELLOW}Try using Docker instead: npm run test:docker${NC}"
    exit 1
fi

# Run tests
echo -e "${BLUE}Running minimal e2e tests...${NC}"
echo -e "${YELLOW}Note: Some tests may be skipped due to mocked dependencies${NC}"

# Create test results directory
mkdir -p "$SCRIPT_DIR/test-results/minimal"

# Run the tests
if container run \
    --rm \
    --name "${CONTAINER_NAME}" \
    --volume "$SCRIPT_DIR/test-results/minimal:/app/tests/e2e-shell/test-output" \
    "${IMAGE_NAME}"; then
    echo -e "${GREEN}✓ Minimal tests passed${NC}"
    echo -e "${YELLOW}Note: This was a limited test run with mocked dependencies${NC}"
    echo -e "${YELLOW}For comprehensive testing, use Docker or run locally${NC}"
    exit 0
else
    echo -e "${RED}✗ Tests failed${NC}"
    exit 1
fi