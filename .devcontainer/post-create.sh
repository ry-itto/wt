#!/bin/bash

echo "Setting up wt development environment..."

# Install npm dependencies
echo "Installing npm dependencies..."
npm install

# Build the project
echo "Building the project..."
npm run build

# Set up shell integration for testing
echo "Setting up shell integration..."
./dist/index.js shell-init > ~/.wt-integration.zsh
echo "source ~/.wt-integration.zsh" >> ~/.zshrc

# Create example hooks directory
mkdir -p ~/.zsh/hooks/wt

# Set up git configuration for development
git config --global --add safe.directory /workspace

# Display setup completion message
echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "Available commands:"
echo "  npm run dev       - Run in development mode"
echo "  npm run build     - Build the project"
echo "  npm run test      - Run all tests"
echo "  npm run lint      - Run linter"
echo "  npm run typecheck - Run type checking"
echo ""
echo "The 'wt' command is available for testing after building."
echo ""