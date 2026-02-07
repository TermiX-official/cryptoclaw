#!/bin/bash
set -euo pipefail

# CryptoClaw Installer for macOS and Linux
# Usage: curl -fsSL https://raw.githubusercontent.com/TermiX-official/cryptoclaw/main/install.sh | bash

BOLD='\033[1m'
ACCENT='\033[38;2;16;185;129m'
# shellcheck disable=SC2034
ACCENT_BRIGHT='\033[38;2;52;211;153m'
ACCENT_DIM='\033[38;2;5;150;105m'
INFO='\033[38;2;52;211;153m'
SUCCESS='\033[38;2;16;185;129m'
WARN='\033[38;2;255;176;32m'
ERROR='\033[38;2;226;61;45m'
MUTED='\033[38;2;139;127;119m'
NC='\033[0m' # No Color

DEFAULT_TAGLINE="Your keys, your claws, your chain."

ORIGINAL_PATH="${PATH:-}"

TMPFILES=()
cleanup_tmpfiles() {
    local f
    for f in "${TMPFILES[@]:-}"; do
        rm -f "$f" 2>/dev/null || true
    done
}
trap cleanup_tmpfiles EXIT

mktempfile() {
    local f
    f="$(mktemp)"
    TMPFILES+=("$f")
    echo "$f"
}

DOWNLOADER=""
detect_downloader() {
    if command -v curl &> /dev/null; then
        DOWNLOADER="curl"
        return 0
    fi
    if command -v wget &> /dev/null; then
        DOWNLOADER="wget"
        return 0
    fi
    echo -e "${ERROR}Error: Missing downloader (curl or wget required)${NC}"
    exit 1
}

download_file() {
    local url="$1"
    local output="$2"
    if [[ -z "$DOWNLOADER" ]]; then
        detect_downloader
    fi
    if [[ "$DOWNLOADER" == "curl" ]]; then
        curl -fsSL --proto '=https' --tlsv1.2 --retry 3 --retry-delay 1 --retry-connrefused -o "$output" "$url"
        return
    fi
    wget -q --https-only --secure-protocol=TLSv1_2 --tries=3 --timeout=20 -O "$output" "$url"
}

run_remote_bash() {
    local url="$1"
    local tmp
    tmp="$(mktempfile)"
    download_file "$url" "$tmp"
    /bin/bash "$tmp"
}

cleanup_npm_cryptoclaw_paths() {
    local npm_root=""
    npm_root="$(npm root -g 2>/dev/null || true)"
    if [[ -z "$npm_root" || "$npm_root" != *node_modules* ]]; then
        return 1
    fi
    rm -rf "$npm_root"/.cryptoclaw-* "$npm_root"/@termix-it/cryptoclaw 2>/dev/null || true
}

extract_cryptoclaw_conflict_path() {
    local log="$1"
    local path=""
    path="$(sed -n 's/.*File exists: //p' "$log" | head -n1)"
    if [[ -z "$path" ]]; then
        path="$(sed -n 's/.*EEXIST: file already exists, //p' "$log" | head -n1)"
    fi
    if [[ -n "$path" ]]; then
        echo "$path"
        return 0
    fi
    return 1
}

cleanup_cryptoclaw_bin_conflict() {
    local bin_path="$1"
    if [[ -z "$bin_path" || ( ! -e "$bin_path" && ! -L "$bin_path" ) ]]; then
        return 1
    fi
    local npm_bin=""
    npm_bin="$(npm_global_bin_dir 2>/dev/null || true)"
    if [[ -n "$npm_bin" && "$bin_path" != "$npm_bin/cryptoclaw" ]]; then
        case "$bin_path" in
            "/opt/homebrew/bin/cryptoclaw"|"/usr/local/bin/cryptoclaw")
                ;;
            *)
                return 1
                ;;
        esac
    fi
    if [[ -L "$bin_path" ]]; then
        local target=""
        target="$(readlink "$bin_path" 2>/dev/null || true)"
        if [[ "$target" == *"/node_modules/"*"cryptoclaw/"* ]]; then
            rm -f "$bin_path"
            echo -e "${WARN}→${NC} Removed stale cryptoclaw symlink at ${INFO}${bin_path}${NC}"
            return 0
        fi
        return 1
    fi
    local backup=""
    backup="${bin_path}.bak-$(date +%Y%m%d-%H%M%S)"
    if mv "$bin_path" "$backup"; then
        echo -e "${WARN}→${NC} Moved existing cryptoclaw binary to ${INFO}${backup}${NC}"
        return 0
    fi
    return 1
}

install_cryptoclaw_npm() {
    local spec="$1"
    local log
    log="$(mktempfile)"
    if ! SHARP_IGNORE_GLOBAL_LIBVIPS="$SHARP_IGNORE_GLOBAL_LIBVIPS" npm --loglevel "$NPM_LOGLEVEL" ${NPM_SILENT_FLAG:+$NPM_SILENT_FLAG} --no-fund --no-audit install -g "$spec" 2>&1 | tee "$log"; then
        if grep -q "ENOTEMPTY: directory not empty, rename .*cryptoclaw" "$log"; then
            echo -e "${WARN}→${NC} npm left a stale cryptoclaw directory; cleaning and retrying..."
            cleanup_npm_cryptoclaw_paths
            SHARP_IGNORE_GLOBAL_LIBVIPS="$SHARP_IGNORE_GLOBAL_LIBVIPS" npm --loglevel "$NPM_LOGLEVEL" ${NPM_SILENT_FLAG:+$NPM_SILENT_FLAG} --no-fund --no-audit install -g "$spec"
            return $?
        fi
        if grep -q "EEXIST" "$log"; then
            local conflict=""
            conflict="$(extract_cryptoclaw_conflict_path "$log" || true)"
            if [[ -n "$conflict" ]] && cleanup_cryptoclaw_bin_conflict "$conflict"; then
                SHARP_IGNORE_GLOBAL_LIBVIPS="$SHARP_IGNORE_GLOBAL_LIBVIPS" npm --loglevel "$NPM_LOGLEVEL" ${NPM_SILENT_FLAG:+$NPM_SILENT_FLAG} --no-fund --no-audit install -g "$spec"
                return $?
            fi
            echo -e "${ERROR}npm failed because a cryptoclaw binary already exists.${NC}"
            if [[ -n "$conflict" ]]; then
                echo -e "${INFO}i${NC} Remove or move ${INFO}${conflict}${NC}, then retry."
            fi
            echo -e "${INFO}i${NC} Or rerun with ${INFO}npm install -g --force ${spec}${NC} (overwrites)."
        fi
        return 1
    fi
    return 0
}

