#!/bin/sh

# Prune command E2E tests

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/../test-helpers.sh"

describe "05. prune command"

setup_test_environment

# Create a test repo in ghq structure and move into it
REPO_PATH=$(create_test_repo "prune-repo")
cd "$REPO_PATH" || exit 1

# Helper: create mock gh that simulates availability, auth, and merged PR list
setup_mock_gh_with_merged() {
  local merged_branch="$1"
  local mock_bin="$TEST_BASE_DIR/bin"
  mkdir -p "$mock_bin"
  cat > "$mock_bin/gh" << 'EOF'
#!/bin/sh
case "$1" in
  --version)
    echo "gh version 2.0.0"
    exit 0
    ;;
  auth)
    if [ "$2" = "status" ]; then
      # Authenticated
      exit 0
    fi
    ;;
  pr)
    if [ "$2" = "list" ]; then
      # Output merged PRs JSON for the branch specified via GH_MOCK_MERGED_BRANCH
      if [ -n "$GH_MOCK_MERGED_BRANCH" ]; then
        echo "[ { \"number\": 101, \"title\": \"Merged PR\", \"headRefName\": \"$GH_MOCK_MERGED_BRANCH\", \"state\": \"MERGED\", \"mergedAt\": \"2024-01-01T00:00:00Z\" } ]"
      else
        echo "[]"
      fi
      exit 0
    fi
    ;;
esac
exit 0
EOF
  chmod +x "$mock_bin/gh"
  export PATH="$mock_bin:$PATH"
  export GH_MOCK_MERGED_BRANCH="$merged_branch"
}

# Helper: create mock gh that simulates gh unavailable (not installed)
setup_mock_gh_unavailable() {
  local mock_bin="$TEST_BASE_DIR/bin"
  mkdir -p "$mock_bin"
  cat > "$mock_bin/gh" << 'EOF'
#!/bin/sh
# Simulate command not working
exit 127
EOF
  chmod +x "$mock_bin/gh"
  export PATH="$mock_bin:$PATH"
}

# Prepare branches and worktrees
create_branch feature-merged
echo merged > file-merged.txt && git add file-merged.txt && git commit -m "feat: merged branch" --quiet

create_branch feature-open
echo open > file-open.txt && git add file-open.txt && git commit -m "feat: open branch" --quiet

create_branch stale-remote
echo stale > file-stale.txt && git add file-stale.txt && git commit -m "feat: stale remote branch" --quiet

# Create worktrees for each branch
run_wt_separate add feature-merged "$REPO_PATH-feature-merged"
assert_exit_code 0 $? "Should add worktree for feature-merged"

run_wt_separate add feature-open "$REPO_PATH-feature-open"
assert_exit_code 0 $? "Should add worktree for feature-open"

run_wt_separate add stale-remote "$REPO_PATH-stale-remote"
assert_exit_code 0 $? "Should add worktree for stale-remote"

# Ensure directories exist
assert_directory_exists "$REPO_PATH-feature-merged" "Worktree should exist for feature-merged"
assert_directory_exists "$REPO_PATH-feature-open" "Worktree should exist for feature-open"
assert_directory_exists "$REPO_PATH-stale-remote" "Worktree should exist for stale-remote"

# 1) When gh is unavailable, merged-only mode should skip pruning safely
it "should skip prune when gh is unavailable (merged-only default)"
setup_mock_gh_unavailable
run_wt_separate prune
assert_exit_code 0 $? "Prune should exit successfully even if skipping"
assert_contains "$STDOUT$STDERR" "Cannot verify merged PRs" "Should warn about inability to verify PRs"
# Verify no removals happened
assert_directory_exists "$REPO_PATH-feature-merged" "Should not remove any worktree"
assert_directory_exists "$REPO_PATH-feature-open" "Should not remove any worktree"
assert_directory_exists "$REPO_PATH-stale-remote" "Should not remove any worktree"

# 2) With gh available, default prune should target only merged PR branches
it "should prune only branches with merged PRs by default"
setup_mock_gh_with_merged "feature-merged"
run_wt_separate prune --dry-run
assert_exit_code 0 $? "Dry-run should succeed"
assert_contains "$STDOUT" "feature-merged" "Should list merged PR branch"
assert_not_contains "$STDOUT" "feature-open" "Should not list non-merged branch"
assert_not_contains "$STDOUT" "stale-remote" "Should not list deleted-remote without --all"

# Now actually prune with force to skip confirmation
run_wt_separate prune --force
assert_exit_code 0 $? "Prune should complete successfully"
if [ -d "$REPO_PATH-feature-merged" ]; then
  fail "feature-merged worktree should be removed" "absent" "present"
else
  pass "feature-merged worktree removed"
fi
assert_directory_exists "$REPO_PATH-feature-open" "feature-open worktree should remain"
assert_directory_exists "$REPO_PATH-stale-remote" "stale-remote worktree should remain"

# 3) With --all, include deleted remote branches
it "should include deleted remote branches when --all is specified"
run_wt_separate prune --all --dry-run
assert_exit_code 0 $? "Dry-run with --all should succeed"
assert_contains "$STDOUT" "stale-remote" "Should list remote-deleted branch with --all"
assert_contains "$STDOUT" "Reason: Branch deleted on remote" "Should show deleted-branch reason"

# Actually prune deleted remote branch
run_wt_separate prune --all --force
assert_exit_code 0 $? "Prune --all should complete successfully"
if [ -d "$REPO_PATH-stale-remote" ]; then
  fail "stale-remote worktree should be removed" "absent" "present"
else
  pass "stale-remote worktree removed"
fi

print_test_summary || FAILED=1
teardown_test_environment

exit ${FAILED:-0}

