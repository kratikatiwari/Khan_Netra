# KhanNetra — One-Click Start
$ROOT = $PSScriptRoot
Write-Host "Starting KhanNetra..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"Set-Location '$ROOT\server'; node src/index.js`"" -WindowStyle Normal
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit -Command `"Set-Location '$ROOT\client'; npm run dev`"" -WindowStyle Normal
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
Write-Host "✅ KhanNetra is running at http://localhost:3000" -ForegroundColor Green
Write-Host "Login: admin@khannetra.gov.in / KhanNetra@2024" -ForegroundColor Yellow
