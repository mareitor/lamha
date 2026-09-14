# Fixes a real data problem on the live "Riyadh Public Space Program" demo:
# every new demo is seeded with 4 generic placeholder locations (KAFD
# Plaza, Riyadh Front, U Walk, Salam Park) so the Locations tab isn't
# empty on day one. import-riyadh.ps1 only ADDED the 8 real venues, it
# never removed those placeholders -- and two of them ("U Walk" and
# "Salam Park") happen to share an exact name with two of the real
# venues. Because the programming import matches locations by exact
# name and takes the FIRST match, every real "U Walk" and "Salam Park"
# booking got silently attached to the fake placeholder location instead
# of the real (curated) one.
#
# This script, run once against the already-created demo:
#   1. Reassigns every programming entry currently pointing at the fake
#      "U Walk" / "Salam Park" placeholder over to the real one.
#   2. Deletes all 4 placeholder locations (KAFD Plaza, Riyadh Front, and
#      the now-unused placeholder U Walk / Salam Park).
# Leaves everything else -- the 8 real locations and all 159 programming
# entries -- untouched.
#
#   cd C:\Users\marei\Desktop\lamha-live
#   .\data-imports\fix-riyadh-locations.ps1

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
    exit 1
}
if ($Match.Count -gt 1) {
    Write-Host "Found more than one demo with that name - stopping so nothing gets touched by mistake." -ForegroundColor Red
    $Match | ForEach-Object { Write-Host "  $($_.id)  created $($_.createdAt)" }
    exit 1
}

$DemoId = $Match[0].id
Write-Host "Found: $DemoId" -ForegroundColor Green

$Demo = Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId" -Headers $Headers

# The exact seeded placeholder text (from worker/src/lib/kv.ts's
# defaultLocations()) -- used to tell a placeholder apart from a real,
# identically-named location.
$PlaceholderText = @{
    "u walk"     = "Retail foot traffic all day - good fit for shorter, high-turnover activations."
    "salam park" = "Family-oriented weekend crowds - a natural home for interactive or live-performance acts."
}
$PureFakeNames = @("kafd plaza", "riyadh front")

$ToDelete = @()
$Reassignments = @{}  # placeholderId -> realId

foreach ($loc in $Demo.locations) {
    $key = $loc.name.Trim().ToLower()

    if ($PureFakeNames -contains $key) {
        $ToDelete += $loc.id
        Write-Host "Will remove unused placeholder: $($loc.name)" -ForegroundColor Yellow
        continue
    }

    if ($PlaceholderText.ContainsKey($key)) {
        # There should be exactly one placeholder and one real location
        # sharing this name. Identify the placeholder by its known seeded
        # whyItWorks text (the placeholder text uses a straight hyphen;
        # compare loosely so an em dash either side doesn't break the match).
        $normalizedWhy = $loc.whyItWorks -replace [char]0x2014, "-"
        if ($normalizedWhy.Trim() -eq $PlaceholderText[$key]) {
            $ToDelete += $loc.id
            Write-Host "Will remove placeholder '$($loc.name)' (id $($loc.id)) and move its bookings to the real one" -ForegroundColor Yellow
        }
    }
}

# Find the real (surviving) location id for each name we're deleting a
# placeholder for, then reassign any programming entries currently
# pointing at the placeholder.
foreach ($placeholderId in $ToDelete) {
    $placeholder = $Demo.locations | Where-Object { $_.id -eq $placeholderId }
    if (-not $placeholder) { continue }
    $key = $placeholder.name.Trim().ToLower()
    if (-not $PlaceholderText.ContainsKey($key)) { continue }  # pure-fake names have no real counterpart to move bookings to

    $real = $Demo.locations | Where-Object { $_.name.Trim().ToLower() -eq $key -and $_.id -ne $placeholderId } | Select-Object -First 1
    if (-not $real) {
        Write-Host "Could not find a real counterpart for '$($placeholder.name)' - leaving its bookings alone." -ForegroundColor Red
        continue
    }

    $affected = $Demo.programming | Where-Object { $_.locationId -eq $placeholderId }
    Write-Host "Reassigning $($affected.Count) booking(s) at '$($placeholder.name)' to the real location..." -ForegroundColor Cyan
    foreach ($entry in $affected) {
        $body = @{ locationId = $real.id } | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId/programming/$($entry.id)" -Method Patch `
            -Headers $Headers -Body $body -ContentType "application/json" | Out-Null
    }
}

Write-Host "`nDeleting $($ToDelete.Count) placeholder location(s)..." -ForegroundColor Cyan
foreach ($id in $ToDelete) {
    Invoke-RestMethod -Uri "$ApiBase/api/admin/demos/$DemoId/locations/$id" -Method Delete -Headers $Headers | Out-Null
}

Write-Host "`nDone. The Locations tab should now show only the 8 real venues, and every" -ForegroundColor Green
Write-Host "booking (including U Walk and Salam Park) should point at the right one." -ForegroundColor Green
Write-Host "Check it here:" -ForegroundColor Cyan
Write-Host "  https://lamha-demo-gen.netlify.app/$DemoId/planner" -ForegroundColor Yellow
