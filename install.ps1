#Requires -Version 5.1
<#
.SYNOPSIS
    CryptoClaw Installer for Windows
.DESCRIPTION
    Installs CryptoClaw via npm (or from a git checkout) on Windows.
    Supports PowerShell 5.1+ and pwsh 7+.
.EXAMPLE
    irm https://raw.githubusercontent.com/TermiX-official/cryptoclaw/main/install.ps1 | iex
.EXAMPLE
    .\install.ps1 -NoOnboard
.EXAMPLE
    $env:CRYPTOCLAW_NO_ONBOARD = "1"; irm https://raw.githubusercontent.com/TermiX-official/cryptoclaw/main/install.ps1 | iex
#>

param(
    [string]$Version,
    [ValidateSet("npm", "git")]
    [string]$InstallMethod,
    [string]$GitDir,
    [switch]$NoOnboard,
    [switch]$NoPrompt,
    [switch]$NoGitUpdate,
    [switch]$DryRun,
    [switch]$Beta,
    [switch]$VerboseInstall,
    [Alias("h")]
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# ── ANSI Colours ──────────────────────────────────────────────────────
$ESC        = [char]27
$BOLD       = "$ESC[1m"
$ACCENT     = "$ESC[38;2;16;185;129m"
$ACCENT_DIM = "$ESC[38;2;5;150;105m"
$INFO       = "$ESC[38;2;52;211;153m"
$SUCCESS    = "$ESC[38;2;16;185;129m"
$WARN       = "$ESC[38;2;255;176;32m"
$ERR        = "$ESC[38;2;226;61;45m"
$MUTED      = "$ESC[38;2;139;127;119m"
$NC         = "$ESC[0m"

# ── Taglines ──────────────────────────────────────────────────────────
$Taglines = @(
    "Your keys, your claws, your chain."
    "Self-custody meets AI automation."
    "DeFi doesn't sleep, and neither does your agent."
    "Not your keys, not your crypto. We keep both safe."
    "Multi-chain, multi-channel, multi-talented."
    "From wallet to swap in one command."
    "The AI agent that actually holds its own keys."
    "Claws out, chains synced -- let's trade."
    "Portfolio tracking at 3AM? I got you."
    "Because even lobsters need a hardware wallet."
    "AES-256-GCM encrypted, scrypt hardened, lobster approved."
    "Your terminal just grew claws and a blockchain."
    "One CLI to rule all chains."
    "Private keys stay private. That's the whole point."
    "Swap tokens, not security for convenience."
    "16 chains, one lobster, zero trust issues."
    "I speak fluent Solidity, mild sarcasm, and aggressive gas optimization."
    "WhatsApp your portfolio, Telegram your trades, Signal your secrets."
    "I don't judge your trades, but your slippage tolerance is... brave."
    "Hot reload for config, cold storage for keys."
    "I'll refactor your DeFi strategy like it owes me gas fees."
    "On-chain identity via ERC-8004. Because even AI agents need a passport."
    "Spending limits exist because YOLO is not a trading strategy."
    "I can track it, swap it, and gently roast your gas spending."
    "curl for conversations, claws for transactions."
)

$UpdateMessages = @(
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

$CompletionMessages = @(
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

function Pick-Tagline {
    if ($env:CRYPTOCLAW_TAGLINE_INDEX -and $env:CRYPTOCLAW_TAGLINE_INDEX -match '^\d+$') {
        $idx = [int]$env:CRYPTOCLAW_TAGLINE_INDEX % $Taglines.Count
        return $Taglines[$idx]
    }
    return (Get-Random -InputObject $Taglines)
}

# ── Environment overrides ─────────────────────────────────────────────
if (-not $PSBoundParameters.ContainsKey("InstallMethod")) {
    if (-not [string]::IsNullOrWhiteSpace($env:CRYPTOCLAW_INSTALL_METHOD)) {
        $InstallMethod = $env:CRYPTOCLAW_INSTALL_METHOD
    } else {
        $InstallMethod = "npm"
    }
}
if (-not $PSBoundParameters.ContainsKey("GitDir")) {
    if (-not [string]::IsNullOrWhiteSpace($env:CRYPTOCLAW_GIT_DIR)) {
        $GitDir = $env:CRYPTOCLAW_GIT_DIR
    } else {
        $GitDir = Join-Path $env:USERPROFILE "cryptoclaw"
    }
}
if (-not $PSBoundParameters.ContainsKey("Version")) {
    if (-not [string]::IsNullOrWhiteSpace($env:CRYPTOCLAW_VERSION)) {
        $Version = $env:CRYPTOCLAW_VERSION
    } else {
        $Version = "latest"
    }
}
if ($env:CRYPTOCLAW_NO_ONBOARD -eq "1")  { $NoOnboard = $true }
if ($env:CRYPTOCLAW_NO_PROMPT -eq "1")   { $NoPrompt = $true }
if ($env:CRYPTOCLAW_GIT_UPDATE -eq "0")  { $NoGitUpdate = $true }
if ($env:CRYPTOCLAW_DRY_RUN -eq "1")     { $DryRun = $true }
if ($env:CRYPTOCLAW_VERBOSE -eq "1")     { $VerboseInstall = $true }
if ($env:CRYPTOCLAW_BETA -eq "1")        { $Beta = $true }

$script:NpmLogLevel = if ($env:CRYPTOCLAW_NPM_LOGLEVEL) { $env:CRYPTOCLAW_NPM_LOGLEVEL } else { "error" }
if ($VerboseInstall -and $script:NpmLogLevel -eq "error") { $script:NpmLogLevel = "notice" }

if (-not $env:SHARP_IGNORE_GLOBAL_LIBVIPS) { $env:SHARP_IGNORE_GLOBAL_LIBVIPS = "1" }

# ── Helpers ───────────────────────────────────────────────────────────
function Test-Cmd { param([string]$Name) $null -ne (Get-Command $Name -ErrorAction SilentlyContinue) }

function Get-NodeMajorVersion {
    try {
        $raw = & node -v 2>$null
        if ($raw -match '^v?(\d+)') { return [int]$Matches[1] }
    } catch {}
    return 0
}

function Get-NpmGlobalRoot {
    try {
        $root = (& npm root -g 2>$null)
        if ($root) { return $root.Trim() }
    } catch {}
    return ""
}

function Get-NpmGlobalPrefix {
    try {
        $prefix = (& npm prefix -g 2>$null)
        if ($prefix) { return $prefix.Trim() }
    } catch {}
    return ""
}

function Resolve-CryptoClawBin {
    # 1. PATH lookup
    $cmd = Get-Command cryptoclaw -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    # 2. npm global prefix
    $prefix = Get-NpmGlobalPrefix
    if ($prefix) {
        foreach ($ext in @("cryptoclaw.cmd", "cryptoclaw.ps1", "cryptoclaw")) {
            $candidate = Join-Path $prefix $ext
            if (Test-Path $candidate) { return $candidate }
        }
    }

    return ""
}

function Resolve-CryptoClawVersion {
    $claw = Resolve-CryptoClawBin
    if ($claw) {
        try {
            $ver = & $claw --version 2>$null | Select-Object -First 1
            if ($ver) { return $ver.Trim() }
        } catch {}
    }
    $npmRoot = Get-NpmGlobalRoot
    if ($npmRoot) {
        $pkgJson = Join-Path $npmRoot "@termix-it\cryptoclaw\package.json"
        if (Test-Path $pkgJson) {
            try {
                $pkg = Get-Content $pkgJson -Raw | ConvertFrom-Json
                return $pkg.version
            } catch {}
        }
    }
    return ""
}

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# ── Plugin-SDK junction ──────────────────────────────────────────────
# Extensions import "cryptoclaw/plugin-sdk" but npm installs as
# @termix-it/cryptoclaw.  Create a junction so Node can resolve the
# bare "cryptoclaw" name inside node_modules.
function Ensure-CryptoClawJunction {
    $npmRoot = Get-NpmGlobalRoot
    if (-not $npmRoot) { return }

    $scopedDir = Join-Path $npmRoot "@termix-it\cryptoclaw"
    if (-not (Test-Path $scopedDir)) { return }

    $junctionDir = Join-Path $npmRoot "cryptoclaw"
    if (Test-Path $junctionDir) { return }

    try {
        # cmd /c mklink /J creates a directory junction (no admin required)
        $null = cmd /c mklink /J `"$junctionDir`" `"$scopedDir`" 2>&1
        if (Test-Path $junctionDir) {
            Write-Host "${SUCCESS}[OK]${NC} Linked ${INFO}cryptoclaw${NC} -> ${INFO}@termix-it/cryptoclaw${NC} for plugin-sdk resolution"
            return
        }
    } catch {}

    # Fallback: PowerShell New-Item junction
    try {
        New-Item -ItemType Junction -Path $junctionDir -Target $scopedDir -Force | Out-Null
        Write-Host "${SUCCESS}[OK]${NC} Linked ${INFO}cryptoclaw${NC} -> ${INFO}@termix-it/cryptoclaw${NC} for plugin-sdk resolution"
    } catch {
        Write-Host "${WARN}[!]${NC} Could not create plugin-sdk junction: $_"
    }
}

# ── Ensure cryptoclaw bin on PATH ────────────────────────────────────
function Ensure-CryptoClawOnPath {
    if (Test-Cmd cryptoclaw) { return $true }

    $prefix = Get-NpmGlobalPrefix
    if (-not $prefix) { return $false }

    # npm on Windows puts bins directly in the prefix dir (not prefix/bin)
    $found = $false
    foreach ($ext in @("cryptoclaw.cmd", "cryptoclaw.ps1", "cryptoclaw")) {
        if (Test-Path (Join-Path $prefix $ext)) { $found = $true; break }
    }
    if (-not $found) { return $false }

    # Add prefix to user PATH if missing
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $dirs = $userPath -split ";" | ForEach-Object { $_.TrimEnd("\") }
    $prefixNorm = $prefix.TrimEnd("\")
    if ($dirs -notcontains $prefixNorm) {
        [Environment]::SetEnvironmentVariable("Path", "$userPath;$prefix", "User")
        Refresh-Path
        Write-Host "${WARN}[!]${NC} Added ${INFO}$prefix${NC} to user PATH (restart terminal if command not found)"
    }

    return (Test-Cmd cryptoclaw)
}

# ── Print usage ───────────────────────────────────────────────────────
function Print-Usage {
    Write-Host @"
CryptoClaw installer (Windows)

Usage:
  irm https://raw.githubusercontent.com/TermiX-official/cryptoclaw/main/install.ps1 | iex

  # Or download first, then run with options:
  .\install.ps1 [-Version <ver>] [-Beta] [-InstallMethod npm|git]
                [-GitDir <path>] [-NoGitUpdate]
                [-NoOnboard] [-NoPrompt] [-DryRun] [-VerboseInstall] [-Help]

Parameters:
  -Version <version|dist-tag>  npm version / dist-tag (default: latest)
  -Beta                        Use beta dist-tag if available, else latest
  -InstallMethod npm|git       Install method (default: npm)
  -GitDir <path>               Git checkout directory (default: ~\cryptoclaw)
  -NoGitUpdate                 Skip git pull for existing checkout
  -NoOnboard                   Skip onboarding wizard
  -NoPrompt                    Disable interactive prompts (CI mode)
  -DryRun                      Print what would happen (no changes)
  -VerboseInstall              Verbose npm output
  -Help                        Show this help

Environment variables:
  CRYPTOCLAW_VERSION            latest|next|<semver>
  CRYPTOCLAW_BETA               0|1
  CRYPTOCLAW_INSTALL_METHOD     npm|git
  CRYPTOCLAW_GIT_DIR            path
  CRYPTOCLAW_GIT_UPDATE         0|1
  CRYPTOCLAW_NO_ONBOARD         1
  CRYPTOCLAW_NO_PROMPT          1
  CRYPTOCLAW_DRY_RUN            1
  CRYPTOCLAW_VERBOSE            1
  CRYPTOCLAW_NPM_LOGLEVEL       error|warn|notice
  SHARP_IGNORE_GLOBAL_LIBVIPS   0|1  (default: 1)
"@
}

# ── Node.js install ──────────────────────────────────────────────────
function Install-Node {
    Write-Host "${WARN}[*]${NC} Installing Node.js..."

    # winget
    if (Test-Cmd winget) {
        Write-Host "  Using winget..."
        & winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent 2>$null
        Refresh-Path
        if (Test-Cmd node) {
            Write-Host "${SUCCESS}[OK]${NC} Node.js installed via winget"
            return
        }
    }

    # Chocolatey
    if (Test-Cmd choco) {
        Write-Host "  Using Chocolatey..."
        & choco install nodejs-lts -y 2>$null
        Refresh-Path
        if (Test-Cmd node) {
            Write-Host "${SUCCESS}[OK]${NC} Node.js installed via Chocolatey"
            return
        }
    }

    # Scoop
    if (Test-Cmd scoop) {
        Write-Host "  Using Scoop..."
        & scoop install nodejs-lts 2>$null
        Refresh-Path
        if (Test-Cmd node) {
            Write-Host "${SUCCESS}[OK]${NC} Node.js installed via Scoop"
            return
        }
    }

    Write-Host ""
    Write-Host "${ERR}Could not auto-install Node.js.${NC}"
    Write-Host "Please install Node.js 22+ from: ${INFO}https://nodejs.org${NC}"
    Write-Host "Then re-run this installer."
    exit 1
}

# ── Git helpers ───────────────────────────────────────────────────────
function Require-Git {
    if (Test-Cmd git) { return }
    Write-Host ""
    Write-Host "${ERR}Error: Git is required for --InstallMethod git.${NC}"
    Write-Host "Install Git for Windows: ${INFO}https://git-scm.com/download/win${NC}"
    Write-Host "Then re-run this installer."
    exit 1
}

function Ensure-Pnpm {
    if (Test-Cmd pnpm) { return }
    if (Test-Cmd corepack) {
        Write-Host "${WARN}[*]${NC} Installing pnpm via Corepack..."
        try {
            & corepack enable 2>$null | Out-Null
            & corepack prepare pnpm@10 --activate 2>$null | Out-Null
            if (Test-Cmd pnpm) {
                Write-Host "${SUCCESS}[OK]${NC} pnpm installed via corepack"
                return
            }
        } catch {}
    }
    Write-Host "${WARN}[*]${NC} Installing pnpm via npm..."
    & npm install -g pnpm@10
    Write-Host "${SUCCESS}[OK]${NC} pnpm installed"
}

# ── npm install with retry ───────────────────────────────────────────
function Install-CryptoClawNpm {
    param([string]$Spec)

    $npmArgs = @("--loglevel", $script:NpmLogLevel, "--no-fund", "--no-audit", "install", "-g", $Spec)
    if (-not $VerboseInstall) { $npmArgs = @("--silent") + $npmArgs }

    try {
        & npm @npmArgs 2>&1 | ForEach-Object { Write-Host $_ }
        if ($LASTEXITCODE -ne 0) { throw "exit code $LASTEXITCODE" }
        return $true
    } catch {
        return $false
    }
}

function Install-CryptoClaw {
    $packageName = "@termix-it/cryptoclaw"

    if ($Beta) {
        try {
            $betaVer = (& npm view $packageName dist-tags.beta 2>$null)
            if ($betaVer -and $betaVer -ne "undefined" -and $betaVer -ne "null") {
                $Version = $betaVer.Trim()
                Write-Host "${INFO}i${NC} Beta tag detected ($Version); installing beta."
            } else {
                $Version = "latest"
                Write-Host "${INFO}i${NC} No beta tag found; installing latest."
            }
        } catch {
            $Version = "latest"
        }
    }

    if ([string]::IsNullOrWhiteSpace($Version)) { $Version = "latest" }

    # Resolve display version
    try {
        $resolved = (& npm view "${packageName}@${Version}" version 2>$null)
        if ($resolved) {
            Write-Host "${WARN}[*]${NC} Installing CryptoClaw ${INFO}$($resolved.Trim())${NC}..."
        } else {
            Write-Host "${WARN}[*]${NC} Installing CryptoClaw (${INFO}${Version}${NC})..."
        }
    } catch {
        Write-Host "${WARN}[*]${NC} Installing CryptoClaw (${INFO}${Version}${NC})..."
    }

    $installSpec = "${packageName}@${Version}"

    if (-not (Install-CryptoClawNpm -Spec $installSpec)) {
        Write-Host "${WARN}[!]${NC} npm install failed; cleaning up and retrying..."
        $npmRoot = Get-NpmGlobalRoot
        if ($npmRoot) {
            $staleDir = Join-Path $npmRoot "@termix-it\cryptoclaw"
            if (Test-Path $staleDir) {
                Remove-Item -Recurse -Force $staleDir -ErrorAction SilentlyContinue
            }
        }
        if (-not (Install-CryptoClawNpm -Spec $installSpec)) {
            Write-Host "${ERR}npm install failed after retry.${NC}"
            Write-Host "Try manually: ${INFO}npm install -g $installSpec${NC}"
            exit 1
        }
    }

    Ensure-CryptoClawJunction

    Write-Host "${SUCCESS}[OK]${NC} CryptoClaw installed"
}

# ── Git install ───────────────────────────────────────────────────────
function Install-CryptoClawFromGit {
    param([string]$RepoDir, [switch]$SkipUpdate)

    Require-Git
    Ensure-Pnpm

    $repoUrl = "https://github.com/TermiX-official/cryptoclaw.git"

    if (Test-Path (Join-Path $RepoDir ".git")) {
        Write-Host "${WARN}[*]${NC} Installing CryptoClaw from git checkout: ${INFO}$RepoDir${NC}"
    } else {
        Write-Host "${WARN}[*]${NC} Installing CryptoClaw from GitHub ($repoUrl)..."
    }

    if (-not (Test-Path $RepoDir)) {
        & git clone $repoUrl $RepoDir
    }

    if (-not $SkipUpdate) {
        $dirty = & git -C $RepoDir status --porcelain 2>$null
        if (-not $dirty) {
            & git -C $RepoDir pull --rebase 2>$null
        } else {
            Write-Host "${WARN}[!]${NC} Repo is dirty; skipping git pull"
        }
    }

    & pnpm -C $RepoDir install
    & pnpm -C $RepoDir build

    # Create wrapper in ~/.local/bin
    $binDir = Join-Path $env:USERPROFILE ".local\bin"
    if (-not (Test-Path $binDir)) {
        New-Item -ItemType Directory -Force -Path $binDir | Out-Null
    }
    $cmdPath = Join-Path $binDir "cryptoclaw.cmd"
    Set-Content -Path $cmdPath -Value "@echo off`r`nnode `"$RepoDir\dist\entry.js`" %*`r`n" -NoNewline

    # Add to user PATH if missing
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $dirs = $userPath -split ";" | ForEach-Object { $_.TrimEnd("\") }
    if ($dirs -notcontains $binDir.TrimEnd("\")) {
        [Environment]::SetEnvironmentVariable("Path", "$userPath;$binDir", "User")
        Refresh-Path
        Write-Host "${WARN}[!]${NC} Added ${INFO}$binDir${NC} to user PATH"
    }

    Write-Host "${SUCCESS}[OK]${NC} CryptoClaw wrapper installed to $cmdPath"
    Write-Host "${INFO}i${NC} This checkout uses pnpm. For deps, run: ${INFO}pnpm install${NC}"
}

# ── Upgrade detection ─────────────────────────────────────────────────
# Returns $true only when both the binary AND a config file exist.
# If the binary is present but config is missing, this is a partial/broken
# install and should be treated as a fresh install so onboarding runs.
# Mirrors the legacy search order in src/config/paths.ts.
function Test-ExistingCryptoClaw {
    if (-not (Resolve-CryptoClawBin)) { return $false }

    $stateDirs  = @(".cryptoclaw", ".openclaw", ".clawdbot", ".moltbot", ".moldbot")
    $configNames = @("cryptoclaw.json", "openclaw.json", "clawdbot.json", "moltbot.json", "moldbot.json")

    foreach ($dir in $stateDirs) {
        foreach ($cfg in $configNames) {
            $cfgPath = Join-Path $env:USERPROFILE "$dir\$cfg"
            if (Test-Path $cfgPath) {
                Write-Host "${WARN}[!]${NC} Existing CryptoClaw installation detected ($dir/$cfg)"
                return $true
            }
        }
    }

    Write-Host "${WARN}[!]${NC} CryptoClaw binary found, but no config -- treating as fresh install"
    return $false
}

# ── Doctor / migrations ───────────────────────────────────────────────
function Run-Doctor {
    Write-Host "${WARN}[*]${NC} Running doctor to migrate settings..."
    $claw = Resolve-CryptoClawBin
    if (-not $claw) {
        Write-Host "${WARN}[!]${NC} Skipping doctor: cryptoclaw not on PATH yet."
        return
    }
    try { & $claw doctor --non-interactive 2>$null } catch {}
    Write-Host "${SUCCESS}[OK]${NC} Migration complete"
}

function Test-GatewayDaemonLoaded {
    param([string]$Claw)
    if (-not $Claw) { return $false }
    try {
        $json = & $Claw daemon status --json 2>$null
        if ($json) {
            $status = $json | ConvertFrom-Json
            return [bool]$status.service.loaded
        }
    } catch {}
    return $false
}

# ── Main ──────────────────────────────────────────────────────────────
function Main {
    # Banner
    $tagline = Pick-Tagline
    Write-Host ""
    Write-Host "${ACCENT}${BOLD}  CryptoClaw Installer${NC}"
    Write-Host "${ACCENT_DIM}  $tagline${NC}"
    Write-Host ""

    if ($Help) { Print-Usage; return }

    # OS
    Write-Host "${SUCCESS}[OK]${NC} Detected: Windows $([System.Environment]::OSVersion.Version)"

    if ($InstallMethod -ne "npm" -and $InstallMethod -ne "git") {
        Write-Host "${ERR}Error: invalid -InstallMethod '$InstallMethod' (use npm or git).${NC}"
        exit 2
    }

    # Dry run
    if ($DryRun) {
        Write-Host "${SUCCESS}[OK]${NC} Dry run"
        Write-Host "${SUCCESS}[OK]${NC} Install method: $InstallMethod"
        if ($InstallMethod -eq "git") {
            Write-Host "${SUCCESS}[OK]${NC} Git dir: $GitDir"
            Write-Host "${SUCCESS}[OK]${NC} Git update: $(-not $NoGitUpdate)"
        }
        Write-Host "${MUTED}Dry run complete (no changes made).${NC}"
        return
    }

    # Check existing installation
    $isUpgrade = Test-ExistingCryptoClaw

    # Node.js
    $nodeMajor = Get-NodeMajorVersion
    if ($nodeMajor -ge 22) {
        $nodeVer = (& node -v 2>$null).Trim()
        Write-Host "${SUCCESS}[OK]${NC} Node.js $nodeVer found"
    } elseif ($nodeMajor -gt 0) {
        $nodeVer = (& node -v 2>$null).Trim()
        Write-Host "${WARN}[!]${NC} Node.js $nodeVer found, but v22+ required"
        Install-Node
    } else {
        Write-Host "${WARN}[!]${NC} Node.js not found"
        Install-Node
    }

    # Re-check
    if ((Get-NodeMajorVersion) -lt 22) {
        Write-Host "${ERR}Error: Node.js 22+ is required. Please install and restart your terminal.${NC}"
        exit 1
    }

    # npm
    if (-not (Test-Cmd npm)) {
        Write-Host "${ERR}Error: npm not found. It should come with Node.js.${NC}"
        exit 1
    }
    Write-Host "${SUCCESS}[OK]${NC} npm $(& npm -v 2>$null) found"

    # Install
    $finalGitDir = $null
    if ($InstallMethod -eq "git") {
        # Uninstall npm global if switching to git
        try {
            $listed = & npm list -g @termix-it/cryptoclaw 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "${WARN}[*]${NC} Removing npm global install (switching to git)..."
                & npm uninstall -g @termix-it/cryptoclaw 2>$null
                Write-Host "${SUCCESS}[OK]${NC} npm global install removed"
            }
        } catch {}

        $finalGitDir = $GitDir
        Install-CryptoClawFromGit -RepoDir $GitDir -SkipUpdate:$NoGitUpdate
    } else {
        # Remove git wrapper if switching to npm
        $gitWrapper = Join-Path $env:USERPROFILE ".local\bin\cryptoclaw.cmd"
        if (Test-Path $gitWrapper) {
            Write-Host "${WARN}[*]${NC} Removing git wrapper (switching to npm)..."
            Remove-Item -Force $gitWrapper -ErrorAction SilentlyContinue
            Write-Host "${SUCCESS}[OK]${NC} Git wrapper removed"
        }

        # Git check (npm may need it for patches)
        if (-not (Test-Cmd git)) {
            Write-Host "${WARN}[!]${NC} Git not found (may be needed for some npm packages)"
        } else {
            Write-Host "${SUCCESS}[OK]${NC} Git found"
        }

        Install-CryptoClaw
    }

    # Ensure on PATH
    $null = Ensure-CryptoClawOnPath

    # Doctor on upgrades / git
    if ($isUpgrade -or $InstallMethod -eq "git") {
        Run-Doctor
    }

    # Version banner
    $installedVersion = Resolve-CryptoClawVersion

    Write-Host ""
    if ($installedVersion) {
        Write-Host "${SUCCESS}${BOLD}  CryptoClaw installed successfully ($installedVersion)!${NC}"
    } else {
        Write-Host "${SUCCESS}${BOLD}  CryptoClaw installed successfully!${NC}"
    }

    if ($isUpgrade) {
        Write-Host "${MUTED}$(Get-Random -InputObject $UpdateMessages)${NC}"
    } else {
        Write-Host "${MUTED}$(Get-Random -InputObject $CompletionMessages)${NC}"
    }
    Write-Host ""

    # Post-install
    if ($InstallMethod -eq "git" -and $finalGitDir) {
        Write-Host "Source checkout: ${INFO}$finalGitDir${NC}"
        Write-Host "Wrapper: ${INFO}$env:USERPROFILE\.local\bin\cryptoclaw.cmd${NC}"
        Write-Host "To update later: ${INFO}cryptoclaw update --restart${NC}"
        Write-Host ""
    }

    $claw = Resolve-CryptoClawBin

    if ($isUpgrade) {
        Write-Host "Upgrade complete."
        if ($claw) {
            Write-Host "Running ${INFO}cryptoclaw doctor${NC}..."
            try {
                $env:CRYPTOCLAW_UPDATE_IN_PROGRESS = "1"
                & $claw doctor 2>$null
            } catch {}

            Write-Host "Updating plugins (${INFO}cryptoclaw plugins update --all${NC})..."
            try {
                & $claw plugins update --all 2>$null
            } catch {}
            $env:CRYPTOCLAW_UPDATE_IN_PROGRESS = ""
        } else {
            Write-Host "${WARN}[!]${NC} cryptoclaw not found on PATH."
            Write-Host "Open a new terminal, then run: ${INFO}cryptoclaw doctor${NC}"
        }
    } else {
        if ($NoOnboard) {
            Write-Host "Skipping onboard (requested). Run ${INFO}cryptoclaw onboard${NC} later."
        } else {
            if ($claw) {
                Write-Host "Starting setup..."
                Write-Host ""
                try {
                    & $claw onboard
                } catch {
                    Write-Host "${WARN}[!]${NC} Onboarding failed or was skipped."
                    Write-Host "Run ${INFO}cryptoclaw onboard${NC} later."
                }
            } else {
                Write-Host "${WARN}[!]${NC} cryptoclaw not found on PATH."
                Write-Host "Open a new terminal, then run: ${INFO}cryptoclaw onboard${NC}"
            }
        }
    }

    # Daemon restart on upgrade
    if ($isUpgrade -and $claw) {
        if (Test-GatewayDaemonLoaded -Claw $claw) {
            Write-Host "${INFO}i${NC} Gateway daemon detected; restarting..."
            try {
                $env:CRYPTOCLAW_UPDATE_IN_PROGRESS = "1"
                & $claw daemon restart 2>$null
                $env:CRYPTOCLAW_UPDATE_IN_PROGRESS = ""
                Write-Host "${SUCCESS}[OK]${NC} Gateway restarted."
            } catch {
                Write-Host "${WARN}[!]${NC} Gateway restart failed; try: ${INFO}cryptoclaw daemon restart${NC}"
            }
        }
    }

    Write-Host ""
    Write-Host "Docs: ${INFO}https://github.com/TermiX-official/cryptoclaw${NC}"
}

# ── Entry point ───────────────────────────────────────────────────────
Main
