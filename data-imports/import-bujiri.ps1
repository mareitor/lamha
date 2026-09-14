# Imports "Riyadh Finds You" (client: Bonafide; final client: Diriyah)
# into Lamha as a new kind:"live" project (never expires, no demo
# language). Run this from inside the lamha-live folder, e.g.:
#   cd C:\Users\marei\Desktop\lamha-live
#   .\data-imports\import-bujiri.ps1
#
# What it does, in order:
#   1. Creates a new demo with kind=live.
#   2. Removes the 4 generic placeholder locations every new demo is
#      seeded with -- neither Bujairi Terrace nor Zallal collides with
#      those names, but they'd otherwise sit in the client-facing
#      Locations tab as unrelated clutter.
#   3. Adds the 2 real venues (data-imports\bujiri-locations-import.json).
#   4. Bulk-imports the 512 real programming entries pulled from the
#      season calendar (data-imports\bujiri-programming-import.json) --
#      each one is matched to its venue by name, so step 3 must run first.
#   5. Sets the total budget (4,400,000 SAR) using the admin-only budget
#      route.
#   6. Marks onboarding complete so the client lands on the dashboard,
#      not the intake wizard.
#   7. Prints the shareable client link.
#
# NOT migrated (flagged to Mario, no schema home in Lamha yet):
#   - The 3 message templates (bujiri-message-templates.json) -- no field
#     for these on a DemoRecord.
#   - The 4 ops/staffing line items (bujiri-ops-line-items.json, ~390,000
#     SAR of program-manager/assistant costs) -- Lamha's Invoices are
#     client-facing billing records (status/dueDate), not an internal
#     staffing budget breakdown, so forcing these in would misrepresent
#     internal costs as invoices sent to the client. Kept as raw JSON for
#     reference only.
#
# Needs the worker deployed with the DemoKind + budget-route +
# onboarding-route changes (already done for Riyadh, same worker).

$ApiBase = "https://lamha-worker.juicy-415.workers.dev"

$SecurePassword = Read-Host "Lamha admin password" -AsSecureString
$AdminPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
)
$Headers = @{ Authorization = "Bearer $AdminPassword" }

Write-Host "`nCreating demo..." -ForegroundColor Cyan
$CreateBody = "companyName=$([uri]::EscapeDataString('Bonafide - Diriyah'))&kind=live"
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

# -Encoding UTF8 is required on both reads below: without it, PowerShell 5.1
# reads the file using the system's ANSI codepage, which corrupts the real
# non-ASCII characters in this data (accented names, an em-dash, an emoji
# pulled from a real artist bio) -- badly enough on the programming file
# last time that the corrupted body failed JSON parsing server-side and
# silently imported 0 entries. Same root cause as the em-dash .ps1 parse
# bug, different file. The charset=utf-8 on ContentType below makes sure
# Invoke-RestMethod sends it back out as UTF-8 too, not just reads it right.
$Locations = Get-Content "$PSScriptRoot\bujiri-locations-import.json" -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "`nAdding $($Locations.Count) locations..." -ForegroundColor Cyan
foreach ($loc in $Locations) {
    $body = $loc | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId/locations" -Method Post -Headers $Headers `
        -Body $body -ContentType "application/json; charset=utf-8" | Out-Null
    Write-Host "  + $($loc.name)"
}

Write-Host "`nImporting programming entries (this is a big batch, give it a moment)..." -ForegroundColor Cyan
$ProgrammingJson = Get-Content "$PSScriptRoot\bujiri-programming-import.json" -Raw -Encoding UTF8
$ImportRes = Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId/programming/import" -Method Post `
    -Headers $Headers -Body $ProgrammingJson -ContentType "application/json; charset=utf-8"
Write-Host "Imported $($ImportRes.added) programming entries." -ForegroundColor Green

Write-Host "`nSetting total budget..." -ForegroundColor Cyan
$BudgetBody = @{ totalBudget = 4400000; currency = "SAR" } | ConvertTo-Json
Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId/budget" -Method Patch -Headers $Headers `
    -Body $BudgetBody -ContentType "application/json" | Out-Null

# Skip the client intake wizard -- this is a real, already-decided project,
# not a fresh prospect who needs to answer "what's your event" from
# scratch.
Write-Host "`nMarking onboarding complete (skips the client setup wizard)..." -ForegroundColor Cyan
$OnboardingBody = @{
    onboardingComplete = $true
    event = @{
        eventName   = "Riyadh Finds You"
        eventType   = "Ongoing public-space activation"
        location    = "Bujairi Terrace and Zallal, Diriyah"
        startDate   = "2026-10-14"
        endDate     = "2027-03-10"
        description = "Final client: Diriyah."
    }
} | ConvertTo-Json
Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId/onboarding" -Method Patch -Headers $Headers `
    -Body $OnboardingBody -ContentType "application/json" | Out-Null

Write-Host "`nDone. Open this to check it:" -ForegroundColor Cyan
Write-Host "  https://lamha-demo-gen.netlify.app/$DemoId" -ForegroundColor Yellow
Write-Host "`n(Admin editor: https://lamha-demo-gen.netlify.app/admin/demos/$DemoId )"
