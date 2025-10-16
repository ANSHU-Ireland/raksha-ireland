# RAKSHA Ireland Backend Deployment Script (PowerShell)
# This script zips and deploys all Lambda functions to AWS

Write-Host "🚀 Starting RAKSHA Ireland Backend Deployment..." -ForegroundColor Green

# Configuration
$REGION = "eu-west-1"
$FUNCTION_PREFIX = "raksha"

# Functions to deploy
$FUNCTIONS = @("signup", "login", "approveUser", "activateUser", "sosTrigger", "health")

# Create deployment directory
if (Test-Path "deploy") {
    Remove-Item "deploy" -Recurse -Force
}
New-Item -ItemType Directory -Path "deploy" | Out-Null

Write-Host "📦 Zipping Lambda functions..." -ForegroundColor Yellow

# Zip each function
foreach ($func in $FUNCTIONS) {
    Write-Host "  → Zipping $func.js..." -ForegroundColor Cyan
    
    # Create a temporary directory for this function
    $tempDir = "deploy\$func"
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    
    # Copy function file and package.json
    Copy-Item "functions\$func.js" "$tempDir\"
    Copy-Item "package.json" "$tempDir\"
    
    # Install production dependencies
    Push-Location $tempDir
    npm install --production --silent
    Pop-Location
    
    # Create zip file using PowerShell
    $zipPath = "deploy\$func.zip"
    Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force
    
    # Clean up temp directory
    Remove-Item $tempDir -Recurse -Force
    
    Write-Host "  ✅ $func.zip created" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔧 Deploying Lambda functions to AWS..." -ForegroundColor Yellow

# Deploy each function
foreach ($func in $FUNCTIONS) {
    # Capitalize first letter for function name
    $FUNCTION_NAME = $FUNCTION_PREFIX + (Get-Culture).TextInfo.ToTitleCase($func)
    
    Write-Host "  → Deploying $FUNCTION_NAME..." -ForegroundColor Cyan
    
    # Check if function exists
    try {
        aws lambda get-function --function-name $FUNCTION_NAME --region $REGION | Out-Null
        
        # Update existing function
        aws lambda update-function-code --function-name $FUNCTION_NAME --zip-file "fileb://deploy/$func.zip" --region $REGION | Out-Null
        Write-Host "  ✅ Updated $FUNCTION_NAME" -ForegroundColor Green
    }
    catch {
        Write-Host "  ⚠️  Function $FUNCTION_NAME does not exist. Please create it first." -ForegroundColor Yellow
        Write-Host "      Use: aws lambda create-function --function-name $FUNCTION_NAME ..." -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "🌐 API Gateway endpoints:" -ForegroundColor Magenta
Write-Host "  Health Check: GET /health" -ForegroundColor White
Write-Host "  User Signup: POST /signup" -ForegroundColor White
Write-Host "  User Login: POST /login" -ForegroundColor White
Write-Host "  Approve User: POST /approve-user" -ForegroundColor White
Write-Host "  Activate User: GET|POST /activate" -ForegroundColor White
Write-Host "  SOS Alert: POST /sos-alert" -ForegroundColor White

Write-Host ""
Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
Remove-Item "deploy" -Recurse -Force

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Update API Gateway to point to new function versions" -ForegroundColor White
Write-Host "  2. Test each endpoint" -ForegroundColor White
Write-Host "  3. Update mobile app with API Gateway URL" -ForegroundColor White
Write-Host "  4. Configure environment variables for Lambda functions" -ForegroundColor White
Write-Host ""