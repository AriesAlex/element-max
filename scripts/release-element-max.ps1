[CmdletBinding()]
param(
    [switch] $SkipPagesDeployment
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$desktopDir = Join-Path $repoRoot "apps/desktop"
$desktopDistDir = Join-Path $desktopDir "dist"
$releaseTag = "element-max-latest"

function Invoke-External {
    param(
        [Parameter(Mandatory)] [string] $FilePath,
        [Parameter(Mandatory)] [string[]] $Arguments,
        [Parameter(Mandatory)] [string] $WorkingDirectory
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
        }
    } finally {
        Pop-Location
    }
}

function Get-ExternalOutput {
    param(
        [Parameter(Mandatory)] [string] $FilePath,
        [Parameter(Mandatory)] [string[]] $Arguments,
        [Parameter(Mandatory)] [string] $WorkingDirectory
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        $output = & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
        }
        return ($output | Out-String).Trim()
    } finally {
        Pop-Location
    }
}

function Invoke-Pnpm {
    param(
        [Parameter(Mandatory)] [string] $Version,
        [Parameter(Mandatory)] [string[]] $Arguments,
        [Parameter(Mandatory)] [string] $WorkingDirectory
    )

    Invoke-External -FilePath "corepack" -Arguments (@("pnpm@$Version") + $Arguments) -WorkingDirectory $WorkingDirectory
}

function Enter-VisualStudioEnvironment {
    if (Get-Command cl.exe -ErrorAction SilentlyContinue) {
        return
    }

    $visualStudioRoot = Join-Path $env:ProgramFiles "Microsoft Visual Studio/2022"
    $installation = Get-ChildItem -LiteralPath $visualStudioRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "Common7/Tools/Microsoft.VisualStudio.DevShell.dll") } |
        Select-Object -First 1
    if (-not $installation) {
        throw "Visual Studio 2022 with the C++ build tools is required"
    }

    $devShellModule = Join-Path $installation.FullName "Common7/Tools/Microsoft.VisualStudio.DevShell.dll"
    Import-Module $devShellModule
    Enter-VsDevShell -VsInstallPath $installation.FullName -SkipAutomaticLocation -DevCmdArguments "-arch=x64 -host_arch=x64"

    if (-not (Get-Command cl.exe -ErrorAction SilentlyContinue)) {
        throw "Visual Studio C++ environment did not provide cl.exe"
    }
}

function Assert-SingleFile {
    param(
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]] $Files,
        [Parameter(Mandatory)] [string] $Description
    )

    if ($Files.Count -ne 1) {
        throw "Expected exactly one $Description, found $($Files.Count)"
    }
    return $Files[0]
}

if ($env:OS -ne "Windows_NT") {
    throw "Element Max releases must be built on Windows"
}

$ghCommand = Get-Command gh.exe -ErrorAction SilentlyContinue
if ($ghCommand) {
    $ghPath = $ghCommand.Source
} else {
    $bundledGh = Join-Path $env:ProgramFiles "GitHub CLI/gh.exe"
    if (Test-Path -LiteralPath $bundledGh) {
        $ghPath = $bundledGh
    } else {
        throw "GitHub CLI is required"
    }
}

$branch = Get-ExternalOutput -FilePath "git" -Arguments @("branch", "--show-current") -WorkingDirectory $repoRoot
if ($branch -ne "main") {
    throw "Releases must be built from main, current branch is $branch"
}

$status = Get-ExternalOutput -FilePath "git" -Arguments @("status", "--porcelain=v1") -WorkingDirectory $repoRoot
if ($status) {
    throw "Commit or remove working-tree changes before building a release"
}

$commit = Get-ExternalOutput -FilePath "git" -Arguments @("rev-parse", "HEAD") -WorkingDirectory $repoRoot
$remoteMain = Get-ExternalOutput -FilePath "git" -Arguments @("ls-remote", "origin", "refs/heads/main") -WorkingDirectory $repoRoot
$remoteCommit = ($remoteMain -split "\s+")[0]
if ($commit -ne $remoteCommit) {
    throw "HEAD must be pushed to origin/main before building a release"
}

$packageJson = Get-Content -LiteralPath (Join-Path $desktopDir "package.json") -Raw | ConvertFrom-Json
$siteVersion = Get-Content -LiteralPath (Join-Path $repoRoot "site/version.json") -Raw | ConvertFrom-Json
$version = [string] $packageJson.version
if ($siteVersion.version -ne $version) {
    throw "site/version.json ($($siteVersion.version)) must match the desktop version ($version)"
}