TAGLINES=()
TAGLINES+=("Your keys, your claws, your chain.")
TAGLINES+=("Self-custody meets AI automation.")
TAGLINES+=("DeFi doesn't sleep, and neither does your agent.")
TAGLINES+=("Not your keys, not your crypto. We keep both safe.")
TAGLINES+=("Multi-chain, multi-channel, multi-talented.")
TAGLINES+=("From wallet to swap in one command.")
TAGLINES+=("The AI agent that actually holds its own keys.")
TAGLINES+=("Claws out, chains synced—let's trade.")
TAGLINES+=("Portfolio tracking at 3AM? I got you.")
TAGLINES+=("Because even lobsters need a hardware wallet.")
TAGLINES+=("AES-256-GCM encrypted, scrypt hardened, lobster approved.")
TAGLINES+=("Your terminal just grew claws and a blockchain.")
TAGLINES+=("One CLI to rule all chains.")
TAGLINES+=("Private keys stay private. That's the whole point.")
TAGLINES+=("Swap tokens, not security for convenience.")
TAGLINES+=("16 chains, one lobster, zero trust issues.")
TAGLINES+=("I speak fluent Solidity, mild sarcasm, and aggressive gas optimization.")
TAGLINES+=("WhatsApp your portfolio, Telegram your trades, Signal your secrets.")
TAGLINES+=("I don't judge your trades, but your slippage tolerance is... brave.")
TAGLINES+=("Hot reload for config, cold storage for keys.")
TAGLINES+=("I'll refactor your DeFi strategy like it owes me gas fees.")
TAGLINES+=("On-chain identity via ERC-8004. Because even AI agents need a passport.")
TAGLINES+=("Spending limits exist because YOLO is not a trading strategy.")
TAGLINES+=("I can track it, swap it, and gently roast your gas spending.")
TAGLINES+=("curl for conversations, claws for transactions.")

pick_tagline() {
    local count=${#TAGLINES[@]}
    if [[ "$count" -eq 0 ]]; then
        echo "$DEFAULT_TAGLINE"
        return
    fi
    if [[ -n "${CRYPTOCLAW_TAGLINE_INDEX:-}" ]]; then
        if [[ "${CRYPTOCLAW_TAGLINE_INDEX}" =~ ^[0-9]+$ ]]; then
            local idx=$((CRYPTOCLAW_TAGLINE_INDEX % count))
            echo "${TAGLINES[$idx]}"
            return
        fi
    fi
    local idx=$((RANDOM % count))
    echo "${TAGLINES[$idx]}"
}

TAGLINE=$(pick_tagline)

NO_ONBOARD=${CRYPTOCLAW_NO_ONBOARD:-0}
NO_PROMPT=${CRYPTOCLAW_NO_PROMPT:-0}
DRY_RUN=${CRYPTOCLAW_DRY_RUN:-0}
INSTALL_METHOD=${CRYPTOCLAW_INSTALL_METHOD:-}
CRYPTOCLAW_VERSION=${CRYPTOCLAW_VERSION:-latest}
USE_BETA=${CRYPTOCLAW_BETA:-0}
GIT_DIR_DEFAULT="${HOME}/cryptoclaw"
GIT_DIR=${CRYPTOCLAW_GIT_DIR:-$GIT_DIR_DEFAULT}
GIT_UPDATE=${CRYPTOCLAW_GIT_UPDATE:-1}
SHARP_IGNORE_GLOBAL_LIBVIPS="${SHARP_IGNORE_GLOBAL_LIBVIPS:-1}"
NPM_LOGLEVEL="${CRYPTOCLAW_NPM_LOGLEVEL:-error}"
NPM_SILENT_FLAG="--silent"
VERBOSE="${CRYPTOCLAW_VERBOSE:-0}"
CRYPTOCLAW_BIN=""
HELP=0

print_usage() {
    cat <<EOF
CryptoClaw installer (macOS + Linux)

Usage:
  curl -fsSL https://raw.githubusercontent.com/TermiX-official/cryptoclaw/main/install.sh | bash -s -- [options]

Options:
  --install-method, --method npm|git   Install via npm (default) or from a git checkout
  --npm                               Shortcut for --install-method npm
  --git, --github                     Shortcut for --install-method git
  --version <version|dist-tag>         npm install: version (default: latest)
  --beta                               Use beta if available, else latest
  --git-dir, --dir <path>             Checkout directory (default: ~/cryptoclaw)
  --no-git-update                      Skip git pull for existing checkout
  --no-onboard                          Skip onboarding (non-interactive)
  --no-prompt                           Disable prompts (required in CI/automation)
  --dry-run                             Print what would happen (no changes)
  --verbose                             Print debug output (set -x, npm verbose)
  --help, -h                            Show this help

Environment variables:
  CRYPTOCLAW_INSTALL_METHOD=git|npm
  CRYPTOCLAW_VERSION=latest|next|<semver>
  CRYPTOCLAW_BETA=0|1
  CRYPTOCLAW_GIT_DIR=...
  CRYPTOCLAW_GIT_UPDATE=0|1
  CRYPTOCLAW_NO_PROMPT=1
  CRYPTOCLAW_DRY_RUN=1
  CRYPTOCLAW_NO_ONBOARD=1
  CRYPTOCLAW_VERBOSE=1
  CRYPTOCLAW_NPM_LOGLEVEL=error|warn|notice  Default: error (hide npm deprecation noise)
  SHARP_IGNORE_GLOBAL_LIBVIPS=0|1    Default: 1 (avoid sharp building against global libvips)

Examples:
  curl -fsSL https://raw.githubusercontent.com/TermiX-official/cryptoclaw/main/install.sh | bash
  curl -fsSL https://raw.githubusercontent.com/TermiX-official/cryptoclaw/main/install.sh | bash -s -- --no-onboard
  curl -fsSL https://raw.githubusercontent.com/TermiX-official/cryptoclaw/main/install.sh | bash -s -- --install-method git --no-onboard
EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --no-onboard)
                NO_ONBOARD=1
                shift
                ;;
            --onboard)
                NO_ONBOARD=0
                shift
                ;;
            --dry-run)
                DRY_RUN=1
                shift
                ;;
            --verbose)
                VERBOSE=1
                shift
                ;;
            --no-prompt)
                NO_PROMPT=1
                shift
                ;;
            --help|-h)
                HELP=1
                shift
                ;;
            --install-method|--method)
                INSTALL_METHOD="$2"
                shift 2
                ;;
            --version)
                CRYPTOCLAW_VERSION="$2"
                shift 2
                ;;
            --beta)
                USE_BETA=1
                shift
                ;;
            --npm)
                INSTALL_METHOD="npm"
                shift
                ;;
            --git|--github)
                INSTALL_METHOD="git"
                shift
                ;;
            --git-dir|--dir)
                GIT_DIR="$2"
                shift 2
                ;;
            --no-git-update)
                GIT_UPDATE=0
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
}

