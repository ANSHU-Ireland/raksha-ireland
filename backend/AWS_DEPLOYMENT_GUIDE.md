# AWS EC2 Deployment Guide for Raksha Ireland Backend

## Prerequisites
- ✅ AWS Account (you have this)
- ✅ Backend working locally (done)

## Step 1: Launch EC2 Instance

1. **Go to AWS Console**: https://console.aws.amazon.com/ec2/
2. **Click "Launch Instance"**
3. **Configure:**
   - Name: `raksha-ireland-backend`
   - AMI: **Ubuntu Server 22.04 LTS** (Free tier eligible)
   - Instance type: **t2.micro** (Free tier eligible)
   - Key pair: Create new → Download `.pem` file (SAVE THIS!)
   - Network: Allow HTTPS, HTTP, and Custom TCP port 3000
   - Storage: 8 GB (default)
4. **Click "Launch Instance"**

## Step 2: Connect to Your Instance

### Get your instance IP:
1. Go to EC2 Dashboard
2. Click on your instance
3. Copy **Public IPv4 address** (e.g., `3.123.45.67`)

### Connect via SSH:
```powershell
# On Windows (using PowerShell)
ssh -i "path\to\your-key.pem" ubuntu@YOUR_INSTANCE_IP
```

If you get permission error on Windows:
```powershell
icacls "path\to\your-key.pem" /inheritance:r
icacls "path\to\your-key.pem" /grant:r "%username%:R"
```

## Step 3: Install Node.js on EC2

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 (keeps your app running)
sudo npm install -g pm2
```

## Step 4: Upload Your Backend

### Option A: Using SCP (from your Windows machine)
```powershell
# Navigate to your project folder
cd D:\raksha-ireland

# Upload backend folder
scp -i "path\to\your-key.pem" -r backend ubuntu@YOUR_INSTANCE_IP:~/
```

### Option B: Using Git (recommended)
```bash
# On EC2 instance
git clone https://github.com/ANSHU-Ireland/raksha-ireland.git
cd raksha-ireland/backend
```

## Step 5: Configure Environment Variables on EC2

```bash
# On EC2, create .env file
cd ~/backend  # or ~/raksha-ireland/backend if using git
nano .env
```

Copy your entire `.env` file content (from local machine), then:
- Press `Ctrl+X`
- Press `Y`
- Press `Enter`

## Step 6: Install Dependencies & Start Server

```bash
# Install dependencies
npm install

# Start with PM2 (keeps running even after logout)
pm2 start src/server.js --name raksha-backend

# Make PM2 auto-start on reboot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs raksha-backend
```

## Step 7: Configure Security Group (Allow Port 3000)

1. Go to EC2 Dashboard
2. Click on your instance
3. Click "Security" tab
4. Click on the security group link
5. Click "Edit inbound rules"
6. Click "Add rule":
   - Type: Custom TCP
   - Port: 3000
   - Source: Anywhere-IPv4 (0.0.0.0/0)
7. Click "Save rules"

## Step 8: Test Your Backend

Your backend is now live at:
```
http://YOUR_INSTANCE_IP:3000
```

Test it:
```bash
curl http://YOUR_INSTANCE_IP:3000/health
```

## Step 9: Update Mobile App

Update your Flutter app's API URL:

**File:** `mobile-app/lib/core/config/app_config.dart`

Change:
```dart
static const String baseUrl = 'http://192.168.8.70:3000';
```

To:
```dart
static const String baseUrl = 'http://YOUR_INSTANCE_IP:3000';
```

Then rebuild APK:
```powershell
cd mobile-app
flutter build apk --release
```

---

## Optional: Add Domain Name (Free with Route 53)

If you want a proper domain instead of IP:

1. Register domain in Route 53 (or use existing)
2. Create A record pointing to your EC2 IP
3. Use `http://api.rakshaireland.com:3000` instead of IP

---

## Useful PM2 Commands

```bash
pm2 status              # Check status
pm2 logs raksha-backend # View logs
pm2 restart raksha-backend  # Restart
pm2 stop raksha-backend     # Stop
pm2 delete raksha-backend   # Remove
```

---

## Cost Estimate

- **EC2 t2.micro**: FREE for 12 months (750 hours/month)
- **Data transfer**: 15 GB free per month
- **After 12 months**: ~$8-10/month

---

## Security Notes

⚠️ **Important:**
1. Never commit your `.pem` key file to Git
2. Keep your `.env` file secure
3. Consider using HTTPS with SSL certificate (Let's Encrypt - free)
4. Enable AWS CloudWatch for monitoring

---

**Your backend will now be accessible from any network worldwide!**