$repo = Get-ExternalOutput -FilePath $ghPath -Arguments @("repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner") -WorkingDirectory $repoRoot
if (-not $repo) {
    throw "Unable to resolve the GitHub repository"
}

$gitBin = Join-Path $env:ProgramFiles "Git/bin"
if (Test-Path -LiteralPath $gitBin) {
    $env:Path = "$gitBin;$env:Path"
}

Enter-VisualStudioEnvironment
foreach ($tool in @("cl.exe", "rustup.exe", "perl.exe", "nasm.exe", "tclsh.exe")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "$tool is required to build Element Max"
    }
}
Invoke-External -FilePath "rustup" -Arguments @("target", "add", "x86_64-pc-windows-msvc") -WorkingDirectory $repoRoot

Write-Host "Building Matrix JS SDK"
Invoke-Pnpm -Version "11.2.2" -Arguments @("install", "--frozen-lockfile", "--ignore-scripts") -WorkingDirectory (Join-Path $repoRoot "vendor/matrix-js-sdk")
Invoke-Pnpm -Version "11.2.2" -Arguments @("build:compile") -WorkingDirectory (Join-Path $repoRoot "vendor/matrix-js-sdk")
Invoke-Pnpm -Version "11.2.2" -Arguments @("build:types") -WorkingDirectory (Join-Path $repoRoot "vendor/matrix-js-sdk")

Write-Host "Building Element Call"
Invoke-Pnpm -Version "11.6.0" -Arguments @("install", "--frozen-lockfile") -WorkingDirectory (Join-Path $repoRoot "vendor/element-call")
Invoke-Pnpm -Version "11.6.0" -Arguments @("build:full", "--config", "vite-embedded.config.js") -WorkingDirectory (Join-Path $repoRoot "vendor/element-call")

Write-Host "Building Element Web"
Invoke-Pnpm -Version "11.20.0" -Arguments @("install", "--frozen-lockfile") -WorkingDirectory $repoRoot
Copy-Item -LiteralPath (Join-Path $desktopDir "element.max/config.json") -Destination (Join-Path $repoRoot "apps/web/config.json") -Force
Invoke-Pnpm -Version "11.20.0" -Arguments @("--filter", "element-web", "build") -WorkingDirectory $repoRoot

$desktopWebapp = Join-Path $desktopDir "webapp"
if (Test-Path -LiteralPath $desktopWebapp) {
    Remove-Item -LiteralPath $desktopWebapp -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $repoRoot "apps/web/webapp") -Destination $desktopWebapp -Recurse
Copy-Item -LiteralPath (Join-Path $desktopDir "element.max/config.json") -Destination (Join-Path $desktopWebapp "config.json") -Force
Invoke-Pnpm -Version "11.20.0" -Arguments @("--dir", "apps/desktop", "asar-webapp") -WorkingDirectory $repoRoot

Write-Host "Building native dependencies"
$hakTrackedFiles = @("package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml")
try {
    Invoke-Pnpm -Version "11.20.0" -Arguments @("--dir", "apps/desktop", "build:native", "--target", "x86_64-pc-windows-msvc") -WorkingDirectory $repoRoot

    if (Test-Path -LiteralPath $desktopDistDir) {
        Remove-Item -LiteralPath $desktopDistDir -Recurse -Force
    }
    $env:NX_DAEMON = "false"
    $env:VARIANT_PATH = "element.max/build.json"
    $env:VERSION = $version

    Write-Host "Packaging Element Max $version"
    Invoke-Pnpm -Version "11.20.0" -Arguments @("--dir", "apps/desktop", "run", "build", "--publish", "never", "-w", "squirrel") -WorkingDirectory $repoRoot
} finally {
    Invoke-External -FilePath "git" -Arguments (@("restore", "--source=HEAD", "--worktree", "--") + $hakTrackedFiles) -WorkingDirectory $repoRoot
}

$squirrelDir = Assert-SingleFile -Files @(Get-ChildItem -LiteralPath $desktopDistDir -Directory -Filter "squirrel-windows*") -Description "Squirrel output directory"
$setup = Assert-SingleFile -Files @(Get-ChildItem -LiteralPath $desktopDistDir -Recurse -File -Filter "*Setup*.exe") -Description "setup executable"
$releases = Assert-SingleFile -Files @(Get-ChildItem -LiteralPath $squirrelDir.FullName -File -Filter "RELEASES") -Description "RELEASES file"
$fullPackage = Assert-SingleFile -Files @(Get-ChildItem -LiteralPath $squirrelDir.FullName -File -Filter "*-full.nupkg") -Description "full Squirrel package"