configure_verbose() {
    if [[ "$VERBOSE" != "1" ]]; then
        return 0
    fi
    if [[ "$NPM_LOGLEVEL" == "error" ]]; then
        NPM_LOGLEVEL="notice"
    fi
    NPM_SILENT_FLAG=""
    set -x
}

is_promptable() {
    if [[ "$NO_PROMPT" == "1" ]]; then
        return 1
    fi
    if [[ -r /dev/tty && -w /dev/tty ]]; then
        return 0
    fi
    return 1
}

prompt_choice() {
    local prompt="$1"
    local answer=""
    if ! is_promptable; then
        return 1
    fi
    echo -e "$prompt" > /dev/tty
    read -r answer < /dev/tty || true
    echo "$answer"
}

detect_cryptoclaw_checkout() {
    local dir="$1"
    if [[ ! -f "$dir/package.json" ]]; then
        return 1
    fi
    if [[ ! -f "$dir/pnpm-workspace.yaml" ]]; then
        return 1
    fi
    if ! grep -q '"name"[[:space:]]*:[[:space:]]*".*cryptoclaw"' "$dir/package.json" 2>/dev/null; then
        return 1
    fi
    echo "$dir"
    return 0
}

echo -e "${ACCENT}${BOLD}"
echo "  🦞⛓️  CryptoClaw Installer"
echo -e "${NC}${ACCENT_DIM}  ${TAGLINE}${NC}"
echo ""

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]] || [[ -n "${WSL_DISTRO_NAME:-}" ]]; then
    OS="linux"
fi

if [[ "$OS" == "unknown" ]]; then
    echo -e "${ERROR}Error: Unsupported operating system${NC}"
    echo "This installer supports macOS and Linux (including WSL)."
    echo "For Windows, use: npm install -g @termix-it/cryptoclaw@latest"
    exit 1
fi

echo -e "${SUCCESS}✓${NC} Detected: $OS"

# Check for Homebrew on macOS
install_homebrew() {
    if [[ "$OS" == "macos" ]]; then
        if ! command -v brew &> /dev/null; then
            echo -e "${WARN}→${NC} Installing Homebrew..."
            run_remote_bash "https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh"

            # Add Homebrew to PATH for this session
            if [[ -f "/opt/homebrew/bin/brew" ]]; then
                eval "$(/opt/homebrew/bin/brew shellenv)"
            elif [[ -f "/usr/local/bin/brew" ]]; then
                eval "$(/usr/local/bin/brew shellenv)"
            fi
            echo -e "${SUCCESS}✓${NC} Homebrew installed"
        else
            echo -e "${SUCCESS}✓${NC} Homebrew already installed"
        fi
    fi
}

# Check Node.js version
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$NODE_VERSION" -ge 22 ]]; then
            echo -e "${SUCCESS}✓${NC} Node.js v$(node -v | cut -d'v' -f2) found"
            return 0
        else
            echo -e "${WARN}→${NC} Node.js $(node -v) found, but v22+ required"
            return 1
        fi
    else
        echo -e "${WARN}→${NC} Node.js not found"
        return 1
    fi
}

