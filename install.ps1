# CryptoClaw Installer for Windows
# Usage: iwr -useb https://raw.githubusercontent.com/TermiX-official/cryptoclaw/main/install.ps1 | iex

param(
    [string]$Tag = "latest",
    [ValidateSet("npm", "git")]
    [string]$InstallMethod = "npm",
    [string]$GitDir,
    [switch]$NoOnboard,
    [switch]$NoGitUpdate,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  CryptoClaw Installer" -ForegroundColor Green
Write-Host ""

if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Host "Error: PowerShell 5+ required" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Windows detected" -ForegroundColor Green

if (-not $PSBoundParameters.ContainsKey("InstallMethod")) {
    if (-not [string]::IsNullOrWhiteSpace($env:CRYPTOCLAW_INSTALL_METHOD)) {
        $InstallMethod = $env:CRYPTOCLAW_INSTALL_METHOD
    }
}
if (-not $PSBoundParameters.ContainsKey("GitDir")) {
    if (-not [string]::IsNullOrWhiteSpace($env:CRYPTOCLAW_GIT_DIR)) {
        $GitDir = $env:CRYPTOCLAW_GIT_DIR
    }
}
if (-not $PSBoundParameters.ContainsKey("NoOnboard")) {
    if ($env:CRYPTOCLAW_NO_ONBOARD -eq "1") {
        $NoOnboard = $true
    }
}
if (-not $PSBoundParameters.ContainsKey("NoGitUpdate")) {
    if ($env:CRYPTOCLAW_GIT_UPDATE -eq "0") {
        $NoGitUpdate = $true
    }
}
if (-not $PSBoundParameters.ContainsKey("DryRun")) {
    if ($env:CRYPTOCLAW_DRY_RUN -eq "1") {
        $DryRun = $true
    }
}

if ([string]::IsNullOrWhiteSpace($GitDir)) {
    $userHome = [Environment]::GetFolderPath("UserProfile")
    $GitDir = (Join-Path $userHome "cryptoclaw")
}

function Check-Node {
    try {
        $nodeVersion = (node -v 2>$null)
        if ($nodeVersion) {
            $version = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
            if ($version -ge 22) {
                Write-Host "[OK] Node.js $nodeVersion found" -ForegroundColor Green
                return $true
            } else {
                Write-Host "[!] Node.js $nodeVersion found, but v22+ required" -ForegroundColor Yellow
                return $false
            }
        }
    } catch {
        Write-Host "[!] Node.js not found" -ForegroundColor Yellow
        return $false
    }
    return $false
}

function Install-Node {
    Write-Host "[*] Installing Node.js..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "  Using winget..." -ForegroundColor Gray
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Host "[OK] Node.js installed via winget" -ForegroundColor Green
        return
    }
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "  Using Chocolatey..." -ForegroundColor Gray
        choco install nodejs-lts -y
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Host "[OK] Node.js installed via Chocolatey" -ForegroundColor Green
        return
    }
    if (Get-Command scoop -ErrorAction SilentlyContinue) {
        Write-Host "  Using Scoop..." -ForegroundColor Gray
        scoop install nodejs-lts
        Write-Host "[OK] Node.js installed via Scoop" -ForegroundColor Green
        return
    }
    Write-Host ""
    Write-Host "Error: Could not find a package manager (winget, choco, or scoop)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js 22+ manually:" -ForegroundColor Yellow
    Write-Host "  https://nodejs.org/en/download/" -ForegroundColor Green
    Write-Host ""
    Write-Host "Or install winget (App Installer) from the Microsoft Store." -ForegroundColor Gray
    exit 1
}

function Check-ExistingCryptoClaw {
    try {
        $null = Get-Command cryptoclaw -ErrorAction Stop
        Write-Host "[*] Existing CryptoClaw installation detected" -ForegroundColor Yellow
        return $true
    } catch {
        return $false
    }
}

