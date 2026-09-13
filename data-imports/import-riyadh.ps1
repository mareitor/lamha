# Imports the real "Riyadh" public-space program into Lamha as a new
# kind:"live" project (never expires, no demo language). Run this from
# inside the lamha-live folder, e.g.:
#   cd C:\Users\marei\Desktop\lamha-live
#   .\data-imports\import-riyadh.ps1
#
# What it does, in order:
#   1. Creates a new demo with kind=live.
#   2. Adds the 8 real venues (data-imports\riyadh-locations-import.json).
#   3. Bulk-imports the 159 real programming entries pulled from the
#      season calendar (data-imports\riyadh-programming-import.json) —
#      each one is matched to its venue by name, so step 2 must run first.
#   4. Prints the shareable client link so you can open it and check it
#      against what the client currently sees on riyadh-winter-2026.
#
# Nothing here touches the old riyadh-winter-2026 site or its data — this
# only writes into the new Lamha project. Needs the worker deployed with
# the DemoKind + budget-route changes (you already did this).

$ApiBase = "https://lamha-worker.juicy-415.workers.dev"
# If this isn't your worker's real URL, check frontend/.env or Netlify's
# VITE_API_BASE_URL env var and edit the line above before running.

$SecurePassword = Read-Host "Lamha admin password" -AsSecureString
$AdminPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
)
$Headers = @{ Authorization = "Bearer $AdminPassword" }

Write-Host "`nCreating demo..." -ForegroundColor Cyan
$CreateBody = "companyName=$([uri]::EscapeDataString('Riyadh Public Space Program'))&kind=live"
$CreateRes = Invoke-RestMethod -Uri "$ApiBase/api/admin/demos" -Method Post -Headers $Headers `
    -Body $CreateBody -ContentType "application/x-www-form-urlencoded"
$DemoId = $CreateRes.demo.id
Write-Host "Created: $DemoId" -ForegroundColor Green

$Locations = Get-Content "$PSScriptRoot\riyadh-locations-import.json" -Raw | ConvertFrom-Json
Write-Host "`nAdding $($Locations.Count) locations..." -ForegroundColor Cyan
foreach ($loc in $Locations) {
    $body = $loc | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId/locations" -Method Post -Headers $Headers `
        -Body $body -ContentType "application/json" | Out-Null
    Write-Host "  + $($loc.name)"
}

Write-Host "`nImporting programming entries..." -ForegroundColor Cyan
$ProgrammingJson = Get-Content "$PSScriptRoot\riyadh-programming-import.json" -Raw
$ImportRes = Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId/programming/import" -Method Post `
    -Headers $Headers -Body $ProgrammingJson -ContentType "application/json"
Write-Host "Imported $($ImportRes.added) programming entries." -ForegroundColor Green

# Skip the client intake wizard — this is a real, already-decided project,
# not a fresh prospect who needs to answer "what's your event" from
# scratch. Needs the worker deployed with the /onboarding admin route.
Write-Host "`nMarking onboarding complete (skips the client setup wizard)..." -ForegroundColor Cyan
$OnboardingBody = @{
    onboardingComplete = $true
    event = @{
        eventName = "Riyadh Public Space Program"
        eventType = "Ongoing public-space activation"
        location  = "Riyadh"
    }
} | ConvertTo-Json
Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId/onboarding" -Method Patch -Headers $Headers `
    -Body $OnboardingBody -ContentType "application/json" | Out-Null

Write-Host "`nDone. Open this to check it:" -ForegroundColor Cyan
Write-Host "  https://lamha-demo-gen.netlify.app/$DemoId" -ForegroundColor Yellow
Write-Host "`n(Admin editor: https://lamha-demo-gen.netlify.app/admin/demos/$DemoId )"