# Install Node.js
install_node() {
    if [[ "$OS" == "macos" ]]; then
        echo -e "${WARN}→${NC} Installing Node.js via Homebrew..."
        brew install node@22
        brew link node@22 --overwrite --force 2>/dev/null || true
        echo -e "${SUCCESS}✓${NC} Node.js installed"
    elif [[ "$OS" == "linux" ]]; then
        echo -e "${WARN}→${NC} Installing Node.js via NodeSource..."
        require_sudo
        if command -v apt-get &> /dev/null; then
            local tmp
            tmp="$(mktempfile)"
            download_file "https://deb.nodesource.com/setup_22.x" "$tmp"
            maybe_sudo -E bash "$tmp"
            maybe_sudo apt-get install -y nodejs
        elif command -v dnf &> /dev/null; then
            local tmp
            tmp="$(mktempfile)"
            download_file "https://rpm.nodesource.com/setup_22.x" "$tmp"
            maybe_sudo bash "$tmp"
            maybe_sudo dnf install -y nodejs
        elif command -v yum &> /dev/null; then
            local tmp
            tmp="$(mktempfile)"
            download_file "https://rpm.nodesource.com/setup_22.x" "$tmp"
            maybe_sudo bash "$tmp"
            maybe_sudo yum install -y nodejs
        else
            echo -e "${ERROR}Error: Could not detect package manager${NC}"
            echo "Please install Node.js 22+ manually: https://nodejs.org"
            exit 1
        fi
        echo -e "${SUCCESS}✓${NC} Node.js installed"
    fi
}

# Check Git
check_git() {
    if command -v git &> /dev/null; then
        echo -e "${SUCCESS}✓${NC} Git already installed"
        return 0
    fi
    echo -e "${WARN}→${NC} Git not found"
    return 1
}

is_root() {
    [[ "$(id -u)" -eq 0 ]]
}

# Run a command with sudo only if not already root
maybe_sudo() {
    if is_root; then
        if [[ "${1:-}" == "-E" ]]; then
            shift
        fi
        "$@"
    else
        sudo "$@"
    fi
}

require_sudo() {
    if [[ "$OS" != "linux" ]]; then
        return 0
    fi
    if is_root; then
        return 0
    fi
    if command -v sudo &> /dev/null; then
        return 0
    fi
    echo -e "${ERROR}Error: sudo is required for system installs on Linux${NC}"
    echo "Install sudo or re-run as root."
    exit 1
}

install_git() {
    echo -e "${WARN}→${NC} Installing Git..."
    if [[ "$OS" == "macos" ]]; then
        brew install git
    elif [[ "$OS" == "linux" ]]; then
        require_sudo
        if command -v apt-get &> /dev/null; then
            maybe_sudo apt-get update -y
            maybe_sudo apt-get install -y git
        elif command -v dnf &> /dev/null; then
            maybe_sudo dnf install -y git
        elif command -v yum &> /dev/null; then
            maybe_sudo yum install -y git
        else
            echo -e "${ERROR}Error: Could not detect package manager for Git${NC}"
            exit 1
        fi
    fi
    echo -e "${SUCCESS}✓${NC} Git installed"
}

# Fix npm permissions for global installs (Linux)
fix_npm_permissions() {
    if [[ "$OS" != "linux" ]]; then
        return 0
    fi

    local npm_prefix
    npm_prefix="$(npm config get prefix 2>/dev/null || true)"
    if [[ -z "$npm_prefix" ]]; then
        return 0
    fi

    if [[ -w "$npm_prefix" || -w "$npm_prefix/lib" ]]; then
        return 0
    fi

    echo -e "${WARN}→${NC} Configuring npm for user-local installs..."
    mkdir -p "$HOME/.npm-global"
    npm config set prefix "$HOME/.npm-global"

    # shellcheck disable=SC2016
    local path_line='export PATH="$HOME/.npm-global/bin:$PATH"'
    for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
        if [[ -f "$rc" ]] && ! grep -q ".npm-global" "$rc"; then
            echo "$path_line" >> "$rc"
        fi
    done

    export PATH="$HOME/.npm-global/bin:$PATH"
    echo -e "${SUCCESS}✓${NC} npm configured for user installs"
}

