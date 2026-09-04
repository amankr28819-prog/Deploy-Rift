param(
    [string]$msg = "Update project files"
)

Write-Host "Checking status..." -ForegroundColor Cyan
git status

Write-Host "Adding changes..." -ForegroundColor Cyan
git add -A

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMsg = "$msg ($timestamp)"

Write-Host "Committing with message: '$commitMsg'..." -ForegroundColor Cyan
git commit -m "$commitMsg"

Write-Host "Pushing to GitHub (origin main)..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully synced to GitHub!" -ForegroundColor Green
} else {
    Write-Host "Sync failed. Please check your GitHub permissions or authentication." -ForegroundColor Red
}
