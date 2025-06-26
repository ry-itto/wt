# wt wrapper function for directory changing
wtcd() {
    local result=$(node "$HOME/.zsh/bin/wt/dist/index.js" cd)
    if [ -n "$result" ]; then
        eval "$result"
    fi
}

# wt default wrapper function
wt() {
    if [ $# -eq 0 ]; then
        local selected_path=$(node "$HOME/.zsh/bin/wt/dist/index.js")
        if [ -n "$selected_path" ]; then
            cd "$selected_path"
        fi
    elif [ "$1" = "cd" ]; then
        wtcd
    else
        node "$HOME/.zsh/bin/wt/dist/index.js" "$@"
    fi
}

# Hook system is now file-based
# See ~/.zsh/hooks/wt/README.md for setup instructions
# Example hooks are available at:
# - ~/.zsh/hooks/wt/pre-add.example
# - ~/.zsh/hooks/wt/post-add.example
#
# TypeScript version setup:
# 1. Build the project: cd $HOME/.zsh/bin/wt && npm run build
# 2. Ensure Node.js is available in your PATH

