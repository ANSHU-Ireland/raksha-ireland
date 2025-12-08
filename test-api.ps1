# Raksha Ireland - Simple API Test Suite
# Run this to verify backend endpoints

$baseUrl = "http://192.168.8.70:3000"
$passCount = 0
$failCount = 0

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RAKSHA IRELAND - API TESTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "Test 1: Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -TimeoutSec 5
    if ($health.database -eq 'connected') {
        Write-Host "  PASS - Server healthy, DB connected" -ForegroundColor Green
        $passCount++
    } else {
        Write-Host "  FAIL - Unhealthy" -ForegroundColor Red
        $failCount++
    }
} catch {
    Write-Host "  FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $failCount++
}

# Test 2: API Root
Write-Host "`nTest 2: API Root..." -ForegroundColor Yellow
try {
    $api = Invoke-RestMethod -Uri "$baseUrl/api" -TimeoutSec 5
    if ($api.status -eq 'active') {
        Write-Host "  PASS - API responding" -ForegroundColor Green
        $passCount++
    } else {
        Write-Host "  FAIL - Unexpected status" -ForegroundColor Red
        $failCount++
    }
} catch {
    Write-Host "  FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $failCount++
}

# Test 3: Admin Auth Required
Write-Host "`nTest 3: Admin Auth Required..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/api/admin/users" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  FAIL - Should require auth" -ForegroundColor Red
    $failCount++
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "  PASS - Correctly requires auth" -ForegroundColor Green
        $passCount++
    } else {
        Write-Host "  FAIL - Wrong error" -ForegroundColor Red
        $failCount++
    }
}

# Test 4: Admin Valid Auth
Write-Host "`nTest 4: Admin Valid Auth..." -ForegroundColor Yellow
try {
    $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin123"))
    $headers = @{ Authorization = "Basic $auth" }
    $users = Invoke-RestMethod -Uri "$baseUrl/api/admin/users" -Headers $headers -TimeoutSec 5
    Write-Host "  PASS - Admin authenticated" -ForegroundColor Green
    $passCount++
} catch {
    Write-Host "  FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $failCount++
}

# Test 5: Invalid Login
Write-Host "`nTest 5: Invalid Login..." -ForegroundColor Yellow
try {
    $body = @{ email = "fake@test.com"; password = "wrong" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  FAIL - Should reject invalid creds" -ForegroundColor Red
    $failCount++
} catch {
    Write-Host "  PASS - Correctly rejected" -ForegroundColor Green
    $passCount++
}

# Test 6: 404 Handler
Write-Host "`nTest 6: 404 Handler..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/api/invalid/path" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  FAIL - Should return 404" -ForegroundColor Red
    $failCount++
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "  PASS - Correctly returns 404" -ForegroundColor Green
        $passCount++
    } else {
        Write-Host "  FAIL - Wrong error code" -ForegroundColor Red
        $failCount++
    }
}

# Summary
$total = $passCount + $failCount
$passRate = if ($total -gt 0) { [math]::Round(($passCount / $total) * 100, 1) } else { 0 }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total:  $total tests" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "Rate:   $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } else { "Yellow" })

if ($failCount -eq 0) {
    Write-Host "`nALL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "`nSOME TESTS FAILED" -ForegroundColor Yellow
}

Write-Host "`n"
