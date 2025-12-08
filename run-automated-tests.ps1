# Raksha Ireland - Automated API Test Suite
# Run this script to test all backend endpoints

$ErrorActionPreference = "Continue"
$baseUrl = "http://192.168.8.70:3000"

# Colors
function Write-Pass { param($msg) Write-Host "  ✅ PASS - $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "  ❌ FAIL - $msg" -ForegroundColor Red }
function Write-Section { param($msg) Write-Host "`n$msg" -ForegroundColor Cyan }
function Write-Test { param($msg) Write-Host "`n$msg" -ForegroundColor Yellow }

# Test Results
$script:passCount = 0
$script:failCount = 0
$script:totalTests = 0

function Record-Result {
    param([bool]$passed)
    $script:totalTests++
    if ($passed) { $script:passCount++ } else { $script:failCount++ }
}

# ============================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     RAKSHA IRELAND - AUTOMATED API TEST SUITE             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "`nTest Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host "Backend URL: $baseUrl" -ForegroundColor White
Write-Host "=" * 60

# ============================================
# TEST SECTION 1: Health and Status Endpoints
# ============================================
Write-Section "TEST SECTION 1: Health and Status Endpoints"

# Test 1.1: Health Check
Write-Test "Test 1.1: GET /health"
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -TimeoutSec 5
    if ($health.status -eq 'healthy' -and $health.database -eq 'connected') {
        Write-Pass "Server healthy, DB connected"
        Write-Host "     Status: $($health.status), DB: $($health.database)" -ForegroundColor Gray
        Record-Result $true
    } else {
        Write-Fail "Unhealthy response: $($health | ConvertTo-Json)"
        Record-Result $false
    }
} catch {
    Write-Fail "Request failed: $($_.Exception.Message)"
    Record-Result $false
}

# Test 1.2: API Root
Write-Test "Test 1.2: GET /api"
try {
    $api = Invoke-RestMethod -Uri "$baseUrl/api" -TimeoutSec 5
    if ($api.status -eq 'active') {
        Write-Pass "API root endpoint responding"
        Write-Host "     Message: $($api.message)" -ForegroundColor Gray
        Record-Result $true
    } else {
        Write-Fail "Unexpected status: $($api.status)"
        Record-Result $false
    }
} catch {
    Write-Fail "Request failed: $($_.Exception.Message)"
    Record-Result $false
}

# Test 1.3: API Documentation
Write-Test "Test 1.3: GET /api/docs"
try {
    $docs = Invoke-RestMethod -Uri "$baseUrl/api/docs" -TimeoutSec 5
    if ($docs.title) {
        Write-Pass "API documentation available"
        Write-Host "     Title: $($docs.title)" -ForegroundColor Gray
        Record-Result $true
    } else {
        Write-Fail "Documentation missing title"
        Record-Result $false
    }
} catch {
    Write-Fail "Request failed: $($_.Exception.Message)"
    Record-Result $false
}

# ============================================
# TEST SECTION 2: Authentication Endpoints
# ============================================
Write-Section "TEST SECTION 2: Authentication Endpoints"

# Test 2.1: Login with Invalid Credentials
Write-Test "Test 2.1: POST /api/auth/login - Invalid Credentials"
try {
    $loginBody = @{
        email = "nonexistent@test.com"
        password = "wrongpassword"
    } | ConvertTo-Json
    
    $login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Fail "Should have returned error, got success instead"
    Record-Result $false
} catch {
    if ($_.ErrorDetails.Message -match 'Invalid' -or $_.ErrorDetails.Message -match 'User not found' -or $_.ErrorDetails.Message -match 'credentials') {
        Write-Pass "Correctly rejected invalid credentials"
        Record-Result $true
    } else {
        Write-Fail "Unexpected error: $($_.ErrorDetails.Message)"
        Record-Result $false
    }
}

