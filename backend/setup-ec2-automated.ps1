param(
    [Parameter(Mandatory = $true)]
    [string]$IP,

    [Parameter(Mandatory = $true)]
    [string]$KeyPath,

    [string]$EnvPath = ".env"
)

$ErrorActionPreference = "Stop"

function Step([string]$msg) {
    Write-Host "`n$msg" -ForegroundColor Cyan
}

function Info([string]$msg) {
    Write-Host $msg -ForegroundColor Green
}

function Warn([string]$msg) {
    Write-Host $msg -ForegroundColor Yellow
}

function Fail([string]$msg) {
    Write-Error $msg
    exit 1
}

Write-Host "Starting automated EC2 setup..." -ForegroundColor Green

# --- 0. Basic checks ---------------------------------------------------------

Step "[0/6] Validating local prerequisites..."

if (!(Test-Path $KeyPath)) {
    Fail "Key file not found: $KeyPath"
}
if (!(Test-Path $EnvPath)) {
    Fail "Env file not found: $EnvPath"
}

$KeyPath = (Resolve-Path $KeyPath).Path
$EnvPath = (Resolve-Path $EnvPath).Path

foreach ($cmd in @("ssh", "scp")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Fail "Required command '$cmd' not found in PATH. Install OpenSSH client and try again."
    }
}

try {
    Test-Connection -ComputerName $IP -Count 1 -Quiet | Out-Null
} catch {
    Warn "Ping to $IP failed. The instance might block ICMP but still be reachable over SSH."
}

# --- 1. Fix key permissions --------------------------------------------------

Step "[1/6] Setting key file permissions (Windows icacls)..."

try {
    icacls $KeyPath /inheritance:r | Out-Null
    icacls $KeyPath /grant:r "$env:USERNAME`:R" | Out-Null
    Info "Key permissions set."
} catch {
    Warn "Failed to adjust key permissions with icacls. If ssh complains, fix permissions manually."
}

# --- 2. Copy .env to EC2 -----------------------------------------------------

Step "[2/6] Copying .env file to EC2..."

try {
    scp -o StrictHostKeyChecking=no -i $KeyPath $EnvPath "ubuntu@${IP}:~/.env"
    Info ".env file copied."
} catch {
    Fail "Failed to copy .env to EC2."
}

# --- 3. Build remote setup script locally -----------------------------------

Step "[3/6] Creating remote setup script..."

$remoteSetupScript = @'
#!/bin/bash
set -euo pipefail

echo "=== EC2 Setup Script ==="

# 1. Update system
echo "[1/7] Updating system..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install base tools (curl, git)
echo "[2/7] Installing curl, git..."
sudo apt-get install -y curl git

# 3. Install Node.js 18
echo "[3/7] Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Install PM2
echo "[4/7] Installing PM2..."
sudo npm install -g pm2

# 5. Clone/pull repository
echo "[5/7] Cloning or updating repository..."
if [ -d "raksha-ireland/.git" ]; then
    cd raksha-ireland
    git pull --rebase
else
    rm -rf raksha-ireland
    git clone https://github.com/ANSHU-Ireland/raksha-ireland.git
    cd raksha-ireland
fi

# 6. Move .env file into backend
echo "[6/7] Setting up environment..."
if [ -f "$HOME/.env" ]; then
  mkdir -p backend
  mv -f "$HOME/.env" backend/.env
else
  echo "WARNING: ~/.env not found on server. Backend will likely fail to start."
fi

# 7. Install backend dependencies & start with PM2
echo "[7/7] Installing backend dependencies and starting server..."
cd backend
npm install

# Stop existing process if any
pm2 delete raksha-backend >/dev/null 2>&1 || true

pm2 start src/server.js --name raksha-backend

# PM2 startup (systemd)
pm2 startup systemd -u ubuntu --hp /home/ubuntu | grep sudo | bash || true
pm2 save || true

echo ""
echo "==================================="
echo "SETUP COMPLETED SUCCESSFULLY!"
echo "==================================="
echo ""
pm2 status
pm2 logs raksha-backend --lines 20 || true
'@

# Write temporary local script file
$localScriptPath = Join-Path $env:TEMP "setup-ec2.sh"
$remoteSetupScript | Set-Content -Path $localScriptPath -Encoding UTF8 -NoNewline

Info "Remote setup script created at $localScriptPath"

# --- 4. Copy setup script to EC2 --------------------------------------------

Step "[4/6] Copying setup script to EC2..."

try {
    scp -o StrictHostKeyChecking=no -i $KeyPath $localScriptPath "ubuntu@${IP}:~/setup-ec2.sh"
    Info "Setup script copied."
} catch {
    Fail "Failed to copy setup script to EC2."
}

# --- 5. Execute setup script -------------------------------------------------

Step "[5/6] Executing setup script on EC2 (this may take several minutes)..."

try {
    ssh -o StrictHostKeyChecking=no -i $KeyPath "ubuntu@$IP" "chmod +x setup-ec2.sh && ./setup-ec2.sh"
} catch {
    Fail "Remote setup script failed. Check the SSH output above for errors."
}

# --- 6. Health check ---------------------------------------------------------

Step "[6/6] Testing backend health endpoint..."

Start-Sleep -Seconds 5

try {
    $healthUrl = "http://$IP:3000/health"
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Info "Backend is LIVE! ($healthUrl)"
    } else {
        Warn "Backend responded with status code $($response.StatusCode). It might still be starting."
    }
} catch {
    Warn "Health check failed. The backend might still be starting or port 3000 might be blocked."
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "EC2 SETUP COMPLETED (SCRIPT FINISHED)." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nBackend URL:  http://$IP:3000" -ForegroundColor Cyan
Write-Host "Health check:  http://$IP:3000/health" -ForegroundColor Cyan
Write-Host "`nNext: point your Flutter app to this URL and rebuild the APK." -ForegroundColor Cyan
