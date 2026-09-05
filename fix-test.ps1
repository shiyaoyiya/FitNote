# ASCII-only: convert test-mysql.bat to CRLF
$path = Join-Path $PSScriptRoot "test-mysql.bat"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$content = $content -replace "`r`n", "`n"
$content = $content -replace "`n", "`r`n"
$ansi = [System.Text.Encoding]::GetEncoding(1252)
[System.IO.File]::WriteAllText($path, $content, $ansi)
Write-Host "OK"