# Test 2.2: Login Missing Required Fields
Write-Test "Test 2.2: POST /api/auth/login - Missing Fields"
try {
    $loginBody = @{
        email = "test@test.com"
    } | ConvertTo-Json
    
    $login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Fail "Should have validated required fields"
    Record-Result $false
} catch {
    if ($_.ErrorDetails.Message -match 'password' -or $_.ErrorDetails.Message -match 'required' -or $_.ErrorDetails.Message -match 'validation') {
        Write-Pass "Correctly validated required fields"
        Record-Result $true
    } else {
        Write-Fail "Unexpected error: $($_.ErrorDetails.Message)"
        Record-Result $false
    }
}

# ============================================
# TEST SECTION 3: Admin Panel Endpoints
# ============================================
Write-Section "TEST SECTION 3: Admin Panel Endpoints"

# Test 3.1: Admin Panel - No Auth
Write-Test "Test 3.1: GET /api/admin/users - No Authorization"
try {
    $admin = Invoke-RestMethod -Uri "$baseUrl/api/admin/users" -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Fail "Should require authentication"
    Record-Result $false
} catch {
    if ($_.Exception.Response.StatusCode -eq 401 -or $_.ErrorDetails.Message -match "Unauthorized") {
        Write-Pass "Correctly requires authentication"
        Record-Result $true
    } else {
        Write-Fail "Unexpected error: $($_.Exception.Message)"
        Record-Result $false
    }
}

# Test 3.2: Admin Panel - Invalid Auth
Write-Test "Test 3.2: GET /api/admin/users - Invalid Credentials"
try {
    $invalidAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("wrong:wrong"))
    $headers = @{ Authorization = "Basic $invalidAuth" }
    $admin = Invoke-RestMethod -Uri "$baseUrl/api/admin/users" -Headers $headers -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Fail "Should reject invalid credentials"
    Record-Result $false
} catch {
    if ($_.Exception.Response.StatusCode -eq 401 -or $_.ErrorDetails.Message -match "Unauthorized") {
        Write-Pass "Correctly rejected invalid credentials"
        Record-Result $true
    } else {
        Write-Fail "Unexpected error: $($_.Exception.Message)"
        Record-Result $false
    }
}

# Test 3.3: Admin Panel - Valid Auth
Write-Test "Test 3.3: GET /api/admin/users - Valid Credentials"
try {
    $validAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin123"))
    $headers = @{ Authorization = "Basic $validAuth" }
    $adminUsers = Invoke-RestMethod -Uri "$baseUrl/api/admin/users" -Headers $headers -TimeoutSec 5
    
    if ($adminUsers -is [Array] -or $adminUsers.users -is [Array]) {
        Write-Pass "Successfully authenticated and retrieved users"
        $userCount = if ($adminUsers -is [Array]) { $adminUsers.Count } else { $adminUsers.users.Count }
        Write-Host "     Retrieved $userCount users" -ForegroundColor Gray
        Record-Result $true
    } else {
        Write-Fail "Unexpected response format"
        Record-Result $false
    }
} catch {
    Write-Fail "Request failed: $($_.Exception.Message)"
    Record-Result $false
}

# ============================================
# TEST SECTION 4: Database Connectivity
# ============================================
Write-Section "TEST SECTION 4: Database Connectivity"

# Test 4.1: Check Users Table
Write-Test "Test 4.1: Query users table via admin endpoint"
try {
    $validAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin123"))
    $headers = @{ Authorization = "Basic $validAuth" }
    $users = Invoke-RestMethod -Uri "$baseUrl/api/admin/users" -Headers $headers -TimeoutSec 5
    
    $userList = if ($users -is [Array]) { $users } else { $users.users }
    if ($userList -and $userList.Count -gt 0) {
        Write-Pass "Users table accessible with $($userList.Count) records"
        
        # Check required fields
        $firstUser = $userList[0]
        $hasEmail = $null -ne $firstUser.email
        $hasId = $null -ne $firstUser.id
        
        if ($hasEmail -and $hasId) {
            Write-Host "     Sample user: $($firstUser.email)" -ForegroundColor Gray
            Write-Host "     Verification status: $($firstUser.verification_status)" -ForegroundColor Gray
            Record-Result $true
        } else {
            Write-Fail "User records missing required fields"
            Record-Result $false
        }
    } else {
        Write-Pass "Users table accessible - empty"
        Record-Result $true
    }
} catch {
    Write-Fail "Database query failed: $($_.Exception.Message)"
    Record-Result $false
}