$releaseLines = @(Get-Content -LiteralPath $releases.FullName | Where-Object { $_.Trim() })
if ($releaseLines.Count -ne 1) {
    throw "RELEASES must contain exactly one package"
}
$releaseParts = $releaseLines[0] -split "\s+"
if ($releaseParts.Count -ne 3 -or $releaseParts[1] -ne $fullPackage.Name -or [long] $releaseParts[2] -ne $fullPackage.Length) {
    throw "RELEASES does not describe the generated full package"
}
$packageHash = (Get-FileHash -LiteralPath $fullPackage.FullName -Algorithm SHA1).Hash
if ($releaseParts[0] -ne $packageHash) {
    throw "RELEASES contains the wrong package hash"
}

$postBuildStatus = Get-ExternalOutput -FilePath "git" -Arguments @("status", "--porcelain=v1") -WorkingDirectory $repoRoot
if ($postBuildStatus) {
    throw "The build changed files in the working tree; review them before publishing"
}

$releaseDir = Join-Path ([System.IO.Path]::GetTempPath()) ("element-max-release-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $releaseDir | Out-Null
try {
    $stableSetup = Join-Path $releaseDir "Element-Max-Setup.exe"
    $releaseManifest = Join-Path $releaseDir "RELEASES"
    $releasePackage = Join-Path $releaseDir $fullPackage.Name
    Copy-Item -LiteralPath $setup.FullName -Destination $stableSetup
    Copy-Item -LiteralPath $releases.FullName -Destination $releaseManifest
    Copy-Item -LiteralPath $fullPackage.FullName -Destination $releasePackage

    & $ghPath release view $releaseTag --repo $repo *> $null
    $releaseExists = $LASTEXITCODE -eq 0
    $releaseNotes = "Element Max $version for Windows x64. Install this build once; subsequent Element Max versions update automatically."

    if ($releaseExists) {
        Write-Host "Updating rolling GitHub release"
        Invoke-External -FilePath $ghPath -Arguments @("release", "upload", $releaseTag, $releasePackage, $stableSetup, "--clobber", "--repo", $repo) -WorkingDirectory $repoRoot
        Invoke-External -FilePath $ghPath -Arguments @("release", "upload", $releaseTag, $releaseManifest, "--clobber", "--repo", $repo) -WorkingDirectory $repoRoot
        Invoke-External -FilePath $ghPath -Arguments @("release", "edit", $releaseTag, "--title", "Element Max $version", "--notes", $releaseNotes, "--prerelease", "--latest=false", "--repo", $repo) -WorkingDirectory $repoRoot
    } else {
        Write-Host "Creating rolling GitHub release"
        Invoke-External -FilePath $ghPath -Arguments @("release", "create", $releaseTag, $releasePackage, $stableSetup, $releaseManifest, "--target", $commit, "--title", "Element Max $version", "--notes", $releaseNotes, "--prerelease", "--latest=false", "--repo", $repo) -WorkingDirectory $repoRoot
    }

    Invoke-External -FilePath "git" -Arguments @("tag", "--force", $releaseTag, $commit) -WorkingDirectory $repoRoot
    Invoke-External -FilePath "git" -Arguments @("push", "origin", "--force", "refs/tags/$releaseTag") -WorkingDirectory $repoRoot

    $wantedAssets = @("Element-Max-Setup.exe", "RELEASES", $fullPackage.Name)
    $release = Get-ExternalOutput -FilePath $ghPath -Arguments @("release", "view", $releaseTag, "--repo", $repo, "--json", "assets") -WorkingDirectory $repoRoot | ConvertFrom-Json
    foreach ($asset in $release.assets) {
        if ($asset.name -notin $wantedAssets) {
            $assetId = ([uri] $asset.apiUrl).Segments[-1]
            Invoke-External -FilePath $ghPath -Arguments @("api", "--method", "DELETE", "repos/$repo/releases/assets/$assetId") -WorkingDirectory $repoRoot
        }
    }

    if (-not $SkipPagesDeployment) {
        Write-Host "Dispatching the lightweight Pages deployment"
        Invoke-External -FilePath $ghPath -Arguments @("workflow", "run", "deploy-element-max-pages.yaml", "--ref", "main", "--repo", $repo) -WorkingDirectory $repoRoot
    }
} finally {
    Remove-Item -LiteralPath $releaseDir -Recurse -Force
}

Write-Host "Published Element Max $version from $commit"
