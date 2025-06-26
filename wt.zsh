# wt shell integration - dynamically generated
# To regenerate this integration, run: wt shell-init > wt.zsh

# Default CLI path - can be overridden with WT_CLI_PATH environment variable
WT_DEFAULT_CLI_PATH="${HOME}/.zsh/bin/wt/dist/index.js"
WT_CLI_PATH="${WT_CLI_PATH:-$WT_DEFAULT_CLI_PATH}"

# wt shell integration function
wt() {
  if [ $# -eq 0 ]; then
    local output=$(node "$WT_CLI_PATH")
    if [[ "$output" =~ ^WT_CD_FILE=(.+)$ ]]; then
      local cd_file="${BASH_REMATCH[1]}"
      if [ -f "$cd_file" ]; then
        local target_dir=$(cat "$cd_file")
        rm -f "$cd_file"
        if [ -d "$target_dir" ]; then
          cd "$target_dir"
        fi
      fi
    fi
  elif [ "$1" = "cd" ]; then
    local output=$(node "$WT_CLI_PATH" cd)
    if [[ "$output" =~ ^WT_CD_FILE=(.+)$ ]]; then
      local cd_file="${BASH_REMATCH[1]}"
      if [ -f "$cd_file" ]; then
        local target_dir=$(cat "$cd_file")
        rm -f "$cd_file"
        if [ -d "$target_dir" ]; then
          cd "$target_dir"
        fi
      fi
    fi
  else
    node "$WT_CLI_PATH" "$@"
  fi
}

# Setup instructions:
# 1. Build the project: cd $HOME/.zsh/bin/wt && npm run build
# 2. Source this file in your shell configuration
# 3. Optionally set WT_CLI_PATH to custom location
#
# For dynamic generation: wt shell-init > wt.zsh

