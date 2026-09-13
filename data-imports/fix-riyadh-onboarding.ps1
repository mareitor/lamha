# One-time fix for the "Riyadh Public Space Program" demo you already
# created with import-riyadh.ps1. The create/locations/programming steps
# all worked, but the client link is still showing the onboarding wizard
# ("Let's set up your event") instead of the dashboard with the imported
# data — because nothing had marked onboarding as done yet. That required
# a new admin route (PATCH /demos/:id/onboarding), which needs the worker
# redeployed first.
#
# Run this AFTER you've redeployed the worker (cd worker && npx wrangler
# deploy) with today's changes. It does NOT create a new demo or re-import
# anything — it finds the existing "Riyadh Public Space Program" demo by
# name and just marks its onboarding complete, so run it once.
#
#   cd C:\Users\marei\Desktop\lamha-live
#   .\data-imports\fix-riyadh-onboarding.ps1

$ApiBase = "https://lamha-worker.juicy-415.workers.dev"

$SecurePassword = Read-Host "Lamha admin password" -AsSecureString
$AdminPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
)
$Headers = @{ Authorization = "Bearer $AdminPassword" }

Write-Host "`nLooking up the demo..." -ForegroundColor Cyan
$Index = Invoke-RestMethod -Uri "$ApiBase/api/admin/demos" -Headers $Headers
$Match = @($Index.demos | Where-Object { $_.companyName -eq "Riyadh Public Space Program" })

if ($Match.Count -eq 0) {
    Write-Host "Couldn't find a demo named 'Riyadh Public Space Program'." -ForegroundColor Red
    Write-Host "Here's what's there instead:" -ForegroundColor Yellow
    $Index.demos | ForEach-Object { Write-Host "  $($_.id)  $($_.companyName)" }
    exit 1
}
if ($Match.Count -gt 1) {
    Write-Host "Found more than one demo with that name - pick the right id and edit this script to hardcode it:" -ForegroundColor Red
    $Match | ForEach-Object { Write-Host "  $($_.id)  created $($_.createdAt)" }
    exit 1
}

$DemoId = $Match[0].id
Write-Host "Found: $DemoId" -ForegroundColor Green

Write-Host "`nMarking onboarding complete..." -ForegroundColor Cyan
$Body = @{
    onboardingComplete = $true
    event = @{
        eventName = "Riyadh Public Space Program"
        eventType = "Ongoing public-space activation"
        location  = "Riyadh"
    }
} | ConvertTo-Json
Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId/onboarding" -Method Patch -Headers $Headers `
    -Body $Body -ContentType "application/json" | Out-Null

Write-Host "`nDone. Reload this link - it should now show the dashboard, not the setup wizard:" -ForegroundColor Cyan
Write-Host "  https://lamha-demo-gen.netlify.app/$DemoId" -ForegroundColor Yellow
