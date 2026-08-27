[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$source = Join-Path $repoRoot "branding/element-max-icon.svg"
$magick = Get-Command magick.exe -ErrorAction Stop

function Convert-Icon {
    param(
        [Parameter(Mandatory)] [int] $Size,
        [Parameter(Mandatory)] [string] $Destination
    )

    & $magick.Source -background none -density 384 $source -resize "${Size}x${Size}" $Destination
    if ($LASTEXITCODE -ne 0) {
        throw "ImageMagick failed to generate $Destination"
    }
}

foreach ($size in @(24, 120, 144, 152, 180, 512, 1024)) {
    Convert-Icon -Size $size -Destination (Join-Path $repoRoot "apps/web/res/vector-icons/$size.png")
}

Convert-Icon -Size 512 -Destination (Join-Path $repoRoot "apps/desktop/build/icon.png")
Convert-Icon -Size 1024 -Destination (Join-Path $repoRoot "apps/desktop/build/icon.icon/Assets/element.png")

$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("element-max-icons-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null
try {
    $icoSources = foreach ($size in @(16, 24, 32, 48, 64, 128, 256)) {
        $path = Join-Path $temporaryDirectory "$size.png"
        Convert-Icon -Size $size -Destination $path
        $path
    }
    $icoDestination = Join-Path $repoRoot "apps/desktop/build/icon.ico"
    & $magick.Source @icoSources $icoDestination
    if ($LASTEXITCODE -ne 0) {
        throw "ImageMagick failed to generate $icoDestination"
    }
} finally {
    Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force
}
