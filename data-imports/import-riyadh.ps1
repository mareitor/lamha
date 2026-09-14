# Imports the real "Riyadh" public-space program into Lamha as a new
# kind:"live" project (never expires, no demo language). Run this from
# inside the lamha-live folder, e.g.:
#   cd C:\Users\marei\Desktop\lamha-live
#   .\data-imports\import-riyadh.ps1
#
# What it does, in order:
#   1. Creates a new demo with kind=live.
#   2. Removes the 4 generic placeholder locations every new demo is
#      seeded with (KAFD Plaza, Riyadh Front, U Walk, Salam Park) -- two
#      of them share an exact name with real venues below, and the
#      programming import matches by name, so leaving them in would
#      silently attach real bookings to the wrong (fake) location.
#   3. Adds the 8 real venues (data-imports\riyadh-locations-import.json).
#   4. Bulk-imports the 159 real programming entries pulled from the
#      season calendar (data-imports\riyadh-programming-import.json) --
#      each one is matched to its venue by name, so step 3 must run first.
#   5. Marks onboarding complete so the client lands on the dashboard,
#      not the intake wizard.
#   6. Prints the shareable client link so you can open it and check it
#      against what the client currently sees on riyadh-winter-2026.
#
# Nothing here touches the old riyadh-winter-2026 site or its data -- this
# only writes into the new Lamha project. Needs the worker deployed with
# the DemoKind + budget-route + onboarding-route changes (you already did
# this).
#
# NOTE: if you already ran an earlier version of this script once for
# the real Riyadh demo, do NOT run this again -- it would create a
# SECOND demo and duplicate everything. Use fix-riyadh-locations.ps1
# instead to repair the existing one.

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

Write-Host "`nRemoving placeholder locations..." -ForegroundColor Cyan
foreach ($placeholder in $CreateRes.demo.locations) {
    Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId/locations/$($placeholder.id)" -Method Delete `
        -Headers $Headers | Out-Null
    Write-Host "  - $($placeholder.name)"
}

# -Encoding UTF8 is required on both reads below -- without it, PowerShell
# 5.1 reads the file using the system's ANSI codepage, which can corrupt
# non-ASCII characters (accented names, em-dashes) badly enough to break
# JSON parsing server-side and silently import 0 entries. The charset=utf-8
# on ContentType makes sure Invoke-RestMethod sends it back out as UTF-8
# too, not just reads it right.
$Locations = Get-Content "$PSScriptRoot\riyadh-locations-import.json" -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "`nAdding $($Locations.Count) locations..." -ForegroundColor Cyan
foreach ($loc in $Locations) {
    $body = $loc | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId/locations" -Method Post -Headers $Headers `
        -Body $body -ContentType "application/json; charset=utf-8" | Out-Null
    Write-Host "  + $($loc.name)"
}

Write-Host "`nImporting programming entries..." -ForegroundColor Cyan
$ProgrammingJson = Get-Content "$PSScriptRoot\riyadh-programming-import.json" -Raw -Encoding UTF8
$ImportRes = Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId/programming/import" -Method Post `
    -Headers $Headers -Body $ProgrammingJson -ContentType "application/json; charset=utf-8"
Write-Host "Imported $($ImportRes.added) programming entries." -ForegroundColor Green

# Skip the client intake wizard -- this is a real, already-decided project,
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