npm_global_bin_dir() {
    local prefix=""
    prefix="$(npm prefix -g 2>/dev/null || true)"
    if [[ -n "$prefix" ]]; then
        if [[ "$prefix" == /* ]]; then
            echo "${prefix%/}/bin"
            return 0
        fi
    fi

    prefix="$(npm config get prefix 2>/dev/null || true)"
    if [[ -n "$prefix" && "$prefix" != "undefined" && "$prefix" != "null" ]]; then
        if [[ "$prefix" == /* ]]; then
            echo "${prefix%/}/bin"
            return 0
        fi
    fi

    echo ""
    return 1
}

refresh_shell_command_cache() {
    hash -r 2>/dev/null || true
}

path_has_dir() {
    local path="$1"
    local dir="${2%/}"
    if [[ -z "$dir" ]]; then
        return 1
    fi
    case ":${path}:" in
        *":${dir}:"*) return 0 ;;
        *) return 1 ;;
    esac
}

warn_shell_path_missing_dir() {
    local dir="${1%/}"
    local label="$2"
    if [[ -z "$dir" ]]; then
        return 0
    fi
    if path_has_dir "$ORIGINAL_PATH" "$dir"; then
        return 0
    fi

    echo ""
    echo -e "${WARN}→${NC} PATH warning: missing ${label}: ${INFO}${dir}${NC}"
    echo -e "This can make ${INFO}cryptoclaw${NC} show as \"command not found\" in new terminals."
    echo -e "Fix (zsh: ~/.zshrc, bash: ~/.bashrc):"
    echo -e "  export PATH=\"${dir}:\\$PATH\""
}

ensure_npm_global_bin_on_path() {
    local bin_dir=""
    bin_dir="$(npm_global_bin_dir || true)"
    if [[ -n "$bin_dir" ]]; then
        export PATH="${bin_dir}:$PATH"
    fi
}

maybe_nodenv_rehash() {
    if command -v nodenv &> /dev/null; then
        nodenv rehash >/dev/null 2>&1 || true
    fi
}

warn_cryptoclaw_not_found() {
    echo -e "${WARN}→${NC} Installed, but ${INFO}cryptoclaw${NC} is not discoverable on PATH in this shell."
    echo -e "Try: ${INFO}hash -r${NC} (bash) or ${INFO}rehash${NC} (zsh), then retry."
    local t=""
    t="$(type -t cryptoclaw 2>/dev/null || true)"
    if [[ "$t" == "alias" || "$t" == "function" ]]; then
        echo -e "${WARN}→${NC} Found a shell ${INFO}${t}${NC} named ${INFO}cryptoclaw${NC}; it may shadow the real binary."
    fi
    if command -v nodenv &> /dev/null; then
        echo -e "Using nodenv? Run: ${INFO}nodenv rehash${NC}"
    fi

    local npm_prefix=""
    npm_prefix="$(npm prefix -g 2>/dev/null || true)"
    local npm_bin=""
    npm_bin="$(npm_global_bin_dir 2>/dev/null || true)"
    if [[ -n "$npm_prefix" ]]; then
        echo -e "npm prefix -g: ${INFO}${npm_prefix}${NC}"
    fi
    if [[ -n "$npm_bin" ]]; then
        echo -e "npm bin -g: ${INFO}${npm_bin}${NC}"
        echo -e "If needed: ${INFO}export PATH=\"${npm_bin}:\\$PATH\"${NC}"
    fi
}

resolve_cryptoclaw_bin() {
    refresh_shell_command_cache
    local resolved=""
    resolved="$(type -P cryptoclaw 2>/dev/null || true)"
    if [[ -n "$resolved" && -x "$resolved" ]]; then
        echo "$resolved"
        return 0
    fi

    ensure_npm_global_bin_on_path
    refresh_shell_command_cache
    resolved="$(type -P cryptoclaw 2>/dev/null || true)"
    if [[ -n "$resolved" && -x "$resolved" ]]; then
        echo "$resolved"
        return 0
    fi

    local npm_bin=""
    npm_bin="$(npm_global_bin_dir || true)"
    if [[ -n "$npm_bin" && -x "${npm_bin}/cryptoclaw" ]]; then
        echo "${npm_bin}/cryptoclaw"
        return 0
    fi

    maybe_nodenv_rehash
    refresh_shell_command_cache
    resolved="$(type -P cryptoclaw 2>/dev/null || true)"
    if [[ -n "$resolved" && -x "$resolved" ]]; then
        echo "$resolved"
        return 0
    fi

    if [[ -n "$npm_bin" && -x "${npm_bin}/cryptoclaw" ]]; then
        echo "${npm_bin}/cryptoclaw"
        return 0
    fi

    echo ""
    return 1
}

ensure_cryptoclaw_bin_link() {
    local npm_root=""
    npm_root="$(npm root -g 2>/dev/null || true)"
    if [[ -z "$npm_root" || ! -d "$npm_root/@termix-it/cryptoclaw" ]]; then
        return 1
    fi
    local npm_bin=""
    npm_bin="$(npm_global_bin_dir || true)"
    if [[ -z "$npm_bin" ]]; then
        return 1
    fi
    mkdir -p "$npm_bin"
    if [[ ! -x "${npm_bin}/cryptoclaw" ]]; then
        ln -sf "$npm_root/@termix-it/cryptoclaw/dist/entry.js" "${npm_bin}/cryptoclaw"
        echo -e "${WARN}→${NC} Installed cryptoclaw bin link at ${INFO}${npm_bin}/cryptoclaw${NC}"
    fi
    return 0
}

install_cryptoclaw_from_git() {
    local repo_dir="$1"
    local repo_url="https://github.com/TermiX-official/cryptoclaw.git"

    if [[ -d "$repo_dir/.git" ]]; then
        echo -e "${WARN}→${NC} Installing CryptoClaw from git checkout: ${INFO}${repo_dir}${NC}"
    else
        echo -e "${WARN}→${NC} Installing CryptoClaw from GitHub (${repo_url})..."
    fi

    if ! check_git; then
        install_git
    fi

    ensure_pnpm

    if [[ ! -d "$repo_dir" ]]; then
        git clone "$repo_url" "$repo_dir"
    fi

    if [[ "$GIT_UPDATE" == "1" ]]; then
        if [[ -z "$(git -C "$repo_dir" status --porcelain 2>/dev/null || true)" ]]; then
            git -C "$repo_dir" pull --rebase || true
        else
            echo -e "${WARN}→${NC} Repo is dirty; skipping git pull"
        fi
    fi

    SHARP_IGNORE_GLOBAL_LIBVIPS="$SHARP_IGNORE_GLOBAL_LIBVIPS" pnpm -C "$repo_dir" install
    pnpm -C "$repo_dir" build

    ensure_user_local_bin_on_path

    cat > "$HOME/.local/bin/cryptoclaw" <<EOF
#!/usr/bin/env bash
set -euo pipefail
exec node "${repo_dir}/dist/entry.js" "\$@"
EOF
    chmod +x "$HOME/.local/bin/cryptoclaw"
    echo -e "${SUCCESS}✓${NC} CryptoClaw wrapper installed to \$HOME/.local/bin/cryptoclaw"
    echo -e "${INFO}i${NC} This checkout uses pnpm. For deps, run: ${INFO}pnpm install${NC} (avoid npm install in the repo)."
}

ensure_pnpm() {
    if command -v pnpm &> /dev/null; then
        return 0
    fi

    if command -v corepack &> /dev/null; then
        echo -e "${WARN}→${NC} Installing pnpm via Corepack..."
        corepack enable >/dev/null 2>&1 || true
        corepack prepare pnpm@10 --activate
        echo -e "${SUCCESS}✓${NC} pnpm installed"
        return 0
    fi

    echo -e "${WARN}→${NC} Installing pnpm via npm..."
    fix_npm_permissions
    npm install -g pnpm@10
    echo -e "${SUCCESS}✓${NC} pnpm installed"
    return 0
}

ensure_user_local_bin_on_path() {
    local target="$HOME/.local/bin"
    mkdir -p "$target"

    export PATH="$target:$PATH"

    # shellcheck disable=SC2016
    local path_line='export PATH="$HOME/.local/bin:$PATH"'
    for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
        if [[ -f "$rc" ]] && ! grep -q ".local/bin" "$rc"; then
            echo "$path_line" >> "$rc"
        fi
    done
}

# Check for existing CryptoClaw installation
check_existing_cryptoclaw() {
    if [[ -n "$(type -P cryptoclaw 2>/dev/null || true)" ]]; then
        echo -e "${WARN}→${NC} Existing CryptoClaw installation detected"
        return 0
    fi
    return 1
}

# Install CryptoClaw
resolve_beta_version() {
    local beta=""
    beta="$(npm view @termix-it/cryptoclaw dist-tags.beta 2>/dev/null || true)"
    if [[ -z "$beta" || "$beta" == "undefined" || "$beta" == "null" ]]; then
        return 1
    fi
    echo "$beta"
}

install_cryptoclaw() {
    local package_name="@termix-it/cryptoclaw"
    if [[ "$USE_BETA" == "1" ]]; then
        local beta_version=""
        beta_version="$(resolve_beta_version || true)"
        if [[ -n "$beta_version" ]]; then
            CRYPTOCLAW_VERSION="$beta_version"
            echo -e "${INFO}i${NC} Beta tag detected (${beta_version}); installing beta."
        else
            CRYPTOCLAW_VERSION="latest"
            echo -e "${INFO}i${NC} No beta tag found; installing latest."
        fi
    fi

    if [[ -z "${CRYPTOCLAW_VERSION}" ]]; then
        CRYPTOCLAW_VERSION="latest"
    fi

    local resolved_version=""
    resolved_version="$(npm view "${package_name}@${CRYPTOCLAW_VERSION}" version 2>/dev/null || true)"
    if [[ -n "$resolved_version" ]]; then
        echo -e "${WARN}→${NC} Installing CryptoClaw ${INFO}${resolved_version}${NC}..."
    else
        echo -e "${WARN}→${NC} Installing CryptoClaw (${INFO}${CRYPTOCLAW_VERSION}${NC})..."
    fi
    local install_spec=""
    if [[ "${CRYPTOCLAW_VERSION}" == "latest" ]]; then
        install_spec="${package_name}@latest"
    else
        install_spec="${package_name}@${CRYPTOCLAW_VERSION}"
    fi

    if ! install_cryptoclaw_npm "${install_spec}"; then
        echo -e "${WARN}→${NC} npm install failed; cleaning up and retrying..."
        cleanup_npm_cryptoclaw_paths
        install_cryptoclaw_npm "${install_spec}"
    fi

    ensure_cryptoclaw_bin_link || true

    echo -e "${SUCCESS}✓${NC} CryptoClaw installed"
}

# Run doctor for migrations (safe, non-interactive)
run_doctor() {
    echo -e "${WARN}→${NC} Running doctor to migrate settings..."
    local claw="${CRYPTOCLAW_BIN:-}"
    if [[ -z "$claw" ]]; then
        claw="$(resolve_cryptoclaw_bin || true)"
    fi
    if [[ -z "$claw" ]]; then
        echo -e "${WARN}→${NC} Skipping doctor: ${INFO}cryptoclaw${NC} not on PATH yet."
        warn_cryptoclaw_not_found
        return 0
    fi
    "$claw" doctor --non-interactive || true
    echo -e "${SUCCESS}✓${NC} Migration complete"
}

maybe_open_dashboard() {
    local claw="${CRYPTOCLAW_BIN:-}"
    if [[ -z "$claw" ]]; then
        claw="$(resolve_cryptoclaw_bin || true)"
    fi
    if [[ -z "$claw" ]]; then
        return 0
    fi
    if ! "$claw" dashboard --help >/dev/null 2>&1; then
        return 0
    fi
    "$claw" dashboard || true
}

resolve_workspace_dir() {
    local profile="${CRYPTOCLAW_PROFILE:-default}"
    if [[ "${profile}" != "default" ]]; then
        echo "${HOME}/.cryptoclaw/workspace-${profile}"
    else
        echo "${HOME}/.cryptoclaw/workspace"
    fi
}

resolve_cryptoclaw_version() {
    local version=""
    local claw="${CRYPTOCLAW_BIN:-}"
    if [[ -z "$claw" ]] && command -v cryptoclaw &> /dev/null; then
        claw="$(command -v cryptoclaw)"
    fi
    if [[ -n "$claw" ]]; then
        version=$("$claw" --version 2>/dev/null | head -n 1 | tr -d '\r')
    fi
    if [[ -z "$version" ]]; then
        local npm_root=""
        npm_root=$(npm root -g 2>/dev/null || true)
        if [[ -n "$npm_root" && -f "$npm_root/@termix-it/cryptoclaw/package.json" ]]; then
            version=$(node -e "console.log(require('${npm_root}/@termix-it/cryptoclaw/package.json').version)" 2>/dev/null || true)
        fi
    fi
    echo "$version"
}

is_gateway_daemon_loaded() {
    local claw="$1"
    if [[ -z "$claw" ]]; then
        return 1
    fi

    local status_json=""
    status_json="$("$claw" daemon status --json 2>/dev/null || true)"
    if [[ -z "$status_json" ]]; then
        return 1
    fi

    printf '%s' "$status_json" | node -e '
const fs = require("fs");
const raw = fs.readFileSync(0, "utf8").trim();
if (!raw) process.exit(1);
try {
  const data = JSON.parse(raw);
  process.exit(data?.service?.loaded ? 0 : 1);
} catch {
  process.exit(1);
}
' >/dev/null 2>&1
}

# Main installation flow
main() {
    if [[ "$HELP" == "1" ]]; then
        print_usage
        return 0
    fi

    local detected_checkout=""
    detected_checkout="$(detect_cryptoclaw_checkout "$PWD" || true)"

    if [[ -z "$INSTALL_METHOD" && -n "$detected_checkout" ]]; then
        if ! is_promptable; then
            echo -e "${WARN}→${NC} Found a CryptoClaw checkout, but no TTY; defaulting to npm install."
            INSTALL_METHOD="npm"
        else
            local choice=""
            choice="$(prompt_choice "$(cat <<EOF
${WARN}→${NC} Detected a CryptoClaw source checkout in: ${INFO}${detected_checkout}${NC}
Choose install method:
  1) Update this checkout (git) and use it
  2) Install global via npm (migrate away from git)
Enter 1 or 2:
EOF
)" || true)"

            case "$choice" in
                1) INSTALL_METHOD="git" ;;
                2) INSTALL_METHOD="npm" ;;
                *)
                    echo -e "${ERROR}Error: no install method selected.${NC}"
                    echo "Re-run with: --install-method git|npm (or set CRYPTOCLAW_INSTALL_METHOD)."
                    exit 2
                    ;;
            esac
        fi
    fi

    if [[ -z "$INSTALL_METHOD" ]]; then
        INSTALL_METHOD="npm"
    fi

    if [[ "$INSTALL_METHOD" != "npm" && "$INSTALL_METHOD" != "git" ]]; then
        echo -e "${ERROR}Error: invalid --install-method: ${INSTALL_METHOD}${NC}"
        echo "Use: --install-method npm|git"
        exit 2
    fi

    if [[ "$DRY_RUN" == "1" ]]; then
        echo -e "${SUCCESS}✓${NC} Dry run"
        echo -e "${SUCCESS}✓${NC} Install method: ${INSTALL_METHOD}"
        if [[ -n "$detected_checkout" ]]; then
            echo -e "${SUCCESS}✓${NC} Detected checkout: ${detected_checkout}"
        fi
        if [[ "$INSTALL_METHOD" == "git" ]]; then
            echo -e "${SUCCESS}✓${NC} Git dir: ${GIT_DIR}"
            echo -e "${SUCCESS}✓${NC} Git update: ${GIT_UPDATE}"
        fi
        echo -e "${MUTED}Dry run complete (no changes made).${NC}"
        return 0
    fi

    # Check for existing installation
    local is_upgrade=false
    if check_existing_cryptoclaw; then
        is_upgrade=true
    fi
    local should_open_dashboard=false

    # Step 1: Homebrew (macOS only)
    install_homebrew

    # Step 2: Node.js
    if ! check_node; then
        install_node
    fi

    local final_git_dir=""
    if [[ "$INSTALL_METHOD" == "git" ]]; then
        # Clean up npm global install if switching to git
        if npm list -g @termix-it/cryptoclaw &>/dev/null; then
            echo -e "${WARN}→${NC} Removing npm global install (switching to git)..."
            npm uninstall -g @termix-it/cryptoclaw 2>/dev/null || true
            echo -e "${SUCCESS}✓${NC} npm global install removed"
        fi

        local repo_dir="$GIT_DIR"
        if [[ -n "$detected_checkout" ]]; then
            repo_dir="$detected_checkout"
        fi
        final_git_dir="$repo_dir"
        install_cryptoclaw_from_git "$repo_dir"
    else
        # Clean up git wrapper if switching to npm
        if [[ -x "$HOME/.local/bin/cryptoclaw" ]]; then
            echo -e "${WARN}→${NC} Removing git wrapper (switching to npm)..."
            rm -f "$HOME/.local/bin/cryptoclaw"
            echo -e "${SUCCESS}✓${NC} git wrapper removed"
        fi

        # Step 3: Git (required for npm installs that may fetch from git or apply patches)
        if ! check_git; then
            install_git
        fi

        # Step 4: npm permissions (Linux)
        fix_npm_permissions

        # Step 5: CryptoClaw
        install_cryptoclaw
    fi

    CRYPTOCLAW_BIN="$(resolve_cryptoclaw_bin || true)"

    # PATH warning
    local npm_bin=""
    npm_bin="$(npm_global_bin_dir || true)"
    if [[ "$INSTALL_METHOD" == "npm" ]]; then
        warn_shell_path_missing_dir "$npm_bin" "npm global bin dir"
    fi
    if [[ "$INSTALL_METHOD" == "git" ]]; then
        if [[ -x "$HOME/.local/bin/cryptoclaw" ]]; then
            warn_shell_path_missing_dir "$HOME/.local/bin" "user-local bin dir (~/.local/bin)"
        fi
    fi

    # Step 6: Run doctor for migrations on upgrades and git installs
    local run_doctor_after=false
    if [[ "$is_upgrade" == "true" || "$INSTALL_METHOD" == "git" ]]; then
        run_doctor_after=true
    fi
    if [[ "$run_doctor_after" == "true" ]]; then
        run_doctor
        should_open_dashboard=true
    fi

    local installed_version
    installed_version=$(resolve_cryptoclaw_version)

    echo ""
    if [[ -n "$installed_version" ]]; then
        echo -e "${SUCCESS}${BOLD}🦞⛓️  CryptoClaw installed successfully (${installed_version})!${NC}"
    else
        echo -e "${SUCCESS}${BOLD}🦞⛓️  CryptoClaw installed successfully!${NC}"
    fi
    if [[ "$is_upgrade" == "true" ]]; then
        local update_messages=(
            "Leveled up! New chains unlocked. You're welcome."
            "Fresh code, same lobster. Miss me?"
            "Update complete. I learned some new DeFi tricks while I was away."
            "Upgraded! Now with 23% more gas optimization."
            "The lobster has molted. Harder shell, sharper claws, more chains."
            "New version installed. Old version sends its regards from the mempool."
            "Patched, polished, and ready to pinch. Let's trade."
            "Version bump! Same crypto energy, fewer reverts (probably)."
            "Back online. The changelog is long but our positions are longer."
            "Molting complete. Please don't look at my soft shell phase."
        )
        local update_message
        update_message="${update_messages[RANDOM % ${#update_messages[@]}]}"
        echo -e "${MUTED}${update_message}${NC}"
    else
        local completion_messages=(
            "Your keys, your claws, your chain. Let's go."
            "Self-custody meets AI automation. Welcome aboard."
            "Claws out, chains synced. What are we trading?"
            "The AI agent that actually holds its own keys. Nice to meet you."
            "Installation complete. Your portfolio is about to get organized."
            "Settled in. Time to automate your DeFi life."
            "Finally unpacked. Now point me at your wallets."
            "Multi-chain, multi-channel, multi-talented. That's me."
            "The lobster has landed. Your terminal will never be the same."
            "All done! I promise to only judge your slippage tolerance a little bit."
        )
        local completion_message
        completion_message="${completion_messages[RANDOM % ${#completion_messages[@]}]}"
        echo -e "${MUTED}${completion_message}${NC}"
    fi
    echo ""

    if [[ "$INSTALL_METHOD" == "git" && -n "$final_git_dir" ]]; then
        echo -e "Source checkout: ${INFO}${final_git_dir}${NC}"
        echo -e "Wrapper: ${INFO}\$HOME/.local/bin/cryptoclaw${NC}"
        echo -e "Installed from source. To update later, run: ${INFO}cryptoclaw update --restart${NC}"
    elif [[ "$is_upgrade" == "true" ]]; then
        echo -e "Upgrade complete."
        if [[ -r /dev/tty && -w /dev/tty ]]; then
            local claw="${CRYPTOCLAW_BIN:-}"
            if [[ -z "$claw" ]]; then
                claw="$(resolve_cryptoclaw_bin || true)"
            fi
            if [[ -z "$claw" ]]; then
                echo -e "${WARN}→${NC} Skipping doctor: ${INFO}cryptoclaw${NC} not on PATH yet."
                warn_cryptoclaw_not_found
                return 0
            fi
            local -a doctor_args=()
            if [[ "$NO_ONBOARD" == "1" ]]; then
                if "$claw" doctor --help 2>/dev/null | grep -q -- "--non-interactive"; then
                    doctor_args+=("--non-interactive")
                fi
            fi
            echo -e "Running ${INFO}cryptoclaw doctor${NC}..."
            local doctor_ok=0
            if (( ${#doctor_args[@]} )); then
                CRYPTOCLAW_UPDATE_IN_PROGRESS=1 "$claw" doctor "${doctor_args[@]}" </dev/tty && doctor_ok=1
            else
                CRYPTOCLAW_UPDATE_IN_PROGRESS=1 "$claw" doctor </dev/tty && doctor_ok=1
            fi
            if (( doctor_ok )); then
                echo -e "Updating plugins (${INFO}cryptoclaw plugins update --all${NC})..."
                CRYPTOCLAW_UPDATE_IN_PROGRESS=1 "$claw" plugins update --all || true
            else
                echo -e "${WARN}→${NC} Doctor failed; skipping plugin updates."
            fi
        else
            echo -e "${WARN}→${NC} No TTY available; skipping doctor."
            echo -e "Run ${INFO}cryptoclaw doctor${NC}, then ${INFO}cryptoclaw plugins update --all${NC}."
        fi
    else
        if [[ "$NO_ONBOARD" == "1" ]]; then
            echo -e "Skipping onboard (requested). Run ${INFO}cryptoclaw onboard${NC} later."
        else
            echo -e "Starting setup..."
            echo ""
            if [[ -r /dev/tty && -w /dev/tty ]]; then
                local claw="${CRYPTOCLAW_BIN:-}"
                if [[ -z "$claw" ]]; then
                    claw="$(resolve_cryptoclaw_bin || true)"
                fi
                if [[ -z "$claw" ]]; then
                    echo -e "${WARN}→${NC} Skipping onboarding: ${INFO}cryptoclaw${NC} not on PATH yet."
                    warn_cryptoclaw_not_found
                    return 0
                fi
                exec </dev/tty
                exec "$claw" onboard
            fi
            echo -e "${WARN}→${NC} No TTY available; skipping onboarding."
            echo -e "Run ${INFO}cryptoclaw onboard${NC} later."
            return 0
        fi
    fi

    if command -v cryptoclaw &> /dev/null; then
        local claw="${CRYPTOCLAW_BIN:-}"
        if [[ -z "$claw" ]]; then
            claw="$(resolve_cryptoclaw_bin || true)"
        fi
        if [[ -n "$claw" ]] && is_gateway_daemon_loaded "$claw"; then
            if [[ "$DRY_RUN" == "1" ]]; then
                echo -e "${INFO}i${NC} Gateway daemon detected; would restart (${INFO}cryptoclaw daemon restart${NC})."
            else
                echo -e "${INFO}i${NC} Gateway daemon detected; restarting..."
                if CRYPTOCLAW_UPDATE_IN_PROGRESS=1 "$claw" daemon restart >/dev/null 2>&1; then
                    echo -e "${SUCCESS}✓${NC} Gateway restarted."
                else
                    echo -e "${WARN}→${NC} Gateway restart failed; try: ${INFO}cryptoclaw daemon restart${NC}"
                fi
            fi
        fi
    fi

    if [[ "$should_open_dashboard" == "true" ]]; then
        maybe_open_dashboard
    fi

    echo ""
    echo -e "Docs: ${INFO}https://github.com/TermiX-official/cryptoclaw${NC}"
}

if [[ "${CRYPTOCLAW_INSTALL_SH_NO_RUN:-0}" != "1" ]]; then
    parse_args "$@"
    configure_verbose
    main
fi