function Check-Git {
    try {
        $null = Get-Command git -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Require-Git {
    if (Check-Git) { return }
    Write-Host ""
    Write-Host "Error: Git is required for --InstallMethod git." -ForegroundColor Red
    Write-Host "Install Git for Windows:" -ForegroundColor Yellow
    Write-Host "  https://git-scm.com/download/win" -ForegroundColor Green
    Write-Host "Then re-run this installer." -ForegroundColor Yellow
    exit 1
}

function Ensure-CryptoClawOnPath {
    if (Get-Command cryptoclaw -ErrorAction SilentlyContinue) {
        return $true
    }
    $npmPrefix = $null
    try {
        $npmPrefix = (npm config get prefix 2>$null).Trim()
    } catch {
        $npmPrefix = $null
    }
    if (-not [string]::IsNullOrWhiteSpace($npmPrefix)) {
        $npmBin = Join-Path $npmPrefix "bin"
        $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if (-not ($userPath -split ";" | Where-Object { $_ -ieq $npmBin })) {
            [Environment]::SetEnvironmentVariable("Path", "$userPath;$npmBin", "User")
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            Write-Host "[!] Added $npmBin to user PATH (restart terminal if command not found)" -ForegroundColor Yellow
        }
        if (Test-Path (Join-Path $npmBin "cryptoclaw.cmd")) {
            return $true
        }
    }
    Write-Host "[!] cryptoclaw is not on PATH yet." -ForegroundColor Yellow
    Write-Host "Restart PowerShell or add the npm global bin folder to PATH." -ForegroundColor Yellow
    if ($npmPrefix) {
        Write-Host "Expected path: $npmPrefix\\bin" -ForegroundColor Green
    } else {
        Write-Host "Hint: run `"npm config get prefix`" to find your npm global path." -ForegroundColor Gray
    }
    return $false
}

function Ensure-Pnpm {
    if (Get-Command pnpm -ErrorAction SilentlyContinue) { return }
    if (Get-Command corepack -ErrorAction SilentlyContinue) {
        try {
            corepack enable | Out-Null
            corepack prepare pnpm@latest --activate | Out-Null
            if (Get-Command pnpm -ErrorAction SilentlyContinue) {
                Write-Host "[OK] pnpm installed via corepack" -ForegroundColor Green
                return
            }
        } catch {}
    }
    Write-Host "[*] Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
    Write-Host "[OK] pnpm installed" -ForegroundColor Green
}

function Install-CryptoClaw {
    if ([string]::IsNullOrWhiteSpace($Tag)) { $Tag = "latest" }
    $packageName = "@termix-it/cryptoclaw"
    Write-Host "[*] Installing CryptoClaw ($packageName@$Tag)..." -ForegroundColor Yellow
    $prevLogLevel = $env:NPM_CONFIG_LOGLEVEL
    $prevUpdateNotifier = $env:NPM_CONFIG_UPDATE_NOTIFIER
    $prevFund = $env:NPM_CONFIG_FUND
    $prevAudit = $env:NPM_CONFIG_AUDIT
    $env:NPM_CONFIG_LOGLEVEL = "error"
    $env:NPM_CONFIG_UPDATE_NOTIFIER = "false"
    $env:NPM_CONFIG_FUND = "false"
    $env:NPM_CONFIG_AUDIT = "false"
    try {
        $npmOutput = npm install -g "$packageName@$Tag" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[!] npm install failed" -ForegroundColor Red
            if ($npmOutput -match "spawn git" -or $npmOutput -match "ENOENT.*git") {
                Write-Host "Error: git is missing from PATH." -ForegroundColor Red
                Write-Host "Install Git for Windows, then reopen PowerShell and retry:" -ForegroundColor Yellow
                Write-Host "  https://git-scm.com/download/win" -ForegroundColor Green
            }
            $npmOutput | ForEach-Object { Write-Host $_ }
            exit 1
        }
    } finally {
        $env:NPM_CONFIG_LOGLEVEL = $prevLogLevel
        $env:NPM_CONFIG_UPDATE_NOTIFIER = $prevUpdateNotifier
        $env:NPM_CONFIG_FUND = $prevFund
        $env:NPM_CONFIG_AUDIT = $prevAudit
    }
    Write-Host "[OK] CryptoClaw installed" -ForegroundColor Green
}

function Install-CryptoClawFromGit {
    param(
        [string]$RepoDir,
        [switch]$SkipUpdate
    )
    Require-Git
    Ensure-Pnpm
    $repoUrl = "https://github.com/TermiX-official/cryptoclaw.git"
    Write-Host "[*] Installing CryptoClaw from GitHub ($repoUrl)..." -ForegroundColor Yellow
    if (-not (Test-Path $RepoDir)) {
        git clone $repoUrl $RepoDir
    }
    if (-not $SkipUpdate) {
        if (-not (git -C $RepoDir status --porcelain 2>$null)) {
            git -C $RepoDir pull --rebase 2>$null
        } else {
            Write-Host "[!] Repo is dirty; skipping git pull" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[!] Git update disabled; skipping git pull" -ForegroundColor Yellow
    }
    pnpm -C $RepoDir install
    pnpm -C $RepoDir build
    $binDir = Join-Path $env:USERPROFILE ".local\\bin"
    if (-not (Test-Path $binDir)) {
        New-Item -ItemType Directory -Force -Path $binDir | Out-Null
    }
    $cmdPath = Join-Path $binDir "cryptoclaw.cmd"
    $cmdContents = "@echo off`r`nnode ""$RepoDir\\dist\\entry.js"" %*`r`n"
    Set-Content -Path $cmdPath -Value $cmdContents -NoNewline
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if (-not ($userPath -split ";" | Where-Object { $_ -ieq $binDir })) {
        [Environment]::SetEnvironmentVariable("Path", "$userPath;$binDir", "User")
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Host "[!] Added $binDir to user PATH (restart terminal if command not found)" -ForegroundColor Yellow
    }
    Write-Host "[OK] CryptoClaw wrapper installed to $cmdPath" -ForegroundColor Green
}

function Run-Doctor {
    Write-Host "[*] Running doctor to migrate settings..." -ForegroundColor Yellow
    try { cryptoclaw doctor --non-interactive } catch {}
    Write-Host "[OK] Migration complete" -ForegroundColor Green
}

function Main {
    if ($InstallMethod -ne "npm" -and $InstallMethod -ne "git") {
        Write-Host "Error: invalid -InstallMethod (use npm or git)." -ForegroundColor Red
        exit 2
    }
    if ($DryRun) {
        Write-Host "[OK] Dry run" -ForegroundColor Green
        Write-Host "[OK] Install method: $InstallMethod" -ForegroundColor Green
        if ($InstallMethod -eq "git") {
            Write-Host "[OK] Git dir: $GitDir" -ForegroundColor Green
        }
        if ($NoOnboard) { Write-Host "[OK] Onboard: skipped" -ForegroundColor Green }
        return
    }
    $isUpgrade = Check-ExistingCryptoClaw
    if (-not (Check-Node)) {
        Install-Node
        if (-not (Check-Node)) {
            Write-Host ""
            Write-Host "Error: Node.js installation may require a terminal restart" -ForegroundColor Red
            exit 1
        }
    }
    $finalGitDir = $null
    if ($InstallMethod -eq "git") {
        $finalGitDir = $GitDir
        Install-CryptoClawFromGit -RepoDir $GitDir -SkipUpdate:$NoGitUpdate
    } else {
        Install-CryptoClaw
    }
    if (-not (Ensure-CryptoClawOnPath)) {
        Write-Host "Install completed, but CryptoClaw is not on PATH yet." -ForegroundColor Yellow
        Write-Host "Open a new terminal, then run: cryptoclaw doctor" -ForegroundColor Green
        return
    }
    if ($isUpgrade -or $InstallMethod -eq "git") { Run-Doctor }

    $installedVersion = $null
    try { $installedVersion = (cryptoclaw --version 2>$null).Trim() } catch {}

    Write-Host ""
    if ($installedVersion) {
        Write-Host "CryptoClaw installed successfully ($installedVersion)!" -ForegroundColor Green
    } else {
        Write-Host "CryptoClaw installed successfully!" -ForegroundColor Green
    }
    Write-Host ""

    $messages = @(
        "Your keys, your claws, your chain.",
        "Self-custody meets AI automation.",
        "DeFi doesn't sleep, and neither does your agent.",
        "Not your keys, not your crypto. We keep both safe.",
        "Multi-chain, multi-channel, multi-talented.",
        "From wallet to swap in one command.",
        "The AI agent that actually holds its own keys.",
        "Claws out, chains synced--let's trade.",
        "Portfolio tracking at 3AM? I got you.",
        "Because even lobsters need a hardware wallet."
    )
    Write-Host (Get-Random -InputObject $messages) -ForegroundColor Gray
    Write-Host ""

    if ($InstallMethod -eq "git") {
        Write-Host "Source checkout: $finalGitDir" -ForegroundColor Green
        Write-Host "Wrapper: $env:USERPROFILE\\.local\\bin\\cryptoclaw.cmd" -ForegroundColor Green
        Write-Host ""
    }

    if ($isUpgrade) {
        Write-Host "Upgrade complete. Run " -NoNewline
        Write-Host "cryptoclaw doctor" -ForegroundColor Green -NoNewline
        Write-Host " to check for additional migrations."
    } else {
        if ($NoOnboard) {
            Write-Host "Skipping onboard (requested). Run " -NoNewline
            Write-Host "cryptoclaw onboard" -ForegroundColor Green -NoNewline
            Write-Host " later."
        } else {
            Write-Host "Starting setup..." -ForegroundColor Green
            Write-Host ""
            cryptoclaw onboard
        }
    }
}

Main