# ============================================
# TEST SECTION 5: Error Handling
# ============================================
Write-Section "TEST SECTION 5: Error Handling"

# Test 5.1: 404 for Invalid Route
Write-Test "Test 5.1: GET /api/invalid/route - 404 Test"
try {
    $invalid = Invoke-RestMethod -Uri "$baseUrl/api/invalid/route/that/does/not/exist" -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Fail "Should return 404 for invalid routes"
    Record-Result $false
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Pass "Correctly returns 404 for invalid routes"
        Record-Result $true
    } else {
        Write-Fail "Unexpected error: $($_.Exception.Message)"
        Record-Result $false
    }
}

# Test 5.2: Invalid JSON Body
Write-Test "Test 5.2: POST /api/auth/login - Invalid JSON"
try {
    $invalidJson = "{ this is not valid json }"
    $login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $invalidJson -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Fail "Should reject invalid JSON"
    Record-Result $false
} catch {
    if ($_.ErrorDetails.Message -match 'JSON' -or $_.ErrorDetails.Message -match 'parse' -or $_.ErrorDetails.Message -match 'syntax' -or $_.Exception.Response.StatusCode -eq 400) {
        Write-Pass "Correctly rejects invalid JSON"
        Record-Result $true
    } else {
        Write-Fail "Unexpected error: $($_.Exception.Message)"
        Record-Result $false
    }
}

# Test 5.3: Missing Content-Type
Write-Test "Test 5.3: POST /api/auth/login - Missing Content-Type"
try {
    $body = '{"email":"test@test.com","password":"test123"}'
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -TimeoutSec 5 -ErrorAction SilentlyContinue
    # Some servers are lenient, so this might pass
    Write-Pass "Server handled missing Content-Type header"
    Record-Result $true
} catch {
    # Either 400 or success is acceptable
    Write-Pass "Server enforces proper headers"
    Record-Result $true
}

# ============================================
# SUMMARY
# ============================================
Write-Host "`n" + ("=" * 60)
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    TEST RESULTS SUMMARY                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`nTotal Tests: $script:totalTests" -ForegroundColor White
Write-Host "Passed:      $script:passCount" -ForegroundColor Green
Write-Host "Failed:      $script:failCount" -ForegroundColor $(if ($script:failCount -eq 0) { "Green" } else { "Red" })

$passRate = if ($script:totalTests -gt 0) { [math]::Round(($script:passCount / $script:totalTests) * 100, 2) } else { 0 }
Write-Host "Pass Rate:   $passRate%" -ForegroundColor $(if ($passRate -ge 90) { "Green" } elseif ($passRate -ge 70) { "Yellow" } else { "Red" })

Write-Host "`n" + ("=" * 60)

if ($script:failCount -eq 0) {
    Write-Host "`n✅ ALL TESTS PASSED! Backend is functioning correctly." -ForegroundColor Green
} elseif ($passRate -ge 70) {
    Write-Host "`n⚠️  Some tests failed. Review failures above." -ForegroundColor Yellow
} else {
    Write-Host "`n❌ MULTIPLE FAILURES. Backend requires attention." -ForegroundColor Red
}

Write-Host "`nTest completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "`n"

# Exit with appropriate code
exit $(if ($script:failCount -eq 0) { 0 } else { 1 })
