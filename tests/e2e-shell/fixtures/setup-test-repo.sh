#!/bin/bash

# Setup script for creating test repositories with various configurations

source "$(dirname "$0")/../test-helpers.sh"

# Create a repository with multiple worktrees
setup_repo_with_worktrees() {
    local repo_name="${1:-multi-worktree-repo}"
    local repo_path=$(create_test_repo "$repo_name")
    
    cd "$repo_path" || return 1
    
    # Create some branches
    create_branch "feature-1"
    echo "Feature 1" > feature1.txt
    git add feature1.txt
    git commit -m "Add feature 1" --quiet
    
    create_branch "feature-2"
    echo "Feature 2" > feature2.txt
    git add feature2.txt
    git commit -m "Add feature 2" --quiet
    
    # Go back to main
    git checkout main --quiet
    
    # Create worktrees
    git worktree add "$repo_path-feature-1" feature-1 2>/dev/null || true
    git worktree add "$repo_path-feature-2" feature-2 2>/dev/null || true
    
    echo "$repo_path"
}

# Create a repository with remote branches
setup_repo_with_remote_branches() {
    local repo_name="${1:-remote-branches-repo}"
    local repo_path=$(create_test_repo "$repo_name")
    
    cd "$repo_path" || return 1
    
    # Simulate remote branches
    create_remote_branch "remote-feature-1"
    create_remote_branch "remote-feature-2"
    create_remote_branch "remote-feature-3"
    
    # Create a local branch that tracks a remote
    git checkout -b "local-tracking" --quiet
    git branch --set-upstream-to="origin/remote-feature-1" --quiet 2>/dev/null || true
    
    git checkout main --quiet
    
    echo "$repo_path"
}

# Create a repository with uncommitted changes
setup_repo_with_uncommitted_changes() {
    local repo_name="${1:-uncommitted-repo}"
    local repo_path=$(create_test_repo "$repo_name")
    
    cd "$repo_path" || return 1
    
    # Create a worktree
    create_branch "work-branch"
    git worktree add "$repo_path-work" work-branch 2>/dev/null || true
    
    # Add uncommitted changes to the worktree
    cd "$repo_path-work" || return 1
    echo "Uncommitted change" > uncommitted.txt
    git add uncommitted.txt
    
    cd "$repo_path" || return 1
    
    echo "$repo_path"
}

# Create a repository with hooks
setup_repo_with_hooks() {
    local repo_name="${1:-hooks-repo}"
    local repo_path=$(create_test_repo "$repo_name")
    
    cd "$repo_path" || return 1
    
    # Create repository-specific hooks
    create_hook "pre-add" "$repo_path" 'echo "Repo pre-add hook executed"'
    create_hook "post-add" "$repo_path" 'echo "Repo post-add hook executed with status: $4"'
    create_hook "pre-remove" "$repo_path" 'echo "Repo pre-remove hook executed"'
    create_hook "post-remove" "$repo_path" 'echo "Repo post-remove hook executed with status: $4"'
    
    echo "$repo_path"
}

# Create a bare repository (to simulate a remote)
setup_bare_repo() {
    local repo_name="${1:-bare-repo}"
    local repo_path="$GHQ_ROOT/github.com/test/$repo_name.git"
    
    mkdir -p "$(dirname "$repo_path")"
    git init --bare "$repo_path" --quiet
    
    echo "$repo_path"
}

# Create a repository that simulates GitHub PRs
setup_repo_with_prs() {
    local repo_name="${1:-pr-repo}"
    local repo_path=$(create_test_repo "$repo_name")
    
    cd "$repo_path" || return 1
    
    # Create branches that would have PRs
    create_branch "pr-branch-1"
    echo "PR 1" > pr1.txt
    git add pr1.txt
    git commit -m "PR 1 changes" --quiet
    
    create_branch "pr-branch-2"
    echo "PR 2" > pr2.txt
    git add pr2.txt
    git commit -m "PR 2 changes" --quiet
    
    # Create a merged branch
    create_branch "merged-pr-branch"
    echo "Merged PR" > merged.txt
    git add merged.txt
    git commit -m "Merged PR changes" --quiet
    
    # Merge it to main
    git checkout main --quiet
    git merge merged-pr-branch --quiet
    
    # Create worktrees for PR branches
    git worktree add "$repo_path-pr-1" pr-branch-1 2>/dev/null || true
    git worktree add "$repo_path-pr-2" pr-branch-2 2>/dev/null || true
    git worktree add "$repo_path-merged" merged-pr-branch 2>/dev/null || true
    
    echo "$repo_path"
}

# Create a repository with locked worktree
setup_repo_with_locked_worktree() {
    local repo_name="${1:-locked-repo}"
    local repo_path=$(create_test_repo "$repo_name")
    
    cd "$repo_path" || return 1
    
    # Create a worktree
    create_branch "locked-branch"
    git worktree add "$repo_path-locked" locked-branch 2>/dev/null || true
    
    # Lock the worktree
    git worktree lock "$repo_path-locked" --reason="Test lock" 2>/dev/null || {
        # Fallback for older git versions
        touch "$repo_path/.git/worktrees/locked/locked"
    }
    
    echo "$repo_path"
}

# Main function to setup all test repositories
setup_all_test_repos() {
    echo "Setting up test repositories..."
    
    setup_repo_with_worktrees
    setup_repo_with_remote_branches
    setup_repo_with_uncommitted_changes
    setup_repo_with_hooks
    setup_repo_with_prs
    setup_repo_with_locked_worktree
    
    echo "Test repositories created in: $GHQ_ROOT"
}

# If run directly, setup all repos
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    setup_test_environment
    setup_all_test_repos
fi