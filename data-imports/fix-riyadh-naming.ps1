# Corrects the naming on the already-created "Riyadh Public Space
# Program" demo, per Mario:
#   - The actual program name is "Riyadh Winter Street Experiences"
#   - Our client is Bonafide; their client (the final client) is RCRC
#
# Sets:
#   - Internal admin name (companyName) -> "Bonafide - RCRC"
#     (admin dashboard list + this demo's editor header only, never
#     shown to the client)
#   - Client-facing event name -> "Riyadh Winter Street Experiences"
#   - Event description -> notes the final client for reference
#
# Needs the worker redeployed first (this needs the new
# PATCH /demos/:id/company-name route):
#   cd worker && npx wrangler deploy
#
# Then run this from inside the lamha-live folder:
#   cd C:\Users\marei\Desktop\lamha-live
#   .\data-imports\fix-riyadh-naming.ps1

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
    Write-Host "Couldn't find a demo named 'Riyadh Public Space Program' - has it already been renamed?" -ForegroundColor Red
    Write-Host "Here's what's there instead:" -ForegroundColor Yellow
    $Index.demos | ForEach-Object { Write-Host "  $($_.id)  $($_.companyName)" }
    exit 1
}
if ($Match.Count -gt 1) {
    Write-Host "Found more than one demo with that name - stopping so nothing gets touched by mistake." -ForegroundColor Red
    exit 1
}

$DemoId = $Match[0].id
Write-Host "Found: $DemoId" -ForegroundColor Green

Write-Host "`nRenaming internal admin label..." -ForegroundColor Cyan
$NameBody = @{ companyName = "Bonafide - RCRC" } | ConvertTo-Json
Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId/company-name" -Method Patch -Headers $Headers `
    -Body $NameBody -ContentType "application/json" | Out-Null

Write-Host "Updating event name..." -ForegroundColor Cyan
$EventBody = @{
    eventName   = "Riyadh Winter Street Experiences"
    description = "Final client: RCRC."
} | ConvertTo-Json
Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId/event" -Method Patch -Headers $Headers `
    -Body $EventBody -ContentType "application/json" | Out-Null

Write-Host "`nDone. Reload the client link and admin editor to check it:" -ForegroundColor Green
Write-Host "  https://lamha-demo-gen.netlify.app/$DemoId" -ForegroundColor Yellow
Write-Host "  https://lamha-demo-gen.netlify.app/admin/demos/$DemoId" -ForegroundColor Yellow
